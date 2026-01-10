<template>
  <div class="page-container">
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>版本列表</span>
          <el-button type="primary" @click="$router.push('/versions/upload')">
            <el-icon><Upload /></el-icon>上传新版本
          </el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="version" label="版本号" width="120">
          <template #default="{ row }">
            <span class="version-tag">v{{ row.version }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="版本名称" min-width="150" />
        <el-table-column prop="type" label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getTypeTag(row.type)" size="small">{{ row.type }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="size" label="文件大小" width="100" />
        <el-table-column prop="downloads" label="下载次数" width="100" align="center" />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
              {{ row.status === 'published' ? '已发布' : '草稿' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="发布时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="handleView(row)">查看</el-button>
            <el-button link type="success" @click="handleDownload(row)">下载</el-button>
            <el-button link type="danger" @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
          layout="total, sizes, prev, pager, next" @change="fetchData" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload } from '@element-plus/icons-vue'

const loading = ref(false)
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)

const tableData = ref([
  { id: 1, version: '1.8.0', name: '功能更新版本', type: '正式版', size: '45.2 MB', downloads: 128, status: 'published', createdAt: '2024-12-01 10:00:00' },
  { id: 2, version: '1.7.5', name: '修复版本', type: '补丁', size: '12.8 MB', downloads: 256, status: 'published', createdAt: '2024-11-15 14:30:00' },
  { id: 3, version: '1.9.0-beta', name: '测试版本', type: '测试版', size: '48.5 MB', downloads: 32, status: 'draft', createdAt: '2024-12-10 09:00:00' }
])

const getTypeTag = (type: string) => {
  const map: Record<string, string> = { '正式版': 'success', '补丁': 'warning', '测试版': 'info' }
  return map[type] || 'info'
}

const handleView = (row: any) => ElMessage.info(`查看版本 ${row.version}`)
const handleDownload = (row: any) => ElMessage.success(`开始下载 ${row.version}`)
const handleDelete = (row: any) => {
  ElMessageBox.confirm(`确定删除版本 ${row.version}？`, '警告', { type: 'warning' })
    .then(() => ElMessage.success('删除成功'))
}

const fetchData = () => { loading.value = true; setTimeout(() => { loading.value = false; total.value = 50 }, 500) }
onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.version-tag { font-family: monospace; font-weight: 600; color: #409eff; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
