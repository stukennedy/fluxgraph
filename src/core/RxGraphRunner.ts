import {
  Observable,
  Subject,
  BehaviorSubject,
  merge,
  combineLatest,
  from,
  of,
  EMPTY
} from "rxjs";
import {
  filter,
  map,
  tap,
  catchError,
  share,
  takeUntil,
  mergeMap,
  concatMap,
  switchMap,
  bufferTime,
  scan,
  startWith,
  distinctUntilChanged,
  debounceTime,
  throttleTime
} from "rxjs/operators";

import {
  GraphDefinition,
  GraphState,
  GraphContext,
  GraphEvent,
  GraphMetrics,
  DataPacket,
  AnyNodeConfig
} from "./types";

import { RxBaseNode } from "../nodes/RxBaseNode";
import { RxTransformNode } from "../nodes/RxTransformNode";
import { RxSourceNode } from "../nodes/RxSourceNode";
import { RxSinkNode } from "../nodes/RxSinkNode";
import { RxFilterNode } from "../nodes/RxFilterNode";
import { RxAggregateNode } from "../nodes/RxAggregateNode";

/**
 * RxJS-based Graph Runner
 * Uses Observable streams for reactive graph processing
 */
export class RxGraphRunner {
  private definition: GraphDefinition;
  private nodes = new Map<string, RxBaseNode>();
  private destroy$ = new Subject<void>();

  // State management
  private state$ = new BehaviorSubject<GraphState>({
    graphId: "",
    definition: {} as GraphDefinition,
    context: {} as GraphContext,
    status: "idle",
    nodeStates: {},
    createdAt: Date.now(),
    updatedAt: Date.now()
  });

  // Event streams
  private events$ = new Subject<GraphEvent>();

  // Metrics aggregation
  private metrics$!: Observable<GraphMetrics>;

  // Manual injection points
  private injectionPoints = new Map<string, Subject<DataPacket>>();

  constructor(definition: GraphDefinition) {
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
  async initialize(): Promise<void> {
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
    } catch (error) {
      this.updateState({ status: "error" });
      throw error;
    }
  }

  /**
   * Connect nodes based on graph edges
   */
  private connectNodes(): void {
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
          if (!edge.condition) return true;
          return this.evaluateCondition(edge.condition, packet);
        }),

        // Apply edge transformation if present
        map((packet) => {
          if (!edge.transform) return packet;
          return this.applyTransformation(edge.transform, packet);
        }),

        // Error handling for edge
        catchError((error, caught) => {
          console.error(`Edge error ${edge.from} -> ${edge.to}:`, error);
          return EMPTY;
        }),

        // Prevent completion from propagating
        share()
      );

      // Subscribe and feed to next node
      edgePipeline$.pipe(takeUntil(this.destroy$)).subscribe((packet) => {
        toNode.process(packet);
      });
    }
  }

  /**
   * Start graph execution
   */
  async start(): Promise<void> {
    if (this.state$.value.status === "running") return;

    // Start all nodes
    await Promise.all(
      Array.from(this.nodes.values()).map((node) => node.start())
    );

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
  async pause(): Promise<void> {
    if (this.state$.value.status !== "running") return;

    await Promise.all(
      Array.from(this.nodes.values()).map((node) => node.pause())
    );

    this.updateState({ status: "paused" });
  }

  /**
   * Resume graph execution
   */
  async resume(): Promise<void> {
    if (this.state$.value.status !== "paused") return;

    await Promise.all(
      Array.from(this.nodes.values()).map((node) => node.resume())
    );

    this.updateState({ status: "running" });
  }

  /**
   * Stop graph execution
   */
  async stop(): Promise<void> {
    await Promise.all(
      Array.from(this.nodes.values()).map((node) => node.stop())
    );

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
  inject(nodeId: string, data: any, metadata?: Record<string, any>): void {
    const node = this.nodes.get(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    const packet: DataPacket = {
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
  observe(nodeId: string): Observable<DataPacket> {
    const node = this.nodes.get(nodeId);

    if (!node) {
      throw new Error(`Node ${nodeId} not found`);
    }

    return node.getOutput$();
  }

  /**
   * Get state observable
   */
  getState$(): Observable<GraphState> {
    return this.state$.asObservable();
  }

  /**
   * Get current state
   */
  getState(): GraphState {
    return { ...this.state$.value };
  }

  /**
   * Get events observable
   */
  getEvents$(): Observable<GraphEvent> {
    return this.events$.asObservable();
  }

  /**
   * Get metrics observable
   */
  getMetrics$(): Observable<GraphMetrics> {
    return this.metrics$;
  }

  /**
   * Get current metrics
   */
  getMetrics(): GraphMetrics {
    const nodeMetrics: Record<string, any> = {};

    this.nodes.forEach((node, nodeId) => {
      nodeMetrics[nodeId] = node.getMetrics();
    });

    const totals = Object.values(nodeMetrics).reduce(
      (acc: any, metrics: any) => ({
        packetsProcessed: acc.packetsProcessed + metrics.packetsIn,
        packetsDropped: acc.packetsDropped + metrics.packetsDropped,
        packetsErrored: acc.packetsErrored + metrics.packetsErrored,
        totalLatency:
          acc.totalLatency + metrics.averageLatency * metrics.packetsIn
      }),
      {
        packetsProcessed: 0,
        packetsDropped: 0,
        packetsErrored: 0,
        totalLatency: 0
      }
    );

    return {
      ...totals,
      nodeMetrics
    };
  }

  /**
   * Create metrics aggregation stream
   */
  private createMetricsStream(): Observable<GraphMetrics> {
    // Combine all node metrics
    const nodeMetrics$ = Array.from(this.nodes.entries()).map(
      ([nodeId, node]) =>
        node.getMetrics$().pipe(map((metrics) => ({ nodeId, metrics })))
    );

    if (nodeMetrics$.length === 0) {
      return of({
        packetsProcessed: 0,
        packetsDropped: 0,
        packetsErrored: 0,
        totalLatency: 0,
        nodeMetrics: {}
      });
    }

    return combineLatest(nodeMetrics$).pipe(
      map((nodeMetrics) => {
        const nodeMetricsMap: Record<string, any> = {};
        let totals = {
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
      throttleTime(1000),

      share()
    );
  }

  /**
   * Set up global error handling
   */
  private setupErrorHandling(): void {
    // Combine all node status streams
    const nodeStatuses$ = Array.from(this.nodes.entries()).map(
      ([nodeId, node]) =>
        node.getStatus$().pipe(
          filter((status) => status === "error"),
          map(() => ({ nodeId, error: true }))
        )
    );

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
  private createInitialContext(): GraphContext {
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
  private updateState(updates: Partial<GraphState>): void {
    this.state$.next({
      ...this.state$.value,
      ...updates,
      updatedAt: Date.now()
    });
  }

  /**
   * Emit event
   */
  private emitEvent(event: GraphEvent): void {
    this.events$.next(event);
  }

  /**
   * Create node from configuration
   */
  private createNode(config: AnyNodeConfig): RxBaseNode {
    switch (config.type) {
      case 'source':
        return new RxSourceNode(config as any);
      case 'transform':
        return new RxTransformNode(config as any);
      case 'filter':
        return new RxFilterNode(config as any);
      case 'aggregate':
        return new RxAggregateNode(config as any);
      case 'sink':
        return new RxSinkNode(config as any);
      default:
        throw new Error(`Unknown node type: ${config.type}`);
    }
  }

  /**
   * Evaluate condition
   */
  private evaluateCondition(condition: string, packet: DataPacket): boolean {
    try {
      const fn = new Function("data", "metadata", condition);
      return fn(packet.data, packet.metadata);
    } catch (error) {
      console.error(`Error evaluating condition: ${error}`);
      return false;
    }
  }

  /**
   * Apply transformation
   */
  private applyTransformation(
    transform: string,
    packet: DataPacket
  ): DataPacket {
    try {
      const fn = new Function("packet", transform);
      const transformedData = fn(packet);

      return {
        ...packet,
        data: transformedData
      };
    } catch (error) {
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
  static rateLimited<T>(
    source$: Observable<T>,
    ratePerSecond: number
  ): Observable<T> {
    const intervalMs = 1000 / ratePerSecond;
    return source$.pipe(
      concatMap((item) =>
        of(item).pipe(
          tap(() => null),
          delay(intervalMs)
        )
      )
    );
  }

  /**
   * Create a windowed aggregation
   */
  static windowed<T, R>(
    source$: Observable<T>,
    windowSize: number,
    aggregateFn: (items: T[]) => R
  ): Observable<R> {
    return source$.pipe(
      bufferTime(windowSize),
      filter((items) => items.length > 0),
      map(aggregateFn)
    );
  }

  /**
   * Create a circuit breaker
   */
  static circuitBreaker<T>(
    source$: Observable<T>,
    errorThreshold: number = 5,
    resetTime: number = 30000
  ): Observable<T> {
    interface CircuitState {
      errorCount: number;
      lastError: number;
      isOpen: boolean;
      value?: T;
    }
    
    return source$.pipe(
      map((value: T) => ({ value, errorCount: 0, lastError: 0, isOpen: false } as CircuitState)),
      scan(
        (acc: CircuitState, state: CircuitState) => {
          // Reset if enough time has passed
          if (Date.now() - acc.lastError > resetTime) {
            acc.errorCount = 0;
            acc.isOpen = false;
          }
          return { ...state, errorCount: acc.errorCount, lastError: acc.lastError, isOpen: acc.isOpen };
        },
        { errorCount: 0, lastError: 0, isOpen: false } as CircuitState
      ),
      filter((state: CircuitState) => !state.isOpen),
      map((state: CircuitState) => state.value as T),
      catchError((error, caught) => {
        // Increment error count
        // If threshold reached, open circuit
        return caught;
      })
    );
  }
}

// Import needed RxJS operators
import { delay } from "rxjs/operators";
