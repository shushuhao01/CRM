"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.commonValidations = exports.validate = void 0;
const joi_1 = __importDefault(require("joi"));
const errorHandler_1 = require("./errorHandler");
/**
 * 请求验证中间件
 */
const validate = (schema) => {
    return (req, res, next) => {
        const errors = {};
        // 验证请求体
        if (schema.body) {
            const { error, value } = schema.body.validate(req.body, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                errors.body = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));
            }
            else {
                req.body = value;
            }
        }
        // 验证查询参数
        if (schema.query) {
            const { error, value } = schema.query.validate(req.query, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                errors.query = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));
            }
            else {
                req.query = value;
            }
        }
        // 验证路径参数
        if (schema.params) {
            const { error, value } = schema.params.validate(req.params, {
                abortEarly: false,
                allowUnknown: false,
                stripUnknown: true
            });
            if (error) {
                errors.params = error.details.map(detail => ({
                    field: detail.path.join('.'),
                    message: detail.message,
                    value: detail.context?.value
                }));
            }
            else {
                req.params = value;
            }
        }
        // 如果有验证错误，抛出异常
        if (Object.keys(errors).length > 0) {
            throw new errorHandler_1.ValidationError('请求数据验证失败', errors);
        }
        next();
    };
};
exports.validate = validate;
// 常用验证规则
exports.commonValidations = {
    // ID验证
    id: joi_1.default.number().integer().positive().required().messages({
        'number.base': 'ID必须是数字',
        'number.integer': 'ID必须是整数',
        'number.positive': 'ID必须是正数',
        'any.required': 'ID是必需的'
    }),
    // 可选ID验证
    optionalId: joi_1.default.number().integer().positive().optional().messages({
        'number.base': 'ID必须是数字',
        'number.integer': 'ID必须是整数',
        'number.positive': 'ID必须是正数'
    }),
    // 分页验证
    pagination: {
        page: joi_1.default.number().integer().min(1).default(1).messages({
            'number.base': '页码必须是数字',
            'number.integer': '页码必须是整数',
            'number.min': '页码必须大于0'
        }),
        limit: joi_1.default.number().integer().min(1).max(100).default(20).messages({
            'number.base': '每页数量必须是数字',
            'number.integer': '每页数量必须是整数',
            'number.min': '每页数量必须大于0',
            'number.max': '每页数量不能超过100'
        })
    },
    // 用户名验证
    username: joi_1.default.string().alphanum().min(3).max(30).required().messages({
        'string.base': '用户名必须是字符串',
        'string.alphanum': '用户名只能包含字母和数字',
        'string.min': '用户名至少3个字符',
        'string.max': '用户名最多30个字符',
        'any.required': '用户名是必需的'
    }),
    // 密码验证
    password: joi_1.default.string().min(6).max(128).required().messages({
        'string.base': '密码必须是字符串',
        'string.min': '密码至少6个字符',
        'string.max': '密码最多128个字符',
        'any.required': '密码是必需的'
    }),
    // 邮箱验证
    email: joi_1.default.string().email().max(100).required().messages({
        'string.base': '邮箱必须是字符串',
        'string.email': '邮箱格式不正确',
        'string.max': '邮箱最多100个字符',
        'any.required': '邮箱是必需的'
    }),
    // 可选邮箱验证
    optionalEmail: joi_1.default.string().email().max(100).optional().allow('').messages({
        'string.base': '邮箱必须是字符串',
        'string.email': '邮箱格式不正确',
        'string.max': '邮箱最多100个字符'
    }),
    // 手机号验证
    phone: joi_1.default.string().pattern(/^1[3-9]\d{9}$/).messages({
        'string.base': '手机号必须是字符串',
        'string.pattern.base': '手机号格式不正确'
    }),
    // 状态验证
    status: (values) => joi_1.default.string().valid(...values).messages({
        'any.only': `状态必须是以下值之一: ${values.join(', ')}`
    }),
    // 日期验证
    date: joi_1.default.date().iso().messages({
        'date.base': '日期格式不正确',
        'date.format': '日期必须是ISO格式'
    }),
    // 可选日期验证
    optionalDate: joi_1.default.date().iso().optional().allow(null).messages({
        'date.base': '日期格式不正确',
        'date.format': '日期必须是ISO格式'
    }),
    // 金额验证
    amount: joi_1.default.number().precision(2).min(0).messages({
        'number.base': '金额必须是数字',
        'number.precision': '金额最多保留2位小数',
        'number.min': '金额不能为负数'
    }),
    // 数量验证
    quantity: joi_1.default.number().integer().min(1).messages({
        'number.base': '数量必须是数字',
        'number.integer': '数量必须是整数',
        'number.min': '数量必须大于0'
    })
};
//# sourceMappingURL=validation.js.map