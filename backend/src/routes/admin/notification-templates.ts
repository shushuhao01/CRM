/**
 * 通知模板管理路由
 */

import { Router } from 'express';
import { notificationTemplateController } from '../../controllers/admin/NotificationTemplateController';

const router = Router();

// 获取所有模板
router.get('/', notificationTemplateController.getAllTemplates.bind(notificationTemplateController));

// 获取单个模板
router.get('/:code', notificationTemplateController.getTemplate.bind(notificationTemplateController));

// 创建模板
router.post('/', notificationTemplateController.createTemplate.bind(notificationTemplateController));

// 更新模板
router.put('/:code', notificationTemplateController.updateTemplate.bind(notificationTemplateController));

// 删除模板
router.delete('/:code', notificationTemplateController.deleteTemplate.bind(notificationTemplateController));

// 测试模板
router.post('/:code/test', notificationTemplateController.testTemplate.bind(notificationTemplateController));

// 发送通知
router.post('/:code/send', notificationTemplateController.sendNotification.bind(notificationTemplateController));

export default router;
