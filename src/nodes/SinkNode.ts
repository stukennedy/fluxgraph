import { BaseNode } from './BaseNode';
import { SinkNodeConfig, DataPacket } from '../core/types';

/**
 * Sink node - outputs data to external systems
 */
export class SinkNode extends BaseNode<SinkNodeConfig> {
  private websocket?: WebSocket;
  private outputBuffer: any[] = [];
  private flushTimer?: number;

  protected async onInitialize(): Promise<void> {
    // Initialize based on sink type
    if (this.config.sinkType === 'websocket' && this.config.config.url) {
      await this.connectWebSocket();
    }
  }

  protected async onStart(): Promise<void> {
    // Start flush timer if needed
    if (this.outputBuffer.length > 0) {
      this.scheduleFlush();
    }
  }

  protected async onPause(): Promise<void> {
    // Flush any pending data
    await this.flush();
  }

  protected async onResume(): Promise<void> {
    // Resume flushing
    this.scheduleFlush();
  }

  protected async onStop(): Promise<void> {
    // Final flush
    await this.flush();
    
    // Close connections
    if (this.websocket) {
      this.websocket.close();
      this.websocket = undefined;
    }
  }

  protected async processPacket(packet: DataPacket): Promise<DataPacket | null> {
    try {
      await this.output(packet);
      
      // Sinks don't pass data through by default
      // but we can return the packet for chaining
      return packet;
    } catch (error) {
      await this.handleError(error as Error, packet);
      return null;
    }
  }

  /**
   * Output data to the configured sink
   */
  private async output(packet: DataPacket): Promise<void> {
    const data = this.formatData(packet);

    switch (this.config.sinkType) {
      case 'websocket':
        await this.outputToWebSocket(data);
        break;
      
      case 'http':
        await this.outputToHttp(data);
        break;
      
      case 'database':
        await this.outputToDatabase(data);
        break;
      
      case 'log':
        this.outputToLog(data);
        break;
      
      case 'custom':
        // Custom sinks would be handled by subscribers
        break;
    }
  }

  /**
   * Format data based on configuration
   */
  private formatData(packet: DataPacket): any {
    const format = this.config.config.format || 'json';
    
    switch (format) {
      case 'json':
        return JSON.stringify(packet.data);
      
      case 'text':
        return String(packet.data);
      
      case 'binary':
        // Convert to binary format
        return packet.data;
      
      default:
        return packet.data;
    }
  }

  /**
   * Connect to WebSocket sink
   */
  private async connectWebSocket(): Promise<void> {
    const url = this.config.config.url;
    if (!url) return;

    this.websocket = new WebSocket(url);

    this.websocket.onopen = () => {
      console.log(`Sink WebSocket connected: ${url}`);
      
      // Flush any buffered data
      this.flush();
    };

    this.websocket.onerror = (error) => {
      console.error(`Sink WebSocket error: ${error}`);
      this.handleError(new Error(`WebSocket error: ${error}`));
    };

    this.websocket.onclose = () => {
      console.log(`Sink WebSocket disconnected: ${url}`);
      
      // Attempt to reconnect if still running
      if (this.status === 'running') {
        setTimeout(() => this.connectWebSocket(), 5000);
      }
    };
  }

  /**
   * Output to WebSocket
   */
  private async outputToWebSocket(data: any): Promise<void> {
    if (!this.websocket || this.websocket.readyState !== WebSocket.OPEN) {
      // Buffer data if not connected
      this.outputBuffer.push(data);
      return;
    }

    this.websocket.send(data);
  }

  /**
   * Output to HTTP endpoint
   */
  private async outputToHttp(data: any): Promise<void> {
    const url = this.config.config.url;
    const method = this.config.config.method || 'POST';
    
    if (!url) throw new Error('HTTP URL is required');

    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type': 'application/json'
      },
      body: typeof data === 'string' ? data : JSON.stringify(data)
    });

    if (!response.ok) {
      throw new Error(`HTTP sink failed: ${response.status} ${response.statusText}`);
    }
  }

  /**
   * Output to database
   */
  private async outputToDatabase(data: any): Promise<void> {
    // This would need to be connected to your database service
    // For now, we'll buffer the data
    this.outputBuffer.push({
      table: this.config.config.table,
      data,
      timestamp: Date.now()
    });
    
    // Schedule flush if buffer is getting full
    if (this.outputBuffer.length >= 100) {
      await this.flush();
    } else {
      this.scheduleFlush();
    }
  }

  /**
   * Output to console log
   */
  private outputToLog(data: any): void {
    console.log(`[${this.config.name}]:`, data);
  }

  /**
   * Flush buffered data
   */
  private async flush(): Promise<void> {
    if (this.outputBuffer.length === 0) return;

    // Process buffered data based on sink type
    if (this.config.sinkType === 'database') {
      // Batch insert to database
      console.log(`Flushing ${this.outputBuffer.length} records to database`);
      // TODO: Implement actual database batch insert
    } else if (this.config.sinkType === 'websocket' && this.websocket?.readyState === WebSocket.OPEN) {
      // Send buffered WebSocket data
      for (const data of this.outputBuffer) {
        this.websocket.send(data);
      }
    }

    this.outputBuffer = [];
  }

  /**
   * Schedule periodic flush
   */
  private scheduleFlush(): void {
    if (this.flushTimer) {
      clearTimeout(this.flushTimer);
    }

    this.flushTimer = setTimeout(() => {
      this.flush();
      
      // Schedule next flush if still running
      if (this.status === 'running') {
        this.scheduleFlush();
      }
    }, 5000) as unknown as number; // Flush every 5 seconds
  }
}

/**
 * Pre-built sink configurations
 */
export class SinkConfigurations {
  /**
   * Console logger sink
   */
  static consoleLogger(name: string = 'GraphOutput'): SinkNodeConfig {
    return {
      id: `sink-console-${Date.now()}`,
      type: 'sink',
      name,
      sinkType: 'log',
      config: {
        format: 'json'
      }
    };
  }

  /**
   * WebSocket broadcaster
   */
  static websocketBroadcaster(url: string): SinkNodeConfig {
    return {
      id: `sink-ws-${Date.now()}`,
      type: 'sink',
      name: 'WebSocket Broadcaster',
      sinkType: 'websocket',
      config: {
        url,
        format: 'json'
      }
    };
  }

  /**
   * HTTP webhook
   */
  static httpWebhook(url: string, method: string = 'POST'): SinkNodeConfig {
    return {
      id: `sink-http-${Date.now()}`,
      type: 'sink',
      name: 'HTTP Webhook',
      sinkType: 'http',
      config: {
        url,
        method,
        format: 'json'
      }
    };
  }

  /**
   * Database writer
   */
  static databaseWriter(table: string): SinkNodeConfig {
    return {
      id: `sink-db-${Date.now()}`,
      type: 'sink',
      name: 'Database Writer',
      sinkType: 'database',
      config: {
        table,
        format: 'json'
      }
    };
  }

  /**
   * Multi-sink (outputs to multiple sinks)
   */
  static multiSink(configs: SinkNodeConfig[]): SinkNodeConfig[] {
    return configs;
  }
}