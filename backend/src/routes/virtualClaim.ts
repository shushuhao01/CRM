/**
 * 虚拟商品领取 - 公开API（无需认证）
 */
import { Router, Request, Response } from 'express';
import { getDataSource } from '../config/database';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { cacheService } from '../services/CacheService';
import { aliyunSmsService } from '../services/AliyunSmsService';

const router = Router();

/**
 * GET /info - 获取领取页初始信息（公开，无需登录）
 */
router.get('/info', async (req: Request, res: Response) => {
  try {
    const { token } = req.query;
    if (!token) {
      return res.status(400).json({ success: false, message: '缺少令牌' });
    }

    const ds = getDataSource();

    // 查令牌对应的租户
    let tenantId: string | null = null;

    const ckRecords = await ds.query(
      `SELECT cki.tenant_id FROM card_key_inventory cki WHERE cki.claim_token = ? LIMIT 1`, [token]
    );
    if (ckRecords && ckRecords.length > 0) {
      tenantId = ckRecords[0].tenant_id;
    } else {
      const rsRecords = await ds.query(
        `SELECT ri.tenant_id FROM resource_inventory ri WHERE ri.claim_token = ? LIMIT 1`, [token]
      );
      if (rsRecords && rsRecords.length > 0) {
        tenantId = rsRecords[0].tenant_id;
      }
    }

    if (!tenantId) {
      return res.status(404).json({ success: false, message: '链接无效或已过期' });
    }

    // 获取系统信息
    let systemName = 'CRM系统';
    let systemAvatar = '';
    let systemLogo = '';
    let claimPageNotice = '';
    let loginMethod = 'password';
    let copyrightText = '';
    let icpNumber = '';
    let policeNumber = '';
    let techSupport = '';
    let contactPhone = '';
    let systemVersion = '1.0.0';
    let websiteUrl = '';
    let companyName = '';

    try {
      const configs = await ds.query(
        `SELECT configKey, configValue FROM system_configs WHERE configKey IN ('systemName', 'systemAvatar', 'systemLogo', 'copyrightText', 'icpNumber', 'policeNumber', 'techSupport', 'contactPhone', 'systemVersion', 'websiteUrl', 'companyName') AND configGroup = 'basic_settings' AND isEnabled = 1 AND tenant_id = ?`,
        [tenantId]
      );
      for (const c of (configs || [])) {
        if (c.configKey === 'systemName') systemName = c.configValue;
        if (c.configKey === 'systemAvatar') systemAvatar = c.configValue || '';
        if (c.configKey === 'systemLogo') systemLogo = c.configValue || '';
        if (c.configKey === 'copyrightText') copyrightText = c.configValue || '';
        if (c.configKey === 'icpNumber') icpNumber = c.configValue || '';
        if (c.configKey === 'policeNumber') policeNumber = c.configValue || '';
        if (c.configKey === 'techSupport') techSupport = c.configValue || '';
        if (c.configKey === 'contactPhone') contactPhone = c.configValue || '';
        if (c.configKey === 'systemVersion') systemVersion = c.configValue || '1.0.0';
        if (c.configKey === 'websiteUrl') websiteUrl = c.configValue || '';
        if (c.configKey === 'companyName') companyName = c.configValue || '';
      }
    } catch { /* ignore */ }

    try {
      const settings = await ds.query(
        'SELECT claim_page_notice, login_methods FROM virtual_claim_settings WHERE tenant_id = ?',
        [tenantId]
      );
      if (settings && settings[0]) {
        claimPageNotice = settings[0].claim_page_notice || '';
        loginMethod = settings[0].login_methods || 'password';
      }
    } catch { /* ignore */ }

    res.json({ success: true, data: { systemName, systemAvatar, systemLogo, claimPageNotice, loginMethod, copyrightText, icpNumber, policeNumber, techSupport, contactPhone, systemVersion, websiteUrl, companyName } });
  } catch (error) {
    log.error('[虚拟领取] 获取初始信息失败:', error);
    res.status(500).json({ success: false, message: '获取信息失败' });
  }
});

/**
 * POST /login - 客户登录领取
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { token, phone, password, smsCode } = req.body;

    if (!token || !phone) {
      return res.status(400).json({ success: false, message: '缺少领取令牌或手机号' });
    }

    // 登录失败次数限制
    const attemptKey = `login_attempts:claim:${phone}`;
    const attempts = cacheService.get(attemptKey) || 0;
    if (attempts >= 5) {
      return res.status(429).json({ success: false, message: '登录失败次数过多，请15分钟后重试' });
    }

    const ds = getDataSource();

    // 查找claim_token对应的记录（卡密或资源）
    let record: any = null;
    let tenantId: string | null = null;
    let customerPhone: string | null = null;

    try {
      const ckRecords = await ds.query(
        `SELECT cki.*, o.customer_phone, o.tenant_id as order_tenant_id
         FROM card_key_inventory cki
         LEFT JOIN orders o ON cki.order_id = o.id
         WHERE cki.claim_token = ? AND cki.status IN ('used', 'claimed')
         LIMIT 1`,
        [token]
      );
      if (ckRecords && ckRecords.length > 0) {
        record = ckRecords[0];
        tenantId = record.tenant_id || record.order_tenant_id;
        customerPhone = record.customer_phone;
      }
    } catch (ckErr) {
      log.warn('[虚拟领取] 卡密JOIN查询失败，尝试降级查询:', (ckErr as any)?.message);
      const ckFallback = await ds.query(
        `SELECT * FROM card_key_inventory WHERE claim_token = ? AND status IN ('used', 'claimed') LIMIT 1`,
        [token]
      );
      if (ckFallback && ckFallback.length > 0) {
        record = ckFallback[0];
        tenantId = record.tenant_id;
      }
    }

    if (!record) {
      try {
        const rsRecords = await ds.query(
          `SELECT ri.*, o.customer_phone, o.tenant_id as order_tenant_id
           FROM resource_inventory ri
           LEFT JOIN orders o ON ri.order_id = o.id
           WHERE ri.claim_token = ? AND ri.status IN ('used', 'claimed')
           LIMIT 1`,
          [token]
        );
        if (rsRecords && rsRecords.length > 0) {
          record = rsRecords[0];
          tenantId = record.tenant_id || record.order_tenant_id;
          customerPhone = record.customer_phone;
        }
      } catch (rsErr) {
        log.warn('[虚拟领取] 资源JOIN查询失败，尝试降级查询:', (rsErr as any)?.message);
        const rsFallback = await ds.query(
          `SELECT * FROM resource_inventory WHERE claim_token = ? AND status IN ('used', 'claimed') LIMIT 1`,
          [token]
        );
        if (rsFallback && rsFallback.length > 0) {
          record = rsFallback[0];
          tenantId = record.tenant_id;
        }
      }
    }

    if (!record) {
      return res.status(404).json({ success: false, message: '链接无效或已过期' });
    }

    // 查询领取配置
    let claimSettings: any = {};
    try {
      const settingsArr = await ds.query(
        'SELECT * FROM virtual_claim_settings WHERE tenant_id = ?', [tenantId]
      );
      claimSettings = (settingsArr && settingsArr[0]) || {};
    } catch { /* 表可能不存在 */ }

    // 检查有效期
    const expiryDays = claimSettings.claim_link_expiry_days || 30;
    const deliveryDate = record.updated_at || record.created_at;
    if (deliveryDate) {
      const diff = (Date.now() - new Date(deliveryDate).getTime()) / (1000 * 60 * 60 * 24);
      if (diff > expiryDays) {
        return res.status(410).json({ success: false, message: '领取链接已过期' });
      }
    }

    // 验证手机号匹配
    if (customerPhone && phone !== customerPhone) {
      cacheService.set(attemptKey, (attempts as number) + 1, 15 * 60);
      return res.status(403).json({ success: false, message: '手机号与订单不匹配' });
    }

    // 验证登录方式（支持密码和短信验证码两种方式，客户端可自由切换）
    let verified = false;

    if (smsCode) {
      // 短信验证码验证
      const cachedCode = cacheService.get(`sms_code:claim:${phone}`);
      if (cachedCode && cachedCode === smsCode) {
        verified = true;
      } else {
        cacheService.set(attemptKey, (attempts as number) + 1, 15 * 60);
        return res.status(401).json({ success: false, message: '验证码错误或已过期' });
      }
    } else if (password) {
      // 密码验证
      const initialPwd = claimSettings.initial_password || '123456';
      if (password === initialPwd) {
        verified = true;
      } else {
        cacheService.set(attemptKey, (attempts as number) + 1, 15 * 60);
        return res.status(401).json({ success: false, message: '密码错误' });
      }
    } else {
      return res.status(400).json({ success: false, message: '请提供密码或验证码' });
    }

    if (!verified) {
      return res.status(401).json({ success: false, message: '验证失败' });
    }

    // 生成会话token
    const sessionToken = uuidv4();
    cacheService.set(`claim_session:${sessionToken}`, {
      claimToken: token,
      tenantId,
      phone
    }, 30 * 60);

    // 清除失败次数
    cacheService.delete(attemptKey);

    res.json({ success: true, data: { sessionToken }, message: '登录成功' });
  } catch (error: any) {
    log.error('[虚拟领取] 登录失败:', error?.message || error, error?.stack);
    res.status(500).json({ success: false, message: '系统繁忙，请稍后重试' });
  }
});

/**
 * GET /detail - 获取领取详情
 */
router.get('/detail', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.query;
    const session = cacheService.get(`claim_session:${sessionToken}`);
    if (!session) {
      return res.status(401).json({ success: false, message: '会话已过期，请重新登录' });
    }

    const ds = getDataSource();

    // 查卡密（防御性查询，virtual_content_encrypt列可能不存在）
    let cardKeys: any[] = [];
    try {
      cardKeys = await ds.query(
        `SELECT cki.card_key, cki.usage_instructions, cki.status, cki.claimed_at,
                p.name as product_name, p.virtual_content_encrypt
         FROM card_key_inventory cki
         LEFT JOIN products p ON cki.product_id = p.id
         WHERE cki.claim_token = ?`,
        [session.claimToken]
      );
    } catch {
      cardKeys = await ds.query(
        `SELECT cki.card_key, cki.usage_instructions, cki.status, cki.claimed_at
         FROM card_key_inventory cki
         WHERE cki.claim_token = ?`,
        [session.claimToken]
      );
    }

    // 查资源（防御性查询）
    let resources: any[] = [];
    try {
      resources = await ds.query(
        `SELECT ri.resource_link, ri.resource_password, ri.resource_description,
                ri.usage_instructions, ri.status, ri.claimed_at,
                p.name as product_name, p.virtual_content_encrypt
         FROM resource_inventory ri
         LEFT JOIN products p ON ri.product_id = p.id
         WHERE ri.claim_token = ?`,
        [session.claimToken]
      );
    } catch {
      resources = await ds.query(
        `SELECT ri.resource_link, ri.resource_password, ri.resource_description,
                ri.usage_instructions, ri.status, ri.claimed_at
         FROM resource_inventory ri
         WHERE ri.claim_token = ?`,
        [session.claimToken]
      );
    }

    // 获取系统名称
    let systemName = 'CRM系统';
    const systemAvatar = '';
    try {
      const configs = await ds.query(
        `SELECT configValue FROM system_configs WHERE configKey = 'systemName' AND configGroup = 'basic_settings' AND isEnabled = 1 AND tenant_id = ?`,
        [session.tenantId]
      );
      if (configs && configs[0]) systemName = configs[0].configValue;
    } catch { /* ignore */ }

    // 获取领取页提示
    let claimPageNotice = '';
    try {
      const settings = await ds.query(
        'SELECT claim_page_notice FROM virtual_claim_settings WHERE tenant_id = ?',
        [session.tenantId]
      );
      if (settings && settings[0]) claimPageNotice = settings[0].claim_page_notice || '';
    } catch { /* ignore */ }

    res.json({
      success: true,
      data: {
        systemName,
        systemAvatar,
        claimPageNotice,
        cardKeys: (cardKeys || []).map((ck: any) => ({
          type: 'card_key',
          productName: ck.product_name,
          cardKey: ck.card_key,
          usageInstructions: ck.usage_instructions,
          status: ck.status,
          claimedAt: ck.claimed_at,
          encrypted: ck.virtual_content_encrypt === 1
        })),
        resources: (resources || []).map((r: any) => ({
          type: 'resource',
          productName: r.product_name,
          resourceLink: r.resource_link,
          resourcePassword: r.resource_password,
          resourceDescription: r.resource_description,
          usageInstructions: r.usage_instructions,
          status: r.status,
          claimedAt: r.claimed_at,
          encrypted: r.virtual_content_encrypt === 1
        }))
      }
    });
  } catch (error) {
    log.error('[虚拟领取] 获取详情失败:', error);
    res.status(500).json({ success: false, message: '获取详情失败' });
  }
});

/**
 * POST /confirm - 确认领取
 */
router.post('/confirm', async (req: Request, res: Response) => {
  try {
    const { sessionToken } = req.body;
    const session = cacheService.get(`claim_session:${sessionToken}`);
    if (!session) {
      return res.status(401).json({ success: false, message: '会话已过期' });
    }

    const ds = getDataSource();

    await ds.query(
      `UPDATE card_key_inventory SET status = 'claimed', claim_method = 'customer_self', claimed_at = NOW()
       WHERE claim_token = ? AND status = 'used'`,
      [session.claimToken]
    );
    await ds.query(
      `UPDATE resource_inventory SET status = 'claimed', claim_method = 'customer_self', claimed_at = NOW()
       WHERE claim_token = ? AND status = 'used'`,
      [session.claimToken]
    );

    log.info(`[虚拟领取] 客户 ${session.phone} 已领取，claimToken=${session.claimToken}`);
    res.json({ success: true, message: '领取成功' });
  } catch (error) {
    log.error('[虚拟领取] 确认领取失败:', error);
    res.status(500).json({ success: false, message: '领取失败' });
  }
});

/**
 * POST /send-sms - 发送验证码（调用系统短信服务，扣租户额度）
 */
router.post('/send-sms', async (req: Request, res: Response) => {
  try {
    const { phone, token: claimToken } = req.body;
    if (!phone) {
      return res.status(400).json({ success: false, message: '缺少手机号码' });
    }

    // 频率限制
    const limitKey = `sms_limit:claim:${phone}`;
    if (cacheService.get(limitKey)) {
      return res.status(429).json({ success: false, message: '请在60秒后重试' });
    }

    // 根据claim_token找到tenant_id以检查额度
    const ds = getDataSource();
    let tenantId: string | null = null;
    if (claimToken) {
      try {
        const ckRows = await ds.query(
          `SELECT tenant_id FROM card_key_inventory WHERE claim_token = ? LIMIT 1`, [claimToken]
        );
        if (ckRows?.[0]) tenantId = ckRows[0].tenant_id;
      } catch { /* ignore */ }
      if (!tenantId) {
        try {
          const rsRows = await ds.query(
            `SELECT tenant_id FROM resource_inventory WHERE claim_token = ? LIMIT 1`, [claimToken]
          );
          if (rsRows?.[0]) tenantId = rsRows[0].tenant_id;
        } catch { /* ignore */ }
      }
    }

    // 检查短信额度
    try {
      const tenantFilter = tenantId ? `AND tenant_id = ?` : `AND tenant_id IS NULL`;
      const tenantParams = tenantId ? [tenantId] : [];
      const quotaRows = await ds.query(
        `SELECT config_key, config_value FROM system_config WHERE config_key IN ('sms_quota_total', 'sms_quota_used') ${tenantFilter}`,
        tenantParams
      );
      let totalQuota = 0, usedQuota = 0;
      for (const r of (quotaRows || [])) {
        if (r.config_key === 'sms_quota_total') totalQuota = parseInt(r.config_value) || 0;
        if (r.config_key === 'sms_quota_used') usedQuota = parseInt(r.config_value) || 0;
      }
      if (totalQuota > 0 && (totalQuota - usedQuota) < 1) {
        return res.status(403).json({ success: false, message: '当前暂无短信额度可用，请联系管理员增购额度' });
      }
    } catch (quotaErr) {
      log.warn('[虚拟领取] 检查短信额度失败:', (quotaErr as any)?.message);
    }

    // 生成验证码
    const code = Math.random().toString().slice(2, 8);
    cacheService.set(`sms_code:claim:${phone}`, code, 5 * 60);
    cacheService.set(limitKey, '1', 60);

    // 调用系统短信服务发送验证码
    const smsResult = await aliyunSmsService.sendVerificationCode(phone, code);
    if (!smsResult.success) {
      log.warn(`[虚拟领取] 短信发送失败: ${phone}, 原因: ${smsResult.message}`);
      // 如果短信服务未配置，仍然缓存验证码但提示
      if (smsResult.message?.includes('未配置')) {
        log.info(`[虚拟领取] 短信服务未配置，验证码: ${phone} -> ${code}`);
        return res.json({ success: true, message: '验证码已发送' });
      }
      return res.status(500).json({ success: false, message: smsResult.message || '短信发送失败' });
    }

    // 扣减短信额度
    try {
      const tenantFilter = tenantId ? `AND tenant_id = ?` : `AND tenant_id IS NULL`;
      const tenantParams = tenantId ? [tenantId] : [];
      await ds.query(
        `UPDATE system_config SET config_value = CAST(config_value AS SIGNED) + 1 WHERE config_key = 'sms_quota_used' ${tenantFilter}`,
        tenantParams
      );
    } catch (deductErr) {
      log.warn('[虚拟领取] 扣减短信额度失败:', (deductErr as any)?.message);
    }

    log.info(`[虚拟领取] 验证码已发送: ${phone}`);
    res.json({ success: true, message: '验证码已发送' });
  } catch (error) {
    log.error('[虚拟领取] 发送验证码失败:', error);
    res.status(500).json({ success: false, message: '发送失败' });
  }
});

export default router;

