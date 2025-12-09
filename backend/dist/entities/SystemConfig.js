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
exports.SystemConfig = void 0;
const typeorm_1 = require("typeorm");
let SystemConfig = class SystemConfig {
    // 获取解析后的值
    getParsedValue() {
        try {
            switch (this.valueType) {
                case 'number':
                    return Number(this.configValue);
                case 'boolean':
                    return this.configValue === 'true';
                case 'json':
                    return JSON.parse(this.configValue);
                default:
                    return this.configValue;
            }
        }
        catch (error) {
            return this.configValue;
        }
    }
    // 设置值（自动转换为字符串）
    setParsedValue(value) {
        if (this.valueType === 'json') {
            this.configValue = JSON.stringify(value);
        }
        else {
            this.configValue = String(value);
        }
    }
};
exports.SystemConfig = SystemConfig;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)(),
    __metadata("design:type", Number)
], SystemConfig.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '配置键名' }),
    __metadata("design:type", String)
], SystemConfig.prototype, "configKey", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', comment: '配置值' }),
    __metadata("design:type", String)
], SystemConfig.prototype, "configValue", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'varchar',
        length: 50,
        default: 'string',
        comment: '值类型'
    }),
    __metadata("design:type", String)
], SystemConfig.prototype, "valueType", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '配置分组' }),
    __metadata("design:type", String)
], SystemConfig.prototype, "configGroup", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true, comment: '配置描述' }),
    __metadata("design:type", String)
], SystemConfig.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: true, comment: '是否启用' }),
    __metadata("design:type", Boolean)
], SystemConfig.prototype, "isEnabled", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'boolean', default: false, comment: '是否为系统配置（不可删除）' }),
    __metadata("design:type", Boolean)
], SystemConfig.prototype, "isSystem", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, comment: '排序权重' }),
    __metadata("design:type", Number)
], SystemConfig.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ comment: '创建时间' }),
    __metadata("design:type", Date)
], SystemConfig.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ comment: '更新时间' }),
    __metadata("design:type", Date)
], SystemConfig.prototype, "updatedAt", void 0);
exports.SystemConfig = SystemConfig = __decorate([
    (0, typeorm_1.Entity)('system_configs')
], SystemConfig);
//# sourceMappingURL=SystemConfig.js.map