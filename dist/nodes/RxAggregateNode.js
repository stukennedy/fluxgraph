import { map, scan, bufferTime, bufferCount } from 'rxjs/operators';
import { RxBaseNode } from './RxBaseNode';
/**
 * RxJS-based Aggregate node
 */
export class RxAggregateNode extends RxBaseNode {
    aggregateFn;
    buffer = [];
    async onInitialize() {
        // Compile the aggregate function
        try {
            this.aggregateFn = new Function('values', 'metadata', this.config.aggregateFunction);
        }
        catch (error) {
            throw new Error(`Failed to compile aggregate function: ${error}`);
        }
    }
    createProcessingOperator() {
        return (source) => {
            // Apply windowing based on config
            let windowed$;
            if (this.config.windowType === 'time') {
                windowed$ = source.pipe(bufferTime(this.config.windowSize || 1000));
            }
            else if (this.config.windowType === 'count') {
                windowed$ = source.pipe(bufferCount(this.config.windowSize || 10));
            }
            else {
                // Sliding window
                windowed$ = source.pipe(scan((acc, packet) => {
                    const newAcc = [...acc, packet];
                    // Keep only last N packets
                    const maxSize = this.config.windowSize || 10;
                    return newAcc.slice(-maxSize);
                }, []), map(packets => packets.length > 0 ? packets : []));
            }
            return windowed$.pipe(map(packets => {
                if (packets.length === 0)
                    return null;
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
                    const packet = {
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
                }
                catch (error) {
                    console.error(`Aggregate error in node ${this.config.id}:`, error);
                    return null;
                }
            }));
        };
    }
    requiresBuffering() {
        return true;
    }
    getBufferStrategy() {
        return this.config.windowType === 'time' ? 'time' : 'count';
    }
    getBufferSize() {
        return this.config.windowSize || 10;
    }
    getBufferDuration() {
        return this.config.windowType === 'time' ? (this.config.windowSize || 1000) : 1000;
    }
    async onStart() { }
    async onPause() { }
    async onResume() { }
    async onStop() { }
}
