/**
 * 订阅管理公开API路由
 * 提供创建订阅、查询状态、取消订阅、签约/扣款回调
 */
import { Router, Request, Response } from 'express';
import { subscriptionService } from '../../services/SubscriptionService';
import { memberAuth } from '../../middleware/memberAuth';
import { log } from '../../config/logger';

const router = Router();

/**
 * 创建订阅（发起签约）
 * POST /api/v1/public/subscription/create
 */
router.post('/create', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const { packageId, channel, billingCycle } = req.body;

    if (!packageId || !channel) {
      return res.status(400).json({ code: 1, message: '参数不完整' });
    }

    if (!['wechat', 'alipay'].includes(channel)) {
      return res.status(400).json({ code: 1, message: '不支持的订阅渠道' });
    }

    const result = await subscriptionService.createSubscription({
      tenantId,
      packageId: Number(packageId),
      channel,
      billingCycle: billingCycle || 'monthly'
    });

    res.json({
      code: 0,
      message: '请完成签约授权',
      data: result
    });
  } catch (error: any) {
    log.error('[Subscription] 创建订阅失败:', error.message);
    res.status(400).json({ code: 1, message: error.message || '创建订阅失败' });
  }
});

/**
 * 查询当前订阅状态
 * GET /api/v1/public/subscription/status
 */
router.get('/status', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const subscription = await subscriptionService.getSubscription(tenantId);

    res.json({
      code: 0,
      data: subscription
    });
  } catch (error: any) {
    log.error('[Subscription] 查询订阅失败:', error.message);
    res.status(500).json({ code: 1, message: '查询失败' });
  }
});

/**
 * 取消订阅
 * POST /api/v1/public/subscription/cancel
 */
router.post('/cancel', memberAuth, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant.id;
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ code: 1, message: '参数不完整' });
    }

    const result = await subscriptionService.cancelSubscription(subscriptionId, tenantId);
    res.json({
      code: result.success ? 0 : 1,
      message: result.message,
      data: { effectiveDate: result.effectiveDate }
    });
  } catch (error: any) {
    log.error('[Subscription] 取消订阅失败:', error.message);
    res.status(500).json({ code: 1, message: '操作失败' });
  }
});

/**
 * 模拟签约成功（仅开发环境）
 * POST /api/v1/public/subscription/mock-sign
 */
router.post('/mock-sign', async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ code: 1, message: '生产环境不支持' });
    }
    const { subscriptionId } = req.body;
    await subscriptionService.mockSignSuccess(subscriptionId);
    res.json({ code: 0, message: '模拟签约成功' });
  } catch (error: any) {
    res.status(400).json({ code: 1, message: error.message });
  }
});

// ==================== 签约回调 ====================

/**
 * 微信签约结果回调
 * POST /api/v1/public/subscription/sign-notify/wechat
 */
router.post('/sign-notify/wechat', async (req: Request, res: Response) => {
  try {
    log.info('[Subscription] 收到微信签约回调:', JSON.stringify(req.body).substring(0, 500));

    const { resource } = req.body;
    if (!resource) {
      return res.json({ code: 'SUCCESS', message: '成功' });
    }

    // 🔑 解密微信V3回调数据（resource 字段是 AES-256-GCM 加密的）
    let data = resource;
    if (resource.ciphertext) {
      try {
        const { wechatPayService } = await import('../../services/WechatPayService');
        const config = await (wechatPayService as any).getConfig();
        data = wechatPayService.decryptCallbackData(
          resource.ciphertext, resource.associated_data || '', resource.nonce, config.apiKeyV3 || config.apiKey
        );
        log.info('[Subscription] 微信签约回调解密成功:', JSON.stringify(data).substring(0, 300));
      } catch (decryptErr: any) {
        log.error('[Subscription] 微信签约回调解密失败，尝试直接使用resource:', decryptErr.message);
        data = resource;
      }
    }

    const contractCode = data.out_contract_code || data.contract_code;
    const contractId = data.contract_id;
    const changeType = data.change_type;

    if (changeType === 'ADD' && contractCode && contractId) {
      await subscriptionService.handleSignSuccess(contractCode, contractId, 'wechat');
    } else if (changeType === 'DELETE') {
      const unsignId = contractCode || contractId;
      if (unsignId) {
        await subscriptionService.handlePlatformUnsign(unsignId, 'wechat');
      }
    }

    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error: any) {
    log.error('[Subscription] 微信签约回调处理失败:', error.message);
    res.json({ code: 'SUCCESS', message: '成功' });
  }
});

/**
 * 支付宝签约结果回调
 * POST /api/v1/public/subscription/sign-notify/alipay
 */
router.post('/sign-notify/alipay', async (req: Request, res: Response) => {
  try {
    log.info('[Subscription] 收到支付宝签约回调:', JSON.stringify(req.body).substring(0, 500));

    const { external_agreement_no, agreement_no, status } = req.body;

    if (status === 'NORMAL' && external_agreement_no && agreement_no) {
      await subscriptionService.handleSignSuccess(external_agreement_no, agreement_no, 'alipay');
    } else if (status === 'UNSIGN') {
      // 支付宝平台侧解约（用户在支付宝中取消了代扣协议）
      const unsignId = external_agreement_no || agreement_no;
      if (unsignId) {
        await subscriptionService.handlePlatformUnsign(unsignId, 'alipay');
      }
    }

    res.send('success');
  } catch (error: any) {
    log.error('[Subscription] 支付宝签约回调处理失败:', error.message);
    res.send('success');
  }
});

// ==================== 扣款回调 ====================

/**
 * 微信扣款结果回调
 * POST /api/v1/public/subscription/deduct-notify/wechat
 */
router.post('/deduct-notify/wechat', async (req: Request, res: Response) => {
  try {
    log.info('[Subscription] 收到微信扣款回调:', JSON.stringify(req.body).substring(0, 500));

    const { resource } = req.body;
    if (resource) {
      // 🔑 解密微信V3回调数据
      let data = resource;
      if (resource.ciphertext) {
        try {
          const { wechatPayService } = await import('../../services/WechatPayService');
          const config = await (wechatPayService as any).getConfig();
          data = wechatPayService.decryptCallbackData(
            resource.ciphertext, resource.associated_data || '', resource.nonce, config.apiKeyV3 || config.apiKey
          );
          log.info('[Subscription] 微信扣款回调解密成功:', JSON.stringify(data).substring(0, 300));
        } catch (decryptErr: any) {
          log.error('[Subscription] 微信扣款回调解密失败，尝试直接使用resource:', decryptErr.message);
          data = resource;
        }
      }

      const tradeNo = data.transaction_id;
      const tradeState = data.trade_state;
      const success = tradeState === 'SUCCESS';
      await subscriptionService.handleDeductCallback(tradeNo, success, 'wechat', data);
    }

    res.json({ code: 'SUCCESS', message: '成功' });
  } catch (error: any) {
    log.error('[Subscription] 微信扣款回调失败:', error.message);
    res.json({ code: 'SUCCESS', message: '成功' });
  }
});

/**
 * 支付宝扣款结果回调
 * POST /api/v1/public/subscription/deduct-notify/alipay
 */
router.post('/deduct-notify/alipay', async (req: Request, res: Response) => {
  try {
    log.info('[Subscription] 收到支付宝扣款回调:', JSON.stringify(req.body).substring(0, 500));

    const { trade_no, trade_status } = req.body;
    if (trade_no) {
      const success = trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED';
      await subscriptionService.handleDeductCallback(trade_no, success, 'alipay', req.body);
    }

    res.send('success');
  } catch (error: any) {
    log.error('[Subscription] 支付宝扣款回调失败:', error.message);
    res.send('success');
  }
});

export default router;

