/**
 * AI质检 API 路由 - V4.0新增
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomAiInspectStrategy } from '../../entities/WecomAiInspectStrategy';
import { WecomAiInspectResult } from '../../entities/WecomAiInspectResult';
import { getCurrentTenantId } from '../../utils/tenantContext';

const router = Router();

// 策略 CRUD
router.get('/ai-inspect/strategies', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const list = await AppDataSource.getRepository(WecomAiInspectStrategy).find({ where: { tenantId } as any, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: list });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.post('/ai-inspect/strategies', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const strategy = AppDataSource.getRepository(WecomAiInspectStrategy).create({ ...req.body, tenantId });
    const saved = await AppDataSource.getRepository(WecomAiInspectStrategy).save(strategy);
    res.json({ success: true, data: saved });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.put('/ai-inspect/strategies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAiInspectStrategy);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const strategy = await repo.findOne({ where });
    if (!strategy) return res.status(404).json({ success: false, message: '策略不存在' });
    Object.assign(strategy, req.body);
    const saved = await repo.save(strategy);
    res.json({ success: true, data: saved });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.delete('/ai-inspect/strategies/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    await AppDataSource.getRepository(WecomAiInspectStrategy).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// 分析结果
router.get('/ai-inspect/results', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { page = 1, pageSize = 20, riskLevel } = req.query;
    const qb = AppDataSource.getRepository(WecomAiInspectResult).createQueryBuilder('r');
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    qb.where('r.tenantId = :tenantId', { tenantId });
    if (riskLevel) qb.andWhere('r.riskLevel = :riskLevel', { riskLevel });
    qb.orderBy('r.createdAt', 'DESC').skip((Number(page) - 1) * Number(pageSize)).take(Number(pageSize));
    const [list, total] = await qb.getManyAndCount();
    res.json({ success: true, data: { list, total } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

router.get('/ai-inspect/results/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const result = await AppDataSource.getRepository(WecomAiInspectResult).findOne({ where });
    if (!result) return res.status(404).json({ success: false, message: '结果不存在' });
    res.json({ success: true, data: result });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// 分析单个会话
router.post('/ai-inspect/analyze', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: 调用AI模型分析会话
    res.json({ success: true, data: { message: '分析任务已提交' } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// 批量分析
router.post('/ai-inspect/batch-analyze', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: 批量分析
    res.json({ success: true, data: { submitted: 0 } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

// 质检汇总
router.get('/ai-inspect/summary', authenticateToken, async (_req: Request, res: Response) => {
  try {
    // TODO: 质检汇总统计
    res.json({ success: true, data: { total: 0, passed: 0, failed: 0, avgScore: 0 } });
  } catch (error: any) { res.status(500).json({ success: false, message: error.message }); }
});

export default router;
