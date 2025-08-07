import { Observable, of } from 'rxjs';
import { map, scan, bufferTime, bufferCount } from 'rxjs/operators';
import { RxBaseNode } from './RxBaseNode';
import { AggregateNodeConfig, DataPacket } from '../core/types';

/**
 * RxJS-based Aggregate node
 */
export class RxAggregateNode extends RxBaseNode<AggregateNodeConfig> {
  private aggregateFn?: (values: any[], metadata?: Record<string, any>[]) => any;
  private buffer: DataPacket[] = [];

  protected async onInitialize(): Promise<void> {
    // Compile the aggregate function
    try {
      this.aggregateFn = new Function('values', 'metadata', this.config.aggregateFunction) as any;
    } catch (error) {
      throw new Error(`Failed to compile aggregate function: ${error}`);
    }
  }

  protected createProcessingOperator(): (
    source: Observable<DataPacket>
  ) => Observable<DataPacket | null> {
    return (source) => {
      // Apply windowing based on config
      let windowed$: Observable<DataPacket[]>;
      
      if (this.config.windowType === 'time') {
        windowed$ = source.pipe(
          bufferTime(this.config.windowSize || 1000)
        );
      } else if (this.config.windowType === 'count') {
        windowed$ = source.pipe(
          bufferCount(this.config.windowSize || 10)
        );
      } else {
        // Sliding window
        windowed$ = source.pipe(
          scan((acc: DataPacket[], packet: DataPacket) => {
            const newAcc = [...acc, packet];
            // Keep only last N packets
            const maxSize = this.config.windowSize || 10;
            return newAcc.slice(-maxSize);
          }, []),
          map(packets => packets.length > 0 ? packets : [])
        );
      }

      return windowed$.pipe(
        map(packets => {
          if (packets.length === 0) return null;
          
          if (!this.aggregateFn) {
            throw new Error('Aggregate function not initialized');
          }

          try {
            // Extract values and metadata
            const values = packets.map(p => p.data);
            const metadata = packets.map(p => p.metadata || {});
            
            // Apply aggregation
            const aggregatedData = this.aggregateFn(values, metadata);
            
            // Create aggregated packet
            const packet: DataPacket = {
              id: `${this.config.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
              timestamp: Date.now(),
              data: aggregatedData,
              metadata: {
                aggregatedBy: this.config.id,
                aggregatedAt: Date.now(),
                windowType: this.config.windowType,
                windowSize: this.config.windowSize,
                packetCount: packets.length
              }
            };
            
            return packet;
          } catch (error) {
            console.error(`Aggregate error in node ${this.config.id}:`, error);
            return null;
          }
        })
      );
    };
  }

  protected requiresBuffering(): boolean {
    return true;
  }

  protected getBufferStrategy(): 'time' | 'count' | 'custom' {
    return this.config.windowType === 'time' ? 'time' : 'count';
  }

  protected getBufferSize(): number {
    return this.config.windowSize || 10;
  }

  protected getBufferDuration(): number {
    return this.config.windowType === 'time' ? (this.config.windowSize || 1000) : 1000;
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}