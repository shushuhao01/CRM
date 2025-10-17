<template>
  <el-dialog
    v-model="visible"
    title="发送短信"
    width="700px"
    :before-close="handleClose"
    class="send-sms-dialog"
  >
    <el-form 
      :model="form" 
      :rules="rules" 
      ref="formRef" 
      label-width="100px"
      class="send-form"
    >
      <el-form-item label="选择模板" prop="templateId">
        <div class="template-select-wrapper">
          <el-select
            v-model="form.templateId"
            placeholder="请选择短信模板"
            style="flex: 1"
            @change="handleTemplateChange"
            filterable
          >
            <el-option
              v-for="template in templates"
              :key="template.id"
              :label="template.name"
              :value="template.id"
            >
              <div class="template-option">
                <div class="template-name">{{ template.name }}</div>
                <div class="template-category">{{ getCategoryText(template.category) }}</div>
              </div>
            </el-option>
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
        <div class="template-content-wrapper">
          <el-input
            :value="selectedTemplate.content"
            type="textarea"
            :rows="3"
            readonly
            class="template-content"
          />
          <div class="template-info">
            <el-tag size="small" type="info">{{ getCategoryText(selectedTemplate.category) }}</el-tag>
            <span class="template-usage">使用次数: {{ selectedTemplate.usage || 0 }}</span>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="接收人" prop="recipients">
        <div class="recipients-wrapper">
          <el-input
            v-model="form.recipients"
            type="textarea"
            :rows="4"
            placeholder="请输入手机号，多个号码用换行或逗号分隔&#10;支持格式：&#10;13800138001&#10;13800138002,13800138003&#10;张三:13800138001"
            class="recipients-input"
          />
          <div class="recipients-actions">
            <el-button 
              size="small" 
              :icon="Upload" 
              @click="handleImportRecipients"
            >
              导入联系人
            </el-button>
            <el-button 
              size="small" 
              :icon="User" 
              @click="handleSelectCustomers"
            >
              选择客户
            </el-button>
          </div>
        </div>
        <div class="form-tip">
          <el-icon><InfoFilled /></el-icon>
          支持批量输入，每行一个手机号或用逗号分隔，可包含姓名（格式：姓名:手机号）
        </div>
        <div class="recipients-count" v-if="recipientCount > 0">
          已输入 <span class="count-number">{{ recipientCount }}</span> 个接收人
        </div>
      </el-form-item>
      
      <el-form-item label="模板变量" v-if="templateVariables.length > 0">
        <div class="variables-section">
          <div class="variables-header">
            <span class="variables-title">请填写模板中的变量值：</span>
            <el-button 
              size="small" 
              type="primary" 
              link 
              @click="handleBatchFillVariables"
            >
              批量填充
            </el-button>
          </div>
          <div class="variables-list">
            <div
              v-for="variable in templateVariables"
              :key="variable"
              class="variable-item"
            >
              <label class="variable-label">{{ variable }}:</label>
              <el-input
                v-model="form.variables[variable]"
                :placeholder="`请输入${variable}的值`"
                class="variable-input"
              />
            </div>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="预览内容" v-if="previewContent">
        <div class="preview-wrapper">
          <el-input
            :value="previewContent"
            type="textarea"
            :rows="3"
            readonly
            class="preview-content"
          />
          <div class="preview-info">
            <span class="content-length">内容长度: {{ previewContent.length }} 字符</span>
            <span class="sms-count">预计短信条数: {{ Math.ceil(previewContent.length / 70) }}</span>
          </div>
        </div>
      </el-form-item>
      
      <el-form-item label="发送设置">
        <div class="send-settings">
          <el-checkbox v-model="form.sendImmediately">立即发送</el-checkbox>
          <el-date-picker
            v-if="!form.sendImmediately"
            v-model="form.scheduledTime"
            type="datetime"
            placeholder="选择发送时间"
            :disabled-date="disabledDate"
            :disabled-hours="disabledHours"
            style="margin-left: 20px"
          />
        </div>
      </el-form-item>
      
      <el-form-item label="备注说明">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="2"
          placeholder="可选：添加发送备注说明"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    
    <template #footer>
      <div class="dialog-footer">
        <div class="footer-info">
          <span class="cost-info">预计费用: ¥{{ estimatedCost.toFixed(2) }}</span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button 
            type="primary" 
            @click="handleSend" 
            :loading="sending"
            :disabled="!canSend"
          >
            {{ form.sendImmediately ? '立即发送' : '定时发送' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>
  
  <!-- 选择客户对话框 -->
  <el-dialog
    v-model="showCustomerDialog"
    title="选择客户"
    width="800px"
    class="customer-select-dialog"
  >
    <div class="customer-search">
      <el-input
        v-model="customerSearch"
        placeholder="搜索客户姓名或手机号"
        :prefix-icon="Search"
        clearable
        style="width: 300px"
      />
    </div>
    
    <el-table
      :data="filteredCustomers"
      @selection-change="handleCustomerSelection"
      max-height="400"
      style="margin-top: 20px"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="客户姓名" width="120" />
      <el-table-column prop="phone" label="手机号" width="140" />
      <el-table-column prop="company" label="公司" />
      <el-table-column prop="tags" label="标签" width="150">
        <template #default="{ row }">
          <el-tag 
            v-for="tag in row.tags?.slice(0, 2)" 
            :key="tag"
            size="small"
            style="margin-right: 5px"
          >
            {{ tag }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>
    
    <template #footer>
      <el-button @click="showCustomerDialog = false">取消</el-button>
      <el-button 
        type="primary" 
        @click="handleConfirmCustomers"
        :disabled="selectedCustomers.length === 0"
      >
        确定选择 ({{ selectedCustomers.length }})
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import { 
  DocumentAdd, 
  Upload, 
  User, 
  Search, 
  InfoFilled 
} from '@element-plus/icons-vue'

interface SmsTemplate {
  id: string
  name: string
  category: string
  content: string
}

interface Customer {
  id: string
  name: string
  phone: string
  company?: string
}

interface Props {
  modelValue: boolean
  templates?: SmsTemplate[]
  customers?: Customer[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'send', data: { templateId: string; recipients: string; content: string; variables: Record<string, string> }): void
  (e: 'apply-template'): void
}

const props = withDefaults(defineProps<Props>(), {
  templates: () => [],
  customers: () => []
})

const emit = defineEmits<Emits>()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const formRef = ref()
const visible = ref(false)
const sending = ref(false)
const showCustomerDialog = ref(false)
const customerSearch = ref('')
const selectedCustomers = ref<Customer[]>([])

// 表单数据
const form = ref({
  templateId: '',
  recipients: '',
  variables: {} as Record<string, string>,
  sendImmediately: true,
  scheduledTime: null,
  remark: ''
})

// 表单验证规则
const rules = {
  templateId: [
    { required: true, message: '请选择短信模板', trigger: 'change' }
  ],
  recipients: [
    { required: true, message: '请输入接收人手机号', trigger: 'blur' },
    { 
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!value) {
          callback(new Error('请输入接收人手机号'))
          return
        }
        
        const phones = parseRecipients(value)
        if (phones.length === 0) {
          callback(new Error('请输入有效的手机号'))
          return
        }
        
        const invalidPhones = phones.filter(phone => !isValidPhone(phone.phone))
        if (invalidPhones.length > 0) {
          callback(new Error(`以下手机号格式不正确: ${invalidPhones.map(p => p.phone).join(', ')}`))
          return
        }
        
        callback()
      }, 
      trigger: 'blur' 
    }
  ]
}

// 计算属性
const selectedTemplate = computed(() => {
  if (!form.value.templateId) return null
  return props.templates.find(t => t.id === form.value.templateId)
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
  Object.entries(form.value.variables).forEach(([key, value]) => {
    if (value) {
      content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), value)
    }
  })
  return content
})

const recipientCount = computed(() => {
  if (!form.value.recipients) return 0
  return parseRecipients(form.value.recipients).length
})

const estimatedCost = computed(() => {
  const count = recipientCount.value
  const smsCount = Math.ceil((previewContent.value?.length || 0) / 70)
  return count * smsCount * 0.1 // 假设每条短信0.1元
})

const canSend = computed(() => {
  return form.value.templateId && 
         form.value.recipients && 
         recipientCount.value > 0 &&
         templateVariables.value.every(v => form.value.variables[v])
})

const filteredCustomers = computed(() => {
  if (!customerSearch.value) return props.customers
  return props.customers.filter(customer => 
    customer.name.includes(customerSearch.value) ||
    customer.phone.includes(customerSearch.value)
  )
})

// 监听器
watch(() => props.modelValue, (val) => {
  visible.value = val
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    resetForm()
  }
})

watch(() => templateVariables.value, (newVars) => {
  // 重置变量值
  form.value.variables = {}
  newVars.forEach(variable => {
    form.value.variables[variable] = ''
  })
}, { immediate: true })

// 方法
const parseRecipients = (text: string) => {
  if (!text) return []
  
  const lines = text.split(/[\n,，]/).filter(line => line.trim())
  const recipients: Array<{name?: string, phone: string}> = []
  
  lines.forEach(line => {
    line = line.trim()
    if (line.includes(':') || line.includes('：')) {
      const [name, phone] = line.split(/[:：]/)
      if (phone && phone.trim()) {
        recipients.push({ name: name.trim(), phone: phone.trim() })
      }
    } else if (line) {
      recipients.push({ phone: line })
    }
  })
  
  return recipients
}

const isValidPhone = (phone: string) => {
  return /^1[3-9]\d{9}$/.test(phone)
}

const getCategoryText = (category: string) => {
  const categoryMap: Record<string, string> = {
    order: '订单通知',
    logistics: '物流通知',
    marketing: '营销推广',
    service: '客服通知',
    system: '系统通知'
  }
  return categoryMap[category] || category
}

const handleTemplateChange = () => {
  // 模板变化时重置变量
  form.value.variables = {}
  templateVariables.value.forEach(variable => {
    form.value.variables[variable] = ''
  })
}

const handleApplyTemplate = () => {
  emit('apply-template')
  safeNavigator.push('/system/sms-templates')
}

const handleImportRecipients = () => {
  ElMessage.info('导入联系人功能开发中')
}

const handleSelectCustomers = () => {
  showCustomerDialog.value = true
}

const handleCustomerSelection = (selection: Customer[]) => {
  selectedCustomers.value = selection
}

const handleConfirmCustomers = () => {
  const customerRecipients = selectedCustomers.value.map(customer => 
    `${customer.name}:${customer.phone}`
  ).join('\n')
  
  if (form.value.recipients) {
    form.value.recipients += '\n' + customerRecipients
  } else {
    form.value.recipients = customerRecipients
  }
  
  showCustomerDialog.value = false
  selectedCustomers.value = []
  ElMessage.success(`已添加 ${selectedCustomers.value.length} 个客户`)
}

const handleBatchFillVariables = () => {
  ElMessage.info('批量填充变量功能开发中')
}

const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

const disabledHours = () => {
  const now = new Date()
  const hours = []
  for (let i = 0; i < now.getHours(); i++) {
    hours.push(i)
  }
  return hours
}

const handleSend = async () => {
  try {
    await formRef.value?.validate()
    
    const recipients = parseRecipients(form.value.recipients)
    const sendData = {
      templateId: form.value.templateId,
      template: selectedTemplate.value,
      recipients,
      variables: form.value.variables,
      content: previewContent.value,
      sendImmediately: form.value.sendImmediately,
      scheduledTime: form.value.scheduledTime,
      remark: form.value.remark,
      estimatedCost: estimatedCost.value
    }
    
    sending.value = true
    
    // 模拟发送延迟
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    emit('send', sendData)
    ElMessage.success(form.value.sendImmediately ? '短信发送成功' : '定时发送任务已创建')
    
    handleClose()
  } catch (error) {
    console.error('发送失败:', error)
  } finally {
    sending.value = false
  }
}

const handleClose = () => {
  visible.value = false
}

const resetForm = () => {
  form.value = {
    templateId: '',
    recipients: '',
    variables: {},
    sendImmediately: true,
    scheduledTime: null,
    remark: ''
  }
  formRef.value?.resetFields()
}

// 暴露方法给父组件
defineExpose({
  resetForm
})
</script>

<style scoped>
.send-sms-dialog {
  .send-form {
    max-height: 70vh;
    overflow-y: auto;
  }
}

.template-select-wrapper {
  display: flex;
  gap: 10px;
  align-items: center;
}

.apply-template-btn {
  flex-shrink: 0;
}

.template-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-name {
  font-weight: 500;
}

.template-category {
  font-size: 12px;
  color: #909399;
}

.template-content-wrapper {
  .template-content {
    margin-bottom: 10px;
  }
  
  .template-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #909399;
  }
}

.recipients-wrapper {
  .recipients-input {
    margin-bottom: 10px;
  }
  
  .recipients-actions {
    display: flex;
    gap: 10px;
  }
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.recipients-count {
  margin-top: 10px;
  font-size: 14px;
  color: #409eff;
  
  .count-number {
    font-weight: bold;
    font-size: 16px;
  }
}

.variables-section {
  .variables-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
  }
  
  .variables-title {
    font-weight: 500;
    color: #303133;
  }
  
  .variables-list {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
    gap: 15px;
  }
  
  .variable-item {
    display: flex;
    align-items: center;
    gap: 10px;
  }
  
  .variable-label {
    min-width: 80px;
    font-weight: 500;
    color: #606266;
  }
  
  .variable-input {
    flex: 1;
  }
}

.preview-wrapper {
  .preview-content {
    margin-bottom: 10px;
  }
  
  .preview-info {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
  }
}

.send-settings {
  display: flex;
  align-items: center;
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  .cost-info {
    font-size: 14px;
    color: #e6a23c;
    font-weight: 500;
  }
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.customer-select-dialog {
  .customer-search {
    margin-bottom: 20px;
  }
}
</style>