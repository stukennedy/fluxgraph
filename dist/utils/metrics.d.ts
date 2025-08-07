import { NodeMetrics, GraphContext } from '../core/types';
/**
 * Calculate throughput from metrics
 */
export declare function calculateThroughput(metrics: NodeMetrics, windowSeconds?: number): number;
/**
 * Calculate error rate
 */
export declare function calculateErrorRate(metrics: NodeMetrics): number;
/**
 * Calculate drop rate
 */
export declare function calculateDropRate(metrics: NodeMetrics): number;
/**
 * Calculate success rate
 */
export declare function calculateSuccessRate(metrics: NodeMetrics): number;
/**
 * Aggregate node metrics
 */
export declare function aggregateNodeMetrics(nodeMetrics: Record<string, NodeMetrics>): GraphContext['metrics'];
/**
 * Format metrics for display
 */
export declare function formatMetrics(metrics: NodeMetrics): string;
/**
 * Create empty metrics
 */
export declare function createEmptyMetrics(): NodeMetrics;
/**
 * Merge metrics
 */
export declare function mergeMetrics(current: NodeMetrics, update: Partial<NodeMetrics>): NodeMetrics;
/**
 * Calculate exponential moving average
 */
export declare function calculateEMA(currentValue: number, newValue: number, alpha?: number): number;
/**
 * Track latency percentiles
 */
export declare class LatencyTracker {
    private latencies;
    private maxSize;
    constructor(maxSize?: number);
    add(latency: number): void;
    getPercentile(percentile: number): number;
    getP50(): number;
    getP95(): number;
    getP99(): number;
    getAverage(): number;
    clear(): void;
}
export declare const metrics: {
    calculateThroughput: typeof calculateThroughput;
    calculateErrorRate: typeof calculateErrorRate;
    calculateDropRate: typeof calculateDropRate;
    calculateSuccessRate: typeof calculateSuccessRate;
    aggregateNodeMetrics: typeof aggregateNodeMetrics;
    formatMetrics: typeof formatMetrics;
    createEmptyMetrics: typeof createEmptyMetrics;
    mergeMetrics: typeof mergeMetrics;
    calculateEMA: typeof calculateEMA;
    LatencyTracker: typeof LatencyTracker;
};
//# sourceMappingURL=metrics.d.ts.map