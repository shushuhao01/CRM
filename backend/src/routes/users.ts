import { Router } from 'express';
import Joi from 'joi';
import { UserController } from '../controllers/UserController';
import { validate, commonValidations } from '../middleware/validation';
import { authenticateToken, requireManagerOrAdmin } from '../middleware/auth';

const router = Router();
const userController = new UserController();

// 获取用户列表验证规则
const getUsersSchema = {
  query: Joi.object({
    ...commonValidations.pagination,
    search: Joi.string().max(100).optional().messages({
      'string.base': '搜索关键词必须是字符串',
      'string.max': '搜索关键词最多100个字符'
    }),
    departmentId: commonValidations.optionalId,
    role: commonValidations.status(['admin', 'manager', 'sales', 'service']).optional(),
    status: commonValidations.status(['active', 'inactive', 'locked']).optional()
  })
};

// 创建用户验证规则
const createUserSchema = {
  body: Joi.object({
    username: commonValidations.username,
    password: commonValidations.password,
    realName: Joi.string().min(1).max(50).required().messages({
      'string.base': '真实姓名必须是字符串',
      'string.min': '真实姓名不能为空',
      'string.max': '真实姓名最多50个字符',
      'any.required': '真实姓名是必需的'
    }),
    email: Joi.string().max(100).optional().allow('', null).messages({
      'string.base': '邮箱必须是字符串',
      'string.max': '邮箱最多100个字符'
    }),
    phone: Joi.string().max(20).optional().allow('', null).messages({
      'string.base': '手机号必须是字符串',
      'string.max': '手机号最多20个字符'
    }),
    role: Joi.string().max(50).required().messages({
      'string.base': '角色必须是字符串',
      'string.max': '角色最多50个字符',
      'any.required': '角色是必需的'
    }),
    roleId: Joi.string().max(50).optional(),
    departmentId: Joi.alternatives().try(
      Joi.string().max(100).allow('', null),
      Joi.number()
    ).optional(),
    department: Joi.string().max(100).optional().allow('', null),
    position: Joi.string().max(50).optional().allow('', null),
    employeeNumber: Joi.string().max(50).optional().allow('', null),
    status: Joi.string().max(20).optional(),
    employmentStatus: Joi.string().max(20).optional(),
    remark: Joi.string().max(500).optional().allow('', null),
    name: Joi.string().max(50).optional(),
    createTime: Joi.any().optional(),
    isOnline: Joi.boolean().optional(),
    lastLoginTime: Joi.any().optional().allow(null),
    loginCount: Joi.number().optional()
  })
};

/**
 * @route GET /api/v1/users/check-username
 * @desc 检查用户名是否可用
 * @access Private (Manager/Admin)
 */
router.get('/check-username', authenticateToken, requireManagerOrAdmin, userController.checkUsername);

/**
 * @route GET /api/v1/users/department-members
 * @desc 获取同部门成员列表（所有登录用户可访问）
 * @access Private (All authenticated users)
 */
router.get('/department-members', authenticateToken, userController.getDepartmentMembers);

/**
 * @route GET /api/v1/users
 * @desc 获取用户列表
 * @access Private (Manager/Admin)
 */
router.get('/', authenticateToken, requireManagerOrAdmin, validate(getUsersSchema), userController.getUsers);

/**
 * @route POST /api/v1/users
 * @desc 创建用户
 * @access Private (Manager/Admin)
 */
router.post('/', authenticateToken, requireManagerOrAdmin, validate(createUserSchema), userController.createUser);

/**
 * @route GET /api/v1/users/statistics
 * @desc 获取用户统计信息
 * @access Private (Manager/Admin)
 */
router.get('/statistics', authenticateToken, requireManagerOrAdmin, userController.getUserStatistics);

/**
 * @route GET /api/v1/users/:id
 * @desc 获取用户详情
 * @access Private (Manager/Admin)
 */
router.get('/:id', authenticateToken, requireManagerOrAdmin, userController.getUserById);

/**
 * @route PUT /api/v1/users/:id
 * @desc 更新用户信息
 * @access Private (Manager/Admin)
 */
router.put('/:id', authenticateToken, requireManagerOrAdmin, userController.updateUser);

/**
 * @route DELETE /api/v1/users/:id
 * @desc 删除用户
 * @access Private (Manager/Admin)
 */
router.delete('/:id', authenticateToken, requireManagerOrAdmin, userController.deleteUser);

/**
 * @route PATCH /api/v1/users/:id/status
 * @desc 更新用户状态（启用/禁用/锁定）
 * @access Private (Manager/Admin)
 */
router.patch('/:id/status', authenticateToken, requireManagerOrAdmin, userController.updateUserStatus);

/**
 * @route PATCH /api/v1/users/:id/employment-status
 * @desc 更新用户在职状态
 * @access Private (Manager/Admin)
 */
router.patch('/:id/employment-status', authenticateToken, requireManagerOrAdmin, userController.updateEmploymentStatus);

/**
 * @route POST /api/v1/users/:id/reset-password
 * @desc 重置用户密码
 * @access Private (Manager/Admin)
 */
router.post('/:id/reset-password', authenticateToken, requireManagerOrAdmin, userController.resetUserPassword);

export default router;
