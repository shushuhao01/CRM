<template>
  <el-drawer v-model="visible" :title="null" size="700px" direction="rtl" @close="emit('close')">
    <template #header>
      <div class="detail-header">
        <el-icon><ChatDotRound /></el-icon>
        <span class="detail-title">{{ group?.name || '未命名群' }}</span>
        <el-tag :type="group?.status === 'normal' ? 'success' : 'danger'" size="small" style="margin-left: 8px">
          {{ group?.status === 'normal' ? '正常' : '已解散' }}
        </el-tag>
      </div>
    </template>

    <div v-if="group" class="group-detail-content">
      <!-- 基本信息 -->
      <div class="info-card">
        <div class="info-grid">
          <div class="info-item">
            <span class="label">群名称</span>
            <span class="value">{{ group.name || '未命名群' }}</span>
          </div>
          <div class="info-item">
            <span class="label">ChatID</span>
            <span class="value chat-id" @click="copyChatId">
              {{ group.chatId || '-' }}
              <el-icon v-if="group.chatId" style="cursor:pointer;margin-left:4px"><CopyDocument /></el-icon>
            </span>
          </div>
          <div class="info-item">
            <span class="label">群主</span>
            <span class="value">{{ group.ownerUserName || group.ownerUserId || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间</span>
            <span class="value">{{ group.createTime || '-' }}</span>
          </div>
          <div class="info-item">
            <span class="label">成员数</span>
            <span class="value">{{ group.memberCount || 0 }}人 <span style="color: #9CA3AF">(员工{{ internalCount }} + 外部{{ externalCount }})</span></span>
          </div>
          <div class="info-item">
            <span class="label">状态</span>
            <el-tag :type="group.status === 'normal' ? 'success' : 'danger'" size="small">
              {{ group.status === 'normal' ? '正常' : '已解散' }}
            </el-tag>
          </div>
        </div>
      </div>

      <!-- 群公告 -->
      <el-card shadow="never" class="section-card" v-if="group.notice">
        <template #header><span class="section-title">📢 群公告</span></template>
        <div class="notice-text">{{ group.notice }}</div>
      </el-card>

      <!-- 活跃度分析 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">📊 活跃度分析</span></template>
        <div class="activity-cards">
          <div class="activity-item">
            <div class="act-value">{{ activityStats.todayMsg }}</div>
            <div class="act-label">今日消息</div>
          </div>
          <div class="activity-item">
            <div class="act-value">{{ activityStats.weekMsg }}</div>
            <div class="act-label">本周消息</div>
          </div>
          <div class="activity-item">
            <div class="act-value text-primary">{{ activityStats.activityRate }}%</div>
            <div class="act-label">活跃度</div>
          </div>
        </div>
        <!-- 7日趋势 -->
        <TrendLineChart
          :data="trendChartData"
          series-name="消息数"
          color="#4C6EF5"
          :height="140"
        />
        <!-- 活跃成员TOP5 -->
        <div class="top-members">
          <span class="top-title">活跃成员TOP5</span>
          <div v-for="(m, i) in topMembers" :key="i" class="top-item">
            <span class="top-rank">{{ i + 1 }}</span>
            <el-avatar :size="24">{{ m.name?.charAt(0) }}</el-avatar>
            <span class="top-name">{{ m.name }}</span>
            <span class="top-msg">{{ m.msgCount }}条</span>
          </div>
        </div>
      </el-card>

      <!-- 成员列表 -->
      <el-card shadow="never" class="section-card">
        <template #header>
          <div class="section-header">
            <span class="section-title">👥 成员列表 ({{ members.length }})</span>
            <div style="display: flex; align-items: center; gap: 8px">
              <el-button
                v-if="selectedMembers.length > 0"
                type="danger"
                size="small"
                @click="handleBatchKick"
                :loading="kicking"
              >
                批量踢出 ({{ selectedMembers.length }})
              </el-button>
              <el-input v-model="memberSearch" placeholder="搜索成员" size="small" style="width: 150px" clearable />
            </div>
          </div>
        </template>
        <el-table :data="filteredMembers" size="small" max-height="260" stripe @selection-change="handleMemberSelectionChange">
          <el-table-column type="selection" width="40" :selectable="canKickMember" />
          <el-table-column label="成员" min-width="100">
            <template #default="{ row }">
              <div class="member-cell">
                <el-avatar :size="24">{{ (row.name || row.userid || '?').charAt(0) }}</el-avatar>
                <el-tooltip :content="row.name || row.userid || '-'" placement="top" :disabled="(row.name || row.userid || '-').length < 8">
                  <span class="member-name-text">{{ row.name || row.userid || '-' }}</span>
                </el-tooltip>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="角色" width="80">
            <template #default="{ row }">
              <el-tag size="small" :type="row.isOwner ? 'danger' : row.isAdmin ? 'warning' : ''">
                {{ row.isOwner ? '群主' : row.isAdmin ? '管理员' : '成员' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="70">
            <template #default="{ row }">
              <el-tag size="small" :type="row.type === 1 ? 'primary' : 'success'">{{ row.type === 1 ? '员工' : '外部' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="CRM关联" width="90">
            <template #default="{ row }">
              <el-tag v-if="row.crmLinked" size="small" type="success">已关联</el-tag>
              <el-tag v-else-if="row.type === 2" size="small" type="info">未关联</el-tag>
              <span v-else style="color: #D1D5DB">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="70" fixed="right">
            <template #default="{ row }">
              <el-button
                v-if="canKickMember(row)"
                type="danger"
                link
                size="small"
                @click="handleKickMember(row)"
                :loading="kicking"
              >踢出</el-button>
              <span v-else style="color: #D1D5DB">-</span>
            </template>
          </el-table-column>
        </el-table>
        <div class="kick-tip">
          <el-icon><InfoFilled /></el-icon>
          踢出操作通过企微API（groupchat/member/del）执行，仅支持踢出<strong>外部客户</strong>，企微员工和群主不可踢出。
        </div>
      </el-card>

      <!-- CRM关联统计 -->
      <el-card shadow="never" class="section-card">
        <template #header><span class="section-title">🔗 CRM客户关联统计</span></template>
        <div class="crm-stats">
          <div class="crm-stat-item">
            <span class="crm-val">{{ crmStats.externalCount }}</span>
            <span class="crm-label">群内外部客户</span>
          </div>
          <div class="crm-stat-item">
            <span class="crm-val text-success">{{ crmStats.linkedCount }}</span>
            <span class="crm-label">已关联CRM ({{ crmStats.linkedPercent }}%)</span>
          </div>
          <div class="crm-stat-item">
            <span class="crm-val text-warning">{{ crmStats.pendingCount }}</span>
            <span class="crm-label">待匹配</span>
          </div>
          <div class="crm-stat-item">
            <span class="crm-val text-danger">{{ crmStats.unmatchedCount }}</span>
            <span class="crm-label">未匹配</span>
          </div>
        </div>
      </el-card>

      <!-- 操作区 -->
      <div class="action-bar">
        <el-button size="small" type="primary" plain disabled>群主转让</el-button>
        <el-button size="small" plain disabled>群发消息</el-button>
        <el-button size="small" plain disabled>导出成员</el-button>
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, computed, reactive } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, CopyDocument, InfoFilled } from '@element-plus/icons-vue'
import TrendLineChart from './TrendLineChart.vue'
import { kickGroupMember } from '@/api/wecomGroup'

const props = defineProps<{ group: any; members: any[] }>()
const emit = defineEmits(['close', 'member-kicked'])

const visible = ref(true)
const memberSearch = ref('')
const kicking = ref(false)
const selectedMembers = ref<any[]>([])

const handleMemberSelectionChange = (selection: any[]) => {
  selectedMembers.value = selection
}

/** 只有外部客户（type===2）且不是群主/管理员才能踢 */
const canKickMember = (row: any) => {
  return row.type === 2 && !row.isOwner && !row.isAdmin
}

const handleKickMember = async (row: any) => {
  await ElMessageBox.confirm(
    `确定将「${row.name || row.userid}」踢出群「${props.group?.name || ''}」？此操作通过企微API执行，不可撤销。`,
    '踢出确认',
    { type: 'warning' }
  )
  kicking.value = true
  try {
    await kickGroupMember(props.group.chatId, [row.userid || row.external_userid])
    ElMessage.success(`已将「${row.name || row.userid}」踢出群聊`)
    emit('member-kicked', [row])
  } catch (e: any) {
    ElMessage.error(e?.message || '踢出失败')
  } finally { kicking.value = false }
}

const handleBatchKick = async () => {
  const targets = selectedMembers.value.filter(canKickMember)
  if (targets.length === 0) { ElMessage.warning('没有可踢出的外部成员'); return }
  await ElMessageBox.confirm(
    `确定将选中的 ${targets.length} 名外部成员踢出群「${props.group?.name || ''}」？此操作通过企微API执行，不可撤销。`,
    '批量踢出确认',
    { type: 'warning' }
  )
  kicking.value = true
  try {
    const userIds = targets.map(m => m.userid || m.external_userid)
    await kickGroupMember(props.group.chatId, userIds)
    ElMessage.success(`已成功踢出 ${targets.length} 名成员`)
    emit('member-kicked', targets)
    selectedMembers.value = []
  } catch (e: any) {
    ElMessage.error(e?.message || '批量踢出失败')
  } finally { kicking.value = false }
}

const activityStats = reactive({
  todayMsg: 42, weekMsg: 268, activityRate: 82
})

const trendData = Array.from({ length: 7 }, (_, i) => {
  const d = new Date(2026, 3, 15 - 6 + i)
  return { date: d.toISOString().split('T')[0], count: Math.floor(Math.random() * 50 + 10) }
})

const trendChartData = computed(() => trendData.map(d => ({ date: d.date.slice(5), value: d.count })))

const topMembers = [
  { name: '王销售', msgCount: 58 },
  { name: '客户A', msgCount: 42 },
  { name: '陈经理', msgCount: 35 },
  { name: '客户B', msgCount: 28 },
  { name: '张客服', msgCount: 22 },
]

const internalCount = computed(() => props.members.filter(m => m.type === 1).length)
const externalCount = computed(() => props.members.filter(m => m.type === 2).length)

const filteredMembers = computed(() => {
  if (!memberSearch.value) return props.members
  const kw = memberSearch.value.toLowerCase()
  return props.members.filter(m => (m.name || m.userid || '').toLowerCase().includes(kw))
})

const crmStats = computed(() => {
  const external = props.members.filter(m => m.type === 2)
  const linked = external.filter(m => m.crmLinked)
  return {
    externalCount: external.length,
    linkedCount: linked.length,
    linkedPercent: external.length > 0 ? Math.round((linked.length / external.length) * 100) : 0,
    pendingCount: Math.floor(external.length * 0.2),
    unmatchedCount: external.length - linked.length - Math.floor(external.length * 0.2)
  }
})

const copyChatId = () => {
  if (!props.group?.chatId) return
  navigator.clipboard.writeText(props.group.chatId)
  ElMessage.success('ChatID已复制')
}
</script>

<style scoped>
.detail-header { display: flex; align-items: center; gap: 8px; }
.detail-title { font-size: 18px; font-weight: 600; color: #1F2937; }
.group-detail-content { padding: 0 4px; }
.info-card { background: #F9FAFB; border-radius: 12px; padding: 20px; margin-bottom: 16px; }
.info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.info-item .label { color: #9CA3AF; font-size: 12px; display: block; margin-bottom: 2px; }
.info-item .value { color: #4B5563; font-size: 14px; }
.chat-id { color: #4C6EF5; cursor: pointer; display: inline-flex; align-items: center; }
.chat-id:hover { text-decoration: underline; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.notice-text { font-size: 13px; color: #4B5563; line-height: 1.6; white-space: pre-wrap; }
.activity-cards { display: flex; gap: 16px; margin-bottom: 16px; }
.activity-item { flex: 1; text-align: center; padding: 12px; background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; }
.act-value { font-size: 22px; font-weight: 700; color: #1F2937; }
.act-label { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.text-primary { color: #4C6EF5; }
.text-success { color: #10B981; }
.text-warning { color: #F59E0B; }
.text-danger { color: #EF4444; }
.top-members { margin-top: 8px; }
.top-title { font-size: 13px; font-weight: 600; color: #4B5563; margin-bottom: 8px; display: block; }
.top-item { display: flex; align-items: center; gap: 8px; padding: 6px 0; }
.top-rank { width: 18px; font-weight: 700; color: #F59E0B; font-size: 14px; text-align: center; }
.top-name { flex: 1; font-size: 13px; color: #1F2937; font-weight: 400; }
.top-msg { font-size: 12px; color: #6B7280; }
.member-cell { display: flex; align-items: center; gap: 6px; }
.member-name-text { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px; display: inline-block; }
.crm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.crm-stat-item { text-align: center; padding: 10px; }
.crm-val { font-size: 20px; font-weight: 700; color: #1F2937; display: block; }
.crm-label { font-size: 11px; color: #9CA3AF; }
.action-bar { display: flex; gap: 8px; padding: 16px 0; }
.kick-tip { margin-top: 8px; font-size: 12px; color: #9CA3AF; display: flex; align-items: center; gap: 4px; }
.kick-tip strong { color: #6B7280; }
</style>

