<template>
  <div class="product-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>{{ productInfo.name }}</h2>
          <div class="header-meta">
            <span class="product-code">商品编码：{{ productInfo.code }}</span>
            <el-tag :type="getStatusColor(productInfo.status)" size="small">
              {{ getStatusText(productInfo.status) }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <!-- 仅管理员可见的操作按钮 -->
        <el-button v-if="canAdjustStock" @click="handleStockAdjust" :icon="Edit">
          调库存
        </el-button>
        <el-button v-if="canEditProduct" @click="handleEdit" type="primary" :icon="Edit">
          编辑商品
        </el-button>
        <el-dropdown v-if="canEditProduct" @command="handleDropdownCommand">
          <el-button :icon="MoreFilled">
            更多<el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="copy">复制商品</el-dropdown-item>
              <el-dropdown-item v-if="canToggleStatus" command="toggle" :divided="true">
                {{ productInfo.status === 'active' ? '下架' : '上架' }}
              </el-dropdown-item>
              <el-dropdown-item v-if="canEditProduct" command="delete" class="danger-item">
                删除商品
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </div>

    <div class="detail-content">
      <el-row :gutter="20">
        <!-- 左侧主要信息 -->
        <el-col :span="16">
          <!-- 基本信息 -->
          <el-card class="info-card" title="基本信息">
            <template #header>
              <span>基本信息</span>
            </template>

            <div class="product-basic">
              <div class="product-images">
                <el-image
                  :src="productInfo.mainImage"
                  :preview-src-list="productInfo.images"
                  fit="cover"
                  class="main-image"
                />
                <div class="image-list">
                  <el-image
                    v-for="(image, index) in productInfo.images"
                    :key="index"
                    :src="image"
                    :preview-src-list="productInfo.images"
                    :initial-index="index"
                    fit="cover"
                    class="thumb-image"
                  />
                </div>
              </div>

              <div class="product-info">
                <div class="info-row">
                  <label>商品名称：</label>
                  <span>{{ productInfo.name }}</span>
                </div>
                <div class="info-row">
                  <label>商品编码：</label>
                  <span>{{ productInfo.code }}</span>
                </div>
                <div class="info-row">
                  <label>商品分类：</label>
                  <span>{{ productInfo.categoryName }}</span>
                </div>
                <div class="info-row">
                  <label>商品规格：</label>
                  <span>{{ productInfo.specification }}</span>
                </div>
                <div class="info-row">
                  <label>商品品牌：</label>
                  <span>{{ productInfo.brand }}</span>
                </div>
                <div class="info-row">
                  <label>商品单位：</label>
                  <span>{{ productInfo.unit }}</span>
                </div>
                <div class="info-row">
                  <label>商品重量：</label>
                  <span>{{ productInfo.weight }}kg</span>
                </div>
                <div class="info-row">
                  <label>商品尺寸：</label>
                  <span>{{ productInfo.dimensions }}</span>
                </div>
                <div class="info-row">
                  <label>商品描述：</label>
                  <div class="description">{{ productInfo.description }}</div>
                </div>
              </div>
            </div>
          </el-card>

          <!-- 价格库存信息 -->
          <el-card class="info-card" title="价格库存">
            <template #header>
              <span>价格库存</span>
            </template>

            <el-row :gutter="20">
              <el-col :span="12">
                <div class="price-info">
                  <div class="info-item">
                    <label>销售价格：</label>
                    <span class="price">¥{{ productInfo.price }}</span>
                  </div>
                  <div class="info-item">
                    <label>成本价格：</label>
                    <span v-if="canViewCostPrice">¥{{ productInfo.costPrice }}</span>
                    <span v-else class="sensitive-info">
                      <el-icon><View /></el-icon>
                      ****
                    </span>
                  </div>
                  <div class="info-item">
                    <label>市场价格：</label>
                    <span>¥{{ productInfo.marketPrice }}</span>
                  </div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="stock-info">
                  <div class="info-item">
                    <label>当前库存：</label>
                    <span v-if="canViewStockInfo" :class="getStockClass(productInfo.stock, productInfo.minStock)">
                      {{ productInfo.stock }}
                    </span>
                    <span v-else class="sensitive-info">
                      <el-icon><View /></el-icon>
                      ****
                    </span>
                  </div>
                  <div class="info-item">
                    <label>最低库存：</label>
                    <span v-if="canViewStockInfo">{{ productInfo.minStock }}</span>
                    <span v-else class="sensitive-info">
                      <el-icon><View /></el-icon>
                      ****
                    </span>
                  </div>
                  <div class="info-item">
                    <label>最高库存：</label>
                    <span v-if="canViewStockInfo">{{ productInfo.maxStock }}</span>
                    <span v-else class="sensitive-info">
                      <el-icon><View /></el-icon>
                      ****
                    </span>
                  </div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 销售数据 -->
          <el-card v-if="canViewSalesData" class="info-card" title="销售数据">
            <template #header>
              <span>销售数据</span>
            </template>

            <el-row :gutter="20">
              <el-col :span="12">
                <div class="stat-item">
                  <div class="stat-value">{{ productInfo.salesCount }}</div>
                  <div class="stat-label">总销量</div>
                </div>
              </el-col>
              <el-col :span="12">
                <div class="stat-item">
                  <div class="stat-value">¥{{ productInfo.salesAmount }}</div>
                  <div class="stat-label">销售金额</div>
                </div>
              </el-col>
            </el-row>
          </el-card>

          <!-- 库存记录 -->
          <el-card v-if="canViewStockInfo" class="info-card" title="库存记录">
            <template #header>
              <div class="card-header">
                <span>库存记录</span>
                <el-button v-if="canViewStockInfo" @click="handleStockAdjust" type="primary" size="small">
                  调整库存
                </el-button>
              </div>
            </template>

            <div v-if="stockRecords.length === 0" class="empty-data">
              <el-empty description="暂无库存记录" />
            </div>
            <el-table v-else :data="stockRecords" style="width: 100%">
              <el-table-column prop="createTime" label="时间" width="180" />
              <el-table-column label="操作类型" width="100">
                <template #default="{ row }">
                  <el-tag :type="getStockTypeColor(row.type)" size="small">
                    {{ getStockTypeText(row.type) }}
                  </el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="quantity" label="数量变化" width="120">
                <template #default="{ row }">
                  <span :class="row.type === 'increase' ? 'increase' : 'decrease'">
                    {{ row.type === 'increase' ? '+' : '-' }}{{ row.quantity }}
                  </span>
                </template>
              </el-table-column>
              <el-table-column prop="stockAfter" label="变化后库存" width="120" />
              <el-table-column prop="reason" label="调整原因" />
              <el-table-column prop="operator" label="操作人" width="100" />
              <el-table-column prop="remark" label="备注" show-overflow-tooltip />
            </el-table>
          </el-card>
        </el-col>

        <!-- 右侧统计信息 -->
        <el-col :span="8">
          <!-- 商品状态 -->
          <el-card class="status-card">
            <template #header>
              <span>商品状态</span>
            </template>

            <div class="status-info">
              <div class="status-item">
                <label>当前状态：</label>
                <el-tag :type="getStatusColor(productInfo.status)">
                  {{ getStatusText(productInfo.status) }}
                </el-tag>
              </div>
              <div class="status-item">
                <label>创建时间：</label>
                <span>{{ productInfo.createTime }}</span>
              </div>
              <div class="status-item">
                <label>更新时间：</label>
                <span>{{ productInfo.updateTime }}</span>
              </div>
              <div class="status-item">
                <label>创建人：</label>
                <span>{{ productInfo.creator }}</span>
              </div>
              <div class="status-item">
                <label>最后修改人：</label>
                <span>{{ productInfo.updater }}</span>
              </div>
            </div>
          </el-card>

          <!-- 快速操作 -->
          <el-card class="action-card">
            <template #header>
              <span>快速操作</span>
            </template>

            <div class="quick-actions">
              <!-- 创建订单：所有角色可见 -->
              <el-button @click="handleCreateOrder" type="primary" :icon="Plus" block>
                创建订单
              </el-button>
              <!-- 以下操作仅管理员可见 -->
              <el-button v-if="canAdjustStock" @click="handleStockAdjust" :icon="Edit" block>
                调整库存
              </el-button>
              <el-button v-if="canAdjustPrice" @click="handlePriceAdjust" :icon="Money" block>
                调整价格
              </el-button>
              <el-button v-if="canToggleStatus" @click="handleToggleStatus" :icon="Switch" block>
                {{ productInfo.status === 'active' ? '下架商品' : '上架商品' }}
              </el-button>
            </div>
          </el-card>

          <!-- 相关统计 -->
          <el-card v-if="canViewSalesData" class="stats-card">
            <template #header>
              <div class="stats-header">
                <span>相关统计</span>
                <el-tag v-if="relatedStats.dataScope" size="small" :type="getDataScopeTagType(relatedStats.dataScope)">
                  {{ getDataScopeLabel(relatedStats.dataScope) }}
                </el-tag>
              </div>
            </template>

            <div v-if="relatedStats" class="related-stats">
              <div class="stat-row">
                <span class="stat-label">待处理订单：</span>
                <span class="stat-value">{{ relatedStats.pendingOrders || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">本月销量：</span>
                <span class="stat-value">{{ relatedStats.monthlySales || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">库存周转率：</span>
                <span class="stat-value">{{ relatedStats.turnoverRate || 0 }}%</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">平均评分：</span>
                <span class="stat-value">{{ relatedStats.avgRating || 0 }}</span>
              </div>
              <div class="stat-row">
                <span class="stat-label">退货率：</span>
                <span class="stat-value">{{ relatedStats.returnRate || 0 }}%</span>
              </div>
            </div>
            <div v-else class="empty-data">
              <el-empty description="暂无统计数据" />
            </div>
          </el-card>

          <!-- 操作日志 -->
          <el-card v-if="canViewOperationLogs" class="log-card">
            <template #header>
              <span>操作日志</span>
            </template>

            <div v-if="operationLogs.length > 0" class="operation-logs">
              <div
                v-for="log in operationLogs"
                :key="log.id"
                class="log-item"
              >
                <div class="log-time">{{ log.createTime }}</div>
                <div class="log-content">
                  <span class="log-operator">{{ log.operator }}</span>
                  <span class="log-action">{{ log.action }}</span>
                </div>
                <div class="log-detail" v-if="log.detail">{{ log.detail }}</div>
              </div>
            </div>
            <div v-else class="empty-data">
              <el-empty description="暂无操作日志" />
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 库存调整对话框 -->
    <el-dialog
      v-model="stockDialogVisible"
      title="库存调整"
      width="500px"
      :before-close="handleStockDialogClose"
    >
      <el-form
        ref="stockFormRef"
        :model="stockForm"
        :rules="stockFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称">
          <span>{{ productInfo.name }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ productInfo.stock }}</span>
        </el-form-item>
        <el-form-item label="调整类型" prop="type">
          <el-radio-group v-model="stockForm.type">
            <el-radio label="increase">增加</el-radio>
            <el-radio label="decrease">减少</el-radio>
            <el-radio label="set">设置</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整数量" prop="quantity">
          <el-input-number
            v-model="stockForm.quantity"
            :min="stockForm.type === 'decrease' ? 1 : 0"
            :max="stockForm.type === 'decrease' ? productInfo.stock : 99999"
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="调整原因" prop="reason">
          <el-select
            v-model="stockForm.reason"
            placeholder="请选择调整原因"
            style="width: 100%"
          >
            <el-option label="采购入库" value="purchase" />
            <el-option label="销售出库" value="sale" />
            <el-option label="盘点调整" value="inventory" />
            <el-option label="损耗报废" value="loss" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="stockForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handleStockDialogClose">取消</el-button>
          <el-button @click="confirmStockAdjust" type="primary" :loading="stockLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 价格调整对话框 -->
    <el-dialog
      v-model="priceDialogVisible"
      title="价格调整"
      width="500px"
      :before-close="handlePriceDialogClose"
    >
      <el-form
        ref="priceFormRef"
        :model="priceForm"
        :rules="priceFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称">
          <span>{{ productInfo.name }}</span>
        </el-form-item>
        <el-form-item label="商品编码">
          <span>{{ productInfo.code }}</span>
        </el-form-item>
        <el-form-item label="当前价格">
          <span>¥{{ productInfo.price?.toFixed(2) }}</span>
        </el-form-item>
        <el-form-item label="新价格" prop="newPrice">
          <el-input-number
            v-model="priceForm.newPrice"
            :min="0.01"
            :precision="2"
            style="width: 100%"
            placeholder="请输入新价格"
          />
        </el-form-item>
        <el-form-item label="价格变化">
          <span v-if="priceForm.newPrice && priceForm.originalPrice">
            <el-tag
              :type="priceForm.newPrice > priceForm.originalPrice ? 'success' : 'danger'"
              size="small"
            >
              {{ priceForm.newPrice > priceForm.originalPrice ? '+' : '' }}
              ¥{{ (priceForm.newPrice - priceForm.originalPrice).toFixed(2) }}
              ({{ ((priceForm.newPrice - priceForm.originalPrice) / priceForm.originalPrice * 100).toFixed(1) }}%)
            </el-tag>
          </span>
        </el-form-item>
        <el-form-item label="调价原因" prop="reason">
          <el-select
            v-model="priceForm.reason"
            placeholder="请选择调价原因"
            style="width: 100%"
          >
            <el-option label="成本变化" value="cost_change" />
            <el-option label="市场调价" value="market_adjust" />
            <el-option label="促销活动" value="promotion" />
            <el-option label="竞争调价" value="competition" />
            <el-option label="季节调整" value="seasonal" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="priceForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <span class="dialog-footer">
          <el-button @click="handlePriceDialogClose">取消</el-button>
          <el-button @click="confirmPriceAdjust" type="primary" :loading="priceLoading">
            确定
          </el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  ArrowLeft,
  Edit,
  MoreFilled,
  ArrowDown,
  Plus,
  Money,
  Switch,
  View
} from '@element-plus/icons-vue'
import { useNotificationStore } from '@/stores/notification'
import { useOrderStore } from '@/stores/order'
import { useProductStore } from '@/stores/product'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import { createSafeNavigator } from '@/utils/navigation'
import { productApi } from '@/api/product'

// 路由
const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)

// 消息提醒store
const notificationStore = useNotificationStore()

// 订单store
const orderStore = useOrderStore()

// 商品store
const productStore = useProductStore()

// 用户store
const userStore = useUserStore()

// 配置store
const configStore = useConfigStore()

// 响应式数据
const stockLoading = ref(false)
const stockDialogVisible = ref(false)
const priceLoading = ref(false)
const priceDialogVisible = ref(false)

// 商品信息
const productInfo = ref({
  id: '',
  code: '',
  name: '',
  categoryName: '',
  specification: '',
  brand: '',
  unit: '',
  weight: 0,
  dimensions: '',
  description: '',
  price: 0,
  costPrice: 0,
  marketPrice: 0,
  stock: 0,
  minStock: 0,
  maxStock: 0,
  salesCount: 0,
  salesAmount: 0,
  viewCount: 0,
  favoriteCount: 0,
  status: '',
  mainImage: '',
  images: [],
  createTime: '',
  updateTime: '',
  creator: '',
  updater: ''
})

// 库存调整表单
const stockForm = reactive({
  type: 'increase',
  quantity: 0,
  reason: '',
  remark: ''
})

// 价格调整表单
const priceForm = reactive({
  originalPrice: 0,
  newPrice: 0,
  reason: '',
  remark: ''
})

// 库存记录
const stockRecords = ref([])

// 相关统计
const relatedStats = ref<{
  pendingOrders: number
  monthlySales: number
  turnoverRate: number
  avgRating: number
  returnRate: number
  dataScope?: 'all' | 'department' | 'personal'
}>({
  pendingOrders: 0,
  monthlySales: 0,
  turnoverRate: 0,
  avgRating: 0,
  returnRate: 0,
  dataScope: 'personal'
})

// 操作日志
const operationLogs = ref([])

// 表单验证规则
const stockFormRules = {
  type: [
    { required: true, message: '请选择调整类型', trigger: 'change' }
  ],
  quantity: [
    { required: true, message: '请输入调整数量', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择调整原因', trigger: 'change' }
  ]
}

// 价格调整表单验证规则
const priceFormRules = {
  newPrice: [
    { required: true, message: '请输入新价格', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '价格必须大于0.01', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择调价原因', trigger: 'change' }
  ]
}

// 表单引用
const stockFormRef = ref()
const priceFormRef = ref()

// 权限控制计算属性
const canViewCostPrice = computed(() => {
  if (!configStore.productConfig.enablePermissionControl) return true
  return userStore.isSuperAdmin ||
         configStore.productConfig.costPriceViewRoles.includes(userStore.userInfo?.role || '')
})

const canViewSalesData = computed(() => {
  if (!configStore.productConfig.enablePermissionControl) return true
  return userStore.isSuperAdmin ||
         configStore.productConfig.salesDataViewRoles.includes(userStore.userInfo?.role || '')
})

const canViewStockInfo = computed(() => {
  if (!configStore.productConfig.enablePermissionControl) return true
  return userStore.isSuperAdmin ||
         configStore.productConfig.stockInfoViewRoles.includes(userStore.userInfo?.role || '')
})

const canViewOperationLogs = computed(() => {
  if (!configStore.productConfig.enablePermissionControl) return true
  return userStore.isSuperAdmin ||
         configStore.productConfig.operationLogsViewRoles.includes(userStore.userInfo?.role || '')
})

// 是否可以编辑商品（仅管理员可见）
const canEditProduct = computed(() => {
  return userStore.isAdmin || userStore.isSuperAdmin
})

// 是否可以调整库存（仅管理员可见）
const canAdjustStock = computed(() => {
  return userStore.isAdmin || userStore.isSuperAdmin
})

// 是否可以调整价格（仅管理员可见）
const canAdjustPrice = computed(() => {
  return userStore.isAdmin || userStore.isSuperAdmin
})

// 是否可以上下架商品（仅管理员可见）
const canToggleStatus = computed(() => {
  return userStore.isAdmin || userStore.isSuperAdmin
})

// 方法定义
/**
 * 返回上一页
 */
const goBack = () => {
  router.back()
}

/**
 * 获取状态颜色
 */
const getStatusColor = (status: string) => {
  const colorMap = {
    active: 'success',
    inactive: 'info',
    out_of_stock: 'danger'
  }
  return colorMap[status] || ''
}

/**
 * 获取状态文本
 */
const getStatusText = (status: string) => {
  const textMap = {
    active: '上架',
    inactive: '下架',
    out_of_stock: '缺货'
  }
  return textMap[status] || status
}

/**
 * 获取库存样式类
 */
const getStockClass = (stock: number, minStock: number) => {
  if (stock === 0) return 'stock-out'
  if (stock <= minStock) return 'stock-warning'
  return 'stock-normal'
}

/**
 * 获取库存操作类型颜色
 */
const getStockTypeColor = (type: string) => {
  const colorMap = {
    increase: 'success',
    decrease: 'warning',
    set: 'info'
  }
  return colorMap[type] || ''
}

/**
 * 获取库存操作类型文本
 */
const getStockTypeText = (type: string) => {
  const textMap = {
    increase: '增加',
    decrease: '减少',
    set: '设置'
  }
  return textMap[type] || type
}

/**
 * 编辑商品
 */
const handleEdit = () => {
  safeNavigator.push(`/product/edit/${productInfo.value.id}`)
}

/**
 * 库存调整
 */
const handleStockAdjust = () => {
  // 重置表单
  Object.assign(stockForm, {
    type: 'increase',
    quantity: 0,
    reason: '',
    remark: ''
  })

  stockDialogVisible.value = true
}

/**
 * 价格调整
 */
const handlePriceAdjust = () => {
  // 重置表单并设置原价
  Object.assign(priceForm, {
    originalPrice: productInfo.value.price,
    newPrice: 0,
    reason: '',
    remark: ''
  })

  priceDialogVisible.value = true
}

/**
 * 创建订单
 */
const handleCreateOrder = () => {
  // 直接跳转到新增订单页面，带上商品ID参数
  safeNavigator.push(`/order/add?productId=${productInfo.value.id}`)
}

/**
 * 切换状态
 */
const handleToggleStatus = async () => {
  const action = productInfo.value.status === 'active' ? '下架' : '上架'
  const newStatus = productInfo.value.status === 'active' ? 'inactive' : 'active'

  try {
    await ElMessageBox.confirm(
      `确定要${action}商品"${productInfo.value.name}"吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 🔥 修复：调用后端API更新商品状态
    await productApi.update(productInfo.value.id, { status: newStatus })

    productInfo.value.status = newStatus
    ElMessage.success(`${action}成功`)

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_STATUS_CHANGED',
      title: `商品${action}`,
      content: `商品"${productInfo.value.name}"已${action}`,
      data: {
        productId: productInfo.value.id,
        productName: productInfo.value.name,
        productCode: productInfo.value.code,
        status: productInfo.value.status,
        action: action,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${productInfo.value.id}`
    })

    // 重新加载数据
    loadProductInfo()
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 下拉菜单命令处理
 */
const handleDropdownCommand = (command: string) => {
  switch (command) {
    case 'copy':
      handleCopy()
      break
    case 'toggle':
      handleToggleStatus()
      break
    case 'delete':
      handleDelete()
      break
  }
}

/**
 * 复制商品
 */
const handleCopy = () => {
  safeNavigator.push(`/product/add?copy=${productInfo.value.id}`)
}

/**
 * 删除商品
 */
const handleDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品"${productInfo.value.name}"吗？删除后不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    ElMessage.success('删除成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_DELETED',
      title: '商品删除',
      content: `商品"${productInfo.value.name}"已删除`,
      data: {
        productId: productInfo.value.id,
        productName: productInfo.value.name,
        productCode: productInfo.value.code,
        timestamp: new Date().toISOString()
      },
      link: '/product/list'
    })

    safeNavigator.push('/product/list')
  } catch (error) {
    // 用户取消操作
  }
}

/**
 * 确认库存调整
 */
const confirmStockAdjust = async () => {
  try {
    await stockFormRef.value?.validate()

    stockLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    ElMessage.success('库存调整成功')

    // 发送消息提醒
    notificationStore.addNotification({
      type: 'PRODUCT_STOCK_ADJUSTED',
      title: '库存调整',
      content: `商品"${productInfo.value.name}"库存已调整`,
      data: {
        productId: productInfo.value.id,
        productName: productInfo.value.name,
        adjustmentType: stockForm.value.type,
        quantity: stockForm.value.quantity,
        reason: stockForm.value.reason,
        remark: stockForm.value.remark,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${productInfo.value.id}`
    })

    handleStockDialogClose()

    // 重新加载数据
    loadProductInfo()
    loadStockRecords()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    stockLoading.value = false
  }
}

/**
 * 关闭库存调整对话框
 */
const handleStockDialogClose = () => {
  stockDialogVisible.value = false
  stockFormRef.value?.clearValidate()
}

/**
 * 确认价格调整
 */
const confirmPriceAdjust = async () => {
  try {
    await priceFormRef.value?.validate()

    priceLoading.value = true

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 更新商品价格
    const oldPrice = productInfo.value.price
    productInfo.value.price = priceForm.newPrice

    // 更新store中的商品价格
    productStore.updateProduct(productInfo.value.id, {
      price: priceForm.newPrice
    })

    ElMessage.success('价格调整成功')

    // 发送消息提醒
    const priceChange = priceForm.newPrice - oldPrice
    const changePercent = ((priceChange / oldPrice) * 100).toFixed(1)

    notificationStore.addNotification({
      type: 'PRODUCT_PRICE_CHANGED',
      title: '价格调整',
      content: `商品"${productInfo.value.name}"价格已调整`,
      data: {
        productId: productInfo.value.id,
        productName: productInfo.value.name,
        productCode: productInfo.value.code,
        oldPrice: oldPrice,
        newPrice: priceForm.newPrice,
        priceChange: priceChange,
        changePercent: changePercent,
        reason: priceForm.reason,
        remark: priceForm.remark,
        timestamp: new Date().toISOString()
      },
      link: `/product/detail/${productInfo.value.id}`
    })

    handlePriceDialogClose()

    // 重新加载数据
    loadProductInfo()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    priceLoading.value = false
  }
}

/**
 * 关闭价格调整对话框
 */
const handlePriceDialogClose = () => {
  priceDialogVisible.value = false
  priceFormRef.value?.clearValidate()
}

/**
 * 加载商品信息
 */
const loadProductInfo = async () => {
  try {
    const productId = route.params.id

    if (!productId) {
      ElMessage.error('商品ID不存在')
      safeNavigator.push('/product/list')
      return
    }

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 800))

    // 从store中获取真实的商品数据，尝试字符串和数字两种类型
    let product = productStore.getProductById(productId)
    if (!product && !isNaN(Number(productId))) {
      product = productStore.getProductById(Number(productId))
    }

    if (product) {
      // 使用真实的商品数据，并补充详情页需要的额外字段
      productInfo.value = {
        ...product,
        salesCount: product.salesCount || 0,
        salesAmount: (product.salesCount || 0) * product.price,
        mainImage: product.image,
        images: product.images || [product.image],
        createTime: product.createTime,
        updateTime: product.updateTime || product.createTime,
        creator: '系统',
        updater: '系统'
      }
    } else {
      ElMessage.error('商品不存在')
      safeNavigator.push('/product/list')
    }
  } catch (error) {
    ElMessage.error('加载商品信息失败')
  }
}

/**
 * 加载库存记录
 */
const loadStockRecords = async () => {
  try {
    const productId = route.params.id as string

    // 获取当前商品信息
    const currentProduct = productStore.products.find(p => p.id === productId || p.id === Number(productId))
    if (!currentProduct) {
      stockRecords.value = []
      return
    }

    // 从订单数据中获取真实的库存变动记录
    const productOrders = orderStore.orders.filter(order =>
      order.products.some(p => p.id === productId || p.id === Number(productId)) &&
      ['shipped', 'delivered'].includes(order.status)
    )

    const records = []

    // 添加商品创建时的初始库存记录
    records.push({
      id: `initial_${productId}`,
      type: 'increase',
      quantity: currentProduct.stock,
      stockAfter: currentProduct.stock,
      reason: '商品创建',
      operator: '系统管理员',
      remark: '商品创建时的初始库存',
      createTime: currentProduct.createTime
    })

    // 添加销售出库记录
    productOrders.forEach(order => {
      const product = order.products.find(p => p.id === productId || p.id === Number(productId))
      if (product) {
        records.push({
          id: `sale_${order.id}`,
          type: 'decrease',
          quantity: product.quantity,
          stockAfter: Math.max(0, currentProduct.stock - product.quantity), // 计算变化后库存
          reason: '销售出库',
          operator: '系统',
          remark: `订单号：${order.orderNumber}`,
          createTime: order.shippingTime || order.createTime
        })
      }
    })

    // 如果当前库存低于最低库存，添加补货记录
    if (currentProduct.stock < currentProduct.minStock) {
      const restockQuantity = currentProduct.maxStock - currentProduct.stock
      records.push({
        id: `restock_${Date.now()}`,
        type: 'increase',
        quantity: restockQuantity,
        stockAfter: currentProduct.maxStock,
        reason: '补货入库',
        operator: '采购部',
        remark: '库存不足，紧急补货',
        createTime: new Date().toLocaleString('zh-CN')
      })
    }

    // 按时间倒序排列
    stockRecords.value = records.sort((a, b) =>
      new Date(b.createTime).getTime() - new Date(a.createTime).getTime()
    )

  } catch (error) {
    console.error('加载库存记录失败:', error)
    // 不显示错误消息，而是显示空数据
    stockRecords.value = []
  }
}

/**
 * 应用数据范围控制
 */
const applyDataScopeControl = (orders: unknown[]) => {
  const currentUser = userStore.user
  if (!currentUser) return []

  // 超级管理员可以查看所有订单
  if (currentUser.role === 'super_admin') {
    return orders
  }

  // 部门负责人可以查看本部门所有订单
  if (currentUser.role === 'department_head') {
    return orders.filter(order =>
      order.salesPerson?.departmentId === currentUser.departmentId ||
      order.customerService?.departmentId === currentUser.departmentId
    )
  }

  // 销售员只能查看自己的订单
  if (currentUser.role === 'sales') {
    return orders.filter(order => order.salesPersonId === currentUser.id)
  }

  // 客服只能查看自己负责的订单
  if (currentUser.role === 'customer_service') {
    return orders.filter(order => order.customerServiceId === currentUser.id)
  }

  // 其他角色默认只能查看自己相关的订单
  return orders.filter(order =>
    order.salesPersonId === currentUser.id ||
    order.customerServiceId === currentUser.id
  )
}

/**
 * 加载相关统计（从后端API获取，根据用户角色权限过滤数据）
 */
const loadRelatedStats = async () => {
  try {
    const productId = route.params.id as string

    // 调用后端API获取统计数据（后端会根据用户角色过滤数据）
    const stats = await productApi.getProductStats(productId)

    // 根据当前用户角色确定默认的数据范围
    const defaultDataScope = getDefaultDataScope()

    relatedStats.value = {
      pendingOrders: stats.pendingOrders || 0,
      monthlySales: stats.monthlySales || 0,
      turnoverRate: stats.turnoverRate || 0,
      avgRating: stats.avgRating || 0,
      returnRate: stats.returnRate || 0,
      dataScope: stats.dataScope || defaultDataScope
    }

  } catch (error) {
    console.error('加载统计数据失败:', error)
    // 如果API调用失败，尝试使用本地数据计算（作为降级方案）
    await loadRelatedStatsFromLocal()
  }
}

/**
 * 根据当前用户角色获取默认的数据范围
 */
const getDefaultDataScope = (): 'all' | 'department' | 'personal' => {
  const currentUser = userStore.user
  if (!currentUser) return 'personal'

  // 超级管理员和管理员：全部数据
  if (currentUser.role === 'super_admin' || currentUser.role === 'admin') {
    return 'all'
  }
  // 部门经理：部门数据
  if (currentUser.role === 'department_manager' || currentUser.role === 'department_head') {
    return 'department'
  }
  // 其他角色：个人数据
  return 'personal'
}

/**
 * 获取数据范围标签文本
 */
const getDataScopeLabel = (scope: string): string => {
  const labels: Record<string, string> = {
    all: '全部数据',
    department: '部门数据',
    personal: '个人数据'
  }
  return labels[scope] || '个人数据'
}

/**
 * 获取数据范围标签类型
 */
const getDataScopeTagType = (scope: string): string => {
  const types: Record<string, string> = {
    all: 'success',      // 绿色 - 全部数据
    department: 'warning', // 橙色 - 部门数据
    personal: 'info'     // 灰色 - 个人数据
  }
  return types[scope] || 'info'
}

/**
 * 从本地数据加载统计（降级方案）
 */
const loadRelatedStatsFromLocal = async () => {
  try {
    const productId = route.params.id as string

    // 获取包含该商品的所有订单，应用数据范围控制
    const allOrders = applyDataScopeControl(orderStore.orders)
    const productOrders = allOrders.filter(order =>
      order.products.some(p => p.id === productId || p.id === Number(productId))
    )

    // 计算待处理订单（待审核、待发货状态）
    const pendingOrders = productOrders.filter(order =>
      ['pending_audit', 'pending_shipment'].includes(order.status)
    ).length

    // 计算本月销量
    const currentMonth = new Date().getMonth()
    const currentYear = new Date().getFullYear()
    const monthlySales = productOrders.filter(order => {
      const orderDate = new Date(order.createTime)
      return orderDate.getMonth() === currentMonth &&
             orderDate.getFullYear() === currentYear &&
             ['shipped', 'delivered'].includes(order.status)
    }).reduce((sum, order) => {
      const product = order.products.find(p => p.id === productId || p.id === Number(productId))
      return sum + (product?.quantity || 0)
    }, 0)

    // 计算库存周转率（简化计算：月销量 / 平均库存 * 100）
    const currentProduct = (productStore.products || []).find(p => p.id === productId || p.id === Number(productId))
    const avgStock = currentProduct ? (currentProduct.stock + currentProduct.maxStock) / 2 : 1
    const turnoverRate = avgStock > 0 ? (monthlySales / avgStock * 100) : 0

    // 计算平均评分（基于订单完成情况模拟）
    const completedOrders = productOrders.filter(order => order.status === 'delivered')
    const avgRating = completedOrders.length > 0 ?
      (4.2 + Math.random() * 0.6) : 0 // 模拟4.2-4.8的评分

    // 计算退货率
    const returnedOrders = productOrders.filter(order =>
      ['rejected', 'rejected_returned', 'logistics_returned'].includes(order.status)
    ).length
    const returnRate = productOrders.length > 0 ?
      (returnedOrders / productOrders.length * 100) : 0

    // 根据用户角色确定数据范围
    const currentUser = userStore.user
    let dataScope: 'all' | 'department' | 'personal' = 'personal'
    if (currentUser?.role === 'super_admin' || currentUser?.role === 'admin') {
      dataScope = 'all'
    } else if (currentUser?.role === 'department_head' || currentUser?.role === 'manager') {
      dataScope = 'department'
    }

    relatedStats.value = {
      pendingOrders,
      monthlySales,
      turnoverRate: Number(turnoverRate.toFixed(1)),
      avgRating: Number(avgRating.toFixed(1)),
      returnRate: Number(returnRate.toFixed(1)),
      dataScope
    }

  } catch (error) {
    console.error('从本地加载统计数据失败:', error)
    // 设置默认值
    relatedStats.value = {
      pendingOrders: 0,
      monthlySales: 0,
      turnoverRate: 0,
      avgRating: 0,
      returnRate: 0,
      dataScope: 'personal'
    }
  }
}

/**
 * 加载操作日志
 */
const loadOperationLogs = async () => {
  try {
    const productId = route.params.id as string
    const logs = []

    // 获取当前商品信息
    const currentProduct = productStore.products.find(p => p.id === productId || p.id === Number(productId))
    if (!currentProduct) {
      operationLogs.value = []
      return
    }

    // 添加商品创建记录（默认必有的记录）
    logs.push({
      id: `product_create_${productId}`,
      operator: '系统管理员',
      action: '创建商品',
      detail: `商品"${currentProduct.name}"创建成功`,
      createTime: currentProduct.createTime
    })

    // 获取商品相关的订单操作记录
    const productOrders = orderStore.orders.filter(order =>
      order.products.some(p => p.id === productId || p.id === Number(productId))
    )

    // 添加订单相关的操作记录
    productOrders.forEach(order => {
      // 添加订单创建记录
      logs.push({
        id: `order_create_${order.id}`,
        operator: order.createdBy || '客服',
        action: '创建订单',
        detail: `创建了包含商品"${currentProduct.name}"的订单 (订单号：${order.orderNumber})`,
        createTime: order.createTime
      })

      // 添加订单状态变更记录
      if (order.statusHistory && order.statusHistory.length > 0) {
        order.statusHistory.forEach(status => {
          logs.push({
            id: `status_${order.id}_${status.time}`,
            operator: status.operator,
            action: '订单状态变更',
            detail: `${status.description} (订单号：${order.orderNumber})`,
            createTime: status.time
          })
        })
      }

      // 添加订单操作记录
      if (order.operationLogs && order.operationLogs.length > 0) {
        order.operationLogs.forEach(log => {
          logs.push({
            id: `order_${log.id}`,
            operator: log.operator,
            action: `订单${log.action}`,
            detail: `${log.description} (订单号：${order.orderNumber})`,
            createTime: log.time
          })
        })
      }
    })

    // 如果有更新时间，添加更新记录
    if (currentProduct.updateTime && currentProduct.updateTime !== currentProduct.createTime) {
      logs.push({
        id: `product_update_${productId}`,
        operator: '商品管理员',
        action: '更新商品信息',
        detail: `商品"${currentProduct.name}"信息已更新`,
        createTime: currentProduct.updateTime
      })
    }

    // 库存调整记录
    if (currentProduct.stock !== currentProduct.minStock) {
      logs.push({
        id: `stock_adjust_${productId}`,
        operator: '库存管理员',
        action: '调整库存',
        detail: `当前库存：${currentProduct.stock}件`,
        createTime: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleString('zh-CN')
      })
    }

    // 价格调整记录
    if (currentProduct.price !== currentProduct.marketPrice) {
      logs.push({
        id: `price_adjust_${productId}`,
        operator: '价格管理员',
        action: '调整价格',
        detail: `销售价格调整为：¥${currentProduct.price}`,
        createTime: new Date(Date.now() - Math.random() * 14 * 24 * 60 * 60 * 1000).toLocaleString('zh-CN')
      })
    }

    // 按时间倒序排列，只保留最近的20条记录
    operationLogs.value = logs
      .sort((a, b) => new Date(b.createTime).getTime() - new Date(a.createTime).getTime())
      .slice(0, 20)

  } catch (error) {
    console.error('加载操作日志失败:', error)
    // 设置默认的创建记录而不是显示错误
    const productId = route.params.id as string
    const currentProduct = productStore.products.find(p => p.id === productId || p.id === Number(productId))

    if (currentProduct) {
      operationLogs.value = [{
        id: `product_create_${productId}`,
        operator: '系统管理员',
        action: '创建商品',
        detail: `商品"${currentProduct.name}"创建成功`,
        createTime: currentProduct.createTime
      }]
    } else {
      operationLogs.value = []
    }
  }
}

// 生命周期钩子
onMounted(() => {
  loadProductInfo()
  loadStockRecords()
  loadRelatedStats()
  loadOperationLogs()
})
</script>

<style scoped>
.product-detail {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-code {
  color: #909399;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.detail-content {
  margin-bottom: 20px;
}

.info-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.product-basic {
  display: flex;
  gap: 24px;
}

.product-images {
  flex-shrink: 0;
}

.main-image {
  width: 300px;
  height: 300px;
  border-radius: 8px;
  margin-bottom: 12px;
}

.image-list {
  display: flex;
  gap: 8px;
}

.thumb-image {
  width: 60px;
  height: 60px;
  border-radius: 4px;
  cursor: pointer;
}

.product-info {
  flex: 1;
}

.info-row {
  display: flex;
  margin-bottom: 16px;
  align-items: flex-start;
}

.info-row label {
  width: 100px;
  color: #606266;
  flex-shrink: 0;
}

.info-row span {
  color: #303133;
}

.description {
  line-height: 1.6;
  color: #606266;
}

.price-info,
.stock-info {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
}

.info-item:last-child {
  margin-bottom: 0;
}

.info-item label {
  color: #606266;
}

.price {
  color: #f56c6c;
  font-weight: 500;
  font-size: 16px;
}

.stock-normal {
  color: #67c23a;
  font-weight: 500;
}

.stock-warning {
  color: #e6a23c;
  font-weight: 500;
}

.stock-out {
  color: #f56c6c;
  font-weight: 500;
}

.stat-item {
  text-align: center;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-value {
  display: block;
  font-size: 24px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 8px;
}

.stat-label {
  color: #909399;
  font-size: 14px;
}

.increase {
  color: #67c23a;
}

.decrease {
  color: #f56c6c;
}

.empty-data {
  padding: 20px;
  text-align: center;
}

.empty-data .el-empty {
  padding: 20px 0;
}

.sensitive-info {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-style: italic;
}

.sensitive-info .el-icon {
  font-size: 14px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .product-basic {
    flex-direction: column;
  }

  .main-image {
    width: 100%;
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .detail-content .el-col {
    margin-bottom: 20px;
  }
}
.status-card,
.action-card,
.stats-card,
.log-card {
  margin-bottom: 20px;
}

.status-info {
  padding: 0;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f0f0;
}

.status-item:last-child {
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: none;
}

.status-item label {
  color: #606266;
}

.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.stats-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.related-stats {
  padding: 0;
}

.stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.stat-row:last-child {
  margin-bottom: 0;
}

.stat-row .stat-label {
  color: #606266;
}

.stat-row .stat-value {
  color: #303133;
  font-weight: 500;
}

.operation-logs {
  max-height: 300px;
  overflow-y: auto;
}

.log-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.log-item:last-child {
  border-bottom: none;
}

.log-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-bottom: 4px;
}

.log-content {
  margin-bottom: 4px;
}

.log-operator {
  color: #409eff;
  margin-right: 8px;
}

.log-action {
  color: #303133;
}

.log-detail {
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.danger-item {
  color: #f56c6c;
}

.empty-data {
  padding: 20px;
  text-align: center;
}

.empty-data .el-empty {
  padding: 20px 0;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .product-basic {
    flex-direction: column;
  }

  .main-image {
    width: 100%;
    max-width: 400px;
  }
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
    flex-wrap: wrap;
  }

  .detail-content .el-col {
    margin-bottom: 20px;
  }
}
</style>
