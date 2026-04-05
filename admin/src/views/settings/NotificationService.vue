<template>
  <div class="page-container">
    <div class="page-header">
      <div class="header-left">
        <h2>通知服务</h2>
        <p class="header-desc">配置管理员通知渠道和消息规则，实时掌握用户动态</p>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="service-tabs">
      <!-- ========== 通知渠道配置 ========== -->
      <el-tab-pane label="通知渠道" name="channels">
        <div class="channel-grid">
          <el-card v-for="ch in channels" :key="ch.channel_type" class="channel-card" shadow="hover">
            <div class="channel-header">
              <div class="channel-info">
                <div class="channel-icon" :class="ch.channel_type">
                  <el-icon v-if="ch.channel_type === 'system'" :size="24"><Bell /></el-icon>
                  <el-icon v-else-if="ch.channel_type === 'dingtalk'" :size="24"><ChatDotRound /></el-icon>
                  <el-icon v-else-if="ch.channel_type === 'wecom'" :size="24"><ChatLineSquare /></el-icon>
                  <el-icon v-else-if="ch.channel_type === 'wechat_mp'" :size="24"><Promotion /></el-icon>
                  <el-icon v-else-if="ch.channel_type === 'email'" :size="24"><Message /></el-icon>
                  <el-icon v-else-if="ch.channel_type === 'sms'" :size="24"><Phone /></el-icon>
                </div>
                <div>
                  <h3>{{ ch.name }}</h3>
                  <span class="channel-desc">{{ channelDescs[ch.channel_type] || '' }}</span>
                </div>
              </div>
              <el-switch v-model="ch.is_enabled" :active-value="1" :inactive-value="0" active-text="启用" inactive-text="禁用" />
            </div>

            <el-divider />

            <!-- 系统消息渠道 -->
            <div v-if="ch.channel_type === 'system'" class="channel-body">
              <el-alert type="info" :closable="false" show-icon>
                系统消息通知始终可用，通知会显示在管理后台右上角铃铛中
              </el-alert>
            </div>

            <!-- 钉钉 -->
            <el-form v-else-if="ch.channel_type === 'dingtalk'" :model="ch.config_data" label-width="100px" class="channel-form">
              <el-form-item label="Webhook">
                <el-input v-model="ch.config_data.webhook" placeholder="https://oapi.dingtalk.com/robot/send?access_token=xxx" />
              </el-form-item>
              <el-form-item label="加签密钥">
                <el-input v-model="ch.config_data.secret" placeholder="SEC开头的密钥（可选）" show-password />
              </el-form-item>
            </el-form>

            <!-- 企业微信 -->
            <el-form v-else-if="ch.channel_type === 'wecom'" :model="ch.config_data" label-width="100px" class="channel-form">
              <el-form-item label="Webhook">
                <el-input v-model="ch.config_data.webhook" placeholder="https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx" />
              </el-form-item>
            </el-form>

            <!-- 微信公众号 -->
            <el-form v-else-if="ch.channel_type === 'wechat_mp'" :model="ch.config_data" label-width="100px" class="channel-form">
              <el-form-item label="AppID">
                <el-input v-model="ch.config_data.app_id" placeholder="公众号AppID" />
              </el-form-item>
              <el-form-item label="AppSecret">
                <el-input v-model="ch.config_data.app_secret" placeholder="公众号AppSecret" show-password />
              </el-form-item>
              <el-form-item label="模板ID">
                <el-input v-model="ch.config_data.template_id" placeholder="模板消息ID" />
              </el-form-item>
              <el-form-item label="接收OpenID">
                <el-select v-model="ch.config_data.openids" multiple filterable allow-create placeholder="输入OpenID后回车" style="width:100%">
                </el-select>
                <div class="form-tip">关注公众号的管理员OpenID</div>
              </el-form-item>
            </el-form>

            <!-- 邮件 -->
            <el-form v-else-if="ch.channel_type === 'email'" :model="ch.config_data" label-width="100px" class="channel-form">
              <el-form-item label="SMTP服务器">
                <el-input v-model="ch.config_data.smtp_host" placeholder="如 smtp.163.com" />
              </el-form-item>
              <el-form-item label="端口">
                <el-input-number v-model="ch.config_data.smtp_port" :min="1" :max="65535" />
              </el-form-item>
              <el-form-item label="用户名">
                <el-input v-model="ch.config_data.username" placeholder="发件邮箱账号" />
              </el-form-item>
              <el-form-item label="密码/授权码">
                <el-input v-model="ch.config_data.password" type="password" show-password placeholder="邮箱密码或授权码" />
              </el-form-item>
              <el-form-item label="发件人名称">
                <el-input v-model="ch.config_data.from_name" placeholder="CRM管理后台" />
              </el-form-item>
              <el-form-item label="收件人">
                <el-select v-model="ch.config_data.to_emails" multiple filterable allow-create placeholder="输入邮箱后回车" style="width:100%">
                </el-select>
              </el-form-item>
            </el-form>

            <!-- 短信 -->
            <el-form v-else-if="ch.channel_type === 'sms'" :model="ch.config_data" label-width="100px" class="channel-form">
              <el-alert type="info" :closable="false" show-icon style="margin-bottom: 12px;">
                短信通知使用「基础配置 - 短信设置」中的阿里云短信配置发送，此处只需配置接收手机号
              </el-alert>
              <el-form-item label="接收手机号">
                <el-select v-model="ch.config_data.phone_numbers" multiple filterable allow-create placeholder="输入手机号后回车" style="width:100%">
                </el-select>
                <div class="form-tip">运营管理员手机号，支持多个</div>
              </el-form-item>
              <el-form-item label="短信模板CODE">
                <el-input v-model="ch.config_data.template_code" placeholder="阿里云短信模板CODE（可选，留空使用ADMIN_NOTIFICATION）" />
                <div class="form-tip">需在阿里云短信控制台申请管理员通知模板，模板参数：title、content</div>
              </el-form-item>
            </el-form>

            <div class="channel-footer" v-if="ch.channel_type !== 'system'">
              <el-button type="primary" size="small" @click="handleTestChannel(ch)" :loading="testingChannel === ch.channel_type">
                测试连接
              </el-button>
            </div>
          </el-card>
        </div>

        <div class="save-bar">
          <el-button type="primary" @click="handleSaveChannels" :loading="savingChannels">
            <el-icon><Check /></el-icon> 保存所有渠道配置
          </el-button>
        </div>
      </el-tab-pane>

      <!-- ========== 通知规则（现代化卡片布局）========== -->
      <el-tab-pane label="通知规则" name="rules">
        <div class="rules-top-bar">
          <p class="rules-desc">为每种事件选择通知推送渠道，开启后该事件将通过对应渠道发送通知</p>
          <el-button type="primary" @click="handleSaveRules" :loading="savingRules">
            <el-icon><Check /></el-icon> 保存规则
          </el-button>
        </div>

        <div v-if="enabledChannels.length === 0" style="margin-top: 16px;">
          <el-alert type="warning" :closable="false" show-icon title="暂无启用的通知渠道" description="请先在「通知渠道」页签中启用至少一个渠道" />
        </div>

        <div v-else class="rules-group-list">
          <div v-for="group in ruleGroups" :key="group.category" class="rule-group">
            <div class="rule-group-header">
              <span class="rule-group-dot" :style="{ background: categoryColors[group.category] || '#409eff' }"></span>
              <span class="rule-group-title">{{ group.category }}</span>
              <span class="rule-group-count">{{ group.items.length }} 个事件</span>
            </div>
            <div class="rule-cards">
              <div v-for="item in group.items" :key="item.key" class="rule-card">
                <div class="rule-card-left">
                  <div class="rule-level-dot" :class="`dot-${item.level}`"></div>
                  <span class="rule-event-name">{{ item.label }}</span>
                </div>
                <div class="rule-card-channels">
                  <div v-for="ch in enabledChannels" :key="ch.channel_type" class="rule-channel-item">
                    <el-switch
                      v-model="item.channels[ch.channel_type]"
                      size="small"
                      :active-text="ch.name"
                      @change="(val: any) => onRuleChange(item.key, ch.channel_type, val as boolean)"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </el-tab-pane>

      <!-- ========== 通知历史 ========== -->
      <el-tab-pane label="通知历史" name="history">
        <el-card shadow="never">
          <template #header>
            <div class="history-header">
              <div class="history-filters">
                <el-select v-model="historyFilter.eventType" clearable placeholder="事件类型" style="width:150px" @change="loadHistory">
                  <el-option v-for="et in eventTypeList" :key="et.key" :label="et.label" :value="et.key" />
                </el-select>
                <el-select v-model="historyFilter.isRead" clearable placeholder="读取状态" style="width:120px" @change="loadHistory">
                  <el-option label="未读" value="0" />
                  <el-option label="已读" value="1" />
                </el-select>
              </div>
              <div class="history-actions">
                <el-button @click="handleMarkAllReadHistory">全部已读</el-button>
                <el-button type="danger" @click="handleClearAllHistory">清空全部</el-button>
              </div>
            </div>
          </template>

          <el-table :data="historyList" v-loading="historyLoading" stripe>
            <el-table-column label="级别" width="60" align="center">
              <template #default="{ row }">
                <el-icon v-if="row.level === 'success'" color="#67c23a" :size="18"><CircleCheck /></el-icon>
                <el-icon v-else-if="row.level === 'warning'" color="#e6a23c" :size="18"><Warning /></el-icon>
                <el-icon v-else-if="row.level === 'error'" color="#f56c6c" :size="18"><CircleClose /></el-icon>
                <el-icon v-else color="#409eff" :size="18"><InfoFilled /></el-icon>
              </template>
            </el-table-column>
            <el-table-column label="标题" prop="title" min-width="200">
              <template #default="{ row }">
                <span class="clickable-title" :class="{ 'unread-title': !row.is_read }" @click="openHistoryDetail(row)">{{ row.title }}</span>
              </template>
            </el-table-column>
            <el-table-column label="内容" prop="content" min-width="300">
              <template #default="{ row }">
                <span class="clickable-content" @click="openHistoryDetail(row)">{{ row.content }}</span>
              </template>
            </el-table-column>
            <el-table-column label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ eventLabels[row.event_type] || row.event_type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="70" align="center">
              <template #default="{ row }">
                <el-tag v-if="!row.is_read" type="danger" size="small">未读</el-tag>
                <el-tag v-else type="info" size="small">已读</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="时间" width="170">
              <template #default="{ row }">
                {{ formatDateTime(row.created_at) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" align="center">
              <template #default="{ row }">
                <el-button v-if="!row.is_read" type="primary" link size="small" @click="handleMarkRead(row)">标为已读</el-button>
                <el-button type="danger" link size="small" @click="handleDeleteHistory(row.id)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-bar">
            <el-pagination
              v-model:current-page="historyPage"
              :page-size="historyPageSize"
              :total="historyTotal"
              layout="total, prev, pager, next"
              @current-change="loadHistory"
            />
          </div>
        </el-card>
      </el-tab-pane>
    </el-tabs>

    <!-- 消息详情弹窗 -->
    <el-dialog
      v-model="historyDetailVisible"
      title="消息详情"
      width="560px"
      :close-on-click-modal="true"
      destroy-on-close
    >
      <div v-if="historyDetailItem" class="history-detail">
        <div class="detail-header-row">
          <div class="detail-level-icon" :class="`level-${historyDetailItem.level}`">
            <el-icon v-if="historyDetailItem.level === 'success'" :size="22"><CircleCheck /></el-icon>
            <el-icon v-else-if="historyDetailItem.level === 'warning'" :size="22"><Warning /></el-icon>
            <el-icon v-else-if="historyDetailItem.level === 'error'" :size="22"><CircleClose /></el-icon>
            <el-icon v-else :size="22"><InfoFilled /></el-icon>
          </div>
          <div class="detail-title-area">
            <h3 class="detail-title">{{ historyDetailItem.title }}</h3>
            <div class="detail-tags">
              <el-tag :type="levelTagType(historyDetailItem.level)" size="small" effect="plain">{{ getLevelText(historyDetailItem.level) }}</el-tag>
              <el-tag size="small">{{ eventLabels[historyDetailItem.event_type] || historyDetailItem.event_type }}</el-tag>
              <el-tag v-if="!historyDetailItem.is_read" type="danger" size="small" effect="dark">未读</el-tag>
              <el-tag v-else type="info" size="small">已读</el-tag>
            </div>
          </div>
        </div>
        <el-divider style="margin: 14px 0;" />
        <div class="detail-body">
          <p class="detail-text">{{ historyDetailItem.content }}</p>
        </div>
        <div class="detail-footer-info">
          <span class="detail-time">
            <el-icon :size="14"><Clock /></el-icon>
            {{ formatDateTime(historyDetailItem.created_at) }}
          </span>
        </div>
      </div>
      <template #footer>
        <div style="text-align: right;">
          <el-button v-if="historyDetailItem && !historyDetailItem.is_read" type="primary" @click="markHistoryDetailRead">
            标为已读
          </el-button>
          <el-button @click="historyDetailVisible = false">关闭</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell, ChatDotRound, ChatLineSquare, Promotion, Message, Check,
  CircleCheck, Warning, CircleClose, InfoFilled, Clock, Phone
} from '@element-plus/icons-vue'
import request from '@/api/request'

const activeTab = ref('channels')
const route = useRoute()

// ===== 渠道配置 =====
const channels = ref<any[]>([])
const savingChannels = ref(false)
const testingChannel = ref('')

const channelDescs: Record<string, string> = {
  system: '通知显示在管理后台铃铛消息中心',
  dingtalk: '通过钉钉群机器人推送通知',
  wecom: '通过企业微信群机器人推送通知',
  wechat_mp: '通过微信公众号模板消息推送',
  email: '通过邮件发送通知到指定邮箱',
  sms: '通过阿里云短信发送通知到管理员手机'
}

const loadChannels = async () => {
  try {
    const res = await request.get('/notifications/channels')
    if (res.success) {
      channels.value = (res.data || []).map((ch: any) => ({
        ...ch,
        is_enabled: ch.is_enabled ? 1 : 0,
        config_data: ch.config_data || {}
      }))
    }
  } catch {}
}

const handleSaveChannels = async () => {
  savingChannels.value = true
  try {
    const res = await request.put('/notifications/channels', {
      channels: channels.value.map(ch => ({
        channel_type: ch.channel_type,
        name: ch.name,
        is_enabled: !!ch.is_enabled,
        config_data: ch.config_data
      }))
    })
    if (res.success) {
      ElMessage.success('渠道配置已保存')
      // 刷新规则中的渠道列表
      await loadRules()
      buildRuleMatrix()
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingChannels.value = false
  }
}

const handleTestChannel = async (ch: any) => {
  testingChannel.value = ch.channel_type
  try {
    const res = await request.post('/notifications/channels/test', {
      channelType: ch.channel_type,
      config: ch.config_data
    })
    if (res.success && res.data) {
      if (res.data.success) {
        ElMessage.success(res.data.message)
      } else {
        ElMessage.warning(res.data.message)
      }
    }
  } catch {
    ElMessage.error('测试失败')
  } finally {
    testingChannel.value = ''
  }
}

// ===== 通知规则 =====
const eventTypeList = ref<any[]>([])
const rules = ref<any[]>([])
const savingRules = ref(false)

const enabledChannels = computed(() => channels.value.filter(ch => ch.is_enabled))

const eventLabels: Record<string, string> = {
  tenant_registered: '新租户注册',
  payment_created: '新支付订单',
  payment_success: '支付成功',
  payment_pending: '待支付提醒',
  payment_cancelled: '支付取消',
  payment_refund: '订单退款',
  license_expiring: '授权即将到期',
  license_expired: '授权已过期',
  tenant_login: '租户首次登录',
  system_error: '系统异常',
  subscription_created: '新订阅签约',
  subscription_activated: '订阅已激活',
  subscription_cancelled: '订阅已取消',
  subscription_paused: '订阅已暂停',
  subscription_expired: '订阅已过期',
  subscription_deduct_failed: '订阅扣款失败',
  subscription_deduct_success: '订阅扣款成功',
  subscription_platform_cancelled: '平台侧取消订阅'
}

// 分类颜色
const categoryColors: Record<string, string> = {
  '用户动态': '#409eff',
  '支付动态': '#67c23a',
  '授权动态': '#e6a23c',
  '系统告警': '#f56c6c',
  '订阅动态': '#9b59b6'
}

interface RuleRow {
  key: string
  label: string
  level: string
  category: string
  channels: Record<string, boolean>
}

const ruleMatrix = ref<RuleRow[]>([])

// 从服务端数据构建规则矩阵（可写 ref，v-model 可直接修改）
const buildRuleMatrix = () => {
  ruleMatrix.value = eventTypeList.value.map(et => {
    const chMap: Record<string, boolean> = {}
    for (const ch of channels.value) {
      const rule = rules.value.find(r => r.event_type === et.key && r.channel_type === ch.channel_type)
      chMap[ch.channel_type] = rule ? !!rule.is_enabled : false
    }
    return {
      key: et.key,
      label: et.label,
      level: et.level,
      category: et.category,
      channels: chMap
    }
  })
}

// 按分类分组
const ruleGroups = computed(() => {
  const groupMap: Record<string, { category: string; items: RuleRow[] }> = {}
  for (const row of ruleMatrix.value) {
    if (!groupMap[row.category]) {
      groupMap[row.category] = { category: row.category, items: [] }
    }
    groupMap[row.category].items.push(row)
  }
  return Object.values(groupMap)
})

const levelTagType = (level: string) => {
  const map: Record<string, any> = { info: 'primary', success: 'success', warning: 'warning', error: 'danger' }
  return map[level] || 'info'
}

const onRuleChange = (_eventType: string, _channelType: string, _val: boolean) => {
  // 规则变更实时反映在UI上，保存时批量提交
}

const loadEventTypes = async () => {
  try {
    const res = await request.get('/notifications/event-types')
    if (res.success) {
      eventTypeList.value = res.data || []
    }
  } catch {}
}

const loadRules = async () => {
  try {
    const res = await request.get('/notifications/rules')
    if (res.success) {
      rules.value = res.data || []
    }
  } catch {}
}

const handleSaveRules = async () => {
  savingRules.value = true
  try {
    const flatRules: Array<{ event_type: string; channel_type: string; is_enabled: boolean }> = []
    for (const row of ruleMatrix.value) {
      for (const [chType, enabled] of Object.entries(row.channels)) {
        flatRules.push({ event_type: row.key, channel_type: chType, is_enabled: !!enabled })
      }
    }
    const res = await request.put('/notifications/rules', { rules: flatRules })
    if (res.success) {
      ElMessage.success('通知规则已保存')
    }
  } catch {
    ElMessage.error('保存失败')
  } finally {
    savingRules.value = false
  }
}

// ===== 通知历史 =====
const historyList = ref<any[]>([])
const historyLoading = ref(false)
const historyPage = ref(1)
const historyPageSize = 15
const historyTotal = ref(0)
const historyFilter = reactive({ eventType: '', isRead: '' })

const loadHistory = async () => {
  historyLoading.value = true
  try {
    const params: any = { page: historyPage.value, pageSize: historyPageSize }
    if (historyFilter.eventType) params.eventType = historyFilter.eventType
    if (historyFilter.isRead !== '') params.isRead = historyFilter.isRead
    const res = await request.get('/notifications', { params })
    if (res.success) {
      historyList.value = res.data.list || []
      historyTotal.value = res.data.total || 0
    }
  } catch {} finally {
    historyLoading.value = false
  }
}

const handleMarkRead = async (row: any) => {
  try {
    await request.put(`/notifications/${row.id}/read`)
    row.is_read = 1
    ElMessage.success('已标记为已读')
  } catch {}
}

const handleMarkAllReadHistory = async () => {
  try {
    await request.put('/notifications/read-all')
    historyList.value.forEach(n => n.is_read = 1)
    ElMessage.success('已全部标记为已读')
  } catch {}
}

const handleDeleteHistory = async (id: string) => {
  try {
    await ElMessageBox.confirm('确定删除此通知？', '提示', { type: 'warning' })
    await request.delete(`/notifications/${id}`)
    await loadHistory()
    ElMessage.success('已删除')
  } catch {}
}

const handleClearAllHistory = async () => {
  try {
    await ElMessageBox.confirm('确定清空所有通知历史？此操作不可恢复', '警告', { type: 'warning' })
    await request.delete('/notifications')
    await loadHistory()
    ElMessage.success('已清空')
  } catch {}
}

// ===== 统一北京时间格式化 =====
const formatDateTime = (time: string | Date) => {
  if (!time) return '-'
  const d = new Date(time)
  if (isNaN(d.getTime())) return '-'
  return d.toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

// ===== 消息详情弹窗 =====
const historyDetailVisible = ref(false)
const historyDetailItem = ref<any>(null)

const getLevelText = (level: string) => {
  const map: Record<string, string> = { info: '信息', success: '成功', warning: '警告', error: '错误' }
  return map[level] || '信息'
}

const openHistoryDetail = async (row: any) => {
  if (!row.is_read) {
    try {
      await request.put(`/notifications/${row.id}/read`)
      row.is_read = 1
    } catch {}
  }
  historyDetailItem.value = row
  historyDetailVisible.value = true
}

const markHistoryDetailRead = async () => {
  if (!historyDetailItem.value || historyDetailItem.value.is_read) return
  try {
    await request.put(`/notifications/${historyDetailItem.value.id}/read`)
    historyDetailItem.value.is_read = 1
    ElMessage.success('已标记为已读')
  } catch {}
}

// ===== 初始化 =====
onMounted(async () => {
  const tab = route.query.tab as string
  if (tab && ['channels', 'rules', 'history'].includes(tab)) {
    activeTab.value = tab
  }
  await Promise.all([loadChannels(), loadEventTypes()])
  await loadRules()
  buildRuleMatrix()
  loadHistory()
})
</script>

<style scoped>
.page-container { padding: 20px; }
.page-header { margin-bottom: 20px; }
.page-header h2 { margin: 0; font-size: 20px; }
.header-desc { margin: 4px 0 0; font-size: 13px; color: #909399; }

.service-tabs {
  :deep(.el-tabs__header) { margin-bottom: 20px; }
}

/* ====== 渠道配置 ====== */
.channel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(420px, 1fr));
  gap: 16px;
}
.channel-card { border-radius: 8px; }
.channel-header { display: flex; align-items: center; justify-content: space-between; }
.channel-info { display: flex; align-items: center; gap: 12px; }
.channel-info h3 { margin: 0; font-size: 15px; }
.channel-desc { font-size: 12px; color: #909399; }
.channel-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center; color: #fff;
}
.channel-icon.system { background: linear-gradient(135deg, #409eff, #53a8ff); }
.channel-icon.dingtalk { background: linear-gradient(135deg, #3296fa, #0089ff); }
.channel-icon.wecom { background: linear-gradient(135deg, #07c160, #06ad56); }
.channel-icon.wechat_mp { background: linear-gradient(135deg, #07c160, #06ad56); }
.channel-icon.email { background: linear-gradient(135deg, #e6a23c, #f5a623); }
.channel-icon.sms { background: linear-gradient(135deg, #f56c6c, #e74c3c); }
.channel-form {
  :deep(.el-form-item) { margin-bottom: 12px; }
}
.channel-footer { margin-top: 12px; text-align: right; }
.channel-body { padding: 8px 0; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; }
.save-bar {
  margin-top: 20px; text-align: center; padding: 16px;
  background: #fafafa; border-radius: 8px;
}

/* ====== 通知规则 — 现代化卡片分组 ====== */
.rules-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding: 14px 18px;
  background: #f8f9fb;
  border-radius: 10px;
}
.rules-desc {
  margin: 0;
  font-size: 13px;
  color: #606266;
}

.rules-group-list {
  display: flex;
  flex-direction: column;
  gap: 20px;
}
.rule-group {
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 10px;
  overflow: hidden;
}
.rule-group-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 20px;
  background: #f8f9fb;
  border-bottom: 1px solid #ebeef5;
}
.rule-group-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rule-group-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}
.rule-group-count {
  font-size: 12px;
  color: #909399;
  margin-left: auto;
}

.rule-cards {
  padding: 4px 0;
}
.rule-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 20px;
  transition: background 0.15s;
}
.rule-card:hover {
  background: #f5f7fa;
}
.rule-card + .rule-card {
  border-top: 1px solid #f2f3f5;
}
.rule-card-left {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
  min-width: 140px;
}
.rule-level-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex-shrink: 0;
}
.rule-level-dot.dot-info { background: #409eff; }
.rule-level-dot.dot-success { background: #67c23a; }
.rule-level-dot.dot-warning { background: #e6a23c; }
.rule-level-dot.dot-error { background: #f56c6c; }
.rule-event-name {
  font-size: 13px;
  color: #303133;
  font-weight: 500;
}

.rule-card-channels {
  display: flex;
  align-items: center;
  gap: 20px;
  flex-wrap: wrap;
}
.rule-channel-item {
  display: flex;
  align-items: center;
}

/* ====== 通知历史 ====== */
.history-header { display: flex; align-items: center; justify-content: space-between; }
.history-filters { display: flex; gap: 12px; }
.history-actions { display: flex; gap: 8px; }
.unread-title { font-weight: 600; color: #303133; }
.pagination-bar { margin-top: 16px; display: flex; justify-content: flex-end; }

.clickable-title { cursor: pointer; transition: color 0.2s; }
.clickable-title:hover { color: #409eff; }
.clickable-content {
  cursor: pointer; font-size: 13px; color: #606266;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical;
  overflow: hidden; transition: color 0.2s;
}
.clickable-content:hover { color: #409eff; }

/* ====== 消息详情弹窗 ====== */
.history-detail { padding: 0 4px; }
.detail-header-row { display: flex; align-items: flex-start; gap: 12px; }
.detail-level-icon {
  width: 44px; height: 44px; border-radius: 50%;
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.detail-level-icon.level-info { background: #e6f4ff; color: #409eff; }
.detail-level-icon.level-success { background: #e8f5e9; color: #67c23a; }
.detail-level-icon.level-warning { background: #fff8e1; color: #e6a23c; }
.detail-level-icon.level-error { background: #fde2e2; color: #f56c6c; }
.detail-title-area { flex: 1; min-width: 0; }
.detail-title { margin: 0 0 8px; font-size: 17px; font-weight: 600; color: #303133; word-break: break-word; }
.detail-tags { display: flex; gap: 6px; flex-wrap: wrap; }
.detail-body { padding: 8px 0; }
.detail-text { font-size: 14px; line-height: 1.8; color: #606266; white-space: pre-wrap; word-break: break-word; margin: 0; }
.detail-footer-info {
  display: flex; align-items: center; justify-content: space-between;
  margin-top: 12px; padding-top: 10px; border-top: 1px solid #f0f2f5;
  font-size: 12px; color: #909399;
}
.detail-time { display: flex; align-items: center; gap: 4px; }
</style>

