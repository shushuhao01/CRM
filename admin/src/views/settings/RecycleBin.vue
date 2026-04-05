<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <div class="card-header">
        <div class="header-left">
          <el-icon :size="20" color="#909399"><Delete /></el-icon>
          <span class="title">回收站</span>
          <el-tag type="info" size="small">{{ pagination.total }} 条记录</el-tag>
        </div>
        <div class="header-actions">
          <el-button type="danger" plain @click="handleEmptyAll" :disabled="pagination.total === 0">
            <el-icon><Delete /></el-icon>清空回收站
          </el-button>
        </div>
      </div>
    </el-card>

    <el-card shadow="never" class="filter-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="客户类型">
          <el-select v-model="searchForm.type" placeholder="全部" clearable style="width: 130px" @change="handleSearch">
            <el-option label="全部" value="all" />
            <el-option label="私有客户" value="license" />
            <el-option label="租户客户" value="tenant" />
          </el-select>
        </el-form-item>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/授权码" clearable style="width: 200px"
            @keyup.enter="handleSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <el-table :data="tableData" v-loading="loading" stripe :border="false" table-layout="fixed">
        <el-table-column label="客户类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.item_type === 'license' ? 'warning' : 'primary'" size="small">
              {{ row.type_label }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="name" label="客户名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="联系人" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.contact || '-' }}</template>
        </el-table-column>
        <el-table-column label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.phone || '-' }}</template>
        </el-table-column>
        <el-table-column label="授权码" min-width="180" show-overflow-tooltip>
          <template #default="{ row }">
            <span class="license-key">{{ maskKey(row.license_key) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="删除时间" width="170" align="center">
          <template #default="{ row }">
            <span class="text-danger">{{ formatDateTime(row.deleted_at) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="180" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="success" size="small" @click="handleRestore(row)">
                <el-icon><RefreshLeft /></el-icon>恢复
              </el-button>
              <el-button link type="danger" size="small" @click="handlePermanentDelete(row)">
                <el-icon><Delete /></el-icon>彻底删除
              </el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div v-if="tableData.length === 0 && !loading" class="empty-state">
        <el-empty description="回收站为空" :image-size="120" />
      </div>

      <div class="pagination-wrapper" v-if="pagination.total > 0">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="fetchData" @current-change="fetchData" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Search, RefreshLeft } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const tableData = ref<any[]>([])
const searchForm = reactive({ type: 'all', keyword: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })

// === 工具方法 ===
const maskKey = (key: string) => {
  if (!key) return '-'
  if (key.length > 12) return `${key.substring(0, 12)}****`
  return key
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const getStatusType = (status: string): string => {
  const map: Record<string, string> = {
    pending: 'warning', active: 'success', expired: 'info',
    revoked: 'danger', disabled: 'danger', suspended: 'danger'
  }
  return map[status] || 'info'
}

const getStatusText = (status: string): string => {
  const map: Record<string, string> = {
    pending: '待激活', active: '有效', expired: '已过期',
    revoked: '已吊销', disabled: '已禁用', suspended: '已暂停'
  }
  return map[status] || status
}

// === 数据获取 ===
const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getRecycleBinList({
      page: pagination.page,
      pageSize: pagination.pageSize,
      type: searchForm.type || 'all',
      keyword: searchForm.keyword || undefined
    })
    if (res.success) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch {
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// === 搜索 ===
const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => {
  Object.assign(searchForm, { type: 'all', keyword: '' })
  handleSearch()
}

// === 恢复 ===
const handleRestore = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要恢复${row.type_label} "${row.name}" 吗？恢复后将重新出现在客户列表中。`,
      '恢复客户', { type: 'info', confirmButtonText: '确定恢复' }
    )
    const res = await adminApi.restoreRecycleBinItem(row.id, row.item_type)
    if (res.success) {
      ElMessage.success(res.message || '恢复成功')
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '恢复失败')
  }
}

// === 彻底删除 ===
const handlePermanentDelete = async (row: any) => {
  try {
    await ElMessageBox.confirm(
      `确定要彻底删除${row.type_label} "${row.name}" 吗？此操作不可恢复，所有关联数据将被永久清除！`,
      '彻底删除', {
        type: 'error',
        confirmButtonText: '确定彻底删除',
        confirmButtonClass: 'el-button--danger'
      }
    )
    const res = await adminApi.permanentDeleteRecycleBinItem(row.id, row.item_type)
    if (res.success) {
      ElMessage.success(res.message || '已彻底删除')
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
  }
}

// === 清空回收站 ===
const handleEmptyAll = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清空回收站吗？所有已删除的客户数据将被永久清除，此操作不可恢复！',
      '清空回收站', {
        type: 'error',
        confirmButtonText: '确定清空',
        confirmButtonClass: 'el-button--danger'
      }
    )
    const res = await adminApi.emptyRecycleBin()
    if (res.success) {
      ElMessage.success(res.message || '回收站已清空')
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '清空失败')
  }
}

onMounted(() => { fetchData() })
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .filter-card, .table-card { border-radius: 8px; border: none; }

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 8px;

    .title {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
    }
  }
}

.header-actions { display: flex; gap: 8px; }

.license-key {
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #606266;
}

.text-danger { color: #f56c6c; }

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.empty-state {
  padding: 40px 0;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .filter-card :deep(.el-form) {
    display: flex;
    flex-direction: column;
    .el-form-item {
      margin-right: 0;
      margin-bottom: 12px;
      width: 100%;
      .el-input, .el-select { width: 100% !important; }
    }
  }
  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    .header-actions {
      width: 100%;
      .el-button { flex: 1; }
    }
  }
  .table-card :deep(.el-table) { overflow-x: auto; }
}
</style>

