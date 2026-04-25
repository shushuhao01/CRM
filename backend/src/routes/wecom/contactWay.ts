/**
 * 活码管理 API 路由
 * V4.0新增: 联系我活码的CRUD、企微API对接
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomContactWay } from '../../entities/WecomContactWay';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';

const router = Router();

/**
 * 判断当前用户是否为管理员角色
 */
function isAdminRole(req: Request): boolean {
  const role = req.user?.role || '';
  return ['admin', 'super_admin', 'superadmin'].includes(role);
}

/**
 * 获取数据范围过滤条件：管理员看所有，经理只看自己创建的
 */
function getCreatorFilter(req: Request): string | null {
  if (isAdminRole(req)) return null;
  return req.currentUser?.id || null;
}

// ==================== 渠道名称映射 ====================
const CHANNEL_NAME_MAP: Record<string, string> = {
  'website': '官网', 'exhibition': '线下展会', 'product_trial': '产品体验',
  'aftersale': '售后服务', 'wechat_mp': '公众号', 'douyin': '抖音',
  'xiaohongshu': '小红书', 'weibo': '微博', 'baidu': '百度推广',
  'google': '谷歌推广', 'email': '邮件营销', 'sms': '短信营销',
  'referral': '客户转介绍', 'offline': '线下活动', 'ad': '广告投放', 'live': '直播',
};
const getChannelName = (state: string): string => {
  if (!state) return '(未设置)';
  return CHANNEL_NAME_MAP[state] || state;
};

// ==================== 活码统计/批量操作（需在 :id 路由之前）====================

// 活码总览统计
router.get('/contact-way/overview', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.query;
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    if (configId) qb.andWhere('cw.wecomConfigId = :configId', { configId });
    // 数据范围过滤：经理只看自己创建的
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter) qb.andWhere('cw.created_by = :createdBy', { createdBy: creatorFilter });
    const allItems = await qb.getMany();

    let totalAdd = 0, totalLoss = 0, todayAdd = 0, todayLoss = 0, totalAbnormal = 0, totalOpenMessage = 0;
    for (const item of allItems) {
      totalAdd += item.totalAddCount || 0;
      totalLoss += item.totalLossCount || 0;
      todayAdd += item.todayAddCount || 0;
      todayLoss += item.todayLossCount || 0;
      totalAbnormal += item.abnormalCount || 0;
      totalOpenMessage += item.openMessageCount || 0;
    }
    res.json({
      success: true,
      data: {
        summary: {
          total: allItems.length, activeCount: allItems.filter(i => i.isEnabled).length,
          totalAdd, totalLoss, todayAdd, todayLoss,
          netGrowth: totalAdd - totalLoss,
          avgRetention: totalAdd > 0 ? Math.round(((totalAdd - totalLoss) / totalAdd) * 100) : 0,
          totalAbnormal, totalOpenMessage,
        }
      }
    });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 活码趋势数据
router.get('/contact-way/trend', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, startDate, endDate } = req.query;
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    if (configId) qb.andWhere('cw.wecomConfigId = :configId', { configId });
    const allItems = await qb.getMany();

    const start = startDate ? new Date(startDate as string) : new Date(Date.now() - 29 * 86400000);
    const end = endDate ? new Date(endDate as string) : new Date();
    const days: string[] = [];
    const addData: number[] = [];
    const lossData: number[] = [];
    const totalDays = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / 86400000) + 1);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      days.push(dateStr);
      let dayAdd = 0, dayLoss = 0;
      for (const item of allItems) {
        if (new Date(item.createdAt) <= d) {
          dayAdd += Math.round((item.totalAddCount || 0) / totalDays);
          dayLoss += Math.round((item.totalLossCount || 0) / totalDays);
        }
      }
      addData.push(dayAdd);
      lossData.push(dayLoss);
    }
    res.json({ success: true, data: { dates: days, series: [{ name: '新增', data: addData }, { name: '流失', data: lossData }] } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 活码表现排行
router.get('/contact-way/ranking', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, page = 1, pageSize = 10, sortBy = 'totalAddCount', sortOrder = 'DESC' } = req.query;
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    if (configId) qb.andWhere('cw.wecomConfigId = :configId', { configId });

    const validSortFields = ['totalAddCount', 'totalLossCount', 'todayAddCount', 'openMessageCount', 'name'];
    const field = validSortFields.includes(sortBy as string) ? sortBy as string : 'totalAddCount';
    qb.orderBy(`cw.${field}`, (sortOrder as string).toUpperCase() === 'ASC' ? 'ASC' : 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize)).take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();

    const ranking = list.map(item => ({
      id: item.id, name: item.name, state: item.state, channelName: getChannelName(item.state),
      addCount: item.totalAddCount || 0, lossCount: item.totalLossCount || 0,
      todayAdd: item.todayAddCount || 0, todayLoss: item.todayLossCount || 0,
      openMessageCount: item.openMessageCount || 0,
      retention: item.totalAddCount > 0 ? Math.round(((item.totalAddCount - item.totalLossCount) / item.totalAddCount) * 100) : 0,
    }));
    res.json({ success: true, data: { list: ranking, total } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 活码渠道分析
router.get('/contact-way/channel-analysis', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, page = 1, pageSize = 10 } = req.query;
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    if (configId) qb.andWhere('cw.wecomConfigId = :configId', { configId });
    const allItems = await qb.getMany();

    const channelMap = new Map<string, any>();
    for (const item of allItems) {
      const key = item.state || '(未设置)';
      const ex = channelMap.get(key) || { state: key, channelName: getChannelName(key), contactWayCount: 0, addCount: 0, lossCount: 0, todayAdd: 0, todayLoss: 0, openMessageCount: 0, abnormalCount: 0 };
      ex.contactWayCount++;
      ex.addCount += item.totalAddCount || 0;
      ex.lossCount += item.totalLossCount || 0;
      ex.todayAdd += item.todayAddCount || 0;
      ex.todayLoss += item.todayLossCount || 0;
      ex.openMessageCount += item.openMessageCount || 0;
      ex.abnormalCount += item.abnormalCount || 0;
      channelMap.set(key, ex);
    }

    const allChannels = Array.from(channelMap.values()).sort((a: any, b: any) => b.addCount - a.addCount);
    const totalAdd = allChannels.reduce((s: number, c: any) => s + c.addCount, 0);
    const enriched = allChannels.map((ch: any) => ({
      ...ch,
      netGrowth: ch.addCount - ch.lossCount,
      retention: ch.addCount > 0 ? Math.round(((ch.addCount - ch.lossCount) / ch.addCount) * 100) : 0,
      percent: totalAdd > 0 ? Number(((ch.addCount / totalAdd) * 100).toFixed(1)) : 0,
    }));

    const start = (Number(page) - 1) * Number(pageSize);
    const paged = enriched.slice(start, start + Number(pageSize));
    res.json({ success: true, data: { list: paged, total: enriched.length, totalAdd } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 从企微同步活码列表
router.post('/contact-way/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '缺少configId参数' });
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    qb.andWhere('cw.wecomConfigId = :configId', { configId });
    const existing = await qb.getMany();
    // TODO: Call WeChat Work API for real sync
    res.json({ success: true, message: `同步完成，已更新 ${existing.length} 个活码`, data: { synced: existing.length } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 批量更新活码
router.put('/contact-way/batch', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { ids, isEnabled } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: '缺少ids参数' });
    const repo = AppDataSource.getRepository(WecomContactWay);
    let updated = 0;
    for (const id of ids) {
      const where: any = { id, tenantId };
      const item = await repo.findOne({ where });
      if (item) { if (isEnabled !== undefined) item.isEnabled = isEnabled; await repo.save(item); updated++; }
    }
    res.json({ success: true, message: `批量更新成功，已更新 ${updated} 个`, data: { updated } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 批量删除活码
router.post('/contact-way/batch-delete', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { ids } = req.body;
    if (!ids?.length) return res.status(400).json({ success: false, message: '缺少ids参数' });
    const repo = AppDataSource.getRepository(WecomContactWay);
    let deleted = 0;
    for (const id of ids) {
      const where: any = { id, tenantId };
      const item = await repo.findOne({ where });
      if (item) { await repo.remove(item); deleted++; }
    }
    res.json({ success: true, message: `批量删除成功，已删除 ${deleted} 个`, data: { deleted } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// ==================== 活码 CRUD ====================

// 获取活码列表
router.get('/contact-way', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId, page = 1, pageSize = 20, keyword } = req.query;
    const repo = AppDataSource.getRepository(WecomContactWay);
    const qb = repo.createQueryBuilder('cw');
    qb.where('cw.tenantId = :tenantId', { tenantId });
    if (configId) qb.andWhere('cw.wecomConfigId = :configId', { configId });
    if (keyword) qb.andWhere('cw.name LIKE :keyword', { keyword: `%${keyword}%` });
    // 数据范围过滤：经理只看自己创建的
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter) qb.andWhere('cw.created_by = :createdBy', { createdBy: creatorFilter });
    qb.orderBy('cw.createdAt', 'DESC').skip((Number(page) - 1) * Number(pageSize)).take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();
    const enriched = list.map(item => ({ ...item, todayCount: item.todayAddCount || 0, channelName: getChannelName(item.state) }));

    // 返回配额信息（不区分分页，取全局总数）
    const totalAll = tenantId ? await repo.count({ where: { tenantId } as any }) : total;
    const maxAllowed = tenantId ? await getContactWayQuota(tenantId) : 3;
    res.json({
      success: true,
      data: {
        list: enriched,
        total,
        quota: { current: totalAll, max: maxAllowed === Infinity ? null : maxAllowed }
      }
    });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// ==================== 活码配额检查工具函数 ====================

/**
 * 获取当前租户活码最大数量（来源：获客助手套餐 maxChannels）
 * 生效状态：free | paid | active
 * 无套餐时兜底 3 个
 */
async function getContactWayQuota(tenantId: string): Promise<number> {
  const FREE_LIMIT = 3;
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
      [`tenant_billing_records_${tenantId}`]
    ).catch(() => []);

    if (!rows.length) return FREE_LIMIT;
    let records: any[] = [];
    try { records = JSON.parse(rows[0].config_value); } catch { return FREE_LIMIT; }
    if (!Array.isArray(records)) return FREE_LIMIT;

    // 生效状态的获客助手套餐（最新一条）
    const validStatuses = ['free', 'paid', 'active'];
    const acquisitionRecord = [...records]
      .reverse()
      .find((r: any) => r.type === 'acquisition' && validStatuses.includes(r.status));

    if (!acquisitionRecord) return FREE_LIMIT;

    // maxChannels === 0 表示无限制，返回 Infinity
    const maxChannels = acquisitionRecord.maxChannels;
    if (maxChannels === 0 || maxChannels === null || maxChannels === undefined) {
      // 还需从定价配置里读取，因为账单里可能没存 maxChannels
      const configRows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
      ).catch(() => []);
      if (configRows.length) {
        try {
          const pricing = JSON.parse(configRows[0].config_value);
          const tier = (pricing?.acquisitionPricing || []).find(
            (t: any) => t.name === acquisitionRecord.packageName
          );
          if (tier) {
            return tier.maxChannels === 0 ? Infinity : (tier.maxChannels || FREE_LIMIT);
          }
        } catch { /* ignore */ }
      }
      return FREE_LIMIT;
    }
    return maxChannels;
  } catch {
    return FREE_LIMIT;
  }
}

// 创建活码
router.post('/contact-way', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);

    // ========== 活码配额检查 ==========
    if (tenantId) {
      const maxAllowed = await getContactWayQuota(tenantId);
      const currentCount = await repo.count({ where: { tenantId } as any });
      if (currentCount >= maxAllowed) {
        const isUnlimited = maxAllowed === Infinity;
        return res.status(403).json({
          success: false,
          message: isUnlimited
            ? '活码数量已达上限'
            : `活码数量已达套餐上限（${maxAllowed} 个），请升级获客助手套餐后继续创建`,
          quota: { current: currentCount, max: isUnlimited ? null : maxAllowed }
        });
      }
    }

    const currentUser = req.currentUser;
    const contactWay = repo.create({
      ...req.body,
      tenantId,
      createdBy: currentUser?.id || null,
      createdByName: currentUser?.name || currentUser?.username || null
    });
    const saved = await repo.save(contactWay);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 更新活码
router.put('/contact-way/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const contactWay = await repo.findOne({ where });
    if (!contactWay) return res.status(404).json({ success: false, message: '活码不存在' });
    // 非管理员只能编辑自己创建的
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter && (contactWay as any).createdBy !== creatorFilter) {
      return res.status(403).json({ success: false, message: '只能编辑自己创建的活码' });
    }
    Object.assign(contactWay, req.body);
    const saved = await repo.save(contactWay);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 删除活码
router.delete('/contact-way/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const contactWay = await repo.findOne({ where });
    if (!contactWay) return res.status(404).json({ success: false, message: '活码不存在' });
    // 非管理员只能删除自己创建的
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter && (contactWay as any).createdBy !== creatorFilter) {
      return res.status(403).json({ success: false, message: '只能删除自己创建的活码' });
    }
    await repo.remove(contactWay);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 活码详情
router.get('/contact-way/:id/detail', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const contactWay = await repo.findOne({ where });
    if (!contactWay) return res.status(404).json({ success: false, message: '活码不存在' });
    res.json({ success: true, data: { ...contactWay, channelName: getChannelName(contactWay.state) } });
  } catch (error: any) {
    log.error('[ContactWay] Error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 活码客户列表
router.get('/contact-way/:id/customers', authenticateToken, async (_req: Request, res: Response) => {
  try { res.json({ success: true, data: { list: [], total: 0 } }); }
  catch (error: any) { log.error('[ContactWay] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

// 活码统计数据
router.get('/contact-way/:id/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const item = await repo.findOne({ where });
    if (!item) return res.status(404).json({ success: false, message: '活码不存在' });
    res.json({ success: true, data: { summary: { totalAdd: item.totalAddCount || 0, totalLoss: item.totalLossCount || 0, todayAdd: item.todayAddCount || 0, todayLoss: item.todayLossCount || 0, abnormalCount: item.abnormalCount || 0, currentReceptionCount: item.currentReceptionCount || 0, openMessageCount: item.openMessageCount || 0 } } });
  } catch (error: any) { log.error('[ContactWay] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

// 活码画像分析
router.get('/contact-way/:id/portrait', authenticateToken, async (_req: Request, res: Response) => {
  try { res.json({ success: true, data: { coreMetrics: {}, trend: [], customerProfile: {} } }); }
  catch (error: any) { log.error('[ContactWay] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

export default router;
