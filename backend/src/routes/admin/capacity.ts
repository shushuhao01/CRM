/**
 * Admin 扩容管理路由
 * 管理扩容价格配置
 */
import { Router, Request, Response } from 'express';
import { capacityService } from '../../services/CapacityService';
import { log } from '../../config/logger';

const router = Router();

// 初始化表结构
capacityService.ensureTables().catch(() => {});

/**
 * GET /api/v1/admin/capacity/configs
 * 获取所有扩容价格配置
 */
router.get('/configs', async (req: Request, res: Response) => {
  try {
    const { type } = req.query;
    const configs = await capacityService.getPriceConfigs({ type: type as string });
    res.json({ success: true, data: configs });
  } catch (error) {
    log.error('获取扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '获取失败' });
  }
});

/**
 * POST /api/v1/admin/capacity/configs
 * 创建扩容价格配置
 */
router.post('/configs', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.savePriceConfig(req.body);
    res.json(result);
  } catch (error) {
    log.error('创建扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '创建失败' });
  }
});

/**
 * PUT /api/v1/admin/capacity/configs/:id
 * 更新扩容价格配置
 */
router.put('/configs/:id', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.savePriceConfig({ ...req.body, id: req.params.id });
    res.json(result);
  } catch (error) {
    log.error('更新扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '更新失败' });
  }
});

/**
 * DELETE /api/v1/admin/capacity/configs/:id
 * 删除扩容价格配置
 */
router.delete('/configs/:id', async (req: Request, res: Response) => {
  try {
    const result = await capacityService.deletePriceConfig(req.params.id);
    res.json(result);
  } catch (error) {
    log.error('删除扩容价格配置失败:', error);
    res.status(500).json({ success: false, message: '删除失败' });
  }
});

export default router;

