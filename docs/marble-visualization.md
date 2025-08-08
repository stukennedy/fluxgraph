# RxJS Marble Diagram Visualization

FluxGraph includes built-in support for visualizing RxJS observables using marble diagrams through the `ws-marbles` integration. This powerful debugging tool helps you understand and debug complex stream flows in real-time.

## Features

- 📊 **Real-time marble diagrams** for all RxJS streams
- 🔍 **Visual debugging** of data flow through graph nodes
- 🎯 **Track multiple streams** simultaneously
- 🛠️ **Custom operators** with built-in visualization
- 📈 **Performance insights** through timing visualization

## Installation

The marble visualization is included with FluxGraph. The `ws-marbles` package is installed as a dev dependency.

```bash
npm install @fluxgraph/core
```

## Quick Start

### 1. Start the Marble Server

Start the WebSocket marble diagram server with the example:

```bash
npm run marble:server
# or
bun run examples/marble-server-example.ts
```

This starts a server on `http://localhost:3000` where you can view the marble diagrams in your browser.

### 2. Use the MarbleServer

```typescript
import { createMarbleServer } from '@fluxgraph/core/utils/marble-server';
import { interval } from 'rxjs';
import { map, filter, take } from 'rxjs/operators';

// Create marble server instance
const marbleServer = createMarbleServer({
  port: 3000,
  host: 'localhost',
});

// Register observable streams for visualization
marbleServer.registerStream({
  streamId: 'interval',
  name: 'Interval Stream',
  description: 'Numbers every 1s',
  observable: interval(1000).pipe(take(10)),
  theme: {
    valueColor: '#4CAF50',
  },
});

// Register transformed stream
const doubled$ = interval(1000).pipe(
  take(10),
  map((x) => x * 2),
  filter((x) => x > 5)
);

marbleServer.registerStream({
  streamId: 'doubled-filtered',
  name: 'Doubled & Filtered',
  description: 'Values doubled and > 5',
  observable: doubled$,
});

// Start the server
await marbleServer.startBunServer();
```

### 3. View the Diagrams

Open `http://localhost:3000` in your browser to see real-time marble diagrams of your streams.

## API Reference

### MarbleServer Class

#### Constructor Options

```typescript
interface MarbleServerConfig {
  port?: number; // WebSocket server port (default: 3000)
  host?: string; // Server host (default: 'localhost')
}
```

#### Methods

##### `registerStream(registration: StreamRegistration): void`

Register an observable stream for visualization.

```typescript
interface StreamRegistration {
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
```

##### `registerPacketStream(streamId, name, observable, extractor?): void`

Register a FluxGraph DataPacket stream.

```typescript
marbleServer.registerPacketStream('packets', 'Data Packets', packetObservable$, (packet) => packet.data);
```

##### `startBunServer(): Promise<void>`

Start the WebSocket server using Bun.

##### `startNodeServer(): Promise<void>`

Start the WebSocket server using Node.js.

##### `stop(): void`

Stop the server.

## FluxGraph Integration

### Visualizing Graph Data Flow

```typescript
import { Graph } from '@fluxgraph/core';
import { createMarbleServer } from '@fluxgraph/core/utils/marble-server';
import { Subject } from 'rxjs';

const graph = new Graph(myGraphDefinition);
const marbleServer = createMarbleServer();

// Create subjects for node outputs
const transformSubject = new Subject();
const filterSubject = new Subject();

// Register streams
marbleServer.registerStream({
  streamId: 'transform-output',
  name: 'Transform Node',
  observable: transformSubject.asObservable(),
});

marbleServer.registerStream({
  streamId: 'filter-output',
  name: 'Filter Node',
  observable: filterSubject.asObservable(),
});

// Track node outputs
graph.subscribe('transform-node', (packet) => {
  transformSubject.next(packet.data);
});

graph.subscribe('filter-node', (packet) => {
  filterSubject.next(packet.data);
});

await marbleServer.startBunServer();
await graph.initialize();
await graph.start();
```

### RxGraphRunner Visualization

For RxJS-based graphs, you can directly visualize the streams:

```typescript
import { RxGraphRunner } from '@fluxgraph/core/core/RxGraphRunner';
import { createMarbleServer } from '@fluxgraph/core/utils/marble-server';

const rxGraph = new RxGraphRunner(graphDefinition);
const marbleServer = createMarbleServer();

// Register node output streams
marbleServer.registerPacketStream('source', 'Source Data', rxGraph.observe('source-node'), (packet) => packet.data);

marbleServer.registerPacketStream('transform', 'Transformed Data', rxGraph.observe('transform-node'), (packet) => packet.data);

await marbleServer.startBunServer();
await rxGraph.initialize();
await rxGraph.start();
```

## Advanced Usage

### Using with Custom Operators

Create separate streams for visualization at different stages:

```typescript
import { tap } from 'rxjs/operators';
import { Subject } from 'rxjs';

const marbleServer = createMarbleServer();

// Create subjects for different stages
const inputSubject = new Subject();
const outputSubject = new Subject();

// Register visualization streams
marbleServer.registerStream({
  streamId: 'input',
  name: 'Input Values',
  observable: inputSubject.asObservable(),
});

marbleServer.registerStream({
  streamId: 'output',
  name: 'Output Values',
  observable: outputSubject.asObservable(),
});

// Use tap to emit to visualization
myStream$
  .pipe(
    tap((value) => inputSubject.next(value)),
    map((x) => x * 2),
    tap((value) => outputSubject.next(value))
  )
  .subscribe();

await marbleServer.startBunServer();
```

### Debugging Complex Flows

```typescript
import { merge, of } from 'rxjs';
import { catchError, bufferTime } from 'rxjs/operators';

const marbleServer = createMarbleServer();

// Track merge operations
marbleServer.registerStream({
  streamId: 'stream-1',
  name: 'Stream 1',
  observable: stream1$,
});

marbleServer.registerStream({
  streamId: 'stream-2',
  name: 'Stream 2',
  observable: stream2$,
});

marbleServer.registerStream({
  streamId: 'merged',
  name: 'Merged Result',
  observable: merge(stream1$, stream2$),
});

// Track error handling
const withErrors$ = source$.pipe(catchError((err) => of('fallback')));

marbleServer.registerStream({
  streamId: 'with-errors',
  name: 'Error Handling',
  observable: withErrors$,
  theme: {
    errorColor: '#f44336',
  },
});

// Track buffering
marbleServer.registerStream({
  streamId: 'buffered',
  name: 'Buffered (1s)',
  observable: source$.pipe(bufferTime(1000)),
});

await marbleServer.startBunServer();
```

## Running the Demo

FluxGraph includes a comprehensive demo of marble visualization:

```bash
# Start the marble server with demo streams
npm run marble:server
# or
bun run examples/marble-server-example.ts
```

Then open `http://localhost:3000` in your browser to view the marble diagrams.

The demo includes examples of:

- Basic streams (interval, timer)
- Transformation operators (map, filter, scan)
- Combination operators (merge, combineLatest)
- Error handling (retry, catchError)
- Time-based operators (debounce, throttle, buffer)
- FluxGraph pipeline visualization

## Tips and Best Practices

1. **Label Your Streams**: Always provide descriptive names and descriptions

   ```typescript
   marbleServer.registerStream({
     streamId: 'user-clicks',
     name: 'User Click Events',
     description: 'Click events from UI',
   });
   ```

2. **Group Related Streams**: Use prefixes to organize streams

   ```typescript
   marbleServer.registerStream({
     streamId: 'auth/login',
     name: 'Login Request',
   });
   marbleServer.registerStream({
     streamId: 'auth/token',
     name: 'Token Response',
   });
   ```

3. **Use Themes**: Customize colors for different stream types

   ```typescript
   marbleServer.registerStream({
     streamId: 'errors',
     name: 'Error Stream',
     observable: errorStream$,
     theme: {
       valueColor: '#f44336',
       errorColor: '#d32f2f',
     },
   });
   ```

4. **Clean Up**: Always stop the server on shutdown

   ```typescript
   process.on('SIGINT', () => {
     marbleServer.stop();
     process.exit();
   });
   ```

5. **Performance**: Use in development only
   ```typescript
   if (process.env.NODE_ENV === 'development') {
     const marbleServer = createMarbleServer();
     marbleServer.registerStream({
       /* ... */
     });
     await marbleServer.startBunServer();
   }
   ```

## Troubleshooting

### Server Won't Start

- Check if port 3000 is already in use
- Try a different port in configuration:
  ```typescript
  const marbleServer = createMarbleServer({
    port: 3000,
  });
  ```

### Can't Connect to Visualizer

- Ensure the marble server is running
- Check firewall settings
- Verify the correct host/port configuration

### No Diagrams Showing

- Make sure streams are actually emitting values
- Check browser console for errors
- Verify WebSocket connection is established
- Ensure you've registered streams before starting the server

### Performance Issues

- Reduce the number of tracked streams
- Increase debounce/throttle times
- Limit stream duration with `take()` operator
- Use simpler data structures for values

## Browser Compatibility

The marble diagram viewer works in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Related Resources

- [RxJS Marble Testing](https://rxjs.dev/guide/testing/marble-testing)
- [ws-marbles GitHub](https://github.com/ws-marbles/ws-marbles)
- [RxJS Operators](https://rxjs.dev/guide/operators)
- [FluxGraph Documentation](../README.md)
