import { Request, Response } from 'express'
import { AppDataSource } from '../config/database'
import { Product } from '../entities/Product'
import { ProductCategory } from '../entities/ProductCategory'

// 获取Repository
const getProductRepository = () => AppDataSource.getRepository(Product)
const getCategoryRepository = () => AppDataSource.getRepository(ProductCategory)

// 辅助函数：构建分类树
function buildCategoryTree(categories: ProductCategory[]): any[] {
  const categoryMap = new Map<number, any>()
  const rootCategories: any[] = []

  // 创建分类映射
  categories.forEach(category => {
    categoryMap.set(category.id, {
      ...category,
      children: [],
      productCount: 0
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
      console.error('获取分类列表失败:', error)
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

      const tree = buildCategoryTree(categories)

      res.json({
        success: true,
        data: tree,
        message: '获取分类树成功'
      })
    } catch (error) {
      console.error('获取分类树失败:', error)
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
      const category = await categoryRepo.findOne({ where: { id: Number(id) } })

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
      console.error('获取分类详情失败:', error)
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
      const { name, code, parentId, sortOrder, status, description, icon } = req.body
      const categoryRepo = getCategoryRepository()

      // 验证必填字段
      if (!name) {
        res.status(400).json({
          success: false,
          message: '分类名称不能为空'
        })
        return
      }

      // 生成分类编码（如果没有提供）
      const categoryCode = code || `cat_${Date.now().toString().slice(-6)}`

      // 检查编码是否已存在
      const existingCategory = await categoryRepo.findOne({ where: { code: categoryCode } })
      if (existingCategory) {
        res.status(400).json({
          success: false,
          message: '分类编码已存在'
        })
        return
      }

      // 创建新分类
      const newCategory = categoryRepo.create({
        name,
        code: categoryCode,
        parentId: parentId ? Number(parentId) : undefined,
        sortOrder: sortOrder || 0,
        status: status || 'active',
        description,
        icon
      })

      await categoryRepo.save(newCategory)

      res.status(201).json({
        success: true,
        data: newCategory,
        message: '创建分类成功'
      })
    } catch (error) {
      console.error('创建分类失败:', error)
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
      const { name, code, parentId, sortOrder, status, description, icon } = req.body
      const categoryRepo = getCategoryRepository()

      const category = await categoryRepo.findOne({ where: { id: Number(id) } })
      if (!category) {
        res.status(404).json({
          success: false,
          message: '分类不存在'
        })
        return
      }

      // 更新分类信息
      if (name !== undefined) category.name = name
      if (code !== undefined) category.code = code
      if (parentId !== undefined) category.parentId = parentId ? Number(parentId) : undefined
      if (sortOrder !== undefined) category.sortOrder = sortOrder
      if (status !== undefined) category.status = status
      if (description !== undefined) category.description = description
      if (icon !== undefined) category.icon = icon

      await categoryRepo.save(category)

      res.json({
        success: true,
        data: category,
        message: '更新分类成功'
      })
    } catch (error) {
      console.error('更新分类失败:', error)
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

      const category = await categoryRepo.findOne({ where: { id: Number(id) } })
      if (!category) {
        res.status(404).json({
          success: false,
          message: '分类不存在'
        })
        return
      }

      // 检查是否有子分类
      const childCategories = await categoryRepo.find({ where: { parentId: Number(id) } })
      if (childCategories.length > 0) {
        res.status(400).json({
          success: false,
          message: '该分类下还有子分类，无法删除'
        })
        return
      }

      // 检查是否有关联产品
      const products = await productRepo.find({ where: { categoryId: Number(id) } })
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
      console.error('删除分类失败:', error)
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
        lowStock
      } = req.query

      const productRepo = getProductRepository()
      const queryBuilder = productRepo.createQueryBuilder('product')
        .leftJoinAndSelect('product.category', 'category')

      // 关键词搜索
      if (keyword) {
        queryBuilder.andWhere(
          '(product.name LIKE :keyword OR product.sku LIKE :keyword)',
          { keyword: `%${keyword}%` }
        )
      }

      // 分类筛选
      if (categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: Number(categoryId) })
      }

      // 状态筛选
      if (status) {
        queryBuilder.andWhere('product.status = :status', { status })
      }

      // 低库存筛选
      if (lowStock === 'true') {
        queryBuilder.andWhere('product.stock <= product.stockAlert')
      }

      // 获取总数
      const total = await queryBuilder.getCount()

      // 分页
      const skip = (Number(page) - 1) * Number(pageSize)
      queryBuilder.skip(skip).take(Number(pageSize))
      queryBuilder.orderBy('product.createdAt', 'DESC')

      const products = await queryBuilder.getMany()

      // 转换数据格式以匹配前端期望
      const list = products.map(p => ({
        id: p.id,
        code: p.sku,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: p.category?.name || '',
        brand: '',
        specification: p.dimensions || '',
        unit: p.unit || '件',
        weight: p.weight || 0,
        dimensions: p.dimensions || '',
        description: p.description || '',
        price: Number(p.price),
        costPrice: Number(p.costPrice) || 0,
        marketPrice: Number(p.price),
        stock: p.stock,
        minStock: p.stockAlert || 0,
        maxStock: 0,
        salesCount: 0,
        status: p.status,
        image: p.images?.[0] || '',
        images: p.images || [],
        createTime: p.createdAt?.toISOString() || ''
      }))

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
      console.error('获取产品列表失败:', error)
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
        where: { id: Number(id) },
        relations: ['category']
      })

      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      res.json({
        success: true,
        data: {
          id: product.id,
          code: product.sku,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category?.name || '',
          description: product.description || '',
          price: Number(product.price),
          costPrice: Number(product.costPrice) || 0,
          stock: product.stock,
          minStock: product.stockAlert || 0,
          unit: product.unit || '件',
          weight: product.weight || 0,
          dimensions: product.dimensions || '',
          status: product.status,
          image: product.images?.[0] || '',
          images: product.images || [],
          createTime: product.createdAt?.toISOString() || ''
        }
      })
    } catch (error) {
      console.error('获取产品详情失败:', error)
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

      // 验证必填字段
      if (!productData.name) {
        res.status(400).json({
          success: false,
          message: '产品名称不能为空'
        })
        return
      }

      // 生成产品编码（如果没有提供）
      const sku = productData.code || `P${Date.now().toString().slice(-8)}`

      // 检查编码是否已存在
      const existingProduct = await productRepo.findOne({ where: { sku } })
      if (existingProduct) {
        res.status(400).json({
          success: false,
          message: '产品编码已存在'
        })
        return
      }

      // 创建新产品
      const newProduct = productRepo.create({
        sku,
        name: productData.name,
        categoryId: productData.categoryId ? Number(productData.categoryId) : 1,
        description: productData.description || '',
        price: Number(productData.price) || 0,
        costPrice: Number(productData.costPrice) || 0,
        stock: Number(productData.stock) || 0,
        stockAlert: Number(productData.minStock) || 0,
        unit: productData.unit || '件',
        weight: Number(productData.weight) || 0,
        dimensions: productData.dimensions || '',
        images: productData.images || (productData.image ? [productData.image] : []),
        status: productData.status || 'active',
        sortOrder: 0
      })

      await productRepo.save(newProduct)
      console.log('[ProductController] 创建产品成功:', newProduct.name, 'ID:', newProduct.id)

      res.status(201).json({
        success: true,
        data: {
          id: newProduct.id,
          code: newProduct.sku,
          name: newProduct.name,
          categoryId: newProduct.categoryId,
          price: Number(newProduct.price),
          stock: newProduct.stock,
          status: newProduct.status,
          createTime: newProduct.createdAt?.toISOString() || ''
        },
        message: '创建产品成功'
      })
    } catch (error) {
      console.error('创建产品失败:', error)
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

      const product = await productRepo.findOne({ where: { id: Number(id) } })
      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      // 更新产品信息
      if (updates.name !== undefined) product.name = updates.name
      if (updates.code !== undefined) product.sku = updates.code
      if (updates.categoryId !== undefined) product.categoryId = Number(updates.categoryId)
      if (updates.description !== undefined) product.description = updates.description
      if (updates.price !== undefined) product.price = Number(updates.price)
      if (updates.costPrice !== undefined) product.costPrice = Number(updates.costPrice)
      if (updates.stock !== undefined) product.stock = Number(updates.stock)
      if (updates.minStock !== undefined) product.stockAlert = Number(updates.minStock)
      if (updates.unit !== undefined) product.unit = updates.unit
      if (updates.weight !== undefined) product.weight = Number(updates.weight)
      if (updates.dimensions !== undefined) product.dimensions = updates.dimensions
      if (updates.status !== undefined) product.status = updates.status
      if (updates.images !== undefined) product.images = updates.images
      if (updates.image !== undefined && !updates.images) {
        product.images = [updates.image]
      }

      await productRepo.save(product)
      console.log('[ProductController] 更新产品成功:', product.name, 'ID:', id)

      res.json({
        success: true,
        data: {
          id: product.id,
          code: product.sku,
          name: product.name,
          categoryId: product.categoryId,
          price: Number(product.price),
          stock: product.stock,
          status: product.status
        },
        message: '更新产品成功'
      })
    } catch (error) {
      console.error('更新产品失败:', error)
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

      const product = await productRepo.findOne({ where: { id: Number(id) } })
      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      await productRepo.remove(product)
      console.log('[ProductController] 删除产品成功:', product.name, 'ID:', id)

      res.json({
        success: true,
        message: '删除产品成功'
      })
    } catch (error) {
      console.error('删除产品失败:', error)
      res.status(500).json({
        success: false,
        message: '删除产品失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 库存调整
   */
  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, type, quantity, reason, remark } = req.body
      const productRepo = getProductRepository()

      // 验证必填字段
      if (!productId || !type || quantity === undefined || !reason) {
        res.status(400).json({
          success: false,
          message: '产品ID、调整类型、数量和原因不能为空'
        })
        return
      }

      // 查找产品
      const product = await productRepo.findOne({ where: { id: Number(productId) } })
      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      const beforeStock = product.stock
      let afterStock = beforeStock

      // 根据调整类型计算新库存
      switch (type) {
        case 'increase':
          afterStock = beforeStock + Number(quantity)
          break
        case 'decrease':
          afterStock = beforeStock - Number(quantity)
          if (afterStock < 0) {
            res.status(400).json({
              success: false,
              message: '库存不足，无法减少指定数量'
            })
            return
          }
          break
        case 'set':
          afterStock = Number(quantity)
          break
        default:
          res.status(400).json({
            success: false,
            message: '无效的调整类型'
          })
          return
      }

      // 更新产品库存
      product.stock = afterStock

      // 更新产品状态
      if (afterStock === 0) {
        product.status = 'inactive'
      } else if (product.status === 'inactive' && afterStock > 0) {
        product.status = 'active'
      }

      await productRepo.save(product)

      res.json({
        success: true,
        data: {
          product: {
            id: product.id,
            name: product.name,
            stock: product.stock,
            status: product.status
          },
          adjustment: {
            type,
            quantity: Number(quantity),
            beforeStock,
            afterStock,
            reason,
            remark
          }
        },
        message: '库存调整成功'
      })
    } catch (error) {
      console.error('库存调整失败:', error)
      res.status(500).json({
        success: false,
        message: '库存调整失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取库存调整记录（暂时返回空数据，后续可添加库存调整记录表）
   */
  static async getStockAdjustments(req: Request, res: Response): Promise<void> {
    try {
      res.json({
        success: true,
        data: {
          list: [],
          total: 0,
          page: 1,
          pageSize: 10
        }
      })
    } catch (error) {
      console.error('获取库存调整记录失败:', error)
      res.status(500).json({
        success: false,
        message: '获取库存调整记录失败'
      })
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
        res.status(400).json({
          success: false,
          message: '导入数据不能为空'
        })
        return
      }

      const results = {
        success: 0,
        failed: 0,
        errors: [] as string[]
      }

      for (const productData of importProducts) {
        try {
          if (!productData.name) {
            results.failed++
            results.errors.push(`产品 ${productData.code || '未知'}: 名称不能为空`)
            continue
          }

          const sku = productData.code || `P${Date.now().toString().slice(-8)}${Math.random().toString(36).slice(-4)}`

          const existingProduct = await productRepo.findOne({ where: { sku } })
          if (existingProduct) {
            results.failed++
            results.errors.push(`产品 ${sku}: 编码已存在`)
            continue
          }

          const newProduct = productRepo.create({
            sku,
            name: productData.name,
            categoryId: productData.categoryId ? Number(productData.categoryId) : 1,
            price: Number(productData.price) || 0,
            costPrice: Number(productData.costPrice) || 0,
            stock: Number(productData.stock) || 0,
            status: productData.status || 'active'
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
      console.error('批量导入产品失败:', error)
      res.status(500).json({
        success: false,
        message: '批量导入产品失败'
      })
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
        .leftJoinAndSelect('product.category', 'category')

      if (categoryId) {
        queryBuilder.andWhere('product.categoryId = :categoryId', { categoryId: Number(categoryId) })
      }

      if (status) {
        queryBuilder.andWhere('product.status = :status', { status })
      }

      const products = await queryBuilder.getMany()

      res.json({
        success: true,
        data: products.map(p => ({
          id: p.id,
          code: p.sku,
          name: p.name,
          categoryName: p.category?.name || '',
          price: Number(p.price),
          costPrice: Number(p.costPrice) || 0,
          stock: p.stock,
          status: p.status
        })),
        total: products.length,
        exportTime: new Date().toISOString()
      })
    } catch (error) {
      console.error('导出产品数据失败:', error)
      res.status(500).json({
        success: false,
        message: '导出产品数据失败'
      })
    }
  }

  /**
   * 获取库存统计信息
   */
  static async getStockStatistics(req: Request, res: Response): Promise<void> {
    try {
      const productRepo = getProductRepository()

      const totalProducts = await productRepo.count()
      const products = await productRepo.find()

      const totalStock = products.reduce((sum, p) => sum + p.stock, 0)
      const totalValue = products.reduce((sum, p) => sum + (p.stock * Number(p.price)), 0)
      const lowStockProducts = products.filter(p => p.stockAlert && p.stock <= p.stockAlert)
      const outOfStockProducts = products.filter(p => p.stock === 0)

      res.json({
        success: true,
        data: {
          totalProducts,
          totalStock,
          totalValue,
          lowStockCount: lowStockProducts.length,
          outOfStockCount: outOfStockProducts.length
        }
      })
    } catch (error) {
      console.error('获取库存统计信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取库存统计信息失败'
      })
    }
  }
}
