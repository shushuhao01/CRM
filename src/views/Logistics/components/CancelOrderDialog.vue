<template>
  <el-dialog
    v-model="dialogVisible"
    title="取消订单"
    width="850px"
    :before-close="handleClose"
    class="cancel-order-dialog"
  >
    <div v-if="order" class="cancel-content">
      <!-- 订单信息 + 取消原因 并排 -->
      <div class="main-section">
        <!-- 左侧：订单信息 -->
        <div class="order-summary">
          <h3 class="section-title">
            <el-icon><Box /></el-icon>
            订单信息
          </h3>
          <div class="order-info-grid">
            <div class="info-item">
              <span class="label">订单号：</span>
              <span class="value">{{ order.orderNo }}</span>
            </div>
            <div class="info-item">
              <span class="label">客户姓名：</span>
              <span class="value">{{ order.customerName }}</span>
            </div>
            <div class="info-item">
              <span class="label">联系电话：</span>
              <span class="value">{{ displaySensitiveInfoNew(order.phone, 'phone') }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单金额：</span>
              <span class="value">¥{{ formatNumber(order.totalAmount) }}</span>
            </div>
            <div class="info-item">
              <span class="label">定金：</span>
              <span class="value">¥{{ formatNumber(order.deposit) }}</span>
            </div>
            <div class="info-item">
              <span class="label">代收款：</span>
              <span class="value cod-amount">¥{{ formatNumber(order.codAmount) }}</span>
            </div>
            <div class="info-item">
              <span class="label">当前状态：</span>
              <span class="value">
                <el-tag :style="getOrderStatusStyle(order.status)" size="small" effect="plain">
                  {{ getUnifiedStatusText(order.status) }}
                </el-tag>
              </span>
            </div>
            <div class="info-item">
              <span class="label">负责销售：</span>
              <span class="value">{{ order.createdBy || '系统用户' }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧：取消原因表单 -->
        <div class="cancel-reason">
          <h3 class="section-title">
            <el-icon><Warning /></el-icon>
            取消原因
          </h3>
          <el-form :model="cancelForm" :rules="rules" ref="formRef" label-width="80px" size="default">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="取消类型" prop="cancelType" required>
                  <el-select v-model="cancelForm.cancelType" placeholder="请选择" class="full-width">
                    <el-option label="客户主动取消" value="customer_cancel" />
                    <el-option label="客户联系不上" value="customer_unreachable" />
                    <el-option label="地址无法配送" value="address_undeliverable" />
                    <el-option label="商品缺货" value="out_of_stock" />
                    <el-option label="价格争议" value="price_dispute" />
                    <el-option label="重复订单" value="duplicate_order" />
                    <el-option label="欺诈订单" value="fraud_order" />
                    <el-option label="系统错误" value="system_error" />
                    <el-option label="其他原因" value="other" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="退款处理" prop="refundType" required>
                  <el-select v-model="cancelForm.refundType" placeholder="请选择" class="full-width">
                    <el-option label="全额退款" value="full_refund" />
                    <el-option label="部分退款" value="partial_refund" />
                    <el-option label="不退款" value="no_refund" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>

            <el-row :gutter="16" v-if="cancelForm.refundType === 'partial_refund'">
              <el-col :span="12">
                <el-form-item label="退款金额" prop="refundAmount">
                  <el-input-number
                    v-model="cancelForm.refundAmount"
                    :min="0"
                    :max="order.deposit"
                    :precision="2"
                    class="full-width"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item label="扣费说明" prop="feeDescription">
                  <el-input v-model="cancelForm.feeDescription" placeholder="扣费原因" />
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="取消原因" prop="reason" required>
              <el-input
                v-model="cancelForm.reason"
                type="textarea"
                :rows="2"
                placeholder="请详细说明取消原因"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="通知客户" prop="notifyCustomer">
                  <el-switch
                    v-model="cancelForm.notifyCustomer"
                    active-text="是"
                    inactive-text="否"
                  />
                </el-form-item>
              </el-col>
              <el-col :span="12" v-if="cancelForm.notifyCustomer">
                <el-form-item label="通知方式" prop="notificationMethod">
                  <el-checkbox-group v-model="cancelForm.notificationMethod" class="notify-group">
                    <el-checkbox label="sms">短信</el-checkbox>
                    <el-checkbox label="phone">电话</el-checkbox>
                    <el-checkbox label="wechat">微信</el-checkbox>
                  </el-checkbox-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="备注" prop="remarks">
              <el-input
                v-model="cancelForm.remarks"
                type="textarea"
                :rows="2"
                placeholder="其他备注说明（选填）"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 底部：取消确认 + 历史记录 并排 -->
      <div class="bottom-section">
        <div class="cancel-confirm">
          <el-alert title="取消确认" type="error" :closable="false" show-icon>
            <template #default>
              <div class="confirm-content">
                <span>
                  确认后：订单状态改为"已取消" →
                  <template v-if="cancelForm.refundType === 'full_refund'">全额退款 ¥{{ formatNumber(order.deposit) }}</template>
                  <template v-else-if="cancelForm.refundType === 'partial_refund'">部分退款 ¥{{ formatNumber(cancelForm.refundAmount) }}</template>
                  <template v-else>不退款</template>
                  <template v-if="cancelForm.notifyCustomer"> → 通知客户</template>
                </span>
                <span class="warning-text">
                  <el-icon><WarningFilled /></el-icon>
                  订单取消后无法恢复！
                </span>
              </div>
            </template>
          </el-alert>
        </div>

        <div v-if="cancelHistory.length > 0" class="cancel-history">
          <div class="history-header-title">
            <el-icon><Clock /></el-icon>
            相关取消记录
          </div>
          <div class="history-item" v-for="(record, index) in cancelHistory" :key="index">
            <span class="history-time">{{ record.cancelTime }}</span>
            <el-tag type="danger" size="small">已取消</el-tag>
            <span class="history-reason">{{ getCancelTypeText(record.cancelType) }}：{{ record.reason }}</span>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="saveAsDraft">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button type="danger" @click="confirmCancel" :loading="loading">
          <el-icon><CircleClose /></el-icon>
          确认取消订单
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  Box, Warning, Clock, Document, CircleClose, WarningFilled
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import type { Order } from '@/stores/order'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'

interface CancelData {
  cancelType: string
  reason: string
  refundType: string
  refundAmount: number
  notifyCustomer: boolean
  remarks: string
}

interface Props {
  visible: boolean
  order: Order
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'cancelled', data: CancelData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formRef = ref<FormInstance>()
const loading = ref(false)

// 取消表单
const cancelForm = reactive({
  cancelType: '',
  reason: '',
  refundType: 'full_refund',
  refundAmount: 0,
  feeDescription: '',
  notifyCustomer: true,
  notificationMethod: ['sms'],
  remarks: ''
})

// 表单验证规则
const rules = {
  cancelType: [
    { required: true, message: '请选择取消类型', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请填写取消原因', trigger: 'blur' },
    { min: 2, message: '取消原因至少2个字符', trigger: 'blur' }
  ],
  refundType: [
    { required: true, message: '请选择退款处理方式', trigger: 'change' }
  ]
}

// 历史取消记录（模拟数据）
const cancelHistory = ref([
  {
    orderNo: 'ORD202401001',
    cancelTime: '2024-01-05 16:20:00',
    cancelType: 'customer_cancel',
    reason: '客户临时改变主意，不需要该商品',
    refundType: 'full_refund',
    operator: '李四'
  }
])

// 监听退款类型变化
watch(() => cancelForm.refundType, (newType) => {
  if (newType === 'full_refund') {
    cancelForm.refundAmount = props.order?.deposit || 0
  } else if (newType === 'partial_refund') {
    cancelForm.refundAmount = Math.round((props.order?.deposit || 0) * 0.8)
  } else {
    cancelForm.refundAmount = 0
  }
})

// 格式化数字
const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0'
}

// 获取取消类型文本
const getCancelTypeText = (cancelType: string) => {
  const typeMap: Record<string, string> = {
    'customer_cancel': '客户主动取消',
    'customer_unreachable': '客户联系不上',
    'address_undeliverable': '地址无法配送',
    'out_of_stock': '商品缺货',
    'price_dispute': '价格争议',
    'duplicate_order': '重复订单',
    'fraud_order': '欺诈订单',
    'system_error': '系统错误',
    'other': '其他原因'
  }
  return typeMap[cancelType] || '未知类型'
}

// 保存草稿
const saveAsDraft = async () => {
  try {
    ElMessage.loading('正在保存草稿...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (_error) {
    ElMessage.error('草稿保存失败')
  }
}

// 确认取消
const confirmCancel = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    const confirmText = cancelForm.refundType === 'full_refund'
      ? `确认取消订单 ${props.order.orderNo} 并全额退款 ¥${formatNumber(props.order.deposit)} 吗？`
      : cancelForm.refundType === 'partial_refund'
      ? `确认取消订单 ${props.order.orderNo} 并退款 ¥${formatNumber(cancelForm.refundAmount)} 吗？`
      : `确认取消订单 ${props.order.orderNo} 且不退款吗？`

    await ElMessageBox.confirm(
      confirmText + ' 此操作无法撤销！',
      '确认取消订单',
      {
        confirmButtonText: '确认取消',
        cancelButtonText: '取消',
        type: 'error'
      }
    )

    loading.value = true

    const cancelData = {
      orderId: props.order.id,
      orderNo: props.order.orderNo,
      ...cancelForm,
      cancelTime: new Date().toISOString(),
      operator: '当前用户',
      status: 'cancelled'
    }

    emit('cancelled', cancelData)
    handleClose()

  } catch (error) {
    if (error !== 'cancel') {
      console.error('[取消订单] 操作失败:', error)
    }
  } finally {
    loading.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  if (formRef.value) {
    formRef.value.resetFields()
  }
  Object.assign(cancelForm, {
    cancelType: '',
    reason: '',
    refundType: 'full_refund',
    refundAmount: 0,
    feeDescription: '',
    notifyCustomer: true,
    notificationMethod: ['sms'],
    remarks: ''
  })
  dialogVisible.value = false
}
</script>

<style scoped>
.cancel-order-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
}

.cancel-content {
  font-size: 14px;
}

.main-section {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.order-summary {
  flex: 0 0 280px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.cancel-reason {
  flex: 1;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 16px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 12px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.order-info-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 8px;
}

.info-item {
  display: flex;
  align-items: center;
  font-size: 13px;
}

.info-item .label {
  font-weight: 500;
  color: #606266;
  min-width: 70px;
}

.info-item .value {
  color: #303133;
}

.cod-amount {
  color: #f56c6c;
  font-weight: bold;
}

.full-width {
  width: 100%;
}

.notify-group {
  display: flex;
  gap: 8px;
}

.bottom-section {
  display: flex;
  gap: 16px;
}

.cancel-confirm {
  flex: 1;
}

.confirm-content {
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 12px;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #f56c6c;
  font-weight: 600;
}

.cancel-history {
  flex: 1;
  background: #fafafa;
  border-radius: 6px;
  padding: 12px;
  max-height: 100px;
  overflow-y: auto;
}

.history-header-title {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 8px;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  padding: 6px 0;
  border-bottom: 1px dashed #e4e7ed;
}

.history-item:last-child {
  border-bottom: none;
}

.history-time {
  color: #909399;
  flex-shrink: 0;
}

.history-reason {
  color: #606266;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 表单紧凑样式 */
.cancel-reason :deep(.el-form-item) {
  margin-bottom: 12px;
}

.cancel-reason :deep(.el-form-item__label) {
  font-size: 13px;
}

.cancel-reason :deep(.el-textarea__inner) {
  font-size: 13px;
}

.cancel-reason :deep(.el-input-number) {
  width: 100%;
}
</style>
