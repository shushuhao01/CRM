/**
 * 企微成员绑定路由
 * 管理企微成员与CRM用户的绑定关系
 */
import { Router, Request, Response } from 'express';
import { authenticateToken, requireAdmin } from '../../middleware/auth';
import { getTenantRepo } from '../../utils/tenantRepo';
import { WecomConfig } from '../../entities/WecomConfig';
import { WecomUserBinding } from '../../entities/WecomUserBinding';
import { log } from '../../config/logger';

const router = Router();

/**
 * 获取成员绑定列表
 */
router.get('/bindings', authenticateToken, async (req: Request, res: Response) => {
  try {
    const { configId, crmUserId } = req.query;
    const bindingRepo = getTenantRepo(WecomUserBinding);

    const where: any = {};
    if (configId) where.wecomConfigId = parseInt(configId as string);
    if (crmUserId) where.crmUserId = crmUserId;

    const bindings = await bindingRepo.find({ where, order: { createdAt: 'DESC' } });
    res.json({ success: true, data: bindings });
  } catch (error: any) {
    log.error('[Wecom] Get bindings error:', error);
    res.status(500).json({ success: false, message: '获取绑定列表失败' });
  }
});

/**
 * 创建成员绑定
 */
router.post('/bindings', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, wecomUserId, wecomUserName, wecomAvatar, wecomDepartmentIds,
            crmUserId, crmUserName } = req.body;

    if (!wecomConfigId || !wecomUserId || !crmUserId) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在' });
    }

    const bindingRepo = getTenantRepo(WecomUserBinding);
    const existing = await bindingRepo.findOne({ where: { wecomConfigId, wecomUserId } });
    if (existing) {
      return res.status(400).json({ success: false, message: '该企微成员已绑定' });
    }

    const currentUser = (req as any).currentUser;
    const binding = bindingRepo.create({
      wecomConfigId, corpId: config.corpId, wecomUserId, wecomUserName,
      wecomAvatar, wecomDepartmentIds, crmUserId, crmUserName,
      bindOperator: currentUser?.name || 'admin'
    });

    await bindingRepo.save(binding);
    res.json({ success: true, data: binding, message: '绑定成功' });
  } catch (error: any) {
    log.error('[Wecom] Create binding error:', error);
    res.status(500).json({ success: false, message: '创建绑定失败' });
  }
});

/**
 * 批量绑定企微成员
 */
router.post('/bindings/batch', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const { wecomConfigId, bindings: bindingPairs } = req.body;

    if (!wecomConfigId || !Array.isArray(bindingPairs) || bindingPairs.length === 0) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }

    const configRepo = getTenantRepo(WecomConfig);
    const config = await configRepo.findOne({ where: { id: wecomConfigId } });
    if (!config) {
      return res.status(404).json({ success: false, message: '企微配置不存在' });
    }

    const bindingRepo = getTenantRepo(WecomUserBinding);
    const currentUser = (req as any).currentUser;
    let successCount = 0;
    let skipCount = 0;
    const errors: string[] = [];

    for (const pair of bindingPairs) {
      try {
        if (!pair.wecomUserId || !pair.crmUserId) {
          errors.push(`缺少必要字段: ${pair.wecomUserId || '?'} -> ${pair.crmUserId || '?'}`);
          continue;
        }

        const existing = await bindingRepo.findOne({
          where: { wecomConfigId, wecomUserId: pair.wecomUserId }
        });
        if (existing) { skipCount++; continue; }

        const binding = bindingRepo.create({
          wecomConfigId, corpId: config.corpId,
          wecomUserId: pair.wecomUserId, wecomUserName: pair.wecomUserName || '',
          wecomAvatar: pair.wecomAvatar || '', crmUserId: pair.crmUserId,
          crmUserName: pair.crmUserName || '', bindOperator: currentUser?.name || 'admin'
        });
        await bindingRepo.save(binding);
        successCount++;
      } catch (e: any) {
        errors.push(`${pair.wecomUserId}: ${e.message}`);
      }
    }

    res.json({
      success: true,
      message: `批量绑定完成：成功 ${successCount} 个，跳过 ${skipCount} 个${errors.length > 0 ? `，失败 ${errors.length} 个` : ''}`,
      data: { successCount, skipCount, errorCount: errors.length, errors: errors.slice(0, 10) }
    });
  } catch (error: any) {
    log.error('[Wecom] Batch binding error:', error);
    res.status(500).json({ success: false, message: '批量绑定失败' });
  }
});

/**
 * 解除成员绑定
 */
router.delete('/bindings/:id', authenticateToken, requireAdmin, async (req: Request, res: Response) => {
  try {
    const bindingRepo = getTenantRepo(WecomUserBinding);
    const binding = await bindingRepo.findOne({ where: { id: parseInt(req.params.id) } });

    if (!binding) {
      return res.status(404).json({ success: false, message: '绑定不存在' });
    }

    await bindingRepo.remove(binding);
    res.json({ success: true, message: '解绑成功' });
  } catch (error: any) {
    log.error('[Wecom] Delete binding error:', error);
    res.status(500).json({ success: false, message: '解绑失败' });
  }
});

export default router;

