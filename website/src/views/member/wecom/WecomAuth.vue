<template>
  <div class="wecom-auth">
    <!-- 授权状态总览 -->
    <div class="auth-hero" :class="{ connected: hasActiveConfig }">
      <div class="hero-left">
        <div class="hero-icon-wrap">
          <span class="hero-icon">{{ hasActiveConfig ? '✅' : '🔗' }}</span>
        </div>
        <div class="hero-text">
          <h3>{{ hasActiveConfig ? '企业微信已授权接入' : '一键授权接入企业微信' }}</h3>
          <p v-if="hasActiveConfig">
            已成功授权 {{ connectedCount }} 个企微应用 · 系统运行正常
          </p>
          <p v-else>
            通过扫码授权，快速将企业微信与云客CRM深度打通
          </p>
        </div>
      </div>
      <div v-if="hasActiveConfig" class="hero-stats">
        <div class="hero-stat">
          <span class="hs-num">{{ totalCustomers }}</span>
          <span class="hs-label">企微客户</span>
        </div>
        <div class="hero-stat">
          <span class="hs-num">{{ totalBindings }}</span>
          <span class="hs-label">已绑成员</span>
        </div>
      </div>
    </div>

    <!-- === SaaS 扫码授权引导（未授权时展示） === -->
    <template v-if="!hasActiveConfig">
      <div class="auth-guide-card">
        <div class="guide-header">
          <h4>📱 扫码授权（推荐）</h4>
          <span class="mode-tag saas">SaaS 模式</span>
        </div>
        <p class="guide-desc">
          企业微信管理员使用<strong>企业微信App</strong>扫描下方二维码，即可一键授权接入。
          无需手动填写 CorpID、Secret 等信息，系统自动完成配置。
        </p>

        <div class="qr-auth-area">
          <div class="qr-placeholder">
            <div class="qr-mock">
              <span>📷</span>
              <p>授权二维码</p>
            </div>
            <p class="qr-hint">请在CRM系统「企微管理 → 企微配置」中生成授权二维码</p>
          </div>
          <div class="qr-steps">
            <div class="qs-item">
              <span class="qs-num">1</span>
              <div>
                <strong>登录CRM系统</strong>
                <p>进入「企微管理 → 企微配置」页面</p>
              </div>
            </div>
            <div class="qs-item">
              <span class="qs-num">2</span>
              <div>
                <strong>点击「添加企微配置」</strong>
                <p>选择「第三方应用授权」模式</p>
              </div>
            </div>
            <div class="qs-item">
              <span class="qs-num">3</span>
              <div>
                <strong>扫码授权</strong>
                <p>企微管理员用企业微信App扫码并确认授权</p>
              </div>
            </div>
            <div class="qs-item">
              <span class="qs-num">4</span>
              <div>
                <strong>完成接入</strong>
                <p>系统自动获取企业信息、通讯录和应用权限</p>
              </div>
            </div>
          </div>
        </div>

        <!-- 扫码优势 -->
        <div class="advantage-row">
          <div class="adv-item">
            <span class="adv-icon">⚡</span>
            <div>
              <strong>30秒极速接入</strong>
              <p>扫码即授权，无需配置</p>
            </div>
          </div>
          <div class="adv-item">
            <span class="adv-icon">🔒</span>
            <div>
              <strong>安全可控</strong>
              <p>企微官方OAuth2.0协议</p>
            </div>
          </div>
          <div class="adv-item">
            <span class="adv-icon">🔄</span>
            <div>
              <strong>自动同步</strong>
              <p>通讯录、客户实时同步</p>
            </div>
          </div>
        </div>
      </div>

      <!-- 私有部署提示 -->
      <div class="private-deploy-tip">
        <div class="tip-header">
          <span class="tip-icon">🏢</span>
          <strong>私有部署客户？</strong>
        </div>
        <p>如果您是私有部署版本，请在企业微信管理后台创建<strong>自建应用</strong>，获取 CorpID、AgentID、Secret 后在CRM系统中手动配置。
          <a href="javascript:void(0)" @click="showPrivateGuide = !showPrivateGuide">
            {{ showPrivateGuide ? '收起指引 ▲' : '查看配置指引 ▼' }}
          </a>
        </p>
        <div v-if="showPrivateGuide" class="private-guide">
          <div class="pg-step" v-for="(step, i) in privateSteps" :key="i">
            <span class="pg-num">{{ i + 1 }}</span>
            <div>
              <strong>{{ step.title }}</strong>
              <p>{{ step.desc }}</p>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- === 已授权：配置列表 === -->
    <template v-if="configs.length > 0">
      <div class="section-title">📋 已授权应用</div>
      <div class="config-list">
        <div v-for="config in configs" :key="config.id" class="config-card">
          <div class="cc-top">
            <div class="cc-name">
              <strong>{{ config.name || '企微应用' }}</strong>
              <span class="auth-mode-tag" :class="config.authType">
                {{ config.authType === 'third_party' ? '🔐 第三方授权' : '🔧 自建应用' }}
              </span>
            </div>
            <span class="cc-status" :class="config.connectionStatus">
              {{ config.connectionStatus === 'connected' ? '● 已连接' : '○ 未连接' }}
            </span>
          </div>

          <div class="cc-info">
            <div class="cc-info-item">
              <span class="cc-label">企业ID</span>
              <span class="cc-val">{{ config.corpId }}</span>
            </div>
            <div v-if="config.agentId" class="cc-info-item">
              <span class="cc-label">AgentID</span>
              <span class="cc-val">{{ config.agentId }}</span>
            </div>
            <div class="cc-info-item">
              <span class="cc-label">授权时间</span>
              <span class="cc-val">{{ formatDate(config.createdAt) }}</span>
            </div>
          </div>

          <div class="cc-metrics">
            <div class="cc-metric">
              <span class="cm-num">{{ config.customerCount || 0 }}</span>
              <span class="cm-label">客户</span>
            </div>
            <div class="cc-metric">
              <span class="cm-num">{{ config.bindingCount || 0 }}</span>
              <span class="cm-label">绑定成员</span>
            </div>
            <div class="cc-metric">
              <span class="cm-num vas" :class="{ on: config.vasChatArchive }">
                {{ config.vasChatArchive ? '已开通' : '未开通' }}
              </span>
              <span class="cm-label">会话存档</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- 会话存档授权状态 -->
    <div class="section-title">💬 会话存档服务</div>
    <div class="archive-card" :class="{ active: archiveSettings && archiveSettings.status === 'active' }">
      <div class="ac-header">
        <div class="ac-left">
          <span class="ac-icon">{{ archiveSettings && archiveSettings.status === 'active' ? '🟢' : '⚪' }}</span>
          <div>
            <strong>会话存档增值服务</strong>
            <p v-if="archiveSettings && archiveSettings.status === 'active'">
              {{ archiveSettings.maxUsers }}人席位 · 已用{{ archiveSettings.usedUsers }}人 · {{ formatDate(archiveSettings.expireDate) }} 到期
            </p>
            <p v-else>未开通 · 可在「套餐与配额」标签页购买开通</p>
          </div>
        </div>
      </div>
      <div v-if="archiveSettings && archiveSettings.status === 'active'" class="ac-detail">
        <div class="acd-row">
          <span>席位用量</span>
          <div class="acd-bar-wrap">
            <div class="acd-bar">
              <div class="acd-bar-inner" :style="{ width: seatPercent + '%' }" :class="seatBarClass"></div>
            </div>
            <span class="acd-bar-text">{{ archiveSettings.usedUsers }}/{{ archiveSettings.maxUsers }}</span>
          </div>
        </div>
        <div class="acd-row">
          <span>查看范围</span>
          <span class="acd-val">{{ visibilityText(archiveSettings.visibility) }}</span>
        </div>
        <div class="acd-row">
          <span>存储方式</span>
          <span class="acd-val">{{ archiveSettings.storageType === 'oss' ? '☁️ OSS云存储' : '💾 本地存储' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getMemberToken } from '@/api/member'

const props = defineProps<{ wecomData: any }>()
defineEmits(['refresh'])

const configs = ref<any[]>([])
const archiveSettings = ref<any>(null)
const authLoading = ref(false)
const showPrivateGuide = ref(false)

const connectedCount = computed(() =>
  (props.wecomData?.configs || []).filter((c: any) => c.connectionStatus === 'connected').length
)
const hasActiveConfig = computed(() => connectedCount.value > 0)
const totalCustomers = computed(() =>
  configs.value.reduce((sum: number, c: any) => sum + (c.customerCount || 0), 0)
)
const totalBindings = computed(() =>
  configs.value.reduce((sum: number, c: any) => sum + (c.bindingCount || 0), 0)
)

const seatPercent = computed(() => {
  if (!archiveSettings.value || !archiveSettings.value.maxUsers) return 0
  return Math.min(100, Math.round(archiveSettings.value.usedUsers / archiveSettings.value.maxUsers * 100))
})
const seatBarClass = computed(() => {
  if (seatPercent.value >= 100) return 'full'
  if (seatPercent.value >= 90) return 'warn'
  return 'normal'
})

const privateSteps = [
  { title: '登录企微管理后台', desc: '访问 work.weixin.qq.com，使用管理员账号登录' },
  { title: '创建自建应用', desc: '进入「应用管理」→「自建」→ 创建应用，获取 AgentID 和 Secret' },
  { title: '获取企业ID', desc: '在「我的企业」页面查看 CorpID（企业ID）' },
  { title: '配置CRM系统', desc: '在CRM「企微管理 → 企微配置」中填写 CorpID、AgentID、Secret 并测试连接' },
  { title: '设置回调URL', desc: '在企微应用设置中配置回调URL，用于接收事件通知' }
]

const formatDate = (dateStr: string) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const visibilityText = (v: string) => {
  const map: Record<string, string> = { self: '仅查看自己', department: '查看本部门', all: '查看全部' }
  return map[v] || '查看全部'
}

const fetchAuthInfo = async () => {
  authLoading.value = true
  try {
    const token = getMemberToken()
    const res = await fetch('/api/v1/public/member/wecom/auth-info', {
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json.code === 0 && json.data) {
      configs.value = json.data.configs || []
      archiveSettings.value = json.data.archiveSettings
    }
  } catch (e) {
    console.error('[WecomAuth] Fetch auth info error:', e)
  } finally {
    authLoading.value = false
  }
}

onMounted(() => fetchAuthInfo())
</script>

<style scoped>
.wecom-auth { max-width: 100%; }

/* Hero 状态横幅 */
.auth-hero {
  display: flex; justify-content: space-between; align-items: center;
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 2px solid #e4e7ed; border-radius: 16px;
  padding: 28px 32px; margin-bottom: 24px; transition: all 0.3s;
}
.auth-hero.connected {
  background: linear-gradient(135deg, #e8f8ef 0%, #d4f0e0 100%);
  border-color: #07c160;
}
.hero-left { display: flex; align-items: center; gap: 18px; }
.hero-icon-wrap {
  width: 56px; height: 56px; border-radius: 16px;
  display: flex; align-items: center; justify-content: center;
  background: rgba(255,255,255,0.8); box-shadow: 0 2px 8px rgba(0,0,0,0.06);
}
.hero-icon { font-size: 28px; }
.hero-text h3 { margin: 0 0 4px; font-size: 19px; font-weight: 700; color: #1d2129; }
.hero-text p { margin: 0; font-size: 14px; color: #606266; }
.hero-stats { display: flex; gap: 28px; }
.hero-stat { text-align: center; }
.hs-num { display: block; font-size: 24px; font-weight: 700; color: #07c160; }
.hs-label { font-size: 12px; color: #909399; }

/* 扫码授权引导 */
.auth-guide-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 16px;
  padding: 28px 32px; margin-bottom: 20px;
}
.guide-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.guide-header h4 { margin: 0; font-size: 17px; font-weight: 600; color: #303133; }
.mode-tag { font-size: 11px; padding: 2px 10px; border-radius: 12px; font-weight: 600; }
.mode-tag.saas { background: #e6f7ef; color: #07c160; }
.guide-desc { font-size: 14px; color: #606266; line-height: 1.8; margin: 0 0 20px; }

.qr-auth-area { display: flex; gap: 28px; margin-bottom: 24px; }
.qr-placeholder { flex-shrink: 0; text-align: center; }
.qr-mock {
  width: 180px; height: 180px; background: #f8f9fa; border: 2px dashed #d0d5dd;
  border-radius: 16px; display: flex; flex-direction: column;
  align-items: center; justify-content: center; gap: 8px;
}
.qr-mock span { font-size: 40px; }
.qr-mock p { margin: 0; font-size: 13px; color: #909399; font-weight: 500; }
.qr-hint { font-size: 12px; color: #c0c4cc; margin-top: 8px; max-width: 180px; }

.qr-steps { flex: 1; display: flex; flex-direction: column; gap: 8px; }
.qs-item {
  display: flex; gap: 12px; align-items: flex-start;
  padding: 10px 14px; background: #f9fafb; border-radius: 10px;
  transition: background 0.2s;
}
.qs-item:hover { background: #f0faf4; }
.qs-num {
  width: 26px; height: 26px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 12px; background: #07c160; color: #fff; flex-shrink: 0;
}
.qs-item strong { font-size: 13px; color: #303133; display: block; margin-bottom: 1px; }
.qs-item p { margin: 0; font-size: 12px; color: #909399; line-height: 1.4; }

.advantage-row { display: flex; gap: 12px; }
.adv-item {
  flex: 1; display: flex; align-items: center; gap: 10px;
  padding: 14px 16px; background: linear-gradient(135deg, #f0faf4, #e8f8ef);
  border-radius: 12px; border: 1px solid #d4f0e0;
}
.adv-icon { font-size: 22px; flex-shrink: 0; }
.adv-item strong { font-size: 13px; color: #303133; display: block; margin-bottom: 1px; }
.adv-item p { margin: 0; font-size: 11px; color: #909399; }

/* 私有部署提示 */
.private-deploy-tip {
  background: #fafafa; border: 1px solid #ebeef5; border-radius: 12px;
  padding: 18px 24px; margin-bottom: 24px;
}
.tip-header { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.tip-icon { font-size: 18px; }
.tip-header strong { font-size: 14px; color: #303133; }
.private-deploy-tip > p { margin: 0; font-size: 13px; color: #909399; line-height: 1.7; }
.private-deploy-tip a { color: #409eff; cursor: pointer; text-decoration: none; }
.private-deploy-tip a:hover { text-decoration: underline; }

.private-guide { margin-top: 14px; padding-top: 14px; border-top: 1px solid #ebeef5; }
.pg-step {
  display: flex; gap: 10px; align-items: flex-start; padding: 8px 0;
}
.pg-num {
  width: 22px; height: 22px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; font-weight: 700; background: #909399; color: #fff; flex-shrink: 0;
}
.pg-step strong { font-size: 13px; color: #303133; display: block; margin-bottom: 1px; }
.pg-step p { margin: 0; font-size: 12px; color: #909399; }

/* 已授权配置列表 */
.section-title { font-size: 16px; font-weight: 600; color: #1d2129; margin: 24px 0 12px; }
.config-list { display: flex; flex-direction: column; gap: 12px; }
.config-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 14px; padding: 20px 24px;
  transition: box-shadow 0.2s;
}
.config-card:hover { box-shadow: 0 4px 16px rgba(0,0,0,0.05); }
.cc-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.cc-name { display: flex; align-items: center; gap: 10px; }
.cc-name strong { font-size: 16px; color: #303133; }
.auth-mode-tag { font-size: 11px; padding: 3px 10px; border-radius: 6px; font-weight: 500; }
.auth-mode-tag.self_built { background: #ecf5ff; color: #409eff; }
.auth-mode-tag.third_party { background: #e6f7ef; color: #07c160; }
.cc-status { font-size: 13px; font-weight: 600; }
.cc-status.connected { color: #07c160; }
.cc-status.disconnected { color: #c0c4cc; }

.cc-info { display: flex; gap: 24px; margin-bottom: 14px; flex-wrap: wrap; }
.cc-info-item { }
.cc-label { display: block; font-size: 11px; color: #c0c4cc; margin-bottom: 2px; }
.cc-val { font-size: 13px; color: #606266; font-weight: 500; font-family: 'SF Mono', monospace; }

.cc-metrics { display: flex; gap: 0; border-top: 1px solid #f0f2f5; padding-top: 14px; }
.cc-metric { text-align: center; flex: 1; border-right: 1px solid #f0f2f5; }
.cc-metric:last-child { border-right: none; }
.cm-num { display: block; font-size: 18px; font-weight: 700; color: #303133; }
.cm-num.vas { font-size: 13px; }
.cm-num.vas.on { color: #07c160; }
.cm-label { font-size: 12px; color: #909399; margin-top: 2px; }

/* 会话存档卡片 */
.archive-card {
  background: #fff; border: 1px solid #e4e7ed; border-radius: 14px;
  padding: 20px 24px; transition: all 0.2s;
}
.archive-card.active { border-color: #b7eb8f; background: #fcfff5; }
.ac-header { display: flex; justify-content: space-between; align-items: center; }
.ac-left { display: flex; align-items: center; gap: 12px; }
.ac-icon { font-size: 22px; }
.ac-left strong { font-size: 15px; color: #303133; display: block; margin-bottom: 2px; }
.ac-left p { margin: 0; font-size: 13px; color: #909399; }

.ac-detail { margin-top: 16px; padding-top: 16px; border-top: 1px solid #f0f2f5; }
.acd-row {
  display: flex; justify-content: space-between; align-items: center;
  padding: 6px 0; font-size: 13px;
}
.acd-row > span:first-child { color: #909399; }
.acd-val { color: #303133; font-weight: 500; }
.acd-bar-wrap { display: flex; align-items: center; gap: 10px; }
.acd-bar { width: 120px; height: 6px; background: #e4e7ed; border-radius: 3px; overflow: hidden; }
.acd-bar-inner { height: 100%; border-radius: 3px; transition: width 0.5s; }
.acd-bar-inner.normal { background: #07c160; }
.acd-bar-inner.warn { background: #e6a23c; }
.acd-bar-inner.full { background: #f56c6c; }
.acd-bar-text { font-size: 12px; font-weight: 600; color: #303133; }

@media (max-width: 768px) {
  .auth-hero { flex-direction: column; gap: 16px; text-align: center; padding: 20px; }
  .hero-left { flex-direction: column; }
  .qr-auth-area { flex-direction: column; }
  .advantage-row { flex-direction: column; }
  .cc-info { flex-direction: column; gap: 8px; }
}
</style>

