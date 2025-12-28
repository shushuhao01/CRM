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
exports.Call = void 0;
const typeorm_1 = require("typeorm");
const uuid_1 = require("uuid");
let Call = class Call {
    // 生成ID
    static generateId() {
        return `call_${Date.now()}_${(0, uuid_1.v4)().substring(0, 8)}`;
    }
};
exports.Call = Call;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ length: 50 }),
    __metadata("design:type", String)
], Call.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_id', length: 100, nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "customerId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "customerName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_phone', length: 20 }),
    __metadata("design:type", String)
], Call.prototype, "customerPhone", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'call_type',
        type: 'enum',
        enum: ['outbound', 'inbound'],
        default: 'outbound'
    }),
    __metadata("design:type", String)
], Call.prototype, "callType", void 0);
__decorate([
    (0, typeorm_1.Column)({
        name: 'call_status',
        type: 'enum',
        enum: ['connected', 'missed', 'busy', 'failed', 'rejected'],
        default: 'connected'
    }),
    __metadata("design:type", String)
], Call.prototype, "callStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'start_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Call.prototype, "startTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'end_time', type: 'datetime', nullable: true }),
    __metadata("design:type", Date)
], Call.prototype, "endTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0 }),
    __metadata("design:type", Number)
], Call.prototype, "duration", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'recording_url', length: 500, nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "recordingUrl", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'has_recording', type: 'tinyint', default: 0 }),
    __metadata("design:type", Boolean)
], Call.prototype, "hasRecording", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "notes", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'follow_up_required', type: 'tinyint', default: 0 }),
    __metadata("design:type", Boolean)
], Call.prototype, "followUpRequired", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'call_tags', type: 'json', nullable: true }),
    __metadata("design:type", Array)
], Call.prototype, "callTags", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_id', length: 100 }),
    __metadata("design:type", String)
], Call.prototype, "userId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'user_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "userName", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true }),
    __metadata("design:type", String)
], Call.prototype, "department", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Call.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Call.prototype, "updatedAt", void 0);
exports.Call = Call = __decorate([
    (0, typeorm_1.Entity)('call_records')
], Call);
//# sourceMappingURL=Call.js.map