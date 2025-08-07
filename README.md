# Streamflow

🌊 **Real-time graph-based stream processing for Cloudflare Workers and Durable Objects**

Streamflow is a lightweight, high-performance stream processing library designed specifically for edge computing environments. Build complex data processing pipelines that run directly on Cloudflare's global network.

## Features

- 🚀 **Real-time Processing** - Process data streams with millisecond latency
- 🔀 **Graph-based Architecture** - Create complex topologies with parallel and conditional paths
- 📊 **Built-in Aggregations** - Time, count, and session-based windowing
- 🔄 **Backpressure Handling** - Automatic buffering and flow control
- 🛡️ **Error Resilience** - Retry policies and error recovery strategies
- 🎯 **Type-safe** - Full TypeScript support with comprehensive types
- ☁️ **Edge-native** - Optimized for Cloudflare Workers and Durable Objects

## Installation

```bash
npm install @streamflow/core
```

## Quick Start

```typescript
import { Graph, nodes } from '@streamflow/core';

// Define your graph
const graph = new Graph({
  name: 'Transaction Processor',
  nodes: [
    nodes.source('webhook', {
      type: 'websocket',
      url: 'wss://api.example.com/transactions'
    }),
    
    nodes.transform('normalize', {
      function: (data) => ({
        ...data,
        amount: data.amount / 100
      })
    }),
    
    nodes.filter('large-only', {
      function: (data) => data.amount > 100
    }),
    
    nodes.aggregate('hourly-summary', {
      window: 'time',
      duration: 3600,
      function: (packets) => ({
        total: packets.reduce((sum, p) => sum + p.data.amount, 0),
        count: packets.length
      })
    }),
    
    nodes.sink('alerts', {
      type: 'http',
      url: 'https://alerts.example.com/webhook'
    })
  ],
  
  edges: [
    ['webhook', 'normalize'],
    ['normalize', 'large-only'],
    ['large-only', 'hourly-summary'],
    ['hourly-summary', 'alerts']
  ]
});

// Start processing
await graph.start();

// Inject data manually
await graph.inject('webhook', { amount: 15000, currency: 'USD' });

// Subscribe to outputs
graph.subscribe('alerts', (packet) => {
  console.log('Alert triggered:', packet.data);
});
```

## Use Cases

### Financial Transaction Processing
```typescript
const financialGraph = templates.financial.createAnomalyDetector({
  thresholds: {
    amount: 1000,
    frequency: 10 // transactions per minute
  },
  alertUrl: 'https://your-webhook.com'
});
```

### IoT Data Aggregation
```typescript
const iotGraph = templates.iot.createSensorAggregator({
  sensors: ['temperature', 'humidity', 'pressure'],
  aggregateWindow: 60, // seconds
  outputFormat: 'prometheus'
});
```

### Real-time Analytics
```typescript
const analyticsGraph = templates.analytics.createEventProcessor({
  events: ['click', 'view', 'purchase'],
  sessionTimeout: 1800, // 30 minutes
  enrichment: {
    geoip: true,
    userAgent: true
  }
});
```

## Durable Object Integration

```typescript
export class StreamProcessor extends DurableObject {
  private graph: Graph;

  async fetch(request: Request) {
    if (!this.graph) {
      this.graph = new Graph(graphConfig);
      await this.graph.start();
    }

    const url = new URL(request.url);
    
    if (url.pathname === '/inject') {
      const data = await request.json();
      await this.graph.inject('input', data);
      return new Response('OK');
    }

    if (url.pathname === '/metrics') {
      return Response.json(this.graph.getMetrics());
    }

    return new Response('Not found', { status: 404 });
  }
}
```

## Node Types

### Source Nodes
- **WebSocket** - Real-time data streams
- **HTTP** - Polling or webhook endpoints
- **Timer** - Scheduled data generation
- **Manual** - Programmatic injection

### Transform Nodes
- Data mapping and enrichment
- Format conversion
- Calculations and derived fields

### Filter Nodes
- Conditional routing
- Data validation
- Sampling and rate limiting

### Aggregate Nodes
- Time-based windows
- Count-based windows
- Session windows
- Custom aggregation functions

### Sink Nodes
- WebSocket output
- HTTP webhooks
- Database writes
- Custom outputs

## Advanced Features

### Error Handling
```typescript
const graph = new Graph({
  // ...
  errorStrategy: 'continue', // or 'stop', 'retry'
  retryPolicy: {
    maxRetries: 3,
    backoffMultiplier: 2,
    initialDelay: 1000
  }
});
```

### Metrics and Monitoring
```typescript
const metrics = graph.getMetrics();
console.log({
  processed: metrics.packetsProcessed,
  dropped: metrics.packetsDropped,
  latency: metrics.averageLatency
});

graph.on('error', (event) => {
  console.error('Graph error:', event);
});
```

### State Persistence
```typescript
// Save graph state to Durable Object storage
const state = graph.getState();
await this.storage.put('graph-state', state);

// Restore on restart
const savedState = await this.storage.get('graph-state');
if (savedState) {
  graph.restore(savedState);
}
```

## Performance

Streamflow is designed for high-throughput, low-latency processing:

- Process 10,000+ events/second per Durable Object
- Sub-millisecond processing latency
- Automatic backpressure handling
- Memory-efficient buffering

## Contributing

We welcome contributions! Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details.

## License

MIT License - see [LICENSE](LICENSE) for details.

## Support

- 📖 [Documentation](https://streamflow.dev/docs)
- 💬 [Discord Community](https://discord.gg/streamflow)
- 🐛 [Issue Tracker](https://github.com/yourusername/streamflow/issues)
- 📧 [Email Support](mailto:support@streamflow.dev)

---

Built with ❤️ for the edge computing community