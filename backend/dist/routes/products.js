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
const ProductController_1 = require("../controllers/ProductController");
const router = (0, express_1.Router)();
/**
 * 产品管理路由
 */
// 所有产品路由都需要认证
router.use(auth_1.authenticateToken);
// ==================== 产品相关路由 ====================
/**
 * @route GET /api/v1/products
 * @desc 获取产品列表
 * @access Private
 */
router.get('/', ProductController_1.ProductController.getProducts);
/**
 * @route POST /api/v1/products
 * @desc 创建产品
 * @access Private
 */
router.post('/', ProductController_1.ProductController.createProduct);
/**
 * @route PUT /api/v1/products/:id
 * @desc 更新产品
 * @access Private
 */
router.put('/:id', ProductController_1.ProductController.updateProduct);
/**
 * @route DELETE /api/v1/products/:id
 * @desc 删除产品
 * @access Private
 */
router.delete('/:id', ProductController_1.ProductController.deleteProduct);
/**
 * @route GET /api/v1/products/:id
 * @desc 获取产品详情
 * @access Private
 */
router.get('/:id', ProductController_1.ProductController.getProductDetail);
/**
 * @route GET /api/v1/products/:id/stats
 * @desc 获取商品相关统计数据（根据用户角色权限过滤）
 * @access Private
 */
router.get('/:id/stats', ProductController_1.ProductController.getProductStats);
/**
 * @route POST /api/v1/products/batch-import
 * @desc 批量导入产品
 * @access Private
 */
router.post('/batch-import', ProductController_1.ProductController.batchImportProducts);
/**
 * @route GET /api/v1/products/export
 * @desc 导出产品数据
 * @access Private
 */
router.get('/export', ProductController_1.ProductController.exportProducts);
// ==================== 库存管理相关路由 ====================
/**
 * @route GET /api/v1/products/stock/statistics
 * @desc 获取库存统计信息
 * @access Private
 */
router.get('/stock/statistics', ProductController_1.ProductController.getStockStatistics);
/**
 * @route POST /api/v1/products/stock/adjust
 * @desc 库存调整
 * @access Private
 */
router.post('/stock/adjust', ProductController_1.ProductController.adjustStock);
/**
 * @route GET /api/v1/products/stock/adjustments
 * @desc 获取库存调整记录
 * @access Private
 */
router.get('/stock/adjustments', ProductController_1.ProductController.getStockAdjustments);
// ==================== 产品分类相关路由 ====================
/**
 * @route GET /api/v1/products/categories
 * @desc 获取产品分类列表（扁平结构）
 * @access Private
 */
router.get('/categories', ProductController_1.ProductController.getCategories);
/**
 * @route GET /api/v1/products/categories/tree
 * @desc 获取产品分类树形结构
 * @access Private
 */
router.get('/categories/tree', ProductController_1.ProductController.getCategoryTree);
/**
 * @route GET /api/v1/products/categories/:id
 * @desc 获取产品分类详情
 * @access Private
 */
router.get('/categories/:id', ProductController_1.ProductController.getCategoryDetail);
/**
 * @route POST /api/v1/products/categories
 * @desc 创建产品分类
 * @access Private
 */
router.post('/categories', ProductController_1.ProductController.createCategory);
/**
 * @route PUT /api/v1/products/categories/:id
 * @desc 更新产品分类
 * @access Private
 */
router.put('/categories/:id', ProductController_1.ProductController.updateCategory);
/**
 * @route DELETE /api/v1/products/categories/:id
 * @desc 删除产品分类
 * @access Private
 */
router.delete('/categories/:id', ProductController_1.ProductController.deleteCategory);
// ==================== 销售统计相关路由 ====================
/**
 * @route GET /api/v1/products/sales/statistics
 * @desc 获取销售统计数据（真实数据）
 * @access Private
 */
router.get('/sales/statistics', async (req, res) => {
    try {
        const { startDate, endDate, categoryId } = req.query;
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const { OrderItem } = await Promise.resolve().then(() => __importStar(require('../entities/OrderItem')));
        const { Order } = await Promise.resolve().then(() => __importStar(require('../entities/Order')));
        const { Product } = await Promise.resolve().then(() => __importStar(require('../entities/Product')));
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        const productRepo = AppDataSource.getRepository(Product);
        // 构建查询 - 统计有效订单的销售数据
        let queryBuilder = orderItemRepo
            .createQueryBuilder('item')
            .innerJoin(Order, 'order', 'order.id = item.orderId')
            .where('order.status NOT IN (:...excludeStatuses)', {
            excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
        });
        // 日期范围过滤
        if (startDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });
        }
        // 分类过滤
        if (categoryId) {
            queryBuilder = queryBuilder
                .innerJoin(Product, 'product', 'product.id = item.productId')
                .andWhere('product.categoryId = :categoryId', { categoryId });
        }
        // 统计总销售额和总销量
        const salesStats = await queryBuilder
            .select('SUM(item.subtotal)', 'totalRevenue')
            .addSelect('SUM(item.quantity)', 'totalSales')
            .getRawOne();
        // 获取商品总数
        const totalProducts = await productRepo.count();
        // 获取库存预警数量
        const lowStockCount = await productRepo
            .createQueryBuilder('product')
            .where('product.stock <= product.minStock')
            .andWhere('product.stock > 0')
            .getCount();
        res.json({
            success: true,
            data: {
                totalRevenue: parseFloat(salesStats?.totalRevenue) || 0,
                totalSales: parseInt(salesStats?.totalSales) || 0,
                totalProducts,
                lowStockWarning: lowStockCount,
                revenueChange: '+0%',
                salesChange: '+0%',
                productsChange: '+0%',
                warningChange: '+0%'
            }
        });
    }
    catch (error) {
        console.error('获取销售统计失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售统计失败'
        });
    }
});
/**
 * @route GET /api/v1/products/sales/trend
 * @desc 获取销售趋势数据（真实数据）
 * @access Private
 */
router.get('/sales/trend', async (req, res) => {
    try {
        const { startDate, endDate, period = '30days' } = req.query;
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const { OrderItem } = await Promise.resolve().then(() => __importStar(require('../entities/OrderItem')));
        const { Order } = await Promise.resolve().then(() => __importStar(require('../entities/Order')));
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        // 根据period确定时间范围
        let days = 30;
        if (period === '7days')
            days = 7;
        else if (period === '90days')
            days = 90;
        const endDateObj = endDate ? new Date(endDate) : new Date();
        const startDateObj = startDate ? new Date(startDate) : new Date(endDateObj.getTime() - days * 24 * 60 * 60 * 1000);
        // 按日期分组统计
        const trendData = await orderItemRepo
            .createQueryBuilder('item')
            .innerJoin(Order, 'order', 'order.id = item.orderId')
            .select('DATE(order.createdAt)', 'date')
            .addSelect('SUM(item.quantity)', 'sales')
            .addSelect('SUM(item.subtotal)', 'revenue')
            .where('order.status NOT IN (:...excludeStatuses)', {
            excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
        })
            .andWhere('order.createdAt >= :startDate', { startDate: startDateObj.toISOString().split('T')[0] })
            .andWhere('order.createdAt <= :endDate', { endDate: endDateObj.toISOString().split('T')[0] + ' 23:59:59' })
            .groupBy('DATE(order.createdAt)')
            .orderBy('date', 'ASC')
            .getRawMany();
        // 格式化数据
        const timeLabels = trendData.map(item => {
            const date = new Date(item.date);
            return `${date.getMonth() + 1}/${date.getDate()}`;
        });
        const salesData = trendData.map(item => parseInt(item.sales) || 0);
        const revenueData = trendData.map(item => parseFloat(item.revenue) || 0);
        res.json({
            success: true,
            data: {
                timeLabels,
                salesData,
                revenueData
            }
        });
    }
    catch (error) {
        console.error('获取销售趋势失败:', error);
        res.status(500).json({
            success: false,
            message: '获取销售趋势失败'
        });
    }
});
/**
 * @route GET /api/v1/products/sales/category
 * @desc 获取分类销售数据（真实数据）
 * @access Private
 */
router.get('/sales/category', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const { OrderItem } = await Promise.resolve().then(() => __importStar(require('../entities/OrderItem')));
        const { Order } = await Promise.resolve().then(() => __importStar(require('../entities/Order')));
        const { Product } = await Promise.resolve().then(() => __importStar(require('../entities/Product')));
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        // 按分类统计销售额
        let queryBuilder = orderItemRepo
            .createQueryBuilder('item')
            .innerJoin(Order, 'order', 'order.id = item.orderId')
            .innerJoin(Product, 'product', 'product.id = item.productId')
            .select('product.categoryName', 'name')
            .addSelect('SUM(item.subtotal)', 'value')
            .where('order.status NOT IN (:...excludeStatuses)', {
            excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
        });
        if (startDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });
        }
        const categoryData = await queryBuilder
            .groupBy('product.categoryName')
            .orderBy('value', 'DESC')
            .getRawMany();
        // 计算总额和百分比
        const totalValue = categoryData.reduce((sum, item) => sum + (parseFloat(item.value) || 0), 0);
        const result = categoryData.map(item => ({
            name: item.name || '未分类',
            value: parseFloat(item.value) || 0,
            percentage: totalValue > 0 ? Math.round((parseFloat(item.value) / totalValue) * 100) : 0
        }));
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('获取分类销售数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取分类销售数据失败'
        });
    }
});
/**
 * @route GET /api/v1/products/sales/top
 * @desc 获取热销产品排行（真实数据）
 * @access Private
 */
router.get('/sales/top', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const { OrderItem } = await Promise.resolve().then(() => __importStar(require('../entities/OrderItem')));
        const { Order } = await Promise.resolve().then(() => __importStar(require('../entities/Order')));
        const { Product } = await Promise.resolve().then(() => __importStar(require('../entities/Product')));
        const orderItemRepo = AppDataSource.getRepository(OrderItem);
        // 按商品统计销量
        let queryBuilder = orderItemRepo
            .createQueryBuilder('item')
            .innerJoin(Order, 'order', 'order.id = item.orderId')
            .innerJoin(Product, 'product', 'product.id = item.productId')
            .select('item.productId', 'id')
            .addSelect('product.name', 'name')
            .addSelect('product.categoryName', 'categoryName')
            .addSelect('SUM(item.quantity)', 'sales')
            .addSelect('SUM(item.subtotal)', 'revenue')
            .where('order.status NOT IN (:...excludeStatuses)', {
            excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
        });
        if (startDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
        }
        if (endDate) {
            queryBuilder = queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });
        }
        const topProducts = await queryBuilder
            .groupBy('item.productId')
            .addGroupBy('product.name')
            .addGroupBy('product.categoryName')
            .orderBy('sales', 'DESC')
            .limit(Number(limit))
            .getRawMany();
        const result = topProducts.map(item => ({
            id: item.id,
            name: item.name,
            categoryName: item.categoryName || '未分类',
            sales: parseInt(item.sales) || 0,
            revenue: parseFloat(item.revenue) || 0
        }));
        res.json({
            success: true,
            data: result
        });
    }
    catch (error) {
        console.error('获取热销产品排行失败:', error);
        res.status(500).json({
            success: false,
            message: '获取热销产品排行失败'
        });
    }
});
/**
 * @route GET /api/v1/products/inventory/warning
 * @desc 获取库存预警数据（真实数据）
 * @access Private
 */
router.get('/inventory/warning', async (req, res) => {
    try {
        const { AppDataSource } = await Promise.resolve().then(() => __importStar(require('../config/database')));
        const { Product } = await Promise.resolve().then(() => __importStar(require('../entities/Product')));
        const productRepo = AppDataSource.getRepository(Product);
        // 获取低库存商品
        const lowStockProducts = await productRepo
            .createQueryBuilder('product')
            .where('product.stock <= product.minStock')
            .andWhere('product.stock > 0')
            .getMany();
        // 获取缺货商品
        const outOfStockProducts = await productRepo
            .createQueryBuilder('product')
            .where('product.stock = 0')
            .getMany();
        // 按分类统计库存
        const categoryStats = await productRepo
            .createQueryBuilder('product')
            .select('product.categoryName', 'name')
            .addSelect('SUM(product.stock)', 'totalStock')
            .addSelect('SUM(CASE WHEN product.stock <= product.minStock AND product.stock > 0 THEN 1 ELSE 0 END)', 'lowStock')
            .addSelect('SUM(CASE WHEN product.stock = 0 THEN 1 ELSE 0 END)', 'outOfStock')
            .groupBy('product.categoryName')
            .getRawMany();
        const categories = categoryStats.map(item => ({
            name: item.name || '未分类',
            totalStock: parseInt(item.totalStock) || 0,
            lowStock: parseInt(item.lowStock) || 0,
            outOfStock: parseInt(item.outOfStock) || 0
        }));
        res.json({
            success: true,
            data: {
                lowStockCount: lowStockProducts.length,
                outOfStockCount: outOfStockProducts.length,
                totalWarning: lowStockProducts.length + outOfStockProducts.length,
                categories
            }
        });
    }
    catch (error) {
        console.error('获取库存预警数据失败:', error);
        res.status(500).json({
            success: false,
            message: '获取库存预警数据失败'
        });
    }
});
exports.default = router;
//# sourceMappingURL=products.js.map