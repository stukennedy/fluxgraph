import { BaseNode } from './BaseNode';
import { AggregateNodeConfig, DataPacket } from '../core/types';
/**
 * Aggregate node - aggregates data packets over windows
 */
export declare class AggregateNode extends BaseNode<AggregateNodeConfig> {
    private aggregateFn?;
    private windowStartTime?;
    private sessionId?;
    protected onInitialize(): Promise<void>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
    protected requiresBuffering(): boolean;
    protected isBufferReady(): boolean;
    protected processPacket(packet: DataPacket): Promise<DataPacket | null>;
    protected processBuffer(): Promise<void>;
    /**
     * Schedule window close for time-based windows
     */
    private scheduleWindowClose;
    /**
     * Close current session window
     */
    closeSession(): Promise<void>;
    /**
     * Start new session window
     */
    startSession(sessionId: string): void;
}
/**
 * Pre-built aggregation functions
 */
export declare class AggregateFunctions {
    /**
     * Count packets
     */
    static count(): string;
    /**
     * Sum numeric field
     */
    static sum(field: string): string;
    /**
     * Calculate average
     */
    static average(field: string): string;
    /**
     * Find min/max
     */
    static minMax(field: string): string;
    /**
     * Group by field
     */
    static groupBy(field: string): string;
    /**
     * Calculate statistics
     */
    static statistics(field: string): string;
    /**
     * Collect all values
     */
    static collect(): string;
    /**
     * Transaction summary
     */
    static transactionSummary(): string;
}
//# sourceMappingURL=AggregateNode.d.ts.map