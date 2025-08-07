import { BaseNode } from '@/nodes/BaseNode';
import { DataPacket } from '@/core/types';

export interface MemoryEntry {
  id: string;
  timestamp: number;
  type: 'message' | 'fact' | 'summary' | 'embedding';
  content: any;
  metadata?: Record<string, any>;
  embedding?: number[];
  score?: number;
}

export interface MemoryNodeConfig {
  id: string;
  type: 'memory';
  name: string;
  description?: string;
  memoryType: 'conversation' | 'semantic' | 'summary' | 'hybrid';
  maxEntries?: number;
  ttl?: number; // Time to live in ms
  embeddingModel?: string;
  embeddingDimension?: number;
  summarizationInterval?: number;
  persistenceAdapter?: any;
}

/**
 * Memory Node for maintaining context and state
 */
export class MemoryNode extends BaseNode {
  protected config: MemoryNodeConfig;

  constructor(config: MemoryNodeConfig) {
    super(config as any);
    this.config = config;
  }
  private shortTermMemory: MemoryEntry[] = [];
  private longTermMemory: Map<string, MemoryEntry> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private summaries: MemoryEntry[] = [];
  private lastSummarization: number = Date.now();

  protected async onInitialize(): Promise<void> {
    // Load persisted memory if adapter provided
    if (this.config.persistenceAdapter) {
      await this.loadPersistedMemory();
    }
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    const { action, content, query, embedding, context } = packet.data;
    
    try {
      let result: any;
      
      switch (action || 'store') {
        case 'store':
          result = await this.storeMemory(content, packet.metadata);
          break;
          
        case 'retrieve':
          result = await this.retrieveMemory(query, context);
          break;
          
        case 'search':
          result = await this.semanticSearch(query, embedding, context?.topK);
          break;
          
        case 'summarize':
          result = await this.summarizeMemory();
          break;
          
        case 'clear':
          result = this.clearMemory(context?.type);
          break;
          
        case 'export':
          result = this.exportMemory();
          break;
          
        default:
          // Default to retrieving context for the conversation
          result = await this.getConversationContext(context);
      }
      
      return {
        ...packet,
        data: {
          ...packet.data,
          memory: result,
          memorySize: this.getMemoryStats(),
        },
        metadata: {
          ...packet.metadata,
          memoryNode: this.config.id,
          timestamp: Date.now(),
        },
      };
    } catch (error) {
      return {
        ...packet,
        error: error as Error,
        metadata: {
          ...packet.metadata,
          errorNode: this.config.id,
          errorAt: Date.now(),
        },
      };
    }
  }

  private async storeMemory(
    content: any,
    metadata?: Record<string, any>
  ): Promise<MemoryEntry> {
    const entry: MemoryEntry = {
      id: `mem-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      timestamp: Date.now(),
      type: metadata?.type || 'message',
      content,
      metadata,
    };
    
    // Generate embedding if semantic memory
    if (this.config.memoryType === 'semantic' || this.config.memoryType === 'hybrid') {
      entry.embedding = await this.generateEmbedding(content);
      this.embeddings.set(entry.id, entry.embedding);
    }
    
    // Add to short-term memory
    this.shortTermMemory.push(entry);
    
    // Manage memory size
    this.pruneMemory();
    
    // Check if summarization needed
    if (this.shouldSummarize()) {
      await this.summarizeMemory();
    }
    
    // Persist if adapter provided
    if (this.config.persistenceAdapter) {
      await this.persistMemory(entry);
    }
    
    return entry;
  }

  private async retrieveMemory(
    query?: string,
    context?: any
  ): Promise<MemoryEntry[]> {
    let entries: MemoryEntry[] = [];
    
    if (query) {
      // Search for specific content
      entries = this.shortTermMemory.filter(entry => 
        JSON.stringify(entry.content).toLowerCase().includes(query.toLowerCase())
      );
    } else {
      // Get recent entries
      const limit = context?.limit || 10;
      entries = this.shortTermMemory.slice(-limit);
    }
    
    // Filter by TTL if configured
    if (this.config.ttl) {
      const cutoff = Date.now() - this.config.ttl;
      entries = entries.filter(e => e.timestamp > cutoff);
    }
    
    return entries;
  }

  private async semanticSearch(
    query: string,
    queryEmbedding?: number[],
    topK: number = 5
  ): Promise<MemoryEntry[]> {
    if (!queryEmbedding) {
      queryEmbedding = await this.generateEmbedding(query);
    }
    
    // Calculate similarity scores
    const scores: Array<{ entry: MemoryEntry; score: number }> = [];
    
    for (const entry of this.shortTermMemory) {
      if (entry.embedding) {
        const score = this.cosineSimilarity(queryEmbedding, entry.embedding);
        scores.push({ entry, score });
      }
    }
    
    // Sort by score and return top K
    scores.sort((a, b) => b.score - a.score);
    
    return scores.slice(0, topK).map(s => ({
      ...s.entry,
      score: s.score,
    }));
  }

  private async summarizeMemory(): Promise<MemoryEntry> {
    // Group recent memories for summarization
    const recentMemories = this.shortTermMemory.slice(-20);
    
    // Create summary (in production, use LLM for this)
    const summary = {
      periodStart: recentMemories[0]?.timestamp,
      periodEnd: Date.now(),
      messageCount: recentMemories.length,
      topics: this.extractTopics(recentMemories),
      keyPoints: this.extractKeyPoints(recentMemories),
    };
    
    const summaryEntry: MemoryEntry = {
      id: `summary-${Date.now()}`,
      timestamp: Date.now(),
      type: 'summary',
      content: summary,
    };
    
    this.summaries.push(summaryEntry);
    this.lastSummarization = Date.now();
    
    // Move summarized entries to long-term memory
    for (const entry of recentMemories) {
      this.longTermMemory.set(entry.id, entry);
    }
    
    // Clear old entries from short-term
    this.shortTermMemory = this.shortTermMemory.slice(-5);
    
    return summaryEntry;
  }

  private async getConversationContext(options?: any): Promise<any> {
    const limit = options?.limit || 10;
    const includeSystem = options?.includeSystem !== false;
    
    // Get recent messages
    const recentMessages = this.shortTermMemory
      .filter(e => e.type === 'message')
      .slice(-limit)
      .map(e => e.content);
    
    // Get relevant facts
    const facts = this.shortTermMemory
      .filter(e => e.type === 'fact')
      .map(e => e.content);
    
    // Get recent summary if available
    const recentSummary = this.summaries[this.summaries.length - 1];
    
    return {
      messages: recentMessages,
      facts,
      summary: recentSummary?.content,
      totalMemories: this.shortTermMemory.length + this.longTermMemory.size,
    };
  }

  private clearMemory(type?: string): { cleared: number } {
    let cleared = 0;
    
    if (!type || type === 'short') {
      cleared += this.shortTermMemory.length;
      this.shortTermMemory = [];
    }
    
    if (!type || type === 'long') {
      cleared += this.longTermMemory.size;
      this.longTermMemory.clear();
    }
    
    if (!type || type === 'embeddings') {
      cleared += this.embeddings.size;
      this.embeddings.clear();
    }
    
    if (!type || type === 'summaries') {
      cleared += this.summaries.length;
      this.summaries = [];
    }
    
    return { cleared };
  }

  private exportMemory(): any {
    return {
      shortTerm: this.shortTermMemory,
      longTerm: Array.from(this.longTermMemory.values()),
      summaries: this.summaries,
      stats: this.getMemoryStats(),
    };
  }

  private pruneMemory(): void {
    const maxEntries = this.config.maxEntries || 1000;
    
    if (this.shortTermMemory.length > maxEntries) {
      // Move oldest to long-term
      const toMove = this.shortTermMemory.splice(0, this.shortTermMemory.length - maxEntries);
      for (const entry of toMove) {
        this.longTermMemory.set(entry.id, entry);
      }
    }
    
    // Prune by TTL if configured
    if (this.config.ttl) {
      const cutoff = Date.now() - this.config.ttl;
      this.shortTermMemory = this.shortTermMemory.filter(e => e.timestamp > cutoff);
      
      for (const [id, entry] of this.longTermMemory) {
        if (entry.timestamp < cutoff) {
          this.longTermMemory.delete(id);
          this.embeddings.delete(id);
        }
      }
    }
  }

  private shouldSummarize(): boolean {
    if (!this.config.summarizationInterval) return false;
    
    return (
      Date.now() - this.lastSummarization > this.config.summarizationInterval ||
      this.shortTermMemory.length > 50
    );
  }

  private async generateEmbedding(content: any): Promise<number[]> {
    // This would call your embedding API
    // For demo, returning random embedding
    const dimension = this.config.embeddingDimension || 384;
    return Array.from({ length: dimension }, () => Math.random());
  }

  private cosineSimilarity(a: number[], b: number[]): number {
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  private extractTopics(entries: MemoryEntry[]): string[] {
    // Simple topic extraction - in production use NLP
    const words = new Map<string, number>();
    
    for (const entry of entries) {
      const text = JSON.stringify(entry.content).toLowerCase();
      const tokens = text.match(/\b\w{4,}\b/g) || [];
      
      for (const token of tokens) {
        words.set(token, (words.get(token) || 0) + 1);
      }
    }
    
    // Return top 5 most frequent words as topics
    return Array.from(words.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([word]) => word);
  }

  private extractKeyPoints(entries: MemoryEntry[]): string[] {
    // Simple key point extraction
    return entries
      .filter(e => e.metadata?.important)
      .map(e => e.content)
      .slice(0, 3);
  }

  private getMemoryStats(): any {
    return {
      shortTermCount: this.shortTermMemory.length,
      longTermCount: this.longTermMemory.size,
      embeddingCount: this.embeddings.size,
      summaryCount: this.summaries.length,
      oldestMemory: this.shortTermMemory[0]?.timestamp,
      newestMemory: this.shortTermMemory[this.shortTermMemory.length - 1]?.timestamp,
    };
  }

  private async loadPersistedMemory(): Promise<void> {
    // Load from persistence adapter
    if (this.config.persistenceAdapter?.load) {
      const data = await this.config.persistenceAdapter.load(this.config.id);
      if (data) {
        this.shortTermMemory = data.shortTerm || [];
        this.longTermMemory = new Map(data.longTerm || []);
        this.summaries = data.summaries || [];
      }
    }
  }

  private async persistMemory(entry: MemoryEntry): Promise<void> {
    if (this.config.persistenceAdapter?.save) {
      await this.config.persistenceAdapter.save(this.config.id, entry);
    }
  }

  protected async onStart(): Promise<void> {}
  protected async onPause(): Promise<void> {}
  protected async onResume(): Promise<void> {}
  protected async onStop(): Promise<void> {
    // Persist all memory on stop
    if (this.config.persistenceAdapter?.saveAll) {
      await this.config.persistenceAdapter.saveAll(this.config.id, {
        shortTerm: this.shortTermMemory,
        longTerm: Array.from(this.longTermMemory.entries()),
        summaries: this.summaries,
      });
    }
  }
}