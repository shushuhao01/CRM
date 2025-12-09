import { Department } from './Department';
export declare enum MessageType {
    ORDER_CREATED = "order_created",
    ORDER_SIGNED = "order_signed",
    ORDER_AUDIT_REJECTED = "order_audit_rejected",
    ORDER_AUDIT_APPROVED = "order_audit_approved",
    CUSTOMER_CREATED = "customer_created",
    CUSTOMER_UPDATED = "customer_updated",
    PAYMENT_RECEIVED = "payment_received",
    PAYMENT_OVERDUE = "payment_overdue",
    TASK_ASSIGNED = "task_assigned",
    TASK_COMPLETED = "task_completed",
    SYSTEM_MAINTENANCE = "system_maintenance"
}
export declare enum NotificationMethod {
    DINGTALK = "dingtalk",
    WECHAT_WORK = "wechat_work",
    WECHAT_OFFICIAL = "wechat_official",
    EMAIL = "email",
    SYSTEM_MESSAGE = "system_message",
    ANNOUNCEMENT = "announcement"
}
export declare class MessageSubscription {
    id: string;
    messageType: MessageType;
    name: string;
    description: string;
    category: string;
    isGlobalEnabled: boolean;
    globalNotificationMethods: NotificationMethod[];
    createdAt: Date;
    updatedAt: Date;
}
export declare class DepartmentSubscriptionConfig {
    id: string;
    messageType: MessageType;
    isEnabled: boolean;
    notificationMethods: NotificationMethod[];
    department: Department;
    createdAt: Date;
    updatedAt: Date;
}
//# sourceMappingURL=MessageSubscription.d.ts.map