/**
 * 企微客户管理路由
 * 包含：客户列表、统计、同步、CRM关联
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import { WecomCustomer } from '../../entities/WecomCustomer';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

/**
 * 获取客户统计数据
 */
router.get('/customers/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, startDate, endDate } = req.query;
    const customerRepo = getTenantRepo(WecomCustomer);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const queryBuilder = customerRepo.createQueryBuilder('c');
    if (configId) {
      queryBuilder.andWhere('c.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    }
    // 支持日期范围筛选（Phase 12-A: 统计卡片联动时间筛选）
    if (startDate) {
      queryBuilder.andWhere('c.add_time >= :startDate', { startDate: new Date(startDate as string) });
    }
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('c.add_time <= :endDate', { endDate: end });
    }

    const todayAdd = await queryBuilder.clone()
      .andWhere('c.add_time >= :today', { today })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    const totalAdd = await queryBuilder.clone()
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    const deleted = await queryBuilder.clone()
      .andWhere('c.status IN (:...statuses)', { statuses: ['deleted', 'deleted_by_employee'] })
      .getCount();

    const blocked = await queryBuilder.clone()
      .andWhere('c.status = :status', { status: 'blocked' })
      .getCount();

    // 活跃客户统计：基于会话存档中客户最近3天内主动发过消息
    let active = 0;
    try {
      const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
      const chatRepo = getTenantRepo(WecomChatRecord);
      const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
      const normalCustomers = await queryBuilder.clone()
        .andWhere('c.status = :status', { status: 'normal' })
        .select(['c.externalUserId'])
        .getMany();
      const extIds = normalCustomers.map(c => c.externalUserId).filter(Boolean);
      if (extIds.length > 0) {
        const activeResult = await chatRepo.createQueryBuilder('r')
          .select('COUNT(DISTINCT r.from_user_id)', 'cnt')
          .where('r.from_user_id IN (:...uids)', { uids: extIds })
          .andWhere('r.msg_time >= :since', { since: threeDaysAgo })
          .getRawOne();
        active = parseInt(activeResult?.cnt) || 0;
      }
    } catch { /* ignore */ }

    res.json({ success: true, data: { todayAdd, totalAdd, deleted, blocked, active } });
  } catch (error: any) {
    log.error('[Wecom] Get customer stats error:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

/**
 * 获取企业客户列表
 */
router.get('/customers', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, status, followUserId, keyword, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const user = (req as any).user || (req as any).currentUser;
    const userRole = user?.role || '';
    const userId = user?.userId || String(user?.id || '');
    const customerRepo = getTenantRepo(WecomCustomer);
    const queryBuilder = customerRepo.createQueryBuilder('c');

    if (configId) queryBuilder.andWhere('c.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (status) queryBuilder.andWhere('c.status = :status', { status });
    if (followUserId) queryBuilder.andWhere('c.follow_user_id = :followUserId', { followUserId });

    // 角色范围过滤：非管理员只能看到自己范围的客户
    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    const isManager = ['manager', 'department_manager'].includes(userRole);
    if (!isAdmin && !followUserId) {
      const bindingRepo = getTenantRepo(WecomUserBinding);
      if (isManager) {
        const { AppDataSource } = await import('../../config/database');
        const deptUsers = await AppDataSource.query(
          `SELECT id FROM users WHERE department_id = (SELECT department_id FROM users WHERE id = ?) AND tenant_id = (SELECT tenant_id FROM users WHERE id = ?)`,
          [userId, userId]
        ).catch(() => []);
        const deptUserIds = new Set(deptUsers.map((u: any) => String(u.id)));
        deptUserIds.add(userId);
        const deptBindings = await bindingRepo.find({ where: { isEnabled: true } });
        const allowedWecomUserIds = deptBindings
          .filter(b => b.crmUserId && deptUserIds.has(String(b.crmUserId)))
          .map(b => b.wecomUserId);
        if (allowedWecomUserIds.length > 0) {
          queryBuilder.andWhere('c.follow_user_id IN (:...allowedIds)', { allowedIds: allowedWecomUserIds });
        } else {
          queryBuilder.andWhere('1 = 0');
        }
      } else {
        const myBindings = await bindingRepo.find({ where: { crmUserId: userId as any, isEnabled: true } });
        const myWecomUserIds = myBindings.map(b => b.wecomUserId);
        if (myWecomUserIds.length > 0) {
          queryBuilder.andWhere('c.follow_user_id IN (:...myIds)', { myIds: myWecomUserIds });
        } else {
          queryBuilder.andWhere('1 = 0');
        }
      }
    }
    if (keyword) {
      // 支持搜索：客户名、备注、UserID、手机号、跟进人、关联的CRM客户名
      const kw = `%${keyword}%`;
      const { Customer } = await import('../../entities/Customer');
      const crmRepo = getTenantRepo(Customer);
      const matchedCrmIds = await crmRepo.createQueryBuilder('crm')
        .select('crm.id')
        .where('crm.name LIKE :kw', { kw })
        .getMany()
        .then(list => list.map(c => c.id))
        .catch(() => [] as string[]);

      if (matchedCrmIds.length > 0) {
        queryBuilder.andWhere(
          '(c.name LIKE :keyword OR c.remark LIKE :keyword OR c.external_user_id LIKE :keyword OR c.phone LIKE :keyword OR c.follow_user_name LIKE :keyword OR c.crm_customer_id IN (:...crmIds))',
          { keyword: kw, crmIds: matchedCrmIds }
        );
      } else {
        queryBuilder.andWhere(
          '(c.name LIKE :keyword OR c.remark LIKE :keyword OR c.external_user_id LIKE :keyword OR c.phone LIKE :keyword OR c.follow_user_name LIKE :keyword)',
          { keyword: kw }
        );
      }
    }
    // Phase 12-A: 支持日期范围筛选
    if (startDate) queryBuilder.andWhere('c.add_time >= :startDate', { startDate: new Date(startDate as string) });
    if (endDate) {
      const end = new Date(endDate as string);
      end.setHours(23, 59, 59, 999);
      queryBuilder.andWhere('c.add_time <= :endDate', { endDate: end });
    }

    const total = await queryBuilder.getCount();
    const customers = await queryBuilder
      .orderBy('c.created_at', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    // 标签名称解析：如果tagNames或tagIds中包含tag_id格式的值，尝试从企微API获取标签映射
    let tagNameMap: Record<string, string> | null = null;
    const isTagId = (s: string) => /^et[A-Za-z0-9_\-]{10,}$/.test(s);
    const needsTagResolve = customers.some(c => {
      // 检查tagNames是否包含未解析的tag_id
      if (c.tagNames) {
        try {
          const names = JSON.parse(c.tagNames);
          if (Array.isArray(names) && names.some((n: string) => isTagId(n))) return true;
        } catch { /* ignore */ }
      }
      // 检查tagIds是否有值但tagNames为空
      if (c.tagIds && !c.tagNames) return true;
      return false;
    });

    if (needsTagResolve) {
      // 优先使用传入的configId，否则从客户记录中取
      const resolveConfigId = configId ? parseInt(configId as string) : (customers[0]?.wecomConfigId || null);
      if (resolveConfigId) {
        try {
          const accessToken = await WecomApiService.getAccessTokenByConfigId(resolveConfigId, 'external');
          const tagGroups = await WecomApiService.getCorpTagList(accessToken);
          tagNameMap = {};
          for (const group of tagGroups) {
            for (const tag of (group.tag || [])) {
              if (tag.id && tag.name) tagNameMap[tag.id] = tag.name;
            }
          }
        } catch { /* 忽略标签获取失败 */ }
      }
    }

    // 批量获取关联的CRM客户名称
    const crmCustomerIds = customers.map(c => c.crmCustomerId).filter(Boolean);
    let crmNameMap: Record<string, string> = {};
    if (crmCustomerIds.length > 0) {
      try {
        const { Customer } = await import('../../entities/Customer');
        const crmRepo = getTenantRepo(Customer);
        const crmCustomers = await crmRepo.createQueryBuilder('c')
          .select(['c.id', 'c.name'])
          .where('c.id IN (:...ids)', { ids: crmCustomerIds })
          .getMany();
        for (const cc of crmCustomers) {
          crmNameMap[cc.id] = cc.name;
        }
      } catch { /* ignore */ }
    }

    // 批量获取消息统计（客户发送+员工发送）+ 客户最后主动发消息时间（用于活跃度）
    let msgStatsMap: Record<string, { sent: number; recv: number; lastCustomerMsgTime: Date | null }> = {};
    if (customers.length > 0) {
      try {
        const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
        const chatRepo = getTenantRepo(WecomChatRecord);
        const externalUserIds = customers.map(c => c.externalUserId).filter(Boolean);
        if (externalUserIds.length > 0) {
          // 客户主动发送消息统计 + 最后消息时间
          const sentStats = await chatRepo.createQueryBuilder('r')
            .select('r.from_user_id', 'uid')
            .addSelect('COUNT(*)', 'cnt')
            .addSelect('MAX(r.msg_time)', 'lastTime')
            .where('r.from_user_id IN (:...uids)', { uids: externalUserIds })
            .groupBy('r.from_user_id')
            .getRawMany();
          for (const s of sentStats) {
            if (!msgStatsMap[s.uid]) msgStatsMap[s.uid] = { sent: 0, recv: 0, lastCustomerMsgTime: null };
            msgStatsMap[s.uid].sent = parseInt(s.cnt) || 0;
            msgStatsMap[s.uid].lastCustomerMsgTime = s.lastTime ? new Date(s.lastTime) : null;
          }
          // 员工发送给客户的消息统计
          for (const uid of externalUserIds) {
            const recv = await chatRepo.createQueryBuilder('r')
              .where('r.to_user_ids LIKE :uid', { uid: `%${uid}%` })
              .getCount();
            if (recv > 0) {
              if (!msgStatsMap[uid]) msgStatsMap[uid] = { sent: 0, recv: 0, lastCustomerMsgTime: null };
              msgStatsMap[uid].recv = recv;
            }
          }
        }
      } catch (msgErr: any) {
        log.warn('[Wecom] Message stats query error:', msgErr.message);
      }
    }

    const now = Date.now();
    const DAY_MS = 24 * 60 * 60 * 1000;

    const list = customers.map(c => {
      const item: any = { ...c };
      // 解析并修正标签名称
      if (c.tagNames && tagNameMap) {
        try {
          const names = JSON.parse(c.tagNames);
          if (Array.isArray(names)) {
            item.tagNames = JSON.stringify(names.map((n: string) => tagNameMap![n] || n));
          }
        } catch { /* keep original */ }
      }
      if (!c.tagNames && c.tagIds && tagNameMap) {
        try {
          const ids = JSON.parse(c.tagIds);
          if (Array.isArray(ids)) {
            item.tagNames = JSON.stringify(ids.map((id: string) => tagNameMap![id] || id));
          }
        } catch { /* keep original */ }
      }
      if (c.crmCustomerId && crmNameMap[c.crmCustomerId]) {
        item.crmCustomerName = crmNameMap[c.crmCustomerId];
      }
      // 消息统计 + 活跃度
      const msgStat = msgStatsMap[c.externalUserId];
      if (msgStat) {
        item.msgSentCount = msgStat.sent;
        item.msgRecvCount = msgStat.recv;
        // 活跃度：基于客户最后一次主动发消息的时间
        if (msgStat.lastCustomerMsgTime) {
          const daysSince = (now - msgStat.lastCustomerMsgTime.getTime()) / DAY_MS;
          if (daysSince <= 3) {
            item.activityStatus = 'active';
          } else if (daysSince <= 7) {
            item.activityStatus = 'normal';
          } else {
            item.activityStatus = 'silent';
          }
        } else {
          item.activityStatus = 'silent';
        }
      } else {
        item.activityStatus = 'silent';
      }
      return item;
    });

    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get customers error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

/**
 * 同步企微客户数据
 * 采用异步模式：立即返回响应，后台执行同步，避免网关超时
 */
router.post('/customers/sync', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    const user = (req as any).user || (req as any).currentUser;
    const userRole = user?.role || '';
    const userId = user?.userId || String(user?.id || '');
    log.info(`[Wecom] Sync customers request, configId=${configId}, role=${userRole}, userId=${userId}`);

    if (!configId) {
      return res.status(400).json({ success: false, message: '请选择企微配置' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    const bindingRepo = getTenantRepo(WecomUserBinding);
    let bindings = await bindingRepo.find({ where: { wecomConfigId: configId, isEnabled: true } });

    if (bindings.length === 0) {
      return res.status(400).json({ success: false, message: '没有绑定的成员，请先在通讯录中绑定成员' });
    }

    // 根据角色过滤同步范围
    const isAdmin = ['super_admin', 'admin'].includes(userRole);
    const isManager = ['manager', 'department_manager'].includes(userRole);

    if (!isAdmin) {
      if (isManager) {
        // 部门经理：同步本部门绑定成员的客户
        const { AppDataSource } = await import('../../config/database');
        const deptUsers = await AppDataSource.query(
          `SELECT id FROM users WHERE department_id = (SELECT department_id FROM users WHERE id = ?) AND tenant_id = (SELECT tenant_id FROM users WHERE id = ?)`,
          [userId, userId]
        ).catch(() => []);
        const deptUserIds = new Set(deptUsers.map((u: any) => String(u.id)));
        deptUserIds.add(userId);
        bindings = bindings.filter(b => b.crmUserId && deptUserIds.has(String(b.crmUserId)));
      } else {
        // 普通销售：仅同步自己绑定的企微账户的客户
        bindings = bindings.filter(b => String(b.crmUserId) === userId);
      }

      if (bindings.length === 0) {
        return res.status(400).json({ success: false, message: '您尚未绑定企业微信账户，请先完成绑定后再同步' });
      }
    }

    const bindingNames = bindings.map(b => b.wecomUserName || b.wecomUserId).join('、');

    res.json({
      success: true,
      message: `同步任务已启动，正在同步 ${bindings.length} 个成员的客户数据`,
      data: { status: 'running', bindingsCount: bindings.length, bindingsUsed: bindings.length, bindingNames }
    });

    // 后台异步执行同步
    (async () => {
      try {
        const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
        log.info(`[Wecom] Sync customers: got access token, starting async sync for ${bindings.length} bindings`);

        // 预先获取企业标签映射表（tag_id -> tag_name）
        const corpTagMap: Record<string, string> = {};
        try {
          const tagGroups = await WecomApiService.getCorpTagList(accessToken);
          for (const group of tagGroups) {
            for (const tag of (group.tag || [])) {
              if (tag.id && tag.name) corpTagMap[tag.id] = tag.name;
            }
          }
          log.info(`[Wecom] Loaded ${Object.keys(corpTagMap).length} corp tags for name resolution`);
        } catch (tagErr: any) {
          log.warn('[Wecom] Failed to load corp tags, will fallback to API tag_name:', tagErr.message);
        }

        const customerRepo = getTenantRepo(WecomCustomer);
        let syncCount = 0;

        // 收集本次同步到的所有 externalUserId，用于后续检测被删除的客户
        const syncedExternalUserIds = new Set<string>();

        for (const binding of bindings) {
          try {
            const externalUserIds = await WecomApiService.getExternalContactList(accessToken, binding.wecomUserId);
            log.info(`[Wecom] Member ${binding.wecomUserId}: ${externalUserIds.length} external contacts`);

            // 分批处理，每批5个并发，避免企微API限流
            const batchSize = 5;
            for (let i = 0; i < externalUserIds.length; i += batchSize) {
              const batch = externalUserIds.slice(i, i + batchSize);
              await Promise.allSettled(batch.map(async (externalUserId) => {
                syncedExternalUserIds.add(externalUserId);
                try {
                  const detail = await WecomApiService.getExternalContactDetail(accessToken, externalUserId);
                  const externalContact = detail.external_contact;
                  const followUserList = detail.follow_user || [];
                  const followUser = followUserList.find((f: any) => f.userid === binding.wecomUserId) || followUserList[0];

                  let customer = await customerRepo.findOne({ where: { wecomConfigId: configId, externalUserId } });
                  if (!customer) {
                    customer = customerRepo.create({ wecomConfigId: configId, corpId: config.corpId, externalUserId, tenantId: config.tenantId });
                  }

                  customer.name = externalContact.name;
                  customer.avatar = externalContact.avatar;
                  customer.type = externalContact.type;
                  customer.gender = externalContact.gender;
                  customer.corpName = externalContact.corp_name;
                  customer.position = externalContact.position;
                  customer.followUserId = binding.wecomUserId;
                  customer.followUserName = binding.wecomUserName;
                  customer.followUsers = followUserList.length > 0 ? JSON.stringify(followUserList) : null;
                  customer.remark = followUser?.remark;
                  customer.description = followUser?.description;
                  customer.addTime = followUser?.createtime ? new Date(followUser.createtime * 1000) : null;
                  customer.addWay = followUser?.add_way;
                  customer.tagIds = followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => t.tag_id)) : null;
                  customer.tagNames = followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => corpTagMap[t.tag_id] || t.tag_name || t.tag_id)) : null;
                  customer.state = followUser?.state || null;
                  customer.status = 'normal';

                  await customerRepo.save(customer);
                  syncCount++;
                } catch (e: any) {
                  log.error(`[Wecom] Sync customer ${externalUserId} error:`, e.message);
                }
              }));
              // 每批之间稍微延迟，避免企微API限流
              if (i + batchSize < externalUserIds.length) {
                await new Promise(r => setTimeout(r, 200));
              }
            }
          } catch (e: any) {
            log.error(`[Wecom] Sync user ${binding.wecomUserId} customers error:`, e.message);
          }
        }

        // 检测被删除/拉黑的客户
        let deletedCount = 0;
        let blockedCount = 0;
        if (syncedExternalUserIds.size > 0) {
          const localCustomers = await customerRepo.find({
            where: { wecomConfigId: configId },
            select: ['id', 'externalUserId', 'status']
          });
          for (const local of localCustomers) {
            if (local.status === 'normal' && !syncedExternalUserIds.has(local.externalUserId)) {
              // 本地正常但 API 不再返回 = 被删除（员工删除或客户删除）
              await customerRepo.update(local.id, { status: 'deleted' as any, deleteTime: new Date() } as any);
              deletedCount++;
            } else if ((local.status === 'deleted' || local.status === 'blocked') && syncedExternalUserIds.has(local.externalUserId)) {
              // 之前标记删除但现在又出现了 = 恢复正常
              await customerRepo.update(local.id, { status: 'normal' as any, deleteTime: null } as any);
            }
          }
          if (deletedCount > 0) {
            log.info(`[Wecom] Marked ${deletedCount} customers as deleted (no longer in WeCom contact list)`);
          }
        }

        log.info(`[Wecom] Async customer sync completed: ${syncCount} synced, ${deletedCount} deleted, ${blockedCount} blocked`);
      } catch (error: any) {
        log.error('[Wecom] Async sync customers error:', error.message, error.stack);
      }
    })();
  } catch (error: any) {
    log.error('[Wecom] Sync customers error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '同步客户失败' });
  }
});

/**
 * 关联企微客户到CRM客户
 */
router.put('/customers/:id/link-crm', authenticateToken, async (req: Request, res: Response) => {
  try {
    const wecomCustomerId = parseInt(req.params.id);
    const { crmCustomerId } = req.body;

    if (!crmCustomerId) {
      return res.status(400).json({ success: false, message: '请选择要关联的CRM客户' });
    }

    const customerRepo = getTenantRepo(WecomCustomer);
    const customer = await customerRepo.findOne({ where: { id: wecomCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: '企微客户不存在' });
    }

    const { Customer } = await import('../../entities/Customer');
    const crmCustomerRepo = getTenantRepo(Customer);
    const crmCustomer = await crmCustomerRepo.findOne({ where: { id: crmCustomerId } });
    if (!crmCustomer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    // 关联唯一性逻辑：检查CRM客户是否有多UserID配置
    const multiUserIds = Array.isArray(crmCustomer.wecomExternalUserids) ? crmCustomer.wecomExternalUserids : [];
    const hasMultiUserIds = multiUserIds.length > 1;

    if (!hasMultiUserIds) {
      // 单UserID模式：解绑之前关联该CRM客户的其他企微客户
      const previouslyLinked = await customerRepo.find({ where: { crmCustomerId } });
      for (const prev of previouslyLinked) {
        if (prev.id !== wecomCustomerId) {
          prev.crmCustomerId = null as any;
          await customerRepo.save(prev);
        }
      }
    }

    customer.crmCustomerId = crmCustomerId;
    await customerRepo.save(customer);

    // 同步更新CRM客户的企微UserID字段
    const externalUserId = customer.externalUserId;
    if (externalUserId) {
      if (!crmCustomer.wecomExternalUserid) {
        crmCustomer.wecomExternalUserid = externalUserId;
      }
      const currentIds = Array.isArray(crmCustomer.wecomExternalUserids) ? [...crmCustomer.wecomExternalUserids] : [];
      if (!currentIds.includes(externalUserId)) {
        currentIds.push(externalUserId);
        crmCustomer.wecomExternalUserids = currentIds;
      }
      await crmCustomerRepo.save(crmCustomer);
    }

    res.json({ success: true, message: '关联成功', data: { wecomCustomerId, crmCustomerId, crmCustomerName: crmCustomer.name } });
  } catch (error: any) {
    log.error('[Wecom] Link CRM customer error:', error);
    res.status(500).json({ success: false, message: '关联失败' });
  }
});

/**
 * 解除企微客户与CRM客户的关联
 */
router.put('/customers/:id/unlink-crm', authenticateToken, async (req: Request, res: Response) => {
  try {
    const wecomCustomerId = parseInt(req.params.id);
    const customerRepo = getTenantRepo(WecomCustomer);
    const customer = await customerRepo.findOne({ where: { id: wecomCustomerId } });

    if (!customer) {
      return res.status(404).json({ success: false, message: '企微客户不存在' });
    }

    const oldCrmId = customer.crmCustomerId;
    const externalUserId = customer.externalUserId;
    customer.crmCustomerId = null as any;
    await customerRepo.save(customer);

    // 同步清理CRM客户侧的UserID
    if (oldCrmId && externalUserId) {
      try {
        const { Customer } = await import('../../entities/Customer');
        const crmRepo = getTenantRepo(Customer);
        const crmCustomer = await crmRepo.findOne({ where: { id: oldCrmId } });
        if (crmCustomer) {
          // 检查是否还有其他企微客户关联该CRM客户
          const otherLinked = await customerRepo.findOne({
            where: { crmCustomerId: oldCrmId, externalUserId: externalUserId }
          });
          if (!otherLinked) {
            // 从多UserID列表中移除
            if (Array.isArray(crmCustomer.wecomExternalUserids)) {
              crmCustomer.wecomExternalUserids = crmCustomer.wecomExternalUserids.filter(uid => uid !== externalUserId);
              if (crmCustomer.wecomExternalUserids.length === 0) crmCustomer.wecomExternalUserids = null as any;
            }
            if (crmCustomer.wecomExternalUserid === externalUserId) {
              crmCustomer.wecomExternalUserid = (crmCustomer.wecomExternalUserids && crmCustomer.wecomExternalUserids.length > 0) ? crmCustomer.wecomExternalUserids[0] : null as any;
            }
            await crmRepo.save(crmCustomer);
          }
        }
      } catch { /* ignore cleanup errors */ }
    }

    res.json({ success: true, message: '已解除关联' });
  } catch (error: any) {
    log.error('[Wecom] Unlink CRM customer error:', error);
    res.status(500).json({ success: false, message: '解除关联失败' });
  }
});

/**
 * 搜索CRM客户（用于关联选择）
 * 支持空关键词返回最近10个客户供预选
 */
router.get('/crm-customers/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    const { Customer } = await import('../../entities/Customer');
    const crmCustomerRepo = getTenantRepo(Customer);

    let qb = crmCustomerRepo.createQueryBuilder('c');
    if (keyword && String(keyword).trim()) {
      const kw = `%${keyword}%`;
      qb = qb.where('(c.name LIKE :kw OR c.phone LIKE :kw OR c.customer_code LIKE :kw OR c.wecom_external_userid LIKE :kw)', { kw });
    }
    const customers = await qb
      .orderBy('c.updated_at', 'DESC')
      .take(keyword ? 20 : 10)
      .getMany();

    const list = customers.map(c => ({
      id: c.id, name: c.name, phone: c.phone,
      code: (c as any).customerNo || (c as any).customerCode || '',
    }));

    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Search CRM customers error:', error);
    res.status(500).json({ success: false, message: '搜索CRM客户失败' });
  }
});

// ==================== Phase 7: CRM深度集成 ====================

/**
 * 获取企微客户详情(含消息统计+CRM信息)
 */
router.get('/customers/:id/detail', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) {
      return res.status(400).json({ success: false, message: '无效的客户ID' });
    }

    const customerRepo = getTenantRepo(WecomCustomer);
    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: '企微客户不存在' });
    }

    // 查询消息统计
    const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
    const chatRepo = getTenantRepo(WecomChatRecord);
    const sentCount = await chatRepo.createQueryBuilder('r')
      .where('r.from_user_id = :uid', { uid: customer.externalUserId })
      .getCount();
    const recvCount = await chatRepo.createQueryBuilder('r')
      .where('r.to_user_ids LIKE :uid', { uid: `%${customer.externalUserId}%` })
      .getCount();

    // 最后消息
    const lastMsg = await chatRepo.createQueryBuilder('r')
      .where('r.from_user_id = :uid OR r.to_user_ids LIKE :uidLike', {
        uid: customer.externalUserId,
        uidLike: `%${customer.externalUserId}%`
      })
      .orderBy('r.msg_time', 'DESC')
      .getOne();

    // CRM客户信息
    let crmCustomer: any = null;
    if (customer.crmCustomerId) {
      const { Customer } = await import('../../entities/Customer');
      const crmRepo = getTenantRepo(Customer);
      crmCustomer = await crmRepo.findOne({ where: { id: customer.crmCustomerId } });
    }

    // 跟进记录
    let followRecords: any[] = [];
    if (customer.crmCustomerId) {
      const { FollowUp } = await import('../../entities/FollowUp');
      const followRepo = getTenantRepo(FollowUp);
      followRecords = await followRepo.find({
        where: { customerId: customer.crmCustomerId },
        order: { createdAt: 'DESC' },
        take: 10
      });
    }

    res.json({
      success: true,
      data: {
        customer: {
          id: customer.id,
          name: customer.name,
          avatar: customer.avatar,
          externalUserId: customer.externalUserId,
          type: customer.type,
          gender: customer.gender,
          corpName: customer.corpName,
          position: customer.position,
          followUserId: customer.followUserId,
          followUserName: customer.followUserName,
          remark: customer.remark,
          description: customer.description,
          addTime: customer.addTime,
          addWay: customer.addWay,
          tagIds: customer.tagIds,
          tagNames: customer.tagNames,
          phone: customer.phone,
          state: customer.state,
          status: customer.status,
          crmCustomerId: customer.crmCustomerId,
          isDealt: customer.isDealt
        },
        messageStats: {
          sentCount,
          recvCount,
          totalCount: sentCount + recvCount,
          lastMsgTime: lastMsg ? lastMsg.msgTime : null,
          lastMsgType: lastMsg ? lastMsg.msgType : null
        },
        crmCustomer: crmCustomer ? {
          id: crmCustomer.id,
          name: crmCustomer.name,
          phone: crmCustomer.phone,
          level: crmCustomer.level,
          source: crmCustomer.source,
          tags: crmCustomer.tags || [],
          salesPersonName: crmCustomer.salesPersonName,
          orderCount: crmCustomer.orderCount,
          totalAmount: Number(crmCustomer.totalAmount) || 0,
          wecomExternalUserid: crmCustomer.wecomExternalUserid
        } : null,
        followRecords: followRecords.map(f => ({
          id: f.id,
          type: f.type,
          content: f.content,
          customerIntent: f.customerIntent,
          createdAt: f.createdAt
        }))
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get customer detail error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取客户详情失败' });
  }
});

/**
 * 批量获取客户消息统计
 */
router.get('/customers/stats/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, customerIds } = req.query;
    const { WecomChatRecord } = await import('../../entities/WecomChatRecord');
    const chatRepo = getTenantRepo(WecomChatRecord);
    const customerRepo = getTenantRepo(WecomCustomer);

    let customers: any[] = [];
    if (customerIds) {
      const ids = String(customerIds).split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
      if (ids.length > 0) {
        customers = await customerRepo.createQueryBuilder('c')
          .where('c.id IN (:...ids)', { ids })
          .getMany();
      }
    } else if (configId) {
      customers = await customerRepo.find({
        where: { wecomConfigId: parseInt(configId as string) },
        take: 200
      });
    }

    const stats: any[] = [];
    for (const c of customers) {
      const sent = await chatRepo.createQueryBuilder('r')
        .where('r.from_user_id = :uid', { uid: c.externalUserId })
        .getCount();
      const recv = await chatRepo.createQueryBuilder('r')
        .where('r.to_user_ids LIKE :uid', { uid: `%${c.externalUserId}%` })
        .getCount();

      stats.push({
        customerId: c.id,
        externalUserId: c.externalUserId,
        name: c.name,
        sentCount: sent,
        recvCount: recv,
        totalCount: sent + recv,
        activeDays7d: c.activeDays7d || 0
      });
    }

    res.json({ success: true, data: stats });
  } catch (error: any) {
    log.error('[Wecom] Get message stats error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取消息统计失败' });
  }
});

/**
 * 添加企微客户跟进记录
 */
router.post('/customers/:id/follow-record', authenticateToken, async (req: Request, res: Response) => {
  try {
    const customerId = parseInt(req.params.id);
    const { content, type = 'message' } = req.body;

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return res.status(400).json({ success: false, message: '跟进内容不能为空' });
    }

    const customerRepo = getTenantRepo(WecomCustomer);
    const customer = await customerRepo.findOne({ where: { id: customerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: '企微客户不存在' });
    }
    if (!customer.crmCustomerId) {
      return res.status(400).json({ success: false, message: '该企微客户尚未关联CRM客户，无法添加跟进记录' });
    }

    const { FollowUp } = await import('../../entities/FollowUp');
    const { v4: uuidv4 } = await import('uuid');
    const followRepo = getTenantRepo(FollowUp);

    const _currentUser = (req as any).user;
    const record = followRepo.create({
      id: uuidv4(),
      customerId: customer.crmCustomerId,
      customerName: customer.name,
      type: type || 'message',
      content: content.trim(),
      tenantId: customer.tenantId
    } as any);
    const saved = await followRepo.save(record);

    res.json({ success: true, message: '跟进记录添加成功', data: { id: (saved as any).id } });
  } catch (error: any) {
    log.error('[Wecom] Add follow record error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '添加跟进记录失败' });
  }
});

/**
 * 获取CRM客户的企微绑定信息
 */
router.get('/crm-customers/:id/wecom-info', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;

    // 获取CRM客户信息（包含多UserID列表）
    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const crmCustomer = await crmRepo.findOne({ where: { id: crmCustomerId } });

    const customerRepo = getTenantRepo(WecomCustomer);

    // 通过 crmCustomerId 关联查找 + 通过多UserID列表查找
    let wecomCustomers = await customerRepo.find({ where: { crmCustomerId } });

    // 也查找多UserID列表中的企微客户
    const multiIds = Array.isArray(crmCustomer?.wecomExternalUserids) ? crmCustomer.wecomExternalUserids : [];
    if (multiIds.length > 0) {
      for (const uid of multiIds) {
        const found = await customerRepo.findOne({ where: { externalUserId: uid } });
        if (found && !wecomCustomers.find(w => w.id === found.id)) {
          wecomCustomers.push(found);
        }
      }
    }

    if (wecomCustomers.length === 0) {
      return res.json({
        success: true,
        data: {
          bound: false,
          wecomExternalUserid: crmCustomer?.wecomExternalUserid || null,
          boundWecomAccounts: 0,
          tags: [],
          lastChatSummary: null,
          followUserName: null
        }
      });
    }

    // 取第一个关联的企微客户作为主要信息
    const primary = wecomCustomers[0];
    const tagNames: string[] = (() => {
      try {
        return primary.tagNames ? JSON.parse(primary.tagNames) : [];
      } catch {
        return [];
      }
    })();

    res.json({
      success: true,
      data: {
        bound: true,
        wecomExternalUserid: crmCustomer?.wecomExternalUserid || primary.externalUserId,
        boundWecomAccounts: wecomCustomers.length,
        tags: tagNames,
        lastChatSummary: primary.lastChatTime ? `最后聊天: ${new Date(primary.lastChatTime).toLocaleString()}` : null,
        followUserName: primary.followUserName,
        wecomCustomers: wecomCustomers.map(c => ({
          id: c.id,
          name: c.name,
          externalUserId: c.externalUserId,
          followUserName: c.followUserName,
          status: c.status,
          addTime: c.addTime
        }))
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get CRM customer wecom info error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取企微信息失败' });
  }
});

/**
 * 更新CRM客户的企微USID
 */
router.put('/crm-customers/:id/wecom-usid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;
    const { wecomExternalUserid } = req.body;

    // 格式校验
    if (wecomExternalUserid !== null && wecomExternalUserid !== undefined && wecomExternalUserid !== '') {
      if (typeof wecomExternalUserid !== 'string') {
        return res.status(400).json({ success: false, message: 'USID格式不正确' });
      }
      if (wecomExternalUserid.length > 100) {
        return res.status(400).json({ success: false, message: 'USID长度不能超过100个字符' });
      }
    }

    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const customer = await crmRepo.findOne({ where: { id: crmCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    // 租户内唯一性校验（非空时）
    const newUsid = wecomExternalUserid || null;
    if (newUsid) {
      const existing = await crmRepo.createQueryBuilder('c')
        .where('c.wecom_external_userid = :usid', { usid: newUsid })
        .andWhere('c.id != :id', { id: crmCustomerId })
        .getOne();
      if (existing) {
        return res.status(409).json({
          success: false,
          message: `该USID已被客户「${existing.name}」使用，请检查`
        });
      }
    }

    customer.wecomExternalUserid = newUsid;
    await crmRepo.save(customer);

    res.json({
      success: true,
      message: newUsid ? 'USID更新成功' : 'USID已清除',
      data: { wecomExternalUserid: customer.wecomExternalUserid }
    });
  } catch (error: any) {
    log.error('[Wecom] Update CRM customer USID error:', error.message, error.stack);
    // 处理唯一索引冲突
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: '该USID已被其他客户使用' });
    }
    res.status(500).json({ success: false, message: '更新USID失败' });
  }
});

// ==================== 多UserID管理 ====================

/**
 * 获取CRM客户的所有企微UserID
 */
router.get('/crm-customers/:id/wecom-userids', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;
    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const customer = await crmRepo.findOne({ where: { id: crmCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    const userids: string[] = [];
    if (customer.wecomExternalUserid) userids.push(customer.wecomExternalUserid);
    if (Array.isArray(customer.wecomExternalUserids)) {
      for (const uid of customer.wecomExternalUserids) {
        if (uid && !userids.includes(uid)) userids.push(uid);
      }
    }

    res.json({ success: true, data: { userids } });
  } catch (error: any) {
    log.error('[Wecom] Get CRM customer userids error:', error.message);
    res.status(500).json({ success: false, message: '获取UserID列表失败' });
  }
});

/**
 * 添加企微UserID到CRM客户
 */
router.post('/crm-customers/:id/wecom-userids', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;
    const { wecomExternalUserid } = req.body;

    if (!wecomExternalUserid || typeof wecomExternalUserid !== 'string' || wecomExternalUserid.trim().length === 0) {
      return res.status(400).json({ success: false, message: 'UserID不能为空' });
    }
    const newUsid = wecomExternalUserid.trim();
    if (newUsid.length > 100) {
      return res.status(400).json({ success: false, message: 'UserID长度不能超过100个字符' });
    }

    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const customer = await crmRepo.findOne({ where: { id: crmCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    // 检查是否已存在
    const existingIds: string[] = [];
    if (customer.wecomExternalUserid) existingIds.push(customer.wecomExternalUserid);
    if (Array.isArray(customer.wecomExternalUserids)) {
      existingIds.push(...customer.wecomExternalUserids);
    }
    if (existingIds.includes(newUsid)) {
      return res.status(409).json({ success: false, message: '该UserID已存在' });
    }

    // 检查租户内唯一性（不能被其他客户占用）
    const otherCustomer = await crmRepo.createQueryBuilder('c')
      .where('c.id != :id', { id: crmCustomerId })
      .andWhere('(c.wecom_external_userid = :usid OR JSON_CONTAINS(c.wecom_external_userids, :usidJson))', {
        usid: newUsid,
        usidJson: JSON.stringify(newUsid)
      })
      .getOne();
    if (otherCustomer) {
      return res.status(409).json({ success: false, message: `该UserID已被客户「${otherCustomer.name}」使用` });
    }

    // 添加到列表
    if (!customer.wecomExternalUserid) {
      customer.wecomExternalUserid = newUsid;
    }
    const currentList = Array.isArray(customer.wecomExternalUserids) ? [...customer.wecomExternalUserids] : [];
    if (!currentList.includes(newUsid) && newUsid !== customer.wecomExternalUserid) {
      currentList.push(newUsid);
    } else if (newUsid === customer.wecomExternalUserid && !currentList.includes(newUsid)) {
      // 主USID已设为该值，确保也在列表中
    }
    // 确保主USID也在列表中
    if (customer.wecomExternalUserid && !currentList.includes(customer.wecomExternalUserid)) {
      currentList.unshift(customer.wecomExternalUserid);
    }
    if (!currentList.includes(newUsid)) {
      currentList.push(newUsid);
    }
    customer.wecomExternalUserids = currentList;
    await crmRepo.save(customer);

    // 同步关联: 找到对应的企微客户并自动关联
    const wecomCustomerRepo = getTenantRepo(WecomCustomer);
    const wecomCustomer = await wecomCustomerRepo.findOne({ where: { externalUserId: newUsid } });
    if (wecomCustomer && !wecomCustomer.crmCustomerId) {
      wecomCustomer.crmCustomerId = crmCustomerId;
      await wecomCustomerRepo.save(wecomCustomer);
    }

    res.json({ success: true, message: 'UserID添加成功', data: { userids: customer.wecomExternalUserids } });
  } catch (error: any) {
    log.error('[Wecom] Add CRM customer userid error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '添加UserID失败' });
  }
});

/**
 * 删除CRM客户的某个企微UserID
 */
router.delete('/crm-customers/:id/wecom-userids/:usid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;
    const usidToRemove = decodeURIComponent(req.params.usid);

    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const customer = await crmRepo.findOne({ where: { id: crmCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    let currentList = Array.isArray(customer.wecomExternalUserids) ? [...customer.wecomExternalUserids] : [];
    currentList = currentList.filter(uid => uid !== usidToRemove);
    customer.wecomExternalUserids = currentList.length > 0 ? currentList : null as any;

    // 如果删除的是主USID，更换为列表中的下一个
    if (customer.wecomExternalUserid === usidToRemove) {
      customer.wecomExternalUserid = currentList.length > 0 ? currentList[0] : null as any;
    }
    await crmRepo.save(customer);

    // 解除对应企微客户的关联
    const wecomCustomerRepo = getTenantRepo(WecomCustomer);
    const wecomCustomer = await wecomCustomerRepo.findOne({ where: { externalUserId: usidToRemove, crmCustomerId } });
    if (wecomCustomer) {
      wecomCustomer.crmCustomerId = null as any;
      await wecomCustomerRepo.save(wecomCustomer);
    }

    res.json({ success: true, message: 'UserID删除成功', data: { userids: customer.wecomExternalUserids || [] } });
  } catch (error: any) {
    log.error('[Wecom] Delete CRM customer userid error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '删除UserID失败' });
  }
});

/**
 * 修改CRM客户的某个企微UserID
 */
router.put('/crm-customers/:id/wecom-userids/:usid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const crmCustomerId = req.params.id;
    const oldUsid = decodeURIComponent(req.params.usid);
    const { newWecomExternalUserid } = req.body;

    if (!newWecomExternalUserid || typeof newWecomExternalUserid !== 'string' || newWecomExternalUserid.trim().length === 0) {
      return res.status(400).json({ success: false, message: '新UserID不能为空' });
    }
    const newUsid = newWecomExternalUserid.trim();

    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const customer = await crmRepo.findOne({ where: { id: crmCustomerId } });
    if (!customer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    // 检查新值唯一性
    const otherCustomer = await crmRepo.createQueryBuilder('c')
      .where('c.id != :id', { id: crmCustomerId })
      .andWhere('(c.wecom_external_userid = :usid OR JSON_CONTAINS(c.wecom_external_userids, :usidJson))', {
        usid: newUsid,
        usidJson: JSON.stringify(newUsid)
      })
      .getOne();
    if (otherCustomer) {
      return res.status(409).json({ success: false, message: `该UserID已被客户「${otherCustomer.name}」使用` });
    }

    let currentList = Array.isArray(customer.wecomExternalUserids) ? [...customer.wecomExternalUserids] : [];
    const idx = currentList.indexOf(oldUsid);
    if (idx >= 0) {
      currentList[idx] = newUsid;
    }
    customer.wecomExternalUserids = currentList;

    if (customer.wecomExternalUserid === oldUsid) {
      customer.wecomExternalUserid = newUsid;
    }
    await crmRepo.save(customer);

    // 解除旧关联，建立新关联
    const wecomCustomerRepo = getTenantRepo(WecomCustomer);
    const oldWecom = await wecomCustomerRepo.findOne({ where: { externalUserId: oldUsid, crmCustomerId } });
    if (oldWecom) {
      oldWecom.crmCustomerId = null as any;
      await wecomCustomerRepo.save(oldWecom);
    }
    const newWecom = await wecomCustomerRepo.findOne({ where: { externalUserId: newUsid } });
    if (newWecom && !newWecom.crmCustomerId) {
      newWecom.crmCustomerId = crmCustomerId;
      await wecomCustomerRepo.save(newWecom);
    }

    res.json({ success: true, message: 'UserID修改成功', data: { userids: customer.wecomExternalUserids } });
  } catch (error: any) {
    log.error('[Wecom] Update CRM customer userid error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '修改UserID失败' });
  }
});

export default router;

