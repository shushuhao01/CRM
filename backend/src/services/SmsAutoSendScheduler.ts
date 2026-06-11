/**
 * 短信自动发送定时调度器
 *
 * 处理三类"定时触发"型自动发送规则（事件型规则由订单/客户操作直接触发）：
 * - birthday_wish    生日祝福：每天扫描当天生日的客户（当天去重）
 * - follow_up_remind 跟进提醒：扫描未来1小时内到达计划跟进时间的待跟进记录（当天去重）
 * - payment_remind   付款提醒：扫描创建超过24小时仍未付清的订单（每单仅提醒一次）
 *
 * 每小时扫描一次，复用 SmsAutoSendService.triggerEvent 的完整链路
 * （规则匹配/部门范围/发送时间窗口/额度校验/真实发送/统计）
 */
import { AppDataSource } from '../config/database';
import { TenantContextManager } from '../utils/tenantContext';
import { SmsAutoSendService } from './SmsAutoSendService';
import { log } from '../config/logger';

const SCAN_INTERVAL_MS = 60 * 60 * 1000; // 每小时
const FIRST_RUN_DELAY_MS = 2 * 60 * 1000; // 启动后2分钟首跑

const SCHEDULED_EVENTS = ['birthday_wish', 'follow_up_remind', 'payment_remind'];

export class SmsAutoSendScheduler {
  private static timer: NodeJS.Timeout | null = null;
  private static running = false;

  static start(): void {
    if (SmsAutoSendScheduler.timer) return;
    setTimeout(() => {
      SmsAutoSendScheduler.runOnce().catch(err => log.error('[SMS-Scheduler] 首次扫描失败:', err));
    }, FIRST_RUN_DELAY_MS);
    SmsAutoSendScheduler.timer = setInterval(() => {
      SmsAutoSendScheduler.runOnce().catch(err => log.error('[SMS-Scheduler] 定时扫描失败:', err));
    }, SCAN_INTERVAL_MS);
    log.info('[SMS-Scheduler] 短信自动发送定时调度已启动（每小时扫描：生日祝福/跟进提醒/付款提醒）');
  }

  static stop(): void {
    if (SmsAutoSendScheduler.timer) {
      clearInterval(SmsAutoSendScheduler.timer);
      SmsAutoSendScheduler.timer = null;
    }
  }

  /** 执行一轮扫描 */
  static async runOnce(): Promise<void> {
    if (SmsAutoSendScheduler.running) return;
    SmsAutoSendScheduler.running = true;
    try {
      // 查询所有启用的定时型规则，按 租户+事件 去重分组
      const rules = await AppDataSource.query(
        `SELECT DISTINCT tenant_id, trigger_event FROM sms_auto_send_rules
         WHERE enabled = 1 AND trigger_event IN (?, ?, ?)`,
        SCHEDULED_EVENTS
      ).catch(() => []);

      for (const row of rules) {
        const tenantId: string | null = row.tenant_id || null;
        const event: string = row.trigger_event;
        try {
          // 用 ALS 建立租户上下文（定时器中无请求上下文）
          await TenantContextManager.run(
            { tenantId: tenantId || undefined, userId: 'system' },
            async () => {
              if (event === 'birthday_wish') {
                await SmsAutoSendScheduler.scanBirthday(tenantId);
              } else if (event === 'follow_up_remind') {
                await SmsAutoSendScheduler.scanFollowUp(tenantId);
              } else if (event === 'payment_remind') {
                await SmsAutoSendScheduler.scanPaymentRemind(tenantId);
              }
            }
          );
        } catch (err) {
          log.error(`[SMS-Scheduler] 扫描失败 (tenant=${tenantId ?? 'private'}, event=${event}):`, err);
        }
      }
    } finally {
      SmsAutoSendScheduler.running = false;
    }
  }

  /** 租户过滤SQL片段 */
  private static tenantSql(tenantId: string | null, prefix = ''): { sql: string; params: any[] } {
    return tenantId
      ? { sql: `AND ${prefix}tenant_id = ?`, params: [tenantId] }
      : { sql: `AND ${prefix}tenant_id IS NULL`, params: [] };
  }

  /** 当天是否已对该手机号触发过此事件（按记录去重，避免重复发送） */
  private static async alreadySentToday(
    tenantId: string | null,
    triggerEvent: string,
    phone: string,
    sinceToday = true,
    contentLike?: string
  ): Promise<boolean> {
    try {
      const t = SmsAutoSendScheduler.tenantSql(tenantId, 'r.');
      const conditions: string[] = [];
      const params: any[] = [triggerEvent, ...t.params];
      if (sinceToday) conditions.push(`r.created_at >= CURDATE()`);
      conditions.push(`r.recipients LIKE ?`);
      params.push(`%${phone}%`);
      if (contentLike) {
        conditions.push(`r.content LIKE ?`);
        params.push(`%${contentLike}%`);
      }
      const rows = await AppDataSource.query(
        `SELECT COUNT(*) AS c FROM sms_records r
         JOIN sms_auto_send_rules a ON r.auto_rule_id = a.id
         WHERE a.trigger_event = ? ${t.sql} AND ${conditions.join(' AND ')}`,
        params
      );
      return Number(rows?.[0]?.c || 0) > 0;
    } catch {
      return false; // 查重失败时不阻断发送
    }
  }

  /** 生日祝福：当天生日的客户 */
  private static async scanBirthday(tenantId: string | null): Promise<void> {
    const t = SmsAutoSendScheduler.tenantSql(tenantId);
    const customers = await AppDataSource.query(
      `SELECT id, name, phone, gender, customer_no AS customerNo, address, email
       FROM customers
       WHERE phone IS NOT NULL AND phone != ''
         AND birthday IS NOT NULL
         AND DATE_FORMAT(birthday, '%m-%d') = DATE_FORMAT(CURDATE(), '%m-%d')
         ${t.sql}
       LIMIT 500`,
      t.params
    ).catch(() => []);

    for (const c of customers) {
      if (await SmsAutoSendScheduler.alreadySentToday(tenantId, 'birthday_wish', c.phone)) continue;
      await SmsAutoSendService.triggerEvent(tenantId || '', 'birthday_wish', {
        customer: { name: c.name, phone: c.phone, gender: c.gender, customerNo: c.customerNo, address: c.address, email: c.email },
        userId: 'system'
      });
    }
    if (customers.length > 0) {
      log.info(`[SMS-Scheduler] 生日祝福扫描完成 (tenant=${tenantId ?? 'private'}): ${customers.length}位当天生日客户`);
    }
  }

  /** 跟进提醒：未来1小时内到达计划跟进时间的待跟进记录 */
  private static async scanFollowUp(tenantId: string | null): Promise<void> {
    const t = SmsAutoSendScheduler.tenantSql(tenantId, 'f.');
    const rows = await AppDataSource.query(
      `SELECT f.id, f.customer_id AS customerId, f.customer_name AS customerName,
              c.phone, c.gender, c.customer_no AS customerNo,
              f.next_follow_up_date AS nextFollowUp, f.user_id AS userId
       FROM follow_up_records f
       JOIN customers c ON f.customer_id = c.id
       WHERE f.status = 'pending'
         AND f.next_follow_up_date IS NOT NULL
         AND f.next_follow_up_date >= NOW()
         AND f.next_follow_up_date < DATE_ADD(NOW(), INTERVAL 1 HOUR)
         AND c.phone IS NOT NULL AND c.phone != ''
         ${t.sql}
       LIMIT 500`,
      t.params
    ).catch(() => []);

    for (const f of rows) {
      if (await SmsAutoSendScheduler.alreadySentToday(tenantId, 'follow_up_remind', f.phone)) continue;
      await SmsAutoSendService.triggerEvent(tenantId || '', 'follow_up_remind', {
        customer: { name: f.customerName, phone: f.phone, gender: f.gender, customerNo: f.customerNo },
        userId: f.userId || 'system'
      });
    }
    if (rows.length > 0) {
      log.info(`[SMS-Scheduler] 跟进提醒扫描完成 (tenant=${tenantId ?? 'private'}): ${rows.length}条待跟进`);
    }
  }

  /** 付款提醒：创建超过24小时仍未付清的有效订单（每单仅提醒一次） */
  private static async scanPaymentRemind(tenantId: string | null): Promise<void> {
    const t = SmsAutoSendScheduler.tenantSql(tenantId);
    const orders = await AppDataSource.query(
      `SELECT id, order_number AS orderNo, customer_name AS customerName,
              customer_phone AS phone, total_amount AS totalAmount, created_by AS createdBy
       FROM orders
       WHERE payment_status IN ('unpaid', 'partial')
         AND status NOT IN ('cancelled', 'closed', 'deleted', 'draft', 'rejected')
         AND created_at <= DATE_SUB(NOW(), INTERVAL 24 HOUR)
         AND customer_phone IS NOT NULL AND customer_phone != ''
         ${t.sql}
       LIMIT 500`,
      t.params
    ).catch(() => []);

    for (const o of orders) {
      // 每个订单只提醒一次：以订单号在历史记录内容中去重
      if (await SmsAutoSendScheduler.alreadySentToday(tenantId, 'payment_remind', o.phone, false, o.orderNo)) continue;
      await SmsAutoSendService.triggerEvent(tenantId || '', 'payment_remind', {
        customer: { name: o.customerName, phone: o.phone },
        order: { orderNo: o.orderNo, totalAmount: Number(o.totalAmount) },
        userId: o.createdBy || 'system'
      });
    }
    if (orders.length > 0) {
      log.info(`[SMS-Scheduler] 付款提醒扫描完成 (tenant=${tenantId ?? 'private'}): ${orders.length}个未付款订单`);
    }
  }
}
