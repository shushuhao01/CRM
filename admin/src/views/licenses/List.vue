<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="授权码/客户名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="授权类型">
          <el-select v-model="searchForm.licenseType" placeholder="全部" clearable style="width: 120px">
            <el-option label="试用" value="trial" />
            <el-option label="年度" value="annual" />
            <el-option label="永久" value="perpetual" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="待激活" value="pending" />
            <el-option label="有效" value="active" />
            <el-option label="过期" value="expired" />
            <el-option label="已吊销" value="revoked" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>授权列表（私有部署）</span>
          <el-button type="primary" @click="$router.push('/licenses/generate')">
            <el-icon><Plus /></el-icon>生成授权码
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="licenseKey" label="授权码" min-width="220">
          <template #default="{ row }">
            <div class="license-key">
              <code>{{ row.showFullKey ? row.licenseKey : maskKey(row.licenseKey) }}</code>
              <el-button link size="small" @click="row.showFullKey = !row.showFullKey">
                {{ row.showFullKey ? '隐藏' : '显示' }}
              </el-button>
              <el-button link size="small" @click="copyKey(row.licenseKey)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户名称" min-width="150" />
        <el-table-column prop="licenseType" label="授权类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getLicenseTypeTag(row.licenseType)" size="small">
              {{ getLicenseTypeText(row.licenseType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maxUsers" label="用户数" width="80" align="center" />
        <el-table-column prop="expiresAt" label="到期时间" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expiresAt) }">
              {{ row.licenseType === 'perpetual' ? '永久' : formatDate(row.expiresAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="activatedAt" label="激活时间" width="160">
          <template #default="{ row }">{{ row.activatedAt ? formatDateTime(row.activatedAt) : '-' }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/licenses/detail/${row.id}`)">详情</el-button>
            <el-button v-if="row.status === 'active'" link type="warning" @click="handleRenew(row)">续期</el-button>
            <el-button v-if="row.status === 'active'" link type="danger" @click="handleRevoke(row)">吊销</el-button>
            <el-button v-if="row.status === 'pending'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="fetchData" @current-change="fetchData" />
      </div>
    </el-card>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="授权续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="当前到期">
          {{ renewingLicense?.licenseType === 'perpetual' ? '永久' : formatDate(renewingLicense?.expiresAt) }}
        </el-form-item>
        <el-form-item label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, CopyDocument } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const submitting = ref(false)
const showRenewDialog = ref(false)
const renewingLicense = ref<any>(null)
const renewExpireDate = ref<Date | null>(null)

const searchForm = reactive({ keyword: '', licenseType: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const tableData = ref<any[]>([])

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 12) + '****'
}

const copyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isExpired = (date: string) => date && new Date(date) < new Date()
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-'
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: 'primary', perpetual: 'success' }[type] || 'info')
const getLicenseTypeText = (type: string) => ({ trial: '试用', annual: '年度', perpetual: '永久' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info')
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)

const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { keyword: '', licenseType: '', status: '' }); handleSearch() }

const handleRenew = (row: any) => {
  renewingLicense.value = row
  renewExpireDate.value = null
  showRenewDialog.value = true
}

const confirmRenew = async () => {
  if (!renewExpireDate.value) {
    ElMessage.warning('请选择新的到期时间')
    return
  }
  submitting.value = true
  try {
    const res = await adminApi.renewLicense(renewingLicense.value.id, renewExpireDate.value.toISOString())
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchData()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
  } finally {
    submitting.value = false
  }
}

const handleRevoke = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要吊销 ${row.customerName} 的授权吗？吊销后该授权将无法使用。`, '吊销授权', { type: 'warning' })
    const res = await adminApi.revokeLicense(row.id)
    if (res.success) {
      ElMessage.success('已吊销')
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const handleDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除该授权吗？`, '删除授权', { type: 'warning' })
    const res = await adminApi.deleteLicense(row.id)
    if (res.success) {
      ElMessage.success('已删除')
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLicenses({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      licenseType: searchForm.licenseType || undefined,
      status: searchForm.status || undefined
    })
    if (res.success) {
      tableData.value = (res.data.list || []).map((item: any) => ({ ...item, showFullKey: false }))
      pagination.total = res.data.total || 0
    }
  } catch (e) {
    // 使用模拟数据
    tableData.value = [
      { id: '1', licenseKey: 'A1B2C3D4-E5F6G7H8-I9J0K1L2-M3N4O5P6', customerName: '测试公司A', licenseType: 'perpetual', maxUsers: 100, expiresAt: null, status: 'active', activatedAt: '2025-01-15 10:30:00', showFullKey: false },
      { id: '2', licenseKey: 'Q1R2S3T4-U5V6W7X8-Y9Z0A1B2-C3D4E5F6', customerName: '测试公司B', licenseType: 'annual', maxUsers: 50, expiresAt: '2026-12-31', status: 'active', activatedAt: '2025-03-20 14:20:00', showFullKey: false },
      { id: '3', licenseKey: 'G1H2I3J4-K5L6M7N8-O9P0Q1R2-S3T4U5V6', customerName: '测试公司C', licenseType: 'trial', maxUsers: 10, expiresAt: '2026-02-05', status: 'pending', activatedAt: null, showFullKey: false }
    ]
    pagination.total = 3
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }

.license-key {
  display: flex;
  align-items: center;
  gap: 8px;

  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    background: #f5f7fa;
    padding: 2px 6px;
    border-radius: 4px;
  }
}
</style>
