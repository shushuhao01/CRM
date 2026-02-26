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
exports.Order = void 0;
const typeorm_1 = require("typeorm");
const Customer_1 = require("./Customer");
const OrderItem_1 = require("./OrderItem");
const OrderStatusHistory_1 = require("./OrderStatusHistory");
const LogisticsTracking_1 = require("./LogisticsTracking");
let Order = class Order {
    setCreatedAt() {
        this.createdAt = new Date();
        this.updatedAt = new Date();
    }
    setUpdatedAt() {
        this.updatedAt = new Date();
    }
};
exports.Order = Order;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Order.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_number', length: 50, unique: true, comment: '订单号' }),
    __metadata("design:type", String)
], Order.prototype, "orderNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', type: 'varchar', length: 50, comment: '客户ID' }),
    __metadata("design:type", String)
], Order.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', length: 100, nullable: true, comment: '客户姓名' }),
    __metadata("design:type", String)
], Order.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', length: 20, nullable: true, comment: '客户电话' }),
    __metadata("design:type", String)
], Order.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_wechat', length: 100, nullable: true, comment: '客服微信号' }),
    __metadata("design:type", String)
], Order.prototype, "serviceWechat", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_source', length: 50, nullable: true, comment: '订单来源' }),
    __metadata("design:type", String)
], Order.prototype, "orderSource", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, comment: '商品列表' }),
    __metadata("design:type", Array)
], Order.prototype, "products", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        default: 'pending_transfer',
        comment: '订单状态'
    }),
    __metadata("design:type", String)
], Order.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, comment: '订单总金额' }),
    __metadata("design:type", Number)
], Order.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'discount_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '优惠金额' }),
    __metadata("design:type", Number)
], Order.prototype, "discountAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'final_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '实付金额' }),
    __metadata("design:type", Number)
], Order.prototype, "finalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deposit_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '定金金额' }),
    __metadata("design:type", Number)
], Order.prototype, "depositAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'deposit_screenshots', type: 'json', nullable: true, comment: '定金截图' }),
    __metadata("design:type", Array)
], Order.prototype, "depositScreenshots", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'payment_status',
        type: 'varchar',
        length: 50,
        default: 'unpaid',
        comment: '支付状态'
    }),
    __metadata("design:type", String)
], Order.prototype, "paymentStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'payment_method',
        type: 'varchar',
        length: 50,
        nullable: true,
        comment: '支付方式'
    }),
    __metadata("design:type", String)
], Order.prototype, "paymentMethod", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_method_other', type: 'varchar', length: 100, nullable: true, comment: '其他支付方式说明' }),
    __metadata("design:type", String)
], Order.prototype, "paymentMethodOther", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'payment_time', type: 'datetime', nullable: true, comment: '支付时间' }),
    __metadata("design:type", Date)
], Order.prototype, "paymentTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_name', length: 100, nullable: true, comment: '收货人姓名' }),
    __metadata("design:type", String)
], Order.prototype, "shippingName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_phone', length: 20, nullable: true, comment: '收货人电话' }),
    __metadata("design:type", String)
], Order.prototype, "shippingPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_address', type: 'text', nullable: true, comment: '收货地址' }),
    __metadata("design:type", String)
], Order.prototype, "shippingAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'express_company', length: 50, nullable: true, comment: '快递公司' }),
    __metadata("design:type", String)
], Order.prototype, "expressCompany", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tracking_number', length: 100, nullable: true, comment: '快递单号' }),
    __metadata("design:type", String)
], Order.prototype, "trackingNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipped_at', type: 'datetime', nullable: true, comment: '发货时间' }),
    __metadata("design:type", Date)
], Order.prototype, "shippedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shipping_time', type: 'varchar', length: 50, nullable: true, comment: '发货时间字符串' }),
    __metadata("design:type", String)
], Order.prototype, "shippingTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_delivery_date', type: 'varchar', length: 20, nullable: true, comment: '预计送达日期' }),
    __metadata("design:type", String)
], Order.prototype, "expectedDeliveryDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'delivered_at', type: 'datetime', nullable: true, comment: '签收时间' }),
    __metadata("design:type", Date)
], Order.prototype, "deliveredAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancelled_at', type: 'datetime', nullable: true, comment: '取消时间' }),
    __metadata("design:type", Date)
], Order.prototype, "cancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cancel_reason', type: 'text', nullable: true, comment: '取消原因' }),
    __metadata("design:type", String)
], Order.prototype, "cancelReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_amount', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '退款金额' }),
    __metadata("design:type", Number)
], Order.prototype, "refundAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_reason', type: 'text', nullable: true, comment: '退款原因' }),
    __metadata("design:type", String)
], Order.prototype, "refundReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'refund_time', type: 'datetime', nullable: true, comment: '退款时间' }),
    __metadata("design:type", Date)
], Order.prototype, "refundTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_type', length: 50, nullable: true, comment: '发票类型' }),
    __metadata("design:type", String)
], Order.prototype, "invoiceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_title', length: 200, nullable: true, comment: '发票抬头' }),
    __metadata("design:type", String)
], Order.prototype, "invoiceTitle", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'invoice_number', length: 100, nullable: true, comment: '发票号码' }),
    __metadata("design:type", String)
], Order.prototype, "invoiceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'mark_type', length: 20, default: 'normal', comment: '订单标记类型' }),
    __metadata("design:type", String)
], Order.prototype, "markType", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'logistics_status', length: 50, nullable: true, comment: '物流状态' }),
    __metadata("design:type", String)
], Order.prototype, "logisticsStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'latest_logistics_info', type: 'varchar', length: 500, nullable: true, comment: '最新物流动态' }),
    __metadata("design:type", String)
], Order.prototype, "latestLogisticsInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_todo', type: 'boolean', default: false, comment: '是否待办' }),
    __metadata("design:type", Boolean)
], Order.prototype, "isTodo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'todo_date', type: 'date', nullable: true, comment: '待办日期' }),
    __metadata("design:type", String)
], Order.prototype, "todoDate", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'todo_remark', type: 'text', nullable: true, comment: '待办备注' }),
    __metadata("design:type", String)
], Order.prototype, "todoRemark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_fields', type: 'json', nullable: true, comment: '自定义字段(旧版，保留兼容)' }),
    __metadata("design:type", Object)
], Order.prototype, "customFields", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field1', type: 'varchar', length: 500, nullable: true, comment: '自定义字段1' }),
    __metadata("design:type", String)
], Order.prototype, "customField1", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field2', type: 'varchar', length: 500, nullable: true, comment: '自定义字段2' }),
    __metadata("design:type", String)
], Order.prototype, "customField2", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field3', type: 'varchar', length: 500, nullable: true, comment: '自定义字段3' }),
    __metadata("design:type", String)
], Order.prototype, "customField3", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field4', type: 'varchar', length: 500, nullable: true, comment: '自定义字段4' }),
    __metadata("design:type", String)
], Order.prototype, "customField4", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field5', type: 'varchar', length: 500, nullable: true, comment: '自定义字段5' }),
    __metadata("design:type", String)
], Order.prototype, "customField5", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field6', type: 'varchar', length: 500, nullable: true, comment: '自定义字段6' }),
    __metadata("design:type", String)
], Order.prototype, "customField6", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'custom_field7', type: 'varchar', length: 500, nullable: true, comment: '自定义字段7' }),
    __metadata("design:type", String)
], Order.prototype, "customField7", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '订单备注' }),
    __metadata("design:type", String)
], Order.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performance_status', length: 20, default: 'pending', comment: '绩效状态: pending-待处理, valid-有效, invalid-无效' }),
    __metadata("design:type", String)
], Order.prototype, "performanceStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performance_coefficient', type: 'decimal', precision: 3, scale: 2, default: 1.00, comment: '绩效系数' }),
    __metadata("design:type", Number)
], Order.prototype, "performanceCoefficient", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performance_remark', length: 200, nullable: true, comment: '绩效备注' }),
    __metadata("design:type", String)
], Order.prototype, "performanceRemark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'estimated_commission', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '预估佣金' }),
    __metadata("design:type", Number)
], Order.prototype, "estimatedCommission", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performance_updated_at', type: 'datetime', nullable: true, comment: '绩效更新时间' }),
    __metadata("design:type", Date)
], Order.prototype, "performanceUpdatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'performance_updated_by', type: 'varchar', length: 50, nullable: true, comment: '绩效更新人ID' }),
    __metadata("design:type", String)
], Order.prototype, "performanceUpdatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '代收金额' }),
    __metadata("design:type", Number)
], Order.prototype, "codAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_status', type: 'varchar', length: 20, default: 'pending', comment: '代收状态: pending-未返款, returned-已返款, cancelled-已取消代收' }),
    __metadata("design:type", String)
], Order.prototype, "codStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_returned_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '已返款金额' }),
    __metadata("design:type", Number)
], Order.prototype, "codReturnedAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_returned_at', type: 'datetime', nullable: true, comment: '返款时间' }),
    __metadata("design:type", Date)
], Order.prototype, "codReturnedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_cancelled_at', type: 'datetime', nullable: true, comment: '取消代收时间' }),
    __metadata("design:type", Date)
], Order.prototype, "codCancelledAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cod_remark', type: 'varchar', length: 500, nullable: true, comment: '代收备注' }),
    __metadata("design:type", String)
], Order.prototype, "codRemark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_id', type: 'varchar', length: 50, nullable: true, comment: '操作员ID' }),
    __metadata("design:type", String)
], Order.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'operator_name', length: 50, nullable: true, comment: '操作员姓名' }),
    __metadata("design:type", String)
], Order.prototype, "operatorName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 50, nullable: true, comment: '创建人ID' }),
    __metadata("design:type", String)
], Order.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_name', length: 50, nullable: true, comment: '创建人姓名' }),
    __metadata("design:type", String)
], Order.prototype, "createdByName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_department_id', type: 'varchar', length: 50, nullable: true, comment: '创建人部门ID' }),
    __metadata("design:type", String)
], Order.prototype, "createdByDepartmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_department_name', length: 100, nullable: true, comment: '创建人部门名称' }),
    __metadata("design:type", String)
], Order.prototype, "createdByDepartmentName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_at', type: 'datetime', nullable: true, comment: '创建时间' }),
    __metadata("design:type", Date)
], Order.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_at', type: 'datetime', nullable: true, comment: '更新时间' }),
    __metadata("design:type", Date)
], Order.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Order.prototype, "setCreatedAt", null);
__decorate([
    (0, typeorm_1.BeforeUpdate)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], Order.prototype, "setUpdatedAt", null);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Customer_1.Customer, customer => customer.orders),
    (0, typeorm_1.JoinColumn)({ name: 'customer_id' }),
    __metadata("design:type", Customer_1.Customer)
], Order.prototype, "customer", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OrderItem_1.OrderItem, orderItem => orderItem.order),
    __metadata("design:type", Array)
], Order.prototype, "orderItems", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => OrderStatusHistory_1.OrderStatusHistory, history => history.order),
    __metadata("design:type", Array)
], Order.prototype, "statusHistory", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LogisticsTracking_1.LogisticsTracking, tracking => tracking.order),
    __metadata("design:type", Array)
], Order.prototype, "logisticsTracking", void 0);
exports.Order = Order = __decorate([
    (0, typeorm_1.Entity)('orders')
], Order);
//# sourceMappingURL=Order.js.map