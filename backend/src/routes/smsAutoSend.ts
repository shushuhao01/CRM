import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../middleware/auth';
import { SmsAutoSendRule } from '../entities/SmsAutoSendRule';
import { SmsTemplate } from '../entities/SmsTemplate';
import { SmsRecord } from '../entities/SmsRecord';
import { getTenantRepo } from '../utils/tenantRepo';
import { TenantContextManager } from '../utils/tenantContext';
import { AppDataSource } from '../config/database';
import { log } from '../config/logger';

const router = Router();

router.use(authenticateToken);
router.use(requireAdmin); // 自动发送规则仅管理员可操作

// ==================== 触发事件类型定义 ====================
const TRIGGER_EVENTS = [
  { value: 'order_shipped', label: '订单发货', description: '上传物流单号/发货后自动发送短信给客户' },
  { value: 'order_confirmed', label: '订单确认', description: '订单确认后自动发送短信给客户' },
  { value: 'order_paid', label: '订单付款', description: '订单支付完成后自动发送短信给客户' },
  { value: 'order_delivered', label: '订单签收', description: '订单签收后自动发送短信给客户' },
  { value: 'customer_created', label: '新客户创建', description: '新客户创建后自动发送欢迎短信' },
  { value: 'follow_up_remind', label: '跟进提醒', description: '到达跟进时间时自动发送提醒短信' },
  { value: 'payment_remind', label: '付款提醒', description: '订单到期未付款时自动提醒' },
  { value: 'birthday_wish', label: '生日祝福', description: '客户生日当天自动发送祝福短信' },
];

/**
 * 获取触发事件类型列表
 */
router.get('/trigger-events', (_req: Request, res: Response) => {
  res.json({ success: true, data: { events: TRIGGER_EVENTS } });
});

/**
 * 获取自动发送规则列表
 */
router.get('/rules', async (req: Request, res: Response) => {
  try {
    const { page = 1, pageSize = 20, enabled, triggerEvent } = req.query;
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const qb = ruleRepo.createQueryBuilder('rule');

    if (enabled !== undefined && enabled !== '') {
      qb.andWhere('rule.enabled = :enabled', { enabled: Number(enabled) });
    }
    if (triggerEvent) {
      qb.andWhere('rule.triggerEvent = :triggerEvent', { triggerEvent });
    }

    qb.orderBy('rule.createdAt', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [rules, total] = await qb.getManyAndCount();

    res.json({ success: true, data: { rules, total, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    log.error('获取自动发送规则失败:', error);
    res.status(500).json({ success: false, message: '获取自动发送规则失败' });
  }
});

/**
 * 创建自动发送规则
 */
router.post('/rules', async (req: Request, res: Response) => {
  try {
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const currentUser = (req as any).user;
    const { name, templateId, triggerEvent, effectiveDepartments, timeRangeConfig, description } = req.body;

    if (!name || !templateId || !triggerEvent) {
      return res.status(400).json({ success: false, message: '规则名称、模板和触发事件不能为空' });
    }

    // 验证模板存在且可用
    const tenantId = TenantContextManager.getTenantId();
    const templateRepo = AppDataSource.getRepository(SmsTemplate);
    const template = await templateRepo.findOne({
      where: [
        { id: templateId, tenantId, status: 'active' },
        { id: templateId, isPreset: 1, status: 'active' }
      ]
    });
    if (!template) {
      return res.status(400).json({ success: false, message: '所选模板不存在或未激活' });
    }

    const rule = ruleRepo.create({
      name,
      templateId,
      templateName: template.name,
      triggerEvent,
      effectiveDepartments: effectiveDepartments || [],
      timeRangeConfig: timeRangeConfig || { sendImmediately: true },
      enabled: 1,
      createdBy: currentUser?.userId,
      createdByName: currentUser?.realName || currentUser?.username || '',
      description: description || '',
      statsSentCount: 0,
      statsFailCount: 0
    });

    const saved = await ruleRepo.save(rule);
    log.info(`[SMS-AutoSend] 创建规则: ${name}, 触发事件: ${triggerEvent}, 模板: ${template.name}`);

    res.status(201).json({ success: true, data: saved, message: '规则创建成功' });
  } catch (error) {
    log.error('创建自动发送规则失败:', error);
    res.status(500).json({ success: false, message: '创建自动发送规则失败' });
  }
});

/**
 * 更新自动发送规则
 */
router.put('/rules/:id', async (req: Request, res: Response) => {
  try {
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const { id } = req.params;
    const { name, templateId, triggerEvent, effectiveDepartments, timeRangeConfig, description } = req.body;

    const rule = await ruleRepo.findOne({ where: { id } });
    if (!rule) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }

    // 如果更新了模板，验证新模板
    if (templateId && templateId !== rule.templateId) {
      const tenantId = TenantContextManager.getTenantId();
      const templateRepo = AppDataSource.getRepository(SmsTemplate);
      const template = await templateRepo.findOne({
        where: [
          { id: templateId, tenantId, status: 'active' },
          { id: templateId, isPreset: 1, status: 'active' }
        ]
      });
      if (!template) {
        return res.status(400).json({ success: false, message: '所选模板不存在或未激活' });
      }
      rule.templateId = templateId;
      rule.templateName = template.name;
    }

    if (name !== undefined) rule.name = name;
    if (triggerEvent !== undefined) rule.triggerEvent = triggerEvent;
    if (effectiveDepartments !== undefined) rule.effectiveDepartments = effectiveDepartments;
    if (timeRangeConfig !== undefined) rule.timeRangeConfig = timeRangeConfig;
    if (description !== undefined) rule.description = description;

    await ruleRepo.save(rule);

    res.json({ success: true, data: rule, message: '规则更新成功' });
  } catch (error) {
    log.error('更新自动发送规则失败:', error);
    res.status(500).json({ success: false, message: '更新自动发送规则失败' });
  }
});

/**
 * 删除自动发送规则
 */
router.delete('/rules/:id', async (req: Request, res: Response) => {
  try {
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const { id } = req.params;

    const rule = await ruleRepo.findOne({ where: { id } });
    if (!rule) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }

    await ruleRepo.remove(rule);

    res.json({ success: true, message: '规则已删除' });
  } catch (error) {
    log.error('删除自动发送规则失败:', error);
    res.status(500).json({ success: false, message: '删除自动发送规则失败' });
  }
});

/**
 * 切换规则启用/禁用
 */
router.patch('/rules/:id/toggle', async (req: Request, res: Response) => {
  try {
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const { id } = req.params;

    const rule = await ruleRepo.findOne({ where: { id } });
    if (!rule) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }

    rule.enabled = rule.enabled === 1 ? 0 : 1;
    await ruleRepo.save(rule);

    res.json({
      success: true,
      data: { id, enabled: rule.enabled },
      message: rule.enabled ? '规则已启用' : '规则已禁用'
    });
  } catch (error) {
    log.error('切换规则状态失败:', error);
    res.status(500).json({ success: false, message: '切换规则状态失败' });
  }
});

/**
 * 获取单个规则详情（含统计）
 */
router.get('/rules/:id', async (req: Request, res: Response) => {
  try {
    const ruleRepo = getTenantRepo(SmsAutoSendRule);
    const { id } = req.params;

    const rule = await ruleRepo.findOne({ where: { id } });
    if (!rule) {
      return res.status(404).json({ success: false, message: '规则不存在' });
    }

    res.json({ success: true, data: rule });
  } catch (error) {
    log.error('获取规则详情失败:', error);
    res.status(500).json({ success: false, message: '获取规则详情失败' });
  }
});

/**
 * 🔥 v1.8.1 新增：获取自动发送规则的发送记录列表
 * GET /rules/:id/records
 */
router.get('/rules/:id/records', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { page = 1, pageSize = 10, keyword } = req.query;
    const recordRepo = getTenantRepo(SmsRecord);

    const qb = recordRepo.createQueryBuilder('record');
    qb.andWhere('record.autoRuleId = :ruleId', { ruleId: id });

    if (keyword) {
      qb.andWhere(
        '(record.applicantName LIKE :kw OR record.content LIKE :kw OR record.templateName LIKE :kw OR CAST(record.recipients AS CHAR) LIKE :kw)',
        { kw: `%${keyword}%` }
      );
    }

    qb.orderBy('record.createdAt', 'DESC');
    qb.skip((Number(page) - 1) * Number(pageSize));
    qb.take(Number(pageSize));

    const [records, total] = await qb.getManyAndCount();

    // 统计
    const statsQb = recordRepo.createQueryBuilder('r');
    statsQb.andWhere('r.autoRuleId = :ruleId', { ruleId: id });
    const totalSent = await statsQb.clone()
      .andWhere('r.status = :s', { s: 'completed' }).getCount();
    const totalFailed = await statsQb.clone()
      .andWhere('r.status = :s', { s: 'failed' }).getCount();

    res.json({ success: true, data: { records, total, totalSent, totalFailed, page: Number(page), pageSize: Number(pageSize) } });
  } catch (error) {
    log.error('获取规则发送记录失败:', error);
    res.status(500).json({ success: false, message: '获取规则发送记录失败' });
  }
});

export default router;

