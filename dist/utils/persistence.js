/**
 * Durable Object storage adapter
 */
export class DurableObjectStorageAdapter {
    storage;
    constructor(storage) {
        this.storage = storage;
    } // Using any for DurableObjectStorage type
    async save(key, value) {
        await this.storage.put(key, value);
    }
    async load(key) {
        return await this.storage.get(key);
    }
    async delete(key) {
        await this.storage.delete(key);
    }
    async list(prefix) {
        const keys = [];
        const options = prefix ? { prefix } : undefined;
        const list = await this.storage.list(options);
        for await (const key of list.keys()) {
            keys.push(key);
        }
        return keys;
    }
}
/**
 * Save graph state
 */
export async function saveGraphState(storage, state) {
    const key = `graph:${state.graphId}:state`;
    await storage.save(key, state);
    // Save checkpoint
    const checkpointKey = `graph:${state.graphId}:checkpoint:${Date.now()}`;
    await storage.save(checkpointKey, state);
}
/**
 * Load graph state
 */
export async function loadGraphState(storage, graphId) {
    const key = `graph:${graphId}:state`;
    return await storage.load(key);
}
/**
 * Save graph definition
 */
export async function saveGraphDefinition(storage, definition) {
    const key = `graph:${definition.id}:definition`;
    await storage.save(key, definition);
}
/**
 * Load graph definition
 */
export async function loadGraphDefinition(storage, graphId) {
    const key = `graph:${graphId}:definition`;
    return await storage.load(key);
}
/**
 * List all graphs
 */
export async function listGraphs(storage) {
    const keys = await storage.list('graph:');
    const graphIds = new Set();
    for (const key of keys) {
        const match = key.match(/^graph:([^:]+):/);
        if (match) {
            graphIds.add(match[1]);
        }
    }
    return Array.from(graphIds);
}
/**
 * Delete graph and all related data
 */
export async function deleteGraph(storage, graphId) {
    const keys = await storage.list(`graph:${graphId}:`);
    for (const key of keys) {
        await storage.delete(key);
    }
}
/**
 * Create checkpoint
 */
export async function createCheckpoint(storage, graphId, state) {
    const checkpointId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
    const key = `graph:${graphId}:checkpoint:${checkpointId}`;
    await storage.save(key, state);
    return checkpointId;
}
/**
 * Restore from checkpoint
 */
export async function restoreCheckpoint(storage, graphId, checkpointId) {
    const key = `graph:${graphId}:checkpoint:${checkpointId}`;
    return await storage.load(key);
}
/**
 * List checkpoints
 */
export async function listCheckpoints(storage, graphId) {
    const keys = await storage.list(`graph:${graphId}:checkpoint:`);
    return keys.map(key => {
        const match = key.match(/checkpoint:(\d+)-(.+)$/);
        if (match) {
            return {
                id: `${match[1]}-${match[2]}`,
                timestamp: parseInt(match[1])
            };
        }
        return null;
    }).filter(Boolean);
}
