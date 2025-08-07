import { Subject, BehaviorSubject, of, throwError, EMPTY } from 'rxjs';
import { tap, catchError, retry, timeout, buffer, bufferTime, bufferCount, share, takeUntil, filter as rxFilter, map, mergeMap } from 'rxjs/operators';
/**
 * RxJS-based base class for all graph nodes
 * Uses Observables for reactive stream processing
 */
export class RxBaseNode {
    config;
    status$ = new BehaviorSubject('idle');
    input$ = new Subject();
    output$ = new Subject();
    destroy$ = new Subject();
    metrics$ = new BehaviorSubject({
        packetsIn: 0,
        packetsOut: 0,
        packetsDropped: 0,
        packetsErrored: 0,
        averageLatency: 0,
        lastProcessedAt: undefined,
    });
    pipeline$;
    constructor(config) {
        this.config = config;
    }
    /**
     * Initialize the node and set up the processing pipeline
     */
    async initialize() {
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
    createPipeline() {
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
        rxFilter((packet) => packet !== null), 
        // Apply retry policy if configured
        this.config.retryPolicy
            ? retry({
                count: this.config.retryPolicy.maxRetries,
                delay: (error, retryCount) => {
                    const delay = Math.min(this.config.retryPolicy.initialDelay * Math.pow(this.config.retryPolicy.backoffMultiplier, retryCount), this.config.retryPolicy.maxDelay);
                    return of(null).pipe(tap(() => null), map(() => delay));
                },
            })
            : tap(), 
        // Handle errors
        catchError((error, caught) => {
            this.updateMetric('packetsErrored');
            return this.handlePacketError(error, caught);
        }), 
        // Update output metrics
        tap(() => this.updateMetric('packetsOut')), 
        // Share the stream among multiple subscribers
        share());
    }
    /**
     * Start processing
     */
    async start() {
        if (this.status$.value === 'running')
            return;
        this.status$.next('running');
        await this.onStart();
    }
    /**
     * Pause processing
     */
    async pause() {
        if (this.status$.value !== 'running')
            return;
        this.status$.next('paused');
        await this.onPause();
    }
    /**
     * Resume processing
     */
    async resume() {
        if (this.status$.value !== 'paused')
            return;
        this.status$.next('running');
        await this.onResume();
    }
    /**
     * Stop processing
     */
    async stop() {
        this.status$.next('completed');
        await this.onStop();
        this.destroy$.next();
        this.destroy$.complete();
    }
    /**
     * Get the input observable
     */
    getInput$() {
        return this.input$;
    }
    /**
     * Get the output observable
     */
    getOutput$() {
        return this.output$.asObservable();
    }
    /**
     * Get status observable
     */
    getStatus$() {
        return this.status$.asObservable();
    }
    /**
     * Get metrics observable
     */
    getMetrics$() {
        return this.metrics$.asObservable();
    }
    /**
     * Get current status
     */
    getStatus() {
        return this.status$.value;
    }
    /**
     * Get current metrics
     */
    getMetrics() {
        return { ...this.metrics$.value };
    }
    /**
     * Process a single packet
     */
    process(packet) {
        this.input$.next(packet);
    }
    /**
     * Handle errors
     */
    handleError(error, packet) {
        console.error(`Error in node ${this.config.id}:`, error);
        this.status$.next('error');
    }
    /**
     * Handle packet-level errors
     */
    handlePacketError(error, caught) {
        console.error(`Packet error in node ${this.config.id}:`, error);
        if (this.config.retryPolicy) {
            // Retry will handle it
            return throwError(() => error);
        }
        // Drop the packet
        this.updateMetric('packetsDropped');
        return EMPTY;
    }
    /**
     * Update a metric
     */
    updateMetric(metric, value) {
        const currentMetrics = this.metrics$.value;
        if (typeof currentMetrics[metric] === 'number') {
            currentMetrics[metric] = value ?? currentMetrics[metric] + 1;
        }
        if (metric === 'packetsIn' || metric === 'packetsOut') {
            currentMetrics.lastProcessedAt = Date.now();
        }
        this.metrics$.next(currentMetrics);
    }
    /**
     * Create a buffering operator based on config
     */
    createBufferOperator() {
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
    requiresBuffering() {
        return false;
    }
    getBufferStrategy() {
        return 'count';
    }
    getBufferSize() {
        return this.config.bufferSize || 100;
    }
    getBufferDuration() {
        return 1000; // 1 second default
    }
    getBufferTrigger$() {
        return EMPTY;
    }
}
