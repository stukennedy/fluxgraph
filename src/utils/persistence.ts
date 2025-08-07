import { GraphState, GraphDefinition } from '@/core/types';

/**
 * Persistence utilities for Durable Objects
 */

export interface PersistenceAdapter {
  save(key: string, value: any): Promise<void>;
  load(key: string): Promise<any | null>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
}

/**
 * Durable Object storage adapter
 */
export class DurableObjectStorageAdapter implements PersistenceAdapter {
  constructor(private storage: any) {} // Using any for DurableObjectStorage type

  async save(key: string, value: any): Promise<void> {
    await this.storage.put(key, value);
  }

  async load(key: string): Promise<any | null> {
    return await this.storage.get(key);
  }

  async delete(key: string): Promise<void> {
    await this.storage.delete(key);
  }

  async list(prefix?: string): Promise<string[]> {
    const keys: string[] = [];
    const options = prefix ? { prefix } : undefined;
    const list = await this.storage.list(options);
    for await (const key of list.keys()) {
      keys.push(key as string);
    }
    return keys;
  }
}

/**
 * Save graph state
 */
export async function saveGraphState(storage: PersistenceAdapter, state: GraphState): Promise<void> {
  const key = `graph:${state.graphId}:state`;
  await storage.save(key, state);

  // Save checkpoint
  const checkpointKey = `graph:${state.graphId}:checkpoint:${Date.now()}`;
  await storage.save(checkpointKey, state);
}

/**
 * Load graph state
 */
export async function loadGraphState(storage: PersistenceAdapter, graphId: string): Promise<GraphState | null> {
  const key = `graph:${graphId}:state`;
  return await storage.load(key);
}

/**
 * Save graph definition
 */
export async function saveGraphDefinition(storage: PersistenceAdapter, definition: GraphDefinition): Promise<void> {
  const key = `graph:${definition.id}:definition`;
  await storage.save(key, definition);
}

/**
 * Load graph definition
 */
export async function loadGraphDefinition(storage: PersistenceAdapter, graphId: string): Promise<GraphDefinition | null> {
  const key = `graph:${graphId}:definition`;
  return await storage.load(key);
}

/**
 * List all graphs
 */
export async function listGraphs(storage: PersistenceAdapter): Promise<string[]> {
  const keys = await storage.list('graph:');
  const graphIds = new Set<string>();

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
export async function deleteGraph(storage: PersistenceAdapter, graphId: string): Promise<void> {
  const keys = await storage.list(`graph:${graphId}:`);

  for (const key of keys) {
    await storage.delete(key);
  }
}

/**
 * Create checkpoint
 */
export async function createCheckpoint(storage: PersistenceAdapter, graphId: string, state: GraphState): Promise<string> {
  const checkpointId = `${Date.now()}-${Math.random().toString(36).substring(7)}`;
  const key = `graph:${graphId}:checkpoint:${checkpointId}`;
  await storage.save(key, state);
  return checkpointId;
}

/**
 * Restore from checkpoint
 */
export async function restoreCheckpoint(storage: PersistenceAdapter, graphId: string, checkpointId: string): Promise<GraphState | null> {
  const key = `graph:${graphId}:checkpoint:${checkpointId}`;
  return await storage.load(key);
}

/**
 * List checkpoints
 */
export async function listCheckpoints(storage: PersistenceAdapter, graphId: string): Promise<Array<{ id: string; timestamp: number }>> {
  const keys = await storage.list(`graph:${graphId}:checkpoint:`);

  return keys
    .map((key) => {
      const match = key.match(/checkpoint:(\d+)-(.+)$/);
      if (match) {
        return {
          id: `${match[1]}-${match[2]}`,
          timestamp: parseInt(match[1]),
        };
      }
      return null;
    })
    .filter(Boolean) as Array<{ id: string; timestamp: number }>;
}
