/**
 * 自动匹配 API 路由
 * V4.0新增: 企微客户与CRM客户的自动匹配推荐
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomAutoMatchSuggestion } from '../../entities/WecomAutoMatchSuggestion';
import { WecomCustomer } from '../../entities/WecomCustomer';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { wecomAutoMatchService } from '../../services/WecomAutoMatchService';

const router = Router();

// 执行自动匹配
router.post('/customers/auto-match/run', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(400).json({ success: false, message: '租户信息缺失' });
    const { configId } = req.body;
    const result = await wecomAutoMatchService.runAutoMatch(tenantId, configId);
    res.json({ success: true, data: result, message: `发现 ${result.newPendingCount} 条新匹配` });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取待确认匹配列表
router.get('/customers/auto-match/pending', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const { page = 1, pageSize = 20 } = req.query;
    const repo = AppDataSource.getRepository(WecomAutoMatchSuggestion);

    const qb = repo.createQueryBuilder('s');
    qb.where('s.tenantId = :tenantId', { tenantId });
    qb.andWhere('s.status = :status', { status: 'pending' })
      .orderBy('s.createdAt', 'DESC')
      .skip((Number(page) - 1) * Number(pageSize))
      .take(Number(pageSize));

    const [list, total] = await qb.getManyAndCount();

    // TODO: 关联查询 wecomCustomer 和 crmCustomer 信息
    const pendingCount = await repo.count({ where: { tenantId, status: 'pending' } as any });

    res.json({ success: true, data: { list, total, pendingCount } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 获取待匹配数量（徽标用）
router.get('/customers/auto-match/count', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const count = await AppDataSource.getRepository(WecomAutoMatchSuggestion).count({
      where: { tenantId, status: 'pending' } as any
    });
    res.json({ success: true, data: { pendingCount: count } });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 确认匹配
router.post('/customers/auto-match/:id/confirm', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAutoMatchSuggestion);

    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const suggestion = await repo.findOne({ where });
    if (!suggestion) return res.status(404).json({ success: false, message: '匹配记录不存在' });

    suggestion.status = 'confirmed';
    suggestion.confirmedBy = (req as any).user?.username || 'system';
    suggestion.confirmedAt = new Date();
    await repo.save(suggestion);

    // 更新 WecomCustomer 的 crmCustomerId
    const customerRepo = AppDataSource.getRepository(WecomCustomer);
    await customerRepo.update(
      { id: suggestion.wecomCustomerId },
      { crmCustomerId: suggestion.crmCustomerId }
    );

    res.json({ success: true, message: '确认成功' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// 拒绝匹配
router.post('/customers/auto-match/:id/reject', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAutoMatchSuggestion);

    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const suggestion = await repo.findOne({ where });
    if (!suggestion) return res.status(404).json({ success: false, message: '匹配记录不存在' });

    suggestion.status = 'rejected';
    await repo.save(suggestion);

    res.json({ success: true, message: '已拒绝' });
  } catch (error: any) {
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;
