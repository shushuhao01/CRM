import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 业绩消息配置实体
 */
@Entity('performance_report_configs')
export class PerformanceReportConfig {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 100, comment: '配置名称' })
  name!: string;

  @Column({ name: 'is_enabled', type: 'tinyint', default: 1, comment: '是否启用' })
  @Index()
  isEnabled!: number;

  @Column({ name: 'send_frequency', type: 'varchar', length: 20, default: 'daily', comment: '发送频率' })
  @Index()
  sendFrequency!: string;

  @Column({ name: 'send_time', type: 'varchar', length: 10, default: '09:00', comment: '发送时间' })
  sendTime!: string;

  @Column({ name: 'send_days', type: 'json', nullable: true, comment: '发送日期' })
  sendDays?: number[];

  @Column({ name: 'repeat_type', type: 'varchar', length: 20, default: 'workday', comment: '重复类型' })
  repeatType!: string;

  @Column({ name: 'report_types', type: 'json', comment: '报表类型列表' })
  reportTypes!: string[];

  @Column({ name: 'message_format', type: 'varchar', length: 20, default: 'text', comment: '消息格式: text/image' })
  messageFormat!: string;

  @Column({ name: 'channel_type', type: 'varchar', length: 20, comment: '通知渠道' })
  channelType!: string;

  @Column({ type: 'varchar', length: 500, comment: 'Webhook地址' })
  webhook!: string;

  @Column({ type: 'varchar', length: 200, nullable: true, comment: '加签密钥' })
  secret?: string;

  @Column({ name: 'view_scope', type: 'varchar', length: 20, default: 'company', comment: '视角' })
  viewScope!: string;

  @Column({ name: 'target_departments', type: 'json', nullable: true, comment: '目标部门列表' })
  targetDepartments?: string[];

  @Column({ name: 'include_monthly', type: 'tinyint', default: 1, comment: '是否包含月累计' })
  includeMonthly!: number;

  @Column({ name: 'include_ranking', type: 'tinyint', default: 1, comment: '是否包含排名' })
  includeRanking!: number;

  @Column({ name: 'ranking_limit', type: 'int', default: 10, comment: '排名显示数量' })
  rankingLimit!: number;

  @Column({ name: 'last_sent_at', type: 'timestamp', nullable: true, comment: '上次发送时间' })
  lastSentAt?: Date;

  @Column({ name: 'last_sent_status', type: 'varchar', length: 20, nullable: true, comment: '上次发送状态' })
  lastSentStatus?: string;

  @Column({ name: 'last_sent_message', type: 'text', nullable: true, comment: '上次发送结果信息' })
  lastSentMessage?: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '创建者ID' })
  createdBy?: string;

  @Column({ name: 'created_by_name', type: 'varchar', length: 100, nullable: true, comment: '创建者姓名' })
  createdByName?: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  @Index()
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt!: Date;
}

/**
 * 业绩消息发送记录实体
 */
@Entity('performance_report_logs')
export class PerformanceReportLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'config_id', type: 'varchar', length: 36, comment: '配置ID' })
  @Index()
  configId!: string;

  @Column({ name: 'report_date', type: 'date', comment: '报表日期' })
  @Index()
  reportDate!: Date;

  @Column({ name: 'report_data', type: 'json', nullable: true, comment: '报表数据快照' })
  reportData?: any;

  @Column({ name: 'channel_type', type: 'varchar', length: 20, comment: '发送渠道' })
  channelType!: string;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '发送状态' })
  @Index()
  status!: string;

  @Column({ type: 'text', nullable: true, comment: 'API响应' })
  response?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true, comment: '错误信息' })
  errorMessage?: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true, comment: '发送时间' })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt!: Date;
}
