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
exports.DepartmentOrderLimit = void 0;
const typeorm_1 = require("typeorm");
let DepartmentOrderLimit = class DepartmentOrderLimit {
};
exports.DepartmentOrderLimit = DepartmentOrderLimit;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'department_id', type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'department_name', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "departmentName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_count_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DepartmentOrderLimit.prototype, "orderCountEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_order_count', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], DepartmentOrderLimit.prototype, "maxOrderCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'single_amount_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DepartmentOrderLimit.prototype, "singleAmountEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_single_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DepartmentOrderLimit.prototype, "maxSingleAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount_enabled', type: 'boolean', default: false }),
    __metadata("design:type", Boolean)
], DepartmentOrderLimit.prototype, "totalAmountEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'max_total_amount', type: 'decimal', precision: 12, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], DepartmentOrderLimit.prototype, "maxTotalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_enabled', type: 'boolean', default: true }),
    __metadata("design:type", Boolean)
], DepartmentOrderLimit.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_name', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "createdByName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "updatedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'updated_by_name', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], DepartmentOrderLimit.prototype, "updatedByName", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], DepartmentOrderLimit.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], DepartmentOrderLimit.prototype, "updatedAt", void 0);
exports.DepartmentOrderLimit = DepartmentOrderLimit = __decorate([
    (0, typeorm_1.Entity)('department_order_limits')
], DepartmentOrderLimit);
//# sourceMappingURL=DepartmentOrderLimit.js.map