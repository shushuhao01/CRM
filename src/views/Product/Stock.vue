<template>
  <div class="stock-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">库存管理</h1>
        <p class="page-description">管理商品库存，支持库存调整、预警设置等功能</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleStockAdjustment">
          <el-icon><Edit /></el-icon>
          库存调整
        </el-button>
        <el-button type="warning" @click="handleBatchImport">
          <el-icon><Upload /></el-icon>
          批量导入
        </el-button>
        <el-button @click="handleExport">
          <el-icon><Download /></el-icon>
          导出数据
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="16">
        <!-- 库存总值 - 主要卡片 -->
        <el-col :span="8">
          <div class="stat-card primary-card">
            <div class="card-header">
              <div class="card-icon primary">
                <el-icon><Money /></el-icon>
              </div>
              <div class="card-title">库存总值</div>
            </div>
            <div class="card-content">
              <div class="primary-value" :title="`¥${stats.totalStockValue.toLocaleString()}`">
                ¥{{ formatLargeNumber(stats.totalStockValue) }}
              </div>
              <div class="card-description">当前库存商品总价值</div>
            </div>
          </div>
        </el-col>
        
        <!-- 其他统计卡片 -->
        <el-col :span="16">
          <el-row :gutter="16">
            <el-col :span="8">
              <div class="stat-card secondary-card">
                <div class="card-header">
                  <div class="card-icon total">
                    <el-icon><Box /></el-icon>
                  </div>
                  <div class="card-title">商品总数</div>
                </div>
                <div class="card-content">
                  <div class="secondary-value">{{ stats.totalProducts.toLocaleString() }}</div>
                  <div class="card-trend positive">
                    <el-icon><ArrowUp /></el-icon>
                    <span>+12</span>
                  </div>
                </div>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="stat-card secondary-card">
                <div class="card-header">
                  <div class="card-icon warning">
                    <el-icon><Warning /></el-icon>
                  </div>
                  <div class="card-title">库存预警</div>
                </div>
                <div class="card-content">
                  <div class="secondary-value warning-text">{{ stats.lowStockProducts }}</div>
                  <div class="card-trend" :class="stats.lowStockProducts > 0 ? 'negative' : 'neutral'">
                    <el-icon v-if="stats.lowStockProducts > 0"><Warning /></el-icon>
                    <el-icon v-else><Check /></el-icon>
                    <span>{{ stats.lowStockProducts > 0 ? '需关注' : '正常' }}</span>
                  </div>
                </div>
              </div>
            </el-col>
            
            <el-col :span="8">
              <div class="stat-card secondary-card">
                <div class="card-header">
                  <div class="card-icon danger">
                    <el-icon><CircleClose /></el-icon>
                  </div>
                  <div class="card-title">缺货商品</div>
                </div>
                <div class="card-content">
                  <div class="secondary-value danger-text">{{ stats.outOfStockProducts }}</div>
                  <div class="card-trend" :class="stats.outOfStockProducts > 0 ? 'negative' : 'positive'">
                    <el-icon v-if="stats.outOfStockProducts > 0"><CircleClose /></el-icon>
                    <el-icon v-else><Check /></el-icon>
                    <span>{{ stats.outOfStockProducts > 0 ? '需补货' : '充足' }}</span>
                  </div>
                </div>
              </div>
            </el-col>
          </el-row>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索筛选区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="商品名称">
          <el-input
            v-model="searchForm.productName"
            placeholder="请输入商品名称"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="商品编码">
          <el-input
            v-model="searchForm.productCode"
            placeholder="请输入商品编码"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="商品分类">
          <el-select v-model="searchForm.categoryId" placeholder="请选择分类" clearable>
            <el-option 
              v-for="category in productStore.categories" 
              :key="category.id" 
              :label="category.name" 
              :value="category.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="库存状态">
          <el-select v-model="searchForm.stockStatus" placeholder="请选择库存状态" clearable>
            <el-option label="正常" value="normal" />
            <el-option label="预警" value="warning" />
            <el-option label="缺货" value="out_of_stock" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 库存列表 -->
    <div class="table-section">
      <el-table
        :data="stockList"
        v-loading="loading"
        stripe
        border
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="productCode" label="商品编码" width="120" />
        <el-table-column prop="productName" label="商品名称" min-width="200">
          <template #default="{ row }">
            <div class="product-info">
              <img :src="row.image" :alt="row.productName" class="product-image" />
              <span>{{ row.productName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120" />
        <el-table-column prop="currentStock" label="当前库存" width="100" align="center">
          <template #default="{ row }">
            <span :class="getStockStatusClass(row)">{{ row.currentStock }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="minStock" label="最低库存" width="100" align="center" />
        <el-table-column prop="maxStock" label="最高库存" width="100" align="center" />
        <el-table-column prop="unit" label="单位" width="80" align="center" />
        <el-table-column prop="costPrice" label="成本价" width="100" align="center">
          <template #default="{ row }">
            ¥{{ row.costPrice.toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="stockValue" label="库存价值" width="120" align="center">
          <template #default="{ row }">
            ¥{{ (row.currentStock * row.costPrice).toFixed(2) }}
          </template>
        </el-table-column>
        <el-table-column prop="stockStatus" label="库存状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStockStatusType(row)" size="small">
              {{ getStockStatusText(row) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastUpdateTime" label="最后更新" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleAdjustStock(row)">
              调整库存
            </el-button>
            <el-button type="warning" size="small" link @click="handleSetWarning(row)">
              设置预警
            </el-button>
            <el-button type="info" size="small" link @click="handleViewHistory(row)">
              变动记录
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-section">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 库存调整对话框 -->
    <el-dialog
      v-model="adjustDialogVisible"
      title="库存调整"
      width="600px"
      @close="handleAdjustDialogClose"
    >
      <el-form
        ref="adjustFormRef"
        :model="adjustForm"
        :rules="adjustFormRules"
        label-width="100px"
      >
        <el-form-item label="商品信息">
          <div class="product-display">
            <img :src="adjustForm.image" :alt="adjustForm.productName" class="product-image" />
            <div>
              <div>{{ adjustForm.productName }}</div>
              <div class="product-code">编码：{{ adjustForm.productCode }}</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前库存">
          <span class="current-stock">{{ adjustForm.currentStock }} {{ adjustForm.unit }}</span>
        </el-form-item>
        <el-form-item label="调整类型" prop="adjustType">
          <el-radio-group v-model="adjustForm.adjustType">
            <el-radio label="increase">增加</el-radio>
            <el-radio label="decrease">减少</el-radio>
            <el-radio label="set">设置为</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="调整数量" prop="adjustQuantity">
          <el-input-number
            v-model="adjustForm.adjustQuantity"
            :min="adjustForm.adjustType === 'decrease' ? 1 : 0"
            :max="adjustForm.adjustType === 'decrease' ? adjustForm.currentStock : 99999"
            controls-position="right"
            style="width: 200px"
          />
          <span class="unit-text">{{ adjustForm.unit }}</span>
        </el-form-item>
        <el-form-item label="调整后库存">
          <span class="result-stock">{{ getAdjustedStock() }} {{ adjustForm.unit }}</span>
        </el-form-item>
        <el-form-item label="调整原因" prop="reason">
          <el-select v-model="adjustForm.reason" placeholder="请选择调整原因" style="width: 100%">
            <el-option label="盘点调整" value="inventory" />
            <el-option label="损耗调整" value="loss" />
            <el-option label="退货入库" value="return" />
            <el-option label="采购入库" value="purchase" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input
            v-model="adjustForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入调整备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="adjustDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitAdjust" :loading="submitLoading">
            确定调整
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 预警设置对话框 -->
    <el-dialog
      v-model="warningDialogVisible"
      title="库存预警设置"
      width="500px"
      @close="handleWarningDialogClose"
    >
      <el-form
        ref="warningFormRef"
        :model="warningForm"
        :rules="warningFormRules"
        label-width="100px"
      >
        <el-form-item label="商品名称">
          <span>{{ warningForm.productName }}</span>
        </el-form-item>
        <el-form-item label="当前库存">
          <span>{{ warningForm.currentStock }} {{ warningForm.unit }}</span>
        </el-form-item>
        <el-form-item label="最低库存" prop="minStock">
          <el-input-number
            v-model="warningForm.minStock"
            :min="0"
            :max="warningForm.maxStock || 99999"
            controls-position="right"
            style="width: 200px"
          />
          <span class="unit-text">{{ warningForm.unit }}</span>
        </el-form-item>
        <el-form-item label="最高库存" prop="maxStock">
          <el-input-number
            v-model="warningForm.maxStock"
            :min="warningForm.minStock || 0"
            :max="99999"
            controls-position="right"
            style="width: 200px"
          />
          <span class="unit-text">{{ warningForm.unit }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="warningDialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSubmitWarning" :loading="submitLoading">
            保存设置
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 变动记录弹窗 -->
    <el-dialog
      v-model="historyDialogVisible"
      :title="`${currentProductHistory.productName} - 库存变动记录`"
      width="900px"
      top="5vh"
    >
      <div class="history-header">
        <div class="product-info">
          <img :src="currentProductHistory.image" :alt="currentProductHistory.productName" class="product-image-small" />
          <div class="product-details">
            <div class="product-name">{{ currentProductHistory.productName }}</div>
            <div class="product-code">商品编码：{{ currentProductHistory.productCode }}</div>
            <div class="current-stock">当前库存：{{ currentProductHistory.currentStock }} {{ currentProductHistory.unit }}</div>
          </div>
        </div>
      </div>
      
      <el-table
        v-loading="historyLoading"
        :data="historyList"
        style="width: 100%"
        max-height="400"
      >
        <el-table-column prop="date" label="变动时间" width="160" />
        <el-table-column prop="typeName" label="变动类型" width="80" align="center">
          <template #default="{ row }">
            <el-tag
              :type="row.type === 'increase' ? 'success' : row.type === 'decrease' ? 'danger' : 'warning'"
              size="small"
            >
              {{ row.typeName }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="库存变化" width="120" align="center">
          <template #default="{ row }">
            <span :class="{
              'increase-text': row.type === 'increase',
              'decrease-text': row.type === 'decrease',
              'set-text': row.type === 'set'
            }">
              {{ row.type === 'increase' ? '+' : row.type === 'decrease' ? '-' : '' }}{{ row.quantity }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="库存变化详情" width="150" align="center">
          <template #default="{ row }">
            <div class="stock-change">
              <span class="before-stock">{{ row.beforeStock }}</span>
              <el-icon class="arrow-icon"><ArrowRight /></el-icon>
              <span class="after-stock">{{ row.afterStock }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="reason" label="变动原因" width="100" />
        <el-table-column prop="operator" label="操作人" width="80" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="historyDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useProductStore } from '@/stores/product'
import { productApi } from '@/api/product'

// 接口定义
interface StockItem {
  id: string
  productCode: string
  productName: string
  category: string
  image: string
  currentStock: number
  minStock: number
  maxStock: number
  unit: string
  costPrice: number
  lastUpdateTime: string
}

interface StockAdjustment {
  id: string
  productId: string
  productCode: string
  productName: string
  type: 'increase' | 'decrease' | 'set'
  typeName: string
  quantity: number
  beforeStock: number
  afterStock: number
  reason: string
  remark?: string
  operator: string
  date: string
  createTime: string
}

interface StockStatistics {
  totalProducts: number
  totalStock: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
}

// 使用产品store
const productStore = useProductStore()

// 响应式数据
const loading = ref(false)
const stockList = ref<StockItem[]>([])
const stockStatistics = ref<StockStatistics>({
  totalProducts: 0,
  totalStock: 0,
  totalValue: 0,
  lowStockCount: 0,
  outOfStockCount: 0
})

// 搜索表单
const searchForm = reactive({
  productName: '',
  productCode: '',
  categoryId: '',
  stockStatus: '',
  keyword: '',
  status: '',
  brand: '',
  lowStock: false
})

// 分页数据
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 库存调整表单
const adjustForm = reactive({
  id: null,
  productCode: '',
  productName: '',
  image: '',
  currentStock: 0,
  unit: '',
  adjustType: 'increase',
  adjustQuantity: 0,
  reason: '',
  remark: '',
  productId: ''
})

// 预警设置表单
const warningForm = reactive({
  id: null,
  productName: '',
  currentStock: 0,
  unit: '',
  minStock: 0,
  maxStock: 0,
  productId: ''
})

// 表单验证规则
const adjustFormRules = {
  adjustType: [
    { required: true, message: '请选择调整类型', trigger: 'change' }
  ],
  adjustQuantity: [
    { required: true, message: '请输入调整数量', trigger: 'blur' }
  ],
  reason: [
    { required: true, message: '请选择调整原因', trigger: 'change' }
  ]
}

const warningFormRules = {
  minStock: [
    { required: true, message: '请输入最低库存', trigger: 'blur' }
  ],
  maxStock: [
    { required: true, message: '请输入最高库存', trigger: 'blur' }
  ]
}

// 对话框显示状态
const adjustDialogVisible = ref(false)
const warningDialogVisible = ref(false)
const historyDialogVisible = ref(false)
const submitLoading = ref(false)
const adjustFormRef = ref()
const warningFormRef = ref()
const selectedRows = ref([])
const currentProductHistory = ref({})
const historyLoading = ref(false)

// 库存历史记录
const historyList = ref<StockAdjustment[]>([])
const historyPagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 统计数据 - 从API获取
const stats = computed(() => {
  return {
    totalProducts: stockStatistics.value.totalProducts,
    lowStockProducts: stockStatistics.value.lowStockCount,
    outOfStockProducts: stockStatistics.value.outOfStockCount,
    totalStockValue: stockStatistics.value.totalValue
  }
})

// 数据加载方法
const loadData = async () => {
  try {
    loading.value = true
    
    // 获取产品列表
    const params = {
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || searchForm.productName || undefined,
      categoryId: searchForm.categoryId || undefined,
      status: searchForm.status || undefined,
      brand: searchForm.brand || undefined,
      lowStock: searchForm.lowStock || undefined
    }
    
    const response = await productApi.getList(params)
    
    // 转换数据格式以匹配界面需求
    stockList.value = response.data.list.map((item: any) => ({
      id: item.id,
      productCode: item.code,
      productName: item.name,
      category: item.categoryName,
      image: item.image,
      currentStock: item.stock,
      minStock: item.minStock,
      maxStock: item.maxStock,
      unit: item.unit,
      costPrice: item.price,
      lastUpdateTime: item.updateTime || item.createTime
    }))
    
    pagination.total = response.data.total
    
    // 获取库存统计
    const statsResponse = await productApi.getStockStatistics()
    stockStatistics.value = statsResponse.data
    
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    productName: '',
    productCode: '',
    categoryId: '',
    stockStatus: '',
    keyword: '',
    status: '',
    brand: '',
    lowStock: false
  })
  pagination.page = 1
  loadData()
}

const handleAdjustStock = (row: any) => {
  Object.assign(adjustForm, {
    id: row.id,
    productId: row.id,
    productCode: row.productCode,
    productName: row.productName,
    image: row.image,
    currentStock: row.currentStock,
    unit: row.unit,
    adjustType: 'increase',
    adjustQuantity: 0,
    reason: '',
    remark: ''
  })
  adjustDialogVisible.value = true
}

const handleSetWarning = (row: any) => {
  Object.assign(warningForm, {
    id: row.id,
    productId: row.id,
    productName: row.productName,
    currentStock: row.currentStock,
    unit: row.unit,
    minStock: row.minStock,
    maxStock: row.maxStock
  })
  warningDialogVisible.value = true
}

const handleViewHistory = async (row: any) => {
  try {
    currentProductHistory.value = row
    historyDialogVisible.value = true
    historyLoading.value = true
    
    const response = await productApi.getStockAdjustments({
      productId: row.id,
      page: historyPagination.page,
      pageSize: historyPagination.pageSize
    })
    
    // 转换历史数据格式
    historyList.value = response.data.list.map((item: any) => ({
      ...item,
      date: item.createTime,
      typeName: item.type === 'increase' ? '增加' : item.type === 'decrease' ? '减少' : '设置'
    }))
    
    historyPagination.total = response.data.total
  } catch (error) {
    console.error('获取库存历史失败:', error)
    ElMessage.error('获取库存历史失败')
    // 使用模拟数据作为后备
    historyList.value = [
      {
        id: '1',
        date: '2024-01-15 14:30:25',
        type: 'increase',
        typeName: '增加',
        quantity: 50,
        beforeStock: 100,
        afterStock: 150,
        reason: '采购入库',
        operator: '张三',
        remark: '新到货50件商品'
      }
    ]
  } finally {
    historyLoading.value = false
  }
}

// 批量导入功能
const handleBatchImport = () => {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.xlsx,.xls,.csv'
  input.onchange = async (e) => {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    
    try {
      loading.value = true
      const formData = new FormData()
      formData.append('file', file)
      
      await productApi.batchImport(formData)
      ElMessage.success('批量导入成功')
      loadData() // 重新加载数据
    } catch (error) {
      console.error('批量导入失败:', error)
      ElMessage.error('批量导入失败')
    } finally {
      loading.value = false
    }
  }
  input.click()
}

// 导出功能
const handleExport = async () => {
  try {
    loading.value = true
    const params = {
      categoryId: searchForm.categoryId || undefined,
      status: searchForm.status || undefined,
      keyword: searchForm.keyword || undefined,
      format: 'xlsx'
    }
    
    const response = await productApi.exportProducts(params)
    
    // 创建下载链接
    const blob = new Blob([response], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `库存数据_${new Date().toISOString().slice(0, 10)}.xlsx`
    link.click()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    loading.value = false
  }
}

// 分页处理
const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  pagination.page = 1
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

// 辅助方法
const getStockStatusClass = (row: any) => {
  if (row.currentStock <= 0) return 'stock-out'
  if (row.currentStock <= row.minStock) return 'stock-warning'
  return 'stock-normal'
}

const getStockStatusType = (row: any) => {
  if (row.currentStock <= 0) return 'danger'
  if (row.currentStock <= row.minStock) return 'warning'
  return 'success'
}

const getStockStatusText = (row: any) => {
  if (row.currentStock <= 0) return '缺货'
  if (row.currentStock <= row.minStock) return '预警'
  return '正常'
}

const formatLargeNumber = (num: number) => {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(1) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万'
  }
  return num.toLocaleString()
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

const handleStockAdjustment = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要调整的商品')
    return
  }
  // 批量调整逻辑
  ElMessage.info('批量调整功能开发中')
}

const handleSubmitAdjust = async () => {
  if (!adjustFormRef.value) return
  
  try {
    await adjustFormRef.value.validate()
    submitLoading.value = true
    
    await productApi.adjustStock({
      productId: adjustForm.productId,
      type: adjustForm.adjustType,
      quantity: adjustForm.adjustQuantity,
      reason: adjustForm.reason,
      remark: adjustForm.remark
    })
    
    ElMessage.success('库存调整成功')
    adjustDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('库存调整失败:', error)
    ElMessage.error('库存调整失败')
  } finally {
    submitLoading.value = false
  }
}

const handleSubmitWarning = async () => {
  if (!warningFormRef.value) return
  
  try {
    await warningFormRef.value.validate()
    submitLoading.value = true
    
    // 调用更新产品API设置预警值
    await productApi.update(warningForm.productId, {
      minStock: warningForm.minStock,
      maxStock: warningForm.maxStock
    })
    
    ElMessage.success('预警设置成功')
    warningDialogVisible.value = false
    loadData()
  } catch (error) {
    console.error('预警设置失败:', error)
    ElMessage.error('预警设置失败')
  } finally {
    submitLoading.value = false
  }
}

const handleAdjustDialogClose = () => {
  adjustDialogVisible.value = false
  Object.assign(adjustForm, {
    id: null,
    productCode: '',
    productName: '',
    image: '',
    currentStock: 0,
    unit: '',
    adjustType: 'increase',
    adjustQuantity: 0,
    reason: '',
    remark: '',
    productId: ''
  })
}

const handleWarningDialogClose = () => {
  warningDialogVisible.value = false
  Object.assign(warningForm, {
    id: null,
    productName: '',
    currentStock: 0,
    unit: '',
    minStock: 0,
    maxStock: 0,
    productId: ''
  })
}

const getAdjustedStock = () => {
  const { adjustType, adjustQuantity, currentStock } = adjustForm
  if (adjustType === 'increase') {
    return currentStock + (adjustQuantity || 0)
  } else if (adjustType === 'decrease') {
    return Math.max(0, currentStock - (adjustQuantity || 0))
  } else if (adjustType === 'set') {
    return adjustQuantity || 0
  }
  return currentStock
}

// 生命周期
onMounted(() => {
  loadData()
  productStore.loadCategories()
})

// 监听搜索条件变化
watch(() => searchForm.lowStock, () => {
  if (searchForm.lowStock) {
    handleSearch()
  }
})
</script>

<style scoped>
.stock-container {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.page-description {
  color: #909399;
  margin: 0;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-section {
  margin-bottom: 20px;
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  height: 120px;
}

.primary-card {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.secondary-card {
  border: 1px solid #e4e7ed;
}

.card-header {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.card-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
  font-size: 20px;
}

.card-icon.primary {
  background: rgba(255, 255, 255, 0.2);
}

.card-icon.total {
  background: #e3f2fd;
  color: #1976d2;
}

.card-icon.warning {
  background: #fff3e0;
  color: #f57c00;
}

.card-icon.danger {
  background: #ffebee;
  color: #d32f2f;
}

.card-title {
  font-size: 14px;
  font-weight: 500;
  opacity: 0.9;
}

.primary-value {
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 4px;
}

.secondary-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.warning-text {
  color: #f57c00;
}

.danger-text {
  color: #d32f2f;
}

.card-description {
  font-size: 12px;
  opacity: 0.8;
}

.card-trend {
  display: flex;
  align-items: center;
  font-size: 12px;
  gap: 4px;
}

.card-trend.positive {
  color: #4caf50;
}

.card-trend.negative {
  color: #f44336;
}

.card-trend.neutral {
  color: #9e9e9e;
}

.search-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.table-section {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.product-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-image {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.product-image-small {
  width: 60px;
  height: 60px;
  border-radius: 6px;
  object-fit: cover;
}

.stock-out {
  color: #f56c6c;
  font-weight: 600;
}

.stock-warning {
  color: #e6a23c;
  font-weight: 600;
}

.stock-normal {
  color: #67c23a;
  font-weight: 600;
}

.pagination-section {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.product-display {
  display: flex;
  align-items: center;
  gap: 12px;
}

.product-code {
  color: #909399;
  font-size: 12px;
  margin-top: 4px;
}

.current-stock {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.result-stock {
  font-size: 16px;
  font-weight: 600;
  color: #409eff;
}

.unit-text {
  margin-left: 8px;
  color: #909399;
}

.history-header {
  margin-bottom: 20px;
  padding: 16px;
  background: #f5f7fa;
  border-radius: 6px;
}

.product-details {
  margin-left: 12px;
}

.product-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stock-change {
  display: flex;
  align-items: center;
  gap: 8px;
}

.before-stock {
  color: #909399;
}

.after-stock {
  color: #303133;
  font-weight: 600;
}

.arrow-icon {
  color: #c0c4cc;
}

.increase-text {
  color: #67c23a;
  font-weight: 600;
}

.decrease-text {
  color: #f56c6c;
  font-weight: 600;
}

.set-text {
  color: #e6a23c;
  font-weight: 600;
}
</style>