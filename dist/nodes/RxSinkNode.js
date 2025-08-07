import { tap, map } from 'rxjs/operators';
import { RxBaseNode } from './RxBaseNode';
/**
 * RxJS-based Sink node
 */
export class RxSinkNode extends RxBaseNode {
    sinkFn;
    async onInitialize() {
        // Initialize based on sink type
        switch (this.config.sinkType) {
            case 'log':
                this.sinkFn = async (data, metadata) => {
                    console.log(`[${this.config.id}]`, data, metadata);
                };
                break;
            case 'http':
                this.sinkFn = async (data, metadata) => {
                    // Send to HTTP endpoint
                    const url = this.config.config?.url;
                    if (!url)
                        throw new Error('HTTP URL not configured');
                    await fetch(url, {
                        method: this.config.config?.method || 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ data, metadata })
                    });
                };
                break;
            case 'websocket':
                this.sinkFn = async (data, metadata) => {
                    // WebSocket implementation would go here
                    console.log(`WebSocket sink:`, data);
                };
                break;
            case 'database':
                this.sinkFn = async (data, metadata) => {
                    // Store in database (implementation would depend on DB type)
                    console.log(`Storing in database:`, data);
                };
                break;
            case 'custom':
                // Custom sink function would be provided via config
                this.sinkFn = async (data, metadata) => {
                    console.log(`Custom sink:`, data, metadata);
                };
                break;
            default:
                throw new Error(`Unknown sink type: ${this.config.sinkType}`);
        }
    }
    createProcessingOperator() {
        return (source) => source.pipe(tap(async (packet) => {
            if (!this.sinkFn) {
                console.warn(`Sink function not initialized for ${this.config.id}`);
                return;
            }
            try {
                // Execute sink operation
                await this.sinkFn(packet.data, packet.metadata);
            }
            catch (error) {
                console.error(`Sink error in node ${this.config.id}:`, error);
            }
        }), map(packet => packet) // Pass through
        );
    }
    async onStart() { }
    async onPause() { }
    async onResume() { }
    async onStop() { }
}
