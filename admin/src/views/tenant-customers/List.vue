<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/编码/授权码" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="套餐">
          <el-select v-model="searchForm.packageId" placeholder="全部" clearable style="width: 120px">
            <el-option v-for="p in packages" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="正常" value="active" />
            <el-option label="已过期" value="expired" />
            <el-option label="已禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>租户客户列表</span>
          <div class="header-actions">
            <el-button @click="handleExport"><el-icon><Download /></el-icon>导出</el-button>
            <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增租户客户</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe :border="false" table-layout="fixed">
        <el-table-column prop="name" label="客户名称" min-width="160" show-overflow-tooltip />
        <el-table-column label="租户编码" min-width="120" show-overflow-tooltip>
          <template #default="{ row }">
            <el-tag size="small" type="info">{{ row.code || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="contact" label="联系人" min-width="80" show-overflow-tooltip />
        <el-table-column label="授权码" min-width="200" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="license-key-cell">
              <span class="license-key">{{ row.showFullKey ? row.licenseKey : maskKey(row.licenseKey) }}</span>
              <el-tooltip :content="row.showFullKey ? '隐藏授权码' : '显示授权码'" placement="top">
                <el-icon class="action-icon" @click="row.showFullKey = !row.showFullKey">
                  <View v-if="!row.showFullKey" />
                  <Hide v-else />
                </el-icon>
              </el-tooltip>
              <el-tooltip content="复制授权码" placement="top">
                <el-icon class="action-icon" @click="copyKey(row.licenseKey)">
                  <CopyDocument />
                </el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getLicenseStatusType(row.licenseStatus)" size="small">
              {{ getLicenseStatusText(row.licenseStatus) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="60" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.status === 'active' ? '点击禁用' : '点击启用'" placement="top">
              <el-switch
                :model-value="row.status === 'active'"
                @change="handleToggleStatus(row)"
                :loading="row.statusLoading"
                size="small"
              />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="套餐" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="getPackageType(row.packageName)" size="small">{{ row.packageName || '未设置' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数" width="80" align="center">
          <template #default="{ row }">
            <span class="usage-text">{{ row.userCount || 0 }}/{{ row.maxUsers }}</span>
          </template>
        </el-table-column>
        <el-table-column label="存储" width="100" align="center">
          <template #default="{ row }">
            <span class="usage-text">{{ formatStorage(row.usedStorageMb) }}/{{ row.maxStorageGb || 0 }}G</span>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="105" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expireDate) }">
              {{ formatExpireDate(row.expireDate) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" size="small" @click="$router.push(`/tenant-customers/detail/${row.id}`)">
                详情
              </el-button>
              <el-button link type="warning" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-button link :type="row.licenseStatus === 'suspended' ? 'success' : 'danger'" size="small"
                @click="row.licenseStatus === 'suspended' ? handleResume(row) : handleSuspend(row)"
                :loading="row.licenseLoading">
                {{ row.licenseStatus === 'suspended' ? '恢复' : '暂停' }}
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="info" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="renew">
                      <el-icon><Clock /></el-icon>续期
                    </el-dropdown-item>
                    <el-dropdown-item command="regenerate">
                      <el-icon><RefreshRight /></el-icon>重新生成授权码
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <span style="color: #f56c6c"><el-icon><Delete /></el-icon>删除</span>
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="page" v-model:page-size="pageSize" :total="total"
          layout="total, sizes, prev, pager, next" @change="fetchData" />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑租户客户' : '新增租户客户'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="客户名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入客户名称" />
        </el-form-item>
        <el-form-item label="租户编码" prop="code">
          <el-input v-model="form.code" :disabled="!!editingId" :placeholder="editingId ? '编码不可修改' : '留空自动生成，如 T260303A1B2'" />
        </el-form-item>
        <el-form-item label="联系人" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系人" />
        </el-form-item>
        <el-form-item label="联系电话" prop="phone">
          <el-input v-model="form.phone" placeholder="请输入联系电话" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="form.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-divider content-position="left">套餐配置</el-divider>
        <el-form-item label="套餐" prop="packageId">
          <el-select v-model="form.packageId" style="width: 100%" placeholder="请选择套餐" @change="onPackageChange">
            <el-option v-for="p in packages" :key="p.id" :label="p.name" :value="p.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="最大用户数" prop="maxUsers">
          <el-input-number v-model="form.maxUsers" :min="1" :max="9999" />
        </el-form-item>
        <el-form-item label="存储空间" prop="maxStorageGb">
          <el-input-number v-model="form.maxStorageGb" :min="1" :max="1000" />
          <span style="margin-left: 8px">GB</span>
        </el-form-item>
        <el-form-item label="到期时间" prop="expireDate">
          <el-date-picker v-model="form.expireDate" type="date" placeholder="留空表示永久" style="width: 100%" />
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>

    <!-- 续期对话框 -->
    <el-dialog v-model="showRenewDialog" title="租户续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">{{ renewingTenant?.name }}</el-form-item>
        <el-form-item label="当前到期">{{ formatExpireDate(renewingTenant?.expireDate) }}</el-form-item>
        <el-form-item label="续期时长" required>
          <el-select v-model="renewMonths" placeholder="请选择续期时长" style="width: 100%">
            <el-option :label="'1个月'" :value="1" />
            <el-option :label="'3个月'" :value="3" />
            <el-option :label="'6个月'" :value="6" />
            <el-option :label="'12个月（1年）'" :value="12" />
            <el-option :label="'24个月（2年）'" :value="24" />
            <el-option :label="'36个月（3年）'" :value="36" />
          </el-select>
        </el-form-item>
        <el-form-item label="新到期时间">
          <span style="color: #409eff; font-weight: 500;">{{ computedExpireDate }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码生成成功提示 -->
    <el-dialog v-model="showLicenseDialog" title="授权码信息" width="500px">
      <el-result icon="success" :title="newLicenseTitle">
        <template #sub-title>
          <div class="license-result">
            <p>请将以下授权码发送给客户，用于登录 SaaS 系统：</p>
            <div class="license-key-box">
              <span class="key">{{ newLicenseKey }}</span>
              <el-button type="primary" size="small" @click="copyKey(newLicenseKey)">复制</el-button>
            </div>
            <p class="tip">提示：授权码是租户登录的唯一凭证，请妥善保管</p>
          </div>
        </template>
      </el-result>
      <template #footer>
        <el-button type="primary" @click="showLicenseDialog = false">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, ArrowDown, Download, View, Hide,
  CopyDocument, Clock, RefreshRight, Delete
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const newLicenseKey = ref('')
const newLicenseTitle = ref('租户客户创建成功')
const renewingTenant = ref<any>(null)
const renewMonths = ref<number>(12)

const searchForm = reactive({ keyword: '', packageId: '', status: '' })
const form = reactive({
  name: '', code: '', contact: '', phone: '', email: '',
  packageId: '', maxUsers: 10, maxStorageGb: 5, expireDate: null as Date | null, features: [] as string[], remark: ''
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入客户名称' }],
  phone: [{ pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号', trigger: 'blur' }],
  email: [{ type: 'email', message: '请输入正确的邮箱', trigger: 'blur' }]
}

const tableData = ref<any[]>([])
const packages = ref<any[]>([])

// === 工具方法 ===

const maskKey = (key: string) => {
  if (!key) return ''
  if (key.startsWith('LIC-')) {
    return `${key.substring(0, 8)}****${key.substring(key.length - 4)}`
  }
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 8) + '****'
}

const copyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const formatStorage = (mb: number) => {
  if (!mb || mb === 0) return '0MB'
  if (mb < 1024) return `${mb}MB`
  return `${(mb / 1024).toFixed(1)}GB`
}

const isExpired = (date: string) => date && new Date(date) < new Date()

const formatExpireDate = (date: string) => {
  if (!date) return '永久'
  return new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit' })
}

const getPackageType = (p: string): string => {
  const map: Record<string, string> = { '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }
  return map[p] || 'info'
}

const getLicenseStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}
const getLicenseStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }
  return map[s] || s
}

// === 续期计算 ===

const computedExpireDate = computed(() => {
  if (!renewMonths.value || !renewingTenant.value) return '-'
  const base = renewingTenant.value.expireDate
    ? new Date(renewingTenant.value.expireDate)
    : new Date()
  const target = new Date(base)
  target.setMonth(target.getMonth() + renewMonths.value)
  return target.toISOString().split('T')[0]
})

// === 搜索 ===

const handleSearch = () => { page.value = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { keyword: '', packageId: '', status: '' }); handleSearch() }

// === 新增/编辑 ===

const onPackageChange = (pkgId: string | number) => {
  const pkg = packages.value.find((p: any) => p.id === pkgId || String(p.id) === String(pkgId))
  if (pkg) {
    form.maxUsers = pkg.max_users ?? pkg.maxUsers ?? 10
    form.maxStorageGb = pkg.max_storage_gb ?? pkg.maxStorageGb ?? 5
    // 同步套餐的功能模块
    form.features = Array.isArray(pkg.features) ? [...pkg.features] : []
    // 根据 billing_cycle 和 duration_days 计算到期时间
    const days = pkg.duration_days ?? pkg.durationDays
    const isTrial = Boolean(pkg.is_trial)
    const billingCycle = pkg.billing_cycle ?? pkg.billingCycle
    if (isTrial) {
      // 试用套餐：根据 duration_days 设置到期时间
      if (days && days > 0) {
        const expire = new Date()
        expire.setDate(expire.getDate() + days)
        form.expireDate = expire
      } else {
        form.expireDate = null
      }
    } else if (billingCycle === 'forever' || billingCycle === 'permanent' || (days && days >= 36500)) {
      // 永久套餐
      form.expireDate = null
    } else if (billingCycle === 'yearly' || billingCycle === 'annual') {
      const expire = new Date()
      expire.setFullYear(expire.getFullYear() + 1)
      form.expireDate = expire
    } else if (billingCycle === 'monthly') {
      const expire = new Date()
      expire.setMonth(expire.getMonth() + 1)
      form.expireDate = expire
    } else if (days && days > 0 && days < 36500) {
      const expire = new Date()
      expire.setDate(expire.getDate() + days)
      form.expireDate = expire
    } else {
      form.expireDate = null // 默认永久
    }
  }
}

const handleAdd = () => {
  editingId.value = null
  Object.assign(form, { name: '', code: '', contact: '', phone: '', email: '', packageId: '', maxUsers: 10, maxStorageGb: 5, expireDate: null, features: [], remark: '' })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name, code: row.code, contact: row.contact || '', phone: row.phone || '', email: row.email || '',
    packageId: row.packageId, maxUsers: row.maxUsers, maxStorageGb: row.maxStorageGb || 5,
    expireDate: row.expireDate ? new Date(row.expireDate) : null, remark: row.remark || ''
  })
  showDialog.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    const data = {
      ...form,
      expireDate: form.expireDate ? (form.expireDate as Date).toISOString().split('T')[0] : null
    }
    if (editingId.value) {
      const res = await request.put(`/tenants/${editingId.value}`, data)
      if (res.success) {
        ElMessage.success('更新成功')
        showDialog.value = false
        fetchData()
      }
    } else {
      const res = await request.post('/tenants', data)
      if (res.success) {
        newLicenseKey.value = res.data.licenseKey
        newLicenseTitle.value = '租户客户创建成功'
        showDialog.value = false
        showLicenseDialog.value = true
        fetchData()
      }
    }
  } finally {
    submitting.value = false
  }
}

// === 启用/禁用状态 ===

const handleToggleStatus = async (row: any) => {
  const isActive = row.status === 'active'
  const action = isActive ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(
      `确定要${action}该租户吗？${isActive ? '禁用后该租户下所有用户将无法登录。' : ''}`,
      `${action}租户`, { type: 'warning' }
    )
    row.statusLoading = true
    const newStatus = isActive ? 'inactive' : 'active'
    const res = await request.put(`/tenants/${row.id}`, { status: newStatus })
    if (res.success) {
      ElMessage.success(`已${action}`)
      fetchData()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    row.statusLoading = false
  }
}

// === 暂停/恢复授权 ===

const handleSuspend = async (row: any) => {
  try {
    await ElMessageBox.confirm('暂停授权后，该客户下所有用户将无法登录。确定继续？', '暂停授权', { type: 'warning' })
    row.licenseLoading = true
    const res = await request.post(`/tenants/${row.id}/suspend`)
    if (res.success) { ElMessage.success('已暂停授权'); fetchData() }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  } finally {
    row.licenseLoading = false
  }
}

const handleResume = async (row: any) => {
  try {
    row.licenseLoading = true
    const res = await request.post(`/tenants/${row.id}/resume`)
    if (res.success) { ElMessage.success('已恢复授权'); fetchData() }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    row.licenseLoading = false
  }
}

// === 更多操作 ===

const handleCommand = async (cmd: string, row: any) => {
  switch (cmd) {
    case 'regenerate':
      ElMessageBox.confirm('重新生成授权码后，原授权码将失效，客户需要使用新授权码登录。确定继续？', '重新生成授权码', { type: 'warning' })
        .then(async () => {
          const res = await request.post(`/tenants/${row.id}/regenerate-license`)
          if (res.success) {
            newLicenseKey.value = res.data.licenseKey
            newLicenseTitle.value = '授权码已重新生成'
            showLicenseDialog.value = true
            fetchData()
          }
        })
      break
    case 'renew':
      renewingTenant.value = row
      renewMonths.value = 12
      showRenewDialog.value = true
      break
    case 'delete':
      ElMessageBox.confirm('删除客户将同时删除所有相关数据，此操作不可恢复！', '删除客户', { type: 'error' })
        .then(async () => {
          const res = await request.delete(`/tenants/${row.id}`)
          if (res.success) { ElMessage.success('已删除'); fetchData() }
        })
      break
  }
}

// === 续期 ===

const handleRenew = async () => {
  if (!renewMonths.value) {
    ElMessage.warning('请选择续期时长')
    return
  }
  submitting.value = true
  try {
    const res = await request.post(`/tenants/${renewingTenant.value.id}/renew`, {
      expireDate: computedExpireDate.value
    })
    if (res.success) {
      ElMessage.success(`续期${renewMonths.value}个月成功`)
      showRenewDialog.value = false
      fetchData()
    }
  } finally {
    submitting.value = false
  }
}

// === 数据获取 ===

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get('/tenants', {
      params: { page: page.value, pageSize: pageSize.value, ...searchForm }
    })
    if (res.success) {
      tableData.value = (res.data.list || []).map((item: any) => ({
        id: item.id,
        name: item.name,
        code: item.code,
        contact: item.contact,
        phone: item.phone,
        email: item.email,
        // 兼容 snake_case 和 camelCase
        licenseKey: item.licenseKey || item.license_key,
        licenseStatus: item.licenseStatus || item.license_status,
        status: item.status,
        packageId: item.packageId || item.package_id,
        packageName: item.packageName || item.package_name,
        userCount: item.userCount ?? item.user_count ?? 0,
        maxUsers: item.maxUsers ?? item.max_users ?? 0,
        maxStorageGb: item.maxStorageGb ?? item.max_storage_gb ?? 0,
        usedStorageMb: item.usedStorageMb ?? item.used_storage_mb ?? 0,
        expireDate: item.expireDate || item.expire_date,
        remark: item.remark,
        showFullKey: false,
        statusLoading: false,
        licenseLoading: false
      }))
      total.value = res.data.total || 0
    }
  } catch (e) {
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const fetchPackages = async () => {
  try {
    const res = await request.get('/packages')
    if (res.success) packages.value = res.data.list || res.data || []
  } catch {
    packages.value = [
      { id: '1', name: '基础版' },
      { id: '2', name: '专业版' },
      { id: '3', name: '企业版' }
    ]
  }
}

onMounted(() => { fetchData(); fetchPackages() })

// === 导出 ===

const handleExport = () => {
  const params = new URLSearchParams()
  if (searchForm.keyword) params.set('keyword', searchForm.keyword)
  if (searchForm.status) params.set('status', searchForm.status)
  const token = localStorage.getItem('admin_token')
  const url = `/api/v1/admin/export/tenants?${params.toString()}`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `租户客户列表_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      ElMessage.success('导出成功')
    })
    .catch(() => ElMessage.error('导出失败'))
}
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }

.license-key-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  .license-key {
    font-family: 'Courier New', monospace;
    font-size: 12px;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .action-icon {
    cursor: pointer;
    font-size: 16px;
    color: #409eff;
    transition: all 0.2s;
    flex-shrink: 0;
    &:hover {
      color: #66b1ff;
      transform: scale(1.1);
    }
  }
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 2px;
  flex-wrap: nowrap;
  white-space: nowrap;
}

.usage-text {
  font-size: 13px;
  color: #606266;
  white-space: nowrap;
}

.license-result {
  text-align: center;
  p { margin: 8px 0; color: #606266; }
  .tip { font-size: 12px; color: #909399; }
}
.license-key-box {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px; margin: 16px 0; background: #f5f7fa; border-radius: 8px;
  .key { font-family: monospace; font-size: 18px; font-weight: bold; color: #409eff; letter-spacing: 1px; }
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .search-card :deep(.el-form) {
    display: flex;
    flex-direction: column;
    .el-form-item {
      margin-right: 0;
      margin-bottom: 12px;
      width: 100%;
      .el-input, .el-select { width: 100% !important; }
    }
  }
  .card-header {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
    .header-actions {
      width: 100%;
      display: flex;
      gap: 8px;
      .el-button { flex: 1; }
    }
  }
  .table-card :deep(.el-table) { overflow-x: auto; }
}
</style>
