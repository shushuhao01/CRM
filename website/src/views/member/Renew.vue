<template>
  <div class="renew-page">
    <div class="page-card">
      <h2>💳 续费升级</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else-if="profile">
        <!-- 当前套餐信息 -->
        <div class="current-plan">
          <span class="label">当前套餐：</span>
          <span class="plan-name">{{ profile.package?.name || '无' }}</span>
          <span class="plan-type-tag" :class="profile.package?.type || 'saas'">
            {{ profile.package?.type === 'private' ? '私有部署' : 'SaaS' }}
          </span>
          <span class="expire" :class="{ danger: profile.license?.daysRemaining <= 0 }">
            {{ profile.license?.daysRemaining > 0 ? `剩余${profile.license.daysRemaining}天` : '已过期' }}
          </span>
        </div>

        <!-- SaaS/私有 标签选项卡 -->
        <div class="plan-type-tabs">
          <button :class="{ active: planTab === 'saas' }" @click="planTab = 'saas'">
            ☁️ SaaS云端版
          </button>
          <button :class="{ active: planTab === 'private' }" @click="planTab = 'private'">
            🏢 私有部署版
          </button>
        </div>

        <!-- SaaS套餐：计费周期切换 -->
        <div v-if="planTab === 'saas'" class="billing-toggle">
          <button :class="{ active: billingCycle === 'monthly' }" @click="billingCycle = 'monthly'">按月</button>
          <button :class="{ active: billingCycle === 'yearly' }" @click="billingCycle = 'yearly'">按年付（更划算）</button>
        </div>

        <!-- 私有部署：计费模式切换 -->
        <div v-if="planTab === 'private'" class="billing-toggle">
          <button :class="{ active: privateBillingMode === 'annual' }" @click="privateBillingMode = 'annual'">年度授权</button>
          <button :class="{ active: privateBillingMode === 'perpetual' }" @click="privateBillingMode = 'perpetual'">永久授权</button>
        </div>

        <!-- 套餐列表 -->
        <div class="plans-grid">
          <div
            v-for="pkg in filteredPlans"
            :key="pkg.id"
            class="plan-card"
            :class="{ current: pkg.code === profile.package?.code, recommended: pkg.is_recommended }"
          >
            <div v-if="pkg.is_recommended" class="rec-badge">推荐</div>
            <div v-if="pkg.code === profile.package?.code" class="cur-badge">当前</div>
            <h3>{{ pkg.name }}</h3>
            <div class="plan-price">
              <span class="amount">¥{{ getDisplayPrice(pkg) }}</span>
              <span class="unit">{{ getPriceUnit(pkg) }}</span>
            </div>
            <div v-if="planTab === 'saas' && billingCycle === 'yearly'" class="yearly-save">
              省 ¥{{ getSaveAmount(pkg) }}
            </div>
            <div v-if="pkg.subscription_enabled && pkg.subscription_discount_rate > 0" class="sub-price">
              订阅价 ¥{{ getSubDiscountPrice(pkg) }}{{ getPriceUnit(pkg) }}
            </div>
            <ul class="plan-features">
              <li v-for="f in (pkg.features || []).slice(0, 4)" :key="f">✓ {{ f }}</li>
              <li v-if="pkg.user_limit_mode === 'both'">👥 {{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }}用户 / {{ pkg.max_online_seats }}席位</li>
              <li v-else-if="pkg.user_limit_mode === 'online'">🟢 {{ pkg.max_online_seats }}个在线席位</li>
              <li v-else>👥 {{ pkg.max_users >= 99999 ? '不限' : pkg.max_users }}用户</li>
              <li>💾 {{ pkg.max_storage_gb }}GB存储</li>
            </ul>
            <button v-if="canUpgrade(pkg)" class="btn-upgrade" @click="handleUpgrade(pkg)">
              {{ getUpgradeLabel(pkg) }}
            </button>
            <button v-else-if="isDowngrade(pkg)" class="btn-downgrade" disabled>
              联系客服降级
            </button>
          </div>
        </div>

        <!-- 提示 -->
        <div class="renew-tips">
          <p>💡 升级套餐后立即生效，剩余时长自动折算</p>
          <p>📞 如需降级套餐请联系客服，客服将为您调整</p>
          <p>🔄 如需开通自动续费，请前往 <router-link to="/member/subscription">订阅管理</router-link></p>
        </div>

        <!-- 升级支付弹窗 -->
        <div v-if="showPayDialog" class="pay-overlay" @click.self="showPayDialog = false">
          <div class="pay-dialog">
            <div class="pay-dialog-header">
              <h3>{{ isCurrentPlan ? '续费' : '升级' }} — {{ upgradePkg?.name }}</h3>
              <button class="pay-close" @click="showPayDialog = false">&times;</button>
            </div>
            <div class="pay-dialog-body">
              <!-- 左侧：支付信息 -->
              <div class="pay-left">
                <div class="pay-info">
                  <div class="pay-info-row"><span>套餐</span><span>{{ upgradePkg?.name }}</span></div>
                  <div class="pay-info-row"><span>类型</span><span>{{ planTab === 'private' ? '私有部署' : 'SaaS云端' }}</span></div>
                  <div class="pay-info-row"><span>计费</span><span>{{ getPayCycleText() }}</span></div>
                  <div class="pay-info-row total"><span>应付金额</span><span>¥{{ payAmount }}</span></div>
                </div>

                <h4>选择支付方式</h4>
                <div class="pay-methods">
                  <label class="pay-method" :class="{ selected: payMethod === 'wechat' }" @click="switchRenewPayMethod('wechat')">
                    <input type="radio" v-model="payMethod" value="wechat" />
                    <span>💚 微信支付</span>
                  </label>
                  <label class="pay-method" :class="{ selected: payMethod === 'alipay' }" @click="switchRenewPayMethod('alipay')">
                    <input type="radio" v-model="payMethod" value="alipay" />
                    <span>💙 支付宝</span>
                  </label>
                </div>

                <button class="btn-check-pay" v-if="payQrCode" @click="checkPayStatus" :disabled="checkingPay" style="width:100%;margin-top:8px;">
                  {{ checkingPay ? '查询中...' : '我已支付' }}
                </button>
              </div>

              <!-- 右侧：二维码区域 -->
              <div class="pay-right" v-if="payQrCode || paying || payNoConfig">
                <div v-if="paying" class="qr-section">
                  <p class="qr-tip">正在生成二维码...</p>
                  <div style="text-align:center;padding:20px;"><span class="loading-spinner-renew"></span></div>
                </div>
                <div v-else-if="payNoConfig" class="qr-no-config">
                  <div class="no-config-icon">⚠️</div>
                  <p>{{ payMethod === 'wechat' ? '微信' : '支付宝' }}支付尚未配置商户信息</p>
                  <p class="sub-text">请联系管理员配置或选择对公转账</p>
                </div>
                <div v-else class="qr-section">
                  <p class="qr-tip">请使用{{ payMethod === 'wechat' ? '微信' : '支付宝' }}扫码支付</p>
                  <div class="qr-code">
                    <img :src="payQrCode" alt="支付二维码" v-if="payQrCode.startsWith('http') || payQrCode.startsWith('data:')" />
                    <div v-else class="qr-text">{{ payQrCode }}</div>
                  </div>
                  <button class="btn-check-pay" @click="checkPayStatus" :disabled="checkingPay">
                    {{ checkingPay ? '查询中...' : '我已支付' }}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 升级成功弹窗 -->
        <div v-if="upgradeSuccess" class="pay-overlay">
          <div class="pay-dialog success-dialog">
            <div class="success-icon">✅</div>
            <h3>{{ isCurrentPlan ? '续费' : '升级' }}成功！</h3>
            <p>您的套餐已更新为 <strong>{{ upgradePkg?.name }}</strong></p>
            <p v-if="newLicenseKey" class="license-info">授权码：{{ newLicenseKey }}</p>
            <button class="btn-pay" @click="handleUpgradeComplete">确定</button>
          </div>
        </div>
      </template>
      <div v-else style="text-align:center;padding:60px 0;color:#94a3b8;">
        <div style="font-size:48px;margin-bottom:16px;">💳</div>
        <p style="font-size:15px;margin:0 0 8px;">暂无法加载续费升级信息</p>
        <p style="font-size:13px;margin:0;">请检查网络连接或 <a href="/member/login" style="color:#6366f1;">重新登录</a></p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMemberProfile } from '@/api/member'
import { getPackages, type Package, getYearlyTotal, getYearlySaving } from '@/api/packages'
import { getMemberToken } from '@/api/member'
import { generateQRCodeDataUrl } from '@/utils/qrcode'

const API_BASE = '/api/v1'

const loading = ref(true)
const profile = ref<any>(null)
const saasPlans = ref<Package[]>([])
const privatePlans = ref<Package[]>([])
const planTab = ref<'saas' | 'private'>('saas')
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const privateBillingMode = ref<'annual' | 'perpetual'>('annual')

// 支付相关
const showPayDialog = ref(false)
const upgradePkg = ref<Package | null>(null)
const isCurrentPlan = ref(false)
const payMethod = ref('wechat')
const paying = ref(false)
const payQrCode = ref('')
const payNoConfig = ref(false)
const payOrderNo = ref('')
const checkingPay = ref(false)
const upgradeSuccess = ref(false)
const newLicenseKey = ref('')
const payAmount = ref('')

onMounted(async () => {
  try {
    const [p, saas, pvt] = await Promise.all([
      getMemberProfile(),
      getPackages('saas'),
      getPackages('private')
    ])
    profile.value = p
    saasPlans.value = saas.filter(pkg => !pkg.is_trial && pkg.price > 0)
    privatePlans.value = pvt.filter(pkg => pkg.price > 0)

    // 根据当前套餐类型设置默认标签
    if (profile.value?.package?.type === 'private') {
      planTab.value = 'private'
    }
  } finally { loading.value = false }
})

const filteredPlans = computed(() => {
  return planTab.value === 'saas' ? saasPlans.value : privatePlans.value
})

/** 获取显示价格 */
const getDisplayPrice = (pkg: Package): string => {
  if (planTab.value === 'private') {
    if (privateBillingMode.value === 'annual' && pkg.yearly_price && pkg.yearly_price > 0) {
      return Math.round(pkg.yearly_price).toLocaleString()
    }
    return Math.round(pkg.price).toLocaleString()
  }
  if (billingCycle.value === 'yearly') {
    return getYearlyTotal(pkg.price, pkg).toLocaleString()
  }
  return pkg.price.toLocaleString()
}

/** 获取价格单位 */
const getPriceUnit = (pkg: Package): string => {
  if (planTab.value === 'private') {
    return privateBillingMode.value === 'annual' ? '/年' : ''
  }
  return billingCycle.value === 'yearly' ? '/年' : '/月'
}

/** 获取年付节省金额 */
const getSaveAmount = (pkg: Package): string => {
  return getYearlySaving(pkg.price, pkg).toLocaleString()
}

/** 获取订阅折扣价 */
const getSubDiscountPrice = (pkg: Package): string => {
  const base = billingCycle.value === 'yearly' ? getYearlyTotal(pkg.price, pkg) : pkg.price
  return Math.round(base * (1 - pkg.subscription_discount_rate / 100)).toLocaleString()
}

/** 是否可升级 */
const canUpgrade = (pkg: Package): boolean => {
  const currentPrice = profile.value?.package?.price || 0
  const currentType = profile.value?.package?.type || 'saas'
  // 同类型：允许续费或升级
  if (pkg.type === currentType) return pkg.price >= currentPrice
  // 跨类型升级始终允许
  return true
}

/** 是否为降级 */
const isDowngrade = (pkg: Package): boolean => {
  const currentPrice = profile.value?.package?.price || 0
  return pkg.type === (profile.value?.package?.type || 'saas') && pkg.price < currentPrice
}

/** 获取按钮文案 */
const getUpgradeLabel = (pkg: Package): string => {
  if (pkg.code === profile.value?.package?.code) return '续费'
  return '升级'
}

/** 获取支付周期文案 */
const getPayCycleText = (): string => {
  if (planTab.value === 'private') return privateBillingMode.value === 'annual' ? '年度授权' : '永久授权'
  return billingCycle.value === 'yearly' ? '按年付' : '按月付'
}

/** 计算支付金额 */
const calcPayAmount = (pkg: Package): string => {
  if (planTab.value === 'private') {
    if (privateBillingMode.value === 'annual' && pkg.yearly_price && pkg.yearly_price > 0) {
      return Math.round(pkg.yearly_price).toLocaleString()
    }
    return Math.round(pkg.price).toLocaleString()
  }
  if (billingCycle.value === 'yearly') {
    return getYearlyTotal(pkg.price, pkg).toLocaleString()
  }
  return pkg.price.toLocaleString()
}

/** 点击升级/续费 → 打开支付弹窗并自动生成二维码 */
const handleUpgrade = (pkg: Package) => {
  upgradePkg.value = pkg
  isCurrentPlan.value = pkg.code === profile.value?.package?.code
  payAmount.value = calcPayAmount(pkg)
  payQrCode.value = ''
  payNoConfig.value = false
  payOrderNo.value = ''
  upgradeSuccess.value = false
  newLicenseKey.value = ''
  payMethod.value = 'wechat'
  showPayDialog.value = true
  // 自动生成二维码
  handlePay()
}

/** 切换支付方式时自动重新生成二维码 */
const switchRenewPayMethod = (method: string) => {
  if (payMethod.value === method) return
  payMethod.value = method
  payQrCode.value = ''
  payNoConfig.value = false
  payOrderNo.value = ''
  handlePay()
}

/** 提交支付 */
const handlePay = async () => {
  if (!upgradePkg.value) return
  paying.value = true
  try {
    const token = getMemberToken()
    const res = await fetch(`${API_BASE}/public/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': `Bearer ${token}` } : {}) },
      body: JSON.stringify({
        packageId: upgradePkg.value.id,
        packageName: upgradePkg.value.name,
        amount: parseFloat(payAmount.value.replace(/,/g, '')),
        payType: payMethod.value,
        tenantId: profile.value?.tenant?.id,
        tenantName: profile.value?.tenant?.name,
        contactName: profile.value?.tenant?.contact || profile.value?.tenant?.name,
        contactPhone: profile.value?.tenant?.fullPhone || '',
        contactEmail: profile.value?.tenant?.email || '',
        billingCycle: planTab.value === 'private' ? privateBillingMode.value : billingCycle.value
      })
    })
    const data = await res.json()

    if (data.code === 0 && data.data) {
      payOrderNo.value = data.data.orderNo || ''
      payNoConfig.value = false
      if (data.data.qrCode && data.data.qrCode.startsWith('data:')) {
        payQrCode.value = data.data.qrCode
      } else if (data.data.payUrl || data.data.qrCode) {
        payQrCode.value = await generateQRCodeDataUrl(data.data.payUrl || data.data.qrCode)
      } else {
        payNoConfig.value = true
        return
      }
    } else {
      alert(data.message || '创建订单失败')
    }
  } catch (err: any) {
    alert('网络错误: ' + (err.message || ''))
  } finally {
    paying.value = false
  }
}

/** 查询支付状态 */
const checkPayStatus = async () => {
  if (!payOrderNo.value) return
  checkingPay.value = true
  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${payOrderNo.value}`)
    const data = await res.json()
    if (data.code === 0 && data.data?.status === 'paid') {
      newLicenseKey.value = data.data.licenseKey || ''
      showPayDialog.value = false
      upgradeSuccess.value = true
    } else {
      alert('支付尚未完成，请稍后再试')
    }
  } finally {
    checkingPay.value = false
  }
}


/** 升级完成 → 刷新页面 */
const handleUpgradeComplete = () => {
  window.location.reload()
}
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.page-card h2 { margin: 0 0 24px; font-size: 18px; color: #1e293b; }
.loading { text-align: center; padding: 40px; color: #94a3b8; }

.current-plan {
  display: flex; align-items: center; gap: 10px; padding: 14px 18px;
  background: #f8fafc; border-radius: 10px; margin-bottom: 20px; font-size: 14px;
  .label { color: #64748b; }
  .plan-name { font-weight: 600; color: #6366f1; }
  .expire { margin-left: auto; font-size: 13px; color: #16a34a; &.danger { color: #dc2626; } }
}
.plan-type-tag {
  font-size: 11px; padding: 2px 8px; border-radius: 4px; font-weight: 500;
  &.saas { background: #dbeafe; color: #2563eb; }
  &.private { background: #fef3c7; color: #d97706; }
}

// 标签选项卡
.plan-type-tabs {
  display: flex; background: #f1f5f9; border-radius: 10px; padding: 3px; margin-bottom: 16px;
  button {
    flex: 1; padding: 10px; border: none; background: none; border-radius: 8px;
    cursor: pointer; font-size: 14px; color: #64748b; transition: all 0.2s;
    &.active { background: white; color: #6366f1; font-weight: 600; box-shadow: 0 1px 4px rgba(0,0,0,0.08); }
  }
}

.billing-toggle {
  display: flex; gap: 8px; margin-bottom: 20px;
  button {
    padding: 8px 18px; border: 1.5px solid #e2e8f0; border-radius: 8px;
    background: white; cursor: pointer; font-size: 13px; color: #64748b; transition: all 0.2s;
    &.active { border-color: #6366f1; color: #6366f1; background: #f8f7ff; font-weight: 600; }
  }
}

.plans-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 16px; margin-bottom: 24px; }
.plan-card {
  border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 20px; position: relative;
  text-align: center; transition: all 0.2s;
  &.current { border-color: #6366f1; background: #fafaff; }
  &.recommended { border-color: #f59e0b; }
  &:hover { box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
}
.rec-badge { position: absolute; top: -1px; right: 16px; background: #f59e0b; color: white; font-size: 11px; padding: 2px 10px; border-radius: 0 0 6px 6px; font-weight: 600; }
.cur-badge { position: absolute; top: -1px; left: 16px; background: #6366f1; color: white; font-size: 11px; padding: 2px 10px; border-radius: 0 0 6px 6px; font-weight: 600; }
.plan-card h3 { margin: 0 0 10px; font-size: 16px; color: #1e293b; }
.plan-price { margin-bottom: 4px; .amount { font-size: 28px; font-weight: 700; color: #1e293b; } .unit { font-size: 13px; color: #94a3b8; } }
.yearly-save { font-size: 11px; color: #f59e0b; margin-bottom: 6px; }
.sub-price { font-size: 12px; color: #16a34a; margin-bottom: 12px; background: #f0fdf4; display: inline-block; padding: 2px 10px; border-radius: 10px; }
.plan-features { list-style: none; padding: 0; margin: 0 0 16px; text-align: left; li { font-size: 12px; color: #475569; padding: 3px 0; } }
.btn-upgrade { width: 100%; padding: 10px; background: #6366f1; color: white; border: none; border-radius: 8px; cursor: pointer; font-weight: 600; font-size: 13px; &:hover { opacity: 0.9; } }
.btn-downgrade { width: 100%; padding: 10px; border: 1px solid #e2e8f0; border-radius: 8px; background: #f8fafc; color: #94a3b8; font-size: 12px; cursor: not-allowed; }
.renew-tips { padding: 14px 18px; background: #fffbeb; border-radius: 10px; p { margin: 0 0 4px; font-size: 12px; color: #92400e; &:last-child { margin: 0; } a { color: #6366f1; } } }

// 支付弹窗
.pay-overlay {
  position: fixed; top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(15,23,42,0.4); backdrop-filter: blur(4px);
  display: flex; align-items: center; justify-content: center; z-index: 1000;
}
.pay-dialog {
  background: white; border-radius: 16px; width: 640px; max-width: 92vw;
  max-height: 90vh; overflow-y: auto; box-shadow: 0 20px 60px rgba(0,0,0,0.15);
}
.pay-dialog-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 20px 24px; border-bottom: 1px solid #f1f5f9;
  h3 { margin: 0; font-size: 16px; color: #1e293b; }
}
.pay-close { border: none; background: none; font-size: 22px; color: #94a3b8; cursor: pointer; &:hover { color: #1e293b; } }
.pay-dialog-body { padding: 24px; display: flex; gap: 24px; }
.pay-dialog-body h4 { font-size: 14px; color: #475569; margin: 20px 0 10px; }

.pay-left { flex: 1; min-width: 0; }
.pay-right {
  width: 220px; flex-shrink: 0; display: flex; align-items: center; justify-content: center;
  border-left: 1px solid #f1f5f9; padding-left: 24px;
}

.pay-info { background: #f8fafc; border-radius: 10px; padding: 14px 16px; }
.pay-info-row { display: flex; justify-content: space-between; font-size: 13px; color: #64748b; padding: 4px 0; }
.pay-info-row.total { border-top: 1px solid #e2e8f0; margin-top: 6px; padding-top: 8px; font-size: 16px; font-weight: 700; color: #6366f1; }

.pay-methods { display: flex; gap: 12px; margin-bottom: 20px; }
.pay-method {
  flex: 1; display: flex; align-items: center; gap: 8px; padding: 12px; border: 1.5px solid #e2e8f0;
  border-radius: 10px; cursor: pointer; font-size: 13px; transition: all 0.2s;
  input { display: none; }
  &.selected { border-color: #6366f1; background: #f8f7ff; }
}

.btn-pay {
  width: 100%; padding: 14px; background: #6366f1; color: white; border: none;
  border-radius: 10px; font-size: 15px; font-weight: 600; cursor: pointer;
  &:hover { background: #4f46e5; }
  &:disabled { opacity: 0.6; cursor: not-allowed; }
}

.qr-section { text-align: center; }
.qr-tip { font-size: 13px; color: #64748b; margin-bottom: 12px; }
.qr-code { display: inline-block; padding: 12px; background: white; border: 1px solid #e2e8f0; border-radius: 8px; margin-bottom: 12px; }
.qr-code img { width: 180px; height: 180px; }
.qr-text { font-size: 12px; color: #64748b; word-break: break-all; max-width: 180px; }
.btn-check-pay { padding: 8px 20px; border: 1.5px solid #6366f1; border-radius: 8px; background: white; color: #6366f1; cursor: pointer; font-size: 12px; &:disabled { opacity: 0.5; } }

.qr-no-config { text-align: center; padding: 12px; .no-config-icon { font-size: 36px; margin-bottom: 8px; } p { margin: 0 0 4px; font-size: 13px; color: #d97706; } .sub-text { font-size: 11px; color: #94a3b8; } }

.loading-spinner-renew {
  display: inline-block; width: 20px; height: 20px;
  border: 2px solid #e2e8f0; border-top-color: #6366f1;
  border-radius: 50%; animation: spin-renew 0.8s linear infinite;
}
@keyframes spin-renew { to { transform: rotate(360deg); } }

.success-dialog { text-align: center; padding: 40px 32px; }
.success-icon { font-size: 48px; margin-bottom: 12px; }
.success-dialog h3 { margin: 0 0 8px; font-size: 20px; color: #1e293b; }
.success-dialog p { font-size: 14px; color: #64748b; margin: 0 0 6px; strong { color: #6366f1; } }
.license-info { font-size: 12px; color: #94a3b8; word-break: break-all; margin-top: 8px !important; }
.success-dialog .btn-pay { margin-top: 20px; }

@media (max-width: 768px) {
  .plans-grid { grid-template-columns: 1fr; }
  .pay-dialog { width: 100%; margin: 16px; }
  .pay-dialog-body { flex-direction: column; }
  .pay-right { width: 100%; border-left: none; padding-left: 0; border-top: 1px solid #f1f5f9; padding-top: 16px; }
}
</style>

