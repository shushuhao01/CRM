/**
 * 租户操作日志实体
 *
 * 用于记录租户的关键操作，包括：
 * - 创建、更新、删除租户
 * - 暂停、恢复授权
 * - 启用、禁用租户
 * - 续期、调整配额
 * - 重新生成授权码
 */

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index
} from 'typeorm';

@Entity('tenant_logs')
@Index(['tenantId', 'createdAt'])
@Index(['action'])
@Index(['operatorId'])
export class TenantLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  @Index()
  tenantId!: string;

  @Column({ type: 'varchar', length: 50 })
  action!: string;  // create, update, delete, suspend, resume, enable, disable, renew, regenerate_license, adjust_quota

  @Column({ type: 'varchar', length: 100 })
  operator!: string;  // 操作人名称

  @Column({ name: 'operator_id', type: 'varchar', length: 255 })
  operatorId!: string;  // 操作人ID

  @Column({ type: 'text', nullable: true })
  details?: string;  // 操作详情（JSON格式）

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress?: string;  // IP地址（支持IPv6）

  @Column({ name: 'user_agent', type: 'varchar', length: 500, nullable: true })
  userAgent?: string;  // 用户代理

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}
