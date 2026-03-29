import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm'

@Entity('value_added_status_configs')
export class ValueAddedStatusConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true })
  tenantId: string | null

  @Column({ type: 'varchar', length: 50, comment: '配置类型: validStatus-有效状态, settlementStatus-结算状态' })
  type!: string

  @Column({ type: 'varchar', length: 100, comment: '状态值' })
  value!: string

  @Column({ type: 'varchar', length: 100, comment: '状态标签' })
  label!: string

  @Column({ type: 'int', default: 999, name: 'sort_order', comment: '排序顺序' })
  sortOrder!: number

  @Column({ type: 'tinyint', default: 0, name: 'is_system', comment: '是否系统预设: 0-否, 1-是(不可删除)' })
  isSystem!: number

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date
}
