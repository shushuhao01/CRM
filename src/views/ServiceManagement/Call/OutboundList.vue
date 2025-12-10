<template>
  <div class="outbound-list">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><PhoneOutgoing /></el-icon>
          呼出列表
        </h1>
        <p class="page-description">管理所有外呼记录，支持批量操作和数据导出</p>
      </div>

      <div class="header-actions">
        <el-button type="primary" @click="showOutboundDialog = true">
          <el-icon><Phone /></el-icon>
          发起外呼
        </el-button>
        <el-button @click="exportRecords" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
      </div>
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

          <el-form-item label="客户电话">
            <el-input
              v-model="searchForm.customerPhone"
              placeholder="请输入客户电话"
              clearable
              style="width: 200px;"
            />
          </el-form-item>

          <el-form-item label="通话状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="已接通" value="connected" />
              <el-option label="未接听" value="missed" />
              <el-option label="拒接" value="rejected" />
              <el-option label="失败" value="failed" />
            </el-select>
          </el-form-item>

          <el-form-item label="呼叫时间">
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

          <el-form-item label="呼叫人员">
            <el-select
              v-model="searchForm.callerId"
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
            <span>呼出记录 (共 {{ total }} 条)</span>
            <div class="table-actions">
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchDelete"
              >
                批量删除
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchExport"
              >
                批量导出
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="callRecords"
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

          <el-table-column prop="callerName" label="呼叫人员" width="100" />

          <el-table-column prop="startTime" label="呼叫时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.startTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="duration" label="通话时长" width="100">
            <template #default="{ row }">
              {{ formatDuration(row.duration) }}
            </template>
          </el-table-column>

          <el-table-column prop="status" label="通话状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="hasRecording" label="录音" width="80">
            <template #default="{ row }">
              <el-icon v-if="row.hasRecording" color="#67C23A">
                <VideoPlay />
              </el-icon>
              <span v-else style="color: #C0C4CC;">无</span>
            </template>
          </el-table-column>

          <el-table-column prop="followUpStatus" label="跟进状态" width="100">
            <template #default="{ row }">
              <el-tag
                v-if="row.followUpStatus"
                :type="row.followUpStatus === 'pending' ? 'warning' : 'success'"
                size="small"
              >
                {{ row.followUpStatus === 'pending' ? '待跟进' : '已跟进' }}
              </el-tag>
              <span v-else style="color: #C0C4CC;">无需跟进</span>
            </template>
          </el-table-column>

          <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />

          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" @click="callAgain(row)">
                <el-icon><Phone /></el-icon>
                再次呼叫
              </el-button>

              <el-button
                text
                size="small"
                @click="playRecording(row)"
                :disabled="!row.hasRecording"
              >
                <el-icon><VideoPlay /></el-icon>
                播放录音
              </el-button>

              <el-button text size="small" @click="addFollowUp(row)">
                <el-icon><EditPen /></el-icon>
                添加跟进
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
                    <el-dropdown-item @click="editRecord(row)">
                      <el-icon><Edit /></el-icon>
                      编辑记录
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

    <!-- 外呼对话框 -->
    <el-dialog
      v-model="showOutboundDialog"
      title="发起外呼"
      width="500px"
      :close-on-click-modal="false"
    >
      <el-form :model="outboundForm" :rules="outboundRules" ref="outboundFormRef" label-width="80px">
        <el-form-item label="客户电话" prop="customerPhone">
          <el-input
            v-model="outboundForm.customerPhone"
            placeholder="请输入客户电话号码"
            maxlength="11"
          />
        </el-form-item>

        <el-form-item label="客户姓名" prop="customerName">
          <el-input
            v-model="outboundForm.customerName"
            placeholder="请输入客户姓名"
          />
        </el-form-item>

        <el-form-item label="呼叫备注">
          <el-input
            v-model="outboundForm.notes"
            type="textarea"
            :rows="3"
            placeholder="请输入呼叫备注信息"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showOutboundDialog = false">取消</el-button>
        <el-button type="primary" @click="startOutboundCall" :loading="calling">
          开始呼叫
        </el-button>
      </template>
    </el-dialog>

    <!-- 跟进记录对话框 -->
    <el-dialog
      v-model="showFollowUpDialog"
      title="添加跟进记录"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="followUpForm" :rules="followUpRules" ref="followUpFormRef" label-width="100px">
        <el-form-item label="跟进类型" prop="type">
          <el-select v-model="followUpForm.type" placeholder="请选择跟进类型">
            <el-option label="电话跟进" value="phone" />
            <el-option label="微信跟进" value="wechat" />
            <el-option label="邮件跟进" value="email" />
            <el-option label="上门拜访" value="visit" />
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

        <el-form-item label="下次跟进">
          <el-date-picker
            v-model="followUpForm.nextFollowUpTime"
            type="datetime"
            placeholder="选择下次跟进时间"
            format="YYYY-MM-DD HH:mm"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showFollowUpDialog = false">取消</el-button>
        <el-button type="primary" @click="saveFollowUp" :loading="savingFollowUp">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import type { CallRecord } from '@/api/call'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import {
  Phone,
  Download,
  Search,
  VideoPlay,
  EditPen,
  ArrowDown,
  View,
  Edit,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { formatDateTime } from '@/utils/dateFormat'

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
const exportLoading = ref(false)
const calling = ref(false)
const savingFollowUp = ref(false)
const callRecords = ref<CallRecord[]>([])
const selectedRecords = ref<CallRecord[]>([])
const total = ref(0)
const showOutboundDialog = ref(false)
const showFollowUpDialog = ref(false)
const currentRecord = ref<CallRecord | null>(null)

// 搜索表单
const searchForm = reactive({
  customerName: '',
  customerPhone: '',
  status: '',
  dateRange: [] as string[],
  callerId: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20
})

// 外呼表单
const outboundForm = reactive({
  customerPhone: '',
  customerName: '',
  notes: ''
})

const outboundFormRef = ref<FormInstance>()
const outboundRules: FormRules = {
  customerPhone: [
    { required: true, message: '请输入客户电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ],
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ]
}

// 跟进表单
const followUpForm = reactive({
  type: '',
  content: '',
  nextFollowUpTime: ''
})

const followUpFormRef = ref<FormInstance>()
const followUpRules: FormRules = {
  type: [
    { required: true, message: '请选择跟进类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' }
  ]
}

// 方法
// formatDateTime 已从 @/utils/dateFormat 导入

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    connected: 'success',
    missed: 'warning',
    rejected: 'danger',
    failed: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    connected: '已接通',
    missed: '未接听',
    rejected: '拒接',
    failed: '失败'
  }
  return statusMap[status] || '未知'
}

const loadCallRecords = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm,
      startDate: searchForm.dateRange[0],
      endDate: searchForm.dateRange[1]
    }

    const response = await callStore.fetchCallRecords(params)
    callRecords.value = response.records
    total.value = response.total
  } catch (error) {
    console.error('加载呼出记录失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadCallRecords()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    customerName: '',
    customerPhone: '',
    status: '',
    dateRange: [],
    callerId: ''
  })
  handleSearch()
}

const handleSelectionChange = (selection: CallRecord[]) => {
  selectedRecords.value = selection
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  loadCallRecords()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadCallRecords()
}

const startOutboundCall = async () => {
  if (!outboundFormRef.value) return

  try {
    await outboundFormRef.value.validate()
    calling.value = true

    await callStore.makeOutboundCall({
      customerPhone: outboundForm.customerPhone,
      customerName: outboundForm.customerName,
      notes: outboundForm.notes
    })

    ElMessage.success('外呼已发起')
    showOutboundDialog.value = false

    // 重置表单
    outboundFormRef.value.resetFields()
    Object.assign(outboundForm, {
      customerPhone: '',
      customerName: '',
      notes: ''
    })

    // 刷新列表
    loadCallRecords()
  } catch (error) {
    console.error('发起外呼失败:', error)
    ElMessage.error('发起外呼失败')
  } finally {
    calling.value = false
  }
}

const callAgain = async (record: CallRecord) => {
  try {
    await callStore.makeOutboundCall({
      customerPhone: record.customerPhone,
      customerName: record.customerName,
      notes: `再次呼叫 - 原记录ID: ${record.id}`
    })

    ElMessage.success('外呼已发起')
    loadCallRecords()
  } catch (error) {
    console.error('再次呼叫失败:', error)
    ElMessage.error('再次呼叫失败')
  }
}

const playRecording = (record: CallRecord) => {
  if (!record.hasRecording) {
    ElMessage.warning('该通话没有录音')
    return
  }

  // 跳转到录音播放页面或打开录音播放器
  safeNavigator.push(`/service-management/call/recordings?recordId=${record.id}`)
}

const addFollowUp = (record: CallRecord) => {
  currentRecord.value = record
  showFollowUpDialog.value = true
}

const saveFollowUp = async () => {
  if (!followUpFormRef.value || !currentRecord.value) return

  try {
    await followUpFormRef.value.validate()
    savingFollowUp.value = true

    await callStore.createFollowUpRecord({
      callRecordId: currentRecord.value.id,
      customerId: currentRecord.value.customerId,
      type: followUpForm.type,
      content: followUpForm.content,
      nextFollowUpTime: followUpForm.nextFollowUpTime || undefined
    })

    ElMessage.success('跟进记录已保存')
    showFollowUpDialog.value = false

    // 重置表单
    followUpFormRef.value.resetFields()
    Object.assign(followUpForm, {
      type: '',
      content: '',
      nextFollowUpTime: ''
    })

    // 刷新列表
    loadCallRecords()
  } catch (error) {
    console.error('保存跟进记录失败:', error)
    ElMessage.error('保存跟进记录失败')
  } finally {
    savingFollowUp.value = false
  }
}

const viewCustomerDetail = (customerId: string) => {
  safeNavigator.push(`/customer-management/detail/${customerId}`)
}

const viewDetail = (record: CallRecord) => {
  safeNavigator.push(`/service-management/call/records/${record.id}`)
}

const editRecord = (record: CallRecord) => {
  // 编辑记录逻辑
  console.log('编辑记录:', record)
}

const deleteRecord = async (record: CallRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通话记录吗？', '确认删除', {
      type: 'warning'
    })

    await callStore.deleteCallRecord(record.id)
    ElMessage.success('删除成功')
    loadCallRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error('删除失败')
    }
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
    await callStore.batchDeleteCallRecords(ids)

    ElMessage.success('批量删除成功')
    loadCallRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const batchExport = async () => {
  if (!selectedRecords.value || selectedRecords.value.length === 0) {
    ElMessage.warning('请先选择要导出的记录')
    return
  }

  try {
    const ids = selectedRecords.value.map(record => record.id)
    await callStore.exportCallRecords({ recordIds: ids })
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('批量导出失败:', error)
    ElMessage.error('批量导出失败')
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

    await callStore.exportCallRecords(params)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

// 生命周期
onMounted(async () => {
  await userStore.loadUsers()
  loadCallRecords()
})
</script>

<style scoped>
.outbound-list {
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
