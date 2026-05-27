<template>
  <div class="conv-view">
    <div class="conv-layout">
      <!-- 第一栏：存档员工列表 -->
      <div class="panel-members">
        <div class="panel-members-header">
          <div class="members-title">
            <span>存档员工</span>
            <span class="members-count">{{ visibleArchiveMembers.length }}</span>
          </div>
          <el-input v-model="memberSearch" placeholder="搜索员工" clearable size="small" prefix-icon="Search" />
        </div>
        <div class="panel-members-list" v-loading="memberLoading">
          <div
            v-for="member in filteredMembers"
            :key="member.wecomUserId"
            class="member-card"
            :class="{ active: selectedMemberId === member.wecomUserId }"
            @click="selectMember(member)"
          >
            <div class="member-card-avatar">
              <img referrerpolicy="no-referrer" v-if="isValidAvatar(member.avatar)" :src="member.avatar" class="avatar-img" />
              <span v-else class="avatar-letter">{{ (member.name || member.wecomUserId).charAt(0) }}</span>
            </div>
            <div class="member-card-info">
              <div class="member-card-name">{{ member.name || member.wecomUserId }}</div>
              <div class="member-card-time" v-if="member.lastActiveTime">{{ formatShortTime(member.lastActiveTime) }}</div>
            </div>
          </div>
          <el-empty v-if="filteredMembers.length === 0 && !memberLoading" description="暂无存档员工" :image-size="40" />
        </div>
      </div>

      <!-- 第二栏：会话列表 -->
      <div class="panel-conversations">
        <div class="panel-conv-header">
          <div class="conv-header-member" v-if="selectedMemberId">
            <div class="conv-header-avatar">
              <img referrerpolicy="no-referrer" v-if="selectedMemberAvatar" :src="selectedMemberAvatar" class="avatar-img" />
              <span v-else class="avatar-letter">{{ (selectedMemberName || 'M').charAt(0) }}</span>
            </div>
            <span class="conv-header-name">{{ selectedMemberName }} 的会话</span>
          </div>
          <div v-else class="conv-header-placeholder">请选择员工</div>
          <!-- TAB: 员工/客户/群聊 + 刷新按钮 -->
          <div class="conv-tabs">
            <div class="conv-tab" :class="{ active: convTab === 'staff' }" @click="switchConvTab('staff')">
              <span>员工</span>
              <span class="tab-count" v-if="convTabCounts.staff">{{ convTabCounts.staff }}</span>
            </div>
            <div class="conv-tab" :class="{ active: convTab === 'customer' }" @click="switchConvTab('customer')">
              <span>客户</span>
              <span class="tab-count" v-if="convTabCounts.customer">{{ convTabCounts.customer }}</span>
            </div>
            <div class="conv-tab" :class="{ active: convTab === 'group' }" @click="switchConvTab('group')">
              <span>群聊</span>
              <span class="tab-count" v-if="convTabCounts.group">{{ convTabCounts.group }}</span>
            </div>
            <div class="conv-tab-refresh" @click="handleRefreshConversations" title="刷新当前成员的会话列表">
              <el-icon :class="{ 'is-loading': convLoading }"><Refresh /></el-icon>
            </div>
          </div>
          <!-- 搜索 -->
          <el-input v-model="convSearch" placeholder="搜索会话" clearable size="small" prefix-icon="Search" style="margin: 8px 12px 4px; width: calc(100% - 24px); box-sizing: border-box;" @keyup.enter="fetchConversations" @clear="fetchConversations" />
        </div>
        <div class="panel-conv-list" ref="convListRef" v-loading="convLoading" @scroll="handleConvScroll">
          <div v-if="conversations.length === 0 && !convLoading" class="empty-conv">
            <el-empty :description="selectedMemberId ? '暂无会话' : '请先选择员工'" :image-size="50" />
          </div>
          <div
            v-for="conv in conversations"
            :key="getConvKey(conv)"
            class="conv-card"
            :class="{ active: isActiveConv(conv) }"
            @click="selectConversation(conv)"
          >
            <div class="conv-card-avatar">
              <img referrerpolicy="no-referrer" v-if="(conv as any).customerAvatar" :src="(conv as any).customerAvatar" class="avatar-img" />
              <span v-else class="avatar-letter" :class="getAvatarColorClass(conv)">{{ getConvAvatarLetter(conv) }}</span>
            </div>
            <div class="conv-card-body">
              <div class="conv-card-top">
                <span class="conv-card-name">{{ getConvDisplayName(conv) }}</span>
                <span class="conv-card-tag tag-wechat" v-if="isWechatCustomer(conv)">@微信</span>
                <span class="conv-card-tag tag-corp" v-else-if="isCorpCustomer(conv)">@{{ getCorpShortName(conv) }}</span>
                <span class="conv-card-tag tag-group-internal" v-if="conv.roomId && !isExternalGroup(conv)">内部群</span>
                <span class="conv-card-tag tag-group-external" v-else-if="conv.roomId && isExternalGroup(conv)">外部群</span>
                <span class="conv-card-time">{{ conv.lastMsgTime ? formatConvTime(conv.lastMsgTime) : '' }}</span>
              </div>
              <div class="conv-card-bottom">
                <span class="conv-card-preview">{{ getConvPreview(conv) || '暂无消息' }}</span>
                <div class="conv-card-stats">
                  <span class="stat-today" v-if="(conv as any).todayCount">今{{ (conv as any).todayCount }}</span>
                  <span class="stat-total">{{ conv.msgCount || 0 }}</span>
                </div>
              </div>
            </div>
          </div>
          <div v-if="convLoading && conversations.length > 0" class="conv-loading-more">加载中...</div>
        </div>
      </div>

      <!-- 第三栏：消息详情 -->
      <div class="panel-messages">
        <template v-if="selectedConv">
          <!-- 消息头部 -->
          <div class="msg-panel-header">
            <div class="msg-header-left">
              <div class="msg-header-avatar">
                <img referrerpolicy="no-referrer" v-if="(selectedConv as any).customerAvatar" :src="(selectedConv as any).customerAvatar" class="avatar-img" />
                <span v-else class="avatar-letter">{{ getConvAvatarLetter(selectedConv) }}</span>
              </div>
              <div class="msg-header-info">
                <span class="msg-header-name">{{ getConvDisplayName(selectedConv) }}</span>
                <span v-if="isWechatCustomer(selectedConv)" class="msg-header-tag tag-wechat">@微信</span>
                <span v-else-if="isCorpCustomer(selectedConv)" class="msg-header-tag tag-corp">@{{ getCorpShortName(selectedConv) }}</span>
                <el-tag v-if="(selectedConv as any).agreed === true" type="success" size="small">已同意存档</el-tag>
                <el-tag v-else-if="(selectedConv as any).agreed === false" type="warning" size="small">客户未同意（仅员工消息）</el-tag>
                <el-tag v-else type="info" size="small">存档状态未知</el-tag>
              </div>
            </div>
            <div class="msg-header-right">
              <template v-if="sdkInitializing">
                <el-tag type="warning" size="small" effect="plain"><el-icon class="is-loading"><Loading /></el-icon> SDK初始化中</el-tag>
              </template>
              <template v-else-if="isWecomFailed">
                <el-tooltip :content="sdkInitError || 'SDK初始化失败'" placement="top">
                  <el-tag type="danger" size="small" effect="plain" @click="autoInitSdk" style="cursor:pointer">初始化失败(点击重试)</el-tag>
                </el-tooltip>
              </template>
              <template v-else-if="isWecomReady">
                <el-tag type="success" size="small" effect="plain">SDK就绪</el-tag>
              </template>
              <span class="msg-header-count">共 {{ msgTotal }} 条</span>
              <el-button v-if="isAdminRole || isManagerRole" type="danger" size="small" plain @click="openMarkRiskForConv" title="标记当前会话风险">
                <el-icon style="margin-right:2px"><WarningFilled /></el-icon>标记风险
              </el-button>
              <el-button link size="small" @click="refreshMessages"><el-icon><Refresh /></el-icon></el-button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="msg-panel-body" ref="chatMessagesRef" v-loading="msgLoading || sdkInitializing" @contextmenu.prevent="showPanelContextMenu">
            <!-- ★ 企微原生会话展示组件（密钥可用时，正式模式） -->
            <template v-if="isWecomReady && messageKeys.length > 0">
              <WecomMessageRenderer
                :msg-list="messageKeys"
                :loading="msgLoading"
                @load-more="loadMoreMessages"
                @error="handleWecomRenderError"
              />
            </template>

            <!-- 密钥为空 或 SDK未就绪：显示问题提示 -->
            <template v-else>
              <!-- SDK初始化失败 -->
              <div v-if="isWecomFailed" class="key-diagnose-panel">
                <el-result icon="warning" title="会话组件初始化失败" :sub-title="sdkInitError || '请确认在企业微信客户端内打开'">
                  <template #extra>
                    <el-button type="primary" @click="autoInitSdk">重新初始化</el-button>
                  </template>
                </el-result>
              </div>
              <!-- SDK就绪但密钥为空 -->
              <div v-else-if="isWecomReady && messageKeys.length === 0 && msgTotal > 0" class="key-diagnose-panel">
                <el-result icon="info" title="正在处理消息密钥">
                  <template #extra>
                    <div style="text-align:left;font-size:13px;color:#606266;line-height:2;max-width:400px">
                      <p>消息已同步但密钥尚未解密成功，请尝试：</p>
                      <p>1. 点击「同步」重新拉取并解密消息</p>
                      <p>2. 点击页面右上角「诊断」按钮查看RSA解密测试结果</p>
                    </div>
                  </template>
                </el-result>
              </div>
              <!-- 尚无消息记录 -->
              <div v-else-if="msgTotal === 0 && !msgLoading" class="key-diagnose-panel">
                <el-empty :image-size="50">
                  <template #description>
                    <p>暂无消息记录</p>
                    <p style="font-size:12px;color:#909399">请点击「同步」按钮拉取聊天记录</p>
                  </template>
                </el-empty>
              </div>
              <!-- SDK初始化中 -->
              <div v-else-if="sdkInitializing" class="key-diagnose-panel">
                <el-result icon="info" title="正在初始化会话组件..." sub-title="请稍候" />
              </div>
            </template>
          </div>
        </template>

        <div v-else class="msg-panel-empty">
          <el-empty :image-size="70">
            <template #description>
              <p>选择左侧会话查看聊天记录</p>
            </template>
          </el-empty>
        </div>
      </div>
    </div>

    <!-- 标记风险弹窗 -->
    <el-dialog v-model="markRiskVisible" title="标记风险" width="480px" destroy-on-close>
      <el-form label-width="80px">
        <el-form-item label="会话">
          <div class="mark-msg-preview">{{ selectedConv ? getConvDisplayName(selectedConv) : '-' }} ({{ markRiskMsg?.fromUserId }})</div>
        </el-form-item>
        <el-form-item label="风险类型" required>
          <el-select v-model="markRiskForm.riskType" placeholder="选择风险类型" style="width: 100%">
            <el-option label="敏感词" value="sensitive_word" />
            <el-option label="合规问题" value="compliance" />
            <el-option label="服务态度" value="attitude" />
            <el-option label="信息泄露" value="leak" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        <el-form-item label="风险等级">
          <el-radio-group v-model="markRiskForm.riskLevel">
            <el-radio label="low">低</el-radio>
            <el-radio label="medium">中</el-radio>
            <el-radio label="high">高</el-radio>
            <el-radio label="critical">严重</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="markRiskForm.remark" type="textarea" :rows="3" placeholder="描述风险点" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="markRiskVisible = false">取消</el-button>
        <el-button type="danger" @click="submitMarkRisk" :loading="markRiskSubmitting">提交标记</el-button>
      </template>
    </el-dialog>

    <!-- 右键菜单 -->
    <Teleport to="body">
      <div v-if="contextMenuVisible" class="msg-context-menu" :style="contextMenuStyle" @click.stop @mouseleave="contextMenuVisible = false">
        <div class="context-menu-item" @click="openMarkRiskForConv">
          <el-icon :size="14" color="#EF4444" style="margin-right:6px"><WarningFilled /></el-icon>标记风险
        </div>
        <div class="context-menu-item" @click="refreshMessages; contextMenuVisible = false">
          <el-icon :size="14" color="#409eff" style="margin-right:6px"><Refresh /></el-icon>刷新消息
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Search, Refresh, InfoFilled, WarningFilled, Microphone, VideoCamera, Document, Link, Grid, Location, User, Connection, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createAuditMark, getSensitiveWords } from '@/api/wecom'
import { getConversationList, getConversationMessages, getArchiveSeats, getMessageKeys, syncChatRecords } from '@/api/wecom'
import { formatConvTime, formatMsgTimeShort, getMsgTypeText, getTextContent, getFirstToUser, getDateDividerText } from '../utils'
import type { Conversation, ConvMessage } from '../types'
import { useUserStore } from '@/stores/user'
import api from '@/utils/request'
import WecomMessageRenderer from './WecomMessageRenderer.vue'
import { useWecomOpenData } from '../composables/useWecomOpenData'

defineOptions({ name: 'ConversationView' })

const props = defineProps<{ configId: number | null }>()
const emit = defineEmits<{ (e: 'audit', record: ConvMessage): void }>()

// ==================== 渲染模式 ====================
const isInWecomClient = /wxwork|WeCom/i.test(navigator.userAgent) || !!(window as any).wx?.invoke
const renderMode = ref<'bubble' | 'wecom'>('wecom')
const messageKeys = ref<Array<{ msgid: string; secretKey: string; fromUserName?: string; isSelf?: boolean; timeStr?: string; msgType?: string; avatarLetter?: string; avatar?: string; avatarBg?: string }>>([])

// ==================== 企微SDK状态 ====================
const { isWecomReady, isWecomFailed, initError, initFromConfig, resetWecomState } = useWecomOpenData()
const sdkInitializing = ref(false)
const sdkInitDone = ref(false)

const sdkInitError = computed(() => initError.value)

/** 初始化企微SDK（自动从配置加载） */
const autoInitSdk = async () => {
  if (sdkInitializing.value || isWecomReady.value) return
  // 允许重试：如果之前失败了，重置状态
  if (isWecomFailed.value) {
    resetWecomState()
  }
  sdkInitializing.value = true
  try {
    const success = await initFromConfig(props.configId)
    sdkInitDone.value = true
    if (success && selectedConv.value) {
      await fetchMessageKeys()
    }
    console.log('[ConversationView] SDK初始化结果:', success, 'messageKeys:', messageKeys.value.length)
  } catch (e: any) {
    console.error('[ConversationView] SDK初始化异常:', e?.message)
  } finally {
    sdkInitializing.value = false
  }
}



/** 获取消息密钥列表（ww-open-message 渲染用） */
const fetchMessageKeys = async () => {
  if (!selectedConv.value) return
  try {
    const fromUserId = selectedConv.value.fromUserId || ''
    const toUserId = getFirstToUser(selectedConv.value.toUserIds) || ''
    const roomId = selectedConv.value.roomId || ''
    const params: any = { pageSize: 200 }
    if (props.configId) params.configId = props.configId
    if (fromUserId) params.fromUserId = fromUserId
    if (toUserId) params.toUserId = toUserId
    if (roomId) params.roomId = roomId

    console.log('[ConversationView] fetchMessageKeys params:', JSON.stringify(params))

    const res: any = await getMessageKeys(params)
    console.log('[ConversationView] fetchMessageKeys response:', JSON.stringify(res).slice(0, 300))

    const rawList = res?.list || res?.data?.list || []
    const curMemberId = selectedMemberId.value || ''
    const isGroupConv = !!(selectedConv.value?.roomId)
    messageKeys.value = rawList
      .filter((item: any) => item.msgid && item.secretKey)
      .map((item: any) => {
        const t = item.msgTime ? new Date(Number(item.msgTime)) : null
        const timeStr = t ? `${(t.getMonth()+1).toString().padStart(2,'0')}/${t.getDate().toString().padStart(2,'0')} ${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}` : ''
        const name = item.fromUserName || item.fromUserId || ''
        const fid = item.fromUserId || ''
        const isSelf = fid === curMemberId
        const isExternal = fid.startsWith('wm') || fid.startsWith('wo')
        let avatarBg = '#409eff'
        if (isExternal) avatarBg = '#07c160'
        else if (isGroupConv && !isSelf) avatarBg = '#e6a23c'
        else if (isSelf) avatarBg = '#409eff'
        return {
          msgid: item.msgid,
          secretKey: item.secretKey,
          fromUserName: name,
          isSelf,
          timeStr,
          msgType: item.msgType || '',
          avatarLetter: name.charAt(0).toUpperCase() || '?',
          avatar: item.avatar || '',
          avatarBg,
        }
      })
    console.log(`[ConversationView] fetchMessageKeys: ${messageKeys.value.length} keys loaded`)
  } catch (e: any) {
    console.warn('[ConversationView] 获取消息密钥失败:', e?.message || e, e?.response?.data)
    messageKeys.value = []
  }
}

/** 企微组件渲染错误处理 */
const handleWecomRenderError = (error: any) => {
  const msg = error?.message || error?.detail?.errMsg || '企微组件渲染异常'
  console.warn('企微组件渲染错误:', msg, error)
  ElMessage.warning('消息渲染异常: ' + msg)
}

const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser)
const isAdminRole = computed(() => ['super_admin', 'admin'].includes(currentUser.value?.role || ''))
const isManagerRole = computed(() => ['department_manager', 'manager'].includes(currentUser.value?.role || ''))

// ==================== 敏感词高亮 ====================
const sensitiveWordList = ref<string[]>([])

const loadSensitiveWords = async () => {
  try {
    const res: any = await getSensitiveWords()
    const data = res?.data || res
    sensitiveWordList.value = Array.isArray(data) ? data : []
  } catch { /* ignore */ }
}

const highlightSensitiveWords = (text: string): string => {
  if (!text || sensitiveWordList.value.length === 0) return text
  let result = text.replace(/</g, '&lt;').replace(/>/g, '&gt;')
  for (const word of sensitiveWordList.value) {
    if (!word) continue
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    result = result.replace(new RegExp(escaped, 'gi'), `<span class="sensitive-word-hl">${word}</span>`)
  }
  return result
}

// ==================== 标记风险 ====================
const markRiskVisible = ref(false)
const markRiskMsg = ref<any>(null)
const markRiskSubmitting = ref(false)
const markRiskForm = reactive({ riskType: '', riskLevel: 'medium', remark: '' })
const contextMenuVisible = ref(false)
const contextMenuStyle = ref({ top: '0px', left: '0px' })
const contextMenuMsg = ref<any>(null)

const showPanelContextMenu = (e: MouseEvent) => {
  if (!isAdminRole.value && !isManagerRole.value) return
  if (!selectedConv.value) return
  e.preventDefault()
  contextMenuStyle.value = { top: e.clientY + 'px', left: e.clientX + 'px' }
  contextMenuVisible.value = true
}

const openMarkRiskForConv = () => {
  contextMenuVisible.value = false
  if (!selectedConv.value) { ElMessage.warning('请先选择一个会话'); return }
  markRiskMsg.value = {
    id: null,
    fromUserId: selectedConv.value.fromUserId || '',
    toUserId: getFirstToUser(selectedConv.value.toUserIds) || '',
    msgType: 'conversation',
    content: '',
    msgTime: selectedConv.value.lastMsgTime || Date.now(),
  }
  markRiskForm.riskType = ''
  markRiskForm.riskLevel = 'medium'
  markRiskForm.remark = ''
  markRiskVisible.value = true
}

const submitMarkRisk = async () => {
  if (!markRiskForm.riskType) { ElMessage.warning('请选择风险类型'); return }
  if (!props.configId || !markRiskMsg.value) return
  markRiskSubmitting.value = true
  try {
    const msg = markRiskMsg.value
    const convName = selectedConv.value ? getConvDisplayName(selectedConv.value) : ''
    await createAuditMark({
      wecomConfigId: props.configId,
      chatRecordId: msg.id || null,
      fromUserId: msg.fromUserId,
      toUserId: msg.toUserId || (selectedConv.value ? getFirstToUser(selectedConv.value.toUserIds) : ''),
      msgContent: convName ? `[会话] ${convName}` : `[${msg.msgType}]`,
      msgType: msg.msgType || 'conversation',
      msgTime: msg.msgTime,
      riskType: markRiskForm.riskType,
      riskLevel: markRiskForm.riskLevel,
      remark: markRiskForm.remark,
    })
    ElMessage.success('风险标记已提交')
    markRiskVisible.value = false
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || '标记失败')
  } finally {
    markRiskSubmitting.value = false
  }
}

// ==================== 员工面板 ====================
const memberSearch = ref('')
const memberLoading = ref(false)
const archiveMembers = ref<any[]>([])
const selectedMemberId = ref('')
const selectedMemberName = ref('')
const selectedMemberAvatar = ref('')
const deptMemberCrmIds = ref<string[]>([])

const archiveVisibility = ref<'self' | 'department' | 'all'>('all')

const visibleArchiveMembers = computed(() => {
  // 第一层过滤：只显示生效范围内的成员（isEnabled=true）
  const enabledMembers = archiveMembers.value.filter((m: any) => m.isEnabled !== false)

  // 超级管理员可见所有已启用成员
  if (isAdminRole.value) return enabledMembers

  // 根据存档设置的数据可见范围过滤
  const vis = archiveVisibility.value

  if (vis === 'all') return enabledMembers

  if (vis === 'department' || isManagerRole.value) {
    return enabledMembers.filter((m: any) => m.crmUserId && deptMemberCrmIds.value.includes(m.crmUserId))
  }

  // vis === 'self'：仅自己
  const myId = currentUser.value?.id
  return enabledMembers.filter((m: any) => m.crmUserId === myId)
})

const filteredMembers = computed(() => {
  if (!memberSearch.value) return visibleArchiveMembers.value
  const kw = memberSearch.value.toLowerCase()
  return visibleArchiveMembers.value.filter((m: any) =>
    (m.name || '').toLowerCase().includes(kw) || (m.wecomUserId || '').toLowerCase().includes(kw)
  )
})

const loadScopeMembers = async () => {
  if (isAdminRole.value) return
  if (isManagerRole.value) {
    try {
      const res = (await api.get('/users/department-members')) as any
      const members = res?.data || res || []
      deptMemberCrmIds.value = members.map((m: any) => m.userId || m.id).filter(Boolean)
      const myId = currentUser.value?.id
      if (myId && !deptMemberCrmIds.value.includes(myId)) deptMemberCrmIds.value.push(myId)
    } catch { deptMemberCrmIds.value = [] }
  }
}

const fetchArchiveMembers = async () => {
  if (!props.configId) return
  memberLoading.value = true
  try {
    await loadScopeMembers()
    const seatRes: any = await getArchiveSeats(props.configId)
    const data = seatRes?.data || seatRes
    archiveMembers.value = data?.members || []
    archiveVisibility.value = data?.visibility || 'all'
  } catch { archiveMembers.value = [] }
  finally { memberLoading.value = false }
}

/** 判断头像URL是否为有效的真实头像（过滤企微默认占位头像） */
const isValidAvatar = (url: string | undefined | null): boolean => {
  if (!url) return false
  // 企微默认头像URL包含这些路径，不是用户真实头像
  if (url.includes('/node/wwmng/wwmng/style/')) return false
  if (url.includes('/wwcdn.weixin.qq.com/node/wework/images/')) return false
  // 有效的真实头像通常来自 p.qlogo.cn 或 wx.qlogo.cn 或 wework.qpic.cn
  return true
}

const selectMember = (member: any) => {
  selectedMemberId.value = member.wecomUserId
  selectedMemberName.value = member.name || member.wecomUserId
  selectedMemberAvatar.value = isValidAvatar(member.avatar) ? member.avatar : ''
  selectedConv.value = null
  messages.value = []
  convPage.value = 1
  fetchConversations()
}

// ==================== 会话列表 ====================
const convTab = ref<'staff' | 'customer' | 'group'>('customer')
const convSearch = ref('')
const conversations = ref<Conversation[]>([])
const convLoading = ref(false)
const convPage = ref(1)
const convPageSize = ref(50)
const convTotal = ref(0)
const convListRef = ref<HTMLElement | null>(null)
const convTabCounts = ref({ staff: 0, customer: 0, group: 0 })

const selectedConv = ref<Conversation | null>(null)

const switchConvTab = (tab: 'staff' | 'customer' | 'group') => {
  convTab.value = tab
  convPage.value = 1
  selectedConv.value = null
  messages.value = []
  fetchConversations()
}

const handleRefreshConversations = async () => {
  if (convLoading.value) return
  convLoading.value = true
  try {
    if (props.configId) {
      await syncChatRecords(props.configId)
    }
  } catch { /* non-critical */ }
  convPage.value = 1
  selectedConv.value = null
  messages.value = []
  messageKeys.value = []
  await fetchConversations()
  convLoading.value = false
  ElMessage.success('已同步并刷新会话列表')
}

const getConvKey = (conv: Conversation) => `${conv.fromUserId}-${conv.roomId || getFirstToUser(conv.toUserIds)}`

const getConvDisplayName = (conv: Conversation) => {
  if (conv.roomId) return (conv as any).roomName || conv.roomId || '群聊'
  return (conv as any).customerName || conv.fromUserName || conv.fromUserId || '未知'
}

const getConvAvatarLetter = (conv: Conversation) => getConvDisplayName(conv).charAt(0).toUpperCase()

const getAvatarColorClass = (conv: Conversation) => {
  if (conv.roomId) return 'avatar-group'
  const toId = getFirstToUser(conv.toUserIds) || ''
  const fromId = conv.fromUserId || ''
  if (toId.startsWith('wm') || toId.startsWith('wo') || fromId.startsWith('wm') || fromId.startsWith('wo')) return 'avatar-customer'
  return 'avatar-staff'
}

const isWechatCustomer = (conv: Conversation) => {
  const id = getFirstToUser(conv.toUserIds) || ''
  return id.startsWith('wm') && !(conv as any).corpName
}

const isCorpCustomer = (conv: Conversation) => !!(conv as any).corpName

const getCorpShortName = (conv: Conversation) => {
  const name = (conv as any).corpName || ''
  return name.length > 4 ? name.substring(0, 4) + '..' : name
}

const isExternalUserId = (id: string) => {
  return id && (id.startsWith('wm') || id.startsWith('wo'))
}

const isExternalGroup = (conv: Conversation) => {
  if (!conv.roomId) return false
  try {
    const toIds = typeof conv.toUserIds === 'string' ? JSON.parse(conv.toUserIds) : conv.toUserIds
    if (Array.isArray(toIds)) {
      return toIds.some((id: string) => id && (id.startsWith('wm') || id.startsWith('wo')))
    }
  } catch { /* ignore */ }
  const fromId = (conv as any).fromUserId || ''
  return fromId.startsWith('wm') || fromId.startsWith('wo')
}

const getConvPreview = (conv: Conversation) => {
  if (!conv.lastContent) return ''
  const type = conv.lastMsgType
  if (type === 'meta') return '' // meta 记录不显示预览
  if (type && type !== 'text') return `[${getMsgTypeLabel(type)}]`
  return getTextContent(conv.lastContent).substring(0, 30)
}

const isActiveConv = (conv: Conversation) => {
  if (!selectedConv.value) return false
  return getConvKey(selectedConv.value) === getConvKey(conv)
}

const fetchConversations = async () => {
  if (!selectedMemberId.value) return
  convLoading.value = true
  try {
    const res: any = await getConversationList({
      configId: props.configId || undefined,
      userId: selectedMemberId.value,
      keyword: convSearch.value || undefined,
      page: convPage.value,
      pageSize: convPageSize.value
    })
    if (res?.list) {
      const allList = res.list as any[]
      // 按tab 过滤
      const filtered = allList.filter((c: any) => {
        const toId = getFirstToUser(c.toUserIds) || ''
        const fromId = c.fromUserId || ''
        const isGroup = !!c.roomId
        const isExternal = toId.startsWith('wm') || toId.startsWith('wo') || fromId.startsWith('wm') || fromId.startsWith('wo')
        if (convTab.value === 'group') return isGroup
        if (convTab.value === 'customer') return !isGroup && isExternal
        return !isGroup && !isExternal // staff
      })
      conversations.value = convPage.value > 1 ? [...conversations.value, ...filtered] : filtered
      convTotal.value = filtered.length
      // 统计各tab 数量
      convTabCounts.value = {
        staff: allList.filter((c: any) => !c.roomId && !getFirstToUser(c.toUserIds)?.startsWith('wm') && !getFirstToUser(c.toUserIds)?.startsWith('wo') && !c.fromUserId?.startsWith('wm')).length,
        customer: allList.filter((c: any) => !c.roomId && (getFirstToUser(c.toUserIds)?.startsWith('wm') || getFirstToUser(c.toUserIds)?.startsWith('wo') || c.fromUserId?.startsWith('wm') || c.fromUserId?.startsWith('wo'))).length,
        group: allList.filter((c: any) => !!c.roomId).length
      }
    } else {
      if (convPage.value === 1) { conversations.value = []; convTotal.value = 0 }
    }
  } catch { if (convPage.value === 1) { conversations.value = []; convTotal.value = 0 } }
  finally { convLoading.value = false }
}

const handleConvScroll = () => {
  const el = convListRef.value
  if (!el || convLoading.value) return
  if (el.scrollTop + el.clientHeight >= el.scrollHeight - 50) {
    if (conversations.value.length < convTotal.value) { convPage.value++; fetchConversations() }
  }
}

const selectConversation = async (conv: Conversation) => {
  selectedConv.value = conv
  msgPage.value = 1
  messages.value = []
  messageKeys.value = []
  await fetchMessages()
  // 始终预取消息密钥（SDK就绪时渲染原生会话展示组件）
  await fetchMessageKeys()
}

// ==================== 消息 ====================
const messages = ref<ConvMessage[]>([])
const msgLoading = ref(false)
const msgLoadingMore = ref(false)
const msgPage = ref(1)
const msgPageSize = ref(50)
const msgTotal = ref(0)
const chatMessagesRef = ref<HTMLElement | null>(null)

const isSelfMsg = (msg: ConvMessage) => {
  if (!selectedConv.value) return false
  // 员工发的消息显示在右侧
  const fromId = msg.fromUserId || ''
  return !fromId.startsWith('wm') && !fromId.startsWith('wo')
}

const showDateDivider = (idx: number) => {
  if (idx === 0) return true
  const curr = messages.value[idx]
  const prev = messages.value[idx - 1]
  if (!curr?.msgTime || !prev?.msgTime) return false
  const d1 = new Date(curr.msgTime).toDateString()
  const d2 = new Date(prev.msgTime).toDateString()
  return d1 !== d2
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
      messages.value = msgPage.value > 1 ? [...res.list, ...messages.value] : res.list
      msgTotal.value = res.total || 0
    }
  } catch { /* ignore */ }
  finally { msgLoading.value = false; msgLoadingMore.value = false }
}

const loadMoreMessages = () => { msgLoadingMore.value = true; msgPage.value++; fetchMessages() }
const refreshMessages = async () => {
  msgLoading.value = true
  try {
    if (props.configId) {
      await syncChatRecords(props.configId)
    }
  } catch { /* non-critical */ }
  msgPage.value = 1
  messages.value = []
  messageKeys.value = []
  await Promise.all([fetchMessages(), fetchMessageKeys()])
  msgLoading.value = false
}

// ==================== 辅助方法 ====================
const formatShortTime = (ts: number | string) => {
  if (!ts) return ''
  const d = new Date(typeof ts === 'number' ? ts : parseInt(ts as string))
  const now = new Date()
  if (d.toDateString() === now.toDateString()) return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  return `${d.getMonth() + 1}/${d.getDate()}`
}

const getMsgTypeLabel = (type: string) => {
  const map: Record<string, string> = { text: '文本', image: '图片', voice: '语音', video: '视频', file: '文件', link: '链接', weapp: '小程序', location: '位置', emotion: '表情', card: '名片', chatrecord: '聊天记录', revoke: '撤回', agree: '同意存档', disagree: '不同意存档' }
  return map[type] || type
}

const getImageUrl = (content: string) => { try { const c = JSON.parse(content); return c?.image?.url || c?.image?.sdkfileid || '' } catch { return '' } }
const getFileName = (content: string) => { try { const c = JSON.parse(content); return c?.file?.filename || c?.file?.name || '' } catch { return '' } }
const getLinkTitle = (content: string) => { try { const c = JSON.parse(content); return c?.link?.title || '' } catch { return '' } }
const getWeappTitle = (content: string) => { try { const c = JSON.parse(content); return c?.weapp?.title || c?.weapp?.displayname || '' } catch { return '' } }

// ==================== 生命周期 ====================
watch(() => props.configId, (newId) => {
  fetchArchiveMembers()
  // configId 从父组件传来后，自动初始化企微SDK（尝试使用原生会话展示组件）
  if (newId && !isWecomReady.value && !sdkInitializing.value) {
    autoInitSdk()
  }
}, { immediate: true })

onMounted(() => {
  loadSensitiveWords()
})

// ==================== 外部调用方法（搜索跳转） ====================
/** 根据 wecomUserId 选中某个存档成员 */
const selectMemberById = (wecomUserId: string) => {
  const member = archiveMembers.value.find((m: any) => m.wecomUserId === wecomUserId)
  if (member) {
    selectMember(member)
  }
}

/** 跳转到指定会话（用于全局搜索） */
const jumpToConversation = async (type: 'customer' | 'staff' | 'group', memberId: string, peerId: string) => {
  // 先选中成员
  const member = archiveMembers.value.find((m: any) => m.wecomUserId === memberId)
  if (member) {
    selectedMemberId.value = member.wecomUserId
    selectedMemberName.value = member.name || member.wecomUserId
    selectedMemberAvatar.value = isValidAvatar(member.avatar) ? member.avatar : ''
  }
  // 切换 tab
  if (type === 'group') convTab.value = 'group'
  else if (type === 'customer') convTab.value = 'customer'
  else convTab.value = 'staff'
  // 刷新会话列表
  convPage.value = 1
  await fetchConversations()
  // 尝试在列表中找到目标会话并选中
  const targetConv = conversations.value.find((c: any) => {
    if (type === 'group') return c.roomId === peerId
    const toId = getFirstToUser(c.toUserIds) || ''
    return toId === peerId || c.fromUserId === peerId
  })
  if (targetConv) {
    selectConversation(targetConv)
  }
}

// 暴露方法给父组件调用
defineExpose({ fetchConversations, fetchArchiveMembers, selectMemberById, jumpToConversation })
</script>

<style scoped>
.conv-view { height: 100%; }
.conv-layout { display: flex; height: calc(100vh - 240px); min-height: 500px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }

/* 第一栏：员工列表 */
.panel-members { width: 180px; flex-shrink: 0; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; background: #fafbfc; }
.panel-members-header { padding: 10px; border-bottom: 1px solid #f0f0f0; overflow: hidden; }
.members-title { display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px; font-size: 13px; font-weight: 600; color: #1f2937; }
.members-count { font-size: 11px; color: #9ca3af; font-weight: 400; }
.panel-members-list { flex: 1; overflow-y: auto; padding: 4px 0; }
.member-card { display: flex; align-items: center; gap: 8px; padding: 8px 12px; cursor: pointer; transition: background .15s; }
.member-card:hover { background: #f3f4f6; }
.member-card.active { background: #e6f7ef; border-left: 3px solid #07c160; padding-left: 9px; }
.member-card-avatar { width: 36px; height: 36px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #c8c9cc; display: flex; align-items: center; justify-content: center; }
.member-card-info { flex: 1; min-width: 0; }
.member-card-name { font-size: 13px; color: #1f2937; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.member-card-time { font-size: 11px; color: #9ca3af; margin-top: 2px; }

/* 第二栏：会话列表 */
.panel-conversations { width: 280px; flex-shrink: 0; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; }
.panel-conv-header { border-bottom: 1px solid #f0f0f0; overflow: hidden; }
.conv-header-member { display: flex; align-items: center; gap: 8px; padding: 10px 12px 6px; }
.conv-header-avatar { width: 28px; height: 28px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #67c23a; display: flex; align-items: center; justify-content: center; }
.conv-header-name { font-size: 13px; font-weight: 600; color: #1f2937; }
.conv-header-placeholder { padding: 12px; font-size: 13px; color: #9ca3af; }
.conv-tabs { display: flex; padding: 0 12px; gap: 0; border-bottom: 1px solid #f5f5f5; }
.conv-tab { flex: 1; text-align: center; padding: 8px 0; font-size: 12px; color: #6b7280; cursor: pointer; border-bottom: 2px solid transparent; transition: all .2s; display: flex; align-items: center; justify-content: center; gap: 4px; }
.conv-tab:hover { color: #07c160; }
.conv-tab.active { color: #07c160; border-bottom-color: #07c160; font-weight: 600; }
.tab-count { font-size: 10px; background: #f0f0f0; border-radius: 8px; padding: 0 5px; min-width: 16px; }
.conv-tab.active .tab-count { background: #e6f7ef; color: #07c160; }
.conv-tab-refresh { display: flex; align-items: center; justify-content: center; width: 28px; cursor: pointer; color: #9ca3af; transition: color .2s; }
.conv-tab-refresh:hover { color: #07c160; }

.panel-conv-list { flex: 1; overflow-y: auto; }
.conv-card { display: flex; align-items: center; gap: 10px; padding: 10px 12px; cursor: pointer; border-bottom: 1px solid #fafafa; transition: background .15s; }
.conv-card:hover { background: #f9fafb; }
.conv-card.active { background: #e6f7ef; }
.conv-card-avatar { width: 40px; height: 40px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #c8c9cc; display: flex; align-items: center; justify-content: center; }
.conv-card-body { flex: 1; min-width: 0; }
.conv-card-top { display: flex; align-items: center; gap: 4px; }
.conv-card-name { font-size: 13px; font-weight: 500; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100px; }
.conv-card-tag { font-size: 10px; padding: 0 4px; border-radius: 3px; white-space: nowrap; }
.tag-wechat { color: #07c160; }
.tag-corp { color: #e6a23c; }
.tag-group-internal { color: #409eff; background: #ecf5ff; }
.tag-group-external { color: #e6a23c; background: #fdf6ec; }
.msg-sender-badge { font-size: 10px; padding: 1px 4px; border-radius: 3px; margin-left: 4px; }
.badge-staff { color: #409eff; background: #ecf5ff; }
.badge-external { color: #e6a23c; background: #fdf6ec; }
.conv-card-time { margin-left: auto; font-size: 11px; color: #9ca3af; white-space: nowrap; }
.conv-card-bottom { display: flex; align-items: center; margin-top: 4px; }
.conv-card-preview { font-size: 12px; color: #9ca3af; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; }
.conv-card-stats { display: flex; gap: 4px; margin-left: 6px; flex-shrink: 0; }
.stat-today { font-size: 10px; color: #07c160; background: #e6f7ef; border-radius: 3px; padding: 0 4px; }
.stat-total { font-size: 10px; color: #9ca3af; background: #f5f5f5; border-radius: 3px; padding: 0 4px; }

/* 第三栏：消息 */
.panel-messages { flex: 1; display: flex; flex-direction: column; min-width: 0; }
.msg-panel-header { display: flex; align-items: center; justify-content: space-between; padding: 12px 16px; border-bottom: 1px solid #f0f0f0; }
.msg-header-left { display: flex; align-items: center; gap: 10px; }
.msg-header-avatar { width: 36px; height: 36px; border-radius: 4px; overflow: hidden; flex-shrink: 0; background: #c8c9cc; display: flex; align-items: center; justify-content: center; }
.msg-header-info { display: flex; align-items: center; gap: 6px; }
.msg-header-name { font-size: 15px; font-weight: 600; color: #1f2937; }
.msg-header-tag { font-size: 12px; font-weight: 500; }
.msg-header-tag.tag-wechat { color: #07c160; }
.msg-header-tag.tag-corp { color: #e6a23c; }
.msg-header-right { display: flex; align-items: center; gap: 8px; }
.msg-header-count { font-size: 12px; color: #9ca3af; }

.msg-panel-body { flex: 1; overflow: hidden; padding: 0; display: flex; flex-direction: column; }
.msg-panel-body .key-diagnose-panel { padding: 16px; }
.msg-panel-empty { flex: 1; display: flex; align-items: center; justify-content: center; }

.load-more-bar { text-align: center; margin-bottom: 12px; }
.date-divider { text-align: center; margin: 16px 0; }
.date-divider span { font-size: 11px; color: #9ca3af; background: #f5f5f5; padding: 2px 12px; border-radius: 10px; }

/* 系统消息 */
.msg-system-notice { text-align: center; margin: 12px 0; font-size: 12px; color: #9ca3af; display: flex; align-items: center; justify-content: center; gap: 4px; }
.recall-notice { color: #e6a23c; }
.agree-notice { color: #67c23a; }
.highlight-warning { background: #FEF3CD; border: 1px solid #F59E0B; border-radius: 8px; padding: 8px 16px; color: #92400E; font-size: 13px; font-weight: 500; }
.highlight-danger { background: #FEE2E2; border: 1px solid #EF4444; border-radius: 8px; padding: 8px 16px; color: #991B1B; font-size: 13px; font-weight: 500; }
.highlight-warning .notice-text strong, .highlight-danger .notice-text strong { font-weight: 700; }
.sensitive-word-hl { background: #FEE2E2; color: #DC2626; font-weight: 700; padding: 1px 3px; border-radius: 3px; border-bottom: 2px solid #EF4444; }
.mark-risk-btn { margin-left: 4px; }
.mark-msg-preview { background: #F9FAFB; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #4B5563; max-height: 80px; overflow: auto; }

/* 密钥诊断面板 */
.key-diagnose-panel { display: flex; align-items: center; justify-content: center; height: 100%; min-height: 200px; }
.key-diagnose-panel .el-result { padding: 20px; }
.key-diagnose-panel .el-result__subtitle { margin-top: 8px; }

/* 消息行 */
.msg-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.msg-row-self { justify-content: flex-end; }
.msg-avatar-wrap { flex-shrink: 0; }
.msg-avatar-img { width: 34px; height: 34px; border-radius: 4px; object-fit: cover; }
.msg-avatar-text { width: 34px; height: 34px; border-radius: 4px; background: #c8c9cc; display: flex; align-items: center; justify-content: center; font-size: 13px; color: #fff; font-weight: 500; }
.msg-avatar-text-self { background: #67c23a; }
.msg-avatar-self { border: 1px solid #67c23a; }

.msg-content-wrap { max-width: 60%; }
.msg-content-self { text-align: right; }
.msg-sender-line { font-size: 11px; color: #9ca3af; margin-bottom: 4px; display: flex; align-items: center; gap: 6px; }
.msg-sender-self { justify-content: flex-end; }
.msg-sender-name { font-weight: 500; color: #6b7280; }

.msg-bubble { display: inline-block; padding: 8px 12px; border-radius: 8px; background: #f3f4f6; font-size: 14px; color: #1f2937; line-height: 1.5; word-break: break-word; text-align: left; max-width: 100%; }
.bubble-self { background: #d1fae5; }
.bubble-sensitive { border: 1px solid #fca5a5; background: #fef2f2; }

.msg-voice, .msg-video, .msg-file, .msg-link, .msg-weapp, .msg-location, .msg-card { display: flex; align-items: center; gap: 6px; color: #4b5563; }
.msg-type-placeholder { color: #9ca3af; font-style: italic; }

/* 通用头像 */
.avatar-img { width: 100%; height: 100%; object-fit: cover; }
.avatar-letter { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 14px; color: #fff; font-weight: 500; background: #c8c9cc; }
.avatar-letter.avatar-customer { background: #07c160 !important; }
.avatar-letter.avatar-staff { background: #409eff !important; }
.avatar-letter.avatar-group { background: #e6a23c !important; }

.empty-conv { padding: 40px 0; }
.conv-loading-more { text-align: center; padding: 12px; font-size: 12px; color: #9ca3af; }

/* 企微跳转提示 */
.wecom-redirect-prompt { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; padding: 40px; text-align: center; }
.wecom-redirect-prompt h3 { margin: 16px 0 8px; font-size: 18px; color: #1f2937; }
.wecom-redirect-prompt p { color: #6b7280; font-size: 14px; margin-bottom: 16px; }
.wecom-redirect-prompt .sub-tip { margin-top: 12px; font-size: 12px; color: #9ca3af; }
.wecom-guide-steps { display: flex; flex-direction: column; gap: 12px; margin: 16px 0 20px; text-align: left; background: #f8fafc; border-radius: 8px; padding: 16px 20px; }
.guide-step { display: flex; align-items: center; gap: 10px; font-size: 14px; color: #374151; }
.guide-step strong { color: #1890ff; }
.step-num { width: 24px; height: 24px; border-radius: 50%; background: #1890ff; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
.wecom-sdk-loading { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 12px; color: #6b7280; }
.wecom-sdk-fallback { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100%; gap: 10px; padding: 40px; text-align: center; color: #6b7280; }
.wecom-sdk-fallback h4 { font-size: 16px; color: #1f2937; margin: 4px 0; }
.wecom-sdk-fallback .sdk-error-detail { font-size: 12px; color: #e6a23c; background: #fdf6ec; padding: 6px 12px; border-radius: 4px; max-width: 400px; word-break: break-all; }
.sdk-check-list { text-align: left; font-size: 13px; color: #6b7280; line-height: 2; padding-left: 20px; margin: 8px 0; }
.sdk-check-list li { list-style: disc; }
</style>

<style>
.msg-context-menu { position: fixed; z-index: 9999; background: #fff; border: 1px solid #e5e7eb; border-radius: 10px; box-shadow: 0 8px 24px rgba(0,0,0,0.14); padding: 6px 0; min-width: 140px; }
.msg-context-menu .context-menu-item { padding: 9px 16px; font-size: 13px; color: #374151; cursor: pointer; transition: all 0.15s; display: flex; align-items: center; }
.msg-context-menu .context-menu-item:hover { background: #f3f4f6; }
.msg-context-menu .context-menu-item:first-child:hover { color: #ef4444; }
</style>

