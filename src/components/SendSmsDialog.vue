<template>
  <el-dialog
    v-model="visible"
    title=""
    width="780px"
    :before-close="handleClose"
    class="send-sms-dialog"
    destroy-on-close
  >
    <!-- 自定义标题 -->
    <template #header>
      <div class="dialog-header">
        <div class="header-title-row">
          <el-icon :size="22" color="#409eff"><Promotion /></el-icon>
          <span class="header-title">发送短信</span>
        </div>
        <div class="header-steps">
          <div
            v-for="(step, idx) in steps"
            :key="idx"
            class="step-item"
            :class="{ active: currentStep === idx, done: currentStep > idx }"
          >
            <span class="step-num">{{ currentStep > idx ? '✓' : idx + 1 }}</span>
            <span class="step-label">{{ step }}</span>
          </div>
        </div>
      </div>
    </template>

    <!-- ============ 步骤1: 选择模板 ============ -->
    <div v-show="currentStep === 0" class="step-content">
      <div class="section-title">选择短信模板</div>
      <div class="template-toolbar">
        <el-input
          v-model="templateKeyword"
          placeholder="搜索模板名称"
          :prefix-icon="Search"
          clearable
          style="width: 260px"
        />
        <el-button type="primary" text :icon="EditPen" @click="handleApplyTemplate">
          申请新模板
        </el-button>
      </div>
      <div class="template-grid">
        <div
          v-for="tpl in filteredTemplates"
          :key="tpl.id"
          class="tpl-card"
          :class="{ selected: form.templateId === tpl.id }"
          @click="selectTemplate(tpl)"
        >
          <div class="tpl-card-header">
            <span class="tpl-name">{{ tpl.name }}</span>
            <el-tag size="small" type="info">{{ getCategoryText(tpl.category) }}</el-tag>
          </div>
          <div class="tpl-card-body">{{ tpl.content }}</div>
          <div class="tpl-card-footer">
            <span class="tpl-usage">已使用 {{ tpl.usage || 0 }} 次</span>
            <el-icon v-if="form.templateId === tpl.id" color="#409eff"><CircleCheck /></el-icon>
          </div>
        </div>
        <el-empty v-if="filteredTemplates.length === 0" description="暂无可用模板" :image-size="80" />
      </div>
    </div>

    <!-- ============ 步骤2: 填写信息 ============ -->
    <div v-show="currentStep === 1" class="step-content">
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top" class="info-form">
        <!-- 模板预览卡 -->
        <div class="selected-tpl-card" v-if="selectedTemplate">
          <div class="stpl-header">
            <span class="stpl-name">{{ selectedTemplate.name }}</span>
            <el-button type="primary" link size="small" @click="currentStep = 0">更换模板</el-button>
          </div>
          <div class="stpl-content">{{ selectedTemplate.content }}</div>
        </div>

        <!-- 接收人 -->
        <el-form-item label="接收人" prop="recipients">
          <div class="recipients-box">
            <el-input
              v-model="form.recipients"
              type="textarea"
              :rows="4"
              placeholder="请输入手机号，每行一个或用逗号分隔&#10;可带姓名，格式：张三:13800138001"
              class="recipients-textarea"
            />
            <div class="recipients-bar">
              <el-button size="small" :icon="User" @click="handleSelectCustomers">选择客户</el-button>
              <el-button size="small" :icon="Upload" @click="handleImportRecipients">导入</el-button>
              <el-button
                v-if="selectedTemplate && confirmedCustomerList.length > 0"
                type="primary"
                size="small"
                :icon="MagicStick"
                @click="handleAutoMatchAll"
              >自动匹配变量</el-button>
              <span v-if="recipientCount > 0" class="recipient-badge">
                共 <b>{{ recipientCount }}</b> 人
              </span>
            </div>
          </div>
        </el-form-item>

        <!-- 模板变量（区分系统客户/手动填写） -->
        <el-form-item v-if="templateVariables.length > 0" label="填写模板变量">
          <!-- 多客户时显示客户切换器 -->
          <div v-if="confirmedCustomerList.length > 1" class="var-customer-switcher">
            <el-button :icon="ArrowLeft" circle size="small" :disabled="varPreviewIdx <= 0" @click="varPreviewIdx--" />
            <span class="var-customer-name">
              {{ confirmedCustomerList[varPreviewIdx]?.name || '客户' }}
              <span class="var-customer-phone">{{ maskPhoneLocal(confirmedCustomerList[varPreviewIdx]?.phone || '') }}</span>
              <el-tag size="small" type="info" style="margin-left: 6px;">{{ varPreviewIdx + 1 }}/{{ confirmedCustomerList.length }}</el-tag>
            </span>
            <el-button :icon="ArrowRight" circle size="small" :disabled="varPreviewIdx >= confirmedCustomerList.length - 1" @click="varPreviewIdx++" />
          </div>
          <div class="var-grid">
            <div v-for="v in templateVariables" :key="v" class="var-row">
              <span class="var-name">{{"{"}}{{ v }}{{"}"}}</span>
              <el-input
                v-model="form.variables[v]"
                :placeholder="getVarPlaceholder(v)"
                class="var-input"
                clearable
              />
              <el-tag v-if="form.variables[v] && isVarAutoFilled(v)" size="small" type="success" effect="plain" class="var-auto-tag">自动</el-tag>
            </div>
          </div>
          <div v-if="confirmedCustomerList.length > 1" class="var-tip">
            <el-icon><InfoFilled /></el-icon>
            提示：多个客户时，变量按当前预览客户填充，发送时会逐客户自动匹配。
          </div>
        </el-form-item>

        <!-- 发送方式 -->
        <el-form-item label="发送方式">
          <div class="send-mode">
            <el-radio-group v-model="form.sendImmediately">
              <el-radio :label="true">立即发送</el-radio>
              <el-radio :label="false">定时发送</el-radio>
            </el-radio-group>
            <el-date-picker
              v-if="!form.sendImmediately"
              v-model="form.scheduledTime"
              type="datetime"
              placeholder="选择发送时间"
              :disabled-date="disabledDate"
              style="margin-left: 12px"
            />
          </div>
        </el-form-item>

        <!-- 备注 -->
        <el-form-item label="备注说明（可选）">
          <el-input
            v-model="form.remark"
            type="textarea"
            :rows="2"
            placeholder="填写发送备注"
            maxlength="200"
            show-word-limit
          />
        </el-form-item>
      </el-form>
    </div>

    <!-- ============ 步骤3: 预览确认 ============ -->
    <div v-show="currentStep === 2" class="step-content">
      <div class="section-title">发送确认</div>
      <div class="confirm-card">
        <el-descriptions :column="2" border size="default">
          <el-descriptions-item label="短信模板">{{ selectedTemplate?.name || '-' }}</el-descriptions-item>
          <el-descriptions-item label="模板类型">{{ getCategoryText(selectedTemplate?.category || '') }}</el-descriptions-item>
          <el-descriptions-item label="接收人数">
            <span class="highlight">{{ recipientCount }}</span> 人
          </el-descriptions-item>
          <el-descriptions-item label="预计条数">
            <span class="highlight">{{ smsPageCount }}</span> 条/人
          </el-descriptions-item>
          <el-descriptions-item label="发送方式" :span="2">
            {{ form.sendImmediately ? '立即发送' : `定时发送 (${formatScheduledTime})` }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 预览区域 - 支持客户切换 -->
        <div class="preview-block">
          <div class="preview-header">
            <span class="preview-label">短信内容预览：</span>
            <div v-if="confirmedCustomerList.length > 1" class="preview-switcher">
              <el-button :icon="ArrowLeft" text size="small" :disabled="previewCustomerIdx <= 0" @click="switchPreviewCustomer(-1)">上一位</el-button>
              <span class="preview-customer-info">
                {{ confirmedCustomerList[previewCustomerIdx]?.name || '客户' }}
                ({{ maskPhoneLocal(confirmedCustomerList[previewCustomerIdx]?.phone || '') }})
                <el-tag size="small" type="info">{{ previewCustomerIdx + 1 }}/{{ confirmedCustomerList.length }}</el-tag>
              </span>
              <el-button :icon="ArrowRight" text size="small" :disabled="previewCustomerIdx >= confirmedCustomerList.length - 1" @click="switchPreviewCustomer(1)">下一位</el-button>
            </div>
          </div>
          <div class="preview-bubble">{{ currentPreviewContent || selectedTemplate?.content || '-' }}</div>
          <div class="preview-meta">
            <span>内容长度: {{ (currentPreviewContent || '').length }} 字符</span>
            <span>预计 {{ smsPageCount }} 条短信</span>
          </div>
        </div>
        <div class="cost-row">
          <span class="cost-label">预计费用：</span>
          <span class="cost-value">¥{{ estimatedCost.toFixed(2) }}</span>
          <span class="cost-tip">（单价 ¥0.10/条）</span>
        </div>
      </div>
    </div>

    <!-- ============ Footer ============ -->
    <template #footer>
      <div class="dialog-footer-v2">
        <el-button v-if="currentStep > 0" @click="currentStep--">上一步</el-button>
        <div style="flex:1"></div>
        <el-button @click="handleClose">取消</el-button>
        <el-button
          v-if="currentStep < 2"
          type="primary"
          :disabled="!canGoNext"
          @click="handleNext"
        >
          下一步
        </el-button>
        <el-button
          v-else
          type="success"
          :loading="sending"
          :disabled="!canSend"
          @click="handleSend"
        >
          {{ form.sendImmediately ? '确认发送' : '确认定时发送' }}
        </el-button>
      </div>
    </template>
  </el-dialog>

  <!-- 选择客户子对话框 -->
  <el-dialog
    v-model="showCustomerDialog"
    title="选择客户"
    width="800px"
    append-to-body
    class="customer-select-dialog"
  >
    <div class="customer-search">
      <el-input
        v-model="customerSearch"
        placeholder="搜索客户姓名或手机号"
        :prefix-icon="Search"
        clearable
        style="width: 300px"
        @input="debouncedSearchCustomers"
      />
      <span v-if="customerTotal > 0" style="margin-left: 12px; color: #909399; font-size: 13px;">
        共 {{ customerTotal }} 位客户
      </span>
    </div>
    <el-table
      :data="apiCustomers"
      @selection-change="handleCustomerSelection"
      max-height="400"
      style="margin-top: 16px"
      v-loading="loadingCustomers"
    >
      <el-table-column type="selection" width="55" />
      <el-table-column prop="name" label="客户姓名" width="120" />
      <el-table-column label="手机号" width="140">
        <template #default="{ row }">
          <span>{{ maskPhoneLocal(row.phone || '') }}</span>
        </template>
      </el-table-column>
      <el-table-column prop="company" label="公司" />
      <el-table-column prop="tags" label="标签" width="150">
        <template #default="{ row }">
          <el-tag
            v-for="tag in row.tags?.slice(0, 2)"
            :key="tag"
            size="small"
            style="margin-right: 5px"
          >{{ typeof tag === 'string' ? tag : tag.name }}</el-tag>
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
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Promotion,
  Search,
  EditPen,
  CircleCheck,
  User,
  Upload,
  MagicStick,
  ArrowLeft,
  ArrowRight,
  InfoFilled
} from '@element-plus/icons-vue'
import { autoMatchVariables } from '@/utils/smsVariableMatcher'
import { searchSmsCustomers } from '@/api/sms'

// ============ 类型 ============
interface SmsTemplate {
  id: string | number
  name: string
  category: string
  content: string
  variables?: string[]
  usage?: number
  [key: string]: unknown
}

interface Customer {
  id: string
  name: string
  phone: string
  company?: string
  tags?: string[]
  gender?: string
  email?: string
  customerNo?: string
  address?: string
  level?: string
  [key: string]: unknown
}

interface Props {
  modelValue: boolean
  templates?: SmsTemplate[]
  customers?: Customer[]
  /** 预设的单个客户（从客户详情页传入） */
  presetCustomer?: Customer | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'send', data: Record<string, unknown>): void
  (e: 'submit', data: Record<string, unknown>): void
  (e: 'apply-template'): void
}

const props = withDefaults(defineProps<Props>(), {
  templates: () => [],
  customers: () => [],
  presetCustomer: null
})

const emit = defineEmits<Emits>()

// ============ 步骤 ============
const steps = ['选择模板', '填写信息', '预览确认']
const currentStep = ref(0)

// ============ 响应式数据 ============
const formRef = ref()
const visible = ref(false)
const sending = ref(false)
const templateKeyword = ref('')
const showCustomerDialog = ref(false)
const customerSearch = ref('')
const selectedCustomers = ref<Customer[]>([])
/** 已确认选择的客户列表（用于变量匹配和预览切换） */
const confirmedCustomerList = ref<Customer[]>([])
const apiCustomers = ref<Customer[]>([])
const customerTotal = ref(0)
const loadingCustomers = ref(false)
/** 变量填写区域 当前预览客户索引 */
const varPreviewIdx = ref(0)
/** 步骤3 预览区域 当前客户索引 */
const previewCustomerIdx = ref(0)
/** 记录哪些变量是自动填充的 */
const autoFilledVars = ref<Set<string>>(new Set())
let searchDebounceTimer: ReturnType<typeof setTimeout> | null = null

const form = ref({
  templateId: '' as string | number,
  recipients: '',
  variables: {} as Record<string, string>,
  sendImmediately: true,
  scheduledTime: null as Date | null,
  remark: ''
})

// 表单验证
const rules = {
  recipients: [
    { required: true, message: '请输入接收人手机号', trigger: 'blur' },
    {
      validator: (_rule: unknown, value: string, callback: (error?: Error) => void) => {
        if (!value) { callback(new Error('请输入接收人手机号')); return }
        const phones = parseRecipients(value)
        if (phones.length === 0) { callback(new Error('请输入有效的手机号')); return }
        const invalid = phones.filter(p => !isValidPhone(p.phone))
        if (invalid.length > 0) {
          callback(new Error(`手机号格式不正确: ${invalid.map(p => p.phone).join(', ')}`))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ]
}

// ============ 计算属性 ============
const filteredTemplates = computed(() => {
  if (!templateKeyword.value) return props.templates
  const kw = templateKeyword.value.toLowerCase()
  return props.templates.filter(t =>
    t.name.toLowerCase().includes(kw) || t.content.toLowerCase().includes(kw)
  )
})

const selectedTemplate = computed(() => {
  if (!form.value.templateId) return null
  return props.templates.find(t => t.id === form.value.templateId) || null
})

const templateVariables = computed(() => {
  if (!selectedTemplate.value) return []
  const matches = selectedTemplate.value.content.match(/\{(\w+)\}/g)
  return matches ? [...new Set(matches.map(m => m.slice(1, -1)))] : []
})

const previewContent = computed(() => {
  if (!selectedTemplate.value) return ''
  let content = selectedTemplate.value.content
  Object.entries(form.value.variables).forEach(([key, val]) => {
    if (val) content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
  })
  return content
})

/** 步骤3预览：根据当前切换的客户生成预览内容 */
const currentPreviewContent = computed(() => {
  if (!selectedTemplate.value) return ''
  const customer = confirmedCustomerList.value[previewCustomerIdx.value]
  if (!customer) return previewContent.value
  const matched = autoMatchVariables(selectedTemplate.value.content, customer as any)
  let content = selectedTemplate.value.content
  // 先用自动匹配的值替换，再用手动填的覆盖
  const merged = { ...matched, ...form.value.variables }
  Object.entries(merged).forEach(([key, val]) => {
    if (val) content = content.replace(new RegExp(`\\{${key}\\}`, 'g'), val)
  })
  return content
})

const recipientCount = computed(() => {
  if (!form.value.recipients) return 0
  return parseRecipients(form.value.recipients).length
})

const smsPageCount = computed(() => {
  const len = (previewContent.value || '').length
  return len > 0 ? Math.ceil(len / 70) : 1
})

const estimatedCost = computed(() => {
  return recipientCount.value * smsPageCount.value * 0.1
})

const canGoNext = computed(() => {
  if (currentStep.value === 0) return !!form.value.templateId
  if (currentStep.value === 1) {
    return form.value.recipients.trim().length > 0 &&
      templateVariables.value.every(v => !!form.value.variables[v])
  }
  return true
})

const canSend = computed(() => {
  return !!form.value.templateId &&
    recipientCount.value > 0 &&
    templateVariables.value.every(v => !!form.value.variables[v])
})

const formatScheduledTime = computed(() => {
  if (!form.value.scheduledTime) return '-'
  return new Date(form.value.scheduledTime).toLocaleString()
})

// ============ 监听 ============
watch(() => props.modelValue, (val) => { visible.value = val })
watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) { resetForm() }
  if (val) {
    // 如果有预设客户（从客户详情页进入），自动填充接收人
    if (props.presetCustomer && props.presetCustomer.phone) {
      const c = props.presetCustomer
      form.value.recipients = `${c.name || ''}:${c.phone}`
      confirmedCustomerList.value = [c]
    }
  }
})
watch(templateVariables, (vars) => {
  const newVars: Record<string, string> = {}
  vars.forEach(v => { newVars[v] = form.value.variables[v] || '' })
  form.value.variables = newVars
})
// 切换预览客户时自动重新匹配变量
watch(varPreviewIdx, (idx) => {
  const customer = confirmedCustomerList.value[idx]
  if (customer && selectedTemplate.value) {
    const matched = autoMatchVariables(selectedTemplate.value.content, customer as any)
    const newVars: Record<string, string> = {}
    const newAutoFilled = new Set<string>()
    templateVariables.value.forEach(v => {
      if (matched[v]) {
        newVars[v] = matched[v]
        newAutoFilled.add(v)
      } else {
        newVars[v] = ''
      }
    })
    form.value.variables = newVars
    autoFilledVars.value = newAutoFilled
  }
})

// ============ 方法 ============
/** 手机号脱敏 */
const maskPhoneLocal = (phone: string) => {
  if (!phone || phone.length < 7) return phone
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/** 判断变量是否为自动填充的 */
const isVarAutoFilled = (varName: string) => autoFilledVars.value.has(varName)

/** 获取变量的占位提示 */
const getVarPlaceholder = (varName: string) => {
  const hints: Record<string, string> = {
    customerName: '如：张先生',
    phone: '如：13800138001',
    orderNo: '如：ORD20260411001',
    amount: '如：299.00',
    productName: '如：商品A',
    trackingNo: '如：SF1234567890',
    companyName: '如：XX科技',
    deliveryDate: '如：2026-04-15',
    expressCompany: '如：顺丰速运'
  }
  return hints[varName] || `请输入 ${varName}`
}

/** 一键自动匹配全部变量 */
const handleAutoMatchAll = () => {
  if (!selectedTemplate.value) return
  const customer = confirmedCustomerList.value[varPreviewIdx.value] || props.presetCustomer
  if (!customer) {
    ElMessage.warning('请先选择客户')
    return
  }
  const matched = autoMatchVariables(selectedTemplate.value.content, customer as any)
  const newVars: Record<string, string> = { ...form.value.variables }
  const newAutoFilled = new Set(autoFilledVars.value)
  Object.entries(matched).forEach(([k, v]) => {
    if (v) {
      newVars[k] = v
      newAutoFilled.add(k)
    }
  })
  form.value.variables = newVars
  autoFilledVars.value = newAutoFilled
  ElMessage.success('已自动匹配变量')
}

/** 步骤3切换预览客户 */
const switchPreviewCustomer = (dir: number) => {
  const newIdx = previewCustomerIdx.value + dir
  if (newIdx >= 0 && newIdx < confirmedCustomerList.value.length) {
    previewCustomerIdx.value = newIdx
  }
}

const selectTemplate = (tpl: SmsTemplate) => {
  form.value.templateId = tpl.id
  // 🔥 自动匹配变量
  autoFillVariables(tpl)
}

/**
 * 🔥 自动填充模板变量
 * 根据当前选中的客户数据自动匹配变量值
 */
const autoFillVariables = (tpl: SmsTemplate) => {
  if (!tpl || !tpl.content) return

  // 确定客户数据来源：预设客户 > 已选择客户列表中的第一个
  let customer: Customer | null = props.presetCustomer || null
  if (!customer) {
    // 从已输入的接收人中解析
    const recipients = parseRecipients(form.value.recipients)
    if (recipients.length === 1) {
      // 单个客户时尝试从已选客户中查找
      const found = selectedCustomers.value.find(c => c.phone === recipients[0].phone)
      if (found) customer = found
    }
  }

  // 使用自动匹配工具
  const matched = autoMatchVariables(tpl.content, (customer || undefined) as any)

  // 合并到表单变量（不覆盖已有的手动输入值）
  const vars = tpl.content.match(/\{(\w+)\}/g)
  if (vars) {
    const varNames = [...new Set(vars.map(m => m.slice(1, -1)))]
    const newVariables: Record<string, string> = {}
    varNames.forEach(v => {
      // 如果已有值，保留；否则使用自动匹配的值
      newVariables[v] = form.value.variables[v] || matched[v] || ''
    })
    form.value.variables = newVariables
  }
}

const parseRecipients = (text: string) => {
  if (!text) return []
  const lines = text.split(/[\n,，]/).filter(l => l.trim())
  const result: Array<{ name?: string; phone: string }> = []
  lines.forEach(l => {
    l = l.trim()
    if (l.includes(':') || l.includes('：')) {
      const [name, phone] = l.split(/[:：]/)
      if (phone?.trim()) result.push({ name: name.trim(), phone: phone.trim() })
    } else if (l) {
      result.push({ phone: l })
    }
  })
  return result
}

const isValidPhone = (phone: string) => /^1[3-9]\d{9}$/.test(phone)

const getCategoryText = (category: string) => {
  const map: Record<string, string> = {
    order: '订单通知', logistics: '物流通知', marketing: '营销推广',
    service: '客服通知', system: '系统通知', verification: '验证码',
    notification: '业务通知', reminder: '提醒通知', general: '通用'
  }
  return map[category] || category || '-'
}

const handleNext = async () => {
  if (currentStep.value === 1) {
    try {
      await formRef.value?.validate()
    } catch { return }
  }
  if (currentStep.value < 2) currentStep.value++
}

const handleSend = async () => {
  sending.value = true
  try {
    const sendData = {
      templateId: form.value.templateId,
      template: selectedTemplate.value,
      recipients: parseRecipients(form.value.recipients),
      variables: form.value.variables,
      content: previewContent.value,
      sendImmediately: form.value.sendImmediately,
      scheduledTime: form.value.scheduledTime,
      remark: form.value.remark,
      estimatedCost: estimatedCost.value
    }
    emit('send', sendData)
    emit('submit', sendData)
    ElMessage.success(form.value.sendImmediately ? '短信发送成功' : '定时发送任务已创建')
    handleClose()
  } catch (e) {
    console.error('发送失败:', e)
  } finally {
    sending.value = false
  }
}

const handleClose = () => { visible.value = false }

const handleApplyTemplate = () => { emit('apply-template') }
const handleImportRecipients = () => { ElMessage.info('导入联系人功能开发中') }
const handleSelectCustomers = () => {
  showCustomerDialog.value = true
  // 🔥 打开时自动加载客户列表
  loadCustomersFromApi('')
}

const handleCustomerSelection = (sel: Customer[]) => { selectedCustomers.value = sel }

const handleConfirmCustomers = () => {
  const count = selectedCustomers.value.length
  // 构建接收人文本（显示脱敏手机号供参考，实际发送使用真实号码）
  const lines = selectedCustomers.value.map(c => `${c.name}:${c.phone}`).join('\n')
  form.value.recipients = form.value.recipients
    ? form.value.recipients + '\n' + lines
    : lines

  // 记录已确认的完整客户对象列表（用于变量匹配和预览切换）
  confirmedCustomerList.value = [
    ...confirmedCustomerList.value,
    ...selectedCustomers.value
  ]
  varPreviewIdx.value = 0
  previewCustomerIdx.value = 0
  showCustomerDialog.value = false

  // 🔥 自动匹配变量（使用第一个客户的信息）
  if (selectedTemplate.value && confirmedCustomerList.value.length > 0) {
    const customer = confirmedCustomerList.value[0]
    const matched = autoMatchVariables(selectedTemplate.value.content, customer as any)
    const newVars: Record<string, string> = { ...form.value.variables }
    const newAutoFilled = new Set(autoFilledVars.value)
    Object.entries(matched).forEach(([k, v]) => {
      if (v && !newVars[k]) {
        newVars[k] = v
        newAutoFilled.add(k)
      }
    })
    form.value.variables = newVars
    autoFilledVars.value = newAutoFilled
  }

  selectedCustomers.value = []
  ElMessage.success(`已添加 ${count} 个客户`)
}

/**
 * 🔥 从后端API加载客户列表（按数据范围过滤）
 */
const loadCustomersFromApi = async (keyword: string) => {
  loadingCustomers.value = true
  try {
    const res = await searchSmsCustomers({ keyword, page: 1, pageSize: 50 }) as any
    if (res?.success && res.data?.list) {
      apiCustomers.value = res.data.list
      customerTotal.value = res.data.total || 0
    } else if (res?.data?.list) {
      apiCustomers.value = res.data.list
      customerTotal.value = res.data.total || 0
    }
  } catch (err) {
    console.warn('加载客户列表失败:', err)
    // fallback to prop customers
    apiCustomers.value = props.customers as Customer[]
    customerTotal.value = props.customers.length
  } finally {
    loadingCustomers.value = false
  }
}

const debouncedSearchCustomers = () => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer)
  searchDebounceTimer = setTimeout(() => {
    loadCustomersFromApi(customerSearch.value)
  }, 300)
}

const disabledDate = (time: Date) => time.getTime() < Date.now() - 86400000

const resetForm = () => {
  currentStep.value = 0
  templateKeyword.value = ''
  varPreviewIdx.value = 0
  previewCustomerIdx.value = 0
  confirmedCustomerList.value = []
  autoFilledVars.value = new Set()
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

defineExpose({ resetForm })
</script>

<style scoped>
/* ====== Dialog Header ====== */
.dialog-header {
  display: flex;
  flex-direction: column;
  gap: 14px;
}
.header-title-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.header-title {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.header-steps {
  display: flex;
  gap: 8px;
}
.step-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 14px;
  border-radius: 20px;
  font-size: 13px;
  color: #909399;
  background: #f4f4f5;
  transition: all 0.25s;
}
.step-item.active {
  background: #ecf5ff;
  color: #409eff;
  font-weight: 600;
}
.step-item.done {
  background: #f0f9eb;
  color: #67c23a;
}
.step-num {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: #dcdfe6;
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.step-item.active .step-num {
  background: #409eff;
}
.step-item.done .step-num {
  background: #67c23a;
}

/* ====== Step Content ====== */
.step-content {
  min-height: 340px;
  max-height: 56vh;
  overflow-y: auto;
  padding: 4px 0;
}
.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 14px;
}

/* ====== Template Grid (Step 1) ====== */
.template-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}
.template-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
.tpl-card {
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}
.tpl-card:hover {
  border-color: #a0cfff;
  box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
}
.tpl-card.selected {
  border-color: #409eff;
  background: #ecf5ff;
}
.tpl-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.tpl-name {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
}
.tpl-card-body {
  font-size: 12px;
  color: #606266;
  line-height: 1.6;
  max-height: 58px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
}
.tpl-card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 8px;
}
.tpl-usage {
  font-size: 11px;
  color: #909399;
}

/* ====== Step 2: Info Form ====== */
.info-form {
  padding: 0 4px;
}
.selected-tpl-card {
  background: #f0f7ff;
  border: 1px solid #d9ecff;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 18px;
}
.stpl-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}
.stpl-name {
  font-weight: 600;
  color: #303133;
}
.stpl-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
}
.var-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  width: 100%;
}
.var-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.var-name {
  min-width: 90px;
  font-size: 13px;
  font-weight: 500;
  color: #606266;
  font-family: 'Courier New', monospace;
}
.var-input {
  flex: 1;
}
.recipients-box {
  width: 100%;
}
.recipients-textarea {
  margin-bottom: 8px;
}
.recipients-bar {
  display: flex;
  align-items: center;
  gap: 10px;
}
.recipient-badge {
  font-size: 13px;
  color: #409eff;
  margin-left: auto;
}
.recipient-badge b {
  font-size: 16px;
}
.send-mode {
  display: flex;
  align-items: center;
}

/* ====== Step 3: Confirm ====== */
.confirm-card {
  background: #fafafa;
  border-radius: 10px;
  padding: 20px;
}
.preview-block {
  margin-top: 18px;
}
.preview-label {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}
.preview-bubble {
  background: #e8f4e8;
  border-radius: 12px;
  padding: 14px 16px;
  font-size: 14px;
  color: #303133;
  line-height: 1.7;
  white-space: pre-wrap;
  word-break: break-word;
  position: relative;
}
.preview-bubble::before {
  content: '';
  position: absolute;
  left: 16px;
  top: -6px;
  width: 12px;
  height: 12px;
  background: #e8f4e8;
  transform: rotate(45deg);
}
.preview-meta {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}
.cost-row {
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px dashed #e4e7ed;
  display: flex;
  align-items: baseline;
  gap: 4px;
}
.cost-label {
  font-size: 14px;
  color: #606266;
}
.cost-value {
  font-size: 22px;
  font-weight: 700;
  color: #e6a23c;
}
.cost-tip {
  font-size: 12px;
  color: #909399;
}
.highlight {
  color: #409eff;
  font-weight: 600;
  font-size: 16px;
}

/* ====== Footer ====== */
.dialog-footer-v2 {
  display: flex;
  align-items: center;
}

/* ====== Customer Dialog ====== */
.customer-search {
  margin-bottom: 12px;
}

/* ====== 变量客户切换器 ====== */
.var-customer-switcher {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding: 8px 14px;
  background: #f0f7ff;
  border-radius: 8px;
  border: 1px solid #d9ecff;
}
.var-customer-name {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.var-customer-phone {
  font-size: 12px;
  color: #909399;
  font-weight: 400;
  margin-left: 4px;
}
.var-auto-tag {
  margin-left: 6px;
  flex-shrink: 0;
}
.var-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  padding: 8px 12px;
  background: #fdf6ec;
  border-radius: 6px;
  font-size: 12px;
  color: #e6a23c;
}

/* ====== 步骤3 预览切换 ====== */
.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}
.preview-switcher {
  display: flex;
  align-items: center;
  gap: 6px;
}
.preview-customer-info {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}
</style>

