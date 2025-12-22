<template>
  <div class="order-detail">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button @click="goBack" :icon="ArrowLeft" circle />
        <div class="header-info">
          <h2>订单详情</h2>
          <div class="order-number">订单号：{{ orderDetail.orderNumber }}</div>
        </div>
      </div>
      <div class="header-actions">
        <el-tooltip
          :content="canCreateAfterSales ? '点击创建售后服务' : '订单需要发货后才能建立售后'"
          placement="bottom"
        >
          <el-button
            type="primary"
            :disabled="!canCreateAfterSales"
            @click="createAfterSales"
          >
            建立售后
          </el-button>
        </el-tooltip>
        <el-dropdown @command="handleMarkCommand" class="mark-dropdown" :disabled="!canModifyMark">
          <el-button :icon="Sell" :type="getMarkButtonType()" :disabled="!canModifyMark">
            标记 <el-icon class="el-icon--right"><arrow-down /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="reserved" :disabled="orderDetail.markType === 'reserved'">预留单</el-dropdown-item>
              <el-dropdown-item command="normal" :disabled="orderDetail.markType === 'normal'">正常发货单</el-dropdown-item>
              <el-dropdown-item command="return" :disabled="orderDetail.markType === 'return'">退单</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <!-- 审核中不可修改提示 -->
        <el-tooltip v-if="!canModifyMark && isInAuditProcess" content="订单正在审核中，无法修改标记" placement="top">
          <el-icon class="audit-lock-icon"><Lock /></el-icon>
        </el-tooltip>
        <!-- 标记状态显示 -->
        <div v-if="orderDetail.markType" class="mark-status">
          <el-tag :type="getMarkTagType(orderDetail.markType)" size="default" effect="dark">
            {{ getMarkText(orderDetail.markType) }}
          </el-tag>
        </div>
        <el-button v-if="canApprove" type="success" @click="approveOrder">审核通过</el-button>
        <el-button v-if="canReject" type="danger" @click="rejectOrder">审核拒绝</el-button>
      </div>
    </div>

    <!-- 第一行：客户信息铺满 -->
    <div class="row-layout full-width">
      <el-card class="customer-info-card modern-card">
        <template #header>
          <div class="card-header-modern">
            <div class="header-left">
              <el-icon class="header-icon"><User /></el-icon>
              <span class="header-title">客户信息</span>
            </div>
            <div class="header-right">
              <el-button
                type="text"
                size="small"
                @click="goToCustomerDetail"
                class="view-more-btn"
              >
                查看更多
                <el-icon class="ml-1"><ArrowRight /></el-icon>
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
              <el-tag
                :type="getLevelType(orderDetail.customer.level)"
                size="small"
                class="customer-level-tag"
                effect="light"
              >
                {{ getLevelText(orderDetail.customer.level) }}
              </el-tag>
            </div>
            <div class="customer-details-modern">
              <div class="customer-name-modern">
                {{ orderDetail.customer.name }}
              </div>
              <div class="customer-contact-modern">
                <div class="contact-item-modern phone-item-modern" @click="callCustomer">
                  <el-icon class="contact-icon"><Phone /></el-icon>
                  <span class="contact-text">{{ displaySensitiveInfoNew(orderDetail.customer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}</span>
                  <el-icon class="call-icon"><Phone /></el-icon>
                </div>
                <div class="contact-item-modern">
                  <el-icon class="contact-icon"><Message /></el-icon>
                  <span class="contact-text">{{ orderDetail.customer.wechat || '未设置微信' }}</span>
                </div>
                <div class="contact-item-modern address-item">
                  <el-icon class="contact-icon"><Location /></el-icon>
                  <span class="contact-text">{{ orderDetail.customer.address }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 第二行：订单状态铺满 -->
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
            <!-- 3分钟倒计时和提示词 -->
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
          <!-- 倒计时显示 -->
          <div v-if="showCountdown" class="timeline-item-horizontal countdown-timeline">
            <div class="timeline-dot countdown-dot"></div>
            <div class="timeline-content">
              <div class="timeline-label">流转审核倒计时</div>
              <div class="timeline-value countdown-value">
                {{ countdownText }}
                <el-tag type="warning" size="small" class="countdown-badge">
                  <el-icon><Timer /></el-icon>
                  自动流转中
                </el-tag>
              </div>
            </div>
          </div>
          <!-- 可修改为预留单提示 -->
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
              <div class="field-value-modern phone-clickable" @click="callCustomer(orderDetail.receiverPhone)">
                {{ displaySensitiveInfoNew(orderDetail.receiverPhone, SensitiveInfoType.PHONE) }}
              </div>
            </div>
            <div class="delivery-field-modern address-field-modern">
              <div class="field-label-modern">收货地址</div>
              <div class="field-value-modern address-value-modern">{{ orderDetail.receiverAddress }}</div>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 第三排：订单信息 -->
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
          <!-- 基础订单信息 -->
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
              <!-- 自定义字段显示 -->
              <template v-for="field in orderFieldConfigStore.customFields" :key="field.fieldKey">
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
              <el-tag
                v-if="orderDetail.status === 'shipped'"
                type="success"
                size="small"
                effect="light"
                class="status-indicator"
              >
                已发货
              </el-tag>
              <el-tag
                v-else-if="orderDetail.status === 'pending_shipment'"
                type="warning"
                size="small"
                effect="light"
                class="status-indicator"
              >
                待发货
              </el-tag>
              <el-tag
                v-else
                :style="getOrderStatusStyle(orderDetail.status)"
                size="small"
                effect="plain"
                class="status-indicator"
              >
                {{ getUnifiedStatusText(orderDetail.status) }}
              </el-tag>
            </div>

            <!-- 已发货/已签收状态的物流信息（包含物流单号） -->
            <div v-if="hasShippedWithTracking" class="logistics-info-grid">
              <div class="logistics-item highlight">
                <div class="logistics-label">快递公司</div>
                <div class="logistics-value">{{ getExpressCompanyText(orderDetail.expressCompany) }}</div>
              </div>
              <div class="logistics-item highlight">
                <div class="logistics-label">物流单号</div>
                <div class="logistics-value tracking-number-modern">
                  {{ orderDetail.trackingNumber }}
                  <el-button size="small" type="primary" text @click="trackExpress" class="track-btn">
                    <el-icon><ZoomIn /></el-icon>
                    查询
                  </el-button>
                </div>
              </div>
              <div class="logistics-item">
                <div class="logistics-label">预计发货</div>
                <div class="logistics-value">{{ formatDate(orderDetail.expectedShipDate) || '已发货' }}</div>
              </div>
              <div class="logistics-item">
                <div class="logistics-label">预计到达</div>
                <div class="logistics-value estimated-delivery">
                  {{ orderDetail.status === 'delivered' ? '已签收' : (formatDate(orderDetail.expectedDeliveryDate) || '计算中...') }}
                </div>
              </div>
            </div>

            <!-- 待发货状态的物流信息 -->
            <div v-else class="logistics-info-grid pending">
              <div class="logistics-item">
                <div class="logistics-label">预计发货</div>
                <div class="logistics-value">{{ formatDate(orderDetail.expectedShipDate) || '待确定' }}</div>
              </div>
              <div class="logistics-item">
                <div class="logistics-label">预计到达</div>
                <div class="logistics-value">{{ formatDate(orderDetail.expectedDeliveryDate) || '待确定' }}</div>
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

          <!-- 订单备注 -->
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

    <!-- 第四排：产品清单 -->
    <div class="row-layout full-width">
      <el-card class="products-card">
        <template #header>
          <div class="card-header">
            <el-icon><ShoppingBag /></el-icon>
            <span>商品清单</span>
          </div>
        </template>

        <div class="products-list">
          <el-table :data="orderDetail.products" style="width: 100%">
            <el-table-column label="商品信息" min-width="200">
              <template #default="{ row }">
                <div class="product-info">
                  <div class="product-image">
                    <img :src="row.image || '/default-product.png'" :alt="row.name" />
                  </div>
                  <div class="product-details">
                    <div class="product-name">{{ row.name }}</div>
                    <div class="product-sku">SKU: {{ row.sku || row.id }}</div>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="price" label="单价" width="100">
              <template #default="{ row }">
                ¥{{ row.price.toFixed(2) }}
              </template>
            </el-table-column>
            <el-table-column prop="quantity" label="数量" width="80" />
            <el-table-column label="小计" width="120">
              <template #default="{ row }">
                ¥{{ (row.price * row.quantity).toFixed(2) }}
              </template>
            </el-table-column>
          </el-table>

          <!-- 金额信息横向显示 -->
          <div class="amount-summary-modern">
            <!-- 金额卡片 -->
            <div class="amount-cards-modern">
              <div class="amount-card-modern total-modern">
                <div class="amount-icon-modern">
                  <el-icon><Money /></el-icon>
                </div>
                <div class="amount-content-modern">
                  <div class="amount-label-modern">订单总额</div>
                  <div class="amount-value-modern">¥{{ (orderDetail.totalAmount || 0).toFixed(2) }}</div>
                </div>
              </div>
              <div class="amount-card-modern deposit-modern" v-if="(orderDetail.depositAmount || 0) > 0">
                <div class="amount-icon-modern">
                  <el-icon><CreditCard /></el-icon>
                </div>
                <div class="amount-content-modern">
                  <div class="amount-label-modern">定金</div>
                  <div class="amount-value-modern">¥{{ (orderDetail.depositAmount || 0).toFixed(2) }}</div>
                </div>
              </div>
              <div class="amount-card-modern collect-modern" v-if="(orderDetail.depositAmount || 0) > 0">
                <div class="amount-icon-modern">
                  <el-icon><Wallet /></el-icon>
                </div>
                <div class="amount-content-modern">
                  <div class="amount-label-modern">代收</div>
                  <div class="amount-value-modern">¥{{ ((orderDetail.totalAmount || 0) - (orderDetail.depositAmount || 0)).toFixed(2) }}</div>
                </div>
              </div>
            </div>

            <!-- 第二行：商品总额和优惠 -->
            <div class="amount-row-detail">
              <div class="amount-detail-item subtotal-item">
                <span class="detail-label">商品总额：</span>
                <span class="detail-value subtotal">¥{{ calculatedSubtotal.toFixed(2) }}</span>
              </div>
              <div class="amount-detail-item discount-item" v-if="(orderDetail.discount || 0) > 0">
                <span class="detail-label">优惠金额：</span>
                <span class="detail-value discount">-¥{{ (orderDetail.discount || 0).toFixed(2) }}</span>
              </div>
              <!-- 【批次205新增】显示总优惠金额(商品总额-订单总额) -->
              <div class="amount-detail-item discount-item" v-if="calculatedSubtotal > (orderDetail.totalAmount || 0)">
                <span class="detail-label">已优惠：</span>
                <span class="detail-value discount">-¥{{ (calculatedSubtotal - (orderDetail.totalAmount || 0)).toFixed(2) }}</span>
              </div>
              <!-- 支付方式 -->
              <div class="amount-detail-item payment-item" v-if="orderDetail.paymentMethod">
                <span class="detail-label">支付方式：</span>
                <span class="detail-value payment">{{ getPaymentMethodText(orderDetail.paymentMethod) }}</span>
              </div>
            </div>

            <!-- 定金截图 -->
            <div v-if="depositScreenshotList.length > 0" class="deposit-screenshot-horizontal">
              <span class="label">定金截图：</span>
              <div class="screenshots-container">
                <div
                  v-for="(screenshot, index) in depositScreenshotList"
                  :key="index"
                  class="screenshot-container"
                  @click="previewScreenshot(index)"
                >
                  <el-image
                    :src="screenshot"
                    fit="cover"
                    style="width: 60px; height: 45px; border-radius: 4px; margin-left: 8px;"
                  />
                  <div class="screenshot-overlay">
                    <el-icon class="zoom-icon"><ZoomIn /></el-icon>
                  </div>
                </div>
                <div v-if="depositScreenshotList.length > 1" class="screenshot-count">
                  共{{ depositScreenshotList.length }}张
                </div>
              </div>
            </div>

            <!-- 图片查看器 -->
            <el-image-viewer
              v-if="showImageViewer"
              :url-list="depositScreenshotList"
              :initial-index="currentImageIndex"
              @close="showImageViewer = false"
            />
          </div>
        </div>
      </el-card>
    </div>

    <!-- 第五排：物流信息跟踪 -->
    <div class="row-layout full-width">
      <el-card class="logistics-card">
        <template #header>
          <div class="card-header">
            <el-icon><Van /></el-icon>
            <span>物流信息跟踪</span>
            <el-button size="small" @click="refreshLogistics">刷新</el-button>
          </div>
        </template>

        <div class="logistics-timeline">
          <el-timeline v-if="logisticsInfo.length > 0">
            <el-timeline-item
              v-for="(item, index) in logisticsInfo"
              :key="index"
              :timestamp="item.time"
              :type="index === 0 ? 'primary' : 'info'"
              :size="index === 0 ? 'large' : 'normal'"
              placement="top"
            >
              <div class="logistics-content" :class="{ 'logistics-content-first': index === 0 }">
                <div class="logistics-status-text">{{ item.statusText || item.status }}</div>
                <div class="logistics-description">{{ item.description }}</div>
                <div class="logistics-location" v-if="item.location">
                  <el-icon><Location /></el-icon>
                  {{ item.location }}
                </div>
              </div>
            </el-timeline-item>
          </el-timeline>
          <el-empty v-else description="物流信息请点击上方刷新按钮获取" />
        </div>
      </el-card>
    </div>

    <!-- 第六排：操作记录折叠 -->
    <div class="row-layout full-width">
      <el-card class="operation-log-card">
        <template #header>
          <div class="card-header">
            <el-icon><List /></el-icon>
            <span>操作记录</span>
            <el-button
              size="small"
              type="text"
              @click="operationLogCollapsed = !operationLogCollapsed"
              :icon="operationLogCollapsed ? ArrowDown : ArrowUp"
            >
              {{ operationLogCollapsed ? '展开' : '收起' }}
            </el-button>
          </div>
        </template>

        <el-collapse-transition>
          <div v-show="!operationLogCollapsed">
            <el-table :data="operationLogs" style="width: 100%">
              <el-table-column prop="time" label="操作时间" width="180">
                <template #default="{ row }">
                  {{ formatDateTime(row.time) }}
                </template>
              </el-table-column>
              <el-table-column prop="operator" label="操作人" width="120" />
              <el-table-column prop="action" label="操作类型" width="120" />
              <el-table-column prop="description" label="操作描述" />
              <el-table-column prop="remark" label="备注" width="200" />
            </el-table>
          </div>
        </el-collapse-transition>
      </el-card>
    </div>

    <!-- 第七排：订单状态和轨迹折叠 -->
    <div class="row-layout full-width">
      <el-card class="status-timeline-card">
        <template #header>
          <div class="card-header">
            <el-icon><Clock /></el-icon>
            <span>订单状态和轨迹</span>
            <el-button
              size="small"
              type="text"
              @click="statusTimelineCollapsed = !statusTimelineCollapsed"
              :icon="statusTimelineCollapsed ? ArrowDown : ArrowUp"
            >
              {{ statusTimelineCollapsed ? '展开' : '收起' }}
            </el-button>
          </div>
        </template>

        <el-collapse-transition>
          <div v-show="!statusTimelineCollapsed">
            <el-timeline>
              <el-timeline-item
                v-for="(item, index) in orderTimeline"
                :key="index"
                :timestamp="item.timestamp"
                :type="item.type"
                :icon="item.icon"
                :color="item.color"
              >
                <div class="timeline-content">
                  <div class="timeline-title">{{ item.title }}</div>
                  <div class="timeline-description">{{ item.description }}</div>
                  <div v-if="item.operator" class="timeline-operator">操作人：{{ item.operator }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
          </div>
        </el-collapse-transition>
      </el-card>
    </div>

    <!-- 第八排：订单售后历史轨迹折叠 -->
    <div class="row-layout full-width">
      <el-card class="after-sales-card">
        <template #header>
          <div class="card-header">
            <el-icon><Service /></el-icon>
            <span>售后历史轨迹</span>
            <el-button
              size="small"
              type="text"
              @click="afterSalesCollapsed = !afterSalesCollapsed"
              :icon="afterSalesCollapsed ? ArrowDown : ArrowUp"
            >
              {{ afterSalesCollapsed ? '展开' : '收起' }}
            </el-button>
          </div>
        </template>

        <el-collapse-transition>
          <div v-show="!afterSalesCollapsed">
            <el-timeline v-if="afterSalesHistory.length > 0">
              <el-timeline-item
                v-for="(item, index) in afterSalesHistory"
                :key="index"
                :timestamp="item.timestamp"
                :type="getAfterSalesType(item.type)"
              >
                <div class="after-sales-content">
                  <div class="after-sales-title">{{ item.title }}</div>
                  <div class="after-sales-description">{{ item.description }}</div>
                  <div v-if="item.operator" class="after-sales-operator">处理人：{{ item.operator }}</div>
                  <div v-if="item.amount" class="after-sales-amount">金额：¥{{ item.amount.toFixed(2) }}</div>
                </div>
              </el-timeline-item>
            </el-timeline>
            <el-empty v-else description="暂无售后记录" />
          </div>
        </el-collapse-transition>
      </el-card>
    </div>

    <!-- 手机号验证对话框（统一组件） -->
    <PhoneVerifyDialog
      v-model:visible="phoneVerifyDialogVisible"
      :tracking-no="pendingTrackingNo"
      :loading="logisticsLoading"
      @submit="handlePhoneVerifySubmit"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import PhoneVerifyDialog from '@/components/Logistics/PhoneVerifyDialog.vue'
import {
  ArrowLeft, Clock, User, Phone, Message, Location, Van, Document,
  ShoppingBag, Money, List, Sell, Check, Plus, ArrowDown, ArrowUp, Service, Lock, Timer, ZoomIn,
  Warning, Close, ArrowRight, CreditCard, Wallet
} from '@element-plus/icons-vue'
import { useOrderStore } from '@/stores/order'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore } from '@/stores/notification'
import { orderApi } from '@/api/order'
import { orderDetailApi } from '@/api/orderDetail'
import { useServiceStore } from '@/stores/service'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { useUserStore } from '@/stores/user'
import { createSafeNavigator } from '@/utils/navigation'
import { useOrderFieldConfigStore } from '@/stores/orderFieldConfig'
import { getOrderStatusStyle, getOrderStatusText as getUnifiedStatusText } from '@/utils/orderStatusConfig'
import { formatDateTime } from '@/utils/dateFormat'
import { getCompanyShortName, getTrackingUrl, KUAIDI100_URL } from '@/utils/logisticsCompanyConfig'

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const orderStore = useOrderStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()
const serviceStore = useServiceStore()
const userStore = useUserStore()
const orderFieldConfigStore = useOrderFieldConfigStore()

// 响应式数据
const loading = ref(false)
const orderId = route.params.id as string

// 倒计时相关
const countdownSeconds = ref(180) // 3分钟 = 180秒
const countdownTimer = ref(null)
const countdownText = ref('03:00')

// 订单详情数据
const orderDetail = reactive({
  id: '',
  orderNumber: '',
  status: 'pending',
  auditStatus: 'pending', // 审核状态：pending, approved, rejected
  markType: '', // 标记类型：reserved, normal, return
  createTime: '',
  updateTime: '',
  auditTransferTime: '', // 流转审核时间
  isAuditTransferred: false, // 是否已流转到审核
  customer: {
    id: '',
    name: '',
    phone: '',
    wechat: '',
    address: '',
    level: 'normal',
    avatar: ''
  },
  receiverName: '',
  receiverPhone: '',
  receiverAddress: '',
  expressCompany: '',
  trackingNumber: '',
  serviceWechat: '',
  orderSource: '',
  expectedShipDate: '',
  expectedDeliveryDate: '',
  products: [],
  subtotal: 0,
  discount: 0,
  totalAmount: 0,
  depositAmount: 0,
  depositScreenshot: '',
  depositScreenshots: [],
  paymentMethod: '',
  paymentMethodOther: '',
  remark: '',
  customFields: {} as Record<string, any>
})

// 订单时间轴
const orderTimeline = ref([])

// 物流信息
const logisticsInfo = ref([])

// 操作记录
const operationLogs = ref([])

// 售后历史
const afterSalesHistory = ref([])

// 折叠状态
const operationLogCollapsed = ref(true)
const statusTimelineCollapsed = ref(true)
const afterSalesCollapsed = ref(true)

// 物流轨迹相关
const logisticsLoading = ref(false)

// 手机号验证相关
const phoneVerifyDialogVisible = ref(false)
const pendingTrackingNo = ref('')
const pendingCompanyCode = ref('')

// 事件监听器引用
const operationLogListener = (event: CustomEvent) => {
  const { orderId, log } = event.detail
  if (orderId === route.params.id) {
    operationLogs.value.unshift(log)
  }
}

const orderStatusListener = (event: CustomEvent) => {
  const { orderId, newStatus } = event.detail
  if (orderId === route.params.id) {
    orderDetail.status = newStatus
    // 刷新操作记录和状态轨迹
    loadOperationLogs()
    loadOrderTimeline()
  }
}

const logisticsStatusListener = (event: CustomEvent) => {
  const result = event.detail
  if (orderDetail.trackingNumber === result.trackingNumber) {
    refreshLogistics()
  }
}

const afterSalesUpdateListener = (event: CustomEvent) => {
  const { orderId, serviceId } = event.detail
  if (orderId === route.params.id) {
    // 重新加载售后历史数据
    loadAfterSalesHistory()
  }
}

const serviceStatusUpdateListener = (event: CustomEvent) => {
  const { orderId, serviceId, newStatus } = event.detail
  if (orderId === route.params.id) {
    // 重新加载售后历史数据
    loadAfterSalesHistory()
  }
}

// 设置事件监听器
const setupEventListeners = () => {
  window.addEventListener('operation-log-update', operationLogListener)
  window.addEventListener('order-status-update', orderStatusListener)
  window.addEventListener('logistics-status-update', logisticsStatusListener)
  window.addEventListener('after-sales-update', afterSalesUpdateListener)
  window.addEventListener('service-status-update', serviceStatusUpdateListener)
}

// 加载操作记录 - 从后端API获取
const loadOperationLogs = async () => {
  try {
    const logs = await orderDetailApi.getOperationLogs(orderId)
    operationLogs.value = logs.map((log: any) => ({
      time: log.time,
      operator: log.operator,
      action: log.action,
      description: log.description,
      remark: log.remark || ''
    }))
    console.log(`[订单详情] 加载到 ${operationLogs.value.length} 条操作记录`)
  } catch (error) {
    console.error('加载操作记录失败:', error)
    // 如果API失败，尝试从本地store获取
    operationLogs.value = orderStore.getOperationLogs(orderId)
  }
}

// 加载售后历史数据 - 从后端API获取
const loadAfterSalesHistory = async () => {
  try {
    const services = await orderDetailApi.getAfterSalesHistory(orderId)

    // 将售后服务数据转换为历史轨迹格式
    afterSalesHistory.value = services.map((service: any) => ({
      timestamp: service.timestamp,
      type: service.type,
      title: service.title || getAfterSalesTitle(service.type, service.status),
      description: service.description,
      operator: service.operator,
      amount: service.amount || 0,
      status: service.status,
      serviceNumber: service.serviceNumber
    }))

    // 按时间倒序排列
    afterSalesHistory.value.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    console.log(`[订单详情] 加载到 ${afterSalesHistory.value.length} 条售后记录`)
  } catch (error) {
    console.error('加载售后历史失败，尝试从本地store获取:', error)
    // 如果API失败，尝试从本地store获取
    try {
      const afterSalesServices = serviceStore.getServicesByOrderId(orderDetail.id)
      afterSalesHistory.value = afterSalesServices.map((service: any) => ({
        timestamp: service.createTime,
        type: service.serviceType,
        title: getAfterSalesTitle(service.serviceType, service.status),
        description: service.description || service.reason,
        operator: service.createdBy,
        amount: service.price || 0,
        status: service.status,
        serviceNumber: service.serviceNumber
      }))
    } catch (e) {
      afterSalesHistory.value = []
    }
  }
}

// 获取售后标题
const getAfterSalesTitle = (type: string, status: string) => {
  const typeTexts = {
    'return': '退货申请',
    'exchange': '换货申请',
    'repair': '维修申请',
    'refund': '退款申请'
  }

  const statusTexts = {
    'pending': '已提交',
    'processing': '处理中',
    'resolved': '已解决',
    'closed': '已关闭'
  }

  return `${typeTexts[type] || '售后申请'} - ${statusTexts[status] || status}`
}

// 加载订单状态轨迹 - 从后端API获取
const loadOrderTimeline = async () => {
  try {
    const statusHistory = await orderDetailApi.getStatusHistory(orderId)

    if (statusHistory && statusHistory.length > 0) {
      // 使用真实的状态历史数据
      orderTimeline.value = statusHistory.map((history: any) => ({
        timestamp: history.timestamp,
        type: getTimelineType(history.status),
        icon: getTimelineIcon(history.status),
        color: getTimelineColor(history.status),
        title: history.title || getStatusText(history.status),
        description: history.description || `订单状态变更为：${getStatusText(history.status)}`,
        operator: history.operator || '系统'
      }))
      console.log(`[订单详情] 加载到 ${orderTimeline.value.length} 条状态历史`)
    } else {
      // 如果没有状态历史，使用当前订单状态生成基础轨迹
      orderTimeline.value = [
        {
          timestamp: orderDetail.createTime,
          type: 'info',
          icon: Plus,
          color: '#909399',
          title: '订单创建',
          description: `订单创建成功，订单号：${orderDetail.orderNumber}`,
          operator: '系统'
        }
      ]
    }

    // 按时间倒序排列
    orderTimeline.value.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  } catch (error) {
    console.error('加载订单状态轨迹失败，尝试从本地store获取:', error)
    // 如果API失败，尝试从本地store获取
    const localHistory = orderStore.getOrderStatusHistory(orderId)
    if (localHistory && localHistory.length > 0) {
      orderTimeline.value = localHistory.map((history: any) => ({
        timestamp: history.timestamp,
        type: getTimelineType(history.status),
        icon: getTimelineIcon(history.status),
        color: getTimelineColor(history.status),
        title: history.title || getStatusText(history.status),
        description: history.description || `订单状态变更为：${getStatusText(history.status)}`,
        operator: history.operator || '系统'
      }))
    } else {
      orderTimeline.value = [
        {
          timestamp: orderDetail.createTime,
          type: 'info',
          icon: Plus,
          color: '#909399',
          title: '订单创建',
          description: `订单创建成功，订单号：${orderDetail.orderNumber}`,
          operator: '系统'
        }
      ]
    }
  }
}

// 获取时间轴类型
const getTimelineType = (status: string) => {
  const types = {
    'pending': 'info',
    'pending_approval': 'warning',
    'approved': 'success',
    'rejected': 'danger',
    'pending_shipment': 'warning',
    'shipped': 'primary',
    'delivered': 'success',
    'completed': 'success',
    'cancelled': 'danger'
  }
  return types[status] || 'info'
}

// 获取时间轴图标
const getTimelineIcon = (status: string) => {
  const icons = {
    'pending': Clock,
    'pending_approval': Clock,
    'approved': Check,
    'rejected': Close,
    'pending_shipment': Clock,
    'shipped': Van,
    'delivered': Check,
    'completed': Check,
    'cancelled': Close
  }
  return icons[status] || Clock
}

// 获取时间轴颜色
const getTimelineColor = (status: string) => {
  const colors = {
    'pending': '#909399',
    'pending_approval': '#e6a23c',
    'approved': '#67c23a',
    'rejected': '#f56c6c',
    'pending_shipment': '#e6a23c',
    'shipped': '#409eff',
    'delivered': '#67c23a',
    'completed': '#67c23a',
    'cancelled': '#f56c6c'
  }
  return colors[status] || '#909399'
}

// 计算属性
const showCountdown = computed(() => {
  // 只有在订单状态为pending_transfer（待流转）时显示倒计时
  return orderDetail.status === 'pending_transfer' &&
         orderDetail.markType === 'normal' &&
         orderDetail.auditTransferTime &&
         !orderDetail.isAuditTransferred
})

const canCreateAfterSales = computed(() => {
  // 建立售后按钮只有在已发货及之后的状态才可点击
  // 可点击状态：已发货、已送达、已完成、异常、拒收、拒收已退回等
  const allowedStatuses = ['shipped', 'delivered', 'completed', 'abnormal', 'rejected', 'rejected_returned']
  return allowedStatuses.includes(orderDetail.status)
})

const canApprove = computed(() => {
  return orderDetail.status === 'pending_approval'
})

const canReject = computed(() => {
  return orderDetail.status === 'pending_approval'
})

// 判断是否可以修改标记
const canModifyMark = computed(() => {
  // 已审核通过的订单不能修改标记
  if (orderDetail.auditStatus === 'approved') {
    return false
  }

  // 🔥 已流转到待审核状态（pending_audit）的订单不能修改标记
  // 只有待流转（pending_transfer）状态才能修改
  if (orderDetail.status === 'pending_audit') {
    return false
  }

  // 有取消申请的订单不能修改标记（待取消、已取消、取消失败）
  if (orderDetail.status === 'pending_cancel' ||
      orderDetail.status === 'cancelled' ||
      orderDetail.status === 'cancel_failed') {
    return false
  }

  // 🔥 待流转状态可以修改标记（在延迟提交审核的时间内）
  // 预留单和退单也可以修改（改回正常发货单）
  return true
})

// 判断是否在审核流程中（已锁定状态）
const isInAuditProcess = computed(() => {
  // 已流转到待审核状态
  return orderDetail.status === 'pending_audit'
})

// 图片查看器
const showImageViewer = ref(false)
const currentImageIndex = ref(0)

// 🔥 判断是否已发货且有物流单号（用于显示物流信息）
const hasShippedWithTracking = computed(() => {
  // 已发货及之后的状态，且有物流单号
  const shippedStatuses = ['shipped', 'delivered', 'completed', 'package_exception', 'rejected', 'rejected_returned']
  return shippedStatuses.includes(orderDetail.status) && !!orderDetail.trackingNumber
})

// 动态计算商品总额
const calculatedSubtotal = computed(() => {
  if (!orderDetail.products || orderDetail.products.length === 0) {
    return 0
  }
  return orderDetail.products.reduce((sum, product) => {
    return sum + (product.price * product.quantity)
  }, 0)
})

// 计算是否可以修改为预留单（流转前）
const canChangeToReserved = computed(() => {
  return orderDetail.markType === 'normal' &&
         orderDetail.auditStatus === 'pending' &&
         !orderDetail.isAuditTransferred
})

// 定金截图列表计算属性
const depositScreenshotList = computed(() => {
  // 优先使用新的多张截图字段，如果没有则使用单张截图字段
  if (orderDetail.depositScreenshots && orderDetail.depositScreenshots.length > 0) {
    return orderDetail.depositScreenshots
  } else if (orderDetail.depositScreenshot) {
    return [orderDetail.depositScreenshot]
  }
  return []
})

// 方法
const goBack = () => {
  router.back()
}

// 预览定金截图
const previewScreenshot = (index: number) => {
  currentImageIndex.value = index
  showImageViewer.value = true
}

// 检查是否已存在售后记录
const checkExistingAfterSales = async (orderId: string) => {
  return await serviceStore.checkExistingAfterSales(orderId)
}

const createAfterSales = async () => {
  try {
    // 首先检查是否已存在售后记录
    const existingAfterSales = await checkExistingAfterSales(orderDetail.id)

    if (existingAfterSales) {
      // 如果已存在售后记录，直接跳转到售后详情页
      safeNavigator.push(`/service/detail/${existingAfterSales.id}`)
      ElMessage.info('该订单已有售后记录，已跳转到售后详情页')
    } else {
      // 如果不存在售后记录，跳转到新增售后页面并传递订单信息
      safeNavigator.push({
        path: '/service/add',
        query: {
          orderId: orderDetail.id,
          orderNumber: orderDetail.orderNumber,
          customerId: orderDetail.customer.id,
          customerName: orderDetail.customer.name,
          customerPhone: orderDetail.customer.phone
        }
      })
    }
  } catch (error) {
    console.error('检查售后记录失败:', error)
    // 如果检查失败，仍然跳转到新增页面
    safeNavigator.push({
      path: '/service/add',
      query: {
        orderId: orderDetail.id,
        orderNumber: orderDetail.orderNumber,
        customerId: orderDetail.customer.id,
        customerName: orderDetail.customer.name,
        customerPhone: orderDetail.customer.phone
      }
    })
  }
}

const handleMarkCommand = async (command: string) => {
  // 检查是否选择了相同的标记
  if (command === orderDetail.markType) {
    ElMessage.warning('订单已经是该标记状态')
    return
  }

  const markTypes: Record<string, string> = {
    'reserved': '预留单',
    'normal': '正常发货单',
    'return': '退单'
  }

  // 🔥 权限检查：只有待流转状态才能修改标记
  if (!canModifyMark.value) {
    if (orderDetail.auditStatus === 'approved') {
      ElMessage.warning('订单已审核通过，无法修改标记')
    } else if (orderDetail.status === 'pending_audit') {
      ElMessage.warning('订单已流转到审核，无法修改标记。如需修改，请等待审核完成或联系审核员退回订单。')
    } else {
      ElMessage.warning('当前状态下无法修改订单标记')
    }
    return
  }

  // 构建确认消息
  let confirmMessage = `确认将此订单标记为"${markTypes[command]}"？`
  if (command === 'reserved') {
    confirmMessage += '\n注意：修改为预留单后，订单将不会流转到审核，信息将保留在系统中。'
  } else if (command === 'return') {
    confirmMessage += '\n注意：修改为退单后，订单将不会流转到审核，信息将保留在系统中。'
  }

  try {
    await ElMessageBox.confirm(confirmMessage, '确认标记', { type: 'warning' })

    console.log('[订单详情] 开始更新标记，订单ID:', orderId, '新标记:', command)

    // 调用后端API更新标记
    const response = await orderApi.updateMarkType(orderId, { markType: command })
    console.log('[订单详情] API响应:', response)

    if (response && (response.success !== false)) {
      // 停止倒计时（如果正在运行）
      if (countdownTimer.value) {
        clearInterval(countdownTimer.value)
        countdownTimer.value = null
      }

      // 更新本地订单标记状态
      orderDetail.markType = command

      // 如果是预留单或退单，标记为已处理防止自动流转
      if (command === 'reserved' || command === 'return') {
        orderDetail.isAuditTransferred = true
      }

      // 更新orderStore中的数据
      orderStore.updateOrder(orderId, {
        markType: command,
        isAuditTransferred: command === 'reserved' || command === 'return'
      })

      // 显示成功提示
      if (command === 'return') {
        ElMessage.success('订单已标记为退单，信息已保留在系统中')
      } else if (command === 'reserved') {
        ElMessage.success('订单已标记为预留单，信息已保留在系统中')
      } else if (command === 'normal') {
        ElMessage.success('订单已标记为正常发货单')
      } else {
        ElMessage.success(`订单已标记为${markTypes[command]}`)
      }

      // 发送通知 - 使用正确的sendMessage签名: (type, content, options)
      notificationStore.sendMessage(
        notificationStore.MessageType.SYSTEM_UPDATE,
        `订单 ${orderDetail.orderNumber} 已标记为${markTypes[command]}`,
        {
          relatedId: orderDetail.id,
          relatedType: 'order',
          actionUrl: `/order/detail/${orderId}`
        }
      )
    } else {
      console.error('[订单详情] 更新标记失败，响应:', response)
      ElMessage.error(response?.message || '更新订单标记失败')
    }
  } catch (error: unknown) {
    // 用户取消操作
    if (error === 'cancel' || (error as Error)?.message === 'cancel') {
      return
    }
    console.error('[订单详情] 更新订单标记异常:', error)
    const errorMsg = (error as any)?.response?.data?.message || (error as Error)?.message || '更新订单标记失败，请重试'
    ElMessage.error(errorMsg)
  }
}

const approveOrder = async () => {
  try {
    await ElMessageBox.confirm('确认审核通过此订单？', '审核确认', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 使用store方法同步状态和添加操作记录
    orderStore.syncOrderStatus(orderId, 'pending_shipment', '审核员', '订单审核通过，等待发货')
    orderDetail.status = 'pending_shipment'

    // 发送通知消息 - 使用正确的sendMessage签名
    notificationStore.sendMessage(
      notificationStore.MessageType.ORDER_AUDIT_APPROVED,
      `订单 ${orderDetail.orderNumber} (客户: ${orderDetail.customer.name}, 金额: ¥${orderDetail.totalAmount?.toLocaleString()}) 已审核通过`,
      {
        relatedId: orderId,
        relatedType: 'order',
        actionUrl: `/order/detail/${orderId}`
      }
    )

    ElMessage.success('订单审核通过')
  } catch (error) {
    // 用户取消
  }
}

const rejectOrder = async () => {
  try {
    const { value: reason } = await ElMessageBox.prompt('请输入拒绝原因', '审核拒绝', {
      confirmButtonText: '确认',
      cancelButtonText: '取消',
      inputPattern: /.+/,
      inputErrorMessage: '请输入拒绝原因'
    })

    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))

    // 使用store方法同步状态和添加操作记录
    orderStore.syncOrderStatus(orderId, 'audit_rejected', '审核员', `订单审核拒绝：${reason}`)
    orderDetail.status = 'audit_rejected'

    // 发送通知消息 - 使用正确的sendMessage签名
    notificationStore.sendMessage(
      notificationStore.MessageType.ORDER_AUDIT_REJECTED,
      `订单 ${orderDetail.orderNumber} (客户: ${orderDetail.customer.name}, 金额: ¥${orderDetail.totalAmount?.toLocaleString()}) 已审核拒绝，原因: ${reason}`,
      {
        relatedId: orderId,
        relatedType: 'order',
        actionUrl: `/order/detail/${orderId}`
      }
    )

    ElMessage.success('订单已拒绝')
  } catch (error) {
    // 用户取消
  }
}

const callCustomer = () => {
  window.open(`tel:${orderDetail.customer.phone}`)
}

const goToCustomerDetail = () => {
  console.log('goToCustomerDetail called')
  console.log('orderDetail.customer:', orderDetail.customer)
  console.log('customer id:', orderDetail.customer.id)
  console.log('跳转路径:', `/customer/detail/${orderDetail.customer.id}`)
  safeNavigator.push(`/customer/detail/${orderDetail.customer.id}`)
}

// 复制物流单号并提示选择跳转网站（使用统一的物流查询弹窗）
const trackExpress = async () => {
  if (!orderDetail.trackingNumber) {
    ElMessage.warning('物流单号不存在')
    return
  }

  const { showLogisticsQueryDialog } = await import('@/utils/logisticsQuery')
  showLogisticsQueryDialog({
    trackingNo: orderDetail.trackingNumber,
    companyCode: orderDetail.expressCompany,
    router
  })
}

// 动态更新预计到达时间
const updateEstimatedDeliveryTime = (logisticsResult: any) => {
  try {
    // 根据物流状态和位置信息计算预计到达时间
    const tracks = logisticsResult.tracks || []
    const latestTrack = tracks[0] // 最新的物流信息

    if (!latestTrack) return

    // 根据物流状态判断预计到达时间
    const currentTime = new Date()
    let estimatedDays = 0

    // 根据物流状态和快递公司估算剩余时间
    const status = latestTrack.status || latestTrack.statusText || ''
    const expressCompany = orderDetail.expressCompany

    if (status.includes('已签收') || status.includes('delivered')) {
      // 已签收，无需更新
      return
    } else if (status.includes('派送中') || status.includes('out_for_delivery')) {
      estimatedDays = 0.5 // 半天内到达
    } else if (status.includes('到达') || status.includes('arrived')) {
      estimatedDays = 1 // 1天内到达
    } else if (status.includes('运输中') || status.includes('in_transit')) {
      // 根据快递公司和距离估算
      if (expressCompany === 'SF') {
        estimatedDays = 1 // 顺丰较快
      } else if (expressCompany === 'YTO' || expressCompany === 'ZTO') {
        estimatedDays = 2 // 中通、圆通中等
      } else {
        estimatedDays = 3 // 其他快递
      }
    } else {
      estimatedDays = 3 // 默认3天
    }

    // 计算预计到达时间
    const estimatedDate = new Date(currentTime.getTime() + estimatedDays * 24 * 60 * 60 * 1000)
    orderDetail.expectedDeliveryDate = estimatedDate.toISOString().split('T')[0]

  } catch (error) {
    console.error('更新预计到达时间失败:', error)
  }
}

const refreshLogistics = async (phone?: string) => {
  if (!orderDetail.trackingNumber || !orderDetail.expressCompany) {
    // 🔥 改进提示：不要误导用户
    logisticsInfo.value = []
    return
  }

  try {
    logisticsLoading.value = true

    // 🔥 自动使用订单中的手机号（如果没有手动传入）
    const phoneToUse = phone || orderDetail.receiverPhone || orderDetail.customer?.phone || ''
    console.log('[订单详情] 查询物流，使用手机号:', phoneToUse ? phoneToUse.slice(-4) + '****' : '未提供')

    // 🔥 直接调用物流API，支持手机号验证
    const { logisticsApi } = await import('@/api/logistics')
    const response = await logisticsApi.queryTrace(
      orderDetail.trackingNumber,
      orderDetail.expressCompany,
      phoneToUse
    )

    if (response && response.success && response.data) {
      const data = response.data

      // 🔥 检查是否需要手机号验证（即使带了手机号也可能验证失败，因为可能是寄件人手机号）
      if (data.status === 'need_phone_verify' ||
          (!data.success && (data.statusText === '需要手机号验证' || data.statusText?.includes('routes为空')))) {
        // 弹出手机号验证对话框，让用户手动输入
        pendingTrackingNo.value = orderDetail.trackingNumber
        pendingCompanyCode.value = orderDetail.expressCompany
        phoneVerifyDialogVisible.value = true
        logisticsLoading.value = false
        return
      }

      if (data.success && data.traces && data.traces.length > 0) {
        // 转换并显示物流轨迹数据（🔥 倒序显示，最新的在最上面）
        logisticsInfo.value = data.traces.map((track: any) => ({
          time: track.time,
          status: track.status,
          statusText: track.description || track.status,
          description: track.description || track.status || '状态更新',
          location: track.location || ''
        })).reverse()  // 🔥 倒序排列

        ElMessage.success('物流信息已更新')
      } else {
        // 🔥 如果没有查询到数据，给出友好提示
        logisticsInfo.value = []
        const friendlyMessage = getFriendlyNoTraceMessage(data.statusText)
        ElMessage.info(friendlyMessage)
      }
    } else {
      logisticsInfo.value = []
      // 🔥 友好提示
      const friendlyMessage = getFriendlyNoTraceMessage(response?.message)
      ElMessage.info(friendlyMessage)
    }
  } catch (error) {
    console.error('获取物流信息失败:', error)
    logisticsInfo.value = []
    ElMessage.error('获取物流信息失败，请检查网络连接或稍后重试')
  } finally {
    logisticsLoading.value = false
  }
}

/**
 * 🔥 获取友好的无物流信息提示
 * 针对刚发货的订单给出更友好的提示
 */
const getFriendlyNoTraceMessage = (originalMessage?: string) => {
  // 如果是API未配置等技术性错误，给出友好提示
  if (originalMessage?.includes('API未配置') ||
      originalMessage?.includes('未查询到') ||
      originalMessage?.includes('routes为空') ||
      !originalMessage) {
    return '暂无物流信息，快递可能刚揽收，建议12-24小时后再查询'
  }
  // 其他情况返回原始消息
  return originalMessage
}

// 手机号验证后重新查询物流（统一组件回调）
const handlePhoneVerifySubmit = (phone: string) => {
  phoneVerifyDialogVisible.value = false
  refreshLogistics(phone)
}

// 物流轨迹相关辅助方法
const getLogisticsType = (status: string) => {
  if (!status) return 'info'

  const types = {
    // 英文状态
    'delivered': 'success',
    'out_for_delivery': 'primary',
    'in_transit': 'primary',
    'picked_up': 'info',
    'pending': 'info',
    'exception': 'warning',
    'rejected': 'danger',
    // 中文状态
    '已签收': 'success',
    '已送达': 'success',
    '派送中': 'primary',
    '运输中': 'primary',
    '在途': 'primary',
    '已揽收': 'info',
    '已发货': 'info',
    '待发货': 'info',
    '异常': 'warning',
    '拒收': 'danger',
    '退回': 'danger'
  }

  // 检查完全匹配
  if (types[status]) {
    return types[status]
  }

  // 检查包含关键词
  if (status.includes('签收') || status.includes('送达')) return 'success'
  if (status.includes('派送') || status.includes('运输') || status.includes('在途')) return 'primary'
  if (status.includes('揽收') || status.includes('发货')) return 'info'
  if (status.includes('异常') || status.includes('问题')) return 'warning'
  if (status.includes('拒收') || status.includes('退回')) return 'danger'

  return 'info'
}

const getLogisticsIcon = (status: string) => {
  const icons = {
    'delivered': Check,
    'out_for_delivery': Van,
    'in_transit': Van,
    'picked_up': Van,
    'pending': Clock,
    'exception': Warning,
    'rejected': Close
  }
  return icons[status] || Clock
}

// 辅助方法
const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    // 新的状态枚举
    'pending_transfer': 'info',      // 待流转 - 灰色
    'pending_audit': 'warning',      // 待审核 - 橙色
    'audit_rejected': 'danger',      // 审核拒绝 - 红色
    'pending_shipment': 'primary',   // 待发货 - 蓝色
    'shipped': 'primary',            // 已发货 - 蓝色
    'delivered': 'success',          // 已签收 - 绿色
    'package_exception': 'warning',  // 包裹异常 - 橙色
    'rejected': 'danger',            // 拒收 - 红色
    'rejected_returned': 'info',     // 拒收已退回 - 灰色
    'after_sales_created': 'warning', // 已建售后 - 橙色
    'cancelled': 'info',             // 已取消 - 灰色
    'draft': 'info',                 // 草稿 - 灰色

    // 兼容旧状态
    'pending': 'warning',
    'pending_approval': 'warning',
    'approved': 'success',
    'paid': 'success',
    'completed': 'success',
    'confirmed': 'success'
  }
  return types[status] || 'info'
}

const getStatusText = (status: string) => {
  const texts = {
    // 新的状态枚举
    'pending_transfer': '待流转',
    'pending_audit': '待审核',
    'audit_rejected': '审核拒绝',
    'pending_shipment': '待发货',
    'shipped': '已发货',
    'delivered': '已签收',
    'package_exception': '包裹异常',
    'rejected': '拒收',
    'rejected_returned': '拒收已退回',
    'after_sales_created': '已建售后',
    'cancelled': '已取消',
    'draft': '草稿',

    // 兼容旧状态
    'pending': '待处理',
    'pending_approval': '待审核',
    'approved': '已审核',
    'paid': '已付款',
    'completed': '已完成',
    'confirmed': '已确认'
  }
  return texts[status] || status
}

// 获取支付方式文本
const getPaymentMethodText = (method: string | null | undefined) => {
  if (!method) return '-'
  // 如果是"其他"且有自定义文本，显示自定义文本
  if (method === 'other' && orderDetail.paymentMethodOther) {
    return orderDetail.paymentMethodOther
  }
  const methodMap: Record<string, string> = {
    wechat: '微信支付',
    alipay: '支付宝',
    bank_transfer: '银行转账',
    unionpay: '云闪付',
    cod: '货到付款',
    cash: '现金',
    card: '刷卡',
    other: '其他'
  }
  return methodMap[method] || method
}

const getLevelType = (level: string) => {
  const types = {
    'vip': 'warning',
    'premium': 'danger',
    'normal': 'info'
  }
  return types[level] || 'info'
}

const getLevelText = (level: string) => {
  const texts = {
    'vip': 'VIP客户',
    'premium': '高级客户',
    'normal': '普通客户'
  }
  return texts[level] || '普通客户'
}

const getExpressCompanyText = (code: string) => {
  if (!code) return '-'
  const companies: Record<string, string> = {
    'SF': '顺丰速运',
    'YTO': '圆通速递',
    'ZTO': '中通快递',
    'STO': '申通快递',
    'YD': '韵达快递',
    'JTSD': '极兔速递',
    'EMS': 'EMS',
    'YZBK': '邮政包裹',
    'DBL': '德邦快递',
    'JD': '京东物流',
    // 兼容小写键名
    'sf': '顺丰速运',
    'yto': '圆通速递',
    'zto': '中通快递',
    'sto': '申通快递',
    'yd': '韵达快递',
    'jtsd': '极兔速递',
    'ems': 'EMS',
    'yzbk': '邮政包裹',
    'dbl': '德邦快递',
    'jd': '京东物流'
  }
  return companies[code] || code
}

// 🔥 获取自定义字段值（支持customFields对象和独立字段两种格式）
const getCustomFieldValue = (fieldKey: string) => {
  // 优先从customFields对象获取
  if (orderDetail.customFields && orderDetail.customFields[fieldKey]) {
    return orderDetail.customFields[fieldKey]
  }
  // 兼容独立字段格式（如customField1）
  const independentKey = fieldKey.replace('custom_field', 'customField')
  if (orderDetail[independentKey]) {
    return orderDetail[independentKey]
  }
  return null
}

// 格式化自定义字段值
const formatCustomFieldValue = (field: any, value: any) => {
  if (value === null || value === undefined || value === '') return '-'
  if (field.fieldType === 'select' || field.fieldType === 'radio') {
    const option = field.options?.find((opt: any) => opt.value === value)
    return option?.label || value
  }
  if (field.fieldType === 'checkbox' && Array.isArray(value)) {
    return value.map((v: string) => {
      const option = field.options?.find((opt: any) => opt.value === v)
      return option?.label || v
    }).join(', ')
  }
  if (field.fieldType === 'date' || field.fieldType === 'datetime') {
    return formatDateTime(value)
  }
  return String(value)
}

const getOrderSourceText = (source: string) => {
  const sources = {
    'online_store': '线上商城',
    'wechat_mini': '微信小程序',
    'wechat_service': '微信客服',
    'phone_call': '电话咨询',
    'offline_store': '线下门店',
    'referral': '客户推荐',
    'advertisement': '广告投放',
    'other': '其他渠道'
  }
  return sources[source] || source
}

const getStatusCardClass = (status: string) => {
  const classes = {
    'draft': 'status-draft',
    'pending': 'status-pending',
    'pending_approval': 'status-pending-approval',
    'approved': 'status-approved',
    'rejected': 'status-rejected',
    'paid': 'status-paid',
    'shipped': 'status-shipped',
    'delivered': 'status-delivered',
    'completed': 'status-completed',
    'cancelled': 'status-cancelled'
  }
  return classes[status] || ''
}

const getAfterSalesType = (type: string) => {
  const types = {
    'refund': 'warning',
    'return': 'danger',
    'exchange': 'primary',
    'repair': 'info',
    'complaint': 'danger'
  }
  return types[type] || 'info'
}

const getMarkType = (markType: string) => {
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[markType] || 'info'
}

const getMarkText = (markType: string) => {
  const texts = {
    'reserved': '预留单',
    'normal': '正常发货单',
    'return': '退单'
  }
  return texts[markType] || markType
}

const getMarkButtonType = () => {
  if (!orderDetail.markType) return 'default'
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[orderDetail.markType] || 'default'
}

const getMarkTagType = (markType: string) => {
  const types = {
    'reserved': 'warning',
    'normal': 'success',
    'return': 'danger'
  }
  return types[markType] || 'info'
}

// formatDateTime 已从 @/utils/dateFormat 导入

const formatDate = (date: string) => {
  if (!date) return ''
  return new Date(date).toLocaleDateString('zh-CN')
}

// 加载订单详情
const loadOrderDetail = async () => {
  try {
    loading.value = true

    // 确保客户数据已加载
    if (customerStore.customers.length === 0) {
      await customerStore.loadCustomers()
    }

    // 🔥 先尝试从API获取订单详情
    let order = null
    try {
      console.log('[订单详情] 正在从API加载订单:', orderId)
      const response = await orderApi.getDetail(orderId)
      if (response.success && response.data) {
        order = response.data
        console.log('[订单详情] API加载成功:', order.orderNumber)
      }
    } catch (apiError) {
      console.warn('[订单详情] API加载失败，尝试从本地store获取:', apiError)
    }

    // 如果API没有返回数据，从本地store获取
    if (!order) {
      order = orderStore.getOrderById(orderId)
    }

    if (!order) {
      ElMessage.error('订单不存在')
      safeNavigator.push('/order/list')
      return
    }

    // 获取客户信息
    const customer = customerStore.getCustomerById(order.customerId)

    // 更新订单详情数据
    Object.assign(orderDetail, {
      id: order.id,
      orderNumber: order.orderNumber,
      status: order.status,
      auditStatus: order.auditStatus || 'pending', // 审核状态
      markType: order.markType || 'normal', // 默认为正常发货单
      createTime: order.createTime,
      updateTime: order.createTime, // 暂时使用创建时间
      auditTransferTime: order.auditTransferTime || '', // 流转审核时间
      isAuditTransferred: order.isAuditTransferred || false, // 是否已流转到审核
      customer: customer ? {
        id: customer.id,
        name: customer.name,
        phone: customer.phone,
        wechat: customer.wechatId || '',
        address: customer.address,
        level: customer.level,
        avatar: ''
      } : {
        id: order.customerId,
        name: order.customerName,
        phone: order.customerPhone,
        wechat: '',
        address: '',
        level: 'normal',
        avatar: ''
      },
      receiverName: order.receiverName,
      receiverPhone: order.receiverPhone,
      receiverAddress: order.receiverAddress,
      expressCompany: order.expressCompany || '',
      trackingNumber: order.trackingNumber || '',
      serviceWechat: order.serviceWechat || '',
      orderSource: order.orderSource || '',
      expectedShipDate: order.expectedShipDate || '',
      expectedDeliveryDate: order.expectedDeliveryDate || '',
      products: order.products,
      subtotal: order.subtotal,
      discount: order.discount,
      totalAmount: order.totalAmount,
      depositAmount: order.depositAmount,
      depositScreenshot: order.depositScreenshot || '',
      depositScreenshots: order.depositScreenshots || [],
      paymentMethod: order.paymentMethod || '',
      paymentMethodOther: order.paymentMethodOther || '',
      remark: order.remark,
      customFields: order.customFields || {}
    })

    // 加载订单状态轨迹
    loadOrderTimeline()

    // 加载操作记录
    loadOperationLogs()

    // 加载售后历史数据
    loadAfterSalesHistory()

    // 加载物流信息（如果有物流单号和快递公司）
    if (orderDetail.trackingNumber && orderDetail.expressCompany) {
      refreshLogistics()
    }

    // 设置事件监听
    setupEventListeners()

    // 初始化倒计时
    initCountdown()
  } catch (error) {
    ElMessage.error('加载订单详情失败')
    safeNavigator.push('/order/list')
  } finally {
    loading.value = false
  }
}

// 倒计时相关方法
const initCountdown = () => {
  console.log('[倒计时] 初始化倒计时', {
    markType: orderDetail.markType,
    status: orderDetail.status,
    auditStatus: orderDetail.auditStatus,
    isAuditTransferred: orderDetail.isAuditTransferred,
    auditTransferTime: orderDetail.auditTransferTime
  })

  // 清除之前的定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }

  // 只有正常发货单且状态为pending_transfer才需要倒计时
  if (orderDetail.markType !== 'normal' || orderDetail.status !== 'pending_transfer') {
    console.log('[倒计时] 不满足倒计时条件，跳过')
    return
  }

  // 如果已流转，不需要倒计时
  if (orderDetail.isAuditTransferred) {
    console.log('[倒计时] 订单已流转，跳过')
    return
  }

  // 必须有流转时间
  if (!orderDetail.auditTransferTime) {
    console.log('[倒计时] 没有流转时间，无法启动倒计时')
    return
  }

  // 开始倒计时
  updateCountdown()
  countdownTimer.value = setInterval(updateCountdown, 1000)
  console.log('[倒计时] 倒计时已启动')
}

const updateCountdown = () => {
  if (!orderDetail.auditTransferTime) return

  const transferTime = new Date(orderDetail.auditTransferTime).getTime()
  const now = Date.now()
  const remaining = Math.max(0, transferTime - now)

  console.log('[倒计时] 更新倒计时', {
    流转时间字符串: orderDetail.auditTransferTime,
    流转时间戳: transferTime,
    当前时间戳: now,
    剩余毫秒: remaining,
    剩余秒数: Math.floor(remaining / 1000)
  })

  if (remaining <= 0) {
    // 时间到了，调用后端API执行流转
    countdownSeconds.value = 0
    countdownText.value = '正在流转...'
    if (countdownTimer.value) {
      clearInterval(countdownTimer.value)
      countdownTimer.value = null
    }

    // 调用后端流转API
    transferToAudit()
    return
  }

  countdownSeconds.value = Math.floor(remaining / 1000)

  // 格式化倒计时文本
  const minutes = Math.floor(countdownSeconds.value / 60)
  const seconds = countdownSeconds.value % 60
  countdownText.value = `${minutes}分${seconds.toString().padStart(2, '0')}秒`
}

const transferToAudit = () => {
  // 标记为已流转
  orderDetail.isAuditTransferred = true

  // 更新订单状态为待审核
  orderDetail.status = 'pending_audit'
  orderDetail.auditStatus = 'pending'

  // 更新store中的数据
  orderStore.updateOrder(orderId, {
    isAuditTransferred: true,
    status: 'pending_audit',
    auditStatus: 'pending'
  })

  // 调用store的检查和流转方法
  orderStore.checkAndTransferOrders()

  ElMessage.info('订单已自动流转到审核')

  // 发送通知 - 使用正确的sendMessage签名
  notificationStore.sendMessage(
    notificationStore.MessageType.ORDER_PENDING_AUDIT,
    `订单 ${orderDetail.orderNumber} 已自动流转到审核`,
    {
      relatedId: orderDetail.id,
      relatedType: 'order',
      actionUrl: `/order/detail/${orderId}`
    }
  )
}

onMounted(async () => {
  // 🔥 加载自定义字段配置（从数据库）
  await orderFieldConfigStore.loadConfig()

  // 注意：不要在这里调用 initializeWithMockData
  // createPersistentStore 会自动从 localStorage 恢复数据
  // 如果数据为空，说明确实没有数据，不应该强制初始化

  loadOrderDetail()
})

onUnmounted(() => {
  // 清理定时器
  if (countdownTimer.value) {
    clearInterval(countdownTimer.value)
    countdownTimer.value = null
  }

  // 清理事件监听器
  window.removeEventListener('operation-log-update', operationLogListener)
  window.removeEventListener('order-status-update', orderStatusListener)
  window.removeEventListener('logistics-status-update', logisticsStatusListener)
  window.removeEventListener('after-sales-update', afterSalesUpdateListener)
  window.removeEventListener('service-status-update', serviceStatusUpdateListener)
})
</script>

<style scoped>
.order-detail {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16px;
}

.header-info h2 {
  margin: 0 0 4px 0;
  color: #303133;
}

.order-number {
  color: #606266;
  font-size: 14px;
}

.order-mark {
  margin-top: 4px;
}

.header-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.mark-dropdown {
  position: relative;
}

.mark-status {
  margin-left: 8px;
  margin-right: 8px;
}

.mark-status .el-tag {
  font-weight: 600;
  border-radius: 6px;
  padding: 6px 12px;
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.status-timeline-card {
  margin-bottom: 20px;
}

.timeline-content {
  padding: 8px 0;
}

.timeline-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.timeline-description {
  color: #606266;
  margin-bottom: 4px;
}

.timeline-operator {
  color: #909399;
  font-size: 12px;
}

/* 行布局样式 */
.row-layout {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  align-items: stretch; /* 确保所有卡片高度一致 */
}

.row-layout.full-width {
  display: block;
}

.row-left {
  flex: 2;
  display: flex;
  flex-direction: column;
}

.row-right {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.row-left-wide {
  flex: 2;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

/* 确保第一排卡片高度一致 */
.row-layout .el-card {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.row-layout .el-card .el-card__body {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* 金额信息卡片样式 */
.amount-info-card {
  margin-top: 20px;
}

.amount-info-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.amount-main-row {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
}

.amount-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  border-radius: 8px;
  background: #f8f9fa;
  min-width: 120px;
}

.amount-item.total {
  background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
}

.amount-item.deposit {
  background: linear-gradient(135deg, #fff3e0 0%, #ffcc02 100%);
}

.amount-item.collect {
  background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
}

.amount-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 8px;
}

.amount-value {
  font-size: 20px;
  font-weight: bold;
}

.total-value {
  color: #1976d2;
}

.deposit-value {
  color: #f57c00;
}

.collect-value {
  color: #7b1fa2;
}

.amount-detail-row {
  display: flex;
  gap: 24px;
  flex-wrap: wrap;
  padding: 12px 0;
  border-top: 1px solid #e0e0e0;
}

.amount-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.detail-label {
  font-size: 14px;
  color: #666;
}

.detail-value {
  font-size: 16px;
  font-weight: bold;
}

.subtotal-value {
  color: #2e7d32;
}

.discount-value {
  color: #d32f2f;
}

/* 订单标记信息卡片样式 */
.mark-info-card {
  margin-bottom: 20px;
}

.mark-info-content {
  padding: 8px 0;
}

.mark-status-display {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.current-mark {
  display: flex;
  align-items: center;
  gap: 12px;
}

.mark-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.mark-tag {
  font-size: 14px;
  padding: 8px 16px;
}

.mark-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.action-label {
  font-size: 14px;
  color: #666;
  font-weight: 500;
}

.mark-locked {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #f56c6c;
  font-size: 14px;
}

.lock-icon {
  font-size: 16px;
}

.lock-text {
  font-weight: 500;
}

/* 订单状态现代化样式 */
.order-status-modern {
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 16px;
  padding: 24px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
  transition: all 0.3s ease;
}

.order-status-modern:hover {
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.status-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.status-icon {
  font-size: 20px;
  color: #64748b;
}

.title-text {
  font-size: 18px;
  font-weight: 600;
  color: #1e293b;
}

.status-tag-modern {
  font-size: 14px;
  font-weight: 500;
  padding: 8px 16px;
  border-radius: 20px;
  border: none;
}

.status-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.timeline-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  position: relative;
}

.timeline-item:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 7px;
  top: 24px;
  width: 2px;
  height: calc(100% + 8px);
  background: linear-gradient(to bottom, #e2e8f0, transparent);
}

.timeline-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #64748b;
  border: 3px solid #ffffff;
  box-shadow: 0 0 0 2px #e2e8f0;
  flex-shrink: 0;
  margin-top: 2px;
}

.countdown-dot {
  background: #f59e0b;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

.timeline-content {
  flex: 1;
  min-width: 0;
}

.timeline-label {
  font-size: 14px;
  color: #64748b;
  margin-bottom: 4px;
  font-weight: 500;
}

.timeline-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.countdown-value {
  color: #f59e0b;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.countdown-badge {
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 12px;
}

.status-tip {
  margin-top: 20px;
  padding: 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.tip-icon {
  font-size: 18px;
  color: #f59e0b;
  flex-shrink: 0;
}

.tip-text {
  font-size: 14px;
  color: #92400e;
  line-height: 1.5;
}

/* 客户信息卡片 */
.customer-info {
  display: flex;
  gap: 16px;
  height: 100%;
}

.customer-avatar {
  flex-shrink: 0;
}

.customer-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.customer-name {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;
}

.customer-contact {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.contact-item {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #606266;
}

.phone-item {
  justify-content: space-between;
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.contact-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.call-button {
  min-width: 60px;
  height: 28px;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(64, 158, 255, 0.3);
  transition: all 0.3s ease;
}

.call-button:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(64, 158, 255, 0.4);
}

/* 收货信息紧凑样式 */
.delivery-compact {
  padding: 20px;
  background: linear-gradient(135deg, #f1f5f9 0%, #ffffff 100%);
  border: 1px solid #e2e8f0;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.delivery-compact:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  transform: translateY(-1px);
}

.delivery-header-compact {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.delivery-icon {
  font-size: 18px;
  color: #64748b;
}

.delivery-title {
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.delivery-content-compact {
  padding: 0;
}

.delivery-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  align-items: start;
}

.delivery-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.address-field {
  grid-column: 1 / -1;
}

.field-label {
  font-size: 13px;
  color: #64748b;
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.field-value {
  font-size: 15px;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.4;
}

.phone-clickable {
  cursor: pointer;
  color: #3b82f6;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 6px;
  margin: -4px -8px;
}

.phone-clickable:hover {
  background: #eff6ff;
  color: #1d4ed8;
  transform: scale(1.02);
}

.address-value {
  word-break: break-word;
  line-height: 1.5;
  color: #374151;
}

/* 收货信息现代化样式 */
.delivery-info-card {
  background: transparent;
  border: none;
  box-shadow: none;
}

.delivery-info-modern {
  padding: 0;
}

.delivery-grid-modern {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  align-items: start;
}

.delivery-field-modern {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.address-field-modern {
  grid-column: 1 / -1;
}

.field-label-modern {
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
  margin-bottom: 4px;
}

.field-value-modern {
  font-size: 16px;
  color: #111827;
  font-weight: 600;
  line-height: 1.5;
}

.phone-clickable {
  cursor: pointer;
  color: #3b82f6;
  transition: all 0.2s ease;
  padding: 4px 8px;
  border-radius: 6px;
  margin: -4px -8px;
}

.phone-clickable:hover {
  background: #eff6ff;
  color: #1d4ed8;
  transform: scale(1.02);
}

.address-value-modern {
  word-break: break-word;
  line-height: 1.6;
  color: #374151;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .delivery-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .address-field {
    grid-column: 1;
  }

  .delivery-grid-modern {
    grid-template-columns: 1fr;
    gap: 16px;
  }

  .address-field-modern {
    grid-column: 1;
  }
}

/* 商品列表 */
.product-info {
  display: flex;
  gap: 12px;
  align-items: center;
}

.product-image {
  width: 50px;
  height: 50px;
  border-radius: 6px;
  overflow: hidden;
  background: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}

.product-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.product-details {
  flex: 1;
}

.product-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.product-sku {
  color: #909399;
  font-size: 12px;
}

/* 金额信息 */
.amount-summary {
  margin-bottom: 20px;
}

.amount-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.amount-item:last-child {
  border-bottom: none;
}

.amount-item.total {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  border-top: 2px solid #e4e7ed;
  padding-top: 12px;
  margin-top: 8px;
}

.amount-item .label {
  color: #606266;
}

.amount-item .value {
  font-weight: 600;
  color: #303133;
}

.amount-item .value.discount {
  color: #67c23a;
}

.amount-item .value.deposit {
  color: #e6a23c;
}

.amount-item .value.collect {
  color: #f56c6c;
}

/* 金额横排显示样式 */
.amount-summary-horizontal {
  margin-top: 24px;
  padding: 20px;
  background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.amount-row-main {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.amount-card {
  flex: 1;
  min-width: 180px;
  max-width: 220px;
  padding: 20px 16px;
  border-radius: 12px;
  text-align: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  overflow: hidden;
}

.amount-card::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: inherit;
  opacity: 0.9;
  z-index: 1;
}

.amount-card > * {
  position: relative;
  z-index: 2;
}

.amount-card:hover {
  transform: translateY(-4px) scale(1.02);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
}

.amount-card.total-amount {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
}

.amount-card.total-amount::after {
  content: '💰';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.deposit-amount {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.amount-card.deposit-amount::after {
  content: '💳';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-card.collect-amount {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  color: white;
}

.amount-card.collect-amount::after {
  content: '📦';
  position: absolute;
  top: 12px;
  right: 12px;
  font-size: 18px;
  opacity: 0.7;
  z-index: 2;
}

.amount-label {
  font-size: 13px;
  margin-bottom: 12px;
  opacity: 0.9;
  font-weight: 500;
  letter-spacing: 0.5px;
  text-transform: uppercase;
}

.amount-value {
  font-size: 24px;
  font-weight: 700;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.amount-row-detail {
  display: flex;
  gap: 32px;
  padding: 16px 20px;
  background: rgba(255, 255, 255, 0.8);
  border-radius: 8px;
  border: 1px solid rgba(228, 231, 237, 0.6);
  backdrop-filter: blur(10px);
  margin-top: 8px;
}

.amount-detail-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 6px;
  border: 1px solid rgba(228, 231, 237, 0.5);
  transition: all 0.2s ease;
}

.amount-detail-item:hover {
  background: rgba(255, 255, 255, 1);
  border-color: #409eff;
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.detail-label {
  color: #606266;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.3px;
}

.detail-value {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.detail-value.subtotal {
  color: #2563eb;
  font-weight: 700;
}

.detail-value.discount {
  color: #dc2626;
  font-weight: 700;
}

.subtotal-item {
  border-left: 3px solid #2563eb;
}

.discount-item {
  border-left: 3px solid #dc2626;
}

.payment-item {
  border-left: 3px solid #8b5cf6;
}

.payment-item .detail-value.payment {
  color: #8b5cf6;
  font-weight: 600;
}

/* 现代化金额卡片样式 */
.amount-summary-modern {
  margin-top: 24px;
  padding: 24px;
  background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%);
  border-radius: 16px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06);
}

.amount-cards-modern {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
  justify-content: flex-start;
  flex-wrap: wrap;
}

.amount-card-modern {
  flex: 1;
  min-width: 200px;
  max-width: 280px;
  padding: 20px 16px;
  border-radius: 12px;
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
}

.amount-card-modern:hover {
  border-color: #d1d5db;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.amount-icon-modern {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background: #f9fafb;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
  font-size: 18px;
  flex-shrink: 0;
  transition: all 0.2s ease;
}

.total-modern .amount-icon-modern {
  background: #eff6ff;
  color: #2563eb;
}

.deposit-modern .amount-icon-modern {
  background: #fffbeb;
  color: #d97706;
}

.collect-modern .amount-icon-modern {
  background: #f0fdf4;
  color: #16a34a;
}

.amount-content-modern {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.amount-label-modern {
  font-size: 14px;
  color: #64748b;
  font-weight: 500;
  letter-spacing: 0.3px;
  margin: 0;
}

.amount-value-modern {
  font-size: 22px;
  font-weight: 600;
  color: #111827;
  font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  line-height: 1.2;
  margin: 0;
}

.total-modern .amount-value-modern {
  color: #2563eb;
}

.deposit-modern .amount-value-modern {
  color: #d97706;
}

.collect-modern .amount-value-modern {
  color: #16a34a;
}

.detail-value.discount::before {
  content: '🎉';
  margin-right: 4px;
  font-size: 12px;
}

/* 定金截图横向显示样式 */
.deposit-screenshot-horizontal {
  display: flex;
  align-items: center;
  padding: 16px 20px;
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%);
  border-radius: 8px;
  border: 1px solid rgba(103, 194, 58, 0.2);
  margin-top: 12px;
  transition: all 0.2s ease;
}

.deposit-screenshot-horizontal:hover {
  background: linear-gradient(135deg, rgba(103, 194, 58, 0.15) 0%, rgba(103, 194, 58, 0.08) 100%);
  border-color: rgba(103, 194, 58, 0.3);
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(103, 194, 58, 0.1);
}

.deposit-screenshot-horizontal .label {
  color: #67c23a;
  font-weight: 600;
  font-size: 14px;
  margin-right: 12px;
  display: flex;
  align-items: center;
}

.deposit-screenshot-horizontal .label::before {
  content: '📸';
  margin-right: 6px;
  font-size: 16px;
}

.screenshots-container {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.screenshot-container {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.screenshot-count {
  color: #67c23a;
  font-size: 12px;
  font-weight: 500;
  padding: 4px 8px;
  background: rgba(103, 194, 58, 0.1);
  border-radius: 12px;
  border: 1px solid rgba(103, 194, 58, 0.2);
  margin-left: 8px;
}

.deposit-screenshot-horizontal .el-image {
  border-radius: 8px !important;
  border: 2px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.2s ease;
}

.screenshot-container:hover .el-image {
  transform: scale(1.05);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
  border-color: #67c23a;
}

.screenshot-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.screenshot-container:hover .screenshot-overlay {
  opacity: 1;
}

.zoom-icon {
  color: white;
  font-size: 20px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5));
}

.deposit-screenshot h4 {
  margin: 0 0 12px 0;
  color: #606266;
}

.screenshot-preview {
  text-align: center;
}

/* 🔥 优化物流轨迹样式，类似顺丰官网 */
.logistics-content {
  padding: 8px 12px;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 3px solid #dcdfe6;
  transition: all 0.3s ease;
}

.logistics-content:hover {
  background: #f0f2f5;
}

.logistics-content-first {
  background: linear-gradient(135deg, #ecf5ff 0%, #f0f9eb 100%);
  border-left-color: #409eff;
}

.logistics-status-text {
  font-weight: 600;
  color: #303133;
  font-size: 14px;
  margin-bottom: 6px;
}

.logistics-content-first .logistics-status-text {
  color: #409eff;
}

.logistics-description {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 8px;
}

.logistics-location {
  color: #909399;
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.tracking-number {
  display: flex;
  align-items: center;
  gap: 8px;
}

.order-remark {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #e4e7ed;
}

/* 售后历史 */
.after-sales-content {
  padding: 8px 0;
}

.after-sales-title {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.after-sales-description {
  color: #606266;
  margin-bottom: 4px;
}

.after-sales-operator {
  color: #909399;
  font-size: 12px;
  margin-bottom: 4px;
}

.after-sales-amount {
  color: #f56c6c;
  font-weight: 600;
  font-size: 14px;
}

/* 折叠组件样式 */
.card-header .el-button {
  margin-left: auto;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .row-layout {
    flex-direction: column;
  }

  .row-left,
  .row-right {
    flex: 1;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }

  .customer-info {
    flex-direction: column;
    text-align: center;
  }

  .status-info {
    gap: 12px;
  }

  .status-item {
    flex-direction: column;
    gap: 4px;
    text-align: center;
  }
}

.order-remark h4 {
  margin: 0 0 8px 0;
  color: #606266;
}

.order-remark p {
  margin: 0;
  color: #303133;
  line-height: 1.6;
}

.operation-log-card {
  margin-top: 20px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .detail-content {
    flex-direction: column;
  }

  .right-panel {
    width: 100%;
  }
}

@media (max-width: 768px) {
  .order-detail {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }

  .header-actions {
    justify-content: center;
  }

  .customer-info {
    flex-direction: column;
    text-align: center;
  }

  .customer-contact {
    align-items: center;
  }

  .contact-item {
    justify-content: center;
  }
}

/* 物流轨迹样式 */
.logistics-track-card .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.logistics-header-info {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  justify-content: center;
}

.tracking-number {
  font-family: 'Courier New', monospace;
  font-weight: 600;
  color: #409eff;
  background: #ecf5ff;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
}

.logistics-loading {
  padding: 20px;
}

.logistics-content {
  padding: 8px 0;
}

.logistics-status {
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.logistics-description {
  color: #606266;
  font-size: 14px;
  margin-bottom: 4px;
  line-height: 1.5;
}

.logistics-location {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 12px;
}

.logistics-actions {
  margin-top: 16px;
  text-align: center;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

/* 现代化客户信息样式 */
.modern-card {
  border: 1px solid #f0f2f5;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border-radius: 12px;
  overflow: hidden;
}

.card-header-modern {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.header-icon {
  color: #409eff;
  font-size: 16px;
}

.header-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.header-right {
  display: flex;
  align-items: center;
}

.view-more-btn {
  color: #409eff;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.view-more-btn:hover {
  background-color: #ecf5ff;
  color: #337ecc;
}

.customer-info-modern {
  padding: 0;
}

.customer-main {
  display: flex;
  gap: 20px;
  align-items: flex-start;
}

.customer-avatar-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  flex-shrink: 0;
}

.customer-avatar-modern {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 24px;
  border: 3px solid #f8f9fa;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.customer-level-tag {
  border-radius: 12px;
  font-size: 11px;
  font-weight: 500;
  padding: 2px 8px;
}

.customer-details-modern {
  flex: 1;
  min-width: 0;
}

.customer-name-modern {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
  line-height: 1.4;
}

.customer-contact-modern {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.contact-item-modern {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
  transition: all 0.3s ease;
  position: relative;
}

.contact-item-modern:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
}

.phone-item-modern {
  cursor: pointer;
  background: linear-gradient(135deg, #e8f4fd 0%, #f0f9ff 100%);
  border-color: #d1ecf1;
}

.phone-item-modern:hover {
  background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
  border-color: #bfdbfe;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
}

.contact-icon {
  color: #409eff;
  font-size: 16px;
  flex-shrink: 0;
}

.phone-item-modern .contact-icon {
  color: #0ea5e9;
}

.contact-text {
  flex: 1;
  color: #303133;
  font-size: 14px;
  font-weight: 500;
  line-height: 1.5;
}

.phone-item-modern .contact-text {
  color: #0369a1;
  font-weight: 600;
}

.call-icon {
  color: #0ea5e9;
  font-size: 14px;
  opacity: 0.7;
  transition: all 0.3s ease;
}

.phone-item-modern:hover .call-icon {
  opacity: 1;
  transform: scale(1.1);
}

.address-item {
  background: linear-gradient(135deg, #fef3e2 0%, #fef7ed 100%);
  border-color: #fed7aa;
}

.address-item:hover {
  background: linear-gradient(135deg, #fde68a 0%, #fef3c7 100%);
  border-color: #fbbf24;
}

.address-item .contact-icon {
  color: #f59e0b;
}

.address-item .contact-text {
  color: #92400e;
}

/* 订单信息现代化样式 */
.order-info-modern {
  padding: 0;
}

.order-basic-info {
  margin-bottom: 24px;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 16px;
}

.info-item {
  padding: 16px;
  background: #fafbfc;
  border-radius: 8px;
  border: 1px solid #f0f2f5;
  transition: all 0.3s ease;
}

.info-item:hover {
  background: #f5f7fa;
  border-color: #e4e7ed;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
}

.info-label {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.info-value {
  font-size: 14px;
  color: #303133;
  font-weight: 600;
  line-height: 1.4;
}

.order-number-value {
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
  color: #409eff;
  background: #ecf5ff;
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 13px;
}

.logistics-section {
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 16px;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.section-title .el-icon {
  color: #10b981;
  font-size: 18px;
}

.status-indicator {
  margin-left: auto;
  border-radius: 12px;
  font-weight: 500;
}

.logistics-info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 12px;
}

.logistics-item {
  padding: 12px 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.3s ease;
}

.logistics-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.logistics-item.highlight {
  background: linear-gradient(135deg, #dbeafe 0%, #e0f2fe 100%);
  border-color: #bfdbfe;
}

.logistics-item.highlight:hover {
  background: linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%);
  border-color: #93c5fd;
}

.logistics-label {
  font-size: 11px;
  color: #64748b;
  font-weight: 500;
  margin-bottom: 6px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.logistics-value {
  font-size: 13px;
  color: #1e293b;
  font-weight: 600;
  line-height: 1.4;
}

.tracking-number-modern {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.track-btn {
  padding: 2px 6px;
  font-size: 11px;
  border-radius: 4px;
}

.estimated-delivery {
  color: #059669;
  font-weight: 700;
}

.logistics-info-grid.pending .logistics-item {
  background: #fefce8;
  border-color: #fde047;
}

.logistics-info-grid.pending .logistics-item:hover {
  background: #fef3c7;
  border-color: #fbbf24;
}

.pending-text {
  color: #92400e;
  font-style: italic;
}

.order-remark-modern {
  background: linear-gradient(135deg, #fef7ed 0%, #fefbf3 100%);
  border-radius: 8px;
  padding: 16px;
  border: 1px solid #fed7aa;
}

.remark-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  font-size: 14px;
  font-weight: 600;
  color: #92400e;
}

.remark-title .el-icon {
  color: #f59e0b;
}

.remark-content {
  color: #78350f;
  font-size: 14px;
  line-height: 1.6;
  background: white;
  padding: 12px;
  border-radius: 6px;
  border: 1px solid #fde68a;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .customer-main {
    flex-direction: column;
    gap: 16px;
    align-items: center;
  }

  .customer-avatar-section {
    flex-direction: row;
    gap: 16px;
  }

  .customer-details-modern {
    width: 100%;
  }

  .customer-name-modern {
    text-align: center;
    margin-bottom: 12px;
  }

  .info-grid {
    grid-template-columns: 1fr;
  }

  .logistics-info-grid {
    grid-template-columns: 1fr;
  }

  .logistics-section {
    padding: 16px;
  }
}

/* 水平布局状态样式 */
.status-header-horizontal {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e2e8f0;
}

.status-right-section {
  display: flex;
  align-items: center;
  gap: 24px;
}

.status-timeline-horizontal {
  display: flex;
  gap: 32px;
  flex-wrap: wrap;
}

.timeline-item-horizontal {
  display: flex;
  align-items: center;
  gap: 12px;
  position: relative;
}

.timeline-item-horizontal:not(:last-child)::after {
  content: '';
  position: absolute;
  right: -20px;
  top: 50%;
  width: 8px;
  height: 2px;
  background: #e2e8f0;
  transform: translateY(-50%);
}

/* 倒计时样式 */
.countdown-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.countdown-timer {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border: 1px solid #f59e0b;
  border-radius: 20px;
  color: #92400e;
  font-weight: 600;
  font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
}

.countdown-icon {
  font-size: 16px;
  color: #f59e0b;
  animation: pulse 2s infinite;
}

.countdown-text {
  font-size: 14px;
  min-width: 60px;
  text-align: center;
}

.countdown-tip {
  font-size: 12px;
  color: #78350f;
  text-align: center;
  white-space: nowrap;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.7;
    transform: scale(1.1);
  }
}

/* 打印样式 */
@media print {
  .page-header .header-actions,
  .el-button {
    display: none !important;
  }

  .order-detail {
    padding: 0;
  }

  .detail-content {
    flex-direction: column;
  }

  .right-panel {
    width: 100%;
  }
}
</style>
