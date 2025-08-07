import { Observable } from 'rxjs';
import { RxBaseNode } from './RxBaseNode';
import { TransformNodeConfig, DataPacket } from '../core/types';
/**
 * RxJS-based Transform node
 */
export declare class RxTransformNode extends RxBaseNode<TransformNodeConfig> {
    private transformFn?;
    protected onInitialize(): Promise<void>;
    protected createProcessingOperator(): (source: Observable<DataPacket>) => Observable<DataPacket | null>;
    private updateLatencyMetric;
    protected onStart(): Promise<void>;
    protected onPause(): Promise<void>;
    protected onResume(): Promise<void>;
    protected onStop(): Promise<void>;
}
//# sourceMappingURL=RxTransformNode.d.ts.map