<template>
  <div class="wecom-customer">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <!-- 未绑定企微成员提示（非管理员用户） -->
    <el-alert
      v-if="bindingChecked && !userHasBinding && !isAdminRole"
      type="warning"
      :closable="false"
      show-icon
      style="margin-bottom: 16px"
    >
      <template #title>
        <span style="font-weight: 600">您的CRM账号尚未绑定企微成员</span>
      </template>
      <template #default>
        <div style="font-size: 13px; color: #6B7280; margin-top: 4px">
          企微客户数据需要CRM用户绑定了企微成员后才能同步显示。请联系管理员在「通讯录 → 成员绑定」中完成绑定操作。
        </div>
      </template>
    </el-alert>

    <!-- 统计卡片 -->
    <div class="v4-stats-row">
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #EEF2FF; color: #4C6EF5">📈</div>
        <div class="stat-body">
          <div class="stat-num primary">{{ displayStats.todayAdd }}</div>
          <div class="stat-label">今日进粉</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #ECFDF5; color: #10B981">👥</div>
        <div class="stat-body">
          <div class="stat-num success">{{ displayStats.totalAdd }}</div>
          <div class="stat-label">累计客户</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #FEF2F2; color: #EF4444">🚫</div>
        <div class="stat-body">
          <div class="stat-num danger">{{ displayStats.deleted }}</div>
          <div class="stat-label">已删除</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #FFF7ED; color: #F97316">⚠️</div>
        <div class="stat-body">
          <div class="stat-num" style="color: #F97316">{{ displayStats.blocked }}</div>
          <div class="stat-label">被拉黑</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #F0FDF4; color: #22C55E">🟢</div>
        <div class="stat-body">
          <div class="stat-num" style="color: #22C55E">{{ displayStats.active }}</div>
          <div class="stat-label">活跃客户</div>
        </div>
      </div>
    </div>

    <!-- V4.0: 自动匹配浮动入口 -->
    <div v-if="autoMatchCount > 0" class="auto-match-float" @click="goToAutoMatch">
      <el-badge :value="autoMatchCount" :max="99" type="warning">
        <el-button type="primary" plain size="small" class="match-float-btn">
          🔗 待确认匹配
        </el-button>
      </el-badge>
    </div>

    <!-- 绑定成员信息 -->
    <div v-if="boundMembers.length > 0 && !isDemoMode" class="bound-members-bar">
      <span style="color: #606266; font-size: 13px">绑定企微账户 ({{ boundMembers.length }}人)：</span>
      <el-tag v-for="m in boundMembers.slice(0, 8)" :key="m.id" size="small" type="info" style="margin: 0 4px 4px 0">
        {{ m.wecomUserName || m.crmUserName || m.wecomUserId }}
      </el-tag>
      <span v-if="boundMembers.length > 8" style="color: #909399; font-size: 12px">+{{ boundMembers.length - 8 }}人</span>
    </div>

    <!-- 同步结果反馈条 -->
    <el-alert
      v-if="syncResult"
      type="success"
      :closable="true"
      style="margin-bottom: 12px"
      @close="syncResult = null"
    >
      <template #title>
        <span>{{ syncResult.message }}</span>
      </template>
      <template #default>
        <div class="sync-result-detail">
          <span>同步成员 <strong>{{ syncResult.bindingsUsed }}</strong> 人</span>
          <template v-if="syncResult.bindingNames">
            <el-divider direction="vertical" />
            <span style="color: #606266">{{ syncResult.bindingNames }}</span>
          </template>
        </div>
      </template>
    </el-alert>

    <el-card>
      <template #header>
        <WecomHeader tab-name="customer">
          企微客户
          <template #actions>
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="query.keyword" placeholder="搜索客户名/备注/UserID/手机号" clearable style="width: 220px" @keyup.enter="handleSearch" />
            <el-select v-model="query.status" placeholder="客户状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="正常" value="normal" />
              <el-option label="已删除" value="deleted" />
              <el-option label="被拉黑" value="blocked" />
            </el-select>
            <el-select v-model="query.departmentId" placeholder="部门" clearable style="width: 140px" @change="handleDepartmentChange">
              <el-option v-for="d in departmentList" :key="d.id" :label="d.name" :value="d.id" />
            </el-select>
            <el-select v-model="query.followUserId" placeholder="企微成员" clearable filterable style="width: 150px" @change="handleSearch">
              <el-option v-for="m in filteredMembers" :key="m.userId || m.wecomUserId" :label="m.name || m.wecomUserName" :value="m.userId || m.wecomUserId" />
            </el-select>
            <el-date-picker
              v-model="dateRange"
              type="daterange"
              range-separator="至"
              start-placeholder="添加开始"
              end-placeholder="添加结束"
              value-format="YYYY-MM-DD"
              style="width: 240px"
              @change="handleSearch"
            />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="success" @click="handleSync" :loading="syncing">同步客户</el-button>
            <el-button @click="handleSyncTags" :loading="syncingTags">同步标签</el-button>
          </template>
        </WecomHeader>
      </template>

      <!-- 筛选结果反馈条 -->
      <div v-if="hasActiveFilter" class="filter-result-bar">
        <el-icon><Filter /></el-icon>
        <span>筛选结果：共 <strong>{{ displayTotal }}</strong> 条记录</span>
        <template v-if="query.keyword"><el-tag size="small" closable @close="query.keyword = ''; handleSearch()">关键词: {{ query.keyword }}</el-tag></template>
        <template v-if="query.status"><el-tag size="small" closable @close="query.status = ''; handleSearch()">状态: {{ { normal: '正常', deleted: '已删除', blocked: '被拉黑' }[query.status] || query.status }}</el-tag></template>
        <template v-if="query.departmentId"><el-tag size="small" closable @close="query.departmentId = null; handleSearch()">部门: {{ departmentList.find(d => d.id === query.departmentId)?.name || query.departmentId }}</el-tag></template>
        <template v-if="query.followUserId"><el-tag size="small" closable @close="query.followUserId = ''; handleSearch()">成员: {{ memberList.find(m => (m.userId || m.wecomUserId) === query.followUserId)?.name || query.followUserId }}</el-tag></template>
        <template v-if="query.startDate"><el-tag size="small" closable @close="dateRange = []; handleSearch()">日期: {{ query.startDate }} ~ {{ query.endDate }}</el-tag></template>
        <el-button link type="primary" size="small" @click="clearFilters">清空筛选</el-button>
      </div>

      <el-table :data="displayCustomers" v-loading="loading" stripe>
        <!-- 客户信息：备注名+昵称上下两行，不换行，溢出悬浮提示 -->
        <el-table-column label="客户信息" min-width="200">
          <template #default="{ row }">
            <div class="customer-info">
              <el-avatar :src="row.avatar" :size="40">{{ (row.remark || row.name)?.charAt(0) }}</el-avatar>
              <div class="info-text">
                <el-tooltip :content="row.remark || row.name || '-'" placement="top" :show-after="500" :disabled="!row.remark && !row.name">
                  <div class="remark-name">{{ row.remark || row.name || '-' }}</div>
                </el-tooltip>
                <el-tooltip :content="row.nickname || row.name || '-'" placement="top" :show-after="500" :disabled="!row.nickname">
                  <div class="nick-name">{{ row.nickname || row.name || '-' }}</div>
                </el-tooltip>
              </div>
            </div>
          </template>
        </el-table-column>
        <!-- 企微UserID -->
        <el-table-column label="UserID" min-width="180">
          <template #default="{ row }">
            <el-tooltip :content="row.externalUserId" placement="top" :show-after="300">
              <span class="userid-cell">{{ row.externalUserId }}</span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="跟进人" width="120">
          <template #default="{ row }">
            <el-tooltip :content="getFollowUserTooltip(row)" placement="top" :show-after="300" raw-content>
              <span style="cursor: default">
                <WwOpenData
                  v-if="isFollowUserNameMissing(row)"
                  type="userName"
                  :openid="row.followUserId"
                  :corpid="currentCorpId"
                  :fallback="getFollowUserDisplay(row)"
                />
                <template v-else>{{ getFollowUserDisplay(row) }}</template>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="添加方式" width="100">
          <template #default="{ row }">{{ getAddWayText(row.addWay) }}</template>
        </el-table-column>
        <el-table-column label="添加时间" width="160" sortable>
          <template #default="{ row }">{{ formatDate(row.addTime) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusTagType(row.status)" size="small">{{ getStatusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="标签" min-width="150">
          <template #default="{ row }">
            <template v-for="(tags, _tidx) in [parseTags(row.tagNames || row.tagIds)]" :key="_tidx">
              <template v-if="tags.length">
                <el-tag v-for="tag in tags.slice(0, 3)" :key="tag" size="small" style="margin: 0 4px 4px 0">{{ tag }}</el-tag>
                <span v-if="tags.length > 3" style="font-size: 12px; color: #909399">+{{ tags.length - 3 }}</span>
              </template>
              <span v-else>-</span>
            </template>
          </template>
        </el-table-column>
        <el-table-column label="消息统计" width="120">
          <template #default="{ row }">
            <el-tooltip :content="`客户发送: ${row.msgSentCount ?? row.chatSentCount ?? 0}条 / 员工发送: ${row.msgRecvCount ?? row.chatRecvCount ?? 0}条`" placement="top" :show-after="300">
              <span style="font-size: 12px; display: inline-flex; gap: 6px">
                <span style="color: #409eff">客<strong>{{ row.msgSentCount ?? row.chatSentCount ?? 0 }}</strong></span>
                <span style="color: #67c23a">员<strong>{{ row.msgRecvCount ?? row.chatRecvCount ?? 0 }}</strong></span>
              </span>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="活跃度" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.activityStatus === 'active'" type="success" size="small">活跃</el-tag>
            <el-tag v-else-if="row.activityStatus === 'normal'" type="warning" size="small">一般</el-tag>
            <el-tag v-else type="info" size="small">沉默</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="渠道来源" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.state" size="small" type="info" class="channel-tag">{{ row.state }}</el-tag>
            <span v-else style="color: #C0C4CC">-</span>
          </template>
        </el-table-column>
        <!-- CRM关联 -->
        <el-table-column label="CRM关联" width="160">
          <template #default="{ row }">
            <template v-if="row.crmCustomerId">
              <a class="crm-link" @click.prevent="goToCrmCustomer(row.crmCustomerId)">{{ row.crmCustomerName || '已关联' }}</a>
              <el-button link type="danger" size="small" style="margin-left: 4px" @click="handleUnlink(row)">解除</el-button>
            </template>
            <el-button v-else link type="primary" size="small" @click="openLinkDialog(row)">关联CRM客户</el-button>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="80" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" size="small" @click="openDetailDrawer(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="displayTotal"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>

    <!-- CRM客户关联弹窗 -->
    <el-dialog v-model="linkDialogVisible" title="关联CRM客户" width="560px">
      <el-form label-width="100px">
        <el-form-item label="企微客户">
          <div>
            <span style="font-weight: 600">{{ linkForm.wecomCustomerRemark }}</span>
            <span v-if="linkForm.wecomCustomerNick" style="color: #909399; margin-left: 8px">{{ linkForm.wecomCustomerNick }}</span>
          </div>
        </el-form-item>
        <el-form-item label="UserID">
          <span class="userid-cell" style="font-size: 13px">{{ linkForm.wecomExternalUserId }}</span>
        </el-form-item>
        <el-form-item label="搜索CRM客户">
          <el-select
            v-model="linkForm.crmCustomerId"
            filterable
            remote
            reserve-keyword
            placeholder="输入客户名/编码/手机号搜索"
            :remote-method="searchCrmCustomers"
            :loading="searchLoading"
            style="width: 100%"
            @change="handleCrmOptionChange"
          >
            <el-option
              v-for="item in crmCustomerOptions"
              :key="item.id"
              :label="`${item.name} (${item.code || ''}) ${item.phone ? item.phone : ''}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="linkDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="linkLoading" :disabled="!linkForm.crmCustomerId" @click="submitLink">确认关联</el-button>
      </template>
    </el-dialog>

    <!-- 企微客户详情抽屉 -->
    <CustomerDetailDrawer
      v-model="drawerVisible"
      :customer-id="selectedCustomerId"
      :demo-data="demoDetailData"
      @go-crm="goToCrmCustomer"
      @go-order="goToCreateOrder"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomCustomer' })
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  getWecomConfigs, getWecomCustomers, getWecomCustomerStats, syncWecomCustomers,
  linkWecomCustomerToCrm, unlinkWecomCustomerFromCrm, searchCrmCustomersForLink,
  syncWecomTagsToCustomers, getWecomDepartments, getWecomUsers
} from '@/api/wecom'
import { formatDateTime } from '@/utils/date'
import { Filter } from '@element-plus/icons-vue'
import CustomerDetailDrawer from './components/CustomerDetailDrawer.vue'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import WwOpenData from './components/WwOpenData.vue'
import { useWecomDemo, DEMO_CUSTOMERS, DEMO_CUSTOMER_STATS, DEMO_CUSTOMER_DETAIL, DEMO_CRM_CUSTOMER_OPTIONS, DEMO_CONFIGS } from './composables/useWecomDemo'
import { getLastSelectedConfigId, saveSelectedConfigId } from './composables/useWecomConfig'
import { getAutoMatchCount } from '@/api/wecomAddressBook'
import { getWecomBindings } from '@/api/wecom'
import { useUserStore } from '@/stores/user'

const { isDemoMode } = useWecomDemo()
const router = useRouter()
const userStore = useUserStore()

// 当前用户角色判断
const isAdminRole = computed(() => ['super_admin', 'admin'].includes(userStore.currentUser?.role || ''))
// 企微成员绑定状态（非管理员需要绑定才能查看）
const userHasBinding = ref(true) // 默认true，管理员或检查通过后才会为false
const bindingChecked = ref(false)

// V4.0: 自动匹配待确认数量
const autoMatchCount = ref(0)

const goToAutoMatch = () => {
  router.push('/wecom/address-book?tab=auto-match')
}

const loading = ref(false)
const syncing = ref(false)
const syncingTags = ref(false)
const configList = ref<any[]>([])
const customerList = ref<any[]>([])
const total = ref(0)
const stats = ref({ todayAdd: 0, totalAdd: 0, deleted: 0, blocked: 0, active: 0 })
const dateRange = ref<string[]>([])

/** 当前企微配置的 corpId */
const currentCorpId = computed(() => {
  const cfg = configList.value.find(c => c.id === query.value.configId)
  return cfg?.corpId || ''
})

/** 判断跟进人名称是否缺失（需要通过 ww-open-data 展示） */
const isFollowUserNameMissing = (row: any) => {
  if (!row.followUserId) return false
  const display = getFollowUserDisplay(row)
  return display === row.followUserId
}

/** 显示的配置选项 */
const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

/** 显示的客户列表（示例模式支持筛选） */
const displayCustomers = computed(() => {
  if (customerList.value.length > 0 || !isDemoMode.value) return customerList.value
  let list = DEMO_CUSTOMERS as any[]
  // 示例模式下应用前端筛选
  if (query.value.keyword) {
    const kw = query.value.keyword.toLowerCase()
    list = list.filter((c: any) =>
      (c.name || '').toLowerCase().includes(kw) ||
      (c.remark || '').toLowerCase().includes(kw) ||
      (c.externalUserId || '').toLowerCase().includes(kw)
    )
  }
  if (query.value.status) {
    list = list.filter((c: any) => c.status === query.value.status)
  }
  if (query.value.startDate) {
    list = list.filter((c: any) => c.addTime && c.addTime >= query.value.startDate)
  }
  if (query.value.endDate) {
    list = list.filter((c: any) => c.addTime && c.addTime <= query.value.endDate + 'T23:59:59Z')
  }
  return list
})

/** 显示的统计数据（示例模式下根据筛选结果动态计算） */
const displayStats = computed(() => {
  if (!isDemoMode.value) return stats.value
  const hasFilter = query.value.keyword || query.value.status || query.value.startDate || query.value.endDate
  if (!hasFilter) return DEMO_CUSTOMER_STATS
  const filtered = displayCustomers.value as any[]
  const today = new Date().toISOString().slice(0, 10)
  return {
    todayAdd: filtered.filter(c => c.addTime && c.addTime.startsWith(today) && c.status === 'normal').length,
    totalAdd: filtered.filter(c => c.status === 'normal').length,
    deleted: filtered.filter(c => c.status === 'deleted' || c.status === 'deleted_by_employee').length,
    blocked: filtered.filter(c => c.status === 'blocked').length,
    active: filtered.filter(c => c.activityStatus === 'active').length
  }
})

/** 显示的总数 */
const displayTotal = computed(() => {
  if (!isDemoMode.value) return total.value
  return displayCustomers.value.length
})

// 同步结果反馈
const syncResult = ref<any>(null)

const query = ref({
  configId: null as number | null,
  keyword: '',
  status: '',
  departmentId: null as number | null,
  followUserId: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 20
})

// 部门与成员筛选数据
const departmentList = ref<any[]>([])
const memberList = ref<any[]>([])
const boundMembers = ref<any[]>([])

// CRM关联弹窗
const linkDialogVisible = ref(false)
const linkLoading = ref(false)
const searchLoading = ref(false)
const crmCustomerOptions = ref<any[]>([])
const linkForm = ref({
  wecomCustomerId: 0,
  wecomCustomerRemark: '',
  wecomCustomerNick: '',
  wecomExternalUserId: '',
  crmCustomerId: '',
  crmCustomerName: ''
})

// 详情抽屉
const drawerVisible = ref(false)
const selectedCustomerId = ref<number | null>(null)
const demoDetailData = ref<any>(null)

const openDetailDrawer = (row: any) => {
  if (row._demo) {
    demoDetailData.value = DEMO_CUSTOMER_DETAIL[row.id] || null
  } else {
    demoDetailData.value = null
  }
  selectedCustomerId.value = row.id
  drawerVisible.value = true
}

/** 跳转CRM客户详情页 */
const goToCrmCustomer = (crmId: string) => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权后可跳转真实客户详情')
    return
  }
  router.push(`/customer/detail/${crmId}`)
}

/** 跳转下单页 */
const goToCreateOrder = (crmId: string) => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权后可跳转下单')
    return
  }
  router.push(`/order/add?customerId=${crmId}`)
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

/** 状态标签类型 */
const getStatusTagType = (status: string) => {
  const map: Record<string, string> = { normal: 'success', deleted: 'danger', blocked: 'warning', deleted_by_employee: 'danger' }
  return (map[status] || 'info') as any
}

const getStatusLabel = (status: string) => {
  const map: Record<string, string> = { normal: '正常', deleted: '已删除', blocked: '被拉黑', deleted_by_employee: '员工删除' }
  return map[status] || status || '未知'
}

const parseTags = (tagIds: any): string[] => {
  if (!tagIds) return []
  try {
    const parsed = typeof tagIds === 'string' ? JSON.parse(tagIds) : tagIds
    return Array.isArray(parsed) ? parsed : []
  } catch { return [] }
}

const getAddWayText = (way: number) => {
  const map: Record<number, string> = {
    0: '未知', 1: '扫码', 2: '搜索手机号', 3: '名片分享', 4: '群聊', 5: '手机通讯录',
    6: '微信联系人', 7: '来自微信', 8: '安装第三方应用', 9: '搜索邮箱', 10: '视频号添加',
    11: '通过日程参与人', 12: '通过会议参与人', 13: '添加微信好友', 14: '通过智慧硬件',
    201: '内部成员共享', 202: '管理员/负责人分配'
  }
  return map[way] || '其他'
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    const configs = Array.isArray(res) ? res : []
    configList.value = configs.filter((c: any) => c.isEnabled)
    // 默认选择：优先读取上次选择，否则选第一个
    if (!query.value.configId && configList.value.length > 0) {
      const lastId = getLastSelectedConfigId()
      if (lastId && configList.value.find((c: any) => c.id === lastId)) {
        query.value.configId = lastId
      } else {
        query.value.configId = configList.value[0].id
      }
      fetchDepartmentsAndMembers()
      fetchList()
      fetchStats()
    }
  } catch (e) {
    console.error('[WecomCustomer] Fetch configs error:', e)
  }
}

/** 切换企微配置时保存选择并刷新部门/成员列表 */
const handleConfigChange = () => {
  if (query.value.configId) {
    saveSelectedConfigId(query.value.configId)
  }
  query.value.departmentId = null
  query.value.followUserId = ''
  fetchDepartmentsAndMembers()
  handleSearch()
}

/** 获取部门和成员列表 + 绑定成员 */
const fetchDepartmentsAndMembers = async () => {
  if (!query.value.configId) {
    departmentList.value = []
    memberList.value = []
    boundMembers.value = []
    return
  }
  try {
    const [deptRes, userRes, bindRes] = await Promise.all([
      getWecomDepartments(query.value.configId),
      getWecomUsers(query.value.configId),
      getWecomBindings({ configId: query.value.configId }).catch(() => [])
    ])
    departmentList.value = Array.isArray(deptRes) ? deptRes : (deptRes as any)?.data || []
    memberList.value = Array.isArray(userRes) ? userRes : (userRes as any)?.data || []
    const bindings = Array.isArray(bindRes) ? bindRes : (bindRes as any)?.data || []
    boundMembers.value = bindings.filter((b: any) => b.isEnabled !== false)
  } catch (e) {
    console.error('[WecomCustomer] Fetch departments/members error:', e)
    departmentList.value = []
    memberList.value = []
    boundMembers.value = []
  }
}

/** 切换部门时筛选成员列表 */
const handleDepartmentChange = () => {
  query.value.followUserId = ''
  handleSearch()
}

/** 当前部门下的成员（筛选用） */
const filteredMembers = computed(() => {
  if (!query.value.departmentId) return memberList.value
  return memberList.value.filter((m: any) => {
    const deptIds = m.departmentIds || m.department || []
    if (Array.isArray(deptIds)) return deptIds.includes(query.value.departmentId)
    return String(deptIds).includes(String(query.value.departmentId))
  })
})

const fetchList = async () => {
  if (isDemoMode.value) return
  loading.value = true
  try {
    const res: any = await getWecomCustomers({
      ...query.value,
      startDate: query.value.startDate || undefined,
      endDate: query.value.endDate || undefined
    } as any)
    if (res?.list) {
      customerList.value = res.list
      total.value = res.total || 0
    } else {
      customerList.value = []
      total.value = 0
    }
  } catch (e) {
    console.error('[WecomCustomer] Fetch list error:', e)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  if (isDemoMode.value) return
  try {
    const res: any = await getWecomCustomerStats({
      configId: query.value.configId || undefined,
      startDate: query.value.startDate || undefined,
      endDate: query.value.endDate || undefined
    })
    stats.value = res || { todayAdd: 0, totalAdd: 0, deleted: 0, dealt: 0, yesterdayAdd: 0 }
  } catch (e) {
    console.error('[WecomCustomer] Fetch stats error:', e)
  }
}

const handleSearch = () => {
  if (dateRange.value?.length === 2) {
    query.value.startDate = dateRange.value[0]
    query.value.endDate = dateRange.value[1]
  } else {
    query.value.startDate = ''
    query.value.endDate = ''
  }
  query.value.page = 1
  fetchList()
  fetchStats()
}

/** 是否有活跃的筛选条件 */
const hasActiveFilter = computed(() => {
  return !!(query.value.keyword || query.value.status || query.value.startDate || query.value.endDate || query.value.departmentId || query.value.followUserId)
})

/** 清空所有筛选条件 */
const clearFilters = () => {
  query.value.keyword = ''
  query.value.status = ''
  query.value.departmentId = null
  query.value.followUserId = ''
  query.value.startDate = ''
  query.value.endDate = ''
  dateRange.value = []
  handleSearch()
}

/** 获取跟进人显示名（企微成员姓名） */
const getFollowUserDisplay = (row: any) => {
  // 优先返回后端已解析的名称
  if (row.followUserName && row.followUserName !== row.followUserId) return row.followUserName
  // 从本地成员列表匹配
  if (row.followUserId && memberList.value.length > 0) {
    const member = memberList.value.find((m: any) => m.userId === row.followUserId || m.wecomUserId === row.followUserId)
    if (member) return member.name || member.wecomUserName || row.followUserId
  }
  return row.followUserName || row.followUserId || '-'
}

/** 获取跟进人tooltip内容 */
const getFollowUserTooltip = (row: any) => {
  const wecomName = getFollowUserDisplay(row)
  const crmName = row.crmFollowUserName || row.crmUserName || ''
  let tip = `企微跟进人：${wecomName}`
  if (crmName) tip += `<br>CRM跟进人：${crmName}`
  return tip
}

const handleSync = async () => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权企微后可同步真实客户数据')
    return
  }
  if (!query.value.configId) {
    ElMessage.warning('请先选择企微配置')
    return
  }
  syncing.value = true
  try {
    const res: any = await syncWecomCustomers(query.value.configId)
    const data = res?.data || res
    const message = data?.message || res?.message || '同步任务已启动'
    ElMessage.success(message)
    syncResult.value = {
      message,
      bindingsUsed: data?.bindingsUsed || 0,
      bindingNames: data?.bindingNames || ''
    }
    fetchList()
    fetchStats()
    startSyncPolling()
  } catch (e: any) {
    const errMsg = e?.response?.data?.message || e?.message || '同步失败'
    if (e?.code === 'ECONNABORTED' || errMsg.includes('timeout')) {
      ElMessage.error('同步超时：客户数量较多，请稍后刷新页面查看同步结果')
    } else if (!e?.response && e?.request) {
      ElMessage.error('同步请求超时或网络异常，请检查后端服务是否正常运行，稍后重试')
    } else {
      ElMessage.error(errMsg)
    }
  } finally {
    syncing.value = false
  }
}

let syncPollTimer: ReturnType<typeof setInterval> | null = null
const startSyncPolling = () => {
  if (syncPollTimer) clearInterval(syncPollTimer)
  let pollCount = 0
  syncPollTimer = setInterval(() => {
    pollCount++
    fetchList()
    fetchStats()
    if (pollCount >= 6) {
      if (syncPollTimer) clearInterval(syncPollTimer)
      syncPollTimer = null
      syncing.value = false
    }
  }, 5000)
}


const handleSyncTags = async () => {
  if (isDemoMode.value) {
    ElMessage.info('示例模式：授权企微后可同步标签')
    return
  }
  if (!query.value.configId) {
    ElMessage.warning('请先选择企微配置')
    return
  }
  syncingTags.value = true
  try {
    const res: any = await syncWecomTagsToCustomers(query.value.configId)
    ElMessage.success(res?.message || '标签同步成功')
    fetchList()
  } catch (e: any) {
    ElMessage.error(e.message || '标签同步失败')
  } finally {
    syncingTags.value = false
  }
}

// CRM关联相关
const openLinkDialog = (row: any) => {
  linkForm.value = {
    wecomCustomerId: row.id,
    wecomCustomerRemark: row.remark || row.name || '-',
    wecomCustomerNick: row.nickname || row.name || '',
    wecomExternalUserId: row.externalUserId || '-',
    crmCustomerId: '',
    crmCustomerName: ''
  }
  crmCustomerOptions.value = []
  linkDialogVisible.value = true
  // 预加载客户列表（空关键词返回最近10个）
  searchCrmCustomers('')
}

const handleCrmOptionChange = (val: string) => {
  const opt = crmCustomerOptions.value.find(o => o.id === val)
  if (opt) linkForm.value.crmCustomerName = opt.name
}

const searchCrmCustomers = async (keyword: string) => {
  if (isDemoMode.value) {
    if (!keyword) {
      crmCustomerOptions.value = DEMO_CRM_CUSTOMER_OPTIONS.slice(0, 10)
      return
    }
    crmCustomerOptions.value = DEMO_CRM_CUSTOMER_OPTIONS.filter(c =>
      c.name.includes(keyword) || c.phone.includes(keyword) || (c as any).code?.includes(keyword)
    )
    return
  }
  searchLoading.value = true
  try {
    const res = await searchCrmCustomersForLink(keyword || '')
    crmCustomerOptions.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('[WecomCustomer] Search CRM customers error:', e)
    crmCustomerOptions.value = []
  } finally {
    searchLoading.value = false
  }
}

const submitLink = async () => {
  if (isDemoMode.value) {
    // 示例模式模拟关联
    const cust = displayCustomers.value.find((c: any) => c.id === linkForm.value.wecomCustomerId)
    if (cust) {
      cust.crmCustomerId = linkForm.value.crmCustomerId
      cust.crmCustomerName = linkForm.value.crmCustomerName
    }
    ElMessage.success('关联成功（示例模式）')
    linkDialogVisible.value = false
    return
  }
  linkLoading.value = true
  try {
    const res: any = await linkWecomCustomerToCrm(linkForm.value.wecomCustomerId, linkForm.value.crmCustomerId)
    ElMessage.success(res?.message || '关联成功')
    linkDialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e?.message || '关联失败')
  } finally {
    linkLoading.value = false
  }
}

const handleUnlink = async (row: any) => {
  if (isDemoMode.value) {
    row.crmCustomerId = ''
    row.crmCustomerName = ''
    ElMessage.success('已解除关联（示例模式）')
    return
  }
  try {
    await ElMessageBox.confirm(`确定解除企微客户「${row.remark || row.name}」与CRM客户的关联？`, '提示', { type: 'warning' })
    await unlinkWecomCustomerFromCrm(row.id)
    ElMessage.success('已解除关联')
    fetchList()
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '操作失败')
  }
}

// 检查当前用户是否已绑定企微成员
const checkUserBinding = async () => {
  if (isAdminRole.value) {
    userHasBinding.value = true
    bindingChecked.value = true
    return
  }
  try {
    const crmUserId = userStore.currentUser?.id
    if (!crmUserId) {
      userHasBinding.value = false
      bindingChecked.value = true
      return
    }
    const res = await getWecomBindings({ crmUserId: String(crmUserId) })
    const bindings = res?.data?.data || res?.data || []
    userHasBinding.value = Array.isArray(bindings) && bindings.length > 0
  } catch {
    userHasBinding.value = false
  }
  bindingChecked.value = true
}

onMounted(() => {
  checkUserBinding()
  fetchConfigs()
  // fetchList 和 fetchStats 会在 fetchConfigs 成功后自动调用（默认选中配置后触发）
  // V4.0: 获取自动匹配待确认数量
  getAutoMatchCount().then((res: any) => {
    autoMatchCount.value = res?.pendingCount || 0
  }).catch(() => {})
})

onUnmounted(() => {
  if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
})
</script>

<style scoped lang="scss">
.wecom-customer { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }

/* V4 统计卡片增强 */
.v4-stat-card {
  display: flex; align-items: center; gap: 16px;
}
.v4-stat-card .stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.v4-stat-card .stat-body { flex: 1; }
.v4-stat-card .stat-num { font-size: 26px; font-weight: 700; line-height: 1.2; }
.v4-stat-card .stat-num.primary { color: #4C6EF5; }
.v4-stat-card .stat-num.success { color: #10B981; }
.v4-stat-card .stat-num.warning { color: #F59E0B; }
.v4-stat-card .stat-num.danger { color: #EF4444; }
.v4-stat-card .stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.v4-stat-card .stat-trend { font-size: 11px; margin-top: 2px; }
.v4-stat-card .stat-trend.up { color: #10B981; }
.v4-stat-card .stat-trend.down { color: #EF4444; }

.customer-info { display: flex; align-items: center; gap: 10px; }
.info-text { overflow: hidden; }
.info-text .remark-name { font-weight: 600; font-size: 14px; color: #1F2937; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.info-text .nick-name { font-size: 12px; color: #9CA3AF; line-height: 1.4; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.userid-cell {
  font-family: 'SF Mono', 'Menlo', 'Consolas', monospace;
  font-size: 12px; color: #6B7280;
  max-width: 160px; display: inline-block;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.crm-link {
  color: #4C6EF5; cursor: pointer; font-weight: 500; font-size: 13px;
  text-decoration: none;
  &:hover { text-decoration: underline; }
}
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
.filter-result-bar {
  display: flex; align-items: center; gap: 8px; padding: 8px 12px; margin-bottom: 12px;
  background: #EEF2FF; border-radius: 8px; font-size: 13px; color: #4C6EF5;
  strong { color: #1F2937; }
}
.bound-members-bar { display: flex; align-items: center; flex-wrap: wrap; padding: 8px 12px; background: #F0F9FF; border-radius: 8px; margin-bottom: 12px; gap: 4px; }
.sync-result-detail { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 13px; color: #4B5563; margin-top: 4px; }
.sync-result-detail strong { color: #4C6EF5; }
.auto-match-float {
  position: fixed; bottom: 80px; right: 40px; z-index: 100; cursor: pointer;
}
.match-float-btn { box-shadow: 0 4px 12px rgba(76, 110, 245, 0.3); border-radius: 20px; }
.channel-tag { background: #FDF2F8; color: #BE185D; border: none; border-radius: 6px; }
</style>
