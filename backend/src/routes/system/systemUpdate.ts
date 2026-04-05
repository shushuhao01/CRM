/**
 * CRM 系统更新路由（面向CRM端私有部署用户）
 *
 * CRM前端通过此路由触发一键更新，无需管理后台token
 * 仅允许 CRM 管理员角色用户操作
 *
 * 路径前缀: /api/v1/system/update
 */
import { Router, Request, Response } from 'express';
import { updateService } from '../../services/UpdateService';
import { log } from '../../config/logger';

export function registerUpdateRoutes(router: Router) {
  /**
   * POST /system/update/start
   * 触发一键更新（私有部署CRM端用）
   * Body: { versionId: string }
   */
  router.post('/update/start', async (req: Request, res: Response) => {
    try {
      // 检查用户是否有管理员权限（CRM端 role 为 admin 或 owner）
      const user = (req as any).user;
      if (!user) {
        return res.status(401).json({ success: false, message: '未登录' });
      }

      if (!['admin', 'owner'].includes(user.role)) {
        return res.status(403).json({ success: false, message: '仅管理员可执行系统更新' });
      }

      const { versionId } = req.body;
      if (!versionId) {
        return res.status(400).json({ success: false, message: '请指定目标版本' });
      }

      const task = await updateService.startUpdate(versionId, user.id);

      res.json({
        success: true,
        data: task,
        message: '更新任务已启动，请关注进度'
      });
    } catch (error: any) {
      log.error('[System Update] Start update failed:', error);
      res.status(400).json({ success: false, message: error.message || '启动更新失败' });
    }
  });

  /**
   * GET /system/update/task/:id/logs
   * SSE 实时日志流（CRM端用）
   */
  router.get('/update/task/:id/logs', async (req: Request, res: Response) => {
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
}

