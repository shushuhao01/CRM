import { Request, Response } from 'express';
export declare class MessageController {
    getSubscriptions(req: Request, res: Response): Promise<void>;
    updateSubscription(req: Request, res: Response): Promise<void>;
    getDepartmentSubscriptions(req: Request, res: Response): Promise<void>;
    updateDepartmentSubscription(req: Request, res: Response): Promise<void>;
    batchUpdateDepartmentSubscriptions(req: Request, res: Response): Promise<void>;
    initializeDefaultSubscriptions(req: Request, res: Response): Promise<void>;
    getAnnouncements(req: Request, res: Response): Promise<void>;
    createAnnouncement(req: Request, res: Response): Promise<void>;
    updateAnnouncement(req: Request, res: Response): Promise<void>;
    deleteAnnouncement(req: Request, res: Response): Promise<void>;
    publishAnnouncement(req: Request, res: Response): Promise<void>;
    /**
     * 🔥 获取已发布的公告（供前端展示）
     */
    getPublishedAnnouncements(req: Request, res: Response): Promise<void>;
    /**
     * 🔥 标记公告为已读
     */
    markAnnouncementAsRead(req: Request, res: Response): Promise<void>;
    getSubscriptionRules(req: Request, res: Response): Promise<void>;
    createSubscriptionRule(req: Request, res: Response): Promise<void>;
    updateSubscriptionRule(req: Request, res: Response): Promise<void>;
    deleteSubscriptionRule(req: Request, res: Response): Promise<void>;
    toggleSubscriptionRule(req: Request, res: Response): Promise<void>;
    getNotificationConfigs(req: Request, res: Response): Promise<void>;
    updateNotificationConfig(req: Request, res: Response): Promise<void>;
    testNotification(req: Request, res: Response): Promise<void>;
    getDepartmentsAndMembers(req: Request, res: Response): Promise<void>;
    /**
     * 获取当前用户的系统消息
     */
    getSystemMessages(req: Request, res: Response): Promise<void>;
    /**
     * 发送系统消息（内部调用或API调用）
     */
    sendSystemMessage(req: Request, res: Response): Promise<void>;
    /**
     * 批量发送系统消息
     */
    sendBatchSystemMessages(req: Request, res: Response): Promise<void>;
    /**
     * 标记消息为已读
     */
    markMessageAsRead(req: Request, res: Response): Promise<void>;
    /**
     * 标记所有消息为已读
     */
    markAllMessagesAsRead(req: Request, res: Response): Promise<void>;
    /**
     * 获取消息统计
     */
    getMessageStats(req: Request, res: Response): Promise<void>;
    private getEmptyStats;
    /**
     * 🔥 删除单条消息
     */
    deleteMessage(req: Request, res: Response): Promise<void>;
    /**
     * 🔥 清空当前用户的所有消息
     */
    clearAllMessages(req: Request, res: Response): Promise<void>;
    /**
     * 🔥 清理过期消息（超过30天的消息）
     * 可以通过定时任务调用，或者管理员手动触发
     */
    cleanupExpiredMessages(req: Request, res: Response): Promise<void>;
    /**
     * 获取通知渠道配置列表
     */
    getNotificationChannels(_req: Request, res: Response): Promise<void>;
    /**
     * 创建通知渠道配置
     */
    createNotificationChannel(req: Request, res: Response): Promise<void>;
    /**
     * 更新通知渠道配置
     */
    updateNotificationChannel(req: Request, res: Response): Promise<void>;
    /**
     * 删除通知渠道配置
     */
    deleteNotificationChannel(req: Request, res: Response): Promise<void>;
    /**
     * 测试通知渠道 - 真实调用第三方API
     */
    testNotificationChannel(req: Request, res: Response): Promise<void>;
    /**
     * 发送钉钉消息
     */
    private sendDingtalkMessage;
    /**
     * 发送企业微信消息
     */
    private sendWechatWorkMessage;
    /**
     * 发送邮件 - 使用nodemailer
     */
    private sendEmailMessage;
    /**
     * 发送短信 - 阿里云短信服务
     */
    private sendSmsMessage;
    /**
     * 获取通知发送记录
     */
    getNotificationLogs(req: Request, res: Response): Promise<void>;
    /**
     * 获取可用的消息类型和渠道类型
     */
    getNotificationOptions(_req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=MessageController.d.ts.map