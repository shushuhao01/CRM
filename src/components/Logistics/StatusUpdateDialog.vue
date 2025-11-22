<template>
  <el-dialog
    v-model="visible"
    :title="isMultiple ? '批量更新状态' : '更新订单状态'"
    :width="isMultiple ? '800px' : '500px'"
    @close="handleClose"
  >
    <!-- 单个订单更新 -->
    <el-form
      v-if="!isMultiple"
      ref="formRef"
      :model="form"
      :rules="rules"
      label-width="100px"
    >
      <el-form-item label="订单信息">
        <div class="order-info">
          <p><strong>订单号：</strong>{{ orderInfo?.orderNo }}</p>
          <p><strong>客户：</strong>{{ orderInfo?.customerName }}</p>
          <p><strong>当前状态：</strong>
            <el-tag :type="getOrderStatusType(orderInfo?.status)">
              {{ getOrderStatusText(orderInfo?.status) }}
            </el-tag>
          </p>
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

    <!-- 批量订单更新 -->
    <div v-else class="batch-update-container">
      <div class="batch-header">
        <el-alert
          :title="`选中 ${selectedOrders.length} 个订单`"
          type="info"
          :closable="false"
          show-icon
        />
        <div class="batch-actions">
          <el-select
            v-model="batchUnifiedStatus"
            placeholder="统一设置状态"
            clearable
            style="width: 200px; margin-right: 10px"
            @change="handleUnifiedStatusChange"
          >
            <el-option
              v-for="status in statusOptions"
              :key="status.value"
              :label="status.label"
              :value="status.value"
            />
          </el-select>
          <el-button @click="clearAllStatus" size="small">清空所有状态</el-button>
        </div>
      </div>

      <el-scrollbar max-height="400px" class="batch-order-list">
        <el-table :data="batchOrders" border stripe>
          <el-table-column prop="orderNo" label="订单号" width="150" />
          <el-table-column prop="customerName" label="客户名称" width="120" />
          <el-table-column label="当前状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getOrderStatusType(row.status)" size="small">
                {{ getOrderStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="新状态" width="180">
            <template #default="{ row }">
              <el-select
                v-model="row.newStatus"
                placeholder="选择状态"
                size="small"
                style="width: 100%"
              >
                <el-option
                  v-for="status in statusOptions"
                  :key="status.value"
                  :label="status.label"
                  :value="status.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="备注" min-width="150">
            <template #default="{ row }">
              <el-input
                v-model="row.remark"
                placeholder="备注（可选）"
                size="small"
                maxlength="100"
              />
            </template>
          </el-table-column>
        </el-table>
      </el-scrollbar>

      <div class="batch-summary">
        <el-alert
          :title="`已设置状态：${getSetStatusCount()} / ${selectedOrders.length}`"
          :type="getSetStatusCount() === selectedOrders.length ? 'success' : 'warning'"
          :closable="false"
        />
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          type="primary"
          :loading="loading"
          :disabled="isMultiple && getSetStatusCount() === 0"
          @click="handleSubmit"
        >
          {{ isMultiple ? `批量更新 (${getSetStatusCount()})` : '更新状态' }}
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

interface BatchOrderItem extends LogisticsOrder {
  newStatus?: string
  remark?: string
}

const props = withDefaults(defineProps<Props>(), {
  selectedOrders: () => []
})

const emit = defineEmits<Emits>()

const logisticsStatusStore = useLogisticsStatusStore()

// 响应式数据
const formRef = ref<FormInstance>()
const loading = ref(false)
const batchUnifiedStatus = ref('')
const batchOrders = ref<BatchOrderItem[]>([])

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
    value: 'rejected_returned',
    label: '拒收已退回',
    description: '拒收包裹已退回发货地'
  },
  {
    value: 'refunded',
    label: '退货退款',
    description: '已处理退货退款'
  },
  {
    value: 'after_sales_created',
    label: '已建售后',
    description: '已创建售后订单'
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

// 批量更新相关方法
const handleUnifiedStatusChange = (status: string) => {
  if (status) {
    batchOrders.value.forEach(order => {
      order.newStatus = status
    })
    ElMessage.success(`已将所有订单状态统一设置为"${getStatusLabel(status)}"`)
  }
}

const clearAllStatus = () => {
  batchOrders.value.forEach(order => {
    order.newStatus = ''
    order.remark = ''
  })
  batchUnifiedStatus.value = ''
  ElMessage.info('已清空所有状态设置')
}

const getSetStatusCount = () => {
  return batchOrders.value.filter(order => order.newStatus).length
}

const getStatusLabel = (value: string) => {
  const option = statusOptions.find(item => item.value === value)
  return option?.label || value
}

// 【修复】获取订单状态文本（支持订单状态和物流状态）
const getOrderStatusText = (status?: string): string => {
  const statusMap: Record<string, string> = {
    // 订单状态
    pending_transfer: '待流转',
    pending_audit: '待审核',
    audit_rejected: '审核拒绝',
    pending_shipment: '待发货',
    shipped: '已发货',
    delivered: '已签收',
    logistics_returned: '物流部退回',
    logistics_cancelled: '物流部取消',
    package_exception: '包裹异常',
    rejected: '拒收',
    rejected_returned: '拒收已退回',
    after_sales_created: '已建售后',
    pending_cancel: '待取消',
    cancel_failed: '取消失败',
    cancelled: '已取消',
    draft: '草稿',
    // 物流状态
    picked_up: '已揽收',
    in_transit: '运输中',
    out_for_delivery: '派送中',
    exception: '异常',
    returned: '已退回',
    refunded: '退货退款',
    abnormal: '状态异常'
  }
  return statusMap[status || ''] || status || ''
}

// 【修复】获取订单状态类型（支持订单状态和物流状态）
const getOrderStatusType = (status?: string): string => {
  const typeMap: Record<string, string> = {
    pending_transfer: 'info',
    pending_audit: 'warning',
    audit_rejected: 'danger',
    pending_shipment: 'primary',
    shipped: 'success',
    delivered: 'success',
    logistics_returned: 'warning',
    logistics_cancelled: 'info',
    package_exception: 'danger',
    rejected: 'danger',
    rejected_returned: 'warning',
    after_sales_created: 'info',
    pending_cancel: 'warning',
    cancel_failed: 'danger',
    cancelled: 'info',
    draft: 'info',
    // 物流状态
    picked_up: 'primary',
    in_transit: 'primary',
    out_for_delivery: 'warning',
    exception: 'danger',
    returned: 'danger',
    refunded: 'danger',
    abnormal: 'danger'
  }
  return typeMap[status || ''] || 'info'
}

// 获取状态描述
const getStatusDescription = (status: string): string => {
  const option = statusOptions.find(item => item.value === status)
  return option?.description || ''
}

// 处理提交
const handleSubmit = async () => {
  try {
    if (isMultiple.value) {
      // 批量更新逻辑
      const ordersToUpdate = batchOrders.value.filter(order => order.newStatus)

      if (ordersToUpdate.length === 0) {
        ElMessage.warning('请至少为一个订单选择新状态')
        return
      }

      const confirmMessage = `确定要更新 ${ordersToUpdate.length} 个订单的状态吗？`
      await ElMessageBox.confirm(confirmMessage, '确认批量更新', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      loading.value = true

      // 按状态分组更新
      const updatePromises: Promise<void>[] = []
      const updatedOrders: LogisticsOrder[] = []

      for (const order of ordersToUpdate) {
        const promise = logisticsStatusStore.updateOrderStatus(
          order.orderNo,
          order.newStatus!,
          order.remark || undefined
        ).then(() => {
          updatedOrders.push({
            ...order,
            status: order.newStatus!
          })
        })
        updatePromises.push(promise)
      }

      await Promise.all(updatePromises)

      ElMessage.success(`成功更新 ${ordersToUpdate.length} 个订单状态`)

      // 发送成功事件（使用第一个订单的状态作为代表，实际上每个订单可能不同）
      emit('success', {
        orders: updatedOrders,
        newStatus: ordersToUpdate[0].newStatus!
      })
      handleClose()
    } else {
      // 单个更新逻辑
      if (!formRef.value) return
      await formRef.value.validate()

      const confirmMessage = `确定要将订单"${props.orderInfo?.orderNo}"的状态更新为"${getStatusLabel(form.newStatus)}"吗？`
      await ElMessageBox.confirm(confirmMessage, '确认更新', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      })

      loading.value = true

      if (props.orderInfo) {
        await logisticsStatusStore.updateOrderStatus(
          props.orderInfo.orderNo,
          form.newStatus,
          form.remark || undefined
        )
        ElMessage.success('订单状态更新成功')

        const updatedOrders = [{
          ...props.orderInfo,
          status: form.newStatus
        }]

        emit('success', {
          orders: updatedOrders,
          newStatus: form.newStatus
        })
        handleClose()
      }
    }
  } catch (error: unknown) {
    if (error !== 'cancel') {
      console.error('[StatusUpdateDialog] 更新订单状态失败:', error)
      const errorMessage = error?.message || error?.data?.message || '更新失败，请重试'
      ElMessage.error(errorMessage)
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
  batchUnifiedStatus.value = ''
  batchOrders.value = []
  formRef.value?.clearValidate()
}

// 监听弹窗打开，初始化数据
watch(visible, (newVal) => {
  if (newVal) {
    resetForm()
    // 如果是批量更新，初始化批量订单数据
    if (isMultiple.value) {
      batchOrders.value = props.selectedOrders.map(order => ({
        ...order,
        newStatus: '',
        remark: ''
      }))
    }
  }
})
</script>

<style scoped>
.order-info p {
  margin: 5px 0;
  line-height: 1.5;
}

.batch-update-container {
  padding: 10px 0;
}

.batch-header {
  margin-bottom: 15px;
}

.batch-actions {
  margin-top: 10px;
  display: flex;
  align-items: center;
}

.batch-order-list {
  margin: 15px 0;
}

.batch-summary {
  margin-top: 15px;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-select-dropdown__item) {
  height: auto;
  line-height: 1.5;
  padding: 8px 20px;
}

:deep(.el-table) {
  font-size: 13px;
}

:deep(.el-table .cell) {
  padding: 5px;
}
</style>
