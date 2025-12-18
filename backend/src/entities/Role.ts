import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm'

@Entity('roles')
export class Role {
  @PrimaryColumn('varchar', { length: 50 })
  id: string

  @Column({ unique: true, length: 50 })
  name: string

  @Column({ unique: true, length: 50 })
  code: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ default: 'active' })
  status: 'active' | 'inactive'

  @Column({ default: 0 })
  level: number

  @Column({ nullable: true, length: 20 })
  color: string

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 使用 JSON 字段存储权限（与数据库表结构一致）
  @Column('json', { nullable: true })
  permissions: string[] | null
}
