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
exports.SmsRecord = void 0;
const typeorm_1 = require("typeorm");
let SmsRecord = class SmsRecord {
};
exports.SmsRecord = SmsRecord;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SmsRecord.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "templateId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'template_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "templateName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text' }),
    __metadata("design:type", String)
], SmsRecord.prototype, "content", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json' }),
    __metadata("design:type", Array)
], SmsRecord.prototype, "recipients", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recipient_count', default: 0 }),
    __metadata("design:type", Number)
], SmsRecord.prototype, "recipientCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'success_count', default: 0 }),
    __metadata("design:type", Number)
], SmsRecord.prototype, "successCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fail_count', default: 0 }),
    __metadata("design:type", Number)
], SmsRecord.prototype, "failCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'pending' }),
    __metadata("design:type", String)
], SmsRecord.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'send_details', type: 'json', nullable: true }),
    __metadata("design:type", Object)
], SmsRecord.prototype, "sendDetails", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50 }),
    __metadata("design:type", String)
], SmsRecord.prototype, "applicant", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applicant_name', length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "applicantName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'applicant_dept', length: 100, nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "applicantDept", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_by', length: 50, nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "approvedBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'approved_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SmsRecord.prototype, "approvedAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sent_at', type: 'timestamp', nullable: true }),
    __metadata("design:type", Date)
], SmsRecord.prototype, "sentAt", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], SmsRecord.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], SmsRecord.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], SmsRecord.prototype, "updatedAt", void 0);
exports.SmsRecord = SmsRecord = __decorate([
    (0, typeorm_1.Entity)('sms_records')
], SmsRecord);
//# sourceMappingURL=SmsRecord.js.map