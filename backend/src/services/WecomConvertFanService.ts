/**
 * 企微客户转粉核心编排服务
 *
 * 职责：
 * 1. executeTransfer      发起转粉（一次多选、后端自动分批 ≤100/批、批间频控、45009退避）
 * 2. pollPendingResults   定时轮询官方接替状态（transfer_result），回填订单结果
 * 3. getSelfPermission    查询租户自助套餐权益（有效期校验）
 * 4. grantSelfPlan        购买成功后发放权益（续费在原 endDate 上叠加）
 * 5. getConvertPricing    读取 Admin 定价配置（wecom_pricing_config.convertFan 段）
 *
 * 官方接口参考见 WecomApiService 转粉段注释。
 */
import { AppDataSource } from '../config/database';
import { WecomConvertFanOrder } from '../entities/WecomConvertFanOrder';
import { WecomConvertFanPermission } from '../entities/WecomConvertFanPermission';
import { WecomApiService } from './WecomApiService';
import { log } from '../config/logger';

/** 单次官方API请求最大客户数（官方硬限制） */
const BATCH_SIZE = 100;
/** 批间间隔 ms（防频控：每企业单接口1万次/分，50批仅50次，500ms 串行足够安全） */
const BATCH_INTERVAL_MS = 500;
/** 45009 (api freq out of limit) 退避重试等待 ms */
const RATE_LIMIT_BACKOFF_MS = 2000;
/** 进程内并发闸门：同时最多 N 个订单在分批发送中（防多租户叠加触 IP 级频控） */
const MAX_CONCURRENT_EXECUTES = 2;
/** 接替结果轮询保留天数：超过后不再轮询（24h 自动接替 + 客户拒绝即时可知，3天足够） */
const POLL_RETAIN_DAYS = 3;

/** 接替状态官方码 → 系统内状态 */
export const TAKEOVER_STATUS_MAP: Record<number, string> = {
  1: 'success',    // 接替完毕
  2: 'waiting',    // 等待接替
  3: 'rejected',   // 客户拒绝
  4: 'limit'       // 接替方客户达到上限
};

class WecomConvertFanService {
  /** 并发闸门计数 */
  private executing = 0;
  private waiters: Array<() => void> = [];

  /** 获取并发闸门（信号量） */
  private async acquireGate(): Promise<void> {
    if (this.executing < MAX_CONCURRENT_EXECUTES) {
      this.executing++;
      return;
    }
    await new Promise<void>(resolve => this.waiters.push(resolve));
    this.executing++;
  }

  private releaseGate(): void {
    this.executing--;
    const next = this.waiters.shift();
    if (next) next();
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // ==================== 数据表自动迁移（免手动执行SQL） ====================

  /** 已就绪的迁移 Promise（进程内仅执行一次，失败不缓存以便重试） */
  private tablesReady: Promise<void> | null = null;

  /**
   * 确保转粉两张表存在且字段齐全 —— 服务启动后首次访问时自动建表/补列。
   * 项目约定 synchronize:false，本方法即本功能的"启动期迁移"，幂等可重复执行。
   */
  async ensureTables(): Promise<void> {
    if (!this.tablesReady) {
      this.tablesReady = this.doEnsureTables().catch((e: any) => {
        log.error('[ConvertFan] 自动迁移失败(下次调用重试):', e.message);
        this.tablesReady = null;
      });
    }
    return this.tablesReady;
  }

  private async doEnsureTables(): Promise<void> {
    const ds = AppDataSource;

    // 1. 转粉订单/工单主表
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`wecom_convert_fan_orders\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` VARCHAR(36) NOT NULL COMMENT '租户ID',
        \`config_id\` INT NULL COMMENT '关联wecom_configs.id',
        \`order_no\` VARCHAR(40) NOT NULL COMMENT '业务单号 CVF前缀',
        \`pay_order_no\` VARCHAR(40) NULL COMMENT '关联payment_orders订单号',
        \`mode\` VARCHAR(10) NOT NULL COMMENT '模式: agent服务商代办/self租户自助',
        \`transfer_type\` VARCHAR(10) NOT NULL COMMENT '类型: active在职/resigned离职',
        \`handover_userid\` VARCHAR(64) NOT NULL COMMENT '原跟进成员userid',
        \`handover_name\` VARCHAR(100) NULL COMMENT '原跟进成员姓名(冗余展示)',
        \`takeover_userid\` VARCHAR(64) NOT NULL COMMENT '接替成员userid',
        \`takeover_name\` VARCHAR(100) NULL COMMENT '接替成员姓名(冗余展示)',
        \`customer_count\` INT NOT NULL DEFAULT 0 COMMENT '提交客户数',
        \`success_count\` INT NOT NULL DEFAULT 0 COMMENT '最终接替成功数(轮询回填)',
        \`batch_count\` INT NOT NULL DEFAULT 1 COMMENT '分批数 ceil(n/100)',
        \`billing_mode\` VARCHAR(20) NULL COMMENT '计费: per_account按号/per_tier按客户数阶梯/self_plan自助套餐',
        \`price_snapshot\` TEXT NULL COMMENT '计费快照(JSON)',
        \`status\` VARCHAR(20) NOT NULL DEFAULT 'pending' COMMENT '状态: pending/paid/submitted/partial/success/rejected/failed/closed',
        \`submit_result\` TEXT NULL COMMENT '发起时官方逐客户结果(JSON)',
        \`result_detail\` TEXT NULL COMMENT '轮询回填逐客户接替状态(JSON)',
        \`last_sync_at\` DATETIME NULL COMMENT '最近结果同步时间',
        \`transfer_success_msg\` VARCHAR(255) NULL COMMENT '在职转接成功欢迎语(≤200字符)',
        \`agent_remark\` TEXT NULL COMMENT '租户工单备注/诉求',
        \`admin_remark\` TEXT NULL COMMENT '服务商处理备注',
        \`operator_id\` INT NULL COMMENT '执行操作人ID',
        \`operator_name\` VARCHAR(100) NULL COMMENT '执行操作人姓名',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        UNIQUE KEY \`UQ_convert_fan_order_no\` (\`order_no\`),
        KEY \`IDX_convert_fan_orders_tenant\` (\`tenant_id\`),
        KEY \`IDX_convert_fan_orders_status\` (\`status\`),
        KEY \`IDX_convert_fan_orders_config\` (\`config_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户转粉订单(在职/离职继承)'
    `);
    await this.ensureColumns('wecom_convert_fan_orders', [
      { name: 'pay_order_no', sql: "ADD COLUMN `pay_order_no` VARCHAR(40) NULL COMMENT '关联payment_orders订单号' AFTER `order_no`" },
      { name: 'handover_name', sql: "ADD COLUMN `handover_name` VARCHAR(100) NULL COMMENT '原跟进成员姓名(冗余展示)' AFTER `handover_userid`" },
      { name: 'takeover_name', sql: "ADD COLUMN `takeover_name` VARCHAR(100) NULL COMMENT '接替成员姓名(冗余展示)' AFTER `takeover_userid`" },
      { name: 'success_count', sql: "ADD COLUMN `success_count` INT NOT NULL DEFAULT 0 COMMENT '最终接替成功数(轮询回填)' AFTER `customer_count`" },
      { name: 'batch_count', sql: "ADD COLUMN `batch_count` INT NOT NULL DEFAULT 1 COMMENT '分批数 ceil(n/100)' AFTER `success_count`" },
      { name: 'billing_mode', sql: "ADD COLUMN `billing_mode` VARCHAR(20) NULL COMMENT '计费: per_account按号/per_tier按客户数阶梯/self_plan自助套餐' AFTER `batch_count`" },
      { name: 'price_snapshot', sql: "ADD COLUMN `price_snapshot` TEXT NULL COMMENT '计费快照(JSON)' AFTER `billing_mode`" },
      { name: 'submit_result', sql: "ADD COLUMN `submit_result` TEXT NULL COMMENT '发起时官方逐客户结果(JSON)' AFTER `status`" },
      { name: 'result_detail', sql: "ADD COLUMN `result_detail` TEXT NULL COMMENT '轮询回填逐客户接替状态(JSON)' AFTER `submit_result`" },
      { name: 'last_sync_at', sql: "ADD COLUMN `last_sync_at` DATETIME NULL COMMENT '最近结果同步时间' AFTER `result_detail`" },
      { name: 'transfer_success_msg', sql: "ADD COLUMN `transfer_success_msg` VARCHAR(255) NULL COMMENT '在职转接成功欢迎语(≤200字符)' AFTER `last_sync_at`" },
      { name: 'agent_remark', sql: "ADD COLUMN `agent_remark` TEXT NULL COMMENT '租户工单备注/诉求' AFTER `transfer_success_msg`" },
      { name: 'admin_remark', sql: "ADD COLUMN `admin_remark` TEXT NULL COMMENT '服务商处理备注' AFTER `agent_remark`" },
      { name: 'operator_id', sql: "ADD COLUMN `operator_id` INT NULL COMMENT '执行操作人ID' AFTER `admin_remark`" },
      { name: 'operator_name', sql: "ADD COLUMN `operator_name` VARCHAR(100) NULL COMMENT '执行操作人姓名' AFTER `operator_id`" }
    ]);

    // 2. 自助套餐权益台账
    await ds.query(`
      CREATE TABLE IF NOT EXISTS \`wecom_convert_fan_permissions\` (
        \`id\` INT NOT NULL AUTO_INCREMENT,
        \`tenant_id\` VARCHAR(36) NOT NULL COMMENT '租户ID',
        \`order_no\` VARCHAR(40) NULL COMMENT '关联支付订单号',
        \`plan_id\` VARCHAR(30) NULL COMMENT '套餐ID: monthly/quarterly/yearly',
        \`plan_name\` VARCHAR(50) NULL COMMENT '套餐名称',
        \`start_date\` DATETIME NOT NULL COMMENT '权益开始时间',
        \`end_date\` DATETIME NOT NULL COMMENT '权益到期时间(续费叠加)',
        \`status\` VARCHAR(10) NOT NULL DEFAULT 'active' COMMENT '状态: active/expired',
        \`created_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
        \`updated_at\` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
        PRIMARY KEY (\`id\`),
        KEY \`IDX_convert_fan_perm_tenant\` (\`tenant_id\`)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci COMMENT='企微客户转粉自助套餐权益台账'
    `);

    log.info('[ConvertFan] 表结构自检完成（自动建表+补列）');
  }

  /** 对照实体逐列补齐缺失字段（旧表升级兼容，并发场景去重容错） */
  private async ensureColumns(table: string, required: Array<{ name: string; sql: string }>): Promise<void> {
    try {
      const cols = await AppDataSource.query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
        [table]
      );
      const existing = new Set(cols.map((c: any) => c.COLUMN_NAME));
      for (const col of required.filter(c => !existing.has(c.name))) {
        try {
          await AppDataSource.query(`ALTER TABLE \`${table}\` ${col.sql}`);
          log.info(`[ConvertFan] 已补充 ${table}.${col.name}`);
        } catch (e: any) {
          if (!String(e.message || '').includes('Duplicate column name')) {
            log.warn(`[ConvertFan] 补列失败 ${table}.${col.name}:`, e.message);
          }
        }
      }
    } catch (e: any) {
      log.warn(`[ConvertFan] 列检查失败(${table}):`, e.message);
    }
  }

  /** 读取转粉定价配置（Admin Pricing.vue 维护的 wecom_pricing_config.convertFan 段） */
  async getConvertPricing(): Promise<any> {
    try {
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
      ).catch(() => []);
      if (rows.length === 0) return null;
      const config = JSON.parse(rows[0].config_value);
      return config?.convertFan || null;
    } catch (e: any) {
      log.error('[ConvertFan] getConvertPricing error:', e.message);
      return null;
    }
  }

  /**
   * 发起转粉（代办与自助共用核心入口）
   *
   * 前端一次可勾选任意数量客户，本方法自动按 ≤100/批切片串行调用官方 API，
   * 租户/运营无感知。逐客户结果合并写入订单 submitResult。
   *
   * @returns 订单号与逐客户发起结果
   */
  async executeTransfer(params: {
    tenantId: string;
    configId: number;
    orderNo?: string;              // 代办模式由 Admin 指定工单执行；自助模式可不传（自动生成）
    mode: 'agent' | 'self';
    transferType: 'active' | 'resigned';
    handoverUserid: string;
    handoverName?: string;
    takeoverUserid: string;
    takeoverName?: string;
    externalUserids: string[];
    transferSuccessMsg?: string;
    billingMode?: string;
    priceSnapshot?: any;
    operatorId?: number;
    operatorName?: string;
    accessToken: string;
  }): Promise<{ order: WecomConvertFanOrder; submitResult: any[] }> {
    // 去重 + 过滤空值
    const externalUserids = Array.from(new Set((params.externalUserids || []).filter(id => !!id)));
    if (externalUserids.length === 0) {
      throw new Error('请选择要转接的客户');
    }
    if (params.transferType === 'active' && params.handoverUserid === params.takeoverUserid) {
      throw new Error('原跟进人与接替人不能是同一位成员');
    }

    await this.acquireGate();
    try {
      const batchCount = Math.ceil(externalUserids.length / BATCH_SIZE);
      const now = new Date();

      // 创建订单（或复用代办工单）
      let order: WecomConvertFanOrder | null = null;
      const repo = AppDataSource.getRepository(WecomConvertFanOrder);
      if (params.orderNo) {
        order = await repo.findOne({ where: { orderNo: params.orderNo } });
      }
      if (!order) {
        order = new WecomConvertFanOrder();
        order.orderNo = params.orderNo || this.generateOrderNo();
        order.tenantId = params.tenantId;
        order.createdAt = now;
      }
      order.configId = params.configId;
      order.mode = params.mode;
      order.transferType = params.transferType;
      order.handoverUserid = params.handoverUserid;
      order.handoverName = params.handoverName || params.handoverUserid;
      order.takeoverUserid = params.takeoverUserid;
      order.takeoverName = params.takeoverName || params.takeoverUserid;
      order.customerCount = externalUserids.length;
      order.batchCount = batchCount;
      order.billingMode = params.billingMode || (params.mode === 'self' ? 'self_plan' : '');
      if (params.priceSnapshot) {
        order.priceSnapshot = JSON.stringify(params.priceSnapshot);
      }
      order.transferSuccessMsg = params.transferType === 'active'
        ? (params.transferSuccessMsg || '您好，后续将由新的服务人员继续为您服务。')
        : undefined;
      order.status = 'submitted';
      order.submitResult = '[]';
      order.resultDetail = '[]';
      order.operatorId = params.operatorId;
      order.operatorName = params.operatorName;
      await repo.save(order);

      // 自动分批串行调用官方接口
      const allResults: Array<{ external_userid: string; errcode: number; errmsg?: string }> = [];
      let totalErrcode = 0;   // 全局错误（如 60011 权限不足）
      let totalErrmsg = '';
      let hasBatchSuccess = false;

      for (let i = 0; i < batchCount; i++) {
        const chunk = externalUserids.slice(i * BATCH_SIZE, (i + 1) * BATCH_SIZE);
        if (i > 0) await this.sleep(BATCH_INTERVAL_MS);

        let batchResp: any = null;
        let retried = false;

        // 带一次 45009 退避重试
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            batchResp = params.transferType === 'active'
              ? await WecomApiService.transferActiveCustomer(
                  params.accessToken, params.handoverUserid, params.takeoverUserid, chunk, order.transferSuccessMsg)
              : await WecomApiService.transferResignedCustomer(
                  params.accessToken, params.handoverUserid, params.takeoverUserid, chunk);
            break;
          } catch (e: any) {
            const isRateLimit = /45009/.test(e?.message || '');
            if (isRateLimit && !retried) {
              retried = true;
              log.warn(`[ConvertFan] ${order.orderNo} batch#${i + 1} hit 45009, backoff ${RATE_LIMIT_BACKOFF_MS}ms retry`);
              await this.sleep(RATE_LIMIT_BACKOFF_MS);
              continue;
            }
            // 全局性错误（权限/IP白名单等）：整单失败，直接终止
            totalErrcode = 1;
            totalErrmsg = e?.message || '官方接口调用失败';
            log.error(`[ConvertFan] ${order.orderNo} batch#${i + 1} fatal:`, e?.message);
            break;
          }
        }

        if (batchResp?.customer) {
          for (const item of batchResp.customer) {
            allResults.push({
              external_userid: item.external_userid,
              errcode: item.errcode || 0,
              errmsg: item.errmsg || ''
            });
          }
          if (batchResp.customer.some((c: any) => (c.errcode || 0) === 0)) {
            hasBatchSuccess = true;
          }
        }
        if (totalErrcode !== 0) break;
      }

      // 汇总状态：官方顶层 errcode=0 且至少一批有成功发起 → submitted；全失败 → failed
      const submittedCount = allResults.filter(r => r.errcode === 0).length;
      if (totalErrcode !== 0 && !hasBatchSuccess) {
        order.status = 'failed';
        order.submitResult = JSON.stringify([{ fatal: totalErrmsg, errcode: totalErrcode }]);
      } else {
        order.submitResult = JSON.stringify(allResults);
        order.status = 'submitted';
      }
      order.lastSyncAt = new Date();
      await repo.save(order);

      log.info(`[ConvertFan] ${order.orderNo} submitted: total=${externalUserids.length} batches=${batchCount} apiOk=${submittedCount} status=${order.status}`);
      return { order, submitResult: allResults };
    } finally {
      this.releaseGate();
    }
  }

  /**
   * 轮询未完结订单的官方接替状态（由 SchedulerService 每30分钟调用）
   *
   * 只轮询 status='submitted' 且创建时间在保留期内的订单。
   * 官方查询接口按 (handover, takeover) 对分页拉取，聚合后回填 resultDetail 与最终状态。
   */
  async pollPendingResults(): Promise<{ checked: number; updated: number }> {
    const repo = AppDataSource.getRepository(WecomConvertFanOrder);
    const deadline = new Date(Date.now() - POLL_RETAIN_DAYS * 24 * 3600 * 1000);
    const orders = await repo.createQueryBuilder('o')
      .where('o.status = :status', { status: 'submitted' })
      .andWhere('o.created_at >= :deadline', { deadline })
      .limit(50)
      .getMany();

    let updated = 0;
    for (const order of orders) {
      try {
        const detail = await this.syncOrderResult(order);
        if (detail) updated++;
      } catch (e: any) {
        log.error(`[ConvertFan] poll ${order.orderNo} error:`, e.message);
      }
    }
    if (orders.length > 0) {
      log.info(`[ConvertFan] poll done: checked=${orders.length} updated=${updated}`);
    }
    return { checked: orders.length, updated };
  }

  /** 同步单个订单的接替结果并回填（返回是否产生状态变化） */
  async syncOrderResult(order: WecomConvertFanOrder): Promise<boolean> {
    const repo = AppDataSource.getRepository(WecomConvertFanOrder);
    let accessToken: string;
    try {
      accessToken = await WecomApiService.getAccessTokenByConfigId(order.configId, 'external');
    } catch (e: any) {
      log.warn(`[ConvertFan] ${order.orderNo} token unavailable: ${e.message}`);
      return false;
    }

    // 分页拉全量状态
    const statusItems: Array<{ external_userid: string; status: number; takeover_time: number }> = [];
    let cursor = '';
    for (let page = 0; page < 20; page++) {
      const resp = order.transferType === 'active'
        ? await WecomApiService.getActiveTransferResult(accessToken, order.handoverUserid, order.takeoverUserid, cursor)
        : await WecomApiService.getResignedTransferResult(accessToken, order.handoverUserid, order.takeoverUserid, cursor);
      for (const c of resp.customer || []) {
        statusItems.push({ external_userid: c.external_userid, status: c.status, takeover_time: c.takeover_time });
      }
      if (!resp.next_cursor) break;
      cursor = resp.next_cursor;
    }

    if (statusItems.length === 0) return false;

    // 聚合判定最终状态
    const counts: Record<string, number> = { success: 0, waiting: 0, rejected: 0, limit: 0 };
    for (const item of statusItems) {
      const key = TAKEOVER_STATUS_MAP[item.status] || 'waiting';
      counts[key]++;
    }

    let finalStatus: string;
    if (counts.waiting === 0 && counts.success === 0) {
      finalStatus = counts.rejected > 0 ? 'rejected' : 'failed';
    } else if (counts.waiting === 0) {
      finalStatus = counts.success === order.customerCount ? 'success' : 'partial';
    } else {
      finalStatus = 'submitted'; // 仍在24h窗口内
    }

    const prevDetail = order.resultDetail;
    order.resultDetail = JSON.stringify({
      counts,
      items: statusItems.map(i => ({ external_userid: i.external_userid, status: i.status, takeover_time: i.takeover_time })),
      syncedAt: new Date().toISOString()
    });
    order.successCount = counts.success;
    order.status = finalStatus;
    order.lastSyncAt = new Date();
    await repo.save(order);
    return prevDetail !== order.resultDetail || finalStatus !== 'submitted';
  }

  // ==================== 自助套餐权益 ====================

  /**
   * 查询租户自助权益（含菜单解锁状态 + 有效期校验）
   * 菜单本体在 system_config('tenant_wecom_package')，本表负责有效期
   */
  async getSelfPermission(tenantId: string): Promise<{ purchased: boolean; expired: boolean; plan?: any }> {
    const repo = AppDataSource.getRepository(WecomConvertFanPermission);
    const rows = await repo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .orderBy('p.endDate', 'DESC')
      .getMany();
    if (rows.length === 0) return { purchased: false, expired: true };

    const latest = rows[0];
    const now = new Date();
    const expired = latest.endDate.getTime() < now.getTime();

    // 顺带把过期未标记的记录落库
    if (expired && latest.status === 'active') {
      latest.status = 'expired';
      await repo.save(latest);
    }
    return {
      purchased: true,
      expired,
      plan: {
        planId: latest.planId,
        planName: latest.planName,
        startDate: latest.startDate,
        endDate: latest.endDate,
        status: expired ? 'expired' : 'active'
      }
    };
  }

  /**
   * 购买成功后发放自助权益（onPaid 回调调用）
   * 未过期续费：在原 endDate 上叠加；已过期或首购：从当前时间起算
   */
  async grantSelfPlan(tenantId: string, planId: string, planName: string, cycleMonths: number, orderNo?: string): Promise<void> {
    const repo = AppDataSource.getRepository(WecomConvertFanPermission);
    const existing = await repo.createQueryBuilder('p')
      .where('p.tenantId = :tenantId', { tenantId })
      .orderBy('p.endDate', 'DESC')
      .getOne();

    const now = new Date();
    const base = existing && existing.endDate.getTime() > now.getTime() ? existing.endDate : now;
    const endDate = new Date(base.getTime() + cycleMonths * 30 * 24 * 3600 * 1000);

    const perm = new WecomConvertFanPermission();
    perm.tenantId = tenantId;
    perm.orderNo = orderNo;
    perm.planId = planId;
    perm.planName = planName;
    perm.startDate = now;
    perm.endDate = endDate;
    perm.status = 'active';
    await repo.save(perm);
    log.info(`[ConvertFan] grantSelfPlan tenant=${tenantId} plan=${planId} endDate=${endDate.toISOString()}`);
  }

  /**
   * Admin 手动开通/赠送自助权益（服务台"手动开通"按钮）
   * 写台账 + 解锁租户菜单，一次调用完成
   */
  async grantManual(tenantId: string, planId: string, planName: string, cycleMonths: number): Promise<void> {
    await this.ensureTables();
    await this.grantSelfPlan(tenantId, planId, planName, cycleMonths);
    await this.unlockTenantMenu(tenantId);
  }

  /**
   * 支付成功回调入口（PaymentService.updateOrderStatus 按 convert_ 前缀调用）
   *
   * @param packageId convert_self_monthly|quarterly|yearly → 发放自助权益+解锁菜单
   *                  convert_agent_acct|convert_agent_tier   → 代办工单 pending→paid 进入服务商队列
   */
  async onPaid(orderNo: string, packageId: string, tenantId: string): Promise<void> {
    await this.ensureTables();
    try {
      if (packageId.startsWith('convert_self_')) {
        const planId = packageId.replace('convert_self_', '');
        const cycles: Record<string, { months: number; name: string }> = {
          monthly: { months: 1, name: '月卡' },
          quarterly: { months: 3, name: '季卡' },
          yearly: { months: 12, name: '年卡' }
        };
        const cycle = cycles[planId];
        if (!cycle) {
          log.warn(`[ConvertFan] onPaid unknown planId: ${planId}`);
          return;
        }
        const pricing = await this.getConvertPricing();
        const plan = (pricing?.selfPlans || []).find((p: any) => p.id === planId);
        await this.grantSelfPlan(tenantId, planId, plan?.name || cycle.name, cycle.months, orderNo);
        await this.unlockTenantMenu(tenantId);
      } else if (packageId.startsWith('convert_agent_')) {
        // 代办工单：pending → paid（进入服务商待处理队列）
        const repo = AppDataSource.getRepository(WecomConvertFanOrder);
        const order = await repo.findOne({ where: { orderNo } });
        if (order && order.status === 'pending') {
          order.status = 'paid';
          order.payOrderNo = orderNo;
          await repo.save(order);
          log.info(`[ConvertFan] agent order paid: ${orderNo}`);
        }
      }
    } catch (e: any) {
      log.error(`[ConvertFan] onPaid error (${orderNo}, ${packageId}):`, e.message);
      throw e;
    }
  }

  /** 解锁租户企微菜单的 customerConvert 权限（复用 tenant_wecom_package_* 机制） */
  private async unlockTenantMenu(tenantId: string): Promise<void> {
    try {
      const key = `tenant_wecom_package_${tenantId}`;
      const rows = await AppDataSource.query(
        "SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]
      ).catch(() => []);
      let pkg: any = {};
      if (rows.length > 0) {
        try { pkg = JSON.parse(rows[0].config_value); } catch { pkg = {}; }
      }
      if (!pkg.menuPermissions) pkg.menuPermissions = {};
      pkg.menuPermissions.customerConvert = true;
      pkg.updatedAt = new Date().toISOString();
      const val = JSON.stringify(pkg);
      if (rows.length > 0) {
        await AppDataSource.query(
          "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]
        );
      } else {
        await AppDataSource.query(
          "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
          [key, val]
        );
      }
      log.info(`[ConvertFan] unlocked customerConvert for tenant ${tenantId}`);
    } catch (e: any) {
      log.error('[ConvertFan] unlockTenantMenu error:', e.message);
    }
  }

  /** 生成业务单号：CVF + 时间戳 + 随机（与支付单同号透传） */
  private generateOrderNo(): string {
    const ts = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = `${ts.getFullYear()}${pad(ts.getMonth() + 1)}${pad(ts.getDate())}${pad(ts.getHours())}${pad(ts.getMinutes())}${pad(ts.getSeconds())}`;
    const rand = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CVF${d}${rand}`;
  }
}

export const wecomConvertFanService = new WecomConvertFanService();
