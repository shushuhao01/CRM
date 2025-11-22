<template>
  <el-dialog
    v-model="visible"
    title="设置待办"
    width="450px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="80px"
    >
      <el-form-item label="订单信息">
        <div class="order-info">
          <p><strong>订单号：</strong>{{ orderInfo?.orderNo }}</p>
          <p><strong>客户：</strong>{{ orderInfo?.customerName }}</p>
          <p><strong>当前状态：</strong>
            <el-tag :type="getStatusType(orderInfo?.status)">
              {{ getStatusText(orderInfo?.status) }}
            </el-tag>
          </p>
        </div>
      </el-form-item>

      <el-form-item label="处理时间" prop="days">
        <el-select
          v-model="form.days"
          placeholder="请选择处理时间"
          style="width: 100%"
        >
          <el-option
            v-for="option in daysOptions"
            :key="option.value"
            :label="option.label"
            :value="option.value"
          >
            <span style="float: left">{{ option.label }}</span>
            <span style="float: right; color: var(--el-text-color-secondary)">
              {{ option.description }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item v-if="form.days" label="预计时间">
        <el-alert
          :title="getExpectedTime()"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入待办备注（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item>
        <el-alert
          title="设置待办后，订单将在指定时间后重新显示在'待更新'列表中，并在'待办'导航栏中显示"
          type="warning"
          :closable="false"
          show-icon
        />
      </el-form-item>
    </el-form>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          @click="handleSubmit"
        >
          设置待办
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { useLogisticsStatusStore } from '@/stores/logisticsStatus'
import type { LogisticsOrder } from '@/stores/logisticsStatus'

interface Props {
  modelValue: boolean
  orderInfo?: LogisticsOrder
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', todoInfo?: { orderNo: string, days: number, remark?: string }): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const logisticsStatusStore = useLogisticsStatusStore()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 表单数据
const form = reactive({
  days: null as number | null,
  remark: ''
})

// 天数选项
const daysOptions = [
  {
    value: 1,
    label: '1天后处理',
    description: '明天处理'
  },
  {
    value: 2,
    label: '2天后处理',
    description: '后天处理'
  },
  {
    value: 3,
    label: '3天后处理',
    description: '3天后处理'
  },
  {
    value: 5,
    label: '5天后处理',
    description: '工作日处理'
  },
  {
    value: 7,
    label: '7天后处理',
    description: '一周后处理'
  },
  {
    value: 10,
    label: '10天后处理',
    description: '10天后处理'
  }
]

// 表单验证规则
const rules: FormRules = {
  days: [
    { required: true, message: '请选择处理时间', trigger: 'change' }
  ]
}

// 获取状态文本
const getStatusText = (status?: string): string => {
  return logisticsStatusStore.getStatusText(status || '')
}

// 获取状态类型
const getStatusType = (status?: string): string => {
  return logisticsStatusStore.getStatusType(status || '')
}

// 获取预计时间
const getExpectedTime = (): string => {
  if (!form.days) return ''

  const now = new Date()
  const expectedDate = new Date(now.getTime() + form.days * 24 * 60 * 60 * 1000)

  const year = expectedDate.getFullYear()
  const month = String(expectedDate.getMonth() + 1).padStart(2, '0')
  const day = String(expectedDate.getDate()).padStart(2, '0')
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const weekday = weekdays[expectedDate.getDay()]

  return `${year}-${month}-${day} (${weekday})`
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value || !props.orderInfo) return

  try {
    await formRef.value.validate()

    const confirmMessage = `确定要将订单"${props.orderInfo.orderNo}"设置为${form.days}天后处理吗？`

    await ElMessageBox.confirm(confirmMessage, '确认设置', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    loading.value = true

    await logisticsStatusStore.setTodoOrder(
      props.orderInfo.orderNo,
      form.days!,
      form.remark || undefined
    )

    ElMessage.success('待办设置成功')
    emit('success', {
      orderNo: props.orderInfo.orderNo,
      days: form.days!,
      remark: form.remark || undefined
    })
    handleClose()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('设置待办失败:', error)
      ElMessage.error('设置失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 处理关闭
const handleClose = () => {
  visible.value = false
  resetForm()
}

// 重置表单
const resetForm = () => {
  form.days = null
  form.remark = ''
  formRef.value?.clearValidate()
}

// 监听弹窗打开，重置表单
watch(visible, (newVal) => {
  if (newVal) {
    resetForm()
  }
})
</script>

<style scoped>
.order-info p {
  margin: 5px 0;
  line-height: 1.5;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-select-dropdown__item) {
  height: auto;
  line-height: 1.5;
  padding: 8px 20px;
}
</style>
