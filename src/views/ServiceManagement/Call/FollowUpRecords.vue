<template>
  <div class="follow-up-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><EditPen /></el-icon>
          跟进记录
        </h1>
        <p class="page-description">管理客户跟进记录，跟踪客户沟通进度和待办事项</p>
      </div>

      <div class="header-actions">
        <el-button type="primary" @click="showAddDialog = true">
          <el-icon><Plus /></el-icon>
          新增跟进
        </el-button>
        <el-button @click="exportRecords" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon pending">
                <el-icon><Clock /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.pendingCount || 0 }}</div>
                <div class="stat-label">待跟进</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon completed">
                <el-icon><SuccessFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.completedCount || 0 }}</div>
                <div class="stat-label">已完成</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon overdue">
                <el-icon><WarningFilled /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.overdueCount || 0 }}</div>
                <div class="stat-label">已逾期</div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon today">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ stats.todayCount || 0 }}</div>
                <div class="stat-label">今日待办</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-card>
        <el-form :model="searchForm" inline>
          <el-form-item label="客户姓名">
            <el-input
              v-model="searchForm.customerName"
              placeholder="请输入客户姓名"
              clearable
              style="width: 200px;"
            />
          </el-form-item>

          <el-form-item label="跟进状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="待跟进" value="pending" />
              <el-option label="已完成" value="completed" />
              <el-option label="已逾期" value="overdue" />
            </el-select>
          </el-form-item>

          <el-form-item label="跟进类型">
            <el-select
              v-model="searchForm.type"
              placeholder="请选择类型"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="电话跟进" value="phone" />
              <el-option label="微信跟进" value="wechat" />
              <el-option label="邮件跟进" value="email" />
              <el-option label="上门拜访" value="visit" />
            </el-select>
          </el-form-item>

          <el-form-item label="跟进时间">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
              style="width: 240px;"
            />
          </el-form-item>

          <el-form-item label="跟进人员">
            <el-select
              v-model="searchForm.followerId"
              placeholder="请选择人员"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option
                v-for="user in salesPersonList"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <div class="table-header">
            <span>跟进记录 (共 {{ total }} 条)</span>
            <div class="table-actions">
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchComplete"
              >
                批量完成
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="followUpRecords"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          style="width: 100%"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="customerName" label="客户姓名" width="120">
            <template #default="{ row }">
              <el-button text @click="viewCustomerDetail(row.customerId)">
                {{ row.customerName }}
              </el-button>
            </template>
          </el-table-column>

          <el-table-column prop="customerPhone" label="客户电话" width="140">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>

          <el-table-column prop="type" label="跟进类型" width="100">
            <template #default="{ row }">
              <el-tag :type="getTypeTagType(row.type)" size="small">
                {{ getTypeText(row.type) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="content" label="跟进内容" min-width="200" show-overflow-tooltip />

          <el-table-column prop="followerName" label="跟进人员" width="100" />

          <el-table-column prop="followUpTime" label="跟进时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.followUpTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="nextFollowUpTime" label="下次跟进" width="160">
            <template #default="{ row }">
              <span v-if="row.nextFollowUpTime" :class="getNextFollowUpClass(row.nextFollowUpTime)">
                {{ formatDateTime(row.nextFollowUpTime) }}
              </span>
              <span v-else style="color: #C0C4CC;">无</span>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="priority" label="优先级" width="100">
            <template #default="{ row }">
              <el-tag :type="getPriorityType(row.priority)" size="small">
                {{ getPriorityText(row.priority) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button
                text
                size="small"
                @click="completeFollowUp(row)"
                :disabled="row.status === 'completed'"
              >
                <el-icon><Check /></el-icon>
                完成
              </el-button>

              <el-button text size="small" @click="editRecord(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>

              <el-button text size="small" @click="addNextFollowUp(row)">
                <el-icon><Plus /></el-icon>
                下次跟进
              </el-button>

              <el-dropdown>
                <el-button text size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="viewDetail(row)">
                      <el-icon><View /></el-icon>
                      查看详情
                    </el-dropdown-item>
                    <el-dropdown-item @click="copyRecord(row)">
                      <el-icon><CopyDocument /></el-icon>
                      复制记录
                    </el-dropdown-item>
                    <el-dropdown-item @click="deleteRecord(row)" divided>
                      <el-icon><Delete /></el-icon>
                      删除记录
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 新增/编辑跟进记录对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingRecord ? '编辑跟进记录' : '新增跟进记录'"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="followUpForm" :rules="followUpRules" ref="followUpFormRef" label-width="100px">
        <el-form-item label="客户信息" prop="customerId">
          <el-select
            v-model="followUpForm.customerId"
            placeholder="请选择客户"
            filterable
            remote
            :remote-method="searchCustomers"
            :loading="customerLoading"
            style="width: 100%;"
          >
            <el-option
              v-for="customer in customers"
              :key="customer.id"
              :label="`${customer.name} (${customer.phone})`"
              :value="customer.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="followUpForm.type" placeholder="请选择跟进类型">
            <el-option label="电话跟进" value="phone" />
            <el-option label="微信跟进" value="wechat" />
            <el-option label="邮件跟进" value="email" />
            <el-option label="上门拜访" value="visit" />
          </el-select>
        </el-form-item>

        <el-form-item label="优先级" prop="priority">
          <el-select v-model="followUpForm.priority" placeholder="请选择优先级">
            <el-option label="低" value="low" />
            <el-option label="中" value="medium" />
            <el-option label="高" value="high" />
            <el-option label="紧急" value="urgent" />
          </el-select>
        </el-form-item>

        <el-form-item label="跟进内容" prop="content">
          <el-input
            v-model="followUpForm.content"
            type="textarea"
            :rows="4"
            placeholder="请输入跟进内容"
          />
        </el-form-item>

        <el-form-item label="跟进结果">
          <el-input
            v-model="followUpForm.result"
            type="textarea"
            :rows="3"
            placeholder="请输入跟进结果"
          />
        </el-form-item>

        <el-form-item label="下次跟进">
          <el-date-picker
            v-model="followUpForm.nextFollowUpTime"
            type="datetime"
            placeholder="选择下次跟进时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
            style="width: 100%;"
          />
        </el-form-item>

        <el-form-item label="提醒设置">
          <el-checkbox v-model="followUpForm.enableReminder">启用提醒</el-checkbox>
          <el-select
            v-model="followUpForm.reminderTime"
            v-if="followUpForm.enableReminder"
            placeholder="提醒时间"
            style="margin-left: 10px; width: 150px;"
          >
            <el-option label="提前15分钟" value="15" />
            <el-option label="提前30分钟" value="30" />
            <el-option label="提前1小时" value="60" />
            <el-option label="提前1天" value="1440" />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFollowUp" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>

    <!-- 跟进详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="跟进记录详情"
      width="700px"
    >
      <div v-if="currentRecord" class="follow-up-detail">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="客户姓名">
            {{ currentRecord.customerName }}
          </el-descriptions-item>
          <el-descriptions-item label="客户电话">
            {{ currentRecord.customerPhone }}
          </el-descriptions-item>
          <el-descriptions-item label="跟进类型">
            <el-tag :type="getTypeTagType(currentRecord.type)" size="small">
              {{ getTypeText(currentRecord.type) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="优先级">
            <el-tag :type="getPriorityType(currentRecord.priority)" size="small">
              {{ getPriorityText(currentRecord.priority) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="跟进人员">
            {{ currentRecord.followerName }}
          </el-descriptions-item>
          <el-descriptions-item label="跟进时间">
            {{ formatDateTime(currentRecord.followUpTime) }}
          </el-descriptions-item>
          <el-descriptions-item label="状态">
            <el-tag :type="getStatusType(currentRecord.status)" size="small">
              {{ getStatusText(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="下次跟进">
            {{ currentRecord.nextFollowUpTime ? formatDateTime(currentRecord.nextFollowUpTime) : '无' }}
          </el-descriptions-item>
          <el-descriptions-item label="跟进内容" :span="2">
            <div class="content-text">{{ currentRecord.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="跟进结果" :span="2" v-if="currentRecord.result">
            <div class="content-text">{{ currentRecord.result }}</div>
          </el-descriptions-item>
        </el-descriptions>

        <!-- 相关通话记录 -->
        <div v-if="currentRecord.callRecordId" class="related-call">
          <h4>相关通话记录</h4>
          <el-button text @click="viewCallRecord(currentRecord.callRecordId)">
            查看通话详情
          </el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import type { FollowUpRecord } from '@/api/call'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import {
  EditPen,
  Plus,
  Download,
  Clock,
  SuccessFilled,
  WarningFilled,
  Calendar,
  Search,
  Check,
  Edit,
  ArrowDown,
  View,
  CopyDocument,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const callStore = useCallStore()
const userStore = useUserStore()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 负责人列表 - 从userStore获取真实用户
const salesPersonList = computed(() => {
  return userStore.users
    .filter((u: any) => ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role))
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username
    }))
})

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const exportLoading = ref(false)
const customerLoading = ref(false)
const followUpRecords = ref<FollowUpRecord[]>([])
const selectedRecords = ref<FollowUpRecord[]>([])
const customers = ref<any[]>([])
const total = ref(0)
const showAddDialog = ref(false)
const showDetailDialog = ref(false)
const editingRecord = ref<FollowUpRecord | null>(null)
const currentRecord = ref<FollowUpRecord | null>(null)

// 统计数据
const stats = ref({
  pendingCount: 0,
  completedCount: 0,
  overdueCount: 0,
  todayCount: 0
})

// 搜索表单
const searchForm = reactive({
  customerName: '',
  status: '',
  type: '',
  dateRange: [] as string[],
  followerId: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20
})

// 跟进表单
const followUpForm = reactive({
  customerId: '',
  type: '',
  priority: 'medium',
  content: '',
  result: '',
  nextFollowUpTime: '',
  enableReminder: false,
  reminderTime: '30'
})

const followUpFormRef = ref<FormInstance>()
const followUpRules: FormRules = {
  customerId: [
    { required: true, message: '请选择客户', trigger: 'change' }
  ],
  type: [
    { required: true, message: '请选择跟进类型', trigger: 'change' }
  ],
  priority: [
    { required: true, message: '请选择优先级', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' }
  ]
}

// 方法
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

const getTypeTagType = (type: string) => {
  const typeMap: Record<string, string> = {
    phone: 'primary',
    wechat: 'success',
    email: 'warning',
    visit: 'danger'
  }
  return typeMap[type] || 'info'
}

const getTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    phone: '电话跟进',
    wechat: '微信跟进',
    email: '邮件跟进',
    visit: '上门拜访'
  }
  return typeMap[type] || '未知'
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: 'warning',
    completed: 'success',
    overdue: 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    pending: '待跟进',
    completed: '已完成',
    overdue: '已逾期'
  }
  return statusMap[status] || '未知'
}

const getPriorityType = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: 'info',
    medium: 'primary',
    high: 'warning',
    urgent: 'danger'
  }
  return priorityMap[priority] || 'info'
}

const getPriorityText = (priority: string) => {
  const priorityMap: Record<string, string> = {
    low: '低',
    medium: '中',
    high: '高',
    urgent: '紧急'
  }
  return priorityMap[priority] || '未知'
}

const getNextFollowUpClass = (nextTime: string) => {
  const now = new Date()
  const followUpTime = new Date(nextTime)

  if (followUpTime < now) {
    return 'overdue-time'
  } else if (followUpTime.getTime() - now.getTime() < 24 * 60 * 60 * 1000) {
    return 'urgent-time'
  }
  return 'normal-time'
}

const loadFollowUpRecords = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm,
      startDate: searchForm.dateRange[0],
      endDate: searchForm.dateRange[1]
    }

    const response = await callStore.fetchFollowUpRecords(params)
    followUpRecords.value = response.records
    total.value = response.total
  } catch (error) {
    console.error('加载跟进记录失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadStats = async () => {
  try {
    const data = await callStore.fetchFollowUpStats()
    stats.value = data
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

const searchCustomers = async (query: string) => {
  if (!query) return

  try {
    customerLoading.value = true
    // 这里应该调用客户搜索API
    // const response = await customerApi.searchCustomers({ keyword: query })
    // customers.value = response.data

    // 模拟数据
    customers.value = [
      { id: '1', name: '张三', phone: '13800138001' },
      { id: '2', name: '李四', phone: '13800138002' },
      { id: '3', name: '王五', phone: '13800138003' }
    ].filter(customer =>
      customer.name.includes(query) || customer.phone.includes(query)
    )
  } catch (error) {
    console.error('搜索客户失败:', error)
  } finally {
    customerLoading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadFollowUpRecords()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    customerName: '',
    status: '',
    type: '',
    dateRange: [],
    followerId: ''
  })
  handleSearch()
}

const handleSelectionChange = (selection: FollowUpRecord[]) => {
  selectedRecords.value = selection
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  loadFollowUpRecords()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadFollowUpRecords()
}

const saveFollowUp = async () => {
  if (!followUpFormRef.value) return

  try {
    await followUpFormRef.value.validate()
    saving.value = true

    if (editingRecord.value) {
      await callStore.updateFollowUpRecord(editingRecord.value.id, followUpForm)
      ElMessage.success('跟进记录已更新')
    } else {
      await callStore.createFollowUpRecord(followUpForm)
      ElMessage.success('跟进记录已创建')
    }

    showAddDialog.value = false
    resetForm()
    loadFollowUpRecords()
    loadStats()
  } catch (error) {
    console.error('保存跟进记录失败:', error)
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetForm = () => {
  followUpFormRef.value?.resetFields()
  Object.assign(followUpForm, {
    customerId: '',
    type: '',
    priority: 'medium',
    content: '',
    result: '',
    nextFollowUpTime: '',
    enableReminder: false,
    reminderTime: '30'
  })
  editingRecord.value = null
}

const completeFollowUp = async (record: FollowUpRecord) => {
  try {
    await callStore.updateFollowUpRecord(record.id, { status: 'completed' })
    ElMessage.success('跟进已完成')
    loadFollowUpRecords()
    loadStats()
  } catch (error) {
    console.error('完成跟进失败:', error)
    ElMessage.error('操作失败')
  }
}

const editRecord = (record: FollowUpRecord) => {
  editingRecord.value = record
  Object.assign(followUpForm, {
    customerId: record.customerId,
    type: record.type,
    priority: record.priority,
    content: record.content,
    result: record.result || '',
    nextFollowUpTime: record.nextFollowUpTime || '',
    enableReminder: false,
    reminderTime: '30'
  })
  showAddDialog.value = true
}

const addNextFollowUp = (record: FollowUpRecord) => {
  Object.assign(followUpForm, {
    customerId: record.customerId,
    type: record.type,
    priority: record.priority,
    content: `基于上次跟进的后续跟进：${record.content}`,
    result: '',
    nextFollowUpTime: '',
    enableReminder: false,
    reminderTime: '30'
  })
  showAddDialog.value = true
}

const viewDetail = (record: FollowUpRecord) => {
  currentRecord.value = record
  showDetailDialog.value = true
}

const copyRecord = (record: FollowUpRecord) => {
  Object.assign(followUpForm, {
    customerId: record.customerId,
    type: record.type,
    priority: record.priority,
    content: record.content,
    result: '',
    nextFollowUpTime: '',
    enableReminder: false,
    reminderTime: '30'
  })
  showAddDialog.value = true
}

const deleteRecord = async (record: FollowUpRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这条跟进记录吗？', '确认删除', {
      type: 'warning'
    })

    await callStore.deleteFollowUpRecord(record.id)
    ElMessage.success('删除成功')
    loadFollowUpRecords()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const batchComplete = async () => {
  if (!selectedRecords.value || selectedRecords.value.length === 0) {
    ElMessage.warning('请先选择要完成的记录')
    return
  }

  try {
    const ids = selectedRecords.value.map(record => record.id)
    await callStore.batchUpdateFollowUpRecords(ids, { status: 'completed' })
    ElMessage.success('批量完成成功')
    loadFollowUpRecords()
    loadStats()
  } catch (error) {
    console.error('批量完成失败:', error)
    ElMessage.error('批量操作失败')
  }
}

const batchDelete = async () => {
  if (!selectedRecords.value || selectedRecords.value.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条记录吗？`,
      '批量删除',
      { type: 'warning' }
    )

    const ids = selectedRecords.value.map(record => record.id)
    await callStore.batchDeleteFollowUpRecords(ids)

    ElMessage.success('批量删除成功')
    loadFollowUpRecords()
    loadStats()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const exportRecords = async () => {
  try {
    exportLoading.value = true
    const params = {
      ...searchForm,
      startDate: searchForm.dateRange[0],
      endDate: searchForm.dateRange[1]
    }

    await callStore.exportFollowUpRecords(params)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const viewCustomerDetail = (customerId: string) => {
  safeNavigator.push(`/customer-management/detail/${customerId}`)
}

const viewCallRecord = (callRecordId: string) => {
  safeNavigator.push(`/service-management/call/records/${callRecordId}`)
}

// 生命周期
onMounted(async () => {
  await userStore.loadUsers()
  loadFollowUpRecords()
  loadStats()
})
</script>

<style scoped>
.follow-up-records {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.stats-cards {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.pending {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.completed {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-icon.overdue {
  background: linear-gradient(135deg, #fa709a 0%, #fee140 100%);
}

.stat-icon.today {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.search-section {
  margin-bottom: 20px;
}

.table-section {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.follow-up-detail {
  padding: 16px 0;
}

.content-text {
  white-space: pre-wrap;
  line-height: 1.6;
}

.related-call {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.related-call h4 {
  margin: 0 0 10px 0;
  color: #303133;
}

.overdue-time {
  color: #F56C6C;
  font-weight: 600;
}

.urgent-time {
  color: #E6A23C;
  font-weight: 600;
}

.normal-time {
  color: #606266;
}

:deep(.el-table) {
  border: none;
}

:deep(.el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table td) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table tr:hover > td) {
  background-color: #f5f7fa;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 16px;
  margin-bottom: 16px;
}
</style>
