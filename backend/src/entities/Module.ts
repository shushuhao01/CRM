import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany } from 'typeorm';
import { ModuleConfig } from './ModuleConfig';

@Entity('modules')
export class Module {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 100, comment: '模块名称' })
  name!: string;

  @Column({ type: 'varchar', length: 50, unique: true, comment: '模块代码' })
  code!: string;

  @Column({ type: 'text', nullable: true, comment: '模块描述' })
  description?: string;

  @Column({ type: 'varchar', length: 100, nullable: true, comment: '模块图标' })
  icon?: string;

  @Column({ type: 'varchar', length: 20, nullable: true, comment: '模块版本' })
  version?: string;

  @Column({
    type: 'enum',
    enum: ['enabled', 'disabled'],
    default: 'enabled',
    comment: '状态'
  })
  status!: 'enabled' | 'disabled';

  @Column({ type: 'boolean', default: false, name: 'is_system', comment: '是否系统模块' })
  isSystem!: boolean;

  @Column({ type: 'int', default: 0, name: 'sort_order', comment: '排序' })
  sortOrder!: number;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;

  @OneToMany(() => ModuleConfig, config => config.module)
  configs?: ModuleConfig[];
}
