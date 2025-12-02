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

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date

  // 角色拥有的权限（暂时注释掉，避免复杂的关联查询导致错误）
  // @ManyToMany(() => Permission, permission => permission.roles)
  // @JoinTable({
  //   name: 'role_permissions',
  //   joinColumn: { name: 'roleId', referencedColumnName: 'id' },
  //   inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' }
  // })
  // permissions: Permission[]

  // 使用 JSON 字段存储权限（与数据库表结构一致）
  @Column('json', { nullable: true })
  permissions: string[] | null

  // 拥有此角色的用户（注释掉，因为User实体使用字符串role而不是关联）
  // @ManyToMany(() => User, user => user.roles)
  // users: User[]
}
