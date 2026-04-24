<template>
  <div class="page-container">
    <!-- 统计摘要 -->
    <el-row :gutter="16" style="margin-bottom: 20px">
      <el-col :span="6" v-for="stat in summaryCards" :key="stat.label">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-num" :style="{ color: stat.color }">{{ stat.value }}</div>
          <div class="stat-label">{{ stat.label }}</div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 列表 -->
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>增值服务订单</span>
          <div class="header-actions">
            <el-input v-model="searchKeyword" placeholder="搜索订单号/租户/联系人" clearable style="width: 240px" @keyup.enter="fetchList" />
            <el-select v-model="searchStatus" placeholder="订单状态" clearable style="width: 130px" @change="fetchList">
              <el-option label="全部" value="all" />
              <el-option label="待支付" value="pending" />
              <el-option label="已支付" value="paid" />
              <el-option label="已关闭" value="closed" />
            </el-select>
            <el-button type="primary" @click="fetchList">搜索</el-button>
            <el-button @click="handleCheckExpired" :loading="checkingExpired">到期检查</el-button>
          </div>
        </div>
      </template>

      <el-table :data="orderList" v-loading="loading" stripe>
        <el-table-column prop="orderNo" label="订单号" width="180" show-overflow-tooltip />
        <el-table-column label="租户" min-width="140">
          <template #default="{ row }">
            <div>
              <div style="font-weight: 500">{{ row.tenantName || '-' }}</div>
              <div style="font-size: 12px; color: #909399">{{ row.contactName }}</div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="packageName" label="套餐" min-width="180" show-overflow-tooltip />
        <el-table-column label="金额" width="100" align="center">
          <template #default="{ row }">
            <span style="font-weight: 600; color: #f56c6c">¥{{ row.amount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="支付方式" width="100" align="center">
          <template #default="{ row }">
            <span>{{ payTypeLabel(row.payType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" size="small">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="存档授权" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.chatArchiveAuth ? 'success' : 'info'" size="small" effect="plain">
              {{ row.chatArchiveAuth ? '已授权' : '未授权' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付时间" width="155">
          <template #default="{ row }">{{ formatDate(row.paidAt) }}</template>
        </el-table-column>
        <el-table-column label="创建时间" width="155">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="viewDetail(row)">详情</el-button>
            <el-button
              v-if="row.status === 'pending'"
              v-permission="'wecom-management:vas-orders:edit'"
              link type="success" size="small"
              @click="confirmPaid(row)"
            >确认支付</el-button>
            <el-button
              v-if="row.status === 'pending'"
              v-permission="'wecom-management:vas-orders:edit'"
              link type="danger" size="small"
              @click="cancelOrder(row)"
            >取消</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div style="margin-top: 16px; display: flex; justify-content: flex-end">
        <el-pagination
          v-model:current-page="page"
          v-model:page-size="pageSize"
          :total="total"
          :page-sizes="[10, 20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- 订单详情弹窗 -->
    <el-dialog v-model="detailVisible" title="订单详情" width="600px">
      <el-descriptions :column="2" border v-if="detailData">
        <el-descriptions-item label="订单号">{{ detailData.orderNo }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="statusType(detailData.status)" size="small">{{ statusLabel(detailData.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="租户名称">{{ detailData.tenantName }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detailData.contactName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="套餐名称" :span="2">{{ detailData.packageName }}</el-descriptions-item>
        <el-descriptions-item label="金额">
          <span style="font-weight: 700; color: #f56c6c; font-size: 16px">¥{{ detailData.amount }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="支付方式">{{ payTypeLabel(detailData.payType) }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDate(detailData.createdAt) }}</el-descriptions-item>
        <el-descriptions-item label="支付时间">{{ formatDate(detailData.paidAt) }}</el-descriptions-item>
        <el-descriptions-item label="会话存档授权">
          <el-tag :type="detailData.chatArchiveAuth ? 'success' : 'info'" size="small">
            {{ detailData.chatArchiveAuth ? '已授权' : '未授权' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="存档状态">
          <el-tag :type="archiveStatusType(detailData.archiveStatus)" size="small">
            {{ archiveStatusLabel(detailData.archiveStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="开通人数">{{ detailData.archiveMaxUsers || 0 }} 人</el-descriptions-item>
        <el-descriptions-item label="到期日期">
          <span :style="{ color: isExpired(detailData.archiveExpireDate) ? '#f56c6c' : '' }">
            {{ detailData.archiveExpireDate || '-' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          <pre style="white-space: pre-wrap; margin: 0; font-size: 12px; color: #909399">{{ detailData.remark || '-' }}</pre>
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const orderList = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = ref(10)
const searchKeyword = ref('')
const searchStatus = ref('all')
const summary = ref<any>({})
const checkingExpired = ref(false)

const detailVisible = ref(false)
const detailData = ref<any>(null)

const summaryCards = computed(() => [
  { label: '总订单', value: summary.value.totalOrders || 0, color: '#409eff' },
  { label: '已支付', value: summary.value.paidOrders || 0, color: '#07c160' },
  { label: '待支付', value: summary.value.pendingOrders || 0, color: '#e6a23c' },
  { label: '总收入(元)', value: '¥' + (summary.value.totalRevenue || 0), color: '#f56c6c' }
])

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const payTypeLabel = (type: string) => {
  const map: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '对公转账' }
  return map[type] || type || '-'
}

const statusLabel = (status: string) => {
  const map: Record<string, string> = { pending: '待支付', paid: '已支付', closed: '已关闭', refunded: '已退款' }
  return map[status] || status || '-'
}

const statusType = (status: string) => {
  const map: Record<string, string> = { pending: 'warning', paid: 'success', closed: 'info', refunded: 'danger' }
  return (map[status] || 'info') as any
}

const archiveStatusLabel = (status: string) => {
  const map: Record<string, string> = { active: '生效中', expired: '已过期', disabled: '未启用' }
  return map[status] || status || '未知'
}

const archiveStatusType = (status: string) => {
  const map: Record<string, string> = { active: 'success', expired: 'danger', disabled: 'info' }
  return (map[status] || 'info') as any
}

const isExpired = (date: string) => {
  if (!date) return false
  return new Date(date) < new Date()
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/vas-orders', {
      params: {
        keyword: searchKeyword.value || undefined,
        status: searchStatus.value || undefined,
        page: page.value,
        pageSize: pageSize.value
      }
    })
    if (res.data) {
      orderList.value = res.data.list || []
      total.value = res.data.total || 0
      if (res.data.summary) summary.value = res.data.summary
    }
  } catch (e) {
    console.error('Fetch VAS orders error:', e)
  } finally {
    loading.value = false
  }
}

const viewDetail = async (row: any) => {
  try {
    const res = await request.get(`/wecom-management/vas-orders/${row.orderNo}`)
    if (res.data) {
      detailData.value = res.data
      detailVisible.value = true
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '获取详情失败')
  }
}

const confirmPaid = (row: any) => {
  ElMessageBox.prompt(
    `确认将订单「${row.orderNo}」标记为已支付？\n套餐: ${row.packageName}\n金额: ¥${row.amount}\n\n此操作将自动激活该租户的会话存档功能。`,
    '确认支付',
    { confirmButtonText: '确认', cancelButtonText: '取消', inputPlaceholder: '备注（可选）', type: 'warning' }
  ).then(async ({ value: remark }: { value: string }) => {
    try {
      await request.put(`/wecom-management/vas-orders/${row.orderNo}/confirm-paid`, { remark })
      ElMessage.success('已确认支付并激活会话存档')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const cancelOrder = (row: any) => {
  ElMessageBox.prompt(
    `确定取消订单「${row.orderNo}」？`,
    '取消订单',
    { confirmButtonText: '确认取消', cancelButtonText: '返回', inputPlaceholder: '取消原因（可选）', type: 'warning' }
  ).then(async ({ value: reason }: { value: string }) => {
    try {
      await request.put(`/wecom-management/vas-orders/${row.orderNo}/cancel`, { reason })
      ElMessage.success('订单已取消')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e?.message || '操作失败')
    }
  }).catch(() => {})
}

const handleCheckExpired = async () => {
  checkingExpired.value = true
  try {
    const res = await request.post('/wecom-management/check-expired')
    ElMessage.success(res.message || '检查完成')
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '检查失败')
  } finally {
    checkingExpired.value = false
  }
}

onMounted(() => fetchList())
</script>

<style scoped>
.page-container { padding: 20px; }
.stat-card { text-align: center; }
.stat-num { font-size: 24px; font-weight: bold; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
</style>




