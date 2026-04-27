<template>
  <div class="sms-quota-page">
    <!-- Toast 通知 -->
    <transition name="toast-slide">
      <div v-if="toastVisible" class="toast-notification" :class="toastType">
        <span class="toast-icon">{{ toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️' }}</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>

    <!-- 额度概览 -->
    <div class="quota-overview">
      <div class="quota-card">
        <div class="qc-icon">💰</div>
        <div class="qc-info">
          <div class="qc-label">单条价格</div>
          <div class="qc-value highlight">¥{{ quota.unitPrice?.toFixed(4) || '0.0450' }}</div>
        </div>
      </div>
      <div class="quota-card">
        <div class="qc-icon">📦</div>
        <div class="qc-info">
          <div class="qc-label">总额度</div>
          <div class="qc-value">{{ quota.totalQuota?.toLocaleString() || 0 }} 条</div>
        </div>
      </div>
      <div class="quota-card">
        <div class="qc-icon">📤</div>
        <div class="qc-info">
          <div class="qc-label">已使用</div>
          <div class="qc-value used">{{ quota.usedQuota?.toLocaleString() || 0 }} 条</div>
        </div>
      </div>
      <div class="quota-card">
        <div class="qc-icon">📥</div>
        <div class="qc-info">
          <div class="qc-label">剩余</div>
          <div class="qc-value remain">{{ quota.remaining?.toLocaleString() || 0 }} 条</div>
        </div>
      </div>
    </div>
    <div class="quota-bar-wrap">
      <div class="quota-bar">
        <div class="quota-bar-fill" :style="{ width: Math.min(quota.usagePercent || 0, 100) + '%' }" :class="{ warning: quota.usagePercent > 80 }"></div>
      </div>
      <span class="quota-bar-text">已使用 {{ quota.usagePercent || 0 }}%</span>
    </div>

    <!-- 购买套餐 -->
    <div class="page-card">
      <h2>📦 购买短信额度</h2>
      <div v-if="packagesLoading" class="loading">加载套餐中...</div>
      <div v-else-if="packages.length === 0" class="empty">暂无可用套餐，请联系管理员配置。</div>
      <template v-else>
        <div class="pkg-grid">
          <div
            v-for="pkg in packages"
            :key="pkg.id"
            class="pkg-item"
            :class="{ selected: selectedPkgId === pkg.id }"
            @click="selectedPkgId = pkg.id"
          >
            <div class="pkg-name">{{ pkg.name }}</div>
            <div class="pkg-count">{{ pkg.smsCount?.toLocaleString() }} 条</div>
            <div class="pkg-price">¥{{ Number(pkg.price).toFixed(2) }}</div>
            <div class="pkg-unit">折合 ¥{{ Number(pkg.unitPrice).toFixed(4) }}/条</div>
            <div v-if="pkg.description" class="pkg-desc">{{ pkg.description }}</div>
            <div v-if="selectedPkgId === pkg.id" class="pkg-selected-mark">✓</div>
          </div>
        </div>

        <!-- 支付方式 -->
        <div class="pay-section">
          <div class="pay-label">支付方式</div>
          <div class="pay-methods">
            <label class="pay-opt" :class="{ selected: payType === 'wechat' }" @click="payType = 'wechat'">
              <input type="radio" v-model="payType" value="wechat" /> 微信支付
            </label>
            <label class="pay-opt" :class="{ selected: payType === 'alipay' }" @click="payType = 'alipay'">
              <input type="radio" v-model="payType" value="alipay" /> 支付宝
            </label>
          </div>
        </div>

        <div class="buy-action">
          <button class="btn-buy" @click="handleBuy" :disabled="!selectedPkgId || buying">
            {{ buying ? '提交中...' : '立即购买' }}
          </button>
        </div>
      </template>
    </div>

    <!-- 购买记录 -->
    <div class="page-card">
      <h2>📋 购买记录</h2>
      <div v-if="billsLoading" class="loading">加载中...</div>
      <div v-else-if="bills.length === 0 && billsTotal === 0" class="empty">暂无购买记录</div>
      <template v-else>
        <div class="bills-list">
          <div class="bill-header">
            <span class="bh-time">时间</span>
            <span class="bh-pkg">套餐</span>
            <span class="bh-amount">金额</span>
            <span class="bh-count">条数</span>
            <span class="bh-status">状态</span>
          </div>
          <div class="bill-row" v-for="b in bills" :key="b.id">
            <span class="br-time">{{ formatDate(b.paidAt || b.createdAt) }}</span>
            <span class="br-pkg">{{ b.packageName }}</span>
            <span class="br-amount">¥{{ Number(b.amount).toFixed(2) }}</span>
            <span class="br-count">{{ b.smsCount?.toLocaleString() }}</span>
            <span class="br-status" :class="b.status">{{ statusLabel(b.status) }}</span>
          </div>
        </div>
        <div class="bills-pagination">
          <button class="page-btn" :disabled="billsPage <= 1" @click="changeBillsPage(billsPage - 1)">上一页</button>
          <span class="page-info">第 {{ billsPage }} / {{ billsTotalPages || 1 }} 页，共 {{ billsTotal }} 条（{{ billsPageSize }}条/页）</span>
          <button class="page-btn" :disabled="billsPage >= billsTotalPages" @click="changeBillsPage(billsPage + 1)">下一页</button>
        </div>
      </template>
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
          <div class="pay-desc">短信额度 - {{ payOrderPkgName }}</div>
          <div v-if="payGenerating" class="pay-loading">
            <span class="loading-spinner"></span>正在生成二维码...
          </div>
          <div v-else-if="payQrCode" class="pay-qr-area">
            <p class="pay-qr-tip">请使用{{ payType === 'wechat' ? '微信' : '支付宝' }}扫码支付</p>
            <div class="pay-qr-box">
              <img :src="payQrCode" alt="支付二维码" />
            </div>
            <div class="pay-actions">
              <button class="btn-check-pay" @click="handleCheckPay" :disabled="payChecking">
                {{ payChecking ? '查询中...' : '我已支付，查询结果' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getMemberToken } from '@/api/member'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const API_BASE = '/api/v1'

// Toast
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimer: any = null
const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info') => {
  toastMessage.value = msg; toastType.value = type; toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, 3500)
}

// 带认证的请求
async function apiFetch(url: string, options: RequestInit = {}) {
  const token = getMemberToken()
  const headers: any = { 'Content-Type': 'application/json', ...options.headers }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { ...options, headers })
  return res.json()
}

// 状态
const quota = ref<any>({ totalQuota: 0, usedQuota: 0, remaining: 0, usagePercent: 0, unitPrice: 0.045 })
const packages = ref<any[]>([])
const packagesLoading = ref(true)
const bills = ref<any[]>([])
const billsLoading = ref(true)
const billsPage = ref(1)
const billsPageSize = 10
const billsTotal = ref(0)
const billsTotalPages = computed(() => Math.ceil(billsTotal.value / billsPageSize))
const selectedPkgId = ref('')
const payType = ref<'wechat' | 'alipay'>('wechat')
const buying = ref(false)

// 支付弹窗
const showPayDialog = ref(false)
const payGenerating = ref(false)
const payQrCode = ref('')
const payOrderNo = ref('')
const payOrderAmount = ref(0)
const payOrderPkgName = ref('')
const payChecking = ref(false)
let pollTimer: any = null

const statusMap: Record<string, string> = { paid: '已完成', pending: '待支付', refunded: '已退款', closed: '已关闭' }
const statusLabel = (s: string) => statusMap[s] || s
const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '-'

// 加载数据
const loadQuota = async () => {
  try {
    const data = await apiFetch(`${API_BASE}/public/member/sms-quota`)
    if (data.code === 0 && data.data) quota.value = data.data
  } catch { /* ignore */ }
}

const loadPackages = async () => {
  packagesLoading.value = true
  try {
    const data = await apiFetch(`${API_BASE}/public/member/sms-quota/packages`)
    if (data.code === 0 && data.data?.list) packages.value = data.data.list
  } catch { /* ignore */ }
  finally { packagesLoading.value = false }
}

const loadBills = async () => {
  billsLoading.value = true
  try {
    const data = await apiFetch(`${API_BASE}/public/member/sms-quota/bills?page=${billsPage.value}&pageSize=${billsPageSize}`)
    if (data.code === 0 && data.data?.list) {
      bills.value = data.data.list
      billsTotal.value = data.data.total || 0
    }
  } catch { /* ignore */ }
  finally { billsLoading.value = false }
}

const changeBillsPage = (page: number) => {
  if (page < 1 || page > billsTotalPages.value) return
  billsPage.value = page
  loadBills()
}

// 购买
const handleBuy = async () => {
  if (!selectedPkgId.value) { showToast('请选择一个套餐', 'error'); return }
  buying.value = true
  try {
    const data = await apiFetch(`${API_BASE}/public/member/sms-quota/purchase`, {
      method: 'POST',
      body: JSON.stringify({ packageId: selectedPkgId.value, payType: payType.value })
    })
    if (data.code === 0 && data.data) {
      payOrderNo.value = data.data.orderNo
      payOrderAmount.value = data.data.amount || 0
      payOrderPkgName.value = data.data.packageName || ''
      const qrRaw = data.data.qrCode || data.data.payUrl || ''
      if (qrRaw.startsWith('data:') || qrRaw.startsWith('http')) {
        payQrCode.value = qrRaw
      } else if (qrRaw) {
        payQrCode.value = await generateQRCodeDataUrl(qrRaw)
      }
      showPayDialog.value = true
      startPolling(data.data.orderNo)
    } else {
      showToast(data.message || '创建订单失败', 'error')
    }
  } catch { showToast('请求失败，请稍后重试', 'error') }
  finally { buying.value = false }
}

// 轮询支付状态
const startPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const data = await apiFetch(`${API_BASE}/public/member/sms-quota/order/${orderNo}`)
      if (data.code === 0 && data.data?.status === 'paid') {
        clearInterval(pollTimer); pollTimer = null
        closePayDialog()
        showToast(`购买成功！已充值 ${data.data.smsCount?.toLocaleString()} 条短信额度`, 'success')
        loadQuota()
        loadBills()
      }
    } catch { /* ignore */ }
  }, 3000)
}

const handleCheckPay = async () => {
  if (!payOrderNo.value) return
  payChecking.value = true
  try {
    const data = await apiFetch(`${API_BASE}/public/member/sms-quota/order/${payOrderNo.value}`)
    if (data.code === 0 && data.data?.status === 'paid') {
      closePayDialog()
      showToast(`购买成功！已充值 ${data.data.smsCount?.toLocaleString()} 条`, 'success')
      loadQuota()
      loadBills()
    } else {
      showToast('支付尚未完成，请先完成扫码支付', 'info')
    }
  } catch { showToast('查询失败', 'error') }
  finally { payChecking.value = false }
}


const closePayDialog = () => {
  showPayDialog.value = false
  payQrCode.value = ''
  payOrderNo.value = ''
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

onMounted(() => {
  loadQuota()
  loadPackages()
  loadBills()
})

onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })
</script>

<style scoped>
.sms-quota-page {
  position: relative;
}

/* Toast */
.toast-notification {
  position: fixed; top: 90px; right: 24px; z-index: 9999;
  padding: 12px 20px; border-radius: 8px; font-size: 14px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12); display: flex; align-items: center; gap: 8px;
}
.toast-notification.success { background: #f0fdf4; color: #16a34a; border: 1px solid #bbf7d0; }
.toast-notification.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }
.toast-notification.info { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }
.toast-slide-enter-active, .toast-slide-leave-active { transition: all 0.3s ease; }
.toast-slide-enter-from, .toast-slide-leave-to { opacity: 0; transform: translateX(60px); }

/* 额度概览 */
.quota-overview {
  display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 8px;
}
.quota-card {
  background: white; border-radius: 12px; padding: 20px 16px; display: flex; align-items: center; gap: 14px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
}
.qc-icon { font-size: 28px; }
.qc-label { font-size: 12px; color: #94a3b8; margin-bottom: 4px; }
.qc-value { font-size: 18px; font-weight: 700; color: #1e293b; }
.qc-value.highlight { color: #e6a23c; }
.qc-value.used { color: #ef4444; }
.qc-value.remain { color: #22c55e; }

.quota-bar-wrap {
  display: flex; align-items: center; gap: 12px; margin-bottom: 24px;
}
.quota-bar {
  flex: 1; height: 8px; background: #e2e8f0; border-radius: 4px; overflow: hidden;
}
.quota-bar-fill {
  height: 100%; background: linear-gradient(90deg, #6366f1, #8b5cf6); border-radius: 4px; transition: width 0.5s;
}
.quota-bar-fill.warning { background: linear-gradient(90deg, #f59e0b, #ef4444); }
.quota-bar-text { font-size: 12px; color: #94a3b8; white-space: nowrap; }

/* 通用卡片 */
.page-card {
  background: white; border-radius: 12px; padding: 24px; margin-bottom: 20px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.04); border: 1px solid #f1f5f9;
}
.page-card h2 { margin: 0 0 20px; font-size: 17px; color: #1e293b; }
.loading { text-align: center; padding: 32px; color: #94a3b8; }
.empty { text-align: center; padding: 32px; color: #94a3b8; }

/* 套餐网格 */
.pkg-grid {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(165px, 1fr)); gap: 14px;
}
.pkg-item {
  position: relative; border: 2px solid #e2e8f0; border-radius: 12px; padding: 18px 14px;
  text-align: center; cursor: pointer; transition: all 0.2s; background: #fafbfc;
}
.pkg-item:hover { border-color: #6366f1; box-shadow: 0 2px 12px rgba(99,102,241,0.12); }
.pkg-item.selected { border-color: #6366f1; background: #f0f0ff; }
.pkg-name { font-size: 15px; font-weight: 600; color: #1e293b; margin-bottom: 6px; }
.pkg-count { font-size: 22px; font-weight: 700; color: #6366f1; margin-bottom: 4px; }
.pkg-price { font-size: 16px; font-weight: 600; color: #e6a23c; }
.pkg-unit { font-size: 11px; color: #94a3b8; margin-top: 2px; }
.pkg-desc { font-size: 11px; color: #94a3b8; margin-top: 8px; line-height: 1.4; }
.pkg-selected-mark {
  position: absolute; top: 8px; right: 10px; font-size: 18px; color: #6366f1; font-weight: 700;
}

/* 支付方式 */
.pay-section { margin-top: 24px; display: flex; align-items: center; gap: 16px; }
.pay-label { font-weight: 500; color: #475569; white-space: nowrap; }
.pay-methods { display: flex; gap: 12px; }
.pay-opt {
  padding: 8px 20px; border: 2px solid #e2e8f0; border-radius: 8px; cursor: pointer;
  font-size: 14px; color: #475569; transition: all 0.2s;
}
.pay-opt.selected { border-color: #6366f1; background: #f0f0ff; color: #6366f1; }
.pay-opt input { display: none; }

/* 购买按钮 */
.buy-action { margin-top: 24px; text-align: center; }
.btn-buy {
  padding: 12px 48px; font-size: 16px; font-weight: 600; border: none; border-radius: 10px;
  background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; cursor: pointer;
  transition: all 0.2s; box-shadow: 0 4px 12px rgba(99,102,241,0.3);
}
.btn-buy:hover { transform: translateY(-1px); box-shadow: 0 6px 16px rgba(99,102,241,0.4); }
.btn-buy:disabled { opacity: 0.5; cursor: not-allowed; transform: none; }

/* 账单列表 */
.bill-header, .bill-row { display: grid; grid-template-columns: 2fr 1.5fr 1fr 1fr 1fr; gap: 8px; padding: 10px 0; font-size: 13px; }
.bill-header { font-weight: 600; color: #64748b; border-bottom: 1px solid #e2e8f0; }
.bill-row { border-bottom: 1px solid #f1f5f9; color: #334155; }
.br-status.paid { color: #22c55e; font-weight: 500; }
.br-status.refunded { color: #94a3b8; }

/* 分页 */
.bills-pagination {
  display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 16px; padding-top: 12px;
  border-top: 1px solid #f1f5f9;
}
.page-btn {
  padding: 6px 16px; border: 1px solid #e2e8f0; border-radius: 6px; background: white;
  color: #475569; font-size: 13px; cursor: pointer; transition: all 0.2s;
}
.page-btn:hover:not(:disabled) { border-color: #6366f1; color: #6366f1; }
.page-btn:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: #94a3b8; }

/* 支付弹窗 */
.pay-overlay {
  position: fixed; inset: 0; z-index: 9998; background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
}
.pay-dialog {
  background: white; border-radius: 16px; width: 400px; max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); overflow: hidden;
}
.pay-dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #f1f5f9;
}
.pay-dialog-header h3 { margin: 0; font-size: 16px; }
.pay-close { background: none; border: none; font-size: 24px; cursor: pointer; color: #94a3b8; }
.pay-dialog-body { padding: 24px 20px; text-align: center; }
.pay-amount { font-size: 32px; font-weight: 700; color: #1e293b; }
.pay-desc { font-size: 13px; color: #94a3b8; margin-top: 4px; margin-bottom: 20px; }
.pay-loading { padding: 32px; color: #94a3b8; }
.loading-spinner {
  display: inline-block; width: 18px; height: 18px; border: 2px solid #e2e8f0;
  border-top-color: #6366f1; border-radius: 50%; animation: spin 0.8s linear infinite;
  vertical-align: middle; margin-right: 8px;
}
@keyframes spin { to { transform: rotate(360deg); } }
.pay-qr-tip { font-size: 13px; color: #64748b; margin-bottom: 12px; }
.pay-qr-box {
  display: inline-block; padding: 12px; background: #fafbfc; border-radius: 10px;
  border: 1px solid #e2e8f0;
}
.pay-qr-box img { width: 200px; height: 200px; display: block; }
.pay-actions { margin-top: 20px; display: flex; flex-direction: column; gap: 10px; align-items: center; }
.btn-check-pay {
  padding: 10px 32px; border: none; border-radius: 8px;
  background: #6366f1; color: white; font-size: 14px; font-weight: 500; cursor: pointer;
}
.btn-check-pay:disabled { opacity: 0.5; }

/* 响应式 */
@media (max-width: 768px) {
  .quota-overview { grid-template-columns: repeat(2, 1fr); }
  .pkg-grid { grid-template-columns: 1fr 1fr; }
  .bill-header, .bill-row { font-size: 11px; grid-template-columns: 1.5fr 1fr 1fr 0.8fr 0.8fr; }
}
</style>

