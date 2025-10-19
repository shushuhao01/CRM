import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('performance_metrics')
export class PerformanceMetric {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ length: 100 })
  userId: string;

  @Column({ length: 50 })
  metricType: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  value: number;

  @Column({ type: 'date' })
  date: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}