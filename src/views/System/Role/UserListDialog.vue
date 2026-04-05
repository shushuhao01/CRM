<template>
  <el-dialog
    v-model="visible"
    :title="`角色「${roleName}」的用户列表`"
    width="1200px"
    @close="handleClose"
  >
    <div class="user-list-content">
      <!-- 用户统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon primary"><UserFilled /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ userStats.total }}</div>
                <div class="stat-mini-label">总用户数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon success"><User /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ userStats.active }}</div>
                <div class="stat-mini-label">在职用户</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon warning"><OfficeBuilding /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ userStats.departments }}</div>
                <div class="stat-mini-label">涉及部门</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon info"><Clock /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ userStats.lastLogin }}</div>
                <div class="stat-mini-label">近7天活跃</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索和筛选 -->
      <div class="list-header">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input v-model="searchKeyword" placeholder="搜索用户名、姓名或邮箱" clearable @input="handleSearch">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-select v-model="statusFilter" placeholder="状态筛选" clearable @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="在职" value="active" />
              <el-option label="离职" value="inactive" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="departmentFilter" placeholder="部门筛选" clearable @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option v-for="dept in departmentList" :key="dept" :label="dept" :value="dept" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="handleExport" style="width: 100%">
              <el-icon><Download /></el-icon> 导出
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 用户表格 -->
      <el-table :data="paginatedUsers" style="width: 100%; margin-top: 20px" v-loading="loading" stripe>
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="realName" label="姓名" width="120" />
        <el-table-column prop="email" label="邮箱" width="200" show-overflow-tooltip />
        <el-table-column prop="department" label="部门" width="150" />
        <el-table-column prop="position" label="职位" width="120" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
              {{ row.status === 'active' ? '在职' : '离职' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginTime" label="最后登录" width="160" />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container" v-if="filteredUsers.length > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredUsers.length"
          layout="total, sizes, prev, pager, next, jumper"
          small
        />
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { UserFilled, User, OfficeBuilding, Clock, Search, Download } from '@element-plus/icons-vue'

const props = defineProps<{
  modelValue: boolean
  role: any
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const visible = ref(false)
const loading = ref(false)
const roleName = computed(() => props.role?.name || '')
const allUsers = ref<any[]>([])
const filteredUsers = ref<any[]>([])
const searchKeyword = ref('')
const statusFilter = ref('')
const departmentFilter = ref('')
const departmentList = ref<string[]>([])
const pagination = reactive({ page: 1, size: 10 })

const roleNameToCode: Record<string, string> = {
  '超级管理员': 'super_admin', '管理员': 'admin', '系统管理员': 'admin',
  '部门经理': 'department_manager', '经理': 'department_manager',
  '销售员': 'sales_staff', '销售': 'sales_staff',
  '客服': 'customer_service', '客服人员': 'customer_service'
}

const userStats = computed(() => {
  const users = allUsers.value
  const active = users.filter((u: any) => u.status === 'active').length
  const departments = new Set(users.map((u: any) => u.department)).size
  const lastLogin = users.filter((u: any) => {
    if (!u.lastLoginTime || u.lastLoginTime === '从未登录') return false
    try {
      const d = new Date(u.lastLoginTime)
      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      return d > sevenDaysAgo
    } catch { return false }
  }).length
  return { total: users.length, active, departments, lastLogin }
})

const paginatedUsers = computed(() => {
  const start = (pagination.page - 1) * pagination.size
  return filteredUsers.value.slice(start, start + pagination.size)
})

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.role) await loadUsers()
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

const loadUsers = async () => {
  loading.value = true
  searchKeyword.value = ''
  statusFilter.value = ''
  departmentFilter.value = ''
  pagination.page = 1

  try {
    let apiUsers: any[] = []
    try {
      const { default: userDataService } = await import('@/services/userDataService')
      apiUsers = await userDataService.getUsers()
      console.log('[UserListDialog] 从API获取用户成功:', apiUsers.length)
    } catch (e) {
      console.error('[UserListDialog] API获取用户失败:', e)
    }

    const users = apiUsers
      .filter((user: any) => {
        let userRoleCode = user.roleId || user.role_id || user.role || ''
        if (roleNameToCode[userRoleCode]) userRoleCode = roleNameToCode[userRoleCode]
        return userRoleCode === props.role.code
      })
      .map((user: any) => ({
        id: user.id,
        username: user.username,
        realName: user.realName || user.name || user.username,
        email: user.email || `${user.username}@example.com`,
        department: user.departmentName || user.department || '未分配',
        position: user.position || '员工',
        status: user.status || 'active',
        lastLoginTime: user.lastLoginTime || '从未登录'
      }))

    allUsers.value = users
    filteredUsers.value = users
    departmentList.value = Array.from(new Set(users.map((u: any) => u.department))).filter((d: string) => d !== '未分配')

    if (users.length > 0) ElMessage.success(`成功加载 ${users.length} 个用户`)
    else ElMessage.info('该角色暂无用户')
  } catch (error) {
    console.error('获取角色用户失败:', error)
    ElMessage.error('获取用户列表失败')
    allUsers.value = []
    filteredUsers.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  let filtered = allUsers.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    filtered = filtered.filter((u: any) =>
      u.username.toLowerCase().includes(kw) || u.realName.toLowerCase().includes(kw) || u.email.toLowerCase().includes(kw)
    )
  }
  if (statusFilter.value) filtered = filtered.filter((u: any) => u.status === statusFilter.value)
  if (departmentFilter.value) filtered = filtered.filter((u: any) => u.department === departmentFilter.value)
  filteredUsers.value = filtered
  pagination.page = 1
}

const handleExport = () => {
  try {
    if (filteredUsers.value.length === 0) { ElMessage.warning('没有可导出的用户数据'); return }
    const exportData = filteredUsers.value.map((user: any) => ({
      '用户名': user.username, '姓名': user.realName, '邮箱': user.email,
      '部门': user.department, '职位': user.position,
      '状态': user.status === 'active' ? '在职' : '离职', '最后登录': user.lastLoginTime
    }))
    const headers = Object.keys(exportData[0])
    const csv = [headers.join(','), ...exportData.map((row: any) => headers.map(h => `"${row[h]}"`).join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `${roleName.value}_用户列表_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('用户列表导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const handleViewDetail = (user: any) => {
  ElMessageBox.alert(
    `<div style="line-height: 2;">
      <p><strong>用户名：</strong>${user.username}</p>
      <p><strong>姓名：</strong>${user.realName}</p>
      <p><strong>邮箱：</strong>${user.email}</p>
      <p><strong>部门：</strong>${user.department}</p>
      <p><strong>职位：</strong>${user.position}</p>
      <p><strong>状态：</strong>${user.status === 'active' ? '在职' : '离职'}</p>
      <p><strong>最后登录：</strong>${user.lastLoginTime}</p>
    </div>`,
    '用户详情',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' }
  )
}

const handleClose = () => {
  visible.value = false
  searchKeyword.value = ''
  statusFilter.value = ''
  departmentFilter.value = ''
  allUsers.value = []
  filteredUsers.value = []
  pagination.page = 1
}
</script>

<style scoped>
.user-list-content { padding: 0; }
.stats-row { margin-bottom: 20px; }
.stat-card-mini { border-radius: 8px; transition: all 0.3s ease; cursor: pointer; }
.stat-card-mini:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important; }
.stat-mini-content { display: flex; align-items: center; gap: 12px; padding: 4px; }
.stat-mini-icon { width: 48px; height: 48px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 24px; color: white; }
.stat-mini-icon.primary { background: linear-gradient(135deg, #409eff, #66b3ff); }
.stat-mini-icon.success { background: linear-gradient(135deg, #67c23a, #85ce61); }
.stat-mini-icon.warning { background: linear-gradient(135deg, #e6a23c, #f0c78a); }
.stat-mini-icon.info { background: linear-gradient(135deg, #909399, #b1b3b8); }
.stat-mini-info { flex: 1; }
.stat-mini-value { font-size: 24px; font-weight: bold; font-family: Arial, sans-serif; line-height: 1; margin-bottom: 4px; color: #303133; }
.stat-mini-label { font-size: 13px; color: #606266; font-weight: 500; }
.list-header { margin-bottom: 16px; }
.list-header .el-input, .list-header .el-select { width: 100%; }
.pagination-container { display: flex; justify-content: center; margin-top: 20px; }
</style>

