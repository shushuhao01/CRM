<template>
  <div class="api-diagnostic">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在基础配置中添加企微配置后再进行API诊断。
    </el-alert>

    <template v-else>
      <div class="diag-actions">
        <el-button type="primary" @click="runAll" :loading="runningAll">
          <el-icon><Refresh /></el-icon> 一键诊断全部
        </el-button>
        <el-tag v-if="overallStatus" :type="overallType" size="large">
          {{ overallStatus }}
        </el-tag>
        <span style="font-size: 12px; color: #9CA3AF; margin-left: auto">
          诊断通过调用企微API验证各项配置是否正常
        </span>
      </div>

      <el-table :data="items" stripe border v-loading="runningAll">
        <el-table-column label="检测项" min-width="180">
          <template #default="{ row }">
            <div class="diag-item-name">
              <span class="diag-icon">{{ row.icon }}</span>
              <div>
                <span style="font-weight: 600">{{ row.name }}</span>
                <div style="font-size: 11px; color: #9CA3AF">{{ row.apiPath }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="diagStatusType(row.status)" size="small">
              {{ diagStatusLabel(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="详情" min-width="220">
          <template #default="{ row }">
            <span style="font-size: 13px; color: #6B7280">{{ row.detail }}</span>
          </template>
        </el-table-column>
        <el-table-column label="延迟" width="80" align="center">
          <template #default="{ row }">
            <span v-if="row.latency" :style="{ color: row.latency > 500 ? '#EF4444' : row.latency > 200 ? '#F59E0B' : '#10B981', fontWeight: '600' }">
              {{ row.latency }}ms
            </span>
            <span v-else style="color: #C0C4CC">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" align="center">
          <template #default="{ row }">
            <el-button v-if="row.status === 'none'" type="warning" link size="small" @click="goConfigSecret(row)">
              去配置
            </el-button>
            <el-button v-else type="primary" link size="small" @click="testSingle(row)" :loading="row.testing">
              重新检测
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-divider />

      <div class="diag-tips">
        <h4>💡 诊断说明</h4>
        <ul>
          <li><strong>获取AccessToken</strong>：验证CorpID和Secret是否正确，是所有API调用的前提</li>
          <li><strong>通讯录API</strong>：需配置「通讯录Secret」，用于同步部门和成员信息</li>
          <li><strong>外部联系人API</strong>：需配置「客户联系Secret」或在第三方授权中授权</li>
          <li><strong>会话存档API</strong>：需企业开通会话存档并配置Secret和RSA私钥</li>
          <li><strong>回调接收</strong>：需在企微后台配置回调URL、Token和EncodingAESKey</li>
          <li><strong>JS-SDK</strong>：验证JS-SDK签名，用于侧边栏和H5页面集成</li>
        </ul>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ configId?: number }>()

const runningAll = ref(false)

interface DiagItem {
  id: string; name: string; icon: string; apiPath: string
  status: string; detail: string; latency: number | null; testing: boolean
}

const items = ref<DiagItem[]>([
  { id: 'token', name: '获取AccessToken', icon: '🔑', apiPath: '/cgi-bin/gettoken', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'address', name: '通讯录API', icon: '📋', apiPath: '/cgi-bin/department/list', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'external', name: '外部联系人API', icon: '👥', apiPath: '/cgi-bin/externalcontact/list', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'group', name: '客户群API', icon: '💬', apiPath: '/cgi-bin/externalcontact/groupchat/list', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'link', name: '获客助手API', icon: '🎯', apiPath: '/cgi-bin/externalcontact/customer_acquisition/list_link', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'archive', name: '会话存档API', icon: '📝', apiPath: '/cgi-bin/msgaudit/get_permit_user_list', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'payment', name: '对外收款API', icon: '💰', apiPath: '/cgi-bin/externalpay/get_bill_list', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'callback', name: '回调接收', icon: '🔔', apiPath: '/api/v1/wecom/callback', status: 'pending', detail: '未检测', latency: null, testing: false },
  { id: 'jssdk', name: 'JS-SDK签名', icon: '✅', apiPath: '/cgi-bin/get_jsapi_ticket', status: 'pending', detail: '未检测', latency: null, testing: false },
])

const overallStatus = computed(() => {
  const total = items.value.length
  const ok = items.value.filter(i => i.status === 'ok').length
  const none = items.value.filter(i => i.status === 'none').length
  const fail = items.value.filter(i => i.status === 'fail').length
  const pending = items.value.filter(i => i.status === 'pending').length
  if (pending === total) return ''
  if (fail > 0) return `${ok}/${total}正常 ${fail}项异常`
  if (none > 0) return `${ok}/${total}正常 ${none}项未配置`
  return `全部通过 ${ok}/${total}`
})

const overallType = computed(() => {
  if (items.value.some(i => i.status === 'fail')) return 'danger' as const
  if (items.value.some(i => i.status === 'none')) return 'warning' as const
  if (items.value.every(i => i.status === 'pending')) return 'info' as const
  return 'success' as const
})

const diagStatusType = (s: string) => ({ ok: 'success', fail: 'danger', none: 'info', pending: 'info' }[s] || 'info') as any
const diagStatusLabel = (s: string) => ({ ok: '正常', fail: '异常', none: '未配置', pending: '待检测' }[s] || '未知')

const runDiagnostic = async (item: DiagItem) => {
  item.testing = true
  const start = Date.now()
  try {
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}/diagnose/${item.id}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    item.latency = Date.now() - start
    if (json?.success) {
      item.status = json.data?.status || 'ok'
      item.detail = decodeDetail(json.data?.detail || '检测通过')
    } else {
      item.status = json.data?.status || 'fail'
      item.detail = decodeDetail(json.message || json.data?.detail || '检测失败')
    }
  } catch (e: any) {
    item.latency = Date.now() - start
    item.status = 'fail'
    item.detail = parseErrorMessage(e.message || '网络请求失败')
  }
  item.testing = false
}

// 解码可能的编码文本，确保中文正确显示
const decodeDetail = (text: string): string => {
  if (!text) return '未知'
  try {
    // 处理可能的 Unicode 转义
    if (text.includes('\\u')) {
      text = text.replace(/\\u[\dA-Fa-f]{4}/g, (match) => String.fromCharCode(parseInt(match.replace('\\u', ''), 16)))
    }
    // 处理可能的 URI 编码
    if (text.includes('%')) {
      try { text = decodeURIComponent(text) } catch { /* ignore */ }
    }
  } catch { /* return as-is */ }
  return text
}

// 将企微错误码翻译为可读中文
const wecomErrorMap: Record<number, string> = {
  40001: 'Secret无效或已过期，请重新配置',
  40013: 'CorpID无效，请检查企业ID是否正确',
  40014: 'AccessToken无效，请重新获取',
  40056: '应用AgentID无效',
  41001: '缺少AccessToken参数',
  42001: 'AccessToken已过期，需重新获取',
  42009: 'AccessToken获取频率超限(2小时内5次)',
  44001: '多媒体文件为空',
  48002: 'API接口无权限，请检查应用授权范围',
  48004: 'API禁用，请联系管理员',
  60011: '无权限操作通讯录，请检查通讯录Secret权限范围',
  60020: '不允许访问该部门',
  84061: '企业已授权过该服务商，无需重复授权',
  84074: '没有外部联系人权限，请在企微后台授权',
  84084: '无会话存档权限，请先开通会话存档功能',
  301002: '应用不存在或已被停用',
}

const parseErrorMessage = (msg: string): string => {
  // 尝试提取企微错误码
  const codeMatch = msg.match(/errcode[:\s]*(\d+)/i) || msg.match(/error code[:\s]*(\d+)/i)
  if (codeMatch) {
    const code = parseInt(codeMatch[1])
    if (wecomErrorMap[code]) return `错误${code}: ${wecomErrorMap[code]}`
  }
  return decodeDetail(msg)
}

const runAll = async () => {
  runningAll.value = true
  for (const item of items.value) {
    await runDiagnostic(item)
  }
  runningAll.value = false
  ElMessage.success('诊断完成')
}

const testSingle = async (item: DiagItem) => {
  await runDiagnostic(item)
}

const goConfigSecret = (_item: DiagItem) => {
  ElMessage.info('请前往「Secret管理」Tab配置对应的Secret')
}

watch(() => props.configId, () => {
  items.value.forEach(i => { i.status = 'pending'; i.detail = '未检测'; i.latency = null })
})
onMounted(() => { /* auto-run on demand, not on mount */ })
</script>

<style scoped>
.diag-actions { display: flex; gap: 16px; align-items: center; margin-bottom: 20px; }
.diag-item-name { display: flex; align-items: center; gap: 10px; }
.diag-icon { font-size: 20px; }
.diag-tips { padding: 0 4px; }
.diag-tips h4 { margin: 0 0 12px; font-size: 14px; color: #1F2937; }
.diag-tips ul { margin: 0; padding-left: 20px; color: #4B5563; font-size: 13px; line-height: 2; }
</style>
