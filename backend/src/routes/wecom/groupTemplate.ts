/**
 * 群模板 API 路由
 * V4.0新增
 */
import { Router, Request, Response } from 'express';
import { authenticateToken } from '../../middleware/auth';
import { AppDataSource } from '../../config/database';
import { WecomGroupTemplate } from '../../entities/WecomGroupTemplate';
import { getCurrentTenantId } from '../../utils/tenantContext';
import { log } from '../../config/logger';

const router = Router();

router.get('/group-templates', authenticateToken, async (_req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const list = await AppDataSource.getRepository(WecomGroupTemplate).find({ where: { tenantId } as any, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: list });
  } catch (error: any) { log.error('[GroupTemplate] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

router.post('/group-templates', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (req.body.maxMembers && req.body.maxMembers > 200) req.body.maxMembers = 200;
    const template = AppDataSource.getRepository(WecomGroupTemplate).create({ ...req.body, tenantId });
    const saved = await AppDataSource.getRepository(WecomGroupTemplate).save(template);
    res.json({ success: true, data: saved });
  } catch (error: any) { log.error('[GroupTemplate] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

router.put('/group-templates/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    const repo = AppDataSource.getRepository(WecomGroupTemplate);
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    const where: any = { id: Number(req.params.id), tenantId };
    const template = await repo.findOne({ where });
    if (!template) return res.status(404).json({ success: false, message: '群模板不存在' });
    if (req.body.maxMembers && req.body.maxMembers > 200) req.body.maxMembers = 200;
    Object.assign(template, req.body);
    const saved = await repo.save(template);
    res.json({ success: true, data: saved });
  } catch (error: any) { log.error('[GroupTemplate] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

router.delete('/group-templates/:id', authenticateToken, async (req: Request, res: Response) => {
  try {
    const tenantId = getCurrentTenantId();
    if (!tenantId) return res.status(403).json({ success: false, message: '租户上下文缺失' });
    await AppDataSource.getRepository(WecomGroupTemplate).delete({ id: Number(req.params.id), tenantId } as any);
    res.json({ success: true, message: '删除成功' });
  } catch (error: any) { log.error('[GroupTemplate] Error:', error.message); res.status(500).json({ success: false, message: '操作失败，请稍后重试' }); }
});

export default router;
