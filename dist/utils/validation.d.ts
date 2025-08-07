import { GraphDefinition, NodeConfig, DataPacket } from '@/core/types';
/**
 * Validate a graph definition
 */
export declare function validateGraphDefinition(definition: GraphDefinition): {
    valid: boolean;
    errors: string[];
};
/**
 * Check if a graph has cycles
 */
export declare function hasCycles(definition: GraphDefinition): boolean;
/**
 * Validate a node configuration
 */
export declare function validateNodeConfig(config: NodeConfig): {
    valid: boolean;
    errors: string[];
};
/**
 * Validate a data packet
 */
export declare function validateDataPacket(packet: any): packet is DataPacket;
/**
 * Validate function syntax
 */
export declare function validateFunctionSyntax(functionString: string): {
    valid: boolean;
    error?: string;
};
export declare const validation: {
    validateGraphDefinition: typeof validateGraphDefinition;
    validateNodeConfig: typeof validateNodeConfig;
    validateDataPacket: typeof validateDataPacket;
    validateFunctionSyntax: typeof validateFunctionSyntax;
    hasCycles: typeof hasCycles;
};
//# sourceMappingURL=validation.d.ts.map