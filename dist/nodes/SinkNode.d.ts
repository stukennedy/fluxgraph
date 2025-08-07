import { BaseNode } from '@/nodes/BaseNode';
import { SinkNodeConfig, DataPacket } from '@/core/types';
/**
 * Sink node - outputs data to external systems
 */
export declare class SinkNode extends BaseNode<SinkNodeConfig> {
    private websocket?;
    private outputBuffer;
    private flushTimer?;
    protected onInitialize(): Promise<void>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
    protected processPacket(packet: DataPacket): Promise<DataPacket | null>;
    /**
     * Output data to the configured sink
     */
    private output;
    /**
     * Format data based on configuration
     */
    private formatData;
    /**
     * Connect to WebSocket sink
     */
    private connectWebSocket;
    /**
     * Output to WebSocket
     */
    private outputToWebSocket;
    /**
     * Output to HTTP endpoint
     */
    private outputToHttp;
    /**
     * Output to database
     */
    private outputToDatabase;
    /**
     * Output to console log
     */
    private outputToLog;
    /**
     * Flush buffered data
     */
    private flush;
    /**
     * Schedule periodic flush
     */
    private scheduleFlush;
}
/**
 * Pre-built sink configurations
 */
export declare class SinkConfigurations {
    /**
     * Console logger sink
     */
    static consoleLogger(name?: string): SinkNodeConfig;
    /**
     * WebSocket broadcaster
     */
    static websocketBroadcaster(url: string): SinkNodeConfig;
    /**
     * HTTP webhook
     */
    static httpWebhook(url: string, method?: string): SinkNodeConfig;
    /**
     * Database writer
     */
    static databaseWriter(table: string): SinkNodeConfig;
    /**
     * Multi-sink (outputs to multiple sinks)
     */
    static multiSink(configs: SinkNodeConfig[]): SinkNodeConfig[];
}
//# sourceMappingURL=SinkNode.d.ts.map