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
exports.CustomerShare = void 0;
const typeorm_1 = require("typeorm");
let CustomerShare = class CustomerShare {
};
exports.CustomerShare = CustomerShare;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], CustomerShare.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shared_by' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "sharedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shared_by_name' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "sharedByName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shared_to' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "sharedTo", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'shared_to_name' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "sharedToName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'time_limit', default: 0 }),
    __metadata("design:type", Number)
], CustomerShare.prototype, "timeLimit", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'expire_time', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CustomerShare.prototype, "expireTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ nullable: true }),
    __metadata("design:type", String)
], CustomerShare.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ default: 'active' }),
    __metadata("design:type", String)
], CustomerShare.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recall_time', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], CustomerShare.prototype, "recallTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recall_reason', nullable: true }),
    __metadata("design:type", String)
], CustomerShare.prototype, "recallReason", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'original_owner', nullable: true }),
    __metadata("design:type", String)
], CustomerShare.prototype, "originalOwner", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CustomerShare.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CustomerShare.prototype, "updatedAt", void 0);
exports.CustomerShare = CustomerShare = __decorate([
    (0, typeorm_1.Entity)('customer_shares')
], CustomerShare);
//# sourceMappingURL=CustomerShare.js.map