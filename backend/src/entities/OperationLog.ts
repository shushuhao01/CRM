import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { User } from './User';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', nullable: true, comment: '操作用户ID' })
  userId?: number;

  @Column({ length: 50, nullable: true, comment: '操作用户名' })
  username?: string;

  @Column({ 
    type: 'varchar',
    length: 50,
    comment: '操作类型'
  })
  action: 'create' | 'update' | 'delete' | 'login' | 'logout' | 'export' | 'import' | 'other';

  @Column({ length: 50, comment: '操作模块' })
  module: string;

  @Column({ length: 100, comment: '操作描述' })
  description: string;

  @Column({ type: 'json', nullable: true, comment: '操作详情（JSON）' })
  details?: Record<string, any>;

  @Column({ length: 45, nullable: true, comment: '操作IP地址' })
  ipAddress?: string;

  @Column({ length: 200, nullable: true, comment: '用户代理' })
  userAgent?: string;

  @Column({ 
    type: 'varchar',
    length: 50,
    default: 'success',
    comment: '操作结果'
  })
  result: 'success' | 'failed' | 'warning';

  @Column({ type: 'text', nullable: true, comment: '错误信息' })
  errorMessage?: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => User, user => user.operationLogs)
  @JoinColumn({ name: 'userId' })
  user?: User;
}