/**
 * 防骚扰规则 API 路由
 * CRM本地规则管理。踢出成员可调用企微API，自动检测需会话存档。
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomAntiSpamRule } from '../../entities/WecomAntiSpamRule';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';

const router = Router();

router.get('/anti-spam-rules', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const list = await AppDataSource.getRepository(WecomAntiSpamRule).find({
      where: { tenantId } as any,
      order: { createdAt: 'DESC' }
    });
    res.json({ success: true, data: list });
  } catch (error: any) {
    log.error('[Wecom] Get anti-spam rules error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.post('/anti-spam-rules', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAntiSpamRule);
    const rule = repo.create({ ...req.body, tenantId });
    const saved = await repo.save(rule);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[Wecom] Create anti-spam rule error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.put('/anti-spam-rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomAntiSpamRule);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const rule = await repo.findOne({ where });
    if (!rule) return res.status(404).json({ success: false, message: '规则不存在' });
    Object.assign(rule, req.body);
    const saved = await repo.save(rule);
    res.json({ success: true, data: saved });
  } catch (error: any) {
    log.error('[Wecom] Update anti-spam rule error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.delete('/anti-spam-rules/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    await AppDataSource.getRepository(WecomAntiSpamRule).delete({
      id: Number(req.params.id),
      tenantId
    } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete anti-spam rule error:', error.message);
    res.status(500).json({ success: false, message: error.message });
  }
});

export default router;

