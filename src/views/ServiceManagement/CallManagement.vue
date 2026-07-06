<template>
  <div class="call-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>通话管理</h2>
      <div class="header-actions">
        <el-tooltip :content="callStatus === 'ready' ? '点击切换为忙碌状态，将不接收来电分配' : '点击切换为就绪状态，可以接收来电分配'">
          <el-button
            :type="callStatus === 'ready' ? 'success' : 'warning'"
            @click="toggleCallStatus"
            class="status-button"
          >
            <el-icon style="margin-right: 6px;" v-if="callStatus === 'ready'"><CircleCheckFilled /></el-icon>
            <el-icon style="margin-right: 6px;" v-else><WarningFilled /></el-icon>
            {{ callStatus === 'ready' ? '就绪' : '忙碌' }}
          </el-button>
        </el-tooltip>
        <el-button type="info" :icon="Setting" @click="openCallConfigDialog">
          呼出配置
        </el-button>
        <el-tooltip :content="autoRefresh ? '关闭自动刷新' : '开启自动刷新'">
          <el-button
            :type="autoRefresh ? 'success' : 'info'"
            :icon="autoRefresh ? 'VideoPause' : 'VideoPlay'"
            @click="toggleAutoRefresh"
            circle
          />
        </el-tooltip>
        <el-button type="info" @click="testIncomingCall">
          测试呼入
        </el-button>
      </div>
    </div>

    <!-- 数据统计卡片 -->
    <CallStatsCards :statistics="statistics" :dateRange="filterForm.dateRange" />

    <!-- 筛选器和搜索栏 -->
    <CallFilterBar
      :filterForm="filterForm"
      v-model:searchKeyword="searchKeyword"
      :canViewSalesPersonFilter="canViewSalesPersonFilter"
      :salesPersonList="salesPersonList"
      @update:filterForm="handleFilterFormUpdate"
      @search="handleSearch"
      @reset="resetFilter"
    />

    <!-- 呼出列表表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>呼出列表</span>
          <div class="table-actions">
            <el-button v-if="canManage" type="success" @click="showImportDialog = true">
              <el-icon style="margin-right: 4px;"><Upload /></el-icon>导入资料
            </el-button>
            <el-button v-if="selectedRows.length > 0 && canAssign" type="primary" plain @click="handleBatchAssignClick">
              批量分配 ({{ selectedRows.length }})
            </el-button>
            <el-button v-if="selectedRows.length > 0" type="warning" @click="handleBatchConvert">
              批量转入客户 ({{ selectedRows.length }})
            </el-button>
            <el-button v-if="selectedRows.length > 0 && canDelete" type="danger" plain @click="handleBatchDelete">
              批量删除 ({{ selectedRows.length }})
            </el-button>
            <el-button type="primary" :icon="Phone" @click="openOutboundDialog">发起外呼</el-button>
            <el-button :icon="Refresh" @click="refreshData" :loading="refreshLoading">刷新数据</el-button>
            <el-button type="primary" :icon="Phone" @click="showCallRecordsDialog">通话记录</el-button>
            <el-button :icon="Download" @click="handleExport">导出数据</el-button>
          </div>
        </div>
      </template>

      <el-table
        :data="outboundList"
        style="width: 100%"
        v-loading="loading"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column prop="customerName" label="客户姓名" min-width="140">
          <template #default="{ row }">
            <el-tag v-if="row._source === 'customer'" type="success" size="small" style="margin-right:6px;">自建</el-tag>
            <el-tag v-else type="warning" size="small" style="margin-right:6px;">导入</el-tag>
            <span>{{ row.customerName }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="phone" label="电话号码" width="140">
          <template #default="{ row }">
            <span
              class="phone-link"
              @click="goCustomerDetail(row)"
              :title="'点击查看客户详情'"
            >{{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerLevel" label="客户等级" width="100">
          <template #default="{ row }">
            <el-tag :type="getLevelType(row.customerLevel)">
              {{ getLevelText(row.customerLevel) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastCallTime" label="最后通话" width="160" />
        <el-table-column prop="callCount" label="通话次数" width="90" />
        <el-table-column prop="lastFollowUp" label="最新跟进" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.lastFollowUp">{{ row.lastFollowUp }}</span>
            <span v-else class="text-muted">暂无记录</span>
          </template>
        </el-table-column>
        <el-table-column prop="callTags" label="通话标签" min-width="100">
          <template #default="{ row }">
            <template v-if="row.callTags && row.callTags.length > 0">
              <el-tag v-for="tag in row.callTags" :key="tag" size="small" type="info" style="margin-right: 4px;">
                {{ tag }}
              </el-tag>
            </template>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="外呼状态" width="90">
          <template #default="{ row }">
            <el-tag :type="row.callCount > 0 ? 'success' : 'warning'">
              {{ row.callCount > 0 ? '已外呼' : '待外呼' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdByName" label="创建人" width="90" />
        <el-table-column prop="assignStatus" label="分配状态" width="90">
          <template #default="{ row }">
            <template v-if="row._source === 'customer'">
              <el-tag v-if="row._isShared" type="success" size="small">已分享</el-tag>
              <el-tag v-else type="info" size="small">-</el-tag>
            </template>
            <template v-else>
              <el-tag v-if="row.assignedTo" type="success" size="small">已分配</el-tag>
              <el-tag v-else type="info" size="small">未分配</el-tag>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="assignedName" label="被分配人" width="90">
          <template #default="{ row }">
            <template v-if="row._source === 'customer'">
              <span v-if="row._sharedToName">{{ row._sharedToName }}</span>
              <span v-else class="text-muted">-</span>
            </template>
            <template v-else>
              <span v-if="row.assignedName">{{ row.assignedName }}</span>
              <span v-else class="text-muted">-</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column prop="convertStatus" label="转入状态" width="85">
          <template #default="{ row }">
            <el-tooltip v-if="row._source === 'customer'" content="自建客户已存在客户列表，无需转入" placement="top">
              <span class="text-muted">-</span>
            </el-tooltip>
            <el-tag v-else-if="row._prospectStatus === 'converted'" type="success" size="small">已转入</el-tag>
            <el-tag v-else type="info" size="small">未转入</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="100" show-overflow-tooltip>
          <template #default="{ row }">
            <span v-if="row.remark">{{ row.remark }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" min-width="210" fixed="right">
          <template #default="{ row }">
            <div class="action-cell">
              <span class="action-link" @click="handleCall(row)">外呼</span>
              <span class="action-link" @click="handleViewDetail(row)">详情</span>
              <span class="action-link" @click="handleAddFollowUp(row)">跟进</span>
              <el-dropdown v-if="row._source === 'import'" trigger="click" @command="(cmd: string) => handleMoreAction(cmd, row)">
                <span class="action-link" style="color:#409eff">更多<el-icon style="margin-left:2px;vertical-align:middle"><ArrowDown /></el-icon></span>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="canAssign" command="assign">分配</el-dropdown-item>
                    <el-dropdown-item v-if="row._prospectStatus !== 'converted'" command="convert">转入客户列表</el-dropdown-item>
                    <el-dropdown-item v-if="row._prospectStatus === 'converted'" disabled>已转入客户列表</el-dropdown-item>
                    <el-dropdown-item v-if="canDelete && row._prospectStatus !== 'converted'" command="delete" divided style="color:#f56c6c">删除</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-wrapper">
        <div class="pagination-stats">
          <span class="stats-text">
            共 {{ pagination.total }} 条记录，当前显示第 {{ (pagination.currentPage - 1) * pagination.pageSize + 1 }} - {{ Math.min(pagination.currentPage * pagination.pageSize, pagination.total) }} 条
          </span>
        </div>
        <el-pagination
          v-model:current-page="pagination.currentPage"
          v-model:page-size="pagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="handleSizeChange"
          @current-change="handleCurrentChange"
        />
      </div>
    </el-card>


    <!-- 澶栧懠瀵硅瘽妗?+ 缁戝畾浜岀淮鐮佸脊绐?-->
    <CallOutboundDialog
      v-model:visible="showOutboundDialog"
      v-model:bindQRDialogVisible="bindQRDialogVisible"
      :outboundForm="outboundForm"
      :outboundRules="outboundRules"
      :outboundLoading="outboundLoading"
      :workPhones="workPhones"
      :availableLines="availableLines"
      :customerOptions="customerOptions"
      :phoneOptions="phoneOptions"
      :isSearching="isSearching || customerStore.loading"
      :canStartCall="canStartCall"
      :getCannotCallReason="getCannotCallReason"
      :selectedWorkPhoneOnline="selectedWorkPhoneOnline"
      :selectedWorkPhoneOffline="selectedWorkPhoneOffline"
      :bindQRCodeUrl="bindQRCodeUrl"
      :bindStatus="bindStatus"
      @init="initOutboundDialog"
      @close="closeOutboundDialog"
      @start-call="startOutboundCall"
      @search-customers="debouncedSearchCustomers"
      @customer-change="onCustomerChange"
      @outbound-method-change="onOutboundMethodChange"
      @refresh-device-status="handleRefreshDeviceStatus"
      @show-bind-qr-code="handleShowBindQRCode"
      @refresh-bind-qr-code="refreshBindQRCode"
      @stop-bind-status-check="stopBindStatusCheck"
    />

    <!-- 瀹㈡埛璇︽儏寮圭獥 -->
    <CallCustomerDetailDialog
      v-model:visible="showDetailDialog"
      v-model:activeTab="activeTab"
      :currentCustomer="currentCustomer"
      :detailLoading="detailLoading"
      :customerOrders="customerOrders"
      :customerCalls="customerCalls"
      :customerFollowups="customerFollowups"
      :customerAftersales="customerAftersales"
      :detailPagination="detailPagination"
      :paginatedOrders="paginatedOrders"
      :paginatedCalls="paginatedCalls"
      :paginatedFollowups="paginatedFollowups"
      :paginatedAftersales="paginatedAftersales"
      @create-order="handleCreateOrder"
      @create-aftersales="handleCreateAftersales"
      @detail-outbound-call="handleDetailOutboundCall"
      @open-followup-dialog="openFollowupDialog"
      @view-order="viewOrder"
      @view-aftersales="viewAftersales"
      @view-call-detail="viewCallDetail"
      @view-followup="viewFollowup"
      @play-recording="playRecording"
      @download-recording="downloadRecording"
    />

    <!-- 閫氳瘽璁板綍寮圭獥 + 褰曢煶鎾斁 -->
    <CallRecordsDialog
      v-model:visible="callRecordsDialogVisible"
      v-model:recordingPlayerVisible="recordingPlayerVisible"
      :callRecordsLoading="callRecordsLoading"
      :callRecordsList="callRecordsList"
      :callRecordsFilter="callRecordsFilter"
      @update:callRecordsFilter="handleCallRecordsFilterUpdate"
      :callRecordsPagination="callRecordsPagination"
      :currentRecording="currentRecording"
      @load-records="loadCallRecords"
      @reset-filter="resetCallRecordsFilter"
      @page-size-change="handleCallRecordsPageSizeChange"
      @page-change="handleCallRecordsPageChange"
      @play-recording="playRecording"
      @download-recording="downloadRecording"
      @close-records="handleCloseCallRecordsDialog"
      @stop-recording="stopRecording"
    />

    <!-- 蹇嵎璺熻繘 + 鍛煎叆寮圭獥 + 閫氳瘽涓诞鍔ㄧ獥鍙?-->
    <CallFloatingWindow
      v-model:quickFollowUpVisible="quickFollowUpVisible"
      v-model:incomingCallVisible="incomingCallVisible"
      v-model:callNotes="callNotes"
      :currentCustomer="currentCustomer"
      :quickFollowUpForm="quickFollowUpForm"
      :quickFollowUpRules="quickFollowUpRules"
      :quickFollowUpSubmitting="quickFollowUpSubmitting"
      :callTagOptions="callTagOptions"
      :customerShippingAddress="getCustomerShippingAddress(currentCustomer)"
      :incomingCallData="incomingCallData"
      :callInProgressVisible="callInProgressVisible"
      :currentCallData="currentCallData"
      :isCallWindowMinimized="isCallWindowMinimized"
      :callWindowStyle="callWindowStyle"
      :savingNotes="savingNotes"
      @reset-follow-up-form="resetQuickFollowUpForm"
      @submit-follow-up="submitQuickFollowUp"
      @answer-call="answerCall"
      @reject-call="rejectCall"
      @view-customer-detail="viewCustomerDetail"
      @quick-follow-up="quickFollowUp"
      @toggle-minimize="toggleMinimize"
      @end-call-click="handleEndCallClick"
      @save-call-notes="saveCallNotes(false)"
      @open-quick-followup-from-call="openQuickFollowUpFromCall"
      @view-customer-detail-from-call="viewCustomerDetailFromCall"
    />

    <!-- 呼出配置弹窗 - 新组件 -->
    <CallConfigDialog v-model="showNewCallConfigDialog" />

    <!-- 导入外呼名单弹窗 -->
    <ProspectImportDialog v-model="showImportDialog" @imported="loadOutboundList" />

    <!-- 批量分配弹窗 -->
    <el-dialog v-model="showAssignDialog" title="批量分配外呼资料" width="400px" align-center>
      <p style="margin-bottom: 12px;">将选中的 <strong>{{ selectedRows.length }}</strong> 条外呼资料分配给：</p>
      <el-select v-model="assignTargetUser" placeholder="选择成员" style="width: 100%;" filterable>
        <el-option v-for="m in salesPersonList" :key="m.id" :value="m.id" :label="m.name || m.username">
          <span>{{ m.name || m.username }}</span>
          <span v-if="m.department" style="float:right; color:#909399; font-size:12px;">{{ m.department }}</span>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="showAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="handleBatchAssignConfirm" :disabled="!assignTargetUser">确认分配</el-button>
      </template>
    </el-dialog>

    <!-- 单个分配弹窗 -->
    <el-dialog v-model="showSingleAssignDialog" title="分配外呼资料" width="400px" align-center>
      <p style="margin-bottom: 12px;">请选择分配给的成员或用户名或ID</p>
      <el-select
        v-model="singleAssignTargetUser"
        placeholder="输入成员用户名"
        style="width: 100%;"
        filterable
        :filter-method="filterMembers"
        @visible-change="handleAssignDropdownVisible"
      >
        <el-option v-for="m in filteredSalesPersonList" :key="m.id" :value="m.id" :label="m.name || m.username">
          <span>{{ m.name || m.username }}</span>
          <span v-if="m.department" style="float:right; color:#909399; font-size:12px;">{{ m.department }}</span>
        </el-option>
      </el-select>
      <template #footer>
        <el-button @click="showSingleAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSingleAssignConfirm" :disabled="!singleAssignTargetUser">确认分配</el-button>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, nextTick, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { useCustomerStore } from '@/stores/customer'
import type { CallRecord, FollowUpRecord } from '@/api/call'
import * as callApi from '@/api/call'
import {
  Phone,
  Timer,
  SuccessFilled,
  User,
  Search,
  RefreshRight,
  Plus,
  Download,
  View,
  EditPen,
  ShoppingBag,
  Refresh,
  VideoPlay,
  Check,
  Close,
  TurnOff,
  Setting,
  Cellphone,
  Iphone,
  CircleCheckFilled,
  WarningFilled,
  Key,
  Connection,
  Loading,
  InfoFilled,
  Minus,
  FullScreen,
  Upload,
  ArrowDown
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { formatDateTime } from '@/utils/dateFormat'
import { customerDetailApi } from '@/api/customerDetail'
import CallConfigDialog from '@/components/Call/CallConfigDialog.vue'
import ProspectImportDialog from './CallManagement/ProspectImportDialog.vue'
import { prospectApi } from '@/api/callProspect'
// 已拆分的子组件（可逐步替换内联模板）
import CallStatsCards from './CallManagement/CallStatsCards.vue'
import CallFilterBar from './CallManagement/CallFilterBar.vue'
import CallOutboundDialog from './CallManagement/CallOutboundDialog.vue'
import CallCustomerDetailDialog from './CallManagement/CallCustomerDetailDialog.vue'
import CallRecordsDialog from './CallManagement/CallRecordsDialog.vue'
import CallFloatingWindow from './CallManagement/CallFloatingWindow.vue'
import * as callConfigApi from '@/api/callConfig'
import { getAddressLabel } from '@/utils/addressData'
import { getOrderStatusText as getOrderStatusTextFromConfig, getOrderStatusTagType } from '@/utils/orderStatusConfig'
import { webSocketService } from '@/services/webSocketService'

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const callStore = useCallStore()
const userStore = useUserStore()
const customerStore = useCustomerStore()

// 响应式数据
const loading = ref(false)
const refreshLoading = ref(false)
const autoRefresh = ref(false)
const autoRefreshTimer = ref(null)
const searchKeyword = ref('')
const selectedRows = ref([])
const showOutboundDialog = ref(false)
const outboundLoading = ref(false)
const outboundFormRef = ref()

// 通话状态管理
const callStatus = ref('ready') // 'ready' | 'busy'

// 呼入通话相关
const incomingCallVisible = ref(false)
const callInProgressVisible = ref(false)
const incomingCallData = ref(null)
const currentCallData = ref(null)
const currentCallId = ref<string | null>(null) // 当前通话ID
const callDuration = ref(0)
const callNotes = ref('')
const callTimer = ref(null)
const callConnected = ref(false) // 通话是否已接通
const savingNotes = ref(false) // 保存备注状态

// 通话浮动窗口相关
const isCallWindowMinimized = ref(false)
const callWindowRef = ref<HTMLElement | null>(null)
const callWindowPosition = reactive({
  x: window.innerWidth - 470,
  y: 100
})
const isDragging = ref(false)
const dragOffset = reactive({ x: 0, y: 0 })

// 计算通话窗口样式
const callWindowStyle = computed(() => ({
  left: `${callWindowPosition.x}px`,
  top: `${callWindowPosition.y}px`
}))

// 切换最小化状态
const toggleMinimize = () => {
  isCallWindowMinimized.value = !isCallWindowMinimized.value
}

// 开始拖动
const startDrag = (e: MouseEvent) => {
  if ((e.target as HTMLElement).closest('.header-actions')) return

  isDragging.value = true
  const rect = callWindowRef.value?.getBoundingClientRect()
  if (rect) {
    dragOffset.x = e.clientX - rect.left
    dragOffset.y = e.clientY - rect.top
  }

  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

// 拖动中
const onDrag = (e: MouseEvent) => {
  if (!isDragging.value) return

  let newX = e.clientX - dragOffset.x
  let newY = e.clientY - dragOffset.y

  // 限制在窗口范围内
  const windowWidth = isCallWindowMinimized.value ? 280 : 420
  const windowHeight = isCallWindowMinimized.value ? 60 : 400

  newX = Math.max(0, Math.min(newX, window.innerWidth - windowWidth))
  newY = Math.max(0, Math.min(newY, window.innerHeight - windowHeight))

  callWindowPosition.x = newX
  callWindowPosition.y = newY
}

// 停止拖动
const stopDrag = () => {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

// 呼出配置相关
const showNewCallConfigDialog = ref(false) // 新版呼出配置弹窗
const showImportDialog = ref(false) // 导入外呼名单弹窗
const showAssignDialog = ref(false) // 分配弹窗
const assignTargetUser = ref('') // 分配目标用户ID

// 角色权限控制
const currentRole = computed(() => userStore.currentUser?.role || '')
const canDelete = computed(() => ['super_admin', 'admin'].includes(currentRole.value))
const canAssign = computed(() => ['super_admin', 'admin', 'department_manager'].includes(currentRole.value))
const canManage = computed(() => ['super_admin', 'admin', 'department_manager'].includes(currentRole.value))
const statistics = reactive({
  todayCalls: 0,
  totalDuration: 0,
  connectionRate: 0,
  activeUsers: 0
})

// 筛选表单
const filterForm = reactive({
  status: '',
  customerLevel: '',
  dateRange: [],
  salesPerson: '',
  dataSource: ''
})

// 分页数据
const pagination = reactive({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 呼出列表数据
const outboundList = ref<any[]>([])

const outboundForm = ref({
  callMethod: '', // 外呼方式：work_phone(工作手机) | network_phone(网络电话)
  selectedLine: null as number | null, // 选择的线路ID
  selectedWorkPhone: null as number | string | null, // 选择的工作手机ID（可能是数字或字符串）
  selectedCustomer: null as any,
  customerPhone: '', // 从客户选择的号码
  manualPhone: '', // 手动输入的号码
  customerId: '',
  notes: ''
})

// 客户选择相关
const customerOptions = ref<any[]>([])
const phoneOptions = ref<any[]>([])

// 网络电话线路选择数据 - 从呼出配置API获取
const availableLines = ref<any[]>([])

// 工作手机配置数据 - 从呼出配置API获取
const workPhones = ref<any[]>([])

// 计算当前选择的工作手机是否离线
const selectedWorkPhoneOffline = computed(() => {
  if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) return false
  // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
  const phone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
  // 状态可能是 'online'/'offline' 或 '在线'/'离线'
  return phone && phone.status !== 'online' && phone.status !== '在线'
})

// 计算当前选择的工作手机是否在线
const selectedWorkPhoneOnline = computed(() => {
  if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) return false
  // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
  const phone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
  return phone && (phone.status === 'online' || phone.status === '在线')
})

// 刷新设备状态
const handleRefreshDeviceStatus = async () => {
  try {
    await loadAvailableCallMethods()
    ElMessage.success('设备状态已刷新')
  } catch (_e) {
    ElMessage.error('刷新失败')
  }
}

// 直接显示绑定二维码弹窗
const bindQRDialogVisible = ref(false)
const bindQRCodeUrl = ref('')
const bindConnectionId = ref('')
const bindStatus = ref<'pending' | 'connected' | 'expired'>('pending')
let bindCheckTimer: ReturnType<typeof setInterval> | null = null

const handleShowBindQRCode = async () => {
  bindQRDialogVisible.value = true
  bindQRCodeUrl.value = ''
  bindStatus.value = 'pending'
  await generateBindQRCode()
}

const generateBindQRCode = async () => {
  try {
    const res = await callConfigApi.generateWorkPhoneQRCode()
    console.log('[CallManagement] generateBindQRCode response:', res)
    if (res && (res as any).qrCodeUrl) {
      bindQRCodeUrl.value = (res as any).qrCodeUrl
      bindConnectionId.value = (res as any).connectionId
      startBindStatusCheck()
    } else if (res && (res as any).success && (res as any).data) {
      bindQRCodeUrl.value = (res as any).data.qrCodeUrl
      bindConnectionId.value = (res as any).data.connectionId
      startBindStatusCheck()
    } else {
      ElMessage.error('生成二维码失败')
    }
  } catch (_e) {
    console.error('[CallManagement] generateBindQRCode error:', _e)
    ElMessage.error('生成二维码失败')
  }
}

const refreshBindQRCode = () => {
  stopBindStatusCheck()
  generateBindQRCode()
}

const startBindStatusCheck = () => {
  stopBindStatusCheck()
  bindCheckTimer = setInterval(async () => {
    try {
      const res = await callConfigApi.checkWorkPhoneBindStatus(bindConnectionId.value)
      const status = (res as any).status || ((res as any).data?.status)
      if (status) {
        bindStatus.value = status
        if (status === 'connected') {
          stopBindStatusCheck()
          ElMessage.success('绑定成功')
          await loadAvailableCallMethods()
          setTimeout(() => {
            bindQRDialogVisible.value = false
          }, 1500)
        } else if (status === 'expired') {
          stopBindStatusCheck()
        }
      }
    } catch (_e) {
      console.error('检查绑定状态失败:', _e)
    }
  }, 2000)
}

const stopBindStatusCheck = () => {
  if (bindCheckTimer) {
    clearInterval(bindCheckTimer)
    bindCheckTimer = null
  }
}

// 用户偏好设置
const userCallPreference = ref({
  preferMobile: false,
  defaultLineId: null as number | null
})

const outboundRules = {
  // customerPhone 不再是必填，因为可以手动输入号码
  customerPhone: [
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码', trigger: 'blur' }
  ]
}

// 详情弹窗
const showDetailDialog = ref(false)
const currentCustomer = ref(null)
const activeTab = ref('orders')

// 通话记录弹窗
const callRecordsDialogVisible = ref(false)
const callRecordsLoading = ref(false)
const callRecordsList = ref([])
const callRecordsFilter = reactive({
  dateRange: [],
  customerKeyword: ''
})
const callRecordsPagination = reactive({
  currentPage: 1,
  pageSize: 10,
  total: 0
})

// 录音播放器
const recordingPlayerVisible = ref(false)
const currentRecording = ref(null)
const audioPlayer = ref(null)

// 快捷跟进
const quickFollowUpVisible = ref(false)
const quickFollowUpSubmitting = ref(false)
const quickFollowUpFormRef = ref()
const quickFollowUpForm = reactive({
  type: 'call',
  content: '',
  nextFollowTime: '',
  intention: '',
  callTags: [] as string[],
  remark: ''
})

// 通话标签选项（与APP保持一致）
const callTagOptions = ['意向', '无意向', '再联系', '成交', '需报价', '已成交']

const quickFollowUpRules = {
  type: [
    { required: true, message: '请选择跟进类型', trigger: 'change' }
  ],
  content: [
    { required: true, message: '请输入跟进内容', trigger: 'blur' },
    { min: 2, message: '跟进内容至少2个字符', trigger: 'blur' }
  ]
}

// 禁止选择过去的日期（只能选择今天及以后的日期）
const disablePastDate = (time: Date) => {
  // 获取今天的开始时间（0点0分0秒）
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return time.getTime() < today.getTime()
}

// 客户详情数据 - 从API加载
const customerOrders = ref<any[]>([])
const customerAftersales = ref<any[]>([])
const customerCalls = ref<any[]>([])
const customerFollowups = ref<any[]>([])
const detailLoading = ref(false)

// 详情弹窗分页数据
const detailPagination = reactive({
  orders: { page: 1, pageSize: 10, total: 0 },
  calls: { page: 1, pageSize: 10, total: 0 },
  followups: { page: 1, pageSize: 10, total: 0 },
  aftersales: { page: 1, pageSize: 10, total: 0 }
})

// 分页后的数据 - 计算属性
const paginatedOrders = computed(() => {
  const start = (detailPagination.orders.page - 1) * detailPagination.orders.pageSize
  const end = start + detailPagination.orders.pageSize
  return customerOrders.value.slice(start, end)
})

const paginatedCalls = computed(() => {
  const start = (detailPagination.calls.page - 1) * detailPagination.calls.pageSize
  const end = start + detailPagination.calls.pageSize
  return customerCalls.value.slice(start, end)
})

const paginatedFollowups = computed(() => {
  const start = (detailPagination.followups.page - 1) * detailPagination.followups.pageSize
  const end = start + detailPagination.followups.pageSize
  return customerFollowups.value.slice(start, end)
})

const paginatedAftersales = computed(() => {
  const start = (detailPagination.aftersales.page - 1) * detailPagination.aftersales.pageSize
  const end = start + detailPagination.aftersales.pageSize
  return customerAftersales.value.slice(start, end)
})

// 加载客户详情数据
const loadCustomerDetailData = async (customerId: string) => {
  if (!customerId) return

  detailLoading.value = true
  try {
    // 并行加载所有数据
    const [ordersRes, callsRes, followupsRes] = await Promise.all([
      customerDetailApi.getCustomerOrders(customerId),
      customerDetailApi.getCustomerCalls(customerId),
      customerDetailApi.getCustomerFollowUps(customerId)
    ])

    // 🔥 修复：正确处理API返回值格式
    // 处理订单数据
    let ordersData: any[] = []
    if (ordersRes?.success && Array.isArray(ordersRes.data)) {
      ordersData = ordersRes.data
    } else if (Array.isArray(ordersRes?.data)) {
      ordersData = ordersRes.data
    } else if (Array.isArray(ordersRes)) {
      ordersData = ordersRes
    }

    customerOrders.value = ordersData.map((order: any) => ({
      id: order.id,
      orderNo: order.orderNumber || order.orderNo || order.id,
      productName: order.productNames || order.products?.[0]?.name || order.productName || '未知商品',
      amount: order.totalAmount || order.finalAmount || order.amount || 0,
      status: order.status || 'pending',
      createTime: formatDateTime(order.createdAt || order.createTime || order.orderDate)
    }))

    // 处理通话记录数据
    let callsData: any[] = []
    if (callsRes?.success && Array.isArray(callsRes.data)) {
      callsData = callsRes.data
    } else if (Array.isArray(callsRes?.data)) {
      callsData = callsRes.data
    } else if (Array.isArray(callsRes)) {
      callsData = callsRes
    }

    customerCalls.value = callsData.map((call: any) => ({
      id: call.id,
      callType: call.callType || call.type || 'outbound',
      duration: formatCallDuration(call.duration),
      status: call.callStatus || call.status || 'connected',
      startTime: formatDateTime(call.startTime || call.createdAt),
      operator: call.userName || call.operatorName || call.operator || '未知',
      callTags: call.callTags || [],
      remark: call.notes || call.remark || '',
      recordingUrl: call.recordingUrl || null,
      // 保留原始数据用于详情查看
      _raw: call
    }))

    // 处理跟进记录数据
    let followupsData: any[] = []
    if (followupsRes?.success && Array.isArray(followupsRes.data)) {
      followupsData = followupsRes.data
    } else if (Array.isArray(followupsRes?.data)) {
      followupsData = followupsRes.data
    } else if (Array.isArray(followupsRes)) {
      followupsData = followupsRes
    }

    customerFollowups.value = followupsData.map((followup: any) => ({
      id: followup.id,
      type: followup.type || followup.followUpType || 'call',
      content: followup.content || followup.description || '',
      customerIntent: followup.customerIntent || followup.customer_intent || null,
      callTags: followup.callTags || followup.call_tags || [],
      remark: followup.remark || followup.notes || '',
      nextPlan: formatDateTime(followup.nextFollowUp || followup.nextTime || followup.nextPlanTime || followup.next_follow_up_date),
      operator: getCreatorName(followup.createdBy || followup.created_by) || followup.createdByName || followup.author || followup.operatorName || '未知',
      createTime: formatDateTime(followup.createdAt || followup.createTime || followup.created_at),
      _raw: followup
    }))

    // 售后记录暂时为空（如果有售后API可以添加）
    customerAftersales.value = []

    // 更新分页总数
    detailPagination.orders.total = customerOrders.value.length
    detailPagination.orders.page = 1
    detailPagination.calls.total = customerCalls.value.length
    detailPagination.calls.page = 1
    detailPagination.followups.total = customerFollowups.value.length
    detailPagination.followups.page = 1
    detailPagination.aftersales.total = customerAftersales.value.length
    detailPagination.aftersales.page = 1

  } catch (error) {
    console.error('加载客户详情数据失败:', error)
    ElMessage.error('加载客户详情数据失败')
    // 清空数据
    customerOrders.value = []
    customerAftersales.value = []
    customerCalls.value = []
    customerFollowups.value = []
  } finally {
    detailLoading.value = false
  }
}

// 格式化通话时长
const formatCallDuration = (seconds: number | string) => {
  if (typeof seconds === 'string') return seconds
  if (!seconds || seconds === 0) return '0秒'
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  if (mins === 0) return `${secs}秒`
  return `${mins}分${secs}秒`
}

// 计算属性
const recentCallRecords = computed(() => {
  return callStore.callRecords.slice(0, 10)
})

// 方法
const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  return `${minutes}分${remainingSeconds}秒`
}

// formatDateTime 已从 @/utils/dateFormat 导入

// 获取客户收货地址
const getCustomerShippingAddress = (customer: any) => {
  if (!customer) return '暂无地址'

  // 如果客户有完整的地址信息，使用地址转换函数获取中文名称
  if (customer.province || customer.city || customer.district || customer.street) {
    // 使用地址数据工具将代码转换为中文名称
    const addressLabel = getAddressLabel(
      customer.province,
      customer.city,
      customer.district,
      customer.street
    )

    // 拼接详细地址
    if (addressLabel) {
      return customer.detailAddress ? addressLabel + customer.detailAddress : addressLabel
    }
  }

  // 如果没有详细地址信息，使用原有的address字段
  if (customer.address) {
    return customer.address
  }

  // 如果都没有，使用公司地址作为备选
  if (customer.company) {
    return customer.company
  }

  return '暂无地址'
}

// 通话状态切换
const toggleCallStatus = async () => {
  const newStatus = callStatus.value === 'ready' ? 'busy' : 'ready'
  const statusText = newStatus === 'ready' ? '就绪' : '忙碌'

  try {
    // 同步到后端
    await callConfigApi.updateAgentStatus(newStatus)

    // 保存状态到本地存储
    localStorage.setItem('call_agent_status', newStatus)
    localStorage.setItem('call_agent_status_time', new Date().toISOString())

    // 更新状态
    callStatus.value = newStatus

    // 如果切换到忙碌状态，记录原因（可选）
    if (newStatus === 'busy') {
      ElMessage.warning(`状态已切换为：${statusText}，来电将不会分配给您`)
    } else {
      ElMessage.success(`状态已切换为：${statusText}，您可以接收来电了`)
    }
  } catch (error) {
    console.error('切换状态失败:', error)
    ElMessage.error('切换状态失败')
  }
}

// 初始化坐席状态（先从后端获取，失败则从本地存储恢复）
const initAgentStatus = async () => {
  try {
    const res = await callConfigApi.getAgentStatus()
    if (res.success && res.data?.status) {
      callStatus.value = res.data.status
      localStorage.setItem('call_agent_status', res.data.status)
      return
    }
  } catch (_e) {
    // 后端获取失败，降级到本地存储
  }
  const savedStatus = localStorage.getItem('call_agent_status')
  if (savedStatus === 'ready' || savedStatus === 'busy') {
    callStatus.value = savedStatus
  }
}
const refreshData = async () => {
  try {
    refreshLoading.value = true

    // 并行刷新多个数据源
    await Promise.all([
      loadOutboundList(),
      callStore.fetchCallRecords(),
      loadStatistics(),
      refreshCallRecords()
    ])

    ElMessage.success('数据已刷新')
  } catch (error) {
    console.error('刷新数据失败:', error)
    ElMessage.error('刷新数据失败，请稍后重试')
  } finally {
    refreshLoading.value = false
  }
}



// 刷新通话记录
const refreshCallRecords = async () => {
  if (callRecordsDialogVisible.value) {
    await loadCallRecords()
  }
}

// 呼出配置相关方法
const openCallConfigDialog = () => {
  // 使用新版呼出配置弹窗
  showNewCallConfigDialog.value = true
}

// 切换自动刷新
const toggleAutoRefresh = () => {
  autoRefresh.value = !autoRefresh.value

  if (autoRefresh.value) {
    startAutoRefresh()
    ElMessage.success('已开启自动刷新，每30秒更新一次数据')
  } else {
    stopAutoRefresh()
    ElMessage.info('已关闭自动刷新')
  }
}

// 开始自动刷新
const startAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
  }

  autoRefreshTimer.value = setInterval(async () => {
    if (!refreshLoading.value) {
      await refreshData()
    }
  }, 30000) // 30秒刷新一次
}

// 停止自动刷新
const stopAutoRefresh = () => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }
}

let _outboundListLoading = false
const loadOutboundList = async () => {
  if (_outboundListLoading) return
  _outboundListLoading = true
  try {
    loading.value = true

    const response: any = await prospectApi.getList({
      page: pagination.currentPage,
      pageSize: pagination.pageSize,
      keyword: searchKeyword.value || undefined,
      includeCustomers: 'true'
    } as any)

    const data = response?.data || response
    if (!data?.list) {
      outboundList.value = []
      pagination.total = 0
      return
    }

    let mappedList = (data.list || []).map((p: any) => ({
      id: p.id,
      customerName: p.name,
      phone: p.phone,
      customerPhone: p.phone,
      company: p.company || '',
      customerLevel: 'normal',
      lastCallTime: p.lastCallTime ? formatDateTime(p.lastCallTime) : '暂无记录',
      callCount: p.callCount || 0,
      lastFollowUp: p.lastFollowUpContent || '',
      callTags: p.tags || [],
      status: p.status || 'pending',
      _prospectStatus: p.status,
      _prospectId: p.id,
      _convertedCustomerId: p.convertedCustomerId,
      _source: p.source === 'customer' ? 'customer' : ((p.source === 'manual' || p.source === 'excel') ? 'import' : (p.convertedCustomerId ? 'customer' : 'import')),
      _isShared: false,
      _sharedToName: '',
      assignedTo: p.assignedTo || '',
      assignedName: p.assignedName || '',
      createdByName: getCreatorName(p.createdBy || p.created_by) || p.createdByName || p.created_by_name || '',
      remark: p.remark || '',
      _createdAt: p.createdAt || p.created_at || '',
    }))

    // 前端筛选
    if (filterForm.dataSource) {
      mappedList = mappedList.filter((item: any) => item._source === filterForm.dataSource)
    }

    if (filterForm.status === 'pending') {
      mappedList = mappedList.filter((item: any) => !item.callCount || item.callCount === 0)
    } else if (filterForm.status === 'called') {
      mappedList = mappedList.filter((item: any) => item.callCount > 0)
    }

    pagination.total = mappedList.length
    outboundList.value = mappedList

  } catch (error: any) {
    console.error('加载呼出列表失败:', error)
    // 失败时保留现有数据，不清空列表
    if (error?.response?.status === 401) return
    if (router.currentRoute.value.path.includes('call') && outboundList.value.length === 0) {
      ElMessage.warning('加载呼出列表失败，请刷新重试')
    }
  } finally {
    loading.value = false
    _outboundListLoading = false
  }
}

// 筛选表单更新
const handleFilterFormUpdate = (newForm: any) => {
  const dateChanged = JSON.stringify(newForm.dateRange) !== JSON.stringify(filterForm.dateRange)
  Object.assign(filterForm, newForm)
  pagination.currentPage = 1
  loadOutboundList()
  if (dateChanged) {
    loadStatistics(filterForm.dateRange?.length === 2 ? filterForm.dateRange : undefined)
  }
}

const handleSearch = async () => {
  pagination.currentPage = 1
  await loadOutboundList()
}

const resetFilter = () => {
  searchKeyword.value = ''
  Object.assign(filterForm, {
    status: '',
    customerLevel: '',
    dateRange: [],
    salesPerson: '',
    dataSource: ''
  })
  loadOutboundList()
  loadStatistics()
}

const handleSelectionChange = (selection: any[]) => {
  selectedRows.value = selection
}

// 单个转入客户
const handleConvertSingle = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定将「${row.customerName}」转入客户列表？转入后该客户将成为正式客户，支持下单和分享操作。`, '转入客户', { type: 'info' })
    const res: any = await prospectApi.convert([row._prospectId || row.id])
    const data = res?.data || {}
    if (data.converted > 0) {
      ElMessage.success(`「${row.customerName}」已成功转入客户列表，可在客户管理中查看`)
    } else if (data.skipped > 0) {
      ElMessage.warning(`「${row.customerName}」已存在于客户列表中，已自动关联`)
    } else if (data.failed > 0) {
      ElMessage.error(`「${row.customerName}」转入失败，请检查数据后重试`)
    } else {
      ElMessage.success(`「${row.customerName}」已成功转入客户列表`)
    }
    loadOutboundList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || e?.message || '转入失败')
  }
}

// 批量转入客户
const handleBatchConvert = async () => {
  if (!selectedRows.value.length) return
  // 过滤掉客户列表客户和已转入的
  const customerItems = selectedRows.value.filter((r: any) => r._source === 'customer')
  if (customerItems.length > 0) {
    ElMessage.warning('选中的记录中包含客户列表的客户，已在客户列表中无需再转入，请取消勾选。')
    return
  }
  const validItems = selectedRows.value.filter((r: any) => r._prospectStatus !== 'converted')
  if (!validItems.length) {
    ElMessage.warning('选中的记录已全部转入客户列表')
    return
  }
  try {
    await ElMessageBox.confirm(`确定将选中的 ${validItems.length} 条记录转入客户列表？`, '批量转入', { type: 'info' })
    const ids = validItems.map(r => r._prospectId || r.id)
    const res: any = await prospectApi.convert(ids)
    ElMessage.success(res?.message || '转入完成')
    selectedRows.value = []
    loadOutboundList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.response?.data?.message || e?.message || '转入失败')
  }
}

// 删除外呼名单记录
const handleDeleteProspect = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定删除「${row.customerName}」？`, '删除确认', { type: 'warning' })
    await prospectApi.delete(row._prospectId || row.id)
    ElMessage.success('已删除')
    loadOutboundList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

// 批量分配点击 - 校验是否包含客户列表客户
const handleBatchAssignClick = () => {
  const customerItems = selectedRows.value.filter((r: any) => r._source === 'customer')
  if (customerItems.length > 0) {
    ElMessage.warning('选中的记录中包含客户列表的客户，客户列表客户不支持分配操作，请取消勾选。如需分配请通过客户列表的分享功能。')
    return
  }
  showAssignDialog.value = true
}

// 批量删除
const handleBatchDelete = async () => {
  if (!selectedRows.value.length) return
  // 校验是否包含客户列表客户
  const customerItems = selectedRows.value.filter((r: any) => r._source === 'customer')
  if (customerItems.length > 0) {
    ElMessage.warning('选中的记录中包含客户列表的客户，客户列表客户不支持删除操作，请取消勾选。')
    return
  }
  // 校验是否包含已转入客户列表的
  const convertedItems = selectedRows.value.filter((r: any) => r._prospectStatus === 'converted')
  if (convertedItems.length > 0) {
    ElMessage.warning('选中的记录中包含已转入客户列表的客户，不支持删除操作，请取消勾选。')
    return
  }
  try {
    await ElMessageBox.confirm(`确定删除选中的 ${selectedRows.value.length} 条记录？`, '批量删除', { type: 'warning' })
    const ids = selectedRows.value.map(r => r._prospectId || r.id)
    await prospectApi.batchDelete(ids)
    ElMessage.success('批量删除成功')
    selectedRows.value = []
    loadOutboundList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  }
}

// 单个分配
const showSingleAssignDialog = ref(false)
const singleAssignTargetUser = ref('')
const singleAssignRow = ref<any>(null)
const filteredSalesPersonList = ref<any[]>([])

const filterMembers = (query: string) => {
  if (!query) {
    filteredSalesPersonList.value = salesPersonList.value || []
  } else {
    const keyword = query.toLowerCase()
    filteredSalesPersonList.value = (salesPersonList.value || []).filter((m: any) =>
      (m.name && m.name.toLowerCase().includes(keyword)) ||
      (m.username && m.username.toLowerCase().includes(keyword)) ||
      (m.id && m.id.toLowerCase().includes(keyword))
    )
  }
}

const handleAssignDropdownVisible = (visible: boolean) => {
  if (visible) {
    filteredSalesPersonList.value = salesPersonList.value || []
  }
}

const handleAssignSingle = (row: any) => {
  const members = salesPersonList.value || []
  if (!members.length) {
    ElMessage.warning('暂无可分配的成员')
    return
  }
  singleAssignRow.value = row
  singleAssignTargetUser.value = ''
  filteredSalesPersonList.value = members
  showSingleAssignDialog.value = true
}

const handleSingleAssignConfirm = async () => {
  if (!singleAssignTargetUser.value || !singleAssignRow.value) return
  try {
    const members = salesPersonList.value || []
    const member = members.find((m: any) => m.id === singleAssignTargetUser.value)
    const assignName = member?.name || member?.username || singleAssignTargetUser.value
    const row = singleAssignRow.value
    await prospectApi.batchAssign([row._prospectId || row.id], singleAssignTargetUser.value, assignName)
    ElMessage.success(`已分配给 ${assignName}`)
    showSingleAssignDialog.value = false
    singleAssignTargetUser.value = ''
    singleAssignRow.value = null
    loadOutboundList()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '分配失败')
  }
}

// 更多操作处理
const handleMoreAction = (command: string, row: any) => {
  switch (command) {
    case 'assign':
      handleAssignSingle(row)
      break
    case 'convert':
      handleConvertSingle(row)
      break
    case 'delete':
      handleDeleteProspect(row)
      break
  }
}

// 批量分配弹窗确认
const handleBatchAssignConfirm = async () => {
  if (!assignTargetUser.value || !selectedRows.value.length) return
  try {
    const members = salesPersonList.value || []
    const member = members.find((m: any) => m.id === assignTargetUser.value)
    const assignName = member?.name || member?.username || assignTargetUser.value
    const ids = selectedRows.value.map(r => r._prospectId || r.id)
    await prospectApi.batchAssign(ids, assignTargetUser.value, assignName)
    ElMessage.success(`已分配 ${ids.length} 条给 ${assignName}`)
    showAssignDialog.value = false
    assignTargetUser.value = ''
    selectedRows.value = []
    loadOutboundList()
  } catch (e: any) {
    ElMessage.error(e?.response?.data?.message || e?.message || '分配失败')
  }
}

// 显示通话记录弹窗
const showCallRecordsDialog = () => {
  callRecordsDialogVisible.value = true
  loadCallRecords()
}

// 关闭通话记录弹窗
const handleCloseCallRecordsDialog = () => {
  callRecordsDialogVisible.value = false
  resetCallRecordsFilter()
}

// 加载通话记录
const loadCallRecords = async () => {
  callRecordsLoading.value = true
  try {
    console.log('[CallManagement] loadCallRecords params:', {
      page: callRecordsPagination.currentPage,
      pageSize: callRecordsPagination.pageSize
    })

    // 使用callStore的API获取通话记录
    await callStore.fetchCallRecords({
      page: callRecordsPagination.currentPage,
      pageSize: callRecordsPagination.pageSize,
      keyword: callRecordsFilter.customerKeyword || undefined,
      startDate: callRecordsFilter.dateRange?.[0] || undefined,
      endDate: callRecordsFilter.dateRange?.[1] || undefined
    })

    console.log('[CallManagement] callStore.callRecords count:', callStore.callRecords.length)
    console.log('[CallManagement] callStore.pagination:', callStore.pagination)

    // 从store获取数据并转换格式
    callRecordsList.value = callStore.callRecords.map((record: any) => ({
      id: record.id,
      // 尝试从多个字段获取客户姓名
      customerName: record.customerName || record.customer_name || '未知客户',
      customerPhone: record.customerPhone || record.customer_phone || '-',
      callType: record.callType || record.call_type || 'outbound',
      duration: formatCallDuration(record.duration),
      status: record.callStatus || record.call_status || record.status || 'connected',
      startTime: formatDateTime(record.startTime || record.start_time || record.createdAt || record.created_at),
      operator: record.userName || record.user_name || record.operatorName || '系统',
      remark: record.notes || record.remark || '',
      recordingUrl: record.recordingUrl || record.recording_url || null
    }))
    callRecordsPagination.total = callStore.pagination.total

    console.log('[CallManagement] callRecordsList count:', callRecordsList.value.length)
  } catch (error) {
    console.error('加载通话记录失败:', error)
    ElMessage.error('加载通话记录失败')
  } finally {
    callRecordsLoading.value = false
  }
}

// 重置通话记录筛选器
const resetCallRecordsFilter = () => {
  callRecordsFilter.dateRange = []
  callRecordsFilter.customerKeyword = ''
  loadCallRecords()
}

// 处理通话记录筛选更新（双绑回调）
const handleCallRecordsFilterUpdate = (newFilter: any) => {
  Object.assign(callRecordsFilter, newFilter)
}

// 通话记录分页处理
const handleCallRecordsPageSizeChange = (size: number) => {
  callRecordsPagination.pageSize = size
  loadCallRecords()
}

const handleCallRecordsPageChange = (page: number) => {
  callRecordsPagination.currentPage = page
  loadCallRecords()
}

// 播放录音
const playRecording = (record: any) => {
  if (!record.recordingUrl) {
    ElMessage.warning('该通话没有录音文件')
    return
  }

  let recordingUrl = record.recordingUrl

  // 如果是完整URL，先提取路径部分（避免 localhost 或域名不匹配导致跨域失败）
  if (recordingUrl.startsWith('http://') || recordingUrl.startsWith('https://')) {
    try {
      const u = new URL(recordingUrl)
      recordingUrl = u.pathname + u.search
    } catch (_e) {
      // URL 解析失败，保持原值
    }
  }

  const authToken = localStorage.getItem('auth_token')

  if (recordingUrl.startsWith('/uploads/')) {
    // APP 上传的录音：走 stream 端点统一处理（支持 AMR 等格式）
    recordingUrl = `/api/v1/calls/recordings/stream${recordingUrl}`
    if (authToken) {
      recordingUrl = `${recordingUrl}?token=${encodeURIComponent(authToken)}`
    }
  } else if (recordingUrl.startsWith('/api/v1/calls/recordings/stream/')) {
    // 已含完整 stream 路径（RecordingStorageService 生成），追加 token
    if (authToken) {
      const sep = recordingUrl.includes('?') ? '&' : '?'
      recordingUrl = `${recordingUrl}${sep}token=${encodeURIComponent(authToken)}`
    }
  } else if (recordingUrl.startsWith('/recordings/')) {
    // 本地 recordings 目录：走 stream 端点
    recordingUrl = `/api/v1/calls/recordings/stream${recordingUrl}`
    if (authToken) {
      recordingUrl = `${recordingUrl}?token=${encodeURIComponent(authToken)}`
    }
  } else {
    // 其他相对路径
    recordingUrl = `/api/v1/calls/recordings/stream/${recordingUrl.replace(/^\/+/, '')}`
    if (authToken) {
      recordingUrl = `${recordingUrl}?token=${encodeURIComponent(authToken)}`
    }
  }

  console.log('[录音播放] 原始URL:', record.recordingUrl, '处理后URL:', recordingUrl)

  currentRecording.value = {
    ...record,
    recordingUrl
  }
  recordingPlayerVisible.value = true
}

// 下载录音
const downloadRecording = (record: any) => {
  if (!record.recordingUrl) {
    ElMessage.warning('该通话没有录音文件')
    return
  }

  // 创建下载链接
  const link = document.createElement('a')
  link.href = record.recordingUrl
  link.download = `录音_${record.customerName}_${record.startTime.replace(/[:\s]/g, '_')}.mp3`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)

  ElMessage.success('录音下载已开始')
}

// 停止录音播放
const stopRecording = () => {
  if (audioPlayer.value) {
    audioPlayer.value.pause()
    audioPlayer.value.currentTime = 0
  }
  recordingPlayerVisible.value = false
  currentRecording.value = null
}

// 音频播放器事件处理
const onAudioLoadStart = () => {
  console.log('开始加载音频')
}

const onAudioCanPlay = () => {
  console.log('音频可以播放')
}

const onAudioError = (error: any) => {
  console.error('音频播放错误:', error)
  ElMessage.error('录音播放失败，请检查录音文件')
}

// 快捷跟进相关方法
const resetQuickFollowUpForm = () => {
  Object.assign(quickFollowUpForm, {
    type: 'call',
    content: '',
    nextFollowTime: '',
    intention: '',
    callTags: [],
    remark: ''
  })
  quickFollowUpFormRef.value?.clearValidate()
}

const submitQuickFollowUp = async () => {
  try {
    // 表单验证（ref可能在子组件中，跳过null情况直接验证数据）
    if (quickFollowUpFormRef.value) {
      await quickFollowUpFormRef.value.validate()
    } else {
      // 手动验证必填字段
      if (!quickFollowUpForm.type) { ElMessage.warning('请选择跟进类型'); return }
      if (!quickFollowUpForm.content) { ElMessage.warning('请输入跟进内容'); return }
    }
    quickFollowUpSubmitting.value = true

    // 验证currentCustomer
    if (!currentCustomer.value) {
      console.error('[CallManagement] currentCustomer 为空')
      ElMessage.error('客户信息不完整，请重试')
      return
    }

    if (!currentCustomer.value.id) {
      console.error('[CallManagement] currentCustomer.id 为空', currentCustomer.value)
      ElMessage.error('客户ID不存在，请重试')
      return
    }

    // 准备跟进记录数据
    const followUpData: any = {
      callId: '',
      customerId: currentCustomer.value.id,
      customerName: currentCustomer.value.name || currentCustomer.value.customerName || '',
      type: quickFollowUpForm.type,
      content: quickFollowUpForm.content,
      customerIntent: quickFollowUpForm.intention || null,
      callTags: quickFollowUpForm.callTags.length > 0 ? quickFollowUpForm.callTags : null,
      nextFollowUpDate: quickFollowUpForm.nextFollowTime || null,
      remark: quickFollowUpForm.remark || null,
      priority: 'medium',
      status: 'pending'
    }

    console.log('[CallManagement] 提交跟进记录数据:', followUpData)
    console.log('[CallManagement] currentCustomer:', currentCustomer.value)

    // 调用API创建跟进记录
    const result = await callStore.createFollowUp(followUpData)
    console.log('[CallManagement] 创建跟进记录结果:', result)

    ElMessage.success('跟进记录保存成功')
    quickFollowUpVisible.value = false
    resetQuickFollowUpForm()

    // 刷新相关页面数据
    console.log('[CallManagement] 刷新呼出列表...')
    await loadOutboundList()

    // 如果详情弹窗打开，也刷新详情数据
    if (showDetailDialog.value && currentCustomer.value?.id) {
      console.log('[CallManagement] 刷新详情数据, customerId:', currentCustomer.value.id)
      await loadCustomerDetailData(currentCustomer.value.id)
    }

  } catch (error) {
    console.error('保存跟进记录失败:', error)
    ElMessage.error('保存跟进记录失败，请重试')
  } finally {
    quickFollowUpSubmitting.value = false
  }
}

const getFollowUpTypeText = (type: string) => {
  const typeMap: Record<string, string> = {
    'call': '电话跟进',
    'visit': '上门拜访',
    'email': '邮件跟进',
    'message': '短信跟进'
  }
  return typeMap[type] || '其他跟进'
}

const handleExport = async () => {
  if (outboundList.value.length === 0) {
    ElMessage.warning('没有可导出的数据')
    return
  }

  try {
    // 动态导入 xlsx 库
    const XLSX = await import('xlsx')

    // 准备导出数据
    const exportData = outboundList.value.map(item => ({
      '客户姓名': item.customerName || '-',
      '电话号码': item.phone || '-',
      '客户等级': getLevelText(item.customerLevel),
      '最后通话': item.lastCallTime || '-',
      '通话次数': item.callCount || 0,
      '最新跟进': item.lastFollowUp || '-',
      '通话标签': item.callTags?.join('、') || '-',
      '状态': getStatusText(item.status),
      '负责人': item.salesPerson || '-',
      '备注': item.remark || '-'
    }))

    // 创建工作簿和工作表
    const worksheet = XLSX.utils.json_to_sheet(exportData)

    // 设置列宽
    const columnWidths = [
      { wch: 12 },  // 客户姓名
      { wch: 14 },  // 电话号码
      { wch: 10 },  // 客户等级
      { wch: 18 },  // 最后通话
      { wch: 10 },  // 通话次数
      { wch: 25 },  // 最新跟进
      { wch: 20 },  // 通话标签
      { wch: 10 },  // 状态
      { wch: 10 },  // 负责人
      { wch: 30 }   // 备注
    ]
    worksheet['!cols'] = columnWidths

    // 创建工作簿
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, '呼出列表')

    // 生成文件名（包含日期）
    const now = new Date()
    const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`
    const timeStr = `${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`
    const fileName = `呼出列表_${dateStr}_${timeStr}.xlsx`

    // 导出文件
    XLSX.writeFile(workbook, fileName)

    ElMessage.success(`已导出 ${exportData.length} 条数据`)
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败，请重试')
  }
}

const handleCall = (row: any) => {
  // 打开外呼对话框并预填客户信息
  const customer = {
    id: row.id || row.customerId,
    name: row.customerName,
    phone: row.phone,
    otherPhones: row.otherPhones || [],
    company: row.company || ''
  }

  // 将预填充的客户添加到选项列表中，确保 select 组件能正确显示
  const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
  if (existingIndex === -1) {
    customerOptions.value = [customer, ...customerOptions.value]
  }

  outboundForm.value.selectedCustomer = customer as any
  outboundForm.value.customerId = customer.id

  // 更新号码选项
  const phones = []
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }
  // 添加其他号码
  if (customer.otherPhones && Array.isArray(customer.otherPhones)) {
    customer.otherPhones.forEach((phone: string, index: number) => {
      if (phone && phone !== customer.phone) {
        phones.push({
          phone: phone,
          type: `备用号码${index + 1}`
        })
      }
    })
  }
  phoneOptions.value = phones
  outboundForm.value.customerPhone = row.phone

  showOutboundDialog.value = true
}

const goCustomerDetail = (row: any) => {
  if (row._convertedCustomerId) {
    safeNavigator.push({ path: `/customer/detail/${row._convertedCustomerId}` })
  } else if (row._prospectId) {
    handleViewDetail(row)
  } else {
    const customerId = row.id || row.customerId
    if (customerId) {
      safeNavigator.push({ path: `/customer/detail/${customerId}` })
    }
  }
}

const handleViewDetail = async (row: any) => {
  // 🔥 修复：确保currentCustomer有完整的客户信息，包括id字段
  currentCustomer.value = {
    ...row,
    id: row.id || row.customerId,
    customerId: row.id || row.customerId
  }
  showDetailDialog.value = true
  activeTab.value = 'orders' // 重置到第一个标签页

  // 获取客户ID，可能是 id 或 customerId
  const customerId = row.id || row.customerId
  if (customerId) {
    await loadCustomerDetailData(customerId)
  }
}

const handleAddFollowUp = async (row: any) => {
  // 从客户store中获取完整的客户信息
  const fullCustomer = customerStore.getCustomerById(row.id)

  if (fullCustomer) {
    currentCustomer.value = fullCustomer
  } else {
    // 如果没有找到完整信息，使用行数据并补充地址信息
    currentCustomer.value = {
      id: row.id,
      name: row.customerName,
      phone: row.phone,
      company: row.company || '未知公司',
      address: row.address || '',
      province: row.province || '',
      city: row.city || '',
      district: row.district || '',
      street: row.street || '',
      detailAddress: row.detailAddress || ''
    }
  }

  quickFollowUpVisible.value = true
}

const handleCreateOrder = (row?: any) => {
  const customer = row || currentCustomer.value
  if (!customer) {
    ElMessage.warning('请先选择客户')
    return
  }

  // 如果是导入资料且未转入客户列表，提示需先转入
  if (customer._prospectStatus && customer._prospectStatus !== 'converted' && !customer._convertedCustomerId) {
    ElMessageBox.confirm(
      '该客户是导入资料，需先转入客户列表才可以下单。是否立即转入？',
      '提示',
      { confirmButtonText: '立即转入', cancelButtonText: '取消', type: 'warning' }
    ).then(async () => {
      try {
        const res: any = await prospectApi.convert([customer._prospectId || customer.id])
        ElMessage.success(res?.message || '转入成功，现在可以创建订单')
        loadOutboundList()
        // 转入后重新获取详情
        if (customer._prospectId || customer.id) {
          await loadCustomerDetailData(customer._prospectId || customer.id)
        }
      } catch (e: any) {
        ElMessage.error(e?.response?.data?.message || '转入失败')
      }
    }).catch(() => {})
    return
  }

  const customerId = customer._convertedCustomerId || customer.id || customer.customerId
  const customerName = customer.customerName || customer.name
  const customerPhone = customer.phone || customer.customerPhone
  const customerAddress = customer.address || customer.detailAddress || ''

  if (!customerId) {
    ElMessage.warning('客户ID不存在')
    return
  }

  safeNavigator.push({
    name: 'OrderAdd',
    query: {
      customerId,
      customerName,
      customerPhone,
      customerAddress,
      source: 'call_management'
    }
  })
}

const handleSizeChange = (size: number) => {
  pagination.pageSize = size
  loadOutboundList()
}

const handleCurrentChange = (page: number) => {
  pagination.currentPage = page
  loadOutboundList()
}


const getLevelType = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '',
    'silver': 'info',
    'gold': 'warning',
    'diamond': 'success'
  }
  return levelMap[level] || ''
}

const getLevelText = (level: string) => {
  const levelMap: Record<string, string> = {
    'normal': '普通',
    'silver': '白银',
    'gold': '黄金',
    'diamond': '钻石'
  }
  return levelMap[level] || '普通'
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'called': 'primary',
    'connected': 'success',
    'converted': 'success',
    'invalid': 'info',
    'no_answer': 'info',
    'busy': 'warning',
    'failed': 'danger'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待外呼',
    'called': '已外呼',
    'connected': '已接通',
    'converted': '已转客户',
    'invalid': '无效',
    'no_answer': '未接听',
    'busy': '忙线',
    'failed': '失败'
  }
  return statusMap[status] || '未知'
}

// 外呼状态（简化：待外呼 / 已外呼）
const getOutboundStatusType = (status: string) => {
  if (status === 'pending') return 'warning'
  if (status === 'called' || status === 'connected' || status === 'converted') return 'success'
  return 'info'
}

// 通过用户ID查找成员姓名
const getCreatorName = (userId: string | null | undefined): string => {
  if (!userId) return ''
  const user = userStore.users?.find((u: any) => u.id === userId)
  return user?.realName || user?.name || user?.username || ''
}

const getOutboundStatusText = (status: string) => {
  if (status === 'pending') return '待外呼'
  if (status === 'called' || status === 'connected' || status === 'no_answer' || status === 'busy' || status === 'failed' || status === 'converted') return '已外呼'
  return '待外呼'
}

// 通话状态相关辅助函数
const getCallStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'connected': '已接通',
    'missed': '未接听',
    'rejected': '已拒绝',
    'busy': '忙线',
    'failed': '失败',
    'no_answer': '无人接听',
    'unreachable': '无法接通',
    'cancelled': '已取消',
    'timeout': '超时',
    'pending': '待外呼'
  }
  return statusMap[status] || status || '未知'
}

const getCallStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'connected': 'success',
    'missed': 'danger',
    'rejected': 'danger',
    'busy': 'warning',
    'failed': 'danger',
    'no_answer': 'warning',
    'unreachable': 'danger',
    'cancelled': 'info',
    'timeout': 'warning',
    'pending': 'info'
  }
  return typeMap[status] || 'info'
}

// 售后状态相关辅助函数
const getAftersalesStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'processing': '处理中',
    'completed': '已完成',
    'closed': '已关闭',
    'cancelled': '已取消'
  }
  return statusMap[status] || status || '未知'
}

const getAftersalesStatusType = (status: string) => {
  const typeMap: Record<string, string> = {
    'pending': 'warning',
    'processing': 'primary',
    'completed': 'success',
    'closed': 'info',
    'cancelled': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取跟进类型标签
const getFollowUpTypeLabel = (type: string) => {
  const typeMap: Record<string, string> = {
    'call': '电话跟进',
    'visit': '上门拜访',
    'email': '邮件跟进',
    'message': '短信跟进'
  }
  return typeMap[type] || type || '其他'
}

// 获取客户意向类型
const getIntentType = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': 'success',
    'medium': 'warning',
    'low': 'info',
    'none': 'danger'
  }
  return intentMap[intent] || 'info'
}

// 获取客户意向标签
const getIntentLabel = (intent: string) => {
  const intentMap: Record<string, string> = {
    'high': '高意向',
    'medium': '中意向',
    'low': '低意向',
    'none': '无意向'
  }
  return intentMap[intent] || intent || '未知'
}

// 详情弹窗中发起外呼
const handleDetailOutboundCall = () => {
  if (!currentCustomer.value) return

  // 关闭详情弹窗
  showDetailDialog.value = false

  // 预填充客户信息并打开外呼弹窗
  const customer = {
    id: currentCustomer.value.id || currentCustomer.value.customerId,
    name: currentCustomer.value.customerName || currentCustomer.value.name,
    phone: currentCustomer.value.phone || currentCustomer.value.customerPhone,
    otherPhones: currentCustomer.value.otherPhones || [],
    company: currentCustomer.value.company || ''
  }

  // 将预填充的客户添加到选项列表中
  const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
  if (existingIndex === -1) {
    customerOptions.value = [customer, ...customerOptions.value]
  }

  outboundForm.value.selectedCustomer = customer as any
  outboundForm.value.customerId = customer.id

  // 更新号码选项并自动选择
  const phones = []
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }
  // 添加其他号码
  if (customer.otherPhones && Array.isArray(customer.otherPhones)) {
    customer.otherPhones.forEach((phone: string, index: number) => {
      if (phone && phone !== customer.phone) {
        phones.push({
          phone: phone,
          type: `备用号码${index + 1}`
        })
      }
    })
  }
  phoneOptions.value = phones
  outboundForm.value.customerPhone = customer.phone || ''

  showOutboundDialog.value = true
}

// 新建售后
const handleCreateAftersales = () => {
  if (!currentCustomer.value) return

  // 🔥 修复：使用正确的路由路径 /service/add
  router.push({
    path: '/service/add',
    query: {
      customerId: currentCustomer.value.id,
      customerName: currentCustomer.value.customerName || currentCustomer.value.name,
      customerPhone: currentCustomer.value.phone
    }
  })
}

// 搜索防抖定时器
let searchTimer: NodeJS.Timeout | null = null
const isSearching = ref(false)

// 防抖搜索客户
const debouncedSearchCustomers = (query: string = '') => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }

  searchTimer = setTimeout(() => {
    searchCustomers(query)
  }, 300) // 300ms防抖延迟
}

// 搜索客户
const searchCustomers = async (query: string = '') => {
  try {
    isSearching.value = true
    await customerStore.loadCustomers()
    const allCustomers = customerStore.customers
    const currentUserId = userStore.currentUser?.id
    const currentUserRole = userStore.currentUser?.role

    // 超管和管理员可以看到所有客户，其他角色只能看到自己的客户
    const isAdminOrSuperAdmin = currentUserRole === 'super_admin' || currentUserRole === 'admin'

    let filteredCustomers = allCustomers
    if (!isAdminOrSuperAdmin) {
      // 非管理员只能看到归属于自己的客户
      filteredCustomers = allCustomers.filter(customer => {
        return customer.salesPersonId === currentUserId || customer.createdBy === currentUserId
      })
    }

    // 如果有查询条件，进行智能匹配
    if (query && query.trim()) {
      const queryLower = query.toLowerCase().trim()
      const queryOriginal = query.trim()

      filteredCustomers = filteredCustomers.filter(customer => {
        // 支持按客户姓名、编号或电话号码搜索
        const matchesName = customer.name && customer.name.toLowerCase().includes(queryLower)
        const matchesCode = customer.code && customer.code.toLowerCase().includes(queryLower)
        const matchesPhone = customer.phone && customer.phone.includes(queryOriginal)
        const matchesCompany = customer.company && customer.company.toLowerCase().includes(queryLower)

        // 支持部分匹配电话号码（去除分隔符）
        const phoneMatch = customer.phone && customer.phone.replace(/[-\s]/g, '').includes(queryOriginal.replace(/[-\s]/g, ''))

        // 支持客户编号的部分匹配
        const codeMatch = customer.code && (
          customer.code.toLowerCase().includes(queryLower) ||
          customer.code.toLowerCase().startsWith(queryLower)
        )

        return matchesName || matchesCode || matchesPhone || matchesCompany || phoneMatch || codeMatch
      })

      // 按匹配度排序：完全匹配 > 开头匹配 > 包含匹配
      filteredCustomers.sort((a, b) => {
        const getMatchScore = (customer: any) => {
          let score = 0
          const name = customer.name?.toLowerCase() || ''
          const code = customer.code?.toLowerCase() || ''
          const phone = customer.phone || ''

          // 完全匹配得分最高
          if (name === queryLower || code === queryLower || phone === queryOriginal) score += 100
          // 开头匹配得分较高
          else if (name.startsWith(queryLower) || code.startsWith(queryLower) || phone.startsWith(queryOriginal)) score += 50
          // 包含匹配得分一般
          else if (name.includes(queryLower) || code.includes(queryLower) || phone.includes(queryOriginal)) score += 10

          return score
        }

        return getMatchScore(b) - getMatchScore(a)
      })
    }

    // 按客户名称排序，限制显示数量
    filteredCustomers.sort((a, b) => (a.name || '').localeCompare(b.name || ''))
    customerOptions.value = filteredCustomers.slice(0, 50) // 增加显示数量到50

    // 如果没有找到匹配的客户且有查询条件，显示提示
    if (filteredCustomers.length === 0 && query && query.trim()) {
      console.log(`未找到匹配"${query}"的客户`)
    }
  } catch (error) {
    console.error('搜索客户失败:', error)
    ElMessage.error('加载客户列表失败')
    customerOptions.value = []
  } finally {
    isSearching.value = false
  }
}

// 客户选择变化
const onCustomerChange = (customer: any) => {
  if (!customer) {
    phoneOptions.value = []
    outboundForm.value.customerPhone = ''
    outboundForm.value.customerId = ''
    return
  }

  outboundForm.value.customerId = customer.id

  // 构建号码选项
  const phones = []

  // 主号码
  if (customer.phone) {
    phones.push({
      phone: customer.phone,
      type: '主号码'
    })
  }

  // 其他号码（使用otherPhones字段）
  if (customer.otherPhones && Array.isArray(customer.otherPhones)) {
    customer.otherPhones.forEach((phone: string, index: number) => {
      if (phone && phone !== customer.phone) {
        phones.push({
          phone: phone,
          type: `备用号码${index + 1}`
        })
      }
    })
  }

  phoneOptions.value = phones

  // 自动选择第一个号码
  if (phones.length > 0) {
    outboundForm.value.customerPhone = phones[0].phone
  }
}

// 手动输入号码（已废弃，保留兼容性）
const onPhoneInput = () => {
  // 如果手动输入了号码，清除客户选择
  if (outboundForm.value.customerPhone && !phoneOptions.value.some(p => p.phone === outboundForm.value.customerPhone)) {
    outboundForm.value.selectedCustomer = null
    outboundForm.value.customerId = ''
    phoneOptions.value = []
  }
}

// 手动输入号码处理
const onManualPhoneInput = () => {
  // 手动输入号码时，不清除客户选择，保持客户信息独立
  // 这样可以避免泄露客户敏感信息，同时保持功能独立性
  console.log('手动输入号码:', outboundForm.value.manualPhone)
}

// 关闭外呼弹窗
const closeOutboundDialog = () => {
  showOutboundDialog.value = false
  resetOutboundForm()
}

// 重置外呼表单
const resetOutboundForm = () => {
  outboundForm.value = {
    callMethod: '', // 外呼方式：work_phone(工作手机) | network_phone(网络电话)
    selectedLine: null, // 选择的线路ID
    selectedWorkPhone: null, // 选择的工作手机ID
    selectedCustomer: null,
    customerPhone: '', // 从客户选择的号码
    manualPhone: '', // 手动输入的号码
    customerId: '',
    notes: ''
  }
  customerOptions.value = []
  phoneOptions.value = []
}

// 打开外呼弹窗
const openOutboundDialog = async () => {
  resetOutboundForm()
  showOutboundDialog.value = true
  // 自动加载客户列表
  await searchCustomers()
}

// 打开跟进弹窗
const openFollowupDialog = () => {
  if (!currentCustomer.value) {
    ElMessage.warning('请先选择客户')
    return
  }
  quickFollowUpVisible.value = true
}

// 开始外呼
const startOutboundCall = async () => {
  try {
    // 确定要拨打的号码：优先使用手动输入的号码
    const phoneToCall = outboundForm.value.manualPhone || outboundForm.value.customerPhone

    if (!phoneToCall) {
      ElMessage.warning('请选择客户号码或手动输入号码')
      return
    }

    // 检查外呼方式
    if (!outboundForm.value.callMethod) {
      ElMessage.warning('请选择外呼方式')
      return
    }

    outboundLoading.value = true

    // 获取客户名称
    const customerName = outboundForm.value.selectedCustomer?.name || '未知客户'

    // 根据外呼方式处理
    if (outboundForm.value.callMethod === 'work_phone') {
      // 工作手机外呼 - 通过APP发起呼叫
      // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
      const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
      if (!selectedPhone) {
        console.error('[startOutboundCall] 找不到选中的工作手机, selectedWorkPhone:', outboundForm.value.selectedWorkPhone, 'workPhones:', workPhones.value.map(p => ({ id: p.id, type: typeof p.id })))
        ElMessage.warning('请选择工作手机')
        return
      }

      // 调用后端API通知APP发起呼叫
      try {
        const response = await callConfigApi.initiateWorkPhoneCall({
          workPhoneId: outboundForm.value.selectedWorkPhone,
          targetPhone: phoneToCall,
          customerId: outboundForm.value.customerId || undefined,
          customerName: customerName,
          notes: outboundForm.value.notes
        })

        if (response && (response as any).success !== false) {
          // 关闭外呼弹窗
          closeOutboundDialog()

          const callId = (response as any).callId || `call_${Date.now()}`

          // 设置当前通话数据并显示通话中弹窗
          currentCallData.value = {
            id: callId,
            customerName: customerName,
            phone: phoneToCall,
            callMethod: 'work_phone',
            workPhoneName: selectedPhone.name || selectedPhone.number
          }
          currentCallId.value = callId // 设置当前通话ID
          callDuration.value = 0
          callNotes.value = outboundForm.value.notes || ''
          callConnected.value = false // 初始状态为未接通
          callInProgressVisible.value = true

          // 不立即开始计时，等待接通后再计时

          ElMessage.success(`正在通过工作手机 ${selectedPhone.number} 呼叫...`)
        } else {
          ElMessage.error((response as any)?.message || '发起呼叫失败')
        }
      } catch (error: any) {
        console.error('工作手机外呼失败:', error)
        ElMessage.error(error.message || '工作手机外呼失败')
      }
    } else if (outboundForm.value.callMethod === 'network_phone') {
      // 网络电话外呼 - 通过系统线路发起呼叫
      const selectedLine = availableLines.value.find(l => l.id === outboundForm.value.selectedLine)
      if (!selectedLine) {
        ElMessage.warning('请选择外呼线路')
        return
      }

      // 调用后端API发起网络电话呼叫
      try {
        const callParams = {
          customerId: outboundForm.value.customerId || '',
          customerPhone: phoneToCall,
          customerName: customerName,
          notes: outboundForm.value.notes,
          lineId: outboundForm.value.selectedLine
        }

        await callStore.makeOutboundCall(callParams)

        // 关闭外呼弹窗
        closeOutboundDialog()

        const callId = `call_${Date.now()}`

        // 设置当前通话数据并显示通话中弹窗
        currentCallData.value = {
          id: callId,
          customerName: customerName,
          phone: phoneToCall,
          callMethod: 'network_phone',
          lineName: selectedLine.name
        }
        currentCallId.value = callId // 设置当前通话ID
        callDuration.value = 0
        callNotes.value = outboundForm.value.notes || ''
        callInProgressVisible.value = true

        // 开始计时
        startCallTimer()

        ElMessage.success(`正在通过线路 ${selectedLine.name} 呼叫...`)
      } catch (error: any) {
        console.error('网络电话外呼失败:', error)
        ElMessage.error(error.message || '网络电话外呼失败')
      }
    }

    // 刷新通话记录和统计
    await callStore.fetchCallRecords()
    await loadStatistics()
  } catch (error) {
    console.error('外呼失败:', error)
    ElMessage.error('外呼失败，请重试')
  } finally {
    outboundLoading.value = false
  }
}

const handleOutboundCall = async () => {
  try {
    outboundLoading.value = true

    await callStore.makeOutboundCall({
      customerId: outboundForm.value.customerId || '',
      customerPhone: outboundForm.value.customerPhone,
      notes: outboundForm.value.notes
    })

    showOutboundDialog.value = false
    resetOutboundForm()

    // 刷新通话记录
    await callStore.fetchCallRecords()
  } catch (error) {
    console.error('外呼失败:', error)
  } finally {
    outboundLoading.value = false
  }
}

// 呼入通话相关方法
const handleIncomingCall = (data: any) => {
  // 来电弹窗已经显示，说明是号码更新（APP先报未知来电再报真实号码）
  if (incomingCallVisible.value && incomingCallData.value) {
    console.log('[CallManagement] 收到来电更新（号码补全）:', data)
    const updatedPhone = data.callerNumber || data.phone || ''
    const validUpdatedPhone = (updatedPhone && updatedPhone !== '未知来电') ? updatedPhone : incomingCallData.value.phone
    incomingCallData.value = {
      ...incomingCallData.value,
      id: data.callId || incomingCallData.value.id,
      customerName: data.customerInfo?.customerName || data.customerName || incomingCallData.value.customerName,
      phone: validUpdatedPhone,
      customerId: data.customerInfo?.customerId || data.customerId || incomingCallData.value.customerId,
      customerLevel: data.customerInfo?.customerLevel || incomingCallData.value.customerLevel,
      company: data.customerInfo?.company || incomingCallData.value.company,
      tags: data.customerInfo?.tags || incomingCallData.value.tags,
    }
    console.log('[CallManagement] 弹窗客户信息已更新:', incomingCallData.value.customerName, incomingCallData.value.phone)
    return
  }

  // 检查忙碌状态
  if (callStatus.value === 'busy') {
    console.log('[CallManagement] 忙碌状态，忽略来电')
    return
  }

  // 检查是否已在通话中
  if (callInProgressVisible.value) {
    ElNotification({
      title: '来电提醒',
      message: `${data.customerInfo?.customerName || data.customerName || '未知'} (${data.callerNumber || data.phone || ''}) 来电，但您正在通话中`,
      type: 'warning',
      duration: 10000
    })
    return
  }

  // 构建来电数据（"未知来电"不算有效号码，保持为空让弹窗显示"未知号码"）
  const rawPhone = data.callerNumber || data.phone || ''
  const validPhone = (rawPhone && rawPhone !== '未知来电') ? rawPhone : ''
  const incomingData = {
    id: data.callId,
    customerName: data.customerInfo?.customerName || data.customerName || (validPhone ? '来电客户' : '未知来电'),
    phone: validPhone,
    customerId: data.customerInfo?.customerId || data.customerId,
    customerLevel: data.customerInfo?.customerLevel || data.customerLevel,
    company: data.customerInfo?.company || data.company,
    lastCallTime: data.customerInfo?.lastCallTime || data.lastCallTime,
    callSource: data.callSource,
    deviceInfo: data.deviceInfo,
    tags: data.customerInfo?.tags || []
  }

  // 触发来电弹窗
  simulateIncomingCall(incomingData)
}

const simulateIncomingCall = (customerData: any) => {
  if (callStatus.value === 'busy') {
    ElMessage.warning('当前状态为忙碌，无法接收来电')
    return
  }

  incomingCallData.value = customerData
  incomingCallVisible.value = true
}

const answerCall = async () => {
  if (!incomingCallData.value) return

  // 关闭呼入弹窗
  incomingCallVisible.value = false

  // 设置当前通话数据
  currentCallData.value = {
    ...incomingCallData.value,
    callMethod: incomingCallData.value.callSource || 'sip'
  }
  currentCallId.value = incomingCallData.value.id
  callDuration.value = 0
  callNotes.value = ''
  callConnected.value = true

  // 显示通话中弹窗
  callInProgressVisible.value = true
  startCallTimer()

  // 通知后端已接听（更新call_records状态）
  try {
    if (incomingCallData.value.id) {
      await callConfigApi.updateCallStatus(incomingCallData.value.id, 'connected')
    }
  } catch (e) {
    console.error('[CallManagement] 更新接听状态失败:', e)
  }

  ElMessage.success('通话已接通')
}

const rejectCall = async () => {
  const callId = incomingCallData.value?.id
  incomingCallVisible.value = false
  incomingCallData.value = null

  // 通知后端已拒绝来电
  try {
    if (callId) {
      await callConfigApi.updateCallStatus(callId, 'rejected')
    }
  } catch (e) {
    console.error('[CallManagement] 更新拒绝状态失败:', e)
  }

  ElMessage.info('已拒绝来电')
}

const endCall = async () => {
  // 停止计时
  stopCallTimer()

  // 保存通话记录
  try {
    // 如果有callId，调用后端API结束通话
    if (currentCallData.value?.id) {
      await callConfigApi.endCall(currentCallData.value.id, {
        notes: callNotes.value,
        duration: callDuration.value
      })
    }
    ElMessage.success('通话已结束，记录已保存')
  } catch (error) {
    console.error('保存通话记录失败:', error)
    ElMessage.error('保存通话记录失败')
  }

  // 关闭通话中弹窗并重置状态
  closeCallWindow()

  // 刷新通话记录和统计
  await callStore.fetchCallRecords()
  await loadStatistics()
}

// 关闭通话窗口并重置状态
const closeCallWindow = () => {
  callInProgressVisible.value = false
  currentCallData.value = null
  currentCallId.value = null
  callDuration.value = 0
  callNotes.value = ''
  isCallWindowMinimized.value = false
  callConnected.value = false

  // 停止计时器
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

// 保存通话备注
const saveCallNotes = async (silent = false) => {
  if (!currentCallId.value && !currentCallData.value?.id) {
    if (!silent) ElMessage.warning('没有正在进行的通话')
    return
  }

  if (!callNotes.value.trim()) {
    if (!silent) ElMessage.warning('请输入备注内容')
    return
  }

  try {
    savingNotes.value = true
    const callId = currentCallId.value || currentCallData.value?.id

    // 调用API更新通话记录的备注
    await callConfigApi.updateCallNotes(callId, callNotes.value.trim())

    if (!silent) {
      ElMessage.success('备注保存成功')
    }
  } catch (error) {
    console.error('保存备注失败:', error)
    if (!silent) {
      ElMessage.error('保存备注失败，请重试')
    }
  } finally {
    savingNotes.value = false
  }
}

// 处理结束通话按钮点击
const handleEndCallClick = () => {
  // 如果是工作手机外呼，提示用户在手机端挂断
  if (currentCallData.value?.callMethod === 'work_phone') {
    ElMessageBox.confirm(
      '本次通话需要在手机上挂断，挂断后本窗口会自动关闭。',
      '提示',
      {
        confirmButtonText: '我知道了',
        cancelButtonText: '关闭窗口',
        distinguishCancelAndClose: true,
        type: 'info'
      }
    ).then(() => {
      // 用户点击"我知道了"，不做任何操作
    }).catch((action) => {
      if (action === 'cancel') {
        // 用户点击"关闭窗口"，直接关闭通话窗口
        closeCallWindow()
      }
    })
  } else {
    // 网络电话可以直接结束
    endCall()
  }
}

const startCallTimer = () => {
  // 只有在接通状态下才开始计时
  if (!callConnected.value) return

  callTimer.value = setInterval(() => {
    callDuration.value++
  }, 1000)
}

// 通话接通时调用
const onCallConnected = () => {
  callConnected.value = true
  callDuration.value = 0
  startCallTimer()
}

const stopCallTimer = () => {
  if (callTimer.value) {
    clearInterval(callTimer.value)
    callTimer.value = null
  }
}

const saveCallRecord = async () => {
  if (!currentCallData.value) return

  // 如果是通过新的发起呼叫流程，通话记录已经在后端创建
  // 这里只需要刷新数据
  await refreshData()
}

const viewCustomerDetail = () => {
  if (!incomingCallData.value) return

  currentCustomer.value = incomingCallData.value
  showDetailDialog.value = true
  incomingCallVisible.value = false
}

const quickFollowUp = () => {
  if (!incomingCallData.value) return

  currentCustomer.value = incomingCallData.value
  quickFollowUpVisible.value = true
  incomingCallVisible.value = false
}

// 通话中弹窗的快捷操作
const openQuickFollowUpFromCall = () => {
  if (!currentCallData.value) return

  // 最小化通话窗口
  isCallWindowMinimized.value = true

  // 设置当前客户信息用于跟进
  currentCustomer.value = {
    id: currentCallData.value.customerId || currentCallData.value.id,
    name: currentCallData.value.customerName,
    phone: currentCallData.value.phone
  }
  quickFollowUpVisible.value = true
}

const viewCustomerDetailFromCall = async () => {
  if (!currentCallData.value) return

  // 最小化通话窗口
  isCallWindowMinimized.value = true

  const customerId = currentCallData.value.customerId || currentCallData.value.id

  // 设置当前客户信息用于查看详情
  currentCustomer.value = {
    id: customerId,
    customerName: currentCallData.value.customerName,
    name: currentCallData.value.customerName,
    phone: currentCallData.value.phone
  }

  // 加载客户详情数据
  if (customerId) {
    await loadCustomerDetailData(customerId)
  }

  showDetailDialog.value = true
}

// 模拟呼入测试方法（开发测试用）
const testIncomingCall = () => {
  const testCustomer = {
    id: 'test_001',
    customerName: '测试客户',
    phone: '13800138888',
    customerLevel: 'gold',
    lastCallTime: '2024-01-10 15:30:00',
    company: '测试公司'
  }
  simulateIncomingCall(testCustomer)
}

const viewCallDetail = (record: any) => {
  // 显示通话详情对话框 - 美化版
  const callTypeTag = record.callType === 'outbound'
    ? '<span style="display: inline-block; padding: 2px 8px; background: #ecf5ff; color: #409eff; border-radius: 4px; font-size: 12px;">外呼</span>'
    : '<span style="display: inline-block; padding: 2px 8px; background: #f0f9eb; color: #67c23a; border-radius: 4px; font-size: 12px;">来电</span>'

  const statusColor = record.status === 'connected' ? '#67c23a' : (record.status === 'no_answer' ? '#e6a23c' : '#f56c6c')
  const statusTag = `<span style="display: inline-block; padding: 2px 8px; background: ${statusColor}20; color: ${statusColor}; border-radius: 4px; font-size: 12px;">${getStatusText(record.status)}</span>`

  // 通话标签
  const callTagsHtml = record.callTags && record.callTags.length > 0
    ? record.callTags.map((tag: string) => `<span style="display: inline-block; padding: 2px 8px; background: #f4f4f5; color: #909399; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')
    : '<span style="color: #c0c4cc;">无</span>'

  ElMessageBox.alert(
    `<div style="padding: 8px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">呼叫类型</span>
          <span>${callTypeTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">通话状态</span>
          <span>${statusTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">通话时长</span>
          <span style="color: #303133; font-weight: 500;">${record.duration || '0秒'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">操作人员</span>
          <span style="color: #303133;">${record.operator || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">开始时间</span>
          <span style="color: #303133;">${record.startTime || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">通话标签</span>
          <div>${callTagsHtml}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">备注</span>
          <span style="color: #606266;">${record.remark || '无'}</span>
        </div>
        ${record.recordingUrl ? `
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">录音</span>
          <a href="${record.recordingUrl}" target="_blank" style="color: #409eff; text-decoration: none;">点击播放录音</a>
        </div>` : ''}
      </div>
    </div>`,
    '通话详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'detail-message-box'
    }
  )
}

const createFollowUp = (record: CallRecord) => {
  // 跳转到创建跟进记录页面
  safeNavigator.push(`/service-management/call/followup?callId=${record.id}&customerId=${record.customerId}`)
}

// 详情弹窗相关方法
const getOrderStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': 'warning',
    'pending_audit': 'warning',
    'pending_transfer': 'warning',
    'processing': 'primary',
    'shipped': 'primary',
    'delivered': 'success',
    'completed': 'success',
    'cancelled': 'danger',
    'refunded': 'danger'
  }
  return statusMap[status] || 'info'
}

const getOrderStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    'pending': '待处理',
    'pending_audit': '待审核',
    'pending_transfer': '待流转',
    'processing': '处理中',
    'shipped': '已发货',
    'delivered': '已签收',
    'completed': '已完成',
    'cancelled': '已取消',
    'refunded': '已退款'
  }
  return statusMap[status] || status || '未知'
}

const viewOrder = (row: any) => {
  // 跳转到订单详情页面
  const orderId = row.id || row.orderNo
  if (orderId) {
    router.push(`/order/detail/${orderId}`)
  } else {
    ElMessage.warning('订单ID不存在')
  }
}

const viewAftersales = (row: any) => {
  // 跳转到售后详情页面
  const ticketId = row.id || row.ticketNo
  if (ticketId) {
    router.push(`/service/aftersales/detail/${ticketId}`)
  } else {
    ElMessage.warning('工单ID不存在')
  }
}

const viewFollowup = (row: any) => {
  // 显示跟进记录详情对话框 - 美化版
  const typeMap: Record<string, { bg: string; color: string }> = {
    'call': { bg: '#ecf5ff', color: '#409eff' },
    'visit': { bg: '#f0f9eb', color: '#67c23a' },
    'email': { bg: '#fdf6ec', color: '#e6a23c' },
    'message': { bg: '#f4f4f5', color: '#909399' }
  }
  const typeStyle = typeMap[row.type] || { bg: '#f4f4f5', color: '#909399' }
  const typeTag = `<span style="display: inline-block; padding: 2px 8px; background: ${typeStyle.bg}; color: ${typeStyle.color}; border-radius: 4px; font-size: 12px;">${getFollowUpTypeLabel(row.type)}</span>`

  const intentMap: Record<string, { bg: string; color: string }> = {
    'high': { bg: '#f0f9eb', color: '#67c23a' },
    'medium': { bg: '#fdf6ec', color: '#e6a23c' },
    'low': { bg: '#f4f4f5', color: '#909399' },
    'none': { bg: '#fef0f0', color: '#f56c6c' }
  }
  const intentStyle = row.customerIntent ? (intentMap[row.customerIntent] || { bg: '#f4f4f5', color: '#909399' }) : null
  const intentTag = intentStyle
    ? `<span style="display: inline-block; padding: 2px 8px; background: ${intentStyle.bg}; color: ${intentStyle.color}; border-radius: 4px; font-size: 12px;">${getIntentLabel(row.customerIntent)}</span>`
    : '<span style="color: #c0c4cc;">未设置</span>'

  const tagsHtml = row.callTags && row.callTags.length > 0
    ? row.callTags.map((tag: string) => `<span style="display: inline-block; padding: 2px 6px; background: #f4f4f5; color: #606266; border-radius: 4px; font-size: 12px; margin-right: 4px;">${tag}</span>`).join('')
    : '<span style="color: #c0c4cc;">无</span>'

  ElMessageBox.alert(
    `<div style="padding: 8px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px 24px;">
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进类型</span>
          <span>${typeTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">客户意向</span>
          <span>${intentTag}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进人</span>
          <span style="color: #303133;">${row.operator || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px;">
          <span style="color: #909399; font-size: 12px;">跟进时间</span>
          <span style="color: #303133;">${row.createTime || '-'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">跟进内容</span>
          <span style="color: #606266; line-height: 1.6;">${row.content || '无'}</span>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">通话标签</span>
          <div>${tagsHtml}</div>
        </div>
        <div style="display: flex; flex-direction: column; gap: 4px; grid-column: span 2;">
          <span style="color: #909399; font-size: 12px;">下次计划</span>
          <span style="color: #606266;">${row.nextPlan || '无'}</span>
        </div>
      </div>
    </div>`,
    '跟进记录详情',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '关闭',
      customClass: 'detail-message-box'
    }
  )
}


// 加载统计数据（支持日期范围参数，不传则默认当天）
const loadStatistics = async (dateRange?: string[]) => {
  try {
    const pad = (n: number) => String(n).padStart(2, '0')
    let startDate: string
    let endDate: string

    if (dateRange && dateRange.length === 2 && dateRange[0] && dateRange[1]) {
      startDate = dateRange[0] + ' 00:00:00'
      endDate = dateRange[1] + ' 23:59:59'
    } else {
      const today = new Date()
      const y = today.getFullYear()
      const m = pad(today.getMonth() + 1)
      const d = pad(today.getDate())
      startDate = `${y}-${m}-${d} 00:00:00`
      endDate = `${y}-${m}-${d} 23:59:59`
    }

    try {
      const response = await callApi.getCallStatistics({
        startDate,
        endDate,
        groupBy: 'day'
      }) as any

      const stats = response?.data ?? response
      statistics.todayCalls = Number(stats?.totalCalls) || 0
      statistics.totalDuration = Number(stats?.totalDuration) || 0
      statistics.connectionRate = Math.round(Number(stats?.connectionRate) || 0)
      statistics.activeUsers = stats?.userStats?.length || 0
      return
    } catch (_apiError) {
      console.warn('[通话管理] API统计加载失败,使用本地计算')
    }

    const todayStart = new Date(startDate.replace(' ', 'T'))
    const todayEnd = new Date(endDate.replace(' ', 'T'))

    const allRecords = callStore.callRecords || []
    const filteredRecords = allRecords.filter((record: any) => {
      const recordDate = new Date(record.startTime || record.createdAt)
      return recordDate >= todayStart && recordDate <= todayEnd
    })

    statistics.todayCalls = filteredRecords.length
    statistics.totalDuration = filteredRecords.reduce((total: number, record: any) => {
      return total + (record.duration || 0)
    }, 0)

    const connectedCalls = filteredRecords.filter((record: any) =>
      record.callStatus === 'connected' || record.status === 'connected'
    ).length
    statistics.connectionRate = filteredRecords.length > 0
      ? Math.round((connectedCalls / filteredRecords.length) * 100)
      : 0

    const activeUserIds = new Set(
      filteredRecords.map((record: any) => record.userId || record.operatorId).filter(Boolean)
    )
    statistics.activeUsers = activeUserIds.size
  } catch (error) {
    console.error('加载统计数据失败:', error)
    statistics.todayCalls = 0
    statistics.totalDuration = 0
    statistics.connectionRate = 0
    statistics.activeUsers = 0
  }
}

// 负责人列表 - 从userStore获取真实用户
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const salesPersonList = computed(() => {
  const currentUserRole = userStore.currentUser?.role
  const currentUserDepartment = userStore.currentUser?.department

  return userStore.users
    .filter((u: any) => {
      // 检查用户是否启用（禁用用户不显示）
      const isEnabled = !u.status || u.status === 'active'
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role)

      // 🔥 部门经理只能看到本部门的用户
      if (currentUserRole === 'department_manager') {
        return isEnabled && hasValidRole && u.department === currentUserDepartment
      }

      return isEnabled && hasValidRole
    })
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username,
      department: u.departmentName || u.department || ''
    }))
})

// 🔥 是否可以查看负责人筛选（超管、管理员、部门经理可以）
const canViewSalesPersonFilter = computed(() => {
  const role = userStore.currentUser?.role
  return role === 'super_admin' || role === 'admin' || role === 'department_manager'
})

// 生命周期
onMounted(async () => {
  try {
    // 初始化坐席状态（从本地存储恢复）
    initAgentStatus()
    // 加载用户列表（用于负责人筛选）
    await userStore.loadUsers()
    // 加载呼出列表
    await loadOutboundList()
    // 获取最近的通话记录（先于统计加载，兜底计算需要）
    await callStore.fetchCallRecords({ pageSize: 10 })
    // 加载统计数据
    await loadStatistics()
    // 获取跟进记录
    await callStore.fetchFollowUpRecords({ pageSize: 20 })
    // 加载SDK详细信息
    // 加载可用外呼线路和工作手机
    await loadAvailableCallMethods()

    // 监听WebSocket通话状态变化
    setupCallStatusListener()

    // 🔥 检查路由参数，如果是从客户列表跳转过来的外呼请求
    checkOutboundFromRoute()
  } catch (error) {
    console.error('加载数据失败:', error)
  }
})

// 🔥 检查路由参数，处理从其他页面跳转过来的外呼请求
const checkOutboundFromRoute = () => {
  const { action, customerId, customerName, customerPhone, company } = route.query

  if (action === 'outbound' && customerId && customerPhone) {
    console.log('[CallManagement] 收到外呼请求:', { customerId, customerName, customerPhone, company })

    // 构建客户信息
    const customer = {
      id: customerId as string,
      name: customerName as string || '未知客户',
      phone: customerPhone as string,
      company: (company as string) || ''
    }

    // 将客户添加到选项列表
    const existingIndex = customerOptions.value.findIndex((c: any) => c.id === customer.id)
    if (existingIndex === -1) {
      customerOptions.value = [customer, ...customerOptions.value]
    }

    // 预填充外呼表单
    outboundForm.value.selectedCustomer = customer as any
    outboundForm.value.customerId = customer.id

    // 更新号码选项
    phoneOptions.value = [{
      phone: customer.phone,
      type: '主号码'
    }]
    outboundForm.value.customerPhone = customer.phone

    // 🔥 设置默认外呼方式（如果有可用的工作手机或线路）
    if (workPhones.value.length > 0) {
      outboundForm.value.callMethod = 'work_phone'
      outboundForm.value.selectedWorkPhone = workPhones.value[0].id
    } else if (availableLines.value.length > 0) {
      outboundForm.value.callMethod = 'network_phone'
      outboundForm.value.selectedLine = availableLines.value[0].id
    }

    // 打开外呼对话框
    showOutboundDialog.value = true

    // 清除路由参数，避免刷新页面时重复弹窗
    router.replace({ path: route.path })
  }
}

// 设置通话状态监听
const setupCallStatusListener = () => {
  // 监听设备状态变化（包括通话状态）
  webSocketService.onDeviceStatusChange((data) => {
    console.log('[CallManagement] 设备状态变化:', data)
    // 刷新工作手机状态
    loadAvailableCallMethods()
  })

  // 监听通话状态变化（APP端同步）
  webSocketService.on('call:status', (data: any) => {
    console.log('[CallManagement] 收到通话状态变化:', data)
    handleCallStatusFromWebSocket(data)
  })

  // 监听通话接通
  webSocketService.on('call:connected', (data: any) => {
    console.log('[CallManagement] 收到通话接通:', data)
    handleCallStatusFromWebSocket({ ...data, status: 'connected' })
  })

  // 监听通话结束
  webSocketService.on('call:ended', (data: any) => {
    console.log('[CallManagement] 收到通话结束:', data)
    handleCallEndedFromWebSocket(data)
  })

  // 监听来电通知（呼入）
  webSocketService.on('call:incoming', (data: any) => {
    console.log('[CallManagement] 收到来电通知:', data)
    handleIncomingCall(data)
  })

  // 监听WebSocket消息，处理通话状态变化（兼容旧格式）
  webSocketService.onMessage((message) => {
    console.log('[CallManagement] 收到WebSocket消息:', message)

    // 处理通话状态变化消息
    if (message.type === 'CALL_STATUS' || message.type === 'call_status') {
      handleCallStatusChange(message)
    }

    // 处理通话结束消息
    if (message.type === 'CALL_ENDED' || message.type === 'call_ended') {
      handleCallEnded(message)
    }

    // 处理来电通知（兼容旧格式）
    if (message.type === 'CALL_INCOMING') {
      handleIncomingCall(message.data || message)
    }

    // 处理号码补获更新（APP后台补获到真实号码后推送，含客户匹配结果）
    if (message.type === 'CALL_NUMBER_UPDATED') {
      const updateData = message.data || message
      console.log('[CallManagement] 收到号码更新:', updateData)
      if (updateData.phoneNumber && updateData.phoneNumber !== '未知来电') {
        handleIncomingCall({
          callerNumber: updateData.phoneNumber,
          callId: updateData.callId,
          customerName: updateData.customerName,
          customerId: updateData.customerId,
          customerInfo: {
            customerName: updateData.customerName,
            customerId: updateData.customerId,
            customerLevel: updateData.customerLevel,
          },
        })
      }
    }
  })
}

// 处理WebSocket推送的通话状态变化
const handleCallStatusFromWebSocket = (data: any) => {
  const callId = data.callId
  const status = data.status

  console.log('[CallManagement] 处理通话状态:', { callId, status, currentCallId: currentCallId.value, incomingCallVisible: incomingCallVisible.value })

  // 来电弹窗显示中，收到 connected/ended 状态时关闭弹窗（APP端接听/挂断）
  if (incomingCallVisible.value) {
    if (status === 'connected' || status === 'answered') {
      console.log('[CallManagement] APP端已接听，关闭来电弹窗')
      incomingCallVisible.value = false
      // 转入通话中状态
      if (incomingCallData.value) {
        currentCallData.value = { ...incomingCallData.value, callMethod: incomingCallData.value.callSource || 'mobile' }
        currentCallId.value = incomingCallData.value.id
        callConnected.value = true
        callDuration.value = 0
        startCallTimer()
        callInProgressVisible.value = true
        isCallWindowMinimized.value = false
        incomingCallData.value = null
      }
      ElMessage.success('来电已在手机上接听')
      return
    }
    if (status === 'ended' || status === 'missed' || status === 'rejected' || status === 'failed') {
      console.log('[CallManagement] APP端已挂断/拒绝，关闭来电弹窗')
      incomingCallVisible.value = false
      incomingCallData.value = null
      ElMessage.info('来电已结束')
      setTimeout(() => { loadCallRecords(); loadStatistics() }, 500)
      return
    }
  }

  // 检查是否是当前通话（通话中状态同步）
  if (currentCallId.value && (!callId || currentCallId.value === callId)) {
    if (status === 'connected' || status === 'answered') {
      // 通话已接通，开始计时
      if (!callConnected.value) {
        console.log('[CallManagement] 通话已接通，开始计时')
        callConnected.value = true
        callDuration.value = 0
        startCallTimer()
        ElMessage.success('通话已接通')
      }
    } else if (status === 'ringing') {
      console.log('[CallManagement] 对方响铃中')
    } else if (status === 'ended' || status === 'released' || status === 'hangup') {
      // 通话结束
      handleCallEndedFromWebSocket(data)
    }
  }
}

// 处理WebSocket推送的通话结束
const handleCallEndedFromWebSocket = (data: any) => {
  const callId = data.callId

  console.log('[CallManagement] 处理通话结束:', { callId, currentCallId: currentCallId.value, incomingCallVisible: incomingCallVisible.value })

  // 来电弹窗还开着，直接关闭
  if (incomingCallVisible.value) {
    incomingCallVisible.value = false
    incomingCallData.value = null
    ElMessage.info('来电已结束')
  }

  // 如果是当前通话（宽松匹配：callId为空也关闭），关闭通话窗口
  if (callInProgressVisible.value && (!callId || !currentCallId.value || currentCallId.value === callId)) {
    console.log('[CallManagement] 当前通话已结束，自动关闭窗口')

    if (data.duration !== undefined) {
      callDuration.value = data.duration
    }

    if (callNotes.value.trim()) {
      saveCallNotes(true)
    }

    if (callTimer.value) {
      clearInterval(callTimer.value)
      callTimer.value = null
    }

    closeCallWindow()
    ElMessage.info(`通话已结束，通话时长：${formatCallDuration(callDuration.value)}`)
  }

  // 无论是否当前通话，都刷新数据
  setTimeout(() => {
    loadCallRecords()
    loadOutboundList()
    loadStatistics()
  }, 500)
}

// 处理通话状态变化
const handleCallStatusChange = (message: any) => {
  const data = message.data || message
  const callId = data.callId

  // 检查是否是当前通话
  if (currentCallData.value && currentCallData.value.id === callId) {
    const status = data.status

    console.log('[CallManagement] 通话状态变化:', status)

    if (status === 'connected' || status === 'answered') {
      // 通话已接通，开始计时
      if (!callConnected.value) {
        callConnected.value = true
        callDuration.value = 0
        startCallTimer()
        ElMessage.success('通话已接通')
      }
    } else if (status === 'ringing') {
      // 对方响铃中
      console.log('[CallManagement] 对方响铃中')
    }
  }
}

// 处理通话结束
const handleCallEnded = (message: any) => {
  const data = message.data || message
  const callId = data.callId

  if (currentCallData.value && currentCallData.value.id === callId) {
    console.log('[CallManagement] 通话已结束:', data)
    if (data.duration !== undefined) {
      callDuration.value = data.duration
    }
    endCall()
  } else {
    // 非当前通话结束也要刷新数据
    setTimeout(() => {
      loadCallRecords()
      loadOutboundList()
      loadStatistics()
    }, 500)
  }
}

// 加载可用的外呼线路和工作手机
const loadAvailableCallMethods = async () => {
  try {
    const res = await callConfigApi.getMyAvailableLines()
    console.log('[CallManagement] loadAvailableCallMethods response:', res)
    console.log('[CallManagement] loadAvailableCallMethods raw:', JSON.stringify(res))

    // request.ts 响应拦截器返回的是 data
    let assignedLines: any[] = []
    let workPhonesData: any[] = []

    if (res && (res as any).assignedLines !== undefined) {
      assignedLines = (res as any).assignedLines || []
      workPhonesData = (res as any).workPhones || []
    } else if (res && (res as any).success && (res as any).data) {
      assignedLines = (res as any).data.assignedLines || []
      workPhonesData = (res as any).data.workPhones || []
    }

    // 映射线路数据
    availableLines.value = assignedLines.map((line: any) => ({
      id: line.id,
      name: line.name,
      provider: line.provider,
      status: '正常',
      callerNumber: line.callerNumber
    }))

    workPhones.value = workPhonesData.map((phone: any, index: number) => {
      let phoneId: number | string = phone.id
      if (phoneId === undefined || phoneId === null || phoneId === '') {
        phoneId = index + 1
      }
      if (typeof phoneId === 'string' && /^\d+$/.test(phoneId)) {
        phoneId = parseInt(phoneId)
      }

      return {
        id: phoneId,
        number: phone.phoneNumber || phone.phone_number || phone.deviceName || phone.device_name || '未知号码',
        name: phone.deviceName || phone.device_name || '工作手机',
        status: (phone.onlineStatus === 'online' || phone.online_status === 'online') ? '在线' : '离线',
        brand: phone.deviceModel || phone.device_model || ''
      }
    })
  } catch (e) {
    console.error('加载可用外呼方式失败:', e)
  }
}

// 初始化外呼弹窗
const initOutboundDialog = async () => {
  // 加载可用的外呼方式
  await loadAvailableCallMethods()

  console.log('[initOutboundDialog] workPhones:', workPhones.value.length, workPhones.value.map(p => ({ id: p.id, status: p.status })))
  console.log('[initOutboundDialog] availableLines:', availableLines.value.length)

  // 🔥 只有在没有设置外呼方式时才设置默认值（避免覆盖从路由传递的设置）
  if (!outboundForm.value.callMethod) {
    if (workPhones.value.length > 0) {
      outboundForm.value.callMethod = 'work_phone'
      outboundForm.value.selectedWorkPhone = workPhones.value[0].id
      console.log('[initOutboundDialog] 设置默认工作手机:', workPhones.value[0].id, typeof workPhones.value[0].id)
    } else if (availableLines.value.length > 0) {
      outboundForm.value.callMethod = 'network_phone'
      outboundForm.value.selectedLine = availableLines.value[0].id
      console.log('[initOutboundDialog] 设置默认线路:', availableLines.value[0].id)
    }
  }

  console.log('[initOutboundDialog] 最终 outboundForm:', {
    callMethod: outboundForm.value.callMethod,
    selectedWorkPhone: outboundForm.value.selectedWorkPhone,
    selectedLine: outboundForm.value.selectedLine,
    selectedCustomer: outboundForm.value.selectedCustomer,
    customerPhone: outboundForm.value.customerPhone
  })
}

// 外呼方式变更处理
const onOutboundMethodChange = (method: string) => {
  if (method === 'work_phone' && workPhones.value.length > 0) {
    outboundForm.value.selectedWorkPhone = workPhones.value[0].id
    outboundForm.value.selectedLine = null
  } else if (method === 'network_phone' && availableLines.value.length > 0) {
    outboundForm.value.selectedLine = availableLines.value[0].id
    outboundForm.value.selectedWorkPhone = null
  }
}

// 获取服务商文本
const getProviderText = (provider: string) => {
  const providerMap: Record<string, string> = {
    aliyun: '阿里云',
    tencent: '腾讯云',
    huawei: '华为云',
    custom: '自定义'
  }
  return providerMap[provider] || provider || '未知'
}

// 手机号运营商映射（根据手机号前三位判断）
const phoneCarrierMap: Record<string, string> = {
  // 中国移动
  '134': '移动', '135': '移动', '136': '移动', '137': '移动', '138': '移动', '139': '移动',
  '147': '移动', '148': '移动', '150': '移动', '151': '移动', '152': '移动', '157': '移动',
  '158': '移动', '159': '移动', '172': '移动', '178': '移动', '182': '移动', '183': '移动',
  '184': '移动', '187': '移动', '188': '移动', '195': '移动', '197': '移动', '198': '移动',
  // 中国联通
  '130': '联通', '131': '联通', '132': '联通', '145': '联通', '146': '联通', '155': '联通',
  '156': '联通', '166': '联通', '167': '联通', '171': '联通', '175': '联通', '176': '联通',
  '185': '联通', '186': '联通', '196': '联通',
  // 中国电信
  '133': '电信', '149': '电信', '153': '电信', '173': '电信', '174': '电信', '177': '电信',
  '180': '电信', '181': '电信', '189': '电信', '190': '电信', '191': '电信', '193': '电信',
  '199': '电信'
}

// 获取手机号运营商
const getPhoneCarrier = (phone: string): string => {
  if (!phone) return ''
  const cleanPhone = phone.replace(/\D/g, '')
  if (cleanPhone.length < 3) return ''
  const prefix = cleanPhone.substring(0, 3)
  return phoneCarrierMap[prefix] || ''
}

// 计算属性：是否可以开始呼叫
const canStartCall = computed(() => {
  console.log('[canStartCall] 检查条件:', {
    callMethod: outboundForm.value.callMethod,
    selectedWorkPhone: outboundForm.value.selectedWorkPhone,
    selectedLine: outboundForm.value.selectedLine,
    manualPhone: outboundForm.value.manualPhone,
    customerPhone: outboundForm.value.customerPhone
  })

  // 必须有外呼方式
  if (!outboundForm.value.callMethod) {
    console.log('[canStartCall] 失败: 没有选择外呼方式')
    return false
  }

  // 如果选择工作手机，必须选择一个手机
  if (outboundForm.value.callMethod === 'work_phone') {
    if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) {
      console.log('[canStartCall] 失败: 没有选择工作手机')
      return false
    }
    // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
    const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
    if (!selectedPhone) {
      console.log('[canStartCall] 失败: 找不到选中的工作手机, selectedWorkPhone:', outboundForm.value.selectedWorkPhone, 'workPhones:', workPhones.value.map(p => p.id))
      return false
    }
    if (selectedPhone.status !== 'online' && selectedPhone.status !== '在线') {
      console.log('[canStartCall] 失败: 选中的工作手机已离线')
      return false
    }
  }

  // 如果选择网络电话，必须选择一条线路
  if (outboundForm.value.callMethod === 'network_phone' && !outboundForm.value.selectedLine) {
    console.log('[canStartCall] 失败: 没有选择线路')
    return false
  }

  // 必须有电话号码（手动输入或从客户选择）
  // 手动输入号码时不需要选择客户
  const hasPhone = outboundForm.value.manualPhone?.trim() || outboundForm.value.customerPhone
  if (!hasPhone) {
    console.log('[canStartCall] 失败: 没有电话号码')
    return false
  }

  console.log('[canStartCall] 通过所有检查')
  return true
})

// 计算属性：获取不能呼叫的原因
const getCannotCallReason = computed(() => {
  if (!outboundForm.value.callMethod) {
    if (!workPhones.value.length && !availableLines.value.length) {
      return '暂无可用的外呼方式，请先绑定工作手机或联系管理员分配线路'
    }
    return '请选择外呼方式'
  }

  if (outboundForm.value.callMethod === 'work_phone') {
    if (!outboundForm.value.selectedWorkPhone && outboundForm.value.selectedWorkPhone !== 0) {
      return '请选择工作手机'
    }
    // 🔥 修复：使用宽松比较，支持字符串和数字类型的 ID
    const selectedPhone = workPhones.value.find(p => String(p.id) === String(outboundForm.value.selectedWorkPhone))
    if (!selectedPhone) {
      return '选中的工作手机不存在，请重新选择'
    }
    if (selectedPhone.status !== 'online' && selectedPhone.status !== '在线') {
      return '选中的工作手机已离线，请在手机APP上重新连接'
    }
  }

  if (outboundForm.value.callMethod === 'network_phone' && !outboundForm.value.selectedLine) {
    return '请选择外呼线路'
  }

  const hasPhone = outboundForm.value.manualPhone?.trim() || outboundForm.value.customerPhone
  if (!hasPhone) {
    return '请选择客户或手动输入电话号码'
  }

  return ''
})

// 组件卸载时清理定时器
onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value)
    autoRefreshTimer.value = null
  }

  // 清理搜索防抖定时器
  if (searchTimer) {
    clearTimeout(searchTimer)
    searchTimer = null
  }


  // 清理拖动事件监听器
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
})

// 监听平台变化，重新加载SDK信息
</script>

<style scoped>
.call-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  margin: 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.header-actions {
  display: flex;
  gap: 12px;
}

/* 手机离线提示样式 */
.phone-offline-tip {
  margin-top: 12px;
}

/* 手机在线提示样式 */
.phone-online-tip {
  margin-top: 12px;
}

/* 二维码绑定弹窗样式 */
.qr-bind-content {
  text-align: center;
  padding: 20px 0;
}

.qr-code-wrapper {
  margin-bottom: 20px;
}

.qr-code-img {
  width: 200px;
  height: 200px;
  border: 1px solid #eee;
  border-radius: 8px;
}

.qr-status {
  margin-top: 16px;
  font-size: 14px;
  color: #666;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.qr-loading {
  padding: 40px 0;
  color: #999;
}

.qr-loading p {
  margin-top: 12px;
}

.qr-tips {
  text-align: left;
  background: #f5f7fa;
  padding: 16px;
  border-radius: 8px;
  margin-top: 20px;
}

.qr-tips p {
  margin: 8px 0;
  font-size: 13px;
  color: #666;
}

/* 统计卡片样式 */
.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
  transition: all 0.3s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.stat-item {
  display: flex;
  align-items: center;
  height: 100%;
  padding: 20px;
}

.stat-icon {
  width: 50px;
  height: 50px;
  border-radius: 10px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
  color: white;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

/* 筛选器样式 */
.filter-card {
  margin-bottom: 20px;
}

.filter-section {
  padding: 20px;
}

.filter-row {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.filter-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.filter-item label {
  font-size: 14px;
  color: #606266;
  white-space: nowrap;
  min-width: 80px;
}

.filter-item .el-select {
  min-width: 160px;
  width: auto;
}

.filter-item .el-date-picker {
  min-width: 240px;
  width: auto;
}

.search-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

/* 表格样式 */
.table-card {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 12px;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
  padding: 20px 0;
}

/* 详情弹窗样式 */
.customer-detail-dialog :deep(.el-dialog__header) {
  padding: 16px 20px;
  border-bottom: 1px solid #ebeef5;
  margin-right: 0;
}

.customer-detail-dialog :deep(.el-dialog__body) {
  padding: 0;
  max-height: calc(90vh - 120px);
  overflow-y: auto;
}

.customer-detail {
  padding: 0;
}

/* 客户头部信息 */
.customer-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #f0f0f0;
}

.customer-main-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.customer-avatar :deep(.el-avatar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  font-size: 18px;
  font-weight: 500;
}

.customer-basic {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.customer-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
}

.customer-contact {
  display: flex;
  gap: 20px;
  color: #606266;
  font-size: 13px;
}

.customer-contact .contact-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.customer-contact .el-icon {
  font-size: 14px;
  color: #909399;
}

.customer-stats {
  display: flex;
  gap: 32px;
}

.customer-stats .stat-item {
  text-align: center;
  min-width: 60px;
}

.customer-stats .stat-value {
  font-size: 20px;
  font-weight: 600;
  color: #409eff;
  line-height: 1.2;
}

.customer-stats .stat-value.last-call {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.customer-stats .stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

/* 标签页区域 */
.tabs-section {
  padding: 0;
}

.tabs-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 24px;
  border-bottom: 1px solid #ebeef5;
}

.tabs-header .detail-tabs {
  flex: 1;
}

.tabs-header .detail-tabs :deep(.el-tabs__header) {
  margin: 0;
  border: none;
}

.tabs-header .detail-tabs :deep(.el-tabs__nav-wrap::after) {
  display: none;
}

.tabs-header .detail-tabs :deep(.el-tabs__item) {
  height: 48px;
  line-height: 48px;
  font-size: 14px;
  color: #606266;
}

.tabs-header .detail-tabs :deep(.el-tabs__item.is-active) {
  color: #409eff;
  font-weight: 500;
}

.tabs-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

/* 表格内容区域 */
.tab-content {
  padding: 16px 24px 24px;
  min-height: 280px;
}

.tab-content :deep(.el-table) {
  border-radius: 4px;
  border: 1px solid #ebeef5;
}

.tab-content :deep(.el-table th.el-table__cell) {
  font-weight: 500;
}

.tab-content :deep(.el-table td.el-table__cell) {
  padding: 10px 0;
}

.tab-content :deep(.el-empty) {
  padding: 40px 0;
}

.tabs-section {
  background: #fff;
}

.tab-table .el-table {
  border-radius: 4px;
}

.tab-table .amount {
  color: #f56c6c;
  font-weight: 500;
}

.customer-info-card {
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.info-item label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
  min-width: 80px;
}

.tabs-card {
  margin-top: 20px;
}

.tab-content {
  padding: 20px;
}

.tab-header {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 16px;
}

/* 对话框样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 响应式设计 */
@media (max-width: 1200px) {
  .filter-row {
    flex-direction: column;
    gap: 16px;
  }

  .filter-item {
    width: 100%;
  }

  .search-row {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }
}

@media (max-width: 768px) {
  .call-management {
    padding: 12px;
  }

  .page-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }

  .header-actions {
    width: 100%;
    justify-content: center;
  }

  .stat-item {
    padding: 16px;
  }

  .stat-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .stat-value {
    font-size: 20px;
  }

  .table-header {
    flex-direction: column;
    gap: 12px;
    align-items: stretch;
  }

  .table-actions {
    justify-content: center;
  }

  .customer-detail {
    padding: 12px;
  }

  .tab-content {
    padding: 12px;
  }
}

/* 通话记录弹窗样式 */
.call-records-dialog {
  padding: 20px;
}

.dialog-filters {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
}

.dialog-pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.no-recording {
  color: #909399;
  font-size: 12px;
}

.text-muted {
  color: #909399;
  font-size: 12px;
}

/* 录音播放器样式 */
.recording-player {
  padding: 0;
}

.recording-info {
  margin-bottom: 16px;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.recording-info .info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.recording-info .info-label {
  font-size: 12px;
  color: #909399;
}

.recording-info .info-value {
  font-size: 14px;
  color: #303133;
}

.audio-player {
  padding: 16px;
  background: #f5f7fa;
  border-radius: 8px;
}

/* 快捷跟进弹窗样式 */
.quick-followup {
  padding: 20px;
}

.quick-followup .customer-info {
  margin-bottom: 20px;
  padding: 16px;
  background-color: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #409eff;
}

.quick-followup .customer-info p {
  margin: 8px 0;
  font-size: 14px;
  color: #606266;
}

.quick-followup .customer-info strong {
  color: #303133;
  font-weight: 600;
}

/* 操作区单元格对齐 */
.action-cell {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
}

/* 操作区文字链接样式 */
.action-link {
  color: #409eff;
  cursor: pointer;
  font-size: 14px;
  margin-right: 12px;
  text-decoration: none;
  transition: color 0.3s ease;
  display: inline-flex;
  align-items: center;
  line-height: 1;
}

.action-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}

.action-link:last-child {
  margin-right: 0;
}

.action-cell .el-dropdown {
  display: inline-flex;
  align-items: center;
}

/* 通话记录操作区样式 */
.call-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.call-actions .action-link {
  margin-right: 0;
}

.call-actions .no-recording {
  color: #909399;
  font-size: 12px;
}

/* 表格操作按钮样式优化 */
.el-table .el-button + .el-button {
  margin-left: 8px;
}

/* 标签样式优化 */
.el-tag {
  font-size: 12px;
}

/* 卡片阴影优化 */
.el-card {
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  border: none;
}

/* 翻页控件样式 */
.pagination-wrapper {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 20px;
  padding: 0 20px;
}

.pagination-stats {
  flex: 1;
}

.stats-text {
  color: #606266;
  font-size: 14px;
  line-height: 32px;
}

.el-pagination {
  flex-shrink: 0;
}

.el-card:hover {
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
}

/* 状态按钮样式 */
.status-button {
  margin-right: 12px;
  min-width: 80px;
  font-weight: 500;
}

.status-button.el-button--success {
  background-color: #67c23a;
  border-color: #67c23a;
}

.status-button.el-button--warning {
  background-color: #e6a23c;
  border-color: #e6a23c;
}

/* 呼入弹窗样式 */
.incoming-call {
  text-align: center;
  padding: 20px;
}

.caller-info {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30px;
  gap: 20px;
}

.caller-avatar {
  color: #409eff;
}

.caller-details {
  text-align: left;
}

.caller-details h3 {
  margin: 0 0 8px 0;
  font-size: 20px;
  color: #303133;
}

.phone-number {
  font-size: 16px;
  color: #606266;
  margin: 4px 0;
}

.customer-level {
  margin: 8px 0;
}

.last-call {
  font-size: 14px;
  color: #909399;
  margin: 4px 0;
}

.call-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 20px;
}

.answer-btn, .reject-btn {
  width: 120px;
  height: 50px;
  font-size: 16px;
  border-radius: 25px;
}

.quick-actions {
  display: flex;
  justify-content: center;
  gap: 12px;
}

/* 通话浮动窗口样式 */
.call-floating-window {
  position: fixed;
  z-index: 9999;
  width: 420px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.15), 0 2px 8px rgba(0, 0, 0, 0.1);
  overflow: hidden;
  transition: width 0.3s ease, height 0.3s ease;
}

.call-floating-window.is-minimized {
  width: 280px;
}

.call-window-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: linear-gradient(135deg, #409eff 0%, #36cfc9 100%);
  color: white;
  cursor: move;
  user-select: none;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}

.status-dot {
  width: 10px;
  height: 10px;
  background: #e6a23c;
  border-radius: 50%;
  animation: pulse 1.5s ease-in-out infinite;
}

.status-dot.is-connected {
  background: #67c23a;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.6;
    transform: scale(1.2);
  }
}

.header-title {
  font-weight: 600;
  font-size: 14px;
}

.call-floating-window .header-actions {
  display: flex;
  gap: 4px;
}

.call-floating-window .header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
}

.call-floating-window .header-actions .el-button:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* 最小化状态内容 */
.call-minimized-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8f9fa;
}

.mini-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.mini-name {
  font-weight: 600;
  font-size: 14px;
  color: #303133;
}

.mini-phone {
  font-size: 12px;
  color: #909399;
}

/* 展开状态内容 */
.call-window-content {
  padding: 20px;
  text-align: center;
}

.call-window-content .call-timer {
  margin-bottom: 16px;
}

.call-window-content .timer-display {
  font-size: 36px;
  font-weight: bold;
  color: #409eff;
  margin-bottom: 6px;
  font-family: 'Courier New', monospace;
}

.call-window-content .call-status {
  font-size: 13px;
  color: #67c23a;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
}

.call-window-content .call-status .is-loading {
  animation: rotating 2s linear infinite;
}

@keyframes rotating {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.call-window-content .caller-info-mini {
  margin-bottom: 16px;
  padding: 14px;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8f4ff 100%);
  border-radius: 10px;
  border: 1px solid #e4e7ed;
}

.call-window-content .caller-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.call-window-content .caller-phone {
  font-size: 14px;
  color: #606266;
  margin: 0 0 8px 0;
}

.call-window-content .call-method-info {
  margin-top: 6px;
}

.call-window-content .call-method-info .el-tag {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.call-window-content .call-controls {
  margin-bottom: 16px;
}

.call-window-content .end-call-btn {
  width: 140px;
  height: 44px;
  font-size: 15px;
  border-radius: 22px;
  font-weight: 500;
}

.call-window-content .call-notes {
  margin-top: 12px;
  text-align: left;
}

.call-window-content .call-notes .notes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  color: #606266;
}

.call-window-content .call-quick-actions {
  margin-top: 12px;
  display: flex;
  justify-content: center;
  gap: 10px;
}

.call-window-content .call-quick-actions .el-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

/* SDK配置卡片样式 */
.sdk-config-card {
  margin: 20px 0;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
}

.sdk-setup-steps {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  padding: 20px;
  background: #fafbfc;
  border-radius: 8px;
  border-left: 4px solid #409eff;
  transition: all 0.3s ease;
}

.step-item:hover {
  background: #f0f9ff;
  border-left-color: #67c23a;
}

.step-number {
  width: 32px;
  height: 32px;
  background: #409eff;
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  font-size: 14px;
  flex-shrink: 0;
}

.step-content {
  flex: 1;
}

.step-content h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
  font-weight: 600;
}

.sdk-download-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.sdk-status-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

.download-btn {
  border-radius: 20px;
  padding: 8px 20px;
  font-weight: 500;
}

.permission-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-top: 12px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: white;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  transition: all 0.3s ease;
}

.permission-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.permission-item .el-icon {
  font-size: 18px;
  color: #909399;
  transition: color 0.3s ease;
}

.permission-item .el-icon.permission-granted {
  color: #67c23a;
}

.permission-item span {
  flex: 1;
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.connection-test-area {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.connection-test-area .el-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  font-weight: 500;
}

/* SDK使用说明样式 */
.sdk-usage-tips {
  margin-top: 20px;
  border-radius: 8px;
}

.sdk-usage-tips .el-alert__content p {
  margin: 8px 0;
  line-height: 1.6;
}

.sdk-usage-tips .el-alert__content p strong {
  color: #409eff;
  font-weight: 600;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .step-item {
    flex-direction: column;
    text-align: center;
  }

  .step-number {
    align-self: center;
  }

  .sdk-download-area,
  .connection-test-area {
    flex-direction: column;
    align-items: stretch;
  }

  .permission-grid {
    grid-template-columns: 1fr;
  }
}

/* 下拉选项通用样式 */
.select-option-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  padding: 4px 0;
}

.option-content {
  flex: 1;
  min-width: 0;
  margin-right: 12px;
}

.option-title {
  font-weight: 500;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-code {
  color: #409eff;
  font-size: 12px;
  margin-left: 6px;
  font-weight: normal;
}

.option-desc {
  color: #8492a6;
  font-size: 12px;
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.option-tag {
  flex-shrink: 0;
}

/* 详情弹窗标签页内容样式 */
.tab-content {
  margin-top: 16px;
}

.tab-pagination {
  margin-top: 16px;
  display: flex;
  justify-content: center;
}

/* 外呼弹窗底部按钮样式 */
.dialog-footer-buttons {
  display: flex;
  justify-content: flex-end;
  gap: 16px;
}

/* 电话号码超链接样式 */
.phone-link {
  color: #409eff;
  cursor: pointer;
  text-decoration: none;
}

.phone-link:hover {
  color: #66b1ff;
  text-decoration: underline;
}
</style>

<!-- 全局样式，用于下拉框弹出层 -->
<style>
.outbound-select-popper {
  min-width: 450px !important;
}

.outbound-select-popper .el-select-dropdown__item {
  height: auto;
  padding: 8px 12px;
  line-height: 1.4;
}
</style>
