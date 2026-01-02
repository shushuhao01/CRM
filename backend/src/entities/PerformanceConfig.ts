import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('performance_config')
export class PerformanceConfig {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'config_type', length: 20, comment: '配置类型: status-有效状态, coefficient-系数, remark-备注' })
  configType: string;

  @Column({ name: 'config_value', length: 50, comment: '配置值' })
  configValue: string;

  @Column({ name: 'config_label', length: 50, nullable: true, comment: '显示标签' })
  configLabel?: string;

  @Column({ name: 'sort_order', type: 'int', default: 0, comment: '排序' })
  sortOrder: number;

  @Column({ name: 'is_active', type: 'tinyint', default: 1, comment: '是否启用' })
  isActive: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
