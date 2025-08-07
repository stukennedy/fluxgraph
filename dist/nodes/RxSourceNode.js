import { interval, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { RxBaseNode } from '@/nodes/RxBaseNode';
/**
 * RxJS-based Source node
 */
export class RxSourceNode extends RxBaseNode {
    sourceObservable;
    async onInitialize() {
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
    createProcessingOperator() {
        return (source) => source.pipe(map((packet) => packet) // Pass through
        );
    }
    async onStart() {
        // Start emitting from source if configured
        if (this.sourceObservable && this.config.sourceType !== 'manual') {
            this.sourceObservable.subscribe((data) => {
                const packet = {
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
    async onPause() { }
    async onResume() { }
    async onStop() { }
}
