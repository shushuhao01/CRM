import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('cod_cancel_applications')
export class CodCancelApplication {
  @PrimaryColumn('varchar', { length: 36 })
  id: string;

  @Column('varchar', { length: 36, name: 'order_id' })
  orderId: string;

  @Column('varchar', { length: 50, name: 'order_number' })
  orderNumber: string;

  @Column('varchar', { length: 36, name: 'applicant_id' })
  applicantId: string;

  @Column('varchar', { length: 50, name: 'applicant_name' })
  applicantName: string;

  @Column('varchar', { length: 36, nullable: true, name: 'department_id' })
  departmentId: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'department_name' })
  departmentName: string | null;

  @Column('decimal', { precision: 10, scale: 2, name: 'original_cod_amount' })
  originalCodAmount: number;

  @Column('decimal', { precision: 10, scale: 2, name: 'modified_cod_amount' })
  modifiedCodAmount: number;

  @Column('text', { name: 'cancel_reason' })
  cancelReason: string;

  @Column('simple-json', { nullable: true, name: 'payment_proof' })
  paymentProof: string[] | null;

  @Column('varchar', { length: 20, default: 'pending' })
  status: string;

  @Column('varchar', { length: 36, nullable: true, name: 'reviewer_id' })
  reviewerId: string | null;

  @Column('varchar', { length: 50, nullable: true, name: 'reviewer_name' })
  reviewerName: string | null;

  @Column('text', { nullable: true, name: 'review_remark' })
  reviewRemark: string | null;

  @Column('datetime', { nullable: true, name: 'reviewed_at' })
  reviewedAt: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
