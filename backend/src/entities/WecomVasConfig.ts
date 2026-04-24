/**
 * 企微增值服务配置实体 (Admin专属)
 */
import { Entity, PrimaryGeneratedColumn, Column, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_vas_configs')
@Index('IDX_wecom_vc_service_type', ['serviceType'], { unique: true })
export class WecomVasConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'service_type', type: 'varchar', length: 50, comment: '服务类型' })
  serviceType: string;

  @Column({ name: 'service_name', type: 'varchar', length: 100, nullable: true, comment: '服务名称' })
  serviceName: string;

  @Column({ name: 'default_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '默认价格' })
  defaultPrice: number;

  @Column({ name: 'min_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '最低价格' })
  minPrice: number;

  @Column({ name: 'billing_unit', type: 'varchar', length: 20, default: 'per_user_year', comment: '计费单位' })
  billingUnit: string;

  @Column({ name: 'trial_days', type: 'int', default: 7, comment: '试用天数' })
  trialDays: number;

  @Column({ name: 'tier_pricing', type: 'text', nullable: true, comment: '阶梯定价(JSON)' })
  tierPricing: string;

  @Column({ type: 'text', nullable: true, comment: '服务说明' })
  description: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

