import { Request, Response } from 'express'
import { Product } from '../entities/Product'
import { ProductCategory } from '../entities/ProductCategory'
import { ProductSku } from '../entities/ProductSku'
import { ProductSpecGroup } from '../entities/ProductSpecGroup'
import { StockAdjustment } from '../entities/StockAdjustment'
import { getTenantRepo } from '../utils/tenantRepo'

import { log } from '../config/logger';
const getProductRepository = () => getTenantRepo(Product)
const getCategoryRepository = () => getTenantRepo(ProductCategory)
const getSkuRepository = () => getTenantRepo(ProductSku)
const getSpecGroupRepository = () => getTenantRepo(ProductSpecGroup)
const getStockAdjustmentRepository = () => getTenantRepo(StockAdjustment)

// 生成唯一ID
function generateId(prefix: string = ''): string {
  return `${prefix}${Date.now().toString()}_${Math.random().toString(36).slice(2, 8)}`
}

// 辅助函数：构建分类树
function buildCategoryTree(categories: ProductCategory[]): any[] {
  const categoryMap = new Map<string, any>()
  const rootCategories: any[] = []

  // 创建分类映射（保留原始字段值）
  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      children: []
    })
  })

  // 构建树形结构
  categories.forEach(category => {
    const categoryNode = categoryMap.get(category.id)!
    if (category.parentId) {
      const parent = categoryMap.get(category.parentId)
      if (parent) {
        parent.children = parent.children || []
        parent.children.push(categoryNode)
      } else {
        // 父分类不存在，作为根分类
        rootCategories.push(categoryNode)
      }
    } else {
      rootCategories.push(categoryNode)
    }
  })

  return rootCategories
}

export class ProductController {
  /**
   * 获取产品分类列表（扁平结构）
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const categoryRepo = getCategoryRepository()
      const categories = await categoryRepo.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      })

      res.json({
        success: true,
        data: categories,
        message: '获取分类列表成功'
      })
    } catch (error) {
      log.error('获取分类列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分类列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取产品分类树形结构
   */
  static async getCategoryTree(req: Request, res: Response) {
    try {
      const categoryRepo = getCategoryRepository()
      const categories = await categoryRepo.find({
        order: { sortOrder: 'ASC', createdAt: 'ASC' }
      })

      // 统计每个分类下的商品数量（不含已删除，包含上架和下架的商品种类数）
      const productRepo = getProductRepository()
      const productCounts: Record<string, number> = {}
      for (const cat of categories) {
        const count = await productRepo.createQueryBuilder('product')
          .where('product.categoryId = :catId', { catId: cat.id })
          .andWhere('product.status != :deleted', { deleted: 'deleted' })
          .getCount()
        productCounts[cat.id] = count
      }

      // 构建树形结构并附加字段
      const enrichedCategories = categories.map(cat => ({
        id: cat.id,
        name: cat.name,
        code: cat.code || '',
        parentId: cat.parentId || null,
        level: cat.level || ((!cat.parentId || cat.parentId === '0') ? 1 : 2),
        sort: cat.sortOrder || 0,
        sortOrder: cat.sortOrder || 0,
        status: cat.status,
        description: cat.description || '',
        productCount: productCounts[cat.id] || 0,
        createTime: cat.createdAt ? new Date(cat.createdAt).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) : ''
      }))

      const tree = buildCategoryTree(enrichedCategories as any)

      res.json({
        success: true,
        data: tree,
        message: '获取分类树成功'
      })
    } catch (error) {
      log.error('获取分类树失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分类树失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取分类详情
   */
  static async getCategoryDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const categoryRepo = getCategoryRepository()
      const category = await categoryRepo.findOne({ where: { id } })

      if (!category) {
        res.status(404).json({
          success: false,
          message: '分类不存在'
        })
        return
      }

      res.json({
        success: true,
        data: category,
        message: '获取分类详情成功'
      })
    } catch (error) {
      log.error('获取分类详情失败:', error)
      res.status(500).json({
        success: false,
        message: '获取分类详情失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 创建产品分类
   */
  static async createCategory(req: Request, res: Response): Promise<void> {
    try {
      const { name, code, parentId, sortOrder, sort, status, description } = req.body
      const categoryRepo = getCategoryRepository()

      if (!name) {
        res.status(400).json({ success: false, message: '分类名称不能为空' })
        return
      }

      const categoryId = generateId('cat_')
      const level = (!parentId || parentId === '0') ? 1 : 2

      // 自动编码：如果未填写code，则自动生成
      let finalCode = code
      if (!finalCode) {
        const prefix = level === 1 ? 'C' : 'SC'
        const count = await categoryRepo.count()
        finalCode = `${prefix}${String(count + 1).padStart(3, '0')}`
      }

      // 排序处理：兼容 sortOrder 和 sort 参数
      let finalSort = sortOrder !== undefined ? sortOrder : (sort !== undefined ? sort : 0)
      if (finalSort > 0) {
        const conflicting = await categoryRepo.find({
          where: { sortOrder: finalSort },
          order: { sortOrder: 'ASC' }
        })
        if (conflicting.length > 0) {
          // 将>=该排序值的分类全部+1顺延
          await categoryRepo.createQueryBuilder()
            .update()
            .set({ sortOrder: () => 'sort_order + 1' })
            .where('sort_order >= :sort', { sort: finalSort })
            .execute()
        }
      }

      const newCategory = categoryRepo.create({
        id: categoryId,
        name,
        code: finalCode,
        parentId: parentId || undefined,
        level,
        sortOrder: finalSort,
        status: status || 'active',
        description
      })

      await categoryRepo.save(newCategory)
      log.info('[ProductController] 创建分类成功:', newCategory.name, 'code:', finalCode, 'ID:', newCategory.id)

      res.status(201).json({
        success: true,
        data: newCategory,
        message: '创建分类成功'
      })
    } catch (error) {
      log.error('创建分类失败:', error)
      res.status(500).json({
        success: false,
        message: '创建分类失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 更新产品分类
   */
  static async updateCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const { name, code, parentId, sortOrder, sort, status, description } = req.body
      const categoryRepo = getCategoryRepository()

      const category = await categoryRepo.findOne({ where: { id } })
      if (!category) {
        res.status(404).json({ success: false, message: '分类不存在' })
        return
      }

      if (name !== undefined) category.name = name
      if (code !== undefined) category.code = code
      if (parentId !== undefined) {
        category.parentId = parentId || undefined
        category.level = (!parentId || parentId === '0') ? 1 : 2
      }
      const newSort = sortOrder !== undefined ? sortOrder : sort
      if (newSort !== undefined) {
        if (newSort !== category.sortOrder && newSort > 0) {
          await categoryRepo.createQueryBuilder()
            .update()
            .set({ sortOrder: () => 'sort_order + 1' })
            .where('sort_order >= :sort AND id != :id', { sort: newSort, id })
            .execute()
        }
        category.sortOrder = newSort
      }
      if (status !== undefined) category.status = status
      if (description !== undefined) category.description = description

      await categoryRepo.save(category)

      res.json({
        success: true,
        data: category,
        message: '更新分类成功'
      })
    } catch (error) {
      log.error('更新分类失败:', error)
      res.status(500).json({
        success: false,
        message: '更新分类失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 删除产品分类
   */
  static async deleteCategory(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const categoryRepo = getCategoryRepository()
      const productRepo = getProductRepository()

      const category = await categoryRepo.findOne({ where: { id } })
      if (!category) {
        res.status(404).json({
          success: false,
          message: '分类不存在'
        })
        return
      }

      // 检查是否有子分类
      const childCategories = await categoryRepo.find({ where: { parentId: id } })
      if (childCategories.length > 0) {
        res.status(400).json({
          success: false,
          message: '该分类下还有子分类，无法删除'
        })
        return
      }

      // 检查是否有关联产品
      const products = await productRepo.find({ where: { categoryId: id } })
      if (products.length > 0) {
        res.status(400).json({
          success: false,
          message: '该分类下还有产品，无法删除'
        })
        return
      }

      await categoryRepo.remove(category)

      res.json({
        success: true,
        message: '删除分类成功'
      })
    } catch (error) {
      log.error('删除分类失败:', error)
      res.status(500).json({
        success: false,
        message: '删除分类失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }


  /**
   * 获取产品列表
   */
  static async getProducts(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        pageSize = 10,
        keyword,
        categoryId,
        status,
        lowStock,
        productType,
        forOrder,
        userDepartmentId
      } = req.query

      const productRepo = getProductRepository()
      const queryBuilder = productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')

      // 关键词搜索
      if (keyword) {
        queryBuilder.andWhere(
          '(product.name LIKE :keyword OR product.code LIKE :keyword)',
          { keyword: `%${keyword}%` }
        )
      }

      // 分类筛选
      if (categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId })
      }

      // 状态筛选
      if (status) {
        queryBuilder.andWhere('product.status = :status', { status })
      }

      // 商品类型筛选
      if (productType) {
        queryBuilder.andWhere('product.productType = :productType', { productType })
      }

      // 低库存筛选
      if (lowStock === 'true') {
        queryBuilder.andWhere('product.stock <= product.minStock')
      }

      // 按部门过滤可下单商品（订单页面调用时传入）
      if (forOrder === 'true' && userDepartmentId) {
        queryBuilder.andWhere(
          '(product.allowed_departments IS NULL OR JSON_CONTAINS(product.allowed_departments, :deptIdJson))',
          { deptIdJson: JSON.stringify(String(userDepartmentId)) }
        )
      }

      // 获取总数
      const total = await queryBuilder.getCount()

      // 分页
      const skip = (Number(page) - 1) * Number(pageSize)
      queryBuilder.skip(skip).take(Number(pageSize))
      queryBuilder.orderBy('product.createdAt', 'DESC')

      const products = await queryBuilder.getMany()

      // 🔥 从订单的products JSON字段统计每个商品的销量
      const productIds = products.map(p => p.id)
      const salesCountMap: Record<string, number> = {}

      if (productIds.length > 0) {
        try {
          const { Order } = await import('../entities/Order')
          const orderRepo = getTenantRepo(Order)

          // 🔥 获取有效订单（已审核通过且未取消的订单）
          // 🔥 性能修复：原来无条件拉取租户内全部订单到内存解析JSON统计（订单量大时每次打开商品列表都30秒+）
          // 改为只拉取 products JSON 中包含当前页商品ID的订单（每页最多10~20个商品的LIKE过滤，大幅减少返回行数）
          const productIdConditions = productIds.map((_id, i) => `order.products LIKE :pid${i}`)
          const productIdParams: Record<string, string> = {}
          productIds.forEach((id, i) => {
            productIdParams[`pid${i}`] = `%${id}%`
          })

          const validOrders = await orderRepo
            .createQueryBuilder('order')
            .select(['order.id', 'order.products'])
            .where('order.status NOT IN (:...excludeStatuses)', {
              excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
            })
            .andWhere(`(${productIdConditions.join(' OR ')})`, productIdParams)
            .getMany()

          // 🔥 从每个订单的products JSON字段中统计销量
          validOrders.forEach(order => {
            if (order.products) {
              try {
                const orderProducts = typeof order.products === 'string'
                  ? JSON.parse(order.products)
                  : order.products

                if (Array.isArray(orderProducts)) {
                  orderProducts.forEach((item: any) => {
                    const productId = item.productId || item.id
                    const quantity = Number(item.quantity) || 1
                    if (productId && productIds.includes(String(productId))) {
                      salesCountMap[String(productId)] = (salesCountMap[String(productId)] || 0) + quantity
                    }
                  })
                }
              } catch (_parseError) {
                // JSON解析失败，跳过该订单
                log.warn('[商品列表] 解析订单商品JSON失败:', order.id)
              }
            }
          })

          log.info('[商品列表] 销量统计:', salesCountMap)
        } catch (salesError) {
          log.error('[商品列表] 统计销量失败:', salesError)
          // 销量统计失败不影响商品列表返回
        }
      }

      // 🔥 查询虚拟商品的库存数量（卡密/资源中unused状态的数量）
      const virtualStockMap: Record<string, number> = {}
      const virtualProducts = products.filter(p => p.productType === 'virtual' && p.virtualDeliveryType && p.virtualDeliveryType !== 'none')
      if (virtualProducts.length > 0) {
        try {
          const { getDataSource } = await import('../config/database')
          const ds = getDataSource()
          const tenantId = (req as any).user?.tenantId || (req as any).tenantId || 'default'

          // 统计卡密库存
          const cardKeyProducts = virtualProducts.filter(p => p.virtualDeliveryType === 'card_key')
          if (cardKeyProducts.length > 0) {
            const ckIds = cardKeyProducts.map(p => p.id)
            const ckRows = await ds.query(
              `SELECT product_id, COUNT(*) as cnt FROM card_key_inventory WHERE product_id IN (${ckIds.map(() => '?').join(',')}) AND status = 'unused' AND tenant_id = ? GROUP BY product_id`,
              [...ckIds, tenantId]
            )
            ckRows.forEach((r: any) => { virtualStockMap[r.product_id] = Number(r.cnt) })
          }

          // 统计资源库存
          const resProducts = virtualProducts.filter(p => p.virtualDeliveryType === 'resource_link')
          if (resProducts.length > 0) {
            const resIds = resProducts.map(p => p.id)
            const resRows = await ds.query(
              `SELECT product_id, COUNT(*) as cnt FROM resource_inventory WHERE product_id IN (${resIds.map(() => '?').join(',')}) AND status = 'unused' AND tenant_id = ? GROUP BY product_id`,
              [...resIds, tenantId]
            )
            resRows.forEach((r: any) => { virtualStockMap[r.product_id] = Number(r.cnt) })
          }

          // 🔥 同步更新products表的stock字段为虚拟库存数量
          for (const vp of virtualProducts) {
            const vStock = virtualStockMap[vp.id] || 0
            if (vp.stock !== vStock) {
              vp.stock = vStock
              await productRepo.update(vp.id, { stock: vStock })
            }
          }

          log.info('[商品列表] 虚拟库存统计:', virtualStockMap)
        } catch (virtualStockError) {
          log.error('[商品列表] 统计虚拟库存失败:', virtualStockError)
        }
      }

      // 统计有SKU商品的上下架SKU数量
      const skuStatusMap: Record<string, { active: number; inactive: number }> = {}
      const skuProducts = products.filter(p => (p as any).skuType === 'multi')
      if (skuProducts.length > 0) {
        try {
          const skuRepo = getSkuRepository()
          for (const sp of skuProducts) {
            const allSkus = await skuRepo.find({ where: { productId: sp.id } })
            skuStatusMap[sp.id] = {
              active: allSkus.filter(s => s.status === 'active').length,
              inactive: allSkus.filter(s => s.status !== 'active').length
            }
          }
        } catch (e) { log.error('统计SKU状态失败:', e) }
      }

      const list = products.map(p => {
        let stock = p.stock
        if (p.productType === 'virtual' && p.virtualDeliveryType && p.virtualDeliveryType !== 'none') {
          stock = virtualStockMap[p.id] || 0
        }

        const skuType = (p as any).skuType || 'none'
        const displayStock = (skuType !== 'none' && p.totalStock !== null && p.totalStock !== undefined)
          ? p.totalStock : stock

        return {
          id: p.id,
          code: p.code,
          name: p.name,
          categoryId: p.categoryId,
          categoryName: p.categoryName || p.category?.name || '',
          brand: p.brand || '',
          specification: p.specification || '',
          unit: p.unit || '件',
          weight: Number(p.weight) || 0,
          dimensions: p.dimensions || '',
          description: p.description || '',
          price: Number(p.price),
          costPrice: Number(p.costPrice) || 0,
          marketPrice: Number(p.price),
          stock: displayStock,
          minStock: p.minStock || 0,
          maxStock: p.maxStock || 0,
          salesCount: salesCountMap[p.id] || 0,
          status: p.status,
          isRecommended: !!p.isRecommended,
          isNew: !!p.isNew,
          isHot: !!p.isHot,
          image: p.images?.[0] || '',
          images: p.images || [],
          specifications: p.specifications || {},
          productType: p.productType || 'physical',
          virtualDeliveryType: p.virtualDeliveryType || null,
          virtualStockCount: p.productType === 'virtual' ? (p.virtualDeliveryType === 'none' ? stock : (virtualStockMap[p.id] || 0)) : undefined,
          cardKeyTemplate: p.cardKeyTemplate || null,
          resourceLinkTemplate: p.resourceLinkTemplate || null,
          virtualContentEncrypt: !!p.virtualContentEncrypt,
          allowedDepartments: p.allowedDepartments || null,
          skuType,
          minPrice: skuType !== 'none' ? Number(p.minPrice) || null : null,
          maxPrice: skuType !== 'none' ? Number(p.maxPrice) || null : null,
          totalStock: skuType !== 'none' ? (p.totalStock ?? 0) : null,
          activeSkuCount: skuStatusMap[p.id]?.active ?? null,
          inactiveSkuCount: skuStatusMap[p.id]?.inactive ?? null,
          createdBy: p.createdBy || '',
          createTime: p.createdAt?.toISOString() || '',
          updateTime: p.updatedAt?.toISOString() || ''
        }
      })

      res.json({
        success: true,
        data: {
          list,
          total,
          page: Number(page),
          pageSize: Number(pageSize),
          totalPages: Math.ceil(total / Number(pageSize))
        }
      })
    } catch (error) {
      log.error('获取产品列表失败:', error)
      res.status(500).json({
        success: false,
        message: '获取产品列表失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取产品详情
   */
  static async getProductDetail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const productRepo = getProductRepository()
      const product = await productRepo.findOne({
        where: { id },
        relations: ['category']
      })

      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      // 🔥 计算虚拟商品库存数量
      let virtualStockCount: number | undefined = undefined
      let stock = product.stock
      if (product.productType === 'virtual') {
        if (product.virtualDeliveryType && product.virtualDeliveryType !== 'none') {
          try {
            const { getDataSource } = await import('../config/database')
            const ds = getDataSource()
            const tenantId = (req as any).user?.tenantId || (req as any).tenantId || 'default'
            const table = product.virtualDeliveryType === 'card_key' ? 'card_key_inventory' : 'resource_inventory'
            const [result] = await ds.query(
              `SELECT COUNT(*) as cnt FROM ${table} WHERE product_id = ? AND status = 'unused' AND tenant_id = ?`,
              [product.id, tenantId]
            )
            virtualStockCount = Number(result?.cnt || 0)
            stock = virtualStockCount
          } catch (e) {
            log.error('[商品详情] 统计虚拟库存失败:', e)
          }
        } else {
          virtualStockCount = product.stock ?? 0
        }
      }

      const skuType = (product as any).skuType || 'none'
      let skus: any[] = []
      let specGroups: any[] = []
      if (skuType !== 'none' && product.productType === 'physical') {
        try {
          const skuRepo = getSkuRepository()
          const specGroupRepo = getSpecGroupRepository()
          skus = await skuRepo.find({
            where: { productId: product.id },
            order: { sortOrder: 'ASC', createdAt: 'ASC' }
          })
          specGroups = await specGroupRepo.find({
            where: { productId: product.id },
            order: { sortOrder: 'ASC' }
          })
        } catch (e) {
          log.error('[商品详情] 加载SKU数据失败:', e)
        }
      }

      const displayStock = (skuType !== 'none' && product.totalStock !== null && product.totalStock !== undefined)
        ? product.totalStock : stock

      // 统计销量
      let salesCount = 0
      let salesAmount = 0
      try {
        const { Order } = await import('../entities/Order')
        const orderRepo = getTenantRepo(Order)
        const validOrders = await orderRepo
          .createQueryBuilder('order')
          .select(['order.id', 'order.products'])
          .where('order.status NOT IN (:...excludeStatuses)', {
            excludeStatuses: ['cancelled', 'pending_transfer', 'pending_audit', 'audit_rejected']
          })
          .getMany()
        validOrders.forEach((order: any) => {
          try {
            const prods = typeof order.products === 'string' ? JSON.parse(order.products) : order.products
            if (Array.isArray(prods)) {
              prods.forEach((p: any) => {
                const pid = String(p.productId || p.id || '')
                const qty = Number(p.quantity || 0)
                const price = Number(p.price || 0)
                if (pid === product.id || pid === String(product.id)) {
                  salesCount += qty
                  salesAmount += qty * price
                }
              })
            }
          } catch (_) { /* ignore */ }
        })
      } catch (e) {
        log.error('[商品详情] 统计销量失败:', e)
      }

      res.json({
        success: true,
        data: {
          id: product.id,
          code: product.code,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.categoryName || product.category?.name || '',
          description: product.description || '',
          price: Number(product.price),
          costPrice: Number(product.costPrice) || 0,
          stock: displayStock,
          minStock: product.minStock || 0,
          maxStock: product.maxStock || 0,
          unit: product.unit || '件',
          brand: product.brand || '',
          specification: product.specification || '',
          weight: Number(product.weight) || 0,
          dimensions: product.dimensions || '',
          status: product.status,
          isRecommended: !!product.isRecommended,
          isNew: !!product.isNew,
          isHot: !!product.isHot,
          image: product.images?.[0] || '',
          images: product.images || [],
          specifications: product.specifications || {},
          productType: product.productType || 'physical',
          virtualDeliveryType: product.virtualDeliveryType || null,
          virtualStockCount,
          cardKeyTemplate: product.cardKeyTemplate || null,
          resourceLinkTemplate: product.resourceLinkTemplate || null,
          virtualContentEncrypt: !!product.virtualContentEncrypt,
          allowedDepartments: product.allowedDepartments || null,
          skuType,
          minPrice: skuType !== 'none' ? Number(product.minPrice) || null : null,
          maxPrice: skuType !== 'none' ? Number(product.maxPrice) || null : null,
          totalStock: skuType !== 'none' ? (product.totalStock ?? 0) : null,
          skus: skus.map(s => ({
            id: s.id,
            skuCode: s.skuCode,
            skuName: s.skuName,
            skuImage: s.skuImage || '',
            price: Number(s.price),
            costPrice: Number(s.costPrice) || 0,
            stock: s.stock,
            salesCount: s.salesCount || 0,
            weight: Number(s.weight) || 0,
            barcode: s.barcode || '',
            specValues: s.specValues || {},
            sortOrder: s.sortOrder || 0,
            status: s.status || 'active'
          })),
          specGroups: specGroups.map(g => ({
            id: g.id,
            specName: g.specName,
            specValues: g.specValues || [],
            sortOrder: g.sortOrder || 0
          })),
          salesCount,
          salesAmount,
          createdBy: product.createdBy || '',
          createTime: product.createdAt?.toISOString() || '',
          updateTime: product.updatedAt?.toISOString() || ''
        }
      })
    } catch (error) {
      log.error('获取产品详情失败:', error)
      res.status(500).json({
        success: false,
        message: '获取产品详情失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 创建产品
   */
  static async createProduct(req: Request, res: Response): Promise<void> {
    try {
      const productData = req.body
      const productRepo = getProductRepository()
      const categoryRepo = getCategoryRepository()

      // 验证必填字段
      if (!productData.name) {
        res.status(400).json({
          success: false,
          message: '产品名称不能为空'
        })
        return
      }

      // 生成产品ID和编码
      const productId = generateId('prod_')
      const productCode = productData.code || `P${Date.now().toString().slice(-8)}`

      // 检查编码是否已存在
      const existingProduct = await productRepo.findOne({ where: { code: productCode } })
      if (existingProduct) {
        res.status(400).json({
          success: false,
          message: '产品编码已存在'
        })
        return
      }

      // 获取分类名称
      let categoryName = productData.categoryName || ''
      if (productData.categoryId && !categoryName) {
        const category = await categoryRepo.findOne({ where: { id: productData.categoryId } })
        if (category) {
          categoryName = category.name
        }
      }

      // 获取当前用户ID（从请求中获取）
      const createdBy = (req as any).user?.id || 'system'

      const skuType = (productData.productType === 'physical' && productData.skuType && productData.skuType !== 'none')
        ? productData.skuType : 'none'
      const skuList: any[] = productData.skus || []
      const specGroupList: any[] = productData.specGroups || []

      let minPrice: number | null = null
      let maxPrice: number | null = null
      let totalStock: number | null = null
      if (skuType !== 'none' && skuList.length > 0) {
        const prices = skuList.map((s: any) => Number(s.price) || 0)
        minPrice = Math.min(...prices)
        maxPrice = Math.max(...prices)
        totalStock = skuList.reduce((sum: number, s: any) => sum + (Number(s.stock) || 0), 0)
      }

      const newProduct = productRepo.create({
        id: productId,
        code: productCode,
        name: productData.name,
        categoryId: productData.categoryId || undefined,
        categoryName,
        description: productData.description || '',
        price: Number(productData.price) || 0,
        costPrice: Number(productData.costPrice) || 0,
        stock: skuType !== 'none' ? (totalStock || 0) : (Number(productData.stock) || 0),
        minStock: Number(productData.minStock) || 0,
        maxStock: Number(productData.maxStock) || 0,
        unit: productData.unit || '件',
        brand: productData.brand || '',
        specification: productData.specification || '',
        weight: Number(productData.weight) || 0,
        dimensions: productData.dimensions || '',
        images: productData.images || (productData.image ? [productData.image] : []),
        status: productData.status || 'active',
        isRecommended: !!productData.isRecommended,
        isNew: !!productData.isNew,
        isHot: !!productData.isHot,
        productType: productData.productType || 'physical',
        virtualDeliveryType: productData.productType === 'virtual' ? (productData.virtualDeliveryType || null) : null,
        cardKeyTemplate: productData.cardKeyTemplate || null,
        resourceLinkTemplate: productData.resourceLinkTemplate || null,
        virtualContentEncrypt: !!productData.virtualContentEncrypt,
        allowedDepartments: productData.allowedDepartments || null,
        skuType,
        minPrice,
        maxPrice,
        totalStock,
        createdBy
      })

      await productRepo.save(newProduct)

      if (skuType !== 'none') {
        try {
          const skuRepo = getSkuRepository()
          const specGroupRepo = getSpecGroupRepository()

          for (let i = 0; i < specGroupList.length; i++) {
            const g = specGroupList[i]
            const specGroup = specGroupRepo.create({
              id: g.id || generateId('sg_'),
              productId: productId,
              specName: g.specName,
              specValues: g.specValues || [],
              sortOrder: i
            })
            await specGroupRepo.save(specGroup)
          }

          for (let i = 0; i < skuList.length; i++) {
            const s = skuList[i]
            const sku = skuRepo.create({
              id: s.id || generateId('sku_'),
              productId: productId,
              skuCode: s.skuCode || `${productCode}-${i + 1}`,
              skuName: s.skuName || '',
              skuImage: s.skuImage || null,
              price: Number(s.price) || 0,
              costPrice: Number(s.costPrice) || 0,
              stock: Number(s.stock) || 0,
              salesCount: 0,
              weight: Number(s.weight) || 0,
              barcode: s.barcode || null,
              specValues: s.specValues || {},
              sortOrder: i,
              status: s.status || 'active'
            })
            await skuRepo.save(sku)
          }
        } catch (skuError) {
          log.error('[ProductController] 保存SKU数据失败:', skuError)
        }
      }

      log.info('[ProductController] 创建产品成功:', newProduct.name, 'ID:', newProduct.id, 'SKU:', skuType)

      res.status(201).json({
        success: true,
        data: {
          id: newProduct.id,
          code: newProduct.code,
          name: newProduct.name,
          categoryId: newProduct.categoryId,
          categoryName: newProduct.categoryName,
          description: newProduct.description || '',
          price: Number(newProduct.price),
          costPrice: Number(newProduct.costPrice) || 0,
          stock: newProduct.stock,
          minStock: newProduct.minStock || 0,
          unit: newProduct.unit || '件',
          status: newProduct.status,
          isRecommended: !!newProduct.isRecommended,
          isNew: !!newProduct.isNew,
          isHot: !!newProduct.isHot,
          image: newProduct.images?.[0] || '',
          images: newProduct.images || [],
          specifications: {},
          productType: newProduct.productType || 'physical',
          virtualDeliveryType: newProduct.virtualDeliveryType || null,
          cardKeyTemplate: newProduct.cardKeyTemplate || null,
          resourceLinkTemplate: newProduct.resourceLinkTemplate || null,
          virtualContentEncrypt: !!newProduct.virtualContentEncrypt,
          skuType: newProduct.skuType || 'none',
          minPrice: newProduct.minPrice,
          maxPrice: newProduct.maxPrice,
          totalStock: newProduct.totalStock,
          createdBy: newProduct.createdBy || '',
          createTime: newProduct.createdAt?.toISOString() || '',
          updateTime: newProduct.updatedAt?.toISOString() || ''
        },
        message: '创建产品成功'
      })
    } catch (error) {
      log.error('创建产品失败:', error)
      res.status(500).json({
        success: false,
        message: '创建产品失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 更新产品
   */
  static async updateProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const updates = req.body
      const productRepo = getProductRepository()

      const product = await productRepo.findOne({ where: { id } })
      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      // 更新产品信息
      if (updates.name !== undefined) product.name = updates.name
      if (updates.code !== undefined) product.code = updates.code
      if (updates.categoryId !== undefined) product.categoryId = updates.categoryId
      if (updates.categoryName !== undefined) product.categoryName = updates.categoryName
      if (updates.description !== undefined) product.description = updates.description
      if (updates.price !== undefined) product.price = Number(updates.price)
      if (updates.costPrice !== undefined) product.costPrice = Number(updates.costPrice)
      if (updates.stock !== undefined) product.stock = Number(updates.stock)
      if (updates.minStock !== undefined) product.minStock = Number(updates.minStock)
      if (updates.maxStock !== undefined) product.maxStock = Number(updates.maxStock)
      if (updates.unit !== undefined) product.unit = updates.unit
      if (updates.brand !== undefined) product.brand = updates.brand
      if (updates.specification !== undefined) product.specification = updates.specification
      if (updates.weight !== undefined) product.weight = Number(updates.weight)
      if (updates.dimensions !== undefined) product.dimensions = updates.dimensions
      if (updates.status !== undefined) product.status = updates.status
      if (updates.isRecommended !== undefined) product.isRecommended = !!updates.isRecommended
      if (updates.isNew !== undefined) product.isNew = !!updates.isNew
      if (updates.isHot !== undefined) product.isHot = !!updates.isHot
      if (updates.images !== undefined) product.images = updates.images
      if (updates.image !== undefined && !updates.images) {
        product.images = [updates.image]
      }
      if (updates.virtualDeliveryType !== undefined) product.virtualDeliveryType = updates.virtualDeliveryType
      if (updates.cardKeyTemplate !== undefined) product.cardKeyTemplate = updates.cardKeyTemplate
      if (updates.resourceLinkTemplate !== undefined) product.resourceLinkTemplate = updates.resourceLinkTemplate
      if (updates.virtualContentEncrypt !== undefined) product.virtualContentEncrypt = !!updates.virtualContentEncrypt
      if (updates.allowedDepartments !== undefined) product.allowedDepartments = updates.allowedDepartments

      if (product.productType === 'physical' && updates.skuType !== undefined) {
        product.skuType = updates.skuType

        if (updates.skuType !== 'none') {
          const skuList: any[] = updates.skus || []
          const specGroupList: any[] = updates.specGroups || []

          if (skuList.length > 0 || specGroupList.length > 0) {
            try {
              const skuRepo = getSkuRepository()
              const specGroupRepo = getSpecGroupRepository()

              if (specGroupList.length > 0) {
                await specGroupRepo.delete({ productId: id })
                for (let i = 0; i < specGroupList.length; i++) {
                  const g = specGroupList[i]
                  const specGroup = specGroupRepo.create({
                    id: g.id || generateId('sg_'),
                    productId: id,
                    specName: g.specName,
                    specValues: g.specValues || [],
                    sortOrder: i
                  })
                  await specGroupRepo.save(specGroup)
                }
              }

              const existingSkuIds = (await skuRepo.find({ where: { productId: id }, select: ['id'] })).map(s => s.id)
              const newSkuIds = skuList.filter((s: any) => s.id).map((s: any) => s.id)
              const toDelete = existingSkuIds.filter(sid => !newSkuIds.includes(sid))
              for (const delId of toDelete) {
                await skuRepo.delete(delId)
              }

              for (let i = 0; i < skuList.length; i++) {
                const s = skuList[i]
                const skuId = s.id || generateId('sku_')
                const existing = s.id ? await skuRepo.findOne({ where: { id: s.id } }) : null
                if (existing) {
                  existing.skuCode = s.skuCode || existing.skuCode
                  existing.skuName = s.skuName || existing.skuName
                  existing.skuImage = s.skuImage !== undefined ? s.skuImage : existing.skuImage
                  existing.price = Number(s.price) ?? existing.price
                  existing.costPrice = Number(s.costPrice) ?? existing.costPrice
                  existing.stock = s.stock !== undefined ? Number(s.stock) : existing.stock
                  existing.weight = s.weight !== undefined ? Number(s.weight) : existing.weight
                  existing.barcode = s.barcode !== undefined ? s.barcode : existing.barcode
                  existing.specValues = s.specValues || existing.specValues
                  existing.sortOrder = i
                  existing.status = s.status || existing.status
                  await skuRepo.save(existing)
                } else {
                  const newSku = skuRepo.create({
                    id: skuId,
                    productId: id,
                    skuCode: s.skuCode || `${product.code}-${i + 1}`,
                    skuName: s.skuName || '',
                    skuImage: s.skuImage || null,
                    price: Number(s.price) || 0,
                    costPrice: Number(s.costPrice) || 0,
                    stock: Number(s.stock) || 0,
                    salesCount: 0,
                    weight: Number(s.weight) || 0,
                    barcode: s.barcode || null,
                    specValues: s.specValues || {},
                    sortOrder: i,
                    status: s.status || 'active'
                  })
                  await skuRepo.save(newSku)
                }
              }

              const allSkus = await skuRepo.find({ where: { productId: id } })
              const activeSkus = allSkus.filter(s => s.status === 'active')
              if (activeSkus.length > 0) {
                const prices = activeSkus.map(s => Number(s.price))
                product.minPrice = Math.min(...prices)
                product.maxPrice = Math.max(...prices)
                product.totalStock = activeSkus.reduce((sum, s) => sum + s.stock, 0)
              } else {
                product.minPrice = null
                product.maxPrice = null
                product.totalStock = 0
              }
            } catch (skuError) {
              log.error('[ProductController] 更新SKU数据失败:', skuError)
            }
          }
        } else {
          try {
            const skuRepo = getSkuRepository()
            const specGroupRepo = getSpecGroupRepository()
            await skuRepo.delete({ productId: id })
            await specGroupRepo.delete({ productId: id })
            product.minPrice = null
            product.maxPrice = null
            product.totalStock = null
          } catch (cleanError) {
            log.error('[ProductController] 清理SKU数据失败:', cleanError)
          }
        }
      }

      await productRepo.save(product)
      log.info('[ProductController] 更新产品成功:', product.name, 'ID:', id)

      res.json({
        success: true,
        data: {
          id: product.id,
          code: product.code,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.categoryName || '',
          category: product.categoryName || '',
          description: product.description || '',
          price: Number(product.price),
          costPrice: Number(product.costPrice) || 0,
          stock: product.stock,
          minStock: product.minStock || 0,
          maxStock: product.maxStock || 0,
          unit: product.unit || '件',
          brand: product.brand || '',
          specification: product.specification || '',
          weight: product.weight ? Number(product.weight) : null,
          dimensions: product.dimensions || '',
          status: product.status,
          isRecommended: !!product.isRecommended,
          isNew: !!product.isNew,
          isHot: !!product.isHot,
          image: product.images?.[0] || '',
          images: product.images || [],
          specifications: product.specifications || {},
          productType: product.productType || 'physical',
          virtualDeliveryType: product.virtualDeliveryType || null,
          cardKeyTemplate: product.cardKeyTemplate || null,
          resourceLinkTemplate: product.resourceLinkTemplate || null,
          virtualContentEncrypt: !!product.virtualContentEncrypt,
          allowedDepartments: product.allowedDepartments || null,
          skuType: product.skuType || 'none',
          minPrice: product.minPrice,
          maxPrice: product.maxPrice,
          totalStock: product.totalStock,
          createdBy: product.createdBy || '',
          createTime: product.createdAt?.toISOString() || '',
          updateTime: product.updatedAt?.toISOString() || ''
        },
        message: '更新产品成功'
      })
    } catch (error) {
      log.error('更新产品失败:', error)
      res.status(500).json({
        success: false,
        message: '更新产品失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 删除产品
   */
  static async deleteProduct(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const productRepo = getProductRepository()

      const product = await productRepo.findOne({ where: { id } })
      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      await productRepo.remove(product)
      log.info('[ProductController] 删除产品成功:', product.name, 'ID:', id)

      res.json({
        success: true,
        message: '删除产品成功'
      })
    } catch (error) {
      log.error('删除产品失败:', error)
      res.status(500).json({
        success: false,
        message: '删除产品失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, skuId, type, quantity, reason, remark } = req.body
      const productRepo = getProductRepository()
      const currentUser = (req as any).currentUser || (req as any).user

      if (!productId || !type || quantity === undefined || !reason) {
        res.status(400).json({ success: false, message: '产品ID、调整类型、数量和原因不能为空' })
        return
      }

      const product = await productRepo.findOne({ where: { id: productId } })
      if (!product) {
        res.status(404).json({ success: false, message: '产品不存在' })
        return
      }

      let beforeStock: number
      let afterStock: number
      let targetName = product.name
      let skuName: string | null = null

      if (skuId) {
        const skuRepo = getSkuRepository()
        const sku = await skuRepo.findOne({ where: { id: skuId, productId } })
        if (!sku) {
          res.status(404).json({ success: false, message: 'SKU不存在' })
          return
        }
        beforeStock = sku.stock
        skuName = sku.skuName

        switch (type) {
          case 'increase': afterStock = beforeStock + Number(quantity); break
          case 'decrease':
            afterStock = beforeStock - Number(quantity)
            if (afterStock < 0) { res.status(400).json({ success: false, message: 'SKU库存不足' }); return }
            break
          case 'set': afterStock = Number(quantity); break
          default: res.status(400).json({ success: false, message: '无效的调整类型' }); return
        }
        sku.stock = afterStock
        await skuRepo.save(sku)

        const allSkus = await skuRepo.find({ where: { productId } })
        const activeSkus = allSkus.filter(s => s.status === 'active')
        product.totalStock = activeSkus.reduce((sum, s) => sum + s.stock, 0)
        product.stock = product.totalStock
        await productRepo.save(product)

        targetName = `${product.name} - ${sku.skuName}`
      } else {
        beforeStock = product.stock
        const skuType = (product as any).skuType || 'none'

        switch (type) {
          case 'increase': afterStock = beforeStock + Number(quantity); break
          case 'decrease':
            afterStock = beforeStock - Number(quantity)
            if (afterStock < 0) { res.status(400).json({ success: false, message: '库存不足' }); return }
            break
          case 'set': afterStock = Number(quantity); break
          default: res.status(400).json({ success: false, message: '无效的调整类型' }); return
        }
        product.stock = afterStock

        if (skuType === 'multi') {
          const skuRepo = getSkuRepository()
          const allSkus = await skuRepo.find({ where: { productId } })
          for (const s of allSkus) {
            const skuBefore = s.stock
            let skuAfter = skuBefore
            switch (type) {
              case 'increase': skuAfter = skuBefore + Number(quantity); break
              case 'decrease': skuAfter = Math.max(0, skuBefore - Number(quantity)); break
              case 'set': skuAfter = Number(quantity); break
            }
            s.stock = skuAfter
            await skuRepo.save(s)

            try {
              const adjRepo2 = getStockAdjustmentRepository()
              const skuAdj = adjRepo2.create({
                id: generateId('adj_'),
                productId,
                skuId: s.id,
                skuName: s.skuName,
                adjustType: type,
                quantity: Number(quantity),
                beforeStock: skuBefore,
                afterStock: skuAfter,
                reason: reason + '（统一调整）',
                remark: remark || null,
                operatorId: currentUser?.id || null,
                operatorName: currentUser?.realName || currentUser?.name || currentUser?.username || null
              })
              await adjRepo2.save(skuAdj)
            } catch (_e) { /* ignore */ }
          }
          const activeSkus = allSkus.filter(s2 => s2.status === 'active')
          product.totalStock = activeSkus.reduce((sum, s2) => sum + s2.stock, 0)
          product.stock = product.totalStock
        }

        await productRepo.save(product)
      }

      try {
        const adjRepo = getStockAdjustmentRepository()
        const adj = adjRepo.create({
          id: generateId('adj_'),
          productId,
          skuId: skuId || null,
          skuName,
          adjustType: type,
          quantity: Number(quantity),
          beforeStock,
          afterStock,
          reason,
          remark: remark || null,
          operatorId: currentUser?.id || null,
          operatorName: currentUser?.realName || currentUser?.name || currentUser?.username || null
        })
        await adjRepo.save(adj)
      } catch (adjErr) {
        log.error('[库存调整] 保存调整记录失败:', adjErr)
      }

      res.json({
        success: true,
        data: {
          product: { id: product.id, name: targetName, stock: skuId ? afterStock : product.stock, totalStock: product.totalStock },
          adjustment: { type, quantity: Number(quantity), beforeStock, afterStock, reason, skuId, skuName }
        },
        message: '库存调整成功'
      })
    } catch (error) {
      log.error('库存调整失败:', error)
      res.status(500).json({ success: false, message: '库存调整失败' })
    }
  }

  static async getStockAdjustments(req: Request, res: Response): Promise<void> {
    try {
      const { productId, skuId, page = 1, pageSize = 20 } = req.query
      const adjRepo = getStockAdjustmentRepository()
      const qb = adjRepo.createQueryBuilder('adj')

      if (productId) qb.andWhere('adj.productId = :productId', { productId })
      if (skuId) qb.andWhere('adj.skuId = :skuId', { skuId })

      const total = await qb.getCount()
      const skip = (Number(page) - 1) * Number(pageSize)
      qb.orderBy('adj.createdAt', 'DESC').skip(skip).take(Number(pageSize))

      const list = await qb.getMany()

      // 补全操作人真实姓名（兼容旧数据）
      let userMap: Record<string, string> = {}
      const operatorIds = [...new Set(list.filter(a => a.operatorId).map(a => a.operatorId!))]
      if (operatorIds.length > 0) {
        try {
          const { User } = await import('../entities/User')
          const userRepo = getTenantRepo(User)
          const users = await userRepo.findByIds(operatorIds)
          users.forEach((u: any) => { userMap[u.id] = u.realName || u.name || u.username })
        } catch (_) { /* ignore */ }
      }

      res.json({
        success: true,
        data: {
          list: list.map(a => ({
            id: a.id,
            productId: a.productId,
            skuId: a.skuId,
            skuName: a.skuName,
            adjustType: a.adjustType,
            quantity: a.quantity,
            beforeStock: a.beforeStock,
            afterStock: a.afterStock,
            reason: a.reason,
            remark: a.remark,
            operatorName: (a.operatorId && userMap[a.operatorId]) ? userMap[a.operatorId] : a.operatorName,
            createdAt: a.createdAt?.toISOString()
          })),
          total,
          page: Number(page),
          pageSize: Number(pageSize)
        }
      })
    } catch (error) {
      log.error('获取库存调整记录失败:', error)
      res.status(500).json({ success: false, message: '获取库存调整记录失败' })
    }
  }

  /**
   * 批量导入产品
   */
  static async batchImportProducts(req: Request, res: Response): Promise<void> {
    try {
      const { products: importProducts } = req.body
      const productRepo = getProductRepository()

      if (!Array.isArray(importProducts) || importProducts.length === 0) {
        res.status(400).json({ success: false, message: '导入数据不能为空' })
        return
      }

      const results = { success: 0, failed: 0, errors: [] as string[] }
      const createdBy = (req as any).user?.id || 'system'

      for (const productData of importProducts) {
        try {
          if (!productData.name) {
            results.failed++
            results.errors.push(`产品 ${productData.code || '未知'}: 名称不能为空`)
            continue
          }

          const productId = generateId('prod_')
          const productCode = productData.code || `P${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-4)}`

          // 🔥 修复：检查同租户内编码是否已存在，避免违反唯一约束
          const existingProduct = await productRepo.findOne({ where: { code: productCode } })
          if (existingProduct) {
            results.failed++
            results.errors.push(`产品 ${productCode}: 编码已存在，跳过`)
            continue
          }

          const newProduct = productRepo.create({
            id: productId,
            code: productCode,
            name: productData.name,
            categoryId: productData.categoryId,
            price: Number(productData.price) || 0,
            stock: Number(productData.stock) || 0,
            status: productData.status || 'active',
            createdBy
          })

          await productRepo.save(newProduct)
          results.success++
        } catch (error) {
          results.failed++
          results.errors.push(`产品 ${productData.code || '未知'}: ${error instanceof Error ? error.message : '未知错误'}`)
        }
      }

      res.json({
        success: true,
        data: results,
        message: `批量导入完成，成功 ${results.success} 个，失败 ${results.failed} 个`
      })
    } catch (error) {
      log.error('批量导入产品失败:', error)
      res.status(500).json({ success: false, message: '批量导入产品失败' })
    }
  }

  /**
   * 导出产品数据
   */
  static async exportProducts(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, status } = req.query
      const productRepo = getProductRepository()

      const queryBuilder = productRepo.createQueryBuilder('product')
      if (categoryId) queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId })
      if (status) queryBuilder.andWhere('product.status = :status', { status })

      const products = await queryBuilder.getMany()

      res.json({
        success: true,
        data: products.map(p => ({
          id: p.id,
          code: p.code,
          name: p.name,
          categoryName: p.categoryName || '',
          price: Number(p.price),
          costPrice: Number(p.costPrice) || 0,
          stock: p.stock,
          status: p.status
        })),
        total: products.length,
        exportTime: new Date().toISOString()
      })
    } catch (error) {
      log.error('导出产品数据失败:', error)
      res.status(500).json({ success: false, message: '导出产品数据失败' })
    }
  }

  /**
   * 获取商品相关统计数据（根据用户角色权限过滤）
   */
  static async getProductStats(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params
      const currentUser = (req as any).user

      if (!id) {
        res.status(400).json({
          success: false,
          message: '商品ID不能为空'
        })
        return
      }

      // 验证商品是否存在
      const productRepo = getProductRepository()
      const product = await productRepo.findOne({ where: { id } })

      if (!product) {
        res.status(404).json({
          success: false,
          message: '商品不存在'
        })
        return
      }

      // 获取订单数据（需要根据用户角色过滤）🔥 使用租户感知仓储
      const { Order } = await import('../entities/Order')
      const orderRepository = getTenantRepo(Order)
      let queryBuilder = orderRepository.createQueryBuilder('order')
        .leftJoinAndSelect('order.orderItems', 'orderItems')
        .where('orderItems.productId = :productId', { productId: id })

      // 根据用户角色应用数据范围过滤
      // 🔥 修复：使用 Order 实体中实际存在的列名（createdBy / createdByDepartmentId）
      const userRole = currentUser?.role || ''
      const userId = currentUser?.id
      const departmentId = currentUser?.departmentId

      if (userRole === 'super_admin' || userRole === 'admin') {
        // 超级管理员和管理员：查看全部数据，不添加额外过滤条件
      } else if (userRole === 'department_manager') {
        // 部门经理：查看本部门数据
        if (departmentId) {
          queryBuilder = queryBuilder.andWhere(
            'order.createdByDepartmentId = :departmentId',
            { departmentId }
          )
        }
      } else if (userRole === 'sales_staff' || userRole === 'customer_service') {
        // 销售员/客服：只看自己创建的订单
        queryBuilder = queryBuilder.andWhere('order.createdBy = :userId', { userId })
      } else {
        // 其他角色：只看自己相关的订单
        queryBuilder = queryBuilder.andWhere('order.createdBy = :userId', { userId })
      }

      // 由于订单表结构可能不同，这里使用模拟数据
      // 实际项目中应该根据真实的订单表结构来查询
      let orders: any[] = []
      try {
        orders = await queryBuilder.getMany()
      } catch (error) {
        // 如果查询失败（可能是表结构不匹配），使用空数组
        log.info('订单查询失败，使用模拟数据:', error)
        orders = []
      }

      // 计算统计数据
      const now = new Date()
      const currentMonth = now.getMonth()
      const currentYear = now.getFullYear()

      // 待处理订单（待审核、待发货状态）
      const pendingOrders = orders.filter(order =>
        ['pending_audit', 'pending_shipment', 'pending'].includes(order.status)
      ).length

      // 本月销量
      const monthlySales = orders.filter(order => {
        const orderDate = new Date(order.createdAt || order.createTime)
        return orderDate.getMonth() === currentMonth &&
               orderDate.getFullYear() === currentYear &&
               ['shipped', 'delivered', 'completed'].includes(order.status)
      }).reduce((sum, order) => {
        const item = order.orderItems?.find((i: any) => i.productId === id)
        return sum + (item?.quantity || 1)
      }, 0)

      // 库存周转率（简化计算：月销量 / 平均库存 * 100）
      const avgStock = product.stock > 0 ? product.stock : 1
      const turnoverRate = avgStock > 0 ? (monthlySales / avgStock * 100) : 0

      // 平均评分（基于订单完成情况模拟）
      const completedOrders = orders.filter(order =>
        ['delivered', 'completed'].includes(order.status)
      )
      const avgRating = completedOrders.length > 0 ?
        (4.2 + Math.random() * 0.6) : 0 // 模拟4.2-4.8的评分

      // 退货率
      const returnedOrders = orders.filter(order =>
        ['rejected', 'rejected_returned', 'logistics_returned', 'returned'].includes(order.status)
      ).length
      const returnRate = orders.length > 0 ?
        (returnedOrders / orders.length * 100) : 0

      // 返回统计数据
      const stats = {
        pendingOrders,
        monthlySales,
        turnoverRate: Number(turnoverRate.toFixed(1)),
        avgRating: Number(avgRating.toFixed(1)),
        returnRate: Number(returnRate.toFixed(1)),
        // 额外信息：数据范围标识
        dataScope: userRole === 'super_admin' || userRole === 'admin' ? 'all' :
                   userRole === 'department_manager' ? 'department' : 'personal'
      }

      res.json({
        success: true,
        data: stats,
        message: '获取商品统计数据成功'
      })
    } catch (error) {
      log.error('获取商品统计数据失败:', error)
      res.status(500).json({
        success: false,
        message: '获取商品统计数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取库存统计信息
   */
  static async getStockStatistics(req: Request, res: Response): Promise<void> {
    try {
      const productRepo = getProductRepository()
      const products = await productRepo.find()

      const totalProducts = products.length
      const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
      const totalValue = products.reduce((sum, p) => sum + (p.stock * Number(p.price)), 0)
      const lowStockCount = products.filter(p => p.minStock && p.stock <= p.minStock).length
      const outOfStockCount = products.filter(p => p.stock === 0).length

      res.json({
        success: true,
        data: { totalProducts, totalStock, totalValue, lowStockCount, outOfStockCount }
      })
    } catch (error) {
      log.error('获取库存统计信息失败:', error)
      res.status(500).json({ success: false, message: '获取库存统计信息失败' })
    }
  }
}
