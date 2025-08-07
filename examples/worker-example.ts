/**
 * Example Cloudflare Worker using Streamflow
 */

import { Graph, GraphBuilder, nodes, templates } from '@streamflow/core';
import { DurableObjectStorage, saveGraphState, loadGraphState } from '@streamflow/core/utils';

// Durable Object for stream processing
export class StreamProcessor implements DurableObject {
  private graph?: Graph;
  private storage: DurableObjectStorage;

  constructor(
    private state: DurableObjectState,
    private env: any
  ) {
    this.storage = new DurableObjectStorage(state.storage);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    try {
      switch (path) {
        case '/start':
          return await this.handleStart(request);
        
        case '/stop':
          return await this.handleStop();
        
        case '/inject':
          return await this.handleInject(request);
        
        case '/metrics':
          return await this.handleMetrics();
        
        case '/status':
          return await this.handleStatus();
        
        default:
          return new Response('Not found', { status: 404 });
      }
    } catch (error) {
      console.error('StreamProcessor error:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }

  private async handleStart(request: Request): Promise<Response> {
    if (this.graph) {
      return new Response('Graph already running', { status: 400 });
    }

    const { type = 'financial', config = {} } = await request.json();

    // Create graph based on type
    let graphDefinition;
    switch (type) {
      case 'financial':
        graphDefinition = templates.financial.createAnomalyDetector(config);
        break;
      
      case 'spending':
        graphDefinition = templates.financial.createSpendingMonitor(config);
        break;
      
      case 'custom':
        graphDefinition = this.createCustomGraph(config);
        break;
      
      default:
        return new Response('Invalid graph type', { status: 400 });
    }

    // Create and start graph
    this.graph = new Graph(graphDefinition);
    await this.graph.initialize();

    // Set up event listeners
    this.setupEventListeners();

    // Start the graph
    await this.graph.start();

    // Save initial state
    await saveGraphState(this.storage, this.graph.getState());

    return Response.json({
      status: 'started',
      graphId: graphDefinition.id,
      type
    });
  }

  private async handleStop(): Promise<Response> {
    if (!this.graph) {
      return new Response('No graph running', { status: 400 });
    }

    await this.graph.stop();
    
    // Save final state
    await saveGraphState(this.storage, this.graph.getState());
    
    const metrics = this.graph.getMetrics();
    this.graph = undefined;

    return Response.json({
      status: 'stopped',
      finalMetrics: metrics
    });
  }

  private async handleInject(request: Request): Promise<Response> {
    if (!this.graph) {
      return new Response('No graph running', { status: 400 });
    }

    const { nodeId = 'input', data } = await request.json();
    
    await this.graph.inject(nodeId, data);

    return Response.json({
      status: 'injected',
      nodeId,
      timestamp: Date.now()
    });
  }

  private async handleMetrics(): Promise<Response> {
    if (!this.graph) {
      return new Response('No graph running', { status: 400 });
    }

    const metrics = this.graph.getMetrics();
    
    return Response.json(metrics);
  }

  private async handleStatus(): Promise<Response> {
    const status = {
      running: !!this.graph,
      state: this.graph?.getState().status || 'idle',
      metrics: this.graph?.getMetrics() || null
    };

    return Response.json(status);
  }

  private setupEventListeners(): void {
    if (!this.graph) return;

    // Listen for errors
    this.graph.on('graph:error', (event) => {
      console.error('Graph error:', event.error);
      // Could send to external monitoring service
    });

    // Listen for completion
    this.graph.on('graph:stopped', async (event) => {
      console.log('Graph stopped:', event);
      await saveGraphState(this.storage, this.graph!.getState());
    });

    // Listen for specific node outputs (e.g., alerts)
    this.graph.subscribe('alerts', async (packet) => {
      console.log('Alert triggered:', packet.data);
      
      // Send to external service
      if (this.env.ALERT_WEBHOOK_URL) {
        await fetch(this.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(packet.data)
        });
      }
    });
  }

  private createCustomGraph(config: any) {
    return GraphBuilder.create('Custom Graph')
      .description('User-defined graph')
      .nodes(
        nodes.manual('input'),
        
        nodes.transform('process', {
          function: config.transformFunction || 'return data;'
        }),
        
        nodes.filter('filter', {
          function: config.filterFunction || 'return true;'
        }),
        
        nodes.aggregate('aggregate', {
          window: 'count',
          size: config.windowSize || 10,
          function: config.aggregateFunction || `
            return {
              count: packets.length,
              timestamp: Date.now()
            };
          `
        }),
        
        nodes.log('output')
      )
      .flow('input', 'process', 'filter', 'aggregate', 'output')
      .build();
  }

  // Alarm handler for scheduled processing
  async alarm(): Promise<void> {
    if (this.graph) {
      // Perform periodic maintenance
      const state = this.graph.getState();
      await saveGraphState(this.storage, state);
      
      // Schedule next alarm
      this.state.storage.setAlarm(Date.now() + 60000); // Every minute
    }
  }
}

// Worker fetch handler
export default {
  async fetch(request: Request, env: any): Promise<Response> {
    const url = new URL(request.url);
    
    // Route to Durable Object
    if (url.pathname.startsWith('/stream')) {
      const id = env.STREAM_PROCESSOR.idFromName('default');
      const stub = env.STREAM_PROCESSOR.get(id);
      
      // Remove /stream prefix and forward
      const newUrl = new URL(request.url);
      newUrl.pathname = newUrl.pathname.replace('/stream', '');
      
      return stub.fetch(newUrl, request);
    }

    // Health check
    if (url.pathname === '/health') {
      return Response.json({ status: 'healthy' });
    }

    return new Response('Streamflow Worker', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};