import { NodeConfig, DataPacket, NodeStatus, NodeMetrics } from '../core/types';
/**
 * Base class for all graph nodes
 * Handles common functionality like buffering, metrics, error handling
 */
export declare abstract class BaseNode<TConfig extends NodeConfig = NodeConfig> {
    protected config: TConfig;
    protected status: NodeStatus;
    protected buffer: DataPacket[];
    protected metrics: NodeMetrics;
    protected subscribers: Set<(packet: DataPacket) => void | Promise<void>>;
    protected errorHandler?: (error: Error, packet?: DataPacket) => void;
    protected retryCount: Map<string, number>;
    constructor(config: TConfig);
    /**
     * Initialize the node
     */
    initialize(): Promise<void>;
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
     * Process incoming data packet
     */
    process(packet: DataPacket): Promise<void>;
    /**
     * Subscribe to node output
     */
    subscribe(callback: (packet: DataPacket) => void | Promise<void>): () => void;
    /**
     * Set error handler
     */
    onError(handler: (error: Error, packet?: DataPacket) => void): void;
    /**
     * Emit data packet to subscribers
     */
    protected emit(packet: DataPacket): Promise<void>;
    /**
     * Handle dropped packet
     */
    protected handleDroppedPacket(packet: DataPacket, reason: string): void;
    /**
     * Handle error with retry logic
     */
    protected handleError(error: Error, packet?: DataPacket): Promise<void>;
    /**
     * Check if packet should be dropped due to buffer limits
     */
    protected shouldDropPacket(): boolean;
    /**
     * Check if node requires buffering
     */
    protected requiresBuffering(): boolean;
    /**
     * Check if buffer is ready for processing
     */
    protected isBufferReady(): boolean;
    /**
     * Process buffered packets
     */
    protected processBuffer(): Promise<void>;
    /**
     * Update latency metrics
     */
    protected updateLatency(latency: number): void;
    /**
     * Get node status
     */
    getStatus(): NodeStatus;
    /**
     * Get node metrics
     */
    getMetrics(): NodeMetrics;
    /**
     * Get node configuration
     */
    getConfig(): TConfig;
    /**
     * Clear buffer
     */
    clearBuffer(): void;
    protected abstract onInitialize(): Promise<void>;
    protected abstract onStart(): Promise<void>;
    protected abstract onPause(): Promise<void>;
    protected abstract onResume(): Promise<void>;
    protected abstract onStop(): Promise<void>;
    protected abstract processPacket(packet: DataPacket): Promise<DataPacket | DataPacket[] | null>;
}
//# sourceMappingURL=BaseNode.d.ts.map