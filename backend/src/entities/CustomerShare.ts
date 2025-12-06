import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('customer_shares')
export class CustomerShare {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ name: 'customer_id' })
  customerId: string;

  @Column({ name: 'customer_name' })
  customerName: string;

  @Column({ name: 'shared_by' })
  sharedBy: string;

  @Column({ name: 'shared_by_name' })
  sharedByName: string;

  @Column({ name: 'shared_to' })
  sharedTo: string;

  @Column({ name: 'shared_to_name' })
  sharedToName: string;

  @Column({ name: 'time_limit', default: 0 })
  timeLimit: number;

  @Column({ name: 'expire_time', type: 'timestamp', nullable: true })
  expireTime: Date | null;

  @Column({ nullable: true })
  remark: string;

  @Column({ default: 'active' })
  status: string; // active, expired, recalled

  @Column({ name: 'recall_time', type: 'timestamp', nullable: true })
  recallTime: Date | null;

  @Column({ name: 'recall_reason', nullable: true })
  recallReason: string;

  @Column({ name: 'original_owner', nullable: true })
  originalOwner: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
