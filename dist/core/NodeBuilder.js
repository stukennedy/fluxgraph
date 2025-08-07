/**
 * Fluent builder API for creating nodes
 */
export class NodeBuilder {
    static nodeCounter = 0;
    /**
     * Create a source node
     */
    static source(id, config) {
        return {
            id,
            type: 'source',
            name: config.name || `Source ${id}`,
            description: config.description,
            sourceType: config.type,
            config: {
                url: config.url,
                interval: config.interval,
                query: config.query,
                headers: config.headers
            }
        };
    }
    /**
     * Create a WebSocket source
     */
    static websocket(id, url) {
        return NodeBuilder.source(id, {
            type: 'websocket',
            url,
            name: `WebSocket ${id}`
        });
    }
    /**
     * Create an HTTP polling source
     */
    static http(id, url, interval = 5000) {
        return NodeBuilder.source(id, {
            type: 'http',
            url,
            interval,
            name: `HTTP ${id}`
        });
    }
    /**
     * Create a timer source
     */
    static timer(id, interval) {
        return NodeBuilder.source(id, {
            type: 'timer',
            interval,
            name: `Timer ${id}`
        });
    }
    /**
     * Create a manual source
     */
    static manual(id) {
        return NodeBuilder.source(id, {
            type: 'manual',
            name: `Manual ${id}`
        });
    }
    /**
     * Create a transform node
     */
    static transform(id, config) {
        const funcString = typeof config.function === 'function'
            ? config.function.toString().replace(/^[^{]*{|}[^}]*$/g, '')
            : config.function;
        return {
            id,
            type: 'transform',
            name: config.name || `Transform ${id}`,
            description: config.description,
            transformFunction: funcString,
            outputSchema: config.outputSchema
        };
    }
    /**
     * Create a filter node
     */
    static filter(id, config) {
        const funcString = typeof config.function === 'function'
            ? config.function.toString().replace(/^[^{]*{|}[^}]*$/g, '')
            : config.function;
        return {
            id,
            type: 'filter',
            name: config.name || `Filter ${id}`,
            description: config.description,
            filterFunction: funcString
        };
    }
    /**
     * Create an aggregate node
     */
    static aggregate(id, config) {
        const funcString = typeof config.function === 'function'
            ? config.function.toString().replace(/^[^{]*{|}[^}]*$/g, '')
            : config.function;
        return {
            id,
            type: 'aggregate',
            name: config.name || `Aggregate ${id}`,
            description: config.description,
            windowType: config.window,
            windowSize: config.window === 'time' ? config.duration : config.size,
            aggregateFunction: funcString,
            emitStrategy: config.emit || 'onComplete'
        };
    }
    /**
     * Create a sink node
     */
    static sink(id, config) {
        return {
            id,
            type: 'sink',
            name: config.name || `Sink ${id}`,
            description: config.description,
            sinkType: config.type,
            config: {
                url: config.url,
                table: config.table,
                method: config.method,
                format: config.format || 'json'
            }
        };
    }
    /**
     * Create a log sink
     */
    static log(id) {
        return NodeBuilder.sink(id, {
            type: 'log',
            name: `Logger ${id}`
        });
    }
    /**
     * Create an HTTP webhook sink
     */
    static webhook(id, url, method = 'POST') {
        return NodeBuilder.sink(id, {
            type: 'http',
            url,
            method,
            name: `Webhook ${id}`
        });
    }
    /**
     * Generate unique node ID
     */
    static generateId(prefix = 'node') {
        return `${prefix}-${++NodeBuilder.nodeCounter}-${Date.now().toString(36)}`;
    }
}
// Export as singleton for convenience
export const nodes = NodeBuilder;
