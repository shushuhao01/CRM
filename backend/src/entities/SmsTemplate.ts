import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sms_templates')
export class SmsTemplate {
  @PrimaryGeneratedColumn()
  id: number;

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

  @Column({ length: 50 })
  applicant: string;

  @Column({ name: 'applicant_name', length: 50, nullable: true })
  applicantName: string;

  @Column({ name: 'applicant_dept', length: 100, nullable: true })
  applicantDept: string;

  @Column({ length: 20, default: 'pending' })
  status: string; // pending, approved, rejected

  @Column({ name: 'approved_by', length: 50, nullable: true })
  approvedBy: string;

  @Column({ name: 'approved_at', type: 'timestamp', nullable: true })
  approvedAt: Date;

  @Column({ name: 'is_system', default: false })
  isSystem: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
