import { SourceNodeConfig, TransformNodeConfig, FilterNodeConfig, AggregateNodeConfig, SinkNodeConfig } from './types';
/**
 * Fluent builder API for creating nodes
 */
export declare class NodeBuilder {
    private static nodeCounter;
    /**
     * Create a source node
     */
    static source(id: string, config: {
        type: 'websocket' | 'http' | 'timer' | 'manual' | 'database';
        url?: string;
        interval?: number;
        query?: string;
        headers?: Record<string, string>;
        name?: string;
        description?: string;
    }): SourceNodeConfig;
    /**
     * Create a WebSocket source
     */
    static websocket(id: string, url: string): SourceNodeConfig;
    /**
     * Create an HTTP polling source
     */
    static http(id: string, url: string, interval?: number): SourceNodeConfig;
    /**
     * Create a timer source
     */
    static timer(id: string, interval: number): SourceNodeConfig;
    /**
     * Create a manual source
     */
    static manual(id: string): SourceNodeConfig;
    /**
     * Create a transform node
     */
    static transform(id: string, config: {
        function: ((data: any, metadata?: any) => any) | string;
        name?: string;
        description?: string;
        outputSchema?: any;
    }): TransformNodeConfig;
    /**
     * Create a filter node
     */
    static filter(id: string, config: {
        function: ((data: any, metadata?: any) => boolean) | string;
        name?: string;
        description?: string;
    }): FilterNodeConfig;
    /**
     * Create an aggregate node
     */
    static aggregate(id: string, config: {
        window: 'time' | 'count' | 'session';
        size?: number;
        duration?: number;
        function: ((packets: any[]) => any) | string;
        emit?: 'onComplete' | 'incremental';
        name?: string;
        description?: string;
    }): AggregateNodeConfig;
    /**
     * Create a sink node
     */
    static sink(id: string, config: {
        type: 'websocket' | 'http' | 'database' | 'log' | 'custom';
        url?: string;
        table?: string;
        method?: string;
        format?: 'json' | 'text' | 'binary';
        name?: string;
        description?: string;
    }): SinkNodeConfig;
    /**
     * Create a log sink
     */
    static log(id: string): SinkNodeConfig;
    /**
     * Create an HTTP webhook sink
     */
    static webhook(id: string, url: string, method?: string): SinkNodeConfig;
    /**
     * Generate unique node ID
     */
    static generateId(prefix?: string): string;
}
export declare const nodes: typeof NodeBuilder;
//# sourceMappingURL=NodeBuilder.d.ts.map