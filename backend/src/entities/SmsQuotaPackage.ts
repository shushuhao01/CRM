import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sms_quota_packages')
export class SmsQuotaPackage {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 100, comment: '套餐名称' })
  name: string;

  @Column('int', { name: 'sms_count', comment: '短信条数' })
  smsCount: number;

  @Column('decimal', { precision: 10, scale: 2, comment: '套餐价格(元)' })
  price: number;

  @Column('decimal', { precision: 10, scale: 4, name: 'unit_price', default: 0, comment: '单条价格(元)' })
  unitPrice: number;

  @Column('varchar', { length: 500, nullable: true, comment: '套餐描述' })
  description: string | null;

  @Column('int', { name: 'sort_order', default: 0, comment: '排序' })
  sortOrder: number;

  @Column('tinyint', { name: 'is_enabled', default: 1, comment: '是否启用' })
  isEnabled: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

