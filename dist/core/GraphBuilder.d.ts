import { GraphDefinition, AnyNodeConfig, GraphConfig } from '@/core/types';
import { GraphRunner } from '@/core/GraphRunner';
/**
 * Fluent builder API for creating graphs
 */
export declare class GraphBuilder {
    private definition;
    constructor(name: string);
    /**
     * Set graph description
     */
    description(desc: string): this;
    /**
     * Add a node to the graph
     */
    node(node: AnyNodeConfig): this;
    /**
     * Add multiple nodes
     */
    nodes(...nodes: AnyNodeConfig[]): this;
    /**
     * Connect two nodes
     */
    connect(from: string, to: string, condition?: string): this;
    /**
     * Create a linear flow through multiple nodes
     */
    flow(...nodeIds: string[]): this;
    /**
     * Create parallel branches from one node
     */
    branch(from: string, ...to: string[]): this;
    /**
     * Merge multiple nodes into one
     */
    merge(from: string[], to: string): this;
    /**
     * Set graph configuration
     */
    config(config: GraphConfig): this;
    /**
     * Set metadata
     */
    metadata(metadata: Record<string, any>): this;
    /**
     * Build the graph definition
     */
    build(): GraphDefinition;
    /**
     * Build and create a GraphRunner instance
     */
    create(): Promise<GraphRunner>;
    /**
     * Static factory method
     */
    static create(name: string): GraphBuilder;
}
//# sourceMappingURL=GraphBuilder.d.ts.map