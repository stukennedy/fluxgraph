import { map } from 'rxjs/operators';
import { RxBaseNode } from '@/nodes/RxBaseNode';
/**
 * RxJS-based Transform node
 */
export class RxTransformNode extends RxBaseNode {
    transformFn;
    async onInitialize() {
        // Compile the transform function
        try {
            this.transformFn = new Function('data', 'metadata', this.config.transformFunction);
        }
        catch (error) {
            throw new Error(`Failed to compile transform function: ${error}`);
        }
    }
    createProcessingOperator() {
        return (source) => source.pipe(map(async (packet) => {
            if (!this.transformFn) {
                throw new Error('Transform function not initialized');
            }
            const startTime = Date.now();
            try {
                // Apply the transformation
                const transformedData = await Promise.resolve(this.transformFn(packet.data, packet.metadata));
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
                        transformedAt: Date.now(),
                    },
                };
            }
            catch (error) {
                // Add error to packet and pass it through
                return {
                    ...packet,
                    error: error,
                    metadata: {
                        ...packet.metadata,
                        errorNode: this.config.id,
                        errorAt: Date.now(),
                    },
                };
            }
        }), 
        // Flatten the promise
        map((promise) => from(promise)), concatAll());
    }
    updateLatencyMetric(latency) {
        const metrics = this.metrics$.value;
        const totalPackets = metrics.packetsIn;
        metrics.averageLatency = (metrics.averageLatency * (totalPackets - 1) + latency) / totalPackets;
        this.metrics$.next(metrics);
    }
    async onStart() { }
    async onPause() { }
    async onResume() { }
    async onStop() { }
}
// Import needed operators
import { from, concatAll } from 'rxjs';
