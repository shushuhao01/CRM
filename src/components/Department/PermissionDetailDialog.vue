<template>
  <el-dialog
    v-model="dialogVisible"
    title="权限详情"
    width="700px"
    :before-close="handleClose"
    class="permission-detail-dialog"
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
              <span class="permission-count">{{ role?.permissions.length || 0 }} 项权限</span>
            </div>
          </div>
        </div>
      </div>

      <el-divider />

      <!-- 权限统计 -->
      <div class="permission-stats">
        <el-row :gutter="16">
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-icon total">
                <el-icon><Key /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ role?.permissions.length || 0 }}</div>
                <div class="stat-label">总权限数</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-icon modules">
                <el-icon><Grid /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ coveredModules.length }}</div>
                <div class="stat-label">覆盖模块</div>
              </div>
            </div>
          </el-col>
          <el-col :span="8">
            <div class="stat-item">
              <div class="stat-icon level">
                <el-icon><TrendCharts /></el-icon>
              </div>
              <div class="stat-content">
                <div class="stat-number">{{ permissionLevel }}</div>
                <div class="stat-label">权限等级</div>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 权限详情 -->
      <div class="permissions-section">
        <div class="section-header">
          <h4>权限详情</h4>
          <div class="view-options">
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button value="category">按模块</el-radio-button>
              <el-radio-button value="list">列表</el-radio-button>
            </el-radio-group>
          </div>
        </div>

        <!-- 按模块视图 -->
        <div v-if="viewMode === 'category'" class="category-view">
          <div
            v-for="category in permissionsByCategory"
            :key="category.key"
            class="permission-category"
          >
            <div class="category-header">
              <div class="category-info">
                <h5 class="category-name">{{ category.name }}</h5>
                <span class="category-count">{{ category.permissions.length }} 项</span>
              </div>
              <div class="category-progress">
                <el-progress
                  :percentage="getCategoryProgress(category)"
                  :stroke-width="6"
                  :show-text="false"
                  :color="getCategoryColor(category)"
                />
              </div>
            </div>
            
            <div class="category-permissions">
              <div
                v-for="permission in category.permissions"
                :key="permission.key"
                class="permission-item"
              >
                <div class="permission-icon">
                  <el-icon><Check /></el-icon>
                </div>
                <div class="permission-content">
                  <span class="permission-name">{{ permission.name }}</span>
                  <span class="permission-desc">{{ permission.description }}</span>
                </div>
                <div class="permission-level">
                  <el-tag :type="getPermissionLevelTag(permission.key)" size="small">
                    {{ getPermissionLevelName(permission.key) }}
                  </el-tag>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 列表视图 -->
        <div v-else class="list-view">
          <el-table :data="permissionList" style="width: 100%">
            <el-table-column prop="name" label="权限名称" width="150">
              <template #default="{ row }">
                <div class="permission-name-cell">
                  <el-icon class="permission-icon"><Check /></el-icon>
                  <span>{{ row.name }}</span>
                </div>
              </template>
            </el-table-column>
            
            <el-table-column prop="description" label="权限描述" min-width="200" />
            
            <el-table-column prop="module" label="所属模块" width="120">
              <template #default="{ row }">
                <el-tag size="small">{{ row.module }}</el-tag>
              </template>
            </el-table-column>
            
            <el-table-column prop="level" label="权限等级" width="100">
              <template #default="{ row }">
                <el-tag :type="getPermissionLevelTag(row.key)" size="small">
                  {{ getPermissionLevelName(row.key) }}
                </el-tag>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>

      <!-- 权限对比 -->
      <div v-if="showComparison" class="comparison-section">
        <div class="section-header">
          <h4>权限对比</h4>
          <el-button size="small" type="text" @click="showComparison = false">
            隐藏对比
          </el-button>
        </div>
        
        <div class="comparison-content">
          <!-- 这里可以添加与其他角色的权限对比 -->
          <el-empty description="暂无对比数据" />
        </div>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleExport" class="export-btn">
          <el-icon><Download /></el-icon>
          导出权限
        </el-button>
        <el-button @click="showComparison = !showComparison" class="compare-btn">
          <el-icon><DataAnalysis /></el-icon>
          权限对比
        </el-button>
        <el-button type="primary" @click="handleClose" class="close-btn">
          关闭
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Key,
  Grid,
  TrendCharts,
  Check,
  Download,
  DataAnalysis,
  Lock,
  Star,
  User
} from '@element-plus/icons-vue'
import { useDepartmentStore } from '@/stores/department'

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

// 权限接口定义
interface Permission {
  key: string
  name: string
  description: string
  module: string
}

interface PermissionCategory {
  key: string
  name: string
  permissions: Permission[]
}

const props = defineProps<{
  modelValue: boolean
  role?: DepartmentRole | null
}>()

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

const departmentStore = useDepartmentStore()

// 响应式数据
const viewMode = ref<'category' | 'list'>('category')
const showComparison = ref(false)

const dialogVisible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 权限定义
const allPermissions: Record<string, Permission> = {
  'customer:read': { key: 'customer:read', name: '查看客户', description: '查看客户基本信息和详情', module: '客户管理' },
  'customer:write': { key: 'customer:write', name: '编辑客户', description: '创建、修改客户信息', module: '客户管理' },
  'customer:delete': { key: 'customer:delete', name: '删除客户', description: '删除客户记录', module: '客户管理' },
  'customer:export': { key: 'customer:export', name: '导出客户', description: '导出客户数据', module: '客户管理' },
  'customer:import': { key: 'customer:import', name: '导入客户', description: '批量导入客户数据', module: '客户管理' },
  'order:read': { key: 'order:read', name: '查看订单', description: '查看订单信息和状态', module: '订单管理' },
  'order:write': { key: 'order:write', name: '编辑订单', description: '创建、修改订单', module: '订单管理' },
  'order:audit': { key: 'order:audit', name: '审核订单', description: '审核订单状态', module: '订单管理' },
  'order:cancel': { key: 'order:cancel', name: '取消订单', description: '取消订单操作', module: '订单管理' },
  'order:refund': { key: 'order:refund', name: '退款处理', description: '处理订单退款', module: '订单管理' },
  'finance:read': { key: 'finance:read', name: '查看财务', description: '查看财务数据和报表', module: '财务管理' },
  'finance:write': { key: 'finance:write', name: '编辑财务', description: '录入、修改财务数据', module: '财务管理' },
  'finance:audit': { key: 'finance:audit', name: '财务审核', description: '审核财务单据', module: '财务管理' },
  'finance:report': { key: 'finance:report', name: '财务报表', description: '生成财务报表', module: '财务管理' },
  'finance:settlement': { key: 'finance:settlement', name: '结算管理', description: '处理结算业务', module: '财务管理' },
  'logistics:read': { key: 'logistics:read', name: '查看物流', description: '查看物流信息', module: '物流管理' },
  'logistics:write': { key: 'logistics:write', name: '编辑物流', description: '创建、修改物流单', module: '物流管理' },
  'logistics:track': { key: 'logistics:track', name: '物流跟踪', description: '跟踪物流状态', module: '物流管理' },
  'logistics:warehouse': { key: 'logistics:warehouse', name: '仓库管理', description: '管理仓库库存', module: '物流管理' },
  'service:read': { key: 'service:read', name: '查看工单', description: '查看客服工单', module: '客服管理' },
  'service:write': { key: 'service:write', name: '处理工单', description: '创建、处理工单', module: '客服管理' },
  'service:assign': { key: 'service:assign', name: '分配工单', description: '分配工单给客服', module: '客服管理' },
  'service:close': { key: 'service:close', name: '关闭工单', description: '关闭已处理工单', module: '客服管理' },
  'system:user': { key: 'system:user', name: '用户管理', description: '管理系统用户', module: '系统管理' },
  'system:role': { key: 'system:role', name: '角色管理', description: '管理用户角色', module: '系统管理' },
  'system:dept': { key: 'system:dept', name: '部门管理', description: '管理部门结构', module: '系统管理' },
  'system:config': { key: 'system:config', name: '系统配置', description: '配置系统参数', module: '系统管理' },
  'system:log': { key: 'system:log', name: '日志查看', description: '查看系统日志', module: '系统管理' },
  'performance:read': { key: 'performance:read', name: '查看绩效', description: '查看绩效数据', module: '绩效管理' }
}

// 计算属性
const coveredModules = computed(() => {
  if (!props.role?.permissions) return []
  const modules = new Set<string>()
  props.role.permissions.forEach(permission => {
    const perm = allPermissions[permission]
    if (perm) {
      modules.add(perm.module)
    }
  })
  return Array.from(modules)
})

const permissionLevel = computed(() => {
  const count = props.role?.permissions.length || 0
  if (count >= 15) return '高级'
  if (count >= 8) return '中级'
  if (count >= 3) return '基础'
  return '无'
})

const permissionsByCategory = computed(() => {
  if (!props.role?.permissions) return []
  
  const categories: Record<string, PermissionCategory> = {}
  
  props.role.permissions.forEach(permissionKey => {
    const permission = allPermissions[permissionKey]
    if (permission) {
      const moduleKey = permission.key.split(':')[0]
      if (!categories[moduleKey]) {
        categories[moduleKey] = {
          key: moduleKey,
          name: permission.module,
          permissions: []
        }
      }
      categories[moduleKey].permissions.push(permission)
    }
  })
  
  return Object.values(categories)
})

const permissionList = computed(() => {
  if (!props.role?.permissions) return []
  
  return props.role.permissions.map(permissionKey => {
    const permission = allPermissions[permissionKey]
    return permission || {
      key: permissionKey,
      name: permissionKey,
      description: '未知权限',
      module: '未知'
    }
  })
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

const getCategoryProgress = (category: PermissionCategory) => {
  // 计算该模块的权限覆盖率
  const modulePermissions = Object.values(allPermissions).filter(p => p.module === category.name)
  if (modulePermissions.length === 0) return 100
  return Math.round((category.permissions.length / modulePermissions.length) * 100)
}

const getCategoryColor = (category: PermissionCategory) => {
  const progress = getCategoryProgress(category)
  if (progress >= 80) return '#67c23a'
  if (progress >= 50) return '#e6a23c'
  return '#f56c6c'
}

const getPermissionLevelTag = (permissionKey: string) => {
  if (permissionKey.includes('delete') || permissionKey.includes('audit')) return 'danger'
  if (permissionKey.includes('write') || permissionKey.includes('edit')) return 'warning'
  return 'success'
}

const getPermissionLevelName = (permissionKey: string) => {
  if (permissionKey.includes('delete') || permissionKey.includes('audit')) return '高级'
  if (permissionKey.includes('write') || permissionKey.includes('edit')) return '中级'
  return '基础'
}

// 事件处理
const handleClose = () => {
  emit('update:modelValue', false)
}

const handleExport = () => {
  // 导出权限列表
  const data = permissionList.value.map(p => ({
    权限名称: p.name,
    权限描述: p.description,
    所属模块: p.module,
    权限等级: getPermissionLevelName(p.key)
  }))
  
  // 这里可以实现实际的导出功能
  console.log('导出数据:', data)
  ElMessage.success('权限列表已导出')
}
</script>

<style scoped>
.permission-detail-dialog {
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

.department-name,
.permission-count {
  font-size: 14px;
  color: #606266;
}

.permission-stats {
  margin-bottom: 24px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: white;
  border-radius: 8px;
  border: 1px solid #e4e7ed;
}

.stat-icon {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: white;
}

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.modules {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.level {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 20px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 12px;
  color: #909399;
}

.permissions-section {
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

.section-header h4 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.category-view {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.permission-category {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: white;
}

.category-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.category-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-name {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: #303133;
}

.category-count {
  font-size: 12px;
  color: #909399;
  background: #f1f3f4;
  padding: 2px 8px;
  border-radius: 10px;
}

.category-progress {
  width: 100px;
}

.category-permissions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px;
  background: #f8f9fa;
  border-radius: 6px;
}

.permission-icon {
  width: 20px;
  height: 20px;
  background: #67c23a;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 12px;
}

.permission-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.permission-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.permission-desc {
  font-size: 12px;
  color: #909399;
  line-height: 1.3;
}

.permission-level {
  flex-shrink: 0;
}

.permission-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.permission-name-cell .permission-icon {
  position: static;
  width: 16px;
  height: 16px;
  font-size: 10px;
}

.comparison-section {
  border-top: 1px solid #f1f3f4;
  padding-top: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.export-btn,
.compare-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 16px;
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn {
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

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
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

:deep(.el-progress-bar__outer) {
  border-radius: 3px;
}

:deep(.el-progress-bar__inner) {
  border-radius: 3px;
}

:deep(.el-radio-button__inner) {
  border-radius: 6px;
}

:deep(.el-divider) {
  margin: 20px 0;
}
</style>