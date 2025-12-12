import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('users')
export class User {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { length: 50, unique: true })
  username: string;

  @Column('varchar', { length: 255 })
  password: string;

  @Column('varchar', { length: 50 })
  name: string;

  @Column('varchar', { name: 'real_name', length: 50, nullable: true })
  realName: string | null;

  @Column('varchar', { length: 100, nullable: true })
  email: string | null;

  @Column('varchar', { length: 20, nullable: true })
  phone: string | null;

  @Column('varchar', { length: 500, nullable: true })
  avatar: string | null;

  @Column('enum', { enum: ['male', 'female', 'unknown'], default: 'unknown', nullable: true })
  gender: 'male' | 'female' | 'unknown' | null;

  @Column('date', { nullable: true })
  birthday: Date | null;

  @Column('varchar', { name: 'id_card', length: 255, nullable: true })
  idCard: string | null;

  @Column('varchar', { length: 50 })
  role: string;

  @Column('varchar', { name: 'role_id', length: 50 })
  roleId: string;

  @Column('varchar', { name: 'department_id', length: 50, nullable: true })
  departmentId: string | null;

  @Column('varchar', { name: 'department_name', length: 100, nullable: true })
  departmentName: string | null;

  @Column('varchar', { length: 50, nullable: true })
  position: string | null;

  @Column('varchar', { name: 'employee_number', length: 50, nullable: true })
  employeeNumber: string | null;

  @Column('date', { name: 'entry_date', nullable: true })
  entryDate: Date | null;

  @Column('date', { name: 'leave_date', nullable: true })
  leaveDate: Date | null;

  @Column('varchar', { length: 255, nullable: true })
  salary: string | null;

  @Column('varchar', { name: 'bank_account', length: 255, nullable: true })
  bankAccount: string | null;

  @Column('varchar', { name: 'emergency_contact', length: 50, nullable: true })
  emergencyContact: string | null;

  @Column('varchar', { name: 'emergency_phone', length: 20, nullable: true })
  emergencyPhone: string | null;

  @Column('text', { nullable: true })
  address: string | null;

  @Column('varchar', { length: 20, nullable: true })
  education: string | null;

  @Column('varchar', { length: 100, nullable: true })
  major: string | null;

  @Column('enum', { enum: ['active', 'inactive', 'resigned', 'locked'], default: 'active' })
  status: 'active' | 'inactive' | 'resigned' | 'locked';

  @Column('enum', { name: 'employment_status', enum: ['active', 'resigned'], default: 'active', nullable: true })
  employmentStatus: 'active' | 'resigned' | null;

  @Column('datetime', { name: 'resigned_at', nullable: true })
  resignedAt: Date | null;

  @Column('timestamp', { name: 'last_login_at', nullable: true })
  lastLoginAt: Date | null;

  @Column('int', { name: 'login_count', default: 0, nullable: true })
  loginCount: number;

  @Column('int', { name: 'loginFailCount', default: 0, nullable: true })
  loginFailCount: number;

  @Column('datetime', { name: 'lockedAt', nullable: true })
  lockedAt: Date | null;

  @Column('varchar', { name: 'lastLoginIp', length: 45, nullable: true })
  lastLoginIp: string | null;

  @Column('json', { nullable: true })
  settings: any;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;

  // 虚拟字段
  toJSON() {
    const { password: _password, ...result } = this;
    return result;
  }
}
