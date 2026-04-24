/**
 * 会员中心 - 企微服务路由
 * 提供会员查看企微绑定状态、会话存档授权状态
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { memberAuth } from '../../middleware/memberAuth';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// 全部需要会员认证
router.use(memberAuth);

/**
 * 获取企微服务状态
 * GET /api/v1/public/member/wecom
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    // 查询租户的企微配置
    const configs = await AppDataSource.query(
      `SELECT id, name, corp_id, is_enabled, connection_status, created_at
       FROM wecom_configs WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId]
    ).catch(() => []);

    // 查询会话存档授权状态
    const tenantRows = await AppDataSource.query(
      'SELECT wecom_chat_archive_auth FROM tenants WHERE id = ?',
      [tenantId]
    ).catch(() => []);

    const chatArchiveAuth = !!(tenantRows[0]?.wecom_chat_archive_auth);

    // 统计数据
    let customerCount = 0;
    let bindingCount = 0;
    if (configs.length > 0) {
      const configIds = configs.map((c: any) => c.id);
      const placeholders = configIds.map(() => '?').join(',');

      const customerResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_customers WHERE wecom_config_id IN (${placeholders})`,
        configIds
      ).catch(() => [{ cnt: 0 }]);
      customerCount = customerResult[0]?.cnt || 0;

      const bindingResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_user_bindings WHERE wecom_config_id IN (${placeholders})`,
        configIds
      ).catch(() => [{ cnt: 0 }]);
      bindingCount = bindingResult[0]?.cnt || 0;
    }

    // 获取增值服务价格（供前端展示）
    const vasRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    let vasConfig = null;
    if (vasRows.length > 0) {
      try { vasConfig = JSON.parse(vasRows[0].config_value); } catch {}
    }

    // 获取当前套餐信息（currentPlan）
    let currentPlan = null;
    const archiveRows = await AppDataSource.query(
      `SELECT max_users, used_users, status, expire_date, storage_type, created_at
       FROM wecom_archive_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    ).catch(() => []);

    if (archiveRows.length > 0) {
      const ar = archiveRows[0];
      const expireDate = ar.expire_date ? new Date(ar.expire_date) : null;
      const now = new Date();
      const daysRemaining = expireDate ? Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : 0;
      currentPlan = {
        maxUsers: ar.max_users || 0,
        usedUsers: ar.used_users || 0,
        status: ar.status || 'disabled',
        expireDate: ar.expire_date || null,
        storageType: ar.storage_type || 'local',
        daysRemaining: Math.max(0, daysRemaining),
        canRenew: ar.status === 'active' && daysRemaining <= 30 && daysRemaining > 0,
        canUpgrade: ar.status === 'active' && daysRemaining > 0
      };
    }

    // 提取presetPackages和renewalDiscount
    const chatArchiveConfig = vasConfig?.chatArchive || null;
    const presetPackages = chatArchiveConfig?.presetPackages || [
      { users: 5, label: '入门', recommended: false },
      { users: 10, label: '基础', recommended: false },
      { users: 20, label: '标准', recommended: false },
      { users: 50, label: '推荐', recommended: true },
      { users: 100, label: '企业', recommended: false },
      { users: 200, label: '集团', recommended: false }
    ];
    const renewalDiscount = chatArchiveConfig?.renewalDiscount || 0.9;

    res.json({
      code: 0,
      data: {
        hasWecomConfig: configs.length > 0,
        configs: configs.map((c: any) => ({
          id: c.id,
          name: c.name,
          corpId: c.corp_id,
          isEnabled: !!c.is_enabled,
          connectionStatus: c.connection_status,
          createdAt: c.created_at
        })),
        chatArchiveAuth,
        currentPlan,
        presetPackages,
        renewalDiscount,
        stats: {
          configCount: configs.length,
          customerCount,
          bindingCount
        },
        vasConfig: chatArchiveConfig ? {
          defaultPrice: chatArchiveConfig.defaultPrice,
          billingUnit: chatArchiveConfig.billingUnit,
          trialDays: chatArchiveConfig.trialDays,
          description: chatArchiveConfig.description,
          tierPricing: chatArchiveConfig.tierPricing || [],
          purchaseMode: chatArchiveConfig.purchaseMode || 'proxy_only',
          seatServiceFee: chatArchiveConfig.seatServiceFee || 0,
          wecomFeeNote: '企业微信会话存档接口为企微官方收费功能，需在企微后台自行申请开通并支付。以下为云客平台服务费。'
        } : null
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Get status error:', error.message);
    res.status(500).json({ code: 1, message: '获取企微服务状态失败' });
  }
});

/**
 * 购买会话存档增值服务（会员中心）
 * POST /api/v1/public/member/wecom/purchase
 */
router.post('/purchase', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const { userCount, payType, purchaseMode } = req.body;

    if (!userCount || userCount < 1) {
      return res.status(400).json({ code: 1, message: '请选择开通人数' });
    }
    if (!payType || !['wechat', 'alipay', 'bank'].includes(payType)) {
      return res.status(400).json({ code: 1, message: '请选择支付方式' });
    }

    // 获取租户名称
    const tRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [tenantId]);
    const tenantName = tRows[0]?.name || '';
    const contactName = tRows[0]?.contact || '';

    // 获取VAS定价
    const vasRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    let tierPricing = [
      { min: 1, max: 10, price: 100 },
      { min: 11, max: 50, price: 90 },
      { min: 51, max: 100, price: 80 },
      { min: 101, max: 999999, price: 70 }
    ];
    let configPurchaseMode = 'proxy_only';
    let seatServiceFee = 0;
    if (vasRows.length > 0) {
      try {
        const parsed = JSON.parse(vasRows[0].config_value);
        if (parsed.chatArchive?.tierPricing) tierPricing = parsed.chatArchive.tierPricing;
        if (parsed.chatArchive?.purchaseMode) configPurchaseMode = parsed.chatArchive.purchaseMode;
        if (parsed.chatArchive?.seatServiceFee) seatServiceFee = parsed.chatArchive.seatServiceFee;
      } catch {}
    }

    // 确定实际购买模式
    const effectiveMode = (purchaseMode === 'service_fee' && configPurchaseMode === 'both') ? 'service_fee' : 'proxy';
    const modeName = effectiveMode === 'service_fee' ? '服务费' : '代购';

    let unitPrice = 100;
    let totalAmount: number;

    if (effectiveMode === 'service_fee') {
      unitPrice = seatServiceFee;
      totalAmount = userCount * seatServiceFee;
    } else {
      for (const tier of tierPricing) {
        if (userCount >= tier.min && userCount <= tier.max) {
          unitPrice = tier.price;
          break;
        }
      }
      totalAmount = userCount * unitPrice;
    }

    // 生成订单号
    const now = new Date();
    const dateStr = now.getFullYear().toString() +
      String(now.getMonth() + 1).padStart(2, '0') +
      String(now.getDate()).padStart(2, '0') +
      String(now.getHours()).padStart(2, '0') +
      String(now.getMinutes()).padStart(2, '0') +
      String(now.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNo = `VAS${dateStr}${random}`;
    const orderId = uuidv4();

    // 调用PaymentService
    let qrCode = '';
    let payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const modeName = effectiveMode === 'service_fee' ? '服务费' : '代购';
      const payResult = await paymentService.createOrder({
        packageId: effectiveMode === 'service_fee' ? 'vas_chat_archive_service_fee' : 'vas_chat_archive',
        packageName: `会话存档${modeName}(${userCount}人/年)`,
        amount: totalAmount,
        payType: payType as 'wechat' | 'alipay' | 'bank',
        tenantId,
        tenantName,
        contactName,
        contactPhone: '',
        billingCycle: 'yearly'
      });
      if (payResult.success) {
        qrCode = payResult.qrCode || '';
        payUrl = payResult.payUrl || '';
        if (qrCode && !qrCode.startsWith('http') && !qrCode.startsWith('data:')) {
          qrCode = '';
        }
      }
    } catch (payErr: any) {
      log.warn('[Member Wecom] Payment service failed:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    // 写入payment_orders
    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name,
        amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at)
       VALUES (?, ?, 'tenant', ?, ?, 'vas_chat_archive', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName,
       `会话存档${modeName}(${userCount}人/年)`, totalAmount, payType,
       qrCode, payUrl, contactName,
       new Date(Date.now() + 30 * 60 * 1000),
       `企微会话存档VAS - ${userCount}人/年 - 单价¥${unitPrice} - 模式:${effectiveMode === 'service_fee' ? '服务费自购' : '代购'} - 来源:会员中心`]
    );

    // 预创建设置
    await AppDataSource.query(
      `INSERT INTO wecom_archive_settings (tenant_id, max_users, status) VALUES (?, ?, 'disabled')
       ON DUPLICATE KEY UPDATE max_users = VALUES(max_users)`,
      [tenantId, userCount]
    ).catch(() => {});

    log.info(`[Member Wecom] VAS order: ${orderNo}, tenant=${tenantName}, ${userCount} users, ¥${totalAmount}`);

    res.json({
      code: 0,
      data: {
        orderId,
        orderNo,
        amount: totalAmount,
        userCount,
        unitPrice,
        qrCode,
        payUrl,
        payType,
        packageName: `会话存档${modeName}(${userCount}人/年)`,
        purchaseMode: effectiveMode
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Purchase error:', error.message);
    res.status(500).json({ code: 1, message: '创建订单失败' });
  }
});

/**
 * 查询VAS订单状态（会员中心）
 * GET /api/v1/public/member/wecom/order/:orderNo
 */
router.get('/order/:orderNo', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const { orderNo } = req.params;
    const rows = await AppDataSource.query(
      `SELECT id, order_no, amount, status, pay_type, paid_at, package_name FROM payment_orders
       WHERE order_no = ? AND tenant_id = ? LIMIT 1`,
      [orderNo, tenantId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ code: 1, message: '订单不存在' });
    }

    const order = rows[0];
    if (order.status === 'paid') {
      await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]).catch(() => {});
      await AppDataSource.query(
        "UPDATE wecom_archive_settings SET status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE tenant_id = ?",
        [tenantId]
      ).catch(() => {});
      // 解锁会话存档权限
      try {
        const pkgKey = `tenant_wecom_package_${tenantId}`;
        const pkgRows = await AppDataSource.query("SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [pkgKey]).catch(() => []);
        let tenantPkg: any = {};
        if (pkgRows.length > 0) { try { tenantPkg = JSON.parse(pkgRows[0].config_value); } catch { tenantPkg = {}; } }
        if (!tenantPkg.menuPermissions) tenantPkg.menuPermissions = {};
        tenantPkg.menuPermissions.chatArchive = true;
        tenantPkg.updatedAt = new Date().toISOString();
        const pkgVal = JSON.stringify(tenantPkg);
        if (pkgRows.length > 0) {
          await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [pkgVal, pkgKey]);
        } else {
          await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [pkgKey, pkgVal]);
        }
      } catch { /* 非关键路径 */ }
    }

    res.json({
      code: 0,
      data: {
        orderNo: order.order_no,
        status: order.status,
        amount: order.amount,
        payType: order.pay_type,
        paidAt: order.paid_at,
        packageName: order.package_name
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Order status error:', error.message);
    res.status(500).json({ code: 1, message: '查询订单失败' });
  }
});

/**
 * 获取企微授权详情
 * GET /api/v1/public/member/wecom/auth-info
 */
router.get('/auth-info', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    // 获取企微配置详情
    const configs = await AppDataSource.query(
      `SELECT id, name, corp_id, auth_type, is_enabled, connection_status,
              agent_id, vas_chat_archive, vas_expire_date, vas_user_count,
              data_api_status, created_at, updated_at
       FROM wecom_configs WHERE tenant_id = ? ORDER BY created_at DESC`,
      [tenantId]
    ).catch(() => []);

    // 获取每个配置的关联统计
    const configDetails = [];
    for (const c of configs) {
      const custCount = await AppDataSource.query(
        'SELECT COUNT(*) as cnt FROM wecom_customers WHERE wecom_config_id = ?', [c.id]
      ).catch(() => [{ cnt: 0 }]);

      const bindCount = await AppDataSource.query(
        'SELECT COUNT(*) as cnt FROM wecom_user_bindings WHERE wecom_config_id = ?', [c.id]
      ).catch(() => [{ cnt: 0 }]);

      configDetails.push({
        id: c.id,
        name: c.name,
        corpId: c.corp_id,
        authType: c.auth_type || 'self_built',
        isEnabled: !!c.is_enabled,
        connectionStatus: c.connection_status,
        agentId: c.agent_id,
        vasChatArchive: !!c.vas_chat_archive,
        vasExpireDate: c.vas_expire_date,
        vasUserCount: c.vas_user_count || 0,
        dataApiStatus: c.data_api_status || 0,
        customerCount: custCount[0]?.cnt || 0,
        bindingCount: bindCount[0]?.cnt || 0,
        createdAt: c.created_at,
        updatedAt: c.updated_at
      });
    }

    // 获取存档设置
    const archiveRows = await AppDataSource.query(
      `SELECT max_users, used_users, status, expire_date, visibility, storage_type
       FROM wecom_archive_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    ).catch(() => []);

    const archiveSettings = archiveRows.length > 0 ? {
      maxUsers: archiveRows[0].max_users || 0,
      usedUsers: archiveRows[0].used_users || 0,
      status: archiveRows[0].status || 'disabled',
      expireDate: archiveRows[0].expire_date,
      visibility: archiveRows[0].visibility || 'all',
      storageType: archiveRows[0].storage_type || 'local'
    } : null;

    res.json({
      code: 0,
      data: {
        configs: configDetails,
        archiveSettings,
        totalConfigs: configDetails.length,
        hasActiveConfig: configDetails.some(c => c.isEnabled && c.connectionStatus === 'connected')
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Auth info error:', error.message);
    res.status(500).json({ code: 1, message: '获取授权信息失败' });
  }
});

/**
 * 获取用量统计
 * GET /api/v1/public/member/wecom/usage
 */
router.get('/usage', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    // 席位信息
    const archiveRows = await AppDataSource.query(
      `SELECT max_users, used_users, status, expire_date, storage_type
       FROM wecom_archive_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    ).catch(() => []);

    const seats = archiveRows.length > 0 ? {
      maxUsers: archiveRows[0].max_users || 0,
      usedUsers: archiveRows[0].used_users || 0,
      usagePercent: archiveRows[0].max_users > 0
        ? Math.round((archiveRows[0].used_users || 0) / archiveRows[0].max_users * 100)
        : 0,
      status: archiveRows[0].status,
      expireDate: archiveRows[0].expire_date
    } : { maxUsers: 0, usedUsers: 0, usagePercent: 0, status: 'disabled', expireDate: null };

    // 获取配置IDs
    const configRows = await AppDataSource.query(
      'SELECT id FROM wecom_configs WHERE tenant_id = ?', [tenantId]
    ).catch(() => []);
    const configIds = configRows.map((r: any) => r.id);

    // 消息统计
    let messageStats = { total: 0, today: 0, week: 0, month: 0 };
    if (configIds.length > 0) {
      const placeholders = configIds.map(() => '?').join(',');

      const totalResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records WHERE wecom_config_id IN (${placeholders})`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      const todayResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records
         WHERE wecom_config_id IN (${placeholders}) AND created_at >= CURDATE()`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      const weekResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records
         WHERE wecom_config_id IN (${placeholders}) AND created_at >= DATE_SUB(CURDATE(), INTERVAL 7 DAY)`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      const monthResult = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_chat_records
         WHERE wecom_config_id IN (${placeholders}) AND created_at >= DATE_SUB(CURDATE(), INTERVAL 30 DAY)`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      messageStats = {
        total: totalResult[0]?.cnt || 0,
        today: todayResult[0]?.cnt || 0,
        week: weekResult[0]?.cnt || 0,
        month: monthResult[0]?.cnt || 0
      };
    }

    // 客户统计
    let customerStats = { total: 0, active7d: 0 };
    if (configIds.length > 0) {
      const placeholders = configIds.map(() => '?').join(',');
      const custTotal = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_customers WHERE wecom_config_id IN (${placeholders})`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      const custActive = await AppDataSource.query(
        `SELECT COUNT(*) as cnt FROM wecom_customers
         WHERE wecom_config_id IN (${placeholders}) AND active_days_7d > 0`,
        configIds
      ).catch(() => [{ cnt: 0 }]);

      customerStats = {
        total: custTotal[0]?.cnt || 0,
        active7d: custActive[0]?.cnt || 0
      };
    }

    // 存储用量（简单估算：按消息条数×平均大小）
    const avgMsgSize = 0.5; // KB per message
    const storageUsedKB = messageStats.total * avgMsgSize;
    const storageUsedMB = Math.round(storageUsedKB / 1024 * 100) / 100;

    // AI额度统计
    let aiStats = { totalQuota: 0, usedQuota: 0, remainingQuota: 0, todayCalls: 0, monthCalls: 0, expireDate: null as string | null };
    try {
      const pkgRows = await AppDataSource.query(
        "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
        [`tenant_wecom_package_${tenantId}`]
      ).catch(() => []);
      if (pkgRows.length > 0) {
        const pkg = JSON.parse(pkgRows[0].config_value);
        const totalQ = pkg.aiPackage?.calls || pkg.aiPackage?.totalQuota || 0;
        const expDate = pkg.aiPackage?.expireDate || null;
        if (totalQ > 0) {
          const hasLogs = await AppDataSource.query(
            "SELECT COUNT(*) as cnt FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'wecom_ai_logs'"
          ).catch(() => [{ cnt: 0 }]);
          let usedQ = 0, todayQ = 0, monthQ = 0;
          if (hasLogs[0]?.cnt) {
            const [u] = await AppDataSource.query("SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE tenant_id = ?", [tenantId]).catch(() => [{ cnt: 0 }]);
            usedQ = parseInt(u?.cnt) || 0;
            const [td] = await AppDataSource.query("SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE tenant_id = ? AND created_at >= CURDATE()", [tenantId]).catch(() => [{ cnt: 0 }]);
            todayQ = parseInt(td?.cnt) || 0;
            const [mo] = await AppDataSource.query("SELECT COUNT(*) as cnt FROM wecom_ai_logs WHERE tenant_id = ? AND created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY)", [tenantId]).catch(() => [{ cnt: 0 }]);
            monthQ = parseInt(mo?.cnt) || 0;
          }
          aiStats = { totalQuota: totalQ, usedQuota: usedQ, remainingQuota: Math.max(totalQ - usedQ, 0), todayCalls: todayQ, monthCalls: monthQ, expireDate: expDate };
        }
      }
    } catch { /* non-critical */ }

    res.json({
      code: 0,
      data: {
        seats,
        messageStats,
        customerStats,
        storage: {
          usedMB: storageUsedMB,
          type: archiveRows[0]?.storage_type || 'local'
        },
        aiStats
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Usage error:', error.message);
    res.status(500).json({ code: 1, message: '获取用量统计失败' });
  }
});

/**
 * 获取订单历史列表
 * GET /api/v1/public/member/wecom/orders?page=1&pageSize=10&status=all
 */
router.get('/orders', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(50, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const status = req.query.status as string || 'all';
    const offset = (page - 1) * pageSize;

    const packageType = req.query.packageType as string || 'archive';
    let packageFilter = `package_id = 'vas_chat_archive'`;
    if (packageType === 'ai') {
      packageFilter = `package_id LIKE 'ai_%'`;
    } else if (packageType === 'all') {
      packageFilter = '1=1';
    }

    let whereClause = `WHERE tenant_id = ? AND ${packageFilter}`;
    const params: any[] = [tenantId];

    if (status && status !== 'all') {
      whereClause += ' AND status = ?';
      params.push(status);
    }

    // 总数
    const countResult = await AppDataSource.query(
      `SELECT COUNT(*) as cnt FROM payment_orders ${whereClause}`,
      params
    );
    const total = countResult[0]?.cnt || 0;

    // 列表
    const listParams = [...params, pageSize, offset];
    const orders = await AppDataSource.query(
      `SELECT id, order_no, package_id, package_name, amount, pay_type, status, qr_code,
              contact_name, remark, created_at, updated_at, paid_at, expire_time
       FROM payment_orders ${whereClause}
       ORDER BY created_at DESC LIMIT ? OFFSET ?`,
      listParams
    );

    // 订单统计
    const statsResult = await AppDataSource.query(
      `SELECT
         COUNT(*) as totalOrders,
         SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as totalPaid,
         SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingCount
       FROM payment_orders WHERE tenant_id = ? AND ${packageFilter}`,
      [tenantId]
    );

    res.json({
      code: 0,
      data: {
        list: orders.map((o: any) => ({
          id: o.id,
          orderNo: o.order_no,
          packageName: o.package_name,
          amount: o.amount,
          payType: o.pay_type,
          status: o.status,
          contactName: o.contact_name,
          remark: o.remark,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
          paidAt: o.paid_at,
          expireTime: o.expire_time
        })),
        total,
        page,
        pageSize,
        stats: {
          totalOrders: statsResult[0]?.totalOrders || 0,
          totalPaid: statsResult[0]?.totalPaid || 0,
          pendingCount: statsResult[0]?.pendingCount || 0
        }
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Orders error:', error.message);
    res.status(500).json({ code: 1, message: '获取订单列表失败' });
  }
});

/**
 * 续费会话存档
 * POST /api/v1/public/member/wecom/renew
 * body: { payType: 'wechat'|'alipay'|'bank' }
 */
router.post('/renew', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const { payType } = req.body;
    if (!payType || !['wechat', 'alipay', 'bank'].includes(payType)) {
      return res.status(400).json({ code: 1, message: '请选择支付方式' });
    }

    // 检查当前套餐
    const archiveRows = await AppDataSource.query(
      `SELECT max_users, used_users, status, expire_date FROM wecom_archive_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );
    if (archiveRows.length === 0 || archiveRows[0].status !== 'active') {
      return res.status(400).json({ code: 1, message: '当前无有效套餐，请先购买' });
    }

    const currentPlan = archiveRows[0];
    const expireDate = new Date(currentPlan.expire_date);
    const now = new Date();
    const daysRemaining = Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining > 30) {
      return res.status(400).json({ code: 1, message: '距到期日超过30天，暂不可续费' });
    }

    const userCount = currentPlan.max_users;

    // 获取VAS定价和续费折扣
    const vasRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    let tierPricing = [
      { min: 1, max: 10, price: 100 },
      { min: 11, max: 50, price: 90 },
      { min: 51, max: 100, price: 80 },
      { min: 101, max: 999999, price: 70 }
    ];
    let renewalDiscount = 0.9;
    if (vasRows.length > 0) {
      try {
        const parsed = JSON.parse(vasRows[0].config_value);
        if (parsed.chatArchive?.tierPricing) tierPricing = parsed.chatArchive.tierPricing;
        if (parsed.chatArchive?.renewalDiscount) renewalDiscount = parsed.chatArchive.renewalDiscount;
      } catch {}
    }

    let unitPrice = 100;
    for (const tier of tierPricing) {
      if (userCount >= tier.min && userCount <= tier.max) {
        unitPrice = tier.price;
        break;
      }
    }

    const originalAmount = userCount * unitPrice;
    const totalAmount = Math.round(originalAmount * renewalDiscount * 100) / 100;

    // 获取租户信息
    const tRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [tenantId]);
    const tenantName = tRows[0]?.name || '';
    const contactName = tRows[0]?.contact || '';

    // 生成订单号
    const dateNow = new Date();
    const dateStr = dateNow.getFullYear().toString() +
      String(dateNow.getMonth() + 1).padStart(2, '0') +
      String(dateNow.getDate()).padStart(2, '0') +
      String(dateNow.getHours()).padStart(2, '0') +
      String(dateNow.getMinutes()).padStart(2, '0') +
      String(dateNow.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNo = `VASR${dateStr}${random}`;
    const orderId = uuidv4();

    // 调用支付服务
    let qrCode = '';
    let payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({
        packageId: 'vas_chat_archive_renew',
        packageName: `会话存档续费(${userCount}人/年,${Math.round(renewalDiscount * 100) / 10}折)`,
        amount: totalAmount,
        payType: payType as 'wechat' | 'alipay' | 'bank',
        tenantId,
        tenantName,
        contactName,
        contactPhone: '',
        billingCycle: 'yearly'
      });
      if (payResult.success) {
        qrCode = payResult.qrCode || '';
        payUrl = payResult.payUrl || '';
      }
    } catch (payErr: any) {
      log.warn('[Member Wecom] Renew payment service failed:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    // 写入订单
    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name,
        amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at)
       VALUES (?, ?, 'tenant', ?, ?, 'vas_chat_archive', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName,
       `会话存档续费(${userCount}人/年)`, totalAmount, payType,
       qrCode, payUrl, contactName,
       new Date(Date.now() + 30 * 60 * 1000),
       `企微会话存档续费 - ${userCount}人 - 折扣${renewalDiscount} - 原价¥${originalAmount} - 来源:会员中心`]
    );

    log.info(`[Member Wecom] Renew order: ${orderNo}, tenant=${tenantName}, ${userCount} users, ¥${totalAmount}`);

    res.json({
      code: 0,
      data: {
        orderId,
        orderNo,
        amount: totalAmount,
        originalAmount,
        discount: renewalDiscount,
        userCount,
        unitPrice,
        qrCode,
        payUrl,
        payType,
        packageName: `会话存档续费(${userCount}人/年)`
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Renew error:', error.message);
    res.status(500).json({ code: 1, message: '创建续费订单失败' });
  }
});

/**
 * 增购席位
 * POST /api/v1/public/member/wecom/upgrade
 * body: { addUsers: number, payType: 'wechat'|'alipay'|'bank' }
 */
router.post('/upgrade', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ code: 1, message: '未登录' });

    const { addUsers, payType } = req.body;
    if (!addUsers || addUsers < 1) {
      return res.status(400).json({ code: 1, message: '请填写增购人数' });
    }
    if (!payType || !['wechat', 'alipay', 'bank'].includes(payType)) {
      return res.status(400).json({ code: 1, message: '请选择支付方式' });
    }

    // 检查当前套餐
    const archiveRows = await AppDataSource.query(
      `SELECT max_users, used_users, status, expire_date FROM wecom_archive_settings WHERE tenant_id = ? LIMIT 1`,
      [tenantId]
    );
    if (archiveRows.length === 0 || archiveRows[0].status !== 'active') {
      return res.status(400).json({ code: 1, message: '当前无有效套餐，请先购买' });
    }

    const currentPlan = archiveRows[0];
    const expireDate = new Date(currentPlan.expire_date);
    const now = new Date();
    const daysRemaining = Math.max(0, Math.ceil((expireDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    if (daysRemaining <= 0) {
      return res.status(400).json({ code: 1, message: '套餐已过期，请先续费' });
    }

    const newTotal = currentPlan.max_users + addUsers;

    // 获取VAS定价
    const vasRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1"
    ).catch(() => []);

    let tierPricing = [
      { min: 1, max: 10, price: 100 },
      { min: 11, max: 50, price: 90 },
      { min: 51, max: 100, price: 80 },
      { min: 101, max: 999999, price: 70 }
    ];
    if (vasRows.length > 0) {
      try {
        const parsed = JSON.parse(vasRows[0].config_value);
        if (parsed.chatArchive?.tierPricing) tierPricing = parsed.chatArchive.tierPricing;
      } catch {}
    }

    // 按新总人数获取单价
    let unitPrice = 100;
    for (const tier of tierPricing) {
      if (newTotal >= tier.min && newTotal <= tier.max) {
        unitPrice = tier.price;
        break;
      }
    }

    // 增购价格 = 增购人数 × 单价 × (剩余天数 / 365)
    const proRataFactor = Math.round(daysRemaining / 365 * 100) / 100;
    const totalAmount = Math.round(addUsers * unitPrice * proRataFactor * 100) / 100;

    // 获取租户信息
    const tRows = await AppDataSource.query('SELECT name, contact FROM tenants WHERE id = ?', [tenantId]);
    const tenantName = tRows[0]?.name || '';
    const contactName = tRows[0]?.contact || '';

    // 生成订单号
    const dateNow = new Date();
    const dateStr = dateNow.getFullYear().toString() +
      String(dateNow.getMonth() + 1).padStart(2, '0') +
      String(dateNow.getDate()).padStart(2, '0') +
      String(dateNow.getHours()).padStart(2, '0') +
      String(dateNow.getMinutes()).padStart(2, '0') +
      String(dateNow.getSeconds()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    const orderNo = `VASU${dateStr}${random}`;
    const orderId = uuidv4();

    // 调用支付服务
    let qrCode = '';
    let payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({
        packageId: 'vas_chat_archive_upgrade',
        packageName: `会话存档增购(+${addUsers}人,共${newTotal}人)`,
        amount: totalAmount,
        payType: payType as 'wechat' | 'alipay' | 'bank',
        tenantId,
        tenantName,
        contactName,
        contactPhone: '',
        billingCycle: 'yearly'
      });
      if (payResult.success) {
        qrCode = payResult.qrCode || '';
        payUrl = payResult.payUrl || '';
      }
    } catch (payErr: any) {
      log.warn('[Member Wecom] Upgrade payment service failed:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    // 写入订单
    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name,
        amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at)
       VALUES (?, ?, 'tenant', ?, ?, 'vas_chat_archive', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName,
       `会话存档增购(+${addUsers}人,共${newTotal}人)`, totalAmount, payType,
       qrCode, payUrl, contactName,
       new Date(Date.now() + 30 * 60 * 1000),
       `企微会话存档增购 - +${addUsers}人共${newTotal}人 - 剩余${daysRemaining}天 - 单价¥${unitPrice} - 来源:会员中心`]
    );

    // 预更新max_users（支付成功后生效，此处先记录目标值）
    await AppDataSource.query(
      `UPDATE wecom_archive_settings SET max_users = ? WHERE tenant_id = ? AND status = 'active'`,
      [newTotal, tenantId]
    ).catch(() => {});

    log.info(`[Member Wecom] Upgrade order: ${orderNo}, tenant=${tenantName}, +${addUsers} users (total ${newTotal}), ¥${totalAmount}`);

    res.json({
      code: 0,
      data: {
        orderId,
        orderNo,
        amount: totalAmount,
        addUsers,
        newTotalUsers: newTotal,
        previousUsers: currentPlan.max_users,
        unitPrice,
        daysRemaining,
        proRataFactor,
        qrCode,
        payUrl,
        payType,
        packageName: `会话存档增购(+${addUsers}人,共${newTotal}人)`
      }
    });
  } catch (error: any) {
    log.error('[Member Wecom] Upgrade error:', error.message);
    res.status(500).json({ code: 1, message: '创建增购订单失败' });
  }
});

// ======================== AI 模块代理路由（P0-5修复：会员中心通过memberAuth访问） ========================

/**
 * GET /api/v1/public/member/wecom/ai/packages
 * 获取AI套餐列表（会员中心专用，从全局配置读取）
 */
router.get('/ai/packages', async (_req: Request, res: Response) => {
  try {
    const pricingRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);
    if (pricingRows.length > 0) {
      try {
        const config = JSON.parse(pricingRows[0].config_value);
        if (config.aiPackages && Array.isArray(config.aiPackages) && config.aiPackages.length > 0) {
          return res.json({ success: true, data: config.aiPackages, paymentMethods: config.paymentMethods || ['wechat', 'alipay'] });
        }
      } catch { /* ignore */ }
    }
    const sysRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'ai_packages_global' LIMIT 1"
    ).catch(() => []);
    if (sysRows.length > 0) {
      try {
        const packages = JSON.parse(sysRows[0].config_value);
        if (Array.isArray(packages) && packages.length > 0) {
          return res.json({ success: true, data: packages });
        }
      } catch { /* ignore */ }
    }
    res.json({ success: true, data: [] });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/public/member/wecom/ai/model-usage
 * 获取AI模型使用量
 */
router.get('/ai/model-usage', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ success: false, message: '未登录' });

    const { startDate, endDate } = req.query;
    let sql = `SELECT agent_name AS modelName, COUNT(*) AS callCount,
      COALESCE(SUM(total_tokens), 0) AS totalTokens,
      COALESCE(SUM(input_tokens), 0) AS inputTokens,
      COALESCE(SUM(output_tokens), 0) AS outputTokens
      FROM wecom_ai_logs WHERE tenant_id = ?`;
    const params: any[] = [tenantId];
    if (startDate) { sql += ` AND created_at >= ?`; params.push(String(startDate) + ' 00:00:00'); }
    if (endDate) { sql += ` AND created_at <= ?`; params.push(String(endDate) + ' 23:59:59'); }
    sql += ` GROUP BY agent_name ORDER BY callCount DESC`;
    const rows = await AppDataSource.query(sql, params).catch(() => []);
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        modelName: r.modelName || '未知',
        callCount: Number(r.callCount),
        totalTokens: Number(r.totalTokens),
        inputTokens: Number(r.inputTokens),
        outputTokens: Number(r.outputTokens),
      }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * GET /api/v1/public/member/wecom/ai/usage-trend
 * 获取AI使用量趋势
 */
router.get('/ai/usage-trend', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    if (!tenantId) return res.status(401).json({ success: false, message: '未登录' });

    let { startDate, endDate } = req.query as any;
    if (!startDate) { const d = new Date(); d.setDate(d.getDate() - 29); startDate = d.toISOString().slice(0, 10); }
    if (!endDate) endDate = new Date().toISOString().slice(0, 10);

    const sql = `SELECT DATE(created_at) AS date, agent_name AS modelName,
      COUNT(*) AS callCount, COALESCE(SUM(total_tokens), 0) AS totalTokens
      FROM wecom_ai_logs WHERE tenant_id = ? AND created_at >= ? AND created_at <= ?
      GROUP BY date, agent_name ORDER BY date ASC`;
    const rows = await AppDataSource.query(sql, [tenantId, startDate + ' 00:00:00', endDate + ' 23:59:59']).catch(() => []);
    res.json({
      success: true,
      data: rows.map((r: any) => ({
        date: r.date,
        modelName: r.modelName || '未知',
        callCount: Number(r.callCount),
        totalTokens: Number(r.totalTokens),
      }))
    });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /api/v1/public/member/wecom/ai/orders
 * 会员中心AI套餐下单
 */
router.post('/ai/orders', async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).memberTenant?.id;
    const tenantName = (req as any).memberTenant?.companyName || '';
    if (!tenantId) return res.status(401).json({ success: false, message: '未登录' });

    const { packageId, packageName, calls, price, payType = 'wechat' } = req.body;
    const orderNo = 'AI' + Date.now() + Math.random().toString(36).slice(2, 6).toUpperCase();

    if (price <= 0 || !price) {
      const claimCheck = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1",
        [`tenant_ai_free_claimed_${tenantId}`]
      ).catch(() => []);
      if (claimCheck.length > 0) {
        return res.status(400).json({ success: false, message: '每个租户仅可领取一次免费AI体验包' });
      }
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, '1', 'string', NOW(), NOW())",
        [`tenant_ai_free_claimed_${tenantId}`]
      );
      const pkgKey = `tenant_wecom_package_${tenantId}`;
      const existing = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1", [pkgKey]).catch(() => []);
      let pkgData: any = {};
      if (existing.length > 0) { try { pkgData = JSON.parse(existing[0].config_value); } catch { /* ignore */ } }
      pkgData.aiPackage = pkgData.aiPackage || {};
      pkgData.aiPackage.calls = (pkgData.aiPackage.calls || 0) + (calls || 100);
      pkgData.menuPermissions = pkgData.menuPermissions || {};
      pkgData.menuPermissions.aiAssistant = true;
      const val = JSON.stringify(pkgData);
      if (existing.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, pkgKey]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [pkgKey, val]);
      }
      return res.json({ success: true, message: '免费体验包领取成功', data: { orderNo, free: true } });
    }

    const orderId = uuidv4();
    let qrCode = '', payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({
        packageId: `ai_${packageId}`, packageName: packageName || `AI额度套餐`, amount: price,
        payType: payType as 'wechat' | 'alipay' | 'bank', tenantId, tenantName,
        contactName: '', contactPhone: '', billingCycle: 'yearly'
      });
      if (payResult.success) { qrCode = payResult.qrCode || ''; payUrl = payResult.payUrl || ''; }
    } catch (payErr: any) {
      log.warn('[Member AI] Payment service error:', payErr.message);
      qrCode = '';
      payUrl = '';
    }

    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name,
        amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at)
       VALUES (?, ?, 'tenant', ?, ?, ?, ?, ?, ?, 'pending', ?, ?, '', ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName, `ai_${packageId}`,
       packageName || `AI额度套餐`, price, payType, qrCode, payUrl,
       new Date(Date.now() + 30 * 60 * 1000), `AI额度购买 - ${calls || 0}次 - 来源:会员中心`]
    );

    res.json({
      success: true,
      message: '订单创建成功',
      data: { orderId, orderNo, amount: price, qrCode, payUrl, payType }
    });
  } catch (error: any) {
    log.error('[Member AI] Create order error:', error.message);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

export default router;

