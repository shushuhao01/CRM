<template>
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
                  <div class="product-name">
                    <el-tag
                      v-if="row.productType === 'virtual' || (!row.productType && orderDetail.orderProductType === 'virtual')"
                      type="warning"
                      size="small"
                      effect="light"
                      style="margin-right: 6px; vertical-align: middle;"
                    >虚拟</el-tag>
                    <el-tag
                      v-else
                      size="small"
                      effect="light"
                      style="margin-right: 6px; vertical-align: middle;"
                    >实物</el-tag>
                    {{ row.name }}
                  </div>
                  <div class="product-tags" v-if="row.isRecommended || row.isNew || row.isHot">
                    <el-tag v-if="row.isRecommended" type="warning" size="small" effect="light">
                      ⭐ 推荐
                    </el-tag>
                    <el-tag v-if="row.isNew" type="success" size="small" effect="light">
                      🆕 新品
                    </el-tag>
                    <el-tag v-if="row.isHot" type="danger" size="small" effect="light">
                      🔥 热销
                    </el-tag>
                  </div>
                  <div class="product-sku">SKU: {{ row.sku || row.id }}</div>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="price" label="单价" width="100">
            <template #default="{ row }">
              ¥{{ (row.price || 0).toFixed(2) }}
            </template>
          </el-table-column>
          <el-table-column prop="quantity" label="数量" width="80" />
          <el-table-column label="小计" width="120">
            <template #default="{ row }">
              ¥{{ ((row.price || 0) * (row.quantity || 0)).toFixed(2) }}
            </template>
          </el-table-column>
        </el-table>

        <!-- 金额信息 -->
        <div class="amount-summary-modern">
          <div class="amount-cards-modern">
            <div class="amount-card-modern total-modern">
              <div class="amount-icon-modern"><el-icon><Money /></el-icon></div>
              <div class="amount-content-modern">
                <div class="amount-label-modern">订单总额</div>
                <div class="amount-value-modern">¥{{ (orderDetail.totalAmount || 0).toFixed(2) }}</div>
              </div>
            </div>
            <div class="amount-card-modern deposit-modern" v-if="(orderDetail.depositAmount || 0) > 0">
              <div class="amount-icon-modern"><el-icon><CreditCard /></el-icon></div>
              <div class="amount-content-modern">
                <div class="amount-label-modern">定金</div>
                <div class="amount-value-modern">¥{{ (orderDetail.depositAmount || 0).toFixed(2) }}</div>
              </div>
            </div>
            <div class="amount-card-modern collect-modern" v-if="(orderDetail.depositAmount || 0) > 0">
              <div class="amount-icon-modern"><el-icon><Wallet /></el-icon></div>
              <div class="amount-content-modern">
                <div class="amount-label-modern">代收</div>
                <div class="amount-value-modern">
                  <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 12px;">
                    <span>¥{{ ((orderDetail.totalAmount || 0) - (orderDetail.depositAmount || 0)).toFixed(2) }}</span>
                    <el-tooltip :content="codCancelDisabledReason" :disabled="canApplyCodCancel" placement="top">
                      <span>
                        <el-button type="warning" size="small" :disabled="!canApplyCodCancel" @click="$emit('apply-cod-cancel')">
                          改代收
                        </el-button>
                      </span>
                    </el-tooltip>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="amount-row-detail">
            <div class="amount-detail-item subtotal-item">
              <span class="detail-label">商品总额：</span>
              <span class="detail-value subtotal">¥{{ calculatedSubtotal.toFixed(2) }}</span>
            </div>
            <div class="amount-detail-item discount-item" v-if="(orderDetail.discount || 0) > 0">
              <span class="detail-label">优惠金额：</span>
              <span class="detail-value discount">-¥{{ (orderDetail.discount || 0).toFixed(2) }}</span>
            </div>
            <div class="amount-detail-item discount-item" v-if="calculatedSubtotal > (orderDetail.totalAmount || 0)">
              <span class="detail-label">已优惠：</span>
              <span class="detail-value discount">-¥{{ (calculatedSubtotal - (orderDetail.totalAmount || 0)).toFixed(2) }}</span>
            </div>
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
                <el-image :src="screenshot" fit="cover" style="width: 60px; height: 45px; border-radius: 4px; margin-left: 8px;" />
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ShoppingBag, Money, CreditCard, Wallet, ZoomIn } from '@element-plus/icons-vue'
import { getPaymentMethodText } from './helpers'

defineProps<{
  orderDetail: any
  calculatedSubtotal: number
  depositScreenshotList: string[]
  canApplyCodCancel: boolean
  codCancelDisabledReason: string
}>()

defineEmits<{
  'apply-cod-cancel': []
}>()

const showImageViewer = ref(false)
const currentImageIndex = ref(0)

const previewScreenshot = (index: number) => {
  currentImageIndex.value = index
  showImageViewer.value = true
}
</script>

<style scoped>
/* 布局 */
.row-layout { display: flex; gap: 20px; margin-bottom: 20px; align-items: stretch; }
.row-layout.full-width { display: block; }

/* 卡片 */
.card-header { display: flex; align-items: center; gap: 8px; font-weight: 600; }

/* 商品信息 */
.product-info { display: flex; gap: 12px; align-items: center; }
.product-image { width: 50px; height: 50px; border-radius: 6px; overflow: hidden; background: #f5f7fa; display: flex; align-items: center; justify-content: center; }
.product-image img { width: 100%; height: 100%; object-fit: cover; }
.product-details { flex: 1; }
.product-name { font-weight: 600; color: #303133; margin-bottom: 4px; }
.product-tags { display: flex; gap: 4px; flex-wrap: wrap; margin-bottom: 4px; }
.product-tags .el-tag { font-size: 11px; }
.product-sku { color: #909399; font-size: 12px; }

/* 现代化金额卡片 */
.amount-summary-modern { margin-top: 24px; padding: 24px; background: linear-gradient(135deg, #f8fafc 0%, #ffffff 100%); border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); }
.amount-cards-modern { display: flex; gap: 20px; margin-bottom: 20px; justify-content: flex-start; flex-wrap: wrap; }
.amount-card-modern { flex: 1; min-width: 200px; max-width: 280px; padding: 20px 16px; border-radius: 12px; background: #ffffff; border: 1px solid #e5e7eb; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05); transition: all 0.2s ease; position: relative; display: flex; align-items: center; gap: 12px; }
.amount-card-modern:hover { border-color: #d1d5db; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08); }
.amount-icon-modern { width: 40px; height: 40px; border-radius: 8px; background: #f9fafb; display: flex; align-items: center; justify-content: center; color: #6b7280; font-size: 18px; flex-shrink: 0; transition: all 0.2s ease; }
.total-modern .amount-icon-modern { background: #eff6ff; color: #2563eb; }
.deposit-modern .amount-icon-modern { background: #fffbeb; color: #d97706; }
.collect-modern .amount-icon-modern { background: #f0fdf4; color: #16a34a; }
.amount-content-modern { flex: 1; display: flex; flex-direction: column; gap: 4px; }
.amount-label-modern { font-size: 14px; color: #64748b; font-weight: 500; letter-spacing: 0.3px; margin: 0; }
.amount-value-modern { font-size: 22px; font-weight: 600; color: #111827; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.2; margin: 0; }
.total-modern .amount-value-modern { color: #2563eb; }
.deposit-modern .amount-value-modern { color: #d97706; }
.collect-modern .amount-value-modern { color: #16a34a; }

/* 金额明细 */
.amount-row-detail { display: flex; gap: 32px; padding: 16px 20px; background: rgba(255, 255, 255, 0.8); border-radius: 8px; border: 1px solid rgba(228, 231, 237, 0.6); backdrop-filter: blur(10px); margin-top: 8px; }
.amount-detail-item { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: rgba(255, 255, 255, 0.9); border-radius: 6px; border: 1px solid rgba(228, 231, 237, 0.5); transition: all 0.2s ease; }
.amount-detail-item:hover { background: rgba(255, 255, 255, 1); border-color: #409eff; transform: translateY(-1px); box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1); }
.detail-label { color: #606266; font-size: 13px; font-weight: 500; letter-spacing: 0.3px; }
.detail-value { font-weight: 600; color: #303133; font-size: 14px; font-family: 'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
.detail-value.subtotal { color: #2563eb; font-weight: 700; }
.detail-value.discount { color: #dc2626; font-weight: 700; }
.detail-value.discount::before { content: '🎉'; margin-right: 4px; font-size: 12px; }
.detail-value.payment { color: #8b5cf6; font-weight: 600; }
.subtotal-item { border-left: 3px solid #2563eb; }
.discount-item { border-left: 3px solid #dc2626; }
.payment-item { border-left: 3px solid #8b5cf6; }

/* 定金截图 */
.deposit-screenshot-horizontal { display: flex; align-items: center; padding: 16px 20px; background: linear-gradient(135deg, rgba(103, 194, 58, 0.1) 0%, rgba(103, 194, 58, 0.05) 100%); border-radius: 8px; border: 1px solid rgba(103, 194, 58, 0.2); margin-top: 12px; transition: all 0.2s ease; }
.deposit-screenshot-horizontal:hover { background: linear-gradient(135deg, rgba(103, 194, 58, 0.15) 0%, rgba(103, 194, 58, 0.08) 100%); border-color: rgba(103, 194, 58, 0.3); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(103, 194, 58, 0.1); }
.deposit-screenshot-horizontal .label { color: #67c23a; font-weight: 600; font-size: 14px; margin-right: 12px; display: flex; align-items: center; }
.deposit-screenshot-horizontal .label::before { content: '📸'; margin-right: 6px; font-size: 16px; }
.screenshots-container { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.screenshot-container { position: relative; display: inline-block; cursor: pointer; }
.screenshot-count { color: #67c23a; font-size: 12px; font-weight: 500; padding: 4px 8px; background: rgba(103, 194, 58, 0.1); border-radius: 12px; border: 1px solid rgba(103, 194, 58, 0.2); margin-left: 8px; }
.deposit-screenshot-horizontal :deep(.el-image) { border-radius: 8px !important; border: 2px solid rgba(255, 255, 255, 0.8); box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1); transition: all 0.2s ease; }
.screenshot-container:hover :deep(.el-image) { transform: scale(1.05); box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15); border-color: #67c23a; }
.screenshot-overlay { position: absolute; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.4); border-radius: 8px; display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity 0.2s ease; }
.screenshot-container:hover .screenshot-overlay { opacity: 1; }
.zoom-icon { color: white; font-size: 20px; filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.5)); }
</style>
