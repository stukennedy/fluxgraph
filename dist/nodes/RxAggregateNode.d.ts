import { Observable } from 'rxjs';
import { RxBaseNode } from './RxBaseNode';
import { AggregateNodeConfig, DataPacket } from '../core/types';
/**
 * RxJS-based Aggregate node
 */
export declare class RxAggregateNode extends RxBaseNode<AggregateNodeConfig> {
    private aggregateFn?;
    private buffer;
    protected onInitialize(): Promise<void>;
    protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    protected requiresBuffering(): boolean;
    protected getBufferStrategy(): 'time' | 'count' | 'custom';
    protected getBufferSize(): number;
    protected getBufferDuration(): number;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
}
//# sourceMappingURL=RxAggregateNode.d.ts.map