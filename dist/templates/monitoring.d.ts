import { GraphDefinition } from '@/core/types';
/**
 * System monitoring and alerting template
 */
export declare const monitoringTemplate: GraphDefinition;
export declare const createMonitoringPipeline: (config?: Partial<GraphDefinition["config"]>) => {
    config: {
        maxConcurrency?: number;
        defaultTimeout?: number;
        bufferStrategy?: "drop" | "block" | "sliding";
        errorStrategy?: "stop" | "continue" | "retry";
        checkpointInterval?: number;
        allowCycles?: boolean;
        maxIterations?: number;
        enableCheckpointing?: boolean;
        streamingMode?: boolean;
    };
    id: string;
    name: string;
    description?: string;
    version: string;
    nodes: import("@/core/types").AnyNodeConfig[];
    edges: import("@/core/types").GraphEdge[];
    metadata?: Record<string, any>;
};
export default monitoringTemplate;
//# sourceMappingURL=monitoring.d.ts.map