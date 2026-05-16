/**
 * 对外收款路由 - 完整版
 * 包含：收款记录列表、统计、退款管理、收款码、设置
 * 对接企业微信对外收款API: https://developer.work.weixin.qq.com/document/path/93666
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomPaymentRecord } from '../../entities/WecomPaymentRecord';
import { WecomPaymentRefund } from '../../entities/WecomPaymentRefund';
import { WecomPaymentQrcode } from '../../entities/WecomPaymentQrcode';
import WecomApiService from '../../services/WecomApiService';
import { log } from '../../config/logger';

const router = Router();

// ==================== 收款记录 ====================

/**
 * 获取收款记录列表（后端分页）
 */
router.get('/payments', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, userId, departmentId, status, keyword, customerName, userName, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    const qb = paymentRepo.createQueryBuilder('p');

    if (configId) qb.andWhere('p.wecomConfigId = :configId', { configId: parseInt(configId as string) });
    if (userId) qb.andWhere('p.userId = :userId', { userId });
    if (departmentId) qb.andWhere('p.departmentId = :departmentId', { departmentId: parseInt(departmentId as string) });
    if (status) qb.andWhere('p.status = :status', { status });
    if (customerName) qb.andWhere('(p.customerName LIKE :cn OR p.payerName LIKE :cn)', { cn: `%${customerName}%` });
    if (userName) qb.andWhere('p.userName LIKE :un', { un: `%${userName}%` });
    if (keyword) {
      qb.andWhere('(p.paymentNo LIKE :kw OR p.tradeNo LIKE :kw OR p.payerName LIKE :kw OR p.customerName LIKE :kw OR p.remark LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (startDate) qb.andWhere('p.payTime >= :startDate', { startDate });
    if (endDate) qb.andWhere('p.payTime <= :endDate', { endDate: `${endDate} 23:59:59` });

    const total = await qb.getCount();

    // 汇总统计（基于当前筛选条件，用子查询避免全量加载）
    const summaryQb = paymentRepo.createQueryBuilder('s');
    // 复制筛选条件
    if (configId) summaryQb.andWhere('s.wecomConfigId = :configId', { configId: parseInt(configId as string) });
    if (userId) summaryQb.andWhere('s.userId = :userId', { userId });
    if (departmentId) summaryQb.andWhere('s.departmentId = :departmentId', { departmentId: parseInt(departmentId as string) });
    if (status) summaryQb.andWhere('s.status = :status', { status });
    if (customerName) summaryQb.andWhere('(s.customerName LIKE :cn OR s.payerName LIKE :cn)', { cn: `%${customerName}%` });
    if (userName) summaryQb.andWhere('s.userName LIKE :un', { un: `%${userName}%` });
    if (keyword) summaryQb.andWhere('(s.paymentNo LIKE :kw OR s.tradeNo LIKE :kw OR s.payerName LIKE :kw OR s.customerName LIKE :kw)', { kw: `%${keyword}%` });
    if (startDate) summaryQb.andWhere('s.payTime >= :startDate', { startDate });
    if (endDate) summaryQb.andWhere('s.payTime <= :endDate', { endDate: `${endDate} 23:59:59` });

    const summaryRaw = await summaryQb
      .select('SUM(CASE WHEN s.status = \'paid\' THEN s.amount ELSE 0 END)', 'totalAmount')
      .addSelect('SUM(CASE WHEN s.status = \'paid\' THEN 1 ELSE 0 END)', 'paidCount')
      .addSelect('SUM(CASE WHEN s.status = \'pending\' THEN 1 ELSE 0 END)', 'pendingCount')
      .addSelect('SUM(CASE WHEN s.status = \'refunded\' THEN 1 ELSE 0 END)', 'refundedCount')
      .addSelect('SUM(CASE WHEN s.status = \'cancelled\' THEN 1 ELSE 0 END)', 'cancelledCount')
      .addSelect('SUM(CASE WHEN s.status = \'refunded\' THEN s.refundAmount ELSE 0 END)', 'refundAmount')
      .getRawOne();

    const summary = {
      totalAmount: parseInt(summaryRaw?.totalAmount) || 0,
      paidCount: parseInt(summaryRaw?.paidCount) || 0,
      pendingCount: parseInt(summaryRaw?.pendingCount) || 0,
      refundedCount: parseInt(summaryRaw?.refundedCount) || 0,
      cancelledCount: parseInt(summaryRaw?.cancelledCount) || 0,
      refundAmount: parseInt(summaryRaw?.refundAmount) || 0,
    };

    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);
    const list = await qb
      .orderBy('p.createdAt', 'DESC')
      .skip((pg - 1) * ps)
      .take(ps)
      .getMany();

    res.json({ success: true, data: { list, total, summary, page: pg, pageSize: ps } });
  } catch (error: any) {
    log.error('[Wecom] Get payments error:', error);
    res.status(500).json({ success: false, message: '获取收款记录失败' });
  }
});

/**
 * 收款统计数据（汇总+趋势+排行+状态分布）
 */
router.get('/payments/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, startDate, endDate } = req.query;
    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    const qb = paymentRepo.createQueryBuilder('p');

    if (configId) qb.andWhere('p.wecomConfigId = :configId', { configId: parseInt(configId as string) });
    if (startDate) qb.andWhere('p.payTime >= :startDate', { startDate });
    if (endDate) qb.andWhere('p.payTime <= :endDate', { endDate: `${endDate} 23:59:59` });

    const records = await qb.getMany();

    // 汇总
    const paidRecords = records.filter(r => r.status === 'paid');
    const totalAmount = paidRecords.reduce((s, r) => s + (r.amount || 0), 0);
    const totalCount = paidRecords.length;
    const refundRecords = records.filter(r => r.status === 'refunded');
    const refundAmount = refundRecords.reduce((s, r) => s + (r.refundAmount || r.amount || 0), 0);
    const avgAmount = totalCount > 0 ? Math.round(totalAmount / totalCount) : 0;

    // 环比
    let amountChange = 0;
    if (startDate && endDate) {
      const start = new Date(startDate as string);
      const end = new Date(endDate as string);
      const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 86400));
      const prevStart = new Date(start.getTime() - days * 86400 * 1000);
      const prevQb = paymentRepo.createQueryBuilder('p')
        .where('p.status = :s', { s: 'paid' })
        .andWhere('p.payTime >= :ps', { ps: prevStart.toISOString().split('T')[0] })
        .andWhere('p.payTime < :pe', { pe: startDate });
      if (configId) prevQb.andWhere('p.wecomConfigId = :configId', { configId: parseInt(configId as string) });
      const prevRecords = await prevQb.getMany();
      const prevAmount = prevRecords.reduce((s, r) => s + (r.amount || 0), 0);
      amountChange = prevAmount > 0 ? Math.round(((totalAmount - prevAmount) / prevAmount) * 100) : 0;
    }

    // 趋势
    const trendMap: Record<string, { amount: number; count: number; refund: number }> = {};
    for (const r of records) {
      const dateKey = r.payTime ? new Date(r.payTime).toISOString().split('T')[0] : new Date(r.createdAt).toISOString().split('T')[0];
      if (!trendMap[dateKey]) trendMap[dateKey] = { amount: 0, count: 0, refund: 0 };
      if (r.status === 'paid') { trendMap[dateKey].amount += r.amount || 0; trendMap[dateKey].count += 1; }
      if (r.status === 'refunded') { trendMap[dateKey].refund += r.refundAmount || r.amount || 0; }
    }
    const trend = Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data }));

    // 成员排行
    const memberMap: Record<string, { name: string; count: number; amount: number; refundCount: number; refundAmount: number }> = {};
    for (const r of records) {
      const key = r.userId || r.userName || 'unknown';
      if (!memberMap[key]) memberMap[key] = { name: r.userName || key, count: 0, amount: 0, refundCount: 0, refundAmount: 0 };
      if (r.status === 'paid') { memberMap[key].count += 1; memberMap[key].amount += r.amount || 0; }
      if (r.status === 'refunded') { memberMap[key].refundCount += 1; memberMap[key].refundAmount += r.refundAmount || r.amount || 0; }
    }
    const memberRanking = Object.values(memberMap).map(m => ({ ...m, netAmount: m.amount - m.refundAmount })).sort((a, b) => b.amount - a.amount);

    // 状态分布
    const statusCounts: Record<string, number> = {};
    for (const r of records) { statusCounts[r.status] = (statusCounts[r.status] || 0) + 1; }
    const totalRecords = records.length || 1;
    const statusDistribution = [
      { status: 'paid', label: '已支付', count: statusCounts['paid'] || 0, percent: Math.round(((statusCounts['paid'] || 0) / totalRecords) * 1000) / 10 },
      { status: 'pending', label: '待支付', count: statusCounts['pending'] || 0, percent: Math.round(((statusCounts['pending'] || 0) / totalRecords) * 1000) / 10 },
      { status: 'refunded', label: '已退款', count: statusCounts['refunded'] || 0, percent: Math.round(((statusCounts['refunded'] || 0) / totalRecords) * 1000) / 10 },
      { status: 'cancelled', label: '已取消', count: statusCounts['cancelled'] || 0, percent: Math.round(((statusCounts['cancelled'] || 0) / totalRecords) * 1000) / 10 },
    ];

    res.json({
      success: true,
      data: { summary: { totalAmount, totalCount, refundAmount, avgAmount, amountChange }, trend, memberRanking, statusDistribution }
    });
  } catch (error: any) {
    log.error('[Wecom] Get payment stats error:', error);
    res.status(500).json({ success: false, message: '获取收款统计失败' });
  }
});

/**
 * 同步收款记录
 */
router.post('/payments/sync', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, startDate, endDate } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: configId, isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '企微配置不存在或已禁用' });

    const endTime = endDate ? Math.floor(new Date(endDate).getTime() / 1000) : Math.floor(Date.now() / 1000);
    // 默认同步最近365天的记录（企微API支持查询12个月内的数据，包含授权前的记录）
    const beginTime = startDate ? Math.floor(new Date(startDate).getTime() / 1000) : endTime - 365 * 24 * 3600;

    const accessToken = await WecomApiService.getAccessTokenByConfigId(configId, 'payment');
    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    let syncCount = 0;
    let cursor = '';

    do {
      const result = await WecomApiService.getPaymentList(accessToken, beginTime, endTime, cursor);
      const billList = result.billList || [];

      for (const bill of billList) {
        const paymentNo = bill.transaction_id || bill.trade_no || `pay_${Date.now()}_${syncCount}`;
        const existing = await paymentRepo.findOne({ where: { paymentNo } });
        if (existing) {
          existing.status = bill.trade_state === 'SUCCESS' ? 'paid' : (bill.trade_state === 'REFUND' ? 'refunded' : 'pending');
          if (bill.refund_fee) existing.refundAmount = bill.refund_fee;
          await paymentRepo.save(existing);
          continue;
        }

        const record = paymentRepo.create({
          wecomConfigId: configId, corpId: config.corpId,
          paymentNo,
          tradeNo: bill.trade_no || bill.transaction_id,
          userId: bill.userid, userName: bill.user_name,
          externalUserId: bill.external_userid, payerName: bill.payer_name,
          customerName: bill.payer_name,
          amount: bill.total_fee || 0,
          payMethod: bill.pay_type || '微信支付',
          currency: bill.fee_type || 'CNY',
          remark: bill.remark,
          status: bill.trade_state === 'SUCCESS' ? 'paid' : (bill.trade_state === 'REFUND' ? 'refunded' : 'pending'),
          payTime: bill.pay_time ? new Date(bill.pay_time * 1000) : null,
          refundTime: bill.refund_time ? new Date(bill.refund_time * 1000) : null,
          refundAmount: bill.refund_fee || 0,
        });
        await paymentRepo.save(record);
        syncCount++;
      }

      cursor = result.nextCursor || '';
    } while (cursor);

    res.json({ success: true, message: `同步完成，共同步 ${syncCount} 条收款记录` });
  } catch (error: any) {
    log.error('[Wecom] Sync payments error:', error.message, error.stack);
    res.status(500).json({ success: false, message: error.message || '同步收款记录失败' });
  }
});

// ==================== 退款管理 ====================

router.get('/payments/refunds', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { keyword, status, startDate, endDate, operatorName, page = 1, pageSize = 10 } = req.query;
    const refundRepo = getTenantRepo(WecomPaymentRefund);
    const qb = refundRepo.createQueryBuilder('r');

    if (keyword) qb.andWhere('(r.originalPaymentNo LIKE :kw OR r.originalTradeNo LIKE :kw OR r.payerName LIKE :kw OR r.refundNo LIKE :kw)', { kw: `%${keyword}%` });
    if (status) qb.andWhere('r.status = :status', { status });
    if (operatorName) qb.andWhere('r.operatorName LIKE :on', { on: `%${operatorName}%` });
    if (startDate) qb.andWhere('r.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('r.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    const total = await qb.getCount();
    const pg = parseInt(page as string);
    const ps = parseInt(pageSize as string);
    const list = await qb.orderBy('r.createdAt', 'DESC').skip((pg - 1) * ps).take(ps).getMany();

    res.json({ success: true, data: { list, total, page: pg, pageSize: ps } });
  } catch (error: any) {
    log.error('[Wecom] Get refunds error:', error);
    res.status(500).json({ success: false, message: '获取退款记录失败' });
  }
});

router.post('/payments/refunds', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { originalPaymentNo, refundAmount, reason } = req.body;
    if (!originalPaymentNo || !refundAmount) return res.status(400).json({ success: false, message: '原收款单号和退款金额必填' });

    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    const payment = await paymentRepo.findOne({ where: { paymentNo: originalPaymentNo } });
    if (!payment) return res.status(404).json({ success: false, message: '原收款记录不存在' });
    if (payment.status !== 'paid') return res.status(400).json({ success: false, message: '只有已支付的记录可以退款' });
    const maxRefundable = payment.amount - (payment.refundAmount || 0);
    if (refundAmount > maxRefundable) return res.status(400).json({ success: false, message: `退款金额不能超过可退金额(¥${(maxRefundable / 100).toFixed(2)})` });

    const user = (req as any).user;
    const refundNo = `RF${Date.now()}`;
    const refundRepo = getTenantRepo(WecomPaymentRefund);
    const refund = refundRepo.create({
      wecomConfigId: payment.wecomConfigId,
      refundNo,
      originalPaymentNo: payment.paymentNo,
      originalTradeNo: payment.tradeNo,
      payerName: payment.payerName,
      operatorId: user?.userId || String(user?.id || ''),
      operatorName: user?.name || user?.username || '系统',
      originalAmount: payment.amount,
      refundAmount,
      reason: reason || '',
      status: 'processing',
    });
    await refundRepo.save(refund);

    log.info(`[Wecom] Refund created: ${refundNo} for payment ${originalPaymentNo}`);
    res.json({ success: true, data: refund, message: '退款申请已提交' });
  } catch (error: any) {
    log.error('[Wecom] Create refund error:', error);
    res.status(500).json({ success: false, message: '发起退款失败' });
  }
});

router.put('/payments/refunds/:id/approve', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, rejectReason } = req.body;

    const refundRepo = getTenantRepo(WecomPaymentRefund);
    const refund = await refundRepo.findOne({ where: { id: parseInt(id) } });
    if (!refund) return res.status(404).json({ success: false, message: '退款记录不存在' });
    if (refund.status !== 'processing') return res.status(400).json({ success: false, message: '只有处理中的退款可以审批' });

    if (action === 'approve') {
      refund.status = 'completed';
      refund.refundTime = new Date();
      const paymentRepo = getTenantRepo(WecomPaymentRecord);
      const payment = await paymentRepo.findOne({ where: { paymentNo: refund.originalPaymentNo } });
      if (payment) {
        payment.refundAmount = (payment.refundAmount || 0) + refund.refundAmount;
        if (payment.refundAmount >= payment.amount) payment.status = 'refunded';
        payment.refundTime = new Date();
        await paymentRepo.save(payment);
      }
    } else {
      refund.status = 'rejected';
      refund.rejectReason = rejectReason || '';
    }

    await refundRepo.save(refund);
    res.json({ success: true, data: refund, message: action === 'approve' ? '退款已通过' : '退款已拒绝' });
  } catch (error: any) {
    log.error('[Wecom] Approve refund error:', error);
    res.status(500).json({ success: false, message: '审批退款失败' });
  }
});

/**
 * 退款统计数据
 */
router.get('/payments/refund-stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { startDate, endDate } = req.query;
    const refundRepo = getTenantRepo(WecomPaymentRefund);
    const qb = refundRepo.createQueryBuilder('r');
    if (startDate) qb.andWhere('r.createdAt >= :startDate', { startDate });
    if (endDate) qb.andWhere('r.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });

    const records = await qb.getMany();

    // 汇总
    const totalCount = records.length;
    const completedRecords = records.filter(r => r.status === 'completed');
    const rejectedRecords = records.filter(r => r.status === 'rejected');
    const processingRecords = records.filter(r => r.status === 'processing');
    const totalRefundAmount = completedRecords.reduce((s, r) => s + (r.refundAmount || 0), 0);
    const approvalRate = totalCount > 0 ? Math.round((completedRecords.length / totalCount) * 1000) / 10 : 0;
    const avgProcessMs = completedRecords.length > 0
      ? completedRecords.reduce((s, r) => s + (r.refundTime ? new Date(r.refundTime).getTime() - new Date(r.createdAt).getTime() : 0), 0) / completedRecords.length
      : 0;
    const avgProcessHours = Math.round(avgProcessMs / 3600000 * 10) / 10;

    // 趋势
    const trendMap: Record<string, { amount: number; count: number; completed: number; rejected: number }> = {};
    for (const r of records) {
      const dateKey = new Date(r.createdAt).toISOString().split('T')[0];
      if (!trendMap[dateKey]) trendMap[dateKey] = { amount: 0, count: 0, completed: 0, rejected: 0 };
      trendMap[dateKey].count += 1;
      if (r.status === 'completed') { trendMap[dateKey].amount += r.refundAmount || 0; trendMap[dateKey].completed += 1; }
      if (r.status === 'rejected') { trendMap[dateKey].rejected += 1; }
    }
    const trend = Object.entries(trendMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, data]) => ({ date, ...data }));

    // 原因分布
    const reasonMap: Record<string, number> = {};
    for (const r of records) {
      const reason = r.reason?.trim() || '未填写原因';
      reasonMap[reason] = (reasonMap[reason] || 0) + 1;
    }
    const reasonDistribution = Object.entries(reasonMap)
      .map(([reason, count]) => ({ reason, count, percent: Math.round((count / (totalCount || 1)) * 1000) / 10 }))
      .sort((a, b) => b.count - a.count);

    // 操作人排行
    const operatorMap: Record<string, { name: string; count: number; amount: number; completedCount: number; rejectedCount: number }> = {};
    for (const r of records) {
      const key = r.operatorName || '未知';
      if (!operatorMap[key]) operatorMap[key] = { name: key, count: 0, amount: 0, completedCount: 0, rejectedCount: 0 };
      operatorMap[key].count += 1;
      if (r.status === 'completed') { operatorMap[key].amount += r.refundAmount || 0; operatorMap[key].completedCount += 1; }
      if (r.status === 'rejected') { operatorMap[key].rejectedCount += 1; }
    }
    const operatorRanking = Object.values(operatorMap).sort((a, b) => b.amount - a.amount);

    // 状态分布
    const statusDistribution = [
      { status: 'completed', label: '已完成', count: completedRecords.length, percent: Math.round((completedRecords.length / (totalCount || 1)) * 1000) / 10 },
      { status: 'processing', label: '处理中', count: processingRecords.length, percent: Math.round((processingRecords.length / (totalCount || 1)) * 1000) / 10 },
      { status: 'rejected', label: '已拒绝', count: rejectedRecords.length, percent: Math.round((rejectedRecords.length / (totalCount || 1)) * 1000) / 10 },
    ];

    res.json({
      success: true,
      data: {
        summary: { totalCount, totalRefundAmount, approvalRate, avgProcessHours, completedCount: completedRecords.length, rejectedCount: rejectedRecords.length, processingCount: processingRecords.length },
        trend, reasonDistribution, operatorRanking, statusDistribution
      }
    });
  } catch (error: any) {
    log.error('[Wecom] Get refund stats error:', error);
    res.status(500).json({ success: false, message: '获取退款统计失败' });
  }
});

// ==================== 收款码 ====================

router.get('/payments/qrcodes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const qrcodeRepo = getTenantRepo(WecomPaymentQrcode);
    const list = await qrcodeRepo.find({ order: { createdAt: 'DESC' } });
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Get qrcodes error:', error);
    res.status(500).json({ success: false, message: '获取收款码失败' });
  }
});

router.post('/payments/qrcodes', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { name, amountType, fixedAmount, description, memberUserIds, memberNames, remarkTemplate, configId } = req.body;
    if (!name) return res.status(400).json({ success: false, message: '名称必填' });

    const qrcodeRepo = getTenantRepo(WecomPaymentQrcode);
    const qrcode = qrcodeRepo.create({
      wecomConfigId: configId || 0, name,
      amountType: amountType || 'custom', fixedAmount: fixedAmount || 0,
      description,
      memberUserIds: Array.isArray(memberUserIds) ? JSON.stringify(memberUserIds) : (memberUserIds || '[]'),
      memberNames, remarkTemplate, isEnabled: true,
    });
    await qrcodeRepo.save(qrcode);
    res.json({ success: true, data: qrcode, message: '收款码已创建' });
  } catch (error: any) {
    log.error('[Wecom] Create qrcode error:', error);
    res.status(500).json({ success: false, message: '创建收款码失败' });
  }
});

router.put('/payments/qrcodes/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const qrcodeRepo = getTenantRepo(WecomPaymentQrcode);
    const qrcode = await qrcodeRepo.findOne({ where: { id: parseInt(id) } });
    if (!qrcode) return res.status(404).json({ success: false, message: '收款码不存在' });

    const { name, amountType, fixedAmount, description, memberUserIds, memberNames, remarkTemplate, isEnabled } = req.body;
    if (name !== undefined) qrcode.name = name;
    if (amountType !== undefined) qrcode.amountType = amountType;
    if (fixedAmount !== undefined) qrcode.fixedAmount = fixedAmount;
    if (description !== undefined) qrcode.description = description;
    if (memberUserIds !== undefined) qrcode.memberUserIds = Array.isArray(memberUserIds) ? JSON.stringify(memberUserIds) : memberUserIds;
    if (memberNames !== undefined) qrcode.memberNames = memberNames;
    if (remarkTemplate !== undefined) qrcode.remarkTemplate = remarkTemplate;
    if (isEnabled !== undefined) qrcode.isEnabled = isEnabled;

    await qrcodeRepo.save(qrcode);
    res.json({ success: true, data: qrcode, message: '收款码已更新' });
  } catch (error: any) {
    log.error('[Wecom] Update qrcode error:', error);
    res.status(500).json({ success: false, message: '更新收款码失败' });
  }
});

router.delete('/payments/qrcodes/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const qrcodeRepo = getTenantRepo(WecomPaymentQrcode);
    await qrcodeRepo.delete(parseInt(req.params.id));
    res.json({ success: true, message: '收款码已删除' });
  } catch (error: any) {
    log.error('[Wecom] Delete qrcode error:', error);
    res.status(500).json({ success: false, message: '删除收款码失败' });
  }
});

// ==================== 收款设置 ====================

router.get('/payments/settings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const configRepo = getTenantRepo(WecomConfig);
    const config = configId
      ? await configRepo.findOne({ where: { id: parseInt(configId as string) } })
      : await configRepo.findOne({ where: { isEnabled: true } });

    const defaults = {
      autoSync: true, syncFrequency: '1h',
      autoLinkOrder: true, autoUpdateOrderStatus: true,
      notifyOnPaid: true, notifyOnRefund: true, notifyOnTimeout: false,
      timeoutHours: 24, refundApproval: true, refundMaxDays: 90,
    };

    let settings: any = { ...defaults };
    if (config?.paymentSettings) {
      try { settings = { ...defaults, ...JSON.parse(config.paymentSettings) }; } catch { /* defaults */ }
    }
    settings.authType = config?.authType || 'self_built';

    res.json({ success: true, data: settings });
  } catch (error: any) {
    log.error('[Wecom] Get payment settings error:', error);
    res.status(500).json({ success: false, message: '获取收款设置失败' });
  }
});

router.put('/payments/settings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, ...settings } = req.body;
    const configRepo = getTenantRepo(WecomConfig);
    const config = configId
      ? await configRepo.findOne({ where: { id: parseInt(configId) } })
      : await configRepo.findOne({ where: { isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '未找到企微配置' });

    // 设置存 JSON（2023.12起无需独立的paymentSecret）
    config.paymentSettings = JSON.stringify(settings);
    await configRepo.save(config);
    res.json({ success: true, message: '收款设置已保存' });
  } catch (error: any) {
    log.error('[Wecom] Save payment settings error:', error);
    res.status(500).json({ success: false, message: '保存收款设置失败' });
  }
});

/**
 * 测试对外收款API权限
 * 支持两种模式：
 * - 自建应用: corpSecret → gettoken → 调用get_bill_list验证（需在企微后台配置可调用接口的应用）
 * - 第三方应用: permanent_code → get_corp_token → 调用get_bill_list验证权限
 * 注: 2023年12月起，企微不再支持独立的「对外收款Secret」
 */
router.post('/payments/test-secret', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId } = req.body;
    const configRepo = getTenantRepo(WecomConfig);
    const config = configId
      ? await configRepo.findOne({ where: { id: parseInt(configId) } })
      : await configRepo.findOne({ where: { isEnabled: true } });
    if (!config) return res.status(404).json({ success: false, message: '未找到企微配置' });

    if (config.authType === 'third_party') {
      // 第三方应用模式：通过permanent_code获取token后调用收款API验证权限
      if (!config.permanentCode) {
        return res.json({ success: true, data: { connected: false, message: '第三方应用尚未完成授权(缺少永久授权码)' } });
      }
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const token = await WecomTokenService.getAccessToken(config, 'payment');
        // 用获取到的token尝试调用收款API(空查询)验证权限
        const axios = (await import('axios')).default;
        const now = Math.floor(Date.now() / 1000);
        const verifyRes = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/externalpay/get_bill_list?access_token=${token}`,
          { begin_time: now - 3600, end_time: now, limit: 1 }
        );
        const ec = verifyRes.data?.errcode;
        if (ec === 0 || ec === undefined) {
          res.json({ success: true, data: { connected: true, message: '第三方应用收款权限验证通过' } });
        } else if (ec === 48002 || ec === 60011 || ec === 60020) {
          res.json({ success: true, data: { connected: false, message: `收款权限不足(errcode:${ec})，请确认授权时已勾选「对外收款」权限` } });
        } else {
          res.json({ success: true, data: { connected: false, message: `收款API调用异常: ${verifyRes.data?.errmsg} (${ec})` } });
        }
      } catch (e: any) {
        res.json({ success: true, data: { connected: false, message: `验证失败: ${e.message}` } });
      }
    } else {
      // 自建应用模式：使用corpSecret获取token后调用收款API验证
      // 2023年12月起不再支持独立的「对外收款Secret」，必须使用已配置的自建应用Secret
      if (!config.corpSecret) {
        return res.json({ success: true, data: { connected: false, message: '未配置应用Secret(corpSecret)，请在Secret管理中先配置' } });
      }
      try {
        const { WecomTokenService } = await import('../../services/wecom/WecomTokenService');
        const token = await WecomTokenService.getAccessToken(config, 'corp');
        const axios = (await import('axios')).default;
        const now = Math.floor(Date.now() / 1000);
        const verifyRes = await axios.post(
          `https://qyapi.weixin.qq.com/cgi-bin/externalpay/get_bill_list?access_token=${token}`,
          { begin_time: now - 3600, end_time: now, limit: 1 }
        );
        const ec = verifyRes.data?.errcode;
        if (ec === 0 || ec === undefined) {
          res.json({ success: true, data: { connected: true, message: '收款API可用，自建应用已被授权调用对外收款接口' } });
        } else if (ec === 48002) {
          res.json({ success: true, data: { connected: false, message: '当前自建应用未被授权调用对外收款接口。请在企微管理后台→对外收款→API→设置「可调用接口的应用」中勾选该应用' } });
        } else if (ec === 60011 || ec === 60020) {
          res.json({ success: true, data: { connected: false, message: `权限不足(errcode:${ec})，请检查应用的可见范围设置` } });
        } else {
          res.json({ success: true, data: { connected: false, message: `收款API调用异常: ${verifyRes.data?.errmsg} (${ec})` } });
        }
      } catch (e: any) {
        res.json({ success: true, data: { connected: false, message: `验证失败: ${e.message}` } });
      }
    }
  } catch (error: any) {
    log.error('[Wecom] Test payment secret error:', error);
    res.status(500).json({ success: false, message: error.message || '测试连接失败' });
  }
});

/**
 * 搜索已支付记录（退款下拉选择用）
 */
router.get('/payments/search-paid', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { keyword } = req.query;
    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    const qb = paymentRepo.createQueryBuilder('p').where('p.status = :status', { status: 'paid' });
    if (keyword) qb.andWhere('(p.paymentNo LIKE :kw OR p.tradeNo LIKE :kw OR p.payerName LIKE :kw)', { kw: `%${keyword}%` });
    const list = await qb.orderBy('p.payTime', 'DESC').take(20).getMany();
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Search paid error:', error);
    res.status(500).json({ success: false, message: '搜索失败' });
  }
});

/**
 * 关联CRM订单
 */
router.put('/payments/:id/link-order', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { crmOrderNo } = req.body;
    if (!crmOrderNo) return res.status(400).json({ success: false, message: 'CRM订单号必填' });

    const paymentRepo = getTenantRepo(WecomPaymentRecord);
    const payment = await paymentRepo.findOne({ where: { id: parseInt(id) } });
    if (!payment) return res.status(404).json({ success: false, message: '收款记录不存在' });

    payment.crmOrderNo = crmOrderNo;
    await paymentRepo.save(payment);
    res.json({ success: true, message: '关联成功', data: payment });
  } catch (error: any) {
    log.error('[Wecom] Link order error:', error);
    res.status(500).json({ success: false, message: '关联CRM订单失败' });
  }
});

export default router;

