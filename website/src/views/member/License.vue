<template>
  <div class="license-page">
    <div class="page-card">
      <h2>🔐 授权信息</h2>
      <div v-if="loading" class="loading">加载中...</div>
      <template v-else-if="license">
        <div class="license-card" :class="{ expired: license.daysRemaining <= 0, warning: license.daysRemaining > 0 && license.daysRemaining <= 7 }">
          <div class="license-header">
            <span class="status-badge" :class="license.status">{{ getStatusLabel(license.status) }}</span>
            <span class="package-name">{{ license.packageName || '未知套餐' }}</span>
          </div>
          <div class="license-key">
            <label>授权码</label>
            <div class="key-display">
              <code>{{ showKey ? license.licenseKey : maskKey(license.licenseKey) }}</code>
              <button class="btn-icon" @click="showKey = !showKey" :title="showKey ? '隐藏' : '显示'">{{ showKey ? '🙈' : '👁️' }}</button>
              <button class="btn-icon" @click="copyKey" title="复制">📋</button>
            </div>
          </div>
          <div class="license-details">
            <div class="detail-row"><span class="label">租户编码</span><span class="value">{{ license.tenantCode }}</span></div>
            <div class="detail-row"><span class="label">套餐类型</span><span class="value">{{ license.packageType === 'saas' ? 'SaaS云端版' : '私有部署版' }}</span></div>
            <div class="detail-row"><span class="label">到期时间</span><span class="value" :class="{ danger: license.daysRemaining <= 0 }">{{ formatDate(license.expireDate) }}（{{ license.daysRemaining > 0 ? `剩余${license.daysRemaining}天` : '已过期' }}）</span></div>
          </div>
        </div>

        <div v-if="license.logs?.length || logTotal > 0" class="log-section">
          <h3>授权操作记录</h3>
          <div class="log-table">
            <div class="log-table-header">
              <span class="log-col-time">时间</span>
              <span class="log-col-action">操作</span>
              <span class="log-col-result">结果</span>
              <span class="log-col-msg">详情</span>
            </div>
            <div v-for="(log, i) in license.logs" :key="i" class="log-table-row">
              <span class="log-col-time">{{ formatDateTime(log.time) }}</span>
              <span class="log-col-action">{{ getActionLabel(log.action) }}</span>
              <span class="log-col-result" :class="log.result">{{ log.result === 'success' ? '✅ 成功' : '❌ 失败' }}</span>
              <span class="log-col-msg">{{ log.message }}</span>
            </div>
          </div>
          <div v-if="logTotal > logPageSize" class="log-pagination">
            <button :disabled="logPage <= 1" @click="loadLogs(logPage - 1)">上一页</button>
            <span>第 {{ logPage }} 页 / 共 {{ Math.ceil(logTotal / logPageSize) }} 页（{{ logTotal }} 条）</span>
            <button :disabled="logPage >= Math.ceil(logTotal / logPageSize)" @click="loadLogs(logPage + 1)">下一页</button>
          </div>
        </div>
      </template>
      <div v-else class="empty">暂无授权信息</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getMemberLicense } from '@/api/member'

const loading = ref(true)
const license = ref<any>(null)
const showKey = ref(false)
const logPage = ref(1)
const logPageSize = ref(10)
const logTotal = ref(0)

/** 操作类型中文映射 */
const actionLabelMap: Record<string, string> = {
  register: '注册',
  activate: '激活',
  verify: '验证',
  renew: '续费',
  upgrade: '升级',
  suspend: '暂停',
  resume: '恢复',
  generate: '生成授权码',
  login: '登录',
  expire: '过期'
}

const getActionLabel = (action: string): string => actionLabelMap[action] || action

/** 授权状态中文映射 */
const statusLabelMap: Record<string, string> = {
  active: '已激活',
  pending: '待激活',
  paid: '已付款待激活',
  expired: '已过期',
  suspended: '已暂停'
}
const getStatusLabel = (status: string): string => statusLabelMap[status] || status

onMounted(async () => {
  await loadLogs(1)
  loading.value = false
})

const loadLogs = async (page: number) => {
  logPage.value = page
  const data = await getMemberLicense(page, logPageSize.value)
  if (data) {
    license.value = data
    logTotal.value = data.logTotal || 0
  }
}

const formatDate = (d: string) => d ? new Date(d).toLocaleDateString('zh-CN') : '-'
const formatDateTime = (d: string) => {
  if (!d) return '-'
  const date = new Date(d)
  return `${date.toLocaleDateString('zh-CN')} ${date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}`
}
const maskKey = (key: string) => key ? key.substring(0, 10) + '****' + key.substring(key.length - 4) : ''
const copyKey = () => { if (license.value?.licenseKey) { navigator.clipboard.writeText(license.value.licenseKey); alert('已复制') } }
</script>

<style lang="scss" scoped>
.page-card { background: white; border-radius: 12px; padding: 28px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); }
.page-card h2 { margin: 0 0 24px; font-size: 18px; color: #1e293b; }
.loading, .empty { text-align: center; padding: 40px; color: #94a3b8; }
.license-card { border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 24px; margin-bottom: 24px; &.expired { border-color: #fecaca; background: #fff5f5; } &.warning { border-color: #fed7aa; background: #fffbeb; } }
.license-header { display: flex; align-items: center; gap: 12px; margin-bottom: 20px; }
.status-badge { padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600; &.active { background: #dcfce7; color: #16a34a; } &.pending { background: #fef3c7; color: #d97706; } &.paid { background: #dbeafe; color: #2563eb; } &.expired { background: #fee2e2; color: #dc2626; } }
.package-name { font-size: 16px; font-weight: 600; color: #1e293b; }
.license-key { margin-bottom: 20px; label { display: block; font-size: 12px; color: #94a3b8; margin-bottom: 6px; } }
.key-display { display: flex; align-items: center; gap: 8px; code { flex: 1; font-family: monospace; font-size: 15px; color: #334155; background: #f8fafc; padding: 10px 14px; border-radius: 8px; letter-spacing: 1px; } }
.btn-icon { border: none; background: none; cursor: pointer; font-size: 16px; padding: 4px; }
.license-details { display: grid; gap: 10px; }
.detail-row { display: flex; justify-content: space-between; font-size: 13px; .label { color: #64748b; } .value { color: #1e293b; font-weight: 500; &.danger { color: #dc2626; } } }
.log-section { h3 { font-size: 14px; color: #64748b; margin: 0 0 12px; } }
.log-table-header, .log-table-row { display: grid; grid-template-columns: 120px 80px 80px 1fr; gap: 8px; padding: 8px 0; font-size: 12px; color: #475569; align-items: center; }
.log-table-header { font-weight: 600; color: #64748b; border-bottom: 2px solid #f1f5f9; }
.log-table-row { border-bottom: 1px solid #f8fafc; }
.log-col-time { color: #94a3b8; }
.log-col-action { font-weight: 500; color: #334155; }
.log-col-result { &.success { color: #16a34a; } &.failed { color: #dc2626; } }
.log-col-msg { color: #64748b; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.log-pagination {
  display: flex; align-items: center; justify-content: center; gap: 12px; margin-top: 16px; font-size: 12px; color: #64748b;
  button { padding: 4px 12px; border: 1px solid #e2e8f0; border-radius: 6px; background: white; cursor: pointer; font-size: 12px; &:disabled { opacity: 0.4; cursor: not-allowed; } &:hover:not(:disabled) { background: #f8fafc; color: #6366f1; border-color: #c7d2fe; } }
}
</style>

