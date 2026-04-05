import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

@Entity('migration_history')
export class MigrationHistory {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ type: 'varchar', length: 200, unique: true })
  filename!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  checksum?: string;

  @Column({ name: 'execution_time', type: 'int', nullable: true, comment: '执行耗时(ms)' })
  executionTime?: number;

  @Column({ type: 'tinyint', default: 1 })
  success!: number;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage?: string;

  @CreateDateColumn({ name: 'executed_at' })
  executedAt!: Date;
}

