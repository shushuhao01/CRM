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
          <!-- TAB: 员工/客户/群聊 -->
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
          </div>
          <!-- 搜索 -->
          <el-input v-model="convSearch" placeholder="搜索会话" clearable size="small" prefix-icon="Search" style="margin: 8px 12px 4px;" @keyup.enter="fetchConversations" @clear="fetchConversations" />
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
              <!-- 气泡模式已隐藏，统一使用企微组件模式 -->
              <span class="msg-header-count">共 {{ msgTotal }} 条</span>
              <el-button link size="small" @click="refreshMessages"><el-icon><Refresh /></el-icon></el-button>
            </div>
          </div>

          <!-- 消息列表 -->
          <div class="msg-panel-body" ref="chatMessagesRef" v-loading="msgLoading">
            <!-- 模式A: 企微会话展示组件渲染 -->
            <template v-if="renderMode === 'wecom'">
              <!-- 非企微客户端：引导去企微工作台打开 -->
              <div v-if="!isInWecomClient" class="wecom-redirect-prompt">
                <el-icon :size="48" color="#1890ff"><Connection /></el-icon>
                <h3>请在企业微信中打开</h3>
                <p>根据企业微信规则，会话存档内容需要在企业微信内置浏览器中才能查看。</p>
                <div class="wecom-guide-steps">
                  <div class="guide-step">
                    <span class="step-num">1</span>
                    <span>打开<strong>企业微信</strong>客户端，进入底部<strong>「工作台」</strong></span>
                  </div>
                  <div class="guide-step">
                    <span class="step-num">2</span>
                    <span>在工作台中找到并打开<strong>「云客CRM」</strong>应用</span>
                  </div>
                  <div class="guide-step">
                    <span class="step-num">3</span>
                    <span>在H5首页点击<strong>「会话存档」</strong>快捷入口即可进入</span>
                  </div>
                </div>
                <el-button type="primary" @click="openWecomClient">打开企业微信</el-button>
                <p class="sub-tip">注意：请从企微工作台打开应用，聊天窗口粘贴链接会打开系统浏览器而非内置浏览器</p>
              </div>
              <!-- 企微客户端：SDK初始化中 -->
              <div v-else-if="sdkInitializing" class="wecom-sdk-loading">
                <el-icon class="is-loading" :size="32"><Loading /></el-icon>
                <p>正在初始化企微SDK...</p>
              </div>
              <!-- SDK已就绪：渲染消息 -->
              <template v-else-if="isWecomReady">
                <WecomMessageRenderer
                  :msg-list="messageKeys"
                  :loading="msgLoading"
                  @load-more="loadMoreMessages"
                  @error="handleWecomRenderError"
                />
              </template>
              <!-- SDK初始化失败 -->
              <div v-else class="wecom-sdk-fallback">
                <el-icon :size="40" color="#e6a23c"><WarningFilled /></el-icon>
                <h4>企微SDK初始化失败</h4>
                <p v-if="sdkInitError" class="sdk-error-detail">{{ sdkInitError }}</p>
                <p>请检查以下配置：</p>
                <ul class="sdk-check-list">
                  <li>企微应用的「可信域名」是否包含当前网站域名</li>
                  <li>企微应用的 agentId 是否正确配置</li>
                  <li>是否在企业微信客户端内打开（非普通浏览器）</li>
                </ul>
                <el-button size="small" @click="autoInitSdk">重试初始化</el-button>
              </div>
            </template>

            <!-- 模式B: 传统气泡渲染（现有逻辑） -->
            <template v-else>
            <div v-if="msgTotal > messages.length" class="load-more-bar">
              <el-button link type="primary" size="small" @click="loadMoreMessages" :loading="msgLoadingMore">加载更早消息</el-button>
            </div>

            <template v-for="(msg, idx) in messages" :key="msg.id">
              <!-- 日期分割线 -->
              <div v-if="showDateDivider(idx)" class="date-divider">
                <span>{{ getDateDividerText(msg.msgTime) }}</span>
              </div>

              <!-- 撤回消息 - 高亮警示 -->
              <div v-if="msg.action === 'recall' || msg.msgType === 'revoke'" class="msg-system-notice recall-notice highlight-warning">
                <el-icon><WarningFilled /></el-icon>
                <span class="notice-text">{{ msg.fromUserName || msg.fromUserId }} <strong>撤回</strong>了一条消息</span>
                <el-tag type="warning" size="small" effect="dark" style="margin-left: 6px">撤回</el-tag>
              </div>

              <!-- 删除消息 - 高亮警示 -->
              <div v-else-if="msg.action === 'delete_chat_record' || msg.msgType === 'delete'" class="msg-system-notice delete-notice highlight-danger">
                <el-icon><WarningFilled /></el-icon>
                <span class="notice-text">{{ msg.fromUserName || msg.fromUserId }} <strong>删除</strong>了一条消息</span>
                <el-tag type="danger" size="small" effect="dark" style="margin-left: 6px">删除</el-tag>
              </div>

              <!-- 同意存档系统消息 -->
              <div v-else-if="msg.msgType === 'agree' || msg.msgType === 'disagree'" class="msg-system-notice agree-notice">
                <el-icon><InfoFilled /></el-icon>
                <span>{{ msg.msgType === 'agree' ? '对方已同意会话存档' : '对方不同意会话存档' }}</span>
              </div>

              <!-- 普通消息 -->
              <div v-else class="msg-row" :class="{ 'msg-row-self': isSelfMsg(msg) }">
                <!-- 对方头像 -->
                <div class="msg-avatar-wrap" v-if="!isSelfMsg(msg)">
                  <img referrerpolicy="no-referrer" v-if="(selectedConv as any)?.customerAvatar" :src="(selectedConv as any).customerAvatar" class="msg-avatar-img" />
                  <span v-else class="msg-avatar-text">{{ getConvDisplayName(selectedConv).charAt(0) }}</span>
                </div>

                <div class="msg-content-wrap" :class="{ 'msg-content-self': isSelfMsg(msg) }">
                  <div class="msg-sender-line" v-if="!isSelfMsg(msg)">
                    <span class="msg-sender-name">{{ getConvDisplayName(selectedConv) }}</span>
                    <span class="msg-time">{{ formatMsgTimeShort(msg.msgTime) }}</span>
                  </div>
                  <div class="msg-sender-line msg-sender-self" v-else>
                    <span class="msg-time">{{ formatMsgTimeShort(msg.msgTime) }}</span>
                    <span class="msg-sender-name">{{ selectedMemberName || msg.fromUserName || msg.fromUserId }}</span>
                  </div>

                  <!-- 消息气泡 -->
                  <div class="msg-bubble" :class="{ 'bubble-self': isSelfMsg(msg), 'bubble-sensitive': msg.isSensitive }" @contextmenu.prevent="showMsgContextMenu($event, msg)">
                    <!-- 文本（敏感词高亮） -->
                    <template v-if="msg.msgType === 'text'">
                      <span v-if="msg.isSensitive" v-html="highlightSensitiveWords(getTextContent(msg.content))" />
                      <span v-else>{{ getTextContent(msg.content) }}</span>
                    </template>
                    <!-- 图片 -->
                    <template v-else-if="msg.msgType === 'image'">
                      <el-image v-if="msg.mediaUrl || getImageUrl(msg.content)" :src="msg.mediaUrl || getImageUrl(msg.content)" :preview-src-list="[msg.mediaUrl || getImageUrl(msg.content)]" fit="contain" style="max-width:220px;max-height:220px;border-radius:4px" />
                      <span v-else class="msg-type-placeholder">[图片]</span>
                    </template>
                    <!-- 语音 -->
                    <template v-else-if="msg.msgType === 'voice'">
                      <div class="msg-voice"><el-icon><Microphone /></el-icon> <span>语音消息</span></div>
                    </template>
                    <!-- 视频 -->
                    <template v-else-if="msg.msgType === 'video'">
                      <div class="msg-video"><el-icon><VideoCamera /></el-icon> <span>视频消息</span></div>
                    </template>
                    <!-- 文件 -->
                    <template v-else-if="msg.msgType === 'file'">
                      <div class="msg-file"><el-icon><Document /></el-icon> <span>{{ getFileName(msg.content) || '文件' }}</span></div>
                    </template>
                    <!-- 链接 -->
                    <template v-else-if="msg.msgType === 'link'">
                      <div class="msg-link">
                        <el-icon><Link /></el-icon>
                        <span>{{ getLinkTitle(msg.content) || '链接消息' }}</span>
                      </div>
                    </template>
                    <!-- 小程序 -->
                    <template v-else-if="msg.msgType === 'weapp'">
                      <div class="msg-weapp"><el-icon><Grid /></el-icon> <span>{{ getWeappTitle(msg.content) || '小程序' }}</span></div>
                    </template>
                    <!-- 位置 -->
                    <template v-else-if="msg.msgType === 'location'">
                      <div class="msg-location"><el-icon><Location /></el-icon> <span>位置消息</span></div>
                    </template>
                    <!-- 表情 -->
                    <template v-else-if="msg.msgType === 'emotion'">
                      <span class="msg-type-placeholder">[表情]</span>
                    </template>
                    <!-- 名片 -->
                    <template v-else-if="msg.msgType === 'card'">
                      <div class="msg-card"><el-icon><User /></el-icon> <span>名片消息</span></div>
                    </template>
                    <!-- 其他 -->
                    <template v-else>
                      <span class="msg-type-placeholder">[{{ getMsgTypeLabel(msg.msgType) }}]</span>
                    </template>
                  </div>
                </div>

                <!-- 自己头像 -->
                <div class="msg-avatar-wrap" v-if="isSelfMsg(msg)">
                  <img referrerpolicy="no-referrer" v-if="(selectedConv as any)?.memberAvatar || selectedMemberAvatar" :src="(selectedConv as any)?.memberAvatar || selectedMemberAvatar" class="msg-avatar-img msg-avatar-self" />
                  <span v-else class="msg-avatar-text msg-avatar-text-self">{{ (selectedMemberName || 'M').charAt(0) }}</span>
                </div>
              </div>
            </template>

            <el-empty v-if="messages.length === 0 && !msgLoading" :image-size="50">
              <template #description>
                <p>暂无消息记录，请点击页面顶部「同步」按钮拉取聊天记录</p>
                <p style="font-size: 12px; color: #909399; margin-top: 4px;">同步后即可查看成员与客户的历史消息</p>
              </template>
            </el-empty>
            </template><!-- 传统气泡渲染结束 -->
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
        <el-form-item label="消息内容">
          <div class="mark-msg-preview">{{ markRiskMsg?.content ? getTextContent(markRiskMsg.content) : '[非文本消息]' }}</div>
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
    <div v-if="contextMenuVisible" class="msg-context-menu" :style="contextMenuStyle" @mouseleave="contextMenuVisible = false">
      <div class="context-menu-item" @click="openMarkRisk">标记风险</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { Search, Refresh, InfoFilled, WarningFilled, Microphone, VideoCamera, Document, Link, Grid, Location, User, Connection, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { createAuditMark, getSensitiveWords } from '@/api/wecom'
import { getConversationList, getConversationMessages, getArchiveSeats, getMessageKeys } from '@/api/wecom'
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
// ★ 统一使用企微组件模式，非企微客户端显示跳转引导
const isInWecomClient = /wxwork|WeCom/i.test(navigator.userAgent)
const renderMode = ref<'bubble' | 'wecom'>('wecom')
const messageKeys = ref<Array<{ msgid: string; secretKey: string }>>([])

// ==================== 企微SDK状态 ====================
const { isWecomReady, initFromConfig } = useWecomOpenData()
const sdkInitializing = ref(false)
const sdkInitDone = ref(false)

const sdkInitError = ref('')

/** 在企微客户端内自动初始化SDK（无需扫码） */
const autoInitSdk = async () => {
  if (!isInWecomClient || sdkInitDone.value) return
  sdkInitializing.value = true
  sdkInitError.value = ''
  try {
    const success = await initFromConfig(props.configId)
    if (!success) {
      sdkInitError.value = '企微SDK初始化失败，请检查企微应用配置（可信域名、agentId等）'
    } else if (selectedConv.value) {
      fetchMessageKeys()
    }
  } catch (e: any) {
    sdkInitError.value = e?.message || 'SDK初始化异常'
  } finally {
    sdkInitializing.value = false
    sdkInitDone.value = true
  }
}

/** 打开企业微信客户端 */
const openWecomClient = () => {
  window.location.href = 'wxwork://'
}


/** 获取消息密钥列表（企微组件模式用） */
const fetchMessageKeys = async () => {
  if (!selectedConv.value || !props.configId) return
  try {
    const fromUserId = selectedConv.value.fromUserId || ''
    const toUserId = getFirstToUser(selectedConv.value.toUserIds) || ''
    const res: any = await getMessageKeys({
      configId: props.configId,
      fromUserId,
      toUserId,
      pageSize: 100
    })
    if (res?.list) {
      messageKeys.value = res.list.map((item: any) => ({
        msgid: item.msgid,
        secretKey: item.secretKey
      }))
    }
  } catch (e) {
    console.warn('获取消息密钥失败:', e)
    messageKeys.value = []
  }
}

/** 企微组件渲染错误处理 */
const handleWecomRenderError = (error: any) => {
  console.warn('企微组件渲染错误:', error)
  sdkInitError.value = error?.message || error?.detail?.errMsg || '企微组件渲染异常'
  ElMessage.warning('企微组件渲染失败: ' + sdkInitError.value)
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

const showMsgContextMenu = (e: MouseEvent, msg: any) => {
  if (!isAdminRole.value && !isManagerRole.value) return
  contextMenuMsg.value = msg
  contextMenuStyle.value = { top: e.clientY + 'px', left: e.clientX + 'px' }
  contextMenuVisible.value = true
}

const openMarkRisk = () => {
  contextMenuVisible.value = false
  markRiskMsg.value = contextMenuMsg.value
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
    await createAuditMark({
      wecomConfigId: props.configId,
      chatRecordId: msg.id,
      fromUserId: msg.fromUserId,
      toUserId: selectedConv.value ? getFirstToUser(selectedConv.value) : '',
      msgContent: msg.msgType === 'text' ? getTextContent(msg.content) : `[${msg.msgType}]`,
      msgType: msg.msgType,
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
  // 超级管理员始终可见所有
  if (isAdminRole.value) return archiveMembers.value

  // 根据存档设置的数据可见范围过滤
  const vis = archiveVisibility.value

  if (vis === 'all') return archiveMembers.value

  if (vis === 'department' || isManagerRole.value) {
    return archiveMembers.value.filter((m: any) => m.crmUserId && deptMemberCrmIds.value.includes(m.crmUserId))
  }

  // vis === 'self'：仅自己
  const myId = currentUser.value?.id
  return archiveMembers.value.filter((m: any) => m.crmUserId === myId)
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

const getConvKey = (conv: Conversation) => `${conv.fromUserId}-${conv.roomId || getFirstToUser(conv.toUserIds)}`

const getConvDisplayName = (conv: Conversation) => (conv as any).customerName || conv.fromUserName || conv.fromUserId || '未知'

const getConvAvatarLetter = (conv: Conversation) => getConvDisplayName(conv).charAt(0).toUpperCase()

const getAvatarColorClass = (conv: Conversation) => {
  if (conv.roomId) return 'avatar-group'
  const id = getFirstToUser(conv.toUserIds) || conv.fromUserId || ''
  if (id.startsWith('wm') || id.startsWith('wo')) return 'avatar-customer'
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
  // 企微组件模式获取消息密钥
  if (isInWecomClient && isWecomReady.value) {
    await fetchMessageKeys()
  }
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
const refreshMessages = () => { msgPage.value = 1; messages.value = []; fetchMessages() }

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
watch(() => props.configId, () => { fetchArchiveMembers() }, { immediate: true })

onMounted(() => {
  fetchArchiveMembers()
  loadSensitiveWords()
  // 企微客户端内自动初始化SDK（无需扫码）
  if (isInWecomClient && renderMode.value === 'wecom') {
    autoInitSdk()
  }
})

// 暴露方法给父组件调用
defineExpose({ fetchConversations, fetchArchiveMembers })
</script>

<style scoped>
.conv-view { height: 100%; }
.conv-layout { display: flex; height: calc(100vh - 240px); min-height: 500px; border: 1px solid #e5e7eb; border-radius: 8px; overflow: hidden; background: #fff; }

/* 第一栏：员工列表 */
.panel-members { width: 180px; flex-shrink: 0; border-right: 1px solid #f0f0f0; display: flex; flex-direction: column; background: #fafbfc; }
.panel-members-header { padding: 12px; border-bottom: 1px solid #f0f0f0; }
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
.panel-conv-header { border-bottom: 1px solid #f0f0f0; }
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

.msg-panel-body { flex: 1; overflow-y: auto; padding: 16px; }
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
.msg-context-menu { position: fixed; z-index: 3000; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; box-shadow: 0 4px 16px rgba(0,0,0,0.12); padding: 4px 0; min-width: 120px; }
.context-menu-item { padding: 8px 16px; font-size: 13px; color: #374151; cursor: pointer; transition: all 0.15s; }
.context-menu-item:hover { background: #F3F4F6; color: #EF4444; }
.mark-msg-preview { background: #F9FAFB; border-radius: 6px; padding: 8px 12px; font-size: 13px; color: #4B5563; max-height: 80px; overflow: auto; }

/* 消息行 */
.msg-row { display: flex; align-items: flex-start; gap: 8px; margin-bottom: 16px; }
.msg-row-self { flex-direction: row-reverse; }
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
.avatar-customer { background: #07c160; }
.avatar-staff { background: #409eff; }
.avatar-group { background: #e6a23c; }

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

