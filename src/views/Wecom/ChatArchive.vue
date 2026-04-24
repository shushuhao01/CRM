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

      <!-- V4.0 7 Tab 结构 — 聊天会话放第一位 -->
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <!-- Tab 1: 聊天会话 (原Tab2，现放第一位) -->
        <el-tab-pane label="聊天会话" name="conversations">
          <ConversationView
            ref="conversationViewRef"
            :config-id="selectedConfigId"
            @audit="(row: any) => handleAudit(row as ChatRecord)"
          />
        </el-tab-pane>

        <!-- Tab 2: 消息记录 (原Tab1，现放第二位) -->
        <el-tab-pane label="消息记录" name="records">
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

        <!-- Tab 5: AI质检 -->
        <el-tab-pane label="AI质检" name="ai-inspect">
          <AiInspect :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- Tab 6: 敏感词管理 -->
        <el-tab-pane label="敏感词管理" name="sensitive">
          <SensitiveWordManager
            ref="sensitiveWordManagerRef"
            :config-id="selectedConfigId"
            @goArchiveSettings="activeTab = 'settings'"
          />
        </el-tab-pane>

        <!-- Tab 7: 存档设置 -->
        <el-tab-pane label="存档设置" name="settings">
          <ArchiveSettings :config-id="selectedConfigId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>

        <!-- Tab 8: 套餐与配额 -->
        <el-tab-pane label="套餐与配额" name="purchase">
          <PackagePurchaseTab type="archive" />
        </el-tab-pane>
      </el-tabs>
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
import { ref, computed, onMounted } from 'vue'
import { Document, Refresh, Search, Lock, ShoppingCart, ChatLineSquare, InfoFilled } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getWecomConfigs, getChatArchiveStatus, getChatRecords, syncChatRecords, getArchiveSeats, getWecomDepartments, getWecomUsers } from '@/api/wecom'
import { formatMsgTime, getMsgTypeText, getTextContent, getMetaSummary, getMetaAgreed, formatToUsers } from './utils'
import type { ArchiveStatus, ChatRecord } from './types'
import { useWecomDemo, DEMO_CONFIGS } from './composables/useWecomDemo'
import { useUserStore } from '@/stores/user'
import api from '@/utils/request'

// 统一 V4.0 组件
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'

// 子组件
import ConversationView from './components/ConversationView.vue'
import ArchiveStats from './components/ArchiveStats.vue'
import AiInspect from './components/AiInspect.vue'
import SensitiveWordManager from './components/SensitiveWordManager.vue'
import ArchiveSettings from './components/ArchiveSettings.vue'
import PackagePurchaseTab from './components/PackagePurchaseTab.vue'
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
  if (!seatInfo.value) return 0
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
      selectedConfigId.value = configList.value[0].id
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
    seatInfo.value = res || null
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
    ElMessage.success(res?.message || '同步请求已发送')
    if (activeTab.value === 'records') {
      fetchList()
    } else {
      conversationViewRef.value?.fetchConversations()
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncing.value = false
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
</style>

