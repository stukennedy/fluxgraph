import { BaseNode } from '@/nodes/BaseNode';
/**
 * Source node - generates data packets from various sources
 */
export class SourceNode extends BaseNode {
    intervalId;
    websocket;
    eventSource;
    packetCounter = 0;
    async onInitialize() {
        // Source-specific initialization
    }
    async onStart() {
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
    async onPause() {
        this.stopAllSources();
    }
    async onResume() {
        await this.onStart();
    }
    async onStop() {
        this.stopAllSources();
    }
    async processPacket(packet) {
        // Source nodes don't process incoming packets, they generate them
        return null;
    }
    /**
     * Inject data manually (for manual sources)
     */
    async inject(data, metadata) {
        if (this.config.sourceType !== 'manual') {
            throw new Error('inject() can only be called on manual source nodes');
        }
        const packet = this.createPacket(data, metadata);
        await this.emit(packet);
    }
    /**
     * Start timer-based source
     */
    startTimer() {
        const interval = this.config.config.interval || 1000;
        this.intervalId = setInterval(async () => {
            const packet = this.createPacket({
                timestamp: Date.now(),
                source: 'timer',
            });
            await this.emit(packet);
        }, interval);
    }
    /**
     * Connect to WebSocket source
     */
    async connectWebSocket() {
        const url = this.config.config.url;
        if (!url)
            throw new Error('WebSocket URL is required');
        this.websocket = new WebSocket(url);
        this.websocket.onopen = () => {
            console.log(`WebSocket connected: ${url}`);
        };
        this.websocket.onmessage = async (event) => {
            try {
                const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
                const packet = this.createPacket(data, {
                    source: 'websocket',
                    url,
                });
                await this.emit(packet);
            }
            catch (error) {
                await this.handleError(error);
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
    async startHttpPolling() {
        const url = this.config.config.url;
        const interval = this.config.config.interval || 5000;
        const headers = this.config.config.headers || {};
        if (!url)
            throw new Error('HTTP URL is required');
        const poll = async () => {
            if (this.status !== 'running')
                return;
            try {
                const response = await fetch(url, { headers });
                const data = await response.json();
                const packet = this.createPacket(data, {
                    source: 'http',
                    url,
                    statusCode: response.status,
                });
                await this.emit(packet);
            }
            catch (error) {
                await this.handleError(error);
            }
            // Schedule next poll
            if (this.status === 'running') {
                this.intervalId = setTimeout(poll, interval);
            }
        };
        // Start polling
        poll();
    }
    /**
     * Start database polling
     */
    async startDatabasePolling() {
        const query = this.config.config.query;
        const interval = this.config.config.interval || 10000;
        if (!query)
            throw new Error('Database query is required');
        const poll = async () => {
            if (this.status !== 'running')
                return;
            try {
                // This would need to be connected to your database service
                // For now, we'll emit a placeholder
                const packet = this.createPacket({
                    query,
                    timestamp: Date.now(),
                    message: 'Database polling not yet implemented',
                }, {
                    source: 'database',
                });
                await this.emit(packet);
            }
            catch (error) {
                await this.handleError(error);
            }
            // Schedule next poll
            if (this.status === 'running') {
                this.intervalId = setTimeout(poll, interval);
            }
        };
        // Start polling
        poll();
    }
    /**
     * Stop all active sources
     */
    stopAllSources() {
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
    createPacket(data, metadata) {
        return {
            id: `${this.config.id}-${++this.packetCounter}`,
            timestamp: Date.now(),
            data,
            metadata: {
                ...metadata,
                nodeId: this.config.id,
                nodeType: 'source',
            },
        };
    }
}
