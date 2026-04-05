<template>
  <div class="page-container">
    <!-- 预警级别统计 -->
    <div class="stats-row">
      <el-card shadow="never" class="stat-card expired">
        <div class="stat-icon">⚫</div>
        <div class="stat-value">{{ levelStats.expired }}</div>
        <div class="stat-label">已过期</div>
        <div class="stat-desc">授权已到期，需尽快跟进续费</div>
      </el-card>
      <el-card shadow="never" class="stat-card critical">
        <div class="stat-icon">🔴</div>
        <div class="stat-value">{{ levelStats.critical }}</div>
        <div class="stat-label">重点提醒（≤10%）</div>
        <div class="stat-desc">剩余使用时间不足总周期10%</div>
      </el-card>
      <el-card shadow="never" class="stat-card warning">
        <div class="stat-icon">🟡</div>
        <div class="stat-value">{{ levelStats.warning }}</div>
        <div class="stat-label">预警提醒（≤20%）</div>
        <div class="stat-desc">剩余使用时间不足总周期20%</div>
      </el-card>
      <el-card shadow="never" class="stat-card normal">
        <div class="stat-icon">🟢</div>
        <div class="stat-value">{{ levelStats.normal }}</div>
        <div class="stat-label">关注客户（≤50%）</div>
        <div class="stat-desc">剩余使用时间不足总周期50%</div>
      </el-card>
    </div>

    <!-- 提示说明 -->
    <el-alert
      title="续费提醒说明"
      type="info"
      :closable="false"
      show-icon
      class="tip-alert"
    >
      <template #default>
        系统自动根据客户的授权开始时间和到期时间计算剩余百分比。
        <strong>⚫ 已过期</strong>：授权已到期，需立即跟进续费；
        <strong>🔴 重点提醒</strong>：剩余≤10%，需立即跟进；
        <strong>🟡 预警提醒</strong>：剩余≤20%，优先跟进；
        <strong>🟢 关注客户</strong>：剩余≤50%，可提前沟通。
        永久授权客户不在此列表中。
      </template>
    </el-alert>

    <!-- 筛选器 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="预警级别">
          <el-select v-model="searchForm.level" placeholder="全部" clearable style="width: 170px">
            <el-option label="⚫ 已过期" value="expired" />
            <el-option label="🔴 重点提醒（≤10%）" value="critical" />
            <el-option label="🟡 预警提醒（≤20%）" value="warning" />
          </el-select>
        </el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="searchForm.customerType" placeholder="全部" clearable style="width: 120px">
            <el-option label="私有客户" value="private" />
            <el-option label="租户客户" value="tenant" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>搜索
          </el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 续费提醒列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>续费提醒客户列表</span>
          <div class="header-actions">
            <el-tag type="info" size="small">共 {{ pagination.total }} 位客户需关注</el-tag>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe :border="false" table-layout="fixed"
        :row-class-name="getRowClassName">
        <el-table-column label="预警" width="65" align="center">
          <template #default="{ row }">
            <el-tooltip :content="getLevelTooltip(row)" placement="top">
              <span class="level-dot" :class="getLevelClass(row)">
                {{ getLevelIcon(row) }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="客户名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="customer-name-cell">
              <el-tag :type="row.customerType === 'private' ? 'warning' : 'primary'" size="small" class="type-badge">
                {{ row.customerType === 'private' ? '私有' : '租户' }}
              </el-tag>
              <span class="name">{{ row.customerName }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" width="90" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contact || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.phone" class="phone-link" @click="copyText(row.phone)">{{ row.phone }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="套餐/类型" width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.packageName">{{ row.packageName }}</span>
            <span v-else>{{ getLicenseTypeText(row.licenseType) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="110" align="center">
          <template #default="{ row }">
            <span class="expire-date" :class="{ 'text-danger': row.remainingDays <= 7 || row.remainingDays < 0 }">
              {{ formatDate(row.expireDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="剩余天数" width="100" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.remainingDays < 0" type="danger" size="small" effect="dark">
              过期{{ Math.abs(row.remainingDays) }}天
            </el-tag>
            <el-tag v-else :type="row.remainingDays <= 7 ? 'danger' : row.remainingDays <= 30 ? 'warning' : 'info'" size="small">
              {{ row.remainingDays }}天
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="剩余比例" width="140" align="center">
          <template #default="{ row }">
            <div v-if="row.remainingDays < 0" class="expired-text">已过期</div>
            <div v-else class="progress-cell">
              <el-progress
                :percentage="Math.max(0, Math.min(100, Number(row.remainingPercent) || 0))"
                :color="getProgressColor(row.remainingPercent)"
                :stroke-width="10"
                :show-text="false"
              />
              <span class="progress-text">{{ Number(row.remainingPercent || 0).toFixed(1) }}%</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="最新跟进" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.lastFollowUp" class="follow-up-cell">
              <span class="follow-content">{{ row.lastFollowUp }}</span>
              <span class="follow-meta">
                {{ row.lastFollowUpBy || '' }} · {{ formatDate(row.lastFollowUpTime) }}
              </span>
            </div>
            <el-tag v-else type="danger" size="small" effect="plain">未跟进</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="success" size="small" @click="openFollowUp(row)">
                <el-icon><ChatLineSquare /></el-icon>跟进
              </el-button>
              <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
              <el-button link type="warning" size="small" @click="goRenew(row)">续期</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>

    <!-- 跟进记录对话框 -->
    <el-dialog v-model="showFollowDialog" :title="`跟进续费 - ${followTarget?.customerName || ''}`" width="620px" destroy-on-close>
      <!-- 客户信息摘要 -->
      <div v-if="followTarget" class="follow-customer-info">
        <el-descriptions :column="2" size="small" border>
          <el-descriptions-item label="客户类型">
            <el-tag :type="followTarget.customerType === 'private' ? 'warning' : 'primary'" size="small">
              {{ followTarget.customerType === 'private' ? '私有客户' : '租户客户' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">{{ followTarget.phone || '-' }}</el-descriptions-item>
          <el-descriptions-item label="到期时间">
            <span class="text-danger">{{ formatDate(followTarget.expireDate) }}</span>
          </el-descriptions-item>
          <el-descriptions-item label="剩余天数">
            <el-tag v-if="followTarget.remainingDays < 0" type="danger" size="small" effect="dark">
              已过期{{ Math.abs(followTarget.remainingDays) }}天
            </el-tag>
            <el-tag v-else :type="followTarget.remainingDays <= 7 ? 'danger' : 'warning'" size="small">
              {{ followTarget.remainingDays }}天
            </el-tag>
          </el-descriptions-item>
        </el-descriptions>
      </div>

      <!-- 添加跟进 -->
      <div class="follow-add-section">
        <el-input
          v-model="followContent"
          type="textarea"
          :rows="3"
          placeholder="请输入跟进内容，例如：已电话联系客户，客户表示下周续费；客户询问续费优惠方案..."
          maxlength="500"
          show-word-limit
        />
        <el-button type="primary" style="margin-top: 8px;" @click="submitFollowUp" :loading="followSubmitting" :disabled="!followContent.trim()">
          <el-icon><ChatLineSquare /></el-icon>提交跟进记录
        </el-button>
      </div>

      <!-- 历史记录 -->
      <el-divider content-position="left">历史跟进记录</el-divider>
      <div v-loading="followLoading" class="follow-history">
        <div v-if="followList.length === 0" class="follow-empty">
          <el-empty description="暂无跟进记录，请及时联系客户!" :image-size="60" />
        </div>
        <div v-for="item in followList" :key="item.id" class="follow-item">
          <div class="follow-item-header">
            <span class="follow-operator">{{ item.operator_name || '系统' }}</span>
            <span class="follow-date">{{ formatDateTime(item.created_at) }}</span>
          </div>
          <div class="follow-item-content">{{ item.content }}</div>
        </div>
        <div v-if="followTotal > followList.length" class="follow-more">
          <el-button link type="primary" @click="loadMoreFollowUps">加载更多</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Search, ChatLineSquare } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const searchForm = reactive({ level: '', customerType: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const tableData = ref<any[]>([])
const levelStats = reactive({ expired: 0, critical: 0, warning: 0, normal: 0 })

// 跟进对话框
const showFollowDialog = ref(false)
const followTarget = ref<any>(null)
const followContent = ref('')
const followSubmitting = ref(false)
const followLoading = ref(false)
const followList = ref<any[]>([])
const followTotal = ref(0)
const followPage = ref(1)

// ======== 工具方法 ========
const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const getLicenseTypeText = (type: string) => {
  const map: Record<string, string> = { trial: '试用', annual: '年度', perpetual: '永久', saas: 'SaaS', monthly: '月付' }
  return map[type] || type
}

// 预警级别
const getLevelClass = (row: any) => {
  if (Number(row.remainingDays) < 0) return 'level-expired'
  const p = Number(row.remainingPercent) || 0
  if (p <= 10) return 'level-critical'
  if (p <= 20) return 'level-warning'
  return 'level-normal'
}

const getLevelIcon = (row: any) => {
  if (Number(row.remainingDays) < 0) return '⚫'
  const p = Number(row.remainingPercent) || 0
  if (p <= 10) return '🔴'
  if (p <= 20) return '🟡'
  return '🟢'
}

const getLevelTooltip = (row: any) => {
  if (Number(row.remainingDays) < 0) return `已过期${Math.abs(row.remainingDays)}天，请立即联系续费！`
  const p = Number(row.remainingPercent) || 0
  if (p <= 10) return `重点提醒：剩余${p.toFixed(1)}%，请立即联系续费！`
  if (p <= 20) return `预警提醒：剩余${p.toFixed(1)}%，请尽快联系续费`
  return `关注：剩余${p.toFixed(1)}%，可提前沟通`
}

const getProgressColor = (percent: number) => {
  const p = Number(percent) || 0
  if (p <= 10) return '#f56c6c'
  if (p <= 20) return '#e6a23c'
  if (p <= 50) return '#409eff'
  return '#67c23a'
}

const getRowClassName = ({ row }: { row: any }) => {
  if (Number(row.remainingDays) < 0) return 'row-expired'
  const p = Number(row.remainingPercent) || 0
  if (p <= 10) return 'row-critical'
  if (p <= 20) return 'row-warning'
  return ''
}

// ======== 搜索 ========
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}
const handleReset = () => {
  Object.assign(searchForm, { level: '', customerType: '' })
  handleSearch()
}

// ======== 操作 ========
const goDetail = (row: any) => {
  if (row.customerType === 'private') {
    router.push(`/private-customers/detail/${row.id}`)
  } else {
    router.push(`/tenant-customers/detail/${row.id}`)
  }
}

const goRenew = (row: any) => {
  if (row.customerType === 'private') {
    router.push('/private-customers/list')
  } else {
    router.push('/tenant-customers/list')
  }
}

// ======== 跟进 ========
const openFollowUp = async (row: any) => {
  followTarget.value = row
  followContent.value = ''
  followList.value = []
  followTotal.value = 0
  followPage.value = 1
  showFollowDialog.value = true
  await loadFollowUps()
}

const loadFollowUps = async () => {
  if (!followTarget.value) return
  followLoading.value = true
  try {
    const res = await adminApi.getFollowUps(followTarget.value.id, {
      customerType: followTarget.value.customerType,
      page: followPage.value,
      pageSize: 10
    })
    if (res.success) {
      if (followPage.value === 1) {
        followList.value = res.data.list || []
      } else {
        followList.value = [...followList.value, ...(res.data.list || [])]
      }
      followTotal.value = res.data.total || 0
    }
  } catch {
    // 静默处理
  } finally {
    followLoading.value = false
  }
}

const loadMoreFollowUps = () => {
  followPage.value++
  loadFollowUps()
}

const submitFollowUp = async () => {
  if (!followContent.value.trim() || !followTarget.value) return
  followSubmitting.value = true
  try {
    const res = await adminApi.addFollowUp({
      customerId: followTarget.value.id,
      customerType: followTarget.value.customerType,
      content: followContent.value.trim()
    })
    if (res.success) {
      ElMessage.success('跟进记录已保存')
      followContent.value = ''
      followPage.value = 1
      await loadFollowUps()
      // 刷新列表中的最新跟进
      fetchData()
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    followSubmitting.value = false
  }
}

// ======== 数据获取 ========
const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getRenewalReminders({
      page: pagination.page,
      pageSize: pagination.pageSize,
      level: searchForm.level || undefined,
      customerType: searchForm.customerType || undefined
    })
    if (res.success) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
      if (res.data.levelStats) {
        Object.assign(levelStats, res.data.levelStats)
      }
    }
  } catch {
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }

.tip-alert {
  border-radius: 8px;
  :deep(.el-alert__description) { font-size: 13px; line-height: 1.8; }
}

.stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;

  .stat-card {
    border-radius: 12px; border: none; text-align: center;
    transition: transform 0.2s, box-shadow 0.2s;
    cursor: default;
    :deep(.el-card__body) { padding: 20px 16px; }

    &:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }

    .stat-icon { font-size: 28px; margin-bottom: 4px; }
    .stat-value { font-size: 32px; font-weight: 700; line-height: 1.3; }
    .stat-label { font-size: 14px; color: #606266; margin-top: 4px; font-weight: 500; }
    .stat-desc { font-size: 11px; color: #b0b3b8; margin-top: 6px; }

    &.expired .stat-value { color: #303133; }
    &.critical .stat-value { color: #f56c6c; }
    &.warning .stat-value { color: #e6a23c; }
    &.normal .stat-value { color: #67c23a; }
  }
}

.customer-name-cell {
  display: flex; align-items: center; gap: 6px;
  .name { font-weight: 500; }
  .type-badge { flex-shrink: 0; }
}

.level-dot { font-size: 18px; }

.phone-link {
  color: #409eff; cursor: pointer;
  &:hover { text-decoration: underline; }
}

.expire-date { font-weight: 500; }

.progress-cell {
  display: flex; align-items: center; gap: 6px;
  .progress-text { font-size: 12px; color: #606266; white-space: nowrap; min-width: 40px; }
}

.follow-up-cell {
  display: flex; flex-direction: column; gap: 2px;
  .follow-content { font-size: 13px; color: #303133; }
  .follow-meta { font-size: 11px; color: #c0c4cc; }
}

.action-buttons {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  flex-wrap: nowrap; white-space: nowrap;
}

/* 行高亮 */
:deep(.row-expired) {
  background-color: rgba(48, 49, 51, 0.06) !important;
}
:deep(.row-critical) {
  background-color: rgba(245, 108, 108, 0.04) !important;
}
:deep(.row-warning) {
  background-color: rgba(230, 162, 60, 0.04) !important;
}

.expired-text {
  color: #909399;
  font-size: 12px;
  font-weight: 600;
}

/* 跟进对话框 */
.follow-customer-info { margin-bottom: 16px; }
.follow-add-section { margin-bottom: 8px; }

.follow-history {
  max-height: 350px; overflow-y: auto;
}

.follow-empty { padding: 16px 0; }

.follow-item {
  padding: 12px; margin-bottom: 8px;
  background: #f5f7fa; border-radius: 8px;

  .follow-item-header {
    display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;
    .follow-operator { font-size: 13px; font-weight: 600; color: #409eff; }
    .follow-date { font-size: 12px; color: #909399; }
  }

  .follow-item-content { font-size: 14px; color: #303133; line-height: 1.6; }
}

.follow-more { text-align: center; padding: 8px 0; }

/* 响应式 */
@media screen and (max-width: 1024px) {
  .stats-row { grid-template-columns: repeat(2, 1fr); }
}
@media screen and (max-width: 768px) {
  .stats-row {
    grid-template-columns: 1fr;
    .stat-card { .stat-value { font-size: 26px; } }
  }
  .search-card :deep(.el-form) {
    display: flex; flex-direction: column;
    .el-form-item {
      margin-right: 0; margin-bottom: 12px; width: 100%;
      .el-input, .el-select { width: 100% !important; }
    }
  }
  .card-header { flex-direction: column; gap: 8px; align-items: flex-start; }
  .table-card :deep(.el-table) { overflow-x: auto; }
}
</style>
