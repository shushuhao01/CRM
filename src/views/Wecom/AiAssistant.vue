<template>
  <div class="wecom-ai-assistant">
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="ai-assistant">
          <span class="ai-title">
            <span class="ai-badge">AI</span>
            AI助手
          </span>
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px">
              <el-option v-for="c in configs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
        </WecomHeader>
      </template>

      <!-- AI使用量条 - 真实统计 -->
      <div class="ai-usage-bar" v-if="aiUsage">
        <div class="usage-info">
          <span v-if="aiUsage.quota > 0">🤖 AI{{ aiUsage.quotaUnit === 'tokens' ? 'Token' : '调用' }}量：{{ aiUsage.used?.toLocaleString() }} / {{ aiUsage.quota?.toLocaleString() }} {{ aiUsage.quotaUnit === 'tokens' ? 'tokens' : '次' }}</span>
          <span v-else>🤖 AI额度：未购买套餐 <el-button type="primary" link size="small" @click="activeTab = 'usage'">去购买</el-button></span>
          <el-tag v-if="aiUsage.quota > 0" :type="aiUsage.percent > 80 ? 'danger' : aiUsage.percent > 50 ? 'warning' : 'success'" size="small">
            {{ aiUsage.percent }}%
          </el-tag>
        </div>
        <el-progress v-if="aiUsage.quota > 0" :percentage="aiUsage.percent" :color="aiUsage.percent > 80 ? '#EF4444' : '#7C3AED'" :stroke-width="10" :show-text="false" />
      </div>

      <el-tabs v-model="activeTab">
        <!-- Tab 1: AI配置中心 -->
        <el-tab-pane label="AI配置" name="config">
          <AiModelManager ref="modelManagerRef" @refresh="refreshAll" />
          <el-divider />
          <AiAgentManager ref="agentManagerRef" @refresh="refreshAll" />
        </el-tab-pane>

        <!-- Tab 2: 知识库 -->
        <el-tab-pane label="知识库" name="knowledge">
          <KnowledgeBaseManager />
        </el-tab-pane>

        <!-- Tab 3: 话术库 -->
        <el-tab-pane label="话术库" name="scripts">
          <ScriptManager />
        </el-tab-pane>

        <!-- Tab 4: 敏感词库 -->
        <el-tab-pane label="敏感词库" name="sensitive">
          <SensitiveWordEnhanced />
        </el-tab-pane>

        <!-- Tab 5: 标签AI -->
        <el-tab-pane label="标签AI" name="tag-ai">
          <AiTagRuleManager />
        </el-tab-pane>

        <!-- Tab 6: 调用日志 -->
        <el-tab-pane label="调用日志" name="logs">
          <AiLogViewer />
        </el-tab-pane>

        <!-- Tab 7: 订单与使用量 -->
        <el-tab-pane label="订单与使用量" name="usage">
          <div class="usage-tab">
            <!-- 套餐购买区 -->
            <div class="section-block">
              <h3 class="section-title"><span class="title-icon">📦</span> AI额度套餐</h3>
              <div v-if="packages.length" class="packages-grid-new">
                <div v-for="(pkg, idx) in packages" :key="pkg.id"
                     class="pkg-card-new"
                     :class="{ 'pkg-recommended': idx === 2, 'pkg-disabled': pkg.price === 0 && freePackageClaimed }">
                  <div class="pkg-badge-new" v-if="idx === 2">推荐</div>
                  <div class="pkg-badge-new pkg-badge-claimed" v-if="pkg.price === 0 && freePackageClaimed">已领取</div>
                  <h4 class="pkg-name-new">{{ pkg.name }}</h4>
                  <div class="pkg-price-row-new">
                    <template v-if="pkg.price > 0">
                      <span class="pkg-symbol-new">¥</span>
                      <span class="pkg-price-new">{{ pkg.price }}</span>
                    </template>
                    <span v-else class="pkg-free-new">免费</span>
                  </div>
                  <ul class="pkg-features-new">
                    <li><span class="feat-icon-new">🤖</span> {{ aiUsage.quotaUnit === 'tokens' ? 'Token额度' : '调用次数' }}：{{ pkg.calls?.toLocaleString() }} {{ aiUsage.quotaUnit === 'tokens' ? 'tokens' : '次' }}</li>
                    <li><span class="feat-icon-new">📅</span> 有效期：{{ pkg.validity === 'forever' ? '永久' : pkg.validity + '天' }}</li>
                    <li v-if="pkg.price === 0 && pkg.freeTrialOnce"><span class="feat-icon-new">⚠️</span> 每个账号仅可领取一次</li>
                  </ul>
                  <p class="pkg-desc-new" v-if="pkg.description">{{ pkg.description }}</p>
                  <div class="pkg-action-new">
                    <template v-if="pkg.price === 0 && freePackageClaimed">
                      <el-button type="info" disabled style="width:100%">
                        已领取
                      </el-button>
                    </template>
                    <template v-else>
                      <el-button
                        :type="idx === 2 ? 'primary' : pkg.price === 0 ? 'success' : 'warning'"
                        @click="handleBuyPackage(pkg)"
                        :loading="buyingPkgId === pkg.id"
                        style="width:100%"
                      >
                        {{ pkg.price > 0 ? '¥' + pkg.price + ' 立即购买' : '免费领取' }}
                      </el-button>
                    </template>
                  </div>
                </div>
              </div>
              <el-empty v-else description="暂无套餐，请联系管理员在后台配置AI额度套餐" />
            </div>

            <!-- 购买记录 -->
            <div class="section-block">
              <h3 class="section-title"><span class="title-icon">🧾</span> 购买记录</h3>
              <el-table :data="orders" v-loading="ordersLoading" stripe size="small" style="width: 100%">
                <el-table-column type="index" label="#" width="50" />
                <el-table-column label="订单号" width="200" prop="orderNo">
                  <template #default="{ row }">
                    <code style="font-size: 11px; color: #7C3AED">{{ row.orderNo || '-' }}</code>
                  </template>
                </el-table-column>
                <el-table-column label="时间" width="170">
                  <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
                </el-table-column>
                <el-table-column prop="packageName" label="套餐名称" min-width="120" />
                <el-table-column :label="aiUsage.quotaUnit === 'tokens' ? 'Token额度' : '调用次数'" width="120" align="right">
                  <template #default="{ row }">{{ row.calls?.toLocaleString() }}</template>
                </el-table-column>
                <el-table-column label="金额" width="100" align="right">
                  <template #default="{ row }">
                    <span :style="{ color: row.price > 0 ? '#EF4444' : '#10B981', fontWeight: 600 }">
                      {{ row.price > 0 ? '¥' + row.price : '免费' }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column label="支付方式" width="100" align="center">
                  <template #default="{ row }">
                    <span>{{ row.payType === 'wechat' ? '微信' : row.payType === 'alipay' ? '支付宝' : row.payType === 'free' ? '免费' : row.payType || '-' }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="状态" width="100" align="center">
                  <template #default="{ row }">
                    <el-tag :type="row.status === 'paid' ? 'success' : row.status === 'pending' ? 'warning' : 'info'" size="small">
                      {{ row.status === 'paid' ? '已支付' : row.status === 'pending' ? '待支付' : row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column label="操作" width="80" align="center">
                  <template #default="{ row }">
                    <el-button v-if="row.status === 'pending'" type="primary" link size="small" @click="handleRepay(row)">去支付</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <div style="display: flex; justify-content: flex-end; margin-top: 12px">
                <el-pagination
                  v-model:current-page="orderPage"
                  :page-size="orderPageSize"
                  :total="orderTotal"
                  layout="total, prev, pager, next"
                  small
                  @current-change="fetchOrders"
                />
              </div>
            </div>

            <!-- 模型使用量 -->
            <div class="section-block">
              <h3 class="section-title"><span class="title-icon">📊</span> 模型使用量</h3>
              <div class="usage-filter-card">
                <el-form :inline="true" size="small">
                  <el-form-item label="开始日期">
                    <el-date-picker v-model="usageStartDate" type="date" placeholder="选择开始日期" value-format="YYYY-MM-DD" style="width: 160px" />
                  </el-form-item>
                  <el-form-item label="结束日期">
                    <el-date-picker v-model="usageEndDate" type="date" placeholder="选择结束日期" value-format="YYYY-MM-DD" style="width: 160px" />
                  </el-form-item>
                  <el-form-item label="快捷范围">
                    <el-radio-group v-model="usageDateRange" size="small" @change="onUsageDateRangeChange">
                      <el-radio-button label="7d">近7天</el-radio-button>
                      <el-radio-button label="30d">近30天</el-radio-button>
                      <el-radio-button label="90d">近90天</el-radio-button>
                      <el-radio-button label="all">全部</el-radio-button>
                    </el-radio-group>
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="fetchModelUsage">查询</el-button>
                    <el-button @click="resetUsageFilter">重置</el-button>
                  </el-form-item>
                </el-form>
              </div>
              <el-table :data="modelUsageList" v-loading="modelUsageLoading" stripe size="small" style="width: 100%">
                <el-table-column type="index" label="#" width="50" />
                <el-table-column prop="modelName" label="模型/智能体" min-width="180">
                  <template #default="{ row }">
                    <span style="font-weight: 500">{{ row.modelName }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="调用次数" width="130" align="right">
                  <template #default="{ row }">
                    <span style="font-weight: 600; color: #7C3AED">{{ row.callCount?.toLocaleString() }}</span>
                  </template>
                </el-table-column>
                <el-table-column label="输入Token" width="130" align="right">
                  <template #default="{ row }">{{ formatTokens(row.inputTokens) }}</template>
                </el-table-column>
                <el-table-column label="输出Token" width="130" align="right">
                  <template #default="{ row }">{{ formatTokens(row.outputTokens) }}</template>
                </el-table-column>
                <el-table-column label="总Token" width="130" align="right">
                  <template #default="{ row }"><strong>{{ formatTokens(row.totalTokens) }}</strong></template>
                </el-table-column>
                <el-table-column label="占比" width="140">
                  <template #default="{ row }">
                    <el-progress :percentage="modelUsageTotal > 0 ? Math.round(row.callCount / totalCallCount * 100) : 0" :stroke-width="6" :color="'#7C3AED'" />
                  </template>
                </el-table-column>
              </el-table>
              <div style="display: flex; justify-content: flex-end; margin-top: 12px">
                <el-pagination
                  v-model:current-page="modelUsagePage"
                  :page-size="modelUsagePageSize"
                  :total="modelUsageTotal"
                  layout="total, sizes, prev, pager, next, jumper"
                  :page-sizes="[10, 20, 50]"
                  small
                  @current-change="fetchModelUsage"
                  @size-change="(val: number) => { modelUsagePageSize = val; fetchModelUsage() }"
                />
              </div>
            </div>

            <!-- 使用量趋势图 -->
            <div class="section-block">
              <h3 class="section-title"><span class="title-icon">📈</span> 使用量趋势（近30天）</h3>
              <div ref="trendChartRef" class="trend-chart"></div>
              <el-empty v-if="!trendData.length" description="暂无趋势数据" />
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 支付弹窗 -->
    <el-dialog v-model="payDialogVisible" title="扫码支付" width="420px" destroy-on-close :close-on-click-modal="false">
      <div class="pay-dialog-content" v-if="payingOrder">
        <div class="pay-order-info">
          <div>套餐：<strong>{{ payingOrder.packageName }}</strong></div>
          <div>额度：<strong>{{ payingOrder.calls?.toLocaleString() }} {{ aiUsage.quotaUnit === 'tokens' ? 'tokens' : '次AI调用' }}</strong></div>
          <div class="pay-amount">¥{{ payingOrder.price }}</div>
        </div>
        <div class="pay-type-select">
          <el-button v-if="availablePayMethods.includes('wechat')" :type="payType === 'wechat' ? 'primary' : 'default'" @click="payType = 'wechat'" size="default">微信支付</el-button>
          <el-button v-if="availablePayMethods.includes('alipay')" :type="payType === 'alipay' ? 'primary' : 'default'" @click="payType = 'alipay'" size="default">支付宝</el-button>
        </div>
        <div class="qr-area">
          <div v-if="payQrCode" class="qr-code-box">
            <img v-if="payQrCode.startsWith('http')" :src="payQrCode" alt="支付二维码" style="width: 200px; height: 200px" />
            <div v-else class="qr-placeholder">
              <el-icon :size="48" color="#7C3AED"><Timer /></el-icon>
              <p>二维码生成中...</p>
            </div>
          </div>
          <div v-else class="qr-placeholder">
            <el-icon :size="48" color="#909399"><Warning /></el-icon>
            <p>支付服务配置中，请联系管理员</p>
            <p style="font-size: 11px; color: #C0C4CC">订单已创建，配置支付后可在购买记录中重新支付</p>
          </div>
        </div>
        <div class="pay-tips">
          <p>📱 请使用{{ payType === 'wechat' ? '微信' : '支付宝' }}扫描二维码完成支付</p>
          <p style="font-size: 12px; color: #909399">支付完成后额度将自动到账</p>
        </div>
      </div>
      <template #footer>
        <el-button @click="payDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="checkPayStatus" :loading="checkingPayStatus">我已支付</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomAiAssistant' })

import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Timer, Warning } from '@element-plus/icons-vue'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import AiModelManager from './components/AiAssistant/AiModelManager.vue'
import AiAgentManager from './components/AiAssistant/AiAgentManager.vue'
import KnowledgeBaseManager from './components/AiAssistant/KnowledgeBaseManager.vue'
import ScriptManager from './components/AiAssistant/ScriptManager.vue'
import SensitiveWordEnhanced from './components/AiAssistant/SensitiveWordEnhanced.vue'
import AiTagRuleManager from './components/AiAssistant/AiTagRuleManager.vue'
import AiLogViewer from './components/AiAssistant/AiLogViewer.vue'
import { useWecomDemo } from './composables/useWecomDemo'
import {
  getAiUsageOverview, getAiPackages, getAiOrders, createAiOrder,
  getAiModelUsage, getAiUsageTrend, checkAiOrderStatus
} from '@/api/wecomAi'
import { getWecomConfigs } from '@/api/wecom'

const { isDemoMode } = useWecomDemo()

const selectedConfigId = ref<number>()
const configs = ref<any[]>([])
const activeTab = ref('config')

const fetchWecomConfigs = async () => {
  try {
    const res: any = await getWecomConfigs()
    const list = res?.data || res || []
    configs.value = Array.isArray(list) ? list : []
    if (configs.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configs.value[0].id
    }
  } catch { /* ignore */ }
}

const aiUsage = ref<any>({ used: 0, quota: 0, percent: 0, quotaUnit: 'calls' })

const modelManagerRef = ref<InstanceType<typeof AiModelManager>>()
const agentManagerRef = ref<InstanceType<typeof AiAgentManager>>()

const refreshAll = () => {
  modelManagerRef.value?.fetchModels?.()
  agentManagerRef.value?.fetchData?.()
  fetchUsageOverview()
}

// ===== 使用量概览 =====
const fetchUsageOverview = async () => {
  try {
    const res: any = await getAiUsageOverview()
    const data = res?.data || res
    aiUsage.value = data || { used: 0, quota: 0, percent: 0, quotaUnit: 'calls' }
  } catch {
    aiUsage.value = { used: 0, quota: 0, percent: 0, quotaUnit: 'calls' }
  }
}

// ===== 套餐 =====
const packages = ref<any[]>([])
const buyingPkgId = ref<string | null>(null)
const availablePayMethods = ref<string[]>(['wechat', 'alipay'])
const freePackageClaimed = ref(false)

const fetchPackages = async () => {
  try {
    const res: any = await getAiPackages()
    packages.value = Array.isArray(res?.data) ? res.data : (Array.isArray(res) ? res : [])
    if (res?.paymentMethods && Array.isArray(res.paymentMethods)) {
      availablePayMethods.value = res.paymentMethods
    }
    // 默认支付方式设为第一个可用的
    if (availablePayMethods.value.length && !availablePayMethods.value.includes(payType.value)) {
      payType.value = availablePayMethods.value[0]
    }
    // 检查免费套餐领取状态
    await checkFreePackageClaimed()
  } catch { packages.value = [] }
}

// 支付弹窗
const payDialogVisible = ref(false)
const payingOrder = ref<any>(null)
const payType = ref('wechat')
const payQrCode = ref('')
const checkingPayStatus = ref(false)

// 检查免费套餐领取状态
const checkFreePackageClaimed = async () => {
  try {
    const res: any = await getAiOrders({ page: 1, pageSize: 100 })
    const allOrders = res?.list || (Array.isArray(res) ? res : [])
    // 检查是否有免费套餐领取记录(price=0且状态为free/paid/active)
    freePackageClaimed.value = allOrders.some((order: any) =>
      order.price === 0 && ['free', 'paid', 'active'].includes(order.status)
    )
  } catch {
    freePackageClaimed.value = false
  }
}

const handleBuyPackage = async (pkg: any) => {
  await ElMessageBox.confirm(
    `确认购买「${pkg.name}」？\n将获得 ${pkg.calls?.toLocaleString()} 次AI调用\n金额：${pkg.price > 0 ? '¥' + pkg.price : '免费'}`,
    '购买确认',
    { type: 'info', confirmButtonText: '确认购买', dangerouslyUseHTMLString: false }
  )
  buyingPkgId.value = pkg.id
  try {
    const res: any = await createAiOrder({
      packageId: pkg.id, packageName: pkg.name,
      calls: pkg.calls, price: pkg.price, payType: payType.value
    })
    const orderData = res?.data || res
    if (orderData?.paid || pkg.price <= 0) {
      ElMessage.success('领取成功！配额已增加')
      // 更新免费套餐领取状态
      if (pkg.price === 0) {
        freePackageClaimed.value = true
      }
      fetchUsageOverview()
      fetchOrders()
      window.dispatchEvent(new CustomEvent('wecom-package-changed'))
    } else {
      // 付费套餐，弹出支付弹窗
      payingOrder.value = orderData
      payQrCode.value = orderData?.qrCode || orderData?.payUrl || ''
      payDialogVisible.value = true
      fetchOrders()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '购买失败')
  }
  buyingPkgId.value = null
}

const handleRepay = (order: any) => {
  payingOrder.value = order
  payQrCode.value = order.qrCode || order.payUrl || ''
  payDialogVisible.value = true
}

const checkPayStatus = async () => {
  if (!payingOrder.value?.orderNo) {
    ElMessage.warning('订单信息不完整')
    return
  }
  checkingPayStatus.value = true
  try {
    const res: any = await checkAiOrderStatus(payingOrder.value.orderNo)
    const status = res?.status || res?.data?.status
    if (status === 'paid') {
      ElMessage.success('支付成功！配额已增加')
      payDialogVisible.value = false
      fetchUsageOverview()
      fetchOrders()
    } else {
      ElMessage.warning('暂未检测到支付，请稍后再试')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '查询失败')
  }
  checkingPayStatus.value = false
}

// ===== 购买记录 =====
const orders = ref<any[]>([])
const ordersLoading = ref(false)
const orderPage = ref(1)
const orderPageSize = 10
const orderTotal = ref(0)

const fetchOrders = async () => {
  ordersLoading.value = true
  try {
    const res: any = await getAiOrders({ page: orderPage.value, pageSize: orderPageSize })
    orders.value = res?.list || (Array.isArray(res) ? res : [])
    orderTotal.value = res?.total || orders.value.length
  } catch { orders.value = [] }
  ordersLoading.value = false
}

// ===== 模型使用量 =====
const modelUsageList = ref<any[]>([])
const modelUsageLoading = ref(false)
const modelUsagePage = ref(1)
const modelUsagePageSize = ref(10)
const modelUsageTotal = ref(0)
const usageStartDate = ref<string | null>(null)
const usageEndDate = ref<string | null>(null)
const usageDateRange = ref('30d')

const totalCallCount = computed(() => modelUsageList.value.reduce((sum, r) => sum + (r.callCount || 0), 0))

const onUsageDateRangeChange = (val: string) => {
  const now = new Date()
  if (val === '7d') {
    const d = new Date(); d.setDate(d.getDate() - 7)
    usageStartDate.value = d.toISOString().slice(0, 10)
    usageEndDate.value = now.toISOString().slice(0, 10)
  } else if (val === '30d') {
    const d = new Date(); d.setDate(d.getDate() - 30)
    usageStartDate.value = d.toISOString().slice(0, 10)
    usageEndDate.value = now.toISOString().slice(0, 10)
  } else if (val === '90d') {
    const d = new Date(); d.setDate(d.getDate() - 90)
    usageStartDate.value = d.toISOString().slice(0, 10)
    usageEndDate.value = now.toISOString().slice(0, 10)
  } else {
    usageStartDate.value = null
    usageEndDate.value = null
  }
  fetchModelUsage()
  fetchTrendAndRender()
}

const resetUsageFilter = () => {
  usageStartDate.value = null
  usageEndDate.value = null
  usageDateRange.value = '30d'
  onUsageDateRangeChange('30d')
}

const fetchModelUsage = async () => {
  modelUsageLoading.value = true
  try {
    const params: any = { page: modelUsagePage.value, pageSize: modelUsagePageSize.value }
    if (usageStartDate.value) params.startDate = usageStartDate.value
    if (usageEndDate.value) params.endDate = usageEndDate.value
    const res: any = await getAiModelUsage(params)
    modelUsageList.value = res?.list || (Array.isArray(res) ? res : [])
    modelUsageTotal.value = res?.total || modelUsageList.value.length
  } catch { modelUsageList.value = [] }
  modelUsageLoading.value = false
}

// ===== 趋势图 =====
const trendChartRef = ref<HTMLElement>()
const trendData = ref<any[]>([])

const fetchTrendAndRender = async () => {
  try {
    const params: any = {}
    if (usageStartDate.value) params.startDate = usageStartDate.value
    if (usageEndDate.value) params.endDate = usageEndDate.value
    const res: any = await getAiUsageTrend(params)
    trendData.value = Array.isArray(res) ? res : (res?.data || [])
    await nextTick()
    renderTrendChart()
  } catch { trendData.value = [] }
}

const renderTrendChart = () => {
  if (!trendChartRef.value || !trendData.value.length) return
  const container = trendChartRef.value
  container.innerHTML = ''
  const canvas = document.createElement('canvas')
  const dpr = window.devicePixelRatio || 1
  const displayW = container.clientWidth || 800
  const displayH = 280
  canvas.width = displayW * dpr
  canvas.height = displayH * dpr
  canvas.style.width = displayW + 'px'
  canvas.style.height = displayH + 'px'
  container.appendChild(canvas)
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.scale(dpr, dpr)

  const modelMap = new Map<string, Map<string, number>>()
  const allDates = new Set<string>()
  trendData.value.forEach((d: any) => {
    allDates.add(d.date)
    if (!modelMap.has(d.modelName)) modelMap.set(d.modelName, new Map())
    modelMap.get(d.modelName)!.set(d.date, (modelMap.get(d.modelName)!.get(d.date) || 0) + d.callCount)
  })
  const dates = [...allDates].sort()
  const models = [...modelMap.keys()]
  const colors = ['#7C3AED', '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#EC4899', '#6366F1', '#14B8A6']

  if (!dates.length) return

  let maxVal = 1
  modelMap.forEach(dm => dm.forEach(v => { if (v > maxVal) maxVal = v }))
  maxVal = Math.ceil(maxVal * 1.15)

  const padding = { top: 36, right: 24, bottom: 44, left: 56 }
  const w = displayW - padding.left - padding.right
  const h = displayH - padding.top - padding.bottom

  // 背景
  ctx.fillStyle = '#FAFBFC'
  ctx.fillRect(0, 0, displayW, displayH)

  // 网格线
  for (let i = 0; i <= 5; i++) {
    const y = padding.top + (h / 5) * i
    ctx.strokeStyle = '#F0F0F0'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(padding.left, y)
    ctx.lineTo(padding.left + w, y)
    ctx.stroke()
    ctx.fillStyle = '#9CA3AF'
    ctx.font = '11px -apple-system, sans-serif'
    ctx.textAlign = 'right'
    ctx.fillText(String(Math.round(maxVal * (5 - i) / 5)), padding.left - 8, y + 4)
  }

  // X轴标签
  const step = Math.max(1, Math.floor(dates.length / 8))
  ctx.fillStyle = '#6B7280'
  ctx.font = '11px -apple-system, sans-serif'
  ctx.textAlign = 'center'
  dates.forEach((d, i) => {
    if (i % step === 0 || i === dates.length - 1) {
      const x = padding.left + (i / Math.max(dates.length - 1, 1)) * w
      ctx.fillText(d.slice(5), x, displayH - 12)
    }
  })

  // 绘制折线 + 面积填充
  models.forEach((modelName, mi) => {
    const color = colors[mi % colors.length]
    const dm = modelMap.get(modelName)!

    // 面积填充
    ctx.beginPath()
    dates.forEach((d, i) => {
      const val = dm.get(d) || 0
      const x = padding.left + (i / Math.max(dates.length - 1, 1)) * w
      const y = padding.top + h - (val / maxVal) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.lineTo(padding.left + w, padding.top + h)
    ctx.lineTo(padding.left, padding.top + h)
    ctx.closePath()
    ctx.fillStyle = color + '18'
    ctx.fill()

    // 折线
    ctx.strokeStyle = color
    ctx.lineWidth = 2.5
    ctx.lineJoin = 'round'
    ctx.beginPath()
    dates.forEach((d, i) => {
      const val = dm.get(d) || 0
      const x = padding.left + (i / Math.max(dates.length - 1, 1)) * w
      const y = padding.top + h - (val / maxVal) * h
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()

    // 数据点
    dates.forEach((d, i) => {
      const val = dm.get(d) || 0
      const x = padding.left + (i / Math.max(dates.length - 1, 1)) * w
      const y = padding.top + h - (val / maxVal) * h
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.arc(x, y, 3.5, 0, Math.PI * 2)
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.stroke()
    })

    // 图例
    const legendX = padding.left + mi * 130
    const legendY = 16
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(legendX + 5, legendY, 5, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = '#374151'
    ctx.font = '12px -apple-system, sans-serif'
    ctx.textAlign = 'left'
    ctx.fillText(modelName.length > 12 ? modelName.slice(0, 12) + '...' : modelName, legendX + 14, legendY + 4)
  })
}

const formatDate = (d: string) => d ? new Date(d).toLocaleString('zh-CN') : '-'
const formatTokens = (n: number) => {
  if (!n) return '0'
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M'
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K'
  return String(n)
}

watch(activeTab, (val) => {
  if (val === 'usage') {
    fetchPackages()
    fetchOrders()
    fetchModelUsage()
    fetchTrendAndRender()
  }
})

onMounted(() => {
  fetchWecomConfigs()
  fetchUsageOverview()
})
</script>

<style scoped>
.wecom-ai-assistant { padding: 0; }

.ai-title { display: flex; align-items: center; gap: 8px; }
.ai-badge {
  display: inline-flex; align-items: center; justify-content: center;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: #fff; font-size: 11px; font-weight: 700;
  padding: 2px 8px; border-radius: 10px;
}

.ai-usage-bar {
  background: linear-gradient(135deg, #F5F3FF 0%, #EDE9FE 100%);
  border: 1px solid #DDD6FE; border-radius: 8px;
  padding: 12px 16px; margin-bottom: 16px;
}
.ai-usage-bar .usage-info { display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px; font-size: 13px; }

.usage-tab { padding: 0; }
.section-block { margin-bottom: 32px; }
.section-title { font-size: 16px; font-weight: 600; color: #1F2937; margin: 0 0 16px; display: flex; align-items: center; gap: 6px; }
.title-icon { font-size: 18px; }

/* 套餐卡片网格 - 旧版(保留兼容) */
.packages-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 14px;
}
.pkg-card {
  position: relative;
  background: #fff;
  border: 1.5px solid #E5E7EB;
  border-radius: 12px;
  padding: 20px 16px;
  text-align: center;
  transition: all 0.25s;
  overflow: hidden;
}
.pkg-card:hover { border-color: #C4B5FD; box-shadow: 0 4px 16px rgba(124, 58, 237, 0.1); transform: translateY(-2px); }
.pkg-tier-2 { border-color: #7C3AED; background: linear-gradient(180deg, #FAFBFF, #F5F3FF); }
.pkg-badge {
  position: absolute; top: 8px; right: -24px; transform: rotate(45deg);
  background: #7C3AED; color: #fff; font-size: 10px; font-weight: 700;
  padding: 2px 28px;
}
.pkg-name { font-size: 14px; font-weight: 600; color: #374151; margin-bottom: 8px; }
.pkg-calls { font-size: 18px; font-weight: 700; color: #7C3AED; margin-bottom: 4px; }
.pkg-calls span { font-size: 12px; font-weight: 400; color: #9CA3AF; }
.pkg-price { font-size: 22px; font-weight: 700; color: #EF4444; margin-bottom: 6px; }
.pkg-price .currency { font-size: 14px; }
.pkg-desc { font-size: 11px; color: #9CA3AF; margin-bottom: 12px; min-height: 16px; }

/* 套餐卡片网格 - 新版(参考获客助手样式) */
.packages-grid-new {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}
.pkg-card-new {
  position: relative;
  border: 2px solid #e5e6eb;
  border-radius: 12px;
  padding: 24px 20px 20px;
  background: #fff;
  transition: all 0.3s;
  display: flex;
  flex-direction: column;
}
.pkg-card-new:hover {
  border-color: #7C3AED;
  box-shadow: 0 4px 16px rgba(124, 58, 237, 0.12);
  transform: translateY(-2px);
}
.pkg-recommended {
  border-color: #7C3AED;
  background: linear-gradient(180deg, #f5f3ff 0%, #fff 30%);
}
.pkg-disabled {
  opacity: 0.6;
  pointer-events: none;
}
.pkg-badge-new {
  position: absolute;
  top: -1px;
  right: 20px;
  background: linear-gradient(135deg, #7C3AED, #6D28D9);
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  padding: 2px 12px 4px;
  border-radius: 0 0 8px 8px;
}
.pkg-badge-claimed {
  background: linear-gradient(135deg, #10B981, #059669);
  right: auto;
  left: 20px;
}
.pkg-name-new {
  font-size: 18px;
  font-weight: 700;
  margin: 0 0 12px;
  color: #1d2129;
}
.pkg-price-row-new {
  display: flex;
  align-items: baseline;
  gap: 2px;
  margin-bottom: 4px;
}
.pkg-symbol-new {
  font-size: 16px;
  font-weight: 600;
  color: #f5222d;
}
.pkg-price-new {
  font-size: 32px;
  font-weight: 800;
  color: #f5222d;
  line-height: 1;
}
.pkg-free-new {
  font-size: 28px;
  font-weight: 800;
  color: #00b42a;
}
.pkg-features-new {
  list-style: none;
  padding: 0;
  margin: 12px 0;
  flex: 1;
}
.pkg-features-new li {
  font-size: 13px;
  color: #4e5969;
  padding: 4px 0;
  display: flex;
  align-items: center;
  gap: 6px;
}
.feat-icon-new {
  font-size: 14px;
  width: 20px;
  text-align: center;
  flex-shrink: 0;
}
.pkg-desc-new {
  font-size: 12px;
  color: #86909c;
  margin: 0 0 12px;
  line-height: 1.5;
}
.pkg-action-new {
  margin-top: auto;
  padding-top: 12px;
}

/* 使用量筛选器 */
.usage-filter-card {
  background: #F9FAFB; border: 1px solid #F0F0F0; border-radius: 8px;
  padding: 14px 16px; margin-bottom: 14px;
}

.ai-btn { background: linear-gradient(135deg, #7C3AED, #6D28D9) !important; border: none !important; color: #fff !important; }
.ai-btn:hover { opacity: 0.9; }

.trend-chart { width: 100%; min-height: 280px; background: #FAFBFC; border-radius: 10px; border: 1px solid #E5E7EB; }

/* 支付弹窗 */
.pay-dialog-content { text-align: center; }
.pay-order-info { background: #F5F3FF; border-radius: 8px; padding: 16px; margin-bottom: 16px; }
.pay-order-info div { margin-bottom: 4px; font-size: 14px; color: #374151; }
.pay-amount { font-size: 32px; font-weight: 700; color: #EF4444; margin-top: 8px !important; }
.pay-type-select { margin-bottom: 16px; display: flex; justify-content: center; gap: 12px; }
.qr-area { margin-bottom: 16px; }
.qr-code-box { display: flex; justify-content: center; }
.qr-placeholder { color: #909399; padding: 32px 0; }
.qr-placeholder p { margin: 8px 0 0; font-size: 13px; }
.pay-tips p { margin: 4px 0; font-size: 13px; color: #606266; }
</style>
