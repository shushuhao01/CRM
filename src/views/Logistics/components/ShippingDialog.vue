<template>
  <el-dialog
    v-model="dialogVisible"
    title="发货处理"
    width="50%"
    :before-close="handleClose"
    class="shipping-dialog"
  >
    <div v-if="order" class="shipping-content">
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
            <span class="label">收货地址：</span>
            <span class="value">{{ order.address }}</span>
          </div>
          <div class="info-item">
            <span class="label">商品信息：</span>
            <span class="value">{{ getProductsText() }}</span>
          </div>
          <div class="info-item">
            <span class="label">代收款金额：</span>
            <span class="value cod-amount">¥{{ formatNumber(order.codAmount) }}</span>
          </div>
        </div>
      </div>

      <!-- 物流信息 -->
      <div class="logistics-form">
        <h3 class="section-title">
          <el-icon><Van /></el-icon>
          物流信息
        </h3>
        <el-form :model="shippingForm" :rules="rules" ref="formRef" label-width="120px">
          <el-form-item label="物流公司" prop="logisticsCompany" required>
            <el-select
              v-model="shippingForm.logisticsCompany"
              placeholder="请选择物流公司"
              class="full-width"
              filterable
              @change="onLogisticsChange"
            >
              <el-option
                v-for="company in logisticsCompanies"
                :key="company.code"
                :label="company.name"
                :value="company.code"
              >
                <div class="company-option">
                  <span class="company-name">{{ company.name }}</span>
                  <span class="company-code">({{ company.code }})</span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="运单号" prop="trackingNumber" required>
            <el-input
              v-model="shippingForm.trackingNumber"
              placeholder="请输入运单号"
              class="full-width"
              clearable
            >
              <template #append>
                <el-button @click="generateTrackingNumber" type="primary">
                  <el-icon><Refresh /></el-icon>
                  生成
                </el-button>
              </template>
            </el-input>
            <div class="tracking-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>运单号可以手动输入或点击生成按钮自动生成</span>
            </div>
          </el-form-item>

          <el-form-item label="预计送达" prop="estimatedDelivery">
            <el-date-picker
              v-model="shippingForm.estimatedDelivery"
              type="date"
              placeholder="选择预计送达日期"
              class="full-width"
              :disabled-date="disabledDate"
            />
          </el-form-item>

          <el-form-item label="发货备注" prop="remarks">
            <el-input
              v-model="shippingForm.remarks"
              type="textarea"
              :rows="3"
              placeholder="请输入发货备注（选填）"
              maxlength="200"
              show-word-limit
              class="full-width"
            />
          </el-form-item>

          <el-form-item label="发货方式" prop="shippingMethod">
            <el-radio-group v-model="shippingForm.shippingMethod">
              <el-radio label="standard">标准快递</el-radio>
              <el-radio label="express">加急快递</el-radio>
              <el-radio label="economy">经济快递</el-radio>
            </el-radio-group>
          </el-form-item>

          <el-form-item label="保价金额" prop="insuranceAmount">
            <el-input-number
              v-model="shippingForm.insuranceAmount"
              :min="0"
              :max="order.totalAmount"
              :precision="2"
              placeholder="保价金额"
              class="full-width"
            />
            <div class="insurance-tip">
              <el-icon><InfoFilled /></el-icon>
              <span>建议保价金额不超过订单总金额 ¥{{ formatNumber(order.totalAmount) }}</span>
            </div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 发货确认 -->
      <div class="shipping-confirm">
        <el-alert
          title="发货确认"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <p>确认发货后，系统将：</p>
            <ul>
              <li>更新订单状态为"已发货"</li>
              <li>记录物流信息和运单号</li>
              <li>发送发货通知给客户</li>
              <li>开始物流跟踪</li>
            </ul>
          </template>
        </el-alert>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="info" @click="saveAsDraft">
          <el-icon><Document /></el-icon>
          保存草稿
        </el-button>
        <el-button type="primary" @click="confirmShipping" :loading="loading">
          <el-icon><Van /></el-icon>
          确认发货
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
    await orderApi.updateOrder(orderId, {
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
.shipping-dialog {
  :deep(.el-dialog__body) {
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.shipping-content {
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
  font-size: 16px;
}

/* 物流表单样式 */
.logistics-form {
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
  margin-bottom: 20px;
}

.full-width {
  width: 100%;
}

.company-option {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.company-name {
  font-weight: 600;
}

.company-code {
  color: #909399;
  font-size: 12px;
}

.tracking-tip,
.insurance-tip {
  display: flex;
  align-items: center;
  gap: 5px;
  margin-top: 5px;
  font-size: 12px;
  color: #909399;
}

/* 发货确认样式 */
.shipping-confirm {
  margin-bottom: 20px;
}

.shipping-confirm ul {
  margin: 10px 0 0 20px;
  padding: 0;
}

.shipping-confirm li {
  margin: 5px 0;
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
