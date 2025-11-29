import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToMany, JoinTable, OneToMany } from 'typeorm'
import { User } from './User'
import { Permission } from './Permission'

@Entity('roles')
export class Role {
  @PrimaryGeneratedColumn()
  id: number

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

  // 角色拥有的权限
  @ManyToMany(() => Permission, permission => permission.roles)
  @JoinTable({
    name: 'role_permissions',
    joinColumn: { name: 'roleId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'permissionId', referencedColumnName: 'id' }
  })
  permissions: Permission[]

  // 拥有此角色的用户（注释掉，因为User实体使用字符串role而不是关联）
  // @ManyToMany(() => User, user => user.roles)
  // users: User[]
}
