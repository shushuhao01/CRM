import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('tenant_packages')
export class Package {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 100, comment: '套餐名称' })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: '套餐代码（唯一标识）' })
  code!: string;

  @Column({
    type: 'enum',
    enum: ['saas', 'private'],
    default: 'saas',
    comment: '套餐类型：saas-SaaS云端版，private-私有部署版'
  })
  type!: 'saas' | 'private';

  @Column({ type: 'text', nullable: true, comment: '套餐描述' })
  description?: string;

  @Column({ type: 'decimal', precision: 10, scale: 2, default: 0, comment: '价格' })
  price!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '原价（用于显示折扣）' })
  original_price?: number;

  @Column({
    type: 'enum',
    enum: ['monthly', 'yearly', 'once'],
    default: 'monthly',
    comment: '计费周期：monthly-月付，yearly-年付，once-一次性'
  })
  billing_cycle!: 'monthly' | 'yearly' | 'once';

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 0, comment: '年付折扣率（0-100，例如20表示8折）' })
  yearly_discount_rate!: number;

  @Column({ type: 'int', default: 0, comment: '年付赠送月数' })
  yearly_bonus_months!: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '年付价格（如果为NULL则自动计算）' })
  yearly_price?: number;

  @Column({ type: 'int', default: 30, comment: '有效期（天）' })
  duration_days!: number;

  @Column({ type: 'int', default: 10, comment: '最大用户数' })
  max_users!: number;

  @Column({ type: 'int', default: 5, comment: '最大存储空间（GB）' })
  max_storage_gb!: number;

  @Column({
    type: 'enum',
    enum: ['total', 'online', 'both'],
    default: 'total',
    name: 'user_limit_mode',
    comment: '用户限制模式：total-总用户数限制，online-在线席位限制，both-两种都支持(租户自选)'
  })
  user_limit_mode!: 'total' | 'online' | 'both';

  @Column({ type: 'int', default: 0, name: 'max_online_seats', comment: '最大在线席位数（user_limit_mode=online时生效）' })
  max_online_seats!: number;

  @Column({ type: 'json', nullable: true, comment: '功能特性列表（JSON数组）' })
  features?: string[];

  @Column({ type: 'json', nullable: true, comment: '模块列表（JSON数组）' })
  modules?: string[];

  @Column({ type: 'tinyint', width: 1, default: 0, comment: '是否为试用套餐' })
  is_trial!: boolean;

  @Column({ type: 'tinyint', width: 1, default: 0, comment: '是否为推荐套餐' })
  is_recommended!: boolean;

  @Column({ type: 'tinyint', width: 1, default: 1, comment: '是否在官网显示' })
  is_visible!: boolean;

  @Column({ type: 'int', default: 0, comment: '排序（数字越小越靠前）' })
  sort_order!: number;

  @Column({ type: 'tinyint', width: 1, default: 1, comment: '状态：1-启用，0-禁用' })
  status!: boolean;

  @CreateDateColumn({ type: 'timestamp', comment: '创建时间' })
  created_at!: Date;

  @UpdateDateColumn({ type: 'timestamp', comment: '更新时间' })
  updated_at!: Date;
}
