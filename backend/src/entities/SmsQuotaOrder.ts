import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sms_quota_orders')
export class SmsQuotaOrder {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 50, unique: true, name: 'order_no', comment: '订单号' })
  orderNo: string;

  @Column('varchar', { length: 36, nullable: true, name: 'tenant_id', comment: '租户ID' })
  tenantId: string | null;

  @Column('varchar', { length: 200, nullable: true, name: 'tenant_name', comment: '租户名称' })
  tenantName: string | null;

  @Column('varchar', { length: 36, nullable: true, name: 'package_id', comment: '套餐ID' })
  packageId: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'package_name', comment: '套餐名称' })
  packageName: string | null;

  @Column('int', { name: 'sms_count', default: 0, comment: '购买短信条数' })
  smsCount: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0, comment: '支付金额' })
  amount: number;

  @Column('varchar', { length: 20, name: 'pay_type', nullable: true, comment: '支付方式' })
  payType: string | null;

  @Column('varchar', { length: 20, default: 'pending', comment: '状态: pending/paid/refunded/closed' })
  status: string;

  @Column('text', { name: 'qr_code', nullable: true, comment: '支付二维码' })
  qrCode: string | null;

  @Column('text', { name: 'pay_url', nullable: true, comment: '支付链接' })
  payUrl: string | null;

  @Column('datetime', { name: 'paid_at', nullable: true, comment: '支付时间' })
  paidAt: Date | null;

  @Column('varchar', { length: 36, nullable: true, name: 'buyer_id', comment: '购买人ID' })
  buyerId: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'buyer_name', comment: '购买人姓名' })
  buyerName: string | null;

  @Column('varchar', { length: 20, default: 'crm', name: 'buyer_source', comment: '购买来源: crm/member' })
  buyerSource: string;

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'refund_amount', comment: '退款金额' })
  refundAmount: number;

  @Column('int', { default: 0, name: 'refund_sms_count', comment: '退款短信条数' })
  refundSmsCount: number;

  @Column('datetime', { name: 'refund_at', nullable: true, comment: '退款时间' })
  refundAt: Date | null;

  @Column('varchar', { length: 500, nullable: true, name: 'refund_reason', comment: '退款原因' })
  refundReason: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'refunded_by', comment: '退款操作人' })
  refundedBy: string | null;

  @Column('datetime', { name: 'expire_time', nullable: true, comment: '订单过期时间' })
  expireTime: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

