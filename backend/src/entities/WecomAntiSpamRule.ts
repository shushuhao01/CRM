/**
 * 企微防骚扰规则实体
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_anti_spam_rules')
@Index('IDX_wasr_tenant', ['tenantId'])
export class WecomAntiSpamRule {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_config_id', type: 'int', nullable: true })
  wecomConfigId: number;

  @Column({ type: 'varchar', length: 100 })
  name: string;

  @Column({ type: 'varchar', length: 20, default: 'all' })
  scope: string;

  @Column({ name: 'detect_types', type: 'text', nullable: true, comment: 'JSON: ["keyword","link","frequency"]' })
  detectTypes: string;

  @Column({ type: 'text', nullable: true, comment: 'JSON array of punishments' })
  punishments: string;

  @Column({ type: 'text', nullable: true })
  keywords: string;

  @Column({ name: 'keyword_mode', type: 'varchar', length: 20, default: 'any' })
  keywordMode: string;

  @Column({ name: 'link_mode', type: 'varchar', length: 20, default: 'block_all' })
  linkMode: string;

  @Column({ name: 'link_whitelist', type: 'text', nullable: true })
  linkWhitelist: string;

  @Column({ name: 'freq_minutes', type: 'int', default: 5 })
  freqMinutes: number;

  @Column({ name: 'freq_max_msg', type: 'int', default: 10 })
  freqMaxMsg: number;

  @Column({ name: 'exempt_employee', type: 'boolean', default: true })
  exemptEmployee: boolean;

  @Column({ name: 'exempt_admin', type: 'boolean', default: false })
  exemptAdmin: boolean;

  @Column({ name: 'specified_groups', type: 'text', nullable: true })
  specifiedGroups: string;

  @Column({ name: 'specified_templates', type: 'text', nullable: true })
  specifiedTemplates: string;

  @Column({ name: 'is_enabled', type: 'boolean', default: true })
  isEnabled: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

