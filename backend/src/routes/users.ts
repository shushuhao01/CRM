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
    email: commonValidations.optionalEmail,
    phone: commonValidations.phone.optional(),
    role: Joi.string().max(50).required().messages({
      'string.base': '角色必须是字符串',
      'string.max': '角色最多50个字符',
      'any.required': '角色是必需的'
    }),
    departmentId: Joi.alternatives().try(
      Joi.string().max(100),
      Joi.number()
    ).optional().messages({
      'string.max': '部门ID最多100个字符'
    }),
    position: Joi.string().max(50).optional(),
    employeeNumber: Joi.string().max(50).optional(),
    remark: Joi.string().max(500).optional()
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
