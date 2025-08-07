import { BaseNode } from './BaseNode';
import { AggregateNodeConfig, DataPacket } from '../core/types';

/**
 * Aggregate node - aggregates data packets over windows
 */
export class AggregateNode extends BaseNode<AggregateNodeConfig> {
  private aggregateFn?: (packets: DataPacket[]) => any | Promise<any>;
  private windowStartTime?: number;
  private sessionId?: string;

  protected async onInitialize(): Promise<void> {
    // Compile the aggregate function
    try {
      this.aggregateFn = new Function('packets', this.config.aggregateFunction) as any;
    } catch (error) {
      throw new Error(`Failed to compile aggregate function: ${error}`);
    }
  }

  protected async onStart(): Promise<void> {
    this.windowStartTime = Date.now();
    
    // Start window timer if time-based
    if (this.config.windowType === 'time') {
      this.scheduleWindowClose();
    }
  }

  protected async onPause(): Promise<void> {
    // Emit partial aggregation if incremental
    if (this.config.emitStrategy === 'incremental' && this.buffer.length > 0) {
      await this.processBuffer();
    }
  }

  protected async onResume(): Promise<void> {
    this.windowStartTime = Date.now();
    
    if (this.config.windowType === 'time') {
      this.scheduleWindowClose();
    }
  }

  protected async onStop(): Promise<void> {
    // Emit final aggregation
    if (this.buffer.length > 0) {
      await this.processBuffer();
    }
  }

  protected requiresBuffering(): boolean {
    return true;
  }

  protected isBufferReady(): boolean {
    switch (this.config.windowType) {
      case 'count':
        return this.buffer.length >= this.config.windowSize;
      
      case 'time':
        // Time windows are handled by timer
        return false;
      
      case 'session':
        // Session windows need explicit closing
        return false;
      
      default:
        return false;
    }
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    // Aggregation nodes don't process individual packets
    // They buffer them and process windows
    return null;
  }

  protected async processBuffer(): Promise<void> {
    if (!this.aggregateFn || this.buffer.length === 0) {
      return;
    }

    try {
      // Apply the aggregation function
      const aggregatedData = await Promise.resolve(
        this.aggregateFn(this.buffer)
      );

      // Create aggregated packet
      const packet: DataPacket = {
        id: `${this.config.id}-agg-${Date.now()}`,
        timestamp: Date.now(),
        data: aggregatedData,
        metadata: {
          nodeId: this.config.id,
          nodeType: 'aggregate',
          windowType: this.config.windowType,
          windowSize: this.config.windowSize,
          packetCount: this.buffer.length,
          windowStart: this.windowStartTime,
          windowEnd: Date.now()
        }
      };

      // Emit the aggregated packet
      await this.emit(packet);

      // Clear buffer after emission
      this.clearBuffer();
      
      // Reset window start time
      this.windowStartTime = Date.now();

      // Schedule next window if time-based
      if (this.config.windowType === 'time' && this.status === 'running') {
        this.scheduleWindowClose();
      }
    } catch (error) {
      await this.handleError(error as Error);
    }
  }

  /**
   * Schedule window close for time-based windows
   */
  private scheduleWindowClose(): void {
    const windowMs = this.config.windowSize * 1000; // Convert seconds to ms
    
    setTimeout(async () => {
      if (this.status === 'running') {
        await this.processBuffer();
      }
    }, windowMs);
  }

  /**
   * Close current session window
   */
  async closeSession(): Promise<void> {
    if (this.config.windowType !== 'session') {
      throw new Error('closeSession can only be called on session windows');
    }
    
    await this.processBuffer();
    this.sessionId = undefined;
  }

  /**
   * Start new session window
   */
  startSession(sessionId: string): void {
    if (this.config.windowType !== 'session') {
      throw new Error('startSession can only be called on session windows');
    }
    
    // Close previous session if exists
    if (this.sessionId && this.buffer.length > 0) {
      this.processBuffer();
    }
    
    this.sessionId = sessionId;
    this.windowStartTime = Date.now();
  }
}

/**
 * Pre-built aggregation functions
 */
export class AggregateFunctions {
  /**
   * Count packets
   */
  static count(): string {
    return `
      return {
        count: packets.length,
        firstPacket: packets[0]?.timestamp,
        lastPacket: packets[packets.length - 1]?.timestamp
      };
    `;
  }

  /**
   * Sum numeric field
   */
  static sum(field: string): string {
    return `
      const sum = packets.reduce((acc, packet) => {
        return acc + (packet.data.${field} || 0);
      }, 0);
      
      return {
        sum,
        count: packets.length,
        field: '${field}'
      };
    `;
  }

  /**
   * Calculate average
   */
  static average(field: string): string {
    return `
      const sum = packets.reduce((acc, packet) => {
        return acc + (packet.data.${field} || 0);
      }, 0);
      
      return {
        average: sum / packets.length,
        sum,
        count: packets.length,
        field: '${field}'
      };
    `;
  }

  /**
   * Find min/max
   */
  static minMax(field: string): string {
    return `
      let min = Infinity;
      let max = -Infinity;
      
      for (const packet of packets) {
        const value = packet.data.${field};
        if (value < min) min = value;
        if (value > max) max = value;
      }
      
      return {
        min,
        max,
        count: packets.length,
        field: '${field}'
      };
    `;
  }

  /**
   * Group by field
   */
  static groupBy(field: string): string {
    return `
      const groups = {};
      
      for (const packet of packets) {
        const key = packet.data.${field};
        if (!groups[key]) {
          groups[key] = [];
        }
        groups[key].push(packet.data);
      }
      
      return {
        groups,
        groupCount: Object.keys(groups).length,
        totalCount: packets.length
      };
    `;
  }

  /**
   * Calculate statistics
   */
  static statistics(field: string): string {
    return `
      const values = packets.map(p => p.data.${field} || 0);
      const n = values.length;
      
      if (n === 0) return { count: 0 };
      
      // Calculate mean
      const sum = values.reduce((a, b) => a + b, 0);
      const mean = sum / n;
      
      // Calculate variance and std dev
      const variance = values.reduce((acc, val) => {
        return acc + Math.pow(val - mean, 2);
      }, 0) / n;
      const stdDev = Math.sqrt(variance);
      
      // Calculate median
      const sorted = [...values].sort((a, b) => a - b);
      const median = n % 2 === 0
        ? (sorted[n/2 - 1] + sorted[n/2]) / 2
        : sorted[Math.floor(n/2)];
      
      return {
        count: n,
        sum,
        mean,
        median,
        variance,
        stdDev,
        min: Math.min(...values),
        max: Math.max(...values)
      };
    `;
  }

  /**
   * Collect all values
   */
  static collect(): string {
    return `
      return {
        packets: packets.map(p => p.data),
        count: packets.length,
        timestamps: packets.map(p => p.timestamp)
      };
    `;
  }

  /**
   * Transaction summary
   */
  static transactionSummary(): string {
    return `
      const transactions = packets.map(p => p.data);
      
      const totalIncome = transactions
        .filter(t => t.amount > 0)
        .reduce((sum, t) => sum + t.amount, 0);
      
      const totalExpenses = transactions
        .filter(t => t.amount < 0)
        .reduce((sum, t) => sum + Math.abs(t.amount), 0);
      
      const categories = {};
      transactions.forEach(t => {
        const cat = t.category || 'uncategorized';
        if (!categories[cat]) {
          categories[cat] = { count: 0, total: 0 };
        }
        categories[cat].count++;
        categories[cat].total += Math.abs(t.amount);
      });
      
      return {
        transactionCount: transactions.length,
        totalIncome,
        totalExpenses,
        netFlow: totalIncome - totalExpenses,
        categories,
        periodStart: packets[0]?.timestamp,
        periodEnd: packets[packets.length - 1]?.timestamp
      };
    `;
  }
}