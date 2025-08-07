import { Observable } from 'rxjs';
import { RxBaseNode } from '@/nodes/RxBaseNode';
import { SourceNodeConfig, DataPacket } from '@/core/types';
/**
 * RxJS-based Source node
 */
export declare class RxSourceNode extends RxBaseNode<SourceNodeConfig> {
    private sourceObservable?;
    protected onInitialize(): Promise<void>;
    protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
}
//# sourceMappingURL=RxSourceNode.d.ts.map