import { Entity, PrimaryColumn, Column, CreateDateColumn, Index } from 'typeorm';

/**
 * 消息已读状态实体
 * 记录每个用户对每条消息的已读状态
 * 🔥 2025-01-07 新增：解决多用户消息已读状态共享的问题
 */
@Entity('message_read_status')
export class MessageReadStatus {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;
  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'message_id', type: 'varchar', length: 36, comment: '消息ID' })
  @Index()
  messageId!: string;

  @Column({ name: 'user_id', type: 'varchar', length: 36, comment: '用户ID' })
  @Index()
  userId!: string;

  @CreateDateColumn({ name: 'read_at', comment: '阅读时间' })
  readAt!: Date;
}
