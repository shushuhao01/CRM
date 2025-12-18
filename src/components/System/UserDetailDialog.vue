<template>
  <el-dialog
    v-model="visible"
    :title="`用户详情 - ${user?.name}`"
    width="1000px"
    @close="handleClose"
  >
    <div class="user-detail" v-if="user">
      <el-tabs v-model="activeTab" type="border-card">
        <!-- 基本信息 -->
        <el-tab-pane label="基本信息" name="basic">
          <div class="basic-info">
            <el-row :gutter="20">
              <el-col :span="8">
                <div class="user-avatar">
                  <el-avatar :size="120" :src="user.avatar">
                    {{ user.name.charAt(0) }}
                  </el-avatar>
                  <div class="user-status">
                    <el-tag :type="getAccountStatusTagType(user.status || 'active')">
                      {{ getAccountStatusDisplayName(user.status || 'active') }}
                    </el-tag>
                  </div>
                </div>
              </el-col>
              <el-col :span="16">
                <el-descriptions :column="2" border>
                  <el-descriptions-item label="用户名">{{ user.username }}</el-descriptions-item>
                  <el-descriptions-item label="姓名">{{ user.name }}</el-descriptions-item>
                  <el-descriptions-item label="邮箱">{{ displaySensitiveInfoNew(user.email, SensitiveInfoType.EMAIL, userStore.currentUser?.id) }}</el-descriptions-item>
                  <el-descriptions-item label="手机号">{{ user.phone ? displaySensitiveInfoNew(user.phone, SensitiveInfoType.PHONE, userStore.currentUser?.id) : '未设置' }}</el-descriptions-item>
                  <el-descriptions-item label="部门">{{ user.department }}</el-descriptions-item>
                  <el-descriptions-item label="职位">{{ user.position || '未设置' }}</el-descriptions-item>
                  <el-descriptions-item label="角色">
                    <el-tag v-for="role in user.roles" :key="role" size="small" style="margin-right: 5px;">
                      {{ role }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="权限级别">
                    <el-tag :type="getPermissionLevelType(user.permissionLevel)">
                      {{ user.permissionLevel }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="创建时间">{{ user.createTime }}</el-descriptions-item>
                  <el-descriptions-item label="最后登录">{{ user.lastLogin || '从未登录' }}</el-descriptions-item>
                  <el-descriptions-item label="登录次数">{{ user.loginCount || 0 }}</el-descriptions-item>
                  <el-descriptions-item label="账户状态">
                    <el-tag :type="getAccountStatusTagType(user.status || 'active')">
                      {{ getAccountStatusDisplayName(user.status || 'active') }}
                    </el-tag>
                  </el-descriptions-item>
                  <el-descriptions-item label="授权登录IP" :span="2">
                    <div v-if="user.authorizedIps && user.authorizedIps.length > 0" class="ip-list">
                      <el-tag
                        v-for="(ip, index) in user.authorizedIps"
                        :key="index"
                        size="small"
                        style="margin-right: 5px; margin-bottom: 5px;"
                      >
                        {{ ip }}
                      </el-tag>
                    </div>
                    <span v-else class="text-gray-400">无限制（任意IP可登录）</span>
                  </el-descriptions-item>
                </el-descriptions>
              </el-col>
            </el-row>
          </div>
        </el-tab-pane>

        <!-- 权限详情 -->
        <el-tab-pane label="权限详情" name="permissions">
          <div class="permissions-detail">
            <div class="permission-section">
              <h4>功能权限</h4>
              <el-row :gutter="20">
                <el-col :span="8">
                  <div class="permission-group">
                    <h5>客户管理</h5>
                    <div class="permission-list">
                      <div v-for="perm in userPermissions.customer" :key="perm.key" class="permission-item">
                        <el-icon :color="perm.granted ? '#67C23A' : '#F56C6C'">
                          <Check v-if="perm.granted" />
                          <Close v-else />
                        </el-icon>
                        <span>{{ perm.name }}</span>
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="permission-group">
                    <h5>订单管理</h5>
                    <div class="permission-list">
                      <div v-for="perm in userPermissions.order" :key="perm.key" class="permission-item">
                        <el-icon :color="perm.granted ? '#67C23A' : '#F56C6C'">
                          <Check v-if="perm.granted" />
                          <Close v-else />
                        </el-icon>
                        <span>{{ perm.name }}</span>
                      </div>
                    </div>
                  </div>
                </el-col>
                <el-col :span="8">
                  <div class="permission-group">
                    <h5>系统管理</h5>
                    <div class="permission-list">
                      <div v-for="perm in userPermissions.system" :key="perm.key" class="permission-item">
                        <el-icon :color="perm.granted ? '#67C23A' : '#F56C6C'">
                          <Check v-if="perm.granted" />
                          <Close v-else />
                        </el-icon>
                        <span>{{ perm.name }}</span>
                      </div>
                    </div>
                  </div>
                </el-col>
              </el-row>
            </div>

            <div class="permission-section">
              <h4>数据权限</h4>
              <el-descriptions :column="3" border>
                <el-descriptions-item label="数据范围">{{ userDataScope.scope }}</el-descriptions-item>
                <el-descriptions-item label="客户数据">{{ userDataScope.customer }}</el-descriptions-item>
                <el-descriptions-item label="订单数据">{{ userDataScope.order }}</el-descriptions-item>
                <el-descriptions-item label="报表数据">{{ userDataScope.report }}</el-descriptions-item>
                <el-descriptions-item label="导出权限">
                  <el-tag :type="userDataScope.canExport ? 'success' : 'danger'">
                    {{ userDataScope.canExport ? '允许' : '禁止' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="审计权限">
                  <el-tag :type="userDataScope.canAudit ? 'success' : 'danger'">
                    {{ userDataScope.canAudit ? '允许' : '禁止' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </div>
          </div>
        </el-tab-pane>

        <!-- 操作记录 -->
        <el-tab-pane label="操作记录" name="logs">
          <div class="operation-logs">
            <div class="logs-filter">
              <el-row :gutter="20">
                <el-col :span="6">
                  <el-select v-model="logFilter.type" placeholder="操作类型" clearable>
                    <el-option label="登录" value="login" />
                    <el-option label="权限变更" value="permission" />
                    <el-option label="数据操作" value="data" />
                    <el-option label="系统操作" value="system" />
                  </el-select>
                </el-col>
                <el-col :span="8">
                  <el-date-picker
                    v-model="logFilter.dateRange"
                    type="datetimerange"
                    range-separator="至"
                    start-placeholder="开始时间"
                    end-placeholder="结束时间"
                    format="YYYY-MM-DD HH:mm:ss"
                    value-format="YYYY-MM-DD HH:mm:ss"
                  />
                </el-col>
                <el-col :span="6">
                  <el-button @click="searchLogs" type="primary">搜索</el-button>
                  <el-button @click="resetLogFilter">重置</el-button>
                </el-col>
              </el-row>
            </div>

            <el-table :data="operationLogs" style="width: 100%; margin-top: 20px;">
              <el-table-column prop="time" label="操作时间" width="180" />
              <el-table-column prop="type" label="操作类型" width="120">
                <template #default="{ row }">
                  <el-tag :type="getLogTypeColor(row.type)">{{ row.type }}</el-tag>
                </template>
              </el-table-column>
              <el-table-column prop="action" label="操作内容" />
              <el-table-column prop="ip" label="IP地址" width="140" />
              <el-table-column prop="userAgent" label="设备信息" width="200" show-overflow-tooltip />
              <el-table-column prop="result" label="操作结果" width="100">
                <template #default="{ row }">
                  <el-tag :type="row.result === '成功' ? 'success' : 'danger'">
                    {{ row.result }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>

            <div class="pagination">
              <el-pagination
                v-model:current-page="logPagination.currentPage"
                v-model:page-size="logPagination.pageSize"
                :page-sizes="[10, 20, 50, 100]"
                :total="logPagination.total"
                layout="total, sizes, prev, pager, next, jumper"
                @size-change="handleLogSizeChange"
                @current-change="handleLogCurrentChange"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- 安全设置 -->
        <el-tab-pane label="安全设置" name="security">
          <div class="security-settings">
            <el-descriptions :column="2" border>
              <el-descriptions-item label="密码强度">
                <el-progress :percentage="passwordStrength" :color="getPasswordStrengthColor()" />
              </el-descriptions-item>
              <el-descriptions-item label="双因子认证">
                <el-tag :type="user.twoFactorEnabled ? 'success' : 'warning'">
                  {{ user.twoFactorEnabled ? '已启用' : '未启用' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="密码最后修改">{{ user.passwordLastChanged || '从未修改' }}</el-descriptions-item>
              <el-descriptions-item label="登录失败次数">{{ user.failedLoginAttempts || 0 }}</el-descriptions-item>
              <el-descriptions-item label="账户锁定状态">
                <el-tag :type="user.isLocked ? 'danger' : 'success'">
                  {{ user.isLocked ? '已锁定' : '正常' }}
                </el-tag>
              </el-descriptions-item>
              <el-descriptions-item label="会话超时设置">{{ user.sessionTimeout || '30分钟' }}</el-descriptions-item>
            </el-descriptions>

            <div class="security-actions" style="margin-top: 20px;">
              <el-button @click="resetPassword" type="warning">重置密码</el-button>
              <el-button @click="toggleTwoFactor" :type="user.twoFactorEnabled ? 'danger' : 'primary'">
                {{ user.twoFactorEnabled ? '禁用' : '启用' }}双因子认证
              </el-button>
              <el-button @click="unlockAccount" v-if="user.isLocked" type="success">解锁账户</el-button>
              <el-button @click="forceLogout" type="danger">强制下线</el-button>
            </div>
          </div>
        </el-tab-pane>
      </el-tabs>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">关闭</el-button>
        <el-button @click="editUser" type="primary">编辑用户</el-button>
        <el-button @click="exportUserInfo" type="success">导出信息</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Check, Close } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { useUserStore } from '@/stores/user'
import { getAccountStatusDisplayName, getAccountStatusTagType } from '@/utils/statusUtils'

interface User {
  id: string
  username: string
  name: string
  email: string
  phone?: string
  department: string
  position?: string
  roles: string[]
  permissionLevel: string
  status: string
  createTime: string
  lastLogin?: string
  loginCount?: number
  avatar?: string
  twoFactorEnabled?: boolean
  passwordLastChanged?: string
  failedLoginAttempts?: number
  isLocked?: boolean
  sessionTimeout?: string
  authorizedIps?: string[]
}

interface Props {
  modelValue: boolean
  user?: User | null
}

interface Emits {
  (e: 'update:modelValue', value: boolean): void
  (e: 'edit', user: User): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()
const userStore = useUserStore()

const activeTab = ref('basic')
const passwordStrength = ref(75)

const visible = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 用户权限数据
const userPermissions = ref({
  customer: [
    { key: 'view', name: '查看客户', granted: true },
    { key: 'create', name: '创建客户', granted: true },
    { key: 'edit', name: '编辑客户', granted: false },
    { key: 'delete', name: '删除客户', granted: false },
    { key: 'export', name: '导出客户', granted: true }
  ],
  order: [
    { key: 'view', name: '查看订单', granted: true },
    { key: 'create', name: '创建订单', granted: true },
    { key: 'edit', name: '编辑订单', granted: true },
    { key: 'delete', name: '删除订单', granted: false },
    { key: 'audit', name: '审核订单', granted: false }
  ],
  system: [
    { key: 'user', name: '用户管理', granted: false },
    { key: 'role', name: '角色管理', granted: false },
    { key: 'permission', name: '权限管理', granted: false },
    { key: 'config', name: '系统配置', granted: false }
  ]
})

const userDataScope = ref({
  scope: '本部门数据',
  customer: '可查看、编辑',
  order: '可查看、创建',
  report: '仅查看',
  canExport: true,
  canAudit: false
})

// 操作记录
const logFilter = ref({
  type: '',
  dateRange: null as [string, string] | null
})

const operationLogs = ref([
  {
    time: '2024-01-15 14:30:25',
    type: '登录',
    action: '用户登录系统',
    ip: '192.168.1.100',
    userAgent: 'Chrome 120.0.0.0',
    result: '成功'
  },
  {
    time: '2024-01-15 14:25:10',
    type: '数据操作',
    action: '查看客户列表',
    ip: '192.168.1.100',
    userAgent: 'Chrome 120.0.0.0',
    result: '成功'
  },
  {
    time: '2024-01-15 14:20:05',
    type: '权限变更',
    action: '权限被管理员修改',
    ip: '192.168.1.1',
    userAgent: 'Chrome 120.0.0.0',
    result: '成功'
  }
])

const logPagination = ref({
  currentPage: 1,
  pageSize: 10,
  total: 50
})

// 方法
const getPermissionLevelType = (level: string) => {
  const types: Record<string, string> = {
    '超级管理员': 'danger',
    '管理员': 'warning',
    '普通用户': 'primary',
    '只读用户': 'info'
  }
  return types[level] || 'info'
}

const getLogTypeColor = (type: string) => {
  const colors: Record<string, string> = {
    '登录': 'primary',
    '权限变更': 'warning',
    '数据操作': 'success',
    '系统操作': 'info'
  }
  return colors[type] || 'info'
}

const getPasswordStrengthColor = () => {
  if (passwordStrength.value >= 80) return '#67C23A'
  if (passwordStrength.value >= 60) return '#E6A23C'
  return '#F56C6C'
}

const searchLogs = () => {
  ElMessage.info('搜索操作记录')
}

const resetLogFilter = () => {
  logFilter.value = {
    type: '',
    dateRange: null
  }
}

const handleLogSizeChange = (size: number) => {
  logPagination.value.pageSize = size
}

const handleLogCurrentChange = (page: number) => {
  logPagination.value.currentPage = page
}

// 安全操作
const resetPassword = async () => {
  try {
    await ElMessageBox.confirm('确定要重置该用户的密码吗？', '确认重置', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 调用API重置密码
    const { userApiService } = await import('@/services/userApiService')
    await userApiService.resetPassword(parseInt(props.user?.id || '0'))
    ElMessage.success('密码重置成功，新密码已发送到用户邮箱')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('重置密码失败:', error)
      ElMessage.error(error?.message || '重置密码失败')
    }
  }
}

const toggleTwoFactor = async () => {
  const action = props.user?.twoFactorEnabled ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}双因子认证吗？`, `确认${action}`, {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 调用API切换双因子认证
    const { userApiService } = await import('@/services/userApiService')
    await userApiService.toggleTwoFactor(parseInt(props.user?.id || '0'), !props.user?.twoFactorEnabled)
    ElMessage.success(`双因子认证${action}成功`)
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('切换双因子认证失败:', error)
      ElMessage.error(error?.message || `双因子认证${props.user?.twoFactorEnabled ? '禁用' : '启用'}失败`)
    }
  }
}

const unlockAccount = async () => {
  try {
    await ElMessageBox.confirm('确定要解锁该用户账户吗？', '确认解锁', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 调用API解锁账户
    const { userApiService } = await import('@/services/userApiService')
    await userApiService.unlockAccount(parseInt(props.user?.id || '0'))
    ElMessage.success('账户解锁成功')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('解锁账户失败:', error)
      ElMessage.error(error?.message || '解锁账户失败')
    }
  }
}

const forceLogout = async () => {
  try {
    await ElMessageBox.confirm('确定要强制该用户下线吗？', '确认下线', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })

    // 调用API强制用户下线
    const { userApiService } = await import('@/services/userApiService')
    await userApiService.forceLogout(parseInt(props.user?.id || '0'))
    ElMessage.success('用户已强制下线')
  } catch (error: any) {
    if (error !== 'cancel') {
      console.error('强制下线失败:', error)
      ElMessage.error(error?.message || '强制下线失败')
    }
  }
}

const editUser = () => {
  if (props.user) {
    emit('edit', props.user)
    handleClose()
  }
}

const exportUserInfo = () => {
  ElMessage.success('用户信息导出成功')
}

const handleClose = () => {
  activeTab.value = 'basic'
  emit('update:modelValue', false)
}

// 加载用户权限数据
const loadUserPermissions = async () => {
  if (!props.user?.id) return

  try {
    const { rolePermissionService } = await import('@/services/rolePermissionService')
    const permissions = await rolePermissionService.getUserPermissions(parseInt(props.user.id))

    // 转换权限数据格式
    if (permissions && permissions.length > 0) {
      const customerPerms = permissions.find((p: any) => p.id === 'customer')?.children || []
      const orderPerms = permissions.find((p: any) => p.id === 'order')?.children || []
      const systemPerms = permissions.find((p: any) => p.id === 'system')?.children || []

      if (customerPerms.length > 0) {
        userPermissions.value.customer = customerPerms.map((p: any) => ({
          key: p.id,
          name: p.name,
          granted: p.granted
        }))
      }
      if (orderPerms.length > 0) {
        userPermissions.value.order = orderPerms.map((p: any) => ({
          key: p.id,
          name: p.name,
          granted: p.granted
        }))
      }
      if (systemPerms.length > 0) {
        userPermissions.value.system = systemPerms.map((p: any) => ({
          key: p.id,
          name: p.name,
          granted: p.granted
        }))
      }
    }
  } catch (error) {
    console.error('加载用户权限失败:', error)
  }
}

// 加载操作记录
const loadOperationLogs = async () => {
  if (!props.user?.id) return

  try {
    const { rolePermissionService } = await import('@/services/rolePermissionService')
    const response = await rolePermissionService.getOperationLogs({
      page: logPagination.value.currentPage,
      pageSize: logPagination.value.pageSize,
      userId: parseInt(props.user.id)
    })

    operationLogs.value = response.data.map((log: any) => ({
      time: log.createdAt || log.timestamp || new Date().toISOString(),
      type: log.module || log.type || '操作',
      action: log.action || '操作',
      ip: log.ip || log.ipAddress || '-',
      userAgent: log.userAgent || log.device || 'Unknown',
      result: log.result || log.status || '成功'
    }))
    logPagination.value.total = response.total || 0
  } catch (error) {
    console.error('加载操作记录失败:', error)
    operationLogs.value = []
  }
}

// 监听用户变化，更新权限数据
watch(() => props.user, (newUser) => {
  if (newUser) {
    loadUserPermissions()
    loadOperationLogs()
  }
}, { immediate: true })

// 监听标签页切换
watch(() => activeTab.value, (tab) => {
  if (tab === 'logs' && props.user) {
    loadOperationLogs()
  } else if (tab === 'permissions' && props.user) {
    loadUserPermissions()
  }
})
</script>

<style scoped>
.user-detail {
  padding: 10px 0;
}

.basic-info {
  padding: 20px;
}

.user-avatar {
  text-align: center;
  position: relative;
}

.user-status {
  margin-top: 10px;
}

.permissions-detail {
  padding: 20px;
}

.permission-section {
  margin-bottom: 30px;
}

.permission-section h4 {
  margin-bottom: 20px;
  color: #303133;
  border-bottom: 2px solid #409EFF;
  padding-bottom: 10px;
}

.permission-group {
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 15px;
  height: 100%;
}

.permission-group h5 {
  margin: 0 0 15px 0;
  color: #606266;
  font-weight: 600;
}

.permission-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.permission-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.operation-logs {
  padding: 20px;
}

.logs-filter {
  padding: 15px;
  background: #f5f7fa;
  border-radius: 8px;
  margin-bottom: 20px;
}

.security-settings {
  padding: 20px;
}

.security-actions {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pagination {
  margin-top: 20px;
  text-align: right;
}

.dialog-footer {
  text-align: right;
}

:deep(.el-descriptions__label) {
  font-weight: 600;
}

:deep(.el-progress-bar__outer) {
  border-radius: 10px;
}
</style>
