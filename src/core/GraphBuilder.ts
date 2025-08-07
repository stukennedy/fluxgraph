import { GraphDefinition, AnyNodeConfig, GraphEdge, GraphConfig } from './types';
import { GraphRunner } from './GraphRunner';

/**
 * Fluent builder API for creating graphs
 */
export class GraphBuilder {
  private definition: Partial<GraphDefinition> = {
    nodes: [],
    edges: []
  };

  constructor(name: string) {
    this.definition.name = name;
    this.definition.id = `graph-${Date.now()}-${Math.random().toString(36).substring(7)}`;
    this.definition.version = '1.0.0';
  }

  /**
   * Set graph description
   */
  description(desc: string): this {
    this.definition.description = desc;
    return this;
  }

  /**
   * Add a node to the graph
   */
  node(node: AnyNodeConfig): this {
    this.definition.nodes!.push(node);
    return this;
  }

  /**
   * Add multiple nodes
   */
  nodes(...nodes: AnyNodeConfig[]): this {
    this.definition.nodes!.push(...nodes);
    return this;
  }

  /**
   * Connect two nodes
   */
  connect(from: string, to: string, condition?: string): this {
    const edge: GraphEdge = {
      id: `edge-${this.definition.edges!.length + 1}`,
      from,
      to,
      condition
    };
    this.definition.edges!.push(edge);
    return this;
  }

  /**
   * Create a linear flow through multiple nodes
   */
  flow(...nodeIds: string[]): this {
    for (let i = 0; i < nodeIds.length - 1; i++) {
      this.connect(nodeIds[i], nodeIds[i + 1]);
    }
    return this;
  }

  /**
   * Create parallel branches from one node
   */
  branch(from: string, ...to: string[]): this {
    for (const target of to) {
      this.connect(from, target);
    }
    return this;
  }

  /**
   * Merge multiple nodes into one
   */
  merge(from: string[], to: string): this {
    for (const source of from) {
      this.connect(source, to);
    }
    return this;
  }

  /**
   * Set graph configuration
   */
  config(config: GraphConfig): this {
    this.definition.config = config;
    return this;
  }

  /**
   * Set metadata
   */
  metadata(metadata: Record<string, any>): this {
    this.definition.metadata = metadata;
    return this;
  }

  /**
   * Build the graph definition
   */
  build(): GraphDefinition {
    if (!this.definition.name) {
      throw new Error('Graph name is required');
    }
    if (!this.definition.nodes || this.definition.nodes.length === 0) {
      throw new Error('Graph must have at least one node');
    }

    return this.definition as GraphDefinition;
  }

  /**
   * Build and create a GraphRunner instance
   */
  async create(): Promise<GraphRunner> {
    const definition = this.build();
    const runner = new GraphRunner(definition);
    await runner.initialize();
    return runner;
  }

  /**
   * Static factory method
   */
  static create(name: string): GraphBuilder {
    return new GraphBuilder(name);
  }
}