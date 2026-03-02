<template>
  <div class="personal-performance">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>个人业绩</h2>
      <el-button
        v-if="userStore.currentUser?.role === 'super_admin'"
        @click="goToShareSettings"
        type="primary"
        link
        :icon="Setting"
      >
        业绩分享设置
      </el-button>
    </div>

    <!-- 快速筛选和操作栏 -->
    <div class="filters-actions-bar">
      <div class="quick-filters">
        <el-button
          v-for="filter in quickFilters"
          :key="filter.value"
          :type="selectedQuickFilter === filter.value ? 'primary' : ''"
          @click="handleQuickFilter(filter.value)"
          size="default"
        >
          {{ filter.label }}
        </el-button>
      </div>
      <div class="actions-group">
        <el-date-picker
          v-model="dateRange"
          type="daterange"
          range-separator="至"
          start-placeholder="开始日期"
          end-placeholder="结束日期"
          format="YYYY-MM-DD"
          value-format="YYYY-MM-DD"
          @change="handleDateChange"
          size="default"
        />
        <el-button type="primary" @click="queryData" :icon="Search" size="default">查询</el-button>
        <el-button @click="sharePerformance" :icon="Share" size="default">分享业绩</el-button>
        <el-button v-if="canExport" @click="exportData" :icon="Download" size="default">导出数据</el-button>
      </div>
    </div>

    <!-- 业绩概览卡片 -->
    <div class="performance-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon sales">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ performanceData.totalSales }}</div>
                <div class="card-header-row">
                  <div class="card-label">总销售额</div>
                  <div class="card-trend">
                    <span :class="['trend', performanceData.salesTrend > 0 ? 'up' : 'down']">
                      <el-icon><ArrowUp v-if="performanceData.salesTrend > 0" /><ArrowDown v-else /></el-icon>
                      {{ Math.abs(performanceData.salesTrend) }}%
                    </span>
                    <span class="trend-text">{{ trendLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon orders">
                <el-icon><Document /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ typeof performanceData.totalOrders === 'number' ? (performanceData.totalOrders % 1 === 0 ? performanceData.totalOrders : performanceData.totalOrders.toFixed(1)) : performanceData.totalOrders }}</div>
                <div class="card-header-row">
                  <div class="card-label">订单数量</div>
                  <div class="card-trend">
                    <span :class="['trend', performanceData.ordersTrend > 0 ? 'up' : 'down']">
                      <el-icon><ArrowUp v-if="performanceData.ordersTrend > 0" /><ArrowDown v-else /></el-icon>
                      {{ Math.abs(performanceData.ordersTrend) }}%
                    </span>
                    <span class="trend-text">{{ trendLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon customers">
                <el-icon><CircleCheck /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">¥{{ formatNumber(performanceData.signedAmount) }}</div>
                <div class="card-header-row">
                  <div class="card-label">签收业绩</div>
                  <div class="card-trend">
                    <span :class="['trend', performanceData.signedTrend > 0 ? 'up' : 'down']">
                      <el-icon><ArrowUp v-if="performanceData.signedTrend > 0" /><ArrowDown v-else /></el-icon>
                      {{ Math.abs(performanceData.signedTrend) }}%
                    </span>
                    <span class="trend-text">{{ trendLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="card-content">
              <div class="card-icon conversion">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="card-info">
                <div class="card-value">{{ typeof performanceData.signedOrders === 'number' ? (performanceData.signedOrders % 1 === 0 ? performanceData.signedOrders : performanceData.signedOrders.toFixed(1)) : performanceData.signedOrders }}</div>
                <div class="card-header-row">
                  <div class="card-label">签收订单数量</div>
                  <div class="card-trend">
                    <span :class="['trend', performanceData.signedOrdersTrend > 0 ? 'up' : 'down']">
                      <el-icon><ArrowUp v-if="performanceData.signedOrdersTrend > 0" /><ArrowDown v-else /></el-icon>
                      {{ Math.abs(performanceData.signedOrdersTrend) }}%
                    </span>
                    <span class="trend-text">{{ trendLabel }}</span>
                  </div>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 图表区域 -->
    <div class="charts-section">
      <el-row :gutter="20">
        <!-- 销售趋势图 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <div class="card-header">
                <span>销售趋势</span>
                <el-radio-group v-model="salesChartType" size="small" @change="handleChartTypeChange">
                  <el-radio-button label="daily">日</el-radio-button>
                  <el-radio-button label="weekly">周</el-radio-button>
                  <el-radio-button label="monthly">月</el-radio-button>
                  <el-radio-button label="quarterly">季</el-radio-button>
                  <el-radio-button label="yearly">年</el-radio-button>
                  <el-radio-button label="all">全部</el-radio-button>
                </el-radio-group>
              </div>
            </template>
            <div ref="salesChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 订单状态分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>订单状态分布</span>
            </template>
            <div ref="orderStatusChartRef" class="chart-container"></div>
          </el-card>
        </el-col>
      </el-row>

      <el-row :gutter="20" style="margin-top: 20px;">
        <!-- 客户等级分布 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>客户等级分布</span>
            </template>
            <div ref="customerLevelChartRef" class="chart-container"></div>
          </el-card>
        </el-col>

        <!-- 商品销售排行 -->
        <el-col :span="12">
          <el-card class="chart-card">
            <template #header>
              <span>商品销售排行</span>
            </template>
            <div ref="productRankingChartRef" class="chart-container product-ranking-chart"></div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 详细数据表格 -->
    <el-card class="data-table-card">
      <template #header>
        <div class="card-header">
          <span>详细数据</span>
          <el-tabs v-model="activeTab" @tab-change="handleTabChange">
            <el-tab-pane label="订单明细" name="orders"></el-tab-pane>
            <el-tab-pane label="客户明细" name="customers"></el-tab-pane>
            <el-tab-pane label="商品明细" name="products"></el-tab-pane>
          </el-tabs>
        </div>
      </template>

      <!-- 订单明细表格 -->
      <div v-show="activeTab === 'orders'">
        <el-table :data="orderDetails" style="width: 100%" v-loading="tableLoading" class="order-detail-table">
          <el-table-column type="index" label="序号" width="60" align="center" />
          <el-table-column prop="orderNo" label="订单号" width="160">
            <template #default="{ row }">
              <span>{{ row.orderNo }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="customerName" label="客户姓名" width="110" show-overflow-tooltip>
            <template #default="{ row }">
              <el-link type="primary" @click="navigateToCustomerDetail(row.customerId)">
                {{ row.customerName }}
              </el-link>
            </template>
          </el-table-column>
          <el-table-column prop="customerPhone" label="客户电话" width="120" show-overflow-tooltip />
          <el-table-column prop="totalAmount" label="订单金额" width="110" align="right">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="depositAmount" label="定金" width="100" align="right">
            <template #default="{ row }">
              <span>¥{{ formatNumber(row.depositAmount || 0) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="status" label="订单状态" width="110">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusType(row.status)" size="small">
                {{ getOrderStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="auditStatus" label="审核状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getAuditStatusType(row.auditStatus)" size="small">
                {{ getAuditStatusText(row.auditStatus) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="trackingNumber" label="物流单号" width="170" show-overflow-tooltip>
            <template #default="{ row }">
              <div v-if="row.trackingNumber" class="tracking-no-wrapper">
                <el-link type="primary" @click="handleTrackingNoClick(row.trackingNumber, row.expressCompany)">
                  {{ row.trackingNumber }}
                </el-link>
                <el-button
                  size="small"
                  type="text"
                  @click.stop="copyTrackingNo(row.trackingNumber)"
                  class="copy-btn"
                  title="复制物流单号"
                >
                  <el-icon><CopyDocument /></el-icon>
                </el-button>
              </div>
              <span v-else class="no-data">未发货</span>
            </template>
          </el-table-column>
          <el-table-column prop="createTime" label="下单时间" width="160" />
          <el-table-column prop="productInfo" label="商品信息" min-width="200" show-overflow-tooltip>
            <template #default="{ row }">
              <div class="product-info-cell">
                {{ row.productInfo }}
              </div>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="100" align="center" fixed="right">
            <template #default="{ row }">
              <el-button @click="viewOrderDetail(row)" type="primary" link size="small">
                查看详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <div class="data-summary">
            <span class="summary-text">共 {{ orderPagination.total }} 个订单</span>
          </div>
          <el-pagination
            v-model:current-page="orderPagination.currentPage"
            v-model:page-size="orderPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="orderPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleOrderSizeChange"
            @current-change="handleOrderCurrentChange"
          />
        </div>
      </div>

      <!-- 客户明细表格 -->
      <div v-show="activeTab === 'customers'">
        <el-table :data="customerDetails" style="width: 100%" v-loading="tableLoading">
          <el-table-column type="index" label="序号" width="60" :index="getCustomerIndex" />
          <el-table-column prop="code" label="客户编码" min-width="140">
            <template #default="{ row }">
              <span
                class="code-link"
                @click="navigateToCustomerDetail(row.id)"
                :title="row.code"
                style="cursor: pointer; color: #409EFF; text-decoration: underline;"
              >
                {{ row.code || 'N/A' }}
              </span>
            </template>
          </el-table-column>
          <el-table-column prop="name" label="客户姓名" min-width="100" />
          <el-table-column prop="phone" label="电话" min-width="120" />
          <el-table-column prop="level" label="客户等级" width="100">
            <template #default="{ row }">
              <el-tag :type="getCustomerLevelType(row.level)" size="small">
                {{ getCustomerLevelText(row.level) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column prop="orderCount" label="订单数" width="80" align="center" />
          <el-table-column prop="totalAmount" label="消费总额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber(row.totalAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastOrderTime" label="最后下单" min-width="140" />
          <el-table-column label="操作" width="80" fixed="right">
            <template #default="{ row }">
              <el-button @click="viewCustomerDetail(row)" type="primary" link size="small">
                详情
              </el-button>
            </template>
          </el-table-column>
        </el-table>

        <div class="pagination-wrapper">
          <div class="data-summary">
            <span class="summary-text">共 {{ customerPagination.total }} 个客户</span>
          </div>
          <el-pagination
            v-model:current-page="customerPagination.currentPage"
            v-model:page-size="customerPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="customerPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleCustomerSizeChange"
            @current-change="handleCustomerCurrentChange"
          />
        </div>
      </div>

      <!-- 商品明细表格 -->
      <div v-show="activeTab === 'products'">
        <el-table :data="productDetails" style="width: 100%" v-loading="tableLoading">
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="productName" label="商品名称" />
          <el-table-column prop="salesCount" label="销售数量" width="100" />
          <el-table-column prop="salesAmount" label="销售金额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ formatNumber(row.salesAmount) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="avgPrice" label="平均单价" width="100">
            <template #default="{ row }">
              <span>¥{{ formatNumber(row.avgPrice) }}</span>
            </template>
          </el-table-column>
          <el-table-column prop="lastSaleTime" label="最后销售" width="180" />
        </el-table>

        <div class="pagination-wrapper">
          <div class="data-summary">
            <span class="summary-text">共 {{ productPagination.total }} 个商品</span>
          </div>
          <el-pagination
            v-model:current-page="productPagination.currentPage"
            v-model:page-size="productPagination.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            :total="productPagination.total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleProductSizeChange"
            @current-change="handleProductCurrentChange"
          />
        </div>
      </div>
    </el-card>

    <!-- 业绩分享对话框 -->
    <el-dialog
      v-model="shareDialogVisible"
      title="业绩分享"
      width="900px"
      :close-on-click-modal="false"
    >
      <div v-loading="shareImageLoading" class="share-dialog-content">
        <div v-if="shareImageUrl" class="share-image-container">
          <img :src="shareImageUrl" alt="业绩报告" class="share-image" />
        </div>
        <div v-else class="share-loading-text">
          正在生成业绩报告...
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="shareDialogVisible = false">取消</el-button>
          <el-button
            v-if="configStore.performanceShareConfig.allowCopy"
            type="primary"
            @click="copyPerformanceImage"
            :disabled="!shareImageUrl"
          >
            复制图片
          </el-button>
          <el-button
            v-if="configStore.performanceShareConfig.allowDownload"
            type="success"
            @click="downloadPerformanceImage"
            :disabled="!shareImageUrl"
          >
            下载图片
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, nextTick, watch, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Download,
  Share,
  TrendCharts,
  Document,
  Search,
  ArrowUp,
  ArrowDown,
  CircleCheck,
  SuccessFilled,
  Setting,
  CopyDocument
} from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import { usePerformanceStore } from '@/stores/performance'
import { useUserStore } from '@/stores/user'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useConfigStore } from '@/stores/config'
import { createSafeNavigator } from '@/utils/navigation'
import html2canvas from 'html2canvas'
import { getCompanyShortName, getTrackingUrl, KUAIDI100_URL } from '@/utils/logisticsCompanyConfig'

// 接口定义
interface OrderDetail {
  id: string
  customerId: string
  orderNo: string
  customerName: string
  customerPhone: string
  productInfo: string
  totalAmount: number
  depositAmount: number
  status: string
  auditStatus: string
  trackingNumber: string
  createTime: string
}

interface CustomerDetail {
  id: string
  code: string
  name: string
  phone: string
  level: string
  orderCount: number
  totalAmount: number
  lastOrderTime: string
}

interface ProductDetail {
  id: string
  productName: string
  salesCount: number
  salesAmount: number
  avgPrice: number
  lastSaleTime: string
}

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// Store
const performanceStore = usePerformanceStore()
const userStore = useUserStore()
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const configStore = useConfigStore()

// 🔥 日期比较工具函数 - 使用北京时间字符串比较，避免时区问题
const isOrderInDateRange = (orderCreateTime: string, startDateStr: string, endDateStr: string): boolean => {
  if (!orderCreateTime) return false
  // 将 "YYYY/MM/DD HH:mm:ss" 格式转换为 "YYYY-MM-DD HH:mm:ss"
  const normalizedTime = orderCreateTime.replace(/\//g, '-')
  const startTime = startDateStr + ' 00:00:00'
  const endTime = endDateStr + ' 23:59:59'
  return normalizedTime >= startTime && normalizedTime <= endTime
}

// 响应式数据
const dateRange = ref<string[]>([])
const salesChartType = ref('daily')
const activeTab = ref('orders')
const selectedQuickFilter = ref('thisMonth')

// 快速筛选选项
const quickFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '上周', value: 'lastWeek' },
  { label: '近7天', value: 'last7days' },
  { label: '本月', value: 'thisMonth' },
  { label: '上月', value: 'lastMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]
const tableLoading = ref(false)

// 🔥 计算属性：根据筛选条件动态显示环比文字
const trendLabel = computed(() => {
  // 如果有选中的快速筛选
  if (selectedQuickFilter.value) {
    switch (selectedQuickFilter.value) {
      case 'today':
        return '较昨日'
      case 'yesterday':
        return '较前日'
      case 'thisWeek':
        return '较上周'
      case 'lastWeek':
        return '较前周'
      case 'last7days':
        return '较前7天'
      case 'thisMonth':
        return '较上月'
      case 'lastMonth':
        return '较前月'
      case 'thisYear':
        return '较去年'
      case 'all':
        return '较上期'
      default:
        return '较上期'
    }
  }

  // 🔥 如果是自定义日期范围，计算天数差异
  if (dateRange.value && dateRange.value.length === 2) {
    const start = new Date(dateRange.value[0])
    const end = new Date(dateRange.value[1])
    const daysDiff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1

    if (daysDiff === 1) {
      return '较前日'
    } else if (daysDiff === 7) {
      return '较前周'
    } else if (daysDiff >= 28 && daysDiff <= 31) {
      return '较上月'
    } else {
      return `较前${daysDiff}天`
    }
  }

  return '较上期'
})

// 图表引用
const salesChartRef = ref()
const orderStatusChartRef = ref()
const customerLevelChartRef = ref()
const productRankingChartRef = ref()

// 图表实例
let salesChart: echarts.ECharts | null = null
let orderStatusChart: echarts.ECharts | null = null
let customerLevelChart: echarts.ECharts | null = null
let productRankingChart: echarts.ECharts | null = null

// 业绩数据 - 从store获取，支持日期筛选
const performanceData = computed(() => {
  const data = performanceStore.personalPerformance
  const currentUserId = userStore.currentUser?.id

  // 🔥 获取用户订单 - 使用新的业绩计算规则
  // 不再只统计审核通过的订单，而是根据状态和标记类型判断
  let userOrders = orderStore.orders.filter(order => {
    if (order.salesPersonId !== currentUserId) return false

    // 🔥 统一的业绩计算规则
    const excludedStatuses = [
      'pending_cancel', 'cancelled', 'audit_rejected',
      'logistics_returned', 'logistics_cancelled', 'refunded'
    ]
    // 待流转状态只有正常发货单才计入业绩
    if (order.status === 'pending_transfer') {
      return order.markType === 'normal'
    }
    return !excludedStatuses.includes(order.status)
  })

  // 应用日期筛选 - 🔥 修复：使用北京时间进行比较
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    // 将日期字符串解析为北京时间的开始和结束
    const startDateStr = dateRange.value[0] + ' 00:00:00'
    const endDateStr = dateRange.value[1] + ' 23:59:59'

    userOrders = userOrders.filter(order => {
      // order.createTime 格式为 "YYYY/MM/DD HH:mm:ss" 或 "YYYY-MM-DD HH:mm:ss"
      const orderTimeStr = order.createTime?.replace(/\//g, '-') || ''
      // 直接比较字符串（因为都是北京时间格式）
      return orderTimeStr >= startDateStr && orderTimeStr <= endDateStr
    })
  }

  // 计算总销售额和订单数
  const originalTotalSales = userOrders.reduce((sum, order) => sum + order.totalAmount, 0)
  const originalTotalOrders = userOrders.length

  // 【批次208修复】计算业绩分享影响 - 同时处理金额和订单数量
  let sharedAmount = 0  // 分享出去的业绩
  let receivedAmount = 0 // 接收到的业绩
  let sharedOrderCount = 0  // 分享出去的订单数量
  let receivedOrderCount = 0 // 接收到的订单数量

  if (currentUserId && performanceStore.performanceShares) {
    performanceStore.performanceShares.forEach(share => {
      if (share.status !== 'active') return

      // 【批次208修复】只计算属于当前用户订单的分享
      if (String(share.createdById) === String(currentUserId)) {
        // 检查分享的订单是否在当前筛选的订单中
        const shareOrder = userOrders.find(o => o.orderNumber === share.orderNumber)
        if (shareOrder) {
          // 计算分享出去的总比例
          const totalSharedPercentage = share.shareMembers.reduce((sum, member) => sum + member.percentage, 0)
          const sharedRatio = totalSharedPercentage / 100

          // 按实际分享比例扣除业绩和订单数
          sharedAmount += (share.orderAmount || 0) * sharedRatio
          sharedOrderCount += sharedRatio
        }
      }

      // 计算接收到的业绩和订单数量
      share.shareMembers.forEach(member => {
        if (String(member.userId) === String(currentUserId)) {
          const percentage = member.percentage / 100
          receivedAmount += (share.orderAmount || 0) * percentage
          receivedOrderCount += percentage
        }
      })
    })
  }

  // 【批次208修复】计算净业绩和净订单数,确保不小于0
  const netTotalSales = Math.max(0, originalTotalSales - sharedAmount + receivedAmount)
  const netTotalOrders = Math.max(0, originalTotalOrders - sharedOrderCount + receivedOrderCount)

  // 计算签收业绩和签收订单数量
  const signedOrders = userOrders.filter(order => order.status === 'delivered')
  const originalSignedAmount = signedOrders.reduce((sum, order) => sum + order.totalAmount, 0)

  // 【批次205修复】签收业绩也需要考虑分享影响,确保不小于0
  const netSignedAmount = Math.max(0, originalSignedAmount - sharedAmount + receivedAmount)

  const signedOrdersCount = signedOrders.length

  return {
    totalSales: `¥${netTotalSales.toLocaleString()}`, // 【批次208修复】使用净业绩
    originalSales: originalTotalSales, // 【批次203新增】原始业绩
    sharedAmount: sharedAmount,        // 【批次203新增】分享出去的业绩
    receivedAmount: receivedAmount,    // 【批次203新增】接收到的业绩
    salesTrend: data.salesTrend,
    totalOrders: netTotalOrders,       // 【批次208修复】使用净订单数
    ordersTrend: data.ordersTrend,
    signedAmount: netSignedAmount, // 【批次203修复】使用净签收业绩
    signedTrend: data.signedTrend || 0, // 🔥 使用store中的签收业绩环比
    signedOrders: signedOrdersCount,
    signedOrdersTrend: data.signedOrdersTrend || 0 // 🔥 使用store中的签收订单环比
  }
})

// 表格数据
const orderDetails = ref<OrderDetail[]>([])
const customerDetails = ref<CustomerDetail[]>([])
const productDetails = ref<ProductDetail[]>([])

// 分页数据
const orderPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const customerPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

const productPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 方法定义
/**
 * 快速筛选处理
 */
const handleQuickFilter = (value: string) => {
  selectedQuickFilter.value = value
  const today = new Date()
  // 🔥 使用本地时间格式化日期，避免UTC时区问题
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  switch (value) {
    case 'all':
      dateRange.value = []
      performanceStore.updateDateRange(null) // 🔥 更新store中的日期范围
      break
    case 'today':
      dateRange.value = [formatDate(today), formatDate(today)]
      performanceStore.updateDateRange([formatDate(today), formatDate(today)]) // 🔥 更新store中的日期范围
      break
    case 'yesterday':
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      dateRange.value = [formatDate(yesterday), formatDate(yesterday)]
      performanceStore.updateDateRange([formatDate(yesterday), formatDate(yesterday)]) // 🔥 更新store中的日期范围
      break
    case 'thisWeek':
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      dateRange.value = [formatDate(startOfWeek), formatDate(today)]
      performanceStore.updateDateRange([formatDate(startOfWeek), formatDate(today)]) // 🔥 更新store中的日期范围
      break
    case 'lastWeek':
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      dateRange.value = [formatDate(lastWeekStart), formatDate(lastWeekEnd)]
      performanceStore.updateDateRange([formatDate(lastWeekStart), formatDate(lastWeekEnd)]) // 🔥 更新store中的日期范围
      break
    case 'last7days':
      const last7days = new Date(today)
      last7days.setDate(today.getDate() - 7)
      dateRange.value = [formatDate(last7days), formatDate(today)]
      performanceStore.updateDateRange([formatDate(last7days), formatDate(today)]) // 🔥 更新store中的日期范围
      break
    case 'thisMonth':
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      dateRange.value = [formatDate(startOfMonth), formatDate(today)]
      performanceStore.updateDateRange([formatDate(startOfMonth), formatDate(today)]) // 🔥 更新store中的日期范围
      break
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      dateRange.value = [formatDate(lastMonthStart), formatDate(lastMonthEnd)]
      performanceStore.updateDateRange([formatDate(lastMonthStart), formatDate(lastMonthEnd)]) // 🔥 更新store中的日期范围
      break
    case 'thisYear':
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      dateRange.value = [formatDate(startOfYear), formatDate(today)]
      performanceStore.updateDateRange([formatDate(startOfYear), formatDate(today)]) // 🔥 更新store中的日期范围
      break
  }

  // 立即刷新所有数据和图表
  queryData()
}

/**
 * 查询数据
 */
const queryData = async () => {
  // 🔥 强制从服务器重新加载订单数据，确保数据实时更新
  try {
    await orderStore.loadOrdersFromAPI(true)
  } catch (error) {
    console.error('[个人业绩] 加载订单数据失败:', error)
  }

  nextTick(() => {
    loadTableData()
    initAllCharts()
  })
}

/**
 * 跳转到业绩分享设置页面
 */
const goToShareSettings = () => {
  safeNavigator.push('/settings/performance-share')
}

/**
 * 日期范围变化处理
 */
const handleDateChange = () => {
  // 🔥 修复：检查日期范围是否匹配某个快速筛选，如果匹配则保留 selectedQuickFilter
  // 这样可以确保快速筛选按钮点击后，环比文字始终显示对应的文字
  const today = new Date()
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }

  // 检查当前日期范围是否匹配快速筛选
  let matchedFilter = ''
  if (dateRange.value && dateRange.value.length === 2) {
    const [start, end] = dateRange.value

    // 今日
    if (start === formatDate(today) && end === formatDate(today)) {
      matchedFilter = 'today'
    }
    // 昨日
    else {
      const yesterday = new Date(today)
      yesterday.setDate(today.getDate() - 1)
      if (start === formatDate(yesterday) && end === formatDate(yesterday)) {
        matchedFilter = 'yesterday'
      }
    }
    // 本周
    if (!matchedFilter) {
      const startOfWeek = new Date(today)
      startOfWeek.setDate(today.getDate() - today.getDay())
      if (start === formatDate(startOfWeek) && end === formatDate(today)) {
        matchedFilter = 'thisWeek'
      }
    }
    // 上周
    if (!matchedFilter) {
      const lastWeekEnd = new Date(today)
      lastWeekEnd.setDate(today.getDate() - today.getDay() - 1)
      const lastWeekStart = new Date(lastWeekEnd)
      lastWeekStart.setDate(lastWeekEnd.getDate() - 6)
      if (start === formatDate(lastWeekStart) && end === formatDate(lastWeekEnd)) {
        matchedFilter = 'lastWeek'
      }
    }
    // 近7天
    if (!matchedFilter) {
      const last7days = new Date(today)
      last7days.setDate(today.getDate() - 7)
      if (start === formatDate(last7days) && end === formatDate(today)) {
        matchedFilter = 'last7days'
      }
    }
    // 本月
    if (!matchedFilter) {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
      if (start === formatDate(startOfMonth) && end === formatDate(today)) {
        matchedFilter = 'thisMonth'
      }
    }
    // 上月
    if (!matchedFilter) {
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      if (start === formatDate(lastMonthStart) && end === formatDate(lastMonthEnd)) {
        matchedFilter = 'lastMonth'
      }
    }
    // 今年
    if (!matchedFilter) {
      const startOfYear = new Date(today.getFullYear(), 0, 1)
      if (start === formatDate(startOfYear) && end === formatDate(today)) {
        matchedFilter = 'thisYear'
      }
    }
  }

  // 如果匹配到快速筛选，保留它；否则清空
  if (matchedFilter) {
    selectedQuickFilter.value = matchedFilter
  } else {
    selectedQuickFilter.value = ''
  }

  // 🔥 更新store中的日期范围
  if (dateRange.value && dateRange.value.length === 2) {
    performanceStore.updateDateRange([dateRange.value[0], dateRange.value[1]])
  } else {
    performanceStore.updateDateRange(null)
  }
}

// 检查是否有导出权限
const canExport = computed(() => {
  const exportConfigStr = localStorage.getItem('crm_performance_export_config')
  if (!exportConfigStr) {
    return true // 默认允许
  }

  try {
    const exportConfig = JSON.parse(exportConfigStr)

    // 功能未启用
    if (!exportConfig.enabled) {
      return false
    }

    const currentUser = userStore.currentUser
    if (!currentUser) {
      return false
    }

    // 所有人可用
    if (exportConfig.permissionType === 'all') {
      return true
    }

    // 按角色控制
    if (exportConfig.permissionType === 'role') {
      return exportConfig.allowedRoles?.includes(currentUser.role) || false
    }

    // 白名单控制
    if (exportConfig.permissionType === 'whitelist') {
      return exportConfig.whitelist?.includes(currentUser.id) || false
    }

    return false
  } catch (error) {
    console.error('解析导出配置失败:', error)
    return true
  }
})

/**
 * 获取水印文本
 */
const getWatermarkText = () => {
  const config = configStore.performanceShareConfig
  const currentUser = userStore.currentUser

  if (!currentUser) {
    return configStore.systemConfig.systemName
  }

  switch (config.watermarkType) {
    case 'username':
      return currentUser.name || currentUser.email
    case 'account':
      return currentUser.email
    case 'department':
      return currentUser.department || '未知部门'
    case 'phone':
      const phone = currentUser.phone || ''
      return phone ? phone.slice(-4) : '****'
    case 'custom':
      return config.watermarkText || configStore.systemConfig.systemName
    default:
      return currentUser.email
  }
}

/**
 * 记录导出统计
 */
const recordExportStats = () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_performance_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}

    stats[today] = (stats[today] || 0) + 1

    localStorage.setItem('crm_performance_export_stats', JSON.stringify(stats))
  } catch (error) {
    console.error('记录导出统计失败:', error)
  }
}

/**
 * 检查导出限制
 */
const checkExportLimit = () => {
  try {
    const exportConfigStr = localStorage.getItem('crm_performance_export_config')
    if (!exportConfigStr) {
      return true
    }

    const exportConfig = JSON.parse(exportConfigStr)
    const dailyLimit = exportConfig.dailyLimit || 0

    if (dailyLimit === 0) {
      return true // 不限制
    }

    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_performance_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}
    const todayCount = stats[today] || 0

    if (todayCount >= dailyLimit) {
      ElMessage.warning(`每日导出次数已达上限（${dailyLimit}次）`)
      return false
    }

    return true
  } catch (error) {
    console.error('检查导出限制失败:', error)
    return true
  }
}

/**
 * 导出数据
 */
const exportData = async () => {
  // 检查导出限制
  if (!checkExportLimit()) {
    return
  }

  try {
    // 动态导入xlsx库
    const XLSX = await import('xlsx')

    const currentUser = userStore.currentUser
    const dateRangeText = dateRange.value && dateRange.value.length === 2
      ? `${dateRange.value[0]}_${dateRange.value[1]}`
      : '全部时间'

    // 创建工作簿
    const wb = XLSX.utils.book_new()

    // 1. 业绩汇总表
    const summaryData = [
      ['个人业绩汇总报表'],
      ['销售人员', currentUser?.name || ''],
      ['统计时间', dateRangeText.replace('_', ' 至 ')],
      ['生成时间', new Date().toLocaleString('zh-CN')],
      [],
      ['指标', '数值', '较上期'],
      ['总销售额', performanceData.value.totalSales, `${performanceData.value.salesTrend > 0 ? '+' : ''}${performanceData.value.salesTrend}%`],
      ['订单数量', performanceData.value.totalOrders, `${performanceData.value.ordersTrend > 0 ? '+' : ''}${performanceData.value.ordersTrend}%`],
      ['签收业绩', `¥${formatNumber(performanceData.value.signedAmount)}`, `${performanceData.value.signedTrend > 0 ? '+' : ''}${performanceData.value.signedTrend}%`],
      ['签收订单数量', performanceData.value.signedOrders, `${performanceData.value.signedOrdersTrend > 0 ? '+' : ''}${performanceData.value.signedOrdersTrend}%`]
    ]
    const wsSummary = XLSX.utils.aoa_to_sheet(summaryData)

    // 设置列宽
    wsSummary['!cols'] = [
      { wch: 15 },
      { wch: 20 },
      { wch: 15 }
    ]

    XLSX.utils.book_append_sheet(wb, wsSummary, '业绩汇总')

    // 2. 订单明细表
    if (orderDetails.value.length > 0) {
      const orderData = [
        ['订单明细'],
        [],
        ['序号', '订单号', '客户姓名', '客户电话', '商品信息', '订单金额', '定金', '订单状态', '审核状态', '下单时间']
      ]

      orderDetails.value.forEach((order, index) => {
        orderData.push([
          index + 1,
          order.orderNo,
          order.customerName,
          order.customerPhone,
          order.productInfo,
          order.totalAmount,
          order.depositAmount,
          getOrderStatusText(order.status),
          getAuditStatusText(order.auditStatus),
          order.createTime
        ])
      })

      const wsOrders = XLSX.utils.aoa_to_sheet(orderData)
      wsOrders['!cols'] = [
        { wch: 6 },
        { wch: 18 },
        { wch: 12 },
        { wch: 15 },
        { wch: 30 },
        { wch: 12 },
        { wch: 10 },
        { wch: 12 },
        { wch: 12 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(wb, wsOrders, '订单明细')
    }

    // 3. 客户明细表
    if (customerDetails.value.length > 0) {
      const customerData = [
        ['客户明细'],
        [],
        ['序号', '客户编码', '客户姓名', '电话', '客户等级', '订单数', '消费总额', '最后下单时间']
      ]

      customerDetails.value.forEach((customer, index) => {
        customerData.push([
          index + 1,
          customer.code,
          customer.name,
          customer.phone,
          getCustomerLevelText(customer.level),
          customer.orderCount,
          customer.totalAmount,
          customer.lastOrderTime
        ])
      })

      const wsCustomers = XLSX.utils.aoa_to_sheet(customerData)
      wsCustomers['!cols'] = [
        { wch: 6 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 10 },
        { wch: 15 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(wb, wsCustomers, '客户明细')
    }

    // 4. 商品明细表
    if (productDetails.value.length > 0) {
      const productData = [
        ['商品明细'],
        [],
        ['序号', '商品名称', '销售数量', '销售金额', '平均单价', '最后销售时间']
      ]

      productDetails.value.forEach((product, index) => {
        productData.push([
          index + 1,
          product.productName,
          product.salesCount,
          product.salesAmount,
          product.avgPrice,
          product.lastSaleTime
        ])
      })

      const wsProducts = XLSX.utils.aoa_to_sheet(productData)
      wsProducts['!cols'] = [
        { wch: 6 },
        { wch: 30 },
        { wch: 12 },
        { wch: 15 },
        { wch: 12 },
        { wch: 20 }
      ]

      XLSX.utils.book_append_sheet(wb, wsProducts, '商品明细')
    }

    // 5. 销售趋势数据
    const trendData = getSalesTrendData()
    if (trendData.months.length > 0) {
      const salesTrendData = [
        ['销售趋势'],
        [],
        ['时间', '销售额(元)', '订单数']
      ]

      trendData.months.forEach((month, index) => {
        salesTrendData.push([
          month,
          trendData.salesAmounts[index],
          trendData.orderCounts[index]
        ])
      })

      const wsTrend = XLSX.utils.aoa_to_sheet(salesTrendData)
      wsTrend['!cols'] = [
        { wch: 15 },
        { wch: 15 },
        { wch: 12 }
      ]

      XLSX.utils.book_append_sheet(wb, wsTrend, '销售趋势')
    }

    // 6. 订单状态分布
    const { chartData: statusData } = getOrderStatusData()
    if (statusData.length > 0) {
      const orderStatusData: (string | number)[][] = [
        ['订单状态分布'],
        [],
        ['状态', '订单数', '金额(元)']
      ]

      statusData.forEach(item => {
        orderStatusData.push([
          item.statusName,
          item.count,
          item.amount
        ])
      })

      const wsStatus = XLSX.utils.aoa_to_sheet(orderStatusData)
      wsStatus['!cols'] = [
        { wch: 30 },
        { wch: 12 },
        { wch: 15 }
      ]

      XLSX.utils.book_append_sheet(wb, wsStatus, '订单状态分布')
    }

    // 生成文件
    const fileName = `个人业绩报表_${currentUser?.name || '销售人员'}_${dateRangeText}.xlsx`
    XLSX.writeFile(wb, fileName)

    // 记录导出统计
    recordExportStats()

    ElMessage.success('数据导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('数据导出失败，请重试')
  }
}

// 业绩分享对话框
const shareDialogVisible = ref(false)
const shareImageUrl = ref('')
const shareImageLoading = ref(false)

/**
 * 分享业绩
 */
const sharePerformance = async () => {
  // 检查是否启用业绩分享功能
  if (!configStore.performanceShareConfig.enabled) {
    ElMessage.warning('业绩分享功能已被管理员关闭')
    return
  }

  shareDialogVisible.value = true
  shareImageLoading.value = true

  try {
    // 生成业绩报告图片
    await generatePerformanceImage()
  } catch (error) {
    console.error('生成业绩报告失败:', error)
    ElMessage.error('生成业绩报告失败')
    shareDialogVisible.value = false
  } finally {
    shareImageLoading.value = false
  }
}

/**
 * 生成业绩报告图片
 */
const generatePerformanceImage = async () => {
  // 创建一个临时容器
  const container = document.createElement('div')
  container.style.cssText = `
    position: fixed;
    left: -9999px;
    top: 0;
    width: 800px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    padding: 40px;
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  `

  const currentUser = userStore.currentUser
  const dateRangeText = dateRange.value && dateRange.value.length === 2
    ? `${dateRange.value[0]} 至 ${dateRange.value[1]}`
    : '全部时间'

  container.innerHTML = `
    <div style="background: white; border-radius: 12px; padding: 32px; position: relative;">
      <!-- 标题 -->
      <div style="text-align: center; margin-bottom: 32px;">
        <h1 style="margin: 0 0 8px 0; font-size: 32px; color: #303133; font-weight: 700;">
          📊 业绩报告
        </h1>
        <p style="margin: 0; color: #909399; font-size: 16px;">
          ${currentUser?.name || '销售人员'} · ${dateRangeText}
        </p>
      </div>

      <!-- 业绩卡片 -->
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 32px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 24px; border-radius: 12px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">总销售额</div>
          <div style="font-size: 32px; font-weight: 700;">${performanceData.value.totalSales}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            ${performanceData.value.salesTrend > 0 ? '↑' : '↓'} ${Math.abs(performanceData.value.salesTrend)}% 较上期
          </div>
        </div>
        <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 24px; border-radius: 12px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">订单数量</div>
          <div style="font-size: 32px; font-weight: 700;">${performanceData.value.totalOrders}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            ${performanceData.value.ordersTrend > 0 ? '↑' : '↓'} ${Math.abs(performanceData.value.ordersTrend)}% 较上期
          </div>
        </div>
        <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 24px; border-radius: 12px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">签收业绩</div>
          <div style="font-size: 32px; font-weight: 700;">¥${formatNumber(performanceData.value.signedAmount)}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            ${performanceData.value.signedTrend > 0 ? '↑' : '↓'} ${Math.abs(performanceData.value.signedTrend)}% 较上期
          </div>
        </div>
        <div style="background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%); padding: 24px; border-radius: 12px; color: white;">
          <div style="font-size: 14px; opacity: 0.9; margin-bottom: 8px;">签收订单数量</div>
          <div style="font-size: 32px; font-weight: 700;">${performanceData.value.signedOrders}</div>
          <div style="font-size: 12px; opacity: 0.8; margin-top: 8px;">
            ${performanceData.value.signedOrdersTrend > 0 ? '↑' : '↓'} ${Math.abs(performanceData.value.signedOrdersTrend)}% 较上期
          </div>
        </div>
      </div>

      <!-- 底部信息 -->
      <div style="text-align: center; padding-top: 24px; border-top: 2px solid #f0f0f0;">
        <p style="margin: 0 0 8px 0; color: #909399; font-size: 14px;">
          ${configStore.systemConfig.systemName}
        </p>
        <p style="margin: 0; color: #c0c4cc; font-size: 12px;">
          生成时间：${new Date().toLocaleString('zh-CN')}
        </p>
      </div>

      ${configStore.performanceShareConfig.watermarkEnabled ? `
        <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg);
                    font-size: 48px; color: rgba(0,0,0,0.03); font-weight: 700; white-space: nowrap; pointer-events: none;">
          ${getWatermarkText()}
        </div>
      ` : ''}
    </div>
  `

  document.body.appendChild(container)

  try {
    // 使用html2canvas生成图片
    const canvas = await html2canvas(container, {
      backgroundColor: null,
      scale: 2,
      logging: false,
      useCORS: true
    })

    shareImageUrl.value = canvas.toDataURL('image/png')
  } finally {
    document.body.removeChild(container)
  }
}

/**
 * 复制业绩报告图片
 */
const copyPerformanceImage = async () => {
  if (!configStore.performanceShareConfig.allowCopy) {
    ElMessage.warning('复制功能已被管理员关闭')
    return
  }

  try {
    // 将base64转换为blob
    const response = await fetch(shareImageUrl.value)
    const blob = await response.blob()

    // 复制到剪贴板
    await navigator.clipboard.write([
      new ClipboardItem({
        'image/png': blob
      })
    ])

    ElMessage.success('业绩报告已复制到剪贴板')
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请尝试下载')
  }
}

/**
 * 下载业绩报告图片
 */
const downloadPerformanceImage = () => {
  if (!configStore.performanceShareConfig.allowDownload) {
    ElMessage.warning('下载功能已被管理员关闭')
    return
  }

  const link = document.createElement('a')
  const currentUser = userStore.currentUser
  const dateStr = new Date().toISOString().split('T')[0]
  link.download = `业绩报告_${currentUser?.name || '销售人员'}_${dateStr}.png`
  link.href = shareImageUrl.value
  link.click()

  ElMessage.success('业绩报告已下载')
}

/**
 * 标签页切换
 */
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  loadTableData()
}

/**
 * 获取订单状态类型
 */
const getOrderStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    // 订单状态
    pending_transfer: 'info',
    pending_audit: 'warning',
    audit_rejected: 'danger',
    pending_shipment: 'warning',  // 待发货用橙色
    shipped: 'primary',           // 已发货用蓝色
    delivered: 'success',         // 已签收用绿色
    logistics_returned: 'warning',
    logistics_cancelled: 'info',
    package_exception: 'danger',
    rejected: 'danger',
    rejected_returned: 'warning',
    after_sales_created: 'info',
    pending_cancel: 'warning',
    cancel_failed: 'danger',
    cancelled: 'info',
    draft: 'info',
    // 兼容旧状态
    pending: 'warning',
    paid: 'success',
    completed: 'success'
  }
  return typeMap[status] || 'info'
}

/**
 * 获取订单状态文本
 */
const getOrderStatusText = (status: string) => {
  const textMap: Record<string, string> = {
    // 订单状态
    pending_transfer: '待流转',
    pending_audit: '待审核',
    audit_rejected: '审核拒绝',
    pending_shipment: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    logistics_returned: '物流部退回',
    logistics_cancelled: '物流部取消',
    package_exception: '包裹异常',
    rejected: '拒收',
    rejected_returned: '拒收已退回',
    after_sales_created: '已建售后',
    pending_cancel: '待取消',
    cancel_failed: '取消失败',
    cancelled: '已取消',
    draft: '草稿',
    refunded: '已退款',
    // 兼容旧状态
    pending: '待审核',
    paid: '已付款',
    completed: '已完成'
  }
  return textMap[status] || status
}

/**
 * 获取客户等级类型
 */
const getCustomerLevelType = (level: string) => {
  const typeMap: Record<string, string> = {
    bronze: '',
    normal: '',
    silver: 'info',
    gold: 'warning',
    platinum: 'primary',
    diamond: 'success'
  }
  return typeMap[level] || ''
}

/**
 * 获取客户等级文本
 */
const getCustomerLevelText = (level: string) => {
  const textMap: Record<string, string> = {
    bronze: '青铜客户',
    normal: '普通客户',
    silver: '白银客户',
    gold: '黄金客户',
    platinum: '铂金客户',
    diamond: '钻石客户'
  }
  return textMap[level] || level
}

/**
 * 查看订单详情
 */
const viewOrderDetail = (order: OrderDetail) => {
  safeNavigator.push(`/order/detail/${order.id}`)
}

/**
 * 复制物流单号
 */
const copyTrackingNo = async (trackingNo: string) => {
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(trackingNo)
      ElMessage.success('物流单号已复制到剪贴板')
    } else {
      // 降级方案：使用 document.execCommand
      const textArea = document.createElement('textarea')
      textArea.value = trackingNo
      textArea.style.position = 'fixed'
      textArea.style.left = '-999999px'
      textArea.style.top = '-999999px'
      document.body.appendChild(textArea)
      textArea.focus()
      textArea.select()

      const result = document.execCommand('copy')
      document.body.removeChild(textArea)

      if (result) {
        ElMessage.success('物流单号已复制到剪贴板')
      } else {
        ElMessage.error('复制失败，请手动复制')
      }
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
  }
}

/**
 * 点击物流单号：弹窗选择查询方式（系统内查询/快递100/官网）
 */
const handleTrackingNoClick = async (trackingNo: string, logisticsCompany?: string) => {
  const { showLogisticsQueryDialog } = await import('@/utils/logisticsQuery')

  showLogisticsQueryDialog({
    trackingNo,
    companyCode: logisticsCompany,
    router,
    onSystemQuery: () => {
      // 跳转到系统内物流跟踪页面
      safeNavigator.push({
        path: '/logistics/track',
        query: {
          trackingNo: trackingNo,
          company: logisticsCompany || ''
        }
      })
    }
  })
}

/**
 * 查看客户详情
 */
const viewCustomerDetail = (customer: CustomerDetail) => {
  safeNavigator.push(`/customer/detail/${customer.id}`)
}

/**
 * 获取客户序号
 */
const getCustomerIndex = (index: number) => {
  return (customerPagination.currentPage - 1) * customerPagination.pageSize + index + 1
}

/**
 * 通过客户ID跳转到客户详情页面
 */
const navigateToCustomerDetail = (customerId: string) => {
  safeNavigator.push(`/customer/detail/${customerId}`)
}

/**
 * 订单分页处理
 */
const handleOrderSizeChange = (size: number) => {
  orderPagination.pageSize = size
  loadTableData()
}

const handleOrderCurrentChange = (page: number) => {
  orderPagination.currentPage = page
  loadTableData()
}

/**
 * 客户分页处理
 */
const handleCustomerSizeChange = (size: number) => {
  customerPagination.pageSize = size
  loadTableData()
}

const handleCustomerCurrentChange = (page: number) => {
  customerPagination.currentPage = page
  loadTableData()
}

/**
 * 商品分页处理
 */
const handleProductSizeChange = (size: number) => {
  productPagination.pageSize = size
  loadTableData()
}

const handleProductCurrentChange = (page: number) => {
  productPagination.currentPage = page
  loadTableData()
}

/**
 * 获取销售趋势数据
 */
const getSalesTrendData = () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const currentUserId = userStore.currentUser?.id

  if (!currentUserId) {
    return {
      months: ['1月', '2月', '3月', '4月', '5月', '6月'],
      salesAmounts: [0, 0, 0, 0, 0, 0],
      orderCounts: [0, 0, 0, 0, 0, 0]
    }
  }

  // 🔥 获取当前用户的订单 - 使用新的业绩计算规则
  let userOrders = orderStore.orders.filter(order => {
    if (order.salesPersonId !== currentUserId) return false
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  // 应用日期筛选 - 🔥 使用北京时间字符串比较
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    userOrders = userOrders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
  }

  const currentDate = new Date()
  const timeData = new Map()
  const months: string[] = []
  const salesAmounts: number[] = []
  const orderCounts: number[] = []

  // 根据图表类型生成不同的时间维度数据
  console.log('[个人业绩] getSalesTrendData - 图表类型:', salesChartType.value)

  if (salesChartType.value === 'daily' || salesChartType.value === 'day') {
    // 🔥 根据dateRange动态生成日期范围，如果没有选择日期则显示最近7天
    let startDate: Date
    let endDate: Date

    if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
      startDate = new Date(dateRange.value[0])
      endDate = new Date(dateRange.value[1])
    } else {
      // 默认最近7天
      endDate = new Date(currentDate)
      startDate = new Date(currentDate.getTime() - 6 * 24 * 60 * 60 * 1000)
    }

    // 计算日期范围内的天数
    const daysDiff = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000)) + 1
    const daysToShow = Math.min(daysDiff, 30) // 最多显示30天

    // 如果只选择了一天，显示那一天
    if (daysDiff === 1) {
      const dateKey = startDate.toISOString().split('T')[0]
      const dateLabel = `${startDate.getMonth() + 1}/${startDate.getDate()}`
      timeData.set(dateKey, {
        label: dateLabel,
        salesAmount: 0,
        orderCount: 0
      })
    } else {
      // 显示日期范围内的每一天
      for (let i = 0; i < daysToShow; i++) {
        const date = new Date(startDate.getTime() + i * 24 * 60 * 60 * 1000)
        const dateKey = date.toISOString().split('T')[0]
        const dateLabel = `${date.getMonth() + 1}/${date.getDate()}`
        timeData.set(dateKey, {
          label: dateLabel,
          salesAmount: 0,
          orderCount: 0
        })
      }
    }

    // 统计每日数据
    userOrders.forEach(order => {
      const orderDate = new Date(order.createTime).toISOString().split('T')[0]
      if (timeData.has(orderDate)) {
        const data = timeData.get(orderDate)
        data.salesAmount += order.totalAmount
        data.orderCount += 1
      }
    })
  } else if (salesChartType.value === 'weekly' || salesChartType.value === 'week') {
    // 最近8周
    for (let i = 7; i >= 0; i--) {
      const weekStart = new Date(currentDate.getTime() - i * 7 * 24 * 60 * 60 * 1000)
      const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
      const weekNum = Math.ceil((weekStart.getDate() - weekStart.getDay()) / 7)
      const weekKey = `${weekStart.getFullYear()}-W${weekNum}`
      timeData.set(weekKey, {
        label: `第${weekNum}周`,
        salesAmount: 0,
        orderCount: 0,
        startDate: weekStart.getTime(),
        endDate: weekEnd.getTime()
      })
    }

    // 统计每周数据
    userOrders.forEach(order => {
      const orderTime = new Date(order.createTime).getTime()
      timeData.forEach((data) => {
        if (orderTime >= data.startDate && orderTime < data.endDate) {
          data.salesAmount += order.totalAmount
          data.orderCount += 1
        }
      })
    })
  } else if (salesChartType.value === 'quarterly') {
    // 最近4个季度
    for (let i = 3; i >= 0; i--) {
      const currentQuarter = Math.floor(currentDate.getMonth() / 3)
      const quarterIndex = currentQuarter - i
      const year = currentDate.getFullYear() + Math.floor(quarterIndex / 4)
      const quarter = ((quarterIndex % 4) + 4) % 4
      const quarterKey = `${year}-Q${quarter + 1}`
      const quarterLabel = `Q${quarter + 1}`

      const quarterStartMonth = quarter * 3
      const quarterStart = new Date(year, quarterStartMonth, 1).getTime()
      const quarterEnd = new Date(year, quarterStartMonth + 3, 1).getTime()

      timeData.set(quarterKey, {
        label: quarterLabel,
        salesAmount: 0,
        orderCount: 0,
        startDate: quarterStart,
        endDate: quarterEnd
      })
    }

    // 统计每季度数据
    userOrders.forEach(order => {
      const orderTime = new Date(order.createTime).getTime()
      timeData.forEach((data) => {
        if (orderTime >= data.startDate && orderTime < data.endDate) {
          data.salesAmount += order.totalAmount
          data.orderCount += 1
        }
      })
    })
  } else if (salesChartType.value === 'yearly') {
    // 最近3年
    for (let i = 2; i >= 0; i--) {
      const year = currentDate.getFullYear() - i
      const yearKey = `${year}`
      const yearLabel = `${year}年`

      const yearStart = new Date(year, 0, 1).getTime()
      const yearEnd = new Date(year + 1, 0, 1).getTime()

      timeData.set(yearKey, {
        label: yearLabel,
        salesAmount: 0,
        orderCount: 0,
        startDate: yearStart,
        endDate: yearEnd
      })
    }

    // 统计每年数据
    userOrders.forEach(order => {
      const orderTime = new Date(order.createTime).getTime()
      timeData.forEach((data) => {
        if (orderTime >= data.startDate && orderTime < data.endDate) {
          data.salesAmount += order.totalAmount
          data.orderCount += 1
        }
      })
    })
  } else if (salesChartType.value === 'all') {
    // 全部：按月统计所有数据
    const allMonths = new Map()

    userOrders.forEach(order => {
      const orderDate = new Date(order.createTime)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `${orderDate.getFullYear()}年${orderDate.getMonth() + 1}月`

      if (!allMonths.has(monthKey)) {
        allMonths.set(monthKey, {
          label: monthLabel,
          salesAmount: 0,
          orderCount: 0
        })
      }

      const data = allMonths.get(monthKey)
      data.salesAmount += order.totalAmount
      data.orderCount += 1
    })

    // 按时间排序
    const sortedMonths = Array.from(allMonths.entries()).sort((a, b) => a[0].localeCompare(b[0]))
    sortedMonths.forEach(([_, data]) => {
      timeData.set(_, data)
    })
  } else {
    // 最近6个月（默认）
    for (let i = 5; i >= 0; i--) {
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1)
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
      const monthLabel = `${date.getMonth() + 1}月`
      timeData.set(monthKey, {
        label: monthLabel,
        salesAmount: 0,
        orderCount: 0
      })
    }

    // 统计每月数据
    userOrders.forEach(order => {
      const orderDate = new Date(order.createTime)
      const monthKey = `${orderDate.getFullYear()}-${String(orderDate.getMonth() + 1).padStart(2, '0')}`
      if (timeData.has(monthKey)) {
        const data = timeData.get(monthKey)
        data.salesAmount += order.totalAmount
        data.orderCount += 1
      }
    })
  }

  timeData.forEach(data => {
    months.push(data.label)
    salesAmounts.push(data.salesAmount) // 使用原始金额，不转换为万元
    orderCounts.push(data.orderCount)
  })

  return { months, salesAmounts, orderCounts }
}

/**
 * 初始化销售趋势图
 */
const initSalesChart = () => {
  if (!salesChartRef.value) return

  salesChart = echarts.init(salesChartRef.value)

  // 获取真实的销售趋势数据
  const salesTrendData = getSalesTrendData()

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'cross'
      }
    },
    legend: {
      data: ['销售额', '订单数']
    },
    xAxis: {
      type: 'category',
      data: salesTrendData.months
    },
    yAxis: [
      {
        type: 'value',
        name: '销售额(元)',
        position: 'left',
        axisLabel: {
          formatter: '¥{value}'
        }
      },
      {
        type: 'value',
        name: '订单数',
        position: 'right'
      }
    ],
    series: [
      {
        name: '销售额',
        type: 'line',
        data: salesTrendData.salesAmounts,
        smooth: true,
        itemStyle: {
          color: '#409EFF'
        }
      },
      {
        name: '订单数',
        type: 'bar',
        yAxisIndex: 1,
        data: salesTrendData.orderCounts,
        itemStyle: {
          color: '#67C23A'
        }
      }
    ]
  }

  salesChart.setOption(option)
}

/**
 * 获取订单状态分布数据
 */
const getOrderStatusData = () => {
  const userStore = useUserStore()
  const orderStore = useOrderStore()
  const currentUserId = userStore.currentUser?.id

  if (!currentUserId) {
    return { chartData: [], totalCount: 0, totalAmount: 0 }
  }

  // 🔥 获取当前用户的订单 - 使用新的业绩计算规则
  let userOrders = orderStore.orders.filter(order => {
    if (order.salesPersonId !== currentUserId) return false
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  // 应用日期筛选 - 🔥 使用北京时间字符串比较
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    userOrders = userOrders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
  }

  // 统计各状态的订单数量和业绩
  const statusMap = new Map()
  const statusNames: Record<string, string> = {
    // 16个订单状态
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'logistics_returned': '物流部退回',
    'logistics_cancelled': '物流部取消',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'pending_cancel': '待取消',
    'cancel_failed': '取消失败',
    'cancelled': '已取消',
    'draft': '草稿',
    'refunded': '已退款',
    // 兼容旧状态
    'pending': '待审核',
    'paid': '已付款',
    'completed': '已完成',
    'signed': '已签收'
  }

  // 计算总数和总金额
  let totalCount = 0
  let totalAmount = 0

  userOrders.forEach(order => {
    const statusName = statusNames[order.status] || order.status
    const amount = order.totalAmount || 0
    totalCount++
    totalAmount += amount

    if (statusMap.has(statusName)) {
      const existing = statusMap.get(statusName)
      statusMap.set(statusName, {
        count: existing.count + 1,
        amount: existing.amount + amount
      })
    } else {
      statusMap.set(statusName, {
        count: 1,
        amount: amount
      })
    }
  })

  // 转换为图表数据格式（简化name，详细信息在tooltip中显示）
  const chartData: Array<{ value: number; name: string; statusName: string; count: number; amount: number }> = []
  statusMap.forEach((value, name) => {
    chartData.push({
      value: value.count,
      name: `${name}(${value.count}单/¥${value.amount.toLocaleString()})`,
      statusName: name,
      count: value.count,
      amount: value.amount
    })
  })

  return { chartData, totalCount, totalAmount }
}

/**
 * 初始化订单状态分布图
 */
const initOrderStatusChart = () => {
  if (!orderStatusChartRef.value) return

  orderStatusChart = echarts.init(orderStatusChartRef.value)

  // 获取真实的订单状态分布数据
  const { chartData, totalCount, totalAmount } = getOrderStatusData()

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: (params: any) => {
        const data = params.data
        const countPercent = totalCount > 0 ? ((data.count / totalCount) * 100).toFixed(1) : '0'
        const amountPercent = totalAmount > 0 ? ((data.amount / totalAmount) * 100).toFixed(1) : '0'
        return `${data.statusName}：${data.count}单（${countPercent}%）<br/>状态业绩：¥${data.amount.toLocaleString()}（${amountPercent}%）`
      }
    },
    legend: {
      orient: 'vertical',
      left: 'left'
    },
    series: [
      {
        name: '订单状态',
        type: 'pie',
        radius: '50%',
        data: chartData,
        emphasis: {
          itemStyle: {
            shadowBlur: 10,
            shadowOffsetX: 0,
            shadowColor: 'rgba(0, 0, 0, 0.5)'
          }
        }
      }
    ]
  }

  orderStatusChart.setOption(option)
}

/**
 * 获取客户等级分布数据
 */
const getCustomerLevelData = () => {
  const userStore = useUserStore()
  const customerStore = useCustomerStore()
  const currentUserId = userStore.currentUser?.id

  if (!currentUserId) {
    return []
  }

  // 获取当前用户的客户
  let userCustomers = customerStore.customers.filter(customer =>
    customer.salesPersonId === currentUserId
  )

  console.log('[个人业绩-客户等级分布] 当前用户的客户数:', userCustomers.length)

  // 如果没有匹配的客户，显示所有客户
  if (userCustomers.length === 0 && customerStore.customers.length > 0) {
    console.log('[个人业绩-客户等级分布] 警告：没有匹配的客户，显示所有客户')
    userCustomers = customerStore.customers
  }

  // 统计各等级的客户数量
  const levelMap = new Map<string, number>()
  const levelNames: Record<string, string> = {
    'normal': '普通客户',
    'silver': '白银客户',
    'gold': '黄金客户',
    'diamond': '钻石客户'
  }

  userCustomers.forEach(customer => {
    const level = customer.level || 'normal'
    const levelName = levelNames[level] || level
    const currentCount = levelMap.get(levelName)
    if (currentCount !== undefined) {
      levelMap.set(levelName, currentCount + 1)
    } else {
      levelMap.set(levelName, 1)
    }
  })

  // 转换为图表数据格式
  const chartData: Array<{ value: number; name: string }> = []
  levelMap.forEach((value, name) => {
    chartData.push({ value, name })
  })

  return chartData
}

/**
 * 初始化客户等级分布图
 */
const initCustomerLevelChart = () => {
  if (!customerLevelChartRef.value) return

  customerLevelChart = echarts.init(customerLevelChartRef.value)

  // 获取真实的客户等级分布数据
  const levelData = getCustomerLevelData()

  // 计算总客户数
  const totalCustomers = levelData.reduce((sum, item) => sum + item.value, 0)

  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c}人 ({d}%)'
    },
    graphic: {
      type: 'text',
      left: 'center',
      top: 'center',
      style: {
        text: `${totalCustomers}`,
        textAlign: 'center',
        fill: '#333',
        fontSize: 24,
        fontWeight: 'normal'
      }
    },
    series: [
      {
        name: '客户等级',
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        label: {
          show: true,
          formatter: '{c}',
          fontSize: 12,
          fontWeight: 'normal'
        },
        emphasis: {
          label: {
            show: true,
            fontSize: 14,
            fontWeight: 'normal'
          }
        },
        labelLine: {
          show: true,
          length: 10,
          length2: 10
        },
        data: levelData
      }
    ]
  }

  customerLevelChart.setOption(option)
}

/**
 * 获取商品销售排行数据
 */
const getProductSalesData = () => {
  const currentUserId = userStore.currentUser?.id

  if (!currentUserId) {
    return {
      names: ['暂无数据'],
      values: [0]
    }
  }

  // 🔥 获取当前用户的订单 - 使用新的业绩计算规则
  let userOrders = orderStore.orders.filter(order => {
    if (order.salesPersonId !== currentUserId) return false
    const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
    if (order.status === 'pending_transfer') return order.markType === 'normal'
    return !excludedStatuses.includes(order.status)
  })

  // 应用日期筛选 - 🔥 使用北京时间字符串比较
  if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
    userOrders = userOrders.filter(order =>
      isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
    )
  }

  // 统计商品销售数据
  const productSalesMap = new Map()

  userOrders.forEach(order => {
    // 使用products字段
    const products = order.products || []
    products.forEach((item) => {
      const productId = item.id
      const productName = item.name || '未知商品'
      const productValue = item.total || 0

      if (productId) {
        const existing = productSalesMap.get(productId)
        if (existing) {
          productSalesMap.set(productId, {
            name: productName,
            value: existing.value + productValue
          })
        } else {
          productSalesMap.set(productId, {
            name: productName,
            value: productValue
          })
        }
      }
    })
  })

  // 转换为数组并排序
  const salesArray = Array.from(productSalesMap.values())
    .sort((a, b) => b.value - a.value)
    .slice(0, 5) // 取前5名

  return {
    names: salesArray.map(item => item.name),
    values: salesArray.map(item => item.value) // 使用原始金额，不转换为万元
  }
}

/**
 * 初始化商品销售排行图
 */
const initProductRankingChart = () => {
  if (!productRankingChartRef.value) return

  productRankingChart = echarts.init(productRankingChartRef.value)

  // 获取真实的商品销售排行数据
  const salesData = getProductSalesData()

  // 截断产品名称的函数 - 限制为8个字符
  const truncateName = (name: string, maxLen: number = 8) => {
    if (!name) return ''
    return name.length > maxLen ? name.substring(0, maxLen) + '...' : name
  }

  // 计算条目数量，动态调整间距
  const itemCount = salesData.names.length || 1
  const barGap = itemCount <= 3 ? '80%' : itemCount <= 5 ? '50%' : '30%'

  const option = {
    tooltip: {
      trigger: 'axis',
      axisPointer: {
        type: 'shadow'
      },
      // 🔥 自定义tooltip显示完整产品名称
      formatter: (params: any) => {
        const dataIndex = params[0]?.dataIndex
        const fullName = salesData.names[dataIndex] || ''
        const value = params[0]?.value || 0
        return `<div style="padding: 8px 12px; max-width: 300px;">
          <div style="font-weight: bold; margin-bottom: 6px; word-wrap: break-word; white-space: normal;">${fullName}</div>
          <div style="color: #409EFF;">销售额: ¥${value.toLocaleString()}</div>
        </div>`
      },
      confine: true
    },
    grid: {
      left: 16,
      right: 80,
      bottom: 36,
      top: 16,
      containLabel: true
    },
    xAxis: {
      type: 'value',
      axisLabel: {
        formatter: (value: number) => {
          if (value >= 10000) return (value / 10000).toFixed(1) + '万'
          if (value >= 1000) return (value / 1000).toFixed(1) + 'k'
          return value.toString()
        },
        fontSize: 11,
        color: '#909399'
      },
      splitLine: {
        lineStyle: {
          color: '#EBEEF5',
          type: 'dashed'
        }
      },
      axisLine: {
        show: false
      },
      axisTick: {
        show: false
      }
    },
    yAxis: {
      type: 'category',
      data: salesData.names.map(name => truncateName(name, 8)),
      axisLabel: {
        fontSize: 12,
        color: '#303133',
        align: 'right',
        margin: 12,
        formatter: (value: string) => value
      },
      axisTick: {
        show: false
      },
      axisLine: {
        show: false
      },
      inverse: true  // 🔥 倒序显示，销量最高的在最上面
    },
    series: [
      {
        name: '销售额(元)',
        type: 'bar',
        data: salesData.values,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
            { offset: 0, color: '#409EFF' },
            { offset: 1, color: '#66B1FF' }
          ]),
          borderRadius: [0, 4, 4, 0]
        },
        label: {
          show: true,
          position: 'right',
          formatter: (params: any) => {
            const val = params.value
            if (val >= 10000) return '¥' + (val / 10000).toFixed(1) + '万'
            return '¥' + val.toLocaleString()
          },
          fontSize: 11,
          color: '#606266',
          distance: 8
        },
        barWidth: 20,
        barGap: barGap,
        barCategoryGap: '40%'
      }
    ]
  }

  productRankingChart.setOption(option)
}



/**
 * 加载表格数据
 */
const loadTableData = async () => {
  tableLoading.value = true

  try {
    // 🔥 修复：确保客户数据已加载
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    if (activeTab.value === 'orders') {
      // 从orderStore获取当前用户的订单数据
      const currentUserId = userStore.currentUser?.id

      if (currentUserId) {
        // 🔥 获取用户订单 - 使用新的业绩计算规则
        let userOrders = orderStore.orders.filter(order => {
          if (order.salesPersonId !== currentUserId) return false
          const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
          if (order.status === 'pending_transfer') return order.markType === 'normal'
          return !excludedStatuses.includes(order.status)
        })

        // 应用日期筛选 - 🔥 使用北京时间字符串比较
        if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
          userOrders = userOrders.filter(order =>
            isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
          )
        }

        // 倒序排列（最新的在前面）
        userOrders = userOrders.sort((a, b) => {
          // 使用字符串比较排序（北京时间格式）
          const timeA = a.createTime?.replace(/\//g, '-') || ''
          const timeB = b.createTime?.replace(/\//g, '-') || ''
          return timeB.localeCompare(timeA)
        })

        // 分页处理
        const startIndex = (orderPagination.currentPage - 1) * orderPagination.pageSize
        const endIndex = startIndex + orderPagination.pageSize
        const paginatedOrders = userOrders.slice(startIndex, endIndex)

        orderDetails.value = paginatedOrders.map(order => {
          // 获取商品信息
          const productInfo = order.products && order.products.length > 0
            ? order.products.map(p => `${p.name} x${p.quantity}`).join(', ')
            : '暂无商品信息'

          return {
            id: order.id,
            customerId: order.customerId,
            orderNo: order.orderNumber,
            customerName: order.customerName,
            customerPhone: order.customerPhone || '未填写',
            productInfo,
            totalAmount: order.totalAmount,
            depositAmount: order.depositAmount || 0,
            status: order.status,
            auditStatus: order.auditStatus,
            trackingNumber: order.trackingNumber || '',
            createTime: order.createTime
          }
        })

        orderPagination.total = userOrders.length
      } else {
        orderDetails.value = []
        orderPagination.total = 0
      }
    } else if (activeTab.value === 'customers') {
      // 🔥 从后端API获取当前用户的客户数据（支持分页）
      const currentUserId = userStore.currentUser?.id

      console.log('[个人业绩-客户明细] 当前用户ID:', currentUserId)

      if (currentUserId) {
        try {
          // 🔥 调用后端API获取客户列表（后端已根据用户角色进行权限过滤）
          const { customerApi } = await import('@/api/customer')
          const response = await customerApi.getList({
            page: customerPagination.currentPage,
            pageSize: customerPagination.pageSize
          })

          console.log('[个人业绩-客户明细] API响应:', response)

          const customers = response?.data?.list || response?.list || []
          const total = response?.data?.total || response?.total || 0

          console.log('[个人业绩-客户明细] 获取到客户数:', customers.length, '总数:', total)

          // 🔥 为每个客户计算订单统计（从本地订单数据）
          const customerDetailsWithOrders = customers.map((customer: any) => {
            // 获取客户的订单 - 使用新的业绩计算规则
            let customerOrders = orderStore.orders.filter(order => {
              if (order.customerId !== customer.id) return false
              const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
              if (order.status === 'pending_transfer') return order.markType === 'normal'
              return !excludedStatuses.includes(order.status)
            })

            // 应用日期筛选
            if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
              customerOrders = customerOrders.filter(order =>
                isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
              )
            }

            const totalAmount = customerOrders.reduce((sum, order) => sum + order.totalAmount, 0)
            const lastOrder = customerOrders.sort((a, b) => {
              const timeA = a.createTime?.replace(/\//g, '-') || ''
              const timeB = b.createTime?.replace(/\//g, '-') || ''
              return timeB.localeCompare(timeA)
            })[0]

            return {
              id: customer.id,
              code: customer.code || customer.customerCode || '-',
              name: customer.name,
              phone: customer.phone,
              level: customer.level || 'normal',
              orderCount: customerOrders.length,
              totalAmount,
              lastOrderTime: lastOrder?.createTime || '暂无订单'
            }
          })

          customerDetails.value = customerDetailsWithOrders
          customerPagination.total = total
        } catch (error) {
          console.error('[个人业绩-客户明细] 加载失败:', error)
          customerDetails.value = []
          customerPagination.total = 0
        }
      } else {
        customerDetails.value = []
        customerPagination.total = 0
      }
    } else if (activeTab.value === 'products') {
      // 从productStore和orderStore获取商品销售数据
      const currentUserId = userStore.currentUser?.id

      console.log('[个人业绩-商品明细] 当前用户ID:', currentUserId)
      console.log('[个人业绩-商品明细] 订单总数:', orderStore.orders.length)

      if (currentUserId) {
        // 🔥 获取用户订单 - 使用新的业绩计算规则
        let userOrders = orderStore.orders.filter(order => {
          if (order.salesPersonId !== currentUserId) return false
          const excludedStatuses = ['pending_cancel', 'cancelled', 'audit_rejected', 'logistics_returned', 'logistics_cancelled', 'refunded']
          if (order.status === 'pending_transfer') return order.markType === 'normal'
          return !excludedStatuses.includes(order.status)
        })

        // 应用日期筛选 - 🔥 使用北京时间字符串比较
        if (dateRange.value && dateRange.value.length === 2 && dateRange.value[0] && dateRange.value[1]) {
          userOrders = userOrders.filter(order =>
            isOrderInDateRange(order.createTime, dateRange.value[0], dateRange.value[1])
          )
        }

        console.log('[个人业绩-商品明细] 当前用户的订单数:', userOrders.length)
        console.log('[个人业绩-商品明细] 订单products字段:', userOrders.map(o => ({ id: o.id, products: o.products })))

        // 统计商品销售数据
        const productSalesMap = new Map()

        userOrders.forEach(order => {
          // 使用products字段
          const products = order.products || []

          products.forEach((item) => {
            const productId = item.id
            const productName = item.name || '未知商品'
            const quantity = item.quantity || 0
            const price = item.price || 0
            const total = item.total || 0

            if (productId) {
              if (productSalesMap.has(productId)) {
                const existing = productSalesMap.get(productId)
                if (existing) {
                  existing.salesCount += quantity
                  existing.salesAmount += total
                  existing.lastSaleTime = order.createTime > existing.lastSaleTime ? order.createTime : existing.lastSaleTime
                }
              } else {
                productSalesMap.set(productId, {
                  id: productId,
                  productName: productName,
                  salesCount: quantity,
                  salesAmount: total,
                  avgPrice: price,
                  lastSaleTime: order.createTime
                })
              }
            }
          })
        })

        console.log('[个人业绩-商品明细] 统计到的商品数:', productSalesMap.size)

        const productSalesArray = Array.from(productSalesMap.values())

        // 分页处理
        const startIndex = (productPagination.currentPage - 1) * productPagination.pageSize
        const endIndex = startIndex + productPagination.pageSize
        productDetails.value = productSalesArray.slice(startIndex, endIndex)
        productPagination.total = productSalesArray.length
      } else {
        productDetails.value = []
        productPagination.total = 0
      }
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}

// 格式化数字
const formatNumber = (num: number) => {
  if (typeof num !== 'number' || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString()
}

// 处理图表类型变化
const handleChartTypeChange = (value: string) => {
  console.log('[个人业绩] 图表类型手动变化:', value)
  nextTick(() => {
    initSalesChart()
  })
}

// 获取审核状态文本
const getAuditStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待审核',
    'approved': '已通过',
    'rejected': '已拒绝'
  }
  return statusMap[status] || status
}

// 获取审核状态类型
const getAuditStatusType = (status: string) => {
  const typeMap: Record<string, unknown> = {
    'pending': 'warning',
    'approved': 'success',
    'rejected': 'danger'
  }
  return typeMap[status] || 'info'
}

/**
 * 初始化所有图表
 */
const initAllCharts = () => {
  nextTick(() => {
    initSalesChart()
    initOrderStatusChart()
    initCustomerLevelChart()
    initProductRankingChart()
  })
}

/**
 * 窗口大小变化时重新调整图表
 */
const handleResize = () => {
  salesChart?.resize()
  orderStatusChart?.resize()
  customerLevelChart?.resize()
  productRankingChart?.resize()
}

// 监听销售图表类型变化
watch(salesChartType, (newValue) => {
  console.log('[个人业绩] 销售图表类型变化:', newValue)
  // 重新加载销售图表数据
  nextTick(() => {
    console.log('[个人业绩] 重新初始化销售图表')
    initSalesChart()
  })
})

// 监听数据变化，实时更新图表
watch(() => [
  orderStore.orders,
  customerStore.customers
], () => {
  // 重新加载数据和图表
  loadTableData()
  nextTick(() => {
    initAllCharts()
  })
}, { deep: true })

// 监听日期范围变化
watch(dateRange, () => {
  handleDateChange()
})

// 生命周期钩子
onMounted(() => {
  // 设置默认日期范围为本月
  const today = new Date()
  // 🔥 使用本地时间格式化日期，避免UTC时区问题
  const formatDate = (date: Date) => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  dateRange.value = [formatDate(startOfMonth), formatDate(today)]
  selectedQuickFilter.value = 'thisMonth'

  // 加载数据
  loadTableData()

  // 初始化图表
  nextTick(() => {
    initAllCharts()
  })

  // 监听窗口大小变化
  window.addEventListener('resize', handleResize)

  // 监听物流状态更新事件
  window.addEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.addEventListener('todoStatusUpdated', handleTodoStatusUpdate)

  // 添加数据同步事件监听
  window.addEventListener('dataSync', handleDataSync)
  window.addEventListener('performanceDataUpdate', handlePerformanceDataUpdate)

})

// 处理订单状态更新事件
const handleOrderStatusUpdate = (event: Event) => {
  const customEvent = event as CustomEvent
  console.log('订单状态已更新，刷新个人业绩数据', customEvent.detail)
  loadTableData()
  nextTick(() => {
    initAllCharts()
  })
  ElMessage.success('个人业绩数据已同步更新')
}

// 处理待办状态更新事件
const handleTodoStatusUpdate = (event: Event) => {
  const customEvent = event as CustomEvent
  console.log('待办状态已更新，刷新个人业绩数据', customEvent.detail)
  loadTableData()
  nextTick(() => {
    initAllCharts()
  })
  ElMessage.success('个人业绩数据已同步更新')
}

/**
 * 处理数据同步事件
 */
const handleDataSync = () => {
  // 重新加载所有数据
  loadTableData()
  nextTick(() => {
    initAllCharts()
  })
}

/**
 * 处理业绩数据更新事件
 */
const handlePerformanceDataUpdate = () => {
  // 重新加载业绩数据和图表
  nextTick(() => {
    initAllCharts()
  })
}

// 组件卸载时清理
onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('orderStatusUpdated', handleOrderStatusUpdate)
  window.removeEventListener('todoStatusUpdated', handleTodoStatusUpdate)
  window.removeEventListener('dataSync', handleDataSync)
  window.removeEventListener('performanceDataUpdate', handlePerformanceDataUpdate)
  salesChart?.dispose()
  orderStatusChart?.dispose()
  customerLevelChart?.dispose()
  productRankingChart?.dispose()
})
</script>

<style scoped>
.personal-performance {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.filters-actions-bar {
  display: flex;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.quick-filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.actions-group {
  display: flex;
  gap: 12px;
  align-items: center;
  flex-shrink: 0;
}

.performance-overview {
  margin-bottom: 24px;
}

.overview-card {
  height: 100px;
}

.overview-card :deep(.el-card__body) {
  padding: 16px 20px;
  height: 100%;
}

.card-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
}

.card-icon::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
  transition: left 0.5s;
}

.overview-card:hover .card-icon::before {
  left: 100%;
}

.overview-card:hover .card-icon {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.2);
}

.card-icon.sales {
  background: #409EFF;
}

.card-icon.orders {
  background: #E6A23C;
}

.card-icon.customers {
  background: #67C23A;
}

.card-icon.conversion {
  background: #13C2C2;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.card-value {
  font-size: 24px;
  font-weight: bold;
  color: #303133;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
}

.card-label {
  font-size: 13px;
  color: #909399;
  white-space: nowrap;
}

.card-trend {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.trend {
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 12px;
  font-weight: 500;
}

.trend.up {
  color: #67c23a;
}

.trend.down {
  color: #f56c6c;
}

.trend-text {
  font-size: 12px;
  color: #909399;
}

.charts-section {
  margin-bottom: 20px;
}

.chart-card {
  height: 400px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.chart-container {
  height: 320px;
  width: 100%;
}

/* 🔥 商品销售排行图表专用样式 - 优化布局和间距 */
.product-ranking-chart {
  height: 340px !important;
  min-height: 340px !important;
  max-height: 340px !important;
}

.data-table-card .card-header {
  flex-direction: column;
  align-items: stretch;
  gap: 16px;
}

.data-table-card .card-header span {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.amount {
  color: #f56c6c;
  font-weight: 500;
}

.code-link {
  color: #409eff;
  cursor: pointer;
  padding: 2px 6px;
  border: 1px solid transparent;
  background: #f0f9ff;
  border-radius: 4px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  transition: all 0.3s ease;
}

.code-link:hover {
  background: #409eff;
  color: white;
  border-color: #409eff;
}

.code-link:active {
  transform: translateY(1px);
}

.commission {
  color: #67c23a;
  font-weight: 500;
}

.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
}

.data-summary {
  flex: 1;
}

.summary-text {
  font-size: 14px;
  color: #909399;
  font-weight: normal;
}

/* 业绩分享对话框样式 */
.share-dialog-content {
  min-height: 400px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.share-image-container {
  width: 100%;
  text-align: center;
}

.share-image {
  max-width: 100%;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.share-loading-text {
  font-size: 16px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .performance-overview .el-col {
    margin-bottom: 16px;
  }

  .charts-section .el-col {
    margin-bottom: 20px;
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

  .card-content {
    flex-direction: column;
    text-align: center;
  }

  .card-icon {
    margin-right: 0;
    margin-bottom: 12px;
  }

  .chart-card {
    height: 300px;
  }

  .chart-container {
    height: 220px;
  }
}

/* 订单号和物流单号样式 */
.order-no-wrapper,
.tracking-no-wrapper {
  display: flex;
  align-items: center;
  gap: 8px;
}

.copy-btn {
  padding: 0;
  margin-left: 4px;
  color: #909399;
  transition: color 0.3s;
}

.copy-btn:hover {
  color: #409eff;
}

.no-data {
  color: #909399;
}

/* 订单明细表格优化 */
.order-detail-table {
  font-size: 13px;
}

.order-detail-table :deep(.el-table__cell) {
  padding: 10px 0;
  white-space: nowrap;
}

.product-info-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  line-height: 1.4;
}

.order-detail-table :deep(.el-table__fixed-right) {
  box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
}
</style>
