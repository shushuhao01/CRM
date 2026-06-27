import { Entity, PrimaryColumn, Column, CreateDateColumn } from 'typeorm';

/**
 * 代收管理操作日志实体（审计用，记录代收金额修改/返款/取消等操作）
 */
@Entity('cod_operation_logs')
export class CodOperationLog {
  @PrimaryColumn('varchar', { length: 50 })
  id: string;

  @Column('varchar', { name: 'tenant_id', length: 36, nullable: true, comment: '租户ID' })
  tenantId: string | null;

  @Column('varchar', { name: 'order_id', length: 50, comment: '订单ID' })
  orderId: string;

  @Column('varchar', { name: 'order_number', length: 50, nullable: true, comment: '订单号' })
  orderNumber: string | null;

  @Column('varchar', { name: 'operation_type', length: 50, comment: '操作类型：cod_amount_change-代收金额变更, cod_returned-标记返款, cod_cancelled-取消代收' })
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
