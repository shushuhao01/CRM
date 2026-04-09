<template>
  <!-- 第一行：客户信息 -->
  <div class="row-layout full-width">
    <el-card class="customer-info-card modern-card">
      <template #header>
        <div class="card-header-modern">
          <div class="header-left">
            <el-icon class="header-icon"><User /></el-icon>
            <span class="header-title">客户信息</span>
          </div>
          <div class="header-right">
            <el-button type="text" size="small" @click="$emit('go-customer-detail')" class="view-more-btn">
              查看更多 <el-icon class="ml-1"><ArrowRight /></el-icon>
            </el-button>
          </div>
        </div>
      </template>
      <div class="customer-info-modern">
        <div class="customer-main">
          <div class="customer-avatar-section">
            <el-avatar :size="64" :src="orderDetail.customer.avatar" class="customer-avatar-modern">
              {{ orderDetail.customer.name.charAt(0) }}
            </el-avatar>
            <el-tag :type="getLevelType(orderDetail.customer.level)" size="small" class="customer-level-tag" effect="light">
              {{ getLevelText(orderDetail.customer.level) }}
            </el-tag>
          </div>
          <div class="customer-details-modern">
            <div class="customer-name-modern">{{ orderDetail.customer.name }}</div>
            <div class="customer-contact-modern">
              <div class="contact-item-modern phone-item-modern" @click="$emit('call-customer')">
                <el-icon class="contact-icon"><Phone /></el-icon>
                <span class="contact-text">{{ displaySensitiveInfoNew(orderDetail.customer.phone, SensitiveInfoType.PHONE, userId) }}</span>
                <el-icon class="call-icon"><Phone /></el-icon>
              </div>
              <div class="contact-item-modern">
                <el-icon class="contact-icon"><Message /></el-icon>
                <span class="contact-text">{{ orderDetail.customer.wechat ? displaySensitiveInfoNew(orderDetail.customer.wechat, SensitiveInfoType.WECHAT) : '未设置微信' }}</span>
              </div>
              <div class="contact-item-modern address-item">
                <el-icon class="contact-icon"><Location /></el-icon>
                <span class="contact-text">{{ orderDetail.customer.address ? displaySensitiveInfoNew(orderDetail.customer.address, SensitiveInfoType.ADDRESS) : '' }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>

  <!-- 第二行：订单状态 -->
  <div class="row-layout full-width">
    <el-card class="modern-card order-status-modern order-status-horizontal">
      <div class="status-header-horizontal">
        <div class="status-title">
          <el-icon class="status-icon"><Clock /></el-icon>
          <span class="title-text">订单状态</span>
        </div>
        <div class="status-right-section">
          <el-tag :style="getOrderStatusStyle(orderDetail.status)" class="status-tag-modern" effect="plain">
            {{ getUnifiedStatusText(orderDetail.status) }}
          </el-tag>
          <div v-if="showCountdown" class="countdown-section">
            <div class="countdown-timer">
              <el-icon class="countdown-icon"><Timer /></el-icon>
              <span class="countdown-text">{{ countdownText }}</span>
            </div>
            <div class="countdown-tip">请在倒计时结束前完成审核</div>
          </div>
        </div>
      </div>
      <div class="status-timeline-horizontal">
        <div class="timeline-item-horizontal">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-label">创建时间</div>
            <div class="timeline-value">{{ formatDateTime(orderDetail.createTime) }}</div>
          </div>
        </div>
        <div class="timeline-item-horizontal">
          <div class="timeline-dot"></div>
          <div class="timeline-content">
            <div class="timeline-label">更新时间</div>
            <div class="timeline-value">{{ formatDateTime(orderDetail.updateTime) }}</div>
          </div>
        </div>
        <div v-if="showCountdown" class="timeline-item-horizontal countdown-timeline">
          <div class="timeline-dot countdown-dot"></div>
          <div class="timeline-content">
            <div class="timeline-label">流转审核倒计时</div>
            <div class="timeline-value countdown-value">
              {{ countdownText }}
              <el-tag type="warning" size="small" class="countdown-badge">
                <el-icon><Timer /></el-icon> 自动流转中
              </el-tag>
            </div>
          </div>
        </div>
        <div v-if="canChangeToReserved" class="status-tip-horizontal">
          <el-icon class="tip-icon"><InfoFilled /></el-icon>
          <span class="tip-text">流转前可修改为预留单，修改后将不会流转到审核</span>
        </div>
      </div>
    </el-card>
  </div>

  <!-- 第三行：收货信息 -->
  <div class="row-layout full-width">
    <el-card class="modern-card delivery-info-card">
      <template #header>
        <div class="card-header-modern">
          <div class="header-left">
            <el-icon class="header-icon"><Van /></el-icon>
            <span class="header-title">收货信息</span>
          </div>
        </div>
      </template>
      <div class="delivery-info-modern">
        <div class="delivery-grid-modern">
          <div class="delivery-field-modern">
            <div class="field-label-modern">收货人</div>
            <div class="field-value-modern">{{ orderDetail.receiverName }}</div>
          </div>
          <div class="delivery-field-modern">
            <div class="field-label-modern">联系电话</div>
            <div class="field-value-modern phone-clickable" @click="$emit('call-customer', orderDetail.receiverPhone)">
              {{ displaySensitiveInfoNew(orderDetail.receiverPhone, SensitiveInfoType.PHONE) }}
            </div>
          </div>
          <div class="delivery-field-modern address-field-modern">
            <div class="field-label-modern">收货地址</div>
            <div class="field-value-modern address-value-modern">{{ orderDetail.receiverAddress ? displaySensitiveInfoNew(orderDetail.receiverAddress, SensitiveInfoType.ADDRESS) : '' }}</div>
          </div>
        </div>
      </div>
    </el-card>
  </div>

  <!-- 订单信息 -->
  <div class="row-layout full-width">
    <el-card class="order-info-card modern-card">
      <template #header>
        <div class="card-header-modern">
          <div class="header-left">
            <el-icon class="header-icon"><Document /></el-icon>
            <span class="header-title">订单信息</span>
          </div>
        </div>
      </template>
      <div class="order-info-modern">
        <div class="order-basic-info">
          <div class="info-grid">
            <div class="info-item">
              <div class="info-label">订单号</div>
              <div class="info-value order-number-value">{{ orderDetail.orderNumber }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">指定快递</div>
              <div class="info-value">{{ getExpressCompanyText(orderDetail.expressCompany) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">下单时间</div>
              <div class="info-value">{{ formatDateTime(orderDetail.createTime) }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">客服微信</div>
              <div class="info-value">{{ orderDetail.serviceWechat }}</div>
            </div>
            <div class="info-item">
              <div class="info-label">订单来源</div>
              <div class="info-value">{{ getOrderSourceText(orderDetail.orderSource) }}</div>
            </div>
            <div class="info-item" v-if="orderDetail.paymentMethod">
              <div class="info-label">支付方式</div>
              <div class="info-value">{{ getPaymentMethodText(orderDetail.paymentMethod) }}{{ orderDetail.paymentMethodOther ? ` (${orderDetail.paymentMethodOther})` : '' }}</div>
            </div>
            <template v-for="field in customFields" :key="field.fieldKey">
              <div class="info-item" v-if="getCustomFieldValue(field.fieldKey)">
                <div class="info-label">{{ field.fieldName }}</div>
                <div class="info-value">{{ formatCustomFieldValue(field, getCustomFieldValue(field.fieldKey)) }}</div>
              </div>
            </template>
          </div>
        </div>

        <!-- 物流信息区域 -->
        <div class="logistics-section">
          <div class="section-title">
            <el-icon><Van /></el-icon>
            <span>物流信息</span>
            <el-tag v-if="orderDetail.status === 'shipped'" type="success" size="small" effect="light" class="status-indicator">已发货</el-tag>
            <el-tag v-else-if="orderDetail.status === 'pending_shipment'" type="warning" size="small" effect="light" class="status-indicator">待发货</el-tag>
            <el-tag v-else :style="getOrderStatusStyle(orderDetail.status)" size="small" effect="plain" class="status-indicator">
              {{ getUnifiedStatusText(orderDetail.status) }}
            </el-tag>
          </div>

          <div v-if="hasShippedWithTracking" class="logistics-info-grid">
            <div class="logistics-item highlight">
              <div class="logistics-label">快递公司</div>
              <div class="logistics-value">{{ getExpressCompanyText(orderDetail.expressCompany) }}</div>
            </div>
            <div class="logistics-item highlight">
              <div class="logistics-label">物流单号</div>
              <div class="logistics-value tracking-number-modern">
                {{ orderDetail.trackingNumber }}
                <el-button size="small" type="primary" text @click="$emit('track-express')" class="track-btn">
                  <el-icon><ZoomIn /></el-icon> 查询
                </el-button>
              </div>
            </div>
            <div class="logistics-item">
              <div class="logistics-label">预计发货</div>
              <div class="logistics-value">{{ formatDateLocal(orderDetail.expectedShipDate) || '已发货' }}</div>
            </div>
            <div class="logistics-item">
              <div class="logistics-label">预计到达</div>
              <div class="logistics-value estimated-delivery">
                {{ orderDetail.status === 'delivered' ? '已签收' : (formatDateLocal(orderDetail.expectedDeliveryDate) || '计算中...') }}
              </div>
            </div>
          </div>

          <div v-else class="logistics-info-grid pending">
            <div class="logistics-item">
              <div class="logistics-label">预计发货</div>
              <div class="logistics-value">{{ formatDateLocal(orderDetail.expectedShipDate) || '待确定' }}</div>
            </div>
            <div class="logistics-item">
              <div class="logistics-label">预计到达</div>
              <div class="logistics-value">{{ formatDateLocal(orderDetail.expectedDeliveryDate) || '待确定' }}</div>
            </div>
            <div class="logistics-item">
              <div class="logistics-label">快递公司</div>
              <div class="logistics-value">{{ getExpressCompanyText(orderDetail.expressCompany) || '待确定' }}</div>
            </div>
            <div class="logistics-item">
              <div class="logistics-label">物流单号</div>
              <div class="logistics-value pending-text">{{ orderDetail.trackingNumber || '待发货后生成' }}</div>
            </div>
          </div>
        </div>

        <div v-if="orderDetail.remark" class="order-remark-modern">
          <div class="remark-title">
            <el-icon><Document /></el-icon>
            <span>订单备注</span>
          </div>
          <div class="remark-content">{{ orderDetail.remark }}</div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { User, Phone, Message, Location, Clock, Van, Document, Timer, InfoFilled, ArrowRight, ZoomIn } from '@element-plus/icons-vue'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { formatDateTime } from '@/utils/dateFormat'
import { getLevelType, getLevelText, getExpressCompanyText, getOrderSourceText, getPaymentMethodText, formatDate as formatDateLocal } from './helpers'

defineProps<{
  orderDetail: any
  showCountdown: boolean
  countdownText: string
  canChangeToReserved: boolean
  hasShippedWithTracking: boolean
  customFields: any[]
  getCustomFieldValue: (key: string) => any
  formatCustomFieldValue: (field: any, value: any) => string
  userId: string
}>()

defineEmits<{
  'go-customer-detail': []
  'call-customer': [phone?: string]
  'track-express': []
}>()
</script>

<style scoped>
/* 布局 */
.row-layout { display: flex; gap: 20px; margin-bottom: 20px; align-items: stretch; }
.row-layout.full-width { display: block; }

/* 现代化卡片 */
.modern-card { border: 1px solid #f0f2f5; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); border-radius: 12px; overflow: hidden; }
.card-header-modern { display: flex; justify-content: space-between; align-items: center; padding: 0; }
.header-left { display: flex; align-items: center; gap: 8px; }
.header-icon { color: #409eff; font-size: 16px; }
.header-title { font-size: 16px; font-weight: 600; color: #303133; }
.header-right { display: flex; align-items: center; }
.view-more-btn { color: #409eff; font-size: 13px; padding: 4px 8px; border-radius: 6px; transition: all 0.3s ease; }
.view-more-btn:hover { background-color: #ecf5ff; color: #337ecc; }

/* 客户信息 */
.customer-info-modern { padding: 0; }
.customer-main { display: flex; gap: 20px; align-items: flex-start; }
.customer-avatar-section { display: flex; flex-direction: column; align-items: center; gap: 12px; flex-shrink: 0; }
.customer-avatar-modern { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; font-weight: 600; font-size: 24px; border: 3px solid #f8f9fa; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1); }
.customer-level-tag { border-radius: 12px; font-size: 11px; font-weight: 500; padding: 2px 8px; }
.customer-details-modern { flex: 1; min-width: 0; }
.customer-name-modern { font-size: 20px; font-weight: 600; color: #303133; margin-bottom: 16px; line-height: 1.4; }
.customer-contact-modern { display: flex; flex-direction: column; gap: 12px; }
.contact-item-modern { display: flex; align-items: center; gap: 12px; padding: 12px 16px; background: #fafbfc; border-radius: 8px; border: 1px solid #f0f2f5; transition: all 0.3s ease; position: relative; }
.contact-item-modern:hover { background: #f5f7fa; border-color: #e4e7ed; }
.phone-item-modern { cursor: pointer; background: linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 100%); border-color: #d1ecf1; }
.phone-item-modern:hover { background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); border-color: #bfdbfe; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15); }
.contact-icon { color: #409eff; font-size: 16px; flex-shrink: 0; }
.phone-item-modern .contact-icon { color: #0ea5e9; }
.contact-text { flex: 1; color: #303133; font-size: 14px; font-weight: 500; line-height: 1.5; }
.phone-item-modern .contact-text { color: #0369a1; font-weight: 600; }
.call-icon { color: #0ea5e9; font-size: 14px; opacity: 0.7; transition: all 0.3s ease; }
.phone-item-modern:hover .call-icon { opacity: 1; transform: scale(1.1); }
.address-item { background: linear-gradient(135deg, #fef3e2 0%, #fef7ed 100%); border-color: #fed7aa; }
.address-item:hover { background: linear-gradient(135deg, #fde68a 0%, #fef3c7 100%); border-color: #fbbf24; }
.address-item .contact-icon { color: #f59e0b; }
.address-item .contact-text { color: #92400e; }

/* 订单状态 */
.order-status-modern { background: #ffffff; border: 1px solid #f0f2f5; border-radius: 16px; padding: 24px; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); transition: all 0.3s ease; }
.order-status-modern:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); }
.status-header-horizontal { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24px; padding-bottom: 16px; border-bottom: 1px solid #e2e8f0; }
.status-title { display: flex; align-items: center; gap: 12px; }
.status-icon { font-size: 20px; color: #64748b; }
.title-text { font-size: 18px; font-weight: 600; color: #1e293b; }
.status-right-section { display: flex; align-items: center; gap: 24px; }
.status-tag-modern { font-size: 14px; font-weight: 500; padding: 8px 16px; border-radius: 20px; border: none; }
.status-timeline-horizontal { display: flex; gap: 32px; flex-wrap: wrap; }
.timeline-item-horizontal { display: flex; align-items: center; gap: 12px; position: relative; }
.timeline-item-horizontal:not(:last-child)::after { content: ''; position: absolute; right: -20px; top: 50%; width: 8px; height: 2px; background: #e2e8f0; transform: translateY(-50%); }
.timeline-dot { width: 16px; height: 16px; border-radius: 50%; background: #64748b; border: 3px solid #ffffff; box-shadow: 0 0 0 2px #e2e8f0; flex-shrink: 0; margin-top: 2px; }
.countdown-dot { background: #f59e0b; animation: pulse 2s infinite; }
@keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.7; transform: scale(1.1); } }
.timeline-content { flex: 1; min-width: 0; }
.timeline-label { font-size: 14px; color: #64748b; margin-bottom: 4px; font-weight: 500; }
.timeline-value { font-size: 15px; color: #1e293b; font-weight: 600; display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.countdown-value { color: #f59e0b; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; }
.countdown-badge { font-size: 12px; padding: 4px 8px; border-radius: 12px; }
.countdown-section { display: flex; flex-direction: column; align-items: center; gap: 8px; }
.countdown-timer { display: flex; align-items: center; gap: 8px; padding: 8px 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 20px; color: #92400e; font-weight: 600; font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace; }
.countdown-icon { font-size: 16px; color: #f59e0b; animation: pulse 2s infinite; }
.countdown-text { font-size: 14px; min-width: 60px; text-align: center; }
.countdown-tip { font-size: 12px; color: #78350f; text-align: center; white-space: nowrap; }
.status-tip-horizontal { margin-top: 20px; padding: 16px; background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border: 1px solid #f59e0b; border-radius: 12px; display: flex; align-items: center; gap: 12px; }
.tip-icon { font-size: 18px; color: #f59e0b; flex-shrink: 0; }
.tip-text { font-size: 14px; color: #92400e; line-height: 1.5; }

/* 收货信息 */
.delivery-info-card { background: #ffffff; border: 1px solid #f0f2f5; box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04); }
.delivery-info-modern { padding: 0; }
.delivery-grid-modern { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; align-items: start; }
.delivery-field-modern { display: flex; flex-direction: column; gap: 8px; }
.address-field-modern { grid-column: 1 / -1; }
.field-label-modern { font-size: 14px; color: #6b7280; font-weight: 500; margin-bottom: 4px; }
.field-value-modern { font-size: 16px; color: #111827; font-weight: 600; line-height: 1.5; }
.phone-clickable { cursor: pointer; color: #3b82f6; transition: all 0.2s ease; padding: 4px 8px; border-radius: 6px; margin: -4px -8px; }
.phone-clickable:hover { background: #eff6ff; color: #1d4ed8; transform: scale(1.02); }
.address-value-modern { word-break: break-word; line-height: 1.6; color: #374151; }

/* 订单信息 */
.order-info-modern { padding: 0; }
.order-basic-info { margin-bottom: 24px; }
.info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 16px; }
.info-item { padding: 16px; background: #fafbfc; border-radius: 8px; border: 1px solid #f0f2f5; transition: all 0.3s ease; }
.info-item:hover { background: #f5f7fa; border-color: #e4e7ed; transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); }
.info-label { font-size: 12px; color: #909399; font-weight: 500; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
.info-value { font-size: 14px; color: #303133; font-weight: 600; line-height: 1.4; }
.order-number-value { font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; color: #409eff; background: #ecf5ff; padding: 4px 8px; border-radius: 4px; font-size: 13px; }

/* 物流信息 */
.logistics-section { background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%); border-radius: 12px; padding: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 16px; font-weight: 600; color: #1e293b; }
.section-title .el-icon { color: #10b981; font-size: 18px; }
.status-indicator { margin-left: auto; border-radius: 12px; font-weight: 500; }
.logistics-info-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 12px; }
.logistics-item { padding: 12px 16px; background: white; border-radius: 8px; border: 1px solid #e2e8f0; transition: all 0.3s ease; }
.logistics-item:hover { border-color: #cbd5e1; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06); }
.logistics-item.highlight { background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%); border-color: #bfdbfe; }
.logistics-item.highlight:hover { background: linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%); border-color: #93c5fd; }
.logistics-label { font-size: 11px; color: #64748b; font-weight: 500; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
.logistics-value { font-size: 13px; color: #1e293b; font-weight: 600; line-height: 1.4; }
.tracking-number-modern { display: flex; align-items: center; gap: 8px; font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace; }
.track-btn { padding: 2px 6px; font-size: 11px; border-radius: 4px; }
.estimated-delivery { color: #059669; font-weight: 700; }
.logistics-info-grid.pending .logistics-item { background: #fefce8; border-color: #fde047; }
.logistics-info-grid.pending .logistics-item:hover { background: #fef3c7; border-color: #fbbf24; }
.pending-text { color: #92400e; font-style: italic; }

/* 备注 */
.order-remark-modern { background: linear-gradient(135deg, #fef7ed 0%, #fefbf3 100%); border-radius: 8px; padding: 16px; border: 1px solid #fed7aa; }
.remark-title { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; font-size: 14px; font-weight: 600; color: #92400e; }
.remark-title .el-icon { color: #f59e0b; }
.remark-content { color: #78350f; font-size: 14px; line-height: 1.6; background: white; padding: 12px; border-radius: 6px; border: 1px solid #fde68a; }

/* 响应式 */
@media (max-width: 768px) {
  .customer-main { flex-direction: column; gap: 16px; align-items: center; }
  .customer-avatar-section { flex-direction: row; gap: 16px; }
  .customer-details-modern { width: 100%; }
  .customer-name-modern { text-align: center; margin-bottom: 12px; }
  .info-grid { grid-template-columns: 1fr; }
  .logistics-info-grid { grid-template-columns: 1fr; }
  .logistics-section { padding: 16px; }
  .delivery-grid-modern { grid-template-columns: 1fr; gap: 16px; }
  .address-field-modern { grid-column: 1; }
}
</style>
