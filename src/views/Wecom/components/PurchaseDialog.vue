<template>
  <el-dialog :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="开通会话存档增值服务" width="640px" :close-on-click-modal="false">
    <template v-if="purchaseStep === 'select'">
      <!-- 企微服务费说明 -->
      <el-alert type="warning" :closable="false" style="margin-bottom: 16px">
        <template #title>
          <strong>📢 费用说明</strong>
        </template>
        <div>
          <p style="margin:4px 0">1. <strong>企业微信官方费用</strong>：会话存档接口为企微官方收费功能，需在<strong>企业微信管理后台</strong>自行申请开通并支付（费用由企业微信收取，与本平台无关）。</p>
          <p style="margin:4px 0">2. <strong>云客平台服务费</strong>：以下为本平台提供的存档服务、存储、质检等功能的服务费用。</p>
        </div>
      </el-alert>

      <el-divider content-position="left">选择套餐</el-divider>

      <!-- 预设套餐包快捷选择 -->
      <div class="package-grid">
        <div v-for="pkg in presetPackages" :key="pkg.users"
             class="package-card"
             :class="{ active: purchaseForm.userCount === pkg.users }"
             @click="selectPackage(pkg.users)">
          <div class="pkg-users">{{ pkg.users }}人</div>
          <div class="pkg-price">¥{{ getUnitPriceForCount(pkg.users) }}<span>/人/年</span></div>
          <div class="pkg-total">合计 ¥{{ pkg.users * getUnitPriceForCount(pkg.users) }}</div>
          <div v-if="pkg.label" class="pkg-badge">{{ pkg.label }}</div>
        </div>
      </div>

      <!-- 自定义人数 -->
      <div class="custom-count-row">
        <span class="custom-label">自定义人数：</span>
        <el-input-number v-model="purchaseForm.userCount" :min="1" :max="9999" :step="1" size="default" />
        <span style="margin-left:8px; color:#909399">人</span>
      </div>

      <!-- 阶梯定价参考 -->
      <el-collapse style="margin-bottom:16px">
        <el-collapse-item title="📊 阶梯定价明细" name="tier">
          <el-table :data="vasPricing.tierPricing || []" border size="small">
            <el-table-column prop="min" label="起始人数" width="100" align="center" />
            <el-table-column label="截止人数" width="100" align="center">
              <template #default="{ row }">{{ row.max >= 999999 ? '不限' : row.max }}</template>
            </el-table-column>
            <el-table-column label="单价" width="130" align="center">
              <template #default="{ row }">
                <span :style="{ color: isActiveTier(row) ? '#07c160' : '#606266', fontWeight: isActiveTier(row) ? '700' : '400' }">
                  ¥{{ row.price }}/人/年
                </span>
              </template>
            </el-table-column>
          </el-table>
        </el-collapse-item>
      </el-collapse>

      <!-- 费用汇总 -->
      <div class="purchase-summary">
        <div class="summary-row">
          <span>开通人数</span>
          <span class="summary-value">{{ purchaseForm.userCount }} 人</span>
        </div>
        <div class="summary-row">
          <span>适用单价</span>
          <span class="summary-value" style="color:#07c160">¥{{ computedUnitPrice }}/人/年</span>
        </div>
        <div class="summary-row">
          <span>服务期限</span>
          <span class="summary-value">1 年（购买即生效）</span>
        </div>
        <div class="summary-divider"></div>
        <div class="summary-row summary-total">
          <span>应付总额</span>
          <span class="summary-value" style="font-size:24px;color:#f56c6c;font-weight:700">¥{{ computedTotalAmount }}</span>
        </div>
      </div>

      <!-- 支付方式 -->
      <el-form label-width="100px" style="margin-top:16px">
        <el-form-item label="支付方式">
          <el-radio-group v-model="purchaseForm.payType">
            <el-radio-button label="wechat">💚 微信支付</el-radio-button>
            <el-radio-button label="alipay">🔵 支付宝</el-radio-button>
            <el-radio-button label="bank">🏦 对公转账</el-radio-button>
          </el-radio-group>
        </el-form-item>
      </el-form>

      <el-alert type="info" :closable="false" style="margin-top:8px">
        <template #title>✅ 购买即生效</template>
        支付成功后，会话存档增值服务将立即激活，您可以直接使用会话存档功能。订单同步显示在管理后台的支付管理列表中。
      </el-alert>
    </template>

    <template v-else-if="purchaseStep === 'paying'">
      <div class="pay-qr-wrapper">
        <h3 style="text-align:center;margin-bottom:16px">{{ purchaseForm.payType === 'bank' ? '请转账到以下账户' : '请扫码支付' }}</h3>
        <div class="pay-amount" style="text-align:center;margin-bottom:16px">
          <span style="font-size:14px;color:#909399">支付金额：</span>
          <span style="font-size:28px;font-weight:700;color:#f56c6c">¥{{ purchaseResult.amount }}</span>
        </div>
        <div class="pay-package-name" style="text-align:center;margin-bottom:16px;color:#909399;font-size:13px">
          {{ purchaseResult.packageName }}
        </div>
        <div v-if="purchaseForm.payType !== 'bank'" style="text-align:center;margin-bottom:16px">
          <el-image :src="purchaseResult.qrCode" style="width:200px;height:200px" fit="contain">
            <template #error><div style="padding:40px;color:#909399">二维码加载中...</div></template>
          </el-image>
          <p style="color:#909399;font-size:13px;margin-top:8px">请使用{{ purchaseForm.payType === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
        </div>
        <div v-else style="text-align:center;padding:20px;background:#f5f7fa;border-radius:8px;margin-bottom:16px">
          <p>请将 <strong style="color:#f56c6c">¥{{ purchaseResult.amount }}</strong> 转账至平台对公账户</p>
          <p style="color:#909399;font-size:13px">转账备注请填写订单号: <strong style="color:#07c160">{{ purchaseResult.orderNo }}</strong></p>
        </div>
        <div style="text-align:center">
          <p style="color:#909399;font-size:13px">订单号: {{ purchaseResult.orderNo }}</p>
          <p style="color:#909399;font-size:13px" v-if="purchaseForm.payType !== 'bank'">支付完成后，系统将自动检测并开通服务（约3秒检测一次）</p>
          <div style="margin-top:12px;display:flex;justify-content:center;gap:16px">
            <el-button type="primary" @click="checkPayStatus" :loading="checkingPay">
              <el-icon><Refresh /></el-icon> 我已完成支付
            </el-button>
          </div>
        </div>
      </div>
    </template>

    <template v-else-if="purchaseStep === 'success'">
      <el-result icon="success" title="🎉 开通成功！" sub-title="会话存档增值服务已激活，您可以立即使用">
        <template #extra>
          <p style="color:#909399;margin-bottom:16px">服务有效期：1年（自支付时间起）</p>
          <el-button type="primary" @click="handlePurchaseComplete">刷新页面使用</el-button>
        </template>
      </el-result>
    </template>

    <template #footer v-if="purchaseStep === 'select'">
      <el-button @click="$emit('update:modelValue', false)">取消</el-button>
      <el-button type="primary" :loading="purchasing" @click="submitPurchase">
        确认支付 ¥{{ computedTotalAmount }}
      </el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getVasPricing, purchaseChatArchive, getVasOrderStatus } from '@/api/wecom'
import type { VasPricing, PurchaseResult, PresetPackage } from '../types'

defineOptions({ name: 'PurchaseDialog' })

const props = defineProps<{
  modelValue: boolean
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
  (e: 'purchase-complete'): void
}>()

// 状态
const purchaseStep = ref<'select' | 'paying' | 'success'>('select')
const purchasing = ref(false)
const checkingPay = ref(false)
const vasPricing = ref<VasPricing>({})
const purchaseForm = ref({ userCount: 5, payType: 'wechat' })
const purchaseResult = ref<PurchaseResult>({ orderNo: '', amount: 0, packageName: '' })
let pollTimer: ReturnType<typeof setInterval> | null = null

// 预设套餐包
const presetPackages: PresetPackage[] = [
  { users: 5, label: '入门' },
  { users: 10, label: '基础' },
  { users: 20, label: '标准' },
  { users: 50, label: '推荐' },
  { users: 100, label: '企业' },
  { users: 200, label: '' }
]

const getUnitPriceForCount = (count: number) => {
  const tiers = vasPricing.value.tierPricing || []
  for (const tier of tiers) {
    if (count >= tier.min && count <= tier.max) return tier.price
  }
  return vasPricing.value.defaultPrice || 100
}

const selectPackage = (users: number) => {
  purchaseForm.value.userCount = users
}

const isActiveTier = (tier: { min: number; max: number }) => {
  const count = purchaseForm.value.userCount
  return count >= tier.min && count <= tier.max
}

const computedUnitPrice = computed(() => getUnitPriceForCount(purchaseForm.value.userCount))
const computedTotalAmount = computed(() => purchaseForm.value.userCount * computedUnitPrice.value)

/** 打开弹窗时调用 */
const open = async () => {
  purchaseStep.value = 'select'
  purchaseForm.value = { userCount: 5, payType: 'wechat' }
  try {
    const res = await getVasPricing()
    if (res) vasPricing.value = res as VasPricing
  } catch (e) {
    console.error('Fetch VAS pricing error:', e)
  }
}

const submitPurchase = async () => {
  if (purchaseForm.value.userCount < 1) {
    ElMessage.warning('请选择至少1人')
    return
  }
  purchasing.value = true
  try {
    const res: any = await purchaseChatArchive({
      userCount: purchaseForm.value.userCount,
      payType: purchaseForm.value.payType
    })
    if (res) {
      purchaseResult.value = res
      purchaseStep.value = 'paying'
      startPayPolling(res.orderNo)
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '创建订单失败')
  } finally {
    purchasing.value = false
  }
}

const startPayPolling = (orderNo: string) => {
  if (pollTimer) clearInterval(pollTimer)
  pollTimer = setInterval(async () => {
    try {
      const res: any = await getVasOrderStatus(orderNo)
      if (res?.status === 'paid') {
        if (pollTimer) clearInterval(pollTimer)
        purchaseStep.value = 'success'
        ElMessage.success('支付成功，会话存档已激活！')
      }
    } catch {}
  }, 3000)
  setTimeout(() => { if (pollTimer) clearInterval(pollTimer) }, 5 * 60 * 1000)
}

const checkPayStatus = async () => {
  checkingPay.value = true
  try {
    const res: any = await getVasOrderStatus(purchaseResult.value.orderNo)
    if (res?.status === 'paid') {
      purchaseStep.value = 'success'
      if (pollTimer) clearInterval(pollTimer)
      ElMessage.success('支付成功！')
    } else {
      ElMessage.info('尚未检测到支付，请稍后再试')
    }
  } catch {
    ElMessage.info('查询失败，请稍后重试')
  } finally {
    checkingPay.value = false
  }
}


const handlePurchaseComplete = () => {
  emit('update:modelValue', false)
  if (pollTimer) clearInterval(pollTimer)
  emit('purchase-complete')
}

onUnmounted(() => {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
})

defineExpose({ open })
</script>

<style scoped lang="scss">
/* 支付二维码 */
.pay-qr-wrapper { text-align: center; }

/* 套餐选择卡片 */
.package-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 16px;
}

.package-card {
  position: relative;
  border: 2px solid #e4e7ed;
  border-radius: 10px;
  padding: 16px 12px;
  text-align: center;
  cursor: pointer;
  transition: all 0.25s;
  background: #fff;

  &:hover {
    border-color: #c0c4cc;
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(0,0,0,0.08);
  }

  &.active {
    border-color: #07c160;
    background: #f0faf4;
    box-shadow: 0 2px 12px rgba(7, 193, 96, 0.15);
  }
}

.pkg-users { font-size: 20px; font-weight: 700; color: #303133; margin-bottom: 4px; }
.pkg-price { font-size: 14px; color: #07c160; font-weight: 600; span { font-size: 12px; font-weight: 400; color: #909399; } }
.pkg-total { font-size: 12px; color: #909399; margin-top: 4px; }

.pkg-badge {
  position: absolute; top: -1px; right: -1px;
  background: #07c160; color: #fff; font-size: 11px;
  padding: 2px 8px; border-radius: 0 8px 0 8px; font-weight: 600;
}

.custom-count-row {
  display: flex; align-items: center; margin-bottom: 16px;
  padding: 12px 16px; background: #f9fafb; border-radius: 8px;
}

.custom-label { color: #606266; font-size: 14px; font-weight: 500; margin-right: 12px; white-space: nowrap; }

/* 购买摘要 */
.purchase-summary { background: #f9fafb; border-radius: 10px; padding: 16px 20px; border: 1px solid #e4e7ed; }
.summary-row { display: flex; justify-content: space-between; align-items: center; padding: 6px 0; font-size: 14px; color: #606266; }
.summary-value { font-weight: 500; color: #303133; }
.summary-divider { height: 1px; background: #e4e7ed; margin: 8px 0; }
.summary-total { font-size: 16px; font-weight: 600; padding: 8px 0; }
</style>

