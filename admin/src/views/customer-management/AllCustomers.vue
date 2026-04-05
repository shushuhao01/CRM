<template>
  <div class="page-container">
    <!-- 统计概览 -->
    <div class="stats-row">
      <el-card shadow="never" class="stat-card">
        <div class="stat-value">{{ stats.combined.total }}</div>
        <div class="stat-label">客户总数</div>
        <div class="stat-sub">
          <span>私有 {{ stats.private.total }}</span>
          <span class="sep">|</span>
          <span>租户 {{ stats.tenant.total }}</span>
        </div>
      </el-card>
      <el-card shadow="never" class="stat-card active">
        <div class="stat-value">{{ stats.combined.active }}</div>
        <div class="stat-label">有效/活跃</div>
        <div class="stat-sub">
          <span>私有 {{ stats.private.active }}</span>
          <span class="sep">|</span>
          <span>租户 {{ stats.tenant.active }}</span>
        </div>
      </el-card>
      <el-card shadow="never" class="stat-card danger">
        <div class="stat-value">{{ stats.combined.expired }}</div>
        <div class="stat-label">已过期</div>
        <div class="stat-sub">
          <span>私有 {{ stats.private.expired }}</span>
          <span class="sep">|</span>
          <span>租户 {{ stats.tenant.expired }}</span>
        </div>
      </el-card>
      <el-card shadow="never" class="stat-card warning">
        <div class="stat-value">{{ stats.combined.pendingRenewal }}</div>
        <div class="stat-label">待续费</div>
        <div class="stat-sub">
          <span>私有 {{ stats.private.pendingRenewal }}</span>
          <span class="sep">|</span>
          <span>租户 {{ stats.tenant.pendingRenewal }}</span>
        </div>
      </el-card>
      <el-card shadow="never" class="stat-card info">
        <div class="stat-value">{{ stats.private.pending + stats.private.revoked + stats.tenant.disabled }}</div>
        <div class="stat-label">待激活/已停用</div>
        <div class="stat-sub">
          <span>待激活 {{ stats.private.pending }}</span>
          <span class="sep">|</span>
          <span>停用 {{ stats.private.revoked + stats.tenant.disabled }}</span>
        </div>
      </el-card>
    </div>

    <!-- 筛选器 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/电话/授权码" clearable style="width: 200px" @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item label="客户类型">
          <el-select v-model="searchForm.customerType" placeholder="全部" clearable style="width: 120px">
            <el-option label="私有客户" value="private" />
            <el-option label="租户客户" value="tenant" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 120px">
            <el-option label="有效" value="active" />
            <el-option label="已过期" value="expired" />
            <el-option label="待激活" value="pending" />
            <el-option label="已吊销" value="revoked" />
            <el-option label="已禁用" value="disabled" />
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

    <!-- 客户列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>所有客户列表</span>
          <div class="header-actions">
            <el-tag type="info" size="small">共 {{ pagination.total }} 条</el-tag>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe :border="false" table-layout="fixed">
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
        <el-table-column prop="contact" label="联系人" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contact || '-' }}</template>
        </el-table-column>
        <el-table-column prop="phone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="授权码" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="license-key-cell">
              <span class="license-key">{{ row.showFullKey ? row.licenseKey : maskKey(row.licenseKey) }}</span>
              <el-tooltip :content="row.showFullKey ? '隐藏' : '显示'" placement="top">
                <el-icon class="action-icon" @click="row.showFullKey = !row.showFullKey">
                  <View v-if="!row.showFullKey" />
                  <Hide v-else />
                </el-icon>
              </el-tooltip>
              <el-tooltip content="复制" placement="top">
                <el-icon class="action-icon" @click="copyText(row.licenseKey)">
                  <CopyDocument />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="授权类型" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getLicenseTypeTag(row.licenseType)" size="small">
              {{ getLicenseTypeText(row.licenseType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="套餐/类型" width="100" align="center" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.packageName">{{ row.packageName }}</span>
            <span v-else-if="row.customerType === 'private'">{{ getLicenseTypeText(row.licenseType) }}</span>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column label="用户上限" width="80" align="center">
          <template #default="{ row }">{{ row.maxUsers || 0 }}</template>
        </el-table-column>
        <el-table-column label="状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row)" size="small">{{ getStatusText(row) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="110" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expireDate), 'text-warning': isExpiringSoon(row.expireDate) }">
              {{ formatExpireDate(row) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="最新跟进" min-width="140" show-overflow-tooltip>
          <template #default="{ row }">
            <div v-if="row.lastFollowUp" class="follow-up-cell">
              <span class="follow-content">{{ row.lastFollowUp }}</span>
              <span class="follow-time">{{ formatDate(row.lastFollowUpTime) }}</span>
            </div>
            <span v-else class="text-muted">暂无跟进</span>
          </template>
        </el-table-column>
        <el-table-column label="创建时间" width="110" align="center">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="160" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" size="small" @click="goDetail(row)">详情</el-button>
              <el-button link type="success" size="small" @click="openFollowUp(row)">跟进</el-button>
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
    <el-dialog v-model="showFollowDialog" :title="`跟进记录 - ${followTarget?.customerName || ''}`" width="600px" destroy-on-close>
      <!-- 添加跟进 -->
      <div class="follow-add-section">
        <el-input
          v-model="followContent"
          type="textarea"
          :rows="3"
          placeholder="请输入跟进内容，例如：已电话联系客户，客户表示下周续费..."
          maxlength="500"
          show-word-limit
        />
        <el-button type="primary" style="margin-top: 8px;" @click="submitFollowUp" :loading="followSubmitting" :disabled="!followContent.trim()">
          <el-icon><ChatLineSquare /></el-icon>提交跟进
        </el-button>
      </div>

      <!-- 历史记录 -->
      <el-divider content-position="left">历史跟进记录</el-divider>
      <div v-loading="followLoading" class="follow-history">
        <div v-if="followList.length === 0" class="follow-empty">
          <el-empty description="暂无跟进记录" :image-size="60" />
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
import { Search, View, Hide, CopyDocument, ChatLineSquare } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const searchForm = reactive({ keyword: '', customerType: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const tableData = ref<any[]>([])

const stats = reactive({
  private: { total: 0, active: 0, expired: 0, pending: 0, revoked: 0, pendingRenewal: 0 },
  tenant: { total: 0, active: 0, expired: 0, disabled: 0, pendingRenewal: 0 },
  combined: { total: 0, active: 0, expired: 0, pendingRenewal: 0 }
})

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
const maskKey = (key: string) => {
  if (!key) return ''
  if (key.length > 12) return key.substring(0, 8) + '****' + key.substring(key.length - 4)
  return key.substring(0, 4) + '****'
}

const copyText = async (text: string) => {
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isExpired = (date: string) => date && new Date(date) < new Date()
const isExpiringSoon = (date: string) => {
  if (!date) return false
  const d = new Date(date)
  const now = new Date()
  const thirtyDays = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
  return d > now && d <= thirtyDays
}

const formatExpireDate = (row: any) => {
  if (row.licenseType === 'perpetual') return '永久'
  if (!row.expireDate) return '永久'
  return new Date(row.expireDate).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const getLicenseTypeTag = (type: string) => {
  const map: Record<string, string> = { trial: 'info', annual: '', perpetual: 'success', saas: 'primary', monthly: 'warning' }
  return (map[type] || 'info') as any
}
const getLicenseTypeText = (type: string) => {
  const map: Record<string, string> = { trial: '试用', annual: '年度', perpetual: '永久', saas: 'SaaS', monthly: '月付' }
  return map[type] || type
}

const getStatusType = (row: any) => {
  const s = row.status
  if (s === 'active' && !isExpired(row.expireDate)) return 'success'
  if (s === 'active' && isExpired(row.expireDate)) return 'info'
  if (s === 'expired') return 'info'
  if (s === 'pending') return 'warning'
  if (s === 'revoked' || s === 'disabled') return 'danger'
  return 'info'
}

const getStatusText = (row: any) => {
  const s = row.status
  if (s === 'active' && isExpired(row.expireDate) && row.licenseType !== 'perpetual' && row.expireDate) return '已过期'
  const map: Record<string, string> = { active: '有效', expired: '已过期', pending: '待激活', revoked: '已吊销', disabled: '已禁用' }
  return map[s] || s
}

// ======== 搜索 ========
const handleSearch = () => {
  pagination.page = 1
  fetchData()
}
const handleReset = () => {
  Object.assign(searchForm, { keyword: '', customerType: '', status: '' })
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
    const res = await adminApi.getAllCustomers({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      customerType: searchForm.customerType || undefined,
      status: searchForm.status || undefined
    })
    if (res.success) {
      tableData.value = (res.data.list || []).map((item: any) => ({ ...item, showFullKey: false }))
      pagination.total = res.data.total || 0
    }
  } catch {
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await adminApi.getCustomerManagementStats()
    if (res.success && res.data) {
      Object.assign(stats.private, res.data.private || {})
      Object.assign(stats.tenant, res.data.tenant || {})
      Object.assign(stats.combined, res.data.combined || {})
    }
  } catch {
    // 统计失败不影响主功能
  }
}

onMounted(() => {
  fetchData()
  fetchStats()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }
.text-warning { color: #e6a23c; }
.text-muted { color: #c0c4cc; font-size: 12px; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;

  .stat-card {
    border-radius: 8px; border: none; text-align: center;
    :deep(.el-card__body) { padding: 16px 12px; }

    .stat-value { font-size: 28px; font-weight: 700; color: #303133; line-height: 1.3; }
    .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
    .stat-sub {
      font-size: 11px; color: #b0b3b8; margin-top: 6px;
      .sep { margin: 0 4px; }
    }

    &.active .stat-value { color: #67c23a; }
    &.warning .stat-value { color: #e6a23c; }
    &.danger .stat-value { color: #f56c6c; }
    &.info .stat-value { color: #909399; }
  }
}

.customer-name-cell {
  display: flex; align-items: center; gap: 6px;
  .name { font-weight: 500; }
  .type-badge { flex-shrink: 0; }
}

.license-key-cell {
  display: flex; align-items: center; gap: 6px;
  .license-key {
    font-family: 'Courier New', monospace; font-size: 12px;
    flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  }
  .action-icon {
    cursor: pointer; font-size: 16px; color: #409eff; transition: all 0.2s; flex-shrink: 0;
    &:hover { color: #66b1ff; transform: scale(1.1); }
  }
}

.action-buttons {
  display: flex; align-items: center; justify-content: center; gap: 2px;
  flex-wrap: nowrap; white-space: nowrap;
}

.follow-up-cell {
  display: flex; flex-direction: column; gap: 2px;
  .follow-content { font-size: 13px; color: #303133; }
  .follow-time { font-size: 11px; color: #c0c4cc; }
}

/* 跟进对话框 */
.follow-add-section { margin-bottom: 8px; }

.follow-history {
  max-height: 400px; overflow-y: auto;
}

.follow-empty { padding: 20px 0; }

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
@media screen and (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
    .stat-card .stat-value { font-size: 22px; }
    .stat-card .stat-label { font-size: 11px; }
    .stat-card .stat-sub { display: none; }
  }
  .search-card :deep(.el-form) {
    display: flex; flex-direction: column;
    .el-form-item {
      margin-right: 0; margin-bottom: 12px; width: 100%;
      .el-input, .el-select { width: 100% !important; }
    }
  }
  .card-header {
    flex-direction: column; gap: 8px; align-items: flex-start;
  }
  .table-card :deep(.el-table) { overflow-x: auto; }
}
</style>
