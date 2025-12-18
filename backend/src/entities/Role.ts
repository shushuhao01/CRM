import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm'
import { User } from './User'
import { Permission } from './Permission'

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

  // 角色类型：system=系统预设, business=业务角色, custom=自定义角色
  @Column({ default: 'custom', length: 20 })
  roleType: 'system' | 'business' | 'custom'

  // 是否为模板（模板可以用于快速创建角色）
  @Column({ default: false })
  isTemplate: boolean

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 使用 JSON 字段存储权限（与数据库表结构一致）
  @Column('json', { nullable: true })
  permissions: string[] | null
}
