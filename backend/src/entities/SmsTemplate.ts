import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 短信模板实体
 *
 * status 枚举值:
 *   pending_admin  — 待管理员审核（CRM端提交后的初始状态）
 *   pending_vendor — 管理员初审通过，已提交服务商审核
 *   active         — 已激活可用（服务商通过 + 管理员填入模板CODE后）
 *   rejected       — 已拒绝（任一阶段可拒绝）
 *   withdrawn      — 已撤销（CRM端用户在pending_admin阶段可自行撤销）
 *   deleted        — 已删除（逻辑删除）
 *
 * 兼容旧状态: pending → 等同于 pending_admin, approved → 等同于 active
 */
@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 50, nullable: true })
  category: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json', nullable: true })
  variables: string[];

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ length: 50, nullable: true })
  applicant: string;

  @Column({ name: 'applicant_name', length: 50, nullable: true })
  applicantName: string;

  @Column({ name: 'applicant_dept', length: 100, nullable: true })
  applicantDept: string;

  @Column({ length: 20, default: 'pending_admin' })
  status: string; // pending_admin | pending_vendor | active | rejected | withdrawn | deleted

  @Column({ name: 'approved_by', length: 50, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  // ========== 新增字段 v1.8.0 阶段2 ==========

  /** 服务商模板CODE（如 SMS_123456789） */
  @Column({ name: 'vendor_template_code', type: 'varchar', length: 100, nullable: true, comment: '服务商模板CODE' })
  vendorTemplateCode?: string;

  /** 服务商审核状态: null/pending/approved/rejected */
  @Column({ name: 'vendor_status', type: 'varchar', length: 20, nullable: true, comment: '服务商审核状态' })
  vendorStatus?: string;

  /** 提交服务商时间 */
  @Column({ name: 'vendor_submit_at', type: 'timestamp', nullable: true, comment: '提交服务商时间' })
  vendorSubmitAt?: Date;

  /** 服务商拒绝原因 */
  @Column({ name: 'vendor_reject_reason', type: 'text', nullable: true, comment: '服务商拒绝原因' })
  vendorRejectReason?: string;

  /** 管理后台审核人 */
  @Column({ name: 'admin_reviewer', type: 'varchar', length: 50, nullable: true, comment: '管理后台审核人' })
  adminReviewer?: string;

  /** 管理后台审核时间 */
  @Column({ name: 'admin_review_at', type: 'timestamp', nullable: true, comment: '管理后台审核时间' })
  adminReviewAt?: Date;

  /** 管理后台审核备注/拒绝原因 */
  @Column({ name: 'admin_review_note', type: 'text', nullable: true, comment: '管理后台审核备注/拒绝原因' })
  adminReviewNote?: string;

  /** 是否为后台预设模板（1=预设, 0=租户自建） */
  @Column({ name: 'is_preset', type: 'tinyint', default: 0, comment: '是否为后台预设模板' })
  isPreset: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
