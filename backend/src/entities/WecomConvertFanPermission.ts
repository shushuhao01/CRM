/**
 * 企微客户转粉 · 自助套餐权益台账
 *
 * 记录租户购买的自助转粉套餐（月卡/季卡/年卡）权益周期。
 * 菜单解锁本体存于 system_config('tenant_wecom_package_{tenantId}').menuPermissions.customerConvert
 * （复用现有套餐机制），本表仅做权益有效期台账：过期校验、续费叠加、客服查询。
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_convert_fan_permissions')
@Index('IDX_convert_fan_perm_tenant', ['tenantId'])
export class WecomConvertFanPermission {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, comment: '租户ID' })
  tenantId: string;

  @Column({ name: 'order_no', type: 'varchar', length: 40, nullable: true, comment: '关联支付订单号' })
  orderNo: string;

  @Column({ name: 'plan_id', type: 'varchar', length: 30, nullable: true, comment: '套餐ID: monthly/quarterly/yearly' })
  planId: string;

  @Column({ name: 'plan_name', type: 'varchar', length: 50, nullable: true, comment: '套餐名称' })
  planName: string;

  @Column({ name: 'start_date', type: 'datetime', comment: '权益开始时间' })
  startDate: Date;

  @Column({ name: 'end_date', type: 'datetime', comment: '权益到期时间(续费叠加)' })
  endDate: Date;

  @Column({ name: 'status', type: 'varchar', length: 10, default: 'active', comment: '状态: active/expired' })
  status: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
