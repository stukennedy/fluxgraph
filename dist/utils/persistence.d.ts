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
export declare class DurableObjectStorageAdapter implements PersistenceAdapter {
    private storage;
    constructor(storage: any);
    save(key: string, value: any): Promise<void>;
    load(key: string): Promise<any | null>;
    delete(key: string): Promise<void>;
    list(prefix?: string): Promise<string[]>;
}
/**
 * Save graph state
 */
export declare function saveGraphState(storage: PersistenceAdapter, state: GraphState): Promise<void>;
/**
 * Load graph state
 */
export declare function loadGraphState(storage: PersistenceAdapter, graphId: string): Promise<GraphState | null>;
/**
 * Save graph definition
 */
export declare function saveGraphDefinition(storage: PersistenceAdapter, definition: GraphDefinition): Promise<void>;
/**
 * Load graph definition
 */
export declare function loadGraphDefinition(storage: PersistenceAdapter, graphId: string): Promise<GraphDefinition | null>;
/**
 * List all graphs
 */
export declare function listGraphs(storage: PersistenceAdapter): Promise<string[]>;
/**
 * Delete graph and all related data
 */
export declare function deleteGraph(storage: PersistenceAdapter, graphId: string): Promise<void>;
/**
 * Create checkpoint
 */
export declare function createCheckpoint(storage: PersistenceAdapter, graphId: string, state: GraphState): Promise<string>;
/**
 * Restore from checkpoint
 */
export declare function restoreCheckpoint(storage: PersistenceAdapter, graphId: string, checkpointId: string): Promise<GraphState | null>;
/**
 * List checkpoints
 */
export declare function listCheckpoints(storage: PersistenceAdapter, graphId: string): Promise<Array<{
    id: string;
    timestamp: number;
}>>;
//# sourceMappingURL=persistence.d.ts.map