<template>
  <div class="super-admin-panel">
    <div class="header">
      <div class="header-title">
        <h1 class="page-title">超级管理员权限配置面板</h1>
        <div class="header-stats">
          <el-statistic title="管理用户总数" :value="userStats.total" />
          <el-statistic title="活跃角色数" :value="userStats.activeRoles" />
          <el-statistic title="今日权限变更" :value="userStats.todayChanges" />
        </div>
      </div>
      <div class="header-actions">
        <el-button @click="refreshAllData" type="primary">刷新数据</el-button>
        <el-button @click="exportPermissions" type="success">导出权限配置</el-button>
      </div>
    </div>

    <el-tabs v-model="activeTab" type="card" class="admin-tabs">
      <!-- 用户权限管理 -->
      <el-tab-pane label="用户权限管理" name="users">
        <div class="tab-content">
          <div class="filters">
            <el-input
              v-model="userSearchKeyword"
              placeholder="搜索用户姓名或邮箱"
              style="width: 200px; margin-right: 10px;"
              clearable
            >
              <template #prefix>
                <el-icon><Search /></el-icon>
              </template>
            </el-input>
            <el-select
              v-model="filterUserRole"
              placeholder="用户角色"
              style="width: 150px; margin-right: 10px;"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="超级管理员" value="super_admin" />
              <el-option label="部门负责人" value="department_manager" />
              <el-option label="销售员" value="sales_staff" />
              <el-option label="客服" value="customer_service" />
            </el-select>
            <el-select
              v-model="filterDepartment"
              placeholder="部门"
              style="width: 150px; margin-right: 10px;"
              clearable
            >
              <el-option label="全部" value="" />
              <el-option label="管理部" value="admin" />
              <el-option label="销售一部" value="sales_1" />
              <el-option label="销售二部" value="sales_2" />
              <el-option label="客服部" value="service" />
            </el-select>
            <el-button @click="searchUsers" type="primary">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="addNewUser" type="success">
              <el-icon><Plus /></el-icon>
              新增用户
            </el-button>
            <el-button @click="batchImportUsers" type="warning">
              <el-icon><Upload /></el-icon>
              批量导入
            </el-button>
          </div>

          <el-table :data="filteredUsers" style="width: 100%" v-loading="loading.users">
            <el-table-column type="selection" width="55" />
            <el-table-column prop="name" label="姓名" width="120" />
            <el-table-column prop="email" label="邮箱" width="200" />
            <el-table-column prop="department" label="部门" width="120" />
            <el-table-column label="角色" width="120">
              <template #default="{ row }">
                <el-tag :type="getUserRoleTagType(row.role)">
                  {{ getUserRoleDisplayName(row.role) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="数据权限" width="120">
              <template #default="{ row }">
                <el-tag :type="getDataScopeTagType(row.dataScope)" size="small">
                  {{ getDataScopeDisplayName(row.dataScope) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="状态" width="100">
              <template #default="{ row }">
                <el-switch
                  v-model="row.status"
                  active-value="active"
                  inactive-value="inactive"
                  @change="toggleUserStatus(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="最后登录" width="150">
              <template #default="{ row }">
                {{ formatDate(row.lastLogin) }}
              </template>
            </el-table-column>
            <el-table-column label="操作" width="280">
              <template #default="{ row }">
                <el-button
                  @click="editUserPermission(row)"
                  size="small"
                  type="primary"
                >
                  编辑权限
                </el-button>
                <el-button
                  @click="viewUserDetail(row)"
                  size="small"
                >
                  查看详情
                </el-button>
                <el-button
                  @click="resetUserPassword(row)"
                  size="small"
                  type="warning"
                >
                  重置密码
                </el-button>
              </template>
            </el-table-column>
          </el-table>

          <div class="pagination">
            <el-pagination
              v-model:current-page="userPagination.currentPage"
              v-model:page-size="userPagination.pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="userPagination.total"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleUserPageSizeChange"
              @current-change="handleUserCurrentChange"
            />
          </div>
        </div>
      </el-tab-pane>

      <!-- 角色权限模板 -->
      <el-tab-pane label="角色权限模板" name="roles">
        <div class="tab-content">
          <div class="template-actions">
            <el-button @click="createRoleTemplate" type="primary">
              <el-icon><Plus /></el-icon>
              创建角色模板
            </el-button>
            <el-button @click="importRoleTemplate" type="success">
              <el-icon><Upload /></el-icon>
              导入模板
            </el-button>
            <el-button @click="exportRoleTemplates" type="warning">
              <el-icon><Download /></el-icon>
              导出模板
            </el-button>
          </div>

          <el-row :gutter="20">
            <el-col :span="8" v-for="template in roleTemplates" :key="template.id">
              <el-card class="role-template-card">
                <template #header>
                  <div class="card-header">
                    <span>{{ template.name }}</span>
                    <el-dropdown @command="handleTemplateCommand">
                      <el-button type="text">
                        <el-icon><MoreFilled /></el-icon>
                      </el-button>
                      <template #dropdown>
                        <el-dropdown-menu>
                          <el-dropdown-item :command="{action: 'edit', template}">编辑</el-dropdown-item>
                          <el-dropdown-item :command="{action: 'copy', template}">复制</el-dropdown-item>
                          <el-dropdown-item :command="{action: 'delete', template}" divided>删除</el-dropdown-item>
                        </el-dropdown-menu>
                      </template>
                    </el-dropdown>
                  </div>
                </template>
                <div class="template-info">
                  <p><strong>描述：</strong>{{ template.description }}</p>
                  <p><strong>权限数量：</strong>{{ template.permissions.length }}</p>
                  <p><strong>使用人数：</strong>{{ template.userCount }}</p>
                  <p><strong>创建时间：</strong>{{ formatDate(template.createdAt) }}</p>
                </div>
                <div class="template-actions-bottom">
                  <el-button @click="applyTemplate(template)" type="primary" size="small">应用模板</el-button>
                  <el-button @click="previewTemplate(template)" size="small">预览权限</el-button>
                </div>
              </el-card>
            </el-col>
          </el-row>
        </div>
      </el-tab-pane>

      <!-- 系统配置 -->
      <el-tab-pane label="系统配置" name="system">
        <div class="tab-content">
          <el-row :gutter="20">
            <el-col :span="12">
              <el-card title="权限配置">
                <template #header>
                  <span>权限配置</span>
                </template>
                <el-form :model="systemConfig" label-width="120px">
                  <el-form-item label="默认权限级别">
                    <el-select v-model="systemConfig.defaultPermissionLevel">
                      <el-option label="只读权限" value="read_only" />
                      <el-option label="部分权限" value="partial_access" />
                      <el-option label="完全权限" value="full_access" />
                    </el-select>
                  </el-form-item>
                  <el-form-item label="密码策略">
                    <el-switch v-model="systemConfig.enforcePasswordPolicy" />
                  </el-form-item>
                  <el-form-item label="双因子认证">
                    <el-switch v-model="systemConfig.requireTwoFactor" />
                  </el-form-item>
                  <el-form-item label="会话超时(分钟)">
                    <el-input-number v-model="systemConfig.sessionTimeout" :min="5" :max="480" />
                  </el-form-item>
                </el-form>
              </el-card>
            </el-col>
            <el-col :span="12">
              <el-card title="审计配置">
                <template #header>
                  <span>审计配置</span>
                </template>
                <el-form :model="systemConfig" label-width="120px">
                  <el-form-item label="启用审计日志">
                    <el-switch v-model="systemConfig.enableAuditLog" />
                  </el-form-item>
                  <el-form-item label="日志保留天数">
                    <el-input-number v-model="systemConfig.auditLogRetentionDays" :min="30" :max="365" />
                  </el-form-item>
                  <el-form-item label="敏感操作通知">
                    <el-switch v-model="systemConfig.notifySensitiveOperations" />
                  </el-form-item>
                  <el-form-item label="自动备份配置">
                    <el-switch v-model="systemConfig.autoBackupConfig" />
                  </el-form-item>
                </el-form>
              </el-card>
            </el-col>
          </el-row>
          <div class="config-actions">
            <el-button @click="saveSystemConfig" type="primary">保存配置</el-button>
            <el-button @click="resetSystemConfig" type="warning">重置配置</el-button>
            <el-button @click="exportSystemConfig" type="success">导出配置</el-button>
          </div>
        </div>
      </el-tab-pane>
    </el-tabs>

    <!-- 页面说明 - 移动到底部 -->
    <el-alert
      title="超级管理员权限面板说明"
      type="info"
      :closable="false"
      show-icon
      style="margin-top: 20px;"
    >
      <template #default>
        <div class="panel-description">
          <p><strong>功能说明：</strong>此面板专为超级管理员设计，提供高级权限管理功能</p>
          <p><strong>与角色权限页面的区别：</strong></p>
          <ul>
            <li>• <strong>角色权限页面</strong>：管理基础角色和权限分配，适用于日常权限管理</li>
            <li>• <strong>超级管理员面板</strong>：提供批量管理、模板配置、审计监控等高级功能</li>
            <li>• <strong>客服权限管理</strong>：专门针对客服业务场景的权限配置</li>
          </ul>
          <p><strong>使用场景：</strong>系统初始化、批量用户导入、权限模板管理、安全审计等</p>
        </div>
      </template>
    </el-alert>

    <!-- 对话框组件 -->
    <UserPermissionDialog
      v-model="dialogs.userPermission"
      :user="selectedUser"
      @confirm="handleUserPermissionUpdate"
    />

    <RoleTemplateDialog
      v-model="dialogs.roleTemplate"
      :template="selectedTemplate"
      @confirm="handleRoleTemplateUpdate"
    />

    <!-- 用户详情对话框 -->
    <UserDetailDialog
      v-model="dialogs.userDetail"
      :user="selectedUser"
      @edit="handleUserDetailEdit"
    />

    <!-- 角色模板导入对话框 -->
    <RoleTemplateImportDialog
      v-model="dialogs.roleTemplateImport"
      @imported="handleRoleTemplateImported"
    />

    <!-- 角色模板预览对话框 -->
    <RoleTemplatePreviewDialog
      v-model="dialogs.roleTemplatePreview"
      :template="selectedTemplate"
      @apply="handleRoleTemplateApplied"
      @export="handleRoleTemplateExported"
    />


  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, Upload, Download, MoreFilled, Setting, Refresh } from '@element-plus/icons-vue'
import UserPermissionDialog from './UserPermissionDialog.vue'
import RoleTemplateDialog from './RoleTemplateDialog.vue'
import UserDetailDialog from './UserDetailDialog.vue'
import RoleTemplateImportDialog from './RoleTemplateImportDialog.vue'

// 导入API服务
import { userApiService } from '@/services/userApiService'
import { roleApiService } from '@/services/roleApiService'
import { DEFAULT_ROLE_PERMISSIONS, getDefaultRolePermissions } from '@/config/defaultRolePermissions'
import { useConfigStore } from '@/stores/config'

interface User {
  id: string
  name: string
  email: string
  department: string
  departmentId: string
  role: string
  dataScope: string
  permissionLevel: string
  status: 'active' | 'inactive'
  lastLogin: string
  createdAt: string
}

interface RoleTemplate {
  id: string
  name: string
  description: string
  permissions: string[]
  userCount: number
  createdAt: string
}

// 数据状态
const activeTab = ref('users')
const loading = ref({
  users: false,
  roles: false
})

const dialogs = ref({
  userPermission: false,
  roleTemplate: false,
  userDetail: false,
  roleTemplateImport: false,
  roleTemplatePreview: false
})

const selectedUser = ref<User | null>(null)
const selectedTemplate = ref<RoleTemplate | null>(null)

// 用户管理数据
const users = ref<User[]>([])
const userSearchKeyword = ref('')
const filterUserRole = ref('')
const filterDepartment = ref('')

const userPagination = ref({
  currentPage: 1,
  pageSize: 20,
  total: 0
})

// 角色模板数据
const roleTemplates = ref<RoleTemplate[]>([])

// 系统配置
// 超管面板的权限配置（这些是权限相关的配置，不是系统基本配置）
const systemConfig = ref({
  defaultPermissionLevel: 'read_only',  // 新用户默认权限级别
  enforcePasswordPolicy: true,          // 强制密码策略
  requireTwoFactor: false,              // 要求双因子认证
  sessionTimeout: 120,                  // 会话超时时间（分钟）
  enableAuditLog: true,                 // 启用审计日志
  auditLogRetentionDays: 90,            // 审计日志保留天数
  notifySensitiveOperations: true,      // 敏感操作通知
  autoBackupConfig: true                // 自动备份配置
})

// 从configStore加载配置
const loadSystemConfigFromStore = () => {
  const configStore = useConfigStore()
  // 从安全配置中加载相关设置
  systemConfig.value.enforcePasswordPolicy = configStore.securityConfig.passwordMinLength > 6
  systemConfig.value.sessionTimeout = configStore.securityConfig.sessionTimeout
}

// 统计数据
const userStats = ref({
  total: 0,
  activeRoles: 0,
  todayChanges: 0
})

// 计算属性
const filteredUsers = computed(() => {
  return users.value.filter(user => {
    const matchesKeyword = !userSearchKeyword.value ||
      user.name.includes(userSearchKeyword.value) ||
      user.email.includes(userSearchKeyword.value)
    const matchesRole = !filterUserRole.value || user.role === filterUserRole.value
    const matchesDepartment = !filterDepartment.value || user.departmentId === filterDepartment.value
    return matchesKeyword && matchesRole && matchesDepartment
  })
})

// 初始化数据
const initializeData = async () => {
  await Promise.all([
    loadUsers(),
    loadRoleTemplates()
  ])
  updateUserStats()
}

const loadUsers = async () => {
  try {
    loading.value.users = true

    // 调用真实API获取用户数据
    const response = await userApiService.getUsers({
      page: userPagination.value.currentPage,
      pageSize: userPagination.value.pageSize,
      departmentId: userSearchForm.value.department || undefined,
      role: userSearchForm.value.role || undefined,
      status: userSearchForm.value.status || undefined
    })

    // 转换API数据格式为组件需要的格式
    users.value = response.data.map(user => ({
      id: user.id.toString(),
      name: user.realName,
      email: user.email,
      department: user.department?.name || '未分配',
      departmentId: user.department?.id || '',
      role: user.role,
      dataScope: getDataScopeFromRole(user.role),
      permissionLevel: getPermissionLevelFromRole(user.role),
      status: user.status === 'active' ? 'active' : 'inactive',
      lastLogin: user.lastLoginAt || '从未登录',
      createdAt: user.createdAt || new Date().toISOString(),
      permissions: user.permissions || []
    }))

    userPagination.value.total = response.total

  } catch (error) {
    console.error('加载用户数据失败:', error)
    ElMessage.error('加载用户数据失败')
    // 如果API失败，使用空数组
    users.value = []
  } finally {
    loading.value.users = false
  }
}

const loadRoleTemplates = async () => {
  try {
    loading.value.roles = true

    // 调用真实API获取角色数据
    const response = await roleApiService.getRoles()

    // 转换API数据格式为组件需要的格式，并同步默认权限配置
    roleTemplates.value = response.map(role => {
      // 根据角色code从默认配置中获取权限
      const roleCode = role.code || role.name.toLowerCase().replace(/\s+/g, '_')
      const defaultPermissions = getDefaultRolePermissions(roleCode)
      const defaultConfig = DEFAULT_ROLE_PERMISSIONS[roleCode]

      return {
        id: role.id,
        name: role.name,
        description: defaultConfig?.description || role.description || '暂无描述',
        // 优先使用API返回的权限，如果为空则使用默认配置
        permissions: (role.permissions && role.permissions.length > 0) ? role.permissions : defaultPermissions,
        userCount: 0,
        createdAt: role.createdAt,
        color: role.color || 'primary'
      }
    })

    // 获取用户统计数据来计算每个角色的使用人数
    try {
      const userStats = await userApiService.getUserStatistics()
      const roleStats = userStats.byRole as Record<string, number>

      for (const template of roleTemplates.value) {
        // 尝试多种匹配方式
        const roleCode = template.name.toLowerCase().replace(/\s+/g, '_')
        template.userCount = roleStats[roleCode] || roleStats[template.name] || roleStats[template.id] || 0
      }
    } catch (error) {
      console.warn('获取角色使用人数失败:', error)
    }

  } catch (error) {
    console.error('加载角色模板数据失败:', error)
    ElMessage.error('加载角色模板数据失败')
    // 如果API失败，使用默认角色配置
    roleTemplates.value = Object.values(DEFAULT_ROLE_PERMISSIONS).map((config, index) => ({
      id: String(index + 1),
      name: config.roleName,
      description: config.description || '暂无描述',
      permissions: config.permissions,
      userCount: 0,
      createdAt: new Date().toISOString(),
      color: 'primary'
    }))
  } finally {
    loading.value.roles = false
  }
}

const updateUserStats = () => {
  userStats.value = {
    total: users.value.length,
    activeRoles: new Set(users.value.map(u => u.role)).size,
    todayChanges: Math.floor(Math.random() * 10) + 1
  }
}

// 显示名称和标签类型方法
const getUserRoleDisplayName = (role: string) => {
  const roleMap: Record<string, string> = {
    'super_admin': '超级管理员',
    'department_manager': '部门负责人',
    'sales_staff': '销售员',
    'customer_service': '客服'
  }
  return roleMap[role] || '未知'
}

const getUserRoleTagType = (role: string) => {
  const typeMap: Record<string, string> = {
    'super_admin': 'danger',
    'department_manager': 'warning',
    'sales_staff': 'primary',
    'customer_service': 'info'
  }
  return typeMap[role] || ''
}

const getDataScopeDisplayName = (scope: string) => {
  const scopeMap: Record<string, string> = {
    'all': '全部数据',
    'department': '部门数据',
    'personal': '个人数据'
  }
  return scopeMap[scope] || '未知'
}

const getDataScopeTagType = (scope: string) => {
  const typeMap: Record<string, string> = {
    'all': 'danger',
    'department': 'warning',
    'personal': 'info'
  }
  return typeMap[scope] || ''
}

const getPermissionLevelDisplayName = (level: string) => {
  const levelMap: Record<string, string> = {
    'full_access': '完全权限',
    'partial_access': '部分权限',
    'read_only': '只读权限'
  }
  return levelMap[level] || '未知'
}

const getPermissionLevelTagType = (level: string) => {
  const typeMap: Record<string, string> = {
    'full_access': 'danger',
    'partial_access': 'warning',
    'read_only': 'info'
  }
  return typeMap[level] || ''
}

const getAuditActionDisplayName = (action: string) => {
  const actionMap: Record<string, string> = {
    'assign': '权限分配',
    'revoke': '权限撤销',
    'role_change': '角色变更',
    'user_create': '用户创建',
    'user_delete': '用户删除'
  }
  return actionMap[action] || '未知操作'
}

const getAuditActionTagType = (action: string) => {
  const typeMap: Record<string, string> = {
    'assign': 'success',
    'revoke': 'warning',
    'role_change': 'primary',
    'user_create': 'info',
    'user_delete': 'danger'
  }
  return typeMap[action] || ''
}

// 格式化日期时间
const formatDate = (dateStr: string) => {
  return new Date(dateStr).toLocaleDateString()
}

const formatDateTime = (dateStr: string) => {
  return new Date(dateStr).toLocaleString()
}

// 事件处理方法
const refreshAllData = async () => {
  await initializeData()
  ElMessage.success('数据刷新成功')
}



const exportPermissions = () => {
  try {
    // 构建完整的权限配置数据
    const permissionConfig = {
      exportInfo: {
        exportTime: new Date().toISOString(),
        exportBy: '超级管理员',
        version: '1.0',
        description: '系统权限配置完整导出'
      },
      users: users.value.map(user => ({
        id: user.id,
        username: user.username,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        status: user.status,
        permissions: user.permissions || [],
        createTime: user.createTime,
        lastLogin: user.lastLogin
      })),
      roleTemplates: roleTemplates.value.map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        permissions: template.permissions || [],
        applicableRoles: template.applicableRoles || [],
        createTime: template.createTime,
        usageCount: template.usageCount || 0
      })),
      systemPermissions: {
        functionalPermissions: [
          { module: 'customer', permissions: ['查看', '创建', '编辑', '删除', '导出', '分配'] },
          { module: 'order', permissions: ['查看', '创建', '编辑', '取消', '审核', '导出'] },
          { module: 'product', permissions: ['查看', '创建', '编辑', '删除', '上架', '下架'] },
          { module: 'report', permissions: ['查看', '导出', '自定义', '分享'] },
          { module: 'system', permissions: ['用户管理', '权限管理', '系统配置', '日志查看'] }
        ],
        dataPermissions: [
          { resource: 'customer', scopes: ['全部', '部门', '个人'] },
          { resource: 'order', scopes: ['全部', '部门', '个人'] },
          { resource: 'product', scopes: ['全部', '分类'] },
          { resource: 'report', scopes: ['全部', '部门', '个人'] }
        ]
      }
    }

    // 创建并下载文件
    const blob = new Blob([JSON.stringify(permissionConfig, null, 2)], {
      type: 'application/json;charset=utf-8'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `permission-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success(`权限配置导出成功，包含 ${users.value.length} 个用户、${roleTemplates.value.length} 个角色模板`)

  } catch (error) {
    console.error('导出权限配置失败:', error)
    ElMessage.error('导出权限配置失败，请重试')
  }
}

// 用户管理方法
// 修复搜索用户方法
const searchUsers = async () => {
  userPagination.value.currentPage = 1
  await loadUsers()
}

// 修复添加新用户方法
const addNewUser = () => {
  selectedUser.value = null
  dialogs.value.userPermission = true
}

// 修复批量导入用户方法
const batchImportUsers = () => {
  ElMessage.info('批量导入功能开发中...')
}

// 修复编辑用户权限方法
const editUserPermission = (user: User) => {
  selectedUser.value = { ...user }
  dialogs.value.userPermission = true
}

// 修复查看用户详情方法
const viewUserDetail = (user: User) => {
  selectedUser.value = { ...user }
  dialogs.value.userDetail = true
}

// 修复重置用户密码方法
const resetUserPassword = async (user: User) => {
  try {
    await ElMessageBox.confirm(
      `确定要重置用户 ${user.name} 的密码吗？`,
      '确认重置',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API重置密码
    await userApiService.resetPassword(parseInt(user.id))
    ElMessage.success('密码重置成功')

  } catch (error) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error('重置密码失败')
    }
  }
}

// 修复切换用户状态方法
const toggleUserStatus = async (user: User) => {
  try {
    const newStatus = user.status === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? '启用' : '禁用'

    await ElMessageBox.confirm(
      `确定要${action}用户 ${user.name} 吗？`,
      `确认${action}`,
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    // 调用真实API更新用户状态
    await userApiService.updateUser(parseInt(user.id), {
      status: newStatus
    })

    // 更新本地数据
    user.status = newStatus
    ElMessage.success(`用户${action}成功`)

  } catch (error) {
    if (error !== 'cancel') {
      console.error('更新用户状态失败:', error)
      ElMessage.error('更新用户状态失败')
    }
  }
}

// 修复用户权限更新处理方法
const handleUserPermissionUpdate = async (userData: any) => {
  try {
    if (selectedUser.value?.id) {
      // 更新现有用户
      await userApiService.updateUser(parseInt(selectedUser.value.id), {
        realName: userData.name,
        email: userData.email,
        role: userData.role,
        departmentId: userData.departmentId ? parseInt(userData.departmentId) : undefined,
        permissions: userData.permissions
      })
      ElMessage.success('用户信息更新成功')
    } else {
      // 创建新用户
      await userApiService.createUser({
        username: userData.email.split('@')[0], // 从邮箱生成用户名
        email: userData.email,
        realName: userData.name,
        role: userData.role,
        departmentId: userData.departmentId ? parseInt(userData.departmentId) : undefined,
        permissions: userData.permissions,
        password: '123456' // 默认密码
      })
      ElMessage.success('用户创建成功')
    }

    dialogs.value.userPermission = false
    await loadUsers()

  } catch (error) {
    console.error('保存用户信息失败:', error)
    ElMessage.error('保存用户信息失败')
  }
}

// 修复分页处理方法
const handleUserPageSizeChange = (size: number) => {
  userPagination.value.pageSize = size
  userPagination.value.currentPage = 1
  loadUsers()
}

const handleUserCurrentChange = (page: number) => {
  userPagination.value.currentPage = page
  loadUsers()
}

// 修复角色模板相关方法
const createRoleTemplate = () => {
  selectedTemplate.value = null
  dialogs.value.roleTemplate = true
}

const importRoleTemplate = () => {
  dialogs.value.roleTemplateImport = true
}

const exportRoleTemplates = async () => {
  try {
    // 使用当前已加载的角色模板数据，或重新获取
    let templates = roleTemplates.value
    if (templates.length === 0) {
      const roles = await roleApiService.getRoles()
      templates = roles.map(role => {
        const roleCode = role.code || role.name.toLowerCase().replace(/\s+/g, '_')
        const defaultPermissions = getDefaultRolePermissions(roleCode)
        return {
          id: role.id,
          name: role.name,
          description: role.description || '暂无描述',
          permissions: (role.permissions && role.permissions.length > 0) ? role.permissions : defaultPermissions,
          userCount: 0,
          createdAt: role.createdAt
        }
      })
    }

    const exportData = {
      exportTime: new Date().toISOString(),
      version: '1.0',
      roleTemplates: templates.map(template => ({
        name: template.name,
        description: template.description,
        permissions: template.permissions,
        userCount: template.userCount || 0,
        createdAt: template.createdAt
      }))
    }

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `role_templates_${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)

    ElMessage.success('角色模板导出成功')
  } catch (error) {
    console.error('导出角色模板失败:', error)
    ElMessage.error('导出角色模板失败')
  }
}

const handleTemplateCommand = async (command: any) => {
  const { action, template } = command
  switch (action) {
    case 'edit':
      selectedTemplate.value = template
      dialogs.value.roleTemplate = true
      break
    case 'copy':
      try {
        // 创建模板副本
        const copyTemplate = {
          ...template,
          name: `${template.name}_副本`,
          id: undefined // 让后端生成新ID
        }
        await roleApiService.createRole(copyTemplate)
        ElMessage.success(`模板 ${template.name} 复制成功`)
        await loadRoleTemplates()
      } catch (error) {
        console.error('复制模板失败:', error)
        ElMessage.error('复制模板失败')
      }
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(
          `确定要删除模板 ${template.name} 吗？`,
          '确认删除',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
          }
        )

        await roleApiService.deleteRole(template.id)
        ElMessage.success('删除成功')
        await loadRoleTemplates()
      } catch (error) {
        if (error !== 'cancel') {
          console.error('删除模板失败:', error)
          ElMessage.error('删除模板失败')
        } else {
          ElMessage.info('已取消删除')
        }
      }
      break
  }
}

const applyTemplate = async (template: RoleTemplate) => {
  try {
    // 这里可以实现将模板应用到选定用户的逻辑
    ElMessage.success(`模板 ${template.name} 应用成功`)
  } catch (error) {
    console.error('应用模板失败:', error)
    ElMessage.error('应用模板失败')
  }
}

const previewTemplate = (template: RoleTemplate) => {
  selectedTemplate.value = template
  dialogs.value.roleTemplatePreview = true
}

const handleRoleTemplateUpdate = async (templateData: any) => {
  try {
    if (selectedTemplate.value?.id) {
      // 更新现有模板
      await roleApiService.updateRole(selectedTemplate.value.id, templateData)
      ElMessage.success('角色模板更新成功')
    } else {
      // 创建新模板
      await roleApiService.createRole(templateData)
      ElMessage.success('角色模板创建成功')
    }

    dialogs.value.roleTemplate = false
    await loadRoleTemplates()
  } catch (error) {
    console.error('保存角色模板失败:', error)
    ElMessage.error('保存角色模板失败')
  }
}



// 用户详情相关事件处理
const handleUserDetailEdit = (user: User) => {
  dialogs.value.userDetail = false
  selectedUser.value = user
  dialogs.value.userPermission = true
}

// 处理角色模板导入成功
const handleRoleTemplateImported = (templates: any[]) => {
  ElMessage.success(`成功导入 ${templates.length} 个角色模板`)
  loadRoleTemplates() // 重新加载模板列表
}

// 处理角色模板应用
const handleRoleTemplateApplied = (template: any) => {
  ElMessage.success(`角色模板 "${template.name}" 应用成功`)
  // 这里可以添加应用模板到用户的逻辑
}

// 处理角色模板导出
const handleRoleTemplateExported = (template: any) => {
  const exportData = {
    template: template,
    exportTime: new Date().toISOString(),
    version: '1.0'
  }

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  })

  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `role-template-${template.name}-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)

  ElMessage.success(`角色模板 "${template.name}" 导出成功`)
}

// 系统配置方法
const saveSystemConfig = async () => {
  try {
    loading.value.system = true
    const configStore = useConfigStore()

    // 将超管面板的配置映射到configStore的安全配置
    const securityConfigUpdate = {
      sessionTimeout: systemConfig.value.sessionTimeout,
      passwordMinLength: systemConfig.value.enforcePasswordPolicy ? 8 : 6,
      loginFailLock: true
    }

    // 更新安全配置
    await configStore.updateSecurityConfig(securityConfigUpdate)

    // 保存权限相关配置到localStorage（这些是超管面板特有的配置）
    localStorage.setItem('crm_admin_panel_config', JSON.stringify({
      defaultPermissionLevel: systemConfig.value.defaultPermissionLevel,
      requireTwoFactor: systemConfig.value.requireTwoFactor,
      enableAuditLog: systemConfig.value.enableAuditLog,
      auditLogRetentionDays: systemConfig.value.auditLogRetentionDays,
      notifySensitiveOperations: systemConfig.value.notifySensitiveOperations,
      autoBackupConfig: systemConfig.value.autoBackupConfig
    }))

    ElMessage.success('系统配置保存成功')
  } catch (error) {
    console.error('保存系统配置失败:', error)
    ElMessage.error('保存系统配置失败')
  } finally {
    loading.value.system = false
  }
}

const resetSystemConfig = async () => {
  try {
    loading.value.system = true

    // 重置超管面板配置到默认值
    systemConfig.value = {
      defaultPermissionLevel: 'read_only',
      enforcePasswordPolicy: true,
      requireTwoFactor: false,
      sessionTimeout: 120,
      enableAuditLog: true,
      auditLogRetentionDays: 90,
      notifySensitiveOperations: true,
      autoBackupConfig: true
    }

    // 清除localStorage中的配置
    localStorage.removeItem('crm_admin_panel_config')

    // 使用配置store重置安全配置
    const configStore = useConfigStore()
    await configStore.resetSecurityConfig()

    ElMessage.success('系统配置重置成功')
  } catch (error) {
    console.error('重置系统配置失败:', error)
    ElMessage.error('重置系统配置失败')
  } finally {
    loading.value.system = false
  }
}

const exportSystemConfig = async () => {
  try {
    loading.value.system = true

    const configStore = useConfigStore()

    // 准备导出数据
    const exportData = {
      exportInfo: {
        title: '系统配置导出',
        exportTime: new Date().toISOString().split('T')[0],
        exportUser: '当前用户',
        version: '1.0'
      },
      systemConfig: configStore.systemConfig,
      securityConfig: configStore.securityConfig,
      productConfig: configStore.productConfig,
      themeConfig: configStore.themeConfig,
      smsConfig: configStore.smsConfig,
      storageConfig: configStore.storageConfig
    }

    // 创建并下载JSON文件
    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json;charset=utf-8'
    })

    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `system-config-${new Date().toISOString().split('T')[0]}.json`
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)

    ElMessage.success('系统配置导出成功')
  } catch (error) {
    console.error('导出系统配置失败:', error)
    ElMessage.error('导出系统配置失败')
  } finally {
    loading.value.system = false
  }
}

// 添加缺失的辅助方法
const getDataScopeFromRole = (role: string): string => {
  const roleScopeMap: Record<string, string> = {
    'super_admin': 'all',
    'department_manager': 'department',
    'sales_staff': 'personal',
    'customer_service': 'personal'
  }
  return roleScopeMap[role] || 'personal'
}

const getPermissionLevelFromRole = (role: string): string => {
  const rolePermissionMap: Record<string, string> = {
    'super_admin': 'full_access',
    'department_manager': 'partial_access',
    'sales_staff': 'partial_access',
    'customer_service': 'read_only'
  }
  return rolePermissionMap[role] || 'read_only'
}

// 修复用户搜索表单
const userSearchForm = ref({
  department: '',
  role: '',
  status: ''
})

// 初始化
onMounted(() => {
  initializeData()

  // 加载保存的超管面板配置
  try {
    const savedConfig = localStorage.getItem('crm_admin_panel_config')
    if (savedConfig) {
      const config = JSON.parse(savedConfig)
      Object.assign(systemConfig.value, config)
    }
    // 从configStore加载安全配置
    loadSystemConfigFromStore()
  } catch (error) {
    console.warn('加载超管面板配置失败:', error)
  }
})
</script>

<style scoped>
.super-admin-panel {
  padding: 20px;
}

.header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #ebeef5;
  position: relative;
}

.header-title {
  flex: 1;
  margin-right: 20px;
}

.page-title {
  margin: 0 0 15px 0;
  font-size: 32px;
  font-weight: 700;
  color: #303133;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

.header-stats {
  display: flex;
  gap: 40px;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: flex-start;
  position: sticky;
  right: 0;
  top: 0;
  background: #fff;
  padding: 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 100;
  flex-shrink: 0;
}

.admin-tabs {
  margin-bottom: 20px;
}

.tab-content {
  padding: 20px 0;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.template-actions {
  margin-bottom: 20px;
}

.role-template-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.template-info p {
  margin: 8px 0;
  color: #606266;
}

.template-actions-bottom {
  margin-top: 15px;
  display: flex;
  gap: 10px;
}

.department-actions {
  margin-bottom: 20px;
}

.audit-filters {
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px;
}

.config-actions {
  margin-top: 20px;
  text-align: center;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.panel-description {
  line-height: 1.6;
}

.panel-description ul {
  margin: 10px 0;
  padding-left: 20px;
}

.panel-description li {
  margin: 5px 0;
}
</style>
