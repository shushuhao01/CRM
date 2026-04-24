<template>
  <div class="wecom-usage">
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <template v-else>
      <!-- 用量概览卡片 -->
      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-icon seats">💺</div>
          <div class="stat-body">
            <div class="stat-value">{{ usage.seats.usedUsers }}<span>/{{ usage.seats.maxUsers }}</span></div>
            <div class="stat-label">席位用量</div>
            <div class="stat-bar">
              <div class="stat-bar-inner" :style="{ width: usage.seats.usagePercent + '%' }"
                   :class="seatBarClass"></div>
            </div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon messages">💬</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNum(usage.messageStats.total) }}</div>
            <div class="stat-label">总消息数</div>
            <div class="stat-sub">今日 {{ formatNum(usage.messageStats.today) }} · 本周 {{ formatNum(usage.messageStats.week) }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon customers">👥</div>
          <div class="stat-body">
            <div class="stat-value">{{ formatNum(usage.customerStats.total) }}</div>
            <div class="stat-label">企微客户</div>
            <div class="stat-sub">近7天活跃 {{ formatNum(usage.customerStats.active7d) }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon storage">💾</div>
          <div class="stat-body">
            <div class="stat-value">{{ usage.storage.usedMB }}<span>MB</span></div>
            <div class="stat-label">存储用量</div>
            <div class="stat-sub">{{ usage.storage.type === 'oss' ? 'OSS云存储' : '本地存储' }}</div>
          </div>
        </div>

        <div class="stat-card">
          <div class="stat-icon ai">🤖</div>
          <div class="stat-body">
            <div class="stat-value">{{ usage.aiStats?.usedQuota || 0 }}<span>/{{ usage.aiStats?.totalQuota || 0 }}</span></div>
            <div class="stat-label">AI调用额度</div>
            <div class="stat-bar" v-if="usage.aiStats?.totalQuota">
              <div class="stat-bar-inner" :style="{ width: Math.min(100, (usage.aiStats.usedQuota / usage.aiStats.totalQuota * 100)).toFixed(0) + '%' }"
                   :class="usage.aiStats.usedQuota / usage.aiStats.totalQuota > 0.9 ? 'warn' : 'normal'"></div>
            </div>
            <div class="stat-sub" v-else>未开通</div>
          </div>
        </div>
      </div>

      <!-- AI使用量 -->
      <div v-if="usage.aiStats?.totalQuota" class="section-card">
        <div class="section-header">
          <h4>🤖 AI使用量</h4>
        </div>
        <div class="msg-stats-row">
          <div class="msg-stat">
            <span class="msg-num">{{ usage.aiStats?.todayCalls || 0 }}</span>
            <span class="msg-label">今日调用</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num">{{ usage.aiStats?.monthCalls || 0 }}</span>
            <span class="msg-label">本月调用</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num">{{ usage.aiStats?.remainingQuota || 0 }}</span>
            <span class="msg-label">剩余额度</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num" :style="{ color: usage.aiStats?.expireDate ? '#303133' : '#c0c4cc' }">{{ usage.aiStats?.expireDate ? usage.aiStats.expireDate.substring(0, 10) : '-' }}</span>
            <span class="msg-label">到期时间</span>
          </div>
        </div>
      </div>

      <!-- 消息趋势 -->
      <div class="section-card">
        <div class="section-header">
          <h4>📊 消息统计</h4>
        </div>
        <div class="msg-stats-row">
          <div class="msg-stat">
            <span class="msg-num">{{ formatNum(usage.messageStats.today) }}</span>
            <span class="msg-label">今日</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num">{{ formatNum(usage.messageStats.week) }}</span>
            <span class="msg-label">近7天</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num">{{ formatNum(usage.messageStats.month) }}</span>
            <span class="msg-label">近30天</span>
          </div>
          <div class="msg-stat">
            <span class="msg-num">{{ formatNum(usage.messageStats.total) }}</span>
            <span class="msg-label">累计总量</span>
          </div>
        </div>
      </div>

      <!-- 订单历史 -->
      <div class="section-card">
        <div class="section-header">
          <h4>📋 订单历史</h4>
          <div class="order-filters">
            <select v-model="orderFilter" @change="fetchOrders">
              <option value="all">全部状态</option>
              <option value="paid">已支付</option>
              <option value="pending">待支付</option>
              <option value="expired">已过期</option>
            </select>
          </div>
        </div>

        <!-- 订单统计 -->
        <div v-if="orderStats.totalOrders > 0" class="order-summary">
          <span>共 {{ orderStats.totalOrders }} 笔订单</span>
          <span>累计支付 ¥{{ orderStats.totalPaid || 0 }}</span>
          <span v-if="orderStats.pendingCount > 0" class="pending-tag">{{ orderStats.pendingCount }} 笔待支付</span>
        </div>

        <!-- 订单列表 -->
        <div v-if="orders.length > 0" class="order-list">
          <div v-for="order in orders" :key="order.id" class="order-item">
            <div class="order-header">
              <span class="order-no">{{ order.orderNo }}</span>
              <span class="order-status" :class="order.status">{{ statusText(order.status) }}</span>
            </div>
            <div class="order-body">
              <div class="order-info-row">
                <span class="order-package">{{ order.packageName }}</span>
                <span class="order-amount">¥{{ order.amount }}</span>
              </div>
              <div class="order-meta">
                <span>{{ formatPayType(order.payType) }}</span>
                <span>{{ formatDateTime(order.createdAt) }}</span>
              </div>
            </div>
          </div>
        </div>
        <div v-else class="empty-orders">
          <p>暂无订单记录</p>
        </div>

        <!-- 分页 -->
        <div class="pagination">
          <button :disabled="currentPage <= 1" @click="changePage(currentPage - 1)">上一页</button>
          <span class="page-info">第 {{ currentPage }} 页 / 共 {{ totalPages || 1 }} 页（{{ totalOrders }} 条）</span>
          <button :disabled="currentPage >= totalPages" @click="changePage(currentPage + 1)">下一页</button>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMemberToken } from '@/api/member'

const loading = ref(true)

const usage = ref({
  seats: { maxUsers: 0, usedUsers: 0, usagePercent: 0, status: 'disabled', expireDate: null as string | null },
  messageStats: { total: 0, today: 0, week: 0, month: 0 },
  customerStats: { total: 0, active7d: 0 },
  storage: { usedMB: 0, type: 'local' },
  aiStats: { totalQuota: 0, usedQuota: 0, remainingQuota: 0, todayCalls: 0, monthCalls: 0, expireDate: null as string | null }
})

const orders = ref<any[]>([])
const orderStats = ref({ totalOrders: 0, totalPaid: 0, pendingCount: 0 })
const totalOrders = ref(0)
const currentPage = ref(1)
const pageSize = ref(10)
const orderFilter = ref('all')

const totalPages = computed(() => Math.ceil(totalOrders.value / pageSize.value))

const seatBarClass = computed(() => {
  const p = usage.value.seats.usagePercent
  if (p >= 100) return 'full'
  if (p >= 90) return 'warn'
  return 'normal'
})

const formatNum = (n: number) => {
  if (n >= 10000) return (n / 10000).toFixed(1) + '万'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'k'
  return String(n)
}

const formatDateTime = (str: string) => {
  if (!str) return '-'
  const d = new Date(str)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

const formatPayType = (t: string) => {
  const map: Record<string, string> = { wechat: '微信支付', alipay: '支付宝', bank: '对公转账' }
  return map[t] || t
}

const statusText = (s: string) => {
  const map: Record<string, string> = { paid: '已支付', pending: '待支付', expired: '已过期', cancelled: '已取消', refunded: '已退款' }
  return map[s] || s
}

// 获取用量数据
const fetchUsage = async () => {
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom/usage', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      usage.value = json.data
    }
  } catch (e) {
    console.error('[WecomUsage] Fetch usage error:', e)
  }
}

// 获取订单列表
const fetchOrders = async () => {
  try {
    const token = getMemberToken()
    const params = new URLSearchParams({
      page: String(currentPage.value),
      pageSize: String(pageSize.value)
    })
    if (orderFilter.value !== 'all') {
      params.set('status', orderFilter.value)
    }
    const res = await fetch(`/api/v1/public/member/wecom/orders?${params.toString()}`, {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      orders.value = json.data.list || []
      totalOrders.value = json.data.total || 0
      orderStats.value = json.data.stats || { totalOrders: 0, totalPaid: 0, pendingCount: 0 }
    }
  } catch (e) {
    console.error('[WecomUsage] Fetch orders error:', e)
  }
}

const changePage = (page: number) => {
  currentPage.value = page
  fetchOrders()
}

onMounted(async () => {
  loading.value = true
  await Promise.all([fetchUsage(), fetchOrders()])
  loading.value = false
})
</script>

<style scoped>
.wecom-usage { max-width: 100%; }

.loading-state { text-align: center; padding: 60px 0; color: #909399; }
.spinner {
  width: 32px; height: 32px;
  border: 3px solid #e4e7ed; border-top-color: #07c160;
  border-radius: 50%; animation: spin 0.8s linear infinite;
  margin: 0 auto 12px;
}
@keyframes spin { to { transform: rotate(360deg); } }

/* 统计卡片 */
.stats-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 10px;
  padding: 16px; display: flex; align-items: flex-start; gap: 12px;
}
.stat-icon {
  width: 40px; height: 40px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.stat-icon.seats { background: #e6f7ef; }
.stat-icon.messages { background: #ecf5ff; }
.stat-icon.customers { background: #fdf6ec; }
.stat-icon.storage { background: #f0f0ff; }

.stat-body { flex: 1; min-width: 0; }
.stat-value { font-size: 22px; font-weight: 700; color: #303133; }
.stat-value span { font-size: 13px; font-weight: 400; color: #909399; }
.stat-label { font-size: 12px; color: #909399; margin: 2px 0 6px; }
.stat-sub { font-size: 11px; color: #c0c4cc; }

.stat-bar { height: 6px; background: #e4e7ed; border-radius: 3px; overflow: hidden; }
.stat-bar-inner { height: 100%; border-radius: 3px; transition: width 0.5s; }
.stat-bar-inner.normal { background: #07c160; }
.stat-bar-inner.warn { background: #e6a23c; }
.stat-bar-inner.full { background: #f56c6c; }

/* 卡片区域 */
.section-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 10px;
  padding: 20px; margin-bottom: 16px;
}
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.section-header h4 { margin: 0; font-size: 16px; font-weight: 600; color: #303133; }

.msg-stats-row { display: flex; gap: 16px; }
.msg-stat { flex: 1; text-align: center; padding: 12px; background: #f9fafb; border-radius: 8px; }
.msg-num { display: block; font-size: 22px; font-weight: 700; color: #303133; }
.msg-label { font-size: 12px; color: #909399; margin-top: 4px; }

/* 订单过滤 */
.order-filters select {
  padding: 6px 12px; border: 1px solid #dcdfe6; border-radius: 6px;
  font-size: 13px; outline: none; color: #606266; background: #fff;
}

.order-summary {
  display: flex; gap: 16px; font-size: 13px; color: #909399;
  padding-bottom: 12px; border-bottom: 1px solid #f0f0f0; margin-bottom: 12px;
}
.pending-tag { background: #fdf6ec; color: #e6a23c; padding: 1px 8px; border-radius: 4px; font-size: 12px; }

/* 订单列表 */
.order-list { display: flex; flex-direction: column; gap: 10px; }
.order-item {
  border: 1px solid #f0f0f0; border-radius: 8px; padding: 14px 16px;
  transition: background 0.2s;
}
.order-item:hover { background: #fafafa; }
.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.order-no { font-size: 14px; font-weight: 600; color: #303133; font-family: monospace; }
.order-status { font-size: 12px; padding: 2px 8px; border-radius: 4px; font-weight: 500; }
.order-status.paid { background: #e6f7ef; color: #07c160; }
.order-status.pending { background: #fdf6ec; color: #e6a23c; }
.order-status.expired { background: #f5f5f5; color: #c0c4cc; }
.order-status.cancelled { background: #f5f5f5; color: #909399; }
.order-status.refunded { background: #fef0f0; color: #f56c6c; }

.order-info-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.order-package { font-size: 13px; color: #606266; }
.order-amount { font-size: 16px; font-weight: 700; color: #303133; }
.order-meta { display: flex; gap: 16px; font-size: 12px; color: #c0c4cc; }

.empty-orders { text-align: center; padding: 40px 0; color: #c0c4cc; }
.empty-orders p { margin: 0; }

/* 分页 */
.pagination {
  display: flex; justify-content: center; align-items: center;
  gap: 12px; margin-top: 16px; padding-top: 12px; border-top: 1px solid #f0f0f0;
}
.pagination button {
  padding: 6px 14px; border: 1px solid #dcdfe6; border-radius: 6px;
  background: #fff; cursor: pointer; font-size: 13px; color: #606266;
}
.pagination button:hover:not(:disabled) { border-color: #07c160; color: #07c160; }
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.page-info { font-size: 13px; color: #909399; }

@media (max-width: 768px) {
  .stats-grid { grid-template-columns: repeat(2, 1fr); }
  .msg-stats-row { flex-wrap: wrap; }
  .msg-stat { min-width: 80px; }
}
@media (max-width: 500px) {
  .stats-grid { grid-template-columns: 1fr; }
}
</style>

