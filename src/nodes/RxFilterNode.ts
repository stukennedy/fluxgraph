import { Observable, of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RxBaseNode } from '@/nodes/RxBaseNode';
import { FilterNodeConfig, DataPacket } from '@/core/types';

/**
 * RxJS-based Filter node
 */
export class RxFilterNode extends RxBaseNode<FilterNodeConfig> {
  private filterFn?: (data: any, metadata?: Record<string, any>) => boolean;

  protected async onInitialize(): Promise<void> {
    // Compile the filter function
    try {
      this.filterFn = new Function('data', 'metadata', this.config.filterFunction) as any;
    } catch (error) {
      throw new Error(`Failed to compile filter function: ${error}`);
    }
  }

  protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null> {
    return (source) =>
      source.pipe(
        mergeMap((packet) => {
          if (!this.filterFn) {
            throw new Error('Filter function not initialized');
          }

          try {
            // Apply the filter
            const shouldPass = this.filterFn(packet.data, packet.metadata);

            if (shouldPass) {
              // Pass through
              return of(packet);
            } else {
              // Filter out
              this.updateMetric('packetsDropped');
              return of(null);
            }
          } catch (error) {
            // On error, drop the packet
            console.error(`Filter error in node ${this.config.id}:`, error);
            this.updateMetric('packetsDropped');
            return of(null);
          }
        })
      );
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
