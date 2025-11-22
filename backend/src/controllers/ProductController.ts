import { Request, Response } from 'express'

// 产品分类接口定义
interface ProductCategory {
  id: string
  name: string
  code: string
  parentId?: string
  level: number
  sort: number
  status: 'active' | 'inactive'
  description?: string
  createTime: string
  updateTime?: string
  children?: ProductCategory[]
}

// 产品接口定义
interface Product {
  id: string
  code: string
  name: string
  categoryId: string
  categoryName: string
  brand: string
  specification: string
  unit: string
  weight: number
  dimensions: string
  description: string
  price: number
  costPrice: number
  marketPrice: number
  stock: number
  minStock: number
  maxStock: number
  salesCount: number
  status: 'active' | 'inactive' | 'out_of_stock'
  image: string
  createTime: string
  updateTime?: string
}

// 库存调整记录接口
interface StockAdjustment {
  id: string
  productId: string
  productCode: string
  productName: string
  type: 'increase' | 'decrease' | 'set'
  quantity: number
  beforeStock: number
  afterStock: number
  reason: string
  remark?: string
  operator: string
  createTime: string
}

// 模拟数据存储 - 清空初始分类数据，支持动态创建
const categories: ProductCategory[] = []

// 产品模拟数据 - 清空初始产品数据，支持动态创建
const products: Product[] = []

// 库存调整记录模拟数据 - 清空初始数据，支持动态创建
const stockAdjustments: StockAdjustment[] = []

// 辅助函数：生成新ID
function generateId(): string {
  return Date.now().toString() + Math.random().toString(36).substr(2, 9)
}

// 辅助函数：构建分类树
function buildCategoryTree(categories: ProductCategory[]): ProductCategory[] {
  const categoryMap = new Map<string, ProductCategory>()
  const rootCategories: ProductCategory[] = []

  // 创建分类映射
  categories.forEach(category => {
    categoryMap.set(category.id, { ...category, children: [] })
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

// 辅助函数：扁平化分类树
function flattenCategories(categories: ProductCategory[]): ProductCategory[] {
  const result: ProductCategory[] = []
  
  function traverse(cats: ProductCategory[]) {
    cats.forEach(cat => {
      const { children, ...categoryData } = cat
      result.push(categoryData)
      if (children && children.length > 0) {
        traverse(children)
      }
    })
  }
  
  traverse(categories)
  return result
}

export class ProductController {
  /**
   * 获取产品分类列表（扁平结构）
   */
  static async getCategories(req: Request, res: Response) {
    try {
      const flatCategories = flattenCategories(categories)
      res.json({
        success: true,
        data: flatCategories,
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
      const flatCategories = flattenCategories(categories)
      const tree = buildCategoryTree(flatCategories)
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
      const flatCategories = flattenCategories(categories)
      const category = flatCategories.find(cat => cat.id === id)
      
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
      const { name, code, parentId, level, sort, status, description } = req.body

      // 验证必填字段
      if (!name || !code) {
        res.status(400).json({
          success: false,
          message: '分类名称和编码不能为空'
        })
        return
      }

      // 检查编码是否已存在
      const flatCategories = flattenCategories(categories)
      const existingCategory = flatCategories.find(cat => cat.code === code)
      if (existingCategory) {
        res.status(400).json({
          success: false,
          message: '分类编码已存在'
        })
        return
      }

      // 创建新分类
      const newCategory: ProductCategory = {
        id: generateId(),
        name,
        code,
        parentId,
        level: level || 1,
        sort: sort || 1,
        status: status || 'active',
        description,
        createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }

      // 添加到对应的位置
      if (parentId) {
        // 查找父分类并添加到其children中
        function addToParent(cats: ProductCategory[]): boolean {
          for (const cat of cats) {
            if (cat.id === parentId) {
              cat.children = cat.children || []
              cat.children.push(newCategory)
              return true
            }
            if (cat.children && addToParent(cat.children)) {
              return true
            }
          }
          return false
        }
        
        if (!addToParent(categories)) {
          res.status(400).json({
            success: false,
            message: '父分类不存在'
          })
          return
        }
      } else {
        // 添加为根分类
        categories.push(newCategory)
      }

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
      const { name, code, parentId, level, sort, status, description } = req.body

      // 查找并更新分类
      function updateInTree(cats: ProductCategory[]): ProductCategory | null {
        for (const cat of cats) {
          if (cat.id === id) {
            // 更新分类信息
            if (name !== undefined) cat.name = name
            if (code !== undefined) cat.code = code
            if (parentId !== undefined) cat.parentId = parentId
            if (level !== undefined) cat.level = level
            if (sort !== undefined) cat.sort = sort
            if (status !== undefined) cat.status = status
            if (description !== undefined) cat.description = description
            cat.updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19)
            return cat
          }
          if (cat.children) {
            const updated = updateInTree(cat.children)
            if (updated) return updated
          }
        }
        return null
      }

      const updatedCategory = updateInTree(categories)
      
      if (!updatedCategory) {
        res.status(404).json({
          success: false,
          message: '分类不存在'
        })
        return
      }

      res.json({
        success: true,
        data: updatedCategory,
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

      // 查找并删除分类
      function deleteFromTree(cats: ProductCategory[], parentArray: ProductCategory[]): boolean {
        for (let i = 0; i < cats.length; i++) {
          const cat = cats[i]
          if (cat.id === id) {
            // 检查是否有子分类
            if (cat.children && cat.children.length > 0) {
              return false // 有子分类，不能删除
            }
            // 删除分类
            cats.splice(i, 1)
            return true
          }
          if (cat.children && deleteFromTree(cat.children, cats)) {
            return true
          }
        }
        return false
      }

      const deleted = deleteFromTree(categories, [])
      
      if (!deleted) {
        // 检查是否是因为有子分类而无法删除
        const flatCategories = flattenCategories(categories)
        const category = flatCategories.find(cat => cat.id === id)
        if (category) {
          res.status(400).json({
            success: false,
            message: '该分类下还有子分类，无法删除'
          })
          return
        } else {
          res.status(404).json({
            success: false,
            message: '分类不存在'
          })
          return
        }
      }

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
        brand,
        lowStock 
      } = req.query

      let filteredProducts = [...products]

      // 关键词搜索
      if (keyword) {
        const searchTerm = String(keyword).toLowerCase()
        filteredProducts = filteredProducts.filter(product => 
          product.name.toLowerCase().includes(searchTerm) ||
          product.code.toLowerCase().includes(searchTerm) ||
          product.brand.toLowerCase().includes(searchTerm)
        )
      }

      // 分类筛选
      if (categoryId) {
        filteredProducts = filteredProducts.filter(product => 
          product.categoryId === categoryId
        )
      }

      // 状态筛选
      if (status) {
        filteredProducts = filteredProducts.filter(product => 
          product.status === status
        )
      }

      // 品牌筛选
      if (brand) {
        filteredProducts = filteredProducts.filter(product => 
          product.brand === brand
        )
      }

      // 低库存筛选
      if (lowStock === 'true') {
        filteredProducts = filteredProducts.filter(product => 
          product.stock <= product.minStock
        )
      }

      // 分页
      const total = filteredProducts.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const endIndex = startIndex + Number(pageSize)
      const paginatedProducts = filteredProducts.slice(startIndex, endIndex)

      res.json({
        success: true,
        data: {
          list: paginatedProducts,
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
      const product = products.find(p => p.id === id)

      if (!product) {
        res.status(404).json({
          success: false,
          message: '产品不存在'
        })
        return
      }

      res.json({
        success: true,
        data: product
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
   * 库存调整
   */
  static async adjustStock(req: Request, res: Response): Promise<void> {
    try {
      const { productId, type, quantity, reason, remark } = req.body

      // 验证必填字段
      if (!productId || !type || quantity === undefined || !reason) {
        res.status(400).json({
          success: false,
          message: '产品ID、调整类型、数量和原因不能为空'
        })
        return
      }

      // 查找产品
      const product = products.find(p => p.id === productId)
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
      product.updateTime = new Date().toISOString().replace('T', ' ').substring(0, 19)

      // 更新产品状态
      if (afterStock === 0) {
        product.status = 'out_of_stock'
      } else if (product.status === 'out_of_stock' && afterStock > 0) {
        product.status = 'active'
      }

      // 创建库存调整记录
      const adjustment: StockAdjustment = {
        id: generateId(),
        productId,
        productCode: product.code,
        productName: product.name,
        type,
        quantity: Number(quantity),
        beforeStock,
        afterStock,
        reason,
        remark,
        operator: '系统管理员', // 实际应用中应该从用户信息中获取
        createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
      }

      stockAdjustments.unshift(adjustment)

      res.json({
        success: true,
        data: {
          product,
          adjustment
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
   * 获取库存调整记录
   */
  static async getStockAdjustments(req: Request, res: Response): Promise<void> {
    try {
      const { 
        page = 1, 
        pageSize = 10, 
        productId, 
        type,
        startDate,
        endDate 
      } = req.query

      let filteredAdjustments = [...stockAdjustments]

      // 产品筛选
      if (productId) {
        filteredAdjustments = filteredAdjustments.filter(adj => 
          adj.productId === productId
        )
      }

      // 类型筛选
      if (type) {
        filteredAdjustments = filteredAdjustments.filter(adj => 
          adj.type === type
        )
      }

      // 日期范围筛选
      if (startDate) {
        filteredAdjustments = filteredAdjustments.filter(adj => 
          adj.createTime >= String(startDate)
        )
      }

      if (endDate) {
        filteredAdjustments = filteredAdjustments.filter(adj => 
          adj.createTime <= String(endDate)
        )
      }

      // 分页
      const total = filteredAdjustments.length
      const startIndex = (Number(page) - 1) * Number(pageSize)
      const endIndex = startIndex + Number(pageSize)
      const paginatedAdjustments = filteredAdjustments.slice(startIndex, endIndex)

      res.json({
        success: true,
        data: {
          list: paginatedAdjustments,
          total,
          page: Number(page),
          pageSize: Number(pageSize),
          totalPages: Math.ceil(total / Number(pageSize))
        }
      })
    } catch (error) {
      console.error('获取库存调整记录失败:', error)
      res.status(500).json({
        success: false,
        message: '获取库存调整记录失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 批量导入产品
   */
  static async batchImportProducts(req: Request, res: Response): Promise<void> {
    try {
      const { products: importProducts } = req.body

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
          // 验证必填字段
          if (!productData.code || !productData.name || !productData.categoryId) {
            results.failed++
            results.errors.push(`产品 ${productData.code || '未知'}: 编码、名称和分类不能为空`)
            continue
          }

          // 检查编码是否已存在
          const existingProduct = products.find(p => p.code === productData.code)
          if (existingProduct) {
            results.failed++
            results.errors.push(`产品 ${productData.code}: 编码已存在`)
            continue
          }

          // 创建新产品
          const newProduct: Product = {
            id: generateId(),
            code: productData.code,
            name: productData.name,
            categoryId: productData.categoryId,
            categoryName: productData.categoryName || '',
            brand: productData.brand || '',
            specification: productData.specification || '',
            unit: productData.unit || '个',
            weight: Number(productData.weight) || 0,
            dimensions: productData.dimensions || '',
            description: productData.description || '',
            price: Number(productData.price) || 0,
            costPrice: Number(productData.costPrice) || 0,
            marketPrice: Number(productData.marketPrice) || 0,
            stock: Number(productData.stock) || 0,
            minStock: Number(productData.minStock) || 0,
            maxStock: Number(productData.maxStock) || 0,
            salesCount: 0,
            status: productData.status || 'active',
            image: productData.image || '',
            createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
          }

          products.push(newProduct)
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
        message: '批量导入产品失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 导出产品数据
   */
  static async exportProducts(req: Request, res: Response): Promise<void> {
    try {
      const { categoryId, status, format = 'json' } = req.query

      let exportProducts = [...products]

      // 分类筛选
      if (categoryId) {
        exportProducts = exportProducts.filter(product => 
          product.categoryId === categoryId
        )
      }

      // 状态筛选
      if (status) {
        exportProducts = exportProducts.filter(product => 
          product.status === status
        )
      }

      if (format === 'csv') {
        // CSV格式导出
        const csvHeader = 'ID,编码,名称,分类ID,分类名称,品牌,规格,单位,重量,尺寸,描述,价格,成本价,市场价,库存,最小库存,最大库存,销量,状态,图片,创建时间\n'
        const csvData = exportProducts.map(product => 
          `${product.id},${product.code},${product.name},${product.categoryId},${product.categoryName},${product.brand},${product.specification},${product.unit},${product.weight},${product.dimensions},${product.description},${product.price},${product.costPrice},${product.marketPrice},${product.stock},${product.minStock},${product.maxStock},${product.salesCount},${product.status},${product.image},${product.createTime}`
        ).join('\n')

        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', 'attachment; filename=products.csv')
        res.send(csvHeader + csvData)
      } else {
        // JSON格式导出
        res.json({
          success: true,
          data: exportProducts,
          total: exportProducts.length,
          exportTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        })
      }
    } catch (error) {
      console.error('导出产品数据失败:', error)
      res.status(500).json({
        success: false,
        message: '导出产品数据失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }

  /**
   * 获取库存统计信息
   */
  static async getStockStatistics(req: Request, res: Response): Promise<void> {
    try {
      const totalProducts = products.length
      const totalStock = products.reduce((sum, product) => sum + product.stock, 0)
      const totalValue = products.reduce((sum, product) => sum + (product.stock * product.price), 0)
      const lowStockProducts = products.filter(product => product.stock <= product.minStock)
      const outOfStockProducts = products.filter(product => product.stock === 0)

      const statistics = {
        totalProducts,
        totalStock,
        totalValue,
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        lowStockProducts: lowStockProducts.slice(0, 10), // 只返回前10个低库存产品
        outOfStockProducts: outOfStockProducts.slice(0, 10) // 只返回前10个缺货产品
      }

      res.json({
        success: true,
        data: statistics
      })
    } catch (error) {
      console.error('获取库存统计信息失败:', error)
      res.status(500).json({
        success: false,
        message: '获取库存统计信息失败',
        error: error instanceof Error ? error.message : '未知错误'
      })
    }
  }
}