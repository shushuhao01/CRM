<template>
  <div class="data-list-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-content">
        <div class="title-row">
          <div class="title-section">
            <h1 class="page-title">
              <el-icon class="title-icon"><Document /></el-icon>
              资料列表
            </h1>
            <p class="page-description">管理已签收客户资料，支持分配、封存和批量操作</p>
          </div>


        </div>
      </div>

      <!-- 部门负责人待分配提示 -->
      <div class="leader-assign-alert" v-if="hasPendingLeaderAssignments">
        <el-alert
          title="您有待分配的客户资料"
          type="warning"
          :closable="false"
          show-icon
        >
          <template #default>
            <div class="alert-content">
              <span>您有 <strong>{{ pendingLeaderAssignments.length }}</strong> 条客户资料需要分配给部门成员</span>
              <el-button
                type="primary"
                size="small"
                @click="openLeaderAssignDialog"
                style="margin-left: 15px;"
              >
                立即分配
              </el-button>
            </div>
          </template>
        </el-alert>
      </div>
    </div>

    <!-- 汇总数据卡片 -->
    <div class="summary-cards">
      <div class="card-item">
        <div class="card-icon total">
          <el-icon><Document /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.totalCount }}</div>
          <div class="card-label">资料总数</div>
        </div>
      </div>
      <div class="card-item">
        <div class="card-icon pending">
          <el-icon><Clock /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.pendingCount }}</div>
          <div class="card-label">待分配</div>
        </div>
      </div>
      <div class="card-item">
        <div class="card-icon assigned">
          <el-icon><User /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">{{ summaryData.assignedCount }}</div>
          <div class="card-label">已分配</div>
        </div>
      </div>
      <div class="card-item">
        <div class="card-icon amount">
          <el-icon><Money /></el-icon>
        </div>
        <div class="card-content">
          <div class="card-number">¥{{ summaryData.totalAmount.toLocaleString() }}</div>
          <div class="card-label">订单总额</div>
        </div>
      </div>
    </div>

    <!-- 快速筛选器 -->
    <div class="quick-filter-container">
      <div class="quick-filters">
        <span class="filter-label">快速筛选：</span>
        <div class="filter-buttons">
          <el-button
            v-for="filter in dateFilters"
            :key="filter.value"
            :type="currentDateFilter === filter.value ? 'primary' : 'default'"
            size="small"
            @click="handleQuickFilter(filter.value)"
          >
            {{ filter.label }}
          </el-button>
        </div>
      </div>
    </div>

    <!-- 筛选器卡片 -->
    <el-card class="filter-card">
      <div class="filter-content">
        <!-- 搜索和筛选 -->
        <div class="search-filters">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索客户姓名、手机号、客户编码"
            @input="handleSearch"
            class="search-input"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
          
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            @change="handleCustomDateChange"
            class="date-picker"
            size="default"
          />

          <el-select
            v-model="statusFilter"
            placeholder="状态筛选"
            clearable
            class="status-filter"
          >
            <el-option label="待分配" value="pending" />
            <el-option label="已分配" value="assigned" />
            <el-option label="已封存" value="archived" />
            <el-option label="已回收" value="recovered" />
          </el-select>
        </div>
      </div>
    </el-card>

    <!-- 主要内容区域 -->
    <div class="list-section">
      <div class="list-header">
        <!-- 导航标签和操作区域 -->
        <div class="header-top-row">
          <!-- 导航标签 -->
          <div class="nav-tabs">
            <div
              v-for="tab in navTabs"
              :key="tab.value"
              :class="['nav-tab', { active: currentTab === tab.value }]"
              @click="handleTabChange(tab.value)"
            >
              <span class="tab-label">{{ tab.label }}</span>
              <span class="tab-count">{{ tab.count }}</span>
            </div>
          </div>

          <!-- 批量操作和设置 -->
          <div class="header-actions">
            <!-- 批量操作 -->
            <div class="batch-operations">
              <el-button
                type="primary"
                :disabled="selectedItems.length === 0"
                @click="openBatchAssignDialog"
              >
                <el-icon><UserFilled /></el-icon>
                批量分配 ({{ selectedItems.length }})
              </el-button>

              <template v-if="isSuperAdmin || !isDepartmentLeader">
                <el-button
                  type="warning"
                  :disabled="selectedItems.length === 0"
                  @click="handleBatchArchive"
                >
                  <el-icon><Lock /></el-icon>
                  批量封存
                </el-button>
              </template>
            </div>
            
            <!-- 表格设置 -->
            <div class="table-settings">
              <TableColumnSettings
                :columns="allTableColumns"
                storage-key="data-list-columns"
                @columns-change="handleColumnSettingsChange"
                ref="columnSettingsRef"
              />
            </div>
          </div>
        </div>
      </div>

    <DynamicTable
      :data="tableData"
      :columns="tableColumns"
      storage-key="data-list-columns"
      :loading="loading"
      :show-column-settings="false"
      :show-selection="true"
      :show-index="false"
      :pagination="{
        currentPage: currentPage,
        pageSize: pageSize,
        total: total,
        pageSizes: [30, 50, 100]
      }"
      @selection-change="handleSelectionChange"
      @sort-change="handleSortChange"
      @size-change="handlePageSizeChange"
      @current-change="handlePageChange"
    >
          <!-- 客户编码列 -->
          <template #column-customerCode="{ row }">
            <span 
              class="code-link" 
              @click="navigateToCustomerDetail(row.customerCode)"
              :title="row.customerCode"
            >
              {{ row.customerCode || 'N/A' }}
            </span>
          </template>

          <!-- 订单金额列 -->
          <template #column-orderAmount="{ row }">
            <span class="amount">¥{{ row.orderAmount.toLocaleString() }}</span>
          </template>

          <!-- 状态列 -->
          <template #column-status="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
            <el-tag v-if="row.isReassigned" type="warning" size="small" style="margin-left: 4px;">
              重分配
            </el-tag>
          </template>

          <!-- 分配来源列 -->
          <template #column-allocationSource="{ row }">
            <el-tag v-if="isAllocatedData(row)" type="info" size="small">
              分配
            </el-tag>
            <span v-else class="self-created">自建</span>
          </template>

          <!-- 手机号列 -->
          <template #column-phone="{ row }">
            {{ displaySensitiveInfoNew(row.phone, SensitiveInfoType.PHONE) }}
          </template>

          <!-- 归属人列 -->
          <template #column-assigneeName="{ row }">
            {{ row.status === 'assigned' ? (row.assigneeName || '-') : '-' }}
          </template>

          <!-- 操作人列 -->
          <template #column-operatorName="{ row }">
            {{ (row.status === 'assigned' || row.status === 'archived') ? (row.operatorName || '-') : '-' }}
          </template>

          <!-- 分配时间列 -->
          <template #column-assignDate="{ row }">
            {{ row.status === 'pending' ? row.orderDate : (row.assignDate || '-') }}
          </template>

          <!-- 操作列 -->
          <template #table-actions="{ row }">
            <!-- 查看按钮 - 所有角色都可以查看 -->
            <el-button type="primary" size="small" @click="viewDetail(row)">
              <el-icon><View /></el-icon>
              查看
            </el-button>

            <!-- 部门负责人只能看到分配相关按钮，超级管理员不受此限制 -->
            <template v-if="isDepartmentLeader">
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                @click="assignSingle(row)"
              >
                <el-icon><UserFilled /></el-icon>
                分配
              </el-button>
              <el-button
                v-if="row.status === 'assigned'"
                type="success"
                size="small"
                @click="reassignSingle(row)"
              >
                <el-icon><UserFilled /></el-icon>
                重新分配
              </el-button>
            </template>

            <!-- 超级管理员和其他角色可以看到所有操作按钮 -->
            <template v-else>
              <el-button
                v-if="row.status === 'pending'"
                type="success"
                size="small"
                @click="assignSingle(row)"
              >
                <el-icon><UserFilled /></el-icon>
                分配
              </el-button>
              <el-button
                v-if="row.status === 'recovered'"
                type="success"
                size="small"
                @click="reassignSingle(row)"
              >
                <el-icon><UserFilled /></el-icon>
                重新分配
              </el-button>
              <el-button
                v-if="row.status !== 'pending' && row.status !== 'recovered'"
                type="warning"
                size="small"
                @click="recoverSingle(row)"
              >
                <el-icon><RefreshRight /></el-icon>
                回收
              </el-button>
              <el-button
                v-if="row.status === 'recovered'"
                type="danger"
                size="small"
                @click="deleteSingle(row)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
              <el-button
                v-if="row.status === 'archived'"
                type="success"
                size="small"
                @click="reassignSingle(row)"
              >
                <el-icon><UserFilled /></el-icon>
                重新分配
                <el-tag v-if="row.isReassigned" type="info" size="small" style="margin-left: 4px;">重分</el-tag>
              </el-button>
              <el-button
                v-if="row.status === 'pending' || row.status === 'assigned'"
                type="danger"
                size="small"
                @click="archiveSingle(row)"
              >
                <el-icon><FolderOpened /></el-icon>
                封存
              </el-button>
            </template>
          </template>
    </DynamicTable>
    </div>

    <!-- 批量分配对话框 -->
    <el-dialog
      v-model="showBatchAssignDialog"
      :title="isReassigning ? '重新分配资料' : '部门负责人分配'"
      width="700px"
      :close-on-click-modal="false"
    >
      <div class="assign-dialog-content">
        <!-- 分配说明 -->
        <div class="assign-info-section">
          <el-alert
            title="分配说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <div v-if="isReassigning">
                <p>您有 <strong>{{ selectedItems.length }}</strong> 条待分配的客户资料</p>
                <p style="color: #E6A23C; margin-top: 5px;">
                  <el-icon><Warning /></el-icon>
                  重新分配后，原负责人将失去该客户的归属权
                </p>
              </div>
              <div v-else>
                <p>您有 <strong>{{ selectedItems.length }}</strong> 条待分配的客户资料</p>
                <p>请选择分配方式进行分配，系统将按轮流方式确保公平分配</p>
              </div>
            </template>
          </el-alert>
        </div>
        <el-form :model="assignForm" label-width="100px">
          <el-form-item label="分配方式" v-if="!isReassigning">
            <el-radio-group v-model="assignForm.assignType">
              <el-radio value="roundrobin">部门内轮流分配</el-radio>
              <el-radio value="specific">指定成员分配</el-radio>
              <el-radio value="cross_department" v-if="isSuperAdmin">跨部门智能分配</el-radio>
            </el-radio-group>
            <div style="margin-top: 8px;" v-if="assignForm.assignType === 'cross_department'">
              <el-text type="warning" size="small">
                <el-icon><Warning /></el-icon>
                超级管理员权限：可跨部门分配资料，系统将根据各部门工作负载智能分配
              </el-text>
            </div>
          </el-form-item>

          <el-form-item label="分配模式" v-if="assignForm.assignType === 'roundrobin'">
            <el-radio-group v-model="assignForm.assignMode">
              <el-radio value="direct">直接分配给成员</el-radio>
              <el-radio value="leader">先分配给部门负责人</el-radio>
            </el-radio-group>
            <div style="margin-top: 8px;">
              <el-text type="info" size="small" v-if="assignForm.assignMode === 'direct'">
                系统将按轮流顺序直接分配给部门成员，确保每个人都能轮流获得资料
              </el-text>
              <el-text type="info" size="small" v-else>
                所有资料将先分配给部门负责人，由负责人再次分配给部门成员
              </el-text>
            </div>
          </el-form-item>

          <el-form-item label="分配策略" v-if="assignForm.assignType === 'cross_department'">
            <el-radio-group v-model="assignForm.crossDepartmentStrategy">
              <el-radio value="workload">按工作负载均衡</el-radio>
              <el-radio value="performance">按业绩表现分配</el-radio>
              <el-radio value="manual">手动选择部门</el-radio>
            </el-radio-group>
            <div style="margin-top: 8px;">
              <el-text type="info" size="small" v-if="assignForm.crossDepartmentStrategy === 'workload'">
                系统将根据各部门当前工作负载自动分配，确保负载均衡
              </el-text>
              <el-text type="info" size="small" v-else-if="assignForm.crossDepartmentStrategy === 'performance'">
                优先分配给业绩表现较好的部门，激励团队竞争
              </el-text>
              <el-text type="info" size="small" v-else>
                手动选择要参与分配的部门，灵活控制分配范围
              </el-text>
            </div>
          </el-form-item>

          <el-form-item label="参与部门" v-if="assignForm.assignType === 'cross_department' && assignForm.crossDepartmentStrategy === 'manual'">
            <el-select
              v-model="assignForm.selectedDepartments"
              multiple
              placeholder="选择参与分配的部门"
              style="width: 100%"
            >
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="选择部门" v-if="assignForm.assignType === 'roundrobin'">
            <el-select v-model="assignForm.departmentId" placeholder="选择部门" style="width: 100%">
              <el-option
                v-for="dept in departments"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item
            :label="isReassigning ? '转移给' : '指定成员'"
            v-if="isReassigning || assignForm.assignType === 'specific'"
          >
            <el-select
              v-model="assignForm.assignTo"
              :placeholder="isReassigning ? '选择新的负责人' : '搜索成员姓名、账号、手机号或部门'"
              style="width: 100%"
              filterable
              remote
              :remote-method="searchMembers"
              :loading="searchingMembers"
              @focus="initMembersList"
              clearable
            >
              <el-option
                v-for="member in filteredMembers"
                :key="member.id"
                :label="`${member.name} (${member.account}) - ${member.department}`"
                :value="member.id"
              >
                <div class="member-info">
                  <div class="member-main-info">
                    <div class="member-name">{{ member.name }} ({{ member.account }})</div>
                    <div class="member-details">
                      <span class="member-department">{{ member.department }}</span>
                      <span class="member-phone">{{ member.phone }}</span>
                    </div>
                  </div>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="备注">
            <el-input
              v-model="assignForm.remark"
              type="textarea"
              placeholder="分配备注（可选）"
              :rows="3"
            />
          </el-form-item>
        </el-form>

        <!-- 分配预览 -->
        <div class="assign-preview-section" v-if="assignForm.assignType">
          <div class="preview-header">
            <div class="header-content">
              <el-icon class="preview-icon"><Document /></el-icon>
              <h4>分配预览</h4>
              <el-tag :type="getAssignTypeTagType()" size="small">
                {{ getAssignTypeText() }}
              </el-tag>
            </div>
            <!-- 分配对象信息移到右侧 -->
            <div class="target-info-compact">
              <div class="target-header-compact">
                <el-icon class="target-icon"><User /></el-icon>
                <span class="target-title">{{ getAssignTargetText() }}</span>
              </div>
              <div class="target-detail-compact" v-if="assignForm.assignType === 'specific' && assignForm.assignTo">
                <span class="detail-item">
                  <el-icon><Phone /></el-icon>
                  {{ getSelectedMemberPhone() }}
                </span>
                <span class="detail-item">
                  <el-icon><OfficeBuilding /></el-icon>
                  {{ getSelectedMemberDepartment() }}
                </span>
              </div>
            </div>
          </div>
          

          
          <!-- 客户列表预览 -->
          <div class="customer-preview" v-if="selectedItems.length > 0">
            <div class="preview-table-header">
              <div class="table-title">
                <el-icon><List /></el-icon>
                <span>客户详情预览</span>
              </div>
              <div class="table-actions">
                <el-button size="small" text @click="expandPreview = !expandPreview">
                  {{ expandPreview ? '收起' : '展开' }}
                  <el-icon><ArrowDown v-if="!expandPreview" /><ArrowUp v-else /></el-icon>
                </el-button>
              </div>
            </div>
            
            <div class="preview-table-container" :class="{ expanded: expandPreview }">
              <el-table 
                :data="selectedItems.slice(0, expandPreview ? selectedItems.length : 3)" 
                size="small" 
                stripe
                :max-height="expandPreview ? 400 : 200"
                class="preview-table"
              >
                <el-table-column prop="customerName" label="客户姓名" width="100" show-overflow-tooltip />
                <el-table-column prop="phone" label="联系电话" width="120" show-overflow-tooltip />
                <el-table-column prop="orderAmount" label="订单金额" width="100" align="right">
                  <template #default="scope">
                    <span class="amount-text" :class="{ 'high-value': scope.row.orderAmount >= 50000 }">
                      ¥{{ scope.row.orderAmount.toLocaleString() }}
                    </span>
                  </template>
                </el-table-column>
                <el-table-column prop="source" label="来源" width="80" show-overflow-tooltip />
                <el-table-column prop="status" label="状态" width="80">
                  <template #default="scope">
                    <el-tag size="small" :type="getStatusTagType(scope.row.status)">
                      {{ scope.row.status }}
                    </el-tag>
                  </template>
                </el-table-column>
                <el-table-column prop="createTime" label="创建时间" width="100" show-overflow-tooltip>
                  <template #default="scope">
                    {{ formatDate(scope.row.createTime) }}
                  </template>
                </el-table-column>
              </el-table>
              
              <div v-if="!expandPreview && selectedItems.length > 3" class="more-data-tip">
                <el-text type="info" size="small">
                  <el-icon><MoreFilled /></el-icon>
                  还有 {{ selectedItems.length - 3 }} 条客户数据，点击展开查看全部
                </el-text>
              </div>
            </div>
          </div>
          
          <!-- 分配备注预览 -->
          <div class="remark-preview" v-if="assignForm.remark">
            <div class="remark-header">
              <el-icon><EditPen /></el-icon>
              <span>分配备注</span>
            </div>
            <div class="remark-content">
              {{ assignForm.remark }}
            </div>
          </div>
        </div>
      </div>
      <template #footer>
        <el-button @click="showBatchAssignDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmBatchAssign" :loading="assigning">确认分配</el-button>
      </template>
    </el-dialog>

    <!-- 客户详情弹窗 -->
    <CustomerDetailDialog
      v-model="showCustomerDetailDialog"
      :customer-data="currentCustomerData"
      @quick-assign="handleQuickAssign"
      @quick-archive="handleQuickArchive"
      @quick-recover="handleQuickRecover"
    />

    <!-- 封存弹窗 -->
    <ArchiveDialog
      v-model="showArchiveDialog"
      :customer-data="currentArchiveData"
      @confirm="handleArchiveConfirm"
    />

    <!-- 部门负责人分配弹窗 -->
    <LeaderAssignDialog
      v-model="showLeaderAssignDialog"
      :pending-assignments="pendingLeaderAssignments"
      @confirm="handleLeaderAssignConfirm"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Document, User, Clock, Check, Lock, Search, UserFilled,
  RefreshRight, View, FolderOpened, Delete, Warning,
  Phone, OfficeBuilding, DataAnalysis, List, ArrowDown, ArrowUp,
  MoreFilled, EditPen, Money
} from '@element-plus/icons-vue'
import { useDataStore } from '@/stores/data'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import type { DataListItem } from '@/api/data'
import CustomerDetailDialog from './CustomerDetailDialog.vue'
import ArchiveDialog from './ArchiveDialog.vue'
import LeaderAssignDialog from './LeaderAssignDialog.vue'
import DynamicTable from '@/components/DynamicTable.vue'
import TableColumnSettings from '@/components/TableColumnSettings.vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'

// 使用状态管理
const dataStore = useDataStore()
const userStore = useUserStore()
const departmentStore = useDepartmentStore()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const loading = computed(() => dataStore.loading)
const assigning = ref(false)
const showBatchAssignDialog = ref(false)
const showCustomerDetailDialog = ref(false)
const showArchiveDialog = ref(false)
const showLeaderAssignDialog = ref(false)
const currentCustomerData = ref<DataListItem | null>(null)
const currentArchiveData = ref<DataListItem | null>(null)
const pendingLeaderAssignments = ref<any[]>([])
const columnSettingsRef = ref()

// 汇总数据 - 根据当前筛选条件动态计算
const summaryData = computed(() => {
  const filteredData = dataStore.filteredDataList

  return {
    totalCount: filteredData.length,
    pendingCount: filteredData.filter(item => item.status === 'pending').length,
    assignedCount: filteredData.filter(item => item.status === 'assigned').length,
    archivedCount: filteredData.filter(item => item.status === 'archived').length,
    recoveredCount: filteredData.filter(item => item.status === 'recovered').length,
    totalAmount: filteredData.reduce((sum, item) => sum + item.orderAmount, 0),
    todayCount: filteredData.filter(item => {
      const today = new Date().toDateString()
      return new Date(item.orderDate).toDateString() === today
    }).length,
    weekCount: filteredData.filter(item => {
      const weekAgo = new Date()
      weekAgo.setDate(weekAgo.getDate() - 7)
      return new Date(item.orderDate) >= weekAgo
    }).length,
    monthCount: filteredData.filter(item => {
      const monthAgo = new Date()
      monthAgo.setMonth(monthAgo.getMonth() - 1)
      return new Date(item.orderDate) >= monthAgo
    }).length
  }
})





// 超级管理员权限检查 - 使用userStore的isSuperAdmin计算属性
const isSuperAdmin = computed(() => {
  return userStore.isSuperAdmin
})

// 部门负责人权限检查 - 使用userStore的isManager但排除超级管理员
const isDepartmentLeader = computed(() => {
  return userStore.isManager && !isSuperAdmin.value
})

// 是否有待分配的资料（仅部门负责人可见，超级管理员不显示）
const hasPendingLeaderAssignments = computed(() => {
  return isDepartmentLeader.value && pendingLeaderAssignments.value.length > 0
})

// 筛选相关
const currentDateFilter = ref('today')
const dateRange = ref<[Date, Date] | null>(null)
const searchKeyword = ref('')
const statusFilter = ref('')

// 日期筛选选项
const dateFilters = [
  { label: '今日', value: 'today' },
  { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'thisWeek' },
  { label: '近30天', value: 'last30Days' },
  { label: '本月', value: 'thisMonth' },
  { label: '今年', value: 'thisYear' },
  { label: '全部', value: 'all' }
]

// 导航标签
const currentTab = ref('pending')
const navTabs = computed(() => {
  const baseTabs = [
    { label: '待分配', value: 'pending', count: summaryData.value.pendingCount },
    { label: '已分配', value: 'assigned', count: summaryData.value.assignedCount }
  ]

  // 只有部门负责人（非超级管理员）才限制看到待分配和已分配状态
  if (isDepartmentLeader.value && !isSuperAdmin.value) {
    return baseTabs
  }

  // 超级管理员和其他角色可以看到所有状态
  return [
    ...baseTabs,
    { label: '已封存', value: 'archived', count: summaryData.value.archivedCount },
    { label: '已回收', value: 'recovered', count: summaryData.value.recoveredCount }
  ]
})

// 监听标签页变化
watch(currentTab, (newTab) => {
  dataStore.setFilters({ status: newTab as any })
  selectedItems.value = []
})

// 监听状态筛选变化
watch(statusFilter, (newStatus) => {
  currentPage.value = 1
  dataStore.setFilters({ status: newStatus })
})

// 表格相关
const tableData = computed(() => dataStore.filteredDataList)
const selectedItems = ref<DataListItem[]>([])
const currentPage = ref(1)
const pageSize = ref(30)

// 可见列管理
const visibleColumns = ref<string[]>([])

// 表格列配置
const allTableColumns = [
  {
    prop: 'customerCode',
    label: '客户编码',
    width: 140,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'customerName',
    label: '客户姓名',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'phone',
    label: '手机号',
    width: 130,
    visible: true,
    sortable: false,
    showOverflowTooltip: true
  },
  {
    prop: 'orderAmount',
    label: '订单金额',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: false
  },
  {
    prop: 'orderDate',
    label: '下单日期',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'signDate',
    label: '签收日期',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'status',
    label: '状态',
    width: 100,
    visible: true,
    sortable: true,
    showOverflowTooltip: false,
    formatter: (row: DataListItem) => getStatusText(row.status)
  },
  {
    prop: 'allocationSource',
    label: '来源',
    width: 80,
    visible: true,
    sortable: false,
    showOverflowTooltip: false
  },
  {
    prop: 'assigneeName',
    label: '归属人',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'operatorName',
    label: '操作人',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  },
  {
    prop: 'assignDate',
    label: '分配时间',
    width: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: true
  }
]

// 计算可见的表格列
const tableColumns = computed(() => {
  if (visibleColumns.value.length === 0) {
    // 如果没有设置可见列，显示所有默认可见的列
    return allTableColumns.filter(col => col.visible)
  }
  // 根据可见列设置筛选
  return allTableColumns.filter(col => visibleColumns.value.includes(col.prop))
})

// 监听分页变化
watch([currentPage, pageSize], ([page, size]) => {
  dataStore.setPagination(page, size)
})
const total = computed(() => dataStore.total)

// 分配表单
const assignForm = reactive({
  assignType: 'specific', // 'roundrobin' | 'specific' | 'cross_department'
  assignMode: 'direct', // 'direct' | 'leader' (仅用于轮流分配)
  assignTo: '',
  departmentId: '',
  crossDepartmentStrategy: 'workload', // 'workload' | 'performance' | 'manual' (跨部门分配策略)
  selectedDepartments: [], // 手动选择的部门列表
  remark: ''
})

// 分配预览相关
const expandPreview = ref(false)

// 判断是否为重新分配操作
const isReassigning = computed(() => {
  return selectedItems.value.length === 1 && selectedItems.value[0]?.status === 'archived'
})

// 团队成员和部门
const teamMembers = computed(() => dataStore.assigneeOptions)
const filteredMembers = ref([])
const searchingMembers = ref(false)

// 部门数据
const departments = computed(() => departmentStore.departmentList)

// 方法
// 获取分配目标文本
const getAssignTargetText = () => {
  if (assignForm.assignType === 'roundrobin') {
    const department = departments.value.find(dept => dept.id === assignForm.departmentId)
    return department ? department.name : '请选择部门'
  } else if (assignForm.assignType === 'cross_department') {
    if (assignForm.crossDepartmentStrategy === 'manual') {
      const selectedDepts = departments.value.filter(dept => 
        assignForm.selectedDepartments.includes(dept.id)
      )
      return selectedDepts.length > 0 ? selectedDepts.map(d => d.name).join('、') : '请选择部门'
    } else {
      return '全部门智能分配'
    }
  } else if (assignForm.assignType === 'specific') {
    const member = allSystemMembers.value.find(m => m.id === assignForm.assignTo)
    return member ? `${member.name} (${member.department})` : '请选择成员'
  }
  return ''
}

// 获取分配类型标签类型
const getAssignTypeTagType = () => {
  switch (assignForm.assignType) {
    case 'roundrobin': return 'primary'
    case 'specific': return 'success'
    case 'cross_department': return 'warning'
    default: return 'info'
  }
}

// 获取分配类型文本
const getAssignTypeText = () => {
  switch (assignForm.assignType) {
    case 'roundrobin': return '轮流分配'
    case 'specific': return '指定成员'
    case 'cross_department': return '跨部门分配'
    default: return '未选择'
  }
}

// 获取选中成员的手机号
const getSelectedMemberPhone = () => {
  const member = allSystemMembers.value.find(m => m.id === assignForm.assignTo)
  return member ? member.phone : ''
}

// 获取选中成员的部门
const getSelectedMemberDepartment = () => {
  const member = allSystemMembers.value.find(m => m.id === assignForm.assignTo)
  return member ? member.department : ''
}

// 计算总订单金额
const getTotalOrderAmount = () => {
  const total = selectedItems.value.reduce((sum, item) => sum + item.orderAmount, 0)
  return `¥${total.toLocaleString()}`
}

// 计算高价值客户数量
const getHighValueCount = () => {
  return selectedItems.value.filter(item => item.orderAmount >= 50000).length
}

// 获取状态标签类型
const getStatusTagType = (status: string) => {
  switch (status) {
    case 'pending': return 'warning'
    case 'assigned': return 'success'
    case 'archived': return 'info'
    case 'recovered': return 'danger'
    default: return 'info'
  }
}

// 格式化日期
const formatDate = (dateStr: string) => {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

// 部门负责人分配相关方法
const openLeaderAssignDialog = () => {
  showLeaderAssignDialog.value = true
}

interface AssignmentData {
  assignments: DataListItem[]
  assignType: 'roundrobin' | 'specific' | 'custom'
  customAssignments?: DataListItem[]
}

const handleLeaderAssignConfirm = (assignmentData: AssignmentData) => {
  // 处理部门负责人的分配确认
  console.log('部门负责人分配确认:', assignmentData)

  // 模拟处理分配结果
  const { assignments, assignType, customAssignments } = assignmentData

  if (assignType === 'roundrobin') {
    ElMessage.success(`已按轮流方式分配 ${assignments.length} 条资料`)
  } else if (assignType === 'specific') {
    ElMessage.success(`已分配 ${assignments.length} 条资料给指定成员`)
  } else if (assignType === 'custom') {
    ElMessage.success(`已按自定义方式分配 ${customAssignments.length} 条资料`)
  }

  // 清空待分配列表
  pendingLeaderAssignments.value = []
  showLeaderAssignDialog.value = false

  // 刷新数据
  dataStore.loadDataList()
}

// 加载部门负责人待分配数据
const loadPendingLeaderAssignments = () => {
  // 只有部门负责人（非超级管理员）才需要加载待分配数据
  if (!isDepartmentLeader.value || isSuperAdmin.value) {
    pendingLeaderAssignments.value = []
    return
  }

  // 这里应该从后端API获取当前用户作为部门负责人的待分配资料
  // 查询条件：assigneeId = userStore.currentUser.id && assignMode = 'leader' && status = 'pending_reassign'

  // 模拟根据当前用户ID查询被分配给该负责人的资料
  const mockAssignedData = [
    {
      id: 'pending_1',
      customerName: '王五',
      phone: '13800138003',
      orderAmount: 6500,
      orderDate: '2024-01-16',
      assignedAt: '2024-01-16 09:30:00',
      assignedBy: '系统管理员',
      departmentName: '销售一部'
    },
    {
      id: 'pending_2',
      customerName: '赵六',
      phone: '13800138004',
      orderAmount: 7200,
      orderDate: '2024-01-16',
      assignedAt: '2024-01-16 10:15:00',
      assignedBy: '系统管理员',
      departmentName: '销售一部'
    }
  ]

  // 模拟：只有当前用户确实被分配了需要二次分配的资料时才显示
  // 实际应用中这里应该调用API: getLeaderPendingAssignments(userStore.currentUser.id)
  // 超级管理员不需要显示待分配数据，只有部门负责人才需要
  const hasAssignedData = isDepartmentLeader.value
  pendingLeaderAssignments.value = hasAssignedData ? mockAssignedData : []
}





const handleDateFilter = (value: string) => {
  currentDateFilter.value = value
  dateRange.value = null
  dataStore.setFilters({ dateFilter: value })
}

const handleCustomDateChange = () => {
  currentDateFilter.value = ''
  const filters: Partial<DataListParams> = {}
  if (dateRange.value) {
    filters.dateRange = Array.isArray(dateRange.value)
      ? dateRange.value.map(d => d.toISOString().split('T')[0])
      : []
  }
  dataStore.setFilters(filters)
}

const handleQuickFilter = (value: string) => {
  currentDateFilter.value = value
  dateRange.value = null
  dataStore.setFilters({ dateFilter: value })
}

const handleSearch = () => {
  currentPage.value = 1
  const filters: Partial<DataListParams> = {
    searchKeyword: searchKeyword.value
  }

  if (dateRange.value) {
    filters.dateRange = Array.isArray(dateRange.value)
      ? dateRange.value.map(d => d.toISOString().split('T')[0])
      : []
  }

  dataStore.setFilters(filters)
}

const handleStatusFilter = () => {
  currentPage.value = 1
  dataStore.setFilters({ status: statusFilter.value })
}

const handleTabChange = (tab: string) => {
  currentTab.value = tab
  currentPage.value = 1
  selectedItems.value = []
}

const handleSelectionChange = (selection: DataListItem[]) => {
  selectedItems.value = selection
}

const handlePageChange = (page: number) => {
  currentPage.value = page
}

const handlePageSizeChange = () => {
  currentPage.value = 1
}

// DynamicTable 相关方法
const handleSortChange = ({ prop, order }: { prop: string; order: string | null }) => {
  console.log('排序变化:', prop, order)
  // 这里可以添加排序逻辑
}

interface TableColumn {
  prop: string
  label: string
  visible: boolean
  width?: string | number
  minWidth?: string | number
  sortable?: boolean | string
  align?: string
  fixed?: boolean | string
  showOverflowTooltip?: boolean
  formatter?: (row: DataListItem) => string
}

const handleColumnSettingsChange = (columns: TableColumn[]) => {
  console.log('列设置变化:', columns)
  // 更新可见列
  visibleColumns.value = columns.filter(col => col.visible).map(col => col.prop)
}

const getStatusType = (status: string) => {
  const types = {
    pending: '',
    assigned: 'success',
    archived: 'warning',
    recovered: 'info'
  }
  return types[status] || ''
}

const getStatusText = (status: string) => {
  const texts = {
    pending: '待分配',
    assigned: '已分配',
    archived: '已封存',
    recovered: '已回收'
  }
  return texts[status] || status
}

// 判断数据是否为分配来的
const isAllocatedData = (row: DataListItem) => {
  const userStore = useUserStore()
  const currentUserId = userStore.currentUser?.id
  
  // 如果创建者不是当前用户，则认为是分配来的数据
  return row.createdBy && row.createdBy !== currentUserId
}

const viewDetail = (row: DataListItem) => {
  currentCustomerData.value = row
  showCustomerDetailDialog.value = true
}

// 跳转到客户详情页面
const navigateToCustomerDetail = (customerCode: string) => {
  if (customerCode && customerCode !== 'N/A') {
    safeNavigator.push(`/customer/detail?code=${customerCode}`)
  }
}

// 打开批量分配弹窗
const openBatchAssignDialog = () => {
  // 初始化成员列表
  initMembersList()
  showBatchAssignDialog.value = true
}

const assignSingle = (row: DataListItem) => {
  selectedItems.value = [row]
  // 初始化成员列表
  initMembersList()
  showBatchAssignDialog.value = true
}

const reassignSingle = (row: DataListItem) => {
  selectedItems.value = [row]
  // 对于重新分配，强制设置为指定成员分配模式
  assignForm.assignType = 'specific'
  assignForm.assignMode = 'direct'
  assignForm.assignTo = ''
  assignForm.departmentId = ''
  assignForm.remark = ''
  // 初始化成员列表
  initMembersList()
  showBatchAssignDialog.value = true
}

const recoverSingle = async (row: DataListItem) => {
  try {
    await ElMessageBox.confirm('确认要回收这条客户资料吗？', '确认操作', {
      type: 'warning'
    })

    await dataStore.recoverData(row.id)
    ElMessage.success('回收成功')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回收失败')
    }
  }
}

const archiveSingle = (row: DataListItem) => {
  currentArchiveData.value = row
  showArchiveDialog.value = true
}

const deleteSingle = async (row: DataListItem) => {
  try {
    await ElMessageBox.confirm(
      '确认要删除这条客户资料吗？删除后将移至回收站，30天后永久删除。',
      '确认删除',
      {
        type: 'warning',
        confirmButtonText: '确认删除',
        cancelButtonText: '取消'
      }
    )

    await dataStore.deleteData(row.id)
    ElMessage.success('删除成功，已移至回收站')
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 确认封存
const handleArchiveConfirm = async (archiveData: {
  duration: string
  reason: string
  remark: string
  unarchiveTime?: string
}) => {
  if (!currentArchiveData.value) return

  try {
    await dataStore.archiveData({
      dataId: currentArchiveData.value.id,
      duration: archiveData.duration,
      reason: archiveData.reason,
      remark: archiveData.remark,
      unarchiveTime: archiveData.unarchiveTime
    })

    ElMessage.success('封存成功')
    showArchiveDialog.value = false
    currentArchiveData.value = null
  } catch (error) {
    ElMessage.error('封存失败')
  }
}

// 所有系统成员数据
const allSystemMembers = ref([
  { id: '1', name: '张三', account: 'zhangsan', department: '销售一部', phone: '13800138001', status: 'active' },
  { id: '2', name: '李四', account: 'lisi', department: '销售一部', phone: '13800138002', status: 'active' },
  { id: '3', name: '王五', account: 'wangwu', department: '销售二部', phone: '13800138003', status: 'active' },
  { id: '4', name: '赵六', account: 'zhaoliu', department: '销售二部', phone: '13800138004', status: 'active' },
  { id: '5', name: '钱七', account: 'qianqi', department: '销售三部', phone: '13800138005', status: 'active' },
  { id: '6', name: '孙八', account: 'sunba', department: '客服部', phone: '13800138006', status: 'active' },
  { id: '7', name: '周九', account: 'zhoujiu', department: '技术部', phone: '13800138007', status: 'active' },
  { id: '8', name: '吴十', account: 'wushi', department: '销售一部', phone: '13800138008', status: 'active' },
  { id: '9', name: '郑十一', account: 'zhengshiyi', department: '销售二部', phone: '13800138009', status: 'active' },
  { id: '10', name: '王十二', account: 'wangshier', department: '销售三部', phone: '13800138010', status: 'active' },
  { id: '11', name: '李十三', account: 'lishisan', department: '客服部', phone: '13800138011', status: 'active' },
  { id: '12', name: '张十四', account: 'zhangshisi', department: '技术部', phone: '13800138012', status: 'active' }
])

// 成员搜索方法
const searchMembers = async (query: string) => {
  searchingMembers.value = true

  // 模拟搜索延迟
  setTimeout(() => {
    if (!query || query.trim() === '') {
      // 如果没有搜索条件，显示所有活跃成员
      filteredMembers.value = allSystemMembers.value.filter(member => member.status === 'active')
    } else {
      // 根据姓名、账号或手机号搜索
      const searchTerm = query.toLowerCase().trim()
      filteredMembers.value = allSystemMembers.value.filter(member =>
        member.status === 'active' && (
          member.name.includes(query) ||
          member.account.toLowerCase().includes(searchTerm) ||
          member.phone.includes(searchTerm) ||
          member.department.includes(query)
        )
      )
    }

    searchingMembers.value = false
  }, 200)
}

// 初始化成员列表
const initMembersList = () => {
  filteredMembers.value = allSystemMembers.value.filter(member => member.status === 'active')
}

// 客户详情弹窗的快捷操作
const handleQuickAssign = (data: DataListItem) => {
  showCustomerDetailDialog.value = false
  selectedItems.value = [data]
  // 初始化成员列表
  initMembersList()
  showBatchAssignDialog.value = true
}

const handleQuickArchive = (data: DataListItem) => {
  showCustomerDetailDialog.value = false
  archiveSingle(data)
}

const handleQuickRecover = async (data: DataListItem) => {
  showCustomerDetailDialog.value = false
  await recoverSingle(data)
}

const handleBatchArchive = async () => {
  try {
    await ElMessageBox.confirm(`确认要封存选中的 ${selectedItems.value.length} 条资料吗？`, '确认操作', {
      type: 'warning'
    })

    const dataIds = selectedItems.value.map(row => row.id)
    await dataStore.batchArchiveData({ dataIds })

    ElMessage.success('封存成功')
    selectedItems.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('封存失败')
    }
  }
}

const handleBatchRecover = async () => {
  try {
    await ElMessageBox.confirm(`确认要回收选中的 ${selectedItems.value.length} 条资料吗？`, '确认操作', {
      type: 'warning'
    })

    const dataIds = selectedItems.value.map(row => row.id)
    await dataStore.batchRecoverData({ dataIds })

    ElMessage.success('回收成功')
    selectedItems.value = []
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('回收失败')
    }
  }
}

const confirmBatchAssign = async () => {
  // 验证分配方式
  if (isReassigning.value) {
    // 重新分配必须选择成员
    if (!assignForm.assignTo) {
      ElMessage.warning('请选择新的负责人')
      return
    }
  } else {
    // 普通分配的验证
    if (assignForm.assignType === 'specific' && !assignForm.assignTo) {
      ElMessage.warning('请选择分配成员')
      return
    }

    if (assignForm.assignType === 'roundrobin' && !assignForm.departmentId) {
      ElMessage.warning('请选择分配部门')
      return
    }
  }

  assigning.value = true
  try {
    const dataIds = selectedItems.value.map(row => row.id)

    if (isReassigning.value || assignForm.assignType === 'specific') {
      // 指定成员分配
      const assignee = filteredMembers.value.find(item => item.id === assignForm.assignTo)
      if (!assignee) {
        ElMessage.error('分配人员信息错误')
        return
      }

      await dataStore.batchAssignData({
        dataIds,
        assigneeId: assignForm.assignTo,
        assigneeName: assignee.name,
        remark: assignForm.remark
      })

      if (isReassigning.value) {
        ElMessage.success('成功将 ' + selectedItems.value.length + ' 条资料重新分配给 ' + assignee.name)
      } else {
        ElMessage.success('成功分配 ' + selectedItems.value.length + ' 条资料给 ' + assignee.name)
      }
    } else if (assignForm.assignType === 'roundrobin') {
      // 轮流分配
      const department = departments.value.find(dept => dept.id === assignForm.departmentId)
      if (!department) {
        ElMessage.error('部门信息错误')
        return
      }

      // 获取部门成员（模拟数据）
      const departmentMembers = [
        { id: '1', name: '张三', account: 'zhangsan', department: '销售一部' },
        { id: '2', name: '李四', account: 'lisi', department: '销售一部' },
        { id: '3', name: '王五', account: 'wangwu', department: '销售二部' },
        { id: '4', name: '赵六', account: 'zhaoliu', department: '销售二部' },
        { id: '5', name: '钱七', account: 'qianqi', department: '销售三部' },
        { id: '6', name: '孙八', account: 'sunba', department: '客服部' },
        { id: '7', name: '周九', account: 'zhoujiu', department: '技术部' }
      ].filter(member => member.department === department.name)

      if (departmentMembers.length === 0) {
        ElMessage.error('该部门暂无可分配成员')
        return
      }

      // 获取部门负责人（模拟数据）
      const departmentLeader = departmentMembers[0] // 假设第一个成员是负责人

      // 轮流分配
      await dataStore.batchRoundRobinAssignData({
        dataIds,
        departmentId: assignForm.departmentId,
        departmentName: department.name,
        members: departmentMembers,
        mode: assignForm.assignMode,
        leaderId: assignForm.assignMode === 'leader' ? departmentLeader.id : undefined,
        leaderName: assignForm.assignMode === 'leader' ? departmentLeader.name : undefined,
        remark: assignForm.remark
      })

      if (assignForm.assignMode === 'leader') {
        ElMessage.success('成功将 ' + selectedItems.value.length + ' 条资料分配给 ' + department.name + ' 负责人 ' + departmentLeader.name + '，请负责人进行二次分配')
      } else {
        ElMessage.success('成功将 ' + selectedItems.value.length + ' 条资料轮流分配给 ' + department.name + ' 的 ' + departmentMembers.length + ' 名成员')
      }
    } else if (assignForm.assignType === 'cross_department') {
      // 跨部门智能分配
      if (assignForm.crossDepartmentStrategy === 'manual' && assignForm.selectedDepartments.length === 0) {
        ElMessage.warning('请选择参与分配的部门')
        return
      }

      // 获取参与分配的部门
      let targetDepartments = []
      if (assignForm.crossDepartmentStrategy === 'manual') {
        targetDepartments = departments.value.filter(dept =>
          assignForm.selectedDepartments.includes(dept.id)
        )
      } else {
        // 自动选择所有部门
        targetDepartments = departments.value
      }

      if (targetDepartments.length === 0) {
        ElMessage.error('没有可分配的部门')
        return
      }

      // 模拟跨部门智能分配逻辑
      const allMembers = [
        { id: '1', name: '张三', account: 'zhangsan', department: '销售一部', workload: 5, performance: 85 },
        { id: '2', name: '李四', account: 'lisi', department: '销售一部', workload: 3, performance: 92 },
        { id: '3', name: '王五', account: 'wangwu', department: '销售二部', workload: 7, performance: 78 },
        { id: '4', name: '赵六', account: 'zhaoliu', department: '销售二部', workload: 2, performance: 88 },
        { id: '5', name: '钱七', account: 'qianqi', department: '销售三部', workload: 4, performance: 90 },
        { id: '6', name: '孙八', account: 'sunba', department: '客服部', workload: 6, performance: 82 },
        { id: '7', name: '周九', account: 'zhoujiu', department: '技术部', workload: 1, performance: 95 }
      ]

      // 筛选目标部门的成员
      const targetMembers = allMembers.filter(member =>
        targetDepartments.some(dept => dept.name === member.department)
      )

      // 根据策略排序成员
      const sortedMembers = [...targetMembers]
      if (assignForm.crossDepartmentStrategy === 'workload') {
        // 按工作负载升序排序（负载低的优先）
        sortedMembers.sort((a, b) => a.workload - b.workload)
      } else if (assignForm.crossDepartmentStrategy === 'performance') {
        // 按业绩降序排序（业绩高的优先）
        sortedMembers.sort((a, b) => b.performance - a.performance)
      }

      // 智能分配逻辑
      const assignments = []
      dataIds.forEach((dataId, index) => {
        const memberIndex = index % sortedMembers.length
        const member = sortedMembers[memberIndex]
        assignments.push({
          dataId,
          assigneeId: member.id,
          assigneeName: member.name,
          department: member.department
        })
      })

      // 批量跨部门分配
      await dataStore.batchCrossDepartmentAssignData({
        assignments,
        strategy: assignForm.crossDepartmentStrategy,
        targetDepartments: targetDepartments.map(dept => ({ id: dept.id, name: dept.name })),
        remark: assignForm.remark
      })

      const strategyText = {
        workload: '工作负载均衡',
        performance: '业绩表现优先',
        manual: '手动选择部门'
      }[assignForm.crossDepartmentStrategy]

      ElMessage.success('成功使用"' + strategyText + '"策略将 ' + selectedItems.value.length + ' 条资料跨部门分配给 ' + targetDepartments.length + ' 个部门的 ' + sortedMembers.length + ' 名成员')
    }

    showBatchAssignDialog.value = false
    selectedItems.value = []
    // 重置表单
    assignForm.assignType = 'specific'
    assignForm.assignMode = 'direct'
    assignForm.assignTo = ''
    assignForm.departmentId = ''
    assignForm.crossDepartmentStrategy = 'workload'
    assignForm.selectedDepartments = []
    assignForm.remark = ''
    filteredMembers.value = []
  } catch (error) {
    ElMessage.error('分配失败')
  } finally {
    assigning.value = false
  }
}

const loadData = async () => {
  try {
    await dataStore.fetchDataList()
  } catch (error) {
    ElMessage.error('加载数据失败')
  }
}

onMounted(async () => {
  try {
    // 初始化可见列
    visibleColumns.value = allTableColumns.filter(col => col.visible).map(col => col.prop)
    
    // 设置默认日期筛选为今日
    dataStore.setFilters({ dateFilter: 'today' })
    // 获取可分配成员列表
    await dataStore.fetchAssigneeOptions()
    // 初始化部门数据
    departmentStore.initData()
    // 获取数据列表
    await loadData()
    // 加载部门负责人待分配数据
    loadPendingLeaderAssignments()
  } catch (error) {
    ElMessage.error('初始化失败')
  }
})
</script>

<style scoped>
.data-list-container {
  padding: 24px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 24px;
}

.header-content {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.page-title {
  display: flex;
  align-items: center;
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 8px 0;
}

.title-icon {
  margin-right: 12px;
  color: #3b82f6;
}

.page-description {
  color: #6b7280;
  margin: 0;
  font-size: 14px;
}

.title-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.title-section {
  flex: 1;
}

.user-role-demo {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 6px;
  font-size: 12px;
}

.leader-assign-alert {
  margin-top: 16px;
}

.alert-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 24px;
}

.card-item {
  background: white;
  padding: 24px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  transition: transform 0.2s ease;
}

.card-item:hover {
  transform: translateY(-2px);
}

.card-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 20px;
  color: white;
}

.card-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.card-icon.pending {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.card-icon.assigned {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.card-icon.archived {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.card-content {
  flex: 1;
}

.card-number {
  font-size: 28px;
  font-weight: 700;
  color: #1f2937;
  line-height: 1;
}

.card-label {
  font-size: 14px;
  color: #6b7280;
  margin-top: 4px;
}

.filter-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  margin-bottom: 24px;
  overflow: hidden;
}

.filter-header {
  padding: 20px 24px 0;
  border-bottom: 1px solid #e5e7eb;
}

.filter-header h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.quick-filter-container {
  background: transparent;
  padding: 16px 0;
  margin-bottom: 16px;
}

.filter-card {
  margin-bottom: 24px;
}

.filter-content {
  padding: 20px 24px;
  width: 100%;
}

.quick-filters {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0;
  flex-wrap: wrap;
}

.filter-label {
  font-size: 14px;
  font-weight: 600;
  color: #374151;
  white-space: nowrap;
}

.filter-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.quick-filter-container .filter-buttons .el-button {
  border-radius: 20px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  font-weight: 500;
  padding: 6px 16px;
  transition: all 0.2s ease;
}

.quick-filter-container .filter-buttons .el-button:hover {
  border-color: #3b82f6;
  color: #3b82f6;
  background: #f8fafc;
}

.quick-filter-container .filter-buttons .el-button--primary {
  background: #3b82f6;
  border-color: #3b82f6;
  color: white;
}

.quick-filter-container .filter-buttons .el-button--primary:hover {
  background: #2563eb;
  border-color: #2563eb;
}

.search-filters {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.search-filters .search-input {
  width: 280px;
  flex-shrink: 0;
}

.search-filters .date-picker {
  width: 35%;
  flex-shrink: 0;
  min-width: 240px;
}

.search-filters .status-filter {
  width: 140px;
  flex-shrink: 0;
}

.date-filters {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
  flex-wrap: wrap;
}

.date-filter-btn {
  border-radius: 8px;
  border: 1px solid #e5e7eb;
  background: white;
  color: #6b7280;
  transition: all 0.2s ease;
}

.date-filter-btn:hover {
  border-color: #3b82f6;
  color: #3b82f6;
}

.main-filters {
  display: flex;
  gap: 16px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.date-picker {
  width: 40%;
  flex-shrink: 0;
}

.search-input {
  width: 320px;
  flex-shrink: 0;
}

.status-select {
  width: 140px;
  flex-shrink: 0;
}

.list-section {
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  overflow: hidden;
}

.list-header {
  padding: 20px 24px 24px 24px;
}

.header-top-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}

.nav-tabs {
  display: flex;
  gap: 8px;
  flex: 1;
}

.nav-tab {
  padding: 8px 16px;
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: all 0.2s ease;
  border: 1px solid #e5e7eb;
  background: #f9fafb;
  color: #6b7280;
}

.nav-tab:hover {
  background: #f3f4f6;
}

.nav-tab.active {
  background: #3b82f6;
  color: white;
  border-color: #3b82f6;
}

.tab-label {
  font-weight: 500;
}

.tab-count {
  background: rgba(255, 255, 255, 0.2);
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 600;
}

.nav-tab:not(.active) .tab-count {
  background: #e5e7eb;
  color: #6b7280;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-shrink: 0;
}

.filters {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
}

.search-input {
  width: 240px;
}

.date-picker {
  width: 240px;
}

.batch-operations {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  align-items: center;
}

.table-settings {
  flex-shrink: 0;
}

.table-settings {
  display: flex;
  gap: 8px;
  align-items: center;
}

.table-container {
  padding: 0 24px 24px;
}

.data-table {
  margin-bottom: 20px;
}

.amount {
  font-weight: 600;
  color: #059669;
}

/* 客户编码链接样式 */
.code-link {
  color: #3b82f6;
  cursor: pointer;
  padding: 4px 8px;
  border: 1px solid #e5e7eb;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-radius: 6px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-weight: 500;
  font-size: 12px;
  letter-spacing: 0.5px;
  transition: all 0.2s ease;
  display: inline-block;
  min-height: 24px;
  line-height: 16px;
  user-select: none;
}

.code-link:hover {
  background: linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%);
  border-color: #3b82f6;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(59, 130, 246, 0.1);
}

.code-link:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(59, 130, 246, 0.1);
}

/* 分配标识样式 */
.self-created {
  font-size: 12px;
  color: #909399;
  font-weight: 500;
}

.pagination-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 16px;
}

.pagination-info {
  display: flex;
  align-items: center;
  gap: 8px;
  color: #6b7280;
  font-size: 14px;
}

.page-size-select {
  width: 80px;
}

.assign-dialog-content {
  padding: 20px 0;
}

.assign-info {
  margin-bottom: 20px;
  padding: 16px;
  background: #f0f9ff;
  border-radius: 8px;
  border-left: 4px solid #3b82f6;
}

.assign-info p {
  margin: 0;
  color: #1e40af;
}

/* 分配预览样式 */
.assign-preview-section {
  margin-top: 24px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
  border: 1px solid #e5e7eb;
}

.preview-header h4 {
  margin: 0 0 16px 0;
  font-size: 16px;
  font-weight: 600;
  color: #374151;
}

.preview-stats {
  display: flex;
  gap: 24px;
  margin-bottom: 16px;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 6px;
  border: 1px solid #e5e7eb;
  min-width: 80px;
}

.stat-label {
  font-size: 12px;
  color: #6b7280;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 16px;
  font-weight: 600;
  color: #1f2937;
}

.special-materials-table {
  margin-top: 16px;
}

.table-header h5 {
  margin: 0 0 12px 0;
  font-size: 14px;
  font-weight: 600;
  color: #374151;
}

.more-data-tip {
  text-align: center;
  padding: 8px;
  background: #f9fafb;
  border-top: 1px solid #e5e7eb;
}

.assign-info-section {
  margin-bottom: 20px;
}

/* 成员选择样式 */
.el-select-dropdown__item {
  height: auto !important;
  padding: 8px 20px !important;
  line-height: 1.4 !important;
}

.el-select-dropdown__item:hover {
  background-color: #f5f7fa !important;
}

.el-select-dropdown__item.selected {
  background-color: #ecf5ff !important;
  color: #409eff !important;
}

/* 成员信息显示样式 */
.member-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.member-main-info {
  flex: 1;
}

.member-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.member-details {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 8px;
}

.member-department {
  color: #67c23a;
}

.member-phone {
  color: #909399;
}

/* 新的分配预览样式 */
.assign-preview-section {
  margin-top: 24px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  background: #ffffff;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid #e4e7ed;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 8px;
}

.preview-icon {
  color: #409eff;
  font-size: 18px;
}

.preview-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

/* 紧凑的分配对象信息 - 在预览头部右侧 */
.target-info-compact {
  display: flex;
  flex-direction: column;
  gap: 4px;
  align-items: flex-end;
}

.target-header-compact {
  display: flex;
  align-items: center;
  gap: 6px;
}

.target-header-compact .target-icon {
  color: #409eff;
  font-size: 14px;
}

.target-header-compact .target-title {
  font-size: 13px;
  font-weight: 600;
  color: #409eff;
}

.target-detail-compact {
  display: flex;
  gap: 12px;
  font-size: 11px;
}

.target-detail-compact .detail-item {
  display: flex;
  align-items: center;
  gap: 3px;
  color: #606266;
}



.assign-info-cards {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding: 16px;
}

/* 分配对象行样式 */
.assign-target-row {
  background: #f8fafc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px 16px;
}

.target-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.target-icon {
  color: #409eff;
  font-size: 16px;
}

.target-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.target-info {
  font-size: 14px;
  font-weight: 600;
  color: #409eff;
}

.target-detail {
  display: flex;
  gap: 16px;
  margin-left: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #606266;
}

/* 分配统计行样式 */
.assign-stats-row {
  background: #f8fafc;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 12px 16px;
}

.stats-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.stats-icon {
  color: #67c23a;
  font-size: 16px;
}

.stats-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}



.info-card {
  background: #ffffff;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
}

.info-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  transform: translateY(-2px);
}

.card-header {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid #e4e7ed;
}

.card-icon {
  font-size: 16px;
  color: #409eff;
}

.card-title {
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.card-content {
  padding: 12px;
}

.target-info {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.target-detail {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
}

.detail-item .el-icon {
  font-size: 14px;
  color: #909399;
}

.stats-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 12px;
}

.stat-item {
  text-align: center;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #409eff;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.customer-preview {
  margin: 0 8px 8px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.preview-table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e4e7ed;
}

.table-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.table-title .el-icon {
  color: #409eff;
  font-size: 14px;
}

.preview-table-container {
  transition: all 0.3s ease;
}

.preview-table-container.expanded {
  max-height: 400px;
}

.preview-table {
  border: none !important;
}

.preview-table .el-table__header {
  background: #fafafa;
}

.amount-text {
  font-weight: 600;
}

.amount-text.high-value {
  color: #f56c6c;
}

.more-data-tip {
  text-align: center;
  padding: 8px;
  background: #f8fafc;
  border-top: 1px solid #e4e7ed;
  color: #909399;
  font-size: 12px;
}

.more-data-tip .el-icon {
  margin-right: 4px;
}

.remark-preview {
  margin: 0 8px 8px 8px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  overflow: hidden;
}

.remark-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  background: #f8fafc;
  border-bottom: 1px solid #e4e7ed;
  font-size: 13px;
  font-weight: 600;
  color: #303133;
}

.remark-header .el-icon {
  color: #409eff;
}

.remark-content {
  padding: 12px;
  font-size: 14px;
  color: #606266;
  line-height: 1.6;
  background: #fafafa;
}

/* 响应式设计 */
/* 中等屏幕 (平板) */
@media (max-width: 1024px) and (min-width: 769px) {
  .main-filters {
    gap: 12px;
  }
  
  .date-picker {
    width: 35%;
  }
  
  .search-input {
    width: 280px;
  }
  
  .status-select {
    width: 120px;
  }
}

@media (max-width: 768px) {
  .assign-info-cards {
    grid-template-columns: 1fr;
    gap: 12px;
    padding: 16px;
  }
  
  .customer-preview {
    margin: 0 16px 16px 16px;
  }
  
  .remark-preview {
    margin: 0 16px 16px 16px;
  }
}

@media (max-width: 768px) {
  .data-list-container {
    padding: 16px;
  }

  .summary-cards {
    grid-template-columns: 1fr;
  }

  .main-filters {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  .date-picker,
  .search-input,
  .status-select {
    width: 100%;
  }

  .list-header {
    flex-direction: column;
    align-items: stretch;
  }

  .nav-tabs {
    justify-content: center;
  }

  .list-actions {
    justify-content: center;
  }
}
</style>
