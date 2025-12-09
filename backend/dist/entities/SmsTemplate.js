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
exports.SmsTemplate = void 0;
const typeorm_1 = require("typeorm");
let SmsTemplate = class SmsTemplate {
};
exports.SmsTemplate = SmsTemplate;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SmsTemplate.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100 }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "category", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true }),
    __metadata("design:type", Array)
], SmsTemplate.prototype, "variables", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "applicant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applicant_name', length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "applicantName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applicant_dept', length: 100, nullable: true }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "applicantDept", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'pending' }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsTemplate.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SmsTemplate.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'is_system', default: false }),
    __metadata("design:type", Boolean)
], SmsTemplate.prototype, "isSystem", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SmsTemplate.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], SmsTemplate.prototype, "updatedAt", void 0);
exports.SmsTemplate = SmsTemplate = __decorate([
    (0, typeorm_1.Entity)('sms_templates')
], SmsTemplate);
//# sourceMappingURL=SmsTemplate.js.map