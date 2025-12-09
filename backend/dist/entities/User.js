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
exports.User = void 0;
const typeorm_1 = require("typeorm");
let User = class User {
    // 虚拟字段
    toJSON() {
        const { password: _password, ...result } = this;
        return result;
    }
};
exports.User = User;
__decorate([
    (0, typeorm_1.PrimaryColumn)('varchar', { length: 50 }),
    __metadata("design:type", String)
], User.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50, unique: true }),
    __metadata("design:type", String)
], User.prototype, "username", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 255 }),
    __metadata("design:type", String)
], User.prototype, "password", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], User.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'real_name', length: 50, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "realName", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 20, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 500, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "avatar", void 0);
__decorate([
    (0, typeorm_1.Column)('enum', { enum: ['male', 'female', 'unknown'], default: 'unknown', nullable: true }),
    __metadata("design:type", String)
], User.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "birthday", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'id_card', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "idCard", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50 }),
    __metadata("design:type", String)
], User.prototype, "role", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'role_id', length: 50 }),
    __metadata("design:type", String)
], User.prototype, "roleId", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'department_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "departmentId", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'department_name', length: 100, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "departmentName", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "position", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'employee_number', length: 50, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "employeeNumber", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { name: 'entry_date', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "entryDate", void 0);
__decorate([
    (0, typeorm_1.Column)('date', { name: 'leave_date', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "leaveDate", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "salary", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'bank_account', length: 255, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "bankAccount", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'emergency_contact', length: 50, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "emergencyContact", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'emergency_phone', length: 20, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "emergencyPhone", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], User.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 20, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "education", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 100, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "major", void 0);
__decorate([
    (0, typeorm_1.Column)('enum', { enum: ['active', 'inactive', 'resigned', 'locked'], default: 'active' }),
    __metadata("design:type", String)
], User.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('timestamp', { name: 'last_login_at', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lastLoginAt", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'login_count', default: 0, nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "loginCount", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'loginFailCount', default: 0, nullable: true }),
    __metadata("design:type", Number)
], User.prototype, "loginFailCount", void 0);
__decorate([
    (0, typeorm_1.Column)('datetime', { name: 'lockedAt', nullable: true }),
    __metadata("design:type", Date)
], User.prototype, "lockedAt", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'lastLoginIp', length: 45, nullable: true }),
    __metadata("design:type", String)
], User.prototype, "lastLoginIp", void 0);
__decorate([
    (0, typeorm_1.Column)('json', { nullable: true }),
    __metadata("design:type", Object)
], User.prototype, "settings", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], User.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], User.prototype, "updatedAt", void 0);
exports.User = User = __decorate([
    (0, typeorm_1.Entity)('users')
], User);
//# sourceMappingURL=User.js.map