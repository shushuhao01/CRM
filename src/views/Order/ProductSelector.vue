<template>
  <div class="product-selector">
    <!-- 产品搜索和筛选 -->
    <div class="filter-section">
      <div class="filter-header">
        <h3 class="filter-title">商品筛选</h3>
        <el-button
          type="primary"
          size="small"
          :icon="Refresh"
          @click="handleRefreshProducts"
          title="刷新商品列表"
        >
          刷新商品
        </el-button>
      </div>
      <div class="filter-row">
        <label class="filter-label">搜索商品</label>
        <el-input
          v-model="searchQuery"
          placeholder="搜索产品名称、编号或描述..."
          :prefix-icon="Search"
          clearable
          class="filter-input"
          @input="handleSearch"
        />
      </div>
      <el-row :gutter="16">
        <el-col :span="12">
          <div class="filter-row">
            <label class="filter-label">商品分类</label>
            <el-select
              v-model="selectedCategory"
              placeholder="选择分类"
              clearable
              class="filter-input"
              style="width: 100%"
              @change="handleCategoryChange"
            >
              <el-option
                v-for="category in categories"
                :key="category.id"
                :label="category.name"
                :value="category.id"
              />
            </el-select>
          </div>
        </el-col>
        <el-col :span="12">
          <div class="filter-row">
            <label class="filter-label">价格范围</label>
            <el-select
              v-model="priceRange"
              placeholder="价格范围"
              clearable
              class="filter-input"
              style="width: 100%"
              @change="handlePriceRangeChange"
            >
              <el-option label="0-100元" value="0-100" />
              <el-option label="100-500元" value="100-500" />
              <el-option label="500-1000元" value="500-1000" />
              <el-option label="1000元以上" value="1000+" />
            </el-select>
          </div>
        </el-col>
      </el-row>
    </div>

    <div class="content-wrapper">
      <!-- 产品列表 -->
      <div class="product-list-section">
        <div class="toolbar">
          <div class="product-stats">
            <div class="stat-item">
              <span>共找到</span>
              <span class="stat-number">{{ totalProducts }}</span>
              <span>件商品</span>
            </div>
            <div class="stat-item">
              <span>已选择</span>
              <span class="stat-number">{{ cartItems.length }}</span>
              <span>件</span>
            </div>
          </div>
          <div class="view-toggle">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="grid">
                <el-icon><Grid /></el-icon>
              </el-radio-button>
              <el-radio-button label="list">
                <el-icon><List /></el-icon>
              </el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <div class="product-grid" v-if="viewMode === 'grid'">
          <div
            v-for="product in filteredProducts"
            :key="product.id"
            class="product-card"
            :class="{ 'selected': isInCart(product.id) }"
          >
            <div class="product-image">
              <div class="product-badges" v-if="product.isRecommended || product.isNew || product.isHot">
                <el-tag v-if="product.isRecommended" type="warning" size="small">推荐</el-tag>
                <el-tag v-if="product.isNew" type="success" size="small">新品</el-tag>
                <el-tag v-if="product.isHot" type="danger" size="small">热销</el-tag>
              </div>
            </div>
            <div class="product-info">
              <h4 class="product-name">
                <el-tag v-if="product.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px; vertical-align: middle;">虚拟</el-tag>
                <el-tag v-else type="info" size="small" effect="light" style="margin-right: 4px; vertical-align: middle;">实物</el-tag>
                {{ product.name }}
              </h4>
              <p class="product-code">{{ product.code }}</p>
              <div class="product-price">¥{{ product.price }}</div>
              <div class="product-stock" :class="getStockStatusClass(product.stock)">
                库存: {{ product.stock }}
              </div>
            </div>
            <div class="product-actions">
              <el-button
                v-if="!isInCart(product.id)"
                type="primary"
                size="small"
                class="add-to-cart"
                @click="addToCart(product)"
                :disabled="product.stock === 0"
              >
                加入购物车
              </el-button>
              <div v-else class="quantity-control">
                <el-button
                  size="small"
                  @click="decreaseQuantity(product.id)"
                  :icon="Minus"
                />
                <span class="quantity-display">{{ getCartQuantity(product.id) }}</span>
                <el-button
                  size="small"
                  @click="increaseQuantity(product.id)"
                  :icon="Plus"
                  :disabled="getCartQuantity(product.id) >= product.stock"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="product-table" v-else>
          <el-table :data="filteredProducts" style="width: 100%">
            <el-table-column prop="name" label="产品名称" min-width="200">
              <template #default="{ row }">
                <div class="table-product-info">
                  <div class="table-product-image">📦</div>
                  <div class="table-product-details">
                    <div class="table-product-name">
                      <el-tag v-if="row.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
                      <el-tag v-else size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
                      {{ row.name }}
                    </div>
                    <div class="table-product-code">{{ row.code }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="价格" width="120">
              <template #default="{ row }">
                <span class="product-price">¥{{ row.price }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="stock" label="库存" width="100">
              <template #default="{ row }">
                <span :class="getStockStatusClass(row.stock)">{{ row.stock }}</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
              <template #default="{ row }">
                <el-button
                  v-if="!isInCart(row.id)"
                  type="primary"
                  size="small"
                  @click="addToCart(row)"
                  :disabled="row.stock === 0"
                >
                  加入购物车
                </el-button>
                <div v-else class="quantity-control">
                  <el-button
                    size="small"
                    @click="decreaseQuantity(row.id)"
                    :icon="Minus"
                  />
                  <span class="quantity-display">{{ getCartQuantity(row.id) }}</span>
                  <el-button
                    size="small"
                    @click="increaseQuantity(row.id)"
                    :icon="Plus"
                    :disabled="getCartQuantity(row.id) >= row.stock"
                  />
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[12, 24, 48, 96]"
            :total="totalProducts"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
            background
          />
        </div>
      </div>

      <!-- 购物车 -->
      <div class="cart-section">
        <div class="cart-header">
          <h3 class="cart-title">购物车 <span class="cart-count">{{ cartItems.length }}</span></h3>
          <el-button
            v-if="cartItems.length > 0"
            type="text"
            size="small"
            class="clear-cart"
            @click="clearCart"
          >
            清空
          </el-button>
        </div>

        <div class="cart-content">
          <div v-if="cartItems.length === 0" class="empty-cart">
            <div class="empty-cart-icon">🛒</div>
            <div>购物车为空</div>
            <div style="font-size: 12px; color: #909399; margin-top: 8px;">请选择商品添加到购物车</div>
          </div>

          <div v-else class="cart-items">
            <div
              v-for="item in cartItems"
              :key="item.id"
              class="cart-item"
            >
              <div class="cart-item-image">📦</div>
              <div class="cart-item-info">
                <div class="cart-item-name">
                  <el-tag v-if="item.productType === 'virtual'" type="warning" size="small" effect="light" style="margin-right: 4px;">虚拟</el-tag>
                  <el-tag v-else type="info" size="small" effect="light" style="margin-right: 4px;">实物</el-tag>
                  {{ item.name }}
                </div>
                <div class="cart-item-code">{{ item.code }}</div>
              </div>
              <div class="cart-item-controls">
                <div class="cart-item-price">¥{{ item.price }}</div>
                <div class="quantity-control">
                  <el-button
                    size="small"
                    @click="decreaseQuantity(item.id)"
                    :icon="Minus"
                  />
                  <el-input-number
                    v-model="item.quantity"
                    :min="1"
                    :max="item.stock"
                    size="small"
                    @change="updateQuantity(item.id, item.quantity)"
                  />
                  <el-button
                    size="small"
                    @click="increaseQuantity(item.id)"
                    :icon="Plus"
                    :disabled="item.quantity >= item.stock"
                  />
                </div>
                <div class="cart-item-subtotal">¥{{ (item.price * item.quantity).toFixed(2) }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- 购物车汇总 -->
        <div class="cart-summary" v-if="cartItems.length > 0">
          <div class="cart-total">
            <span>总计:</span>
            <span class="total-amount">¥{{ totalAmount.toFixed(2) }}</span>
          </div>
          <div class="cart-actions">
            <el-button @click="$emit('cancel')">取消</el-button>
            <el-button
              type="primary"
              @click="confirmSelection"
              :disabled="cartItems.length === 0"
            >
              确认选择 ({{ cartItems.length }})
            </el-button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Grid, List, Plus, Minus, Delete, Refresh } from '@element-plus/icons-vue'
import { useProductStore, type Product as StoreProduct } from '@/stores/product'

// 接口定义
interface Product {
  id: string | number
  name: string
  code: string
  price: number
  originalPrice?: number
  stock: number
  category: string
  categoryName: string
  image: string
  isHot?: boolean
  status: string
  productType?: string
}

interface CartItem extends Product {
  quantity: number
}

interface SelectedProduct {
  productId: string | number
  productName: string
  price: number
  quantity: number
  remark: string
}

// Props 和 Emits
interface Props {
  selectedProducts?: SelectedProduct[]
}

const props = withDefaults(defineProps<Props>(), {
  selectedProducts: () => []
})

const emit = defineEmits<{
  confirm: [products: SelectedProduct[]]
  cancel: []
}>()

// 使用商品store
const productStore = useProductStore()

// 响应式数据
const searchQuery = ref('')
const selectedCategory = ref('')
const priceRange = ref('')
const viewMode = ref('grid')
const currentPage = ref(1)
const pageSize = ref(12)

// 从store获取商品数据，转换为组件需要的格式，只显示有库存的上架在售产品
const allProducts = computed(() => {
  return productStore.products
    .filter(p => p.status === 'active' && !p.isDeleted && p.stock > 0) // 只显示有库存的上架在售产品
    .map(p => ({
      id: p.id,
      name: p.name,
      code: p.code,
      price: p.price,
      originalPrice: p.marketPrice,
      stock: p.stock,
      category: p.categoryId,
      categoryName: p.categoryName,
      image: p.image,
      isRecommended: p.isRecommended,
      isNew: p.isNew,
      isHot: p.isHot,
      status: p.status,
      productType: p.productType || 'physical'
    }))
})

// 从store获取分类数据
const categories = computed(() => {
  return (productStore.categories || []).map(cat => ({
    id: cat.id,
    name: cat.name
  }))
})

// 购物车
const cartItems = ref<CartItem[]>([])

// 计算属性 - 获取过滤后的产品列表
const getFilteredProducts = computed(() => {
  let products = allProducts.value

  // 搜索过滤
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    products = products.filter(p =>
      p.name.toLowerCase().includes(query) ||
      p.code.toLowerCase().includes(query)
    )
  }

  // 分类过滤
  if (selectedCategory.value) {
    products = products.filter(p => p.category === selectedCategory.value)
  }

  // 价格范围过滤
  if (priceRange.value) {
    const [min, max] = priceRange.value.split('-').map(v => v === '+' ? Infinity : parseInt(v))
    products = products.filter(p => p.price >= min && (max === Infinity || p.price <= max))
  }

  return products
})

const filteredProducts = computed(() => {
  const products = getFilteredProducts.value
  return products.slice((currentPage.value - 1) * pageSize.value, currentPage.value * pageSize.value)
})

const totalProducts = computed(() => {
  return getFilteredProducts.value.length
})

const totalQuantity = computed(() => {
  return cartItems.value.reduce((total, item) => total + item.quantity, 0)
})

const totalAmount = computed(() => {
  return cartItems.value.reduce((total, item) => total + (item.price * item.quantity), 0)
})

// 方法
const handleRefreshProducts = async () => {
  try {
    await productStore.fetchProducts()
    ElMessage.success('商品列表已刷新')
    currentPage.value = 1
  } catch (error) {
    ElMessage.error('刷新商品列表失败')
    console.error('刷新商品失败:', error)
  }
}

const handleSearch = () => {
  currentPage.value = 1
}

const handleCategoryChange = () => {
  currentPage.value = 1
}

const handlePriceRangeChange = () => {
  currentPage.value = 1
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const isInCart = (productId: string | number) => {
  return cartItems.value.some(item => item.id === productId)
}

const getCartQuantity = (productId: string | number) => {
  const item = cartItems.value.find(item => item.id === productId)
  return item ? item.quantity : 0
}

const addToCart = (product: Product) => {
  if (product.stock === 0) {
    ElMessage.warning('商品库存不足')
    return
  }

  const existingItem = cartItems.value.find(item => item.id === product.id)
  if (existingItem) {
    if (existingItem.quantity < product.stock) {
      existingItem.quantity++
    } else {
      ElMessage.warning('已达到最大库存数量')
    }
  } else {
    cartItems.value.push({
      ...product,
      quantity: 1
    })
  }
}

const removeFromCart = (productId: string | number) => {
  const index = cartItems.value.findIndex(item => item.id === productId)
  if (index > -1) {
    cartItems.value.splice(index, 1)
  }
}

const increaseQuantity = (productId: string | number) => {
  const item = cartItems.value.find(item => item.id === productId)
  if (item && item.quantity < item.stock) {
    item.quantity++
  } else {
    ElMessage.warning('已达到最大库存数量')
  }
}

const decreaseQuantity = (productId: string | number) => {
  const item = cartItems.value.find(item => item.id === productId)
  if (item) {
    if (item.quantity > 1) {
      item.quantity--
    } else {
      removeFromCart(productId)
    }
  }
}

const updateQuantity = (productId: string | number, quantity: number) => {
  const item = cartItems.value.find(item => item.id === productId)
  if (item) {
    if (quantity <= 0) {
      removeFromCart(productId)
    } else if (quantity <= item.stock) {
      item.quantity = quantity
    } else {
      item.quantity = item.stock
      ElMessage.warning('数量不能超过库存')
    }
  }
}

const clearCart = () => {
  cartItems.value = []
}

const confirmSelection = () => {
  if (cartItems.value.length === 0) {
    ElMessage.warning('请选择商品')
    return
  }

  // 检查库存是否充足
  for (const item of cartItems.value) {
    const currentProduct = productStore.products.find(p => p.id === item.id)
    if (!currentProduct || currentProduct.stock < item.quantity) {
      ElMessage.error(`商品 ${item.name} 库存不足，当前库存：${currentProduct?.stock || 0}`)
      return
    }
  }

  // 减少库存
  cartItems.value.forEach(item => {
    productStore.updateProductStock(item.id, -item.quantity)
  })

  // 发送确认事件
  emit('confirm', cartItems.value.map(item => ({
    productId: item.id,
    productName: item.name,
    price: item.price,
    quantity: item.quantity,
    remark: ''
  })))

  // 清空购物车
  clearCart()

  ElMessage.success('商品已添加到订单，库存已自动扣减')
}

const getStockClass = (stock: number) => {
  if (stock === 0) return 'stock-empty'
  if (stock < 10) return 'stock-low'
  return 'stock-normal'
}

const getStockStatusClass = (stock: number) => {
  if (stock === 0) return 'stock-empty'
  if (stock < 10) return 'stock-low'
  if (stock < 50) return 'stock-medium'
  return 'stock-high'
}

// 初始化
onMounted(() => {
  // 确保商品数据已初始化
  if (productStore.products.length === 0) {
    productStore.initData()
  }

  // 如果有预选产品，添加到购物车
  if (props.selectedProducts.length > 0) {
    props.selectedProducts.forEach(selected => {
      const product = allProducts.value.find(p => p.id === selected.productId)
      if (product) {
        cartItems.value.push({
          ...product,
          quantity: selected.quantity
        })
      }
    })
  }
})
</script>

<style scoped>
.product-selector {
  height: 70vh;
  display: flex;
  flex-direction: column;
}

/* 筛选区域样式 */
.filter-section {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #e9ecef;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  position: relative;
  overflow: hidden;
}

.filter-section::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a, #e6a23c);
  border-radius: 12px 12px 0 0;
}

.filter-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.filter-title {
  margin: 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-title::before {
  content: '🔍';
  font-size: 18px;
}

.filter-row {
  margin-bottom: 16px;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-label {
  font-weight: 500;
  color: #606266;
  margin-bottom: 8px;
  display: block;
}

.filter-input {
  border-radius: 8px;
  transition: all 0.3s ease;
}

.filter-input:focus-within {
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.2);
}

.price-range {
  display: flex;
  align-items: center;
  gap: 12px;
}

.price-range .el-input-number {
  flex: 1;
  border-radius: 8px;
}

.price-separator {
  color: #909399;
  font-weight: 500;
  padding: 0 4px;
}

/* 工具栏样式 */
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 16px;
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.05);
}

.view-toggle {
  display: flex;
  gap: 8px;
}

.view-toggle .el-button {
  border-radius: 6px;
  transition: all 0.3s ease;
}

.view-toggle .el-button.is-active {
  background: #409eff;
  border-color: #409eff;
  color: white;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
}

.product-stats {
  color: #606266;
  font-size: 14px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.stat-number {
  font-weight: 600;
  color: #409eff;
}

/* 商品列表样式 */
.product-list {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.product-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  padding: 16px;
  overflow-y: auto;
  max-height: 100%;
}

.product-card {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  cursor: pointer;
  background: white;
  height: 100%;
  display: flex;
  flex-direction: column;
  position: relative;
  overflow: hidden;
}

.product-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: linear-gradient(90deg, #409eff, #67c23a);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.product-card:hover {
  border-color: #409eff;
  box-shadow: 0 8px 25px rgba(64, 158, 255, 0.15);
  transform: translateY(-4px);
}

.product-card:hover::before {
  opacity: 1;
}

.product-card.selected {
  border-color: #67c23a;
  background: linear-gradient(135deg, #f0f9ff 0%, #e8f5e8 100%);
  box-shadow: 0 4px 20px rgba(103, 194, 58, 0.2);
}

.product-card.selected::before {
  background: linear-gradient(90deg, #67c23a, #409eff);
  opacity: 1;
}

.product-card.selected::after {
  content: '✓';
  position: absolute;
  top: 8px;
  right: 8px;
  background: #67c23a;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: bold;
  z-index: 10;
}

.product-image {
  width: 100%;
  height: 160px;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  position: relative;
  overflow: hidden;
}

.product-image::before {
  content: '📦';
  font-size: 32px;
  opacity: 0.5;
}

.product-badges {
  position: absolute;
  top: 8px;
  left: 8px;
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
  z-index: 1;
}

.product-info {
  padding: 16px;
}

.product-name {
  font-weight: 600;
  margin-bottom: 8px;
  color: #303133;
  font-size: 15px;
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.product-code {
  color: #909399;
  font-size: 12px;
  margin-bottom: 12px;
  background: #f5f7fa;
  padding: 4px 8px;
  border-radius: 4px;
  display: inline-block;
  font-family: 'Courier New', monospace;
}

.product-price {
  color: #e6a23c;
  font-weight: 700;
  font-size: 18px;
  margin-bottom: 12px;
}

.product-stock {
  font-size: 12px;
  margin-bottom: 16px;
  padding: 4px 8px;
  border-radius: 12px;
  display: inline-block;
  font-weight: 500;
  color: #606266;
}

.stock-high {
  color: #67c23a;
  background: #f0f9ff;
}

.stock-medium {
  color: #e6a23c;
  background: #fdf6ec;
}

.stock-low {
  color: #f56c6c;
  background: #fef0f0;
}

.stock-empty {
  color: #f56c6c;
  background: #fef0f0;
}

.product-actions {
  margin-top: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.add-to-cart {
  flex: 1;
  border-radius: 8px;
  font-weight: 500;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quantity-display {
  min-width: 40px;
  text-align: center;
  font-weight: 600;
  font-size: 13px;
  color: #67c23a;
  background: #f0f9ff;
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid #67c23a;
}

.product-table {
  flex: 1;
  overflow-y: auto;
  border-radius: 8px;
  overflow: hidden;
}

.product-table .el-table__row:hover {
  background-color: #f5f7fa;
}

.product-table .el-table__row.selected {
  background-color: #f0f9ff;
}

.table-product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.table-product-image {
  font-size: 24px;
  width: 40px;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f5f7fa;
  border-radius: 8px;
}

.table-product-details {
  flex: 1;
}

.table-product-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
  font-size: 14px;
}

.table-product-code {
  color: #909399;
  font-size: 12px;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.product-name-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-thumb {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 4px;
}

.name {
  font-weight: 600;
  color: #333;
}

.code {
  font-size: 12px;
  color: #666;
}

.price-cell .current-price {
  color: #e74c3c;
  font-weight: 600;
}

.price-cell .original-price {
  color: #999;
  text-decoration: line-through;
  margin-left: 8px;
  font-size: 12px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: center;
  padding: 24px 20px;
  text-align: center;
  border-top: 1px solid #e4e7ed;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.04);
}

.pagination-wrapper .el-pagination {
  justify-content: center;
}

.pagination-wrapper .el-pagination .el-pager li {
  border-radius: 6px;
  margin: 0 2px;
}

.pagination-wrapper .el-pagination .btn-prev,
.pagination-wrapper .el-pagination .btn-next {
  border-radius: 6px;
}

/* 购物车样式 */
.cart-section {
  width: 380px;
  border-left: 1px solid #e4e7ed;
  background: linear-gradient(180deg, #fafbfc 0%, #f5f7fa 100%);
  display: flex;
  flex-direction: column;
}

.cart-header {
  padding: 20px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.cart-title {
  margin: 0;
  font-size: 18px;
  color: #303133;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}

.cart-count {
  background: #409eff;
  color: white;
  font-size: 12px;
  padding: 2px 8px;
  border-radius: 12px;
  font-weight: 500;
}

.clear-cart {
  color: #f56c6c;
  font-weight: 500;
}

.clear-cart:hover {
  color: #f56c6c;
  background: #fef0f0;
}

.cart-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.empty-cart {
  text-align: center;
  padding: 60px 20px;
  color: #909399;
}

.empty-cart-icon {
  font-size: 48px;
  margin-bottom: 16px;
  opacity: 0.6;
}

.cart-items {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.cart-item {
  background: white;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid #e4e7ed;
  display: flex;
  gap: 12px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
}

.cart-item:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.cart-item-image {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  flex-shrink: 0;
}

.cart-item-info {
  flex: 1;
  min-width: 0;
}

.cart-item-name {
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 6px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cart-item-code {
  font-size: 12px;
  color: #909399;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
  display: inline-block;
}

.cart-item-controls {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 12px;
}

.cart-item-price {
  font-size: 14px;
  color: #e6a23c;
  font-weight: 600;
}

.quantity-control {
  display: flex;
  align-items: center;
  gap: 6px;
}

.quantity-control .el-input-number {
  width: 70px;
}

.cart-item-subtotal {
  font-size: 14px;
  color: #67c23a;
  font-weight: 600;
  background: #f0f9ff;
  padding: 4px 8px;
  border-radius: 6px;
}

.cart-summary {
  padding: 20px;
  border-top: 1px solid #e4e7ed;
  background: white;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.06);
}

.cart-total {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  font-size: 16px;
  font-weight: 600;
  padding: 16px;
  background: linear-gradient(135deg, #f0f9ff 0%, #e8f5e8 100%);
  border-radius: 12px;
  border: 1px solid #e4e7ed;
}

.total-amount {
  font-size: 20px;
  font-weight: 700;
  color: #e6a23c;
}

.cart-actions {
  display: flex;
  gap: 12px;
}

.cart-actions .el-button {
  flex: 1;
  height: 44px;
  border-radius: 8px;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .cart-section {
    width: 320px;
  }

  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  }
}

@media (max-width: 768px) {
  .product-selector-dialog .el-dialog {
    width: 95%;
    margin: 20px auto;
  }

  .dialog-content {
    flex-direction: column;
    height: auto;
  }

  .cart-section {
    width: 100%;
    border-left: none;
    border-top: 1px solid #e4e7ed;
    max-height: 400px;
  }

  .product-grid {
    grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
    gap: 12px;
  }

  .product-card {
    padding: 16px;
  }

  .cart-item {
    padding: 12px;
  }

  .cart-item-controls {
    flex-direction: row;
    align-items: center;
    gap: 8px;
  }

  .quantity-control .el-input-number {
    width: 60px;
  }

  .filter-section {
    padding: 16px;
  }

  .filter-row {
    flex-direction: column;
    gap: 8px;
  }

  .filter-input {
    width: 100% !important;
  }
}

@media (max-width: 480px) {
  .product-grid {
    grid-template-columns: 1fr;
  }

  .cart-actions {
    flex-direction: column;
  }

  .toolbar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .product-stats {
    justify-content: center;
  }
}
</style>
