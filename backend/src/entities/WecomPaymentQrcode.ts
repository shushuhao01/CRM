/**
 * 企微收款码实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_payment_qrcodes')
@Index('IDX_wecom_qrcode_tenant', ['tenantId'])
@Index('IDX_wecom_qrcode_config', ['wecomConfigId'])
export class WecomPaymentQrcode {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int' })
  wecomConfigId: number;

  @Column({ type: 'varchar', length: 100, comment: '收款码名称' })
  name: string;

  @Column({ name: 'amount_type', type: 'varchar', length: 20, default: 'custom', comment: 'fixed/custom' })
  amountType: string;

  @Column({ name: 'fixed_amount', type: 'int', default: 0, comment: '固定金额(分)' })
  fixedAmount: number;

  @Column({ type: 'varchar', length: 500, nullable: true, comment: '收款码描述' })
  description: string;

  @Column({ name: 'member_user_ids', type: 'text', nullable: true, comment: '使用成员UserID JSON数组' })
  memberUserIds: string;

  @Column({ name: 'member_names', type: 'varchar', length: 500, nullable: true, comment: '使用成员姓名' })
  memberNames: string;

  @Column({ name: 'remark_template', type: 'varchar', length: 200, nullable: true, comment: '备注模板' })
  remarkTemplate: string;

  @Column({ name: 'qr_url', type: 'varchar', length: 500, nullable: true, comment: '二维码URL' })
  qrUrl: string;

  @Column({ name: 'total_amount', type: 'bigint', default: 0, comment: '累计收款(分)' })
  totalAmount: number;

  @Column({ name: 'total_count', type: 'int', default: 0, comment: '累计笔数' })
  totalCount: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

