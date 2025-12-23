<template>
  <el-dialog
    v-model="dialogVisible"
    title="订单详情"
    width="800px"
    :before-close="handleClose"
    class="order-detail-dialog"
    top="3vh"
  >
    <div v-if="order" class="order-detail-content">
      <!-- 基本信息 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><Document /></el-icon>
          订单基本信息
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <label>订单号：</label>
            <span class="value">{{ order.orderNo || order.orderNumber || '-' }}</span>
          </div>
          <div class="info-item">
            <label>订单状态：</label>
            <el-tag :style="getOrderStatusStyle(order.status)" size="small" effect="plain">
              {{ getUnifiedStatusText(order.status) }}
            </el-tag>
          </div>
          <div class="info-item">
            <label>客户姓名：</label>
            <span class="value">{{ order.customerName || '-' }}</span>
          </div>
          <div class="info-item">
            <label>联系电话：</label>
            <span class="value">{{ displaySensitiveInfoNew(order.phone || order.customerPhone || order.receiverPhone, SensitiveInfoType.PHONE) }}</span>
          </div>
          <div class="info-item">
            <label>下单日期：</label>
            <span class="value">{{ order.createTime || order.orderDate || order.shippingTime || '-' }}</span>
          </div>
          <div class="info-item">
            <label>归属人：</label>
            <span class="value">{{ order.assignedToName || order.createdByName || order.salesPersonName || order.assignedTo || order.createdBy || '-' }}</span>
          </div>
          <div class="info-item">
            <label>客服微信号：</label>
            <span class="value">{{ getServiceWechat() }}</span>
          </div>
          <div class="info-item">
            <label>订单来源：</label>
            <span class="value">{{ getOrderSourceText(getOrderSource()) }}</span>
          </div>
          <div class="info-item highlight-red">
            <label>指定快递：</label>
            <span class="value express-highlight">{{ getDesignatedExpress() }}</span>
          </div>
          <div class="info-item full-width">
            <label>收货地址：</label>
            <span class="value">{{ getReceiverAddress() }}</span>
          </div>
          <div class="info-item full-width" v-if="order.remark">
            <label>备注：</label>
            <span class="value">{{ order.remark || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 物流信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><Van /></el-icon>
          物流信息
        </h3>
        <div class="info-grid">
          <div class="info-item">
            <label>快递单号：</label>
            <span class="value">{{ order.expressNo || order.trackingNumber || order.trackingNo || '-' }}</span>
          </div>
          <div class="info-item">
            <label>快递公司：</label>
            <span class="value">{{ getExpressCompanyName(order.expressCompany || order.logisticsCompany) || '-' }}</span>
          </div>
          <div class="info-item full-width">
            <label>最新动态：</label>
            <span class="value">{{ order.latestUpdate || order.logisticsStatus || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 商品信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><Box /></el-icon>
          商品信息
        </h3>
        <div class="info-grid">
          <div class="info-item full-width">
            <label>商品名称：</label>
            <span class="value">{{ order.productsText || order.productName || getProductsText(order.products) || '-' }}</span>
          </div>
          <div class="info-item">
            <label>数量：</label>
            <span class="value">{{ order.totalQuantity || order.quantity || getProductsQuantity(order.products) || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><Money /></el-icon>
          金额信息
        </h3>
        <div class="amount-row">
          <div class="amount-item">
            <label>订单金额：</label>
            <span class="value total">¥{{ formatNumber(order.totalAmount || order.amount) }}</span>
          </div>
        </div>
      </div>

      <!-- 订单备注 -->
      <div class="detail-section compact-section" v-if="order.remark">
        <h3 class="section-title small">
          <el-icon><ChatDotRound /></el-icon>
          订单备注
        </h3>
        <div class="remark-content">
          <p v-html="highlightKeywords(order.remark)"></p>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button
          v-if="showActionButtons"
          type="warning"
          @click="handleSetTodo"
        >
          <el-icon><Timer /></el-icon>
          设置待办
        </el-button>
        <el-button
          v-if="showActionButtons"
          type="success"
          @click="handleUpdateStatus"
        >
          <el-icon><Edit /></el-icon>
          更新状态
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import {
  Document, Box, Money, Timer, Edit, Van, ChatDotRound
} from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { useOrderStore } from '@/stores/order'

// 订单store用于获取完整订单信息
const orderStore = useOrderStore()

// 使用any类型避免类型错误，因为这个对话框接收的是物流订单格式
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

// 🔥 获取完整订单信息（从store中查找）
const getFullOrderInfo = () => {
  if (!props.order) return null
  const orderId = props.order.id
  const orderNo = props.order.orderNo || props.order.orderNumber
  // 从store中查找完整订单信息
  const orders = orderStore.getOrders()
  return orders.find((o: any) => o.id === orderId || o.orderNumber === orderNo) || props.order
}

// 🔥 获取客服微信号
const getServiceWechat = () => {
  const fullOrder = getFullOrderInfo()
  return fullOrder?.serviceWechat || props.order?.serviceWechat || '-'
}

// 🔥 获取订单来源
const getOrderSource = () => {
  const fullOrder = getFullOrderInfo()
  return fullOrder?.orderSource || props.order?.orderSource || ''
}

// 🔥 获取指定快递
const getDesignatedExpress = () => {
  const fullOrder = getFullOrderInfo()
  const expressCode = fullOrder?.expressCompany || props.order?.expressCompany || props.order?.logisticsCompany
  if (!expressCode) return '-'
  return getExpressCompanyName(expressCode) || expressCode
}

// 🔥 获取收货地址
const getReceiverAddress = () => {
  const fullOrder = getFullOrderInfo()
  // 优先使用完整订单的收货地址
  if (fullOrder?.receiverAddress) return fullOrder.receiverAddress
  if (fullOrder?.address) return fullOrder.address
  // 尝试拼接地址
  if (fullOrder?.province || fullOrder?.city || fullOrder?.district) {
    const parts = [
      fullOrder.province,
      fullOrder.city,
      fullOrder.district,
      fullOrder.street,
      fullOrder.detailAddress
    ].filter(Boolean)
    if (parts.length > 0) return parts.join('')
  }
  // 回退到props.order
  return props.order?.address || props.order?.receiverAddress || '-'
}

// 格式化数字
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString()
}

// 获取订单来源文本
const getOrderSourceText = (source: string | null | undefined) => {
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

// 获取快递公司名称
const getExpressCompanyName = (code: string | null | undefined) => {
  if (!code) return null
  const companyMap: Record<string, string> = {
    SF: '顺丰速运',
    YTO: '圆通速递',
    ZTO: '中通快递',
    STO: '申通快递',
    YD: '韵达快递',
    HTKY: '百世快递',
    JD: '京东物流',
    EMS: 'EMS',
    DBKD: '德邦快递',
    UC: '优速快递',
    shunfeng: '顺丰速运',
    yuantong: '圆通速递',
    zhongtong: '中通快递',
    shentong: '申通快递',
    yunda: '韵达快递',
    jd: '京东物流',
    ems: 'EMS',
    debang: '德邦快递'
  }
  return companyMap[code] || code
}

// 获取商品文本
const getProductsText = (products: any[] | null | undefined) => {
  if (!products || !Array.isArray(products) || products.length === 0) return null
  return products.map(p => `${p.name} × ${p.quantity}`).join('，')
}

// 获取商品总数量
const getProductsQuantity = (products: any[] | null | undefined) => {
  if (!products || !Array.isArray(products)) return 0
  return products.reduce((sum, p) => sum + (p.quantity || 0), 0)
}

// 高亮关键词（安全版本，防止XSS）
const highlightKeywords = (text: string) => {
  if (!text) return ''
  // 先转义HTML特殊字符
  const escaped = text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')

  // 再添加高亮标签
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = escaped
  keywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi')
    result = result.replace(regex, `<span class="highlight-keyword">${keyword}</span>`)
  })
  return result
}

// 关闭弹窗
const handleClose = () => {
  dialogVisible.value = false
}

// 更新状态
const handleUpdateStatus = () => {
  emit('update-status', props.order)
}

// 设置待办
const handleSetTodo = () => {
  emit('set-todo', props.order)
}
</script>

<style scoped>
.order-detail-dialog {
  :deep(.el-dialog__body) {
    padding: 16px 20px;
    max-height: 75vh;
    overflow-y: auto;
  }
  :deep(.el-dialog__header) {
    padding: 12px 20px;
    border-bottom: 1px solid #e4e7ed;
  }
  :deep(.el-dialog__footer) {
    padding: 12px 20px;
    border-top: 1px solid #e4e7ed;
  }
}

.order-detail-content {
  font-size: 13px;
}

.detail-section {
  margin-bottom: 16px;
  background: #f8f9fa;
  border-radius: 6px;
  padding: 12px 16px;
}

.compact-section {
  margin-bottom: 12px;
  padding: 10px 14px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 10px 0;
  padding-bottom: 8px;
  border-bottom: 1px solid #e4e7ed;
}

.section-title.small {
  font-size: 13px;
  margin-bottom: 8px;
  padding-bottom: 6px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px 16px;
}

.info-item {
  display: flex;
  align-items: flex-start;
  line-height: 1.5;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-weight: 500;
  color: #606266;
  min-width: 80px;
  flex-shrink: 0;
}

.info-item .value {
  color: #303133;
  flex: 1;
  word-break: break-all;
}

/* 指定快递红色高亮样式 */
.info-item.highlight-red {
  background-color: #fef0f0;
  border-radius: 4px;
  padding: 6px 10px;
  border: 1px solid #f56c6c;
}

.info-item.highlight-red label {
  color: #f56c6c;
  font-weight: 600;
}

.express-highlight {
  color: #f56c6c !important;
  font-weight: 600 !important;
}

.amount-row {
  display: flex;
  align-items: center;
  gap: 20px;
}

.amount-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.amount-item label {
  color: #606266;
  font-weight: 500;
}

.amount-item .value.total {
  font-size: 16px;
  font-weight: 700;
  color: #409eff;
}

.remark-content {
  background: white;
  border-radius: 4px;
  padding: 10px 12px;
  border: 1px solid #e4e7ed;
  line-height: 1.5;
  font-size: 13px;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 1px 3px;
  border-radius: 2px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
