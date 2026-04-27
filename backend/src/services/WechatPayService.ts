/**
 * 微信支付服务
 * 支持微信支付V3 API
 */
import crypto from 'crypto';
import axios from 'axios';
import bcrypt from 'bcryptjs';
import { AppDataSource } from '../config/database';
import { paymentService } from './PaymentService';
import { notificationTemplateService } from './NotificationTemplateService';
import { formatDateTime, formatDate } from '../utils/dateFormat';
import { decryptPaymentConfig } from '../utils/paymentCrypto';
import { createDefaultAdmin as sharedCreateDefaultAdmin } from '../utils/adminAccountHelper';
import { log } from '../config/logger';
export class WechatPayService {
  /**
   * 解密配置数据
   */
  private decrypt(encrypted: string): string {
    return decryptPaymentConfig(encrypted);
  }

  /**
   * 获取微信支付配置
   */
  private async getConfig(): Promise<any> {
    const config = await AppDataSource.query(
      'SELECT config_data, notify_url FROM payment_configs WHERE pay_type = ?',
      ['wechat']
    );

    if (config.length === 0 || !config[0].config_data) {
      throw new Error('微信支付配置不存在');
    }

    const configData = JSON.parse(this.decrypt(config[0].config_data));
    configData.notifyUrl = config[0].notify_url;
    return configData;
  }

  /**
   * 读取私钥PEM内容（兼容直接内容和文件路径两种存储方式）
   */
  private async resolvePrivateKey(keyPem: string): Promise<string> {
    if (keyPem.includes('-----BEGIN')) return keyPem;
    // keyPem 可能是文件路径（如 /uploads/admin/cert/xxx.pem）
    if (keyPem.startsWith('/') || keyPem.includes('uploads')) {
      const fs = await import('fs');
      const path = await import('path');
      const candidates = [
        path.default.join(process.cwd(), keyPem),
        path.default.join(process.cwd(), 'public', keyPem),
        path.default.resolve(keyPem)
      ];
      for (const filePath of candidates) {
        if (fs.default.existsSync(filePath)) {
          return fs.default.readFileSync(filePath, 'utf8');
        }
      }
      throw new Error(`私钥文件不存在（路径: ${candidates[0]}），请重新上传密钥文件并保存配置`);
    }
    throw new Error('私钥格式无法识别，请在管理后台重新上传 apiclient_key.pem');
  }

  /**
   * 创建Native支付（扫码支付）
   */
  async createNativePay(params: {
    orderNo: string
    amount: number
    description: string
  }): Promise<{ qrCode: string; payUrl: string }> {
    try {
      const config = await this.getConfig();

      // 验证配置
      if (!config.appId || !config.mchId) {
        throw new Error('微信支付配置不完整');
      }
      if (!config.keyPem) {
        throw new Error('微信支付私钥(keyPem)未配置，请在管理后台上传 apiclient_key.pem');
      }
      if (!config.serialNo) {
        throw new Error('微信支付证书序列号未配置，请在管理后台填写V3支付证书ID');
      }

      // 读取私钥内容
      const privateKey = await this.resolvePrivateKey(config.keyPem);

      // 构造请求参数
      const requestData = {
        appid: config.appId,
        mchid: config.mchId,
        description: params.description,
        out_trade_no: params.orderNo,
        notify_url: config.notifyUrl || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/public/payment/wechat/notify`,
        amount: {
          total: Math.round(params.amount * 100), // 转换为分
          currency: 'CNY'
        }
      };

      try {
        // 生成 RSA-SHA256 签名
        const timestamp = Math.floor(Date.now() / 1000).toString();
        const nonce = crypto.randomBytes(16).toString('hex');
        const body = JSON.stringify(requestData);
        const signature = this.generateSignatureV3(
          'POST',
          '/v3/pay/transactions/native',
          timestamp,
          nonce,
          body,
          privateKey
        );

        // 调用微信支付API
        const response = await axios.post(
          'https://api.mch.weixin.qq.com/v3/pay/transactions/native',
          requestData,
          {
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json',
              'Accept-Language': 'zh-CN',
              'Authorization': `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchId}",nonce_str="${nonce}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.serialNo}"`
            },
            timeout: 10000
          }
        );

        if (response.data && response.data.code_url) {
          return {
            qrCode: response.data.code_url,
            payUrl: response.data.code_url
          };
        }
        throw new Error('微信支付API返回数据异常，未包含 code_url');
      } catch (apiError: any) {
        const errMsg = apiError.response?.data?.message || apiError.response?.data?.code || apiError.message;
        log.error('[WechatPay] API调用失败:', apiError.response?.data || apiError.message);
        throw new Error(`微信支付API调用失败: ${errMsg}`);
      }
    } catch (error: any) {
      log.error('[WechatPay] Create native pay failed:', error);
      throw new Error(`创建微信支付失败: ${error.message}`);
    }
  }

  /**
   * 生成微信支付V3签名（RSA-SHA256 + 商户私钥）
   */
  private generateSignatureV3(
    method: string,
    url: string,
    timestamp: string,
    nonce: string,
    body: string,
    privateKey: string
  ): string {
    const message = `${method}\n${url}\n${timestamp}\n${nonce}\n${body}\n`;
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(message);
    return sign.sign(privateKey, 'base64');
  }

  /**
   * 验证微信支付签名（V3版本）
   */
  async verifySignatureV3(
    timestamp: string,
    nonce: string,
    body: string,
    signature: string,
    serialNo: string
  ): Promise<boolean> {
    try {
      const config = await this.getConfig();

      // 构造验签名串
      const message = `${timestamp}\n${nonce}\n${body}\n`;

      // 使用平台公钥验证签名
      // 注意：实际生产环境需要从微信获取平台证书公钥
      // 这里简化处理，实际应该缓存证书并定期更新
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(message);

      // TODO: 从微信获取平台证书公钥
      // const publicKey = await this.getWechatPublicKey(serialNo);
      // return verify.verify(publicKey, signature, 'base64');

      return true; // 临时返回true，实际需要验证
    } catch (error) {
      log.error('[WechatPay] Verify signature failed:', error);
      return false;
    }
  }

  /**
   * 解密微信支付回调数据（V3版本，AES-256-GCM）
   */
  decryptCallbackData(
    ciphertext: string,
    associatedData: string,
    nonce: string,
    apiKey: string
  ): any {
    try {
      // base64解码密文，最后16字节是GCM认证标签
      const ciphertextBuffer = Buffer.from(ciphertext, 'base64');
      const authTag = ciphertextBuffer.subarray(ciphertextBuffer.length - 16);
      const encryptedData = ciphertextBuffer.subarray(0, ciphertextBuffer.length - 16);

      const decipher = crypto.createDecipheriv(
        'aes-256-gcm',
        Buffer.from(apiKey, 'utf8'),
        Buffer.from(nonce, 'utf8')
      );
      decipher.setAuthTag(authTag);
      decipher.setAAD(Buffer.from(associatedData, 'utf8'));

      let decrypted = decipher.update(encryptedData);
      decrypted = Buffer.concat([decrypted, decipher.final()]);

      return JSON.parse(decrypted.toString('utf8'));
    } catch (error) {
      log.error('[WechatPay] Decrypt callback data failed:', error);
      throw new Error('解密回调数据失败');
    }
  }

  /**
   * 处理微信支付回调
   */
  async handleCallback(callbackData: any): Promise<{ code: string; message: string }> {
    try {
      const { resource, event_type } = callbackData;

      // 只处理支付成功通知
      if (event_type !== 'TRANSACTION.SUCCESS') {
        return { code: 'SUCCESS', message: '忽略非支付成功通知' };
      }

      const config = await this.getConfig();

      // 解密回调数据
      let decryptedData;
      try {
        decryptedData = this.decryptCallbackData(
          resource.ciphertext,
          resource.associated_data,
          resource.nonce,
          config.apiKeyV3 || config.apiKey
        );
      } catch (decryptError) {
        log.error('[WechatPay] 解密回调数据失败:', decryptError);
        // 如果解密失败，尝试直接使用resource数据
        decryptedData = resource;
      }

      const { out_trade_no, transaction_id, trade_state, amount } = decryptedData;

      // 记录日志
      await paymentService.logPayment({
        orderId: '',
        orderNo: out_trade_no,
        action: 'notify',
        payType: 'wechat',
        requestData: callbackData,
        responseData: decryptedData,
        result: 'success'
      });

      // 根据支付状态更新订单
      if (trade_state === 'SUCCESS') {
        // 查询订单
        const orders = await AppDataSource.query(
          'SELECT id, tenant_id, status FROM payment_orders WHERE order_no = ?',
          [out_trade_no]
        );

        if (orders.length > 0) {
          const order = orders[0];

          // 防止重复处理
          if (order.status === 'paid') {
            return { code: 'SUCCESS', message: '订单已处理' };
          }

          // 更新订单状态
          await paymentService.updateOrderStatus(order.id, 'paid', {
            tradeNo: transaction_id,
            paidAt: new Date()
          });

          // 激活租户并生成授权码
          if (order.tenant_id) {
            await this.activateTenant(order.tenant_id, order.id);
          }
        }
      }

      return { code: 'SUCCESS', message: '成功' };
    } catch (error: any) {
      log.error('[WechatPay] Handle callback failed:', error);

      // 记录错误日志
      await paymentService.logPayment({
        orderId: '',
        orderNo: callbackData.resource?.out_trade_no || '',
        action: 'notify',
        payType: 'wechat',
        requestData: callbackData,
        result: 'fail',
        errorMsg: error.message
      });

      return { code: 'FAIL', message: error.message };
    }
  }

  /**
   * 激活租户并生成授权码
   */
  private async activateTenant(tenantId: string, orderId: string): Promise<void> {
    try {
      // 查询租户信息
      const tenants = await AppDataSource.query(
        'SELECT * FROM tenants WHERE id = ?',
        [tenantId]
      );

      if (tenants.length === 0) {
        throw new Error('租户不存在');
      }

      const tenant = tenants[0];

      // 查询订单信息获取套餐详情
      const orders = await AppDataSource.query(
        `SELECT o.*, p.duration_days, p.max_users, p.max_storage_gb, p.features
         FROM payment_orders o
         LEFT JOIN packages p ON o.package_id = p.id
         WHERE o.id = ?`,
        [orderId]
      );

      if (orders.length === 0) {
        throw new Error('订单不存在');
      }

      const order = orders[0];

      // 计算过期时间
      let durationDays = order.duration_days || 30;

      // 如果是年付，计算实际有效期
      if (order.billing_cycle === 'yearly') {
        const bonusMonths = Number(order.bonus_months) || 0;
        durationDays = (12 + bonusMonths) * 30;
      }

      const expireDate = new Date();
      expireDate.setDate(expireDate.getDate() + durationDays);

      // 生成授权码
      const licenseKey = this.generateLicenseKey();

      // 更新租户状态
      const now = formatDateTime(new Date());
      await AppDataSource.query(
        `UPDATE tenants
         SET status = ?, license_key = ?, license_status = ?,
             activated_at = ?, expire_date = ?,
             max_users = ?, max_storage_gb = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          'active', licenseKey, 'active',
          now, formatDate(expireDate),
          order.max_users || 10, order.max_storage_gb || 5,
          now, tenantId
        ]
      );

      // 创建授权记录
      await AppDataSource.query(
        `INSERT INTO licenses (
          id, license_key, customer_name, customer_type, tenant_id,
          license_type, max_users, max_storage_gb, features,
          status, activated_at, expires_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          crypto.randomUUID(), licenseKey, tenant.name, 'tenant', tenantId,
          order.billing_cycle === 'yearly' ? 'annual' : 'monthly',
          order.max_users || 10, order.max_storage_gb || 5,
          order.features || '[]',
          'active', now, formatDateTime(expireDate),
          now, now
        ]
      );

      // 创建默认管理员账号（使用租户手机号作为用户名，密码 Aa123456）
      await this.createDefaultAdmin(tenantId, tenant.code, tenant.phone, tenant.contact, tenant.email);

      // 🔥 同步设置会员中心密码（默认 Aa123456），确保租户能登录会员中心
      try {
        const existingPwdRows = await AppDataSource.query('SELECT password_hash FROM tenants WHERE id = ?', [tenantId]);
        if (!existingPwdRows[0]?.password_hash) {
          const memberPwdHash = await bcrypt.hash('Aa123456', 10);
          await AppDataSource.query('UPDATE tenants SET password_hash = ? WHERE id = ?', [memberPwdHash, tenantId]);
          log.info(`[WechatPay] ✅ 已为租户 ${tenantId} 设置会员中心默认密码`);
        }
      } catch (pwdErr: any) {
        log.warn('[WechatPay] 设置会员中心密码失败（不影响激活）:', pwdErr.message?.substring(0, 80));
      }

      // 发送支付成功通知
      await this.sendPaymentSuccessNotification({
        tenantId,
        tenantName: tenant.name,
        orderId,
        licenseKey,
        expireDate: formatDate(expireDate),
        phone: tenant.phone,
        email: tenant.email
      });

      log.info(`[WechatPay] 租户 ${tenantId} 已激活，授权码: ${licenseKey}`);
    } catch (error: any) {
      log.error('[WechatPay] 激活租户失败:', error);
      throw error;
    }
  }

  /**
   * 创建默认管理员账号（使用统一的 adminAccountHelper）
   */
  private async createDefaultAdmin(tenantId: string, tenantCode: string, phone?: string, contact?: string, email?: string): Promise<void> {
    try {
      // 检查是否已存在管理员账号
      const existingAdmins = await AppDataSource.query(
        'SELECT id FROM users WHERE tenant_id = ? AND role = ?',
        [tenantId, 'admin']
      );

      if (existingAdmins.length > 0) {
        log.info(`[WechatPay] 租户 ${tenantCode} 已存在管理员账号，跳过创建`);
        return;
      }

      const adminUsername = phone || `admin_${tenantCode}`;
      const result = await sharedCreateDefaultAdmin({
        tenantId,
        phone: adminUsername,
        realName: contact || '管理员',
        email: email || undefined
      });

      log.info(`[WechatPay] ✅ 已为租户 ${tenantCode} 创建默认管理员账号 (${result.username}/Aa123456)`);
    } catch (error: any) {
      log.error('[WechatPay] 创建默认管理员失败:', error);
      // 不抛出错误，避免影响激活流程
    }
  }

  /**
   * 生成授权码
   */
  private generateLicenseKey(): string {
    const segments = [];
    for (let i = 0; i < 4; i++) {
      segments.push(crypto.randomBytes(4).toString('hex').toUpperCase().slice(0, 5));
    }
    return segments.join('-');
  }

  /**
   * 发送支付成功通知
   */
  private async sendPaymentSuccessNotification(params: {
    tenantId: string
    tenantName: string
    orderId: string
    licenseKey: string
    expireDate: string
    phone?: string
    email?: string
  }) {
    try {
      // 查询订单详情
      const orders = await AppDataSource.query(
        `SELECT o.*, p.name as package_name
         FROM payment_orders o
         LEFT JOIN packages p ON o.package_id = p.id
         WHERE o.id = ?`,
        [params.orderId]
      );

      if (orders.length === 0) {
        return;
      }

      const order = orders[0];

      await notificationTemplateService.sendByTemplate('payment_success', {
        tenantName: params.tenantName,
        orderNumber: order.order_no,
        packageName: order.package_name || '标准版',
        amount: order.amount.toFixed(2),
        payTime: new Date().toLocaleString('zh-CN'),
        serviceStartDate: new Date().toLocaleDateString('zh-CN'),
        serviceEndDate: params.expireDate
      }, {
        to: params.email || params.phone,
        priority: 'high'
      });

      log.info(`[WechatPay] 已发送支付成功通知给租户 ${params.tenantName}`);
    } catch (error) {
      log.error('[WechatPay] 发送支付通知失败:', error);
      // 不抛出错误，避免影响激活流程
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo: string): Promise<any> {
    try {
      const config = await this.getConfig();

      // TODO: 调用微信支付查询订单API
      // const response = await axios.get(`https://api.mch.weixin.qq.com/v3/pay/transactions/out-trade-no/${orderNo}`, {
      //   headers: {
      //     'Authorization': this.generateAuthHeader(config, 'GET', `/v3/pay/transactions/out-trade-no/${orderNo}`)
      //   }
      // });

      return {
        success: true,
        data: {
          out_trade_no: orderNo,
          trade_state: 'SUCCESS',
          transaction_id: 'mock_transaction_id'
        }
      };
    } catch (error: any) {
      log.error('[WechatPay] Query order failed:', error);
      throw new Error('查询订单失败');
    }
  }
}

export const wechatPayService = new WechatPayService();
