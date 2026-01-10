<template>
  <div class="page-container">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input v-model="searchForm.orderNo" placeholder="请输入订单号" clearable style="width: 180px" />
        </el-form-item>
        <el-form-item label="支付方式">
          <el-select v-model="searchForm.payType" placeholder="全部" clearable style="width: 120px">
            <el-option label="微信支付" value="wechat" />
            <el-option label="支付宝" value="alipay" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="待支付" value="pending" />
            <el-option label="已支付" value="paid" />
            <el-option label="已退款" value="refunded" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker v-model="searchForm.dateRange" type="daterange"
            start-placeholder="开始" end-placeholder="结束"
            value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleExport">
            <el-icon><Download /></el-icon>导出
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon blue">
            <el-icon><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ formatMoney(stats.totalAmount) }}</div>
            <div class="stat-label">总交易额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon green">
            <el-icon><Tickets /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.totalCount }}</div>
            <div class="stat-label">成功交易</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon orange">
            <el-icon><RefreshRight /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">¥{{ formatMoney(stats.refundAmount) }}</div>
            <div class="stat-label">退款金额</div>
          </div>
        </div>
      </el-col>
      <el-col :span="6">
        <div class="stat-card">
          <div class="stat-icon red">
            <el-icon><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ stats.pendingCount }}</div>
            <div class="stat-label">待支付</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 订单列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="table-header">
          <span>支付订单</span>
          <span class="total-text">共 {{ total }} 条记录</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="order_no" label="订单号" min-width="180">
          <template #default="{ row }">
            <span class="order-no">{{ row.order_no }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="tenant_name" label="租户/联系人" min-width="140">
          <template #default="{ row }">
            <div>{{ row.tenant_name || '-' }}</div>
            <div class="sub-text">{{ row.contact_name }} {{ row.contact_phone }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="package_name" label="套餐" width="120" />
        <el-table-column prop="amount" label="金额" width="100" align="right">
          <template #default="{ row }">
            <span class="amount">¥{{ row.amount?.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="pay_type" label="支付方式" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.pay_type === 'wechat' ? 'success' : 'primary'" size="small" effect="plain">
              {{ row.pay_type === 'wechat' ? '微信' : '支付宝' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" width="160">
          <template #default="{ row }">
            {{ formatTime(row.created_at) }}
          </template>
        </el-table-column>
        <el-table-column prop="paid_at" label="支付时间" width="160">
          <template #default="{ row }">
            {{ row.paid_at ? formatTime(row.paid_at) : '-' }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="140" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="handleView(row)">详情</el-button>
            <el-button v-if="row.status === 'paid'" link type="warning" size="small" @click="handleRefund(row)">
              退款
            </el-button>
            <el-button v-if="row.status === 'pending'" link type="danger" size="small" @click="handleClose(row)">
              关闭
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next, jumper"
          @change="fetchData"
        />
      </div>
    </el-card>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions :column="2" border v-if="currentOrder">
        <el-descriptions-item label="订单号" :span="2">{{ currentOrder.order_no }}</el-descriptions-item>
        <el-descriptions-item label="租户名称">{{ currentOrder.tenant_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="套餐">{{ currentOrder.package_name }}</el-descriptions-item>
        <el-descriptions-item label="金额">¥{{ currentOrder.amount?.toFixed(2) }}</el-descriptions-item>
        <el-descriptions-item label="支付方式">
          {{ currentOrder.pay_type === 'wechat' ? '微信支付' : '支付宝' }}
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(currentOrder.status)" size="small">
            {{ getStatusText(currentOrder.status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="交易号">{{ currentOrder.trade_no || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ currentOrder.contact_name }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ currentOrder.contact_phone }}</el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="2">{{ formatTime(currentOrder.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="支付时间" :span="2">{{ currentOrder.paid_at ? formatTime(currentOrder.paid_at) : '-' }}</el-descriptions-item>
      </el-descriptions>

      <div v-if="currentOrder?.logs?.length" class="order-logs">
        <h4>操作日志</h4>
        <el-timeline>
          <el-timeline-item v-for="log in currentOrder.logs" :key="log.created_at"
            :type="log.result === 'success' ? 'success' : 'danger'"
            :timestamp="formatTime(log.created_at)">
            {{ getActionText(log.action) }}
            <span v-if="log.error_msg" class="error-msg">{{ log.error_msg }}</span>
          </el-timeline-item>
        </el-timeline>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Download, Money, Tickets, RefreshRight, Clock } from '@element-plus/icons-vue'
import request from '@/api/request'

const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const detailVisible = ref(false)
const currentOrder = ref<any>(null)

const searchForm = reactive({
  orderNo: '',
  payType: '',
  status: '',
  dateRange: null as string[] | null
})

const stats = reactive({
  totalAmount: 0,
  totalCount: 0,
  refundAmount: 0,
  pendingCount: 0
})

const tableData = ref<any[]>([])

const formatMoney = (val: number) => {
  return val?.toLocaleString('zh-CN', { minimumFractionDigits: 2 }) || '0.00'
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return time.replace('T', ' ').slice(0, 19)
}

const getStatusType = (s: string) => {
  const map: Record<string, string> = { paid: 'success', pending: 'warning', refunded: 'info', closed: 'info', expired: 'info' }
  return map[s] || 'info'
}

const getStatusText = (s: string) => {
  const map: Record<string, string> = { paid: '已支付', pending: '待支付', refunded: '已退款', closed: '已关闭', expired: '已过期' }
  return map[s] || s
}

const getActionText = (action: string) => {
  const map: Record<string, string> = { create: '创建订单', pay: '发起支付', notify: '支付回调', refund: '退款', close: '关闭订单' }
  return map[action] || action
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: page.value,
      pageSize: pageSize.value,
      orderNo: searchForm.orderNo,
      payType: searchForm.payType,
      status: searchForm.status
    }
    if (searchForm.dateRange) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }

    const res = await request.get('/payment/orders', { params })
    if (res.data.success) {
      tableData.value = res.data.data.list
      total.value = res.data.data.total
    }
  } catch (error) {
    console.error('获取订单失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const params: any = {}
    if (searchForm.dateRange) {
      params.startDate = searchForm.dateRange[0]
      params.endDate = searchForm.dateRange[1]
    }
    const res = await request.get('/payment/stats', { params })
    if (res.data.success) {
      Object.assign(stats, res.data.data)
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const handleSearch = () => {
  page.value = 1
  fetchData()
  fetchStats()
}

const handleReset = () => {
  Object.assign(searchForm, { orderNo: '', payType: '', status: '', dateRange: null })
  handleSearch()
}

const handleExport = () => {
  ElMessage.info('导出功能开发中')
}

const handleView = async (row: any) => {
  try {
    const res = await request.get(`/payment/orders/${row.id}`)
    if (res.data.success) {
      currentOrder.value = res.data.data
      detailVisible.value = true
    }
  } catch (error) {
    ElMessage.error('获取详情失败')
  }
}

const handleRefund = (row: any) => {
  ElMessageBox.prompt('请输入退款原因', '确认退款', {
    confirmButtonText: '确认退款',
    cancelButtonText: '取消',
    inputPlaceholder: '退款原因（选填）'
  }).then(async ({ value }) => {
    try {
      const res = await request.post(`/payment/orders/${row.id}/refund`, { reason: value })
      if (res.data.success) {
        ElMessage.success('退款成功')
        fetchData()
        fetchStats()
      } else {
        ElMessage.error(res.data.message || '退款失败')
      }
    } catch (error) {
      ElMessage.error('退款失败')
    }
  }).catch(() => {})
}

const handleClose = (row: any) => {
  ElMessageBox.confirm('确定关闭此订单？关闭后用户将无法继续支付', '确认关闭').then(async () => {
    try {
      // 使用fetch直接调用公开API
      const res = await fetch(`/api/v1/public/payment/close/${row.order_no}`, { method: 'POST' })
      const data = await res.json()
      if (data.code === 0) {
        ElMessage.success('订单已关闭')
        fetchData()
        fetchStats()
      } else {
        ElMessage.error(data.message || '关闭失败')
      }
    } catch (error) {
      ElMessage.error('关闭失败')
    }
  }).catch(() => {})
}

onMounted(() => {
  fetchData()
  fetchStats()
})
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__body) {
    padding: 16px 20px;
  }

  :deep(.el-form-item) {
    margin-bottom: 0;
    margin-right: 16px;
  }
}

.stat-row {
  margin: 0 !important;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.stat-icon {
  width: 52px;
  height: 52px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;

  &.blue { background: linear-gradient(135deg, #409eff 0%, #79bbff 100%); color: white; }
  &.green { background: linear-gradient(135deg, #67c23a 0%, #95d475 100%); color: white; }
  &.orange { background: linear-gradient(135deg, #e6a23c 0%, #f3d19e 100%); color: white; }
  &.red { background: linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%); color: white; }
}

.stat-content {
  .stat-value {
    font-size: 24px;
    font-weight: 700;
    color: #303133;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 4px;
  }
}

.table-card {
  border-radius: 12px;
  border: none;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .total-text {
    font-size: 13px;
    color: #909399;
    font-weight: normal;
  }
}

.order-no {
  font-family: monospace;
  font-size: 13px;
}

.sub-text {
  font-size: 12px;
  color: #909399;
}

.amount {
  font-weight: 600;
  color: #303133;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.order-logs {
  margin-top: 24px;

  h4 {
    font-size: 14px;
    font-weight: 600;
    margin-bottom: 16px;
  }

  .error-msg {
    color: #f56c6c;
    font-size: 12px;
    margin-left: 8px;
  }
}
</style>
