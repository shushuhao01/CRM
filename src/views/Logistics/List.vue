<template>
  <div class="logistics-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h1>物流列表</h1>
        <p>管理和跟踪所有物流订单</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" @click="handleRefresh">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 搜索区域 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline class="search-form">
        <el-form-item label="物流单号">
          <el-input
            v-model="searchForm.trackingNo"
            placeholder="请输入物流单号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNo"
            placeholder="请输入订单号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="物流状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="待发货" value="pending" />
            <el-option label="已发货" value="shipped" />
            <el-option label="运输中" value="in_transit" />
            <el-option label="已送达" value="delivered" />
            <el-option label="异常" value="exception" />
          </el-select>
        </el-form-item>
        <el-form-item label="物流公司">
          <el-select
            v-model="searchForm.company"
            placeholder="请选择物流公司"
            clearable
            style="width: 150px"
            :loading="loadingCompanies"
          >
            <el-option
              v-for="company in logisticsCompanies"
              :key="company.code"
              :label="company.name"
              :value="company.code"
            />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><RefreshLeft /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <DynamicTable
      :data="tableData"
      :columns="tableColumns"
      storage-key="logistics-list-columns"
      title="物流列表"
      :loading="loading"
      :show-selection="true"
      :show-index="false"
      :pagination="{
        currentPage: pagination.page,
        pageSize: pagination.size,
        total: total
      }"
      @selection-change="handleSelectionChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 物流单号列 -->
      <template #column-trackingNo="{ row }">
        <div v-if="row.trackingNo" class="tracking-no-wrapper">
          <el-link type="primary" @click="handleTrackingNoClick(row.trackingNo)">
            {{ row.trackingNo }}
          </el-link>
          <el-button
            size="small"
            type="text"
            @click.stop="copyTrackingNo(row.trackingNo)"
            class="copy-btn"
          >
            <el-icon><CopyDocument /></el-icon>
          </el-button>
        </div>
        <span v-else class="no-data">未发货</span>
      </template>

      <!-- 订单号列 -->
      <template #column-orderNo="{ row }">
        <el-link type="primary" @click="handleOrderClick(row.orderId)">
          {{ row.orderNo }}
        </el-link>
      </template>

      <!-- 客户姓名列 -->
      <template #column-customerName="{ row }">
        <el-link type="primary" @click="handleCustomerClick(row.customerId)">
          {{ row.customerName }}
        </el-link>
      </template>

      <!-- 物流公司列 -->
      <template #column-company="{ row }">
        <el-tag>{{ getCompanyName(row.company) }}</el-tag>
      </template>

      <!-- 状态列 -->
      <template #column-status="{ row }">
        <el-tag :type="getStatusType(row.status)">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <el-button
          type="primary"
          size="small"
          @click="handleTrack(row)"
        >
          跟踪
        </el-button>
        <el-button
          type="success"
          size="small"
          @click="handleEdit(row)"
        >
          编辑
        </el-button>
        <el-button
          type="info"
          size="small"
          @click="handleViewDetail(row)"
        >
          详情
        </el-button>
      </template>
    </DynamicTable>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, RefreshLeft, CopyDocument } from '@element-plus/icons-vue'
import DynamicTable from '@/components/DynamicTable.vue'
import { useOrderStore } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { createSafeNavigator } from '@/utils/navigation'
import { eventBus, EventNames } from '@/utils/eventBus'

interface LogisticsItem {
  id: number
  trackingNo: string
  orderNo: string
  customerName: string
  company: string
  status: 'pending' | 'shipped' | 'in_transit' | 'delivered' | 'exception'
  destination: string
  shipDate: string
  estimatedDate: string
}

const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// Store
const orderStore = useOrderStore()
const userStore = useUserStore()

// 响应式数据
const loading = ref(false)
const total = ref(0)
const selectedRows = ref<LogisticsItem[]>([])

// 物流公司列表 - 从API获取
const logisticsCompanies = ref<Array<{ code: string; name: string }>>([])
const loadingCompanies = ref(false)

// 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/companies/active')

    if (response && Array.isArray(response)) {
      logisticsCompanies.value = response.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name
      }))
      console.log('[物流列表] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else if (response && response.data && Array.isArray(response.data)) {
      logisticsCompanies.value = response.data.map((item: { code: string; name: string }) => ({
        code: item.code,
        name: item.name
      }))
      console.log('[物流列表] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else {
      console.warn('[物流列表] API返回数据格式异常，使用默认列表')
      useDefaultCompanies()
    }
  } catch (error) {
    console.error('[物流列表] 加载物流公司列表失败:', error)
    useDefaultCompanies()
  } finally {
    loadingCompanies.value = false
  }
}

// 使用默认物流公司列表（API失败时的备用）
const useDefaultCompanies = () => {
  logisticsCompanies.value = [
    { code: 'SF', name: '顺丰速运' },
    { code: 'YTO', name: '圆通速递' },
    { code: 'ZTO', name: '中通快递' },
    { code: 'STO', name: '申通快递' },
    { code: 'YD', name: '韵达速递' },
    { code: 'HTKY', name: '百世快递' },
    { code: 'JD', name: '京东物流' },
    { code: 'EMS', name: '中国邮政' }
  ]
}

// 搜索表单
const searchForm = reactive({
  trackingNo: '',
  orderNo: '',
  status: '',
  company: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20
})

// 表格数据
const tableData = ref<LogisticsItem[]>([])

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'trackingNo',
    label: '物流单号',
    minWidth: 160,
    visible: true,
    slot: true
  },
  {
    prop: 'orderNo',
    label: '订单号',
    minWidth: 140,
    visible: true,
    slot: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    minWidth: 100,
    visible: true,
    slot: true
  },
  {
    prop: 'company',
    label: '物流公司',
    minWidth: 100,
    visible: true
  },
  {
    prop: 'status',
    label: '状态',
    minWidth: 90,
    visible: true
  },
  {
    prop: 'destination',
    label: '目的地',
    minWidth: 120,
    visible: true
  },
  {
    prop: 'shipDate',
    label: '发货时间',
    minWidth: 150,
    visible: true
  },
  {
    prop: 'estimatedDate',
    label: '预计送达',
    minWidth: 150,
    visible: true
  }
])

// 获取物流公司名称
const getCompanyName = (code: string) => {
  const companies: Record<string, string> = {
    sf: '顺丰速运',
    yt: '圆通速递',
    zt: '中通快递',
    st: '申通快递',
    yd: '韵达速递'
  }
  return companies[code] || code
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
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
    cancelled: '已取消',
    // 物流状态
    pending: '待发货',
    picked_up: '已揽收',
    in_transit: '运输中',
    out_for_delivery: '派送中',
    exception: '异常',
    returned: '已退回',
    refunded: '退货退款',
    abnormal: '状态异常'
  }
  return statusMap[status] || status
}

// 获取状态类型
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    pending: 'info',
    shipped: 'success',
    picked_up: 'primary',
    in_transit: 'warning',
    out_for_delivery: 'warning',
    delivered: 'success',
    rejected: 'danger',
    rejected_returned: 'warning',
    exception: 'danger',
    abnormal: 'danger',
    package_exception: 'danger'
  }
  return types[status] || 'info'
}

// 搜索
const handleSearch = () => {
  pagination.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  Object.assign(searchForm, {
    trackingNo: '',
    orderNo: '',
    status: '',
    company: ''
  })
  pagination.page = 1
  loadData()
}

// 刷新
const handleRefresh = () => {
  loadData()
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 500))

    // 【修复】统一使用 orderStore.getOrders() 获取经过权限过滤的订单
    const allOrders = orderStore.getOrders()
    const shippedOrders = allOrders.filter(order =>
      (order.status === 'shipped' || order.status === 'delivered') &&
      (order.trackingNumber || order.expressNo) &&
      order.expressCompany
    )

    // 转换为物流列表格式
    let logisticsData = shippedOrders.map(order => ({
      id: parseInt(order.id),
      orderId: order.id,
      customerId: order.customerId,
      trackingNo: order.trackingNumber || '',
      orderNo: order.orderNumber,
      customerName: order.customerName,
      company: order.expressCompany || '',
      status: 'shipped' as const,
      destination: order.receiverAddress || '',
      shipDate: order.shippingTime || new Date().toISOString(),
      // 🔥 修复：从订单数据获取预计送达时间
      estimatedDate: order.estimatedDeliveryTime || order.expectedDeliveryDate || ''
    }))

    // 应用搜索过滤
    if (searchForm.trackingNo) {
      logisticsData = logisticsData.filter(item =>
        item.trackingNo.includes(searchForm.trackingNo)
      )
    }

    if (searchForm.orderNo) {
      logisticsData = logisticsData.filter(item =>
        item.orderNo.includes(searchForm.orderNo)
      )
    }

    if (searchForm.status) {
      logisticsData = logisticsData.filter(item =>
        item.status === searchForm.status
      )
    }

    if (searchForm.company) {
      logisticsData = logisticsData.filter(item =>
        item.company === searchForm.company
      )
    }

    // 按发货时间倒序排序（最新的在上面）
    logisticsData.sort((a, b) => {
      const timeA = new Date(a.shipDate || 0).getTime()
      const timeB = new Date(b.shipDate || 0).getTime()
      return timeB - timeA // 倒序：最新的在上面
    })

    // 分页处理
    const startIndex = (pagination.page - 1) * pagination.size
    const endIndex = startIndex + pagination.size
    tableData.value = logisticsData.slice(startIndex, endIndex)
    total.value = logisticsData.length

  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('Load data error:', error)
  } finally {
    loading.value = false
  }
}

// 选择变化
const handleSelectionChange = (selection: LogisticsItem[]) => {
  selectedRows.value = selection
}

// 分页大小变化
const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1
  loadData()
}

// 当前页变化
const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

// 跟踪物流
const handleTrack = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/track/detail/${row.trackingNo}`)
}

// 编辑
const handleEdit = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/edit/${row.id}`)
}

// 查看详情
const handleViewDetail = (row: LogisticsItem) => {
  safeNavigator.push(`/logistics/detail/${row.id}`)
}

// 点击物流单号：复制并提示选择跳转网站
const handleTrackingNoClick = async (trackingNo: string) => {
  // 复制物流单号
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
        return
      }
    }
  } catch (error) {
    console.error('复制失败:', error)
    ElMessage.error('复制失败，请手动复制')
    return
  }

  // 提示选择跳转网站
  ElMessageBox.confirm(
    '请选择要跳转的查询网站',
    '选择查询网站',
    {
      confirmButtonText: '顺丰官网',
      cancelButtonText: '快递100',
      distinguishCancelAndClose: true,
      type: 'info'
    }
  ).then(() => {
    // 点击确认，跳转顺丰官网
    window.open('https://www.sf-express.com/chn/sc/waybill/list', '_blank')
  }).catch((action) => {
    if (action === 'cancel') {
      // 点击取消，跳转快递100
      window.open('https://www.kuaidi100.com/', '_blank')
    }
  })
}

// 复制物流单号（用于复制按钮）
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

// 点击订单号：跳转到订单详情
const handleOrderClick = (orderId: string) => {
  if (orderId) {
    router.push(`/order/detail/${orderId}`)
  }
}

// 点击客户姓名：跳转到客户详情
const handleCustomerClick = (customerId: string) => {
  if (customerId) {
    router.push(`/customer/detail/${customerId}`)
  }
}

// 组件挂载
// 事件处理函数
const handleOrderShipped = () => {
  console.log('[物流列表] 收到订单发货事件')
  loadData()
}

const handleOrderCancelled = () => {
  console.log('[物流列表] 收到订单取消事件')
  loadData()
}

const handleOrderReturned = () => {
  console.log('[物流列表] 收到订单退回事件')
  loadData()
}

const handleRefreshLogisticsList = () => {
  console.log('[物流列表] 收到刷新列表事件')
  loadData()
}

onMounted(async () => {
  // 🔥 加载物流公司列表
  await loadLogisticsCompanies()

  // 🔥 确保从API加载最新订单数据
  console.log('[物流列表] 页面初始化，从API加载订单数据...')
  try {
    await orderStore.loadOrdersFromAPI(true) // 强制刷新
    console.log('[物流列表] API数据加载完成，订单总数:', orderStore.orders.length)
  } catch (error) {
    console.error('[物流列表] API数据加载失败:', error)
  }

  loadData()

  // 监听订单状态变化，当有新的发货订单时自动刷新列表
  orderStore.setupLogisticsEventListener()
  orderStore.startLogisticsAutoSync()

  // 监听订单变化
  orderStore.$subscribe((mutation, state) => {
    // 当订单状态变化时，重新加载物流数据
    if (mutation.events.some(event =>
      event.key === 'status' ||
      event.key === 'expressNo' ||
      event.key === 'expressCompany'
    )) {
      loadData()
    }
  })

  // 监听订单事件总线 - 实现订单状态同步
  eventBus.on(EventNames.ORDER_SHIPPED, handleOrderShipped)
  eventBus.on(EventNames.ORDER_CANCELLED, handleOrderCancelled)
  eventBus.on(EventNames.ORDER_RETURNED, handleOrderReturned)
  eventBus.on(EventNames.REFRESH_LOGISTICS_LIST, handleRefreshLogisticsList)
  eventBus.on(EventNames.ORDER_STATUS_CHANGED, handleRefreshLogisticsList)
  console.log('[物流列表] 事件监听器已注册')
})

onUnmounted(() => {
  // 停止物流自动同步
  orderStore.stopLogisticsAutoSync()

  // 清理订单事件总线监听
  eventBus.off(EventNames.ORDER_SHIPPED, handleOrderShipped)
  eventBus.off(EventNames.ORDER_CANCELLED, handleOrderCancelled)
  eventBus.off(EventNames.ORDER_RETURNED, handleOrderReturned)
  eventBus.off(EventNames.REFRESH_LOGISTICS_LIST, handleRefreshLogisticsList)
  eventBus.off(EventNames.ORDER_STATUS_CHANGED, handleRefreshLogisticsList)
  console.log('[物流列表] 事件监听器已清理')
})
</script>

<style scoped>
.logistics-list {
  padding: 20px;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.header-left h1 {
  margin: 0 0 5px 0;
  font-size: 24px;
  color: #303133;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-card {
  margin-bottom: 20px;
}

.search-form {
  margin-bottom: 0;
}

.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  font-size: 14px;
  color: #606266;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .logistics-list {
    padding: 10px;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
  }

  .search-form {
    flex-direction: column;
  }

  .search-form .el-form-item {
    margin-right: 0;
    margin-bottom: 10px;
  }
}

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
</style>
