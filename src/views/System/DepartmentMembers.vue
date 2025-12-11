<template>
  <div class="department-members-container">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <el-button :icon="ArrowLeft" @click="goBack" class="back-btn">返回</el-button>
        <div class="title-section">
          <h2 class="page-title">{{ department?.name }} - 成员配置</h2>
          <div class="department-info">
            <el-tag type="primary" size="small">{{ department?.code }}</el-tag>
            <span class="level-info">{{ department?.level }}级部门</span>
            <span class="manager-info" v-if="department?.managerName">
              负责人：{{ department.managerName }}
            </span>
          </div>
        </div>
      </div>
      <div class="action-buttons">
        <el-button type="primary" :icon="Plus" @click="handleAddMember" class="add-btn">
          添加成员
        </el-button>
        <el-button type="success" :icon="Upload" @click="handleBatchImport" class="import-btn">
          批量导入
        </el-button>
      </div>
    </div>

    <!-- 统计卡片 -->
    <div class="stats-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon total">
              <el-icon><User /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ departmentMembers.length }}</div>
              <div class="stat-label">总成员数</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon active">
              <el-icon><Check /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ activeMembers.length }}</div>
              <div class="stat-label">活跃成员</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon positions">
              <el-icon><Briefcase /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ uniquePositions.length }}</div>
              <div class="stat-label">职位类型</div>
            </div>
          </div>
        </el-col>
        <el-col :span="6">
          <div class="stat-card">
            <div class="stat-icon recent">
              <el-icon><Clock /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-number">{{ recentJoinedCount }}</div>
              <div class="stat-label">本月新增</div>
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
            placeholder="搜索成员姓名或用户ID"
            :prefix-icon="Search"
            clearable
            @input="handleSearch"
          />
        </el-col>
        <el-col :span="6">
          <el-select v-model="statusFilter" placeholder="成员状态" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option label="活跃" value="active" />
            <el-option label="停用" value="inactive" />
          </el-select>
        </el-col>
        <el-col :span="6">
          <el-select v-model="positionFilter" placeholder="职位筛选" clearable @change="handleFilter">
            <el-option label="全部" value="" />
            <el-option
              v-for="position in uniquePositions"
              :key="position"
              :label="position"
              :value="position"
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

    <!-- 成员列表 -->
    <div class="table-section">
      <el-table
        :data="filteredMembers"
        v-loading="departmentStore.loading"
        class="members-table"
      >
        <el-table-column prop="userName" label="成员姓名" min-width="120">
          <template #default="{ row }">
            <div class="member-info">
              <el-avatar :size="32" :src="row.userAvatar" class="member-avatar">
                {{ row.userName.charAt(0) }}
              </el-avatar>
              <div class="member-details">
                <div class="member-name">{{ row.userName }}</div>
                <div class="member-id">ID: {{ row.userId }}</div>
              </div>
            </div>
          </template>
        </el-table-column>

        <el-table-column prop="position" label="职位" width="150">
          <template #default="{ row }">
            <el-tag type="info" size="small">{{ row.position }}</el-tag>
          </template>
        </el-table-column>

        <el-table-column prop="joinDate" label="加入时间" width="120">
          <template #default="{ row }">
            {{ formatDate(row.joinDate) }}
          </template>
        </el-table-column>

        <el-table-column prop="status" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '活跃' : '停用' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="在职天数" width="100" align="center">
          <template #default="{ row }">
            {{ calculateWorkDays(row.joinDate) }}天
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button size="small" type="primary" link @click="handleEditMember(row)">
                编辑
              </el-button>
              <el-button
                size="small"
                :type="row.status === 'active' ? 'warning' : 'success'"
                link
                @click="handleToggleStatus(row)"
              >
                {{ row.status === 'active' ? '停用' : '启用' }}
              </el-button>
              <el-popconfirm
                title="确定要移除这个成员吗？"
                @confirm="handleRemoveMember(row)"
              >
                <template #reference>
                  <el-button size="small" type="danger" link>
                    移除
                  </el-button>
                </template>
              </el-popconfirm>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 添加/编辑成员弹窗 -->
    <MemberDialog
      v-model="memberDialogVisible"
      :member="currentMember"
      :department-id="departmentId"
      :is-edit="isEditMember"
      @success="handleMemberDialogSuccess"
    />

    <!-- 批量导入成员弹窗 -->
    <BatchImportDialog
      v-model="batchImportDialogVisible"
      :department-id="departmentId"
      @success="handleBatchImportSuccess"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { createSafeNavigator } from '@/utils/navigation'
import {
  ArrowLeft,
  Plus,
  Upload,
  Search,
  Refresh,
  User,
  Check,
  Briefcase,
  Clock
} from '@element-plus/icons-vue'
import { useDepartmentStore, type DepartmentMember } from '@/stores/department'
import MemberDialog from '@/components/Department/MemberDialog.vue'
import BatchImportDialog from '@/components/Department/BatchImportDialog.vue'
import { formatDateTime } from '@/utils/dateFormat'

const route = useRoute()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)
const departmentStore = useDepartmentStore()

// 响应式数据
const departmentId = ref(route.params.id as string)
const searchKeyword = ref('')
const statusFilter = ref('')
const positionFilter = ref('')
const memberDialogVisible = ref(false)
const currentMember = ref<DepartmentMember | null>(null)
const isEditMember = ref(false)
const batchImportDialogVisible = ref(false)

// 计算属性
const department = computed(() => {
  return departmentStore.getDepartmentById(departmentId.value)
})

const departmentMembers = computed(() => {
  return departmentStore.getDepartmentMembers(departmentId.value)
})

const activeMembers = computed(() => {
  return departmentMembers.value.filter(member => member.status === 'active')
})

const uniquePositions = computed(() => {
  const positions = departmentMembers.value.map(member => member.position)
  return [...new Set(positions)]
})

const recentJoinedCount = computed(() => {
  const oneMonthAgo = new Date()
  oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1)

  return departmentMembers.value.filter(member => {
    const joinDate = new Date(member.joinDate)
    return joinDate >= oneMonthAgo
  }).length
})

const filteredMembers = computed(() => {
  let members = departmentMembers.value

  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    members = members.filter(member =>
      member.userName.toLowerCase().includes(keyword) ||
      member.userId.toLowerCase().includes(keyword)
    )
  }

  // 状态过滤
  if (statusFilter.value) {
    members = members.filter(member => member.status === statusFilter.value)
  }

  // 职位过滤
  if (positionFilter.value) {
    members = members.filter(member => member.position === positionFilter.value)
  }

  return members
})

// 方法
const goBack = () => {
  safeNavigator.push('/system/departments')
}

// 格式化日期 - 使用统一的formatDateTime
const formatDate = formatDateTime

const calculateWorkDays = (joinDate: string) => {
  const join = new Date(joinDate)
  const now = new Date()
  const diffTime = Math.abs(now.getTime() - join.getTime())
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24))
}

const handleSearch = () => {
  // 搜索逻辑已在计算属性中处理
}

const handleFilter = () => {
  // 过滤逻辑已在计算属性中处理
}

const handleRefresh = () => {
  searchKeyword.value = ''
  statusFilter.value = ''
  positionFilter.value = ''
  ElMessage.success('数据已刷新')
}

const handleAddMember = () => {
  currentMember.value = null
  isEditMember.value = false
  memberDialogVisible.value = true
}

const handleEditMember = (member: DepartmentMember) => {
  currentMember.value = member
  isEditMember.value = true
  memberDialogVisible.value = true
}

const handleToggleStatus = async (member: DepartmentMember) => {
  try {
    const newStatus = member.status === 'active' ? 'inactive' : 'active'
    // 这里应该调用更新成员状态的方法
    member.status = newStatus
    ElMessage.success(`成员已${newStatus === 'active' ? '启用' : '停用'}`)
  } catch (error) {
    ElMessage.error('操作失败')
  }
}

const handleRemoveMember = async (member: DepartmentMember) => {
  try {
    await departmentStore.removeDepartmentMember(member.id)
    ElMessage.success('成员已移除')
  } catch (error) {
    ElMessage.error('移除失败')
  }
}

const handleBatchImport = () => {
  batchImportDialogVisible.value = true
}

const handleMemberDialogSuccess = () => {
  memberDialogVisible.value = false
  ElMessage.success(isEditMember.value ? '成员信息已更新' : '成员已添加')
}

const handleBatchImportSuccess = () => {
  batchImportDialogVisible.value = false
  ElMessage.success('批量导入成功')
}

// 监听路由参数变化
watch(
  () => route.params.id,
  (newId) => {
    if (newId) {
      departmentId.value = newId as string
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (!department.value) {
    ElMessage.error('部门不存在')
    safeNavigator.push('/system/departments')
    return
  }

  // 🔥 从API获取部门成员数据
  try {
    console.log('[部门成员] 加载部门成员数据, 部门ID:', departmentId.value)
    await departmentStore.fetchDepartmentMembers(departmentId.value)
    console.log('[部门成员] 加载完成, 成员数:', departmentMembers.value.length)
  } catch (error) {
    console.error('[部门成员] 加载失败:', error)
    ElMessage.error('加载部门成员失败')
  }
})
</script>

<style scoped>
.department-members-container {
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
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.department-info {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 14px;
  color: #606266;
}

.level-info,
.manager-info {
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 12px;
}

.add-btn {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
}

.import-btn {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
  border: none;
  border-radius: 8px;
  padding: 12px 24px;
  font-weight: 500;
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

.stat-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.active {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.positions {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.recent {
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

.table-section {
  background: white;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
}

.members-table {
  border-radius: 8px;
  overflow: hidden;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.member-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  font-weight: 600;
}

.member-details {
  flex: 1;
}

.member-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 2px;
}

.member-id {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
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
</style>
