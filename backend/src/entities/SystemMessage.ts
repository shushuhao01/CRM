import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 系统消息实体
 * 用于跨设备消息通知
 */
@Entity('system_messages')
export class SystemMessage {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ type: 'varchar', length: 50, comment: '消息类型' })
  @Index()
  type!: string;

  @Column({ type: 'varchar', length: 200, comment: '消息标题' })
  title!: string;

  @Column({ type: 'text', comment: '消息内容' })
  content!: string;

  @Column({ type: 'varchar', length: 20, default: 'normal', comment: '优先级' })
  priority!: string;

  @Column({ type: 'varchar', length: 50, default: '系统通知', comment: '消息分类' })
  category!: string;

  @Column({ name: 'target_user_id', type: 'varchar', length: 36, comment: '接收者用户ID' })
  @Index()
  targetUserId!: string;

  @Column({ name: 'created_by', type: 'varchar', length: 36, nullable: true, comment: '发送者用户ID' })
  createdBy?: string;

  @Column({ name: 'related_id', type: 'varchar', length: 36, nullable: true, comment: '关联的业务ID' })
  relatedId?: string;

  @Column({ name: 'related_type', type: 'varchar', length: 50, nullable: true, comment: '关联类型' })
  relatedType?: string;

  @Column({ name: 'action_url', type: 'varchar', length: 200, nullable: true, comment: '跳转URL' })
  actionUrl?: string;

  @Column({ name: 'is_read', type: 'tinyint', default: 0, comment: '是否已读' })
  @Index()
  isRead!: number;

  @Column({ name: 'read_at', type: 'timestamp', nullable: true, comment: '阅读时间' })
  readAt?: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  @Index()
  createdAt!: Date;
}
