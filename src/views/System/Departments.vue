<template>
  <div class="departments-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <h2 class="page-title">部门管理</h2>
      <div class="header-actions">
        <el-button type="warning" :icon="QuestionFilled" @click="handleShowGuide" class="guide-btn">
          操作指南
        </el-button>
        <el-button type="success" :icon="FullScreen" @click="handleFullScreen" class="fullscreen-btn">
          全屏查看
        </el-button>
        <!-- 角色管理按钮已注释 - 部门只做组织架构管理，角色管理在独立的角色管理菜单中 -->
        <!-- <el-button type="info" :icon="UserFilled" @click="handleRoleManagement" class="role-btn">
          角色管理
        </el-button> -->
        <el-button type="primary" :icon="Plus" @click="handleAddDepartment" class="add-btn">
          新建部门
        </el-button>
      </div>
    </div>

    <!-- 数据汇总卡片 -->
    <div class="stats-cards">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ departmentStore.stats.totalDepartments }}</div>
              <div class="stat-label">总部门数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon active">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ departmentStore.stats.activeDepartments }}</div>
              <div class="stat-label">活跃部门</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon members">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ departmentStore.stats.totalMembers }}</div>
              <div class="stat-label">总成员数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon hierarchy">
              <el-icon><Histogram /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ Object.keys(departmentStore.stats.departmentsByType).length }}</div>
              <div class="stat-label">层级类型</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-row :gutter="20" align="middle">
        <el-col :span="8">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索部门名称或编码"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-select v-model="statusFilter" placeholder="部门状态" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="levelFilter" placeholder="部门层级" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="一级部门" value="1" />
            <el-option label="二级部门" value="2" />
            <el-option label="三级部门" value="3" />
          </el-select>
        </el-col>
        <el-col :span="4">
          <el-button :icon="Refresh" @click="handleRefresh" class="refresh-btn">
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 部门列表 -->
    <div class="department-list-section">
      <div class="section-header">
        <h3 class="section-title">
          <el-icon><OfficeBuilding /></el-icon>
          部门列表
        </h3>
        <div class="section-actions">
          <!-- 视图切换 -->
          <el-button-group class="view-toggle">
            <el-button
              :type="viewMode === 'card' ? 'primary' : 'default'"
              @click="handleViewModeChange('card')"
              size="small"
            >
              <el-icon><Grid /></el-icon>
              卡片
            </el-button>
            <el-button
              :type="viewMode === 'table' ? 'primary' : 'default'"
              @click="handleViewModeChange('table')"
              size="small"
            >
              <el-icon><List /></el-icon>
              列表
            </el-button>
          </el-button-group>

          <el-button type="primary" @click="handleAddDepartment">
            <el-icon><Plus /></el-icon>
            新建部门
          </el-button>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" v-loading="departmentStore.loading" class="department-cards-container">
        <div v-if="filteredDepartments.length === 0" class="empty-state">
          <el-empty description="暂无部门数据" />
        </div>

        <div v-else class="department-cards-grid">
          <div
            v-for="department in filteredDepartments"
            :key="department.id"
            class="department-card"
            :class="{ 'inactive': department.status === 'inactive' }"
          >
            <!-- 卡片头部 -->
            <div class="card-header">
              <div class="department-info">
                <div class="department-icon">
                  <el-icon v-if="department.level === 1"><OfficeBuilding /></el-icon>
                  <el-icon v-else><Collection /></el-icon>
                </div>
                <div class="department-details">
                  <h4 class="department-name">{{ department.name }}</h4>
                  <p class="department-code">{{ department.code }}</p>
                </div>
              </div>
              <div class="department-status">
                <el-switch
                  v-model="department.status"
                  active-value="active"
                  inactive-value="inactive"
                  :loading="department.statusLoading"
                  @change="handleStatusToggle(department)"
                />
              </div>
            </div>

            <!-- 卡片内容 - 表格式布局 -->
            <div class="card-content">
              <div class="info-table">
                <div class="info-row">
                  <span class="info-label">负责人</span>
                  <span class="info-value">
                    {{ department.managerName || '未设置' }}
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">成员数量</span>
                  <span class="info-value">
                    <el-link type="primary" @click="handleViewMembers(department)">
                      {{ department.memberCount }}人
                    </el-link>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">部门层级</span>
                  <span class="info-value">
                    <el-tag :type="getLevelTagType(department.level)" size="small">
                      {{ department.level }}级
                    </el-tag>
                  </span>
                </div>
                <div class="info-row">
                  <span class="info-label">更新时间</span>
                  <span class="info-value">{{ formatDate(department.updatedAt) }}</span>
                </div>
                <div v-if="department.description" class="info-row">
                  <span class="info-label">描述</span>
                  <span class="info-value">{{ department.description }}</span>
                </div>
              </div>
            </div>

            <!-- 卡片操作栏 -->
             <div class="card-actions">
               <div class="action-buttons">
                 <el-button type="primary" link size="small" @click="handleViewDepartment(department)">
                   <el-icon><View /></el-icon>
                   详情
                 </el-button>
                 <el-button type="primary" link size="small" @click="handleEditDepartment(department)">
                   <el-icon><Edit /></el-icon>
                   编辑
                 </el-button>
                 <el-dropdown trigger="click" @command="(command: string) => handleDropdownCommand(command, department)">
                   <el-button type="primary" link size="small">
                     <el-icon><MoreFilled /></el-icon>
                     更多
                   </el-button>
                   <template #dropdown>
                     <el-dropdown-menu>
                       <!-- 权限配置已注释 - 部门只做组织架构管理，不涉及权限配置 -->
                       <!-- <el-dropdown-item command="permission">
                         <el-icon><Lock /></el-icon>
                         权限配置
                       </el-dropdown-item> -->
                       <el-dropdown-item command="members">
                         <el-icon><UserFilled /></el-icon>
                         成员配置
                       </el-dropdown-item>
                       <el-dropdown-item command="move" :disabled="department.level === 1">
                         <el-icon><Rank /></el-icon>
                         移动部门
                       </el-dropdown-item>
                       <el-tooltip
                         :content="isSystemPresetDepartment(department) ? '系统预设部门不可删除' : (department.children && department.children.length > 0 ? '有子部门，不可删除' : '')"
                         :disabled="!isSystemPresetDepartment(department) && !(department.children && department.children.length > 0)"
                         placement="left"
                       >
                         <el-dropdown-item command="delete" :disabled="isSystemPresetDepartment(department) || (department.children && department.children.length > 0)">
                           <el-icon><Delete /></el-icon>
                           删除部门
                         </el-dropdown-item>
                       </el-tooltip>
                     </el-dropdown-menu>
                   </template>
                 </el-dropdown>
               </div>
             </div>

            <!-- 子部门指示器 - 可点击查看子部门 -->
            <div v-if="department.children && department.children.length > 0" class="children-indicator">
              <el-button
                type="primary"
                link
                @click="handleViewDepartment(department)"
                class="children-link"
              >
                <el-icon><Collection /></el-icon>
                {{ department.children.length }}个子部门
              </el-button>
            </div>
          </div>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-else-if="viewMode === 'table'" v-loading="departmentStore.loading">
        <DynamicTable
          :data="filteredDepartments as any"
          :columns="tableColumns"
          storage-key="department-list-columns"
          title="部门列表"
          :show-selection="false"
          :show-index="true"
          :show-pagination="true"
          :show-actions="true"
          :actions-width="350"
          :page-size="10"
          :total="filteredDepartments.length"
          @column-settings-change="handleColumnSettingsChange"
        >
          <!-- 启用状态开关插槽 -->
          <template #column-statusSwitch="{ row }">
            <el-tooltip
              :content="isNonDisableableDepartment(row) ? '系统预设部门不可禁用' : (row.status === 'active' ? '点击禁用' : '点击启用')"
              placement="top"
            >
              <el-switch
                v-model="row.status"
                active-value="active"
                inactive-value="inactive"
                :loading="row.statusLoading"
                :disabled="isNonDisableableDepartment(row)"
                @change="handleStatusToggle(row)"
              />
            </el-tooltip>
          </template>

          <!-- 部门名称插槽 -->
          <template #column-name="{ row }">
            <div class="department-name-cell">
              <el-icon v-if="row.level === 1"><OfficeBuilding /></el-icon>
              <el-icon v-else><Collection /></el-icon>
              <span>{{ row.name }}</span>
            </div>
          </template>

          <!-- 负责人插槽 -->
          <template #column-managerName="{ row }">
            <span v-if="row.managerName">{{ row.managerName }}</span>
            <span v-else class="text-gray">未设置</span>
          </template>

          <!-- 成员数量插槽 -->
          <template #column-memberCount="{ row }">
            <el-tag type="info" size="small">{{ row.memberCount }}人</el-tag>
          </template>

          <!-- 层级插槽 -->
          <template #column-level="{ row }">
            <el-tag :type="getLevelTagType(row.level)" size="small">
              {{ row.level }}级
            </el-tag>
          </template>

          <!-- 状态插槽 -->
          <template #column-status="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '活跃' : '停用' }}
            </el-tag>
          </template>

          <!-- 更新时间插槽 -->
          <template #column-updatedAt="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>

          <!-- 操作插槽 -->
          <template #table-actions="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDepartment(row)">
              <el-icon><View /></el-icon>
              详情
            </el-button>
            <el-button type="primary" link size="small" @click="handleEditDepartment(row)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <!-- 权限配置已注释 - 部门只做组织架构管理，不涉及权限配置 -->
            <!-- <el-button type="primary" link size="small" @click="handlePermissionConfig(row)">
              <el-icon><Lock /></el-icon>
              权限
            </el-button> -->
            <el-button type="primary" link size="small" @click="handleMemberConfig(row)">
              <el-icon><UserFilled /></el-icon>
              成员
            </el-button>
            <el-button
              type="warning"
              link
              size="small"
              @click="handleMoveDepartment(row)"
              :disabled="row.level === 1"
            >
              <el-icon><Rank /></el-icon>
              移动
            </el-button>
            <el-tooltip
              :content="isSystemPresetDepartment(row) ? '系统预设部门不可删除' : (row.children && row.children.length > 0 ? '有子部门，不可删除' : '')"
              :disabled="!isSystemPresetDepartment(row) && !(row.children && row.children.length > 0)"
              placement="top"
            >
              <el-button
                type="danger"
                link
                size="small"
                @click="handleDeleteDepartment(row)"
                :disabled="isSystemPresetDepartment(row) || (row.children && row.children.length > 0)"
              >
                <el-icon><Delete /></el-icon>
                删除
              </el-button>
            </el-tooltip>
          </template>
        </DynamicTable>
      </div>
    </div>

    <!-- 新建/编辑部门弹窗 -->
    <DepartmentDialog
      v-model="dialogVisible"
      :department="currentDepartment"
      :is-edit="isEdit"
      @success="handleDialogSuccess"
    />

    <!-- 移动部门弹窗 -->
    <MoveDepartmentDialog
      v-model="moveDialogVisible"
      :department="currentDepartment"
      @success="handleMoveSuccess"
    />

    <!-- 权限配置弹窗 -->
    <PermissionDialog
      v-model="permissionDialogVisible"
      :department="currentDepartment"
      @success="handlePermissionSuccess"
    />

    <!-- 操作指南弹窗 -->
    <el-dialog
      v-model="guideDialogVisible"
      title="部门管理操作指南"
      width="70%"
      :close-on-click-modal="false"
      class="guide-dialog"
    >
      <div class="guide-content">
        <div class="guide-section">
          <h3>📋 概述</h3>
          <p>部门管理用于构建和维护企业的组织架构。通过部门的层级结构，可以清晰地管理团队分工和人员归属关系。</p>
        </div>

        <div class="guide-section">
          <h3>🏢 核心概念</h3>
          <div class="guide-subsection">
            <ul>
              <li><strong>部门</strong>：组织的基本单位，用于划分不同的业务团队</li>
              <li><strong>层级结构</strong>：支持多级部门嵌套（如：公司 > 事业部 > 小组），形成完整的组织架构树</li>
              <li><strong>部门负责人</strong>：每个部门可指定一名负责人，便于管理和沟通</li>
              <li><strong>成员归属</strong>：每个成员必须归属于一个部门，确保组织架构完整</li>
            </ul>
          </div>
        </div>

        <div class="guide-section">
          <h3>⚙️ 功能说明</h3>
          <div class="feature-grid">
            <div class="feature-item">
              <h5>📋 部门列表</h5>
              <ul>
                <li>表格视图展示所有部门及其层级关系</li>
                <li>显示部门名称、编码、负责人、成员数等信息</li>
                <li>支持按部门名称或编码搜索</li>
              </ul>
            </div>
            <div class="feature-item">
              <h5>➕ 新建部门</h5>
              <ul>
                <li>填写部门名称和编码（编码自动生成）</li>
                <li>选择上级部门（不选则为顶级部门）</li>
                <li>指定部门负责人（可选）</li>
                <li>设置排序和启用状态</li>
              </ul>
            </div>
            <div class="feature-item">
              <h5>👥 成员管理</h5>
              <ul>
                <li>点击"成员配置"进入成员管理页面</li>
                <li>添加成员、批量导入、编辑成员信息</li>
                <li>移除成员时需指定转入的新部门</li>
                <li>查看成员的在职天数、角色等详细信息</li>
              </ul>
            </div>
            <div class="feature-item">
              <h5>🔄 部门调整</h5>
              <ul>
                <li>编辑部门基本信息（名称、负责人等）</li>
                <li>调整上下级关系（移动部门层级）</li>
                <li>停用/启用部门</li>
                <li>删除空部门（需先转移所有成员）</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h3>📝 常用操作步骤</h3>
          <div class="steps-grid">
            <div class="step-item">
              <h5>1️⃣ 创建部门</h5>
              <ol>
                <li>点击右上角"新建部门"按钮</li>
                <li>填写部门名称（编码自动生成）</li>
                <li>选择上级部门和负责人</li>
                <li>点击"创建"完成</li>
              </ol>
            </div>
            <div class="step-item">
              <h5>2️⃣ 管理成员</h5>
              <ol>
                <li>在部门列表点击"成员配置"</li>
                <li>点击"添加成员"选择人员加入</li>
                <li>可编辑成员信息或调整角色</li>
                <li>移除成员时选择新的归属部门</li>
              </ol>
            </div>
            <div class="step-item">
              <h5>3️⃣ 调整架构</h5>
              <ol>
                <li>编辑部门可更改上级部门</li>
                <li>子部门会随父部门一起移动</li>
                <li>调整后成员关系保持不变</li>
              </ol>
            </div>
            <div class="step-item">
              <h5>4️⃣ 查看详情</h5>
              <ol>
                <li>点击部门的"详情"按钮</li>
                <li>查看部门完整信息和统计</li>
                <li>查看该部门下的成员列表</li>
              </ol>
            </div>
          </div>
        </div>

        <div class="guide-section">
          <h3>⚠️ 注意事项</h3>
          <ul>
            <li>删除部门前须将部门内成员全部转移至其他部门</li>
            <li>每个成员必须归属一个部门，移除成员时需指定新部门</li>
            <li>部门编码创建后建议不要随意修改，可能影响系统关联</li>
            <li>组织架构调整建议在非工作高峰时段进行</li>
          </ul>
        </div>

        <div class="guide-section">
          <h3>🆘 常见问题</h3>
          <div class="faq-list">
            <div class="faq-item">
              <h5>Q: 如何快速找到某个部门？</h5>
              <p>A: 使用页面顶部的搜索框，输入部门名称或编码即可快速定位。</p>
            </div>
            <div class="faq-item">
              <h5>Q: 移除成员后成员去了哪里？</h5>
              <p>A: 移除时系统会要求您选择一个目标部门，成员将自动转入该部门。</p>
            </div>
            <div class="faq-item">
              <h5>Q: 可以将部门从一个上级移到另一个上级吗？</h5>
              <p>A: 可以。编辑部门信息，修改"上级部门"字段即可完成层级调整。</p>
            </div>
            <div class="faq-item">
              <h5>Q: 部门的权限在哪里管理？</h5>
              <p>A: 权限管理在"角色权限"模块中进行，部门仅负责组织架构层级管理。</p>
            </div>
          </div>
        </div>

        <div class="guide-footer">
          <p>💡 <strong>提示</strong>：部门管理专注于组织架构，权限配置请前往"角色权限"模块操作。</p>
        </div>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="guideDialogVisible = false">关闭</el-button>
          <el-button type="primary" @click="guideDialogVisible = false">我知道了</el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import {
  Plus,
  Search,
  Refresh,
  OfficeBuilding,
  Collection,
  User,
  UserFilled,
  Check,
  Histogram,
  FullScreen,
  View,
  Edit,
  MoreFilled,
  Rank,
  Delete,
  Grid,
  List,
  QuestionFilled
} from '@element-plus/icons-vue'
import { useDepartmentStore, type Department } from '@/stores/department'
import DepartmentDialog from '@/components/Department/DepartmentDialog.vue'
import MoveDepartmentDialog from '@/components/Department/MoveDepartmentDialog.vue'
import { formatDateTime } from '@/utils/dateFormat'
import PermissionDialog from '@/components/Department/PermissionDialog.vue'
import DynamicTable from '@/components/DynamicTable.vue'

const router = useRouter()
const route = useRoute()
const safeNavigator = createSafeNavigator(router)
const departmentStore = useDepartmentStore()

// 响应式数据
const searchKeyword = ref('')
const statusFilter = ref('')
const levelFilter = ref('')
const dialogVisible = ref(false)
const moveDialogVisible = ref(false)
const permissionDialogVisible = ref(false)
const guideDialogVisible = ref(false)
const currentDepartment = ref<Department | null>(null)
const isEdit = ref(false)
const viewMode = ref<'card' | 'table'>('card') // 视图模式：卡片或表格

// 计算属性
const filteredDepartments = computed(() => {
  let departments = departmentStore.departmentTree

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    departments = filterDepartmentsByKeyword(departments, keyword)
  }

  // 状态过滤
  if (statusFilter.value) {
    departments = filterDepartmentsByStatus(departments, statusFilter.value)
  }

  // 层级过滤
  if (levelFilter.value) {
    departments = filterDepartmentsByLevel(departments, parseInt(levelFilter.value))
  }

  return departments
})

// 递归搜索部门
const filterDepartmentsByKeyword = (departments: Department[], keyword: string): Department[] => {
  return departments.filter(dept => {
    const matchesCurrent = dept.name.toLowerCase().includes(keyword) ||
                          dept.code.toLowerCase().includes(keyword)
    const matchesChildren = dept.children && dept.children.length > 0 &&
                           filterDepartmentsByKeyword(dept.children, keyword).length > 0

    if (matchesCurrent || matchesChildren) {
      return {
        ...dept,
        children: dept.children ? filterDepartmentsByKeyword(dept.children, keyword) : []
      }
    }
    return false
  }).map(dept => ({
    ...dept,
    children: dept.children ? filterDepartmentsByKeyword(dept.children, keyword) : []
  }))
}

// 按状态过滤
const filterDepartmentsByStatus = (departments: Department[], status: string): Department[] => {
  return departments.map(dept => {
    // 递归过滤子部门
    const filteredChildren = dept.children ? filterDepartmentsByStatus(dept.children, status) : []

    // 如果当前部门匹配状态，或者有子部门匹配，则保留
    if (dept.status === status || filteredChildren.length > 0) {
      return {
        ...dept,
        children: filteredChildren
      }
    }
    return null
  }).filter(dept => dept !== null) as Department[]
}

// 按层级过滤
const filterDepartmentsByLevel = (departments: Department[], level: number): Department[] => {
  return departments.filter(dept => dept.level === level).map(dept => ({
    ...dept,
    children: dept.children ? filterDepartmentsByLevel(dept.children, level) : []
  }))
}

// 获取层级标签类型
const getLevelTagType = (level: number) => {
  const types = ['', 'primary', 'success', 'warning', 'danger']
  return types[level] || 'info'
}

// 格式化日期 - 使用统一的formatDateTime
const formatDate = formatDateTime

// 事件处理
const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
}

const handleFilter = () => {
  // 过滤逻辑已在计算属性中处理
}

const handleRefresh = async () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  levelFilter.value = ''
  try {
    await departmentStore.fetchDepartments()
    ElMessage.success('数据已刷新')
  } catch (error) {
    ElMessage.error('刷新失败')
  }
}

const handleAddDepartment = () => {
  currentDepartment.value = null
  isEdit.value = false
  dialogVisible.value = true
}

const handleEditDepartment = (department: Department) => {
  currentDepartment.value = department
  isEdit.value = true
  dialogVisible.value = true
}

const handleViewDepartment = (department: Department) => {
  safeNavigator.push(`/system/department/detail/${department.id}`)
}

const handlePermissionConfig = (department: Department) => {
  currentDepartment.value = department
  permissionDialogVisible.value = true
}

const handleMemberConfig = (department: Department) => {
  safeNavigator.push(`/system/department/members/${department.id}`)
}

// 下拉菜单命令处理
const handleDropdownCommand = (command: string, department: Department) => {
  switch (command) {
    case 'permission':
      handlePermissionConfig(department)
      break
    case 'members':
      handleMemberConfig(department)
      break
    case 'move':
      handleMoveDepartment(department)
      break
    case 'delete':
      handleDeleteDepartment(department)
      break
  }
}

const handleViewMembers = (department: Department) => {
  safeNavigator.push(`/system/department/members/${department.id}`)
}

const handleMoveDepartment = (department: Department) => {
  currentDepartment.value = department
  moveDialogVisible.value = true
}

// 🔥 系统预设部门名称列表（不可删除）
const SYSTEM_PRESET_DEPARTMENTS = ['系统管理部']

// 🔥 不可禁用的部门（系统管理部）
const NON_DISABLEABLE_DEPARTMENTS = ['系统管理部']

/**
 * 判断部门是否为系统预设部门（不可删除）
 */
const isSystemPresetDepartment = (department: Department) => {
  return SYSTEM_PRESET_DEPARTMENTS.includes(department.name)
}

/**
 * 判断部门是否不可禁用（系统管理部）
 */
const isNonDisableableDepartment = (department: Department) => {
  return NON_DISABLEABLE_DEPARTMENTS.includes(department.name)
}

const handleDeleteDepartment = async (department: Department) => {
  // 🔥 检查是否为系统预设部门
  if (isSystemPresetDepartment(department)) {
    ElMessage.warning('系统预设部门不可删除')
    return
  }

  try {
    await departmentStore.deleteDepartment(department.id)
    ElMessage.success('部门删除成功')
  } catch (error) {
    ElMessage.error(error instanceof Error ? error.message : '删除失败')
  }
}

// 防止意外触发的标志
const isUpdatingData = ref(false)

// 处理部门状态切换
const handleStatusToggle = async (department: Department) => {
  // 如果正在更新数据，忽略状态切换事件
  if (isUpdatingData.value) {
    console.log('[Departments] 正在更新数据，忽略状态切换事件')
    return
  }

  // 检查部门ID是否有效
  if (!department || !department.id) {
    console.log('[Departments] 部门ID无效，忽略状态切换事件')
    return
  }

  const newStatus = department.status
  const statusText = newStatus === 'active' ? '启用' : '禁用'

  try {
    // 设置加载状态
    department.statusLoading = true

    // 调用store方法更新部门状态
    await departmentStore.updateDepartmentStatus(department.id, newStatus)

    ElMessage.success(`部门${statusText}成功`)
  } catch (error) {
    // 如果失败，恢复原状态
    department.status = newStatus === 'active' ? 'inactive' : 'active'
    ElMessage.error(error instanceof Error ? error.message : `${statusText}失败`)
  } finally {
    // 清除加载状态
    department.statusLoading = false
  }
}

const handleDialogSuccess = async () => {
  dialogVisible.value = false

  try {
    // 设置更新标志，防止状态切换事件被意外触发
    isUpdatingData.value = true

    // 重新加载部门数据
    console.log('[Departments] 部门操作成功，重新加载数据')
    await departmentStore.fetchDepartments()
    await departmentStore.fetchDepartmentStats()

    // 等待数据更新完成
    await nextTick()

    console.log('[Departments] 数据重新加载完成，当前部门数量:', departmentStore.departments.length)
    console.log('[Departments] 部门树结构:', departmentStore.departmentTree.length)
    console.log('[Departments] 过滤后的部门数量:', filteredDepartments.value.length)

    // 如果是新增操作且列表为空，尝试重置过滤条件
    if (!isEdit.value && filteredDepartments.value.length === 0 && departmentStore.departments.length > 0) {
      console.log('[Departments] 检测到新增部门但列表为空，重置过滤条件')
      searchKeyword.value = ''
      statusFilter.value = ''
      levelFilter.value = ''
    }

    ElMessage.success(isEdit.value ? '部门更新成功' : '部门创建成功')
  } catch (error) {
    console.error('[Departments] 重新加载数据失败:', error)
    ElMessage.success(isEdit.value ? '部门更新成功' : '部门创建成功')
  } finally {
    // 清除更新标志
    setTimeout(() => {
      isUpdatingData.value = false
      console.log('[Departments] 数据更新完成，恢复状态切换功能')
    }, 1000) // 延迟1秒确保所有更新完成
  }
}

const handleMoveSuccess = () => {
  moveDialogVisible.value = false
  ElMessage.success('部门移动成功')
}

const handlePermissionSuccess = () => {
  permissionDialogVisible.value = false
  ElMessage.success('权限配置已保存')
}

const handleRoleManagement = () => {
  safeNavigator.push('/system/department-roles')
}

const handleFullScreen = () => {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().then(() => {
      ElMessage.success('已进入全屏模式')
    }).catch(() => {
      ElMessage.error('全屏模式不支持')
    })
  } else {
    document.exitFullscreen().then(() => {
      ElMessage.success('已退出全屏模式')
    }).catch(() => {
      ElMessage.error('退出全屏失败')
    })
  }
}

const handleShowGuide = () => {
  guideDialogVisible.value = true
}

// 视图切换
const handleViewModeChange = (mode: 'card' | 'table') => {
  viewMode.value = mode
}

// 表格列配置
const tableColumns = computed(() => [
  {
    prop: 'statusSwitch',
    label: '启用状态',
    width: 90,
    visible: true,
    sortable: false,
    showOverflowTooltip: false,
    slot: 'statusSwitch'
  },
  {
    prop: 'name',
    label: '部门名称',
    minWidth: 150,
    visible: true,
    sortable: false,
    showOverflowTooltip: true,
    slot: 'name'
  },
  {
    prop: 'code',
    label: '部门编码',
    minWidth: 120,
    visible: true,
    sortable: true,
    showOverflowTooltip: false
  },
  {
    prop: 'managerName',
    label: '部门负责人',
    minWidth: 110,
    visible: true,
    sortable: false,
    showOverflowTooltip: false,
    slot: 'managerName'
  },
  {
    prop: 'memberCount',
    label: '成员数量',
    width: 90,
    visible: true,
    sortable: true,
    showOverflowTooltip: false,
    slot: 'memberCount'
  },
  {
    prop: 'level',
    label: '层级',
    width: 70,
    visible: true,
    sortable: true,
    showOverflowTooltip: false,
    slot: 'level'
  },
  {
    prop: 'status',
    label: '状态',
    width: 80,
    visible: true,
    sortable: false,
    showOverflowTooltip: false,
    slot: 'status'
  },
  {
    prop: 'updatedAt',
    label: '更新时间',
    minWidth: 160,
    visible: true,
    sortable: true,
    showOverflowTooltip: false,
    slot: 'updatedAt'
  },

])

const handleColumnSettingsChange = (columns: unknown) => {
  console.log('列设置变化:', columns)
}



// 监听路由变化，从子页面返回时自动刷新部门数据
watch(() => route.path, (newPath) => {
  if (newPath === '/system/departments') {
    departmentStore.fetchDepartments()
  }
})

onMounted(async () => {
  try {
    // 初始化部门数据（调用真实API）
    console.log('[Departments] 开始初始化部门数据')
    await departmentStore.initData()
    console.log('[Departments] 页面初始化完成，部门数量:', departmentStore.departments.length)
  } catch (error) {
    console.error('[Departments] 初始化部门数据失败:', error)
    ElMessage.error('加载部门数据失败，请稍后重试')
  }
})
</script>

<style scoped>
.departments-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.role-btn {
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}

.fullscreen-btn {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}

.guide-btn {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
  color: white;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}

.stats-cards {
  margin-bottom: 24px;
}

.stat-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  display: flex;
  align-items: center;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  transition: transform 0.2s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.members {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.hierarchy {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 28px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.search-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.refresh-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
}

.department-cards-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid #f0f2f5;
}

.section-title {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-actions {
  display: flex;
  gap: 12px;
  align-items: center;
}

.view-toggle {
  margin-right: 12px;
}

.view-toggle .el-button {
  padding: 8px 12px;
  border-radius: 6px;
}

.department-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.text-gray {
  color: #909399;
}

.department-cards-container {
  min-height: 200px;
}

.empty-state {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 200px;
}

.department-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.department-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  transition: all 0.3s ease;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
}

.department-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.12);
  border-color: #409eff;
}

.department-card.inactive {
  opacity: 0.7;
  background: #f8f9fa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.department-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.department-icon {
  width: 48px;
  height: 48px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 20px;
}

.department-details {
  flex: 1;
}

.department-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  line-height: 1.2;
}

.department-code {
  margin: 0;
  font-size: 12px;
  color: #909399;
  font-family: 'Monaco', 'Menlo', monospace;
}

.department-status {
  flex-shrink: 0;
}

.card-content {
  margin-bottom: 16px;
}

.info-table {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid #f5f7fa;
}

.info-row:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
  min-width: 80px;
}

.info-value {
  font-size: 13px;
  color: #303133;
  text-align: right;
  flex: 1;
}

.card-actions {
  padding-top: 16px;
  border-top: 1px solid #f0f2f5;
}

.action-buttons {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-start;
}

.children-indicator {
  margin-top: 12px;
  padding: 8px 12px;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 6px;
  text-align: center;
}

.children-link {
  font-size: 13px;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 4px;
  justify-content: center;
}

.children-link:hover {
  color: #409eff;
}

.dept-icon {
  color: #409eff;
}

.no-manager {
  color: #c0c4cc;
  font-style: italic;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table th) {
  background: #f8f9fa;
  color: #495057;
  font-weight: 600;
}

:deep(.el-table td) {
  border-bottom: 1px solid #f1f3f4;
}

:deep(.el-table tr:hover > td) {
  background: #f8f9fa;
}

:deep(.el-button--text) {
  padding: 4px 8px;
  border-radius: 4px;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

/* 指南弹窗样式 */
:deep(.guide-dialog) {
  .el-dialog__header {
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    padding: 20px 24px;
    border-radius: 8px 8px 0 0;
  }

  .el-dialog__title {
    color: white;
    font-weight: 600;
    font-size: 18px;
  }

  .el-dialog__headerbtn .el-dialog__close {
    color: white;
    font-size: 20px;
  }

  .el-dialog__body {
    padding: 0;
    max-height: 70vh;
    overflow-y: auto;
  }

  .el-dialog__footer {
    padding: 16px 24px;
    border-top: 1px solid #f0f2f5;
    background: #fafbfc;
  }
}

.guide-content {
  padding: 24px;
  line-height: 1.6;
}

.guide-section {
  margin-bottom: 32px;
}

.guide-section:last-child {
  margin-bottom: 0;
}

.guide-section h3 {
  color: #303133;
  font-size: 20px;
  font-weight: 600;
  margin: 0 0 16px 0;
  padding-bottom: 8px;
  border-bottom: 2px solid #e4e7ed;
}

.guide-subsection {
  margin-bottom: 20px;
}

.guide-subsection h4 {
  color: #606266;
  font-size: 16px;
  font-weight: 600;
  margin: 0 0 12px 0;
}

.guide-subsection h5 {
  color: #409eff;
  font-size: 14px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.guide-section ul {
  margin: 8px 0;
  padding-left: 20px;
}

.guide-section li {
  margin-bottom: 6px;
  color: #606266;
}

.guide-section li strong {
  color: #303133;
}

.feature-grid,
.permission-grid,
.warning-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.feature-item,
.permission-item,
.warning-item {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 16px;
}

.feature-item h5,
.permission-item h5,
.warning-item h5 {
  margin: 0 0 12px 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 20px;
  margin-top: 16px;
}

.step-item {
  background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
  border: 1px solid #dee2e6;
  border-radius: 8px;
  padding: 16px;
}

.step-item h5 {
  margin: 0 0 12px 0;
  color: #495057;
  font-size: 14px;
  font-weight: 600;
}

.step-item ol {
  margin: 0;
  padding-left: 20px;
}

.step-item li {
  margin-bottom: 6px;
  color: #606266;
  font-size: 13px;
}

.faq-list {
  margin-top: 16px;
}

.faq-item {
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 8px;
  padding: 16px;
  margin-bottom: 12px;
}

.faq-item h5 {
  margin: 0 0 8px 0;
  color: #d46b08;
  font-size: 14px;
  font-weight: 600;
}

.faq-item p {
  margin: 0;
  color: #8c4a00;
  font-size: 13px;
}

.guide-footer {
  background: #e6f7ff;
  border: 1px solid #91d5ff;
  border-radius: 8px;
  padding: 16px;
  text-align: center;
  margin-top: 24px;
}

.guide-footer p {
  margin: 0;
  color: #0050b3;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
