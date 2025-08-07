/**
 * WebSocket Server for Marble Diagram Visualization
 *
 * Creates a WebSocket server that streams RxJS observables
 * to ws-marbles client for visualization
 */

import { ObservableWebSocketBridge } from 'ws-marbles';
import { Observable } from 'rxjs';
import { DataPacket } from '../core/types';
import { js } from '.';

export interface MarbleServerConfig {
  port?: number;
  host?: string;
}

export interface StreamRegistration {
  streamId: string;
  name: string;
  description?: string;
  observable: Observable<any>;
  theme?: {
    valueColor?: string;
    errorColor?: string;
    completeColor?: string;
  };
}

/**
 * MarbleServer creates a WebSocket server for streaming observables
 * to ws-marbles client for visualization
 */
export class MarbleServer {
  private bridge: ObservableWebSocketBridge;
  private server: any;
  private config: MarbleServerConfig;
  private registeredStreams: Map<string, StreamRegistration> = new Map();

  constructor(config: MarbleServerConfig = {}) {
    this.config = {
      port: config.port || 3000,
      host: config.host || 'localhost',
    };

    this.bridge = new ObservableWebSocketBridge();
  }

  /**
   * Register an observable stream for visualization
   */
  registerStream(registration: StreamRegistration): void {
    this.registeredStreams.set(registration.streamId, registration);

    this.bridge.registerStream({
      streamId: registration.streamId,
      name: registration.name,
      description: registration.description,
      observable: registration.observable,
      theme: registration.theme,
    });
  }

  /**
   * Register a FluxGraph DataPacket stream
   */
  registerPacketStream(streamId: string, name: string, observable: Observable<DataPacket>, extractor?: (packet: DataPacket) => any): void {
    const extractValue =
      extractor ||
      ((p: DataPacket) => ({
        id: p.id,
        data: p.data,
        timestamp: p.timestamp,
      }));

    const mapped$ = new Observable((subscriber) => {
      const subscription = observable.subscribe({
        next: (packet) => subscriber.next(extractValue(packet)),
        error: (err) => subscriber.error(err),
        complete: () => subscriber.complete(),
      });

      return () => subscription.unsubscribe();
    });

    this.registerStream({
      streamId,
      name,
      description: `FluxGraph stream: ${name}`,
      observable: mapped$,
    });
  }

  /**
   * Start the WebSocket server using Bun
   */
  async startBunServer(): Promise<void> {
    this.server = Bun.serve({
      port: this.config.port,

      fetch(req, server) {
        const url = new URL(req.url);

        // Upgrade to WebSocket if requested
        if (req.headers.get('upgrade') === 'websocket') {
          const success = server.upgrade(req);
          if (success) {
            return undefined;
          }
        }

        // Serve the client JavaScript file
        if (url.pathname === '/ws-marbles-client.js') {
          try {
            const clientFile = Bun.file('public/ws-marbles-client.js');
            return new Response(clientFile, {
              headers: { 'Content-Type': 'application/javascript' },
            });
          } catch (error) {
            return new Response('Client file not found', { status: 404 });
          }
        }

        // Serve a simple HTML page with the marble diagram client
        return new Response(MarbleServer.getClientHTML(server.port), {
          headers: { 'Content-Type': 'text/html' },
        });
      },

      websocket: {
        open: (ws) => {
          console.log(`🎯 Marble client connected`);
          this.bridge.handleConnection({
            send: (data) => ws.send(data),
            close: () => ws.close(),
            readyState: ws.readyState as number,
          });
        },

        message: (ws, message) => {
          this.bridge.handleMessage(
            {
              send: (data) => ws.send(data),
              close: () => ws.close(),
              readyState: ws.readyState as number,
            },
            message.toString()
          );
        },

        close: (ws) => {
          console.log(`🔌 Marble client disconnected`);
          this.bridge.handleDisconnection({
            send: (data) => ws.send(data),
            close: () => ws.close(),
            readyState: ws.readyState as number,
          });
        },
      },
    });

    console.log(`
╔════════════════════════════════════════════════════════════╗
║         Marble Diagram Server Started                      ║
╚════════════════════════════════════════════════════════════╝

🎯 WebSocket server running at ws://${this.config.host}:${this.config.port}
📊 View diagrams at http://${this.config.host}:${this.config.port}
    `);
  }

  /**
   * Start the WebSocket server using Node.js with ws package
   */
  async startNodeServer(): Promise<void> {
    const WebSocket = require('ws');
    const http = require('http');

    // Create HTTP server
    const httpServer = http.createServer((req: any, res: any) => {
      if (req.url === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(MarbleServer.getClientHTML(this.config.port!));
      } else {
        res.writeHead(404);
        res.end('Not found');
      }
    });

    // Create WebSocket server
    const wss = new WebSocket.Server({ server: httpServer });

    wss.on('connection', (ws: any) => {
      console.log(`🎯 Marble client connected`);

      const wsAdapter = {
        send: (data: string) => ws.send(data),
        close: () => ws.close(),
        readyState: ws.readyState,
      };

      this.bridge.handleConnection(wsAdapter);

      ws.on('message', (message: string) => {
        this.bridge.handleMessage(wsAdapter, message.toString());
      });

      ws.on('close', () => {
        console.log(`🔌 Marble client disconnected`);
        this.bridge.handleDisconnection(wsAdapter);
      });
    });

    // Start the server
    httpServer.listen(this.config.port, this.config.host, () => {
      console.log(`
╔════════════════════════════════════════════════════════════╗
║         Marble Diagram Server Started                      ║
╚════════════════════════════════════════════════════════════╝

🎯 WebSocket server running at ws://${this.config.host}:${this.config.port}
📊 View diagrams at http://${this.config.host}:${this.config.port}
      `);
    });

    this.server = httpServer;
  }

  /**
   * Stop the server
   */
  stop(): void {
    if (this.server) {
      if (typeof this.server.stop === 'function') {
        // Bun server
        this.server.stop();
      } else if (typeof this.server.close === 'function') {
        // Node server
        this.server.close();
      }
      console.log('🛑 Marble diagram server stopped');
    }
  }

  /**
   * Get the HTML client page
   */
  private static getClientHTML(port: number): string {
    return js`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FluxGraph Marble Diagrams</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            display: flex;
            flex-direction: column;
        }
        
        header {
            background: rgba(255, 255, 255, 0.95);
            padding: 1rem 2rem;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        h1 {
            color: #333;
            font-size: 1.5rem;
            display: flex;
            align-items: center;
            gap: 0.5rem;
        }
        
        #status {
            display: inline-block;
            padding: 0.25rem 0.75rem;
            border-radius: 20px;
            font-size: 0.875rem;
            font-weight: 500;
            margin-left: auto;
        }
        
        #status.connected {
            background: #4CAF50;
            color: white;
        }
        
        #status.disconnected {
            background: #f44336;
            color: white;
        }
        
        #marbles-container {
            flex: 1;
            padding: 2rem;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        
        #marbles-canvas {
            background: white;
            border-radius: 12px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 1200px;
            height: 600px;
            max-width: 100%;
        }
        
        .controls {
            position: fixed;
            bottom: 2rem;
            right: 2rem;
            display: flex;
            gap: 1rem;
        }
        
        button {
            padding: 0.75rem 1.5rem;
            border: none;
            border-radius: 8px;
            background: white;
            color: #667eea;
            font-weight: 600;
            cursor: pointer;
            box-shadow: 0 4px 15px rgba(0,0,0,0.1);
            transition: transform 0.2s;
        }
        
        button:hover {
            transform: translateY(-2px);
        }
    </style>
</head>
<body>
    <header>
        <h1>
            🎯 FluxGraph Marble Diagrams
            <span id="status" class="disconnected">Disconnected</span>
        </h1>
    </header>
    
    <div id="marbles-container">
        <canvas id="marbles-canvas"></canvas>
    </div>
    
    <div class="controls">
        <button onclick="clearCanvas()">Clear</button>
        <button onclick="reconnect()">Reconnect</button>
    </div>
    
    <script type="module">
        import { WebSocketMarbleRenderer } from '/ws-marbles-client.js';
        
        let renderer;
        const statusEl = document.getElementById('status');
        const canvas = document.getElementById('marbles-canvas');
        
        function connect() {
            // Define unique colors for each stream
            const streamThemes = {
                'interval': { valueColor: '#4CAF50', circleRadius: 18 },
                'mapped': { valueColor: '#2196F3', circleRadius: 18 },
                'filtered': { valueColor: '#FF9800', circleRadius: 18 },
                'merged': { valueColor: '#9C27B0', circleRadius: 18 },
                'combined': { valueColor: '#F44336', circleRadius: 18 },
                'error-handling': { valueColor: '#00BCD4', circleRadius: 18 },
                'buffered': { valueColor: '#FF5722', circleRadius: 18 },
                'debounced': { valueColor: '#795548', circleRadius: 18 },
                'throttled': { valueColor: '#607D8B', circleRadius: 18 },
                'accumulated': { valueColor: '#E91E63', circleRadius: 18 },
                'graph-source': { valueColor: '#3F51B5', circleRadius: 18 },
                'graph-transform': { valueColor: '#009688', circleRadius: 18 },
                'graph-filter': { valueColor: '#FFC107', circleRadius: 18 }
            };
            
            renderer = new WebSocketMarbleRenderer(canvas, {
                url: 'ws://localhost:${port}',
                theme: {
                    backgroundColor: '#ffffff',
                    lineColor: '#e0e0e0',
                    valueColor: '#4CAF50',
                    errorColor: '#f44336',
                    completeColor: '#2196F3',
                    circleRadius: 18, // Larger marbles
                    lineWidth: 3,
                    fontSize: 14
                },
                streamThemes: streamThemes,
                scrollSpeed: 60,
                maxDuration: 30000
            });
            
            renderer.connect();
            
            // Update status
            statusEl.textContent = 'Connected';
            statusEl.className = 'connected';
            
            // Subscribe to streams as they become available
            const streamIds = [
                'interval', 'mapped', 'filtered', 'merged', 'combined', 
                'error-handling', 'buffered', 'debounced', 'throttled', 
                'accumulated', 'graph-source', 'graph-transform', 'graph-filter'
            ];
            
            // Subscribe to streams with a delay to allow server registration
            setTimeout(() => {
                streamIds.forEach(streamId => {
                    try {
                        renderer.subscribe(streamId);
                        console.log('Subscribed to:', streamId);
                    } catch (error) {
                        console.log('Stream not available yet:', streamId);
                    }
                });
            }, 1000);
        }
        
        window.clearCanvas = () => {
            if (renderer) renderer.clear();
        };
        
        window.reconnect = () => {
            if (renderer) renderer.disconnect();
            connect();
        };
        
        // Initial connection
        connect();
    </script>
</body>
</html>`;
  }
}

/**
 * Create a marble server instance
 */
export function createMarbleServer(config?: MarbleServerConfig): MarbleServer {
  return new MarbleServer(config);
}
