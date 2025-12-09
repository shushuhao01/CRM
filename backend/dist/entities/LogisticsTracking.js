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
exports.LogisticsTracking = exports.LogisticsStatus = void 0;
const typeorm_1 = require("typeorm");
const Order_1 = require("./Order");
const LogisticsTrace_1 = require("./LogisticsTrace");
var LogisticsStatus;
(function (LogisticsStatus) {
    LogisticsStatus["PENDING"] = "pending";
    LogisticsStatus["PICKED_UP"] = "picked_up";
    LogisticsStatus["IN_TRANSIT"] = "in_transit";
    LogisticsStatus["OUT_FOR_DELIVERY"] = "out_for_delivery";
    LogisticsStatus["DELIVERED"] = "delivered";
    LogisticsStatus["EXCEPTION"] = "exception";
    LogisticsStatus["REJECTED"] = "rejected";
    LogisticsStatus["RETURNED"] = "returned"; // 退回
})(LogisticsStatus || (exports.LogisticsStatus = LogisticsStatus = {}));
let LogisticsTracking = class LogisticsTracking {
};
exports.LogisticsTracking = LogisticsTracking;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], LogisticsTracking.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, comment: '订单ID' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '物流单号' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "trackingNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, comment: '物流公司代码' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "companyCode", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '物流公司名称' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "companyName", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        default: LogisticsStatus.PENDING,
        comment: '物流状态'
    }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true, comment: '当前位置' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "currentLocation", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '状态描述' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "statusDescription", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true, comment: '最后更新时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "lastUpdateTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true, comment: '预计送达时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "estimatedDeliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true, comment: '实际送达时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "actualDeliveryTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '签收人' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "signedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, comment: '扩展信息' }),
    __metadata("design:type", Object)
], LogisticsTracking.prototype, "extraInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, comment: '是否启用自动同步' }),
    __metadata("design:type", Boolean)
], LogisticsTracking.prototype, "autoSyncEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'datetime', nullable: true, comment: '下次同步时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "nextSyncTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, comment: '同步失败次数' }),
    __metadata("design:type", Number)
], LogisticsTracking.prototype, "syncFailureCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '最后同步错误信息' }),
    __metadata("design:type", String)
], LogisticsTracking.prototype, "lastSyncError", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '创建时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '更新时间' }),
    __metadata("design:type", Date)
], LogisticsTracking.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => Order_1.Order, order => order.logisticsTracking),
    (0, typeorm_1.JoinColumn)({ name: 'orderId' }),
    __metadata("design:type", Order_1.Order)
], LogisticsTracking.prototype, "order", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => LogisticsTrace_1.LogisticsTrace, trace => trace.logisticsTracking),
    __metadata("design:type", Array)
], LogisticsTracking.prototype, "traces", void 0);
exports.LogisticsTracking = LogisticsTracking = __decorate([
    (0, typeorm_1.Entity)('logistics_tracking')
], LogisticsTracking);
//# sourceMappingURL=LogisticsTracking.js.map