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
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: '缺少url参数' });

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
    const signature = WecomApiService.generateJsSdkSignature(corpTicket, nonceStr, timestamp, String(url));

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
    const { url } = req.query;
    if (!url) return res.status(400).json({ success: false, message: '缺少url参数' });

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
    const signature = WecomApiService.generateJsSdkSignature(agentTicket, nonceStr, timestamp, String(url));

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

export default router;
