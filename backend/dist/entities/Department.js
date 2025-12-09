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
exports.Department = void 0;
const typeorm_1 = require("typeorm");
let Department = class Department {
};
exports.Department = Department;
__decorate([
    (0, typeorm_1.PrimaryColumn)('varchar', { length: 50 }),
    __metadata("design:type", String)
], Department.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 100 }),
    __metadata("design:type", String)
], Department.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 50, nullable: true }),
    __metadata("design:type", String)
], Department.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)('text', { nullable: true }),
    __metadata("design:type", String)
], Department.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'parent_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], Department.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { name: 'manager_id', length: 50, nullable: true }),
    __metadata("design:type", String)
], Department.prototype, "managerId", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { default: 1 }),
    __metadata("design:type", Number)
], Department.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'sort_order', default: 0 }),
    __metadata("design:type", Number)
], Department.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)('varchar', { length: 20, default: 'active' }),
    __metadata("design:type", String)
], Department.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)('int', { name: 'member_count', default: 0 }),
    __metadata("design:type", Number)
], Department.prototype, "memberCount", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at' }),
    __metadata("design:type", Date)
], Department.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at' }),
    __metadata("design:type", Date)
], Department.prototype, "updatedAt", void 0);
exports.Department = Department = __decorate([
    (0, typeorm_1.Entity)('departments')
], Department);
//# sourceMappingURL=Department.js.map