<template>
  <el-dialog
    v-model="dialogVisible"
    title="订单详情"
    width="70%"
    :before-close="handleClose"
    class="order-detail-dialog"
    top="5vh"
  >
    <div v-if="order" class="order-detail-content">
      <!-- 基本信息和客户信息合并 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><Document /></el-icon>
          订单基本信息
        </h3>
        <div class="info-grid compact">
          <div class="info-item">
            <label>订单号：</label>
            <span class="value">{{ order.orderNo }}</span>
          </div>
          <div class="info-item">
            <label>订单状态：</label>
            <el-tag :type="getStatusType(order.status)" size="small">
              {{ getStatusText(order.status) }}
            </el-tag>
          </div>
          <div class="info-item">
            <label>客户姓名：</label>
            <span class="value">{{ order.customerName }}</span>
          </div>
          <div class="info-item">
            <label>联系电话：</label>
            <span class="value">{{ displaySensitiveInfoNew(order.customerPhone, 'phone') }}</span>
          </div>
          <div class="info-item">
            <label>下单日期：</label>
            <span class="value">{{ order.orderDate || order.shippingTime || '-' }}</span>
          </div>
          <div class="info-item">
            <label>归属人：</label>
            <span class="value">{{ order.assignedTo || '-' }}</span>
          </div>
          <div class="info-item">
            <label>客服微信号：</label>
            <span class="value">{{ order.serviceWechat || '-' }}</span>
          </div>
          <div class="info-item">
            <label>订单来源：</label>
            <span class="value">{{ getOrderSourceText(order.orderSource) }}</span>
          </div>
          <div class="info-item full-width">
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
        <div class="info-grid compact">
          <div class="info-item">
            <label>快递单号：</label>
            <span class="value">{{ order.trackingNo || '-' }}</span>
          </div>
          <div class="info-item">
            <label>快递公司：</label>
            <span class="value">{{ order.logisticsCompany || '-' }}</span>
          </div>
          <div class="info-item full-width">
            <label>最新动态：</label>
            <span class="value">{{ order.latestUpdate || '-' }}</span>
          </div>
        </div>
      </div>

      <!-- 商品信息 -->
      <div class="detail-section">
        <h3 class="section-title">
          <el-icon><Box /></el-icon>
          商品信息
        </h3>
        <div class="info-grid compact">
          <div class="info-item">
            <label>商品名称：</label>
            <span class="value">{{ order.productName || '-' }}</span>
          </div>
          <div class="info-item">
            <label>数量：</label>
            <span class="value">{{ order.quantity || 0 }}</span>
          </div>
        </div>
      </div>

      <!-- 金额信息 -->
      <div class="detail-section compact-section">
        <h3 class="section-title small">
          <el-icon><Money /></el-icon>
          金额信息
        </h3>
        <div class="amount-summary compact">
          <div class="amount-row">
            <div class="amount-item">
              <label>订单金额：</label>
              <span class="value total">¥{{ formatNumber(order.amount) }}</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 订单备注 -->
      <div class="detail-section" v-if="order.remark">
        <h3 class="section-title">
          <el-icon><ChatDotRound /></el-icon>
          订单备注
        </h3>
        <div class="remark-content">
          <p v-html="highlightKeywords(order.remark)"></p>
        </div>
      </div>

      <!-- 审核历史 -->
      <div class="detail-section compact-section" v-if="order.auditHistory">
        <h3 class="section-title small">
          <el-icon><List /></el-icon>
          审核历史
        </h3>
        <div class="audit-timeline compact">
          <div
            v-for="(audit, index) in order.auditHistory"
            :key="index"
            class="audit-item compact"
          >
            <div class="audit-header">
              <el-tag
                size="small"
                :type="audit.result === 'approved' ? 'success' : 'danger'"
              >
                {{ audit.result === 'approved' ? '已通过' : '已拒绝' }}
              </el-tag>
              <span class="audit-meta">{{ audit.auditor }} · {{ audit.time }}</span>
            </div>
            <div v-if="audit.remark" class="audit-comment">{{ audit.remark }}</div>
          </div>
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
        <el-button type="primary" @click="printOrder">
          <el-icon><Printer /></el-icon>
          打印订单
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Document, Box, Money, Printer, Timer, Edit, Van
} from '@element-plus/icons-vue'
import { displaySensitiveInfoNew } from '@/utils/sensitiveInfo'

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

// 格式化数字
const formatNumber = (num: number | null | undefined) => {
  if (num === null || num === undefined || isNaN(num)) {
    return '0'
  }
  return num.toLocaleString()
}

// 获取状态类型
const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    // 订单状态
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
  return statusMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
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
  return statusMap[status] || status || '未知'
}

// 获取订单来源文本
const getOrderSourceText = (source: string | null | undefined) => {
  if (!source) return '-'
  const sourceMap: Record<string, string> = {
    online_store: '🛒 线上商城',
    wechat_mini: '📱 微信小程序',
    wechat_service: '💬 微信客服',
    phone_call: '📞 电话咨询',
    offline_store: '🏪 线下门店',
    referral: '👥 客户推荐',
    advertisement: '📺 广告投放',
    other: '🎯 其他渠道'
  }
  return sourceMap[source] || source
}

// 高亮关键词
const highlightKeywords = (text: string) => {
  const keywords = ['紧急', '加急', '重要', '特殊', '注意']
  let result = text
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

// 打印订单
const printOrder = () => {
  ElMessage.success('打印功能开发中...')
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
    padding: 20px;
    max-height: 70vh;
    overflow-y: auto;
  }
}

.order-detail-content {
  font-size: 14px;
}

.detail-section {
  margin-bottom: 30px;
  background: #f8f9fa;
  border-radius: 8px;
  padding: 20px;
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

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 15px;
}

.info-grid.compact {
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

.compact-section {
  margin-bottom: 16px;
}

.section-title.small {
  font-size: 14px;
  margin-bottom: 12px;
}

.amount-summary.compact {
  padding: 12px;
  background: #f8f9fa;
  border-radius: 6px;
}

.amount-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-item.full-width {
  grid-column: 1 / -1;
}

.info-item label {
  font-weight: 600;
  color: #606266;
  min-width: 100px;
  margin-right: 10px;
}

.info-item .value {
  color: #303133;
  flex: 1;
}

.product-table {
  margin-top: 10px;
}

.amount {
  font-weight: 600;
  color: #409eff;
}

.amount-summary {
  background: white;
  border-radius: 6px;
  padding: 20px;
  border: 1px solid #e4e7ed;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}

.amount-item:last-child {
  border-bottom: none;
}

.amount-item.total {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
  border-top: 2px solid #e4e7ed;
  margin-top: 10px;
  padding-top: 15px;
}

.amount-item.cod {
  color: #f56c6c;
  font-weight: 600;
}

.amount-item .value.discount {
  color: #67c23a;
}

.amount-item .value.paid {
  color: #409eff;
}

.remark-content {
  background: white;
  border-radius: 6px;
  padding: 15px;
  border: 1px solid #e4e7ed;
  line-height: 1.6;
}

.highlight-keyword {
  color: #f56c6c;
  font-weight: 600;
  background-color: #fef0f0;
  padding: 2px 4px;
  border-radius: 3px;
}

.audit-timeline {
  margin-top: 10px;
}

.audit-timeline.compact {
  margin-top: 12px;
}

.audit-item {
  display: flex;
  flex-direction: column;
  gap: 5px;
  background: #f8f9fa;
  padding: 12px;
  border-radius: 6px;
  margin-bottom: 8px;
}

.audit-item.compact {
  padding: 10px;
  margin-bottom: 6px;
  border-left: 3px solid #e4e7ed;
}

.audit-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
}

.audit-meta {
  font-size: 12px;
  color: #909399;
}

.audit-comment {
  font-size: 13px;
  color: #606266;
  margin-top: 6px;
  padding-left: 8px;
  border-left: 2px solid #e4e7ed;
}

.audit-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  font-size: 12px;
  color: #909399;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
