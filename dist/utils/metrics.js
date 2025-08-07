/**
 * Calculate throughput from metrics
 */
export function calculateThroughput(metrics, windowSeconds = 60) {
    const packetsProcessed = metrics.packetsIn;
    return packetsProcessed / windowSeconds;
}
/**
 * Calculate error rate
 */
export function calculateErrorRate(metrics) {
    const total = metrics.packetsIn;
    if (total === 0)
        return 0;
    return metrics.packetsErrored / total;
}
/**
 * Calculate drop rate
 */
export function calculateDropRate(metrics) {
    const total = metrics.packetsIn;
    if (total === 0)
        return 0;
    return metrics.packetsDropped / total;
}
/**
 * Calculate success rate
 */
export function calculateSuccessRate(metrics) {
    const total = metrics.packetsIn;
    if (total === 0)
        return 0;
    return metrics.packetsOut / total;
}
/**
 * Aggregate node metrics
 */
export function aggregateNodeMetrics(nodeMetrics) {
    const aggregated = Object.values(nodeMetrics).reduce((acc, metrics) => ({
        packetsProcessed: acc.packetsProcessed + metrics.packetsIn,
        packetsDropped: acc.packetsDropped + metrics.packetsDropped,
        packetsErrored: acc.packetsErrored + metrics.packetsErrored,
        totalLatency: acc.totalLatency + metrics.averageLatency * metrics.packetsIn,
    }), {
        packetsProcessed: 0,
        packetsDropped: 0,
        packetsErrored: 0,
        totalLatency: 0,
    });
    return {
        ...aggregated,
        nodeMetrics,
    };
}
/**
 * Format metrics for display
 */
export function formatMetrics(metrics) {
    return `
Packets In: ${metrics.packetsIn}
Packets Out: ${metrics.packetsOut}
Packets Dropped: ${metrics.packetsDropped}
Packets Errored: ${metrics.packetsErrored}
Average Latency: ${metrics.averageLatency.toFixed(2)}ms
Success Rate: ${(calculateSuccessRate(metrics) * 100).toFixed(2)}%
Error Rate: ${(calculateErrorRate(metrics) * 100).toFixed(2)}%
Drop Rate: ${(calculateDropRate(metrics) * 100).toFixed(2)}%
Last Processed: ${metrics.lastProcessedAt ? new Date(metrics.lastProcessedAt).toISOString() : 'Never'}
  `.trim();
}
/**
 * Create empty metrics
 */
export function createEmptyMetrics() {
    return {
        packetsIn: 0,
        packetsOut: 0,
        packetsDropped: 0,
        packetsErrored: 0,
        averageLatency: 0,
        lastProcessedAt: undefined,
    };
}
/**
 * Merge metrics
 */
export function mergeMetrics(current, update) {
    return {
        ...current,
        ...update,
        lastProcessedAt: Date.now(),
    };
}
/**
 * Calculate exponential moving average
 */
export function calculateEMA(currentValue, newValue, alpha = 0.2) {
    return alpha * newValue + (1 - alpha) * currentValue;
}
/**
 * Track latency percentiles
 */
export class LatencyTracker {
    latencies = [];
    maxSize;
    constructor(maxSize = 1000) {
        this.maxSize = maxSize;
    }
    add(latency) {
        this.latencies.push(latency);
        if (this.latencies.length > this.maxSize) {
            this.latencies.shift();
        }
    }
    getPercentile(percentile) {
        if (this.latencies.length === 0)
            return 0;
        const sorted = [...this.latencies].sort((a, b) => a - b);
        const index = Math.ceil((percentile / 100) * sorted.length) - 1;
        return sorted[Math.max(0, index)];
    }
    getP50() {
        return this.getPercentile(50);
    }
    getP95() {
        return this.getPercentile(95);
    }
    getP99() {
        return this.getPercentile(99);
    }
    getAverage() {
        if (this.latencies.length === 0)
            return 0;
        return this.latencies.reduce((a, b) => a + b, 0) / this.latencies.length;
    }
    clear() {
        this.latencies = [];
    }
}
export const metrics = {
    calculateThroughput,
    calculateErrorRate,
    calculateDropRate,
    calculateSuccessRate,
    aggregateNodeMetrics,
    formatMetrics,
    createEmptyMetrics,
    mergeMetrics,
    calculateEMA,
    LatencyTracker,
};
