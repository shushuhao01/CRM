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
// 获取用户列表验证规则
const getUsersSchema = {
    query: joi_1.default.object({
        ...validation_1.commonValidations.pagination,
        search: joi_1.default.string().max(100).optional().messages({
            'string.base': '搜索关键词必须是字符串',
            'string.max': '搜索关键词最多100个字符'
        }),
        departmentId: validation_1.commonValidations.optionalId,
        role: validation_1.commonValidations.status(['admin', 'manager', 'sales', 'service']).optional(),
        status: validation_1.commonValidations.status(['active', 'inactive', 'locked']).optional()
    })
};
// 创建用户验证规则
const createUserSchema = {
    body: joi_1.default.object({
        username: validation_1.commonValidations.username,
        password: validation_1.commonValidations.password,
        realName: joi_1.default.string().min(1).max(50).required().messages({
            'string.base': '真实姓名必须是字符串',
            'string.min': '真实姓名不能为空',
            'string.max': '真实姓名最多50个字符',
            'any.required': '真实姓名是必需的'
        }),
        email: joi_1.default.string().max(100).optional().allow('', null).messages({
            'string.base': '邮箱必须是字符串',
            'string.max': '邮箱最多100个字符'
        }),
        phone: joi_1.default.string().max(20).optional().allow('', null).messages({
            'string.base': '手机号必须是字符串',
            'string.max': '手机号最多20个字符'
        }),
        role: joi_1.default.string().max(50).required().messages({
            'string.base': '角色必须是字符串',
            'string.max': '角色最多50个字符',
            'any.required': '角色是必需的'
        }),
        roleId: joi_1.default.string().max(50).optional(),
        departmentId: joi_1.default.alternatives().try(joi_1.default.string().max(100).allow('', null), joi_1.default.number()).optional(),
        department: joi_1.default.string().max(100).optional().allow('', null),
        position: joi_1.default.string().max(50).optional().allow('', null),
        employeeNumber: joi_1.default.string().max(50).optional().allow('', null),
        status: joi_1.default.string().max(20).optional(),
        employmentStatus: joi_1.default.string().max(20).optional(),
        remark: joi_1.default.string().max(500).optional().allow('', null),
        name: joi_1.default.string().max(50).optional(),
        createTime: joi_1.default.any().optional(),
        isOnline: joi_1.default.boolean().optional(),
        lastLoginTime: joi_1.default.any().optional().allow(null),
        loginCount: joi_1.default.number().optional()
    })
};
/**
 * @route GET /api/v1/users/check-username
 * @desc 检查用户名是否可用
 * @access Private (Manager/Admin)
 */
router.get('/check-username', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.checkUsername);
/**
 * @route GET /api/v1/users/department-members
 * @desc 获取同部门成员列表（所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/department-members', auth_1.authenticateToken, userController.getDepartmentMembers);
/**
 * @route GET /api/v1/users
 * @desc 获取用户列表
 * @access Private (Manager/Admin)
 */
router.get('/', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, (0, validation_1.validate)(getUsersSchema), userController.getUsers);
/**
 * @route POST /api/v1/users
 * @desc 创建用户
 * @access Private (Manager/Admin)
 */
router.post('/', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, (0, validation_1.validate)(createUserSchema), userController.createUser);
/**
 * @route GET /api/v1/users/statistics
 * @desc 获取用户统计信息
 * @access Private (Manager/Admin)
 */
router.get('/statistics', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.getUserStatistics);
/**
 * @route GET /api/v1/users/:id
 * @desc 获取用户详情
 * @access Private (Manager/Admin)
 */
router.get('/:id', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.getUserById);
/**
 * @route PUT /api/v1/users/:id
 * @desc 更新用户信息
 * @access Private (Manager/Admin)
 */
router.put('/:id', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.updateUser);
/**
 * @route DELETE /api/v1/users/:id
 * @desc 删除用户
 * @access Private (Manager/Admin)
 */
router.delete('/:id', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.deleteUser);
/**
 * @route PATCH /api/v1/users/:id/status
 * @desc 更新用户状态（启用/禁用/锁定）
 * @access Private (Manager/Admin)
 */
router.patch('/:id/status', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.updateUserStatus);
/**
 * @route PATCH /api/v1/users/:id/employment-status
 * @desc 更新用户在职状态
 * @access Private (Manager/Admin)
 */
router.patch('/:id/employment-status', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.updateEmploymentStatus);
/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc 重置用户密码
 * @access Private (Manager/Admin)
 */
router.post('/:id/reset-password', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.resetUserPassword);
/**
 * @route POST /api/v1/users/:id/force-logout
 * @desc 强制用户下线
 * @access Private (Manager/Admin)
 */
router.post('/:id/force-logout', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.forceUserLogout);
/**
 * @route POST /api/v1/users/:id/two-factor
 * @desc 切换双因子认证
 * @access Private (Manager/Admin)
 */
router.post('/:id/two-factor', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.toggleTwoFactor);
/**
 * @route POST /api/v1/users/:id/unlock
 * @desc 解锁用户账户
 * @access Private (Manager/Admin)
 */
router.post('/:id/unlock', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.unlockAccount);
/**
 * @route GET /api/v1/users/:id/permissions
 * @desc 获取用户权限详情
 * @access Private (Manager/Admin)
 */
router.get('/:id/permissions', auth_1.authenticateToken, auth_1.requireManagerOrAdmin, userController.getUserPermissions);
exports.default = router;
//# sourceMappingURL=users.js.map