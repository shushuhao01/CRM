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
          <el-input
            v-model="form.content"
            type="textarea"
            :rows="8"
            placeholder="请输入短信模板内容&#10;&#10;支持变量格式：{变量名}&#10;例如：您好{customerName}，您的订单{orderNo}已确认。&#10;&#10;注意：短信内容需符合相关法规要求"
            maxlength="500"
            show-word-limit
            @input="handleContentChange"
          />
          <div class="content-info">
            <div class="content-stats">
              <span class="char-count">字符数: {{ form.content.length }}/500</span>
              <span class="sms-count">预计短信条数: {{ Math.ceil(form.content.length / 70) }}</span>
            </div>
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
const visible = ref(false)
const submitting = ref(false)
const showPreviewDialog = ref(false)
const showTagInput = ref(false)
const newTag = ref('')

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
    customerName: '张先生',
    orderNo: 'ORD20240115001',
    amount: '299.00',
    deliveryTime: '2024-01-16 14:00',
    trackingNo: 'SF1234567890',
    productName: '商品名称',
    companyName: '公司名称',
    phone: '138****8888',
    code: '123456',
    date: '2024-01-15',
    time: '14:30'
  }
  return examples[variable] || `[${variable}]`
}

const getCategoryLabel = (value: string) => {
  const category = categories.find(c => c.value === value)
  return category?.label || value
}

const handleContentChange = () => {
  // 内容变化时可以做一些实时检查
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
    
    // 模拟提交延迟
    await new Promise(resolve => setTimeout(resolve, 1500))
    
    emit('submit', submitData)
    
    ElMessage.success(
      props.mode === 'apply' ? '模板申请已提交，等待管理员审核' : '模板创建成功'
    )
    
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
</style>