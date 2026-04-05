/**
 * Scheduler Controller - 定时任务管理控制器
 */
import { Request, Response } from 'express';
import { schedulerService } from '../../services/SchedulerService';

import { log } from '../../config/logger';
export class SchedulerController {
  /**
   * 获取所有任务状态
   */
  async getTasks(req: Request, res: Response) {
    try {
      const tasks = schedulerService.getTasksStatus();

      res.json({
        success: true,
        data: tasks
      });
    } catch (error: any) {
      log.error('[SchedulerController] 获取任务状态失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取任务状态失败'
      });
    }
  }

  /**
   * 手动触发任务
   */
  async triggerTask(req: Request, res: Response) {
    try {
      const { taskName } = req.params;

      if (!taskName) {
        return res.status(400).json({
          success: false,
          message: '任务名称不能为空'
        });
      }

      const result = await schedulerService.triggerTask(taskName);

      if (result) {
        res.json({
          success: true,
          message: '任务触发成功'
        });
      } else {
        res.status(404).json({
          success: false,
          message: '任务不存在'
        });
      }
    } catch (error: any) {
      log.error('[SchedulerController] 触发任务失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '触发任务失败'
      });
    }
  }

  /**
   * 获取任务执行历史
   */
  async getTaskHistory(req: Request, res: Response) {
    try {
      const { taskName } = req.params;

      // TODO: 实现任务执行历史查询
      // 可以从notification_logs表中查询相关记录

      res.json({
        success: true,
        data: [],
        message: '功能开发中'
      });
    } catch (error: any) {
      log.error('[SchedulerController] 获取任务历史失败:', error);
      res.status(500).json({
        success: false,
        message: error.message || '获取任务历史失败'
      });
    }
  }
}
