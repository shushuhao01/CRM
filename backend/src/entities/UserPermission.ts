import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm'
import { User } from './User'
import { Permission } from './Permission'

@Entity('user_permissions')
export class UserPermission {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: number

  @Column()
  permissionId: number

  @Column({ nullable: true })
  grantedBy: number

  @Column({ type: 'text', nullable: true })
  reason: string

  @CreateDateColumn()
  grantedAt: Date

  // 关联用户（移除反向关联，因为User实体没有personalPermissions字段）
  @ManyToOne(() => User)
  @JoinColumn({ name: 'userId' })
  user: User

  // 关联权限
  @ManyToOne(() => Permission)
  @JoinColumn({ name: 'permissionId' })
  permission: Permission

  // 授权人
  @ManyToOne(() => User)
  @JoinColumn({ name: 'grantedBy' })
  grantor: User
}
