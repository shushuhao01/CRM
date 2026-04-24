/**
 * 管理后台 - 短信管理路由
 * v1.8.0 阶段3：跨租户模板审核、预设模板、发送记录、统计
 */
import { Router, Request, Response } from 'express';
import { AppDataSource } from '../../config/database';
import { SmsTemplate } from '../../entities/SmsTemplate';
import { SmsRecord } from '../../entities/SmsRecord';
import { log } from '../../config/logger';
import { adminNotificationService } from '../../services/AdminNotificationService';
import { sendBatchSystemMessages } from '../../services/messageService';

const router = Router();

// ==================== 模板审核 ====================

/**
 * 获取待审核模板列表（跨租户）
 */
router.get('/template-review', async (req: Request, res: Response) => {
  try {
    const { status, keyword, page = 1, pageSize = 20 } = req.query;
    const repo = AppDataSource.getRepository(SmsTemplate);
    const qb = repo.createQueryBuilder('t');

    // 默认查询待管理员审核的
    if (status && status !== 'all') {
      qb.andWhere('t.status = :status', { status });
    } else {
      // all: 排除 deleted
      qb.andWhere('t.status != :del', { del: 'deleted' });
    }

    if (keyword) {
      qb.andWhere('(t.name LIKE :kw OR t.applicant_name LIKE :kw OR t.content LIKE :kw)', { kw: `%${keyword}%` });
    }

    qb.orderBy('t.created_at', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    // 补充租户名称映射
    const needNameIds = list.filter(t => t.tenantId).map(t => t.tenantId!);
    if (needNameIds.length > 0) {
      try {
        const uniqueIds = [...new Set(needNameIds)];
        const tenantRows = await AppDataSource.query(
          `SELECT id, name FROM tenants WHERE id IN (${uniqueIds.map(() => '?').join(',')})`,
          uniqueIds
        ).catch(() => []);
        const nameMap: Record<string, string> = {};
        for (const t of tenantRows) nameMap[t.id] = t.name;
        for (const item of list) {
          if (item.tenantId && nameMap[item.tenantId]) {
            (item as any).tenantName = nameMap[item.tenantId];
          }
        }
      } catch { /* ignore */ }
    }

    // 生成短编码
    const enrichedList = list.map(t => ({
      ...t,
      shortId: t.id ? t.id.substring(0, 8).toUpperCase() : t.id
    }));

    res.json({ success: true, code: 200, data: { list: enrichedList, total, page: Number(page), pageSize: Number(pageSize) }, message: '获取成功' });
  } catch (error) {
    log.error('[Admin SMS] 获取审核列表失败:', error);
    res.status(500).json({ success: false, code: 500, message: '获取审核列表失败' });
  }
});

/**
 * 管理员审核模板（通过/拒绝）
 * 通过 → pending_vendor（等待提交服务商）或直接 active（如填了vendorTemplateCode）
 * 拒绝 → rejected
 */
router.post('/template-review/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { action, note, vendorTemplateCode } = req.body;
    // action: 'approve' | 'reject' | 'activate'
    const adminUser = (req as any).adminUser;
    const repo = AppDataSource.getRepository(SmsTemplate);

    const template = await repo.findOne({ where: { id: id as any } });
    if (!template) {
      return res.status(404).json({ success: false, code: 404, message: '模板不存在' });
    }

    const now = new Date();

    if (action === 'approve') {
      // 初审通过
      if (vendorTemplateCode) {
        // 直接填入CODE则激活
        template.status = 'active';
        template.vendorTemplateCode = vendorTemplateCode;
        template.vendorStatus = 'approved';
      } else {
        template.status = 'pending_vendor';
        template.vendorSubmitAt = now;
        template.vendorStatus = 'pending';
      }
      template.adminReviewer = adminUser?.username || adminUser?.name || 'admin';
      template.adminReviewAt = now;
      template.adminReviewNote = note || '审核通过';
    } else if (action === 'reject') {
      template.status = 'rejected';
      template.adminReviewer = adminUser?.username || adminUser?.name || 'admin';
      template.adminReviewAt = now;
      template.adminReviewNote = note || '审核拒绝';
    } else if (action === 'activate') {
      // 服务商审核通过后，管理员填入CODE激活
      if (!vendorTemplateCode) {
        return res.status(400).json({ success: false, code: 400, message: '激活模板需要填写服务商模板CODE' });
      }
      template.status = 'active';
      template.vendorTemplateCode = vendorTemplateCode;
      template.vendorStatus = 'approved';
      template.adminReviewer = adminUser?.username || adminUser?.name || 'admin';
      template.adminReviewAt = now;
      template.adminReviewNote = note || '已激活';
    } else {
      return res.status(400).json({ success: false, code: 400, message: '无效的操作类型' });
    }

    await repo.save(template);

    log.info(`[Admin SMS] 管理员 ${adminUser?.username} 对模板 ${id} 执行了 ${action} 操作`);

    // 发送管理后台通知
    try {
      const eventMap: Record<string, string> = {
        approve: 'sms_template_approved',
        reject: 'sms_template_rejected',
        activate: 'sms_template_activated'
      };
      const eventType = eventMap[action] || 'sms_template_approved';
      await adminNotificationService.notify(eventType as any, {
        title: `短信模板${action === 'reject' ? '审核拒绝' : action === 'activate' ? '已激活' : '审核通过'}`,
        content: `模板"${template.name}"(ID:${id})已被管理员${adminUser?.username || ''}${action === 'reject' ? '拒绝' : action === 'activate' ? '激活' : '通过审核'}`,
        relatedId: String(id),
        relatedType: 'sms_template',
        extraData: { templateName: template.name, tenantId: template.tenantId, action }
      });
    } catch (notifyErr) {
      log.warn('[Admin SMS] 发送管理后台通知失败:', notifyErr);
    }

    // 🔥 通知CRM端申请人（系统消息 + WebSocket实时推送）
    if (template.applicant) {
      try {
        const actionText = action === 'reject' ? '被拒绝' : action === 'activate' ? '已激活' : '审核通过';
        const msgType = action === 'reject' ? 'sms_template_rejected' : 'sms_template_approved';
        const rejectNote = action === 'reject' && note ? `\n拒绝原因：${note}` : '';
        await sendBatchSystemMessages([{
          type: msgType,
          title: `短信模板${actionText}`,
          content: `您申请的短信模板"${template.name}"${actionText}。${rejectNote}`,
          targetUserId: template.applicant,
          category: '短信管理',
          relatedId: String(id),
          relatedType: 'sms_template',
          actionUrl: '/service/sms-management'
        }]);
        log.info(`[Admin SMS] 已通知CRM申请人 ${template.applicant} 模板审核结果: ${actionText}`);
      } catch (crmNotifyErr) {
        log.warn('[Admin SMS] 通知CRM申请人失败:', crmNotifyErr);
      }
    }

    res.json({ success: true, code: 200, data: template, message: action === 'reject' ? '已拒绝' : '操作成功' });
  } catch (error) {
    log.error('[Admin SMS] 审核模板失败:', error);
    res.status(500).json({ success: false, code: 500, message: '审核模板失败' });
  }
});

// ==================== 预设模板管理 ====================

/**
 * 获取所有模板（含预设 + 租户模板）
 */
router.get('/templates', async (req: Request, res: Response) => {
  try {
    const { keyword, category, isPreset, page = 1, pageSize = 20 } = req.query;
    const repo = AppDataSource.getRepository(SmsTemplate);
    const qb = repo.createQueryBuilder('t');

    qb.andWhere('t.status != :del', { del: 'deleted' });

    if (keyword) {
      qb.andWhere('(t.name LIKE :kw OR t.content LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (category) {
      qb.andWhere('t.category = :category', { category });
    }
    if (isPreset !== undefined && isPreset !== '') {
      qb.andWhere('t.is_preset = :isPreset', { isPreset: Number(isPreset) });
    }

    qb.orderBy('t.is_preset', 'DESC');
    qb.addOrderBy('t.created_at', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    res.json({ success: true, data: { list, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    log.error('[Admin SMS] 获取模板列表失败:', error);
    res.status(500).json({ success: false, message: '获取模板列表失败' });
  }
});

/**
 * 创建预设模板
 */
router.post('/templates', async (req: Request, res: Response) => {
  try {
    const adminUser = (req as any).adminUser;
    const { name, category, content, variables, description, vendorTemplateCode } = req.body;

    if (!name || !content) {
      return res.status(400).json({ success: false, message: '模板名称和内容不能为空' });
    }

    const repo = AppDataSource.getRepository(SmsTemplate);
    const template = repo.create({
      name,
      category: category || 'system',
      content,
      variables: variables || [],
      description,
      applicant: adminUser?.username || 'admin',
      applicantName: adminUser?.name || '管理员',
      applicantDept: '平台管理',
      status: vendorTemplateCode ? 'active' : 'pending_vendor',
      vendorTemplateCode: vendorTemplateCode || null,
      vendorStatus: vendorTemplateCode ? 'approved' : 'pending',
      isPreset: 1,
      adminReviewer: adminUser?.username || 'admin',
      adminReviewAt: new Date(),
      adminReviewNote: '管理后台创建预设模板'
    });

    const saved = await repo.save(template);
    log.info(`[Admin SMS] 管理员 ${adminUser?.username} 创建了预设模板: ${name}`);

    res.status(201).json({ success: true, data: saved, message: '预设模板创建成功' });
  } catch (error) {
    log.error('[Admin SMS] 创建预设模板失败:', error);
    res.status(500).json({ success: false, message: '创建预设模板失败' });
  }
});

/**
 * 更新模板
 */
router.put('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const repo = AppDataSource.getRepository(SmsTemplate);

    const template = await repo.findOne({ where: { id: id as any } });
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    const { name, category, content, variables, description, vendorTemplateCode, status } = req.body;
    if (name) template.name = name;
    if (category) template.category = category;
    if (content) template.content = content;
    if (variables) template.variables = variables;
    if (description !== undefined) template.description = description;
    if (vendorTemplateCode !== undefined) {
      template.vendorTemplateCode = vendorTemplateCode;
      if (vendorTemplateCode && template.status === 'pending_vendor') {
        template.status = 'active';
        template.vendorStatus = 'approved';
      }
    }
    if (status) template.status = status;

    await repo.save(template);
    log.info(`[Admin SMS] 管理员 ${adminUser?.username} 更新了模板 ${id}`);

    res.json({ success: true, data: template, message: '更新成功' });
  } catch (error) {
    log.error('[Admin SMS] 更新模板失败:', error);
    res.status(500).json({ success: false, message: '更新模板失败' });
  }
});

/**
 * 删除模板（逻辑删除）
 */
router.delete('/templates/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const adminUser = (req as any).adminUser;
    const repo = AppDataSource.getRepository(SmsTemplate);

    const template = await repo.findOne({ where: { id: id as any } });
    if (!template) {
      return res.status(404).json({ success: false, message: '模板不存在' });
    }

    template.status = 'deleted';
    await repo.save(template);

    log.info(`[Admin SMS] 管理员 ${adminUser?.username} 删除了模板 ${id}`);
    res.json({ success: true, message: '已删除' });
  } catch (error) {
    log.error('[Admin SMS] 删除模板失败:', error);
    res.status(500).json({ success: false, message: '删除模板失败' });
  }
});

// ==================== 跨租户发送记录 ====================

/**
 * 获取所有租户的短信发送记录
 */
router.get('/records', async (req: Request, res: Response) => {
  try {
    const { keyword, status, startDate, endDate, page = 1, pageSize = 20 } = req.query;
    const repo = AppDataSource.getRepository(SmsRecord);
    const qb = repo.createQueryBuilder('r');

    if (keyword) {
      qb.andWhere('(r.template_name LIKE :kw OR r.applicant_name LIKE :kw OR r.content LIKE :kw)', { kw: `%${keyword}%` });
    }
    if (status) {
      qb.andWhere('r.status = :status', { status });
    }
    if (startDate) {
      qb.andWhere('r.created_at >= :startDate', { startDate });
    }
    if (endDate) {
      qb.andWhere('r.created_at <= :endDate', { endDate: `${endDate} 23:59:59` });
    }

    qb.orderBy('r.created_at', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    // 补充租户名称映射
    const needNameIds = list.filter(r => r.tenantId).map(r => r.tenantId);
    if (needNameIds.length > 0) {
      try {
        const uniqueIds = [...new Set(needNameIds)];
        const tenantRows = await AppDataSource.query(
          `SELECT id, name FROM tenants WHERE id IN (${uniqueIds.map(() => '?').join(',')})`,
          uniqueIds
        ).catch(() => []);
        const nameMap: Record<string, string> = {};
        for (const t of tenantRows) nameMap[t.id] = t.name;
        for (const r of list) {
          if (r.tenantId && nameMap[r.tenantId]) {
            (r as any).tenantName = nameMap[r.tenantId];
          }
        }
      } catch { /* ignore */ }
    }

    // 生成短编码 ID（取 UUID 前8位）
    const enrichedList = list.map(r => ({
      ...r,
      shortId: r.id ? r.id.substring(0, 8).toUpperCase() : r.id
    }));

    res.json({ success: true, data: { list: enrichedList, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    log.error('[Admin SMS] 获取发送记录失败:', error);
    res.status(500).json({ success: false, message: '获取发送记录失败' });
  }
});

// ==================== 全平台统计 ====================

/**
 * 全平台短信统计概览
 */
router.get('/statistics', async (_req: Request, res: Response) => {
  try {
    const templateRepo = AppDataSource.getRepository(SmsTemplate);
    const recordRepo = AppDataSource.getRepository(SmsRecord);

    // 各状态模板数量
    const templateStats = await templateRepo
      .createQueryBuilder('t')
      .select('t.status', 'status')
      .addSelect('COUNT(*)', 'count')
      .where('t.status != :del', { del: 'deleted' })
      .groupBy('t.status')
      .getRawMany();

    // 总模板数
    const totalTemplates = await templateRepo.createQueryBuilder('t')
      .where('t.status != :del', { del: 'deleted' }).getCount();

    // 预设模板数
    const presetTemplates = await templateRepo.createQueryBuilder('t')
      .where('t.is_preset = 1').andWhere('t.status != :del', { del: 'deleted' }).getCount();

    // 待审核数
    const pendingCount = await templateRepo.createQueryBuilder('t')
      .where('t.status IN (:...statuses)', { statuses: ['pending_admin', 'pending'] }).getCount();

    // 发送记录统计
    const totalRecords = await recordRepo.count();

    const totalSentResult = await recordRepo.createQueryBuilder('r')
      .select('SUM(r.success_count)', 'total').getRawOne();

    // 今日发送
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const todaySentResult = await recordRepo.createQueryBuilder('r')
      .select('SUM(r.success_count)', 'total')
      .where('r.sent_at >= :today', { today }).getRawOne();

    // 本月发送
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthSentResult = await recordRepo.createQueryBuilder('r')
      .select('SUM(r.success_count)', 'total')
      .where('r.sent_at >= :monthStart', { monthStart }).getRawOne();

    // 最近7天每日发送量
    const dailyStats = await recordRepo.createQueryBuilder('r')
      .select('DATE(r.sent_at)', 'date')
      .addSelect('SUM(r.success_count)', 'count')
      .where('r.sent_at >= :weekAgo', { weekAgo: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) })
      .groupBy('DATE(r.sent_at)')
      .orderBy('DATE(r.sent_at)', 'ASC')
      .getRawMany();

    res.json({
      success: true,
      data: {
        templateStats,
        totalTemplates,
        presetTemplates,
        pendingCount,
        totalRecords,
        totalSent: Number(totalSentResult?.total) || 0,
        todaySent: Number(todaySentResult?.total) || 0,
        monthSent: Number(monthSentResult?.total) || 0,
        dailyStats
      }
    });
  } catch (error) {
    log.error('[Admin SMS] 获取统计数据失败:', error);
    res.status(500).json({ success: false, message: '获取统计数据失败' });
  }
});

export default router;

