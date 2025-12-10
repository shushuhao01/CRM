import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

/**
 * 售后服务跟进记录实体
 */
@Entity('service_follow_up_records')
export class ServiceFollowUp {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ name: 'service_id', length: 50 })
  serviceId: string;

  @Column({ name: 'service_number', length: 50, nullable: true })
  serviceNumber: string;

  @Column({ name: 'follow_up_time', type: 'timestamp' })
  followUpTime: Date;

  @Column({ type: 'text' })
  content: string;

  @Column({ name: 'created_by', length: 100, nullable: true })
  createdBy: string;

  @Column({ name: 'created_by_id', length: 50, nullable: true })
  createdById: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
