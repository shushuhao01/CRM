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
exports.AfterSalesService = void 0;
const typeorm_1 = require("typeorm");
let AfterSalesService = class AfterSalesService {
};
exports.AfterSalesService = AfterSalesService;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 50 }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_number', length: 50, unique: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "serviceNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "orderId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_number', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "orderNumber", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', length: 20, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_type', length: 20, default: 'return' }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "serviceType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'pending' }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'normal' }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "priority", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "reason", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_name', length: 200, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "productName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'product_spec', length: 100, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "productSpec", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 1 }),
    __metadata("design:type", Number)
], AfterSalesService.prototype, "quantity", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, default: 0 }),
    __metadata("design:type", Number)
], AfterSalesService.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_name', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "contactName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_phone', length: 20, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_address', length: 500, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "contactAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "assignedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'assigned_to_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "assignedToId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], AfterSalesService.prototype, "attachments", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "createdById", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'department_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], AfterSalesService.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], AfterSalesService.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], AfterSalesService.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expected_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AfterSalesService.prototype, "expectedTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'resolved_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], AfterSalesService.prototype, "resolvedTime", void 0);
exports.AfterSalesService = AfterSalesService = __decorate([
    (0, typeorm_1.Entity)('after_sales_services')
], AfterSalesService);
//# sourceMappingURL=AfterSalesService.js.map