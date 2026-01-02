<template>
  <el-dialog
    v-model="dialogVisible"
    title="退回订单"
    width="50%"
    :before-close="handleClose"
    class="return-order-dialog"
  >
    <div v-if="order" class="return-content">
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
            <span class="value">{{ displaySensitiveInfoNew(order.phone, 'phone') }}</span>
          </div>
          <div class="info-item">
            <span class="label">订单金额：</span>
            <span class="value">¥{{ formatNumber(order.totalAmount) }}</span>
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
            <span class="value">{{ order.salesperson || '未分配' }}</span>
          </div>
        </div>
      </div>

      <!-- 退回原因 -->
      <div class="return-reason">
        <h3 class="section-title">
          <el-icon><Warning /></el-icon>
          退回原因
        </h3>
        <el-form :model="returnForm" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="退回类型" prop="returnType" required>
            <el-select v-model="returnForm.returnType" placeholder="请选择退回类型" class="full-width">
              <el-option label="地址信息错误" value="address_error" />
              <el-option label="客户信息不符" value="customer_info_error" />
              <el-option label="商品信息错误" value="product_error" />
              <el-option label="价格信息错误" value="price_error" />
              <el-option label="库存不足" value="stock_shortage" />
              <el-option label="客户要求修改" value="customer_request" />
              <el-option label="物流配送问题" value="logistics_issue" />
              <el-option label="其他原因" value="other" />
            </el-select>
          </el-form-item>

          <el-form-item label="退回原因" prop="reason" required>
            <el-input
              v-model="returnForm.reason"
              type="textarea"
              :rows="4"
              placeholder="请详细说明退回原因，以便销售人员及时处理"
              maxlength="500"
              show-word-limit
              class="full-width"
            />
          </el-form-item>

          <el-form-item label="紧急程度" prop="urgency">
            <el-radio-group v-model="returnForm.urgency">
              <el-radio label="low">
                <el-tag type="info" size="small">一般</el-tag>
                <span class="urgency-desc">可在1-2个工作日内处理</span>
              </el-radio>
              <el-radio label="medium">
                <el-tag type="warning" size="small">紧急</el-tag>
                <span class="urgency-desc">需要当天处理</span>
              </el-radio>
              <el-radio label="high">
                <el-tag type="danger" size="small">非常紧急</el-tag>
                <span class="urgency-desc">需要立即处理</span>
              </el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="处理建议" prop="suggestion">
            <el-input
              v-model="returnForm.suggestion"
              type="textarea"
              :rows="3"
              placeholder="请提供处理建议（选填）"
              maxlength="300"
              show-word-limit
              class="full-width"
            />
          </el-form-item>

          <el-form-item label="通知方式" prop="notificationMethod">
            <el-checkbox-group v-model="returnForm.notificationMethod">
              <el-checkbox label="system">系统消息</el-checkbox>
              <el-checkbox label="email">邮件通知</el-checkbox>
              <el-checkbox label="sms">短信通知</el-checkbox>
              <el-checkbox label="wechat">微信通知</el-checkbox>
            </el-checkbox-group>
          </el-form-item>
        </el-form>
      </div>

      <!-- 退回确认 -->
      <div class="return-confirm">
        <el-alert
          title="退回确认"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>确认退回订单后，系统将：</p>
            <ul>
              <li>将订单状态更改为"已退回"</li>
              <li>订单将重新分配给负责销售人员</li>
              <li>发送退回通知给相关人员</li>
              <li>记录退回原因和处理建议</li>
              <li>生成退回处理任务</li>
            </ul>
            <p class="warning-text">
              <el-icon><WarningFilled /></el-icon>
              退回后订单将从发货列表中移除，请确认退回原因准确无误！
            </p>
          </template>
        </el-alert>
      </div>

      <!-- 历史退回记录 -->
      <div v-if="returnHistory.length > 0" class="return-history">
        <h3 class="section-title">
          <el-icon><Clock /></el-icon>
          历史退回记录
        </h3>
        <div class="history-list">
          <div
            v-for="(record, index) in returnHistory"
            :key="index"
            class="history-item"
          >
            <div class="history-header">
              <span class="history-time">{{ record.returnTime }}</span>
              <el-tag :type="getUrgencyType(record.urgency)" size="small">
                {{ getUrgencyText(record.urgency) }}
              </el-tag>
            </div>
            <div class="history-content">
              <p><strong>退回类型：</strong>{{ getReturnTypeText(record.returnType) }}</p>
              <p><strong>退回原因：</strong>{{ record.reason }}</p>
              <p v-if="record.suggestion"><strong>处理建议：</strong>{{ record.suggestion }}</p>
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
        <el-button type="danger" @click="confirmReturn" :loading="loading">
          <el-icon><RefreshLeft /></el-icon>
          确认退回
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  Box, Warning, Clock, Document, RefreshLeft, WarningFilled
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import type { Order } from '@/stores/order'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'

interface ReturnData {
  returnReason: string
  returnDescription: string
  returnType: string
  refundAmount: number
  returnAddress: string
  contactPhone: string
  remarks: string
}

interface Props {
  visible: boolean
  order: Order
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'returned', data: ReturnData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formRef = ref<FormInstance>()
const loading = ref(false)

// 退回表单
const returnForm = reactive({
  returnType: '',
  reason: '',
  urgency: 'medium',
  suggestion: '',
  notificationMethod: ['system']
})

// 表单验证规则
const rules = {
  returnType: [
    { required: true, message: '请选择退回类型', trigger: 'change' }
  ],
  reason: [
    { required: true, message: '请填写退回原因', trigger: 'blur' },
    { min: 2, message: '退回原因至少2个字符', trigger: 'blur' }
  ]
}

// 历史退回记录（模拟数据）
const returnHistory = ref([
  {
    returnTime: '2024-01-10 14:30:00',
    returnType: 'address_error',
    reason: '客户地址信息不完整，缺少详细门牌号',
    suggestion: '联系客户补充完整地址信息',
    urgency: 'medium',
    operator: '张三'
  }
])

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

// 获取紧急程度类型
const getUrgencyType = (urgency: string) => {
  const urgencyMap = {
    'low': 'info',
    'medium': 'warning',
    'high': 'danger'
  }
  return urgencyMap[urgency] || 'info'
}

// 获取紧急程度文本
const getUrgencyText = (urgency: string) => {
  const urgencyMap = {
    'low': '一般',
    'medium': '紧急',
    'high': '非常紧急'
  }
  return urgencyMap[urgency] || '一般'
}

// 获取退回类型文本
const getReturnTypeText = (returnType: string) => {
  const typeMap = {
    'address_error': '地址信息错误',
    'customer_info_error': '客户信息不符',
    'product_error': '商品信息错误',
    'price_error': '价格信息错误',
    'stock_shortage': '库存不足',
    'customer_request': '客户要求修改',
    'logistics_issue': '物流配送问题',
    'other': '其他原因'
  }
  return typeMap[returnType] || '未知类型'
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

// 确认退回
const confirmReturn = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    await ElMessageBox.confirm(
      `确认退回订单 ${props.order.orderNo} 吗？退回后订单将重新分配给销售人员处理。`,
      '确认退回订单',
      {
        confirmButtonText: '确认退回',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    const returnData = {
      orderId: props.order.id,
      orderNo: props.order.orderNo,
      ...returnForm,
      returnTime: new Date().toISOString(),
      operator: '当前用户', // 应该从用户信息中获取
      status: 'returned'
    }

    emit('returned', returnData)
    handleClose()

  } catch (error) {
    if (error !== 'cancel') {
      console.error('[退回订单] 操作失败:', error)
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
  Object.assign(returnForm, {
    returnType: '',
    reason: '',
    urgency: 'medium',
    suggestion: '',
    notificationMethod: ['system']
  })

  dialogVisible.value = false
}
</script>

<style scoped>
.return-order-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.return-content {
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

/* 退回原因样式 */
.return-reason {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.full-width {
  width: 100%;
}

.urgency-desc {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

/* 退回确认样式 */
.return-confirm {
  margin-bottom: 20px;
}

.return-confirm ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.return-confirm li {
  margin: 5px 0;
  color: #606266;
}

.warning-text {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 10px;
  color: #e6a23c;
  font-weight: bold;
}

/* 历史记录样式 */
.return-history {
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
