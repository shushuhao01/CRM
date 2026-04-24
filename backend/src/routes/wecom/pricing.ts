/**
 * 企微套餐与定价 - 租户端API
 * 提供定价配置读取、套餐领取/购买等接口
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { createLogger } from '../../utils/logger';
import { authenticateToken } from '../../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const log = createLogger('wecom-pricing');

// 配置文件上传
const uploadDir = path.join(__dirname, '../../../uploads/archive-confirmations');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadConfirmation = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      cb(null, 'confirmation-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('只支持 PDF、JPG、PNG 格式'));
    }
  }
});

/**
 * GET /wecom/pricing-config
 * 获取公开定价配置（租户端读取，过滤敏感字段如costPrice）
 */
router.get('/pricing-config', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);

    let data: any = null;
    if (rows.length > 0) {
      try { data = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }

    if (!data) {
      return res.json({ success: true, data: null });
    }

    // 过滤敏感字段: 移除 costPrice, profitRate, officialPrice 等内部成本数据，仅保留客户可见字段
    if (data.archivePricing) {
      data.archivePricing = data.archivePricing.map((t: any) => ({
        tierLabel: t.tierLabel,
        maxMembers: t.maxMembers,
        salePrice: t.salePrice,
        serviceFee: t.serviceFee || null,
        description: t.description || null
      }));
    }

    // 附加全局购买模式配置（来源：archiveGlobalConfig 或 wecom_vas_config）
    const globalCfg = data.archiveGlobalConfig || {};
    data.archiveGlobalConfig = {
      purchaseMode: globalCfg.purchaseMode || 'proxy_only',
      seatServiceFee: globalCfg.seatServiceFee || 0,
    };

    res.json({ success: true, data });
  } catch (error: any) {
    log.error('[Pricing] Get config error:', error.message);
    res.json({ success: true, data: null });
  }
});

/**
 * GET /wecom/tenant-package
 * 获取当前租户已购套餐信息（合并配额管理features覆盖）
 * 优先级：配额管理features > 套餐menuPermissions
 * 配额管理开启的功能，无论套餐是否包含都生效
 */
router.get('/tenant-package', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.json({ success: true, data: null });
    }

    // 读取租户套餐记录
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
      [`tenant_wecom_package_${tenantId}`]
    ).catch(() => []);

    let pkg: any = null;
    if (rows.length > 0) {
      try { pkg = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }

    // 读取配额管理的features设置（Admin后台ConfigQuota设置的功能开关）
    const quotaRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_tenant_quotas' LIMIT 1"
    ).catch(() => []);
    let quotaFeatures: Record<string, boolean> | null = null;
    if (quotaRows.length > 0) {
      try {
        const quotaMap = JSON.parse(quotaRows[0].config_value);
        const tenantQuota = quotaMap[tenantId];
        if (tenantQuota?.features) {
          quotaFeatures = typeof tenantQuota.features === 'string'
            ? JSON.parse(tenantQuota.features) : tenantQuota.features;
        }
      } catch { /* ignore */ }
    }

    // 合并权限：配额管理features中开启的功能覆盖套餐menuPermissions
    if (pkg && quotaFeatures) {
      if (!pkg.menuPermissions) pkg.menuPermissions = {};
      // features key → menuPermissions key 映射
      const featureToPermMap: Record<string, string> = {
        customer: 'customer',
        group: 'customerGroup',
        acquisition: 'acquisition',
        contactWay: 'contactWay',
        chatArchive: 'chatArchive',
        kf: 'customerService',
        ai: 'aiAssistant',
        sidebar: 'sidebar',
        payment: 'payment',
      };
      for (const [featureKey, enabled] of Object.entries(quotaFeatures)) {
        if (enabled === true) {
          const permKey = featureToPermMap[featureKey] || featureKey;
          pkg.menuPermissions[permKey] = true;
        }
      }
    } else if (!pkg && quotaFeatures) {
      // 没有套餐但配额管理有features → 构建一个基础包
      const permissions: Record<string, boolean> = {};
      const featureToPermMap: Record<string, string> = {
        customer: 'customer', group: 'customerGroup', acquisition: 'acquisition',
        contactWay: 'contactWay', chatArchive: 'chatArchive', kf: 'customerService',
        ai: 'aiAssistant', sidebar: 'sidebar', payment: 'payment',
      };
      for (const [featureKey, enabled] of Object.entries(quotaFeatures)) {
        if (enabled === true) {
          const permKey = featureToPermMap[featureKey] || featureKey;
          permissions[permKey] = true;
        }
      }
      if (Object.keys(permissions).length > 0) {
        pkg = { packageName: '管理员配置', menuPermissions: permissions, source: 'quota_override' };
      }
    }

    res.json({ success: true, data: pkg });
  } catch (error: any) {
    log.error('[Pricing] Get tenant package error:', error.message);
    res.json({ success: true, data: null });
  }
});

/**
 * POST /wecom/claim-package
 * 领取/购买企微套餐
 */
router.post('/claim-package', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { packageId, action } = req.body;

    // 读取定价配置
    const configRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);

    let pricingConfig: any = null;
    if (configRows.length > 0) {
      try { pricingConfig = JSON.parse(configRows[0].config_value); } catch { /* ignore */ }
    }

    if (!pricingConfig || !pricingConfig.wecomPackages) {
      return res.status(400).json({ success: false, message: '套餐配置未找到' });
    }

    const pkg = pricingConfig.wecomPackages.find((_p: any, idx: number) => String(idx) === String(packageId));
    if (!pkg) {
      return res.status(400).json({ success: false, message: '套餐不存在' });
    }

    if (action === 'claim' && pkg.yearlyPrice > 0) {
      return res.status(400).json({ success: false, message: '该套餐需要付费购买，不能免费领取' });
    }

    // 免费领取防重复：每租户仅可领取一次
    if (action === 'claim') {
      const claimKey = `tenant_wecom_free_claimed_${tenantId}`;
      const claimed = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [claimKey]
      ).catch(() => []);
      if (claimed.length > 0) {
        return res.status(400).json({ success: false, message: '每个租户仅可领取一次免费企微套餐' });
      }
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [claimKey, JSON.stringify({ claimedAt: new Date().toISOString(), packageId })]
      );
    }

    // 构建租户套餐信息
    const tenantPkg = {
      packageName: pkg.name,
      packageIndex: packageId,
      yearlyPrice: pkg.yearlyPrice,
      wecomQuota: pkg.wecomQuota,
      archiveIncluded: pkg.archiveIncluded,
      aiQuotaIncluded: pkg.aiQuotaIncluded,
      menuPermissions: {
        addressBook: pkg.menuAddressBook || false,
        customer: pkg.menuCustomer || false,
        customerGroup: pkg.menuCustomerGroup || false,
        acquisition: pkg.menuAcquisition || false,
        contactWay: pkg.menuContactWay || false,
        chatArchive: pkg.menuChatArchive || false,
        aiAssistant: pkg.menuAiAssistant || false,
        customerService: pkg.menuCustomerService || false,
        sidebar: pkg.menuSidebar || false,
        payment: pkg.menuPayment || false
      },
      action,
      claimedAt: new Date().toISOString()
    };

    // 仅免费领取立即保存租户套餐；付费购买在 confirm-payment 验证支付后才保存
    if (action === 'claim') {
      const key = `tenant_wecom_package_${tenantId}`;
      const existing = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [key]
      ).catch(() => []);

      const val = JSON.stringify(tenantPkg);
      if (existing.length > 0) {
        await AppDataSource.query(
          "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?",
          [val, key]
        );
      } else {
        await AppDataSource.query(
          "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
          [key, val]
        );
      }
    }

    // 免费领取后同步套餐权限到配额管理
    if (action === 'claim') {
      await syncPackageToQuota(tenantId, tenantPkg.menuPermissions);
    }

    log.info(`[Pricing] Tenant ${tenantId} ${action} package: ${pkg.name}`);
    // 写入账单记录（付费的记为pending_payment，需支付后confirm-payment激活）
    await appendBillingRecord(tenantId, {
      type: 'wecom',
      typeName: '企微套餐',
      packageName: pkg.name,
      packageIndex: packageId,
      amount: pkg.yearlyPrice || 0,
      action,
      status: action === 'claim' ? 'free' : 'pending_payment',
      remark: action === 'claim' ? '免费领取' : '待支付',
      packageData: action === 'purchase' ? tenantPkg : undefined
    });
    res.json({ success: true, message: action === 'claim' ? '领取成功' : '订单已创建，请完成支付', data: tenantPkg });
  } catch (error: any) {
    log.error('[Pricing] Claim package error:', error.message);
    res.status(500).json({ success: false, message: '操作失败: ' + error.message });
  }
});

/**
 * POST /wecom/purchase-ai
 * 购买AI额度套餐（免费包一个租户只能领一次）
 */
router.post('/purchase-ai', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { packageId } = req.body;

    // 读取定价配置
    const configRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);

    let pricingConfig: any = null;
    if (configRows.length > 0) {
      try { pricingConfig = JSON.parse(configRows[0].config_value); } catch { /* ignore */ }
    }

    if (!pricingConfig || !pricingConfig.aiPackages) {
      return res.status(400).json({ success: false, message: 'AI套餐配置未找到' });
    }

    const pkg = pricingConfig.aiPackages.find((p: any) => p.id === packageId);
    if (!pkg) {
      return res.status(400).json({ success: false, message: 'AI套餐不存在' });
    }

    // 免费包检查: 一个租户只能领取一次
    if (pkg.price === 0 && pkg.freeTrialOnce) {
      const claimKey = `tenant_ai_free_claimed_${tenantId}`;
      const claimed = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [claimKey]
      ).catch(() => []);

      if (claimed.length > 0) {
        return res.status(400).json({ success: false, message: '免费体验包每个租户仅可领取一次' });
      }

      // 记录已领取
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [claimKey, JSON.stringify({ claimedAt: new Date().toISOString(), packageId })]
      );
    }

    log.info(`[Pricing] Tenant ${tenantId} purchase AI package: ${pkg.name}`);
    // 写入账单记录
    await appendBillingRecord(tenantId, {
      type: 'ai',
      typeName: 'AI额度套餐',
      packageName: pkg.name,
      amount: pkg.price || 0,
      calls: pkg.calls,
      status: pkg.price === 0 ? 'free' : 'pending_payment',
      remark: pkg.price === 0 ? '免费体验包领取' : `${pkg.calls}次调用，待支付`
    });

    // 免费领取立即解锁AI助手权限；付费在 confirm-payment 时解锁
    if (pkg.price === 0) {
      await unlockTenantPermissions(tenantId, 'ai', {
        aiPackage: { name: pkg.name, calls: pkg.calls, claimedAt: new Date().toISOString() }
      });
    }

    res.json({
      success: true,
      message: pkg.price === 0 ? '免费体验包领取成功' : '购买成功，请完成支付',
      data: { packageId: pkg.id, name: pkg.name, calls: pkg.calls, price: pkg.price }
    });
  } catch (error: any) {
    log.error('[Pricing] Purchase AI error:', error.message);
    res.status(500).json({ success: false, message: '操作失败: ' + error.message });
  }
});

/**
 * POST /wecom/purchase-archive
 * 购买会话存档套餐
 */
router.post('/purchase-archive', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { tierId, userCount, purchaseMode } = req.body;

    const configRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);

    let pricingConfig: any = null;
    if (configRows.length > 0) {
      try { pricingConfig = JSON.parse(configRows[0].config_value); } catch { /* ignore */ }
    }

    if (!pricingConfig || !pricingConfig.archivePricing) {
      return res.status(400).json({ success: false, message: '存档定价配置未找到' });
    }

    // 获取全局购买模式配置
    const globalCfg = pricingConfig.archiveGlobalConfig || {};
    const configPurchaseMode = globalCfg.purchaseMode || 'proxy_only';
    const seatServiceFee = Number(globalCfg.seatServiceFee) || 0;

    // 确定实际购买模式
    let effectiveMode: string = 'proxy';
    if (purchaseMode === 'service_fee' && configPurchaseMode === 'both') {
      effectiveMode = 'service_fee';
    }

    // 确定实际人数：优先使用 userCount（自选人数），回退到 tier.maxMembers
    const tier = tierId !== undefined && tierId !== null ? pricingConfig.archivePricing[Number(tierId)] : null;
    const actualUserCount = userCount ? Number(userCount) : (tier?.maxMembers || 0);
    if (actualUserCount < 1) {
      return res.status(400).json({ success: false, message: '人数不能小于1' });
    }

    // 计算金额
    let totalAmount: number;
    let packageName: string;
    if (effectiveMode === 'service_fee') {
      totalAmount = actualUserCount * seatServiceFee;
      packageName = tier ? `${tier.tierLabel}（服务费）` : `自选${actualUserCount}人（服务费）`;
    } else {
      const unitPrice = tier?.salePrice || 0;
      totalAmount = actualUserCount * unitPrice;
      packageName = tier ? `${tier.tierLabel}（代购）` : `自选${actualUserCount}人（代购）`;
    }

    const needConfirmation = effectiveMode === 'proxy';

    log.info(`[Pricing] Tenant ${tenantId} purchase archive: ${packageName} users=${actualUserCount} mode=${effectiveMode}`);
    await appendBillingRecord(tenantId, {
      type: 'archive',
      typeName: effectiveMode === 'service_fee' ? '会话存档服务费' : '会话存档代购',
      packageName,
      maxMembers: actualUserCount,
      archiveType: effectiveMode === 'service_fee' ? 'service' : 'proxy',
      amount: totalAmount,
      status: 'pending_payment',
      remark: effectiveMode === 'service_fee'
        ? `${actualUserCount}人服务费，支付后立即生效（您需自行在企微购买席位）`
        : `${actualUserCount}人代购，支付后由平台代购并需企业管理员签署确认函`
    });

    res.json({
      success: true,
      message: '请完成支付',
      data: {
        tierLabel: packageName,
        maxMembers: actualUserCount,
        salePrice: effectiveMode === 'service_fee' ? seatServiceFee : (tier?.salePrice || 0),
        archiveType: effectiveMode === 'service_fee' ? 'service' : 'proxy',
        totalAmount,
        needConfirmation,
        hint: effectiveMode === 'service_fee'
          ? '支付确认后席位将立即开放（需确保您已在企微官方购买了对应席位）'
          : '支付后我们将为您代购席位，企业管理员需签署确认函后生效（1-3个工作日）'
      }
    });
  } catch (error: any) {
    log.error('[Pricing] Purchase archive error:', error.message);
    res.status(500).json({ success: false, message: '操作失败: ' + error.message });
  }
});

/**
 * POST /wecom/upload-archive-confirmation
 * 上传会话存档确认函（企业管理员签署后上传）
 */
router.post('/upload-archive-confirmation', authenticateToken, uploadConfirmation.single('file'), async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: '未登录' });
    if (!req.file) return res.status(400).json({ success: false, message: '请上传确认函文件' });

    const fileUrl = `/uploads/archive-confirmations/${req.file.filename}`;
    // 记录确认函上传信息
    const key = `tenant_archive_confirmation_${tenantId}`;
    const confirmData = {
      filename: req.file.originalname,
      storedName: req.file.filename,
      fileUrl,
      fileSize: req.file.size,
      uploadedAt: new Date().toISOString(),
      status: 'uploaded' // 等待管理员审核激活席位
    };
    const existing = await AppDataSource.query(
      "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [key]
    ).catch(() => []);
    const val = JSON.stringify(confirmData);
    if (existing.length > 0) {
      await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]);
    } else {
      await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [key, val]);
    }

    log.info(`[Pricing] Tenant ${tenantId} uploaded archive confirmation: ${req.file.filename}`);
    res.json({
      success: true,
      message: '确认函上传成功！我们将在1-3个工作日内审核并激活您的会话存档席位。',
      data: { fileUrl, uploadedAt: confirmData.uploadedAt }
    });
  } catch (error: any) {
    log.error('[Pricing] Upload confirmation error:', error.message);
    res.status(500).json({ success: false, message: '上传失败: ' + error.message });
  }
});

/**
 * GET /wecom/archive-confirmation-status
 * 获取当前租户确认函上传状态
 */
router.get('/archive-confirmation-status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.json({ success: true, data: null });
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
      [`tenant_archive_confirmation_${tenantId}`]
    ).catch(() => []);
    let data = null;
    if (rows.length > 0) {
      try { data = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }
    res.json({ success: true, data });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

/**
 * POST /wecom/confirm-payment
 * 用户确认支付完成 - 将账单状态更新为已支付，并根据套餐类型决定是否立即激活
 * 服务套餐（客户自购企微席位）→ 立即更新 WecomArchiveSetting.maxUsers
 * 代购套餐 → 保持待履约状态，等待确认函
 * 获客助手/AI/企微套餐 → 立即生效
 */
router.post('/confirm-payment', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) return res.status(401).json({ success: false, message: '未登录' });

    const { type, packageName, configId, orderNo, tradeNo } = req.body;
    const isDev = process.env.NODE_ENV !== 'production';

    // ★ 安全校验：必须提供 orderNo，通过支付订单表验证真实支付状态
    if (orderNo) {
      const payRows = await AppDataSource.query(
        "SELECT id, status, trade_no FROM payment_orders WHERE order_no = ? AND tenant_id = ? LIMIT 1",
        [orderNo, tenantId]
      ).catch(() => []);

      if (payRows.length > 0 && payRows[0].status !== 'paid') {
        log.warn(`[Pricing] confirm-payment called but order ${orderNo} status=${payRows[0].status}, rejecting`);
        return res.status(400).json({ success: false, message: '订单尚未完成支付，请先完成支付后再确认' });
      }
      if (payRows.length > 0 && tradeNo && payRows[0].trade_no && payRows[0].trade_no !== tradeNo) {
        log.warn(`[Pricing] confirm-payment trade_no mismatch: expected=${payRows[0].trade_no}, got=${tradeNo}`);
        return res.status(400).json({ success: false, message: '支付流水号不匹配' });
      }
    }

    // ★ 付费套餐安全校验：生产环境必须提供 orderNo 进行支付验证
    // 开发模式下允许直接确认（方便测试），但会记录警告
    const billingKey = `tenant_billing_records_${tenantId}`;
    const billingRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1", [billingKey]
    ).catch(() => []);
    let allRecords: any[] = [];
    if (billingRows.length > 0) {
      try { allRecords = JSON.parse(billingRows[0].config_value); } catch { /* ignore */ }
    }
    const pendingRecord = [...allRecords].reverse().find((r: any) =>
      r.type === type && r.packageName === packageName && r.status === 'pending_payment'
    );
    if (pendingRecord && pendingRecord.amount > 0 && !orderNo) {
      if (!isDev) {
        log.warn(`[Pricing] confirm-payment rejected: paid item without orderNo (production mode), tenant=${tenantId} type=${type}`);
        return res.status(400).json({
          success: false,
          message: '付费套餐需要通过支付渠道完成支付后才能确认，请先扫码支付'
        });
      }
      log.warn(`[Pricing] ⚠️ DEV MODE: confirm-payment without real payment, tenant=${tenantId} type=${type} amount=${pendingRecord.amount}`);
    }

    // 更新账单记录状态：pending_payment → paid
    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]
    ).catch(() => []);
    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }
    // 将最新匹配的pending记录改为paid
    let updated = false;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].type === type && records[i].packageName === packageName && records[i].status === 'pending_payment') {
        records[i].status = 'paid';
        records[i].paidAt = new Date().toISOString();
        if (orderNo) records[i].orderNo = orderNo;
        updated = true;
        break;
      }
    }
    if (updated) {
      const val = JSON.stringify(records);
      if (rows.length > 0) {
        await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]);
      } else {
        await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [key, val]);
      }
    }

    // 服务套餐立即激活 WecomArchiveSetting.maxUsers
    if (type === 'archive') {
      const record = [...records].reverse().find((r: any) => r.type === 'archive' && r.packageName === packageName && r.status === 'paid');
      if (record && (record.archiveType === 'service' || !record.archiveType)) {
        // 服务套餐：立即更新所有关联configId的存档席位
        try {
          const targetConfigId = configId ? parseInt(configId) : null;
          if (targetConfigId) {
            await AppDataSource.query(
              "UPDATE wecom_archive_settings SET max_users = ?, status = 'active', updated_at = NOW() WHERE wecom_config_id = ? AND tenant_id = ?",
              [record.maxMembers || 0, targetConfigId, tenantId]
            ).catch(() => {/* 表可能不存在，忽略 */});
          }
          // 更新账单状态为active
          for (let i = records.length - 1; i >= 0; i--) {
            if (records[i].type === 'archive' && records[i].packageName === packageName && records[i].status === 'paid') {
              records[i].status = 'active';
              records[i].activatedAt = new Date().toISOString();
              break;
            }
          }
          await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?",
            [JSON.stringify(records), key]
          ).catch(() => {/* ignore */});
          log.info(`[Pricing] Archive service package activated for tenant ${tenantId}, maxUsers=${record.maxMembers}`);
        } catch (activateErr: any) {
          log.warn('[Pricing] Auto-activate archive error:', activateErr.message);
        }
      }
    }

    // 支付成功后：保存租户套餐（付费购买在此处才正式激活）
    if (updated && type === 'wecom') {
      const paidRecord = [...records].reverse().find((r: any) =>
        r.type === 'wecom' && r.packageName === packageName && r.status === 'paid' && r.packageData
      );
      if (paidRecord?.packageData) {
        const pkgKey = `tenant_wecom_package_${tenantId}`;
        const pkgData = { ...paidRecord.packageData, paidAt: new Date().toISOString() };
        const pkgVal = JSON.stringify(pkgData);
        const existingPkg = await AppDataSource.query(
          "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [pkgKey]
        ).catch(() => []);
        if (existingPkg.length > 0) {
          await AppDataSource.query("UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [pkgVal, pkgKey]);
        } else {
          await AppDataSource.query("INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())", [pkgKey, pkgVal]);
        }
        log.info(`[Pricing] Wecom package activated after payment for tenant ${tenantId}: ${packageName}`);
        // 同步套餐权限到配额管理
        if (paidRecord.packageData?.menuPermissions) {
          await syncPackageToQuota(tenantId, paidRecord.packageData.menuPermissions);
        }
      }
    }

    // 支付成功后解锁对应功能权限
    if (updated && ['archive', 'ai', 'acquisition', 'wecom'].includes(type)) {
      await unlockTenantPermissions(tenantId, type as any);
    }

    res.json({
      success: true,
      message: '支付确认成功',
      data: { type, activated: type !== 'archive' || updated }
    });
  } catch (error: any) {
    log.error('[Pricing] Confirm payment error:', error.message);
    res.status(500).json({ success: false, message: '操作失败: ' + error.message });
  }
});

/**
 * POST /wecom/purchase-acquisition
 * 购买获客助手套餐
 */
router.post('/purchase-acquisition', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.status(401).json({ success: false, message: '未登录' });
    }

    const { tierId } = req.body;

    const configRows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_pricing_config' LIMIT 1"
    ).catch(() => []);

    let pricingConfig: any = null;
    if (configRows.length > 0) {
      try { pricingConfig = JSON.parse(configRows[0].config_value); } catch { /* ignore */ }
    }

    if (!pricingConfig || !pricingConfig.acquisitionPricing) {
      return res.status(400).json({ success: false, message: '获客助手定价配置未找到' });
    }

    const tier = pricingConfig.acquisitionPricing[Number(tierId)];
    if (!tier) {
      return res.status(400).json({ success: false, message: '获客助手方案不存在' });
    }

    // 免费套餐防重复领取
    if (tier.price === 0) {
      const claimKey = `tenant_acquisition_free_claimed_${tenantId}`;
      const claimed = await AppDataSource.query(
        "SELECT id FROM system_config WHERE config_key = ? LIMIT 1", [claimKey]
      ).catch(() => []);
      if (claimed.length > 0) {
        return res.status(400).json({ success: false, message: '每个租户仅可领取一次免费获客助手套餐' });
      }
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [claimKey, JSON.stringify({ claimedAt: new Date().toISOString(), tierId })]
      );
    }

    log.info(`[Pricing] Tenant ${tenantId} purchase acquisition tier: ${tier.name}`);
    // 写入账单记录
    await appendBillingRecord(tenantId, {
      type: 'acquisition',
      typeName: '获客助手套餐',
      packageName: tier.name,
      amount: tier.price || 0,
      billingCycle: tier.billingCycle,
      maxChannels: tier.maxChannels ?? null,
      status: tier.price === 0 ? 'free' : 'pending_payment',
      remark: tier.price === 0 ? '免费方案领取' : `${tier.billingCycle}付，待支付`
    });

    // 免费领取立即解锁权限；付费在 confirm-payment 时解锁
    if (tier.price === 0) {
      await unlockTenantPermissions(tenantId, 'acquisition', {
        acquisitionPackage: { name: tier.name, maxChannels: tier.maxChannels, claimedAt: new Date().toISOString() }
      });
    }

    res.json({
      success: true,
      message: tier.price === 0 ? '免费方案领取成功' : '请完成支付',
      data: { name: tier.name, price: tier.price, billingCycle: tier.billingCycle }
    });
  } catch (error: any) {
    log.error('[Pricing] Purchase acquisition error:', error.message);
    res.status(500).json({ success: false, message: '操作失败: ' + error.message });
  }
});

/**
 * GET /wecom/billing-records
 * 获取当前租户的账单购买记录（最近100条）
 */
router.get('/billing-records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).user?.tenantId;
    if (!tenantId) {
      return res.json({ success: true, data: [] });
    }

    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1",
      [`tenant_billing_records_${tenantId}`]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }

    // 按时间倒序，最多返回100条
    records = Array.isArray(records) ? records.slice(-100).reverse() : [];
    res.json({ success: true, data: records });
  } catch (error: any) {
    log.error('[Pricing] Get billing records error:', error.message);
    res.json({ success: true, data: [] });
  }
});

/**
 * 内部工具函数：追加账单记录
 */
async function appendBillingRecord(tenantId: string, record: any) {
  try {
    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      "SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch { /* ignore */ }
    }
    if (!Array.isArray(records)) records = [];

    records.push({ ...record, createdAt: new Date().toISOString() });
    // 只保留最近200条
    if (records.length > 200) records = records.slice(-200);

    const val = JSON.stringify(records);
    if (rows.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?",
        [val, key]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [key, val]
      );
    }
  } catch (e: any) {
    log.error('[Pricing] Append billing record error:', e.message);
  }
}

/**
 * 解锁租户套餐权限
 * 根据购买的类型更新 tenant_wecom_package 的 menuPermissions
 */
async function unlockTenantPermissions(tenantId: string, type: 'wecom' | 'archive' | 'ai' | 'acquisition', extra?: any) {
  try {
    const key = `tenant_wecom_package_${tenantId}`;
    const rows = await AppDataSource.query(
      "SELECT id, config_value FROM system_config WHERE config_key = ? LIMIT 1", [key]
    ).catch(() => []);

    let pkg: any = {};
    if (rows.length > 0) {
      try { pkg = JSON.parse(rows[0].config_value); } catch { pkg = {}; }
    }

    if (!pkg.menuPermissions) {
      pkg.menuPermissions = {};
    }

    const permsMap: Record<string, string[]> = {
      'wecom': [], // wecom claim already saves full menuPermissions
      'archive': ['chatArchive'],
      'ai': ['aiAssistant'],
      'acquisition': ['acquisition', 'contactWay'],
    };

    const keysToUnlock = permsMap[type] || [];
    for (const k of keysToUnlock) {
      pkg.menuPermissions[k] = true;
    }

    if (extra) {
      Object.assign(pkg, extra);
    }

    pkg.updatedAt = new Date().toISOString();
    const val = JSON.stringify(pkg);
    if (rows.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?", [val, key]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), ?, ?, 'json', NOW(), NOW())",
        [key, val]
      );
    }
    log.info(`[Pricing] Unlocked permissions for tenant ${tenantId}: type=${type} keys=${keysToUnlock.join(',')}`);
  } catch (e: any) {
    log.error('[Pricing] Unlock permissions error:', e.message);
  }
}

/**
 * 同步套餐菜单权限到配额管理features
 * 客户买了什么套餐，配额管理自动同步对应的菜单权限
 * 管理员之前额外设置的开关不会被覆盖（只增不减）
 */
async function syncPackageToQuota(tenantId: string, menuPermissions: Record<string, boolean>) {
  try {
    const rows = await AppDataSource.query(
      "SELECT config_value FROM system_config WHERE config_key = 'wecom_tenant_quotas' LIMIT 1"
    ).catch(() => []);
    let quotaMap: Record<string, any> = {};
    if (rows.length > 0) {
      try { quotaMap = JSON.parse(rows[0].config_value); } catch { quotaMap = {}; }
    }

    const existing = quotaMap[tenantId] || {};
    const existingFeatures = existing.features || {};

    // menuPermissions key → features key 映射
    const permToFeatureMap: Record<string, string> = {
      customer: 'customer', customerGroup: 'group', acquisition: 'acquisition',
      contactWay: 'contactWay', chatArchive: 'chatArchive', customerService: 'kf',
      aiAssistant: 'ai', sidebar: 'sidebar', payment: 'payment',
      addressBook: 'customer',
    };

    // 合并：套餐权限true的覆盖，管理员之前额外开启的保留
    const mergedFeatures = { ...existingFeatures };
    for (const [permKey, enabled] of Object.entries(menuPermissions)) {
      if (enabled === true) {
        const featureKey = permToFeatureMap[permKey] || permKey;
        mergedFeatures[featureKey] = true;
      }
    }

    quotaMap[tenantId] = { ...existing, features: mergedFeatures, updatedAt: new Date().toISOString() };
    const val = JSON.stringify(quotaMap);

    if (rows.length > 0) {
      await AppDataSource.query(
        "UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = 'wecom_tenant_quotas'", [val]
      );
    } else {
      await AppDataSource.query(
        "INSERT INTO system_config (id, config_key, config_value, config_type, created_at, updated_at) VALUES (UUID(), 'wecom_tenant_quotas', ?, 'json', NOW(), NOW())", [val]
      );
    }
    log.info(`[Pricing] Synced package permissions to quota for tenant ${tenantId}`);
  } catch (e: any) {
    log.error('[Pricing] Sync package to quota error:', e.message);
  }
}

/**
 * 取消待支付订单
 * POST /wecom/cancel-order
 */
router.post('/cancel-order', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = (req as any).tenantId || (req as any).currentUser?.tenantId;
    const { orderId, orderNo } = req.body;
    if (!tenantId) return res.status(401).json({ success: false, message: '未授权' });

    const key = `tenant_billing_records_${tenantId}`;
    const rows = await AppDataSource.query(
      'SELECT config_value FROM system_config WHERE config_key = ? LIMIT 1', [key]
    ).catch(() => []);

    let records: any[] = [];
    if (rows.length > 0) {
      try { records = JSON.parse(rows[0].config_value); } catch { records = []; }
    }

    const idx = records.findIndex((r: any) =>
      (orderId && (r.id === orderId)) || (orderNo && (r.orderNo === orderNo))
    );
    if (idx < 0) return res.status(404).json({ success: false, message: '订单不存在' });
    if (records[idx].status !== 'pending_payment') {
      return res.status(400).json({ success: false, message: '只能取消待支付订单' });
    }

    records[idx].status = 'cancelled';
    records[idx].cancelledAt = new Date().toISOString();

    await AppDataSource.query(
      'UPDATE system_config SET config_value = ?, updated_at = NOW() WHERE config_key = ?',
      [JSON.stringify(records), key]
    );

    res.json({ success: true, message: '订单已取消' });
  } catch (error: any) {
    log.error('[Pricing] Cancel order error:', error.message);
    res.status(500).json({ success: false, message: '取消订单失败' });
  }
});

export default router;

