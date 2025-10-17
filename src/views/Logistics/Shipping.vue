<template>
  <div class="shipping-list">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">发货列表</h1>
    </div>

    <!-- 数据概览卡片 -->
    <div class="metrics-grid">
      <!-- 第一行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon total-orders">
            <el-icon><Box /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.totalOrders }}</div>
            <div class="metric-label">待发货订单</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon total-amount">
            <el-icon><Money /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.totalAmount) }}</div>
            <div class="metric-label">待发货金额</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon shipped-today">
            <el-icon><Van /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.shippedToday }}</div>
            <div class="metric-label">今日发货</div>
          </div>
        </div>
      </div>

      <!-- 第二行 -->
      <div class="metrics-row">
        <div class="metric-card">
          <div class="metric-icon urgent-orders">
            <el-icon><Warning /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.urgentOrders }}</div>
            <div class="metric-label">紧急订单</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon cod-orders">
            <el-icon><CreditCard /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">{{ overviewData.codOrders }}</div>
            <div class="metric-label">代收款订单</div>
          </div>
        </div>
        
        <div class="metric-card">
          <div class="metric-icon cod-amount">
            <el-icon><Coin /></el-icon>
          </div>
          <div class="metric-content">
            <div class="metric-value">¥{{ formatNumber(overviewData.codAmount) }}</div>
            <div class="metric-label">代收款金额</div>
          </div>
        </div>
      </div>
    </div>

    <!-- 快速筛选 -->
    <div class="quick-filters">
      <el-button 
        v-for="filter in quickFilters" 
        :key="filter.value"
        :type="selectedQuickFilter === filter.value ? 'primary' : ''"
        @click="handleQuickFilter(filter.value)"
        class="filter-btn"
      >
        {{ filter.label }}
      </el-button>
    </div>

    <!-- 筛选器 -->
    <div class="filter-section">
      <div class="filter-left">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          class="date-picker"
        />
        <el-select 
          v-model="selectedDepartment" 
          placeholder="选择部门" 
          class="department-select"
          size="default"
        >
          <el-option label="全部部门" value="" />
          <el-option 
            v-for="dept in departmentStore.departmentList" 
            :key="dept.id" 
            :label="dept.name" 
            :value="dept.id" 
          />
        </el-select>
        <el-input
          v-model="searchOrderNo"
          placeholder="订单号"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Search /></el-icon>
          </template>
        </el-input>
        <el-input
          v-model="searchCustomerPhone"
          placeholder="客户号码"
          class="search-input"
          clearable
        >
          <template #prefix>
            <el-icon><Phone /></el-icon>
          </template>
        </el-input>
      </div>
      <div class="filter-right">
        <el-button type="primary" @click="queryData" class="query-btn">
          <el-icon><Search /></el-icon>
          查询
        </el-button>
      </div>
    </div>

    <!-- 状态导航标签页 -->
    <div class="status-tabs">
      <div class="tabs-header">
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="shipping-tabs">
        <el-tab-pane label="待发货" name="pending">
          <template #label>
            <span class="tab-label">
              <el-icon><Box /></el-icon>
              待发货
              <el-badge :value="tabCounts.pending" :max="999" class="tab-badge" />
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="已发货" name="shipped">
          <template #label>
            <span class="tab-label">
              <el-icon><Van /></el-icon>
              已发货
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="退回" name="returned">
          <template #label>
            <span class="tab-label">
              <el-icon><Back /></el-icon>
              退回
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="取消" name="cancelled">
          <template #label>
            <span class="tab-label">
              <el-icon><Close /></el-icon>
              取消
            </span>
          </template>
        </el-tab-pane>
        <el-tab-pane label="草稿" name="draft">
          <template #label>
            <span class="tab-label">
              <el-icon><Document /></el-icon>
              草稿
              <el-badge :value="tabCounts.draft" :max="999" class="tab-badge draft-badge" />
            </span>
          </template>
        </el-tab-pane>
        </el-tabs>
        <div class="tabs-actions">
          <el-button type="primary" @click="showFullscreenView" class="fullscreen-btn">
            <el-icon><FullScreen /></el-icon>
            全屏查看
          </el-button>
        </div>
      </div>
    </div>

    <!-- 订单列表 -->
    <DynamicTable
      :data="orderList"
      :columns="tableColumns"
      storage-key="shipping-list-columns"
      :title="tableTitle"
      :loading="loading"
      :show-selection="true"
      :show-index="true"
      :pagination="{
        currentPage: currentPage,
        pageSize: pageSize,
        total: total
      }"
      @selection-change="handleSelectionChange"
      @size-change="handlePageSizeChange"
      @current-change="handleCurrentChange"
      :row-class-name="getRowClassName"
    >
      <!-- 头部操作按钮 -->
      <template #header-actions>
        <el-button @click="exportSelected" class="export-btn" :disabled="selectedOrders.length === 0">
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button type="success" @click="batchShip" class="batch-ship-btn" :disabled="selectedOrders.length === 0">
          <el-icon><Van /></el-icon>
          批量发货
        </el-button>
      </template>

      <!-- 订单号列 -->
      <template #orderNo="{ row }">
        <el-link type="primary" @click="viewOrderDetail(row)">{{ row.orderNo }}</el-link>
      </template>

      <!-- 状态列 -->
      <template #status="{ row }">
        <el-tag :type="getOrderStatusType(row.status)" size="small">
          {{ orderStore.getStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 下单时间列 -->
      <template #createTime="{ row }">
        <span>{{ formatDateTime(row.createTime) }}</span>
      </template>

      <!-- 商品列 -->
      <template #products="{ row }">
        <div class="product-list">
          <div v-for="(product, index) in row.products" :key="index" class="product-item">
            {{ product.name }} × {{ product.quantity }}
          </div>
        </div>
      </template>

      <!-- 订单总额列 -->
      <template #totalAmount="{ row }">
        <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
      </template>

      <!-- 定金列 -->
      <template #deposit="{ row }">
        <span class="amount">¥{{ formatNumber(row.deposit) }}</span>
      </template>

      <!-- 代收款金额列 -->
      <template #codAmount="{ row }">
        <span class="amount highlight">¥{{ formatNumber(row.codAmount) }}</span>
      </template>

      <!-- 订单备注列 -->
      <template #remark="{ row }">
        <span v-if="row.remark" class="remark-text" v-html="highlightKeywords(row.remark)"></span>
        <span v-else class="no-remark">无备注</span>
      </template>

      <!-- 物流公司列 -->
      <template #expressCompany="{ row }">
        <el-tag v-if="row.expressCompany" type="info">
          {{ getExpressCompanyName(row.expressCompany) }}
        </el-tag>
        <span v-else class="no-data">未选择</span>
      </template>

      <!-- 物流单号列 -->
      <template #expressNo="{ row }">
        <div v-if="row.expressNo" class="express-no">
          <el-link type="primary" @click="trackLogistics(row)">
            {{ row.expressNo }}
          </el-link>
          <el-button 
            size="small" 
            type="text" 
            @click="copyExpressNo(row.expressNo)"
            class="copy-btn"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
        <span v-else class="no-data">未发货</span>
      </template>

      <!-- 物流状态列 -->
      <template #logisticsStatus="{ row }">
        <el-tag 
          v-if="row.logisticsStatus" 
          :type="getLogisticsStatusType(row.logisticsStatus)"
        >
          {{ getLogisticsStatusText(row.logisticsStatus) }}
        </el-tag>
        <span v-else class="no-data">-</span>
      </template>

      <!-- 操作记录列 -->
      <template #lastOperation="{ row }">
        <div v-if="row.lastOperation" class="operation-info">
          <div class="operation-action">{{ row.lastOperation.action }}</div>
          <div class="operation-meta">
            <span class="operation-user">{{ row.lastOperation.operator }}</span>
            <span class="operation-time">{{ formatDateTime(row.lastOperation.time) }}</span>
          </div>
        </div>
        <span v-else class="no-data">暂无记录</span>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <div class="action-buttons">
          <el-button size="small" type="primary" @click="viewOrderDetail(row)">
            <el-icon><View /></el-icon>
            查看
          </el-button>
          
          <!-- 已退回和已取消订单：只显示查看按钮 -->
          <template v-if="activeTab === 'returned' || activeTab === 'cancelled'">
            <!-- 只显示查看按钮，其他操作按钮都隐藏 -->
          </template>
          
          <!-- 草稿订单的特殊操作 -->
          <template v-else-if="row.status === 'draft'">
            <el-button size="small" type="warning" @click="editDraft(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="success" @click="submitDraft(row)">
              <el-icon><Check /></el-icon>
              提交
            </el-button>
            <el-button size="small" type="danger" @click="deleteDraft(row)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </template>
          
          <!-- 被退回订单的特殊操作 -->
          <template v-else-if="row.status === 'rejected_returned'">
            <el-button size="small" type="warning" @click="editReturnedOrder(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button size="small" type="success" @click="submitForAudit(row)">
              <el-icon><Check /></el-icon>
              提审
            </el-button>
            <el-button size="small" type="danger" @click="cancelReturnedOrder(row)">
              <el-icon><Close /></el-icon>
              取消
            </el-button>
          </template>
          
          <!-- 非草稿订单的常规操作 -->
          <template v-else>
            <el-button size="small" type="success" @click="printLabel(row)">
              <el-icon><Printer /></el-icon>
              打印面单
            </el-button>
            <el-button size="small" type="warning" @click="shipOrder(row)">
              <el-icon><Van /></el-icon>
              发货
            </el-button>
            <el-dropdown @command="handleCommand" trigger="click">
              <el-button size="small">
                更多<el-icon class="el-icon--right"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{action: 'export', row}">
                    <el-icon><Download /></el-icon>
                    导出
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'return', row}">
                    <el-icon><Back /></el-icon>
                    退回
                  </el-dropdown-item>
                  <el-dropdown-item :command="{action: 'cancel', row}">
                    <el-icon><Close /></el-icon>
                    取消
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </div>
      </template>
    </DynamicTable>

    <!-- 订单详情弹窗 -->
    <OrderDetailDialog 
      v-model:visible="orderDetailVisible"
      :order="selectedOrder"
    />

    <!-- 打印面单弹窗 -->
    <PrintLabelDialog 
      v-model:visible="printLabelVisible"
      :order="selectedOrder"
    />

    <!-- 发货弹窗 -->
    <ShippingDialog 
      v-model:visible="shipOrderVisible"
      :order="selectedOrder"
      @shipped="handleOrderShipped"
    />

    <!-- 批量发货弹窗 -->
    <BatchShippingDialog 
      v-model:visible="batchShipVisible"
      :selectedOrders="selectedOrders"
      @batch-shipped="handleBatchShipped"
    />

    <!-- 退回确认弹窗 -->
    <ReturnOrderDialog 
      v-model:visible="returnOrderVisible"
      :order="selectedOrder"
      @returned="handleOrderReturned"
    />

    <!-- 取消确认弹窗 -->
    <CancelOrderDialog 
      v-model:visible="cancelOrderVisible"
      :order="selectedOrder"
      @cancelled="handleOrderCancelled"
    />

    <!-- 全屏查看对话框 -->
    <el-dialog
      v-model="fullscreenVisible"
      title="发货列表 - 全屏查看"
      width="95%"
      class="fullscreen-dialog"
    >
      <div class="fullscreen-content">
        <!-- 筛选器 -->
        <div class="fullscreen-filters">
          <div class="filter-left">
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              class="date-picker"
            />
            <el-select 
              v-model="selectedDepartment" 
              placeholder="选择部门" 
              class="department-select"
            >
              <el-option label="全部部门" value="" />
              <el-option label="销售一部" value="sales1" />
              <el-option label="销售二部" value="sales2" />
              <el-option label="市场部" value="marketing" />
            </el-select>
            <el-input
              v-model="searchOrderNo"
              placeholder="订单号"
              class="search-input"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-input
              v-model="searchCustomerPhone"
              placeholder="客户号码"
              class="search-input"
              clearable
            >
              <template #prefix>
                <el-icon><Phone /></el-icon>
              </template>
            </el-input>
          </div>
          <div class="filter-right">
            <el-button type="primary" @click="queryData" class="query-btn">
              <el-icon><Search /></el-icon>
              查询
            </el-button>
          </div>
        </div>

        <!-- 完整的发货列表 -->
        <div class="fullscreen-table">
          <el-table 
            :data="orderList" 
            stripe 
            class="data-table"
            border
            @selection-change="handleSelectionChange"
            :row-class-name="getRowClassName"
            height="calc(100vh - 300px)"
          >
            <el-table-column type="selection" width="50" align="center" />
            <el-table-column type="index" label="序号" width="50" align="center" />
            <el-table-column prop="orderNo" label="订单号" width="120" align="center">
              <template #default="{ row }">
                <el-link type="primary" @click="viewOrderDetail(row)">{{ row.orderNo }}</el-link>
              </template>
            </el-table-column>
            <el-table-column prop="status" label="状态" width="80" align="center">
              <template #default="{ row }">
                <el-tag :type="getOrderStatusType(row.status)" size="small">
              {{ orderStore.getStatusText(row.status) }}
            </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户姓名" width="100" align="center" show-overflow-tooltip />
            <el-table-column prop="phone" label="联系电话" width="120" align="center" show-overflow-tooltip>
              <template #default="{ row }">
                {{ maskPhone(row.phone) }}
              </template>
            </el-table-column>
            <el-table-column prop="address" label="收货地址" width="180" align="left" show-overflow-tooltip />
            <el-table-column prop="productsText" label="商品信息" width="160" align="left" show-overflow-tooltip />
            <el-table-column prop="totalAmount" label="订单金额" width="100" align="center">
              <template #default="{ row }">
                <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="codAmount" label="代收款" width="100" align="center">
              <template #default="{ row }">
                <span class="cod-amount">¥{{ formatNumber(row.codAmount) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="createTime" label="下单时间" width="130" align="center">
              <template #default="{ row }">
                {{ formatDateTime(row.createTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="shipTime" label="发货时间" width="130" align="center">
              <template #default="{ row }">
                {{ formatDateTime(row.shipTime) }}
              </template>
            </el-table-column>
            <el-table-column prop="trackingNo" label="物流单号" width="130" align="center" show-overflow-tooltip />
            <el-table-column prop="logisticsCompany" label="物流公司" width="100" align="center" show-overflow-tooltip />
            <el-table-column prop="remark" label="备注" width="140" align="left" show-overflow-tooltip />
            <el-table-column label="操作" width="200" align="center" fixed="right">
              <template #default="{ row }">
                <div class="operation-buttons">
                  <el-button size="small" type="primary" @click="viewOrderDetail(row)">
                    <el-icon><View /></el-icon>
                    查看详情
                  </el-button>
                  <el-button size="small" type="info" @click="printLabel(row)">
                    <el-icon><Printer /></el-icon>
                    打印面单
                  </el-button>
                  <el-button size="small" type="success" @click="shipOrder(row)" v-if="row.status === 'pending'">
                    <el-icon><Van /></el-icon>
                    发货
                  </el-button>
                </div>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 分页 -->
        <div class="fullscreen-pagination">
          <el-pagination
            v-model:current-page="currentPage"
            v-model:page-size="pageSize"
            :page-sizes="[50, 100, 200]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handlePageSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { 
  Box, Money, Van, Warning, CreditCard, Coin,
  Search, Phone, Download, View, Printer, ArrowDown, Back, Close, Document,
  Edit, Check, Delete, FullScreen, CopyDocument
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'
import { useDepartmentStore } from '@/stores/department'
import { exportBatchOrders, exportSingleOrder, type ExportOrder } from '@/utils/export'
import { useUserStore } from '@/stores/user'
import { maskPhone } from '@/utils/phone'
import { createSafeNavigator } from '@/utils/navigation'
import OrderDetailDialog from './components/OrderDetailDialog.vue'
import PrintLabelDialog from './components/PrintLabelDialog.vue'
import ShippingDialog from './components/ShippingDialog.vue'
import BatchShippingDialog from './components/BatchShippingDialog.vue'
import ReturnOrderDialog from './components/ReturnOrderDialog.vue'
import CancelOrderDialog from './components/CancelOrderDialog.vue'
import DynamicTable from '@/components/DynamicTable.vue'

// 初始化
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 数据概览
const overviewData = reactive({
  totalOrders: 0,
  totalAmount: 0,
  shippedToday: 0,
  urgentOrders: 0,
  codOrders: 0,
  codAmount: 0
})

// 快速筛选
const quickFilters = [
  { label: '全部', value: 'all' },
  { label: '今日订单', value: 'today' },
  { label: '昨日订单', value: 'yesterday' },
  { label: '本周订单', value: 'thisWeek' },
  { label: '本月订单', value: 'thisMonth' },
  { label: '今年订单', value: 'thisYear' },
  { label: '紧急订单', value: 'urgent' },
  { label: '代收款订单', value: 'cod' },
  { label: '大额订单', value: 'large' }
]

const selectedQuickFilter = ref('all')

// 状态标签页
const activeTab = ref('pending')
const tabCounts = reactive({
  pending: 0,
  shipped: 0,
  returned: 0,
  cancelled: 0,
  draft: 0
})

// 筛选条件
const dateRange = ref<[string, string] | null>(null)
const selectedDepartment = ref('')
const searchOrderNo = ref('')
const searchCustomerPhone = ref('')

// 列表数据
const orderList = ref([])
const selectedOrders = ref([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = ref(50)
const loading = ref(false)

// 弹窗状态
const orderDetailVisible = ref(false)
const printLabelVisible = ref(false)
const shipOrderVisible = ref(false)
const batchShipVisible = ref(false)
const returnOrderVisible = ref(false)
const cancelOrderVisible = ref(false)
const fullscreenVisible = ref(false)
const selectedOrder = ref(null)

// Store
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()

// 表格标题
const tableTitle = computed(() => {
  const tabNames = {
    pending: '待发货',
    shipped: '已发货',
    returned: '退回',
    cancelled: '取消',
    draft: '草稿'
  }
  return `${tabNames[activeTab.value] || '发货'}列表`
})

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'orderNo',
    label: '订单号',
    width: 140,
    visible: true
  },
  {
    prop: 'status',
    label: '订单状态',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户名字',
    width: 100,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'phone',
    label: '电话',
    width: 120,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'address',
    label: '地址',
    width: 200,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'createTime',
    label: '下单时间',
    width: 150,
    align: 'center',
    visible: true
  },
  {
    prop: 'productsText',
    label: '商品',
    width: 200,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'totalQuantity',
    label: '数量',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'totalAmount',
    label: '订单总额',
    width: 120,
    align: 'center',
    visible: true
  },
  {
    prop: 'deposit',
    label: '定金',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'codAmount',
    label: '代收款金额',
    width: 120,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerAge',
    label: '年龄',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerHeight',
    label: '身高',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'customerWeight',
    label: '体重',
    width: 80,
    align: 'center',
    visible: true
  },
  {
    prop: 'medicalHistory',
    label: '疾病史',
    width: 120,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'serviceWechat',
    label: '客服微信号',
    width: 120,
    align: 'center',
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'remark',
    label: '订单备注',
    width: 150,
    showOverflowTooltip: true,
    visible: true
  },
  {
    prop: 'expressCompany',
    label: '物流公司',
    width: 120,
    align: 'center',
    visible: true
  },
  {
    prop: 'expressNo',
    label: '物流单号',
    width: 150,
    align: 'center',
    visible: true
  },
  {
    prop: 'logisticsStatus',
    label: '物流状态',
    width: 100,
    align: 'center',
    visible: true
  },
  {
    prop: 'lastOperation',
    label: '最近操作',
    width: 200,
    showOverflowTooltip: true,
    visible: false
  }
])

// 格式化数字
const formatNumber = (num: number) => {
  return num.toLocaleString()
}

// 格式化日期时间
const formatDateTime = (dateTime: string) => {
  if (!dateTime) return '-'
  const date = new Date(dateTime)
  return date.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取订单状态类型
const getOrderStatusType = (status: string) => {
  const statusMap = {
    'pending_transfer': 'info',
    'pending_audit': 'warning',
    'audit_rejected': 'danger',
    'pending_shipment': 'primary',
    'shipped': 'success',
    'delivered': 'success',
    'package_exception': 'danger',
    'rejected': 'danger',
    'rejected_returned': 'warning',
    'after_sales_created': 'info',
    'cancelled': 'info',
    'draft': 'info'
  }
  return statusMap[status] || 'info'
}



// 获取标记类型
const getMarkType = (markType: string) => {
  const typeMap = {
    'urgent': 'danger',
    'normal': 'success',
    'cod': 'warning',
    'return': 'info'
  }
  return typeMap[markType] || 'info'
}

// 获取标记文本
const getMarkText = (markType: string) => {
  const textMap = {
    'urgent': '紧急',
    'normal': '正常',
    'cod': '代收款',
    'return': '退回'
  }
  return textMap[markType] || '正常'
}

// 获取行类名
const getRowClassName = ({ row }) => {
  if (row.status === 'urgent') return 'urgent-row'
  if (row.status === 'cod') return 'cod-row'
  return ''
}

// 高亮关键词
const highlightKeywords = (text: string) => {
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = text
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    result = result.replace(regex, `<span class="highlight-keyword">${keyword}</span>`)
  })
  return result
}

// 快速筛选处理
const handleQuickFilter = (value: string) => {
  selectedQuickFilter.value = value
  queryData()
}

// 标签页切换处理
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  currentPage.value = 1 // 重置页码
  queryData()
  updateTabCounts() // 更新标签页数量
}

// 查询数据
const queryData = () => {
  // 模拟查询逻辑
  loadOrderList()
}

// 加载订单列表
const loadOrderList = async () => {
  try {
    loading.value = true
    // 根据当前选中的标签页获取对应状态的订单
    const orders = await orderStore.getOrdersByShippingStatus(activeTab.value)
    
    // 确保返回的是数组
    if (!Array.isArray(orders)) {
      console.error('getOrdersByShippingStatus 返回的不是数组:', orders)
      orderList.value = []
      total.value = 0
      return
    }
    

    
    // 应用筛选条件
    let filteredOrders = [...orders]
    
    // 快速筛选
    if (selectedQuickFilter.value !== 'all') {
      switch (selectedQuickFilter.value) {
        case 'today':
          const today = new Date().toISOString().split('T')[0]
          filteredOrders = filteredOrders.filter(order => 
            order.createTime && order.createTime.startsWith(today)
          )
          break
        case 'yesterday':
          const yesterday = new Date()
          yesterday.setDate(yesterday.getDate() - 1)
          const yesterdayStr = yesterday.toISOString().split('T')[0]
          filteredOrders = filteredOrders.filter(order => 
            order.createTime && order.createTime.startsWith(yesterdayStr)
          )
          break
        case 'thisWeek':
          const now = new Date()
          const startOfWeek = new Date(now)
          const dayOfWeek = now.getDay()
          const diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为一周开始
          startOfWeek.setDate(now.getDate() - diff)
          startOfWeek.setHours(0, 0, 0, 0)
          filteredOrders = filteredOrders.filter(order => {
            if (!order.createTime) return false
            const orderDate = new Date(order.createTime)
            return orderDate >= startOfWeek
          })
          break
        case 'thisMonth':
          const currentMonth = new Date()
          const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
          filteredOrders = filteredOrders.filter(order => {
            if (!order.createTime) return false
            const orderDate = new Date(order.createTime)
            return orderDate >= startOfMonth
          })
          break
        case 'thisYear':
          const currentYear = new Date().getFullYear()
          const startOfYear = new Date(currentYear, 0, 1)
          filteredOrders = filteredOrders.filter(order => {
            if (!order.createTime) return false
            const orderDate = new Date(order.createTime)
            return orderDate >= startOfYear
          })
          break
        case 'urgent':
          filteredOrders = filteredOrders.filter(order => order.status === 'urgent')
          break
        case 'cod':
          filteredOrders = filteredOrders.filter(order => (order.codAmount || 0) > 0)
          break
        case 'large':
          filteredOrders = filteredOrders.filter(order => (order.totalAmount || 0) > 1000)
          break
      }
    }
    
    // 日期范围筛选
    if (dateRange.value && dateRange.value.length === 2) {
      const [startDate, endDate] = dateRange.value
      filteredOrders = filteredOrders.filter(order => {
        const orderDate = order.createTime?.split('T')[0]
        return orderDate >= startDate && orderDate <= endDate
      })
    }
    
    // 部门筛选
    if (selectedDepartment.value) {
      filteredOrders = filteredOrders.filter(order => 
        order.department && order.department === selectedDepartment.value
      )
    }
    
    // 订单号搜索
    if (searchOrderNo.value) {
      filteredOrders = filteredOrders.filter(order => 
        order.orderNo && order.orderNo.includes(searchOrderNo.value)
      )
    }
    
    // 客户电话搜索
    if (searchCustomerPhone.value) {
      filteredOrders = filteredOrders.filter(order => 
        order.phone && order.phone.includes(searchCustomerPhone.value)
      )
    }
    
    // 分页处理
    const startIndex = (currentPage.value - 1) * pageSize.value
    const endIndex = startIndex + pageSize.value
    
    orderList.value = filteredOrders.slice(startIndex, endIndex)
    total.value = filteredOrders.length
    
    // 为每个订单添加真实的操作记录
    orderList.value = orderList.value.map(order => {
      // 获取真实的操作记录
      const operationLogs = orderStore.getOperationLogs(order.id) || []
      
      // 获取最近的操作记录
      const lastOperation = operationLogs.length > 0 
        ? operationLogs[operationLogs.length - 1]
        : {
            action: '创建订单',
            operator: order.createdBy || '系统',
            time: order.createTime
          }
      
      return {
        ...order,
        lastOperation,
        operationLogs
      }
    })
    
    // 同步物流状态（异步执行，不阻塞页面加载）
    syncLogisticsData()
    
    // 更新概览数据
    updateOverviewData(filteredOrders)
  } catch (error) {
    console.error('加载订单列表失败:', error)
    ElMessage.error('加载订单列表失败')
    orderList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

// 更新概览数据
const updateOverviewData = (allOrders = []) => {
  // 确保 allOrders 和 orderList.value 都是数组
  const orders = Array.isArray(allOrders) && allOrders.length > 0 
    ? allOrders 
    : Array.isArray(orderList.value) ? orderList.value : []
  
  overviewData.totalOrders = orders.length
  overviewData.totalAmount = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0)
  
  // 今日发货数量
  const today = new Date().toISOString().split('T')[0]
  overviewData.shippedToday = orders.filter(order => 
    order.shipTime && order.shipTime.startsWith(today)
  ).length
  
  overviewData.urgentOrders = orders.filter(order => order.status === 'urgent').length
  overviewData.codOrders = orders.filter(order => (order.codAmount || 0) > 0).length
  overviewData.codAmount = orders.reduce((sum, order) => sum + (order.codAmount || 0), 0)
}

// 同步物流数据
const syncLogisticsData = async () => {
  try {
    // 批量同步物流状态
    await orderStore.batchSyncLogistics()
    
    // 重新加载当前页面数据以反映最新状态
    const currentOrders = await orderStore.getOrdersByShippingStatus(activeTab.value)
    if (Array.isArray(currentOrders)) {
      // 更新当前显示的订单列表
      const startIndex = (currentPage.value - 1) * pageSize.value
      const endIndex = startIndex + pageSize.value
      const updatedList = currentOrders.slice(startIndex, endIndex)
      
      // 更新操作记录
      orderList.value = updatedList.map(order => {
        const operationLogs = orderStore.getOperationLogs(order.id) || []
        const lastOperation = operationLogs.length > 0 
          ? operationLogs[operationLogs.length - 1]
          : {
              action: '创建订单',
              operator: order.createdBy || '系统',
              time: order.createTime
            }
        
        return {
          ...order,
          lastOperation,
          operationLogs
        }
      })
    }
  } catch (error) {
    console.error('同步物流数据失败:', error)
  }
}

// 定时器引用
let refreshTimer: NodeJS.Timeout | null = null
let syncTimer: NodeJS.Timeout | null = null

// 启动自动同步
const startAutoSync = () => {
  // 启动物流状态自动同步
  orderStore.startLogisticsAutoSync()
  
  // 设置物流事件监听器
  orderStore.setupLogisticsEventListener()
  
  // 每30秒同步物流数据
  syncTimer = setInterval(() => {
    if (!loading.value) {
      syncLogisticsData()
    }
  }, 30000)
  
  // 每60秒刷新订单列表数据
  refreshTimer = setInterval(() => {
    if (!loading.value) {
      loadOrderList()
    }
  }, 60000)
}

// 停止自动同步
const stopAutoSync = () => {
  if (refreshTimer) {
    clearInterval(refreshTimer)
    refreshTimer = null
  }
  if (syncTimer) {
    clearInterval(syncTimer)
    syncTimer = null
  }
  orderStore.stopLogisticsAutoSync()
}

// 选择变化处理
const handleSelectionChange = (selection) => {
  selectedOrders.value = selection
}

// 分页处理
const handlePageSizeChange = (size: number) => {
  pageSize.value = size
  loadOrderList()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  loadOrderList()
}

// 查看订单详情
const viewOrderDetail = (order) => {
  selectedOrder.value = order
  orderDetailVisible.value = true
}

// 全屏查看
const showFullscreenView = () => {
  fullscreenVisible.value = true
}

// 打印面单
const printLabel = (order) => {
  selectedOrder.value = order
  printLabelVisible.value = true
}

// 发货
const shipOrder = (order) => {
  selectedOrder.value = order
  shipOrderVisible.value = true
}

// 批量导出
const exportSelected = async () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要导出的订单')
    return
  }
  
  try {
    // 转换订单数据格式
    const exportData: ExportOrder[] = selectedOrders.value.map(order => ({
      orderNumber: order.orderNumber || '',
      customerName: order.customerName || '',
      customerPhone: order.customerPhone || '',
      receiverName: order.receiverName || '',
      receiverPhone: order.receiverPhone || '',
      receiverAddress: order.receiverAddress || '',
      products: order.productsText || (Array.isArray(order.products) 
        ? order.products.map(p => `${p.name} x${p.quantity}`).join(', ')
        : order.products || ''),
      totalQuantity: Array.isArray(order.products) 
        ? order.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
        : 0,
      totalAmount: order.totalAmount || 0,
      depositAmount: order.depositAmount || 0,
      codAmount: (order.totalAmount || 0) - (order.depositAmount || 0),
      customerAge: order.customerAge || '',
      customerHeight: order.customerHeight || '',
      customerWeight: order.customerWeight || '',
      medicalHistory: order.medicalHistory || '',
      serviceWechat: order.serviceWechat || '',
      remark: order.remark || '',
      createTime: order.createTime || '',
      status: order.status || '',
      shippingStatus: order.shippingStatus || ''
    }))
    
    const filename = exportBatchOrders(exportData, userStore.isAdmin)
    ElMessage.success(`导出成功：${filename}`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

// 批量发货
const batchShip = () => {
  if (selectedOrders.value.length === 0) {
    ElMessage.warning('请选择要发货的订单')
    return
  }
  batchShipVisible.value = true
}

// 命令处理
const handleCommand = async ({ action, row }) => {
  selectedOrder.value = row
  switch (action) {
    case 'export':
      // 单个导出
      try {
        const exportData: ExportOrder = {
          orderNumber: row.orderNumber || '',
          customerName: row.customerName || '',
          customerPhone: row.customerPhone || '',
          receiverName: row.receiverName || '',
          receiverPhone: row.receiverPhone || '',
          receiverAddress: row.receiverAddress || '',
          products: row.productsText || (Array.isArray(row.products) 
            ? row.products.map(p => `${p.name} x${p.quantity}`).join(', ')
            : row.products || ''),
          totalQuantity: Array.isArray(row.products) 
            ? row.products.reduce((sum, p) => sum + (p.quantity || 0), 0)
            : 0,
          totalAmount: row.totalAmount || 0,
          depositAmount: row.depositAmount || 0,
          codAmount: (row.totalAmount || 0) - (row.depositAmount || 0),
          customerAge: row.customerAge || '',
          customerHeight: row.customerHeight || '',
          customerWeight: row.customerWeight || '',
          medicalHistory: row.medicalHistory || '',
          serviceWechat: row.serviceWechat || '',
          remark: row.remark || '',
          createTime: row.createTime || '',
          status: row.status || '',
          shippingStatus: row.shippingStatus || ''
        }
        
        const filename = exportSingleOrder(exportData, userStore.isAdmin)
        ElMessage.success(`导出成功：${filename}`)
      } catch (error) {
        console.error('导出失败:', error)
        ElMessage.error('导出失败，请重试')
      }
      break
    case 'return':
      returnOrderVisible.value = true
      break
    case 'cancel':
      cancelOrderVisible.value = true
      break
  }
}

// 订单发货成功
const handleOrderShipped = (shippingData) => {
  // 更新订单状态为已发货
  const updatedOrder = orderStore.shipOrder(shippingData.orderId, shippingData)
  if (updatedOrder) {
    ElMessage.success('发货成功')
    loadOrderList()
  } else {
    ElMessage.error('发货失败，订单不存在')
  }
}

// 批量发货成功
const handleBatchShipped = (orders) => {
  // 批量更新订单状态
  orders.forEach(order => {
    orderStore.shipOrder(order.orderId, order)
  })
  ElMessage.success(`成功发货 ${orders.length} 个订单`)
  loadOrderList()
}

// 订单退回成功
const handleOrderReturned = (returnData) => {
  // 更新订单状态为退回
  const updatedOrder = orderStore.returnOrder(returnData.orderId, returnData.returnReason)
  if (updatedOrder) {
    ElMessage.success('订单已退回')
    loadOrderList()
  } else {
    ElMessage.error('退回失败，订单不存在')
  }
}

// 订单取消成功
const handleOrderCancelled = (cancelData) => {
  // 更新订单状态为取消
  const updatedOrder = orderStore.cancelOrder(cancelData.orderId, cancelData.cancelReason)
  if (updatedOrder) {
    ElMessage.success('订单已取消')
    loadOrderList()
  } else {
    ElMessage.error('取消失败，订单不存在')
  }
}

// 草稿管理方法
// 编辑草稿
const editDraft = (row) => {
  ElMessage.info('编辑草稿功能开发中...')
  // TODO: 跳转到订单编辑页面或打开编辑弹窗
}

// 提交草稿
const submitDraft = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要提交草稿订单 ${row.orderNumber} 吗？提交后将进入审核流程。`,
      '提交确认',
      {
        confirmButtonText: '确定提交',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 更新订单状态为pending，进入审核流程
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders[orderIndex].status = 'pending'
      orderStore.orders[orderIndex].auditStatus = 'pending'
      // 为正常发货单设置3分钟后流转审核
      if (orderStore.orders[orderIndex].markType === 'normal') {
        const transferTime = new Date(Date.now() + 3 * 60 * 1000)
        orderStore.orders[orderIndex].auditTransferTime = transferTime.toISOString().slice(0, 19).replace('T', ' ')
        orderStore.orders[orderIndex].isAuditTransferred = false
      }
    }
    
    ElMessage.success('草稿已提交，进入审核流程')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提交草稿失败:', error)
      ElMessage.error('提交失败，请重试')
    }
  }
}

// 删除草稿
const deleteDraft = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除草稿订单 ${row.orderNumber} 吗？删除后无法恢复。`,
      '删除确认',
      {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }
    )
    
    // 从订单列表中删除
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders.splice(orderIndex, 1)
    }
    
    ElMessage.success('草稿已删除')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除草稿失败:', error)
      ElMessage.error('删除失败，请重试')
    }
  }
}

// 计算各个标签页的订单数量
const updateTabCounts = async () => {
  try {
    const pendingOrders = await orderStore.getOrdersByShippingStatus('pending')
    const shippedOrders = await orderStore.getOrdersByShippingStatus('shipped')
    const returnedOrders = await orderStore.getOrdersByShippingStatus('returned')
    const cancelledOrders = await orderStore.getOrdersByShippingStatus('cancelled')
    const draftOrders = await orderStore.getOrdersByShippingStatus('draft')
    
    tabCounts.pending = Array.isArray(pendingOrders) ? pendingOrders.length : 0
    tabCounts.shipped = Array.isArray(shippedOrders) ? shippedOrders.length : 0
    tabCounts.returned = Array.isArray(returnedOrders) ? returnedOrders.length : 0
    tabCounts.cancelled = Array.isArray(cancelledOrders) ? cancelledOrders.length : 0
    tabCounts.draft = Array.isArray(draftOrders) ? draftOrders.length : 0
  } catch (error) {
    console.error('更新标签页数量失败:', error)
  }
}

// 被退回订单操作方法
// 编辑被退回订单
const editReturnedOrder = (row) => {
  ElMessage.info('编辑被退回订单功能开发中...')
  // TODO: 跳转到订单编辑页面或打开编辑弹窗
}

// 提审被退回订单
const submitForAudit = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要重新提审订单 ${row.orderNumber} 吗？提审后将重新进入审核流程。`,
      '提审确认',
      {
        confirmButtonText: '确定提审',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    // 使用store的重新提审方法
    const result = orderStore.resubmitForAudit(row.id, userStore.user?.name || '系统')
    
    if (result) {
      ElMessage.success('订单已重新提审，进入审核流程')
      loadOrderList()
      updateTabCounts()
    } else {
      ElMessage.error('重新提审失败，订单状态不符合要求')
    }
  } catch (error) {
    if (error !== 'cancel') {
      console.error('提审失败:', error)
      ElMessage.error('提审失败，请重试')
    }
  }
}

// 取消被退回订单
const cancelReturnedOrder = async (row) => {
  try {
    await ElMessageBox.confirm(
      `确定要取消订单 ${row.orderNumber} 吗？取消后订单状态将变为已取消。`,
      '取消确认',
      {
        confirmButtonText: '确定取消',
        cancelButtonText: '保留',
        type: 'error'
      }
    )
    
    // 更新订单状态为cancelled
    const orderIndex = orderStore.orders.findIndex(order => order.id === row.id)
    if (orderIndex !== -1) {
      orderStore.orders[orderIndex].status = 'cancelled'
      orderStore.orders[orderIndex].shippingStatus = 'cancelled'
    }
    
    ElMessage.success('订单已取消')
    loadOrderList()
    updateTabCounts()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('取消订单失败:', error)
      ElMessage.error('取消失败，请重试')
    }
  }
}

// 获取物流公司名称
const getExpressCompanyName = (code: string) => {
  const companies = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达速递',
    'HTKY': '百世快递',
    'JD': '京东物流',
    'EMS': '中国邮政',
    'DBKD': '德邦快递',
    'UC': '优速快递'
  }
  return companies[code] || code
}

// 获取物流状态类型
const getLogisticsStatusType = (status: string) => {
  const statusTypes = {
    'pending': 'info',
    'picked_up': 'warning',
    'in_transit': 'primary',
    'out_for_delivery': 'warning',
    'delivered': 'success',
    'exception': 'danger',
    'rejected': 'danger',
    'returned': 'info'
  }
  return statusTypes[status] || 'info'
}

// 获取物流状态文本
const getLogisticsStatusText = (status: string) => {
  const statusTexts = {
    'pending': '待揽收',
    'picked_up': '已揽收',
    'in_transit': '运输中',
    'out_for_delivery': '派送中',
    'delivered': '已签收',
    'exception': '异常',
    'rejected': '拒收',
    'returned': '已退回'
  }
  return statusTexts[status] || status
}

// 跟踪物流
const trackLogistics = (row) => {
  if (!row.expressNo || !row.expressCompany) {
    ElMessage.warning('物流信息不完整，无法跟踪')
    return
  }
  
  // 跳转到物流跟踪页面
  safeNavigator.push({
    path: '/logistics/track/detail/' + row.expressNo,
    query: {
      company: row.expressCompany
    }
  })
}

// 复制物流单号
const copyExpressNo = async (expressNo: string) => {
  try {
    await navigator.clipboard.writeText(expressNo)
    ElMessage.success('物流单号已复制到剪贴板')
  } catch (error) {
    // 降级处理：创建临时输入框
    const textArea = document.createElement('textarea')
    textArea.value = expressNo
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('物流单号已复制到剪贴板')
  }
}

// 监听标签页变化，重新加载数据
watch(activeTab, (newTab) => {
  loadOrderList()
  updateTabCounts()
})

// 监听快速筛选变化，重新加载数据
watch(selectedQuickFilter, (newFilter) => {
  loadOrderList()
})

onMounted(() => {
  loadOrderList()
  updateTabCounts()
  startAutoSync() // 启动自动同步
  // 初始化部门数据
  departmentStore.initData()
})

onUnmounted(() => {
  // 清理定时器
  stopAutoSync()
})
</script>

<style scoped>
.shipping-list {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

/* 数据概览卡片样式 */
.metrics-grid {
  margin-bottom: 20px;
}

.metrics-row {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.metric-card {
  flex: 1;
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.metric-card:hover {
  transform: translateY(-2px);
}

.metric-icon {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 15px;
  font-size: 24px;
  color: white;
}

.total-orders { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
.total-amount { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); }
.shipped-today { background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); }
.urgent-orders { background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); }
.cod-orders { background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%); }
.cod-amount { background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%); }

.metric-content {
  flex: 1;
}

.metric-value {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  margin-bottom: 5px;
}

.metric-label {
  font-size: 14px;
  color: #909399;
}

/* 快速筛选样式 */
.quick-filters {
  margin-bottom: 20px;
  display: flex;
  gap: 10px;
}

.filter-btn {
  border-radius: 20px;
}

/* 筛选器样式 */
.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.filter-left {
  display: flex;
  gap: 15px;
  align-items: center;
}

.filter-right {
  display: flex;
  gap: 10px;
}

.date-picker,
.department-select,
.search-input {
  width: 200px;
}

/* 表格样式 */
.order-table {
  background: white;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.data-table {
  width: 100%;
}

.product-list {
  max-height: 60px;
  overflow-y: auto;
}

.product-item {
  padding: 2px 0;
  font-size: 12px;
}

.amount {
  font-weight: 600;
  color: #409eff;
}

.amount.highlight {
  color: #f56c6c;
  font-weight: 700;
}

.remark-text {
  font-size: 12px;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 1px 3px;
  border-radius: 3px;
}

.no-remark {
  color: #c0c4cc;
  font-style: italic;
}

.action-buttons {
  display: flex;
  gap: 5px;
  flex-wrap: wrap;
}

/* 行样式 */
:deep(.urgent-row) {
  background-color: #fef0f0;
}

:deep(.cod-row) {
  background-color: #fdf6ec;
}

/* 分页样式 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 10px;
  color: #606266;
}

.page-size-select {
  width: 120px;
}

/* 标签页样式 */
.status-tabs {
  margin-bottom: 20px;
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: white;
  border-radius: 8px;
  padding: 0 20px 0 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.tabs-actions {
  display: flex;
  align-items: center;
  
  .fullscreen-btn {
    border-radius: 6px;
    font-size: 14px;
    padding: 8px 16px;
    transition: all 0.3s ease;
    
    &:hover {
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
    }
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 5px;
}

/* 草稿标签灰色样式 */
:deep(.draft-badge .el-badge__content) {
  background-color: #909399 !important;
  border-color: #909399 !important;
}

/* 全屏对话框样式 */
:deep(.fullscreen-dialog) {
  .el-dialog {
    border-radius: 8px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    border: 1px solid #e5e7eb;
  }
  
  .el-dialog__header {
    background: #ffffff;
    color: #374151;
    border-radius: 8px 8px 0 0;
    padding: 20px 24px;
    border-bottom: 1px solid #f3f4f6;
  }
  
  .el-dialog__title {
    font-size: 18px;
    font-weight: 500;
    color: #374151;
  }
  
  .el-dialog__headerbtn {
    top: 20px;
    right: 24px;
    
    .el-dialog__close {
      color: #6b7280;
      font-size: 18px;
      
      &:hover {
        color: #374151;
      }
    }
  }
  
  .el-dialog__body {
    padding: 0;
    background: #ffffff;
  }
}

.fullscreen-content {
  min-height: 70vh;
  display: flex;
  flex-direction: column;
}

/* 全屏筛选器样式 */
.fullscreen-filters {
  background: #f9fafb;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
  
  .filter-left {
    display: flex;
    gap: 12px;
    flex-wrap: wrap;
    align-items: center;
  }
  
  .filter-right {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  
  .date-picker,
  .department-select,
  .search-input {
    width: 180px;
  }
  
  .query-btn {
    background: #3b82f6;
    border: 1px solid #3b82f6;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 400;
    color: white;
    transition: all 0.2s ease;
    
    &:hover {
      background: #2563eb;
      border-color: #2563eb;
    }
  }
  
  .export-btn {
    background: #10b981;
    border: 1px solid #10b981;
    border-radius: 6px;
    padding: 8px 16px;
    font-weight: 400;
    color: white;
    transition: all 0.2s ease;
    
    &:hover:not(:disabled) {
      background: #059669;
      border-color: #059669;
    }
    
    &:disabled {
      background: #d1d5db;
      border-color: #d1d5db;
      cursor: not-allowed;
    }
  }
}

/* 全屏表格样式 */
.fullscreen-table {
  flex: 1;
  padding: 20px;
  background: white;
  margin: 0 20px 20px 20px;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  
  :deep(.el-table) {
    border-radius: 6px;
    overflow: hidden;
    border: 1px solid #e5e7eb;
    
    .el-table__header {
      background: #f9fafb;
      
      th {
        background: #f9fafb !important;
        color: #374151;
        font-weight: 500;
        border-bottom: 1px solid #e5e7eb;
        font-size: 14px;
      }
    }
    
    .el-table__body {
      tr {
        transition: all 0.2s ease;
        
        &:hover {
          background: #f8fafc !important;
        }
      }
      
      td {
        border-bottom: 1px solid #f3f4f6;
        padding: 12px 8px;
        font-size: 14px;
      }
    }
  }
  
  .operation-buttons {
    display: flex;
    flex-direction: column;
    gap: 6px;
    align-items: center;
    
    .el-button {
      width: 80px;
      font-size: 12px;
      padding: 6px 8px;
      border-radius: 4px;
      transition: all 0.2s ease;
      
      &.el-button--primary {
        background: #3b82f6;
        border-color: #3b82f6;
        
        &:hover {
          background: #2563eb;
          border-color: #2563eb;
        }
      }
      
      &.el-button--info {
        background: #6b7280;
        border-color: #6b7280;
        
        &:hover {
          background: #4b5563;
          border-color: #4b5563;
        }
      }
      
      &.el-button--success {
        background: #10b981;
        border-color: #10b981;
        
        &:hover {
          background: #059669;
          border-color: #059669;
        }
      }
    }
  }
}

/* 表格文本溢出处理 */
.data-table {
  .el-table__cell {
    .cell {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      word-break: break-all;
    }
  }
  
  /* 产品列表特殊处理 */
  .product-list {
    .product-item {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      line-height: 1.4;
      margin-bottom: 2px;
      
      &:last-child {
        margin-bottom: 0;
      }
    }
  }
  
  /* 备注文本处理 */
  .remark-text {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    max-width: 100%;
  }
}

/* 全屏分页样式 */
.fullscreen-pagination {
  padding: 16px 20px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: center;
  
  :deep(.el-pagination) {
    .el-pager li {
      border-radius: 4px;
      margin: 0 2px;
      transition: all 0.2s ease;
      
      &:hover {
        background: #f3f4f6;
      }
      
      &.is-active {
        background: #3b82f6;
        color: white;
      }
    }
    
    .btn-prev,
    .btn-next {
      border-radius: 4px;
      transition: all 0.2s ease;
      
      &:hover {
        background: #f3f4f6;
      }
    }
  }
}

/* 操作记录样式 */
.operation-info {
  .operation-action {
    font-weight: 500;
    color: #303133;
    margin-bottom: 4px;
    font-size: 13px;
  }
  
  .operation-meta {
    display: flex;
    flex-direction: column;
    gap: 2px;
    
    .operation-user {
      color: #409eff;
      font-size: 12px;
      font-weight: 500;
    }
    
    .operation-time {
      color: #909399;
      font-size: 11px;
    }
  }
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .fullscreen-filters {
    .filter-left {
      width: 100%;
      justify-content: flex-start;
    }
    
    .filter-right {
      width: 100%;
      justify-content: flex-end;
    }
  }
}

@media (max-width: 768px) {
  .fullscreen-filters {
    .date-picker,
    .department-select,
    .search-input {
      width: 150px;
    }
  }
  
  .fullscreen-table {
    margin: 0 12px 12px 12px;
    padding: 16px;
  }
}
</style>