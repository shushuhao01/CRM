/**
 * 企微对外收款记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_payment_records')
export class WecomPaymentRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'corp_id', type: 'varchar', length: 50, comment: '企业ID' })
  corpId: string;

  @Column({ name: 'payment_no', type: 'varchar', length: 100, comment: '收款单号' })
  paymentNo: string;

  @Column({ name: 'user_id', type: 'varchar', length: 100, comment: '收款成员UserID' })
  userId: string;

  @Column({ name: 'user_name', type: 'varchar', length: 100, nullable: true, comment: '收款成员姓名' })
  userName: string;

  @Column({ name: 'external_user_id', type: 'varchar', length: 100, nullable: true, comment: '付款人外部联系人ID' })
  externalUserId: string;

  @Column({ name: 'payer_name', type: 'varchar', length: 100, nullable: true, comment: '付款人昵称' })
  payerName: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, comment: '收款金额(元)' })
  amount: number;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '收款备注' })
  remark: string;

  @Column({ type: 'varchar', length: 20, comment: '支付状态: pending/paid/refunded' })
  status: string;

  @Column({ name: 'pay_time', type: 'datetime', nullable: true, comment: '支付时间' })
  payTime: Date;

  @Column({ name: 'refund_time', type: 'datetime', nullable: true, comment: '退款时间' })
  refundTime: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
