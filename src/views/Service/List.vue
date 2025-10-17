<template>
  <div class="service-list-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2>售后订单</h2>
      <p>管理和跟踪所有售后服务请求</p>
    </div>

    <!-- 搜索和筛选区域 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" inline>
        <el-form-item label="订单号">
          <el-input
            v-model="searchForm.orderNumber"
            placeholder="请输入订单号"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="客户姓名">
          <el-input
            v-model="searchForm.customerName"
            placeholder="请输入客户姓名"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="服务类型">
          <el-select
            v-model="searchForm.serviceType"
            placeholder="请选择服务类型"
            clearable
            style="width: 150px"
          >
            <el-option label="退货" value="return" />
            <el-option label="换货" value="exchange" />
            <el-option label="维修" value="repair" />
            <el-option label="投诉" value="complaint" />
            <el-option label="咨询" value="inquiry" />
          </el-select>
        </el-form-item>
        <el-form-item label="处理状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="待处理" value="pending" />
            <el-option label="处理中" value="processing" />
            <el-option label="已完成" value="completed" />
            <el-option label="已关闭" value="closed" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :icon="Search" @click="handleSearch">
            搜索
          </el-button>
          <el-button :icon="Refresh" @click="handleReset">
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 操作按钮区域 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          新建售后
        </el-button>
        <el-button :icon="Download" @click="handleExport">
          导出数据
        </el-button>
      </div>
      <div class="action-right">
        <el-button-group>
          <el-button :icon="Refresh" @click="handleRefresh" />
          <el-button :icon="Setting" @click="handleColumnSetting" />
        </el-button-group>
      </div>
    </div>

    <!-- 数据表格 -->
    <DynamicTable
      :data="tableData"
      :columns="tableColumns"
      storage-key="service-list-columns"
      :title="'售后订单列表'"
      :loading="tableLoading"
      :show-selection="true"
      :show-index="true"
      :pagination="{
        currentPage: pagination.currentPage,
        pageSize: pagination.pageSize,
        total: pagination.total,
        pageSizes: [10, 20, 50, 100]
      }"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 售后单号列 -->
      <template #serviceNumber="{ row }">
        <el-link type="primary" @click="handleView(row)">
          {{ row.serviceNumber }}
        </el-link>
      </template>

      <!-- 联系电话列 -->
      <template #customerPhone="{ row }">
        {{ maskPhone(row.customerPhone) }}
      </template>

      <!-- 服务类型列 -->
      <template #serviceType="{ row }">
        <el-tag :type="getServiceTypeTagType(row.serviceType)">
          {{ getServiceTypeText(row.serviceType) }}
        </el-tag>
      </template>

      <!-- 处理状态列 -->
      <template #status="{ row }">
        <el-tag :type="getStatusTagType(row.status)">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 优先级列 -->
      <template #priority="{ row }">
        <el-tag :type="getPriorityTagType(row.priority)" size="small">
          {{ getPriorityText(row.priority) }}
        </el-tag>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <el-button size="small" type="primary" @click="handleView(row)">
          查看
        </el-button>
        <el-button size="small" @click="handleEdit(row)" v-if="row.status !== 'completed'">
          编辑
        </el-button>
        <el-dropdown @command="(command) => handleMoreAction(command, row)">
          <el-button size="small" :icon="MoreFilled" />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="assign">分配处理人</el-dropdown-item>
              <el-dropdown-item command="priority">设置优先级</el-dropdown-item>
              <el-dropdown-item command="close" v-if="row.status !== 'closed'">关闭</el-dropdown-item>
              <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </template>
    </DynamicTable>

    <!-- 分配处理人对话框 -->
    <el-dialog
      v-model="assignDialogVisible"
      title="分配处理人"
      width="400px"
    >
      <el-form :model="assignForm" label-width="80px">
        <el-form-item label="处理人">
          <el-select v-model="assignForm.assignedTo" placeholder="请选择处理人" style="width: 100%">
            <el-option
              v-for="user in userOptions"
              :key="user.id"
              :label="user.name"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssignConfirm" :loading="assignLoading">
          确定
        </el-button>
      </template>
    </el-dialog>

    <!-- 设置优先级对话框 -->
    <el-dialog
      v-model="priorityDialogVisible"
      title="设置优先级"
      width="400px"
    >
      <el-form :model="priorityForm" label-width="80px">
        <el-form-item label="优先级">
          <el-radio-group v-model="priorityForm.priority">
            <el-radio value="low">低</el-radio>
            <el-radio value="medium">中</el-radio>
            <el-radio value="high">高</el-radio>
            <el-radio value="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="priorityForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入设置原因"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="priorityDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handlePriorityConfirm" :loading="priorityLoading">
          确定
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'

defineOptions({
  name: 'ServiceList'
})

import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search,
  Refresh,
  Plus,
  Download,
  Setting,
  MoreFilled
} from '@element-plus/icons-vue'
import { useServiceStore } from '@/stores/service'
import { useNotificationStore } from '@/stores/notification'
import { maskPhone } from '@/utils/phone'
import DynamicTable from '@/components/DynamicTable.vue'
import type { AfterSalesService } from '@/stores/service'
import { createSafeNavigator } from '@/utils/navigation'

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// stores
const serviceStore = useServiceStore()
const notificationStore = useNotificationStore()

// 响应式数据
const tableLoading = ref(false)
const assignLoading = ref(false)
const priorityLoading = ref(false)
const assignDialogVisible = ref(false)
const priorityDialogVisible = ref(false)

// 搜索表单
const searchForm = reactive({
  orderNumber: '',
  customerName: '',
  serviceType: '',
  status: '',
  dateRange: []
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 表格数据 - 从serviceStore获取
const tableData = computed(() => serviceStore.afterSalesServices)

const selectedRows = ref([])

// 分配表单
const assignForm = reactive({
  assignedTo: '',
  remark: ''
})

// 优先级表单
const priorityForm = reactive({
  priority: '',
  remark: ''
})

// 当前操作的行
const currentRow = ref(null)

// 用户选项
const userOptions = ref([
  { id: '1', name: '李四' },
  { id: '2', name: '赵六' },
  { id: '3', name: '孙八' },
  { id: '4', name: '周九' }
])

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'serviceNumber',
    label: '售后单号',
    width: 160,
    visible: true,
    sortable: true
  },
  {
    prop: 'orderNumber',
    label: '原订单号',
    width: 160,
    visible: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 120,
    visible: true
  },
  {
    prop: 'customerPhone',
    label: '联系电话',
    width: 130,
    visible: true
  },
  {
    prop: 'serviceType',
    label: '服务类型',
    width: 100,
    visible: true
  },
  {
    prop: 'productName',
    label: '商品名称',
    minWidth: 150,
    visible: true,
    showOverflowTooltip: true
  },
  {
    prop: 'reason',
    label: '申请原因',
    minWidth: 150,
    visible: true,
    showOverflowTooltip: true
  },
  {
    prop: 'status',
    label: '处理状态',
    width: 100,
    visible: true
  },
  {
    prop: 'priority',
    label: '优先级',
    width: 100,
    visible: true
  },
  {
    prop: 'assignedTo',
    label: '处理人',
    width: 100,
    visible: true
  },
  {
    prop: 'createdAt',
    label: '创建时间',
    width: 160,
    visible: true,
    sortable: true
  },
  {
    prop: 'updatedAt',
    label: '更新时间',
    width: 160,
    visible: true,
    sortable: true
  }
])

// 计算属性
const _hasSelection = computed(() => selectedRows.value.length > 0)

// 方法
const handleSearch = () => {
  pagination.currentPage = 1
  loadData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    orderNumber: '',
    customerName: '',
    serviceType: '',
    status: '',
    dateRange: []
  })
  handleSearch()
}

const handleRefresh = () => {
  loadData()
}

const handleAdd = () => {
  safeNavigator.push('/service/add')
}

const handleView = (row: AfterSalesService) => {
  safeNavigator.push(`/service/detail/${row.id}`)
}

const handleEdit = (row: AfterSalesService) => {
  safeNavigator.push(`/service/edit/${row.id}`)
}

const handleExport = () => {
  ElMessage.success('导出功能开发中...')
}

const handleColumnSetting = () => {
  ElMessage.info('列设置功能开发中...')
}

const handleSelectionChange = (selection: AfterSalesService[]) => {
  selectedRows.value = selection
}

const handleSortChange = ({ column, prop, order }: { column: unknown; prop: string; order: string }) => {
  console.log('排序变化:', { column, prop, order })
  loadData()
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadData()
}

const handleMoreAction = (command: string, row: AfterSalesService) => {
  currentRow.value = row
  
  switch (command) {
    case 'assign':
      assignForm.assignedTo = row.assignedTo || ''
      assignForm.remark = ''
      assignDialogVisible.value = true
      break
    case 'priority':
      priorityForm.priority = row.priority
      priorityForm.remark = ''
      priorityDialogVisible.value = true
      break
    case 'close':
      handleClose(row)
      break
    case 'delete':
      handleDelete(row)
      break
  }
}

const handleAssignConfirm = async () => {
  if (!assignForm.assignedTo) {
    ElMessage.warning('请选择处理人')
    return
  }
  
  assignLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新表格数据
    const index = tableData.value.findIndex(item => item.id === currentRow.value.id)
    if (index !== -1) {
      tableData.value[index].assignedTo = userOptions.value.find(u => u.id === assignForm.assignedTo)?.name || ''
      tableData.value[index].updatedAt = new Date().toLocaleString()
    }
    
    // 发送分配处理人成功的消息提醒
    const assignedUserName = userOptions.value.find(u => u.id === assignForm.assignedTo)?.name || ''
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_ASSIGNED,
      `售后申请 ${currentRow.value.serviceNumber} 已分配给 ${assignedUserName}，客户：${currentRow.value.customerName}`,
      {
        relatedId: currentRow.value.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${currentRow.value.serviceNumber}`,
        metadata: {
          customerName: currentRow.value.customerName,
          serviceType: currentRow.value.serviceType,
          assignedTo: assignedUserName
        }
      }
    )
    
    ElMessage.success('分配成功')
    assignDialogVisible.value = false
  } catch (_error) {
    ElMessage.error('分配失败')
  } finally {
    assignLoading.value = false
  }
}

const handlePriorityConfirm = async () => {
  if (!priorityForm.priority) {
    ElMessage.warning('请选择优先级')
    return
  }
  
  priorityLoading.value = true
  try {
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新表格数据
    const index = tableData.value.findIndex(item => item.id === currentRow.value.id)
    if (index !== -1) {
      tableData.value[index].priority = priorityForm.priority
      tableData.value[index].updatedAt = new Date().toLocaleString()
    }
    
    // 发送优先级设置成功的消息提醒
    const priorityText = priorityForm.priority === 'high' ? '高' : priorityForm.priority === 'medium' ? '中' : '低'
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_PRIORITY_CHANGED,
      `售后申请 ${currentRow.value.serviceNumber} 优先级已设置为${priorityText}，客户：${currentRow.value.customerName}`,
      {
        relatedId: currentRow.value.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${currentRow.value.serviceNumber}`,
        metadata: {
          customerName: currentRow.value.customerName,
          serviceType: currentRow.value.serviceType,
          priority: priorityForm.priority
        }
      }
    )
    
    ElMessage.success('优先级设置成功')
    priorityDialogVisible.value = false
  } catch (_error) {
    ElMessage.error('设置失败')
  } finally {
    priorityLoading.value = false
  }
}

const handleClose = async (row: AfterSalesService) => {
  ElMessageBox.confirm(
    '确定要关闭这个售后单吗？关闭后将无法继续处理。',
    '确认关闭',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 使用serviceStore更新状态
      await serviceStore.updateServiceStatus(row.id, 'closed', '手动关闭')
      
      // 发送售后申请关闭的消息提醒
      notificationStore.sendMessage(
        notificationStore.MessageType.AFTER_SALES_CLOSED,
        `售后申请 ${row.serviceNumber} 已关闭，客户：${row.customerName}`,
        {
          relatedId: row.serviceNumber,
          relatedType: 'service',
          actionUrl: `/service/detail/${row.serviceNumber}`,
          metadata: {
            customerName: row.customerName,
            serviceType: row.serviceType,
            closedAt: new Date().toISOString()
          }
        }
      )
      
      ElMessage.success('售后单已关闭')
    } catch (error) {
      ElMessage.error('关闭售后单失败')
      console.error('关闭售后单失败:', error)
    }
  })
}

const handleDelete = async (row: AfterSalesService) => {
  ElMessageBox.confirm(
    '确定要删除这个售后单吗？删除后无法恢复。',
    '确认删除',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(async () => {
    try {
      // 使用serviceStore删除售后单
      const success = serviceStore.deleteService(row.id)
      
      if (success) {
        // 更新分页总数
        pagination.total = serviceStore.afterSalesServices.length
        
        // 发送售后申请删除的消息提醒
        notificationStore.sendMessage(
          notificationStore.MessageType.AFTER_SALES_DELETED,
          `售后申请 ${row.serviceNumber} 已删除，客户：${row.customerName}`,
          {
            relatedId: row.serviceNumber,
            relatedType: 'service',
            actionUrl: '/service/list',
            metadata: {
              customerName: row.customerName,
              serviceType: row.serviceType,
              deletedAt: new Date().toISOString()
            }
          }
        )
        
        ElMessage.success('删除成功')
      } else {
        ElMessage.error('删除失败')
      }
    } catch (error) {
      ElMessage.error('删除售后单失败')
      console.error('删除售后单失败:', error)
    }
  })
}

const loadData = async () => {
  tableLoading.value = true
  try {
    // 从serviceStore获取数据
    await serviceStore.loadAfterSalesServices()
    
    // 更新分页总数
    pagination.total = serviceStore.afterSalesServices.length
  } catch (error) {
    ElMessage.error('加载数据失败')
    console.error('加载售后服务数据失败:', error)
  } finally {
    tableLoading.value = false
  }
}

// 辅助方法
const getServiceTypeText = (type: string) => {
  const map: Record<string, string> = {
    return: '退货',
    exchange: '换货',
    repair: '维修',
    complaint: '投诉',
    inquiry: '咨询'
  }
  return map[type] || type
}

const getServiceTypeTagType = (type: string) => {
  const map: Record<string, string> = {
    return: 'danger',
    exchange: 'warning',
    repair: 'info',
    complaint: 'danger',
    inquiry: 'success'
  }
  return map[type] || ''
}

const getStatusText = (status: string) => {
  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    completed: '已完成',
    closed: '已关闭'
  }
  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    completed: 'success',
    closed: 'info'
  }
  return map[status] || ''
}

const getPriorityText = (priority: string) => {
  const map: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return map[priority] || priority
}

const getPriorityTagType = (priority: string) => {
  const map: Record<string, string> = {
    low: 'info',
    medium: '',
    high: 'warning',
    urgent: 'danger'
  }
  return map[priority] || ''
}

// 生命周期
onMounted(() => {
  loadData()
})
</script>

<style scoped>
.service-list-container {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-card {
  margin-bottom: 20px;
}

.action-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.action-left {
  display: flex;
  gap: 12px;
}

.table-card {
  margin-bottom: 20px;
}

.pagination-container {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .service-list-container {
    padding: 10px;
  }
  
  .action-bar {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }
  
  .action-left {
    justify-content: center;
  }
  
  .action-right {
    align-self: center;
  }
}
</style>