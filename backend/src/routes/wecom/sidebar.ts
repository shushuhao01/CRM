/**
 * 侧边栏路由
 * 包含：侧边栏应用管理(CRUD) + 侧边栏H5 API(绑定/验证/客户详情/JS-SDK)
 *
 * 安全要点：
 * - 应用管理接口需 authenticateToken + requireAdmin
 * - H5 bind-account 接口有输入校验
 * - customer-detail 使用 authenticateSidebarToken 专属鉴权
 * - js-sdk-config 需基本鉴权防止滥用
 */
import { Router, Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import { authenticateToken, requireAdmin, authenticateSidebarToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import { WecomCustomer } from '../../entities/WecomCustomer';
import { TenantSettings } from '../../entities/TenantSettings';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { safeJsonParse } from './wecomHelpers';

// ==================== 类型定义 ====================

/** 侧边栏应用配置 */
interface SidebarApp {
  id: string;
  name: string;
  url: string;
  description?: string;
  isEnabled: boolean;
  createdAt: string;
}

const router = Router();
const SIDEBAR_APPS_KEY = 'wecom_sidebar_apps';

// ==================== P1安全加固: 速率限制 ====================

/** 侧边栏认证接口限流: 每IP每15分钟最多10次 */
const sidebarAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请稍后再试' },
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
});

/** JS-SDK配置接口限流: 每IP每分钟20次 */
const jsSdkConfigLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'JS-SDK配置请求过于频繁' }
});

// ==================== P1安全加固: Referer白名单 ====================

/** 验证JS-SDK请求来源 */
function validateJsSdkReferer(req: Request, res: Response, next: NextFunction) {
  const referer = req.headers.referer || req.headers.origin || '';
  const allowedDomainsEnv = process.env.SIDEBAR_ALLOWED_DOMAINS || '';
  const allowedDomains = allowedDomainsEnv
    ? allowedDomainsEnv.split(',').map(d => d.trim()).filter(Boolean)
    : [];

  // 开发环境默认放行 localhost
  if (process.env.NODE_ENV !== 'production') {
    allowedDomains.push('localhost', '127.0.0.1');
  }

  // 如果未配置白名单，放行所有请求（兼容初始部署）
  if (allowedDomains.length === 0) {
    return next();
  }

  const isAllowed = allowedDomains.some(domain => referer.includes(domain));
  if (!isAllowed && referer) {
    log.warn(`[Wecom Sidebar] JS-SDK config blocked referer: ${referer}`);
    return res.status(403).json({ success: false, message: '请求来源不被允许' });
  }

  next();
}

// ==================== 侧边栏应用管理 ====================

/**
 * 获取侧边栏应用列表
 * @returns { success: boolean, data: SidebarApp[] }
 */
router.get('/sidebar-apps', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: [] });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SIDEBAR_APPS_KEY } });
    const apps: SidebarApp[] = setting ? safeJsonParse(typeof setting.getValue === 'function' ? JSON.stringify(setting.getValue()) : null, []) : [];
    res.json({ success: true, data: apps });
  } catch (error: any) {
    log.error('[Wecom] Get sidebar apps error:', error.message);
    res.status(500).json({ success: false, message: '获取侧边栏应用失败' });
  }
});

/**
 * 添加侧边栏应用
 * @body { name: string, url: string, description?: string, isEnabled?: boolean }
 */
router.post('/sidebar-apps', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, url, description, isEnabled } = req.body;
    if (!name || !url) return res.status(400).json({ success: false, message: '应用名称和地址为必填项' });

    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '无法获取租户信息' });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SIDEBAR_APPS_KEY } });

    let apps: SidebarApp[] = [];
    if (setting) { apps = setting.getValue() || []; }
    else { setting = settingsRepo.create({ id: uuidv4(), tenantId, settingKey: SIDEBAR_APPS_KEY, settingType: 'json', description: '企微侧边栏应用配置' }); }

    const newApp: SidebarApp = { id: uuidv4(), name, url, description: description || '', isEnabled: isEnabled !== false, createdAt: new Date().toISOString() };
    apps.push(newApp);

    setting.settingType = 'json';
    setting.setValue(apps);
    await settingsRepo.save(setting);
    res.json({ success: true, data: newApp, message: '添加成功' });
  } catch (error: any) {
    log.error('[Wecom] Add sidebar app error:', error.message);
    res.status(500).json({ success: false, message: '添加侧边栏应用失败' });
  }
});

/**
 * 批量更新侧边栏应用（整体覆盖）
 * @body { apps: SidebarApp[] }
 */
router.put('/sidebar-apps', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { apps } = req.body;
    if (!Array.isArray(apps)) return res.status(400).json({ success: false, message: '参数格式错误' });

    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '无法获取租户信息' });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SIDEBAR_APPS_KEY } });
    if (!setting) { setting = settingsRepo.create({ id: uuidv4(), tenantId, settingKey: SIDEBAR_APPS_KEY, settingType: 'json', description: '企微侧边栏应用配置' }); }

    setting.settingType = 'json';
    setting.setValue(apps);
    await settingsRepo.save(setting);
    res.json({ success: true, message: '保存成功' });
  } catch (error: any) {
    log.error('[Wecom] Save sidebar apps error:', error.message);
    res.status(500).json({ success: false, message: '保存侧边栏应用失败' });
  }
});

/**
 * 删除侧边栏应用
 * @param id 应用ID (UUID字符串)
 */
router.delete('/sidebar-apps/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const appId = req.params.id;
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '无法获取租户信息' });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId, settingKey: SIDEBAR_APPS_KEY } });
    if (!setting) return res.status(404).json({ success: false, message: '应用不存在' });

    const apps: any[] = setting.getValue() || [];
    const idx = apps.findIndex((a: any) => a.id === appId);
    if (idx === -1) return res.status(404).json({ success: false, message: '应用不存在' });

    apps.splice(idx, 1);
    setting.setValue(apps);
    await settingsRepo.save(setting);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete sidebar app error:', error.message);
    res.status(500).json({ success: false, message: '删除侧边栏应用失败' });
  }
});

// ==================== 内置应用配置 ====================

/**
 * 保存内置应用启用/禁用配置
 */
router.put('/sidebar-builtin-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '无法获取租户信息' });
    const { builtinApps } = req.body;
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let setting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'wecom_sidebar_builtin_config' } });
    if (!setting) {
      setting = settingsRepo.create({ id: uuidv4(), tenantId, settingKey: 'wecom_sidebar_builtin_config', settingType: 'json', description: '内置侧边栏应用配置' });
    }
    setting.settingType = 'json';
    setting.setValue(builtinApps);
    await settingsRepo.save(setting);
    res.json({ success: true, message: '已保存' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * 获取内置应用配置
 */
router.get('/sidebar-builtin-config', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: [] });
    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId, settingKey: 'wecom_sidebar_builtin_config' } });
    res.json({ success: true, data: setting ? setting.getValue() : [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// ==================== 侧边栏 H5 API ====================

/**
 * 侧边栏H5 - 绑定CRM账号（登录）
 * @body { wecomUserId: string, corpId: string, username: string, password: string }
 * @returns { success, data: { token, user, binding }, message }
 */
router.post('/sidebar/bind-account', sidebarAuthLimiter, async (req: Request, res: Response) => {
  try {
    const { wecomUserId, corpId, username, password } = req.body;
    if (!wecomUserId || !corpId || !username || !password) return res.status(400).json({ success: false, message: '参数不完整' });

    // 输入长度校验，防止超长密码导致bcrypt处理耗时过长
    if (username.length > 100 || password.length > 128) {
      return res.status(400).json({ success: false, message: '用户名或密码长度超出限制' });
    }

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
    if (!config) return res.status(400).json({ success: false, message: '未找到匹配的企微配置' });

    const tenantId = config.tenantId;
    if (!tenantId) {
      log.warn(`[Wecom Sidebar] bind-account: config ${config.id} (corpId=${corpId}) 缺少tenantId，拒绝绑定`);
      return res.status(400).json({ success: false, message: '企微配置数据不完整，请联系管理员' });
    }

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username, tenantId, status: 'active' } });
    if (!user) return res.status(401).json({ success: false, message: '用户名或密码错误' });

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ success: false, message: '用户名或密码错误' });

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    let binding = await bindingRepo.findOne({ where: { wecomUserId, corpId, wecomConfigId: config.id } });
    if (binding) { binding.crmUserId = user.id; binding.crmUserName = user.name || user.username; binding.isEnabled = true; }
    else { binding = bindingRepo.create({ tenantId, wecomConfigId: config.id, corpId, wecomUserId, crmUserId: user.id, crmUserName: user.name || user.username, bindOperator: 'sidebar', isEnabled: true }); }
    await bindingRepo.save(binding);

    const { JwtConfig } = await import('../../config/jwt');
    const token = JwtConfig.generateAccessToken({ type: 'sidebar', userId: user.id, username: user.username, role: user.role, wecomUserId, crmUserId: user.id, crmUserName: user.name || user.username, tenantId, corpId } as any);

    res.json({ success: true, data: { token, user: { id: user.id, name: user.name, username: user.username, avatar: user.avatar }, binding: { id: binding.id, wecomUserId, crmUserId: user.id, crmUserName: user.name || user.username } }, message: '绑定成功' });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Bind account error:', error.message);
    res.status(500).json({ success: false, message: '账号绑定失败' });
  }
});

router.get('/sidebar/verify-binding', sidebarAuthLimiter, async (req: Request, res: Response) => {
  try {
    const { wecomUserId, corpId } = req.query;
    if (!wecomUserId || !corpId) return res.status(400).json({ success: false, message: '参数不完整' });

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { wecomUserId: String(wecomUserId), corpId: String(corpId), isEnabled: true } });
    if (!binding) return res.json({ success: true, data: { bound: false } });

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: binding.crmUserId, status: 'active' } });
    if (!user) return res.json({ success: true, data: { bound: false, message: 'CRM用户已不存在或已禁用' } });

    const { JwtConfig } = await import('../../config/jwt');
    const token = JwtConfig.generateAccessToken({ type: 'sidebar', userId: user.id, username: user.username, role: user.role, wecomUserId: String(wecomUserId), crmUserId: user.id, crmUserName: user.name || user.username, tenantId: user.tenantId || '', corpId: String(corpId) } as any);

    res.json({ success: true, data: { bound: true, token, user: { id: user.id, name: user.name, username: user.username, avatar: user.avatar }, binding: { id: binding.id, wecomUserId: binding.wecomUserId, crmUserId: binding.crmUserId, crmUserName: binding.crmUserName } } });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Verify binding error:', error.message);
    res.status(500).json({ success: false, message: '验证绑定失败' });
  }
});

router.get('/sidebar/customer-detail', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { externalUserId, orderPage } = req.query;
    if (!externalUserId) return res.status(400).json({ success: false, message: '缺少externalUserId' });

    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;
    const currentOrderPage = Math.max(1, parseInt(String(orderPage || '1')) || 1);
    const orderPageSize = 3;

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const wecomCustomer = await wecomCustomerRepo.findOne({ where: { externalUserId: String(externalUserId), ...(tenantId ? { tenantId } : {}) } });

    if (!wecomCustomer) {
      return res.json({ success: true, data: { found: false, wecomCustomer: null, crmCustomer: null, orders: [], orderTotal: 0, orderPage: 1, orderPageSize, stats: { orderCount: 0, totalAmount: 0, lastOrderTime: null }, shippingAddress: null, afterSales: [], bindingInfo: null } });
    }

    let crmCustomer: any = null;
    let orders: any[] = [];
    let orderTotal = 0;
    let stats = { orderCount: 0, totalAmount: 0, lastOrderTime: null as string | null };
    let shippingAddress: any = null;
    let afterSales: any[] = [];
    let bindingInfo: any = null;

    if (wecomCustomer.crmCustomerId) {
      const { Customer } = await import('../../entities/Customer');
      const { Order } = await import('../../entities/Order');
      const customerRepo = AppDataSource.getRepository(Customer);
      const orderRepo = AppDataSource.getRepository(Order);

      crmCustomer = await customerRepo.findOne({ where: { id: wecomCustomer.crmCustomerId } });
      if (crmCustomer) {
        // 分页查询订单
        const [orderRows, total] = await orderRepo.findAndCount({
          where: { customerId: crmCustomer.id },
          order: { createdAt: 'DESC' },
          skip: (currentOrderPage - 1) * orderPageSize,
          take: orderPageSize,
          select: ['id', 'orderNumber', 'totalAmount', 'finalAmount', 'status', 'paymentStatus', 'products', 'createdAt', 'customerName']
        });
        orders = orderRows;
        orderTotal = total;

        // 统计：直接从订单表聚合确保准确
        const statsResult = await orderRepo
          .createQueryBuilder('o')
          .select('COUNT(o.id)', 'orderCount')
          .addSelect('COALESCE(SUM(COALESCE(o.finalAmount, o.totalAmount)), 0)', 'totalAmount')
          .addSelect('MAX(o.createdAt)', 'lastOrderTime')
          .where('o.customerId = :customerId', { customerId: crmCustomer.id })
          .getRawOne();

        stats = {
          orderCount: parseInt(statsResult?.orderCount || '0'),
          totalAmount: parseFloat(statsResult?.totalAmount || '0'),
          lastOrderTime: statsResult?.lastOrderTime ? new Date(statsResult.lastOrderTime).toISOString() : null
        };

        // Phase 7: 查询收货地址(脱敏)
        if (crmCustomer.phone || crmCustomer.address) {
          const desensPhone = crmCustomer.phone && crmCustomer.phone.length >= 7
            ? crmCustomer.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
            : (crmCustomer.phone ? '****' : null);
          const desensAddr = crmCustomer.address
            ? (() => {
                const parts = (crmCustomer.address as string).split('');
                return parts.length > 6 ? parts.slice(0, 6).join('') + '***' : crmCustomer.address;
              })()
            : null;
          shippingAddress = {
            name: crmCustomer.name,
            phone: desensPhone,
            address: desensAddr
          };
        }

        // Phase 7: 查询售后记录
        try {
          const { AfterSalesService } = await import('../../entities/AfterSalesService');
          const afterSalesRepo = AppDataSource.getRepository(AfterSalesService);
          const records = await afterSalesRepo.find({
            where: { customerId: crmCustomer.id } as any,
            order: { createdAt: 'DESC' },
            take: 3
          });
          afterSales = records.map((r: any) => ({
            id: r.id,
            type: r.serviceType || r.type,
            status: r.status,
            reason: r.reason || r.description,
            amount: Number(r.price || r.amount || 0),
            createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : null
          }));
        } catch (e: any) {
          log.warn('[Wecom Sidebar] Query after-sales error (non-critical):', e.message);
        }

        // Phase 7: 绑定信息
        if (sidebarUser) {
          const { Tenant } = await import('../../entities/Tenant');
          let tenantCode = tenantId || '';
          try {
            const tenantRepo = AppDataSource.getRepository(Tenant);
            const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
            tenantCode = tenant?.code || tenant?.id || tenantId || '';
          } catch (_e) { /* ignore */ }
          const binding = await AppDataSource.getRepository(WecomUserBinding).findOne({
            where: { crmUserId: sidebarUser.crmUserId || sidebarUser.userId }
          });
          bindingInfo = {
            crmUserName: sidebarUser.crmUserName || sidebarUser.username || '',
            tenantCode,
            boundAt: binding?.createdAt ? new Date(binding.createdAt).toISOString() : null
          };
        }
      }
    }

    const desensitizedPhone = crmCustomer && crmCustomer.phone && crmCustomer.phone.length >= 7
      ? crmCustomer.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
      : (crmCustomer?.phone ? '****' : null);

    // 添加方式映射
    const addWayMap: Record<number, string> = {
      1: '扫描二维码', 2: '搜索手机号', 3: '名片分享', 4: '群聊', 5: '手机通讯录',
      6: '微信联系人', 7: '来自微信的添加好友申请', 8: '安装第三方应用时自动添加的客服人员',
      9: '搜索邮箱', 10: '视频号添加', 11: '通过日程参与人添加',
      12: '通过会议参与人添加', 13: '通过药方添加', 14: '通过智慧硬件专属客服添加',
      201: '内部成员共享', 202: '管理员/负责人分配'
    };

    res.json({
      success: true,
      data: {
        found: true,
        wecomCustomer: {
          id: wecomCustomer.id, name: wecomCustomer.name, avatar: wecomCustomer.avatar,
          type: wecomCustomer.type, gender: wecomCustomer.gender, corpName: wecomCustomer.corpName,
          position: wecomCustomer.position, followUserName: wecomCustomer.followUserName,
          remark: wecomCustomer.remark,
          addTime: wecomCustomer.addTime ? new Date(wecomCustomer.addTime).toISOString() : null,
          addWay: wecomCustomer.addWay,
          addWayText: addWayMap[wecomCustomer.addWay] || (wecomCustomer.addWay ? `未知(${wecomCustomer.addWay})` : '未知'),
          status: wecomCustomer.status, crmCustomerId: wecomCustomer.crmCustomerId,
          externalUserId: wecomCustomer.externalUserId
        },
        crmCustomer: crmCustomer ? {
          id: crmCustomer.id, name: crmCustomer.name,
          phone: desensitizedPhone,
          gender: crmCustomer.gender,
          age: crmCustomer.age,
          height: crmCustomer.height ? Number(crmCustomer.height) : null,
          weight: crmCustomer.weight ? Number(crmCustomer.weight) : null,
          address: crmCustomer.address || [crmCustomer.province, crmCustomer.city, crmCustomer.district, crmCustomer.detailAddress].filter(Boolean).join('') || null,
          medicalHistory: crmCustomer.medicalHistory || null,
          tags: crmCustomer.tags || [],
          salesPersonName: crmCustomer.salesPersonName,
          wecomExternalUserid: crmCustomer.wecomExternalUserid || wecomCustomer.externalUserId
        } : null,
        orders: orders.map(o => ({
          id: o.id, orderNumber: o.orderNumber,
          totalAmount: Number(o.totalAmount), finalAmount: Number(o.finalAmount),
          status: o.status, paymentStatus: o.paymentStatus,
          products: safeJsonParse(typeof o.products === 'string' ? o.products : null, o.products || []),
          createdAt: o.createdAt
        })),
        orderTotal,
        orderPage: currentOrderPage,
        orderPageSize,
        shippingAddress,
        afterSales,
        stats,
        bindingInfo
      }
    });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Customer detail error:', error.message);
    res.status(500).json({ success: false, message: '获取客户详情失败' });
  }
});

// ==================== Phase 7: 侧边栏绑定管理 ====================

/**
 * 侧边栏换绑
 */
router.put('/sidebar/binding/:id/rebind', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bindingId = parseInt(req.params.id);
    if (isNaN(bindingId)) {
      return res.status(400).json({ success: false, message: '无效的绑定ID' });
    }

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { id: bindingId } });
    if (!binding) {
      return res.status(404).json({ success: false, message: '绑定记录不存在' });
    }

    // 清除当前绑定，准备重新绑定
    binding.isEnabled = false;
    await bindingRepo.save(binding);

    res.json({
      success: true,
      message: '已解除当前绑定，请重新登录侧边栏完成换绑',
      data: { bindingId: binding.id, wecomUserId: binding.wecomUserId }
    });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Rebind error:', error.message);
    res.status(500).json({ success: false, message: '换绑失败' });
  }
});

/**
 * 侧边栏解绑
 */
router.delete('/sidebar/binding/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const bindingId = parseInt(req.params.id);
    if (isNaN(bindingId)) {
      return res.status(400).json({ success: false, message: '无效的绑定ID' });
    }

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { id: bindingId } });
    if (!binding) {
      return res.status(404).json({ success: false, message: '绑定记录不存在' });
    }

    binding.isEnabled = false;
    await bindingRepo.save(binding);

    res.json({
      success: true,
      message: '解绑成功',
      data: { bindingId: binding.id }
    });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Unbind error:', error.message);
    res.status(500).json({ success: false, message: '解绑失败' });
  }
});

router.post('/sidebar/js-sdk-config', jsSdkConfigLimiter, validateJsSdkReferer, async (req: Request, res: Response) => {
  try {
    const { url, corpId } = req.body;
    if (!url || !corpId) return res.status(400).json({ success: false, message: '参数不完整' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
    if (!config) return res.status(400).json({ success: false, message: '未找到匹配的企微配置' });

    const accessToken = await WecomApiService.getAccessToken(config.corpId, config.corpSecret);
    const corpTicket = await WecomApiService.getJsSdkTicket(accessToken);
    let agentTicket = '';
    try { agentTicket = await WecomApiService.getAgentJsSdkTicket(accessToken); } catch (e: any) { log.warn('[Wecom Sidebar] Get agent ticket failed:', e.message); }

    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = uuidv4().replace(/-/g, '').substring(0, 16);
    const corpSignature = WecomApiService.generateJsSdkSignature(corpTicket, nonceStr, timestamp, url);
    let agentSignature = '';
    if (agentTicket) { agentSignature = WecomApiService.generateJsSdkSignature(agentTicket, nonceStr, timestamp, url); }

    res.json({ success: true, data: { corpId: config.corpId, agentId: config.agentId, timestamp, nonceStr, corpSignature, agentSignature } });
  } catch (error: any) {
    log.error('[Wecom Sidebar] JS-SDK config error:', error.message);
    res.status(500).json({ success: false, message: '获取JS-SDK配置失败' });
  }
});

// ==================== P1安全加固: 侧边栏Token刷新 ====================

/**
 * 侧边栏H5 - 刷新Token
 * 使用当前有效的sidebar token换取新token
 * @returns { success, data: { token }, message }
 */
router.post('/sidebar/refresh-token', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    if (!sidebarUser?.userId && !sidebarUser?.crmUserId) {
      return res.status(401).json({ success: false, message: 'Token无效' });
    }

    // 验证用户仍然存在且激活
    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const userId = sidebarUser.crmUserId || sidebarUser.userId;
    const user = await userRepo.findOne({ where: { id: userId, status: 'active' } });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户已不存在或已禁用' });
    }

    // 生成新token
    const { JwtConfig } = await import('../../config/jwt');
    const newToken = JwtConfig.generateAccessToken({
      type: 'sidebar',
      userId: user.id,
      username: user.username,
      role: user.role,
      wecomUserId: sidebarUser.wecomUserId || '',
      crmUserId: user.id,
      crmUserName: user.name || user.username,
      tenantId: sidebarUser.tenantId || user.tenantId || '',
      corpId: sidebarUser.corpId || ''
    } as any);

    res.json({
      success: true,
      data: { token: newToken },
      message: 'Token已刷新'
    });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Refresh token error:', error.message);
    res.status(500).json({ success: false, message: 'Token刷新失败' });
  }
});

// ==================== 侧边栏: 搜索CRM客户 & 关联 ====================

/**
 * 侧边栏 - 搜索CRM客户（用于关联）
 * 仅搜索当前租户下的客户
 */
router.get('/sidebar/search-customers', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;
    if (!tenantId) return res.json({ success: true, data: [] });

    const { Customer } = await import('../../entities/Customer');
    const customerRepo = AppDataSource.getRepository(Customer);

    const qb = customerRepo.createQueryBuilder('c')
      .where('c.tenantId = :tenantId', { tenantId })
      .select(['c.id', 'c.name', 'c.phone', 'c.gender', 'c.salesPersonName']);

    if (keyword && String(keyword).trim()) {
      const kw = `%${String(keyword).trim()}%`;
      qb.andWhere('(c.name LIKE :kw OR c.phone LIKE :kw)', { kw });
    }

    const customers = await qb.orderBy('c.createdAt', 'DESC').take(20).getMany();

    // 脱敏手机号
    const result = customers.map(c => ({
      id: c.id,
      name: c.name,
      phone: c.phone && c.phone.length >= 7
        ? c.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        : (c.phone ? '****' : null),
      gender: c.gender,
      salesPersonName: c.salesPersonName
    }));

    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Search customers error:', error.message);
    res.status(500).json({ success: false, message: '搜索客户失败' });
  }
});

/**
 * 侧边栏 - 关联CRM客户
 * 将企微客户关联到CRM客户
 */
router.post('/sidebar/link-crm-customer', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { externalUserId, crmCustomerId } = req.body;
    if (!externalUserId || !crmCustomerId) return res.status(400).json({ success: false, message: '参数不完整' });

    const sidebarUser = (req as any).sidebarUser;
    const tenantId = sidebarUser?.tenantId;

    const wecomCustomerRepo = AppDataSource.getRepository(WecomCustomer);
    const wecomCustomer = await wecomCustomerRepo.findOne({
      where: { externalUserId: String(externalUserId), ...(tenantId ? { tenantId } : {}) }
    });
    if (!wecomCustomer) return res.status(404).json({ success: false, message: '未找到企微客户' });

    // 验证CRM客户存在且属于同一租户
    const { Customer } = await import('../../entities/Customer');
    const customerRepo = AppDataSource.getRepository(Customer);
    const crmCustomer = await customerRepo.findOne({ where: { id: crmCustomerId, tenantId } });
    if (!crmCustomer) return res.status(404).json({ success: false, message: '未找到CRM客户' });

    // 更新关联
    wecomCustomer.crmCustomerId = crmCustomerId;
    await wecomCustomerRepo.save(wecomCustomer);

    // 同时更新CRM客户的企微USID
    if (!crmCustomer.wecomExternalUserid) {
      crmCustomer.wecomExternalUserid = wecomCustomer.externalUserId;
      await customerRepo.save(crmCustomer);
    }

    res.json({ success: true, message: '关联成功' });
  } catch (error: any) {
    log.error('[Wecom Sidebar] Link CRM customer error:', error.message);
    res.status(500).json({ success: false, message: '关联客户失败' });
  }
});

export default router;

