import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('payment_method_options')
export class PaymentMethodOption {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @Column({ type: 'varchar', length: 100, comment: '显示名称' })
  label: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: '选项值' })
  value: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序顺序' })
  sortOrder: number;

  @Column({ name: 'is_enabled', type: 'tinyint', default: 1, comment: '是否启用' })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
