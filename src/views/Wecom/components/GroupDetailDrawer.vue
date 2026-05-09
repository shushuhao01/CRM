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
              {{ group.chatId ? (group.chatId.length > 20 ? group.chatId.slice(0, 20) + '…' : group.chatId) : '-' }}
              <el-icon v-if="group.chatId" style="cursor:pointer;margin-left:4px"><CopyDocument /></el-icon>
            </span>
          </div>
          <div class="info-item">
            <span class="label">群主</span>
            <div class="owner-display">
              <span class="value" style="font-weight:500">{{ group.ownerUserName || group.ownerUserId || '-' }}</span>
              <span v-if="group.ownerUserName && group.ownerUserId" class="value-sub">{{ group.ownerUserId }}</span>
            </div>
          </div>
          <div class="info-item">
            <span class="label">创建时间</span>
            <span class="value">{{ formatDate(group.createTime) }}</span>
          </div>
          <div class="info-item">
            <span class="label">成员数</span>
            <span class="value">{{ group.memberCount || 0 }}人
              <span style="color: #9CA3AF">（员工 {{ internalCount }} + 外部 {{ externalCount }}）</span>
            </span>
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
            <div class="act-value">{{ group.todayMsgCount || 0 }}</div>
            <div class="act-label">今日消息</div>
          </div>
          <div class="activity-item">
            <div class="act-value">{{ members.length }}</div>
            <div class="act-label">群成员数</div>
          </div>
          <div class="activity-item">
            <div class="act-value text-success">{{ externalCount }}</div>
            <div class="act-label">外部客户</div>
          </div>
          <div class="activity-item">
            <div class="act-value text-primary">{{ activityRate }}%</div>
            <div class="act-label">内部占比</div>
          </div>
        </div>
        <!-- 活跃成员 TOP -->
        <div class="top-members" v-if="topInternalMembers.length > 0">
          <span class="top-title">内部员工列表</span>
          <div v-for="(m, i) in topInternalMembers" :key="i" class="top-item">
            <span class="top-rank">{{ i + 1 }}</span>
            <el-avatar :size="24" style="font-size:11px">{{ (m.name || '?').charAt(0) }}</el-avatar>
            <span class="top-name">{{ m.name || m.userid || '-' }}</span>
            <el-tag size="small" :type="m.userid === group.ownerUserId ? 'danger' : ''" style="font-size:10px">
              {{ m.userid === group.ownerUserId ? '群主' : '员工' }}
            </el-tag>
          </div>
        </div>
        <div v-else class="top-members">
          <el-empty description="暂无活跃成员数据" :image-size="40" />
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
              >批量踢出 ({{ selectedMembers.length }})</el-button>
              <el-input v-model="memberSearch" placeholder="搜索成员" size="small" style="width: 140px" clearable />
            </div>
          </div>
        </template>
        <el-table :data="pagedMembers" size="small" stripe @selection-change="handleMemberSelectionChange">
          <el-table-column type="selection" width="40" :selectable="canKickMember" />
          <el-table-column label="成员" min-width="120">
            <template #default="{ row }">
              <div class="member-cell">
                <el-avatar :size="24" style="font-size:11px">{{ (row.name || '?').charAt(0) }}</el-avatar>
                <div class="member-info">
                  <span class="member-name-text">{{ row.name || '-' }}</span>
                  <span class="member-id-text" v-if="row.userid">{{ row.userid }}</span>
                </div>
              </div>
            </template>
          </el-table-column>
          <el-table-column label="角色" width="70">
            <template #default="{ row }">
              <el-tag size="small" :type="row.userid === group.ownerUserId ? 'danger' : (row.is_admin ? 'warning' : '')">
                {{ row.userid === group.ownerUserId ? '群主' : (row.is_admin ? '管理员' : '成员') }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="类型" width="65">
            <template #default="{ row }">
              <el-tag size="small" :type="row.type === 1 ? 'primary' : 'success'">{{ row.type === 1 ? '员工' : '外部' }}</el-tag>
            </template>
          </el-table-column>
          <el-table-column label="CRM关联" width="80">
            <template #default="{ row }">
              <el-tag v-if="row.crmLinked" size="small" type="success">已关联</el-tag>
              <el-tag v-else-if="row.type === 2" size="small" type="info">未关联</el-tag>
              <span v-else style="color: #D1D5DB">-</span>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="65" fixed="right">
            <template #default="{ row }">
              <el-button v-if="canKickMember(row)" type="danger" link size="small" @click="handleKickMember(row)" :loading="kicking">踢出</el-button>
              <span v-else style="color: #D1D5DB">-</span>
            </template>
          </el-table-column>
        </el-table>
        <!-- 分页 -->
        <div class="member-pager">
          <el-pagination
            v-if="filteredMembers.length > memberPageSize"
            v-model:current-page="memberPage"
            :page-size="memberPageSize"
            :total="filteredMembers.length"
            layout="total, prev, pager, next"
            small
          />
        </div>
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
        <el-tooltip content="企业微信API仅支持离职继承转让群主，不支持主动转让" placement="top">
          <el-button size="small" type="primary" plain disabled>群主转让（不支持）</el-button>
        </el-tooltip>
        <!-- <el-button size="small" plain @click="broadcastDialogVisible = true" :disabled="group.status !== 'normal'">群发消息</el-button> -->
        <el-button size="small" plain @click="handleExportMembers">导出成员</el-button>
      </div>
    </div>
  </el-drawer>

  <!-- 群主转让对话框 -->
  <el-dialog v-model="transferDialogVisible" title="群主转让" width="420px" append-to-body>
    <el-alert type="warning" :closable="false" style="margin-bottom:16px">
      转让后当前群主将变为普通成员，操作不可撤销。
    </el-alert>
    <el-form label-width="80px">
      <el-form-item label="当前群主">
        <span style="color:#4B5563">{{ group?.ownerUserName || group?.ownerUserId || '-' }}</span>
      </el-form-item>
      <el-form-item label="新群主" required>
        <el-select v-model="newOwnerId" placeholder="选择内部员工作为新群主" style="width:100%" filterable>
          <el-option
            v-for="m in internalMembers"
            :key="m.userid"
            :label="m.name ? `${m.name} (${m.userid})` : m.userid"
            :value="m.userid"
            :disabled="m.userid === group?.ownerUserId"
          />
        </el-select>
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="transferDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="transferring" @click="handleTransferOwner">确认转让</el-button>
    </template>
  </el-dialog>

  <!-- 群发消息对话框 -->
  <el-dialog v-model="broadcastDialogVisible" title="群发消息" width="500px" append-to-body>
    <el-alert type="info" :closable="false" style="margin-bottom:16px">
      群发消息将通过企微服务商API发送，发送前请确认消息内容和目标群。
    </el-alert>
    <el-form :model="broadcastForm" label-width="80px">
      <el-form-item label="目标群">
        <span style="color:#4B5563;font-weight:500">{{ group?.name || '当前群' }}</span>
      </el-form-item>
      <el-form-item label="消息内容" required>
        <el-input
          v-model="broadcastForm.content"
          type="textarea"
          :rows="4"
          placeholder="请输入群发消息内容"
          maxlength="600"
          show-word-limit
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="broadcastDialogVisible = false">取消</el-button>
      <el-button type="primary" :loading="broadcasting" @click="handleSendBroadcast">发送</el-button>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ChatDotRound, CopyDocument, InfoFilled } from '@element-plus/icons-vue'
import { kickGroupMember, transferGroupOwner, exportGroupMembers, createGroupBroadcast } from '@/api/wecomGroup'

const props = defineProps<{ group: any; members: any[] }>()
const emit = defineEmits(['close', 'member-kicked', 'owner-transferred'])

const visible = ref(true)
const memberSearch = ref('')
const memberPage = ref(1)
const memberPageSize = 10
const kicking = ref(false)
const selectedMembers = ref<any[]>([])

// 群主转让
const transferDialogVisible = ref(false)
const newOwnerId = ref('')
const transferring = ref(false)

// 群发消息
const broadcastDialogVisible = ref(false)
const broadcastForm = ref({ content: '' })
const broadcasting = ref(false)

// 搜索或群改变时重置分页
watch(memberSearch, () => { memberPage.value = 1 })
watch(() => props.members, () => { memberPage.value = 1 })

// ============ 成员计算 ============

const internalCount = computed(() => props.members.filter(m => m.type === 1).length)
const externalCount = computed(() => props.members.filter(m => m.type === 2).length)
const internalMembers = computed(() => props.members.filter(m => m.type === 1))

const activityRate = computed(() => {
  const total = props.members.length
  return total > 0 ? Math.round((internalCount.value / total) * 100) : 0
})

const topInternalMembers = computed(() => {
  const list = [...internalMembers.value]
  const owner = list.find(m => m.userid === props.group?.ownerUserId)
  const rest = list.filter(m => m.userid !== props.group?.ownerUserId)
  return owner ? [owner, ...rest].slice(0, 5) : rest.slice(0, 5)
})

const filteredMembers = computed(() => {
  if (!memberSearch.value) return props.members
  const kw = memberSearch.value.toLowerCase()
  return props.members.filter(m => (
    (m.name || '').toLowerCase().includes(kw) ||
    (m.userid || '').toLowerCase().includes(kw)
  ))
})

const pagedMembers = computed(() => {
  const start = (memberPage.value - 1) * memberPageSize
  return filteredMembers.value.slice(start, start + memberPageSize)
})

const crmStats = computed(() => {
  const external = props.members.filter(m => m.type === 2)
  const linked = external.filter(m => m.crmLinked)
  const unmatched = external.length - linked.length
  return {
    externalCount: external.length,
    linkedCount: linked.length,
    linkedPercent: external.length > 0 ? Math.round((linked.length / external.length) * 100) : 0,
    pendingCount: 0,
    unmatchedCount: unmatched
  }
})

// ============ 时间格式化 ============

const formatDate = (d: string | Date | null) => {
  if (!d) return '-'
  const dt = new Date(d)
  if (isNaN(dt.getTime())) return String(d)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())} ${pad(dt.getHours())}:${pad(dt.getMinutes())}`
}

// ============ 踢出操作 ============

const canKickMember = (row: any) => row.type === 2 && row.userid !== props.group?.ownerUserId && !row.is_admin

const handleMemberSelectionChange = (selection: any[]) => { selectedMembers.value = selection }

const handleKickMember = async (row: any) => {
  await ElMessageBox.confirm(
    `确定将「${row.name || row.userid}」踢出群「${props.group?.name || ''}」？此操作通过企微API执行，不可撤销。`,
    '踢出确认', { type: 'warning' }
  )
  kicking.value = true
  try {
    await kickGroupMember(props.group.chatId, [row.userid || row.external_userid])
    ElMessage.success(`已将「${row.name || row.userid}」踢出群聘`)
    emit('member-kicked', [row])
  } catch (e: any) {
    ElMessage.error(e?.message || '踢出失败')
  } finally { kicking.value = false }
}

const handleBatchKick = async () => {
  const targets = selectedMembers.value.filter(canKickMember)
  if (targets.length === 0) { ElMessage.warning('没有可踢出的外部成员'); return }
  await ElMessageBox.confirm(
    `确定将选中的 ${targets.length} 名外部成员踢出群「${props.group?.name || ''}」？`,
    '批量踢出确认', { type: 'warning' }
  )
  kicking.value = true
  try {
    const userIds = targets.map((m: any) => m.userid || m.external_userid)
    await kickGroupMember(props.group.chatId, userIds)
    ElMessage.success(`已成功踢出 ${targets.length} 名成员`)
    emit('member-kicked', targets)
    selectedMembers.value = []
  } catch (e: any) {
    ElMessage.error(e?.message || '批量踢出失败')
  } finally { kicking.value = false }
}

// ============ 群主转让 ============

const handleTransferOwner = async () => {
  if (!newOwnerId.value) { ElMessage.warning('请选择新群主'); return }
  transferring.value = true
  try {
    const res: any = await transferGroupOwner(props.group.chatId, newOwnerId.value)
    ElMessage.success(res?.message || '转让成功')
    transferDialogVisible.value = false
    newOwnerId.value = ''
    emit('owner-transferred')
  } catch (e: any) {
    ElMessage.error(e?.message || '转让失败')
  } finally { transferring.value = false }
}

// ============ 群发消息 ============

const handleSendBroadcast = async () => {
  if (!broadcastForm.value.content.trim()) { ElMessage.warning('请输入消息内容'); return }
  broadcasting.value = true
  try {
    const now = new Date()
    const timeStr = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
    await createGroupBroadcast({
      taskName: `快捷群发-${props.group?.name || '群'}-${timeStr}`,
      target: 'specified',
      specifiedGroups: JSON.stringify([props.group.chatId]),
      text: broadcastForm.value.content,
      sendMode: 'now'
    })
    ElMessage.success('群发任务已创建')
    broadcastDialogVisible.value = false
    broadcastForm.value.content = ''
  } catch (e: any) {
    ElMessage.error(e?.message || '发送失败')
  } finally { broadcasting.value = false }
}

// ============ 导出成员 ============

const handleExportMembers = async () => {
  if (!props.group?.id) { ElMessage.warning('群信息不完整'); return }
  try {
    const blob = await exportGroupMembers(props.group.id)
    const url = URL.createObjectURL(blob)
    const groupName = props.group.name || 'group'
    const date = new Date().toISOString().split('T')[0]
    const a = document.createElement('a')
    a.href = url
    a.download = `${groupName}_成员列表_${date}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    ElMessage.success('导出成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '导出失败')
  }
}

// ============ 其他 ============

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
.info-item .value-sub { color: #9CA3AF; font-size: 11px; display: block; margin-top: 2px; }
.owner-display { display: flex; flex-direction: column; }
.chat-id { color: #4C6EF5; cursor: pointer; display: inline-flex; align-items: center; }
.chat-id:hover { text-decoration: underline; }
.section-card { margin-bottom: 16px; }
.section-title { font-weight: 600; font-size: 14px; color: #1F2937; }
.section-header { display: flex; justify-content: space-between; align-items: center; }
.notice-text { font-size: 13px; color: #4B5563; line-height: 1.6; white-space: pre-wrap; }
.activity-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 16px; }
.activity-item { text-align: center; padding: 10px 8px; background: #fff; border: 1px solid #EBEEF5; border-radius: 10px; }
.act-value { font-size: 20px; font-weight: 700; color: #1F2937; }
.act-label { font-size: 11px; color: #9CA3AF; margin-top: 2px; }
.text-primary { color: #4C6EF5; }
.text-success { color: #10B981; }
.text-warning { color: #F59E0B; }
.text-danger { color: #EF4444; }
.top-members { margin-top: 12px; }
.top-title { font-size: 13px; font-weight: 600; color: #4B5563; margin-bottom: 8px; display: block; }
.top-item { display: flex; align-items: center; gap: 8px; padding: 5px 0; border-bottom: 1px dashed #F3F4F6; }
.top-item:last-child { border-bottom: none; }
.top-rank { width: 18px; font-weight: 700; color: #F59E0B; font-size: 13px; text-align: center; }
.top-name { flex: 1; font-size: 13px; color: #1F2937; }
.member-cell { display: flex; align-items: center; gap: 6px; }
.member-info { display: flex; flex-direction: column; min-width: 0; }
.member-name-text { font-size: 13px; color: #1F2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.member-id-text { font-size: 10px; color: #9CA3AF; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
.member-pager { margin-top: 8px; display: flex; justify-content: flex-end; }
.crm-stats { display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; }
.crm-stat-item { text-align: center; padding: 10px; }
.crm-val { font-size: 20px; font-weight: 700; color: #1F2937; display: block; }
.crm-label { font-size: 11px; color: #9CA3AF; }
.action-bar { display: flex; gap: 8px; padding: 16px 0 8px; }
.kick-tip { margin-top: 8px; font-size: 12px; color: #9CA3AF; display: flex; align-items: center; gap: 4px; }
.kick-tip strong { color: #6B7280; }
</style>

