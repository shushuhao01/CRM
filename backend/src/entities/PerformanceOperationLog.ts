import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 绩效管理操作日志实体（审计用，记录有效状态/系数/备注等变更）
 */
@Entity('performance_operation_logs')
export class PerformanceOperationLog {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true, comment: '租户ID' })
  tenantId: string | null;

  @Column('varchar', { name: 'order_id', length: 50, comment: '订单ID' })
  orderId: string;

  @Column('varchar', { name: 'order_number', length: 50, nullable: true, comment: '订单号' })
  orderNumber: string | null;

  @Column('varchar', { name: 'operation_type', length: 50, comment: '操作类型：status_change-有效状态变更, coefficient_change-系数变更, remark_change-备注变更' })
  operationType: string;

  @Column('varchar', { name: 'operation_content', length: 500, comment: '操作内容描述' })
  operationContent: string;

  @Column('varchar', { name: 'old_value', length: 255, nullable: true, comment: '变更前的值' })
  oldValue: string | null;

  @Column('varchar', { name: 'new_value', length: 255, nullable: true, comment: '变更后的值' })
  newValue: string | null;

  @Column('varchar', { name: 'operator_id', length: 50, nullable: true, comment: '操作人ID' })
  operatorId: string | null;

  @Column('varchar', { name: 'operator_name', length: 100, nullable: true, comment: '操作人姓名' })
  operatorName: string | null;

  @Column('text', { nullable: true, comment: '附加备注' })
  remark: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;
}
