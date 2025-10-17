import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, ManyToOne, JoinColumn } from 'typeorm';
import { Order } from './Order';

@Entity('order_status_history')
export class OrderStatusHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: 'int', comment: '订单ID' })
  orderId: number;

  @Column({ 
    type: 'varchar',
    length: 50,
    comment: '状态'
  })
  status: 'pending' | 'confirmed' | 'paid' | 'shipped' | 'delivered' | 'completed' | 'cancelled' | 'refunded';

  @Column({ type: 'text', nullable: true, comment: '状态变更备注' })
  notes?: string;

  @Column({ type: 'int', nullable: true, comment: '操作人ID' })
  operatorId?: number;

  @Column({ length: 50, nullable: true, comment: '操作人姓名' })
  operatorName?: string;

  @CreateDateColumn({ comment: '创建时间' })
  createdAt: Date;

  // 关联关系
  @ManyToOne(() => Order, order => order.statusHistory)
  @JoinColumn({ name: 'orderId' })
  order: Order;
}