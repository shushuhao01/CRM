import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('follow_up_records')
export class FollowUp {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ name: 'call_id', length: 50, nullable: true })
  callId: string;

  @Column({ name: 'customer_id', length: 50 })
  customerId: string;

  @Column({ name: 'customer_name', length: 100, nullable: true })
  customerName: string;

  @Column({ name: 'follow_up_type', type: 'enum', enum: ['call', 'visit', 'email', 'message'], default: 'call' })
  type: string;

  @Column({ type: 'text', nullable: true })
  content: string;

  @Column({ name: 'next_follow_up_date', type: 'timestamp', nullable: true })
  nextFollowUp: Date;

  @Column({ type: 'enum', enum: ['low', 'medium', 'high', 'urgent'], default: 'medium' })
  priority: string;

  @Column({ type: 'enum', enum: ['pending', 'completed', 'cancelled'], default: 'pending' })
  status: string;

  @Column({ name: 'user_id', length: 50 })
  createdBy: string;

  @Column({ name: 'user_name', length: 50, nullable: true })
  createdByName: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
