import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { createPersistentStore } from '@/utils/storage'
import { productApi, type ProductListParams } from '@/api/product'

export interface Product {
  id: string | number
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
  images?: string[]
  specifications?: Record<string, any> // 规格参数
  createdBy?: string // 创建人
  createTime: string
  updateTime?: string
  deleted?: boolean
}

export interface ProductCategory {
  id: string
  name: string
  code: string
  parentId?: string
  level?: number
  sort?: number
  status?: number | 'active' | 'inactive'
  productCount?: number
  createTime?: string
  children?: ProductCategory[]
}

export interface ProductSearchForm {
  name: string
  code: string
  categoryId: string
  status: string
  stockStatus: string
  minPrice: number | null
  maxPrice: number | null
  showDeleted?: boolean // 是否显示已删除的商品
  onlyDeleted?: boolean // 是否只显示已删除的商品
}

export const useProductStore = createPersistentStore('product', () => {
  // 状态数据
  const products = ref<Product[]>([])
  const categories = ref<ProductCategory[]>([])
  const loading = ref(false)

  // 确保categories始终是数组的辅助函数
  const ensureArrayCategories = () => {
    if (!Array.isArray(categories.value)) {
      categories.value = []
    }
  }

  // 分页信息
  const pagination = ref({
    currentPage: 1,
    pageSize: 20,
    total: 0
  })

  // 搜索条件
  const searchForm = ref<ProductSearchForm>({
    name: '',
    code: '',
    categoryId: '',
    status: '',
    stockStatus: '',
    minPrice: null,
    maxPrice: null,
    showDeleted: false,
    onlyDeleted: false
  })

  // 统计数据
  const stats = computed(() => {
    const totalProducts = (products.value || []).length
    const lowStockCount = (products.value || []).filter(p => p.stock <= p.minStock && p.stock > 0).length
    const outOfStockCount = (products.value || []).filter(p => p.stock === 0).length

    return {
      totalProducts,
      lowStockCount,
      outOfStockCount
    }
  })

  // API调用方法
  const loadCategories = async () => {
    try {
      loading.value = true
      const response = await productApi.getCategoryTree()
      // 确保categories始终是数组
      categories.value = Array.isArray(response) ? response : (response?.data || [])
      ensureArrayCategories()
    } catch (error) {
      console.error('加载分类失败:', error)
      // 如果API调用失败，确保categories是空数组
      categories.value = []
    } finally {
      loading.value = false
      ensureArrayCategories()
    }
  }

  const loadProducts = async (params: ProductListParams = {}) => {
    try {
      loading.value = true
      const response = await productApi.getList(params)
      products.value = response?.list || []
      pagination.value.total = response?.total || 0
      pagination.value.currentPage = response?.page || 1
      pagination.value.pageSize = response?.pageSize || 10
    } catch (error) {
      console.error('加载商品失败:', error)
      // 如果API调用失败，保持当前数据不变
    } finally {
      loading.value = false
    }
  }

  // 初始化数据（从API加载）
  const initData = async (force = false) => {
    if (force || categories.value.length === 0) {
      await loadCategories()
    }

    if (force || products.value.length === 0) {
      await loadProducts()
    }
  }

  // 生成唯一ID
  const generateUniqueId = () => {
    const timestamp = Date.now()
    const random = Math.floor(Math.random() * 1000)
    let newId = timestamp + random

    // 确保ID不重复
    while (products.value.some(p => p.id === newId)) {
      newId = Date.now() + Math.floor(Math.random() * 1000)
    }

    return newId
  }

  // 添加商品
  const addProduct = async (product: Omit<Product, 'id' | 'createTime'>) => {
    // 优先使用服务器API
    try {
      const serverProduct = await productApi.create(product)
      if (serverProduct && serverProduct.id) {
        products.value.unshift(serverProduct)
        console.log('[ProductStore] 服务器创建商品成功:', serverProduct.name, 'ID:', serverProduct.id)
        return serverProduct
      }
    } catch (error) {
      console.error('[ProductStore] 服务器创建商品失败，回退到本地存储:', error)
    }

    // 服务器失败时回退到本地存储
    const newProduct: Product = {
      ...product,
      id: generateUniqueId(),
      createTime: new Date().toLocaleString('zh-CN')
    }
    products.value.unshift(newProduct)
    console.log('[ProductStore] 本地添加新商品:', newProduct.name, 'ID:', newProduct.id)
    return newProduct
  }

  // 更新商品
  const updateProduct = async (id: string | number, updates: Partial<Product>) => {
    const index = (products.value || []).findIndex(p => p.id === id)
    if (index !== -1) {
      // 优先使用服务器API
      try {
        const serverProduct = await productApi.update(String(id), updates)
        if (serverProduct) {
          products.value[index] = serverProduct
          console.log('[ProductStore] 服务器更新商品成功:', serverProduct.name, 'ID:', id)
          return serverProduct
        }
      } catch (error) {
        console.error('[ProductStore] 服务器更新商品失败，回退到本地存储:', error)
      }

      // 服务器失败时回退到本地存储
      const updatedProduct = {
        ...products.value[index],
        ...updates,
        updateTime: new Date().toLocaleString('zh-CN')
      }
      products.value[index] = updatedProduct
      console.log('[ProductStore] 本地更新商品:', updatedProduct.name, 'ID:', id)
      return updatedProduct
    }
    console.warn('[ProductStore] 未找到要更新的商品 ID:', id)
    return null
  }

  // 删除商品（软删除）
  const deleteProduct = async (id: string | number) => {
    const product = (products.value || []).find(p => p.id === id)
    if (product) {
      // 优先使用服务器API
      try {
        await productApi.delete(String(id))
        console.log('[ProductStore] 服务器删除商品成功:', product.name, 'ID:', id)
      } catch (error) {
        console.error('[ProductStore] 服务器删除商品失败，回退到本地存储:', error)
      }

      // 同时更新本地状态
      product.deleted = true
      product.status = 'inactive'
      product.updateTime = new Date().toISOString()
      console.log('[ProductStore] 商品已删除:', product.name, 'ID:', id)
      return true
    }
    console.warn('[ProductStore] 未找到要删除的商品 ID:', id)
    return false
  }

  // 恢复商品
  const restoreProduct = (id: string | number) => {
    const product = products.value.find(p => p.id === id)
    if (product && product.deleted) {
      product.deleted = false
      product.status = 'active' // 恢复的商品默认设置为上架状态
      product.updateTime = new Date().toISOString()
      return true
    }
    return false
  }

  // 彻底删除商品（硬删除）
  const permanentDeleteProduct = (id: string | number) => {
    const index = products.value.findIndex(p => p.id === id)
    if (index !== -1) {
      products.value.splice(index, 1)
      return true
    }
    return false
  }

  // 根据ID获取商品
  const getProductById = (id: string | number) => {
    return (products.value || []).find(p => p.id == id || p.id === Number(id) || String(p.id) === String(id))
  }

  // 获取过滤后的商品列表
  const getFilteredProducts = computed(() => {
    let filtered = [...(products.value || [])]

    // 按删除状态过滤
    if (searchForm.value.onlyDeleted) {
      // 只显示已删除的商品
      filtered = filtered.filter(p => p.deleted === true)
    } else if (!searchForm.value.showDeleted) {
      // 默认不显示已删除的商品
      filtered = filtered.filter(p => !p.deleted)
    }
    // 如果showDeleted为true且onlyDeleted为false，则显示所有商品（包括已删除的）

    // 按名称过滤
    if (searchForm.value.name) {
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(searchForm.value.name.toLowerCase())
      )
    }

    // 按编码过滤
    if (searchForm.value.code) {
      filtered = filtered.filter(p =>
        p.code.toLowerCase().includes(searchForm.value.code.toLowerCase())
      )
    }

    // 按分类过滤
    if (searchForm.value.categoryId) {
      filtered = filtered.filter(p => p.categoryId === searchForm.value.categoryId)
    }

    // 按状态过滤
    if (searchForm.value.status) {
      if (searchForm.value.status === 'active') {
        // 在售商品：必须是active状态且未被删除
        filtered = filtered.filter(p => p.status === 'active' && !p.deleted)
      } else {
        filtered = filtered.filter(p => p.status === searchForm.value.status)
      }
    }

    // 按库存状态过滤
    if (searchForm.value.stockStatus) {
      switch (searchForm.value.stockStatus) {
        case 'normal':
          filtered = filtered.filter(p => p.stock > p.minStock)
          break
        case 'warning':
          filtered = filtered.filter(p => p.stock <= p.minStock && p.stock > 0)
          break
        case 'out_of_stock':
          filtered = filtered.filter(p => p.stock === 0)
          break
      }
    }

    // 按价格范围过滤
    if (searchForm.value.minPrice !== null) {
      filtered = filtered.filter(p => p.price >= searchForm.value.minPrice!)
    }
    if (searchForm.value.maxPrice !== null) {
      filtered = filtered.filter(p => p.price <= searchForm.value.maxPrice!)
    }

    return filtered
  })

  // 设置搜索条件
  const setSearchForm = (form: Partial<ProductSearchForm>) => {
    Object.assign(searchForm.value, form)
  }

  // 重置搜索条件
  const resetSearchForm = () => {
    searchForm.value = {
      name: '',
      code: '',
      categoryId: '',
      status: '',
      stockStatus: '',
      minPrice: null,
      maxPrice: null,
      showDeleted: false,
      onlyDeleted: false
    }
  }

  // 设置分页
  const setPagination = (page: Partial<typeof pagination.value>) => {
    Object.assign(pagination.value, page)
  }

  // 更新商品库存
  const updateProductStock = (productId: string | number, stockChange: number) => {
    const product = products.value.find(p => p.id === productId)
    if (product) {
      const newStock = product.stock + stockChange
      product.stock = Math.max(0, newStock) // 确保库存不会小于0
      product.updateTime = new Date().toLocaleString()

      // 如果库存为0，更新状态为缺货
      if (product.stock === 0) {
        product.status = 'out_of_stock'
      } else if (product.status === 'out_of_stock' && product.stock > 0) {
        product.status = 'active'
      }
    }
  }

  // 从API获取产品数据
  const fetchProducts = async (params: ProductListParams = {}) => {
    try {
      loading.value = true
      const response = await productApi.getActiveList(params)

      // 更新产品列表
      products.value = response?.list || []

      // 更新分页信息
      pagination.value = {
        ...pagination.value,
        total: response?.total || 0,
        current: response?.page || 1,
        pageSize: response?.pageSize || 10
      }

      return response
    } catch (error) {
      console.error('获取产品列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 刷新产品数据（获取在售产品）
  const refreshProducts = async () => {
    try {
      loading.value = true
      // 获取在售产品，使用当前搜索条件
      const params: ProductListParams = {
        page: pagination.value.current,
        pageSize: pagination.value.pageSize,
        status: 'active' // 只获取在售产品
      }

      // 添加搜索条件
      if (searchForm.value.name) {
        params.name = searchForm.value.name
      }
      if (searchForm.value.categoryId) {
        params.categoryId = searchForm.value.categoryId
      }
      if (searchForm.value.stockStatus) {
        params.stockStatus = searchForm.value.stockStatus as any
      }

      const response = await productApi.getActiveList(params)

      // 更新产品列表
      products.value = response?.list || []

      // 更新分页信息
      pagination.value = {
        ...pagination.value,
        total: response?.total || 0,
        current: response?.page || 1,
        pageSize: response?.pageSize || 10
      }

      return response
    } catch (error) {
      console.error('刷新产品列表失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }



  const findCategoryById = (id: string): ProductCategory | null => {
    const findInArray = (arr: ProductCategory[]): ProductCategory | null => {
      for (const cat of arr) {
        if (cat.id === id) return cat
        if (cat.children) {
          const found = findInArray(cat.children)
          if (found) return found
        }
      }
      return null
    }

    return findInArray(categories.value)
  }

  const getCategoryPath = (id: string): ProductCategory[] => {
    const path: ProductCategory[] = []

    const findPath = (arr: ProductCategory[], targetId: string, currentPath: ProductCategory[]): boolean => {
      for (const cat of arr) {
        const newPath = [...currentPath, cat]
        if (cat.id === targetId) {
          path.push(...newPath)
          return true
        }
        if (cat.children && findPath(cat.children, targetId, newPath)) {
          return true
        }
      }
      return false
    }

    findPath(categories.value, id, [])
    return path
  }

  const getFlatCategories = (): ProductCategory[] => {
    const flat: ProductCategory[] = []

    const flatten = (arr: ProductCategory[]) => {
      for (const cat of arr) {
        flat.push(cat)
        if (cat.children) {
          flatten(cat.children)
        }
      }
    }

    flatten(categories.value)
    return flat
  }

  // 搜索产品
  const searchProducts = async (keyword: string): Promise<Product[]> => {
    if (!keyword.trim()) {
      return []
    }

    const searchTerm = keyword.toLowerCase().trim()

    // 从当前产品列表中搜索
    const results = (products.value || []).filter(product => {
      // 排除已删除的产品
      if (product.deleted) return false

      // 搜索产品名称、编码、品牌、规格
      return (
        product.name.toLowerCase().includes(searchTerm) ||
        product.code.toLowerCase().includes(searchTerm) ||
        product.brand.toLowerCase().includes(searchTerm) ||
        product.specification.toLowerCase().includes(searchTerm) ||
        product.description.toLowerCase().includes(searchTerm)
      )
    })

    // 按相关性排序：名称匹配优先，然后是编码匹配
    results.sort((a, b) => {
      const aNameMatch = a.name.toLowerCase().includes(searchTerm)
      const bNameMatch = b.name.toLowerCase().includes(searchTerm)
      const aCodeMatch = a.code.toLowerCase().includes(searchTerm)
      const bCodeMatch = b.code.toLowerCase().includes(searchTerm)

      if (aNameMatch && !bNameMatch) return -1
      if (!aNameMatch && bNameMatch) return 1
      if (aCodeMatch && !bCodeMatch) return -1
      if (!aCodeMatch && bCodeMatch) return 1

      return 0
    })

    // 限制返回结果数量
    return results.slice(0, 50)
  }

  // 分类管理API方法
  const addCategory = async (category: Omit<ProductCategory, 'id' | 'createTime'>) => {
    try {
      loading.value = true
      const newCategory = await productApi.createCategory(category)
      await loadCategories() // 重新加载分类树
      return newCategory
    } catch (error) {
      console.error('添加分类失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const updateCategory = async (id: string, category: Partial<ProductCategory>) => {
    try {
      loading.value = true
      const updatedCategory = await productApi.updateCategory(id, category)
      await loadCategories() // 重新加载分类树
      return updatedCategory
    } catch (error) {
      console.error('更新分类失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  const deleteCategory = async (id: string) => {
    try {
      loading.value = true
      await productApi.deleteCategory(id)
      await loadCategories() // 重新加载分类树
    } catch (error) {
      console.error('删除分类失败:', error)
      throw error
    } finally {
      loading.value = false
    }
  }

  // 初始化数据（从API加载）
  setTimeout(() => {
    initData()
  }, 0)

  return {
    // 状态
    products,
    categories: computed(() => Array.isArray(categories.value) ? categories.value : []),
    loading,
    pagination,
    searchForm,

    // 计算属性
    stats,
    getFilteredProducts,

    // 商品管理方法
    addProduct,
    updateProduct,
    deleteProduct,
    restoreProduct,
    permanentDeleteProduct,
    getProductById,
    setSearchForm,
    resetSearchForm,
    setPagination,
    updateProductStock,
    fetchProducts,
    refreshProducts,
    searchProducts,

    // 数据加载方法
    initData,
    loadCategories,
    loadProducts,

    // 分类管理方法
    addCategory,
    updateCategory,
    deleteCategory,
    findCategoryById,
    getCategoryPath,
    getFlatCategories
  }
})
