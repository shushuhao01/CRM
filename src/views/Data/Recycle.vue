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
          <span class="total-count">共 {{ filteredData.length }} 条记录</span>
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
          :total="filteredData.length"
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

// 接口定义
interface RecycleItem {
  id: string
  customerName: string
  phone: string
  orderAmount: number
  orderDate: string
  deletedAt: string
  deletedBy: string
  deletedByName: string
  deleteReason: string
  expiresAt: string
}

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

// 模拟数据
const recycleData = ref([
  {
    id: '1',
    customerName: '张三',
    phone: '13800138001',
    orderAmount: 5000,
    orderDate: '2024-01-15',
    deletedAt: '2024-01-20T10:30:00',
    deletedBy: 'user1',
    deletedByName: '李经理',
    deleteReason: '重复资料',
    expiresAt: '2024-02-20T10:30:00'
  },
  {
    id: '2',
    customerName: '李四',
    phone: '13800138002',
    orderAmount: 3000,
    orderDate: '2024-01-10',
    deletedAt: '2024-01-18T14:20:00',
    deletedBy: 'user2',
    deletedByName: '王主管',
    deleteReason: '客户要求删除',
    expiresAt: '2024-02-18T14:20:00'
  },
  {
    id: '3',
    customerName: '王五',
    phone: '13800138003',
    orderAmount: 8000,
    orderDate: '2024-01-05',
    deletedAt: '2024-01-25T09:15:00',
    deletedBy: 'user1',
    deletedByName: '李经理',
    deleteReason: '无效订单',
    expiresAt: '2024-02-25T09:15:00'
  }
])

const deletedByUsers = ref([
  { id: 'user1', name: '李经理' },
  { id: 'user2', name: '王主管' },
  { id: 'user3', name: '张组长' }
])

// 计算属性
const summaryData = computed(() => {
  const now = new Date()
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
  const threeDaysLater = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
  
  return {
    totalCount: recycleData.value.length,
    recentCount: recycleData.value.filter(item => 
      new Date(item.deletedAt) >= sevenDaysAgo
    ).length,
    expiringSoonCount: recycleData.value.filter(item => 
      new Date(item.expiresAt) <= threeDaysLater
    ).length
  }
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

const paginatedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredData.value.slice(start, end)
})

// 方法
const handleSearch = () => {
  currentPage.value = 1
}

const handleSelectionChange = (selection: RecycleItem[]) => {
  selectedItems.value = selection
}

const handleSizeChange = (size: number) => {
  pageSize.value = size
  currentPage.value = 1
}

const handleCurrentChange = (page: number) => {
  currentPage.value = page
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('zh-CN')
}

const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleString('zh-CN')
}

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
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要恢复的记录')
    return
  }
  restoreDialogVisible.value = true
}

const confirmRestore = async () => {
  try {
    loading.value = true
    
    // 逐个恢复数据到已回收状态
    for (const item of selectedItems.value) {
      await dataStore.recoverData(item.id, '从回收站恢复')
    }
    
    // 从回收站数据中移除
    const idsToRestore = selectedItems.value.map(item => item.id)
    recycleData.value = recycleData.value.filter(item => !idsToRestore.includes(item.id))
    
    ElMessage.success(`成功恢复 ${selectedItems.value.length} 条记录到已回收列表`)
    restoreDialogVisible.value = false
    selectedItems.value = []
  } catch (error) {
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
  if (selectedItems.value.length === 0) {
    ElMessage.warning('请选择要删除的记录')
    return
  }
  deleteDialogVisible.value = true
}

const confirmPermanentDelete = async () => {
  try {
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 从回收站数据中移除
    const idsToDelete = selectedItems.value.map(item => item.id)
    recycleData.value = recycleData.value.filter(item => !idsToDelete.includes(item.id))
    
    ElMessage.success(`成功删除 ${selectedItems.value.length} 条记录`)
    deleteDialogVisible.value = false
    selectedItems.value = []
  } catch (error) {
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
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 移除过期记录
    recycleData.value = recycleData.value.filter(item => new Date(item.expiresAt) > now)
    
    ElMessage.success(`成功清理 ${expiredItems.length} 条过期记录`)
  } catch {
    // 用户取消操作
  } finally {
    loading.value = false
  }
}

// 生命周期
onMounted(() => {
  // 初始化数据
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