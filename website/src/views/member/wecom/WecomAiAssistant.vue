<template>
  <div class="wecom-ai-assistant">
    <!-- 标签页介绍 -->
    <div class="intro-section" v-if="activeTab === 'intro'">
      <div class="intro-hero">
        <div class="intro-icon">🤖</div>
        <h3>AI助手服务</h3>
        <p>基于大语言模型的智能客服助手，支持自动回复、智能质检、客户画像分析等能力，大幅提升企业服务效率。</p>
      </div>
      <div class="feature-grid">
        <div class="feature-card">
          <span class="f-icon">💬</span>
          <h4>智能客服</h4>
          <p>AI自动回复客户咨询，7×24小时无间断服务</p>
        </div>
        <div class="feature-card">
          <span class="f-icon">🔍</span>
          <h4>智能质检</h4>
          <p>自动检测敏感词、违规话术，实时预警</p>
        </div>
        <div class="feature-card">
          <span class="f-icon">🏷️</span>
          <h4>标签AI</h4>
          <p>根据聊天内容自动为客户打标签，精准画像</p>
        </div>
        <div class="feature-card">
          <span class="f-icon">📚</span>
          <h4>知识库</h4>
          <p>上传企业资料，AI学习后精准回答客户问题</p>
        </div>
      </div>
    </div>

    <!-- 开通与充值 -->
    <div class="section" v-if="activeTab === 'activate'">
      <h3 class="section-title">开通与充值</h3>
      <div v-if="!aiData.activated" class="activate-card">
        <div class="activate-icon">🚀</div>
        <h4>尚未开通AI助手服务</h4>
        <p>开通后即可使用智能客服、质检、标签等AI能力</p>
        <div class="plan-options">
          <div v-for="plan in plans" :key="plan.id" class="plan-card" :class="{ selected: selectedPlan === plan.id }" @click="selectedPlan = plan.id">
            <div class="plan-name">{{ plan.name }}</div>
            <div class="plan-price">¥{{ plan.price }}<span>/{{ plan.unit }}</span></div>
            <div class="plan-quota">{{ plan.quota }} 次调用</div>
            <ul class="plan-features">
              <li v-for="f in plan.features" :key="f">✅ {{ f }}</li>
            </ul>
          </div>
        </div>
        <button class="btn-primary" @click="handleActivate">立即开通</button>
      </div>
      <div v-else class="recharge-section">
        <div class="current-quota">
          <div class="quota-info">
            <span class="quota-label">当前剩余额度</span>
            <span class="quota-value">{{ aiData.remainQuota.toLocaleString() }} 次</span>
          </div>
          <div class="quota-bar">
            <div class="quota-fill" :style="{ width: Math.min((aiData.remainQuota / aiData.totalQuota) * 100, 100) + '%' }"></div>
          </div>
          <span class="quota-detail">总额度 {{ aiData.totalQuota.toLocaleString() }} 次，已使用 {{ (aiData.totalQuota - aiData.remainQuota).toLocaleString() }} 次</span>
        </div>
        <h4 style="margin-top: 24px">充值套餐</h4>
        <div class="recharge-options">
          <div v-for="pkg in rechargePkgs" :key="pkg.id" class="recharge-card" :class="{ selected: selectedRecharge === pkg.id }" @click="selectedRecharge = pkg.id">
            <div class="pkg-quota">{{ pkg.quota.toLocaleString() }} 次</div>
            <div class="pkg-price">¥{{ pkg.price }}</div>
            <div class="pkg-unit">{{ (pkg.price / pkg.quota * 100).toFixed(1) }} 分/次</div>
          </div>
        </div>
        <button class="btn-primary" @click="handleRecharge">立即充值</button>
      </div>
    </div>

    <!-- 订单记录 -->
    <div class="section" v-if="activeTab === 'orders'">
      <h3 class="section-title">订单记录</h3>
      <table class="order-table">
        <thead>
          <tr>
            <th>订单号</th>
            <th>类型</th>
            <th>额度</th>
            <th>金额</th>
            <th>状态</th>
            <th>时间</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="order in orders" :key="order.id || order.orderNo">
            <td class="order-id">{{ order.orderNo }}</td>
            <td>{{ order.packageName || 'AI额度' }}</td>
            <td>{{ (order.calls || order.quota || 0).toLocaleString() }} 次</td>
            <td class="order-amount">¥{{ Number(order.amount || order.price || 0).toFixed(2) }}</td>
            <td><span class="status-badge" :class="order.status">{{ statusLabel(order.status) }}</span></td>
            <td class="order-time">{{ order.createdAt }}</td>
          </tr>
          <tr v-if="orders.length === 0">
            <td colspan="6" class="empty-row">暂无订单记录</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- 使用概览 -->
    <div class="section" v-if="activeTab === 'usage'">
      <h3 class="section-title">使用概览</h3>
      <div class="usage-stats">
        <div class="usage-card">
          <div class="usage-num">{{ usageStats.todayCalls }}</div>
          <div class="usage-label">今日调用</div>
        </div>
        <div class="usage-card">
          <div class="usage-num">{{ usageStats.weekCalls }}</div>
          <div class="usage-label">本周调用</div>
        </div>
        <div class="usage-card">
          <div class="usage-num">{{ usageStats.monthCalls }}</div>
          <div class="usage-label">本月调用</div>
        </div>
        <div class="usage-card">
          <div class="usage-num">{{ usageStats.totalCalls.toLocaleString() }}</div>
          <div class="usage-label">累计调用</div>
        </div>
      </div>

      <!-- Token详细统计 -->
      <div class="token-stats">
        <div class="token-card">
          <div class="token-num">{{ formatTokenCount(usageStats.totalTokens) }}</div>
          <div class="token-label">总Token消耗</div>
        </div>
        <div class="token-card">
          <div class="token-num">{{ formatTokenCount(usageStats.inputTokens) }}</div>
          <div class="token-label">输入Token</div>
        </div>
        <div class="token-card">
          <div class="token-num">{{ formatTokenCount(usageStats.outputTokens) }}</div>
          <div class="token-label">输出Token</div>
        </div>
        <div class="token-card">
          <div class="token-num">¥{{ usageStats.estimatedCost }}</div>
          <div class="token-label">预估成本</div>
        </div>
      </div>

      <!-- 各模型使用明细 -->
      <div class="usage-detail-section">
        <h4>各模型使用明细</h4>
        <div class="model-breakdown">
          <div v-for="model in modelBreakdown" :key="model.name" class="model-item">
            <div class="model-header">
              <span class="model-name">🤖 {{ model.name }}</span>
              <span class="model-calls">{{ model.callCount }} 次调用</span>
            </div>
            <div class="model-tokens">
              <span>输入: {{ formatTokenCount(model.inputTokens) }}</span>
              <span>输出: {{ formatTokenCount(model.outputTokens) }}</span>
              <span>总计: {{ formatTokenCount(model.totalTokens) }}</span>
              <span class="model-duration">均耗时 {{ model.avgDuration }}ms</span>
            </div>
            <div class="model-bar-bg">
              <div class="model-bar-fill" :style="{ width: model.percent + '%', background: model.color }"></div>
            </div>
          </div>
          <div v-if="modelBreakdown.length === 0" class="empty-hint">暂无模型使用数据</div>
        </div>
      </div>

      <!-- 按功能分布 -->
      <div class="usage-detail-section">
        <h4>调用明细（按功能）</h4>
        <div class="usage-breakdown">
          <div v-for="item in usageBreakdown" :key="item.name" class="breakdown-item">
            <span class="bd-name">{{ item.icon }} {{ item.name }}</span>
            <div class="bd-bar-bg">
              <div class="bd-bar-fill" :style="{ width: item.percent + '%', background: item.color }"></div>
            </div>
            <span class="bd-count">{{ item.count }} 次</span>
            <span class="bd-pct">{{ item.percent }}%</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 支付弹窗 -->
    <div v-if="paymentDialog.visible" class="payment-overlay" @click.self="closePaymentDialog">
      <div class="payment-modal">
        <div class="pm-header">
          <h3>扫码支付</h3>
          <button class="pm-close" @click="closePaymentDialog">&times;</button>
        </div>
        <div class="pm-body">
          <p class="pm-pkg-name">{{ paymentDialog.packageName }}</p>
          <p class="pm-amount">¥{{ paymentDialog.amount }}</p>
          <div class="pm-qr" v-if="paymentDialog.qrCode">
            <img :src="paymentDialog.qrCode" alt="支付二维码" />
          </div>
          <p class="pm-hint" v-if="paymentDialog.polling">正在等待支付结果...</p>
          <p class="pm-order">订单号：{{ paymentDialog.orderNo }}</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch, onUnmounted } from 'vue'
import { getMemberToken } from '@/api/member'

const props = defineProps<{
  activeTab: string
  wecomData?: any
}>()

const loading = ref(false)
const selectedPlan = ref('')
const selectedRecharge = ref('')

const aiData = reactive({
  activated: false,
  remainQuota: 0,
  totalQuota: 0,
})

const plans = ref<any[]>([])
const rechargePkgs = computed(() => plans.value.filter((p: any) => p.price > 0))
const orders = ref<any[]>([])
const ordersLoading = ref(false)

const usageStats = reactive({
  todayCalls: 0,
  weekCalls: 0,
  monthCalls: 0,
  totalCalls: 0,
  totalTokens: 0,
  inputTokens: 0,
  outputTokens: 0,
  estimatedCost: '0',
})

const modelBreakdown = ref<any[]>([])
const modelColors = ['#4C6EF5', '#10B981', '#F59E0B', '#8B5CF6', '#EF4444', '#06B6D4']

const usageBreakdown = ref<any[]>([])

const formatTokenCount = (n: number) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

const statusLabel = (s: string) => {
  const map: Record<string, string> = { paid: '已支付', pending: '待支付', refunded: '已退款', free: '免费领取' }
  return map[s] || s
}

const apiBase = '/api/v1/public/member/wecom'
const authHeaders = () => {
  const token = getMemberToken()
  if (!token) {
    window.location.href = '/member/login'
    return { 'Content-Type': 'application/json' }
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

const fetchAiData = async () => {
  try {
    const res = await fetch(`${apiBase}/usage`, { headers: authHeaders() })
    const json = await res.json()
    if (json.code === 0 && json.data?.aiStats) {
      const ai = json.data.aiStats
      aiData.activated = ai.totalQuota > 0
      aiData.remainQuota = ai.remainingQuota || 0
      aiData.totalQuota = ai.totalQuota || 0
      usageStats.todayCalls = ai.todayCalls || 0
      usageStats.monthCalls = ai.monthCalls || 0
      usageStats.totalCalls = ai.usedQuota || 0
    }
  } catch (e) {
    console.error('[WecomAiAssistant] Fetch usage error:', e)
  }
}

const fetchPackages = async () => {
  try {
    const res = await fetch(`${apiBase}/ai/packages`, { headers: authHeaders() })
    const json = await res.json()
    if (json.success && json.data) {
      plans.value = json.data
      if (plans.value.length > 0 && !selectedPlan.value) {
        selectedPlan.value = plans.value[Math.min(2, plans.value.length - 1)]?.id || plans.value[0]?.id
      }
    }
  } catch {
    if (props.wecomData?.vasConfig?.aiPricing) {
      plans.value = props.wecomData.vasConfig.aiPricing
    }
  }
}

const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const res = await fetch(`${apiBase}/orders?page=1&pageSize=50&packageType=ai`, { headers: authHeaders() })
    const json = await res.json()
    if (json.code === 0 && json.data?.list) {
      orders.value = json.data.list
    }
  } catch (e) {
    console.error('[WecomAiAssistant] Fetch orders error:', e)
  }
  ordersLoading.value = false
}

const fetchModelUsage = async () => {
  try {
    const res = await fetch(`${apiBase}/ai/model-usage`, { headers: authHeaders() })
    const json = await res.json()
    if (json.success && json.data) {
      const total = json.data.reduce((s: number, m: any) => s + (m.callCount || 0), 0)
      modelBreakdown.value = json.data.map((m: any, i: number) => ({
        ...m,
        name: m.modelName || m.agentName || '未知',
        percent: total > 0 ? Math.round((m.callCount || 0) / total * 100) : 0,
        color: modelColors[i % modelColors.length]
      }))
      usageStats.totalTokens = json.data.reduce((s: number, m: any) => s + (m.totalTokens || 0), 0)
      usageStats.inputTokens = json.data.reduce((s: number, m: any) => s + (m.inputTokens || 0), 0)
      usageStats.outputTokens = json.data.reduce((s: number, m: any) => s + (m.outputTokens || 0), 0)
    }
  } catch { /* non-critical */ }
}

const fetchUsageBreakdown = async () => {
  try {
    const res = await fetch(`${apiBase}/ai/usage-trend?groupBy=type`, { headers: authHeaders() })
    const json = await res.json()
    if (json.success && json.data) {
      const iconMap: Record<string, string> = {
        'chat_reply': '💬', 'quality_inspect': '🔍', 'tag_auto': '🏷️',
        'knowledge_qa': '📚', 'script_rewrite': '✍️', 'customer_profile': '👤'
      }
      const nameMap: Record<string, string> = {
        'chat_reply': '智能客服', 'quality_inspect': '智能质检', 'tag_auto': '标签AI',
        'knowledge_qa': '知识库', 'script_rewrite': '话术改写', 'customer_profile': '客户画像'
      }
      const total = json.data.reduce((s: number, d: any) => s + (d.callCount || d.count || 0), 0)
      usageBreakdown.value = json.data.map((d: any, i: number) => ({
        name: nameMap[d.operationType || d.type] || d.operationType || d.type || '其他',
        icon: iconMap[d.operationType || d.type] || '🔧',
        count: d.callCount || d.count || 0,
        percent: total > 0 ? Math.round((d.callCount || d.count || 0) / total * 100) : 0,
        color: modelColors[i % modelColors.length]
      }))
    }
  } catch { /* non-critical */ }
}

const paymentDialog = reactive({
  visible: false,
  orderNo: '',
  amount: 0,
  qrCode: '',
  payUrl: '',
  packageName: '',
  polling: false,
})

const handleActivate = async () => {
  if (!selectedPlan.value) return alert('请选择一个套餐')
  const pkg = plans.value.find((p: any) => p.id === selectedPlan.value)
  if (!pkg) return
  try {
    const res = await fetch(`${apiBase}/ai/orders`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ packageId: pkg.id, packageName: pkg.name, calls: pkg.calls || pkg.quota, price: pkg.price || 0, payType: 'wechat' })
    })
    const json = await res.json()
    if (json.success) {
      if (json.data?.free || (pkg.price || 0) <= 0) {
        alert(json.message || '领取成功')
        await fetchAiData()
        await fetchOrders()
      } else if (json.data?.qrCode) {
        paymentDialog.visible = true
        paymentDialog.orderNo = json.data.orderNo
        paymentDialog.amount = json.data.amount
        paymentDialog.qrCode = json.data.qrCode
        paymentDialog.payUrl = json.data.payUrl
        paymentDialog.packageName = pkg.name || 'AI额度套餐'
        startPaymentPolling(json.data.orderNo)
      } else {
        alert(json.message || '订单创建成功')
      }
    } else {
      alert(json.message || '操作失败')
    }
  } catch (e: any) {
    alert('操作失败：' + e.message)
  }
}
const handleRecharge = handleActivate

let pollTimer: any = null
const startPaymentPolling = (orderNo: string) => {
  paymentDialog.polling = true
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const res = await fetch(`${apiBase}/order/${orderNo}`, { headers: authHeaders() })
      const json = await res.json()
      if (json.code === 0 && json.data?.status === 'paid') {
        clearInterval(pollTimer)
        pollTimer = null
        paymentDialog.polling = false
        paymentDialog.visible = false
        alert('支付成功，AI额度已到账！')
        await fetchAiData()
        await fetchOrders()
      }
    } catch { /* continue polling */ }
  }, 3000)
}

const closePaymentDialog = () => {
  paymentDialog.visible = false
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  paymentDialog.polling = false
}

watch(() => props.activeTab, (tab) => {
  if (tab === 'usage') {
    fetchModelUsage()
    fetchUsageBreakdown()
  }
})

onMounted(async () => {
  loading.value = true
  await Promise.all([fetchAiData(), fetchPackages(), fetchOrders()])
  loading.value = false
})

onUnmounted(() => {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
})
</script>

<style scoped>
.wecom-ai-assistant { }

/* 介绍 */
.intro-hero { text-align: center; padding: 40px 20px 30px; }
.intro-icon { font-size: 48px; margin-bottom: 12px; }
.intro-hero h3 { font-size: 22px; font-weight: 700; color: #1F2937; margin: 0 0 8px; }
.intro-hero p { color: #6B7280; font-size: 15px; max-width: 500px; margin: 0 auto; line-height: 1.6; }

.feature-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px; margin-top: 20px; }
.feature-card {
  padding: 20px; border: 1px solid #E5E7EB; border-radius: 12px;
  transition: all 0.2s;
}
.feature-card:hover { border-color: #6366f1; box-shadow: 0 4px 12px rgba(99,102,241,0.1); }
.f-icon { font-size: 28px; }
.feature-card h4 { font-size: 15px; font-weight: 600; color: #1F2937; margin: 8px 0 4px; }
.feature-card p { font-size: 13px; color: #6B7280; margin: 0; line-height: 1.5; }

/* 通用 */
.section { }
.section-title { font-size: 18px; font-weight: 600; color: #1F2937; margin: 0 0 20px; }

/* 开通 */
.activate-card { text-align: center; padding: 30px; }
.activate-icon { font-size: 48px; margin-bottom: 12px; }
.activate-card h4 { font-size: 18px; color: #1F2937; margin: 0 0 8px; }
.activate-card > p { color: #6B7280; font-size: 14px; margin: 0 0 24px; }

.plan-options { display: flex; gap: 16px; justify-content: center; margin-bottom: 24px; }
.plan-card {
  width: 200px; padding: 20px; border: 2px solid #E5E7EB; border-radius: 12px;
  cursor: pointer; transition: all 0.2s; text-align: center;
}
.plan-card.selected { border-color: #6366f1; background: #F5F3FF; }
.plan-name { font-size: 15px; font-weight: 600; color: #1F2937; }
.plan-price { font-size: 24px; font-weight: 700; color: #6366f1; margin: 8px 0 4px; }
.plan-price span { font-size: 13px; font-weight: 400; color: #9CA3AF; }
.plan-quota { font-size: 13px; color: #6B7280; margin-bottom: 12px; }
.plan-features { list-style: none; padding: 0; margin: 0; text-align: left; }
.plan-features li { font-size: 13px; color: #4B5563; padding: 3px 0; }

/* 充值 */
.current-quota { background: #F9FAFB; border-radius: 12px; padding: 20px; }
.quota-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
.quota-label { font-size: 14px; color: #6B7280; }
.quota-value { font-size: 22px; font-weight: 700; color: #6366f1; }
.quota-bar { height: 8px; background: #E5E7EB; border-radius: 4px; overflow: hidden; }
.quota-fill { height: 100%; background: #6366f1; border-radius: 4px; transition: width 0.3s; }
.quota-detail { font-size: 12px; color: #9CA3AF; margin-top: 6px; }

.recharge-options { display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 20px; }
.recharge-card {
  padding: 16px 20px; border: 2px solid #E5E7EB; border-radius: 10px;
  cursor: pointer; transition: all 0.2s; text-align: center; min-width: 120px;
}
.recharge-card.selected { border-color: #6366f1; background: #F5F3FF; }
.pkg-quota { font-size: 16px; font-weight: 700; color: #1F2937; }
.pkg-price { font-size: 18px; font-weight: 700; color: #6366f1; margin: 4px 0; }
.pkg-unit { font-size: 12px; color: #9CA3AF; }

.btn-primary {
  background: #6366f1; color: #fff; border: none; border-radius: 8px;
  padding: 10px 32px; font-size: 15px; font-weight: 600; cursor: pointer;
  transition: background 0.2s;
}
.btn-primary:hover { background: #4f46e5; }

/* 订单表格 */
.order-table { width: 100%; border-collapse: collapse; font-size: 14px; }
.order-table th { text-align: left; padding: 10px 12px; background: #F9FAFB; color: #6B7280; font-weight: 600; border-bottom: 1px solid #E5E7EB; }
.order-table td { padding: 12px; border-bottom: 1px solid #F3F4F6; color: #4B5563; }
.order-id { font-family: monospace; font-size: 12px; }
.order-amount { font-weight: 600; color: #EF4444; }
.order-time { font-size: 13px; color: #9CA3AF; }
.empty-row { text-align: center; color: #9CA3AF; padding: 40px 0 !important; }
.status-badge { padding: 2px 8px; border-radius: 10px; font-size: 12px; font-weight: 600; }
.status-badge.paid { background: #ECFDF5; color: #10B981; }
.status-badge.pending { background: #FFFBEB; color: #D97706; }
.status-badge.refunded { background: #F3F4F6; color: #6B7280; }

/* 使用概览 */
.usage-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.usage-card { text-align: center; padding: 20px; background: #F9FAFB; border-radius: 12px; }
.usage-num { font-size: 24px; font-weight: 700; color: #6366f1; }
.usage-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

/* Token统计 */
.token-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px; }
.token-card { text-align: center; padding: 14px; background: #EEF2FF; border-radius: 10px; border: 1px solid #E0E7FF; }
.token-num { font-size: 18px; font-weight: 700; color: #4338CA; }
.token-label { font-size: 11px; color: #6366f1; margin-top: 3px; }

/* 模型明细 */
.model-breakdown { display: flex; flex-direction: column; gap: 14px; }
.model-item { padding: 12px; background: #F9FAFB; border-radius: 10px; border: 1px solid #F3F4F6; }
.model-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; }
.model-name { font-size: 14px; font-weight: 600; color: #1F2937; }
.model-calls { font-size: 13px; color: #6B7280; }
.model-tokens { display: flex; gap: 12px; font-size: 12px; color: #6B7280; margin-bottom: 8px; flex-wrap: wrap; }
.model-duration { color: #9CA3AF; }
.model-bar-bg { height: 6px; background: #E5E7EB; border-radius: 3px; overflow: hidden; }
.model-bar-fill { height: 100%; border-radius: 3px; transition: width 0.4s; }
.empty-hint { text-align: center; color: #9CA3AF; padding: 20px 0; font-size: 14px; }

.usage-detail-section h4 { font-size: 15px; font-weight: 600; color: #1F2937; margin: 0 0 12px; }
.usage-breakdown { display: flex; flex-direction: column; gap: 12px; }
.breakdown-item { display: flex; align-items: center; gap: 10px; }
.bd-name { width: 100px; font-size: 13px; color: #4B5563; flex-shrink: 0; }
.bd-bar-bg { flex: 1; height: 18px; background: #F3F4F6; border-radius: 9px; overflow: hidden; }
.bd-bar-fill { height: 100%; border-radius: 9px; transition: width 0.4s; }
.bd-count { width: 70px; font-size: 13px; color: #4B5563; text-align: right; }
.bd-pct { width: 40px; font-size: 13px; font-weight: 600; color: #1F2937; text-align: right; }

/* 支付弹窗 */
.payment-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 2000;
}
.payment-modal {
  background: #fff; border-radius: 16px; width: 380px; max-width: 90vw; overflow: hidden;
  box-shadow: 0 20px 60px rgba(0,0,0,0.2);
}
.pm-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; border-bottom: 1px solid #F3F4F6;
}
.pm-header h3 { margin: 0; font-size: 16px; color: #1F2937; }
.pm-close {
  background: none; border: none; font-size: 22px; color: #9CA3AF; cursor: pointer;
  line-height: 1; padding: 0;
}
.pm-close:hover { color: #4B5563; }
.pm-body { padding: 24px 20px; text-align: center; }
.pm-pkg-name { font-size: 15px; color: #4B5563; margin: 0 0 8px; }
.pm-amount { font-size: 28px; font-weight: 700; color: #EF4444; margin: 0 0 20px; }
.pm-qr { margin: 0 auto 16px; }
.pm-qr img { width: 200px; height: 200px; border: 1px solid #E5E7EB; border-radius: 8px; }
.pm-hint { font-size: 13px; color: #6366f1; margin: 0 0 8px; animation: pulse 1.5s infinite; }
.pm-order { font-size: 12px; color: #9CA3AF; margin: 0; }
@keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.5; } }

@media (max-width: 600px) {
  .feature-grid, .usage-stats { grid-template-columns: 1fr 1fr; }
  .plan-options { flex-direction: column; align-items: center; }
}
</style>

