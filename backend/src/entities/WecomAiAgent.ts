/**
 * AI智能体配置实体
 * V4.0新增: 配置不同用途的AI智能体（质检/标签/客户画像等）
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_ai_agents')
@Index('IDX_waa_tenant', ['tenantId'])
export class WecomAiAgent {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'agent_name', type: 'varchar', length: 100 })
  agentName: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON 用途列表' })
  usages: string;

  @Column({ name: 'model_id', type: 'int', nullable: true, comment: '关联AI模型ID' })
  modelId: number;

  @Column({ name: 'knowledge_base_ids', type: 'text', nullable: true, comment: 'JSON' })
  knowledgeBaseIds: string;

  @Column({ name: 'system_prompt', type: 'text', nullable: true })
  systemPrompt: string;

  @Column({ name: 'max_msg_per_analysis', type: 'int', default: 50 })
  maxMsgPerAnalysis: number;

  @Column({ name: 'context_window', type: 'int', default: 8000 })
  contextWindow: number;

  @Column({ name: 'output_format', type: 'varchar', length: 20, default: 'json', comment: 'json/text/markdown' })
  outputFormat: string;

  @Column({ name: 'retry_count', type: 'int', default: 3 })
  retryCount: number;

  @Column({ name: 'timeout_seconds', type: 'int', default: 30 })
  timeoutSeconds: number;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

