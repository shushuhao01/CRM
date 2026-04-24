/**
 * 企微增值服务订单实体 (SaaS专属)
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_vas_orders')
@Index('IDX_wecom_vo_order_no', ['orderNo'], { unique: true })
@Index('IDX_wecom_vo_tenant', ['tenantId'])
@Index('IDX_wecom_vo_pay_status', ['payStatus'])
export class WecomVasOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, comment: '租户ID' })
  tenantId: string;

  @Column({ name: 'order_no', type: 'varchar', length: 32, comment: '订单号' })
  orderNo: string;

  @Column({ name: 'wecom_config_id', type: 'int', nullable: true, comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'service_type', type: 'varchar', length: 50, default: 'chat_archive', comment: '服务类型' })
  serviceType: string;

  @Column({ name: 'order_type', type: 'varchar', length: 20, default: 'new', comment: '订单类型: new/renew/upgrade/addon' })
  orderType: string;

  @Column({ name: 'user_count', type: 'int', default: 0, comment: '开通/增购人数' })
  userCount: number;

  @Column({ name: 'unit_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '单价' })
  unitPrice: number;

  @Column({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '总金额' })
  totalAmount: number;

  @Column({ name: 'pay_type', type: 'varchar', length: 20, nullable: true, comment: '支付方式: wechat/alipay/bank' })
  payType: string;

  @Column({ name: 'pay_status', type: 'tinyint', default: 0, comment: '0待支付 1已支付 2已取消 3已退款' })
  payStatus: number;

  @Column({ name: 'pay_time', type: 'datetime', nullable: true, comment: '支付时间' })
  payTime: Date;

  @Column({ name: 'transaction_id', type: 'varchar', length: 64, nullable: true, comment: '第三方支付流水号' })
  transactionId: string;

  @Column({ name: 'start_date', type: 'date', nullable: true, comment: '服务开始日期' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'date', nullable: true, comment: '服务到期日期' })
  endDate: Date;

  @Column({ type: 'text', nullable: true, comment: '订单详情(JSON)' })
  detail: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

