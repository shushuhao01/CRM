"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const database_1 = require("../config/database");
const AfterSalesService_1 = require("../entities/AfterSalesService");
const auth_1 = require("../middleware/auth");
// import { Like, In } from 'typeorm'; // 暂时未使用
const router = (0, express_1.Router)();
// 获取售后服务仓库
const getServiceRepository = () => {
    const dataSource = (0, database_1.getDataSource)();
    if (!dataSource) {
        throw new Error('数据库连接未初始化');
    }
    return dataSource.getRepository(AfterSalesService_1.AfterSalesService);
};
/**
 * 获取售后服务列表
 * GET /api/v1/services
 * 支持数据权限过滤：
 * - 超管/管理员/客服：查看所有
 * - 经理：查看本部门的
 * - 销售员：查看自己创建的
 */
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const currentUser = req.user;
        const { page = 1, limit = 20, status, serviceType, search, orderNumber } = req.query;
        const queryBuilder = serviceRepository.createQueryBuilder('service');
        // 数据权限过滤
        const role = currentUser?.role || '';
        const allowAllRoles = ['super_admin', 'superadmin', 'admin', 'service', 'customer_service'];
        if (!allowAllRoles.includes(role)) {
            if (role === 'manager' || role === 'department_manager') {
                // 经理看本部门的
                if (currentUser?.departmentId) {
                    queryBuilder.andWhere('service.departmentId = :departmentId', {
                        departmentId: currentUser.departmentId
                    });
                }
            }
            else {
                // 销售员只看自己创建的
                queryBuilder.andWhere('service.createdById = :userId', {
                    userId: currentUser?.userId
                });
            }
        }
        // 状态筛选
        if (status) {
            queryBuilder.andWhere('service.status = :status', { status });
        }
        // 服务类型筛选
        if (serviceType) {
            queryBuilder.andWhere('service.serviceType = :serviceType', { serviceType });
        }
        // 订单号搜索
        if (orderNumber) {
            queryBuilder.andWhere('service.orderNumber LIKE :orderNumber', {
                orderNumber: `%${orderNumber}%`
            });
        }
        // 关键词搜索
        if (search) {
            queryBuilder.andWhere('(service.serviceNumber LIKE :search OR service.customerName LIKE :search OR service.orderNumber LIKE :search)', { search: `%${search}%` });
        }
        // 分页
        const offset = (Number(page) - 1) * Number(limit);
        queryBuilder.skip(offset).take(Number(limit));
        // 排序
        queryBuilder.orderBy('service.createdAt', 'DESC');
        const [services, total] = await queryBuilder.getManyAndCount();
        // 格式化返回数据
        const formattedServices = services.map(service => ({
            id: service.id,
            serviceNumber: service.serviceNumber,
            orderId: service.orderId,
            orderNumber: service.orderNumber,
            customerId: service.customerId,
            customerName: service.customerName,
            customerPhone: service.customerPhone,
            serviceType: service.serviceType,
            status: service.status,
            priority: service.priority,
            reason: service.reason,
            description: service.description,
            productName: service.productName,
            productSpec: service.productSpec,
            quantity: service.quantity,
            price: service.price,
            contactName: service.contactName,
            contactPhone: service.contactPhone,
            contactAddress: service.contactAddress,
            assignedTo: service.assignedTo,
            assignedToId: service.assignedToId,
            remark: service.remark,
            attachments: service.attachments || [],
            createdBy: service.createdBy,
            createdById: service.createdById,
            departmentId: service.departmentId,
            createTime: service.createdAt?.toISOString().replace('T', ' ').substring(0, 19),
            updateTime: service.updatedAt?.toISOString().replace('T', ' ').substring(0, 19),
            expectedTime: service.expectedTime?.toISOString().replace('T', ' ').substring(0, 19),
            resolvedTime: service.resolvedTime?.toISOString().replace('T', ' ').substring(0, 19)
        }));
        res.json({
            success: true,
            data: {
                items: formattedServices,
                total,
                page: Number(page),
                limit: Number(limit),
                totalPages: Math.ceil(total / Number(limit))
            }
        });
    }
    catch (error) {
        console.error('[Services] 获取售后服务列表失败:', error);
        res.status(500).json({
            success: false,
            message: '获取售后服务列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 获取售后服务详情
 * GET /api/v1/services/:id
 */
router.get('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        res.json({
            success: true,
            data: {
                id: service.id,
                serviceNumber: service.serviceNumber,
                orderId: service.orderId,
                orderNumber: service.orderNumber,
                customerId: service.customerId,
                customerName: service.customerName,
                customerPhone: service.customerPhone,
                serviceType: service.serviceType,
                status: service.status,
                priority: service.priority,
                reason: service.reason,
                description: service.description,
                productName: service.productName,
                productSpec: service.productSpec,
                quantity: service.quantity,
                price: service.price,
                contactName: service.contactName,
                contactPhone: service.contactPhone,
                contactAddress: service.contactAddress,
                assignedTo: service.assignedTo,
                assignedToId: service.assignedToId,
                remark: service.remark,
                attachments: service.attachments || [],
                createdBy: service.createdBy,
                createdById: service.createdById,
                departmentId: service.departmentId,
                createTime: service.createdAt?.toISOString().replace('T', ' ').substring(0, 19),
                updateTime: service.updatedAt?.toISOString().replace('T', ' ').substring(0, 19),
                expectedTime: service.expectedTime?.toISOString().replace('T', ' ').substring(0, 19),
                resolvedTime: service.resolvedTime?.toISOString().replace('T', ' ').substring(0, 19)
            }
        });
    }
    catch (error) {
        console.error('[Services] 获取售后服务详情失败:', error);
        res.status(500).json({
            success: false,
            message: '获取售后服务详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 创建售后服务
 * POST /api/v1/services
 */
router.post('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const currentUser = req.user;
        const data = req.body;
        // 生成ID和服务单号
        const timestamp = Date.now();
        const serviceId = `SH${timestamp}${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
        const serviceNumber = `SH${timestamp}`;
        const service = serviceRepository.create({
            id: serviceId,
            serviceNumber,
            orderId: data.orderId || null,
            orderNumber: data.orderNumber || null,
            customerId: data.customerId || null,
            customerName: data.customerName || null,
            customerPhone: data.customerPhone || null,
            serviceType: data.serviceType || 'return',
            status: 'pending',
            priority: data.priority || 'normal',
            reason: data.reason || null,
            description: data.description || null,
            productName: data.productName || null,
            productSpec: data.productSpec || null,
            quantity: data.quantity || 1,
            price: data.price || 0,
            contactName: data.contactName || null,
            contactPhone: data.contactPhone || null,
            contactAddress: data.contactAddress || null,
            assignedTo: data.assignedTo || null,
            assignedToId: data.assignedToId || null,
            remark: data.remark || null,
            attachments: data.attachments || [],
            createdBy: currentUser?.username || data.createdBy || null,
            createdById: currentUser?.userId || data.createdById || null,
            departmentId: currentUser?.departmentId || data.departmentId || null,
            expectedTime: data.expectedTime ? new Date(data.expectedTime) : null
        });
        const savedService = await serviceRepository.save(service);
        console.log('[Services] 创建售后服务成功:', savedService.serviceNumber);
        res.status(201).json({
            success: true,
            message: '创建售后服务成功',
            data: {
                id: savedService.id,
                serviceNumber: savedService.serviceNumber,
                status: savedService.status,
                createTime: savedService.createdAt?.toISOString().replace('T', ' ').substring(0, 19)
            }
        });
    }
    catch (error) {
        console.error('[Services] 创建售后服务失败:', error);
        res.status(500).json({
            success: false,
            message: '创建售后服务失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 更新售后服务
 * PUT /api/v1/services/:id
 */
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const data = req.body;
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        // 更新字段
        if (data.serviceType !== undefined)
            service.serviceType = data.serviceType;
        if (data.status !== undefined)
            service.status = data.status;
        if (data.priority !== undefined)
            service.priority = data.priority;
        if (data.reason !== undefined)
            service.reason = data.reason;
        if (data.description !== undefined)
            service.description = data.description;
        if (data.assignedTo !== undefined)
            service.assignedTo = data.assignedTo;
        if (data.assignedToId !== undefined)
            service.assignedToId = data.assignedToId;
        if (data.remark !== undefined)
            service.remark = data.remark;
        if (data.expectedTime !== undefined)
            service.expectedTime = data.expectedTime ? new Date(data.expectedTime) : null;
        // 如果状态变为已解决，记录解决时间
        if (data.status === 'resolved' && !service.resolvedTime) {
            service.resolvedTime = new Date();
        }
        const updatedService = await serviceRepository.save(service);
        console.log('[Services] 更新售后服务成功:', updatedService.serviceNumber);
        res.json({
            success: true,
            message: '更新售后服务成功',
            data: {
                id: updatedService.id,
                serviceNumber: updatedService.serviceNumber,
                status: updatedService.status,
                updateTime: updatedService.updatedAt?.toISOString().replace('T', ' ').substring(0, 19)
            }
        });
    }
    catch (error) {
        console.error('[Services] 更新售后服务失败:', error);
        res.status(500).json({
            success: false,
            message: '更新售后服务失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 更新售后服务状态
 * PATCH /api/v1/services/:id/status
 */
router.patch('/:id/status', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const { status, remark } = req.body;
        if (!['pending', 'processing', 'resolved', 'closed'].includes(status)) {
            return res.status(400).json({
                success: false,
                message: '无效的状态值'
            });
        }
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        service.status = status;
        if (remark)
            service.remark = remark;
        // 如果状态变为已解决，记录解决时间
        if (status === 'resolved' && !service.resolvedTime) {
            service.resolvedTime = new Date();
        }
        const updatedService = await serviceRepository.save(service);
        res.json({
            success: true,
            message: '状态更新成功',
            data: {
                id: updatedService.id,
                status: updatedService.status
            }
        });
    }
    catch (error) {
        console.error('[Services] 更新售后服务状态失败:', error);
        res.status(500).json({
            success: false,
            message: '更新状态失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 分配处理人
 * PATCH /api/v1/services/:id/assign
 */
router.patch('/:id/assign', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const { assignedTo, assignedToId, remark } = req.body;
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        service.assignedTo = assignedTo;
        service.assignedToId = assignedToId;
        if (remark)
            service.remark = remark;
        // 分配后自动变为处理中
        if (service.status === 'pending') {
            service.status = 'processing';
        }
        const updatedService = await serviceRepository.save(service);
        res.json({
            success: true,
            message: '分配成功',
            data: {
                id: updatedService.id,
                assignedTo: updatedService.assignedTo,
                status: updatedService.status
            }
        });
    }
    catch (error) {
        console.error('[Services] 分配处理人失败:', error);
        res.status(500).json({
            success: false,
            message: '分配失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 设置优先级
 * PATCH /api/v1/services/:id/priority
 */
router.patch('/:id/priority', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const { priority, remark } = req.body;
        if (!['low', 'normal', 'high', 'urgent'].includes(priority)) {
            return res.status(400).json({
                success: false,
                message: '无效的优先级值'
            });
        }
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        service.priority = priority;
        if (remark)
            service.remark = remark;
        const updatedService = await serviceRepository.save(service);
        res.json({
            success: true,
            message: '优先级设置成功',
            data: {
                id: updatedService.id,
                priority: updatedService.priority
            }
        });
    }
    catch (error) {
        console.error('[Services] 设置优先级失败:', error);
        res.status(500).json({
            success: false,
            message: '设置优先级失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 删除售后服务
 * DELETE /api/v1/services/:id
 */
router.delete('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const { id } = req.params;
        const service = await serviceRepository.findOne({ where: { id } });
        if (!service) {
            return res.status(404).json({
                success: false,
                message: '售后服务不存在'
            });
        }
        await serviceRepository.remove(service);
        console.log('[Services] 删除售后服务成功:', service.serviceNumber);
        res.json({
            success: true,
            message: '删除成功'
        });
    }
    catch (error) {
        console.error('[Services] 删除售后服务失败:', error);
        res.status(500).json({
            success: false,
            message: '删除失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 获取售后服务统计
 * GET /api/v1/services/statistics
 */
router.get('/stats/summary', auth_1.authenticateToken, async (req, res) => {
    try {
        const serviceRepository = getServiceRepository();
        const currentUser = req.user;
        const queryBuilder = serviceRepository.createQueryBuilder('service');
        // 数据权限过滤
        const role = currentUser?.role || '';
        const allowAllRoles = ['super_admin', 'superadmin', 'admin', 'service', 'customer_service'];
        if (!allowAllRoles.includes(role)) {
            if (role === 'manager' || role === 'department_manager') {
                if (currentUser?.departmentId) {
                    queryBuilder.andWhere('service.departmentId = :departmentId', {
                        departmentId: currentUser.departmentId
                    });
                }
            }
            else {
                queryBuilder.andWhere('service.createdById = :userId', {
                    userId: currentUser?.userId
                });
            }
        }
        const total = await queryBuilder.getCount();
        const pendingCount = await queryBuilder.clone()
            .andWhere('service.status = :status', { status: 'pending' })
            .getCount();
        const processingCount = await queryBuilder.clone()
            .andWhere('service.status = :status', { status: 'processing' })
            .getCount();
        const resolvedCount = await queryBuilder.clone()
            .andWhere('service.status = :status', { status: 'resolved' })
            .getCount();
        const closedCount = await queryBuilder.clone()
            .andWhere('service.status = :status', { status: 'closed' })
            .getCount();
        res.json({
            success: true,
            data: {
                total,
                pending: pendingCount,
                processing: processingCount,
                resolved: resolvedCount,
                closed: closedCount
            }
        });
    }
    catch (error) {
        console.error('[Services] 获取统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取统计失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
exports.default = router;
//# sourceMappingURL=services.js.map