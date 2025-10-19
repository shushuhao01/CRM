import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('calls')
export class Call {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  customerId: string;

  @Column({ length: 100 })
  userId: string;

  @Column({ length: 20 })
  phoneNumber: string;

  @Column({ type: 'int', default: 0 })
  duration: number;

  @Column({ length: 20, default: 'completed' })
  status: string;

  @Column({ type: 'text', nullable: true })
  notes: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}