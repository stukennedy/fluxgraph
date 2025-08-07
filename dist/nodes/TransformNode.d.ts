import { BaseNode } from '@/nodes/BaseNode';
import { TransformNodeConfig, DataPacket } from '@/core/types';
/**
 * Transform node - transforms data packets
 */
export declare class TransformNode extends BaseNode<TransformNodeConfig> {
    private transformFn?;
    protected onInitialize(): Promise<void>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
    protected processPacket(packet: DataPacket): Promise<DataPacket>;
}
/**
 * Pre-built transform functions
 */
export declare class TransformFunctions {
    /**
     * Extract specific fields from data
     */
    static extractFields(fields: string[]): string;
    /**
     * Add timestamp to data
     */
    static addTimestamp(): string;
    /**
     * Convert currency amounts (pence to pounds)
     */
    static convertCurrency(field?: string): string;
    /**
     * Filter by field value
     */
    static filterByValue(field: string, operator: string, value: any): string;
    /**
     * Enrich with additional data
     */
    static enrich(enrichmentData: Record<string, any>): string;
    /**
     * Calculate running average
     */
    static calculateRunningAverage(field: string): string;
    /**
     * Format for output
     */
    static formatOutput(template: string): string;
    /**
     * Categorize transactions
     */
    static categorizeTransaction(): string;
}
//# sourceMappingURL=TransformNode.d.ts.map