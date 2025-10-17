<template>
  <el-dialog
    v-model="dialogVisible"
    title="分配用户"
    width="900px"
    :before-close="handleClose"
    class="user-assign-dialog"
  >
    <div class="dialog-content">
      <!-- 角色信息 -->
      <div class="role-info-section">
        <div class="role-header">
          <div class="role-icon" :style="{ background: getRoleColor(role?.type) }">
            <el-icon><component :is="getRoleIcon(role?.type)" /></el-icon>
          </div>
          <div class="role-details">
            <h3 class="role-name">{{ role?.name }}</h3>
            <p class="role-desc">{{ role?.description }}</p>
            <div class="role-meta">
              <el-tag :type="getRoleTypeTag(role?.type)" size="small">
                {{ getRoleTypeName(role?.type) }}
              </el-tag>
              <span class="department-name">{{ getDepartmentName(role?.departmentId) }}</span>
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 搜索和筛选 -->
      <div class="filter-section">
        <el-row :gutter="20" align="middle">
          <el-col :span="8">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索用户姓名、工号"
              :prefix-icon="Search"
              clearable
            />
          </el-col>
          <el-col :span="6">
            <el-select v-model="statusFilter" placeholder="用户状态" clearable>
              <el-option label="全部状态" value="" />
              <el-option label="在职" value="active" />
              <el-option label="离职" value="inactive" />
              <el-option label="试用期" value="probation" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="departmentFilter" placeholder="所属部门" clearable>
              <el-option label="全部部门" value="" />
              <el-option
                v-for="dept in departmentStore.departmentList"
                :key="dept.id"
                :label="dept.name"
                :value="dept.id"
              />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button :icon="Refresh" @click="handleRefresh" class="refresh-btn">
              刷新
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 用户列表 -->
      <div class="users-section">
        <div class="section-header">
          <div class="header-left">
            <h4>可分配用户</h4>
            <span class="user-count">共 {{ filteredUsers.length }} 人</span>
          </div>
          <div class="header-actions">
            <el-button
              size="small"
              :disabled="selectedUsers.length === 0"
              @click="handleBatchAssign"
              class="batch-btn"
            >
              批量分配 ({{ selectedUsers.length }})
            </el-button>
          </div>
        </div>

        <div class="users-grid">
          <div
            v-for="user in filteredUsers"
            :key="user.id"
            class="user-card"
            :class="{ 
              'selected': selectedUsers.includes(user.id),
              'assigned': isUserAssigned(user.id)
            }"
            @click="toggleUserSelection(user)"
          >
            <div class="user-avatar">
              <el-avatar :size="48" :src="user.avatar">
                {{ user.name.charAt(0) }}
              </el-avatar>
              <div v-if="isUserAssigned(user.id)" class="assigned-badge">
                <el-icon><Check /></el-icon>
              </div>
            </div>
            
            <div class="user-info">
              <h5 class="user-name">{{ user.name }}</h5>
              <p class="user-id">工号：{{ user.employeeId }}</p>
              <p class="user-department">{{ getDepartmentName(user.departmentId) }}</p>
              <div class="user-status">
                <el-tag :type="getUserStatusTag(user.status)" size="small">
                  {{ getUserStatusName(user.status) }}
                </el-tag>
              </div>
            </div>

            <div class="user-actions">
              <el-button
                v-if="!isUserAssigned(user.id)"
                size="small"
                type="primary"
                @click.stop="handleAssignUser(user)"
                class="assign-btn"
              >
                分配
              </el-button>
              <el-button
                v-else
                size="small"
                type="danger"
                @click.stop="handleUnassignUser(user)"
                class="unassign-btn"
              >
                取消分配
              </el-button>
            </div>

            <div class="selection-indicator">
              <el-checkbox
                v-model="selectedUsers"
                :value="user.id"
                @click.stop
              />
            </div>
          </div>
        </div>

        <!-- 空状态 -->
        <div v-if="filteredUsers.length === 0" class="empty-state">
          <el-empty description="暂无可分配的用户" />
        </div>
      </div>

      <!-- 已分配用户 -->
      <div v-if="assignedUsers.length > 0" class="assigned-section">
        <div class="section-header">
          <h4>已分配用户</h4>
          <span class="user-count">{{ assignedUsers.length }} 人</span>
        </div>
        
        <div class="assigned-users">
          <div
            v-for="user in assignedUsers"
            :key="user.id"
            class="assigned-user"
          >
            <el-avatar :size="32" :src="user.avatar">
              {{ user.name.charAt(0) }}
            </el-avatar>
            <span class="user-name">{{ user.name }}</span>
            <span class="user-id">{{ user.employeeId }}</span>
            <el-button
              size="small"
              type="danger"
              link
              @click="handleUnassignUser(user)"
            >
              移除
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose" class="cancel-btn">取消</el-button>
        <el-button
          type="primary"
          @click="handleSave"
          :loading="loading"
          :disabled="!hasChanges"
          class="save-btn"
        >
          保存分配
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Refresh, Check, Lock, Star, User } from '@element-plus/icons-vue'
import { useDepartmentStore } from '@/stores/department'

// 用户接口定义
interface User {
  id: string
  name: string
  employeeId: string
  avatar: string
  departmentId: string
  status: 'active' | 'inactive' | 'probation'
  email: string
  phone: string
}

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

const props = defineProps<{
  modelValue: boolean
  role?: DepartmentRole | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  success: []
}>()

const departmentStore = useDepartmentStore()

// 响应式数据
const searchKeyword = ref('')
const statusFilter = ref('')
const departmentFilter = ref('')
const selectedUsers = ref<string[]>([])
const assignedUsers = ref<User[]>([])
const originalAssignedUsers = ref<string[]>([])
const loading = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 模拟用户数据
const users = ref<User[]>([
  {
    id: '1',
    name: '张三',
    employeeId: 'EMP001',
    avatar: '',
    departmentId: '2',
    status: 'active',
    email: 'zhangsan@company.com',
    phone: '13800138001'
  },
  {
    id: '2',
    name: '李四',
    employeeId: 'EMP002',
    avatar: '',
    departmentId: '2',
    status: 'active',
    email: 'lisi@company.com',
    phone: '13800138002'
  },
  {
    id: '3',
    name: '王五',
    employeeId: 'EMP003',
    avatar: '',
    departmentId: '3',
    status: 'active',
    email: 'wangwu@company.com',
    phone: '13800138003'
  },
  {
    id: '4',
    name: '赵六',
    employeeId: 'EMP004',
    avatar: '',
    departmentId: '4',
    status: 'probation',
    email: 'zhaoliu@company.com',
    phone: '13800138004'
  },
  {
    id: '5',
    name: '钱七',
    employeeId: 'EMP005',
    avatar: '',
    departmentId: '2',
    status: 'inactive',
    email: 'qianqi@company.com',
    phone: '13800138005'
  }
])

// 计算属性
const filteredUsers = computed(() => {
  let filtered = users.value

  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    filtered = filtered.filter(user =>
      user.name.toLowerCase().includes(keyword) ||
      user.employeeId.toLowerCase().includes(keyword)
    )
  }

  if (statusFilter.value) {
    filtered = filtered.filter(user => user.status === statusFilter.value)
  }

  if (departmentFilter.value) {
    filtered = filtered.filter(user => user.departmentId === departmentFilter.value)
  }

  return filtered
})

const hasChanges = computed(() => {
  const currentAssigned = assignedUsers.value.map(u => u.id).sort()
  const original = originalAssignedUsers.value.sort()
  return JSON.stringify(currentAssigned) !== JSON.stringify(original)
})

// 工具方法
const getDepartmentName = (departmentId?: string) => {
  if (!departmentId) return '未知部门'
  const dept = departmentStore.getDepartmentById(departmentId)
  return dept?.name || '未知部门'
}

const getRoleColor = (type?: string) => {
  const colors = {
    manager: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    member: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    specialist: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    supervisor: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  }
  return colors[type as keyof typeof colors] || colors.member
}

const getRoleIcon = (type?: string) => {
  const icons = {
    manager: Star,
    member: User,
    specialist: Star,
    supervisor: Lock
  }
  return icons[type as keyof typeof icons] || User
}

const getRoleTypeTag = (type?: string) => {
  const tags = {
    manager: 'danger',
    member: 'primary',
    specialist: 'success',
    supervisor: 'warning'
  }
  return tags[type as keyof typeof tags] || 'primary'
}

const getRoleTypeName = (type?: string) => {
  const names = {
    manager: '部门负责人',
    member: '普通成员',
    specialist: '专员',
    supervisor: '主管'
  }
  return names[type as keyof typeof names] || '未知'
}

const getUserStatusTag = (status: string) => {
  const tags = {
    active: 'success',
    inactive: 'danger',
    probation: 'warning'
  }
  return tags[status as keyof typeof tags] || 'info'
}

const getUserStatusName = (status: string) => {
  const names = {
    active: '在职',
    inactive: '离职',
    probation: '试用期'
  }
  return names[status as keyof typeof names] || '未知'
}

const isUserAssigned = (userId: string) => {
  return assignedUsers.value.some(user => user.id === userId)
}

// 事件处理
const handleRefresh = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  departmentFilter.value = ''
  selectedUsers.value = []
  ElMessage.success('数据已刷新')
}

const toggleUserSelection = (user: User) => {
  if (isUserAssigned(user.id)) return
  
  const index = selectedUsers.value.indexOf(user.id)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  } else {
    selectedUsers.value.push(user.id)
  }
}

const handleAssignUser = (user: User) => {
  if (!isUserAssigned(user.id)) {
    assignedUsers.value.push(user)
    // 从选中列表中移除
    const index = selectedUsers.value.indexOf(user.id)
    if (index > -1) {
      selectedUsers.value.splice(index, 1)
    }
  }
}

const handleUnassignUser = (user: User) => {
  const index = assignedUsers.value.findIndex(u => u.id === user.id)
  if (index > -1) {
    assignedUsers.value.splice(index, 1)
  }
}

const handleBatchAssign = () => {
  selectedUsers.value.forEach(userId => {
    const user = users.value.find(u => u.id === userId)
    if (user && !isUserAssigned(userId)) {
      assignedUsers.value.push(user)
    }
  })
  selectedUsers.value = []
}

const initData = () => {
  // 模拟获取已分配用户
  if (props.role) {
    // 这里应该从API获取已分配的用户
    assignedUsers.value = users.value.slice(0, 2) // 模拟数据
    originalAssignedUsers.value = assignedUsers.value.map(u => u.id)
  }
  selectedUsers.value = []
}

const handleClose = () => {
  // 重置数据
  assignedUsers.value = users.value.filter(u => originalAssignedUsers.value.includes(u.id))
  selectedUsers.value = []
  searchKeyword.value = ''
  statusFilter.value = ''
  departmentFilter.value = ''
  emit('update:modelValue', false)
}

const handleSave = async () => {
  try {
    loading.value = true
    
    // 模拟API调用
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    originalAssignedUsers.value = assignedUsers.value.map(u => u.id)
    emit('success')
    ElMessage.success('用户分配成功')
  } catch (error) {
    ElMessage.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

// 监听器
watch(() => props.modelValue, (visible) => {
  if (visible) {
    nextTick(() => {
      initData()
    })
  }
})
</script>

<style scoped>
.user-assign-dialog {
  border-radius: 12px;
}

.dialog-content {
  max-height: 70vh;
  overflow-y: auto;
}

.role-info-section {
  margin-bottom: 20px;
}

.role-header {
  display: flex;
  align-items: center;
  gap: 16px;
}

.role-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: white;
}

.role-details {
  flex: 1;
}

.role-name {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.role-desc {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #909399;
  line-height: 1.4;
}

.role-meta {
  display: flex;
  align-items: center;
  gap: 12px;
}

.department-name {
  font-size: 14px;
  color: #606266;
}

.filter-section {
  margin-bottom: 24px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.refresh-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
}

.users-section {
  margin-bottom: 24px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f3f4;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.header-left h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.user-count {
  font-size: 14px;
  color: #909399;
  background: #f1f3f4;
  padding: 2px 8px;
  border-radius: 10px;
}

.batch-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 6px;
  font-weight: 500;
}

.users-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.user-card {
  position: relative;
  border: 2px solid #e4e7ed;
  border-radius: 12px;
  padding: 16px;
  background: white;
  cursor: pointer;
  transition: all 0.2s ease;
}

.user-card:hover {
  border-color: #667eea;
  box-shadow: 0 4px 20px rgba(102, 126, 234, 0.15);
  transform: translateY(-2px);
}

.user-card.selected {
  border-color: #667eea;
  background: #f0f2ff;
}

.user-card.assigned {
  border-color: #67c23a;
  background: #f0f9ff;
}

.user-avatar {
  position: relative;
  display: flex;
  justify-content: center;
  margin-bottom: 12px;
}

.assigned-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
  border: 2px solid white;
}

.user-info {
  text-align: center;
  margin-bottom: 12px;
}

.user-name {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.user-id {
  margin: 0 0 4px 0;
  font-size: 12px;
  color: #909399;
}

.user-department {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: #606266;
}

.user-status {
  display: flex;
  justify-content: center;
}

.user-actions {
  display: flex;
  justify-content: center;
}

.assign-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  color: white;
  border-radius: 6px;
  font-weight: 500;
}

.unassign-btn {
  background: #f56565;
  border: none;
  color: white;
  border-radius: 6px;
  font-weight: 500;
}

.selection-indicator {
  position: absolute;
  top: 8px;
  left: 8px;
}

.assigned-section {
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.assigned-users {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.assigned-user {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.assigned-user .user-name {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
}

.assigned-user .user-id {
  font-size: 12px;
  color: #909399;
}

.empty-state {
  padding: 40px;
  text-align: center;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.cancel-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 20px;
}

.save-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

:deep(.el-dialog__header) {
  padding: 24px 24px 0 24px;
  border-bottom: 1px solid #f1f3f4;
}

:deep(.el-dialog__title) {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

:deep(.el-dialog__body) {
  padding: 24px;
}

:deep(.el-dialog__footer) {
  padding: 0 24px 24px 24px;
  border-top: 1px solid #f1f3f4;
}

:deep(.el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-select .el-input__wrapper) {
  border-radius: 8px;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

:deep(.el-avatar) {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

:deep(.el-checkbox__input.is-checked .el-checkbox__inner) {
  background-color: #667eea;
  border-color: #667eea;
}

:deep(.el-divider) {
  margin: 20px 0;
}
</style>