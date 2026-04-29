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
    <BillingRecordSection :type="type" ref="billingRef" @repay="handleRepay" />

    <!-- 支付弹窗 -->
    <el-dialog v-model="showPayDialog" title="扫码支付" width="420px" :close-on-click-modal="false" center @closed="onPayDialogClosed">
      <div class="pay-dialog-body">
        <div class="pay-pkg-name">{{ pendingPkg?.name || pendingPkg?.tierLabel }}</div>
        <div class="pay-amount">
          <span>应付金额</span>
          <strong>¥{{ payAmount }}</strong>
        </div>
        <div class="pay-qrcode">
          <div v-if="currentPayUrl" class="qr-code-box">
            <canvas ref="qrCanvasRef" />
          </div>
          <div v-else-if="qrLoading" class="qr-placeholder">
            <el-icon :size="48" color="#409eff" class="is-loading"><Loading /></el-icon>
            <p>二维码生成中...</p>
          </div>
          <div v-else class="qr-placeholder">
            <el-icon :size="48" color="#909399"><Warning /></el-icon>
            <p>支付服务配置中，请联系管理员</p>
            <p class="qr-hint">订单已创建，配置支付后可在购买记录中重新支付</p>
          </div>
        </div>
        <div class="pay-methods">
          <span class="pm-label">支付方式：</span>
          <div class="pm-buttons">
            <div class="pm-btn" :class="{ active: payMethod === 'wechat' }" @click="switchPayMethod('wechat')">
              <span class="pm-icon wechat-icon"></span>微信支付
            </div>
            <div class="pm-btn" :class="{ active: payMethod === 'alipay' }" @click="switchPayMethod('alipay')">
              <span class="pm-icon alipay-icon"></span>支付宝
            </div>
          </div>
        </div>
        <p v-if="currentPayUrl" class="pay-scan-tip">请使用{{ payMethod === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
        <p v-if="currentOrderNo" class="pay-order-no">订单号：{{ currentOrderNo }}</p>
        <el-alert v-if="isDev" type="warning" :closable="false" style="margin-top:12px; margin-bottom:8px">
          <template #title>开发模式：点击“我已完成支付”将直接确认，生产环境需真实支付</template>
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
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { CircleCheckFilled, ShoppingCart, Promotion, Loading, Warning } from '@element-plus/icons-vue'
import QRCode from 'qrcode'
import {
  getPricingConfig, getTenantPackage,
  claimWecomPackage, purchaseAiPackage,
  purchaseArchivePackage as _purchaseArchivePackage,
  purchaseAcquisitionPackage,
  confirmWecomPayment,
  getBillingRecords
} from '@/api/wecom'
import BillingRecordSection from './BillingRecordSection.vue'
import request from '@/utils/request'

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
const qrCanvasRef = ref<HTMLCanvasElement>()
const currentPayUrl = ref('')
const currentOrderNo = ref('')
const qrLoading = ref(false)
let payPollTimer: ReturnType<typeof setInterval> | null = null
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
  currentPayUrl.value = ''
  currentOrderNo.value = ''
  qrLoading.value = true
  purchasing.value = true
  try {
    const res: any = await _purchaseArchivePackage({ userCount: customUserCount.value, purchaseMode: archiveMode.value, payType: payMethod.value } as any)
    const data = res?.data || res
    currentOrderNo.value = data?.orderNo || ''
    currentPayUrl.value = data?.payUrl || ''
    pendingPkg.value = { tierLabel: `自选${customUserCount.value}人` }
    payAmount.value = archiveCustomTotal.value
    showPayDialog.value = true
    billingRef.value?.loadRecords()
    emit('packageChanged')
    window.dispatchEvent(new CustomEvent('wecom-package-changed'))
    await nextTick()
    renderQrCode(data?.payUrl || data?.qrCode || '')
    if (currentOrderNo.value) startPayPolling(currentOrderNo.value)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '购买失败')
  }
  purchasing.value = false
  qrLoading.value = false
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
  currentPayUrl.value = ''
  currentOrderNo.value = ''
  qrLoading.value = true
  purchasing.value = true
  try {
    let res: any
    if (props.type === 'wecom') {
      res = await claimWecomPackage({ packageId: idx, action: 'purchase', payType: payMethod.value } as any)
    } else if (props.type === 'archive') {
      res = await _purchaseArchivePackage({ tierId: idx, purchaseMode: archiveMode.value, payType: payMethod.value } as any)
    } else if (props.type === 'acquisition') {
      res = await purchaseAcquisitionPackage({ tierId: idx, payType: payMethod.value } as any)
    } else if (props.type === 'ai') {
      res = await purchaseAiPackage({ packageId: pkg.id, payType: payMethod.value } as any)
    }
    orderCreated.value = true
    const data = res?.data || res
    currentOrderNo.value = data?.orderNo || ''
    currentPayUrl.value = data?.payUrl || ''
    showPayDialog.value = true
    billingRef.value?.loadRecords()
    await nextTick()
    renderQrCode(data?.payUrl || data?.qrCode || '')
    if (currentOrderNo.value) startPayPolling(currentOrderNo.value)
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '创建订单失败')
  }
  purchasing.value = false
  qrLoading.value = false
}

const confirmPayment = async () => {
  if (!pendingPkg.value) return
  purchasing.value = true
  try {
    const pkg = pendingPkg.value
    await confirmWecomPayment({
      type: props.type,
      packageName: pkg.name || pkg.tierLabel,
      orderNo: currentOrderNo.value || undefined
    } as any)
    ElMessage.success('支付确认成功，服务已开通！')
    showPayDialog.value = false
    stopPayPolling()
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

const renderQrCode = async (url: string) => {
  if (!url) return
  // 如果是base64编码的支付URL，解码出真实 URL
  let payUrl = url
  if (url.startsWith('data:text/plain;base64,')) {
    try { payUrl = atob(url.replace('data:text/plain;base64,', '')) } catch { /* ignore */ }
  }
  await nextTick()
  if (qrCanvasRef.value && payUrl) {
    try {
      await QRCode.toCanvas(qrCanvasRef.value, payUrl, {
        width: 200, margin: 2,
        color: { dark: '#1F2937', light: '#FFFFFF' }
      })
    } catch (e) { console.error('[QR] render error:', e) }
  }
}

const switchPayMethod = async (method: string) => {
  if (method === payMethod.value) return
  payMethod.value = method
  if (!currentOrderNo.value) return
  qrLoading.value = true
  currentPayUrl.value = ''
  try {
    const res: any = await request.post(`/public/payment/repay/${currentOrderNo.value}`, { payType: method })
    const data = res?.data || res
    currentPayUrl.value = data?.payUrl || ''
    await nextTick()
    renderQrCode(data?.payUrl || data?.qrCode || '')
  } catch (e: any) {
    console.warn('[Pay] repay error:', e)
    ElMessage.warning('切换支付方式失败，请重试')
  }
  qrLoading.value = false
}

const startPayPolling = (orderNo: string) => {
  stopPayPolling()
  payPollTimer = setInterval(async () => {
    try {
      const res: any = await request.get(`/public/payment/query/${orderNo}`)
      const data = res?.data || res
      if (data?.status === 'paid') {
        stopPayPolling()
        ElMessage.success('支付成功，服务已开通！')
        showPayDialog.value = false
        await loadData()
        billingRef.value?.loadRecords()
        emit('packageChanged')
        window.dispatchEvent(new CustomEvent('wecom-package-changed'))
      }
    } catch { /* ignore */ }
  }, 3000)
  setTimeout(() => stopPayPolling(), 10 * 60 * 1000)
}

const stopPayPolling = () => {
  if (payPollTimer) { clearInterval(payPollTimer); payPollTimer = null }
}

const onPayDialogClosed = () => {
  stopPayPolling()
  currentPayUrl.value = ''
  currentOrderNo.value = ''
}

const handleRepay = async (row: any) => {
  const orderNo = row.orderNo
  if (!orderNo) {
    ElMessage.info('该订单无支付信息，请重新下单')
    return
  }
  pendingPkg.value = { name: row.packageName, tierLabel: row.packageName }
  payAmount.value = row.amount || 0
  currentOrderNo.value = orderNo
  currentPayUrl.value = ''
  qrLoading.value = true
  showPayDialog.value = true
  try {
    const res: any = await request.post(`/public/payment/repay/${orderNo}`, { payType: payMethod.value })
    const data = res?.data || res
    currentPayUrl.value = data?.payUrl || ''
    await nextTick()
    renderQrCode(data?.payUrl || data?.qrCode || '')
    startPayPolling(orderNo)
  } catch (e: any) {
    console.warn('[Pay] repay error:', e)
  }
  qrLoading.value = false
}

onMounted(loadData)
onUnmounted(stopPayPolling)

defineExpose({ handleRepay })
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
.qr-code-box {
  width: 200px; height: 200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: center;
  border: 1px solid #ebeef5; border-radius: 8px; background: #fff;
}
.pay-scan-tip { font-size: 13px; color: #409eff; margin: 8px 0 0; }
.pay-order-no { font-size: 12px; color: #909399; margin: 4px 0 0; }
.pay-methods { display: flex; align-items: center; justify-content: center; gap: 8px; margin-top: 16px; }
.pm-label { font-size: 13px; color: #4e5969; flex-shrink: 0; }
.pm-buttons { display: flex; gap: 8px; }
.pm-btn {
  display: flex; align-items: center; gap: 6px; cursor: pointer;
  padding: 6px 16px; border-radius: 6px; font-size: 13px; font-weight: 500;
  border: 1px solid #dcdfe6; color: #606266; background: #fff; transition: all 0.2s;
}
.pm-btn:hover { border-color: #409eff; color: #409eff; }
.pm-btn.active { border-color: #409eff; color: #409eff; background: #ecf5ff; }
.pm-icon {
  display: inline-block; width: 18px; height: 18px; border-radius: 3px;
  background-size: contain; background-repeat: no-repeat; background-position: center;
}
.wechat-icon { background-color: #07c160; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.99a.96.96 0 0 1 0 1.92.96.96 0 0 1 0-1.92zm5.812 0a.96.96 0 0 1 0 1.92.96.96 0 0 1 0-1.92zm3.649 3.271c-3.889 0-7.246 2.677-7.246 6.08 0 3.402 3.357 6.079 7.246 6.079.613 0 1.206-.075 1.78-.218a.62.62 0 0 1 .52.072l1.38.808a.24.24 0 0 0 .122.04c.116 0 .21-.097.21-.215 0-.052-.021-.104-.035-.155l-.283-1.073a.43.43 0 0 1 .154-.483c1.33-.981 2.178-2.424 2.178-4.025 0-2.232-1.825-4.134-4.348-5.333a8.028 8.028 0 0 0-1.678-.577zm-2.055 2.54a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44zm4.349 0a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44z'/%3E%3C/svg%3E") center / contain no-repeat; -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 0 1 .213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 0 0 .167-.054l1.903-1.114a.864.864 0 0 1 .717-.098 10.16 10.16 0 0 0 2.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.99a.96.96 0 0 1 0 1.92.96.96 0 0 1 0-1.92zm5.812 0a.96.96 0 0 1 0 1.92.96.96 0 0 1 0-1.92zm3.649 3.271c-3.889 0-7.246 2.677-7.246 6.08 0 3.402 3.357 6.079 7.246 6.079.613 0 1.206-.075 1.78-.218a.62.62 0 0 1 .52.072l1.38.808a.24.24 0 0 0 .122.04c.116 0 .21-.097.21-.215 0-.052-.021-.104-.035-.155l-.283-1.073a.43.43 0 0 1 .154-.483c1.33-.981 2.178-2.424 2.178-4.025 0-2.232-1.825-4.134-4.348-5.333a8.028 8.028 0 0 0-1.678-.577zm-2.055 2.54a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44zm4.349 0a.72.72 0 1 1 0 1.44.72.72 0 0 1 0-1.44z'/%3E%3C/svg%3E") center / contain no-repeat; }
.alipay-icon { background-color: #1677ff; mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21.422 15.358c-1.549-.724-4.494-2.064-6.455-3.04.63-1.27 1.1-2.727 1.357-4.318h-4.324V6.2h5.2V5.1h-5.2V2.3h-2.3s-.1.047-.1.147V5.1H4.4v1.1h5.2V8h-4.324v.9H14.2c-.2 1.2-.6 2.3-1.1 3.2-2.2-1-5.4-2-7.7-2-3.3 0-5.4 1.8-5.4 4 0 2.1 1.8 4.1 5.7 4.1 2.9 0 5.4-1.4 7.3-3.4 2.3 1.2 7.4 3.5 8.6 4.1.3.1.5.2.7.2.7 0 1.7-.6 1.7-1.8 0-.6-.2-1.2-.58-2zm-16.522 2.5c-2.9 0-3.9-1.3-3.9-2.6 0-1.4 1.3-2.6 3.7-2.6 1.8 0 4.3.7 6.3 1.7-1.6 2-3.7 3.5-6.1 3.5z'/%3E%3C/svg%3E") center / contain no-repeat; -webkit-mask: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath d='M21.422 15.358c-1.549-.724-4.494-2.064-6.455-3.04.63-1.27 1.1-2.727 1.357-4.318h-4.324V6.2h5.2V5.1h-5.2V2.3h-2.3s-.1.047-.1.147V5.1H4.4v1.1h5.2V8h-4.324v.9H14.2c-.2 1.2-.6 2.3-1.1 3.2-2.2-1-5.4-2-7.7-2-3.3 0-5.4 1.8-5.4 4 0 2.1 1.8 4.1 5.7 4.1 2.9 0 5.4-1.4 7.3-3.4 2.3 1.2 7.4 3.5 8.6 4.1.3.1.5.2.7.2.7 0 1.7-.6 1.7-1.8 0-.6-.2-1.2-.58-2zm-16.522 2.5c-2.9 0-3.9-1.3-3.9-2.6 0-1.4 1.3-2.6 3.7-2.6 1.8 0 4.3.7 6.3 1.7-1.6 2-3.7 3.5-6.1 3.5z'/%3E%3C/svg%3E") center / contain no-repeat; }
</style>
