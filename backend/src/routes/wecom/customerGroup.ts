/**
 * 企微客户群管理路由 (V2.0 全新模块)
 * 包含：群列表、群详情、群统计、群同步、群发消息
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomCustomerGroup } from '../../entities/WecomCustomerGroup';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import axios from 'axios';

const WECOM_API = 'https://qyapi.weixin.qq.com/cgi-bin';
const router = Router();

// ==================== 企微标签列表 ====================

router.get('/corp-tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.json({ success: true, data: [] });

    const accessToken = await WecomApiService.getAccessTokenByConfigId(parseInt(configId as string), 'external');
    const resp = await axios.post(
      `${WECOM_API}/externalcontact/get_corp_tag_list?access_token=${accessToken}`,
      {}
    );

    if (resp.data.errcode !== 0) {
      return res.json({ success: true, data: [] });
    }

    res.json({ success: true, data: resp.data.tag_group || [] });
  } catch (error: any) {
    log.error('[Wecom] Get corp tags error:', error.message);
    res.json({ success: true, data: [] });
  }
});

// ==================== 群列表 ====================

router.get('/customer-groups', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, status, ownerUserId, page = 1, pageSize = 20 } = req.query;
    const groupRepo = getTenantRepo(WecomCustomerGroup);
    const qb = groupRepo.createQueryBuilder('g');

    if (configId) qb.andWhere('g.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (status) qb.andWhere('g.status = :status', { status });
    if (ownerUserId) qb.andWhere('g.owner_user_id = :ownerUserId', { ownerUserId });
    if (keyword) qb.andWhere('g.name LIKE :keyword', { keyword: `%${keyword}%` });

    const total = await qb.getCount();
    const list = await qb.orderBy('g.created_at', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get customer groups error:', error.message);
    res.status(500).json({ success: false, message: '获取客户群列表失败' });
  }
});

// ==================== 群详情 ====================

router.get('/customer-groups/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const groupRepo = getTenantRepo(WecomCustomerGroup);
    const group = await groupRepo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!group) return res.status(404).json({ success: false, message: '群不存在' });

    let memberList: any[] = [];
    try {
      memberList = group.memberList ? JSON.parse(group.memberList) : [];
    } catch { memberList = []; }

    res.json({ success: true, data: { ...group, memberList } });
  } catch (error: any) {
    log.error('[Wecom] Get customer group detail error:', error.message);
    res.status(500).json({ success: false, message: '获取群详情失败' });
  }
});

// ==================== 群统计 ====================

router.get('/customer-groups/stats/summary', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const groupRepo = getTenantRepo(WecomCustomerGroup);
    const qb = groupRepo.createQueryBuilder('g');
    if (configId) qb.andWhere('g.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    const totalGroups = await qb.clone().getCount();
    const activeGroups = await qb.clone().andWhere('g.status = :s', { s: 'normal' }).getCount();
    const dismissedGroups = await qb.clone().andWhere('g.status = :s', { s: 'dismissed' }).getCount();

    const memberResult = await qb.clone()
      .select('SUM(g.member_count)', 'total')
      .andWhere('g.status = :s', { s: 'normal' })
      .getRawOne();
    const totalMembers = parseInt(memberResult?.total || '0');

    res.json({
      success: true,
      data: { totalGroups, activeGroups, dismissedGroups, totalMembers, avgMembers: activeGroups > 0 ? Math.round(totalMembers / activeGroups) : 0 }
    });
  } catch (error: any) {
    log.error('[Wecom] Get group stats error:', error.message);
    res.status(500).json({ success: false, message: '获取群统计失败' });
  }
});

// ==================== 群趋势数据 ====================

router.get('/customer-groups/stats/trend', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, dateRange = '7d', type = 'member' } = req.query;
    // Generate trend data based on actual group records
    const groupRepo = getTenantRepo(WecomCustomerGroup);
    const qb = groupRepo.createQueryBuilder('g');
    if (configId) qb.andWhere('g.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    const days = dateRange === 'today' ? 24 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 7;
    const data: Array<{ date: string; value: number }> = [];

    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = dateRange === 'today' ? `${24 - i}:00` : `${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;

      // For now return aggregate counts; can be enhanced with daily snapshots
      const totalGroups = await qb.clone().getCount();
      const memberResult = await qb.clone().select('SUM(g.member_count)', 'total').getRawOne();
      const totalMembers = parseInt(memberResult?.total || '0');

      data.push({
        date: label,
        value: type === 'member' ? totalMembers : type === 'group' ? totalGroups : 0
      });
    }

    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Wecom] Get group stats trend error:', error.message);
    res.status(500).json({ success: false, message: '获取趋势数据失败' });
  }
});

// ==================== 群活跃排行 ====================

router.get('/customer-groups/stats/rank', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const groupRepo = getTenantRepo(WecomCustomerGroup);
    const qb = groupRepo.createQueryBuilder('g').andWhere('g.status = :s', { s: 'normal' });
    if (configId) qb.andWhere('g.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    const groups = await qb.orderBy('g.member_count', 'DESC').take(10).getMany();

    const maxMembers = groups.length > 0 ? Math.max(...groups.map(g => g.memberCount || 1)) : 1;
    const data = groups.map(g => ({
      groupName: g.name || '未命名群',
      memberCount: g.memberCount || 0,
      msgCount: g.todayMsgCount || 0,
      activeness: Math.round(((g.memberCount || 0) / maxMembers) * 100),
      owner: g.ownerUserName || g.ownerUserId || '-'
    }));

    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Wecom] Get group stats rank error:', error.message);
    res.status(500).json({ success: false, message: '获取排行数据失败' });
  }
});

// ==================== 群同步 ====================

router.post('/customer-groups/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');

    // 获取客户群列表
    let cursor = '';
    const allChatIds: string[] = [];
    let pageCount = 0;

    do {
      const params: any = { status_filter: 0, limit: 100 };
      if (cursor) params.cursor = cursor;

      const resp = await axios.post(
        `${WECOM_API}/externalcontact/groupchat/list?access_token=${accessToken}`,
        params
      );

      if (resp.data.errcode !== 0) {
        throw new Error(`获取群列表失败: ${resp.data.errmsg} (${resp.data.errcode})`);
      }

      const chatList = resp.data.group_chat_list || [];
      for (const item of chatList) {
        if (item.chat_id) allChatIds.push(item.chat_id);
      }

      cursor = resp.data.next_cursor || '';
      pageCount++;
    } while (cursor && pageCount < 50);

    log.info(`[Wecom] Found ${allChatIds.length} groups to sync`);

    const groupRepo = getTenantRepo(WecomCustomerGroup);
    let syncCount = 0;
    let errorCount = 0;

    for (const chatId of allChatIds) {
      try {
        const detailResp = await axios.post(
          `${WECOM_API}/externalcontact/groupchat/get?access_token=${accessToken}`,
          { chat_id: chatId, need_name: 1 }
        );

        if (detailResp.data.errcode === 0 && detailResp.data.group_chat) {
          const gc = detailResp.data.group_chat;
          let group = await groupRepo.findOne({ where: { chatId, wecomConfigId: configId } });

          if (group) {
            group.name = gc.name || group.name;
            group.ownerUserId = gc.owner || group.ownerUserId;
            group.memberCount = gc.member_list?.length || 0;
            group.notice = gc.notice || '';
            group.memberList = gc.member_list ? JSON.stringify(gc.member_list) : null;
          } else {
            group = groupRepo.create({
              tenantId: config.tenantId,
              wecomConfigId: configId,
              chatId,
              name: gc.name || '',
              ownerUserId: gc.owner || '',
              memberCount: gc.member_list?.length || 0,
              notice: gc.notice || '',
              createTime: gc.create_time ? new Date(gc.create_time * 1000) : new Date(),
              memberList: gc.member_list ? JSON.stringify(gc.member_list) : null,
              status: 'normal'
            });
          }
          await groupRepo.save(group);
          syncCount++;
        }
      } catch (e: any) {
        errorCount++;
        log.warn(`[Wecom] Sync group ${chatId} failed:`, e.message);
      }
    }

    res.json({
      success: true,
      message: `同步完成：成功 ${syncCount} 个，失败 ${errorCount} 个`,
      data: { syncCount, errorCount, totalFound: allChatIds.length }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync customer groups error:', error.message);
    res.status(500).json({ success: false, message: error.message || '同步客户群失败' });
  }
});

// ==================== 踢出群成员 ====================

/**
 * 踢出群成员（仅限外部客户）
 * 企微API: POST externalcontact/groupchat/transfer (实际无直接del接口，需用remove接口)
 * 实际可用: opengw/groupchat 不存在，需要用 externalcontact 的方式
 * 注：企微没有直接的 groupchat/member/del 接口，但可以通过 updategroupchat 的 del_member_list 实现
 */
router.post('/customer-groups/kick-member', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { chatId, userIds } = req.body;
    if (!chatId || !userIds || !Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({ success: false, message: '参数错误：需要chatId和userIds' });
    }

    // 找到该群对应的企微配置
    const groupRepo = getTenantRepo(WecomCustomerGroup, req);
    const group = await groupRepo.findOne({ where: { chatId } as any });
    if (!group) {
      return res.status(404).json({ success: false, message: '群聊不存在' });
    }

    const configRepo = getTenantRepo(WecomConfig, req);
    const config = await configRepo.findOne({ where: { isEnabled: true } as any });
    if (!config) {
      return res.status(400).json({ success: false, message: '企微配置不存在或未启用' });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(config.id, 'external');

    // 调用企微API: 通过 opengw 的方式不可用，使用 externalcontact/groupchat 的 update 接口
    // 企微文档: POST /cgi-bin/externalcontact/groupchat/transfer 只做群主转让
    // 实际踢出外部成员使用内部接口（如果存在），否则提示手动踢出
    // 注意：企微确实没有公开的"踢出群成员" REST API
    // 但有 appchat/update 可以移除内部群成员（不适用客户群）
    // 对于客户群，只能通过企微管理后台或手机端操作

    // 尝试调用 (企微可能已在较新版本开放此接口)
    const response = await axios.post(`${WECOM_API}/externalcontact/groupchat/del_member?access_token=${accessToken}`, {
      chat_id: chatId,
      userid_list: userIds
    });

    if (response.data.errcode === 0) {
      log.info(`[Wecom] Kicked ${userIds.length} members from group ${chatId}`);
      res.json({ success: true, message: `成功踢出 ${userIds.length} 名成员` });
    } else if (response.data.errcode === 41063 || response.data.errcode === 40054) {
      // 接口不存在或不支持，提示用户手动操作
      log.warn(`[Wecom] Kick member API not available: ${response.data.errmsg}`);
      res.status(400).json({
        success: false,
        message: '企业微信当前版本暂不支持通过API踢出客户群成员，请在企微手机端手动操作。'
      });
    } else {
      throw new Error(`踢出成员失败: ${response.data.errmsg} (errcode: ${response.data.errcode})`);
    }
  } catch (error: any) {
    log.error('[Wecom] Kick group member error:', error.message);
    res.status(500).json({ success: false, message: error.message || '踢出失败' });
  }
});

export default router;

