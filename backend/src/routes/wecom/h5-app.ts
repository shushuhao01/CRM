/**
 * 企微H5应用 - 工作台路由
 *
 * 提供工作台首页数据、客户列表/详情、数据统计等接口
 * 路由前缀: /h5/app
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { WecomCustomer } from '../../entities/WecomCustomer';
import { authenticateSidebarToken } from '../../middleware/auth';
import { log } from '../../config/logger';

const router = Router();

/** 从sidebarUser获取tenantId和userId */
function getH5Context(req: Request): { tenantId: string; userId: string; corpId: string; wecomUserId: string } {
  const su = (req as any).sidebarUser || {};
  return {
    tenantId: su.tenantId || '',
    userId: su.crmUserId || su.userId || '',
    corpId: su.corpId || '',
    wecomUserId: su.wecomUserId || ''
  };
}

// ==================== 首页数据 ====================

/**
 * GET /h5/app/home
 * 返回首页概览数据
 */
router.get('/home', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: {} });

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);

    // 我的客户数
    const myCustomerCount = await wecomCustomerRepo.count({
      where: { tenantId, followUserId: wecomUserId, status: 'normal' }
    });

    // 今日新增
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNewCount = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.addTime >= :today', { today })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    // 待回复（近24小时有消息但未回复的）
    const pendingReplyCount = 0; // 需要会话存档数据，暂返回0

    // 今日需跟进
    const todayFollowUpCount = 0; // 需要跟进计划表，暂返回0

    // 最近动态
    const recentCustomers = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .orderBy('c.addTime', 'DESC')
      .take(5)
      .getMany();

    const recentActivities = recentCustomers.map(c => ({
      type: 'new_customer',
      content: `新客户 ${c.name || '未知'} 添加了你`,
      time: c.addTime ? new Date(c.addTime).toLocaleDateString('zh-CN') : '-'
    }));

    res.json({
      success: true,
      data: {
        myCustomerCount,
        todayNewCount,
        pendingReplyCount,
        todayFollowUpCount,
        recentActivities
      }
    });
  } catch (error: any) {
    log.error('[H5 App] home error:', error.message);
    res.status(500).json({ success: false, message: '获取首页数据失败' });
  }
});

// ==================== 客户列表 ====================

/**
 * GET /h5/app/customers
 * 分页查询客户列表
 */
router.get('/customers', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: { list: [], total: 0 } });

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(String(req.query.pageSize)) || 20));
    const keyword = String(req.query.keyword || '').trim();
    const status = String(req.query.status || 'normal');
    const tag = String(req.query.tag || '').trim();

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const qb = wecomCustomerRepo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId });

    if (status) {
      qb.andWhere('c.status = :status', { status });
    }

    if (keyword) {
      qb.andWhere('(c.name LIKE :kw OR c.remark LIKE :kw)', { kw: `%${keyword}%` });
    }

    if (tag) {
      qb.andWhere('c.tagNames LIKE :tag', { tag: `%${tag}%` });
    }

    const [customers, total] = await qb
      .orderBy('c.addTime', 'DESC')
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    const addWayMap: Record<number, string> = {
      1: '扫码添加', 2: '搜索手机号', 3: '名片分享', 4: '群聊',
      5: '手机通讯录', 6: '微信联系人', 201: '内部共享', 202: '管理员分配'
    };

    // 查找已绑定CRM的客户名称
    const crmIdSet = customers.filter(c => c.crmCustomerId).map(c => c.crmCustomerId);
    const crmNameMap: Record<string, string> = {};
    if (crmIdSet.length > 0) {
      try {
        const { Customer } = await import('../../entities/Customer');
        const custRepo = AppDataSource.getRepository(Customer);
        const crmCusts = await custRepo.findByIds(crmIdSet);
        crmCusts.forEach(cc => { crmNameMap[cc.id] = cc.name; });
      } catch { /* ignore */ }
    }

    const list = customers.map(c => {
      let tags: string[] = [];
      try { tags = c.tagNames ? JSON.parse(c.tagNames) : []; } catch { /* ignore */ }
      return {
        id: String(c.id),
        name: c.name || '未知客户',
        avatar: c.avatar || '',
        company: c.corpName || '',
        tags,
        gender: c.gender || 0,
        addTime: c.addTime ? new Date(c.addTime).toLocaleDateString('zh-CN') : '',
        addWayText: addWayMap[c.addWay] || '',
        remark: c.remark || '',
        lastContact: c.addTime ? new Date(c.addTime).toLocaleDateString('zh-CN') : '',
        lastMessage: c.remark || '',
        crmCustomerName: c.crmCustomerId ? (crmNameMap[c.crmCustomerId] || '') : ''
      };
    });

    res.json({ success: true, data: { list, total } });
  } catch (error: any) {
    log.error('[H5 App] customers error:', error.message);
    res.status(500).json({ success: false, message: '获取客户列表失败' });
  }
});

// ==================== 客户详情 ====================

/**
 * GET /h5/app/customer/:id
 * 获取客户详情（含CRM信息、跟进记录、订单记录）
 */
router.get('/customer/:id', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    const customerId = parseInt(req.params.id);
    if (isNaN(customerId)) return res.status(400).json({ success: false, message: '无效客户ID' });

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const wecomCustomer = await wecomCustomerRepo.findOne({
      where: { id: customerId, ...(tenantId ? { tenantId } : {}) }
    });
    if (!wecomCustomer) return res.status(404).json({ success: false, message: '客户不存在' });

    // 解析标签
    let tags: string[] = [];
    try { tags = wecomCustomer.tagNames ? JSON.parse(wecomCustomer.tagNames) : []; } catch { /* ignore */ }

    // 添加方式映射
    const addWayMap: Record<number, string> = {
      1: '扫描二维码', 2: '搜索手机号', 3: '名片分享', 4: '群聊',
      5: '手机通讯录', 6: '微信联系人', 201: '内部共享', 202: '管理员分配'
    };

    const result: any = {
      id: wecomCustomer.id,
      name: wecomCustomer.name,
      avatar: wecomCustomer.avatar,
      company: wecomCustomer.corpName,
      tags,
      wecom: {
        addTime: wecomCustomer.addTime ? new Date(wecomCustomer.addTime).toLocaleDateString('zh-CN') : null,
        addWayText: addWayMap[wecomCustomer.addWay] || '未知',
        followUserName: wecomCustomer.followUserName,
        remark: wecomCustomer.remark
      },
      crm: null,
      followUps: [],
      orders: []
    };

    // 查询关联的CRM客户
    if (wecomCustomer.crmCustomerId) {
      try {
        const { Customer } = await import('../../entities/Customer');
        const { Order } = await import('../../entities/Order');
        const customerRepo = AppDataSource.getRepository(Customer);
        const orderRepo = AppDataSource.getRepository(Order);

        const crmCustomer = await customerRepo.findOne({ where: { id: wecomCustomer.crmCustomerId } });
        if (crmCustomer) {
          // 脱敏手机号
          const desensPhone = crmCustomer.phone && crmCustomer.phone.length >= 7
            ? crmCustomer.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
            : crmCustomer.phone || '';

          // 脱敏邮箱
          const desensEmail = crmCustomer.email
            ? crmCustomer.email.replace(/(.{2}).*(@.*)/, '$1***$2')
            : '';
          // 脱敏微信号
          const desensWechat = crmCustomer.wechat
            ? (crmCustomer.wechat.substring(0, 3) + '***')
            : '';
          // 拼接地址
          const fullAddress = [crmCustomer.province, crmCustomer.city, crmCustomer.district, crmCustomer.street, crmCustomer.detailAddress].filter(Boolean).join('') || crmCustomer.address || '';

          result.crm = {
            name: crmCustomer.name || '',
            phone: desensPhone,
            email: desensEmail,
            wechat: desensWechat,
            gender: crmCustomer.gender || '',
            age: crmCustomer.age || '',
            height: crmCustomer.height ? Number(crmCustomer.height) : null,
            weight: crmCustomer.weight ? Number(crmCustomer.weight) : null,
            address: fullAddress,
            medicalHistory: crmCustomer.medicalHistory || '',
            company: crmCustomer.company || '',
            amount: crmCustomer.totalAmount || 0,
            stage: crmCustomer.followStatus || '',
            lastFollowUp: crmCustomer.lastContactTime
              ? new Date(crmCustomer.lastContactTime).toLocaleDateString('zh-CN')
              : null
          };

          // 查询最近订单
          const orders = await orderRepo.find({
            where: { customerId: crmCustomer.id },
            order: { createdAt: 'DESC' },
            take: 5,
            select: ['id', 'orderNumber', 'totalAmount', 'finalAmount', 'status', 'createdAt']
          });

          const statusMap: Record<string, string> = {
            pending: '待处理', confirmed: '已确认', shipped: '已发货',
            completed: '已完成', cancelled: '已取消', refunded: '已退款'
          };

          result.orders = orders.map(o => ({
            id: o.id,
            orderNumber: o.orderNumber,
            amount: Number(o.finalAmount || o.totalAmount || 0),
            status: o.status,
            statusText: statusMap[o.status] || o.status,
            time: o.createdAt ? new Date(o.createdAt).toLocaleDateString('zh-CN') : ''
          }));
        }
      } catch (e: any) {
        log.warn('[H5 App] Query CRM data error (non-critical):', e.message);
      }
    }

    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[H5 App] customer detail error:', error.message);
    res.status(500).json({ success: false, message: '获取客户详情失败' });
  }
});

// ==================== 数据统计 ====================

/**
 * GET /h5/app/stats
 * 数据统计（新增客户、获客数、成交统计等）
 */
router.get('/stats', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: {} });

    const period = String(req.query.period || 'today');
    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);

    // 计算日期范围
    const now = new Date();
    const startDate = new Date();
    startDate.setHours(0, 0, 0, 0);

    if (period === 'week') {
      const day = now.getDay();
      startDate.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
    } else if (period === 'month') {
      startDate.setDate(1);
    }

    // 新增客户数
    const newCustomerCount = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.addTime >= :startDate', { startDate })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    // 获客数（全企业）
    const acquisitionCount = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.addTime >= :startDate', { startDate })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    // 成交统计（当前用户在CRM系统中创建的订单业绩）
    let dealCount = 0;
    let dealAmount = 0;
    try {
      const { Order } = await import('../../entities/Order');
      const orderRepo = AppDataSource.getRepository(Order);
      const qb = orderRepo
        .createQueryBuilder('o')
        .select('COUNT(o.id)', 'count')
        .addSelect('COALESCE(SUM(COALESCE(o.finalAmount, o.totalAmount)), 0)', 'amount')
        .where('o.tenantId = :tenantId', { tenantId })
        .andWhere('o.createdAt >= :startDate', { startDate })
        .andWhere('o.status NOT IN (:...excludeStatus)', { excludeStatus: ['cancelled', 'refunded'] });
      // 按当前CRM用户筛选（业绩归属当前成员）
      if (userId) {
        qb.andWhere('o.createdBy = :userId', { userId });
      }
      const orderStats = await qb.getRawOne();
      dealCount = parseInt(orderStats?.count || '0');
      dealAmount = parseFloat(orderStats?.amount || '0');
    } catch (e: any) {
      log.warn('[H5 App] Stats order query error:', e.message);
    }

    // 获客排行（企业内Top5）
    const acquisitionRank = await wecomCustomerRepo
      .createQueryBuilder('c')
      .select('c.followUserName', 'name')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.addTime >= :startDate', { startDate })
      .andWhere('c.status = :status', { status: 'normal' })
      .andWhere('c.followUserName IS NOT NULL')
      .groupBy('c.followUserName')
      .orderBy('count', 'DESC')
      .take(5)
      .getRawMany();

    res.json({
      success: true,
      data: {
        newCustomerCount,
        acquisitionCount,
        responseRate: 0, // 需要会话存档数据
        dealCount,
        dealAmount: dealAmount.toFixed(2),
        newCustomerChange: 0,
        acquisitionChange: 0,
        acquisitionRank: acquisitionRank.map(r => ({
          name: r.name,
          count: parseInt(r.count)
        }))
      }
    });
  } catch (error: any) {
    log.error('[H5 App] stats error:', error.message);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

// ==================== 企微成员绑定CRM用户 ====================

/**
 * GET /h5/app/user-binding
 * 获取当前企微成员的CRM用户绑定状态
 */
router.get('/user-binding', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId || !wecomUserId) return res.json({ success: true, data: null });

    const { WecomUserBinding } = await import('../../entities/WecomUserBinding');
    const bindRepo = AppDataSource.getRepository(WecomUserBinding);

    const binding = await bindRepo.findOne({
      where: { tenantId, wecomUserId, isEnabled: true }
    });

    if (binding) {
      res.json({
        success: true,
        data: {
          id: binding.id,
          wecomUserId: binding.wecomUserId,
          wecomUserName: binding.wecomUserName,
          crmUserId: binding.crmUserId,
          crmUserName: binding.crmUserName,
          createdAt: binding.createdAt ? new Date(binding.createdAt).toLocaleDateString('zh-CN') : ''
        }
      });
    } else {
      res.json({ success: true, data: null });
    }
  } catch (error: any) {
    log.error('[H5 App] user-binding get error:', error.message);
    res.status(500).json({ success: false, message: '获取绑定状态失败' });
  }
});

/**
 * GET /h5/app/crm-users
 * 搜索CRM系统用户（用于企微成员绑定）
 */
router.get('/crm-users', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const keyword = String(req.query.keyword || '').trim();
    if (!keyword) return res.json({ success: true, data: [] });

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);

    const users = await userRepo
      .createQueryBuilder('u')
      .where('u.tenantId = :tenantId', { tenantId })
      .andWhere('u.status = :status', { status: 'active' })
      .andWhere('(u.username LIKE :kw OR u.name LIKE :kw)', { kw: `%${keyword}%` })
      .orderBy('u.name', 'ASC')
      .take(20)
      .getMany();

    res.json({
      success: true,
      data: users.map(u => ({
        id: u.id,
        name: u.name || u.username,
        username: u.username,
        department: u.departmentName || ''
      }))
    });
  } catch (error: any) {
    log.error('[H5 App] crm-users search error:', error.message);
    res.status(500).json({ success: false, message: '搜索CRM用户失败' });
  }
});

/**
 * POST /h5/app/user-binding
 * 创建企微成员↔CRM用户绑定
 */
router.post('/user-binding', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, corpId, wecomUserId } = getH5Context(req);
    if (!tenantId || !wecomUserId) return res.status(400).json({ success: false, message: '企微信息缺失' });

    const { crmUserId } = req.body;
    if (!crmUserId) return res.status(400).json({ success: false, message: '请选择CRM用户' });

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const crmUser = await userRepo.findOne({ where: { id: crmUserId, tenantId } });
    if (!crmUser) return res.status(404).json({ success: false, message: 'CRM用户不存在' });

    const { WecomUserBinding } = await import('../../entities/WecomUserBinding');
    const bindRepo = AppDataSource.getRepository(WecomUserBinding);

    // 检查是否已存在绑定
    const existing = await bindRepo.findOne({ where: { tenantId, wecomUserId } });
    if (existing) {
      existing.crmUserId = crmUserId;
      existing.crmUserName = crmUser.name || crmUser.username;
      existing.isEnabled = true;
      await bindRepo.save(existing);
    } else {
      const newBinding = bindRepo.create({
        tenantId,
        wecomConfigId: 0,
        corpId: corpId || '',
        wecomUserId,
        wecomUserName: '',
        crmUserId,
        crmUserName: crmUser.name || crmUser.username,
        bindOperator: wecomUserId,
        isEnabled: true
      });
      await bindRepo.save(newBinding);
    }

    log.info(`[H5 App] User binding: wecom ${wecomUserId} -> CRM ${crmUserId}`);
    res.json({ success: true, message: '绑定成功' });
  } catch (error: any) {
    log.error('[H5 App] user-binding post error:', error.message);
    res.status(500).json({ success: false, message: '绑定失败' });
  }
});

/**
 * DELETE /h5/app/user-binding
 * 解除企微成员↔CRM用户绑定
 */
router.delete('/user-binding', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId || !wecomUserId) return res.status(400).json({ success: false, message: '信息缺失' });

    const { WecomUserBinding } = await import('../../entities/WecomUserBinding');
    const bindRepo = AppDataSource.getRepository(WecomUserBinding);

    const existing = await bindRepo.findOne({ where: { tenantId, wecomUserId } });
    if (existing) {
      existing.isEnabled = false;
      await bindRepo.save(existing);
    }

    log.info(`[H5 App] User unbinding: wecom ${wecomUserId}`);
    res.json({ success: true, message: '已解除绑定' });
  } catch (error: any) {
    log.error('[H5 App] user-binding delete error:', error.message);
    res.status(500).json({ success: false, message: '解绑失败' });
  }
});

// ==================== 搜索CRM客户(用于绑定) ====================

/**
 * GET /h5/app/crm-customers
 * 搜索CRM客户列表（用于企微客户绑定）
 */
router.get('/crm-customers', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const keyword = String(req.query.keyword || '').trim();
    if (!keyword) return res.json({ success: true, data: [] });

    const { Customer } = await import('../../entities/Customer');
    const custRepo = AppDataSource.getRepository(Customer);

    const qb = custRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.status = :status', { status: 'active' })
      .andWhere('(c.name LIKE :kw OR c.phone LIKE :kw OR c.company LIKE :kw)', { kw: `%${keyword}%` });

    // 按当前用户权限范围筛选（只能绑定自己名下的客户）
    if (userId) {
      qb.andWhere('(c.salesPersonId = :userId OR c.createdBy = :userId)', { userId });
    }

    qb.orderBy('c.createdAt', 'DESC').take(20);

    const customers = await qb.getMany();

    res.json({
      success: true,
      data: customers.map(c => ({
        id: c.id,
        name: c.name,
        phone: c.phone || '',
        company: c.company || '',
        wecomBound: !!c.wecomExternalUserid
      }))
    });
  } catch (error: any) {
    log.error('[H5 App] crm-customers search error:', error.message);
    res.status(500).json({ success: false, message: '搜索CRM客户失败' });
  }
});

// ==================== 绑定企微客户到CRM ====================

/**
 * POST /h5/app/bind-crm
 * 将企微客户关联到CRM客户
 */
router.post('/bind-crm', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });

    const { wecomCustomerId, crmCustomerId } = req.body;
    if (!wecomCustomerId || !crmCustomerId) {
      return res.status(400).json({ success: false, message: '参数缺失' });
    }

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const { Customer } = await import('../../entities/Customer');
    const custRepo = AppDataSource.getRepository(Customer);

    // 查找企微客户
    const wecomCustomer = await wecomCustomerRepo.findOne({
      where: { id: parseInt(wecomCustomerId), tenantId: tenantId as any }
    });
    if (!wecomCustomer) {
      return res.status(404).json({ success: false, message: '企微客户不存在' });
    }

    // 查找CRM客户
    const crmCustomer = await custRepo.findOne({
      where: { id: crmCustomerId, tenantId }
    });
    if (!crmCustomer) {
      return res.status(404).json({ success: false, message: 'CRM客户不存在' });
    }

    // 绑定：更新企微客户的crmCustomerId
    wecomCustomer.crmCustomerId = crmCustomerId;
    await wecomCustomerRepo.save(wecomCustomer);

    // 同步：更新CRM客户的企微USID
    crmCustomer.wecomExternalUserid = wecomCustomer.externalUserId;
    await custRepo.save(crmCustomer);

    log.info(`[H5 App] Bound wecom customer ${wecomCustomerId} to CRM customer ${crmCustomerId}`);

    res.json({ success: true, message: '绑定成功' });
  } catch (error: any) {
    log.error('[H5 App] bind-crm error:', error.message);
    res.status(500).json({ success: false, message: '绑定失败' });
  }
});

// ==================== 话术分类 ====================

/**
 * GET /h5/app/script-categories
 * 获取话术分类列表
 */
router.get('/script-categories', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const { WecomScriptCategory } = await import('../../entities/WecomScriptCategory');
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);
    const categories = await catRepo.find({
      where: { tenantId: tenantId as any, isEnabled: true },
      order: { sortOrder: 'ASC', createdAt: 'ASC' }
    });

    res.json({
      success: true,
      data: categories.map(c => ({
        id: c.id,
        name: c.name,
        color: c.color || '',
        scope: c.scope || 'public'
      }))
    });
  } catch (error: any) {
    log.error('[H5 App] script-categories error:', error.message);
    res.status(500).json({ success: false, message: '获取话术分类失败' });
  }
});

// ==================== 话术列表 ====================

/**
 * GET /h5/app/scripts
 * 获取话术列表
 */
router.get('/scripts', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const { WecomScript } = await import('../../entities/WecomScript');
    const { WecomScriptCategory } = await import('../../entities/WecomScriptCategory');
    const scriptRepo = AppDataSource.getRepository(WecomScript);
    const catRepo = AppDataSource.getRepository(WecomScriptCategory);

    const scripts = await scriptRepo.find({
      where: { tenantId: tenantId as any, isEnabled: true },
      order: { sortOrder: 'ASC', createdAt: 'DESC' }
    });

    // Load category names
    const catIds = [...new Set(scripts.map(s => s.categoryId).filter(Boolean))];
    const catMap: Record<number, string> = {};
    if (catIds.length > 0) {
      const cats = await catRepo.findByIds(catIds);
      cats.forEach(c => { catMap[c.id] = c.name; });
    }

    res.json({
      success: true,
      data: scripts.map(s => ({
        id: s.id,
        title: s.title || '',
        content: s.content,
        shortcut: s.shortcut || '',
        categoryId: s.categoryId,
        categoryName: catMap[s.categoryId] || '',
        useCount: s.useCount || 0,
        scope: s.scope || 'public',
        updatedAt: s.updatedAt ? new Date(s.updatedAt).toLocaleDateString('zh-CN') : ''
      }))
    });
  } catch (error: any) {
    log.error('[H5 App] scripts error:', error.message);
    res.status(500).json({ success: false, message: '获取话术列表失败' });
  }
});

// ==================== 个人信息 ====================

/**
 * GET /h5/app/profile
 * 获取当前用户详细信息
 */
router.get('/profile', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId, wecomUserId } = getH5Context(req);
    if (!tenantId || !userId) return res.json({ success: true, data: null });

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId } });
    if (!user) return res.json({ success: true, data: null });

    // 我的企微客户总数
    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const myCustomerCount = await wecomCustomerRepo.count({
      where: { tenantId, followUserId: wecomUserId, status: 'normal' }
    });

    // 查找所属部门
    let departmentName = '未分配';
    try {
      const { Department } = await import('../../entities/Department');
      const deptRepo = AppDataSource.getRepository(Department);
      if (user.departmentId) {
        const dept = await deptRepo.findOne({ where: { id: user.departmentId } });
        if (dept) departmentName = dept.name;
      }
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name || user.realName || user.username,
        username: user.username,
        avatar: user.avatar || '',
        role: user.role || '',
        phone: user.phone || '',
        email: user.email || '',
        department: departmentName,
        wecomUserId: wecomUserId || '',
        customerCount: myCustomerCount,
        createdAt: user.createdAt ? new Date(user.createdAt).toLocaleDateString('zh-CN') : '',
        lastLoginAt: user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString('zh-CN') : ''
      }
    });
  } catch (error: any) {
    log.error('[H5 App] profile error:', error.message);
    res.status(500).json({ success: false, message: '获取个人信息失败' });
  }
});

// ==================== 最近动态(增强版) ====================

/**
 * GET /h5/app/activities
 * 获取企微+CRM关联动态（删客、加客、绑定CRM、状态变更等）
 */
router.get('/activities', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const page = Math.max(1, parseInt(String(req.query.page)) || 1);
    const pageSize = Math.min(30, Math.max(1, parseInt(String(req.query.pageSize)) || 20));
    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const activities: any[] = [];

    // 1. 最近新增客户
    const newCustomers = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .orderBy('c.addTime', 'DESC')
      .take(10)
      .getMany();

    newCustomers.forEach(c => {
      activities.push({
        type: 'new_customer',
        icon: 'friends-o',
        color: '#07c160',
        title: '新增客户',
        content: `${c.name || '未知客户'} 添加了你为好友`,
        time: c.addTime ? new Date(c.addTime).toISOString() : ''
      });
    });

    // 2. 最近删除的客户
    const deletedCustomers = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'deleted' })
      .andWhere('c.deleteTime IS NOT NULL')
      .orderBy('c.deleteTime', 'DESC')
      .take(10)
      .getMany();

    deletedCustomers.forEach(c => {
      activities.push({
        type: 'customer_deleted',
        icon: 'close',
        color: '#ee0a24',
        title: '客户流失',
        content: `${c.name || '未知客户'} 已删除你`,
        time: c.deleteTime ? new Date(c.deleteTime).toISOString() : ''
      });
    });

    // 3. 已绑定CRM的客户
    const boundCustomers = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.crmCustomerId IS NOT NULL')
      .orderBy('c.updatedAt', 'DESC')
      .take(5)
      .getMany();

    boundCustomers.forEach(c => {
      activities.push({
        type: 'crm_bindind',
        icon: 'link-o',
        color: '#1989fa',
        title: 'CRM关联',
        content: `${c.name || '未知客户'} 已关联CRM客户档案`,
        time: c.updatedAt ? new Date(c.updatedAt).toISOString() : ''
      });
    });

    // 按时间排序
    activities.sort((a, b) => {
      if (!a.time) return 1;
      if (!b.time) return -1;
      return new Date(b.time).getTime() - new Date(a.time).getTime();
    });

    // 分页
    const paged = activities.slice((page - 1) * pageSize, page * pageSize);

    // 格式化时间
    paged.forEach(a => {
      if (a.time) {
        const d = new Date(a.time);
        const now = new Date();
        const diff = now.getTime() - d.getTime();
        if (diff < 60000) a.timeText = '刚刚';
        else if (diff < 3600000) a.timeText = `${Math.floor(diff / 60000)}分钟前`;
        else if (diff < 86400000) a.timeText = `${Math.floor(diff / 3600000)}小时前`;
        else if (diff < 604800000) a.timeText = `${Math.floor(diff / 86400000)}天前`;
        else a.timeText = d.toLocaleDateString('zh-CN');
      }
    });

    res.json({ success: true, data: paged, total: activities.length });
  } catch (error: any) {
    log.error('[H5 App] activities error:', error.message);
    res.status(500).json({ success: false, message: '获取动态失败' });
  }
});

// ==================== 增强版统计 ====================

/**
 * GET /h5/app/stats-detail
 * 提供更详细的多维度统计数据（客户分布、趋势、标签分析等）
 */
router.get('/stats-detail', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: {} });

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);

    // 1. 客户总览
    const totalCustomers = await wecomCustomerRepo.count({
      where: { tenantId, followUserId: wecomUserId, status: 'normal' }
    });
    const deletedCustomers = await wecomCustomerRepo.count({
      where: { tenantId, followUserId: wecomUserId, status: 'deleted' }
    });
    const boundCrmCount = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .andWhere('c.crmCustomerId IS NOT NULL')
      .getCount();

    // 2. 性别分布
    const genderDist = await wecomCustomerRepo
      .createQueryBuilder('c')
      .select('c.gender', 'gender')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .groupBy('c.gender')
      .getRawMany();

    const genderMap: Record<number, string> = { 0: '未知', 1: '男', 2: '女' };
    const genderData = genderDist.map(g => ({
      label: genderMap[g.gender] || '未知',
      value: parseInt(g.count)
    }));

    // 3. 添加方式分布
    const addWayDist = await wecomCustomerRepo
      .createQueryBuilder('c')
      .select('c.addWay', 'addWay')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .groupBy('c.addWay')
      .getRawMany();

    const addWayMap: Record<number, string> = {
      1: '扫描二维码', 2: '搜索手机号', 3: '名片分享', 4: '群聊',
      5: '手机通讯录', 6: '微信联系人', 201: '内部共享', 202: '管理员分配'
    };
    const addWayData = addWayDist.map(a => ({
      label: addWayMap[a.addWay] || '其他',
      value: parseInt(a.count)
    }));

    // 4. 近7天新增趋势
    const trends: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setDate(dEnd.getDate() + 1);

      const count = await wecomCustomerRepo
        .createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
        .andWhere('c.addTime >= :start', { start: d })
        .andWhere('c.addTime < :end', { end: dEnd })
        .andWhere('c.status = :status', { status: 'normal' })
        .getCount();

      trends.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count
      });
    }

    // 5. 近7天流失趋势
    const lossTrends: { date: string; count: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      d.setHours(0, 0, 0, 0);
      const dEnd = new Date(d);
      dEnd.setDate(dEnd.getDate() + 1);

      const count = await wecomCustomerRepo
        .createQueryBuilder('c')
        .where('c.tenantId = :tenantId', { tenantId })
        .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
        .andWhere('c.deleteTime >= :start', { start: d })
        .andWhere('c.deleteTime < :end', { end: dEnd })
        .andWhere('c.status = :status', { status: 'deleted' })
        .getCount();

      lossTrends.push({
        date: `${d.getMonth() + 1}/${d.getDate()}`,
        count
      });
    }

    // 6. 客户类型分布
    const typeDist = await wecomCustomerRepo
      .createQueryBuilder('c')
      .select('c.type', 'type')
      .addSelect('COUNT(c.id)', 'count')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .groupBy('c.type')
      .getRawMany();

    const typeMap: Record<number, string> = { 1: '微信用户', 2: '企微用户' };
    const typeData = typeDist.map(t => ({
      label: typeMap[t.type] || '未知',
      value: parseInt(t.count)
    }));

    // 7. 标签Top10
    const allCustomers = await wecomCustomerRepo
      .createQueryBuilder('c')
      .select('c.tagNames')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .andWhere('c.tagNames IS NOT NULL')
      .getRawMany();

    const tagCount: Record<string, number> = {};
    allCustomers.forEach(c => {
      try {
        const tags = JSON.parse(c.c_tag_names || c.tagNames || '[]');
        if (Array.isArray(tags)) {
          tags.forEach((t: string) => { tagCount[t] = (tagCount[t] || 0) + 1; });
        }
      } catch { /* ignore */ }
    });

    const tagData = Object.entries(tagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([label, value]) => ({ label, value }));

    // 8. 成交客户数
    const dealtCount = await wecomCustomerRepo.count({
      where: { tenantId, followUserId: wecomUserId, status: 'normal', isDealt: true }
    });

    res.json({
      success: true,
      data: {
        overview: { totalCustomers, deletedCustomers, boundCrmCount, dealtCount },
        genderData,
        addWayData,
        typeData,
        tagData,
        trends,
        lossTrends
      }
    });
  } catch (error: any) {
    log.error('[H5 App] stats-detail error:', error.message);
    res.status(500).json({ success: false, message: '获取统计详情失败' });
  }
});

// ==================== 消息通知 ====================

/**
 * GET /h5/app/notifications
 * 获取消息通知列表（客户变动、系统通知等）
 */
router.get('/notifications', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, wecomUserId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: [] });

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const notifications: any[] = [];

    // 今日新增客户通知
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todayNew = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.addTime >= :today', { today })
      .andWhere('c.status = :status', { status: 'normal' })
      .getCount();

    if (todayNew > 0) {
      notifications.push({
        id: 'today_new',
        type: 'system',
        title: '今日新增客户',
        content: `今天有 ${todayNew} 位新客户添加了你`,
        time: new Date().toISOString(),
        read: false
      });
    }

    // 最近流失客户通知
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recentDeleted = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.deleteTime >= :weekAgo', { weekAgo })
      .andWhere('c.status = :status', { status: 'deleted' })
      .getCount();

    if (recentDeleted > 0) {
      notifications.push({
        id: 'week_lost',
        type: 'warning',
        title: '客户流失预警',
        content: `近7天有 ${recentDeleted} 位客户流失，请注意维护客户关系`,
        time: new Date().toISOString(),
        read: false
      });
    }

    // 未关联CRM客户
    const unboundCount = await wecomCustomerRepo
      .createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .andWhere('c.followUserId = :wecomUserId', { wecomUserId })
      .andWhere('c.status = :status', { status: 'normal' })
      .andWhere('c.crmCustomerId IS NULL')
      .getCount();

    if (unboundCount > 0) {
      notifications.push({
        id: 'unbound_crm',
        type: 'info',
        title: 'CRM关联提醒',
        content: `您有 ${unboundCount} 位企微客户尚未关联CRM客户，建议尽早完善`,
        time: new Date().toISOString(),
        read: false
      });
    }

    // 系统通知
    notifications.push({
      id: 'sys_welcome',
      type: 'system',
      title: '欢迎使用云客CRM',
      content: '企微工作台H5版已上线，您可以随时通过企业微信访问客户数据。',
      time: new Date(Date.now() - 86400000).toISOString(),
      read: true
    });

    res.json({ success: true, data: notifications });
  } catch (error: any) {
    log.error('[H5 App] notifications error:', error.message);
    res.status(500).json({ success: false, message: '获取通知失败' });
  }
});

// ==================== 小程序资料收集 ====================

/**
 * GET /h5/app/mp-phone-quota
 * 查询手机号获取额度
 */
router.get('/mp-phone-quota', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: { total: 0, used: 0, remaining: 0, packages: [] } });

    const { TenantSettings } = await import('../../entities/TenantSettings');
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    let total = 0, used = 0;
    if (quotaSetting) {
      const q = typeof quotaSetting.settingValue === 'string'
        ? JSON.parse(quotaSetting.settingValue)
        : quotaSetting.settingValue;
      total = q.total || 0;
      used = q.used || 0;
    }

    // 获取可购买套餐
    let packages: any[] = [];
    try {
      const { SystemConfig } = await import('../../entities/SystemConfig');
      const configRepo = AppDataSource.getRepository(SystemConfig);
      const pricingConfig = await configRepo.findOne({
        where: { configKey: 'wecom_pricing_config', configGroup: 'wecom' }
      });
      if (pricingConfig) {
        const config = typeof pricingConfig.configValue === 'string'
          ? JSON.parse(pricingConfig.configValue) : pricingConfig.configValue;
        if (config.mpPhonePackages) packages = config.mpPhonePackages;
      }
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: { total, used, remaining: Math.max(0, total - used), packages }
    });
  } catch (error: any) {
    log.error('[H5 App] mp-phone-quota error:', error.message);
    res.json({ success: true, data: { total: 0, used: 0, remaining: 0, packages: [] } });
  }
});

/**
 * POST /h5/app/mp-phone-quota-purchase
 * 购买手机号额度
 */
router.post('/mp-phone-quota-purchase', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId } = getH5Context(req);
    const { packageId, packageName, quota, price } = req.body;

    if (!tenantId || !quota || quota <= 0) {
      return res.status(400).json({ success: false, message: '参数无效' });
    }

    const { TenantSettings } = await import('../../entities/TenantSettings');
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    const currentQuota = quotaSetting
      ? (typeof quotaSetting.settingValue === 'string' ? JSON.parse(quotaSetting.settingValue) : quotaSetting.settingValue)
      : { total: 0, used: 0, purchases: [] as any[] };

    currentQuota.total = (currentQuota.total || 0) + quota;
    currentQuota.purchases = currentQuota.purchases || [];
    currentQuota.purchases.push({
      packageId, packageName: packageName || `${quota}次额度包`,
      quota, price: price || 0, purchaseTime: new Date().toISOString()
    });

    if (quotaSetting) {
      quotaSetting.settingValue = typeof quotaSetting.settingValue === 'string'
        ? JSON.stringify(currentQuota) : currentQuota;
      await settingsRepo.save(quotaSetting);
    } else {
      await settingsRepo.save(settingsRepo.create({
        tenantId, settingKey: 'mp_phone_quota', settingType: 'json',
        settingValue: JSON.stringify(currentQuota), settingGroup: 'miniprogram'
      } as any));
    }

    log.info(`[H5 App] mp-phone-quota purchase: tenant=${tenantId}, quota=${quota}`);
    res.json({
      success: true,
      message: `成功购买${quota}次手机号获取额度`,
      data: { total: currentQuota.total, used: currentQuota.used || 0, remaining: currentQuota.total - (currentQuota.used || 0) }
    });
  } catch (error: any) {
    log.error('[H5 App] mp-phone-quota-purchase error:', error.message);
    res.status(500).json({ success: false, message: '购买失败' });
  }
});

/**
 * POST /h5/app/mp-generate-card
 * 生成小程序卡片
 */
router.post('/mp-generate-card', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, ts } = req.body;
    if (!tenantId || !memberId || !ts) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const crypto = await import('crypto');
    const secret = process.env.MP_FORM_SECRET || 'mp_default_secret_key_2026';
    const sign = crypto.createHash('md5').update(tenantId + memberId + ts + secret).digest('hex');

    let appId = process.env.MP_APP_ID || 'wxXXXXXXXXXXXX';
    let cardTitle = '请填写您的个人资料';
    let cardCoverUrl = '';

    try {
      const { TenantSettings } = await import('../../entities/TenantSettings');
      const settingsRepo = AppDataSource.getRepository(TenantSettings);
      const mpSetting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'miniprogram_config' } });
      if (mpSetting) {
        const config = typeof mpSetting.settingValue === 'string' ? JSON.parse(mpSetting.settingValue) : mpSetting.settingValue;
        if (config.cardTitle) cardTitle = config.cardTitle;
        if (config.cardCoverUrl) cardCoverUrl = config.cardCoverUrl;
        if (config.appId) appId = config.appId;
      }
    } catch { /* ignore */ }

    res.json({ success: true, data: { sign, appId, cardTitle, cardCoverUrl } });
  } catch (error: any) {
    log.error('[H5 App] mp-generate-card error:', error.message);
    res.status(500).json({ success: false, message: '生成卡片失败' });
  }
});

/**
 * POST /h5/app/mp-log-send
 * 记录发送日志
 */
router.post('/mp-log-send', authenticateSidebarToken, async (req: Request, res: Response) => {
  const { tenantId } = getH5Context(req);
  log.info(`[H5 App] mp-log-send: tenant=${tenantId}`);
  res.json({ success: true });
});

/**
 * GET /h5/app/mp-collect-stats
 * 收集统计
 */
router.get('/mp-collect-stats', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: { filled: 0 } });

    const { Customer } = await import('../../entities/Customer');
    const customerRepo = AppDataSource.getRepository(Customer);
    const totalFilled = await customerRepo.count({
      where: { tenantId, salesPersonId: userId, source: 'miniprogram' as any }
    });

    res.json({ success: true, data: { filled: totalFilled } });
  } catch {
    res.json({ success: true, data: { filled: 0 } });
  }
});

/**
 * GET /h5/app/mp-collect-records
 * 收集记录列表（带脱敏、分页）
 */
router.get('/mp-collect-records', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, userId } = getH5Context(req);
    if (!tenantId) return res.json({ success: true, data: { list: [], total: 0 } });

    const { page = '1', pageSize = '3' } = req.query as any;
    const take = Math.min(parseInt(pageSize, 10) || 3, 20);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const { Customer } = await import('../../entities/Customer');
    const customerRepo = AppDataSource.getRepository(Customer);

    const [list, total] = await customerRepo.findAndCount({
      where: { tenantId, salesPersonId: userId, source: 'miniprogram' as any },
      order: { createdAt: 'DESC' },
      take,
      skip
    });

    const maskedList = list.map((c: any) => ({
      id: c.id,
      name: c.name ? (c.name[0] + '**') : '-',
      phone: c.phone ? c.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
      gender: c.gender || '',
      province: c.province || '',
      city: c.city || '',
      district: c.district || '',
      street: c.street || '',
      detailAddress: c.detailAddress ? (c.detailAddress.length > 6 ? c.detailAddress.substring(0, 6) + '***' : c.detailAddress) : '',
      email: c.email ? c.email.replace(/(.{2}).*(@.*)/, '$1***$2') : '',
      wechat: c.wechat ? (c.wechat.substring(0, 3) + '***') : '',
      age: c.age || '',
      birthday: c.birthday || '',
      remark: c.remark ? (c.remark.length > 20 ? c.remark.substring(0, 20) + '...' : c.remark) : '',
      createdAt: c.createdAt
    }));

    res.json({ success: true, data: { list: maskedList, total, page: parseInt(page, 10), pageSize: take } });
  } catch (error: any) {
    log.error('[H5 App] mp-collect-records error:', error.message);
    res.json({ success: true, data: { list: [], total: 0 } });
  }
});

export default router;
