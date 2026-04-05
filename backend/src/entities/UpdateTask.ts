import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('update_tasks')
export class UpdateTask {
  @PrimaryColumn({ type: 'varchar', length: 36 })
  id!: string;

  @Column({ name: 'version_id', type: 'varchar', length: 36 })
  versionId!: string;

  @Column({ name: 'customer_id', type: 'varchar', length: 36, nullable: true })
  customerId?: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: 'pending'
  })
  status!: string;

  @Column({ name: 'current_step', type: 'varchar', length: 50, nullable: true })
  currentStep?: string;

  @Column({ type: 'int', default: 0 })
  progress!: number;

  @Column({ type: 'longtext', nullable: true })
  logs?: string;

  @Column({ name: 'backup_path', type: 'varchar', length: 500, nullable: true })
  backupPath?: string;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @Column({ name: 'from_version', type: 'varchar', length: 20, nullable: true })
  fromVersion?: string;

  @Column({ name: 'to_version', type: 'varchar', length: 20, nullable: true })
  toVersion?: string;

  @Column({ name: 'triggered_by', type: 'varchar', length: 36, nullable: true })
  triggeredBy?: string;

  @Column({ name: 'started_at', type: 'datetime', nullable: true })
  startedAt?: Date;

  @Column({ name: 'completed_at', type: 'datetime', nullable: true })
  completedAt?: Date;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

