<template>
  <div class="sms-send-records">
    <div class="page-header">
      <h2>短信发送记录</h2>
      <p>查看和管理所有短信发送历史记录</p>
    </div>

    <!-- 搜索和筛选区域 -->
    <div class="search-section">
      <el-form :model="searchForm" inline>
        <el-form-item label="模板名称">
          <el-input
            v-model="searchForm.templateName"
            placeholder="请输入模板名称"
            clearable
            style="width: 200px"
          />
        </el-form-item>
        <el-form-item label="发送状态">
          <el-select
            v-model="searchForm.status"
            placeholder="请选择状态"
            clearable
            style="width: 150px"
          >
            <el-option label="全部" value="" />
            <el-option label="发送成功" value="success" />
            <el-option label="发送失败" value="failed" />
            <el-option label="部分成功" value="partial" />
          </el-select>
        </el-form-item>
        <el-form-item label="发送时间">
          <el-date-picker
            v-model="searchForm.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch">
            <el-icon><Search /></el-icon>
            搜索
          </el-button>
          <el-button @click="handleReset">
            <el-icon><Refresh /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 操作按钮区域 -->
    <div class="action-section">
      <el-button type="primary" @click="showSendDialog = true">
        <el-icon><Message /></el-icon>
        发送短信
      </el-button>
      <el-button type="success" @click="handleExport">
        <el-icon><Download /></el-icon>
        导出记录
      </el-button>
      <el-button 
        type="danger" 
        :disabled="selectedRecords.length === 0"
        @click="handleBatchDelete"
      >
        <el-icon><Delete /></el-icon>
        批量删除
      </el-button>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-table
        :data="tableData"
        v-loading="loading"
        @selection-change="handleSelectionChange"
        stripe
        border
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="id" label="记录ID" width="80" />
        <el-table-column prop="templateName" label="模板名称" width="150" />
        <el-table-column prop="content" label="发送内容" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.content" placement="top">
              <span class="content-preview">
                {{ row.content.length > 50 ? row.content.substring(0, 50) + '...' : row.content }}
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="recipientCount" label="接收人数" width="100" align="center">
          <template #default="{ row }">
            <el-tag type="info">{{ row.recipients.length }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="发送结果" width="120" align="center">
          <template #default="{ row }">
            <div class="send-result">
              <div>
                <el-tag type="success" size="small">成功: {{ row.successCount }}</el-tag>
              </div>
              <div v-if="row.failCount > 0" style="margin-top: 4px">
                <el-tag type="danger" size="small">失败: {{ row.failCount }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="cost" label="费用(元)" width="100" align="center">
          <template #default="{ row }">
            <span class="cost-text">¥{{ row.cost.toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="operator" label="操作人" width="100" />
        <el-table-column prop="sendTime" label="发送时间" width="160" />
        <el-table-column label="操作" width="180" fixed="right">
          <template #default="{ row }">
            <el-button
              type="primary"
              size="small"
              @click="handleViewDetail(row)"
            >
              查看详情
            </el-button>
            <el-button
              type="warning"
              size="small"
              @click="handleResend(row)"
              :disabled="row.status === 'success'"
            >
              重新发送
            </el-button>
            <el-button
              type="danger"
              size="small"
              @click="handleDelete(row)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页 -->
    <div class="pagination-section">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :page-sizes="[10, 20, 50, 100]"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handleCurrentChange"
      />
    </div>

    <!-- 发送短信对话框 -->
    <el-dialog
      v-model="showSendDialog"
      title="发送短信"
      width="600px"
      :before-close="handleSendDialogClose"
    >
      <el-form :model="sendForm" :rules="sendRules" ref="sendFormRef" label-width="100px">
        <el-form-item label="选择模板" prop="templateId">
          <div class="template-select-wrapper">
            <el-select
              v-model="sendForm.templateId"
              placeholder="请选择短信模板"
              style="flex: 1"
              @change="handleTemplateChange"
            >
              <el-option
                v-for="template in templates"
                :key="template.id"
                :label="template.name"
                :value="template.id"
              />
            </el-select>
            <el-button 
              type="primary" 
              :icon="DocumentAdd" 
              @click="handleApplyTemplate"
              class="apply-template-btn"
              title="申请新模板"
            >
              申请模板
            </el-button>
          </div>
        </el-form-item>
        <el-form-item label="模板内容" v-if="selectedTemplate">
          <el-input
            :value="selectedTemplate.content"
            type="textarea"
            :rows="3"
            readonly
            style="width: 100%"
          />
        </el-form-item>
        <el-form-item label="接收人" prop="recipients">
          <el-input
            v-model="sendForm.recipients"
            type="textarea"
            :rows="4"
            placeholder="请输入手机号，多个号码用换行或逗号分隔"
            style="width: 100%"
          />
          <div class="form-tip">
            支持批量输入，每行一个手机号或用逗号分隔
          </div>
        </el-form-item>
        <el-form-item label="模板变量" v-if="templateVariables.length > 0">
          <div class="variables-section">
            <div
              v-for="variable in templateVariables"
              :key="variable"
              class="variable-item"
            >
              <label>{{ variable }}:</label>
              <el-input
                v-model="sendForm.variables[variable]"
                placeholder="请输入变量值"
                style="width: 200px; margin-left: 10px"
              />
            </div>
          </div>
        </el-form-item>
        <el-form-item label="预览内容" v-if="previewContent">
          <el-input
            :value="previewContent"
            type="textarea"
            :rows="3"
            readonly
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showSendDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSendSms" :loading="sendLoading">
          发送短信
        </el-button>
      </template>
    </el-dialog>

    <!-- 详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="发送记录详情"
      width="800px"
    >
      <div v-if="currentRecord" class="detail-content">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="记录ID">{{ currentRecord.id }}</el-descriptions-item>
          <el-descriptions-item label="模板名称">{{ currentRecord.templateName }}</el-descriptions-item>
          <el-descriptions-item label="发送状态">
            <el-tag :type="getStatusType(currentRecord.status)">
              {{ getStatusText(currentRecord.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="发送时间">{{ currentRecord.sendTime }}</el-descriptions-item>
          <el-descriptions-item label="操作人">{{ currentRecord.operator }}</el-descriptions-item>
          <el-descriptions-item label="费用">¥{{ currentRecord.cost.toFixed(2) }}</el-descriptions-item>
        </el-descriptions>
        
        <div class="detail-section">
          <h4>发送内容</h4>
          <el-input
            :value="currentRecord.content"
            type="textarea"
            :rows="4"
            readonly
          />
        </div>

        <div class="detail-section">
          <h4>接收人列表 ({{ currentRecord.recipients.length }}人)</h4>
          <div class="recipients-list">
            <el-tag
              v-for="(phone, index) in currentRecord.recipients"
              :key="index"
              class="recipient-tag"
              :type="index < currentRecord.successCount ? 'success' : 'danger'"
            >
              {{ phone }}
            </el-tag>
          </div>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, Message, Download, Delete, DocumentAdd } from '@element-plus/icons-vue'
import * as smsApi from '@/api/sms'
import type { SmsSendRecord, SmsSendSearchParams, SmsTemplate } from '@/api/sms'
import { useNotificationStore, MessageType } from '@/stores/notification'

// 通知store
const notificationStore = useNotificationStore()

// 响应式数据
const loading = ref(false)
const sendLoading = ref(false)
const tableData = ref<SmsSendRecord[]>([])
const selectedRecords = ref<SmsSendRecord[]>([])
const templates = ref<SmsTemplate[]>([])
const showSendDialog = ref(false)
const showDetailDialog = ref(false)
const currentRecord = ref<SmsSendRecord | null>(null)

// 搜索表单
const searchForm = reactive<SmsSendSearchParams>({
  templateName: '',
  status: '',
  dateRange: []
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 发送表单
const sendForm = reactive({
  templateId: null as number | null,
  recipients: '',
  variables: {} as Record<string, string>
})

const sendRules = {
  templateId: [{ required: true, message: '请选择短信模板', trigger: 'change' }],
  recipients: [{ required: true, message: '请输入接收人手机号', trigger: 'blur' }]
}

const sendFormRef = ref()

// 计算属性
const selectedTemplate = computed(() => {
  if (!sendForm.templateId) return null
  return templates.value.find(t => t.id === sendForm.templateId)
})

const templateVariables = computed(() => {
  if (!selectedTemplate.value) return []
  const content = selectedTemplate.value.content
  const matches = content.match(/\{(\w+)\}/g)
  return matches ? matches.map(match => match.slice(1, -1)) : []
})

const previewContent = computed(() => {
  if (!selectedTemplate.value) return ''
  let content = selectedTemplate.value.content
  Object.entries(sendForm.variables).forEach(([key, value]) => {
    content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
  })
  return content
})

// 方法
const loadData = async () => {
  loading.value = true
  try {
    const params = {
      ...searchForm,
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    const response = await smsApi.getSmsSendList(params)
    tableData.value = response.list
    pagination.total = response.total
  } catch (error) {
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadTemplates = async () => {
  try {
    const response = await smsApi.getSmsTemplateList({ status: 'active' })
    templates.value = response.list
  } catch (error) {
    ElMessage.error('加载模板失败')
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadData()
}

const handleReset = () => {
  Object.assign(searchForm, {
    templateName: '',
    status: '',
    dateRange: []
  })
  pagination.page = 1
  loadData()
}

const handleSelectionChange = (selection: SmsSendRecord[]) => {
  selectedRecords.value = selection
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadData()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadData()
}

const handleTemplateChange = () => {
  sendForm.variables = {}
  // 为模板变量设置默认值
  templateVariables.value.forEach(variable => {
    sendForm.variables[variable] = ''
  })
}

const handleSendSms = async () => {
  if (!sendFormRef.value) return
  
  try {
    await sendFormRef.value.validate()
    
    sendLoading.value = true
    
    // 解析接收人手机号
    const recipients = sendForm.recipients
      .split(/[,\n]/)
      .map(phone => phone.trim())
      .filter(phone => phone)
    
    if (recipients.length === 0) {
      ElMessage.error('请输入有效的手机号')
      return
    }
    
    // 验证手机号格式
    const phoneRegex = /^1[3-9]\d{9}$/
    const invalidPhones = recipients.filter(phone => !phoneRegex.test(phone))
    if (invalidPhones.length > 0) {
      ElMessage.error(`以下手机号格式不正确：${invalidPhones.join(', ')}`)
      return
    }
    
    const result = await smsApi.sendSms({
      templateId: sendForm.templateId!,
      recipients,
      variables: sendForm.variables
    })
    
    ElMessage.success('短信发送成功')
    
    // 发送成功通知
    const selectedTemplate = templates.value.find(t => t.id === sendForm.templateId)
    notificationStore.sendMessage(
      MessageType.SMS_SEND_SUCCESS,
      `短信发送成功！使用模板"${selectedTemplate?.name}"，成功发送给${recipients.length}个接收人。`,
      {
        relatedId: result.id,
        relatedType: 'sms_send',
        actionUrl: '/system/sms-send-records'
      }
    )
    
    showSendDialog.value = false
    loadData()
  } catch (error) {
    ElMessage.error('短信发送失败')
    
    // 发送失败通知
    const selectedTemplate = templates.value.find(t => t.id === sendForm.templateId)
    notificationStore.sendMessage(
      MessageType.SMS_SEND_FAILED,
      `短信发送失败！模板"${selectedTemplate?.name}"发送给${recipients.length}个接收人时出现错误，请检查配置后重试。`,
      {
        relatedId: sendForm.templateId,
        relatedType: 'sms_send',
        actionUrl: '/system/sms-send-records'
      }
    )
  } finally {
    sendLoading.value = false
  }
}

const handleSendDialogClose = () => {
  sendFormRef.value?.resetFields()
  Object.assign(sendForm, {
    templateId: null,
    recipients: '',
    variables: {}
  })
}

const handleApplyTemplate = () => {
  // 跳转到模板申请页面
  window.open('/system/sms-templates?action=apply', '_blank')
}

const handleViewDetail = (record: SmsSendRecord) => {
  currentRecord.value = record
  showDetailDialog.value = true
}

const handleResend = async (record: SmsSendRecord) => {
  try {
    await ElMessageBox.confirm('确定要重新发送这条短信吗？', '确认重发', {
      type: 'warning'
    })
    
    await smsApi.sendSms({
      templateId: record.templateId,
      recipients: record.recipients
    })
    
    ElMessage.success('重新发送成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('重新发送失败')
    }
  }
}

const handleDelete = async (record: SmsSendRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这条发送记录吗？', '确认删除', {
      type: 'warning'
    })
    
    // 这里应该调用删除API，暂时模拟
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条记录吗？`,
      '批量删除',
      { type: 'warning' }
    )
    
    // 这里应该调用批量删除API，暂时模拟
    ElMessage.success('批量删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const handleExport = () => {
  // 这里应该实现导出功能
  ElMessage.info('导出功能开发中...')
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    success: 'success',
    failed: 'danger',
    partial: 'warning'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    success: '发送成功',
    failed: '发送失败',
    partial: '部分成功'
  }
  return statusMap[status] || '未知状态'
}

// 生命周期
onMounted(() => {
  loadData()
  loadTemplates()
})
</script>

<style scoped>
.sms-send-records {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.search-section {
  background: #f8f9fa;
  padding: 20px;
  border-radius: 8px;
  margin-bottom: 20px;
}

.action-section {
  margin-bottom: 20px;
}

.table-section {
  margin-bottom: 20px;
}

.content-preview {
  cursor: pointer;
}

.send-result {
  line-height: 1.2;
}

.cost-text {
  font-weight: 500;
  color: #e6a23c;
}

.pagination-section {
  display: flex;
  justify-content: center;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.variables-section {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
}

.variable-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.variable-item:last-child {
  margin-bottom: 0;
}

.variable-item label {
  min-width: 80px;
  font-size: 14px;
  color: #606266;
}

.detail-content {
  max-height: 600px;
  overflow-y: auto;
}

.detail-section {
  margin-top: 20px;
}

.detail-section h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
}

.recipients-list {
  max-height: 200px;
  overflow-y: auto;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 12px;
  background: #fafafa;
}

/* 模板选择包装器样式 */
.template-select-wrapper {
  display: flex;
  gap: 12px;
  align-items: center;
}

.apply-template-btn {
  flex-shrink: 0;
  padding: 8px 16px;
  font-size: 14px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.apply-template-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.3);
}

.recipient-tag {
  margin: 4px 8px 4px 0;
}
</style>