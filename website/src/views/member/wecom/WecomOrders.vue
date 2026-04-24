<template>
  <div class="wecom-orders">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <select v-model="filter.packageType" class="filter-select" @change="fetchOrders">
        <option value="all">全部类型</option>
        <option value="archive">会话存档</option>
        <option value="ai">AI额度</option>
      </select>
      <select v-model="filter.status" class="filter-select" @change="fetchOrders">
        <option value="">全部状态</option>
        <option value="paid">已支付</option>
        <option value="pending">待支付</option>
        <option value="refunded">已退款</option>
        <option value="cancelled">已取消</option>
      </select>
      <input v-model="filter.keyword" class="filter-input" placeholder="搜索订单号" @keyup.enter="fetchOrders" />
    </div>

    <!-- 订单列表 -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>加载中...</p>
    </div>

    <div v-else-if="orders.length === 0" class="empty-state">
      <div class="empty-icon">📋</div>
      <p>暂无订单记录</p>
    </div>

    <div v-else class="order-list">
      <div v-for="order in orders" :key="order.id" class="order-card">
        <div class="order-header">
          <span class="order-no">{{ order.orderNo }}</span>
          <span class="order-status" :class="'status-' + order.status">{{ statusLabels[order.status] || order.status }}</span>
        </div>
        <div class="order-body">
          <div class="order-info">
            <div class="order-type">
              <span class="type-tag" :class="'type-' + order.type">{{ typeLabels[order.type] || order.type }}</span>
              <span class="order-name">{{ order.packageName }}</span>
            </div>
            <div class="order-detail">
              <span v-if="order.quantity">数量: {{ order.quantity }}</span>
              <span v-if="order.duration">时长: {{ order.duration }}</span>
            </div>
          </div>
          <div class="order-price">
            <div class="price-amount">¥{{ Number(order.amount || 0).toFixed(2) }}</div>
            <div class="price-time">{{ formatDate(order.createdAt) }}</div>
          </div>
        </div>
        <div v-if="order.status === 'pending'" class="order-actions">
          <button class="btn-pay" @click="handlePay(order)">立即支付</button>
          <button class="btn-cancel" @click="handleCancel(order)">取消订单</button>
        </div>
      </div>
    </div>

    <!-- 分页 -->
    <div v-if="total > pageSize" class="pagination">
      <button :disabled="page <= 1" @click="page--; fetchOrders()">上一页</button>
      <span>第 {{ page }} 页 / 共 {{ Math.ceil(total / pageSize) }} 页</span>
      <button :disabled="page * pageSize >= total" @click="page++; fetchOrders()">下一页</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMemberToken } from '@/api/member'

const loading = ref(false)
const orders = ref<any[]>([])
const total = ref(0)
const page = ref(1)
const pageSize = 20
const filter = ref({ packageType: 'all', status: '', keyword: '' })

const statusLabels: Record<string, string> = {
  paid: '已支付', pending: '待支付', refunded: '已退款', cancelled: '已取消'
}
const typeLabels: Record<string, string> = {
  archive: '会话存档', ai: 'AI额度'
}

const formatDate = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}

const fetchOrders = async () => {
  loading.value = true
  try {
    const token = getMemberToken()
    const params = new URLSearchParams()
    params.set('page', String(page.value))
    params.set('pageSize', String(pageSize))
    if (filter.value.packageType) params.set('packageType', filter.value.packageType)
    if (filter.value.status) params.set('status', filter.value.status)
    if (filter.value.keyword) params.set('keyword', filter.value.keyword)

    const res = await fetch(`/api/v1/public/member/wecom/orders?${params}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
    const json = await res.json()
    if (json.code === 0) {
      orders.value = json.data?.list || json.data || []
      total.value = json.data?.total || orders.value.length
    }
  } catch (e) {
    console.error('[WecomOrders] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const handlePay = (order: any) => {
  alert(`支付订单: ${order.orderNo}`)
}

const handleCancel = (order: any) => {
  if (confirm(`确定取消订单 ${order.orderNo}？`)) {
    alert('取消功能开发中')
  }
}

onMounted(fetchOrders)
</script>

<style scoped>
.wecom-orders { max-width: 800px; }

.filter-bar { display: flex; gap: 8px; margin-bottom: 16px; flex-wrap: wrap; }
.filter-select, .filter-input {
  padding: 8px 12px; border: 1px solid #dcdfe6; border-radius: 8px;
  font-size: 14px; outline: none; background: #fff;
}
.filter-select { min-width: 120px; }
.filter-input { min-width: 160px; }
.filter-select:focus, .filter-input:focus { border-color: #07c160; }

.loading-state { text-align: center; padding: 60px 0; color: #909399; }
.spinner { width: 28px; height: 28px; border: 3px solid #e4e7ed; border-top-color: #07c160; border-radius: 50%; animation: spin 0.8s linear infinite; margin: 0 auto 12px; }
@keyframes spin { to { transform: rotate(360deg); } }

.empty-state { text-align: center; padding: 80px 0; color: #c0c4cc; }
.empty-icon { font-size: 48px; margin-bottom: 8px; }

.order-list { display: flex; flex-direction: column; gap: 12px; }
.order-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 12px;
  padding: 16px; transition: box-shadow 0.2s;
}
.order-card:hover { box-shadow: 0 2px 12px rgba(0,0,0,0.06); }

.order-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; }
.order-no { font-size: 13px; color: #909399; font-family: monospace; }
.order-status { font-size: 12px; padding: 2px 10px; border-radius: 10px; font-weight: 600; }
.status-paid { background: #e6f7ef; color: #07c160; }
.status-pending { background: #fdf6ec; color: #e6a23c; }
.status-refunded { background: #f0f0f0; color: #909399; }
.status-cancelled { background: #fef0f0; color: #f56c6c; }

.order-body { display: flex; justify-content: space-between; align-items: center; }
.order-info { flex: 1; }
.order-type { display: flex; align-items: center; gap: 8px; margin-bottom: 4px; }
.type-tag { font-size: 11px; padding: 1px 8px; border-radius: 6px; font-weight: 600; }
.type-wecom_package { background: #e8f4fd; color: #409eff; }
.type-chat_archive { background: #e6f7ef; color: #07c160; }
.type-ai_quota { background: #f3f0ff; color: #7C3AED; }
.type-acquisition { background: #fff7e6; color: #e6a23c; }
.order-name { font-size: 15px; font-weight: 600; color: #303133; }
.order-detail { font-size: 12px; color: #909399; display: flex; gap: 12px; }

.order-price { text-align: right; }
.price-amount { font-size: 18px; font-weight: 700; color: #f56c6c; }
.price-time { font-size: 12px; color: #c0c4cc; margin-top: 2px; }

.order-actions { display: flex; gap: 8px; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f0f0f0; }
.btn-pay {
  padding: 8px 24px; background: #07c160; color: #fff; border: none;
  border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer;
}
.btn-pay:hover { background: #06ad56; }
.btn-cancel {
  padding: 8px 16px; background: #fff; color: #909399; border: 1px solid #dcdfe6;
  border-radius: 8px; font-size: 14px; cursor: pointer;
}
.btn-cancel:hover { border-color: #f56c6c; color: #f56c6c; }

.pagination { display: flex; justify-content: center; align-items: center; gap: 16px; margin-top: 20px; }
.pagination button {
  padding: 6px 16px; border: 1px solid #dcdfe6; border-radius: 6px;
  background: #fff; cursor: pointer; font-size: 13px;
}
.pagination button:disabled { opacity: 0.4; cursor: not-allowed; }
.pagination span { font-size: 13px; color: #909399; }
</style>

