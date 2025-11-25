import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('operation_logs')
export class OperationLog {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { name: 'user_id', length: 50, nullable: true })
  userId: string | null;

  @Column('varchar', { name: 'user_name', length: 50, nullable: true })
  username: string | null;

  @Column('varchar', { length: 100 })
  action: string;

  @Column('varchar', { length: 50 })
  module: string;

  @Column('varchar', { name: 'resource_type', length: 50, nullable: true })
  resourceType: string | null;

  @Column('varchar', { name: 'resource_id', length: 50, nullable: true })
  resourceId: string | null;

  @Column('text')
  description: string;

  @Column('varchar', { name: 'ip_address', length: 45, nullable: true })
  ipAddress: string | null;

  @Column('text', { name: 'user_agent', nullable: true })
  userAgent: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
