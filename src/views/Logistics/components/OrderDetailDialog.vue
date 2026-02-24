<template>
  <el-dialog
    v-model="dialogVisible"
    title="订单详情"
    width="720px"
    :before-close="handleClose"
    class="order-detail-dialog"
    top="8vh"
  >
    <div v-if="order" class="order-detail-content">
      <!-- 订单基本信息 -->
      <div class="section-card">
        <div class="section-title">
          <el-icon><Document /></el-icon>
          <span>订单基本信息</span>
        </div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">订单号：</span>
              <span class="info-value">{{ getOrderNo() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">订单状态：</span>
              <el-tag :style="getOrderStatusStyle(order.status)" size="small" effect="plain">
                {{ getUnifiedStatusText(order.status) }}
              </el-tag>
            </div>
            <div class="info-item">
              <span class="info-label">客户姓名：</span>
              <span class="info-value">{{ order.customerName || '-' }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">联系电话：</span>
              <span class="info-value phone">{{ getPhone() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">下单日期：</span>
              <span class="info-value">{{ getOrderDate() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">归属人：</span>
              <span class="info-value">{{ getAssignedTo() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">客服微信号：</span>
              <span class="info-value">{{ getServiceWechat() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">订单来源：</span>
              <span class="info-value">{{ getOrderSourceText() }}</span>
            </div>
            <div class="info-item full-width">
              <span class="info-label">收货地址：</span>
              <span class="info-value address">{{ getReceiverAddress() }}</span>
            </div>
            <div class="info-item" v-if="getDesignatedExpress() !== '-'">
              <span class="info-label">指定快递：</span>
              <span class="info-value express-highlight">{{ getDesignatedExpress() }}</span>
            </div>
            <div class="info-item" v-if="order.treatmentStandard">
              <span class="info-label">调理标准：</span>
              <span class="info-value">{{ order.treatmentStandard }}</span>
            </div>
            <div class="info-item" v-if="order.usageDays">
              <span class="info-label">用药天数：</span>
              <span class="info-value">{{ order.usageDays }} 天</span>
            </div>
            <div class="info-item" v-if="order.auxiliaryCount">
              <span class="info-label">辅导行数：</span>
              <span class="info-value">{{ order.auxiliaryCount }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 物流信息 -->
      <div class="section-card" v-if="hasLogisticsInfo()">
        <div class="section-title">
          <el-icon><Van /></el-icon>
          <span>物流信息</span>
        </div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item">
              <span class="info-label">快递单号：</span>
              <span class="info-value tracking-no">{{ getTrackingNo() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">快递公司：</span>
              <span class="info-value">{{ getExpressCompanyDisplay() }}</span>
            </div>
            <div class="info-item full-width" v-if="order.latestUpdate || order.latestLogistics">
              <span class="info-label">最新动态：</span>
              <span class="info-value logistics-update">{{ order.latestUpdate || order.latestLogistics }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 商品信息 -->
      <div class="section-card">
        <div class="section-title">
          <el-icon><Box /></el-icon>
          <span>商品信息</span>
        </div>
        <div class="section-body">
          <div class="info-grid">
            <div class="info-item" style="grid-column: span 2;">
              <span class="info-label">商品名称：</span>
              <span class="info-value product-name">{{ getProductName() }}</span>
            </div>
            <div class="info-item">
              <span class="info-label">数量：</span>
              <span class="info-value">{{ getProductQuantity() }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="section-card">
        <div class="section-title">
          <el-icon><Money /></el-icon>
          <span>金额信息</span>
        </div>
        <div class="section-body">
          <div class="amount-grid">
            <div class="amount-item">
              <span class="amount-label">订单金额</span>
              <span class="amount-value main">¥{{ formatNumber(order.totalAmount || order.amount) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">定金</span>
              <span class="amount-value">¥{{ formatNumber(order.deposit || order.depositAmount || 0) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">代收金额</span>
              <span class="amount-value cod">¥{{ formatNumber(order.codAmount || order.collectAmount || 0) }}</span>
            </div>
            <div class="amount-item">
              <span class="amount-label">支付方式</span>
              <span class="amount-value">{{ getPaymentMethodText(order.paymentMethod) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单备注 -->
      <div class="section-card" v-if="order.remark">
        <div class="section-title">
          <el-icon><ChatDotRound /></el-icon>
          <span>订单备注</span>
        </div>
        <div class="section-body">
          <div class="remark-content" v-html="highlightKeywords(order.remark)"></div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button type="primary" @click="goToOrderDetail">
          <el-icon><View /></el-icon>
          查看完整详情
        </el-button>
        <el-button v-if="showActionButtons" type="warning" @click="handleSetTodo">
          <el-icon><Timer /></el-icon>
          设置待办
        </el-button>
        <el-button v-if="showActionButtons" type="success" @click="handleUpdateStatus">
          <el-icon><Edit /></el-icon>
          更新状态
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRouter } from 'vue-router'
import {
  Document, Box, Money, Timer, Edit, Van, ChatDotRound, View
} from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { useOrderStore } from '@/stores/order'

const router = useRouter()
const orderStore = useOrderStore()

interface Props {
  visible: boolean
  order: any
  showActionButtons?: boolean
}

interface Emits {
  (e: 'update:visible', value: boolean): void
  (e: 'update-status', order: any): void
  (e: 'set-todo', order: unknown): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

const dialogVisible = computed({
  get: () => props.visible,
  set: (value) => emit('update:visible', value)
})

// 获取完整订单信息
const getFullOrderInfo = () => {
  if (!props.order) return null
  const orderId = props.order.id
  const orderNo = props.order.orderNo || props.order.orderNumber
  const orders = orderStore.getOrders()
  return orders.find((o: any) => o.id === orderId || o.orderNumber === orderNo) || props.order
}

// 获取订单号
const getOrderNo = () => props.order?.orderNo || props.order?.orderNumber || '-'

// 获取电话
const getPhone = () => {
  const phone = props.order?.phone || props.order?.customerPhone || props.order?.receiverPhone
  if (!phone) return '-'
  return displaySensitiveInfoNew(phone, SensitiveInfoType.PHONE)
}

// 获取下单日期
const getOrderDate = () => props.order?.createTime || props.order?.orderDate || props.order?.shippingTime || '-'

// 获取归属人
const getAssignedTo = () => {
  return props.order?.assignedToName || props.order?.createdByName || props.order?.salesPersonName ||
         props.order?.assignedTo || props.order?.createdBy || '-'
}

// 获取客服微信号
const getServiceWechat = () => {
  const fullOrder = getFullOrderInfo()
  return fullOrder?.serviceWechat || props.order?.serviceWechat || '-'
}

// 获取订单来源文本
const getOrderSourceText = () => {
  const fullOrder = getFullOrderInfo()
  const source = fullOrder?.orderSource || props.order?.orderSource
  if (!source) return '-'
  const sourceMap: Record<string, string> = {
    online_store: '线上商城',
    wechat_mini: '微信小程序',
    wechat_service: '微信客服',
    phone_call: '电话咨询',
    offline_store: '线下门店',
    referral: '客户推荐',
    advertisement: '广告投放',
    other: '其他渠道'
  }
  return sourceMap[source] || source
}

// 获取指定快递
const getDesignatedExpress = () => {
  const fullOrder = getFullOrderInfo()
  const expressCode = fullOrder?.designatedExpress || fullOrder?.expressCompany ||
                      props.order?.designatedExpress || props.order?.expressCompany || props.order?.logisticsCompany
  if (!expressCode) return '-'
  return getExpressCompanyName(expressCode) || expressCode
}

// 获取收货地址
const getReceiverAddress = () => {
  const fullOrder = getFullOrderInfo()
  if (fullOrder?.receiverAddress) return fullOrder.receiverAddress
  if (fullOrder?.address) return fullOrder.address
  if (props.order?.address) return props.order.address
  if (props.order?.receiverAddress) return props.order.receiverAddress
  const orderData = fullOrder || props.order
  if (orderData?.province || orderData?.city || orderData?.district) {
    const parts = [orderData.province, orderData.city, orderData.district, orderData.street, orderData.detailAddress].filter(Boolean)
    if (parts.length > 0) return parts.join('')
  }
  return '-'
}

// 是否有物流信息
const hasLogisticsInfo = () => !!(props.order?.expressNo || props.order?.trackingNumber || props.order?.trackingNo)

// 获取快递单号
const getTrackingNo = () => props.order?.expressNo || props.order?.trackingNumber || props.order?.trackingNo || '-'

// 获取快递公司显示名称
const getExpressCompanyDisplay = () => {
  const code = props.order?.expressCompany || props.order?.logisticsCompany
  if (!code) return '-'
  return getExpressCompanyName(code) || code
}

// 获取商品名称
const getProductName = () => {
  if (props.order?.productsText) return props.order.productsText
  if (props.order?.productName) return props.order.productName
  if (props.order?.products?.length > 0) {
    return props.order.products.map((p: any) => `${p.name} × ${p.quantity}`).join('，')
  }
  const fullOrder = getFullOrderInfo()
  if (fullOrder?.products?.length > 0) {
    return fullOrder.products.map((p: any) => `${p.name} × ${p.quantity}`).join('，')
  }
  return '-'
}

// 获取商品数量
const getProductQuantity = () => {
  if (props.order?.totalQuantity) return props.order.totalQuantity
  if (props.order?.quantity) return props.order.quantity
  if (props.order?.products?.length > 0) {
    return props.order.products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)
  }
  const fullOrder = getFullOrderInfo()
  if (fullOrder?.products?.length > 0) {
    return fullOrder.products.reduce((sum: number, p: any) => sum + (p.quantity || 0), 0)
  }
  return 0
}

// 格式化数字
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) return '0'
  return num.toLocaleString()
}

// 获取支付方式文本
const getPaymentMethodText = (method: string | null | undefined) => {
  if (!method) return '-'
  const methodMap: Record<string, string> = {
    wechat: '微信支付', alipay: '支付宝', bank_transfer: '银行转账',
    unionpay: '云闪付', cod: '货到付款', cash: '现金', card: '刷卡', other: '其他'
  }
  return methodMap[method] || method
}

// 获取快递公司名称
const getExpressCompanyName = (code: string | null | undefined) => {
  if (!code) return null
  const companyMap: Record<string, string> = {
    SF: '顺丰速运', YTO: '圆通速递', ZTO: '中通快递', STO: '申通快递',
    YD: '韵达快递', HTKY: '百世快递', JD: '京东物流', EMS: 'EMS',
    DBKD: '德邦快递', UC: '优速快递', shunfeng: '顺丰速运', yuantong: '圆通速递',
    zhongtong: '中通快递', shentong: '申通快递', yunda: '韵达快递', jd: '京东物流',
    ems: 'EMS', debang: '德邦快递'
  }
  return companyMap[code] || code
}

// 高亮关键词
const highlightKeywords = (text: string) => {
  if (!text) return ''
  const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#x27;')
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = escaped
  keywords.forEach(keyword => {
    result = result.replace(new RegExp(keyword, 'gi'), `<span class="highlight-keyword">${keyword}</span>`)
  })
  return result
}

// 跳转到订单详情页
const goToOrderDetail = () => {
  const orderId = props.order?.id
  if (orderId) {
    handleClose()
    router.push(`/order/detail/${orderId}`)
  }
}

const handleClose = () => { dialogVisible.value = false }
const handleUpdateStatus = () => { emit('update-status', props.order) }
const handleSetTodo = () => { emit('set-todo', props.order) }
</script>

<style scoped>
.order-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
  :deep(.el-dialog__header) {
    padding: 14px 20px;
    border-bottom: 1px solid #e4e7ed;
    margin-right: 0;
  }
  :deep(.el-dialog__footer) {
    padding: 12px 20px;
    border-top: 1px solid #e4e7ed;
  }
}

.order-detail-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* 区块卡片 */
.section-card {
  background: #fafafa;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #ebeef5;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: #f5f7fa;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
}

.section-title .el-icon {
  color: #409eff;
  font-size: 16px;
}

.section-body {
  padding: 14px 16px;
}

/* 信息网格 */
.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px 20px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  font-size: 13px;
  line-height: 1.5;
}

.info-item.full-width {
  grid-column: span 3;
}

.info-label {
  color: #909399;
  min-width: 75px;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

.info-value.phone {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
}

.info-value.tracking-no {
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  color: #409eff;
}

.info-value.express-highlight {
  color: #e6a23c;
  font-weight: 600;
}

.info-value.logistics-update {
  color: #67c23a;
}

/* 金额网格 */
.amount-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}

.amount-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  text-align: center;
  padding: 8px;
  background: #fff;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.amount-label {
  font-size: 12px;
  color: #909399;
}

.amount-value {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.amount-value.main {
  color: #409eff;
  font-size: 16px;
}

.amount-value.cod {
  color: #e6a23c;
}

/* 备注内容 */
.remark-content {
  font-size: 13px;
  color: #606266;
  line-height: 1.6;
  white-space: pre-wrap;
  background: #fff;
  padding: 10px 12px;
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 1px 4px;
  border-radius: 2px;
}

/* 底部按钮 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

/* 响应式 */
@media (max-width: 768px) {
  .info-grid {
    grid-template-columns: repeat(2, 1fr);
  }
  .info-item.full-width {
    grid-column: span 2;
  }
  .amount-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
