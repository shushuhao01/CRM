<template>
  <el-dialog
    v-model="dialogVisible"
    title="发货处理"
    width="600px"
    :before-close="handleClose"
    class="shipping-dialog"
    top="8vh"
  >
    <div v-if="order" class="shipping-content-compact">
      <!-- 订单信息（紧凑卡片） -->
      <div class="order-card">
        <div class="order-header">
          <span class="order-no">{{ order.orderNo }}</span>
          <span class="cod-badge">代收 ¥{{ formatNumber(order.codAmount) }}</span>
        </div>
        <div class="order-details">
          <div class="detail-row">
            <span class="label">客户：</span>
            <span>{{ order.customerName }}</span>
            <span class="separator">|</span>
            <span>{{ displaySensitiveInfoNew(order.phone, 'phone') }}</span>
          </div>
          <div class="detail-row">
            <span class="label">地址：</span>
            <span class="address">{{ order.address }}</span>
          </div>
          <div class="detail-row">
            <span class="label">商品：</span>
            <span>{{ getProductsText() }}</span>
          </div>
        </div>
      </div>

      <!-- 物流信息表单（紧凑布局） -->
      <el-form :model="shippingForm" :rules="rules" ref="formRef" label-width="80px" size="default" class="compact-form">
        <div class="form-row">
          <el-form-item label="物流公司" prop="logisticsCompany" class="form-item-half">
            <el-select v-model="shippingForm.logisticsCompany" placeholder="选择物流公司" filterable @change="onLogisticsChange">
              <el-option v-for="c in logisticsCompanies" :key="c.code" :label="c.name" :value="c.code" />
            </el-select>
          </el-form-item>
          <el-form-item label="预计送达" prop="estimatedDelivery" class="form-item-half">
            <el-date-picker v-model="shippingForm.estimatedDelivery" type="date" placeholder="选择日期" :disabled-date="disabledDate" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="运单号" prop="trackingNumber">
          <el-input v-model="shippingForm.trackingNumber" placeholder="输入或自动生成运单号" clearable>
            <template #append>
              <el-button @click="generateTrackingNumber" type="primary" size="small">生成</el-button>
            </template>
          </el-input>
        </el-form-item>
        <div class="form-row">
          <el-form-item label="发货方式" prop="shippingMethod" class="form-item-half">
            <el-radio-group v-model="shippingForm.shippingMethod" size="small">
              <el-radio-button label="standard">标准</el-radio-button>
              <el-radio-button label="express">加急</el-radio-button>
              <el-radio-button label="economy">经济</el-radio-button>
            </el-radio-group>
          </el-form-item>
          <el-form-item label="保价金额" prop="insuranceAmount" class="form-item-half">
            <el-input-number v-model="shippingForm.insuranceAmount" :min="0" :max="order.totalAmount" :precision="2" controls-position="right" style="width: 100%" />
          </el-form-item>
        </div>
        <el-form-item label="备注" prop="remarks">
          <el-input v-model="shippingForm.remarks" type="textarea" :rows="2" placeholder="发货备注（选填）" maxlength="200" show-word-limit />
        </el-form-item>
      </el-form>

      <!-- 确认提示 -->
      <div class="confirm-tips">
        <el-icon class="tip-icon"><InfoFilled /></el-icon>
        <span>确认后订单状态将更新为"已发货"，并发送通知给客户</span>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer-compact">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmShipping" :loading="loading">
          <el-icon><Van /></el-icon>确认发货
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, reactive, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance } from 'element-plus'
import {
  Box, Van, Refresh, InfoFilled, Document
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import type { Order } from '@/stores/order'
import { useOrderStore } from '@/stores/order'
import { useNotificationStore } from '@/stores/notification'

interface ShippingData {
  logisticsCompany: string
  trackingNumber: string
  shippingMethod: string
  estimatedDelivery: string
  insuranceAmount: number
  remarks: string
}

interface Props {
  visible: boolean
  order: Order
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'shipped', data: ShippingData): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

const formRef = ref<FormInstance>()
const loading = ref(false)

// Store
const orderStore = useOrderStore()
const notificationStore = useNotificationStore()

// 发货表单
const shippingForm = reactive({
  logisticsCompany: '',
  trackingNumber: '',
  estimatedDelivery: '',
  remarks: '',
  shippingMethod: 'standard',
  insuranceAmount: 0
})

// 表单验证规则
const rules = {
  logisticsCompany: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ],
  trackingNumber: [
    { required: true, message: '请输入运单号', trigger: 'blur' },
    { min: 8, max: 20, message: '运单号长度应在8-20位之间', trigger: 'blur' }
  ]
}

// 物流公司列表 - 从API获取
const logisticsCompanies = ref<Array<{ code: string; name: string; prefix: string }>>([])
const loadingCompanies = ref(false)

// 从API加载物流公司列表
const loadLogisticsCompanies = async () => {
  loadingCompanies.value = true
  try {
    const { apiService } = await import('@/services/apiService')
    const response = await apiService.get('/logistics/companies/active')

    if (response && Array.isArray(response)) {
      logisticsCompanies.value = response.map((item: { code: string; name: string; shortName?: string }) => ({
        code: item.code,
        name: item.name,
        prefix: item.code.toUpperCase().substring(0, 2)
      }))
      console.log('[发货弹窗] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else if (response && response.data && Array.isArray(response.data)) {
      logisticsCompanies.value = response.data.map((item: { code: string; name: string; shortName?: string }) => ({
        code: item.code,
        name: item.name,
        prefix: item.code.toUpperCase().substring(0, 2)
      }))
      console.log('[发货弹窗] 从API加载物流公司列表成功:', logisticsCompanies.value.length, '个')
    } else {
      console.warn('[发货弹窗] API返回数据格式异常，使用默认列表')
      useDefaultCompanies()
    }
  } catch (error) {
    console.error('[发货弹窗] 加载物流公司列表失败:', error)
    useDefaultCompanies()
  } finally {
    loadingCompanies.value = false
  }
}

// 使用默认物流公司列表（API失败时的备用）
const useDefaultCompanies = () => {
  logisticsCompanies.value = [
    { code: 'SF', name: '顺丰速运', prefix: 'SF' },
    { code: 'YTO', name: '圆通速递', prefix: 'YT' },
    { code: 'ZTO', name: '中通快递', prefix: 'ZTO' },
    { code: 'STO', name: '申通快递', prefix: 'STO' },
    { code: 'YD', name: '韵达速递', prefix: 'YD' },
    { code: 'HTKY', name: '百世快递', prefix: 'HT' },
    { code: 'JD', name: '京东物流', prefix: 'JD' },
    { code: 'EMS', name: '中国邮政', prefix: 'EMS' }
  ]
}

// 格式化数字
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString()
}

// 获取商品文本
const getProductsText = () => {
  if (!props.order?.products || !Array.isArray(props.order.products)) return ''
  return props.order.products.map(p => `${p.name} × ${p.quantity}`).join('，')
}

// 物流公司变化
const onLogisticsChange = (value: string) => {
  // 清空运单号，让用户重新输入或生成
  shippingForm.trackingNumber = ''

  // 如果预计送达时间未设置，则设置为3天后（默认值）
  // 如果已设置，则保持用户的选择
  if (!shippingForm.estimatedDelivery) {
    initEstimatedDelivery()
  }
}

// 获取预计送达天数
const getDeliveryDays = (companyCode: string) => {
  const deliveryMap = {
    'SF': 1, // 顺丰次日达
    'JD': 1, // 京东次日达
    'YTO': 2,
    'ZTO': 2,
    'STO': 2,
    'YD': 2,
    'HTKY': 3,
    'EMS': 3,
    'DBKD': 2,
    'UC': 3
  }
  return deliveryMap[companyCode] || 3
}

// 生成运单号
const generateTrackingNumber = () => {
  if (!shippingForm.logisticsCompany) {
    ElMessage.warning('请先选择物流公司')
    return
  }

  const company = logisticsCompanies.value.find(c => c.code === shippingForm.logisticsCompany)
  if (company) {
    const timestamp = Date.now().toString()
    const random = Math.random().toString(36).substring(2, 6).toUpperCase()
    shippingForm.trackingNumber = `${company.prefix}${timestamp.slice(-8)}${random}`
  }
}

// 禁用日期（不能选择今天之前的日期）
const disabledDate = (time: Date) => {
  return time.getTime() < Date.now() - 24 * 60 * 60 * 1000
}

// 保存草稿
const saveAsDraft = async () => {
  try {
    // 模拟保存草稿
    ElMessage.loading('正在保存草稿...')
    await new Promise(resolve => setTimeout(resolve, 1000))
    ElMessage.success('草稿保存成功')
  } catch (error) {
    ElMessage.error('草稿保存失败')
  }
}

// 确认发货
const confirmShipping = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    await ElMessageBox.confirm(
      `确认发货订单 ${props.order.orderNo} 吗？发货后将无法撤销。`,
      '确认发货',
      {
        confirmButtonText: '确认发货',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    const companyName = logisticsCompanies.value.find(c => c.code === shippingForm.logisticsCompany)?.name || shippingForm.logisticsCompany

    // 🔥 修复：调用后端API更新订单状态到数据库
    const { orderApi } = await import('@/api/order')
    const orderId = props.order.id

    console.log('[发货] 调用后端API更新订单状态:', {
      orderId,
      status: 'shipped',
      trackingNumber: shippingForm.trackingNumber,
      expressCompany: companyName
    })

    // 调用后端API更新订单状态
    await orderApi.update(orderId, {
      status: 'shipped',
      trackingNumber: shippingForm.trackingNumber,
      expressCompany: companyName,
      shippedAt: new Date().toISOString(),
      remark: shippingForm.remarks || `已发货，快递公司：${companyName}，运单号：${shippingForm.trackingNumber}`
    })

    console.log('[发货] 后端API更新成功')

    const shippingData = {
      orderId: props.order.id,
      orderNo: props.order.orderNo,
      ...shippingForm,
      shippingTime: new Date().toISOString(),
      status: 'shipped'
    }

    // 同步更新前端store
    orderStore.syncOrderStatus(
      orderId,
      'shipped',
      '物流员',
      `订单已发货，快递公司：${companyName}，快递单号：${shippingForm.trackingNumber}`
    )

    // 发送订单已发货消息通知
    notificationStore.sendMessage(
      notificationStore.MessageType.ORDER_SHIPPED,
      `订单 ${props.order.orderNo} 已发货，快递公司：${companyName}，快递单号：${shippingForm.trackingNumber}`,
      {
        relatedId: props.order.id,
        relatedType: 'order',
        actionUrl: `/order/detail/${props.order.id}`
      }
    )

    // 🔥 触发订单发货事件，通知其他页面刷新
    window.dispatchEvent(new CustomEvent('order-shipped', {
      detail: {
        orderId: props.order.id,
        orderNo: props.order.orderNo,
        status: 'shipped',
        trackingNumber: shippingForm.trackingNumber,
        expressCompany: companyName
      }
    }))

    emit('shipped', shippingData)
    ElMessage.success('发货成功！已通知客户')
    handleClose()

  } catch (error: any) {
    console.error('[发货] 发货失败:', error)
    if (error !== 'cancel') {
      ElMessage.error(error?.message || '发货失败，请重试')
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
  Object.assign(shippingForm, {
    logisticsCompany: '',
    trackingNumber: '',
    estimatedDelivery: '',
    remarks: '',
    shippingMethod: 'standard',
    insuranceAmount: 0
  })

  dialogVisible.value = false
}

// 初始化预计送达时间为3天后
const initEstimatedDelivery = () => {
  const today = new Date()
  const threeDaysLater = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000)
  shippingForm.estimatedDelivery = threeDaysLater.toISOString().split('T')[0]
}

// 监听弹窗打开，初始化默认值
watch(() => props.visible, async (newVal) => {
  if (newVal) {
    // 加载物流公司列表
    if (logisticsCompanies.value.length === 0) {
      await loadLogisticsCompanies()
    }
    // 设置默认保价金额为订单总金额的80%
    if (props.order?.totalAmount) {
      shippingForm.insuranceAmount = Math.round(props.order.totalAmount * 0.8)
    }
    // 设置默认预计送达时间为3天后
    initEstimatedDelivery()
  }
}, { immediate: true })

onMounted(async () => {
  // 加载物流公司列表
  await loadLogisticsCompanies()
  // 设置默认保价金额为订单总金额的80%
  if (props.order?.totalAmount) {
    shippingForm.insuranceAmount = Math.round(props.order.totalAmount * 0.8)
  }
  // 设置默认预计送达时间为3天后
  initEstimatedDelivery()
})
</script>

<style scoped>
/* 紧凑对话框样式 */
.shipping-dialog {
  :deep(.el-dialog__header) {
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  :deep(.el-dialog__body) {
    padding: 16px 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
  :deep(.el-dialog__footer) {
    padding: 12px 20px;
    border-top: 1px solid #f0f0f0;
  }
}

.shipping-content-compact {
  font-size: 14px;
}

/* 订单卡片 */
.order-card {
  background: #f8fafc;
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
  border: 1px solid #e5e7eb;
}
.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 10px;
}
.order-no {
  font-weight: 600;
  color: #333;
  font-size: 15px;
}
.cod-badge {
  background: #fef3cd;
  color: #856404;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}
.order-details {
  font-size: 13px;
  color: #666;
}
.detail-row {
  margin-bottom: 6px;
  display: flex;
  align-items: flex-start;
}
.detail-row .label {
  color: #999;
  min-width: 45px;
}
.detail-row .separator {
  margin: 0 8px;
  color: #ddd;
}
.detail-row .address {
  flex: 1;
  word-break: break-all;
}

/* 紧凑表单 */
.compact-form {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
  border: 1px solid #eee;
  margin-bottom: 16px;
}
.form-row {
  display: flex;
  gap: 16px;
}
.form-item-half {
  flex: 1;
}
.form-item-half :deep(.el-select),
.form-item-half :deep(.el-date-editor) {
  width: 100%;
}

/* 确认提示 */
.confirm-tips {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  background: #e6f7ff;
  border-radius: 6px;
  color: #0958d9;
  font-size: 13px;
}
.tip-icon {
  color: #1890ff;
  font-size: 16px;
}

/* 底部按钮 */
.dialog-footer-compact {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
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
