<template>
  <div class="page-container">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">版本列表</span>
            <span class="subtitle">管理系统版本发布与更新</span>
          </div>
          <div class="header-right">
            <el-select v-model="filterStatus" placeholder="全部状态" clearable style="width: 130px; margin-right: 12px" @change="handleFilter">
              <el-option label="草稿" value="draft" />
              <el-option label="已发布" value="published" />
              <el-option label="已废弃" value="deprecated" />
            </el-select>
            <el-button type="primary" @click="$router.push('/versions/upload')">
              <el-icon><Upload /></el-icon>发布新版本
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="version" label="版本号" width="130">
          <template #default="{ row }">
            <span class="version-tag">v{{ row.version }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="releaseType" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getReleaseTypeTag(row.releaseType)" size="small">{{ getReleaseTypeLabel(row.releaseType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="changelog" label="更新说明" min-width="200" show-overflow-tooltip />
        <el-table-column prop="fileSize" label="文件大小" width="110" align="center">
          <template #default="{ row }">
            {{ row.fileSize ? formatFileSize(row.fileSize) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="isForceUpdate" label="强制更新" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isForceUpdate ? 'danger' : 'info'" size="small">
              {{ row.isForceUpdate ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusTag(row.status)" size="small">
              {{ getStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="publishedAt" label="发布时间" width="170">
          <template #default="{ row }">
            {{ row.publishedAt ? formatTime(row.publishedAt) : '-' }}
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" width="170">
          <template #default="{ row }">
            {{ formatTime(row.createdAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">详情</el-button>
            <el-button v-if="row.status === 'draft'" link type="success" @click="handlePublish(row)">发布</el-button>
            <el-button v-if="row.status === 'published'" link type="warning" @click="handleDeprecate(row)">废弃</el-button>
            <el-button v-if="row.downloadUrl" link type="primary" @click="handleDownload(row)">下载</el-button>
            <el-button v-if="row.status !== 'published'" link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
          :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next" @change="fetchData" />
      </div>
    </el-card>

    <!-- 版本详情弹窗 -->
    <el-dialog v-model="detailVisible" title="版本详情" width="600px" destroy-on-close>
      <el-descriptions :column="2" border v-if="currentVersion">
        <el-descriptions-item label="版本号" :span="1">
          <span class="version-tag">v{{ currentVersion.version }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="版本类型" :span="1">
          <el-tag :type="getReleaseTypeTag(currentVersion.releaseType)" size="small">{{ getReleaseTypeLabel(currentVersion.releaseType) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="状态" :span="1">
          <el-tag :type="getStatusTag(currentVersion.status)" size="small">{{ getStatusLabel(currentVersion.status) }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="强制更新" :span="1">
          {{ currentVersion.isForceUpdate ? '是' : '否' }}
        </el-descriptions-item>
        <el-descriptions-item label="文件大小" :span="1">
          {{ currentVersion.fileSize ? formatFileSize(currentVersion.fileSize) : '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="最低版本要求" :span="1">
          {{ currentVersion.minVersion || '-' }}
        </el-descriptions-item>
        <el-descriptions-item label="下载地址" :span="2">
          {{ currentVersion.downloadUrl || '未设置' }}
        </el-descriptions-item>
        <el-descriptions-item label="文件Hash" :span="2">
          <span style="font-family: monospace; font-size: 12px;">{{ currentVersion.fileHash || '-' }}</span>
        </el-descriptions-item>
        <el-descriptions-item label="更新说明" :span="2">
          <div style="white-space: pre-wrap;">{{ currentVersion.changelog || '无' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="创建时间" :span="1">
          {{ formatTime(currentVersion.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="发布时间" :span="1">
          {{ currentVersion.publishedAt ? formatTime(currentVersion.publishedAt) : '-' }}
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filterStatus = ref('')
const tableData = ref<any[]>([])
const detailVisible = ref(false)
const currentVersion = ref<any>(null)

const getReleaseTypeTag = (type: string) => {
  const map: Record<string, string> = { major: 'danger', minor: 'success', patch: 'warning' }
  return map[type] || 'info'
}

const getReleaseTypeLabel = (type: string) => {
  const map: Record<string, string> = { major: '大版本', minor: '功能更新', patch: '补丁' }
  return map[type] || type
}

const getStatusTag = (status: string) => {
  const map: Record<string, string> = { draft: 'info', published: 'success', deprecated: 'warning' }
  return map[status] || 'info'
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { draft: '草稿', published: '已发布', deprecated: '已废弃' }
  return map[status] || status
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const formatTime = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = { page: page.value, pageSize: pageSize.value }
    if (filterStatus.value) params.status = filterStatus.value
    const res = await adminApi.getVersions(params)
    if (res.data) {
      tableData.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('获取版本列表失败:', error)
  } finally {
    loading.value = false
  }
}

const handleFilter = () => {
  page.value = 1
  fetchData()
}

const handleView = async (row: any) => {
  try {
    const res = await adminApi.getVersion(row.id)
    if (res.data) {
      currentVersion.value = res.data
      detailVisible.value = true
    }
  } catch (error) {
    console.error('获取版本详情失败:', error)
  }
}

const handlePublish = (row: any) => {
  ElMessageBox.confirm(`确定发布版本 v${row.version}？发布后将对客户端可见。`, '发布确认', {
    confirmButtonText: '确定发布',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await adminApi.publishVersion(row.id)
      ElMessage.success(`版本 v${row.version} 发布成功`)
      fetchData()
    } catch (error) {
      console.error('发布版本失败:', error)
    }
  }).catch(() => {})
}

const handleDeprecate = (row: any) => {
  ElMessageBox.confirm(`确定废弃版本 v${row.version}？废弃后客户端将不再提示此版本更新。`, '废弃确认', {
    confirmButtonText: '确定废弃',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await adminApi.deprecateVersion(row.id)
      ElMessage.success(`版本 v${row.version} 已废弃`)
      fetchData()
    } catch (error) {
      console.error('废弃版本失败:', error)
    }
  }).catch(() => {})
}

const handleDownload = (row: any) => {
  if (row.downloadUrl) {
    window.open(row.downloadUrl, '_blank')
  } else {
    ElMessage.warning('此版本未设置下载地址')
  }
}

const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除版本 v${row.version}？此操作不可恢复。`, '删除确认', {
    confirmButtonText: '确定删除',
    cancelButtonText: '取消',
    type: 'warning'
  }).then(async () => {
    try {
      await adminApi.deleteVersion(row.id)
      ElMessage.success('删除成功')
      fetchData()
    } catch (error) {
      console.error('删除版本失败:', error)
    }
  }).catch(() => {})
}

onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.table-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
    .subtitle {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }

  .header-right {
    display: flex;
    align-items: center;
  }
}

.version-tag {
  font-family: monospace;
  font-weight: 600;
  color: #409eff;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}
</style>
