<template>
  <el-dialog
    v-model="visible"
    :title="isMultiple ? '批量更新状态' : '更新订单状态'"
    width="500px"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="订单信息">
        <div v-if="!isMultiple" class="order-info">
          <p><strong>订单号：</strong>{{ orderInfo?.orderNo }}</p>
          <p><strong>客户：</strong>{{ orderInfo?.customerName }}</p>
          <p><strong>当前状态：</strong>
            <el-tag :type="getStatusType(orderInfo?.status)">
              {{ getStatusText(orderInfo?.status) }}
            </el-tag>
          </p>
        </div>
        <div v-else class="batch-info">
          <p><strong>选中订单：</strong>{{ selectedOrders.length }} 个</p>
          <el-scrollbar max-height="100px">
            <div class="order-list">
              <div v-for="order in selectedOrders" :key="order.orderNo" class="order-item">
                {{ order.orderNo }} - {{ order.customerName }}
              </div>
            </div>
          </el-scrollbar>
        </div>
      </el-form-item>

      <el-form-item label="新状态" prop="newStatus">
        <el-select
          v-model="form.newStatus"
          placeholder="请选择新状态"
          style="width: 100%"
        >
          <el-option
            v-for="status in statusOptions"
            :key="status.value"
            :label="status.label"
            :value="status.value"
          >
            <span style="float: left">{{ status.label }}</span>
            <span style="float: right; color: var(--el-text-color-secondary)">
              {{ status.description }}
            </span>
          </el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="备注" prop="remark">
        <el-input
          v-model="form.remark"
          type="textarea"
          :rows="3"
          placeholder="请输入更新备注（可选）"
          maxlength="200"
          show-word-limit
        />
      </el-form-item>

      <el-form-item v-if="form.newStatus" label="状态说明">
        <el-alert
          :title="getStatusDescription(form.newStatus)"
          type="info"
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
          {{ isMultiple ? '批量更新' : '更新状态' }}
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
  selectedOrders?: LogisticsOrder[]
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'success', updatedInfo?: { orders: LogisticsOrder[], newStatus: string }): void
}

const props = withDefaults(defineProps<Props>(), {
  selectedOrders: () => []
})

const emit = defineEmits<Emits>()

const logisticsStatusStore = useLogisticsStatusStore()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

const isMultiple = computed(() => props.selectedOrders.length > 0)

// 表单数据
const form = reactive({
  newStatus: '',
  remark: ''
})

// 状态选项
const statusOptions = [
  {
    value: 'delivered',
    label: '已签收',
    description: '客户已确认收货'
  },
  {
    value: 'rejected',
    label: '拒收',
    description: '客户拒绝接收包裹'
  },
  {
    value: 'returned',
    label: '拒收已退回',
    description: '拒收包裹已退回发货地'
  },
  {
    value: 'refunded',
    label: '退货退款',
    description: '已处理退货退款'
  },
  {
    value: 'abnormal',
    label: '状态异常',
    description: '物流状态异常，需要人工处理'
  }
]

// 表单验证规则
const rules: FormRules = {
  newStatus: [
    { required: true, message: '请选择新状态', trigger: 'change' }
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

// 获取状态描述
const getStatusDescription = (status: string): string => {
  const option = statusOptions.find(item => item.value === status)
  return option?.description || ''
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
    
    const confirmMessage = isMultiple.value
      ? `确定要将选中的 ${props.selectedOrders.length} 个订单状态更新为"${getStatusText(form.newStatus)}"吗？`
      : `确定要将订单"${props.orderInfo?.orderNo}"的状态更新为"${getStatusText(form.newStatus)}"吗？`

    await ElMessageBox.confirm(confirmMessage, '确认更新', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    loading.value = true

    let updatedOrders: LogisticsOrder[] = []
    
    if (isMultiple.value) {
      // 批量更新
      const orderNos = props.selectedOrders.map(order => order.orderNo)
      await logisticsStatusStore.batchUpdateOrderStatus(
        orderNos,
        form.newStatus,
        form.remark || undefined
      )
      ElMessage.success(`成功更新 ${orderNos.length} 个订单状态`)
      updatedOrders = props.selectedOrders.map(order => ({
        ...order,
        status: form.newStatus
      }))
    } else {
      // 单个更新
      if (props.orderInfo) {
        await logisticsStatusStore.updateOrderStatus(
          props.orderInfo.orderNo,
          form.newStatus,
          form.remark || undefined
        )
        ElMessage.success('订单状态更新成功')
        updatedOrders = [{
          ...props.orderInfo,
          status: form.newStatus
        }]
      }
    }

    emit('success', {
      orders: updatedOrders,
      newStatus: form.newStatus
    })
    handleClose()
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('更新订单状态失败:', error)
      ElMessage.error('更新失败，请重试')
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
  form.newStatus = ''
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

.batch-info {
  margin-bottom: 10px;
}

.order-list {
  padding: 10px;
  background-color: var(--el-fill-color-light);
  border-radius: 4px;
}

.order-item {
  padding: 2px 0;
  font-size: 14px;
  color: var(--el-text-color-regular);
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