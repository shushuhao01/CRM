import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';
import { OrderStatusHistory } from './OrderStatusHistory';
import { LogisticsTracking } from './LogisticsTracking';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'order_number', length: 50, unique: true, comment: '订单号' })
  orderNumber: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 50, comment: '客户ID' })
  customerId: string;

  @Column({ name: 'customer_name', length: 100, nullable: true, comment: '客户姓名' })
  customerName?: string;

  @Column({ name: 'customer_phone', length: 20, nullable: true, comment: '客户电话' })
  customerPhone?: string;

  @Column({ name: 'service_wechat', length: 100, nullable: true, comment: '客服微信号' })
  serviceWechat?: string;

  @Column({ name: 'order_source', length: 50, nullable: true, comment: '订单来源' })
  orderSource?: string;

  @Column({ type: 'json', nullable: true, comment: '商品列表' })
  products?: any[];

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending',
    comment: '订单状态'
  })
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '订单总金额' })
  totalAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' })
  discountAmount: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '实付金额' })
  finalAmount: number;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '定金金额' })
  depositAmount: number;

  @Column({
    name: 'payment_status',
    type: 'varchar',
    length: 50,
    default: 'unpaid',
    comment: '支付状态'
  })
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';

  @Column({
    name: 'payment_method',
    type: 'varchar',
    length: 50,
    nullable: true,
    comment: '支付方式'
  })
  paymentMethod?: 'cash' | 'alipay' | 'wechat' | 'bank_transfer' | 'credit_card' | 'other';

  @Column({ name: 'payment_time', type: 'datetime', nullable: true, comment: '支付时间' })
  paymentTime?: Date;

  @Column({ name: 'shipping_name', length: 100, nullable: true, comment: '收货人姓名' })
  shippingName?: string;

  @Column({ name: 'shipping_phone', length: 20, nullable: true, comment: '收货人电话' })
  shippingPhone?: string;

  @Column({ name: 'shipping_address', type: 'text', nullable: true, comment: '收货地址' })
  shippingAddress?: string;

  @Column({ name: 'express_company', length: 50, nullable: true, comment: '快递公司' })
  expressCompany?: string;

  @Column({ name: 'tracking_number', length: 100, nullable: true, comment: '快递单号' })
  trackingNumber?: string;

  @Column({ name: 'shipped_at', type: 'datetime', nullable: true, comment: '发货时间' })
  shippedAt?: Date;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true, comment: '签收时间' })
  deliveredAt?: Date;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true, comment: '取消时间' })
  cancelledAt?: Date;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true, comment: '取消原因' })
  cancelReason?: string;

  @Column({ name: 'mark_type', length: 20, default: 'normal', comment: '订单标记类型' })
  markType?: string;

  @Column({ type: 'text', nullable: true, comment: '订单备注' })
  remark?: string;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人ID' })
  createdBy?: string;

  @Column({ name: 'created_by_name', length: 50, nullable: true, comment: '创建人姓名' })
  createdByName?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Customer, customer => customer.orders)
  @JoinColumn({ name: 'customer_id' })
  customer: Customer;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  orderItems: OrderItem[];

  @OneToMany(() => OrderStatusHistory, history => history.order)
  statusHistory: OrderStatusHistory[];

  @OneToMany(() => LogisticsTracking, tracking => tracking.order)
  logisticsTracking: LogisticsTracking[];
}
