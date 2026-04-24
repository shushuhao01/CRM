<template>
  <div class="wecom-renew">
    <!-- 无套餐提示 -->
    <div v-if="!currentPlan || currentPlan.status !== 'active'" class="no-plan-card">
      <div class="no-plan-icon">📦</div>
      <h4>暂无有效套餐</h4>
      <p>您尚未购买会话存档增值服务，请先前往「套餐与配额」标签页购买。</p>
    </div>

    <template v-else>
      <!-- 当前套餐信息 -->
      <div class="plan-card">
        <div class="plan-header">
          <div class="plan-title">
            <span class="plan-icon">💎</span>
            <strong>当前套餐</strong>
          </div>
          <span class="plan-status" :class="statusClass">{{ statusText }}</span>
        </div>
        <div class="plan-detail">
          <div class="detail-item">
            <span class="detail-label">席位</span>
            <span class="detail-value">{{ currentPlan.maxUsers }}人</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">已用</span>
            <span class="detail-value">{{ currentPlan.usedUsers }}人</span>
          </div>
          <div class="detail-item">
            <span class="detail-label">到期时间</span>
            <span class="detail-value" :class="{ 'expire-warn': currentPlan.daysRemaining <= 30 }">
              {{ formatDate(currentPlan.expireDate) }}
              <span v-if="currentPlan.daysRemaining <= 30" class="days-tag">
                (剩{{ currentPlan.daysRemaining }}天)
              </span>
            </span>
          </div>
        </div>
        <!-- 席位进度条 -->
        <div class="seat-bar">
          <div class="seat-bar-inner" :style="{ width: seatPercent + '%' }" :class="seatBarClass"></div>
        </div>
        <div class="seat-text">席位使用率 {{ seatPercent }}%</div>
      </div>

      <!-- 操作区域：续费 / 增购 -->
      <div class="action-tabs">
        <button class="action-tab" :class="{ active: mode === 'renew' }" @click="mode = 'renew'">🔄 续费</button>
        <button class="action-tab" :class="{ active: mode === 'upgrade' }" @click="mode = 'upgrade'">➕ 增购席位</button>
      </div>

      <!-- 续费模式 -->
      <div v-if="mode === 'renew'" class="mode-section">
        <div class="mode-desc">
          <p>续费将在当前到期日基础上延长1年，享受续费折扣。</p>
        </div>

        <div v-if="!currentPlan.canRenew" class="renew-disabled">
          <p>⚠️ 距到期日超过30天，暂不可续费。到期前30天内可操作续费。</p>
        </div>

        <template v-else>
          <div class="calc-card">
            <div class="calc-row">
              <span>当前套餐</span>
              <span>{{ currentPlan.maxUsers }}人/年</span>
            </div>
            <div class="calc-row">
              <span>适用单价</span>
              <span>¥{{ renewUnitPrice }}/人/年</span>
            </div>
            <div class="calc-row">
              <span>续费折扣</span>
              <span class="discount-tag">{{ Math.round(renewalDiscount * 100) / 10 }}折</span>
            </div>
            <div class="calc-row">
              <span>原价</span>
              <span class="original-price">¥{{ renewOriginalAmount }}</span>
            </div>
            <div class="calc-row total">
              <span>续费金额</span>
              <span class="total-price">¥{{ renewTotalAmount }}</span>
            </div>
          </div>

          <!-- 支付方式 -->
          <div class="pay-section">
            <label class="pay-label">支付方式</label>
            <div class="pay-options">
              <label :class="{ active: payType === 'wechat' }" @click="payType = 'wechat'">💚 微信</label>
              <label :class="{ active: payType === 'alipay' }" @click="payType = 'alipay'">🔵 支付宝</label>
              <label :class="{ active: payType === 'bank' }" @click="payType = 'bank'">🏦 对公转账</label>
            </div>
          </div>

          <button class="btn-primary" :disabled="submitting" @click="submitRenew">
            {{ submitting ? '提交中...' : '确认续费 ¥' + renewTotalAmount }}
          </button>
        </template>
      </div>

      <!-- 增购模式 -->
      <div v-if="mode === 'upgrade'" class="mode-section">
        <div class="mode-desc">
          <p>增购席位立即生效，到期时间不变。价格按剩余天数折算。</p>
        </div>

        <div class="calc-card">
          <div class="calc-row">
            <span>当前席位</span>
            <span>{{ currentPlan.maxUsers }}人</span>
          </div>
          <div class="calc-row">
            <span>增购人数</span>
            <div class="num-input-sm">
              <button @click="addUsers = Math.max(1, addUsers - 1)">−</button>
              <input type="number" v-model.number="addUsers" min="1" max="9999" />
              <button @click="addUsers++">+</button>
            </div>
          </div>
          <div class="calc-row">
            <span>增购后总席位</span>
            <span class="highlight">{{ currentPlan.maxUsers + addUsers }}人</span>
          </div>
          <div class="calc-row">
            <span>适用单价</span>
            <span>¥{{ upgradeUnitPrice }}/人/年</span>
          </div>
          <div class="calc-row">
            <span>剩余天数</span>
            <span>{{ currentPlan.daysRemaining }}天</span>
          </div>
          <div class="calc-row">
            <span>折算系数</span>
            <span>{{ proRataFactor }}</span>
          </div>
          <div class="calc-row total">
            <span>增购金额</span>
            <span class="total-price">¥{{ upgradeTotalAmount }}</span>
          </div>
          <div class="calc-formula">
            计算公式：{{ addUsers }}人 × ¥{{ upgradeUnitPrice }} × {{ proRataFactor }} = ¥{{ upgradeTotalAmount }}
          </div>
        </div>

        <!-- 支付方式 -->
        <div class="pay-section">
          <label class="pay-label">支付方式</label>
          <div class="pay-options">
            <label :class="{ active: payType === 'wechat' }" @click="payType = 'wechat'">💚 微信</label>
            <label :class="{ active: payType === 'alipay' }" @click="payType = 'alipay'">🔵 支付宝</label>
            <label :class="{ active: payType === 'bank' }" @click="payType = 'bank'">🏦 对公转账</label>
          </div>
        </div>

        <button class="btn-primary" :disabled="submitting" @click="submitUpgrade">
          {{ submitting ? '提交中...' : '确认增购 ¥' + upgradeTotalAmount }}
        </button>
      </div>
    </template>

    <!-- ========== 支付弹窗 ========== -->
    <div v-if="showPayDialog" class="dialog-overlay" @click.self="closePayDialog">
      <div class="dialog-box">
        <div class="dialog-header">
          <h3>{{ payResult.orderNo ? '扫码支付' : '处理中...' }}</h3>
          <button class="close-btn" @click="closePayDialog">&times;</button>
        </div>

        <div v-if="payDialogStep === 'paying'" class="dialog-body pay-body">
          <div class="pay-amount-display">
            <span>支付金额</span>
            <strong>¥{{ payResult.amount }}</strong>
          </div>
          <p class="pay-package">{{ payResult.packageName }}</p>

          <template v-if="payType !== 'bank'">
            <p class="scan-hint">请使用{{ payType === 'wechat' ? '微信' : '支付宝' }}扫描下方二维码完成支付</p>
            <div class="qr-display">
              <img v-if="payResult.qrCode" :src="payResult.qrCode" alt="支付二维码" />
              <div v-else class="qr-placeholder-text">二维码生成中...</div>
            </div>
          </template>
          <template v-else>
            <div class="bank-info">
              <p>请将款项转账至以下账户，并在备注中注明订单号：</p>
              <p class="order-no-highlight">{{ payResult.orderNo }}</p>
            </div>
          </template>

          <p class="order-info">订单号: {{ payResult.orderNo }}</p>
          <button class="btn-check" @click="checkPayStatus" :disabled="checkingPay">
            {{ checkingPay ? '查询中...' : '我已完成支付' }}
          </button>
        </div>

        <div v-else-if="payDialogStep === 'success'" class="dialog-body success-body">
          <div class="success-icon">🎉</div>
          <h4>{{ mode === 'renew' ? '续费成功！' : '增购成功！' }}</h4>
          <p>服务已更新，新配置即刻生效。</p>
          <button class="btn-primary" @click="handleSuccess">完成</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { getMemberToken } from '@/api/member'

const props = defineProps<{ wecomData: any }>()
const emit = defineEmits(['refresh'])

const mode = ref<'renew' | 'upgrade'>('renew')
const payType = ref('wechat')
const addUsers = ref(5)
const submitting = ref(false)
const checkingPay = ref(false)
const showPayDialog = ref(false)
const payDialogStep = ref<'paying' | 'success'>('paying')
const payResult = ref<any>({})
let pollTimer: ReturnType<typeof setInterval> | null = null

const currentPlan = computed(() => props.wecomData?.currentPlan || null)
const renewalDiscount = computed(() => props.wecomData?.renewalDiscount || 0.9)

const statusClass = computed(() => {
  if (!currentPlan.value) return ''
  if (currentPlan.value.daysRemaining <= 7) return 'danger'
  if (currentPlan.value.daysRemaining <= 30) return 'warning'
  return 'active'
})

const statusText = computed(() => {
  if (!currentPlan.value) return '无套餐'
  if (currentPlan.value.daysRemaining <= 0) return '已过期'
  if (currentPlan.value.daysRemaining <= 7) return '即将到期'
  if (currentPlan.value.daysRemaining <= 30) return '临近到期'
  return '使用中'
})

const seatPercent = computed(() => {
  if (!currentPlan.value || !currentPlan.value.maxUsers) return 0
  return Math.min(100, Math.round(currentPlan.value.usedUsers / currentPlan.value.maxUsers * 100))
})

const seatBarClass = computed(() => {
  if (seatPercent.value >= 100) return 'full'
  if (seatPercent.value >= 90) return 'warn'
  return 'normal'
})

const getUnitPrice = (count: number) => {
  const tiers = props.wecomData?.vasConfig?.tierPricing || []
  for (const tier of tiers) {
    if (count >= tier.min && count <= tier.max) return tier.price
  }
  return props.wecomData?.vasConfig?.defaultPrice || 100
}

// 续费计算
const renewUnitPrice = computed(() => currentPlan.value ? getUnitPrice(currentPlan.value.maxUsers) : 0)
const renewOriginalAmount = computed(() => currentPlan.value ? currentPlan.value.maxUsers * renewUnitPrice.value : 0)
const renewTotalAmount = computed(() => Math.round(renewOriginalAmount.value * renewalDiscount.value * 100) / 100)

// 增购计算
const upgradeUnitPrice = computed(() => currentPlan.value ? getUnitPrice(currentPlan.value.maxUsers + addUsers.value) : 0)
const proRataFactor = computed(() => {
  if (!currentPlan.value) return 0
  return Math.round(currentPlan.value.daysRemaining / 365 * 100) / 100
})
const upgradeTotalAmount = computed(() => Math.round(addUsers.value * upgradeUnitPrice.value * proRataFactor.value * 100) / 100)

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

// 续费提交
const submitRenew = async () => {
  submitting.value = true
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom/renew', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ payType: payType.value })
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      payResult.value = json.data
      payDialogStep.value = 'paying'
      showPayDialog.value = true
      startPolling(json.data.orderNo)
    } else {
      alert(json.message || '创建续费订单失败')
    }
  } catch {
    alert('创建续费订单失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// 增购提交
const submitUpgrade = async () => {
  if (addUsers.value < 1) return
  submitting.value = true
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom/upgrade', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ addUsers: addUsers.value, payType: payType.value })
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      payResult.value = json.data
      payDialogStep.value = 'paying'
      showPayDialog.value = true
      startPolling(json.data.orderNo)
    } else {
      alert(json.message || '创建增购订单失败')
    }
  } catch {
    alert('创建增购订单失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

const startPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const token = getMemberToken()
      const res = await fetch(`/api/v1/public/member/wecom/order/${orderNo}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      const json = await res.json()
      if (json.code === 0 && json.data?.status === 'paid') {
        if (pollTimer) clearInterval(pollTimer)
        pollTimer = null
        payDialogStep.value = 'success'
      }
    } catch { /* 静默 */ }
  }, 3000)
  setTimeout(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } }, 5 * 60 * 1000)
}

const checkPayStatus = async () => {
  checkingPay.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`/api/v1/public/member/wecom/order/${payResult.value.orderNo}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.code === 0 && json.data?.status === 'paid') {
      payDialogStep.value = 'success'
      if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
    } else {
      alert('尚未检测到支付完成，请确认已支付后再试')
    }
  } catch { alert('查询失败，请稍后重试') }
  finally { checkingPay.value = false }
}

const closePayDialog = () => {
  showPayDialog.value = false
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

const handleSuccess = () => {
  closePayDialog()
  emit('refresh')
}

onUnmounted(() => { if (pollTimer) { clearInterval(pollTimer); pollTimer = null } })
</script>

<style scoped>
.wecom-renew { max-width: 100%; }

.no-plan-card {
  text-align: center; background: #fff; border: 1px solid #e4e7ed;
  border-radius: 12px; padding: 40px 24px;
}
.no-plan-icon { font-size: 48px; margin-bottom: 12px; }
.no-plan-card h4 { font-size: 18px; font-weight: 600; color: #303133; margin: 0 0 8px; }
.no-plan-card p { color: #909399; font-size: 14px; margin: 0; }

.plan-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 12px;
  padding: 20px 24px; margin-bottom: 20px;
}
.plan-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
.plan-title { display: flex; align-items: center; gap: 8px; }
.plan-icon { font-size: 20px; }
.plan-title strong { font-size: 16px; color: #303133; }
.plan-status { font-size: 12px; padding: 2px 10px; border-radius: 12px; font-weight: 600; }
.plan-status.active { background: #e6f7ef; color: #07c160; }
.plan-status.warning { background: #fdf6ec; color: #e6a23c; }
.plan-status.danger { background: #fef0f0; color: #f56c6c; }

.plan-detail { display: flex; gap: 24px; margin-bottom: 12px; }
.detail-item { }
.detail-label { font-size: 12px; color: #909399; display: block; }
.detail-value { font-size: 15px; font-weight: 600; color: #303133; }
.expire-warn { color: #e6a23c; }
.days-tag { font-size: 12px; font-weight: 500; }

.seat-bar { height: 8px; background: #e4e7ed; border-radius: 4px; overflow: hidden; margin-bottom: 4px; }
.seat-bar-inner { height: 100%; border-radius: 4px; transition: width 0.5s; }
.seat-bar-inner.normal { background: #07c160; }
.seat-bar-inner.warn { background: #e6a23c; }
.seat-bar-inner.full { background: #f56c6c; }
.seat-text { font-size: 12px; color: #909399; }

.action-tabs { display: flex; gap: 8px; margin-bottom: 16px; }
.action-tab {
  flex: 1; padding: 12px; border: 2px solid #e4e7ed; border-radius: 10px;
  background: #fff; cursor: pointer; font-size: 14px; font-weight: 500;
  color: #606266; transition: all 0.25s; text-align: center;
}
.action-tab:hover { border-color: #c0c4cc; }
.action-tab.active { border-color: #07c160; color: #07c160; background: #f0faf4; }

.mode-section { }
.mode-desc { margin-bottom: 16px; }
.mode-desc p { margin: 0; font-size: 14px; color: #606266; line-height: 1.6; }

.renew-disabled {
  background: #fdf6ec; border: 1px solid #faecd8; border-radius: 8px;
  padding: 16px; text-align: center;
}
.renew-disabled p { margin: 0; color: #e6a23c; font-size: 14px; }

.calc-card {
  background: #f9fafb; border: 1px solid #e4e7ed; border-radius: 10px;
  padding: 16px 20px; margin-bottom: 16px;
}
.calc-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 0; font-size: 14px; color: #606266;
}
.calc-row.total { border-top: 1px dashed #e4e7ed; padding-top: 12px; margin-top: 4px; }
.discount-tag { background: #fef0f0; color: #f56c6c; padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 600; }
.original-price { text-decoration: line-through; color: #c0c4cc; }
.total-price { font-size: 22px; font-weight: 700; color: #f56c6c; }
.highlight { font-weight: 600; color: #07c160; }
.calc-formula { margin-top: 8px; font-size: 12px; color: #c0c4cc; text-align: right; }

.num-input-sm { display: flex; align-items: center; border: 1px solid #dcdfe6; border-radius: 6px; overflow: hidden; }
.num-input-sm button { width: 30px; height: 30px; border: none; background: #f5f7fa; cursor: pointer; font-size: 16px; color: #606266; }
.num-input-sm button:hover { background: #e4e7ed; }
.num-input-sm input { width: 50px; height: 30px; border: none; border-left: 1px solid #dcdfe6; border-right: 1px solid #dcdfe6; text-align: center; font-size: 14px; font-weight: 600; outline: none; }

.pay-section { margin-bottom: 16px; }
.pay-label { font-size: 14px; font-weight: 500; color: #606266; display: block; margin-bottom: 8px; }
.pay-options { display: flex; gap: 8px; }
.pay-options label {
  padding: 8px 14px; border: 2px solid #dcdfe6; border-radius: 8px;
  cursor: pointer; font-size: 13px; transition: all 0.2s; user-select: none;
}
.pay-options label:hover { border-color: #c0c4cc; }
.pay-options label.active { border-color: #07c160; background: #f0faf4; color: #07c160; }

.btn-primary {
  width: 100%; padding: 14px; background: linear-gradient(135deg, #07c160, #06ae56);
  color: #fff; border: none; border-radius: 10px; font-size: 16px; font-weight: 600;
  cursor: pointer; transition: all 0.3s; box-shadow: 0 4px 12px rgba(7,193,96,0.3);
}
.btn-primary:hover { opacity: 0.9; }
.btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }

/* 弹窗 */
.dialog-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center;
  justify-content: center; z-index: 9999; padding: 20px;
}
.dialog-box {
  background: #fff; border-radius: 16px; width: 100%;
  max-width: 480px; max-height: 90vh; overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px 16px; border-bottom: 1px solid #f0f0f0;
}
.dialog-header h3 { margin: 0; font-size: 18px; font-weight: 600; }
.close-btn {
  width: 32px; height: 32px; border: none; background: #f5f7fa;
  border-radius: 50%; font-size: 20px; cursor: pointer;
  display: flex; align-items: center; justify-content: center; color: #909399;
}
.close-btn:hover { background: #e4e7ed; color: #303133; }
.dialog-body { padding: 24px; }

.pay-body { text-align: center; }
.pay-amount-display span { font-size: 14px; color: #909399; }
.pay-amount-display strong { font-size: 32px; color: #f56c6c; display: block; margin-top: 4px; }
.pay-package { font-size: 13px; color: #909399; margin-bottom: 20px; }
.scan-hint { font-size: 14px; color: #606266; margin-bottom: 12px; }
.qr-display { margin: 16px 0; }
.qr-display img { width: 200px; height: 200px; border: 1px solid #e4e7ed; border-radius: 8px; padding: 8px; }
.qr-placeholder-text { width: 200px; height: 200px; border: 1px dashed #dcdfe6; border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #909399; font-size: 14px; margin: 0 auto; }
.bank-info { background: #f5f7fa; border-radius: 8px; padding: 16px; margin: 16px 0; text-align: left; }
.bank-info p { font-size: 14px; color: #606266; margin: 4px 0; }
.order-no-highlight { font-size: 18px; font-weight: 700; color: #07c160; text-align: center; margin: 8px 0; }
.order-info { color: #909399; font-size: 13px; margin: 12px 0; }

.btn-check {
  width: 100%; padding: 12px; margin-top: 16px;
  background: linear-gradient(135deg, #409eff, #337ecc);
  color: #fff; border: none; border-radius: 8px;
  font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-check:disabled { opacity: 0.6; cursor: not-allowed; }

.success-body { text-align: center; padding: 40px 24px; }
.success-icon { font-size: 56px; margin-bottom: 16px; }
.success-body h4 { font-size: 20px; font-weight: 600; margin: 0 0 12px; color: #07c160; }
.success-body p { color: #909399; font-size: 14px; margin-bottom: 24px; }

@media (max-width: 600px) {
  .plan-detail { flex-direction: column; gap: 8px; }
  .pay-options { flex-wrap: wrap; }
  .pay-options label { flex: 1; text-align: center; min-width: 80px; }
}
</style>

