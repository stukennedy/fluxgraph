/**
 * Graph Runner Type Definitions
 * Defines the core types for the real-time streaming graph processing system
 */
export type NodeType = 'source' | 'transform' | 'filter' | 'aggregate' | 'sink' | 'merge' | 'split' | 'llm' | 'tool' | 'memory' | 'router';
export type NodeStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';
export interface DataPacket<T = any> {
    id: string;
    timestamp: number;
    data: T;
    metadata?: Record<string, any>;
    error?: Error;
}
export interface NodeConfig {
    id: string;
    type: NodeType;
    name: string;
    description?: string;
    retryPolicy?: RetryPolicy;
    timeout?: number;
    bufferSize?: number;
}
export interface SourceNodeConfig extends NodeConfig {
    type: 'source';
    sourceType: 'websocket' | 'http' | 'timer' | 'manual' | 'database';
    config: {
        url?: string;
        interval?: number;
        query?: string;
        headers?: Record<string, string>;
    };
}
export interface TransformNodeConfig extends NodeConfig {
    type: 'transform';
    transformFunction: string;
    outputSchema?: any;
}
export interface FilterNodeConfig extends NodeConfig {
    type: 'filter';
    filterFunction: string;
}
export interface AggregateNodeConfig extends NodeConfig {
    type: 'aggregate';
    windowType: 'time' | 'count' | 'session';
    windowSize: number;
    aggregateFunction: string;
    emitStrategy: 'onComplete' | 'incremental';
}
export interface SinkNodeConfig extends NodeConfig {
    type: 'sink';
    sinkType: 'websocket' | 'http' | 'database' | 'log' | 'custom';
    config: {
        url?: string;
        table?: string;
        method?: string;
        format?: 'json' | 'text' | 'binary';
        callback?: (packet: DataPacket) => void | Promise<void>;
    };
}
export interface MergeNodeConfig extends NodeConfig {
    type: 'merge';
    mergeStrategy: 'concat' | 'zip' | 'combine' | 'custom';
    mergeFunction?: string;
}
export interface SplitNodeConfig extends NodeConfig {
    type: 'split';
    splitFunction: string;
}
export interface LLMNodeConfig extends NodeConfig {
    type: 'llm';
    model: string;
    apiKey?: string;
    apiEndpoint?: string;
    temperature?: number;
    maxTokens?: number;
    systemPrompt?: string;
    responseFormat?: 'text' | 'json' | 'tool_call';
    streaming?: boolean;
    retryOnError?: boolean;
}
export interface ToolNodeConfig extends NodeConfig {
    type: 'tool';
    tools: Array<{
        name: string;
        description: string;
        parameters: any;
        function?: string;
    }>;
    parallelExecution?: boolean;
    maxParallel?: number;
    sandboxed?: boolean;
}
export interface MemoryNodeConfig extends NodeConfig {
    type: 'memory';
    memoryType: 'conversation' | 'semantic' | 'summary' | 'hybrid';
    maxEntries?: number;
    ttl?: number;
    embeddingModel?: string;
    embeddingDimension?: number;
    summarizationInterval?: number;
    persistenceAdapter?: any;
}
export interface RouterNodeConfig extends NodeConfig {
    type: 'router';
    routingFunction: string;
    routes: Array<{
        condition: string;
        target: string;
    }>;
}
export type AnyNodeConfig = SourceNodeConfig | TransformNodeConfig | FilterNodeConfig | AggregateNodeConfig | SinkNodeConfig | MergeNodeConfig | SplitNodeConfig | LLMNodeConfig | ToolNodeConfig | MemoryNodeConfig | RouterNodeConfig;
export interface GraphEdge {
    id: string;
    from: string;
    to: string;
    condition?: string;
    transform?: string;
}
export interface GraphDefinition {
    id: string;
    name: string;
    description?: string;
    version: string;
    nodes: AnyNodeConfig[];
    edges: GraphEdge[];
    metadata?: Record<string, any>;
    config?: GraphConfig;
}
export interface GraphConfig {
    maxConcurrency?: number;
    defaultTimeout?: number;
    bufferStrategy?: 'drop' | 'block' | 'sliding';
    errorStrategy?: 'stop' | 'continue' | 'retry';
    checkpointInterval?: number;
    allowCycles?: boolean;
    maxIterations?: number;
    enableCheckpointing?: boolean;
    streamingMode?: boolean;
}
export interface RetryPolicy {
    maxRetries: number;
    backoffMultiplier: number;
    initialDelay: number;
    maxDelay: number;
}
export interface GraphContext {
    graphId: string;
    executionId: string;
    startTime: number;
    variables: Record<string, any>;
    state: Record<string, any>;
    metrics: GraphMetrics;
}
export interface GraphMetrics {
    packetsProcessed: number;
    packetsDropped: number;
    packetsErrored: number;
    totalLatency: number;
    nodeMetrics: Record<string, NodeMetrics>;
}
export interface NodeMetrics {
    packetsIn: number;
    packetsOut: number;
    packetsDropped: number;
    packetsErrored: number;
    averageLatency: number;
    lastProcessedAt?: number;
}
export type GraphEventType = 'graph:started' | 'graph:stopped' | 'graph:error' | 'node:started' | 'node:stopped' | 'node:error' | 'packet:processed' | 'packet:dropped' | 'packet:error';
export interface GraphEvent {
    type: GraphEventType;
    timestamp: number;
    graphId: string;
    nodeId?: string;
    packetId?: string;
    data?: any;
    error?: Error;
}
export interface GraphSubscription {
    id: string;
    nodeId: string;
    filter?: string;
    callback: (packet: DataPacket) => void | Promise<void>;
}
export interface GraphState {
    graphId: string;
    definition: GraphDefinition;
    context: GraphContext;
    status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
    nodeStates: Record<string, NodeState>;
    createdAt: number;
    updatedAt: number;
}
export interface NodeState {
    nodeId: string;
    status: NodeStatus;
    buffer: DataPacket[];
    lastProcessedPacketId?: string;
    error?: Error;
    metrics: NodeMetrics;
}
//# sourceMappingURL=types.d.ts.map