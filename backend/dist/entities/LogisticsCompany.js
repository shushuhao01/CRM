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
exports.LogisticsCompany = void 0;
const typeorm_1 = require("typeorm");
let LogisticsCompany = class LogisticsCompany {
};
exports.LogisticsCompany = LogisticsCompany;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100 }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'short_name', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "shortName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "logo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "website", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'tracking_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "trackingUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_url', type: 'varchar', length: 500, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "apiUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_key', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "apiKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'api_secret', type: 'varchar', length: 200, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "apiSecret", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_phone', type: 'varchar', length: 50, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "contactPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'contact_email', type: 'varchar', length: 100, nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "contactEmail", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'service_area', type: 'text', nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "serviceArea", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'price_info', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], LogisticsCompany.prototype, "priceInfo", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'enum', enum: ['active', 'inactive'], default: 'active' }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0 }),
    __metadata("design:type", Number)
], LogisticsCompany.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], LogisticsCompany.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], LogisticsCompany.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], LogisticsCompany.prototype, "updatedAt", void 0);
exports.LogisticsCompany = LogisticsCompany = __decorate([
    (0, typeorm_1.Entity)('logistics_companies')
], LogisticsCompany);
//# sourceMappingURL=LogisticsCompany.js.map