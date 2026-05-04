<template>
  <div class="wecom-sidebar-page">
    <!-- 加载中 -->
    <div v-if="pageState === 'loading'" class="sidebar-loading">
      <el-icon class="is-loading" :size="32" color="#07c160"><Loading /></el-icon>
      <p>正在加载...</p>
    </div>

    <!-- JS-SDK不可用 / 非企微环境 -->
    <div v-else-if="pageState === 'no-sdk'" class="sidebar-center">
      <el-result icon="warning" title="非企微环境" sub-title="请在企业微信聊天侧边栏中打开此页面">
        <template #extra>
          <p style="color:#909399;font-size:12px">如果您是管理员，请在企微后台配置侧边栏应用地址指向此页面</p>
          <!-- 开发模式下允许手动输入调试 -->
          <div v-if="isDev" style="margin-top:16px">
            <el-divider>开发调试</el-divider>
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

    <!-- 未绑定账号 - 登录 -->
    <div v-else-if="pageState === 'login'" class="sidebar-login">
      <div class="login-header">
        <div class="login-logo">☁️</div>
        <h3>云客CRM</h3>
        <p>绑定您的CRM账号以查看客户信息</p>
      </div>
      <el-form ref="loginFormRef" :model="loginForm" :rules="loginRules" label-position="top" size="default">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="loginForm.username" placeholder="CRM登录用户名" prefix-icon="User" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="loginForm.password" type="password" placeholder="CRM登录密码" prefix-icon="Lock" show-password />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" style="width:100%" :loading="loginLoading" @click="handleLogin">
            绑定账号
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 客户详情 -->
    <div v-else-if="pageState === 'detail'" class="sidebar-detail">
      <!-- 顶部用户信息 -->
      <div class="sidebar-user-bar">
        <span class="user-name">{{ boundUser?.name }}</span>
        <div class="sidebar-user-actions">
          <el-button link type="warning" size="small" @click="handleRebind">换绑</el-button>
          <el-button link type="info" size="small" @click="handleUnbind">
            <el-icon><SwitchButton /></el-icon>
          </el-button>
        </div>
      </div>

      <!-- 未找到客户 -->
      <div v-if="customerData && !customerData.found" class="sidebar-center" style="padding-top:40px">
        <el-empty description="未找到该客户信息" :image-size="60">
          <template #description>
            <p style="color:#909399;font-size:12px">该外部联系人尚未同步到CRM系统</p>
          </template>
        </el-empty>
      </div>

      <!-- 客户信息 -->
      <div v-else-if="customerData && customerData.found" class="sidebar-content">
        <!-- 企微客户卡片 -->
        <div class="info-card">
          <div class="card-header-row">
            <div class="customer-avatar">
              <img v-if="customerData.wecomCustomer?.avatar" :src="customerData.wecomCustomer.avatar" alt="" />
              <span v-else>👤</span>
            </div>
            <div class="customer-basic">
              <div class="customer-name">{{ customerData.wecomCustomer?.name || '未知客户' }}</div>
              <div class="customer-corp" v-if="customerData.wecomCustomer?.corpName">
                {{ customerData.wecomCustomer.corpName }}
                <span v-if="customerData.wecomCustomer?.position"> · {{ customerData.wecomCustomer.position }}</span>
              </div>
              <div class="customer-follow" v-if="customerData.wecomCustomer?.followUserName">
                跟进人: {{ customerData.wecomCustomer.followUserName }}
              </div>
            </div>
          </div>
          <div class="customer-remark" v-if="customerData.wecomCustomer?.remark">
            <el-icon><EditPen /></el-icon> {{ customerData.wecomCustomer.remark }}
          </div>
        </div>

        <!-- CRM客户信息 -->
        <div v-if="customerData.crmCustomer" class="info-card">
          <div class="section-title" style="display:flex;justify-content:space-between;align-items:center">
            <span style="display:flex;align-items:center;gap:6px">
              <el-icon><User /></el-icon> CRM客户信息
              <el-button link type="primary" size="small" @click="refreshCustomerData" :loading="refreshingData" style="padding:2px 4px;font-size:12px">
                <el-icon><Refresh /></el-icon>
              </el-button>
            </span>
            <el-button size="small" type="primary" plain @click="handleSendFormCard" :loading="sendingFormCard" style="font-size:11px;padding:4px 10px">
              📋 转发填写资料
            </el-button>
          </div>
          <div class="info-rows">
            <div class="info-row">
              <span class="info-label">姓名</span>
              <span class="info-value">{{ customerData.crmCustomer.name }}</span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.phone">
              <span class="info-label">手机</span>
              <span class="info-value">{{ displaySensitiveInfoNew(customerData.crmCustomer.phone, SensitiveInfoType.PHONE) }}</span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.source">
              <span class="info-label">来源</span>
              <span class="info-value">{{ customerData.crmCustomer.source }}</span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.level">
              <span class="info-label">等级</span>
              <span class="info-value">
                <el-tag size="small" :type="getLevelType(customerData.crmCustomer.level)">{{ customerData.crmCustomer.level }}</el-tag>
              </span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.salesPersonName">
              <span class="info-label">销售</span>
              <span class="info-value">{{ customerData.crmCustomer.salesPersonName }}</span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.tenantCode">
              <span class="info-label">租户</span>
              <span class="info-value">{{ customerData.crmCustomer.tenantCode }}</span>
            </div>
            <div class="info-row" v-if="customerData.crmCustomer.wecomExternalUserid">
              <span class="info-label">企微USID</span>
              <span class="info-value usid-value">
                <span class="usid-text">{{ customerData.crmCustomer.wecomExternalUserid }}</span>
                <el-button link type="primary" size="small" @click="copyUsid(customerData.crmCustomer.wecomExternalUserid)">📋</el-button>
              </span>
            </div>
          </div>
          <div class="customer-tags" v-if="customerData.crmCustomer.tags?.length">
            <el-tag v-for="tag in customerData.crmCustomer.tags" :key="tag" size="small" type="info" style="margin:2px">{{ tag }}</el-tag>
          </div>
        </div>

        <!-- 无CRM关联提示 -->
        <div v-else class="info-card info-card-muted">
          <el-icon><InfoFilled /></el-icon>
          <span>该企微客户尚未关联CRM客户</span>
        </div>

        <!-- 资料收集状态 -->
        <div class="info-card" v-if="collectStatus">
          <div class="section-title">
            📋 资料收集状态
          </div>
          <div v-if="collectStatus.status === 'filled'" class="collect-status-row">
            <el-tag type="success" size="small">✅ 已收集</el-tag>
            <span v-if="collectStatus.customer" style="font-size:12px;color:#606266;margin-left:8px">
              {{ collectStatus.customer.name }} {{ collectStatus.customer.phone }}
            </span>
          </div>
          <div v-else-if="collectStatus.status === 'pending'" class="collect-status-row">
            <el-tag type="warning" size="small">⏳ 已发送待填写</el-tag>
            <span style="font-size:12px;color:#909399;margin-left:8px">已发送卡片，等待客户填写</span>
          </div>
          <div v-else class="collect-status-row">
            <el-tag type="info" size="small">未发送</el-tag>
            <span style="font-size:12px;color:#909399;margin-left:8px">点击上方「转发填写资料」发送卡片</span>
          </div>
        </div>

        <!-- 购买统计 -->
        <div class="info-card">
          <div class="section-title">
            <el-icon><DataAnalysis /></el-icon> 购买统计
          </div>
          <div class="stats-grid">
            <div class="stat-item">
              <div class="stat-value">{{ customerData.stats?.orderCount || 0 }}</div>
              <div class="stat-label">订单数</div>
            </div>
            <div class="stat-item">
              <div class="stat-value stat-amount">{{ formatAmount(customerData.stats?.totalAmount) }}</div>
              <div class="stat-label">累计消费</div>
            </div>
            <div class="stat-item">
              <div class="stat-value">{{ formatLastTime(customerData.stats?.lastOrderTime) }}</div>
              <div class="stat-label">最后购买</div>
            </div>
          </div>
        </div>

        <!-- 最近订单(增强: 含商品明细+物流) -->
        <div class="info-card" v-if="customerData.orders?.length">
          <div class="section-title">
            <el-icon><List /></el-icon> 最近订单
          </div>
          <div class="order-list">
            <div v-for="order in customerData.orders" :key="order.id" class="order-item">
              <div class="order-header">
                <span class="order-no">{{ order.orderNumber }}</span>
                <el-tag size="small" :type="getOrderStatusType(order.status)">{{ getOrderStatusText(order.status) }}</el-tag>
              </div>
              <div class="order-body">
                <span class="order-amount">¥{{ Number(order.finalAmount || order.totalAmount).toFixed(2) }}</span>
                <span class="order-time">{{ formatOrderTime(order.createdAt) }}</span>
              </div>
              <!-- Phase 8: 商品明细 -->
              <div v-if="order.products?.length" class="order-products">
                <div v-for="(prod, idx) in order.products" :key="idx" class="product-item">
                  <span class="product-name">{{ prod.name }}</span>
                  <span class="product-qty">×{{ prod.quantity }}</span>
                </div>
              </div>
              <!-- Phase 8: 物流信息 -->
              <div v-if="order.logistics" class="order-logistics">
                <span class="logistics-icon">📍</span>
                <span class="logistics-info">
                  {{ order.logistics.carrier }} {{ order.logistics.trackingNo }}
                  <el-tag size="small" :type="getLogisticsStatusType(order.logistics.status)">{{ getLogisticsStatusText(order.logistics.status) }}</el-tag>
                </span>
              </div>
            </div>
          </div>
        </div>

        <!-- Phase 8: 收货信息 -->
        <div class="info-card" v-if="customerData.shippingAddress">
          <div class="section-title">📦 收货信息</div>
          <div class="info-rows">
            <div class="info-row" v-if="customerData.shippingAddress.name">
              <span class="info-label">收货人</span>
              <span class="info-value">{{ customerData.shippingAddress.name }}</span>
            </div>
            <div class="info-row" v-if="customerData.shippingAddress.phone">
              <span class="info-label">手机</span>
              <span class="info-value">{{ customerData.shippingAddress.phone }}</span>
            </div>
            <div class="info-row" v-if="customerData.shippingAddress.address">
              <span class="info-label">地址</span>
              <span class="info-value">{{ customerData.shippingAddress.address }}</span>
            </div>
          </div>
        </div>

        <!-- Phase 8: 售后记录 -->
        <div class="info-card" v-if="customerData.afterSales?.length">
          <div class="section-title">🔧 售后记录 ({{ customerData.afterSales.length }})</div>
          <div class="after-sales-list">
            <div v-for="item in customerData.afterSales" :key="item.id" class="after-sales-item">
              <div class="as-header">
                <span class="as-type">{{ getAfterSaleTypeText(item.type) }}</span>
                <el-tag size="small" :type="getAfterSaleStatusType(item.status)">{{ getAfterSaleStatusText(item.status) }}</el-tag>
              </div>
              <div class="as-body">
                <span v-if="item.reason" class="as-reason">原因：{{ item.reason }}</span>
                <span v-if="item.amount" class="as-amount">¥{{ Number(item.amount).toFixed(2) }}</span>
              </div>
              <div class="as-time">{{ formatOrderTime(item.createdAt) }}</div>
            </div>
          </div>
        </div>

        <!-- Phase 8: 绑定信息 -->
        <div class="info-card" v-if="customerData.bindingInfo">
          <div class="section-title">🔗 绑定信息</div>
          <div class="info-rows">
            <div class="info-row" v-if="customerData.bindingInfo.crmUserName">
              <span class="info-label">CRM用户</span>
              <span class="info-value">{{ customerData.bindingInfo.crmUserName }}</span>
            </div>
            <div class="info-row" v-if="customerData.bindingInfo.tenantCode">
              <span class="info-label">租户编码</span>
              <span class="info-value">{{ customerData.bindingInfo.tenantCode }}</span>
            </div>
            <div class="info-row" v-if="customerData.bindingInfo.boundAt">
              <span class="info-label">绑定时间</span>
              <span class="info-value">{{ formatOrderTime(customerData.bindingInfo.boundAt) }}</span>
            </div>
          </div>
        </div>

        <!-- 查看完整详情 -->
        <div class="sidebar-footer" v-if="customerData.crmCustomer">
          <el-button type="primary" style="width:100%" @click="openCrmDetail">
            <el-icon><TopRight /></el-icon> 查看完整客户详情
          </el-button>
        </div>
      </div>

      <!-- 加载客户中 -->
      <div v-else class="sidebar-center" style="padding-top:60px">
        <el-icon class="is-loading" :size="24" color="#07c160"><Loading /></el-icon>
        <p style="color:#909399;margin-top:8px;font-size:13px">加载客户信息...</p>
      </div>
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
import { Loading, SwitchButton, User, EditPen, InfoFilled, DataAnalysis, List, TopRight, Refresh } from '@element-plus/icons-vue'
import { getSidebarJsSdkConfig, sidebarBindAccount, sidebarVerifyBinding, getSidebarCustomerDetail, refreshSidebarToken } from '@/api/wecom'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'

const isDev = import.meta.env.DEV
const pageState = ref<'loading' | 'no-sdk' | 'login' | 'detail' | 'error'>('loading')
const errorMsg = ref('')

// 企微上下文
const corpId = ref('')
const wecomUserId = ref('')
const externalUserId = ref('')

// 登录
const loginFormRef = ref()
const loginForm = ref({ username: '', password: '' })
const loginRules = {
  username: [{ required: true, message: '请输入用户名', trigger: 'blur' }],
  password: [{ required: true, message: '请输入密码', trigger: 'blur' }]
}
const loginLoading = ref(false)

// 绑定信息
const sidebarToken = ref('')
const boundUser = ref<any>(null)

// 客户数据
const customerData = ref<any>(null)
const refreshingData = ref(false)
const sendingFormCard = ref(false)
const collectStatus = ref<any>(null)

// 调试模式
const debugCorpId = ref('')
const debugWecomUserId = ref('')
const debugExternalUserId = ref('')

// ==================== 初始化 ====================

onMounted(async () => {
  // 检测是否在企微环境
  if (isWecomEnv()) {
    await initWecomSdk()
  } else if (isDev) {
    // 开发模式允许手动调试
    pageState.value = 'no-sdk'
  } else {
    pageState.value = 'no-sdk'
  }
})

function isWecomEnv(): boolean {
  const ua = navigator.userAgent.toLowerCase()
  return ua.includes('wxwork') || ua.includes('micromessenger')
}

async function initWecomSdk() {
  try {
    // 动态加载企微JS-SDK
    await loadWecomJsSdk()

    // 获取JS-SDK配置 - 需要先知道corpId
    // 从URL参数获取corpId，或者从页面配置获取
    const urlParams = new URLSearchParams(window.location.search)
    corpId.value = urlParams.get('corpId') || ''

    if (!corpId.value) {
      // 尝试从meta标签或配置获取
      pageState.value = 'no-sdk'
      return
    }

    // 获取JS-SDK签名
    const configRes: any = await getSidebarJsSdkConfig({ url: window.location.href.split('#')[0], corpId: corpId.value })
    if (!configRes?.corpId) {
      pageState.value = 'no-sdk'
      return
    }

    // 注入wx.config
    const wx = (window as any).wx
    if (!wx) {
      pageState.value = 'no-sdk'
      return
    }

    wx.config({
      beta: true,
      debug: false,
      appId: configRes.corpId,
      timestamp: configRes.timestamp,
      nonceStr: configRes.nonceStr,
      signature: configRes.corpSignature,
      jsApiList: ['getCurExternalContact', 'openUserProfile']
    })

    wx.ready(() => {
      // 注入agentConfig
      if (configRes.agentSignature && configRes.agentId) {
        wx.agentConfig({
          corpid: configRes.corpId,
          agentid: configRes.agentId,
          timestamp: configRes.timestamp,
          nonceStr: configRes.nonceStr,
          signature: configRes.agentSignature,
          jsApiList: ['getCurExternalContact'],
          success: () => {
            getCurExternalContact(wx)
          },
          fail: (err: any) => {
            console.error('[Sidebar] agentConfig fail:', err)
            pageState.value = 'no-sdk'
          }
        })
      } else {
        getCurExternalContact(wx)
      }
    })

    wx.error((err: any) => {
      console.error('[Sidebar] wx.config error:', err)
      pageState.value = 'no-sdk'
    })
  } catch (e: any) {
    console.error('[Sidebar] Init error:', e)
    pageState.value = 'no-sdk'
  }
}

function getCurExternalContact(wx: any) {
  wx.invoke('getCurExternalContact', {}, (res: any) => {
    if (res.err_msg === 'getCurExternalContact:ok') {
      externalUserId.value = res.userId
      checkBindingAndLoad()
    } else {
      console.error('[Sidebar] getCurExternalContact fail:', res)
      pageState.value = 'error'
      errorMsg.value = '获取当前聊天对象失败'
    }
  })
}

// ==================== Token过期检查 ====================

/** 检查JWT token是否即将过期（剩余<1天） */
function isTokenExpiringSoon(token: string): boolean {
  try {
    const payload = JSON.parse(atob(token.split('.')[1]))
    if (!payload?.exp) return false
    const expirationMs = payload.exp * 1000
    const oneDayMs = 24 * 60 * 60 * 1000
    return (expirationMs - Date.now()) < oneDayMs
  } catch {
    return false
  }
}

function loadWecomJsSdk(): Promise<void> {
  return new Promise((resolve, reject) => {
    if ((window as any).wx) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = 'https://res.wx.qq.com/open/js/jWeixin-1.2.0.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('Failed to load WeChat JS-SDK'))
    document.head.appendChild(script)
  })
}

// ==================== 绑定检查 ====================

async function checkBindingAndLoad() {
  try {
    // 先检查sessionStorage中是否有缓存的token
    const cachedToken = sessionStorage.getItem('wecom_sidebar_token')
    if (cachedToken) {
      // 检查token是否即将过期（剩余<1天），如果是则尝试刷新
      if (isTokenExpiringSoon(cachedToken)) {
        try {
          const refreshRes: any = await refreshSidebarToken(cachedToken)
          if (refreshRes?.token) {
            sessionStorage.setItem('wecom_sidebar_token', refreshRes.token)
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
      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
      return
    }

    // 检查绑定状态
    const res: any = await sidebarVerifyBinding(wecomUserId.value, corpId.value)
    if (res?.bound) {
      sidebarToken.value = res.token
      boundUser.value = res.user
      sessionStorage.setItem('wecom_sidebar_token', res.token)
      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
    } else {
      pageState.value = 'login'
    }
  } catch (e) {
    console.error('[Sidebar] Check binding error:', e)
    pageState.value = 'login'
  }
}

// ==================== 登录绑定 ====================

async function handleLogin() {
  try {
    await loginFormRef.value?.validate()
  } catch { return }

  loginLoading.value = true
  try {
    const res: any = await sidebarBindAccount({
      wecomUserId: wecomUserId.value,
      corpId: corpId.value,
      username: loginForm.value.username,
      password: loginForm.value.password
    })
    if (res?.token) {
      sidebarToken.value = res.token
      boundUser.value = res.user
      sessionStorage.setItem('wecom_sidebar_token', res.token)
      ElMessage.success('绑定成功')
      pageState.value = 'detail'
      await loadCustomerDetail()
      loadCollectStatus()
    } else {
      ElMessage.error('绑定失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '账号或密码错误')
  } finally {
    loginLoading.value = false
  }
}

function handleUnbind() {
  sessionStorage.removeItem('wecom_sidebar_token')
  sidebarToken.value = ''
  boundUser.value = null
  customerData.value = null
  pageState.value = 'login'
}

// ==================== 加载客户详情 ====================

async function loadCustomerDetail() {
  if (!externalUserId.value || !sidebarToken.value) return

  try {
    const res: any = await getSidebarCustomerDetail(externalUserId.value, sidebarToken.value)
    customerData.value = res || { found: false }
  } catch (e: any) {
    console.error('[Sidebar] Load customer error:', e)
    // Token可能过期
    if (e?.response?.status === 401) {
      sessionStorage.removeItem('wecom_sidebar_token')
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

function formatAmount(amount: number | undefined): string {
  if (!amount) return '¥0'
  return '¥' + Number(amount).toFixed(2)
}

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

function getLevelType(level: string): string {
  const map: Record<string, string> = { vip: 'danger', important: 'warning', normal: 'info' }
  return map[level] || 'info'
}

function getOrderStatusType(status: string): string {
  const map: Record<string, string> = {
    completed: 'success', delivered: 'success', shipped: '', paid: '',
    pending: 'warning', cancelled: 'danger', refunded: 'danger'
  }
  return map[status] || 'info'
}

function getOrderStatusText(status: string): string {
  const map: Record<string, string> = {
    pending: '待处理', pending_transfer: '待转单', pending_audit: '待审核',
    confirmed: '已确认', paid: '已支付', shipped: '已发货', delivered: '已签收',
    completed: '已完成', cancelled: '已取消', refunded: '已退款', pending_shipment: '待发货'
  }
  return map[status] || status
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

/** 一键复制USID */
async function copyUsid(usid: string) {
  try {
    await navigator.clipboard.writeText(usid)
    ElMessage.success('USID已复制到剪贴板')
  } catch {
    // Fallback
    const input = document.createElement('input')
    input.value = usid
    document.body.appendChild(input)
    input.select()
    document.execCommand('copy')
    document.body.removeChild(input)
    ElMessage.success('USID已复制')
  }
}

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
    let tenantId = '', memberId = ''
    try {
      const payload = JSON.parse(atob(sidebarToken.value.split('.')[1]))
      tenantId = payload.tenantId || ''
      memberId = payload.userId || payload.id || ''
    } catch { return }
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
      try {
        const payload = JSON.parse(atob(sidebarToken.value.split('.')[1]))
        tenantId = payload.tenantId || ''
        memberId = payload.userId || payload.id || ''
      } catch { /* ignore */ }
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
    sessionStorage.removeItem('wecom_sidebar_token')
    sidebarToken.value = ''
    boundUser.value = null
    customerData.value = null
    pageState.value = 'login'
    ElMessage.success('已解除绑定，请重新登录绑定')
  } catch {
    // 用户取消
  }
}

/** 物流状态类型 */
function getLogisticsStatusType(status: string): string {
  const map: Record<string, string> = {
    in_transit: '', delivered: 'success', pending: 'warning',
    returned: 'danger', exception: 'danger'
  }
  return map[status] || 'info'
}

/** 物流状态文本 */
function getLogisticsStatusText(status: string): string {
  const map: Record<string, string> = {
    in_transit: '在途', delivered: '已签收', pending: '待揽收',
    returned: '已退回', exception: '异常'
  }
  return map[status] || status
}

/** 售后类型文本 */
function getAfterSaleTypeText(type: string): string {
  const map: Record<string, string> = {
    return: '退货', exchange: '换货', repair: '维修',
    refund: '退款', complaint: '投诉'
  }
  return map[type] || type
}

/** 售后状态类型 */
function getAfterSaleStatusType(status: string): string {
  const map: Record<string, string> = {
    processing: 'warning', completed: 'success', rejected: 'danger',
    pending: 'info', closed: 'info'
  }
  return map[status] || 'info'
}

/** 售后状态文本 */
function getAfterSaleStatusText(status: string): string {
  const map: Record<string, string> = {
    processing: '处理中', completed: '已完成', rejected: '已拒绝',
    pending: '待处理', closed: '已关闭'
  }
  return map[status] || status
}
</script>

<style scoped lang="scss">
.wecom-sidebar-page {
  max-width: 360px;
  margin: 0 auto;
  min-height: 100vh;
  background: #f5f6f7;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}

.sidebar-loading, .sidebar-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  padding: 20px;
  text-align: center;

  p { color: #909399; font-size: 13px; margin-top: 12px; }
}

// ==================== 登录 ====================
.sidebar-login {
  padding: 40px 24px 24px;
}

.login-header {
  text-align: center;
  margin-bottom: 30px;

  .login-logo {
    font-size: 48px;
    margin-bottom: 8px;
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px;
  }

  p {
    color: #909399;
    font-size: 13px;
    margin: 0;
  }
}

// ==================== 详情 ====================
.sidebar-detail {
  padding-bottom: 16px;
}

.sidebar-user-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: #07c160;
  color: #fff;

  .user-name {
    font-size: 14px;
    font-weight: 500;
  }

  .el-button { color: rgba(255,255,255,0.8); }
}

.sidebar-content {
  padding: 12px;
}

.info-card {
  background: #fff;
  border-radius: 10px;
  padding: 14px;
  margin-bottom: 10px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}

.info-card-muted {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #909399;
  font-size: 13px;
  background: #f9fafb;
}

.card-header-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.customer-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #e4e7ed;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  font-size: 24px;

  img {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }
}

.customer-basic {
  flex: 1;
  min-width: 0;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.customer-corp {
  font-size: 12px;
  color: #909399;
}

.customer-follow {
  font-size: 12px;
  color: #b0b4ba;
  margin-top: 2px;
}

.customer-remark {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: flex-start;
  gap: 6px;

  .el-icon { color: #c0c4cc; margin-top: 2px; }
}

.section-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 12px;

  .el-icon { color: #07c160; }
}

.info-rows {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
}

.info-label {
  color: #909399;
  flex-shrink: 0;
}

.info-value {
  color: #303133;
  text-align: right;
}

.customer-tags {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #f2f3f5;
}

// ==================== 收集状态 ====================
.collect-status-row {
  display: flex;
  align-items: center;
  padding: 4px 0;
}

// ==================== 统计 ====================
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
}

.stat-item {
  text-align: center;
  padding: 8px 4px;
  background: #f9fafb;
  border-radius: 8px;
}

.stat-value {
  font-size: 16px;
  font-weight: 700;
  color: #303133;
}

.stat-amount {
  color: #f56c6c;
  font-size: 14px;
}

.stat-label {
  font-size: 11px;
  color: #909399;
  margin-top: 2px;
}

// ==================== 订单 ====================
.order-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.order-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.order-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.order-no {
  font-size: 12px;
  color: #606266;
  font-family: monospace;
}

.order-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.order-amount {
  font-size: 15px;
  font-weight: 600;
  color: #f56c6c;
}

.order-time {
  font-size: 12px;
  color: #c0c4cc;
}

// ==================== 底部 ====================
.sidebar-footer {
  padding: 12px;
}

// ==================== Phase 8: 新增样式 ====================

.sidebar-user-actions {
  display: flex;
  align-items: center;
  gap: 4px;
}

.usid-value {
  display: flex;
  align-items: center;
  gap: 4px;
}

.usid-text {
  font-family: monospace;
  font-size: 11px;
  color: #606266;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// 商品明细
.order-products {
  margin-top: 6px;
  padding-top: 6px;
  border-top: 1px dashed #e4e7ed;
}

.product-item {
  display: flex;
  justify-content: space-between;
  font-size: 12px;
  color: #606266;
  padding: 2px 0;
}

.product-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.product-qty {
  color: #909399;
  flex-shrink: 0;
  margin-left: 8px;
}

// 物流信息
.order-logistics {
  margin-top: 6px;
  padding: 4px 8px;
  background: #ecf5ff;
  border-radius: 4px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: #409eff;
}

.logistics-icon {
  flex-shrink: 0;
}

.logistics-info {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  flex: 1;
}

// 售后记录
.after-sales-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.after-sales-item {
  padding: 10px;
  background: #f9fafb;
  border-radius: 8px;
}

.as-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 4px;
}

.as-type {
  font-size: 13px;
  font-weight: 500;
  color: #303133;
}

.as-body {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 12px;
}

.as-reason {
  color: #606266;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.as-amount {
  color: #f56c6c;
  font-weight: 500;
  flex-shrink: 0;
  margin-left: 8px;
}

.as-time {
  font-size: 11px;
  color: #c0c4cc;
  margin-top: 4px;
}
</style>


