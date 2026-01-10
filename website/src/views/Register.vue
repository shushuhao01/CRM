<template>
  <div class="register-page">
    <div class="register-container">
      <!-- 左侧信息 -->
      <div class="register-info">
        <div class="info-content">
          <h1>开启智能销售之旅</h1>
          <p>注册即可免费试用7天，体验全部功能</p>

          <div class="benefits">
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>7天免费试用</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>无需信用卡</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>随时取消</span>
            </div>
            <div class="benefit-item">
              <span class="benefit-icon">✓</span>
              <span>专业客服支持</span>
            </div>
          </div>

          <div class="testimonial">
            <p>"使用云客CRM后，我们团队的销售效率提升了50%，强烈推荐！"</p>
            <div class="testimonial-author">
              <span class="author-name">— 张总监</span>
              <span class="author-company">某电商公司</span>
            </div>
          </div>
        </div>
      </div>

      <!-- 右侧表单 -->
      <div class="register-form-wrapper">
        <div class="form-header">
          <h2>创建账号</h2>
          <p>已有账号？<a href="https://app.yunke-crm.com">立即登录</a></p>
        </div>

        <!-- 步骤指示器 -->
        <div class="steps">
          <div class="step" :class="{ active: step >= 1, done: step > 1 }">
            <span class="step-num">1</span>
            <span class="step-text">选择套餐</span>
          </div>
          <div class="step-line" :class="{ active: step > 1 }"></div>
          <div class="step" :class="{ active: step >= 2, done: step > 2 }">
            <span class="step-num">2</span>
            <span class="step-text">填写信息</span>
          </div>
          <div class="step-line" :class="{ active: step > 2 }"></div>
          <div class="step" :class="{ active: step >= 3 }">
            <span class="step-num">3</span>
            <span class="step-text">{{ selectedPlan === 'FREE_TRIAL' ? '完成注册' : '完成支付' }}</span>
          </div>
        </div>

        <!-- 已选套餐提示 -->
        <div class="selected-plan-banner" :class="{ free: selectedPlan === 'FREE_TRIAL' }">
          <span class="banner-icon">{{ selectedPlan === 'FREE_TRIAL' ? '🎁' : '📦' }}</span>
          <span class="banner-text">
            已选择：<strong>{{ getPlanName(selectedPlan) }}</strong>
            <template v-if="selectedPlan !== 'FREE_TRIAL' && planType === 'saas'">
              （{{ billingCycle === 'yearly' ? '年付' : '月付' }}）- ¥{{ getPlanPrice(selectedPlan) }}
              <template v-if="billingCycle === 'yearly'">
                <span class="save-tag">省¥{{ getSaveAmount(selectedPlan) }}</span>
              </template>
            </template>
            <template v-else-if="selectedPlan !== 'FREE_TRIAL'"> - ¥{{ getPlanPrice(selectedPlan) }}</template>
          </span>
          <button v-if="step > 1" class="change-btn" @click="step = 1">更换套餐</button>
        </div>

        <!-- 步骤1：选择套餐 -->
        <div v-if="step === 1" class="form-step">
          <div class="plan-selector">
            <div class="plan-type-toggle">
              <button :class="{ active: planType === 'saas' }" @click="planType = 'saas'">
                ☁️ SaaS云端版
              </button>
              <button :class="{ active: planType === 'private' }" @click="planType = 'private'">
                🏢 私有部署版
              </button>
            </div>

            <div v-if="planType === 'saas'" class="plans-grid">
              <!-- 免费试用 -->
              <div class="plan-card free-trial" :class="{ selected: selectedPlan === 'FREE_TRIAL' }" @click="selectedPlan = 'FREE_TRIAL'">
                <div class="plan-badge free">免费</div>
                <h4>7天免费试用</h4>
                <p class="plan-price free">¥0</p>
                <p class="plan-desc">3用户 · 1GB存储 · 体验全部功能</p>
              </div>
              <div class="plan-card" :class="{ selected: selectedPlan === 'basic' }" @click="selectedPlan = 'basic'">
                <h4>基础版</h4>
                <p class="plan-price">¥{{ getMonthlyPrice('basic') }}<span>/月</span></p>
                <p class="plan-desc">10用户 · 5GB存储</p>
              </div>
              <div class="plan-card" :class="{ selected: selectedPlan === 'pro' }" @click="selectedPlan = 'pro'">
                <div class="plan-badge">推荐</div>
                <h4>专业版</h4>
                <p class="plan-price">¥{{ getMonthlyPrice('pro') }}<span>/月</span></p>
                <p class="plan-desc">50用户 · 50GB存储</p>
              </div>
              <div class="plan-card" :class="{ selected: selectedPlan === 'enterprise' }" @click="selectedPlan = 'enterprise'">
                <h4>企业版</h4>
                <p class="plan-price">¥{{ getMonthlyPrice('enterprise') }}<span>/月</span></p>
                <p class="plan-desc">200用户 · 200GB存储</p>
              </div>
            </div>

            <!-- 月付/年付切换（仅SaaS套餐且非免费试用时显示） -->
            <div v-if="planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="billing-toggle">
              <div class="billing-options">
                <label class="billing-option" :class="{ active: billingCycle === 'monthly' }">
                  <input type="radio" v-model="billingCycle" value="monthly" />
                  <span class="option-content">
                    <span class="option-title">月付</span>
                    <span class="option-price">¥{{ getMonthlyPrice(selectedPlan) }}/月</span>
                  </span>
                </label>
                <label class="billing-option" :class="{ active: billingCycle === 'yearly' }">
                  <input type="radio" v-model="billingCycle" value="yearly" />
                  <span class="option-content">
                    <span class="option-title">
                      年付
                      <span class="discount-badge">送2个月</span>
                    </span>
                    <span class="option-price">
                      ¥{{ getYearlyPrice(selectedPlan) }}/年
                      <span class="original-price">¥{{ getYearlyOriginalPrice(selectedPlan) }}</span>
                    </span>
                    <span class="option-save">相当于¥{{ getYearlyMonthlyPrice(selectedPlan) }}/月，省¥{{ getSaveAmount(selectedPlan) }}</span>
                  </span>
                </label>
              </div>
            </div>

            <div v-else class="plans-grid">
              <div class="plan-card" :class="{ selected: selectedPlan === 'private-standard' }" @click="selectedPlan = 'private-standard'">
                <h4>标准版</h4>
                <p class="plan-price">¥9,800</p>
                <p class="plan-desc">50用户 · 永久授权</p>
              </div>
              <div class="plan-card" :class="{ selected: selectedPlan === 'private-pro' }" @click="selectedPlan = 'private-pro'">
                <div class="plan-badge">推荐</div>
                <h4>专业版</h4>
                <p class="plan-price">¥19,800</p>
                <p class="plan-desc">200用户 · 永久授权</p>
              </div>
              <div class="plan-card" :class="{ selected: selectedPlan === 'private-enterprise' }" @click="selectedPlan = 'private-enterprise'">
                <h4>企业版</h4>
                <p class="plan-price">¥39,800</p>
                <p class="plan-desc">不限用户 · 永久授权</p>
              </div>
            </div>
          </div>
          <button class="btn btn-primary btn-block" @click="step = 2">下一步</button>
        </div>

        <!-- 步骤2：填写信息 -->
        <div v-if="step === 2" class="form-step">
          <form @submit.prevent="handleSubmitInfo">
            <div class="form-group">
              <label>企业名称 <span class="required">*</span></label>
              <input type="text" v-model="form.companyName" placeholder="请输入企业名称" required />
            </div>
            <div class="form-row">
              <div class="form-group">
                <label>联系人 <span class="required">*</span></label>
                <input type="text" v-model="form.contactName" placeholder="请输入联系人姓名" required />
              </div>
              <div class="form-group">
                <label>手机号 <span class="required">*</span></label>
                <input type="tel" v-model="form.phone" placeholder="请输入手机号" required />
              </div>
            </div>
            <div class="form-group">
              <label>验证码 <span class="required">*</span></label>
              <div class="code-input">
                <input type="text" v-model="form.code" placeholder="请输入验证码" required />
                <button type="button" class="code-btn" :disabled="countdown > 0" @click="sendCode">
                  {{ countdown > 0 ? `${countdown}s后重发` : '获取验证码' }}
                </button>
              </div>
            </div>
            <div class="form-group">
              <label>邮箱</label>
              <input type="email" v-model="form.email" placeholder="请输入邮箱（选填）" />
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input type="checkbox" v-model="form.agree" required />
                <span>我已阅读并同意 <router-link to="/agreement?type=service">《服务协议》</router-link> 和 <router-link to="/agreement?type=privacy">《隐私政策》</router-link></span>
              </label>
            </div>
            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="step = 1">上一步</button>
              <button type="submit" class="btn btn-primary" :disabled="submitting">
                {{ submitting ? '提交中...' : '下一步' }}
              </button>
            </div>
          </form>
        </div>

        <!-- 步骤3：确认支付 -->
        <div v-if="step === 3" class="form-step">
          <!-- 未创建支付订单时显示订单确认 -->
          <div v-if="!paymentOrder" class="order-summary">
            <h3>订单确认</h3>
            <div class="order-item">
              <span class="item-label">套餐</span>
              <span class="item-value">{{ getPlanName(selectedPlan) }}</span>
            </div>
            <div v-if="planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="order-item">
              <span class="item-label">计费周期</span>
              <span class="item-value">
                {{ billingCycle === 'yearly' ? '年付（12个月）' : '月付' }}
                <span v-if="billingCycle === 'yearly'" class="gift-tag">🎁 送2个月</span>
              </span>
            </div>
            <div class="order-item">
              <span class="item-label">企业名称</span>
              <span class="item-value">{{ form.companyName }}</span>
            </div>
            <div class="order-item">
              <span class="item-label">联系人</span>
              <span class="item-value">{{ form.contactName }}</span>
            </div>
            <div v-if="billingCycle === 'yearly' && planType === 'saas' && selectedPlan !== 'FREE_TRIAL'" class="order-item discount">
              <span class="item-label">原价</span>
              <span class="item-value original">¥{{ getYearlyOriginalPrice(selectedPlan).toLocaleString() }}</span>
            </div>
            <div class="order-item total">
              <span class="item-label">应付金额</span>
              <span class="item-value price">¥{{ getPlanPrice(selectedPlan) }}</span>
            </div>

            <div class="payment-methods">
              <h4>选择支付方式</h4>
              <div class="payment-options">
                <label class="payment-option" :class="{ selected: paymentMethod === 'wechat' }">
                  <input type="radio" v-model="paymentMethod" value="wechat" />
                  <span class="payment-icon wechat">💚</span>
                  <span>微信支付</span>
                </label>
                <label class="payment-option" :class="{ selected: paymentMethod === 'alipay' }">
                  <input type="radio" v-model="paymentMethod" value="alipay" />
                  <span class="payment-icon alipay">💙</span>
                  <span>支付宝</span>
                </label>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="step = 2">上一步</button>
              <button type="button" class="btn btn-primary" @click="handleCreatePayment" :disabled="creatingPayment">
                {{ creatingPayment ? '创建订单中...' : '确认支付' }}
              </button>
            </div>
          </div>

          <!-- 已创建支付订单，显示二维码 -->
          <div v-else class="payment-qrcode">
            <div class="qr-header">
              <span class="pay-type-icon" :class="paymentMethod">
                {{ paymentMethod === 'wechat' ? '💚' : '💙' }}
              </span>
              <span>{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫码支付</span>
            </div>

            <div class="qr-amount">
              <span class="amount-label">支付金额</span>
              <span class="amount-value">¥{{ getPlanPrice(selectedPlan) }}</span>
            </div>

            <div class="qr-code-wrapper">
              <div v-if="paymentOrder.qrCode && !paymentOrder.qrCode.startsWith('MOCK')" class="qr-code">
                <img :src="generateQRCodeUrl(paymentOrder.payUrl || paymentOrder.qrCode)" alt="支付二维码" />
              </div>
              <div v-else class="qr-mock">
                <div class="mock-qr">
                  <span>📱</span>
                  <p>开发模式</p>
                  <p class="mock-tip">实际部署后显示真实二维码</p>
                </div>
              </div>
              <p class="qr-tip">请使用{{ paymentMethod === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
            </div>

            <div class="order-info">
              <span>订单号：{{ paymentOrder.orderNo }}</span>
              <span class="expire-tip">{{ expireCountdown > 0 ? `${Math.floor(expireCountdown / 60)}分${expireCountdown % 60}秒后过期` : '订单已过期' }}</span>
            </div>

            <div class="payment-status" v-if="checkingPayment">
              <el-icon class="is-loading"><Loading /></el-icon>
              <span>正在等待支付结果...</span>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-outline" @click="handleCancelPayment">取消支付</button>
              <button type="button" class="btn btn-primary" @click="handleCheckPayment">
                我已完成支付
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const API_BASE = '/api/v1'
const route = useRoute()
const router = useRouter()

const step = ref(1)
const planType = ref<'saas' | 'private'>('saas')
const billingCycle = ref<'monthly' | 'yearly'>('monthly')
const selectedPlan = ref('FREE_TRIAL')
const paymentMethod = ref('wechat')
const countdown = ref(0)
const _paying = ref(false)
const submitting = ref(false)
const creatingPayment = ref(false)
const checkingPayment = ref(false)
const expireCountdown = ref(0)
const registeredTenant = ref<any>(null)

// 支付订单信息
const paymentOrder = ref<{
  orderId: string
  orderNo: string
  qrCode: string
  payUrl: string
} | null>(null)

let paymentCheckTimer: any = null
let expireTimer: any = null

const form = reactive({
  companyName: '',
  contactName: '',
  phone: '',
  code: '',
  email: '',
  agree: false
})

// 套餐代码映射
const planCodeMap: Record<string, string> = {
  'FREE_TRIAL': 'FREE_TRIAL',
  'basic': 'SAAS_BASIC',
  'pro': 'SAAS_PRO',
  'enterprise': 'SAAS_ENTERPRISE',
  'private-standard': 'PRIVATE_STANDARD',
  'private-pro': 'PRIVATE_PRO',
  'private-enterprise': 'PRIVATE_ENTERPRISE'
}

onMounted(() => {
  const plan = route.query.plan as string
  if (plan) {
    if (plan === 'FREE_TRIAL') {
      selectedPlan.value = 'FREE_TRIAL'
      planType.value = 'saas'
    } else if (plan.startsWith('SAAS_')) {
      selectedPlan.value = plan.replace('SAAS_', '').toLowerCase()
      planType.value = 'saas'
    } else if (plan.startsWith('PRIVATE_')) {
      selectedPlan.value = 'private-' + plan.replace('PRIVATE_', '').toLowerCase()
      planType.value = 'private'
    } else {
      selectedPlan.value = plan
      if (plan.startsWith('private')) {
        planType.value = 'private'
      }
    }
  }
})

onUnmounted(() => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
})

const sendCode = async () => {
  if (!form.phone || !/^1[3-9]\d{9}$/.test(form.phone)) {
    alert('请输入正确的手机号')
    return
  }

  try {
    const res = await fetch(`${API_BASE}/public/register/send-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: form.phone })
    })
    const data = await res.json()
    if (data.code === 0) {
      countdown.value = 60
      const timer = setInterval(() => {
        countdown.value--
        if (countdown.value <= 0) {
          clearInterval(timer)
        }
      }, 1000)
    } else {
      alert(data.message || '发送失败')
    }
  } catch (error) {
    alert('发送验证码失败，请稍后重试')
  }
}

const getPlanName = (plan: string) => {
  const names: Record<string, string> = {
    FREE_TRIAL: '7天免费试用',
    basic: 'SaaS云端版 - 基础版',
    pro: 'SaaS云端版 - 专业版',
    enterprise: 'SaaS云端版 - 企业版',
    'private-standard': '私有部署版 - 标准版',
    'private-pro': '私有部署版 - 专业版',
    'private-enterprise': '私有部署版 - 企业版'
  }
  return names[plan] || plan
}

// 月付价格
const monthlyPrices: Record<string, number> = {
  basic: 99,
  pro: 299,
  enterprise: 599
}

const getMonthlyPrice = (plan: string) => {
  return monthlyPrices[plan] || 0
}

// 年付价格（10个月的价格，送2个月）
const getYearlyPrice = (plan: string) => {
  const monthly = monthlyPrices[plan] || 0
  return monthly * 10
}

// 年付原价（12个月）
const getYearlyOriginalPrice = (plan: string) => {
  const monthly = monthlyPrices[plan] || 0
  return monthly * 12
}

// 年付折算月价
const getYearlyMonthlyPrice = (plan: string) => {
  const yearly = getYearlyPrice(plan)
  return Math.round(yearly / 12)
}

// 年付节省金额
const getSaveAmount = (plan: string) => {
  const monthly = monthlyPrices[plan] || 0
  return monthly * 2 // 送2个月
}

const getPlanPrice = (plan: string) => {
  // 免费试用
  if (plan === 'FREE_TRIAL') return '0'

  // 私有部署版
  const privatePrices: Record<string, string> = {
    'private-standard': '9,800',
    'private-pro': '19,800',
    'private-enterprise': '39,800'
  }
  if (privatePrices[plan]) return privatePrices[plan]

  // SaaS套餐
  if (billingCycle.value === 'yearly') {
    return getYearlyPrice(plan).toLocaleString()
  }
  return getMonthlyPrice(plan).toString()
}

// 提交注册
const handleSubmitInfo = async () => {
  if (!form.agree) {
    alert('请阅读并同意服务协议')
    return
  }

  submitting.value = true
  try {
    const packageCode = planCodeMap[selectedPlan.value] || selectedPlan.value
    const res = await fetch(`${API_BASE}/public/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        companyName: form.companyName,
        contactName: form.contactName,
        phone: form.phone,
        code: form.code,
        email: form.email,
        packageCode
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      registeredTenant.value = data.data

      // 免费套餐直接跳转成功页
      if (selectedPlan.value === 'FREE_TRIAL' || getPlanPrice(selectedPlan.value) === '0') {
        router.push({
          path: '/pay-success',
          query: {
            plan: selectedPlan.value,
            type: planType.value,
            tenantCode: data.data.tenantCode,
            licenseKey: data.data.licenseKey
          }
        })
      } else {
        // 付费套餐进入支付步骤
        step.value = 3
      }
    } else {
      alert(data.message || '注册失败')
    }
  } catch (error) {
    alert('注册失败，请稍后重试')
  } finally {
    submitting.value = false
  }
}

// 创建支付订单
const handleCreatePayment = async () => {
  creatingPayment.value = true
  try {
    const packageCode = planCodeMap[selectedPlan.value] || selectedPlan.value
    const amount = parseFloat(getPlanPrice(selectedPlan.value).replace(',', ''))

    const res = await fetch(`${API_BASE}/public/payment/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        packageId: packageCode,
        packageName: getPlanName(selectedPlan.value),
        amount,
        payType: paymentMethod.value,
        billingCycle: planType.value === 'saas' ? billingCycle.value : 'once',
        tenantId: registeredTenant.value?.tenantId,
        tenantName: form.companyName,
        contactName: form.contactName,
        contactPhone: form.phone,
        contactEmail: form.email
      })
    })
    const data = await res.json()

    if (data.code === 0) {
      paymentOrder.value = data.data
      startPaymentCheck()
      startExpireCountdown()
    } else {
      alert(data.message || '创建支付订单失败')
    }
  } catch (error) {
    alert('创建支付订单失败')
  } finally {
    creatingPayment.value = false
  }
}

// 开始轮询支付状态
const startPaymentCheck = () => {
  checkingPayment.value = true
  paymentCheckTimer = setInterval(async () => {
    if (!paymentOrder.value) return

    try {
      const res = await fetch(`${API_BASE}/public/payment/query/${paymentOrder.value.orderNo}`)
      const data = await res.json()

      if (data.code === 0 && data.data.status === 'paid') {
        clearInterval(paymentCheckTimer)
        clearInterval(expireTimer)
        checkingPayment.value = false

        // 支付成功，从API获取授权码，跳转成功页
        router.push({
          path: '/pay-success',
          query: {
            plan: selectedPlan.value,
            type: planType.value,
            tenantCode: data.data.tenantCode,
            licenseKey: data.data.licenseKey
          }
        })
      }
    } catch (error) {
      console.error('查询支付状态失败:', error)
    }
  }, 3000) // 每3秒查询一次
}

// 开始过期倒计时
const startExpireCountdown = () => {
  expireCountdown.value = 30 * 60 // 30分钟
  expireTimer = setInterval(() => {
    expireCountdown.value--
    if (expireCountdown.value <= 0) {
      clearInterval(expireTimer)
      clearInterval(paymentCheckTimer)
      checkingPayment.value = false
      alert('订单已过期，请重新创建')
      paymentOrder.value = null
    }
  }, 1000)
}

// 手动检查支付状态
const handleCheckPayment = async () => {
  if (!paymentOrder.value) return

  try {
    const res = await fetch(`${API_BASE}/public/payment/query/${paymentOrder.value.orderNo}`)
    const data = await res.json()

    if (data.code === 0) {
      if (data.data.status === 'paid') {
        clearInterval(paymentCheckTimer)
        clearInterval(expireTimer)

        // 从API获取授权码
        router.push({
          path: '/pay-success',
          query: {
            plan: selectedPlan.value,
            type: planType.value,
            tenantCode: data.data.tenantCode,
            licenseKey: data.data.licenseKey
          }
        })
      } else {
        alert('暂未收到支付结果，请稍后再试或联系客服')
      }
    }
  } catch (error) {
    alert('查询失败，请稍后再试')
  }
}

// 取消支付
const handleCancelPayment = () => {
  if (paymentCheckTimer) clearInterval(paymentCheckTimer)
  if (expireTimer) clearInterval(expireTimer)
  checkingPayment.value = false
  paymentOrder.value = null
}

// 生成二维码URL（使用第三方API）
const generateQRCodeUrl = (content: string) => {
  // 使用 QR Server API 生成二维码
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(content)}`
}
</script>

<style lang="scss" scoped>
.register-page {
  min-height: 100vh;
  background: var(--bg-light);
  padding: 90px 24px 40px;
}

.register-container {
  max-width: 1100px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1.2fr;
  gap: 50px;
  align-items: start;
}

.register-info {
  position: sticky;
  top: 110px;
}

.info-content {
  h1 {
    font-size: 32px;
    font-weight: 700;
    margin-bottom: 10px;
  }

  > p {
    font-size: 15px;
    color: var(--text-secondary);
    margin-bottom: 24px;
  }
}

.benefits {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
  margin-bottom: 28px;
}

.benefit-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  color: var(--text-secondary);

  .benefit-icon {
    color: var(--success);
    font-weight: bold;
  }
}

.testimonial {
  background: white;
  border-radius: var(--radius);
  padding: 20px;
  box-shadow: var(--shadow);

  p {
    font-size: 14px;
    color: var(--text-secondary);
    font-style: italic;
    line-height: 1.6;
    margin-bottom: 12px;
  }
}

.testimonial-author {
  .author-name {
    font-weight: 600;
    color: var(--text-primary);
    font-size: 14px;
  }

  .author-company {
    color: var(--text-muted);
    font-size: 13px;
    margin-left: 6px;
  }
}

.register-form-wrapper {
  background: white;
  border-radius: var(--radius-xl);
  padding: 28px 36px;
  box-shadow: var(--shadow-lg);
}

.form-header {
  text-align: center;
  margin-bottom: 16px;

  h2 {
    font-size: 24px;
    font-weight: 700;
    margin-bottom: 4px;
  }

  p {
    color: var(--text-muted);
    font-size: 14px;

    a {
      color: var(--primary);
      font-weight: 500;
    }
  }
}

.steps {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.step {
  display: flex;
  align-items: center;
  gap: 6px;

  .step-num {
    width: 26px;
    height: 26px;
    border-radius: 50%;
    background: var(--border);
    color: var(--text-muted);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    font-weight: 600;
  }

  .step-text {
    font-size: 13px;
    color: var(--text-muted);
  }

  &.active {
    .step-num {
      background: var(--primary);
      color: white;
    }
    .step-text {
      color: var(--text-primary);
      font-weight: 500;
    }
  }

  &.done .step-num {
    background: var(--success);
    color: white;
  }
}

.step-line {
  width: 36px;
  height: 2px;
  background: var(--border);
  margin: 0 10px;

  &.active {
    background: var(--primary);
  }
}

.selected-plan-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(99, 102, 241, 0.05) 100%);
  border: 1px solid rgba(99, 102, 241, 0.2);
  border-radius: var(--radius);
  margin-bottom: 16px;

  &.free {
    background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(16, 185, 129, 0.05) 100%);
    border-color: rgba(16, 185, 129, 0.2);

    .banner-text strong {
      color: var(--success);
    }
  }

  .banner-icon {
    font-size: 18px;
  }

  .banner-text {
    font-size: 13px;
    color: var(--text-secondary);

    strong {
      color: var(--primary);
      font-weight: 600;
    }
  }

  .change-btn {
    padding: 3px 10px;
    font-size: 11px;
    color: var(--primary);
    background: white;
    border: 1px solid var(--primary);
    border-radius: 4px;
    cursor: pointer;
    transition: all 0.2s ease;

    &:hover {
      background: var(--primary);
      color: white;
    }
  }
}

.plan-type-toggle {
  display: flex;
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 4px;
  margin-bottom: 16px;
  border: 2px solid var(--border);

  button {
    flex: 1;
    padding: 12px 16px;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 6px;
    transition: all 0.3s ease;
    position: relative;

    &.active {
      background: var(--primary);
      color: white;
      box-shadow: 0 2px 8px rgba(99, 102, 241, 0.3);
    }

    &:not(.active):hover {
      background: rgba(99, 102, 241, 0.1);
      color: var(--primary);
    }
  }
}

.plans-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  margin-bottom: 14px;
}

.billing-toggle {
  margin-bottom: 16px;
  padding: 12px;
  background: var(--bg-light);
  border-radius: var(--radius);
}

.billing-options {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.billing-option {
  display: block;
  padding: 12px;
  background: white;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.3s ease;

  input {
    display: none;
  }

  &:hover {
    border-color: var(--primary-light);
  }

  &.active {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
  }

  .option-content {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .option-title {
    font-size: 14px;
    font-weight: 600;
    color: var(--text-primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .discount-badge {
    display: inline-block;
    padding: 2px 6px;
    background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
    color: white;
    font-size: 10px;
    font-weight: 600;
    border-radius: 8px;
  }

  .option-price {
    font-size: 16px;
    font-weight: 700;
    color: var(--primary);
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .original-price {
    font-size: 13px;
    font-weight: normal;
    color: var(--text-muted);
    text-decoration: line-through;
  }

  .option-save {
    font-size: 12px;
    color: var(--success);
    font-weight: 500;
  }
}

.plan-card {
  border: 2px solid var(--border);
  border-radius: var(--radius);
  padding: 16px 14px;
  text-align: center;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;

  &:hover {
    border-color: var(--primary-light);
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.15);
  }

  &.selected {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.08);
    box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.2), 0 4px 12px rgba(99, 102, 241, 0.15);
    transform: translateY(-2px);

    &::after {
      content: '✓';
      position: absolute;
      top: 6px;
      left: 6px;
      width: 18px;
      height: 18px;
      background: var(--primary);
      color: white;
      border-radius: 50%;
      font-size: 11px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
  }

  &.free-trial {
    border-color: var(--success);
    background: rgba(16, 185, 129, 0.05);

    &:hover {
      border-color: var(--success);
      box-shadow: 0 4px 12px rgba(16, 185, 129, 0.15);
    }

    &.selected {
      border-color: var(--success);
      background: rgba(16, 185, 129, 0.12);
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.2), 0 4px 12px rgba(16, 185, 129, 0.15);

      &::after {
        background: var(--success);
      }
    }
  }

  h4 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 6px;
  }

  .plan-price {
    font-size: 22px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 4px;

    &.free {
      color: var(--success);
    }

    span {
      font-size: 13px;
      font-weight: normal;
      color: var(--text-muted);
    }
  }

  .plan-desc {
    font-size: 12px;
    color: var(--text-muted);
    line-height: 1.4;
  }

  .plan-badge {
    position: absolute;
    top: -8px;
    right: 8px;
    background: var(--primary);
    color: white;
    padding: 3px 8px;
    border-radius: 8px;
    font-size: 10px;
    font-weight: 600;

    &.free {
      background: var(--success);
    }
  }
}

.form-group {
  margin-bottom: 16px;

  label {
    display: block;
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    margin-bottom: 6px;

    .required {
      color: var(--danger);
    }
  }

  input[type='text'],
  input[type='tel'],
  input[type='email'] {
    width: 100%;
    padding: 11px 14px;
    border: 1px solid var(--border);
    border-radius: var(--radius);
    font-size: 14px;
    transition: border-color 0.2s ease;

    &:focus {
      outline: none;
      border-color: var(--primary);
    }
  }
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.code-input {
  display: flex;
  gap: 10px;

  input {
    flex: 1;
  }

  .code-btn {
    padding: 11px 18px;
    background: var(--bg-light);
    color: var(--primary);
    border-radius: var(--radius);
    font-size: 14px;
    font-weight: 500;
    white-space: nowrap;

    &:disabled {
      color: var(--text-muted);
    }
  }
}

.checkbox-label {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  cursor: pointer;

  input {
    margin-top: 2px;
  }

  span {
    font-size: 13px;
    color: var(--text-secondary);

    a {
      color: var(--primary);
    }
  }
}

.form-actions {
  display: flex;
  gap: 14px;
  margin-top: 24px;

  .btn {
    flex: 1;
    padding: 11px 18px;
    font-size: 14px;
  }
}

.btn-block {
  width: 100%;
  padding: 12px 18px;
  font-size: 14px;
}

.order-summary {
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 18px 20px;
  margin-bottom: 18px;

  h3 {
    font-size: 15px;
    font-weight: 600;
    margin-bottom: 14px;
    padding-bottom: 10px;
    border-bottom: 1px solid var(--border);
  }
}

.order-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  font-size: 14px;

  .item-label {
    color: var(--text-muted);
  }

  .item-value {
    color: var(--text-primary);
    font-weight: 500;
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .gift-tag {
    font-size: 11px;
    color: var(--warning);
  }

  &.discount {
    .original {
      color: var(--text-muted);
      text-decoration: line-through;
      font-weight: normal;
    }
  }

  &.total {
    border-top: 1px solid var(--border);
    margin-top: 10px;
    padding-top: 12px;

    .price {
      font-size: 20px;
      font-weight: 700;
      color: var(--primary);
    }
  }
}

.save-tag {
  display: inline-block;
  padding: 2px 5px;
  background: var(--success);
  color: white;
  font-size: 10px;
  font-weight: 500;
  border-radius: 4px;
  margin-left: 4px;
}

.payment-methods {
  h4 {
    font-size: 13px;
    font-weight: 600;
    margin-bottom: 12px;
  }
}

.payment-options {
  display: flex;
  gap: 12px;
}

.payment-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius);
  cursor: pointer;
  transition: all 0.3s ease;
  font-size: 13px;

  input {
    display: none;
  }

  .payment-icon {
    font-size: 20px;
  }

  &.selected {
    border-color: var(--primary);
    background: rgba(99, 102, 241, 0.05);
  }
}

/* 支付二维码样式 */
.payment-qrcode {
  text-align: center;
}

.qr-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-size: 16px;
  font-weight: 600;
  margin-bottom: 16px;

  .pay-type-icon {
    font-size: 24px;
  }
}

.qr-amount {
  margin-bottom: 16px;

  .amount-label {
    font-size: 13px;
    color: var(--text-muted);
    display: block;
    margin-bottom: 4px;
  }

  .amount-value {
    font-size: 28px;
    font-weight: 700;
    color: var(--primary);
  }
}

.qr-code-wrapper {
  margin-bottom: 16px;
}

.qr-code {
  display: inline-block;
  padding: 12px;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);

  img {
    width: 160px;
    height: 160px;
    display: block;
  }
}

.qr-mock {
  display: inline-block;
  padding: 16px;
  background: var(--bg-light);
  border-radius: var(--radius);

  .mock-qr {
    width: 160px;
    height: 160px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    border: 2px dashed var(--border);
    border-radius: var(--radius);

    span {
      font-size: 36px;
      margin-bottom: 8px;
    }

    p {
      font-size: 12px;
      color: var(--text-muted);
      margin: 0;
    }

    .mock-tip {
      font-size: 11px;
      margin-top: 6px;
    }
  }
}

.qr-tip {
  font-size: 12px;
  color: var(--text-muted);
  margin-top: 12px;
}

.order-info {
  display: flex;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--bg-light);
  border-radius: var(--radius);
  font-size: 12px;
  color: var(--text-muted);
  margin-bottom: 16px;

  .expire-tip {
    color: var(--warning);
  }
}

.payment-status {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  background: rgba(99, 102, 241, 0.1);
  border-radius: var(--radius);
  color: var(--primary);
  font-size: 13px;
  margin-bottom: 16px;

  .is-loading {
    animation: rotate 1s linear infinite;
  }
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1024px) {
  .register-container {
    grid-template-columns: 1fr;
    max-width: 600px;
  }

  .register-info {
    position: static;
  }

  .plans-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

@media (max-width: 768px) {
  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .billing-options {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .register-page {
    padding: 70px 16px 30px;
  }

  .register-form-wrapper {
    padding: 24px 20px;
  }

  .plans-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .payment-options {
    flex-direction: column;
  }
}
</style>
