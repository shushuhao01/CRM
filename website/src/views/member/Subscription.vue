<template>
  <div class="subscription-page">
    <div class="page-card">
      <h2>🔄 订阅管理</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else>
        <!-- ① 当前套餐与订阅状态（始终显示在第一位） -->
        <div class="current-plan-card">
          <div class="plan-card-left">
            <div class="plan-badge">📦 当前套餐</div>
            <div class="plan-name-row">
              <span class="plan-name">{{ profile?.package?.name || '未订购' }}</span>
              <span v-if="subscription" class="sub-status-tag active">🔄 订阅中</span>
              <span v-else class="sub-status-tag inactive">未订阅</span>
            </div>
            <div v-if="subscription" class="sub-detail-row">
              <span>{{ subscription.channel === 'wechat' ? '微信代扣' : '支付宝' }}</span>
              <span>·</span>
              <span>¥{{ subscription.amount }}/{{ subscription.billingCycle === 'yearly' ? '年' : '月' }}</span>
              <span>·</span>
              <span>下次扣款 {{ formatDate(subscription.nextDeductDate) }}</span>
            </div>
            <div v-else class="sub-hint-row">
              💡 开通订阅自动续费，到期自动扣款，省心省力
            </div>
          </div>
          <div class="plan-card-right">
            <button v-if="subscription && subscription.status === 'active'" class="btn-cancel-sub" @click="handleCancel" :disabled="cancelling">
              {{ cancelling ? '处理中...' : '取消订阅' }}
            </button>
          </div>
        </div>

        <!-- ② 可订阅套餐列表 -->
        <div class="plan-section">
          <h4 class="section-title">{{ subscription ? '更换订阅套餐' : '选择订阅套餐' }}</h4>

          <div v-if="subscribablePlans.length === 0" class="empty-plans">
            <p>暂无支持订阅的套餐，请前往 <router-link to="/member/renew">续费升级</router-link> 页面选择套餐</p>
          </div>

          <div v-else class="plan-radio-list">
            <label
              v-for="pkg in subscribablePlans"
              :key="pkg.id"
              class="plan-radio-item"
              :class="{ selected: selectedPlan?.id === pkg.id, current: isCurrentSubPkg(pkg), disabled: isDowngradePkg(pkg) }"
              @click="selectPlan(pkg)"
            >
              <div class="radio-indicator">
                <span class="radio-dot" :class="{ active: selectedPlan?.id === pkg.id }"></span>
              </div>
              <div class="plan-item-info">
                <div class="plan-item-name">
                  {{ pkg.name }}
                  <span v-if="isCurrentSubPkg(pkg)" class="tag-current">当前</span>
                  <span v-if="isDowngradePkg(pkg)" class="tag-downgrade">低于当前套餐</span>
                  <span v-else-if="pkg.is_recommended && !isCurrentSubPkg(pkg)" class="tag-rec">推荐</span>
                </div>
                <div class="plan-item-meta">
                  <template v-if="pkg.user_limit_mode === 'both'">{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }}用户/{{ pkg.max_online_seats }}席位(可选)</template>
                  <template v-else-if="pkg.user_limit_mode === 'online'">{{ pkg.max_online_seats }}席位(在线制)</template>
                  <template v-else>{{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }}用户</template>
                  · {{ pkg.max_storage_gb }}GB存储
                </div>
              </div>
              <div class="plan-item-price">
                ¥{{ pkg.price }}<span class="unit">/月</span>
              </div>
            </label>
          </div>
        </div>

        <!-- ③ 选中套餐后：计费周期 + 价格明细 + 渠道 + 确认 -->
        <div v-if="selectedPlan" class="subscribe-config">
          <!-- 计费周期选择 -->
          <div class="config-section">
            <h4 class="section-title">选择计费周期</h4>
            <div class="cycle-cards">
              <label class="cycle-card" :class="{ selected: selectedCycle === 'monthly' }" @click="selectedCycle = 'monthly'">
                <input type="radio" v-model="selectedCycle" value="monthly" />
                <div class="cycle-card-top">
                  <span class="cycle-name">按月付</span>
                </div>
                <div class="cycle-card-price">¥{{ getSubPrice(selectedPlan, 'monthly') }}<span class="unit">/月</span></div>
                <div class="cycle-card-desc">每月自动扣款</div>
              </label>
              <label class="cycle-card" :class="{ selected: selectedCycle === 'yearly' }" @click="selectedCycle = 'yearly'">
                <input type="radio" v-model="selectedCycle" value="yearly" />
                <div class="cycle-card-top">
                  <span class="cycle-name">按年付</span>
                  <span v-if="getYearlySaving(selectedPlan) > 0" class="cycle-save-badge">省¥{{ getYearlySaving(selectedPlan) }}</span>
                  <span v-if="selectedPlan.yearly_bonus_months > 0" class="cycle-bonus-badge">送{{ selectedPlan.yearly_bonus_months }}月</span>
                </div>
                <div class="cycle-card-price">¥{{ getSubPrice(selectedPlan, 'yearly') }}<span class="unit">/年</span></div>
                <div class="cycle-card-desc">年付更优惠</div>
              </label>
            </div>
          </div>

          <!-- 价格明细 -->
          <div class="price-summary">
            <div class="price-row"><span>套餐</span><span class="val">{{ selectedPlan.name }}</span></div>
            <div class="price-row"><span>原价</span><span class="val">¥{{ selectedCycle === 'yearly' ? (selectedPlan.price * 12).toLocaleString() + '/年' : selectedPlan.price.toLocaleString() + '/月' }}</span></div>
            <div class="price-row" v-if="selectedPlan.subscription_discount_rate > 0">
              <span>订阅折扣</span><span class="val discount">-{{ selectedPlan.subscription_discount_rate }}%</span>
            </div>
            <div class="price-row"><span>订阅价格</span><span class="val highlight">¥{{ getSubPrice(selectedPlan, selectedCycle) }}/{{ selectedCycle === 'yearly' ? '年' : '月' }}</span></div>
            <div v-if="getYearlySaving(selectedPlan) > 0 && selectedCycle === 'yearly'" class="price-row">
              <span>节省</span><span class="val save">¥{{ getYearlySaving(selectedPlan) }}</span>
            </div>
            <div class="price-row total">
              <span>每期扣费金额</span>
              <span class="val">¥{{ getSubPrice(selectedPlan, selectedCycle) }}/{{ selectedCycle === 'yearly' ? '年' : '月' }}</span>
            </div>
          </div>

          <!-- 支付渠道选择 + 确认按钮 同一行 -->
          <div class="config-section subscribe-row">
            <div class="channel-options">
              <label v-if="getChannels(selectedPlan).includes('wechat')" class="channel-option" :class="{ selected: selectedChannel === 'wechat' }">
                <input type="radio" v-model="selectedChannel" value="wechat" />
                <span>微信代扣</span>
              </label>
              <label v-if="getChannels(selectedPlan).includes('alipay')" class="channel-option" :class="{ selected: selectedChannel === 'alipay' }">
                <input type="radio" v-model="selectedChannel" value="alipay" />
                <span>支付宝扣款</span>
              </label>
            </div>
            <button class="btn-subscribe" @click="handleSubscribe" :disabled="subscribing">
              {{ subscribing ? '创建中...' : (subscription && isCurrentSubPkg(selectedPlan!) ? '确认续订并签约' : subscription ? '确认升级并签约' : '确认签约并支付') }}
            </button>
          </div>
          <p class="subscribe-hint">
            {{ subscription && isCurrentSubPkg(selectedPlan!) ? '续订后到期自动续费，新周期从当前到期日后开始计算。随时可取消。' : subscription ? '升级后旧订阅将自动取消，新套餐立即生效。' : '签约后首期立即扣款，之后自动续费。随时可取消。' }}
          </p>
        </div>

        <!-- ④ 签约二维码弹窗 -->
        <div v-if="showSignDialog" class="sign-overlay" @click.self="showSignDialog = false">
          <div class="sign-dialog">
            <div class="sign-dialog-header">
              <h3>📱 扫码完成签约</h3>
              <button class="sign-close" @click="closeSignDialog">&times;</button>
            </div>
            <div class="sign-dialog-body">
              <div class="sign-info">
                <div class="sign-info-row"><span>套餐</span><span>{{ selectedPlan?.name }}</span></div>
                <div class="sign-info-row"><span>渠道</span><span>{{ selectedChannel === 'wechat' ? '微信代扣' : '支付宝' }}</span></div>
                <div class="sign-info-row"><span>周期</span><span>{{ selectedCycle === 'yearly' ? '按年' : '按月' }}</span></div>
                <div class="sign-info-row total"><span>每期扣款</span><span>¥{{ getSubPrice(selectedPlan!, selectedCycle) }}/{{ selectedCycle === 'yearly' ? '年' : '月' }}</span></div>
              </div>

              <!-- 签约二维码 -->
              <div v-if="signQrUrl" class="sign-qr-area">
                <div class="sign-qr-label">
                  请使用{{ selectedChannel === 'wechat' ? '微信' : '支付宝' }}扫码完成签约
                </div>
                <div class="sign-qr-box">
                  <img :src="signQrDataUrl || ''" alt="签约二维码" />
                </div>
                <p class="sign-qr-tip">扫码授权后，系统将自动完成签约并扣除首期费用</p>
                <button class="btn-check-sign" @click="handleCheckSign" :disabled="checkingSign">
                  {{ checkingSign ? '查询中...' : '我已完成签约' }}
                </button>
                <p class="sign-warn">⚠️ 请确保已完成扫码授权签约后再点击</p>
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from 'vue'
import { getMemberProfile } from '@/api/member'
import { getPackages, type Package } from '@/api/packages'
import { createSubscription, cancelSubscription, getSubscriptionStatus } from '@/api/subscription'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const loading = ref(true)
const profile = ref<any>(null)
const subscription = ref<any>(null)
const subscribablePlans = ref<Package[]>([])
const selectedPlan = ref<Package | null>(null)
const selectedChannel = ref('wechat')
const selectedCycle = ref<'monthly' | 'yearly'>('monthly')
const cancelling = ref(false)
const subscribing = ref(false)

// 签约弹窗
const showSignDialog = ref(false)
const signQrUrl = ref('')
const signQrDataUrl = ref('')
const checkingSign = ref(false)

watch(signQrUrl, async (url) => {
  signQrDataUrl.value = url ? await generateQRCodeDataUrl(url) : ''
})
let signPollTimer: ReturnType<typeof setInterval> | null = null

/** 当前订阅的套餐信息（用于升级判断） */
const currentSubPkgId = ref<number | null>(null)

onMounted(async () => {
  try {
    const [p, subStatus, allPlans] = await Promise.all([
      getMemberProfile(),
      getSubscriptionStatus(),
      getPackages('saas')
    ])
    profile.value = p

    if (subStatus && ['active', 'paused'].includes(subStatus.status)) {
      subscription.value = {
        id: subStatus.id,
        hasActive: subStatus.status === 'active',
        status: subStatus.status,
        channel: subStatus.channel,
        amount: Number(subStatus.amount),
        billingCycle: subStatus.billing_cycle,
        nextDeductDate: subStatus.next_deduct_date,
        lastDeductDate: subStatus.last_deduct_date,
        totalDeducted: Number(subStatus.total_deducted),
        deductCount: subStatus.deduct_count,
        signDate: subStatus.sign_date,
        packageName: subStatus.package_name,
        packageId: subStatus.package_id
      }
      currentSubPkgId.value = subStatus.package_id
    }

    subscribablePlans.value = allPlans.filter(pkg =>
      !pkg.is_trial && pkg.price > 0 && pkg.subscription_enabled
    )

    // 默认选中推荐套餐（且可选），或第一个可选的非当前套餐，或当前套餐
    if (subscribablePlans.value.length > 0) {
      const selectablePlans = subscribablePlans.value.filter(p => canSubscribeTo(p))
      const recommended = selectablePlans.find(p => p.is_recommended && !isCurrentSubPkg(p))
      const firstNonCurrent = selectablePlans.find(p => !isCurrentSubPkg(p))
      selectedPlan.value = recommended || firstNonCurrent || selectablePlans[0] || null
    }
  } finally { loading.value = false }
})

onUnmounted(() => { stopSignPolling() })

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'


/** 选择套餐 */
const selectPlan = (pkg: Package) => {
  if (!canSubscribeTo(pkg)) return
  selectedPlan.value = pkg
}

/** 是否为当前订阅的套餐 */
const isCurrentSubPkg = (pkg: Package): boolean => {
  if (!subscription.value) return false
  return Number(pkg.id) === Number(currentSubPkgId.value)
}

/** 是否可订阅目标套餐：只允许订阅 >= 当前套餐级别的套餐 */
const canSubscribeTo = (pkg: Package): boolean => {
  // 获取用户当前实际套餐的价格（不是订阅的套餐，而是租户实际使用的套餐）
  const currentPrice = Number(profile.value?.package?.price || 0)
  const currentMaxUsers = Number(profile.value?.package?.maxUsers || 0)
  // 如果没有当前套餐信息，允许全部
  if (!currentPrice && !currentMaxUsers) return true
  // 允许同套餐续订（价格相同或ID匹配）
  if (Number(pkg.id) === Number(profile.value?.package?.id)) return true
  // 允许更高级套餐（价格更高）
  return pkg.price >= currentPrice
}

/** 是否为低于当前套餐的降级套餐（用于UI展示禁用状态） */
const isDowngradePkg = (pkg: Package): boolean => {
  return !canSubscribeTo(pkg)
}

const getChannels = (pkg: Package): string[] => {
  if (pkg.subscription_channels === 'wechat') return ['wechat']
  if (pkg.subscription_channels === 'alipay') return ['alipay']
  return ['wechat', 'alipay']
}

const getSubPrice = (pkg: Package, cycle: string): string => {
  let amount = pkg.price
  if (cycle === 'yearly') {
    if (pkg.yearly_price && pkg.yearly_price > 0) { amount = pkg.yearly_price }
    else if (pkg.yearly_bonus_months > 0) { amount = pkg.price * (12 - pkg.yearly_bonus_months) }
    else if (pkg.yearly_discount_rate > 0) { amount = Math.round(pkg.price * 12 * (1 - pkg.yearly_discount_rate / 100)) }
    else { amount = pkg.price * 10 }
  }
  if (pkg.subscription_discount_rate > 0) {
    amount = Math.round(amount * (1 - pkg.subscription_discount_rate / 100))
  }
  return amount.toLocaleString()
}

const getYearlySaving = (pkg: Package): number => {
  const monthlyTotal = pkg.price * 12
  const yearlyNum = parseFloat(getSubPrice(pkg, 'yearly').replace(/,/g, ''))
  const monthlyNum = parseFloat(getSubPrice(pkg, 'monthly').replace(/,/g, '')) * 12
  return Math.max(0, Math.round(monthlyNum - yearlyNum))
}

const handleCancel = async () => {
  if (!subscription.value?.id) return
  if (!confirm('确定要取消订阅吗？取消后当前计费周期内服务仍然有效。')) return
  cancelling.value = true
  try {
    const result = await cancelSubscription(subscription.value.id)
    if (result.success) {
      alert(`${result.message}\n生效日期：${result.effectiveDate || '-'}`)
      window.location.reload()
    } else {
      alert(result.message)
    }
  } finally { cancelling.value = false }
}

const handleSubscribe = async () => {
  if (!selectedPlan.value) return
  if (subscription.value && !isCurrentSubPkg(selectedPlan.value!) && !confirm(`确定升级到「${selectedPlan.value.name}」？旧订阅将自动取消。`)) return
  if (subscription.value && isCurrentSubPkg(selectedPlan.value!) && !confirm(`确定续订「${selectedPlan.value.name}」？当前到期后将自动续费。`)) return
  subscribing.value = true
  try {
    const result = await createSubscription({
      packageId: selectedPlan.value.id,
      channel: selectedChannel.value as 'wechat' | 'alipay',
      billingCycle: selectedCycle.value
    })
    if (result.success && result.data) {
      if (result.data.signUrl) {
        // 显示签约二维码
        signQrUrl.value = result.data.signUrl
        showSignDialog.value = true
        startSignPolling()
      } else {
        alert('签约链接获取失败，请稍后重试')
      }
    } else {
      alert(result.message)
    }
  } finally { subscribing.value = false }
}

/** 开始轮询签约状态 */
const startSignPolling = () => {
  stopSignPolling()
  signPollTimer = setInterval(async () => {
    try {
      const status = await getSubscriptionStatus()
      if (status && status.status === 'active') {
        stopSignPolling()
        alert('✅ 签约成功！订阅已生效。')
        window.location.reload()
      }
    } catch { /* ignore */ }
  }, 5000)
}

const stopSignPolling = () => {
  if (signPollTimer) { clearInterval(signPollTimer); signPollTimer = null }
}

const closeSignDialog = () => {
  showSignDialog.value = false
  stopSignPolling()
}

/** 手动检查签约状态 */
const handleCheckSign = async () => {
  checkingSign.value = true
  try {
    const status = await getSubscriptionStatus()
    if (status && status.status === 'active') {
      stopSignPolling()
      alert('✅ 签约成功！订阅已生效。')
      window.location.reload()
    } else {
      alert('⚠️ 尚未检测到签约成功，请确认已完成扫码授权后再试')
    }
  } finally { checkingSign.value = false }
}
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.page-card h2 { margin: 0 0 20px; font-size: 18px; color: #1e293b; }
.loading { text-align: center; padding: 40px; color: #94a3b8; }

// ① 当前套餐卡片
.current-plan-card {
  display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;
  padding: 18px 20px; border-radius: 12px; margin-bottom: 24px;
  background: linear-gradient(135deg, #f8f7ff 0%, #f0f9ff 100%);
  border: 1px solid #e0e7ff;
}
.plan-card-left { flex: 1; min-width: 0; }
.plan-badge { font-size: 11px; color: #6366f1; font-weight: 600; margin-bottom: 6px; text-transform: uppercase; letter-spacing: 1px; }
.plan-name-row { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.plan-name { font-size: 18px; font-weight: 700; color: #1e293b; }
.sub-status-tag {
  font-size: 11px; padding: 2px 10px; border-radius: 10px; font-weight: 600;
  &.active { background: #dcfce7; color: #16a34a; }
  &.inactive { background: #f1f5f9; color: #94a3b8; }
}
.sub-detail-row { font-size: 13px; color: #64748b; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.sub-hint-row { font-size: 13px; color: #0369a1; }
.btn-cancel-sub { padding: 8px 18px; border: 1px solid #fca5a5; border-radius: 8px; background: white; color: #dc2626; cursor: pointer; font-size: 12px; font-weight: 500; &:disabled { opacity: 0.5; } &:hover { background: #fef2f2; } }

// ② 套餐列表
.plan-section { margin-bottom: 20px; }
.section-title { font-size: 14px; font-weight: 600; color: #475569; margin: 0 0 12px; }
.empty-plans { text-align: center; padding: 20px; color: #94a3b8; font-size: 14px; a { color: #6366f1; } }

.plan-radio-list { display: flex; flex-direction: column; gap: 8px; }
.plan-radio-item {
  display: flex; align-items: center; gap: 12px; padding: 14px 16px;
  border: 1.5px solid #e2e8f0; border-radius: 10px; cursor: pointer; transition: all 0.15s;
  &:hover { border-color: #c7d2fe; background: #fafaff; }
  &.selected { border-color: #6366f1; background: #f8f7ff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
  &.current { border-color: #bbf7d0; background: #f0fdf4; }
  &.disabled { opacity: 0.5; cursor: not-allowed; border-color: #f1f5f9; background: #f8fafc; &:hover { border-color: #f1f5f9; background: #f8fafc; } }
}
.radio-indicator { width: 20px; height: 20px; flex-shrink: 0; }
.radio-dot {
  display: block; width: 18px; height: 18px; border-radius: 50%; border: 2px solid #cbd5e1; transition: all 0.15s;
  &.active { border-color: #6366f1; background: #6366f1; box-shadow: inset 0 0 0 3px white; }
}
.plan-item-info { flex: 1; min-width: 0; }
.plan-item-name { font-size: 14px; font-weight: 600; color: #1e293b; display: flex; align-items: center; gap: 6px; }
.plan-item-meta { font-size: 12px; color: #94a3b8; margin-top: 2px; }
.plan-item-price { font-size: 16px; font-weight: 700; color: #6366f1; white-space: nowrap; .unit { font-size: 12px; font-weight: 400; color: #94a3b8; } }
.tag-current { display: inline-block; font-size: 10px; background: #6366f1; color: white; padding: 1px 6px; border-radius: 4px; }
.tag-rec { display: inline-block; font-size: 10px; background: #f59e0b; color: white; padding: 1px 6px; border-radius: 4px; }
.tag-downgrade { display: inline-block; font-size: 10px; background: #e2e8f0; color: #94a3b8; padding: 1px 6px; border-radius: 4px; }

// ③ 配置区域
.subscribe-config { margin-top: 24px; padding-top: 24px; border-top: 1px solid #f1f5f9; }
.config-section { margin-bottom: 20px; }

.cycle-cards { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.cycle-card {
  border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 16px; cursor: pointer; text-align: center; transition: all 0.2s; position: relative;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; box-shadow: 0 0 0 3px rgba(99,102,241,0.1); }
}
.cycle-card-top { display: flex; align-items: center; justify-content: center; gap: 6px; margin-bottom: 6px; }
.cycle-name { font-size: 13px; font-weight: 600; color: #475569; }
.cycle-save-badge { font-size: 10px; background: #f0fdf4; color: #16a34a; padding: 1px 6px; border-radius: 4px; }
.cycle-bonus-badge { font-size: 10px; background: #fffbeb; color: #d97706; padding: 1px 6px; border-radius: 4px; }
.cycle-card-price { font-size: 22px; font-weight: 700; color: #1e293b; .unit { font-size: 13px; font-weight: 400; color: #94a3b8; } }
.cycle-card-desc { font-size: 11px; color: #94a3b8; margin-top: 4px; }

// 价格明细
.price-summary { background: #f8fafc; border-radius: 10px; padding: 16px 18px; margin-bottom: 20px; }
.price-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0; .val { color: #1e293b; font-weight: 500; } }
.price-row .val.discount { color: #16a34a; font-weight: 600; }
.price-row .val.highlight { color: #6366f1; font-weight: 600; }
.price-row .val.save { color: #f59e0b; font-weight: 600; }
.price-row.total { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 10px; font-size: 15px; font-weight: 700; color: #6366f1; .val { color: #6366f1; } }

// 渠道选择
.channel-options { display: flex; gap: 10px; }
.channel-option {
  flex: 1; display: flex; align-items: center; justify-content: center; gap: 6px; padding: 12px 14px;
  border: 1.5px solid #e2e8f0; border-radius: 8px; cursor: pointer; font-size: 13px; transition: all 0.2s;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
}

.btn-subscribe { flex: 1; padding: 12px 20px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; white-space: nowrap; text-align: center; &:hover { background: #4f46e5; } &:disabled { opacity: 0.6; cursor: not-allowed; } }
.subscribe-row { display: flex; align-items: stretch; gap: 12px; margin-top: 20px; }
.subscribe-row .channel-options { flex: 2; min-width: 0; }
.subscribe-row .btn-subscribe { flex: 1; }
.subscribe-hint { font-size: 12px; color: #94a3b8; text-align: center; margin-top: 8px; }

// ④ 签约弹窗
.sign-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15,23,42,0.4); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 1000; }
.sign-dialog { background: white; border-radius: 14px; width: 440px; max-width: 92vw; box-shadow: 0 20px 60px rgba(0,0,0,0.15); }
.sign-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 18px 22px; border-bottom: 1px solid #f1f5f9; h3 { margin: 0; font-size: 15px; color: #1e293b; } }
.sign-close { border: none; background: none; font-size: 22px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } }
.sign-dialog-body { padding: 22px; }
.sign-info { background: #f8fafc; border-radius: 10px; padding: 14px 16px; margin-bottom: 16px; }
.sign-info-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0; }
.sign-info-row.total { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; font-size: 15px; font-weight: 700; color: #6366f1; }

.sign-qr-area { text-align: center; }
.sign-qr-label { font-size: 14px; color: #475569; margin-bottom: 12px; font-weight: 500; }
.sign-qr-box { display: inline-block; padding: 12px; border: 2px solid #e2e8f0; border-radius: 12px; margin-bottom: 10px; img { width: 200px; height: 200px; display: block; } }
.sign-qr-tip { font-size: 12px; color: #94a3b8; margin: 0 0 14px; }
.btn-check-sign { padding: 10px 28px; background: #6366f1; color: white; border: none; border-radius: 8px; font-size: 14px; font-weight: 600; cursor: pointer; &:disabled { opacity: 0.5; } &:hover { background: #4f46e5; } }
.sign-warn { font-size: 11px; color: #f59e0b; margin: 8px 0 0; }


@media (max-width: 768px) {
  .cycle-cards { grid-template-columns: 1fr; }
  .channel-options { flex-direction: column; }
  .plan-item-price { font-size: 14px; }
}
</style>
