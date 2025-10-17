import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Customer } from './Customer';
import { OrderItem } from './OrderItem';
import { OrderStatusHistory } from './OrderStatusHistory';
import { LogisticsTracking } from './LogisticsTracking';

@Entity('orders')
export class Order {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true, comment: '订单号' })
  orderNo: string;

  @Column({ type: 'int', comment: '客户ID' })
  customerId: number;

  @Column({ 
    type: 'varchar',
    length: 50, 
    default: 'pending',
    comment: '订单状态'
  })
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '订单总金额' })
  totalAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' })
  discountAmount: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '运费' })
  shippingFee: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '实付金额' })
  paidAmount: number;

  @Column({ 
    type: 'varchar',
    length: 50, 
    default: 'unpaid',
    comment: '支付状态'
  })
  paymentStatus: 'unpaid' | 'partial' | 'paid' | 'refunded';

  @Column({ 
    type: 'varchar',
    length: 50, 
    nullable: true,
    comment: '支付方式'
  })
  paymentMethod?: 'cash' | 'alipay' | 'wechat' | 'bank_transfer' | 'credit_card' | 'other';

  @Column({ type: 'datetime', nullable: true, comment: '支付时间' })
  paidAt?: Date;

  @Column({ length: 100, nullable: true, comment: '收货人姓名' })
  receiverName?: string;

  @Column({ length: 20, nullable: true, comment: '收货人电话' })
  receiverPhone?: string;

  @Column({ length: 200, nullable: true, comment: '收货地址' })
  receiverAddress?: string;

  @Column({ type: 'datetime', nullable: true, comment: '期望交货时间' })
  expectedDeliveryAt?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '实际交货时间' })
  actualDeliveryAt?: Date;

  @Column({ type: 'text', nullable: true, comment: '订单备注' })
  notes?: string;

  @Column({ type: 'int', nullable: true, comment: '销售员ID' })
  salesUserId?: number;

  @Column({ type: 'json', nullable: true, comment: '订单标签（JSON数组）' })
  tags?: string[];

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Customer, customer => customer.orders)
  @JoinColumn({ name: 'customerId' })
  customer: Customer;

  @OneToMany(() => OrderItem, orderItem => orderItem.order)
  orderItems: OrderItem[];

  @OneToMany(() => OrderStatusHistory, history => history.order)
  statusHistory: OrderStatusHistory[];

  @OneToMany(() => LogisticsTracking, tracking => tracking.order)
  logisticsTracking: LogisticsTracking[];
}