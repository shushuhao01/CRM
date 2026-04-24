/**
 * AI质检结果实体
 * V4.0新增: 存储单个会话的AI质检分析结果
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_ai_inspect_results')
@Index('IDX_wair_tenant_strategy', ['tenantId', 'strategyId'])
@Index('IDX_wair_tenant_employee', ['tenantId', 'employeeUserId'])
export class WecomAiInspectResult {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'strategy_id', type: 'int', nullable: true })
  strategyId: number;

  @Column({ name: 'conversation_id', type: 'varchar', length: 100, nullable: true })
  conversationId: string;

  @Column({ name: 'employee_user_id', type: 'varchar', length: 100, nullable: true })
  employeeUserId: string;

  @Column({ name: 'employee_name', type: 'varchar', length: 100, nullable: true })
  employeeName: string;

  @Column({ name: 'customer_user_id', type: 'varchar', length: 100, nullable: true })
  customerUserId: string;

  @Column({ name: 'customer_name', type: 'varchar', length: 100, nullable: true })
  customerName: string;

  @Column({ name: 'total_score', type: 'int', nullable: true })
  totalScore: number;

  @Column({ name: 'dimension_scores', type: 'text', nullable: true, comment: 'JSON' })
  dimensionScores: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON 亮点' })
  highlights: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON 待改进' })
  improvements: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON 风险' })
  risks: string;

  @Column({ name: 'ai_suggestion', type: 'text', nullable: true })
  aiSuggestion: string;

  @Column({ name: 'risk_level', type: 'varchar', length: 20, nullable: true, comment: 'excellent/pass/fail' })
  riskLevel: string;

  @Column({ name: 'analyzed_msg_count', type: 'int', nullable: true })
  analyzedMsgCount: number;

  @Column({ name: 'analyzed_at', type: 'datetime', nullable: true })
  analyzedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

