/**
 * Streamflow - Real-time graph-based stream processing for Cloudflare Workers
 *
 * @packageDocumentation
 */

// Core exports
export { GraphRunner as Graph } from '@/core/GraphRunner';
export * from '@/core/types';

// Node exports
export { BaseNode } from '@/nodes/BaseNode';
export { SourceNode } from '@/nodes/SourceNode';
export { TransformNode, TransformFunctions } from '@/nodes/TransformNode';
export { FilterNode, FilterFunctions } from '@/nodes/FilterNode';
export { AggregateNode, AggregateFunctions } from '@/nodes/AggregateNode';
export { SinkNode, SinkConfigurations } from '@/nodes/SinkNode';

// Template exports
export * as templates from '@/templates';

// Utility exports
export * as utils from '@/utils';

// Builder API for easier graph construction
export { GraphBuilder } from '@/core/GraphBuilder';
export { NodeBuilder as nodes } from '@/core/NodeBuilder';

// Version
export const VERSION = '0.1.0';
