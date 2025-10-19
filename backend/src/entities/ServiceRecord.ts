import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('service_records')
export class ServiceRecord {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  customerId: string;

  @Column({ length: 100 })
  serviceType: string;

  @Column({ type: 'text' })
  description: string;

  @Column({ length: 20, default: 'pending' })
  status: string;

  @Column({ length: 100 })
  assignedTo: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}