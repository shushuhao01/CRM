<template>
  <div class="page-container">
    <el-card shadow="never" class="changelog-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">更新日志</span>
            <span class="subtitle">查看所有已发布版本的更新记录</span>
          </div>
          <el-select v-model="filterType" placeholder="全部类型" clearable style="width: 140px" @change="fetchChangelogs">
            <el-option label="大版本" value="major" />
            <el-option label="功能更新" value="minor" />
            <el-option label="补丁修复" value="patch" />
          </el-select>
        </div>
      </template>

      <div v-loading="loading">
        <el-empty v-if="!loading && changelogs.length === 0" description="暂无已发布的版本记录" />

        <div class="changelog-list" v-else>
          <div v-for="item in changelogs" :key="item.id" class="changelog-item">
            <div class="changelog-header">
              <span class="version">v{{ item.version }}</span>
              <el-tag :type="getReleaseTypeTag(item.releaseType)" size="small">{{ getReleaseTypeLabel(item.releaseType) }}</el-tag>
              <el-tag v-if="item.isForceUpdate" type="danger" size="small">强制更新</el-tag>
              <span class="date">{{ formatDate(item.publishedAt || item.createdAt) }}</span>
            </div>
            <div class="changelog-content">
              <pre class="changelog-text">{{ item.changelog || '无更新说明' }}</pre>
            </div>
            <div class="changelog-meta" v-if="item.downloadUrl || item.fileSize">
              <span v-if="item.fileSize" class="meta-item">
                <el-icon><Document /></el-icon>
                {{ formatFileSize(item.fileSize) }}
              </span>
              <span v-if="item.minVersion" class="meta-item">
                <el-icon><Warning /></el-icon>
                最低要求 v{{ item.minVersion }}
              </span>
              <el-button v-if="item.downloadUrl" link type="primary" @click="handleDownload(item)">
                <el-icon><Download /></el-icon> 下载此版本
              </el-button>
            </div>
          </div>
        </div>

        <!-- 加载更多 -->
        <div class="load-more" v-if="changelogs.length < total">
          <el-button @click="loadMore" :loading="loadingMore">加载更多</el-button>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { Document, Warning, Download } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const loadingMore = ref(false)
const filterType = ref('')
const changelogs = ref<any[]>([])
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)

const getReleaseTypeTag = (type: string) => {
  const map: Record<string, string> = { major: 'danger', minor: 'success', patch: 'warning' }
  return map[type] || 'info'
}

const getReleaseTypeLabel = (type: string) => {
  const map: Record<string, string> = { major: '大版本', minor: '功能更新', patch: '补丁修复' }
  return map[type] || type
}

const formatDate = (time: string) => {
  if (!time) return '-'
  return new Date(time).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: 'long', day: 'numeric' })
}

const formatFileSize = (bytes: number) => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const fetchChangelogs = async () => {
  loading.value = true
  page.value = 1
  try {
    const params: any = { page: 1, pageSize: pageSize.value, status: 'published' }
    if (filterType.value) params.releaseType = filterType.value
    const res = await adminApi.getVersions(params)
    if (res.data) {
      changelogs.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('获取更新日志失败:', error)
  } finally {
    loading.value = false
  }
}

const loadMore = async () => {
  loadingMore.value = true
  page.value++
  try {
    const params: any = { page: page.value, pageSize: pageSize.value, status: 'published' }
    if (filterType.value) params.releaseType = filterType.value
    const res = await adminApi.getVersions(params)
    if (res.data) {
      changelogs.value.push(...(res.data.list || []))
      total.value = res.data.total || 0
    }
  } catch (error) {
    console.error('加载更多失败:', error)
    page.value--
  } finally {
    loadingMore.value = false
  }
}

const handleDownload = (item: any) => {
  if (item.downloadUrl) {
    window.open(item.downloadUrl, '_blank')
  }
}

onMounted(() => fetchChangelogs())
</script>

<style scoped lang="scss">
.page-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.changelog-card {
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
}

.changelog-item {
  padding: 24px 0;
  border-bottom: 1px solid #f0f0f0;

  &:last-child {
    border: none;
  }
}

.changelog-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;

  .version {
    font-size: 20px;
    font-weight: 700;
    color: #303133;
    font-family: monospace;
  }

  .date {
    color: #909399;
    font-size: 14px;
    margin-left: auto;
  }
}

.changelog-content {
  margin-bottom: 12px;
}

.changelog-text {
  font-family: inherit;
  font-size: 14px;
  color: #606266;
  line-height: 1.8;
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.changelog-meta {
  display: flex;
  align-items: center;
  gap: 20px;
  font-size: 13px;
  color: #909399;

  .meta-item {
    display: flex;
    align-items: center;
    gap: 4px;
  }
}

.load-more {
  text-align: center;
  padding: 20px 0;
}
</style>
