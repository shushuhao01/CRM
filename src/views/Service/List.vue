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

    <!-- 标签页和操作按钮区域 -->
    <div class="tabs-action-bar">
      <!-- 标签页 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="service-tabs">
        <el-tab-pane label="待处理" name="pending">
          <template #label>
            <span class="tab-label">
              待处理
              <el-badge :value="pendingCount" :max="99" type="danger" v-if="pendingCount > 0" />
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="处理中" name="processing">
          <template #label>
            <span class="tab-label">
              处理中
              <el-badge :value="processingCount" :max="99" type="primary" v-if="processingCount > 0" />
            </span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="已解决" name="resolved">
          <template #label>
            <span class="tab-label">已解决</span>
          </template>
        </el-tab-pane>

        <el-tab-pane label="已关闭" name="closed">
          <template #label>
            <span class="tab-label">已关闭</span>
          </template>
        </el-tab-pane>
      </el-tabs>

      <!-- 操作按钮 -->
      <div class="action-buttons">
        <!-- 新建售后：所有角色都可以创建 -->
        <el-button type="primary" :icon="Plus" @click="handleAdd">
          新建售后
        </el-button>
        <el-button :icon="Download" @click="handleExport">
          导出数据
        </el-button>
        <el-button :icon="Refresh" @click="handleRefresh" style="margin-left: 12px" />
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
      :pagination="paginationConfig"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
    >
      <!-- 售后单号列 -->
      <template #column-serviceNumber="{ row }">
        <el-link type="primary" @click="handleView(row)">
          {{ row.serviceNumber }}
        </el-link>
      </template>

      <!-- 原订单号列 -->
      <template #column-orderNumber="{ row }">
        <el-link type="primary" @click="handleViewOrder(row)">
          {{ row.orderNumber }}
        </el-link>
      </template>

      <!-- 客户姓名列 -->
      <template #column-customerName="{ row }">
        <el-link type="primary" @click="handleViewCustomer(row)">
          {{ row.customerName }}
        </el-link>
      </template>

      <!-- 联系电话列 -->
      <template #column-customerPhone="{ row }">
        {{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}
      </template>

      <!-- 服务类型列 -->
      <template #column-serviceType="{ row }">
        <el-tag :type="getServiceTypeTagType(row.serviceType)">
          {{ getServiceTypeText(row.serviceType) }}
        </el-tag>
      </template>

      <!-- 申请原因列 -->
      <template #column-reason="{ row }">
        {{ getReasonText(row.reason) }}
      </template>

      <!-- 处理状态列 -->
      <template #column-status="{ row }">
        <el-tag :type="getStatusTagType(row.status)">
          {{ getStatusText(row.status) }}
        </el-tag>
      </template>

      <!-- 优先级列 -->
      <template #column-priority="{ row }">
        <el-tag :type="getPriorityTagType(row.priority)" size="small">
          {{ getPriorityText(row.priority) }}
        </el-tag>
      </template>

      <!-- 操作列 -->
      <template #table-actions="{ row }">
        <el-button size="small" type="primary" @click="handleView(row)">
          查看
        </el-button>
        <!-- 编辑按钮：只有超管/管理员/客服可见 -->
        <el-button
          size="small"
          @click="handleEdit(row)"
          v-if="canOperateService && row.status !== 'completed'"
        >
          编辑
        </el-button>
        <!-- 更多操作下拉菜单：只有超管/管理员/客服可见 -->
        <el-dropdown
          v-if="canOperateService"
          @command="(command) => handleMoreAction(command, row)"
        >
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
      width="500px"
    >
      <el-form :model="assignForm" label-width="100px">
        <el-form-item label="分配方式">
          <el-radio-group v-model="assignForm.assignType">
            <el-radio label="user">指定用户</el-radio>
            <el-radio label="department">部门随机</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="筛选部门" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.filterDepartmentId"
            placeholder="全部部门"
            clearable
            style="width: 100%"
            @change="handleDepartmentFilterChange"
          >
            <el-option label="全部部门" value="" />
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择用户" v-if="assignForm.assignType === 'user'">
          <el-select
            v-model="assignForm.userId"
            placeholder="请选择处理人"
            filterable
            style="width: 100%"
          >
            <el-option
              v-for="user in filteredUserOptions"
              :key="user.id"
              :label="`${user.name} (${user.department || '未分配部门'})`"
              :value="user.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="选择部门" v-if="assignForm.assignType === 'department'">
          <el-select
            v-model="assignForm.departmentId"
            placeholder="请选择部门"
            style="width: 100%"
          >
            <el-option
              v-for="dept in departmentOptions"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="备注">
          <el-input
            v-model="assignForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入分配备注(可选)"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="assignDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAssignConfirm" :loading="assignLoading">
          确定分配
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
            <el-radio label="low">低</el-radio>
            <el-radio label="normal">普通</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="urgent">紧急</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input
            v-model="priorityForm.remark"
            type="textarea"
            :rows="3"
            placeholder="请输入设置原因(可选)"
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
import { ref, reactive, onMounted, computed, nextTick, watch } from 'vue'

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
  MoreFilled
} from '@element-plus/icons-vue'
import { useServiceStore } from '@/stores/service'
import { useNotificationStore } from '@/stores/notification'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import DynamicTable from '@/components/DynamicTable.vue'
import type { AfterSalesService } from '@/stores/service'
import { createSafeNavigator } from '@/utils/navigation'
import { formatDateTime } from '@/utils/dateFormat'

// 路由
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// stores
const serviceStore = useServiceStore()
const notificationStore = useNotificationStore()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()

// 权限控制：判断当前用户是否有售后操作权限
// 只有超管、管理员、客服可以编辑/分配/删除/关闭售后订单
// 经理和销售员只能查看
const canOperateService = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return false

  const role = currentUser.role || currentUser.roleId || ''
  // 允许操作的角色：超级管理员、管理员、客服
  const allowedRoles = ['super_admin', 'superadmin', 'admin', 'service', 'customer_service']
  return allowedRoles.includes(role)
})

// 响应式数据
const tableLoading = ref(false)
const assignLoading = ref(false)
const priorityLoading = ref(false)
const assignDialogVisible = ref(false)
const priorityDialogVisible = ref(false)

// 当前激活的标签页
const activeTab = ref('pending')

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

// 表格数据 - 根据标签页筛选
const tableData = computed(() => {
  let services = serviceStore.services || []

  // 根据当前标签页筛选
  services = services.filter((s: AfterSalesService) => s.status === activeTab.value)

  // 应用搜索条件
  if (searchForm.orderNumber) {
    services = services.filter((s: AfterSalesService) =>
      s.orderNumber.includes(searchForm.orderNumber)
    )
  }

  if (searchForm.customerName) {
    services = services.filter((s: AfterSalesService) =>
      s.customerName.includes(searchForm.customerName)
    )
  }

  if (searchForm.serviceType) {
    services = services.filter((s: AfterSalesService) =>
      s.serviceType === searchForm.serviceType)
  }

  return services
})

// 分页配置 - 使用computed确保响应式
const paginationConfig = computed(() => ({
  currentPage: pagination.currentPage,
  pageSize: pagination.pageSize,
  total: pagination.total,
  pageSizes: [10, 20, 50, 100]
}))

const selectedRows = ref([])

// 分配表单
const assignForm = reactive({
  assignType: 'user',
  userId: '',
  departmentId: '',
  filterDepartmentId: '',
  remark: ''
})

// 优先级表单
const priorityForm = reactive({
  priority: '',
  remark: ''
})

// 当前操作的行
const currentRow = ref<AfterSalesService | null>(null)

// 用户选项 - 从userStore获取,修复字段映射
const userOptions = computed(() => {
  const users = userStore.users || []
  return users.map((user: unknown) => {
    // 尝试多种字段名
    const name = user.name || user.username || user.realName || `用户${user.id}`
    const department = user.departmentName || user.department || user.deptName || '未分配部门'

    return {
      id: user.id,
      name: name,
      department: department,
      roleId: user.roleId,
      role: user.role
    }
  })
})

// 部门选项 - 从departmentStore获取
const departmentOptions = computed(() => {
  const departments = departmentStore.departments || []
  return departments.map((dept: unknown) => ({
    id: dept.id,
    name: dept.name
  }))
})

// 根据部门筛选的用户选项 - 修复筛选逻辑
const filteredUserOptions = computed(() => {
  if (!assignForm.filterDepartmentId) {
    return userOptions.value
  }

  const dept = departmentOptions.value.find((d: unknown) => d.id === assignForm.filterDepartmentId)
  if (!dept) {
    return userOptions.value
  }

  return userOptions.value.filter((u: unknown) => {
    // 多种匹配方式
    return u.department === dept.name ||
           u.department === dept.id ||
           (u.department && u.department.includes(dept.name))
  })
})

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
    visible: true,
    slot: 'orderNumber'
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 120,
    visible: true,
    slot: 'customerName'
  },
  {
    prop: 'customerPhone',
    label: '联系电话',
    width: 130,
    visible: true,
    slot: 'customerPhone'
  },
  {
    prop: 'serviceType',
    label: '服务类型',
    width: 100,
    visible: true,
    slot: 'serviceType'
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
    showOverflowTooltip: true,
    slot: 'reason'
  },
  {
    prop: 'status',
    label: '处理状态',
    width: 100,
    visible: true,
    slot: 'status'
  },
  {
    prop: 'priority',
    label: '优先级',
    width: 100,
    visible: true,
    slot: 'priority'
  },
  {
    prop: 'assignedTo',
    label: '处理人',
    width: 100,
    visible: true
  },
  {
    prop: 'createTime',
    label: '创建时间',
    width: 160,
    visible: true,
    sortable: true,
    formatter: (value: unknown) => formatDateTime(value as string)
  },
  {
    prop: 'updateTime',
    label: '更新时间',
    width: 160,
    visible: true,
    sortable: true,
    formatter: (value: unknown) => formatDateTime(value as string)
  }
])

// 计算属性
const _hasSelection = computed(() => selectedRows.value.length > 0)

// 各状态数量统计
const pendingCount = computed(() => {
  return serviceStore.services.filter((s: AfterSalesService) => s.status === 'pending').length
})

const processingCount = computed(() => {
  return serviceStore.services.filter((s: AfterSalesService) => s.status === 'processing').length
})

const resolvedCount = computed(() => {
  return serviceStore.services.filter((s: AfterSalesService) => s.status === 'resolved').length
})

const closedCount = computed(() => {
  return serviceStore.services.filter((s: AfterSalesService) => s.status === 'closed').length
})

// 方法
// 标签页切换
const handleTabChange = (tabName: string) => {
  activeTab.value = tabName
  searchForm.status = tabName
  pagination.currentPage = 1
  loadData()
}

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

/**
 * 查看订单详情
 */
const handleViewOrder = (row: AfterSalesService) => {
  if (row.orderId) {
    safeNavigator.push(`/order/detail/${row.orderId}`)
  } else if (row.orderNumber) {
    safeNavigator.push(`/order/detail/${row.orderNumber}`)
  } else {
    ElMessage.warning('订单信息不完整,无法跳转')
  }
}

/**
 * 查看客户详情
 */
const handleViewCustomer = (row: AfterSalesService) => {
  if (row.customerId) {
    safeNavigator.push(`/customer/detail/${row.customerId}`)
  } else {
    ElMessage.warning('客户信息不完整,无法跳转')
  }
}

const handleExport = () => {
  ElMessage.success('导出功能开发中...')
}

// 列设置功能已由DynamicTable组件提供,无需单独实现

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

// 部门筛选变化
const handleDepartmentFilterChange = () => {
  // 清空已选择的用户
  assignForm.userId = ''
}

const handleMoreAction = (command: string, row: AfterSalesService) => {
  currentRow.value = row

  switch (command) {
    case 'assign':
      assignForm.assignType = 'user'
      assignForm.userId = ''
      assignForm.departmentId = ''
      assignForm.filterDepartmentId = ''
      assignForm.remark = ''
      assignDialogVisible.value = true
      break
    case 'priority':
      priorityForm.priority = row.priority || 'normal'
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
  let assignedToName = ''

  if (assignForm.assignType === 'user') {
    // 指定用户
    if (!assignForm.userId) {
      ElMessage.warning('请选择处理人')
      return
    }
    const user = userOptions.value.find((u: unknown) => u.id === assignForm.userId)
    assignedToName = user?.name || ''
  } else {
    // 部门随机分配
    if (!assignForm.departmentId) {
      ElMessage.warning('请选择部门')
      return
    }

    // 获取部门下的用户
    const dept = departmentOptions.value.find((d: unknown) => d.id === assignForm.departmentId)
    const deptUsers = userOptions.value.filter((u: unknown) => u.department === dept?.name)

    if (deptUsers.length === 0) {
      ElMessage.warning('该部门下没有可分配的用户')
      return
    }

    // 随机选择一个用户
    const randomUser = deptUsers[Math.floor(Math.random() * deptUsers.length)]
    assignedToName = randomUser.name
  }

  assignLoading.value = true
  try {
    // 调用API分配处理人
    await serviceStore.assignService(
      currentRow.value.id,
      assignedToName,
      assignForm.userId || undefined,
      assignForm.remark || undefined
    )

    // 发送分配处理人成功的消息提醒
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_ASSIGNED,
      `售后申请 ${currentRow.value.serviceNumber} 已分配给 ${assignedToName}，客户：${currentRow.value.customerName}`,
      {
        relatedId: currentRow.value.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${currentRow.value.serviceNumber}`,
        metadata: {
          customerName: currentRow.value.customerName,
          serviceType: currentRow.value.serviceType,
          assignedTo: assignedToName
        }
      }
    )

    // 分配成功,显示提示并关闭对话框
    ElMessage.success('分配成功')
    assignDialogVisible.value = false

    // 重置表单
    assignForm.assignedTo = ''
    assignForm.remark = ''
  } catch (error) {
    console.error('分配失败:', error)
    ElMessage.error(`分配失败: ${error.message || error}`)
  } finally {
    assignLoading.value = false
  }
}

const handlePriorityConfirm = async () => {
  if (!currentRow.value) {
    ElMessage.error('请先选择售后记录')
    return
  }

  if (!priorityForm.priority) {
    ElMessage.warning('请选择优先级')
    return
  }

  priorityLoading.value = true
  try {
    // 调用API设置优先级
    await serviceStore.setServicePriority(
      currentRow.value.id,
      priorityForm.priority as 'low' | 'normal' | 'high' | 'urgent',
      priorityForm.remark || undefined
    )

    // 发送优先级设置成功的消息提醒
    const priorityText = getPriorityText(priorityForm.priority)
    notificationStore.sendMessage(
      notificationStore.MessageType.AFTER_SALES_CREATED,
      `售后申请 ${currentRow.value.serviceNumber} 优先级已设置为${priorityText}，客户：${currentRow.value.customerName}`,
      {
        relatedId: currentRow.value.serviceNumber,
        relatedType: 'service',
        actionUrl: `/service/detail/${currentRow.value.serviceNumber}`
      }
    )

    ElMessage.success('优先级设置成功')
    priorityDialogVisible.value = false

    // 重新加载数据
    await loadData()
  } catch (error) {
    console.error('设置优先级失败:', error)
    ElMessage.error('设置优先级失败')
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
      // 调用API删除售后单
      await serviceStore.deleteService(row.id)

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

    // 强制更新视图
    await nextTick(() => {
      pagination.total = tableData.value.length
    })
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    tableLoading.value = false
  }
}

// 辅助方法
const getReasonText = (reason: string) => {
  if (!reason) return '未知原因'

  const map: Record<string, string> = {
    // 完整键名
    'quality_issue': '质量问题',
    'damaged': '商品损坏',
    'not_as_described': '描述不符',
    'wrong_item': '发错商品',
    'logistics_damage': '物流损坏',
    'not_satisfied': '不满意',
    'size_issue': '尺寸问题',
    'color_issue': '颜色问题',
    'defective': '商品缺陷',
    'expired': '商品过期',
    'other': '其他原因',
    // 简短键名(兼容)
    'quality': '质量问题',
    'damage': '商品损坏',
    'wrong': '发错商品',
    'size': '尺寸不符',
    'description': '描述不符',
    'logistics': '物流问题',
    'complaint': '投诉',
    'return': '退货',
    'exchange': '换货',
    'refund': '退款',
    'repair': '维修',
    'inquiry': '咨询',
    // 其他可能的值
    'osmogd': '其他原因'
  }

  return map[reason] || reason
}

const getServiceTypeText = (type: string) => {
  const map: Record<string, string> = {
    return: '退货',
    exchange: '换货',
    repair: '维修',
    complaint: '投诉',
    inquiry: '咨询',
    refund: '退款'
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
  if (!status) return '未知状态'

  const map: Record<string, string> = {
    pending: '待处理',
    processing: '处理中',
    resolved: '已解决',
    completed: '已完成',
    closed: '已关闭',
    cancelled: '已取消'
  }

  return map[status] || status
}

const getStatusTagType = (status: string) => {
  const map: Record<string, string> = {
    pending: 'warning',
    processing: 'primary',
    resolved: 'success',
    completed: 'success',
    closed: 'info',
    cancelled: 'info'
  }
  return map[status] || ''
}

const getPriorityText = (priority: string) => {
  if (!priority) return '普通'

  const map: Record<string, string> = {
    low: '低',
    normal: '普通',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }

  return map[priority] || priority
}

const getPriorityTagType = (priority: string) => {
  const map: Record<string, string> = {
    low: 'info',
    normal: '',
    medium: '',
    high: 'warning',
    urgent: 'danger'
  }
  return map[priority] || ''
}

// 监听数据变化,更新分页总数
watch(
  [
    () => serviceStore.services,
    () => activeTab.value,
    () => searchForm.orderNumber,
    () => searchForm.customerName,
    () => searchForm.serviceType
  ],
  () => {
    nextTick(() => {
      pagination.total = tableData.value.length
      console.log('统计数量更新:', pagination.total)
    })
  },
  { immediate: true }
)

// 生命周期
onMounted(async () => {
  // 加载用户数据(修复分配处理人获取不到用户的问题)
  await userStore.loadUsers()
  // 加载售后数据
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

.tabs-action-bar {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  gap: 20px;
}

.service-tabs {
  flex: 1;
  min-width: 0;
}

.service-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.service-tabs .tab-label {
  display: flex;
  align-items: center;
  gap: 8px;
}

.action-buttons {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
  padding-top: 8px;
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
