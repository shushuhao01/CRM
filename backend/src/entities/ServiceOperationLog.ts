import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 售后服务操作记录实体
 */
@Entity('service_operation_logs')
export class ServiceOperationLog {
  @PrimaryColumn({ length: 50 })
  id: string;

  @Column({ name: 'service_id', length: 50 })
  serviceId: string;

  @Column({ name: 'service_number', length: 50, nullable: true })
  serviceNumber: string;

  @Column({ name: 'operation_type', length: 50 })
  operationType: string;

  @Column({ name: 'operation_content', type: 'text', nullable: true })
  operationContent: string;

  @Column({ name: 'old_value', length: 255, nullable: true })
  oldValue: string;

  @Column({ name: 'new_value', length: 255, nullable: true })
  newValue: string;

  @Column({ name: 'operator_id', length: 50, nullable: true })
  operatorId: string;

  @Column({ name: 'operator_name', length: 100, nullable: true })
  operatorName: string;

  @Column({ type: 'text', nullable: true })
  remark: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
