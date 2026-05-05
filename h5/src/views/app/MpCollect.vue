<template>
  <div class="mp-collect-page">
    <!-- 顶部引导区 -->
    <div class="guide-section">
      <div class="guide-icon">📋</div>
      <div class="guide-title">客户资料收集</div>
      <div class="guide-desc">
        点击下方按钮，将小程序卡片发送给客户<br/>客户填写后资料自动同步到CRM
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-row">
      <div class="stat-card">
        <div class="stat-val" style="color:#1677ff">{{ stats.filled }}</div>
        <div class="stat-label">已收集</div>
      </div>
      <div class="stat-card">
        <div class="stat-val" style="color:#52c41a">{{ stats.filled }}</div>
        <div class="stat-label">已同步CRM</div>
      </div>
    </div>

    <!-- 发送卡片按钮 -->
    <div class="action-section">
      <button class="send-btn" @click="handleSendCard" :disabled="sending">
        {{ sending ? '发送中...' : '📤 发送资料填写卡片' }}
      </button>
      <div class="send-tip">点击后将向当前聊天对象发送小程序卡片，客户点击即可填写资料</div>
    </div>

    <!-- 收集记录 -->
    <div class="records-section">
      <div class="section-header">
        <div class="section-title">收集记录</div>
        <div class="refresh-btn" @click="handleRefresh" :class="{ spinning: refreshing }">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
        </div>
      </div>

      <div v-if="recordsLoading && records.length === 0" style="text-align:center;padding:20px 0;color:#86909c;font-size:13px">
        加载中...
      </div>

      <div v-else-if="records.length > 0" class="record-list">
        <div v-for="(record, index) in records" :key="record.id" class="record-card">
          <div class="record-header" @click="toggleRecord(index)">
            <div class="record-brief">
              <span class="record-name">{{ record.name }}</span>
              <span class="record-phone">{{ record.phone || '未填写' }}</span>
            </div>
            <div class="record-meta">
              <span class="record-time">{{ formatTime(record.createdAt) }}</span>
              <span class="record-arrow" :class="{ expanded: expandedIds.includes(record.id) }">▶</span>
            </div>
          </div>
          <div v-if="expandedIds.includes(record.id)" class="record-detail">
            <div class="detail-row" v-if="record.gender">
              <span class="detail-label">性别</span>
              <span class="detail-value">{{ record.gender }}</span>
            </div>
            <div class="detail-row" v-if="record.age">
              <span class="detail-label">年龄</span>
              <span class="detail-value">{{ record.age }}</span>
            </div>
            <div class="detail-row" v-if="record.email">
              <span class="detail-label">邮箱</span>
              <span class="detail-value">{{ record.email }}</span>
            </div>
            <div class="detail-row" v-if="record.wechat">
              <span class="detail-label">微信</span>
              <span class="detail-value">{{ record.wechat }}</span>
            </div>
            <div class="detail-row" v-if="record.province">
              <span class="detail-label">地址</span>
              <span class="detail-value">{{ record.province }}{{ record.city }}{{ record.district }}{{ record.street ? ' ' + record.street : '' }}</span>
            </div>
            <div class="detail-row" v-if="record.detailAddress">
              <span class="detail-label">详细</span>
              <span class="detail-value">{{ record.detailAddress }}</span>
            </div>
            <div class="detail-row" v-if="record.birthday">
              <span class="detail-label">生日</span>
              <span class="detail-value">{{ record.birthday }}</span>
            </div>
            <div class="detail-row" v-if="record.remark">
              <span class="detail-label">备注</span>
              <span class="detail-value">{{ record.remark }}</span>
            </div>
          </div>
        </div>

        <!-- 分页加载 -->
        <div v-if="hasMore" class="load-more" @click="loadMore">
          {{ loadingMore ? '加载中...' : '加载更多' }}
        </div>
        <div v-else-if="records.length > 0" class="no-more">
          已显示全部 {{ recordsTotal }} 条记录
        </div>
      </div>

      <div v-else style="text-align:center;padding:20px 0;color:#c0c4cc;font-size:13px">
        暂无收集记录
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import api from '@/api/index'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()
const sending = ref(false)
const refreshing = ref(false)
const recordsLoading = ref(false)
const loadingMore = ref(false)

const stats = reactive({ filled: 0 })
const records = ref<any[]>([])
const recordsTotal = ref(0)
const currentPage = ref(1)
const pageSize = 3
const expandedIds = ref<string[]>([])

const hasMore = computed(() => records.value.length < recordsTotal.value)

const loadStats = async () => {
  try {
    const res: any = await api.get('/app/mp-collect-stats')
    const data = res?.data?.data || res?.data || {}
    stats.filled = data.filled || 0
  } catch { /* ignore */ }
}

const loadRecords = async (page = 1, append = false) => {
  if (!append) recordsLoading.value = true
  else loadingMore.value = true
  try {
    const res: any = await api.get('/app/mp-collect-records', {
      params: { page, pageSize }
    })
    const data = res?.data?.data || res?.data || {}
    const list = data.list || []
    if (append) {
      records.value = [...records.value, ...list]
    } else {
      records.value = list
    }
    recordsTotal.value = data.total || 0
    currentPage.value = page
  } catch { /* ignore */ }
  recordsLoading.value = false
  loadingMore.value = false
}

const loadMore = () => {
  if (loadingMore.value || !hasMore.value) return
  loadRecords(currentPage.value + 1, true)
}

const toggleRecord = (index: number) => {
  const id = records.value[index]?.id
  if (!id) return
  const idx = expandedIds.value.indexOf(id)
  if (idx >= 0) {
    expandedIds.value.splice(idx, 1)
  } else {
    expandedIds.value.push(id)
  }
}

const handleRefresh = async () => {
  if (refreshing.value) return
  refreshing.value = true
  await Promise.all([loadStats(), loadRecords(1)])
  refreshing.value = false
}

const formatTime = (t: string) => {
  if (!t) return '-'
  const d = new Date(t)
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const hh = String(d.getHours()).padStart(2, '0')
  const mi = String(d.getMinutes()).padStart(2, '0')
  return `${mm}-${dd} ${hh}:${mi}`
}

const handleSendCard = async () => {
  if (sending.value) return
  sending.value = true

  try {
    const tenantId = authStore.user?.tenantId || ''
    const memberId = authStore.user?.id || ''
    const ts = String(Math.floor(Date.now() / 1000))

    const res: any = await api.post('/app/mp-generate-card', { tenantId, memberId, ts })
    const cardData = res?.data?.data || res?.data || {}
    const { sign, appId, cardTitle } = cardData

    const path = `/pages/index/index?tenantId=${tenantId}&memberId=${memberId}&ts=${ts}&sign=${sign}`

    if (typeof (window as any).wx !== 'undefined' && (window as any).wx.invoke) {
      (window as any).wx.invoke('sendChatMessage', {
        msgtype: 'miniprogram',
        miniprogram: {
          appid: appId,
          title: cardTitle || '请填写您的个人资料',
          imgUrl: cardData.cardCoverUrl || '',
          page: path
        }
      }, (result: any) => {
        if (result.err_msg === 'sendChatMessage:ok') {
          api.post('/app/mp-log-send', { tenantId, memberId, ts }).catch(() => {})
        }
      })
    } else {
      const link = `小程序路径: ${path}`
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(link)
      }
      alert('已复制小程序路径（非企微环境下无法直接发送卡片）')
    }
  } catch (e: any) {
    alert(e?.response?.data?.message || '发送失败')
  } finally {
    sending.value = false
  }
}

onMounted(async () => {
  await Promise.all([loadStats(), loadRecords(1)])
})
</script>

<style scoped>
.mp-collect-page {
  padding: 16px;
  background: #f5f7fa;
  min-height: 100vh;
}

.guide-section {
  background: linear-gradient(135deg, #f0f5ff 0%, #e8f4f8 100%);
  border: 1px solid #d6e4ff;
  border-radius: 12px;
  padding: 24px 16px;
  margin-bottom: 12px;
  text-align: center;
}

.guide-icon { font-size: 40px; margin-bottom: 8px; }
.guide-title { font-size: 17px; font-weight: 700; color: #1d2129; margin-bottom: 6px; }
.guide-desc { font-size: 13px; color: #86909c; line-height: 1.6; }

.stats-row { display: flex; gap: 12px; margin-bottom: 12px; }
.stat-card {
  flex: 1; background: #fff; border-radius: 12px;
  padding: 14px; text-align: center;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}
.stat-val { font-size: 24px; font-weight: 700; }
.stat-label { font-size: 12px; color: #86909c; margin-top: 4px; }

.action-section { margin-bottom: 16px; }
.send-btn {
  width: 100%; height: 48px;
  background: linear-gradient(135deg, #409eff, #1677ff);
  color: #fff; border: none; border-radius: 12px;
  font-size: 16px; font-weight: 600; cursor: pointer;
  transition: all 0.2s;
}
.send-btn:active { transform: scale(0.98); opacity: 0.9; }
.send-btn:disabled { opacity: 0.5; cursor: not-allowed; }
.send-tip { text-align: center; font-size: 12px; color: #86909c; margin-top: 8px; }

.records-section {
  background: #fff; border-radius: 12px; padding: 16px;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex; justify-content: space-between; align-items: center;
  margin-bottom: 12px;
}
.section-title { font-size: 14px; font-weight: 600; color: #1d2129; }

.refresh-btn {
  width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;
  border-radius: 50%; color: #86909c; cursor: pointer;
  transition: all 0.2s; background: #f5f7fa;
}
.refresh-btn:active { background: #e8eaed; }
.refresh-btn.spinning { animation: spin-refresh 0.8s linear; }
@keyframes spin-refresh { from { transform: rotate(0); } to { transform: rotate(360deg); } }

.record-card {
  border: 1px solid #f0f0f0; border-radius: 8px;
  margin-bottom: 8px; overflow: hidden;
}
.record-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 10px 12px; cursor: pointer; background: #fafbfc;
}
.record-header:active { background: #f0f2f5; }
.record-brief { display: flex; align-items: center; gap: 8px; }
.record-name { font-size: 14px; font-weight: 600; color: #1d2129; }
.record-phone { font-size: 12px; color: #86909c; }
.record-meta { display: flex; align-items: center; gap: 6px; }
.record-time { font-size: 11px; color: #c0c4cc; }
.record-arrow {
  font-size: 10px; color: #c0c4cc;
  transition: transform 0.2s; display: inline-block;
}
.record-arrow.expanded { transform: rotate(90deg); }

.record-detail {
  padding: 8px 12px 10px; border-top: 1px solid #f0f0f0;
  background: #fff;
}
.detail-row {
  display: flex; font-size: 12px; padding: 3px 0;
}
.detail-label {
  width: 40px; flex-shrink: 0; color: #86909c; text-align: right;
  margin-right: 8px;
}
.detail-value { color: #4e5969; word-break: break-all; }

.load-more {
  text-align: center; padding: 12px 0; font-size: 13px;
  color: #409eff; cursor: pointer;
}
.load-more:active { opacity: 0.7; }
.no-more {
  text-align: center; padding: 10px 0; font-size: 12px; color: #c0c4cc;
}
</style>
