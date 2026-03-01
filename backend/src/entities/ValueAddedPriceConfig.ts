import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('value_added_price_config')
export class ValueAddedPriceConfig {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 50, name: 'company_id' })
  companyId: string;

  @Column('varchar', { length: 100, name: 'tier_name' })
  tierName: string;

  @Column('int', { default: 1, name: 'tier_order' })
  tierOrder: number;

  // 计价方式
  @Column('varchar', { length: 20, default: 'fixed', name: 'pricing_type' })
  pricingType: string; // 'fixed' | 'percentage'

  @Column('decimal', { precision: 10, scale: 2, default: 0, name: 'unit_price' })
  unitPrice: number;

  @Column('decimal', { precision: 5, scale: 2, default: 0, name: 'percentage_rate' })
  percentageRate: number;

  @Column('varchar', { length: 50, default: 'orderAmount', name: 'base_amount_field' })
  baseAmountField: string;

  // 生效时间
  @Column('date', { nullable: true, name: 'start_date' })
  startDate: string | null;

  @Column('date', { nullable: true, name: 'end_date' })
  endDate: string | null;

  @Column('tinyint', { default: 1, name: 'is_active' })
  isActive: number;

  // 优先级
  @Column('int', { default: 0 })
  priority: number;

  @Column('text', { nullable: true, name: 'condition_rules' })
  conditionRules: string | null;

  @Column('text', { nullable: true })
  remark: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'created_by' })
  createdBy: string | null;

  @Column('varchar', { length: 100, nullable: true, name: 'created_by_name' })
  createdByName: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
