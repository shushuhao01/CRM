/**
 * 企微H5应用 - 鉴权路由
 *
 * 提供H5独立应用的登录、绑定、token验证和JS-SDK签名接口
 * 路由前缀: /h5
 */
import { Router, Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { AppDataSource } from '../../config/database';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
// WecomSuiteConfig - 预留用于后续OAuth2登录流程
import WecomApiService from '../../services/WecomApiService';
import { authenticateSidebarToken } from '../../middleware/auth';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';
import { Tenant } from '../../entities/Tenant';
import { createDefaultAdmin } from '../../utils/adminAccountHelper';
import { aliyunSmsService } from '../../services/AliyunSmsService';
import { adminNotificationService } from '../../services/AdminNotificationService';
import { SITE_CONFIG } from '../../config/sites';

const router = Router();

/** H5鉴权接口限流: 每IP每15分钟最多15次 */
const h5AuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '操作过于频繁，请稍后再试' },
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
});

/** JS-SDK配置限流: 每IP每分钟30次 */
const h5JsSdkLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'JS-SDK请求过于频繁' }
});

// ==================== 绑定CRM账号（H5独立应用登录） ====================

/**
 * POST /h5/bind-account
 * 企微用户绑定CRM账号并获取token
 */
router.post('/bind-account', h5AuthLimiter, async (req: Request, res: Response) => {
  try {
    const { wecomUserId, corpId, tenantCode, username, password } = req.body;
    if (!username || !password) {
      return res.status(400).json({ success: false, message: '请输入用户名和密码' });
    }
    if (!tenantCode && !corpId) {
      return res.status(400).json({ success: false, message: '请输入租户编码' });
    }
    if (username.length > 100 || password.length > 128) {
      return res.status(400).json({ success: false, message: '用户名或密码长度超出限制' });
    }

    let tenantId = '';
    let configId: any = null;
    let resolvedCorpId = corpId || '';

    // 优先通过tenantCode查找租户（支持非企微环境登录）
    if (tenantCode) {
      const { Tenant } = await import('../../entities/Tenant');
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { code: tenantCode } });
      if (!tenant) {
        return res.status(400).json({ success: false, message: '租户编码不存在' });
      }
      tenantId = tenant.id;

      // 尝试查找该租户的企微配置（可选）
      const configRepo = AppDataSource.getRepository(WecomConfig);
      const config = await configRepo.findOne({ where: { tenantId, isEnabled: true } });
      if (config) {
        configId = config.id;
        resolvedCorpId = resolvedCorpId || config.corpId;
      }
    } else if (corpId) {
      // 通过corpId查找企微配置（企微环境）
      const configRepo = AppDataSource.getRepository(WecomConfig);
      const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
      if (!config) {
        return res.status(400).json({ success: false, message: '未找到匹配的企微配置' });
      }
      tenantId = config.tenantId;
      configId = config.id;
    }

    if (!tenantId) {
      return res.status(400).json({ success: false, message: '无法确定租户信息' });
    }

    // 验证用户
    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { username, tenantId, status: 'active' } });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    const bcrypt = await import('bcryptjs');
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, message: '用户名或密码错误' });
    }

    // 如果有企微信息，创建或更新绑定
    let bindingData: any = null;
    if (wecomUserId && resolvedCorpId && configId) {
      const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
      let binding = await bindingRepo.findOne({
        where: { wecomUserId, corpId: resolvedCorpId, wecomConfigId: configId }
      });
      if (binding) {
        binding.crmUserId = user.id;
        binding.crmUserName = user.name || user.username;
        binding.isEnabled = true;
      } else {
        binding = bindingRepo.create({
          tenantId,
          wecomConfigId: configId,
          corpId: resolvedCorpId,
          wecomUserId,
          crmUserId: user.id,
          crmUserName: user.name || user.username,
          bindOperator: 'h5_app',
          isEnabled: true
        });
      }
      await bindingRepo.save(binding);
      bindingData = { id: binding.id, wecomUserId, crmUserId: user.id, crmUserName: user.name || user.username };
    }

    // 生成JWT
    const { JwtConfig } = await import('../../config/jwt');
    const token = JwtConfig.generateAccessToken({
      type: 'sidebar',
      userId: user.id,
      username: user.username,
      role: user.role,
      wecomUserId: wecomUserId || '',
      crmUserId: user.id,
      crmUserName: user.name || user.username,
      tenantId,
      corpId
    } as any);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          tenantId
        },
        binding: bindingData
      },
      message: '登录成功'
    });
  } catch (error: any) {
    log.error('[H5 Auth] bind-account error:', error.message);
    res.status(500).json({ success: false, message: '账号绑定失败' });
  }
});

// ==================== H5登录（已绑定用户自动登录） ====================

/**
 * POST /h5/login
 * 已绑定用户通过wecomUserId+corpId自动登录
 */
router.post('/login', h5AuthLimiter, async (req: Request, res: Response) => {
  try {
    const { wecomUserId, corpId } = req.body;
    if (!wecomUserId || !corpId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const bindingRepo = AppDataSource.getRepository(WecomUserBinding);
    const binding = await bindingRepo.findOne({
      where: { wecomUserId, corpId, isEnabled: true }
    });
    if (!binding) {
      return res.json({ success: false, message: '未绑定CRM账号', code: 'NOT_BOUND' });
    }

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: binding.crmUserId, status: 'active' } });
    if (!user) {
      return res.json({ success: false, message: 'CRM用户不存在或已禁用', code: 'USER_DISABLED' });
    }

    const { JwtConfig } = await import('../../config/jwt');
    const token = JwtConfig.generateAccessToken({
      type: 'sidebar',
      userId: user.id,
      username: user.username,
      role: user.role,
      wecomUserId,
      crmUserId: user.id,
      crmUserName: user.name || user.username,
      tenantId: binding.tenantId || user.tenantId || '',
      corpId
    } as any);

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          name: user.name,
          username: user.username,
          avatar: user.avatar,
          role: user.role,
          tenantId: binding.tenantId || user.tenantId
        }
      }
    });
  } catch (error: any) {
    log.error('[H5 Auth] login error:', error.message);
    res.status(500).json({ success: false, message: '登录失败' });
  }
});

// ==================== 获取当前用户信息 ====================

/**
 * GET /h5/current-user
 */
router.get('/current-user', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    const userId = sidebarUser?.crmUserId || sidebarUser?.userId;
    if (!userId) {
      return res.status(401).json({ success: false, message: '无效token' });
    }

    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const user = await userRepo.findOne({ where: { id: userId, status: 'active' } });
    if (!user) {
      return res.status(401).json({ success: false, message: '用户不存在或已禁用' });
    }

    res.json({
      success: true,
      data: {
        id: user.id,
        name: user.name,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        departmentId: user.departmentId,
        tenantId: user.tenantId
      }
    });
  } catch (error: any) {
    log.error('[H5 Auth] current-user error:', error.message);
    res.status(500).json({ success: false, message: '获取用户信息失败' });
  }
});

// ==================== JS-SDK签名 ====================

/**
 * GET /h5/jssdk-config
 * 企业级JS-SDK签名
 */
router.get('/jssdk-config', h5JsSdkLimiter, authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { url: rawUrl } = req.query;
    if (!rawUrl) return res.status(400).json({ success: false, message: '缺少url参数' });
    // ★ URL规范化：去除hash和尾部空白
    const url = String(rawUrl).split('#')[0].replace(/\s+$/, '');

    const sidebarUser = (req as any).sidebarUser;
    const corpId = sidebarUser?.corpId;
    if (!corpId) return res.status(400).json({ success: false, message: '无法获取corpId' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
    if (!config) return res.status(400).json({ success: false, message: '未找到企微配置' });

    // 获取access_token（支持自建/第三方双模式）
    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
    const accessToken = await WecomTokenService.getAccessToken(config);
    const corpTicket = await WecomApiService.getJsSdkTicket(accessToken);

    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = uuidv4().replace(/-/g, '').substring(0, 16);
    const signature = WecomApiService.generateJsSdkSignature(corpTicket, nonceStr, timestamp, url);

    res.json({
      success: true,
      data: {
        corpId: config.corpId,
        timestamp,
        nonceStr,
        signature
      }
    });
  } catch (error: any) {
    log.error('[H5 Auth] jssdk-config error:', error.message);
    res.status(500).json({ success: false, message: '获取JS-SDK配置失败' });
  }
});

/**
 * GET /h5/agent-config
 * 应用级JS-SDK签名(agentConfig)
 */
router.get('/agent-config', h5JsSdkLimiter, authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const { url: rawUrl } = req.query;
    if (!rawUrl) return res.status(400).json({ success: false, message: '缺少url参数' });
    // ★ URL规范化：去除hash和尾部空白
    const url = String(rawUrl).split('#')[0].replace(/\s+$/, '');

    const sidebarUser = (req as any).sidebarUser;
    const corpId = sidebarUser?.corpId;
    if (!corpId) return res.status(400).json({ success: false, message: '无法获取corpId' });

    const configRepo = AppDataSource.getRepository(WecomConfig);
    const config = await configRepo.findOne({ where: { corpId, isEnabled: true } });
    if (!config) return res.status(400).json({ success: false, message: '未找到企微配置' });

    const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
    const accessToken = await WecomTokenService.getAccessToken(config);
    const agentTicket = await WecomApiService.getAgentJsSdkTicket(accessToken);

    const timestamp = Math.floor(Date.now() / 1000);
    const nonceStr = uuidv4().replace(/-/g, '').substring(0, 16);
    const signature = WecomApiService.generateJsSdkSignature(agentTicket, nonceStr, timestamp, url);

    res.json({
      success: true,
      data: {
        corpId: config.corpId,
        agentId: config.agentId,
        timestamp,
        nonceStr,
        signature
      }
    });
  } catch (error: any) {
    log.error('[H5 Auth] agent-config error:', error.message);
    res.status(500).json({ success: false, message: '获取Agent配置失败' });
  }
});

// ==================== H5自主注册（满足企微服务商上架要求） ====================

/** H5注册限流: 每IP每15分钟最多10次 */
const h5RegisterLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: '注册请求过于频繁，请稍后再试' },
  keyGenerator: (req: Request) => req.ip || req.socket.remoteAddress || 'unknown'
});

// 验证码存储（与公开注册共用格式，生产环境应使用 Redis）
const h5VerificationCodes: Map<string, { code: string; expires: number }> = new Map();

/**
 * POST /h5/send-code
 * H5应用内发送注册验证码
 */
router.post('/send-code', h5RegisterLimiter, async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '请输入正确的手机号' });
    }

    // 检查发送频率（1分钟内只能发送一次）
    const existing = h5VerificationCodes.get(phone);
    if (existing && existing.expires > Date.now() + 4 * 60 * 1000) {
      return res.status(400).json({ success: false, message: '发送太频繁，请稍后再试' });
    }

    // 生成6位验证码
    const code = Math.random().toString().slice(-6);
    const expires = Date.now() + 5 * 60 * 1000; // 5分钟有效

    // 优先从数据库加载配置
    const dbLoaded = await aliyunSmsService.loadFromDatabase();
    if (!dbLoaded) {
      aliyunSmsService.loadFromEnv();
    }

    // 发送短信
    const result = await aliyunSmsService.sendVerificationCode(phone, code);
    if (!result.success) {
      log.error(`[H5 Register] 发送验证码失败: ${result.message}`);
      return res.status(500).json({ success: false, message: result.message || '发送失败，请稍后重试' });
    }

    h5VerificationCodes.set(phone, { code, expires });
    log.info(`[H5 Register] 验证码已发送: ${phone}`);

    res.json({ success: true, message: '验证码已发送' });
  } catch (error: any) {
    log.error('[H5 Register] 发送验证码失败:', error.message);
    res.status(500).json({ success: false, message: '发送验证码失败' });
  }
});

/**
 * POST /h5/register
 * H5应用内注册新租户（免费试用，满足企微上架自主注册要求）
 */
router.post('/register', h5RegisterLimiter, async (req: Request, res: Response) => {
  try {
    const { companyName, contactName, phone, code, password } = req.body;

    // 验证必填字段
    if (!companyName || !contactName || !phone || !code) {
      return res.status(400).json({ success: false, message: '请填写完整信息' });
    }
    if (!password || password.length < 6) {
      return res.status(400).json({ success: false, message: '密码至少6位' });
    }
    if (!/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ success: false, message: '手机号格式不正确' });
    }

    // 验证验证码
    const stored = h5VerificationCodes.get(phone);
    if (!stored || stored.code !== code || stored.expires < Date.now()) {
      return res.status(400).json({ success: false, message: '验证码错误或已过期' });
    }
    h5VerificationCodes.delete(phone);

    // 检查手机号是否已注册
    const existingTenant = await AppDataSource.query(
      'SELECT id FROM tenants WHERE phone = ? AND deleted_at IS NULL', [phone]
    );
    if (existingTenant && existingTenant.length > 0) {
      return res.status(400).json({ success: false, message: '该手机号已注册，请直接登录' });
    }

    // 获取免费试用套餐（与官网注册逻辑一致：默认使用管理后台的 FREE_TRIAL 试用套餐）
    let packageId = null;
    let maxUsers = 3;
    let expireDays = 14;
    let pkgUserLimitMode = 'total';
    let pkgMaxOnlineSeats = 5;
    let pkgModules: string[] = [];

    // 优先精确匹配 FREE_TRIAL 套餐编码（与官网注册默认套餐一致）
    let trialPackages = await AppDataSource.query(
      "SELECT id, max_users, max_online_seats, user_limit_mode, duration_days, modules FROM tenant_packages WHERE code = 'FREE_TRIAL' AND status = 1 LIMIT 1"
    );
    // 兜底：取管理后台标记为试用的免费套餐
    if (!trialPackages || trialPackages.length === 0) {
      trialPackages = await AppDataSource.query(
        "SELECT id, max_users, max_online_seats, user_limit_mode, duration_days, modules FROM tenant_packages WHERE is_trial = 1 AND price = 0 AND status = 1 AND type != 'community' ORDER BY duration_days DESC LIMIT 1"
      );
    }
    if (trialPackages && trialPackages.length > 0) {
      packageId = trialPackages[0].id;
      maxUsers = trialPackages[0].max_users || 3;
      pkgMaxOnlineSeats = trialPackages[0].max_online_seats || 5;
      pkgUserLimitMode = trialPackages[0].user_limit_mode || 'total';
      expireDays = trialPackages[0].duration_days || 14;
      // 🔥 从套餐获取功能模块列表，确保租户模块授权与套餐配置一致
      try {
        const rawModules = trialPackages[0].modules;
        if (rawModules) {
          pkgModules = typeof rawModules === 'string' ? JSON.parse(rawModules) : rawModules;
          if (!Array.isArray(pkgModules)) pkgModules = [];
        }
      } catch { pkgModules = [] }
    }

    // 创建租户（编码生成带查重，与官网注册一致）
    const tenantId = uuidv4();
    let tenantCode = Tenant.generateShortCode();
    for (let i = 0; i < 10; i++) {
      const existingCode = await AppDataSource.query('SELECT id FROM tenants WHERE code = ?', [tenantCode]);
      if (existingCode.length === 0) break;
      tenantCode = Tenant.generateShortCode();
    }
    const licenseKey = Tenant.generateLicenseKey();
    const expireDate = new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000);
    // 用户限制模式：双模式套餐默认在线席位制（与官网注册一致）
    const finalLimitMode = pkgUserLimitMode === 'both' ? 'online' : pkgUserLimitMode;

    await AppDataSource.query(
      `INSERT INTO tenants
       (id, name, code, license_key, license_status, package_id, contact, phone, max_users, max_online_seats, user_limit_mode, expire_date, features, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?, ?, ?, ?, ?, ?, ?, ?, 'active', NOW())`,
      [tenantId, companyName, tenantCode, licenseKey, packageId, contactName, phone, maxUsers, pkgMaxOnlineSeats, finalLimitMode, expireDate, JSON.stringify(pkgModules)]
    );

    // 存储会员中心密码
    try {
      const passwordHash = await bcrypt.hash(password, 10);
      await AppDataSource.query('UPDATE tenants SET password_hash = ? WHERE id = ?', [passwordHash, tenantId]);
    } catch (pwdErr) {
      log.warn('[H5 Register] 存储会员中心密码失败（不影响注册）:', pwdErr);
    }

    // 记录注册日志
    await AppDataSource.query(
      `INSERT INTO tenant_license_logs (id, tenant_id, license_key, action, result, message)
       VALUES (?, ?, ?, 'register', 'success', ?)`,
      [uuidv4(), tenantId, licenseKey, '企微H5应用注册-免费试用']
    );

    // 创建默认管理员账号
    let adminAccount: { username: string; password: string } | null = null;
    try {
      const result = await createDefaultAdmin({
        tenantId,
        phone,
        realName: contactName
      });
      adminAccount = { username: result.username, password: result.password };
      log.info(`[H5 Register] ✅ 已为租户 ${tenantCode} 创建默认管理员: ${result.username}`);
    } catch (adminErr: any) {
      log.error('[H5 Register] 创建默认管理员失败（不影响注册）:', adminErr.message?.substring(0, 100));
    }

    // 生成H5应用登录token（注册即登录）
    const { JwtConfig } = await import('../../config/jwt');
    const { User } = await import('../../entities/User');
    const userRepo = AppDataSource.getRepository(User);
    const adminUser = await userRepo.findOne({ where: { username: adminAccount?.username || phone, tenantId } });

    let token = '';
    if (adminUser) {
      token = JwtConfig.generateAccessToken({
        type: 'sidebar',
        userId: adminUser.id,
        username: adminUser.username,
        role: adminUser.role,
        wecomUserId: '',
        crmUserId: adminUser.id,
        crmUserName: adminUser.name || adminUser.username,
        tenantId,
        corpId: ''
      } as any);
    }

    log.info(`[H5 Register] ✅ 企微H5注册成功: ${companyName} (${tenantCode})`);

    res.json({
      success: true,
      data: {
        tenantId,
        tenantCode,
        licenseKey,
        expireDate: expireDate.toISOString().split('T')[0],
        token,
        user: adminUser ? {
          id: adminUser.id,
          name: adminUser.name || adminUser.username,
          username: adminUser.username,
          avatar: '',
          role: adminUser.role,
          tenantId
        } : null,
        adminUsername: adminAccount?.username || null,
        adminPassword: adminAccount?.password || null,
        userLimitMode: finalLimitMode,
        maxOnlineSeats: pkgMaxOnlineSeats,
        maxUsers,
        crmUrl: SITE_CONFIG.CRM_URL,
        memberUrl: `${SITE_CONFIG.WEBSITE_URL}/member`
      },
      message: '注册成功，免费试用已开通'
    });

    // 异步通知管理员
    adminNotificationService.notify('tenant_registered', {
      title: `新租户注册（企微H5）：${companyName}`,
      content: `企业「${companyName}」（联系人：${contactName}，手机：${phone}）通过企微H5应用注册了免费试用。租户编码：${tenantCode}`,
      relatedId: tenantId,
      relatedType: 'tenant',
      extraData: { companyName, contactName, phone, tenantCode, source: 'wecom_h5' }
    }).catch(err => log.error('[H5 Register] 发送管理员通知失败:', err.message));

    // 异步发送账号开通短信给用户（与官网注册逻辑一致，包含租户编码/授权码/管理员密码/到期时间）
    ;(async () => {
      try {
        const dbLoaded = await aliyunSmsService.loadFromDatabase();
        if (!dbLoaded) {
          aliyunSmsService.loadFromEnv();
        }
        const smsParams = {
          tenantName: companyName,
          orderNo: '免费试用',
          amount: '0',
          tenantCode: tenantCode,
          licenseKey: licenseKey,
          adminPassword: adminAccount?.password || 'Aa123456',
          packageName: `${expireDays}天免费试用`,
          expireDate: expireDate.toISOString().split('T')[0]
        };
        // 依次尝试: ACCOUNT_ACTIVATION → PAYMENT_ACTIVATION（与官网注册一致）
        const templateTypes = ['ACCOUNT_ACTIVATION', 'PAYMENT_ACTIVATION'];
        for (const templateType of templateTypes) {
          const smsResult = await aliyunSmsService.sendSms(phone, templateType, smsParams);
          if (smsResult.success) {
            log.info(`[H5 Register] ✅ 注册短信已通过 ${templateType} 模板发送至: ${phone}`);
            break;
          }
          log.warn(`[H5 Register] ${templateType} 发送失败: ${smsResult.message}`);
          if (!smsResult.message?.includes('未配置')) break;
        }
      } catch (smsErr: any) {
        log.error('[H5 Register] 发送注册短信异常:', smsErr.message);
      }
    })();
  } catch (error: any) {
    log.error('[H5 Register] 注册失败:', error.message);
    res.status(500).json({ success: false, message: '注册失败，请稍后重试' });
  }
});

// ==================== Token 交换（H5→主CRM免登） ====================

/**
 * POST /h5/exchange-token
 * 将 h5_token(sidebar类型) 交换为主CRM可用的完整token
 * 用于从H5工作台跳转到主CRM系统时实现免登
 */
router.post('/exchange-token', authenticateSidebarToken, async (req: Request, res: Response) => {
  try {
    const sidebarUser = (req as any).sidebarUser;
    if (!sidebarUser || !sidebarUser.crmUserId) {
      return res.status(401).json({ success: false, message: 'sidebar token无效或缺少用户信息' });
    }

    const dataSource = AppDataSource;
    if (!dataSource?.isInitialized) {
      return res.status(500).json({ success: false, message: '数据库未就绪' });
    }

    const { User } = await import('../../entities/User');
    const userRepo = dataSource.getRepository(User);
    const where: any = { id: sidebarUser.crmUserId };
    if (sidebarUser.tenantId) {
      where.tenantId = sidebarUser.tenantId;
    }
    const user = await userRepo.findOne({ where });

    if (!user) {
      return res.status(401).json({ success: false, message: '关联CRM用户不存在' });
    }

    if (user.status !== 'active') {
      return res.status(401).json({ success: false, message: '用户账户已被禁用' });
    }

    const { JwtConfig } = await import('../../config/jwt');

    const newToken = JwtConfig.generateAccessToken({
      userId: user.id,
      username: user.username,
      role: user.roleId || user.role,
      departmentId: user.departmentId,
      tenantId: sidebarUser.tenantId || user.tenantId || ''
    } as any);

    const refreshToken = JwtConfig.generateRefreshToken({
      userId: user.id,
      tenantId: sidebarUser.tenantId || user.tenantId || ''
    } as any);

    res.json({
      success: true,
      data: {
        token: newToken,
        refreshToken,
        user: {
          id: user.id,
          name: user.name || user.username,
          username: user.username,
          avatar: user.avatar || '',
          role: user.roleId || user.role,
          tenantId: sidebarUser.tenantId || user.tenantId || '',
          permissions: (user as any).permissions || [],
          departmentId: user.departmentId || ''
        }
      }
    });
  } catch (error: any) {
    log.error('[H5 Auth] exchange-token error:', error.message);
    res.status(500).json({ success: false, message: 'token交换失败' });
  }
});

export default router;
