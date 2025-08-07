import { SourceNode } from '@/nodes/SourceNode';
import { TransformNode } from '@/nodes/TransformNode';
import { FilterNode } from '@/nodes/FilterNode';
import { AggregateNode } from '@/nodes/AggregateNode';
import { SinkNode } from '@/nodes/SinkNode';
/**
 * Main GraphRunner class
 * Manages the execution of a graph of nodes
 */
export class GraphRunner {
    definition;
    context;
    nodes = new Map();
    state;
    eventListeners = new Map();
    subscriptions = new Map();
    executionTimer;
    constructor(definition) {
        this.definition = definition;
        // Initialize context
        this.context = {
            graphId: definition.id,
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
        // Initialize state
        this.state = {
            graphId: definition.id,
            definition,
            context: this.context,
            status: 'idle',
            nodeStates: {},
            createdAt: Date.now(),
            updatedAt: Date.now()
        };
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
                // Initialize node state
                this.state.nodeStates[nodeConfig.id] = {
                    nodeId: nodeConfig.id,
                    status: 'idle',
                    buffer: [],
                    metrics: node.getMetrics()
                };
            }
            // Connect nodes based on edges
            for (const edge of this.definition.edges) {
                const fromNode = this.nodes.get(edge.from);
                const toNode = this.nodes.get(edge.to);
                if (!fromNode || !toNode) {
                    throw new Error(`Invalid edge: ${edge.from} -> ${edge.to}`);
                }
                // Subscribe to node to to node from
                fromNode.subscribe(async (packet) => {
                    // Apply edge condition if present
                    if (edge.condition) {
                        const shouldPass = await this.evaluateCondition(edge.condition, packet);
                        if (!shouldPass)
                            return;
                    }
                    // Apply edge transformation if present
                    if (edge.transform) {
                        packet = await this.applyTransformation(edge.transform, packet);
                    }
                    // Process packet in target node
                    await toNode.process(packet);
                });
            }
            // Initialize all nodes
            const initPromises = Array.from(this.nodes.values()).map(node => node.initialize());
            await Promise.all(initPromises);
            // Set up error handlers
            this.nodes.forEach((node, nodeId) => {
                node.onError((error, packet) => {
                    this.handleNodeError(nodeId, error, packet);
                });
            });
            this.emitEvent({
                type: 'graph:started',
                timestamp: Date.now(),
                graphId: this.definition.id
            });
        }
        catch (error) {
            this.state.status = 'error';
            throw error;
        }
    }
    /**
     * Start graph execution
     */
    async start() {
        if (this.state.status === 'running')
            return;
        this.state.status = 'running';
        this.state.updatedAt = Date.now();
        // Start all nodes
        const startPromises = Array.from(this.nodes.values()).map(node => node.start());
        await Promise.all(startPromises);
        // Start metrics collection
        this.startMetricsCollection();
        this.emitEvent({
            type: 'graph:started',
            timestamp: Date.now(),
            graphId: this.definition.id
        });
    }
    /**
     * Pause graph execution
     */
    async pause() {
        if (this.state.status !== 'running')
            return;
        this.state.status = 'paused';
        this.state.updatedAt = Date.now();
        // Pause all nodes
        const pausePromises = Array.from(this.nodes.values()).map(node => node.pause());
        await Promise.all(pausePromises);
        // Stop metrics collection
        this.stopMetricsCollection();
    }
    /**
     * Resume graph execution
     */
    async resume() {
        if (this.state.status !== 'paused')
            return;
        this.state.status = 'running';
        this.state.updatedAt = Date.now();
        // Resume all nodes
        const resumePromises = Array.from(this.nodes.values()).map(node => node.resume());
        await Promise.all(resumePromises);
        // Resume metrics collection
        this.startMetricsCollection();
    }
    /**
     * Stop graph execution
     */
    async stop() {
        this.state.status = 'stopped';
        this.state.updatedAt = Date.now();
        // Stop all nodes
        const stopPromises = Array.from(this.nodes.values()).map(node => node.stop());
        await Promise.all(stopPromises);
        // Stop metrics collection
        this.stopMetricsCollection();
        this.emitEvent({
            type: 'graph:stopped',
            timestamp: Date.now(),
            graphId: this.definition.id
        });
    }
    /**
     * Inject data into a source node
     */
    async inject(nodeId, data, metadata) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        if (!(node instanceof SourceNode)) {
            throw new Error(`Node ${nodeId} is not a source node`);
        }
        await node.inject(data, metadata);
    }
    /**
     * Subscribe to node output
     */
    subscribe(nodeId, callback, filter) {
        const node = this.nodes.get(nodeId);
        if (!node) {
            throw new Error(`Node ${nodeId} not found`);
        }
        const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        // Create filtered callback if filter is provided
        const filteredCallback = filter
            ? async (packet) => {
                const shouldPass = await this.evaluateCondition(filter, packet);
                if (shouldPass) {
                    await callback(packet);
                }
            }
            : callback;
        // Subscribe to node
        const unsubscribe = node.subscribe(filteredCallback);
        // Store subscription
        this.subscriptions.set(subscriptionId, {
            id: subscriptionId,
            nodeId,
            filter,
            callback: filteredCallback
        });
        // Return unsubscribe function
        return subscriptionId;
    }
    /**
     * Unsubscribe from node output
     */
    unsubscribe(subscriptionId) {
        this.subscriptions.delete(subscriptionId);
    }
    /**
     * Add event listener
     */
    on(eventType, callback) {
        if (!this.eventListeners.has(eventType)) {
            this.eventListeners.set(eventType, new Set());
        }
        this.eventListeners.get(eventType).add(callback);
    }
    /**
     * Remove event listener
     */
    off(eventType, callback) {
        this.eventListeners.get(eventType)?.delete(callback);
    }
    /**
     * Get graph state
     */
    getState() {
        // Update node states
        this.nodes.forEach((node, nodeId) => {
            this.state.nodeStates[nodeId] = {
                nodeId,
                status: node.getStatus(),
                buffer: [],
                metrics: node.getMetrics()
            };
        });
        return { ...this.state };
    }
    /**
     * Get graph metrics
     */
    getMetrics() {
        // Aggregate metrics from all nodes
        let totalPacketsProcessed = 0;
        let totalPacketsDropped = 0;
        let totalPacketsErrored = 0;
        let totalLatency = 0;
        const nodeMetrics = {};
        this.nodes.forEach((node, nodeId) => {
            const metrics = node.getMetrics();
            nodeMetrics[nodeId] = metrics;
            totalPacketsProcessed += metrics.packetsIn;
            totalPacketsDropped += metrics.packetsDropped;
            totalPacketsErrored += metrics.packetsErrored;
            totalLatency += metrics.averageLatency * metrics.packetsIn;
        });
        return {
            packetsProcessed: totalPacketsProcessed,
            packetsDropped: totalPacketsDropped,
            packetsErrored: totalPacketsErrored,
            totalLatency: totalLatency / Math.max(totalPacketsProcessed, 1),
            nodeMetrics
        };
    }
    /**
     * Set context variable
     */
    setVariable(key, value) {
        this.context.variables[key] = value;
    }
    /**
     * Get context variable
     */
    getVariable(key) {
        return this.context.variables[key];
    }
    /**
     * Create node from configuration
     */
    createNode(config) {
        switch (config.type) {
            case 'source':
                return new SourceNode(config);
            case 'transform':
                return new TransformNode(config);
            case 'filter':
                return new FilterNode(config);
            case 'aggregate':
                return new AggregateNode(config);
            case 'sink':
                return new SinkNode(config);
            default:
                throw new Error(`Unknown node type: ${config.type}`);
        }
    }
    /**
     * Evaluate condition
     */
    async evaluateCondition(condition, packet) {
        try {
            const fn = new Function('data', 'metadata', 'context', condition);
            return await Promise.resolve(fn(packet.data, packet.metadata, this.context));
        }
        catch (error) {
            console.error(`Error evaluating condition: ${error}`);
            return false;
        }
    }
    /**
     * Apply transformation
     */
    async applyTransformation(transform, packet) {
        try {
            const fn = new Function('packet', 'context', transform);
            const transformedData = await Promise.resolve(fn(packet, this.context));
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
     * Handle node error
     */
    handleNodeError(nodeId, error, packet) {
        console.error(`Error in node ${nodeId}:`, error);
        this.emitEvent({
            type: 'node:error',
            timestamp: Date.now(),
            graphId: this.definition.id,
            nodeId,
            packetId: packet?.id,
            error
        });
        // Update metrics
        this.context.metrics.packetsErrored++;
        // Handle error based on strategy
        const errorStrategy = this.definition.config?.errorStrategy || 'continue';
        if (errorStrategy === 'stop') {
            this.stop();
        }
    }
    /**
     * Emit event
     */
    emitEvent(event) {
        const listeners = this.eventListeners.get(event.type);
        if (listeners) {
            listeners.forEach(listener => {
                try {
                    listener(event);
                }
                catch (error) {
                    console.error(`Error in event listener: ${error}`);
                }
            });
        }
    }
    /**
     * Start metrics collection
     */
    startMetricsCollection() {
        this.executionTimer = setInterval(() => {
            this.context.metrics = this.getMetrics();
            this.state.updatedAt = Date.now();
        }, 5000); // Update every 5 seconds
    }
    /**
     * Stop metrics collection
     */
    stopMetricsCollection() {
        if (this.executionTimer) {
            clearInterval(this.executionTimer);
            this.executionTimer = undefined;
        }
    }
}
