"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const joi_1 = __importDefault(require("joi"));
const UserController_1 = require("../controllers/UserController");
const validation_1 = require("../middleware/validation");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const userController = new UserController_1.UserController();
// 登录验证规则
const loginSchema = {
    body: joi_1.default.object({
        username: validation_1.commonValidations.username,
        password: joi_1.default.string().min(1).max(128).required().messages({
            'string.base': '密码必须是字符串',
            'string.min': '密码不能为空',
            'string.max': '密码最多128个字符',
            'any.required': '密码是必需的'
        })
    })
};
// 刷新令牌验证规则
const refreshTokenSchema = {
    body: joi_1.default.object({
        refreshToken: joi_1.default.string().required().messages({
            'string.base': '刷新令牌必须是字符串',
            'any.required': '刷新令牌是必需的'
        })
    })
};
// 修改密码验证规则
const changePasswordSchema = {
    body: joi_1.default.object({
        currentPassword: joi_1.default.string().required().messages({
            'string.base': '当前密码必须是字符串',
            'any.required': '当前密码是必需的'
        }),
        newPassword: validation_1.commonValidations.password
    })
};
// 更新用户信息验证规则
const updateUserSchema = {
    body: joi_1.default.object({
        realName: joi_1.default.string().min(1).max(50).optional().messages({
            'string.base': '真实姓名必须是字符串',
            'string.min': '真实姓名不能为空',
            'string.max': '真实姓名最多50个字符'
        }),
        email: validation_1.commonValidations.optionalEmail,
        phone: validation_1.commonValidations.phone.optional(),
        avatar: joi_1.default.string().uri().max(200).optional().messages({
            'string.base': '头像必须是字符串',
            'string.uri': '头像必须是有效的URL',
            'string.max': '头像URL最多200个字符'
        })
    })
};
/**
 * @route POST /api/v1/auth/login
 * @desc 用户登录
 * @access Public
 */
router.post('/login', (0, validation_1.validate)(loginSchema), userController.login);
/**
 * @route POST /api/v1/auth/refresh
 * @desc 刷新访问令牌
 * @access Public
 */
router.post('/refresh', (0, validation_1.validate)(refreshTokenSchema), userController.refreshToken);
/**
 * @route GET /api/v1/auth/me
 * @desc 获取当前用户信息
 * @access Private
 */
router.get('/me', auth_1.authenticateToken, userController.getCurrentUser);
/**
 * @route PUT /api/v1/auth/me
 * @desc 更新当前用户信息
 * @access Private
 */
router.put('/me', auth_1.authenticateToken, (0, validation_1.validate)(updateUserSchema), userController.updateCurrentUser);
/**
 * @route PUT /api/v1/auth/password
 * @desc 修改密码
 * @access Private
 */
router.put('/password', auth_1.authenticateToken, (0, validation_1.validate)(changePasswordSchema), userController.changePassword);
/**
 * @route POST /api/v1/auth/logout
 * @desc 用户登出（客户端处理，服务端记录日志）
 * @access Private
 */
router.post('/logout', auth_1.authenticateToken, (req, res) => {
    // 在实际应用中，这里可以将令牌加入黑名单
    // 目前只是返回成功响应，客户端负责清除令牌
    res.json({
        success: true,
        message: '登出成功'
    });
});
exports.default = router;
//# sourceMappingURL=auth.js.map