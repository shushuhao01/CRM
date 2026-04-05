/**
 * Admin Update Tasks Routes - 版本更新任务管理
 * 支持：触发更新、查看任务列表/详情、SSE实时日志、回滚
 */
import { Router, Request, Response } from 'express';
import { updateService } from '../../services/UpdateService';
import { log } from '../../config/logger';

const router = Router();

/**
 * 检查是否有可用更新
 * GET /update-tasks/check
 */
router.get('/check', async (_req: Request, res: Response) => {
  try {
    const result = await updateService.checkForUpdate();
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Update Tasks] Check update failed:', error);
    res.status(500).json({ success: false, message: '检查更新失败' });
  }
});

/**
 * 获取版本更新历史
 * GET /update-tasks/version-history
 */
router.get('/version-history', async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 20;
    const result = await updateService.getVersionHistory(page, pageSize);
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Update Tasks] Get version history failed:', error);
    res.status(500).json({ success: false, message: '获取版本历史失败' });
  }
});

/**
 * 获取更新任务列表
 * GET /update-tasks
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { page, pageSize, status } = req.query;
    const result = await updateService.getUpdateTasks({
      page: page ? parseInt(page as string) : 1,
      pageSize: pageSize ? parseInt(pageSize as string) : 20,
      status: status as string
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    log.error('[Update Tasks] Get list failed:', error);
    res.status(500).json({ success: false, message: '获取任务列表失败' });
  }
});

/**
 * 获取更新任务详情
 * GET /update-tasks/:id
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const task = await updateService.getUpdateTask(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: '任务不存在' });
    }
    res.json({ success: true, data: task });
  } catch (error: any) {
    log.error('[Update Tasks] Get detail failed:', error);
    res.status(500).json({ success: false, message: '获取任务详情失败' });
  }
});

/**
 * SSE 实时日志流
 * GET /update-tasks/:id/logs
 */
router.get('/:id/logs', async (req: Request, res: Response) => {
  const taskId = req.params.id;

  // 设置 SSE 响应头
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();

  // 先发送已有的日志
  const task = await updateService.getUpdateTask(taskId);
  if (task && task.logs) {
    try {
      const existingLogs = JSON.parse(task.logs);
      for (const entry of existingLogs) {
        res.write(`data: ${JSON.stringify({ ...entry, progress: task.progress })}\n\n`);
      }
    } catch {}
  }

  // 注册实时日志回调
  const callback = (entry: any) => {
    try {
      res.write(`data: ${JSON.stringify(entry)}\n\n`);
    } catch {}
  };

  updateService.registerLogCallback(taskId, callback);

  // 客户端断开时清理
  req.on('close', () => {
    updateService.removeLogCallback(taskId, callback);
  });
});

/**
 * 触发版本更新
 * POST /update-tasks/start
 * Body: { versionId: string }
 */
router.post('/start', async (req: Request, res: Response) => {
  try {
    const { versionId } = req.body;
    if (!versionId) {
      return res.status(400).json({ success: false, message: '请指定目标版本' });
    }

    const adminUser = (req as any).adminUser;
    const task = await updateService.startUpdate(versionId, adminUser?.adminId);

    res.json({
      success: true,
      data: task,
      message: '更新任务已启动，请关注进度'
    });
  } catch (error: any) {
    log.error('[Update Tasks] Start update failed:', error);
    res.status(400).json({ success: false, message: error.message || '启动更新失败' });
  }
});

/**
 * 回滚更新任务
 * POST /update-tasks/:id/rollback
 */
router.post('/:id/rollback', async (req: Request, res: Response) => {
  try {
    const taskId = req.params.id;
    await updateService.rollback(taskId);
    res.json({ success: true, message: '回滚完成' });
  } catch (error: any) {
    log.error('[Update Tasks] Rollback failed:', error);
    res.status(500).json({ success: false, message: error.message || '回滚失败' });
  }
});

export default router;

