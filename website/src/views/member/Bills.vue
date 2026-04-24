<template>
  <div class="bills-page">
    <!-- 顶部 Toast 通知 -->
    <transition name="toast-slide">
      <div v-if="toastVisible" class="toast-notification" :class="toastType">
        <span class="toast-icon">{{ toastType === 'success' ? '✅' : toastType === 'error' ? '❌' : 'ℹ️' }}</span>
        <span>{{ toastMessage }}</span>
      </div>
    </transition>
    <!-- 未支付账单提醒横幅 -->
    <div v-if="!loading && unpaidBills.length > 0" class="unpaid-banner">
      <span class="banner-icon">⚠️</span>
      <span>您有 <strong>{{ unpaidBills.length }}</strong> 笔待支付订单，共 <strong>¥{{ unpaidTotal.toFixed(2) }}</strong>，请尽快完成支付以激活服务。</span>
      <button class="btn-pay-now" @click="handlePayBill(unpaidBills[0])">立即支付</button>
    </div>

    <div class="page-card">
      <div class="page-card-header">
        <h2>📋 账单记录</h2>
        <div class="header-actions">
          <button class="btn-refresh" @click="handleSearch" :disabled="loading">搜索</button>
          <button class="btn-refresh" @click="handleReset" :disabled="loading">重置</button>
          <button class="btn-refresh" @click="loadBills(page)" :disabled="loading">刷新</button>
        </div>
      </div>
      <!-- 搜索栏 -->
      <div class="search-bar">
        <div class="search-field">
          <label>订单号</label>
          <input v-model="searchOrderNo" type="text" placeholder="输入订单号搜索" @keyup.enter="handleSearch" />
        </div>
        <div class="search-field">
          <label>开始日期</label>
          <input v-model="searchStartDate" type="date" />
        </div>
        <div class="search-field">
          <label>结束日期</label>
          <input v-model="searchEndDate" type="date" />
        </div>
      </div>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else>
        <div v-if="bills.length === 0" class="empty">暂无账单记录</div>
        <div v-else class="bills-table">
          <div class="table-header">
            <span class="col-date">日期</span>
            <span class="col-no">订单号</span>
            <span class="col-type">类型</span>
            <span class="col-name">套餐</span>
            <span class="col-amount">金额</span>
            <span class="col-pay">支付方式</span>
            <span class="col-status">状态</span>
            <span class="col-action">操作</span>
          </div>
          <div v-for="bill in bills" :key="bill.id" class="table-row">
            <span class="col-date">{{ formatDate(bill.createdAt) }}</span>
            <span class="col-no">{{ bill.orderNo }}</span>
            <span class="col-type">
              <span class="type-tag" :class="bill.type">{{ bill.type === 'subscription_deduct' ? '订阅扣款' : '直接支付' }}</span>
            </span>
            <span class="col-name">{{ bill.packageName }}</span>
            <span class="col-amount">¥{{ bill.amount }}</span>
            <span class="col-pay">{{ getPayLabel(bill.payType) }}</span>
            <span class="col-status">
              <span class="status-dot" :class="bill.status"></span>
              {{ getStatusLabel(bill.status) }}
            </span>
            <span class="col-action">
              <template v-if="bill.status === 'pending' && bill.type !== 'subscription_deduct'">
                <button class="btn-action pay" @click="handlePayBill(bill)">支付</button>
                <button class="btn-action cancel" @click="handleCancelBill(bill)">取消</button>
              </template>
              <template v-else>
                <span class="action-muted">—</span>
              </template>
            </span>
          </div>
        </div>
        <div v-if="total > 0" class="pagination">
          <button :disabled="page <= 1" @click="loadBills(page - 1)">上一页</button>
          <span>第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页（{{ total }} 条）</span>
          <button :disabled="page >= Math.ceil(total / pageSize)" @click="loadBills(page + 1)">下一页</button>
        </div>
        <div v-if="total > 0" class="total-info">累计消费：¥{{ totalSpent.toFixed(2) }}，共 {{ total }} 笔</div>
      </template>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="showPayDialog" class="pay-overlay" @click.self="closePayDialog">
      <div class="pay-dialog-bill">
        <div class="pay-dialog-header">
          <h3>💳 支付订单 — {{ payBill?.packageName }}</h3>
          <button class="pay-close" @click="closePayDialog">&times;</button>
        </div>
        <div class="pay-dialog-body-lr">
          <!-- 左侧：套餐信息 + 支付方式选择 -->
          <div class="pay-left-side">
            <div class="pay-info">
              <div class="pay-info-row"><span>订单号</span><span>{{ payBill?.orderNo }}</span></div>
              <div class="pay-info-row"><span>套餐</span><span>{{ payBill?.packageName }}</span></div>
              <div class="pay-info-row total"><span>应付金额</span><span>¥{{ payBill?.amount }}</span></div>
            </div>

            <h4>选择支付方式</h4>
            <div class="pay-methods">
              <label class="pay-method-option" :class="{ selected: payMethod === 'wechat' }" @click="switchPayMethod('wechat')">
                <input type="radio" v-model="payMethod" value="wechat" />
                <span>微信支付</span>
              </label>
              <label class="pay-method-option" :class="{ selected: payMethod === 'alipay' }" @click="switchPayMethod('alipay')">
                <input type="radio" v-model="payMethod" value="alipay" />
                <span>支付宝</span>
              </label>
            </div>

            <button class="btn-check-pay" @click="payQrCode ? handleCheckNewPay() : handleCheckPay()" :disabled="checkingPay" style="margin-top: 12px;">
              {{ checkingPay ? '查询中...' : '我已支付，查询结果' }}
            </button>
          </div>

          <!-- 右侧：二维码区域 -->
          <div class="pay-right-side">
            <div v-if="payCreating" class="pay-loading">
              <span class="loading-spinner"></span>
              <span>正在生成二维码...</span>
            </div>
            <template v-else-if="payQrCode">
              <div class="qr-section">
                <p class="qr-tip">请使用{{ payMethod === 'wechat' ? '微信' : '支付宝' }}扫码支付</p>
                <div class="qr-code-box">
                  <img v-if="payQrCode.startsWith('http') || payQrCode.startsWith('data:')" :src="payQrCode" alt="支付二维码" />
                  <div v-else class="qr-placeholder">
                    <p>等待二维码...</p>
                  </div>
                </div>
                <div v-if="payNewOrderNo" class="qr-order-info">
                  <span>订单号：{{ payNewOrderNo }}</span>
                </div>
                <div v-if="pollingPay" class="pay-polling">
                  <span class="loading-spinner"></span>
                  <span>等待支付结果...</span>
                </div>
              </div>
            </template>
            <div v-else class="qr-section">
              <p class="qr-tip">正在加载支付信息...</p>
              <div class="pay-loading">
                <span class="loading-spinner"></span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 自定义确认弹窗 -->
    <div v-if="showConfirmDialog" class="confirm-overlay" @click.self="cancelConfirm">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <h3>⚠️ 操作确认</h3>
          <button class="confirm-close" @click="cancelConfirm">&times;</button>
        </div>
        <div class="confirm-body">
          <p>{{ confirmMessage }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn-confirm-cancel" @click="cancelConfirm">取消</button>
          <button class="btn-confirm-ok" @click="doConfirm">确定</button>
        </div>
      </div>
    </div>

    <!-- 自定义提示弹窗 -->
    <div v-if="showAlertDialog" class="confirm-overlay" @click.self="closeAlert">
      <div class="confirm-dialog">
        <div class="confirm-header">
          <h3>{{ alertType === 'success' ? '✅ 操作成功' : 'ℹ️ 提示' }}</h3>
          <button class="confirm-close" @click="closeAlert">&times;</button>
        </div>
        <div class="confirm-body">
          <p>{{ alertMessage }}</p>
        </div>
        <div class="confirm-footer">
          <button class="btn-confirm-ok" @click="closeAlert">确定</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { getMemberBills, getMemberToken } from '@/api/member'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const API_BASE = '/api/v1'

// Toast 通知
const toastVisible = ref(false)
const toastMessage = ref('')
const toastType = ref<'success' | 'error' | 'info'>('info')
let toastTimer: any = null

const showToast = (msg: string, type: 'success' | 'error' | 'info' = 'info', duration = 3000) => {
  toastMessage.value = msg
  toastType.value = type
  toastVisible.value = true
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => { toastVisible.value = false }, duration)
}

const loading = ref(true)
const bills = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 10

// 搜索
const searchOrderNo = ref('')
const searchStartDate = ref('')
const searchEndDate = ref('')

// 支付弹窗
const showPayDialog = ref(false)
const payBill = ref<any>(null)
const checkingPay = ref(false)
const payMethod = ref('wechat')
const payCreating = ref(false)
const payQrCode = ref('')
const payNewOrderNo = ref('')
const pollingPay = ref(false)
let pollTimer: any = null

// 自定义弹窗
const showConfirmDialog = ref(false)
const confirmMessage = ref('')
let confirmResolve: ((val: boolean) => void) | null = null
const showAlertDialog = ref(false)
const alertMessage = ref('')
const alertType = ref<'success' | 'info'>('info')
let alertResolve: (() => void) | null = null

const customConfirm = (msg: string): Promise<boolean> => {
  confirmMessage.value = msg
  showConfirmDialog.value = true
  return new Promise(resolve => { confirmResolve = resolve })
}
const doConfirm = () => { showConfirmDialog.value = false; confirmResolve?.(true); confirmResolve = null }
const cancelConfirm = () => { showConfirmDialog.value = false; confirmResolve?.(false); confirmResolve = null }

const customAlert = (msg: string, type: 'success' | 'info' = 'info'): Promise<void> => {
  alertMessage.value = msg
  alertType.value = type
  showAlertDialog.value = true
  return new Promise(resolve => { alertResolve = resolve })
}
const closeAlert = () => { showAlertDialog.value = false; alertResolve?.(); alertResolve = null }

// 未支付账单
const unpaidBills = computed(() => bills.value.filter(b => b.status === 'pending' && b.type !== 'subscription_deduct'))
const unpaidTotal = computed(() => unpaidBills.value.reduce((sum, b) => sum + Number(b.amount), 0))

const totalSpent = ref(0)

const loadBills = async (p: number) => {
  loading.value = true
  page.value = p
  try {
    const filters: any = {}
    if (searchOrderNo.value.trim()) filters.orderNo = searchOrderNo.value.trim()
    if (searchStartDate.value) filters.startDate = searchStartDate.value
    if (searchEndDate.value) filters.endDate = searchEndDate.value
    const data = await getMemberBills(p, pageSize, filters)
    bills.value = data.list || []
    total.value = data.total || 0
    totalSpent.value = data.totalSpent || 0
  } finally { loading.value = false }
}

const handleSearch = () => {
  page.value = 1
  loadBills(1)
}

const handleReset = () => {
  searchOrderNo.value = ''
  searchStartDate.value = ''
  searchEndDate.value = ''
  page.value = 1
  loadBills(1)
}

onMounted(() => loadBills(1))
onUnmounted(() => { if (pollTimer) clearInterval(pollTimer) })

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const getPayLabel = (t: string) => ({ wechat: '微信', alipay: '支付宝', bank: '对公' }[t] || t)
const getStatusLabel = (s: string) => ({ paid: '已付款', pending: '待支付', closed: '已关闭', failed: '失败' }[s] || s)

/** 关闭支付弹窗 */
const closePayDialog = () => {
  showPayDialog.value = false
  payQrCode.value = ''
  payNewOrderNo.value = ''
  payCreating.value = false
  pollingPay.value = false
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
}

/** 打开支付弹窗 — 自动生成二维码 */
const handlePayBill = (bill: any) => {
  payBill.value = bill
  payMethod.value = bill.payType || 'wechat'
  payQrCode.value = ''
  payNewOrderNo.value = ''
  payCreating.value = false
  pollingPay.value = false
  showPayDialog.value = true
  // 自动生成二维码
  handleCreatePayOrder()
}

/** 切换支付方式时自动重新生成二维码 */
const switchPayMethod = (method: string) => {
  if (payMethod.value === method) return
  payMethod.value = method
  payQrCode.value = ''
  payNewOrderNo.value = ''
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null }
  pollingPay.value = false
  handleCreatePayOrder()
}

/** 为待支付账单重新生成二维码（不创建新订单） */
const handleCreatePayOrder = async () => {
  if (!payBill.value) return
  const orderNo = payBill.value.orderNo || payBill.value.order_no
  if (!orderNo) { customAlert('订单号不存在'); return }
  payCreating.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`${API_BASE}/public/payment/repay/${orderNo}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({ payType: payMethod.value })
    })
    const data = await res.json()

    if (data.code === 0 && data.data) {
      payNewOrderNo.value = data.data.orderNo || orderNo
      if (data.data.qrCode && (data.data.qrCode.startsWith('data:') || data.data.qrCode.startsWith('http'))) {
        payQrCode.value = data.data.qrCode
      } else if (data.data.payUrl) {
        payQrCode.value = await generateQRCodeDataUrl(data.data.payUrl)
      } else if (data.data.qrCode) {
        payQrCode.value = await generateQRCodeDataUrl(data.data.qrCode)
      } else {
        payQrCode.value = await generateQRCodeDataUrl(payNewOrderNo.value)
      }
      // 开始轮询支付状态
      startPolling(payNewOrderNo.value)
    } else {
      customAlert(data.message || '生成支付二维码失败')
    }
  } catch {
    customAlert('生成支付二维码失败，请稍后重试')
  } finally {
    payCreating.value = false
  }
}

/** 开始轮询支付状态 */
const startPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollingPay.value = true
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${API_BASE}/public/payment/query/${orderNo}`)
      const data = await res.json()
      if (data.code === 0 && data.data?.status === 'paid') {
        clearInterval(pollTimer)
        pollTimer = null
        pollingPay.value = false
        closePayDialog()
        loadBills(page.value)
        customAlert('支付成功！套餐已激活。', 'success')
      }
    } catch {
      // 忽略轮询错误
    }
  }, 3000)
}

/** 查询原订单支付状态 */
const handleCheckPay = async () => {
  if (!payBill.value?.orderNo) return
  checkingPay.value = true
  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${payBill.value.orderNo}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'paid') {
      closePayDialog()
      loadBills(page.value)
      customAlert('支付成功！套餐已更新。', 'success')
    } else {
      customAlert('支付尚未完成，请确认已完成支付后重试，或点击"生成支付二维码"重新发起支付')
    }
  } finally { checkingPay.value = false }
}

/** 查询新订单支付状态 */
const handleCheckNewPay = async () => {
  if (!payNewOrderNo.value) return
  checkingPay.value = true
  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${payNewOrderNo.value}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'paid') {
      closePayDialog()
      loadBills(page.value)
      customAlert('支付成功！套餐已激活。', 'success')
    } else {
      customAlert('支付尚未完成，请确认已完成支付后重试')
    }
  } finally { checkingPay.value = false }
}

/** 取消订单 */
const handleCancelBill = async (bill: any) => {
  const confirmed = await customConfirm(`确定取消订单 ${bill.orderNo}？取消后不可恢复。`)
  if (!confirmed) return
  try {
    const token = getMemberToken()
    const res = await fetch(`${API_BASE}/public/payment/close/${bill.orderNo}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) }
    })
    const data = await res.json()
    if (data.code === 0) {
      loadBills(page.value)
      showToast('订单已取消', 'success')
    } else {
      showToast(data.message || '取消失败', 'error')
    }
  } catch {
    showToast('操作失败，请稍后重试', 'error')
  }
}
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.page-card-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; h2 { margin: 0; font-size: 18px; color: #1e293b; } }
.header-actions { display: flex; gap: 8px; }
.btn-refresh { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; color: #64748b; cursor: pointer; font-size: 12px; &:hover { background: #f8fafc; color: #6366f1; border-color: #c7d2fe; } &:disabled { opacity: 0.5; cursor: not-allowed; } }

.search-bar {
  display: flex;
  gap: 12px;
  align-items: flex-end;
  margin-bottom: 18px;
  padding: 14px 16px;
  background: #f8fafc;
  border-radius: 10px;
  border: 1px solid #f1f5f9;
  flex-wrap: wrap;
}

.search-field {
  display: flex;
  flex-direction: column;
  gap: 4px;

  label {
    font-size: 12px;
    color: #64748b;
    font-weight: 500;
  }

  input {
    padding: 7px 12px;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    font-size: 13px;
    color: #334155;
    background: white;
    outline: none;
    transition: border-color 0.2s;

    &:focus {
      border-color: #6366f1;
      box-shadow: 0 0 0 2px rgba(99, 102, 241, 0.1);
    }

    &::placeholder {
      color: #94a3b8;
    }

    &[type="text"] {
      width: 200px;
    }

    &[type="date"] {
      width: 150px;
    }
  }
}
.page-card h2 { margin: 0; font-size: 18px; color: #1e293b; }
.loading, .empty { text-align: center; padding: 40px 0; color: #94a3b8; }
.bills-table { overflow-x: auto; }
.table-header, .table-row { display: grid; grid-template-columns: 90px 1fr 80px auto 70px 80px 72px 110px; gap: 6px; padding: 10px 0; font-size: 13px; align-items: center; }
.table-header { font-weight: 600; color: #64748b; border-bottom: 2px solid #f1f5f9; }
.table-row { border-bottom: 1px solid #f8fafc; color: #475569; }
.type-tag { padding: 2px 8px; border-radius: 10px; font-size: 11px; &.payment { background: #eff6ff; color: #2563eb; } &.subscription_deduct { background: #f0fdf4; color: #16a34a; } }
.status-dot { display: inline-block; width: 6px; height: 6px; border-radius: 50%; margin-right: 4px; &.paid { background: #16a34a; } &.pending { background: #f59e0b; } &.closed, &.failed { background: #94a3b8; } }
.col-amount { font-weight: 600; }
.col-action { display: flex; gap: 4px; align-items: center; white-space: nowrap; flex-wrap: nowrap; }
.btn-action { padding: 3px 10px; border-radius: 5px; font-size: 11px; cursor: pointer; border: 1px solid; white-space: nowrap; flex-shrink: 0;
  &.pay { border-color: #6366f1; color: #6366f1; background: white; &:hover { background: #6366f1; color: white; } }
  &.cancel { border-color: #e2e8f0; color: #94a3b8; background: white; &:hover { color: #dc2626; border-color: #fca5a5; } }
}
.action-muted { color: #cbd5e1; font-size: 12px; }
.pagination { display: flex; align-items: center; justify-content: center; gap: 16px; margin-top: 20px; font-size: 13px; button { padding: 6px 14px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; &:disabled { opacity: 0.4; cursor: not-allowed; } } }
.total-info { text-align: right; margin-top: 12px; font-size: 13px; color: #64748b; }

// 未支付横幅
.unpaid-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 20px;
  margin-bottom: 16px;
  background: linear-gradient(135deg, #fef2f2 0%, #fff1f2 100%);
  border: 1px solid #fecaca;
  border-radius: 12px;
  font-size: 13px;
  color: #dc2626;
  animation: pulse-border 2s ease-in-out infinite;

  .banner-icon { font-size: 18px; }
  strong { font-weight: 700; }
}

.btn-pay-now {
  margin-left: auto;
  white-space: nowrap;
  padding: 6px 18px;
  background: #dc2626;
  color: white;
  border: none;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  &:hover { background: #b91c1c; }
}

@keyframes pulse-border {
  0%, 100% { border-color: #fecaca; }
  50% { border-color: #f87171; }
}

// 支付弹窗
.pay-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.pay-dialog-bill { background: white; border-radius: 14px; width: 620px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.pay-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; h3 { margin: 0; font-size: 15px; color: #1e293b; } }
.pay-close { border: none; background: none; font-size: 22px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } }
.pay-dialog-body-lr { padding: 22px; display: flex; gap: 22px; h4 { font-size: 14px; color: #475569; margin: 16px 0 10px; } }
.pay-left-side { flex: 1; min-width: 0; }
.pay-right-side { width: 240px; flex-shrink: 0; display: flex; align-items: center; justify-content: center; border-left: 1px solid #f1f5f9; padding-left: 22px; }
.pay-info { background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
.pay-info-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0; }
.pay-info-row.total { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; color: #6366f1; }

.pay-methods {
  display: flex; gap: 10px; margin-bottom: 16px;
}
.pay-method-option {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 10px 14px;
  border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
}

.pay-btn-group { display: flex; flex-direction: column; gap: 8px; }
.btn-create-pay { width: 100%; padding: 12px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; &:hover { background: #4f46e5; } }
.btn-check-pay { width: 100%; padding: 10px; background: white; color: #6366f1; border: 1.5px solid #6366f1; border-radius: 8px; font-size: 13px; font-weight: 500; cursor: pointer; &:disabled { opacity: 0.5; } &:hover { background: #f8f7ff; } }
.btn-mock-pay { width: 100%; padding: 8px; border: 1.5px solid #f59e0b; border-radius: 8px; background: #fffbeb; color: #d97706; cursor: pointer; font-size: 12px; }

.pay-loading {
  display: flex; align-items: center; justify-content: center; gap: 8px;
  padding: 20px; color: #64748b; font-size: 13px;
}

.qr-section {
  text-align: center; margin-bottom: 16px;
  .qr-tip { font-size: 13px; color: #64748b; margin-bottom: 12px; }
}

.qr-code-box {
  display: inline-block; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; margin-bottom: 10px;
  img { width: 200px; height: 200px; }
}

.qr-placeholder {
  width: 200px; height: 200px; display: flex; flex-direction: column; align-items: center; justify-content: center;
  background: #f8fafc; border-radius: 8px; color: #94a3b8;
  span { font-size: 40px; } p { margin: 8px 0 0; font-size: 12px; }
}

.qr-order-info { font-size: 12px; color: #94a3b8; margin-bottom: 10px; }

.pay-polling {
  display: flex; align-items: center; justify-content: center; gap: 6px;
  font-size: 13px; color: #6366f1; margin-bottom: 10px;
}

.loading-spinner {
  display: inline-block; width: 14px; height: 14px;
  border: 2px solid #e2e8f0; border-top-color: #6366f1;
  border-radius: 50%; animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

// 自定义确认/提示弹窗
.confirm-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.confirm-dialog {
  background: white; border-radius: 14px; width: 400px; max-width: 90vw;
  box-shadow: 0 20px 60px rgba(0,0,0,0.15); animation: dialog-in 0.2s ease-out;
}
@keyframes dialog-in { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
.confirm-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 18px 22px; border-bottom: 1px solid #f1f5f9;
  h3 { margin: 0; font-size: 15px; color: #1e293b; }
}
.confirm-close { border: none; background: none; font-size: 20px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } }
.confirm-body { padding: 20px 22px; p { margin: 0; font-size: 14px; color: #475569; line-height: 1.6; } }
.confirm-footer {
  display: flex; justify-content: flex-end; gap: 10px; padding: 14px 22px; border-top: 1px solid #f1f5f9;
}
.btn-confirm-cancel {
  padding: 8px 20px; border: 1px solid #e2e8f0; border-radius: 8px;
  background: white; color: #64748b; font-size: 13px; cursor: pointer;
  &:hover { background: #f8fafc; color: #1e293b; }
}
.btn-confirm-ok {
  padding: 8px 20px; border: none; border-radius: 8px;
  background: #6366f1; color: white; font-size: 13px; font-weight: 600; cursor: pointer;
  &:hover { background: #4f46e5; }
}

// 顶部 Toast 通知
.toast-notification {
  position: fixed;
  top: 20px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 3000;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: 10px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  white-space: nowrap;

  &.success {
    background: #f0fdf4;
    color: #16a34a;
    border: 1px solid #bbf7d0;
  }
  &.error {
    background: #fef2f2;
    color: #dc2626;
    border: 1px solid #fecaca;
  }
  &.info {
    background: #eff6ff;
    color: #2563eb;
    border: 1px solid #bfdbfe;
  }

  .toast-icon {
    font-size: 16px;
  }
}

.toast-slide-enter-active {
  transition: all 0.3s ease-out;
}
.toast-slide-leave-active {
  transition: all 0.3s ease-in;
}
.toast-slide-enter-from {
  opacity: 0;
  transform: translateX(-50%) translateY(-30px);
}
.toast-slide-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-30px);
}
</style>

