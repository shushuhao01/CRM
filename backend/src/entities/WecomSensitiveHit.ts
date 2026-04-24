/**
 * 敏感词命中记录实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_sensitive_hits')
@Index('IDX_wecom_sh_tenant', ['tenantId'])
@Index('IDX_wecom_sh_status', ['status'])
@Index('IDX_wecom_sh_created', ['createdAt'])
export class WecomSensitiveHit {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'chat_record_id', type: 'int', nullable: true, comment: '关联的聊天记录ID' })
  chatRecordId: number;

  @Column({ name: 'word_id', type: 'int', comment: '命中的敏感词ID' })
  wordId: number;

  @Column({ type: 'varchar', length: 200, comment: '命中的敏感词内容' })
  word: string;

  @Column({ type: 'text', nullable: true, comment: '消息上下文' })
  context: string;

  @Column({ name: 'from_user_id', type: 'varchar', length: 100, nullable: true, comment: '发送者ID' })
  fromUserId: string;

  @Column({ name: 'from_user_name', type: 'varchar', length: 100, nullable: true, comment: '发送者姓名' })
  fromUserName: string;

  @Column({ name: 'to_user_id', type: 'varchar', length: 100, nullable: true, comment: '接收者ID' })
  toUserId: string;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '状态: pending/processed/ignored' })
  status: string;

  @Column({ name: 'processed_by', type: 'varchar', length: 50, nullable: true, comment: '处理人' })
  processedBy: string;

  @Column({ name: 'processed_at', type: 'datetime', nullable: true, comment: '处理时间' })
  processedAt: Date;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;
}

