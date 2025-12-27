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
const Order_1 = require("../entities/Order");
const Product_1 = require("../entities/Product");
const SystemConfig_1 = require("../entities/SystemConfig");
const DepartmentOrderLimit_1 = require("../entities/DepartmentOrderLimit");
const OrderStatusHistory_1 = require("../entities/OrderStatusHistory");
const OrderNotificationService_1 = require("../services/OrderNotificationService");
// Like 和 Between 现在通过 QueryBuilder 使用，不再直接导入
// import { Like, Between } from 'typeorm';
// 🔥 保存订单状态历史记录
const saveStatusHistory = async (orderId, status, operatorId, operatorName, notes) => {
    try {
        const statusHistoryRepository = database_1.AppDataSource.getRepository(OrderStatusHistory_1.OrderStatusHistory);
        const history = statusHistoryRepository.create({
            orderId,
            status: status,
            operatorId: operatorId ? Number(operatorId) : undefined,
            operatorName,
            notes
        });
        await statusHistoryRepository.save(history);
        console.log(`[状态历史] ✅ 保存成功: orderId=${orderId}, status=${status}, operator=${operatorName}`);
    }
    catch (error) {
        console.error(`[状态历史] ❌ 保存失败:`, error);
    }
};
// 格式化时间为北京时间友好格式 (YYYY/MM/DD HH:mm:ss)
const formatToBeijingTime = (date) => {
    if (!date)
        return '';
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isNaN(d.getTime()))
        return '';
    // 转换为北京时间 (UTC+8)
    const beijingOffset = 8 * 60; // 北京时间偏移分钟数
    const localOffset = d.getTimezoneOffset(); // 本地时区偏移分钟数
    const beijingTime = new Date(d.getTime() + (beijingOffset + localOffset) * 60 * 1000);
    const year = beijingTime.getFullYear();
    const month = String(beijingTime.getMonth() + 1).padStart(2, '0');
    const day = String(beijingTime.getDate()).padStart(2, '0');
    const hours = String(beijingTime.getHours()).padStart(2, '0');
    const minutes = String(beijingTime.getMinutes()).padStart(2, '0');
    const seconds = String(beijingTime.getSeconds()).padStart(2, '0');
    return `${year}/${month}/${day} ${hours}:${minutes}:${seconds}`;
};
const checkDepartmentOrderLimit = async (departmentId, customerId, orderAmount) => {
    try {
        // 获取部门下单限制配置
        const limitRepository = database_1.AppDataSource.getRepository(DepartmentOrderLimit_1.DepartmentOrderLimit);
        const limit = await limitRepository.findOne({
            where: { departmentId, isEnabled: true }
        });
        // 如果没有配置或配置未启用，允许下单
        if (!limit) {
            return { allowed: true };
        }
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        // 检查下单次数限制
        if (limit.orderCountEnabled && limit.maxOrderCount > 0) {
            const orderCount = await orderRepository.count({
                where: {
                    customerId,
                    createdByDepartmentId: departmentId
                }
            });
            if (orderCount >= limit.maxOrderCount) {
                return {
                    allowed: false,
                    message: `该客户在本部门已下单${orderCount}次，已达到最大下单次数限制(${limit.maxOrderCount}次)，请联系管理员`,
                    limitType: 'order_count'
                };
            }
        }
        // 检查单笔金额限制
        if (limit.singleAmountEnabled && limit.maxSingleAmount > 0) {
            if (orderAmount > Number(limit.maxSingleAmount)) {
                return {
                    allowed: false,
                    message: `订单金额¥${orderAmount.toFixed(2)}超出单笔金额限制(¥${Number(limit.maxSingleAmount).toFixed(2)})，请联系管理员`,
                    limitType: 'single_amount'
                };
            }
        }
        // 检查累计金额限制
        if (limit.totalAmountEnabled && limit.maxTotalAmount > 0) {
            const result = await orderRepository
                .createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.customerId = :customerId', { customerId })
                .andWhere('order.createdByDepartmentId = :departmentId', { departmentId })
                .getRawOne();
            const currentTotal = Number(result?.total || 0);
            const newTotal = currentTotal + orderAmount;
            if (newTotal > Number(limit.maxTotalAmount)) {
                return {
                    allowed: false,
                    message: `该客户在本部门累计金额将达到¥${newTotal.toFixed(2)}，超出累计金额限制(¥${Number(limit.maxTotalAmount).toFixed(2)})，请联系管理员`,
                    limitType: 'total_amount'
                };
            }
        }
        return { allowed: true };
    }
    catch (error) {
        console.error('检查部门下单限制失败:', error);
        // 出错时默认允许下单，避免影响正常业务
        return { allowed: true };
    }
};
// 获取订单流转配置
const getOrderTransferConfig = async () => {
    try {
        const configRepository = database_1.AppDataSource.getRepository(SystemConfig_1.SystemConfig);
        const modeConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferMode', configGroup: 'order_settings', isEnabled: true }
        });
        const delayConfig = await configRepository.findOne({
            where: { configKey: 'orderTransferDelayMinutes', configGroup: 'order_settings', isEnabled: true }
        });
        return {
            mode: modeConfig?.configValue || 'delayed',
            delayMinutes: delayConfig ? Number(delayConfig.configValue) : 3
        };
    }
    catch {
        return { mode: 'delayed', delayMinutes: 3 };
    }
};
const router = (0, express_1.Router)();
// 所有订单路由都需要认证
router.use(auth_1.authenticateToken);
// ========== 特殊路由（必须在 /:id 之前定义）==========
/**
 * @route GET /api/v1/orders/transfer-config
 * @desc 获取订单流转配置
 * @access Private
 */
router.get('/transfer-config', async (_req, res) => {
    try {
        const config = await getOrderTransferConfig();
        res.json({
            success: true,
            code: 200,
            data: config
        });
    }
    catch (error) {
        console.error('获取流转配置失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取流转配置失败'
        });
    }
});
/**
 * @route POST /api/v1/orders/check-transfer
 * @desc 检查并执行订单流转
 * @access Private
 */
router.post('/check-transfer', async (_req, res) => {
    try {
        console.log('🔄 [订单流转] 检查待流转订单...');
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const transferConfig = await getOrderTransferConfig();
        const now = new Date();
        const delayMs = transferConfig.delayMinutes * 60 * 1000;
        // 查找所有待流转的订单（状态为pending_transfer且markType为normal）
        const pendingOrders = await orderRepository.find({
            where: {
                status: 'pending_transfer',
                markType: 'normal'
            }
        });
        console.log(`🔍 [订单流转] 找到 ${pendingOrders.length} 个待流转订单`);
        const transferredOrders = [];
        for (const order of pendingOrders) {
            if (!order.createdAt)
                continue;
            const transferTime = new Date(order.createdAt.getTime() + delayMs);
            // 检查是否已到流转时间
            if (now >= transferTime) {
                console.log(`⏰ [订单流转] 订单 ${order.orderNumber} 已到流转时间，执行流转`);
                // 更新订单状态
                order.status = 'pending_audit';
                order.updatedAt = now;
                await orderRepository.save(order);
                transferredOrders.push(order);
                // 🔥 发送待审核通知给下单员和管理员
                OrderNotificationService_1.orderNotificationService.notifyOrderPendingAudit({
                    id: order.id,
                    orderNumber: order.orderNumber,
                    customerName: order.customerName,
                    totalAmount: Number(order.totalAmount),
                    createdBy: order.createdBy,
                    createdByName: order.createdByName
                }).catch(err => console.error('[订单流转] 发送通知失败:', err));
                console.log(`✅ [订单流转] 订单 ${order.orderNumber} 已流转到待审核状态`);
            }
        }
        console.log(`📊 [订单流转] 本次流转 ${transferredOrders.length} 个订单`);
        res.json({
            success: true,
            code: 200,
            message: '订单流转检查完成',
            data: {
                transferredCount: transferredOrders.length,
                orders: transferredOrders.map(o => ({
                    id: o.id,
                    orderNumber: o.orderNumber,
                    status: o.status
                }))
            }
        });
    }
    catch (error) {
        console.error('❌ [订单流转] 检查失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '订单流转检查失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/statistics
 * @desc 获取订单统计数据
 * @access Private
 */
router.get('/statistics', async (_req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const pendingCount = await orderRepository.count({
            where: { status: 'pending' }
        });
        const todayCount = await orderRepository.createQueryBuilder('order')
            .where('order.createdAt >= :today', { today })
            .getCount();
        const pendingAmountResult = await orderRepository.createQueryBuilder('order')
            .select('SUM(order.totalAmount)', 'total')
            .where('order.status = :status', { status: 'pending' })
            .getRawOne();
        res.json({
            success: true,
            code: 200,
            data: {
                pendingCount,
                todayCount,
                pendingAmount: Number(pendingAmountResult?.total || 0),
                urgentCount: 0
            }
        });
    }
    catch (error) {
        console.error('获取订单统计失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取订单统计失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/audit-list
 * @desc 获取审核订单列表（优化版，只返回需要审核的订单）
 * @access Private
 */
router.get('/audit-list', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const startTime = Date.now();
        const { page = 1, pageSize = 20, status = 'pending_audit', // 默认只查待审核
        orderNumber, customerName, startDate, endDate } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = Math.min(parseInt(pageSize) || 20, 100); // 限制最大100条
        const skip = (pageNum - 1) * pageSizeNum;
        console.log(`📋 [审核列表] 查询参数: status=${status}, page=${pageNum}, pageSize=${pageSizeNum}`);
        // 🔥 调试：先查询所有订单的状态分布
        const statusCountQuery = await orderRepository.createQueryBuilder('order')
            .select('order.status', 'status')
            .addSelect('COUNT(*)', 'count')
            .groupBy('order.status')
            .getRawMany();
        console.log(`📋 [审核列表] 订单状态分布:`, statusCountQuery);
        // 🔥 优化：使用QueryBuilder只查询需要的字段
        const queryBuilder = orderRepository.createQueryBuilder('order')
            .select([
            'order.id',
            'order.orderNumber',
            'order.customerId',
            'order.customerName',
            'order.customerPhone',
            'order.totalAmount',
            'order.depositAmount',
            'order.status',
            'order.markType',
            'order.paymentStatus',
            'order.paymentMethod',
            'order.remark',
            'order.createdBy',
            'order.createdByName',
            'order.createdAt',
            'order.shippingName',
            'order.shippingPhone',
            'order.shippingAddress',
            'order.products'
        ]);
        // 状态筛选
        if (status === 'pending_audit') {
            queryBuilder.where('order.status = :status', { status: 'pending_audit' });
            console.log(`📋 [审核列表] 筛选待审核订单: status=pending_audit`);
        }
        else if (status === 'approved') {
            // 🔥 修复：已审核通过的订单状态只包括审核通过后的状态
            // 不包括 pending_transfer（待流转）和 pending_audit（待审核）
            const approvedStatuses = ['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'];
            queryBuilder.where('order.status IN (:...statuses)', {
                statuses: approvedStatuses
            });
            console.log(`📋 [审核列表] 筛选已审核通过订单: statuses=${approvedStatuses.join(', ')}`);
        }
        else if (status === 'rejected') {
            queryBuilder.where('order.status = :status', { status: 'audit_rejected' });
            console.log(`📋 [审核列表] 筛选审核拒绝订单: status=audit_rejected`);
        }
        else if (status) {
            // 🔥 修复：其他状态直接使用传入的状态值
            queryBuilder.where('order.status = :status', { status });
            console.log(`📋 [审核列表] 筛选其他状态订单: status=${status}`);
        }
        // 订单号筛选
        if (orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
        }
        // 客户名称筛选
        if (customerName) {
            queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
        }
        // 日期范围筛选
        if (startDate && endDate) {
            queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            });
        }
        // 🔥 优化：先获取总数（使用count查询更快）
        const total = await queryBuilder.getCount();
        // 排序和分页
        queryBuilder.orderBy('order.createdAt', 'DESC')
            .skip(skip)
            .take(pageSizeNum);
        const orders = await queryBuilder.getMany();
        const queryTime = Date.now() - startTime;
        console.log(`📋 [审核列表] 查询完成: ${orders.length}条, 总数${total}, 耗时${queryTime}ms`);
        // 🔥 优化：简化数据转换
        const list = orders.map(order => {
            let products = [];
            if (order.products) {
                try {
                    products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
                }
                catch {
                    products = [];
                }
            }
            return {
                id: order.id,
                orderNo: order.orderNumber,
                orderNumber: order.orderNumber,
                customerId: order.customerId || '',
                customerName: order.customerName || '',
                customerPhone: order.customerPhone || '',
                products,
                totalAmount: Number(order.totalAmount) || 0,
                depositAmount: Number(order.depositAmount) || 0,
                collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
                status: order.status,
                // 🔥 修复：正确映射auditStatus
                // pending_audit 和 pending_transfer -> pending（待审核）
                // audit_rejected -> rejected（审核拒绝）
                // pending_shipment, shipped, delivered, paid, completed -> approved（已审核通过）
                auditStatus: (order.status === 'pending_audit' || order.status === 'pending_transfer') ? 'pending' :
                    order.status === 'audit_rejected' ? 'rejected' :
                        ['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status) ? 'approved' : 'pending',
                markType: order.markType || 'normal',
                paymentStatus: order.paymentStatus || 'unpaid',
                paymentMethod: order.paymentMethod || '',
                remark: order.remark || '',
                salesPerson: order.createdByName || '',
                createdBy: order.createdBy || '',
                createdByName: order.createdByName || '',
                createTime: formatToBeijingTime(order.createdAt),
                receiverName: order.shippingName || '',
                receiverPhone: order.shippingPhone || '',
                deliveryAddress: order.shippingAddress || ''
            };
        });
        res.json({
            success: true,
            code: 200,
            message: '获取审核订单列表成功',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    }
    catch (error) {
        console.error('❌ [审核列表] 获取失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取审核订单列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/audit-statistics
 * @desc 获取审核统计数据（优化版）
 * @access Private
 */
router.get('/audit-statistics', auth_1.authenticateToken, async (_req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const startTime = Date.now();
        // 🔥 优化：使用单个查询获取所有统计数据
        const [pendingCount, approvedCount, rejectedCount, pendingAmountResult, todayCount] = await Promise.all([
            orderRepository.count({ where: { status: 'pending_audit' } }),
            orderRepository.createQueryBuilder('order')
                .where('order.status IN (:...statuses)', { statuses: ['pending_shipment', 'shipped', 'delivered', 'paid'] })
                .getCount(),
            orderRepository.count({ where: { status: 'audit_rejected' } }),
            orderRepository.createQueryBuilder('order')
                .select('SUM(order.totalAmount)', 'total')
                .where('order.status = :status', { status: 'pending_audit' })
                .getRawOne(),
            orderRepository.createQueryBuilder('order')
                .where('order.createdAt >= :today', { today: new Date(new Date().setHours(0, 0, 0, 0)) })
                .andWhere('order.status = :status', { status: 'pending_audit' })
                .getCount()
        ]);
        const queryTime = Date.now() - startTime;
        console.log(`📊 [审核统计] 查询完成: 待审核${pendingCount}, 已通过${approvedCount}, 已拒绝${rejectedCount}, 耗时${queryTime}ms`);
        res.json({
            success: true,
            code: 200,
            data: {
                pendingCount,
                approvedCount,
                rejectedCount,
                pendingAmount: Number(pendingAmountResult?.total || 0),
                todayCount,
                urgentCount: 0
            }
        });
    }
    catch (error) {
        console.error('获取审核统计失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取审核统计失败'
        });
    }
});
/**
 * @route POST /api/v1/orders/cancel-request
 * @desc 提交取消订单申请
 * @access Private
 */
router.post('/cancel-request', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { orderId, reason, description } = req.body;
        const order = await orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        const cancelReason = `${reason}${description ? ` - ${description}` : ''}`;
        order.status = 'pending';
        order.remark = `取消原因: ${cancelReason}`;
        await orderRepository.save(order);
        // 🔥 发送取消申请通知给管理员
        OrderNotificationService_1.orderNotificationService.notifyOrderCancelRequest({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: Number(order.totalAmount),
            createdBy: order.createdBy,
            createdByName: order.createdByName
        }, cancelReason).catch(err => console.error('[取消申请] 发送通知失败:', err));
        res.json({
            success: true,
            code: 200,
            message: '取消申请已提交'
        });
    }
    catch (error) {
        console.error('提交取消申请失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '提交取消申请失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/pending-cancel
 * @desc 获取待审核的取消订单列表
 * @access Private
 */
router.get('/pending-cancel', async (_req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const orders = await orderRepository.createQueryBuilder('order')
            .where('order.status = :status', { status: 'pending' })
            .andWhere('order.remark LIKE :cancelNote', { cancelNote: '%取消原因%' })
            .orderBy('order.updatedAt', 'DESC')
            .getMany();
        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName || '',
            totalAmount: Number(order.totalAmount),
            cancelReason: order.remark || '',
            cancelRequestTime: order.updatedAt?.toISOString() || '',
            status: 'pending_cancel',
            createdBy: order.createdBy || ''
        }));
        res.json({
            success: true,
            code: 200,
            data: formattedOrders
        });
    }
    catch (error) {
        console.error('获取待审核取消订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取待审核取消订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/audited-cancel
 * @desc 获取已审核的取消订单列表
 * @access Private
 */
router.get('/audited-cancel', async (_req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const orders = await orderRepository.find({
            where: { status: 'cancelled' },
            order: { updatedAt: 'DESC' }
        });
        const formattedOrders = orders.map(order => ({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName || '',
            totalAmount: Number(order.totalAmount),
            cancelReason: order.remark || '',
            cancelRequestTime: order.updatedAt?.toISOString() || '',
            status: 'cancelled',
            createdBy: order.createdBy || ''
        }));
        res.json({
            success: true,
            code: 200,
            data: formattedOrders
        });
    }
    catch (error) {
        console.error('获取已审核取消订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取已审核取消订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
// ========== 通用路由 ==========
/**
 * @route GET /api/v1/orders/shipping/pending
 * @desc 获取待发货订单列表（优化版）
 * @access Private
 */
router.get('/shipping/pending', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const startTime = Date.now();
        // 🔥 优化：默认每页20条，最大100条
        const { page = 1, pageSize = 20, orderNumber, customerName } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = Math.min(parseInt(pageSize) || 20, 100);
        const skip = (pageNum - 1) * pageSizeNum;
        // 🔥 优化：使用QueryBuilder只查询需要的字段
        const queryBuilder = orderRepository.createQueryBuilder('order')
            .select([
            'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
            'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
            'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
            'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt',
            'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
            'order.expressCompany', 'order.logisticsStatus', 'order.serviceWechat',
            'order.orderSource', 'order.products',
            'order.customField1', 'order.customField2', 'order.customField3',
            'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
        ])
            .where('order.status = :status', { status: 'pending_shipment' });
        // 支持筛选
        if (orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
        }
        if (customerName) {
            queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
        }
        // 先获取总数
        const total = await queryBuilder.getCount();
        // 分页和排序
        queryBuilder.orderBy('order.createdAt', 'DESC').skip(skip).take(pageSizeNum);
        const orders = await queryBuilder.getMany();
        const queryTime = Date.now() - startTime;
        console.log(`📦 [待发货订单] 查询完成: ${orders.length}条, 总数${total}, 耗时${queryTime}ms`);
        console.log(`📦 [待发货订单] 查询到 ${orders.length} 条待发货订单, 总数: ${total}`);
        // 转换数据格式
        const list = orders.map(order => {
            let products = [];
            if (order.products) {
                try {
                    products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
                }
                catch {
                    products = [];
                }
            }
            return {
                id: order.id,
                orderNumber: order.orderNumber,
                customerId: order.customerId || '',
                customerName: order.customerName || '',
                customerPhone: order.customerPhone || '',
                products: products,
                totalAmount: Number(order.totalAmount) || 0,
                depositAmount: Number(order.depositAmount) || 0,
                collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
                receiverName: order.shippingName || '',
                receiverPhone: order.shippingPhone || '',
                receiverAddress: order.shippingAddress || '',
                remark: order.remark || '',
                status: order.status,
                auditStatus: 'approved',
                markType: order.markType || 'normal',
                paymentStatus: order.paymentStatus || 'unpaid',
                paymentMethod: order.paymentMethod || '',
                serviceWechat: order.serviceWechat || '',
                orderSource: order.orderSource || '',
                expressCompany: order.expressCompany || '',
                logisticsStatus: order.logisticsStatus || '',
                // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
                customFields: {
                    custom_field1: order.customField1 || order.customFields?.custom_field1 || '',
                    custom_field2: order.customField2 || order.customFields?.custom_field2 || '',
                    custom_field3: order.customField3 || order.customFields?.custom_field3 || '',
                    custom_field4: order.customField4 || order.customFields?.custom_field4 || '',
                    custom_field5: order.customField5 || order.customFields?.custom_field5 || '',
                    custom_field6: order.customField6 || order.customFields?.custom_field6 || '',
                    custom_field7: order.customField7 || order.customFields?.custom_field7 || ''
                },
                // 同时返回独立字段便于直接访问
                customField1: order.customField1 || order.customFields?.custom_field1 || '',
                customField2: order.customField2 || order.customFields?.custom_field2 || '',
                customField3: order.customField3 || order.customFields?.custom_field3 || '',
                customField4: order.customField4 || order.customFields?.custom_field4 || '',
                customField5: order.customField5 || order.customFields?.custom_field5 || '',
                customField6: order.customField6 || order.customFields?.custom_field6 || '',
                customField7: order.customField7 || order.customFields?.custom_field7 || '',
                createTime: formatToBeijingTime(order.createdAt),
                createdBy: order.createdBy || '',
                createdByName: order.createdByName || '',
                salesPersonId: order.createdBy || '',
                operatorId: order.createdBy || '',
                operator: order.createdByName || ''
            };
        });
        res.json({
            success: true,
            code: 200,
            message: '获取待发货订单成功',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    }
    catch (error) {
        console.error('❌ [待发货订单] 获取失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取待发货订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/shipping/shipped
 * @desc 获取已发货订单列表（优化版）
 * @access Private
 */
router.get('/shipping/shipped', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const startTime = Date.now();
        // 🔥 优化：默认每页20条，最大100条
        const { page = 1, pageSize = 20, orderNumber, customerName, trackingNumber, status } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = Math.min(parseInt(pageSize) || 20, 100);
        const skip = (pageNum - 1) * pageSizeNum;
        // 🔥 优化：使用QueryBuilder只查询需要的字段
        const queryBuilder = orderRepository.createQueryBuilder('order')
            .select([
            'order.id', 'order.orderNumber', 'order.customerId', 'order.customerName',
            'order.customerPhone', 'order.totalAmount', 'order.depositAmount',
            'order.status', 'order.markType', 'order.paymentStatus', 'order.paymentMethod',
            'order.remark', 'order.createdBy', 'order.createdByName', 'order.createdAt',
            'order.shippingName', 'order.shippingPhone', 'order.shippingAddress',
            'order.expressCompany', 'order.trackingNumber', 'order.logisticsStatus',
            'order.latestLogisticsInfo', // 🔥 新增：最新物流动态
            'order.shippedAt', 'order.serviceWechat', 'order.orderSource', 'order.products',
            'order.customField1', 'order.customField2', 'order.customField3',
            'order.customField4', 'order.customField5', 'order.customField6', 'order.customField7'
        ]);
        // 状态筛选
        if (status && status !== 'all') {
            queryBuilder.where('order.status = :status', { status });
        }
        else {
            queryBuilder.where('order.status IN (:...statuses)', { statuses: ['shipped', 'delivered'] });
        }
        // 支持筛选
        if (orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
        }
        if (customerName) {
            queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
        }
        if (trackingNumber) {
            queryBuilder.andWhere('order.trackingNumber LIKE :trackingNumber', { trackingNumber: `%${trackingNumber}%` });
        }
        // 先获取总数
        const total = await queryBuilder.getCount();
        // 分页和排序
        queryBuilder.orderBy('order.createdAt', 'DESC').skip(skip).take(pageSizeNum);
        const orders = await queryBuilder.getMany();
        const queryTime = Date.now() - startTime;
        console.log(`🚚 [已发货订单] 查询完成: ${orders.length}条, 总数${total}, 耗时${queryTime}ms`);
        // 转换数据格式
        const list = orders.map(order => {
            let products = [];
            if (order.products) {
                try {
                    products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
                }
                catch {
                    products = [];
                }
            }
            return {
                id: order.id,
                orderNumber: order.orderNumber,
                customerId: order.customerId || '',
                customerName: order.customerName || '',
                customerPhone: order.customerPhone || '',
                products: products,
                totalAmount: Number(order.totalAmount) || 0,
                depositAmount: Number(order.depositAmount) || 0,
                collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
                receiverName: order.shippingName || '',
                receiverPhone: order.shippingPhone || '',
                receiverAddress: order.shippingAddress || '',
                remark: order.remark || '',
                status: order.status,
                auditStatus: 'approved',
                markType: order.markType || 'normal',
                paymentStatus: order.paymentStatus || 'unpaid',
                paymentMethod: order.paymentMethod || '',
                serviceWechat: order.serviceWechat || '',
                orderSource: order.orderSource || '',
                trackingNumber: order.trackingNumber || '',
                expressCompany: order.expressCompany || '',
                logisticsStatus: order.logisticsStatus || '',
                // 🔥 新增：最新物流动态（用于避免重复请求已完结的物流）
                latestLogisticsInfo: order.latestLogisticsInfo || '',
                // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
                customFields: {
                    custom_field1: order.customField1 || order.customFields?.custom_field1 || '',
                    custom_field2: order.customField2 || order.customFields?.custom_field2 || '',
                    custom_field3: order.customField3 || order.customFields?.custom_field3 || '',
                    custom_field4: order.customField4 || order.customFields?.custom_field4 || '',
                    custom_field5: order.customField5 || order.customFields?.custom_field5 || '',
                    custom_field6: order.customField6 || order.customFields?.custom_field6 || '',
                    custom_field7: order.customField7 || order.customFields?.custom_field7 || ''
                },
                customField1: order.customField1 || order.customFields?.custom_field1 || '',
                customField2: order.customField2 || order.customFields?.custom_field2 || '',
                customField3: order.customField3 || order.customFields?.custom_field3 || '',
                customField4: order.customField4 || order.customFields?.custom_field4 || '',
                customField5: order.customField5 || order.customFields?.custom_field5 || '',
                customField6: order.customField6 || order.customFields?.custom_field6 || '',
                customField7: order.customField7 || order.customFields?.custom_field7 || '',
                shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
                createTime: formatToBeijingTime(order.createdAt),
                createdBy: order.createdBy || '',
                createdByName: order.createdByName || '',
                salesPersonId: order.createdBy || '',
                operatorId: order.createdBy || '',
                operator: order.createdByName || ''
            };
        });
        res.json({
            success: true,
            code: 200,
            message: '获取已发货订单成功',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    }
    catch (error) {
        console.error('❌ [已发货订单] 获取失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取已发货订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/shipping/statistics
 * @desc 获取物流统计数据（优化版）
 * @access Private
 */
router.get('/shipping/statistics', auth_1.authenticateToken, async (_req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const startTime = Date.now();
        // 🔥 优化：使用并行查询获取所有统计数据
        const [pendingCount, shippedCount, deliveredCount, exceptionCount] = await Promise.all([
            orderRepository.count({ where: { status: 'pending_shipment' } }),
            orderRepository.count({ where: { status: 'shipped' } }),
            orderRepository.count({ where: { status: 'delivered' } }),
            orderRepository.createQueryBuilder('order')
                .where('order.status IN (:...statuses)', {
                statuses: ['rejected', 'package_exception', 'logistics_returned', 'logistics_cancelled']
            })
                .getCount()
        ]);
        const queryTime = Date.now() - startTime;
        console.log(`📊 [物流统计] 查询完成: 待发货${pendingCount}, 已发货${shippedCount}, 已签收${deliveredCount}, 异常${exceptionCount}, 耗时${queryTime}ms`);
        res.json({
            success: true,
            code: 200,
            data: {
                pendingCount,
                shippedCount,
                deliveredCount,
                exceptionCount,
                totalShipped: shippedCount + deliveredCount
            }
        });
    }
    catch (error) {
        console.error('获取物流统计失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取物流统计失败'
        });
    }
});
/**
 * @route GET /api/v1/orders/by-tracking-no
 * @desc 根据物流单号获取订单信息
 * @access Private
 */
router.get('/by-tracking-no', auth_1.authenticateToken, async (req, res) => {
    try {
        const { trackingNo } = req.query;
        if (!trackingNo) {
            return res.status(400).json({
                success: false,
                code: 400,
                message: '缺少物流单号参数'
            });
        }
        console.log('[订单API] 根据物流单号查询订单:', trackingNo);
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({
            where: { trackingNumber: trackingNo }
        });
        if (!order) {
            console.log('[订单API] 未找到对应订单, trackingNo:', trackingNo);
            return res.status(404).json({
                success: false,
                code: 404,
                message: '未找到对应订单'
            });
        }
        // 🔥 优先使用收货人电话，其次使用客户电话
        const phoneToReturn = order.shippingPhone || order.customerPhone || '';
        console.log('[订单API] 找到订单:', order.orderNumber);
        console.log('[订单API] 手机号字段 - shippingPhone:', order.shippingPhone, ', customerPhone:', order.customerPhone);
        console.log('[订单API] 返回手机号:', phoneToReturn || '(空)');
        res.json({
            success: true,
            code: 200,
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                customerPhone: order.customerPhone || '',
                // 🔥 确保receiverPhone有值
                receiverPhone: order.shippingPhone || order.customerPhone || '',
                phone: phoneToReturn,
                expressCompany: order.expressCompany,
                trackingNumber: order.trackingNumber,
                // 🔥 新增：收货地址和发货时间
                shippingAddress: order.shippingAddress || '',
                address: order.shippingAddress || '',
                shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
                shipTime: order.shippedAt ? formatToBeijingTime(order.shippedAt) : ''
            }
        });
    }
    catch (error) {
        console.error('根据物流单号获取订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取订单失败'
        });
    }
});
/**
 * @route GET /api/v1/orders
 * @desc 获取订单列表
 * @access Private
 */
router.get('/', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { page = 1, pageSize = 20, status, orderNumber, customerName, startDate, endDate } = req.query;
        const pageNum = parseInt(page) || 1;
        const pageSizeNum = parseInt(pageSize) || 20;
        const skip = (pageNum - 1) * pageSizeNum;
        // 🔥 获取当前用户信息，用于数据权限过滤
        // 优先使用 req.currentUser（完整用户对象），其次使用 req.user（JWT payload）
        const jwtUser = req.user;
        const dbUser = req.currentUser;
        const userRole = dbUser?.role || jwtUser?.role || '';
        const userId = dbUser?.id || jwtUser?.userId || '';
        const userDepartmentId = dbUser?.departmentId || jwtUser?.departmentId || '';
        console.log(`📋 [订单列表] 用户: ${dbUser?.username || jwtUser?.username}, 角色: ${userRole}, 部门ID: ${userDepartmentId}, 用户ID: ${userId}`);
        // 使用QueryBuilder构建查询，支持更复杂的条件
        const queryBuilder = orderRepository.createQueryBuilder('order');
        // 🔥 数据权限过滤
        // 超级管理员、管理员、客服可以看所有订单
        const allowAllRoles = ['super_admin', 'admin', 'customer_service', 'service'];
        // 🔥 经理角色（可以看本部门订单）
        const managerRoles = ['department_manager', 'manager'];
        if (!allowAllRoles.includes(userRole)) {
            if (managerRoles.includes(userRole)) {
                // 部门经理可以看本部门所有成员的订单，也包括自己的订单
                if (userDepartmentId) {
                    // 🔥 修复：同时匹配部门ID或创建人ID（确保能看到自己的订单）
                    queryBuilder.andWhere('(order.createdByDepartmentId = :departmentId OR order.createdBy = :userId)', {
                        departmentId: userDepartmentId,
                        userId
                    });
                    console.log(`📋 [订单列表] 经理过滤: 部门ID = ${userDepartmentId} 或 创建人ID = ${userId}`);
                }
                else {
                    // 如果没有部门ID，只能看自己的订单
                    queryBuilder.andWhere('order.createdBy = :userId', { userId });
                    console.log(`📋 [订单列表] 经理无部门ID，只看自己的订单: userId = ${userId}`);
                }
            }
            else {
                // 🔥 普通员工（销售员等）可以看到同部门成员的订单（用于团队业绩统计）
                if (userDepartmentId) {
                    // 🔥 修复：同时匹配部门ID或创建人ID（确保能看到自己的订单）
                    queryBuilder.andWhere('(order.createdByDepartmentId = :departmentId OR order.createdBy = :userId)', {
                        departmentId: userDepartmentId,
                        userId
                    });
                    console.log(`📋 [订单列表] 普通员工过滤: 部门ID = ${userDepartmentId} 或 创建人ID = ${userId}`);
                }
                else {
                    // 如果没有部门ID，只能看自己的订单
                    queryBuilder.andWhere('order.createdBy = :userId', { userId });
                    console.log(`📋 [订单列表] 普通员工无部门ID，只看自己的订单: userId = ${userId}`);
                }
            }
        }
        else {
            console.log(`📋 [订单列表] ${userRole}角色，查看所有订单`);
        }
        // 状态筛选
        if (status) {
            queryBuilder.andWhere('order.status = :status', { status });
        }
        // 订单号筛选
        if (orderNumber) {
            queryBuilder.andWhere('order.orderNumber LIKE :orderNumber', { orderNumber: `%${orderNumber}%` });
        }
        // 客户名称筛选
        if (customerName) {
            queryBuilder.andWhere('order.customerName LIKE :customerName', { customerName: `%${customerName}%` });
        }
        // 日期范围筛选
        if (startDate && endDate) {
            queryBuilder.andWhere('order.createdAt BETWEEN :startDate AND :endDate', {
                startDate: new Date(startDate),
                endDate: new Date(endDate)
            });
        }
        // 排序和分页
        queryBuilder.orderBy('order.createdAt', 'DESC')
            .skip(skip)
            .take(pageSizeNum);
        const [orders, total] = await queryBuilder.getManyAndCount();
        console.log(`📋 [订单列表] 查询到 ${orders.length} 条订单, 总数: ${total}`);
        // 转换数据格式以匹配前端期望
        const list = orders.map(order => {
            // 解析products JSON字段
            let products = [];
            if (order.products) {
                try {
                    products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
                }
                catch {
                    products = [];
                }
            }
            // 根据订单状态推断auditStatus
            // 🔥 修复：正确映射auditStatus
            let auditStatus = 'pending';
            if (['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status)) {
                auditStatus = 'approved';
            }
            else if (order.status === 'audit_rejected') {
                auditStatus = 'rejected';
            }
            else if (order.status === 'pending_audit' || order.status === 'pending_transfer') {
                auditStatus = 'pending';
            }
            return {
                id: order.id,
                orderNumber: order.orderNumber,
                customerId: order.customerId || '',
                customerName: order.customerName || '',
                customerPhone: order.customerPhone || '',
                products: products,
                totalAmount: Number(order.totalAmount) || 0,
                depositAmount: Number(order.depositAmount) || 0,
                // 🔥 代收金额 = 订单总额 - 定金
                collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
                receiverName: order.shippingName || '',
                receiverPhone: order.shippingPhone || '',
                receiverAddress: order.shippingAddress || '',
                remark: order.remark || '',
                status: order.status || 'pending_transfer',
                auditStatus: auditStatus,
                markType: order.markType || 'normal',
                paymentStatus: order.paymentStatus || 'unpaid',
                paymentMethod: order.paymentMethod || '',
                paymentMethodOther: order.paymentMethodOther || '',
                expressCompany: order.expressCompany || '',
                trackingNumber: order.trackingNumber || '',
                serviceWechat: order.serviceWechat || '',
                orderSource: order.orderSource || '',
                depositScreenshots: order.depositScreenshots || [],
                // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
                customFields: {
                    custom_field1: order.customField1 || order.customFields?.custom_field1 || '',
                    custom_field2: order.customField2 || order.customFields?.custom_field2 || '',
                    custom_field3: order.customField3 || order.customFields?.custom_field3 || '',
                    custom_field4: order.customField4 || order.customFields?.custom_field4 || '',
                    custom_field5: order.customField5 || order.customFields?.custom_field5 || '',
                    custom_field6: order.customField6 || order.customFields?.custom_field6 || '',
                    custom_field7: order.customField7 || order.customFields?.custom_field7 || ''
                },
                customField1: order.customField1 || order.customFields?.custom_field1 || '',
                customField2: order.customField2 || order.customFields?.custom_field2 || '',
                customField3: order.customField3 || order.customFields?.custom_field3 || '',
                customField4: order.customField4 || order.customFields?.custom_field4 || '',
                customField5: order.customField5 || order.customFields?.custom_field5 || '',
                customField6: order.customField6 || order.customFields?.custom_field6 || '',
                customField7: order.customField7 || order.customFields?.custom_field7 || '',
                createTime: formatToBeijingTime(order.createdAt),
                createdBy: order.createdBy || '',
                createdByName: order.createdByName || '',
                salesPersonId: order.createdBy || '',
                // 🔥 添加operatorId和operator字段，用于前端权限判断
                operatorId: order.createdBy || '',
                operator: order.createdByName || ''
            };
        });
        res.json({
            success: true,
            code: 200,
            message: '获取订单列表成功',
            data: {
                list,
                total,
                page: pageNum,
                pageSize: pageSizeNum
            }
        });
    }
    catch (error) {
        console.error('❌ [订单列表] 获取失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取订单列表失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * 🔥 以下路由必须在 /:id 之前定义，否则会被 /:id 拦截
 */
/**
 * @route GET /api/v1/orders/:id/status-history
 * @desc 获取订单状态历史
 * @access Private
 */
router.get('/:id/status-history', async (req, res) => {
    try {
        const orderId = req.params.id;
        // 🔥 先检查表是否存在，避免报错
        try {
            const { OrderStatusHistory } = await Promise.resolve().then(() => __importStar(require('../entities/OrderStatusHistory')));
            const statusHistoryRepository = database_1.AppDataSource.getRepository(OrderStatusHistory);
            const history = await statusHistoryRepository.find({
                where: { orderId },
                order: { createdAt: 'DESC' }
            });
            const list = history.map(item => ({
                id: item.id,
                orderId: item.orderId,
                status: item.status,
                title: getStatusTitle(item.status),
                description: item.notes || `订单状态变更为：${getStatusTitle(item.status)}`,
                operator: item.operatorName || '系统',
                operatorId: item.operatorId,
                timestamp: item.createdAt?.toISOString() || ''
            }));
            console.log(`[订单状态历史] 订单 ${orderId} 有 ${list.length} 条状态记录`);
            res.json({ success: true, code: 200, data: list });
        }
        catch (entityError) {
            // 如果表不存在，返回空数组
            console.warn(`[订单状态历史] 表可能不存在，返回空数组:`, entityError);
            res.json({ success: true, code: 200, data: [] });
        }
    }
    catch (error) {
        console.error('获取订单状态历史失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取订单状态历史失败' });
    }
});
/**
 * @route GET /api/v1/orders/:id/operation-logs
 * @desc 获取订单操作记录
 * @access Private
 */
router.get('/:id/operation-logs', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { OperationLog } = await Promise.resolve().then(() => __importStar(require('../entities/OperationLog')));
        const logRepository = database_1.AppDataSource.getRepository(OperationLog);
        const logs = await logRepository.find({
            where: { resourceId: orderId, resourceType: 'order' },
            order: { createdAt: 'DESC' }
        });
        const list = logs.map(log => ({
            id: log.id,
            time: log.createdAt?.toISOString() || '',
            operator: log.username || log.userId || '系统',
            action: log.action || '',
            description: log.description || '',
            remark: ''
        }));
        console.log(`[订单操作记录] 订单 ${orderId} 有 ${list.length} 条操作记录`);
        res.json({ success: true, code: 200, data: list });
    }
    catch (error) {
        console.error('获取订单操作记录失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取订单操作记录失败' });
    }
});
/**
 * @route GET /api/v1/orders/:id/after-sales
 * @desc 获取订单售后历史
 * @access Private
 */
router.get('/:id/after-sales', async (req, res) => {
    try {
        const orderId = req.params.id;
        const { AfterSalesService } = await Promise.resolve().then(() => __importStar(require('../entities/AfterSalesService')));
        const serviceRepository = database_1.AppDataSource.getRepository(AfterSalesService);
        const services = await serviceRepository.find({
            where: { orderId },
            order: { createdAt: 'DESC' }
        });
        const list = services.map(service => ({
            id: service.id,
            serviceNumber: service.serviceNumber,
            type: service.serviceType,
            title: getAfterSalesTitle(service.serviceType, service.status),
            description: service.description || service.reason || '',
            status: service.status,
            operator: service.createdBy || '系统',
            amount: Number(service.price) || 0,
            timestamp: service.createdAt?.toISOString() || ''
        }));
        console.log(`[订单售后历史] 订单 ${orderId} 有 ${list.length} 条售后记录`);
        res.json({ success: true, code: 200, data: list });
    }
    catch (error) {
        console.error('获取订单售后历史失败:', error);
        res.status(500).json({ success: false, code: 500, message: '获取订单售后历史失败' });
    }
});
/**
 * @route PUT /api/v1/orders/:id/mark-type
 * @desc 更新订单标记类型
 * @access Private
 */
router.put('/:id/mark-type', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { markType } = req.body;
        const orderId = req.params.id;
        console.log(`📝 [订单标记] 更新订单 ${orderId} 标记类型为 ${markType}`);
        const order = await orderRepository.findOne({ where: { id: orderId } });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        order.markType = markType;
        await orderRepository.save(order);
        console.log(`✅ [订单标记] 订单 ${orderId} 标记更新成功`);
        res.json({
            success: true,
            code: 200,
            message: '订单标记更新成功',
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                markType: order.markType
            }
        });
    }
    catch (error) {
        console.error('❌ [订单标记] 更新失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新订单标记失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route GET /api/v1/orders/:id
 * @desc 获取订单详情
 * @access Private
 */
router.get('/:id', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({
            where: { id: req.params.id }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        // 解析products JSON字段
        let products = [];
        if (order.products) {
            try {
                products = typeof order.products === 'string' ? JSON.parse(order.products) : order.products;
            }
            catch {
                products = [];
            }
        }
        // 根据订单状态推断auditStatus
        // 🔥 修复：正确映射auditStatus
        let auditStatus = 'pending';
        if (['pending_shipment', 'shipped', 'delivered', 'paid', 'completed'].includes(order.status)) {
            auditStatus = 'approved';
        }
        else if (order.status === 'audit_rejected') {
            auditStatus = 'rejected';
        }
        else if (order.status === 'pending_audit' || order.status === 'pending_transfer') {
            auditStatus = 'pending';
        }
        // 计算流转时间（创建时间 + 配置的延迟分钟数）
        let auditTransferTime = '';
        let isAuditTransferred = false;
        if (order.createdAt && order.status === 'pending_transfer') {
            // 获取流转配置
            const transferConfig = await getOrderTransferConfig();
            const delayMs = transferConfig.delayMinutes * 60 * 1000;
            const transferDate = new Date(order.createdAt.getTime() + delayMs);
            auditTransferTime = transferDate.toISOString();
            isAuditTransferred = false;
        }
        else if (order.status === 'pending_audit' || order.status === 'pending_shipment' || order.status === 'shipped') {
            isAuditTransferred = true;
        }
        const data = {
            id: order.id,
            orderNumber: order.orderNumber,
            customerId: order.customerId || '',
            customerName: order.customerName || '',
            customerPhone: order.customerPhone || '',
            products: products,
            totalAmount: Number(order.totalAmount) || 0,
            depositAmount: Number(order.depositAmount) || 0,
            // 🔥 代收金额 = 订单总额 - 定金
            collectAmount: (Number(order.totalAmount) || 0) - (Number(order.depositAmount) || 0),
            receiverName: order.shippingName || '',
            receiverPhone: order.shippingPhone || '',
            receiverAddress: order.shippingAddress || '',
            remark: order.remark || '',
            status: order.status || 'pending_transfer',
            auditStatus: auditStatus,
            markType: order.markType || 'normal',
            isAuditTransferred: isAuditTransferred,
            auditTransferTime: auditTransferTime,
            paymentStatus: order.paymentStatus || 'unpaid',
            paymentMethod: order.paymentMethod || '',
            paymentMethodOther: order.paymentMethodOther || '',
            expressCompany: order.expressCompany || '',
            trackingNumber: order.trackingNumber || '',
            // 🔥 新增：物流相关字段
            shippedAt: order.shippedAt ? formatToBeijingTime(order.shippedAt) : '',
            shippingTime: order.shippingTime || (order.shippedAt ? formatToBeijingTime(order.shippedAt) : ''),
            expectedDeliveryDate: order.expectedDeliveryDate || '',
            logisticsStatus: order.logisticsStatus || '',
            latestLogisticsInfo: order.latestLogisticsInfo || '',
            deliveredAt: order.deliveredAt ? formatToBeijingTime(order.deliveredAt) : '',
            isTodo: order.isTodo || false,
            todoDate: order.todoDate || '',
            todoRemark: order.todoRemark || '',
            serviceWechat: order.serviceWechat || '',
            orderSource: order.orderSource || '',
            depositScreenshots: order.depositScreenshots || [],
            // 🔥 新版自定义字段
            // 🔥 新版自定义字段：优先从独立字段读取，其次从JSON字段读取
            customFields: {
                custom_field1: order.customField1 || order.customFields?.custom_field1 || '',
                custom_field2: order.customField2 || order.customFields?.custom_field2 || '',
                custom_field3: order.customField3 || order.customFields?.custom_field3 || '',
                custom_field4: order.customField4 || order.customFields?.custom_field4 || '',
                custom_field5: order.customField5 || order.customFields?.custom_field5 || '',
                custom_field6: order.customField6 || order.customFields?.custom_field6 || '',
                custom_field7: order.customField7 || order.customFields?.custom_field7 || ''
            },
            customField1: order.customField1 || order.customFields?.custom_field1 || '',
            customField2: order.customField2 || order.customFields?.custom_field2 || '',
            customField3: order.customField3 || order.customFields?.custom_field3 || '',
            customField4: order.customField4 || order.customFields?.custom_field4 || '',
            customField5: order.customField5 || order.customFields?.custom_field5 || '',
            customField6: order.customField6 || order.customFields?.custom_field6 || '',
            customField7: order.customField7 || order.customFields?.custom_field7 || '',
            createTime: formatToBeijingTime(order.createdAt),
            createdBy: order.createdBy || '',
            createdByName: order.createdByName || '',
            salesPersonId: order.createdBy || '',
            operatorId: order.createdBy || '',
            operator: order.createdByName || ''
        };
        res.json({
            success: true,
            code: 200,
            message: '获取订单详情成功',
            data
        });
    }
    catch (error) {
        console.error('获取订单详情失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '获取订单详情失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/orders
 * @desc 创建订单
 * @access Private
 */
router.post('/', async (req, res) => {
    try {
        console.log('📝 [订单创建] 收到请求数据:', JSON.stringify(req.body, null, 2));
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { customerId, customerName, customerPhone, products, totalAmount, discount, collectAmount, depositAmount, depositScreenshots, depositScreenshot, receiverName, receiverPhone, receiverAddress, remark, paymentMethod, paymentMethodOther, salesPersonId, salesPersonName, orderNumber, serviceWechat, orderSource, markType, expressCompany, customFields } = req.body;
        // 🔥 调试：打印接收到的customFields
        console.log('📋 [订单创建] 接收到的customFields:', JSON.stringify(customFields, null, 2));
        // 数据验证
        if (!customerId) {
            console.error('❌ [订单创建] 缺少客户ID');
            return res.status(400).json({
                success: false,
                code: 400,
                message: '缺少客户ID'
            });
        }
        if (!products || !Array.isArray(products) || products.length === 0) {
            console.error('❌ [订单创建] 缺少商品信息');
            return res.status(400).json({
                success: false,
                code: 400,
                message: '缺少商品信息'
            });
        }
        // 生成订单号
        const generatedOrderNumber = orderNumber || `ORD${Date.now()}`;
        // 计算金额
        const finalTotalAmount = Number(totalAmount) || 0;
        const finalDepositAmount = Number(depositAmount) || 0;
        const finalAmount = finalTotalAmount - (Number(discount) || 0);
        // 处理定金截图
        let finalDepositScreenshots = [];
        if (depositScreenshots && Array.isArray(depositScreenshots)) {
            finalDepositScreenshots = depositScreenshots;
        }
        else if (depositScreenshot) {
            finalDepositScreenshots = [depositScreenshot];
        }
        // 获取当前用户信息
        const currentUser = req.currentUser;
        const finalCreatedBy = salesPersonId || currentUser?.id || 'admin';
        // 🔥 优先使用传入的销售人员姓名，其次使用当前用户的name字段，再次使用realName，最后使用用户名
        const finalCreatedByName = salesPersonName || currentUser?.name || currentUser?.realName || currentUser?.username || '';
        // 获取创建人部门信息
        const createdByDepartmentId = currentUser?.departmentId || '';
        const createdByDepartmentName = currentUser?.departmentName || '';
        // 验证部门下单限制（仅对正常发货单进行验证）
        if (markType !== 'reserved' && markType !== 'return' && createdByDepartmentId) {
            const limitCheck = await checkDepartmentOrderLimit(createdByDepartmentId, String(customerId), finalTotalAmount);
            if (!limitCheck.allowed) {
                console.warn(`⚠️ [订单创建] 部门下单限制: ${limitCheck.message}`);
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: limitCheck.message,
                    limitType: limitCheck.limitType
                });
            }
        }
        console.log('📝 [订单创建] 准备创建订单:', {
            orderNumber: generatedOrderNumber,
            customerId,
            totalAmount: finalTotalAmount,
            depositAmount: finalDepositAmount
        });
        // 创建订单
        const order = orderRepository.create({
            orderNumber: generatedOrderNumber,
            customerId: String(customerId),
            customerName: customerName || '',
            customerPhone: customerPhone || '',
            serviceWechat: serviceWechat || '',
            orderSource: orderSource || '',
            products: products,
            status: 'pending_transfer',
            totalAmount: finalTotalAmount,
            discountAmount: Number(discount) || 0,
            finalAmount: finalAmount,
            depositAmount: finalDepositAmount,
            depositScreenshots: finalDepositScreenshots.length > 0 ? finalDepositScreenshots : undefined,
            paymentStatus: finalDepositAmount > 0 ? 'partial' : 'unpaid',
            paymentMethod: paymentMethod || undefined,
            paymentMethodOther: paymentMethodOther || undefined,
            shippingName: receiverName || customerName || '',
            shippingPhone: receiverPhone || customerPhone || '',
            shippingAddress: receiverAddress || '',
            expressCompany: expressCompany || '',
            markType: markType || 'normal',
            remark: remark || '',
            // 🔥 新版自定义字段：7个独立字段
            customField1: customFields?.custom_field1 || undefined,
            customField2: customFields?.custom_field2 || undefined,
            customField3: customFields?.custom_field3 || undefined,
            customField4: customFields?.custom_field4 || undefined,
            customField5: customFields?.custom_field5 || undefined,
            customField6: customFields?.custom_field6 || undefined,
            customField7: customFields?.custom_field7 || undefined,
            // 保留旧版JSON字段用于兼容
            customFields: customFields || undefined,
            createdBy: finalCreatedBy,
            createdByName: finalCreatedByName,
            createdByDepartmentId: createdByDepartmentId || undefined,
            createdByDepartmentName: createdByDepartmentName || undefined
        });
        const savedOrder = await orderRepository.save(order);
        console.log('✅ [订单创建] 订单保存成功:', savedOrder.id);
        // 更新产品库存
        try {
            const productRepository = database_1.AppDataSource.getRepository(Product_1.Product);
            for (const item of products) {
                const productId = item.id || item.productId;
                const quantity = Number(item.quantity) || 1;
                if (productId) {
                    const product = await productRepository.findOne({ where: { id: productId } });
                    if (product && product.stock >= quantity) {
                        product.stock = product.stock - quantity;
                        await productRepository.save(product);
                        console.log(`📦 [库存更新] 产品 ${product.name} 库存减少 ${quantity}，剩余 ${product.stock}`);
                    }
                    else if (product) {
                        console.warn(`⚠️ [库存更新] 产品 ${product.name} 库存不足，当前 ${product.stock}，需要 ${quantity}`);
                    }
                }
            }
        }
        catch (stockError) {
            console.error('⚠️ [库存更新] 更新库存失败，但订单已创建:', stockError);
        }
        // 返回完整的订单数据
        const responseData = {
            id: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            customerId: savedOrder.customerId,
            customerName: customerName || '',
            customerPhone: customerPhone || '',
            products: products,
            totalAmount: finalTotalAmount,
            depositAmount: finalDepositAmount,
            collectAmount: Number(collectAmount) || finalTotalAmount - finalDepositAmount,
            receiverName: receiverName || customerName || '',
            receiverPhone: receiverPhone || customerPhone || '',
            receiverAddress: receiverAddress || '',
            remark: remark || '',
            status: 'pending_transfer',
            auditStatus: 'pending',
            markType: markType || 'normal',
            createTime: formatToBeijingTime(savedOrder.createdAt) || formatToBeijingTime(new Date()),
            createdBy: finalCreatedBy,
            createdByName: finalCreatedByName,
            salesPersonId: finalCreatedBy,
            operatorId: finalCreatedBy,
            operator: finalCreatedByName
        };
        console.log('✅ [订单创建] 返回数据:', responseData);
        // 🔥 保存订单创建的状态历史记录
        await saveStatusHistory(savedOrder.id, savedOrder.status, finalCreatedBy, finalCreatedByName, `订单创建成功，订单号：${savedOrder.orderNumber}`);
        // 🔥 发送订单创建成功通知给下单员
        OrderNotificationService_1.orderNotificationService.notifyOrderCreated({
            id: savedOrder.id,
            orderNumber: savedOrder.orderNumber,
            customerName: customerName || '',
            totalAmount: finalTotalAmount,
            createdBy: finalCreatedBy,
            createdByName: finalCreatedByName
        }).catch(err => console.error('[订单创建] 发送通知失败:', err));
        res.status(201).json({
            success: true,
            code: 200,
            message: '订单创建成功',
            data: responseData
        });
    }
    catch (error) {
        const err = error;
        console.error('❌ [订单创建] 失败:', {
            message: err?.message,
            stack: err?.stack,
            code: err?.code,
            sqlMessage: err?.sqlMessage
        });
        res.status(500).json({
            success: false,
            code: 500,
            message: err?.sqlMessage || err?.message || '创建订单失败',
            error: process.env.NODE_ENV === 'development' ? err?.stack : undefined
        });
    }
});
// 🔥 订单状态流转规则：定义合法的状态变更路径
const VALID_STATUS_TRANSITIONS = {
    'pending_transfer': ['pending_audit'], // 待流转 → 待审核
    'pending_audit': ['pending_shipment', 'audit_rejected'], // 待审核 → 待发货/审核拒绝
    'audit_rejected': ['pending_audit', 'cancelled'], // 审核拒绝 → 重新提审/取消
    'pending_shipment': ['shipped', 'logistics_returned', 'logistics_cancelled', 'cancelled'], // 待发货 → 已发货/退回/取消
    'shipped': ['delivered', 'rejected', 'package_exception', 'logistics_returned'], // 已发货 → 已签收/拒收/异常/退回
    'delivered': ['after_sales_created'], // 已签收 → 已建售后（终态，一般不变）
    'rejected': ['rejected_returned'], // 拒收 → 拒收已退回
    'rejected_returned': [], // 拒收已退回（终态）
    'logistics_returned': ['pending_shipment', 'cancelled'], // 物流退回 → 重新发货/取消
    'logistics_cancelled': ['cancelled'], // 物流取消 → 已取消
    'package_exception': ['shipped', 'rejected', 'cancelled'], // 包裹异常 → 重新发货/拒收/取消
    'after_sales_created': [], // 已建售后（终态）
    'cancelled': [] // 已取消（终态）
};
// 🔥 校验状态变更是否合法
const isValidStatusTransition = (currentStatus, targetStatus) => {
    // 如果状态相同，允许（可能只是更新其他字段）
    if (currentStatus === targetStatus)
        return true;
    const allowedTargets = VALID_STATUS_TRANSITIONS[currentStatus];
    if (!allowedTargets) {
        console.warn(`[状态校验] 未知的当前状态: ${currentStatus}`);
        return true; // 未知状态，允许更新（兼容旧数据）
    }
    return allowedTargets.includes(targetStatus);
};
// 🔥 获取状态中文名称
const getStatusName = (status) => {
    const statusNames = {
        'pending_transfer': '待流转',
        'pending_audit': '待审核',
        'audit_rejected': '审核拒绝',
        'pending_shipment': '待发货',
        'shipped': '已发货',
        'delivered': '已签收',
        'logistics_returned': '物流部退回',
        'logistics_cancelled': '物流部取消',
        'package_exception': '包裹异常',
        'rejected': '拒收',
        'rejected_returned': '拒收已退回',
        'after_sales_created': '已建售后',
        'cancelled': '已取消'
    };
    return statusNames[status] || status;
};
/**
 * @route PUT /api/v1/orders/:id
 * @desc 更新订单
 * @access Private
 */
router.put('/:id', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({
            where: { id: req.params.id }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        const updateData = req.body;
        const previousStatus = order.status;
        // 🔥 状态校验：检查状态变更是否合法
        if (updateData.status !== undefined && updateData.status !== order.status) {
            const currentStatus = order.status;
            const targetStatus = updateData.status;
            if (!isValidStatusTransition(currentStatus, targetStatus)) {
                console.error(`[状态校验] ❌ 非法状态变更: ${currentStatus} → ${targetStatus}`);
                return res.status(400).json({
                    success: false,
                    code: 400,
                    message: `订单状态变更不合法：不能从"${getStatusName(currentStatus)}"变更为"${getStatusName(targetStatus)}"`,
                    currentStatus,
                    targetStatus
                });
            }
            console.log(`[状态校验] ✅ 合法状态变更: ${currentStatus} → ${targetStatus}`);
        }
        // 更新订单字段
        if (updateData.status !== undefined)
            order.status = updateData.status;
        if (updateData.receiverName || updateData.shippingName)
            order.shippingName = updateData.receiverName || updateData.shippingName;
        if (updateData.receiverPhone || updateData.shippingPhone)
            order.shippingPhone = updateData.receiverPhone || updateData.shippingPhone;
        if (updateData.receiverAddress || updateData.shippingAddress)
            order.shippingAddress = updateData.receiverAddress || updateData.shippingAddress;
        if (updateData.remark !== undefined)
            order.remark = updateData.remark;
        if (updateData.paymentStatus !== undefined)
            order.paymentStatus = updateData.paymentStatus;
        if (updateData.paymentMethod !== undefined)
            order.paymentMethod = updateData.paymentMethod;
        if (updateData.paymentMethodOther !== undefined)
            order.paymentMethodOther = updateData.paymentMethodOther;
        if (updateData.expressCompany !== undefined)
            order.expressCompany = updateData.expressCompany;
        if (updateData.trackingNumber !== undefined)
            order.trackingNumber = updateData.trackingNumber;
        if (updateData.markType !== undefined)
            order.markType = updateData.markType;
        // 🔥 发货时间和预计送达时间
        if (updateData.shippingTime !== undefined)
            order.shippingTime = updateData.shippingTime;
        if (updateData.shippedAt !== undefined)
            order.shippedAt = new Date(updateData.shippedAt);
        if (updateData.expectedDeliveryDate !== undefined)
            order.expectedDeliveryDate = updateData.expectedDeliveryDate;
        if (updateData.estimatedDeliveryTime !== undefined)
            order.expectedDeliveryDate = updateData.estimatedDeliveryTime;
        // 🔥 物流状态
        if (updateData.logisticsStatus !== undefined)
            order.logisticsStatus = updateData.logisticsStatus;
        // 🔥 新版自定义字段：从customFields对象中提取到独立字段
        if (updateData.customFields !== undefined) {
            order.customFields = updateData.customFields;
            // 同时更新7个独立字段
            if (updateData.customFields.custom_field1 !== undefined)
                order.customField1 = updateData.customFields.custom_field1;
            if (updateData.customFields.custom_field2 !== undefined)
                order.customField2 = updateData.customFields.custom_field2;
            if (updateData.customFields.custom_field3 !== undefined)
                order.customField3 = updateData.customFields.custom_field3;
            if (updateData.customFields.custom_field4 !== undefined)
                order.customField4 = updateData.customFields.custom_field4;
            if (updateData.customFields.custom_field5 !== undefined)
                order.customField5 = updateData.customFields.custom_field5;
            if (updateData.customFields.custom_field6 !== undefined)
                order.customField6 = updateData.customFields.custom_field6;
            if (updateData.customFields.custom_field7 !== undefined)
                order.customField7 = updateData.customFields.custom_field7;
        }
        const updatedOrder = await orderRepository.save(order);
        // 🔥 根据状态变更发送相应通知和保存状态历史
        if (updateData.status !== undefined && updateData.status !== previousStatus) {
            // 获取当前操作人信息
            const currentUser = req.currentUser || req.user;
            const operatorId = currentUser?.id || null;
            const operatorName = currentUser?.realName || currentUser?.name || currentUser?.username || '系统';
            // 🔥 保存状态历史记录
            await saveStatusHistory(order.id, updateData.status, operatorId, operatorName, updateData.remark || `状态变更为：${getStatusName(updateData.status)}`);
            const orderInfo = {
                id: order.id,
                orderNumber: order.orderNumber,
                customerName: order.customerName,
                totalAmount: Number(order.totalAmount),
                createdBy: order.createdBy,
                createdByName: order.createdByName
            };
            const newStatus = updateData.status;
            // 根据新状态发送不同的通知
            switch (newStatus) {
                case 'shipped':
                    OrderNotificationService_1.orderNotificationService.notifyOrderShipped(orderInfo, order.trackingNumber, order.expressCompany)
                        .catch(err => console.error('[订单更新] 发送发货通知失败:', err));
                    break;
                case 'delivered':
                    OrderNotificationService_1.orderNotificationService.notifyOrderDelivered(orderInfo)
                        .catch(err => console.error('[订单更新] 发送签收通知失败:', err));
                    break;
                case 'rejected':
                    OrderNotificationService_1.orderNotificationService.notifyOrderRejected(orderInfo, updateData.remark)
                        .catch(err => console.error('[订单更新] 发送拒收通知失败:', err));
                    break;
                case 'cancelled':
                    OrderNotificationService_1.orderNotificationService.notifyOrderCancelled(orderInfo, updateData.remark)
                        .catch(err => console.error('[订单更新] 发送取消通知失败:', err));
                    break;
                case 'logistics_returned':
                    OrderNotificationService_1.orderNotificationService.notifyLogisticsReturned(orderInfo, updateData.remark)
                        .catch(err => console.error('[订单更新] 发送物流退回通知失败:', err));
                    break;
                case 'logistics_cancelled':
                    OrderNotificationService_1.orderNotificationService.notifyLogisticsCancelled(orderInfo, updateData.remark)
                        .catch(err => console.error('[订单更新] 发送物流取消通知失败:', err));
                    break;
                case 'package_exception':
                    OrderNotificationService_1.orderNotificationService.notifyPackageException(orderInfo, updateData.remark)
                        .catch(err => console.error('[订单更新] 发送包裹异常通知失败:', err));
                    break;
            }
        }
        res.json({
            success: true,
            code: 200,
            message: '订单更新成功',
            data: {
                id: updatedOrder.id,
                orderNumber: updatedOrder.orderNumber,
                status: updatedOrder.status
            }
        });
    }
    catch (error) {
        console.error('更新订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '更新订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route DELETE /api/v1/orders/:id
 * @desc 删除订单
 * @access Private
 */
router.delete('/:id', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const order = await orderRepository.findOne({
            where: { id: req.params.id }
        });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        await orderRepository.remove(order);
        res.json({
            success: true,
            code: 200,
            message: '订单删除成功'
        });
    }
    catch (error) {
        console.error('删除订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '删除订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/orders/:id/submit-audit
 * @desc 提交订单审核
 * @access Private
 */
router.post('/:id/submit-audit', async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { remark } = req.body;
        const idParam = req.params.id;
        let order = await orderRepository.findOne({ where: { id: idParam } });
        if (!order) {
            order = await orderRepository.findOne({ where: { orderNumber: idParam } });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        // 🔥 提审时，如果是预留单或退单，自动改为正常发货单
        const previousMarkType = order.markType;
        if (order.markType === 'reserved' || order.markType === 'return') {
            order.markType = 'normal';
            console.log(`📝 [订单提审] 订单 ${order.orderNumber} 标记从 ${previousMarkType} 改为 normal`);
        }
        order.status = 'pending_audit';
        if (remark) {
            order.remark = `${order.remark || ''} | 提审备注: ${remark}`;
        }
        await orderRepository.save(order);
        // 🔥 保存状态历史记录
        const currentUser = req.currentUser || req.user;
        const operatorId = currentUser?.id || order.createdBy;
        const operatorName = currentUser?.realName || currentUser?.name || order.createdByName || '销售员';
        await saveStatusHistory(order.id, order.status, operatorId, operatorName, `订单已提交审核${remark ? `，备注：${remark}` : ''}`);
        console.log(`✅ [订单提审] 订单 ${order.orderNumber} 已提交审核，状态变更为 pending_audit`);
        // 🔥 发送待审核通知给下单员和管理员
        OrderNotificationService_1.orderNotificationService.notifyOrderPendingAudit({
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: Number(order.totalAmount),
            createdBy: order.createdBy,
            createdByName: order.createdByName
        }).catch(err => console.error('[订单提审] 发送通知失败:', err));
        res.json({
            success: true,
            code: 200,
            message: '订单已提交审核',
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                markType: order.markType,
                previousMarkType: previousMarkType !== order.markType ? previousMarkType : undefined
            }
        });
    }
    catch (error) {
        console.error('提交订单审核失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '提交订单审核失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/orders/:id/audit
 * @desc 审核订单
 * @access Private
 */
router.post('/:id/audit', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { action, auditStatus, remark, auditRemark } = req.body;
        const idParam = req.params.id;
        // 获取当前审核员信息
        const currentUser = req.currentUser || req.user;
        const auditorName = currentUser?.realName || currentUser?.name || currentUser?.username || '审核员';
        // 兼容两种参数格式：action='approve'/'reject' 或 auditStatus='approved'/'rejected'
        const isApproved = action === 'approve' || auditStatus === 'approved';
        const finalRemark = remark || auditRemark || '';
        console.log(`📝 [订单审核] 收到审核请求: orderId=${idParam}, action=${action}, auditStatus=${auditStatus}, isApproved=${isApproved}`);
        let order = await orderRepository.findOne({ where: { id: idParam } });
        if (!order) {
            order = await orderRepository.findOne({ where: { orderNumber: idParam } });
        }
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        const orderInfo = {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: Number(order.totalAmount),
            createdBy: order.createdBy,
            createdByName: order.createdByName
        };
        console.log(`📋 [订单审核] orderInfo: ${JSON.stringify(orderInfo)}`);
        if (isApproved) {
            order.status = 'pending_shipment';
            order.remark = `${order.remark || ''} | 审核通过: ${finalRemark}`;
            console.log(`✅ [订单审核] 订单 ${order.orderNumber} 审核通过，状态变更为 pending_shipment`);
            console.log(`📨 [订单审核] 准备发送通知给 createdBy=${order.createdBy}, auditorName=${auditorName}`);
            // 🔥 发送审核通过通知给下单员
            OrderNotificationService_1.orderNotificationService.notifyOrderAuditApproved(orderInfo, auditorName)
                .catch(err => console.error('[订单审核] 发送审核通过通知失败:', err));
            // 🔥 发送待发货通知给下单员
            OrderNotificationService_1.orderNotificationService.notifyOrderPendingShipment(orderInfo)
                .catch(err => console.error('[订单审核] 发送待发货通知失败:', err));
        }
        else {
            order.status = 'audit_rejected';
            order.remark = `${order.remark || ''} | 审核拒绝: ${finalRemark}`;
            console.log(`❌ [订单审核] 订单 ${order.orderNumber} 审核拒绝，状态变更为 audit_rejected`);
            // 🔥 发送审核拒绝通知给下单员和管理员
            OrderNotificationService_1.orderNotificationService.notifyOrderAuditRejected(orderInfo, auditorName, finalRemark)
                .catch(err => console.error('[订单审核] 发送审核拒绝通知失败:', err));
        }
        await orderRepository.save(order);
        // 🔥 保存状态历史记录
        const operatorId = currentUser?.id || null;
        await saveStatusHistory(order.id, order.status, operatorId, auditorName, isApproved ? `审核通过: ${finalRemark}` : `审核拒绝: ${finalRemark}`);
        res.json({
            success: true,
            code: 200,
            message: isApproved ? '订单审核通过' : '订单审核拒绝',
            data: {
                id: order.id,
                orderNumber: order.orderNumber,
                status: order.status,
                auditStatus: isApproved ? 'approved' : 'rejected'
            }
        });
    }
    catch (error) {
        console.error('审核订单失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '审核订单失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
/**
 * @route POST /api/v1/orders/:id/cancel-audit
 * @desc 审核取消订单申请
 * @access Private
 */
router.post('/:id/cancel-audit', auth_1.authenticateToken, async (req, res) => {
    try {
        const orderRepository = database_1.AppDataSource.getRepository(Order_1.Order);
        const { action, remark } = req.body;
        // 获取当前审核员信息
        const currentUser = req.currentUser || req.user;
        const auditorName = currentUser?.realName || currentUser?.name || currentUser?.username || '审核员';
        const order = await orderRepository.findOne({ where: { id: req.params.id } });
        if (!order) {
            return res.status(404).json({
                success: false,
                code: 404,
                message: '订单不存在'
            });
        }
        const orderInfo = {
            id: order.id,
            orderNumber: order.orderNumber,
            customerName: order.customerName,
            totalAmount: Number(order.totalAmount),
            createdBy: order.createdBy,
            createdByName: order.createdByName
        };
        if (action === 'approve') {
            order.status = 'cancelled';
            order.remark = `${order.remark || ''} | 审核通过: ${remark || ''}`;
            // 🔥 发送取消审核通过通知
            OrderNotificationService_1.orderNotificationService.notifyOrderCancelApproved(orderInfo, auditorName)
                .catch(err => console.error('[取消审核] 发送通过通知失败:', err));
            // 🔥 发送订单已取消通知
            OrderNotificationService_1.orderNotificationService.notifyOrderCancelled(orderInfo, remark, auditorName)
                .catch(err => console.error('[取消审核] 发送取消通知失败:', err));
        }
        else {
            order.status = 'confirmed';
            order.remark = `${order.remark || ''} | 审核拒绝: ${remark || ''}`;
            // 🔥 发送取消审核拒绝通知
            OrderNotificationService_1.orderNotificationService.notifyOrderCancelRejected(orderInfo, auditorName, remark)
                .catch(err => console.error('[取消审核] 发送拒绝通知失败:', err));
        }
        await orderRepository.save(order);
        // 🔥 保存状态历史记录
        const operatorId = currentUser?.id || null;
        await saveStatusHistory(order.id, order.status, operatorId, auditorName, action === 'approve' ? `取消申请已通过${remark ? `，原因：${remark}` : ''}` : `取消申请已拒绝${remark ? `，原因：${remark}` : ''}`);
        res.json({
            success: true,
            code: 200,
            message: action === 'approve' ? '取消申请已通过' : '取消申请已拒绝'
        });
    }
    catch (error) {
        console.error('审核取消申请失败:', error);
        res.status(500).json({
            success: false,
            code: 500,
            message: '审核取消申请失败',
            error: error instanceof Error ? error.message : '未知错误'
        });
    }
});
// ========== 订单详情子路由 ==========
// 辅助函数：获取状态标题
function getStatusTitle(status) {
    const statusMap = {
        'pending': '待确认',
        'pending_transfer': '待流转',
        'pending_audit': '待审核',
        'confirmed': '已确认',
        'paid': '已支付',
        'pending_shipment': '待发货',
        'shipped': '已发货',
        'delivered': '已签收',
        'completed': '已完成',
        'cancelled': '已取消',
        'refunded': '已退款',
        'audit_rejected': '审核拒绝'
    };
    return statusMap[status] || status;
}
// 辅助函数：获取售后标题
function getAfterSalesTitle(type, status) {
    const typeTexts = {
        'return': '退货申请',
        'exchange': '换货申请',
        'repair': '维修申请',
        'refund': '退款申请'
    };
    const statusTexts = {
        'pending': '已提交',
        'processing': '处理中',
        'resolved': '已解决',
        'closed': '已关闭'
    };
    return `${typeTexts[type] || '售后申请'} - ${statusTexts[status] || status}`;
}
exports.default = router;
//# sourceMappingURL=orders.js.map