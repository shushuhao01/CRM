/**
 * 质检规则 + 质检记录路由
 * 包含：规则CRUD、质检执行、质检报告、人工复核
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomQualityRule } from '../../entities/WecomQualityRule';
import { WecomQualityInspection } from '../../entities/WecomQualityInspection';
import { WecomChatRecord } from '../../entities/WecomChatRecord';
import { log } from '../../config/logger';

const router = Router();

// ==================== 质检规则 CRUD ====================

/** 获取质检规则列表 */
router.get('/quality-rules', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityRule);
    const rules = await repo.find({ order: { createdAt: 'DESC' } });
    res.json({ success: true, data: rules });
  } catch (error: any) {
    log.error('[Wecom] Get quality rules error:', error.message);
    res.status(500).json({ success: false, message: '获取质检规则失败' });
  }
});

/** 获取单个质检规则 */
router.get('/quality-rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityRule);
    const rule = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!rule) return res.status(404).json({ success: false, message: '规则不存在' });
    res.json({ success: true, data: rule });
  } catch (error: any) {
    log.error('[Wecom] Get quality rule error:', error.message);
    res.status(500).json({ success: false, message: '获取质检规则失败' });
  }
});

/** 创建质检规则 */
router.post('/quality-rules', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { name, ruleType, conditions, scoreValue, applyScope, isEnabled } = req.body;
    if (!name || !ruleType) {
      return res.status(400).json({ success: false, message: '规则名称和类型为必填' });
    }
    if (!['response_time', 'msg_count', 'keyword', 'emotion'].includes(ruleType)) {
      return res.status(400).json({ success: false, message: '规则类型不合法，可选: response_time/msg_count/keyword/emotion' });
    }

    const repo = getTenantRepo(WecomQualityRule);
    const rule = repo.create({
      name,
      ruleType,
      conditions: typeof conditions === 'string' ? conditions : JSON.stringify(conditions || {}),
      scoreValue: scoreValue || 0,
      applyScope: typeof applyScope === 'string' ? applyScope : JSON.stringify(applyScope || {}),
      isEnabled: isEnabled !== false
    });
    const saved = await repo.save(rule);
    res.json({ success: true, message: '质检规则创建成功', data: saved });
  } catch (error: any) {
    log.error('[Wecom] Create quality rule error:', error.message);
    res.status(500).json({ success: false, message: '创建质检规则失败' });
  }
});

/** 更新质检规则 */
router.put('/quality-rules/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityRule);
    const rule = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!rule) return res.status(404).json({ success: false, message: '规则不存在' });

    const { name, ruleType, conditions, scoreValue, applyScope, isEnabled } = req.body;
    if (name !== undefined) rule.name = name;
    if (ruleType !== undefined) rule.ruleType = ruleType;
    if (conditions !== undefined) rule.conditions = typeof conditions === 'string' ? conditions : JSON.stringify(conditions);
    if (scoreValue !== undefined) rule.scoreValue = scoreValue;
    if (applyScope !== undefined) rule.applyScope = typeof applyScope === 'string' ? applyScope : JSON.stringify(applyScope);
    if (isEnabled !== undefined) rule.isEnabled = isEnabled;

    const saved = await repo.save(rule);
    res.json({ success: true, message: '质检规则更新成功', data: saved });
  } catch (error: any) {
    log.error('[Wecom] Update quality rule error:', error.message);
    res.status(500).json({ success: false, message: '更新质检规则失败' });
  }
});

/** 删除质检规则 */
router.delete('/quality-rules/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityRule);
    const rule = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!rule) return res.status(404).json({ success: false, message: '规则不存在' });
    await repo.remove(rule);
    res.json({ success: true, message: '质检规则已删除' });
  } catch (error: any) {
    log.error('[Wecom] Delete quality rule error:', error.message);
    res.status(500).json({ success: false, message: '删除质检规则失败' });
  }
});

// ==================== 质检记录 ====================

/** 获取质检记录列表 */
router.get('/quality-inspections', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, status, fromUserId, page = 1, pageSize = 20 } = req.query;
    const repo = getTenantRepo(WecomQualityInspection);
    const qb = repo.createQueryBuilder('qi');

    if (configId) qb.andWhere('qi.wecom_config_id = :configId', { configId: parseInt(configId as string) });
    if (status) qb.andWhere('qi.status = :status', { status });
    if (fromUserId) qb.andWhere('qi.from_user_id = :fromUserId', { fromUserId });

    const total = await qb.getCount();
    const list = await qb.orderBy('qi.created_at', 'DESC')
      .skip((parseInt(page as string) - 1) * parseInt(pageSize as string))
      .take(parseInt(pageSize as string))
      .getMany();

    res.json({ success: true, data: { list, total, page: parseInt(page as string), pageSize: parseInt(pageSize as string) } });
  } catch (error: any) {
    log.error('[Wecom] Get quality inspections error:', error.message);
    res.status(500).json({ success: false, message: '获取质检记录失败' });
  }
});

/** 执行质检(手动触发) */
router.post('/quality-inspections/run', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { configId, fromUserId, toUserId, startDate, endDate } = req.body;
    if (!configId) return res.status(400).json({ success: false, message: '请选择企微配置' });

    const ruleRepo = getTenantRepo(WecomQualityRule);
    const rules = await ruleRepo.find({ where: { isEnabled: true } });
    if (rules.length === 0) {
      return res.json({ success: true, message: '暂无启用的质检规则', data: { inspected: 0, created: 0 } });
    }

    // 查找待质检的会话记录
    const recordRepo = getTenantRepo(WecomChatRecord);
    const qb = recordRepo.createQueryBuilder('r')
      .where('r.wecom_config_id = :configId', { configId: parseInt(configId) });
    if (fromUserId) qb.andWhere('r.from_user_id = :fromUserId', { fromUserId });
    if (toUserId) qb.andWhere('r.to_user_ids LIKE :toUserId', { toUserId: `%${toUserId}%` });
    if (startDate) qb.andWhere('r.msg_time >= :startTs', { startTs: new Date(startDate).getTime() });
    if (endDate) qb.andWhere('r.msg_time < :endTs', { endTs: new Date(endDate).getTime() + 86400000 });

    const records = await qb.orderBy('r.msg_time', 'DESC').take(1000).getMany();

    // 按发送者分组进行质检
    const sessionMap = new Map<string, typeof records>();
    for (const r of records) {
      const key = r.fromUserId || 'unknown';
      if (!sessionMap.has(key)) sessionMap.set(key, []);
      sessionMap.get(key)!.push(r);
    }

    const inspectionRepo = getTenantRepo(WecomQualityInspection);
    let createdCount = 0;

    for (const [userId, userRecords] of sessionMap) {
      let totalScore = 100;
      const violations: string[] = [];

      for (const rule of rules) {
        let condObj: any = {};
        try { condObj = JSON.parse(rule.conditions || '{}'); } catch { /* skip */ }

        if (rule.ruleType === 'keyword') {
          const keywords: string[] = condObj.keywords || [];
          for (const r of userRecords) {
            const content = r.content || '';
            if (keywords.some(kw => content.includes(kw))) {
              totalScore += rule.scoreValue;
              violations.push(`关键词命中: ${rule.name}`);
              break;
            }
          }
        } else if (rule.ruleType === 'msg_count') {
          const minCount = condObj.minCount || 0;
          if (userRecords.length < minCount) {
            totalScore += rule.scoreValue;
            violations.push(`消息数不足: ${rule.name}`);
          }
        } else if (rule.ruleType === 'response_time') {
          // 简化: 检查是否有超长间隔
          const maxMinutes = condObj.maxResponseMinutes || 30;
          for (let i = 1; i < userRecords.length; i++) {
            const gap = Math.abs(Number(userRecords[i].msgTime) - Number(userRecords[i - 1].msgTime));
            if (gap > maxMinutes * 60 * 1000) {
              totalScore += rule.scoreValue;
              violations.push(`响应超时: ${rule.name}`);
              break;
            }
          }
        }
        // emotion 类型预留
      }

      totalScore = Math.max(0, Math.min(100, totalScore));
      const status = violations.length > 0 ? 'violation' : (totalScore >= 90 ? 'excellent' : 'normal');

      const inspection = inspectionRepo.create({
        wecomConfigId: parseInt(configId),
        sessionKey: `${userId}_${Date.now()}`,
        fromUserId: userId,
        fromUserName: userRecords[0]?.fromUserName || userId,
        toUserId: '',
        toUserName: '',
        messageCount: userRecords.length,
        startTime: userRecords.length > 0 ? new Date(Number(userRecords[userRecords.length - 1].msgTime)) : new Date(),
        endTime: userRecords.length > 0 ? new Date(Number(userRecords[0].msgTime)) : new Date(),
        status,
        violationType: violations.length > 0 ? JSON.stringify(violations) : null,
        score: totalScore,
        remark: violations.length > 0 ? violations.join('; ') : '质检通过'
      } as any);
      await inspectionRepo.save(inspection);
      createdCount++;
    }

    res.json({
      success: true,
      message: `质检完成：检查 ${records.length} 条消息，${sessionMap.size} 个会话，生成 ${createdCount} 条质检记录`,
      data: { inspected: records.length, sessions: sessionMap.size, created: createdCount }
    });
  } catch (error: any) {
    log.error('[Wecom] Run quality inspection error:', error.message, error.stack);
    res.status(500).json({ success: false, message: '执行质检失败' });
  }
});

/** 人工复核(更新质检记录状态) */
router.put('/quality-inspections/:id/review', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityInspection);
    const inspection = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!inspection) return res.status(404).json({ success: false, message: '质检记录不存在' });

    const { status, score, remark } = req.body;
    const currentUser = (req as any).currentUser;

    if (status) inspection.status = status;
    if (score !== undefined) inspection.score = score;
    if (remark !== undefined) inspection.remark = remark;
    inspection.inspectorId = currentUser?.id || '';
    inspection.inspectorName = currentUser?.name || 'admin';
    inspection.inspectedAt = new Date();

    await repo.save(inspection);
    res.json({ success: true, message: '质检复核完成', data: inspection });
  } catch (error: any) {
    log.error('[Wecom] Review quality inspection error:', error.message);
    res.status(500).json({ success: false, message: '质检复核失败' });
  }
});

/** 删除质检记录 */
router.delete('/quality-inspections/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const repo = getTenantRepo(WecomQualityInspection);
    const inspection = await repo.findOne({ where: { id: parseInt(req.params.id) } });
    if (!inspection) return res.status(404).json({ success: false, message: '质检记录不存在' });
    await repo.remove(inspection);
    res.json({ success: true, message: '质检记录已删除' });
  } catch (error: any) {
    log.error('[Wecom] Delete quality inspection error:', error.message);
    res.status(500).json({ success: false, message: '删除质检记录失败' });
  }
});

/** 质检统计 */
router.get('/quality-inspections/stats', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId } = req.query;
    const repo = getTenantRepo(WecomQualityInspection);
    const qb = repo.createQueryBuilder('qi');
    if (configId) qb.andWhere('qi.wecom_config_id = :configId', { configId: parseInt(configId as string) });

    const total = await qb.getCount();
    const pending = await qb.clone().andWhere('qi.status = :s', { s: 'pending' }).getCount();
    const normal = await qb.clone().andWhere('qi.status = :s', { s: 'normal' }).getCount();
    const excellent = await qb.clone().andWhere('qi.status = :s', { s: 'excellent' }).getCount();
    const violation = await qb.clone().andWhere('qi.status = :s', { s: 'violation' }).getCount();

    const avgResult = await qb.clone().select('AVG(qi.score)', 'avgScore').getRawOne();
    const avgScore = avgResult?.avgScore ? parseFloat(parseFloat(avgResult.avgScore).toFixed(1)) : 0;

    res.json({
      success: true,
      data: { total, pending, normal, excellent, violation, avgScore }
    });
  } catch (error: any) {
    log.error('[Wecom] Get quality inspection stats error:', error.message);
    res.status(500).json({ success: false, message: '获取质检统计失败' });
  }
});

export default router;

