#!/usr/bin/env bun

/**
 * Marble Diagram Server Example
 *
 * This example demonstrates how to use ws-marbles to visualize
 * RxJS observables from FluxGraph pipelines
 */

import { interval, merge, of } from 'rxjs';
import { map, filter, take, scan, bufferTime, catchError, retry } from 'rxjs/operators';

import { GraphDefinition } from '@fluxgraph/core';
import { createMarbleServer } from '../src/utils/marble-server';
import { RxGraphRunner } from '../src/core/RxGraphRunner';

async function startMarbleServer() {
  // Create marble server
  const marbleServer = createMarbleServer({
    port: 8080,
    host: 'localhost',
  });

  console.log('📊 Setting up observable streams...\n');

  // Example 1: Basic interval stream
  marbleServer.registerStream({
    streamId: 'interval',
    name: 'Interval Stream',
    description: 'Emits every second',
    observable: interval(1000).pipe(take(20)),
    theme: {
      valueColor: '#4CAF50',
    },
  });

  // Example 2: Mapped values
  marbleServer.registerStream({
    streamId: 'doubled',
    name: 'Doubled Values',
    description: 'Interval values doubled',
    observable: interval(1000).pipe(
      take(20),
      map((x) => x * 2)
    ),
    theme: {
      valueColor: '#2196F3',
    },
  });

  // Example 3: Filtered stream
  marbleServer.registerStream({
    streamId: 'filtered',
    name: 'Even Numbers',
    description: 'Only even numbers',
    observable: interval(500).pipe(
      take(30),
      filter((x) => x % 2 === 0)
    ),
    theme: {
      valueColor: '#FF9800',
    },
  });

  // Example 4: Merged streams
  const streamA$ = interval(1000).pipe(
    map((x) => `A${x}`),
    take(10)
  );

  const streamB$ = interval(1500).pipe(
    map((x) => `B${x}`),
    take(8)
  );

  marbleServer.registerStream({
    streamId: 'merged',
    name: 'Merged Streams',
    description: 'Stream A + Stream B',
    observable: merge(streamA$, streamB$),
    theme: {
      valueColor: '#9C27B0',
    },
  });

  // Example 5: Error handling
  marbleServer.registerStream({
    streamId: 'with-errors',
    name: 'Error Handling',
    description: 'Stream with error recovery',
    observable: interval(1000).pipe(
      take(15),
      map((x) => {
        if (x === 5 || x === 10) {
          throw new Error(`Error at ${x}`);
        }
        return x;
      }),
      retry(2),
      catchError((err) => of('Error recovered'))
    ),
    theme: {
      valueColor: '#4CAF50',
      errorColor: '#f44336',
    },
  });

  // Example 6: Buffered stream
  marbleServer.registerStream({
    streamId: 'buffered',
    name: 'Buffered Stream',
    description: 'Buffers values every 2 seconds',
    observable: interval(300).pipe(
      take(30),
      bufferTime(2000),
      map((buffer) => `[${buffer.join(',')}]`)
    ),
    theme: {
      valueColor: '#00BCD4',
    },
  });

  // Example 7: Scan (accumulator)
  marbleServer.registerStream({
    streamId: 'accumulated',
    name: 'Running Total',
    description: 'Accumulates sum over time',
    observable: interval(1000).pipe(
      take(10),
      scan((acc, curr) => acc + curr, 0)
    ),
    theme: {
      valueColor: '#E91E63',
    },
  });

  // Example 8: FluxGraph integration
  const graphDefinition: GraphDefinition = {
    id: 'demo-graph',
    name: 'FluxGraph Demo',
    description: 'Graph with marble visualization',
    nodes: [
      {
        id: 'timer',
        type: 'source',
        name: 'Timer Source',
        sourceType: 'timer',
        config: {
          interval: 800,
        },
      },
      {
        id: 'multiply',
        type: 'transform',
        name: 'Multiply by 3',
        transformFunction: 'return data * 3;',
      },
      {
        id: 'filter',
        type: 'filter',
        name: 'Greater than 10',
        filterFunction: 'return data > 10;',
      },
      {
        id: 'accumulate',
        type: 'aggregate',
        name: 'Sum Last 5',
        aggregateType: 'count',
        windowSize: 5,
        aggregateFunction: 'return packets.reduce((sum, p) => sum + p.data, 0);',
      },
    ],
    edges: [
      { from: 'timer', to: 'multiply' },
      { from: 'multiply', to: 'filter' },
      { from: 'filter', to: 'accumulate' },
    ],
  };

  // Create RxJS-based graph runner
  const rxGraph = new RxGraphRunner(graphDefinition);

  // Initialize the graph first
  await rxGraph.initialize();

  // Register graph node outputs after initialization
  marbleServer.registerStream({
    streamId: 'graph-source',
    name: 'Graph: Timer',
    description: 'Timer source output',
    observable: rxGraph.observe('timer').pipe(
      map((packet) => packet.data),
      take(30)
    ),
    theme: {
      valueColor: '#795548',
    },
  });

  marbleServer.registerStream({
    streamId: 'graph-transform',
    name: 'Graph: Multiplied',
    description: 'After multiplication',
    observable: rxGraph.observe('multiply').pipe(
      map((packet) => packet.data),
      take(30)
    ),
    theme: {
      valueColor: '#607D8B',
    },
  });

  marbleServer.registerStream({
    streamId: 'graph-filter',
    name: 'Graph: Filtered',
    description: 'Values > 10',
    observable: rxGraph.observe('filter').pipe(
      map((packet) => packet.data),
      take(30)
    ),
    theme: {
      valueColor: '#FF5722',
    },
  });

  marbleServer.registerStream({
    streamId: 'graph-aggregate',
    name: 'Graph: Aggregated',
    description: 'Sum of last 5 values',
    observable: rxGraph.observe('accumulate').pipe(
      map((packet) => packet.data),
      take(30)
    ),
    theme: {
      valueColor: '#3F51B5',
    },
  });

  // Start the graph
  await rxGraph.start();

  // Start the marble server
  await marbleServer.startBunServer();

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('\n🛑 Shutting down...');
    rxGraph.stop();
    marbleServer.stop();
    process.exit(0);
  });
}

// Run the server
if (import.meta.main) {
  startMarbleServer().catch(console.error);
}
