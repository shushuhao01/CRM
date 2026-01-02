import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('commission_ladder')
export class CommissionLadder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'commission_type', type: 'enum', enum: ['amount', 'count'], default: 'amount', comment: '计提方式' })
  commissionType: 'amount' | 'count';

  @Column({ name: 'min_value', type: 'decimal', precision: 12, scale: 2, default: 0, comment: '阶梯起点' })
  minValue: number;

  @Column({ name: 'max_value', type: 'decimal', precision: 12, scale: 2, nullable: true, comment: '阶梯终点' })
  maxValue?: number;

  @Column({ name: 'commission_rate', type: 'decimal', precision: 5, scale: 4, nullable: true, comment: '提成比例' })
  commissionRate?: number;

  @Column({ name: 'commission_per_unit', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '单价' })
  commissionPerUnit?: number;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', default: 1, comment: '是否启用' })
  isActive: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
