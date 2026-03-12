import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('admin_operation_logs')
export class AdminOperationLog {
  @PrimaryColumn('varchar', { length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 36, name: 'admin_id', comment: '管理员ID' })
  adminId!: string;

  @Column({ type: 'varchar', length: 100, nullable: true, name: 'admin_name', comment: '管理员名称' })
  adminName?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: '操作模块' })
  module?: string;

  @Column({ type: 'varchar', length: 50, comment: '操作动作' })
  action!: string;

  @Column({ type: 'varchar', length: 50, nullable: true, name: 'target_type', comment: '目标类型' })
  targetType?: string;

  @Column({ type: 'varchar', length: 36, nullable: true, name: 'target_id', comment: '目标ID' })
  targetId?: string;

  @Column({ type: 'text', nullable: true, comment: '详细信息' })
  detail?: string;

  @Column({ type: 'varchar', length: 50, nullable: true, comment: 'IP地址' })
  ip?: string;

  @Column({ type: 'varchar', length: 500, nullable: true, name: 'user_agent', comment: 'User Agent' })
  userAgent?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
