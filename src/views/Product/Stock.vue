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
    <div class="metrics-grid">
      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%)">
            <el-icon :size="24"><Money /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">¥{{ formatStockValue(stats.totalStockValue) }}</div>
            <div class="metric-label">库存总值</div>
            <div class="metric-change stable">
              <el-icon :size="12"><Minus /></el-icon>
              <span>当前库存商品总价值</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon" style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%)">
            <el-icon :size="24"><Box /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ stats.totalProducts }}</div>
            <div class="metric-label">商品总数</div>
            <div class="metric-change up">
              <el-icon :size="12"><ArrowUp /></el-icon>
              <span>较上月增长</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon" style="background: linear-gradient(135deg, #fad0c4 0%, #ffd1ff 100%)">
            <el-icon :size="24"><Warning /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ stats.lowStockProducts }}</div>
            <div class="metric-label">库存预警</div>
            <div class="metric-change" :class="stats.lowStockProducts > 0 ? 'down' : 'stable'">
              <el-icon :size="12" v-if="stats.lowStockProducts > 0"><Warning /></el-icon>
              <el-icon :size="12" v-else><Check /></el-icon>
              <span>{{ stats.lowStockProducts > 0 ? '需关注' : '正常' }}</span>
            </div>
          </div>
        </div>
      </el-card>

      <el-card class="metric-card">
        <div class="metric-content">
          <div class="metric-icon" style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%)">
            <el-icon :size="24"><CircleClose /></el-icon>
          </div>
          <div class="metric-info">
            <div class="metric-value">{{ stats.outOfStockProducts }}</div>
            <div class="metric-label">缺货商品</div>
            <div class="metric-change" :class="stats.outOfStockProducts > 0 ? 'down' : 'up'">
              <el-icon :size="12" v-if="stats.outOfStockProducts > 0"><CircleClose /></el-icon>
              <el-icon :size="12" v-else><Check /></el-icon>
              <span>{{ stats.outOfStockProducts > 0 ? '需补货' : '充足' }}</span>
            </div>
          </div>
        </div>
      </el-card>
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
        <el-table-column prop="salePrice" label="销售价" width="100" align="center">
          <template #default="{ row }">
            ¥{{ row.salePrice.toFixed(2) }}
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
        <el-table-column label="变动原因" width="100">
          <template #default="{ row }">
            {{ getReasonText(row.reason) }}
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="80" />
        <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
      </el-table>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="historyDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 批量导入对话框 -->
    <el-dialog
      v-model="batchImportDialogVisible"
      title="批量导入商品"
      width="80%"
      top="5vh"
      :before-close="handleBatchImportDialogClose"
    >
      <el-tabs v-model="importActiveTab">
        <!-- 在线快速添加 -->
        <el-tab-pane label="在线快速添加" name="quick">
          <div class="quick-add-section">
            <el-button type="primary" @click="addQuickProduct" :icon="Plus" size="small" style="margin-bottom: 16px">
              新增一行
            </el-button>

            <el-table :data="quickAddProducts" border style="width: 100%">
              <el-table-column type="index" label="序号" width="60" />
              <el-table-column label="商品图片" width="100">
                <template #default="{ row, $index }">
                  <el-upload
                    class="avatar-uploader"
                    :show-file-list="false"
                    :before-upload="(file) => handleImageUpload(file, $index)"
                    accept="image/*"
                  >
                    <img v-if="row.image" :src="row.image" class="avatar" />
                    <el-icon v-else class="avatar-uploader-icon"><Plus /></el-icon>
                  </el-upload>
                </template>
              </el-table-column>
              <el-table-column label="商品名称" min-width="180">
                <template #default="{ row }">
                  <el-input v-model="row.name" placeholder="请输入" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="商品编码" min-width="140">
                <template #default="{ row }">
                  <el-input v-model="row.code" placeholder="自动生成" size="small" />
                </template>
              </el-table-column>
              <el-table-column label="分类" min-width="140">
                <template #default="{ row }">
                  <el-select v-model="row.categoryId" placeholder="请选择" size="small" style="width: 100%">
                    <el-option
                      v-for="cat in productStore.categories"
                      :key="cat.id"
                      :label="cat.name"
                      :value="cat.id"
                    />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="单位" min-width="120">
                <template #default="{ row }">
                  <el-select v-model="row.unit" placeholder="请选择" size="small" allow-create filterable style="width: 100%">
                    <el-option label="件" value="件" />
                    <el-option label="盒" value="盒" />
                    <el-option label="瓶" value="瓶" />
                    <el-option label="袋" value="袋" />
                    <el-option label="箱" value="箱" />
                    <el-option label="个" value="个" />
                    <el-option label="套" value="套" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="销售价" min-width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.price" :min="0" :precision="2" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="成本价" min-width="120">
                <template #default="{ row }">
                  <el-input-number v-model="row.costPrice" :min="0" :precision="2" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="库存" min-width="100">
                <template #default="{ row }">
                  <el-input-number v-model="row.stock" :min="0" size="small" style="width: 100%" controls-position="right" />
                </template>
              </el-table-column>
              <el-table-column label="状态" min-width="110">
                <template #default="{ row }">
                  <el-select v-model="row.status" size="small" style="width: 100%">
                    <el-option label="上架" value="active" />
                    <el-option label="下架" value="inactive" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="操作" width="80" fixed="right">
                <template #default="{ $index }">
                  <el-button type="danger" link size="small" @click="removeQuickProduct($index)">
                    删除
                  </el-button>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </el-tab-pane>

        <!-- 表格导入 -->
        <el-tab-pane label="表格导入" name="excel">
          <div class="excel-import-section">
            <el-alert
              title="导入说明"
              type="info"
              :closable="false"
              style="margin-bottom: 16px"
            >
              <p>1. 请先下载模板文件，按照模板格式填写商品信息</p>
              <p>2. 支持.xlsx格式的Excel文件</p>
              <p>3. 必填字段：商品名称、销售价、库存</p>
            </el-alert>

            <div class="import-actions">
              <el-button type="success" @click="downloadTemplate" :icon="Download">
                下载模板
              </el-button>
              <el-upload
                ref="uploadRef"
                :auto-upload="false"
                :on-change="handleFileChange"
                :show-file-list="false"
                accept=".xlsx"
              >
                <el-button type="primary" :icon="Upload">
                  选择文件
                </el-button>
              </el-upload>
            </div>

            <div v-if="excelFileName" class="file-info">
              <el-tag type="success">{{ excelFileName }}</el-tag>
              <el-button type="text" @click="clearExcelFile">清除</el-button>
            </div>

            <div v-if="excelPreviewData.length > 0" class="preview-section">
              <h4>数据预览（前10条）</h4>
              <el-table :data="excelPreviewData.slice(0, 10)" border style="width: 100%">
                <el-table-column prop="name" label="商品名称" />
                <el-table-column prop="code" label="商品编码" />
                <el-table-column prop="categoryName" label="分类" />
                <el-table-column prop="unit" label="单位" />
                <el-table-column prop="price" label="销售价" />
                <el-table-column prop="costPrice" label="成本价" />
                <el-table-column prop="stock" label="库存" />
                <el-table-column prop="status" label="状态" />
              </el-table>
              <p style="margin-top: 8px; color: #909399;">共 {{ excelPreviewData.length }} 条数据</p>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleBatchImportDialogClose">取消</el-button>
          <el-button type="primary" @click="handleBatchImportSubmit" :loading="batchImportLoading">
            确定导入
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Edit,
  Upload,
  Download,
  Money,
  Box,
  Warning,
  CircleClose,
  Check,
  ArrowUp,
  ArrowRight,
  Minus,
  Plus
} from '@element-plus/icons-vue'
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
const batchImportDialogVisible = ref(false)
const submitLoading = ref(false)
const batchImportLoading = ref(false)

// 批量导入相关
const importActiveTab = ref('quick')
const quickAddProducts = ref<any[]>([])
const excelFileName = ref('')
const excelPreviewData = ref<any[]>([])
const uploadRef = ref()
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
    totalProducts: stockStatistics.value.totalProducts || 0,
    lowStockProducts: stockStatistics.value.lowStockCount || 0,
    outOfStockProducts: stockStatistics.value.outOfStockCount || 0,
    totalStockValue: stockStatistics.value.totalValue || 0
  }
})

// 数据加载方法
const loadData = async () => {
  try {
    loading.value = true

    // 从productStore获取商品数据
    let products = productStore.products || []

    // 应用筛选条件
    if (searchForm.keyword || searchForm.productName) {
      const keyword = (searchForm.keyword || searchForm.productName || '').toLowerCase()
      products = products.filter(p =>
        p.name.toLowerCase().includes(keyword) ||
        p.code.toLowerCase().includes(keyword)
      )
    }

    if (searchForm.categoryId) {
      products = products.filter(p => p.categoryId === searchForm.categoryId)
    }

    if (searchForm.status) {
      products = products.filter(p => p.status === searchForm.status)
    }

    if (searchForm.brand) {
      products = products.filter(p => p.brand === searchForm.brand)
    }

    // 库存状态筛选
    if (searchForm.stockStatus) {
      if (searchForm.stockStatus === 'normal') {
        products = products.filter(p => {
          const stock = p.stock || 0
          const minStock = p.minStock || 10
          return stock > minStock
        })
      } else if (searchForm.stockStatus === 'warning') {
        products = products.filter(p => {
          const stock = p.stock || 0
          const minStock = p.minStock || 10
          return stock > 0 && stock <= minStock
        })
      } else if (searchForm.stockStatus === 'out_of_stock') {
        products = products.filter(p => (p.stock || 0) === 0)
      }
    }

    if (searchForm.lowStock) {
      products = products.filter(p => p.stock <= (p.minStock || 10))
    }

    // 转换数据格式以匹配界面需求
    const allStockData = products.map((item: any) => ({
      id: item.id,
      productCode: item.code,
      productName: item.name,
      category: item.categoryName || item.category,
      image: item.image,
      currentStock: item.stock,
      minStock: item.minStock || 10,
      maxStock: item.maxStock || 9999,
      unit: item.unit || '件',
      costPrice: item.costPrice || item.price * 0.7,  // 成本价，如果没有则按销售价的70%估算
      salePrice: item.price,  // 销售价
      lastUpdateTime: item.updateTime || item.createTime
    }))

    // 分页处理
    pagination.total = allStockData.length
    const startIndex = (pagination.page - 1) * pagination.pageSize
    const endIndex = startIndex + pagination.pageSize
    stockList.value = allStockData.slice(startIndex, endIndex)

    // 计算库存统计 - 使用真实数据动态计算
    const totalStockValue = products.reduce((sum, p) => sum + ((p.stock || 0) * (p.price || 0)), 0)
    const lowStockProducts = products.filter(p => {
      const stock = p.stock || 0
      const minStock = p.minStock || 10
      return stock > 0 && stock <= minStock
    }).length
    const outOfStockProducts = products.filter(p => (p.stock || 0) === 0).length

    stockStatistics.value = {
      totalProducts: products.length,
      totalValue: totalStockValue,
      lowStockCount: lowStockProducts,
      outOfStockCount: outOfStockProducts,
      totalStock: products.reduce((sum, p) => sum + (p.stock || 0), 0)
    }

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

    // 从localStorage读取真实的库存变动记录
    const historyKey = `stock_history_${row.id}`
    const storedHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')

    if (storedHistory.length > 0) {
      historyList.value = storedHistory
      historyPagination.total = storedHistory.length
    } else {
      // 如果没有记录，显示空状态
      historyList.value = []
      historyPagination.total = 0
    }
  } catch (error) {
    console.error('获取库存历史失败:', error)
    ElMessage.error('获取库存历史失败')
    historyList.value = []
  } finally {
    historyLoading.value = false
  }
}

// 批量导入功能
const handleBatchImport = () => {
  // 打开批量导入对话框
  batchImportDialogVisible.value = true
  importActiveTab.value = 'quick'

  // 初始化一行数据
  if (quickAddProducts.value.length === 0) {
    addQuickProduct()
  }
}

// 添加快速添加商品行
const addQuickProduct = () => {
  quickAddProducts.value.push({
    image: '',
    name: '',
    code: `P${Date.now()}`,
    categoryId: '',
    unit: '件',
    price: 0,
    costPrice: 0,
    stock: 0,
    status: 'active'
  })
}

// 删除快速添加商品行
const removeQuickProduct = (index: number) => {
  quickAddProducts.value.splice(index, 1)
}

// 处理图片上传 - 上传到服务器
const handleImageUpload = async (file: File, index: number) => {
  try {
    const { uploadImage } = await import('@/services/uploadService')
    const result = await uploadImage(file, 'product')

    if (result.success && result.url) {
      quickAddProducts.value[index].image = result.url
      ElMessage.success('图片上传成功')
    } else {
      ElMessage.error(result.message || '图片上传失败')
    }
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败，请重试')
  }
  return false // 阻止自动上传
}

// 下载模板
const downloadTemplate = () => {
  // 创建工作簿
  const headers = ['商品名称*', '商品编码', '分类', '单位', '销售价*', '成本价', '库存*', '状态']
  const sampleData = [
    ['示例商品1', 'P001', '体重管理', '件', '100', '70', '50', '上架'],
    ['示例商品2', 'P002', '体重管理', '盒', '200', '140', '30', '上架']
  ]

  // 使用xlsx库创建真正的Excel文件
  import('xlsx').then(XLSX => {
    const wb = XLSX.utils.book_new()
    const wsData = [headers, ...sampleData]
    const ws = XLSX.utils.aoa_to_sheet(wsData)

    // 设置列宽
    ws['!cols'] = [
      { wch: 20 }, // 商品名称
      { wch: 15 }, // 商品编码
      { wch: 15 }, // 分类
      { wch: 10 }, // 单位
      { wch: 12 }, // 销售价
      { wch: 12 }, // 成本价
      { wch: 10 }, // 库存
      { wch: 10 }  // 状态
    ]

    XLSX.utils.book_append_sheet(wb, ws, '商品导入模板')
    XLSX.writeFile(wb, '商品导入模板.xlsx')

    ElMessage.success('模板下载成功')
  }).catch(() => {
    ElMessage.error('下载失败，请重试')
  })
}

// 处理文件选择
const handleFileChange = (file: any) => {
  excelFileName.value = file.name

  // 使用xlsx库读取Excel文件
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      import('xlsx').then(XLSX => {
        const data = new Uint8Array(e.target?.result as ArrayBuffer)
        const workbook = XLSX.read(data, { type: 'array' })
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
        const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 }) as unknown[][]

        const parsedData = []
        // 跳过表头，从第二行开始
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i]
          if (!row || row.length === 0) continue

          parsedData.push({
            name: String(row[0] || '').trim(),
            code: String(row[1] || '').trim() || `P${Date.now() + i}`,
            categoryName: String(row[2] || '').trim(),
            unit: String(row[3] || '').trim() || '件',
            price: parseFloat(row[4]) || 0,
            costPrice: parseFloat(row[5]) || 0,
            stock: parseInt(row[6]) || 0,
            status: String(row[7] || '').trim() === '上架' ? '上架' : '下架'
          })
        }

        excelPreviewData.value = parsedData
        ElMessage.success(`文件解析成功，共${parsedData.length}条数据`)
      }).catch(error => {
        console.error('文件解析失败:', error)
        ElMessage.error('文件格式错误，请使用xlsx格式')
      })
    } catch (error) {
      console.error('文件读取失败:', error)
      ElMessage.error('文件读取失败')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

// 清除Excel文件
const clearExcelFile = () => {
  excelFileName.value = ''
  excelPreviewData.value = []
}

// 关闭批量导入对话框
const handleBatchImportDialogClose = () => {
  batchImportDialogVisible.value = false
  quickAddProducts.value = []
  excelFileName.value = ''
  excelPreviewData.value = []
}

// 提交批量导入
const handleBatchImportSubmit = async () => {
  try {
    batchImportLoading.value = true

    let productsToAdd: unknown[] = []

    if (importActiveTab.value === 'quick') {
      // 在线快速添加
      productsToAdd = quickAddProducts.value.filter(p => p.name && p.price > 0)

      if (productsToAdd.length === 0) {
        ElMessage.warning('请至少填写一个商品的名称和价格')
        batchImportLoading.value = false
        return
      }
    } else {
      // 表格导入
      if (excelPreviewData.value.length === 0) {
        ElMessage.warning('请先选择并解析Excel文件')
        batchImportLoading.value = false
        return
      }
      productsToAdd = excelPreviewData.value
    }

    // 转换数据格式并添加到productStore
    for (const product of productsToAdd) {
      const categoryId = product.categoryId || productStore.categories[0]?.id || '1'
      const newProduct = {
        code: product.code || `P${Date.now()}`,
        name: product.name,
        categoryId: categoryId,
        categoryName: productStore.categories.find((c: unknown) => c.id === categoryId)?.name || '未分类',
        brand: '',
        specification: '',
        image: product.image || 'https://via.placeholder.com/100',
        price: product.price,
        costPrice: product.costPrice || product.price * 0.7,
        stock: product.stock || 0,
        minStock: 10,
        maxStock: 9999,
        unit: product.unit || '件',
        weight: 0,
        dimensions: '',
        description: '',
        status: product.status === 'active' || product.status === '上架' ? 'active' : 'inactive',
        salesCount: 0,
        updateTime: new Date().toISOString()
      }

      await productStore.addProduct(newProduct)
    }

    ElMessage.success(`成功导入${productsToAdd.length}个商品`)

    // 关闭对话框并刷新数据
    handleBatchImportDialogClose()
    loadData()
  } catch (error) {
    console.error('批量导入失败:', error)
    ElMessage.error('批量导入失败')
  } finally {
    batchImportLoading.value = false
  }
}

// 导出功能
const handleExport = async () => {
  try {
    loading.value = true

    // 获取当前筛选后的数据
    const exportData = stockList.value

    // 如果没有数据，提示用户
    if (exportData.length === 0) {
      ElMessage.warning('没有可导出的数据')
      loading.value = false
      return
    }

    // 构建Excel数据
    const headers = ['商品编码', '商品名称', '分类', '当前库存', '最低库存', '最高库存', '单位', '成本价', '销售价', '库存价值', '库存状态']
    const data = exportData.map((item: unknown) => [
      item.productCode,
      item.productName,
      item.category,
      item.currentStock,
      item.minStock,
      item.maxStock,
      item.unit,
      item.costPrice.toFixed(2),
      (item.salePrice || item.costPrice * 1.3).toFixed(2),
      (item.currentStock * item.costPrice).toFixed(2),
      getStockStatusText(item)
    ])

    // 创建CSV内容
    const csvContent = [
      headers.join(','),
      ...data.map(row => row.join(','))
    ].join('\n')

    // 添加BOM以支持中文
    const BOM = '\uFEFF'
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' })

    // 创建下载链接
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `库存数据_${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    window.URL.revokeObjectURL(url)

    ElMessage.success(`导出成功，共导出${exportData.length}条数据`)
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
const getStockStatusClass = (row: unknown) => {
  if (row.currentStock <= 0) return 'stock-out'
  if (row.currentStock <= row.minStock) return 'stock-warning'
  return 'stock-normal'
}

const getStockStatusType = (row: unknown) => {
  if (row.currentStock <= 0) return 'danger'
  if (row.currentStock <= row.minStock) return 'warning'
  return 'success'
}

const getStockStatusText = (row: unknown) => {
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

// 格式化库存总值：万元单位，保留2位小数
const formatStockValue = (num: number) => {
  if (num >= 100000000) {
    return (num / 100000000).toFixed(2) + '亿'
  } else if (num >= 10000) {
    return (num / 10000).toFixed(2) + '万'
  }
  return num.toFixed(2)
}

const handleSelectionChange = (selection: unknown[]) => {
  selectedRows.value = selection
}

const handleStockAdjustment = () => {
  if (selectedRows.value.length === 0) {
    ElMessage.warning('请先选择要调整的商品')
    return
  }

  // 批量调整：打开第一个选中商品的调整对话框
  const firstSelected = selectedRows.value[0] as unknown
  handleAdjustStock(firstSelected)

  ElMessage.info(`已选择${selectedRows.value.length}个商品，当前调整第一个商品`)
}

const handleSubmitAdjust = async () => {
  if (!adjustFormRef.value) return

  try {
    await adjustFormRef.value.validate()
    submitLoading.value = true

    // 计算调整后的库存
    let newStock = adjustForm.currentStock
    if (adjustForm.adjustType === 'increase') {
      newStock = adjustForm.currentStock + adjustForm.adjustQuantity
    } else if (adjustForm.adjustType === 'decrease') {
      newStock = Math.max(0, adjustForm.currentStock - adjustForm.adjustQuantity)
    } else if (adjustForm.adjustType === 'set') {
      newStock = adjustForm.adjustQuantity
    }

    // 更新商品库存
    await productStore.updateProduct(adjustForm.productId, { stock: newStock })

    // 记录库存变动历史
    const historyRecord = {
      id: Date.now().toString(),
      productId: adjustForm.productId,
      productCode: adjustForm.productCode,
      productName: adjustForm.productName,
      type: adjustForm.adjustType,
      typeName: adjustForm.adjustType === 'increase' ? '增加' : adjustForm.adjustType === 'decrease' ? '减少' : '设置',
      quantity: adjustForm.adjustQuantity,
      beforeStock: adjustForm.currentStock,
      afterStock: newStock,
      reason: adjustForm.reason,
      remark: adjustForm.remark,
      operator: '当前用户',
      date: new Date().toLocaleString(),
      createTime: new Date().toISOString()
    }

    // 保存到localStorage
    const historyKey = `stock_history_${adjustForm.productId}`
    const existingHistory = JSON.parse(localStorage.getItem(historyKey) || '[]')
    existingHistory.unshift(historyRecord)
    localStorage.setItem(historyKey, JSON.stringify(existingHistory.slice(0, 100))) // 只保留最近100条

    ElMessage.success('库存调整成功')

    // 1秒后自动关闭对话框并刷新数据
    setTimeout(() => {
      adjustDialogVisible.value = false
      loadData()
    }, 1000)
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

    // 更新商品预警设置
    await productStore.updateProduct(warningForm.productId, {
      minStock: warningForm.minStock,
      maxStock: warningForm.maxStock
    })

    ElMessage.success('预警设置成功')

    // 1秒后自动关闭对话框并刷新数据
    setTimeout(() => {
      warningDialogVisible.value = false
      loadData()
    }, 1000)
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

// 获取原因中文文本
const getReasonText = (reason: string) => {
  const reasonMap: Record<string, string> = {
    'inventory': '盘点调整',
    'loss': '损耗调整',
    'return': '退货入库',
    'purchase': '采购入库',
    'sale': '销售出库',
    'other': '其他'
  }
  return reasonMap[reason] || reason
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

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.metric-card {
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.metric-content {
  display: flex;
  align-items: center;
  gap: 16px;
}

.metric-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.metric-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.metric-card:hover .metric-icon::before {
  left: 100%;
}

.metric-card:hover .metric-icon {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.metric-info {
  flex: 1;
  min-width: 0;
}

.metric-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  margin-bottom: 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.metric-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.metric-change {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
}

.metric-change.up {
  color: #67C23A;
}

.metric-change.down {
  color: #F56C6C;
}

.metric-change.stable {
  color: #909399;
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

/* 批量导入对话框样式 */
.quick-add-section {
  max-height: 500px;
  overflow-y: auto;
}

.avatar-uploader {
  width: 60px;
  height: 60px;
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: border-color 0.3s;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-uploader:hover {
  border-color: #409eff;
}

.avatar-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.avatar {
  width: 60px;
  height: 60px;
  display: block;
  object-fit: cover;
}

.excel-import-section {
  padding: 20px 0;
}

.import-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
}

.file-info {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
}

.preview-section {
  margin-top: 20px;
}

.preview-section h4 {
  margin-bottom: 12px;
  color: #303133;
}
</style>
