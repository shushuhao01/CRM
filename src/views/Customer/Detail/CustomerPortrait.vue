<template>
  <div class="customer-portrait">
    <!-- 综合评分 -->
    <div class="portrait-section">
      <div class="section-header">
        <span class="section-icon">⭐</span>
        <span class="section-title">客户综合评分</span>
      </div>
      <div class="score-row">
        <div class="score-ring">
          <svg viewBox="0 0 100 100" width="90" height="90">
            <circle cx="50" cy="50" r="42" fill="none" stroke="#f0f0f0" stroke-width="7" />
            <circle cx="50" cy="50" r="42" fill="none" :stroke="scoreColor" stroke-width="7" stroke-linecap="round"
              :stroke-dasharray="(finalScore / 100) * 263.9 + ' 263.9'" transform="rotate(-90 50 50)" />
            <text x="50" y="55" text-anchor="middle" font-size="22" font-weight="700" :fill="scoreColor">{{ finalScore }}</text>
          </svg>
        </div>
        <div class="score-info">
          <div class="score-label">{{ finalScoreLabel }}</div>
          <div class="score-desc">{{ finalScoreDesc }}</div>
          <div v-if="starRating > 0" class="score-mode-hint">📌 当前为手动评分模式</div>
          <div v-else class="score-mode-hint">🤖 当前为自动评分模式</div>
        </div>
      </div>
      <div class="star-row">
        <span class="star-label">手动评分：</span>
        <span v-for="s in 5" :key="s" class="star-btn" :class="{ active: s <= starRating }" @click="setStarRating(s)">★</span>
        <span class="star-text">{{ starRating > 0 ? starRating + '/5（点击同一星取消手动评分）' : '未评（点击评分）' }}</span>
      </div>
    </div>

    <div class="portrait-grid-layout">
      <!-- 消费分析 -->
      <div class="portrait-section">
        <div class="section-header">
          <span class="section-icon">💰</span>
          <span class="section-title">消费分析</span>
        </div>
        <div class="metrics-grid">
          <div class="metric-card">
            <div class="metric-val" style="color:#ef5350">¥{{ totalAmount }}</div>
            <div class="metric-lbl">累计消费</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color:#42a5f5">{{ orderCount }}</div>
            <div class="metric-lbl">订单总数</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color:#ab47bc">¥{{ avgOrder }}</div>
            <div class="metric-lbl">客单价</div>
          </div>
          <div class="metric-card">
            <div class="metric-val" style="color:#26a69a">{{ lastOrderDaysText }}</div>
            <div class="metric-lbl">距上次购买</div>
          </div>
        </div>
        <!-- 消费趋势(曲线图+每个节点永久数据标签) -->
        <div class="trend-chart" style="position:relative">
          <div class="trend-title">消费趋势</div>
          <template v-if="hasAnyTrendData">
            <svg :viewBox="'0 0 300 100'" width="100%" height="100" style="overflow:visible" @mouseleave="trendHoverIdx = -1">
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stop-color="#42a5f5" stop-opacity="0.25" />
                  <stop offset="100%" stop-color="#42a5f5" stop-opacity="0.02" />
                </linearGradient>
              </defs>
              <polygon :points="trendAreaPoints" fill="url(#trendGrad)" />
              <path :d="trendCurvePath" fill="none" stroke="#42a5f5" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
              <template v-for="(p, i) in trendDots" :key="'g'+i">
                <circle :cx="p.x" :cy="p.y" r="12" fill="transparent" @mouseenter="trendHoverIdx = i" @mouseleave="trendHoverIdx = -1" style="cursor:pointer" />
                <circle :cx="p.x" :cy="p.y" :r="trendHoverIdx === i ? 5.5 : 3.5" :fill="trendHoverIdx === i ? '#1e88e5' : '#42a5f5'" :stroke="trendHoverIdx === i ? '#fff' : 'none'" :stroke-width="trendHoverIdx === i ? 2 : 0" style="transition:all .15s;pointer-events:none" />
                <!-- 永久数据标签 -->
                <text v-if="orderTrend[i].amount > 0" :x="p.x" :y="p.y - 10" text-anchor="middle" font-size="9" font-weight="600" fill="#42a5f5">¥{{ orderTrend[i].amount }}</text>
              </template>
              <!-- 悬浮高亮标签 -->
              <template v-if="trendHoverIdx >= 0 && trendDots[trendHoverIdx]">
                <rect :x="trendDots[trendHoverIdx].x - 40" :y="trendDots[trendHoverIdx].y - 32" width="80" height="20" rx="4" fill="#303133" opacity="0.9" />
                <text :x="trendDots[trendHoverIdx].x" :y="trendDots[trendHoverIdx].y - 19" text-anchor="middle" font-size="11" font-weight="600" fill="#fff">{{ orderTrend[trendHoverIdx].label }} ¥{{ orderTrend[trendHoverIdx].amount }}</text>
              </template>
            </svg>
            <div class="trend-labels">
              <span v-for="(m, i) in orderTrend" :key="i" :style="{ fontWeight: trendHoverIdx === i ? '700' : '400', color: trendHoverIdx === i ? '#42a5f5' : '#bdbdbd' }">{{ m.label }}</span>
            </div>
          </template>
          <div v-else class="trend-empty">
            <span style="color:#bdbdbd;font-size:13px">暂无消费记录</span>
          </div>
        </div>
      </div>

      <!-- 多维度雷达 -->
      <div class="portrait-section">
        <div class="section-header">
          <span class="section-icon">🎯</span>
          <span class="section-title">多维度评估</span>
        </div>
        <div class="radar-wrapper">
          <svg viewBox="0 0 200 180" width="200" height="180">
            <polygon v-for="n in 4" :key="'bg'+n" :points="radarBgPoints(n)" fill="none" :stroke="n === 4 ? '#e0e0e0' : '#f5f5f5'" stroke-width="1" />
            <line v-for="(_, i) in radarDimensions" :key="'ax'+i" x1="100" y1="85" :x2="radarAxisPoint(i).x" :y2="radarAxisPoint(i).y" stroke="#f0f0f0" stroke-width="1" />
            <polygon :points="radarDataPoints" fill="rgba(102,187,106,0.18)" stroke="#66bb6a" stroke-width="2" />
            <circle v-for="(d, i) in radarDimensions" :key="'dot'+i" :cx="radarDataPoint(i).x" :cy="radarDataPoint(i).y" r="3.5" fill="#66bb6a" />
            <text v-for="(d, i) in radarDimensions" :key="'lbl'+i" :x="radarLabelPoint(i).x" :y="radarLabelPoint(i).y" text-anchor="middle" font-size="10" fill="#757575">{{ d.label }}</text>
          </svg>
        </div>
        <div class="radar-legend">
          <div class="radar-legend-item" v-for="d in radarDimensions" :key="d.label">
            <span class="radar-dot" :style="{ background: d.color }"></span>
            <span>{{ d.label }}</span>
            <span class="radar-val">{{ d.value }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 客户属性 -->
    <div class="portrait-section">
      <div class="section-header">
        <span class="section-icon">📋</span>
        <span class="section-title">客户属性</span>
      </div>
      <div class="attrs-grid">
        <div class="attr-item"><span class="attr-label">姓名</span><span class="attr-val">{{ customer.name || '-' }}</span></div>
        <div class="attr-item"><span class="attr-label">性别</span><span class="attr-val">{{ genderText }}</span></div>
        <div class="attr-item"><span class="attr-label">年龄</span><span class="attr-val">{{ customer.age ? customer.age + '岁' : '-' }}</span></div>
        <div class="attr-item"><span class="attr-label">来源</span><span class="attr-val">{{ transSource(customer.source) }}</span></div>
        <div class="attr-item"><span class="attr-label">等级</span><span class="attr-val tag">{{ transLevel(customer.level) }}</span></div>
        <div class="attr-item"><span class="attr-label">地址</span><span class="attr-val">{{ customer.address ? displaySensitiveInfoNew(customer.address, SensitiveInfoType.ADDRESS) : '-' }}</span></div>
        <div class="attr-item" v-if="customer.medicalHistory"><span class="attr-label">疾病史</span>
          <span class="attr-val">
            {{ latestMedical }}
            <el-popover v-if="allMedicalRecords.length > 1" trigger="hover" :width="320" placement="bottom-start">
              <template #reference>
                <el-tag size="small" type="info" style="cursor:pointer;margin-left:4px">还有{{ allMedicalRecords.length - 1 }}条</el-tag>
              </template>
              <div style="max-height:260px;overflow-y:auto">
                <div v-for="(rec, idx) in allMedicalRecords" :key="idx" style="padding:6px 0;border-bottom:1px solid #f5f5f5;font-size:13px">
                  <div style="color:#303133">{{ rec.content || rec }}</div>
                  <div v-if="rec.createTime" style="font-size:11px;color:#909399;margin-top:2px">{{ rec.createTime }}</div>
                </div>
              </div>
            </el-popover>
          </span>
        </div>
      </div>
    </div>

    <!-- 智能标签 -->
    <div class="portrait-section">
      <div class="section-header">
        <span class="section-icon">🏷️</span>
        <span class="section-title">智能标签</span>
      </div>
      <div class="tags-wrap">
        <el-tag v-if="orderCount >= 3" type="success" size="small" effect="light">复购客户</el-tag>
        <el-tag v-if="totalAmountNum >= 1000" size="small" effect="light">高消费</el-tag>
        <el-tag v-if="totalAmountNum < 100 && orderCount > 0" type="danger" size="small" effect="light">低消费</el-tag>
        <el-tag v-if="customer.level === 'vip' || customer.level === 'svip'" type="warning" size="small" effect="light">VIP</el-tag>
        <el-tag v-if="lastOrderDays > 60" type="danger" size="small" effect="light">流失风险</el-tag>
        <el-tag v-if="lastOrderDays <= 14 && orderCount > 0" type="success" size="small" effect="light">近期活跃</el-tag>
        <el-tag v-for="t in parsedTags" :key="t" size="small" effect="plain">{{ t }}</el-tag>
        <el-tag v-if="!parsedTags.length && orderCount === 0" type="info" size="small">暂无标签</el-tag>
      </div>
    </div>

    <!-- 互动分析 + 售后概览 -->
    <div class="portrait-grid-layout" v-if="customer.id">
      <div class="portrait-section">
        <div class="section-header">
          <span class="section-icon">💬</span>
          <span class="section-title">互动分析</span>
        </div>
        <template v-if="hasWecomBinding">
          <div class="metrics-grid cols-2">
            <div class="metric-card"><div class="metric-val">{{ interactionData.chatCount }}</div><div class="metric-lbl">消息条数</div></div>
            <div class="metric-card"><div class="metric-val">{{ interactionData.replyRate }}</div><div class="metric-lbl">回复率</div></div>
            <div class="metric-card"><div class="metric-val">{{ interactionData.addDays }}天</div><div class="metric-lbl">添加天数</div></div>
            <div class="metric-card"><div class="metric-val">{{ interactionData.followUpCount }}</div><div class="metric-lbl">跟进次数</div></div>
          </div>
          <div class="wecom-hint">💡 消息条数和回复率数据来源于企微会话存档，需开通企微会话存档功能</div>
        </template>
        <template v-else>
          <div class="wecom-not-bound">
            <div class="wecom-not-bound-icon">🔗</div>
            <div class="wecom-not-bound-text">暂未绑定企业微信</div>
            <div class="wecom-not-bound-desc">绑定企业微信后可查看消息互动数据；开通会话存档后可统计详细消息数量</div>
          </div>
          <div class="metrics-grid cols-2" style="margin-top:12px">
            <div class="metric-card"><div class="metric-val">{{ interactionData.addDays }}天</div><div class="metric-lbl">添加天数</div></div>
            <div class="metric-card"><div class="metric-val">{{ interactionData.followUpCount }}</div><div class="metric-lbl">跟进次数</div></div>
          </div>
        </template>
      </div>
      <div class="portrait-section" v-if="interactionData.afterSalesCount > 0">
        <div class="section-header">
          <span class="section-icon">🛡️</span>
          <span class="section-title">售后概览</span>
        </div>
        <div class="metrics-grid cols-2">
          <div class="metric-card"><div class="metric-val" style="color:#ef5350">{{ interactionData.afterSalesCount }}</div><div class="metric-lbl">售后次数</div></div>
          <div class="metric-card"><div class="metric-val" style="color:#ffa726">¥{{ Number(interactionData.afterSalesAmount || 0).toFixed(0) }}</div><div class="metric-lbl">售后金额</div></div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'

const props = defineProps<{
  customer: any
  stats: { totalConsumption: number; orderCount: number; returnCount: number; lastOrderDate: string }
}>()

// Star rating
const starRating = ref(0)
const serverFinalScore = ref(0)
const trendHoverIdx = ref(-1)

const setStarRating = async (s: number) => {
  const oldVal = starRating.value
  const newVal = starRating.value === s ? 0 : s
  starRating.value = newVal
  if (props.customer?.id) {
    try {
      const score = newVal > 0 ? newVal * 20 : portraitScore.value
      await request.put('/customers/' + props.customer.id, { starRating: newVal, finalScore: score })
      serverFinalScore.value = score
      await request.post('/customers/' + props.customer.id + '/logs', {
        logType: 'portrait',
        content: `客户画像手动评分变更：${oldVal || 0} 星 → ${newVal} 星（综合评分 ${score} 分）`,
        detail: { action: 'star_rating', oldValue: oldVal, newValue: newVal, finalScore: score }
      }).catch(() => {})
      ElMessage.success(newVal > 0 ? '手动评分已保存' : '已恢复自动评分')
    } catch (e) {
      console.error('[CustomerPortrait] 评分保存失败:', e)
      starRating.value = oldVal
      ElMessage.warning('评分保存失败，请重试')
    }
  }
}

// Load star rating from props
watch(() => props.customer, (cust) => {
  if (cust) {
    starRating.value = Number(cust.starRating) || 0
    serverFinalScore.value = Number(cust.finalScore) || 0
  }
}, { immediate: true, deep: false })

// Also load from API for freshest data
const loadStarRating = async () => {
  if (!props.customer?.id) return
  try {
    const res: any = await request.get('/customers/' + props.customer.id)
    const data = res?.data || res
    const sr = Number(data?.starRating) || 0
    const fs = Number(data?.finalScore) || 0
    starRating.value = sr
    serverFinalScore.value = fs
    console.log('[CustomerPortrait] 从API加载评分: starRating=', sr, 'finalScore=', fs)
  } catch (e) {
    console.warn('[CustomerPortrait] 加载评分失败:', e)
  }
}

watch(() => props.customer?.id, (id) => { if (id) loadStarRating() }, { immediate: true })

// Orders cache for trend
const allOrders = ref<any[]>([])
const loadOrders = async () => {
  if (!props.customer?.id) return
  try {
    const res: any = await request.get('/orders', { params: { customerId: props.customer.id, page: 1, pageSize: 200 } })
    allOrders.value = res?.data?.list || res?.list || res?.data || []
  } catch { allOrders.value = [] }
}

watch(() => props.customer?.id, (id) => { if (id) loadOrders() }, { immediate: true })

// Computed values
const totalAmountNum = computed(() => Number(props.stats?.totalConsumption || props.customer?.totalAmount || 0))
const totalAmount = computed(() => totalAmountNum.value.toFixed(0))
const orderCount = computed(() => props.stats?.orderCount || props.customer?.orderCount || 0)
const avgOrder = computed(() => orderCount.value > 0 ? (totalAmountNum.value / orderCount.value).toFixed(0) : '0')

const lastOrderDays = computed(() => {
  const t = props.stats?.lastOrderDate || props.customer?.lastOrderTime
  if (!t) return 999
  return Math.floor((Date.now() - new Date(t).getTime()) / 86400000)
})
const lastOrderDaysText = computed(() => {
  const d = lastOrderDays.value
  if (d >= 999) return '-'
  if (d === 0) return '今天'
  return d + '天前'
})

const genderText = computed(() => {
  const g = props.customer?.gender
  if (g === 'male' || g === '男') return '男'
  if (g === 'female' || g === '女') return '女'
  return g || '-'
})

const parsedTags = computed(() => {
  const tags = props.customer?.tags
  if (!tags) return []
  if (Array.isArray(tags)) return tags.filter(Boolean)
  if (typeof tags === 'string') return tags.split(',').map((t: string) => t.trim()).filter(Boolean)
  return []
})

// WeChat binding check
const hasWecomBinding = computed(() => {
  return !!(props.customer?.wecomExternalUserid || props.customer?.wecom_external_userid || props.customer?.wecomAddTime)
})

// Interaction data
const interactionData = computed(() => {
  const addTime = props.customer?.wecomAddTime || props.customer?.createdAt
  const addDays = addTime ? Math.max(1, Math.floor((Date.now() - new Date(addTime).getTime()) / 86400000)) : 0
  return {
    chatCount: props.customer?.chatCount || 0,
    addDays,
    replyRate: props.customer?.replyRate || '-',
    followUpCount: props.customer?.followUpCount || 0,
    afterSalesCount: props.customer?.afterSalesCount || 0,
    afterSalesAmount: props.customer?.afterSalesAmount || 0,
  }
})

// Radar — comprehensive multi-dimensional evaluation
const customerTenureDays = computed(() => {
  const t = props.customer?.createdAt || props.customer?.createTime
  return t ? Math.max(1, Math.floor((Date.now() - new Date(t).getTime()) / 86400000)) : 1
})

const radarDimensions = computed(() => {
  const cnt = orderCount.value
  const amt = totalAmountNum.value
  const days = lastOrderDays.value
  const chat = interactionData.value.chatCount || 0
  const followUp = interactionData.value.followUpCount || 0
  const tenure = customerTenureDays.value
  const avgOrd = cnt > 0 ? amt / cnt : 0
  const level = props.customer?.level || ''
  const afterSales = interactionData.value.afterSalesCount || 0

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
  const replyStr = String(interactionData.value.replyRate || '0')
  const replyPct = parseFloat(replyStr) || 0
  const replyScoreVal = Math.min(30, Math.round(replyPct * 0.3))
  const interaction = Math.min(100, chatScoreVal + followScoreVal + replyScoreVal)

  const tenureScore = tenure > 365 ? 30 : tenure > 180 ? 22 : tenure > 90 ? 15 : tenure > 30 ? 8 : 3
  const loyalRepurchase = cnt >= 5 ? 25 : cnt >= 3 ? 18 : cnt >= 2 ? 12 : cnt >= 1 ? 5 : 0
  const levelBonus = (level === 'svip' || level === 'diamond') ? 20 : (level === 'vip' || level === 'platinum') ? 15 : (level === 'gold' || level === 'important') ? 10 : (level === 'silver') ? 5 : 0
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

// Score — weighted average
const portraitScore = computed(() => {
  const dims = radarDimensions.value
  const weights = [0.30, 0.25, 0.20, 0.10, 0.15]
  let score = 0
  for (let i = 0; i < dims.length; i++) { score += dims[i].value * weights[i] }
  return Math.min(100, Math.round(score))
})

// finalScore: manual star rating takes priority, otherwise auto score
const finalScore = computed(() => {
  if (starRating.value > 0) return starRating.value * 20
  // If server has a saved finalScore from previous manual rating but starRating was cleared, use auto
  return portraitScore.value
})
const scoreColor = computed(() => finalScore.value >= 70 ? '#66bb6a' : finalScore.value >= 40 ? '#ffa726' : '#ef5350')
const finalScoreLabel = computed(() => {
  const s = finalScore.value
  return s >= 90 ? '顶级客户' : s >= 80 ? '优质客户' : s >= 60 ? '潜力客户' : s >= 40 ? '一般客户' : s >= 20 ? '待激活客户' : '新客户'
})
const finalScoreDesc = computed(() => {
  const s = finalScore.value
  if (starRating.value > 0) {
    const descs: Record<number, string> = {
      1: '评级较低，需重点关注客户需求和满意度',
      2: '尚有提升空间，建议加强沟通和服务',
      3: '中等水平，客户关系稳定，可挖掘潜力',
      4: '表现良好，高价值客户，需持续维护',
      5: '极高评价，核心客户，提供VIP级服务'
    }
    return '手动评分 ' + starRating.value + ' 星 · ' + (descs[starRating.value] || '')
  }
  if (s >= 90) return '消费力强、复购率高、互动活跃，核心客户需重点维护'
  if (s >= 80) return '消费稳定、粘性较高，有潜力升级为顶级客户'
  if (s >= 60) return '有一定消费基础，可通过精准营销提升价值'
  if (s >= 40) return '消费一般，建议加强跟进和互动频率'
  if (s >= 20) return '消费较少或长期未活跃，需激活唤醒'
  return '新客户或无消费记录，建议建立初步联系'
})

// Order trend - real data mapped by month
const orderTrend = computed(() => {
  const now = new Date()
  const months: { label: string; amount: number }[] = []
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ label: (d.getMonth() + 1) + '月', amount: 0 })
  }
  for (const o of allOrders.value) {
    const od = new Date(o.createTime || o.createdAt || o.orderDate)
    if (isNaN(od.getTime())) continue
    for (let i = 0; i < months.length; i++) {
      const md = new Date(now.getFullYear(), now.getMonth() - (5 - i), 1)
      const mdNext = new Date(now.getFullYear(), now.getMonth() - (5 - i) + 1, 1)
      if (od >= md && od < mdNext) {
        months[i].amount += Math.round(Number(o.finalAmount || o.totalAmount || 0))
      }
    }
  }
  return months
})

const hasAnyTrendData = computed(() => orderTrend.value.some(m => m.amount > 0))

const trendLinePoints = computed(() => {
  const data = orderTrend.value
  if (data.length < 2) return ''
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => ((i / (data.length - 1)) * 280 + 10) + ',' + (80 - (d.amount / maxVal) * 60)).join(' ')
})
const trendAreaPoints = computed(() => trendLinePoints.value ? trendLinePoints.value + ' 290,80 10,80' : '')
const trendDots = computed(() => {
  const data = orderTrend.value
  if (data.length < 2) return []
  const maxVal = Math.max(...data.map(d => d.amount), 1)
  return data.map((d, i) => ({ x: (i / (data.length - 1)) * 280 + 10, y: 80 - (d.amount / maxVal) * 60 }))
})
// Smooth cubic bezier curve path
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

const radarAngle = (i: number) => (Math.PI * 2 * i) / 5 - Math.PI / 2
const radarBgPoints = (level: number) => {
  const r = (level / 4) * 65
  return Array.from({ length: 5 }, (_, i) => (100 + r * Math.cos(radarAngle(i))) + ',' + (85 + r * Math.sin(radarAngle(i)))).join(' ')
}
const radarAxisPoint = (i: number) => ({ x: 100 + 65 * Math.cos(radarAngle(i)), y: 85 + 65 * Math.sin(radarAngle(i)) })
const radarDataPoint = (i: number) => {
  const r = (radarDimensions.value[i].value / 100) * 65
  return { x: 100 + r * Math.cos(radarAngle(i)), y: 85 + r * Math.sin(radarAngle(i)) }
}
const radarLabelPoint = (i: number) => ({ x: 100 + 80 * Math.cos(radarAngle(i)), y: 85 + 80 * Math.sin(radarAngle(i)) })
const radarDataPoints = computed(() => Array.from({ length: 5 }, (_, i) => { const p = radarDataPoint(i); return p.x + ',' + p.y }).join(' '))

// Translation maps
const sourceMap: Record<string, string> = { wechat: '微信', wecom: '企微', website: '官网', phone: '电话', referral: '转介绍', exhibition: '展会', ad: '广告', other: '其他', douyin: '抖音', taobao: '淘宝', jd: '京东', offline: '线下', online: '线上', friend: '朋友介绍', self: '自主开发' }
const levelMap: Record<string, string> = { bronze: '青铜', silver: '白银', gold: '黄金', platinum: '铂金', diamond: '钻石', vip: 'VIP', svip: 'SVIP', normal: '普通', important: '重要', key: '关键', strategic: '战略', A: 'A级', B: 'B级', C: 'C级', D: 'D级' }
const transSource = (v: string) => (v && sourceMap[v]) || v || '-'
const transLevel = (v: string) => (v && levelMap[v]) || v || '-'

// Medical history parsing
const allMedicalRecords = computed(() => {
  const raw = props.customer?.medicalHistory
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.sort((a: any, b: any) => new Date(b.createTime || 0).getTime() - new Date(a.createTime || 0).getTime())
    }
    return [{ content: raw }]
  } catch {
    return raw ? [{ content: raw }] : []
  }
})
const latestMedical = computed(() => {
  const rec = allMedicalRecords.value[0]
  return rec?.content || rec || '-'
})
</script>

<style scoped>
.customer-portrait {
  padding: 0;
}
.portrait-section {
  background: #fff;
  border: 1px solid #f0f0f0;
  border-radius: 10px;
  padding: 18px 20px;
  margin-bottom: 16px;
}
.section-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f5f5f5;
}
.section-icon { font-size: 18px; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; }

.score-row {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 8px 0;
}
.score-info { flex: 1; }
.score-label { font-size: 18px; font-weight: 700; color: #303133; }
.score-desc { font-size: 13px; color: #909399; margin-top: 6px; line-height: 1.5; }
.score-mode-hint { font-size: 11px; color: #bdbdbd; margin-top: 4px; }

.star-row {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 10px 0 0;
  border-top: 1px solid #f5f5f5;
  margin-top: 8px;
}
.star-label { font-size: 13px; color: #909399; }
.star-btn {
  font-size: 20px;
  color: #dcdfe6;
  cursor: pointer;
  transition: color .2s, transform .15s;
}
.star-btn:hover { transform: scale(1.2); }
.star-btn.active { color: #f7ba2a; }
.star-text { font-size: 12px; color: #bdbdbd; margin-left: 6px; }

.portrait-grid-layout {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin-bottom: 16px;
}
.portrait-grid-layout > .portrait-section { margin-bottom: 0; }

.metrics-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.metrics-grid.cols-2 { grid-template-columns: repeat(2, 1fr); }
.metric-card {
  text-align: center;
  padding: 12px 8px;
  background: #fafafa;
  border-radius: 8px;
}
.metric-val { font-size: 20px; font-weight: 700; color: #303133; }
.metric-lbl { font-size: 12px; color: #909399; margin-top: 4px; }

.trend-chart { margin-top: 12px; }
.trend-title { font-size: 12px; color: #909399; margin-bottom: 6px; }
.trend-labels { display: flex; justify-content: space-between; font-size: 11px; color: #bdbdbd; }
.trend-empty { text-align: center; padding: 24px 0; }

.wecom-not-bound { text-align: center; padding: 16px 0; }
.wecom-not-bound-icon { font-size: 28px; margin-bottom: 8px; }
.wecom-not-bound-text { font-size: 14px; font-weight: 600; color: #909399; }
.wecom-not-bound-desc { font-size: 12px; color: #bdbdbd; margin-top: 4px; line-height: 1.5; }

.wecom-hint { font-size: 11px; color: #bdbdbd; margin-top: 8px; line-height: 1.4; text-align: center; }

.radar-wrapper { text-align: center; padding: 4px 0; }
.radar-legend { display: flex; flex-direction: column; gap: 6px; }
.radar-legend-item { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #606266; }
.radar-dot { width: 8px; height: 8px; border-radius: 50%; }
.radar-val { margin-left: auto; font-weight: 600; color: #303133; }

.attrs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px 24px;
}
.attr-item { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.attr-label { color: #909399; min-width: 48px; }
.attr-val { color: #303133; }
.attr-val.tag { background: #ecf5ff; color: #409eff; padding: 1px 8px; border-radius: 4px; font-size: 12px; }

.tags-wrap { display: flex; flex-wrap: wrap; gap: 8px; }

@media (max-width: 900px) {
  .portrait-grid-layout { grid-template-columns: 1fr; }
  .attrs-grid { grid-template-columns: repeat(2, 1fr); }
  .metrics-grid { grid-template-columns: repeat(2, 1fr); }
}
</style>


