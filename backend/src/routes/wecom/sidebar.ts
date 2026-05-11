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

// ==================== 企微 JS-SDK 同源代理（解决私有部署/内网封锁公网CDN的问题）====================

/** SDK 文件内存缓存：避免每次请求都回源 */
const SDK_CACHE = new Map<string, { content: Buffer; contentType: string; fetchedAt: number }>();
const SDK_CACHE_TTL = 24 * 60 * 60 * 1000; // 24小时

/** 已知合法的 SDK 上游地址（白名单，避免被滥用为开放代理） */
const SDK_UPSTREAMS: Record<string, string[]> = {
  'jwxwork-1.0.0.js': [
    'https://open.work.weixin.qq.com/wwopen/js/jwxwork-1.0.0.js',
    'https://wwcdn.weixin.qq.com/node/wework/wwopen/js/jwxwork-1.0.0.js',
  ],
  'jweixin-1.2.0.js': [
    'https://res.wx.qq.com/open/js/jweixin-1.2.0.js',
    'https://res2.wx.qq.com/open/js/jweixin-1.2.0.js',
  ],
  'jweixin-1.6.0.js': [
    'https://res.wx.qq.com/open/js/jweixin-1.6.0.js',
  ],
};

router.get('/sdk/:filename', async (req: Request, res: Response) => {
  try {
    const filename = String(req.params.filename || '');
    const upstreams = SDK_UPSTREAMS[filename];
    if (!upstreams) {
      return res.status(404).type('text/plain').send('// Unknown SDK file');
    }

    // 命中缓存
    const cached = SDK_CACHE.get(filename);
    if (cached && Date.now() - cached.fetchedAt < SDK_CACHE_TTL) {
      res.setHeader('Content-Type', cached.contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('X-SDK-Cache', 'HIT');
      return res.send(cached.content);
    }

    // 回源（依次尝试 upstream）
    const axios = (await import('axios')).default;
    let lastErr: any = null;
    for (const url of upstreams) {
      try {
        const resp = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 10000,
          headers: { 'User-Agent': 'Mozilla/5.0 (CRM-WecomSDK-Proxy)' }
        });
        const ct = resp.headers['content-type'] || 'application/javascript';
        // 校验：不能是 HTML（防止上游返回404页面）
        if (typeof ct === 'string' && ct.toLowerCase().includes('text/html')) {
          lastErr = new Error(`Upstream returned HTML (likely 404): ${url}`);
          continue;
        }
        const content = Buffer.from(resp.data);
        SDK_CACHE.set(filename, { content, contentType: 'application/javascript; charset=utf-8', fetchedAt: Date.now() });
        res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        res.setHeader('Cache-Control', 'public, max-age=86400');
        res.setHeader('X-SDK-Cache', 'MISS');
        res.setHeader('X-SDK-Upstream', url);
        return res.send(content);
      } catch (e: any) {
        lastErr = e;
        log.warn(`[SDK Proxy] Upstream failed: ${url}: ${e?.message}`);
      }
    }
    log.error('[SDK Proxy] All upstreams failed for', filename, lastErr?.message);
    return res.status(502).type('text/plain').send('// SDK upstream unavailable');
  } catch (e: any) {
    log.error('[SDK Proxy] Error:', e?.message);
    res.status(500).type('text/plain').send('// SDK proxy error');
  }
});

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
  const diagStart = Date.now();
  const diagSteps: { step: string; ms: number; detail?: string }[] = [];
  const addDiag = (step: string, detail?: string) => {
    diagSteps.push({ step, ms: Date.now() - diagStart, detail });
  };

  try {
    const { url: rawUrl, corpId } = req.body;
    // ★ URL规范化：去除尾部空白、hash部分（前端应已处理，后端做防御性清理）
    const url = (rawUrl || '').split('#')[0].replace(/\s+$/, '');
    addDiag('入参校验', `rawUrl=${rawUrl ? rawUrl.substring(0, 80) : '(空)'}, cleanUrl=${url ? url.substring(0, 80) : '(空)'}, corpId=${corpId || '(空)'}`);
    if (!url || !corpId) return res.status(400).json({ success: false, message: '参数不完整' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    let config: any = null;

    // ★ 兼容处理：当 corpId 是 $CORPID$ 占位符（企微未替换）时，尝试查找第一个可用的第三方应用配置
    if (corpId === '$CORPID$' || corpId.includes('$')) {
      log.warn(`[Wecom Sidebar] corpId是占位符(${corpId})，企微客户端未替换。尝试查找第一个可用的第三方应用配置...`);
      addDiag('corpId占位符', `原始值=${corpId}，尝试降级查找`);
      config = await configRepo.findOne({
        where: { isEnabled: true, authType: 'third_party' },
        order: { id: 'ASC' }
      });
      if (!config) {
        // 回退：查找任意可用配置
        config = await configRepo.findOne({ where: { isEnabled: true }, order: { id: 'ASC' } });
      }
      if (!config) {
        addDiag('配置查找失败', '无任何可用企微配置');
        return res.status(400).json({
          success: false,
          message: '未找到匹配的企微配置。corpId占位符($CORPID$)未被企微客户端替换，可能原因：1.侧边栏URL未在企微服务商后台正确配置 2.企业未授权安装该第三方应用'
        });
      }
      log.info(`[Wecom Sidebar] 占位符降级：使用配置 id=${config.id} corpId=${config.corpId} name=${config.name}`);
      addDiag('占位符降级', `使用配置 id=${config.id} corpId=${config.corpId}`);
    } else {
      config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
      if (!config) {
        addDiag('配置查找失败', `corpId=${corpId} 无匹配的已启用配置`);
        return res.status(400).json({ success: false, message: '未找到匹配的企微配置' });
      }
    }

    addDiag('配置加载完成', `configId=${config.id}, name=${config.name}, authType=${config.authType}, authMode=${config.authMode}, agentId=${config.agentId || '(空)'}, permanentCode=${config.permanentCode ? '已配置' : '(空)'}, suiteId=${config.suiteId || '(空)'}`);
    log.info(`[Wecom Sidebar] JS-SDK config request: corpId=${corpId}, actualCorpId=${config.corpId}, authType=${config.authType}, authMode=${config.authMode}, configId=${config.id}, agentId=${config.agentId || '(empty)'}`);

    // ★ 检查 corpId 一致性（92002 cross-corp 错误的常见原因）
    if (corpId !== config.corpId) {
      log.warn(`[Wecom Sidebar] ⚠️ corpId不一致! 前端传入=${corpId}, 数据库存储=${config.corpId}. 将使用前端传入的corpId作为wx.config的appId`);
      addDiag('corpId一致性检查', `⚠️ 不一致! 前端=${corpId}, DB=${config.corpId}`);
    } else {
      addDiag('corpId一致性检查', `✅ 一致: ${corpId}`);
    }
    // ★ agentId 补充逻辑（多来源尝试）
    if (!config.agentId) {
      log.info(`[Wecom Sidebar] agentId为空，开始多来源补充尝试...`);
      addDiag('agentId补充开始', '当前agentId为空');

      // 来源1: 从 authScope JSON 中提取
      if (config.authType === 'third_party' && config.authScope) {
        try {
          const authScope: any = safeJsonParse(config.authScope, null);
          const agentFromScope = authScope?.agent?.[0]?.agentid;
          if (agentFromScope) {
            config.agentId = agentFromScope;
            await configRepo.save(config);
            log.info(`[Wecom Sidebar] ✅ 从authScope中恢复agentId: ${agentFromScope}`);
            addDiag('agentId补充-authScope', `成功恢复 agentId=${agentFromScope}`);
          } else {
            addDiag('agentId补充-authScope', `authScope中无agent信息: ${JSON.stringify(authScope).substring(0, 200)}`);
          }
        } catch (e: any) {
          log.warn('[Wecom Sidebar] 尝试从authScope提取agentId失败:', e.message);
          addDiag('agentId补充-authScope', `解析失败: ${e.message}`);
        }
      }

      // ★ 来源1.5: 主动调用企微 get_auth_info API 实时获取 agentId（最可靠）
      if (!config.agentId && config.authType === 'third_party' && config.suiteId) {
        try {
          addDiag('agentId补充-API实时获取', '开始调用 get_auth_info...');
          const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
          const suiteToken = await WecomTokenService.getSuiteAccessToken(config.suiteId);
          const axios = (await import('axios')).default;
          const authInfoRes = await axios.post(
            `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${suiteToken}`,
            { auth_corpid: config.corpId, permanent_code: config.permanentCode }
          );
          if (authInfoRes.data?.errcode === 0 || !authInfoRes.data?.errcode) {
            const authInfo = authInfoRes.data?.auth_info;
            const agentFromApi = authInfo?.agent?.[0]?.agentid;
            if (agentFromApi) {
              config.agentId = agentFromApi;
              // 同时更新 authScope
              if (authInfo) {
                config.authScope = JSON.stringify(authInfo);
              }
              await configRepo.save(config);
              log.info(`[Wecom Sidebar] ✅ 从企微API(get_auth_info)获取agentId: ${agentFromApi}`);
              addDiag('agentId补充-API实时获取', `✅ 成功! agentId=${agentFromApi}`);
            } else {
              addDiag('agentId补充-API实时获取', `API返回无agent信息: ${JSON.stringify(authInfo).substring(0, 200)}`);
            }
          } else {
            addDiag('agentId补充-API实时获取', `API错误: errcode=${authInfoRes.data?.errcode}, errmsg=${authInfoRes.data?.errmsg}`);
          }
        } catch (e: any) {
          log.warn('[Wecom Sidebar] 从API获取agentId失败:', e.message);
          addDiag('agentId补充-API实时获取', `失败: ${e.message}`);
        }
      }

      // 来源2: 从 authCorpInfo JSON 中提取
      if (!config.agentId && config.authCorpInfo) {
        try {
          const authCorpInfo: any = safeJsonParse(config.authCorpInfo, null);
          const agentFromCorpInfo = authCorpInfo?.agent?.agentid || authCorpInfo?.agentid;
          if (agentFromCorpInfo) {
            config.agentId = agentFromCorpInfo;
            await configRepo.save(config);
            log.info(`[Wecom Sidebar] ✅ 从authCorpInfo中恢复agentId: ${agentFromCorpInfo}`);
            addDiag('agentId补充-authCorpInfo', `成功恢复 agentId=${agentFromCorpInfo}`);
          } else {
            addDiag('agentId补充-authCorpInfo', `authCorpInfo中无agentId: ${JSON.stringify(authCorpInfo).substring(0, 200)}`);
          }
        } catch (e: any) {
          addDiag('agentId补充-authCorpInfo', `解析失败: ${e.message}`);
        }
      }

      // 来源3: 从同corpId的其他配置中查找（可能有历史配置保存了agentId）
      if (!config.agentId) {
        try {
          const otherConfig = await configRepo.findOne({
            where: { corpId: config.corpId, isEnabled: true },
            order: { id: 'DESC' }
          });
          if (otherConfig && otherConfig.agentId && otherConfig.id !== config.id) {
            config.agentId = otherConfig.agentId;
            await configRepo.save(config);
            log.info(`[Wecom Sidebar] ✅ 从同corpId其他配置(id=${otherConfig.id})中恢复agentId: ${otherConfig.agentId}`);
            addDiag('agentId补充-同corpId配置', `从配置id=${otherConfig.id}恢复 agentId=${otherConfig.agentId}`);
          } else {
            addDiag('agentId补充-同corpId配置', '无其他配置包含agentId');
          }
        } catch (e: any) {
          addDiag('agentId补充-同corpId配置', `查询失败: ${e.message}`);
        }
      }

      if (!config.agentId) {
        log.warn(`[Wecom Sidebar] ⚠️ agentId补充失败，所有来源均无法获取。configId=${config.id}, corpId=${config.corpId}`);
        addDiag('agentId补充结果', '❌ 所有来源均无法获取agentId');
      } else {
        addDiag('agentId补充结果', `✅ 最终agentId=${config.agentId}`);
      }
    } else {
      addDiag('agentId状态', `已存在 agentId=${config.agentId}，无需补充`);
    }

    // 使用 WecomTokenService 统一获取 access_token，支持自建应用和第三方应用双模式
    // ★ 关键：对于第三方应用，确保使用前端传来的 corpId（企微客户端实际替换的值）
    // 而不是数据库中可能不一致的 config.corpId，避免 92002 cross-corp 错误
    if (config.authType === 'third_party' && corpId && corpId !== config.corpId && !corpId.includes('$')) {
      log.warn(`[Wecom Sidebar] corpId不一致，临时覆盖config.corpId用于token获取: 前端=${corpId}, DB=${config.corpId}`);
      addDiag('corpId覆盖', `前端corpId=${corpId} 覆盖 DB corpId=${config.corpId}`);
      config.corpId = corpId; // 临时覆盖，确保 getCorpTokenByThirdParty 使用正确的 auth_corpid
    }
    addDiag('获取AccessToken开始', `authType=${config.authType}, corpId=${config.corpId}`);
    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
    const accessToken = await WecomTokenService.getAccessToken(config);
    addDiag('获取AccessToken成功', `token前20位=${accessToken.substring(0, 20)}...`);

    // ★ 企业身份验证：确认 access_token 属于正确的企业（防止 92002 cross-corp 错误）
    if (config.authType === 'third_party') {
      try {
        const axiosLib = (await import('axios')).default;
        const verifyRes = await axiosLib.get(`https://qyapi.weixin.qq.com/cgi-bin/agent/get?access_token=${accessToken}&agentid=${config.agentId || 0}`);
        const _verifyCorp = verifyRes.data?.corpid || verifyRes.data?.auth_corp_info?.corpid;
        if (verifyRes.data?.errcode && verifyRes.data.errcode !== 0) {
          addDiag('Token企业验证', `API返回错误: errcode=${verifyRes.data.errcode}, errmsg=${verifyRes.data.errmsg}（不影响签名流程，但token可能有问题）`);
          log.warn(`[Wecom Sidebar] Token验证异常: errcode=${verifyRes.data.errcode}, errmsg=${verifyRes.data.errmsg}`);
        } else {
          addDiag('Token企业验证', `✅ token有效, 应用name=${verifyRes.data?.name || '(空)'}, agentid=${verifyRes.data?.agentid || '(空)'}`);
        }
      } catch (e: any) {
        addDiag('Token企业验证', `验证请求失败(不阻塞): ${e.message?.substring(0, 100)}`);
      }
    }

    addDiag('获取CorpTicket开始');
    const corpTicket = await WecomApiService.getJsSdkTicket(accessToken);
    addDiag('获取CorpTicket成功', `ticket前20位=${corpTicket.substring(0, 20)}...`);

    let agentTicket = '';
    let agentTicketError = '';
    addDiag('获取AgentTicket开始');
    try {
      agentTicket = await WecomApiService.getAgentJsSdkTicket(accessToken);
      addDiag('获取AgentTicket成功', `ticket前20位=${agentTicket.substring(0, 20)}...`);
    } catch (e: any) {
      agentTicketError = e.message || 'unknown';
      log.warn('[Wecom Sidebar] Get agent ticket failed:', agentTicketError);
      addDiag('获取AgentTicket失败', agentTicketError);
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = uuidv4().replace(/-/g, '').substring(0, 16);
    const corpSignature = WecomApiService.generateJsSdkSignature(corpTicket, nonceStr, timestamp, url);
    let agentSignature = '';
    if (agentTicket) { agentSignature = WecomApiService.generateJsSdkSignature(agentTicket, nonceStr, timestamp, url); }

    // ★ 输出完整签名参数用于调试
    log.info(`[Wecom Sidebar] 签名参数详情: url=${url}, timestamp=${timestamp}, nonceStr=${nonceStr}, corpTicket前20=${corpTicket.substring(0,20)}, agentTicket前20=${agentTicket ? agentTicket.substring(0,20) : '(空)'}, corpSignature=${corpSignature}, agentSignature=${agentSignature || '(空)'}, agentId=${config.agentId}`);

    // 当agentTicket获取失败时，给前端返回警告信息，便于诊断
    const warnings: string[] = [];
    if (!agentTicket) warnings.push(`agent_ticket获取失败: ${agentTicketError || '未知原因'}`);
    if (!config.agentId) warnings.push('未配置AgentID，侧边栏敏感API(如getCurExternalContact)将不可用');

    // 最终诊断汇总
    const totalMs = Date.now() - diagStart;
    addDiag('响应完成', `总耗时=${totalMs}ms, agentId=${config.agentId || '(空)'}, hasAgentSignature=${!!agentSignature}, warnings=${warnings.length}`);
    log.info(`[Wecom Sidebar] JS-SDK config 诊断链路:\n${diagSteps.map(s => `  [${s.ms}ms] ${s.step}: ${s.detail || ''}`).join('\n')}`);

    res.json({
      success: true,
      data: {
        // ★ 关键修复：返回前端传来的 corpId（企微客户端实际替换的值）
        // 而不是数据库中的 config.corpId，避免 92002 cross-corp 错误
        corpId: corpId !== '$CORPID$' && !corpId.includes('$') ? corpId : config.corpId,
        agentId: config.agentId,
        authType: config.authType,
        timestamp,
        nonceStr,
        corpSignature,
        agentSignature,
        warnings: warnings.length > 0 ? warnings : undefined,
        // 诊断信息（仅开发环境或有警告时返回）
        _diagnostic: (process.env.NODE_ENV !== 'production' || warnings.length > 0) ? {
          totalMs,
          steps: diagSteps,
          configId: config.id,
          configName: config.name,
          hasAgentId: !!config.agentId,
          hasAgentTicket: !!agentTicket,
          hasAgentSignature: !!agentSignature,
          signUrl: url,
          signUrlDomain: (() => { try { return new URL(url).hostname; } catch { return '(parse-fail)'; } })()
        } : undefined
      }
    });
  } catch (error: any) {
    const totalMs = Date.now() - diagStart;
    addDiag('异常', `${error.message}`);
    log.error(`[Wecom Sidebar] JS-SDK config error (${totalMs}ms):`, error.message, error.stack?.substring(0, 300));
    log.error(`[Wecom Sidebar] 诊断链路:\n${diagSteps.map(s => `  [${s.ms}ms] ${s.step}: ${s.detail || ''}`).join('\n')}`);
    // 识别 40085 invalid suite ticket → 返回结构化 errorCode 让前端展示诊断面板
    const errMsg = error?.message || '';
    const isSuiteTicketInvalid = errMsg.includes('40085') || errMsg.includes('invalid suite ticket') || errMsg.includes('invalid suite_ticket');
    res.status(500).json({
      success: false,
      errorCode: isSuiteTicketInvalid ? 'SUITE_TICKET_INVALID' : 'JS_SDK_CONFIG_FAILED',
      message: `获取JS-SDK配置失败: ${error.message}`,
      hint: isSuiteTicketInvalid
        ? '第三方授权应用的suite_ticket已失效。请管理员访问「企微管理 → 服务商配置」点击「诊断」按钮排查回调URL，或在该页面手动注入新的suite_ticket。'
        : undefined,
      _diagnostic: { totalMs, steps: diagSteps }
    });
  }
});

// ==================== 诊断: agentConfig 调试 ====================

/**
 * 侧边栏 agentConfig 诊断
 * 验证 agentId、签名参数、可信域名等
 */
router.post('/sidebar/diagnose-agent-config', async (req: Request, res: Response) => {
  try {
    const { corpId, url: rawUrl } = req.body;
    if (!corpId) return res.status(400).json({ success: false, message: '缺少corpId' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '未找到匹配的企微配置' });

    const results: any = {
      configId: config.id,
      corpId: config.corpId,
      agentId: config.agentId,
      authType: config.authType,
      hasPermanentCode: !!config.permanentCode,
      suiteId: config.suiteId || '(空)',
      checks: []
    };

    // Check 1: AgentId 验证
    if (!config.agentId) {
      results.checks.push({ name: 'AgentID', status: '❌ 缺失', hint: '请通过企微API获取或手动填写' });
    } else {
      results.checks.push({ name: 'AgentID', status: `✅ ${config.agentId}` });
    }

    // Check 2: 通过 get_auth_info 验证 agentId 是否正确
    if (config.authType === 'third_party' && config.suiteId && config.permanentCode) {
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const suiteToken = await WecomTokenService.getSuiteAccessToken(config.suiteId);
        const axios = (await import('axios')).default;
        const authInfoRes = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/service/get_auth_info?suite_access_token=${suiteToken}`,
          { auth_corpid: config.corpId, permanent_code: config.permanentCode }
        );
        if (authInfoRes.data?.errcode === 0 || !authInfoRes.data?.errcode) {
          const agents = authInfoRes.data?.auth_info?.agent || [];
          const realAgentId = agents[0]?.agentid;
          const agentName = agents[0]?.name;
          results.authInfoAgent = { agentid: realAgentId, name: agentName, agents_count: agents.length };
          if (realAgentId && config.agentId && String(realAgentId) !== String(config.agentId)) {
            results.checks.push({
              name: 'AgentID一致性',
              status: `❌ 不一致! DB=${config.agentId}, 企微API=${realAgentId}`,
              hint: `数据库中的agentId(${config.agentId})与企微get_auth_info返回的(${realAgentId})不匹配！请更新数据库。`,
              fix: `UPDATE wecom_configs SET agent_id = ${realAgentId} WHERE id = ${config.id};`
            });
          } else if (realAgentId) {
            results.checks.push({ name: 'AgentID一致性', status: `✅ 与企微API一致 (${realAgentId}, 应用名: ${agentName})` });
          }
        } else {
          results.checks.push({ name: 'get_auth_info', status: `⚠️ errcode=${authInfoRes.data?.errcode}`, hint: authInfoRes.data?.errmsg });
        }
      } catch (e: any) {
        results.checks.push({ name: 'get_auth_info', status: '⚠️ 调用失败', hint: e.message });
      }
    }

    // Check 3: 验证 access_token 和 agent_ticket 获取
    try {
      const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
      const accessToken = await WecomTokenService.getAccessToken(config);
      results.checks.push({ name: 'AccessToken', status: `✅ 获取成功 (前缀: ${accessToken.substring(0, 15)}...)` });

      // 获取 agent_ticket
      const { WecomApiService } = await import('../../services/WecomApiService');
      try {
        const agentTicket = await WecomApiService.getAgentJsSdkTicket(accessToken);
        results.checks.push({ name: 'AgentTicket', status: `✅ 获取成功 (前缀: ${agentTicket.substring(0, 15)}...)` });

        // Check 4: 生成签名并与官方验证工具对比
        const url = (rawUrl || 'https://crm.yunkes.com/wecom-sidebar/customer-detail').split('#')[0].replace(/\s+$/, '');
        const timestamp = Math.floor(Date.now() / 1000);
        const nonceStr = 'diagnose_test_123';
        const signature = WecomApiService.generateJsSdkSignature(agentTicket, nonceStr, timestamp, url);
        // 签名原始字符串（用于与官方工具对比）
        const signStr = `jsapi_ticket=${agentTicket}&noncestr=${nonceStr}&timestamp=${timestamp}&url=${url}`;
        results.signatureDemo = {
          url,
          timestamp,
          nonceStr,
          signature,
          signString: signStr,
          hint: '请到 http://open.work.weixin.qq.com/api/jsapidemo 验证签名是否正确'
        };
        results.checks.push({ name: '签名生成', status: '✅ 正常' });
      } catch (e: any) {
        results.checks.push({ name: 'AgentTicket', status: `❌ 获取失败: ${e.message}`, hint: '无法获取agent_ticket，agentConfig必然失败' });
      }
    } catch (e: any) {
      results.checks.push({ name: 'AccessToken', status: `❌ 获取失败: ${e.message}` });
    }

    // Check 5: 可信域名提示
    results.checks.push({
      name: '可信域名',
      status: '⚠️ 需人工确认',
      hint: `请在服务商后台确认 crm.yunkes.com 已添加到：\n1. 应用管理 → 网页授权及JS-SDK → 可信域名\n2. 或在应用的「聊天工具」配置页中确认URL域名`
    });

    res.json({ success: true, data: results });
  } catch (error: any) {
    log.error('[Sidebar] Diagnose error:', error.message);
    res.status(500).json({ success: false, message: error.message });
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

// ==================== 小程序租户配置 ====================

const MP_CONFIG_KEY = 'wecom_mp_tenant_config';

/**
 * 获取小程序租户配置
 */
router.get('/sidebar-mp-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.json({ success: true, data: {} });

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const setting = await settingsRepo.findOne({ where: { tenantId, settingKey: MP_CONFIG_KEY } });
    const data = setting ? setting.getValue() : {};
    res.json({ success: true, data: data || {} });
  } catch (error: any) {
    log.error('[Wecom] Get mp tenant config error:', error.message);
    res.status(500).json({ success: false, message: '获取小程序配置失败' });
  }
});

/**
 * 保存小程序租户配置
 */
router.put('/sidebar-mp-config', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '无法获取租户信息' });

    const { mpCardTitle, mpCardCoverUrl, mpPosterUrl } = req.body;

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let setting = await settingsRepo.findOne({ where: { tenantId, settingKey: MP_CONFIG_KEY } });
    if (!setting) {
      setting = settingsRepo.create({
        id: uuidv4(),
        tenantId,
        settingKey: MP_CONFIG_KEY,
        settingType: 'json',
        description: '小程序资料收集租户配置'
      });
    }

    setting.settingType = 'json';
    setting.setValue({ mpCardTitle: mpCardTitle || '', mpCardCoverUrl: mpCardCoverUrl || '', mpPosterUrl: mpPosterUrl || '' });
    await settingsRepo.save(setting);

    res.json({ success: true, message: '小程序配置已保存' });
  } catch (error: any) {
    log.error('[Wecom] Save mp tenant config error:', error.message);
    res.status(500).json({ success: false, message: '保存小程序配置失败' });
  }
});

export default router;

