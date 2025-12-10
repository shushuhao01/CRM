<template>
  <div class="department-detail-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" class="back-btn">返回</el-button>
        <div class="title-section">
          <h2 class="page-title">{{ department?.name }}</h2>
          <div class="department-meta">
            <el-tag type="primary" size="small">{{ department?.code }}</el-tag>
            <span class="level-info">{{ department?.level }}级部门</span>
            <el-tag :type="department?.status === 'active' ? 'success' : 'danger'" size="small">
              {{ department?.status === 'active' ? '活跃' : '停用' }}
            </el-tag>
          </div>
        </div>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Edit" @click="handleEdit" class="edit-btn">
          编辑部门
        </el-button>
        <el-button type="success" :icon="User" @click="handleManageMembers" class="members-btn">
          成员管理
        </el-button>
      </div>
    </div>

    <!-- 基本信息卡片 -->
    <div class="info-section">
      <el-row :gutter="24">
        <el-col :span="16">
          <div class="info-card">
            <div class="card-header">
              <h3>基本信息</h3>
              <el-icon class="header-icon"><InfoFilled /></el-icon>
            </div>
            <div class="info-grid">
              <div class="info-item">
                <span class="label">部门名称</span>
                <span class="value">{{ department?.name }}</span>
              </div>
              <div class="info-item">
                <span class="label">部门编码</span>
                <span class="value">{{ department?.code }}</span>
              </div>
              <div class="info-item">
                <span class="label">部门层级</span>
                <span class="value">{{ department?.level }}级</span>
              </div>
              <div class="info-item">
                <span class="label">排序位置</span>
                <span class="value">第{{ department?.sort }}位</span>
              </div>
              <div class="info-item">
                <span class="label">上级部门</span>
                <span class="value">{{ parentDepartmentName || '无（顶级部门）' }}</span>
              </div>
              <div class="info-item">
                <span class="label">部门状态</span>
                <el-tag :type="department?.status === 'active' ? 'success' : 'danger'" size="small">
                  {{ department?.status === 'active' ? '活跃' : '停用' }}
                </el-tag>
              </div>
              <div class="info-item">
                <span class="label">创建时间</span>
                <span class="value">{{ formatDateTime(department?.createdAt) }}</span>
              </div>
              <div class="info-item">
                <span class="label">更新时间</span>
                <span class="value">{{ formatDateTime(department?.updatedAt) }}</span>
              </div>
            </div>
            <div class="description-section" v-if="department?.description">
              <h4>部门描述</h4>
              <p class="description-text">{{ department.description }}</p>
            </div>
          </div>
        </el-col>

        <el-col :span="8">
          <div class="stats-card">
            <div class="card-header">
              <h3>统计信息</h3>
              <el-icon class="header-icon"><DataAnalysis /></el-icon>
            </div>
            <div class="stats-list">
              <div class="stat-item">
                <div class="stat-icon members">
                  <el-icon><User /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ department?.memberCount || 0 }}</div>
                  <div class="stat-label">部门成员</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon children">
                  <el-icon><OfficeBuilding /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ childDepartments.length }}</div>
                  <div class="stat-label">子部门</div>
                </div>
              </div>
              <div class="stat-item">
                <div class="stat-icon permissions">
                  <el-icon><Key /></el-icon>
                </div>
                <div class="stat-content">
                  <div class="stat-number">{{ department?.permissions?.length || 0 }}</div>
                  <div class="stat-label">权限数量</div>
                </div>
              </div>
            </div>
          </div>
        </el-col>
      </el-row>
    </div>

    <!-- 负责人信息 -->
    <div class="manager-section" v-if="department?.managerId">
      <div class="section-card">
        <div class="card-header">
          <h3>部门负责人</h3>
          <el-icon class="header-icon"><Avatar /></el-icon>
        </div>
        <div class="manager-info">
          <el-avatar :size="60" class="manager-avatar">
            {{ department.managerName?.charAt(0) }}
          </el-avatar>
          <div class="manager-details">
            <div class="manager-name">{{ department.managerName }}</div>
            <div class="manager-id">用户ID: {{ department.managerId }}</div>
            <div class="manager-role">部门负责人</div>
          </div>
          <div class="manager-actions">
            <el-button size="small" type="primary" link>
              查看详情
            </el-button>
            <el-button size="small" type="primary" link>
              发送消息
            </el-button>
          </div>
        </div>
      </div>
    </div>

    <!-- 权限配置 -->
    <div class="permissions-section">
      <div class="section-card">
        <div class="card-header">
          <h3>部门权限</h3>
          <el-icon class="header-icon"><Lock /></el-icon>
        </div>
        <div class="permissions-grid">
          <div
            v-for="(permissions, category) in groupedPermissions"
            :key="category"
            class="permission-category"
          >
            <div class="category-header">
              <el-icon class="category-icon"><Setting /></el-icon>
              <span class="category-name">{{ getCategoryName(category) }}</span>
            </div>
            <div class="permission-list">
              <el-tag
                v-for="permission in permissions"
                :key="permission"
                type="info"
                size="small"
                class="permission-tag"
              >
                {{ getPermissionName(permission) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 子部门列表 -->
    <div class="children-section" v-if="childDepartments.length > 0">
      <div class="section-card">
        <div class="card-header">
          <h3>子部门</h3>
          <el-icon class="header-icon"><Collection /></el-icon>
        </div>
        <div class="children-list">
          <div
            v-for="child in childDepartments"
            :key="child.id"
            class="child-item"
            @click="handleViewChild(child)"
          >
            <div class="child-info">
              <el-icon class="child-icon"><OfficeBuilding /></el-icon>
              <div class="child-details">
                <div class="child-name">{{ child.name }}</div>
                <div class="child-code">{{ child.code }}</div>
              </div>
            </div>
            <div class="child-stats">
              <span class="member-count">{{ child.memberCount }}人</span>
              <el-tag :type="child.status === 'active' ? 'success' : 'danger'" size="small">
                {{ child.status === 'active' ? '活跃' : '停用' }}
              </el-tag>
            </div>
            <el-icon class="arrow-icon"><ArrowRight /></el-icon>
          </div>
        </div>
      </div>
    </div>

    <!-- 部门成员列表 -->
    <div class="members-section">
      <div class="section-card">
        <div class="card-header">
          <h3>部门成员</h3>
          <div class="header-actions-inline">
            <el-button type="primary" size="small" :icon="Plus" @click="handleAddMember">
              添加成员
            </el-button>
          </div>
        </div>
        <el-table
          :data="departmentMembers"
          style="width: 100%"
          v-loading="membersLoading"
        >
          <el-table-column type="index" label="序号" width="60" />
          <el-table-column prop="userName" label="姓名" width="180">
            <template #default="{ row }">
              <div class="member-name-cell">
                <el-avatar :size="32" class="member-avatar">
                  {{ row.userName?.charAt(0) }}
                </el-avatar>
                <span>{{ row.userName }}</span>
                <el-tag
                  v-if="department?.managerId && String(row.userId) === String(department.managerId)"
                  type="warning"
                  size="small"
                  class="manager-badge"
                >
                  负责人
                </el-tag>
              </div>
            </template>
          </el-table-column>
          <el-table-column prop="position" label="职位" width="150" />
          <el-table-column prop="userId" label="用户ID" width="200" />
          <el-table-column prop="joinDate" label="加入时间" width="180">
            <template #default="{ row }">
              {{ formatDateTime(row.joinDate) }}
            </template>
          </el-table-column>
          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                {{ row.status === 'active' ? '在职' : '离职' }}
              </el-tag>
            </template>
          </el-table-column>
          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button type="primary" link size="small" @click="handleEditMember(row)">
                <el-icon><Edit /></el-icon>
                编辑
              </el-button>
              <el-button type="warning" link size="small" @click="handleMoveMember(row)">
                <el-icon><Rank /></el-icon>
                移动
              </el-button>
              <el-button type="danger" link size="small" @click="handleRemoveMember(row)">
                <el-icon><Delete /></el-icon>
                移除
              </el-button>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="departmentMembers.length === 0 && !membersLoading" class="empty-members">
          <el-empty description="暂无成员数据" />
        </div>
      </div>
    </div>

    <!-- 编辑部门弹窗 -->
    <DepartmentDialog
      v-model="editDialogVisible"
      :department="department"
      :is-edit="true"
      @success="handleEditSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import {
  ArrowLeft,
  ArrowRight,
  Edit,
  User,
  InfoFilled,
  DataAnalysis,
  Avatar,
  Lock,
  Setting,
  Collection,
  OfficeBuilding,
  Key,
  Plus,
  Rank,
  Delete
} from '@element-plus/icons-vue'
import { useDepartmentStore, type Department } from '@/stores/department'
import DepartmentDialog from '@/components/Department/DepartmentDialog.vue'
import { formatDateTime } from '@/utils/dateFormat'

const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const departmentStore = useDepartmentStore()

// 响应式数据
const departmentId = ref(route.params.id as string)
const editDialogVisible = ref(false)
const membersLoading = ref(false)
const departmentMembers = ref<unknown[]>([])

// 计算属性
const department = computed(() => {
  return departmentStore.getDepartmentById(departmentId.value)
})

const parentDepartmentName = computed(() => {
  if (!department.value?.parentId) return null
  const parent = departmentStore.getDepartmentById(department.value.parentId)
  return parent?.name
})

const childDepartments = computed(() => {
  return departmentStore.departmentList.filter(dept => dept.parentId === departmentId.value)
})

const groupedPermissions = computed(() => {
  if (!department.value?.permissions) return {}

  const groups: Record<string, string[]> = {}
  department.value.permissions.forEach(permission => {
    const [category] = permission.split(':')
    if (!groups[category]) {
      groups[category] = []
    }
    groups[category].push(permission)
  })

  return groups
})

// 方法
const goBack = () => {
  safeNavigator.push('/system/departments')
}

const handleEdit = () => {
  editDialogVisible.value = true
}

const handleManageMembers = () => {
  safeNavigator.push(`/system/department/members/${departmentId.value}`)
}

const handleViewChild = (child: Department) => {
  safeNavigator.push(`/system/department/detail/${child.id}`)
}

const handleEditSuccess = () => {
  editDialogVisible.value = false
  ElMessage.success('部门信息已更新')
}

// 加载部门成员
const loadDepartmentMembers = async () => {
  membersLoading.value = true
  try {
    console.log('[DepartmentDetail] 加载部门成员，部门ID:', departmentId.value)
    console.log('[DepartmentDetail] 当前部门信息:', department.value)

    const members = departmentStore.getDepartmentMembers(departmentId.value)
    console.log('[DepartmentDetail] 获取到的成员数:', members.length)
    console.log('[DepartmentDetail] 成员列表:', members)

    departmentMembers.value = members
  } catch (error) {
    console.error('加载部门成员失败:', error)
    ElMessage.error('加载部门成员失败')
  } finally {
    membersLoading.value = false
  }
}

// 添加成员
const handleAddMember = () => {
  safeNavigator.push(`/system/department/members/${departmentId.value}`)
}

// 编辑成员
const handleEditMember = (member: unknown) => {
  ElMessage.info('编辑成员功能开发中')
}

// 移动成员
const handleMoveMember = (member: unknown) => {
  ElMessage.info('移动成员功能开发中')
}

// 移除成员
const handleRemoveMember = async (member: unknown) => {
  try {
    await ElMessageBox.confirm(
      `确定要将 ${member.userName} 从该部门移除吗？`,
      '确认移除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    await departmentStore.removeDepartmentMember(departmentId.value, member.userId)
    ElMessage.success('成员已移除')
    loadDepartmentMembers()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('移除成员失败:', error)
      ElMessage.error('移除成员失败')
    }
  }
}

// formatDateTime 已从 @/utils/dateFormat 导入

const getCategoryName = (category: string) => {
  const categoryNames: Record<string, string> = {
    customer: '客户管理',
    order: '订单管理',
    finance: '财务管理',
    logistics: '物流管理',
    service: '客服管理',
    performance: '绩效管理',
    system: '系统管理',
    all: '全部权限'
  }
  return categoryNames[category] || category
}

const getPermissionName = (permission: string) => {
  const permissionNames: Record<string, string> = {
    'customer:read': '查看客户',
    'customer:write': '编辑客户',
    'customer:delete': '删除客户',
    'order:read': '查看订单',
    'order:write': '编辑订单',
    'order:audit': '审核订单',
    'order:delete': '删除订单',
    'finance:read': '查看财务',
    'finance:write': '编辑财务',
    'logistics:read': '查看物流',
    'logistics:write': '编辑物流',
    'service:read': '查看客服',
    'service:write': '编辑客服',
    'performance:read': '查看绩效',
    'performance:write': '编辑绩效',
    'system:read': '查看系统',
    'system:write': '编辑系统',
    'all': '全部权限'
  }
  return permissionNames[permission] || permission
}

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      departmentId.value = newId as string
      // 重新加载成员数据
      loadDepartmentMembers()
    }
  },
  { immediate: true }
)

onMounted(() => {
  if (!department.value) {
    ElMessage.error('部门不存在')
    safeNavigator.push('/system/departments')
  } else {
    loadDepartmentMembers()
  }
})
</script>

<style scoped>
.department-detail-container {
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
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.back-btn {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  color: #6c757d;
  border-radius: 8px;
  padding: 10px 16px;
  margin-top: 4px;
}

.title-section {
  flex: 1;
}

.page-title {
  margin: 0 0 8px 0;
  font-size: 28px;
  font-weight: 700;
  color: #303133;
}

.department-meta {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
}

.level-info {
  color: #909399;
  font-weight: 500;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.edit-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

.members-btn {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 8px;
  padding: 10px 20px;
  font-weight: 500;
}

.info-section,
.manager-section,
.permissions-section,
.children-section {
  margin-bottom: 24px;
}

.info-card,
.stats-card,
.section-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding-bottom: 12px;
  border-bottom: 1px solid #f1f3f4;
}

.card-header h3 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-icon {
  font-size: 20px;
  color: #667eea;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.label {
  font-size: 14px;
  color: #909399;
  font-weight: 500;
}

.value {
  font-size: 16px;
  color: #303133;
  font-weight: 500;
}

.description-section {
  border-top: 1px solid #f1f3f4;
  padding-top: 20px;
}

.description-section h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.description-text {
  margin: 0;
  color: #606266;
  line-height: 1.6;
}

.stats-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: white;
}

.stat-icon.members {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.children {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.permissions {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-content {
  flex: 1;
}

.stat-number {
  font-size: 24px;
  font-weight: 700;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.manager-info {
  display: flex;
  align-items: center;
  gap: 20px;
}

.manager-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 24px;
}

.manager-details {
  flex: 1;
}

.manager-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.manager-id {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.manager-role {
  font-size: 14px;
  color: #667eea;
  font-weight: 500;
}

.manager-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permissions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
  gap: 20px;
}

.permission-category {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  padding: 16px;
  background: #fafbfc;
}

.category-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
}

.category-icon {
  color: #667eea;
}

.category-name {
  font-weight: 600;
  color: #303133;
}

.permission-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.permission-tag {
  border-radius: 6px;
  font-weight: 500;
}

.children-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.child-item {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px;
  background: #f8f9fa;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.child-item:hover {
  background: #e9ecef;
  transform: translateX(4px);
}

.child-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
}

.child-icon {
  color: #667eea;
  font-size: 20px;
}

.child-details {
  flex: 1;
}

.child-name {
  font-weight: 600;
  color: #303133;
  margin-bottom: 2px;
}

.child-code {
  font-size: 12px;
  color: #909399;
}

.child-stats {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-count {
  font-size: 14px;
  color: #606266;
}

.arrow-icon {
  color: #c0c4cc;
  font-size: 16px;
}

:deep(.el-tag) {
  border-radius: 6px;
  font-weight: 500;
}

.members-section {
  margin-bottom: 24px;
}

.header-actions-inline {
  display: flex;
  gap: 8px;
}

.member-name-cell {
  display: flex;
  align-items: center;
  gap: 8px;
}

.manager-badge {
  margin-left: 8px;
  font-weight: 600;
}

.member-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
  font-size: 14px;
}

.empty-members {
  padding: 40px 0;
}

:deep(.el-table) {
  border-radius: 8px;
}

:deep(.el-table th) {
  background: #f8f9fa;
  color: #303133;
  font-weight: 600;
}

:deep(.el-table td) {
  padding: 12px 0;
}
</style>
