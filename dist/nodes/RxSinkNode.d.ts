import { Observable } from 'rxjs';
import { RxBaseNode } from './RxBaseNode';
import { SinkNodeConfig, DataPacket } from '../core/types';
/**
 * RxJS-based Sink node
 */
export declare class RxSinkNode extends RxBaseNode<SinkNodeConfig> {
    private sinkFn?;
    protected onInitialize(): Promise<void>;
    protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
}
//# sourceMappingURL=RxSinkNode.d.ts.map