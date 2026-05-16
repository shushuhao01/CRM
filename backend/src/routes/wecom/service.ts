/**
 * 微信客服路由
 * 包含：客服账号CRUD、从API同步、会话记录、数据统计、快捷回复
 * Phase 5: 微信客服增强
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomServiceAccount } from '../../entities/WecomServiceAccount';
import { WecomKfSession } from '../../entities/WecomKfSession';
import { WecomQuickReply } from '../../entities/WecomQuickReply';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

// ==================== 客服账号管理 ====================

/**
 * 获取客服账号列表
 */
router.get('/service-accounts', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const accountRepo = getTenantRepo(WecomServiceAccount);
    const where: any = {};
    if (configId) where.wecomConfigId = parseInt(configId as string);
    const accounts = await accountRepo.find({ where, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: accounts });
  } catch (error: any) {
    log.error('[Wecom] Get service accounts error:', error);
    res.status(500).json({ success: false, message: '获取客服账号失败' });
  }
});

/**
 * 创建客服账号
 */
router.post('/service-accounts', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, name, servicerUserIds, welcomeMsg } = req.body;
    if (!wecomConfigId || !name) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });

    const accessToken = await WecomApiService.getAccessTokenByConfigId(wecomConfigId);
    const openKfId = await WecomApiService.createKfAccount(accessToken, name);

    const accountRepo = getTenantRepo(WecomServiceAccount);
    const currentUser = (req as any).currentUser;
    const account = accountRepo.create({
      wecomConfigId, corpId: config.corpId, openKfId, name,
      servicerUserIds: servicerUserIds ? JSON.stringify(servicerUserIds) : null,
      welcomeMsg, createdBy: currentUser?.name || 'admin'
    });

    await accountRepo.save(account);
    res.json({ success: true, data: account, message: '创建成功' });
  } catch (error: any) {
    log.error('[Wecom] Create service account error:', error);
    res.status(500).json({ success: false, message: error.message || '创建客服账号失败' });
  }
});

/**
 * 删除客服账号（同步企微API）
 */
router.delete('/service-accounts/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const accountRepo = getTenantRepo(WecomServiceAccount);
    const account = await accountRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!account) return res.status(404).json({ success: false, message: '客服账号不存在' });

    // 调用企微API删除客服账号
    if (account.openKfId && account.wecomConfigId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(account.wecomConfigId);
        const axios = (await import('axios')).default;
        await axios.post(`https://qyapi.weixin.qq.com/cgi-bin/kf/account/del?access_token=${accessToken}`, {
          open_kfid: account.openKfId
        });
      } catch (apiErr: any) {
        log.warn('[Wecom] Delete KF account from API error (non-fatal):', apiErr.message);
      }
    }

    await accountRepo.remove(account);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete service account error:', error);
    res.status(500).json({ success: false, message: '删除客服账号失败' });
  }
});

/**
 * 更新客服账号
 */
router.put('/service-accounts/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const accountRepo = getTenantRepo(WecomServiceAccount);
    const account = await accountRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!account) return res.status(404).json({ success: false, message: '客服账号不存在' });

    const { name, isEnabled, welcomeMsg, servicerUserIds, serviceTimeStart, serviceTimeEnd } = req.body;
    if (name !== undefined) account.name = name;
    if (isEnabled !== undefined) account.isEnabled = isEnabled;
    if (welcomeMsg !== undefined) account.welcomeMsg = welcomeMsg;
    if (servicerUserIds !== undefined) account.servicerUserIds = Array.isArray(servicerUserIds) ? JSON.stringify(servicerUserIds) : servicerUserIds;
    if (serviceTimeStart !== undefined) account.serviceTimeStart = serviceTimeStart;
    if (serviceTimeEnd !== undefined) account.serviceTimeEnd = serviceTimeEnd;

    await accountRepo.save(account);
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[Wecom] Update service account error:', error);
    res.status(500).json({ success: false, message: '更新客服账号失败' });
  }
});

/**
 * 从企微API同步客服账号列表
 */
router.post('/service-accounts/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId);
    const kfAccounts = await WecomApiService.getKfAccountList(accessToken);

    const accountRepo = getTenantRepo(WecomServiceAccount);
    let newCount = 0;
    let updateCount = 0;

    for (const kf of kfAccounts) {
      const existing = await accountRepo.findOne({ where: { wecomConfigId: configId, openKfId: kf.open_kfid } });
      if (existing) {
        existing.name = kf.name || existing.name;
        existing.avatar = kf.avatar || existing.avatar;
        await accountRepo.save(existing);
        updateCount++;
      } else {
        const account = accountRepo.create({
          wecomConfigId: configId, corpId: config.corpId, openKfId: kf.open_kfid,
          name: kf.name || '未命名客服', avatar: kf.avatar || '',
          isEnabled: true, createdBy: 'api-sync'
        });
        await accountRepo.save(account);
        newCount++;
      }
    }

    res.json({
      success: true,
      message: `同步完成：新增 ${newCount} 个，更新 ${updateCount} 个客服账号`,
      data: { newCount, updateCount, total: kfAccounts.length }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync service accounts error:', error);
    res.status(500).json({ success: false, message: error.message || '同步客服账号失败' });
  }
});

// ==================== Phase 5: 客服会话记录 ====================

/**
 * 获取客服会话记录列表
 */
router.get('/kf-sessions', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, openKfId, status, servicerUserid, page, pageSize } = req.query;
    const sessionRepo = getTenantRepo(WecomKfSession);
    const qb = sessionRepo.createQueryBuilder('s');

    if (configId) qb.andWhere('s.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (openKfId) qb.andWhere('s.open_kf_id = :openKfId', { openKfId });
    if (status) qb.andWhere('s.session_status = :status', { status });
    if (servicerUserid) qb.andWhere('s.servicer_userid = :servicerUserid', { servicerUserid });

    const pageNum = parseInt(page as string) || 1;
    const pageSizeNum = Math.min(parseInt(pageSize as string) || 20, 100);
    const skip = (pageNum - 1) * pageSizeNum;

    qb.orderBy('s.created_at', 'DESC')
      .skip(skip)
      .take(pageSizeNum);

    const [sessions, total] = await qb.getManyAndCount();

    res.json({
      success: true,
      data: sessions,
      pagination: { page: pageNum, pageSize: pageSizeNum, total }
    });
  } catch (error: any) {
    log.error('[Wecom] Get KF sessions error:', error);
    res.status(500).json({ success: false, message: '获取客服会话记录失败' });
  }
});

/**
 * 同步客服会话记录（从企微API拉取真实消息）
 */
router.post('/kf-sessions/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, openKfId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const accountRepo = getTenantRepo(WecomServiceAccount);
    const where: any = { wecomConfigId: configId };
    if (openKfId) where.openKfId = openKfId;
    const accounts = await accountRepo.find({ where });

    if (accounts.length === 0) {
      return res.json({ success: true, message: '暂无客服账号', data: { synced: 0 } });
    }

    const sessionRepo = getTenantRepo(WecomKfSession);
    let synced = 0;
    let newSessions = 0;

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId);

    // 调用企微 kf/sync_msg API 拉取真实消息
    try {
      let cursor = '';
      let hasMore = true;
      let totalMsgs = 0;

      while (hasMore && totalMsgs < 5000) {
        const result = await WecomApiService.syncKfMessages(accessToken, cursor || undefined);
        const messages = result.msgList || [];
        totalMsgs += messages.length;
        hasMore = result.hasMore;
        cursor = result.nextCursor;

        // 处理消息，按外部用户分组为会话
        for (const msg of messages) {
          if (msg.msgtype === 'event') {
            const event = msg.event;
            if (event?.event_type === 'enter_session' || event?.event_type === 'session_status_change') {
              const externalUserId = msg.external_userid || event?.external_userid;
              const kfId = msg.open_kfid || event?.open_kfid;
              const servicerUserId = event?.servicer_userid || '';

              if (externalUserId && kfId) {
                const existing = await sessionRepo.findOne({
                  where: { openKfId: kfId, externalUserid: externalUserId, sessionStatus: 'open' }
                });

                if (!existing) {
                  const session = sessionRepo.create({
                    wecomConfigId: configId,
                    openKfId: kfId,
                    externalUserid: externalUserId,
                    customerName: externalUserId,
                    servicerUserid: servicerUserId,
                    servicerName: servicerUserId,
                    sessionStatus: event?.event_type === 'session_status_change' && event?.change_type === 3 ? 'closed' : 'open',
                    msgCount: 1,
                    sessionStartTime: msg.send_time ? new Date(msg.send_time * 1000).toISOString() : new Date().toISOString(),
                  });
                  await sessionRepo.save(session);
                  newSessions++;
                } else {
                  existing.msgCount = (existing.msgCount || 0) + 1;
                  if (servicerUserId) existing.servicerUserid = servicerUserId;
                  if (event?.event_type === 'session_status_change' && event?.change_type === 3) {
                    existing.sessionStatus = 'closed';
                    existing.sessionEndTime = new Date() as any;
                  }
                  await sessionRepo.save(existing);
                }
              }
            }
          }
        }

        if (messages.length === 0) break;
      }
      synced = totalMsgs;
    } catch (apiErr: any) {
      log.warn('[Wecom] syncKfMessages API error:', apiErr.message);
    }

    // 更新每个账号的接待统计
    for (const account of accounts) {
      const sessionCount = await sessionRepo.count({ where: { openKfId: account.openKfId } });
      account.totalServiceCount = sessionCount;
      await accountRepo.save(account);
    }

    res.json({
      success: true,
      message: `同步完成：拉取 ${synced} 条消息，新增 ${newSessions} 个会话`,
      data: { synced, newSessions }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync KF sessions error:', error);
    res.status(500).json({ success: false, message: error.message || '同步客服会话失败' });
  }
});

// ==================== Phase 5: 客服数据统计 ====================

/**
 * 获取客服数据统计
 */
router.get('/kf-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, openKfId, startDate, endDate } = req.query;
    const sessionRepo = getTenantRepo(WecomKfSession);
    const qb = sessionRepo.createQueryBuilder('s');

    if (configId) qb.andWhere('s.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (openKfId) qb.andWhere('s.open_kf_id = :openKfId', { openKfId });
    if (startDate) qb.andWhere('s.session_start_time >= :startDate', { startDate });
    if (endDate) qb.andWhere('s.session_start_time <= :endDate', { endDate });

    const sessions = await qb.getMany();

    const totalSessions = sessions.length;
    const closedSessions = sessions.filter(s => s.sessionStatus === 'closed').length;
    const openSessions = sessions.filter(s => s.sessionStatus === 'open').length;
    const totalMsgCount = sessions.reduce((sum, s) => sum + (s.msgCount || 0), 0);

    // 平均首次响应时长
    const responseTimes = sessions
      .filter(s => s.firstResponseTime !== null && s.firstResponseTime !== undefined)
      .map(s => s.firstResponseTime);
    const avgFirstResponse = responseTimes.length > 0
      ? Math.round(responseTimes.reduce((s, t) => s + t, 0) / responseTimes.length)
      : 0;

    // 平均响应时长
    const avgTimes = sessions
      .filter(s => s.avgResponseTime !== null && s.avgResponseTime !== undefined)
      .map(s => s.avgResponseTime);
    const avgResponse = avgTimes.length > 0
      ? Math.round(avgTimes.reduce((s, t) => s + t, 0) / avgTimes.length)
      : 0;

    // 满意度
    const satisfactionScores = sessions
      .filter(s => s.satisfaction !== null && s.satisfaction !== undefined)
      .map(s => s.satisfaction);
    const avgSatisfaction = satisfactionScores.length > 0
      ? parseFloat((satisfactionScores.reduce((s, v) => s + v, 0) / satisfactionScores.length).toFixed(1))
      : 0;

    // 按接待人员分组统计
    const servicerMap = new Map<string, { name: string; count: number; avgResponse: number }>();
    for (const s of sessions) {
      const key = s.servicerUserid || 'unknown';
      const existing = servicerMap.get(key);
      if (existing) {
        existing.count++;
        if (s.avgResponseTime) {
          existing.avgResponse = Math.round((existing.avgResponse * (existing.count - 1) + s.avgResponseTime) / existing.count);
        }
      } else {
        servicerMap.set(key, {
          name: s.servicerName || key,
          count: 1,
          avgResponse: s.avgResponseTime || 0
        });
      }
    }

    const servicerStats = Array.from(servicerMap.entries()).map(([userId, data]) => ({
      userId,
      ...data
    }));

    res.json({
      success: true,
      data: {
        totalSessions,
        closedSessions,
        openSessions,
        totalMsgCount,
        avgFirstResponse,
        avgResponse,
        avgSatisfaction,
        satisfactionDistribution: {
          excellent: satisfactionScores.filter(s => s >= 5).length,
          good: satisfactionScores.filter(s => s === 4).length,
          normal: satisfactionScores.filter(s => s === 3).length,
          bad: satisfactionScores.filter(s => s <= 2).length
        },
        servicerStats
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get KF stats error:', error);
    res.status(500).json({ success: false, message: '获取客服统计失败' });
  }
});

// ==================== Phase 5: 快捷回复管理 ====================

/**
 * 获取快捷回复列表
 */
router.get('/quick-replies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, groupName, keyword } = req.query;
    const replyRepo = getTenantRepo(WecomQuickReply);
    const qb = replyRepo.createQueryBuilder('r');

    if (category) qb.andWhere('r.category = :category', { category });
    if (groupName) qb.andWhere('r.group_name = :groupName', { groupName });
    if (keyword) {
      qb.andWhere('(r.title LIKE :kw OR r.content LIKE :kw)', { kw: `%${keyword}%` });
    }

    qb.orderBy('r.sort_order', 'ASC').addOrderBy('r.use_count', 'DESC');

    const replies = await qb.getMany();

    // 按分组归类
    const groups = new Map<string, typeof replies>();
    for (const r of replies) {
      const group = r.groupName || '未分组';
      if (!groups.has(group)) groups.set(group, []);
      groups.get(group)!.push(r);
    }

    const groupedReplies = Array.from(groups.entries()).map(([name, items]) => ({
      groupName: name,
      items
    }));

    res.json({ success: true, data: { replies, grouped: groupedReplies } });
  } catch (error: any) {
    log.error('[Wecom] Get quick replies error:', error);
    res.status(500).json({ success: false, message: '获取快捷回复失败' });
  }
});

/**
 * 创建快捷回复
 */
router.post('/quick-replies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { category, groupName, title, content, shortcut, sortOrder } = req.body;
    if (!title || !content) {
      return res.status(400).json({ success: false, message: '标题和内容不能为空' });
    }

    const replyRepo = getTenantRepo(WecomQuickReply);
    const currentUser = (req as any).currentUser;

    const reply = replyRepo.create({
      category: category || 'enterprise',
      groupName: groupName || null,
      title,
      content,
      shortcut: shortcut || null,
      sortOrder: sortOrder || 0,
      createdBy: currentUser?.name || 'admin'
    });

    await replyRepo.save(reply);
    res.json({ success: true, data: reply, message: '创建成功' });
  } catch (error: any) {
    log.error('[Wecom] Create quick reply error:', error);
    res.status(500).json({ success: false, message: '创建快捷回复失败' });
  }
});

/**
 * 更新快捷回复
 */
router.put('/quick-replies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const replyRepo = getTenantRepo(WecomQuickReply);
    const reply = await replyRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!reply) return res.status(404).json({ success: false, message: '快捷回复不存在' });

    const { category, groupName, title, content, shortcut, isEnabled, sortOrder } = req.body;
    if (category !== undefined) reply.category = category;
    if (groupName !== undefined) reply.groupName = groupName;
    if (title !== undefined) reply.title = title;
    if (content !== undefined) reply.content = content;
    if (shortcut !== undefined) reply.shortcut = shortcut;
    if (isEnabled !== undefined) reply.isEnabled = isEnabled;
    if (sortOrder !== undefined) reply.sortOrder = sortOrder;

    await replyRepo.save(reply);
    res.json({ success: true, message: '更新成功' });
  } catch (error: any) {
    log.error('[Wecom] Update quick reply error:', error);
    res.status(500).json({ success: false, message: '更新快捷回复失败' });
  }
});

/**
 * 删除快捷回复
 */
router.delete('/quick-replies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const replyRepo = getTenantRepo(WecomQuickReply);
    const reply = await replyRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!reply) return res.status(404).json({ success: false, message: '快捷回复不存在' });
    await replyRepo.remove(reply);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete quick reply error:', error);
    res.status(500).json({ success: false, message: '删除快捷回复失败' });
  }
});

/**
 * 快捷回复使用计数 +1
 */
router.post('/quick-replies/:id/use', authenticateToken, async (req: Request, res: Response) => {
  try {
    const replyRepo = getTenantRepo(WecomQuickReply);
    const reply = await replyRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!reply) return res.status(404).json({ success: false, message: '快捷回复不存在' });

    reply.useCount = (reply.useCount || 0) + 1;
    await replyRepo.save(reply);
    res.json({ success: true, data: { useCount: reply.useCount } });
  } catch (error: any) {
    log.error('[Wecom] Quick reply use count error:', error);
    res.status(500).json({ success: false, message: '更新使用计数失败' });
  }
});

// ==================== 自动回复配置 ====================

/**
 * 获取自动回复配置
 */
router.get('/auto-reply-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const { AppDataSource } = await import('../../config/database');
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
      [`wecom_auto_reply_${configId}`]
    ).catch(() => []);

    const config = rows.length > 0 ? JSON.parse(rows[0].config_value || '{}') : {};
    res.json({ success: true, data: config });
  } catch (error: any) {
    log.error('[Wecom] Get auto reply config error:', error);
    res.status(500).json({ success: false, message: '获取自动回复配置失败' });
  }
});

/**
 * 保存自动回复配置
 */
router.put('/auto-reply-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, ...replyConfig } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const { AppDataSource } = await import('../../config/database');
    const key = `wecom_auto_reply_${configId}`;
    const value = JSON.stringify(replyConfig);

    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [key]
    ).catch(() => []);

    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ? WHERE config_key = ?", [value, key]);
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (config_key, config_value, config_type) VALUES (?, ?, 'json')",
        [key, value]
      );
    }

    res.json({ success: true, message: '自动回复配置已保存' });
  } catch (error: any) {
    log.error('[Wecom] Save auto reply config error:', error);
    res.status(500).json({ success: false, message: '保存自动回复配置失败' });
  }
});

/**
 * 获取客服账号客服链接（kf_url）
 */
router.get('/service-accounts/:id/url', authenticateToken, async (req: Request, res: Response) => {
  try {
    const accountRepo = getTenantRepo(WecomServiceAccount);
    const account = await accountRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!account) return res.status(404).json({ success: false, message: '客服账号不存在' });

    if (account.openKfId && account.wecomConfigId) {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(account.wecomConfigId);
        const axios = (await import('axios')).default;
        const resp = await axios.post(`https://qyapi.weixin.qq.com/cgi-bin/kf/add_contact_way?access_token=${accessToken}`, {
          open_kfid: account.openKfId, scene: '1'
        });
        if (resp.data.errcode === 0 && resp.data.url) {
          account.kfUrl = resp.data.url;
          await accountRepo.save(account);
          return res.json({ success: true, data: { url: resp.data.url } });
        }
      } catch (apiErr: any) {
        log.warn('[Wecom] Get KF URL error:', apiErr.message);
      }
    }

    res.json({ success: true, data: { url: account.kfUrl || '' } });
  } catch (error: any) {
    log.error('[Wecom] Get KF URL error:', error);
    res.status(500).json({ success: false, message: '获取客服链接失败' });
  }
});

export default router;

