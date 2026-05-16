/**
 * 会话存档风险审计标记实体
 * 用于记录审计人员对聊天消息的风险标记
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('wecom_chat_audit_marks')
export class WecomChatAuditMark {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', comment: '企微配置ID' })
  wecomConfigId: number;

  @Column({ name: 'chat_record_id', type: 'int', nullable: true, comment: '关联的消息记录ID' })
  chatRecordId: number;

  @Column({ name: 'from_user_id', type: 'varchar', length: 100, comment: '消息发送者UserId' })
  fromUserId: string;

  @Column({ name: 'to_user_id', type: 'varchar', length: 100, nullable: true, comment: '消息接收者' })
  toUserId: string;

  @Column({ name: 'msg_content', type: 'text', nullable: true, comment: '被标记的消息原文' })
  msgContent: string;

  @Column({ name: 'msg_type', type: 'varchar', length: 30, nullable: true, comment: '消息类型' })
  msgType: string;

  @Column({ name: 'msg_time', type: 'bigint', nullable: true, comment: '消息时间戳' })
  msgTime: number;

  @Column({ name: 'risk_type', type: 'varchar', length: 50, comment: '风险类型: sensitive_word/compliance/attitude/leak/other' })
  riskType: string;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, default: 'medium', comment: '风险等级: low/medium/high/critical' })
  riskLevel: string;

  @Column({ name: 'remark', type: 'text', nullable: true, comment: '审计备注' })
  remark: string;

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending', comment: '处理状态: pending/processing/resolved/dismissed' })
  status: string;

  @Column({ name: 'operator_id', type: 'varchar', length: 50, comment: '标记操作人ID' })
  operatorId: string;

  @Column({ name: 'operator_name', type: 'varchar', length: 100, comment: '标记操作人名称' })
  operatorName: string;

  @Column({ name: 'resolver_id', type: 'varchar', length: 50, nullable: true, comment: '处理人ID' })
  resolverId: string;

  @Column({ name: 'resolver_name', type: 'varchar', length: 100, nullable: true, comment: '处理人名称' })
  resolverName: string;

  @Column({ name: 'resolve_remark', type: 'text', nullable: true, comment: '处理备注' })
  resolveRemark: string;

  @Column({ name: 'resolved_at', type: 'datetime', nullable: true, comment: '处理时间' })
  resolvedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
