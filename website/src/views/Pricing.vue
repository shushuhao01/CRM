<template>
  <div class="pricing-page">
    <!-- Hero -->
    <section class="pricing-hero">
      <div class="container">
        <h1>简单透明的<span class="gradient-text">定价方案</span></h1>
        <p>选择适合您团队规模的套餐，随时升级或降级</p>

        <!-- 版本切换 -->
        <div class="version-toggle">
          <button :class="{ active: currentVersion === 'saas' }" @click="currentVersion = 'saas'">
            ☁️ SaaS云端版
          </button>
          <button :class="{ active: currentVersion === 'private' }" @click="currentVersion = 'private'">
            🏢 私有部署版
          </button>
        </div>
      </div>
    </section>

    <!-- SaaS 套餐 -->
    <section v-if="currentVersion === 'saas'" class="pricing-section">
      <div class="container">
        <!-- 计费周期 -->
        <div class="billing-toggle">
          <span :class="{ active: !isYearly }">月付</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="isYearly" />
            <span class="slider"></span>
          </label>
          <span :class="{ active: isYearly }">
            年付 <em class="promo-badge">🎁 {{ yearlyPromoLabel }}</em>
          </span>
        </div>
        <div v-if="!isYearly" class="yearly-hint" @click="isYearly = true">
          💡 切换年付可享 <strong>{{ yearlyPromoLabel }}</strong> 优惠，立省更多！
        </div>

        <div v-if="loading" class="loading-state">加载中...</div>

        <div v-else class="pricing-cards">
          <div
            v-for="pkg in saasPackages"
            :key="pkg.id"
            class="pricing-card"
            :class="{ featured: pkg.is_recommended }"
          >
            <div v-if="pkg.is_recommended" class="card-badge">最受欢迎</div>
            <div v-if="pkg.is_trial" class="card-badge trial">免费试用</div>
            <div class="card-header">
              <h3>{{ pkg.name }}</h3>
              <p>{{ pkg.description }}</p>
            </div>
            <div class="card-price">
              <template v-if="pkg.price === 0">
                <span class="price free">免费</span>
                <span class="period">/ {{ pkg.duration_days }}天</span>
              </template>
              <template v-else-if="isYearly">
                <div class="yearly-price-display">
                  <span class="original-monthly">原价 ¥{{ pkg.price }}/月</span>
                  <span class="price">¥{{ getYearlyPrice(pkg.price, pkg) }}</span>
                  <span class="period">/月</span>
                </div>
                <div class="yearly-promo-tag">
                  <span class="tag-icon">🎁</span>
                  <span>年付 ¥{{ getYearlyTotal(pkg.price, pkg) }}，{{ getYearlyPromoText(pkg) }}</span>
                </div>
                <div class="yearly-saving">省 ¥{{ getYearlySaving(pkg.price, pkg) }}</div>
              </template>
              <template v-else>
                <span class="price">¥{{ pkg.price }}</span>
                <span class="period">/月</span>
              </template>
            </div>
            <ul class="card-features">
              <li><span class="check">✓</span> 最多 {{ pkg.max_users }} 个用户</li>
              <li v-if="pkg.max_storage_gb > 0">
                <span class="check">✓</span> {{ pkg.max_storage_gb }}GB 存储空间
              </li>
              <li v-for="feature in pkg.features" :key="feature">
                <span class="check">✓</span> {{ feature }}
              </li>
            </ul>
            <router-link
              :to="`/register?plan=${pkg.code}`"
              class="btn"
              :class="pkg.is_recommended ? 'btn-primary' : 'btn-outline'"
            >
              {{ pkg.is_trial ? '开始试用' : `选择${pkg.name}` }}
            </router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- 私有部署套餐 -->
    <section v-if="currentVersion === 'private'" class="pricing-section">
      <div class="container">
        <!-- 私有部署计费切换 -->
        <div class="billing-toggle" v-if="hasPrivateAnnual">
          <span :class="{ active: isPrivateAnnual }">年度授权</span>
          <label class="toggle-switch">
            <input type="checkbox" v-model="isPrivatePerpetual" />
            <span class="slider"></span>
          </label>
          <span :class="{ active: isPrivatePerpetual }">
            永久买断
          </span>
        </div>
        <div v-if="hasPrivateAnnual && !isPrivatePerpetual" class="yearly-hint" @click="isPrivatePerpetual = true">
          💡 切换永久买断，<strong>一次付费，终身使用</strong>，长期更划算！
        </div>
        <div v-if="hasPrivateAnnual && isPrivatePerpetual" class="yearly-hint" @click="isPrivatePerpetual = false">
          💡 切换年度授权，<strong>首年低至{{ privateMinDiscount }}折</strong>，先试用再决定！
        </div>

        <div v-if="loading" class="loading-state">加载中...</div>

        <div v-else class="pricing-cards">
          <div
            v-for="pkg in privatePackages"
            :key="pkg.id"
            class="pricing-card"
            :class="{ featured: pkg.is_recommended }"
          >
            <div v-if="pkg.is_recommended" class="card-badge">推荐</div>
            <div class="card-header">
              <h3>{{ pkg.name }}</h3>
              <p>{{ pkg.description }}</p>
            </div>
            <div class="card-price">
              <!-- 永久买断模式 -->
              <template v-if="isPrivatePerpetual || !getPrivateAnnualPrice(pkg)">
                <div class="price-line">
                  <span class="price">¥{{ pkg.price.toLocaleString() }}</span>
                  <span class="period">一次性买断</span>
                </div>
                <div v-if="getPrivateAnnualPrice(pkg)" class="yearly-promo-tag">
                  <span class="tag-icon">💰</span>
                  <span>相当于年度版 {{ Math.ceil(pkg.price / getPrivateAnnualPrice(pkg)) }} 年费用</span>
                </div>
              </template>
              <!-- 年度授权模式 -->
              <template v-else>
                <div class="yearly-price-display">
                  <span class="original-monthly">永久买断价 ¥{{ pkg.price.toLocaleString() }}</span>
                  <span class="price">¥{{ getPrivateAnnualPrice(pkg).toLocaleString() }}</span>
                  <span class="period">/年</span>
                </div>
                <div class="yearly-promo-tag">
                  <span class="tag-icon">🎉</span>
                  <span>首年省 ¥{{ (pkg.price - getPrivateAnnualPrice(pkg)).toLocaleString() }}</span>
                </div>
                <div class="yearly-saving">约{{ getPrivateAnnualDiscount(pkg) }}折</div>
              </template>
            </div>
            <ul class="card-features">
              <li>
                <span class="check">✓</span>
                {{ pkg.max_users >= 99999 ? '不限用户数' : `最多 ${pkg.max_users} 个用户` }}
              </li>
              <li v-if="!isPrivatePerpetual && getPrivateAnnualPrice(pkg)">
                <span class="check">✓</span> 年度授权，到期可续费
              </li>
              <li v-if="isPrivatePerpetual || !getPrivateAnnualPrice(pkg)">
                <span class="check">✓</span> 永久授权，一次买断
              </li>
              <li v-for="feature in pkg.features" :key="feature">
                <span class="check">✓</span> {{ feature }}
              </li>
            </ul>
            <router-link
              :to="`/register?plan=${pkg.code}&billing=${isPrivatePerpetual ? 'perpetual' : 'annual'}`"
              class="btn"
              :class="pkg.is_recommended ? 'btn-primary' : 'btn-outline'"
            >
              {{ pkg.code === 'PRIVATE_ENTERPRISE' ? '联系销售' : `选择${pkg.name}` }}
            </router-link>
          </div>
        </div>

        <!-- 增值服务 -->
        <div class="addon-services">
          <h3>增值服务</h3>
          <div class="addon-grid">
            <div class="addon-item">
              <span class="addon-name">年度维护服务</span>
              <span class="addon-price">¥2,000/年</span>
              <p>包含版本升级、Bug修复、技术支持</p>
            </div>
            <div class="addon-item">
              <span class="addon-name">远程部署协助</span>
              <span class="addon-price">¥1,000/次</span>
              <p>技术人员远程协助完成系统部署</p>
            </div>
            <div class="addon-item">
              <span class="addon-name">定制开发</span>
              <span class="addon-price">按需报价</span>
              <p>根据需求定制功能模块</p>
            </div>
            <div class="addon-item">
              <span class="addon-name">培训服务</span>
              <span class="addon-price">¥500/小时</span>
              <p>系统使用培训、管理员培训</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ -->
    <section class="faq-section">
      <div class="container">
        <div class="section-title">
          <h2>常见问题</h2>
        </div>
        <div class="faq-list">
          <div class="faq-item" v-for="(faq, index) in faqs" :key="index">
            <div class="faq-question" @click="toggleFaq(index)">
              <span>{{ faq.question }}</span>
              <span class="faq-icon">{{ openFaq === index ? '−' : '+' }}</span>
            </div>
            <div class="faq-answer" v-show="openFaq === index">
              <p>{{ faq.answer }}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPackages, getYearlyPrice, getYearlyTotal, getYearlySaving, getYearlyPromoText, type Package } from '@/api/packages'

const currentVersion = ref<'saas' | 'private'>('saas')
const isYearly = ref(false)
const isPrivatePerpetual = ref(true)
const isPrivateAnnual = computed(() => !isPrivatePerpetual.value)
const openFaq = ref<number | null>(null)
const loading = ref(true)
const packages = ref<Package[]>([])

// 按类型筛选套餐
const saasPackages = computed(() =>
  packages.value.filter(p => p.type === 'saas').sort((a, b) => a.sort_order - b.sort_order)
)

const privatePackages = computed(() =>
  packages.value.filter(p => p.type === 'private').sort((a, b) => a.sort_order - b.sort_order)
)

// 是否有私有套餐配置了年度价格
const hasPrivateAnnual = computed(() =>
  privatePackages.value.some(p => p.yearly_price && Number(p.yearly_price) > 0)
)

// 获取私有套餐年度价格
const getPrivateAnnualPrice = (pkg: Package): number => {
  return (pkg.yearly_price && Number(pkg.yearly_price) > 0) ? Number(pkg.yearly_price) : 0
}

// 获取私有套餐年度折扣（对比永久价）
const getPrivateAnnualDiscount = (pkg: Package): string => {
  const annual = getPrivateAnnualPrice(pkg)
  if (!annual || !pkg.price) return '—'
  return ((annual / pkg.price) * 10).toFixed(1)
}

// 私有套餐中最低折扣（用于提示文案）
const privateMinDiscount = computed(() => {
  let min = 10
  for (const pkg of privatePackages.value) {
    const annual = getPrivateAnnualPrice(pkg)
    if (annual > 0 && pkg.price > 0) {
      const d = (annual / pkg.price) * 10
      if (d < min) min = d
    }
  }
  return min.toFixed(1)
})

// 动态获取年付优惠标签文案
const yearlyPromoLabel = computed(() => {
  const firstPromo = saasPackages.value.find(p => p.price > 0)
  return firstPromo ? getYearlyPromoText(firstPromo) : '省20%'
})

const toggleFaq = (index: number) => {
  openFaq.value = openFaq.value === index ? null : index
}

// 加载套餐数据
onMounted(async () => {
  try {
    packages.value = await getPackages()
  } catch (error) {
    console.error('加载套餐失败:', error)
  } finally {
    loading.value = false
  }
})

const faqs = [
  {
    question: 'SaaS版和私有部署版有什么区别？',
    answer: 'SaaS版部署在我们的云服务器上，即开即用，按月/年付费；私有部署版安装在您自己的服务器上，数据完全自主可控，支持年度授权和永久买断两种方式。'
  },
  {
    question: '可以先试用再购买吗？',
    answer: '当然可以！SaaS版提供7天免费试用，无需绑定信用卡。私有部署版可以申请演示账号体验。'
  },
  {
    question: '数据安全如何保障？',
    answer: '我们采用银行级数据加密，多重备份机制，通过ISO27001安全认证。私有部署版数据完全存储在您自己的服务器上。'
  },
  {
    question: '可以随时升级或降级套餐吗？',
    answer: 'SaaS版支持随时升级，升级后立即生效，按剩余时间补差价。降级需要在当前周期结束后生效。'
  },
  {
    question: '支持哪些支付方式？',
    answer: '支持微信支付、支付宝、银行转账。企业客户可以申请对公转账并开具发票。'
  },
  {
    question: '私有部署版包含技术支持吗？',
    answer: '标准版包含1年免费升级和邮件技术支持；专业版和企业版包含1年技术支持和专属技术顾问。年度授权版每年续费自动包含技术支持，永久买断版到期后可购买年度维护服务。'
  }
]
</script>

<style lang="scss" scoped>
.pricing-page {
  padding-top: 80px;
}

.pricing-hero {
  padding: 80px 0 60px;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 48px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  > .container > p {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: 40px;
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version-toggle {
  display: inline-flex;
  background: white;
  border-radius: 12px;
  padding: 6px;
  box-shadow: var(--shadow);

  button {
    padding: 12px 32px;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.3s ease;

    &.active {
      background: var(--gradient-primary);
      color: white;
    }
  }
}

.pricing-section {
  padding: 60px 0 100px;
}

.loading-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
  font-size: 16px;
}

.billing-toggle {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-bottom: 50px;

  span {
    font-size: 15px;
    color: var(--text-muted);

    &.active {
      color: var(--text-primary);
      font-weight: 600;
    }

    em {
      background: rgba(16, 185, 129, 0.1);
      color: var(--success);
      padding: 2px 8px;
      border-radius: 10px;
      font-size: 12px;
      font-style: normal;
    }

    .promo-badge {
      background: linear-gradient(135deg, #f59e0b 0%, #f97316 100%);
      color: white;
      padding: 3px 12px;
      border-radius: 12px;
      font-size: 12px;
      font-weight: 600;
      font-style: normal;
      animation: pulse-badge 2s ease-in-out infinite;
    }
  }
}

@keyframes pulse-badge {
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.05); }
}

.yearly-hint {
  text-align: center;
  margin: -36px auto 40px;
  padding: 8px 20px;
  background: linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(249, 115, 22, 0.08) 100%);
  border: 1px dashed #f59e0b;
  border-radius: 8px;
  font-size: 13px;
  color: #b45309;
  cursor: pointer;
  max-width: 420px;
  transition: all 0.3s ease;

  &:hover {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.15) 0%, rgba(249, 115, 22, 0.15) 100%);
    transform: translateY(-1px);
  }

  strong {
    color: #d97706;
  }
}

.toggle-switch {
  position: relative;
  width: 50px;
  height: 26px;

  input {
    opacity: 0;
    width: 0;
    height: 0;
  }

  .slider {
    position: absolute;
    cursor: pointer;
    inset: 0;
    background: var(--border);
    border-radius: 26px;
    transition: 0.3s;

    &::before {
      content: '';
      position: absolute;
      height: 20px;
      width: 20px;
      left: 3px;
      bottom: 3px;
      background: white;
      border-radius: 50%;
      transition: 0.3s;
    }
  }

  input:checked + .slider {
    background: var(--primary);
  }

  input:checked + .slider::before {
    transform: translateX(24px);
  }
}

.pricing-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 30px;
  max-width: 1100px;
  margin: 0 auto;
}

.pricing-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 40px 32px;
  box-shadow: var(--shadow);
  position: relative;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
  }

  &.featured {
    border: 2px solid var(--primary);
    transform: scale(1.02);

    &:hover {
      transform: scale(1.02) translateY(-8px);
    }
  }
}

.card-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-primary);
  color: white;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;

  &.trial {
    background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  }
}

.card-header {
  text-align: center;
  margin-bottom: 24px;

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  p {
    font-size: 14px;
    color: var(--text-muted);
  }
}

.card-price {
  text-align: center;
  margin-bottom: 32px;

  .price {
    font-size: 48px;
    font-weight: 800;
    color: var(--text-primary);

    &.free {
      color: var(--success);
    }
  }

  .price-line {
    display: flex;
    align-items: baseline;
    justify-content: center;
    flex-wrap: nowrap;
  }

  .period {
    font-size: 16px;
    color: var(--text-muted);
    white-space: nowrap;
  }

  .price-note {
    font-size: 13px;
    color: var(--success);
    margin-top: 8px;
  }

  .yearly-price-display {
    position: relative;

    .original-monthly {
      display: block;
      font-size: 13px;
      color: var(--text-muted);
      text-decoration: line-through;
      margin-bottom: 4px;
    }
  }

  .yearly-promo-tag {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    margin-top: 10px;
    padding: 6px 16px;
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(249, 115, 22, 0.1) 100%);
    border: 1px solid rgba(245, 158, 11, 0.3);
    border-radius: 20px;
    font-size: 13px;
    color: #b45309;
    font-weight: 500;

    .tag-icon {
      font-size: 14px;
    }
  }

  .yearly-saving {
    margin-top: 6px;
    font-size: 14px;
    font-weight: 700;
    color: var(--success);
  }
}

.card-features {
  list-style: none;
  margin-bottom: 32px;

  li {
    padding: 10px 0;
    font-size: 14px;
    color: var(--text-secondary);
    display: flex;
    align-items: center;
    gap: 10px;

    &.disabled {
      color: var(--text-muted);
      opacity: 0.6;
    }
  }

  .check {
    color: var(--success);
    font-weight: bold;
  }

  .cross {
    color: var(--text-muted);
  }
}

.addon-services {
  margin-top: 80px;

  h3 {
    text-align: center;
    font-size: 24px;
    font-weight: 600;
    margin-bottom: 40px;
  }
}

.addon-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 24px;
}

.addon-item {
  background: var(--bg-light);
  border-radius: var(--radius);
  padding: 24px;
  text-align: center;

  .addon-name {
    display: block;
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 8px;
  }

  .addon-price {
    display: block;
    font-size: 20px;
    font-weight: 700;
    color: var(--primary);
    margin-bottom: 12px;
  }

  p {
    font-size: 13px;
    color: var(--text-muted);
  }
}

.faq-section {
  padding: var(--section-padding);
  background: var(--bg-light);
}

.faq-list {
  max-width: 800px;
  margin: 0 auto;
}

.faq-item {
  background: white;
  border-radius: var(--radius);
  margin-bottom: 12px;
  overflow: hidden;
}

.faq-question {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  cursor: pointer;
  font-weight: 500;
  color: var(--text-primary);

  &:hover {
    background: var(--bg-light);
  }

  .faq-icon {
    font-size: 24px;
    color: var(--primary);
  }
}

.faq-answer {
  padding: 0 24px 20px;

  p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

@media (max-width: 1024px) {
  .pricing-cards {
    grid-template-columns: 1fr;
    max-width: 400px;
  }

  .pricing-card.featured {
    transform: none;

    &:hover {
      transform: translateY(-8px);
    }
  }

  .addon-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .pricing-hero h1 {
    font-size: 32px;
  }

  .addon-grid {
    grid-template-columns: 1fr;
  }
}
</style>
