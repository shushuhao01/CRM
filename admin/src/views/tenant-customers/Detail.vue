<template>
  <div class="page-container">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">租户客户详情</span>
      </template>
    </el-page-header>

    <!-- 基本信息卡片 -->
    <BasicInfoCard
      :detail="detail"
      :loading="loading"
      :status-loading="statusLoading"
      @toggle-status="handleToggleStatus"
      @edit="handleEdit"
    />

    <!-- 授权信息卡片 -->
    <LicenseInfoCard
      :detail="detail"
      :show-full-key="showFullKey"
      @adjust-users="handleAdjustUsers"
      @adjust-storage="handleAdjustStorage"
      @adjust-package="handleAdjustPackage"
      @regenerate="handleRegenerate"
      @renew="handleRenew"
      @suspend="handleSuspend"
      @resume="handleResume"
      @toggle-key-visibility="showFullKey = !showFullKey"
      @switch-limit-mode="handleSwitchLimitMode"
    />

    <!-- 功能模块授权 -->
    <ModuleAuthCard
      :detail="detail"
      :crm-module-options="crmModuleOptions"
      :is-editing-modules="isEditingModules"
      :edit-modules="editModules"
      :submitting="submitting"
      :enabled-modules-count="enabledModulesCount"
      :is-module-enabled="isModuleEnabled"
      @start-edit="startEditModules"
      @cancel-edit="cancelEditModules"
      @save="saveModules"
      @select-all="selectAllModules"
      @deselect-all="deselectAllModules"
      @update:edit-modules="editModules = $event"
    />

    <!-- 增值服务授权 -->
    <el-card shadow="never" class="detail-section-card">
      <template #header>
        <div class="card-header">
          <span><el-icon><ChatLineSquare /></el-icon> 增值服务授权</span>
        </div>
      </template>
      <div class="vas-auth-item">
        <div class="vas-info">
          <div class="vas-title">
            <span class="vas-name">会话存档功能</span>
            <el-tag :type="detail.wecom_chat_archive_auth ? 'success' : 'info'" size="small" effect="dark">
              {{ detail.wecom_chat_archive_auth ? '已授权' : '未授权' }}
            </el-tag>
          </div>
          <div class="vas-desc">授权后租户可启用企业微信会话存档功能，用于合规存档和客户沟通记录查看。未授权的租户即使拥有企微管理模块权限也无法启用此功能。</div>
        </div>
        <div class="vas-action">
          <el-switch
            :model-value="!!detail.wecom_chat_archive_auth"
            :loading="chatArchiveAuthLoading"
            active-text="授权"
            inactive-text="关闭"
            inline-prompt
            style="--el-switch-on-color: #07c160; --el-switch-off-color: #dcdfe6"
            @change="handleToggleChatArchiveAuth"
          />
        </div>
      </div>
    </el-card>

    <!-- 用户列表卡片 -->
    <UsersListCard
      :users="users"
      :loading="usersLoading"
      :max-users="detail.maxUsers || 0"
      :user-limit-mode="detail.user_limit_mode || 'total'"
      :max-online-seats="(detail.max_online_seats || 0) + (detail.extra_online_seats || 0)"
      :online-count="detail.onlineCount || 0"
    />

    <!-- 操作日志卡片 -->
    <OperationLogsCard
      :logs="logs"
      :logs-loading="logsLoading"
      :logs-pagination="logsPagination"
      @refresh="fetchLogs"
      @clear-logs="handleClearLogs"
    />

    <!-- 账单记录卡片 -->
    <BillsCard
      :bills="bills"
      :loading="billsLoading"
      :pagination="billsPagination"
      @refresh="fetchBills"
    />

    <!-- 扩容记录卡片 -->
    <CapacityOrdersCard
      :orders="capacityOrders"
      :loading="capacityLoading"
      :pagination="capacityPagination"
      @refresh="fetchCapacityOrders"
    />

    <!-- 数据导出卡片 -->
    <DataExportCard
      :full-exporting="fullExporting"
      :full-export-job-id="fullExportJobId"
      :full-export-status="fullExportStatus"
      :full-export-progress="fullExportProgress"
      :full-export-error="fullExportError"
      :full-importing="fullImporting"
      :full-import-job-id="fullImportJobId"
      :full-import-status="fullImportStatus"
      :full-import-progress="fullImportProgress"
      :full-import-processed="fullImportProcessed"
      :full-import-skipped="fullImportSkipped"
      :full-import-errors="fullImportErrors"
      :exporting="exporting"
      :exporting-users="exportingUsers"
      :exporting-logs="exportingLogs"
      @full-export="handleFullExport"
      @full-export-download="handleFullExportDownload"
      @full-export-download-html="handleFullExportDownloadHtml"
      @full-import="handleFullImport"
      @export-detail="handleExportDetail"
      @export-users="handleExportUsers"
      @export-logs="handleExportLogs"
    />

    <!-- 数据清理卡片 -->
    <DataCleanupCard
      :cleanup-status="cleanupStatus"
      :cleanup-status-loading="cleanupStatusLoading"
      :cleanup-executing="cleanupExecuting"
      :cleanup-result="cleanupResult"
      @refresh-status="fetchCleanupStatus"
      @cleanup-data="handleCleanupData"
    />

    <!-- 对话框集合 -->
    <DetailDialogs
      ref="detailDialogsRef"
      :detail="detail"
      :submitting="submitting"
      :edit-form="editForm"
      :new-max-users="newMaxUsers"
      :new-max-online-seats="newMaxOnlineSeats"
      :new-max-storage-gb="newMaxStorageGb"
      :new-package-id="newPackageId"
      :all-packages="allPackages"
      :packages-loading="packagesLoading"
      :package-tab="packageTab"
      :sync-package-config="syncPackageConfig"
      :renew-months="renewMonths"
      :new-license-key="newLicenseKey"
      :edit-dialog-visible="showEditDialog"
      :adjust-users-visible="showAdjustUsersDialog"
      :adjust-storage-visible="showAdjustStorageDialog"
      :adjust-package-visible="showAdjustPackageDialog"
      :renew-visible="showRenewDialog"
      :license-visible="showLicenseDialog"
      @update:editDialogVisible="showEditDialog = $event"
      @update:adjustUsersVisible="showAdjustUsersDialog = $event"
      @update:adjustStorageVisible="showAdjustStorageDialog = $event"
      @update:adjustPackageVisible="showAdjustPackageDialog = $event"
      @update:renewVisible="showRenewDialog = $event"
      @update:licenseVisible="showLicenseDialog = $event"
      @update:newMaxUsers="newMaxUsers = $event"
      @update:newMaxOnlineSeats="newMaxOnlineSeats = $event"
      @update:newMaxStorageGb="newMaxStorageGb = $event"
      @update:newPackageId="newPackageId = $event"
      @update:packageTab="packageTab = $event"
      @update:syncPackageConfig="syncPackageConfig = $event"
      @update:renewMonths="renewMonths = $event"
      @confirm-edit="confirmEdit"
      @confirm-adjust-users="confirmAdjustUsers"
      @confirm-adjust-storage="confirmAdjustStorage"
      @confirm-adjust-package="confirmAdjustPackage"
      @confirm-renew="confirmRenew"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Odometer, User, ShoppingCart, Phone, TrendCharts, Van, Headset, Files, Money, Box, Setting, ChatLineSquare } from '@element-plus/icons-vue'
import type { FormInstance } from 'element-plus'
import request from '@/api/request'
import type { Package } from '@/api/packages'
import { getPackages as fetchPackageList } from '@/api/packages'

// 子组件
import BasicInfoCard from './Detail/BasicInfoCard.vue'
import LicenseInfoCard from './Detail/LicenseInfoCard.vue'
import ModuleAuthCard from './Detail/ModuleAuthCard.vue'
import UsersListCard from './Detail/UsersListCard.vue'
import OperationLogsCard from './Detail/OperationLogsCard.vue'
import BillsCard from './Detail/BillsCard.vue'
import CapacityOrdersCard from './Detail/CapacityOrdersCard.vue'
import DataExportCard from './Detail/DataExportCard.vue'
import DataCleanupCard from './Detail/DataCleanupCard.vue'
import DetailDialogs from './Detail/DetailDialogs.vue'

// 工具函数
import { formatStorage } from './Detail/helpers'

const route = useRoute()
const _router = useRouter()
const loading = ref(false)
const usersLoading = ref(false)
const submitting = ref(false)
const statusLoading = ref(false)
const showFullKey = ref(false)
const showEditDialog = ref(false)
const showAdjustUsersDialog = ref(false)
const showAdjustStorageDialog = ref(false)
const showAdjustPackageDialog = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const renewMonths = ref<number>(12)
const newLicenseKey = ref('')
const newMaxUsers = ref(10)
const newMaxOnlineSeats = ref(10)
const newMaxStorageGb = ref(5)
const newPackageId = ref<number | string>('')
const detailDialogsRef = ref<InstanceType<typeof DetailDialogs>>()

const detail = ref<any>({})
const users = ref<any[]>([])
const logs = ref<any[]>([])
const logsLoading = ref(false)
const exporting = ref(false)
const exportingUsers = ref(false)
const exportingLogs = ref(false)
const logsPagination = reactive({ page: 1, pageSize: 10, total: 0 })

// === 账单记录 ===
const bills = ref<any[]>([])
const billsLoading = ref(false)
const billsPagination = reactive({ page: 1, pageSize: 10, total: 0 })

// === 扩容记录 ===
const capacityOrders = ref<any[]>([])
const capacityLoading = ref(false)
const capacityPagination = reactive({ page: 1, pageSize: 10, total: 0 })

// === 模块配置 ===
const isEditingModules = ref(false)
const editModules = ref<string[]>([])
const chatArchiveAuthLoading = ref(false)

const crmModuleOptions = [
  { id: 'dashboard', title: '数据看板', icon: Odometer },
  { id: 'customer', title: '客户管理', icon: User },
  { id: 'order', title: '订单管理', icon: ShoppingCart },
  { id: 'service-management', title: '服务管理', icon: Phone },
  { id: 'performance', title: '业绩统计', icon: TrendCharts },
  { id: 'logistics', title: '物流管理', icon: Van },
  { id: 'service', title: '售后管理', icon: Headset },
  { id: 'data', title: '资料管理', icon: Files },
  { id: 'finance', title: '财务管理', icon: Money },
  { id: 'product', title: '商品管理', icon: Box },
  { id: 'wecom', title: '企微管理', icon: ChatLineSquare },
  { id: 'system', title: '系统管理', icon: Setting }
]

const allModuleIds = crmModuleOptions.map(m => m.id)

const isModuleEnabled = (id: string) => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  return (parsed || []).includes(id)
}

const enabledModulesCount = computed(() => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  return (parsed || []).filter((f: string) => allModuleIds.includes(f)).length
})

const startEditModules = () => {
  const modules = detail.value.modules || detail.value.features || []
  const parsed = typeof modules === 'string' ? JSON.parse(modules) : modules
  editModules.value = [...(parsed || [])]
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  isEditingModules.value = true
}
const cancelEditModules = () => { isEditingModules.value = false }
const selectAllModules = () => { editModules.value = [...allModuleIds] }
const deselectAllModules = () => { editModules.value = ['dashboard'] }

const saveModules = async () => {
  if (!editModules.value.includes('dashboard')) editModules.value.push('dashboard')
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, { modules: editModules.value })
    if (res.success) {
      ElMessage.success('模块配置已更新')
      isEditingModules.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

// === 会话存档授权 ===
const handleToggleChatArchiveAuth = async (val: boolean) => {
  const action = val ? '授权' : '取消授权'
  try {
    await ElMessageBox.confirm(
      val
        ? '授权后，该租户可启用企业微信会话存档功能。确定授权？'
        : '取消授权后，该租户将无法使用会话存档功能。确定取消？',
      `${action}会话存档`, { type: 'warning' }
    )
    chatArchiveAuthLoading.value = true
    const res = await request.put(`/tenants/${route.params.id}`, { wecomChatArchiveAuth: val })
    if (res.success) {
      detail.value.wecom_chat_archive_auth = val ? 1 : 0
      ElMessage.success(`已${action}会话存档功能`)
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    chatArchiveAuthLoading.value = false
  }
}

// === 套餐选择 ===
const allPackages = ref<Package[]>([])
const packagesLoading = ref(false)
const packageTab = ref('saas')
const syncPackageConfig = ref(true)

// === 编辑表单 ===
const editForm = reactive({
  name: '', code: '', contact: '', phone: '', email: '', remark: ''
})

// === 启用/禁用 ===
const handleToggleStatus = async () => {
  const isActive = detail.value.status === 'active'
  const action = isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}该租户吗？${isActive ? '禁用后该租户下所有用户将无法登录。' : ''}`,
      `${action}租户`, { type: 'warning' }
    )
    statusLoading.value = true
    const newStatus = isActive ? 'disabled' : 'active'
    const res = await request.put(`/tenants/${route.params.id}`, { status: newStatus })
    if (res.success) {
      ElMessage.success(`已${action}`)
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    statusLoading.value = false
  }
}

// === 编辑 ===
const handleEdit = () => {
  Object.assign(editForm, {
    name: detail.value.name,
    code: detail.value.code,
    contact: detail.value.contact || '',
    phone: detail.value.phone || '',
    email: detail.value.email || '',
    remark: detail.value.remark || ''
  })
  showEditDialog.value = true
}

const confirmEdit = async () => {
  await detailDialogsRef.value?.editFormRef?.validate()
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, {
      name: editForm.name, contact: editForm.contact, phone: editForm.phone,
      email: editForm.email, remark: editForm.remark
    })
    if (res.success) {
      ElMessage.success('更新成功')
      showEditDialog.value = false
      fetchDetail()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '更新失败')
  } finally {
    submitting.value = false
  }
}

// === 调整用户数 ===
const handleAdjustUsers = () => {
  newMaxUsers.value = detail.value.maxUsers || 10
  newMaxOnlineSeats.value = (Number(detail.value.max_online_seats) || 0) + (Number(detail.value.extra_online_seats) || 0) || 10
  showAdjustUsersDialog.value = true
}

const confirmAdjustUsers = async () => {
  submitting.value = true
  try {
    const isOnlineMode = detail.value.user_limit_mode === 'online'
    const updateData = isOnlineMode
      ? { max_online_seats: newMaxOnlineSeats.value }
      : { maxUsers: newMaxUsers.value }
    const res = await request.put(`/tenants/${route.params.id}`, updateData)
    if (res.success) { ElMessage.success('调整成功'); showAdjustUsersDialog.value = false; fetchDetail() }
  } catch (e: any) { ElMessage.error(e.message || '调整失败') }
  finally { submitting.value = false }
}

// === 调整存储空间 ===
const handleAdjustStorage = () => {
  newMaxStorageGb.value = detail.value.maxStorageGb || 5
  showAdjustStorageDialog.value = true
}

const confirmAdjustStorage = async () => {
  submitting.value = true
  try {
    const res = await request.put(`/tenants/${route.params.id}`, { maxStorageGb: newMaxStorageGb.value })
    if (res.success) { ElMessage.success('调整成功'); showAdjustStorageDialog.value = false; fetchDetail() }
  } catch (e: any) { ElMessage.error(e.message || '调整失败') }
  finally { submitting.value = false }
}

// === 调整套餐 ===
const handleAdjustPackage = async () => {
  newPackageId.value = detail.value.packageId || ''
  syncPackageConfig.value = true
  showAdjustPackageDialog.value = true
  if (allPackages.value.length === 0) {
    packagesLoading.value = true
    try { const res = await fetchPackageList(); allPackages.value = res.data || [] }
    catch { ElMessage.error('获取套餐列表失败') }
    finally { packagesLoading.value = false }
  }
}

const confirmAdjustPackage = async () => {
  if (!newPackageId.value) { ElMessage.warning('请选择套餐'); return }
  const pkg = allPackages.value.find(p => p.id === Number(newPackageId.value))
  if (!pkg) { ElMessage.warning('请选择套餐'); return }
  submitting.value = true
  try {
    const updateData: any = { packageId: pkg.id }
    if (syncPackageConfig.value) {
      updateData.maxUsers = pkg.max_users
      updateData.maxStorageGb = pkg.max_storage_gb
      updateData.modules = Array.isArray(pkg.modules) && pkg.modules.length > 0 ? pkg.modules : undefined
      // 🔥 同步套餐的用户限制模式和在线席位数
      const pkgMode = pkg.user_limit_mode || 'total'
      if (pkgMode === 'online' || pkgMode === 'both') {
        updateData.user_limit_mode = pkgMode === 'both' ? (detail.value.user_limit_mode || 'total') : pkgMode
        updateData.max_online_seats = pkg.max_online_seats || 0
      } else {
        updateData.user_limit_mode = 'total'
      }
    }
    const res = await request.put(`/tenants/${route.params.id}`, updateData)
    if (res.success) { ElMessage.success(`已更换为「${pkg.name}」套餐`); showAdjustPackageDialog.value = false; fetchDetail() }
  } catch (e: any) { ElMessage.error(e.message || '调整失败') }
  finally { submitting.value = false }
}

// === 重新生成授权码 ===
const handleRegenerate = async () => {
  try {
    await ElMessageBox.confirm('重新生成授权码后，原授权码将失效。确定继续？', '重新生成授权码', { type: 'warning' })
    const res = await request.post(`/tenants/${route.params.id}/regenerate-license`)
    if (res.success) { newLicenseKey.value = res.data.licenseKey; showLicenseDialog.value = true; fetchDetail() }
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '操作失败') }
}

// === 续期 ===
const handleRenew = () => { renewMonths.value = 12; showRenewDialog.value = true }

const confirmRenew = async () => {
  if (!renewMonths.value) { ElMessage.warning('请选择续期时长'); return }
  submitting.value = true
  try {
    const base = detail.value.expireDate ? new Date(detail.value.expireDate) : new Date()
    const target = new Date(base)
    target.setMonth(target.getMonth() + renewMonths.value)
    const computedDate = target.toISOString().split('T')[0]
    const res = await request.post(`/tenants/${route.params.id}/renew`, { expireDate: computedDate })
    if (res.success) { ElMessage.success(`续期${renewMonths.value}个月成功`); showRenewDialog.value = false; fetchDetail() }
  } catch (e: any) { ElMessage.error(e.message || '续期失败') }
  finally { submitting.value = false }
}

// === 切换限制模式 ===
const handleSwitchLimitMode = async () => {
  const currentMode = detail.value.user_limit_mode || 'total'
  const newMode = currentMode === 'online' ? 'total' : 'online'
  const modeText = newMode === 'online' ? '在线席位制（限在）' : '总用户数制（限注）'
  try {
    await ElMessageBox.confirm(`确定将限制模式切换为「${modeText}」吗？`, '切换限制模式', { type: 'warning' })
    const res = await request.put(`/tenants/${route.params.id}`, { user_limit_mode: newMode })
    if (res.success) {
      ElMessage.success(`已切换为${modeText}`)
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '切换失败')
  }
}

// === 暂停/恢复授权 ===
const handleSuspend = async () => {
  try {
    await ElMessageBox.confirm('暂停授权后，该客户下所有用户将无法登录。确定继续？', '暂停授权', { type: 'warning' })
    const res = await request.post(`/tenants/${route.params.id}/suspend`)
    if (res.success) { ElMessage.success('已暂停授权'); fetchDetail() }
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '操作失败') }
}

const handleResume = async () => {
  try {
    const res = await request.post(`/tenants/${route.params.id}/resume`)
    if (res.success) { ElMessage.success('已恢复授权'); fetchDetail() }
  } catch (e: any) { ElMessage.error(e.message || '操作失败') }
}

// === 数据获取 ===
const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}`)
    if (res.success) {
      const d = res.data
      detail.value = {
        id: d.id, name: d.name, code: d.code, contact: d.contact, phone: d.phone, email: d.email,
        licenseKey: d.licenseKey || d.license_key, licenseStatus: d.licenseStatus || d.license_status,
        status: d.status, packageId: d.packageId || d.package_id, packageName: d.packageName || d.package_name,
        userCount: Number(d.userCount ?? d.user_count ?? 0), maxUsers: Number(d.maxUsers ?? d.max_users ?? 0),
        maxStorageGb: Number(d.maxStorageGb ?? d.max_storage_gb ?? 0), usedStorageMb: Number(d.usedStorageMb ?? d.used_storage_mb ?? 0),
        modules: typeof (d.modules) === 'string' ? JSON.parse(d.modules) : (d.modules || []),
        features: typeof (d.features) === 'string' ? JSON.parse(d.features) : (d.features || []),
        expireDate: d.expireDate || d.expire_date, activatedAt: d.activatedAt || d.activated_at,
        createdAt: d.createdAt || d.created_at, updatedAt: d.updatedAt || d.updated_at,
        createdByName: d.createdByName || d.created_by_name || '未知', remark: d.remark,
        adminUsers: d.adminUsers || [],
        memberPasswordStatus: d.memberPasswordStatus || 'unknown',
        memberPasswordDisplay: d.memberPasswordDisplay || '',
        crmPasswordStatus: d.crmPasswordStatus || 'unknown',
        crmPasswordDisplay: d.crmPasswordDisplay || '',
        wecom_chat_archive_auth: d.wecom_chat_archive_auth || 0,
        user_limit_mode: d.user_limit_mode || d.userLimitMode || 'total',
        max_online_seats: Number(d.max_online_seats ?? d.maxOnlineSeats ?? 0),
        extra_online_seats: Number(d.extra_online_seats ?? d.extraOnlineSeats ?? 0),
        onlineCount: Number(d.onlineCount ?? d.online_count ?? d.current_online_seats ?? 0)
      }
    }
  } catch (e: any) {
    const status = e?.response?.status
    if (status === 404) { ElMessage.warning('该租户记录不存在或已被删除'); setTimeout(() => _router.push('/tenant-customers/list'), 1500) }
    else { ElMessage.error('获取详情失败') }
  } finally { loading.value = false }
}

const fetchUsers = async () => {
  usersLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/users`)
    if (res.success) {
      users.value = (res.data.list || res.data || []).map((u: any) => ({
        id: u.id, username: u.username, name: u.name, realName: u.realName || u.real_name,
        phone: u.phone, email: u.email, role: u.role, departmentName: u.departmentName || u.department_name,
        position: u.position, lastLoginAt: u.lastLoginAt || u.last_login_at,
        loginCount: u.loginCount ?? u.login_count ?? 0, status: u.status
      }))
    }
  } catch { if (detail.value.users) { users.value = detail.value.users } }
  finally { usersLoading.value = false }
}

// === 操作日志 ===
const handleClearLogs = async () => {
  try {
    await ElMessageBox.confirm('确定要清空该租户的所有操作日志吗？此操作不可恢复。', '清空日志', { type: 'warning', confirmButtonText: '确定清空', cancelButtonText: '取消' })
    const res = await request.delete(`/tenants/${route.params.id}/logs`)
    if (res.success) { ElMessage.success(res.message || '日志已清空'); logs.value = []; logsPagination.total = 0 }
  } catch (e: any) { if (e !== 'cancel') ElMessage.error(e.message || '清空日志失败') }
}

const fetchLogs = async () => {
  logsLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/logs`, { params: { page: logsPagination.page, pageSize: logsPagination.pageSize } })
    if (res.success) {
      logs.value = (res.data.list || res.data || []).map((l: any) => ({
        id: l.id, action: l.action, result: l.result, message: l.message,
        licenseKey: l.licenseKey || l.license_key, ipAddress: l.ipAddress || l.ip_address,
        operatorId: l.operatorId || l.operator_id, operatorName: l.operatorName || l.operator_name,
        createdAt: l.createdAt || l.created_at
      }))
      logsPagination.total = res.data.total || 0
    }
  } catch { logs.value = [] }
  finally { logsLoading.value = false }
}

// === 账单记录 ===
const fetchBills = async () => {
  billsLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/bills`, { params: { page: billsPagination.page, pageSize: billsPagination.pageSize } })
    if (res.success) { bills.value = res.data.list || res.data || []; billsPagination.total = res.data.total || 0 }
  } catch { bills.value = [] }
  finally { billsLoading.value = false }
}

// === 扩容记录 ===
const fetchCapacityOrders = async () => {
  capacityLoading.value = true
  try {
    const res = await request.get('/capacity/orders', { params: { tenantId: route.params.id, page: capacityPagination.page, pageSize: capacityPagination.pageSize } })
    if (res.success) { capacityOrders.value = res.data.list || res.data || []; capacityPagination.total = res.data.total || 0 }
  } catch { capacityOrders.value = [] }
  finally { capacityLoading.value = false }
}

// === 数据导出/导入 ===
const downloadExcelFromApi = async (url: string, fallbackFilename: string) => {
  const token = localStorage.getItem('admin_token')
  const response = await fetch(`/api/v1/admin${url}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!response.ok) { const err = await response.json().catch(() => ({ message: '下载失败' })); throw new Error(err.message || '下载失败') }
  const blob = await response.blob()
  const disposition = response.headers.get('Content-Disposition')
  let filename = fallbackFilename
  if (disposition) { const match = disposition.match(/filename\*?=(?:UTF-8'')?["']?([^"';\n]+)/i); if (match) filename = decodeURIComponent(match[1]) }
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob); link.download = filename
  document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href)
}

const handleExportDetail = async () => {
  exporting.value = true
  try { await downloadExcelFromApi(`/tenants/${route.params.id}/export-excel/detail`, `租户详情_${detail.value.name || detail.value.code}_${new Date().toISOString().slice(0, 10)}.xlsx`); ElMessage.success('导出成功') }
  catch (err: any) { ElMessage.error(err.message || '导出失败') }
  finally { exporting.value = false }
}

const handleExportUsers = async () => {
  exportingUsers.value = true
  try { await downloadExcelFromApi(`/tenants/${route.params.id}/export-excel/users`, `租户用户列表_${detail.value.name || detail.value.code}_${new Date().toISOString().slice(0, 10)}.xlsx`); ElMessage.success('导出成功') }
  catch (err: any) { ElMessage.error(err.message || '导出失败') }
  finally { exportingUsers.value = false }
}

const handleExportLogs = async () => {
  exportingLogs.value = true
  try { await downloadExcelFromApi(`/tenants/${route.params.id}/export-excel/logs`, `租户操作日志_${detail.value.name || detail.value.code}_${new Date().toISOString().slice(0, 10)}.xlsx`); ElMessage.success('导出成功') }
  catch (err: any) { ElMessage.error(err.message || '导出失败') }
  finally { exportingLogs.value = false }
}

// === 完整业务数据导出/导入 ===
const fullExporting = ref(false)
const fullExportJobId = ref('')
const fullExportStatus = ref('')
const fullExportProgress = ref(0)
const fullExportError = ref('')
let exportPollTimer: ReturnType<typeof setInterval> | null = null

const handleFullExport = async () => {
  try { await ElMessageBox.confirm('将导出该租户的全部业务数据（用户、客户、订单、产品、售后、物流、通话、业绩、企微、配置等70+张表），生成JSON文件。\n\n此文件可用于数据备份或恢复。继续？', '完整数据导出', { confirmButtonText: '开始导出', cancelButtonText: '取消', type: 'info' }) } catch { return }
  fullExporting.value = true; fullExportJobId.value = ''; fullExportStatus.value = ''; fullExportProgress.value = 0; fullExportError.value = ''
  try {
    const res = await request.post(`/tenants/${route.params.id}/export`)
    if (res.success) { fullExportJobId.value = res.data.jobId; fullExportStatus.value = 'processing'; exportPollTimer = setInterval(pollExportProgress, 2000); ElMessage.success('导出任务已创建，正在后台处理...') }
    else { ElMessage.error(res.message || '创建导出任务失败') }
  } catch (err: any) { ElMessage.error(err?.message || '创建导出任务失败') }
  finally { fullExporting.value = false }
}

const pollExportProgress = async () => {
  if (!fullExportJobId.value) return
  try {
    const res = await request.get(`/tenants/${route.params.id}/export/${fullExportJobId.value}`)
    if (res.success) {
      const d = res.data; fullExportStatus.value = d.status; fullExportProgress.value = d.progress || 0
      if (d.status === 'completed' || d.status === 'failed') {
        if (exportPollTimer) { clearInterval(exportPollTimer); exportPollTimer = null }
        if (d.status === 'completed') { ElMessage.success(`导出完成！共 ${d.processedRecords} 条记录`) }
        else { fullExportError.value = d.error || '未知错误'; ElMessage.error(`导出失败: ${d.error || '未知错误'}`) }
      }
    }
  } catch { /* 轮询失败静默忽略 */ }
}

const handleFullExportDownload = async () => {
  if (!fullExportJobId.value) return
  try {
    const token = localStorage.getItem('admin_token')
    const url = `/api/v1/admin/tenants/${route.params.id}/export/${fullExportJobId.value}/download`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `tenant_${detail.value.code}_export.json`
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href)
  } catch { ElMessage.error('下载JSON数据失败') }
}

const handleFullExportDownloadHtml = async () => {
  if (!fullExportJobId.value) return
  try {
    const token = localStorage.getItem('admin_token')
    const url = `/api/v1/admin/tenants/${route.params.id}/export/${fullExportJobId.value}/download?format=html`
    const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!response.ok) throw new Error('下载失败')
    const blob = await response.blob()
    const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = `tenant_${detail.value.code}_report.html`
    document.body.appendChild(link); link.click(); document.body.removeChild(link); URL.revokeObjectURL(link.href)
  } catch { ElMessage.error('下载HTML报告失败') }
}

// 导入
const fullImporting = ref(false)
const fullImportJobId = ref('')
const fullImportStatus = ref('')
const fullImportProgress = ref(0)
const fullImportProcessed = ref(0)
const fullImportSkipped = ref(0)
const fullImportErrors = ref(0)
let importPollTimer: ReturnType<typeof setInterval> | null = null

const handleFullImport = async (file: any) => {
  const rawFile = file.raw || file
  if (!rawFile) return
  if (!rawFile.name.endsWith('.json')) { ElMessage.error('只支持导入 JSON 格式的数据包'); return }
  try { await ElMessageBox.confirm(`即将导入文件 "${rawFile.name}" 到租户「${detail.value.name}」。\n\n已存在的记录将被跳过（不覆盖）。确认导入？`, '业务数据导入', { confirmButtonText: '开始导入', cancelButtonText: '取消', type: 'warning' }) } catch { return }
  fullImporting.value = true; fullImportJobId.value = ''; fullImportStatus.value = ''
  try {
    const formData = new FormData(); formData.append('file', rawFile); formData.append('conflictStrategy', 'skip')
    const res = await request.post(`/tenants/${route.params.id}/import`, formData, { headers: { 'Content-Type': 'multipart/form-data' } })
    if (res.success) { fullImportJobId.value = res.data.jobId; fullImportStatus.value = 'processing'; importPollTimer = setInterval(pollImportProgress, 2000); ElMessage.success('导入任务已创建，正在后台处理...') }
    else { ElMessage.error(res.message || '创建导入任务失败') }
  } catch (err: any) { ElMessage.error(err?.message || '创建导入任务失败') }
  finally { fullImporting.value = false }
}

const pollImportProgress = async () => {
  if (!fullImportJobId.value) return
  try {
    const res = await request.get(`/tenants/${route.params.id}/import/${fullImportJobId.value}`)
    if (res.success) {
      const d = res.data; fullImportStatus.value = d.status; fullImportProgress.value = d.progress || 0
      fullImportProcessed.value = d.processedRecords || 0; fullImportSkipped.value = d.skippedRecords || 0; fullImportErrors.value = d.errorRecords || 0
      if (d.status === 'completed' || d.status === 'failed') {
        if (importPollTimer) { clearInterval(importPollTimer); importPollTimer = null }
        if (d.status === 'completed') { ElMessage.success(`导入完成！处理 ${d.processedRecords} 条，跳过 ${d.skippedRecords} 条`) }
        else { ElMessage.error('导入过程有错误，请检查数据格式') }
      }
    }
  } catch { /* 轮询失败静默忽略 */ }
}

// === 数据清理 ===
const cleanupStatusLoading = ref(false)
const cleanupExecuting = ref(false)
const cleanupStatus = reactive({ canCleanup: false, reason: '', expiredDays: 0, dataCleaned: false, dataCleanedAt: '', lastCleanup: null as any })
const cleanupResult = ref<any>(null)

const fetchCleanupStatus = async () => {
  cleanupStatusLoading.value = true
  try {
    const res = await request.get(`/tenants/${route.params.id}/cleanup-status`)
    if (res.success && res.data) {
      const d = res.data; cleanupStatus.canCleanup = d.canCleanup; cleanupStatus.reason = d.reason || ''
      cleanupStatus.expiredDays = d.expiredDays || 0; cleanupStatus.dataCleaned = !!d.dataCleaned
      cleanupStatus.dataCleanedAt = d.dataCleanedAt || ''; cleanupStatus.lastCleanup = d.lastCleanup || null
    }
  } catch { /* 静默失败 */ }
  finally { cleanupStatusLoading.value = false }
}

const handleCleanupData = async () => {
  if (!cleanupStatus.canCleanup) return
  try { await ElMessageBox.confirm(`即将清理租户「${detail.value.name}」(${detail.value.code}) 的全部数据，包括：\n\n• 所有数据库记录（客户、订单、用户、配置等）\n• 所有物理文件（上传的图片、附件等）\n\n⚠️ 此操作不可恢复！请确认该租户已过期且无需保留数据。`, '危险操作 - 清理过期数据', { type: 'error', confirmButtonText: '下一步确认', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger', dangerouslyUseHTMLString: false }) } catch { return }
  let inputCode = ''
  try { const result = await ElMessageBox.prompt(`请输入该租户的编码「${detail.value.code}」以确认清理操作：`, '二次确认 - 输入租户编码', { confirmButtonText: '确认清理', cancelButtonText: '取消', confirmButtonClass: 'el-button--danger', inputPattern: /.+/, inputErrorMessage: '请输入租户编码' }); inputCode = result.value?.trim() || '' } catch { return }
  if (inputCode !== detail.value.code) { ElMessage.error('租户编码不匹配，清理操作已取消'); return }
  cleanupExecuting.value = true; cleanupResult.value = null
  try {
    const res = await request.post(`/tenants/${route.params.id}/cleanup-data`, { confirmCode: inputCode })
    if (res.success) { ElMessage.success(res.message || '数据清理完成'); cleanupResult.value = res.data; await fetchCleanupStatus(); fetchDetail(); fetchUsers(); fetchLogs(); fetchBills() }
    else { ElMessage.error(res.message || '清理失败') }
  } catch (error: any) { ElMessage.error(error?.message || '清理数据失败，请稍后重试') }
  finally { cleanupExecuting.value = false }
}

onMounted(() => {
  fetchDetail(); fetchUsers(); fetchLogs(); fetchBills(); fetchCapacityOrders(); fetchCleanupStatus()
})
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; }

/* ====== 增值服务授权 ====== */
.detail-section-card {
  border-radius: 8px; border: none;
  :deep(.el-card__header) { padding: 12px 20px; }
}
.card-header {
  display: flex; justify-content: space-between; align-items: center; font-weight: 500;
  .el-icon { margin-right: 4px; vertical-align: -2px; }
}
.vas-auth-item {
  display: flex; justify-content: space-between; align-items: center;
  padding: 16px 20px; background: #fafbfc; border-radius: 10px; border: 1px solid #f0f2f5;
}
.vas-info { flex: 1; }
.vas-title { display: flex; align-items: center; gap: 8px; margin-bottom: 6px; }
.vas-name { font-size: 15px; font-weight: 600; color: #303133; }
.vas-desc { font-size: 13px; color: #909399; line-height: 1.6; }
.vas-action { flex-shrink: 0; margin-left: 20px; }

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  :deep(.card-header) { flex-direction: column; align-items: flex-start; }
  :deep(.button-group) { width: 100%; .el-button { font-size: 12px; } }
  .vas-auth-item { flex-direction: column; gap: 12px; align-items: flex-start; }
  .vas-action { margin-left: 0; }
}
</style>

