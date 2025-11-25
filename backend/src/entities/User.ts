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

  @Column({ length: 50, comment: '姓名' })
  name: string;

  @Column({ name: 'real_name', length: 50, nullable: true, comment: '真实姓名' })
  realName?: string;

  @Column({ length: 100, nullable: true, comment: '邮箱' })
  email?: string;

  @Column({ length: 20, nullable: true, comment: '手机号' })
  phone?: string;

  @Column({ length: 500, nullable: true, comment: '头像URL' })
  avatar?: string;

  @Column({ type: 'enum', enum: ['male', 'female', 'unknown'], default: 'unknown', nullable: true, comment: '性别' })
  gender?: 'male' | 'female' | 'unknown';

  @Column({ type: 'date', nullable: true, comment: '生日' })
  birthday?: Date;

  @Column({ name: 'id_card', length: 255, nullable: true, comment: '身份证号（加密）' })
  idCard?: string;

  @Column({ length: 50, comment: '角色' })
  role: string;

  @Column({ name: 'role_id', length: 50, comment: '角色ID' })
  roleId: string;

  @Column({ name: 'department_id', length: 50, nullable: true, comment: '部门ID' })
  departmentId?: string;

  @Column({ name: 'department_name', length: 100, nullable: true, comment: '部门名称' })
  departmentName?: string;

  @Column({ length: 50, nullable: true, comment: '职位' })
  position?: string;

  @Column({ name: 'employee_number', length: 50, nullable: true, comment: '工号' })
  employeeNumber?: string;

  @Column({ name: 'entry_date', type: 'date', nullable: true, comment: '入职日期' })
  entryDate?: Date;

  @Column({ name: 'leave_date', type: 'date', nullable: true, comment: '离职日期' })
  leaveDate?: Date;

  @Column({ length: 255, nullable: true, comment: '工资（加密）' })
  salary?: string;

  @Column({ name: 'bank_account', length: 255, nullable: true, comment: '银行账号（加密）' })
  bankAccount?: string;

  @Column({ name: 'emergency_contact', length: 50, nullable: true, comment: '紧急联系人' })
  emergencyContact?: string;

  @Column({ name: 'emergency_phone', length: 20, nullable: true, comment: '紧急联系电话' })
  emergencyPhone?: string;

  @Column({ type: 'text', nullable: true, comment: '家庭住址' })
  address?: string;

  @Column({ length: 20, nullable: true, comment: '学历' })
  education?: string;

  @Column({ length: 100, nullable: true, comment: '专业' })
  major?: string;

  @Column({ type: 'enum', enum: ['active', 'inactive', 'resigned', 'locked'], default: 'active', comment: '状态' })
  status: 'active' | 'inactive' | 'resigned' | 'locked';

  @Column({ name: 'last_login_at', type: 'timestamp', nullable: true, comment: '最后登录时间' })
  lastLoginAt?: Date;

  @Column({ name: 'login_count', type: 'int', default: 0, comment: '登录次数' })
  loginCount: number;

  @Column({ name: 'loginFailCount', type: 'int', default: 0, comment: '登录失败次数' })
  loginFailCount: number;

  @Column({ name: 'lockedAt', type: 'datetime', nullable: true, comment: '账户锁定时间' })
  lockedAt?: Date;

  @Column({ name: 'lastLoginIp', length: 45, nullable: true, comment: '最后登录IP' })
  lastLoginIp?: string;

  @Column({ type: 'json', nullable: true, comment: '用户设置' })
  settings?: Record<string, unknown>;

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
    const { password: _password, ...result } = this;
    return result;
  }
}
