/**
 * Scheduler Routes - 定时任务管理路由
 */
import { Router } from 'express';
import { SchedulerController } from '../../controllers/admin/SchedulerController';

const router = Router();
const schedulerController = new SchedulerController();

// 获取所有任务状态
router.get('/tasks', schedulerController.getTasks.bind(schedulerController));

// 手动触发任务
router.post('/tasks/:taskName/trigger', schedulerController.triggerTask.bind(schedulerController));

// 获取任务执行历史
router.get('/tasks/:taskName/history', schedulerController.getTaskHistory.bind(schedulerController));

export default router;
