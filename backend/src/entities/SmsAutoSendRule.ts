import { Entity, PrimaryColumn, Column, CreateDateColumn, UpdateDateColumn, BeforeInsert } from 'typeorm';
import { v4 as uuidv4 } from 'uuid';

/**
 * 短信自动发送规则实体
 *
 * triggerEvent 枚举值:
 *   order_shipped    — 订单发货（上传物流单号后触发）
 *   order_confirmed  — 订单确认
 *   order_paid       — 订单支付完成
 *   order_delivered   — 订单签收
 *   customer_created — 新客户创建
 *   follow_up_remind — 跟进提醒
 *   payment_remind   — 付款提醒
 *   birthday_wish    — 生日祝福
 */
@Entity('sms_auto_send_rules')
export class SmsAutoSendRule {
  @PrimaryColumn({ type: 'varchar', length: 50 })
  id: string;

  @BeforeInsert()
  generateId() {
    if (!this.id) {
      this.id = uuidv4();
    }
  }

  @Column({ name: 'tenant_id', type: 'varchar', length: 36, nullable: true, comment: '租户ID' })
  tenantId?: string;

  /** 规则名称 */
  @Column({ type: 'varchar', length: 100, comment: '规则名称' })
  name: string;

  /** 关联的短信模板ID */
  @Column({ name: 'template_id', type: 'varchar', length: 50, comment: '关联模板ID' })
  templateId: string;

  /** 关联的短信模板名称（冗余） */
  @Column({ name: 'template_name', type: 'varchar', length: 100, nullable: true, comment: '模板名称' })
  templateName?: string;

  /** 触发事件类型 */
  @Column({ name: 'trigger_event', type: 'varchar', length: 50, comment: '触发事件类型' })
  triggerEvent: string;

  /** 生效部门IDs（JSON数组，空数组=全部部门） */
  @Column({ name: 'effective_departments', type: 'json', nullable: true, comment: '生效部门IDs' })
  effectiveDepartments?: string[];

  /** 时间范围配置（JSON） */
  @Column({ name: 'time_range_config', type: 'json', nullable: true, comment: '时间范围配置' })
  timeRangeConfig?: {
    workdaysOnly?: boolean;      // 是否仅工作日
    startHour?: number;          // 开始小时 (0-23)
    endHour?: number;            // 结束小时 (0-23)
    sendImmediately?: boolean;   // 是否立即发送（无视时间限制）
  };

  /** 是否启用 */
  @Column({ type: 'tinyint', default: 1, comment: '是否启用' })
  enabled: number;

  /** 创建人ID */
  @Column({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人ID' })
  createdBy?: string;

  /** 创建人姓名 */
  @Column({ name: 'created_by_name', type: 'varchar', length: 50, nullable: true, comment: '创建人姓名' })
  createdByName?: string;

  /** 发送成功统计 */
  @Column({ name: 'stats_sent_count', type: 'int', default: 0, comment: '发送成功总数' })
  statsSentCount: number;

  /** 发送失败统计 */
  @Column({ name: 'stats_fail_count', type: 'int', default: 0, comment: '发送失败总数' })
  statsFailCount: number;

  /** 最后触发时间 */
  @Column({ name: 'last_triggered_at', type: 'timestamp', nullable: true, comment: '最后触发时间' })
  lastTriggeredAt?: Date;

  /** 规则描述 */
  @Column({ type: 'text', nullable: true, comment: '规则描述' })
  description?: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}

