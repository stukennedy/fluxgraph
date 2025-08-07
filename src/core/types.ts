/**
 * Graph Runner Type Definitions
 * Defines the core types for the real-time streaming graph processing system
 */

// Node Types
export type NodeType = 'source' | 'transform' | 'filter' | 'aggregate' | 'sink' | 'merge' | 'split';

// Node Status
export type NodeStatus = 'idle' | 'running' | 'paused' | 'error' | 'completed';

// Data packet that flows through the graph
export interface DataPacket<T = any> {
  id: string;
  timestamp: number;
  data: T;
  metadata?: Record<string, any>;
  error?: Error;
}

// Node configuration base
export interface NodeConfig {
  id: string;
  type: NodeType;
  name: string;
  description?: string;
  retryPolicy?: RetryPolicy;
  timeout?: number; // milliseconds
  bufferSize?: number;
}

// Source node configuration
export interface SourceNodeConfig extends NodeConfig {
  type: 'source';
  sourceType: 'websocket' | 'http' | 'timer' | 'manual' | 'database';
  config: {
    url?: string;
    interval?: number; // for timer sources
    query?: string; // for database sources
    headers?: Record<string, string>; // for HTTP sources
  };
}

// Transform node configuration
export interface TransformNodeConfig extends NodeConfig {
  type: 'transform';
  transformFunction: string; // Function code as string or reference
  outputSchema?: any; // JSON schema for validation
}

// Filter node configuration
export interface FilterNodeConfig extends NodeConfig {
  type: 'filter';
  filterFunction: string; // Function code that returns boolean
}

// Aggregate node configuration
export interface AggregateNodeConfig extends NodeConfig {
  type: 'aggregate';
  windowType: 'time' | 'count' | 'session';
  windowSize: number; // seconds for time, count for count-based
  aggregateFunction: string; // Function to aggregate data
  emitStrategy: 'onComplete' | 'incremental';
}

// Sink node configuration
export interface SinkNodeConfig extends NodeConfig {
  type: 'sink';
  sinkType: 'websocket' | 'http' | 'database' | 'log' | 'custom';
  config: {
    url?: string;
    table?: string; // for database sinks
    method?: string; // for HTTP sinks
    format?: 'json' | 'text' | 'binary';
  };
}

// Merge node configuration
export interface MergeNodeConfig extends NodeConfig {
  type: 'merge';
  mergeStrategy: 'concat' | 'zip' | 'combine' | 'custom';
  mergeFunction?: string; // For custom merge strategies
}

// Split node configuration
export interface SplitNodeConfig extends NodeConfig {
  type: 'split';
  splitFunction: string; // Function that returns array of outputs
}

// Union type for all node configs
export type AnyNodeConfig = SourceNodeConfig | TransformNodeConfig | FilterNodeConfig | AggregateNodeConfig | SinkNodeConfig | MergeNodeConfig | SplitNodeConfig;

// Edge connecting nodes
export interface GraphEdge {
  id: string;
  from: string; // Node ID
  to: string; // Node ID
  condition?: string; // Optional condition for conditional routing
  transform?: string; // Optional inline transformation
}

// Complete graph definition
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

// Graph configuration
export interface GraphConfig {
  maxConcurrency?: number;
  defaultTimeout?: number;
  bufferStrategy?: 'drop' | 'block' | 'sliding';
  errorStrategy?: 'stop' | 'continue' | 'retry';
  checkpointInterval?: number; // seconds
}

// Retry policy
export interface RetryPolicy {
  maxRetries: number;
  backoffMultiplier: number;
  initialDelay: number; // milliseconds
  maxDelay: number; // milliseconds
}

// Graph execution context
export interface GraphContext {
  graphId: string;
  executionId: string;
  startTime: number;
  variables: Record<string, any>;
  state: Record<string, any>;
  metrics: GraphMetrics;
}

// Graph metrics
export interface GraphMetrics {
  packetsProcessed: number;
  packetsDropped: number;
  packetsErrored: number;
  totalLatency: number;
  nodeMetrics: Record<string, NodeMetrics>;
}

// Per-node metrics
export interface NodeMetrics {
  packetsIn: number;
  packetsOut: number;
  packetsDropped: number;
  packetsErrored: number;
  averageLatency: number;
  lastProcessedAt?: number;
}

// Event types for graph lifecycle
export type GraphEventType =
  | 'graph:started'
  | 'graph:stopped'
  | 'graph:error'
  | 'node:started'
  | 'node:stopped'
  | 'node:error'
  | 'packet:processed'
  | 'packet:dropped'
  | 'packet:error';

// Graph event
export interface GraphEvent {
  type: GraphEventType;
  timestamp: number;
  graphId: string;
  nodeId?: string;
  packetId?: string;
  data?: any;
  error?: Error;
}

// Subscription for receiving graph outputs
export interface GraphSubscription {
  id: string;
  nodeId: string; // Subscribe to specific node output
  filter?: string; // Optional filter expression
  callback: (packet: DataPacket) => void | Promise<void>;
}

// Graph state for persistence
export interface GraphState {
  graphId: string;
  definition: GraphDefinition;
  context: GraphContext;
  status: 'idle' | 'running' | 'paused' | 'stopped' | 'error';
  nodeStates: Record<string, NodeState>;
  createdAt: number;
  updatedAt: number;
}

// Individual node state
export interface NodeState {
  nodeId: string;
  status: NodeStatus;
  buffer: DataPacket[];
  lastProcessedPacketId?: string;
  error?: Error;
  metrics: NodeMetrics;
}
