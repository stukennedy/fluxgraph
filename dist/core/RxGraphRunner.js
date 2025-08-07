import { Subject, BehaviorSubject, merge, combineLatest, of, EMPTY } from "rxjs";
import { filter, map, tap, catchError, share, takeUntil, concatMap, bufferTime, scan, throttleTime } from "rxjs/operators";
import { RxTransformNode } from "@/nodes/RxTransformNode";
import { RxSourceNode } from "@/nodes/RxSourceNode";
import { RxSinkNode } from "@/nodes/RxSinkNode";
import { RxFilterNode } from "@/nodes/RxFilterNode";
import { RxAggregateNode } from "@/nodes/RxAggregateNode";
/**
 * RxJS-based Graph Runner
 * Uses Observable streams for reactive graph processing
 */
export class RxGraphRunner {
    definition;
    nodes = new Map();
    destroy$ = new Subject();
    // State management
    state$ = new BehaviorSubject({
        graphId: "",
        definition: {},
        context: {},
        status: "idle",
        nodeStates: {},
        createdAt: Date.now(),
        updatedAt: Date.now()
    });
    // Event streams
    events$ = new Subject();
    // Metrics aggregation
    metrics$;
    // Manual injection points
    injectionPoints = new Map();
    constructor(definition) {
        this.definition = definition;
        // Initialize state
        this.state$.next({
            graphId: definition.id,
            definition,
            context: this.createInitialContext(),
            status: "idle",
            nodeStates: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        // Set up metrics aggregation
        this.metrics$ = this.createMetricsStream();
    }
    /**
     * Initialize the graph
     */
    async initialize() {
        try {
            // Create nodes
            for (const nodeConfig of this.definition.nodes) {
                const node = this.createNode(nodeConfig);
                this.nodes.set(nodeConfig.id, node);
                await node.initialize();
            }
            // Connect nodes based on edges
            this.connectNodes();
            // Set up global error handling
            this.setupErrorHandling();
            // Update state
            this.updateState({ status: "idle" });
            this.emitEvent({
                type: "graph:started",
                timestamp: Date.now(),
                graphId: this.definition.id
            });
        }
        catch (error) {
            this.updateState({ status: "error" });
            throw error;
        }
    }
    /**
     * Connect nodes based on graph edges
     */
    connectNodes() {
        for (const edge of this.definition.edges) {
            const fromNode = this.nodes.get(edge.from);
            const toNode = this.nodes.get(edge.to);
            if (!fromNode || !toNode) {
                throw new Error(`Invalid edge: ${edge.from} -> ${edge.to}`);
            }
            // Create edge pipeline
            const edgePipeline$ = fromNode.getOutput$().pipe(
            // Apply edge condition if present
            filter((packet) => {
                if (!edge.condition)
                    return true;
                return this.evaluateCondition(edge.condition, packet);
            }), 
            // Apply edge transformation if present
            map((packet) => {
                if (!edge.transform)
                    return packet;
                return this.applyTransformation(edge.transform, packet);
            }), 
            // Error handling for edge
            catchError((error, caught) => {
                console.error(`Edge error ${edge.from} -> ${edge.to}:`, error);
                return EMPTY;
            }), 
            // Prevent completion from propagating
            share());
            // Subscribe and feed to next node
            edgePipeline$.pipe(takeUntil(this.destroy$)).subscribe((packet) => {
                toNode.process(packet);
            });
        }
    }
    /**
     * Start graph execution
     */
    async start() {
        if (this.state$.value.status === "running")
            return;
        // Start all nodes
        await Promise.all(Array.from(this.nodes.values()).map((node) => node.start()));
        this.updateState({ status: "running" });
        this.emitEvent({
            type: "graph:started",
            timestamp: Date.now(),
            graphId: this.definition.id
        });
    }
    /**
     * Pause graph execution
     */
    async pause() {
        if (this.state$.value.status !== "running")
            return;
        await Promise.all(Array.from(this.nodes.values()).map((node) => node.pause()));
        this.updateState({ status: "paused" });
    }
    /**
     * Resume graph execution
     */
    async resume() {
        if (this.state$.value.status !== "paused")
            return;
        await Promise.all(Array.from(this.nodes.values()).map((node) => node.resume()));
        this.updateState({ status: "running" });
    }
    /**
     * Stop graph execution
     */
    async stop() {
        await Promise.all(Array.from(this.nodes.values()).map((node) => node.stop()));
        this.updateState({ status: "stopped" });
        this.emitEvent({
            type: "graph:stopped",
            timestamp: Date.now(),
            graphId: this.definition.id
        });
        this.destroy$.next();
        this.destroy$.complete();
    }
    /**
     * Inject data into a node
     */
    inject(nodeId, data, metadata) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        const packet = {
            id: `inject-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            timestamp: Date.now(),
            data,
            metadata: {
                ...metadata,
                injectedAt: nodeId
            }
        };
        node.process(packet);
    }
    /**
     * Get an observable of node output
     */
    observe(nodeId) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        return node.getOutput$();
    }
    /**
     * Get state observable
     */
    getState$() {
        return this.state$.asObservable();
    }
    /**
     * Get current state
     */
    getState() {
        return { ...this.state$.value };
    }
    /**
     * Get events observable
     */
    getEvents$() {
        return this.events$.asObservable();
    }
    /**
     * Get metrics observable
     */
    getMetrics$() {
        return this.metrics$;
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        const nodeMetrics = {};
        this.nodes.forEach((node, nodeId) => {
            nodeMetrics[nodeId] = node.getMetrics();
        });
        const totals = Object.values(nodeMetrics).reduce((acc, metrics) => ({
            packetsProcessed: acc.packetsProcessed + metrics.packetsIn,
            packetsDropped: acc.packetsDropped + metrics.packetsDropped,
            packetsErrored: acc.packetsErrored + metrics.packetsErrored,
            totalLatency: acc.totalLatency + metrics.averageLatency * metrics.packetsIn
        }), {
            packetsProcessed: 0,
            packetsDropped: 0,
            packetsErrored: 0,
            totalLatency: 0
        });
        return {
            ...totals,
            nodeMetrics
        };
    }
    /**
     * Create metrics aggregation stream
     */
    createMetricsStream() {
        // Combine all node metrics
        const nodeMetrics$ = Array.from(this.nodes.entries()).map(([nodeId, node]) => node.getMetrics$().pipe(map((metrics) => ({ nodeId, metrics }))));
        if (nodeMetrics$.length === 0) {
            return of({
                packetsProcessed: 0,
                packetsDropped: 0,
                packetsErrored: 0,
                totalLatency: 0,
                nodeMetrics: {}
            });
        }
        return combineLatest(nodeMetrics$).pipe(map((nodeMetrics) => {
            const nodeMetricsMap = {};
            const totals = {
                packetsProcessed: 0,
                packetsDropped: 0,
                packetsErrored: 0,
                totalLatency: 0
            };
            nodeMetrics.forEach(({ nodeId, metrics }) => {
                nodeMetricsMap[nodeId] = metrics;
                totals.packetsProcessed += metrics.packetsIn;
                totals.packetsDropped += metrics.packetsDropped;
                totals.packetsErrored += metrics.packetsErrored;
                totals.totalLatency += metrics.averageLatency * metrics.packetsIn;
            });
            return {
                ...totals,
                nodeMetrics: nodeMetricsMap
            };
        }), 
        // Throttle updates to avoid overwhelming subscribers
        throttleTime(1000), share());
    }
    /**
     * Set up global error handling
     */
    setupErrorHandling() {
        // Combine all node status streams
        const nodeStatuses$ = Array.from(this.nodes.entries()).map(([nodeId, node]) => node.getStatus$().pipe(filter((status) => status === "error"), map(() => ({ nodeId, error: true }))));
        if (nodeStatuses$.length > 0) {
            merge(...nodeStatuses$)
                .pipe(takeUntil(this.destroy$))
                .subscribe(({ nodeId }) => {
                this.emitEvent({
                    type: "node:error",
                    timestamp: Date.now(),
                    graphId: this.definition.id,
                    nodeId
                });
                // Handle based on error strategy
                if (this.definition.config?.errorStrategy === "stop") {
                    this.stop();
                }
            });
        }
    }
    /**
     * Create initial context
     */
    createInitialContext() {
        return {
            graphId: this.definition.id,
            executionId: `exec-${Date.now()}-${Math.random().toString(36).substring(7)}`,
            startTime: Date.now(),
            variables: {},
            state: {},
            metrics: {
                packetsProcessed: 0,
                packetsDropped: 0,
                packetsErrored: 0,
                totalLatency: 0,
                nodeMetrics: {}
            }
        };
    }
    /**
     * Update state
     */
    updateState(updates) {
        this.state$.next({
            ...this.state$.value,
            ...updates,
            updatedAt: Date.now()
        });
    }
    /**
     * Emit event
     */
    emitEvent(event) {
        this.events$.next(event);
    }
    /**
     * Create node from configuration
     */
    createNode(config) {
        switch (config.type) {
            case 'source':
                return new RxSourceNode(config);
            case 'transform':
                return new RxTransformNode(config);
            case 'filter':
                return new RxFilterNode(config);
            case 'aggregate':
                return new RxAggregateNode(config);
            case 'sink':
                return new RxSinkNode(config);
            default:
                throw new Error(`Unknown node type: ${config.type}`);
        }
    }
    /**
     * Evaluate condition
     */
    evaluateCondition(condition, packet) {
        try {
            const fn = new Function("data", "metadata", condition);
            return fn(packet.data, packet.metadata);
        }
        catch (error) {
            console.error(`Error evaluating condition: ${error}`);
            return false;
        }
    }
    /**
     * Apply transformation
     */
    applyTransformation(transform, packet) {
        try {
            const fn = new Function("packet", transform);
            const transformedData = fn(packet);
            return {
                ...packet,
                data: transformedData
            };
        }
        catch (error) {
            console.error(`Error applying transformation: ${error}`);
            return packet;
        }
    }
    /**
     * Advanced RxJS operators for complex stream processing
     */
    /**
     * Create a rate-limited stream
     */
    static rateLimited(source$, ratePerSecond) {
        const intervalMs = 1000 / ratePerSecond;
        return source$.pipe(concatMap((item) => of(item).pipe(tap(() => null), delay(intervalMs))));
    }
    /**
     * Create a windowed aggregation
     */
    static windowed(source$, windowSize, aggregateFn) {
        return source$.pipe(bufferTime(windowSize), filter((items) => items.length > 0), map(aggregateFn));
    }
    /**
     * Create a circuit breaker
     */
    static circuitBreaker(source$, errorThreshold = 5, resetTime = 30000) {
        return source$.pipe(map((value) => ({ value, errorCount: 0, lastError: 0, isOpen: false })), scan((acc, state) => {
            // Reset if enough time has passed
            if (Date.now() - acc.lastError > resetTime) {
                acc.errorCount = 0;
                acc.isOpen = false;
            }
            return { ...state, errorCount: acc.errorCount, lastError: acc.lastError, isOpen: acc.isOpen };
        }, { errorCount: 0, lastError: 0, isOpen: false }), filter((state) => !state.isOpen), map((state) => state.value), catchError((error, caught) => {
            // Increment error count
            // If threshold reached, open circuit
            return caught;
        }));
    }
}
// Import needed RxJS operators
import { delay } from "rxjs/operators";
