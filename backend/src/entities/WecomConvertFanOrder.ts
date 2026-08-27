/**
 * 企微客户转粉（在职/离职继承）订单实体
 *
 * 支持两种模式：
 * - agent 服务商代办：租户提交工单付费，服务商在管理后台代执行
 * - self  租户自助：购买套餐解锁菜单后自行操作
 *
 * 转接类型：
 * - active   在职继承（官方接口 externalcontact/transfer_customer）
 * - resigned 离职继承（官方接口 externalcontact/resigned/transfer_customer）
 *
 * 官方限制：API 单次 ≤100 客户（系统自动分批）、在职同一客户 90 天内最多 2 次、
 * 发起后 24 小时自动接替、客户可拒绝
 *
 * 实施方案见 private-deploy/核心文档/企微客户转粉功能实施方案.md
 */
import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, Index } from 'typeorm';

@Entity('wecom_convert_fan_orders')
@Index('IDX_convert_fan_orders_tenant', ['tenantId'])
@Index('IDX_convert_fan_orders_status', ['status'])
export class WecomConvertFanOrder {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, comment: '租户ID' })
  tenantId: string;

  @Column({ name: 'config_id', type: 'int', nullable: true, comment: '关联wecom_configs.id' })
  configId: number;

  @Column({ name: 'order_no', type: 'varchar', length: 40, unique: true, comment: '业务单号 CVF前缀' })
  orderNo: string;

  @Column({ name: 'pay_order_no', type: 'varchar', length: 40, nullable: true, comment: '关联payment_orders订单号' })
  payOrderNo: string;

  @Column({ name: 'mode', type: 'varchar', length: 10, comment: '模式: agent服务商代办/self租户自助' })
  mode: string;

  @Column({ name: 'transfer_type', type: 'varchar', length: 10, comment: '类型: active在职/resigned离职' })
  transferType: string;

  // ==================== 转接要素 ====================

  @Column({ name: 'handover_userid', type: 'varchar', length: 64, comment: '原跟进成员userid' })
  handoverUserid: string;

  @Column({ name: 'handover_name', type: 'varchar', length: 100, nullable: true, comment: '原跟进成员姓名(冗余展示)' })
  handoverName: string;

  @Column({ name: 'takeover_userid', type: 'varchar', length: 64, comment: '接替成员userid' })
  takeoverUserid: string;

  @Column({ name: 'takeover_name', type: 'varchar', length: 100, nullable: true, comment: '接替成员姓名(冗余展示)' })
  takeoverName: string;

  @Column({ name: 'customer_count', type: 'int', default: 0, comment: '提交客户数' })
  customerCount: number;

  @Column({ name: 'success_count', type: 'int', default: 0, comment: '最终接替成功数(轮询回填)' })
  successCount: number;

  @Column({ name: 'batch_count', type: 'int', default: 1, comment: '分批数 ceil(n/100)' })
  batchCount: number;

  // ==================== 计费快照（下单时定格） ====================

  @Column({ name: 'billing_mode', type: 'varchar', length: 20, nullable: true, comment: '计费: per_account按号/per_tier按客户数阶梯/self_plan自助套餐' })
  billingMode: string;

  @Column({ name: 'price_snapshot', type: 'text', nullable: true, comment: '计费快照(JSON)' })
  priceSnapshot: string;

  // ==================== 状态机 ====================
  // pending 待付款 → paid 待处理(代办) → submitted 已发起 → success/partial/rejected/failed
  // self 模式提交即 submitted；pending/closed 为代办工单特有

  @Column({ name: 'status', type: 'varchar', length: 20, default: 'pending', comment: '状态: pending/paid/submitted/partial/success/rejected/failed/closed' })
  status: string;

  @Column({ name: 'submit_result', type: 'text', nullable: true, comment: '发起时官方逐客户结果(JSON)' })
  submitResult: string;

  @Column({ name: 'result_detail', type: 'text', nullable: true, comment: '轮询回填逐客户接替状态(JSON)' })
  resultDetail: string;

  @Column({ name: 'last_sync_at', type: 'datetime', nullable: true, comment: '最近结果同步时间' })
  lastSyncAt: Date;

  @Column({ name: 'transfer_success_msg', type: 'varchar', length: 255, nullable: true, comment: '在职转接成功欢迎语(≤200字符)' })
  transferSuccessMsg: string;

  // ==================== 代办工单扩展 ====================

  @Column({ name: 'agent_remark', type: 'text', nullable: true, comment: '租户工单备注/诉求' })
  agentRemark: string;

  @Column({ name: 'admin_remark', type: 'text', nullable: true, comment: '服务商处理备注' })
  adminRemark: string;

  @Column({ name: 'operator_id', type: 'int', nullable: true, comment: '执行操作人ID' })
  operatorId: number;

  @Column({ name: 'operator_name', type: 'varchar', length: 100, nullable: true, comment: '执行操作人姓名' })
  operatorName: string;

  @CreateDateColumn({ name: 'created_at', comment: '创建时间' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at', comment: '更新时间' })
  updatedAt: Date;
}
