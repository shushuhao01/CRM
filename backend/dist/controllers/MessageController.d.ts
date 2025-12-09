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
    getSubscriptionRules(req: Request, res: Response): Promise<void>;
    createSubscriptionRule(req: Request, res: Response): Promise<void>;
    updateSubscriptionRule(req: Request, res: Response): Promise<void>;
    deleteSubscriptionRule(req: Request, res: Response): Promise<void>;
    toggleSubscriptionRule(req: Request, res: Response): Promise<void>;
    getNotificationConfigs(req: Request, res: Response): Promise<void>;
    updateNotificationConfig(req: Request, res: Response): Promise<void>;
    testNotification(req: Request, res: Response): Promise<void>;
    getDepartmentsAndMembers(req: Request, res: Response): Promise<void>;
    getMessageStats(req: Request, res: Response): Promise<void>;
    getSystemMessages(req: Request, res: Response): Promise<void>;
    markMessageAsRead(req: Request, res: Response): Promise<void>;
    markAllMessagesAsRead(req: Request, res: Response): Promise<void>;
}
//# sourceMappingURL=MessageController.d.ts.map