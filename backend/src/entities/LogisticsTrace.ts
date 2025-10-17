import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { LogisticsTracking } from './LogisticsTracking';

@Entity('logistics_traces')
export class LogisticsTrace {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '物流跟踪ID' })
  logisticsTrackingId: number;

  @Column({ type: 'datetime', comment: '轨迹时间' })
  traceTime: Date;

  @Column({ length: 200, nullable: true, comment: '轨迹位置' })
  location?: string;

  @Column({ type: 'text', comment: '轨迹描述' })
  description: string;

  @Column({ length: 50, nullable: true, comment: '操作状态' })
  status?: string;

  @Column({ length: 100, nullable: true, comment: '操作员' })
  operator?: string;

  @Column({ length: 100, nullable: true, comment: '联系电话' })
  phone?: string;

  @Column({ type: 'json', nullable: true, comment: '原始数据' })
  rawData?: Record<string, any>;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => LogisticsTracking, tracking => tracking.traces)
  @JoinColumn({ name: 'logisticsTrackingId' })
  logisticsTracking: LogisticsTracking;
}