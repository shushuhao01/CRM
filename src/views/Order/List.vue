<template>
  <div class="order-list">
    <div class="page-header">
      <h2>订单管理</h2>
    </div>

    <!-- 快速筛选标签 -->
    <div class="quick-filters-row">
      <!-- 状态筛选组 -->
      <div class="quick-filters status-filters">
        <el-tag
          v-for="filter in quickFilters"
          :key="filter.key"
          :type="activeQuickFilter === filter.key ? 'primary' : ''"
          :effect="activeQuickFilter === filter.key ? 'dark' : 'plain'"
          @click="handleQuickFilter(filter.key)"
          class="filter-tag"
        >
          {{ filter.label }}
        </el-tag>
      </div>
      <!-- 日期筛选组 -->
      <div class="quick-filters date-filters">
        <el-tag
          v-for="filter in dateQuickFilters"
          :key="filter.key"
          :type="dateQuickFilter === filter.key ? 'success' : ''"
          :effect="dateQuickFilter === filter.key ? 'dark' : 'plain'"
          @click="handleDateQuickFilter(filter.key)"
          class="filter-tag date-tag"
        >
          {{ filter.label }}
        </el-tag>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <div class="search-header">
        <span class="search-title">筛选条件</span>
        <div class="search-actions">
          <el-button
            text
            type="primary"
            @click="toggleAdvancedSearch"
            :icon="advancedSearchVisible ? 'ArrowUp' : 'ArrowDown'"
          >
            {{ advancedSearchVisible ? '收起' : '高级筛选' }}
          </el-button>
          <el-button
            text
            type="primary"
            @click="handleExport"
            :icon="'Download'"
          >
            导出
          </el-button>
        </div>
      </div>

      <!-- 基础搜索 -->
      <el-form :model="searchForm" inline class="basic-search">
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNumber"
            placeholder="请输入订单号"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input
            v-model="searchForm.customerName"
            placeholder="请输入客户姓名"
            clearable
            @keyup.enter="handleSearch"
          />
        </el-form-item>
        <el-form-item label="订单状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable multiple collapse-tags style="min-width: 200px; width: auto;">
            <el-option
              v-for="status in allOrderStatuses"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="标记">
          <el-select v-model="searchForm.markType" placeholder="请选择标记" clearable style="min-width: 140px; width: auto;">
            <el-option label="正常发货单" value="normal" />
            <el-option label="预留单" value="reserved" />
            <el-option label="退单" value="return" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-checkbox v-model="searchForm.onlyAuditPendingSubmitted">
            已提审待审
          </el-checkbox>
          <el-checkbox v-model="searchForm.onlyResubmittable" style="margin-left: 16px;">
            可再次提审
          </el-checkbox>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="'Search'">搜索</el-button>
          <el-button @click="handleReset" :icon="'Refresh'">重置</el-button>
        </el-form-item>
      </el-form>

      <!-- 高级搜索 -->
      <el-collapse-transition>
        <div v-show="advancedSearchVisible" class="advanced-search">
          <el-form :model="searchForm" :inline="false" label-width="100px">
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="创建时间">
                  <el-date-picker
                    v-model="searchForm.dateRange"
                    type="daterange"
                    range-separator="至"
                    start-placeholder="开始日期"
                    end-placeholder="结束日期"
                    style="width: 100%"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="金额范围" class="amount-range-item">
                  <div class="amount-range-wrapper">
                    <el-input-number
                      v-model="searchForm.minAmount"
                      placeholder="最小"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      class="amount-input"
                    />
                    <span class="range-separator">-</span>
                    <el-input-number
                      v-model="searchForm.maxAmount"
                      placeholder="最大"
                      :min="0"
                      :precision="2"
                      :controls="false"
                      class="amount-input"
                    />
                  </div>
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="操作人">
                  <el-select v-model="searchForm.operator" placeholder="请选择操作人" clearable filterable>
                    <el-option
                      v-for="user in operatorUserList"
                      :key="user.id"
                      :label="user.name"
                      :value="user.name"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="20">
              <el-col :span="8">
                <el-form-item label="商品名称">
                  <el-input
                    v-model="searchForm.productName"
                    placeholder="请输入商品名称"
                    clearable
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="客户电话">
                  <el-input
                    v-model="searchForm.customerPhone"
                    placeholder="请输入客户电话"
                    clearable
                  />
                </el-form-item>
              </el-col>
              <el-col :span="8">
                <el-form-item label="支付方式">
                  <el-select v-model="searchForm.paymentMethod" placeholder="请选择支付方式" clearable style="width: 100%">
                    <el-option
                      v-for="method in paymentMethodOptions"
                      :key="method.value"
                      :label="method.label"
                      :value="method.value"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
          </el-form>
        </div>
      </el-collapse-transition>
    </el-card>

    <!-- 订单列表 - 表格式卡片 -->
    <div class="table-card-container">
      <div class="table-header">
        <div class="table-title">
          <span>订单列表</span>
          <span class="selected-info" v-if="selectedOrders.length > 0">
            （已选择 {{ selectedOrders.length }} 项）
          </span>
        </div>
        <div class="table-actions">
          <!-- 1. 新建订单按钮 -->
          <el-button type="primary" @click="handleAdd" size="small">
            <el-icon><Plus /></el-icon>
            新建订单
          </el-button>

          <!-- 2. 批量导出 -->
          <el-button
            v-if="selectedOrders.length > 0"
            type="primary"
            size="small"
            @click="handleBatchExport"
            :icon="Download"
          >
            批量导出
          </el-button>
          <!-- 3. 批量取消 -->
          <el-button
            v-if="selectedOrders.length > 0"
            type="danger"
            size="small"
            @click="handleBatchCancel"
            :icon="Close"
          >
            批量取消
          </el-button>

          <!-- 4. 取消订单审核 -->
          <el-button
            v-if="canViewCancelAudit"
            @click="handleOpenCancelAudit"
            size="small"
            :icon="DocumentChecked"
            type="warning"
          >
            取消订单审核
          </el-button>

          <!-- 5. 刷新 -->
          <el-button
            @click="loadOrderList"
            size="small"
            :icon="Refresh"
          >
            刷新
          </el-button>
          <!-- 6. 列设置 -->
          <el-dropdown trigger="click" @visible-change="handleDropdownVisible">
            <el-button size="small">
              列设置 <el-icon><ArrowDown /></el-icon>
            </el-button>
            <template #dropdown>
              <el-dropdown-menu>
                <div class="column-settings-container">
                  <div class="column-settings-header">
                    <span>列显示设置</span>
                    <el-button size="small" text @click="resetColumns">重置</el-button>
                  </div>
                  <div
                    class="column-item"
                    v-for="(col, index) in tableColumns"
                    :key="col.prop"
                    draggable="true"
                    @dragstart="handleDragStart($event, index)"
                    @dragover="handleDragOver"
                    @drop="handleDrop($event, index)"
                  >
                    <el-icon class="drag-handle"><Rank /></el-icon>
                    <el-checkbox
                      v-model="col.visible"
                      @click.stop
                      @change="saveColumnSettings"
                    >
                      {{ col.label }}
                    </el-checkbox>
                  </div>
                </div>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </div>

      <el-table
        :data="filteredOrderList"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        @sort-change="handleSortChange"
        :default-sort="{ prop: 'createTime', order: 'descending' }"
        stripe
        border
        :height="tableHeight"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />

        <!-- 动态渲染列 -->
        <el-table-column
          v-for="column in dynamicColumns"
          :key="column.prop"
          :prop="column.prop"
          :label="column.label"
          :width="column.width"
          :min-width="column.minWidth"
          :sortable="column.sortable"
          :align="column.align"
        >
          <template #default="{ row }">
            <!-- 订单号特殊处理 -->
            <el-link
              v-if="column.prop === 'orderNumber'"
              @click="handleView(row)"
              type="primary"
            >
              {{ row.orderNumber }}
            </el-link>

            <!-- 客户姓名特殊处理 - 点击跳转客户详情 -->
            <el-link
              v-else-if="column.prop === 'customerName'"
              @click="handleViewCustomer(row)"
              type="primary"
            >
              {{ row.customerName || '-' }}
            </el-link>

            <!-- 状态特殊处理 -->
            <el-tag
              v-else-if="column.prop === 'status'"
              :style="getOrderStatusStyle(row.status)"
              size="small"
              effect="plain"
            >
              {{ getUnifiedStatusText(row.status) }}
            </el-tag>

            <!-- 标记特殊处理 -->
            <el-tag
              v-else-if="column.prop === 'markType'"
              :type="getMarkTagType(row.markType || 'normal')"
              size="small"
              effect="dark"
            >
              {{ getMarkText(row.markType || 'normal') }}
            </el-tag>

            <!-- 订单金额特殊处理 -->
            <span
              v-else-if="column.prop === 'totalAmount'"
              class="amount-text"
            >
              ¥{{ (row.totalAmount || 0).toLocaleString() }}
            </span>

            <!-- 客户电话特殊处理 -->
            <span v-else-if="column.prop === 'customerPhone'">
              {{ row.customerPhone ? displaySensitiveInfoNew(row.customerPhone, 'phone') : '-' }}
            </span>

            <!-- 商品特殊处理 -->
            <div
              v-else-if="column.prop === 'products'"
              class="product-list"
            >
              <div v-for="product in row.products" :key="product.id" class="product-item">
                {{ product.name }} × {{ product.quantity }}
              </div>
            </div>

            <!-- 定金金额特殊处理 -->
            <span v-else-if="column.prop === 'depositAmount'">
              <span v-if="row.depositAmount" class="deposit-text">
                ¥{{ row.depositAmount.toLocaleString() }}
              </span>
              <span v-else class="no-deposit">-</span>
            </span>

            <!-- 代收金额特殊处理 = 订单总额 - 定金 -->
            <span v-else-if="column.prop === 'collectAmount'" class="amount-text">
              ¥{{ ((row.totalAmount || 0) - (row.depositAmount || 0)).toLocaleString() }}
            </span>

            <!-- 客服微信号特殊处理 -->
            <span v-else-if="column.prop === 'serviceWechat'">
              {{ row.serviceWechat || '-' }}
            </span>

            <!-- 支付方式特殊处理 -->
            <span v-else-if="column.prop === 'paymentMethod'">
              {{ getPaymentMethodText(row.paymentMethod, row.paymentMethodOther) }}
            </span>

            <!-- 订单来源特殊处理 -->
            <span v-else-if="column.prop === 'orderSource'">
              {{ getOrderSourceText(row.orderSource) }}
            </span>

            <!-- 自定义字段特殊处理 -->
            <span v-else-if="column.prop.startsWith('customFields.')">
              {{ getCustomFieldValue(row, column.prop) }}
            </span>

            <!-- 默认处理 -->
            <span v-else>
              {{ renderColumnContent(row, column) }}
            </span>
          </template>
        </el-table-column>

        <!-- 操作列固定 -->
        <el-table-column label="操作" min-width="200" fixed="right">
          <template #default="{ row }">
            <div class="operation-buttons">
              <el-button type="text" size="small" @click="handleView(row)">详情</el-button>
              <!-- 已取消订单只显示详情按钮 -->
              <template v-if="row.status !== 'cancelled' && row.status !== 'after_sales_created'">
                <el-button
                  type="text"
                  size="small"
                  @click="handleEdit(row)"
                  v-if="canEdit(row.status, row.operatorId, row.markType, row.auditStatus, row.isAuditTransferred)"
                >
                  编辑
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="handleSubmitAudit(row)"
                  v-if="canSubmitAudit(row.status, row.auditStatus, row.isAuditTransferred, row.operatorId)"
                  :loading="submitAuditLoading[row.id]"
                >
                  提审
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="handleCancel(row)"
                  v-if="canCancel(row.status, row.operatorId)"
                >
                  取消
                </el-button>
                <el-button
                  type="text"
                  size="small"
                  @click="handleAfterSales(row)"
                  v-if="canCreateAfterSales(row.status)"
                >
                  售后
                </el-button>
              </template>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <div class="pagination-info">
          <span>共 {{ pagination.total }} 条记录</span>
        </div>
        <div class="pagination">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="pagination.total"
            layout="sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </div>

    <!-- 取消订单原因弹窗 -->
    <el-dialog
      v-model="showCancelDialog"
      title="申请取消订单"
      width="500px"
      :before-close="handleCloseCancelDialog"
    >
      <div class="cancel-order-form">
        <div class="order-info">
          <h4>订单信息</h4>
          <p><strong>订单号：</strong>{{ cancelOrderInfo.orderNumber }}</p>
          <p><strong>客户：</strong>{{ cancelOrderInfo.customerName }}</p>
          <p><strong>金额：</strong>¥{{ cancelOrderInfo.totalAmount?.toLocaleString() }}</p>
        </div>

        <el-form :model="cancelForm" :rules="cancelRules" ref="cancelFormRef" label-width="100px">
          <el-form-item label="取消原因" prop="reason">
            <el-select v-model="cancelForm.reason" placeholder="请选择取消原因" style="width: 100%">
              <el-option label="客户主动取消" value="customer_cancel" />
              <el-option label="商品缺货" value="out_of_stock" />
              <el-option label="价格调整" value="price_change" />
              <el-option label="订单信息错误" value="order_error" />
              <el-option label="其他原因" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="详细说明">
            <el-input
              v-model="cancelForm.description"
              type="textarea"
              :rows="4"
              placeholder="请详细说明取消原因（选填）..."
              maxlength="500"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleCloseCancelDialog">取消</el-button>
          <el-button type="primary" @click="submitCancelRequest" :loading="cancelSubmitting">
            提交审核
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 取消订单审核弹窗 -->
    <el-dialog
      v-model="showCancelAuditDialog"
      title="取消订单审核"
      width="1200px"
      :close-on-click-modal="false"
    >
      <el-tabs v-model="auditActiveTab" @tab-change="handleAuditTabChange">
        <!-- 待审核标签页 -->
        <el-tab-pane label="待审核" name="pending">
          <el-table
            :data="pendingCancelOrders"
            @selection-change="handleAuditSelectionChange"
            style="width: 100%"
            max-height="400"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="orderNumber" label="订单号" width="180" />
            <el-table-column prop="customerName" label="客户姓名" width="120" />
            <el-table-column label="负责销售" width="100">
              <template #default="{ row }">
                {{ row.createdByName || row.createdBy || '系统用户' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="金额" width="120">
              <template #default="{ row }">
                ¥{{ row.totalAmount?.toFixed(2) || '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="cancelRequestTime" label="申请时间" width="180" />
            <el-table-column label="取消原因" min-width="150">
              <template #default="{ row }">
                {{ getCancelReasonText(row.cancelReason) }}
              </template>
            </el-table-column>
          </el-table>

          <div class="audit-footer" style="margin-top: 20px; text-align: right;">
            <el-button @click="handleCloseCancelAudit">关闭</el-button>
            <el-button
              type="success"
              @click="handleAuditApprove"
              :loading="auditSubmitting"
              :disabled="selectedAuditOrders.length === 0"
            >
              审核取消通过
            </el-button>
            <el-button
              type="danger"
              @click="handleAuditReject"
              :loading="auditSubmitting"
              :disabled="selectedAuditOrders.length === 0"
            >
              审核取消拒绝
            </el-button>
          </div>
        </el-tab-pane>

        <!-- 已审核标签页 -->
        <el-tab-pane label="已审核" name="audited">
          <el-table
            :data="auditedCancelOrders"
            style="width: 100%"
            max-height="400"
          >
            <el-table-column prop="orderNumber" label="订单号" width="180" />
            <el-table-column prop="customerName" label="客户姓名" width="120" />
            <el-table-column label="负责销售" width="100">
              <template #default="{ row }">
                {{ row.createdByName || row.createdBy || '系统用户' }}
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="金额" width="120">
              <template #default="{ row }">
                ¥{{ row.totalAmount?.toFixed(2) || '0.00' }}
              </template>
            </el-table-column>
            <el-table-column prop="cancelRequestTime" label="申请时间" width="180" />
            <el-table-column label="取消原因" width="150">
              <template #default="{ row }">
                {{ getCancelReasonText(row.cancelReason) }}
              </template>
            </el-table-column>
            <el-table-column prop="status" label="审核结果" width="100">
              <template #default="{ row }">
                <el-tag v-if="row.status === 'cancelled'" type="success">已取消</el-tag>
                <el-tag v-else-if="row.status === 'cancel_failed'" type="danger">取消失败</el-tag>
              </template>
            </el-table-column>
          </el-table>

          <div class="audit-footer" style="margin-top: 20px; text-align: right;">
            <el-button @click="handleCloseCancelAudit">关闭</el-button>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'OrderList'
})

import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useNotificationStore } from '@/stores/notification'
import { usePerformanceStore } from '@/stores/performance'
import { ElMessage, ElMessageBox } from 'element-plus'
import { eventBus, EventNames } from '@/utils/eventBus'
import { Plus, Search, Refresh, ArrowDown, Download, Check, Close, DocumentChecked, Rank, DocumentRemove, Clock, CircleCheck, User, Document, Warning, Edit, CircleClose, Select, Loading } from '@element-plus/icons-vue'
import { request } from '@/api/request'
import { exportBatchOrders, type ExportOrder } from '@/utils/export'
import { orderApi } from '@/api/order'
import { createSafeNavigator } from '@/utils/navigation'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'

// 类型定义
interface ProductItem {
  name: string
  quantity: number
}

interface OrderItem {
  id: string
  orderNumber: string
  customerName: string
  customerPhone: string
  products: ProductItem[] | string
  totalAmount: number
  depositAmount: number
  paymentMethod: string
  paymentMethodOther?: string
  orderSource?: string
  status: string
  markType: string
  createTime: string
  operator: string
  operatorId: string
  completedTime?: string
  shippingStatus?: string
  auditStatus?: string
  isAuditTransferred?: boolean
  auditTransferTime?: string
  createdByName?: string
  createdBy?: string
  receiverPhone?: string
  collectAmount?: number
  customerId?: string
  remark?: string
  [key: string]: unknown
}

interface TableColumn {
  prop: string
  label: string
  visible: boolean
  width?: number
  minWidth?: number
  sortable?: boolean | string
  align?: string
}

interface SortChangeEvent {
  prop: string
  order: string
}

interface ColumnSetting {
  prop: string
  visible: boolean
}

interface ApiError {
  response?: {
    data?: {
      message?: string
    }
  }
  data?: {
    message?: string
  }
  message?: string
}

interface TabChangeEvent {
  name: string
}

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const orderStore = useOrderStore()
const userStore = useUserStore()
const appStore = useAppStore()
const performanceStore = usePerformanceStore()

const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)
const advancedSearchVisible = ref(false)
const activeQuickFilter = ref('all')
const selectedOrders = ref<OrderItem[]>([])
const sortConfig = ref({ prop: 'createTime', order: 'descending' })
const submitAuditLoading = ref<Record<string, boolean>>({})

// 取消订单相关数据
const showCancelDialog = ref(false)
const cancelSubmitting = ref(false)
const cancelFormRef = ref()
const cancelOrderInfo = ref({
  id: '',
  orderNumber: '',
  customerName: '',
  totalAmount: 0
})

const cancelForm = reactive({
  reason: '',
  description: ''
})

const cancelRules = {
  reason: [
    { required: true, message: '请选择取消原因', trigger: 'change' }
  ]
}

// 取消订单审核相关数据
const showCancelAuditDialog = ref(false)
const auditActiveTab = ref('pending')
const selectedAuditOrders = ref<OrderItem[]>([])
const auditSubmitting = ref(false)

const searchForm = reactive({
  orderNumber: '',
  customerName: '',
  status: [],
  markType: '',
  dateRange: [],
  minAmount: undefined,
  maxAmount: undefined,
  operator: '',
  productName: '',
  customerPhone: '',
  paymentMethod: '',
  onlyAuditPendingSubmitted: false,
  onlyResubmittable: false
})

const pagination = reactive({
  page: 1,
  size: 20,
  total: 0
})



// 快速筛选配置 - 状态筛选组
const quickFilters = ref([
  { key: 'all', label: '全部', count: 0 },
  { key: 'pending_audit', label: '待审核', count: 0 },
  { key: 'pending_shipment', label: '已审核', count: 0 },
  { key: 'shipped', label: '已发货', count: 0 },
  { key: 'delivered', label: '已签收', count: 0 },
  { key: 'rejected_returned', label: '拒收已退回', count: 0 },
  { key: 'after_sales_created', label: '已建售后', count: 0 }
])

// 日期快捷筛选组
const dateQuickFilter = ref('all')
const dateQuickFilters = [
  { key: 'today', label: '今日' },
  { key: 'yesterday', label: '昨日' },
  { key: 'thisWeek', label: '本周' },
  { key: 'thisMonth', label: '本月' },
  { key: 'thisYear', label: '今年' },
  { key: 'all', label: '全部' }
]

// 所有订单状态 - 从订单store获取真实状态
const allOrderStatuses = computed(() => [
  { value: 'pending_transfer', label: '待流转' },
  { value: 'pending_audit', label: '待审核' },
  { value: 'audit_rejected', label: '审核拒绝' },
  { value: 'pending_shipment', label: '待发货' },
  { value: 'shipped', label: '已发货' },
  { value: 'delivered', label: '已签收' },
  { value: 'package_exception', label: '包裹异常' },
  { value: 'rejected', label: '拒收' },
  { value: 'rejected_returned', label: '拒收已退回' },
  { value: 'logistics_returned', label: '物流退回' },
  { value: 'logistics_cancelled', label: '物流取消' },
  { value: 'after_sales_created', label: '已建售后' },
  { value: 'pending_cancel', label: '待取消' },
  { value: 'cancel_failed', label: '取消失败' },
  { value: 'cancelled', label: '已取消' },
  { value: 'draft', label: '草稿' }
])

// 基础表格列配置
const baseTableColumns = [
  { prop: 'orderNumber', label: '订单号', visible: true },
  { prop: 'customerName', label: '客户姓名', visible: true },
  { prop: 'status', label: '状态', visible: true },
  { prop: 'markType', label: '标记', visible: true },
  { prop: 'totalAmount', label: '订单金额', visible: true },
  { prop: 'salesPersonName', label: '负责销售', visible: true },
  { prop: 'products', label: '商品', visible: true },
  { prop: 'depositAmount', label: '定金', visible: true },
  { prop: 'collectAmount', label: '代收金额', visible: true },
  { prop: 'serviceWechat', label: '客服微信号', visible: true },
  { prop: 'orderSource', label: '订单来源', visible: true },
  { prop: 'remark', label: '订单备注', visible: false },
  { prop: 'receiverPhone', label: '收货电话', visible: false },
  { prop: 'paymentMethod', label: '支付方式', visible: false },
  { prop: 'createTime', label: '创建时间', visible: true }
]

// 表格列配置（包含动态自定义字段）
const tableColumns = ref([...baseTableColumns])

// 加载自定义字段到列配置
const loadCustomFieldColumns = async () => {
  try {
    const response = await request.get('/system/order-field-config')
    if (response && response.data && response.data.customFields) {
      const customFields = response.data.customFields

      // 找到支付方式列的位置，在其后面插入自定义字段
      const paymentMethodIndex = baseTableColumns.findIndex(col => col.prop === 'paymentMethod')
      const insertIndex = paymentMethodIndex !== -1 ? paymentMethodIndex + 1 : baseTableColumns.length - 1

      // 构建自定义字段列
      const customFieldColumns = customFields.map((field: any) => ({
        prop: `customFields.${field.fieldKey}`,
        label: field.fieldName,
        visible: false, // 默认不勾选
        isCustomField: true,
        fieldKey: field.fieldKey
      }))

      // 合并基础列和自定义字段列
      const newColumns = [...baseTableColumns]
      newColumns.splice(insertIndex, 0, ...customFieldColumns)
      tableColumns.value = newColumns

      console.log('[订单列表] 自定义字段列加载成功:', customFieldColumns.length, '个')
    }
  } catch (error) {
    console.warn('加载自定义字段列失败:', error)
  }
}

// 支付方式选项 - 从系统设置API获取
const paymentMethodOptions = ref<Array<{ value: string; label: string }>>([
  { value: 'wechat', label: '微信支付' },
  { value: 'alipay', label: '支付宝' },
  { value: 'bank_transfer', label: '银行转账' },
  { value: 'unionpay', label: '云闪付' },
  { value: 'cod', label: '货到付款' },
  { value: 'cash', label: '现金' },
  { value: 'card', label: '刷卡' },
  { value: 'other', label: '其他' }
])

// 从API加载支付方式选项
const loadPaymentMethods = async () => {
  try {
    const response = await request.get('/system/payment-methods')
    if (response && response.data && Array.isArray(response.data)) {
      paymentMethodOptions.value = response.data.map((method: any) => ({
        value: method.value,
        label: method.label
      }))
      console.log('[订单列表] 支付方式加载成功:', paymentMethodOptions.value.length, '个')
    }
  } catch (error) {
    console.warn('加载支付方式失败，使用默认值:', error)
  }
}

// 销售人员数据 - 从userStore获取真实用户
const salesUsers = computed(() => {
  return userStore.users
    .filter((u: any) => ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role))
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username,
      department: u.departmentName || u.department || '未分配'
    }))
})

// 操作人列表 - 用于筛选
const operatorUserList = computed(() => {
  return userStore.users.map((u: any) => ({
    id: u.id,
    name: u.realName || u.name || u.username
  }))
})

// 获取销售人员姓名
const getSalesPersonName = (salesPersonId: string) => {
  const salesPerson = salesUsers.value.find(user => user.id === salesPersonId)
  return salesPerson ? salesPerson.name : '未分配'
}

// 订单列表数据
const orderList = computed(() => orderStore.orders)



// 方法

const getMarkTagType = (markType: string) => {
  const types: Record<string, string> = {
    'reserved': 'warning',    // 预留单 - 黄色
    'normal': 'success',      // 正常发货单 - 淡绿色
    'return': 'danger'        // 退单 - 淡粉红色
  }
  return types[markType] || 'success'
}

const getMarkText = (markType: string) => {
  const texts: Record<string, string> = {
    'reserved': '预留单',
    'normal': '正常发货单',
    'return': '退单'
  }
  return texts[markType] || '正常发货单'
}

const getStatusText = (status: string, markType?: string, isAuditTransferred?: boolean) => {
  // 兼容旧的pending状态
  if (status === 'pending') {
    return isAuditTransferred ? '待审核' : '待流转'
  }

  const texts: Record<string, string> = {
    // 新的状态枚举
    pending_transfer: '待流转',
    pending_audit: '待审核',
    audit_rejected: '审核拒绝',
    pending_shipment: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    package_exception: '包裹异常',
    rejected: '拒收',
    rejected_returned: '物流部退回',
    logistics_returned: '物流部退回',
    logistics_cancelled: '物流部取消',
    after_sales_created: '已建售后',
    pending_cancel: '待取消',
    cancel_failed: '取消失败',
    cancelled: '已取消',
    draft: '草稿',

    // 兼容旧状态
    approved: '已审核',
    confirmed: '已确认',
    refunded: '退货退款'
  }
  return texts[status] || '未知'
}

// 获取状态标签类型（颜色）
const getStatusType = (status: string, markType?: string) => {
  // 被退回订单显示为警告色
  if (markType === 'return') {
    return 'warning'
  }

  const types: Record<string, string> = {
    // 新的状态枚举
    pending_transfer: 'info',      // 待流转 - 灰色
    pending_audit: 'warning',      // 待审核 - 橙色
    audit_rejected: 'danger',      // 审核拒绝 - 红色
    pending_shipment: 'primary',   // 待发货 - 蓝色
    shipped: 'primary',            // 已发货 - 蓝色
    delivered: 'success',          // 已签收 - 绿色
    package_exception: 'warning',  // 包裹异常 - 橙色
    rejected: 'danger',            // 拒收 - 红色
    rejected_returned: 'info',     // 拒收已退回 - 灰色
    after_sales_created: 'warning', // 已建售后 - 橙色
    pending_cancel: 'warning',     // 待取消 - 橙色
    cancel_failed: 'danger',       // 取消失败 - 红色
    cancelled: 'info',             // 已取消 - 灰色
    draft: 'info',                 // 草稿 - 灰色

    // 兼容旧状态
    pending: 'warning',            // 待处理 - 橙色
    approved: 'success',           // 已审核 - 绿色
    confirmed: 'success',          // 已确认 - 绿色
    refunded: 'info'               // 退货退款 - 灰色
  }
  return types[status] || 'info'
}

// 数据范围控制函数
const applyDataScopeControl = (orders: any[]) => {
  const currentUser = userStore.currentUser
  if (!currentUser) {
    return []
  }

  // 超级管理员可以看到所有订单
  if (userStore.isSuperAdmin) {
    return orders
  }

  // 部门负责人可以看到部门内的订单
  if (userStore.isDepartmentManager) {
    const accessibleDepts = userStore.accessibleDepartments
    return orders.filter(order => {
      // 如果订单有部门信息，检查是否在可访问部门列表中
      if (order.departmentId) {
        return accessibleDepts.includes(order.departmentId)
      }
      // 如果没有部门信息，通过销售人员判断
      const salesPerson = salesUsers.value.find(user => user.id === order.salesPersonId)
      return salesPerson && accessibleDepts.includes(salesPerson.department)
    })
  }

  // 销售员只能看到自己创建的订单
  if (userStore.isSalesStaff) {
    return orders.filter(order => order.salesPersonId === currentUser.id)
  }

  // 客服根据类型看到相应的订单
  if (userStore.isCustomerService) {
    const customerServiceType = currentUser.customerServiceType
    if (customerServiceType) {
      return orders.filter(order => {
        switch (customerServiceType) {
          case 'after_sales':
            return order.markType === 'return' || order.status === 'after_sales_created'
          case 'audit':
            return order.status === 'pending_audit' || order.auditStatus === 'pending'
          case 'general':
            return true // 通用客服可以看到所有订单
          default:
            return false
        }
      })
    } else {
      // 如果没有客服类型，不显示任何订单
      return []
    }
  }

  // 其他角色只能看到自己创建的订单
  return orders.filter(order => order.createdBy === currentUser.id)
}

// 计算属性
const filteredOrderList = computed(() => {
  // 首先应用数据范围控制
  let filtered = applyDataScopeControl(orderList.value)

  // 快速筛选 - 状态筛选
  if (activeQuickFilter.value !== 'all') {
    filtered = filtered.filter(order => {
      return order.status === activeQuickFilter.value
    })
  }

  // 高级筛选
  if (searchForm.orderNumber) {
    filtered = filtered.filter(order =>
      order.orderNumber.toLowerCase().includes(searchForm.orderNumber.toLowerCase())
    )
  }
  if (searchForm.customerName) {
    filtered = filtered.filter(order =>
      order.customerName.toLowerCase().includes(searchForm.customerName.toLowerCase())
    )
  }
  if (searchForm.customerPhone) {
    filtered = filtered.filter(order =>
      order.customerPhone.includes(searchForm.customerPhone)
    )
  }
  if (searchForm.status.length > 0) {
    filtered = filtered.filter(order =>
      searchForm.status.includes(order.status)
    )
  }
  if (searchForm.markType) {
    filtered = filtered.filter(order =>
      (order.markType || 'normal') === searchForm.markType
    )
  }
  if (searchForm.operator) {
    filtered = filtered.filter(order =>
      order.operator.toLowerCase().includes(searchForm.operator.toLowerCase())
    )
  }
  if (searchForm.productName) {
    filtered = filtered.filter(order =>
      Array.isArray(order.products) && order.products.some((product: ProductItem) =>
        product.name.toLowerCase().includes(searchForm.productName.toLowerCase())
      )
    )
  }
  if (searchForm.paymentMethod) {
    filtered = filtered.filter(order =>
      order.paymentMethod === searchForm.paymentMethod
    )
  }
  // 仅显示已提审的待审核订单
  if (searchForm.onlyAuditPendingSubmitted) {
    filtered = filtered.filter(order =>
      order.status === 'pending_audit' && (order.auditStatus === 'pending' || order.isAuditTransferred === true)
    )
  }
  // 仅显示可再次提审的订单
  if (searchForm.onlyResubmittable) {
    filtered = filtered.filter(order =>
      canSubmitAudit(order.status, order.auditStatus, order.isAuditTransferred, order.operatorId)
    )
  }
  if (searchForm.minAmount !== undefined) {
    filtered = filtered.filter(order => order.totalAmount >= searchForm.minAmount)
  }
  if (searchForm.maxAmount !== undefined) {
    filtered = filtered.filter(order => order.totalAmount <= searchForm.maxAmount)
  }
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [startDate, endDate] = searchForm.dateRange
    filtered = filtered.filter(order => {
      const orderDate = new Date(order.createTime)
      return orderDate >= startDate && orderDate <= endDate
    })
  }
  // 应用排序（自定义排序）
  const { prop, order } = sortConfig.value || { prop: 'createTime', order: 'descending' }
  if (prop && order && order !== null) {
    const normalize = (o, p) => {
      switch (p) {
        case 'createTime':
          return new Date(o.createTime).getTime() || 0
        case 'totalAmount':
        case 'depositAmount':
          return Number(o[p] ?? 0)
        case 'products':
          return Array.isArray(o.products) ? o.products.length : 0
        default:
          const v = o[p]
          if (typeof v === 'string') return v.toLowerCase()
          return Number(v ?? 0)
      }
    }
    filtered = filtered.slice().sort((a, b) => {
      const av = normalize(a, prop)
      const bv = normalize(b, prop)
      let cmp = 0
      if (typeof av === 'string' && typeof bv === 'string') {
        cmp = av.localeCompare(bv)
      } else {
        cmp = (av as number) - (bv as number)
      }
      return order === 'ascending' ? cmp : -cmp
    })
  }

  return filtered
})

// 权限控制：取消订单审核按钮是否可见
const canViewCancelAudit = computed(() => {
  // 只有部门负责人、管理员、超级管理员可以看到取消订单审核按钮
  return userStore.isDepartmentHead || userStore.isManager || userStore.isSuperAdmin
})

// 待审核的取消订单列表（应用数据范围控制）
const pendingCancelOrders = computed(() => {
  const baseFiltered = applyDataScopeControl(orderList.value)
  return baseFiltered.filter(order => order.status === 'pending_cancel')
})

// 已审核的取消订单列表（包括已取消和取消失败）（应用数据范围控制）
const auditedCancelOrders = computed(() => {
  const baseFiltered = applyDataScopeControl(orderList.value)
  return baseFiltered.filter(order =>
    order.status === 'cancelled' || order.status === 'cancel_failed'
  )
})

// 取消原因转换方法
const getCancelReasonText = (reason: string) => {
  const reasonMap: Record<string, string> = {
    'customer_cancel': '客户主动取消',
    'out_of_stock': '商品缺货',
    'price_change': '价格调整',
    'order_error': '订单信息错误',
    'other': '其他原因',
    '客户要求取消': '客户要求取消',
    '商品缺货': '商品缺货',
    '价格争议': '价格争议'
  }
  return reasonMap[reason] || reason
}

// 表格高度计算
const tableHeight = computed(() => {
  // 计算可用高度：视窗高度 - 头部导航 - 页面标题 - 搜索区域 - 分页 - 底部边距
  const windowHeight = window.innerHeight
  const headerHeight = 60  // 头部导航高度
  const titleHeight = 60   // 页面标题区域高度
  const searchHeight = 120 // 搜索区域高度
  const paginationHeight = 60 // 分页区域高度
  const bottomMargin = 40  // 底部边距

  return windowHeight - headerHeight - titleHeight - searchHeight - paginationHeight - bottomMargin
})

// 动态列配置
const dynamicColumns = computed(() => {
  return tableColumns.value.filter(col => col.visible).map(col => {
    const baseConfig = {
      prop: col.prop,
      label: col.label,
      visible: col.visible
    }

    // 根据不同列类型设置特定配置
    switch (col.prop) {
      case 'orderNumber':
        return { ...baseConfig, width: 180, sortable: 'custom' }
      case 'customerName':
        return { ...baseConfig, width: 120, sortable: 'custom' }
      case 'salesPersonName':
        return { ...baseConfig, width: 100, sortable: 'custom' }
      case 'status':
        return { ...baseConfig, width: 100, sortable: 'custom' }
      case 'markType':
        return { ...baseConfig, width: 100, align: 'center' }
      case 'totalAmount':
        return { ...baseConfig, width: 120, sortable: 'custom' }
      case 'customerPhone':
        return { ...baseConfig, width: 130 }
      case 'products':
        return { ...baseConfig, minWidth: 200 }
      case 'depositAmount':
        return { ...baseConfig, width: 120 }
      case 'paymentMethod':
        return { ...baseConfig, width: 100 }
      case 'createTime':
        return { ...baseConfig, width: 180, sortable: 'custom' }
      case 'operator':
        return { ...baseConfig, width: 100, sortable: 'custom' }
      default:
        return baseConfig
    }
  })
})

// 渲染列内容的方法
const renderColumnContent = (row: OrderItem, column: TableColumn) => {
  switch (column.prop) {
    case 'orderNumber':
      return row.orderNumber
    case 'customerName':
      return row.customerName
    case 'salesPersonName':
          return row.createdByName || row.createdBy || '系统用户'
    case 'status':
      return getStatusText(row.status)
    case 'markType':
      return getMarkText(row.markType || 'normal')
    case 'totalAmount':
      return `¥${(row.totalAmount || 0).toLocaleString()}`
    case 'receiverPhone':
      return row.receiverPhone ? displaySensitiveInfoNew(row.receiverPhone, SensitiveInfoType.PHONE) : '-'
    case 'products':
      return Array.isArray(row.products)
        ? row.products.map((p: ProductItem) => `${p.name} × ${p.quantity}`).join(', ')
        : (row.products || '-')
    case 'depositAmount':
      return row.depositAmount ? `¥${row.depositAmount.toLocaleString()}` : '-'
    case 'collectAmount':
      // 代收金额 = 订单总额 - 定金
      const collectAmt = row.collectAmount ?? ((row.totalAmount || 0) - (row.depositAmount || 0))
      return collectAmt > 0 ? `¥${collectAmt.toLocaleString()}` : '-'
    case 'paymentMethod':
      return getPaymentMethodText(row.paymentMethod, row.paymentMethodOther)
    case 'orderSource':
      return getOrderSourceText(row.orderSource)
    case 'createTime':
      return row.createTime
    case 'operator':
      return row.operator
    default:
      return row[column.prop] || '-'
  }
}

const getPaymentMethodText = (method: string, otherText?: string) => {
  if (!method) return '-'
  // 如果是"其他"且有自定义文本，显示自定义文本
  if (method === 'other' && otherText) {
    return otherText
  }
  const texts: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank_transfer: '银行转账',
    unionpay: '云闪付',
    cod: '货到付款',
    cash: '现金',
    card: '刷卡',
    other: '其他'
  }
  return texts[method] || method
}

// 获取订单来源文本
const getOrderSourceText = (source: string | null | undefined) => {
  if (!source) return '-'
  const sourceMap: Record<string, string> = {
    'online_store': '线上商城',
    'wechat_mini': '微信小程序',
    'wechat_service': '微信客服',
    'phone_call': '电话咨询',
    'offline_store': '线下门店',
    'referral': '客户推荐',
    'advertisement': '广告投放',
    'other': '其他渠道'
  }
  return sourceMap[source] || source
}

// 获取自定义字段值
const getCustomFieldValue = (row: any, columnProp: string) => {
  // columnProp格式: customFields.fieldKey
  const fieldKey = columnProp.replace('customFields.', '')
  const customFields = row.customFields || {}
  return customFields[fieldKey] || '-'
}

// 查看客户详情
const handleViewCustomer = (row: any) => {
  if (row.customerId) {
    router.push(`/customer/detail/${row.customerId}`)
  }
}

const canEdit = (status: string, operatorId?: string, markType?: string, auditStatus?: string, isAuditTransferred?: boolean) => {
  // 编辑按钮在待流转、审核拒绝、物流部退回、取消失败时显示
  const allowedStatuses = ['pending_transfer', 'audit_rejected', 'logistics_returned', 'cancel_failed']

  if (!allowedStatuses.includes(status)) {
    return false
  }

  // 超级管理员可以编辑所有符合条件的订单
  if (userStore.isSuperAdmin) {
    return true
  }

  // 管理员可以编辑所有符合条件的订单
  if (userStore.isManager) {
    return true
  }

  // 销售人员只能编辑自己创建的订单
  return operatorId === userStore.user.id
}

const canCancel = (status: string, operatorId?: string) => {
  // 取消按钮在待流转、待审核、审核拒绝、待发货、物流部退回、取消失败时显示
  // 但被物流部取消的不显示（logistics_cancelled状态不显示取消按钮）
  // 已取消的订单也不显示取消按钮（cancelled状态不显示取消按钮）
  const allowedStatuses = ['pending_transfer', 'pending_audit', 'audit_rejected', 'pending_shipment', 'logistics_returned', 'cancel_failed']

  if (!allowedStatuses.includes(status)) {
    return false
  }

  // 已取消的订单不显示取消按钮
  if (status === 'cancelled') {
    return false
  }

  // 超级管理员可以取消所有符合条件的订单
  if (userStore.isSuperAdmin) {
    return true
  }

  // 管理员可以取消所有符合条件的订单
  if (userStore.isManager) {
    return true
  }

  // 销售人员只能取消自己创建的订单
  return operatorId === userStore.user.id
}



const canCreateAfterSales = (status: string) => {
  // 售后按钮在已发货、已签收、拒收、包裹异常、拒收已退回时显示
  const allowedStatuses = ['shipped', 'delivered', 'rejected', 'package_exception', 'rejected_returned']

  return allowedStatuses.includes(status)
}

const canSubmitAudit = (status: string, auditStatus?: string, isAuditTransferred?: boolean, operatorId?: string) => {
  // 提审按钮在待流转、审核拒绝、物流部退回、取消失败时显示
  const allowedStatuses = ['pending_transfer', 'audit_rejected', 'logistics_returned', 'cancel_failed']

  if (!allowedStatuses.includes(status)) {
    return false
  }

  // 超级管理员和管理员可以提审所有符合条件的订单
  if (userStore.isSuperAdmin || userStore.isManager) {
    return true
  }

  // 销售人员只能提审自己创建的订单
  return operatorId === userStore.user.id
}

// 提审处理
const handleSubmitAudit = async (row: OrderItem) => {
  try {
    await ElMessageBox.confirm(
      `确定要提审订单 ${row.orderNumber} 吗？${row.markType === 'normal' ? '正常发货单将直接流转到审核环节。' : ''}`,
      '提审确认',
      {
        confirmButtonText: '确定提审',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 设置当前订单的提审loading状态
    submitAuditLoading.value[row.id] = true

    // 调用API提审订单
    await orderApi.submitAudit(row.id, {
      operatorId: userStore.user.id,
      markType: row.markType
    })

    // 更新订单状态 - 同时更新前端列表和store中的数据
    const order = orderList.value.find(o => o.id === row.id)
    const storeOrder = orderStore.getOrderById(row.id)

    if (order && storeOrder) {
      // 更新前端列表中的订单状态
      order.auditStatus = 'pending'

      // 更新store中的订单状态
      storeOrder.auditStatus = 'pending'
      storeOrder.status = 'pending_audit' // 同时更新订单主状态

      // 提审时，如果是预留单，自动改为正常发货单
      if (order.markType === 'reserved') {
        order.markType = 'normal'
        storeOrder.markType = 'normal'
      }

      // 正常发货单直接流转审核，无需等待
      order.isAuditTransferred = true
      order.auditTransferTime = new Date().toLocaleString('zh-CN')

      // 同步更新store中的流转状态
      storeOrder.isAuditTransferred = true
      storeOrder.auditTransferTime = new Date().toLocaleString('zh-CN')

      // 添加状态历史记录
      if (!storeOrder.statusHistory) {
        storeOrder.statusHistory = []
      }
      storeOrder.statusHistory.push({
        status: 'pending_audit',
        time: new Date().toLocaleString('zh-CN'),
        operator: userStore.user?.name || '系统',
        description: '订单已提交审核',
        remark: '手动提审'
      })

      // 发送通知消息
      notificationStore.sendMessage(
        notificationStore.MessageType.AUDIT_PENDING,
        `订单 ${order.orderNumber} (客户: ${order.customerName}, 金额: ¥${order.totalAmount?.toLocaleString()}) 已提交审核`,
        {
          relatedId: order.id,
          relatedType: 'order',
          actionUrl: `/order/detail/${order.id}`
        }
      )
    }

    ElMessage.success('订单已提审')
    updateQuickFilterCounts()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('提审失败，请重试')
    }
  } finally {
    // 清除当前订单的提审loading状态
    submitAuditLoading.value[row.id] = false
  }
}

// 快速筛选处理
const handleQuickFilter = (filterKey: string) => {
  activeQuickFilter.value = filterKey
  pagination.page = 1
  updateQuickFilterCounts()
}

// 日期快捷筛选处理
const handleDateQuickFilter = (filterKey: string) => {
  dateQuickFilter.value = filterKey
  pagination.page = 1

  // 根据日期筛选设置日期范围
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  switch (filterKey) {
    case 'today':
      searchForm.dateRange = [today, new Date(today.getTime() + 24 * 60 * 60 * 1000 - 1)]
      break
    case 'yesterday':
      const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000)
      searchForm.dateRange = [yesterday, new Date(today.getTime() - 1)]
      break
    case 'thisWeek':
      const dayOfWeek = now.getDay() || 7
      const startOfWeek = new Date(today.getTime() - (dayOfWeek - 1) * 24 * 60 * 60 * 1000)
      searchForm.dateRange = [startOfWeek, now]
      break
    case 'thisMonth':
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
      searchForm.dateRange = [startOfMonth, now]
      break
    case 'thisYear':
      const startOfYear = new Date(now.getFullYear(), 0, 1)
      searchForm.dateRange = [startOfYear, now]
      break
    case 'all':
    default:
      searchForm.dateRange = []
      break
  }
}

// 高级搜索切换
const toggleAdvancedSearch = () => {
  advancedSearchVisible.value = !advancedSearchVisible.value
}

// 表格排序处理
const handleSortChange = ({ prop, order }: SortChangeEvent) => {
  sortConfig.value = { prop, order }
  // 这里可以添加服务端排序逻辑
}

// 表格选择处理
const handleSelectionChange = (selection: OrderItem[]) => {
  selectedOrders.value = selection
}

// 列设置处理
const handleDropdownVisible = (visible: boolean) => {
  if (!visible) {
    saveColumnSettings()
  }
}

// 保存列设置到数据库（同步到云端）
const saveColumnSettings = async () => {
  const settings = tableColumns.value.map(col => ({
    prop: col.prop,
    label: col.label,
    visible: col.visible
  }))

  // 先保存到localStorage作为缓存
  localStorage.setItem('orderListColumnSettings', JSON.stringify(settings))

  // 同步到数据库
  try {
    await request.post('/system/user-settings/orderListColumns', { columns: settings })
    console.log('[订单列表] 列设置已同步到数据库')
  } catch (error) {
    console.warn('列设置同步到数据库失败，已保存到本地:', error)
  }
}

// 从数据库加载列设置（优先数据库，降级到localStorage）
const loadColumnSettings = async () => {
  try {
    // 先尝试从数据库加载
    const response = await request.get('/system/user-settings/orderListColumns')
    if (response && response.data && response.data.columns) {
      const settings: ColumnSetting[] = response.data.columns
      settings.forEach((setting: ColumnSetting) => {
        const column = tableColumns.value.find(col => col.prop === setting.prop)
        if (column) {
          column.visible = setting.visible
        }
      })
      console.log('[订单列表] 从数据库加载列设置成功')
      // 同步到localStorage
      localStorage.setItem('orderListColumnSettings', JSON.stringify(settings))
      return
    }
  } catch (error) {
    console.warn('从数据库加载列设置失败，尝试本地缓存:', error)
  }

  // 降级到localStorage
  const saved = localStorage.getItem('orderListColumnSettings')
  if (saved) {
    try {
      const settings: ColumnSetting[] = JSON.parse(saved)
      settings.forEach((setting: ColumnSetting) => {
        const column = tableColumns.value.find(col => col.prop === setting.prop)
        if (column) {
          column.visible = setting.visible
        }
      })
      console.log('[订单列表] 从本地缓存加载列设置')
    } catch (e) {
      console.warn('Failed to load column settings from localStorage:', e)
    }
  }
}

// 重置列设置
const resetColumns = () => {
  tableColumns.value.forEach(col => {
    col.visible = ['orderNumber', 'customerName', 'status', 'markType', 'products', 'totalAmount', 'createTime', 'operator'].includes(col.prop)
  })
  saveColumnSettings()
}

// 拖动相关变量
let draggedIndex = -1

// 拖动开始
const handleDragStart = (event: DragEvent, index: number) => {
  draggedIndex = index
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
  }
}

// 拖动悬停
const handleDragOver = (event: DragEvent) => {
  event.preventDefault()
  if (event.dataTransfer) {
    event.dataTransfer.dropEffect = 'move'
  }
}

// 拖动放置
const handleDrop = (event: DragEvent, targetIndex: number) => {
  event.preventDefault()

  if (draggedIndex !== -1 && draggedIndex !== targetIndex) {
    const draggedItem = tableColumns.value[draggedIndex]
    tableColumns.value.splice(draggedIndex, 1)
    tableColumns.value.splice(targetIndex, 0, draggedItem)
    saveColumnSettings()
  }

  draggedIndex = -1
}

// 批量取消订单
const handleBatchCancel = async () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要取消的订单')
    return
  }

  try {
    await ElMessageBox.confirm(`确定要取消选中的 ${selectedOrders.value.length} 个订单吗？`, '批量取消', {
      type: 'warning'
    })

    loading.value = true

    // 调用实际的API
    await request.post('/api/orders/batch-cancel', {
      orderIds: selectedOrders.value.map(order => order.id),
      operatorId: userStore.user.id
    })

    // 更新订单状态
    selectedOrders.value.forEach(selectedOrder => {
      const order = orderList.value.find(o => o.id === selectedOrder.id)
      if (order) {
        order.status = 'cancelled'

        // 发送通知消息
        notificationStore.sendMessage(
          notificationStore.MessageType.ORDER_CANCELLED,
          `订单 ${order.orderNumber} (客户: ${order.customerName}, 金额: ¥${order.totalAmount?.toLocaleString()}) 已取消`,
          {
            relatedId: order.id,
            relatedType: 'order',
            actionUrl: `/order/detail/${order.id}`
          }
        )
      }
    })

    selectedOrders.value = []
    ElMessage.success('批量取消成功')
    updateQuickFilterCounts()

  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量取消失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 批量导出订单
const handleBatchExport = async () => {
  if (!selectedOrders.value || selectedOrders.value.length === 0) {
    ElMessage.warning('请先选择要导出的订单')
    return
  }

  try {
    loading.value = true

    // 将选中的订单数据转换为导出格式（包含完整字段）
    const exportData: ExportOrder[] = selectedOrders.value.map(order => ({
      orderNumber: order.orderNumber || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      products: Array.isArray(order.products)
        ? order.products.map((p: any) => `${p.name} x${p.quantity}`).join(', ')
        : order.products || '',
      totalQuantity: order.totalQuantity || 0,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      codAmount: order.codAmount || (order.totalAmount || 0) - (order.depositAmount || 0),
      customerAge: order.customerAge || '',
      customerHeight: order.customerHeight || '',
      customerWeight: order.customerWeight || '',
      medicalHistory: order.medicalHistory || '',
      serviceWechat: order.serviceWechat || '',
      // 🔥 新增字段
      markType: order.markType || '',
      salesPersonName: order.salesPersonName || order.createdBy || '',
      paymentMethod: order.paymentMethod || '',
      orderSource: order.orderSource || '',
      customFields: order.customFields || {},
      remark: order.remark || '',
      createTime: order.createTime || '',
      status: order.status || '',
      shippingStatus: order.shippingStatus || ''
    }))

    await exportBatchOrders(exportData, userStore.isAdmin)

    ElMessage.success(`成功导出 ${selectedOrders.value?.length || 0} 条订单数据`)

  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    loading.value = false
  }
}

// 导出订单
const handleExport = async () => {
  try {
    loading.value = true

    const exportData: ExportOrder[] = filteredOrderList.value.map(order => ({
      orderNumber: order.orderNumber || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      products: Array.isArray(order.products)
        ? order.products.map((p: any) => `${p.name} x${p.quantity}`).join(', ')
        : order.products || '',
      totalQuantity: order.totalQuantity || 0,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      codAmount: order.codAmount || (order.totalAmount || 0) - (order.depositAmount || 0),
      customerAge: order.customerAge || '',
      customerHeight: order.customerHeight || '',
      customerWeight: order.customerWeight || '',
      medicalHistory: order.medicalHistory || '',
      serviceWechat: order.serviceWechat || '',
      // 🔥 新增字段
      markType: order.markType || '',
      salesPersonName: order.salesPersonName || order.createdBy || '',
      paymentMethod: order.paymentMethod || '',
      orderSource: order.orderSource || '',
      customFields: order.customFields || {},
      remark: order.remark || '',
      createTime: order.createTime || '',
      status: order.status || '',
      shippingStatus: order.shippingStatus || ''
    }))

    await exportBatchOrders(exportData, userStore.isAdmin)

    ElMessage.success(`成功导出 ${exportData.length} 条订单数据`)

  } catch {
    ElMessage.error('导出失败，请重试')
  } finally {
    loading.value = false
  }
}

// 更新快速筛选计数
const updateQuickFilterCounts = () => {
  // 应用数据范围控制后的订单列表
  const accessibleOrders = applyDataScopeControl(orderList.value)

  quickFilters.value.forEach(filter => {
    if (filter.key === 'all') {
      filter.count = accessibleOrders.length
    } else {
      filter.count = accessibleOrders.filter(order => order.status === filter.key).length
    }
  })
}

const handleAdd = () => {
  safeNavigator.push('/order/add')
}

const handleView = (row: OrderItem) => {
  safeNavigator.push(`/order/detail/${row.id}`)
}

const handleEdit = (row: OrderItem) => {
  safeNavigator.push(`/order/edit/${row.id}`)
}









const handleCancel = (row: OrderItem) => {
  // 设置订单信息
  cancelOrderInfo.value = {
    id: row.id,
    orderNumber: row.orderNumber,
    customerName: row.customerName,
    totalAmount: row.totalAmount
  }

  // 重置表单
  cancelForm.reason = ''
  cancelForm.description = ''

  // 显示弹窗
  showCancelDialog.value = true
}

// 关闭取消订单弹窗
const handleCloseCancelDialog = () => {
  showCancelDialog.value = false
  if (cancelFormRef.value) {
    cancelFormRef.value.clearValidate()
  }
}

// 提交取消申请
const submitCancelRequest = async () => {
  if (!cancelFormRef.value) return

  try {
    await cancelFormRef.value.validate()

    cancelSubmitting.value = true

    // 调用API提交取消申请
    await orderApi.cancelRequest({
      orderId: cancelOrderInfo.value.id,
      reason: cancelForm.reason,
      description: cancelForm.description,
      operatorId: userStore.user?.id || 'current_user'
    })

    // 更新本地数据状态为"待取消"
    const order = orderList.value.find(item => item.id === cancelOrderInfo.value.id)
    if (order) {
      order.status = 'pending_cancel'
      order.cancelStatus = 'pending'
      order.cancelReason = cancelForm.reason
      order.cancelDescription = cancelForm.description
      order.cancelRequestTime = new Date().toLocaleString('zh-CN')
      order.updateTime = new Date().toLocaleString('zh-CN')

      // 发送通知消息
      notificationStore.sendMessage(
        notificationStore.MessageType.ORDER_CANCEL_REQUEST,
        `订单 ${order.orderNumber} 的取消申请已提交，等待管理员审核`,
        {
          relatedId: order.id,
          relatedType: 'order',
          actionUrl: `/order/detail/${order.id}`
        }
      )
    }

    ElMessage.success('取消申请已提交，等待管理员审核')
    showCancelDialog.value = false
    updateQuickFilterCounts()

  } catch (error) {
    console.error('取消订单申请失败:', error)

    // 提取具体的错误信息
    let errorMessage = '提交取消申请失败，请重试'
    if (error && typeof error === 'object') {
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      } else if (error.data?.message) {
        errorMessage = error.data.message
      } else if (error.message) {
        errorMessage = error.message
      }
    }

    ElMessage.error(errorMessage)
  } finally {
    cancelSubmitting.value = false
  }
}



const handleAfterSales = (row: OrderItem) => {
  // 跳转到新建售后页面，并通过路由参数传递订单信息
  safeNavigator.push({
    path: '/service/add',
    query: {
      orderNumber: row.orderNumber,
      customerId: row.customerId,
      customerName: row.customerName,
      customerPhone: row.customerPhone,
      products: JSON.stringify(row.products)
    }
  })
}

// 取消订单审核相关处理函数
const handleOpenCancelAudit = () => {
  showCancelAuditDialog.value = true
  auditActiveTab.value = 'pending'
  selectedAuditOrders.value = []
}

const handleCloseCancelAudit = () => {
  showCancelAuditDialog.value = false
  selectedAuditOrders.value = []
}

const handleAuditTabChange = (tabName: string) => {
  auditActiveTab.value = tabName
  selectedAuditOrders.value = []
}

const handleAuditSelectionChange = (selection: OrderItem[]) => {
  selectedAuditOrders.value = selection
}

const handleAuditApprove = async () => {
  if (selectedAuditOrders.value.length === 0) {
    ElMessage.warning('请选择要审核的订单')
    return
  }

  // 防止重复提交
  if (auditSubmitting.value) {
    return
  }

  try {
    auditSubmitting.value = true
    const orderIds = selectedAuditOrders.value.map(order => order.id)

    // 调用审核通过接口（确保不会抛出异常）
    const result = await orderStore.approveCancelOrders(orderIds)

    // 检查结果
    if (result === false || result === undefined) {
      ElMessage.error('审核通过失败，请重试')
      return
    }

    // 只有成功时才显示成功消息
    ElMessage.success('审核通过成功')
    selectedAuditOrders.value = []

    // 刷新订单列表
    await loadOrderList()

    // 关闭审核弹窗
    handleCloseCancelAudit()
  } catch (error) {
    console.error('审核通过失败:', error)
    ElMessage.error('审核通过失败，请重试')
  } finally {
    auditSubmitting.value = false
  }
}

const handleAuditReject = async () => {
  if (selectedAuditOrders.value.length === 0) {
    ElMessage.warning('请选择要审核的订单')
    return
  }

  // 防止重复提交
  if (auditSubmitting.value) {
    return
  }

  try {
    auditSubmitting.value = true
    const orderIds = selectedAuditOrders.value.map(order => order.id)

    // 调用审核拒绝接口（确保不会抛出异常）
    const result = await orderStore.rejectCancelOrders(orderIds)

    // 检查结果
    if (result === false || result === undefined) {
      ElMessage.error('审核拒绝失败，请重试')
      return
    }

    // 只有成功时才显示成功消息
    ElMessage.success('审核拒绝成功')
    selectedAuditOrders.value = []

    // 刷新订单列表
    await loadOrderList()

    // 关闭审核弹窗
    handleCloseCancelAudit()
  } catch (error) {
    console.error('审核拒绝失败:', error)
    ElMessage.error('审核拒绝失败，请重试')
  } finally {
    auditSubmitting.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  // 使用计算属性filteredOrderList，不需要重新加载数据
  updatePagination()
}

const handleReset = () => {
  searchForm.orderNumber = ''
  searchForm.customerName = ''
  searchForm.status = []
  searchForm.markType = ''
  searchForm.dateRange = []
  searchForm.minAmount = undefined
  searchForm.maxAmount = undefined
  searchForm.operator = ''
  searchForm.productName = ''
  searchForm.customerPhone = ''
  searchForm.paymentMethod = ''
  searchForm.onlyAuditPendingSubmitted = false
  searchForm.onlyResubmittable = false
  activeQuickFilter.value = 'all'
  advancedSearchVisible.value = false
  pagination.page = 1
  updatePagination()
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  updatePagination()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  updatePagination()
}

const updatePagination = () => {
  pagination.total = filteredOrderList.value.length
}

// 防止重复加载的标志
let isLoadingOrders = false
let lastLoadTime = 0
const MIN_LOAD_INTERVAL = 500 // 最小加载间隔500ms

const loadOrderList = async (force = false) => {
  // 防止重复加载
  const now = Date.now()
  if (!force && (isLoadingOrders || (now - lastLoadTime < MIN_LOAD_INTERVAL))) {
    console.log('[订单列表] 跳过重复加载')
    return
  }

  try {
    isLoadingOrders = true
    loading.value = true
    lastLoadTime = now

    // 尝试从API加载订单数据
    const apiOrders = await orderStore.loadOrdersFromAPI()

    // 如果API返回空数据且本地也没有数据，则初始化模拟数据（仅开发环境）
    if (apiOrders.length === 0 && orderStore.orders.length === 0) {
      console.log('[订单列表] API无数据，检查是否需要初始化本地数据')
      // 在生产环境不初始化模拟数据
      if (import.meta.env.DEV) {
        orderStore.initializeWithMockData()
      }
    }

    updatePagination()
    updateQuickFilterCounts()
  } catch (error) {
    console.error('加载订单列表失败:', error)
    // 如果API失败，尝试使用本地数据
    if (orderStore.orders.length === 0 && import.meta.env.DEV) {
      orderStore.initializeWithMockData()
    }
    updatePagination()
    updateQuickFilterCounts()
  } finally {
    loading.value = false
    isLoadingOrders = false
  }
}

// 订单事件处理函数
const handleOrderTransferred = (transferredOrders: any[]) => {
  console.log('[订单列表] 收到订单流转事件:', transferredOrders)
  loadOrderList()
  ElMessage.success(`${transferredOrders.length} 个订单已自动流转到审核`)
}

const handleRefreshOrderList = () => {
  console.log('[订单列表] 收到刷新列表事件')
  loadOrderList()
}

const handleOrderStatusChanged = (order: unknown) => {
  console.log('[订单列表] 订单状态变更:', order)
  loadOrderList()
}

// 窗口大小变化监听器
const handleResize = () => {
  // 触发tableHeight重新计算
}

onMounted(async () => {
  // 🔥 先加载自定义字段列配置（从系统设置）
  await loadCustomFieldColumns()

  // 加载列设置（从数据库同步）
  loadColumnSettings()

  // 加载支付方式选项（从系统设置API）
  loadPaymentMethods()

  // 并行加载用户列表和订单列表，提高加载速度
  const loadPromises = [
    userStore.loadUsers(),
    loadOrderList(true) // 强制加载，忽略防抖
  ]

  // 等待所有数据加载完成
  await Promise.all(loadPromises)

  // 注意：不在页面加载时立即检查流转，由后台定时任务统一处理
  // 避免在创建订单后立即进入列表页时误触发流转

  // 初始化物流状态同步（延迟执行，不阻塞页面渲染）
  setTimeout(() => {
    orderStore.setupLogisticsEventListener()
    orderStore.startLogisticsAutoSync()
  }, 100)

  // 添加窗口大小变化监听器
  window.addEventListener('resize', handleResize)

  // 监听物流状态更新事件
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.addEventListener('orderUpdated', handleOrderUpdate)
  window.addEventListener('todoStatusUpdated', handleTodoStatusUpdate)

  // 监听订单事件总线 - 实现订单状态同步
  eventBus.on(EventNames.ORDER_TRANSFERRED, handleOrderTransferred)
  eventBus.on(EventNames.REFRESH_ORDER_LIST, handleRefreshOrderList)
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)
})

// 处理订单状态更新事件（静默刷新，不显示提示）
const handleOrderStatusUpdate = (event: CustomEvent) => {
  console.log('订单状态已更新，刷新订单列表', event.detail)
  loadOrderList()
}

// 处理订单更新事件（静默刷新，不显示提示）
const handleOrderUpdate = (event: CustomEvent) => {
  console.log('订单数据已更新，刷新订单列表', event.detail)
  loadOrderList()
}

// 处理待办状态更新事件（静默刷新，不显示提示）
const handleTodoStatusUpdate = (event: CustomEvent) => {
  console.log('待办状态已更新，刷新订单列表', event.detail)
  loadOrderList()
}

// 监听路由查询参数变化，当从新建订单页面跳转过来时自动刷新
watch(() => route.query, async (newQuery, oldQuery) => {
  // 只有当refresh参数从无到有变化时才刷新，避免重复刷新
  if (newQuery.refresh === 'true' && oldQuery?.refresh !== 'true') {
    console.log('[订单列表] 检测到refresh参数，刷新订单数据...')
    // 延迟一点执行，确保onMounted的加载已完成
    setTimeout(async () => {
      // 🔥 从API重新加载最新订单数据
      await orderStore.loadOrdersFromAPI(true)
      // 重新加载订单列表
      loadOrderList()
      ElMessage.success('订单已成功创建，列表已刷新')
      // 清除查询参数，避免重复刷新
      safeNavigator.replace({ path: '/order/list' })
    }, 100)
  }
}, { immediate: false })

onUnmounted(() => {
  // 清理窗口大小变化监听器
  window.removeEventListener('resize', handleResize)

  // 清理物流状态更新事件监听器
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.removeEventListener('todoStatusUpdated', handleTodoStatusUpdate)

  // 清理订单事件总线监听
  eventBus.off(EventNames.ORDER_TRANSFERRED, handleOrderTransferred)
  eventBus.off(EventNames.REFRESH_ORDER_LIST, handleRefreshOrderList)
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleOrderStatusChanged)

  // 清理所有可能存在的blob URL
  const existingLinks = document.querySelectorAll('a[href^="blob:"]')
  existingLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('blob:')) {
      URL.revokeObjectURL(href)
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  })
})
</script>

<style scoped>
.order-list {
  padding: 20px;
  min-height: 100vh;
  display: block !important;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

/* 快速筛选样式 */
.quick-filters-row {
  display: flex;
  align-items: center;
  gap: 30px;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.quick-filters {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.quick-filters.status-filters {
  flex: 1;
}

.quick-filters.date-filters {
  flex-shrink: 0;
}

.filter-tag {
  margin-right: 12px;
  margin-bottom: 8px;
  padding: 8px 16px;
  border-radius: 20px;
  cursor: pointer;
  transition: all 0.3s;
  font-size: 14px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.filter-tag.date-tag {
  margin-right: 8px;
}

.filter-tag:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.date-filters .filter-tag:hover {
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}



/* 搜索区域样式 */
.search-card {
  margin-bottom: 20px;
  display: block !important;
  visibility: visible !important;
  opacity: 1 !important;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

.search-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;
}

.search-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.search-actions {
  display: flex;
  gap: 12px;
}

.basic-search {
  margin-bottom: 0;
}

.basic-search .el-form-item {
  margin-bottom: 18px;
  margin-right: 20px;
}

/* 高级搜索面板 */
.advanced-search {
  border-top: 1px solid #ebeef5;
  padding-top: 20px;
  margin-top: 16px;
}

.advanced-search .el-form-item {
  margin-bottom: 18px;
}

/* 表格式卡片容器样式 */
.table-card-container {
  margin-bottom: 20px;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  background: #ffffff;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  background: #fafafa;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 500;
  color: #303133;
}

.selected-info {
  font-size: 14px;
  color: #409eff;
  font-weight: normal;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  padding-right: 8px; /* 让按钮与容器边缘保持等距 */
}

/* 分页容器样式 */
.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #ebeef5;
  background: #fafafa;
}

.pagination-info {
  font-size: 14px;
  color: #606266;
}

.pagination {
  display: flex;
  justify-content: flex-end;
}

/* 商品列表样式 */
.product-list {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.product-item {
  font-size: 12px;
  color: #606266;
  padding: 2px 0;
  border-bottom: 1px solid #f0f0f0;
}

.product-item:last-child {
  border-bottom: none;
}

/* 金额样式 */
.amount-text {
  font-weight: 600;
  color: #e6a23c;
}

.deposit-text {
  color: #67c23a;
  font-weight: 500;
}

.no-deposit {
  color: #c0c4cc;
}





/* 响应式设计 */
@media (max-width: 768px) {
  .order-list {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .quick-filters {
    text-align: center;
  }

  .filter-tag {
    margin-right: 8px;
    margin-bottom: 8px;
    padding: 6px 12px;
    font-size: 13px;
  }

  .search-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .basic-search {
    flex-direction: column;
  }

  .basic-search .el-form-item {
    margin-right: 0;
    width: 100%;
  }

  .pagination-container {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .pagination {
    width: 100%;
    justify-content: center;
  }

  .table-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .table-actions {
    width: 100%;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .quick-filters {
    text-align: left;
  }

  .filter-tag {
    display: flex;
    justify-content: center;
    width: 100%;
    margin-right: 0;
  }

  .table-actions {
    flex-direction: column;
    gap: 8px;
  }

  .order-details {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .audit-footer {
    flex-direction: column;
    gap: 8px;
  }

  .audit-footer .el-button {
    width: 100%;
  }
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

/* 加载状态 */
.loading-overlay {
  position: relative;
}

.loading-overlay::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  z-index: 1000;
}

/* 状态修改对话框样式 */
.status-modify-content {
  padding: 10px 0;
}

.order-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 6px;
}

.order-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.info-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  color: #606266;
  font-size: 14px;
  min-width: 80px;
}

.info-row .value {
  color: #303133;
  font-size: 14px;
  font-weight: 500;
}

.status-modify h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 操作按钮样式 */
.operation-buttons {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
}

.operation-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
  min-width: auto;
}

.operation-buttons .el-button + .el-button {
  margin-left: 0;
}

/* 取消订单弹窗样式 */
.cancel-order-form {
  padding: 8px 0;
}

.cancel-order-form .order-info {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 24px;
}

.cancel-order-form .order-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
  border-bottom: 1px solid #e9ecef;
  padding-bottom: 8px;
}

.cancel-order-form .order-info p {
  margin: 8px 0;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.cancel-order-form .order-info strong {
  color: #303133;
  font-weight: 600;
  min-width: 80px;
  display: inline-block;
}

.cancel-order-form .el-form {
  margin-top: 8px;
}

.cancel-order-form .el-form-item {
  margin-bottom: 20px;
}

.cancel-order-form .el-textarea__inner {
  resize: none;
  font-family: inherit;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e9ecef;
}




</style>
