/**
 * 客户转粉（在职/离职客户继承）路由 - 租户端
 *
 * 挂载于 /wecom/convert-fan/*
 *
 * 业务流：
 * - 未购买：查看服务介绍/定价 → ① 提交代办工单+支付（服务商代执行）
 *          → ② 购买自助套餐（月/季/年卡）支付成功解锁菜单
 * - 已购买：自助转接操作（一次多选、后端自动分批 ≤100/批）
 * - 记录：我的转粉记录/工单进度
 *
 * 官方接口参考见 WecomApiService 转粉段注释。
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomConvertFanOrder } from '../../entities/WecomConvertFanOrder';
import { wecomConvertFanService } from '../../services/WecomConvertFanService';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

const PLAN_CYCLES: Record<string, { months: number; name: string }> = {
  monthly: { months: 1, name: '月卡' },
  quarterly: { months: 3, name: '季卡' },
  yearly: { months: 12, name: '年卡' }
};

/** 获取当前租户可用的企微配置（优先第三方授权配置） */
async function getActiveConfig(): Promise<WecomConfig | null> {
  const configRepo = getTenantRepo(WecomConfig);
  const configs = await configRepo.find({ where: { isEnabled: true } });
  if (configs.length === 0) return null;
  // 优先第三方模式（permanent_code 存在），与转粉权限申请模式一致
  const third = configs.find(c => c.authType === 'third_party' && c.permanentCode);
  return third || configs[0];
}

// ==================== 服务状态与定价 ====================

/**
 * GET /wecom/convert-fan/status
 * 自助套餐购买状态 + 权益有效期 + 定价（含 enabled 过滤）
 */
router.get('/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const perm = await wecomConvertFanService.getSelfPermission(tenantId);
    const pricing = await wecomConvertFanService.getConvertPricing();

    // 过滤未启用的定价项，成本字段不下发
    const safePricing: any = { enabled: false, agent: {}, selfPlans: [] };
    if (pricing) {
      safePricing.enabled = pricing.enabled !== false;
      if (pricing.agent?.perAccount?.enabled) {
        safePricing.agent.perAccount = {
          unitPrice: pricing.agent.perAccount.unitPrice,
          minAccounts: pricing.agent.perAccount.minAccounts || 1,
          note: pricing.agent.perAccount.note || ''
        };
      }
      if (pricing.agent?.perTier?.enabled) {
        safePricing.agent.perTier = {
          tiers: (pricing.agent.perTier.tiers || []).filter((t: any) => t.enabled !== false)
            .map((t: any) => ({ id: t.id, name: t.name, minCount: t.minCount, maxCount: t.maxCount, price: t.price }))
        };
      }
      if (Array.isArray(pricing.selfPlans)) {
        safePricing.selfPlans = pricing.selfPlans
          .filter((p: any) => p.enabled !== false)
          .map((p: any) => ({ id: p.id, name: p.name, cycle: p.cycle, price: p.price, recommended: !!p.recommended, description: p.description || '' }));
      }
    }
    res.json({ success: true, data: { ...perm, pricing: safePricing } });
  } catch (error: any) {
    log.error('[ConvertFan] status error:', error.message);
    res.status(500).json({ success: false, message: '获取服务状态失败' });
  }
});

/**
 * GET /wecom/convert-fan/pricing
 * 兼容别名，同 /status 的 pricing 段
 */
router.get('/pricing', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const pricing = await wecomConvertFanService.getConvertPricing();
    res.json({ success: true, data: pricing || null });
  } catch (error: any) {
    log.error('[ConvertFan] pricing error:', error.message);
    res.status(500).json({ success: false, message: '获取定价失败' });
  }
});

// ==================== 数据源（选人/选客户） ====================

/**
 * GET /wecom/convert-fan/unassigned-list
 * 离职待分配客户池（官方 get_unassigned_list 分页聚合 + 按原跟进人分组）
 */
router.get('/unassigned-list', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const config = await getActiveConfig();
    if (!config) return res.status(400).json({ success: false, message: '请先完成企业微信授权配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');

    const all: Array<{ handover_userid: string; external_userid: string; dimission_time: number }> = [];
    let cursor = '';
    for (let page = 0; page < 10; page++) {
      const resp = await WecomApiService.getUnassignedList(accessToken, cursor, 1000);
      all.push(...resp.info);
      if (resp.is_last || !resp.next_cursor) break;
      cursor = resp.next_cursor;
    }

    // 按原跟进人分组，前端按"号"选择
    const groups: Record<string, { handoverUserid: string; customers: string[]; dimissionTime: number }> = {};
    for (const item of all) {
      if (!groups[item.handover_userid]) {
        groups[item.handover_userid] = { handoverUserid: item.handover_userid, customers: [], dimissionTime: item.dimission_time };
      }
      groups[item.handover_userid].customers.push(item.external_userid);
    }
    const list = Object.values(groups).sort((a, b) => b.customers.length - a.customers.length);
    res.json({ success: true, data: { total: all.length, groups: list } });
  } catch (error: any) {
    log.error('[ConvertFan] unassigned-list error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '获取待分配列表失败' });
  }
});

/**
 * GET /wecom/convert-fan/followers
 * 在职成员列表（复用现有通讯录 API），标注接替可用性
 */
router.get('/followers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const config = await getActiveConfig();
    if (!config) return res.status(400).json({ success: false, message: '请先完成企业微信授权配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'contact');
    const deptId = parseInt(String(req.query.deptId || '0')) || 0;
    const resp = await (WecomApiService as any).getDepartmentUsers
      ? await (WecomApiService as any).getDepartmentUsers(accessToken, deptId)
      : null;
    if (!resp) {
      // WecomApiService 未暴露时走 user/simplelist 兜底
      const axios = (await import('axios')).default;
      const r = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/user/simplelist?access_token=${accessToken}&department_id=${deptId || 1}&fetch_child=1`);
      if (r.data.errcode !== 0) throw new Error(`获取成员失败: ${r.data.errmsg}`);
      const list = (r.data.userlist || []).map((u: any) => ({ userid: u.userid, name: u.name || u.userid, available: true }));
      return res.json({ success: true, data: list });
    }
    res.json({ success: true, data: resp });
  } catch (error: any) {
    log.error('[ConvertFan] followers error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '获取成员列表失败' });
  }
});

/**
 * GET /wecom/convert-fan/member-customers?userid=xxx&type=active|resigned
 * 指定成员（在职/离职）名下的外部联系人列表，供批量勾选
 * 离职场景直接从 unassigned-list 过滤；在职场景调 externalcontact/list
 */
router.get('/member-customers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const userid = String(req.query.userid || '');
    const type = String(req.query.type || 'active');
    if (!userid) return res.status(400).json({ success: false, message: '缺少 userid' });

    if (type === 'resigned') {
      const config = await getActiveConfig();
      if (!config) return res.status(400).json({ success: false, message: '请先完成企业微信授权配置' });
      const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
      const all: string[] = [];
      let cursor = '';
      for (let page = 0; page < 10; page++) {
        const resp = await WecomApiService.getUnassignedList(accessToken, cursor, 1000);
        for (const item of resp.info) {
          if (item.handover_userid === userid) all.push(item.external_userid);
        }
        if (resp.is_last || !resp.next_cursor) break;
        cursor = resp.next_cursor;
      }
      return res.json({ success: true, data: { externalUserids: all } });
    }

    // 在职成员客户列表
    const config = await getActiveConfig();
    if (!config) return res.status(400).json({ success: false, message: '请先完成企业微信授权配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');
    const axios = (await import('axios')).default;
    const r = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${encodeURIComponent(userid)}`);
    if (r.data.errcode !== 0) throw new Error(`获取客户列表失败: ${r.data.errmsg} (${r.data.errcode})`);
    res.json({ success: true, data: { externalUserids: r.data.external_userid || [] } });
  } catch (error: any) {
    log.error('[ConvertFan] member-customers error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '获取客户列表失败' });
  }
});

// ==================== 代办工单（下单+支付） ====================

/**
 * POST /wecom/convert-fan/agent-orders
 * 提交代办工单 + 创建支付订单（二维码）
 * body: { billingMode: 'per_account'|'per_tier', accountCount?, customerCount?, handoverUserid?, transferType, agentRemark?, payType }
 * 价格以后端按 Admin 最新定价重算为准（防篡改），计费快照落库
 */
router.post('/agent-orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const currentUser = (req as any).currentUser;
    const { billingMode, accountCount, customerCount, handoverUserid, transferType, agentRemark, payType } = req.body || {};

    if (!['per_account', 'per_tier'].includes(billingMode)) {
      return res.status(400).json({ success: false, message: '请选择计费方式' });
    }
    if (!['active', 'resigned'].includes(transferType)) {
      return res.status(400).json({ success: false, message: '请选择转接类型' });
    }
    if (billingMode === 'per_account' && (!accountCount || accountCount < 1)) {
      return res.status(400).json({ success: false, message: '请填写转粉号数量' });
    }
    if (billingMode === 'per_tier' && (!customerCount || customerCount < 1)) {
      return res.status(400).json({ success: false, message: '请填写客户数量' });
    }
    if (!['wechat', 'alipay'].includes(payType)) {
      return res.status(400).json({ success: false, message: '请选择支付方式' });
    }

    const pricing = await wecomConvertFanService.getConvertPricing();
    if (!pricing || pricing.enabled === false) {
      return res.status(400).json({ success: false, message: '转粉服务暂未开放' });
    }

    // 按最新定价计算金额 + 生成计费快照
    let totalAmount = 0;
    let packageName = '';
    let priceSnapshot: any;
    if (billingMode === 'per_account') {
      const cfg = pricing.agent?.perAccount;
      if (!cfg?.enabled) return res.status(400).json({ success: false, message: '按号计费模式未开放' });
      const minAccounts = cfg.minAccounts || 1;
      if (accountCount < minAccounts) {
        return res.status(400).json({ success: false, message: `按号计费起转 ${minAccounts} 个号` });
      }
      totalAmount = Math.round(cfg.unitPrice * accountCount * 100) / 100;
      packageName = `客户转粉代办（按号） ${accountCount}个号`;
      priceSnapshot = { billingMode, unitPrice: cfg.unitPrice, accountCount };
    } else {
      const tiers = (pricing.agent?.perTier?.tiers || []).filter((t: any) => t.enabled !== false);
      const tier = tiers.find((t: any) => customerCount >= t.minCount && customerCount <= t.maxCount);
      if (!tier) return res.status(400).json({ success: false, message: '客户数量未命中任何定价档位，请联系服务商' });
      totalAmount = tier.price;
      packageName = `客户转粉代办（${tier.name}） ${customerCount}个客户`;
      priceSnapshot = { billingMode, tierId: tier.id, tierName: tier.name, minCount: tier.minCount, maxCount: tier.maxCount, price: tier.price };
    }

    // 生成业务单号（与支付单同号透传，保证回调可命中）
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const orderNo = `CVA${d}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;

    // 代办工单（支付成功后才进入 paid 队列）
    const orderRepo = AppDataSource.getRepository(WecomConvertFanOrder);
    const order = orderRepo.create({
      tenantId,
      orderNo,
      payOrderNo: orderNo,
      mode: 'agent',
      transferType,
      handoverUserid: handoverUserid || '',
      handoverName: '待服务商确认',
      takeoverUserid: '',
      takeoverName: '待服务商确认',
      customerCount: billingMode === 'per_tier' ? customerCount : 0,
      batchCount: 0,
      billingMode,
      priceSnapshot: JSON.stringify(priceSnapshot),
      status: 'pending',
      agentRemark: agentRemark || ''
    });
    await orderRepo.save(order);

    // 创建支付订单获取二维码
    let tenantName = '';
    try {
      const tRows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tenantId]);
      tenantName = tRows[0]?.name || '';
    } catch { /* ignore */ }

    const { paymentService } = await import('../../services/PaymentService');
    const payResult = await paymentService.createOrder({
      orderNo,
      packageId: billingMode === 'per_account' ? 'convert_agent_acct' : 'convert_agent_tier',
      packageName,
      amount: totalAmount,
      payType: payType as 'wechat' | 'alipay',
      tenantId: tenantId || undefined,
      tenantName,
      contactName: currentUser?.name || '',
      contactPhone: '',
      billingCycle: 'once'
    });
    if (!payResult.success) {
      return res.status(500).json({ success: false, message: payResult.message || '支付订单创建失败' });
    }

    res.json({
      success: true,
      data: {
        orderNo,
        amount: totalAmount,
        packageName,
        qrCode: payResult.qrCode || '',
        payUrl: payResult.payUrl || '',
        priceSnapshot
      }
    });
  } catch (error: any) {
    log.error('[ConvertFan] agent-orders error:', error.message);
    res.status(500).json({ success: false, message: '提交工单失败' });
  }
});

// ==================== 自助套餐购买 ====================

/**
 * POST /wecom/convert-fan/purchase-plan
 * 购买自助套餐（月/季/年卡）→ 支付成功回调解锁 customerConvert
 * body: { planId: 'monthly'|'quarterly'|'yearly', payType }
 */
router.post('/purchase-plan', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const currentUser = (req as any).currentUser;
    const { planId, payType } = req.body || {};
    const cycle = PLAN_CYCLES[planId];
    if (!cycle) return res.status(400).json({ success: false, message: '套餐不存在' });
    if (!['wechat', 'alipay'].includes(payType)) {
      return res.status(400).json({ success: false, message: '请选择支付方式' });
    }

    const pricing = await wecomConvertFanService.getConvertPricing();
    const plan = (pricing?.selfPlans || []).find((p: any) => p.id === planId && p.enabled !== false);
    if (!pricing || pricing.enabled === false || !plan) {
      return res.status(400).json({ success: false, message: '套餐暂未开放购买' });
    }

    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, '0');
    const d = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const orderNo = `CVP${d}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const packageName = `客户转粉自助套餐（${plan.name || cycle.name}）`;

    // 权益在支付回调 PaymentService.updateOrderStatus（convert_self_ 前缀）中发放，
    // payment_orders 行由 createOrder 内部创建（orderNo 透传保证回调命中），此处不重复 INSERT

    const { paymentService } = await import('../../services/PaymentService');
    const payResult = await paymentService.createOrder({
      orderNo,
      packageId: `convert_self_${planId}`,
      packageName,
      amount: plan.price,
      payType: payType as 'wechat' | 'alipay',
      tenantId: tenantId || undefined,
      tenantName: tenantNamePlaceholder(req),
      contactName: currentUser?.name || '',
      contactPhone: '',
      billingCycle: planId === 'monthly' ? 'monthly' : planId === 'quarterly' ? 'quarterly' : 'yearly'
    });
    if (!payResult.success) {
      return res.status(500).json({ success: false, message: payResult.message || '支付订单创建失败' });
    }

    res.json({
      success: true,
      data: { orderNo, amount: plan.price, packageName, qrCode: payResult.qrCode || '', payUrl: payResult.payUrl || '' }
    });
  } catch (error: any) {
    log.error('[ConvertFan] purchase-plan error:', error.message);
    res.status(500).json({ success: false, message: '购买失败' });
  }
});

/** 租户名称兜底读取 */
function tenantNamePlaceholder(req: Request): string {
  return (req as any).user?.tenantName || (req as any).currentUser?.tenantName || '';
}

// ==================== 自助转粉执行 ====================

/**
 * POST /wecom/convert-fan/execute
 * 自助发起转粉（需已购有效套餐）。一次多选、后端自动分批 ≤100/批
 * body: { transferType, handoverUserid, handoverName?, takeoverUserid, takeoverName?, externalUserids[], transferSuccessMsg? }
 */
router.post('/execute', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const currentUser = (req as any).currentUser;

    // 权益校验：菜单权限 + 台账有效期双保险
    const perm = await wecomConvertFanService.getSelfPermission(tenantId);
    if (!perm.purchased || perm.expired) {
      return res.status(403).json({ success: false, message: '自助转粉权益不存在或已过期，请先购买套餐' });
    }

    const { transferType, handoverUserid, handoverName, takeoverUserid, takeoverName, externalUserids, transferSuccessMsg } = req.body || {};
    if (!['active', 'resigned'].includes(transferType)) {
      return res.status(400).json({ success: false, message: '转接类型无效' });
    }
    if (!handoverUserid || !takeoverUserid) {
      return res.status(400).json({ success: false, message: '请选择原跟进人与接替人' });
    }
    if (!Array.isArray(externalUserids) || externalUserids.length === 0) {
      return res.status(400).json({ success: false, message: '请选择要转接的客户' });
    }
    if (externalUserids.length > 5000) {
      return res.status(400).json({ success: false, message: '单次最多转接 5000 个客户' });
    }

    const config = await getActiveConfig();
    if (!config) return res.status(400).json({ success: false, message: '请先完成企业微信授权配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');

    const result = await wecomConvertFanService.executeTransfer({
      tenantId,
      configId: config.id,
      mode: 'self',
      transferType,
      handoverUserid,
      handoverName,
      takeoverUserid,
      takeoverName,
      externalUserids,
      transferSuccessMsg,
      billingMode: 'self_plan',
      priceSnapshot: { planId: perm.plan?.planId, planName: perm.plan?.planName, endDate: perm.plan?.endDate },
      operatorId: currentUser?.id,
      operatorName: currentUser?.name,
      accessToken
    });

    res.json({
      success: true,
      data: {
        orderNo: result.order.orderNo,
        customerCount: result.order.customerCount,
        batchCount: result.order.batchCount,
        submitResult: result.submitResult,
        message: `已成功发起 ${result.submitResult.filter((r: any) => r.errcode === 0).length} 个客户的转接申请，官方将在 24 小时内自动完成接替`
      }
    });
  } catch (error: any) {
    log.error('[ConvertFan] execute error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 150) || '转接发起失败' });
  }
});

// ==================== 记录查询 ====================

/**
 * GET /wecom/convert-fan/orders
 * 我的转粉记录/工单（分页 + 状态筛选）
 */
router.get('/orders', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const { status, page = '1', pageSize = '20' } = req.query;
    const qb = AppDataSource.getRepository(WecomConvertFanOrder)
      .createQueryBuilder('o')
      .where('o.tenant_id = :tenantId', { tenantId });
    if (status) qb.andWhere('o.status = :status', { status });
    const total = await qb.getCount();
    const list = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((parseInt(String(page)) - 1) * parseInt(String(pageSize)))
      .take(parseInt(String(pageSize)))
      .getMany();
    res.json({
      success: true,
      data: {
        list: list.map(o => ({
          ...o,
          priceSnapshot: safeParse(o.priceSnapshot),
          submitResult: undefined,
          resultDetail: undefined,
          counts: safeParse(o.resultDetail)?.counts || null
        })),
        total
      }
    });
  } catch (error: any) {
    log.error('[ConvertFan] orders error:', error.message);
    res.status(500).json({ success: false, message: '获取记录失败' });
  }
});

/**
 * GET /wecom/convert-fan/orders/:orderNo
 * 单条详情（含逐客户接替状态聚合）
 */
router.get('/orders/:orderNo', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const order = await AppDataSource.getRepository(WecomConvertFanOrder).findOne({
      where: { orderNo: req.params.orderNo, tenantId }
    });
    if (!order) return res.status(404).json({ success: false, message: '记录不存在' });

    // 支付单状态一并返回（前端轮询支付结果用）
    let payStatus = '';
    try {
      const payRows = await AppDataSource.query(
        'SELECT status FROM payment_orders WHERE order_no = ? LIMIT 1', [order.payOrderNo || order.orderNo]
      );
      payStatus = payRows[0]?.status || '';
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        ...order,
        priceSnapshot: safeParse(order.priceSnapshot),
        submitResult: safeParse(order.submitResult),
        resultDetail: safeParse(order.resultDetail),
        payStatus
      }
    });
  } catch (error: any) {
    log.error('[ConvertFan] order detail error:', error.message);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

/**
 * POST /wecom/convert-fan/orders/:orderNo/cancel
 * 撤销待付款工单（pending/closed 可撤，已发起不可撤）
 */
router.post('/orders/:orderNo/cancel', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    const repo = AppDataSource.getRepository(WecomConvertFanOrder);
    const order = await repo.findOne({ where: { orderNo: req.params.orderNo, tenantId } });
    if (!order) return res.status(404).json({ success: false, message: '记录不存在' });
    if (!['pending'].includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可撤销' });
    }
    order.status = 'closed';
    order.adminRemark = '租户主动撤销';
    await repo.save(order);
    res.json({ success: true });
  } catch (error: any) {
    log.error('[ConvertFan] cancel error:', error.message);
    res.status(500).json({ success: false, message: '撤销失败' });
  }
});

function safeParse(str: string | null): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default router;
