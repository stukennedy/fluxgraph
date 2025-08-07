import { GraphDefinition } from "../core/types";
/**
 * Create an anomaly detector for financial transactions
 */
export declare function createAnomalyDetector(config: {
    sourceUrl?: string;
    thresholds?: {
        amount?: number;
        frequency?: number;
    };
    alertUrl?: string;
}): GraphDefinition;
/**
 * Create a spending monitor
 */
export declare function createSpendingMonitor(config: {
    dailyLimit?: number;
    categories?: string[];
    alertUrl?: string;
}): GraphDefinition;
/**
 * Create a transaction categorizer
 */
export declare function createTransactionCategorizer(): GraphDefinition;
/**
 * Create a balance tracker
 */
export declare function createBalanceTracker(initialBalance?: number): GraphDefinition;
//# sourceMappingURL=financial.d.ts.map