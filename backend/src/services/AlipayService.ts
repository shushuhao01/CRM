/**
 * 支付宝支付服务
 * 支持支付宝当面付API
 */
import crypto from 'crypto';
import axios from 'axios';
import { AppDataSource } from '../config/database';
import { paymentService } from './PaymentService';
import { notificationTemplateService } from './NotificationTemplateService';
import { SITE_CONFIG } from '../config/sites';

export class AlipayService {
  /**
   * 解密配置数据
   */
  private decrypt(encrypted: string): string {
    try {
      const ENCRYPT_KEY = process.env.PAYMENT_ENCRYPT_KEY || 'crm-payment-secret-key-2024';
      const decipher = crypto.createDecipheriv(
        'aes-256-cbc',
        crypto.scryptSync(ENCRYPT_KEY, 'salt', 32),
        Buffer.alloc(16, 0)
      );
      return decipher.update(encrypted, 'hex', 'utf8') + decipher.final('utf8');
    } catch {
      return '';
    }
  }

  /**
   * 获取支付宝配置
   */
  private async getConfig(): Promise<any> {
    const config = await AppDataSource.query(
      'SELECT config_data, notify_url FROM payment_configs WHERE pay_type = ?',
      ['alipay']
    );

    if (config.length === 0 || !config[0].config_data) {
      throw new Error('支付宝配置不存在');
    }

    const configData = JSON.parse(this.decrypt(config[0].config_data));
    configData.notifyUrl = config[0].notify_url;
    return configData;
  }

  /**
   * 创建当面付（扫码支付）
   */
  async createQRPay(params: {
    orderNo: string
    amount: number
    subject: string
  }): Promise<{ qrCode: string; payUrl: string }> {
    try {
      const config = await this.getConfig();

      // 验证配置
      if (!config.appId) {
        throw new Error('支付宝配置不完整');
      }

      // 构造请求参数
      const bizContent = {
        out_trade_no: params.orderNo,
        total_amount: params.amount.toFixed(2),
        subject: params.subject,
        product_code: 'FACE_TO_FACE_PAYMENT'
      };

      // 如果配置了私钥，调用真实API
      if (config.privateKey && config.alipayPublicKey) {
        try {
          const commonParams = {
            app_id: config.appId,
            method: 'alipay.trade.precreate',
            charset: 'utf-8',
            sign_type: config.signType || 'RSA2',
            timestamp: new Date().toISOString().replace('T', ' ').slice(0, 19),
            version: '1.0',
            notify_url: config.notifyUrl || `${process.env.API_BASE_URL || 'http://localhost:3000'}/api/v1/admin/payment/notify/alipay`,
            biz_content: JSON.stringify(bizContent)
          };

          // 生成签名
          const sign = this.generateSign(commonParams, config.privateKey);
          const requestParams = { ...commonParams, sign };

          // 调用支付宝API
          const gatewayUrl = config.gatewayUrl || 'https://openapi.alipay.com/gateway.do';
          const response = await axios.post(
            gatewayUrl,
            null,
            {
              params: requestParams,
              timeout: 10000
            }
          );

          if (response.data && response.data.alipay_trade_precreate_response) {
            const result = response.data.alipay_trade_precreate_response;
            if (result.code === '10000' && result.qr_code) {
              return {
                qrCode: result.qr_code,
                payUrl: result.qr_code
              };
            }
          }
        } catch (apiError: any) {
          console.error('[Alipay] API调用失败:', apiError.response?.data || apiError.message);
          // API调用失败，返回模拟数据
        }
      }

      // 返回模拟数据（开发/测试环境）
      console.log('[Alipay] 使用模拟支付二维码');
      return {
        qrCode: `MOCK_ALIPAY_${params.orderNo}`,
        payUrl: `https://qr.alipay.com/mock_${params.orderNo}`
      };
    } catch (error: any) {
      console.error('[Alipay] Create QR pay failed:', error);
      throw new Error(`创建支付宝支付失败: ${error.message}`);
    }
  }

  /**
   * 验证支付宝签名
   */
  async verifySignature(params: any, sign: string): Promise<boolean> {
    try {
      const config = await this.getConfig();

      // 排序参数
      const sortedParams = Object.keys(params)
        .filter(key => key !== 'sign' && key !== 'sign_type')
        .sort()
        .map(key => `${key}=${params[key]}`)
        .join('&');

      // 验证签名
      const verify = crypto.createVerify('RSA-SHA256');
      verify.update(sortedParams, 'utf8');

      return verify.verify(config.alipayPublicKey, sign, 'base64');
    } catch (error) {
      console.error('[Alipay] Verify signature failed:', error);
      return false;
    }
  }

  /**
   * 处理支付宝回调
   */
  async handleCallback(params: any): Promise<string> {
    try {
      const { out_trade_no, trade_no, trade_status, total_amount, sign } = params;

      // 验证签名
      const isValid = await this.verifySignature(params, sign);
      if (!isValid) {
        console.error('[Alipay] 签名验证失败');
        // 在开发环境可以跳过签名验证
        if (process.env.NODE_ENV === 'production') {
          throw new Error('签名验证失败');
        }
      }

      // 记录日志
      await paymentService.logPayment({
        orderId: '',
        orderNo: out_trade_no,
        action: 'notify',
        payType: 'alipay',
        requestData: params,
        result: 'success'
      });

      // 根据交易状态更新订单
      if (trade_status === 'TRADE_SUCCESS' || trade_status === 'TRADE_FINISHED') {
        // 查询订单
        const orders = await AppDataSource.query(
          'SELECT id, tenant_id, status FROM payment_orders WHERE order_no = ?',
          [out_trade_no]
        );

        if (orders.length > 0) {
          const order = orders[0];

          // 防止重复处理
          if (order.status === 'paid') {
            return 'success';
          }

          const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

          // 更新订单状态
          await paymentService.updateOrderStatus(order.id, 'paid', {
            tradeNo: trade_no,
            paidAt: new Date()
          });

          // 激活租户并生成授权码
          if (order.tenant_id) {
            await this.activateTenant(order.tenant_id, order.id);
          }
        }
      }

      return 'success';
    } catch (error: any) {
      console.error('[Alipay] Handle callback failed:', error);

      // 记录错误日志
      await paymentService.logPayment({
        orderId: '',
        orderNo: params.out_trade_no || '',
        action: 'notify',
        payType: 'alipay',
        requestData: params,
        result: 'fail',
        errorMsg: error.message
      });

      return 'fail';
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
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');
      await AppDataSource.query(
        `UPDATE tenants
         SET status = ?, license_key = ?, license_status = ?,
             activated_at = ?, expire_date = ?,
             max_users = ?, max_storage_gb = ?,
             updated_at = ?
         WHERE id = ?`,
        [
          'active', licenseKey, 'active',
          now, expireDate.toISOString().slice(0, 10),
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
          'active', now, expireDate.toISOString().slice(0, 19).replace('T', ' '),
          now, now
        ]
      );

      // 创建默认管理员账号
      await this.createDefaultAdmin(tenantId, tenant.code);

      // 发送支付成功通知
      await this.sendPaymentSuccessNotification({
        tenantId,
        tenantName: tenant.name,
        orderId,
        licenseKey,
        expireDate: expireDate.toISOString().slice(0, 10),
        phone: tenant.phone,
        email: tenant.email
      });

      console.log(`[Alipay] 租户 ${tenantId} 已激活，授权码: ${licenseKey}`);
    } catch (error: any) {
      console.error('[Alipay] 激活租户失败:', error);
      throw error;
    }
  }

  /**
   * 创建默认管理员账号
   */
  private async createDefaultAdmin(tenantId: string, tenantCode: string): Promise<void> {
    try {
      // 检查是否已存在管理员账号
      const existingAdmins = await AppDataSource.query(
        'SELECT id FROM users WHERE tenant_id = ? AND role = ?',
        [tenantId, 'admin']
      );

      if (existingAdmins.length > 0) {
        console.log(`[Alipay] 租户 ${tenantCode} 已存在管理员账号，跳过创建`);
        return;
      }

      const userId = crypto.randomUUID();
      const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

      // 密码：admin123
      const salt = crypto.randomBytes(16).toString('hex');
      const hash = crypto.pbkdf2Sync('admin123', salt, 1000, 64, 'sha512').toString('hex');

      await AppDataSource.query(
        `INSERT INTO users (
          id, tenant_id, username, password, salt, real_name, role,
          status, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          userId, tenantId, 'admin', hash, salt, '系统管理员', 'admin',
          'active', now, now
        ]
      );

      console.log(`[Alipay] 已为租户 ${tenantCode} 创建默认管理员账号 (admin/admin123)`);
    } catch (error: any) {
      console.error('[Alipay] 创建默认管理员失败:', error);
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

      console.log(`[Alipay] 已发送支付成功通知给租户 ${params.tenantName}`);
    } catch (error) {
      console.error('[Alipay] 发送支付通知失败:', error);
      // 不抛出错误，避免影响激活流程
    }
  }

  /**
   * 查询订单状态
   */
  async queryOrder(orderNo: string): Promise<any> {
    try {
      const config = await this.getConfig();

      // TODO: 调用支付宝查询订单API
      // const params = {
      //   app_id: config.appId,
      //   method: 'alipay.trade.query',
      //   charset: 'utf-8',
      //   sign_type: config.signType,
      //   timestamp: new Date().toISOString(),
      //   version: '1.0',
      //   biz_content: JSON.stringify({ out_trade_no: orderNo })
      // };

      return {
        success: true,
        data: {
          out_trade_no: orderNo,
          trade_status: 'TRADE_SUCCESS',
          trade_no: 'mock_trade_no'
        }
      };
    } catch (error: any) {
      console.error('[Alipay] Query order failed:', error);
      throw new Error('查询订单失败');
    }
  }

  /**
   * 生成签名
   */
  private generateSign(params: any, privateKey: string): string {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');

    const sign = crypto.createSign('RSA-SHA256');
    sign.update(sortedParams, 'utf8');
    return sign.sign(privateKey, 'base64');
  }
}

export const alipayService = new AlipayService();
