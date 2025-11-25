import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, ManyToMany, JoinColumn, JoinTable } from 'typeorm';
import { Department } from './Department';
import { OperationLog } from './OperationLog';
import { Role } from './Role';
import { UserPermission } from './UserPermission';

@Entity('users')
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 50, unique: true, comment: '用户名' })
  username: string;

  @Column({ length: 255, comment: '密码哈希' })
  password: string;

  @Column({ name: 'name', length: 50, comment: '真实姓名' })
  realName: string;

  @Column({ length: 100, unique: true, comment: '邮箱' })
  email: string;

  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ length: 100, nullable: true, comment: '头像URL' })
  avatar?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'sales',
    comment: '角色：admin-管理员，manager-经理，sales-销售，service-客服'
  })
  role: 'admin' | 'manager' | 'sales' | 'service';

  @Column({ name: 'role_id', type: 'varchar', length: 50, nullable: true, comment: '角色ID' })
  roleId?: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: 'active',
    comment: '状态：active-活跃，inactive-非活跃，locked-锁定'
  })
  status: 'active' | 'inactive' | 'locked';

  @Column({ name: 'department_id', type: 'varchar', length: 50, nullable: true, comment: '部门ID' })
  departmentId?: string;

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true, comment: '最后登录时间' })
  lastLoginAt?: Date;

  @Column({ name: 'last_login_ip', length: 45, nullable: true, comment: '最后登录IP' })
  lastLoginIp?: string;

  @Column({ name: 'login_fail_count', type: 'int', default: 0, comment: '登录失败次数' })
  loginFailCount: number;

  @Column({ name: 'locked_at', type: 'datetime', nullable: true, comment: '账户锁定时间' })
  lockedAt?: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Department, department => department.users)
  @JoinColumn({ name: 'department_id' })
  department?: Department;

  @OneToMany(() => OperationLog, log => log.user)
  operationLogs: OperationLog[];

  // 用户拥有的角色
  @ManyToMany(() => Role, role => role.users)
  @JoinTable({
    name: 'user_roles',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'roleId', referencedColumnName: 'id' }
  })
  roles: Role[];

  // 用户的个人权限
  @OneToMany(() => UserPermission, userPermission => userPermission.user)
  personalPermissions: UserPermission[];

  // 虚拟字段（不存储到数据库）
  toJSON() {
    const { password, ...result } = this;
    return result;
  }
}
