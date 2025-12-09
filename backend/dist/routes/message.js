"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const MessageController_1 = require("../controllers/MessageController");
const router = (0, express_1.Router)();
const messageController = new MessageController_1.MessageController();
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
// 系统消息相关路由
/**
 * @route GET /api/v1/message/system-messages
 * @desc 获取系统消息列表
 * @access Private (Manager/Admin)
 */
router.get('/system-messages', messageController.getSystemMessages.bind(messageController));
/**
 * @route PUT /api/v1/message/system-messages/:id/read
 * @desc 标记消息为已读
 * @access Private (Manager/Admin)
 */
router.put('/system-messages/:id/read', messageController.markMessageAsRead.bind(messageController));
/**
 * @route PUT /api/v1/message/system-messages/read-all
 * @desc 标记所有消息为已读
 * @access Private (Manager/Admin)
 */
router.put('/system-messages/read-all', messageController.markAllMessagesAsRead.bind(messageController));
/**
 * @route GET /api/v1/message/stats
 * @desc 获取消息统计数据
 * @access Private (Manager/Admin)
 */
router.get('/stats', messageController.getMessageStats.bind(messageController));
exports.default = router;
//# sourceMappingURL=message.js.map