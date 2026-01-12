import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany, JoinColumn, BeforeInsert, BeforeUpdate } from 'typeorm';
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
  products?: unknown[];

  @Column({
    type: 'varchar',
    length: 50,
    default: 'pending_transfer',
    comment: '订单状态'
  })
  status: 'pending' | 'pending_transfer' | 'pending_audit' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded' | 'audit_rejected' | 'pending_shipment' | 'logistics_returned' | 'logistics_cancelled';

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '订单总金额' })
  totalAmount: number;

  @Column({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' })
  discountAmount: number;

  @Column({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '实付金额' })
  finalAmount: number;

  @Column({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '定金金额' })
  depositAmount: number;

  @Column({ name: 'deposit_screenshots', type: 'json', nullable: true, comment: '定金截图' })
  depositScreenshots?: string[];

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

  @Column({ name: 'payment_method_other', type: 'varchar', length: 100, nullable: true, comment: '其他支付方式说明' })
  paymentMethodOther?: string;

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

  @Column({ name: 'shipping_time', type: 'varchar', length: 50, nullable: true, comment: '发货时间字符串' })
  shippingTime?: string;

  @Column({ name: 'expected_delivery_date', type: 'varchar', length: 20, nullable: true, comment: '预计送达日期' })
  expectedDeliveryDate?: string;

  @Column({ name: 'delivered_at', type: 'datetime', nullable: true, comment: '签收时间' })
  deliveredAt?: Date;

  @Column({ name: 'cancelled_at', type: 'datetime', nullable: true, comment: '取消时间' })
  cancelledAt?: Date;

  @Column({ name: 'cancel_reason', type: 'text', nullable: true, comment: '取消原因' })
  cancelReason?: string;

  @Column({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '退款金额' })
  refundAmount?: number;

  @Column({ name: 'refund_reason', type: 'text', nullable: true, comment: '退款原因' })
  refundReason?: string;

  @Column({ name: 'refund_time', type: 'datetime', nullable: true, comment: '退款时间' })
  refundTime?: Date;

  @Column({ name: 'invoice_type', length: 50, nullable: true, comment: '发票类型' })
  invoiceType?: string;

  @Column({ name: 'invoice_title', length: 200, nullable: true, comment: '发票抬头' })
  invoiceTitle?: string;

  @Column({ name: 'invoice_number', length: 100, nullable: true, comment: '发票号码' })
  invoiceNumber?: string;

  @Column({ name: 'mark_type', length: 20, default: 'normal', comment: '订单标记类型' })
  markType?: string;

  @Column({ name: 'logistics_status', length: 50, nullable: true, comment: '物流状态' })
  logisticsStatus?: string;

  @Column({ name: 'latest_logistics_info', type: 'varchar', length: 500, nullable: true, comment: '最新物流动态' })
  latestLogisticsInfo?: string;

  @Column({ name: 'is_todo', type: 'boolean', default: false, comment: '是否待办' })
  isTodo?: boolean;

  @Column({ name: 'todo_date', type: 'date', nullable: true, comment: '待办日期' })
  todoDate?: string;

  @Column({ name: 'todo_remark', type: 'text', nullable: true, comment: '待办备注' })
  todoRemark?: string;

  @Column({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段(旧版，保留兼容)' })
  customFields?: Record<string, unknown>;

  @Column({ name: 'custom_field1', type: 'varchar', length: 500, nullable: true, comment: '自定义字段1' })
  customField1?: string;

  @Column({ name: 'custom_field2', type: 'varchar', length: 500, nullable: true, comment: '自定义字段2' })
  customField2?: string;

  @Column({ name: 'custom_field3', type: 'varchar', length: 500, nullable: true, comment: '自定义字段3' })
  customField3?: string;

  @Column({ name: 'custom_field4', type: 'varchar', length: 500, nullable: true, comment: '自定义字段4' })
  customField4?: string;

  @Column({ name: 'custom_field5', type: 'varchar', length: 500, nullable: true, comment: '自定义字段5' })
  customField5?: string;

  @Column({ name: 'custom_field6', type: 'varchar', length: 500, nullable: true, comment: '自定义字段6' })
  customField6?: string;

  @Column({ name: 'custom_field7', type: 'varchar', length: 500, nullable: true, comment: '自定义字段7' })
  customField7?: string;

  @Column({ type: 'text', nullable: true, comment: '订单备注' })
  remark?: string;

  // 绩效相关字段
  @Column({ name: 'performance_status', length: 20, default: 'pending', comment: '绩效状态: pending-待处理, valid-有效, invalid-无效' })
  performanceStatus?: string;

  @Column({ name: 'performance_coefficient', type: 'decimal', precision: 3, scale: 2, default: 1.00, comment: '绩效系数' })
  performanceCoefficient?: number;

  @Column({ name: 'performance_remark', length: 200, nullable: true, comment: '绩效备注' })
  performanceRemark?: string;

  @Column({ name: 'estimated_commission', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '预估佣金' })
  estimatedCommission?: number;

  @Column({ name: 'performance_updated_at', type: 'datetime', nullable: true, comment: '绩效更新时间' })
  performanceUpdatedAt?: Date;

  @Column({ name: 'performance_updated_by', type: 'varchar', length: 50, nullable: true, comment: '绩效更新人ID' })
  performanceUpdatedBy?: string;

  // 代收相关字段
  @Column({ name: 'cod_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '代收金额' })
  codAmount?: number;

  @Column({ name: 'cod_status', type: 'varchar', length: 20, default: 'pending', comment: '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收' })
  codStatus?: string;

  @Column({ name: 'cod_returned_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '已返款金额' })
  codReturnedAmount?: number;

  @Column({ name: 'cod_returned_at', type: 'datetime', nullable: true, comment: '返款时间' })
  codReturnedAt?: Date;

  @Column({ name: 'cod_cancelled_at', type: 'datetime', nullable: true, comment: '取消代收时间' })
  codCancelledAt?: Date;

  @Column({ name: 'cod_remark', type: 'varchar', length: 500, nullable: true, comment: '代收备注' })
  codRemark?: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 50, nullable: true, comment: '操作员ID' })
  operatorId?: string;

  @Column({ name: 'operator_name', length: 50, nullable: true, comment: '操作员姓名' })
  operatorName?: string;

  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人ID' })
  createdBy?: string;

  @Column({ name: 'created_by_name', length: 50, nullable: true, comment: '创建人姓名' })
  createdByName?: string;

  @Column({ name: 'created_by_department_id', type: 'varchar', length: 50, nullable: true, comment: '创建人部门ID' })
  createdByDepartmentId?: string;

  @Column({ name: 'created_by_department_name', length: 100, nullable: true, comment: '创建人部门名称' })
  createdByDepartmentName?: string;

  @Column({ name: 'created_at', type: 'datetime', nullable: true, comment: '创建时间' })
  createdAt: Date;

  @Column({ name: 'updated_at', type: 'datetime', nullable: true, comment: '更新时间' })
  updatedAt: Date;

  @BeforeInsert()
  setCreatedAt() {
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  @BeforeUpdate()
  setUpdatedAt() {
    this.updatedAt = new Date();
  }

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
