<template>
  <div class="package-purchase-tab">
    <div v-if="loading" class="loading-state">
      <el-skeleton :rows="4" animated />
    </div>
    <template v-else>
      <!-- 当前套餐状态 -->
      <div v-if="currentPackage" class="current-package-bar">
        <div class="cpb-info">
          <el-icon color="#409eff"><CircleCheckFilled /></el-icon>
          <span>当前套餐：<strong>{{ currentPackage.packageName }}</strong></span>
          <el-tag v-if="isFreePackage(currentPackage)" type="success" size="small">免费</el-tag>
          <el-tag v-else type="warning" size="small">付费版</el-tag>
        </div>
        <span class="cpb-date">领取于 {{ formatDate(currentPackage.claimedAt) }}</span>
      </div>

      <!-- ========== archive 专属：模式切换 + 卡片 + 自选人数 ========== -->
      <template v-if="type === 'archive'">
        <!-- 购买模式切换 -->
        <div v-if="archiveGlobalConfig.purchaseMode === 'both'" class="archive-mode-switch">
          <div class="ams-label">购买方式</div>
          <div class="ams-btns">
            <el-button :type="archiveMode === 'proxy' ? 'primary' : 'default'" @click="archiveMode = 'proxy'">
              <el-icon><ShoppingCart /></el-icon> 代购（含官方席位）
            </el-button>
            <el-button :type="archiveMode === 'service_fee' ? 'primary' : 'default'" @click="archiveMode = 'service_fee'">
              <el-icon><Promotion /></el-icon> 仅服务费（自购席位）
            </el-button>
          </div>
          <div class="ams-hint" v-if="archiveMode === 'proxy'">平台一站式代购企微官方席位+云客服务，开票金额含全部费用</div>
          <div class="ams-hint" v-else>您已自行在企微后台购买席位，仅需支付云客平台服务费 ¥{{ archiveGlobalConfig.seatServiceFee }}/人/年</div>
        </div>

        <!-- 套餐卡片 -->
        <div class="archive-cards" v-if="archivePackages.length">
          <div v-for="(pkg, idx) in archivePackages" :key="idx"
               class="a-card" :class="{ selected: selectedArchiveTier === idx, recommended: isRecommended(idx) }"
               @click="selectArchiveTier(idx)">
            <div class="a-card-badge" v-if="isRecommended(idx)">推荐</div>
            <div class="a-card-badge a-card-badge-current" v-if="isCurrentPkg(pkg, idx)">当前</div>
            <h4 class="a-card-title">{{ pkg.tierLabel }}</h4>
            <div class="a-card-price">
              <span class="a-price-symbol">¥</span>
              <span class="a-price-num">{{ archiveTierTotal(pkg) }}</span>
              <span class="a-price-unit">/年</span>
            </div>
            <div class="a-card-subtitle">
              {{ archiveMode === 'proxy' ? '年付' : '服务费' }}{{ Math.round(archiveTierTotal(pkg) / 12) }}元/月
            </div>
            <ul class="a-card-features">
              <li><span class="a-ft">👥</span> 最大人数：{{ pkg.maxMembers }} 人</li>
              <li v-if="archiveMode === 'proxy'">
                <span class="a-ft">💰</span> 服务费：¥{{ pkg.salePrice }}/人/年（含官方席位+购买服务）
              </li>
              <li v-else>
                <span class="a-ft">💰</span> 服务费：¥{{ archiveGlobalConfig.seatServiceFee }}/人/年
              </li>
              <li><span class="a-ft">📋</span> 总费用：¥{{ archiveTierTotal(pkg) }}/年</li>
            </ul>
            <el-button class="a-card-btn"
                       :type="selectedArchiveTier === idx ? 'primary' : 'default'"
                       style="width:100%">
              {{ selectedArchiveTier === idx ? '✓ 已选中' : `¥${archiveTierTotal(pkg)} 选择` }}
            </el-button>
          </div>
        </div>

        <!-- 自选人数区 -->
        <div class="custom-count-section">
          <div class="ccs-header">
            <span>自定义人数</span>
            <el-tag size="small" type="info">输入任意人数自动适配阶梯价</el-tag>
          </div>
          <div class="ccs-body">
            <div class="ccs-row">
              <span class="ccs-label">{{ archiveMode === 'proxy' ? '代购人数' : '席位人数' }}</span>
              <el-input-number v-model="customUserCount" :min="1" :max="9999" :step="1" style="width:160px" />
            </div>
            <div class="ccs-row">
              <span class="ccs-label">适用单价</span>
              <span class="ccs-val highlight">¥{{ archiveUnitPriceForCustom }}/人/年</span>
            </div>
            <div class="ccs-row">
              <span class="ccs-label">服务期限</span>
              <span class="ccs-val">1年</span>
            </div>
            <el-divider style="margin:8px 0" />
            <div class="ccs-row ccs-total">
              <span class="ccs-label">合计</span>
              <span class="ccs-total-amount">¥{{ archiveCustomTotal.toLocaleString() }}</span>
            </div>
          </div>
          <div class="ccs-actions">
            <el-button type="warning" :loading="purchasing" @click="handleArchiveCustomPurchase">
              ¥{{ archiveCustomTotal.toLocaleString() }} 自选人数购买
            </el-button>
          </div>
        </div>
      </template>

      <!-- ========== 非 archive 通用卡片 ========== -->
      <template v-else>
        <div class="pkg-grid" v-if="packages.length">
          <div v-for="(pkg, idx) in packages" :key="idx" class="pkg-card"
               :class="{ 'pkg-recommended': pkg.recommended, 'pkg-current': isCurrentPkg(pkg, idx), 'pkg-disabled': !pkg.enabled && pkg.enabled !== undefined }">
            <div class="pkg-badge" v-if="pkg.recommended">推荐</div>
            <div class="pkg-badge pkg-badge-current" v-if="isCurrentPkg(pkg, idx)">当前</div>
            <h4 class="pkg-name">{{ pkg.name || pkg.tierLabel }}</h4>
            <div class="pkg-price-row">
              <template v-if="getRawPrice(pkg) > 0">
                <span class="pkg-symbol">¥</span>
                <span class="pkg-price">{{ computePrice(pkg) }}</span>
                <span class="pkg-unit">/{{ getPriceUnit(pkg) }}</span>
              </template>
              <span v-else class="pkg-free">免费</span>
            </div>
            <div v-if="getRawPrice(pkg) > 0 && discountInfo && discountInfo.yearlyDiscount < 100" class="pkg-discount-hint">
              年付 {{ discountInfo.yearlyDiscount }}折优惠
            </div>
            <ul class="pkg-features" v-if="type === 'wecom'">
              <li><span class="feat-icon">👥</span> 企微数量：{{ pkg.wecomQuota }} 个</li>
              <li><span class="feat-icon">💬</span> 会话存档：{{ pkg.archiveIncluded === 'none' || !pkg.archiveIncluded ? '不含' : pkg.archiveIncluded + '人额度' }}</li>
              <li><span class="feat-icon">🤖</span> AI额度：{{ pkg.aiQuotaIncluded || 0 }} 次/月</li>
              <li v-if="pkg.menuAcquisition"><span class="feat-icon">✅</span> 获客助手</li>
              <li v-if="pkg.menuChatArchive"><span class="feat-icon">✅</span> 会话存档</li>
              <li v-if="pkg.menuAiAssistant"><span class="feat-icon">✅</span> AI助手</li>
              <li v-if="pkg.menuSidebar"><span class="feat-icon">✅</span> 侧边栏</li>
              <li v-if="pkg.menuPayment"><span class="feat-icon">✅</span> 对外收款</li>
              <li v-if="pkg.menuCustomerGroup"><span class="feat-icon">✅</span> 客户群</li>
              <li v-if="pkg.menuContactWay"><span class="feat-icon">✅</span> 活码管理</li>
              <li v-if="pkg.menuCustomerService"><span class="feat-icon">✅</span> 微信客服</li>
            </ul>
            <ul class="pkg-features" v-else-if="type === 'acquisition'">
              <li><span class="feat-icon">📎</span> 渠道活码：{{ pkg.maxChannels === 0 ? '无限制' : (pkg.maxChannels || 0) + ' 个' }}</li>
              <li><span class="feat-icon">📊</span> 数据看板：<span :class="pkg.dashboardEnabled ? 'feat-on' : 'feat-off'">{{ pkg.dashboardEnabled ? '✅ 包含' : '—' }}</span></li>
              <li><span class="feat-icon">🔽</span> 转化漏斗：<span :class="pkg.funnelEnabled ? 'feat-on' : 'feat-off'">{{ pkg.funnelEnabled ? '✅ 包含' : '—' }}</span></li>
              <li><span class="feat-icon">👤</span> 客户画像：<span :class="pkg.profileEnabled ? 'feat-on' : 'feat-off'">{{ pkg.profileEnabled ? '✅ 包含' : '—' }}</span></li>
              <li><span class="feat-icon">🔗</span> 链接管理：<span class="feat-on">✅ 包含</span></li>
              <li><span class="feat-icon">📈</span> 留存分析：<span :class="pkg.funnelEnabled ? 'feat-on' : 'feat-off'">{{ pkg.funnelEnabled ? '✅ 包含' : '—' }}</span></li>
              <li><span class="feat-icon">🏅</span> 成员排行：<span :class="pkg.dashboardEnabled ? 'feat-on' : 'feat-off'">{{ pkg.dashboardEnabled ? '✅ 包含' : '—' }}</span></li>
            </ul>
            <ul class="pkg-features" v-else-if="type === 'ai'">
              <li><span class="feat-icon">🤖</span> 调用次数：{{ pkg.calls }} 次</li>
              <li><span class="feat-icon">📅</span> 有效期：{{ pkg.validity === 'forever' ? '永久' : pkg.validity + '天' }}</li>
              <li v-if="pkg.price === 0 && pkg.freeTrialOnce"><span class="feat-icon">⚠️</span> 每个账号仅可领取一次</li>
            </ul>
            <p class="pkg-desc" v-if="pkg.description">{{ pkg.description }}</p>
            <div class="pkg-action">
              <template v-if="isCurrentPkg(pkg, idx)">
                <el-button type="success" disabled style="width:100%">当前套餐</el-button>
              </template>
              <template v-else-if="getRawPrice(pkg) === 0">
                <!-- 免费套餐：检查是否已领取 -->
                <template v-if="(type === 'ai' && freePackageClaimed.ai) || (type === 'acquisition' && freePackageClaimed.acquisition)">
                  <el-button type="info" disabled style="width:100%">
                    已领取（每个租户仅可领取一次）
                  </el-button>
                </template>
                <template v-else>
                  <el-button type="primary" @click="handleClaim(pkg, idx)" :loading="purchasing" style="width:100%">
                    {{ type === 'ai' && pkg.freeTrialOnce ? '免费领取（仅一次）' : '免费领取' }}
                  </el-button>
                </template>
              </template>
              <template v-else>
                <el-button type="warning" @click="handlePurchase(pkg, idx)" :loading="purchasing" style="width:100%">
                  ¥{{ computePrice(pkg) }} 立即购买
                </el-button>
              </template>
            </div>
          </div>
        </div>
        <el-empty v-else description="暂无可用套餐，请联系管理员配置" />
      </template>
    </template>

    <!-- 账单记录 -->
    <BillingRecordSection :type="type" ref="billingRef" />

    <!-- 支付弹窗 -->
    <el-dialog v-model="showPayDialog" title="扫码支付" width="420px" :close-on-click-modal="false" center>
      <div class="pay-dialog-body">
        <div class="pay-pkg-name">{{ pendingPkg?.name || pendingPkg?.tierLabel }}</div>
        <div class="pay-amount">
          <span>应付金额</span>
          <strong>¥{{ payAmount }}</strong>
        </div>
        <div class="pay-qrcode">
          <div class="qr-placeholder">
            <el-icon :size="48" color="#409eff"><CreditCard /></el-icon>
            <p>请使用微信或支付宝扫码支付</p>
            <p class="qr-hint">支付完成后将自动开通服务，如未自动开通请联系客服</p>
          </div>
        </div>
        <div class="pay-methods">
          <span class="pm-label">支付方式：</span>
          <el-radio-group v-model="payMethod" size="small">
            <el-radio-button label="wechat">微信支付</el-radio-button>
            <el-radio-button label="alipay">支付宝</el-radio-button>
          </el-radio-group>
        </div>
        <el-alert v-if="isDev" type="warning" :closable="false" style="margin-top:12px; margin-bottom:8px">
          <template #title>开发模式：点击"我已完成支付"将直接确认，生产环境需真实支付</template>
        </el-alert>
        <div style="margin-top:16px; text-align:center">
          <el-button type="primary" @click="confirmPayment" :loading="purchasing">我已完成支付</el-button>
          <el-button @click="showPayDialog=false">取消</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, CreditCard, ShoppingCart, Promotion } from '@element-plus/icons-vue'
import {
  getPricingConfig, getTenantPackage,
  claimWecomPackage, purchaseAiPackage,
  purchaseArchivePackage as _purchaseArchivePackage,
  purchaseAcquisitionPackage,
  confirmWecomPayment,
  getBillingRecords
} from '@/api/wecom'
import BillingRecordSection from './BillingRecordSection.vue'

const props = defineProps<{
  type: 'wecom' | 'archive' | 'ai' | 'acquisition'
}>()
const emit = defineEmits<{ (e: 'packageChanged'): void }>()

const isDev = import.meta.env.DEV
const loading = ref(true)
const purchasing = ref(false)
const packages = ref<any[]>([])
const archivePackages = ref<any[]>([])
const archiveGlobalConfig = ref<{ purchaseMode: string; seatServiceFee: number }>({ purchaseMode: 'proxy_only', seatServiceFee: 0 })
const archiveMode = ref<'proxy' | 'service_fee'>('proxy')
const selectedArchiveTier = ref<number>(-1)
const customUserCount = ref(10)
const currentPackage = ref<any>(null)
const discountInfo = ref<any>(null)
const showPayDialog = ref(false)
const payAmount = ref(0)
const payMethod = ref('wechat')
const pendingPkg = ref<any>(null)
const pendingIdx = ref<number>(0)
const billingRef = ref<InstanceType<typeof BillingRecordSection> | null>(null)
const freePackageClaimed = ref<Record<string, boolean>>({
  ai: false,
  acquisition: false
})

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'

const isCurrentPkg = (pkg: any, idx: number) => {
  if (!currentPackage.value) return false
  return String(currentPackage.value.packageIndex) === String(idx)
}

const isFreePackage = (pkg: any) => !pkg.yearlyPrice && !pkg.salePrice && !pkg.price
const isRecommended = (idx: number) => idx === archivePackages.value.length - 1

const archiveTierTotal = (pkg: any): number => {
  if (archiveMode.value === 'service_fee') {
    return (pkg.maxMembers || 0) * (archiveGlobalConfig.value.seatServiceFee || 0)
  }
  return (pkg.maxMembers || 0) * (pkg.salePrice || 0)
}

const archiveUnitPriceForCustom = computed(() => {
  if (archiveMode.value === 'service_fee') return archiveGlobalConfig.value.seatServiceFee || 0
  const ap = archivePackages.value
  if (ap.length === 0) return 0
  let matched = ap[ap.length - 1]?.salePrice || 0
  for (const p of ap) {
    if (customUserCount.value <= (p.maxMembers || 0)) { matched = p.salePrice || 0; break }
  }
  return matched
})

const archiveCustomTotal = computed(() => customUserCount.value * archiveUnitPriceForCustom.value)

const getRawPrice = (pkg: any): number => {
  if (props.type === 'wecom') return pkg.yearlyPrice || 0
  if (props.type === 'ai') return pkg.price || 0
  if (props.type === 'acquisition') return pkg.price || 0
  return 0
}

const getPriceUnit = (pkg: any): string => {
  if (props.type === 'wecom') return '年'
  if (props.type === 'ai') return '次'
  if (props.type === 'acquisition') return pkg.billingCycle || '月'
  return '年'
}

const computePrice = (pkg: any): number => {
  let price = getRawPrice(pkg)
  if (!price) return 0
  if (discountInfo.value && discountInfo.value.yearlyDiscount < 100 && price > 0) {
    if (props.type !== 'acquisition' || pkg.billingCycle === '年') {
      price = Math.round(price * discountInfo.value.yearlyDiscount / 100)
    }
  }
  return price
}

const loadData = async () => {
  loading.value = true
  try {
    const [configRes, pkgRes, billingRes] = await Promise.all([
      getPricingConfig(),
      getTenantPackage(),
      getBillingRecords()
    ])
    const config = configRes?.data || configRes
    const tenantPkg = pkgRes?.data || pkgRes
    const billingRecords = billingRes?.data || []

    if (config) {
      discountInfo.value = config.trialConfig || null
      if (props.type === 'wecom') {
        packages.value = (config.wecomPackages || []).filter((p: any) => p.enabled !== false)
      } else if (props.type === 'archive') {
        archivePackages.value = config.archivePricing || []
        const gc = config.archiveGlobalConfig || {}
        archiveGlobalConfig.value = {
          purchaseMode: gc.purchaseMode || 'proxy_only',
          seatServiceFee: Number(gc.seatServiceFee) || 0,
        }
      } else if (props.type === 'ai') {
        packages.value = config.aiPackages || []
      } else if (props.type === 'acquisition') {
        packages.value = config.acquisitionPricing || []
      }
    }

    if (tenantPkg) {
      currentPackage.value = tenantPkg
    }

    // 检查免费套餐领取状态
    if (Array.isArray(billingRecords)) {
      // AI助手免费套餐检查
      if (props.type === 'ai') {
        const aiFreeClaimed = billingRecords.some((r: any) =>
          r.type === 'ai' && (r.status === 'free' || r.status === 'paid' || r.status === 'active') && r.amount === 0
        )
        freePackageClaimed.value.ai = aiFreeClaimed
      }
      // 获客助手免费套餐检查
      if (props.type === 'acquisition') {
        const acqFreeClaimed = billingRecords.some((r: any) =>
          r.type === 'acquisition' && (r.status === 'free' || r.status === 'paid' || r.status === 'active') && r.amount === 0
        )
        freePackageClaimed.value.acquisition = acqFreeClaimed
      }
    }
  } catch (e) {
    console.warn('[PackagePurchaseTab] Load pricing failed:', e)
    ElMessage.warning('套餐数据加载失败，请刷新重试')
  }
  loading.value = false
}

const selectArchiveTier = (idx: number) => {
  selectedArchiveTier.value = idx
  const pkg = archivePackages.value[idx]
  if (pkg) customUserCount.value = pkg.maxMembers || 10
}

const handleArchiveCustomPurchase = async () => {
  if (customUserCount.value < 1) return
  purchasing.value = true
  try {
    await _purchaseArchivePackage({ userCount: customUserCount.value, purchaseMode: archiveMode.value })
    ElMessage.success('下单成功，请完成支付')
    emit('packageChanged')
    window.dispatchEvent(new CustomEvent('wecom-package-changed'))
    pendingPkg.value = { tierLabel: `自选${customUserCount.value}人` }
    payAmount.value = archiveCustomTotal.value
    showPayDialog.value = true
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '购买失败')
  }
  purchasing.value = false
}

const handleClaim = async (pkg: any, idx: number) => {
  purchasing.value = true
  try {
    if (props.type === 'wecom') {
      await claimWecomPackage({ packageId: idx, action: 'claim' })
    } else if (props.type === 'ai') {
      await purchaseAiPackage({ packageId: pkg.id })
    } else if (props.type === 'acquisition') {
      await purchaseAcquisitionPackage({ tierId: idx })
    }
    ElMessage.success('领取成功！')
    // 更新免费套餐领取状态
    if (props.type === 'ai' && pkg.price === 0) {
      freePackageClaimed.value.ai = true
    }
    if (props.type === 'acquisition' && pkg.price === 0) {
      freePackageClaimed.value.acquisition = true
    }
    await loadData()
    billingRef.value?.loadRecords()
    emit('packageChanged')
    window.dispatchEvent(new CustomEvent('wecom-package-changed'))
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '领取失败')
  }
  purchasing.value = false
}

const orderCreated = ref(false)

const handlePurchase = async (pkg: any, idx: number) => {
  pendingPkg.value = pkg
  pendingIdx.value = idx
  payAmount.value = computePrice(pkg)
  orderCreated.value = false
  purchasing.value = true
  try {
    // 先创建订单（不激活套餐，仅生成待支付账单）
    if (props.type === 'wecom') {
      await claimWecomPackage({ packageId: idx, action: 'purchase' })
    } else if (props.type === 'archive') {
      await _purchaseArchivePackage({ tierId: idx, purchaseMode: archiveMode.value })
    } else if (props.type === 'acquisition') {
      await purchaseAcquisitionPackage({ tierId: idx })
    } else if (props.type === 'ai') {
      await purchaseAiPackage({ packageId: pkg.id })
    }
    orderCreated.value = true
    showPayDialog.value = true
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '创建订单失败')
  }
  purchasing.value = false
}

const confirmPayment = async () => {
  if (!pendingPkg.value) return
  purchasing.value = true
  try {
    const pkg = pendingPkg.value
    await confirmWecomPayment({
      type: props.type,
      packageName: pkg.name || pkg.tierLabel,
    })
    ElMessage.success('支付确认成功，服务已开通！')
    showPayDialog.value = false
    await loadData()
    billingRef.value?.loadRecords()
    emit('packageChanged')
    window.dispatchEvent(new CustomEvent('wecom-package-changed'))
  } catch (e: any) {
    const msg = e?.response?.data?.message || e?.message || '支付确认失败'
    ElMessage.error(msg)
  }
  purchasing.value = false
}

onMounted(loadData)
</script>

<style scoped>
.package-purchase-tab { padding: 4px 0; }
.loading-state { padding: 20px; }

.current-package-bar {
  display: flex; align-items: center; justify-content: space-between;
  padding: 12px 16px; background: linear-gradient(135deg, #f0f7ff 0%, #e8f4f8 100%);
  border: 1px solid #d6e4ff; border-radius: 8px; margin-bottom: 20px;
}
.cpb-info { display: flex; align-items: center; gap: 8px; font-size: 14px; color: #1d2129; }
.cpb-date { font-size: 12px; color: #86909c; }

/* ========== Archive 模式切换 ========== */
.archive-mode-switch {
  background: #f8f9fb; border: 1px solid #ebeef5; border-radius: 10px;
  padding: 16px 20px; margin-bottom: 18px;
}
.ams-label { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 10px; }
.ams-btns { display: flex; gap: 10px; margin-bottom: 8px; }
.ams-hint { font-size: 12px; color: #909399; line-height: 1.5; }

/* ========== Archive 套餐卡片 ========== */
.archive-cards {
  display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr));
  gap: 14px; margin-bottom: 18px;
}
.a-card {
  position: relative; background: #fff; border: 2px solid #e5e6eb;
  border-radius: 12px; padding: 22px 18px 18px; transition: all 0.25s;
  cursor: pointer; display: flex; flex-direction: column;
}
.a-card:hover { border-color: #409eff; box-shadow: 0 4px 16px rgba(64,158,255,0.1); transform: translateY(-2px); }
.a-card.selected { border-color: #409eff; background: linear-gradient(180deg, #f0f7ff 0%, #fff 35%); box-shadow: 0 4px 16px rgba(64,158,255,0.15); }
.a-card.recommended:not(.selected) { border-color: #ffc53d; }
.a-card-badge {
  position: absolute; top: -1px; right: 16px;
  background: linear-gradient(135deg, #409eff, #1677ff); color: #fff;
  font-size: 12px; font-weight: 600; padding: 2px 12px 4px; border-radius: 0 0 8px 8px;
}
.a-card-badge-current { background: linear-gradient(135deg, #67c23a, #4caf50); right: auto; left: 16px; }
.a-card-title { font-size: 17px; font-weight: 700; margin: 0 0 10px; color: #1d2129; }
.a-card-price { display: flex; align-items: baseline; gap: 2px; margin-bottom: 4px; }
.a-price-symbol { font-size: 15px; font-weight: 600; color: #f5222d; }
.a-price-num { font-size: 30px; font-weight: 800; color: #f5222d; line-height: 1; }
.a-price-unit { font-size: 13px; color: #86909c; }
.a-card-subtitle { font-size: 12px; color: #409eff; font-weight: 500; margin-bottom: 12px; }
.a-card-features { list-style: none; padding: 0; margin: 0 0 14px; flex: 1; }
.a-card-features li { font-size: 13px; color: #4e5969; padding: 3px 0; display: flex; align-items: center; gap: 6px; }
.a-ft { font-size: 14px; width: 18px; text-align: center; flex-shrink: 0; }
.a-card-btn { margin-top: auto; }

/* ========== 自选人数区 ========== */
.custom-count-section {
  background: #f8f9fb; border: 1px solid #ebeef5; border-radius: 10px;
  padding: 18px 20px; margin-bottom: 18px;
}
.ccs-header { display: flex; align-items: center; gap: 10px; margin-bottom: 14px; }
.ccs-header span:first-child { font-size: 15px; font-weight: 600; color: #303133; }
.ccs-body { }
.ccs-row { display: flex; align-items: center; justify-content: space-between; padding: 6px 0; }
.ccs-label { font-size: 13px; color: #606266; }
.ccs-val { font-size: 13px; color: #303133; }
.ccs-val.highlight { color: #409eff; font-weight: 700; font-size: 16px; }
.ccs-total { padding-top: 10px; }
.ccs-total-amount { font-size: 26px; font-weight: 800; color: #f5222d; }
.ccs-actions { margin-top: 14px; text-align: right; }
.ccs-actions .el-button { font-size: 15px; padding: 12px 28px; }

/* ========== 通用卡片 ========== */
.pkg-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(240px, 1fr)); gap: 16px; }
.pkg-card {
  position: relative; border: 2px solid #e5e6eb; border-radius: 12px;
  padding: 24px 20px 20px; background: #fff; transition: all 0.3s;
  display: flex; flex-direction: column;
}
.pkg-card:hover { border-color: #409eff; box-shadow: 0 4px 16px rgba(64,158,255,0.12); transform: translateY(-2px); }
.pkg-recommended { border-color: #409eff; background: linear-gradient(180deg, #f0f7ff 0%, #fff 30%); }
.pkg-current { border-color: #67c23a; background: linear-gradient(180deg, #f0f9eb 0%, #fff 30%); }
.pkg-disabled { opacity: 0.5; pointer-events: none; }
.pkg-badge {
  position: absolute; top: -1px; right: 20px;
  background: linear-gradient(135deg, #409eff, #1677ff); color: #fff;
  font-size: 12px; font-weight: 600; padding: 2px 12px 4px; border-radius: 0 0 8px 8px;
}
.pkg-badge-current { background: linear-gradient(135deg, #67c23a, #4caf50); right: auto; left: 20px; }
.pkg-name { font-size: 18px; font-weight: 700; margin: 0 0 12px; color: #1d2129; }
.pkg-price-row { display: flex; align-items: baseline; gap: 2px; margin-bottom: 4px; }
.pkg-symbol { font-size: 16px; font-weight: 600; color: #f5222d; }
.pkg-price { font-size: 32px; font-weight: 800; color: #f5222d; line-height: 1; }
.pkg-unit { font-size: 13px; color: #86909c; }
.pkg-free { font-size: 28px; font-weight: 800; color: #00b42a; }
.pkg-discount-hint { font-size: 12px; color: #f59e0b; margin-bottom: 8px; }
.pkg-features { list-style: none; padding: 0; margin: 12px 0; flex: 1; }
.pkg-features li { font-size: 13px; color: #4e5969; padding: 4px 0; display: flex; align-items: center; gap: 6px; }
.feat-icon { font-size: 14px; width: 20px; text-align: center; flex-shrink: 0; }
.feat-on { color: #00b42a; font-size: 12px; }
.feat-off { color: #c9cdd4; font-size: 12px; }
.pkg-desc { font-size: 12px; color: #86909c; margin: 0 0 12px; line-height: 1.5; }
.pkg-action { margin-top: auto; padding-top: 12px; }

/* 支付弹窗 */
.pay-dialog-body { text-align: center; }
.pay-pkg-name { font-size: 16px; font-weight: 700; color: #1d2129; margin-bottom: 8px; }
.pay-amount { display: flex; align-items: center; justify-content: center; gap: 12px; margin-bottom: 20px; font-size: 15px; }
.pay-amount strong { font-size: 32px; color: #f5222d; font-weight: 800; }
.pay-qrcode { margin-bottom: 20px; }
.qr-placeholder {
  width: 200px; height: 200px; margin: 0 auto; border: 2px dashed #d9d9d9; border-radius: 12px;
  display: flex; flex-direction: column; align-items: center; justify-content: center; background: #fafafa;
}
.qr-placeholder p { margin: 8px 0 0; font-size: 13px; color: #86909c; }
.qr-hint { font-size: 11px !important; color: #c0c4cc !important; }
.pay-methods { display: flex; align-items: center; justify-content: center; gap: 8px; }
.pm-label { font-size: 13px; color: #4e5969; }
</style>
