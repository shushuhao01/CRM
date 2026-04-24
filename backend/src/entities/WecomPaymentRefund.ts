/**
 * 企微对外收款退款记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_payment_refunds')
@Index('IDX_wecom_refund_tenant', ['tenantId'])
@Index('IDX_wecom_refund_no', ['refundNo'], { unique: true })
@Index('IDX_wecom_refund_payment', ['originalPaymentNo'])
export class WecomPaymentRefund {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ name: 'refund_no', type: 'varchar', length: 100, comment: '退款单号' })
  refundNo: string;

  @Column({ name: 'original_payment_no', type: 'varchar', length: 100, comment: '原收款单号' })
  originalPaymentNo: string;

  @Column({ name: 'original_trade_no', type: 'varchar', length: 100, nullable: true, comment: '原交易单号' })
  originalTradeNo: string;

  @Column({ name: 'payer_name', type: 'varchar', length: 100, nullable: true, comment: '原付款人' })
  payerName: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 100, nullable: true, comment: '操作人UserID' })
  operatorId: string;

  @Column({ name: 'operator_name', type: 'varchar', length: 100, nullable: true, comment: '操作人姓名' })
  operatorName: string;

  @Column({ name: 'original_amount', type: 'int', comment: '原交易金额(分)' })
  originalAmount: number;

  @Column({ name: 'refund_amount', type: 'int', comment: '退款金额(分)' })
  refundAmount: number;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '退款原因' })
  reason: string;

  @Column({ type: 'varchar', length: 20, default: 'processing', comment: 'processing/completed/rejected' })
  status: string;

  @Column({ name: 'refund_time', type: 'datetime', nullable: true, comment: '退款完成时间' })
  refundTime: Date;

  @Column({ name: 'reject_reason', type: 'varchar', length: 500, nullable: true, comment: '拒绝原因' })
  rejectReason: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

