import { Order } from './Order';
export declare class OrderStatusHistory {
    id: number;
    orderId: string;
    status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';
    notes?: string;
    operatorId?: number;
    operatorName?: string;
    createdAt: Date;
    order: Order;
}
//# sourceMappingURL=OrderStatusHistory.d.ts.map