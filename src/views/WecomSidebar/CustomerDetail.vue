<template>
  <div class="wecom-sidebar-page">
    <!-- 加载中 -->
    <div v-if="pageState === 'loading'" class="sidebar-loading">
      <el-icon class="is-loading" :size="32" color="#07c160"><Loading /></el-icon>
      <p>正在加载...</p>
    </div>

    <!-- JS-SDK不可用 / 非企微环境 -->
    <div v-else-if="pageState === 'no-sdk'" class="sidebar-center">
      <el-result icon="warning" :title="sdkErrorTitle" :sub-title="sdkErrorDetail">
        <template #extra>
          <el-button type="primary" @click="retrySdkInit" :loading="sdkRetrying" style="margin-bottom:12px">重新加载</el-button>

          <!-- 40085 suite_ticket 专用诊断面板 -->
          <div v-if="sdkErrorCode === 'suite-ticket'" class="suite-ticket-panel">
            <el-divider><span style="color:#E6A23C">⚠️ Suite Ticket 失效</span></el-divider>
            <p style="font-size:12px;color:#606266;line-height:1.6;text-align:left">
              您的企微是<strong>第三方授权应用</strong>，企微每 10 分钟会向后端推送 suite_ticket，但当前 ticket 已失效——通常是回调URL未正常接收推送。
            </p>
            <el-button size="small" type="primary" plain @click="loadSuiteDiagnostic" :loading="diagnosticLoading" style="margin:8px 0">
              查看诊断详情
            </el-button>
            <div v-if="suiteDiagnostic" class="suite-diagnostic-result">
              <div class="diag-row"><span>Suite ID:</span><code>{{ suiteDiagnostic.suiteId || '未配置' }}</code></div>
              <div class="diag-row"><span>Ticket状态:</span>
                <el-tag :type="suiteDiagnostic.ticketStale ? 'danger' : 'success'" size="small">
                  {{ suiteDiagnostic.ticketStale ? '已过期' : '有效' }}
                </el-tag>
              </div>
              <div class="diag-row"><span>距上次推送:</span><span>{{ suiteDiagnostic.ticketAgeMinutes >= 0 ? suiteDiagnostic.ticketAgeMinutes + ' 分钟' : '从未' }}</span></div>
              <div class="diag-row"><span>回调健康度:</span>
                <el-tag :type="suiteDiagnostic.callbackHealth === 'healthy' ? 'success' : 'danger'" size="small">
                  {{ diagHealthLabel[suiteDiagnostic.callbackHealth] || suiteDiagnostic.callbackHealth }}
                </el-tag>
              </div>
              <div class="diag-row"><span>预期回调URL:</span><code style="font-size:11px;word-break:break-all">{{ suiteDiagnostic.callbackUrlExpected }}</code></div>
              <div v-if="suiteDiagnostic.recommendation" class="diag-recommendation">
                <strong>建议：</strong>
                <pre>{{ suiteDiagnostic.recommendation }}</pre>
              </div>
            </div>
            <p style="font-size:11px;color:#909399;margin-top:10px;line-height:1.5;text-align:left">
              <strong>紧急救命：</strong>管理员可登录 CRM 后台 → 「企微管理 → 服务商配置」，从企微服务商后台「应用 → 数据回调 → 调用日志」最近一次成功推送中复制 SuiteTicket，调用 <code>POST /api/wecom/suite/manual-ticket</code> 接口手动注入。
            </p>
          </div>

          <p v-else style="color:#909399;font-size:12px">如果您是管理员，请在企微后台配置侧边栏应用地址指向此页面</p>
          <p v-if="sdkDebugInfo" style="color:#C0C4CC;font-size:11px;margin-top:8px;word-break:break-all">{{ sdkDebugInfo }}</p>
          <!-- 开发模式或环境检测失败时允许手动调试 -->
          <div v-if="isDev || sdkErrorCode === 'env'" style="margin-top:16px">
            <el-divider>手动调试</el-divider>
            <el-form size="small" label-width="90px" style="max-width:300px;margin:0 auto">
              <el-form-item label="CorpID">
                <el-input v-model="debugCorpId" placeholder="ww****" />
              </el-form-item>
              <el-form-item label="WecomUID">
                <el-input v-model="debugWecomUserId" placeholder="企微成员ID" />
              </el-form-item>
              <el-form-item label="ExternalUID">
                <el-input v-model="debugExternalUserId" placeholder="外部联系人ID" />
              </el-form-item>
              <el-form-item>
                <el-button type="primary" @click="debugInit">调试进入</el-button>
              </el-form-item>
            </el-form>
          </div>
        </template>
      </el-result>
    </div>

    <!-- 未绑定账号 - 登录（对齐Preview样式） -->
    <div v-else-if="pageState === 'login'" class="preview-login">
      <div class="login-logo">☁️</div>
      <h4>云客CRM</h4>
      <p class="login-desc">绑定CRM账号查看客户信息</p>
      <div v-if="loginError" class="login-error">{{ loginError }}</div>
      <div class="preview-form">
        <div class="form-group">
          <label>租户编码 / 授权码</label>
          <input v-model="loginForm.tenantCode" placeholder="租户编码或私有部署授权码" class="preview-input" />
          <div style="font-size:10px;color:#909399;margin-top:2px">私有部署填授权码，SaaS填租户编码</div>
        </div>
        <div class="form-group">
          <label>用户名</label>
          <input v-model="loginForm.username" placeholder="CRM登录用户名" class="preview-input" />
        </div>
        <div class="form-group">
          <label>密码</label>
          <input v-model="loginForm.password" type="password" placeholder="CRM登录密码" class="preview-input" />
        </div>
        <button class="preview-btn" :disabled="loginLoading" @click="handleLogin">
          {{ loginLoading ? '绑定中...' : '绑定账号' }}
        </button>
      </div>
      <div class="login-tip">
        <p>💡 员工在企微聊天侧边栏首次打开时需绑定CRM账号</p>
      </div>
    </div>

    <!-- 客户详情（对齐Preview样式） -->
    <div v-else-if="pageState === 'detail'" class="preview-detail">
      <!-- 顶部用户信息栏 -->
      <div class="preview-user-bar">
        <span>{{ boundUser?.name || '用户' }}</span>
        <div>
          <span class="action-link" @click="handleRebind">换绑</span>
          <span class="action-link" style="margin-left:8px" @click="handleUnbind">退出</span>
        </div>
      </div>

      <!-- 快捷话术 Tab -->
      <SidebarScripts v-if="currentTab === 'scripts'" :sidebar-token="sidebarToken" />

      <!-- 快捷下单 Tab -->
      <SidebarQuickOrder v-else-if="currentTab === 'order'" :sidebar-token="sidebarToken" :customer-data="customerData" />

      <!-- 客户画像 Tab -->
      <SidebarPortrait v-else-if="currentTab === 'portrait'" :sidebar-token="sidebarToken" :customer-data="customerData" />

      <!-- 资料收集 Tab -->
      <SidebarCollect v-else-if="currentTab === 'mp-collect'" :sidebar-token="sidebarToken" />

      <!-- CRM客户详情 Tab -->
      <template v-else-if="currentTab === 'customer'">
        <!-- 加载中 -->
        <div v-if="!customerData" style="text-align:center;padding:60px 20px;color:#909399;font-size:13px">
          加载客户信息...
        </div>

        <!-- 未找到客户 -->
        <div v-else-if="!customerData.found" class="preview-card" style="text-align:center;padding:30px">
          <div style="font-size:36px;margin-bottom:8px">🔍</div>
          <div style="font-size:13px;color:#909399">该外部联系人尚未同步到CRM系统</div>
        </div>

        <!-- 客户信息展示 -->
        <template v-else>
          <!-- 客户头部卡片 -->
          <div class="preview-card">
            <div class="customer-head">
              <span class="avatar">
                <img v-if="customerData.wecomCustomer?.avatar" :src="customerData.wecomCustomer.avatar" style="width:36px;height:36px;border-radius:50%;object-fit:cover" />
                <span v-else style="font-size:36px">👤</span>
              </span>
              <div>
                <div class="customer-name">{{ customerData.wecomCustomer?.name || customerData.crmCustomer?.name || '未知客户' }}</div>
                <div class="customer-company" v-if="customerData.wecomCustomer?.corpName">{{ customerData.wecomCustomer.corpName }}</div>
                <div class="customer-follow" v-if="customerData.wecomCustomer?.followUserName">跟进人: {{ customerData.wecomCustomer.followUserName }}</div>
              </div>
            </div>
          </div>

          <!-- 企微客户详情 -->
          <div class="preview-card">
            <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
              <span>💬 企微客户详情</span>
              <button v-if="!customerData.crmCustomer" class="btn-send-form-card" @click="openCrmDetail" style="background:#e8f5e9;color:#4caf50;border-color:#a5d6a7">🔗 关联CRM</button>
            </div>
            <div class="info-row"><span class="label">昵称</span><span>{{ customerData.wecomCustomer?.name || '-' }}</span></div>
            <div class="info-row"><span class="label">性别</span><span>{{ customerData.wecomCustomer?.gender === 1 ? '男' : customerData.wecomCustomer?.gender === 2 ? '女' : '-' }}</span></div>
            <div class="info-row"><span class="label">添加方式</span><span>{{ customerData.wecomCustomer?.addWay || '-' }}</span></div>
            <div class="info-row"><span class="label">添加时间</span><span>{{ customerData.wecomCustomer?.addTime ? formatOrderTime(customerData.wecomCustomer.addTime) : '-' }}</span></div>
            <div class="info-row"><span class="label">UserID</span><span style="font-size:11px;word-break:break-all">{{ customerData.wecomCustomer?.externalUserId || externalUserId || '-' }}</span></div>
          </div>

          <!-- CRM客户信息 -->
          <div v-if="customerData.crmCustomer" class="preview-card">
            <div class="card-title" style="display:flex;justify-content:space-between;align-items:center">
              <span style="display:flex;align-items:center;gap:4px">👤 CRM客户信息
                <span class="btn-refresh-inline" @click="refreshCustomerData" title="刷新客户信息">🔄</span>
              </span>
              <button class="btn-send-form-card" @click="handleSendFormCard" :disabled="sendingFormCard">{{ sendingFormCard ? '发送中...' : '📋 转发填写资料' }}</button>
            </div>
            <div class="info-row"><span class="label">姓名</span><span>{{ customerData.crmCustomer.name }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.phone"><span class="label">手机</span><span>{{ displaySensitiveInfoNew(customerData.crmCustomer.phone, SensitiveInfoType.PHONE) }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.height || customerData.crmCustomer.age || customerData.crmCustomer.weight"><span class="label" style="white-space:nowrap">身高/年龄/体重</span><span style="white-space:nowrap">{{ customerData.crmCustomer.height || '-' }}cm / {{ customerData.crmCustomer.age || '-' }}岁 / {{ customerData.crmCustomer.weight || '-' }}kg</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.gender"><span class="label">性别</span><span>{{ customerData.crmCustomer.gender === 'male' ? '男' : customerData.crmCustomer.gender === 'female' ? '女' : customerData.crmCustomer.gender || '-' }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.address"><span class="label">地址</span><span>{{ displaySensitiveInfoNew(customerData.crmCustomer.address, SensitiveInfoType.ADDRESS) }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.medicalHistory"><span class="label">疾病史</span><span>{{ customerData.crmCustomer.medicalHistory }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.source"><span class="label">来源</span><span>{{ customerData.crmCustomer.source }}</span></div>
            <div class="info-row" v-if="customerData.crmCustomer.level"><span class="label">等级</span><span class="tag">{{ customerData.crmCustomer.level }}</span></div>
            <div class="customer-tags" v-if="customerData.crmCustomer.tags?.length">
              <span class="mini-tag" v-for="tag in customerData.crmCustomer.tags" :key="tag">{{ tag }}</span>
            </div>
          </div>

          <!-- 无CRM关联 -->
          <div v-else class="preview-card" style="text-align:center;padding:16px">
            <div style="color:#909399;font-size:12px;margin-bottom:8px">该企微客户尚未关联CRM客户</div>
            <button class="btn-send-form-card" @click="openCrmDetail" style="background:#e8f5e9;color:#4caf50;border-color:#a5d6a7;padding:4px 12px">🔗 关联CRM客户</button>
          </div>

          <!-- 购买统计 -->
          <div class="preview-card">
            <div class="card-title">📊 购买统计</div>
            <div class="stats-row">
              <div class="stat"><div class="stat-val">{{ customerData.stats?.orderCount || 0 }}</div><div class="stat-lbl">订单数</div></div>
              <div class="stat"><div class="stat-val amount">¥{{ Number(customerData.stats?.totalAmount || 0).toFixed(0) }}</div><div class="stat-lbl">累计消费</div></div>
              <div class="stat"><div class="stat-val">{{ formatLastTime(customerData.stats?.lastOrderTime) }}</div><div class="stat-lbl">最后购买</div></div>
            </div>
          </div>

          <!-- 最近订单 -->
          <div class="preview-card" v-if="customerData.orders?.length">
            <div class="card-title">📋 最近订单</div>
            <div class="order-item" v-for="order in customerData.orders" :key="order.id">
              <div class="order-head">
                <span class="order-no">{{ order.orderNumber }}</span>
                <span class="order-status" :style="{ color: getOrderStatusColor(order.status) }">{{ getOrderStatusText(order.status) }}</span>
              </div>
              <div class="order-body">
                <span class="order-amount">¥{{ Number(order.finalAmount || order.totalAmount || 0).toFixed(2) }}</span>
                <span class="order-time">{{ formatOrderTime(order.createdAt) }}</span>
              </div>
              <div v-if="order.products?.length" class="order-products">
                <div v-for="(prod, idx) in order.products" :key="idx" style="font-size:11px;color:#606266;padding:2px 0">
                  {{ prod.name }} ×{{ prod.quantity }}
                </div>
              </div>
            </div>
          </div>

          <!-- 绑定信息 -->
          <div class="preview-card" v-if="customerData.bindingInfo">
            <div class="card-title">🔗 绑定信息</div>
            <div class="info-row" v-if="customerData.bindingInfo.crmUserName"><span class="label">CRM用户</span><span>{{ customerData.bindingInfo.crmUserName }}</span></div>
            <div class="info-row" v-if="customerData.bindingInfo.tenantCode"><span class="label">租户编码</span><span>{{ customerData.bindingInfo.tenantCode }}</span></div>
            <div class="info-row" v-if="customerData.bindingInfo.boundAt"><span class="label">绑定时间</span><span>{{ formatOrderTime(customerData.bindingInfo.boundAt) }}</span></div>
          </div>

          <!-- 底部按钮 -->
          <div style="padding:8px 12px" v-if="customerData.crmCustomer">
            <button class="preview-btn full" @click="openCrmDetail">查看完整客户详情</button>
            <button class="preview-btn" style="margin-top:6px" @click="currentTab = 'order'">🛒 去下单</button>
          </div>
        </template>
      </template>
    </div>

    <!-- 错误 -->
    <div v-else-if="pageState === 'error'" class="sidebar-center">
      <el-result icon="error" :title="errorMsg" sub-title="请刷新页面重试">
        <template #extra>
          <el-button type="primary" @click="reloadPage">刷新</el-button>
        </template>
      </el-result>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomSidebarDetail' })
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'
import { getSidebarJsSdkConfig, getSidebarSign, clearSidebarCache, sidebarBindAccount, sidebarVerifyBinding, getSidebarCustomerDetail, refreshSidebarToken, getSuiteTicketDiagnostic } from '@/api/wecom'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import SidebarScripts from './SidebarScripts.vue'
import SidebarQuickOrder from './SidebarQuickOrder.vue'
import SidebarPortrait from './SidebarPortrait.vue'
import SidebarCollect from './SidebarCollect.vue'

const isDev = import.meta.env.DEV
const pageState = ref<'loading' | 'no-sdk' | 'login' | 'detail' | 'error'>('loading')
const errorMsg = ref('')
const sdkErrorCode = ref('') // env | no-corpid | sdk-load | sdk-config | sdk-agent | api | suite-ticket

// 40085 专用诊断状态
const suiteDiagnostic = ref<any>(null)
const diagnosticLoading = ref(false)
async function loadSuiteDiagnostic() {
  diagnosticLoading.value = true
  try {
    const res: any = await getSuiteTicketDiagnostic()
    suiteDiagnostic.value = res?.data || res
  } catch (e: any) {
    suiteDiagnostic.value = { error: e?.message || '诊断接口调用失败' }
  } finally {
    diagnosticLoading.value = false
  }
}
const diagHealthLabel: Record<string, string> = { healthy: '正常', stale: '已停止推送', never: '从未收到' }
const sdkErrorTitle = ref('非企微环境')
const sdkErrorDetail = ref('请在企业微信聊天侧边栏中打开此页面')
const sdkDebugInfo = ref('')
const sdkRetrying = ref(false)

function setSdkError(code: string, title: string, detail: string, debug = '') {
  // ★ 如果已经有有效token且处于detail状态，SDK错误不应该阻塞页面
  if (pageState.value === 'detail' && sidebarToken.value && !isTokenExpired(sidebarToken.value)) {
    console.warn(`[Sidebar] SDK错误(${code})被抑制，因为已有有效token:`, title)
    return
  }
  sdkErrorCode.value = code
  sdkErrorTitle.value = title
  sdkErrorDetail.value = detail
  sdkDebugInfo.value = debug
  pageState.value = 'no-sdk'
}

async function retrySdkInit() {
  sdkRetrying.value = true
  pageState.value = 'loading'
  try {
    await initWecomSdk()
  } finally {
    sdkRetrying.value = false
  }
}

// 企微上下文
const corpId = ref('')
const wecomUserId = ref('')
const externalUserId = ref('')

// 登录
const loginForm = ref({ tenantCode: localStorage.getItem('wecom_sidebar_tenant_code') || '', username: '', password: '' })
const loginError = ref('')
const loginLoading = ref(false)

// 绑定信息
const sidebarToken = ref('')
const boundUser = ref<any>(null)

// 客户数据
const customerData = ref<any>(null)
const refreshingData = ref(false)
const sendingFormCard = ref(false)
const collectStatus = ref<any>(null)

// 当前 Tab（从 URL ?tab= 参数读取）
const currentTab = ref<'customer' | 'scripts' | 'order' | 'portrait' | 'mp-collect'>('customer')
const tabTitles: Record<string, string> = {
  customer: 'CRM客户详情',
  scripts: '快捷话术',
  order: '快捷下单',
  portrait: '客户画像',
  'mp-collect': '资料收集'
}

// 调试模式
const debugCorpId = ref('')
const debugWecomUserId = ref('')
const debugExternalUserId = ref('')

// ==================== 初始化 ====================

onMounted(async () => {
  // 读取 URL 中的 tab 参数
  const urlParams = new URLSearchParams(window.location.search)
  const tabParam = urlParams.get('tab')
  if (tabParam && tabParam in tabTitles) {
    currentTab.value = tabParam as typeof currentTab.value
  }

  // ★ 优先检查 localStorage 缓存的token（解决切换客户、多tab共享登录问题）
  const cachedToken = localStorage.getItem('wecom_sidebar_token')
  if (cachedToken && !isTokenExpired(cachedToken)) {
    console.log('[Sidebar] 发现有效缓存token，直接进入已登录状态')
    sidebarToken.value = cachedToken
    const payload = decodeJwtPayload(cachedToken)
    if (payload) {
      boundUser.value = { name: payload.crmUserName || payload.username || '用户' }
    }
    pageState.value = 'detail'

    // 异步刷新即将过期的token
    if (isTokenExpiringSoon(cachedToken)) {
      refreshSidebarToken(cachedToken).then((res: any) => {
        if (res?.token) {
          localStorage.setItem('wecom_sidebar_token', res.token)
          sidebarToken.value = res.token
        }
      }).catch(() => { /* ignore */ })
    }

    // 异步初始化SDK获取externalUserId，不阻塞页面展示
    initSdkForExternalUserId()
    return
  }

  // 无缓存token：走正常初始化流程
  const envResult = isWecomEnv()
  console.log('[Sidebar] 环境检测结果:', envResult)
  if (envResult.isWecom) {
    await initWecomSdk()
  } else {
    setSdkError('env', '非企微环境', '请在企业微信聊天侧边栏中打开此页面', `UA: ${envResult.ua.substring(0, 120)}... | 检测方式: ${envResult.method}`)
  }
})

function isWecomEnv(): { isWecom: boolean; ua: string; method: string } {
  const ua = navigator.userAgent.toLowerCase()
  // 方式1: 标准 UA 检测
  if (ua.includes('wxwork')) return { isWecom: true, ua, method: 'ua-wxwork' }
  if (ua.includes('micromessenger')) return { isWecom: true, ua, method: 'ua-micromessenger' }
  // 方式2: 企微桌面版可能的 UA 标识
  if (ua.includes('wechat') && ua.includes('windowswechat')) return { isWecom: true, ua, method: 'ua-windowswechat' }
  // 方式3: 检测企微 JS Bridge 对象
  if ((window as any).wx || (window as any).WeixinJSBridge || (window as any).__wxjs_environment) return { isWecom: true, ua, method: 'js-bridge' }
  // 方式4: URL 参数推断（如果配置了 corpId 参数，说明是企微侧边栏配置的链接）
  const urlParams = new URLSearchParams(window.location.search)
  if (urlParams.get('corpId')) return { isWecom: true, ua, method: 'url-corpId' }
  return { isWecom: false, ua, method: 'none' }
}

async function initWecomSdk() {
  try {
    // 动态加载企微JS-SDK
    console.log('[Sidebar] 加载JS-SDK...')
    try {
      await loadWecomJsSdk()
    } catch (e: any) {
      setSdkError('sdk-load', 'JS-SDK加载失败', '无法加载企微JS-SDK，请检查网络', e?.message)
      return
    }

    // 获取corpId
    const urlParams = new URLSearchParams(window.location.search)
    corpId.value = urlParams.get('corpId') || ''
    console.log('[Sidebar] corpId:', corpId.value, ', sdkMode:', sdkMode, ', URL:', window.location.href)

    // ★ $CORPID$ 未替换或为空时，从后端获取当前租户绑定的企业配置
    if (!corpId.value || corpId.value.includes('$') || corpId.value.includes('CORPID')) {
      console.warn('[Sidebar] corpId无效:', corpId.value || '(空)', '，从后端自动获取...')
      try {
        const { getSidebarConfig } = await import('@/api/wecom')
        const configRes: any = await getSidebarConfig()
        // request拦截器已解包，configRes 就是 { corpId, agentId, name }
        if (configRes?.corpId) {
          console.log('[Sidebar] 后端返回企业配置:', configRes.name, configRes.corpId, 'agentId=', configRes.agentId)
          corpId.value = configRes.corpId
        } else {
          setSdkError('no-corpid', '无法获取企业配置', '后端未返回有效的企微配置，请联系管理员检查企微授权状态')
          return
        }
      } catch (e: any) {
        console.error('[Sidebar] 获取企业配置失败:', e)
        setSdkError('no-corpid', '获取企业配置失败', e?.message || '请检查网络连接')
        return
      }
    }

    // ★ 第三方服务商应用必须用 ww.register（新版SDK）
    // wx.config 对第三方应用会因为 corpId 不匹配报 92002
    if (sdkMode === 'ww') {
      await initWithNewSdk()
    } else if (sdkMode === 'wx') {
      console.warn('[Sidebar] ⚠️ 只有旧版wx可用，第三方应用可能遇到92002。尝试继续...')
      await initWithLegacySdk()
    } else {
      setSdkError('sdk-load', 'SDK模式异常', '无法确定SDK模式，请刷新重试')
    }
  } catch (e: any) {
    console.error('[Sidebar] Init error:', e)
    setSdkError('api', '初始化失败', e?.message || '未知错误', `堆栈: ${e?.stack?.substring(0, 200) || ''}`)
  }
}

/**
 * ★ 新版 SDK 初始化（ww.register）
 * 优势：SDK内部自动传递正确的URL给签名回调，消除URL不匹配问题
 *
 * 重要：ww.register 是惰性的，SDK不会在register时主动执行agentConfig，
 * 而是在调用需要应用身份的API时才触发 getAgentConfigSignature 回调。
 *
 * 92002 自动恢复：首次失败后自动清除后端缓存并强制刷新重试一次
 */
async function initWithNewSdk(retryCount = 0) {
  const ww = (window as any).ww
  const isRetry = retryCount > 0
  console.log(`[Sidebar] 使用新版 ww.register 模式${isRetry ? ` (第${retryCount}次重试, forceRefresh=true)` : ''}`)

  // 诊断信息收集
  let diagConfigCalled = false
  let diagAgentConfigCalled = false
  let diagConfigResult = ''
  let diagAgentConfigResult = ''

  // 先通过一次签名调用获取agentId和验证后端签名能力
  let agentId: number | null = null
  const currentUrl = window.location.href.split('#')[0]
  try {
    const preRes: any = await getSidebarSign({
      url: currentUrl,
      corpId: corpId.value,
      type: 'config',
      forceRefresh: isRetry
    })
    agentId = preRes?.agentId ? Number(preRes.agentId) : null
    // ★ 当corpId是占位符$CORPID$时，用后端返回的真实corpId替换
    if (preRes?.corpId && corpId.value.includes('$')) {
      console.log('[Sidebar] 替换占位符corpId:', corpId.value, '→', preRes.corpId)
      corpId.value = preRes.corpId
    }
    console.log('[Sidebar] 预获取config签名成功: agentId=', agentId, ', corpId=', corpId.value)
  } catch (e: any) {
    console.error('[Sidebar] 预获取签名失败:', e)
    const backendMsg = e?.response?.data?.message || e?.data?.message || e?.message || '未知错误'
    if (/40085|invalid suite[_ ]ticket/i.test(backendMsg)) {
      setSdkError('suite-ticket', '侧边栏初始化失败', '第三方授权应用的 suite_ticket 已过期', `错误: ${backendMsg}`)
      loadSuiteDiagnostic()
      return
    }
    setSdkError('api', 'JS-SDK签名获取失败', `请检查企微配置（CorpID: ${corpId.value}）`, `错误: ${backendMsg}`)
    return
  }

  if (!agentId) {
    setSdkError('sdk-agent', '缺少AgentID', '后端未返回AgentID，请在CRM企微管理页面刷新授权信息', `corpId=${corpId.value}`)
    return
  }

  // ★ 预验证 agent_config 签名能力（确保后端能正确生成应用级签名）
  try {
    const agentPreRes: any = await getSidebarSign({
      url: currentUrl,
      corpId: corpId.value,
      type: 'agent_config',
      forceRefresh: isRetry
    })
    console.log('[Sidebar] 预验证agent_config签名成功: timestamp=', agentPreRes?.timestamp, ', signature前缀=', agentPreRes?.signature?.substring(0, 16))
  } catch (e: any) {
    console.error('[Sidebar] ❌ agent_config签名后端失败:', e)
    const backendMsg = e?.response?.data?.message || e?.data?.message || e?.message || '未知错误'
    setSdkError('api', 'agent_config签名失败', `后端无法生成应用级签名: ${backendMsg}`, `corpId=${corpId.value}, agentId=${agentId}`)
    return
  }

  // ★ 核心：签名回调函数（重试时带 forceRefresh 标记，强制后端刷新 token/ticket）
  async function getConfigSignature(url: string) {
    diagConfigCalled = true
    console.log('[Sidebar] SDK调用 getConfigSignature, url:', url?.substring(0, 120))
    try {
      const res: any = await getSidebarSign({ url, corpId: corpId.value, type: 'config', forceRefresh: isRetry })
      const result = { timestamp: Number(res.timestamp), nonceStr: String(res.nonceStr || ''), signature: String(res.signature || '') }
      diagConfigResult = `OK: ts=${result.timestamp}, sig=${result.signature.substring(0, 12)}...`
      console.log('[Sidebar] getConfigSignature →', JSON.stringify(result))
      return result
    } catch (err: any) {
      diagConfigResult = `FAIL: ${err?.message || err}`
      console.error('[Sidebar] ❌ getConfigSignature失败:', err?.message || err)
      throw err
    }
  }

  async function getAgentConfigSignature(url: string) {
    diagAgentConfigCalled = true
    console.log('[Sidebar] SDK调用 getAgentConfigSignature, url:', url?.substring(0, 120))
    try {
      const res: any = await getSidebarSign({ url, corpId: corpId.value, type: 'agent_config', forceRefresh: isRetry })
      const result = { timestamp: Number(res.timestamp), nonceStr: String(res.nonceStr || ''), signature: String(res.signature || '') }
      diagAgentConfigResult = `OK: ts=${result.timestamp}, sig=${result.signature.substring(0, 12)}...`
      console.log('[Sidebar] getAgentConfigSignature →', JSON.stringify(result))
      return result
    } catch (err: any) {
      diagAgentConfigResult = `FAIL: ${err?.message || err}`
      console.error('[Sidebar] ❌ getAgentConfigSignature失败:', err?.message || err)
      throw err
    }
  }

  // ★ 注册
  try {
    await ww.register({
      corpId: corpId.value,
      agentId: Number(agentId),
      jsApiList: ['getCurExternalContact', 'getCurExternalChat', 'getContext', 'sendChatMessage'],
      getConfigSignature,
      getAgentConfigSignature,
      onConfigSuccess(res: any) {
        console.log('[Sidebar] ✅ onConfigSuccess:', JSON.stringify(res))
      },
      onConfigFail(res: any) {
        console.error('[Sidebar] ❌ onConfigFail:', JSON.stringify(res))
        diagConfigResult += ` | SDK回调fail: ${JSON.stringify(res)}`
      },
      onAgentConfigSuccess(res: any) {
        console.log('[Sidebar] ✅ onAgentConfigSuccess:', JSON.stringify(res))
      },
      onAgentConfigFail(res: any) {
        console.error('[Sidebar] ❌ onAgentConfigFail:', JSON.stringify(res))
        diagAgentConfigResult += ` | SDK回调fail: ${JSON.stringify(res)}`
      },
    })
    console.log('[Sidebar] ww.register 返回成功, corpId=', corpId.value, ', agentId=', agentId)
  } catch (err: any) {
    console.error('[Sidebar] ❌ ww.register 异常:', err)
    // ★ 如果已经有token，SDK注册失败不阻塞页面
    if (pageState.value === 'detail' && sidebarToken.value) {
      console.warn('[Sidebar] ww.register失败但已有token，维持当前页面')
      return
    }
    const errMsg = err?.message || err?.errMsg || JSON.stringify(err)
    setSdkError('sdk-agent', 'ww.register 失败',
      `应用注册失败(${errMsg})。AgentID=${agentId}, 域名=${window.location.hostname}`,
      `corpId=${corpId.value}, agentId=${agentId}, err=${errMsg}`)
    return
  }

  // ★ 直接调用 getCurExternalContact（SDK会惰性触发agentConfig）
  let contactSuccess = false
  try {
    console.log('[Sidebar] 调用 ww.getCurExternalContact()...')
    const contactRes: any = await ww.getCurExternalContact()
    console.log('[Sidebar] getCurExternalContact 响应:', JSON.stringify(contactRes))
    const uid = contactRes?.userId || contactRes?.result?.userId
    if (uid) {
      externalUserId.value = uid
      localStorage.setItem('wecom_sidebar_last_external_id', uid)
      console.log('[Sidebar] ✅ 获取外部联系人成功:', uid)
      contactSuccess = true
      // ★ 如果已经处于detail状态（token缓存快速进入），只刷新客户数据
      if (pageState.value === 'detail' && sidebarToken.value) {
        await loadCustomerDetail()
        loadCollectStatus()
      } else {
        checkBindingAndLoad()
      }
    }
  } catch (e: any) {
    console.warn('[Sidebar] ww.getCurExternalContact 失败:', e?.message || e)
  }

  // ★ SDK方式失败后，尝试直接通过原生桥接调用（企微侧边栏可能已有应用上下文）
  if (!contactSuccess) {
    console.log('[Sidebar] SDK getCurExternalContact失败，尝试 WeixinJSBridge 直接调用...')
    try {
      const bridgeUid = await new Promise<string>((resolve, reject) => {
        const w = window as any
        if (!w.WeixinJSBridge) { reject(new Error('WeixinJSBridge不可用')); return }
        w.WeixinJSBridge.invoke('getCurExternalContact', {}, (res: any) => {
          console.log('[Sidebar] Bridge getCurExternalContact:', JSON.stringify(res))
          if (res.err_msg === 'getCurExternalContact:ok' && res.userId) {
            resolve(res.userId)
          } else {
            reject(new Error(res.err_msg || 'bridge call failed'))
          }
        })
      })
      externalUserId.value = bridgeUid
      localStorage.setItem('wecom_sidebar_last_external_id', bridgeUid)
      console.log('[Sidebar] ✅ Bridge方式获取外部联系人成功:', bridgeUid)
      contactSuccess = true
      // ★ 如果已经处于detail状态（token缓存快速进入），只刷新客户数据
      if (pageState.value === 'detail' && sidebarToken.value) {
        await loadCustomerDetail()
        loadCollectStatus()
      } else {
        checkBindingAndLoad()
      }
    } catch (bridgeErr: any) {
      console.warn('[Sidebar] Bridge getCurExternalContact也失败:', bridgeErr?.message)
    }
  }

  // 两种方式都失败
  if (!contactSuccess) {
    // ★ 如果已经处于已登录状态（token缓存快速进入），SDK获取联系人失败不影响页面展示
    if (pageState.value === 'detail' && sidebarToken.value) {
      console.warn('[Sidebar] getCurExternalContact失败，但已有token，维持当前页面。尝试用缓存的externalUserId')
      const cachedEid = localStorage.getItem('wecom_sidebar_last_external_id')
      if (cachedEid) {
        externalUserId.value = cachedEid
        await loadCustomerDetail()
        loadCollectStatus()
      }
      return
    }

    const errDetail = diagAgentConfigResult || '(未知)'
    console.error('[Sidebar] 诊断: configCalled=', diagConfigCalled, ', agentConfigCalled=', diagAgentConfigCalled)
    console.error('[Sidebar] 诊断: configResult=', diagConfigResult, ', agentConfigResult=', diagAgentConfigResult)

    // ★ 92002 自动恢复：清除后端缓存并重试一次
    const is92002 = /92002|cross corp/i.test(errDetail)
    if (is92002 && retryCount < 1) {
      console.warn('[Sidebar] 检测到92002错误，清除后端缓存并重试...')
      try {
        await clearSidebarCache(corpId.value)
        return initWithNewSdk(retryCount + 1)
      } catch (_clearErr) { /* ignore */ }
    }

    pageState.value = 'error'
    const diagInfo = [
      `agentConfig结果: ${errDetail}`,
      `config回调${diagConfigCalled ? '已' : '未'}被SDK调用`,
      `agentConfig回调${diagAgentConfigCalled ? '已' : '未'}被SDK调用`,
      `AgentID=${agentId}, CorpID=${corpId.value}`,
      retryCount > 0 ? '(已重试，仍然失败)' : '',
    ].filter(Boolean).join('\n')

    if (!diagAgentConfigCalled) {
      errorMsg.value = `SDK未触发应用身份验证。可能原因：\n1) 企微客户端版本过低（需≥2.5.0）\n2) 非企微内置浏览器环境\n3) AgentID(${agentId})未生效\n\n${diagInfo}`
    } else if (is92002) {
      errorMsg.value = `应用身份验证失败(92002)。\n\n★ 请在服务商后台检查：\n1)「应用管理」→「可信域名」是否包含 ${window.location.hostname}\n2)「网页授权可信域名」是否包含 ${window.location.hostname}\n3) 应用是否已开启「客户联系」API权限\n4) 让企业管理员重新授权安装应用\n5) 等待10分钟后重试（企微有缓存生效延迟）\n\n${diagInfo}`
    } else if (/agentConfig:fail/i.test(errDetail)) {
      errorMsg.value = `应用签名验证失败。请检查：\n1) 可信域名中是否包含 ${window.location.hostname}\n2) AgentID(${agentId})是否正确\n\n${diagInfo}`
    } else if (/no permission|permission denied/i.test(errDetail)) {
      errorMsg.value = `权限不足(${errDetail})。请检查应用是否有「客户联系」权限`
    } else {
      errorMsg.value = `获取聊天对象失败，请确保在与外部联系人的聊天窗口中打开侧边栏。\n\n${diagInfo}`
    }
  }
}

/**
 * 旧版 SDK 初始化（wx.config + wx.agentConfig）
 * 作为降级方案保留
 */
async function initWithLegacySdk() {
  console.log('[Sidebar] 使用旧版 wx.config + agentConfig 模式')
  const signUrl = window.location.href.split('#')[0].replace(/\s+$/, '')
  console.log('[Sidebar] 获取JS-SDK签名, signUrl:', signUrl)

  let configRes: any
  try {
    configRes = await getSidebarJsSdkConfig({ url: signUrl, corpId: corpId.value })
  } catch (e: any) {
    console.error('[Sidebar] JS-SDK签名获取失败:', e)
    const backendMsg = e?.response?.data?.message || e?.data?.message || e?.message || '未知错误'
    const backendErrCode = e?.response?.data?.errorCode || e?.data?.errorCode
    const backendHint = e?.response?.data?.hint || e?.data?.hint
    if (backendErrCode === 'SUITE_TICKET_INVALID' || /40085|invalid suite[_ ]ticket/i.test(backendMsg)) {
      setSdkError('suite-ticket', '侧边栏初始化失败', backendHint || '第三方授权应用的 suite_ticket 已过期', `错误: ${backendMsg}`)
      loadSuiteDiagnostic()
      return
    }
    setSdkError('api', 'JS-SDK签名获取失败', `请检查企微配置（CorpID: ${corpId.value}）`, `错误: ${backendMsg}`)
    return
  }
  if (!configRes?.corpId) {
    setSdkError('api', 'JS-SDK配置返回异常', '后端未返回有效的JS-SDK签名配置', `响应: ${JSON.stringify(configRes || {}).substring(0, 200)}`)
    return
  }

  console.log('[Sidebar] ===== 旧版JS-SDK配置 =====')
  console.log('[Sidebar] corpId:', configRes.corpId, ', agentId:', configRes.agentId, ', authType:', configRes.authType)
  console.log('[Sidebar] corpSign:', configRes.corpSignature ? '✅' : '❌', ', agentSign:', configRes.agentSignature ? '✅' : '❌')

  const wx = (window as any).wx
  if (!wx) {
    setSdkError('sdk-load', 'wx对象不存在', 'JS-SDK已加载但wx对象未生成，请重试')
    return
  }

  const isDebug = new URLSearchParams(window.location.search).has('debug')
  wx.config({
    beta: true,
    debug: isDebug,
    appId: configRes.corpId,
    timestamp: configRes.timestamp,
    nonceStr: configRes.nonceStr,
    signature: configRes.corpSignature,
    jsApiList: ['getContext']
  })

  wx.ready(() => {
    console.log('[Sidebar] wx.config ready ✅')
    if (configRes.agentSignature && configRes.agentId) {
      const agentIdStr = String(configRes.agentId)
      wx.agentConfig({
        corpid: configRes.corpId,
        agentid: agentIdStr,
        timestamp: configRes.timestamp,
        nonceStr: configRes.nonceStr,
        signature: configRes.agentSignature,
        jsApiList: ['getCurExternalContact', 'sendChatMessage'],
        debug: isDebug,
        success: () => {
          console.log('[Sidebar] ✅ agentConfig success')
          sessionStorage.removeItem('sidebar_92002_retried')
          getCurExternalContact(wx)
        },
        fail: async (err: any) => {
          console.error('[Sidebar] ❌ agentConfig fail:', JSON.stringify(err))
          const errMsg = err?.errMsg || err?.err_msg || JSON.stringify(err)

          // ★ 92002 自动恢复：清除后端缓存并刷新页面重试
          if (/92002|cross corp/i.test(errMsg) && !sessionStorage.getItem('sidebar_92002_retried')) {
            console.warn('[Sidebar] 检测到92002错误，清除后端缓存并刷新页面...')
            sessionStorage.setItem('sidebar_92002_retried', '1')
            try { await clearSidebarCache(configRes.corpId) } catch (_e) { /* ignore */ }
            window.location.reload()
            return
          }
          sessionStorage.removeItem('sidebar_92002_retried')

          if (errMsg.includes('permission denied')) {
            setSdkError('sdk-agent', 'agentConfig权限不足', '应用缺少调用权限，请检查客户联系权限和可信域名', `err=${errMsg}`)
          } else if (/92002|cross corp/i.test(errMsg)) {
            setSdkError('sdk-agent', 'agentConfig跨企业错误(92002)',
              `应用身份验证失败(不允许跨企业调用)。请检查：\n1) 侧边栏域名(${window.location.hostname})是否在应用可信域名中\n2) AgentID(${agentIdStr})与当前企业授权的应用是否匹配\n3) 是否需要重新授权安装应用`,
              `corpId=${configRes.corpId}, agentId=${agentIdStr}, err=${errMsg}`)
          } else if (errMsg.includes('invalid signature') || errMsg.includes('sign')) {
            setSdkError('sdk-agent', 'agentConfig签名失败', '签名不正确，可能是URL不匹配或ticket已过期。建议：刷新页面或联系管理员检查可信域名', `err=${errMsg}`)
          } else if (errMsg.includes('domain') || errMsg.includes('bindDomain') || errMsg.includes('bindUrl')) {
            setSdkError('sdk-agent', '可信域名不匹配', `当前域名 ${window.location.hostname} 不在应用可信域名列表中`, `err=${errMsg}`)
          } else {
            setSdkError('sdk-agent', 'agentConfig失败',
              `应用配置验证失败(${errMsg})。\n建议：1) 检查AgentID(${agentIdStr})是否正确 2) 检查可信域名 3) 检查应用Secret`,
              `corpId=${configRes.corpId}, agentId=${agentIdStr}`)
          }
        }
      })
    } else {
      const missingParts: string[] = []
      if (!configRes.agentId) missingParts.push('AgentID')
      if (!configRes.agentSignature) missingParts.push('应用签名')
      setSdkError('sdk-agent', '侧边栏配置不完整', `缺少 ${missingParts.join(' 和 ')}。请在CRM企微管理页面检查配置。`)
    }
  })

  wx.error((err: any) => {
    console.error('[Sidebar] wx.config error:', err)
    setSdkError('sdk-config', 'JS-SDK配置失败', 'wx.config验证失败，请检查CorpID和Secret是否正确', `错误: ${JSON.stringify(err)}`)
  })
}

function getCurExternalContact(wx: any) {
  console.log('[Sidebar] 调用 getCurExternalContact...')
  try {
    wx.invoke('getCurExternalContact', {}, (res: any) => {
      console.log('[Sidebar] getCurExternalContact 响应:', JSON.stringify(res))
      if (res.err_msg === 'getCurExternalContact:ok') {
        externalUserId.value = res.userId
        console.log('[Sidebar] ✅ 获取外部联系人成功, externalUserId:', res.userId)
        console.log('[Sidebar] 开始检查绑定状态并加载客户数据...')
        checkBindingAndLoad()
      } else if (res.err_msg === 'getCurExternalContact:fail' || res.err_msg?.includes('fail')) {
        console.error('[Sidebar] ❌ getCurExternalContact 失败:', res)
        pageState.value = 'error'
        const errDetail = res.err_msg || '未知错误'
        if (errDetail.includes('no permission') || errDetail.includes('permission')) {
          errorMsg.value = '获取聊天对象失败：应用缺少"客户联系"API权限，请在企微管理后台为应用添加此权限'
        } else if (errDetail.includes('not in chat') || errDetail.includes('invalid')) {
          errorMsg.value = '获取聊天对象失败：请确保在与外部联系人的聊天窗口中打开侧边栏'
        } else {
          errorMsg.value = `获取当前聊天对象失败(${errDetail})，请确保在外部联系人聊天窗口中打开侧边栏`
        }
      } else {
        // 未知响应格式 - 可能是企微版本兼容性问题
        console.error('[Sidebar] ❌ getCurExternalContact 未知响应:', res)
        pageState.value = 'error'
        errorMsg.value = `获取当前聊天对象失败(${res.err_msg || '未知错误'})，请确保在外部联系人聊天窗口中打开侧边栏`
      }
    })
  } catch (e: any) {
    console.error('[Sidebar] ❌ getCurExternalContact 调用异常:', e)
    pageState.value = 'error'
    errorMsg.value = `获取聊天对象异常: ${e?.message || '未知错误'}。可能原因：1.应用未配置客户联系权限 2.agentConfig未成功执行 3.当前不在外部联系人聊天窗口`
  }
}

// ==================== JWT解码（支持中文） ====================

/** 正确解码JWT payload（处理UTF-8中文字符） */
function decodeJwtPayload(token: string): any {
  try {
    const base64Url = token.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    return JSON.parse(jsonPayload)
  } catch {
    return null
  }
}

// ==================== Token过期检查 ====================

/** 检查JWT token是否已完全过期 */
function isTokenExpired(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return payload.exp * 1000 < Date.now()
}

/** 检查JWT token是否即将过期（剩余<1天） */
function isTokenExpiringSoon(token: string): boolean {
  const payload = decodeJwtPayload(token)
  if (!payload?.exp) return false
  return (payload.exp * 1000 - Date.now()) < 24 * 60 * 60 * 1000
}

/**
 * ★ 异步初始化SDK仅用于获取externalUserId（不阻塞已登录页面展示）
 * 用于已有token缓存时，后台拿到当前客户的externalUserId以刷新数据
 */
async function initSdkForExternalUserId() {
  try {
    const envResult = isWecomEnv()
    if (!envResult.isWecom) {
      // 非企微环境，尝试从URL参数获取externalUserId
      const urlParams = new URLSearchParams(window.location.search)
      const eid = urlParams.get('externalUserId') || localStorage.getItem('wecom_sidebar_last_external_id') || ''
      if (eid) {
        externalUserId.value = eid
        await loadCustomerDetail()
        loadCollectStatus()
      }
      return
    }

    // 企微环境：初始化SDK获取externalUserId
    await initWecomSdk()
  } catch (e: any) {
    console.warn('[Sidebar] 后台SDK初始化失败(不影响已登录状态):', e?.message)
    // SDK失败但已登录：尝试用上次缓存的externalUserId
    const cachedEid = localStorage.getItem('wecom_sidebar_last_external_id')
    if (cachedEid && !externalUserId.value) {
      externalUserId.value = cachedEid
      await loadCustomerDetail()
      loadCollectStatus()
    }
  }
}

/** SDK模式：'ww' = 新版 @wecom/jssdk (ww.register)，'wx' = 旧版 (wx.config+agentConfig) */
let sdkMode: 'ww' | 'wx' | null = null

function loadWecomJsSdk(): Promise<void> {
  // ★★★ 必须先检测 ww（新版SDK），再检测 wx（旧版）
  // 因为企微浏览器原生就有 wx 对象（来自 WeixinJSBridge），
  // 如果先检测 wx 会导致永远走旧版流程，对第三方服务商应用侧边栏必定 92002！
  function ensureWwObj(): boolean {
    const w = window as any
    return !!(w.ww && typeof w.ww.register === 'function')
  }
  function ensureWxObj(): boolean {
    const w = window as any
    if (w.wx && typeof w.wx.config === 'function') return true
    if (w.jWeixin && typeof w.jWeixin.config === 'function') {
      w.wx = w.jWeixin
      return true
    }
    return false
  }

  // 先检测 ww（第三方应用必须用 ww.register）
  if (ensureWwObj()) {
    sdkMode = 'ww'
    console.log('[Sidebar] ww对象已存在（新版SDK）')
    return Promise.resolve()
  }

  function loadScript(url: string, timeoutMs = 10000): Promise<{ ok: boolean; reason?: string }> {
    return new Promise((res) => {
      const s = document.createElement('script')
      s.src = url; s.async = true
      s.setAttribute('data-wecom-sdk', '1')
      let done = false
      const finish = (ok: boolean, reason?: string) => { if (done) return; done = true; res({ ok, reason }) }
      const timer = setTimeout(() => finish(false, 'timeout'), timeoutMs)
      s.onload = () => {
        clearTimeout(timer)
        setTimeout(() => {
          const w = window as any
          if (w.ww && typeof w.ww.register === 'function') finish(true)
          else if ((w.wx && typeof w.wx.config === 'function') || (w.jWeixin && typeof w.jWeixin.config === 'function')) finish(true)
          else finish(false, 'obj-not-defined')
        }, 300)
      }
      s.onerror = () => { clearTimeout(timer); finish(false, 'network-error') }
      document.head.appendChild(s)
    })
  }

  // ★ 第三方服务商应用必须用 @wecom/jssdk (ww.register)
  // 参考官方文档: https://developer.work.weixin.qq.com/document/path/90514
  const CDN_LIST = [
    '/api/v1/wecom/sdk/wecom-jssdk-2.4.0.js',
    'https://wwcdn.weixin.qq.com/node/open/js/wecom-jssdk-2.4.0.js',
    'https://wwcdn.weixin.qq.com/node/wework/wwopen/js/wecom-jssdk-2.4.0.js',
  ]

  return (async () => {
    for (let attempt = 0; attempt < 2; attempt++) {
      if (attempt > 0) {
        await new Promise(r => setTimeout(r, 1000))
      }
      for (const cdn of CDN_LIST) {
        if (ensureWwObj()) { sdkMode = 'ww'; console.log('[Sidebar] ✅ ww.register模式'); return }
        const { ok, reason } = await loadScript(cdn)
        if (ok && ensureWwObj()) {
          sdkMode = 'ww'
          console.log('[Sidebar] ✅ ww.register模式 from:', cdn)
          return
        }
        if (ok && ensureWxObj()) {
          sdkMode = 'wx'
          console.log('[Sidebar] ⚠️ 只加载到旧版wx模式 from:', cdn)
          return
        }
        console.warn(`[Sidebar] CDN失败(${cdn}):`, reason)
      }
    }

    // 最后兜底：检测浏览器原生 wx
    if (ensureWxObj()) {
      sdkMode = 'wx'
      console.warn('[Sidebar] ⚠️ 所有新版SDK CDN失败，使用浏览器原生wx对象（第三方应用可能92002）')
      return
    }

    throw new Error(
      '无法加载企微JS-SDK。请检查：\n' +
      '1. 网络是否可访问 wwcdn.weixin.qq.com\n' +
      '2. 侧边栏 URL 是否通过企微客户端打开'
    )
  })()
}

// ==================== 绑定检查 ====================

async function checkBindingAndLoad() {
  try {
    // ★ 保存当前externalUserId到localStorage（切换客户时保持上下文）
    if (externalUserId.value) {
      localStorage.setItem('wecom_sidebar_last_external_id', externalUserId.value)
    }

    // 先检查localStorage中是否有缓存的token（跨tab、跨客户切换共享）
    const cachedToken = localStorage.getItem('wecom_sidebar_token')
    if (cachedToken && !isTokenExpired(cachedToken)) {
      // 检查token是否即将过期（剩余<1天），如果是则尝试刷新
      if (isTokenExpiringSoon(cachedToken)) {
        try {
          const refreshRes: any = await refreshSidebarToken(cachedToken)
          if (refreshRes?.token) {
            localStorage.setItem('wecom_sidebar_token', refreshRes.token)
            sidebarToken.value = refreshRes.token
          } else {
            sidebarToken.value = cachedToken
          }
        } catch {
          sidebarToken.value = cachedToken
        }
      } else {
        sidebarToken.value = cachedToken
      }

      // 从token payload恢复用户信息
      if (!boundUser.value) {
        const payload = decodeJwtPayload(sidebarToken.value)
        if (payload) {
          boundUser.value = { name: payload.crmUserName || payload.username || '用户' }
        }
      }

      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
      return
    }

    // 检查绑定状态（仅在有wecomUserId和corpId时才调用）
    if (wecomUserId.value && corpId.value) {
      const res: any = await sidebarVerifyBinding(wecomUserId.value, corpId.value)
      if (res?.bound) {
        sidebarToken.value = res.token
        boundUser.value = res.user
        localStorage.setItem('wecom_sidebar_token', res.token)
        pageState.value = 'detail'
        await loadCustomerDetail()
        loadCollectStatus()
        return
      }
    }

    // 无有效token且无绑定：显示登录页
    pageState.value = 'login'
  } catch (e) {
    console.error('[Sidebar] Check binding error:', e)
    // 如果已有token（可能是网络问题导致verify失败），仍然允许进入
    if (sidebarToken.value && !isTokenExpired(sidebarToken.value)) {
      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
    } else {
      pageState.value = 'login'
    }
  }
}

// ==================== 登录绑定 ====================

async function handleLogin() {
  loginError.value = ''
  if (!loginForm.value.tenantCode) { loginError.value = '请输入租户编码'; return }
  if (!loginForm.value.username) { loginError.value = '请输入用户名'; return }
  if (!loginForm.value.password) { loginError.value = '请输入密码'; return }

  loginLoading.value = true
  try {
    const res: any = await sidebarBindAccount({
      wecomUserId: wecomUserId.value,
      corpId: corpId.value,
      tenantCode: loginForm.value.tenantCode,
      username: loginForm.value.username,
      password: loginForm.value.password
    })
    if (res?.token) {
      sidebarToken.value = res.token
      boundUser.value = res.user
      localStorage.setItem('wecom_sidebar_token', res.token)
      localStorage.setItem('wecom_sidebar_tenant_code', loginForm.value.tenantCode)
      ElMessage.success('绑定成功')
      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
    } else {
      loginError.value = res?.message || '绑定失败'
    }
  } catch (e: any) {
    loginError.value = e?.response?.data?.message || e?.message || '账号或密码错误'
  } finally {
    loginLoading.value = false
  }
}

function handleUnbind() {
  localStorage.removeItem('wecom_sidebar_token')
  sidebarToken.value = ''
  boundUser.value = null
  customerData.value = null
  pageState.value = 'login'
}

// ==================== 加载客户详情 ====================

async function loadCustomerDetail() {
  if (!sidebarToken.value) return
  // externalUserId为空时仅跳过客户数据加载（不阻塞页面展示）
  if (!externalUserId.value) {
    console.log('[Sidebar] externalUserId为空，等待SDK获取...')
    return
  }

  try {
    const res: any = await getSidebarCustomerDetail(externalUserId.value, sidebarToken.value)
    customerData.value = res || { found: false }
  } catch (e: any) {
    console.error('[Sidebar] Load customer error:', e)
    if (e?.response?.status === 401) {
      // Token真正过期：清理并跳转登录（但保留租户编码）
      localStorage.removeItem('wecom_sidebar_token')
      sidebarToken.value = ''
      pageState.value = 'login'
      return
    }
    customerData.value = { found: false }
  }
}

// ==================== 调试模式 ====================

async function debugInit() {
  if (!debugCorpId.value || !debugWecomUserId.value) {
    ElMessage.warning('请填写CorpID和WecomUserId')
    return
  }
  corpId.value = debugCorpId.value
  wecomUserId.value = debugWecomUserId.value
  externalUserId.value = debugExternalUserId.value || 'debug_external_001'
  await checkBindingAndLoad()
}

// ==================== 工具函数 ====================

function formatLastTime(time: string | null | undefined): string {
  if (!time) return '-'
  const d = new Date(time)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  if (days === 0) return '今天'
  if (days === 1) return '昨天'
  if (days < 30) return days + '天前'
  if (days < 365) return Math.floor(days / 30) + '月前'
  return Math.floor(days / 365) + '年前'
}

function formatOrderTime(time: string): string {
  if (!time) return '-'
  return new Date(time).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}

function getOrderStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理', processing: '处理中', shipped: '已发货',
    delivered: '已送达', completed: '已完成', cancelled: '已取消',
    refunded: '已退款', paid: '已付款', unpaid: '未付款',
    confirmed: '已确认', draft: '草稿', pending_shipment: '待发货'
  }
  return map[status] || status
}

function getOrderStatusColor(status: string): string {
  const m: Record<string, string> = { completed: '#67c23a', shipped: '#409eff', pending: '#e6a23c', cancelled: '#f56c6c', refunded: '#f56c6c', paid: '#67c23a' }
  return m[status] || '#07c160'
}

function openCrmDetail() {
  if (customerData.value?.crmCustomer?.id) {
    window.open(`${window.location.origin}/customer/detail/${customerData.value.crmCustomer.id}`, '_blank')
  }
}

function reloadPage() {
  window.location.reload()
}

// ==================== Phase 8: 新增功能 ====================

/** 刷新客户数据 */
async function refreshCustomerData() {
  refreshingData.value = true
  try {
    await loadCustomerDetail()
    await loadCollectStatus()
    ElMessage.success('已刷新最新信息')
  } catch {
    ElMessage.error('刷新失败')
  } finally {
    refreshingData.value = false
  }
}

/** 加载当前企微客户的收集状态 */
async function loadCollectStatus() {
  if (!externalUserId.value || !sidebarToken.value) return
  try {
    const payload = decodeJwtPayload(sidebarToken.value)
    if (!payload) return
    const tenantId = payload.tenantId || ''
    const memberId = payload.userId || payload.id || ''
    const { default: axios } = await import('axios')
    const baseUrl = `${window.location.origin}/api/v1`
    const res: any = await axios.get(`${baseUrl}/mp/collect-status`, {
      params: { tenantId, memberId, externalUserId: externalUserId.value },
      headers: { Authorization: `Bearer ${sidebarToken.value}` }
    })
    collectStatus.value = res?.data?.data || null
  } catch { /* ignore */ }
}

/** 转发填写资料卡片 */
async function handleSendFormCard() {
  if (sendingFormCard.value) return
  sendingFormCard.value = true
  try {
    // 解析 token 中的 tenantId 和 userId
    let tenantId = '', memberId = ''
    if (sidebarToken.value) {
      const payload = decodeJwtPayload(sidebarToken.value)
      if (payload) {
        tenantId = payload.tenantId || ''
        memberId = payload.userId || payload.id || ''
      }
    }
    const ts = Date.now().toString()
    // 调用后端生成卡片签名
    const { default: axios } = await import('axios')
    const baseUrl = `${window.location.origin}/api/v1`
    const res: any = await axios.post(`${baseUrl}/mp/generate-card`, { tenantId, memberId, ts }, {
      headers: { Authorization: `Bearer ${sidebarToken.value}` }
    })
    const data = res?.data?.data || res?.data || {}
    const path = data.path || `/pages/form/form?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${data.sign || ''}`

    // 企微环境：通过JS-SDK发送小程序卡片
    const wx = (window as any).wx
    if (wx?.invoke) {
      wx.invoke('sendChatMessage', {
        msgtype: 'miniprogram',
        miniprogram: {
          appid: data.appId || '',
          title: data.title || '请填写您的资料',
          imgUrl: data.imageUrl || '',
          page: path
        }
      }, (sendRes: any) => {
        if (sendRes.err_msg === 'sendChatMessage:ok') {
          ElMessage.success('卡片已发送')
        } else {
          ElMessage.info('已生成卡片链接，请手动分享')
        }
      })
    } else {
      ElMessage.success('已生成资料收集链接（非企微环境无法直接发送卡片）')
    }

    // 记录发送日志（含 externalUserId）
    try {
      const { default: axios } = await import('axios')
      const baseUrl = `${window.location.origin}/api/v1`
      await axios.post(`${baseUrl}/mp/log-send`, {
        tenantId, memberId, ts, externalUserId: externalUserId.value
      }, { headers: { Authorization: `Bearer ${sidebarToken.value}` } })
    } catch { /* ignore */ }

    // 刷新收集状态
    await loadCollectStatus()
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败')
  } finally {
    sendingFormCard.value = false
  }
}

/** 换绑 */
async function handleRebind() {
  try {
    await ElMessageBox.confirm(
      '确定要解除当前绑定并重新绑定新的CRM账号？',
      '换绑确认',
      { confirmButtonText: '确定换绑', cancelButtonText: '取消', type: 'warning' }
    )
    // 清除绑定
    localStorage.removeItem('wecom_sidebar_token')
    sidebarToken.value = ''
    boundUser.value = null
    customerData.value = null
    pageState.value = 'login'
    ElMessage.success('已解除绑定，请重新登录绑定')
  } catch {
    // 用户取消
  }
}

</script>

<style scoped>
.wecom-sidebar-page { max-width: 375px; margin: 0 auto; min-height: 100vh; background: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'PingFang SC', 'Microsoft YaHei', sans-serif; overflow-y: auto; color: #303133; }
.sidebar-loading, .sidebar-center { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 60vh; padding: 20px; text-align: center; }
.sidebar-loading p, .sidebar-center p { color: #909399; font-size: 13px; margin-top: 12px; }
/* ========== 登录页（对齐Preview） ========== */
.preview-login { padding: 32px 24px; text-align: center; }
.login-logo { font-size: 48px; margin-bottom: 8px; }
.preview-login h4 { margin: 0; color: #303133; font-size: 18px; }
.login-desc { color: #909399; font-size: 13px; margin: 4px 0 20px; }
.login-error { color: #f56c6c; font-size: 12px; margin-bottom: 10px; padding: 6px 10px; background: #fef0f0; border-radius: 6px; }
.preview-form { text-align: left; }
.form-group { margin-bottom: 12px; }
.form-group label { display: block; font-size: 12px; color: #606266; margin-bottom: 4px; }
.preview-input { width: 100%; padding: 8px 10px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 13px; outline: none; box-sizing: border-box; color: #303133; }
.preview-input:focus { border-color: #07c160; }
.preview-btn { width: 100%; padding: 10px; border: none; border-radius: 6px; background: #07c160; color: #fff; font-size: 14px; font-weight: 600; cursor: pointer; margin-top: 8px; }
.preview-btn:hover { background: #06ad56; }
.preview-btn:disabled { background: #c0c4cc; cursor: not-allowed; }
.preview-btn.full { background: #4c6ef5; }
.preview-btn.full:hover { background: #3b5de7; }
.login-tip { margin-top: 16px; font-size: 11px; color: #909399; }
.login-tip p { margin: 4px 0; }
/* ========== 详情页（对齐Preview） ========== */
.preview-detail { padding: 0; }
.preview-user-bar { display: flex; justify-content: space-between; align-items: center; padding: 8px 12px; background: #fff; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: 500; color: #303133; }
.action-link { color: #4c6ef5; cursor: pointer; font-size: 12px; font-weight: 400; }
.preview-card { background: #fff; margin: 8px; border-radius: 10px; padding: 12px; box-shadow: 0 1px 3px rgba(0,0,0,0.04); }
.customer-head { display: flex; align-items: center; gap: 10px; }
.avatar { font-size: 36px; }
.customer-name { font-size: 15px; font-weight: 600; color: #303133; }
.customer-company { font-size: 12px; color: #606266; }
.customer-follow { font-size: 11px; color: #909399; margin-top: 2px; }
.card-title { font-size: 13px; font-weight: 600; color: #303133; margin-bottom: 8px; }
.info-row { display: flex; justify-content: space-between; padding: 4px 0; font-size: 12px; color: #303133; border-bottom: 1px solid #f5f5f5; }
.info-row .label { color: #909399; flex-shrink: 0; width: 60px; }
.info-row .tag { background: #ecf5ff; color: #409eff; padding: 0 6px; border-radius: 3px; font-size: 11px; }
.customer-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
.mini-tag { background: #f4f4f5; color: #909399; padding: 1px 6px; border-radius: 3px; font-size: 10px; }
.stats-row { display: flex; gap: 8px; }
.stat { flex: 1; text-align: center; padding: 6px; background: #f9fafb; border-radius: 6px; }
.stat-val { font-size: 16px; font-weight: 700; color: #303133; }
.stat-val.amount { font-size: 14px; color: #f56c6c; }
.stat-lbl { font-size: 10px; color: #909399; margin-top: 2px; }
.order-item { padding: 6px 0; border-bottom: 1px solid #f5f5f5; }
.order-item:last-child { border-bottom: none; }
.order-head { display: flex; justify-content: space-between; font-size: 12px; }
.order-no { color: #303133; font-weight: 500; }
.order-status { font-size: 11px; }
.order-body { display: flex; justify-content: space-between; font-size: 11px; color: #909399; margin-top: 2px; }
.order-amount { color: #f56c6c; font-weight: 500; }
.order-products { margin-top: 4px; padding-top: 4px; border-top: 1px dashed #e4e7ed; }
/* 刷新按钮 */
.btn-refresh-inline { display: inline-flex; align-items: center; justify-content: center; width: 18px; height: 18px; border-radius: 50%; cursor: pointer; color: #909399; transition: all 0.2s; font-size: 12px; }
.btn-refresh-inline:hover { color: #409eff; background: #ecf5ff; }
/* 转发填写资料按钮 */
.btn-send-form-card { font-size: 10px; padding: 2px 8px; border: 1px solid #93c5fd; border-radius: 4px; background: #fff; color: #3b82f6; cursor: pointer; white-space: nowrap; transition: all 0.2s; }
.btn-send-form-card:hover { background: #eff6ff; border-color: #60a5fa; }
.btn-send-form-card:disabled { opacity: 0.5; cursor: not-allowed; }
</style>


