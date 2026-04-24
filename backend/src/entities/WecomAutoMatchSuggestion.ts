/**
 * 企微自动匹配建议实体
 * V4.0新增: 用于企微客户与CRM客户的自动匹配推荐
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_auto_match_suggestions')
@Index('IDX_wams_tenant_status', ['tenantId', 'status'])
export class WecomAutoMatchSuggestion {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'wecom_customer_id', type: 'int', comment: '企微客户ID' })
  wecomCustomerId: number;

  @Column({ name: 'crm_customer_id', type: 'varchar', length: 50, comment: 'CRM客户ID' })
  crmCustomerId: string;

  @Column({ name: 'match_type', type: 'varchar', length: 20, default: 'phone', comment: '匹配方式: phone/name' })
  matchType: string;

  @Column({ name: 'match_field', type: 'varchar', length: 100, nullable: true, comment: '匹配的值' })
  matchField: string;

  @Column({ type: 'varchar', length: 20, default: 'medium', comment: '置信度: high/medium/low' })
  confidence: string;

  @Column({ type: 'varchar', length: 20, default: 'pending', comment: '状态: pending/confirmed/rejected' })
  status: string;

  @Column({ name: 'confirmed_by', type: 'varchar', length: 50, nullable: true })
  confirmedBy: string;

  @Column({ name: 'confirmed_at', type: 'datetime', nullable: true })
  confirmedAt: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

