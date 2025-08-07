import { GraphDefinition, GraphState, GraphContext, GraphEvent, GraphEventType, DataPacket } from './types';
/**
 * Main GraphRunner class
 * Manages the execution of a graph of nodes
 */
export declare class GraphRunner {
    private definition;
    private context;
    private nodes;
    private state;
    private eventListeners;
    private subscriptions;
    private executionTimer?;
    constructor(definition: GraphDefinition);
    /**
     * Initialize the graph
     */
    initialize(): Promise<void>;
    /**
     * Start graph execution
     */
    start(): Promise<void>;
    /**
     * Pause graph execution
     */
    pause(): Promise<void>;
    /**
     * Resume graph execution
     */
    resume(): Promise<void>;
    /**
     * Stop graph execution
     */
    stop(): Promise<void>;
    /**
     * Inject data into a source node
     */
    inject(nodeId: string, data: any, metadata?: Record<string, any>): Promise<void>;
    /**
     * Subscribe to node output
     */
    subscribe(nodeId: string, callback: (packet: DataPacket) => void | Promise<void>, filter?: string): string;
    /**
     * Unsubscribe from node output
     */
    unsubscribe(subscriptionId: string): void;
    /**
     * Add event listener
     */
    on(eventType: GraphEventType, callback: (event: GraphEvent) => void): void;
    /**
     * Remove event listener
     */
    off(eventType: GraphEventType, callback: (event: GraphEvent) => void): void;
    /**
     * Get graph state
     */
    getState(): GraphState;
    /**
     * Get graph metrics
     */
    getMetrics(): GraphContext['metrics'];
    /**
     * Set context variable
     */
    setVariable(key: string, value: any): void;
    /**
     * Get context variable
     */
    getVariable(key: string): any;
    /**
     * Create node from configuration
     */
    private createNode;
    /**
     * Evaluate condition
     */
    private evaluateCondition;
    /**
     * Apply transformation
     */
    private applyTransformation;
    /**
     * Handle node error
     */
    private handleNodeError;
    /**
     * Emit event
     */
    private emitEvent;
    /**
     * Start metrics collection
     */
    private startMetricsCollection;
    /**
     * Stop metrics collection
     */
    private stopMetricsCollection;
}
//# sourceMappingURL=GraphRunner.d.ts.map