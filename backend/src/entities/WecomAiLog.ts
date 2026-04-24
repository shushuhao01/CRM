/**
 * AI调用日志实体
 * V4.0新增: 记录AI模型调用的token消耗、耗时、状态等
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_ai_logs')
@Index('IDX_wal_tenant_time', ['tenantId', 'createdAt'])
@Index('IDX_wal_tenant_agent', ['tenantId', 'agentId'])
export class WecomAiLog {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'agent_id', type: 'int', nullable: true })
  agentId: number;

  @Column({ name: 'agent_name', type: 'varchar', length: 100, nullable: true })
  agentName: string;

  @Column({ name: 'operation_type', type: 'varchar', length: 50, nullable: true })
  operationType: string;

  @Column({ name: 'target_description', type: 'varchar', length: 500, nullable: true })
  targetDescription: string;

  @Column({ name: 'input_tokens', type: 'int', default: 0 })
  inputTokens: number;

  @Column({ name: 'output_tokens', type: 'int', default: 0 })
  outputTokens: number;

  @Column({ name: 'total_tokens', type: 'int', default: 0 })
  totalTokens: number;

  @Column({ name: 'duration_ms', type: 'int', default: 0 })
  durationMs: number;

  @Column({ type: 'varchar', length: 20, default: 'success', comment: 'success/fail/timeout' })
  status: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage: string;

  @Column({ name: 'request_payload', type: 'text', nullable: true })
  requestPayload: string;

  @Column({ name: 'response_payload', type: 'text', nullable: true })
  responsePayload: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

