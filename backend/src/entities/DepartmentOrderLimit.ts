import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('department_order_limits')
export class DepartmentOrderLimit {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id!: string;

  @Column({ name: 'department_id', type: 'varchar', length: 50 })
  departmentId!: string;

  @Column({ name: 'department_name', type: 'varchar', length: 100, nullable: true })
  departmentName?: string;

  // 下单次数限制
  @Column({ name: 'order_count_enabled', type: 'boolean', default: false })
  orderCountEnabled!: boolean;

  @Column({ name: 'max_order_count', type: 'int', default: 0 })
  maxOrderCount!: number;

  // 单笔金额限制
  @Column({ name: 'single_amount_enabled', type: 'boolean', default: false })
  singleAmountEnabled!: boolean;

  @Column({ name: 'max_single_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  maxSingleAmount!: number;

  // 累计金额限制
  @Column({ name: 'total_amount_enabled', type: 'boolean', default: false })
  totalAmountEnabled!: boolean;

  @Column({ name: 'max_total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 })
  maxTotalAmount!: number;

  // 配置状态
  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled!: boolean;

  @Column({ type: 'text', nullable: true })
  remark?: string;

  // 审计字段
  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true })
  createdBy?: string;

  @Column({ name: 'created_by_name', type: 'varchar', length: 50, nullable: true })
  createdByName?: string;

  @Column({ name: 'updated_by', type: 'varchar', length: 50, nullable: true })
  updatedBy?: string;

  @Column({ name: 'updated_by_name', type: 'varchar', length: 50, nullable: true })
  updatedByName?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}
