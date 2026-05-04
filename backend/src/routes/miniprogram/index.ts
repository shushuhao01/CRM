/**
 * 微信小程序 - 客户自助填写资料 路由模块
 *
 * 挂载到: /api/v1/mp/
 *
 * 接口列表:
 * - GET  /form-config      获取表单配置（签名验证，无需登录）
 * - POST /submit-customer   客户提交资料（签名验证，无需登录）
 * - POST /get-phone         微信手机号解密（签名验证，无需登录）
 * - POST /generate-card     生成小程序卡片信息（需登录鉴权）
 * - POST /log-send          记录发送日志（需登录鉴权）
 * - GET  /collect-stats     收集统计（需登录鉴权）
 * - GET  /collect-records   收集记录列表（需登录鉴权）
 * - GET  /phone-quota       查询手机号额度（需登录鉴权）
 * - POST /phone-quota/purchase  购买手机号额度（需登录鉴权）
 */
import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../../middleware/auth';
import { log } from '../../config/logger';

const router = Router();

// ==================== 工具函数 ====================

/**
 * 签名验证
 */
function verifySign(tenantId: string, memberId: string, ts: string, sign: string): boolean {
  const secret = process.env.MP_FORM_SECRET || 'mp_default_secret_key_2026';
  const expected = crypto.createHash('md5')
    .update(tenantId + memberId + ts + secret)
    .digest('hex');
  return expected === sign;
}

/**
 * 检查链接是否过期
 */
function isLinkExpired(ts: string): boolean {
  const expireDays = parseInt(process.env.MP_LINK_EXPIRE_DAYS || '7', 10);
  const now = Math.floor(Date.now() / 1000);
  const tsNum = parseInt(ts, 10);
  return (now - tsNum) > expireDays * 86400;
}

/**
 * 签名验证中间件（小程序端接口用，无需登录鉴权）
 */
function validateMpSign(req: Request, res: Response, next: Function) {
  const { tenantId, memberId, ts, sign } = { ...req.query, ...req.body } as any;

  if (!tenantId || !memberId || !ts || !sign) {
    return res.status(400).json({ success: false, message: '缺少必要参数' });
  }

  if (isLinkExpired(ts)) {
    return res.status(410).json({ success: false, message: '链接已过期，请联系顾问重新发送', code: 'LINK_EXPIRED' });
  }

  if (!verifySign(tenantId, memberId, ts, sign)) {
    return res.status(403).json({ success: false, message: '签名验证失败', code: 'INVALID_SIGN' });
  }

  next();
}

// ==================== 小程序端接口（签名验证，无需登录） ====================

/**
 * ① GET /form-config - 获取表单配置
 */
router.get('/form-config', validateMpSign, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId } = req.query as any;

    // 动态导入避免循环依赖
    const { AppDataSource } = await import('../../config/database');
    const { TenantSettings } = await import('../../entities/TenantSettings');

    if (!AppDataSource?.isInitialized) {
      return res.status(500).json({ success: false, message: '数据库未初始化' });
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);

    // 获取租户名称和编码
    let tenantName = '品牌';
    let tenantCode = '';
    try {
      const { Tenant } = await import('../../entities/Tenant');
      const tenantRepo = AppDataSource.getRepository(Tenant);
      const tenant = await tenantRepo.findOne({ where: { id: tenantId } });
      if (tenant) {
        tenantName = tenant.name || '品牌';
        tenantCode = tenant.code || '';
      }
    } catch { /* ignore */ }

    // 获取成员名称
    let memberName = '顾问';
    try {
      const { User } = await import('../../entities/User');
      const userRepo = AppDataSource.getRepository(User);
      const user = await userRepo.findOne({ where: { id: memberId, tenantId } });
      if (user) memberName = user.name || user.username || '顾问';
    } catch { /* ignore */ }

    // 获取字段配置
    const fieldConfigSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'customer_field_config' }
    });

    let builtinFields: any[] = [];
    let customFields: any[] = [];
    let phoneAuthEnabled = true;

    if (fieldConfigSetting) {
      try {
        const config = typeof fieldConfigSetting.settingValue === 'string'
          ? JSON.parse(fieldConfigSetting.settingValue)
          : fieldConfigSetting.settingValue;

        const fieldVis = config.fieldVisibility || {};
        const FIELD_LABELS: Record<string, string> = {
          phone: '手机号', name: '姓名', gender: '性别', age: '年龄',
          height: '身高', weight: '体重', email: '邮箱', wechat: '微信号',
          birthday: '生日', medicalHistory: '疾病史', improvementGoals: '改善问题',
          address: '收货地址', province: '省份', city: '城市',
          district: '区县', street: '街道', detailAddress: '详细地址',
          remark: '备注'
        };

        for (const [key, vis] of Object.entries(fieldVis) as any[]) {
          if (!vis.enabled) continue;
          // 小程序不显示的字段跳过
          const mpEnabled = vis.mpEnabled !== false;
          if (!mpEnabled) continue;

          builtinFields.push({
            key,
            label: FIELD_LABELS[key] || key,
            mpRequired: vis.mpRequired || false,
            mpCollapsed: vis.mpCollapsed || false,
            mpEnabled: true
          });
        }

        // 自定义字段
        if (config.customFields) {
          customFields = config.customFields
            .filter((f: any) => f.mpDisplay !== 'hidden')
            .map((f: any) => ({
              fieldKey: f.fieldKey,
              fieldName: f.fieldName,
              fieldType: f.fieldType,
              options: f.options,
              placeholder: f.placeholder,
              mpRequired: f.mpRequired || false,
              mpCollapsed: f.mpDisplay === 'collapsed',
              mpEnabled: true
            }));
        }
      } catch (e) {
        log.warn('[小程序] 解析字段配置失败:', e);
      }
    }

    // 默认字段（无配置时）
    if (builtinFields.length === 0) {
      builtinFields = [
        { key: 'phone', label: '手机号', mpRequired: true, mpCollapsed: false, mpEnabled: true },
        { key: 'name', label: '姓名', mpRequired: true, mpCollapsed: false, mpEnabled: true },
        { key: 'gender', label: '性别', mpRequired: false, mpCollapsed: true, mpEnabled: true },
        { key: 'age', label: '年龄', mpRequired: false, mpCollapsed: true, mpEnabled: true },
        { key: 'address', label: '收货地址', mpRequired: true, mpCollapsed: false, mpEnabled: true },
      ];
    }

    // 获取手机号额度配置
    try {
      const quotaSetting = await settingsRepo.findOne({
        where: { tenantId, settingKey: 'mp_phone_quota' }
      });
      if (quotaSetting) {
        const quota = typeof quotaSetting.settingValue === 'string'
          ? JSON.parse(quotaSetting.settingValue)
          : quotaSetting.settingValue;
        if (quota.total <= 0 || quota.used >= quota.total) {
          phoneAuthEnabled = false;
        }
      }
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        tenantName,
        tenantCode,
        memberName,
        builtinFields,
        customFields,
        phoneAuthEnabled
      }
    });
  } catch (error: any) {
    log.error('[小程序] 获取表单配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * ② POST /submit-customer - 客户提交资料
 */
router.post('/submit-customer', validateMpSign, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, customerData } = req.body;

    if (!customerData || !customerData.name) {
      return res.status(400).json({ success: false, message: '请填写客户姓名' });
    }

    const { AppDataSource } = await import('../../config/database');
    const { Customer } = await import('../../entities/Customer');
    const { TenantContextManager } = await import('../../utils/tenantContext');

    if (!AppDataSource?.isInitialized) {
      return res.status(500).json({ success: false, message: '数据库未初始化' });
    }

    // 设置租户上下文
    TenantContextManager.setContext({ tenantId, userId: memberId });

    const customerRepo = AppDataSource.getRepository(Customer);

    // 检查手机号是否已存在
    if (customerData.phone) {
      const existing = await customerRepo.findOne({
        where: { phone: customerData.phone, tenantId }
      });
      if (existing) {
        return res.status(409).json({
          success: false,
          message: '您的资料已提交过，无需重复提交',
          code: 'DUPLICATE_PHONE'
        });
      }
    }

    // 创建客户记录
    const customer = customerRepo.create({
      tenantId,
      name: customerData.name,
      phone: customerData.phone || '',
      gender: customerData.gender || null,
      age: customerData.age ? parseInt(customerData.age, 10) : null,
      email: customerData.email || '',
      wechat: customerData.wechat || '',
      birthday: customerData.birthday || null,
      height: customerData.height || null,
      weight: customerData.weight || null,
      remark: customerData.remark || '',
      medicalHistory: customerData.medicalHistory || '',
      improvementGoals: customerData.improvementGoals || '',
      province: customerData.province || '',
      city: customerData.city || '',
      district: customerData.district || '',
      street: customerData.street || '',
      detailAddress: customerData.detailAddress || '',
      source: 'miniprogram',
      salesPersonId: memberId,
      createdBy: memberId,
      // 自定义字段
      ...(customerData.customFields ? {
        customerCustomField1: customerData.customFields.customer_custom_field1 || null,
        customerCustomField2: customerData.customFields.customer_custom_field2 || null,
        customerCustomField3: customerData.customFields.customer_custom_field3 || null,
        customerCustomField4: customerData.customFields.customer_custom_field4 || null,
        customerCustomField5: customerData.customFields.customer_custom_field5 || null,
      } : {})
    } as any);

    const saved: any = await customerRepo.save(customer);

    // 发送系统消息通知
    try {
      const { messageService } = await import('../../services/messageService');
      const maskedPhone = customerData.phone
        ? customerData.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
        : '未填写';
      await messageService.sendMessage({
        type: 'customer_mp_submit',
        title: '客户自助提交资料',
        content: `客户「${customerData.name}」通过小程序提交了个人资料，手机号：${maskedPhone}`,
        targetUserId: memberId,
        tenantId,
        priority: 'high',
        category: '客户通知',
        relatedId: saved.id,
        relatedType: 'customer',
        actionUrl: `/customer/detail/${saved.id}`
      } as any);
    } catch (e) {
      log.warn('[小程序] 发送系统消息失败:', e);
    }

    // WebSocket推送
    try {
      if ((global as any).webSocketService) {
        (global as any).webSocketService.sendToUser(memberId, 'customer_mp_submit', {
          customerId: saved.id,
          customerName: customerData.name,
          message: `客户「${customerData.name}」通过小程序提交了资料`
        });
      }
    } catch { /* ignore */ }

    log.info(`[小程序] 客户资料提交成功: tenant=${tenantId}, member=${memberId}, customer=${saved.id}`);

    res.json({
      success: true,
      message: '资料提交成功',
      data: { customerId: saved.id }
    });
  } catch (error: any) {
    log.error('[小程序] 客户资料提交失败:', error);
    res.status(500).json({ success: false, message: '提交失败，请稍后重试' });
  }
});

/**
 * ③ POST /get-phone - 微信手机号解密
 */
router.post('/get-phone', validateMpSign, async (req: Request, res: Response) => {
  try {
    const { code, tenantId } = req.body;

    if (!code) {
      return res.status(400).json({ success: false, message: '缺少code参数' });
    }

    // 获取小程序AppID和AppSecret
    const { AppDataSource } = await import('../../config/database');
    const { TenantSettings } = await import('../../entities/TenantSettings');

    let appId = process.env.MP_APP_ID || '';
    let appSecret = process.env.MP_APP_SECRET || '';

    // 优先从数据库获取（Admin配置的全局配置）
    try {
      const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');
      const suiteRepo = AppDataSource!.getRepository(WecomSuiteConfig);
      const suiteConfig = await suiteRepo.findOne({ where: {} });
      if (suiteConfig) {
        if ((suiteConfig as any).mpAppId) appId = (suiteConfig as any).mpAppId;
        if ((suiteConfig as any).mpAppSecret) appSecret = (suiteConfig as any).mpAppSecret;
      }
    } catch { /* ignore, use env config */ }

    if (!appId || !appSecret) {
      return res.status(500).json({ success: false, message: '小程序未配置' });
    }

    // 检查手机号额度
    const settingsRepo = AppDataSource!.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    if (quotaSetting) {
      const quota = typeof quotaSetting.settingValue === 'string'
        ? JSON.parse(quotaSetting.settingValue)
        : quotaSetting.settingValue;
      if (quota.total > 0 && quota.used >= quota.total) {
        return res.status(403).json({
          success: false,
          message: '手机号获取额度已用完，请手动输入手机号',
          code: 'QUOTA_EXHAUSTED'
        });
      }
    }

    // 先获取access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData: any = await tokenResp.json();

    if (!tokenData.access_token) {
      log.error('[小程序] 获取access_token失败:', tokenData);
      return res.status(500).json({ success: false, message: '微信接口调用失败' });
    }

    // 调用微信API获取手机号
    const phoneUrl = `https://api.weixin.qq.com/wxa/business/getuserphonenumber?access_token=${tokenData.access_token}`;
    const phoneResp = await fetch(phoneUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code })
    });
    const phoneData: any = await (phoneResp as any).json();

    if (phoneData.errcode !== 0) {
      log.error('[小程序] 获取手机号失败:', phoneData);
      return res.status(400).json({ success: false, message: '获取手机号失败，请手动输入' });
    }

    const phoneNumber = phoneData.phone_info?.phoneNumber || phoneData.phone_info?.purePhoneNumber || '';

    // 扣减额度
    if (quotaSetting) {
      try {
        const quota = typeof quotaSetting.settingValue === 'string'
          ? JSON.parse(quotaSetting.settingValue)
          : quotaSetting.settingValue;
        quota.used = (quota.used || 0) + 1;
        quotaSetting.settingValue = typeof quotaSetting.settingValue === 'string'
          ? JSON.stringify(quota)
          : quota;
        await settingsRepo.save(quotaSetting);
      } catch { /* ignore */ }
    }

    res.json({
      success: true,
      data: { phoneNumber }
    });
  } catch (error: any) {
    log.error('[小程序] 手机号解密失败:', error);
    res.status(500).json({ success: false, message: '获取手机号失败' });
  }
});

// ==================== CRM端接口（需登录鉴权） ====================

/**
 * ④ POST /generate-card - 生成小程序卡片信息
 */
router.post('/generate-card', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, ts } = req.body;

    if (!tenantId || !memberId || !ts) {
      return res.status(400).json({ success: false, message: '缺少必要参数' });
    }

    const secret = process.env.MP_FORM_SECRET || 'mp_default_secret_key_2026';
    const sign = crypto.createHash('md5')
      .update(tenantId + memberId + ts + secret)
      .digest('hex');

    // 获取小程序AppID
    let appId = process.env.MP_APP_ID || 'wxXXXXXXXXXXXX';
    let cardTitle = '请填写您的个人资料';
    let cardCoverUrl = '';
    let brandName = '云客CRM';

    // 读取全局配置
    try {
      const { AppDataSource } = await import('../../config/database');
      const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');
      const suiteRepo = AppDataSource!.getRepository(WecomSuiteConfig);
      const suiteConfig = await suiteRepo.findOne({ where: {} });
      if (suiteConfig) {
        if ((suiteConfig as any).mpAppId) appId = (suiteConfig as any).mpAppId;
        const mpConfig = (suiteConfig as any).mpConfig;
        if (mpConfig) {
          const config = typeof mpConfig === 'string' ? JSON.parse(mpConfig) : mpConfig;
          if (config.cardTitle) cardTitle = config.cardTitle;
          if (config.cardCoverUrl) cardCoverUrl = config.cardCoverUrl;
          if (config.brandName) brandName = config.brandName;
        }
      }
    } catch { /* ignore */ }

    // 读取租户级配置（覆盖全局）
    try {
      const { AppDataSource } = await import('../../config/database');
      const { TenantSettings } = await import('../../entities/TenantSettings');
      const settingsRepo = AppDataSource!.getRepository(TenantSettings);
      const mpSetting = await settingsRepo.findOne({
        where: { tenantId, settingKey: 'miniprogram_config' }
      });
      if (mpSetting) {
        const config = typeof mpSetting.settingValue === 'string'
          ? JSON.parse(mpSetting.settingValue)
          : mpSetting.settingValue;
        if (config.cardTitle) cardTitle = config.cardTitle;
        if (config.cardCoverUrl) cardCoverUrl = config.cardCoverUrl;
        if (config.brandName) brandName = config.brandName;
      }
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: { sign, appId, cardTitle, cardCoverUrl, brandName }
    });
  } catch (error: any) {
    log.error('[小程序] 生成卡片失败:', error);
    res.status(500).json({ success: false, message: '生成卡片失败' });
  }
});

/**
 * ⑤ POST /log-send - 记录发送日志
 * 支持传入 externalUserId 以便跟踪卡片发送对象
 */
router.post('/log-send', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, ts, externalUserId } = req.body;
    log.info(`[小程序] 发送记录: tenant=${tenantId}, member=${memberId}, externalUserId=${externalUserId || '-'}, ts=${ts}`);

    // 记录到 mp_card_send_logs 表
    try {
      const { AppDataSource } = await import('../../config/database');
      if (AppDataSource?.isInitialized) {
        await AppDataSource.query(
          `INSERT INTO mp_card_send_logs (id, tenant_id, member_id, external_user_id, sent_at, status)
           VALUES (UUID(), ?, ?, ?, NOW(), 'sent')`,
          [tenantId, memberId, externalUserId || null]
        );
      }
    } catch (dbErr: any) {
      log.warn('[小程序] 记录发送日志到数据库失败:', dbErr.message);
    }

    res.json({ success: true });
  } catch {
    res.json({ success: true });
  }
});

/**
 * ⑤b GET /collect-status - 查询指定企微客户的收集状态
 * 传入 externalUserId 返回：是否已发送卡片、是否已填写
 */
router.get('/collect-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, externalUserId } = req.query as any;
    if (!tenantId || !memberId || !externalUserId) {
      return res.json({ success: true, data: { cardSent: false, filled: false, customer: null } });
    }

    const { AppDataSource } = await import('../../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.json({ success: true, data: { cardSent: false, filled: false, customer: null } });
    }

    // 查询是否发送过卡片
    let cardSent = false;
    let sentAt = null;
    try {
      const sendLogs = await AppDataSource.query(
        `SELECT sent_at FROM mp_card_send_logs WHERE tenant_id = ? AND member_id = ? AND external_user_id = ? ORDER BY sent_at DESC LIMIT 1`,
        [tenantId, memberId, externalUserId]
      );
      if (sendLogs.length > 0) {
        cardSent = true;
        sentAt = sendLogs[0].sent_at;
      }
    } catch { /* table may not exist */ }

    // 查询是否已填写（通过 wecomExternalUserid 字段匹配 CRM 客户）
    let filled = false;
    let customer: any = null;
    try {
      const { Customer } = await import('../../entities/Customer');
      const customerRepo = AppDataSource.getRepository(Customer);
      const crmCustomer = await customerRepo.findOne({
        where: { tenantId, wecomExternalUserid: externalUserId } as any
      });
      if (crmCustomer) {
        filled = true;
        customer = {
          id: crmCustomer.id,
          name: crmCustomer.name ? (crmCustomer.name[0] + '**') : '-',
          phone: (crmCustomer as any).phone ? (crmCustomer as any).phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
          createdAt: (crmCustomer as any).createdAt
        };
      }
    } catch { /* ignore */ }

    // 如果没通过 wecomExternalUserid 找到，再尝试通过 salesPersonId + source 匹配
    if (!filled) {
      try {
        const { Customer } = await import('../../entities/Customer');
        const customerRepo = AppDataSource.getRepository(Customer);
        const candidates = await customerRepo.find({
          where: { tenantId, salesPersonId: memberId, source: 'miniprogram' as any },
          order: { createdAt: 'DESC' as any },
          take: 1
        });
        // 只有当只有一个候选且最近才有可能是该客户
        if (candidates.length > 0 && cardSent && sentAt) {
          const c = candidates[0];
          const cTime = new Date((c as any).createdAt).getTime();
          const sTime = new Date(sentAt).getTime();
          // 如果提交时间在发送后 24 小时内，大概率是同一客户
          if (cTime > sTime && cTime - sTime < 24 * 60 * 60 * 1000) {
            filled = true;
            customer = {
              id: c.id,
              name: c.name ? (c.name[0] + '**') : '-',
              phone: (c as any).phone ? (c as any).phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
              createdAt: (c as any).createdAt
            };
          }
        }
      } catch { /* ignore */ }
    }

    const status = filled ? 'filled' : (cardSent ? 'pending' : 'none');
    res.json({
      success: true,
      data: { cardSent, filled, status, sentAt, customer }
    });
  } catch (error: any) {
    log.error('[小程序] 查询收集状态失败:', error.message);
    res.json({ success: true, data: { cardSent: false, filled: false, status: 'none' } });
  }
});

/**
 * ⑥ GET /collect-stats - 收集统计
 */
router.get('/collect-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId } = req.query as any;

    const { AppDataSource } = await import('../../config/database');
    const { Customer } = await import('../../entities/Customer');

    if (!AppDataSource?.isInitialized) {
      return res.json({ success: true, data: { todaySend: 0, filled: 0, pending: 0 } });
    }

    const customerRepo = AppDataSource.getRepository(Customer);

    // 统计小程序来源的客户数
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const totalFilled = await customerRepo.count({
      where: { tenantId, salesPersonId: memberId, source: 'miniprogram' as any }
    });

    res.json({
      success: true,
      data: { todaySend: 0, filled: totalFilled, pending: 0 }
    });
  } catch {
    res.json({ success: true, data: { todaySend: 0, filled: 0, pending: 0 } });
  }
});

/**
 * ⑥b GET /collect-records - 收集记录列表（分页，敏感信息脱敏）
 */
router.get('/collect-records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, memberId, page = '1', pageSize = '3' } = req.query as any;

    const { AppDataSource } = await import('../../config/database');
    const { Customer } = await import('../../entities/Customer');

    if (!AppDataSource?.isInitialized) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const customerRepo = AppDataSource.getRepository(Customer);
    const take = Math.min(parseInt(pageSize, 10) || 3, 20);
    const skip = (Math.max(parseInt(page, 10) || 1, 1) - 1) * take;

    const whereCondition: any = { tenantId, source: 'miniprogram' as any };
    if (memberId) whereCondition.salesPersonId = memberId;

    const [list, total] = await customerRepo.findAndCount({
      where: whereCondition,
      order: { createdAt: 'DESC' },
      take,
      skip
    });

    // 脱敏处理
    const maskedList = list.map((c: any) => ({
      id: c.id,
      name: c.name ? (c.name[0] + '**') : '-',
      phone: c.phone ? c.phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2') : '',
      province: c.province || '',
      city: c.city || '',
      district: c.district || '',
      gender: c.gender || '',
      createdAt: c.createdAt
    }));

    res.json({ success: true, data: { list: maskedList, total, page: parseInt(page, 10), pageSize: take } });
  } catch (error: any) {
    log.error('[小程序] 获取收集记录失败:', error);
    res.json({ success: true, data: { list: [], total: 0 } });
  }
});

/**
 * ⑦ GET /phone-quota - 查询手机号额度
 */
router.get('/phone-quota', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = req.query.tenantId || (req as any).user?.tenantId;

    const { AppDataSource } = await import('../../config/database');
    const { TenantSettings } = await import('../../entities/TenantSettings');

    if (!AppDataSource?.isInitialized) {
      return res.json({ success: true, data: { total: 0, used: 0, remaining: 0 } });
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    let total = 0, used = 0;
    if (quotaSetting) {
      const quota = typeof quotaSetting.settingValue === 'string'
        ? JSON.parse(quotaSetting.settingValue)
        : quotaSetting.settingValue;
      total = quota.total || 0;
      used = quota.used || 0;
    }

    // 获取可购买的套餐
    let packages: any[] = [];
    try {
      const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');
      const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
      const suiteConfig = await suiteRepo.findOne({ where: {} });
      if (suiteConfig) {
        const mpConfig = (suiteConfig as any).mpConfig;
        if (mpConfig) {
          const config = typeof mpConfig === 'string' ? JSON.parse(mpConfig) : mpConfig;
          packages = config.phonePackages || [];
        }
      }
    } catch { /* ignore */ }

    // 从全局定价配置中获取（优先读 system_config 表 — admin后台写入此表）
    try {
      const rows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
      );
      if (rows.length > 0 && rows[0].config_value) {
        const config = JSON.parse(rows[0].config_value);
        if (config.mpPhonePackages) {
          packages = config.mpPhonePackages.filter((p: any) => p.enabled !== false);
        }
      }
    } catch { /* ignore */ }

    // 回退: 从 system_configs 表 (TypeORM) 获取
    if (packages.length === 0) {
      try {
        const { SystemConfig } = await import('../../entities/SystemConfig');
        const configRepo = AppDataSource.getRepository(SystemConfig);
        const pricingConfig = await configRepo.findOne({
          where: { configKey: 'wecom_pricing_config' }
        });
        if (pricingConfig) {
          const config = typeof pricingConfig.configValue === 'string'
            ? JSON.parse(pricingConfig.configValue)
            : pricingConfig.configValue;
          if (config.mpPhonePackages) {
            packages = config.mpPhonePackages.filter((p: any) => p.enabled !== false);
          }
        }
      } catch { /* ignore */ }
    }

    const purchases = quotaSetting
      ? (typeof quotaSetting.settingValue === 'string' ? JSON.parse(quotaSetting.settingValue) : quotaSetting.settingValue).purchases || []
      : [];

    res.json({
      success: true,
      data: {
        total,
        used,
        remaining: Math.max(0, total - used),
        packages,
        _raw: { purchases }
      }
    });
  } catch (error: any) {
    log.error('[小程序] 查询手机号额度失败:', error);
    res.json({ success: true, data: { total: 0, used: 0, remaining: 0, packages: [], _raw: { purchases: [] } } });
  }
});

/**
 * ⑧-b GET /phone-quota/records - 购买记录（分页）
 */
router.get('/phone-quota/records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId || req.query.tenantId;
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;

    const { AppDataSource } = await import('../../config/database');
    const { TenantSettings } = await import('../../entities/TenantSettings');

    if (!AppDataSource?.isInitialized) {
      return res.json({ success: true, data: { list: [], total: 0 } });
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    const quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    let purchases: any[] = [];
    if (quotaSetting) {
      const q = typeof quotaSetting.settingValue === 'string'
        ? JSON.parse(quotaSetting.settingValue)
        : quotaSetting.settingValue;
      purchases = q.purchases || [];
    }

    // Sort by time desc
    purchases.sort((a: any, b: any) => new Date(b.purchaseTime).getTime() - new Date(a.purchaseTime).getTime());
    const total = purchases.length;
    const start = (page - 1) * pageSize;
    const list = purchases.slice(start, start + pageSize);

    res.json({ success: true, data: { list, total, page, pageSize } });
  } catch (error: any) {
    log.error('[小程序] 查询购买记录失败:', error);
    res.json({ success: true, data: { list: [], total: 0 } });
  }
});

/**
 * ⑧ POST /phone-quota/purchase - 购买手机号额度
 */
router.post('/phone-quota/purchase', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { tenantId, packageId, packageName, quota, price } = req.body;

    if (!tenantId || !quota || quota <= 0) {
      return res.status(400).json({ success: false, message: '参数无效' });
    }

    const { AppDataSource } = await import('../../config/database');
    const { TenantSettings } = await import('../../entities/TenantSettings');

    if (!AppDataSource?.isInitialized) {
      return res.status(500).json({ success: false, message: '数据库未初始化' });
    }

    const settingsRepo = AppDataSource.getRepository(TenantSettings);
    let quotaSetting = await settingsRepo.findOne({
      where: { tenantId, settingKey: 'mp_phone_quota' }
    });

    let currentQuota = { total: 0, used: 0, purchases: [] as any[] };
    if (quotaSetting) {
      currentQuota = typeof quotaSetting.settingValue === 'string'
        ? JSON.parse(quotaSetting.settingValue)
        : quotaSetting.settingValue;
    }

    // 增加额度
    currentQuota.total = (currentQuota.total || 0) + quota;
    currentQuota.purchases = currentQuota.purchases || [];
    currentQuota.purchases.push({
      packageId,
      packageName: packageName || `${quota}次额度包`,
      quota,
      price: price || 0,
      purchaseTime: new Date().toISOString()
    });

    if (quotaSetting) {
      quotaSetting.settingValue = JSON.stringify(currentQuota);
      await settingsRepo.save(quotaSetting);
    } else {
      await settingsRepo.save(settingsRepo.create({
        tenantId,
        settingKey: 'mp_phone_quota',
        settingType: 'json',
        settingValue: JSON.stringify(currentQuota),
        settingGroup: 'miniprogram'
      } as any));
    }

    log.info(`[小程序] 购买手机号额度: tenant=${tenantId}, quota=${quota}, price=${price}`);

    res.json({
      success: true,
      message: `成功购买${quota}次手机号获取额度`,
      data: {
        total: currentQuota.total,
        used: currentQuota.used || 0,
        remaining: currentQuota.total - (currentQuota.used || 0)
      }
    });
  } catch (error: any) {
    log.error('[小程序] 购买额度失败:', error);
    res.status(500).json({ success: false, message: '购买失败' });
  }
});

/**
 * ⑩ GET /wxacode - 生成小程序码
 * 调用微信 getwxacodeunlimit 接口获取小程序码图片
 */
router.get('/wxacode', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { page, scene } = req.query as any;

    const { AppDataSource } = await import('../../config/database');
    if (!AppDataSource?.isInitialized) {
      return res.status(500).json({ success: false, message: '数据库未初始化' });
    }

    // 获取小程序 AppID 和 AppSecret
    let appId = process.env.MP_APP_ID || '';
    let appSecret = process.env.MP_APP_SECRET || '';

    try {
      const { WecomSuiteConfig } = await import('../../entities/WecomSuiteConfig');
      const suiteRepo = AppDataSource.getRepository(WecomSuiteConfig);
      const suiteConfig = await suiteRepo.findOne({ where: {} });
      if (suiteConfig) {
        if ((suiteConfig as any).mpAppId) appId = (suiteConfig as any).mpAppId;
        if ((suiteConfig as any).mpAppSecret) appSecret = (suiteConfig as any).mpAppSecret;
      }
    } catch { /* ignore */ }

    if (!appId || !appSecret) {
      return res.status(400).json({ success: false, message: '小程序未配置AppID/AppSecret，请先在服务商配置中填写', code: 'MP_NOT_CONFIGURED' });
    }

    // 获取 access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${appId}&secret=${appSecret}`;
    const tokenResp = await fetch(tokenUrl);
    const tokenData: any = await tokenResp.json();

    if (!tokenData.access_token) {
      log.error('[小程序] 获取access_token失败:', tokenData);
      return res.status(500).json({ success: false, message: '获取微信access_token失败' });
    }

    // 调用 getwxacodeunlimit 生成小程序码
    const wxacodeUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenData.access_token}`;
    const wxacodeResp = await fetch(wxacodeUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        scene: scene || 'default',
        page: page || 'pages/form/form',
        width: 280,
        auto_color: false,
        line_color: { r: 64, g: 158, b: 255 },
        is_hyaline: false
      })
    });

    const contentType = wxacodeResp.headers.get('content-type') || '';

    // 如果返回的是图片，直接转发
    if (contentType.includes('image')) {
      const buffer = Buffer.from(await wxacodeResp.arrayBuffer());
      // 转成 base64 data URL 返回
      const base64 = buffer.toString('base64');
      return res.json({
        success: true,
        data: {
          wxacodeBase64: `data:image/png;base64,${base64}`,
          appId
        }
      });
    }

    // 否则是错误 JSON
    const errData: any = await wxacodeResp.json();
    log.error('[小程序] 生成小程序码失败:', errData);
    return res.status(400).json({
      success: false,
      message: `生成小程序码失败: ${errData.errmsg || '未知错误'}`,
      code: 'WXACODE_FAILED',
      errcode: errData.errcode
    });
  } catch (error: any) {
    log.error('[小程序] 生成小程序码异常:', error);
    res.status(500).json({ success: false, message: '生成小程序码失败' });
  }
});

/**
 * ⑪ DELETE /upload-file - 删除已上传的文件
 */
router.delete('/upload-file', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { url } = req.query as any;
    if (!url) {
      return res.status(400).json({ success: false, message: '缺少文件URL参数' });
    }

    // 尝试删除本地文件
    const urlPath = new URL(url, 'http://localhost').pathname;
    const localPath = path.resolve(__dirname, '../../../..', urlPath.replace(/^\//, ''));

    if (fs.existsSync(localPath)) {
      fs.unlinkSync(localPath);
      log.info(`[小程序] 已删除文件: ${localPath}`);
      return res.json({ success: true, message: '文件已删除' });
    }

    // 如果是OSS文件，尝试通过 ali-oss 删除
    try {
      const OSS = (await import('ali-oss')).default;
      const { AppDataSource } = await import('../../config/database');
      const { TenantSettings } = await import('../../entities/TenantSettings');
      const settingsRepo = AppDataSource.getRepository(TenantSettings);
      const ossSetting = await settingsRepo.findOne({ where: { settingKey: 'oss_config' } });
      if (ossSetting) {
        const ossConfig = typeof ossSetting.settingValue === 'string'
          ? JSON.parse(ossSetting.settingValue)
          : ossSetting.settingValue;
        if (ossConfig.accessKeyId && ossConfig.bucket) {
          const client = new OSS(ossConfig);
          const key = urlPath.replace(/^\//, '');
          await client.delete(key);
          log.info(`[小程序] 已删除OSS文件: ${key}`);
          return res.json({ success: true, message: '文件已删除' });
        }
      }
    } catch { /* ignore */ }

    res.json({ success: true, message: '文件不存在或已删除' });
  } catch (error: any) {
    log.error('[小程序] 删除文件失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

// ==================== 地址数据接口 ====================

let _addressCache: any[] | null = null;

function loadAddressData(): any[] {
  if (_addressCache) return _addressCache;
  try {
    const addressPath = path.resolve(__dirname, '../../../public/data/address.json');
    if (!fs.existsSync(addressPath)) {
      // 尝试从主项目的 public/data 加载
      const altPath = path.resolve(__dirname, '../../../../public/data/address.json');
      if (fs.existsSync(altPath)) {
        _addressCache = JSON.parse(fs.readFileSync(altPath, 'utf-8'));
        return _addressCache!;
      }
      return [];
    }
    _addressCache = JSON.parse(fs.readFileSync(addressPath, 'utf-8'));
    return _addressCache!;
  } catch (e) {
    log.warn('[小程序] 加载地址数据失败:', e);
    return [];
  }
}

/**
 * ⑨ GET /address-streets - 获取街道列表（根据省/市/区）
 */
router.get('/address-streets', async (req: Request, res: Response) => {
  try {
    const { province, city, district } = req.query as any;
    if (!province || !city || !district) {
      return res.status(400).json({ success: false, message: '缺少省/市/区参数' });
    }

    const data = loadAddressData();
    const prov = data.find((p: any) => p.label === province || p.value === province);
    if (!prov) return res.json({ success: true, data: [] });

    const cit = prov.children?.find((c: any) => c.label === city || c.value === city);
    if (!cit) return res.json({ success: true, data: [] });

    const dist = cit.children?.find((d: any) => d.label === district || d.value === district);
    if (!dist) return res.json({ success: true, data: [] });

    const streets = (dist.children || []).map((s: any) => ({ label: s.label, value: s.value }));
    res.json({ success: true, data: streets });
  } catch (error: any) {
    log.error('[小程序] 获取街道列表失败:', error);
    res.status(500).json({ success: false, message: '获取街道列表失败' });
  }
});

export default router;
