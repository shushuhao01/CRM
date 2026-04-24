/**
 * AI质检策略实体
 * V4.0新增: 定义AI质检的检测类型、评分规则和风险等级
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_ai_inspect_strategies')
@Index('IDX_wais_tenant', ['tenantId'])
export class WecomAiInspectStrategy {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'strategy_name', type: 'varchar', length: 100 })
  strategyName: string;

  @Column({ name: 'detect_types', type: 'text', nullable: true, comment: 'JSON 检测类型' })
  detectTypes: string;

  @Column({ type: 'varchar', length: 20, default: 'all', comment: '适用范围' })
  scope: string;

  @Column({ name: 'scope_config', type: 'text', nullable: true, comment: 'JSON' })
  scopeConfig: string;

  @Column({ name: 'max_score', type: 'int', default: 100 })
  maxScore: number;

  @Column({ name: 'deduct_rules', type: 'text', nullable: true, comment: 'JSON 扣分规则' })
  deductRules: string;

  @Column({ name: 'risk_levels', type: 'text', nullable: true, comment: 'JSON 风险等级配置' })
  riskLevels: string;

  @Column({ name: 'ai_model_id', type: 'int', nullable: true })
  aiModelId: number;

  @Column({ name: 'prompt_template', type: 'text', nullable: true })
  promptTemplate: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

