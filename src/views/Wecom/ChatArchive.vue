<template>
  <div class="wecom-chat-archive">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <!-- 增值服务未授权提示 -->
    <el-card v-if="!isDemoMode && archiveStatus && archiveStatus.authorized === false" class="purchase-card">
      <div class="demo-overlay-wrapper">
        <div class="demo-chat-preview">
          <div class="demo-header">
            <el-icon><ChatLineSquare /></el-icon>
            <span>会话存档示例预览</span>
          </div>
          <div class="demo-messages">
            <div class="demo-msg demo-msg-left">
              <div class="demo-avatar">👤</div>
              <div class="demo-bubble">您好，请问这款产品有优惠吗？</div>
            </div>
            <div class="demo-msg demo-msg-right">
              <div class="demo-bubble demo-bubble-right">您好！目前全场8折活动中，需要我为您推荐吗？</div>
              <div class="demo-avatar">🧑‍💼</div>
            </div>
            <div class="demo-msg demo-msg-left">
              <div class="demo-avatar">👤</div>
              <div class="demo-bubble">好的，帮我看看适合的方案</div>
            </div>
            <div class="demo-msg demo-msg-right">
              <div class="demo-bubble demo-bubble-right">好的，我给您发详细方案...</div>
              <div class="demo-avatar">🧑‍💼</div>
            </div>
          </div>
          <div class="demo-blur-mask">
            <div class="demo-lock-info">
              <el-icon :size="40" color="#e6a23c"><Lock /></el-icon>
              <h3>会话存档增值服务</h3>
              <p>开通后可查看员工与客户的完整聊天记录</p>
              <div class="demo-features">
                <span>📝 聊天记录查看</span>
                <span>🔍 全文搜索</span>
                <span>⚠️ 敏感词检测</span>
                <span>✅ 合规质检</span>
              </div>
              <el-button type="primary" size="large" @click="openPurchaseDialog">
                <el-icon><ShoppingCart /></el-icon> 立即开通
              </el-button>
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <el-card v-else>
      <template #header>
        <WecomHeader tab-name="chat-archive">
          会话存档
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="success" :loading="syncing" @click="handleSync" :disabled="!selectedConfigId">
              <el-icon><Refresh /></el-icon> 同步
            </el-button>
            <el-button type="warning" size="small" @click="handleDiagnose" :disabled="!selectedConfigId" :loading="diagnosing">
              诊断
            </el-button>
          </template>
        </WecomHeader>
      </template>

      <!-- 席位配额概览 -->
      <div v-if="seatInfo" class="seat-quota-bar">
        <div class="seat-info">
          <span class="seat-label">📊 存档席位</span>
          <span>已用 {{ seatInfo.used }} / {{ seatInfo.total }} 个</span>
          <el-tag :type="seatPercent >= 100 ? 'danger' : seatPercent >= 80 ? 'warning' : 'success'" size="small">
            {{ seatPercent }}%
          </el-tag>
        </div>
        <el-progress :percentage="seatPercent" :stroke-width="8" :show-text="false"
          :color="seatPercent >= 100 ? '#EF4444' : seatPercent >= 80 ? '#F59E0B' : '#10B981'" />
        <div class="seat-detail">
          <span v-if="seatInfo.expireDate">到期: {{ seatInfo.expireDate }}</span>
          <el-button type="primary" text size="small" @click="openPurchaseDialog">增购/续费</el-button>
        </div>
      </div>

      <!-- V4.0 7 Tab 结构 + 右侧搜索 -->
      <div class="tabs-with-search">
        <div class="global-search-bar">
          <el-input
            v-model="globalSearchKeyword"
            placeholder="搜索成员、客户名称..."
            clearable
            @keyup.enter="handleGlobalSearch"
            @clear="handleClearGlobalSearch"
            class="global-search-input"
            prefix-icon="Search"
            size="default"
          />
          <el-button type="primary" @click="handleGlobalSearch" :loading="globalSearching" size="default">搜索</el-button>
          <div v-if="globalSearchResults && globalSearchVisible" class="global-search-results" v-click-outside="handleCloseSearchPanel">
            <div v-if="globalSearchResults.members?.length" class="search-group">
              <div class="search-group-title">存档成员</div>
              <div v-for="item in globalSearchResults.members" :key="'m-' + item.wecomUserId" class="search-result-item" @click="jumpToMember(item)">
                <span class="result-avatar result-avatar-staff">{{ (item.name || item.wecomUserId).charAt(0) }}</span>
                <span class="result-name">{{ item.name || item.wecomUserId }}</span>
                <el-tag size="small" type="info">员工</el-tag>
              </div>
            </div>
            <div v-if="globalSearchResults.customers?.length" class="search-group">
              <div class="search-group-title">客户</div>
              <div v-for="item in globalSearchResults.customers" :key="'c-' + item.id" class="search-result-item" @click="jumpToCustomerConv(item)">
                <span class="result-avatar result-avatar-customer">{{ (item.name || item.externalUserId || '?').charAt(0) }}</span>
                <span class="result-name">{{ item.remark || item.name || item.externalUserId }}</span>
                <span class="result-sub" v-if="item.remark && item.name">({{ item.name }})</span>
                <el-tag size="small" type="success">客户</el-tag>
              </div>
            </div>
            <div v-if="globalSearchResults.groups?.length" class="search-group">
              <div class="search-group-title">群聊</div>
              <div v-for="item in globalSearchResults.groups" :key="'g-' + item.roomId" class="search-result-item" @click="jumpToGroupConv(item)">
                <span class="result-avatar result-avatar-group">群</span>
                <span class="result-name">{{ item.roomName || item.roomId }}</span>
                <el-tag size="small" type="warning">群聊</el-tag>
              </div>
            </div>
            <div v-if="globalSearchResults.messages?.length" class="search-group">
              <div class="search-group-title">聊天内容</div>
              <div v-for="item in globalSearchResults.messages" :key="'msg-' + item.id" class="search-result-item" @click="jumpToMessage(item)">
                <span class="result-avatar result-avatar-msg">M</span>
                <div class="result-msg-info">
                  <span class="result-name">{{ item.fromUserName || item.fromUserId }}</span>
                  <span class="result-preview">{{ item.contentPreview }}</span>
                </div>
                <span class="result-time">{{ item.sendTimeStr }}</span>
              </div>
            </div>
            <div v-if="isSearchEmpty" class="search-empty">
              <el-empty description="未找到匹配结果" :image-size="40" />
            </div>
          </div>
        </div>
        <el-tabs v-model="activeTab" @tab-change="handleTabChange" class="archive-tabs">
        <!-- Tab 1: 聊天会话 (原Tab2，现放第一位) -->
        <el-tab-pane label="聊天会话" name="conversations">
          <ConversationView
            ref="conversationViewRef"
            :config-id="selectedConfigId"
            @audit="(row: any) => handleAudit(row as ChatRecord)"
          />
        </el-tab-pane>

        <!-- Tab 2: 消息记录 (仅管理员可见) -->
        <el-tab-pane v-if="isAdminRole" label="消息记录" name="records">
          <div class="tab-toolbar">
            <el-input v-model="query.keyword" placeholder="搜索内容" clearable style="width: 180px" @keyup.enter="handleSearch" prefix-icon="Search" />
            <el-select v-model="query.msgType" placeholder="消息类型" clearable style="width: 120px" @change="handleSearch">
              <el-option label="文本" value="text" />
              <el-option label="图片" value="image" />
              <el-option label="语音" value="voice" />
              <el-option label="视频" value="video" />
              <el-option label="文件" value="file" />
            </el-select>
            <el-select v-model="query.departmentId" placeholder="选择部门" clearable style="width: 140px" @change="handleDeptChange">
              <el-option v-for="d in departments" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-select v-model="query.fromUserId" placeholder="选择成员" clearable filterable style="width: 140px" @change="handleSearch">
              <el-option v-for="m in filteredMembers" :key="m.wecomUserId" :label="m.name || m.wecomUserId" :value="m.wecomUserId" />
            </el-select>
            <el-select v-model="query.isSensitive" placeholder="敏感状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="敏感消息" value="1" />
              <el-option label="正常消息" value="0" />
            </el-select>
            <div class="date-range-group">
              <el-date-picker v-model="query.startDate" type="date" placeholder="开始日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleSearch" />
              <span class="date-separator">至</span>
              <el-date-picker v-model="query.endDate" type="date" placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 150px" @change="handleSearch" />
            </div>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button @click="handleResetSearch">重置</el-button>
            <el-button type="warning" @click="searchDrawerVisible = true">
              <el-icon><Search /></el-icon> 全文搜索
            </el-button>
          </div>

          <el-table :data="displayRecords" v-loading="loading" stripe>
            <el-table-column label="发送方" min-width="150">
              <template #default="{ row }">
                <span>{{ row.fromUserName || row.fromUserId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="接收方" min-width="150">
              <template #default="{ row }">
                <span>{{ formatToUsers(row.toUserIds) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="消息类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ getMsgTypeText(row.msgType) }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="消息内容" min-width="250">
              <template #default="{ row }">
                <div v-if="row.msgType === 'text'" class="msg-content">{{ getTextContent(row.content) }}</div>
                <div v-else-if="row.msgType === 'meta'" class="msg-meta-info">
                  <el-icon><InfoFilled /></el-icon>
                  {{ getMetaSummary(row.content) }}
                  <el-tag v-if="getMetaAgreed(row.content)" type="success" size="small">已同意</el-tag>
                  <el-tag v-else type="warning" size="small">未同意</el-tag>
                </div>
                <div v-else-if="row.msgType === 'image'" class="msg-media">
                  <el-image v-if="row.mediaUrl" :src="row.mediaUrl" :preview-src-list="[row.mediaUrl]" fit="cover" style="width: 60px; height: 60px; border-radius: 6px" />
                  <span v-else class="msg-placeholder">[图片]</span>
                </div>
                <div v-else class="msg-file">
                  <el-icon><Document /></el-icon>
                  <span>{{ row.fileName || `[${getMsgTypeText(row.msgType)}]` }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="发送时间" width="160" sortable>
              <template #default="{ row }">{{ formatMsgTime(row.msgTime) }}</template>
            </el-table-column>
            <el-table-column label="敏感" width="80" align="center">
              <template #default="{ row }">
                <el-tag v-if="row.isSensitive" type="danger" size="small">敏感</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button link type="primary" size="small" @click="handleAudit(row)">质检</el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination-wrapper">
            <el-pagination
              v-model:current-page="query.page"
              v-model:page-size="query.pageSize"
              :total="total"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="fetchList"
              @current-change="fetchList"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 3: 数据统计 -->
        <el-tab-pane label="数据统计" name="stats">
          <ArchiveStats :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- AI质检暂停开发，后续版本恢复 -->
        <!-- <el-tab-pane v-if="isAdminRole" label="AI质检" name="ai-inspect">
          <AiInspect :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane> -->

        <!-- Tab: 风险审计（管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="风险审计" name="risk-audit">
          <RiskAuditTab :config-id="selectedConfigId" @gotoConversation="handleGotoConversation" />
        </el-tab-pane>

        <!-- Tab 6: 敏感词管理（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="敏感词管理" name="sensitive">
          <SensitiveWordManager
            ref="sensitiveWordManagerRef"
            :config-id="selectedConfigId"
            @goArchiveSettings="activeTab = 'settings'"
          />
        </el-tab-pane>

        <!-- Tab 7: 存档设置（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="存档设置" name="settings">
          <ArchiveSettings :config-id="selectedConfigId" :is-demo-mode="isDemoMode" :auth-type="selectedAuthType" />
        </el-tab-pane>

        <!-- Tab 8: 套餐与配额（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="套餐与配额" name="purchase">
          <PackagePurchaseTab type="archive" />
        </el-tab-pane>
        </el-tabs>
      </div>
    </el-card>

    <!-- 质检弹窗 -->
    <AuditDialog
      ref="auditDialogRef"
      v-model="auditDialogVisible"
      @audit-success="fetchList"
    />

    <!-- 全文搜索抽屉 -->
    <FullTextSearchDrawer
      v-model="searchDrawerVisible"
      :config-id="selectedConfigId"
    />

    <!-- 购买弹窗 -->
    <PurchaseDialog
      ref="purchaseDialogRef"
      v-model="purchaseDialogVisible"
      @purchase-complete="handlePurchaseComplete"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomChatArchive' })
import { ref, computed, onMounted, nextTick } from 'vue'
import { Document, Refresh, Search, Lock, ShoppingCart, ChatLineSquare, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox, ClickOutside as vClickOutside } from 'element-plus'
import { getWecomConfigs, getChatArchiveStatus, getChatRecords, syncChatRecords, diagnoseChatRecords, getArchiveSeats, getWecomDepartments, getWecomUsers } from '@/api/wecom'
import { formatMsgTime, getMsgTypeText, getTextContent, getMetaSummary, getMetaAgreed, formatToUsers } from './utils'
import type { ArchiveStatus, ChatRecord } from './types'
import { useWecomDemo, DEMO_CONFIGS } from './composables/useWecomDemo'
import { getLastSelectedConfigId, saveSelectedConfigId } from './composables/useWecomConfig'
import { useUserStore } from '@/stores/user'
import api from '@/utils/request'

// 统一 V4.0 组件
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'

// 子组件
import ConversationView from './components/ConversationView.vue'
import ArchiveStats from './components/ArchiveStats.vue'
// AI质检暂停开发
// import AiInspect from './components/AiInspect.vue'
import SensitiveWordManager from './components/SensitiveWordManager.vue'
import ArchiveSettings from './components/ArchiveSettings.vue'
import PackagePurchaseTab from './components/PackagePurchaseTab.vue'
import RiskAuditTab from './components/RiskAuditTab.vue'
import AuditDialog from './components/AuditDialog.vue'
import FullTextSearchDrawer from './components/FullTextSearchDrawer.vue'
import PurchaseDialog from './components/PurchaseDialog.vue'

const { isDemoMode } = useWecomDemo()

// 当前用户角色判断
const userStore = useUserStore()
const currentUser = computed(() => userStore.currentUser)
const currentUserRole = computed(() => currentUser.value?.role || '')
const isAdminRole = computed(() => ['super_admin', 'admin'].includes(currentUserRole.value))
const isManagerRole = computed(() => ['department_manager', 'manager'].includes(currentUserRole.value))
const deptMemberCrmIds = ref<string[]>([])

const loading = ref(false)
const syncing = ref(false)
const configList = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)

// 综合搜索
const globalSearchKeyword = ref('')
const globalSearching = ref(false)
const globalSearchVisible = ref(false)
const globalSearchResults = ref<any>(null)
const isSearchEmpty = computed(() => {
  if (!globalSearchResults.value) return false
  const r = globalSearchResults.value
  return !r.members?.length && !r.customers?.length && !r.groups?.length && !r.messages?.length
})

const handleGlobalSearch = async () => {
  const kw = globalSearchKeyword.value.trim()
  if (!kw || !selectedConfigId.value) return
  globalSearching.value = true
  globalSearchVisible.value = true
  try {
    const { data } = await api.post('/wecom/chat-archive/global-search', {
      configId: selectedConfigId.value,
      keyword: kw,
      limit: 10
    })
    globalSearchResults.value = data.data || data
  } catch (e: any) {
    globalSearchResults.value = { members: [], customers: [], groups: [], messages: [] }
  } finally {
    globalSearching.value = false
  }
}
const handleClearGlobalSearch = () => {
  globalSearchResults.value = null
  globalSearchVisible.value = false
}
const handleCloseSearchPanel = () => {
  globalSearchVisible.value = false
}
const jumpToMember = (item: any) => {
  globalSearchVisible.value = false
  activeTab.value = 'conversations'
  nextTick(() => {
    const convView = conversationViewRef.value as any
    if (convView?.selectMemberById) convView.selectMemberById(item.wecomUserId)
  })
}
const jumpToCustomerConv = (item: any) => {
  globalSearchVisible.value = false
  activeTab.value = 'conversations'
  nextTick(() => {
    const convView = conversationViewRef.value as any
    if (convView?.jumpToConversation) convView.jumpToConversation('customer', item.memberId, item.externalUserId)
  })
}
const jumpToGroupConv = (item: any) => {
  globalSearchVisible.value = false
  activeTab.value = 'conversations'
  nextTick(() => {
    const convView = conversationViewRef.value as any
    if (convView?.jumpToConversation) convView.jumpToConversation('group', item.memberId, item.roomId)
  })
}
const jumpToMessage = (item: any) => {
  globalSearchVisible.value = false
  activeTab.value = 'conversations'
  nextTick(() => {
    const convView = conversationViewRef.value as any
    if (convView?.jumpToConversation) convView.jumpToConversation(item.convType || 'customer', item.memberId, item.peerId)
  })
}
const selectedAuthType = computed(() => {
  const cfg = configList.value.find((c: any) => c.id === selectedConfigId.value)
  return cfg?.authType || cfg?.authMode || 'third_party'
})
const recordList = ref<ChatRecord[]>([])
const total = ref(0)
const archiveStatus = ref<ArchiveStatus | null>(null)
const activeTab = ref('conversations')
const seatInfo = ref<any>(null)

// 部门和成员筛选
const departments = ref<any[]>([])
const allMembers = ref<any[]>([])
// 按角色过滤可见成员（管理员全部 | 经理本部门 | 其他仅自己）
const visibleMembers = computed(() => {
  if (isAdminRole.value) return allMembers.value
  if (isManagerRole.value) {
    return allMembers.value.filter((m: any) =>
      m.crmUserId && deptMemberCrmIds.value.includes(m.crmUserId)
    )
  }
  const myId = currentUser.value?.id
  return allMembers.value.filter((m: any) => m.crmUserId === myId)
})

const filteredMembers = computed(() => {
  const base = visibleMembers.value
  if (!query.value.departmentId) return base
  return base.filter((m: any) => {
    const deptIds = m.departmentIds || m.department || ''
    return String(deptIds).includes(String(query.value.departmentId))
  })
})

const query = ref({
  keyword: '',
  msgType: '',
  fromUserId: '',
  departmentId: '' as string | number,
  isSensitive: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 20
})

// 显示配置
const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

// 示例消息记录
const demoRecords: ChatRecord[] = [
  { id: -1, fromUserId: 'zhangsan', fromUserName: '张三', toUserIds: '["ext_chen"]', msgType: 'text', content: '{"content":"您好，关于您咨询的产品方案，我已经整理好了详细报价单"}', msgTime: '2026-04-15T10:30:00Z', isSensitive: false } as any,
  { id: -2, fromUserId: 'ext_chen', fromUserName: '陈女士', toUserIds: '["zhangsan"]', msgType: 'text', content: '{"content":"好的，麻烦发一下，我看看价格是否合适"}', msgTime: '2026-04-15T10:31:00Z', isSensitive: false } as any,
  { id: -3, fromUserId: 'lisi', fromUserName: '李四', toUserIds: '["ext_liu"]', msgType: 'image', content: '', msgTime: '2026-04-15T11:20:00Z', isSensitive: false } as any,
  { id: -4, fromUserId: 'ext_liu', fromUserName: '刘先生', toUserIds: '["lisi"]', msgType: 'text', content: '{"content":"这个产品质量怎么样？有售后保障吗？"}', msgTime: '2026-04-15T11:22:00Z', isSensitive: false } as any,
  { id: -5, fromUserId: 'wangwu', fromUserName: '王五', toUserIds: '["ext_zhao"]', msgType: 'text', content: '{"content":"退款已经处理了，预计3个工作日到账"}', msgTime: '2026-04-15T14:10:00Z', isSensitive: true } as any,
]

const displayRecords = computed(() => {
  if (recordList.value.length > 0 || !isDemoMode.value) return recordList.value
  return demoRecords
})

// 席位百分比
const seatPercent = computed(() => {
  if (!seatInfo.value || !seatInfo.value.total || seatInfo.value.total === 0) return 0
  return Math.min(100, Math.round((seatInfo.value.used / seatInfo.value.total) * 100))
})

// 子组件 refs
const conversationViewRef = ref<InstanceType<typeof ConversationView> | null>(null)
const sensitiveWordManagerRef = ref<InstanceType<typeof SensitiveWordManager> | null>(null)
const auditDialogRef = ref<InstanceType<typeof AuditDialog> | null>(null)
const purchaseDialogRef = ref<InstanceType<typeof PurchaseDialog> | null>(null)

// 弹窗
const auditDialogVisible = ref(false)
const searchDrawerVisible = ref(false)
const purchaseDialogVisible = ref(false)

// ==================== 数据获取 ====================

const fetchStatus = async () => {
  try {
    const res = await getChatArchiveStatus()
    archiveStatus.value = (res as ArchiveStatus) || null
  } catch {
    // 静默处理
  }
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    const configs = Array.isArray(res) ? res : []
    configList.value = configs.filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      const lastId = getLastSelectedConfigId()
      if (lastId && configList.value.some((c: any) => c.id === lastId)) {
        selectedConfigId.value = lastId
      } else {
        selectedConfigId.value = configList.value[0].id
      }
      fetchList()
      fetchSeatInfo()
      fetchDeptAndMembers()
    }
  } catch {
    // 静默处理
  }
}

const fetchList = async () => {
  if (!selectedConfigId.value && !isDemoMode.value) return
  loading.value = true
  try {
    // 非管理员且未选择具体成员时，限制为可见成员范围
    let fromUserIdParam = query.value.fromUserId || undefined
    if (!fromUserIdParam && !isAdminRole.value && visibleMembers.value.length > 0) {
      fromUserIdParam = visibleMembers.value.map((m: any) => m.wecomUserId).join(',')
    }
    const params: any = {
      configId: selectedConfigId.value,
      keyword: query.value.keyword || undefined,
      msgType: query.value.msgType || undefined,
      fromUserId: fromUserIdParam,
      isSensitive: query.value.isSensitive || undefined,
      startDate: query.value.startDate || undefined,
      endDate: query.value.endDate || undefined,
      page: query.value.page,
      pageSize: query.value.pageSize
    }
    // Clean undefined
    Object.keys(params).forEach(k => {
      if (params[k] === undefined || params[k] === '') delete params[k]
    })
    const res: any = await getChatRecords(params)
    if (res?.list) {
      recordList.value = res.list
      total.value = res.total || 0
    } else {
      recordList.value = []
      total.value = 0
    }
  } catch {
    recordList.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const fetchSeatInfo = async () => {
  if (!selectedConfigId.value) return
  try {
    const res: any = await getArchiveSeats(selectedConfigId.value)
    // 后端返回 maxUsers/usedUsers，前端统一映射为 total/used
    if (res) {
      seatInfo.value = {
        total: res.maxUsers || res.total || 0,
        used: res.usedUsers || res.used || 0,
        expireDate: res.expireDate || null,
        status: res.status || 'inactive'
      }
    } else {
      seatInfo.value = null
    }
  } catch {
    // 静默
  }
}

// 加载角色范围成员（经理用）
const loadScopeMembers = async () => {
  if (isAdminRole.value) return
  if (isManagerRole.value) {
    try {
      const res = (await api.get('/users/department-members')) as any
      const members = res?.data || res || []
      deptMemberCrmIds.value = members.map((m: any) => m.userId || m.id).filter(Boolean)
      const myId = currentUser.value?.id
      if (myId && !deptMemberCrmIds.value.includes(myId)) {
        deptMemberCrmIds.value.push(myId)
      }
    } catch {
      deptMemberCrmIds.value = []
    }
  }
}

const fetchDeptAndMembers = async () => {
  if (!selectedConfigId.value) return
  try {
    await loadScopeMembers()
    const [deptRes, memberRes] = await Promise.allSettled([
      getWecomDepartments(selectedConfigId.value),
      getWecomUsers(selectedConfigId.value)
    ])
    if (deptRes.status === 'fulfilled') {
      departments.value = Array.isArray(deptRes.value) ? deptRes.value : []
    }
    if (memberRes.status === 'fulfilled') {
      allMembers.value = Array.isArray(memberRes.value) ? memberRes.value : []
    }
  } catch {
    // 静默
  }
}

// ==================== 事件处理 ====================

const handleConfigChange = () => {
  saveSelectedConfigId(selectedConfigId.value)
  fetchList()
  fetchSeatInfo()
  fetchDeptAndMembers()
  if (activeTab.value === 'conversations') {
    conversationViewRef.value?.fetchConversations()
  }
}

const handleTabChange = (tab: string) => {
  if (tab === 'conversations') {
    conversationViewRef.value?.fetchConversations()
  }
  if (tab === 'sensitive') {
    sensitiveWordManagerRef.value?.fetchSensitiveWords()
  }
}

const handleSearch = () => {
  query.value.page = 1
  fetchList()
}

const handleResetSearch = () => {
  query.value.keyword = ''
  query.value.msgType = ''
  query.value.fromUserId = ''
  query.value.departmentId = ''
  query.value.isSensitive = ''
  query.value.startDate = ''
  query.value.endDate = ''
  query.value.page = 1
  fetchList()
}

const handleDeptChange = () => {
  query.value.fromUserId = ''
  handleSearch()
}

const handleSync = async () => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权企微后可同步')
    return
  }
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择企微配置')
    return
  }
  syncing.value = true
  try {
    const res: any = await syncChatRecords(selectedConfigId.value)
    let msg = '同步完成'
    if (res) {
      const parts: string[] = []
      if (res.permitUsers !== undefined) parts.push(`存档成员${res.permitUsers}人`)
      // 区分真实消息和元数据
      const realMsgCount = res.totalFetched > 0 ? (res.syncedRecords - (res.metaRecords || 0)) : 0
      const metaCount = res.metaRecords || res.newConversations || 0
      if (realMsgCount > 0) parts.push(`新增${realMsgCount}条聊天记录`)
      if (metaCount > 0) parts.push(`加载${metaCount}条会话`)
      if (!realMsgCount && !metaCount && res.syncedRecords > 0) parts.push(`更新${res.syncedRecords}条记录`)
      if (res.enrichedContacts) parts.push(`更新${res.enrichedContacts}个联系人`)
      if (res.agreedUsers) parts.push(`${res.agreedUsers}人已同意存档`)

      if (parts.length > 0) {
        msg = parts.join('，')
      } else if (res.permitUsers === 0) {
        msg = '没有开通会话存档的成员'
      } else if (res.permitUsers > 0 && !res.syncedRecords) {
        msg = `${res.permitUsers}个存档成员，暂无新消息`
      }

      // 公钥状态和详细提示
      if (res.pubKeyStatus === 'not_set') {
        ElMessage.warning('公钥尚未上传至企微，本次同步将自动设置。请等待5-10分钟后再次同步获取消息。')
      }

      // sync_msg 状态详细提示
      if (res.syncMsgStatus === 'error') {
        setTimeout(() => {
          ElMessage.error({
            message: `sync_msg调用失败：${res.syncMsgError || '未知错误'}。请点击"诊断"按钮查看详情。`,
            duration: 10000
          })
        }, 500)
      } else if (res.syncMsgStatus === 'empty') {
        setTimeout(() => {
          ElMessage.warning({
            message: 'sync_msg返回0条消息。请点击「诊断」按钮查看专区程序的实际响应。可能原因：1）专区程序未正确配置SDK接口权限(sync_msg) 2）企业未在企微后台开启会话存档 3）公钥上传后尚无新消息被存档',
            duration: 12000
          })
        }, 500)
      }

      // 首次同步引导：提示用户去设置生效范围
      if (res.permitUsers > 0 && res.mode === 'chatdata_zone') {
        setTimeout(() => {
          if (realMsgCount === 0 && metaCount > 0 && !res.syncMsgError) {
            ElMessage.info({
              message: '当前加载的仅为客户会话列表元数据，员工和群聊需sync_msg正确返回才会显示。',
              duration: 6000
            })
          }
        }, 1500)
      }
    }
    ElMessage.success(msg)
    if (activeTab.value === 'records') {
      fetchList()
    } else {
      // 同步后刷新存档成员列表和会话列表
      await conversationViewRef.value?.fetchArchiveMembers()
      conversationViewRef.value?.fetchConversations()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

const diagnosing = ref(false)
const handleDiagnose = async () => {
  if (!selectedConfigId.value) return
  diagnosing.value = true
  try {
    const res: any = await diagnoseChatRecords(selectedConfigId.value)
    const d = res
    const lines = [
      `【诊断结果】`,
      `企微配置: corpId=${d.config?.corpId}, authType=${d.config?.authType}`,
      `Token: ${d.token?.prefix} (len=${d.token?.len})`,
      `已保存游标: ${d.savedCursor}`,
      ``
    ]

    if (d.zoneCall) {
      lines.push(`===== 专区程序调用 sync_call_program =====`)
      lines.push(`平台响应码: ${d.zoneCall.platform_errcode}`)
      lines.push(`平台消息: ${d.zoneCall.platform_errmsg}`)
      lines.push(`使用ability_id: ${d.zoneCall.ability_id_used}`)
      lines.push(`get_msg_body ability: ${d.zoneCall.get_msg_body_ability}`)
      if (d.zoneCall.error) {
        lines.push(`❌ 错误: ${d.zoneCall.error}`)
        if (d.zoneCall.response) lines.push(`响应: ${JSON.stringify(d.zoneCall.response)}`)
      }
      if (d.zoneCall.parsed) {
        lines.push(`--- 专区程序返回内容 ---`)
        lines.push(`errcode: ${d.zoneCall.parsed.errcode}`)
        lines.push(`errmsg: ${d.zoneCall.parsed.errmsg}`)
        lines.push(`msg_list数量: ${d.zoneCall.parsed.msg_list_count}`)
        lines.push(`has_more: ${d.zoneCall.parsed.has_more}`)
        lines.push(`keys: ${d.zoneCall.parsed.keys}`)
        lines.push(`原始前200字符: ${d.zoneCall.parsed.first_100_chars}`)
      }
      if (d.zoneCall.firstMsgStructure) {
        const fm = d.zoneCall.firstMsgStructure
        lines.push(`--- 首条消息密钥诊断 ---`)
        lines.push(`msgid: ${fm.msgid}`)
        lines.push(`消息字段: ${fm.raw_keys}`)
        lines.push(`has_service_encrypt_info: ${fm.has_service_encrypt_info}`)
        lines.push(`service_encrypt_info字段: ${fm.service_encrypt_info_keys}`)
        lines.push(`encrypted_secret_key长度: ${fm.encrypted_secret_key_len}`)
        lines.push(`encrypted_secret_key预览: ${fm.encrypted_secret_key_preview || '(无)'}`)
        lines.push(`--- RSA实时解密测试 ---`)
        lines.push(`私钥格式: ${fm.private_key_format || '(未知)'}`)
        lines.push(`私钥长度: ${fm.private_key_len || 0}`)
        lines.push(`私钥含真实换行: ${fm.private_key_has_real_newlines ?? '未知'}`)
        lines.push(`私钥含字面\\n: ${fm.private_key_has_literal_backslash_n ?? '未知'}`)
        lines.push(`私钥前80字符: ${fm.private_key_first80 || '(空)'}`)
        lines.push(`解密结果: ${fm.rsa_decrypt_test}`)
        if (fm.rsa_decrypt_details?.length) {
          for (const detail of fm.rsa_decrypt_details) {
            lines.push(`  ${detail}`)
          }
        }
      }
      lines.push(`response_data长度: ${d.zoneCall.response_data_len}`)
      lines.push(``)
    }

    if (d.directCall) {
      lines.push(`===== 直接HTTP调用 sync_msg =====`)
      lines.push(`errcode: ${d.directCall.errcode}`)
      lines.push(`errmsg: ${d.directCall.errmsg}`)
      if (d.directCall.msg_list_count !== undefined) {
        lines.push(`msg_list数量: ${d.directCall.msg_list_count}`)
      }
      if (d.directCall.note) lines.push(`说明: ${d.directCall.note}`)
      lines.push(``)
    }

    lines.push(`===== 数据库 =====`)
    lines.push(`真实消息记录: ${d.dbRecordCount}`)
    lines.push(`含有效secretKey(非空): ${d.dbWithSecretKey ?? '未知'}`)
    lines.push(`secretKey为空的记录: ${d.dbEmptySecretKey ?? '未知'}`)
    lines.push(`元数据记录: ${d.dbMetaCount ?? 'N/A'}`)
    if (d.sampleContent) {
      lines.push(``)
      lines.push(`===== 最新一条记录采样 =====`)
      lines.push(`msg_id: ${d.sampleContent.msg_id}`)
      lines.push(`from_user_id: ${d.sampleContent.from_user_id}`)
      lines.push(`to_user_ids: ${d.sampleContent.to_user_ids}`)
      if (d.sampleContent.content_parsed) {
        const cp = d.sampleContent.content_parsed
        lines.push(`secretKey长度: ${cp.secretKeyLength}`)
        lines.push(`secretKey预览: ${cp.secretKeyPreview || '(空)'}`)
        lines.push(`msgtype: ${cp.msgtype}`)
      } else {
        lines.push(`content原始(前200): ${(d.sampleContent.content_raw || '').slice(0, 200)}`)
      }
    }
    if (d.avatarDiag) {
      const a = d.avatarDiag
      lines.push(``)
      lines.push(`===== 头像诊断 =====`)
      lines.push(`员工绑定: ${a.staff_total}条, 有头像: ${a.staff_with_avatar}条`)
      lines.push(`客户记录: ${a.customer_total}条, 有头像: ${a.customer_with_avatar}条`)
      if (a.sample_staff?.length) {
        lines.push(`--- 员工采样 ---`)
        a.sample_staff.forEach((s: any) => lines.push(`  ${s.id}: ${s.name || '(无名)'}, 头像=${s.avatar}`))
      }
      if (a.sample_customers?.length) {
        lines.push(`--- 客户采样 ---`)
        a.sample_customers.forEach((c: any) => lines.push(`  ${c.id}...: ${c.name || '(无名)'}, 头像=${c.avatar}`))
      }
    }

    ElMessageBox.alert(lines.join('\n'), '会话存档诊断', {
      confirmButtonText: '确定',
      customClass: 'diagnose-message-box',
      dangerouslyUseHTMLString: false
    }).catch(() => { /* 用户关闭弹窗 */ })
  } catch (e: any) {
    ElMessage.error('诊断失败: ' + (e?.message || '未知错误'))
  } finally {
    diagnosing.value = false
  }
}


const handleAudit = (row: ChatRecord) => {
  auditDialogRef.value?.open(row)
  auditDialogVisible.value = true
}

const openPurchaseDialog = () => {
  purchaseDialogRef.value?.open()
  purchaseDialogVisible.value = true
}

const handlePurchaseComplete = () => {
  window.location.reload()
}

// ==================== 风险审计跳转 ====================
const handleGotoConversation = (data: { fromUserId: string; toUserId: string; msgTime: number }) => {
  activeTab.value = 'conversations'
  ElMessage.info(`已跳转到聊天会话，请在左侧选择成员 ${data.fromUserId} 查看上下文`)
}

// ==================== 初始化 ====================

onMounted(() => {
  fetchStatus()
  fetchConfigs()
})
</script>

<style scoped lang="scss">
.wecom-chat-archive {
  padding: 20px;
  background: var(--v4-bg-page, #F5F7FA);
  min-height: 100%;
}

.purchase-card { margin-bottom: 20px; }

.tab-toolbar {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 16px;
}

.date-range-group {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  .date-separator {
    color: #909399;
    font-size: 13px;
  }
}

.msg-content {
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #4B5563;
}

.msg-media { display: inline-block; }
.msg-placeholder { color: #9CA3AF; }

.msg-file {
  display: flex;
  align-items: center;
  gap: 5px;
  color: #4C6EF5;
}

.msg-meta-info {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
  font-style: italic;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 席位配额条 */
.seat-quota-bar {
  background: linear-gradient(135deg, #EEF2FF 0%, #F5F7FA 100%);
  border: 1px solid #E0E7FF;
  border-radius: 12px;
  padding: 14px 18px;
  margin-bottom: 16px;

  .seat-info {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 8px;
    font-size: 14px;
    color: #4B5563;
  }

  .seat-label {
    font-weight: 600;
    color: #1F2937;
  }

  .seat-detail {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 12px;
    color: #9CA3AF;
    margin-top: 6px;
  }
}

/* 示例预览 */
.demo-overlay-wrapper { position: relative; }
.demo-chat-preview { position: relative; overflow: hidden; border-radius: 12px; }
.demo-header { padding: 12px 20px; background: #f5f7fa; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.demo-messages { padding: 20px; min-height: 200px; background: #f9fafb; }
.demo-msg { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 16px; }
.demo-msg-right { justify-content: flex-end; }
.demo-avatar { width: 36px; height: 36px; border-radius: 50%; background: #e4e7ed; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
.demo-bubble { max-width: 280px; padding: 10px 14px; background: #fff; border-radius: 10px; font-size: 14px; color: #303133; box-shadow: 0 1px 3px rgba(0,0,0,0.05); }
.demo-bubble-right { background: #95ec69; }
.demo-blur-mask {
  position: absolute; top: 0; left: 0; right: 0; bottom: 0;
  backdrop-filter: blur(6px); background: rgba(255,255,255,0.7);
  display: flex; align-items: center; justify-content: center;
}
.demo-lock-info { text-align: center; padding: 30px; }
.demo-lock-info h3 { margin: 12px 0 8px; font-size: 20px; }
.demo-lock-info p { color: #909399; margin-bottom: 16px; }
.demo-features { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; margin-bottom: 20px; }
.demo-features span { background: #f5f7fa; padding: 4px 10px; border-radius: 6px; font-size: 13px; }

/* Tab + 搜索并排布局 */
.tabs-with-search {
  position: relative;
}

.global-search-bar {
  position: absolute;
  top: 0;
  right: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  z-index: 10;
  height: 40px;

  .global-search-input {
    width: 220px;
  }
}

.archive-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.archive-tabs :deep(.el-tabs__nav-wrap) {
  padding-right: 320px;
}

.global-search-results {
  position: absolute;
  top: 100%;
  right: 0;
  width: 420px;
  max-height: 420px;
  overflow-y: auto;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.12);
  border: 1px solid #e4e7ed;
  z-index: 2000;
  padding: 8px 0;
}

.search-group {
  padding: 4px 0;
  & + .search-group {
    border-top: 1px solid #f0f0f0;
  }
}

.search-group-title {
  padding: 6px 16px 4px;
  font-size: 12px;
  font-weight: 600;
  color: #909399;
  text-transform: uppercase;
}

.search-result-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  cursor: pointer;
  transition: background 0.15s;

  &:hover {
    background: #f5f7fa;
  }
}

.result-avatar {
  width: 30px;
  height: 30px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  flex-shrink: 0;
}
.result-avatar-staff { background: #409eff; }
.result-avatar-customer { background: #67c23a; }
.result-avatar-group { background: #e6a23c; }
.result-avatar-msg { background: #909399; font-size: 14px; }

.result-name {
  font-size: 14px;
  color: #303133;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.result-sub {
  font-size: 12px;
  color: #909399;
}
.result-preview {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 200px;
}
.result-time {
  font-size: 11px;
  color: #c0c4cc;
  flex-shrink: 0;
}
.result-msg-info {
  display: flex;
  align-items: center;
  flex: 1;
  overflow: hidden;
}

.search-empty {
  padding: 12px;
}
</style>

<style lang="scss">
.diagnose-message-box {
  .el-message-box__message {
    white-space: pre-wrap;
    font-family: 'Consolas', 'Monaco', monospace;
    font-size: 12px;
    line-height: 1.6;
    max-height: 60vh;
    overflow-y: auto;
  }
}
</style>

