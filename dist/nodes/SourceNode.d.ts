import { BaseNode } from './BaseNode';
import { SourceNodeConfig, DataPacket } from '../core/types';
/**
 * Source node - generates data packets from various sources
 */
export declare class SourceNode extends BaseNode<SourceNodeConfig> {
    private intervalId?;
    private websocket?;
    private eventSource?;
    private packetCounter;
    protected onInitialize(): Promise<void>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
    protected processPacket(packet: DataPacket): Promise<DataPacket | null>;
    /**
     * Inject data manually (for manual sources)
     */
    inject(data: any, metadata?: Record<string, any>): Promise<void>;
    /**
     * Start timer-based source
     */
    private startTimer;
    /**
     * Connect to WebSocket source
     */
    private connectWebSocket;
    /**
     * Start HTTP polling
     */
    private startHttpPolling;
    /**
     * Start database polling
     */
    private startDatabasePolling;
    /**
     * Stop all active sources
     */
    private stopAllSources;
    /**
     * Create a data packet
     */
    private createPacket;
}
//# sourceMappingURL=SourceNode.d.ts.map