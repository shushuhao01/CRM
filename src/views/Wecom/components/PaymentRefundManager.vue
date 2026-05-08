<template>
  <div class="refund-manager">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="filter-row">
        <el-input v-model="searchKey" placeholder="搜索退款单号/原单号/付款人" clearable style="width: 260px" @clear="fetchRefunds" @keyup.enter="fetchRefunds">
          <template #prefix><el-icon><Search /></el-icon></template>
        </el-input>
        <el-select v-model="statusFilter" placeholder="退款状态" clearable style="width: 140px" @change="fetchRefunds">
          <el-option label="处理中" value="processing" />
          <el-option label="已完成" value="completed" />
          <el-option label="已拒绝" value="rejected" />
        </el-select>
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" @change="fetchRefunds" />
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" @change="fetchRefunds" />
        <el-button type="primary" @click="fetchRefunds">搜索</el-button>
      </div>
    </div>

    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      退款申请由收款记录页发起，管理员可在此审批或拒绝。审批通过后退款金额自动更新到原收款记录。企微官方API暂不支持接口直接退款，实际退款请在企微管理后台操作。
    </el-alert>

    <el-table :data="refunds" stripe v-loading="loading" border>
      <el-table-column prop="refundNo" label="退款单号" min-width="160" show-overflow-tooltip />
      <el-table-column prop="originalPaymentNo" label="原收款单号" min-width="160" show-overflow-tooltip />
      <el-table-column prop="payerName" label="付款人" width="100" />
      <el-table-column label="原金额" width="100" align="right">
        <template #default="{ row }">
          <span>&yen;{{ (row.originalAmount / 100).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="退款金额" width="110" align="right">
        <template #default="{ row }">
          <span style="font-weight: 600; color: #F59E0B">&yen;{{ (row.refundAmount / 100).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="reason" label="退款原因" min-width="150" show-overflow-tooltip />
      <el-table-column label="申请时间" width="160">
        <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
      </el-table-column>
      <el-table-column label="完成时间" width="160">
        <template #default="{ row }">{{ row.refundTime ? formatDate(row.refundTime) : '-' }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="refundStatusType(row.status)" size="small">{{ refundStatusLabel(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="180" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="viewDetail(row)">详情</el-button>
          <template v-if="row.status === 'processing'">
            <el-button type="success" link size="small" @click="handleApprove(row)">通过</el-button>
            <el-button type="danger" link size="small" @click="handleReject(row)">拒绝</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-wrapper">
      <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" background @size-change="fetchRefunds" @current-change="fetchRefunds" />
    </div>

    <!-- 退款详情抽屉 -->
    <el-drawer v-model="detailVisible" title="退款详情" size="440px">
      <template v-if="detailRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="退款单号">{{ detailRow.refundNo }}</el-descriptions-item>
          <el-descriptions-item label="原收款单号">{{ detailRow.originalPaymentNo }}</el-descriptions-item>
          <el-descriptions-item label="原交易单号">{{ detailRow.originalTradeNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="付款人">{{ detailRow.payerName }}</el-descriptions-item>
          <el-descriptions-item label="原金额">&yen;{{ (detailRow.originalAmount / 100).toFixed(2) }}</el-descriptions-item>
          <el-descriptions-item label="退款金额">
            <span style="color: #F59E0B; font-weight: 600">&yen;{{ (detailRow.refundAmount / 100).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="退款原因">{{ detailRow.reason || '-' }}</el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="refundStatusType(detailRow.status)">{{ refundStatusLabel(detailRow.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="操作人">{{ detailRow.operatorName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="完成时间">{{ detailRow.refundTime ? formatDate(detailRow.refundTime) : '-' }}</el-descriptions-item>
          <el-descriptions-item v-if="detailRow.status === 'rejected' && detailRow.rejectReason" label="拒绝原因">
            <span style="color: #EF4444">{{ detailRow.rejectReason }}</span>
          </el-descriptions-item>
        </el-descriptions>
      </template>
      <template v-if="detailRow?.status === 'processing'" #footer>
        <div style="display: flex; gap: 10px">
          <el-button type="success" style="flex: 1" @click="handleApprove(detailRow)">审批通过</el-button>
          <el-button type="danger" style="flex: 1" @click="handleReject(detailRow)">拒绝退款</el-button>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Search } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { getWecomPaymentRefunds, approveWecomPaymentRefund } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const searchKey = ref('')
const statusFilter = ref('')
const startDate = ref('')
const endDate = ref('')
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const refunds = ref<any[]>([])
const detailVisible = ref(false)
const detailRow = ref<any>(null)

const formatDate = (d: string) => d ? formatDateTime(d) : '-'
const refundStatusType = (s: string) => ({ completed: 'success', processing: 'warning', rejected: 'danger' }[s] || 'info') as any
const refundStatusLabel = (s: string) => ({ completed: '已完成', processing: '处理中', rejected: '已拒绝' }[s] || s)

const fetchRefunds = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (searchKey.value) params.keyword = searchKey.value
    if (statusFilter.value) params.status = statusFilter.value
    if (startDate.value) params.startDate = startDate.value
    if (endDate.value) params.endDate = endDate.value
    const res = await getWecomPaymentRefunds(params)
    const data = res?.data || res
    refunds.value = data?.list || []
    total.value = data?.total || 0
  } catch (e) { console.error('[Refund] Fetch error:', e) }
  finally { loading.value = false }
}

const viewDetail = (row: any) => {
  detailRow.value = row
  detailVisible.value = true
}

const handleApprove = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确认通过退款申请？\n退款单号: ${row.refundNo}\n退款金额: ¥${(row.refundAmount / 100).toFixed(2)}`,
      '审批确认',
      { confirmButtonText: '确认通过', cancelButtonText: '取消', type: 'warning' }
    )
    const res = await approveWecomPaymentRefund(row.id, { action: 'approve' }) as any
    ElMessage.success(res?.message || '退款已通过')
    detailVisible.value = false
    fetchRefunds()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '审批失败')
  }
}

const handleReject = async (row: any) => {
  try {
    const { value: reason } = await ElMessageBox.prompt(
      `拒绝退款单: ${row.refundNo}\n退款金额: ¥${(row.refundAmount / 100).toFixed(2)}`,
      '拒绝退款',
      { confirmButtonText: '确认拒绝', cancelButtonText: '取消', inputPlaceholder: '请输入拒绝原因', inputType: 'textarea', type: 'warning' }
    ) as any
    const res = await approveWecomPaymentRefund(row.id, { action: 'reject', rejectReason: reason || '' }) as any
    ElMessage.success(res?.message || '退款已拒绝')
    detailVisible.value = false
    fetchRefunds()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '拒绝失败')
  }
}

onMounted(() => fetchRefunds())
</script>

<style scoped>
.filter-bar { background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 16px 20px; margin-bottom: 16px; }
.filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
