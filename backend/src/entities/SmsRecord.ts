import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('sms_records')
export class SmsRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 20 })
  phone: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ type: 'text', nullable: true })
  response: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}