/**
 * 获客助手智能上下线规则实体
 * V4.0新增: 自动上下线、工作时间、流失率控制等智能规则
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_acquisition_smart_rules')
@Index('IDX_wasr_tenant_link', ['tenantId', 'linkId'])
export class WecomAcquisitionSmartRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'link_id', type: 'int', comment: '获客链接ID' })
  linkId: number;

  @Column({ name: 'daily_limit_enabled', type: 'boolean', default: false })
  dailyLimitEnabled: boolean;

  @Column({ name: 'daily_limit_per_user', type: 'int', default: 50 })
  dailyLimitPerUser: number;

  @Column({ name: 'daily_limit_action', type: 'varchar', length: 20, default: 'offline' })
  dailyLimitAction: string;

  @Column({ name: 'work_time_enabled', type: 'boolean', default: false })
  workTimeEnabled: boolean;

  @Column({ name: 'work_time_start', type: 'varchar', length: 10, default: '09:00' })
  workTimeStart: string;

  @Column({ name: 'work_time_end', type: 'varchar', length: 10, default: '18:00' })
  workTimeEnd: string;

  @Column({ name: 'work_days', type: 'text', nullable: true, comment: 'JSON [1,2,3,4,5]' })
  workDays: string;

  @Column({ name: 'slow_reply_enabled', type: 'boolean', default: false })
  slowReplyEnabled: boolean;

  @Column({ name: 'slow_reply_minutes', type: 'int', default: 30 })
  slowReplyMinutes: number;

  @Column({ name: 'slow_reply_action', type: 'varchar', length: 20, default: 'offline' })
  slowReplyAction: string;

  @Column({ name: 'loss_rate_enabled', type: 'boolean', default: false })
  lossRateEnabled: boolean;

  @Column({ name: 'loss_rate_threshold', type: 'int', default: 30 })
  lossRateThreshold: number;

  @Column({ name: 'next_day_auto_online', type: 'boolean', default: true })
  nextDayAutoOnline: boolean;

  @Column({ name: 'next_day_online_time', type: 'varchar', length: 10, default: '09:00' })
  nextDayOnlineTime: string;

  @Column({ name: 'next_day_exclude_manual', type: 'boolean', default: false })
  nextDayExcludeManual: boolean;

  @Column({ name: 'next_day_exclude_loss_rate', type: 'boolean', default: false })
  nextDayExcludeLossRate: boolean;

  @Column({ name: 'schedule_enabled', type: 'boolean', default: false })
  scheduleEnabled: boolean;

  @Column({ name: 'schedule_config', type: 'text', nullable: true, comment: 'JSON' })
  scheduleConfig: string;

  @Column({ name: 'dept_quota_enabled', type: 'boolean', default: false })
  deptQuotaEnabled: boolean;

  @Column({ name: 'dept_quotas', type: 'text', nullable: true, comment: 'JSON' })
  deptQuotas: string;

  @Column({ name: 'dept_overflow_enabled', type: 'boolean', default: false })
  deptOverflowEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

