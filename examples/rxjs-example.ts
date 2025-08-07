/**
 * Example showing RxJS-powered stream processing with Streamflow
 */

import { 
  Observable, 
  interval, 
  from, 
  merge, 
  combineLatest,
  of,
  timer
} from 'rxjs';
import {
  map,
  filter,
  scan,
  debounceTime,
  throttleTime,
  bufferTime,
  windowTime,
  mergeMap,
  concatMap,
  switchMap,
  retry,
  catchError,
  take,
  takeUntil,
  distinctUntilChanged,
  share,
  shareReplay,
  withLatestFrom,
  groupBy,
  mergeAll,
  reduce,
  tap
} from 'rxjs/operators';

import { RxGraphRunner } from '@streamflow/core';

/**
 * Example 1: Real-time Financial Transaction Processing
 */
export function financialProcessingExample() {
  // Simulate transaction stream
  const transactions$ = interval(100).pipe(
    map(i => ({
      id: `tx-${i}`,
      amount: Math.random() * 1000 - 500, // -500 to 500
      merchant: ['Amazon', 'Tesco', 'Uber', 'Netflix'][Math.floor(Math.random() * 4)],
      timestamp: Date.now()
    }))
  );

  // Process transactions with various RxJS operators
  const processed$ = transactions$.pipe(
    // 1. Filter out small transactions
    filter(tx => Math.abs(tx.amount) > 10),
    
    // 2. Add categorization
    map(tx => ({
      ...tx,
      category: tx.amount > 0 ? 'income' : 'expense',
      isLarge: Math.abs(tx.amount) > 100
    })),
    
    // 3. Detect anomalies (rapid transactions)
    bufferTime(1000), // Group transactions by second
    map(txGroup => ({
      transactions: txGroup,
      isAnomaly: txGroup.length > 5, // More than 5 tx/second is anomaly
      totalAmount: txGroup.reduce((sum, tx) => sum + tx.amount, 0)
    })),
    
    // 4. Filter anomalies
    filter(group => group.isAnomaly),
    
    // 5. Rate limit alerts
    throttleTime(5000), // Max 1 alert per 5 seconds
    
    // 6. Share the stream
    share()
  );

  return processed$;
}

/**
 * Example 2: Aggregated Analytics with Windows
 */
export function analyticsExample() {
  const events$ = interval(50).pipe(
    map(i => ({
      type: ['click', 'view', 'purchase'][Math.floor(Math.random() * 3)],
      userId: `user-${Math.floor(Math.random() * 10)}`,
      value: Math.random() * 100,
      timestamp: Date.now()
    }))
  );

  // Group by event type and calculate metrics
  const analytics$ = events$.pipe(
    // Group by event type
    groupBy(event => event.type),
    
    // Process each group
    mergeMap(group$ => 
      group$.pipe(
        // Window by time (5 seconds)
        windowTime(5000),
        
        // Calculate aggregates for each window
        mergeMap(window$ => 
          window$.pipe(
            reduce((acc, event) => ({
              type: event.type,
              count: acc.count + 1,
              totalValue: acc.totalValue + event.value,
              users: new Set([...acc.users, event.userId])
            }), {
              type: group$.key,
              count: 0,
              totalValue: 0,
              users: new Set<string>()
            }),
            
            // Convert Set to count
            map(stats => ({
              ...stats,
              uniqueUsers: stats.users.size,
              avgValue: stats.totalValue / stats.count,
              timestamp: Date.now()
            }))
          )
        )
      )
    ),
    
    // Collect all group results
    scan((acc, stats) => {
      acc[stats.type] = stats;
      return acc;
    }, {} as Record<string, any>),
    
    shareReplay(1) // Cache latest value for new subscribers
  );

  return analytics$;
}

/**
 * Example 3: Complex Stream Orchestration
 */
export function orchestrationExample() {
  // Multiple data sources
  const source1$ = interval(1000).pipe(map(i => ({ source: 'api1', value: i })));
  const source2$ = interval(1500).pipe(map(i => ({ source: 'api2', value: i * 2 })));
  const source3$ = interval(2000).pipe(map(i => ({ source: 'api3', value: i * 3 })));

  // Merge and process
  const orchestrated$ = merge(source1$, source2$, source3$).pipe(
    // Add timestamp
    map(data => ({ ...data, timestamp: Date.now() })),
    
    // Deduplicate by value
    distinctUntilChanged((a, b) => a.value === b.value),
    
    // Enrich with external data (simulated)
    concatMap(async data => {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        ...data,
        enriched: `Processed ${data.value} from ${data.source}`
      };
    }),
    
    // Error handling with retry
    retry({
      count: 3,
      delay: 1000
    }),
    
    // Catch and handle errors
    catchError(error => {
      console.error('Stream error:', error);
      return of({ error: true, message: error.message });
    }),
    
    // Take only first 100 items
    take(100),
    
    share()
  );

  return orchestrated$;
}

/**
 * Example 4: Backpressure Handling
 */
export function backpressureExample() {
  // Fast producer
  const fastProducer$ = interval(10).pipe(
    map(i => ({ id: i, data: `Fast item ${i}` }))
  );

  // Slow consumer with backpressure strategies
  
  // Strategy 1: Throttle (drop intermediate values)
  const throttled$ = fastProducer$.pipe(
    throttleTime(100),
    tap(item => console.log('Throttled:', item))
  );

  // Strategy 2: Debounce (wait for quiet period)
  const debounced$ = fastProducer$.pipe(
    debounceTime(100),
    tap(item => console.log('Debounced:', item))
  );

  // Strategy 3: Buffer and batch
  const buffered$ = fastProducer$.pipe(
    bufferTime(1000, undefined, 10), // Buffer for 1s or 10 items
    filter(buffer => buffer.length > 0),
    tap(buffer => console.log('Buffered batch:', buffer.length, 'items'))
  );

  // Strategy 4: Concurrent processing with limit
  const concurrent$ = fastProducer$.pipe(
    mergeMap(
      item => processItem(item), // Async processing
      3 // Max 3 concurrent
    ),
    tap(result => console.log('Processed:', result))
  );

  return { throttled$, debounced$, buffered$, concurrent$ };
}

async function processItem(item: any) {
  await new Promise(resolve => setTimeout(resolve, 200));
  return { ...item, processed: true };
}

/**
 * Example 5: State Management with Scan
 */
export function stateManagementExample() {
  const actions$ = merge(
    timer(0, 1000).pipe(map(() => ({ type: 'INCREMENT' }))),
    timer(500, 2000).pipe(map(() => ({ type: 'DECREMENT' }))),
    timer(3000).pipe(map(() => ({ type: 'RESET' })))
  );

  const state$ = actions$.pipe(
    scan((state, action) => {
      switch (action.type) {
        case 'INCREMENT':
          return { ...state, count: state.count + 1 };
        case 'DECREMENT':
          return { ...state, count: state.count - 1 };
        case 'RESET':
          return { ...state, count: 0 };
        default:
          return state;
      }
    }, { count: 0 }),
    
    distinctUntilChanged((a, b) => a.count === b.count),
    
    shareReplay(1)
  );

  return state$;
}

/**
 * Example 6: Using RxGraphRunner with RxJS Operators
 */
export async function graphRunnerExample() {
  const graph = new RxGraphRunner({
    id: 'rx-example',
    name: 'RxJS Example Graph',
    version: '1.0.0',
    nodes: [
      {
        id: 'input',
        type: 'source',
        name: 'Data Input',
        sourceType: 'manual',
        config: {}
      },
      {
        id: 'process',
        type: 'transform',
        name: 'Process',
        transformFunction: 'return { ...data, processed: true }',
        outputSchema: {}
      },
      {
        id: 'output',
        type: 'sink',
        name: 'Output',
        sinkType: 'log',
        config: {}
      }
    ],
    edges: [
      { id: 'e1', from: 'input', to: 'process' },
      { id: 'e2', from: 'process', to: 'output' }
    ]
  });

  await graph.initialize();
  await graph.start();

  // Use RxJS to create complex input stream
  const input$ = interval(100).pipe(
    take(10),
    map(i => ({ value: i, timestamp: Date.now() })),
    tap(data => graph.inject('input', data))
  );

  // Subscribe to graph output
  const output$ = graph.observe('output').pipe(
    map(packet => packet.data),
    scan((acc, data) => [...acc, data], [] as any[]),
    tap(results => console.log('Results so far:', results.length))
  );

  // Combine with metrics
  const monitoring$ = combineLatest([
    output$,
    graph.getMetrics$()
  ]).pipe(
    map(([results, metrics]) => ({
      resultsCount: results.length,
      metrics
    }))
  );

  return { input$, output$, monitoring$ };
}

/**
 * Example 7: Circuit Breaker Pattern
 */
export function circuitBreakerExample() {
  let errorCount = 0;
  
  // Simulated API that fails sometimes
  const unreliableApi$ = interval(100).pipe(
    mergeMap(i => {
      // Fail 30% of the time
      if (Math.random() < 0.3) {
        errorCount++;
        throw new Error(`API Error ${errorCount}`);
      }
      return of({ success: true, data: i });
    })
  );

  // Apply circuit breaker
  const withCircuitBreaker$ = unreliableApi$.pipe(
    // Retry with exponential backoff
    retry({
      count: 3,
      delay: (error, retryCount) => {
        const delay = Math.min(1000 * Math.pow(2, retryCount), 10000);
        console.log(`Retry ${retryCount} after ${delay}ms`);
        return timer(delay);
      }
    }),
    
    // Circuit breaker logic
    scan((state, value) => {
      if (value.success) {
        // Reset on success
        return { ...state, failures: 0, isOpen: false };
      }
      return state;
    }, { failures: 0, isOpen: false }),
    
    // Close circuit if too many failures
    tap(state => {
      if (state.failures > 5 && !state.isOpen) {
        console.log('Circuit breaker opened!');
      }
    }),
    
    // Filter when circuit is open
    filter(state => !state.isOpen),
    
    catchError(error => {
      console.error('Circuit breaker caught:', error);
      return of({ error: true, message: error.message });
    }),
    
    share()
  );

  return withCircuitBreaker$;
}

// Run examples
if (typeof window === 'undefined') {
  console.log('Running RxJS Streamflow Examples...');
  
  // Example 1: Financial Processing
  financialProcessingExample().pipe(take(5)).subscribe(
    result => console.log('Financial:', result)
  );
  
  // Example 2: Analytics
  analyticsExample().pipe(take(5)).subscribe(
    result => console.log('Analytics:', result)
  );
  
  // Example 3: State Management
  stateManagementExample().pipe(take(10)).subscribe(
    state => console.log('State:', state)
  );
}