import { Router } from 'express';
import { authenticateToken } from '../middleware/auth';
import { ProductController } from '../controllers/ProductController';
import { getTenantRepo } from '../utils/tenantRepo';

import { log } from '../config/logger';
const router = Router();

/**
 * 产品管理路由
 */

// 自动迁移：确保products表有推荐/新品/热销标识列
let _productColumnsMigrated = false;
async function ensureProductTagColumns(): Promise<void> {
  if (_productColumnsMigrated) return;
  try {
    const { AppDataSource } = await import('../config/database');
    if (!AppDataSource || !AppDataSource.isInitialized) return;

    const columns = await AppDataSource.query(
      `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'products'
       AND COLUMN_NAME IN ('is_recommended', 'is_new', 'is_hot', 'product_type', 'virtual_delivery_type', 'card_key_template', 'resource_link_template', 'virtual_content_encrypt')`
    );
    const existingCols = columns.map((c: any) => c.COLUMN_NAME);

    if (!existingCols.includes('is_recommended')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN is_recommended TINYINT DEFAULT 0 COMMENT '是否推荐'`
      );
      log.info('[products] ✅ 已添加 is_recommended 列');
    }
    if (!existingCols.includes('is_new')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN is_new TINYINT DEFAULT 0 COMMENT '是否新品'`
      );
      log.info('[products] ✅ 已添加 is_new 列');
    }
    if (!existingCols.includes('is_hot')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN is_hot TINYINT DEFAULT 0 COMMENT '是否热销'`
      );
      log.info('[products] ✅ 已添加 is_hot 列');
    }
    // 虚拟商品字段自动迁移
    if (!existingCols.includes('product_type')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN product_type VARCHAR(20) DEFAULT 'physical' COMMENT '商品类型: physical-普通商品, virtual-虚拟商品'`
      );
      log.info('[products] ✅ 已添加 product_type 列');
    }
    if (!existingCols.includes('virtual_delivery_type')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN virtual_delivery_type VARCHAR(20) DEFAULT NULL COMMENT '虚拟发货方式: none-无需发货, card_key-卡密发货, resource_link-网盘资源'`
      );
      log.info('[products] ✅ 已添加 virtual_delivery_type 列');
    }
    if (!existingCols.includes('card_key_template')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN card_key_template TEXT DEFAULT NULL COMMENT '卡密模板说明'`
      );
      log.info('[products] ✅ 已添加 card_key_template 列');
    }
    if (!existingCols.includes('resource_link_template')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN resource_link_template TEXT DEFAULT NULL COMMENT '资源链接模板'`
      );
      log.info('[products] ✅ 已添加 resource_link_template 列');
    }
    if (!existingCols.includes('virtual_content_encrypt')) {
      await AppDataSource.query(
        `ALTER TABLE products ADD COLUMN virtual_content_encrypt TINYINT(1) DEFAULT 0 COMMENT '虚拟内容是否加密显示'`
      );
      log.info('[products] ✅ 已添加 virtual_content_encrypt 列');
    }

    _productColumnsMigrated = true;
    log.info('[products] ✅ 商品标识列检查完成');
  } catch (error) {
    log.error('[products] 商品标识列迁移失败:', error);
  }
}

// 所有产品路由都需要认证
router.use(authenticateToken);

// 首次请求时自动迁移数据库
router.use(async (_req, _res, next) => {
  if (!_productColumnsMigrated) {
    await ensureProductTagColumns();
  }
  next();
});

// ==================== 产品相关路由 ====================

/**
 * @route GET /api/v1/products
 * @desc 获取产品列表
 * @access Private
 */
router.get('/', ProductController.getProducts);

/**
 * @route POST /api/v1/products
 * @desc 创建产品
 * @access Private
 */
router.post('/', ProductController.createProduct);

/**
 * @route PUT /api/v1/products/:id
 * @desc 更新产品
 * @access Private
 */
router.put('/:id', ProductController.updateProduct);

/**
 * @route DELETE /api/v1/products/:id
 * @desc 删除产品
 * @access Private
 */
router.delete('/:id', ProductController.deleteProduct);

/**
 * @route GET /api/v1/products/:id
 * @desc 获取产品详情
 * @access Private
 */
router.get('/:id', ProductController.getProductDetail);

/**
 * @route GET /api/v1/products/:id/stats
 * @desc 获取商品相关统计数据（根据用户角色权限过滤）
 * @access Private
 */
router.get('/:id/stats', ProductController.getProductStats);

/**
 * @route POST /api/v1/products/batch-import
 * @desc 批量导入产品
 * @access Private
 */
router.post('/batch-import', ProductController.batchImportProducts);

/**
 * @route GET /api/v1/products/export
 * @desc 导出产品数据
 * @access Private
 */
router.get('/export', ProductController.exportProducts);

// ==================== 库存管理相关路由 ====================

/**
 * @route GET /api/v1/products/stock/statistics
 * @desc 获取库存统计信息
 * @access Private
 */
router.get('/stock/statistics', ProductController.getStockStatistics);

/**
 * @route POST /api/v1/products/stock/adjust
 * @desc 库存调整
 * @access Private
 */
router.post('/stock/adjust', ProductController.adjustStock);

/**
 * @route GET /api/v1/products/stock/adjustments
 * @desc 获取库存调整记录
 * @access Private
 */
router.get('/stock/adjustments', ProductController.getStockAdjustments);

// ==================== 产品分类相关路由 ====================

/**
 * @route GET /api/v1/products/categories
 * @desc 获取产品分类列表（扁平结构）
 * @access Private
 */
router.get('/categories', ProductController.getCategories);

/**
 * @route GET /api/v1/products/categories/tree
 * @desc 获取产品分类树形结构
 * @access Private
 */
router.get('/categories/tree', ProductController.getCategoryTree);

/**
 * @route GET /api/v1/products/categories/:id
 * @desc 获取产品分类详情
 * @access Private
 */
router.get('/categories/:id', ProductController.getCategoryDetail);

/**
 * @route POST /api/v1/products/categories
 * @desc 创建产品分类
 * @access Private
 */
router.post('/categories', ProductController.createCategory);

/**
 * @route PUT /api/v1/products/categories/:id
 * @desc 更新产品分类
 * @access Private
 */
router.put('/categories/:id', ProductController.updateCategory);

/**
 * @route DELETE /api/v1/products/categories/:id
 * @desc 删除产品分类
 * @access Private
 */
router.delete('/categories/:id', ProductController.deleteCategory);

// ==================== 销售统计相关路由 ====================

/**
 * @route GET /api/v1/products/sales/statistics
 * @desc 获取销售统计数据（真实数据）
 * @access Private
 */
router.get('/sales/statistics', async (req, res) => {
  try {
    const { startDate, endDate, categoryId } = req.query;
    const { Order } = await import('../entities/Order');
    const { Product } = await import('../entities/Product');

    const orderRepo = getTenantRepo(Order);
    const productRepo = getTenantRepo(Product);

    // 🔥 从Order.products JSON字段统计销售数据
    let queryBuilder = orderRepo
      .createQueryBuilder('order')
      .select(['order.id', 'order.products', 'order.totalAmount'])
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

    const validOrders = await queryBuilder.getMany();

    // 🔥 统计总销售额和总销量
    let totalRevenue = 0;
    let totalSales = 0;

    // 如果需要按分类过滤，先获取该分类下的商品ID
    let categoryProductIds: string[] = [];
    if (categoryId) {
      const categoryProducts = await productRepo.find({
        where: { categoryId: categoryId as string },
        select: ['id']
      });
      categoryProductIds = categoryProducts.map(p => p.id);
    }

    validOrders.forEach(order => {
      if (order.products) {
        try {
          const orderProducts = typeof order.products === 'string'
            ? JSON.parse(order.products)
            : order.products;

          if (Array.isArray(orderProducts)) {
            orderProducts.forEach((item: any) => {
              const productId = item.productId || item.id;
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;

              // 如果有分类过滤，只统计该分类下的商品
              if (categoryId && !categoryProductIds.includes(String(productId))) {
                return;
              }

              totalSales += quantity;
              totalRevenue += quantity * price;
            });
          }
        } catch (_parseError) {
          // JSON解析失败，跳过该订单
        }
      }
    });

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
        totalRevenue: totalRevenue,
        totalSales: totalSales,
        totalProducts,
        lowStockWarning: lowStockCount,
        revenueChange: '+0%',
        salesChange: '+0%',
        productsChange: '+0%',
        warningChange: '+0%'
      }
    });
  } catch (error) {
    log.error('获取销售统计失败:', error);
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
    const { Order } = await import('../entities/Order');

    const orderRepo = getTenantRepo(Order);

    // 根据period确定时间范围
    let days = 30;
    if (period === '7days') days = 7;
    else if (period === '90days') days = 90;

    const endDateObj = endDate ? new Date(endDate as string) : new Date();
    const startDateObj = startDate ? new Date(startDate as string) : new Date(endDateObj.getTime() - days * 24 * 60 * 60 * 1000);

    // 🔥 获取有效订单
    const validOrders = await orderRepo
      .createQueryBuilder('order')
      .select(['order.id', 'order.products', 'order.totalAmount', 'order.createdAt'])
      .where('order.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
      })
      .andWhere('order.createdAt >= :startDate', { startDate: startDateObj.toISOString().split('T')[0] })
      .andWhere('order.createdAt <= :endDate', { endDate: endDateObj.toISOString().split('T')[0] + ' 23:59:59' })
      .getMany();

    // 🔥 按日期分组统计
    const dailyStats: Record<string, { sales: number; revenue: number }> = {};

    validOrders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (!dailyStats[dateKey]) {
        dailyStats[dateKey] = { sales: 0, revenue: 0 };
      }

      if (order.products) {
        try {
          const orderProducts = typeof order.products === 'string'
            ? JSON.parse(order.products)
            : order.products;

          if (Array.isArray(orderProducts)) {
            orderProducts.forEach((item: any) => {
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              dailyStats[dateKey].sales += quantity;
              dailyStats[dateKey].revenue += quantity * price;
            });
          }
        } catch (_parseError) {
          // JSON解析失败，跳过该订单
        }
      }
    });

    // 格式化数据
    const sortedDates = Object.keys(dailyStats).sort();
    const timeLabels = sortedDates.map(dateStr => {
      const date = new Date(dateStr);
      return `${date.getMonth() + 1}/${date.getDate()}`;
    });
    const salesData = sortedDates.map(dateStr => dailyStats[dateStr].sales);
    const revenueData = sortedDates.map(dateStr => dailyStats[dateStr].revenue);

    res.json({
      success: true,
      data: {
        timeLabels,
        salesData,
        revenueData
      }
    });
  } catch (error) {
    log.error('获取销售趋势失败:', error);
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
    const { Order } = await import('../entities/Order');
    const { Product } = await import('../entities/Product');

    const orderRepo = getTenantRepo(Order);
    const productRepo = getTenantRepo(Product);

    // 🔥 获取所有商品的分类信息
    const allProducts = await productRepo.find({ select: ['id', 'categoryName'] });
    const productCategoryMap: Record<string, string> = {};
    allProducts.forEach(p => {
      productCategoryMap[p.id] = p.categoryName || '未分类';
    });

    // 🔥 获取有效订单
    let queryBuilder = orderRepo
      .createQueryBuilder('order')
      .select(['order.id', 'order.products'])
      .where('order.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
      });

    if (startDate) {
      queryBuilder = queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder = queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });
    }

    const validOrders = await queryBuilder.getMany();

    // 🔥 按分类统计销售额
    const categoryStats: Record<string, number> = {};

    validOrders.forEach(order => {
      if (order.products) {
        try {
          const orderProducts = typeof order.products === 'string'
            ? JSON.parse(order.products)
            : order.products;

          if (Array.isArray(orderProducts)) {
            orderProducts.forEach((item: any) => {
              const productId = item.productId || item.id;
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;
              const categoryName = productCategoryMap[String(productId)] || '未分类';
              const revenue = quantity * price;

              categoryStats[categoryName] = (categoryStats[categoryName] || 0) + revenue;
            });
          }
        } catch (_parseError) {
          // JSON解析失败，跳过该订单
        }
      }
    });

    // 计算总额和百分比
    const totalValue = Object.values(categoryStats).reduce((sum, value) => sum + value, 0);
    const result = Object.entries(categoryStats)
      .map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: totalValue > 0 ? Math.round((value / totalValue) * 100) : 0
      }))
      .sort((a, b) => b.value - a.value);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('获取分类销售数据失败:', error);
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
    const { Order } = await import('../entities/Order');
    const { Product } = await import('../entities/Product');

    const orderRepo = getTenantRepo(Order);
    const productRepo = getTenantRepo(Product);

    // 🔥 获取所有商品信息
    const allProducts = await productRepo.find({ select: ['id', 'name', 'categoryName'] });
    const productInfoMap: Record<string, { name: string; categoryName: string }> = {};
    allProducts.forEach(p => {
      productInfoMap[p.id] = { name: p.name, categoryName: p.categoryName || '未分类' };
    });

    // 🔥 获取有效订单
    let queryBuilder = orderRepo
      .createQueryBuilder('order')
      .select(['order.id', 'order.products'])
      .where('order.status NOT IN (:...excludeStatuses)', {
        excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
      });

    if (startDate) {
      queryBuilder = queryBuilder.andWhere('order.createdAt >= :startDate', { startDate });
    }
    if (endDate) {
      queryBuilder = queryBuilder.andWhere('order.createdAt <= :endDate', { endDate: endDate + ' 23:59:59' });
    }

    const validOrders = await queryBuilder.getMany();

    // 🔥 按商品统计销量
    const productStats: Record<string, { sales: number; revenue: number }> = {};

    validOrders.forEach(order => {
      if (order.products) {
        try {
          const orderProducts = typeof order.products === 'string'
            ? JSON.parse(order.products)
            : order.products;

          if (Array.isArray(orderProducts)) {
            orderProducts.forEach((item: any) => {
              const productId = String(item.productId || item.id);
              const quantity = Number(item.quantity) || 1;
              const price = Number(item.price) || 0;

              if (!productStats[productId]) {
                productStats[productId] = { sales: 0, revenue: 0 };
              }
              productStats[productId].sales += quantity;
              productStats[productId].revenue += quantity * price;
            });
          }
        } catch (_parseError) {
          // JSON解析失败，跳过该订单
        }
      }
    });

    // 排序并取前N名
    const result = Object.entries(productStats)
      .map(([productId, stats]) => ({
        id: productId,
        name: productInfoMap[productId]?.name || '未知商品',
        categoryName: productInfoMap[productId]?.categoryName || '未分类',
        sales: stats.sales,
        revenue: Math.round(stats.revenue)
      }))
      .sort((a, b) => b.sales - a.sales)
      .slice(0, Number(limit));

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    log.error('获取热销产品排行失败:', error);
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
    const { Product } = await import('../entities/Product');

    const productRepo = getTenantRepo(Product);

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
  } catch (error) {
    log.error('获取库存预警数据失败:', error);
    res.status(500).json({
      success: false,
      message: '获取库存预警数据失败'
    });
  }
});

export default router;
