import { Observable, Subject, BehaviorSubject } from 'rxjs';
import { NodeConfig, DataPacket, NodeStatus, NodeMetrics } from '../core/types';
/**
 * RxJS-based base class for all graph nodes
 * Uses Observables for reactive stream processing
 */
export declare abstract class RxBaseNode<TConfig extends NodeConfig = NodeConfig> {
    protected config: TConfig;
    protected status$: BehaviorSubject<NodeStatus>;
    protected input$: Subject<DataPacket<any>>;
    protected output$: Subject<DataPacket<any>>;
    protected destroy$: Subject<void>;
    protected metrics$: BehaviorSubject<NodeMetrics>;
    private pipeline$?;
    constructor(config: TConfig);
    /**
     * Initialize the node and set up the processing pipeline
     */
    initialize(): Promise<void>;
    /**
     * Create the processing pipeline
     */
    protected createPipeline(): Observable<DataPacket>;
    /**
     * Create the processing operator for this node type
     */
    protected abstract createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    /**
     * Start processing
     */
    start(): Promise<void>;
    /**
     * Pause processing
     */
    pause(): Promise<void>;
    /**
     * Resume processing
     */
    resume(): Promise<void>;
    /**
     * Stop processing
     */
    stop(): Promise<void>;
    /**
     * Get the input observable
     */
    getInput$(): Subject<DataPacket>;
    /**
     * Get the output observable
     */
    getOutput$(): Observable<DataPacket>;
    /**
     * Get status observable
     */
    getStatus$(): Observable<NodeStatus>;
    /**
     * Get metrics observable
     */
    getMetrics$(): Observable<NodeMetrics>;
    /**
     * Get current status
     */
    getStatus(): NodeStatus;
    /**
     * Get current metrics
     */
    getMetrics(): NodeMetrics;
    /**
     * Process a single packet
     */
    process(packet: DataPacket): void;
    /**
     * Handle errors
     */
    protected handleError(error: Error, packet?: DataPacket): void;
    /**
     * Handle packet-level errors
     */
    protected handlePacketError(error: Error, caught: Observable<DataPacket>): Observable<DataPacket>;
    /**
     * Update a metric
     */
    protected updateMetric(metric: keyof NodeMetrics, value?: number): void;
    /**
     * Create a buffering operator based on config
     */
    protected createBufferOperator<T>(): (source: Observable<T>) => Observable<T[]>;
    protected requiresBuffering(): boolean;
    protected getBufferStrategy(): 'time' | 'count' | 'custom';
    protected getBufferSize(): number;
    protected getBufferDuration(): number;
    protected getBufferTrigger$(): Observable<any>;
    protected abstract onInitialize(): Promise<void>;
    protected abstract onStart(): Promise<void>;
    protected abstract onPause(): Promise<void>;
    protected abstract onResume(): Promise<void>;
    protected abstract onStop(): Promise<void>;
}
//# sourceMappingURL=RxBaseNode.d.ts.map