"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const database_1 = require("../config/database");
const Customer_1 = require("../entities/Customer");
const CustomerGroup_1 = require("../entities/CustomerGroup");
const CustomerTag_1 = require("../entities/CustomerTag");
const User_1 = require("../entities/User");
const Order_1 = require("../entities/Order");
const CustomerShare_1 = require("../entities/CustomerShare");
const typeorm_1 = require("typeorm");
const dateFormat_1 = require("../utils/dateFormat");
const router = (0, express_1.Router)();
// 所有客户路由都需要认证
router.use(auth_1.authenticateToken);
/**
 * @route GET /api/v1/customers
 * @desc 获取客户列表
 * @access Private
 */
router.get('/', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const { page = 1, pageSize = 10, name, phone, keyword, // 🔥 新增：支持关键词搜索（同时搜索姓名和电话）
        level, status, startDate, endDate } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 10;
        const skip = (pageNum - 1) * pageSizeNum;
        // 🔥 获取当前用户信息，用于权限过滤
        // 优先使用 currentUser（从数据库查询的完整用户对象），其次使用 user（JWT payload）
        const currentUser = req.currentUser || req.user;
        const userId = currentUser?.id || req.user?.userId;
        const userRole = currentUser?.role;
        const userDepartmentId = currentUser?.departmentId;
        console.log('[客户列表] 当前用户信息:', {
            userId,
            userRole,
            userDepartmentId,
            userName: currentUser?.name || currentUser?.realName
        });
        // 构建查询
        const queryBuilder = customerRepository.createQueryBuilder('customer');
        // 🔥 根据用户角色进行权限过滤
        // 管理员和超级管理员可以看到所有客户
        // 部门经理可以看到本部门的客户
        // 普通成员只能看到自己创建的或分配给自己的客户
        if (userRole !== 'admin' && userRole !== 'super_admin') {
            // 获取分享仓库，用于查询分享给当前用户的客户
            const shareRepository = database_1.AppDataSource.getRepository(CustomerShare_1.CustomerShare);
            const userRepository = database_1.AppDataSource.getRepository(User_1.User);
            // 查询分享给当前用户的客户ID列表
            const sharedCustomers = await shareRepository.find({
                where: {
                    sharedTo: userId,
                    status: 'active'
                },
                select: ['customerId']
            });
            const sharedCustomerIds = sharedCustomers.map(s => s.customerId);
            // 🔥 判断是否是部门经理
            const isManager = userRole === 'department_manager' || userRole === 'manager';
            if (isManager && userDepartmentId) {
                // 部门经理：可以看到本部门所有成员创建的或分配给本部门成员的客户
                // 先获取本部门所有成员的ID
                const departmentMembers = await userRepository.find({
                    where: { departmentId: userDepartmentId },
                    select: ['id']
                });
                const departmentMemberIds = departmentMembers.map(m => m.id);
                if (departmentMemberIds.length > 0) {
                    if (sharedCustomerIds.length > 0) {
                        queryBuilder.where('(customer.createdBy IN (:...memberIds) OR customer.salesPersonId IN (:...memberIds) OR customer.id IN (:...sharedIds))', { memberIds: departmentMemberIds, sharedIds: sharedCustomerIds });
                    }
                    else {
                        queryBuilder.where('(customer.createdBy IN (:...memberIds) OR customer.salesPersonId IN (:...memberIds))', { memberIds: departmentMemberIds });
                    }
                }
                else {
                    // 如果部门没有成员，只能看自己的
                    if (sharedCustomerIds.length > 0) {
                        queryBuilder.where('(customer.createdBy = :userId OR customer.salesPersonId = :userId OR customer.id IN (:...sharedIds))', { userId, sharedIds: sharedCustomerIds });
                    }
                    else {
                        queryBuilder.where('(customer.createdBy = :userId OR customer.salesPersonId = :userId)', { userId });
                    }
                }
            }
            else {
                // 普通成员：只能看到自己创建的或分配给自己的客户
                console.log('[客户列表] 普通成员权限过滤, userId:', userId, '分享客户数:', sharedCustomerIds.length);
                if (sharedCustomerIds.length > 0) {
                    queryBuilder.where('(customer.createdBy = :userId OR customer.salesPersonId = :userId OR customer.id IN (:...sharedIds))', { userId, sharedIds: sharedCustomerIds });
                }
                else {
                    queryBuilder.where('(customer.createdBy = :userId OR customer.salesPersonId = :userId)', { userId });
                }
            }
        }
        // 添加其他筛选条件
        // 🔥 新增：支持keyword关键词搜索（同时搜索姓名和电话）
        if (keyword) {
            queryBuilder.andWhere('(customer.name LIKE :keyword OR customer.phone LIKE :keyword)', { keyword: `%${keyword}%` });
        }
        if (name) {
            queryBuilder.andWhere('customer.name LIKE :name', { name: `%${name}%` });
        }
        if (phone) {
            queryBuilder.andWhere('customer.phone LIKE :phone', { phone: `%${phone}%` });
        }
        if (level) {
            queryBuilder.andWhere('customer.level = :level', { level });
        }
        if (status) {
            queryBuilder.andWhere('customer.status = :status', { status });
        }
        // 日期范围筛选 - 🔥 修复：确保包含整天的数据
        if (startDate && endDate) {
            queryBuilder.andWhere('customer.createdAt >= :startDate', { startDate: `${startDate} 00:00:00` });
            queryBuilder.andWhere('customer.createdAt <= :endDate', { endDate: `${endDate} 23:59:59` });
        }
        // 🔥 统计数据查询（在应用分页之前，基于相同的筛选条件）
        const statsQueryBuilder = queryBuilder.clone();
        // 获取今日日期
        const today = new Date();
        const todayStr = today.toISOString().split('T')[0];
        // 统计总数（筛选后的）
        const totalCustomers = await statsQueryBuilder.getCount();
        // 统计活跃客户数（status = 'active'）
        const activeCustomers = await statsQueryBuilder.clone()
            .andWhere('customer.status = :activeStatus', { activeStatus: 'active' })
            .getCount();
        // 统计今日新增客户数
        const newCustomers = await customerRepository.createQueryBuilder('customer')
            .where('DATE(customer.createdAt) = :today', { today: todayStr })
            .getCount();
        // 统计高价值客户数（level = 'gold'）
        const highValueCustomers = await statsQueryBuilder.clone()
            .andWhere('customer.level = :goldLevel', { goldLevel: 'gold' })
            .getCount();
        // 排序和分页
        queryBuilder.orderBy('customer.createdAt', 'DESC')
            .skip(skip)
            .take(pageSizeNum);
        const [customers, total] = await queryBuilder.getManyAndCount();
        // 获取订单仓库，用于统计每个客户的订单数
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        // 获取分享仓库，用于查询客户的分享状态
        const shareRepository = database_1.AppDataSource.getRepository(CustomerShare_1.CustomerShare);
        // 转换数据格式以匹配前端期望，并动态计算订单数
        const list = await Promise.all(customers.map(async (customer) => {
            // 从订单表统计该客户的订单数量
            let realOrderCount = customer.orderCount || 0;
            try {
                realOrderCount = await orderRepository.count({
                    where: { customerId: customer.id }
                });
            }
            catch (e) {
                console.warn(`统计客户${customer.id}订单数失败:`, e);
            }
            // 🔥 查询客户的分享状态
            let shareInfo = null;
            try {
                const activeShare = await shareRepository.findOne({
                    where: {
                        customerId: customer.id,
                        status: 'active'
                    },
                    order: { createdAt: 'DESC' }
                });
                if (activeShare) {
                    shareInfo = {
                        id: activeShare.id,
                        status: activeShare.status,
                        sharedBy: activeShare.sharedBy,
                        sharedByName: activeShare.sharedByName,
                        sharedTo: activeShare.sharedTo,
                        sharedToName: activeShare.sharedToName,
                        shareTime: activeShare.createdAt,
                        expireTime: activeShare.expireTime,
                        timeLimit: activeShare.timeLimit
                    };
                }
            }
            catch (e) {
                console.warn(`查询客户${customer.id}分享状态失败:`, e);
            }
            // 🔥 获取负责销售的名字
            let salesPersonName = '';
            if (customer.salesPersonId) {
                try {
                    const userRepository = database_1.AppDataSource.getRepository(User_1.User);
                    const salesPerson = await userRepository.findOne({ where: { id: customer.salesPersonId } });
                    salesPersonName = salesPerson?.realName || salesPerson?.name || '';
                }
                catch (e) {
                    console.warn(`获取销售人员${customer.salesPersonId}信息失败:`, e);
                }
            }
            return {
                id: customer.id,
                code: customer.customerNo || '',
                name: customer.name,
                phone: customer.phone || '',
                otherPhones: customer.otherPhones || [], // 🔥 添加其他手机号
                age: customer.age || 0,
                gender: customer.gender || 'unknown',
                height: customer.height || null,
                weight: customer.weight || null,
                address: customer.address || '',
                province: customer.province || '',
                city: customer.city || '',
                district: customer.district || '',
                street: customer.street || '',
                detailAddress: customer.detailAddress || '',
                overseasAddress: customer.overseasAddress || '',
                level: customer.level || 'normal',
                status: customer.status || 'active',
                salesPersonId: customer.salesPersonId || '',
                salesPersonName: salesPersonName, // 🔥 添加负责销售名字
                orderCount: realOrderCount,
                returnCount: customer.returnCount || 0,
                totalAmount: customer.totalAmount || 0,
                createTime: (0, dateFormat_1.formatDateTime)(customer.createdAt),
                createdBy: customer.createdBy || '',
                wechat: customer.wechat || '',
                wechatId: customer.wechat || '',
                email: customer.email || '',
                company: customer.company || '',
                source: customer.source || '',
                tags: customer.tags || [],
                remarks: customer.remark || '',
                remark: customer.remark || '',
                medicalHistory: customer.medicalHistory || '',
                improvementGoals: customer.improvementGoals || [],
                otherGoals: customer.otherGoals || '',
                fanAcquisitionTime: (0, dateFormat_1.formatDate)(customer.fanAcquisitionTime),
                shareInfo // 🔥 添加分享信息
            };
        }));
        res.json({
            success: true,
            code: 200,
            message: '获取客户列表成功',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum,
                // 🔥 新增：统计数据
                statistics: {
                    totalCustomers,
                    activeCustomers,
                    newCustomers,
                    highValueCustomers
                }
            }
        });
    }
    catch (error) {
        console.error('获取客户列表失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取客户列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
// ========== 客户分组路由（必须在 /:id 之前定义）==========
/**
 * @route GET /api/v1/customers/groups
 * @desc 获取客户分组列表
 * @access Private
 */
router.get('/groups', async (req, res) => {
    try {
        const groupRepository = database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup);
        const { page = 1, pageSize = 20, name, status: _status } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const skip = (pageNum - 1) * pageSizeNum;
        const where = {};
        if (name) {
            where.name = (0, typeorm_1.Like)(`%${name}%`);
        }
        const [groups, total] = await groupRepository.findAndCount({
            where,
            skip,
            take: pageSizeNum,
            order: { createdAt: 'DESC' }
        });
        const list = groups.map(group => ({
            id: group.id,
            name: group.name,
            description: group.description || '',
            status: 'active',
            customerCount: group.customerCount || 0,
            createTime: group.createdAt?.toISOString() || '',
            conditions: []
        }));
        res.json({
            success: true,
            code: 200,
            message: '获取分组列表成功',
            data: { list, total, page: pageNum, pageSize: pageSizeNum }
        });
    }
    catch (error) {
        console.error('获取分组列表失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取分组列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/customers/groups
 * @desc 创建客户分组
 * @access Private
 */
router.post('/groups', async (req, res) => {
    try {
        const groupRepository = database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup);
        const { name, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '分组名称不能为空'
            });
        }
        const group = groupRepository.create({
            name,
            description: description || '',
            customerCount: 0
        });
        const savedGroup = await groupRepository.save(group);
        res.status(201).json({
            success: true,
            code: 200,
            message: '创建分组成功',
            data: {
                id: savedGroup.id,
                name: savedGroup.name,
                description: savedGroup.description || '',
                status: 'active',
                customerCount: 0,
                createTime: savedGroup.createdAt?.toISOString() || '',
                conditions: []
            }
        });
    }
    catch (error) {
        console.error('创建分组失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '创建分组失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/customers/groups/:id
 * @desc 获取客户分组详情
 * @access Private
 */
router.get('/groups/:id', async (req, res) => {
    try {
        const groupRepository = database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup);
        const group = await groupRepository.findOne({
            where: { id: req.params.id }
        });
        if (!group) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '分组不存在'
            });
        }
        res.json({
            success: true,
            code: 200,
            message: '获取分组详情成功',
            data: {
                id: group.id,
                name: group.name,
                description: group.description || '',
                status: 'active',
                customerCount: group.customerCount || 0,
                createTime: group.createdAt?.toISOString() || '',
                conditions: []
            }
        });
    }
    catch (error) {
        console.error('获取分组详情失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取分组详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route PUT /api/v1/customers/groups/:id
 * @desc 更新客户分组
 * @access Private
 */
router.put('/groups/:id', async (req, res) => {
    try {
        const groupRepository = database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup);
        const group = await groupRepository.findOne({
            where: { id: req.params.id }
        });
        if (!group) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '分组不存在'
            });
        }
        const { name, description } = req.body;
        if (name !== undefined)
            group.name = name;
        if (description !== undefined)
            group.description = description;
        const updatedGroup = await groupRepository.save(group);
        res.json({
            success: true,
            code: 200,
            message: '更新分组成功',
            data: {
                id: updatedGroup.id,
                name: updatedGroup.name,
                description: updatedGroup.description || '',
                status: 'active',
                customerCount: updatedGroup.customerCount || 0,
                createTime: updatedGroup.createdAt?.toISOString() || '',
                conditions: []
            }
        });
    }
    catch (error) {
        console.error('更新分组失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新分组失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route DELETE /api/v1/customers/groups/:id
 * @desc 删除客户分组
 * @access Private
 */
router.delete('/groups/:id', async (req, res) => {
    try {
        const groupRepository = database_1.AppDataSource.getRepository(CustomerGroup_1.CustomerGroup);
        const group = await groupRepository.findOne({
            where: { id: req.params.id }
        });
        if (!group) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '分组不存在'
            });
        }
        await groupRepository.remove(group);
        res.json({
            success: true,
            code: 200,
            message: '删除分组成功'
        });
    }
    catch (error) {
        console.error('删除分组失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除分组失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
// ========== 客户标签路由（必须在 /:id 之前定义）==========
/**
 * @route GET /api/v1/customers/tags
 * @desc 获取客户标签列表
 * @access Private
 */
router.get('/tags', async (req, res) => {
    try {
        const tagRepository = database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag);
        const { page = 1, pageSize = 20, name, status: _status } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const skip = (pageNum - 1) * pageSizeNum;
        const where = {};
        if (name) {
            where.name = (0, typeorm_1.Like)(`%${name}%`);
        }
        const [tags, total] = await tagRepository.findAndCount({
            where,
            skip,
            take: pageSizeNum,
            order: { createdAt: 'DESC' }
        });
        const list = tags.map(tag => ({
            id: tag.id,
            name: tag.name,
            color: tag.color || '#007bff',
            description: tag.description || '',
            status: 'active',
            customerCount: tag.customerCount || 0,
            createTime: tag.createdAt?.toISOString() || ''
        }));
        res.json({
            success: true,
            code: 200,
            message: '获取标签列表成功',
            data: { list, total, page: pageNum, pageSize: pageSizeNum }
        });
    }
    catch (error) {
        console.error('获取标签列表失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取标签列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/customers/tags
 * @desc 创建客户标签
 * @access Private
 */
router.post('/tags', async (req, res) => {
    try {
        const tagRepository = database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag);
        const { name, color, description } = req.body;
        if (!name) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '标签名称不能为空'
            });
        }
        const tag = tagRepository.create({
            name,
            color: color || '#007bff',
            description: description || '',
            customerCount: 0
        });
        const savedTag = await tagRepository.save(tag);
        res.status(201).json({
            success: true,
            code: 200,
            message: '创建标签成功',
            data: {
                id: savedTag.id,
                name: savedTag.name,
                color: savedTag.color || '#007bff',
                description: savedTag.description || '',
                status: 'active',
                customerCount: 0,
                createTime: savedTag.createdAt?.toISOString() || ''
            }
        });
    }
    catch (error) {
        console.error('创建标签失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '创建标签失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/customers/tags/:id
 * @desc 获取客户标签详情
 * @access Private
 */
router.get('/tags/:id', async (req, res) => {
    try {
        const tagRepository = database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag);
        const tag = await tagRepository.findOne({
            where: { id: req.params.id }
        });
        if (!tag) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '标签不存在'
            });
        }
        res.json({
            success: true,
            code: 200,
            message: '获取标签详情成功',
            data: {
                id: tag.id,
                name: tag.name,
                color: tag.color || '#007bff',
                description: tag.description || '',
                status: 'active',
                customerCount: tag.customerCount || 0,
                createTime: tag.createdAt?.toISOString() || ''
            }
        });
    }
    catch (error) {
        console.error('获取标签详情失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取标签详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route PUT /api/v1/customers/tags/:id
 * @desc 更新客户标签
 * @access Private
 */
router.put('/tags/:id', async (req, res) => {
    try {
        const tagRepository = database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag);
        const tag = await tagRepository.findOne({
            where: { id: req.params.id }
        });
        if (!tag) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '标签不存在'
            });
        }
        const { name, color, description } = req.body;
        if (name !== undefined)
            tag.name = name;
        if (color !== undefined)
            tag.color = color;
        if (description !== undefined)
            tag.description = description;
        const updatedTag = await tagRepository.save(tag);
        res.json({
            success: true,
            code: 200,
            message: '更新标签成功',
            data: {
                id: updatedTag.id,
                name: updatedTag.name,
                color: updatedTag.color || '#007bff',
                description: updatedTag.description || '',
                status: 'active',
                customerCount: updatedTag.customerCount || 0,
                createTime: updatedTag.createdAt?.toISOString() || ''
            }
        });
    }
    catch (error) {
        console.error('更新标签失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新标签失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route DELETE /api/v1/customers/tags/:id
 * @desc 删除客户标签
 * @access Private
 */
router.delete('/tags/:id', async (req, res) => {
    try {
        const tagRepository = database_1.AppDataSource.getRepository(CustomerTag_1.CustomerTag);
        const tag = await tagRepository.findOne({
            where: { id: req.params.id }
        });
        if (!tag) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '标签不存在'
            });
        }
        await tagRepository.remove(tag);
        res.json({
            success: true,
            code: 200,
            message: '删除标签成功'
        });
    }
    catch (error) {
        console.error('删除标签失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除标签失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/customers/check-exists
 * @desc 检查客户是否存在（通过手机号）
 * @access Private
 * @note 此路由必须在 /:id 路由之前定义，否则会被 /:id 匹配
 */
router.get('/check-exists', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const { phone } = req.query;
        if (!phone) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '手机号不能为空',
                data: null
            });
        }
        console.log('[检查客户存在] 查询手机号:', phone);
        const existingCustomer = await customerRepository.findOne({
            where: { phone: phone }
        });
        if (existingCustomer) {
            console.log('[检查客户存在] 找到客户:', existingCustomer.name);
            // 查找归属人的真实姓名
            let ownerName = '';
            const ownerId = existingCustomer.salesPersonId || existingCustomer.createdBy;
            if (ownerId) {
                try {
                    const userRepository = database_1.AppDataSource.getRepository(User_1.User);
                    const owner = await userRepository.findOne({
                        where: { id: ownerId }
                    });
                    ownerName = owner?.name || ownerId;
                }
                catch (e) {
                    console.log('[检查客户存在] 查找归属人失败:', e);
                    ownerName = ownerId;
                }
            }
            return res.json({
                success: true,
                code: 200,
                message: '该手机号已存在客户记录',
                data: {
                    id: existingCustomer.id,
                    name: existingCustomer.name,
                    phone: existingCustomer.phone,
                    creatorName: ownerName,
                    createTime: existingCustomer.createdAt?.toISOString() || ''
                }
            });
        }
        console.log('[检查客户存在] 客户不存在，可以创建');
        return res.json({
            success: true,
            code: 200,
            message: '该手机号不存在，可以创建',
            data: null
        });
    }
    catch (error) {
        console.error('检查客户存在失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '检查客户存在失败',
            error: error instanceof Error ? error.message : '未知错误',
            data: null
        });
    }
});
/**
 * @route GET /api/v1/customers/search
 * @desc 搜索客户（支持姓名、手机号、客户编码）
 * @access Private
 * @note 此路由必须在 /:id 路由之前定义
 */
router.get('/search', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const { keyword } = req.query;
        if (!keyword) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '搜索关键词不能为空'
            });
        }
        console.log('[客户搜索] 搜索关键词:', keyword);
        // 搜索条件：姓名、手机号、客户编码
        const customers = await customerRepository
            .createQueryBuilder('customer')
            .where('customer.name LIKE :keyword OR customer.phone LIKE :keyword OR customer.customerNo LIKE :keyword', { keyword: `%${keyword}%` })
            .orderBy('customer.createdAt', 'DESC')
            .getMany();
        // 转换数据格式
        const list = customers.map(customer => ({
            id: customer.id,
            code: customer.customerNo || '',
            name: customer.name,
            phone: customer.phone || '',
            otherPhones: customer.otherPhones || [], // 🔥 添加其他手机号
            gender: customer.gender || 'unknown',
            age: customer.age || 0,
            level: customer.level || 'normal',
            address: customer.address || '',
            createTime: customer.createdAt?.toISOString() || '',
            orderCount: customer.orderCount || 0,
            salesPersonId: customer.salesPersonId || ''
        }));
        console.log('[客户搜索] 找到客户数:', list.length);
        res.json({
            success: true,
            code: 200,
            message: '搜索客户成功',
            data: {
                customers: list,
                total: list.length
            }
        });
    }
    catch (error) {
        console.error('搜索客户失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '搜索客户失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/customers/:id
 * @desc 获取客户详情
 * @access Private
 */
router.get('/:id', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const userRepository = database_1.AppDataSource.getRepository(User_1.User);
        const customer = await customerRepository.findOne({
            where: { id: req.params.id }
        });
        if (!customer) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '客户不存在'
            });
        }
        // 🔥 获取创建人和负责销售的名字
        let createdByName = '';
        let salesPersonName = '';
        if (customer.createdBy) {
            const creator = await userRepository.findOne({ where: { id: customer.createdBy } });
            createdByName = creator?.realName || creator?.name || '';
        }
        if (customer.salesPersonId) {
            const salesPerson = await userRepository.findOne({ where: { id: customer.salesPersonId } });
            salesPersonName = salesPerson?.realName || salesPerson?.name || '';
        }
        // 转换数据格式
        const data = {
            id: customer.id,
            code: customer.customerNo || '',
            name: customer.name,
            phone: customer.phone || '',
            otherPhones: customer.otherPhones || [],
            age: customer.age || 0,
            gender: customer.gender || 'unknown',
            height: customer.height || null,
            weight: customer.weight || null,
            birthday: customer.birthday ? (0, dateFormat_1.formatDate)(customer.birthday) : '',
            address: customer.address || '',
            province: customer.province || '',
            city: customer.city || '',
            district: customer.district || '',
            street: customer.street || '',
            detailAddress: customer.detailAddress || '',
            overseasAddress: customer.overseasAddress || '',
            level: customer.level || 'normal',
            status: customer.status || 'active',
            salesPersonId: customer.salesPersonId || '',
            salesPersonName: salesPersonName, // 🔥 添加负责销售名字
            orderCount: customer.orderCount || 0,
            returnCount: customer.returnCount || 0,
            totalAmount: customer.totalAmount || 0,
            createTime: (0, dateFormat_1.formatDateTime)(customer.createdAt),
            createdBy: customer.createdBy || '',
            createdByName: createdByName, // 🔥 添加创建人名字
            wechat: customer.wechat || '',
            wechatId: customer.wechat || '',
            email: customer.email || '',
            company: customer.company || '',
            source: customer.source || '',
            tags: customer.tags || [],
            remarks: customer.remark || '',
            remark: customer.remark || '',
            medicalHistory: customer.medicalHistory || '',
            improvementGoals: customer.improvementGoals || [],
            otherGoals: customer.otherGoals || '',
            fanAcquisitionTime: (0, dateFormat_1.formatDate)(customer.fanAcquisitionTime)
        };
        res.json({
            success: true,
            code: 200,
            message: '获取客户详情成功',
            data
        });
    }
    catch (error) {
        console.error('获取客户详情失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取客户详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/customers
 * @desc 创建客户
 * @access Private
 */
router.post('/', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const { name, phone, email, address, level, source, tags, remarks, remark, company, age, gender, height, weight, wechat, wechatId, province, city, district, street, detailAddress, overseasAddress, medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime, status, salesPersonId, createdBy } = req.body;
        console.log('[创建客户] 收到请求数据:', req.body);
        // 验证必填字段
        if (!name) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '客户姓名不能为空'
            });
        }
        // 检查手机号是否已存在
        if (phone) {
            const existingCustomer = await customerRepository.findOne({ where: { phone } });
            if (existingCustomer) {
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: '该手机号已存在客户记录'
                });
            }
        }
        // 获取当前用户信息
        // 优先使用 currentUser（从数据库查询的完整用户对象），其次使用 user（JWT payload）
        const currentUser = req.currentUser || req.user;
        const currentUserId = currentUser?.id || req.user?.userId;
        console.log('[创建客户] 当前用户信息:', {
            id: currentUserId,
            name: currentUser?.name,
            role: currentUser?.role,
            departmentId: currentUser?.departmentId
        });
        // 🔥 修复：优先使用当前登录用户的ID作为创建人
        const finalCreatedBy = currentUserId || createdBy || salesPersonId || 'admin';
        const finalSalesPersonId = salesPersonId || currentUserId || null;
        console.log('[创建客户] 最终创建人ID:', finalCreatedBy, '销售人员ID:', finalSalesPersonId);
        // 创建客户
        const customer = customerRepository.create({
            name,
            phone,
            email,
            address,
            province,
            city,
            district,
            street,
            detailAddress,
            overseasAddress,
            level: level || 'normal',
            source: source || 'other',
            tags: tags || [],
            remark: remarks || remark || null,
            company,
            status: status || 'active',
            salesPersonId: finalSalesPersonId,
            createdBy: finalCreatedBy,
            // 新增字段
            age: age || null,
            gender: gender || 'unknown',
            height: height || null,
            weight: weight || null,
            wechat: wechat || wechatId || null,
            medicalHistory: medicalHistory || null,
            improvementGoals: improvementGoals || [],
            otherGoals: otherGoals || null,
            fanAcquisitionTime: fanAcquisitionTime ? new Date(fanAcquisitionTime) : null,
            orderCount: 0,
            returnCount: 0,
            totalAmount: 0
        });
        console.log('[创建客户] 准备保存的客户对象:', customer);
        const savedCustomer = await customerRepository.save(customer);
        console.log('[创建客户] 第一次保存完成，savedCustomer:', savedCustomer);
        console.log('[创建客户] savedCustomer.id:', savedCustomer.id);
        // 生成客户编号
        savedCustomer.customerNo = `C${savedCustomer.id.substring(0, 8).toUpperCase()}`;
        console.log('[创建客户] 生成的客户编号:', savedCustomer.customerNo);
        await customerRepository.save(savedCustomer);
        console.log('[创建客户] 第二次保存完成');
        console.log('[创建客户] 保存成功，客户ID:', savedCustomer.id);
        // 转换数据格式返回
        const data = {
            id: savedCustomer.id,
            code: savedCustomer.customerNo,
            name: savedCustomer.name,
            phone: savedCustomer.phone || '',
            age: savedCustomer.age || 0,
            gender: savedCustomer.gender || 'unknown',
            height: savedCustomer.height || null,
            weight: savedCustomer.weight || null,
            address: savedCustomer.address || '',
            province: savedCustomer.province || '',
            city: savedCustomer.city || '',
            district: savedCustomer.district || '',
            street: savedCustomer.street || '',
            detailAddress: savedCustomer.detailAddress || '',
            level: level || 'normal',
            status: status || 'active',
            salesPersonId: savedCustomer.salesPersonId || '',
            orderCount: 0,
            createTime: (0, dateFormat_1.formatDateTime)(savedCustomer.createdAt),
            createdBy: savedCustomer.createdBy || '',
            wechat: savedCustomer.wechat || '',
            email: savedCustomer.email || '',
            company: savedCustomer.company || '',
            source: savedCustomer.source || '',
            tags: savedCustomer.tags || [],
            remarks: savedCustomer.remark || '',
            medicalHistory: savedCustomer.medicalHistory || '',
            improvementGoals: savedCustomer.improvementGoals || [],
            otherGoals: savedCustomer.otherGoals || ''
        };
        console.log('[创建客户] 准备返回的data对象:', data);
        console.log('[创建客户] data.id:', data.id);
        console.log('[创建客户] data.name:', data.name);
        res.status(201).json({
            success: true,
            code: 200,
            message: '创建客户成功',
            data
        });
        console.log('[创建客户] 响应已发送');
    }
    catch (error) {
        console.error('[创建客户] 创建客户失败:', error);
        console.error('[创建客户] 错误详情:', error instanceof Error ? error.stack : error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '创建客户失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route PUT /api/v1/customers/:id
 * @desc 更新客户
 * @access Private
 */
router.put('/:id', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customerId = req.params.id;
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        if (!customer) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '客户不存在'
            });
        }
        const { name, phone, email, address, level, source, tags, remarks, remark, company, status, age, gender, height, weight, wechat, wechatId, birthday, province, city, district, street, detailAddress, overseasAddress, medicalHistory, improvementGoals, otherGoals, fanAcquisitionTime, otherPhones } = req.body;
        // 更新字段
        if (name !== undefined)
            customer.name = name;
        if (phone !== undefined)
            customer.phone = phone;
        if (email !== undefined)
            customer.email = email;
        if (address !== undefined)
            customer.address = address;
        if (province !== undefined)
            customer.province = province;
        if (city !== undefined)
            customer.city = city;
        if (district !== undefined)
            customer.district = district;
        if (street !== undefined)
            customer.street = street;
        if (detailAddress !== undefined)
            customer.detailAddress = detailAddress;
        if (overseasAddress !== undefined)
            customer.overseasAddress = overseasAddress;
        if (level !== undefined)
            customer.level = level;
        if (source !== undefined)
            customer.source = source;
        if (tags !== undefined)
            customer.tags = tags;
        if (remarks !== undefined || remark !== undefined)
            customer.remark = remarks || remark;
        if (company !== undefined)
            customer.company = company;
        if (status !== undefined)
            customer.status = status;
        if (age !== undefined)
            customer.age = age;
        if (gender !== undefined)
            customer.gender = gender;
        if (height !== undefined)
            customer.height = height;
        if (weight !== undefined)
            customer.weight = weight;
        if (birthday !== undefined)
            customer.birthday = birthday ? new Date(birthday) : undefined;
        if (wechat !== undefined || wechatId !== undefined)
            customer.wechat = wechat || wechatId;
        if (medicalHistory !== undefined)
            customer.medicalHistory = medicalHistory;
        if (improvementGoals !== undefined)
            customer.improvementGoals = improvementGoals;
        if (otherGoals !== undefined)
            customer.otherGoals = otherGoals;
        if (fanAcquisitionTime !== undefined)
            customer.fanAcquisitionTime = fanAcquisitionTime ? new Date(fanAcquisitionTime) : undefined;
        if (otherPhones !== undefined)
            customer.otherPhones = otherPhones;
        const updatedCustomer = await customerRepository.save(customer);
        // 转换数据格式返回
        const data = {
            id: updatedCustomer.id,
            code: updatedCustomer.customerNo || '',
            name: updatedCustomer.name,
            phone: updatedCustomer.phone || '',
            otherPhones: updatedCustomer.otherPhones || [],
            age: updatedCustomer.age || 0,
            gender: updatedCustomer.gender || 'unknown',
            height: updatedCustomer.height || null,
            weight: updatedCustomer.weight || null,
            address: updatedCustomer.address || '',
            level: updatedCustomer.level || 'normal',
            status: updatedCustomer.status || 'active',
            salesPersonId: updatedCustomer.salesPersonId || '',
            orderCount: updatedCustomer.orderCount || 0,
            createTime: (0, dateFormat_1.formatDateTime)(updatedCustomer.createdAt),
            createdBy: updatedCustomer.createdBy || '',
            email: updatedCustomer.email || '',
            company: updatedCustomer.company || '',
            source: updatedCustomer.source || '',
            tags: updatedCustomer.tags || [],
            remarks: updatedCustomer.remark || '',
            improvementGoals: updatedCustomer.improvementGoals || [],
            fanAcquisitionTime: updatedCustomer.fanAcquisitionTime ? (0, dateFormat_1.formatDate)(updatedCustomer.fanAcquisitionTime) : ''
        };
        res.json({
            success: true,
            code: 200,
            message: '更新客户成功',
            data
        });
    }
    catch (error) {
        console.error('更新客户失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新客户失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route DELETE /api/v1/customers/:id
 * @desc 删除客户
 * @access Private
 */
router.delete('/:id', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customerId = req.params.id;
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        if (!customer) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '客户不存在'
            });
        }
        await customerRepository.remove(customer);
        res.json({
            success: true,
            code: 200,
            message: '删除客户成功'
        });
    }
    catch (error) {
        console.error('删除客户失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除客户失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
// ========== 客户详情子路由 ==========
/**
 * @route GET /api/v1/customers/:id/orders
 * @desc 获取客户订单历史
 * @access Private
 */
router.get('/:id/orders', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { Order } = await Promise.resolve().then(() => __importStar(require('../entities/Order')));
        const orderRepository = database_1.AppDataSource.getRepository(Order);
        const orders = await orderRepository.find({
            where: { customerId },
            order: { createdAt: 'DESC' }
        });
        const list = orders.map(order => ({
            id: order.id,
            orderNo: order.orderNumber,
            orderNumber: order.orderNumber,
            products: order.products || [],
            productNames: Array.isArray(order.products)
                ? order.products.map((p) => p.name || p.productName).join(', ')
                : '',
            totalAmount: Number(order.totalAmount) || 0,
            status: order.status,
            orderDate: order.createdAt?.toISOString() || '',
            createTime: order.createdAt?.toISOString() || '',
            paymentStatus: order.paymentStatus,
            shippingAddress: order.shippingAddress
        }));
        console.log(`[客户订单] 客户 ${customerId} 有 ${list.length} 条订单记录`);
        res.json({
            success: true,
            code: 200,
            data: list
        });
    }
    catch (error) {
        console.error('获取客户订单失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户订单失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/services
 * @desc 获取客户售后记录
 * @access Private
 */
router.get('/:id/services', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { AfterSalesService } = await Promise.resolve().then(() => __importStar(require('../entities/AfterSalesService')));
        const serviceRepository = database_1.AppDataSource.getRepository(AfterSalesService);
        const services = await serviceRepository.find({
            where: { customerId },
            order: { createdAt: 'DESC' }
        });
        const list = services.map(service => ({
            id: service.id,
            serviceNo: service.serviceNumber,
            serviceNumber: service.serviceNumber,
            orderNo: service.orderNumber,
            orderNumber: service.orderNumber,
            serviceType: service.serviceType,
            type: service.serviceType,
            status: service.status,
            reason: service.reason || service.description || '',
            description: service.description,
            price: Number(service.price) || 0,
            amount: Number(service.price) || 0,
            createTime: service.createdAt?.toISOString() || '',
            resolvedTime: service.resolvedTime?.toISOString() || ''
        }));
        console.log(`[客户售后] 客户 ${customerId} 有 ${list.length} 条售后记录`);
        res.json({ success: true, code: 200, data: list });
    }
    catch (error) {
        console.error('获取客户售后记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户售后记录失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/calls
 * @desc 获取客户通话记录
 * @access Private
 */
router.get('/:id/calls', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { Call } = await Promise.resolve().then(() => __importStar(require('../entities/Call')));
        const callRepository = database_1.AppDataSource.getRepository(Call);
        const calls = await callRepository.find({
            where: { customerId },
            order: { createdAt: 'DESC' }
        });
        const list = calls.map(call => {
            // 解析 callTags，可能是 JSON 字符串或数组
            let parsedCallTags = [];
            if (call.callTags) {
                if (typeof call.callTags === 'string') {
                    try {
                        parsedCallTags = JSON.parse(call.callTags);
                    }
                    catch (_e) {
                        parsedCallTags = [];
                    }
                }
                else if (Array.isArray(call.callTags)) {
                    parsedCallTags = call.callTags;
                }
            }
            return {
                id: call.id,
                customerId: call.customerId,
                customerName: call.customerName,
                customerPhone: call.customerPhone,
                callType: call.callType || 'outbound',
                callStatus: call.callStatus || 'connected',
                duration: call.duration || 0,
                startTime: call.startTime?.toISOString() || call.createdAt?.toISOString() || '',
                endTime: call.endTime?.toISOString() || '',
                notes: call.notes || '',
                recordingUrl: call.recordingUrl || null,
                hasRecording: call.hasRecording || false,
                userName: call.userName || '未知',
                callTags: parsedCallTags,
                createdAt: call.createdAt?.toISOString() || ''
            };
        });
        console.log(`[客户通话] 客户 ${customerId} 有 ${list.length} 条通话记录`);
        res.json({ success: true, code: 200, data: list });
    }
    catch (error) {
        console.error('获取客户通话记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户通话记录失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/followups
 * @desc 获取客户跟进记录
 * @access Private
 */
router.get('/:id/followups', async (req, res) => {
    try {
        const customerId = req.params.id;
        console.log(`[客户跟进] 查询客户 ${customerId} 的跟进记录`);
        // 🔥 修复：使用原生SQL查询，避免实体字段不匹配问题
        const followUps = await database_1.AppDataSource.query(`
      SELECT
        id,
        call_id as callId,
        customer_id as customerId,
        customer_name as customerName,
        follow_up_type as type,
        content,
        customer_intent as customerIntent,
        call_tags as callTags,
        next_follow_up_date as nextFollowUp,
        priority,
        status,
        user_id as createdBy,
        user_name as createdByName,
        created_at as createdAt,
        updated_at as updatedAt
      FROM follow_up_records
      WHERE customer_id = ?
      ORDER BY created_at DESC
    `, [customerId]);
        console.log(`[客户跟进] 查询结果:`, followUps.length, '条记录');
        if (followUps.length > 0) {
            console.log(`[客户跟进] 最新记录:`, followUps[0]);
        }
        const list = followUps.map((followUp) => {
            // 解析 callTags，可能是 JSON 字符串或数组
            let parsedCallTags = [];
            if (followUp.callTags) {
                if (typeof followUp.callTags === 'string') {
                    try {
                        parsedCallTags = JSON.parse(followUp.callTags);
                    }
                    catch (_e) {
                        parsedCallTags = [];
                    }
                }
                else if (Array.isArray(followUp.callTags)) {
                    parsedCallTags = followUp.callTags;
                }
            }
            return {
                id: followUp.id,
                customerId: followUp.customerId,
                type: followUp.type,
                title: followUp.type === 'call' ? '电话跟进' :
                    followUp.type === 'visit' ? '上门拜访' :
                        followUp.type === 'email' ? '邮件跟进' :
                            followUp.type === 'message' ? '消息跟进' :
                                followUp.type === 'wechat' ? '微信跟进' : '跟进记录',
                content: followUp.content || '',
                customerIntent: followUp.customerIntent || null,
                callTags: parsedCallTags,
                call_tags: parsedCallTags,
                status: followUp.status,
                priority: followUp.priority,
                nextFollowUp: followUp.nextFollowUp ? new Date(followUp.nextFollowUp).toISOString() : '',
                nextTime: followUp.nextFollowUp ? new Date(followUp.nextFollowUp).toISOString() : '',
                createdBy: followUp.createdBy,
                createdByName: followUp.createdByName || followUp.createdBy || '系统',
                author: followUp.createdByName || followUp.createdBy || '系统',
                createTime: followUp.createdAt ? new Date(followUp.createdAt).toISOString() : '',
                createdAt: followUp.createdAt ? new Date(followUp.createdAt).toISOString() : ''
            };
        });
        console.log(`[客户跟进] 客户 ${customerId} 有 ${list.length} 条跟进记录`);
        res.json({ success: true, code: 200, data: list });
    }
    catch (error) {
        console.error('获取客户跟进记录失败:', error);
        // 🔥 返回空数组而不是500错误，避免前端显示错误
        res.json({ success: true, code: 200, data: [], message: '暂无跟进记录' });
    }
});
/**
 * @route POST /api/v1/customers/:id/followups
 * @desc 添加客户跟进记录
 * @access Private
 */
router.post('/:id/followups', async (req, res) => {
    try {
        const customerId = req.params.id;
        const { type, content, status, priority, nextFollowUp } = req.body;
        // 🔥 修复：使用正确的currentUser字段
        const currentUser = req.currentUser;
        const { FollowUp } = await Promise.resolve().then(() => __importStar(require('../entities/FollowUp')));
        const followUpRepository = database_1.AppDataSource.getRepository(FollowUp);
        // 获取客户信息
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        // 生成唯一ID
        const { v4: uuidv4 } = await Promise.resolve().then(() => __importStar(require('uuid')));
        const followUp = followUpRepository.create({
            id: uuidv4(),
            customerId,
            customerName: customer?.name || '',
            type: type || 'call',
            content: content || '',
            status: status || 'completed',
            priority: priority || 'medium',
            nextFollowUp: nextFollowUp ? new Date(nextFollowUp) : undefined,
            createdBy: currentUser?.id || 'system',
            createdByName: currentUser?.name || currentUser?.realName || '系统'
        });
        const savedFollowUp = await followUpRepository.save(followUp);
        console.log(`[添加跟进] 客户 ${customerId} 添加跟进记录成功`);
        const title = savedFollowUp.type === 'call' ? '电话跟进' :
            savedFollowUp.type === 'visit' ? '上门拜访' :
                savedFollowUp.type === 'email' ? '邮件跟进' :
                    savedFollowUp.type === 'message' ? '消息跟进' : '跟进记录';
        res.status(201).json({
            success: true,
            code: 200,
            data: {
                id: savedFollowUp.id,
                customerId: savedFollowUp.customerId,
                type: savedFollowUp.type,
                title: title,
                content: savedFollowUp.content,
                status: savedFollowUp.status,
                priority: savedFollowUp.priority,
                nextFollowUp: savedFollowUp.nextFollowUp?.toISOString() || '',
                author: savedFollowUp.createdByName || savedFollowUp.createdBy || '系统',
                createTime: savedFollowUp.createdAt?.toISOString() || ''
            }
        });
    }
    catch (error) {
        console.error('添加跟进记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '添加跟进记录失败' });
    }
});
/**
 * @route PUT /api/v1/customers/:id/followups/:followUpId
 * @desc 更新客户跟进记录
 * @access Private
 */
router.put('/:id/followups/:followUpId', async (req, res) => {
    try {
        const { followUpId } = req.params;
        const { type, content, status, priority, nextFollowUp } = req.body;
        const { FollowUp } = await Promise.resolve().then(() => __importStar(require('../entities/FollowUp')));
        const followUpRepository = database_1.AppDataSource.getRepository(FollowUp);
        const followUp = await followUpRepository.findOne({ where: { id: followUpId } });
        if (!followUp) {
            return res.status(404).json({ success: false, code: 404, message: '跟进记录不存在' });
        }
        if (type !== undefined)
            followUp.type = type;
        if (content !== undefined)
            followUp.content = content;
        if (status !== undefined)
            followUp.status = status;
        if (priority !== undefined)
            followUp.priority = priority;
        if (nextFollowUp !== undefined)
            followUp.nextFollowUp = nextFollowUp ? new Date(nextFollowUp) : undefined;
        const updatedFollowUp = await followUpRepository.save(followUp);
        const title = updatedFollowUp.type === 'call' ? '电话跟进' :
            updatedFollowUp.type === 'visit' ? '上门拜访' :
                updatedFollowUp.type === 'email' ? '邮件跟进' :
                    updatedFollowUp.type === 'message' ? '消息跟进' : '跟进记录';
        res.json({
            success: true,
            code: 200,
            data: {
                id: updatedFollowUp.id,
                type: updatedFollowUp.type,
                title: title,
                content: updatedFollowUp.content,
                status: updatedFollowUp.status,
                priority: updatedFollowUp.priority,
                nextFollowUp: updatedFollowUp.nextFollowUp?.toISOString() || '',
                author: updatedFollowUp.createdByName || updatedFollowUp.createdBy || '系统',
                createTime: updatedFollowUp.createdAt?.toISOString() || ''
            }
        });
    }
    catch (error) {
        console.error('更新跟进记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '更新跟进记录失败' });
    }
});
/**
 * @route DELETE /api/v1/customers/:id/followups/:followUpId
 * @desc 删除客户跟进记录
 * @access Private
 */
router.delete('/:id/followups/:followUpId', async (req, res) => {
    try {
        const { followUpId } = req.params;
        const { FollowUp } = await Promise.resolve().then(() => __importStar(require('../entities/FollowUp')));
        const followUpRepository = database_1.AppDataSource.getRepository(FollowUp);
        const followUp = await followUpRepository.findOne({ where: { id: followUpId } });
        if (!followUp) {
            return res.status(404).json({ success: false, code: 404, message: '跟进记录不存在' });
        }
        await followUpRepository.remove(followUp);
        res.json({ success: true, code: 200, message: '删除成功' });
    }
    catch (error) {
        console.error('删除跟进记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '删除跟进记录失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/tags
 * @desc 获取客户标签
 * @access Private
 */
router.get('/:id/tags', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: req.params.id } });
        res.json({ success: true, code: 200, data: customer?.tags || [] });
    }
    catch (error) {
        console.error('获取客户标签失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户标签失败' });
    }
});
/**
 * @route POST /api/v1/customers/:id/tags
 * @desc 添加客户标签
 * @access Private
 */
router.post('/:id/tags', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
        }
        const tagData = req.body;
        const newTag = { id: `tag_${Date.now()}`, ...tagData };
        customer.tags = [...(customer.tags || []), newTag];
        await customerRepository.save(customer);
        res.status(201).json({ success: true, code: 200, data: newTag });
    }
    catch (error) {
        console.error('添加客户标签失败:', error);
        res.status(500).json({ success: false, code: 500, message: '添加客户标签失败' });
    }
});
/**
 * @route DELETE /api/v1/customers/:id/tags/:tagId
 * @desc 删除客户标签
 * @access Private
 */
router.delete('/:id/tags/:tagId', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
        }
        customer.tags = (customer.tags || []).filter((tag) => tag.id !== req.params.tagId);
        await customerRepository.save(customer);
        res.json({ success: true, code: 200, message: '删除成功' });
    }
    catch (error) {
        console.error('删除客户标签失败:', error);
        res.status(500).json({ success: false, code: 500, message: '删除客户标签失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/medical-history
 * @desc 获取客户疾病史
 * @access Private
 */
router.get('/:id/medical-history', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
        }
        // 疾病史存储在 medicalHistory 字段中，可能是字符串或JSON数组
        let medicalRecords = [];
        if (customer.medicalHistory) {
            // 尝试解析为JSON数组
            try {
                const parsed = JSON.parse(customer.medicalHistory);
                if (Array.isArray(parsed)) {
                    medicalRecords = parsed;
                }
                else {
                    // 如果是字符串，转换为单条记录
                    medicalRecords = [{
                            id: 1,
                            content: customer.medicalHistory,
                            createTime: customer.createdAt?.toISOString() || '',
                            operator: '系统'
                        }];
                }
            }
            catch {
                // 解析失败，作为纯文本处理
                medicalRecords = [{
                        id: 1,
                        content: customer.medicalHistory,
                        createTime: customer.createdAt?.toISOString() || '',
                        operator: '系统'
                    }];
            }
        }
        console.log(`[客户疾病史] 客户 ${req.params.id} 有 ${medicalRecords.length} 条疾病史记录`);
        res.json({ success: true, code: 200, data: medicalRecords });
    }
    catch (error) {
        console.error('获取客户疾病史失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户疾病史失败' });
    }
});
/**
 * @route POST /api/v1/customers/:id/medical-history
 * @desc 添加客户疾病史记录
 * @access Private
 */
router.post('/:id/medical-history', async (req, res) => {
    try {
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const customer = await customerRepository.findOne({ where: { id: req.params.id } });
        if (!customer) {
            return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
        }
        const { content } = req.body;
        // 🔥 修复：使用正确的currentUser字段
        const currentUser = req.currentUser;
        // 解析现有疾病史
        let medicalRecords = [];
        if (customer.medicalHistory) {
            try {
                const parsed = JSON.parse(customer.medicalHistory);
                if (Array.isArray(parsed)) {
                    medicalRecords = parsed;
                }
                else {
                    medicalRecords = [{
                            id: 1,
                            content: customer.medicalHistory,
                            createTime: customer.createdAt?.toISOString() || '',
                            operator: '系统'
                        }];
                }
            }
            catch {
                medicalRecords = [{
                        id: 1,
                        content: customer.medicalHistory,
                        createTime: customer.createdAt?.toISOString() || '',
                        operator: '系统'
                    }];
            }
        }
        // 添加新记录
        // 🔥 修复：优先使用 realName，其次 name，最后才是 '系统'
        const operatorName = currentUser?.realName || currentUser?.name || '系统';
        console.log('[疾病史] 添加记录，操作人:', operatorName, '当前用户:', currentUser?.id, currentUser?.realName, currentUser?.name);
        const newRecord = {
            id: Date.now(),
            content: content,
            createTime: new Date().toISOString(),
            operator: operatorName,
            operationType: 'add'
        };
        medicalRecords.unshift(newRecord);
        // 保存到数据库
        customer.medicalHistory = JSON.stringify(medicalRecords);
        await customerRepository.save(customer);
        console.log(`[添加疾病史] 客户 ${req.params.id} 添加疾病史成功`);
        res.status(201).json({ success: true, code: 200, data: newRecord });
    }
    catch (error) {
        console.error('添加客户疾病史失败:', error);
        res.status(500).json({ success: false, code: 500, message: '添加客户疾病史失败' });
    }
});
/**
 * @route GET /api/v1/customers/:id/stats
 * @desc 获取客户统计数据（累计消费、订单数量、退货次数、最后下单时间）
 * @access Private
 */
router.get('/:id/stats', async (req, res) => {
    try {
        const customerId = req.params.id;
        const customerRepository = database_1.AppDataSource.getRepository(Customer_1.Customer);
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        // 获取客户基本信息
        const customer = await customerRepository.findOne({ where: { id: customerId } });
        if (!customer) {
            return res.status(404).json({ success: false, code: 404, message: '客户不存在' });
        }
        // 从订单表统计数据
        const orders = await orderRepository.find({
            where: { customerId },
            order: { createdAt: 'DESC' }
        });
        // 计算累计消费（统计已审核通过及之后状态的订单）
        // 🔥 修复：包含待发货、已发货、已签收、已完成等状态
        const validStatuses = ['approved', 'pending_shipment', 'shipped', 'delivered', 'signed', 'completed', 'paid'];
        const validOrders = orders.filter(o => validStatuses.includes(o.status));
        const totalConsumption = validOrders.reduce((sum, order) => sum + (Number(order.totalAmount) || 0), 0);
        console.log(`[客户统计] 客户 ${customerId}: 有效订单状态=${validStatuses.join(',')}, 有效订单数=${validOrders.length}`);
        // 订单数量
        const orderCount = orders.length;
        // 退货次数（统计退款/取消的订单）
        const returnStatuses = ['refunded', 'cancelled'];
        const returnCount = orders.filter(o => returnStatuses.includes(o.status)).length;
        // 最后下单时间
        const lastOrder = orders[0];
        const lastOrderDate = lastOrder?.createdAt
            ? new Date(lastOrder.createdAt).toLocaleDateString('zh-CN')
            : null;
        console.log(`[客户统计] 客户 ${customerId}: 消费¥${totalConsumption}, 订单${orderCount}个, 退货${returnCount}次`);
        res.json({
            success: true,
            code: 200,
            data: {
                totalConsumption,
                orderCount,
                returnCount,
                lastOrderDate
            }
        });
    }
    catch (error) {
        console.error('获取客户统计数据失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取客户统计数据失败' });
    }
});
exports.default = router;
//# sourceMappingURL=customers.js.map