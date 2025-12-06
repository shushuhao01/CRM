import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sms_records')
export class SmsRecord {
  @PrimaryGeneratedColumn()
  id: number;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
