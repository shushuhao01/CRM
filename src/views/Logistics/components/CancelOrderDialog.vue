<template>
  <el-dialog
    v-model="dialogVisible"
    title="取消订单"
    width="50%"
    :before-close="handleClose"
    class="cancel-order-dialog"
  >
    <div v-if="order" class="cancel-content">
      <!-- 订单信息 -->
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
            <span class="value">{{ maskPhone(order.phone) }}</span>
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
              <el-tag :type="getStatusType(order.status)">
                {{ getStatusText(order.status) }}
              </el-tag>
            </span>
          </div>
          <div class="info-item">
            <span class="label">负责销售：</span>
            <span class="value">{{ order.createdBy || '系统用户' }}</span>
          </div>
        </div>
      </div>

      <!-- 取消原因 -->
      <div class="cancel-reason">
        <h3 class="section-title">
          <el-icon><Warning /></el-icon>
          取消原因
        </h3>
        <el-form :model="cancelForm" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="取消类型" prop="cancelType" required>
            <el-select v-model="cancelForm.cancelType" placeholder="请选择取消类型" class="full-width">
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

          <el-form-item label="取消原因" prop="reason" required>
            <el-input
              v-model="cancelForm.reason"
              type="textarea"
              :rows="4"
              placeholder="请详细说明取消原因"
              maxlength="500"
              show-word-limit
              class="full-width"
            />
          </el-form-item>

          <el-form-item label="退款处理" prop="refundType" required>
            <el-radio-group v-model="cancelForm.refundType">
              <el-radio label="full_refund">
                <span class="refund-option">
                  <strong>全额退款</strong>
                  <span class="refund-desc">退还全部定金 ¥{{ formatNumber(order.deposit) }}</span>
                </span>
              </el-radio>
              <el-radio label="partial_refund">
                <span class="refund-option">
                  <strong>部分退款</strong>
                  <span class="refund-desc">扣除手续费后退款</span>
                </span>
              </el-radio>
              <el-radio label="no_refund">
                <span class="refund-option">
                  <strong>不退款</strong>
                  <span class="refund-desc">定金不予退还</span>
                </span>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item 
            v-if="cancelForm.refundType === 'partial_refund'" 
            label="退款金额" 
            prop="refundAmount"
          >
            <el-input-number
              v-model="cancelForm.refundAmount"
              :min="0"
              :max="order.deposit"
              :precision="2"
              placeholder="退款金额"
              class="refund-input"
            />
            <span class="refund-tip">
              最大可退款金额：¥{{ formatNumber(order.deposit) }}
            </span>
          </el-form-item>

          <el-form-item label="手续费说明" prop="feeDescription" v-if="cancelForm.refundType === 'partial_refund'">
            <el-input
              v-model="cancelForm.feeDescription"
              placeholder="请说明扣除手续费的原因"
              maxlength="200"
              show-word-limit
              class="full-width"
            />
          </el-form-item>

          <el-form-item label="通知客户" prop="notifyCustomer">
            <el-switch
              v-model="cancelForm.notifyCustomer"
              active-text="发送取消通知"
              inactive-text="不发送通知"
            />
          </el-form-item>

          <el-form-item v-if="cancelForm.notifyCustomer" label="通知方式" prop="notificationMethod">
            <el-checkbox-group v-model="cancelForm.notificationMethod">
              <el-checkbox label="sms">短信通知</el-checkbox>
              <el-checkbox label="phone">电话通知</el-checkbox>
              <el-checkbox label="wechat">微信通知</el-checkbox>
              <el-checkbox label="email">邮件通知</el-checkbox>
            </el-checkbox-group>
          </el-form-item>

          <el-form-item label="备注说明" prop="remarks">
            <el-input
              v-model="cancelForm.remarks"
              type="textarea"
              :rows="3"
              placeholder="其他备注说明（选填）"
              maxlength="300"
              show-word-limit
              class="full-width"
            />
          </el-form-item>
        </el-form>
      </div>

      <!-- 取消确认 -->
      <div class="cancel-confirm">
        <el-alert
          title="取消确认"
          type="error"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>确认取消订单后，系统将：</p>
            <ul>
              <li>将订单状态更改为"已取消"</li>
              <li v-if="cancelForm.refundType === 'full_refund'">
                处理全额退款 ¥{{ formatNumber(order.deposit) }}
              </li>
              <li v-else-if="cancelForm.refundType === 'partial_refund'">
                处理部分退款 ¥{{ formatNumber(cancelForm.refundAmount) }}
              </li>
              <li v-else>
                定金不予退还
              </li>
              <li v-if="cancelForm.notifyCustomer">发送取消通知给客户</li>
              <li>记录取消原因和处理过程</li>
              <li>更新库存和销售数据</li>
            </ul>
            <p class="warning-text">
              <el-icon><WarningFilled /></el-icon>
              订单取消后无法恢复，请确认操作无误！
            </p>
          </template>
        </el-alert>
      </div>

      <!-- 历史取消记录 -->
      <div v-if="cancelHistory.length > 0" class="cancel-history">
        <h3 class="section-title">
          <el-icon><Clock /></el-icon>
          相关取消记录
        </h3>
        <div class="history-list">
          <div
            v-for="(record, index) in cancelHistory"
            :key="index"
            class="history-item"
          >
            <div class="history-header">
              <span class="history-time">{{ record.cancelTime }}</span>
              <el-tag type="danger" size="small">已取消</el-tag>
            </div>
            <div class="history-content">
              <p><strong>订单号：</strong>{{ record.orderNo }}</p>
              <p><strong>取消类型：</strong>{{ getCancelTypeText(record.cancelType) }}</p>
              <p><strong>取消原因：</strong>{{ record.reason }}</p>
              <p><strong>退款处理：</strong>{{ getRefundTypeText(record.refundType) }}</p>
              <p><strong>操作人员：</strong>{{ record.operator }}</p>
            </div>
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
import { ElMessage, ElMessageBox, FormInstance } from 'element-plus'
import { 
  Box, Warning, Clock, Document, CircleClose, WarningFilled
} from '@element-plus/icons-vue'
import { maskPhone } from '@/utils/phone'
import type { Order } from '@/stores/order'

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
    { min: 10, message: '取消原因至少10个字符', trigger: 'blur' }
  ],
  refundType: [
    { required: true, message: '请选择退款处理方式', trigger: 'change' }
  ],
  refundAmount: [
    { required: true, message: '请输入退款金额', trigger: 'blur' }
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
  return num.toLocaleString()
}

// 获取状态类型
const getStatusType = (status: string) => {
  const statusMap = {
    'pending': 'warning',
    'confirmed': 'success',
    'shipped': 'primary',
    'delivered': 'success',
    'returned': 'danger',
    'cancelled': 'info'
  }
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  const statusMap = {
    'pending': '待审核',
    'confirmed': '已确认',
    'shipped': '已发货',
    'delivered': '已送达',
    'returned': '已退回',
    'cancelled': '已取消'
  }
  return statusMap[status] || '未知状态'
}

// 获取取消类型文本
const getCancelTypeText = (cancelType: string) => {
  const typeMap = {
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

// 获取退款类型文本
const getRefundTypeText = (refundType: string) => {
  const typeMap = {
    'full_refund': '全额退款',
    'partial_refund': '部分退款',
    'no_refund': '不退款'
  }
  return typeMap[refundType] || '未知'
}

// 保存草稿
const saveAsDraft = async () => {
  try {
    ElMessage.loading('正在保存草稿...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (error) {
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
    
    // 模拟取消处理
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    const cancelData = {
      orderId: props.order.id,
      orderNo: props.order.orderNo,
      ...cancelForm,
      cancelTime: new Date().toISOString(),
      operator: '当前用户', // 应该从用户信息中获取
      status: 'cancelled'
    }
    
    emit('cancelled', cancelData)
    ElMessage.success('订单取消成功！')
    handleClose()
    
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('订单取消失败，请重试')
    }
  } finally {
    loading.value = false
  }
}

// 关闭弹窗
const handleClose = () => {
  // 重置表单
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
.cancel-order-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.cancel-content {
  font-size: 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 15px 0;
  padding-bottom: 10px;
  border-bottom: 2px solid #e4e7ed;
}

/* 订单信息样式 */
.order-summary {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.order-info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 15px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-item .label {
  font-weight: 600;
  color: #606266;
  min-width: 80px;
}

.info-item .value {
  color: #303133;
  flex: 1;
}

.cod-amount {
  color: #f56c6c;
  font-weight: bold;
}

/* 取消原因样式 */
.cancel-reason {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.full-width {
  width: 100%;
}

.refund-option {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.refund-desc {
  font-size: 12px;
  color: #909399;
}

.refund-input {
  width: 200px;
}

.refund-tip {
  margin-left: 10px;
  font-size: 12px;
  color: #909399;
}

/* 取消确认样式 */
.cancel-confirm {
  margin-bottom: 20px;
}

.cancel-confirm ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.cancel-confirm li {
  margin: 5px 0;
  color: #606266;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  color: #f56c6c;
  font-weight: bold;
}

/* 历史记录样式 */
.cancel-history {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.history-list {
  max-height: 200px;
  overflow-y: auto;
}

.history-item {
  background: white;
  border-radius: 6px;
  padding: 15px;
  margin-bottom: 10px;
  border: 1px solid #e4e7ed;
}

.history-item:last-child {
  margin-bottom: 0;
}

.history-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}

.history-time {
  font-size: 12px;
  color: #909399;
}

.history-content p {
  margin: 5px 0;
  font-size: 13px;
  color: #606266;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .order-info-grid {
    grid-template-columns: 1fr;
  }
  
  .info-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 5px;
  }
  
  .info-item .label {
    min-width: auto;
  }
}
</style>