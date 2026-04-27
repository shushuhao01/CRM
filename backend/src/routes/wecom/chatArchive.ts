/**
 * 会话存档路由
 * 包含：授权状态、记录列表、同步、统计、会话视图、质检、标签、搜索、VAS购买
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomCustomer } from '../../entities/WecomCustomer';
import { WecomChatRecord } from '../../entities/WecomChatRecord';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';
import { v4 as uuidv4 } from 'uuid';
import { safeJsonParse } from './wecomHelpers';

const router = Router();

// ==================== 会话存档状态 ====================

router.get('/chat-archive/status', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (tenantId) {
      try {
        const tenantRows = await AppDataSource.query(
          'SELECT wecom_chat_archive_auth FROM tenants WHERE id = ?', [tenantId]
        );
        const isAuthorized = !!(tenantRows[0]?.wecom_chat_archive_auth);
        if (!isAuthorized) {
          return res.json({ success: true, data: { authorized: false, enabled: false, message: '此功能为增值服务，请联系管理员开通' } });
        }
      } catch (authErr) {
        log.info('[Wecom] Chat archive auth check skipped:', (authErr as any).message?.substring(0, 60));
      }
    }

    const configRepo = getTenantRepo(WecomConfig);
    const configs = await configRepo.find({ where: { isEnabled: true } });
    const archiveConfigs = configs.filter(c => c.chatArchiveSecret && c.chatArchivePrivateKey);

    if (archiveConfigs.length === 0) {
      return res.json({ success: true, data: { authorized: true, enabled: false, message: '未配置会话存档Secret和私钥' } });
    }

    res.json({ success: true, data: { authorized: true, enabled: true, configCount: archiveConfigs.length, configs: archiveConfigs.map(c => ({ id: c.id, name: c.name, corpId: c.corpId })) } });
  } catch (error: any) {
    log.error('[Wecom] Get chat archive status error:', error);
    res.status(500).json({ success: false, message: '获取会话存档状态失败' });
  }
});

// ==================== 会话记录 ====================

router.get('/chat-records', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, msgType, fromUserId, roomId, startDate, endDate, isSensitive, page = 1, pageSize = 20 } = req.query;
    const recordRepo = getTenantRepo(WecomChatRecord);
    const queryBuilder = recordRepo.createQueryBuilder('r');
    if (configId) queryBuilder.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (msgType) queryBuilder.andWhere('r.msg_type = :msgType', { msgType });
    if (fromUserId) queryBuilder.andWhere('r.from_user_id = :fromUserId', { fromUserId });
    if (roomId) queryBuilder.andWhere('r.room_id = :roomId', { roomId });
    if (keyword) queryBuilder.andWhere('r.content LIKE :keyword', { keyword: `%${keyword}%` });
    if (startDate) queryBuilder.andWhere('r.msg_time >= :startTs', { startTs: new Date(startDate as string).getTime() });
    if (endDate) queryBuilder.andWhere('r.msg_time < :endTs', { endTs: new Date(endDate as string).getTime() + 86400000 });
    if (isSensitive === 'true') queryBuilder.andWhere('r.is_sensitive = :isSensitive', { isSensitive: true });
    const total = await queryBuilder.getCount();
    const records = await queryBuilder.orderBy('r.msg_time', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string)).getMany();
    const list = records.map(r => ({
      ...r,
      toUserIds: safeJsonParse(r.toUserIds, []),
      content: safeJsonParse(r.content, r.content),
      msgTimeFormatted: r.msgTime ? new Date(Number(r.msgTime)).toISOString() : null
    }));
    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get chat records error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '获取会话记录失败' });
  }
});

// ==================== 同步 ====================

router.post('/chat-records/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });
    if (!config.chatArchiveSecret) return res.status(400).json({ success: false, message: '未配置会话存档Secret' });
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.syncChatRecords(config, true);
    res.json({
      success: true, message: result.message,
      data: { configId: result.configId, configName: result.configName, permitUsers: result.permitUsers, agreedUsers: result.agreedUsers, syncedRecords: result.syncedRecords, newConversations: result.newConversations, errors: result.errors, sdkRequired: result.sdkRequired, mode: result.mode, hasPrivateKey: !!config.chatArchivePrivateKey }
    });
  } catch (error: any) {
    log.error('[Wecom] Sync chat records error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '同步会话存档失败' });
  }
});

// ==================== 统计 ====================

router.get('/chat-archive/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: parseInt(configId as string), isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在' });
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const stats = await WecomChatArchiveService.getArchiveStats(config);
    res.json({ success: true, data: { ...stats, hasSecret: !!config.chatArchiveSecret, hasPrivateKey: !!config.chatArchivePrivateKey, mode: 'http_api' } });
  } catch (error: any) {
    log.error('[Wecom] Get chat archive stats error:', error.message);
    res.status(500).json({ success: false, message: '获取统计信息失败' });
  }
});

// ==================== 会话列表与消息 ====================

router.get('/conversations', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, userId, keyword, page, pageSize } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.getConversationList({
      tenantId, configId: configId ? parseInt(configId as string) : undefined,
      userId: userId as string, keyword: keyword as string,
      page: page ? parseInt(page as string) : 1, pageSize: pageSize ? parseInt(pageSize as string) : 50
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Wecom] 获取会话列表失败:', error.message);
    res.status(500).json({ success: false, message: '获取会话列表失败' });
  }
});

router.get('/conversations/messages', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, fromUserId, toUserId, roomId, page, pageSize } = req.query;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    if (!fromUserId || !toUserId) return res.status(400).json({ success: false, message: '请指定发送方和接收方' });
    const { WecomChatArchiveService } = await import('../../services/WecomChatArchiveService');
    const result = await WecomChatArchiveService.getConversationMessages({
      tenantId, configId: configId ? parseInt(configId as string) : undefined,
      fromUserId: fromUserId as string, toUserId: toUserId as string,
      roomId: roomId as string, page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 50
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Wecom] 获取会话消息失败:', error.message);
    res.status(500).json({ success: false, message: '获取会话消息失败' });
  }
});

// ==================== 质检 ====================

router.put('/chat-records/:id/audit', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const recordId = parseInt(req.params.id);
    const { isSensitive, auditRemark } = req.body;
    const recordRepo = getTenantRepo(WecomChatRecord);
    const record = await recordRepo.findOne({ where: { id: recordId } });
    if (!record) return res.status(404).json({ success: false, message: '会话记录不存在' });
    const currentUser = (req as any).currentUser;
    if (isSensitive !== undefined) record.isSensitive = isSensitive;
    if (auditRemark !== undefined) record.auditRemark = auditRemark;
    record.auditBy = currentUser?.name || 'admin';
    record.auditTime = new Date();
    await recordRepo.save(record);
    res.json({ success: true, message: '质检标记成功' });
  } catch (error: any) {
    log.error('[Wecom] Audit chat record error:', error);
    res.status(500).json({ success: false, message: '质检标记失败' });
  }
});

// ==================== 客户标签 ====================

router.get('/tags', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(parseInt(configId as string), 'external');
    const tagGroups = await WecomApiService.getCorpTagList(accessToken);
    res.json({ success: true, data: tagGroups });
  } catch (error: any) {
    log.error('[Wecom] Get tags error:', error.message);
    res.status(500).json({ success: false, message: error.message || '获取标签失败' });
  }
});

router.post('/tags/sync-to-customers', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });
    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'external');
    const tagGroups = await WecomApiService.getCorpTagList(accessToken);
    const tagMap: Record<string, string> = {};
    for (const group of tagGroups) {
      for (const tag of (group.tag || [])) { tagMap[tag.id] = tag.name; }
    }
    const customerRepo = getTenantRepo(WecomCustomer);
    const customers = await customerRepo.find({ where: { wecomConfigId: configId } });
    let updateCount = 0;
    for (const customer of customers) {
      if (!customer.tagIds) continue;
      try {
        const ids = JSON.parse(customer.tagIds);
        if (!Array.isArray(ids)) continue;
        const tagNames = ids.map((id: string) => tagMap[id] || id).filter(Boolean);
        const newTagNamesStr = JSON.stringify(tagNames);
        if (customer.tagNames !== newTagNamesStr) {
          customer.tagNames = newTagNamesStr;
          await customerRepo.save(customer);
          updateCount++;
        }
      } catch (_e) { /* skip */ }
    }
    res.json({ success: true, message: `标签同步完成，已更新 ${updateCount} 个客户`, data: { tagGroupCount: tagGroups.length, tagCount: Object.keys(tagMap).length, updateCount } });
  } catch (error: any) {
    log.error('[Wecom] Sync tags error:', error.message);
    res.status(500).json({ success: false, message: error.message || '同步标签失败' });
  }
});

// ==================== 全文搜索 ====================

router.get('/chat-records/search', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, keyword, fromUserId, msgType, startDate, endDate, page = 1, pageSize = 50 } = req.query;
    if (!keyword) return res.status(400).json({ success: false, message: '请输入搜索关键词' });
    const recordRepo = getTenantRepo(WecomChatRecord);
    const qb = recordRepo.createQueryBuilder('r');
    qb.andWhere('r.content LIKE :keyword', { keyword: `%${keyword}%` });
    if (configId) qb.andWhere('r.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (fromUserId) qb.andWhere('r.from_user_id = :fromUserId', { fromUserId });
    if (msgType) qb.andWhere('r.msg_type = :msgType', { msgType });
    if (startDate) qb.andWhere('r.msg_time >= :startTs', { startTs: new Date(startDate as string).getTime() });
    if (endDate) qb.andWhere('r.msg_time < :endTs', { endTs: new Date(endDate as string).getTime() + 86400000 });
    const total = await qb.getCount();
    const records = await qb.orderBy('r.msg_time', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string)).getMany();
    const kw = keyword as string;
    const list = records.map(r => {
      let contentPreview = '';
      try { const parsed = JSON.parse(r.content || '{}'); contentPreview = parsed.text || parsed.content || r.content || ''; }
      catch { contentPreview = r.content || ''; }
      const idx = contentPreview.indexOf(kw);
      if (idx >= 0) {
        const start = Math.max(0, idx - 50);
        const end = Math.min(contentPreview.length, idx + kw.length + 50);
        contentPreview = (start > 0 ? '...' : '') + contentPreview.slice(start, end) + (end < contentPreview.length ? '...' : '');
      }
      return { id: r.id, msgId: r.msgId, msgType: r.msgType, fromUserId: r.fromUserId, fromUserName: r.fromUserName, roomId: r.roomId, msgTime: r.msgTime, msgTimeFormatted: r.msgTime ? new Date(Number(r.msgTime)).toISOString() : null, contentPreview, highlight: kw, isSensitive: r.isSensitive };
    });
    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Search chat records error:', error.message);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

// ==================== VAS增值服务 ====================

router.get('/chat-archive/vas-pricing', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const rows = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1").catch(() => []);
    const defaultConfig = { enabled: true, defaultPrice: 100, minPrice: 50, billingUnit: 'per_user_year', trialDays: 7, tierPricing: [{ min: 1, max: 10, price: 100 }, { min: 11, max: 50, price: 90 }, { min: 51, max: 100, price: 80 }, { min: 101, max: 999999, price: 70 }], description: '企微会话存档增值服务', wecomFeeNote: '企业微信会话存档接口为企微官方收费功能，需在企微管理后台自行开通。' };
    let config = defaultConfig;
    if (rows.length > 0) { try { const parsed = JSON.parse(rows[0].config_value); config = { ...defaultConfig, ...parsed.chatArchive }; } catch {} }
    res.json({ success: true, data: config });
  } catch (error: any) {
    log.error('[Wecom] Get VAS pricing error:', error.message);
    res.status(500).json({ success: false, message: '获取定价失败' });
  }
});

router.post('/chat-archive/purchase', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { userCount, payType } = req.body;
    const currentUser = (req as any).currentUser;
    if (!userCount || userCount < 1) return res.status(400).json({ success: false, message: '请选择开通人数' });
    if (!payType || !['wechat', 'alipay', 'bank'].includes(payType)) return res.status(400).json({ success: false, message: '请选择支付方式' });
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    let tenantName = '';
    if (tenantId) { const tRows = await AppDataSource.query('SELECT name FROM tenants WHERE id = ?', [tenantId]); tenantName = tRows[0]?.name || ''; }
    const vasRows = await AppDataSource.query("SELECT config_value FROM system_config WHERE config_key = 'wecom_vas_config' LIMIT 1").catch(() => []);
    let tierPricing = [{ min: 1, max: 10, price: 100 }, { min: 11, max: 50, price: 90 }, { min: 51, max: 100, price: 80 }, { min: 101, max: 999999, price: 70 }];
    if (vasRows.length > 0) { try { const parsed = JSON.parse(vasRows[0].config_value); if (parsed.chatArchive?.tierPricing) tierPricing = parsed.chatArchive.tierPricing; } catch {} }
    let unitPrice = 100;
    for (const tier of tierPricing) { if (userCount >= tier.min && userCount <= tier.max) { unitPrice = tier.price; break; } }
    const totalAmount = userCount * unitPrice;
    const now = new Date();
    const dateStr = now.getFullYear().toString() + String(now.getMonth() + 1).padStart(2, '0') + String(now.getDate()).padStart(2, '0') + String(now.getHours()).padStart(2, '0') + String(now.getMinutes()).padStart(2, '0') + String(now.getSeconds()).padStart(2, '0');
    const orderNo = `VAS${dateStr}${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`;
    const orderId = uuidv4();
    let qrCode = '';
    let payUrl = '';
    try {
      const { paymentService } = await import('../../services/PaymentService');
      const payResult = await paymentService.createOrder({ packageId: 'vas_chat_archive', packageName: `会话存档增值服务 ${userCount}人/年`, amount: totalAmount, payType: payType as 'wechat' | 'alipay' | 'bank', tenantId: tenantId || undefined, tenantName, contactName: currentUser?.name || '', contactPhone: '', billingCycle: 'yearly' });
      if (payResult.success) { qrCode = payResult.qrCode || ''; payUrl = payResult.payUrl || ''; }
    } catch (payErr: any) {
      log.warn('[Wecom VAS] 支付服务调用失败:', payErr.message);
      qrCode = '';
      payUrl = '';
    }
    await AppDataSource.query(
      `INSERT INTO payment_orders (id, order_no, customer_type, tenant_id, tenant_name, package_id, package_name, amount, pay_type, status, qr_code, pay_url, contact_name, expire_time, remark, created_at, updated_at) VALUES (?, ?, 'tenant', ?, ?, 'vas_chat_archive', ?, ?, ?, 'pending', ?, ?, ?, ?, ?, NOW(), NOW())`,
      [orderId, orderNo, tenantId, tenantName, `会话存档增值服务 ${userCount}人/年`, totalAmount, payType, qrCode, payUrl, currentUser?.name || '', new Date(Date.now() + 30 * 60 * 1000), `企微会话存档VAS - ${userCount}人/年`]
    );
    res.json({ success: true, data: { orderId, orderNo, amount: totalAmount, userCount, unitPrice, qrCode, payUrl, payType, packageName: `会话存档增值服务 ${userCount}人/年` } });
  } catch (error: any) {
    log.error('[Wecom VAS] 创建订单失败:', error.message, error.stack);
    res.status(500).json({ success: false, message: '创建订单失败' });
  }
});

router.get('/chat-archive/order/:orderNo', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { orderNo } = req.params;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const rows = await AppDataSource.query(`SELECT id, order_no, amount, status, pay_type, paid_at, package_name FROM payment_orders WHERE order_no = ? AND tenant_id = ? LIMIT 1`, [orderNo, tenantId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });
    const order = rows[0];

    // 🔑 兜底：订单仍为 pending 时，主动向支付渠道查询真实状态
    if (order.status === 'pending') {
      try {
        const { paymentService } = await import('../../services/PaymentService');
        if (order.pay_type === 'wechat') {
          const { wechatPayService } = await import('../../services/WechatPayService');
          const wxResult = await wechatPayService.queryOrder(orderNo);
          if (wxResult.success && wxResult.data?.trade_state === 'SUCCESS') {
            log.info(`[Wecom VAS] 主动查询发现微信订单 ${orderNo} 已支付，执行补偿更新`);
            await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: wxResult.data.transaction_id, paidAt: new Date() });
            order.status = 'paid';
          }
        } else if (order.pay_type === 'alipay') {
          const { alipayService } = await import('../../services/AlipayService');
          const aliResult = await alipayService.queryOrder(orderNo);
          if (aliResult.success && (aliResult.data?.trade_status === 'TRADE_SUCCESS' || aliResult.data?.trade_status === 'TRADE_FINISHED')) {
            log.info(`[Wecom VAS] 主动查询发现支付宝订单 ${orderNo} 已支付，执行补偿更新`);
            await paymentService.updateOrderStatus(orderNo, 'paid', { tradeNo: aliResult.data.trade_no, paidAt: new Date() });
            order.status = 'paid';
          }
        }
      } catch (checkErr: any) {
        log.warn('[Wecom VAS] 主动查询支付状态失败（不影响正常流程）:', checkErr.message?.substring(0, 100));
      }
    }

    if (order.status === 'paid') {
      await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]).catch(() => {});
      await AppDataSource.query("UPDATE wecom_archive_settings SET status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE tenant_id = ?", [tenantId]).catch(() => {});
    }
    res.json({ success: true, data: { orderNo: order.order_no, status: order.status, amount: order.amount, payType: order.pay_type, paidAt: order.paid_at, packageName: order.package_name } });
  } catch (error: any) {
    log.error('[Wecom VAS] 查询订单状态失败', error.message);
    res.status(500).json({ success: false, message: '查询订单状态失败' });
  }
});

router.post('/chat-archive/simulate-pay/:orderNo', authenticateToken, async (req: Request, res: Response) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      return res.status(403).json({ success: false, message: '生产环境不可使用模拟支付' });
    }
    const { orderNo } = req.params;
    const { getCurrentTenantId } = await import('../../utils/tenantContext');
    const tenantId = getCurrentTenantId();
    const rows = await AppDataSource.query(`SELECT id, status FROM payment_orders WHERE order_no = ? AND tenant_id = ? LIMIT 1`, [orderNo, tenantId]);
    if (rows.length === 0) return res.status(404).json({ success: false, message: '订单不存在' });
    if (rows[0].status === 'paid') return res.json({ success: true, message: '订单已支付' });
    await AppDataSource.query(`UPDATE payment_orders SET status = 'paid', paid_at = NOW(), trade_no = ? WHERE order_no = ?`, [`SIM${Date.now()}`, orderNo]);
    await AppDataSource.query('UPDATE tenants SET wecom_chat_archive_auth = 1 WHERE id = ?', [tenantId]).catch(() => {});
    await AppDataSource.query("UPDATE wecom_archive_settings SET status = 'active', expire_date = DATE_ADD(NOW(), INTERVAL 1 YEAR) WHERE tenant_id = ?", [tenantId]).catch(() => {});
    res.json({ success: true, message: '模拟支付成功，会话存档已激活' });
  } catch (error: any) {
    log.error('[Wecom VAS] 模拟支付失败:', error.message);
    res.status(500).json({ success: false, message: '模拟支付失败' });
  }
});

export default router;

