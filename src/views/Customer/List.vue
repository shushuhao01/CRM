<template>
  <div class="customer-list">

    <!-- 第一行：统计汇总卡片 -->
    <div class="summary-cards-row">
      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.totalCustomers }}</div>
            <div class="card-label">总客户数</div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon active">
            <el-icon><UserFilled /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.activeCustomers }}</div>
            <div class="card-label">活跃客户</div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon new">
            <el-icon><Plus /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.newCustomers }}</div>
            <div class="card-label">新增客户</div>
          </div>
        </div>
      </el-card>

      <el-card class="summary-card">
        <div class="card-content">
          <div class="card-icon high-value">
            <el-icon><Star /></el-icon>
          </div>
          <div class="card-info">
            <div class="card-value">{{ summaryData.highValueCustomers }}</div>
            <div class="card-label">高价值客户</div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 第二行：快捷筛选 -->
    <div class="quick-filters-row">
      <div class="quick-filter-buttons">
        <el-button
          v-for="filter in quickFilterOptions"
          :key="filter.value"
          :type="quickFilter === filter.value ? 'primary' : ''"
          :plain="quickFilter !== filter.value"
          round
          size="small"
          @click="handleQuickFilterChange(filter.value)"
        >
          {{ filter.label }}
        </el-button>
      </div>
    </div>

    <!-- 第三行：搜索筛选器 -->
    <el-card class="search-card" shadow="never">
      <el-form :model="searchForm" label-width="80px" class="search-form">
        <el-row :gutter="20">
          <el-col :span="6">
            <el-form-item label="关键词">
              <el-input
                v-model="searchForm.keyword"
                placeholder="客户姓名、电话或编码"
                clearable
                @keyup.enter="handleSearch"
              />
            </el-form-item>
          </el-col>
          <el-col :span="6">
            <el-form-item label="选择日期">
              <el-date-picker
                v-model="searchForm.dateRange"
                type="daterange"
                range-separator="至"
                start-placeholder="开始日期"
                end-placeholder="结束日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户等级">
              <el-select v-model="searchForm.level" placeholder="请选择" clearable style="width: 100%">
                <el-option label="普通" value="normal" />
                <el-option label="白银" value="silver" />
                <el-option label="黄金" value="gold" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户状态">
              <el-select v-model="searchForm.status" placeholder="请选择" clearable style="width: 100%">
                <el-option label="活跃" value="active" />
                <el-option label="非活跃" value="inactive" />
                <el-option label="潜在客户" value="potential" />
                <el-option label="流失客户" value="lost" />
                <el-option label="黑名单" value="blacklist" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="4">
            <el-form-item label="客户来源">
              <el-select v-model="searchForm.source" placeholder="请选择" clearable style="width: 100%">
                <el-option label="线上推广" value="online" />
                <el-option label="线下活动" value="offline" />
                <el-option label="客户推荐" value="referral" />
                <el-option label="电话营销" value="telemarketing" />
                <el-option label="其他" value="other" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="24">
            <el-form-item>
              <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
              <el-button @click="handleReset" :icon="Refresh">重置</el-button>
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>
    </el-card>

    <!-- 第四行：客户列表 -->
    <DynamicTable
      :data="customerList"
      :columns="tableColumns"
      storage-key="customer-list-columns"
      title="客户列表"
      :loading="loading"
      :show-selection="true"
      :show-actions="true"
      :pagination="{
        currentPage: pagination.page,
        pageSize: pagination.size,
        total: pagination.total
      }"
      :page-sizes="[10, 20, 50, 100]"
      @selection-change="handleSelectionChange"
      @size-change="handleSizeChange"
      @current-change="handleCurrentChange"
      class="customer-table"
    >
      <!-- 头部操作区 -->
      <template #header-actions>
        <el-button
          type="primary"
          @click="handleAdd"
          v-if="canAddCustomer"
        >
          <el-icon><Plus /></el-icon>
          新建客户
        </el-button>
        <el-button
          type="success"
          @click="handleBatchExport"
          v-if="canExport"
        >
          <el-icon><Download /></el-icon>
          批量导出
        </el-button>
        <el-button
          type="warning"
          @click="handleSelectedExport"
          :disabled="selectedCustomers.length === 0"
          v-if="canExport && selectedCustomers.length > 0"
        >
          <el-icon><Download /></el-icon>
          导出选中 ({{ selectedCustomers.length }})
        </el-button>
        <el-button
          v-if="canManageExport"
          @click="showExportSettings"
          class="export-settings-btn"
          title="导出权限设置"
        >
          <el-icon><Setting /></el-icon>
        </el-button>
        <el-button @click="handleRefresh" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </template>

      <!-- 客户编码列 -->
      <template #column-code="{ row }">
        <el-button
          type="text"
          @click="handleView(row)"
          class="code-link"
        >
          {{ row.code || 'N/A' }}
        </el-button>
      </template>

      <!-- 客户姓名列 -->
      <template #column-name="{ row }">
        <el-button
          type="text"
          @click="handleView(row)"
          class="name-link"
        >
          {{ row.name }}
        </el-button>
      </template>

      <!-- 手机号列 -->
      <template #column-phone="{ row }">
        <el-button
          type="text"
          @click="handleView(row)"
          class="phone-link"
        >
          {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}
        </el-button>
      </template>

      <!-- 客户等级列 -->
      <template #column-level="{ row }">
        <el-tag :type="getLevelType(row.level)">{{ getLevelText(row.level) }}</el-tag>
      </template>

      <!-- 分配来源列 -->
      <template #column-allocationSource="{ row }">
        <span v-if="isAllocatedCustomer(row)" class="allocated">分配</span>
        <span v-else class="self-created">自建</span>
      </template>

      <!-- 客户状态列 -->
      <template #column-status="{ row }">
        <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
      </template>

      <!-- 创建人列 -->
      <template #column-salesPerson="{ row }">
        {{ getCreatorName(row.createdBy) }}
      </template>

      <!-- 分享状态列 -->
      <template #column-shareStatus="{ row }">
        <div v-if="row.shareInfo && row.shareInfo.status === 'active'">
          <el-tag :type="getShareStatusType(row.shareInfo)" size="small">
            {{ row.shareInfo.expireTime ? '限时分享' : '永久分享' }}
          </el-tag>
          <div v-if="row.shareInfo.expireTime" class="expire-time">
            <el-text size="small" type="info">
              剩余: {{ formatRemainingTime(row.shareInfo.expireTime) }}
            </el-text>
          </div>
        </div>
        <el-text v-else size="small" type="info">未分享</el-text>
      </template>

      <!-- 操作列 -->
       <template #table-actions="{ row }">
         <el-button type="text" size="small" @click="handleView(row)">详情</el-button>
         <el-button type="text" size="small" @click="handleOrder(row)">下单</el-button>
         <el-button type="text" size="small" @click="handleCall(row)">外呼</el-button>
         <el-button type="text" size="small" @click="handleShare(row)" v-if="userStore.isAdmin">分享</el-button>
       </template>
      </DynamicTable>

    <!-- 分享客户弹窗 -->
    <el-dialog
      v-model="showShareDialog"
      title="分享客户"
      width="500px"
      :close-on-click-modal="false"
    >
      <div v-if="currentShareCustomer" class="share-dialog-content">
        <!-- 客户信息 -->
        <div class="customer-info">
          <h4>客户信息</h4>
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="客户姓名">{{ currentShareCustomer.name }}</el-descriptions-item>
            <el-descriptions-item label="联系电话">{{ displaySensitiveInfoNew(currentShareCustomer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || '') }}</el-descriptions-item>
            <el-descriptions-item label="客户等级">
              <el-tag :type="getLevelType(currentShareCustomer.level)" size="small">
                {{ getLevelText(currentShareCustomer.level) }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="当前归属">{{ getSalesPersonName(currentShareCustomer.salesPersonId) }}</el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 分享设置 -->
        <div class="share-settings">
          <h4>分享设置</h4>
          <el-form :model="shareForm" label-width="100px">
            <el-form-item label="分享给" required>
              <el-select
                v-model="shareForm.targetUserId"
                placeholder="请输入姓名或选择销售人员"
                style="width: 100%"
                filterable
                clearable
                :filter-method="filterUsers"
              >
                <el-option
                  v-for="user in filteredSalesUsers"
                  :key="user.id"
                  :label="`${user.name} - ${user.department || '未分配部门'} (${getRoleText(user.role)})`"
                  :value="user.id"
                >
                  <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>{{ user.name }}</span>
                    <span style="color: #8492a6; font-size: 12px;">
                      {{ user.department || '未分配部门' }} | {{ getRoleText(user.role) }}
                    </span>
                  </div>
                </el-option>
              </el-select>
              <div class="user-select-tip" style="margin-top: 5px;">
                <el-text size="small" type="info">
                  共 {{ filteredSalesUsers.length }} 个可选用户
                </el-text>
              </div>
            </el-form-item>

            <el-form-item label="时间限制" required>
              <el-select v-model="shareForm.timeLimit" style="width: 100%">
                <el-option
                  v-for="option in timeLimitOptions"
                  :key="option.value"
                  :label="option.label"
                  :value="option.value"
                />
              </el-select>
              <div class="time-limit-tip">
                <el-text size="small" type="info">
                  {{ shareForm.timeLimit === 0 ? '永久分享，不会自动回收' : `${shareForm.timeLimit}天后自动回收到原归属人` }}
                </el-text>
              </div>
            </el-form-item>

            <el-form-item label="分享备注">
              <el-input
                v-model="shareForm.remark"
                type="textarea"
                :rows="3"
                placeholder="请输入分享原因或备注信息（可选）"
                maxlength="200"
                show-word-limit
              />
            </el-form-item>
          </el-form>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showShareDialog = false">取消</el-button>
          <el-button type="primary" @click="confirmShare" :loading="loading">
            确认分享
          </el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 导出权限设置对话框 -->
    <el-dialog
      v-model="exportSettingsVisible"
      title="客户导出权限设置"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form
        ref="exportFormRef"
        :model="exportFormData"
        label-width="140px"
      >
        <el-form-item label="启用导出功能">
          <el-switch
            v-model="exportFormData.enabled"
            active-text="启用"
            inactive-text="禁用"
          />
          <div class="form-item-tip">
            关闭后，所有成员将无法使用客户导出功能
          </div>
        </el-form-item>

        <el-form-item label="权限控制方式" v-if="exportFormData.enabled">
          <el-radio-group v-model="exportFormData.permissionType">
            <el-radio label="all">所有人可用</el-radio>
            <el-radio label="role">按角色控制</el-radio>
            <el-radio label="whitelist">白名单控制</el-radio>
          </el-radio-group>
          <div class="form-item-tip">
            选择导出功能的权限控制方式
          </div>
        </el-form-item>

        <el-form-item label="允许的角色" v-if="exportFormData.enabled && exportFormData.permissionType === 'role'">
          <el-checkbox-group v-model="exportFormData.allowedRoles">
            <el-checkbox label="super_admin">超级管理员</el-checkbox>
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="department_manager">部门经理</el-checkbox>
            <el-checkbox label="sales_staff">销售人员</el-checkbox>
            <el-checkbox label="customer_service">客服人员</el-checkbox>
          </el-checkbox-group>
          <div class="form-item-tip">
            选择允许使用导出功能的角色
          </div>
        </el-form-item>

        <el-form-item label="白名单成员" v-if="exportFormData.enabled && exportFormData.permissionType === 'whitelist'">
          <el-select
            v-model="exportFormData.whitelist"
            multiple
            filterable
            placeholder="选择允许导出的成员"
            style="width: 100%;"
          >
            <el-option
              v-for="user in allUsers"
              :key="user.id"
              :label="`${user.name} (${user.id})`"
              :value="user.id"
            />
          </el-select>
          <div class="form-item-tip">
            只有白名单中的成员可以使用导出功能，其他人看不到导出按钮
          </div>
        </el-form-item>

        <el-form-item label="导出限制" v-if="exportFormData.enabled">
          <el-input-number
            v-model="exportFormData.dailyLimit"
            :min="0"
            :max="100"
            placeholder="每日导出次数限制"
          />
          <span style="margin-left: 10px;">次/天（0表示不限制）</span>
          <div class="form-item-tip">
            限制每个成员每天的导出次数，防止滥用
          </div>
        </el-form-item>
      </el-form>

      <el-divider />

      <div class="stats-section">
        <h3>导出统计</h3>
        <el-descriptions :column="3" border>
          <el-descriptions-item label="今日导出次数">{{ exportStats.todayCount }}</el-descriptions-item>
          <el-descriptions-item label="本周导出次数">{{ exportStats.weekCount }}</el-descriptions-item>
          <el-descriptions-item label="本月导出次数">{{ exportStats.monthCount }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="exportSettingsVisible = false">取消</el-button>
          <el-button type="primary" @click="saveExportSettings">保存设置</el-button>
          <el-button @click="resetExportSettings">恢复默认</el-button>
        </div>
      </template>
    </el-dialog>

  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, computed, watch, onActivated, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Download, Refresh, User, UserFilled, Star, Search, Setting } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useAppStore } from '@/stores/app'
import { useCustomerStore } from '@/stores/customer'
import { useNotificationStore } from '@/stores/notification'
import { maskPhone, formatPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import { exportBatchCustomers, exportSingleCustomer, type ExportCustomer } from '@/utils/export'
import DynamicTable from '@/components/DynamicTable.vue'
import { createSafeNavigator } from '@/utils/navigation'
import customerShareApi, { type ShareRequest } from '@/api/customerShare'
import { formatDateTime } from '@/utils/dateFormat'

// 接口定义
interface Customer {
  id: string
  name: string
  phone: string
  address?: string
  level: string
  status: string
  source: string
  createdBy?: string
  shareInfo?: {
    status: string
    [key: string]: unknown
  }
  [key: string]: unknown
}

const router = useRouter()
const route = useRoute()
const userStore = useUserStore()
const appStore = useAppStore()
const customerStore = useCustomerStore()
const notificationStore = useNotificationStore()

// 创建安全导航器
const safeNavigator = createSafeNavigator(router)
// 新增：刷新参数处理标记，避免重复清理查询参数导致的重复导航
const refreshHandled = ref(false)

// 确保用户已登录，如果没有则跳转到登录页面
const ensureUserLoggedIn = async () => {
  console.log('=== 检查用户登录状态 ===')
  console.log('当前用户:', userStore.currentUser)
  console.log('是否已登录:', userStore.isLoggedIn)

  if (!userStore.isLoggedIn || !userStore.currentUser) {
    console.log('用户未登录，跳转到登录页面...')
    ElMessage.warning('请先登录')
    router.push('/login')
    return false
  } else {
    console.log('用户已登录，角色:', userStore.currentUser.role)
    return true
  }
}

// 响应式数据
const loading = ref(false)
const selectedCustomers = ref<Customer[]>([])
const searchForm = reactive({
  keyword: '',  // 统一搜索框，支持姓名、手机号、编码
  level: '',
  status: '',
  source: '',
  dateRange: [] as string[]  // 明确指定类型，确保初始化为空数组
})

// 统计数据
const summaryData = reactive({
  totalCustomers: 0,
  activeCustomers: 0,
  newCustomers: 0,
  highValueCustomers: 0
})

// 快捷筛选 - 默认显示所有客户，避免新客户被日期过滤隐藏
const quickFilter = ref('all')

// 快捷筛选选项
const quickFilterOptions = [
  { value: 'today', label: '今日' },
  { value: 'yesterday', label: '昨日' },
  { value: 'week', label: '7天' },
  { value: 'month', label: '30天' },
  { value: 'thisMonth', label: '本月' },
  { value: 'lastMonth', label: '上月' },
  { value: 'year', label: '年度' },
  { value: 'all', label: '全部' }
]

const pagination = reactive({
  page: 1,
  size: 10,  // 默认显示10条记录，支持扩展和翻页
  total: 0
})

// 导出权限设置相关数据
const exportSettingsVisible = ref(false)
const exportFormRef = ref()
const exportFormData = reactive({
  enabled: true,
  permissionType: 'all', // all | role | whitelist
  allowedRoles: ['super_admin', 'admin'],
  whitelist: [],
  dailyLimit: 0
})

// 导出统计
const exportStats = reactive({
  todayCount: 0,
  weekCount: 0,
  monthCount: 0
})

// 所有用户列表（用于白名单选择）
const allUsers = computed(() => {
  return userStore.users || []
})

// 销售人员数据 - 从用户列表动态加载
const salesUsers = computed(() => {
  console.log('[CustomerShare] userStore.users:', userStore.users.length)
  const filtered = userStore.users.filter(u =>
    ['sales_staff', 'department_manager', 'admin', 'super_admin'].includes(u.role)
  ).map(u => ({
    id: u.id,
    name: u.name,
    department: u.department || '未分配部门',
    role: u.role
  }))
  console.log('[CustomerShare] 可分享的销售人员:', filtered.length)
  return filtered
})

// 权限检查
const hasExportPermission = computed(() => {
  // 超级管理员拥有完整导出权限
  if (userStore.isSuperAdmin) {
    return true
  }

  // 检查是否有customer.export权限
  return userStore.permissions.includes('customer.export')
})

// 是否显示导出按钮
const showExportButtons = computed(() => {
  return userStore.isSuperAdmin || hasExportPermission.value
})

// 检查是否可以管理导出设置（仅超级管理员）
const canManageExport = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return false
  return currentUser.role === 'super_admin'
})

// 【修复】检查是否有新增客户权限 - 销售员、部门经理、管理员都可以新增客户
const canAddCustomer = computed(() => {
  const currentUser = userStore.currentUser
  if (!currentUser) return false

  // 超级管理员和管理员有权限
  if (userStore.isAdmin || userStore.isSuperAdmin) return true

  // 部门经理有权限
  if (currentUser.role === 'department_manager') return true

  // 销售员有权限
  if (currentUser.role === 'sales_staff') return true

  // 检查是否有customer:add权限
  if (userStore.permissions.includes('customer:add')) return true

  return false
})

// 检查是否有导出权限
const canExport = computed(() => {
  const exportConfigStr = localStorage.getItem('crm_customer_export_config')
  if (!exportConfigStr) {
    return true // 默认允许
  }

  try {
    const exportConfig = JSON.parse(exportConfigStr)

    // 功能未启用
    if (!exportConfig.enabled) {
      return false
    }

    const currentUser = userStore.currentUser
    if (!currentUser) {
      return false
    }

    // 所有人可用
    if (exportConfig.permissionType === 'all') {
      return true
    }

    // 按角色控制
    if (exportConfig.permissionType === 'role') {
      return exportConfig.allowedRoles?.includes(currentUser.role) || false
    }

    // 白名单控制
    if (exportConfig.permissionType === 'whitelist') {
      return exportConfig.whitelist?.includes(currentUser.id) || false
    }

    return false
  } catch (error) {
    console.error('解析导出配置失败:', error)
    return true
  }
})

// 表格列配置
const tableColumns = computed(() => [
  { prop: 'code', label: '客户编码', minWidth: 130, visible: true },
  { prop: 'name', label: '客户姓名', minWidth: 100, visible: true },
  { prop: 'phone', label: '手机号', width: 130, visible: true },
  { prop: 'age', label: '年龄', width: 70, visible: true },
  { prop: 'address', label: '地址', minWidth: 180, showOverflowTooltip: true, visible: true },
  { prop: 'level', label: '客户等级', width: 90, visible: true },
  { prop: 'allocationSource', label: '来源', width: 70, visible: true },
  {
    prop: 'status',
    label: '客户状态',
    width: 90,
    visible: userStore.isManager || userStore.isSuperAdmin
  },
  { prop: 'salesPerson', label: '创建人', minWidth: 100, visible: true },
  {
    prop: 'shareStatus',
    label: '分享状态',
    width: 120,
    visible: userStore.isAdmin
  },
  { prop: 'orderCount', label: '订单数', width: 70, visible: true },
  { prop: 'createTime', label: '添加时间', width: 160, visible: true, formatter: (value: unknown) => formatDateTime(value as string) }
])

// 获取分享给当前用户的客户ID列表
const sharedToMeCustomerIds = ref<string[]>([])

// 加载分享给我的客户
const loadSharedToMeCustomers = async () => {
  try {
    const sharedCustomers = await customerShareApi.getSharedToMeCustomers()
    sharedToMeCustomerIds.value = sharedCustomers.map(s => s.customerId)
    console.log('[CustomerList] 分享给我的客户数量:', sharedToMeCustomerIds.value.length)
  } catch (error) {
    console.error('[CustomerList] 加载分享客户失败:', error)
  }
}

// 计算搜索结果 - 根据用户角色过滤客户数据
// 计算搜索结果 - 🔥 修复：后端已经处理了权限过滤和搜索，直接返回store数据
const searchResults = computed(() => {
  console.log('=== searchResults computed ===')
  console.log('customerStore.customers.length:', customerStore.customers.length)

  // 🔥 后端API已经处理了权限过滤和搜索筛选，直接返回store中的数据
  // 不再在前端重复过滤，避免分页total不匹配的问题
  return customerStore.customers
})

// 获取部门成员ID列表
const getDepartmentMemberIds = (departmentId: string): string[] => {
  if (!departmentId) return []

  // 从用户列表中筛选同部门的成员
  const members = userStore.users.filter(user =>
    user.department === departmentId ||
    user.departmentId === departmentId
  )

  return members.map(m => m.id)
}

// 计算分页总数 - 🔥 修复：使用后端返回的总数，而不是前端过滤后的数量
const totalCount = computed(() => pagination.total)

// 使用computed获取客户列表数据
// 🔥 修复：后端API已经返回分页后的数据，直接使用customerStore.customers
const customerList = computed(() => {
  console.log('=== customerList computed ===')
  console.log('customerStore.customers.length:', customerStore.customers.length)
  console.log('pagination.total:', pagination.total)

  // 🔥 后端API已经处理了分页和筛选，直接返回store中的数据
  return customerStore.customers
})



const getLevelType = (level: string) => {
  const types: Record<string, string> = {
    bronze: '',
    silver: 'info',
    gold: 'warning',
    diamond: 'danger',
    // 兼容旧数据
    normal: '',
    vip: 'warning',
    svip: 'danger'
  }
  return types[level] || ''
}

const getLevelText = (level: string) => {
  const texts: Record<string, string> = {
    bronze: '铜牌客户',
    silver: '银牌客户',
    gold: '金牌客户',
    diamond: '钻石客户',
    // 兼容旧数据
    normal: '铜牌客户',
    vip: '金牌客户',
    svip: '钻石客户',
    '普通客户': '铜牌客户',
    'VIP客户': '金牌客户',
    'SVIP客户': '钻石客户'
  }
  return texts[level] || '铜牌客户'
}

const getStatusType = (status: string) => {
  const types: Record<string, string> = {
    active: 'success',
    inactive: 'info',
    potential: 'warning',
    lost: 'danger',
    blacklist: 'danger'
  }
  return types[status] || ''
}

const getStatusText = (status: string) => {
  const texts: Record<string, string> = {
    active: '活跃',
    inactive: '非活跃',
    potential: '潜在客户',
    lost: '流失客户',
    blacklist: '黑名单'
  }
  return texts[status] || '未知'
}

const isAllocatedCustomer = (customer: Customer) => {
  // 判断客户是否为分配来的，如果创建者不是当前用户，则为分配来的
  return customer.createdBy && customer.createdBy !== userStore.currentUser?.id
}

const handleRefresh = async () => {
  console.log('手动刷新，强制重新加载数据')
  try {
    await loadCustomerList(true) // 强制重新加载
    ElMessage.success('客户列表已刷新')
  } catch (error) {
    console.error('[客户列表] 刷新失败:', error)
    ElMessage.error('刷新失败，请稍后重试')
  }
}

// 快捷筛选处理
const handleQuickFilterChange = (value: string) => {
  // 更新快捷筛选器的选中状态
  quickFilter.value = value

  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)

  const weekAgo = new Date(today)
  weekAgo.setDate(weekAgo.getDate() - 7)

  const monthAgo = new Date(today)
  monthAgo.setDate(monthAgo.getDate() - 30)

  const yearStart = new Date(today.getFullYear(), 0, 1)

  switch (value) {
    case 'today':
      searchForm.dateRange = [
        today.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'yesterday':
      searchForm.dateRange = [
        yesterday.toISOString().split('T')[0],
        yesterday.toISOString().split('T')[0]
      ]
      break
    case 'week':
      searchForm.dateRange = [
        weekAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'month':
      searchForm.dateRange = [
        monthAgo.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'thisMonth':
      const thisMonthStart = new Date(today.getFullYear(), today.getMonth(), 1)
      searchForm.dateRange = [
        thisMonthStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'lastMonth':
      const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1)
      const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0)
      searchForm.dateRange = [
        lastMonthStart.toISOString().split('T')[0],
        lastMonthEnd.toISOString().split('T')[0]
      ]
      break
    case 'year':
      searchForm.dateRange = [
        yearStart.toISOString().split('T')[0],
        today.toISOString().split('T')[0]
      ]
      break
    case 'all':
      searchForm.dateRange = []
      break
  }

  // 自动触发搜索
  handleSearch()
}

const handleAdd = () => {
  safeNavigator.push('/customer/add')
}

const handleView = (row: Customer) => {
  safeNavigator.push(`/customer/detail/${row.id}`)
}



const handleOrder = (row: Customer) => {
  // 传递完整的客户信息到新建订单页面
  const params = new URLSearchParams({
    customerId: row.id,
    customerName: row.name,
    customerPhone: row.phone,
    customerAddress: row.address || ''
  })
  safeNavigator.push(`/order/add?${params.toString()}`)
}

const handleCall = async (row: Customer) => {
  // 🔥 跳转到通话管理页面并传递客户信息，自动弹出外呼对话框
  safeNavigator.push({
    path: '/service-management/call',
    query: {
      action: 'outbound',
      customerId: row.id,
      customerName: row.name,
      customerPhone: row.phone,
      company: row.company || ''
    }
  })
}

// 处理选择变化
const handleSelectionChange = (selection: Customer[]) => {
  selectedCustomers.value = selection
}

/**
 * 显示导出设置对话框
 */
const showExportSettings = () => {
  // 加载当前配置
  loadExportConfig()
  // 加载导出统计
  loadExportStats()
  // 显示对话框
  exportSettingsVisible.value = true
}

/**
 * 加载导出配置
 */
const loadExportConfig = () => {
  try {
    const exportConfigStr = localStorage.getItem('crm_customer_export_config')
    if (exportConfigStr) {
      const exportConfig = JSON.parse(exportConfigStr)
      Object.assign(exportFormData, exportConfig)
    }
  } catch (error) {
    console.error('加载导出配置失败:', error)
  }
}

/**
 * 加载导出统计
 */
const loadExportStats = () => {
  try {
    const statsStr = localStorage.getItem('crm_customer_export_stats')
    if (!statsStr) {
      exportStats.todayCount = 0
      exportStats.weekCount = 0
      exportStats.monthCount = 0
      return
    }

    const stats = JSON.parse(statsStr)
    const today = new Date().toISOString().split('T')[0]
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    exportStats.todayCount = stats[today] || 0
    exportStats.weekCount = Object.keys(stats)
      .filter(date => date >= weekAgo)
      .reduce((sum, date) => sum + stats[date], 0)
    exportStats.monthCount = Object.keys(stats)
      .filter(date => date >= monthAgo)
      .reduce((sum, date) => sum + stats[date], 0)
  } catch (error) {
    console.error('加载导出统计失败:', error)
  }
}

/**
 * 保存导出设置
 */
const saveExportSettings = () => {
  const exportConfig = {
    enabled: exportFormData.enabled,
    permissionType: exportFormData.permissionType,
    allowedRoles: exportFormData.allowedRoles,
    whitelist: exportFormData.whitelist,
    dailyLimit: exportFormData.dailyLimit
  }

  localStorage.setItem('crm_customer_export_config', JSON.stringify(exportConfig))
  ElMessage.success('客户导出权限设置已保存并全局生效')
  exportSettingsVisible.value = false
}

/**
 * 恢复默认导出设置
 */
const resetExportSettings = () => {
  exportFormData.enabled = true
  exportFormData.permissionType = 'all'
  exportFormData.allowedRoles = ['super_admin', 'admin']
  exportFormData.whitelist = []
  exportFormData.dailyLimit = 0

  ElMessage.success('已恢复默认设置')
}

/**
 * 检查导出限制
 */
const checkExportLimit = () => {
  try {
    const exportConfigStr = localStorage.getItem('crm_customer_export_config')
    if (!exportConfigStr) {
      return true
    }

    const exportConfig = JSON.parse(exportConfigStr)
    const dailyLimit = exportConfig.dailyLimit || 0

    if (dailyLimit === 0) {
      return true // 不限制
    }

    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_customer_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}
    const todayCount = stats[today] || 0

    if (todayCount >= dailyLimit) {
      ElMessage.warning(`每日导出次数已达上限（${dailyLimit}次）`)
      return false
    }

    return true
  } catch (error) {
    console.error('检查导出限制失败:', error)
    return true
  }
}

/**
 * 记录导出统计
 */
const recordExportStats = () => {
  try {
    const today = new Date().toISOString().split('T')[0]
    const statsStr = localStorage.getItem('crm_customer_export_stats')
    const stats = statsStr ? JSON.parse(statsStr) : {}

    stats[today] = (stats[today] || 0) + 1

    localStorage.setItem('crm_customer_export_stats', JSON.stringify(stats))
  } catch (error) {
    console.error('记录导出统计失败:', error)
  }
}

// 批量导出所有客户
const handleBatchExport = async () => {
  // 检查导出限制
  if (!checkExportLimit()) {
    return
  }

  if (!canExport.value) {
    ElMessage.warning('您没有客户导出权限')
    return
  }

  try {
    const confirmMessage = userStore.isSuperAdmin
      ? '确定要导出所有客户数据吗？导出的数据将包含完整的客户信息。'
      : '确定要导出所有客户数据吗？敏感信息将进行脱敏处理。'

    await ElMessageBox.confirm(
      confirmMessage,
      '批量导出确认',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    loading.value = true

    try {
      // 准备导出数据
      const exportCustomers: ExportCustomer[] = searchResults.value.map(customer => ({
        code: customer.code || '',
        name: customer.name,
        phone: customer.phone,
        age: customer.age,
        address: customer.address,
        level: getLevelText(customer.level),
        status: getStatusText(customer.status),
        salesPersonId: customer.salesPersonId,
        salesPersonName: getSalesPersonName(customer.salesPersonId),
        orderCount: customer.orderCount,
        createTime: customer.createTime,
        createdBy: customer.createdBy || '',
        wechatId: customer.wechatId,
        email: customer.email,
        company: customer.company,
        position: customer.position,
        source: customer.allocationSource,
        tags: customer.tags,
        remarks: customer.remarks
      }))

      // 使用新的导出工具函数
      const filename = exportBatchCustomers(exportCustomers, hasExportPermission.value)

      // 记录导出统计
      recordExportStats()

      ElMessage.success(`客户数据导出成功：${filename}`)
    } catch (exportError) {
      console.error('导出失败:', exportError)
      ElMessage.error('导出失败，请重试')
    } finally {
      loading.value = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作取消')
    }
  }
}

// 导出选中客户
const handleSelectedExport = async () => {
  if (selectedCustomers.value.length === 0) {
    ElMessage.warning('请先选择要导出的客户')
    return
  }

  // 检查导出限制
  if (!checkExportLimit()) {
    return
  }

  if (!canExport.value) {
    ElMessage.warning('您没有客户导出权限')
    return
  }

  try {
    const confirmMessage = userStore.isSuperAdmin
      ? `确定要导出选中的 ${selectedCustomers.value.length} 个客户数据吗？导出的数据将包含完整的客户信息。`
      : `确定要导出选中的 ${selectedCustomers.value.length} 个客户数据吗？敏感信息将进行脱敏处理。`

    await ElMessageBox.confirm(
      confirmMessage,
      '导出选中客户',
      {
        confirmButtonText: '确定导出',
        cancelButtonText: '取消',
        type: 'info'
      }
    )

    loading.value = true

    try {
      // 准备导出数据
      const exportCustomers: ExportCustomer[] = selectedCustomers.value.map(customer => ({
        code: customer.code || '',
        name: customer.name,
        phone: customer.phone,
        age: customer.age,
        address: customer.address,
        level: getLevelText(customer.level),
        status: getStatusText(customer.status),
        salesPersonId: customer.salesPersonId,
        salesPersonName: getSalesPersonName(customer.salesPersonId),
        orderCount: customer.orderCount,
        createTime: customer.createTime,
        createdBy: customer.createdBy || '',
        wechatId: customer.wechatId,
        email: customer.email,
        company: customer.company,
        position: customer.position,
        source: customer.allocationSource,
        tags: customer.tags,
        remarks: customer.remarks
      }))

      // 使用新的导出工具函数
      const filename = exportBatchCustomers(exportCustomers, hasExportPermission.value)

      // 记录导出统计
      recordExportStats()

      ElMessage.success(`选中客户数据导出成功：${filename}`)
      selectedCustomers.value = []
    } catch (exportError) {
      console.error('导出失败:', exportError)
      ElMessage.error('导出失败，请重试')
    } finally {
      loading.value = false
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('操作取消')
    }
  }
}

// 分享相关状态
const showShareDialog = ref(false)
const shareForm = reactive({
  targetUserId: '',
  timeLimit: 7, // 默认7天
  remark: ''
})
const currentShareCustomer = ref<Customer | null>(null)
const userSearchKeyword = ref('')

// 过滤后的销售人员列表
const filteredSalesUsers = computed(() => {
  if (!currentShareCustomer.value) return []

  let users = salesUsers.value.filter(u => u.id !== currentShareCustomer.value?.salesPersonId)

  if (userSearchKeyword.value) {
    const keyword = userSearchKeyword.value.toLowerCase()
    users = users.filter(u =>
      u.name.toLowerCase().includes(keyword) ||
      (u.department && u.department.toLowerCase().includes(keyword)) ||
      u.id.toLowerCase().includes(keyword)
    )
  }

  return users
})

// 用户搜索过滤方法
const filterUsers = (query: string) => {
  userSearchKeyword.value = query
}

// 获取角色文本
const getRoleText = (role: string) => {
  const roleMap: Record<string, string> = {
    'super_admin': '超级管理员',
    'admin': '管理员',
    'department_manager': '部门经理',
    'sales_staff': '销售人员',
    'customer_service': '客服人员'
  }
  return roleMap[role] || role
}

// 时间限制选项
const timeLimitOptions = [
  { label: '1天', value: 1 },
  { label: '3天', value: 3 },
  { label: '7天', value: 7 },
  { label: '15天', value: 15 },
  { label: '30天', value: 30 },
  { label: '永久', value: 0 }
]

// 分享客户
const handleShare = async (row: Customer) => {
  if (!userStore.isAdmin) {
    ElMessage.warning('只有管理员可以分享客户')
    return
  }

  currentShareCustomer.value = row
  shareForm.targetUserId = ''
  shareForm.timeLimit = 7
  shareForm.remark = ''
  userSearchKeyword.value = '' // 重置搜索关键词
  showShareDialog.value = true
}

// 确认分享
const confirmShare = async () => {
  if (!shareForm.targetUserId) {
    ElMessage.warning('请选择要分享给的销售人员')
    return
  }

  if (!currentShareCustomer.value) {
    ElMessage.warning('请选择要分享的客户')
    return
  }

  try {
    loading.value = true

    const customer = currentShareCustomer.value

    // 调用真实的分享API
    const shareRequest: ShareRequest = {
      customerId: customer.id,
      sharedTo: shareForm.targetUserId,
      timeLimit: shareForm.timeLimit,
      remark: shareForm.remark
    }

    const result = await customerShareApi.shareCustomer(shareRequest)

    if (result.success) {
      const targetUser = salesUsers.value.find(user => user.id === shareForm.targetUserId)
      const timeLimitText = shareForm.timeLimit === 0 ? '永久' : `${shareForm.timeLimit}天`

      ElMessage.success(`客户 ${customer.name} 已成功分享给 ${targetUser?.name || '目标用户'}，时间限制：${timeLimitText}`)

      // 发送系统消息提醒
      notificationStore.sendMessage(
        notificationStore.MessageType.CUSTOMER_SHARE,
        `客户 ${customer.name} 已分享给 ${targetUser?.name || '目标用户'}（时间限制：${timeLimitText}）`,
        {
          relatedId: customer.id,
          relatedType: 'customer',
          actionUrl: `/customer/detail/${customer.id}`
        }
      )

      // 刷新客户列表
      await loadCustomerList(true)

      showShareDialog.value = false
    } else {
      ElMessage.error(result.message || '分享失败')
    }
  } catch (error) {
    console.error('分享失败:', error)
    ElMessage.error('分享失败，请重试')
  } finally {
    loading.value = false
  }
}

// 获取销售人员姓名
const getSalesPersonName = (salesPersonId: string) => {
  const salesPerson = salesUsers.value.find(user => user.id === salesPersonId)
  return salesPerson ? salesPerson.name : '未分配'
}

// 获取创建人姓名 - 🔥 从所有用户中查找，不仅限于销售人员
const getCreatorName = (createdBy: string) => {
  if (!createdBy) return '未知'

  // 🔥 优先从所有用户列表中查找（确保所有角色都能正确显示姓名）
  const allUsers = userStore.users
  const creator = allUsers.find(user => user.id === createdBy)

  if (creator) {
    // 返回用户姓名（优先使用name字段）
    return creator.name || (creator as any).realName || (creator as any).username || createdBy
  }

  // 如果在用户列表中找不到，尝试从salesUsers中查找（兼容旧逻辑）
  const salesCreator = salesUsers.value.find(user => user.id === createdBy)
  if (salesCreator) {
    return salesCreator.name
  }

  // 都找不到则返回用户ID
  return createdBy
}



// 检查并回收过期分享
const checkExpiredShares = async () => {
  try {
    const expiredCount = await customerShareApi.autoRecallExpiredShares()

    if (expiredCount > 0) {
      console.log(`[CustomerShare] 自动回收了 ${expiredCount} 个过期分享`)
      // 重新加载客户列表
      await loadCustomerList(true)
    }
  } catch (error) {
    console.error('[CustomerShare] 检查过期分享失败:', error)
  }
}

// 格式化剩余时间
const formatRemainingTime = (expireTime: string) => {
  const now = new Date()
  const expire = new Date(expireTime)
  const diff = expire.getTime() - now.getTime()

  if (diff <= 0) {
    return '已过期'
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days > 0) {
    return `${days}天${hours}小时`
  } else if (hours > 0) {
    return `${hours}小时`
  } else {
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))
    return `${minutes}分钟`
  }
}

// 获取分享状态标签类型
const getShareStatusType = (shareInfo: { status: string; expireTime?: string } | null) => {
  if (!shareInfo || shareInfo.status !== 'active') {
    return ''
  }

  if (!shareInfo.expireTime) {
    return 'success' // 永久分享
  }

  const now = new Date()
  const expire = new Date(shareInfo.expireTime)
  const diff = expire.getTime() - now.getTime()
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))

  if (days <= 1) {
    return 'danger' // 即将过期
  } else if (days <= 3) {
    return 'warning' // 快要过期
  } else {
    return 'info' // 正常
  }
}





const handleSearch = () => {
  pagination.page = 1
  // 🔥 修复：搜索时重新加载数据（后端分页）
  loadCustomerList(true)
}

const handleReset = () => {
  Object.assign(searchForm, {
    keyword: '',
    level: '',
    status: '',
    source: '',
    dateRange: []
  })
  handleSearch()
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  pagination.page = 1 // 重置到第一页
  // 🔥 修复：调用API重新加载数据（后端分页）
  loadCustomerList(true)
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  // 🔥 修复：调用API重新加载数据（后端分页）
  loadCustomerList(true)
}

// 导出客户数据
const handleExport = async () => {
  try {
    await appStore.withLoading(async () => {
      // 获取所有客户数据（不分页）
      const exportData = customerList.value.map(customer => {
        const salesPerson = salesUsers.value.find(user => user.id === customer.salesPersonId)
        const createdByUser = salesUsers.value.find(user => user.id === customer.createdBy)

        return {
          '客户姓名': customer.name,
          '手机号': displaySensitiveInfoNew(customer.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id || ''),
          '年龄': customer.age,
          '地址': customer.address,
          '客户等级': getLevelText(customer.level),
          '订单数量': customer.orderCount,
          '负责销售': salesPerson?.name || '未分配',
          '创建人': createdByUser?.name || '未知',
          '创建时间': customer.createTime
        }
      })

      // 创建CSV内容
      const headers = Object.keys(exportData[0] || {})
      const csvContent = [
        headers.join(','),
        ...exportData.map(row =>
          headers.map(header => `"${row[header] || ''}"`).join(',')
        )
      ].join('\n')

      // 创建并下载文件
      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.setAttribute('href', url)
      link.setAttribute('download', `客户列表_${new Date().toISOString().slice(0, 10)}.csv`)
      link.style.visibility = 'hidden'
      document.body.appendChild(link)
      link.click()
      // 安全地移除元素，检查是否还在 DOM 中
      if (link.parentNode) {
        document.body.removeChild(link)
      }
      // 清理 URL 对象
      URL.revokeObjectURL(url)
    }, '正在导出客户数据...')

    // 记录导出统计
    recordExportStats()

    ElMessage.success('客户数据导出成功')
  } catch (error) {
    appStore.showError('导出客户数据失败', error as Error)
  }
}

const loadCustomerList = async (forceReload = false) => {
  try {
    loading.value = true

    // 🔥 修复：直接调用API，传递分页参数和日期参数，实现后端分页
    const { customerApi } = await import('@/api/customer')
    console.log(`[CustomerList] 🚀 加载客户, 页码: ${pagination.page}, 每页: ${pagination.size}`)

    // 🔥 修复：传递日期范围参数
    const response = await customerApi.getList({
      page: pagination.page,
      pageSize: pagination.size,
      keyword: searchForm.keyword || undefined,
      level: searchForm.level || undefined,
      dateRange: searchForm.dateRange && searchForm.dateRange.length === 2
        ? [searchForm.dateRange[0], searchForm.dateRange[1]]
        : undefined
    })

    if (response && response.data) {
      const { list, total, statistics } = response.data
      // 🔥 更新客户数据到store
      customerStore.customers = list || []
      // 🔥 更新分页总数（使用后端返回的total）
      pagination.total = total || 0

      // 🔥 更新统计数据（使用后端返回的统计数据）
      if (statistics) {
        summaryData.totalCustomers = statistics.totalCustomers || 0
        summaryData.activeCustomers = statistics.activeCustomers || 0
        summaryData.newCustomers = statistics.newCustomers || 0
        summaryData.highValueCustomers = statistics.highValueCustomers || 0
        console.log(`[CustomerList] ✅ 统计数据已更新:`, statistics)
      }

      console.log(`[CustomerList] ✅ 加载完成: ${list?.length || 0} 条, 总数: ${total}`)
    } else {
      console.log('[CustomerList] API无数据，客户列表为空')
      customerStore.customers = []
      pagination.total = 0
      // 重置统计数据
      summaryData.totalCustomers = 0
      summaryData.activeCustomers = 0
      summaryData.newCustomers = 0
      summaryData.highValueCustomers = 0
    }

  } catch (error) {
    console.error('loadCustomerList 错误:', error)
    appStore.showError('加载客户列表失败', error as Error)
    customerStore.customers = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

// 🔥 统计数据现在由后端API返回，不再需要前端计算
// loadSummaryData函数已移除，统计数据在loadCustomerList中更新

// 🔥 删除：不再需要监听totalCount，因为它现在直接使用pagination.total
// watch(totalCount, (newCount) => {
//   pagination.total = newCount
// })

// 监听customerStore中的客户数据变化，确保列表实时更新
watch(() => customerStore.customers, (newCustomers) => {
  console.log('检测到customerStore客户数据变化，客户数量:', newCustomers.length)
  // 强制更新搜索结果，确保新数据能够显示
  nextTick(() => {
    console.log('客户列表页面数据已更新，当前显示客户数量:', customerList.value.length)
  })
}, { deep: true, immediate: true })

// 🔥 删除：不再需要监听searchResults变化来更新统计数据，统计数据由后端返回
// watch(searchResults, () => {
//   loadSummaryData()
// }, { immediate: true })

// 监听路由变化，确保数据同步
watch(() => route.path, async (newPath, oldPath) => {
  if (newPath === '/customer/list') {
    console.log('路由切换到客户列表页面，从:', oldPath, '到:', newPath)

    // 如果是从添加页面返回，强制重新加载数据以确保显示最新客户
    if (oldPath === '/customer/add') {
      console.log('从添加页面返回，执行强化数据同步流程')

      // 1. 重置分页到第一页，确保新客户能被看到
      pagination.page = 1

      // 2. 清除搜索条件，确保显示所有客户
      searchForm.keyword = ''
      searchForm.level = ''
      searchForm.status = ''
      searchForm.dateRange = null
      quickFilter.value = 'all'

      // 3. 等待一个tick确保状态更新
      await nextTick()

      // 4. 强制重新加载列表数据（这会触发forceRefreshCustomers）
      await loadCustomerList(true)

      console.log('强化数据同步完成，新客户应该已显示，当前客户数量:', customerStore.customers.length)
    } else if (oldPath?.startsWith('/customer/edit/')) {
      console.log('从编辑页面返回，重新加载数据')
      await loadCustomerList(true) // 强制重新加载
    } else if (!oldPath || customerStore.customers.length === 0) {
      console.log('首次进入或列表为空，加载数据')
      await loadCustomerList(true) // 强制重新加载
    } else {
      console.log('其他情况，重新加载数据确保同步')
      await loadCustomerList(false) // 使用现有数据，不强制刷新
    }
  }
}, { immediate: true })

// 监听路由查询参数变化，处理刷新请求（参考商品模块的简单实现）
watch(() => route.query, (newQuery) => {
  if (route.path === '/customer/list' && newQuery.refresh === 'true') {
    console.log('检测到刷新参数，重新加载客户列表')

    // 重置分页到第一页
    pagination.page = 1

    // 🔥 修复：重新加载数据，让后端返回正确的total
    loadCustomerList(true)

    // 清除刷新参数
    safeNavigator.replace({ path: '/customer/list' })
  }
}, { immediate: false })

// 定时器引用
const shareCheckTimer = ref<NodeJS.Timeout | null>(null)

onMounted(async () => {
  // 首先确保用户已登录
  const isLoggedIn = await ensureUserLoggedIn()
  if (!isLoggedIn) {
    return // 如果用户未登录，直接返回，不执行后续逻辑
  }

  console.log('[客户列表] onMounted - 开始初始化')
  console.log('[客户列表] 当前customerStore中的客户数量:', customerStore.customers.length)

  // 加载用户列表(用于分享功能)
  await userStore.loadUsers()
  console.log('[客户列表] 用户列表已加载:', userStore.users.length, '个用户')

  // 🔥 批次262修复：createPersistentStore会自动加载数据，无需手动调用
  console.log('[客户列表] 当前客户数量:', customerStore.customers.length)

  // 检查是否有refresh参数
  const shouldRefresh = route.query.refresh === 'true'
  const hasTimestamp = !!route.query.timestamp

  // 等待一个tick确保数据加载完成
  await nextTick()

  // 检查是否需要强制刷新：有refresh参数、有时间戳参数或客户数据为空
  const needsForceRefresh = shouldRefresh || hasTimestamp || customerStore.customers.length === 0

  // 如果有refresh参数或时间戳，重置分页到第一页并清除搜索条件
  if (shouldRefresh || hasTimestamp) {
    pagination.page = 1  // 修复：使用正确的分页字段名
    searchForm.keyword = ''
    searchForm.level = ''
    searchForm.status = ''
    searchForm.dateRange = null
    quickFilter.value = 'all'

    // 等待下一个tick确保数据更新
    await nextTick()
  }

  // 并行加载客户数据和分享数据
  await Promise.all([
    loadCustomerList(needsForceRefresh),
    loadSharedToMeCustomers()
  ])

  console.log('[客户列表] onMounted - 初始化完成，当前显示客户数量:', customerList.value.length)

  // 启动定时检查过期分享（每分钟检查一次）
  shareCheckTimer.value = setInterval(() => {
    checkExpiredShares()
  }, 60000)

  // 立即检查一次
  checkExpiredShares()
})

// 当组件被激活时检查是否需要刷新数据（用于keep-alive场景）
onActivated(async () => {
  console.log('[客户列表] onActivated - 组件激活')
  console.log('[客户列表] 当前customerStore中的客户数量:', customerStore.customers.length)

  // 检查是否有refresh参数
  const shouldRefresh = route.query.refresh === 'true'
  console.log('[客户列表] 检查refresh参数:', shouldRefresh)

  if (shouldRefresh) {
    console.log('[客户列表] 检测到refresh参数，重置筛选条件')

    // 🔥 批次262修复：createPersistentStore会自动同步数据
    console.log('[客户列表] 当前客户数量:', customerStore.customers.length)

    // 重置分页到第一页并清除搜索条件
    pagination.page = 1
    searchForm.keyword = ''
    searchForm.level = ''
    searchForm.status = ''
    searchForm.dateRange = null
    quickFilter.value = 'all'

    // 等待Vue响应式更新完成
    await nextTick()

    // 强制重新加载客户数据
    await loadCustomerList(true)

    // 清除URL中的refresh参数
    await router.replace({ path: '/customer/list' })
  } else {
    // 🔥 批次262修复：createPersistentStore会自动同步数据
    console.log('[客户列表] 当前客户数量:', customerStore.customers.length)
    console.log('[客户列表] 分页总数:', pagination.total)
  }

  console.log('[客户列表] onActivated完成，当前显示客户数量:', customerList.value.length)
})

// 组件卸载时清理定时器和blob URL
onUnmounted(() => {
  if (shareCheckTimer.value) {
    clearInterval(shareCheckTimer.value)
    shareCheckTimer.value = null
  }

  // 清理所有可能存在的blob URL
  const existingLinks = document.querySelectorAll('a[href^="blob:"]')
  existingLinks.forEach(link => {
    const href = link.getAttribute('href')
    if (href && href.startsWith('blob:')) {
      URL.revokeObjectURL(href)
      if (link.parentNode) {
        link.parentNode.removeChild(link)
      }
    }
  })
})
</script>

<style scoped>
.customer-list {
  padding: 0;
}

/* 第一行：统计汇总卡片 */
.summary-cards-row {
  display: flex;
  gap: 16px;
  margin-bottom: 16px;
}

.summary-card {
  flex: 1;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 第二行：快捷筛选 */
.quick-filters-row {
  display: flex;
  justify-content: flex-start;
  margin-bottom: 16px;
}

.quick-filter-buttons {
  display: flex;
  justify-content: flex-start;
  gap: 12px;
  align-items: center;
}

.search-card {
  text-align: left;
}

.search-card .el-form {
  text-align: left;
}

.search-card .el-row {
  justify-content: flex-start;
  text-align: left;
}

.search-card .el-col {
  text-align: left;
}

.search-form {
  width: 100%;
}



.card-content {
  display: flex;
  align-items: center;
  gap: 12px;
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
  background: #909399;
}

.card-icon.active {
  background: #67c23a;
}

.card-icon.new {
  background: #409eff;
}

.card-icon.high-value {
  background: #e6a23c;
}

.card-info {
  flex: 1;
}

.card-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.card-label {
  font-size: 14px;
  color: #606266;
}



.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
}

.page-header h2 {
  margin: 0;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.search-card {
  margin-bottom: 16px;
  border: none;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
}

/* 客户表格样式 - 直接的表格式卡片 */
.customer-table {
  margin-bottom: 16px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  overflow: hidden;
  background: white;
}

/* 确保DynamicTable内部的表格样式 */
.customer-table :deep(.el-card) {
  border: none;
  box-shadow: none;
  border-radius: 8px;
}

.customer-table :deep(.el-card__header) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
  padding: 16px 20px;
}

.customer-table :deep(.el-card__body) {
  padding: 0;
}

.customer-table :deep(.el-table) {
  border: none;
}

.customer-table :deep(.el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

.customer-table :deep(.el-table td) {
  border-bottom: 1px solid #f5f7fa;
}

.customer-table :deep(.el-table tr:last-child td) {
  border-bottom: none;
}

.pagination {
  display: flex;
  justify-content: center;
  margin-top: 16px;
}

/* 可点击链接样式 */
.name-link, .phone-link {
  color: #409eff !important;
  text-decoration: none;
  font-weight: 500;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  height: auto !important;
  line-height: normal !important;
}

.code-link {
  color: #409eff !important;
  padding: 0 !important;
  border: none !important;
  background: none !important;
  height: auto !important;
  line-height: normal !important;
  font-family: 'Courier New', monospace;
  font-weight: 600;
  letter-spacing: 0.5px;
}

.code-link:hover {
  color: #66b1ff !important;
  text-decoration: underline;
}

.code-link:focus {
  outline: none;
}

.name-link:hover, .phone-link:hover {
  color: #66b1ff !important;
  text-decoration: underline;
}

.name-link:focus, .phone-link:focus {
  outline: none;
}

/* 分享弹窗样式 */
.share-dialog-content {
  padding: 0;
}

.customer-info {
  margin-bottom: 24px;
}

.customer-info h4 {
  margin: 0 0 12px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.share-settings {
  margin-bottom: 16px;
}

.share-settings h4 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 16px;
  font-weight: 600;
}

.time-limit-tip {
  margin-top: 8px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

/* 分享状态样式 */
.expire-time {
  margin-top: 4px;
  font-size: 12px;
}

/* 分配来源样式 */
.allocated {
  color: #409eff;
  font-size: 12px;
  font-weight: 500;
}

.self-created {
  color: #909399;
  font-size: 12px;
  font-weight: 500;
}

@media (max-width: 768px) {
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: stretch;
  }
}
</style>
