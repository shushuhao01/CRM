/**
 * Admin 管理后台 - 客户转粉服务台路由
 * 挂载于 /api/v1/admin/wecom-management/convert-fan/*
 *
 * 能力集：
 * 1. 代办工单管理：待处理工单列表 / 确认执行 / 拒绝
 * 2. 代执行转粉：选择租户企微配置 -> 拉成员/客户 -> 批量转接（自动分批）
 * 3. 转接记录：全租户订单 + 逐客户接替状态 + 立即同步
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomConvertFanOrder } from '../../entities/WecomConvertFanOrder';
import { WecomConvertFanPermission } from '../../entities/WecomConvertFanPermission';
import { wecomConvertFanService } from '../../services/WecomConvertFanService';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import { AdminOperationLog } from '../../entities/AdminOperationLog';

const router = Router();

/** RBAC细粒度权限检查（与 wecom-management.ts 同款） */
function checkPermission(req: Request, res: Response, permCode: string): boolean {
  const adminUser = (req as any).adminUser;
  const perms: string[] = adminUser?.permissions || [];
  if (perms.includes('*') || perms.includes(permCode)) {
    return true;
  }
  res.status(403).json({ success: false, message: '权限不足，无法执行此操作' });
  return false;
}

async function writeOpLog(req: Request, action: string, detail: any) {
  try {
    const adminUser = (req as any).adminUser;
    const repo = AppDataSource.getRepository(AdminOperationLog);
    const opLog = repo.create({
      adminId: adminUser?.id ? String(adminUser.id) : (adminUser?.username || 'unknown'),
      adminName: adminUser?.username || 'unknown',
      module: 'convert-fan',
      action,
      detail: JSON.stringify(detail).substring(0, 2000),
      ip: req.ip || ''
    } as any);
    await repo.save(opLog);
  } catch { /* 审计失败不阻断业务 */ }
}

/** 按配置ID取token（admin上下文无租户态，直接走 WecomTokenService 链路） */
async function getToken(configId: number): Promise<string> {
  return WecomApiService.getAccessTokenByConfigId(configId, 'external');
}

// ==================== 工单管理 ====================

/**
 * GET /agent-orders
 * 代办工单列表（status 筛选 + 分页）
 */
router.get('/agent-orders', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const { status, keyword, page = '1', pageSize = '20' } = req.query;
    const qb = AppDataSource.getRepository(WecomConvertFanOrder)
      .createQueryBuilder('o')
      .where("o.mode = 'agent'");
    if (status) qb.andWhere('o.status = :status', { status });
    if (keyword) {
      qb.andWhere('(o.orderNo LIKE :kw OR o.tenantId LIKE :kw OR o.handoverName LIKE :kw)', { kw: `%${keyword}%` });
    }
    const total = await qb.getCount();
    const list = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((parseInt(String(page)) - 1) * parseInt(String(pageSize)))
      .take(parseInt(String(pageSize)))
      .getMany();

    // 富化租户名称
    const tenantIds = Array.from(new Set(list.map(o => o.tenantId).filter(Boolean)));
    const tenantNameMap: Record<string, string> = {};
    for (const tid of tenantIds) {
      const rows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tid]).catch(() => []);
      tenantNameMap[tid] = rows[0]?.name || tid;
    }

    res.json({
      success: true,
      data: {
        list: list.map(o => ({
          id: o.id,
          orderNo: o.orderNo,
          tenantId: o.tenantId,
          tenantName: tenantNameMap[o.tenantId] || o.tenantId,
          transferType: o.transferType,
          status: o.status,
          billingMode: o.billingMode,
          priceSnapshot: safeParse(o.priceSnapshot),
          customerCount: o.customerCount,
          agentRemark: o.agentRemark,
          adminRemark: o.adminRemark,
          handoverUserid: o.handoverUserid,
          handoverName: o.handoverName,
          createdAt: o.createdAt
        })),
        total
      }
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] agent-orders error:', error.message);
    res.status(500).json({ success: false, message: '获取工单失败' });
  }
});

/**
 * POST /agent-orders/:orderNo/reject
 * 拒绝工单
 */
router.post('/agent-orders/:orderNo/reject', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:execute')) return;
  try {
    const { reason } = req.body || {};
    const repo = AppDataSource.getRepository(WecomConvertFanOrder);
    const order = await repo.findOne({ where: { orderNo: req.params.orderNo, mode: 'agent' } });
    if (!order) return res.status(404).json({ success: false, message: '工单不存在' });
    if (!['pending', 'paid'].includes(order.status)) {
      return res.status(400).json({ success: false, message: '当前状态不可拒绝' });
    }
    order.status = 'closed';
    order.adminRemark = `已拒绝：${reason || '未满足服务条件'}`;
    await repo.save(order);
    await writeOpLog(req, 'convert-fan:reject', { orderNo: order.orderNo, reason });
    res.json({ success: true });
  } catch (error: any) {
    log.error('[AdminConvertFan] reject error:', error.message);
    res.status(500).json({ success: false, message: '操作失败' });
  }
});

// ==================== 代执行 ====================

/**
 * GET /tenant-configs?tenantId=
 * 指定租户的可用企微配置列表（代执行前选择配置）
 */
router.get('/tenant-configs', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ success: false, message: '缺少 tenantId' });
    const configs = await AppDataSource.getRepository(WecomConfig).find({ where: { tenantId: String(tenantId), isEnabled: true } });
    res.json({
      success: true,
      data: configs.map(c => ({
        id: c.id, name: c.name, corpId: c.corpId, authType: c.authType,
        thirdParty: c.authType === 'third_party' && !!c.permanentCode
      }))
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] tenant-configs error:', error.message);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * GET /tenant-followers?configId=&type=active|resigned
 * 指定配置下的成员列表（active=在职接替人候选；resigned=离职待分配号）
 */
router.get('/tenant-followers', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const configId = parseInt(String(req.query.configId || ''));
    const type = String(req.query.type || 'active');
    if (!configId) return res.status(400).json({ success: false, message: '缺少 configId' });
    const token = await getToken(configId);

    if (type === 'resigned') {
      // 离职待分配号（从待分配池聚合）
      const map: Record<string, { dimission_time: number; count: number }> = {};
      let cursor = '';
      for (let page = 0; page < 10; page++) {
        const resp = await WecomApiService.getUnassignedList(token, cursor, 1000);
        for (const item of resp.info) {
          if (!map[item.handover_userid]) map[item.handover_userid] = { dimission_time: item.dimission_time, count: 0 };
          map[item.handover_userid].count++;
        }
        if (resp.is_last || !resp.next_cursor) break;
        cursor = resp.next_cursor;
      }
      const list = Object.entries(map).map(([userid, v]) => ({ userid, name: userid, customerCount: v.count, dimissionTime: v.dimission_time }));
      return res.json({ success: true, data: list.sort((a, b) => b.customerCount - a.customerCount) });
    }

    // 在职成员（通讯录）
    const users = await WecomApiService.getDepartmentUsers(token, 1, true);
    res.json({ success: true, data: users.map((u: any) => ({ userid: u.userid, name: u.name || u.userid, customerCount: 0 })) });
  } catch (error: any) {
    log.error('[AdminConvertFan] tenant-followers error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '获取成员失败' });
  }
});

/**
 * GET /tenant-customers?configId=&userid=&type=
 * 指定成员名下客户（active: externalcontact/list；resigned: 待分配池按 handover 过滤）
 */
router.get('/tenant-customers', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const configId = parseInt(String(req.query.configId || ''));
    const userid = String(req.query.userid || '');
    const type = String(req.query.type || 'active');
    if (!configId || !userid) return res.status(400).json({ success: false, message: '缺少参数' });
    const token = await getToken(configId);

    if (type === 'resigned') {
      const ids: string[] = [];
      let cursor = '';
      for (let page = 0; page < 10; page++) {
        const resp = await WecomApiService.getUnassignedList(token, cursor, 1000);
        for (const item of resp.info) {
          if (item.handover_userid === userid) ids.push(item.external_userid);
        }
        if (resp.is_last || !resp.next_cursor) break;
        cursor = resp.next_cursor;
      }
      return res.json({ success: true, data: { externalUserids: ids } });
    }

    const axios = (await import('axios')).default;
    const r = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${token}&userid=${encodeURIComponent(userid)}`);
    if (r.data.errcode !== 0) throw new Error(`获取客户列表失败: ${r.data.errmsg} (${r.data.errcode})`);
    res.json({ success: true, data: { externalUserids: r.data.external_userid || [] } });
  } catch (error: any) {
    log.error('[AdminConvertFan] tenant-customers error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '获取客户失败' });
  }
});

/**
 * POST /execute
 * 代执行转粉（直接代转 / 工单执行 orderNo 二选一）
 * body: { tenantId, configId, orderNo?, transferType, handoverUserid, takeoverUserid, externalUserids[], transferSuccessMsg? }
 */
router.post('/execute', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:execute')) return;
  try {
    const adminUser = (req as any).adminUser;
    const { tenantId, configId, orderNo, transferType, handoverUserid, takeoverUserid, externalUserids, transferSuccessMsg } = req.body || {};
    if (!configId || !tenantId) return res.status(400).json({ success: false, message: '缺少租户或企微配置' });
    if (!['active', 'resigned'].includes(transferType)) return res.status(400).json({ success: false, message: '转接类型无效' });
    if (!handoverUserid || !takeoverUserid) return res.status(400).json({ success: false, message: '请选择原跟进人与接替人' });
    if (!Array.isArray(externalUserids) || externalUserids.length === 0) return res.status(400).json({ success: false, message: '请选择要转接的客户' });

    let targetTenantId = tenantId;
    let billingMode = '';
    let priceSnapshot: any;
    let pendingOrder: WecomConvertFanOrder | null = null;

    if (orderNo) {
      const repo = AppDataSource.getRepository(WecomConvertFanOrder);
      pendingOrder = await repo.findOne({ where: { orderNo, mode: 'agent' } });
      if (!pendingOrder) return res.status(404).json({ success: false, message: '工单不存在' });
      if (!['pending', 'paid'].includes(pendingOrder.status)) {
        return res.status(400).json({ success: false, message: `工单状态为 ${pendingOrder.status}，不可执行` });
      }
      targetTenantId = pendingOrder.tenantId;
      billingMode = pendingOrder.billingMode || '';
      try { priceSnapshot = JSON.parse(pendingOrder.priceSnapshot || 'null'); } catch { priceSnapshot = null; }
    }

    const token = await getToken(configId);
    const result = await wecomConvertFanService.executeTransfer({
      tenantId: targetTenantId,
      configId,
      orderNo: orderNo || undefined,
      mode: 'agent',
      transferType,
      handoverUserid,
      takeoverUserid,
      externalUserids,
      transferSuccessMsg,
      billingMode: billingMode || undefined,
      priceSnapshot,
      operatorName: adminUser?.username,
      accessToken: token
    });

    await writeOpLog(req, 'convert-fan:execute', {
      orderNo: result.order.orderNo, tenantId: targetTenantId, transferType,
      handoverUserid, takeoverUserid, count: externalUserids.length, batchCount: result.order.batchCount
    });

    res.json({
      success: true,
      data: {
        orderNo: result.order.orderNo,
        customerCount: result.order.customerCount,
        batchCount: result.order.batchCount,
        submitResult: result.submitResult,
        message: `已发起 ${result.submitResult.filter((r: any) => r.errcode === 0).length}/${externalUserids.length} 个客户的转接申请，24 小时内自动接替`
      }
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] execute error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 150) || '执行失败' });
  }
});

// ==================== 转接记录 ====================

/**
 * GET /records
 * 全租户转接记录（分页 + 状态/模式筛选）
 */
router.get('/records', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const { status, mode, keyword, page = '1', pageSize = '20' } = req.query;
    const qb = AppDataSource.getRepository(WecomConvertFanOrder).createQueryBuilder('o');
    if (status) qb.andWhere('o.status = :status', { status });
    if (mode) qb.andWhere('o.mode = :mode', { mode });
    if (keyword) qb.andWhere('(o.orderNo LIKE :kw OR o.tenantId LIKE :kw)', { kw: `%${keyword}%` });
    const total = await qb.getCount();
    const list = await qb
      .orderBy('o.createdAt', 'DESC')
      .skip((parseInt(String(page)) - 1) * parseInt(String(pageSize)))
      .take(parseInt(String(pageSize)))
      .getMany();

    const tenantIds = Array.from(new Set(list.map(o => o.tenantId).filter(Boolean)));
    const tenantNameMap: Record<string, string> = {};
    for (const tid of tenantIds) {
      const rows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tid]).catch(() => []);
      tenantNameMap[tid] = rows[0]?.name || tid;
    }

    res.json({
      success: true,
      data: {
        list: list.map(o => ({
          id: o.id, orderNo: o.orderNo, tenantId: o.tenantId, tenantName: tenantNameMap[o.tenantId] || o.tenantId,
          mode: o.mode, transferType: o.transferType, status: o.status,
          handoverName: o.handoverName, takeoverName: o.takeoverName,
          customerCount: o.customerCount, successCount: o.successCount, batchCount: o.batchCount,
          operatorName: o.operatorName, createdAt: o.createdAt, lastSyncAt: o.lastSyncAt,
          counts: safeParse(o.resultDetail)?.counts || null
        })),
        total
      }
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] records error:', error.message);
    res.status(500).json({ success: false, message: '获取记录失败' });
  }
});

/**
 * GET /records/:orderNo
 * 订单详情（逐客户接替状态）
 */
router.get('/records/:orderNo', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const order = await AppDataSource.getRepository(WecomConvertFanOrder).findOne({
      where: { orderNo: req.params.orderNo }
    });
    if (!order) return res.status(404).json({ success: false, message: '记录不存在' });
    res.json({
      success: true,
      data: {
        ...order,
        priceSnapshot: safeParse(order.priceSnapshot),
        submitResult: safeParse(order.submitResult),
        resultDetail: safeParse(order.resultDetail)
      }
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] record detail error:', error.message);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

/**
 * POST /records/:orderNo/sync
 * 立即同步官方接替结果
 */
router.post('/records/:orderNo/sync', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:execute')) return;
  try {
    const repo = AppDataSource.getRepository(WecomConvertFanOrder);
    const order = await repo.findOne({ where: { orderNo: req.params.orderNo } });
    if (!order) return res.status(404).json({ success: false, message: '记录不存在' });
    if (order.status !== 'submitted') {
      return res.status(400).json({ success: false, message: '仅「已发起」状态可同步' });
    }
    const changed = await wecomConvertFanService.syncOrderResult(order);
    res.json({ success: true, data: { changed, status: order.status, counts: safeParse(order.resultDetail)?.counts || null } });
  } catch (error: any) {
    log.error('[AdminConvertFan] sync error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '同步失败' });
  }
});

// ==================== 权益台账 ====================

/**
 * GET /permissions
 * 自助套餐权益台账（已购租户列表）
 */
router.get('/permissions', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:view')) return;
  try {
    const { keyword, page = '1', pageSize = '20' } = req.query;
    const qb = AppDataSource.getRepository(WecomConvertFanPermission).createQueryBuilder('p');
    if (keyword) {
      qb.andWhere('(p.tenantId LIKE :kw OR p.planId LIKE :kw)', { kw: `%${keyword}%` });
    }
    const total = await qb.getCount();
    const list = await qb
      .orderBy('p.endDate', 'DESC')
      .skip((parseInt(String(page)) - 1) * parseInt(String(pageSize)))
      .take(parseInt(String(pageSize)))
      .getMany();

    const tenantIds = Array.from(new Set(list.map(p => p.tenantId).filter(Boolean)));
    const tenantNameMap: Record<string, string> = {};
    for (const tid of tenantIds) {
      const rows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tid]).catch(() => []);
      tenantNameMap[tid] = rows[0]?.name || tid;
    }

    res.json({
      success: true,
      data: {
        list: list.map(p => ({
          id: p.id,
          tenantId: p.tenantId,
          tenantName: tenantNameMap[p.tenantId] || p.tenantId,
          planId: p.planId,
          startDate: p.startDate,
          endDate: p.endDate,
          status: p.status,
          orderNo: p.orderNo || null,
          planName: p.planName || null
        })),
        total
      }
    });
  } catch (error: any) {
    log.error('[AdminConvertFan] permissions error:', error.message);
    res.status(500).json({ success: false, message: '获取权益台账失败' });
  }
});

/**
 * POST /permissions/grant
 * 手动开通/赠送自助权益（写台账 + 解锁菜单）
 * body: { tenantId, planId?, planName?, cycleMonths, remark? }
 */
router.post('/permissions/grant', async (req: Request, res: Response) => {
  if (!checkPermission(req, res, 'wecom-management:convert-fan:execute')) return;
  try {
    const { tenantId, planId = 'manual', planName = '手动开通', cycleMonths, remark } = req.body || {};
    if (!tenantId) return res.status(400).json({ success: false, message: '缺少 tenantId' });
    const months = parseInt(String(cycleMonths));
    if (!months || months <= 0 || months > 120) {
      return res.status(400).json({ success: false, message: '权益时长(月)须为 1-120 的整数' });
    }
    await wecomConvertFanService.grantManual(String(tenantId), String(planId), String(planName), months);
    await writeOpLog(req, 'convert-fan:grant', { tenantId, planId, planName, months, remark });
    res.json({ success: true, message: `已开通「${planName}」${months} 个月并解锁租户菜单` });
  } catch (error: any) {
    log.error('[AdminConvertFan] grant permission error:', error.message);
    res.status(500).json({ success: false, message: error.message?.substring(0, 120) || '开通失败' });
  }
});

function safeParse(str: string | null): any {
  if (!str) return null;
  try { return JSON.parse(str); } catch { return null; }
}

export default router;
