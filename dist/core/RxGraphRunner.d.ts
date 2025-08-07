import { Observable } from "rxjs";
import { GraphDefinition, GraphState, GraphContext, GraphEvent, DataPacket } from "./types";
/**
 * RxJS-based Graph Runner
 * Uses Observable streams for reactive graph processing
 */
export declare class RxGraphRunner {
    private definition;
    private nodes;
    private destroy$;
    private state$;
    private events$;
    private metrics$;
    private injectionPoints;
    constructor(definition: GraphDefinition);
    /**
     * Initialize the graph
     */
    initialize(): Promise<void>;
    /**
     * Connect nodes based on graph edges
     */
    private connectNodes;
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
     * Inject data into a node
     */
    inject(nodeId: string, data: any, metadata?: Record<string, any>): void;
    /**
     * Get an observable of node output
     */
    observe(nodeId: string): Observable<DataPacket>;
    /**
     * Get state observable
     */
    getState$(): Observable<GraphState>;
    /**
     * Get current state
     */
    getState(): GraphState;
    /**
     * Get events observable
     */
    getEvents$(): Observable<GraphEvent>;
    /**
     * Get metrics observable
     */
    getMetrics$(): Observable<GraphContext["metrics"]>;
    /**
     * Get current metrics
     */
    getMetrics(): GraphContext["metrics"];
    /**
     * Create metrics aggregation stream
     */
    private createMetricsStream;
    /**
     * Set up global error handling
     */
    private setupErrorHandling;
    /**
     * Create initial context
     */
    private createInitialContext;
    /**
     * Update state
     */
    private updateState;
    /**
     * Emit event
     */
    private emitEvent;
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
     * Advanced RxJS operators for complex stream processing
     */
    /**
     * Create a rate-limited stream
     */
    static rateLimited<T>(source$: Observable<T>, ratePerSecond: number): Observable<T>;
    /**
     * Create a windowed aggregation
     */
    static windowed<T, R>(source$: Observable<T>, windowSize: number, aggregateFn: (items: T[]) => R): Observable<R>;
    /**
     * Create a circuit breaker
     */
    static circuitBreaker<T>(source$: Observable<T>, errorThreshold?: number, resetTime?: number): Observable<T>;
}
//# sourceMappingURL=RxGraphRunner.d.ts.map