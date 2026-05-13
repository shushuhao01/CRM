<template>
  <div class="sidebar-portrait">
    <!-- 1. 头部卡片 -->
    <div class="preview-card customer-header">
      <div class="customer-head">
        <span class="avatar-circle">👤</span>
        <div>
          <div class="customer-name">{{ crmCustomer?.name || customerData?.wecomCustomer?.name || '企微客户' }}</div>
          <div style="margin-top:3px">
            <span v-if="crmCustomer?.id" class="mini-tag" style="background:#e8f5e9;color:#4caf50">已关联CRM</span>
            <span v-else class="mini-tag" style="background:#fff3e0;color:#ff9800">未关联CRM</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 2. 客户综合评分卡 -->
    <div class="preview-card">
      <div class="card-title">⭐ 客户综合评分</div>
      <div class="score-section">
        <div class="score-ring">
          <svg viewBox="0 0 80 80" width="64" height="64">
            <circle cx="40" cy="40" r="34" fill="none" stroke="#f0f0f0" stroke-width="6" />
            <circle cx="40" cy="40" r="34" fill="none"
              :stroke="scoreRingColor" stroke-width="6" stroke-linecap="round"
              :stroke-dasharray="(finalScore / 100) * 213.6 + ' 213.6'"
              transform="rotate(-90 40 40)" />
            <text x="40" y="44" text-anchor="middle" font-size="16" font-weight="700"
              :fill="scoreTextColor">{{ finalScore }}</text>
          </svg>
        </div>
        <div style="flex:1">
          <div style="font-size:14px;font-weight:700;color:#303133">{{ finalScoreLabel }}</div>
          <div style="font-size:10px;color:#909399;margin-top:3px;line-height:1.4">{{ finalScoreDesc }}</div>
        </div>
      </div>
      <div class="star-row">
        <span style="font-size:11px;color:#909399">手动评分：</span>
        <span v-for="s in 5" :key="s" class="star-btn" :class="{ active: s <= manualStar }"
          @click="manualStar = manualStar === s ? 0 : s">★</span>
        <span style="font-size:10px;color:#bdbdbd;margin-left:4px">
          {{ manualStar > 0 ? manualStar + '/5' : '未评（点击评分）' }}
        </span>
      </div>
    </div>

    <!-- 3. 消费分析卡 -->
    <div class="preview-card">
      <div class="card-title">💰 消费分析</div>
      <div class="portrait-grid">
        <div class="portrait-metric">
          <div class="metric-val" style="color:#ef5350">¥{{ formatAmount(stats.totalAmount) }}</div>
          <div class="metric-lbl">累计消费</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-val" style="color:#42a5f5">{{ stats.orderCount }}</div>
          <div class="metric-lbl">订单总数</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-val" style="color:#ab47bc">¥{{ avgOrderAmount }}</div>
          <div class="metric-lbl">客单价</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-val" style="color:#26a69a">{{ lastOrderDaysText }}</div>
          <div class="metric-lbl">距上次购买</div>
        </div>
      </div>
      <div v-if="orderTrend.length > 1" style="margin-top:8px;position:relative">
        <div style="font-size:10px;color:#909399;margin-bottom:4px">消费趋势</div>
        <svg viewBox="0 0 240 65" width="100%" height="65" style="overflow:visible"
          @mouseleave="trendHoverIdx = -1">
          <defs>
            <linearGradient id="spTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stop-color="#42a5f5" stop-opacity="0.2" />
              <stop offset="100%" stop-color="#42a5f5" stop-opacity="0.01" />
            </linearGradient>
          </defs>
          <polygon :points="trendAreaPath" fill="url(#spTrendGrad)" />
          <path :d="trendCurvePath" fill="none" stroke="#42a5f5" stroke-width="2" stroke-linecap="round" />
          <template v-for="(p, i) in trendDots" :key="'td'+i">
            <circle :cx="p.x" :cy="p.y" r="10" fill="transparent"
              @mouseenter="trendHoverIdx = i" style="cursor:pointer" />
            <circle :cx="p.x" :cy="p.y"
              :r="trendHoverIdx === i ? 4.5 : 3"
              :fill="trendHoverIdx === i ? '#1e88e5' : '#42a5f5'"
              :stroke="trendHoverIdx === i ? '#fff' : 'none'"
              :stroke-width="trendHoverIdx === i ? 1.5 : 0"
              style="transition:all .15s;pointer-events:none" />
          </template>
          <template v-if="trendHoverIdx >= 0 && trendDots[trendHoverIdx]">
            <rect :x="trendDots[trendHoverIdx].x - 30" :y="trendDots[trendHoverIdx].y - 22"
              width="60" height="16" rx="3" fill="#303133" opacity="0.88" />
            <text :x="trendDots[trendHoverIdx].x" :y="trendDots[trendHoverIdx].y - 11"
              text-anchor="middle" font-size="9" font-weight="600" fill="#fff">
              {{ orderTrend[trendHoverIdx].label }} ¥{{ orderTrend[trendHoverIdx].amount }}
            </text>
          </template>
        </svg>
        <div style="display:flex;justify-content:space-between;font-size:9px;color:#bdbdbd">
          <span v-for="(m, i) in orderTrend" :key="i"
            :style="{ fontWeight: trendHoverIdx === i ? '700' : '400', color: trendHoverIdx === i ? '#42a5f5' : '#bdbdbd' }">
            {{ m.label }}
          </span>
        </div>
      </div>
    </div>

    <!-- 4. 客户属性卡 -->
    <div class="preview-card">
      <div class="card-title">📋 客户属性</div>
      <div class="info-row"><span class="label">姓名</span><span>{{ crmCustomer?.name || '-' }}</span></div>
      <div class="info-row"><span class="label">性别</span><span>{{ genderText }}</span></div>
      <div class="info-row"><span class="label">年龄</span><span>{{ crmCustomer?.age ? crmCustomer.age + '岁' : '-' }}</span></div>
      <div class="info-row"><span class="label">来源</span><span>{{ transSource(crmCustomer?.source) }}</span></div>
      <div class="info-row"><span class="label">等级</span><span class="tag">{{ transLevel(crmCustomer?.level) }}</span></div>
      <div class="info-row"><span class="label">状态</span><span>{{ transFollowStatus(crmCustomer?.followStatus) }}</span></div>
      <div class="info-row"><span class="label">地址</span><span>{{ parseLatestContent(crmCustomer?.address) || '-' }}</span></div>
      <div class="info-row"><span class="label">疾病史</span><span>{{ parseLatestContent(crmCustomer?.medicalHistory) || '-' }}</span></div>
    </div>

    <!-- 5. 多维度评估卡 -->
    <div class="preview-card">
      <div class="card-title">🎯 多维度评估</div>
      <div style="text-align:center;padding:4px 0">
        <svg viewBox="0 0 200 180" width="180" height="160">
          <polygon v-for="n in 4" :key="'bg'+n" :points="radarBgPoints(n)"
            fill="none" :stroke="n === 4 ? '#e0e0e0' : '#f5f5f5'" stroke-width="1" />
          <line v-for="(_, i) in radarDims" :key="'ax'+i" x1="100" y1="85"
            :x2="radarAxisPt(i).x" :y2="radarAxisPt(i).y" stroke="#f0f0f0" stroke-width="1" />
          <polygon :points="radarDataPoints" fill="rgba(102,187,106,0.15)" stroke="#66bb6a" stroke-width="2" />
          <circle v-for="(_, i) in radarDims" :key="'dot'+i"
            :cx="radarDataPt(i).x" :cy="radarDataPt(i).y" r="3" fill="#66bb6a" />
          <text v-for="(d, i) in radarDims" :key="'lbl'+i"
            :x="radarLabelPt(i).x" :y="radarLabelPt(i).y"
            text-anchor="middle" font-size="9" fill="#757575">{{ d.label }}</text>
        </svg>
      </div>
      <div class="radar-legend">
        <div class="radar-legend-item" v-for="d in radarDims" :key="d.label">
          <span class="radar-dot" :style="{ background: d.color }"></span>
          <span>{{ d.label }}</span>
          <span style="margin-left:auto;font-weight:600">{{ d.value }}</span>
        </div>
      </div>
    </div>

    <!-- 6. 智能标签卡 -->
    <div class="preview-card">
      <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>🏷️ 智能标签</span>
        <span class="tag-add-btn" @click="showTagInput = !showTagInput">＋</span>
      </div>
      <div v-if="showTagInput" class="tag-input-row">
        <input v-model="newTagText" placeholder="输入标签名" class="tag-input"
          @keyup.enter="addTag" />
        <button class="tag-add-confirm" @click="addTag">添加</button>
      </div>
      <div class="portrait-tags">
        <span class="p-tag" style="background:#e8f5e9;color:#388e3c" v-if="stats.orderCount >= 3">复购客户</span>
        <span class="p-tag" style="background:#e3f2fd;color:#1565c0" v-if="stats.totalAmount >= 1000">高消费</span>
        <span class="p-tag" style="background:#fce4ec;color:#c62828" v-if="stats.totalAmount < 100 && stats.orderCount > 0">低消费</span>
        <span class="p-tag" style="background:#f3e5f5;color:#7b1fa2" v-if="crmCustomer?.level === 'vip' || crmCustomer?.level === 'svip'">VIP</span>
        <span class="p-tag" style="background:#fff3e0;color:#e65100" v-if="lastOrderDaysNum > 60">流失风险</span>
        <span class="p-tag" style="background:#e0f2f1;color:#00695c" v-if="lastOrderDaysNum <= 14 && stats.orderCount > 0">近期活跃</span>
        <span class="p-tag colored tag-deletable" v-for="t in customTags" :key="t">
          {{ t }}
          <span class="tag-del" @click.stop="removeTag(t)">✕</span>
        </span>
      </div>
    </div>

    <!-- 7. 互动分析卡 -->
    <div class="preview-card">
      <div class="card-title">💬 互动分析</div>
      <div class="portrait-grid">
        <div class="portrait-metric">
          <div class="metric-icon">💬</div>
          <div class="metric-val">{{ interaction.chatCount }}</div>
          <div class="metric-lbl">消息数</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-icon">📅</div>
          <div class="metric-val">{{ interaction.addDays }}天</div>
          <div class="metric-lbl">添加天数</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-icon">🔄</div>
          <div class="metric-val">{{ interaction.replyRate }}</div>
          <div class="metric-lbl">回复率</div>
        </div>
        <div class="portrait-metric">
          <div class="metric-icon">📝</div>
          <div class="metric-val">{{ interaction.followUpCount }}</div>
          <div class="metric-lbl">跟进次数</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import request from '@/utils/request'

const props = defineProps<{ customerData: any; sidebarToken?: string }>()

// ========== 基础数据提取 ==========
const crmCustomer = computed(() => props.customerData?.crmCustomer || null)

function parseLatestContent(value: any): string {
  if (!value) return ''
  if (typeof value === 'string') {
    if (value.startsWith('[')) {
      try {
        const arr = JSON.parse(value)
        if (Array.isArray(arr) && arr.length > 0) {
          const latest = arr[arr.length - 1]
          return latest?.content || latest || ''
        }
      } catch { /* not JSON */ }
    }
    return value
  }
  if (Array.isArray(value) && value.length > 0) {
    const latest = value[value.length - 1]
    return latest?.content || String(latest) || ''
  }
  return String(value)
}
const wecomCustomer = computed(() => props.customerData?.wecomCustomer || null)

const stats = computed(() => ({
  orderCount: props.customerData?.stats?.orderCount || 0,
  totalAmount: props.customerData?.stats?.totalAmount || 0,
  lastOrderTime: props.customerData?.stats?.lastOrderTime || null,
}))

const interaction = computed(() => {
  const crm = crmCustomer.value
  const wecom = wecomCustomer.value
  const addTime = wecom?.addTime || crm?.createdAt
  const addDays = addTime ? Math.max(1, Math.floor((Date.now() - new Date(addTime).getTime()) / 86400000)) : 0
  return {
    chatCount: crm?.chatCount || 0,
    addDays,
    replyRate: crm?.replyRate || '-',
    followUpCount: crm?.followUpCount || 0,
    afterSalesCount: crm?.afterSalesCount || 0,
  }
})

// ========== 翻译映射 ==========
const sourceMap: Record<string, string> = {
  wechat: '微信', wecom: '企微', website: '官网', phone: '电话',
  referral: '转介绍', exhibition: '展会', ad: '广告', other: '其他',
  douyin: '抖音', taobao: '淘宝', jd: '京东', offline: '线下',
  online: '线上', friend: '朋友介绍', self: '自主开发',
}
const levelMap: Record<string, string> = {
  bronze: '青铜', silver: '白银', gold: '黄金', platinum: '铂金',
  diamond: '钻石', vip: 'VIP', svip: 'SVIP',
  normal: '普通', important: '重要', key: '关键', strategic: '战略',
  A: 'A级', B: 'B级', C: 'C级', D: 'D级',
}
const followStatusMap: Record<string, string> = {
  new: '新客户', following: '跟进中', interested: '有意向',
  negotiating: '谈判中', signed: '已签约', lost: '已流失',
  inactive: '不活跃', active: '活跃', pending: '待跟进',
  converted: '已转化', rejected: '已拒绝',
}

const transSource = (v?: string) => (v && sourceMap[v]) || v || '-'
const transLevel = (v?: string) => (v && levelMap[v]) || v || '-'
const transFollowStatus = (v?: string) => (v && followStatusMap[v]) || v || '-'

const genderText = computed(() => {
  const g = crmCustomer.value?.gender
  if (g === 'male') return '男'
  if (g === 'female') return '女'
  return g || '-'
})

// ========== 派生指标 ==========
const avgOrderAmount = computed(() => {
  const { orderCount, totalAmount } = stats.value
  return orderCount > 0 ? (totalAmount / orderCount).toFixed(0) : '0'
})

const lastOrderDaysNum = computed(() => {
  const t = stats.value.lastOrderTime
  if (!t) return 999
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000)
})

const lastOrderDaysText = computed(() => {
  const d = lastOrderDaysNum.value
  if (d >= 999) return '-'
  if (d === 0) return '今天'
  return d + '天前'
})

const tenureDays = computed(() => {
  const t = crmCustomer.value?.createdAt || wecomCustomer.value?.addTime
  return t ? Math.max(1, Math.floor((Date.now() - new Date(t).getTime()) / 86400000)) : 1
})

const formatAmount = (v: any) => {
  const n = Number(v || 0)
  return n >= 10000 ? (n / 10000).toFixed(1) + '万' : n.toFixed(0)
}

// ========== 五维评分计算 ==========
const radarDims = computed(() => {
  const cnt = stats.value.orderCount
  const amt = stats.value.totalAmount
  const days = lastOrderDaysNum.value
  const chat = interaction.value.chatCount
  const followUp = interaction.value.followUpCount
  const tenure = tenureDays.value
  const avgOrd = cnt > 0 ? amt / cnt : 0
  const level = crmCustomer.value?.level || ''
  const afterSales = interaction.value.afterSalesCount

  // 消费力
  const spendBase = amt > 0 ? Math.min(70, Math.round(Math.log10(amt + 1) * 20)) : 0
  const avgBonus = avgOrd > 500 ? 20 : avgOrd > 200 ? 15 : avgOrd > 50 ? 10 : 0
  const spendPower = Math.min(100, spendBase + avgBonus + (cnt >= 5 ? 10 : 0))

  // 复购率
  const monthsActive = Math.max(1, tenure / 30)
  const freq = cnt / monthsActive
  const repurchase = Math.min(100, Math.round(
    (freq >= 2 ? 50 : freq >= 1 ? 35 : freq >= 0.5 ? 20 : freq > 0 ? 10 : 0) +
    (cnt >= 10 ? 30 : cnt >= 5 ? 20 : cnt >= 3 ? 15 : cnt >= 1 ? 5 : 0) +
    (cnt >= 2 && days < 30 ? 20 : 0)
  ))

  // 活跃度
  const recencyScore = days < 7 ? 40 : days < 14 ? 32 : days < 30 ? 24 : days < 60 ? 15 : days < 90 ? 8 : 3
  const chatRecency = chat > 0 ? Math.min(30, Math.round(Math.sqrt(chat) * 5)) : 0
  const followBonusVal = followUp > 0 ? Math.min(30, followUp * 5) : 0
  const activity = Math.min(100, recencyScore + chatRecency + followBonusVal)

  // 互动量
  const chatScoreVal = Math.min(40, Math.round(Math.sqrt(chat) * 6))
  const followScoreVal = Math.min(30, followUp * 6)
  const replyStr = String(interaction.value.replyRate || '0')
  const replyPct = parseFloat(replyStr) || 0
  const replyScoreVal = Math.min(30, Math.round(replyPct * 0.3))
  const interactionScore = Math.min(100, chatScoreVal + followScoreVal + replyScoreVal)

  // 忠诚度
  const tenureScore = tenure > 365 ? 30 : tenure > 180 ? 22 : tenure > 90 ? 15 : tenure > 30 ? 8 : 3
  const loyalRepurchase = cnt >= 5 ? 25 : cnt >= 3 ? 18 : cnt >= 2 ? 12 : cnt >= 1 ? 5 : 0
  const levelBonus = (level === 'svip' || level === 'diamond') ? 20
    : (level === 'vip' || level === 'platinum') ? 15
    : (level === 'gold' || level === 'important') ? 10
    : level === 'silver' ? 5 : 0
  const recentBonus = days < 30 ? 15 : days < 60 ? 8 : 0
  const asPenalty = afterSales > 3 ? 15 : afterSales > 1 ? 8 : 0
  const loyalty = Math.min(100, Math.max(0,
    tenureScore + loyalRepurchase + levelBonus + recentBonus - asPenalty + (amt > 2000 ? 10 : 0)
  ))

  return [
    { label: '消费力', value: spendPower, color: '#ef5350' },
    { label: '复购率', value: repurchase, color: '#42a5f5' },
    { label: '活跃度', value: activity, color: '#66bb6a' },
    { label: '互动量', value: interactionScore, color: '#ffa726' },
    { label: '忠诚度', value: loyalty, color: '#ab47bc' },
  ]
})

const portraitScore = computed(() => {
  const dims = radarDims.value
  const weights = [0.30, 0.25, 0.20, 0.10, 0.15]
  let s = 0
  for (let i = 0; i < dims.length; i++) s += dims[i].value * weights[i]
  return Math.min(100, Math.round(s))
})

// ========== 手动星评 ==========
const manualStar = ref(0)

watch(() => crmCustomer.value?.starRating, (val) => {
  if (val !== undefined && val !== null) manualStar.value = Number(val) || 0
}, { immediate: true })

const finalScore = computed(() => manualStar.value > 0 ? manualStar.value * 20 : portraitScore.value)

const finalScoreLabel = computed(() => {
  const s = finalScore.value
  return s >= 90 ? '顶级客户' : s >= 80 ? '优质客户' : s >= 60 ? '潜力客户'
    : s >= 40 ? '一般客户' : s >= 20 ? '待激活客户' : '新客户'
})

const finalScoreDesc = computed(() => {
  const s = finalScore.value
  if (manualStar.value > 0) {
    const descs: Record<number, string> = {
      1: '评级较低，需重点关注客户需求和满意度',
      2: '尚有提升空间，建议加强沟通和服务',
      3: '中等水平，客户关系稳定，可挖掘潜力',
      4: '表现良好，高价值客户，需持续维护',
      5: '极高评价，核心客户，提供VIP级服务',
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

const scoreRingColor = computed(() =>
  finalScore.value >= 70 ? '#66bb6a' : finalScore.value >= 40 ? '#ffa726' : '#ef5350'
)
const scoreTextColor = computed(() =>
  finalScore.value >= 70 ? '#388e3c' : finalScore.value >= 40 ? '#f57c00' : '#d32f2f'
)

// ========== 雷达图几何 ==========
const radarAngle = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2

const radarBgPoints = (level: number) => {
  const r = (level / 4) * 65
  return Array.from({ length: 5 }, (_, i) => {
    const a = radarAngle(i)
    return (100 + r * Math.cos(a)) + ',' + (85 + r * Math.sin(a))
  }).join(' ')
}

const radarAxisPt = (i: number) => {
  const a = radarAngle(i)
  return { x: 100 + 65 * Math.cos(a), y: 85 + 65 * Math.sin(a) }
}

const radarDataPt = (i: number) => {
  const a = radarAngle(i)
  const r = (radarDims.value[i].value / 100) * 65
  return { x: 100 + r * Math.cos(a), y: 85 + r * Math.sin(a) }
}

const radarDataPoints = computed(() =>
  Array.from({ length: 5 }, (_, i) => {
    const p = radarDataPt(i)
    return p.x + ',' + p.y
  }).join(' ')
)

const radarLabelPt = (i: number) => {
  const a = radarAngle(i)
  return { x: 100 + 78 * Math.cos(a), y: 88 + 78 * Math.sin(a) }
}

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
    for (let j = 0; j < months.length; j++) {
      const md = new Date(now.getFullYear(), now.getMonth() - (5 - j), 1)
      const mdNext = new Date(now.getFullYear(), now.getMonth() - (5 - j) + 1, 1)
      if (od >= md && od < mdNext) months[j].amount += Number(o.finalAmount || o.totalAmount || 0)
    }
  }
  return months
})

const trendDots = computed(() => {
  const data = orderTrend.value
  if (data.length < 2) return []
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => ({
    x: (i / (data.length - 1)) * 230 + 5,
    y: 55 - (d.amount / maxVal) * 45,
  }))
})

const trendCurvePath = computed(() => {
  const pts = trendDots.value
  if (pts.length < 2) return ''
  let d = 'M' + pts[0].x + ',' + pts[0].y
  for (let i = 0; i < pts.length - 1; i++) {
    const cx = (pts[i].x + pts[i + 1].x) / 2
    d += ' C' + cx + ',' + pts[i].y + ' ' + cx + ',' + pts[i + 1].y + ' ' + pts[i + 1].x + ',' + pts[i + 1].y
  }
  return d
})

const trendAreaPath = computed(() => {
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

const trendHoverIdx = ref(-1)

// ========== 智能标签 ==========
const showTagInput = ref(false)
const newTagText = ref('')

const parseTags = (tags: any): string[] => {
  if (!tags) return []
  if (Array.isArray(tags)) return tags
  if (typeof tags === 'string') return tags.split(',').map((t: string) => t.trim()).filter(Boolean)
  return []
}

const localTags = ref<string[]>([])
watch(() => crmCustomer.value?.tags, (val) => {
  localTags.value = parseTags(val)
}, { immediate: true })

const customTags = computed(() => localTags.value)

const addTag = async () => {
  const tag = newTagText.value.trim()
  if (!tag || localTags.value.includes(tag)) return
  localTags.value = [...localTags.value, tag]
  newTagText.value = ''
  await saveTagsToBackend()
}

const removeTag = async (tag: string) => {
  localTags.value = localTags.value.filter(t => t !== tag)
  await saveTagsToBackend()
}

async function saveTagsToBackend() {
  if (!crmCustomer.value?.id || !props.sidebarToken) return
  try {
    await request.put(`/wecom/sidebar/customer-tags`, {
      customerId: crmCustomer.value.id,
      tags: localTags.value
    }, { headers: { Authorization: `Bearer ${props.sidebarToken}` } } as any)
  } catch (e: any) {
    console.warn('[Portrait] 保存标签失败:', e?.message)
  }
}
</script>

<style scoped>
.sidebar-portrait {
  padding: 0 0 12px;
  background: #f5f6f7;
  min-height: 100vh;
  color: #303133;
}

.preview-card {
  background: #fff;
  margin: 8px 12px;
  border-radius: 10px;
  padding: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.04);
}

.card-title {
  font-size: 13px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

/* 头部 */
.customer-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar-circle {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #f0f2f5;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  flex-shrink: 0;
}

.customer-name {
  font-size: 15px;
  font-weight: 700;
  color: #303133;
}

.mini-tag {
  display: inline-block;
  padding: 1px 6px;
  border-radius: 3px;
  font-size: 10px;
}

/* 评分 */
.score-section {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
}

.star-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 0;
  border-top: 1px solid #f5f5f5;
  margin-top: 4px;
}

.star-btn {
  font-size: 18px;
  color: #e0e0e0;
  cursor: pointer;
  transition: color 0.15s, transform 0.15s;
  line-height: 1;
}

.star-btn:hover {
  transform: scale(1.2);
  color: #ffd54f;
}

.star-btn.active {
  color: #ffb300;
}

/* 信息行 */
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 4px 0;
  font-size: 12px;
  color: #303133;
  border-bottom: 1px solid #f5f5f5;
}

.info-row .label {
  color: #909399;
  flex-shrink: 0;
  width: 50px;
}

.info-row .tag {
  background: #ecf5ff;
  color: #409eff;
  padding: 0 6px;
  border-radius: 3px;
  font-size: 11px;
}

/* 网格 */
.portrait-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  padding: 6px 0;
}

.portrait-metric {
  text-align: center;
  padding: 8px 4px;
  background: #f9fafb;
  border-radius: 6px;
}

.portrait-metric .metric-icon {
  font-size: 18px;
  margin-bottom: 2px;
}

.portrait-metric .metric-val {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.portrait-metric .metric-lbl {
  font-size: 10px;
  color: #909399;
  margin-top: 2px;
}

/* 雷达图例 */
.radar-legend {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 4px 0;
}

.radar-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 11px;
  color: #606266;
  padding: 3px 0;
}

.radar-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

/* 标签 */
.portrait-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 4px 0;
}

.p-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  margin: 2px;
  background: #f4f4f5;
  color: #606266;
}

.p-tag.colored {
  background: #ecf5ff;
  color: #409eff;
}

.tag-deletable {
  position: relative;
  padding-right: 16px !important;
}

.tag-del {
  position: absolute;
  right: 3px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 9px;
  cursor: pointer;
  opacity: 0.5;
  transition: opacity 0.15s;
}

.tag-del:hover {
  opacity: 1;
}

.tag-add-btn {
  font-size: 14px;
  color: #409eff;
  cursor: pointer;
  padding: 0 4px;
  border-radius: 4px;
  line-height: 1;
}

.tag-add-btn:hover {
  background: #ecf5ff;
}

.tag-input-row {
  display: flex;
  gap: 4px;
  margin-bottom: 6px;
}

.tag-input {
  flex: 1;
  padding: 3px 6px;
  font-size: 11px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  outline: none;
}

.tag-input:focus {
  border-color: #409eff;
}

.tag-add-confirm {
  padding: 3px 8px;
  font-size: 11px;
  color: #fff;
  background: #409eff;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.tag-add-confirm:hover {
  background: #66b1ff;
}
</style>
