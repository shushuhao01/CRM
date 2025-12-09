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
exports.PaymentMethodOption = void 0;
const typeorm_1 = require("typeorm");
let PaymentMethodOption = class PaymentMethodOption {
};
exports.PaymentMethodOption = PaymentMethodOption;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50 }),
    __metadata("design:type", String)
], PaymentMethodOption.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 100, comment: '显示名称' }),
    __metadata("design:type", String)
], PaymentMethodOption.prototype, "label", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true, comment: '选项值' }),
    __metadata("design:type", String)
], PaymentMethodOption.prototype, "value", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0, comment: '排序顺序' }),
    __metadata("design:type", Number)
], PaymentMethodOption.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_enabled', type: 'tinyint', default: 1, comment: '是否启用' }),
    __metadata("design:type", Boolean)
], PaymentMethodOption.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '创建时间' }),
    __metadata("design:type", Date)
], PaymentMethodOption.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '更新时间' }),
    __metadata("design:type", Date)
], PaymentMethodOption.prototype, "updatedAt", void 0);
exports.PaymentMethodOption = PaymentMethodOption = __decorate([
    (0, typeorm_1.Entity)('payment_method_options')
], PaymentMethodOption);
//# sourceMappingURL=PaymentMethodOption.js.map