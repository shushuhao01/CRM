/**
 * 企微对外收款记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_payment_records')
@Index('IDX_wecom_payment_tenant', ['tenantId'])
@Index('IDX_wecom_payment_no', ['paymentNo'], { unique: true })
@Index('IDX_wecom_payment_config_status', ['wecomConfigId', 'status'])
@Index('IDX_wecom_payment_pay_time', ['payTime'])
export class WecomPaymentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'payment_no', type: 'varchar', length: 100, comment: '收款单号' })
  paymentNo: string;

  @Column({ name: 'trade_no', type: 'varchar', length: 100, nullable: true, comment: '微信交易单号' })
  tradeNo: string;

  @Column({ name: 'user_id', type: 'varchar', length: 100, comment: '收款成员UserID' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 100, nullable: true, comment: '收款成员姓名' })
  userName: string;

  @Column({ name: 'department_id', type: 'int', nullable: true, comment: '收款人所属部门ID' })
  departmentId: number;

  @Column({ name: 'department_name', type: 'varchar', length: 100, nullable: true, comment: '部门名称' })
  departmentName: string;

  @Column({ name: 'external_user_id', type: 'varchar', length: 100, nullable: true, comment: '付款人外部联系人ID' })
  externalUserId: string;

  @Column({ name: 'payer_name', type: 'varchar', length: 100, nullable: true, comment: '付款人昵称' })
  payerName: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true, comment: '客户名称(CRM)' })
  customerName: string;

  @Column({ type: 'int', default: 0, comment: '收款金额(分)' })
  amount: number;

  @Column({ name: 'pay_method', type: 'varchar', length: 30, nullable: true, comment: '支付方式' })
  payMethod: string;

  @Column({ name: 'currency', type: 'varchar', length: 10, default: 'CNY', comment: '币种' })
  currency: string;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '收款备注' })
  remark: string;

  @Column({ type: 'varchar', length: 20, comment: '支付状态: pending/paid/refunded/cancelled' })
  status: string;

  @Column({ name: 'pay_time', type: 'datetime', nullable: true, comment: '支付时间' })
  payTime: Date;

  @Column({ name: 'refund_time', type: 'datetime', nullable: true, comment: '退款时间' })
  refundTime: Date;

  @Column({ name: 'refund_amount', type: 'int', default: 0, comment: '已退款金额(分)' })
  refundAmount: number;

  @Column({ name: 'qrcode_id', type: 'int', nullable: true, comment: '关联收款码ID' })
  qrcodeId: number;

  @Column({ name: 'crm_order_no', type: 'varchar', length: 100, nullable: true, comment: '关联CRM订单号' })
  crmOrderNo: string;

  @Column({ name: 'crm_customer_id', type: 'int', nullable: true, comment: '关联CRM客户ID' })
  crmCustomerId: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
