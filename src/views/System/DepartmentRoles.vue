<template>
  <div class="department-roles-container">
    <!-- 页面标题 -->
    <div class="page-header">
      <div class="header-left">
        <h2 class="page-title">部门角色权限</h2>
        <p class="page-desc">管理不同部门的角色权限配置，包括部门负责人、普通成员等角色</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="handleAddRole" class="add-btn">
          新建角色
        </el-button>
        <el-button :icon="Setting" @click="handleBatchConfig" class="batch-btn">
          批量配置
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon roles">
              <el-icon><UserFilled /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ roleStats.totalRoles }}</div>
              <div class="stat-label">总角色数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon departments">
              <el-icon><OfficeBuilding /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ roleStats.departmentsWithRoles }}</div>
              <div class="stat-label">已配置部门</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon permissions">
              <el-icon><Key /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ roleStats.totalPermissions }}</div>
              <div class="stat-label">权限总数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon users">
              <el-icon><Avatar /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ roleStats.usersWithRoles }}</div>
              <div class="stat-label">已分配用户</div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 筛选和搜索 -->
    <div class="filter-section">
      <el-row :gutter="20" align="middle">
        <el-col :span="6">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索角色名称"
            :prefix-icon="Search"
            clearable
          />
        </el-col>
        <el-col :span="6">
          <el-select v-model="departmentFilter" placeholder="选择部门" clearable>
            <el-option label="全部部门" value="" />
            <el-option
              v-for="dept in departmentStore.departmentList"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="roleTypeFilter" placeholder="角色类型" clearable>
            <el-option label="全部类型" value="" />
            <el-option label="部门负责人" value="manager" />
            <el-option label="普通成员" value="member" />
            <el-option label="专员" value="specialist" />
            <el-option label="主管" value="supervisor" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-button :icon="Refresh" @click="handleRefresh" class="refresh-btn">
            刷新
          </el-button>
        </el-col>
      </el-row>
    </div>

    <!-- 角色列表 -->
    <div class="roles-section">
      <div class="section-header">
        <h3>角色列表</h3>
        <div class="view-options">
          <el-radio-group v-model="viewMode" size="small">
            <el-radio-button value="card">卡片视图</el-radio-button>
            <el-radio-button value="table">表格视图</el-radio-button>
          </el-radio-group>
        </div>
      </div>

      <!-- 卡片视图 -->
      <div v-if="viewMode === 'card'" class="roles-grid">
        <div
          v-for="role in filteredRoles"
          :key="role.id"
          class="role-card"
          @click="handleViewRole(role)"
        >
          <div class="role-header">
            <div class="role-info">
              <div class="role-icon" :style="{ background: getRoleColor(role.type) }">
                <el-icon><component :is="getRoleIcon(role.type)" /></el-icon>
              </div>
              <div class="role-details">
                <h4 class="role-name">{{ role.name }}</h4>
                <p class="role-desc">{{ role.description }}</p>
              </div>
            </div>
            <el-dropdown @command="handleRoleAction">
              <el-button type="text" :icon="MoreFilled" />
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item :command="{ action: 'edit', role }">编辑</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'copy', role }">复制</el-dropdown-item>
                  <el-dropdown-item :command="{ action: 'delete', role }" divided>删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          
          <div class="role-meta">
            <div class="meta-item">
              <span class="meta-label">所属部门：</span>
              <span class="meta-value">{{ getDepartmentName(role.departmentId) }}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">角色类型：</span>
              <el-tag :type="getRoleTypeTag(role.type)" size="small">
                {{ getRoleTypeName(role.type) }}
              </el-tag>
            </div>
            <div class="meta-item">
              <span class="meta-label">权限数量：</span>
              <span class="meta-value">{{ role.permissions.length }} 项</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">分配用户：</span>
              <span class="meta-value">{{ role.userCount }} 人</span>
            </div>
          </div>

          <div class="role-permissions">
            <div class="permissions-header">
              <span>主要权限</span>
              <el-button type="text" size="small" @click.stop="handleViewPermissions(role)">
                查看全部
              </el-button>
            </div>
            <div class="permissions-list">
              <el-tag
                v-for="permission in role.permissions.slice(0, 3)"
                :key="permission"
                size="small"
                class="permission-tag"
              >
                {{ getPermissionName(permission) }}
              </el-tag>
              <el-tag v-if="role.permissions.length > 3" size="small" type="info">
                +{{ role.permissions.length - 3 }}
              </el-tag>
            </div>
          </div>

          <div class="role-actions">
            <el-button size="small" type="primary" @click.stop="handleEditRole(role)">
              编辑
            </el-button>
            <el-button size="small" type="success" @click.stop="handleAssignUsers(role)">
              分配用户
            </el-button>
          </div>
        </div>
      </div>

      <!-- 表格视图 -->
      <div v-else class="roles-table">
        <el-table :data="filteredRoles" v-loading="loading">
          <el-table-column prop="name" label="角色名称" width="200">
            <template #default="{ row }">
              <div class="role-name-cell">
                <div class="role-icon-small" :style="{ background: getRoleColor(row.type) }">
                  <el-icon><component :is="getRoleIcon(row.type)" /></el-icon>
                </div>
                <span>{{ row.name }}</span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="departmentId" label="所属部门" width="150">
            <template #default="{ row }">
              {{ getDepartmentName(row.departmentId) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="type" label="角色类型" width="120">
            <template #default="{ row }">
              <el-tag :type="getRoleTypeTag(row.type)" size="small">
                {{ getRoleTypeName(row.type) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="permissions" label="权限数量" width="100">
            <template #default="{ row }">
              {{ row.permissions.length }} 项
            </template>
          </el-table-column>
          
          <el-table-column prop="userCount" label="分配用户" width="100">
            <template #default="{ row }">
              {{ row.userCount }} 人
            </template>
          </el-table-column>
          
          <el-table-column prop="updatedAt" label="更新时间" width="180">
            <template #default="{ row }">
              {{ formatDate(row.updatedAt) }}
            </template>
          </el-table-column>
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <div class="table-actions">
                <el-button size="small" type="primary" link @click="handleEditRole(row)">
                  编辑
                </el-button>
                <el-button size="small" type="success" link @click="handleAssignUsers(row)">
                  分配用户
                </el-button>
                <el-button size="small" type="info" link @click="handleViewPermissions(row)">
                  权限详情
                </el-button>
                <el-popconfirm title="确定要删除这个角色吗？" @confirm="handleDeleteRole(row)">
                  <template #reference>
                    <el-button size="small" type="danger" link>删除</el-button>
                  </template>
                </el-popconfirm>
              </div>
            </template>
          </el-table-column>
        </el-table>
      </div>
    </div>

    <!-- 角色编辑弹窗 -->
    <RoleDialog
      v-model="roleDialogVisible"
      :role="currentRole"
      :is-edit="isEdit"
      @success="handleRoleSuccess"
    />

    <!-- 用户分配弹窗 -->
    <UserAssignDialog
      v-model="assignDialogVisible"
      :role="currentRole"
      @success="handleAssignSuccess"
    />

    <!-- 权限详情弹窗 -->
    <PermissionDetailDialog
      v-model="permissionDetailVisible"
      :role="currentRole"
    />

    <!-- 批量配置弹窗 -->
    <BatchConfigDialog
      v-model="batchConfigVisible"
      @success="handleBatchSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Plus,
  Search,
  Refresh,
  Setting,
  UserFilled,
  OfficeBuilding,
  Key,
  Avatar,
  MoreFilled,
  User,
  Lock,
  Star
} from '@element-plus/icons-vue'
import { useDepartmentStore } from '@/stores/department'
import RoleDialog from '@/components/Department/RoleDialog.vue'
import UserAssignDialog from '@/components/Department/UserAssignDialog.vue'
import PermissionDetailDialog from '@/components/Department/PermissionDetailDialog.vue'
import BatchConfigDialog from '@/components/Department/BatchConfigDialog.vue'

// 角色接口定义
interface DepartmentRole {
  id: string
  name: string
  description: string
  departmentId: string
  type: 'manager' | 'member' | 'specialist' | 'supervisor'
  permissions: string[]
  userCount: number
  createdAt: string
  updatedAt: string
}

// 角色统计接口
interface RoleStats {
  totalRoles: number
  departmentsWithRoles: number
  totalPermissions: number
  usersWithRoles: number
}

const departmentStore = useDepartmentStore()

// 响应式数据
const searchKeyword = ref('')
const departmentFilter = ref('')
const roleTypeFilter = ref('')
const viewMode = ref<'card' | 'table'>('card')
const loading = ref(false)

const roleDialogVisible = ref(false)
const assignDialogVisible = ref(false)
const permissionDetailVisible = ref(false)
const batchConfigVisible = ref(false)
const currentRole = ref<DepartmentRole | null>(null)
const isEdit = ref(false)

// 模拟角色数据
const roles = ref<DepartmentRole[]>([
  {
    id: '1',
    name: '销售部经理',
    description: '销售部门负责人，负责销售团队管理和业务决策',
    departmentId: '2',
    type: 'manager',
    permissions: ['customer:read', 'customer:write', 'order:read', 'order:write', 'performance:read'],
    userCount: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '2',
    name: '销售专员',
    description: '销售部门普通成员，负责客户开发和订单处理',
    departmentId: '2',
    type: 'member',
    permissions: ['customer:read', 'customer:write', 'order:read', 'order:write'],
    userCount: 8,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '3',
    name: '审核主管',
    description: '审核部门负责人，负责订单审核和风险控制',
    departmentId: '3',
    type: 'manager',
    permissions: ['order:read', 'order:audit', 'customer:read', 'finance:read'],
    userCount: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  },
  {
    id: '4',
    name: '财务经理',
    description: '财务部门负责人，负责财务管理和报表分析',
    departmentId: '4',
    type: 'manager',
    permissions: ['finance:read', 'finance:write', 'finance:audit', 'finance:report'],
    userCount: 1,
    createdAt: '2024-01-01',
    updatedAt: '2024-01-01'
  }
])

// 角色统计
const roleStats = computed<RoleStats>(() => {
  const departmentIds = new Set(roles.value.map(r => r.departmentId))
  const totalPermissions = new Set(roles.value.flatMap(r => r.permissions)).size
  const totalUsers = roles.value.reduce((sum, r) => sum + r.userCount, 0)
  
  return {
    totalRoles: roles.value.length,
    departmentsWithRoles: departmentIds.size,
    totalPermissions,
    usersWithRoles: totalUsers
  }
})

// 过滤后的角色
const filteredRoles = computed(() => {
  let filtered = roles.value
  
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(role => 
      role.name.toLowerCase().includes(keyword) ||
      role.description.toLowerCase().includes(keyword)
    )
  }
  
  if (departmentFilter.value) {
    filtered = filtered.filter(role => role.departmentId === departmentFilter.value)
  }
  
  if (roleTypeFilter.value) {
    filtered = filtered.filter(role => role.type === roleTypeFilter.value)
  }
  
  return filtered
})

// 工具方法
const getDepartmentName = (departmentId: string) => {
  const dept = departmentStore.getDepartmentById(departmentId)
  return dept?.name || '未知部门'
}

const getRoleColor = (type: string) => {
  const colors = {
    manager: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    member: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    specialist: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    supervisor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  }
  return colors[type as keyof typeof colors] || colors.member
}

const getRoleIcon = (type: string) => {
  const icons = {
    manager: Star,
    member: User,
    specialist: Star,
    supervisor: Lock
  }
  return icons[type as keyof typeof icons] || User
}

const getRoleTypeTag = (type: string) => {
  const tags = {
    manager: 'danger',
    member: 'primary',
    specialist: 'success',
    supervisor: 'warning'
  }
  return tags[type as keyof typeof tags] || 'primary'
}

const getRoleTypeName = (type: string) => {
  const names = {
    manager: '部门负责人',
    member: '普通成员',
    specialist: '专员',
    supervisor: '主管'
  }
  return names[type as keyof typeof names] || '未知'
}

const getPermissionName = (permission: string) => {
  const names: Record<string, string> = {
    'customer:read': '查看客户',
    'customer:write': '编辑客户',
    'order:read': '查看订单',
    'order:write': '编辑订单',
    'order:audit': '审核订单',
    'finance:read': '查看财务',
    'finance:write': '编辑财务',
    'finance:audit': '财务审核',
    'finance:report': '财务报表',
    'performance:read': '查看绩效'
  }
  return names[permission] || permission
}

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleString('zh-CN')
}

// 事件处理
const handleRefresh = () => {
  searchKeyword.value = ''
  departmentFilter.value = ''
  roleTypeFilter.value = ''
  ElMessage.success('数据已刷新')
}

const handleAddRole = () => {
  currentRole.value = null
  isEdit.value = false
  roleDialogVisible.value = true
}

const handleEditRole = (role: DepartmentRole) => {
  currentRole.value = role
  isEdit.value = true
  roleDialogVisible.value = true
}

const handleViewRole = (role: DepartmentRole) => {
  // 查看角色详情
  console.log('查看角色:', role)
}

const handleDeleteRole = (role: DepartmentRole) => {
  const index = roles.value.findIndex(r => r.id === role.id)
  if (index > -1) {
    roles.value.splice(index, 1)
    ElMessage.success('角色删除成功')
  }
}

const handleAssignUsers = (role: DepartmentRole) => {
  currentRole.value = role
  assignDialogVisible.value = true
}

const handleViewPermissions = (role: DepartmentRole) => {
  currentRole.value = role
  permissionDetailVisible.value = true
}

const handleBatchConfig = () => {
  batchConfigVisible.value = true
}

const handleRoleAction = ({ action, role }: { action: string; role: DepartmentRole }) => {
  switch (action) {
    case 'edit':
      handleEditRole(role)
      break
    case 'copy':
      // 复制角色逻辑
      console.log('复制角色:', role)
      break
    case 'delete':
      handleDeleteRole(role)
      break
  }
}

const handleRoleSuccess = () => {
  roleDialogVisible.value = false
  ElMessage.success(isEdit.value ? '角色更新成功' : '角色创建成功')
}

const handleAssignSuccess = () => {
  assignDialogVisible.value = false
  ElMessage.success('用户分配成功')
}

const handleBatchSuccess = () => {
  batchConfigVisible.value = false
  ElMessage.success('批量配置成功')
}

onMounted(() => {
  // 初始化数据
})
</script>

<style scoped>
.department-roles-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
}

.header-left {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.page-desc {
  margin: 0;
  color: #909399;
  font-size: 14px;
  line-height: 1.5;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

.batch-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 20px;
}

.stats-section {
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

.stat-icon.roles {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.departments {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.permissions {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.users {
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

.filter-section {
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

.roles-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f3f4;
}

.section-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.roles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(400px, 1fr));
  gap: 20px;
}

.role-card {
  border: 1px solid #e4e7ed;
  border-radius: 12px;
  padding: 20px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.role-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.role-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16px;
}

.role-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  flex: 1;
}

.role-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.role-details {
  flex: 1;
}

.role-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.role-desc {
  margin: 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.role-meta {
  margin-bottom: 16px;
}

.meta-item {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
}

.meta-item:last-child {
  margin-bottom: 0;
}

.meta-label {
  font-size: 14px;
  color: #909399;
  min-width: 80px;
}

.meta-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.role-permissions {
  margin-bottom: 16px;
  padding: 12px;
  background: #f8f9fa;
  border-radius: 8px;
}

.permissions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

.permissions-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.permission-tag {
  border-radius: 4px;
  font-size: 12px;
}

.role-actions {
  display: flex;
  gap: 8px;
}

.role-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.role-icon-small {
  width: 32px;
  height: 32px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: white;
}

.table-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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

:deep(.el-radio-button__inner) {
  border-radius: 6px;
}
</style>