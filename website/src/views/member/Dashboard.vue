<template>
  <div class="dashboard-page">
    <div class="page-header">
      <h2>欢迎回来，{{ profile?.tenant?.contact || profile?.tenant?.name || profile?.name || '会员' }}！</h2>
      <p>{{ new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' }) }}</p>
    </div>

    <div v-if="loading" class="loading-state">加载中...</div>

    <template v-else-if="profile">
      <!-- 概览卡片 -->
      <div class="stat-cards">
        <div class="stat-card">
          <div class="stat-icon">📦</div>
          <div class="stat-info">
            <span class="stat-label">当前套餐</span>
            <span class="stat-value">{{ profile.package?.name || '未订购' }}</span>
            <span class="stat-desc">{{ profile.package?.type === 'saas' ? 'SaaS云端版' : '私有部署版' }}</span>
          </div>
        </div>
        <div class="stat-card" :class="{ warn: profile.license?.isExpiringSoon, danger: profile.license?.isExpired }">
          <div class="stat-icon">⏰</div>
          <div class="stat-info">
            <span class="stat-label">到期时间</span>
            <span class="stat-value">{{ profile.license?.daysRemaining > 0 ? `${profile.license.daysRemaining}天后` : '已过期' }}</span>
            <span class="stat-desc">{{ formatDate(profile.license?.expireDate) }}</span>
          </div>
        </div>
        <div v-if="profile.usage?.userLimitMode === 'online'" class="stat-card">
          <div class="stat-icon">🟢</div>
          <div class="stat-info">
            <span class="stat-label">在线席位 <span style="background:#dcfce7;color:#16a34a;font-size:10px;padding:0 4px;border-radius:6px;font-weight:600;">席位制</span></span>
            <span class="stat-value">{{ profile.usage?.onlineCount || 0 }}/{{ profile.usage?.maxOnlineSeats || 0 }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (profile.usage?.onlineSeatPercent || 0) + '%' }"></div>
            </div>
          </div>
        </div>
        <div v-else class="stat-card">
          <div class="stat-icon">👥</div>
          <div class="stat-info">
            <span class="stat-label">用户数</span>
            <span class="stat-value">{{ profile.usage?.userCount || 0 }}/{{ profile.usage?.maxUsers || 0 }}</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (profile.usage?.userUsagePercent || 0) + '%' }"></div>
            </div>
          </div>
        </div>
        <div class="stat-card">
          <div class="stat-icon">💾</div>
          <div class="stat-info">
            <span class="stat-label">存储空间</span>
            <span class="stat-value">{{ formatStorage(profile.usage?.usedStorageMb) }}/{{ profile.usage?.maxStorageGb || 0 }}GB</span>
            <div class="progress-bar">
              <div class="progress-fill" :style="{ width: (profile.usage?.storageUsagePercent || 0) + '%' }"></div>
            </div>
          </div>
        </div>
      </div>

      <!-- 待支付账单提醒 -->
      <div v-if="pendingBills.length > 0" class="tip-card warn pending-tip">
        <span class="tip-icon">💳</span>
        <span>您有 <strong>{{ pendingBills.length }}</strong> 笔待支付账单，共 <strong>¥{{ pendingTotal.toFixed(2) }}</strong></span>
        <router-link to="/member/bills">立即查看 →</router-link>
      </div>

      <!-- 详情区域 -->
      <div class="detail-grid">
        <!-- 订阅状态 -->
        <div class="detail-card">
          <h3>🔄 订阅状态</h3>
          <template v-if="profile.subscription?.hasActive">
            <div class="detail-item">
              <span class="label">状态</span>
              <span class="value status-active">✅ 自动续费中</span>
            </div>
            <div class="detail-item">
              <span class="label">渠道</span>
              <span class="value">{{ profile.subscription.channel === 'wechat' ? '微信代扣' : '支付宝扣款' }}</span>
            </div>
            <div class="detail-item">
              <span class="label">下次扣款</span>
              <span class="value">{{ formatDate(profile.subscription.nextDeductDate) }}</span>
            </div>
            <div class="detail-item">
              <span class="label">扣款金额</span>
              <span class="value price">¥{{ profile.subscription.amount }}/{{ profile.subscription.billingCycle === 'yearly' ? '年' : '月' }}</span>
            </div>
            <router-link to="/member/subscription" class="detail-action">管理订阅 →</router-link>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>暂未开通自动续费</p>
              <p class="hint" v-if="profile.package?.subscriptionEnabled">开通订阅可享{{ profile.package.subscriptionDiscountRate > 0 ? (10 - profile.package.subscriptionDiscountRate / 10).toFixed(1) + '折' : '' }}优惠</p>
              <router-link to="/member/subscription" class="btn-small">开通自动续费</router-link>
            </div>
          </template>
        </div>

        <!-- 最近账单 -->
        <div class="detail-card">
          <h3>📋 最近账单</h3>
          <template v-if="recentBills.length > 0">
            <div v-for="bill in recentBills" :key="bill.id" class="bill-item">
              <span class="bill-date">{{ formatShortDate(bill.createdAt) }}</span>
              <span class="bill-amount" :class="bill.status">¥{{ bill.amount }}</span>
              <span class="bill-name">{{ bill.packageName }}</span>
              <span class="bill-action-area">
                <button v-if="bill.status === 'pending' && bill.type !== 'subscription_deduct'" class="btn-pay-sm" @click="handleQuickPay(bill)">
                  支付
                </button>
                <span v-else-if="bill.status === 'paid'" class="bill-status-paid">✓</span>
              </span>
            </div>
            <router-link to="/member/bills" class="detail-action">查看全部 →</router-link>
          </template>
          <template v-else>
            <div class="empty-state">
              <p>暂无账单记录</p>
            </div>
          </template>
        </div>
      </div>

      <!-- 提示信息 -->
      <div v-if="profile.license?.isExpiringSoon" class="tip-card warn">
        <span class="tip-icon">⚠️</span>
        <span>您的套餐将在 {{ profile.license.daysRemaining }} 天后到期，</span>
        <router-link to="/member/renew">立即续费 →</router-link>
      </div>
      <div v-else-if="profile.license?.isExpired" class="tip-card danger">
        <span class="tip-icon">🔴</span>
        <span>您的套餐已过期，部分功能可能受限。</span>
        <router-link to="/member/renew">立即续费 →</router-link>
      </div>
      <div v-else class="tip-card info">
        <span class="tip-icon">💡</span>
        <span>您当前使用{{ profile.package?.name || '' }}，如需更多用户或存储空间，</span>
        <router-link to="/member/renew">查看升级方案 →</router-link>
      </div>
    </template>

    <div v-else class="empty-page">
      <div style="text-align:center;padding:60px 0;color:#94a3b8;">
        <div style="font-size:48px;margin-bottom:16px;">📊</div>
        <p style="font-size:15px;margin:0 0 8px;">暂无法加载概览数据</p>
        <p style="font-size:13px;margin:0;">请检查网络连接或 <a href="/member/login" style="color:#6366f1;">重新登录</a></p>
      </div>
    </div>

    <!-- 快捷支付弹窗 -->
    <div v-if="showQuickPay" class="pay-overlay" @click.self="closeQuickPay">
      <div class="quick-pay-dialog">
        <div class="quick-pay-header">
          <h3>💳 快捷支付</h3>
          <button class="pay-close" @click="closeQuickPay">&times;</button>
        </div>
        <div class="quick-pay-body">
          <div class="quick-pay-info">
            <div class="quick-pay-amount">¥{{ quickPayBill?.amount }}</div>
            <div class="quick-pay-name">{{ quickPayBill?.packageName }}</div>
          </div>

          <!-- 支付渠道选择 -->
          <div class="quick-channel-opts">
            <label class="qc-opt" :class="{ selected: quickPayChannel === 'wechat' }" @click="switchQuickChannel('wechat')">
              <input type="radio" value="wechat" v-model="quickPayChannel" />
              💚 微信支付
            </label>
            <label class="qc-opt" :class="{ selected: quickPayChannel === 'alipay' }" @click="switchQuickChannel('alipay')">
              <input type="radio" value="alipay" v-model="quickPayChannel" />
              🔵 支付宝
            </label>
          </div>

          <!-- 二维码区域 -->
          <div v-if="quickPayGenerating" class="quick-loading-area">
            <span class="loading-spinner"></span>
            <span>正在生成收款码...</span>
          </div>
          <div v-else-if="quickPayQr" class="quick-qr-area">
            <p class="quick-qr-label">请使用{{ quickPayChannel === 'wechat' ? '微信' : '支付宝' }}扫码支付</p>
            <div class="quick-qr-box">
              <img :src="quickPayQr" alt="支付二维码" />
            </div>
            <button class="btn-check-quick" @click="handleCheckQuickPay" :disabled="quickPayChecking">
              {{ quickPayChecking ? '查询中...' : '我已支付' }}
            </button>
            <p class="quick-warn">⚠️ 支付完成后请点击上方按钮确认</p>
          </div>
          <div v-else class="quick-loading-area">
            <span>正在加载支付信息...</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 到期提醒弹窗 -->
    <div v-if="showExpireReminder" class="pay-overlay" @click.self="dismissReminder">
      <div class="expire-reminder-dialog">
        <div class="expire-reminder-header">
          <h3>⚠️ 套餐即将到期</h3>
          <button class="pay-close" @click="dismissReminder">&times;</button>
        </div>
        <div class="expire-reminder-body">
          <div class="expire-info">
            <div class="expire-pkg">{{ profile.package?.name || '当前套餐' }}</div>
            <div class="expire-days">
              <span class="expire-big">{{ profile.license?.daysRemaining }}</span>
              <span class="expire-unit">天后到期</span>
            </div>
            <div class="expire-date">到期日期：{{ formatDate(profile.license?.expireDate) }}</div>
            <div class="expire-percent">
              <div class="expire-progress">
                <div class="expire-progress-fill" :style="{ width: (profile.license?.remainingPercent || 0) + '%' }"></div>
              </div>
              <span>剩余 {{ profile.license?.remainingPercent || 0 }}%</span>
            </div>
          </div>
          <p class="expire-tip">为避免服务中断，建议尽快续费。</p>
          <div class="expire-actions">
            <button class="btn-expire-renew" @click="goRenew">立即续费</button>
            <button class="btn-expire-later" @click="dismissReminder">稍后提醒</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { getMemberProfile, getMemberBills, getMemberToken } from '@/api/member'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const router = useRouter()
const API_BASE = '/api/v1'

const loading = ref(true)
const profile = ref<any>(null)
const recentBills = ref<any[]>([])
const pendingBills = ref<any[]>([])
const pendingTotal = ref(0)

// 到期提醒
const showExpireReminder = ref(false)

// 快捷支付
const showQuickPay = ref(false)
const quickPayBill = ref<any>(null)
const quickPayQr = ref('')
const quickPayChannel = ref('wechat')
const quickPayChecking = ref(false)
const quickPayGenerating = ref(false)
const quickPayOrderNo = ref('')
let quickPollTimer: ReturnType<typeof setInterval> | null = null

onMounted(async () => {
  try {
    const [p, b] = await Promise.all([
      getMemberProfile(),
      getMemberBills(1, 50)
    ])
    profile.value = p
    const allBills = b?.list || []
    recentBills.value = allBills.slice(0, 5)
    pendingBills.value = allBills.filter((bill: any) => bill.status === 'pending')
    pendingTotal.value = pendingBills.value.reduce((sum: number, bill: any) => sum + Number(bill.amount), 0)

    // 到期提醒：剩余 < 20% 且今天未关闭过
    if (p?.license?.isExpiringSoon || p?.license?.isExpired) {
      const todayKey = `expire_remind_dismissed_${new Date().toISOString().slice(0, 10)}`
      if (!localStorage.getItem(todayKey)) {
        showExpireReminder.value = true
      }
    }
  } finally {
    loading.value = false
  }
})

onUnmounted(() => { stopQuickPoll() })

const formatDate = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleDateString('zh-CN')
}

const formatShortDate = (date: string) => {
  if (!date) return ''
  const d = new Date(date)
  return `${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

const formatStorage = (mb: number) => {
  if (!mb) return '0MB'
  if (mb >= 1024) return (mb / 1024).toFixed(1) + 'GB'
  return Math.round(mb) + 'MB'
}


/** 快捷支付 — 打开弹窗自动重新生成二维码（旧二维码可能已过期） */
const handleQuickPay = async (bill: any) => {
  quickPayBill.value = bill
  quickPayQr.value = ''
  quickPayOrderNo.value = bill.orderNo
  quickPayChannel.value = bill.payType || 'wechat'
  showQuickPay.value = true
  // 始终重新生成二维码，避免使用数据库中缓存的过期二维码
  handleGenQuickPay()
}

/** 切换支付渠道时自动重新生成 */
const switchQuickChannel = (channel: string) => {
  if (quickPayChannel.value === channel) return
  quickPayChannel.value = channel
  quickPayQr.value = ''
  stopQuickPoll()
  handleGenQuickPay()
}

const closeQuickPay = () => {
  showQuickPay.value = false
  stopQuickPoll()
}

/** 生成二维码（为已有订单重新生成，不创建新订单） */
const handleGenQuickPay = async () => {
  if (!quickPayBill.value) return
  const orderNo = quickPayBill.value.orderNo
  if (!orderNo) { alert('订单号不存在'); return }
  quickPayGenerating.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`${API_BASE}/public/payment/repay/${orderNo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({ payType: quickPayChannel.value })
    })
    const data = await res.json()
    if (data.code === 0 && data.data) {
      quickPayOrderNo.value = data.data.orderNo || orderNo
      if (data.data.qrCode && data.data.qrCode.startsWith('data:')) {
        quickPayQr.value = data.data.qrCode
      } else if (data.data.payUrl || data.data.qrCode) {
        quickPayQr.value = await generateQRCodeDataUrl(data.data.payUrl || data.data.qrCode)
      } else {
        alert('支付二维码生成失败，请检查支付配置或联系客服')
        return
      }
      startQuickPoll(quickPayOrderNo.value)
    } else {
      alert(data.message || '生成收款码失败')
    }
  } catch {
    alert('网络错误')
  } finally {
    quickPayGenerating.value = false
  }
}

const startQuickPoll = (orderNo: string) => {
  stopQuickPoll()
  quickPollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/payment/query/${orderNo}`)
      const data = await res.json()
      if (data.code === 0 && data.data?.status === 'paid') {
        stopQuickPoll()
        alert('✅ 支付成功！')
        closeQuickPay()
        window.location.reload()
      }
    } catch { /* ignore */ }
  }, 5000)
}

const stopQuickPoll = () => {
  if (quickPollTimer) { clearInterval(quickPollTimer); quickPollTimer = null }
}

const handleCheckQuickPay = async () => {
  quickPayChecking.value = true
  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${quickPayOrderNo.value}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'paid') {
      stopQuickPoll()
      alert('✅ 支付成功！')
      closeQuickPay()
      window.location.reload()
    } else {
      alert('⚠️ 尚未查询到支付成功，请确认已完成支付后再试')
    }
  } finally { quickPayChecking.value = false }
}

/** 关闭到期提醒 */
const dismissReminder = () => {
  showExpireReminder.value = false
  const todayKey = `expire_remind_dismissed_${new Date().toISOString().slice(0, 10)}`
  localStorage.setItem(todayKey, '1')
}

/** 跳转续费页 */
const goRenew = () => {
  showExpireReminder.value = false
  router.push('/member/renew')
}
</script>

<style lang="scss" scoped>
.dashboard-page { max-width: 900px; }

.page-header {
  margin-bottom: 24px;
  h2 { font-size: 22px; margin: 0 0 4px; color: #1e293b; }
  p { font-size: 13px; color: #94a3b8; margin: 0; }
}

.loading-state {
  text-align: center; padding: 60px 0; color: #94a3b8; font-size: 15px;
}

.stat-cards {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 18px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  display: flex;
  align-items: flex-start;
  gap: 14px;

  &.warn { border-left: 3px solid #f59e0b; }
  &.danger { border-left: 3px solid #ef4444; }
}

.stat-icon { font-size: 28px; }

.stat-info {
  flex: 1;
  .stat-label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
  .stat-value { display: block; font-size: 18px; font-weight: 700; color: #1e293b; }
  .stat-desc { display: block; font-size: 12px; color: #94a3b8; margin-top: 2px; }
}

.progress-bar {
  width: 100%;
  height: 4px;
  background: #f1f5f9;
  border-radius: 2px;
  margin-top: 6px;
  overflow: hidden;

  .progress-fill {
    height: 100%;
    background: #6366f1;
    border-radius: 2px;
    transition: width 0.3s;
  }
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
  margin-bottom: 20px;
}

.detail-card {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);

  h3 { font-size: 15px; margin: 0 0 16px; color: #1e293b; }
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
  font-size: 13px;

  .label { color: #64748b; }
  .value { color: #1e293b; font-weight: 500; }
  .status-active { color: #16a34a; }
  .price { color: #6366f1; font-weight: 700; }
}

.detail-action {
  display: block;
  text-align: right;
  margin-top: 12px;
  font-size: 13px;
  color: #6366f1;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}

.bill-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f8fafc;
  font-size: 13px;

  .bill-date { color: #94a3b8; width: 45px; flex-shrink: 0; }
  .bill-amount { font-weight: 700; color: #1e293b; min-width: 60px; flex-shrink: 0;
    &.paid { color: #16a34a; }
    &.pending { color: #f59e0b; }
  }
  .bill-name { flex: 1; color: #475569; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .bill-action-area { flex-shrink: 0; width: 44px; text-align: right; }
  .bill-status-paid { color: #16a34a; font-size: 12px; }
}

.btn-pay-sm {
  padding: 2px 10px; border: 1px solid #6366f1; border-radius: 4px;
  background: white; color: #6366f1; cursor: pointer; font-size: 11px; font-weight: 600;
  &:hover { background: #6366f1; color: white; }
}

.empty-state {
  text-align: center;
  padding: 20px 0;
  p { color: #94a3b8; font-size: 13px; margin: 0 0 4px; }
  .hint { color: #f59e0b; font-size: 12px; }
}

.btn-small {
  display: inline-block;
  margin-top: 10px;
  padding: 6px 16px;
  background: #6366f1;
  color: white;
  border-radius: 6px;
  text-decoration: none;
  font-size: 12px;
}

.tip-card {
  padding: 14px 18px;
  border-radius: 10px;
  font-size: 13px;
  display: flex;
  align-items: center;
  gap: 8px;

  &.info { background: #f0f9ff; color: #0369a1; }
  &.warn { background: #fffbeb; color: #b45309; }
  &.danger { background: #fef2f2; color: #dc2626; }

  a { color: inherit; font-weight: 600; }
  strong { font-weight: 700; }
}

// 快捷支付弹窗
.pay-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.quick-pay-dialog { background: white; border-radius: 14px; width: 380px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.quick-pay-header { display: flex; justify-content: space-between; align-items: center; padding: 16px 20px; border-bottom: 1px solid #f1f5f9; h3 { margin: 0; font-size: 15px; color: #1e293b; } }
.pay-close { border: none; background: none; font-size: 22px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } }
.quick-pay-body { padding: 20px; }
.quick-pay-info { text-align: center; margin-bottom: 16px; }
.quick-pay-amount { font-size: 28px; font-weight: 700; color: #6366f1; }
.quick-pay-name { font-size: 13px; color: #64748b; margin-top: 4px; }

.quick-channel-opts { display: flex; gap: 8px; margin-bottom: 16px; }
.qc-opt {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 4px; padding: 10px;
  border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
}

.quick-qr-area { text-align: center; }
.quick-qr-label { font-size: 13px; font-weight: 500; color: #475569; margin-bottom: 10px; }
.quick-qr-box { display: inline-block; padding: 10px; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 14px; img { width: 180px; height: 180px; display: block; } }
.btn-check-quick { display: block; width: 100%; padding: 10px 24px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 13px; font-weight: 600; cursor: pointer; &:disabled { opacity: 0.5; } &:hover { background: #4f46e5; } }
.quick-warn { font-size: 11px; color: #f59e0b; margin: 8px 0 0; text-align: center; }

.quick-loading-area { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 8px; padding: 30px 0; color: #64748b; font-size: 13px; }

.loading-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid #e2e8f0; border-top-color: #6366f1;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}
@keyframes spin { to { transform: rotate(360deg); } }

// 到期提醒弹窗
.expire-reminder-dialog {
  background: white; border-radius: 16px; width: 400px; max-width: 92vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.18); animation: dialog-pop 0.25s ease-out;
}
@keyframes dialog-pop { from { opacity: 0; transform: scale(0.92); } to { opacity: 1; transform: scale(1); } }

.expire-reminder-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
  h3 { margin: 0; font-size: 16px; color: #b45309; }
}

.expire-reminder-body { padding: 24px; }

.expire-info {
  text-align: center; margin-bottom: 20px;

  .expire-pkg { font-size: 14px; color: #64748b; margin-bottom: 8px; }
  .expire-big { font-size: 42px; font-weight: 800; color: #f59e0b; }
  .expire-unit { font-size: 16px; color: #b45309; margin-left: 4px; }
  .expire-date { font-size: 13px; color: #94a3b8; margin-top: 6px; }
}

.expire-percent {
  display: flex; align-items: center; gap: 10px; margin-top: 12px; justify-content: center;
  span { font-size: 12px; color: #94a3b8; }
}

.expire-progress {
  width: 120px; height: 6px; background: #f1f5f9; border-radius: 3px; overflow: hidden;
  .expire-progress-fill { height: 100%; background: #f59e0b; border-radius: 3px; transition: width 0.5s; }
}

.expire-tip { text-align: center; font-size: 13px; color: #64748b; margin-bottom: 20px; }

.expire-actions {
  display: flex; gap: 10px;
  .btn-expire-renew {
    flex: 1; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px;
    font-size: 14px; font-weight: 600; cursor: pointer;
    &:hover { background: #4f46e5; }
  }
  .btn-expire-later {
    flex: 1; padding: 12px; background: white; color: #64748b; border: 1.5px solid #e2e8f0; border-radius: 8px;
    font-size: 14px; cursor: pointer;
    &:hover { background: #f8fafc; }
  }
}

@media (max-width: 768px) {
  .stat-cards { grid-template-columns: repeat(2, 1fr); }
  .detail-grid { grid-template-columns: 1fr; }
}
</style>

