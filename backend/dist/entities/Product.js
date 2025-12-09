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
exports.Product = void 0;
const typeorm_1 = require("typeorm");
const ProductCategory_1 = require("./ProductCategory");
let Product = class Product {
};
exports.Product = Product;
__decorate([
    (0, typeorm_1.PrimaryColumn)({ type: 'varchar', length: 50, comment: '产品ID' }),
    __metadata("design:type", String)
], Product.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 50, unique: true, comment: '产品编码' }),
    __metadata("design:type", String)
], Product.prototype, "code", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 200, comment: '产品名称' }),
    __metadata("design:type", String)
], Product.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_id', type: 'varchar', length: 50, nullable: true, comment: '分类ID' }),
    __metadata("design:type", String)
], Product.prototype, "categoryId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'category_name', type: 'varchar', length: 100, nullable: true, comment: '分类名称' }),
    __metadata("design:type", String)
], Product.prototype, "categoryName", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '产品描述' }),
    __metadata("design:type", String)
], Product.prototype, "description", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 10, scale: 2, comment: '销售价格' }),
    __metadata("design:type", Number)
], Product.prototype, "price", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'cost_price', type: 'decimal', precision: 10, scale: 2, nullable: true, comment: '成本价格' }),
    __metadata("design:type", Number)
], Product.prototype, "costPrice", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', default: 0, comment: '库存数量' }),
    __metadata("design:type", Number)
], Product.prototype, "stock", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'min_stock', type: 'int', default: 0, comment: '最小库存' }),
    __metadata("design:type", Number)
], Product.prototype, "minStock", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'varchar', length: 20, default: '件', comment: '单位' }),
    __metadata("design:type", String)
], Product.prototype, "unit", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, comment: '规格参数' }),
    __metadata("design:type", Object)
], Product.prototype, "specifications", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, comment: '产品图片' }),
    __metadata("design:type", Array)
], Product.prototype, "images", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['active', 'inactive'],
        default: 'active',
        comment: '状态'
    }),
    __metadata("design:type", String)
], Product.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', type: 'varchar', length: 50, comment: '创建人' }),
    __metadata("design:type", String)
], Product.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '创建时间' }),
    __metadata("design:type", Date)
], Product.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '更新时间' }),
    __metadata("design:type", Date
    // 关联关系
    )
], Product.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.ManyToOne)(() => ProductCategory_1.ProductCategory, category => category.products),
    (0, typeorm_1.JoinColumn)({ name: 'category_id' }),
    __metadata("design:type", ProductCategory_1.ProductCategory)
], Product.prototype, "category", void 0);
exports.Product = Product = __decorate([
    (0, typeorm_1.Entity)('products')
], Product);
//# sourceMappingURL=Product.js.map