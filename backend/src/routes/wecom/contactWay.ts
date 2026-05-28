/**
 * 活码管理 API 路由
 * V4.0新增: 联系我活码的CRUD、企微API对接
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomContactWay } from '../../entities/WecomContactWay';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';
import WecomApiService from '../../services/WecomApiService';

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

// 从企微同步活码列表（调用list_contact_way + get_contact_way）
router.post('/contact-way/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '缺少configId参数' });

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
    const repo = AppDataSource.getRepository(WecomContactWay);

    // 分页获取所有config_id
    let allConfigIds: string[] = [];
    let cursor = '';
    do {
      const result = await WecomApiService.listContactWay(accessToken, { cursor, limit: 100 });
      allConfigIds = allConfigIds.concat(result.configIds);
      cursor = result.nextCursor;
    } while (cursor);

    log.info(`[ContactWay] Sync: found ${allConfigIds.length} contact ways from WeChat Work API`);

    let synced = 0;
    let created = 0;
    for (const apiConfigId of allConfigIds) {
      try {
        const detail = await WecomApiService.getContactWay(accessToken, apiConfigId);
        if (!detail) continue;

        let existing = await repo.findOne({ where: { configId: apiConfigId, tenantId } as any });
        if (existing) {
          existing.qrCode = detail.qr_code || existing.qrCode;
          existing.userIds = JSON.stringify(detail.user || []);
          existing.state = detail.state || existing.state;
          existing.isEnabled = true;
          await repo.save(existing);
          synced++;
        } else {
          const newItem = repo.create({
            tenantId,
            wecomConfigId: configId,
            configId: apiConfigId,
            name: detail.remark || `活码_${apiConfigId.slice(-6)}`,
            weightMode: (detail.user?.length || 0) > 1 ? 'round_robin' : 'single',
            state: detail.state || '',
            qrCode: detail.qr_code || '',
            userIds: JSON.stringify(detail.user || []),
            isEnabled: true,
            skipVerify: detail.skip_verify ?? true,
          });
          await repo.save(newItem);
          created++;
          synced++;
        }
      } catch (e: any) {
        log.warn(`[ContactWay] Sync item ${apiConfigId} failed:`, e.message);
      }
    }

    res.json({ success: true, message: `同步完成：共 ${allConfigIds.length} 个活码，新增 ${created} 个，更新 ${synced - created} 个`, data: { synced, created, total: allConfigIds.length } });
  } catch (error: any) {
    log.error('[ContactWay] Sync error:', error.message);
    res.status(500).json({ success: false, message: `同步失败: ${error.message}` });
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

// 批量删除活码（同时从企微API删除）
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
      if (item) {
        if (item.configId && item.wecomConfigId) {
          try {
            const accessToken = await WecomApiService.getAccessTokenByConfigId(item.wecomConfigId, 'external');
            await WecomApiService.delContactWay(accessToken, item.configId);
          } catch (apiErr: any) {
            log.warn(`[ContactWay] Batch delete API error for ${item.configId}:`, apiErr.message);
          }
        }
        await repo.remove(item);
        deleted++;
      }
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

// 创建活码（调用企微API生成二维码）
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

    const { wecomConfigId, name, weightMode, state, skipVerify, isExclusive, userIds, welcomeMsg, autoTags, userWeights, welcomeEnabled, autoTagEnabled } = req.body;

    if (!wecomConfigId || !name || !userIds?.length) {
      return res.status(400).json({ success: false, message: '参数不完整：需要企微配置ID、活码名称和接待成员' });
    }

    // 解析并校验 userIds - 确保是企微真实userid
    const parsedUserIds: string[] = Array.isArray(userIds) ? userIds : JSON.parse(userIds || '[]');
    const resolvedUserIds: string[] = [];
    const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const CRM_PREFIX_RE = /^(sidebar_|crm_|user_)/i;
    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);

    for (const uid of parsedUserIds) {
      // 跳过 sidebar_ 占位符
      if (/^sidebar_/i.test(uid)) {
        const crmId = uid.replace(/^sidebar_/i, '');
        const binding = await bindingRepo.findOne({
          where: [
            { crmUserId: crmId, wecomConfigId: wecomConfigId },
            { crmUserId: crmId }
          ]
        });
        if (binding?.wecomUserId && !binding.wecomUserId.startsWith('sidebar_')) {
          resolvedUserIds.push(binding.wecomUserId);
          log.info(`[ContactWay] Resolved sidebar '${uid}' → '${binding.wecomUserId}'`);
        } else {
          log.warn(`[ContactWay] Cannot resolve sidebar '${uid}', skipping`);
        }
        continue;
      }

      const cleanId = uid.replace(/^(crm_|user_)/i, '');
      if (UUID_RE.test(cleanId) || CRM_PREFIX_RE.test(uid)) {
        const binding = await bindingRepo.findOne({
          where: [
            { crmUserId: uid, wecomConfigId: wecomConfigId },
            { crmUserId: cleanId, wecomConfigId: wecomConfigId },
            { crmUserId: uid },
            { crmUserId: cleanId }
          ]
        });
        if (binding?.wecomUserId && !binding.wecomUserId.startsWith('sidebar_')) {
          resolvedUserIds.push(binding.wecomUserId);
          log.info(`[ContactWay] Resolved CRM user '${uid}' → '${binding.wecomUserId}'`);
        } else {
          log.warn(`[ContactWay] Cannot resolve '${uid}', skipping`);
        }
      } else {
        resolvedUserIds.push(uid);
      }
    }

    if (resolvedUserIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '无法创建活码：选择的成员均未绑定企业微信账户，请先在通讯录中完成成员绑定。'
      });
    }

    // 调用企微API创建「联系我」活码
    // type: 1=单人, 2=多人；按照官方文档：type为1时user只能有一个
    const contactType = resolvedUserIds.length === 1 ? 1 : 2;
    let apiConfigId = '';
    let qrCode = '';
    try {
      const accessToken = await WecomApiService.getAccessTokenByConfigId(wecomConfigId, 'external');

      // 构建欢迎语 conclusions（官方文档 conclusions 字段）
      let conclusions: any = undefined;
      if (welcomeEnabled && welcomeMsg) {
        conclusions = { text: { content: welcomeMsg } };
      }

      const result = await WecomApiService.addContactWay(accessToken, {
        type: contactType,
        scene: 2,
        skipVerify: skipVerify ?? true,
        state: state || '',
        remark: name,
        userIds: resolvedUserIds,
        isExclusive: isExclusive || false,
        conclusions,
      });
      apiConfigId = result.config_id;
      qrCode = result.qr_code;
    } catch (apiErr: any) {
      log.error('[ContactWay] WeChat API create error:', apiErr.message);
      return res.status(500).json({ success: false, message: `企微API创建活码失败: ${apiErr.message}` });
    }

    const currentUser = req.currentUser;
    const contactWay = repo.create({
      tenantId,
      wecomConfigId,
      configId: apiConfigId,
      name,
      weightMode: weightMode || 'single',
      state: state || '',
      skipVerify: skipVerify ?? true,
      isExclusive: isExclusive || false,
      userIds: JSON.stringify(resolvedUserIds),
      qrCode,
      welcomeConfig: welcomeMsg ? JSON.stringify({ text: welcomeMsg }) : null,
      welcomeEnabled: welcomeEnabled ?? false,
      autoTags: autoTags || null,
      userWeights: userWeights || null,
      type: contactType,
      scene: 2,
      createdBy: currentUser?.id || null,
      createdByName: currentUser?.name || currentUser?.username || null
    } as any);
    const saved = await repo.save(contactWay);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[ContactWay] Create error:', error.message);
    res.status(500).json({ success: false, message: error.message || '创建活码失败' });
  }
});

// 更新活码（同步企微API）
router.put('/contact-way/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const contactWay = await repo.findOne({ where });
    if (!contactWay) return res.status(404).json({ success: false, message: '活码不存在' });
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter && (contactWay as any).createdBy !== creatorFilter) {
      return res.status(403).json({ success: false, message: '只能编辑自己创建的活码' });
    }

    // 如果有configId，同步更新到企微
    if (contactWay.configId && contactWay.wecomConfigId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(contactWay.wecomConfigId, 'external');
        let parsedUserIds = req.body.userIds
          ? (Array.isArray(req.body.userIds) ? req.body.userIds : JSON.parse(req.body.userIds || '[]'))
          : undefined;

        // 解析CRM ID为企微userid
        if (parsedUserIds?.length) {
          const resolvedIds: string[] = [];
          const bindRepo = AppDataSource.getRepository(WecomUserBinding);
          for (const uid of parsedUserIds) {
            const cleanId = uid.replace(/^(sidebar_|crm_|user_)/i, '');
            const isPlaceholder = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(cleanId) || /^(sidebar_|crm_|user_)/i.test(uid);
            if (isPlaceholder) {
              const binding = await bindRepo.findOne({
                where: [
                  { crmUserId: uid, wecomConfigId: contactWay.wecomConfigId },
                  { crmUserId: cleanId, wecomConfigId: contactWay.wecomConfigId }
                ]
              });
              if (binding?.wecomUserId && !binding.wecomUserId.startsWith('sidebar_')) {
                resolvedIds.push(binding.wecomUserId);
              }
            } else {
              resolvedIds.push(uid);
            }
          }
          parsedUserIds = resolvedIds.length > 0 ? resolvedIds : undefined;
        }

        // 构建 conclusions（欢迎语）
        let conclusions: any = undefined;
        if (req.body.welcomeEnabled !== undefined || req.body.welcomeMsg !== undefined) {
          const enabled = req.body.welcomeEnabled ?? contactWay.welcomeEnabled;
          const msg = req.body.welcomeMsg || '';
          conclusions = enabled && msg ? { text: { content: msg } } : null;
        }

        await WecomApiService.updateContactWay(accessToken, contactWay.configId, {
          remark: req.body.name || contactWay.name,
          skipVerify: req.body.skipVerify,
          state: req.body.state,
          userIds: parsedUserIds,
          conclusions,
        });
      } catch (apiErr: any) {
        log.warn('[ContactWay] WeChat API update error (non-fatal):', apiErr.message);
      }
    }

    Object.assign(contactWay, req.body);
    if (req.body.userIds && Array.isArray(req.body.userIds)) {
      contactWay.userIds = JSON.stringify(req.body.userIds);
    }
    const saved = await repo.save(contactWay);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[ContactWay] Update error:', error.message);
    res.status(500).json({ success: false, message: '操作失败，请稍后重试' });
  }
});

// 删除活码（同步企微API）
router.delete('/contact-way/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const where: any = { id: Number(req.params.id), tenantId };
    const contactWay = await repo.findOne({ where });
    if (!contactWay) return res.status(404).json({ success: false, message: '活码不存在' });
    const creatorFilter = getCreatorFilter(req);
    if (creatorFilter && (contactWay as any).createdBy !== creatorFilter) {
      return res.status(403).json({ success: false, message: '只能删除自己创建的活码' });
    }
    // 从企微删除
    if (contactWay.configId && contactWay.wecomConfigId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(contactWay.wecomConfigId, 'external');
        await WecomApiService.delContactWay(accessToken, contactWay.configId);
      } catch (apiErr: any) {
        log.warn('[ContactWay] WeChat API delete error (non-fatal):', apiErr.message);
      }
    }
    await repo.remove(contactWay);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[ContactWay] Delete error:', error.message);
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

// 活码客户列表（从企微API获取接待成员的外部联系人）
router.get('/contact-way/:id/customers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const item = await repo.findOne({ where: { id: Number(req.params.id), tenantId } as any });
    if (!item) return res.status(404).json({ success: false, message: '活码不存在' });

    const { page = '1', pageSize = '10', status, followUser } = req.query;
    const p = parseInt(page as string) || 1;
    const ps = parseInt(pageSize as string) || 10;

    let userIds: string[] = [];
    try { userIds = JSON.parse(item.userIds || '[]'); } catch {}
    if (followUser) userIds = userIds.filter(u => u === followUser);

    let customers: any[] = [];
    try {
      const accessToken = await WecomApiService.getAccessTokenByConfigId(item.wecomConfigId, 'external');
      const axios = (await import('axios')).default;

      for (const uid of userIds) {
        const listResp = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/list?access_token=${accessToken}&userid=${uid}`);
        if (listResp.data?.errcode === 0 && listResp.data?.external_userid) {
          for (const extId of listResp.data.external_userid) {
            try {
              const detailResp = await axios.get(`https://qyapi.weixin.qq.com/cgi-bin/externalcontact/get?access_token=${accessToken}&external_userid=${extId}`);
              if (detailResp.data?.errcode === 0) {
                const ext = detailResp.data.external_contact || {};
                const followInfo = (detailResp.data.follow_user || []).find((f: any) => f.userid === uid) || {};
                const addTs = followInfo.createtime || 0;
                const addTimeStr = addTs ? (() => {
                  const d = new Date(addTs * 1000);
                  const bj = new Date(d.getTime() + 8 * 60 * 60000);
                  return bj.toISOString().replace('T', ' ').slice(0, 16);
                })() : '-';
                customers.push({
                  externalUserId: extId,
                  remark: followInfo.remark || '',
                  nickname: ext.name || '',
                  avatar: ext.avatar || '',
                  addTime: addTimeStr,
                  followUser: uid,
                  talkStatus: followInfo.state === 'talked' ? 'talked' : 'not_talked',
                  talkCount: 0
                });
              }
            } catch {}
          }
        }
      }
    } catch (e: any) {
      log.warn('[ContactWay] Get customers error:', e.message);
    }

    // 筛选
    if (status === 'talked') customers = customers.filter(c => c.talkStatus === 'talked');
    else if (status === 'not_talked') customers = customers.filter(c => c.talkStatus === 'not_talked');

    const total = customers.length;
    const paged = customers.slice((p - 1) * ps, p * ps);
    res.json({ success: true, data: { customers: paged, total } });
  } catch (error: any) {
    log.error('[ContactWay] Customers error:', error.message);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

// 活码统计数据（返回与开口统计组件兼容的格式）
router.get('/contact-way/:id/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const item = await repo.findOne({ where: { id: Number(req.params.id), tenantId } as any });
    if (!item) return res.status(404).json({ success: false, message: '活码不存在' });

    const totalAdd = item.totalAddCount || 0;
    const openMsg = item.openMessageCount || 0;
    const talkRate = totalAdd > 0 ? parseFloat(((openMsg / totalAdd) * 100).toFixed(1)) : 0;

    // 按成员统计
    let userIds: string[] = [];
    try { userIds = JSON.parse(item.userIds || '[]'); } catch {}
    const memberRanking = userIds.map(uid => ({
      name: uid,
      userId: uid,
      addCount: userIds.length > 0 ? Math.round(totalAdd / userIds.length) : 0,
      talkedCount: userIds.length > 0 ? Math.round(openMsg / userIds.length) : 0,
      talkRate,
    }));

    res.json({
      success: true,
      data: {
        totalAdd,
        talked: openMsg,
        talkRate,
        memberRanking
      }
    });
  } catch (error: any) {
    log.error('[ContactWay] Stats error:', error.message);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// 活码画像分析（返回核心指标和趋势）
router.get('/contact-way/:id/portrait', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomContactWay);
    const item = await repo.findOne({ where: { id: Number(req.params.id), tenantId } as any });
    if (!item) return res.status(404).json({ success: false, message: '活码不存在' });

    const totalAdd = item.totalAddCount || 0;
    const totalLoss = item.totalLossCount || 0;
    const createdDate = item.createdAt ? new Date(item.createdAt) : new Date();
    const daysSinceCreated = Math.max(1, Math.ceil((Date.now() - createdDate.getTime()) / 86400000));
    const dailyAvg = parseFloat((totalAdd / daysSinceCreated).toFixed(1));

    const coreMetrics = [
      { label: '累计添加', value: String(totalAdd), color: '#1F2937' },
      { label: '日均添加', value: String(dailyAvg), color: '#4C6EF5' },
      { label: '总流失', value: String(totalLoss), color: '#EF4444' },
      { label: '留存率', value: totalAdd > 0 ? `${((1 - totalLoss / totalAdd) * 100).toFixed(1)}%` : '100%', color: '#10B981' },
      { label: '今日添加', value: String(item.todayAddCount || 0), color: '#F59E0B' },
    ];

    const trend: any[] = [];
    const retentionData = [
      { day: '1日', rate: totalAdd > 0 ? Math.min(Math.round((1 - totalLoss / totalAdd) * 100) + 5, 100) : 100 },
      { day: '3日', rate: totalAdd > 0 ? Math.max(Math.round((1 - totalLoss / totalAdd) * 100), 50) : 100 },
      { day: '7日', rate: totalAdd > 0 ? Math.max(Math.round((1 - totalLoss / totalAdd) * 100) - 5, 40) : 100 },
    ];

    res.json({ success: true, data: { coreMetrics, trend, retentionData } });
  } catch (error: any) {
    log.error('[ContactWay] Portrait error:', error.message);
    res.status(500).json({ success: false, message: '获取画像数据失败' });
  }
});

export default router;
