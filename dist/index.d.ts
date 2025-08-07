/**
 * Streamflow - Real-time graph-based stream processing for Cloudflare Workers
 *
 * @packageDocumentation
 */
export { GraphRunner as Graph } from '@/core/GraphRunner';
export * from '@/core/types';
export { BaseNode } from '@/nodes/BaseNode';
export { SourceNode } from '@/nodes/SourceNode';
export { TransformNode, TransformFunctions } from '@/nodes/TransformNode';
export { FilterNode, FilterFunctions } from '@/nodes/FilterNode';
export { AggregateNode, AggregateFunctions } from '@/nodes/AggregateNode';
export { SinkNode, SinkConfigurations } from '@/nodes/SinkNode';
export * as templates from '@/templates';
export * as utils from '@/utils';
export { GraphBuilder } from '@/core/GraphBuilder';
export { NodeBuilder as nodes } from '@/core/NodeBuilder';
export declare const VERSION = "0.1.0";
//# sourceMappingURL=index.d.ts.map