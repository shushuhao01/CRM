<template>
  <div class="recycle-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon class="title-icon"><Delete /></el-icon>
          回收站
        </h1>
        <p class="page-description">管理已删除的客户资料，支持恢复和永久删除操作</p>
      </div>
    </div>

    <!-- 汇总数据卡片 -->
    <div class="summary-cards">
      <div class="card-item">
        <div class="card-icon total">
          <el-icon><Delete /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.totalCount }}</div>
          <div class="card-label">回收总数</div>
        </div>
      </div>
      <div class="card-item">
        <div class="card-icon recent">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.recentCount }}</div>
          <div class="card-label">近7天删除</div>
        </div>
      </div>
      <div class="card-item">
        <div class="card-icon warning">
          <el-icon><Warning /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.expiringSoonCount }}</div>
          <div class="card-label">即将过期</div>
        </div>
      </div>
    </div>

    <!-- 搜索和筛选区 -->
    <div class="filter-section">
      <div class="filter-row">
        <div class="search-group">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索客户姓名、电话..."
            clearable
            @input="handleSearch"
            class="search-input"
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>

        <div class="filter-group">
          <el-select v-model="deleteTimeFilter" placeholder="删除时间" clearable class="filter-select">
            <el-option label="全部时间" value="" />
            <el-option label="今天" value="today" />
            <el-option label="近7天" value="week" />
            <el-option label="近30天" value="month" />
          </el-select>

          <el-select v-model="deletedByFilter" placeholder="删除人" clearable class="filter-select">
            <el-option label="全部删除人" value="" />
            <el-option
              v-for="user in deletedByUsers"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </div>
      </div>
    </div>

    <!-- 列表操作区 -->
    <div class="list-section">
      <div class="list-header">
        <div class="list-info">
          <span class="total-count">共 {{ totalCount }} 条记录</span>
        </div>

        <div class="list-actions">
          <el-button
            type="success"
            :disabled="selectedItems.length === 0"
            @click="handleBatchRestore"
          >
            <el-icon><RefreshRight /></el-icon>
            批量恢复 ({{ selectedItems.length }})
          </el-button>
          <el-button
            type="danger"
            :disabled="selectedItems.length === 0"
            @click="handleBatchPermanentDelete"
          >
            <el-icon><Delete /></el-icon>
            永久删除
          </el-button>
          <el-button
            type="warning"
            @click="handleClearExpired"
          >
            <el-icon><Timer /></el-icon>
            清理过期
          </el-button>
        </div>
      </div>

      <!-- 数据表格 -->
      <div class="table-container">
        <el-table
          :data="paginatedData"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          stripe
          class="data-table"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="customerName" label="客户姓名" width="120" />

          <el-table-column prop="phone" label="联系电话" width="130">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>

          <el-table-column prop="orderAmount" label="订单金额" width="120">
            <template #default="{ row }">
              <span class="amount">¥{{ row.orderAmount?.toLocaleString() || 0 }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="orderDate" label="下单日期" width="120">
            <template #default="{ row }">
              {{ formatDate(row.orderDate) }}
            </template>
          </el-table-column>

          <el-table-column prop="deletedAt" label="删除时间" width="150">
            <template #default="{ row }">
              {{ formatDateTime(row.deletedAt) }}
            </template>
          </el-table-column>

          <el-table-column prop="deletedBy" label="删除人" width="100">
            <template #default="{ row }">
              {{ row.deletedByName }}
            </template>
          </el-table-column>

          <el-table-column prop="deleteReason" label="删除原因" min-width="150">
            <template #default="{ row }">
              <span class="delete-reason">{{ row.deleteReason || '无' }}</span>
            </template>
          </el-table-column>

          <el-table-column prop="expiresAt" label="过期时间" width="150">
            <template #default="{ row }">
              <span :class="getExpirationClass(row.expiresAt)">
                {{ formatDateTime(row.expiresAt) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="180" fixed="right">
            <template #default="{ row }">
              <el-button
                type="success"
                size="small"
                @click="handleRestore(row)"
              >
                <el-icon><RefreshRight /></el-icon>
                恢复
              </el-button>
              <el-button
                type="danger"
                size="small"
                @click="handlePermanentDelete(row)"
              >
                <el-icon><Delete /></el-icon>
                永久删除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="totalCount"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </div>

    <!-- 恢复确认对话框 -->
    <el-dialog
      v-model="restoreDialogVisible"
      title="确认恢复"
      width="500px"
    >
      <p>确定要恢复选中的 {{ selectedItems.length }} 条记录吗？</p>
      <p class="warning-text">恢复后，这些记录将重新出现在资料列表中。</p>
      <template #footer>
        <el-button @click="restoreDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRestore">确认恢复</el-button>
      </template>
    </el-dialog>

    <!-- 永久删除确认对话框 -->
    <el-dialog
      v-model="deleteDialogVisible"
      title="永久删除确认"
      width="500px"
    >
      <div class="delete-warning">
        <el-icon class="warning-icon"><WarningFilled /></el-icon>
        <div class="warning-content">
          <p><strong>警告：此操作不可恢复！</strong></p>
          <p>确定要永久删除选中的 {{ selectedItems.length }} 条记录吗？</p>
          <p>删除后将无法恢复这些数据。</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="deleteDialogVisible = false">取消</el-button>
        <el-button type="danger" @click="confirmPermanentDelete">永久删除</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Delete,
  Clock,
  Warning,
  Search,
  RefreshRight,
  Timer,
  WarningFilled
} from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/data'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { formatDateTime } from '@/utils/dateFormat'
import * as dataApi from '@/api/data'
import type { RecycleItem } from '@/api/data'

// 使用数据存储
const dataStore = useDataStore()

// 响应式数据
const loading = ref(false)
const searchKeyword = ref('')
const deleteTimeFilter = ref('')
const deletedByFilter = ref('')
const selectedItems = ref<RecycleItem[]>([])
const currentPage = ref(1)
const pageSize = ref(20)
const restoreDialogVisible = ref(false)
const deleteDialogVisible = ref(false)

// 回收站数据
const recycleData = ref<RecycleItem[]>([])
const totalCount = ref(0)

const deletedByUsers = ref([
  { id: 'user1', name: '李经理' },
  { id: 'user2', name: '王主管' },
  { id: 'user3', name: '张组长' }
])

// 加载回收站数据
const loadRecycleData = async () => {
  try {
    loading.value = true
    const response = await dataApi.getRecycleList({
      page: currentPage.value,
      pageSize: pageSize.value,
      keyword: searchKeyword.value || undefined,
      deleteTimeFilter: deleteTimeFilter.value as any || undefined,
      deletedBy: deletedByFilter.value || undefined
    })

    recycleData.value = response.list || []
    totalCount.value = response.total || 0

    // 更新汇总数据
    if (response.summary) {
      summaryDataFromApi.value = response.summary
    }
  } catch (error) {
    console.error('加载回收站数据失败:', error)
    ElMessage.error('加载回收站数据失败')
  } finally {
    loading.value = false
  }
}

// API返回的汇总数据
const summaryDataFromApi = ref({
  totalCount: 0,
  recentCount: 0,
  expiringSoonCount: 0
})

// 计算属性 - 使用API返回的汇总数据
const summaryData = computed(() => {
  return summaryDataFromApi.value
})

const filteredData = computed(() => {
  let data = recycleData.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    data = data.filter(item =>
      item.customerName.toLowerCase().includes(keyword) ||
      item.phone.includes(keyword)
    )
  }

  // 删除时间过滤
  if (deleteTimeFilter.value) {
    const now = new Date()
    let startDate: Date

    switch (deleteTimeFilter.value) {
      case 'today':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate())
        break
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
        break
      default:
        startDate = new Date(0)
    }

    data = data.filter(item => new Date(item.deletedAt) >= startDate)
  }

  // 删除人过滤
  if (deletedByFilter.value) {
    data = data.filter(item => item.deletedBy === deletedByFilter.value)
  }

  return data
})

// 分页数据直接使用API返回的数据（API已经分页）
const paginatedData = computed(() => {
  return recycleData.value
})

// 方法
const handleSearch = () => {
  currentPage.value = 1
  loadRecycleData()
}

const handleSelectionChange = (selection: RecycleItem[]) => {
  selectedItems.value = selection
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
  loadRecycleData()
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
  loadRecycleData()
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

// formatDateTime 已从 @/utils/dateFormat 导入

const getExpirationClass = (expiresAt: string) => {
  const now = new Date()
  const expireDate = new Date(expiresAt)
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)

  if (expireDate <= now) {
    return 'expired'
  } else if (expireDate <= threeDaysLater) {
    return 'expiring-soon'
  }
  return ''
}

const handleRestore = (row: RecycleItem) => {
  selectedItems.value = [row]
  restoreDialogVisible.value = true
}

const handleBatchRestore = () => {
  if (!selectedItems.value || selectedItems.value.length === 0) {
    ElMessage.warning('请选择要恢复的记录')
    return
  }
  restoreDialogVisible.value = true
}

const confirmRestore = async () => {
  try {
    loading.value = true

    // 调用真实API恢复数据
    const dataIds = selectedItems.value.map(item => item.id)
    const result = await dataApi.restoreData(dataIds)

    if (result.success) {
      ElMessage.success(`成功恢复 ${selectedItems.value.length} 条记录`)
      // 重新加载数据
      await loadRecycleData()
    } else {
      ElMessage.error(result.message || '恢复失败')
    }

    restoreDialogVisible.value = false
    selectedItems.value = []
  } catch (error) {
    console.error('恢复失败:', error)
    ElMessage.error('恢复失败，请重试')
  } finally {
    loading.value = false
  }
}

const handlePermanentDelete = (row: RecycleItem) => {
  selectedItems.value = [row]
  deleteDialogVisible.value = true
}

const handleBatchPermanentDelete = () => {
  if (!selectedItems.value || selectedItems.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  deleteDialogVisible.value = true
}

const confirmPermanentDelete = async () => {
  try {
    loading.value = true

    // 调用真实API永久删除数据
    const dataIds = selectedItems.value.map(item => item.id)
    const result = await dataApi.permanentDeleteData(dataIds)

    if (result.success) {
      ElMessage.success(`成功删除 ${selectedItems.value.length} 条记录`)
      // 重新加载数据
      await loadRecycleData()
    } else {
      ElMessage.error(result.message || '删除失败')
    }

    deleteDialogVisible.value = false
    selectedItems.value = []
  } catch (error) {
    console.error('删除失败:', error)
    ElMessage.error('删除失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleClearExpired = async () => {
  const now = new Date()
  const expiredItems = recycleData.value.filter(item => new Date(item.expiresAt) <= now)

  if (expiredItems.length === 0) {
    ElMessage.info('没有过期的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `发现 ${expiredItems.length} 条过期记录，确定要清理吗？`,
      '清理过期记录',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    // 调用真实API永久删除过期数据
    const expiredIds = expiredItems.map(item => item.id)
    const result = await dataApi.permanentDeleteData(expiredIds)

    if (result.success) {
      ElMessage.success(`成功清理 ${expiredItems.length} 条过期记录`)
      // 重新加载数据
      await loadRecycleData()
    } else {
      ElMessage.error(result.message || '清理失败')
    }
  } catch {
    // 用户取消操作
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  // 加载回收站数据
  loadRecycleData()
})
</script>

<style scoped>
.recycle-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.title-icon {
  margin-right: 12px;
  color: #f56c6c;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

.card-item {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
}

.card-icon.total {
  background-color: #f56c6c;
  color: white;
}

.card-icon.recent {
  background-color: #e6a23c;
  color: white;
}

.card-icon.warning {
  background-color: #f56c6c;
  color: white;
}

.card-content {
  flex: 1;
}

.card-number {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #909399;
}

.filter-section {
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  margin-bottom: 16px;
}

.filter-row {
  display: flex;
  gap: 16px;
  align-items: center;
}

.search-group {
  flex: 1;
}

.search-input {
  max-width: 300px;
}

.filter-group {
  display: flex;
  gap: 12px;
}

.filter-select {
  width: 150px;
}

.list-section {
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

.list-header {
  padding: 20px;
  border-bottom: 1px solid #ebeef5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.list-info {
  color: #606266;
  font-size: 14px;
}

.list-actions {
  display: flex;
  gap: 12px;
}

.table-container {
  overflow-x: auto;
}

.data-table {
  width: 100%;
}

.amount {
  font-weight: 600;
  color: #f56c6c;
}

.delete-reason {
  color: #909399;
}

.expired {
  color: #f56c6c;
  font-weight: 600;
}

.expiring-soon {
  color: #e6a23c;
  font-weight: 600;
}

.pagination-container {
  padding: 20px;
  display: flex;
  justify-content: center;
  border-top: 1px solid #ebeef5;
}

.warning-text {
  color: #e6a23c;
  font-size: 14px;
  margin: 8px 0 0 0;
}

.delete-warning {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.warning-icon {
  color: #f56c6c;
  font-size: 24px;
  margin-top: 2px;
}

.warning-content p {
  margin: 4px 0;
}

.warning-content p:first-child {
  color: #f56c6c;
  font-weight: 600;
}

@media (max-width: 768px) {
  .recycle-container {
    padding: 12px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .filter-row {
    flex-direction: column;
    align-items: stretch;
  }

  .filter-group {
    flex-direction: column;
  }

  .filter-select {
    width: 100%;
  }

  .list-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .list-actions {
    flex-direction: column;
  }
}
</style>
