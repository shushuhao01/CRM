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

    <!-- V4统计卡片 -->
    <div class="v4-stats-row">
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #EEF2FF; color: #4C6EF5">📈</div>
        <div class="stat-body">
          <div class="stat-num primary">{{ displayStats.todayAdd }}</div>
          <div class="stat-label">今日进粉</div>
          <div class="stat-trend" v-if="displayStats.yesterdayAdd !== undefined">{{ displayStats.todayAdd >= displayStats.yesterdayAdd ? '↑' : '↓' }} 较昨日{{ displayStats.yesterdayAdd }}</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #ECFDF5; color: #10B981">👥</div>
        <div class="stat-body">
          <div class="stat-num success">{{ displayStats.totalAdd }}</div>
          <div class="stat-label">累计进粉</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #FEF2F2; color: #EF4444">🚫</div>
        <div class="stat-body">
          <div class="stat-num danger">{{ displayStats.deleted }}</div>
          <div class="stat-label">删除客户</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #FFFBEB; color: #F59E0B">🎯</div>
        <div class="stat-body">
          <div class="stat-num warning">{{ displayStats.dealt }}</div>
          <div class="stat-label">成交客户</div>
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

    <!-- 同步结果反馈条 -->
    <el-alert
      v-if="syncResult"
      :type="syncResult.quotaRemaining < 100 ? 'warning' : 'success'"
      :closable="true"
      style="margin-bottom: 16px"
      @close="syncResult = null"
    >
      <template #title>
        <span>上次同步：{{ syncResult.message }}</span>
      </template>
      <template #default>
        <div class="sync-result-detail">
          <span>已同步 <strong>{{ syncResult.syncCount }}</strong> 个客户</span>
          <el-divider direction="vertical" />
          <span>客户总量 <strong>{{ syncResult.totalCustomers }}</strong> / {{ syncResult.customerLimit }}</span>
          <el-divider direction="vertical" />
          <span>剩余配额 <strong>{{ syncResult.quotaRemaining }}</strong></span>
          <el-divider direction="vertical" />
          <span>绑定成员 <strong>{{ syncResult.bindingsUsed }}</strong> 人</span>
          <el-divider direction="vertical" />
          <span v-if="syncCooldown > 0" style="color: #e6a23c">
            ⏳ 自动同步冷却中（{{ syncCooldown }}分钟后）
          </span>
          <span v-else style="color: #67c23a">✅ 可再次同步</span>
        </div>
      </template>
    </el-alert>

    <el-card>
      <template #header>
        <WecomHeader tab-name="customer">
          企微客户
          <template #actions>
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleSearch">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="query.keyword" placeholder="搜索客户名/备注/UserID" clearable style="width: 220px" @keyup.enter="handleSearch" />
            <el-select v-model="query.status" placeholder="客户状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="正常" value="normal" />
              <el-option label="已删除" value="deleted" />
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
        <template v-if="query.status"><el-tag size="small" closable @close="query.status = ''; handleSearch()">状态: {{ query.status === 'normal' ? '正常' : '已删除' }}</el-tag></template>
        <template v-if="query.startDate"><el-tag size="small" closable @close="dateRange = []; handleSearch()">日期: {{ query.startDate }} ~ {{ query.endDate }}</el-tag></template>
        <el-button link type="primary" size="small" @click="clearFilters">清空筛选</el-button>
      </div>

      <el-table :data="displayCustomers" v-loading="loading" stripe>
        <!-- 客户信息：备注名(粗体)+昵称(灰色) -->
        <el-table-column label="客户信息" min-width="200">
          <template #default="{ row }">
            <div class="customer-info">
              <el-avatar :src="row.avatar" :size="40">{{ (row.remark || row.name)?.charAt(0) }}</el-avatar>
              <div class="info-text">
                <div class="remark-name">{{ row.remark || row.name || '-' }}</div>
                <div class="nick-name">{{ row.nickname || row.name || '-' }}</div>
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
        <el-table-column prop="followUserName" label="跟进人" width="90" />
        <el-table-column label="添加方式" width="100">
          <template #default="{ row }">{{ getAddWayText(row.addWay) }}</template>
        </el-table-column>
        <el-table-column label="添加时间" width="160" sortable>
          <template #default="{ row }">{{ formatDate(row.addTime) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'normal' ? 'success' : 'danger'" size="small">{{ row.status === 'normal' ? '正常' : '已删除' }}</el-tag>
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
        <!-- V4.0: 渠道来源列 -->
        <el-table-column label="渠道来源" width="110">
          <template #default="{ row }">
            <el-tag v-if="row.state" size="small" type="info" class="channel-tag">{{ row.state }}</el-tag>
            <span v-else style="color: #C0C4CC">-</span>
          </template>
        </el-table-column>
        <!-- CRM关联：显示客户名(超链接) -->
        <el-table-column label="CRM关联" width="160">
          <template #default="{ row }">
            <template v-if="row.crmCustomerId">
              <a class="crm-link" @click.prevent="goToCrmCustomer(row.crmCustomerId)">{{ row.crmCustomerName || '已关联' }}</a>
              <el-button link type="danger" size="small" style="margin-left: 4px" @click="handleUnlink(row)">解除</el-button>
            </template>
            <el-button v-else link type="primary" size="small" @click="openLinkDialog(row)">关联CRM客户</el-button>
          </template>
        </el-table-column>
        <el-table-column label="活跃度" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.activeDays7d >= 5" type="success" size="small">活跃</el-tag>
            <el-tag v-else-if="row.activeDays7d >= 2" type="warning" size="small">一般</el-tag>
            <el-tag v-else type="info" size="small">沉默</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息统计" width="110">
          <template #default="{ row }">
            <span style="font-size: 12px">
              发 <strong>{{ row.msgSentCount || 0 }}</strong> /
              收 <strong>{{ row.msgRecvCount || 0 }}</strong>
            </span>
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
  syncWecomTagsToCustomers
} from '@/api/wecom'
import { formatDateTime } from '@/utils/date'
import { Filter } from '@element-plus/icons-vue'
import CustomerDetailDrawer from './components/CustomerDetailDrawer.vue'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import { useWecomDemo, DEMO_CUSTOMERS, DEMO_CUSTOMER_STATS, DEMO_CUSTOMER_DETAIL, DEMO_CRM_CUSTOMER_OPTIONS, DEMO_CONFIGS } from './composables/useWecomDemo'
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
const stats = ref({ todayAdd: 0, totalAdd: 0, deleted: 0, dealt: 0 })
const dateRange = ref<string[]>([])

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
  // 是否有任何筛选条件
  const hasFilter = query.value.keyword || query.value.status || query.value.startDate || query.value.endDate
  if (!hasFilter) return DEMO_CUSTOMER_STATS
  // 有筛选条件时，根据 displayCustomers 动态计算统计
  const filtered = displayCustomers.value as any[]
  const today = new Date().toISOString().slice(0, 10)
  return {
    todayAdd: filtered.filter(c => c.addTime && c.addTime.startsWith(today) && c.status === 'normal').length,
    totalAdd: filtered.filter(c => c.status === 'normal').length,
    deleted: filtered.filter(c => c.status === 'deleted').length,
    dealt: filtered.filter(c => c.isDealt).length
  }
})

/** 显示的总数 */
const displayTotal = computed(() => {
  if (!isDemoMode.value) return total.value
  return displayCustomers.value.length
})

// 同步结果反馈
const syncResult = ref<any>(null)
const syncCooldown = ref(0)
let cooldownTimer: ReturnType<typeof setInterval> | null = null

const query = ref({
  configId: null as number | null,
  keyword: '',
  status: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 20
})

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
  } catch (e) {
    console.error('[WecomCustomer] Fetch configs error:', e)
  }
}

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
    stats.value = res || { todayAdd: 0, totalAdd: 0, deleted: 0, dealt: 0 }
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
  return !!(query.value.keyword || query.value.status || query.value.startDate || query.value.endDate)
})

/** 清空所有筛选条件 */
const clearFilters = () => {
  query.value.keyword = ''
  query.value.status = ''
  query.value.startDate = ''
  query.value.endDate = ''
  dateRange.value = []
  handleSearch()
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
    const message = res?.message || '同步成功'
    ElMessage.success(message)
    syncResult.value = {
      message,
      syncCount: res?.syncCount || 0,
      totalCustomers: res?.totalCustomers || 0,
      customerLimit: res?.customerLimit || 5000,
      quotaRemaining: res?.quotaRemaining ?? 5000,
      bindingsUsed: res?.bindingsUsed || 0,
      cooldownMinutes: res?.cooldownMinutes || 60
    }
    startCooldownTimer(syncResult.value.cooldownMinutes)
    fetchList()
    fetchStats()
  } catch (e: any) {
    ElMessage.error(e.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

const startCooldownTimer = (minutes: number) => {
  syncCooldown.value = minutes
  if (cooldownTimer) clearInterval(cooldownTimer)
  cooldownTimer = setInterval(() => {
    syncCooldown.value--
    if (syncCooldown.value <= 0) {
      syncCooldown.value = 0
      if (cooldownTimer) { clearInterval(cooldownTimer); cooldownTimer = null }
    }
  }, 60000)
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
}

const handleCrmOptionChange = (val: string) => {
  const opt = crmCustomerOptions.value.find(o => o.id === val)
  if (opt) linkForm.value.crmCustomerName = opt.name
}

const searchCrmCustomers = async (keyword: string) => {
  if (!keyword || keyword.length < 1) {
    crmCustomerOptions.value = []
    return
  }
  if (isDemoMode.value) {
    crmCustomerOptions.value = DEMO_CRM_CUSTOMER_OPTIONS.filter(c =>
      c.name.includes(keyword) || c.phone.includes(keyword) || (c as any).code?.includes(keyword)
    )
    return
  }
  searchLoading.value = true
  try {
    const res = await searchCrmCustomersForLink(keyword)
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
  fetchList()
  fetchStats()
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
.info-text .remark-name { font-weight: 600; font-size: 14px; color: #1F2937; line-height: 1.3; }
.info-text .nick-name { font-size: 12px; color: #9CA3AF; line-height: 1.3; }
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
.sync-result-detail { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; font-size: 13px; color: #4B5563; margin-top: 4px; }
.sync-result-detail strong { color: #4C6EF5; }
.auto-match-float {
  position: fixed; bottom: 80px; right: 40px; z-index: 100; cursor: pointer;
}
.match-float-btn { box-shadow: 0 4px 12px rgba(76, 110, 245, 0.3); border-radius: 20px; }
.channel-tag { background: #FDF2F8; color: #BE185D; border: none; border-radius: 6px; }
</style>
