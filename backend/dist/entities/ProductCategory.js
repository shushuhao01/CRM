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
exports.ProductCategory = void 0;
const typeorm_1 = require("typeorm");
const Product_1 = require("./Product");
let ProductCategory = class ProductCategory {
};
exports.ProductCategory = ProductCategory;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50, comment: '分类ID' }),
    __metadata("design:type", String)
], ProductCategory.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '分类名称' }),
    __metadata("design:type", String)
], ProductCategory.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'parent_id', type: 'varchar', length: 50, nullable: true, comment: '上级分类ID' }),
    __metadata("design:type", String)
], ProductCategory.prototype, "parentId", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '分类描述' }),
    __metadata("design:type", String)
], ProductCategory.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sort_order', type: 'int', default: 0, comment: '排序' }),
    __metadata("design:type", Number)
], ProductCategory.prototype, "sortOrder", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'inactive'],
        default: 'active',
        comment: '状态'
    }),
    __metadata("design:type", String)
], ProductCategory.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '创建时间' }),
    __metadata("design:type", Date)
], ProductCategory.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '更新时间' }),
    __metadata("design:type", Date
    // 关联关系
    )
], ProductCategory.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Product_1.Product, product => product.category),
    __metadata("design:type", Array)
], ProductCategory.prototype, "products", void 0);
exports.ProductCategory = ProductCategory = __decorate([
    (0, typeorm_1.Entity)('product_categories')
], ProductCategory);
//# sourceMappingURL=ProductCategory.js.map