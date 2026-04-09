/**
 * 公开API路由索引
 * 这些接口不需要认证，用于官网注册、支付等功能
 */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import registerRoutes from './register';
import packagesRoutes from './packages';
import paymentRoutes from './payment';
import licenseQueryRoutes from './license-query';
import websiteConfigRoutes from './website-config';
import versionCheckRoutes from './version-check';
import memberRoutes from './member';
import subscriptionRoutes from './subscription';
import capacityRoutes from './capacity';

const router = Router();

// 🔒 敏感公开接口专用限流 — 防止批量注册、验证码轰炸、恶意下单
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 10, // 每IP每小时最多10次注册
  message: { code: 429, message: '注册请求过于频繁，请1小时后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const sendCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1小时
  max: 15, // 每IP每小时最多15次验证码请求
  message: { code: 429, message: '验证码发送过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const paymentLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 20, // 每IP每15分钟最多20次支付请求
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

const memberLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 30, // 每IP每15分钟最多30次登录尝试
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 注册相关接口（带专用限流）
router.use('/register/send-code', sendCodeLimiter);
router.use('/register', registerLimiter, registerRoutes);

// 套餐查询接口（只读，无需严格限流）
router.use('/packages', packagesRoutes);

// 支付相关接口（带专用限流）
router.use('/payment', paymentLimiter, paymentRoutes);

// 会员中心接口（登录带限流）
router.use('/member/login', memberLoginLimiter);
router.use('/member/send-code', sendCodeLimiter);
router.use('/member', memberRoutes);

// 订阅管理接口
router.use('/subscription', subscriptionRoutes);

// 扩容管理接口
router.use('/capacity', capacityRoutes);

// 授权查询接口（供私有部署系统调用）
router.use('/license-query', licenseQueryRoutes);

// 官网配置接口
router.use('/website-config', websiteConfigRoutes);

// 版本检查接口（供私有客户和SaaS租户检查更新）
router.use('/version-check', versionCheckRoutes);

export default router;
