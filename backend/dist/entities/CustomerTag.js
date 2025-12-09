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
exports.CustomerTag = void 0;
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
let CustomerTag = class CustomerTag {
    generateId() {
        if (!this.id) {
            this.id = (0, uuid_1.v4)();
        }
    }
};
exports.CustomerTag = CustomerTag;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 50 }),
    __metadata("design:type", String)
], CustomerTag.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], CustomerTag.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true }),
    __metadata("design:type", String)
], CustomerTag.prototype, "color", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], CustomerTag.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_count', default: 0 }),
    __metadata("design:type", Number)
], CustomerTag.prototype, "customerCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], CustomerTag.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], CustomerTag.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.BeforeInsert)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CustomerTag.prototype, "generateId", null);
exports.CustomerTag = CustomerTag = __decorate([
    (0, typeorm_1.Entity)('customer_tags')
], CustomerTag);
//# sourceMappingURL=CustomerTag.js.map