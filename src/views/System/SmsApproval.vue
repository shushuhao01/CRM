<template>
  <div class="sms-approval-container">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>短信审核管理</span>
          <div class="header-actions">
            <el-button type="primary" @click="handleBatchApprove" :disabled="!selectedRows.length">
              批量通过
            </el-button>
            <el-button type="danger" @click="handleBatchReject" :disabled="!selectedRows.length">
              批量拒绝
            </el-button>
          </div>
        </div>
      </template>

      <!-- 搜索筛选 -->
      <div class="search-section">
        <el-form :model="searchForm" inline>
          <el-form-item label="申请人">
            <el-input v-model="searchForm.applicant" placeholder="请输入申请人姓名" clearable />
          </el-form-item>
          <el-form-item label="部门">
            <el-select v-model="searchForm.department" placeholder="请选择部门" clearable>
              <el-option
                v-for="dept in departmentStore.departmentList"
                :key="dept.id"
                :label="dept.name"
                :value="dept.name"
              />
            </el-select>
          </el-form-item>
          <el-form-item label="审核状态">
            <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
              <el-option label="待审核" value="pending" />
              <el-option label="已通过" value="approved" />
              <el-option label="已拒绝" value="rejected" />
            </el-select>
          </el-form-item>
          <el-form-item label="申请时间">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="开始日期"
              end-placeholder="结束日期"
              format="YYYY-MM-DD"
              value-format="YYYY-MM-DD"
            />
          </el-form-item>
          <el-form-item>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleReset">重置</el-button>
          </el-form-item>
        </el-form>
      </div>

      <!-- 审核列表 -->
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        style="width: 100%"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="申请ID" width="80" />
        <el-table-column prop="applicant" label="申请人" width="100" />
        <el-table-column prop="department" label="部门" width="120" />
        <el-table-column prop="templateName" label="短信模板" width="150" />
        <el-table-column prop="recipientCount" label="接收人数" width="100" />
        <el-table-column prop="content" label="短信内容" min-width="200" show-overflow-tooltip />
        <el-table-column prop="reason" label="申请原因" width="150" show-overflow-tooltip />
        <el-table-column prop="status" label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="applyTime" label="申请时间" width="160" />
        <el-table-column prop="approveTime" label="审核时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button
              v-if="row.status === 'pending'"
              type="primary"
              size="small"
              @click="handleApprove(row)"
            >
              通过
            </el-button>
            <el-button
              v-if="row.status === 'pending'"
              type="danger"
              size="small"
              @click="handleReject(row)"
            >
              拒绝
            </el-button>
            <el-button type="info" size="small" @click="handleViewDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>

    <!-- 审核详情对话框 -->
    <el-dialog v-model="detailDialogVisible" title="审核详情" width="800px">
      <div v-if="currentRecord" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="申请ID">{{ currentRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="申请人">{{ currentRecord.applicant }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ currentRecord.department }}</el-descriptions-item>
          <el-descriptions-item label="短信模板">{{ currentRecord.templateName }}</el-descriptions-item>
          <el-descriptions-item label="接收人数">{{ currentRecord.recipientCount }}</el-descriptions-item>
          <el-descriptions-item label="申请时间">{{ currentRecord.applyTime }}</el-descriptions-item>
          <el-descriptions-item label="申请原因" :span="2">{{ currentRecord.reason }}</el-descriptions-item>
          <el-descriptions-item label="短信内容" :span="2">
            <div class="content-preview">{{ currentRecord.content }}</div>
          </el-descriptions-item>
          <el-descriptions-item label="接收人列表" :span="2">
            <div class="recipients-list">
              <el-tag v-for="phone in currentRecord.recipients" :key="phone" style="margin: 2px;">
                {{ displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE) }}
              </el-tag>
            </div>
          </el-descriptions-item>
        </el-descriptions>

        <div v-if="currentRecord.status !== 'pending'" class="approval-info">
          <h4>审核信息</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="审核状态">
              <el-tag :type="getStatusType(currentRecord.status)">
                {{ getStatusText(currentRecord.status) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="审核时间">{{ currentRecord.approveTime }}</el-descriptions-item>
            <el-descriptions-item label="审核人">{{ currentRecord.approver }}</el-descriptions-item>
            <el-descriptions-item label="审核备注" :span="2">{{ currentRecord.approveRemark || '无' }}</el-descriptions-item>
          </el-descriptions>
        </div>
      </div>

      <template #footer>
        <div v-if="currentRecord?.status === 'pending'" class="dialog-footer">
          <el-button @click="detailDialogVisible = false">取消</el-button>
          <el-button type="danger" @click="handleRejectFromDetail">拒绝</el-button>
          <el-button type="primary" @click="handleApproveFromDetail">通过</el-button>
        </div>
        <div v-else class="dialog-footer">
          <el-button @click="detailDialogVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 审核备注对话框 -->
    <el-dialog v-model="remarkDialogVisible" title="审核备注" width="500px">
      <el-form :model="remarkForm" label-width="80px">
        <el-form-item label="审核结果">
          <el-tag :type="remarkForm.action === 'approve' ? 'success' : 'danger'">
            {{ remarkForm.action === 'approve' ? '通过' : '拒绝' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="备注" required>
          <el-input
            v-model="remarkForm.remark"
            type="textarea"
            :rows="4"
            placeholder="请输入审核备注"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="remarkDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmApproval">确认</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useNotificationStore, MessageType } from '@/stores/notification'
import { useDepartmentStore } from '@/stores/department'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

// 接口定义
interface SmsApprovalRecord {
  id: number
  applicant: string
  department: string
  templateName: string
  recipientCount: number
  content: string
  reason: string
  status: 'pending' | 'approved' | 'rejected'
  applyTime: string
  approveTime?: string
  approver?: string
  approveRemark?: string
  recipients: string[]
}

// 通知store
const notificationStore = useNotificationStore()
const departmentStore = useDepartmentStore()

// 响应式数据
const loading = ref(false)
const selectedRows = ref<SmsApprovalRecord[]>([])
const detailDialogVisible = ref(false)
const remarkDialogVisible = ref(false)
const currentRecord = ref<SmsApprovalRecord | null>(null)

// 搜索表单
const searchForm = reactive({
  applicant: '',
  department: '',
  status: '',
  dateRange: []
})

// 审核备注表单
const remarkForm = reactive({
  action: 'approve' as 'approve' | 'reject',
  remark: '',
  recordIds: [] as number[]
})

// 分页
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 模拟数据
const mockData: SmsApprovalRecord[] = [
  {
    id: 1,
    applicant: '张三',
    department: '销售部',
    templateName: '客户回访模板',
    recipientCount: 50,
    content: '尊敬的客户，感谢您对我们产品的支持，我们将为您提供更好的服务。',
    reason: '月度客户回访活动',
    status: 'pending',
    applyTime: '2024-01-15 10:30:00',
    recipients: ['13800138001', '13800138002', '13800138003']
  },
  {
    id: 2,
    applicant: '李四',
    department: '市场部',
    templateName: '促销活动模板',
    recipientCount: 200,
    content: '新年大促销！全场商品8折起，活动时间：1月20日-1月31日，详情咨询客服。',
    reason: '新年促销活动推广',
    status: 'approved',
    applyTime: '2024-01-14 14:20:00',
    approveTime: '2024-01-14 16:45:00',
    approver: '王经理',
    approveRemark: '活动内容合规，批准发送',
    recipients: ['13800138004', '13800138005']
  },
  {
    id: 3,
    applicant: '王五',
    department: '客服部',
    templateName: '服务通知模板',
    recipientCount: 30,
    content: '您的订单已发货，快递单号：SF123456789，预计3-5个工作日送达。',
    status: 'rejected',
    applyTime: '2024-01-13 09:15:00',
    approveTime: '2024-01-13 11:30:00',
    approver: '张主管',
    approveRemark: '快递单号格式不正确，请修改后重新申请',
    recipients: ['13800138006']
  }
]

const tableData = ref<SmsApprovalRecord[]>([])

// 计算属性
const filteredData = computed(() => {
  let data = [...mockData]
  
  if (searchForm.applicant) {
    data = data.filter(item => item.applicant.includes(searchForm.applicant))
  }
  
  if (searchForm.department) {
    data = data.filter(item => item.department === searchForm.department)
  }
  
  if (searchForm.status) {
    data = data.filter(item => item.status === searchForm.status)
  }
  
  if (searchForm.dateRange && searchForm.dateRange.length === 2) {
    const [startDate, endDate] = searchForm.dateRange
    data = data.filter(item => {
      const applyDate = item.applyTime.split(' ')[0]
      return applyDate >= startDate && applyDate <= endDate
    })
  }
  
  return data
})

// 方法
const getStatusType = (status: string) => {
  const types = {
    pending: 'warning',
    approved: 'success',
    rejected: 'danger'
  }
  return types[status as keyof typeof types] || 'info'
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '待审核',
    approved: '已通过',
    rejected: '已拒绝'
  }
  return texts[status as keyof typeof texts] || status
}

const handleSearch = () => {
  loadData()
}

const handleReset = () => {
  searchForm.applicant = ''
  searchForm.department = ''
  searchForm.status = ''
  searchForm.dateRange = []
  loadData()
}

const handleSelectionChange = (selection: SmsApprovalRecord[]) => {
  selectedRows.value = selection
}

const handleApprove = (record: SmsApprovalRecord) => {
  remarkForm.action = 'approve'
  remarkForm.recordIds = [record.id]
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

const handleReject = (record: SmsApprovalRecord) => {
  remarkForm.action = 'reject'
  remarkForm.recordIds = [record.id]
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

const handleBatchApprove = () => {
  if (!selectedRows.value.length) return
  
  remarkForm.action = 'approve'
  remarkForm.recordIds = selectedRows.value.map(row => row.id)
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

const handleBatchReject = () => {
  if (!selectedRows.value.length) return
  
  remarkForm.action = 'reject'
  remarkForm.recordIds = selectedRows.value.map(row => row.id)
  remarkForm.remark = ''
  remarkDialogVisible.value = true
}

const handleViewDetail = (record: SmsApprovalRecord) => {
  currentRecord.value = record
  detailDialogVisible.value = true
}

const handleApproveFromDetail = () => {
  if (!currentRecord.value) return
  handleApprove(currentRecord.value)
  detailDialogVisible.value = false
}

const handleRejectFromDetail = () => {
  if (!currentRecord.value) return
  handleReject(currentRecord.value)
  detailDialogVisible.value = false
}

const handleConfirmApproval = async () => {
  if (!remarkForm.remark.trim()) {
    ElMessage.warning('请输入审核备注')
    return
  }

  try {
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    // 更新本地数据
    remarkForm.recordIds.forEach(id => {
      const record = mockData.find(item => item.id === id)
      if (record) {
        record.status = remarkForm.action === 'approve' ? 'approved' : 'rejected'
        record.approveTime = new Date().toLocaleString()
        record.approver = '当前用户'
        record.approveRemark = remarkForm.remark
        
        // 发送通知给申请人
        if (remarkForm.action === 'approve') {
          notificationStore.sendMessage(
            MessageType.SMS_SEND_APPROVED,
            `您的短信发送申请"${record.templateName}"已审核通过，可以开始发送了。`,
            {
              relatedId: record.id,
              relatedType: 'sms_send',
              actionUrl: '/system/sms-approval'
            }
          )
        } else {
          notificationStore.sendMessage(
            MessageType.SMS_SEND_REJECTED,
            `您的短信发送申请"${record.templateName}"审核未通过。拒绝原因：${remarkForm.remark}`,
            {
              relatedId: record.id,
              relatedType: 'sms_send',
              actionUrl: '/system/sms-approval'
            }
          )
        }
      }
    })
    
    ElMessage.success(`${remarkForm.action === 'approve' ? '通过' : '拒绝'}审核成功`)
    remarkDialogVisible.value = false
    loadData()
    
  } catch (error) {
    ElMessage.error('操作失败，请重试')
  } finally {
    loading.value = false
  }
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadData()
}

const loadData = () => {
  loading.value = true
  
  setTimeout(() => {
    const data = filteredData.value
    pagination.total = data.length
    
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    tableData.value = data.slice(start, end)
    
    loading.value = false
  }, 500)
}

// 生命周期
onMounted(async () => {
  try {
    await departmentStore.initData()
    loadData()
  } catch (error) {
    console.error('初始化部门数据失败:', error)
  }
})
</script>

<style scoped>
.sms-approval-container {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.search-section {
  margin-bottom: 20px;
  padding: 20px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.pagination-container {
  margin-top: 20px;
  text-align: right;
}

.detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.content-preview {
  padding: 10px;
  background-color: #f5f7fa;
  border-radius: 4px;
  white-space: pre-wrap;
}

.recipients-list {
  max-height: 150px;
  overflow-y: auto;
}

.approval-info {
  margin-top: 20px;
  padding-top: 20px;
  border-top: 1px solid #ebeef5;
}

.approval-info h4 {
  margin-bottom: 15px;
  color: #303133;
}

.dialog-footer {
  text-align: right;
}
</style>