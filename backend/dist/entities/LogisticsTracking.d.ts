import { Order } from './Order';
import { LogisticsTrace } from './LogisticsTrace';
export declare enum LogisticsStatus {
    PENDING = "pending",// 待发货
    PICKED_UP = "picked_up",// 已揽件
    IN_TRANSIT = "in_transit",// 运输中
    OUT_FOR_DELIVERY = "out_for_delivery",// 派送中
    DELIVERED = "delivered",// 已签收
    EXCEPTION = "exception",// 包裹异常
    REJECTED = "rejected",// 拒收
    RETURNED = "returned"
}
export declare class LogisticsTracking {
    id: number;
    orderId: string;
    trackingNo: string;
    companyCode: string;
    companyName: string;
    status: LogisticsStatus;
    currentLocation?: string;
    statusDescription?: string;
    lastUpdateTime?: Date;
    estimatedDeliveryTime?: Date;
    actualDeliveryTime?: Date;
    signedBy?: string;
    extraInfo?: Record<string, any>;
    autoSyncEnabled: boolean;
    nextSyncTime?: Date;
    syncFailureCount: number;
    lastSyncError?: string;
    createdAt: Date;
    updatedAt: Date;
    order: Order;
    traces: LogisticsTrace[];
}
//# sourceMappingURL=LogisticsTracking.d.ts.map