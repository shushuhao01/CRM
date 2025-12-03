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

export default router;
