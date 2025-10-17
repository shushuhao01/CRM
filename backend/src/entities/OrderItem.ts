import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { Product } from './Product';

@Entity('order_items')
export class OrderItem {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '订单ID' })
  orderId: number;

  @Column({ type: 'int', comment: '产品ID' })
  productId: number;

  @Column({ length: 100, comment: '产品名称（快照）' })
  productName: string;

  @Column({ length: 50, comment: '产品SKU（快照）' })
  productSku: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '单价（快照）' })
  unitPrice: number;

  @Column({ type: 'int', comment: '数量' })
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '小计金额' })
  subtotal: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' })
  discountAmount: number;

  @Column({ type: 'text', nullable: true, comment: '备注' })
  notes?: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Order, order => order.orderItems)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @ManyToOne(() => Product, product => product.orderItems)
  @JoinColumn({ name: 'productId' })
  product: Product;
}