"use strict";
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
 * @desc 获取销售统计数据
 * @access Private
 */
router.get('/sales/statistics', async (req, res) => {
    try {
        const { startDate, endDate, productId, categoryId } = req.query;
        // 返回模拟数据，实际应从数据库查询
        res.json({
            success: true,
            data: {
                totalSales: 125000,
                totalOrders: 450,
                totalQuantity: 1200,
                averageOrderValue: 277.78,
                growthRate: 15.5
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
 * @desc 获取销售趋势数据
 * @access Private
 */
router.get('/sales/trend', async (req, res) => {
    try {
        const { startDate, endDate, productId, groupBy = 'day' } = req.query;
        // 生成模拟趋势数据
        const trendData = Array.from({ length: 7 }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - (6 - i));
            return {
                date: date.toISOString().split('T')[0],
                sales: Math.floor(Math.random() * 10000) + 5000,
                orders: Math.floor(Math.random() * 50) + 20,
                quantity: Math.floor(Math.random() * 100) + 50
            };
        });
        res.json({
            success: true,
            data: trendData
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
 * @desc 获取分类销售数据
 * @access Private
 */
router.get('/sales/category', async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        res.json({
            success: true,
            data: [
                { categoryId: '1', categoryName: '电子产品', sales: 50000, percentage: 40 },
                { categoryId: '2', categoryName: '服装', sales: 30000, percentage: 24 },
                { categoryId: '3', categoryName: '食品', sales: 25000, percentage: 20 },
                { categoryId: '4', categoryName: '其他', sales: 20000, percentage: 16 }
            ]
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
 * @desc 获取热销产品排行
 * @access Private
 */
router.get('/sales/top', async (req, res) => {
    try {
        const { startDate, endDate, limit = 10 } = req.query;
        res.json({
            success: true,
            data: Array.from({ length: Number(limit) }, (_, i) => ({
                productId: `${i + 1}`,
                productName: `热销产品${i + 1}`,
                sales: Math.floor(Math.random() * 10000) + 5000,
                quantity: Math.floor(Math.random() * 100) + 50,
                rank: i + 1
            }))
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
 * @desc 获取库存预警数据
 * @access Private
 */
router.get('/inventory/warning', async (req, res) => {
    try {
        const { threshold = 10 } = req.query;
        res.json({
            success: true,
            data: {
                warningCount: 5,
                products: [
                    { productId: '1', productName: '产品A', currentStock: 5, minStock: 10 },
                    { productId: '2', productName: '产品B', currentStock: 3, minStock: 10 },
                    { productId: '3', productName: '产品C', currentStock: 8, minStock: 15 }
                ]
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