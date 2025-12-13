import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

/**
 * 通知渠道配置实体
 */
@Entity('notification_channels')
export class NotificationChannel {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 100, comment: '配置名称' })
  name!: string;

  @Column({ name: 'channel_type', type: 'varchar', length: 50, comment: '通知渠道类型' })
  @Index()
  channelType!: string;

  @Column({ name: 'is_enabled', type: 'tinyint', default: 1, comment: '是否启用' })
  @Index()
  isEnabled!: number;

  @Column({ type: 'json', comment: '渠道配置参数' })
  config!: Record<string, any>;

  @Column({ name: 'message_types', type: 'json', nullable: true, comment: '支持的消息类型列表' })
  messageTypes?: string[];

  @Column({ name: 'target_type', type: 'varchar', length: 20, default: 'all', comment: '通知对象类型' })
  targetType!: string;

  @Column({ name: 'target_departments', type: 'json', nullable: true, comment: '目标部门列表' })
  targetDepartments?: string[];

  @Column({ name: 'target_users', type: 'json', nullable: true, comment: '目标用户列表' })
  targetUsers?: string[];

  @Column({ name: 'target_roles', type: 'json', nullable: true, comment: '目标角色列表' })
  targetRoles?: string[];

  @Column({ name: 'priority_filter', type: 'varchar', length: 20, default: 'all', comment: '优先级过滤' })
  priorityFilter!: string;

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
 * 通知发送记录实体
 */
@Entity('notification_logs')
export class NotificationLog {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'channel_id', type: 'varchar', length: 36, comment: '通知渠道ID' })
  @Index()
  channelId!: string;

  @Column({ name: 'channel_type', type: 'varchar', length: 50, comment: '通知渠道类型' })
  channelType!: string;

  @Column({ name: 'message_type', type: 'varchar', length: 50, comment: '消息类型' })
  messageType!: string;

  @Column({ type: 'varchar', length: 200, comment: '消息标题' })
  title!: string;

  @Column({ type: 'text', comment: '消息内容' })
  content!: string;

  @Column({ name: 'target_users', type: 'json', nullable: true, comment: '目标用户列表' })
  targetUsers?: string[];

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '发送状态' })
  @Index()
  status!: string;

  @Column({ type: 'text', nullable: true, comment: '第三方API响应' })
  response?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true, comment: '错误信息' })
  errorMessage?: string;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true, comment: '发送时间' })
  sentAt?: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  @Index()
  createdAt!: Date;
}
