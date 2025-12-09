import { Order } from './Order';
import { Product } from './Product';
export declare class OrderItem {
    id: number;
    orderId: string;
    productId: string;
    productName: string;
    productSku: string;
    unitPrice: number;
    quantity: number;
    subtotal: number;
    discountAmount: number;
    notes?: string;
    order: Order;
    product: Product;
}
//# sourceMappingURL=OrderItem.d.ts.map