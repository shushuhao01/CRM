import { api } from './request'
import { mockApi, shouldUseMockApi } from './mock'
import type { Product, ProductCategory } from '@/stores/product'
import { isProduction } from '@/utils/env'

export interface ProductListParams {
  page?: number
  pageSize?: number
  name?: string
  categoryId?: string
  status?: 'active' | 'inactive' | 'out_of_stock'
  stockStatus?: 'normal' | 'low' | 'out'
  keyword?: string
  brand?: string
  lowStock?: boolean
}

export interface ProductListResponse {
  list: Product[]
  total: number
  page: number
  pageSize: number
}

/**
 * 产品API服务
 */
export const productApi = {
  /**
   * 获取产品列表
   */
  async getList(params: ProductListParams = {}): Promise<ProductListResponse> {
    try {
      const response = await api.get<{ data: ProductListResponse }>('/products', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: { list, total, page, pageSize } }，需要提取data
      const data = (response as any).data?.data || (response as any).data
      return {
        list: data?.list || [],
        total: data?.total || 0,
        page: data?.page || 1,
        pageSize: data?.pageSize || 10
      }
    } catch (error) {
      console.error('获取产品列表失败:', error)
      // 如果API调用失败，返回模拟数据
      return this.getMockProductList(params) as ProductListResponse
    }
  },

  /**
   * 获取在售产品列表（只返回状态为active的产品）
   */
  async getActiveList(params: Omit<ProductListParams, 'status'> = {}): Promise<ProductListResponse> {
    return this.getList({ ...params, status: 'active' })
  },

  /**
   * 获取产品详情
   */
  async getDetail(id: string): Promise<Product> {
    try {
      const response = await api.get<{ data: Product }>(`/products/${id}`)
      return (response as any).data?.data || (response as any).data as Product
    } catch (error) {
      console.error('获取产品详情失败:', error)
      throw error
    }
  },

  /**
   * 创建产品
   */
  async create(data: Partial<Product>): Promise<Product> {
    try {
      const response = await api.post<{ data: Product }>('/products', data as any)
      return (response as any).data?.data || (response as any).data as Product
    } catch (error) {
      console.error('创建产品失败:', error)
      throw error
    }
  },

  /**
   * 更新产品
   */
  async update(id: string, data: Partial<Product>): Promise<Product> {
    try {
      const response = await api.put<{ data: Product }>(`/products/${id}`, data as any)
      return (response as any).data?.data || (response as any).data as Product
    } catch (error) {
      console.error('更新产品失败:', error)
      throw error
    }
  },

  /**
   * 删除产品
   */
  async delete(id: string): Promise<void> {
    try {
      await api.delete(`/products/${id}`)
    } catch (error) {
      console.error('删除产品失败:', error)
      throw error
    }
  },

  /**
   * 获取商品相关统计数据（根据用户角色权限过滤）
   */
  async getProductStats(productId: string): Promise<{
    pendingOrders: number
    monthlySales: number
    turnoverRate: number
    avgRating: number
    returnRate: number
    dataScope: 'all' | 'department' | 'personal'
  }> {
    try {
      const response = await api.get(`/products/${productId}/stats`)
      // 后端返回格式是 { success: true, data: stats }
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('获取商品统计数据失败:', error)
      // 返回默认值
      return {
        pendingOrders: 0,
        monthlySales: 0,
        turnoverRate: 0,
        avgRating: 0,
        returnRate: 0,
        dataScope: 'personal'
      }
    }
  },

  /**
   * 获取库存统计信息
   */
  async getStockStatistics(): Promise<any> {
    try {
      const response = await api.get('/products/stock/statistics')
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('获取库存统计失败:', error)
      throw error
    }
  },

  /**
   * 库存调整
   */
  async adjustStock(data: {
    productId: string
    type: 'increase' | 'decrease' | 'set'
    quantity: number
    reason: string
    remark?: string
  }): Promise<any> {
    try {
      const response = await api.post('/products/stock/adjust', data as any)
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('库存调整失败:', error)
      throw error
    }
  },

  /**
   * 获取库存调整记录
   */
  async getStockAdjustments(params: {
    page?: number
    pageSize?: number
    productId?: string
    type?: string
    startDate?: string
    endDate?: string
  }): Promise<any> {
    try {
      const response = await api.get('/products/stock/adjustments', { params: params as any })
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('获取库存调整记录失败:', error)
      throw error
    }
  },

  /**
   * 批量导入产品
   */
  async batchImport(data: { products: any[] }): Promise<any> {
    try {
      const response = await api.post('/products/batch-import', data as any)
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('批量导入产品失败:', error)
      throw error
    }
  },

  /**
   * 导出产品数据
   */
  async exportProducts(params: {
    categoryId?: string
    status?: string
    format?: 'json' | 'csv'
  }): Promise<unknown> {
    try {
      const response = await api.get('/products/export', { params: params as any })
      return (response as any).data?.data || (response as any).data
    } catch (error) {
      console.error('导出产品数据失败:', error)
      throw error
    }
  },

  /**
   * 获取产品分类列表
   */
  async getCategoryList(): Promise<ProductCategory[]> {
    try {
      const response = await api.get('/products/categories')
      return (response as any).data?.data || (response as any).data || []
    } catch (error) {
      console.error('获取产品分类列表失败:', error)
      return []
    }
  },

  /**
   * 获取产品分类树形结构
   */
  async getCategoryTree(): Promise<ProductCategory[]> {
    try {
      const response = await api.get('/products/categories/tree')
      return (response as any).data?.data || (response as any).data || []
    } catch (error) {
      console.error('获取产品分类树形结构失败:', error)
      return []
    }
  },

  /**
   * 创建产品分类
   */
  async createCategory(data: Partial<ProductCategory>): Promise<ProductCategory> {
    try {
      const response = await api.post('/products/categories', data as any)
      return (response as any).data?.data || (response as any).data as ProductCategory
    } catch (error) {
      console.error('创建产品分类失败:', error)
      throw error
    }
  },

  /**
   * 更新产品分类
   */
  async updateCategory(id: string, data: Partial<ProductCategory>): Promise<ProductCategory> {
    try {
      const response = await api.put(`/products/categories/${id}`, data as any)
      return (response as any).data?.data || (response as any).data as ProductCategory
    } catch (error) {
      console.error('更新产品分类失败:', error)
      throw error
    }
  },

  /**
   * 删除产品分类
   */
  async deleteCategory(id: string): Promise<void> {
    try {
      await api.delete(`/products/categories/${id}`)
    } catch (error) {
      console.error('删除产品分类失败:', error)
      throw error
    }
  },

  /**
   * 获取产品分类详情
   */
  async getCategoryDetail(id: string): Promise<ProductCategory> {
    try {
      const response = await api.get(`/products/categories/${id}`)
      return (response as any).data?.data || (response as any).data as ProductCategory
    } catch (error) {
      console.error('获取产品分类详情失败:', error)
      throw error
    }
  },

  /**
   * 获取销售统计数据
   */
  async getSalesStatistics(params: {
    startDate?: string
    endDate?: string
    categoryId?: string
  }): Promise<{
    totalRevenue: number
    totalSales: number
    totalProducts: number
    lowStockWarning: number
    revenueChange: string
    salesChange: string
    productsChange: string
    warningChange: string
  }> {
    try {
      const response = await api.get('/products/sales/statistics', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: {...} }，需要提取data
      return (response as any).data?.data || (response as any).data || {
        totalRevenue: 0,
        totalSales: 0,
        totalProducts: 0,
        lowStockWarning: 0,
        revenueChange: '+0%',
        salesChange: '+0%',
        productsChange: '+0%',
        warningChange: '+0%'
      }
    } catch (error) {
      console.error('获取销售统计失败:', error)
      // 返回基于当前产品数据的统计
      const mockData = this.getMockProductList() as ProductListResponse
      const products = mockData.list || []
      const totalRevenue = products.reduce((sum: number, p: Product) => sum + ((p.salesCount || 0) * p.price), 0)
      const totalSales = products.reduce((sum: number, p: Product) => sum + (p.salesCount || 0), 0)
      const totalProducts = products.length
      const lowStockWarning = products.filter((p: Product) => p.stock <= (p.minStock || 10) && p.stock > 0).length

      return {
        totalRevenue,
        totalSales,
        totalProducts,
        lowStockWarning,
        revenueChange: '+12.5%',
        salesChange: '+8.3%',
        productsChange: '+2.1%',
        warningChange: '-5.2%'
      }
    }
  },

  /**
   * 获取销售趋势数据
   */
  async getSalesTrend(params: {
    startDate: string
    endDate: string
    period: '7days' | '30days' | '90days'
    categoryId?: string
  }): Promise<{
    timeLabels: string[]
    salesData: number[]
    revenueData: number[]
  }> {
    try {
      const response = await api.get('/products/sales/trend', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: {...} }，需要提取data
      return (response as any).data?.data || (response as any).data || { timeLabels: [], salesData: [], revenueData: [] }
    } catch (error) {
      console.error('获取销售趋势失败:', error)
      // 返回模拟趋势数据
      const { period } = params
      const timeLabels: string[] = []
      const salesData: number[] = []
      const revenueData: number[] = []

      if (period === '7days') {
        for (let i = 6; i >= 0; i--) {
          const date = new Date()
          date.setDate(date.getDate() - i)
          timeLabels.push(`${date.getMonth() + 1}/${date.getDate()}`)
          salesData.push(Math.floor(Math.random() * 100) + 50)
          revenueData.push(Math.floor(Math.random() * 50000) + 20000)
        }
      } else if (period === '30days') {
        for (let i = 3; i >= 0; i--) {
          timeLabels.push(`第${4-i}周`)
          salesData.push(Math.floor(Math.random() * 500) + 200)
          revenueData.push(Math.floor(Math.random() * 200000) + 100000)
        }
      } else if (period === '90days') {
        for (let i = 2; i >= 0; i--) {
          const date = new Date()
          date.setMonth(date.getMonth() - i)
          timeLabels.push(`${date.getMonth() + 1}月`)
          salesData.push(Math.floor(Math.random() * 2000) + 1000)
          revenueData.push(Math.floor(Math.random() * 800000) + 400000)
        }
      }

      return { timeLabels, salesData, revenueData }
    }
  },

  /**
   * 获取分类销售占比
   */
  async getCategorySales(params: {
    startDate?: string
    endDate?: string
  }): Promise<Array<{
    name: string
    value: number
    percentage: number
  }>> {
    try {
      const response = await api.get('/products/sales/category', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: [...] }，需要提取data
      return (response as any).data?.data || (response as any).data || []
    } catch (error) {
      console.error('获取分类销售占比失败:', error)
      // 返回基于当前产品数据的分类统计
      const mockData = this.getMockProductList() as ProductListResponse
      const products = mockData.list || []
      const categoryStats = new Map<string, number>()

      products.forEach((product: Product) => {
        const categoryName = product.categoryName || '未分类'
        const revenue = (product.salesCount || 0) * product.price

        if (categoryStats.has(categoryName)) {
          categoryStats.set(categoryName, categoryStats.get(categoryName)! + revenue)
        } else {
          categoryStats.set(categoryName, revenue)
        }
      })

      const totalRevenue = Array.from(categoryStats.values()).reduce((sum: number, value: number) => sum + value, 0)

      return Array.from(categoryStats.entries()).map(([name, value]) => ({
        name,
        value: Math.round(value),
        percentage: totalRevenue > 0 ? Math.round((value / totalRevenue) * 100) : 0
      })).sort((a, b) => b.value - a.value)
    }
  },

  /**
   * 获取热销商品排行
   */
  async getTopProducts(params: {
    limit?: number
    startDate?: string
    endDate?: string
    categoryId?: string
  }): Promise<Array<{
    id: string
    name: string
    sales: number
    revenue: number
    image?: string
    categoryName: string
  }>> {
    try {
      const response = await api.get('/products/sales/top', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: [...] }，需要提取data
      return (response as any).data?.data || (response as any).data || []
    } catch (error) {
      console.error('获取热销商品排行失败:', error)
      // 返回基于当前产品数据的热销排行
      const mockData = this.getMockProductList() as ProductListResponse
      const products = mockData.list || []
      const limit = params.limit || 5

      return products
        .map((product: Product) => ({
          id: String(product.id),
          name: product.name,
          sales: product.salesCount || 0,
          revenue: (product.salesCount || 0) * product.price,
          image: product.image,
          categoryName: product.categoryName || '未分类'
        }))
        .sort((a: { sales: number }, b: { sales: number }) => b.sales - a.sales)
        .slice(0, limit)
    }
  },

  /**
   * 获取库存预警数据
   */
  async getInventoryWarning(params: {
    categoryId?: string
  }): Promise<{
    lowStockCount: number
    outOfStockCount: number
    totalWarning: number
    categories: Array<{
      name: string
      lowStock: number
      outOfStock: number
      totalStock: number
    }>
  }> {
    try {
      const response = await api.get('/products/inventory/warning', { params: params as any })
      // 🔥 修复：后端返回格式是 { success: true, data: {...} }，需要提取data
      return (response as any).data?.data || (response as any).data || {
        lowStockCount: 0,
        outOfStockCount: 0,
        totalWarning: 0,
        categories: []
      }
    } catch (error) {
      console.error('获取库存预警失败:', error)
      // 返回基于当前产品数据的库存预警
      const mockData = this.getMockProductList() as ProductListResponse
      const products = mockData.list || []
      const lowStockProducts = products.filter((p: Product) => p.stock <= (p.minStock || 10) && p.stock > 0)
      const outOfStockProducts = products.filter((p: Product) => p.stock === 0)

      const categoryWarning = new Map<string, { name: string; lowStock: number; outOfStock: number; totalStock: number }>()
      products.forEach((product: Product) => {
        const categoryName = product.categoryName || '未分类'
        if (!categoryWarning.has(categoryName)) {
          categoryWarning.set(categoryName, {
            name: categoryName,
            lowStock: 0,
            outOfStock: 0,
            totalStock: 0
          })
        }

        const category = categoryWarning.get(categoryName)!
        category.totalStock += product.stock

        if (product.stock === 0) {
          category.outOfStock++
        } else if (product.stock <= (product.minStock || 10)) {
          category.lowStock++
        }
      })

      return {
        lowStockCount: lowStockProducts.length,
        outOfStockCount: outOfStockProducts.length,
        totalWarning: lowStockProducts.length + outOfStockProducts.length,
        categories: Array.from(categoryWarning.values())
      }
    }
  },

  /**
   * 模拟数据方法（当API调用失败时使用）
   * 从localStorage获取真实的商品数据
   */
  getMockProductList(params: ProductListParams = {}): ProductListResponse {
    // 从localStorage获取商品数据
    const productsStr = localStorage.getItem('products')
    const mockProducts: Product[] = productsStr ? JSON.parse(productsStr) : []

    // 应用筛选条件
    let filteredProducts = mockProducts

    if (params.status) {
      filteredProducts = filteredProducts.filter(p => p.status === params.status)
    }

    if (params.categoryId) {
      filteredProducts = filteredProducts.filter(p => p.categoryId === params.categoryId)
    }

    if (params.keyword) {
      const keyword = params.keyword.toLowerCase()
      filteredProducts = filteredProducts.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.code.toLowerCase().includes(keyword) ||
        (p.brand && p.brand.toLowerCase().includes(keyword))
      )
    }

    // 分页
    const page = params.page || 1
    const pageSize = params.pageSize || 10
    const start = (page - 1) * pageSize
    const end = start + pageSize

    return {
      list: filteredProducts.slice(start, end),
      total: filteredProducts.length,
      page,
      pageSize
    }
  }
}
