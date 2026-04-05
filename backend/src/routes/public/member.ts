/**
 * 会员中心公开API路由
 * 提供会员登录、资料管理、账单查询等功能
 */
import { Router, Request, Response } from 'express';
import { memberService } from '../../services/MemberService';
import { memberAuth } from '../../middleware/memberAuth';
import { verificationCodeService } from '../../services/VerificationCodeService';
import { aliyunSmsService } from '../../services/AliyunSmsService';
import { log } from '../../config/logger';

const router = Router();

/**
 * 会员登录
 * POST /api/v1/public/member/login
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { phone, loginType, password, code, tenantId } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ code: 1, message: '请输入正确的手机号' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    if (loginType === 'sms_code') {
      if (!code) {
        return res.status(400).json({ code: 1, message: '请输入验证码' });
      }
      const result = await memberService.loginByCode(phone, code, ip, userAgent, tenantId);
      return res.json({ code: result.success ? 0 : 1, message: result.message, data: result.data });
    } else {
      // 默认密码登录
      if (!password) {
        return res.status(400).json({ code: 1, message: '请输入密码' });
      }
      const result = await memberService.loginByPassword(phone, password, ip, userAgent, tenantId);
      return res.json({ code: result.success ? 0 : 1, message: result.message, data: result.data });
    }
  } catch (error: any) {
    log.error('[Member] 登录失败:', error);
    res.status(500).json({ code: 1, message: '登录失败' });
  }
});

/**
 * 🔒 多租户选择登录（验证码登录+多租户时，使用selectToken完成登录）
 * POST /api/v1/public/member/select-tenant
 */
router.post('/select-tenant', async (req: Request, res: Response) => {
  try {
    const { phone, selectToken, tenantId } = req.body;

    if (!phone || !selectToken || !tenantId) {
      return res.status(400).json({ code: 1, message: '参数不完整' });
    }

    const ip = (req.headers['x-forwarded-for'] as string)?.split(',')[0] || req.ip;
    const userAgent = req.headers['user-agent'];

    const result = await memberService.loginBySelectToken(phone, selectToken, tenantId, ip, userAgent);
    return res.json({ code: result.success ? 0 : 1, message: result.message, data: result.data });
  } catch (error: any) {
    log.error('[Member] 选择租户登录失败:', error);
    res.status(500).json({ code: 1, message: '操作失败' });
  }
});

/**
 * 发送验证码（复用注册验证码服务）
 * POST /api/v1/public/member/send-code
 */
router.post('/send-code', async (req: Request, res: Response) => {
  try {
    const { phone } = req.body;

    if (!phone || !/^1[3-9]\d{9}$/.test(phone)) {
      return res.status(400).json({ code: 1, message: '请输入正确的手机号' });
    }

    const canSend = await verificationCodeService.canSendCode(phone);
    if (!canSend.canSend) {
      return res.status(400).json({ code: 1, message: canSend.message || '发送过于频繁' });
    }

    // 开发环境
    if (process.env.NODE_ENV !== 'production') {
      const devCode = '123456';
      await verificationCodeService.saveCode(phone, devCode);
      return res.json({ code: 0, message: '验证码发送成功（开发环境：123456）' });
    }

    // 生产环境
    const smsCode = Math.floor(100000 + Math.random() * 900000).toString();
    const dbLoaded = await aliyunSmsService.loadFromDatabase();
    if (!dbLoaded) aliyunSmsService.loadFromEnv();

    const result = await aliyunSmsService.sendVerificationCode(phone, smsCode);
    if (!result.success) {
      return res.status(500).json({ code: 1, message: result.message || '发送失败' });
    }

    await verificationCodeService.saveCode(phone, smsCode);
    res.json({ code: 0, message: '验证码发送成功' });
  } catch (error: any) {
    log.error('[Member] 发送验证码失败:', error);
    res.status(500).json({ code: 1, message: '发送失败' });
  }
});

/**
 * 设置/重置密码（需验证码）
 * POST /api/v1/public/member/set-password
 */
router.post('/set-password', async (req: Request, res: Response) => {
  try {
    const { phone, code, password, tenantId } = req.body;

    if (!phone || !code || !password) {
      return res.status(400).json({ code: 1, message: '参数不完整' });
    }

    const result = await memberService.setPassword(phone, code, password, tenantId);
    res.json({ code: result.success ? 0 : 1, message: result.message });
  } catch (error: any) {
    log.error('[Member] 设置密码失败:', error);
    res.status(500).json({ code: 1, message: '操作失败' });
  }
});

// ==================== 以下接口需要会员认证 ====================

/**
 * 获取会员资料
 * GET /api/v1/public/member/profile
 */
router.get('/profile', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const profile = await memberService.getProfile(tenantId);

    if (!profile) {
      return res.status(404).json({ code: 1, message: '获取资料失败' });
    }

    res.json({ code: 0, data: profile });
  } catch (error: any) {
    log.error('[Member] 获取资料失败:', error);
    res.status(500).json({ code: 1, message: '获取失败' });
  }
});

/**
 * 修改会员资料
 * PUT /api/v1/public/member/profile
 */
router.put('/profile', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const { name, contact, email } = req.body;

    const result = await memberService.updateProfile(tenantId, { name, contact, email });
    res.json({ code: result.success ? 0 : 1, message: result.message });
  } catch (error: any) {
    log.error('[Member] 修改资料失败:', error);
    res.status(500).json({ code: 1, message: '修改失败' });
  }
});

/**
 * 查询账单
 * GET /api/v1/public/member/bills
 */
router.get('/bills', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const orderNo = (req.query.orderNo as string) || '';
    const startDate = (req.query.startDate as string) || '';
    const endDate = (req.query.endDate as string) || '';

    const filters = { orderNo, startDate, endDate };
    const bills = await memberService.getBills(tenantId, page, pageSize, filters);
    res.json({ code: 0, data: bills });
  } catch (error: any) {
    log.error('[Member] 查询账单失败:', error);
    res.status(500).json({ code: 1, message: '查询失败' });
  }
});

/**
 * 获取授权信息
 * GET /api/v1/public/member/license
 */
router.get('/license', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const logPage = parseInt(req.query.logPage as string) || 1;
    const logPageSize = parseInt(req.query.logPageSize as string) || 10;
    const license = await memberService.getLicense(tenantId, logPage, logPageSize);

    if (!license) {
      return res.status(404).json({ code: 1, message: '获取授权信息失败' });
    }

    res.json({ code: 0, data: license });
  } catch (error: any) {
    log.error('[Member] 获取授权失败:', error);
    res.status(500).json({ code: 1, message: '获取失败' });
  }
});

/**
 * 修改密码（已登录状态）
 * POST /api/v1/public/member/change-password
 */
router.post('/change-password', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const { oldPassword, newPassword } = req.body;

    if (!newPassword) {
      return res.status(400).json({ code: 1, message: '请输入新密码' });
    }

    const result = await memberService.changePassword(tenantId, oldPassword || '', newPassword);
    res.json({ code: result.success ? 0 : 1, message: result.message });
  } catch (error: any) {
    log.error('[Member] 修改密码失败:', error);
    res.status(500).json({ code: 1, message: '操作失败' });
  }
});

/**
 * 退出登录
 * POST /api/v1/public/member/logout
 */
router.post('/logout', (_req: Request, res: Response) => {
  // JWT是无状态的，前端清除token即可
  res.json({ code: 0, message: '退出成功' });
});

export default router;

