import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

@Entity('sms_records')
export class SmsRecord {
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

  @Column({ name: 'template_id', length: 50, nullable: true })
  templateId: string;

  @Column({ name: 'template_name', length: 100, nullable: true })
  templateName: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'json' })
  recipients: any[];

  @Column({ name: 'recipient_count', default: 0 })
  recipientCount: number;

  @Column({ name: 'success_count', default: 0 })
  successCount: number;

  @Column({ name: 'fail_count', default: 0 })
  failCount: number;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, sending, completed, failed

  @Column({ name: 'send_details', type: 'json', nullable: true })
  sendDetails: any;

  @Column({ length: 50 })
  applicant: string;

  @Column({ name: 'applicant_name', length: 50, nullable: true })
  applicantName: string;

  @Column({ name: 'applicant_dept', length: 100, nullable: true })
  applicantDept: string;

  @Column({ name: 'approved_by', length: 50, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'sent_at', type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'text', nullable: true })
  remark: string;

  /** 发送人手机号 */
  @Column({ name: 'sender_phone', type: 'varchar', length: 20, nullable: true, comment: '发送人手机号' })
  senderPhone?: string;

  /** 发送人用户ID（用于角色数据范围过滤） */
  @Column({ name: 'sender_user_id', type: 'varchar', length: 50, nullable: true, comment: '发送人用户ID' })
  senderUserId?: string;

  /** 发送人部门ID（用于部门经理数据范围过滤） */
  @Column({ name: 'sender_department_id', type: 'varchar', length: 100, nullable: true, comment: '发送人部门ID' })
  senderDepartmentId?: string;

  /** 触发来源：manual=手动发送, auto=自动触发 */
  @Column({ name: 'trigger_source', type: 'varchar', length: 20, nullable: true, default: 'manual', comment: '触发来源' })
  triggerSource?: string;

  /** 自动发送规则ID（如果是自动触发） */
  @Column({ name: 'auto_rule_id', type: 'varchar', length: 50, nullable: true, comment: '自动发送规则ID' })
  autoRuleId?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
