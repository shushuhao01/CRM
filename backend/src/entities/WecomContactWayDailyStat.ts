/**
 * 活码每日统计实体
 * V4.0新增: 基于回调事件的活码每日添加/流失统计
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, Index } from 'typeorm';

@Entity('wecom_contact_way_daily_stats')
@Index('IDX_wcwds_contact_way', ['contactWayId'])
export class WecomContactWayDailyStat {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true })
  tenantId?: string;

  @Column({ name: 'contact_way_id', type: 'int', comment: '活码ID' })
  contactWayId: number;

  @Column({ name: 'stat_date', type: 'date', comment: '统计日期' })
  statDate: string;

  @Column({ name: 'add_count', type: 'int', default: 0, comment: '添加数' })
  addCount: number;

  @Column({ name: 'loss_count', type: 'int', default: 0, comment: '流失数' })
  lossCount: number;

  @Column({ name: 'net_count', type: 'int', default: 0, comment: '净增数' })
  netCount: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}

