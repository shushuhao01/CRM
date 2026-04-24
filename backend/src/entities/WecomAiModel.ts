/**
 * AI模型配置实体
 * V4.0新增: 支持多模型配置（OpenAI/Azure/Claude/DeepSeek/通义千问等）
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_ai_models')
@Index('IDX_wam_tenant', ['tenantId'])
export class WecomAiModel {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'model_name', type: 'varchar', length: 100, comment: '模型名称' })
  modelName: string;

  @Column({ type: 'varchar', length: 20, default: 'openai', comment: '提供商: openai/azure/claude/deepseek/qwen/custom' })
  provider: string;

  @Column({ name: 'api_url', type: 'varchar', length: 500, nullable: true })
  apiUrl: string;

  @Column({ name: 'api_key', type: 'varchar', length: 500, nullable: true, comment: '加密存储' })
  apiKey: string;

  @Column({ name: 'model_id', type: 'varchar', length: 100, nullable: true, comment: '模型标识' })
  modelId: string;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0.70 })
  temperature: number;

  @Column({ name: 'max_tokens', type: 'int', default: 4096 })
  maxTokens: number;

  @Column({ name: 'top_p', type: 'decimal', precision: 3, scale: 2, default: 1.00 })
  topP: number;

  @Column({ name: 'is_default', type: 'boolean', default: false })
  isDefault: boolean;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @Column({ name: 'last_test_time', type: 'datetime', nullable: true })
  lastTestTime: Date;

  @Column({ name: 'last_test_status', type: 'varchar', length: 20, nullable: true })
  lastTestStatus: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

