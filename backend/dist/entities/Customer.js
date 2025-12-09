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
exports.Customer = void 0;
const typeorm_1 = require("typeorm");
const Order_1 = require("./Order");
let Customer = class Customer {
};
exports.Customer = Customer;
__decorate([
    (0, typeorm_1.PrimaryGeneratedColumn)('uuid'),
    __metadata("design:type", String)
], Customer.prototype, "id", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'customer_code', length: 50, nullable: true, comment: '客户编号' }),
    __metadata("design:type", String)
], Customer.prototype, "customerNo", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, comment: '客户姓名' }),
    __metadata("design:type", String)
], Customer.prototype, "name", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, nullable: true, comment: '手机号' }),
    __metadata("design:type", String)
], Customer.prototype, "phone", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '微信号' }),
    __metadata("design:type", String)
], Customer.prototype, "wechat", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: 'QQ号' }),
    __metadata("design:type", String)
], Customer.prototype, "qq", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '邮箱' }),
    __metadata("design:type", String)
], Customer.prototype, "email", void 0);
__decorate([
    (0, typeorm_1.Column)({
        type: 'enum',
        enum: ['male', 'female', 'unknown'],
        default: 'unknown',
        comment: '性别'
    }),
    __metadata("design:type", String)
], Customer.prototype, "gender", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'int', nullable: true, comment: '年龄' }),
    __metadata("design:type", Number)
], Customer.prototype, "age", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'date', nullable: true, comment: '生日' }),
    __metadata("design:type", Date)
], Customer.prototype, "birthday", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'id_card', length: 255, nullable: true, comment: '身份证号' }),
    __metadata("design:type", String)
], Customer.prototype, "idCard", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '身高(cm)' }),
    __metadata("design:type", Number)
], Customer.prototype, "height", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'decimal', precision: 5, scale: 1, nullable: true, comment: '体重(kg)' }),
    __metadata("design:type", Number)
], Customer.prototype, "weight", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '完整地址' }),
    __metadata("design:type", String)
], Customer.prototype, "address", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '省份' }),
    __metadata("design:type", String)
], Customer.prototype, "province", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '城市' }),
    __metadata("design:type", String)
], Customer.prototype, "city", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '区县' }),
    __metadata("design:type", String)
], Customer.prototype, "district", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '街道' }),
    __metadata("design:type", String)
], Customer.prototype, "street", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'detail_address', length: 200, nullable: true, comment: '详细地址' }),
    __metadata("design:type", String)
], Customer.prototype, "detailAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'overseas_address', length: 500, nullable: true, comment: '境外地址' }),
    __metadata("design:type", String)
], Customer.prototype, "overseasAddress", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 200, nullable: true, comment: '公司名称' }),
    __metadata("design:type", String)
], Customer.prototype, "company", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 100, nullable: true, comment: '行业' }),
    __metadata("design:type", String)
], Customer.prototype, "industry", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 50, nullable: true, comment: '客户来源' }),
    __metadata("design:type", String)
], Customer.prototype, "source", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'normal', comment: '客户等级' }),
    __metadata("design:type", String)
], Customer.prototype, "level", void 0);
__decorate([
    (0, typeorm_1.Column)({ length: 20, default: 'active', comment: '状态' }),
    __metadata("design:type", String)
], Customer.prototype, "status", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'follow_status', length: 20, nullable: true, comment: '跟进状态' }),
    __metadata("design:type", String)
], Customer.prototype, "followStatus", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'json', nullable: true, comment: '标签' }),
    __metadata("design:type", Array)
], Customer.prototype, "tags", void 0);
__decorate([
    (0, typeorm_1.Column)({ type: 'text', nullable: true, comment: '备注' }),
    __metadata("design:type", String)
], Customer.prototype, "remark", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'medical_history', type: 'text', nullable: true, comment: '疾病史' }),
    __metadata("design:type", String)
], Customer.prototype, "medicalHistory", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'improvement_goals', type: 'json', nullable: true, comment: '改善目标' }),
    __metadata("design:type", Array)
], Customer.prototype, "improvementGoals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'other_goals', length: 200, nullable: true, comment: '其他改善目标' }),
    __metadata("design:type", String)
], Customer.prototype, "otherGoals", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'order_count', type: 'int', default: 0, comment: '订单数量' }),
    __metadata("design:type", Number)
], Customer.prototype, "orderCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'return_count', type: 'int', default: 0, comment: '退货次数' }),
    __metadata("design:type", Number)
], Customer.prototype, "returnCount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'total_amount', type: 'decimal', precision: 10, scale: 2, default: 0, comment: '总消费金额' }),
    __metadata("design:type", Number)
], Customer.prototype, "totalAmount", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'fan_acquisition_time', type: 'datetime', nullable: true, comment: '进粉时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "fanAcquisitionTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_order_time', type: 'timestamp', nullable: true, comment: '最后下单时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "lastOrderTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'last_contact_time', type: 'timestamp', nullable: true, comment: '最后联系时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "lastContactTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'next_follow_time', type: 'timestamp', nullable: true, comment: '下次跟进时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "nextFollowTime", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sales_person_id', length: 50, nullable: true, comment: '销售员ID' }),
    __metadata("design:type", String)
], Customer.prototype, "salesPersonId", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'sales_person_name', length: 50, nullable: true, comment: '销售员姓名' }),
    __metadata("design:type", String)
], Customer.prototype, "salesPersonName", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by', length: 50, comment: '创建人ID' }),
    __metadata("design:type", String)
], Customer.prototype, "createdBy", void 0);
__decorate([
    (0, typeorm_1.Column)({ name: 'created_by_name', length: 50, nullable: true, comment: '创建人姓名' }),
    __metadata("design:type", String)
], Customer.prototype, "createdByName", void 0);
__decorate([
    (0, typeorm_1.CreateDateColumn)({ name: 'created_at', comment: '创建时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "createdAt", void 0);
__decorate([
    (0, typeorm_1.UpdateDateColumn)({ name: 'updated_at', comment: '更新时间' }),
    __metadata("design:type", Date)
], Customer.prototype, "updatedAt", void 0);
__decorate([
    (0, typeorm_1.OneToMany)(() => Order_1.Order, order => order.customer),
    __metadata("design:type", Array)
], Customer.prototype, "orders", void 0);
exports.Customer = Customer = __decorate([
    (0, typeorm_1.Entity)('customers')
], Customer);
//# sourceMappingURL=Customer.js.map