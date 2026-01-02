<template>
  <el-dialog
    v-model="dialogVisible"
    title="退回订单"
    width="800px"
    :before-close="handleClose"
    class="return-order-dialog"
  >
    <div v-if="order" class="return-content">
      <!-- 订单信息 + 退回原因 并排 -->
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
              <span class="value">{{ order.orderNumber }}</span>
            </div>
            <div class="info-item">
              <span class="label">客户姓名：</span>
              <span class="value">{{ order.customerName }}</span>
            </div>
            <div class="info-item">
              <span class="label">联系电话：</span>
              <span class="value">{{ displaySensitiveInfoNew(order.customerPhone || order.receiverPhone, SensitiveInfoType.PHONE) }}</span>
            </div>
            <div class="info-item">
              <span class="label">订单金额：</span>
              <span class="value">¥{{ formatNumber(order.totalAmount) }}</span>
            </div>
            <div class="info-item">
              <span class="label">定金：</span>
              <span class="value">¥{{ formatNumber(order.depositAmount) }}</span>
            </div>
            <div class="info-item">
              <span class="label">代收款：</span>
              <span class="value cod-amount">¥{{ formatNumber(order.collectAmount) }}</span>
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
              <span class="value">{{ getSalesPersonName() }}</span>
            </div>
          </div>
        </div>

        <!-- 右侧：退回原因表单 -->
        <div class="return-reason">
          <h3 class="section-title">
            <el-icon><Warning /></el-icon>
            退回原因
          </h3>
          <el-form :model="returnForm" :rules="rules" ref="formRef" label-width="80px" size="default">
            <el-row :gutter="16">
              <el-col :span="12">
                <el-form-item label="退回类型" prop="returnType" required>
                  <el-select v-model="returnForm.returnType" placeholder="请选择" class="full-width">
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
              </el-col>
              <el-col :span="12">
                <el-form-item label="紧急程度" prop="urgency">
                  <el-radio-group v-model="returnForm.urgency" class="urgency-group">
                    <el-radio label="low"><el-tag type="info" size="small">一般</el-tag></el-radio>
                    <el-radio label="medium"><el-tag type="warning" size="small">紧急</el-tag></el-radio>
                    <el-radio label="high"><el-tag type="danger" size="small">非常紧急</el-tag></el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-col>
            </el-row>

            <el-form-item label="退回原因" prop="reason" required>
              <el-input
                v-model="returnForm.reason"
                type="textarea"
                :rows="2"
                placeholder="请详细说明退回原因，以便销售人员及时处理"
                maxlength="500"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="处理建议" prop="suggestion">
              <el-input
                v-model="returnForm.suggestion"
                type="textarea"
                :rows="2"
                placeholder="请提供处理建议（选填）"
                maxlength="300"
                show-word-limit
              />
            </el-form-item>

            <el-form-item label="通知方式" prop="notificationMethod">
              <el-checkbox-group v-model="returnForm.notificationMethod">
                <el-checkbox label="system">系统消息</el-checkbox>
                <el-checkbox label="email">邮件</el-checkbox>
                <el-checkbox label="sms">短信</el-checkbox>
                <el-checkbox label="wechat">微信</el-checkbox>
              </el-checkbox-group>
            </el-form-item>
          </el-form>
        </div>
      </div>

      <!-- 底部：退回确认 + 历史记录 并排 -->
      <div class="bottom-section">
        <div class="return-confirm">
          <el-alert title="退回确认" type="warning" :closable="false" show-icon>
            <template #default>
              <div class="confirm-content">
                <span>确认后：订单状态改为"已退回" → 通知下单员 → 记录原因和操作人</span>
                <span class="warning-text">
                  <el-icon><WarningFilled /></el-icon>
                  退回后订单将从发货列表移除！
                </span>
              </div>
            </template>
          </el-alert>
        </div>

        <div v-if="returnHistory.length > 0" class="return-history">
          <div class="history-header-title">
            <el-icon><Clock /></el-icon>
            历史退回记录
          </div>
          <div class="history-item" v-for="(record, index) in returnHistory" :key="index">
            <span class="history-time">{{ record.returnTime }}</span>
            <el-tag :type="getUrgencyType(record.urgency)" size="small">{{ getUrgencyText(record.urgency) }}</el-tag>
            <span class="history-reason">{{ getReturnTypeText(record.returnType) }}：{{ record.reason }}</span>
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
import { displaySensitiveInfo as displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import type { Order } from '@/stores/order'
import { useUserStore } from '@/stores/user'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'

interface Props {
  visible: boolean
  order: Order
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'returned', data: any): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const userStore = useUserStore()

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
const returnHistory = ref<any[]>([])

// 获取销售人员名称
const getSalesPersonName = () => {
  // 优先使用 createdByName，其次使用 createdBy
  const order = props.order as any
  return order.createdByName || order.createdBy || order.salesPersonName || '未分配'
}

// 获取当前操作人名称
const getCurrentOperatorName = () => {
  return userStore.currentUser?.realName || userStore.currentUser?.name || '系统用户'
}

// 格式化数字
const formatNumber = (num: number) => {
  return num?.toLocaleString() || '0'
}

// 获取紧急程度类型
const getUrgencyType = (urgency: string) => {
  const urgencyMap: Record<string, string> = {
    'low': 'info',
    'medium': 'warning',
    'high': 'danger'
  }
  return urgencyMap[urgency] || 'info'
}

// 获取紧急程度文本
const getUrgencyText = (urgency: string) => {
  const urgencyMap: Record<string, string> = {
    'low': '一般',
    'medium': '紧急',
    'high': '非常紧急'
  }
  return urgencyMap[urgency] || '一般'
}

// 获取退回类型文本
const getReturnTypeText = (returnType: string) => {
  const typeMap: Record<string, string> = {
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
  ElMessage.success('草稿保存成功')
}

// 确认退回
const confirmReturn = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    await ElMessageBox.confirm(
      `确认退回订单 ${props.order.orderNumber} 吗？退回后订单将重新分配给销售人员处理。`,
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
      orderNo: props.order.orderNumber,
      ...returnForm,
      returnTime: new Date().toISOString(),
      operator: getCurrentOperatorName(),
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
.return-order-dialog :deep(.el-dialog__body) {
  padding: 16px 20px;
}

.return-content {
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

.return-reason {
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

.urgency-group {
  display: flex;
  gap: 8px;
}

.urgency-group :deep(.el-radio) {
  margin-right: 0;
}

.bottom-section {
  display: flex;
  gap: 16px;
}

.return-confirm {
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
  color: #e6a23c;
  font-weight: 600;
}

.return-history {
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
.return-reason :deep(.el-form-item) {
  margin-bottom: 12px;
}

.return-reason :deep(.el-form-item__label) {
  font-size: 13px;
}

.return-reason :deep(.el-textarea__inner) {
  font-size: 13px;
}
</style>
