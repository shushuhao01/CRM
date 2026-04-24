/**
 * 订阅服务 — 核心业务逻辑
 * 管理订阅签约、扣款、取消、状态流转
 * 对接微信委托代扣(PAPPAY)和支付宝周期扣款
 */
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { log } from '../config/logger';
import { adminNotificationService } from './AdminNotificationService';
import { formatDateTime } from '../utils/dateFormat';
import { decryptPaymentConfig } from '../utils/paymentCrypto';

function decryptConfig(encrypted: string): string {
  return decryptPaymentConfig(encrypted);
}

export class SubscriptionService {

  /**
   * 获取微信支付配置
   */
  private async getWechatConfig(): Promise<any> {
    const rows = await AppDataSource.query(
      'SELECT config_data, notify_url FROM payment_configs WHERE pay_type = ? AND enabled = 1', ['wechat']
    );
    if (rows.length === 0) throw new Error('微信支付配置不存在');
    return { ...JSON.parse(decryptConfig(rows[0].config_data)), notifyUrl: rows[0].notify_url };
  }

  /**
   * 获取支付宝配置
   */
  private async getAlipayConfig(): Promise<any> {
    const rows = await AppDataSource.query(
      'SELECT config_data, notify_url FROM payment_configs WHERE pay_type = ? AND enabled = 1', ['alipay']
    );
    if (rows.length === 0) throw new Error('支付宝配置不存在');
    return { ...JSON.parse(decryptConfig(rows[0].config_data)), notifyUrl: rows[0].notify_url };
  }

  /**
   * 创建订阅（发起签约）
   */
  async createSubscription(params: {
    tenantId: string;
    packageId: number;
    channel: 'wechat' | 'alipay';
    billingCycle: 'monthly' | 'yearly';
  }): Promise<{ subscriptionId: string; signUrl: string; signType: string }> {
    // 检查是否已有活跃订阅
    const existing = await AppDataSource.query(
      "SELECT s.id, s.package_id, s.billing_cycle, s.amount, s.channel FROM subscriptions s WHERE s.tenant_id = ? AND s.status IN ('active','signing')",
      [params.tenantId]
    );

    if (existing.length > 0) {
      const oldSub = existing[0];

      // 如果目标套餐和当前订阅相同且周期相同，视为续订
      // 允许同套餐续订，新订阅周期从当前到期日后开始计算
      if (Number(oldSub.package_id) === Number(params.packageId) && oldSub.billing_cycle === params.billingCycle) {
        // 同套餐同周期 → 允许续订，自动取消旧订阅
        log.info(`[Subscription] 同套餐续订：取消旧订阅 ${oldSub.id}，创建新续订 packageId=${params.packageId}`);
        await AppDataSource.query(
          "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = '续订自动取消旧订阅' WHERE id = ?",
          [oldSub.id]
        );
      } else {
        // 查询旧套餐和新套餐信息，判断是否为升级
        const [oldPkgs, newPkgs] = await Promise.all([
          AppDataSource.query('SELECT id, price, max_users, max_storage_gb FROM tenant_packages WHERE id = ?', [oldSub.package_id]),
          AppDataSource.query('SELECT id, price, max_users, max_storage_gb FROM tenant_packages WHERE id = ?', [params.packageId])
        ]);

        if (oldPkgs.length > 0 && newPkgs.length > 0) {
          const oldPkg = oldPkgs[0];
          const newPkg = newPkgs[0];
          const isUpgrade =
            Number(newPkg.price) > Number(oldPkg.price) ||
            Number(newPkg.max_users) > Number(oldPkg.max_users) ||
            Number(newPkg.max_storage_gb) > Number(oldPkg.max_storage_gb) ||
            (oldSub.billing_cycle === 'monthly' && params.billingCycle === 'yearly');

          if (!isUpgrade) {
            throw new Error('不支持降级订阅，如需降级请联系客服');
          }
        }

        // 是升级 → 自动取消旧订阅
        log.info(`[Subscription] 升级订阅：取消旧订阅 ${oldSub.id}，创建新订阅 packageId=${params.packageId}`);
        await AppDataSource.query(
          "UPDATE subscriptions SET status = 'cancelled', cancelled_at = NOW(), cancel_reason = '升级到新套餐自动取消' WHERE id = ?",
          [oldSub.id]
        );
      }
    }

    // 查询套餐信息
    const pkgs = await AppDataSource.query(
      'SELECT id, price, name, subscription_enabled, subscription_channels, subscription_discount_rate FROM tenant_packages WHERE id = ?',
      [params.packageId]
    );
    if (pkgs.length === 0) throw new Error('套餐不存在');
    const pkg = pkgs[0];

    if (!pkg.subscription_enabled) {
      throw new Error('该套餐不支持订阅模式');
    }

    // 检查渠道是否支持
    if (pkg.subscription_channels !== 'all' && pkg.subscription_channels !== params.channel) {
      throw new Error(`该套餐不支持${params.channel === 'wechat' ? '微信' : '支付宝'}订阅渠道`);
    }

    // 计算订阅金额
    const discountRate = Number(pkg.subscription_discount_rate) || 0;
    let amount = Number(pkg.price);
    if (params.billingCycle === 'yearly') {
      amount = amount * 12;
    }
    if (discountRate > 0) {
      amount = amount * (1 - discountRate / 100);
    }
    amount = Number(amount.toFixed(2));

    // 创建订阅记录
    const subscriptionId = uuidv4();
    const now = new Date();

    // 计算下次扣款日期：如果租户当前套餐未过期，从到期日开始；否则从现在开始
    let nextDeductDate = new Date(now);
    try {
      const tenantRows = await AppDataSource.query(
        'SELECT expire_date FROM tenants WHERE id = ?', [params.tenantId]
      );
      if (tenantRows.length > 0 && tenantRows[0].expire_date) {
        const currentExpire = new Date(tenantRows[0].expire_date);
        if (currentExpire > now) {
          nextDeductDate = currentExpire;
          log.info(`[Subscription] 续订模式：下次扣款日期从当前到期日 ${tenantRows[0].expire_date} 开始`);
        }
      }
    } catch {
      // 查询失败则使用当前时间
    }

    await AppDataSource.query(
      `INSERT INTO subscriptions (id, tenant_id, package_id, status, channel, amount, billing_cycle, next_deduct_date, source, created_at)
       VALUES (?, ?, ?, 'signing', ?, ?, ?, ?, 'register', NOW())`,
      [subscriptionId, params.tenantId, params.packageId, params.channel, amount, params.billingCycle, nextDeductDate]
    );

    // 调用第三方签约接口
    let signUrl = '';
    let signType = 'h5';

    try {
      if (params.channel === 'wechat') {
        const result = await this.createWechatContract(subscriptionId, params.tenantId, pkg.name, amount, params.billingCycle);
        signUrl = result.signUrl;
        signType = result.signType;
        // 保存微信计划编号
        if (result.planId) {
          await AppDataSource.query(
            'UPDATE subscriptions SET wechat_plan_id = ? WHERE id = ?',
            [result.planId, subscriptionId]
          );
        }
      } else {
        const result = await this.createAlipayAgreement(subscriptionId, params.tenantId, pkg.name, amount, params.billingCycle);
        signUrl = result.signUrl;
        signType = result.signType;
      }
    } catch (signError: any) {
      log.error('[Subscription] 签约接口调用失败:', signError.message);
      // 签约失败，生成模拟签约链接（开发环境）
      if (process.env.NODE_ENV !== 'production') {
        signUrl = `${process.env.WEBSITE_URL || 'http://localhost:8080'}/member/subscription?mock_sign=${subscriptionId}`;
        signType = 'mock';
        log.info('[Subscription] 开发环境使用模拟签约链接');
      } else {
        // 删除签约记录
        await AppDataSource.query('DELETE FROM subscriptions WHERE id = ?', [subscriptionId]);
        throw new Error('签约失败，请稍后重试');
      }
    }

    // 发送管理员通知：新订阅签约
    try {
      const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [params.tenantId]);
      const tenantName = tenantRows[0]?.name || params.tenantId;
      const contactName = tenantRows[0]?.contact || '';
      await adminNotificationService.notify('subscription_created', {
        title: `新订阅签约：${tenantName}`,
        content: `租户「${tenantName}」（联系人：${contactName}）发起了${params.billingCycle === 'yearly' ? '年付' : '月付'}订阅签约，套餐：${pkg.name}，金额：¥${amount}/${params.billingCycle === 'yearly' ? '年' : '月'}，渠道：${params.channel === 'wechat' ? '微信代扣' : '支付宝'}`,
        relatedId: subscriptionId,
        relatedType: 'subscription',
        extraData: { tenantId: params.tenantId, tenantName, packageName: pkg.name, amount, channel: params.channel, billingCycle: params.billingCycle }
      });
    } catch (notifyErr: any) {
      log.error('[Subscription] 发送新签约通知失败:', notifyErr.message);
    }

    return { subscriptionId, signUrl, signType };
  }

  /**
   * 微信委托代扣签约 (PAPPAY V3)
   */
  private async createWechatContract(
    subscriptionId: string,
    tenantId: string,
    packageName: string,
    amount: number,
    billingCycle: string
  ): Promise<{ signUrl: string; signType: string; planId?: string }> {
    const config = await this.getWechatConfig();

    if (!config.appId || !config.mchId || !config.apiKeyV3) {
      throw new Error('微信支付配置不完整，无法发起委托代扣签约');
    }

    // 代扣计划编号（与套餐关联）
    const planId = `PLAN_${billingCycle.toUpperCase()}_${Date.now()}`;

    const requestData = {
      appid: config.appId,
      plan_id: planId,
      out_contract_code: subscriptionId,
      contract_display_account: tenantId.substring(0, 8),
      notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/sign-notify/wechat`,
      contract_notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/sign-notify/wechat`,
      request_serial: Date.now().toString(),
      contract_info: {
        contract_code: subscriptionId,
        contract_display_account: `云客CRM-${packageName}`,
        mchid: config.mchId,
        plan_id: planId,
        request_serial: Date.now().toString(),
        contract_notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/sign-notify/wechat`
      }
    };

    try {
      // 生成签名
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');
      const body = JSON.stringify(requestData);
      const signStr = `POST\n/v3/papay/sign/contracts\n${timestamp}\n${nonce}\n${body}\n`;
      const hmac = crypto.createHmac('sha256', config.apiKeyV3);
      hmac.update(signStr);
      const signature = hmac.digest('hex');

      const response = await axios.post(
        'https://api.mch.weixin.qq.com/v3/papay/sign/contracts',
        requestData,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
          },
          timeout: 15000
        }
      );

      if (response.data?.sign_url) {
        return { signUrl: response.data.sign_url, signType: 'h5', planId };
      }
      throw new Error(response.data?.message || '微信签约接口返回异常');
    } catch (error: any) {
      log.error('[Subscription] 微信签约API失败:', error.response?.data || error.message);
      throw error;
    }
  }

  /**
   * 支付宝周期扣款签约
   */
  private async createAlipayAgreement(
    subscriptionId: string,
    _tenantId: string,
    packageName: string,
    amount: number,
    billingCycle: string
  ): Promise<{ signUrl: string; signType: string }> {
    const config = await this.getAlipayConfig();

    if (!config.appId || !config.privateKey) {
      throw new Error('支付宝配置不完整，无法发起周期扣款签约');
    }

    const period = billingCycle === 'yearly' ? 'YEAR' : 'MONTH';
    const bizContent = {
      personal_product_code: 'CYCLE_PAY_AUTH_P',
      sign_scene: 'INDUSTRY|DIGITAL_MEDIA',
      access_params: { channel: 'QRCODE' },
      period_rule_params: {
        period_type: period,
        period: 1,
        execute_time: new Date().toISOString().split('T')[0],
        single_amount: amount.toFixed(2),
        total_amount: (amount * 120).toFixed(2),
        total_payments: 120
      },
      product_code: 'CYCLE_PAY_AUTH',
      external_agreement_no: subscriptionId,
      sign_notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/sign-notify/alipay`,
      third_party_type: 'PARTNER',
      agreement_effect_type: 'DIRECT',
      external_logon_id: subscriptionId.substring(0, 8),
      memo: `云客CRM ${packageName} 订阅`
    };

    const commonParams: Record<string, string> = {
      app_id: config.appId,
      method: 'alipay.user.agreement.page.sign',
      charset: 'utf-8',
      sign_type: config.signType || 'RSA2',
      timestamp: formatDateTime(new Date()),
      version: '1.0',
      notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/sign-notify/alipay`,
      return_url: `${process.env.WEBSITE_URL || 'http://localhost:8080'}/member/subscription?sign_result=success`,
      biz_content: JSON.stringify(bizContent)
    };

    // 生成签名
    const sortedKeys = Object.keys(commonParams).sort();
    const signContent = sortedKeys.map(k => `${k}=${commonParams[k]}`).join('&');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(signContent);
    const signature = sign.sign(config.privateKey, 'base64');

    const gatewayUrl = config.gatewayUrl || 'https://openapi.alipay.com/gateway.do';
    const allParams = { ...commonParams, sign: signature };
    const queryString = Object.entries(allParams)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');

    return {
      signUrl: `${gatewayUrl}?${queryString}`,
      signType: 'redirect'
    };
  }

  /**
   * 处理签约成功回调
   */
  async handleSignSuccess(subscriptionId: string, contractId: string, channel: 'wechat' | 'alipay'): Promise<void> {
    const subs = await AppDataSource.query('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]);
    if (subs.length === 0) {
      log.error('[Subscription] 签约回调：订阅不存在', subscriptionId);
      return;
    }

    const sub = subs[0];
    if (sub.status !== 'signing') {
      log.warn('[Subscription] 签约回调：订阅状态非signing', sub.status);
      return;
    }

    // 更新合同号和状态
    const now = new Date();
    const nextDeduct = new Date(now);
    if (sub.billing_cycle === 'yearly') {
      nextDeduct.setFullYear(nextDeduct.getFullYear() + 1);
    } else {
      nextDeduct.setMonth(nextDeduct.getMonth() + 1);
    }

    if (channel === 'wechat') {
      await AppDataSource.query(
        `UPDATE subscriptions SET status = 'active', wechat_contract_id = ?, sign_date = NOW(), next_deduct_date = ? WHERE id = ?`,
        [contractId, nextDeduct, subscriptionId]
      );
    } else {
      await AppDataSource.query(
        `UPDATE subscriptions SET status = 'active', alipay_agreement_no = ?, sign_date = NOW(), next_deduct_date = ? WHERE id = ?`,
        [contractId, nextDeduct, subscriptionId]
      );
    }

    // 执行首次扣款（签约即首期）
    await this.executeDeduction(subscriptionId);

    log.info(`[Subscription] 签约成功: ${subscriptionId}, 渠道: ${channel}, 合同: ${contractId}`);

    // 发送管理员通知：订阅已激活
    try {
      const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [sub.tenant_id]);
      const tenantName = tenantRows[0]?.name || sub.tenant_id;
      await adminNotificationService.notify('subscription_activated', {
        title: `订阅已激活：${tenantName}`,
        content: `租户「${tenantName}」的订阅已激活，渠道：${channel === 'wechat' ? '微信代扣' : '支付宝'}，金额：¥${sub.amount}/${sub.billing_cycle === 'yearly' ? '年' : '月'}`,
        relatedId: subscriptionId,
        relatedType: 'subscription',
        extraData: { tenantId: sub.tenant_id, tenantName, channel, amount: sub.amount }
      });
    } catch (notifyErr: any) {
      log.error('[Subscription] 发送激活通知失败:', notifyErr.message);
    }
  }

  /**
   * 执行扣款
   */
  async executeDeduction(subscriptionId: string): Promise<{ success: boolean; message: string }> {
    const subs = await AppDataSource.query('SELECT * FROM subscriptions WHERE id = ?', [subscriptionId]);
    if (subs.length === 0) return { success: false, message: '订阅不存在' };

    const sub = subs[0];
    if (sub.status !== 'active') return { success: false, message: '订阅非活跃状态' };

    const deductLogId = uuidv4();
    const periodNumber = (sub.deduct_count || 0) + 1;
    const now = new Date();
    const billingStart = new Date(now);
    const billingEnd = new Date(now);
    if (sub.billing_cycle === 'yearly') {
      billingEnd.setFullYear(billingEnd.getFullYear() + 1);
    } else {
      billingEnd.setMonth(billingEnd.getMonth() + 1);
    }

    // 创建扣款日志
    await AppDataSource.query(
      `INSERT INTO subscription_deduct_logs
       (id, subscription_id, tenant_id, amount, channel, status, deduct_date, period_number, billing_start, billing_end, created_at)
       VALUES (?, ?, ?, ?, ?, 'pending', CURDATE(), ?, ?, ?, NOW())`,
      [deductLogId, subscriptionId, sub.tenant_id, sub.amount, sub.channel, periodNumber,
       billingStart.toISOString().split('T')[0], billingEnd.toISOString().split('T')[0]]
    );

    try {
      let tradeNo: string;

      if (sub.channel === 'wechat') {
        tradeNo = await this.wechatDeduct(sub);
      } else {
        tradeNo = await this.alipayDeduct(sub);
      }

      // 扣款成功
      await AppDataSource.query(
        `UPDATE subscription_deduct_logs SET status = 'success', trade_no = ?, executed_at = NOW() WHERE id = ?`,
        [tradeNo, deductLogId]
      );

      // 更新订阅信息
      const nextDeduct = new Date(now);
      if (sub.billing_cycle === 'yearly') {
        nextDeduct.setFullYear(nextDeduct.getFullYear() + 1);
      } else {
        nextDeduct.setMonth(nextDeduct.getMonth() + 1);
      }

      await AppDataSource.query(
        `UPDATE subscriptions SET
         last_deduct_date = CURDATE(), next_deduct_date = ?,
         total_deducted = total_deducted + ?, deduct_count = deduct_count + 1,
         fail_count = 0
         WHERE id = ?`,
        [nextDeduct, sub.amount, subscriptionId]
      );

      // 延长租户到期时间 + 同步套餐信息（确保升级/续费全链路生效）
      const pkgRows = await AppDataSource.query(
        'SELECT id, max_users, max_storage_gb, features FROM tenant_packages WHERE id = ?',
        [sub.package_id]
      );
      if (pkgRows.length > 0) {
        const pkg = pkgRows[0];
        let featuresStr: string | null = null;
        if (pkg.features) {
          featuresStr = typeof pkg.features === 'string' ? pkg.features : JSON.stringify(pkg.features);
        }
        await AppDataSource.query(
          `UPDATE tenants SET
            package_id = ?,
            expire_date = ?,
            license_status = 'active',
            status = 'active',
            max_users = ?,
            max_storage_gb = ?,
            features = COALESCE(?, features),
            updated_at = NOW()
          WHERE id = ?`,
          [sub.package_id, billingEnd, pkg.max_users || 3, pkg.max_storage_gb || 10, featuresStr, sub.tenant_id]
        );
      } else {
        // 套餐不存在时仅延长到期日
        await AppDataSource.query(
          `UPDATE tenants SET expire_date = ?, license_status = 'active', status = 'active' WHERE id = ?`,
          [billingEnd, sub.tenant_id]
        );
      }

      log.info(`[Subscription] 扣款成功: ${subscriptionId}, 金额: ${sub.amount}, 交易号: ${tradeNo}`);

      // 清除写入限制缓存，使续费立即生效
      try {
        const { clearLicenseWriteCache } = await import('../middleware/checkLicenseWrite');
        clearLicenseWriteCache(sub.tenant_id);
      } catch (_e) { /* ignore */ }

      // 发送管理员通知：扣款成功
      try {
        const tenantRows3 = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [sub.tenant_id]);
        const tenantName3 = tenantRows3[0]?.name || sub.tenant_id;
        await adminNotificationService.notify('subscription_deduct_success', {
          title: `订阅扣款成功：${tenantName3}`,
          content: `租户「${tenantName3}」的订阅扣款成功，金额：¥${sub.amount}，渠道：${sub.channel === 'wechat' ? '微信代扣' : '支付宝'}，交易号：${tradeNo}，下次扣款日：${nextDeduct.toISOString().split('T')[0]}`,
          relatedId: subscriptionId,
          relatedType: 'subscription',
          extraData: { tenantId: sub.tenant_id, tenantName: tenantName3, amount: sub.amount, tradeNo, nextDeductDate: nextDeduct.toISOString().split('T')[0] }
        });
      } catch (_notifyErr) {}

      return { success: true, message: '扣款成功' };

    } catch (error: any) {
      log.error(`[Subscription] 扣款失败: ${subscriptionId}`, error.message);

      // 扣款失败
      const retryCount = 0;
      const nextRetryAt = new Date(now);
      nextRetryAt.setDate(nextRetryAt.getDate() + 1); // 1天后重试

      await AppDataSource.query(
        `UPDATE subscription_deduct_logs SET status = 'failed', error_code = ?, error_msg = ?,
         retry_count = ?, next_retry_at = ?, executed_at = NOW()
         WHERE id = ?`,
        ['DEDUCT_FAILED', error.message?.substring(0, 500), retryCount, nextRetryAt, deductLogId]
      );

      // 更新订阅失败计数
      await AppDataSource.query(
        'UPDATE subscriptions SET fail_count = fail_count + 1 WHERE id = ?',
        [subscriptionId]
      );

      // 检查连续失败次数
      const updated = await AppDataSource.query('SELECT fail_count FROM subscriptions WHERE id = ?', [subscriptionId]);
      if (updated.length > 0 && updated[0].fail_count >= 3) {
        await AppDataSource.query(
          "UPDATE subscriptions SET status = 'paused' WHERE id = ?",
          [subscriptionId]
        );
        log.warn(`[Subscription] 连续扣款失败3次，订阅已暂停: ${subscriptionId}`);

        // 发送管理员通知：订阅暂停
        try {
          const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [sub.tenant_id]);
          const tenantName = tenantRows[0]?.name || sub.tenant_id;
          await adminNotificationService.notify('subscription_paused', {
            title: `订阅已暂停：${tenantName}`,
            content: `租户「${tenantName}」的订阅因连续3次扣款失败已自动暂停，渠道：${sub.channel === 'wechat' ? '微信代扣' : '支付宝'}，金额：¥${sub.amount}，请关注并联系客户处理`,
            relatedId: subscriptionId,
            relatedType: 'subscription',
            extraData: { tenantId: sub.tenant_id, tenantName, failCount: 3 }
          });
        } catch (_notifyErr) {}
      }

      // 发送管理员通知：扣款失败
      try {
        const tenantRows2 = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [sub.tenant_id]);
        const tenantName2 = tenantRows2[0]?.name || sub.tenant_id;
        await adminNotificationService.notify('subscription_deduct_failed', {
          title: `订阅扣款失败：${tenantName2}`,
          content: `租户「${tenantName2}」的订阅扣款失败，金额：¥${sub.amount}，渠道：${sub.channel === 'wechat' ? '微信' : '支付宝'}，原因：${error.message?.substring(0, 200)}`,
          relatedId: subscriptionId,
          relatedType: 'subscription',
          extraData: { tenantId: sub.tenant_id, tenantName: tenantName2, amount: sub.amount, error: error.message?.substring(0, 200) }
        });
      } catch (_notifyErr) {}

      return { success: false, message: error.message };
    }
  }

  /**
   * 微信委托代扣
   */
  private async wechatDeduct(sub: any): Promise<string> {
    const config = await this.getWechatConfig();

    if (!config.appId || !config.mchId || !config.apiKeyV3 || !sub.wechat_contract_id) {
      // 开发环境模拟
      if (process.env.NODE_ENV !== 'production') {
        log.info('[Subscription] 开发环境模拟微信扣款成功');
        return `MOCK_WX_${Date.now()}`;
      }
      throw new Error('微信委托代扣配置不完整');
    }

    const orderNo = `SUB_WX_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const requestData = {
      appid: config.appId,
      out_trade_no: orderNo,
      description: '云客CRM订阅扣款',
      notify_url: `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/subscription/deduct-notify/wechat`,
      amount: {
        total: Math.round(Number(sub.amount) * 100),
        currency: 'CNY'
      },
      contract_id: sub.wechat_contract_id
    };

    const timestamp = Math.floor(Date.now() / 1000).toString();
    const nonce = crypto.randomBytes(16).toString('hex');
    const body = JSON.stringify(requestData);
    const signStr = `POST\n/v3/papay/pay/transactions/apply\n${timestamp}\n${nonce}\n${body}\n`;
    const hmac = crypto.createHmac('sha256', config.apiKeyV3);
    hmac.update(signStr);
    const signature = hmac.digest('hex');

    const response = await axios.post(
      'https://api.mch.weixin.qq.com/v3/papay/pay/transactions/apply',
      requestData,
      {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
        },
        timeout: 15000
      }
    );

    if (response.data?.transaction_id) {
      return response.data.transaction_id;
    }
    throw new Error(response.data?.message || '微信扣款返回异常');
  }

  /**
   * 支付宝协议扣款
   */
  private async alipayDeduct(sub: any): Promise<string> {
    const config = await this.getAlipayConfig();

    if (!config.appId || !config.privateKey || !sub.alipay_agreement_no) {
      // 开发环境模拟
      if (process.env.NODE_ENV !== 'production') {
        log.info('[Subscription] 开发环境模拟支付宝扣款成功');
        return `MOCK_ALI_${Date.now()}`;
      }
      throw new Error('支付宝协议扣款配置不完整');
    }

    const orderNo = `SUB_ALI_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const bizContent = {
      out_trade_no: orderNo,
      product_code: 'CYCLE_PAY_AUTH',
      total_amount: Number(sub.amount).toFixed(2),
      subject: '云客CRM订阅扣款',
      agreement_no: sub.alipay_agreement_no
    };

    const commonParams: Record<string, string> = {
      app_id: config.appId,
      method: 'alipay.trade.pay',
      charset: 'utf-8',
      sign_type: config.signType || 'RSA2',
      timestamp: formatDateTime(new Date()),
      version: '1.0',
      biz_content: JSON.stringify(bizContent)
    };

    const sortedKeys = Object.keys(commonParams).sort();
    const signContent = sortedKeys.map(k => `${k}=${commonParams[k]}`).join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent);
    const signature = signer.sign(config.privateKey, 'base64');

    const gatewayUrl = config.gatewayUrl || 'https://openapi.alipay.com/gateway.do';
    const response = await axios.post(gatewayUrl, null, {
      params: { ...commonParams, sign: signature },
      timeout: 15000
    });

    const result = response.data?.alipay_trade_pay_response;
    if (result?.code === '10000' && result?.trade_no) {
      return result.trade_no;
    }
    throw new Error(result?.sub_msg || result?.msg || '支付宝扣款失败');
  }

  /**
   * 取消订阅
   */
  async cancelSubscription(subscriptionId: string, tenantId: string): Promise<{
    success: boolean; message: string; effectiveDate?: string
  }> {
    const subs = await AppDataSource.query(
      "SELECT * FROM subscriptions WHERE id = ? AND tenant_id = ? AND status IN ('active','paused')",
      [subscriptionId, tenantId]
    );
    if (subs.length === 0) {
      return { success: false, message: '未找到有效订阅' };
    }

    const sub = subs[0];

    // 调用第三方解约
    try {
      if (sub.channel === 'wechat' && sub.wechat_contract_id) {
        await this.cancelWechatContract(sub.wechat_contract_id);
      } else if (sub.channel === 'alipay' && sub.alipay_agreement_no) {
        await this.cancelAlipayAgreement(sub.alipay_agreement_no);
      }
    } catch (err: any) {
      log.warn('[Subscription] 第三方解约失败(不影响本地取消):', err.message);
    }

    // 更新状态
    await AppDataSource.query(
      "UPDATE subscriptions SET status = 'cancelled', cancel_date = NOW() WHERE id = ?",
      [subscriptionId]
    );

    // 当前计费周期结束时间
    const effectiveDate = sub.next_deduct_date || new Date().toISOString().split('T')[0];

    log.info(`[Subscription] 取消订阅: ${subscriptionId}, 生效日期: ${effectiveDate}`);

    // 发送管理员通知：订阅取消
    try {
      const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [tenantId]);
      const tenantName = tenantRows[0]?.name || tenantId;
      const contactName = tenantRows[0]?.contact || '';
      await adminNotificationService.notify('subscription_cancelled', {
        title: `订阅已取消：${tenantName}`,
        content: `租户「${tenantName}」（联系人：${contactName}）已取消订阅，渠道：${sub.channel === 'wechat' ? '微信代扣' : '支付宝'}，当前周期服务截止：${effectiveDate}`,
        relatedId: subscriptionId,
        relatedType: 'subscription',
        extraData: { tenantId, tenantName, contactName, channel: sub.channel, effectiveDate }
      });
    } catch (notifyErr: any) {
      log.error('[Subscription] 发送取消通知失败:', notifyErr.message);
    }

    return { success: true, message: '订阅已取消，当前周期内服务仍然有效', effectiveDate };
  }

  /**
   * 处理平台侧解约（微信DELETE/支付宝UNSIGN）
   * 当用户在微信或支付宝客户端主动解约时，平台会回调此方法
   */
  async handlePlatformUnsign(subscriptionId: string, channel: 'wechat' | 'alipay'): Promise<void> {
    // 尝试通过 subscriptionId 找到订阅
    let subs = await AppDataSource.query(
      "SELECT * FROM subscriptions WHERE id = ? AND status IN ('active','signing','paused')", [subscriptionId]
    );

    // 微信可能回调 contract_id 而非 out_contract_code
    if (subs.length === 0 && channel === 'wechat') {
      subs = await AppDataSource.query(
        "SELECT * FROM subscriptions WHERE wechat_contract_id = ? AND status IN ('active','signing','paused')", [subscriptionId]
      );
    }
    // 支付宝可能回调 agreement_no 而非 external_agreement_no
    if (subs.length === 0 && channel === 'alipay') {
      subs = await AppDataSource.query(
        "SELECT * FROM subscriptions WHERE alipay_agreement_no = ? AND status IN ('active','signing','paused')", [subscriptionId]
      );
    }

    if (subs.length === 0) {
      log.warn(`[Subscription] 平台解约回调：未找到匹配的活跃订阅 ${subscriptionId} (${channel})`);
      return;
    }

    const sub = subs[0];

    // 更新状态为已取消
    await AppDataSource.query(
      "UPDATE subscriptions SET status = 'cancelled', cancel_date = NOW(), cancel_reason = ? WHERE id = ?",
      [`${channel === 'wechat' ? '微信' : '支付宝'}平台侧取消`, sub.id]
    );

    log.warn(`[Subscription] 平台侧取消订阅: ${sub.id}, 渠道: ${channel}, 租户: ${sub.tenant_id}`);

    // 发送管理员通知：平台侧取消
    try {
      const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [sub.tenant_id]);
      const tenantName = tenantRows[0]?.name || sub.tenant_id;
      const contactName = tenantRows[0]?.contact || '';
      await adminNotificationService.notify('subscription_platform_cancelled', {
        title: `⚠️ 平台侧取消订阅：${tenantName}`,
        content: `租户「${tenantName}」（联系人：${contactName}）在${channel === 'wechat' ? '微信支付' : '支付宝'}客户端主动解除了订阅代扣协议，金额：¥${sub.amount}/${sub.billing_cycle === 'yearly' ? '年' : '月'}。当前周期服务截止：${sub.next_deduct_date || '未知'}，请关注该客户续费情况`,
        relatedId: sub.id,
        relatedType: 'subscription',
        extraData: { tenantId: sub.tenant_id, tenantName, contactName, channel, amount: sub.amount }
      });
    } catch (notifyErr: any) {
      log.error('[Subscription] 发送平台解约通知失败:', notifyErr.message);
    }
  }

  /**
   * 处理扣款回调结果（异步对账）
   * 当微信/支付宝扣款后异步通知结果时调用
   */
  async handleDeductCallback(tradeNo: string, success: boolean, channel: 'wechat' | 'alipay', callbackData?: any): Promise<void> {
    // 查找对应的扣款日志
    let deductLogs: any[];

    if (tradeNo) {
      deductLogs = await AppDataSource.query(
        "SELECT * FROM subscription_deduct_logs WHERE trade_no = ? ORDER BY created_at DESC LIMIT 1",
        [tradeNo]
      );
    } else {
      deductLogs = await AppDataSource.query(
        "SELECT * FROM subscription_deduct_logs WHERE channel = ? AND status = 'pending' ORDER BY created_at DESC LIMIT 1",
        [channel]
      );
    }

    if (deductLogs.length === 0) {
      log.warn(`[Subscription] 扣款回调：未找到匹配的扣款记录 tradeNo=${tradeNo} channel=${channel}`);
      return;
    }

    const deductLog = deductLogs[0];

    if (success) {
      if (deductLog.status !== 'success') {
        await AppDataSource.query(
          "UPDATE subscription_deduct_logs SET status = 'success', trade_no = COALESCE(?, trade_no), executed_at = NOW() WHERE id = ?",
          [tradeNo, deductLog.id]
        );
        log.info(`[Subscription] 扣款回调确认成功: ${deductLog.id}, tradeNo: ${tradeNo}`);
      }
    } else {
      if (deductLog.status === 'pending') {
        const errorMsg = callbackData?.err_code_des || callbackData?.sub_msg || '平台回调通知扣款失败';
        await AppDataSource.query(
          "UPDATE subscription_deduct_logs SET status = 'failed', error_code = 'CALLBACK_FAILED', error_msg = ?, executed_at = NOW() WHERE id = ?",
          [errorMsg.substring(0, 500), deductLog.id]
        );
        await AppDataSource.query(
          'UPDATE subscriptions SET fail_count = fail_count + 1 WHERE id = ?',
          [deductLog.subscription_id]
        );
        log.warn(`[Subscription] 扣款回调确认失败: ${deductLog.id}, 原因: ${errorMsg}`);
      }
    }
  }

  /**
   * 微信解约
   */
  private async cancelWechatContract(contractId: string): Promise<void> {
    const config = await this.getWechatConfig();
    if (!config.apiKeyV3 || !config.mchId) return;

    try {
      const timestamp = Math.floor(Date.now() / 1000).toString();
      const nonce = crypto.randomBytes(16).toString('hex');
      const body = JSON.stringify({ contract_termination_remark: '用户取消订阅' });
      const url = `/v3/papay/sign/contracts/${contractId}/terminate`;
      const signStr = `POST\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
      const hmac = crypto.createHmac('sha256', config.apiKeyV3);
      hmac.update(signStr);
      const signature = hmac.digest('hex');

      await axios.post(`https://api.mch.weixin.qq.com${url}`, body, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
        },
        timeout: 10000
      });
    } catch (e: any) {
      log.warn('[Subscription] 微信解约API失败:', e.response?.data || e.message);
    }
  }

  /**
   * 支付宝解约
   */
  private async cancelAlipayAgreement(agreementNo: string): Promise<void> {
    const config = await this.getAlipayConfig();
    if (!config.appId || !config.privateKey) return;

    const bizContent = {
      personal_product_code: 'CYCLE_PAY_AUTH_P',
      agreement_no: agreementNo
    };
    const commonParams: Record<string, string> = {
      app_id: config.appId,
      method: 'alipay.user.agreement.unsign',
      charset: 'utf-8',
      sign_type: config.signType || 'RSA2',
      timestamp: formatDateTime(new Date()),
      version: '1.0',
      biz_content: JSON.stringify(bizContent)
    };

    const sortedKeys = Object.keys(commonParams).sort();
    const signContent = sortedKeys.map(k => `${k}=${commonParams[k]}`).join('&');
    const signer = crypto.createSign('RSA-SHA256');
    signer.update(signContent);
    const signature = signer.sign(config.privateKey, 'base64');

    try {
      const gatewayUrl = config.gatewayUrl || 'https://openapi.alipay.com/gateway.do';
      await axios.post(gatewayUrl, null, {
        params: { ...commonParams, sign: signature },
        timeout: 10000
      });
    } catch (e: any) {
      log.warn('[Subscription] 支付宝解约API失败:', e.message);
    }
  }

  /**
   * 查询订阅状态
   */
  async getSubscription(tenantId: string): Promise<any> {
    const subs = await AppDataSource.query(
      `SELECT s.*, tp.name as package_name, tp.code as package_code
       FROM subscriptions s
       LEFT JOIN tenant_packages tp ON s.package_id = tp.id
       WHERE s.tenant_id = ? ORDER BY s.created_at DESC LIMIT 1`,
      [tenantId]
    );
    if (subs.length === 0) return null;

    const sub = subs[0];
    // 查询扣款历史
    const deductLogs = await AppDataSource.query(
      `SELECT * FROM subscription_deduct_logs WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 20`,
      [sub.id]
    );

    return {
      ...sub,
      deductLogs: deductLogs.map((d: any) => ({
        id: d.id,
        amount: Number(d.amount),
        status: d.status,
        tradeNo: d.trade_no,
        deductDate: d.deduct_date,
        periodNumber: d.period_number,
        billingStart: d.billing_start,
        billingEnd: d.billing_end,
        errorMsg: d.error_msg,
        createdAt: d.created_at
      }))
    };
  }

  /**
   * 自动扣款定时任务 — 每天凌晨1点执行
   */
  async runAutoDeduct(): Promise<void> {
    log.info('[Subscription] 开始执行自动扣款...');

    const pendingDeducts = await AppDataSource.query(
      `SELECT id FROM subscriptions WHERE status = 'active' AND next_deduct_date <= CURDATE()`
    );

    if (pendingDeducts.length === 0) {
      log.info('[Subscription] 今日无需扣款');
      return;
    }

    log.info(`[Subscription] 发现 ${pendingDeducts.length} 个待扣款订阅`);

    for (const sub of pendingDeducts) {
      try {
        await this.executeDeduction(sub.id);
      } catch (err: any) {
        log.error(`[Subscription] 自动扣款异常(${sub.id}):`, err.message);
      }
    }

    log.info('[Subscription] 自动扣款执行完毕');
  }

  /**
   * 扣款重试定时任务 — 每天下午2点执行
   * 宽限期策略：第1天重试1次，第3天重试1次，第5天重试1次，第7天仍失败则过期
   */
  async runDeductRetry(): Promise<void> {
    log.info('[Subscription] 开始执行扣款重试...');

    const failedLogs = await AppDataSource.query(
      `SELECT sdl.*, s.id as sub_id
       FROM subscription_deduct_logs sdl
       JOIN subscriptions s ON sdl.subscription_id = s.id
       WHERE sdl.status = 'failed'
       AND sdl.retry_count < sdl.max_retry
       AND sdl.next_retry_at IS NOT NULL
       AND sdl.next_retry_at <= NOW()
       AND s.status IN ('active','paused')`
    );

    if (failedLogs.length === 0) {
      log.info('[Subscription] 无需重试的扣款记录');
      return;
    }

    log.info(`[Subscription] 发现 ${failedLogs.length} 条待重试扣款`);

    for (const failedLog of failedLogs) {
      try {
        const result = await this.executeDeduction(failedLog.subscription_id);
        if (result.success) {
          // 重试成功，更新原失败记录
          await AppDataSource.query(
            "UPDATE subscription_deduct_logs SET status = 'success', executed_at = NOW() WHERE id = ?",
            [failedLog.id]
          );
        } else {
          // 重试失败
          const newRetryCount = (failedLog.retry_count || 0) + 1;
          const nextRetryDays = [1, 2, 2]; // 第1次1天后, 第2次2天后, 第3次2天后
          const nextRetryAt = new Date();
          nextRetryAt.setDate(nextRetryAt.getDate() + (nextRetryDays[newRetryCount - 1] || 2));

          await AppDataSource.query(
            'UPDATE subscription_deduct_logs SET retry_count = ?, next_retry_at = ? WHERE id = ?',
            [newRetryCount, newRetryCount >= 3 ? null : nextRetryAt, failedLog.id]
          );

          // 第3次重试仍失败 → 过期
          if (newRetryCount >= 3) {
            await AppDataSource.query(
              "UPDATE subscriptions SET status = 'expired' WHERE id = ?",
              [failedLog.subscription_id]
            );
            log.warn(`[Subscription] 3次重试均失败，订阅已过期: ${failedLog.subscription_id}`);

            // 发送管理员通知：订阅过期
            try {
              const subRows = await AppDataSource.query('SELECT tenant_id, amount, channel FROM subscriptions WHERE id = ?', [failedLog.subscription_id]);
              if (subRows.length > 0) {
                const tenantRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [subRows[0].tenant_id]);
                const tenantName = tenantRows[0]?.name || subRows[0].tenant_id;
                await adminNotificationService.notify('subscription_expired', {
                  title: `订阅已过期：${tenantName}`,
                  content: `租户「${tenantName}」的订阅因连续3次扣款重试均失败已自动过期，金额：¥${subRows[0].amount}，渠道：${subRows[0].channel === 'wechat' ? '微信' : '支付宝'}，请及时联系客户`,
                  relatedId: failedLog.subscription_id,
                  relatedType: 'subscription',
                  extraData: { tenantId: subRows[0].tenant_id, tenantName }
                });
              }
            } catch (_notifyErr) {}
          }
        }
      } catch (err: any) {
        log.error(`[Subscription] 重试扣款异常(${failedLog.id}):`, err.message);
      }
    }

    log.info('[Subscription] 扣款重试执行完毕');
  }

  /**
   * 模拟签约成功（开发环境）
   */
  async mockSignSuccess(subscriptionId: string): Promise<void> {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('生产环境不支持模拟签约');
    }
    const mockContractId = `MOCK_CONTRACT_${Date.now()}`;
    const subs = await AppDataSource.query('SELECT channel FROM subscriptions WHERE id = ?', [subscriptionId]);
    if (subs.length === 0) throw new Error('订阅不存在');
    await this.handleSignSuccess(subscriptionId, mockContractId, subs[0].channel);
  }
}

export const subscriptionService = new SubscriptionService();

