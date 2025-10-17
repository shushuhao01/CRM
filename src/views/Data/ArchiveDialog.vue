<template>
  <el-dialog
    v-model="visible"
    title="封存客户资料"
    width="500px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="archive-dialog-content">
      <div class="archive-info">
        <el-alert
          title="封存说明"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>封存后的客户资料将从当前列表中移除，在指定时间后自动重新出现在未分配列表中，并标记为"重新分配"状态。</p>
          </template>
        </el-alert>
      </div>

      <el-form 
        ref="formRef"
        :model="archiveForm" 
        :rules="formRules"
        label-width="100px"
        class="archive-form"
      >
        <el-form-item label="封存时长" prop="duration">
          <el-select 
            v-model="archiveForm.duration" 
            placeholder="请选择封存时长" 
            style="width: 100%"
          >
            <el-option label="1天" value="1day" />
            <el-option label="7天" value="7days" />
            <el-option label="15天" value="15days" />
            <el-option label="30天" value="30days" />
            <el-option label="1年" value="1year" />
            <el-option label="永久封存" value="permanent" />
          </el-select>
        </el-form-item>

        <el-form-item label="封存原因" prop="reason">
          <el-select 
            v-model="archiveForm.reason" 
            placeholder="请选择封存原因" 
            style="width: 100%"
          >
            <el-option label="客户暂时无需求" value="no_demand" />
            <el-option label="客户预算不足" value="insufficient_budget" />
            <el-option label="客户决策周期长" value="long_decision_cycle" />
            <el-option label="竞争对手已成交" value="competitor_deal" />
            <el-option label="客户信息不准确" value="inaccurate_info" />
            <el-option label="其他原因" value="other" />
          </el-select>
        </el-form-item>

        <el-form-item label="备注说明" prop="remark">
          <el-input 
            v-model="archiveForm.remark" 
            type="textarea" 
            placeholder="请详细说明封存原因，此信息将在客户重新分配时显示（必填）"
            :rows="4"
            maxlength="500"
            show-word-limit
          />
        </el-form-item>

        <el-form-item label="预计解封时间" v-if="archiveForm.duration !== 'permanent'">
          <el-text type="info">
            {{ getUnarchiveTime() }}
          </el-text>
        </el-form-item>
      </el-form>

      <div class="customer-info" v-if="customerData">
        <el-divider content-position="left">客户信息</el-divider>
        <div class="info-row">
          <span class="label">客户姓名：</span>
          <span class="value">{{ customerData.customerName }}</span>
        </div>
        <div class="info-row">
          <span class="label">联系电话：</span>
          <span class="value">{{ displaySensitiveInfoNew(customerData.phone, SensitiveInfoType.PHONE) }}</span>
        </div>
        <div class="info-row">
          <span class="label">订单金额：</span>
          <span class="value">¥{{ customerData.orderAmount.toLocaleString() }}</span>
        </div>
      </div>
    </div>

    <template #footer>
      <el-button @click="handleClose">取消</el-button>
      <el-button 
        type="danger" 
        @click="handleConfirm" 
        :loading="submitting"
      >
        确认封存
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, type FormInstance, type FormRules } from 'element-plus'
import type { DataListItem } from '@/api/data'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

interface Props {
  modelValue: boolean
  customerData?: DataListItem | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'confirm', data: {
    duration: string
    reason: string
    remark: string
    unarchiveTime?: string
  }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const formRef = ref<FormInstance>()
const submitting = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const archiveForm = reactive({
  duration: '',
  reason: '',
  remark: ''
})

const formRules: FormRules = {
  duration: [
    { required: true, message: '请选择封存时长', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请选择封存原因', trigger: 'change' }
  ],
  remark: [
    { required: true, message: '请填写备注说明', trigger: 'blur' },
    { min: 10, message: '备注说明至少10个字符', trigger: 'blur' }
  ]
}

// 计算解封时间
const getUnarchiveTime = () => {
  if (!archiveForm.duration) return ''
  
  const now = new Date()
  let unarchiveDate: Date
  
  switch (archiveForm.duration) {
    case '1day':
      unarchiveDate = new Date(now.getTime() + 24 * 60 * 60 * 1000)
      break
    case '7days':
      unarchiveDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
      break
    case '15days':
      unarchiveDate = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000)
      break
    case '30days':
      unarchiveDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      break
    case '1year':
      unarchiveDate = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000)
      break
    default:
      return '永久封存'
  }
  
  return unarchiveDate.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 重置表单
const resetForm = () => {
  archiveForm.duration = ''
  archiveForm.reason = ''
  archiveForm.remark = ''
  formRef.value?.clearValidate()
}

// 关闭弹窗
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 确认封存
const handleConfirm = async () => {
  if (!formRef.value) return
  
  try {
    await formRef.value.validate()
    
    submitting.value = true
    
    const archiveData = {
      duration: archiveForm.duration,
      reason: archiveForm.reason,
      remark: archiveForm.remark,
      unarchiveTime: archiveForm.duration !== 'permanent' ? getUnarchiveTime() : undefined
    }
    
    emit('confirm', archiveData)
    
    ElMessage.success('封存成功')
    handleClose()
  } catch (error) {
    console.error('表单验证失败:', error)
  } finally {
    submitting.value = false
  }
}

// 监听弹窗打开，重置表单
watch(() => props.modelValue, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.archive-dialog-content {
  padding: 10px 0;
}

.archive-info {
  margin-bottom: 20px;
}

.archive-form {
  margin: 20px 0;
}

.customer-info {
  margin-top: 20px;
  padding: 15px;
  background-color: #f8f9fa;
  border-radius: 6px;
}

.info-row {
  display: flex;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
}

.value {
  color: #303133;
}

:deep(.el-alert__content) {
  padding-left: 8px;
}

:deep(.el-alert__description) {
  margin: 5px 0 0 0;
  font-size: 13px;
  line-height: 1.4;
}
</style>