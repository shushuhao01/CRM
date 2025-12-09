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
exports.OrderStatusHistory = void 0;
const typeorm_1 = require("typeorm");
const Order_1 = require("./Order");
let OrderStatusHistory = class OrderStatusHistory {
};
exports.OrderStatusHistory = OrderStatusHistory;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], OrderStatusHistory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, comment: '订单ID' }),
    __metadata("design:type", String)
], OrderStatusHistory.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        comment: '状态'
    }),
    __metadata("design:type", String)
], OrderStatusHistory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '状态变更备注' }),
    __metadata("design:type", String)
], OrderStatusHistory.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, comment: '操作人ID' }),
    __metadata("design:type", Number)
], OrderStatusHistory.prototype, "operatorId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '操作人姓名' }),
    __metadata("design:type", String)
], OrderStatusHistory.prototype, "operatorName", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '创建时间' }),
    __metadata("design:type", Date)
], OrderStatusHistory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order, order => order.statusHistory),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", Order_1.Order)
], OrderStatusHistory.prototype, "order", void 0);
exports.OrderStatusHistory = OrderStatusHistory = __decorate([
    (0, typeorm_1.Entity)('order_status_history')
], OrderStatusHistory);
//# sourceMappingURL=OrderStatusHistory.js.map