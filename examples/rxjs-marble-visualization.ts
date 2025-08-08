/**
 * RxJS Marble Diagram Visualization Example
 *
 * This example demonstrates how to visualize RxJS observables
 * using marble diagrams with ws-marbles integration
 */

import { interval, merge, combineLatest, from, of, throwError, Observable } from 'rxjs';
import { map, filter, take, delay, mergeMap, catchError, retry, scan, debounceTime, throttleTime, bufferTime, tap, shareReplay } from 'rxjs/operators';

import { MarbleVisualizer, createMarbleVisualizer } from '@fluxgraph/core/utils/marble-visualizer';
import { RxGraphRunner } from '@fluxgraph/core/core/RxGraphRunner';

// Start ws-marbles server first
console.log(`
╔════════════════════════════════════════════════════════════╗
║           RxJS Marble Diagram Visualization                ║
╚════════════════════════════════════════════════════════════╝

📌 First, start the marble diagram server:
   npx ws-marbles

📊 Then open http://localhost:3000 in your browser

⏳ Starting examples in 3 seconds...
`);

async function runMarbleExamples() {
  // Create marble visualizer
  const visualizer = createMarbleVisualizer({
    port: 3000,
    host: 'localhost',
    autoOpen: true,
    title: 'FluxGraph RxJS Stream Visualization',
  });

  try {
    // Connect to marble server
    await visualizer.connect();
    console.log('✅ Connected to marble visualizer\n');
  } catch (error) {
    console.error('❌ Failed to connect to marble server. Make sure to run: npx ws-marbles');
    return;
  }

  // Example 1: Basic interval stream
  console.log('📍 Example 1: Basic Interval Stream');
  const interval$ = interval(1000).pipe(take(20), shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('interval', 'Interval(1000)'));

  // Example 2: Mapped stream
  console.log('📍 Example 2: Mapped Values');
  const mapped$ = interval$.pipe(
    map((x) => x * 2),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('mapped', 'Doubled Values')
  );

  // Example 3: Filtered stream
  console.log('📍 Example 3: Filtered Stream');
  const filtered$ = interval(500).pipe(
    take(10),
    filter((x) => x % 2 === 0),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('filtered', 'Even Numbers Only')
  );

  // Example 4: Merged streams
  console.log('📍 Example 4: Merged Streams');
  const stream1$ = interval(1000).pipe(
    map((x) => `A${x}`),
    take(5),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('stream-a', 'Stream A')
  );

  const stream2$ = interval(1500).pipe(
    map((x) => `B${x}`),
    take(4),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('stream-b', 'Stream B')
  );

  const merged$ = merge(stream1$, stream2$).pipe(shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('merged', 'Merged A+B'));

  // Example 5: Combined Latest
  console.log('📍 Example 5: CombineLatest');
  const combined$ = combineLatest([interval(1000).pipe(take(10)), interval(1500).pipe(take(8))]).pipe(
    map(([a, b]) => `${a}+${b}`),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('combined', 'Combined Latest')
  );

  // Example 6: Error handling
  console.log('📍 Example 6: Error Handling');
  const withErrors$ = interval(1000).pipe(
    take(15),
    mergeMap((x) => {
      if (x === 3) {
        return throwError(() => new Error('Error at 3!'));
      }
      return of(x);
    }),
    retry(2),
    catchError((err) => of('Error handled')),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('error-handling', 'With Error Recovery')
  );

  // Example 7: Buffering
  console.log('📍 Example 7: Buffering');
  const buffered$ = interval(200).pipe(take(20), bufferTime(1000), shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('buffered', 'Buffer Every 1s'));

  // Example 8: Debouncing
  console.log('📍 Example 8: Debounce & Throttle');
  const fast$ = interval(100).pipe(take(100), shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('fast-source', 'Fast Source (100ms)'));

  const debounced$ = fast$.pipe(debounceTime(500), shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('debounced', 'Debounced (500ms)'));

  const throttled$ = interval(100).pipe(take(100), throttleTime(500), shareReplay({ bufferSize: 1, refCount: true }), visualizer.debug('throttled', 'Throttled (500ms)'));

  // Example 9: Scan (accumulation)
  console.log('📍 Example 9: Scan Accumulator');
  const accumulated$ = interval(1000).pipe(
    take(5),
    scan((acc, curr) => acc + curr, 0),
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('accumulated', 'Running Total')
  );

  // Example 10: Complex FluxGraph pipeline
  console.log('📍 Example 10: FluxGraph Pipeline Visualization');

  // Create a simple RxJS-based graph
  const graphRunner = new RxGraphRunner({
    id: 'visualized-graph',
    name: 'Marble Visualization Demo',
    description: 'Graph with marble diagram visualization',
    version: '1.0.0',
    nodes: [
      {
        id: 'source',
        type: 'source',
        name: 'Number Generator',
        sourceType: 'timer',
        config: {
          interval: 1000,
        },
      },
      {
        id: 'transform',
        type: 'transform',
        name: 'Square Numbers',
        transformFunction: 'return data.index * data.index;',
      },
      {
        id: 'filter',
        type: 'filter',
        name: 'Large Numbers',
        filterFunction: 'return data > 5;',
      },
      {
        id: 'sink',
        type: 'sink',
        name: 'Console Output',
        sinkType: 'log',
        config: {},
      },
    ],
    edges: [
      { id: 'edge-1', from: 'source', to: 'transform' },
      { id: 'edge-2', from: 'transform', to: 'filter' },
      { id: 'edge-3', from: 'filter', to: 'sink' },
    ],
  });

  // Initialize and start the graph first
  await graphRunner.initialize();
  await graphRunner.start();

  // Track graph streams after initialization
  const sourceStream$ = graphRunner.observe('source').pipe(
    tap((data) => console.log('Source data:', data)),
    map((data) => data.data.index), // Extract just the index value
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('graph-source', 'Graph Source')
  );

  const transformStream$ = graphRunner.observe('transform').pipe(
    tap((data) => console.log('Transform data:', data)),
    map((data) => data.data), // Extract just the transformed value
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('graph-transform', 'Graph Transform')
  );

  const filterStream$ = graphRunner.observe('filter').pipe(
    tap((data) => console.log('Filter data:', data)),
    map((data) => data.data), // Extract just the filtered value
    shareReplay({ bufferSize: 1, refCount: true }),
    visualizer.debug('graph-filter', 'Graph Filter')
  );

  // Subscribe to all streams to start them
  const subscriptions = [
    interval$.subscribe(),
    mapped$.subscribe(),
    filtered$.subscribe(),
    merged$.subscribe(),
    combined$.subscribe(),
    withErrors$.subscribe(),
    buffered$.subscribe(),
    debounced$.subscribe(),
    throttled$.subscribe(),
    accumulated$.subscribe(),
    sourceStream$.subscribe(),
    transformStream$.subscribe(),
    filterStream$.subscribe(),
  ];

  console.log('\n🎬 All streams are running!');
  console.log('📊 Check http://localhost:3000 to see the marble diagrams\n');

  // Run for 10 seconds then cleanup
  setTimeout(() => {
    console.log('\n🛑 Stopping all streams...');

    // Unsubscribe from all streams
    subscriptions.forEach((sub) => sub.unsubscribe());

    // Stop the graph
    graphRunner.stop();

    // Clear and disconnect visualizer
    setTimeout(() => {
      visualizer.clear();
      visualizer.disconnect();
      console.log('✅ Visualization complete!');
      process.exit(0);
    }, 1000);
  }, 10000);
}

// Custom operator example
function customOperatorExample(visualizer: MarbleVisualizer) {
  console.log('\n📍 Custom Operator Example');

  // Create a custom operator that adds visualization
  const withVisualization = <T>(streamId: string, label: string) => {
    return (source: Observable<T>) => {
      return source.pipe(visualizer.debug(streamId, label));
    };
  };

  // Use the custom operator
  const customStream$ = from([1, 2, 3, 4, 5]).pipe(
    delay(1000),
    withVisualization('custom-1', 'Input'),
    map((x) => Number(x) * 10),
    withVisualization('custom-2', 'Multiplied'),
    filter((x) => Number(x) > 20),
    withVisualization('custom-3', 'Filtered > 20')
  );

  customStream$.subscribe({
    next: (val) => console.log('Custom result:', val),
    complete: () => console.log('Custom stream complete'),
  });
}

// Manual marble event example
async function manualMarbleExample(visualizer: MarbleVisualizer) {
  console.log('\n📍 Manual Marble Events Example');

  // Manually emit marble events
  visualizer.emit('manual-stream', { value: 'Start' });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  visualizer.emit('manual-stream', { value: 'Middle' });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  visualizer.emit('manual-stream', { value: 'End' });

  await new Promise((resolve) => setTimeout(resolve, 1000));
  visualizer.complete('manual-stream');
}

// Run the examples
if (import.meta.main) {
  runMarbleExamples().catch(console.error);
}
