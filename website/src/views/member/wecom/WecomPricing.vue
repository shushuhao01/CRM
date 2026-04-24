<template>
  <div class="wecom-pricing">
    <!-- 当前套餐状态 -->
    <div v-if="currentPlan && currentPlan.status === 'active'" class="current-plan-banner">
      <div class="cpb-left">
        <div class="cpb-icon-wrap"><span>💎</span></div>
        <div>
          <strong>当前套餐生效中</strong>
          <p>{{ currentPlan.maxUsers }}人席位 · 已用{{ currentPlan.usedUsers }}人 · {{ formatDate(currentPlan.expireDate) }} 到期</p>
        </div>
      </div>
      <span class="cpb-tip">如需续费或增购 →「续费/增购」</span>
    </div>

    <!-- 页面标题 -->
    <div class="pricing-hero">
      <h3>选择会话存档套餐</h3>
      <p>按需购买席位，灵活扩展，即买即用</p>
    </div>

    <template v-if="vasConfig">
      <!-- 购买模式切换 -->
      <div v-if="vasConfig.purchaseMode === 'both'" class="mode-switch">
        <button :class="{ active: purchaseForm.mode === 'proxy' }" @click="purchaseForm.mode = 'proxy'">
          <span class="mode-icon">🛒</span>
          <span class="mode-text">
            <strong>一站式代购</strong>
            <small>平台代购企微席位+服务，一步到位</small>
          </span>
        </button>
        <button :class="{ active: purchaseForm.mode === 'service_fee' }" @click="purchaseForm.mode = 'service_fee'">
          <span class="mode-icon">🔧</span>
          <span class="mode-text">
            <strong>仅购买服务费</strong>
            <small>已自行在企微购买席位，仅付平台服务费</small>
          </span>
        </button>
      </div>

      <!-- 费用说明 -->
      <div class="fee-notice">
        <p v-if="purchaseForm.mode === 'proxy'"><strong>一站式代购</strong>：以下价格包含企微官方席位费+云客平台服务费，购买后平台统一开通</p>
        <p v-else><strong>服务费模式</strong>：您已自行在企微后台购买席位，以下仅为云客平台服务费（¥{{ vasConfig.seatServiceFee || 0 }}/人/年）</p>
      </div>

      <!-- 套餐卡片 -->
      <div class="pkg-cards">
        <div v-for="(pkg, i) in displayPackages" :key="i"
             class="pkg-card" :class="{ selected: purchaseForm.userCount === pkg.users, recommended: pkg.recommended }"
             @click="purchaseForm.userCount = pkg.users">
          <div class="pkg-rec-tag" v-if="pkg.recommended">推荐</div>
          <div class="pkg-card-head">
            <span class="pkg-tier-label">{{ pkg.label || '' }}</span>
            <span class="pkg-tier-range">{{ pkg.tierLabel || '' }}</span>
          </div>
          <div class="pkg-card-num">{{ pkg.users }}<small>人</small></div>
          <div class="pkg-card-price">
            <span class="pkg-price-symbol">¥</span>
            <span class="pkg-price-num">{{ getDisplayPrice(pkg.users) }}</span>
            <span class="pkg-price-unit">/年</span>
          </div>
          <div class="pkg-card-unit">
            {{ purchaseForm.mode === 'proxy' ? '代购' : '服务费' }}单价 ¥{{ getUnitPriceDisplay(pkg.users) }}/人/年
          </div>
          <div class="pkg-card-detail" v-if="purchaseForm.mode === 'proxy'">
            <span>🏷️ 全包代购</span>
            <span>👥 最大人数: {{ pkg.users }}人</span>
            <span v-if="pkg.officialPrice">📋 官方参考价: ¥{{ pkg.officialPrice }}/人/年</span>
            <span>💰 服务费: ¥{{ getUnitPriceDisplay(pkg.users) }}/人/年（含官方席位+购买服务）</span>
          </div>
          <div class="pkg-card-detail" v-else>
            <span>🔧 仅服务费</span>
            <span>👥 席位数: {{ pkg.users }}人</span>
            <span>💰 服务费: ¥{{ vasConfig.seatServiceFee || 0 }}/人/年</span>
            <span>📝 您需自行在企微后台购买席位</span>
          </div>
          <button class="pkg-card-btn" :class="{ active: purchaseForm.userCount === pkg.users }">
            {{ purchaseForm.userCount === pkg.users ? '✓ 已选中' : '选择此套餐' }}
          </button>
        </div>
      </div>

      <!-- 自定义人数 + 订单配置 -->
      <div class="oc-card">
        <div class="oc-row">
          <span class="oc-label">自定义人数</span>
          <div class="num-input">
            <button @click="purchaseForm.userCount = Math.max(1, purchaseForm.userCount - 1)">−</button>
            <input type="number" v-model.number="purchaseForm.userCount" min="1" max="9999" />
            <button @click="purchaseForm.userCount++">+</button>
          </div>
        </div>
        <div class="oc-row">
          <span class="oc-label">{{ purchaseForm.mode === 'proxy' ? '适用单价' : '服务费单价' }}</span>
          <span class="oc-val green">¥{{ computedUnitPrice }}/人/年</span>
        </div>
        <div class="oc-row">
          <span class="oc-label">服务期限</span>
          <span class="oc-val">1年（购买即生效）</span>
        </div>
        <div class="oc-divider"></div>
        <div class="oc-row total">
          <span class="oc-label">合计</span>
          <span class="oc-total">¥{{ computedTotalAmount.toLocaleString() }}</span>
        </div>
      </div>

      <!-- 支付操作栏 -->
      <div class="action-bar">
        <div class="pay-methods">
          <button :class="{ active: purchaseForm.payType === 'wechat' }" @click="purchaseForm.payType = 'wechat'">微信支付</button>
          <button :class="{ active: purchaseForm.payType === 'alipay' }" @click="purchaseForm.payType = 'alipay'">支付宝</button>
          <button :class="{ active: purchaseForm.payType === 'bank' }" @click="purchaseForm.payType = 'bank'">对公转账</button>
        </div>
        <button class="btn-submit" :disabled="purchasing" @click="submitPurchase">
          {{ purchasing ? '提交中...' : '确认支付' }}
        </button>
      </div>

      <div class="purchase-note">购买即生效 — 支付成功后增值服务立即激活</div>
    </template>
    <div v-else class="no-config-hint">
      <p>暂未配置增值服务定价，请联系平台管理员</p>
    </div>

    <!-- ========== 支付弹窗 ========== -->
    <div v-if="showPayDialog" class="dialog-overlay" @click.self="closePayDialog">
      <div class="dialog-box">
        <div class="dialog-header">
          <h3>{{ payDialogTitle }}</h3>
          <button class="close-btn" @click="closePayDialog">&times;</button>
        </div>
        <div v-if="payStep === 'paying'" class="dialog-body pay-body">
          <div class="pay-amount-display">
            <span>支付金额</span>
            <strong>¥{{ purchaseResult.amount }}</strong>
          </div>
          <p class="pay-package">{{ purchaseResult.packageName }}</p>
          <template v-if="purchaseForm.payType !== 'bank'">
            <p class="scan-hint">请使用{{ purchaseForm.payType === 'wechat' ? '微信' : '支付宝' }}扫描二维码</p>
            <div class="qr-display">
              <img v-if="displayQrCode" :src="displayQrCode" alt="支付二维码" />
              <div v-else class="qr-placeholder">二维码生成中...</div>
            </div>
          </template>
          <template v-else>
            <div class="bank-info">
              <p>请转账并备注订单号：</p>
              <p class="order-no-highlight">{{ purchaseResult.orderNo }}</p>
            </div>
          </template>
          <p class="order-info">订单号: {{ purchaseResult.orderNo }}</p>
          <button class="btn-check" @click="checkPayStatus" :disabled="checkingPay">
            {{ checkingPay ? '查询中...' : '我已完成支付' }}
          </button>
        </div>
        <div v-else-if="payStep === 'success'" class="dialog-body success-body">
          <div class="success-icon">🎉</div>
          <h4>开通成功！</h4>
          <p>会话存档增值服务已激活</p>
          <button class="btn-pay" style="width:100%" @click="handleSuccess">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onUnmounted } from 'vue'
import { getMemberToken } from '@/api/member'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const props = defineProps<{ wecomData: any }>()
const emit = defineEmits(['refresh'])

const purchasing = ref(false)
const checkingPay = ref(false)
const showPayDialog = ref(false)
const showTier = ref(false)
const payStep = ref<'paying' | 'success'>('paying')
const purchaseForm = ref({ userCount: 10, payType: 'wechat', mode: 'proxy' as 'proxy' | 'service_fee' })
const purchaseResult = ref<any>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

const vasConfig = computed(() => props.wecomData?.vasConfig || null)
const currentPlan = computed(() => props.wecomData?.currentPlan || null)

const displayPackages = computed(() => {
  const tiers = vasConfig.value?.tierPricing || []
  if (tiers.length > 0) {
    return tiers.map((t: any, i: number) => ({
      users: t.max >= 999999 ? t.min : t.max,
      label: t.tierLabel || `${t.min}~${t.max >= 999999 ? '不限' : t.max}人`,
      tierLabel: `${t.min}~${t.max >= 999999 ? '不限' : t.max}人`,
      recommended: i === tiers.length - 1,
      officialPrice: t.officialFee || 0,
    }))
  }
  const pkgs = props.wecomData?.presetPackages
  if (pkgs && pkgs.length > 0) return pkgs
  return [
    { users: 5, label: '入门', recommended: false },
    { users: 20, label: '基础', recommended: false },
    { users: 50, label: '标准', recommended: true },
    { users: 200, label: '企业', recommended: false }
  ]
})

const getUnitPriceForCount = (count: number) => {
  const tiers = vasConfig.value?.tierPricing || []
  for (const tier of tiers) {
    if (count >= tier.min && count <= tier.max) return tier.price
  }
  if (tiers.length > 0) return tiers[tiers.length - 1].price
  return vasConfig.value?.defaultPrice || 100
}

const getDisplayPrice = (users: number) => {
  if (purchaseForm.value.mode === 'service_fee') {
    return (users * (vasConfig.value?.seatServiceFee || 0)).toLocaleString()
  }
  return (users * getUnitPriceForCount(users)).toLocaleString()
}

const getUnitPriceDisplay = (users: number) => {
  if (purchaseForm.value.mode === 'service_fee') return vasConfig.value?.seatServiceFee || 0
  return getUnitPriceForCount(users)
}

const computedUnitPrice = computed(() => {
  if (purchaseForm.value.mode === 'service_fee') {
    return vasConfig.value?.seatServiceFee || 0
  }
  return getUnitPriceForCount(purchaseForm.value.userCount)
})
const computedTotalAmount = computed(() => purchaseForm.value.userCount * computedUnitPrice.value)

const payDialogTitle = computed(() => payStep.value === 'paying' ? '扫码支付' : '开通成功')

const displayQrCode = ref('')
watch(() => [purchaseResult.value.qrCode, purchaseResult.value.payUrl, purchaseResult.value.orderNo], async () => {
  const qr = purchaseResult.value.qrCode || ''
  const payUrl = purchaseResult.value.payUrl || ''
  const orderNo = purchaseResult.value.orderNo || ''

  if (qr && (qr.startsWith('http') || qr.startsWith('data:'))) {
    displayQrCode.value = qr
    return
  }
  if (payUrl && (payUrl.startsWith('http') || payUrl.startsWith('weixin://'))) {
    displayQrCode.value = await generateQRCodeDataUrl(payUrl)
    return
  }
  if (orderNo) {
    displayQrCode.value = await generateQRCodeDataUrl(orderNo)
    return
  }
  displayQrCode.value = ''
})

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const submitPurchase = async () => {
  if (purchaseForm.value.userCount < 1) return
  purchasing.value = true
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom/purchase', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ userCount: purchaseForm.value.userCount, payType: purchaseForm.value.payType, purchaseMode: purchaseForm.value.mode })
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      purchaseResult.value = json.data
      payStep.value = 'paying'
      showPayDialog.value = true
      startPayPolling(json.data.orderNo)
    } else { alert(json.message || '创建订单失败') }
  } catch { alert('创建订单失败，请稍后重试') }
  finally { purchasing.value = false }
}

const startPayPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const token = getMemberToken()
      const res = await fetch(`/api/v1/public/member/wecom/order/${orderNo}`, { headers: { 'Authorization': `Bearer ${token}` } })
      const json = await res.json()
      if (json.code === 0 && json.data?.status === 'paid') { if (pollTimer) clearInterval(pollTimer); pollTimer = null; payStep.value = 'success' }
    } catch { /* 静默 */ }
  }, 3000)
  setTimeout(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }, 5 * 60 * 1000)
}

const checkPayStatus = async () => {
  checkingPay.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`/api/v1/public/member/wecom/order/${purchaseResult.value.orderNo}`, { headers: { 'Authorization': `Bearer ${token}` } })
    const json = await res.json()
    if (json.code === 0 && json.data?.status === 'paid') { payStep.value = 'success'; if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
    else { alert('尚未检测到支付，请确认后再试') }
  } catch { alert('查询失败') }
  finally { checkingPay.value = false }
}

const closePayDialog = () => { showPayDialog.value = false; if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }
const handleSuccess = () => { closePayDialog(); emit('refresh') }
onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })
</script>

<style scoped>
.wecom-pricing { max-width: 100%; }

/* 当前套餐 */
.current-plan-banner {
  display: flex; justify-content: space-between; align-items: center;
  background: #f0faf4; border: 1px solid #b7eb8f; border-radius: 10px;
  padding: 14px 20px; margin-bottom: 16px;
}
.cpb-left { display: flex; align-items: center; gap: 12px; }
.cpb-icon-wrap { font-size: 20px; }
.cpb-left strong { font-size: 14px; color: #1d2129; display: block; margin-bottom: 1px; }
.cpb-left p { margin: 0; font-size: 12px; color: #52c41a; }
.cpb-tip { font-size: 11px; color: #909399; }

/* 标题 */
.pricing-hero { margin-bottom: 14px; }
.pricing-hero h3 { margin: 0 0 4px; font-size: 17px; font-weight: 700; color: #1d2129; }
.pricing-hero p { margin: 0; font-size: 13px; color: #909399; }

/* 费用说明 */
.fee-notice {
  background: #fffbe6; border: 1px solid #ffe58f; border-radius: 8px;
  padding: 10px 14px; margin-bottom: 16px;
}
.fee-notice p { margin: 0; font-size: 12px; color: #8c6d1f; line-height: 1.5; }

/* 购买模式切换 */
.mode-switch { display: flex; gap: 10px; margin-bottom: 16px; }
.mode-switch button {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; background: #fff; border: 2px solid #ebeef5;
  border-radius: 10px; cursor: pointer; transition: all 0.25s; text-align: left;
}
.mode-switch button:hover { border-color: #b6b9c0; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.mode-switch button.active { border-color: #07c160; background: linear-gradient(135deg, #f6fff9 0%, #e8faf0 100%); box-shadow: 0 2px 12px rgba(7,193,96,0.1); }
.mode-icon { font-size: 22px; flex-shrink: 0; }
.mode-text { display: flex; flex-direction: column; }
.mode-text strong { font-size: 14px; color: #303133; }
.mode-text small { font-size: 11px; color: #909399; margin-top: 2px; }

/* 套餐卡片 */
.pkg-cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 14px; margin-bottom: 18px;
}
.pkg-card {
  position: relative; background: #fff; border: 2px solid #ebeef5;
  border-radius: 12px; padding: 20px 16px 16px; cursor: pointer;
  transition: all 0.25s; overflow: hidden;
}
.pkg-card:hover { border-color: #c0c4cc; box-shadow: 0 4px 16px rgba(0,0,0,0.06); transform: translateY(-2px); }
.pkg-card.selected { border-color: #07c160; background: linear-gradient(180deg, #f6fff9 0%, #fff 40%); box-shadow: 0 4px 16px rgba(7,193,96,0.12); }
.pkg-card.recommended:not(.selected) { border-color: #ffc53d; }
.pkg-rec-tag {
  position: absolute; top: 0; right: 0;
  background: linear-gradient(135deg, #ff7a45, #ff4d4f); color: #fff;
  font-size: 11px; font-weight: 700; padding: 3px 10px 4px;
  border-radius: 0 10px 0 10px;
}
.pkg-card-head { margin-bottom: 6px; }
.pkg-tier-label { font-size: 13px; font-weight: 600; color: #303133; }
.pkg-tier-range { font-size: 11px; color: #909399; margin-left: 6px; }
.pkg-card-num { font-size: 32px; font-weight: 800; color: #1d2129; line-height: 1.15; margin-bottom: 4px; }
.pkg-card-num small { font-size: 14px; color: #909399; font-weight: 400; margin-left: 2px; }
.pkg-card-price { display: flex; align-items: baseline; margin-bottom: 2px; }
.pkg-price-symbol { font-size: 14px; font-weight: 700; color: #f5222d; }
.pkg-price-num { font-size: 24px; font-weight: 800; color: #f5222d; line-height: 1; }
.pkg-price-unit { font-size: 12px; color: #909399; margin-left: 2px; }
.pkg-card-unit { font-size: 11px; color: #07c160; font-weight: 500; margin-bottom: 8px; }
.pkg-card-detail { display: flex; flex-direction: column; gap: 3px; margin-bottom: 12px; }
.pkg-card-detail span { font-size: 12px; color: #606266; line-height: 1.4; }
.pkg-card-btn {
  width: 100%; padding: 8px 0; border: 1px solid #dcdfe6; border-radius: 6px;
  background: #f5f7fa; color: #606266; font-size: 13px; font-weight: 500;
  cursor: pointer; transition: all 0.2s;
}
.pkg-card-btn:hover { background: #ebeef5; }
.pkg-card-btn.active { background: #07c160; color: #fff; border-color: #07c160; }

/* 订单配置 */
.oc-card {
  background: #fff; border: 1px solid #ebeef5; border-radius: 10px;
  padding: 14px 18px; margin-bottom: 14px;
}
.oc-row { display: flex; align-items: center; justify-content: space-between; padding: 7px 0; }
.oc-label { font-size: 13px; color: #606266; }
.oc-val { font-size: 13px; color: #303133; font-weight: 500; }
.oc-val.green { color: #07c160; font-weight: 700; font-size: 15px; }
.oc-row.saved { }
.saved-val { color: #f56c6c; font-weight: 700; font-size: 14px; }
.oc-divider { height: 1px; background: #f0f0f0; margin: 4px 0; }
.oc-row.total { padding: 10px 0 2px; }
.oc-total { font-size: 24px; font-weight: 800; color: #f56c6c; }

.num-input { display: flex; align-items: center; border: 1px solid #dcdfe6; border-radius: 6px; overflow: hidden; }
.num-input button { width: 32px; height: 32px; border: none; background: #f5f7fa; cursor: pointer; font-size: 16px; color: #606266; }
.num-input button:hover { background: #e4e7ed; }
.num-input input { width: 50px; height: 32px; border: none; border-left: 1px solid #ebeef5; border-right: 1px solid #ebeef5; text-align: center; font-size: 14px; font-weight: 700; outline: none; }

/* 支付操作栏 */
.action-bar {
  display: flex; align-items: center; gap: 12px; margin-bottom: 10px;
  background: #fff; border: 1px solid #ebeef5; border-radius: 10px;
  padding: 12px 16px;
}
.pay-methods { display: flex; gap: 6px; }
.pay-methods button {
  padding: 9px 16px; border: 1.5px solid #dcdfe6; border-radius: 8px;
  background: #fff; cursor: pointer; font-size: 13px; font-weight: 500;
  color: #606266; transition: all 0.2s; white-space: nowrap;
}
.pay-methods button:hover { border-color: #c0c4cc; background: #fafafa; }
.pay-methods button.active { border-color: #07c160; color: #07c160; background: #f0faf4; }
.btn-submit {
  margin-left: auto; padding: 10px 32px;
  background: linear-gradient(135deg, #07c160, #05a64e); color: #fff;
  border: none; border-radius: 8px; font-size: 15px; font-weight: 700;
  cursor: pointer; transition: all 0.2s; white-space: nowrap;
  box-shadow: 0 2px 8px rgba(7,193,96,0.25);
}
.btn-submit:hover { background: linear-gradient(135deg, #06ae56, #049645); box-shadow: 0 4px 12px rgba(7,193,96,0.35); }
.btn-submit:disabled { opacity: 0.5; cursor: not-allowed; }

.purchase-note { font-size: 11px; color: #c0c4cc; text-align: center; }

.no-config-hint { text-align: center; padding: 40px 0; color: #909399; font-size: 14px; }

/* 弹窗 */
.dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.45); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px; }
.dialog-box { background: #fff; border-radius: 16px; width: 100%; max-width: 420px; max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 24px 14px; border-bottom: 1px solid #f0f0f0; }
.dialog-header h3 { margin: 0; font-size: 16px; font-weight: 700; }
.close-btn { width: 30px; height: 30px; border: none; background: #f5f7fa; border-radius: 50%; font-size: 18px; cursor: pointer; display: flex; align-items: center; justify-content: center; color: #909399; }
.close-btn:hover { background: #e4e7ed; }
.dialog-body { padding: 24px; }
.pay-body { text-align: center; }
.pay-amount-display span { font-size: 13px; color: #909399; }
.pay-amount-display strong { font-size: 30px; color: #f56c6c; display: block; margin-top: 4px; font-weight: 800; }
.pay-package { font-size: 12px; color: #909399; margin-bottom: 16px; }
.scan-hint { font-size: 13px; color: #606266; margin-bottom: 10px; }
.qr-display { margin: 12px 0; }
.qr-display img { width: 180px; height: 180px; border: 1px solid #ebeef5; border-radius: 10px; padding: 8px; }
.qr-placeholder { width: 180px; height: 180px; display: flex; align-items: center; justify-content: center; margin: 0 auto; border: 1px dashed #dcdfe6; border-radius: 10px; color: #909399; font-size: 13px; }
.bank-info { background: #f5f7fa; border-radius: 8px; padding: 14px; margin: 12px 0; text-align: left; }
.bank-info p { font-size: 13px; color: #606266; margin: 4px 0; }
.order-no-highlight { font-size: 16px; font-weight: 700; color: #07c160; text-align: center; margin: 8px 0; }
.order-info { color: #909399; font-size: 12px; margin: 10px 0; }
.btn-check { width: 100%; padding: 12px; margin-top: 10px; background: #409eff; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; }
.btn-check:disabled { opacity: 0.5; cursor: not-allowed; }
.success-body { text-align: center; padding: 32px 24px; }
.success-icon { font-size: 48px; margin-bottom: 12px; }
.success-body h4 { font-size: 18px; font-weight: 700; margin: 0 0 6px; color: #07c160; }
.success-body p { color: #909399; font-size: 13px; margin-bottom: 20px; }
.btn-pay { padding: 10px 28px; background: #07c160; color: #fff; border: none; border-radius: 8px; font-size: 14px; font-weight: 700; cursor: pointer; transition: all 0.2s; }
.btn-pay:hover { background: #06ae56; }

@media (max-width: 700px) {
  .pkg-cards { grid-template-columns: repeat(2, 1fr); }
  .action-bar { flex-direction: column; }
  .pay-methods { width: 100%; }
  .btn-submit { width: 100%; }
  .mode-switch { flex-direction: column; }
}
@media (max-width: 480px) {
  .pkg-cards { grid-template-columns: 1fr; }
}
</style>

