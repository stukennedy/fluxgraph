import { Observable, interval, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RxBaseNode } from '@/nodes/RxBaseNode';
import { SourceNodeConfig, DataPacket } from '@/core/types';

/**
 * RxJS-based Source node
 */
export class RxSourceNode extends RxBaseNode<SourceNodeConfig> {
  private sourceObservable?: Observable<any>;

  protected async onInitialize(): Promise<void> {
    // Initialize based on source type
    switch (this.config.sourceType) {
      case 'timer': {
        const intervalMs = this.config.config?.interval || 1000;
        this.sourceObservable = interval(intervalMs).pipe(map((i) => ({ index: i, timestamp: Date.now() })));
        break;
      }

      case 'http':
      case 'websocket':
      case 'database':
        // These would be set up with actual connections
        this.sourceObservable = of({ placeholder: true });
        break;

      case 'manual':
        // Manual injection, no automatic source
        break;

      default:
        throw new Error(`Unknown source type: ${this.config.sourceType}`);
    }
  }

  protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null> {
    return (source) =>
      source.pipe(
        map((packet) => packet) // Pass through
      );
  }

  protected async onStart(): Promise<void> {
    // Start emitting from source if configured
    if (this.sourceObservable && this.config.sourceType !== 'manual') {
      this.sourceObservable.subscribe((data) => {
        const packet: DataPacket = {
          id: `${this.config.id}-${Date.now()}-${Math.random().toString(36).substring(7)}`,
          timestamp: Date.now(),
          data,
          metadata: {
            source: this.config.id,
            sourceType: this.config.sourceType,
          },
        };
        this.process(packet);
      });
    }
  }

  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {}
}
