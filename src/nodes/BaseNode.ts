import { 
  NodeConfig, 
  DataPacket, 
  NodeStatus, 
  NodeMetrics,
  RetryPolicy 
} from '../core/types';

/**
 * Base class for all graph nodes
 * Handles common functionality like buffering, metrics, error handling
 */
export abstract class BaseNode<TConfig extends NodeConfig = NodeConfig> {
  protected config: TConfig;
  protected status: NodeStatus = 'idle';
  protected buffer: DataPacket[] = [];
  protected metrics: NodeMetrics;
  protected subscribers: Set<(packet: DataPacket) => void | Promise<void>> = new Set();
  protected errorHandler?: (error: Error, packet?: DataPacket) => void;
  protected retryCount: Map<string, number> = new Map();

  constructor(config: TConfig) {
    this.config = config;
    this.metrics = {
      packetsIn: 0,
      packetsOut: 0,
      packetsDropped: 0,
      packetsErrored: 0,
      averageLatency: 0,
      lastProcessedAt: undefined
    };
  }

  /**
   * Initialize the node
   */
  async initialize(): Promise<void> {
    this.status = 'idle';
    await this.onInitialize();
  }

  /**
   * Start processing
   */
  async start(): Promise<void> {
    if (this.status === 'running') return;
    
    this.status = 'running';
    await this.onStart();
  }

  /**
   * Pause processing
   */
  async pause(): Promise<void> {
    if (this.status !== 'running') return;
    
    this.status = 'paused';
    await this.onPause();
  }

  /**
   * Resume processing
   */
  async resume(): Promise<void> {
    if (this.status !== 'paused') return;
    
    this.status = 'running';
    await this.onResume();
  }

  /**
   * Stop processing
   */
  async stop(): Promise<void> {
    this.status = 'completed';
    await this.onStop();
  }

  /**
   * Process incoming data packet
   */
  async process(packet: DataPacket): Promise<void> {
    if (this.status !== 'running') {
      this.handleDroppedPacket(packet, 'Node not running');
      return;
    }

    const startTime = Date.now();
    this.metrics.packetsIn++;

    try {
      // Check buffer limits
      if (this.shouldDropPacket()) {
        this.handleDroppedPacket(packet, 'Buffer full');
        return;
      }

      // Add to buffer if needed
      if (this.requiresBuffering()) {
        this.buffer.push(packet);
        
        // Process buffer if ready
        if (this.isBufferReady()) {
          await this.processBuffer();
        }
      } else {
        // Process immediately
        const results = await this.processPacket(packet);
        
        // Emit results
        if (results) {
          if (Array.isArray(results)) {
            for (const result of results) {
              await this.emit(result);
            }
          } else {
            await this.emit(results);
          }
        }
      }

      // Update metrics
      const latency = Date.now() - startTime;
      this.updateLatency(latency);
      this.metrics.lastProcessedAt = Date.now();

    } catch (error) {
      await this.handleError(error as Error, packet);
    }
  }

  /**
   * Subscribe to node output
   */
  subscribe(callback: (packet: DataPacket) => void | Promise<void>): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  /**
   * Set error handler
   */
  onError(handler: (error: Error, packet?: DataPacket) => void): void {
    this.errorHandler = handler;
  }

  /**
   * Emit data packet to subscribers
   */
  protected async emit(packet: DataPacket): Promise<void> {
    this.metrics.packetsOut++;
    
    // Notify all subscribers
    const promises = Array.from(this.subscribers).map(subscriber => {
      try {
        return Promise.resolve(subscriber(packet));
      } catch (error) {
        console.error(`Subscriber error in node ${this.config.id}:`, error);
        return Promise.resolve();
      }
    });

    await Promise.all(promises);
  }

  /**
   * Handle dropped packet
   */
  protected handleDroppedPacket(packet: DataPacket, reason: string): void {
    this.metrics.packetsDropped++;
    console.warn(`Packet dropped in node ${this.config.id}: ${reason}`, packet.id);
  }

  /**
   * Handle error with retry logic
   */
  protected async handleError(error: Error, packet?: DataPacket): Promise<void> {
    this.metrics.packetsErrored++;
    
    if (packet && this.config.retryPolicy) {
      const retryCount = this.retryCount.get(packet.id) || 0;
      
      if (retryCount < this.config.retryPolicy.maxRetries) {
        // Calculate delay with exponential backoff
        const delay = Math.min(
          this.config.retryPolicy.initialDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount),
          this.config.retryPolicy.maxDelay
        );
        
        // Schedule retry
        setTimeout(() => {
          this.retryCount.set(packet.id, retryCount + 1);
          this.process(packet);
        }, delay);
        
        return;
      }
    }
    
    // No retry or max retries reached
    this.status = 'error';
    
    if (this.errorHandler) {
      this.errorHandler(error, packet);
    } else {
      console.error(`Error in node ${this.config.id}:`, error);
    }
  }

  /**
   * Check if packet should be dropped due to buffer limits
   */
  protected shouldDropPacket(): boolean {
    const bufferSize = this.config.bufferSize || 1000;
    return this.buffer.length >= bufferSize;
  }

  /**
   * Check if node requires buffering
   */
  protected requiresBuffering(): boolean {
    return false; // Override in subclasses
  }

  /**
   * Check if buffer is ready for processing
   */
  protected isBufferReady(): boolean {
    return false; // Override in subclasses
  }

  /**
   * Process buffered packets
   */
  protected async processBuffer(): Promise<void> {
    // Override in subclasses
  }

  /**
   * Update latency metrics
   */
  protected updateLatency(latency: number): void {
    const currentAvg = this.metrics.averageLatency;
    const totalPackets = this.metrics.packetsIn;
    this.metrics.averageLatency = (currentAvg * (totalPackets - 1) + latency) / totalPackets;
  }

  /**
   * Get node status
   */
  getStatus(): NodeStatus {
    return this.status;
  }

  /**
   * Get node metrics
   */
  getMetrics(): NodeMetrics {
    return { ...this.metrics };
  }

  /**
   * Get node configuration
   */
  getConfig(): TConfig {
    return this.config;
  }

  /**
   * Clear buffer
   */
  clearBuffer(): void {
    this.buffer = [];
  }

  // Abstract methods to be implemented by subclasses
  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onPause(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onStop(): Promise<void>;
  protected abstract processPacket(packet: DataPacket): Promise<DataPacket | DataPacket[] | null>;
}