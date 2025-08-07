import { Observable, Subject, BehaviorSubject, of, throwError, EMPTY } from 'rxjs';
import { tap, catchError, retry, timeout, buffer, bufferTime, bufferCount, share, takeUntil, filter as rxFilter, map, mergeMap } from 'rxjs/operators';

import { NodeConfig, DataPacket, NodeStatus, NodeMetrics } from '@/core/types';

/**
 * RxJS-based base class for all graph nodes
 * Uses Observables for reactive stream processing
 */
export abstract class RxBaseNode<TConfig extends NodeConfig = NodeConfig> {
  protected config: TConfig;
  protected status$ = new BehaviorSubject<NodeStatus>('idle');
  protected input$ = new Subject<DataPacket>();
  protected output$ = new Subject<DataPacket>();
  protected destroy$ = new Subject<void>();
  protected metrics$ = new BehaviorSubject<NodeMetrics>({
    packetsIn: 0,
    packetsOut: 0,
    packetsDropped: 0,
    packetsErrored: 0,
    averageLatency: 0,
    lastProcessedAt: undefined,
  });

  private pipeline$?: Observable<DataPacket>;

  constructor(config: TConfig) {
    this.config = config;
  }

  /**
   * Initialize the node and set up the processing pipeline
   */
  async initialize(): Promise<void> {
    this.status$.next('idle');

    // Create the processing pipeline
    this.pipeline$ = this.createPipeline();

    // Subscribe to the pipeline
    this.pipeline$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (packet) => this.output$.next(packet),
      error: (error) => this.handleError(error),
      complete: () => this.status$.next('completed'),
    });

    await this.onInitialize();
  }

  /**
   * Create the processing pipeline
   */
  protected createPipeline(): Observable<DataPacket> {
    return this.input$.pipe(
      // Only process when running
      rxFilter(() => this.status$.value === 'running'),

      // Update input metrics
      tap(() => this.updateMetric('packetsIn')),

      // Apply timeout if configured
      this.config.timeout ? timeout(this.config.timeout) : tap(),

      // Process the packet
      mergeMap((packet) => {
        const result$ = of(packet).pipe(this.createProcessingOperator());
        return result$;
      }),

      // Filter out null packets
      rxFilter((packet): packet is DataPacket => packet !== null),

      // Apply retry policy if configured
      this.config.retryPolicy
        ? retry({
            count: this.config.retryPolicy.maxRetries,
            delay: (error, retryCount) => {
              const delay = Math.min(this.config.retryPolicy!.initialDelay * Math.pow(this.config.retryPolicy!.backoffMultiplier, retryCount), this.config.retryPolicy!.maxDelay);
              return of(null).pipe(
                tap(() => null),
                map(() => delay)
              );
            },
          })
        : tap(),

      // Handle errors
      catchError((error, caught) => {
        this.updateMetric('packetsErrored');
        return this.handlePacketError(error, caught as any) as Observable<DataPacket>;
      }),

      // Update output metrics
      tap(() => this.updateMetric('packetsOut')),

      // Share the stream among multiple subscribers
      share()
    );
  }

  /**
   * Create the processing operator for this node type
   */
  protected abstract createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;

  /**
   * Start processing
   */
  async start(): Promise<void> {
    if (this.status$.value === 'running') return;

    this.status$.next('running');
    await this.onStart();
  }

  /**
   * Pause processing
   */
  async pause(): Promise<void> {
    if (this.status$.value !== 'running') return;

    this.status$.next('paused');
    await this.onPause();
  }

  /**
   * Resume processing
   */
  async resume(): Promise<void> {
    if (this.status$.value !== 'paused') return;

    this.status$.next('running');
    await this.onResume();
  }

  /**
   * Stop processing
   */
  async stop(): Promise<void> {
    this.status$.next('completed');
    await this.onStop();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Get the input observable
   */
  getInput$(): Subject<DataPacket> {
    return this.input$;
  }

  /**
   * Get the output observable
   */
  getOutput$(): Observable<DataPacket> {
    return this.output$.asObservable();
  }

  /**
   * Get status observable
   */
  getStatus$(): Observable<NodeStatus> {
    return this.status$.asObservable();
  }

  /**
   * Get metrics observable
   */
  getMetrics$(): Observable<NodeMetrics> {
    return this.metrics$.asObservable();
  }

  /**
   * Get current status
   */
  getStatus(): NodeStatus {
    return this.status$.value;
  }

  /**
   * Get current metrics
   */
  getMetrics(): NodeMetrics {
    return { ...this.metrics$.value };
  }

  /**
   * Process a single packet
   */
  process(packet: DataPacket): void {
    this.input$.next(packet);
  }

  /**
   * Handle errors
   */
  protected handleError(error: Error, packet?: DataPacket): void {
    console.error(`Error in node ${this.config.id}:`, error);
    this.status$.next('error');
  }

  /**
   * Handle packet-level errors
   */
  protected handlePacketError(error: Error, caught: Observable<DataPacket>): Observable<DataPacket> {
    console.error(`Packet error in node ${this.config.id}:`, error);

    if (this.config.retryPolicy) {
      // Retry will handle it
      return throwError(() => error);
    }

    // Drop the packet
    this.updateMetric('packetsDropped');
    return EMPTY as Observable<DataPacket>;
  }

  /**
   * Update a metric
   */
  protected updateMetric(metric: keyof NodeMetrics, value?: number): void {
    const currentMetrics = this.metrics$.value;

    if (typeof currentMetrics[metric] === 'number') {
      (currentMetrics[metric] as number) = value ?? (currentMetrics[metric] as number) + 1;
    }

    if (metric === 'packetsIn' || metric === 'packetsOut') {
      currentMetrics.lastProcessedAt = Date.now();
    }

    this.metrics$.next(currentMetrics);
  }

  /**
   * Create a buffering operator based on config
   */
  protected createBufferOperator<T>(): (source: Observable<T>) => Observable<T[]> {
    if (!this.requiresBuffering()) {
      return (source) => source.pipe(map((item) => [item]));
    }

    const bufferSize = this.config.bufferSize || 1000;

    switch (this.getBufferStrategy()) {
      case 'time':
        return (source) => source.pipe(bufferTime(this.getBufferDuration(), undefined, bufferSize));

      case 'count':
        return (source) => source.pipe(bufferCount(this.getBufferSize(), undefined));

      default:
        return (source) => source.pipe(buffer(this.getBufferTrigger$()));
    }
  }

  // Methods that can be overridden by subclasses
  protected requiresBuffering(): boolean {
    return false;
  }

  protected getBufferStrategy(): 'time' | 'count' | 'custom' {
    return 'count';
  }

  protected getBufferSize(): number {
    return this.config.bufferSize || 100;
  }

  protected getBufferDuration(): number {
    return 1000; // 1 second default
  }

  protected getBufferTrigger$(): Observable<any> {
    return EMPTY;
  }

  // Abstract lifecycle methods
  protected abstract onInitialize(): Promise<void>;
  protected abstract onStart(): Promise<void>;
  protected abstract onPause(): Promise<void>;
  protected abstract onResume(): Promise<void>;
  protected abstract onStop(): Promise<void>;
}
