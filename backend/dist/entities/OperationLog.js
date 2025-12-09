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
exports.OperationLog = void 0;
const typeorm_1 = require("typeorm");
let OperationLog = class OperationLog {
};
exports.OperationLog = OperationLog;
__decorate([
    (0, typeorm_1.PrimaryColumn)('varchar', { length: 50 }),
    __metadata("design:type", String)
], OperationLog.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'user_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'user_name', length: 50, nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], OperationLog.prototype, "action", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], OperationLog.prototype, "module", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'resource_type', length: 50, nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "resourceType", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'resource_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "resourceId", void 0);
__decorate([
    (0, typeorm_1.Column)('text'),
    __metadata("design:type", String)
], OperationLog.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'ip_address', length: 45, nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "ipAddress", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { name: 'user_agent', nullable: true }),
    __metadata("design:type", String)
], OperationLog.prototype, "userAgent", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], OperationLog.prototype, "createdAt", void 0);
exports.OperationLog = OperationLog = __decorate([
    (0, typeorm_1.Entity)('operation_logs')
], OperationLog);
//# sourceMappingURL=OperationLog.js.map