import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { RxBaseNode } from './RxBaseNode';
import { TransformNodeConfig, DataPacket } from '../core/types';

/**
 * RxJS-based Transform node
 */
export class RxTransformNode extends RxBaseNode<TransformNodeConfig> {
  private transformFn?: (data: any, metadata?: Record<string, any>) => any | Promise<any>;

  protected async onInitialize(): Promise<void> {
    // Compile the transform function
    try {
      this.transformFn = new Function('data', 'metadata', this.config.transformFunction) as any;
    } catch (error) {
      throw new Error(`Failed to compile transform function: ${error}`);
    }
  }

  protected createProcessingOperator(): (
    source: Observable<DataPacket>
  ) => Observable<DataPacket | null> {
    return (source) => source.pipe(
      map(async (packet) => {
        if (!this.transformFn) {
          throw new Error('Transform function not initialized');
        }

        const startTime = Date.now();
        
        try {
          // Apply the transformation
          const transformedData = await Promise.resolve(
            this.transformFn(packet.data, packet.metadata)
          );

          // Update latency metric
          const latency = Date.now() - startTime;
          this.updateLatencyMetric(latency);

          // Return transformed packet
          return {
            ...packet,
            data: transformedData,
            metadata: {
              ...packet.metadata,
              transformedBy: this.config.id,
              transformedAt: Date.now()
            }
          };
        } catch (error) {
          // Add error to packet and pass it through
          return {
            ...packet,
            error: error as Error,
            metadata: {
              ...packet.metadata,
              errorNode: this.config.id,
              errorAt: Date.now()
            }
          };
        }
      }),
      
      // Flatten the promise
      map(promise => from(promise)),
      concatAll()
    );
  }

  private updateLatencyMetric(latency: number): void {
    const metrics = this.metrics$.value;
    const totalPackets = metrics.packetsIn;
    metrics.averageLatency = (metrics.averageLatency * (totalPackets - 1) + latency) / totalPackets;
    this.metrics$.next(metrics);
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}

// Import needed operators
import { from, concatAll } from 'rxjs';