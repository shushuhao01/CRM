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
      .andWhere('c.status = :status', { status: 'deleted' })
      .getCount();

    const dealt = await queryBuilder.clone()
      .andWhere('c.is_dealt = :isDealt', { isDealt: true })
      .getCount();

    res.json({ success: true, data: { todayAdd, totalAdd, deleted, dealt } });
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
    const customerRepo = getTenantRepo(WecomCustomer);
    const queryBuilder = customerRepo.createQueryBuilder('c');

    if (configId) queryBuilder.andWhere('c.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (status) queryBuilder.andWhere('c.status = :status', { status });
    if (followUserId) queryBuilder.andWhere('c.follow_user_id = :followUserId', { followUserId });
    if (keyword) queryBuilder.andWhere('(c.name LIKE :keyword OR c.remark LIKE :keyword OR c.external_user_id LIKE :keyword)', { keyword: `%${keyword}%` });
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

    res.json({ success: true, data: { list: customers, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get customers error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

/**
 * 同步企微客户数据
 */
router.post('/customers/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    log.info('[Wecom] Sync customers request, configId:', configId);

    if (!configId) {
      return res.status(400).json({ success: false, message: '请选择企微配置' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    }

    const bindingRepo = getTenantRepo(WecomUserBinding);
    const bindings = await bindingRepo.find({ where: { wecomConfigId: configId, isEnabled: true } });

    if (bindings.length === 0) {
      return res.status(400).json({ success: false, message: '没有绑定的成员，请先在企微联动中绑定成员' });
    }

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
    const customerRepo = getTenantRepo(WecomCustomer);
    let syncCount = 0;

    for (const binding of bindings) {
      try {
        const externalUserIds = await WecomApiService.getExternalContactList(accessToken, binding.wecomUserId);
        for (const externalUserId of externalUserIds) {
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
            customer.tagNames = followUser?.tags ? JSON.stringify(followUser.tags.map((t: any) => t.tag_name || t.tag_id)) : null;
            customer.state = followUser?.state || null;
            customer.status = 'normal';

            await customerRepo.save(customer);
            syncCount++;
          } catch (e: any) {
            log.error(`[Wecom] Sync customer ${externalUserId} error:`, e.message);
          }
        }
      } catch (e: any) {
        log.error(`[Wecom] Sync user ${binding.wecomUserId} customers error:`, e.message);
      }
    }

    const totalCustomers = await customerRepo.count({ where: { wecomConfigId: configId } });
    res.json({
      success: true,
      message: `同步完成，共同步 ${syncCount} 个客户`,
      data: { syncCount, totalCustomers, customerLimit: 5000, bindingsUsed: bindings.length }
    });
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

    customer.crmCustomerId = crmCustomerId;
    await customerRepo.save(customer);

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

    customer.crmCustomerId = null as any;
    await customerRepo.save(customer);
    res.json({ success: true, message: '已解除关联' });
  } catch (error: any) {
    log.error('[Wecom] Unlink CRM customer error:', error);
    res.status(500).json({ success: false, message: '解除关联失败' });
  }
});

/**
 * 搜索CRM客户（用于关联选择）
 */
router.get('/crm-customers/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    if (!keyword) return res.json({ success: true, data: [] });

    const { Customer } = await import('../../entities/Customer');
    const crmCustomerRepo = getTenantRepo(Customer);

    const customers = await crmCustomerRepo.createQueryBuilder('c')
      .where('(c.name LIKE :kw OR c.phone LIKE :kw OR c.customer_code LIKE :kw)', { kw: `%${keyword}%` })
      .orderBy('c.created_at', 'DESC')
      .take(20)
      .getMany();

    const list = customers.map(c => ({
      id: c.id, name: c.name, phone: c.phone,
      customerNo: (c as any).customerNo || (c as any).customerCode,
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
          lastMsgType: lastMsg ? lastMsg.msgType : null,
          activeDays7d: customer.activeDays7d || 0
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

    const customerRepo = getTenantRepo(WecomCustomer);
    const wecomCustomers = await customerRepo.find({
      where: { crmCustomerId }
    });

    if (wecomCustomers.length === 0) {
      return res.json({
        success: true,
        data: {
          bound: false,
          wecomExternalUserid: null,
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

    // 获取CRM客户的USID
    const { Customer } = await import('../../entities/Customer');
    const crmRepo = getTenantRepo(Customer);
    const crmCustomer = await crmRepo.findOne({ where: { id: crmCustomerId } });

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

export default router;

