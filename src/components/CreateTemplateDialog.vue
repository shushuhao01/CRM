<template>
  <el-dialog
    v-model="visible"
    :title="dialogTitle"
    width="700px"
    :before-close="handleClose"
    class="create-template-dialog"
  >
    <el-form
      :model="form"
      :rules="rules"
      ref="formRef"
      label-width="100px"
      class="template-form"
    >
      <el-form-item label="模板名称" prop="name">
        <el-input
          v-model="form.name"
          placeholder="请输入模板名称，建议简洁明了"
          maxlength="50"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="模板分类" prop="category">
        <el-select
          v-model="form.category"
          placeholder="请选择模板分类"
          style="width: 100%"
        >
          <el-option
            v-for="category in categories"
            :key="category.value"
            :label="category.label"
            :value="category.value"
          >
            <div class="category-option">
              <span class="category-name">{{ category.label }}</span>
              <span class="category-desc">{{ category.description }}</span>
            </div>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="模板内容" prop="content">
        <div class="content-wrapper">
          <div class="textarea-with-vars" ref="textareaWrapperRef">
            <el-input
              ref="contentInputRef"
              v-model="form.content"
              type="textarea"
              :rows="8"
              placeholder="请输入短信模板内容&#10;&#10;输入 # 可快速插入变量&#10;支持变量格式：{变量名}&#10;例如：您好{customerName}，您的订单{orderNo}已确认。"
              maxlength="500"
              show-word-limit
              @input="handleContentInput"
              @keydown="handleContentKeydown"
            />
            <!-- # 变量选择浮层 -->
            <div
              v-if="showVarDropdown"
              class="var-dropdown"
              :style="varDropdownStyle"
            >
              <div class="var-dropdown-header">
                <span>选择变量</span>
                <span class="var-dropdown-hint">↑↓ 选择  Enter 确认  Esc 关闭</span>
              </div>
              <div
                v-for="(v, idx) in filteredVarList"
                :key="v.name"
                class="var-dropdown-item"
                :class="{ active: varActiveIndex === idx }"
                @mousedown.prevent="insertVariable(v)"
                @mouseenter="varActiveIndex = idx"
              >
                <span class="vdi-name">{{"{"}}{{ v.name }}{{"}"}}</span>
                <span class="vdi-desc">{{ v.desc }}</span>
              </div>
              <div v-if="filteredVarList.length === 0" class="var-dropdown-empty">
                无匹配变量
              </div>
            </div>
          </div>
          <div class="content-info">
            <div class="content-stats">
              <span class="char-count">字符数: {{ form.content.length }}/500</span>
              <span class="sms-count">预计短信条数: {{ Math.ceil(form.content.length / 70) }}</span>
            </div>
            <span class="var-tip-inline">💡 输入 <kbd>#</kbd> 快速插入变量</span>
          </div>
        </div>
      </el-form-item>

      <el-form-item label="检测到的变量" v-if="detectedVariables.length > 0">
        <div class="variables-section">
          <div class="variables-list">
            <el-tag
              v-for="variable in detectedVariables"
              :key="variable"
              class="variable-tag"
              type="info"
            >
              {{ variable }}
            </el-tag>
          </div>
          <div class="variables-tip">
            <el-icon><InfoFilled /></el-icon>
            系统自动检测到以上变量，请确保在使用时提供对应的值
          </div>
        </div>
      </el-form-item>

      <el-form-item label="使用场景" prop="scenario">
        <el-input
          v-model="form.scenario"
          type="textarea"
          :rows="2"
          placeholder="请描述此模板的使用场景，如：订单确认后通知客户"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="申请说明" prop="description" v-if="mode === 'apply'">
        <el-input
          v-model="form.description"
          type="textarea"
          :rows="3"
          placeholder="请说明申请此模板的用途和必要性，以便管理员审核"
          maxlength="300"
          show-word-limit
        />
      </el-form-item>

      <el-form-item label="模板设置" v-if="mode === 'create'">
        <div class="template-settings">
          <el-checkbox v-model="form.isDefault">设为默认模板</el-checkbox>
          <el-checkbox v-model="form.isPublic">公开模板（其他用户可见）</el-checkbox>
        </div>
        <div class="settings-tip">
          默认模板将在发送短信时优先显示；公开模板可被其他用户使用
        </div>
      </el-form-item>

      <el-form-item label="标签" prop="tags">
        <div class="tags-wrapper">
          <el-tag
            v-for="tag in form.tags"
            :key="tag"
            closable
            @close="removeTag(tag)"
            class="tag-item"
          >
            {{ tag }}
          </el-tag>
          <el-input
            v-if="showTagInput"
            ref="tagInputRef"
            v-model="newTag"
            size="small"
            style="width: 100px"
            @keyup.enter="addTag"
            @blur="addTag"
          />
          <el-button
            v-else
            size="small"
            @click="showNewTagInput"
            class="add-tag-btn"
          >
            + 添加标签
          </el-button>
        </div>
        <div class="tags-tip">
          添加标签便于分类和搜索模板
        </div>
      </el-form-item>
    </el-form>

    <!-- 预览区域 -->
    <div class="preview-section" v-if="form.content">
      <h4 class="preview-title">模板预览</h4>
      <div class="preview-content">
        <div class="preview-header">
          <span class="preview-label">短信内容预览：</span>
          <el-button
            size="small"
            type="primary"
            link
            @click="showPreviewDialog = true"
          >
            完整预览
          </el-button>
        </div>
        <div class="preview-text">{{ previewText }}</div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <div class="footer-info">
          <span class="submit-tip">
            {{ mode === 'apply' ? '提交后将进入审核流程' : '创建后立即生效' }}
          </span>
        </div>
        <div class="footer-actions">
          <el-button @click="handleClose">取消</el-button>
          <el-button
            type="primary"
            @click="handleSubmit"
            :loading="submitting"
          >
            {{ mode === 'apply' ? '提交申请' : '创建模板' }}
          </el-button>
        </div>
      </div>
    </template>
  </el-dialog>

  <!-- 完整预览对话框 -->
  <el-dialog
    v-model="showPreviewDialog"
    title="模板预览"
    width="500px"
    class="preview-dialog"
  >
    <div class="full-preview">
      <div class="preview-info">
        <el-descriptions :column="1" size="small">
          <el-descriptions-item label="模板名称">{{ form.name }}</el-descriptions-item>
          <el-descriptions-item label="分类">{{ getCategoryLabel(form.category) }}</el-descriptions-item>
          <el-descriptions-item label="字符数">{{ form.content.length }}</el-descriptions-item>
          <el-descriptions-item label="预计条数">{{ Math.ceil(form.content.length / 70) }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div class="preview-content-full">
        <h5>短信内容：</h5>
        <div class="content-display">{{ form.content }}</div>
      </div>

      <div class="preview-variables" v-if="detectedVariables.length > 0">
        <h5>包含变量：</h5>
        <div class="variables-display">
          <el-tag
            v-for="variable in detectedVariables"
            :key="variable"
            size="small"
            class="variable-tag"
          >
            {{ variable }}
          </el-tag>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="showPreviewDialog = false">关闭</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { InfoFilled } from '@element-plus/icons-vue'

interface TemplateData {
  name: string
  category: string
  content: string
  scenario: string
  tags: string[]
  variables: string[]
}

interface Props {
  modelValue: boolean
  mode?: 'create' | 'apply'
  initialData?: Partial<TemplateData>
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'submit', data: TemplateData): void
}

const props = withDefaults(defineProps<Props>(), {
  mode: 'apply'
})

const emit = defineEmits<Emits>()

// 响应式数据
const formRef = ref()
const tagInputRef = ref()
const contentInputRef = ref()
const textareaWrapperRef = ref()
const visible = ref(false)
const submitting = ref(false)
const showPreviewDialog = ref(false)
const showTagInput = ref(false)
const newTag = ref('')

// # 变量选择器数据
const showVarDropdown = ref(false)
const varActiveIndex = ref(0)
const varSearchText = ref('')
const hashStartPos = ref(-1)
const varDropdownStyle = ref({ top: '0px', left: '0px' })

// 预设变量列表（按分类排序）
const allVariables = [
  // 客户信息
  { name: 'customerName', desc: '客户姓名', group: '客户' },
  { name: 'phone', desc: '手机号', group: '客户' },
  { name: 'email', desc: '邮箱', group: '客户' },
  { name: 'gender', desc: '性别', group: '客户' },
  { name: 'memberLevel', desc: '会员等级', group: '客户' },
  { name: 'memberPoints', desc: '会员积分', group: '客户' },
  { name: 'contactPerson', desc: '联系人', group: '客户' },
  // 订单
  { name: 'orderNo', desc: '订单号', group: '订单' },
  { name: 'amount', desc: '金额', group: '订单' },
  { name: 'productName', desc: '商品名称', group: '订单' },
  { name: 'orderStatus', desc: '订单状态', group: '订单' },
  { name: 'paymentMethod', desc: '支付方式', group: '订单' },
  { name: 'paymentDeadline', desc: '支付截止', group: '订单' },
  // 物流
  { name: 'trackingNo', desc: '快递单号', group: '物流' },
  { name: 'expressCompany', desc: '快递公司', group: '物流' },
  { name: 'deliveryDate', desc: '发货日期', group: '物流' },
  { name: 'trackingUrl', desc: '物流链接', group: '物流' },
  // 公司
  { name: 'companyName', desc: '公司名称', group: '公司' },
  { name: 'brandName', desc: '品牌名称', group: '公司' },
  { name: 'serviceHotline', desc: '客服热线', group: '公司' },
  // 验证
  { name: 'code', desc: '验证码', group: '验证' },
  { name: 'minutes', desc: '有效分钟', group: '验证' },
  // 营销
  { name: 'discount', desc: '折扣', group: '营销' },
  { name: 'couponCode', desc: '优惠券码', group: '营销' },
  { name: 'couponAmount', desc: '优惠金额', group: '营销' },
  { name: 'activityName', desc: '活动名称', group: '营销' },
  { name: 'eventName', desc: '事件名称', group: '营销' },
  { name: 'eventDate', desc: '事件日期', group: '营销' },
  // 通用时间
  { name: 'startDate', desc: '开始日期', group: '时间' },
  { name: 'endDate', desc: '结束日期', group: '时间' },
  { name: 'date', desc: '日期', group: '时间' },
  { name: 'time', desc: '时间', group: '时间' },
  // 服务
  { name: 'serviceName', desc: '服务名称', group: '服务' },
  { name: 'ticketNo', desc: '工单号', group: '服务' },
  { name: 'refundAmount', desc: '退款金额', group: '服务' },
  // 会议预约
  { name: 'meetingTitle', desc: '会议标题', group: '会议' },
  { name: 'meetingDate', desc: '会议日期', group: '会议' },
  { name: 'meetingTime', desc: '会议时间', group: '会议' },
  { name: 'location', desc: '地点', group: '会议' },
  { name: 'address', desc: '地址', group: '会议' },
  { name: 'contact', desc: '联系人', group: '会议' },
  { name: 'venue', desc: '场所', group: '会议' },
  // 财务
  { name: 'balance', desc: '余额', group: '财务' },
  { name: 'invoiceNo', desc: '发票号', group: '财务' },
  { name: 'contractNo', desc: '合同号', group: '财务' },
  // 通用
  { name: 'link', desc: '链接', group: '通用' },
  { name: 'remark', desc: '备注', group: '通用' },
  { name: 'title', desc: '标题', group: '通用' },
  { name: 'number', desc: '数量', group: '通用' }
]

const filteredVarList = computed(() => {
  if (!varSearchText.value) return allVariables.slice(0, 20)
  const kw = varSearchText.value.toLowerCase()
  return allVariables.filter(v =>
    v.name.toLowerCase().includes(kw) || v.desc.includes(kw) || v.group.includes(kw)
  ).slice(0, 15)
})

// 表单数据
const form = ref({
  name: '',
  category: '',
  content: '',
  scenario: '',
  description: '',
  isDefault: false,
  isPublic: false,
  tags: [] as string[]
})

// 模板分类
const categories = [
  {
    value: 'order',
    label: '订单通知',
    description: '订单确认、发货、收货等通知'
  },
  {
    value: 'logistics',
    label: '物流通知',
    description: '发货、配送、签收等物流信息'
  },
  {
    value: 'marketing',
    label: '营销推广',
    description: '促销活动、新品推荐等营销内容'
  },
  {
    value: 'service',
    label: '客服通知',
    description: '售后服务、客户关怀等通知'
  },
  {
    value: 'system',
    label: '系统通知',
    description: '系统维护、账户变更等系统消息'
  },
  {
    value: 'reminder',
    label: '提醒通知',
    description: '付款提醒、到期提醒等'
  }
]

// 表单验证规则
const rules = computed(() => ({
  name: [
    { required: true, message: '请输入模板名称', trigger: 'blur' },
    { min: 2, max: 50, message: '模板名称长度在 2 到 50 个字符', trigger: 'blur' }
  ],
  category: [
    { required: true, message: '请选择模板分类', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入模板内容', trigger: 'blur' },
    { min: 10, max: 500, message: '模板内容长度在 10 到 500 个字符', trigger: 'blur' },
    {
      validator: (rule: unknown, value: string, callback: (error?: Error) => void) => {
        // 检查是否包含敏感词
        const sensitiveWords = ['赌博', '彩票', '贷款', '投资理财']
        const hasSensitive = sensitiveWords.some(word => value.includes(word))
        if (hasSensitive) {
          callback(new Error('模板内容包含敏感词汇，请修改'))
          return
        }
        callback()
      },
      trigger: 'blur'
    }
  ],
  scenario: [
    { required: true, message: '请描述使用场景', trigger: 'blur' },
    { min: 5, max: 200, message: '使用场景描述长度在 5 到 200 个字符', trigger: 'blur' }
  ],
  description: props.mode === 'apply' ? [
    { required: true, message: '请输入申请说明', trigger: 'blur' },
    { min: 10, max: 300, message: '申请说明长度在 10 到 300 个字符', trigger: 'blur' }
  ] : []
}))

// 计算属性
const dialogTitle = computed(() => {
  return props.mode === 'apply' ? '申请短信模板' : '创建短信模板'
})

const detectedVariables = computed(() => {
  if (!form.value.content) return []
  const matches = form.value.content.match(/\{(\w+)\}/g)
  return matches ? [...new Set(matches.map(match => match.slice(1, -1)))] : []
})

const previewText = computed(() => {
  let text = form.value.content
  // 将变量替换为示例值
  detectedVariables.value.forEach(variable => {
    const exampleValue = getExampleValue(variable)
    text = text.replace(new RegExp(`\\{${variable}\\}`, 'g'), exampleValue)
  })
  return text
})

// 监听器
watch(() => props.modelValue, (val) => {
  visible.value = val
  if (val && props.initialData) {
    Object.assign(form.value, props.initialData)
  }
})

watch(visible, (val) => {
  emit('update:modelValue', val)
  if (!val) {
    resetForm()
  }
})

// 方法
const getExampleValue = (variable: string) => {
  const examples: Record<string, string> = {
    // 客户信息
    customerName: '张先生', phone: '138****8888', email: 'zhang@example.com',
    customerNo: 'CUS20240115001', gender: '先生', memberLevel: '黄金会员',
    memberPoints: '12580', contactPerson: '李经理',
    // 订单信息
    orderNo: 'ORD20240115001', amount: '299.00', paidAmount: '199.00',
    unpaidAmount: '100.00', orderStatus: '已确认', orderDate: '2024-01-15',
    orderItems: '商品A x2', paymentMethod: '微信支付', paymentDeadline: '2024-01-16 23:59',
    // 商品信息
    productName: '精品商务套装', productPrice: '599.00', productSpec: 'XL码/黑色',
    productQty: '2', productCategory: '服饰/男装', skuCode: 'SKU-001',
    // 物流信息
    trackingNo: 'SF1234567890', expressCompany: '顺丰速运', deliveryDate: '2024-01-16',
    deliveryTime: '2024-01-16 14:00', trackingUrl: 'https://t.cn/xxx',
    pickupCode: '6-8-9-2', pickupLocation: '丰巢柜-小区北门',
    // 公司信息
    companyName: 'XX科技有限公司', brandName: 'XX品牌', shopName: 'XX旗舰店',
    serviceHotline: '400-123-4567', website: 'www.example.com',
    // 验证安全
    code: '123456', minutes: '5', newPassword: '******',
    loginIp: '192.168.1.100', loginTime: '2024-01-15 14:30', loginDevice: 'iPhone 15',
    // 营销促销
    discount: '8', couponCode: 'VIP2024', couponAmount: '50',
    activityName: '新春大促', activityContent: '全场3折起',
    eventName: '年度客户答谢会', eventDate: '2024-02-10',
    giftName: '精美礼盒', inviteCode: 'INV2024ABC', rewardAmount: '10.00',
    // 通用时间
    startDate: '2024-01-01', endDate: '2024-01-31', startTime: '09:00', endTime: '18:00',
    date: '2024-01-15', time: '14:30', year: '2024', month: '1月',
    // 服务售后
    serviceName: '售后维修', ticketNo: 'TK20240115001',
    serviceResult: '已维修完成', refundAmount: '199.00', warrantyExpiry: '2025-01-15',
    returnNo: 'RT20240115001', refundReason: '商品质量问题',
    // 预约会议
    appointmentDate: '2024-01-20', appointmentTime: '14:00-15:00',
    meetingTitle: '季度销售总结会', meetingDate: '2024-01-20', meetingTime: '14:00',
    meetingRoom: '3楼-大会议室', location: '广州天河', address: '广州市天河区XX路100号',
    contact: '王助理', contactPhone: '020-12345678', venue: '国际会展中心',
    // 财务账户
    balance: '1580.00', invoiceNo: 'INV20240115001', contractNo: 'CON20240115001',
    renewalDate: '2024-02-15', renewalAmount: '3980.00',
    // 行业相关
    courseName: 'Python入门', teacherName: '张老师', className: '2024春季班',
    doctorName: '张医生', hospitalName: 'XX人民医院', department: '内科',
    reservationNo: 'RSV20240115001', roomType: '豪华大床房', checkInDate: '2024-01-20',
    propertyName: 'XX花园', unitNo: '3栋2单元1501', propertyFee: '580.00',
    vehicleNo: '粤A12345', flightNo: 'CZ3901', trainNo: 'G1234',
    // 通用
    content: '具体内容', link: 'https://t.cn/xxx', remark: '请及时处理',
    reason: '系统升级维护', result: '处理完成', status: '已完成', title: '重要通知', number: '3'
  }
  return examples[variable] || `[${variable}]`
}

const getCategoryLabel = (value: string) => {
  const category = categories.find(c => c.value === value)
  return category?.label || value
}

const handleContentInput = () => {
  // 获取 textarea DOM
  const wrapper = contentInputRef.value
  if (!wrapper) return
  const textarea = wrapper.$el?.querySelector('textarea') || wrapper.$el
  if (!textarea) return

  const cursorPos = textarea.selectionStart
  const text = form.value.content

  // 检查光标前是否有 # 且没有关闭
  const beforeCursor = text.substring(0, cursorPos)
  const lastHash = beforeCursor.lastIndexOf('#')

  if (lastHash >= 0) {
    const afterHash = beforeCursor.substring(lastHash + 1)
    // 如果 # 后面没有空格或换行，说明用户正在输入变量关键词
    if (!/[\s\n{]/.test(afterHash)) {
      varSearchText.value = afterHash
      hashStartPos.value = lastHash
      varActiveIndex.value = 0
      showVarDropdown.value = true
      // 计算浮层位置（相对于 wrapper）
      positionDropdown(textarea, cursorPos)
      return
    }
  }
  showVarDropdown.value = false
}

const handleContentKeydown = (e: KeyboardEvent) => {
  if (!showVarDropdown.value) return

  if (e.key === 'ArrowDown') {
    e.preventDefault()
    varActiveIndex.value = Math.min(varActiveIndex.value + 1, filteredVarList.value.length - 1)
  } else if (e.key === 'ArrowUp') {
    e.preventDefault()
    varActiveIndex.value = Math.max(varActiveIndex.value - 1, 0)
  } else if (e.key === 'Enter' || e.key === 'Tab') {
    if (filteredVarList.value.length > 0) {
      e.preventDefault()
      insertVariable(filteredVarList.value[varActiveIndex.value])
    }
  } else if (e.key === 'Escape') {
    e.preventDefault()
    showVarDropdown.value = false
  }
}

interface VarItem { name: string; desc: string; group: string }

const insertVariable = (v: VarItem) => {
  const wrapper = contentInputRef.value
  if (!wrapper) return
  const textarea = wrapper.$el?.querySelector('textarea') || wrapper.$el
  if (!textarea) return

  const start = hashStartPos.value
  const cursorPos = textarea.selectionStart
  const text = form.value.content
  // 替换 #keyword 为 {variableName}
  const before = text.substring(0, start)
  const after = text.substring(cursorPos)
  const inserted = `{${v.name}}`
  form.value.content = before + inserted + after

  showVarDropdown.value = false
  // 恢复光标位置
  nextTick(() => {
    const newPos = start + inserted.length
    textarea.focus()
    textarea.setSelectionRange(newPos, newPos)
  })
}

const positionDropdown = (textarea: HTMLTextAreaElement, cursorPos: number) => {
  // 简单计算：基于行数和光标所在行
  try {
    const text = textarea.value.substring(0, cursorPos)
    const lines = text.split('\n')
    const lineNum = lines.length
    const lineHeight = parseInt(getComputedStyle(textarea).lineHeight) || 22
    const paddingTop = parseInt(getComputedStyle(textarea).paddingTop) || 8
    const top = paddingTop + lineNum * lineHeight + 4
    // 水平偏移：粗略估算
    const lastLine = lines[lines.length - 1]
    const charWidth = 8
    const left = Math.min(lastLine.length * charWidth + 12, textarea.clientWidth - 240)

    varDropdownStyle.value = {
      top: `${Math.min(top, textarea.clientHeight)}px`,
      left: `${Math.max(left, 12)}px`
    }
  } catch {
    varDropdownStyle.value = { top: '120px', left: '12px' }
  }
}

const handleContentChange = () => {
  // 保留兼容性
}

const showNewTagInput = () => {
  showTagInput.value = true
  nextTick(() => {
    tagInputRef.value?.focus()
  })
}

const addTag = () => {
  const tag = newTag.value.trim()
  if (tag && !form.value.tags.includes(tag)) {
    if (form.value.tags.length >= 5) {
      ElMessage.warning('最多只能添加5个标签')
      return
    }
    form.value.tags.push(tag)
  }
  newTag.value = ''
  showTagInput.value = false
}

const removeTag = (tag: string) => {
  const index = form.value.tags.indexOf(tag)
  if (index > -1) {
    form.value.tags.splice(index, 1)
  }
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()

    submitting.value = true

    const submitData = {
      ...form.value,
      variables: detectedVariables.value,
      mode: props.mode,
      createdAt: new Date().toLocaleString()
    }

    emit('submit', submitData)

    // 成功消息由父组件在API调用成功后展示
    handleClose()
  } catch (error) {
    console.error('提交失败:', error)
  } finally {
    submitting.value = false
  }
}

const handleClose = () => {
  visible.value = false
}

const resetForm = () => {
  form.value = {
    name: '',
    category: '',
    content: '',
    scenario: '',
    description: '',
    isDefault: false,
    isPublic: false,
    tags: []
  }
  showTagInput.value = false
  newTag.value = ''
  formRef.value?.resetFields()
}

// 暴露方法给父组件
defineExpose({
  resetForm
})
</script>

<style scoped>
.create-template-dialog {
  .template-form {
    max-height: 70vh;
    overflow-y: auto;

    :deep(.el-form-item) {
      margin-bottom: 20px;
    }

    :deep(.el-form-item__content) {
      width: 100%;
    }

    /* 特别优化模板内容表单项 */
    :deep(.el-form-item:has(.content-wrapper)) {
      .el-form-item__content {
        flex: 1;
        max-width: 100%;
      }
    }
  }
}

.category-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.category-name {
  font-weight: 500;
}

.category-desc {
  font-size: 12px;
  color: #909399;
}

.content-wrapper {
  width: 100%;

  :deep(.el-textarea) {
    width: 100%;
  }

  :deep(.el-textarea__inner) {
    min-height: 200px !important;
    line-height: 1.6;
    font-size: 14px;
    resize: vertical;
    width: 100% !important;
    box-sizing: border-box;
  }

  .content-info {
    margin-top: 10px;
  }

  .content-stats {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #909399;
  }
}

.variables-section {
  .variables-list {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-bottom: 10px;
  }

  .variable-tag {
    font-family: 'Courier New', monospace;
  }

  .variables-tip {
    display: flex;
    align-items: center;
    gap: 5px;
    font-size: 12px;
    color: #909399;
  }
}

.template-settings {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.settings-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.tags-wrapper {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  align-items: center;
}

.tag-item {
  margin-right: 0;
}

.add-tag-btn {
  height: 24px;
  padding: 0 8px;
  font-size: 12px;
}

.tags-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.preview-section {
  margin-top: 20px;
  padding: 15px;
  background: #f8f9fa;
  border-radius: 6px;
  border: 1px solid #e9ecef;
}

.preview-title {
  margin: 0 0 15px 0;
  font-size: 16px;
  color: #303133;
}

.preview-content {
  .preview-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }

  .preview-label {
    font-weight: 500;
    color: #606266;
  }

  .preview-text {
    padding: 12px;
    background: white;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    line-height: 1.6;
    color: #303133;
    min-height: 60px;
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-info {
  .submit-tip {
    font-size: 12px;
    color: #909399;
  }
}

.footer-actions {
  display: flex;
  gap: 10px;
}

.preview-dialog {
  .full-preview {
    .preview-info {
      margin-bottom: 20px;
    }

    .preview-content-full {
      margin-bottom: 20px;

      h5 {
        margin: 0 0 10px 0;
        color: #303133;
      }

      .content-display {
        padding: 12px;
        background: #f8f9fa;
        border: 1px solid #e9ecef;
        border-radius: 4px;
        line-height: 1.6;
        white-space: pre-wrap;
      }
    }

    .preview-variables {
      h5 {
        margin: 0 0 10px 0;
        color: #303133;
      }

      .variables-display {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
      }
    }
  }
}

/* ====== # 变量选择浮层 ====== */
.textarea-with-vars {
  position: relative;
  width: 100%;
}

.var-dropdown {
  position: absolute;
  z-index: 2000;
  width: 280px;
  max-height: 320px;
  overflow-y: auto;
  background: #fff;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px 0;
}

.var-dropdown-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 12px;
  font-size: 12px;
  color: #909399;
  border-bottom: 1px solid #f0f0f0;
}

.var-dropdown-hint {
  font-size: 11px;
  color: #c0c4cc;
}

.var-dropdown-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  cursor: pointer;
  transition: background 0.15s;
}

.var-dropdown-item:hover,
.var-dropdown-item.active {
  background: #ecf5ff;
}

.vdi-name {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}

.vdi-desc {
  font-size: 12px;
  color: #909399;
}

.var-dropdown-empty {
  padding: 16px 12px;
  text-align: center;
  font-size: 13px;
  color: #c0c4cc;
}

.var-tip-inline {
  font-size: 12px;
  color: #909399;
}

.var-tip-inline kbd {
  display: inline-block;
  padding: 0 4px;
  font-size: 11px;
  font-family: monospace;
  background: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 3px;
  color: #409eff;
  font-weight: 600;
}

.content-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 10px;
}
</style>
