import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { Order } from './Order';
import { LogisticsTrace } from './LogisticsTrace';

export enum LogisticsStatus {
  PENDING = 'pending',           // 待发货
  PICKED_UP = 'picked_up',       // 已揽件
  IN_TRANSIT = 'in_transit',     // 运输中
  OUT_FOR_DELIVERY = 'out_for_delivery', // 派送中
  DELIVERED = 'delivered',       // 已签收
  EXCEPTION = 'exception',       // 包裹异常
  REJECTED = 'rejected',         // 拒收
  RETURNED = 'returned'          // 退回
}

@Entity('logistics_tracking')
export class LogisticsTracking {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'varchar', length: 50, comment: '订单ID' })
  orderId: string;

  @Column({ length: 100, comment: '物流单号' })
  trackingNo: string;

  @Column({ length: 50, comment: '物流公司代码' })
  companyCode: string;

  @Column({ length: 100, comment: '物流公司名称' })
  companyName: string;

  @Column({
    type: 'varchar',
    length: 50,
    default: LogisticsStatus.PENDING,
    comment: '物流状态'
  })
  status: LogisticsStatus;

  @Column({ length: 200, nullable: true, comment: '当前位置' })
  currentLocation?: string;

  @Column({ type: 'text', nullable: true, comment: '状态描述' })
  statusDescription?: string;

  @Column({ type: 'datetime', nullable: true, comment: '最后更新时间' })
  lastUpdateTime?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '预计送达时间' })
  estimatedDeliveryTime?: Date;

  @Column({ type: 'datetime', nullable: true, comment: '实际送达时间' })
  actualDeliveryTime?: Date;

  @Column({ length: 100, nullable: true, comment: '签收人' })
  signedBy?: string;

  @Column({ type: 'json', nullable: true, comment: '扩展信息' })
  extraInfo?: Record<string, any>;

  @Column({ type: 'boolean', default: true, comment: '是否启用自动同步' })
  autoSyncEnabled: boolean;

  @Column({ type: 'datetime', nullable: true, comment: '下次同步时间' })
  nextSyncTime?: Date;

  @Column({ type: 'int', default: 0, comment: '同步失败次数' })
  syncFailureCount: number;

  @Column({ type: 'text', nullable: true, comment: '最后同步错误信息' })
  lastSyncError?: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ comment: '更新时间' })
  updatedAt: Date;

  // 关联关系
  @ManyToOne(() => Order, order => order.logisticsTracking)
  @JoinColumn({ name: 'orderId' })
  order: Order;

  @OneToMany(() => LogisticsTrace, trace => trace.logisticsTracking)
  traces: LogisticsTrace[];
}
