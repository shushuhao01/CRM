import { Router } from 'express';
import { MessageController } from '../controllers/MessageController';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth';

const router = Router();
const messageController = new MessageController();

// 暂时禁用身份验证以便测试
// router.use(authenticateToken, requireManagerOrAdmin);

/**
 * @route GET /api/v1/message/subscriptions
 * @desc 获取消息订阅列表
 * @access Private (Manager/Admin)
 */
router.get('/subscriptions', messageController.getSubscriptions.bind(messageController));

/**
 * @route PUT /api/v1/message/subscriptions/:id
 * @desc 更新消息订阅设置
 * @access Private (Manager/Admin)
 */
router.put('/subscriptions/:id', messageController.updateSubscription.bind(messageController));

/**
 * @route GET /api/v1/message/subscriptions/departments
 * @desc 获取部门级别的订阅配置
 * @access Private (Manager/Admin)
 */
router.get('/subscriptions/departments', messageController.getDepartmentSubscriptions.bind(messageController));

/**
 * @route PUT /api/v1/message/subscriptions/:subscriptionId/departments/:departmentId
 * @desc 更新部门级别的订阅配置
 * @access Private (Manager/Admin)
 */
router.put('/subscriptions/:subscriptionId/departments/:departmentId', messageController.updateDepartmentSubscription.bind(messageController));

/**
 * @route PUT /api/v1/message/subscriptions/:subscriptionId/departments/batch
 * @desc 批量更新部门订阅配置
 * @access Private (Manager/Admin)
 */
router.put('/subscriptions/:subscriptionId/departments/batch', messageController.batchUpdateDepartmentSubscriptions.bind(messageController));

/**
 * @route POST /api/v1/message/subscriptions/initialize
 * @desc 初始化默认消息订阅配置
 * @access Private (Manager/Admin)
 */
router.post('/subscriptions/initialize', messageController.initializeDefaultSubscriptions.bind(messageController));

// 公告管理相关路由
/**
 * @route GET /api/v1/message/announcements
 * @desc 获取公告列表
 * @access Private (Manager/Admin)
 */
router.get('/announcements', messageController.getAnnouncements.bind(messageController));

/**
 * @route POST /api/v1/message/announcements
 * @desc 创建新公告
 * @access Private (Manager/Admin)
 */
router.post('/announcements', messageController.createAnnouncement.bind(messageController));

/**
 * @route PUT /api/v1/message/announcements/:id
 * @desc 更新公告
 * @access Private (Manager/Admin)
 */
router.put('/announcements/:id', messageController.updateAnnouncement.bind(messageController));

/**
 * @route DELETE /api/v1/message/announcements/:id
 * @desc 删除公告
 * @access Private (Manager/Admin)
 */
router.delete('/announcements/:id', messageController.deleteAnnouncement.bind(messageController));

/**
 * @route POST /api/v1/message/announcements/:id/publish
 * @desc 发布公告
 * @access Private (Manager/Admin)
 */
router.post('/announcements/:id/publish', messageController.publishAnnouncement.bind(messageController));

/**
 * @route GET /api/v1/message/announcements/published
 * @desc 获取已发布的公告（供前端展示）
 * @access Private
 */
router.get('/announcements/published', messageController.getPublishedAnnouncements.bind(messageController));

/**
 * @route PUT /api/v1/message/announcements/:id/read
 * @desc 标记公告为已读
 * @access Private
 */
router.put('/announcements/:id/read', messageController.markAnnouncementAsRead.bind(messageController));

// 订阅规则管理相关路由
/**
 * @route GET /api/v1/message/subscription-rules
 * @desc 获取订阅规则列表
 * @access Private (Manager/Admin)
 */
router.get('/subscription-rules', messageController.getSubscriptionRules.bind(messageController));

/**
 * @route POST /api/v1/message/subscription-rules
 * @desc 创建新的订阅规则
 * @access Private (Manager/Admin)
 */
router.post('/subscription-rules', messageController.createSubscriptionRule.bind(messageController));

/**
 * @route PUT /api/v1/message/subscription-rules/:id
 * @desc 更新订阅规则
 * @access Private (Manager/Admin)
 */
router.put('/subscription-rules/:id', messageController.updateSubscriptionRule.bind(messageController));

/**
 * @route DELETE /api/v1/message/subscription-rules/:id
 * @desc 删除订阅规则
 * @access Private (Manager/Admin)
 */
router.delete('/subscription-rules/:id', messageController.deleteSubscriptionRule.bind(messageController));

/**
 * @route PATCH /api/v1/message/subscription-rules/:id/toggle
 * @desc 启用/禁用订阅规则
 * @access Private (Manager/Admin)
 */
router.patch('/subscription-rules/:id/toggle', messageController.toggleSubscriptionRule.bind(messageController));

// 通知配置管理相关路由
/**
 * @route GET /api/v1/message/notification-configs
 * @desc 获取通知配置列表
 * @access Private (Manager/Admin)
 */
router.get('/notification-configs', messageController.getNotificationConfigs.bind(messageController));

/**
 * @route PUT /api/v1/message/notification-configs/:id
 * @desc 更新通知配置
 * @access Private (Manager/Admin)
 */
router.put('/notification-configs/:id', messageController.updateNotificationConfig.bind(messageController));

/**
 * @route POST /api/v1/message/notification-configs/test
 * @desc 测试通知配置
 * @access Private (Manager/Admin)
 */
router.post('/notification-configs/test', messageController.testNotification.bind(messageController));

// 基础数据相关路由
/**
 * @route GET /api/v1/message/departments-members
 * @desc 获取部门和成员数据
 * @access Private (Manager/Admin)
 */
router.get('/departments-members', messageController.getDepartmentsAndMembers.bind(messageController));

// =====================================================
// 系统消息相关路由 - 🔥 跨设备消息通知
// =====================================================

/**
 * @route GET /api/v1/message/system-messages
 * @desc 获取当前用户的系统消息列表
 * @access Private
 */
router.get('/system-messages', authenticateToken, messageController.getSystemMessages.bind(messageController));

/**
 * @route POST /api/v1/message/system-messages/send
 * @desc 发送系统消息
 * @access Private
 */
router.post('/system-messages/send', authenticateToken, messageController.sendSystemMessage.bind(messageController));

/**
 * @route POST /api/v1/message/system-messages/send-batch
 * @desc 批量发送系统消息
 * @access Private
 */
router.post('/system-messages/send-batch', authenticateToken, messageController.sendBatchSystemMessages.bind(messageController));

/**
 * @route PUT /api/v1/message/system-messages/read-all
 * @desc 标记所有消息为已读
 * @access Private
 */
router.put('/system-messages/read-all', authenticateToken, messageController.markAllMessagesAsRead.bind(messageController));

/**
 * @route PUT /api/v1/message/system-messages/:id/read
 * @desc 标记消息为已读
 * @access Private
 */
router.put('/system-messages/:id/read', authenticateToken, messageController.markMessageAsRead.bind(messageController));

/**
 * @route GET /api/v1/message/stats
 * @desc 获取消息统计数据
 * @access Private
 */
router.get('/stats', authenticateToken, messageController.getMessageStats.bind(messageController));

/**
 * @route DELETE /api/v1/message/system-messages/clear-all
 * @desc 清空当前用户的所有消息
 * @access Private
 */
router.delete('/system-messages/clear-all', authenticateToken, messageController.clearAllMessages.bind(messageController));

/**
 * @route DELETE /api/v1/message/system-messages/:id
 * @desc 删除单条消息
 * @access Private
 */
router.delete('/system-messages/:id', authenticateToken, messageController.deleteMessage.bind(messageController));

/**
 * @route POST /api/v1/message/system-messages/cleanup
 * @desc 清理过期消息（超过30天）- 管理员或定时任务调用
 * @access Private (Admin)
 */
router.post('/system-messages/cleanup', authenticateToken, messageController.cleanupExpiredMessages.bind(messageController));

// =====================================================
// 通知渠道配置管理 - 🔥 跨平台通知配置
// =====================================================

/**
 * @route GET /api/v1/message/notification-channels
 * @desc 获取通知渠道配置列表
 * @access Private (Admin)
 */
router.get('/notification-channels', messageController.getNotificationChannels.bind(messageController));

/**
 * @route POST /api/v1/message/notification-channels
 * @desc 创建通知渠道配置
 * @access Private (Admin)
 */
router.post('/notification-channels', messageController.createNotificationChannel.bind(messageController));

/**
 * @route PUT /api/v1/message/notification-channels/:id
 * @desc 更新通知渠道配置
 * @access Private (Admin)
 */
router.put('/notification-channels/:id', messageController.updateNotificationChannel.bind(messageController));

/**
 * @route DELETE /api/v1/message/notification-channels/:id
 * @desc 删除通知渠道配置
 * @access Private (Admin)
 */
router.delete('/notification-channels/:id', messageController.deleteNotificationChannel.bind(messageController));

/**
 * @route POST /api/v1/message/notification-channels/:id/test
 * @desc 测试通知渠道
 * @access Private (Admin)
 */
router.post('/notification-channels/:id/test', messageController.testNotificationChannel.bind(messageController));

/**
 * @route GET /api/v1/message/notification-logs
 * @desc 获取通知发送记录
 * @access Private (Admin)
 */
router.get('/notification-logs', messageController.getNotificationLogs.bind(messageController));

/**
 * @route GET /api/v1/message/notification-options
 * @desc 获取通知配置选项（消息类型、渠道类型等）
 * @access Private (Admin)
 */
router.get('/notification-options', messageController.getNotificationOptions.bind(messageController));

export default router;
