import { BaseNode } from './BaseNode';
import { SourceNodeConfig, DataPacket } from '../core/types';

/**
 * Source node - generates data packets from various sources
 */
export class SourceNode extends BaseNode<SourceNodeConfig> {
  private intervalId?: number;
  private websocket?: WebSocket;
  private eventSource?: EventSource;
  private packetCounter = 0;

  protected async onInitialize(): Promise<void> {
    // Source-specific initialization
  }

  protected async onStart(): Promise<void> {
    switch (this.config.sourceType) {
      case 'timer':
        this.startTimer();
        break;
      case 'websocket':
        await this.connectWebSocket();
        break;
      case 'http':
        await this.startHttpPolling();
        break;
      case 'database':
        await this.startDatabasePolling();
        break;
      case 'manual':
        // Manual sources are triggered externally
        break;
    }
  }

  protected async onPause(): Promise<void> {
    this.stopAllSources();
  }

  protected async onResume(): Promise<void> {
    await this.onStart();
  }

  protected async onStop(): Promise<void> {
    this.stopAllSources();
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    // Source nodes don't process incoming packets, they generate them
    return null;
  }

  /**
   * Inject data manually (for manual sources)
   */
  async inject(data: any, metadata?: Record<string, any>): Promise<void> {
    if (this.config.sourceType !== 'manual') {
      throw new Error('inject() can only be called on manual source nodes');
    }

    const packet = this.createPacket(data, metadata);
    await this.emit(packet);
  }

  /**
   * Start timer-based source
   */
  private startTimer(): void {
    const interval = this.config.config.interval || 1000;
    
    this.intervalId = setInterval(async () => {
      const packet = this.createPacket({
        timestamp: Date.now(),
        source: 'timer'
      });
      
      await this.emit(packet);
    }, interval) as unknown as number;
  }

  /**
   * Connect to WebSocket source
   */
  private async connectWebSocket(): Promise<void> {
    const url = this.config.config.url;
    if (!url) throw new Error('WebSocket URL is required');

    this.websocket = new WebSocket(url);

    this.websocket.onopen = () => {
      console.log(`WebSocket connected: ${url}`);
    };

    this.websocket.onmessage = async (event) => {
      try {
        const data = typeof event.data === 'string' 
          ? JSON.parse(event.data) 
          : event.data;
        
        const packet = this.createPacket(data, {
          source: 'websocket',
          url
        });
        
        await this.emit(packet);
      } catch (error) {
        await this.handleError(error as Error);
      }
    };

    this.websocket.onerror = (error) => {
      this.handleError(new Error(`WebSocket error: ${error}`));
    };

    this.websocket.onclose = () => {
      console.log(`WebSocket disconnected: ${url}`);
      
      // Attempt to reconnect if still running
      if (this.status === 'running') {
        setTimeout(() => this.connectWebSocket(), 5000);
      }
    };
  }

  /**
   * Start HTTP polling
   */
  private async startHttpPolling(): Promise<void> {
    const url = this.config.config.url;
    const interval = this.config.config.interval || 5000;
    const headers = this.config.config.headers || {};

    if (!url) throw new Error('HTTP URL is required');

    const poll = async () => {
      if (this.status !== 'running') return;

      try {
        const response = await fetch(url, { headers });
        const data = await response.json();
        
        const packet = this.createPacket(data, {
          source: 'http',
          url,
          statusCode: response.status
        });
        
        await this.emit(packet);
      } catch (error) {
        await this.handleError(error as Error);
      }

      // Schedule next poll
      if (this.status === 'running') {
        this.intervalId = setTimeout(poll, interval) as unknown as number;
      }
    };

    // Start polling
    poll();
  }

  /**
   * Start database polling
   */
  private async startDatabasePolling(): Promise<void> {
    const query = this.config.config.query;
    const interval = this.config.config.interval || 10000;

    if (!query) throw new Error('Database query is required');

    const poll = async () => {
      if (this.status !== 'running') return;

      try {
        // This would need to be connected to your database service
        // For now, we'll emit a placeholder
        const packet = this.createPacket({
          query,
          timestamp: Date.now(),
          message: 'Database polling not yet implemented'
        }, {
          source: 'database'
        });
        
        await this.emit(packet);
      } catch (error) {
        await this.handleError(error as Error);
      }

      // Schedule next poll
      if (this.status === 'running') {
        this.intervalId = setTimeout(poll, interval) as unknown as number;
      }
    };

    // Start polling
    poll();
  }

  /**
   * Stop all active sources
   */
  private stopAllSources(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      clearTimeout(this.intervalId);
      this.intervalId = undefined;
    }

    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = undefined;
    }
  }

  /**
   * Create a data packet
   */
  private createPacket(data: any, metadata?: Record<string, any>): DataPacket {
    return {
      id: `${this.config.id}-${++this.packetCounter}`,
      timestamp: Date.now(),
      data,
      metadata: {
        ...metadata,
        nodeId: this.config.id,
        nodeType: 'source'
      }
    };
  }
}