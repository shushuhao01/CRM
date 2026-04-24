<template>
  <div class="wecom-payment">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="payment">
          对外收款
          <template #actions>
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleSearch">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="success" :icon="Refresh" @click="handleSync" :loading="syncing" style="margin-left: 8px">同步收款</el-button>
          </template>
        </WecomHeader>
      </template>

      <!-- 5 Tab 结构 -->
      <el-tabs v-model="activeTab">
        <!-- Tab 1: 收款记录 -->
        <el-tab-pane label="收款记录" name="records">
          <!-- 筛选栏 - 优化放大 -->
          <div class="filter-bar">
            <div class="filter-row">
              <el-input v-model="query.keyword" placeholder="搜索单号/客户昵称/备注" clearable style="width: 240px" @clear="handleSearch" @keyup.enter="handleSearch">
                <template #prefix><el-icon><Search /></el-icon></template>
              </el-input>
              <el-select v-model="query.status" placeholder="收款状态" clearable style="width: 140px" @change="handleSearch">
                <el-option label="待支付" value="pending" />
                <el-option label="已支付" value="paid" />
                <el-option label="已退款" value="refunded" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
              <el-cascader
                v-model="receiverFilter"
                :options="receiverOptions"
                :props="{ checkStrictly: true, expandTrigger: 'hover' }"
                placeholder="收款人/部门"
                clearable
                filterable
                style="width: 200px"
                @change="handleReceiverChange"
              />
              <el-date-picker v-model="query.startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleSearch" />
              <el-date-picker v-model="query.endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleSearch" />
              <el-button type="primary" :icon="Search" @click="handleSearch">搜索</el-button>
              <el-button @click="resetFilters">重置</el-button>
            </div>
          </div>

          <!-- V4 统计卡片 - 后端返回真实汇总 -->
          <div class="v4-stats-row" style="margin-bottom: 16px">
            <div class="v4-stat-card">
              <div class="stat-icon" style="background: #FEF2F2; color: #EF4444">💰</div>
              <div class="stat-body">
                <div class="stat-num" style="color: #EF4444; font-size: 22px">&yen;{{ (serverSummary.totalAmount / 100).toLocaleString('zh', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                <div class="stat-label">收款总额</div>
              </div>
            </div>
            <div class="v4-stat-card">
              <div class="stat-icon" style="background: #ECFDF5; color: #10B981">✅</div>
              <div class="stat-body">
                <div class="stat-num" style="color: #10B981">{{ serverSummary.paidCount }}</div>
                <div class="stat-label">已支付</div>
              </div>
            </div>
            <div class="v4-stat-card">
              <div class="stat-icon" style="background: #FFFBEB; color: #F59E0B">⏳</div>
              <div class="stat-body">
                <div class="stat-num" style="color: #F59E0B">{{ serverSummary.pendingCount }}</div>
                <div class="stat-label">待支付</div>
              </div>
            </div>
            <div class="v4-stat-card">
              <div class="stat-icon" style="background: #F3F4F6; color: #6B7280">↩️</div>
              <div class="stat-body">
                <div class="stat-num" style="color: #6B7280">{{ serverSummary.refundedCount }}</div>
                <div class="stat-label">已退款</div>
              </div>
            </div>
            <div class="v4-stat-card">
              <div class="stat-icon" style="background: #EFF6FF; color: #3B82F6">💵</div>
              <div class="stat-body">
                <div class="stat-num" style="color: #3B82F6">&yen;{{ (serverSummary.refundAmount / 100).toLocaleString('zh', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) }}</div>
                <div class="stat-label">退款金额</div>
              </div>
            </div>
          </div>

          <el-table :data="paymentList" v-loading="loading" stripe border>
            <el-table-column prop="paymentNo" label="收款单号" min-width="170" show-overflow-tooltip />
            <el-table-column prop="tradeNo" label="交易单号" min-width="170" show-overflow-tooltip />
            <el-table-column label="收款金额" width="120" align="right">
              <template #default="{ row }">
                <span class="amount">&yen;{{ (row.amount / 100).toFixed(2) }}</span>
              </template>
            </el-table-column>
            <el-table-column prop="userName" label="收款人" width="100" />
            <el-table-column prop="departmentName" label="部门" width="100" show-overflow-tooltip />
            <el-table-column label="付款客户" min-width="120">
              <template #default="{ row }">{{ row.customerName || row.payerName || '-' }}</template>
            </el-table-column>
            <el-table-column prop="payMethod" label="支付方式" width="100" />
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="支付时间" width="160">
              <template #default="{ row }">{{ formatDate(row.payTime) }}</template>
            </el-table-column>
            <el-table-column label="退款金额" width="100" align="right">
              <template #default="{ row }">
                <span v-if="row.refundAmount" style="color: #F59E0B">&yen;{{ (row.refundAmount / 100).toFixed(2) }}</span>
                <span v-else style="color: #C0C4CC">-</span>
              </template>
            </el-table-column>
            <el-table-column prop="remark" label="备注" min-width="120" show-overflow-tooltip />
            <el-table-column label="关联订单" width="130">
              <template #default="{ row }">
                <el-link v-if="row.crmOrderNo" type="primary" size="small">{{ row.crmOrderNo }}</el-link>
                <el-button v-else-if="row.status === 'paid'" type="primary" link size="small" @click="handleLinkOrder(row)">关联</el-button>
                <span v-else style="color: #C0C4CC">-</span>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="100" fixed="right">
              <template #default="{ row }">
                <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next, jumper" background @size-change="fetchList" @current-change="fetchList" />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 收款统计 -->
        <el-tab-pane label="收款统计" name="stats" lazy>
          <PaymentStats :config-id="query.configId" />
        </el-tab-pane>

        <!-- Tab 3: 退款统计 -->
        <el-tab-pane label="退款统计" name="refund" lazy>
          <PaymentRefundManager />
        </el-tab-pane>

        <!-- Tab 4: 收款设置 -->
        <el-tab-pane label="收款设置" name="settings" lazy>
          <PaymentSettings :config-id="query.configId" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 收款详情抽屉 -->
    <el-drawer v-model="detailVisible" title="收款详情" size="500px">
      <template v-if="detailRow">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="收款单号">{{ detailRow.paymentNo }}</el-descriptions-item>
          <el-descriptions-item label="交易单号">{{ detailRow.tradeNo || '-' }}</el-descriptions-item>
          <el-descriptions-item label="收款金额">
            <span style="font-size: 18px; font-weight: 700; color: #f56c6c">&yen;{{ (detailRow.amount / 100).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="收款人">{{ detailRow.userName }}</el-descriptions-item>
          <el-descriptions-item label="所属部门">{{ detailRow.departmentName || '-' }}</el-descriptions-item>
          <el-descriptions-item label="付款客户">{{ detailRow.customerName || detailRow.payerName }}</el-descriptions-item>
          <el-descriptions-item label="支付方式">{{ detailRow.payMethod || '-' }}</el-descriptions-item>
          <el-descriptions-item label="币种">{{ detailRow.currency || 'CNY' }}</el-descriptions-item>
          <el-descriptions-item label="收款状态">
            <el-tag :type="getStatusType(detailRow.status)">{{ getStatusText(detailRow.status) }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
          <el-descriptions-item label="支付时间">{{ formatDate(detailRow.payTime) }}</el-descriptions-item>
          <el-descriptions-item v-if="detailRow.refundAmount" label="退款金额">
            <span style="color: #F59E0B; font-weight: 600">&yen;{{ (detailRow.refundAmount / 100).toFixed(2) }}</span>
          </el-descriptions-item>
          <el-descriptions-item v-if="detailRow.refundTime" label="退款时间">{{ formatDate(detailRow.refundTime) }}</el-descriptions-item>
          <el-descriptions-item label="关联订单">
            <template v-if="detailRow.crmOrderNo">
              <el-link type="primary">{{ detailRow.crmOrderNo }}</el-link>
            </template>
            <span v-else style="color: #c0c4cc">-</span>
          </el-descriptions-item>
          <el-descriptions-item label="备注">{{ detailRow.remark || '-' }}</el-descriptions-item>
        </el-descriptions>

        <div style="margin-top: 20px">
          <h4 style="margin-bottom: 12px; color: #303133">状态流转</h4>
          <el-timeline>
            <el-timeline-item :timestamp="formatDate(detailRow.createdAt)" placement="top" type="primary">
              创建收款单
            </el-timeline-item>
            <el-timeline-item v-if="detailRow.payTime" :timestamp="formatDate(detailRow.payTime)" placement="top" type="success">
              {{ detailRow.status === 'refunded' ? '客户已支付' : '支付成功' }}
            </el-timeline-item>
            <el-timeline-item v-if="detailRow.status === 'refunded'" :timestamp="formatDate(detailRow.refundTime)" placement="top" type="warning">
              已退款 ¥{{ (detailRow.refundAmount / 100).toFixed(2) }}
            </el-timeline-item>
            <el-timeline-item v-if="detailRow.status === 'cancelled'" timestamp="" placement="top" type="info">
              已取消
            </el-timeline-item>
          </el-timeline>
        </div>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomPayment' })
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh } from '@element-plus/icons-vue'
import { getWecomConfigs, getWecomPayments, syncWecomPayments } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import PaymentStats from './components/PaymentStats.vue'
import PaymentRefundManager from './components/PaymentRefundManager.vue'
import PaymentSettings from './components/PaymentSettings.vue'
import { useWecomDemo, DEMO_PAYMENTS, DEMO_CONFIGS } from './composables/useWecomDemo'

const { isDemoMode } = useWecomDemo()

const loading = ref(false)
const syncing = ref(false)
const configList = ref<any[]>([])
const paymentList = ref<any[]>([])
const total = ref(0)
const activeTab = ref('records')
const receiverFilter = ref<any[]>([])

const detailVisible = ref(false)
const detailRow = ref<any>(null)

const serverSummary = ref({ totalAmount: 0, paidCount: 0, pendingCount: 0, refundedCount: 0, cancelledCount: 0, refundAmount: 0 })

const query = ref({
  configId: null as number | null, status: '', keyword: '', customerName: '', userName: '',
  startDate: '', endDate: '', page: 1, pageSize: 20, userId: '', departmentId: null as number | null
})

const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

// 收款人下拉选项（部门+成员级联）
const receiverOptions = computed(() => {
  // 从已有数据提取部门和成员
  const deptMap = new Map<string, Set<string>>()
  for (const p of paymentList.value) {
    const dept = p.departmentName || '未分组'
    if (!deptMap.has(dept)) deptMap.set(dept, new Set())
    if (p.userName) deptMap.get(dept)!.add(p.userName)
  }
  return Array.from(deptMap.entries()).map(([dept, members]) => ({
    label: dept, value: `dept:${dept}`,
    children: Array.from(members).map(m => ({ label: m, value: `user:${m}` }))
  }))
})

const handleReceiverChange = (val: any[]) => {
  if (!val || val.length === 0) {
    query.value.userName = ''
    query.value.departmentId = null
  } else {
    const last = val[val.length - 1]
    if (typeof last === 'string' && last.startsWith('user:')) {
      query.value.userName = last.replace('user:', '')
    } else {
      query.value.userName = ''
    }
  }
  handleSearch()
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'
const getStatusType = (s: string) => ({ pending: 'warning', paid: 'success', refunded: 'info', cancelled: 'danger' }[s] || 'info') as any
const getStatusText = (s: string) => ({ pending: '待支付', paid: '已支付', refunded: '已退款', cancelled: '已取消' }[s] || s)

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (Array.isArray(res) ? res : []).filter((c: any) => c.isEnabled)
  } catch (e) { console.error('[WecomPayment] Fetch configs error:', e) }
}

const fetchList = async () => {
  if (isDemoMode.value) {
    paymentList.value = DEMO_PAYMENTS as any[]
    total.value = paymentList.value.length
    return
  }
  loading.value = true
  try {
    const res = await getWecomPayments(query.value as any)
    const data = res?.data || res
    if (data?.list) {
      paymentList.value = data.list
      total.value = data.total || 0
      if (data.summary) serverSummary.value = data.summary
    } else { paymentList.value = []; total.value = 0 }
  } catch (e) { console.error('[WecomPayment] Fetch list error:', e) }
  finally { loading.value = false }
}

const handleSearch = () => {
  query.value.page = 1
  fetchList()
}

const resetFilters = () => {
  query.value = { configId: query.value.configId, status: '', keyword: '', customerName: '', userName: '', startDate: '', endDate: '', page: 1, pageSize: 20, userId: '', departmentId: null }
  receiverFilter.value = []
  fetchList()
}

const handleSync = async () => {
  if (!query.value.configId) { ElMessage.warning('请先选择企微配置'); return }
  syncing.value = true
  try {
    const res = await syncWecomPayments({ configId: query.value.configId })
    ElMessage.success(res?.message || '同步完成')
    fetchList()
  } catch (e: any) { ElMessage.error(e?.message || '同步失败') }
  finally { syncing.value = false }
}

const handleViewDetail = (row: any) => {
  detailRow.value = row
  detailVisible.value = true
}

const handleLinkOrder = (row: any) => {
  ElMessage.info(`关联CRM订单 — 收款单: ${row.paymentNo}`)
}

onMounted(() => { fetchConfigs(); fetchList() })
</script>

<style scoped lang="scss">
.wecom-payment { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.amount { font-weight: bold; color: #EF4444; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }

.filter-bar {
  background: #fff; border: 1px solid #EBEEF5; border-radius: 10px;
  padding: 16px 20px; margin-bottom: 16px;
}
.filter-row { display: flex; gap: 10px; align-items: center; flex-wrap: wrap; }

.v4-stats-row { display: flex; gap: 12px; flex-wrap: wrap; }
.v4-stat-card {
  display: flex; align-items: center; gap: 14px;
  flex: 1; min-width: 160px;
  background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; padding: 16px;
}
.v4-stat-card .stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.v4-stat-card .stat-body { flex: 1; }
.v4-stat-card .stat-num { font-size: 22px; font-weight: 700; line-height: 1.2; }
.v4-stat-card .stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
</style>
