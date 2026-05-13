<template>
  <div class="sidebar-portrait">
    <!-- 综合评分卡片 -->
    <div class="info-card score-card">
      <div class="score-header">
        <div class="score-circle" :style="{ '--score-color': scoreColor }">
          <span class="score-num">{{ finalScore }}</span>
          <span class="score-unit">分</span>
        </div>
        <div class="score-info">
          <div class="score-label">{{ finalScoreLabel }}</div>
          <div class="score-desc">{{ finalScoreDesc }}</div>
        </div>
      </div>
      <!-- 手动星评 -->
      <div class="star-rating">
        <span class="star-label">手动评级：</span>
        <span v-for="i in 5" :key="i" class="star" :class="{ filled: i <= manualStar }" @click="manualStar = i === manualStar ? 0 : i">★</span>
        <span v-if="manualStar > 0" class="star-reset" @click="manualStar = 0">重置</span>
      </div>
    </div>

    <!-- 雷达图 -->
    <div class="info-card">
      <div class="section-title">📊 能力画像</div>
      <div class="radar-wrap">
        <svg viewBox="0 0 200 180" class="radar-svg">
          <!-- 背景网格 -->
          <polygon v-for="level in 4" :key="'bg'+level" :points="radarBgPoints(level)" fill="none" stroke="#e8e8e8" stroke-width="0.5" />
          <!-- 轴线 -->
          <line v-for="i in 5" :key="'ax'+i" x1="100" y1="85" :x2="radarAxisPoint(i-1).x" :y2="radarAxisPoint(i-1).y" stroke="#e8e8e8" stroke-width="0.5" />
          <!-- 数据区域 -->
          <polygon :points="radarDataPoints" fill="rgba(7,193,96,.2)" stroke="#07c160" stroke-width="1.5" />
          <!-- 数据点 -->
          <circle v-for="(dim, i) in radarDimensions" :key="'pt'+i" :cx="radarDataPoint(i).x" :cy="radarDataPoint(i).y" r="3" :fill="dim.color" />
          <!-- 标签 -->
          <text v-for="(dim, i) in radarDimensions" :key="'lb'+i" :x="radarLabelPoint(i).x" :y="radarLabelPoint(i).y" text-anchor="middle" font-size="10" fill="#606266">{{ dim.label }}</text>
        </svg>
      </div>
      <!-- 维度条 -->
      <div class="dimension-bars">
        <div v-for="dim in radarDimensions" :key="dim.label" class="dim-bar">
          <span class="dim-label">{{ dim.label }}</span>
          <div class="dim-track">
            <div class="dim-fill" :style="{ width: dim.value + '%', background: dim.color }"></div>
          </div>
          <span class="dim-val">{{ dim.value }}</span>
        </div>
      </div>
    </div>

    <!-- 消费趋势 -->
    <div class="info-card">
      <div class="section-title">📈 近6月消费趋势</div>
      <div class="trend-chart">
        <svg viewBox="0 0 240 70" class="trend-svg">
          <path v-if="trendCurve" :d="trendCurve" fill="none" stroke="#07c160" stroke-width="1.5" />
          <polygon v-if="trendAreaPoints" :points="trendAreaPoints" fill="rgba(7,193,96,.1)" />
          <circle v-for="(dot, i) in trendDots" :key="i" :cx="dot.x" :cy="dot.y" r="2.5" fill="#07c160" />
        </svg>
        <div class="trend-labels">
          <span v-for="m in orderTrend" :key="m.label">{{ m.label }}</span>
        </div>
      </div>
    </div>

    <!-- 关键指标 -->
    <div class="info-card">
      <div class="section-title">📋 关键指标</div>
      <div class="metrics-grid">
        <div class="metric-item">
          <div class="metric-value">{{ custData?.orderCount || 0 }}</div>
          <div class="metric-label">总订单</div>
        </div>
        <div class="metric-item">
          <div class="metric-value metric-amount">¥{{ formatAmount(custData?.totalAmount) }}</div>
          <div class="metric-label">总消费</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">¥{{ portraitAvgOrder }}</div>
          <div class="metric-label">客单价</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ lastOrderDays }}</div>
          <div class="metric-label">最后下单</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ tenureDays }}天</div>
          <div class="metric-label">客户年龄</div>
        </div>
        <div class="metric-item">
          <div class="metric-value">{{ portraitData.chatCount }}</div>
          <div class="metric-label">聊天数</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'

const props = defineProps<{ customerData: any }>()

const manualStar = ref(0)

const custData = computed(() => {
  if (!props.customerData) return null
  return {
    orderCount: props.customerData.stats?.orderCount || 0,
    totalAmount: props.customerData.stats?.totalAmount || 0,
    lastOrderTime: props.customerData.stats?.lastOrderTime || null,
    createdAt: props.customerData.crmCustomer?.createdAt || props.customerData.wecomCustomer?.addTime || null,
    wecomAddTime: props.customerData.wecomCustomer?.addTime || null,
    chatCount: props.customerData.crmCustomer?.chatCount || 0,
    replyRate: props.customerData.crmCustomer?.replyRate || '0',
    avgReplyTime: props.customerData.crmCustomer?.avgReplyTime || '-',
    afterSalesCount: props.customerData.crmCustomer?.afterSalesCount || 0,
    followUpCount: props.customerData.crmCustomer?.followUpCount || 0,
    level: props.customerData.crmCustomer?.level || ''
  }
})

const portraitData = ref<any>({ chatCount: 0, addDays: 0, replyRate: '-', avgReplyTime: '-', afterSalesCount: 0, followUpCount: 0 })

watch(custData, (d) => {
  if (!d) return
  const addTime = d.wecomAddTime || d.createdAt
  const addDays = addTime ? Math.max(1, Math.floor((Date.now() - new Date(addTime).getTime()) / 86400000)) : 0
  portraitData.value = { chatCount: d.chatCount || 0, addDays, replyRate: d.replyRate || '-', avgReplyTime: d.avgReplyTime || '-', afterSalesCount: d.afterSalesCount || 0, followUpCount: d.followUpCount || 0 }
}, { immediate: true })

const tenureDays = computed(() => {
  const t = custData.value?.createdAt || custData.value?.wecomAddTime
  return t ? Math.max(1, Math.floor((Date.now() - new Date(t).getTime()) / 86400000)) : 1
})

const portraitAvgOrder = computed(() => {
  const cnt = custData.value?.orderCount || 0
  const amt = custData.value?.totalAmount || 0
  return cnt > 0 ? (amt / cnt).toFixed(0) : '0'
})

const lastOrderDaysNum = computed(() => {
  const t = custData.value?.lastOrderTime
  if (!t) return 999
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000)
})

const lastOrderDays = computed(() => {
  const d = lastOrderDaysNum.value
  if (d >= 999) return '-'
  if (d === 0) return '今天'
  return d + '天前'
})

// ========== 评分计算 ==========
const radarDimensions = computed(() => {
  const cnt = custData.value?.orderCount || 0
  const amt = custData.value?.totalAmount || 0
  const days = lastOrderDaysNum.value
  const chat = portraitData.value.chatCount || 0
  const followUp = portraitData.value.followUpCount || 0
  const tenure = tenureDays.value
  const avgOrd = cnt > 0 ? amt / cnt : 0
  const level = custData.value?.level || ''
  const afterSales = portraitData.value.afterSalesCount || 0

  const spendBase = amt > 0 ? Math.min(70, Math.round(Math.log10(amt + 1) * 20)) : 0
  const avgBonus = avgOrd > 500 ? 20 : avgOrd > 200 ? 15 : avgOrd > 50 ? 10 : 0
  const spendPower = Math.min(100, spendBase + avgBonus + (cnt >= 5 ? 10 : 0))

  const monthsActive = Math.max(1, tenure / 30)
  const freq = cnt / monthsActive
  const repurchase = Math.min(100, Math.round(
    (freq >= 2 ? 50 : freq >= 1 ? 35 : freq >= 0.5 ? 20 : freq > 0 ? 10 : 0) +
    (cnt >= 10 ? 30 : cnt >= 5 ? 20 : cnt >= 3 ? 15 : cnt >= 1 ? 5 : 0) +
    (cnt >= 2 && days < 30 ? 20 : 0)
  ))

  const recencyScore = days < 7 ? 40 : days < 14 ? 32 : days < 30 ? 24 : days < 60 ? 15 : days < 90 ? 8 : 3
  const chatRecency = chat > 0 ? Math.min(30, Math.round(Math.sqrt(chat) * 5)) : 0
  const followBonusVal = followUp > 0 ? Math.min(30, followUp * 5) : 0
  const activity = Math.min(100, recencyScore + chatRecency + followBonusVal)

  const chatScoreVal = Math.min(40, Math.round(Math.sqrt(chat) * 6))
  const followScoreVal = Math.min(30, followUp * 6)
  const replyStr = String(portraitData.value.replyRate || '0')
  const replyPct = parseFloat(replyStr) || 0
  const replyScoreVal = Math.min(30, Math.round(replyPct * 0.3))
  const interaction = Math.min(100, chatScoreVal + followScoreVal + replyScoreVal)

  const tenureScore = tenure > 365 ? 30 : tenure > 180 ? 22 : tenure > 90 ? 15 : tenure > 30 ? 8 : 3
  const loyalRepurchase = cnt >= 5 ? 25 : cnt >= 3 ? 18 : cnt >= 2 ? 12 : cnt >= 1 ? 5 : 0
  const levelBonus = (level === 'svip' || level === 'diamond') ? 20 : (level === 'vip' || level === 'platinum') ? 15 : (level === 'gold' || level === 'important') ? 10 : level === 'silver' ? 5 : 0
  const recentBonus = days < 30 ? 15 : days < 60 ? 8 : 0
  const afterSalesPenalty = afterSales > 3 ? 15 : afterSales > 1 ? 8 : 0
  const loyalty = Math.min(100, Math.max(0, tenureScore + loyalRepurchase + levelBonus + recentBonus - afterSalesPenalty + (amt > 2000 ? 10 : 0)))

  return [
    { label: '消费力', value: spendPower, color: '#ef5350' },
    { label: '复购率', value: repurchase, color: '#42a5f5' },
    { label: '活跃度', value: activity, color: '#66bb6a' },
    { label: '互动量', value: interaction, color: '#ffa726' },
    { label: '忠诚度', value: loyalty, color: '#ab47bc' }
  ]
})

const portraitScore = computed(() => {
  const dims = radarDimensions.value
  const weights = [0.30, 0.25, 0.20, 0.10, 0.15]
  let score = 0
  for (let i = 0; i < dims.length; i++) { score += dims[i].value * weights[i] }
  return Math.min(100, Math.round(score))
})

const finalScore = computed(() => manualStar.value > 0 ? manualStar.value * 20 : portraitScore.value)
const finalScoreLabel = computed(() => {
  const s = finalScore.value
  return s >= 90 ? '顶级客户' : s >= 80 ? '优质客户' : s >= 60 ? '潜力客户' : s >= 40 ? '一般客户' : s >= 20 ? '待激活客户' : '新客户'
})
const finalScoreDesc = computed(() => {
  const s = finalScore.value
  if (manualStar.value > 0) {
    const descs: Record<number, string> = {
      1: '评级较低，需重点关注客户需求和满意度',
      2: '尚有提升空间，建议加强沟通和服务',
      3: '中等水平，客户关系稳定，可挖掘潜力',
      4: '表现良好，高价值客户，需持续维护',
      5: '极高评价，核心客户，提供VIP级服务'
    }
    return '手动评分 ' + manualStar.value + ' 星 · ' + (descs[manualStar.value] || '')
  }
  if (s >= 90) return '消费力强、复购率高、互动活跃，核心客户需重点维护'
  if (s >= 80) return '消费稳定、粘性较高，有潜力升级为顶级客户'
  if (s >= 60) return '有一定消费基础，可通过精准营销提升价值'
  if (s >= 40) return '消费一般，建议加强跟进和互动频率'
  if (s >= 20) return '消费较少或长期未活跃，需激活唤醒'
  return '新客户或无消费记录，建议建立初步联系'
})
const scoreColor = computed(() => {
  const s = finalScore.value
  return s >= 80 ? '#07c160' : s >= 60 ? '#1989fa' : s >= 40 ? '#e6a23c' : '#909399'
})

// ========== 雷达图计算 ==========
const radarAngle = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2
const radarBgPoints = (level: number) => {
  const r = (level / 4) * 65
  return Array.from({ length: 5 }, (_, i) => { const a = radarAngle(i); return (100 + r * Math.cos(a)) + ',' + (85 + r * Math.sin(a)) }).join(' ')
}
const radarAxisPoint = (i: number) => { const a = radarAngle(i); return { x: 100 + 65 * Math.cos(a), y: 85 + 65 * Math.sin(a) } }
const radarDataPoint = (i: number) => { const a = radarAngle(i); const r = (radarDimensions.value[i].value / 100) * 65; return { x: 100 + r * Math.cos(a), y: 85 + r * Math.sin(a) } }
const radarDataPoints = computed(() => Array.from({ length: 5 }, (_, i) => { const p = radarDataPoint(i); return p.x + ',' + p.y }).join(' '))
const radarLabelPoint = (i: number) => { const a = radarAngle(i); return { x: 100 + 78 * Math.cos(a), y: 88 + 78 * Math.sin(a) } }

// ========== 消费趋势 ==========
const orderTrend = computed(() => {
  const now = new Date()
  const months: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: (d.getMonth() + 1) + '月', amount: 0 })
  }
  const orders = props.customerData?.orders || []
  for (const o of orders) {
    const od = new Date(o.createdAt || o.createTime || o.orderDate)
    for (let i = 0; i < months.length; i++) {
      const md = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const mdNext = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
      if (od >= md && od < mdNext) months[i].amount += Number(o.finalAmount || o.totalAmount || 0)
    }
  }
  return months
})

const trendDots = computed(() => {
  const data = orderTrend.value
  if (data.length < 2) return []
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => ({ x: (i / (data.length - 1)) * 230 + 5, y: 55 - (d.amount / maxVal) * 45 }))
})

const trendCurve = computed(() => {
  const pts = trendDots.value
  if (pts.length < 2) return ''
  let d = 'M' + pts[0].x + ',' + pts[0].y
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2
    d += ' C' + cx + ',' + pts[i].y + ' ' + cx + ',' + pts[i + 1].y + ' ' + pts[i + 1].x + ',' + pts[i + 1].y
  }
  return d
})

const trendAreaPoints = computed(() => {
  const data = orderTrend.value
  if (data.length < 2) return ''
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  const pts = data.map((d, i) => {
    const x = (i / (data.length - 1)) * 230 + 5
    const y = 55 - (d.amount / maxVal) * 45
    return x + ',' + y
  })
  return pts.join(' ') + ' 235,55 5,55'
})

const formatAmount = (v: any) => {
  const n = Number(v || 0)
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toFixed(2)
}
</script>

<style scoped>
.sidebar-portrait { padding: 0 0 12px; background: #f5f6f7; }
.info-card { background: #fff; border-radius: 8px; padding: 12px; margin: 8px 12px; }
.section-title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 10px; }
.score-card { text-align: center; }
.score-header { display: flex; align-items: center; gap: 16px; justify-content: center; }
.score-circle { width: 64px; height: 64px; border-radius: 50%; background: linear-gradient(135deg, var(--score-color, #07c160) 0%, rgba(7,193,96,.6) 100%); display: flex; flex-direction: column; align-items: center; justify-content: center; color: #fff; }
.score-num { font-size: 22px; font-weight: 700; line-height: 1; }
.score-unit { font-size: 10px; opacity: .8; }
.score-info { text-align: left; }
.score-label { font-size: 16px; font-weight: 700; color: #303133; }
.score-desc { font-size: 11px; color: #909399; margin-top: 4px; line-height: 1.4; max-width: 200px; }
.star-rating { margin-top: 10px; display: flex; align-items: center; justify-content: center; gap: 4px; }
.star-label { font-size: 12px; color: #909399; }
.star { font-size: 20px; color: #dcdfe6; cursor: pointer; transition: color .2s; }
.star.filled { color: #f7ba2a; }
.star-reset { font-size: 11px; color: #909399; cursor: pointer; margin-left: 8px; }
.radar-wrap { display: flex; justify-content: center; }
.radar-svg { width: 200px; height: 180px; }
.dimension-bars { margin-top: 8px; }
.dim-bar { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.dim-label { font-size: 11px; color: #606266; width: 40px; text-align: right; flex-shrink: 0; }
.dim-track { flex: 1; height: 6px; background: #f0f2f5; border-radius: 3px; overflow: hidden; }
.dim-fill { height: 100%; border-radius: 3px; transition: width .6s ease; }
.dim-val { font-size: 11px; color: #303133; width: 28px; text-align: right; flex-shrink: 0; }
.trend-chart { position: relative; }
.trend-svg { width: 100%; height: 70px; }
.trend-labels { display: flex; justify-content: space-between; padding: 0 5px; font-size: 10px; color: #909399; }
.metrics-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
.metric-item { text-align: center; padding: 8px 4px; background: #f9fafb; border-radius: 6px; }
.metric-value { font-size: 16px; font-weight: 700; color: #303133; }
.metric-value.metric-amount { color: #f56c6c; font-size: 14px; }
.metric-label { font-size: 11px; color: #909399; margin-top: 2px; }
</style>
