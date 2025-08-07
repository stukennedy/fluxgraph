import { GraphRunner } from './GraphRunner';
/**
 * Fluent builder API for creating graphs
 */
export class GraphBuilder {
    definition = {
        nodes: [],
        edges: []
    };
    constructor(name) {
        this.definition.name = name;
        this.definition.id = `graph-${Date.now()}-${Math.random().toString(36).substring(7)}`;
        this.definition.version = '1.0.0';
    }
    /**
     * Set graph description
     */
    description(desc) {
        this.definition.description = desc;
        return this;
    }
    /**
     * Add a node to the graph
     */
    node(node) {
        this.definition.nodes.push(node);
        return this;
    }
    /**
     * Add multiple nodes
     */
    nodes(...nodes) {
        this.definition.nodes.push(...nodes);
        return this;
    }
    /**
     * Connect two nodes
     */
    connect(from, to, condition) {
        const edge = {
            id: `edge-${this.definition.edges.length + 1}`,
            from,
            to,
            condition
        };
        this.definition.edges.push(edge);
        return this;
    }
    /**
     * Create a linear flow through multiple nodes
     */
    flow(...nodeIds) {
        for (let i = 0; i < nodeIds.length - 1; i++) {
            this.connect(nodeIds[i], nodeIds[i + 1]);
        }
        return this;
    }
    /**
     * Create parallel branches from one node
     */
    branch(from, ...to) {
        for (const target of to) {
            this.connect(from, target);
        }
        return this;
    }
    /**
     * Merge multiple nodes into one
     */
    merge(from, to) {
        for (const source of from) {
            this.connect(source, to);
        }
        return this;
    }
    /**
     * Set graph configuration
     */
    config(config) {
        this.definition.config = config;
        return this;
    }
    /**
     * Set metadata
     */
    metadata(metadata) {
        this.definition.metadata = metadata;
        return this;
    }
    /**
     * Build the graph definition
     */
    build() {
        if (!this.definition.name) {
            throw new Error('Graph name is required');
        }
        if (!this.definition.nodes || this.definition.nodes.length === 0) {
            throw new Error('Graph must have at least one node');
        }
        return this.definition;
    }
    /**
     * Build and create a GraphRunner instance
     */
    async create() {
        const definition = this.build();
        const runner = new GraphRunner(definition);
        await runner.initialize();
        return runner;
    }
    /**
     * Static factory method
     */
    static create(name) {
        return new GraphBuilder(name);
    }
}
