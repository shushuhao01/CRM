import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, Tree, TreeParent, TreeChildren } from 'typeorm'
import { Role } from './Role'

@Entity('permissions')
@Tree('closure-table')
export class Permission {
  @PrimaryGeneratedColumn()
  id: number

  @Column({ length: 100 })
  name: string

  @Column({ unique: true, length: 100 })
  code: string

  @Column({ type: 'text', nullable: true })
  description: string

  @Column({ length: 50 })
  module: string

  @Column({ default: 'menu' })
  type: 'menu' | 'button' | 'api'

  @Column({ nullable: true, length: 200 })
  path: string

  @Column({ nullable: true, length: 50 })
  icon: string

  @Column({ default: 0 })
  sort: number

  @Column({ default: 'active' })
  status: 'active' | 'inactive'

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 树形结构
  @TreeParent()
  parent: Permission

  @TreeChildren()
  children: Permission[]

  // 拥有此权限的角色
  @ManyToMany(() => Role, role => role.permissions)
  roles: Role[]
}