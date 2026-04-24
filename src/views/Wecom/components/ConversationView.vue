<template>
  <div>
    <!-- 顶部筛选搜索栏 -->
    <div class="conv-toolbar">
      <el-input v-model="convSearch" placeholder="搜索客户昵称/备注/消息内容" clearable style="width: 240px" size="default" @keyup.enter="fetchConversations" @clear="fetchConversations">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
      <el-select v-model="convMsgTypeFilter" placeholder="消息类型" clearable style="width: 110px" size="default" @change="fetchConversations">
        <el-option label="全部" value="" />
        <el-option label="文本" value="text" />
        <el-option label="图片" value="image" />
        <el-option label="文件" value="file" />
        <el-option label="语音" value="voice" />
        <el-option label="视频" value="video" />
      </el-select>
      <el-date-picker v-model="convStartDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 145px" size="default" @change="fetchConversations" />
      <span style="color:#909399;font-size:13px">至</span>
      <el-date-picker v-model="convEndDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 145px" size="default" @change="fetchConversations" />
      <el-button type="primary" size="default" @click="fetchConversations">
        <el-icon><Search /></el-icon> 搜索
      </el-button>
      <el-button size="default" @click="resetConvSearch">重置</el-button>
      <div style="flex:1"></div>
      <span class="conv-count-label">共 {{ convTotal }} 个会话</span>
    </div>

    <div class="chat-container">
      <!-- ⓪ 可折叠部门/成员面板 -->
      <div class="member-panel" :class="{ collapsed: memberPanelCollapsed }">
        <div class="member-panel-toggle" @click="memberPanelCollapsed = !memberPanelCollapsed">
          <el-icon v-if="memberPanelCollapsed"><DArrowRight /></el-icon>
          <el-icon v-else><DArrowLeft /></el-icon>
          <span v-if="!memberPanelCollapsed" class="toggle-text">部门/成员</span>
        </div>
        <template v-if="!memberPanelCollapsed">
          <div class="member-panel-header">
            <span class="member-panel-title">组织架构</span>
            <el-input v-model="memberSearch" placeholder="搜索部门/成员" clearable size="small" style="margin-top:8px" prefix-icon="Search" />
          </div>
          <div class="member-panel-list" v-loading="memberLoading">
            <!-- 全部成员入口 -->
            <div
              class="member-item dept-all-item"
              :class="{ active: !selectedDeptId && !selectedMemberId }"
              @click="handleSelectAll"
            >
              <el-icon><OfficeBuilding /></el-icon>
              <span class="member-name">全部成员</span>
            </div>
            <!-- 部门树 -->
            <template v-for="dept in filteredDepartments" :key="dept.id">
              <div
                class="dept-item"
                :class="{ active: selectedDeptId === dept.id && !selectedMemberId }"
                @click="handleSelectDept(dept)"
              >
                <el-icon class="dept-expand-icon" :class="{ expanded: expandedDepts.has(dept.id) }" @click.stop="toggleDeptExpand(dept.id)">
                  <ArrowRight />
                </el-icon>
                <el-icon color="#e6a23c"><Folder /></el-icon>
                <span class="dept-name">{{ dept.name }}</span>
                <span class="dept-count" v-if="getDeptMemberCount(dept.id)">{{ getDeptMemberCount(dept.id) }}</span>
              </div>
              <!-- 部门下成员列表 -->
              <template v-if="expandedDepts.has(dept.id)">
                <div
                  v-for="member in getDeptMembers(dept.id)"
                  :key="member.wecomUserId"
                  class="member-item member-indent"
                  :class="{ active: selectedMemberId === member.wecomUserId }"
                  @click="selectMember(member)"
                >
                  <div class="member-avatar-wrap">
                    <span class="member-avatar-icon">{{ (member.name || member.wecomUserId).charAt(0) }}</span>
                  </div>
                  <div class="member-name">{{ member.name || member.wecomUserId }}</div>
                </div>
                <div v-if="getDeptMembers(dept.id).length === 0" class="empty-dept-hint">暂无成员</div>
              </template>
            </template>
            <!-- 未分组成员 -->
            <template v-if="ungroupedMembers.length > 0">
              <div class="dept-item" :class="{ active: selectedDeptId === -1 && !selectedMemberId }" @click="handleSelectDept({ id: -1, name: '未分组' })">
                <el-icon class="dept-expand-icon" :class="{ expanded: expandedDepts.has(-1) }" @click.stop="toggleDeptExpand(-1)">
                  <ArrowRight />
                </el-icon>
                <el-icon color="#909399"><Folder /></el-icon>
                <span class="dept-name">未分组</span>
                <span class="dept-count">{{ ungroupedMembers.length }}</span>
              </div>
              <template v-if="expandedDepts.has(-1)">
                <div
                  v-for="member in ungroupedMembers"
                  :key="member.wecomUserId"
                  class="member-item member-indent"
                  :class="{ active: selectedMemberId === member.wecomUserId }"
                  @click="selectMember(member)"
                >
                  <div class="member-avatar-wrap">
                    <span class="member-avatar-icon">{{ (member.name || member.wecomUserId).charAt(0) }}</span>
                  </div>
                  <div class="member-name">{{ member.name || member.wecomUserId }}</div>
                </div>
              </template>
            </template>
            <div v-if="filteredDepartments.length === 0 && ungroupedMembers.length === 0 && !memberLoading" class="empty-member">
              <el-empty description="暂无成员" :image-size="40" />
            </div>
          </div>
        </template>
      </div>

      <!-- ① 左栏: 客户会话列表 -->
      <div class="chat-sidebar">
        <div class="chat-sidebar-header" v-if="selectedMemberName">
          <el-icon><User /></el-icon>
          <span>{{ selectedMemberName }} 的客户</span>
        </div>
        <div class="chat-sidebar-list" v-loading="convLoading">
          <div v-if="conversations.length === 0 && !convLoading" class="empty-conv">
            <el-empty :description="selectedMemberId ? '该成员暂无会话' : '请先选择成员'" :image-size="60" />
          </div>
          <div
            v-for="conv in conversations"
            :key="conv.fromUserId + '-' + (conv.roomId || getFirstToUser(conv.toUserIds))"
            class="conv-item"
            :class="{ active: isActiveConv(conv) }"
            @click="selectConversation(conv)"
          >
            <div class="conv-avatar">
              <span v-if="conv.roomId">{{ String.fromCodePoint(0x1F465) }}</span>
              <span v-else>{{ String.fromCodePoint(0x1F464) }}</span>
            </div>
            <div class="conv-info">
              <div class="conv-name">
                {{ conv.fromUserName || conv.fromUserId }}
                <span v-if="conv.roomId" class="conv-room">(群聊)</span>
              </div>
              <div class="conv-preview">{{ getConvPreview(conv) }}</div>
              <div class="conv-time-line">{{ conv.lastMsgTime ? formatConvTime(conv.lastMsgTime) : '' }}</div>
            </div>
            <div class="conv-meta">
              <el-badge v-if="conv.msgCount && conv.msgCount > 1" :value="conv.msgCount" :max="999" class="conv-badge" />
            </div>
          </div>
        </div>
        <div class="chat-sidebar-footer">
          <el-pagination
            v-model:current-page="convPage"
            :page-size="convPageSize"
            :total="convTotal"
            layout="prev, pager, next"
            small
            @current-change="fetchConversations"
          />
        </div>
      </div>

      <!-- ② 中间: 聊天消息区 -->
      <div class="chat-main">
        <template v-if="selectedConv">
          <div class="chat-main-header">
            <div class="chat-title">
              <span>{{ selectedConv.fromUserName || selectedConv.fromUserId }}</span>
              <span v-if="selectedConv.roomId" class="chat-room-label">群聊</span>
              <span class="chat-subtitle">共 {{ msgTotal }} 条消息</span>
            </div>
            <div class="chat-actions">
              <el-tooltip content="在消息中搜索" placement="top">
                <el-button link size="small" @click="chatSearchVisible = !chatSearchVisible">
                  <el-icon><Search /></el-icon>
                </el-button>
              </el-tooltip>
              <el-button link type="primary" size="small" @click="refreshMessages">
                <el-icon><Refresh /></el-icon>
              </el-button>
              <el-tooltip content="快捷功能" placement="top">
                <el-button link size="small" @click="actionPanelVisible = !actionPanelVisible">
                  <el-icon><Operation /></el-icon>
                </el-button>
              </el-tooltip>
            </div>
          </div>

          <!-- 消息内搜索栏（可折叠） -->
          <div v-if="chatSearchVisible" class="chat-inline-search">
            <el-input v-model="chatInlineKeyword" placeholder="搜索消息内容..." size="small" clearable style="flex:1" @keyup.enter="doChatInlineSearch" />
            <el-button size="small" type="primary" @click="doChatInlineSearch">搜索</el-button>
            <el-button size="small" @click="chatSearchVisible = false; chatInlineKeyword = ''">关闭</el-button>
          </div>

          <div class="chat-messages" ref="chatMessagesRef" v-loading="msgLoading">
            <!-- 加载更多按钮 -->
            <div v-if="msgPage > 1 || (msgTotal > messages.length)" class="load-more">
              <el-button link type="primary" @click="loadMoreMessages" :loading="msgLoadingMore">
                {{ msgLoadingMore ? '加载中...' : '⬆ 加载更早消息' }}
              </el-button>
            </div>

            <!-- 日期分割线 + 消息 -->
            <template v-for="(msg, idx) in messages" :key="msg.id">
              <div v-if="showDateDivider(idx)" class="msg-date-divider">
                <span>{{ getDateDividerText(msg.msgTime) }}</span>
              </div>
              <div class="msg-row" :class="{ 'msg-row-self': isSelfMsg(msg) }">
                <div class="msg-avatar-wrapper" v-if="!isSelfMsg(msg)">
                  <div class="msg-avatar">{{ String.fromCodePoint(0x1F464) }}</div>
                </div>
                <div class="msg-body" :class="{ 'msg-body-self': isSelfMsg(msg) }">
                  <div class="msg-sender" v-if="!isSelfMsg(msg)">
                    {{ msg.fromUserName || msg.fromUserId }}
                    <span class="msg-time-inline">{{ formatMsgTimeShort(msg.msgTime) }}</span>
                  </div>
                  <div class="msg-sender msg-sender-self" v-else>
                    <span class="msg-time-inline">{{ formatMsgTimeShort(msg.msgTime) }}</span>
                    {{ msg.fromUserName || msg.fromUserId }}
                  </div>
                  <div class="msg-bubble" :class="{ 'msg-bubble-self': isSelfMsg(msg), 'msg-bubble-sensitive': msg.isSensitive }">
                    <template v-if="msg.msgType === 'text'">{{ getTextContent(msg.content) }}</template>
                    <template v-else-if="msg.msgType === 'meta'">
                      <div class="msg-meta-info">
                        <el-icon><InfoFilled /></el-icon>
                        <span>{{ getMetaSummary(msg.content) }}</span>
                        <el-tag v-if="getMetaAgreed(msg.content)" type="success" size="small" style="margin-left:6px">已同意存档</el-tag>
                        <el-tag v-else type="warning" size="small" style="margin-left:6px">未同意存档</el-tag>
                      </div>
                    </template>
                    <template v-else-if="msg.msgType === 'image'">
                      <el-image v-if="msg.mediaUrl" :src="msg.mediaUrl" :preview-src-list="[msg.mediaUrl]" fit="contain" style="max-width:200px;max-height:200px;border-radius:4px" />
                      <span v-else class="msg-placeholder">[图片]</span>
                    </template>
                    <template v-else-if="msg.msgType === 'voice'"><span>{{ String.fromCodePoint(0x1F3B5) }} [语音消息]</span></template>
                    <template v-else-if="msg.msgType === 'video'"><span>{{ String.fromCodePoint(0x1F3AC) }} [视频消息]</span></template>
                    <template v-else-if="msg.msgType === 'file'"><span>{{ String.fromCodePoint(0x1F4CE) }} {{ msg.fileName || '[文件]' }}</span></template>
                    <template v-else-if="msg.msgType === 'link'"><span>{{ String.fromCodePoint(0x1F517) }} [链接消息]</span></template>
                    <template v-else-if="msg.msgType === 'weapp'"><span>{{ String.fromCodePoint(0x1F4F1) }} [小程序消息]</span></template>
                    <template v-else-if="msg.msgType === 'location'"><span>{{ String.fromCodePoint(0x1F4CD) }} [位置消息]</span></template>
                    <template v-else><span>[{{ getMsgTypeText(msg.msgType) }}]</span></template>
                  </div>
                  <div class="msg-flags" v-if="msg.isSensitive || msg.auditRemark">
                    <el-tag v-if="msg.isSensitive" type="danger" size="small" effect="dark">敏感</el-tag>
                    <el-tooltip v-if="msg.auditRemark" :content="msg.auditRemark" placement="top">
                      <el-tag type="warning" size="small">质检备注</el-tag>
                    </el-tooltip>
                  </div>
                </div>
                <div class="msg-avatar-wrapper" v-if="isSelfMsg(msg)">
                  <div class="msg-avatar msg-avatar-self">{{ String.fromCodePoint(0x1F9D1) }}</div>
                </div>
              </div>
            </template>

            <div v-if="messages.length === 0 && !msgLoading" class="empty-messages">
              <el-empty description="暂无消息" :image-size="60" />
            </div>
          </div>
        </template>

        <div v-else class="chat-placeholder">
          <el-empty :image-size="80">
            <template #description>
              <p style="color:#909399;font-size:14px">选择左侧客户以查看聊天记录</p>
              <p style="color:#c0c4cc;font-size:12px;margin-top:4px">先选择成员，再选择客户查看对话</p>
            </template>
          </el-empty>
        </div>
      </div>

      <!-- ③ 右栏: 快捷功能面板 -->
      <div class="chat-action-panel" :class="{ visible: actionPanelVisible && selectedConv }">
        <template v-if="selectedConv">
          <div class="action-panel-header">
            <span>快捷功能</span>
            <el-button link size="small" @click="actionPanelVisible = false">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
          <div class="action-panel-body">
            <!-- 客户信息 -->
            <div class="action-section">
              <div class="action-section-title">客户信息</div>
              <div class="action-profile">
                <div class="action-avatar">{{ String.fromCodePoint(0x1F464) }}</div>
                <div class="action-name">{{ selectedConv.fromUserName || selectedConv.fromUserId }}</div>
                <div class="action-id">ID: {{ selectedConv.fromUserId }}</div>
              </div>
            </div>

            <!-- 会话统计 -->
            <div class="action-section">
              <div class="action-section-title">会话概况</div>
              <div class="action-stats">
                <div class="action-stat-item">
                  <div class="action-stat-val">{{ msgTotal }}</div>
                  <div class="action-stat-label">消息数</div>
                </div>
                <div class="action-stat-item">
                  <div class="action-stat-val">{{ selectedConv.msgCount || 0 }}</div>
                  <div class="action-stat-label">对话轮次</div>
                </div>
              </div>
            </div>

            <!-- 质检操作 -->
            <div class="action-section">
              <div class="action-section-title">质检操作</div>
              <div class="action-buttons">
                <el-button type="warning" size="small" @click="handleAuditFromChat" style="width:100%">
                  <el-icon><EditPen /></el-icon> 标记质检
                </el-button>
                <el-button type="danger" size="small" plain @click="handleMarkSensitive" style="width:100%">
                  <el-icon><Warning /></el-icon> 标记敏感
                </el-button>
              </div>
            </div>

            <!-- 对话成员 -->
            <div class="action-section">
              <div class="action-section-title">对话成员</div>
              <div class="action-member-row">
                <span class="action-member-icon">{{ String.fromCodePoint(0x1F464) }}</span>
                <span class="action-member-name">{{ selectedConv.fromUserName || selectedConv.fromUserId }}</span>
                <el-tag size="small" type="info">客户</el-tag>
              </div>
              <div class="action-member-row" v-if="getFirstToUser(selectedConv.toUserIds)">
                <span class="action-member-icon">{{ String.fromCodePoint(0x1F9D1) }}</span>
                <span class="action-member-name">{{ getFirstToUser(selectedConv.toUserIds) }}</span>
                <el-tag size="small" type="success">员工</el-tag>
              </div>
            </div>

            <!-- 更多操作 -->
            <div class="action-section">
              <div class="action-section-title">更多操作</div>
              <div class="action-buttons">
                <el-button size="small" @click="exportConvHandler" style="width:100%">
                  <el-icon><Download /></el-icon> 导出记录
                </el-button>
              </div>
            </div>
          </div>
        </template>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted } from 'vue'
import { Search, Refresh, User, Close, InfoFilled, EditPen, Download, Warning, Operation, DArrowLeft, DArrowRight, ArrowRight, Folder, OfficeBuilding } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getConversationList, getConversationMessages, getArchiveSeats, auditChatRecord, getWecomDepartments, getWecomUsers } from '@/api/wecom'
import { formatConvTime, formatMsgTimeShort, formatMsgTime, getMsgTypeText, getTextContent, getMetaSummary, getMetaAgreed, getFirstToUser, getDateDividerText } from '../utils'
import type { Conversation, ConvMessage } from '../types'
import { useUserStore } from '@/stores/user'
import api from '@/utils/request'

defineOptions({ name: 'ConversationView' })

const props = defineProps<{
  configId: number | null
}>()

const emit = defineEmits<{
  (e: 'audit', record: ConvMessage): void
}>()

// 当前用户角色
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser)
const currentUserRole = computed(() => currentUser.value?.role || '')
const isAdminRole = computed(() => ['super_admin', 'admin'].includes(currentUserRole.value))
const isManagerRole = computed(() => ['department_manager', 'manager'].includes(currentUserRole.value))

// 部门成员CRM ID列表（经理角色用于范围过滤）
const deptMemberCrmIds = ref<string[]>([])

// 成员面板
const memberPanelCollapsed = ref(false)
const memberSearch = ref('')
const memberLoading = ref(false)
const archiveMembers = ref<any[]>([])
const departments = ref<any[]>([])
const selectedMemberId = ref('')
const selectedMemberName = ref('')
const selectedDeptId = ref<number | null>(null)
const expandedDepts = ref(new Set<number>())

// 按角色过滤可见的存档成员
// 管理员：全部 | 经理：本部门成员绑定的企微 | 其他：仅自己绑定的企微
const visibleArchiveMembers = computed(() => {
  if (isAdminRole.value) return archiveMembers.value
  if (isManagerRole.value) {
    return archiveMembers.value.filter((m: any) =>
      m.crmUserId && deptMemberCrmIds.value.includes(m.crmUserId)
    )
  }
  // 普通用户：只看自己绑定的企微账号
  const myId = currentUser.value?.id
  return archiveMembers.value.filter((m: any) => m.crmUserId === myId)
})

// 会话列表
const convSearch = ref('')
const convMsgTypeFilter = ref('')
const convStartDate = ref('')
const convEndDate = ref('')
const conversations = ref<Conversation[]>([])
const convLoading = ref(false)
const convPage = ref(1)
const convPageSize = ref(50)
const convTotal = ref(0)
const selectedConv = ref<Conversation | null>(null)

// 消息
const messages = ref<ConvMessage[]>([])
const msgLoading = ref(false)
const msgLoadingMore = ref(false)
const msgPage = ref(1)
const msgPageSize = ref(50)
const msgTotal = ref(0)
const chatMessagesRef = ref<HTMLElement | null>(null)
const actionPanelVisible = ref(true)
const chatSearchVisible = ref(false)
const chatInlineKeyword = ref('')

const filteredDepartments = computed(() => {
  // 先过滤掉没有可见成员的部门
  const deptsWithVisibleMembers = departments.value.filter((d: any) => getDeptMemberCount(d.id) > 0)
  if (!memberSearch.value) return deptsWithVisibleMembers
  const kw = memberSearch.value.toLowerCase()
  return deptsWithVisibleMembers.filter((d: any) =>
    (d.name || '').toLowerCase().includes(kw) ||
    getDeptMembers(d.id).some((m: any) => (m.name || '').toLowerCase().includes(kw) || (m.wecomUserId || '').toLowerCase().includes(kw))
  )
})

const getDeptMembers = (deptId: number) => {
  if (!memberSearch.value) {
    return visibleArchiveMembers.value.filter((m: any) => {
      const deptIds = m.departmentIds || m.department || ''
      return String(deptIds).includes(String(deptId))
    })
  }
  const kw = memberSearch.value.toLowerCase()
  return visibleArchiveMembers.value.filter((m: any) => {
    const deptIds = m.departmentIds || m.department || ''
    const inDept = String(deptIds).includes(String(deptId))
    const matchSearch = (m.name || '').toLowerCase().includes(kw) || (m.wecomUserId || '').toLowerCase().includes(kw)
    return inDept && matchSearch
  })
}

const getDeptMemberCount = (deptId: number) => {
  return visibleArchiveMembers.value.filter((m: any) => {
    const deptIds = m.departmentIds || m.department || ''
    return String(deptIds).includes(String(deptId))
  }).length
}

const ungroupedMembers = computed(() => {
  if (departments.value.length === 0) return visibleArchiveMembers.value
  return visibleArchiveMembers.value.filter((m: any) => {
    const deptIds = m.departmentIds || m.department || ''
    return !deptIds || String(deptIds).trim() === ''
  })
})

const toggleDeptExpand = (deptId: number) => {
  const s = new Set(expandedDepts.value)
  if (s.has(deptId)) s.delete(deptId)
  else s.add(deptId)
  expandedDepts.value = s
}

const handleSelectAll = () => {
  selectedDeptId.value = null
  selectedMemberId.value = ''
  selectedMemberName.value = ''
  selectedConv.value = null
  messages.value = []
  convPage.value = 1
  fetchConversations()
}

const handleSelectDept = (dept: any) => {
  selectedDeptId.value = dept.id
  selectedMemberId.value = ''
  selectedMemberName.value = dept.name + '(部门)'
  selectedConv.value = null
  messages.value = []
  convPage.value = 1
  // Auto expand
  const s = new Set(expandedDepts.value)
  s.add(dept.id)
  expandedDepts.value = s
  fetchConversations()
}

// ==================== 成员面板 ====================

// 加载经理角色的部门成员列表（用于范围过滤）
const loadScopeMembers = async () => {
  if (isAdminRole.value) return
  if (isManagerRole.value) {
    try {
      const res = (await api.get('/users/department-members')) as any
      const members = res?.data || res || []
      // 收集本部门所有CRM用户ID（包括自己）
      deptMemberCrmIds.value = members.map((m: any) => m.userId || m.id).filter(Boolean)
      // 确保包含自己
      const myId = currentUser.value?.id
      if (myId && !deptMemberCrmIds.value.includes(myId)) {
        deptMemberCrmIds.value.push(myId)
      }
    } catch {
      deptMemberCrmIds.value = []
    }
  }
}

const fetchArchiveMembers = async () => {
  if (!props.configId) return
  memberLoading.value = true
  try {
    // 先加载范围成员（经理需要知道部门成员列表来过滤）
    await loadScopeMembers()
    const [seatRes, deptRes] = await Promise.allSettled([
      getArchiveSeats(props.configId),
      getWecomDepartments(props.configId)
    ])
    if (seatRes.status === 'fulfilled') {
      archiveMembers.value = (seatRes.value as any)?.members || []
    }
    if (deptRes.status === 'fulfilled') {
      departments.value = Array.isArray(deptRes.value) ? deptRes.value : []
    }
  } catch {
    archiveMembers.value = []
    departments.value = []
  } finally {
    memberLoading.value = false
  }
}

const selectMember = (member: any) => {
  selectedMemberId.value = member.wecomUserId
  selectedMemberName.value = member.name || member.wecomUserId
  selectedConv.value = null
  messages.value = []
  convPage.value = 1
  fetchConversations()
}

// ==================== 会话列表 ====================

const getConvPreview = (conv: Conversation) => {
  if (!conv.lastContent) return ''
  const type = conv.lastMsgType
  if (type === 'meta') return getMetaSummary(conv.lastContent).substring(0, 30)
  if (type && type !== 'text') return `[${getMsgTypeText(type)}]`
  return getTextContent(conv.lastContent).substring(0, 30)
}

const isActiveConv = (conv: Conversation) => {
  if (!selectedConv.value) return false
  return selectedConv.value.fromUserId === conv.fromUserId &&
    (selectedConv.value.roomId || '') === (conv.roomId || '') &&
    getFirstToUser(selectedConv.value.toUserIds) === getFirstToUser(conv.toUserIds)
}

const isSelfMsg = (msg: ConvMessage) => {
  if (!selectedConv.value) return false
  return msg.fromUserId !== selectedConv.value.fromUserId
}

const resetConvSearch = () => {
  convSearch.value = ''
  convMsgTypeFilter.value = ''
  convStartDate.value = ''
  convEndDate.value = ''
  convPage.value = 1
  fetchConversations()
}

const fetchConversations = async () => {
  convLoading.value = true
  try {
    // Build userId param: if a dept is selected without specific member, get all dept member IDs
    let userIdParam = selectedMemberId.value || undefined
    if (!userIdParam && selectedDeptId.value) {
      const deptMembers = selectedDeptId.value === -1
        ? ungroupedMembers.value
        : getDeptMembers(selectedDeptId.value)
      if (deptMembers.length > 0) {
        userIdParam = deptMembers.map((m: any) => m.wecomUserId).join(',')
      }
    }
    // 非管理员且未选择具体成员时，限制为可见成员范围
    if (!userIdParam && !isAdminRole.value && visibleArchiveMembers.value.length > 0) {
      userIdParam = visibleArchiveMembers.value.map((m: any) => m.wecomUserId).join(',')
    }
    const res: any = await getConversationList({
      configId: props.configId || undefined,
      userId: userIdParam,
      keyword: convSearch.value || undefined,
      page: convPage.value,
      pageSize: convPageSize.value
    })
    if (res?.list) {
      conversations.value = res.list
      convTotal.value = res.total || 0
    } else {
      conversations.value = []
      convTotal.value = 0
    }
  } catch (e) {
    console.error('[ConversationView] Fetch conversations error:', e)
    conversations.value = []
    convTotal.value = 0
  } finally {
    convLoading.value = false
  }
}

const selectConversation = async (conv: Conversation) => {
  selectedConv.value = conv
  msgPage.value = 1
  messages.value = []
  await fetchMessages()
}

const fetchMessages = async () => {
  if (!selectedConv.value) return
  msgLoading.value = true
  try {
    const toUserId = getFirstToUser(selectedConv.value.toUserIds)
    const res: any = await getConversationMessages({
      configId: props.configId || undefined,
      fromUserId: selectedConv.value.fromUserId,
      toUserId,
      roomId: selectedConv.value.roomId || undefined,
      page: msgPage.value,
      pageSize: msgPageSize.value
    })
    if (res?.list) {
      messages.value = res.list
      msgTotal.value = res.total || 0
    } else {
      messages.value = []
      msgTotal.value = 0
    }
    await nextTick()
    scrollToBottom()
  } catch (e) {
    console.error('[ConversationView] Fetch messages error:', e)
    messages.value = []
    msgTotal.value = 0
  } finally {
    msgLoading.value = false
  }
}

const loadMoreMessages = async () => {
  if (messages.value.length >= msgTotal.value) return
  msgLoadingMore.value = true
  try {
    msgPage.value++
    const toUserId = getFirstToUser(selectedConv.value!.toUserIds)
    const res: any = await getConversationMessages({
      configId: props.configId || undefined,
      fromUserId: selectedConv.value!.fromUserId,
      toUserId,
      roomId: selectedConv.value!.roomId || undefined,
      page: msgPage.value,
      pageSize: msgPageSize.value
    })
    if (res?.list?.length) {
      messages.value = [...res.list, ...messages.value]
    }
  } catch (e) {
    console.error('[ConversationView] Load more error:', e)
    msgPage.value--
  } finally {
    msgLoadingMore.value = false
  }
}

const refreshMessages = () => {
  msgPage.value = 1
  fetchMessages()
}

const scrollToBottom = () => {
  if (chatMessagesRef.value) {
    chatMessagesRef.value.scrollTop = chatMessagesRef.value.scrollHeight
  }
}

const showDateDivider = (idx: number) => {
  if (idx === 0) return true
  const cur = messages.value[idx]
  const prev = messages.value[idx - 1]
  if (!cur?.msgTime || !prev?.msgTime) return false
  const toTs = (v: number | string) => typeof v === 'string' ? parseInt(v) : v
  return new Date(toTs(cur.msgTime)).toDateString() !== new Date(toTs(prev.msgTime)).toDateString()
}

const doChatInlineSearch = () => {
  if (!chatInlineKeyword.value.trim()) return
  // Filter messages client-side
  const kw = chatInlineKeyword.value.toLowerCase()
  const el = chatMessagesRef.value
  if (!el) return
  const found = messages.value.findIndex(m => {
    if (m.msgType === 'text') {
      return getTextContent(m.content).toLowerCase().includes(kw)
    }
    return false
  })
  if (found >= 0) {
    const rows = el.querySelectorAll('.msg-row')
    if (rows[found]) {
      rows[found].scrollIntoView({ behavior: 'smooth', block: 'center' })
      ;(rows[found] as HTMLElement).style.background = '#fef9c3'
      setTimeout(() => { (rows[found] as HTMLElement).style.background = '' }, 2000)
    }
  } else {
    ElMessage.info('未找到匹配消息')
  }
}

// ==================== 快捷操作 ====================

const handleAuditFromChat = () => {
  if (messages.value.length > 0) {
    emit('audit', messages.value[messages.value.length - 1])
  }
}

const handleMarkSensitive = async () => {
  if (messages.value.length === 0) return
  const lastMsg = messages.value[messages.value.length - 1]
  try {
    await auditChatRecord(lastMsg.id, { isSensitive: true, auditRemark: '手动标记敏感' })
    ElMessage.success('已标记为敏感')
    refreshMessages()
  } catch (e: any) {
    ElMessage.error(e?.message || '标记失败')
  }
}

const exportConvHandler = () => {
  if (!selectedConv.value || messages.value.length === 0) {
    ElMessage.warning('暂无消息可导出')
    return
  }
  const lines = messages.value.map(m => {
    const time = formatMsgTime(m.msgTime)
    const sender = m.fromUserName || m.fromUserId
    const content = m.msgType === 'text' ? getTextContent(m.content) : `[${getMsgTypeText(m.msgType)}]`
    return `[${time}] ${sender}: ${content}`
  })
  const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const name = selectedConv.value.fromUserName || selectedConv.value.fromUserId
  a.download = `chat_${name}_${new Date().toISOString().slice(0, 10)}.txt`
  a.click()
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchArchiveMembers()
})

defineExpose({ fetchConversations })
</script>

<style scoped lang="scss">
/* 顶部筛选搜索栏 */
.conv-toolbar {
  display: flex; align-items: center; gap: 10px; flex-wrap: wrap;
  margin-bottom: 12px; padding: 10px 14px; background: #fff;
  border: 1px solid #e4e7ed; border-radius: 8px 8px 0 0;
}
.conv-count-label { font-size: 12px; color: #909399; white-space: nowrap; }

.chat-container {
  display: flex; height: calc(100vh - 340px); min-height: 500px;
  border: 1px solid #e4e7ed; border-top: none; border-radius: 0 0 8px 8px; overflow: hidden;
}

/* ⓪ 成员面板 */
.member-panel {
  width: 180px; min-width: 44px; background: #f0f2f5; border-right: 1px solid #e4e7ed;
  display: flex; flex-direction: column; transition: width 0.25s ease; overflow: hidden;
  &.collapsed { width: 44px; min-width: 44px; }
}
.member-panel-toggle {
  display: flex; align-items: center; gap: 6px; padding: 10px 12px;
  cursor: pointer; color: #606266; font-size: 13px; border-bottom: 1px solid #e4e7ed;
  background: #ebedf0; transition: background 0.15s;
  &:hover { background: #dcdfe6; }
}
.toggle-text { font-weight: 600; white-space: nowrap; }
.member-panel-header { padding: 10px 12px 6px; }
.member-panel-title { font-size: 13px; font-weight: 600; color: #303133; }
.member-panel-list { flex: 1; overflow-y: auto; }
.empty-member { padding: 20px 0; }
.member-item {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px;
  cursor: pointer; border-bottom: 1px solid #ebedf0; transition: background 0.15s;
  &:hover { background: #e4e7ed; }
  &.active { background: #d4e8fc; border-left: 3px solid #409EFF; padding-left: 9px; }
}
.member-avatar-wrap {
  width: 32px; height: 32px; border-radius: 50%; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.member-avatar-icon { color: #fff; font-size: 14px; font-weight: 600; }
.member-name { font-size: 13px; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

/* 部门树样式 */
.dept-all-item {
  font-weight: 600;
  color: #409EFF;
  gap: 6px;
  .el-icon { font-size: 16px; }
}
.dept-item {
  display: flex; align-items: center; gap: 6px; padding: 7px 12px;
  cursor: pointer; border-bottom: 1px solid #ebedf0; font-size: 13px; color: #303133; transition: background 0.15s;
  &:hover { background: #e4e7ed; }
  &.active { background: #e6f7ff; border-left: 3px solid #409EFF; padding-left: 9px; }
}
.dept-expand-icon {
  font-size: 12px; transition: transform 0.2s; color: #909399; flex-shrink: 0;
  &.expanded { transform: rotate(90deg); }
}
.dept-name { flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.dept-count { font-size: 11px; color: #c0c4cc; background: #f0f2f5; padding: 1px 6px; border-radius: 10px; }
.member-indent { padding-left: 36px; }
.empty-dept-hint { padding: 8px 36px; font-size: 12px; color: #c0c4cc; }

/* ① 左栏：客户会话列表 */
.chat-sidebar { width: 280px; min-width: 240px; border-right: 1px solid #e4e7ed; display: flex; flex-direction: column; background: #f7f8fa; }
.chat-sidebar-header {
  padding: 10px 14px; background: #fff; border-bottom: 1px solid #e4e7ed;
  display: flex; align-items: center; gap: 6px; font-size: 13px; font-weight: 600; color: #409EFF;
}
.chat-sidebar-list { flex: 1; overflow-y: auto; }
.chat-sidebar-footer { padding: 6px; border-top: 1px solid #e4e7ed; background: #fff; display: flex; justify-content: center; }
.empty-conv { padding: 40px 0; }

.conv-item {
  display: flex; align-items: center; gap: 10px; padding: 12px 14px;
  cursor: pointer; border-bottom: 1px solid #f0f1f3; transition: background 0.15s;
  &:hover { background: #eef0f3; }
  &.active { background: #e6f7ef; border-left: 3px solid #07c160; padding-left: 11px; }
}
.conv-avatar { width: 40px; height: 40px; border-radius: 4px; background: #e4e7ed; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.conv-info { flex: 1; min-width: 0; }
.conv-name { font-size: 14px; font-weight: 500; color: #303133; margin-bottom: 2px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-room { font-size: 12px; color: #909399; font-weight: 400; }
.conv-preview { font-size: 12px; color: #909399; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.conv-time-line { font-size: 11px; color: #c0c4cc; margin-top: 2px; }
.conv-meta { flex-shrink: 0; text-align: right; }
.conv-badge { :deep(.el-badge__content) { font-size: 10px; } }

/* ② 中间：消息主区 */
.chat-main { flex: 1; display: flex; flex-direction: column; background: #fff; min-width: 0; }
.chat-main-header { padding: 10px 16px; border-bottom: 1px solid #e4e7ed; display: flex; justify-content: space-between; align-items: center; background: #fff; }
.chat-title { display: flex; align-items: center; gap: 8px; span:first-child { font-size: 15px; font-weight: 600; color: #303133; } }
.chat-room-label { font-size: 11px; color: #909399; background: #f0f2f5; padding: 2px 6px; border-radius: 4px; }
.chat-subtitle { font-size: 12px; color: #c0c4cc; font-weight: 400 !important; }
.chat-actions { display: flex; gap: 4px; }

/* 消息内搜索栏 */
.chat-inline-search { display: flex; gap: 8px; padding: 8px 16px; background: #fafbfc; border-bottom: 1px solid #e4e7ed; }

.chat-messages { flex: 1; overflow-y: auto; padding: 16px 20px; background: #ebebeb; }
.load-more { text-align: center; padding: 6px 0 12px; }
.empty-messages { display: flex; align-items: center; justify-content: center; height: 100%; }
.chat-placeholder { flex: 1; display: flex; align-items: center; justify-content: center; background: #f5f6f7; }

/* 日期分割线 */
.msg-date-divider { text-align: center; margin: 16px 0 12px; span { display: inline-block; background: rgba(0,0,0,0.06); color: #909399; font-size: 11px; padding: 3px 10px; border-radius: 3px; } }

/* 消息气泡 */
.msg-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 14px; &.msg-row-self { flex-direction: row-reverse; } }
.msg-avatar-wrapper { flex-shrink: 0; }
.msg-avatar { width: 36px; height: 36px; border-radius: 4px; background: #e4e7ed; display: flex; align-items: center; justify-content: center; font-size: 16px; }
.msg-avatar-self { background: #d4edda; }
.msg-body { max-width: 60%; min-width: 0; }
.msg-body-self { text-align: right; }
.msg-sender { font-size: 12px; color: #909399; margin-bottom: 3px; }
.msg-sender-self { text-align: right; }
.msg-time-inline { color: #c0c4cc; font-size: 11px; margin: 0 4px; }

.msg-bubble {
  display: inline-block; text-align: left; padding: 9px 13px; background: #fff;
  border-radius: 0 8px 8px 8px; font-size: 14px; line-height: 1.5; color: #303133;
  word-break: break-word; box-shadow: 0 1px 2px rgba(0,0,0,0.04); max-width: 100%; position: relative;
}
.msg-bubble-self { background: #95ec69; color: #000; border-radius: 8px 0 8px 8px; }
.msg-bubble-sensitive { border: 1px solid #f56c6c; background: #fef0f0; &.msg-bubble-self { background: #fef0f0; color: #303133; } }
.msg-placeholder { color: #909399; font-style: italic; }
.msg-flags { display: flex; gap: 4px; margin-top: 4px; .msg-body-self & { justify-content: flex-end; } }
.msg-meta-info { display: flex; align-items: center; gap: 6px; color: #909399; font-size: 13px; font-style: italic; }

/* ③ 右栏：快捷功能面板 */
.chat-action-panel {
  width: 0; overflow: hidden; transition: width 0.25s ease;
  border-left: 1px solid #e4e7ed; background: #fafbfc; display: flex; flex-direction: column;
  &.visible { width: 260px; min-width: 240px; }
}
.action-panel-header {
  display: flex; justify-content: space-between; align-items: center;
  padding: 12px 14px; border-bottom: 1px solid #e4e7ed; background: #fff;
  font-size: 14px; font-weight: 600; color: #303133;
}
.action-panel-body { flex: 1; overflow-y: auto; padding: 16px 14px; }
.action-section { margin-bottom: 18px; }
.action-section-title { font-size: 12px; color: #909399; font-weight: 600; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 0.5px; }

.action-profile { text-align: center; margin-bottom: 12px; }
.action-avatar {
  width: 50px; height: 50px; border-radius: 50%; background: #e4e7ed;
  display: inline-flex; align-items: center; justify-content: center; font-size: 24px; margin-bottom: 6px;
}
.action-name { font-size: 14px; font-weight: 600; color: #303133; }
.action-id { font-size: 11px; color: #c0c4cc; margin-top: 2px; }

.action-stats { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.action-stat-item { text-align: center; padding: 10px 6px; background: #fff; border-radius: 8px; border: 1px solid #f0f1f3; }
.action-stat-val { font-size: 18px; font-weight: 700; color: #303133; }
.action-stat-label { font-size: 11px; color: #909399; margin-top: 2px; }

.action-buttons { display: flex; flex-direction: column; gap: 8px; }

.action-member-row {
  display: flex; align-items: center; gap: 8px; padding: 6px 0;
  border-bottom: 1px solid #f2f3f5;
  &:last-child { border-bottom: none; }
}
.action-member-icon { font-size: 16px; }
.action-member-name { flex: 1; font-size: 13px; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>

