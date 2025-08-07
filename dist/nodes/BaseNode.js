/**
 * Base class for all graph nodes
 * Handles common functionality like buffering, metrics, error handling
 */
export class BaseNode {
    config;
    status = 'idle';
    buffer = [];
    metrics;
    subscribers = new Set();
    errorHandler;
    retryCount = new Map();
    constructor(config) {
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
    async initialize() {
        this.status = 'idle';
        await this.onInitialize();
    }
    /**
     * Start processing
     */
    async start() {
        if (this.status === 'running')
            return;
        this.status = 'running';
        await this.onStart();
    }
    /**
     * Pause processing
     */
    async pause() {
        if (this.status !== 'running')
            return;
        this.status = 'paused';
        await this.onPause();
    }
    /**
     * Resume processing
     */
    async resume() {
        if (this.status !== 'paused')
            return;
        this.status = 'running';
        await this.onResume();
    }
    /**
     * Stop processing
     */
    async stop() {
        this.status = 'completed';
        await this.onStop();
    }
    /**
     * Process incoming data packet
     */
    async process(packet) {
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
            }
            else {
                // Process immediately
                const results = await this.processPacket(packet);
                // Emit results
                if (results) {
                    if (Array.isArray(results)) {
                        for (const result of results) {
                            await this.emit(result);
                        }
                    }
                    else {
                        await this.emit(results);
                    }
                }
            }
            // Update metrics
            const latency = Date.now() - startTime;
            this.updateLatency(latency);
            this.metrics.lastProcessedAt = Date.now();
        }
        catch (error) {
            await this.handleError(error, packet);
        }
    }
    /**
     * Subscribe to node output
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }
    /**
     * Set error handler
     */
    onError(handler) {
        this.errorHandler = handler;
    }
    /**
     * Emit data packet to subscribers
     */
    async emit(packet) {
        this.metrics.packetsOut++;
        // Notify all subscribers
        const promises = Array.from(this.subscribers).map(subscriber => {
            try {
                return Promise.resolve(subscriber(packet));
            }
            catch (error) {
                console.error(`Subscriber error in node ${this.config.id}:`, error);
                return Promise.resolve();
            }
        });
        await Promise.all(promises);
    }
    /**
     * Handle dropped packet
     */
    handleDroppedPacket(packet, reason) {
        this.metrics.packetsDropped++;
        console.warn(`Packet dropped in node ${this.config.id}: ${reason}`, packet.id);
    }
    /**
     * Handle error with retry logic
     */
    async handleError(error, packet) {
        this.metrics.packetsErrored++;
        if (packet && this.config.retryPolicy) {
            const retryCount = this.retryCount.get(packet.id) || 0;
            if (retryCount < this.config.retryPolicy.maxRetries) {
                // Calculate delay with exponential backoff
                const delay = Math.min(this.config.retryPolicy.initialDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount), this.config.retryPolicy.maxDelay);
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
        }
        else {
            console.error(`Error in node ${this.config.id}:`, error);
        }
    }
    /**
     * Check if packet should be dropped due to buffer limits
     */
    shouldDropPacket() {
        const bufferSize = this.config.bufferSize || 1000;
        return this.buffer.length >= bufferSize;
    }
    /**
     * Check if node requires buffering
     */
    requiresBuffering() {
        return false; // Override in subclasses
    }
    /**
     * Check if buffer is ready for processing
     */
    isBufferReady() {
        return false; // Override in subclasses
    }
    /**
     * Process buffered packets
     */
    async processBuffer() {
        // Override in subclasses
    }
    /**
     * Update latency metrics
     */
    updateLatency(latency) {
        const currentAvg = this.metrics.averageLatency;
        const totalPackets = this.metrics.packetsIn;
        this.metrics.averageLatency = (currentAvg * (totalPackets - 1) + latency) / totalPackets;
    }
    /**
     * Get node status
     */
    getStatus() {
        return this.status;
    }
    /**
     * Get node metrics
     */
    getMetrics() {
        return { ...this.metrics };
    }
    /**
     * Get node configuration
     */
    getConfig() {
        return this.config;
    }
    /**
     * Clear buffer
     */
    clearBuffer() {
        this.buffer = [];
    }
}
