import { Observable } from 'rxjs';
import { RxBaseNode } from '@/nodes/RxBaseNode';
import { FilterNodeConfig, DataPacket } from '@/core/types';
/**
 * RxJS-based Filter node
 */
export declare class RxFilterNode extends RxBaseNode<FilterNodeConfig> {
    private filterFn?;
    protected onInitialize(): Promise<void>;
    protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
}
//# sourceMappingURL=RxFilterNode.d.ts.map