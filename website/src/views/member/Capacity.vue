<template>
  <div class="capacity-page">
    <!-- Toast 通知 -->
    <transition name="toast-slide">
      <div v-if="toastVisible" class="toast-notification" :class="toastType">
        <span class="toast-icon">{{ toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️' }}</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- 当前额度 -->
    <div class="capacity-overview">
      <div v-if="profile?.usage?.userLimitMode === 'online'" class="cap-card">
        <div class="cap-icon">🟢</div>
        <div class="cap-info">
          <div class="cap-label">在线席位额度 <span style="background:#dcfce7;color:#16a34a;font-size:11px;padding:1px 6px;border-radius:8px;font-weight:600;">席位制</span></div>
          <div class="cap-value">{{ profile?.usage?.onlineCount || 0 }} / {{ profile?.usage?.maxOnlineSeats || 0 }}</div>
          <div v-if="(profile?.usage?.extraOnlineSeats || 0) > 0" class="cap-extra">含扩容 +{{ profile.usage.extraOnlineSeats }} 席位</div>
          <div class="cap-bar"><div class="cap-fill" :style="{ width: (profile?.usage?.onlineSeatPercent || 0) + '%' }"></div></div>
          <div style="font-size:12px;color:#909399;margin-top:4px;">注册用户 {{ profile?.usage?.userCount || 0 }} 人（不受限制）</div>
        </div>
      </div>
      <div v-else class="cap-card">
        <div class="cap-icon">👥</div>
        <div class="cap-info">
          <div class="cap-label">用户数额度</div>
          <div class="cap-value">{{ profile?.usage?.userCount || 0 }} / {{ profile?.usage?.maxUsers || 0 }}</div>
          <div v-if="(profile?.usage?.extraUsers || 0) > 0" class="cap-extra">含扩容 +{{ profile.usage.extraUsers }} 人</div>
          <div class="cap-bar"><div class="cap-fill" :style="{ width: (profile?.usage?.userUsagePercent || 0) + '%' }"></div></div>
        </div>
      </div>
      <div class="cap-card">
        <div class="cap-icon">💾</div>
        <div class="cap-info">
          <div class="cap-label">存储空间额度</div>
          <div class="cap-value">{{ formatStorage(profile?.usage?.usedStorageMb) }} / {{ profile?.usage?.maxStorageGb || 0 }}GB</div>
          <div v-if="(profile?.usage?.extraStorageGb || 0) > 0" class="cap-extra">含扩容 +{{ profile.usage.extraStorageGb }}GB</div>
          <div class="cap-bar"><div class="cap-fill" :style="{ width: (profile?.usage?.storageUsagePercent || 0) + '%' }"></div></div>
        </div>
      </div>
    </div>

    <!-- 扩容购买 -->
    <div class="page-card">
      <h2>📈 购买扩容</h2>
      <div v-if="pricesLoading" class="loading">加载价格中...</div>
      <div v-else-if="prices.length === 0" class="empty">暂无可用的扩容价格配置，请联系管理员开通。</div>
      <template v-else>
        <!-- 扩容类型切换 -->
        <div class="type-tabs">
          <button v-if="isOnlineMode" :class="{ active: buyType === 'online_seat' }" @click="buyType = 'online_seat'">🟢 扩容在线席位</button>
          <button v-if="!isOnlineMode" :class="{ active: buyType === 'user' }" @click="buyType = 'user'">👥 扩容用户数</button>
          <button :class="{ active: buyType === 'storage' }" @click="buyType = 'storage'">💾 扩容存储空间</button>
        </div>

        <!-- 价格选项 -->
        <div class="price-options">
          <label v-for="p in filteredPrices" :key="p.id" class="price-option" :class="{ selected: selectedPriceId === p.id }" @click="selectedPriceId = p.id">
            <input type="radio" :value="p.id" v-model="selectedPriceId" />
            <span class="price-opt-content">
              <span class="price-opt-cycle">{{ cycleLabel(p.billing_cycle) }}</span>
              <span class="price-opt-price">¥{{ Number(p.unit_price).toFixed(2) }}<span>/{{ buyUnitLabel }}</span></span>
              <span v-if="p.discount_rules && p.discount_rules.length > 0" class="price-opt-discount">
                <span v-for="(r, i) in p.discount_rules" :key="i">≥{{ r.min_qty }}享{{ 100 - r.discount_percent }}折</span>
              </span>
              <span v-if="p.description" class="price-opt-desc">{{ p.description }}</span>
            </span>
          </label>
        </div>

        <!-- 数量选择 -->
        <div v-if="selectedPrice" class="qty-section">
          <label>购买数量（{{ buyUnitLabel }}）</label>
          <div class="qty-control">
            <button @click="buyQty = Math.max(selectedPrice.min_qty, buyQty - 1)">-</button>
            <input type="number" v-model.number="buyQty" :min="selectedPrice.min_qty" :max="selectedPrice.max_qty" />
            <button @click="buyQty = Math.min(selectedPrice.max_qty, buyQty + 1)">+</button>
          </div>
          <div class="qty-range">范围：{{ selectedPrice.min_qty }} ~ {{ selectedPrice.max_qty }}</div>
        </div>

        <!-- 金额计算 -->
        <div v-if="selectedPrice" class="amount-summary">
          <div class="amount-row">
            <span>单价</span>
            <span>¥{{ Number(selectedPrice.unit_price).toFixed(2) }}/{{ buyUnitLabel }}</span>
          </div>
          <div class="amount-row">
            <span>数量</span>
            <span>{{ buyQty }} {{ buyUnitLabel }}</span>
          </div>
          <div v-if="currentDiscount > 0" class="amount-row discount">
            <span>折扣</span>
            <span style="color:#f59e0b;">-{{ currentDiscount }}%（打{{ (100 - currentDiscount) / 10 }}折）</span>
          </div>
          <div class="amount-row total">
            <span>应付金额</span>
            <span>¥{{ totalAmount.toFixed(2) }}</span>
          </div>
        </div>

        <!-- 支付方式 + 提交 -->
        <div v-if="selectedPrice" class="pay-section">
          <div class="pay-methods">
            <label class="pay-opt" :class="{ selected: payType === 'wechat' }" @click="payType = 'wechat'">
              <input type="radio" v-model="payType" value="wechat" />微信支付
            </label>
            <label class="pay-opt" :class="{ selected: payType === 'alipay' }" @click="payType = 'alipay'">
              <input type="radio" v-model="payType" value="alipay" />支付宝
            </label>
          </div>
          <button class="btn-buy" @click="handleBuy" :disabled="buying">
            {{ buying ? '提交中...' : `确认购买 ¥${totalAmount.toFixed(2)}` }}
          </button>
        </div>
      </template>
    </div>

    <!-- 扩容记录 -->
    <div class="page-card">
      <h2>📋 扩容记录</h2>
      <div v-if="ordersLoading" class="loading">加载中...</div>
      <div v-else-if="orders.length === 0" class="empty">暂无扩容记录</div>
      <div v-else class="orders-list">
        <div class="order-item" v-for="o in orders" :key="o.id">
          <div class="order-info">
            <span class="order-type">{{ orderTypeLabel(o.type) }}</span>
            <span class="order-qty">+{{ o.quantity }}{{ orderUnitLabel(o.type) }}</span>
            <span v-if="o.expire_date" class="order-expire">到期: {{ formatDate(o.expire_date) }}</span>
          </div>
          <div class="order-amount">¥{{ Number(o.total_amount).toFixed(2) }}</div>
          <div class="order-status" :class="o.status">
            {{ statusLabel(o.status) }}
          </div>
          <div class="order-date">{{ formatDate(o.created_at) }}</div>
        </div>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="showPayDialog" class="pay-overlay" @click.self="closePayDialog">
      <div class="pay-dialog">
        <div class="pay-dialog-header">
          <h3>💳 扫码支付</h3>
          <button class="pay-close" @click="closePayDialog">&times;</button>
        </div>
        <div class="pay-dialog-body">
          <div class="pay-amount">¥{{ payOrderAmount.toFixed(2) }}</div>
          <div class="pay-desc">{{ payOrderDesc }}</div>
          <div v-if="payGenerating" class="pay-loading">
            <span class="loading-spinner"></span>正在生成二维码...
          </div>
          <div v-else-if="payQrCode" class="pay-qr-area">
            <p class="pay-qr-tip">请使用{{ payType === 'wechat' ? '微信' : '支付宝' }}扫码支付</p>
            <div class="pay-qr-box">
              <img :src="payQrCode" alt="支付二维码" />
            </div>
            <button class="btn-check-pay" @click="handleCheckPay" :disabled="payChecking">
              {{ payChecking ? '查询中...' : '我已支付，查询结果' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { getMemberProfile, getMemberToken } from '@/api/member'
import { getCapacityPrices, getMyCapacity, createCapacityOrder } from '@/api/capacity'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const API_BASE = '/api/v1'

const statusMap: Record<string, string> = { paid: '已完成', pending: '待支付', closed: '已关闭', refunded: '已退款', expired: '已到期' }
const statusLabel = (s: string) => statusMap[s] || s

// Toast
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimer: any = null
const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  toastMessage.value = msg; toastType.value = type; toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3000)
}

const profile = ref<any>(null)
const isOnlineMode = computed(() => profile.value?.usage?.userLimitMode === 'online')
const prices = ref<any[]>([])
const pricesLoading = ref(true)
const orders = ref<any[]>([])
const ordersLoading = ref(true)

// 购买
const buyType = ref<'user' | 'storage' | 'online_seat'>(isOnlineMode.value ? 'online_seat' : 'user')
const selectedPriceId = ref('')
const buyQty = ref(1)
const payType = ref<'wechat' | 'alipay'>('wechat')
const buying = ref(false)

const buyUnitLabel = computed(() => {
  return { user: '人', storage: 'GB', online_seat: '席位' }[buyType.value] || '个'
})
const filteredPrices = computed(() => prices.value.filter(p => p.type === buyType.value))
const selectedPrice = computed(() => prices.value.find(p => p.id === selectedPriceId.value))

// 🔥 计算折扣
const currentDiscount = computed(() => {
  const sp = selectedPrice.value
  if (!sp?.discount_rules || !Array.isArray(sp.discount_rules) || sp.discount_rules.length === 0) return 0
  const sorted = [...sp.discount_rules].sort((a: any, b: any) => b.min_qty - a.min_qty)
  for (const rule of sorted) {
    if (buyQty.value >= rule.min_qty && rule.discount_percent > 0) return rule.discount_percent
  }
  return 0
})
const totalAmount = computed(() => {
  if (!selectedPrice.value) return 0
  const base = Number(selectedPrice.value.unit_price) * buyQty.value
  return currentDiscount.value > 0 ? Math.round(base * (1 - currentDiscount.value / 100) * 100) / 100 : base
})

const orderTypeLabel = (type: string) => {
  return { user: '👥 用户数', storage: '💾 存储空间', online_seat: '🟢 在线席位' }[type] || type
}
const orderUnitLabel = (type: string) => {
  return { user: '人', storage: 'GB', online_seat: '席位' }[type] || '个'
}

// 支付弹窗
const showPayDialog = ref(false)
const payGenerating = ref(false)
const payQrCode = ref('')
const payOrderNo = ref('')
const payOrderAmount = ref(0)
const payOrderDesc = ref('')
const payChecking = ref(false)
let pollTimer: any = null

const cycleLabel = (c: string) => ({ monthly: '按月', yearly: '按年', permanent: '永久', follow_package: '跟随套餐' }[c] || c)
const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const formatStorage = (mb: number) => {
  if (!mb) return '0MB'
  if (mb >= 1024) return (mb / 1024).toFixed(1) + 'GB'
  return Math.round(mb) + 'MB'
}

onMounted(async () => {
  const [p, priceList, myData] = await Promise.all([
    getMemberProfile(),
    getCapacityPrices(),
    getMyCapacity()
  ])
  profile.value = p
  prices.value = priceList
  pricesLoading.value = false
  orders.value = myData.orders?.list || []
  ordersLoading.value = false

  // 🔥 根据限制模式自动切换购买类型
  if (p?.usage?.userLimitMode === 'online') {
    buyType.value = 'online_seat'
  }
  // 默认选中第一个价格
  const first = filteredPrices.value[0]
  if (first) { selectedPriceId.value = first.id; buyQty.value = first.min_qty }
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

// 切换类型时自动选择第一个价格
watch(buyType, () => {
  const first = filteredPrices.value[0]
  selectedPriceId.value = first?.id || ''
  buyQty.value = first?.min_qty || 1
})

// 购买
const handleBuy = async () => {
  if (!selectedPriceId.value) { showToast('请选择价格方案', 'error'); return }
  if (buyQty.value < 1) { showToast('请输入购买数量', 'error'); return }

  buying.value = true
  try {
    const result = await createCapacityOrder({
      type: buyType.value,
      quantity: buyQty.value,
      priceConfigId: selectedPriceId.value,
      payType: payType.value
    })
    if (result.success && result.data) {
      payOrderNo.value = result.data.orderNo
      payOrderAmount.value = result.data.totalAmount
      const typeDesc = { user: '扩容用户数', storage: '扩容存储空间', online_seat: '扩容在线席位' }[buyType.value] || '扩容'
      payOrderDesc.value = `${typeDesc} x${buyQty.value}${buyUnitLabel.value}`
      showPayDialog.value = true
      // 生成支付二维码
      generateQrCode(result.data.orderNo)
    } else {
      showToast(result.message || '创建订单失败', 'error')
    }
  } finally { buying.value = false }
}

const generateQrCode = async (orderNo: string) => {
  payGenerating.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`${API_BASE}/public/payment/repay/${orderNo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ payType: payType.value })
    })
    const data = await res.json()
    if (data.code === 0 && data.data) {
      const qr = data.data.qrCode || data.data.payUrl || ''
      if (qr.startsWith('data:') || qr.startsWith('http')) {
        payQrCode.value = qr
      } else if (qr) {
        payQrCode.value = await generateQRCodeDataUrl(qr)
      }
      startPolling(orderNo)
    }
  } catch { /* ignore */ } finally { payGenerating.value = false }
}

const startPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/payment/query/${orderNo}`)
      const data = await res.json()
      if (data.code === 0 && data.data?.status === 'paid') {
        clearInterval(pollTimer); pollTimer = null
        closePayDialog()
        showToast('扩容成功！额度已更新', 'success')
        // 刷新数据
        const [p, myData] = await Promise.all([getMemberProfile(), getMyCapacity()])
        profile.value = p
        orders.value = myData.orders?.list || []
      }
    } catch { /* ignore */ }
  }, 3000)
}

const handleCheckPay = async () => {
  payChecking.value = true
  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${payOrderNo.value}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'paid') {
      closePayDialog()
      showToast('扩容成功！额度已更新', 'success')
      const [p, myData] = await Promise.all([getMemberProfile(), getMyCapacity()])
      profile.value = p
      orders.value = myData.orders?.list || []
    } else {
      showToast('支付尚未完成，请确认已支付后重试', 'info')
    }
  } finally { payChecking.value = false }
}

const closePayDialog = () => {
  showPayDialog.value = false
  payQrCode.value = ''
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}
</script>

<style lang="scss" scoped>
.capacity-overview {
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 20px;
}

.cap-card {
  background: white; border-radius: 12px; padding: 20px; display: flex; gap: 16px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); align-items: flex-start;
}

.cap-icon { font-size: 32px; }
.cap-info { flex: 1; }
.cap-label { font-size: 13px; color: #64748b; margin-bottom: 4px; }
.cap-value { font-size: 18px; font-weight: 700; color: #1e293b; }
.cap-extra { font-size: 12px; color: #6366f1; margin-top: 2px; }
.cap-bar { width: 100%; height: 4px; background: #f1f5f9; border-radius: 2px; margin-top: 8px; overflow: hidden; }
.cap-fill { height: 100%; background: #6366f1; border-radius: 2px; transition: width 0.3s; }

.page-card {
  background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04);
  h2 { margin: 0 0 18px; font-size: 17px; color: #1e293b; }
}

.loading, .empty { text-align: center; padding: 30px 0; color: #94a3b8; font-size: 14px; }

.type-tabs {
  display: flex; gap: 0; margin-bottom: 20px; border: 1.5px solid #e2e8f0; border-radius: 8px; overflow: hidden;
  button {
    flex: 1; padding: 10px; border: none; background: white; color: #64748b; font-size: 14px; font-weight: 500; cursor: pointer;
    &.active { background: #6366f1; color: white; }
    &:not(.active):hover { background: #f8fafc; }
  }
}

.price-options { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.price-option {
  flex: 1; min-width: 140px; padding: 16px; border: 1.5px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.2s;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
  &:hover { border-color: #c7d2fe; }
}
.price-opt-cycle { font-size: 13px; color: #64748b; margin-bottom: 6px; }
.price-opt-price { font-size: 20px; font-weight: 700; color: #6366f1; span { font-size: 12px; color: #94a3b8; } }
.price-opt-desc { font-size: 11px; color: #94a3b8; margin-top: 4px; }
.price-opt-discount { font-size: 11px; color: #f59e0b; margin-top: 2px; display: flex; gap: 6px; flex-wrap: wrap; }

.qty-section {
  margin-bottom: 20px;
  label { display: block; font-size: 13px; color: #475569; margin-bottom: 8px; font-weight: 500; }
}
.qty-control {
  display: flex; gap: 0; width: 160px;
  button { width: 40px; border: 1.5px solid #e2e8f0; background: #f8fafc; cursor: pointer; font-size: 18px; color: #475569;
    &:first-child { border-radius: 8px 0 0 8px; } &:last-child { border-radius: 0 8px 8px 0; }
    &:hover { background: #e2e8f0; }
  }
  input { width: 80px; text-align: center; border: 1.5px solid #e2e8f0; border-left: 0; border-right: 0; font-size: 16px; font-weight: 600; outline: none;
    &::-webkit-outer-spin-button, &::-webkit-inner-spin-button { -webkit-appearance: none; }
  }
}
.qty-range { font-size: 11px; color: #94a3b8; margin-top: 4px; }

.amount-summary {
  background: #f8fafc; border-radius: 10px; padding: 16px; margin-bottom: 20px;
}
.amount-row {
  display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0;
  &.total { border-top: 1px solid #e2e8f0; margin-top: 8px; padding-top: 10px; font-size: 18px; font-weight: 700; color: #6366f1; }
  &.discount { color: #f59e0b; font-weight: 500; }
}

.pay-methods { display: flex; gap: 10px; margin-bottom: 14px; }
.pay-opt {
  flex: 1; padding: 10px; border: 1.5px solid #e2e8f0; border-radius: 8px; text-align: center; cursor: pointer; font-size: 13px;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
}

.btn-buy {
  width: 100%; padding: 14px; background: #6366f1; color: white; border: none; border-radius: 10px;
  font-size: 15px; font-weight: 600; cursor: pointer;
  &:disabled { opacity: 0.6; cursor: not-allowed; }
  &:hover:not(:disabled) { background: #4f46e5; }
}

.orders-list { }
.order-item {
  display: flex; align-items: center; gap: 12px; padding: 12px 0; border-bottom: 1px solid #f8fafc; font-size: 13px;
  .order-info { flex: 1; }
  .order-type { color: #475569; font-weight: 500; }
  .order-qty { color: #6366f1; font-weight: 600; margin-left: 8px; }
  .order-expire { font-size: 11px; color: #94a3b8; margin-left: 8px; }
  .order-amount { font-weight: 700; color: #1e293b; min-width: 80px; text-align: right; }
  .order-status { min-width: 60px; text-align: center; font-size: 12px;
    &.paid { color: #16a34a; } &.pending { color: #f59e0b; } &.closed { color: #94a3b8; } &.refunded { color: #ef4444; } &.expired { color: #94a3b8; }
  }
  .order-date { color: #94a3b8; min-width: 80px; text-align: right; }
}

// 支付弹窗
.pay-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.pay-dialog { background: white; border-radius: 14px; width: 380px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.pay-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; h3 { margin: 0; font-size: 15px; } }
.pay-close { border: none; background: none; font-size: 22px; color: #94a3b8; cursor: pointer; }
.pay-dialog-body { padding: 24px; text-align: center; }
.pay-amount { font-size: 28px; font-weight: 700; color: #6366f1; }
.pay-desc { font-size: 13px; color: #64748b; margin: 4px 0 16px; }
.pay-loading { display: flex; align-items: center; justify-content: center; gap: 8px; padding: 20px; color: #64748b; font-size: 13px; }
.pay-qr-tip { font-size: 13px; color: #64748b; margin-bottom: 12px; }
.pay-qr-box { display: inline-block; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; img { width: 200px; height: 200px; display: block; } }
.btn-check-pay { display: block; width: 100%; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; &:disabled { opacity: 0.5; } }
.loading-spinner { display: inline-block; width: 14px; height: 14px; border: 2px solid #e2e8f0; border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

// Toast
.toast-notification {
  position: fixed; top: 20px; left: 50%; transform: translateX(-50%); z-index: 3000;
  display: flex; align-items: center; gap: 8px; padding: 12px 24px; border-radius: 10px;
  font-size: 14px; font-weight: 500; box-shadow: 0 8px 24px rgba(0,0,0,0.12); white-space: nowrap;
  &.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
  &.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
  &.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
}
.toast-slide-enter-active { transition: all 0.3s ease-out; }
.toast-slide-leave-active { transition: all 0.3s ease-in; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateX(-50%) translateY(-30px); }

@media (max-width: 768px) {
  .capacity-overview { grid-template-columns: 1fr; }
  .price-options { flex-direction: column; }
}
</style>

