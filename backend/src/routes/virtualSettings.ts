/**
 * 虚拟商品设置API
 * 管理领取配置和租户邮箱配置
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { getDataSource } from '../config/database';
import { log } from '../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();
router.use(authenticateToken);

function getTenantId(req: Request): string | null {
  return (req as any).user?.tenantId || null;
}

/**
 * GET /virtual-claim - 获取领取配置
 */
router.get('/virtual-claim', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const ds = getDataSource();

    const [settings] = await ds.query(
      'SELECT * FROM virtual_claim_settings WHERE tenant_id = ?', [tenantId]
    );

    if (!settings) {
      // 返回默认配置
      return res.json({
        success: true,
        data: {
          deliveryMode: 'link',
          claimLinkExpiryDays: 30,
          loginMethods: 'password',
          initialPassword: '123456',
          claimPageNotice: '',
          emailEnabled: false,
          emailSource: 'official',
          emailContentMode: 'link',
          emailAutoSend: false
        }
      });
    }

    res.json({
      success: true,
      data: {
        deliveryMode: settings.delivery_mode || 'link',
        claimLinkExpiryDays: settings.claim_link_expiry_days || 30,
        loginMethods: settings.login_methods || 'password',
        initialPassword: settings.initial_password || '123456',
        claimPageNotice: settings.claim_page_notice || '',
        emailEnabled: settings.email_enabled === 1,
        emailSource: settings.email_source || 'official',
        emailContentMode: settings.email_content_mode || 'link',
        emailAutoSend: settings.email_auto_send === 1
      }
    });
  } catch (error) {
    log.error('[虚拟设置] 获取领取配置失败:', error);
    res.status(500).json({ success: false, message: '获取配置失败' });
  }
});

/**
 * PUT /virtual-claim - 更新领取配置
 */
router.put('/virtual-claim', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const {
      deliveryMode, claimLinkExpiryDays, loginMethods, initialPassword,
      claimPageNotice, emailEnabled, emailSource, emailContentMode, emailAutoSend
    } = req.body;

    const ds = getDataSource();

    await ds.query(
      `INSERT INTO virtual_claim_settings (id, tenant_id, delivery_mode, claim_link_expiry_days, login_methods, initial_password, claim_page_notice, email_enabled, email_source, email_content_mode, email_auto_send, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       delivery_mode = VALUES(delivery_mode),
       claim_link_expiry_days = VALUES(claim_link_expiry_days),
       login_methods = VALUES(login_methods),
       initial_password = VALUES(initial_password),
       claim_page_notice = VALUES(claim_page_notice),
       email_enabled = VALUES(email_enabled),
       email_source = VALUES(email_source),
       email_content_mode = VALUES(email_content_mode),
       email_auto_send = VALUES(email_auto_send),
       updated_at = NOW()`,
      [uuidv4(), tenantId, deliveryMode || 'link', claimLinkExpiryDays || 30,
       loginMethods || 'password', initialPassword || '123456',
       claimPageNotice || '', emailEnabled ? 1 : 0, emailSource || 'official',
       emailContentMode || 'link', emailAutoSend ? 1 : 0]
    );

    res.json({ success: true, message: '配置已保存' });
  } catch (error) {
    log.error('[虚拟设置] 保存领取配置失败:', error);
    res.status(500).json({ success: false, message: '保存配置失败' });
  }
});

/**
 * GET /tenant-email - 获取租户邮箱配置
 */
router.get('/tenant-email', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const ds = getDataSource();

    const [config] = await ds.query(
      'SELECT * FROM tenant_email_config WHERE tenant_id = ?', [tenantId]
    );

    if (!config) {
      return res.json({ success: true, data: null });
    }

    res.json({
      success: true,
      data: {
        smtpHost: config.smtp_host,
        smtpPort: config.smtp_port,
        encryption: config.encryption,
        senderEmail: config.sender_email,
        senderPassword: '******', // 脱敏
        senderName: config.sender_name,
        isVerified: config.is_verified === 1
      }
    });
  } catch (error) {
    log.error('[虚拟设置] 获取邮箱配置失败:', error);
    res.status(500).json({ success: false, message: '获取邮箱配置失败' });
  }
});

/**
 * PUT /tenant-email - 保存租户邮箱配置
 */
router.put('/tenant-email', async (req: Request, res: Response) => {
  try {
    const tenantId = getTenantId(req);
    const { smtpHost, smtpPort, encryption, senderEmail, senderPassword, senderName } = req.body;

    if (!smtpHost || !senderEmail || !senderPassword) {
      return res.status(400).json({ success: false, message: '缺少必要的邮箱配置' });
    }

    const ds = getDataSource();

    await ds.query(
      `INSERT INTO tenant_email_config (id, tenant_id, smtp_host, smtp_port, encryption, sender_email, sender_password, sender_name, is_verified, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, NOW(), NOW())
       ON DUPLICATE KEY UPDATE
       smtp_host = VALUES(smtp_host),
       smtp_port = VALUES(smtp_port),
       encryption = VALUES(encryption),
       sender_email = VALUES(sender_email),
       sender_password = VALUES(sender_password),
       sender_name = VALUES(sender_name),
       is_verified = 0,
       updated_at = NOW()`,
      [uuidv4(), tenantId, smtpHost, smtpPort || 465, encryption || 'ssl',
       senderEmail, senderPassword, senderName || '']
    );

    res.json({ success: true, message: '邮箱配置已保存' });
  } catch (error) {
    log.error('[虚拟设置] 保存邮箱配置失败:', error);
    res.status(500).json({ success: false, message: '保存失败' });
  }
});

/**
 * POST /tenant-email/test - 测试邮箱连接
 */
router.post('/tenant-email/test', async (req: Request, res: Response) => {
  try {
    const { smtpHost, smtpPort, encryption, senderEmail, senderPassword } = req.body;

    // 尝试创建连接（不实际发送）
    try {
      const nodemailer = require('nodemailer');
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort || 465,
        secure: encryption === 'ssl',
        auth: { user: senderEmail, pass: senderPassword },
        connectionTimeout: 10000
      });
      await transporter.verify();

      // 更新验证状态
      const tenantId = getTenantId(req);
      await getDataSource().query(
        'UPDATE tenant_email_config SET is_verified = 1, updated_at = NOW() WHERE tenant_id = ?',
        [tenantId]
      );

      res.json({ success: true, message: '连接成功' });
    } catch (e: any) {
      res.json({ success: false, message: `连接失败: ${e.message}` });
    }
  } catch (error) {
    log.error('[虚拟设置] 测试邮箱连接失败:', error);
    res.status(500).json({ success: false, message: '测试失败' });
  }
});

export default router;

