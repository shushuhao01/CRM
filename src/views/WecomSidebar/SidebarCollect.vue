<template>
  <div class="mpc-wrapper">
    <!-- 顶部引导卡片 -->
    <div class="mpc-hero" style="position:relative">
      <!-- 切换发送方式 -->
      <span class="mpc-mode-btn" @click="toggleSendMode" :title="sendMode === 'miniprogram' ? '当前：小程序卡片（点击切换）' : '当前：H5链接卡片（点击切换）'">
        <span class="mpc-mode-icon">{{ sendMode === 'miniprogram' ? '🟢' : '🔵' }}</span>
        <span class="mpc-mode-text">{{ sendMode === 'miniprogram' ? '小程序' : 'H5卡片' }}</span>
      </span>
      <span class="mpc-regen-btn" @click="generateCard" title="重新生成卡片">
        <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
      </span>
      <div class="mpc-hero-icon">
        <svg viewBox="0 0 48 48" width="38" height="38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M15.6 28.8c-4.97 0-9-3.58-9-8s4.03-8 9-8c4.97 0 9 3.58 9 8 0 1.36-.4 2.64-1.1 3.76l.5 3.64-3.36-1.6c-1.56.76-3.28 1.2-5.04 1.2z" fill="#57BE6A"/>
          <path d="M33.6 36c-1.76 0-3.48-.44-5.04-1.2l-3.36 1.6.5-3.64c-.7-1.12-1.1-2.4-1.1-3.76 0-4.42 4.03-8 9-8s9 3.58 9 8-4.03 8-9 8z" fill="#57BE6A" opacity=".7"/>
          <circle cx="12" cy="21.2" r="1.2" fill="#fff"/>
          <circle cx="15.6" cy="21.2" r="1.2" fill="#fff"/>
          <circle cx="19.2" cy="21.2" r="1.2" fill="#fff"/>
        </svg>
      </div>
      <div class="mpc-hero-title">客户资料收集</div>
      <div class="mpc-hero-desc">{{ cardReady ? '✅ 卡片已生成，可直接发送' : '点击下方按钮，将小程序卡片发送给客户' }}<br/>客户填写后资料自动同步到CRM</div>
    </div>

    <!-- 数据统计 -->
    <div class="mpc-stats">
      <div class="mpc-stat-item">
        <div class="mpc-stat-num" style="color:#1677ff">{{ mpStats.filled }}</div>
        <div class="mpc-stat-label">已收集</div>
      </div>
      <div class="mpc-stat-divider"></div>
      <div class="mpc-stat-item">
        <div class="mpc-stat-num" style="color:#52c41a">{{ mpStats.filled }}</div>
        <div class="mpc-stat-label">已同步CRM</div>
      </div>
    </div>

    <!-- 发送卡片按钮 -->
    <div class="mpc-action">
      <button class="mpc-send-btn" @click="handleSend" :disabled="sending">
        <svg v-if="!sending" viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/></svg>
        {{ sending ? '发送中...' : '发送资料填写卡片' }}
      </button>
      <div class="mpc-send-tip">点击后将向当前聊天对象发送小程序卡片</div>
    </div>

    <!-- 收集记录 -->
    <div class="mpc-records">
      <div class="mpc-records-title" style="display:flex;justify-content:space-between;align-items:center">
        <span>收集记录 <span v-if="recordsTotal > 0" style="font-size:10px;color:#909399">({{ recordsTotal }})</span></span>
        <span class="mpc-refresh-btn" @click="refreshRecords" :style="{ opacity: recordsLoading ? 0.5 : 1 }" title="刷新">
          <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="#909399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2v6h-6"/><path d="M3 12a9 9 0 0 1 15-6.7L21 8"/><path d="M3 22v-6h6"/><path d="M21 12a9 9 0 0 1-15 6.7L3 16"/></svg>
        </span>
      </div>
      <div v-if="recordsLoading && !records.length" style="text-align:center;padding:12px 0;font-size:11px;color:#909399">加载中...</div>
      <template v-else-if="records.length">
        <div v-for="rec in records" :key="rec.id" class="mpc-record-row" @click="toggleExpand(rec.id)" style="cursor:pointer">
          <div class="mpc-record-avatar">{{ (rec.name || '?')[0] }}</div>
          <div class="mpc-record-info">
            <div class="mpc-record-name">{{ rec.name }}</div>
            <div class="mpc-record-phone">{{ rec.phone || '未填手机号' }}</div>
          </div>
          <div class="mpc-record-time">{{ rec.time }}</div>
        </div>
        <!-- 展开详情 -->
        <div v-for="rec in records" :key="'detail-'+rec.id" v-show="expandedId === rec.id" class="mpc-record-detail">
          <div v-if="rec.gender" class="mpc-detail-row"><span class="mpc-detail-label">性别</span><span>{{ rec.gender }}</span></div>
          <div v-if="rec.address" class="mpc-detail-row"><span class="mpc-detail-label">地区</span><span>{{ rec.address }}</span></div>
        </div>
        <!-- 翻页 -->
        <div v-if="recordsTotal > pageSize" style="display:flex;justify-content:space-between;align-items:center;padding:4px 0 2px;font-size:10px;color:#909399">
          <span :style="{ opacity: page > 1 ? 1 : 0.3, cursor: page > 1 ? 'pointer' : 'default' }" @click="page > 1 && (page--, loadRecords())">‹ 上页</span>
          <span>{{ page }} / {{ totalPages }}</span>
          <span :style="{ opacity: hasMore ? 1 : 0.3, cursor: hasMore ? 'pointer' : 'default' }" @click="hasMore && (page++, loadRecords())">下页 ›</span>
        </div>
      </template>
      <div class="mpc-empty" v-else>
        <svg viewBox="0 0 48 48" width="28" height="28" fill="none"><rect x="8" y="6" width="32" height="36" rx="4" stroke="#d0d5dd" stroke-width="2"/><path d="M16 16h16M16 24h10" stroke="#d0d5dd" stroke-width="2" stroke-linecap="round"/></svg>
        <div>暂无收集记录</div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{
  sidebarToken: string
}>()

const sending = ref(false)
const mpStats = ref({ filled: 0 })
const records = ref<any[]>([])
const recordsTotal = ref(0)
const recordsLoading = ref(false)
const page = ref(1)
const pageSize = 5
const expandedId = ref<string | null>(null)
const cardReady = ref(false)
const preGeneratedPayload = ref<any>(null)
const fallbackPayload = ref<any>(null)

// 发送模式：miniprogram（优先小程序）或 news（H5卡片）
const sendMode = ref<'miniprogram' | 'news'>(
  (localStorage.getItem('wecom_collect_send_mode') as any) || 'miniprogram'
)

function toggleSendMode() {
  sendMode.value = sendMode.value === 'miniprogram' ? 'news' : 'miniprogram'
  localStorage.setItem('wecom_collect_send_mode', sendMode.value)
  // 持久化到后端
  saveSendModeToBackend(sendMode.value)
  // 重新生成对应类型的payload
  generateCard(false)
  ElMessage.success(sendMode.value === 'miniprogram' ? '已切换为小程序卡片' : '已切换为H5链接卡片')
}

async function saveSendModeToBackend(mode: string) {
  try {
    const { default: axios } = await import('axios')
    await axios.post(`${getBaseUrl()}/mp-send-mode`, { sendMode: mode }, { headers: getHeaders() }).catch(() => {})
  } catch { /* ignore */ }
}

async function loadSendModeFromBackend() {
  try {
    const { default: axios } = await import('axios')
    const res: any = await axios.get(`${getBaseUrl()}/mp-send-mode`, { headers: getHeaders() })
    const mode = res?.data?.data?.sendMode || res?.data?.sendMode
    if (mode === 'miniprogram' || mode === 'news') {
      sendMode.value = mode
      localStorage.setItem('wecom_collect_send_mode', mode)
    }
  } catch { /* ignore, use local */ }
}

const totalPages = computed(() => Math.ceil(recordsTotal.value / pageSize) || 1)
const hasMore = computed(() => page.value < totalPages.value)

const toggleExpand = (id: string) => {
  expandedId.value = expandedId.value === id ? null : id
}

const getBaseUrl = () => `${window.location.origin}/api/v1/wecom/h5/app`
const getHeaders = () => ({ Authorization: `Bearer ${props.sidebarToken}` })

const parseSidebarToken = () => {
  try {
    const base64Url = props.sidebarToken.split('.')[1]
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/')
    const jsonPayload = decodeURIComponent(
      atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    )
    const payload = JSON.parse(jsonPayload)
    return { tenantId: payload.tenantId || '', memberId: payload.userId || payload.id || '' }
  } catch { return { tenantId: '', memberId: '' } }
}

const loadStats = async () => {
  try {
    const { default: axios } = await import('axios')
    const res: any = await axios.get(`${getBaseUrl()}/mp-collect-stats`, { headers: getHeaders() })
    const d = res?.data?.data || res?.data || {}
    mpStats.value = { filled: d.filled || 0 }
  } catch { /* ignore */ }
}

const loadRecords = async () => {
  recordsLoading.value = true
  try {
    const { default: axios } = await import('axios')
    const res: any = await axios.get(`${getBaseUrl()}/mp-collect-records`, {
      params: { page: page.value, pageSize },
      headers: getHeaders()
    })
    const rd = res?.data?.data || res?.data || {}
    records.value = (rd.list || []).map((r: any) => ({
      id: r.id,
      name: r.name || '-',
      phone: r.phone || '',
      address: [r.province, r.city, r.district].filter(Boolean).join(' ') || '',
      gender: r.gender || '',
      time: r.createdAt ? new Date(r.createdAt).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : ''
    }))
    recordsTotal.value = rd.total || 0
  } catch { records.value = []; recordsTotal.value = 0 }
  recordsLoading.value = false
}

const refreshRecords = async () => {
  page.value = 1
  await loadStats()
  await loadRecords()
}

/** 预生成卡片（登录时自动调用，或手动刷新） */
const generateCard = async (showMsg = true) => {
  try {
    const { tenantId, memberId } = parseSidebarToken()
    const ts = Date.now().toString()
    const { default: axios } = await import('axios')
    const extUserId = localStorage.getItem('wecom_sidebar_last_external_id') || ''
    const defaultImgUrl = `${window.location.origin}/填写个人资料.png`
    const defaultTitle = '请填写您的个人资料'

    let data: any = {}
    try {
      const res: any = await axios.post(`${getBaseUrl()}/mp-generate-card`, { tenantId, memberId, ts }, { headers: getHeaders() })
      data = res?.data?.data || res?.data || {}
    } catch {
      // API可能不存在，使用预设配置
    }

    const imgUrl = data.imageUrl
      ? (data.imageUrl.startsWith('http') ? data.imageUrl : `${window.location.origin}${data.imageUrl}`)
      : defaultImgUrl
    const title = data.title || defaultTitle

    const mpAppId = data.appId || ''
    const mpPage = data.path || `/pages/form/form.html?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${data.sign || ''}&externalUserId=${extUserId}`
    const h5FormUrl = `${window.location.origin}/wecom-form.html?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${data.sign || ''}&externalUserId=${extUserId}&appId=${mpAppId}`

    // 根据用户选择的发送模式构建主payload
    const mpPayloadObj = mpAppId ? { msgtype: 'miniprogram', miniprogram: { appid: mpAppId, title, imgUrl, page: mpPage } } : null
    const newsPayloadObj = { msgtype: 'news', news: { link: h5FormUrl, title, desc: '点击填写您的基本资料，方便我们为您提供更好的服务', imgUrl } }

    if (sendMode.value === 'miniprogram' && mpPayloadObj) {
      preGeneratedPayload.value = mpPayloadObj
    } else {
      preGeneratedPayload.value = newsPayloadObj
    }
    // 降级payload：news类型（miniprogram发送失败时使用）
    fallbackPayload.value = {
      msgtype: 'news',
      news: { link: h5FormUrl, title, desc: '点击填写您的基本资料，方便我们为您提供更好的服务', imgUrl }
    }

    cardReady.value = true
    if (showMsg) ElMessage.success('卡片已重新生成')
  } catch (e: any) {
    console.warn('[Collect] 预生成卡片失败:', e?.message)
    // 降级：使用news类型发送H5中转页
    const { tenantId, memberId } = parseSidebarToken()
    const extUserId = localStorage.getItem('wecom_sidebar_last_external_id') || ''
    preGeneratedPayload.value = {
      msgtype: 'news',
      news: {
        link: `${window.location.origin}/wecom-form.html?tenantId=${tenantId}&memberId=${memberId}&externalUserId=${extUserId}`,
        title: '请填写您的个人资料',
        desc: '点击填写您的基本资料，方便我们为您提供更好的服务',
        imgUrl: `${window.location.origin}/填写个人资料.png`
      }
    }
    cardReady.value = true
    if (showMsg) ElMessage.info('使用H5链接模式（后端暂不可用）')
  }
}

/** 尝试通过SDK发送指定payload */
async function trySend(payload: any): Promise<'sent' | 'cancel' | 'failed'> {
  const ww = (window as any).ww
  const wx = (window as any).wx || (window as any).jWeixin

  // ww.sendChatMessage
  if (ww && typeof ww.sendChatMessage === 'function') {
    try {
      await ww.sendChatMessage(payload)
      return 'sent'
    } catch (e: any) {
      if (/cancel/i.test(e?.message || e?.errMsg || '')) return 'cancel'
      console.warn('[Collect] ww.sendChatMessage失败:', e?.message)
    }
  }
  // wx.invoke
  if (wx && typeof wx.invoke === 'function') {
    try {
      await new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => resolve(), 3000)
        wx.invoke('sendChatMessage', payload, (res: any) => {
          clearTimeout(timer)
          if (res?.err_msg?.indexOf('ok') > -1) resolve()
          else if (/cancel/i.test(res?.err_msg || '')) reject(new Error('cancel'))
          else reject(new Error(res?.err_msg || 'failed'))
        })
      })
      return 'sent'
    } catch (e: any) {
      if (/cancel/i.test(e?.message || '')) return 'cancel'
      console.warn('[Collect] wx.invoke失败:', e?.message)
    }
  }
  return 'failed'
}

/** 发送资料收集卡片（先miniprogram，失败降级news） */
const handleSend = async () => {
  if (sending.value) return
  sending.value = true
  try {
    if (!preGeneratedPayload.value) await generateCard(false)
    if (!preGeneratedPayload.value) { ElMessage.warning('卡片生成失败'); sending.value = false; return }

    // 第一步：尝试发送主payload（miniprogram或news）
    let result = await trySend(preGeneratedPayload.value)

    if (result === 'cancel') { ElMessage.info('已取消发送'); sending.value = false; return }

    // 第二步：如果主payload是miniprogram且失败了，降级为news
    if (result === 'failed' && preGeneratedPayload.value.msgtype === 'miniprogram' && fallbackPayload.value) {
      console.log('[Collect] miniprogram发送失败，降级为news卡片')
      result = await trySend(fallbackPayload.value)
      if (result === 'cancel') { ElMessage.info('已取消发送'); sending.value = false; return }
    }

    if (result === 'sent') {
      ElMessage.success('卡片已发送')
    } else {
      const ua = navigator.userAgent.toLowerCase()
      if (!ua.includes('wxwork') && !ua.includes('wechat')) {
        ElMessage.warning('当前非企微客户端环境，请在企业微信中打开')
      } else {
        ElMessage.warning('发送失败，请检查侧边栏JS-SDK配置')
      }
    }

    // 记录发送日志
    try {
      const { tenantId, memberId } = parseSidebarToken()
      const { default: axios } = await import('axios')
      await axios.post(`${getBaseUrl()}/mp-log-send`, { tenantId, memberId, ts: Date.now().toString() }, { headers: getHeaders() }).catch(() => {})
    } catch { /* ignore */ }

    await loadStats()
    await loadRecords()
  } catch (e: any) {
    console.error('[Collect] handleSend异常:', e)
    ElMessage.warning(e?.message || '发送失败')
  } finally {
    sending.value = false
  }
}


onMounted(() => {
  loadSendModeFromBackend()
  loadStats()
  loadRecords()
  generateCard(false)
})
</script>

<style scoped>
.mpc-wrapper { padding: 0; color: #303133; }
.mpc-mode-btn { position: absolute; top: 8px; left: 8px; display: flex; align-items: center; gap: 3px; padding: 3px 8px; border-radius: 12px; cursor: pointer; background: rgba(255,255,255,.85); font-size: 10px; color: #606266; transition: all .2s; box-shadow: 0 1px 3px rgba(0,0,0,.1); }
.mpc-mode-btn:hover { background: #fff; box-shadow: 0 2px 6px rgba(0,0,0,.15); }
.mpc-mode-icon { font-size: 10px; line-height: 1; }
.mpc-mode-text { font-weight: 500; }
.mpc-regen-btn { position: absolute; top: 8px; right: 8px; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; border-radius: 50%; cursor: pointer; transition: all 0.2s; }
.mpc-regen-btn:hover { background: rgba(0,0,0,0.05); transform: rotate(180deg); }
.mpc-hero { margin: 8px 10px; background: linear-gradient(135deg, #ecfdf5 0%, #f0fdf4 50%, #f0f9ff 100%); border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px 12px; text-align: center; }
.mpc-hero-icon { width: 48px; height: 48px; margin: 0 auto 8px; background: #fff; border-radius: 12px; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 8px rgba(87,190,106,0.15); }
.mpc-hero-title { font-size: 14px; font-weight: 700; color: #1d2129; margin-bottom: 4px; }
.mpc-hero-desc { font-size: 11px; color: #6b7280; line-height: 1.6; }
.mpc-stats { display: flex; align-items: center; margin: 8px 10px; background: #fff; border-radius: 10px; box-shadow: 0 1px 4px rgba(0,0,0,0.06); }
.mpc-stat-item { flex: 1; text-align: center; padding: 10px 0; }
.mpc-stat-num { font-size: 22px; font-weight: 700; line-height: 1.2; }
.mpc-stat-label { font-size: 10px; color: #9ca3af; margin-top: 2px; }
.mpc-stat-divider { width: 1px; height: 28px; background: #f0f0f0; flex-shrink: 0; }
.mpc-action { padding: 4px 10px 8px; }
.mpc-send-btn { width: 100%; height: 36px; border: none; border-radius: 8px; background: linear-gradient(135deg, #22c55e, #16a34a); color: #fff; font-size: 13px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 6px; transition: all 0.2s; box-shadow: 0 2px 8px rgba(34,197,94,0.3); }
.mpc-send-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(34,197,94,0.35); }
.mpc-send-btn:active { transform: translateY(0); }
.mpc-send-btn:disabled { opacity: 0.6; cursor: not-allowed; transform: none; box-shadow: none; }
.mpc-send-tip { text-align: center; font-size: 10px; color: #9ca3af; margin-top: 6px; }
.mpc-records { margin: 0 10px 8px; background: #fff; border-radius: 10px; padding: 10px 12px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.mpc-records-title { font-size: 11px; font-weight: 600; color: #6b7280; margin-bottom: 8px; }
.mpc-refresh-btn { cursor: pointer; display: inline-flex; align-items: center; }
.mpc-record-row { display: flex; align-items: center; gap: 8px; padding: 6px 0; border-bottom: 1px solid #f9fafb; }
.mpc-record-row:last-child { border-bottom: none; }
.mpc-record-avatar { width: 24px; height: 24px; border-radius: 50%; background: linear-gradient(135deg, #a7f3d0, #6ee7b7); color: #065f46; font-size: 11px; font-weight: 600; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mpc-record-info { flex: 1; min-width: 0; }
.mpc-record-name { font-size: 11px; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mpc-record-phone { font-size: 10px; color: #9ca3af; }
.mpc-record-time { font-size: 9px; color: #d1d5db; white-space: nowrap; flex-shrink: 0; }
.mpc-record-detail { padding: 4px 32px 8px; font-size: 11px; }
.mpc-detail-row { display: flex; gap: 8px; padding: 2px 0; }
.mpc-detail-label { color: #909399; min-width: 36px; }
.mpc-empty { text-align: center; padding: 20px 10px; color: #d1d5db; font-size: 11px; }
.mpc-empty svg { margin-bottom: 6px; }
</style>
