"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DepartmentSubscriptionConfig = exports.MessageSubscription = exports.NotificationMethod = exports.MessageType = void 0;
const typeorm_1 = require("typeorm");
const Department_1 = require("./Department");
// 消息类型枚举
var MessageType;
(function (MessageType) {
    MessageType["ORDER_CREATED"] = "order_created";
    MessageType["ORDER_SIGNED"] = "order_signed";
    MessageType["ORDER_AUDIT_REJECTED"] = "order_audit_rejected";
    MessageType["ORDER_AUDIT_APPROVED"] = "order_audit_approved";
    MessageType["CUSTOMER_CREATED"] = "customer_created";
    MessageType["CUSTOMER_UPDATED"] = "customer_updated";
    MessageType["PAYMENT_RECEIVED"] = "payment_received";
    MessageType["PAYMENT_OVERDUE"] = "payment_overdue";
    MessageType["TASK_ASSIGNED"] = "task_assigned";
    MessageType["TASK_COMPLETED"] = "task_completed";
    MessageType["SYSTEM_MAINTENANCE"] = "system_maintenance";
})(MessageType || (exports.MessageType = MessageType = {}));
// 通知方式枚举
var NotificationMethod;
(function (NotificationMethod) {
    NotificationMethod["DINGTALK"] = "dingtalk";
    NotificationMethod["WECHAT_WORK"] = "wechat_work";
    NotificationMethod["WECHAT_OFFICIAL"] = "wechat_official";
    NotificationMethod["EMAIL"] = "email";
    NotificationMethod["SYSTEM_MESSAGE"] = "system_message";
    NotificationMethod["ANNOUNCEMENT"] = "announcement";
})(NotificationMethod || (exports.NotificationMethod = NotificationMethod = {}));
let MessageSubscription = class MessageSubscription {
};
exports.MessageSubscription = MessageSubscription;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], MessageSubscription.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        comment: '消息类型'
    }),
    __metadata("design:type", String)
], MessageSubscription.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 100,
        comment: '消息名称'
    }),
    __metadata("design:type", String)
], MessageSubscription.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'text',
        nullable: true,
        comment: '消息描述'
    }),
    __metadata("design:type", String)
], MessageSubscription.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        comment: '消息分类'
    }),
    __metadata("design:type", String)
], MessageSubscription.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
        comment: '是否全局启用'
    }),
    __metadata("design:type", Boolean)
], MessageSubscription.prototype, "isGlobalEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'json',
        nullable: true,
        comment: '全局通知方式'
    }),
    __metadata("design:type", Array)
], MessageSubscription.prototype, "globalNotificationMethods", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        comment: '创建时间'
    }),
    __metadata("design:type", Date)
], MessageSubscription.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        comment: '更新时间'
    }),
    __metadata("design:type", Date)
], MessageSubscription.prototype, "updatedAt", void 0);
exports.MessageSubscription = MessageSubscription = __decorate([
    (0, typeorm_1.Entity)('message_subscriptions')
], MessageSubscription);
let DepartmentSubscriptionConfig = class DepartmentSubscriptionConfig {
};
exports.DepartmentSubscriptionConfig = DepartmentSubscriptionConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], DepartmentSubscriptionConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        comment: '消息类型'
    }),
    __metadata("design:type", String)
], DepartmentSubscriptionConfig.prototype, "messageType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'boolean',
        default: false,
        comment: '是否启用'
    }),
    __metadata("design:type", Boolean)
], DepartmentSubscriptionConfig.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'json',
        nullable: true,
        comment: '通知方式'
    }),
    __metadata("design:type", Array)
], DepartmentSubscriptionConfig.prototype, "notificationMethods", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Department_1.Department),
    (0, typeorm_1.JoinColumn)({ name: 'departmentId' }),
    __metadata("design:type", Department_1.Department)
], DepartmentSubscriptionConfig.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({
        comment: '创建时间'
    }),
    __metadata("design:type", Date)
], DepartmentSubscriptionConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({
        comment: '更新时间'
    }),
    __metadata("design:type", Date)
], DepartmentSubscriptionConfig.prototype, "updatedAt", void 0);
exports.DepartmentSubscriptionConfig = DepartmentSubscriptionConfig = __decorate([
    (0, typeorm_1.Entity)('department_subscription_configs')
], DepartmentSubscriptionConfig);
//# sourceMappingURL=MessageSubscription.js.map