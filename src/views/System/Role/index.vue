<template>
  <div class="role-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h2>角色权限管理</h2>
        <div class="stats-section">
          <el-card class="stat-card primary" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon primary"><el-icon><UserFilled /></el-icon></div>
              <div class="stat-info">
                <div class="stat-number primary">{{ roleStats.total }}</div>
                <div class="stat-title">角色总数</div>
                <div class="stat-desc">系统中所有角色数量</div>
              </div>
            </div>
          </el-card>
          <el-card class="stat-card success" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon success"><el-icon><User /></el-icon></div>
              <div class="stat-info">
                <div class="stat-number success">{{ roleStats.active }}</div>
                <div class="stat-title">启用角色</div>
                <div class="stat-desc">当前启用的角色数量</div>
              </div>
            </div>
          </el-card>
          <el-card class="stat-card warning" shadow="hover">
            <div class="stat-content">
              <div class="stat-icon warning"><el-icon><Lock /></el-icon></div>
              <div class="stat-info">
                <div class="stat-number warning">{{ roleStats.permissions }}</div>
                <div class="stat-title">权限总数</div>
                <div class="stat-desc">系统中所有权限数量</div>
              </div>
            </div>
          </el-card>
        </div>
      </div>
      <div class="header-actions">
        <el-button v-if="canAddRole" @click="handleAdd" type="primary" :icon="Plus">新增角色</el-button>
        <el-button v-if="canManagePermissions" @click="permissionManageVisible = true" :icon="Setting">权限管理</el-button>
      </div>
    </div>

    <!-- 搜索筛选 -->
    <el-card class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="角色名称">
          <el-input v-model="searchForm.name" placeholder="请输入角色名称" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable style="width: 120px">
            <el-option label="启用" value="active" />
            <el-option label="禁用" value="inactive" />
          </el-select>
        </el-form-item>
        <el-form-item label="创建时间">
          <el-date-picker v-model="searchForm.createTimeRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button @click="handleSearch" type="primary" :icon="Search">搜索</el-button>
          <el-button @click="handleReset" :icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="table-header">
          <span>角色列表</span>
          <div class="table-actions">
            <el-button v-if="canDeleteRole" @click="handleBatchDelete" :disabled="!selectedRoles.length" type="danger" size="small" :icon="Delete">批量删除</el-button>
            <el-button v-if="canBatchOperation" @click="handleBatchStatus('active')" :disabled="!selectedRoles.length" size="small" :icon="Check">批量启用</el-button>
            <el-button v-if="canBatchOperation" @click="handleBatchStatus('inactive')" :disabled="!selectedRoles.length" size="small" :icon="Close">批量禁用</el-button>
          </div>
        </div>
      </template>

      <el-table :data="roleList" v-loading="tableLoading" @selection-change="handleSelectionChange" style="width: 100%">
        <el-table-column type="selection" width="55" />
        <el-table-column prop="name" label="角色名称" width="150" />
        <el-table-column prop="code" label="角色编码" width="150" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tooltip :content="isNonDisableableRole(row) ? '系统预设角色不可禁用' : (row.status === 'active' ? '点击禁用' : '点击启用')" placement="top">
              <el-switch v-model="row.status" active-value="active" inactive-value="inactive" :disabled="isNonDisableableRole(row)" @change="handleRoleStatusChange(row)" :loading="row.statusLoading" />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="角色类型" width="140">
          <template #default="{ row }">
            <el-select v-model="row.roleType" size="small" @change="handleRoleTypeChange(row)" :disabled="!canEditRole || isSystemPresetRole(row)">
              <el-option label="系统角色" value="system" />
              <el-option label="业务角色" value="business" />
              <el-option label="临时角色" value="temporary" />
              <el-option label="自定义角色" value="custom" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column label="用户数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewUsers(row)" type="primary">{{ row.userCount }}</el-link>
          </template>
        </el-table-column>
        <el-table-column label="权限数量" width="100">
          <template #default="{ row }">
            <el-link @click="handleViewPermissions(row)" type="primary">{{ row.permissionCount }}</el-link>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column prop="createTime" label="创建时间" width="160" />
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button v-if="canEditRole" @click="handleEdit(row)" type="primary" size="small" link>编辑</el-button>
            <el-button v-if="canAssignPermissions" @click="handlePermissions(row)" type="primary" size="small" link>权限设置</el-button>
            <el-dropdown v-if="canEditRole || canDeleteRole" @command="(cmd: string) => handleDropdownCommand(cmd, row)">
              <el-button type="primary" size="small" link>更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="canEditRole" command="copy">复制角色</el-dropdown-item>
                  <el-dropdown-item v-if="canEditRole" command="toggle">{{ row.status === 'active' ? '禁用' : '启用' }}</el-dropdown-item>
                  <el-tooltip :content="isSystemPresetRole(row) ? '系统预设角色不可删除' : ''" :disabled="!isSystemPresetRole(row)" placement="left">
                    <el-dropdown-item v-if="canDeleteRole" command="delete" divided class="danger-item" :disabled="isSystemPresetRole(row)">删除</el-dropdown-item>
                  </el-tooltip>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.size" :page-sizes="[10, 20, 50, 100]" :total="pagination.total" layout="total, sizes, prev, pager, next, jumper" @size-change="handleSizeChange" @current-change="handleCurrentChange" />
      </div>
    </el-card>

    <!-- 子组件对话框 -->
    <RoleFormDialog
      v-model="roleDialogVisible"
      :is-edit="isEdit"
      :edit-data="editFormData"
      @success="handleFormSuccess"
    />

    <PermissionSettingsDialog
      ref="permSettingsRef"
      v-model="permissionSettingsVisible"
      :manage-visible="permissionManageVisible"
      :role="currentPermRole"
      @update:manage-visible="permissionManageVisible = $event"
      @success="handleFormSuccess"
    />

    <UserListDialog
      v-model="userListVisible"
      :role="currentViewRole"
    />

    <PermissionListDialog
      v-model="permissionListVisible"
      :role="currentViewRole"
    />
  </div>
</template>

<script setup lang="ts">
// eslint-disable-next-line vue/multi-word-component-names
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
// @ts-ignore
import permissionService from '@/services/permissionService'
import { roleApiService } from '@/services/roleApiService'
import { getDefaultRolePermissions } from '@/config/defaultRolePermissions'
import {
  Plus, Setting, Search, Refresh, Delete, Check, Close, ArrowDown,
  UserFilled, User, Lock
} from '@element-plus/icons-vue'

// 子组件
import RoleFormDialog from './RoleFormDialog.vue'
import PermissionSettingsDialog from './PermissionSettingsDialog.vue'
import UserListDialog from './UserListDialog.vue'
import PermissionListDialog from './PermissionListDialog.vue'

interface RoleData {
  id: string
  name: string
  code: string
  status: 'active' | 'inactive'
  roleType?: 'system' | 'business' | 'temporary' | 'custom'
  dataScope?: 'all' | 'department' | 'self'
  description?: string
  createTime?: string
  userCount?: number
  permissionCount?: number
  permissions?: string[]
  isSystem?: boolean
  statusLoading?: boolean
}

const userStore = useUserStore()

// 响应式数据
const tableLoading = ref(false)
const roleList = ref<RoleData[]>([])
const selectedRoles = ref<RoleData[]>([])
const pagination = reactive({ page: 1, size: 20, total: 0 })
const searchForm = reactive({ name: '', status: '', createTimeRange: [] as any[] })
const roleStats = ref({ total: 0, active: 0, permissions: 0 })

// 对话框控制
const roleDialogVisible = ref(false)
const isEdit = ref(false)
const editFormData = ref<any>(null)
const permissionSettingsVisible = ref(false)
const permissionManageVisible = ref(false)
const currentPermRole = ref<any>(null)
const userListVisible = ref(false)
const permissionListVisible = ref(false)
const currentViewRole = ref<any>(null)
const permSettingsRef = ref<any>()

// 系统预设角色
const SYSTEM_PRESET_ROLES = ['super_admin', 'admin', 'department_manager', 'sales_staff', 'customer_service']
const NON_DISABLEABLE_ROLES = ['super_admin', 'admin']

// 权限控制
const canAddRole = computed(() => userStore.isAdmin)
const canEditRole = computed(() => userStore.isAdmin)
const canDeleteRole = computed(() => userStore.isAdmin)
const canManagePermissions = computed(() => userStore.isAdmin)
const canAssignPermissions = computed(() => userStore.isAdmin)
const canBatchOperation = computed(() => userStore.isAdmin)

const isSystemPresetRole = (role: RoleData) => SYSTEM_PRESET_ROLES.includes(role.code) || role.isSystem === true
const isNonDisableableRole = (role: RoleData) => NON_DISABLEABLE_ROLES.includes(role.code)

// ========== 角色CRUD ==========
const handleAdd = () => {
  isEdit.value = false
  editFormData.value = null
  roleDialogVisible.value = true
}

const handleEdit = (row: RoleData) => {
  isEdit.value = true
  editFormData.value = {
    id: row.id, name: row.name, code: row.code,
    status: row.status, roleType: row.roleType || 'custom', description: row.description
  }
  roleDialogVisible.value = true
}

const handleCopy = (row: RoleData) => {
  isEdit.value = false
  editFormData.value = {
    id: '', name: `${row.name}_副本`, code: `${row.code}_COPY`,
    status: row.status, roleType: row.roleType || 'custom', description: row.description
  }
  roleDialogVisible.value = true
}

const handleFormSuccess = () => {
  loadRoleList()
  loadRoleStats()
}

const handleDelete = async (row: RoleData) => {
  if (isSystemPresetRole(row)) { ElMessage.warning('系统预设角色不可删除'); return }
  try {
    await ElMessageBox.confirm(`确定要删除角色"${row.name}"吗？删除后不可恢复！`, '确认删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await roleApiService.deleteRole(row.id)
    ElMessage.success('删除成功')
    loadRoleList()
    loadRoleStats()
  } catch (error: any) {
    if (error.message && error.message !== 'cancel') {
      console.error('删除角色失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const handleBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(`确定要删除选中的 ${selectedRoles.value.length} 个角色吗？`, '确认批量删除', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await roleApiService.batchDeleteRoles(selectedRoles.value.map(r => r.id))
    ElMessage.success('批量删除成功')
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats()
  } catch (error: any) {
    if (error.message && error.message !== 'cancel') { ElMessage.error('批量删除失败') }
  }
}

const handleBatchStatus = async (status: 'active' | 'inactive') => {
  const action = status === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${action}选中的 ${selectedRoles.value.length} 个角色吗？`, `确认批量${action}`, { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await roleApiService.batchUpdateRoleStatus(selectedRoles.value.map(r => r.id), status)
    ElMessage.success(`批量${action}成功`)
    selectedRoles.value = []
    loadRoleList()
    loadRoleStats()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(`批量${action}失败`)
  }
}

const handleToggleStatus = async (row: RoleData) => {
  const newStatus = row.status === 'active' ? 'inactive' : 'active'
  const action = newStatus === 'active' ? '启用' : '禁用'
  try {
    await ElMessageBox.confirm(`确定要${action}角色"${row.name}"吗？`, '确认操作', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await roleApiService.updateRole({ id: row.id, name: row.name, code: row.code, status: newStatus, roleType: row.roleType, description: row.description })
    row.status = newStatus as any
    ElMessage.success(`${action}成功`)
    await loadRoleList()
    await loadRoleStats()
  } catch (error) {
    if (error !== 'cancel') ElMessage.error(`${action}失败`)
  }
}

const handleRoleStatusChange = async (role: RoleData) => {
  if (isNonDisableableRole(role)) {
    ElMessage.warning('系统预设角色不可禁用')
    role.status = 'active'
    return
  }
  try {
    role.statusLoading = true
    await roleApiService.updateRoleStatus(role.id, role.status)
    ElMessage.success(`角色已${role.status === 'active' ? '启用' : '禁用'}`)
    loadRoleStats()
  } catch (error) {
    console.error('更新角色状态失败:', error)
    ElMessage.error('状态更新失败')
    role.status = role.status === 'active' ? 'inactive' : 'active'
  } finally {
    role.statusLoading = false
  }
}

const handleRoleTypeChange = async (row: RoleData) => {
  if (isSystemPresetRole(row)) {
    ElMessage.warning('系统预设角色不可修改类型')
    await loadRoleList()
    return
  }
  try {
    await roleApiService.updateRole({ id: row.id, name: row.name, code: row.code, status: row.status, roleType: row.roleType, description: row.description })
    ElMessage.success('角色类型更新成功')
    await loadRoleList()
  } catch (error) {
    console.error('更新角色类型失败:', error)
    ElMessage.error('更新角色类型失败')
    await loadRoleList()
  }
}

// ========== 查看操作 ==========
const handlePermissions = (row: RoleData) => {
  currentPermRole.value = row
  permissionSettingsVisible.value = true
}

const handleViewUsers = (row: RoleData) => {
  currentViewRole.value = row
  userListVisible.value = true
}

const handleViewPermissions = (row: RoleData) => {
  currentViewRole.value = row
  permissionListVisible.value = true
}

const handleDropdownCommand = (command: string, row: RoleData) => {
  switch (command) {
    case 'copy': handleCopy(row); break
    case 'toggle': handleToggleStatus(row); break
    case 'delete': handleDelete(row); break
  }
}

// ========== 搜索和分页 ==========
const handleSearch = () => { pagination.page = 1; loadRoleList() }
const handleReset = () => { Object.assign(searchForm, { name: '', status: '', createTimeRange: [] }); handleSearch() }
const handleSelectionChange = (selection: RoleData[]) => { selectedRoles.value = selection }
const handleSizeChange = (size: number) => { pagination.size = size; loadRoleList() }
const handleCurrentChange = (page: number) => { pagination.page = page; loadRoleList() }

// ========== 数据加载 ==========
const loadRoleStats = async () => {
  try {
    const roles = await roleApiService.getRoles()
    let totalPermissions = 0
    try {
      const allPerms = permissionService.getAllPermissions()
      const countPerms = (perms: any[]): number => {
        let count = 0
        perms.forEach(p => { count++; if (p.children?.length) count += countPerms(p.children) })
        return count
      }
      totalPermissions = countPerms(allPerms)
    } catch (_e) { /* ignore */ }

    roleStats.value = {
      total: roles.length,
      active: roles.filter((r: any) => r.status === 'active').length,
      permissions: totalPermissions
    }
  } catch (error) {
    console.error('加载角色统计失败:', error)
    roleStats.value = { total: 0, active: 0, permissions: 0 }
  }
}

const roleNameToCode: Record<string, string> = {
  '超级管理员': 'super_admin', '管理员': 'admin', '系统管理员': 'admin',
  '部门经理': 'department_manager', '经理': 'department_manager',
  '销售员': 'sales_staff', '销售': 'sales_staff',
  '客服': 'customer_service', '客服人员': 'customer_service'
}

const loadRoleList = async () => {
  try {
    tableLoading.value = true
    const roles = await roleApiService.getRoles()

    // 获取用户数据统计
    let users: any[] = []
    try {
      const { default: userDataService } = await import('@/services/userDataService')
      users = await userDataService.getUsers()
    } catch (_e) { /* ignore */ }

    // 统计每个角色用户数
    const roleUserCount: Record<string, number> = {}
    users.forEach((user: any) => {
      let userRoleCode = user.roleId || user.role_id || user.role || ''
      if (roleNameToCode[userRoleCode]) userRoleCode = roleNameToCode[userRoleCode]
      if (userRoleCode) roleUserCount[userRoleCode] = (roleUserCount[userRoleCode] || 0) + 1
    })

    // 计算全部权限数量
    let totalPermissionCount = 0
    const allPermissionIds: string[] = []
    try {
      const allPerms = permissionService.getAllPermissions()
      const countAll = (perms: any[]): number => {
        let count = 0
        perms.forEach(p => { count++; allPermissionIds.push(p.id); if (p.children?.length) count += countAll(p.children) })
        return count
      }
      totalPermissionCount = countAll(allPerms)
    } catch (_e) { totalPermissionCount = 100 }

    // 转换数据
    roleList.value = roles.map((role: any) => {
      const defaultPerms = getDefaultRolePermissions(role.code)
      const permissions = role.permissions?.length > 0 ? role.permissions : defaultPerms
      const userCount = roleUserCount[role.code] || roleUserCount[role.name] || 0
      const permissionCount = permissions.includes('*') ? totalPermissionCount : permissions.filter((p: string) => allPermissionIds.includes(p)).length

      return {
        id: role.id, name: role.name, code: role.code, status: role.status,
        roleType: role.roleType || 'custom', userCount, permissionCount,
        description: role.description || '',
        createTime: role.createdAt ? new Date(role.createdAt).toLocaleString() : '',
        permissions
      }
    })

    pagination.total = roles.length
    localStorage.setItem('crm_roles', JSON.stringify(roleList.value))
  } catch (error) {
    console.error('加载角色列表失败:', error)
    ElMessage.error('加载角色列表失败')
  } finally {
    tableLoading.value = false
  }
}

// 生命周期钩子
onMounted(() => {
  loadRoleStats()
  loadRoleList()
})
</script>

<style scoped>
.role-management { padding: 0; }

.page-header {
  display: flex; justify-content: space-between; align-items: flex-start;
  margin-bottom: 20px; padding: 20px; background: #fff; border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}
.header-left h2 { margin: 0 0 20px 0; color: #303133; }
.stats-section { display: flex; gap: 20px; flex-wrap: nowrap; }
.stat-card { flex: 1; min-width: 180px; max-width: 300px; border-radius: 12px; transition: all 0.3s ease; cursor: pointer; }
.stat-card:hover { transform: translateY(-4px); box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15) !important; }
.stat-content { display: flex; align-items: center; gap: 16px; padding: 8px; }
.stat-icon { width: 60px; height: 60px; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
.stat-icon.primary { background: linear-gradient(135deg, #409eff, #66b3ff); }
.stat-icon.success { background: linear-gradient(135deg, #67c23a, #85ce61); }
.stat-icon.warning { background: linear-gradient(135deg, #e6a23c, #f0c78a); }
.stat-info { flex: 1; }
.stat-number { font-size: 28px; font-weight: bold; font-family: Arial, sans-serif; line-height: 1; margin-bottom: 4px; }
.stat-number.primary { color: #409eff; }
.stat-number.success { color: #67c23a; }
.stat-number.warning { color: #e6a23c; }
.stat-title { font-size: 14px; color: #606266; margin-bottom: 2px; font-weight: 500; }
.stat-desc { font-size: 12px; color: #909399; line-height: 1.2; }
.header-actions { display: flex; gap: 12px; }

.search-card, .table-card { margin-bottom: 20px; }
.table-header { display: flex; justify-content: space-between; align-items: center; }
.table-actions { display: flex; gap: 8px; }
.pagination-container { display: flex; justify-content: center; margin-top: 20px; }
.dialog-footer { display: flex; justify-content: flex-end; gap: 12px; }
.danger-item { color: #f56c6c; }

@media (max-width: 1200px) {
  .page-header { flex-direction: column; gap: 16px; align-items: stretch; }
  .stats-section { gap: 16px; }
  .stat-card { min-width: 160px; }
  .header-actions { justify-content: center; }
}
@media (max-width: 900px) {
  .stats-section { gap: 12px; }
  .stat-card { min-width: 140px; }
  .stat-content { gap: 12px; padding: 6px; }
  .stat-icon { width: 50px; height: 50px; font-size: 20px; }
  .stat-number { font-size: 24px; }
}
@media (max-width: 768px) {
  .stats-section { flex-direction: column; gap: 16px; }
  .stat-card { min-width: auto; max-width: none; }
  .stat-content { gap: 16px; padding: 8px; }
  .stat-icon { width: 60px; height: 60px; font-size: 24px; }
  .stat-number { font-size: 28px; }
  .table-header { flex-direction: column; gap: 12px; align-items: stretch; }
  .table-actions { justify-content: center; flex-wrap: wrap; }
}
</style>





