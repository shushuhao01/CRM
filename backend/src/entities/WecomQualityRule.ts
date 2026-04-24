/**
 * 质检规则实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_quality_rules')
@Index('IDX_wecom_qr_tenant', ['tenantId'])
@Index('IDX_wecom_qr_type', ['ruleType'])
export class WecomQualityRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ type: 'varchar', length: 100, comment: '规则名称' })
  name: string;

  @Column({ name: 'rule_type', type: 'varchar', length: 30, comment: '规则类型: response_time/msg_count/keyword/emotion' })
  ruleType: string;

  @Column({ type: 'text', comment: '条件参数(JSON)' })
  conditions: string;

  @Column({ name: 'score_value', type: 'int', default: 0, comment: '分值(正加负减)' })
  scoreValue: number;

  @Column({ name: 'apply_scope', type: 'text', nullable: true, comment: '适用范围(JSON: 部门/员工)' })
  applyScope: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true, comment: '是否启用' })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}

