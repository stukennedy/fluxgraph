import { BaseNode } from '@/nodes/BaseNode';
import { FilterNodeConfig, DataPacket } from '@/core/types';
/**
 * Filter node - filters data packets based on conditions
 */
export declare class FilterNode extends BaseNode<FilterNodeConfig> {
    private filterFn?;
    protected onInitialize(): Promise<void>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
    protected processPacket(packet: DataPacket): Promise<DataPacket | null>;
}
/**
 * Pre-built filter functions
 */
export declare class FilterFunctions {
    /**
     * Filter by amount threshold
     */
    static byAmount(operator: 'greater' | 'less' | 'equals', threshold: number): string;
    /**
     * Filter by date range
     */
    static byDateRange(startDate?: string, endDate?: string): string;
    /**
     * Filter by field existence
     */
    static hasField(field: string): string;
    /**
     * Filter by field value
     */
    static byFieldValue(field: string, value: any): string;
    /**
     * Filter by regex pattern
     */
    static byPattern(field: string, pattern: string, flags?: string): string;
    /**
     * Filter by multiple conditions (AND)
     */
    static and(conditions: string[]): string;
    /**
     * Filter by multiple conditions (OR)
     */
    static or(conditions: string[]): string;
    /**
     * Filter out errors
     */
    static noErrors(): string;
    /**
     * Filter for specific categories
     */
    static byCategory(categories: string[]): string;
    /**
     * Rate limiting filter
     */
    static rateLimit(maxPerSecond: number): string;
    /**
     * Sample filter (only pass X% of packets)
     */
    static sample(percentage: number): string;
    /**
     * Deduplicate by field
     */
    static deduplicate(field: string): string;
}
//# sourceMappingURL=FilterNode.d.ts.map