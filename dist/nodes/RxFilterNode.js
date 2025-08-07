import { of } from 'rxjs';
import { mergeMap } from 'rxjs/operators';
import { RxBaseNode } from './RxBaseNode';
/**
 * RxJS-based Filter node
 */
export class RxFilterNode extends RxBaseNode {
    filterFn;
    async onInitialize() {
        // Compile the filter function
        try {
            this.filterFn = new Function('data', 'metadata', this.config.filterFunction);
        }
        catch (error) {
            throw new Error(`Failed to compile filter function: ${error}`);
        }
    }
    createProcessingOperator() {
        return (source) => source.pipe(mergeMap(packet => {
            if (!this.filterFn) {
                throw new Error('Filter function not initialized');
            }
            try {
                // Apply the filter
                const shouldPass = this.filterFn(packet.data, packet.metadata);
                if (shouldPass) {
                    // Pass through
                    return of(packet);
                }
                else {
                    // Filter out
                    this.updateMetric('packetsDropped');
                    return of(null);
                }
            }
            catch (error) {
                // On error, drop the packet
                console.error(`Filter error in node ${this.config.id}:`, error);
                this.updateMetric('packetsDropped');
                return of(null);
            }
        }));
    }
    async onStart() { }
    async onPause() { }
    async onResume() { }
    async onStop() { }
}
