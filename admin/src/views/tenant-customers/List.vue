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
          <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增租户客户</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="name" label="客户名称" min-width="150" />
        <el-table-column prop="code" label="租户编码" width="120" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column label="授权码" width="200">
          <template #default="{ row }">
            <div class="license-key-cell">
              <span class="license-key">{{ row.showFullKey ? row.license_key : maskKey(row.license_key) }}</span>
              <el-button link type="primary" size="small" @click="row.showFullKey = !row.showFullKey">
                {{ row.showFullKey ? '隐藏' : '显示' }}
              </el-button>
              <el-button link type="primary" size="small" @click="copyKey(row.license_key)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="授权状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getLicenseStatusType(row.license_status)" size="small">
              {{ getLicenseStatusText(row.license_status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="package_name" label="套餐" width="100">
          <template #default="{ row }">
            <el-tag :type="getPackageType(row.package_name)">{{ row.package_name || '未设置' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数" width="100" align="center">
          <template #default="{ row }">{{ row.user_count || 0 }} / {{ row.max_users }}</template>
        </el-table-column>
        <el-table-column prop="expire_date" label="到期时间" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expire_date) }">
              {{ row.expire_date || '永久' }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/tenant-customers/detail/${row.id}`)">详情</el-button>
            <el-button link type="warning" @click="handleEdit(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button link type="primary">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="regenerate">重新生成授权码</el-dropdown-item>
                  <el-dropdown-item command="renew">续期</el-dropdown-item>
                  <el-dropdown-item :command="row.license_status === 'suspended' ? 'resume' : 'suspend'" divided>
                    {{ row.license_status === 'suspended' ? '恢复授权' : '暂停授权' }}
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided style="color: #f56c6c">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
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
          <el-input v-model="form.code" :disabled="!!editingId" placeholder="唯一标识，如：COMPANY_A" />
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
          <el-select v-model="form.packageId" style="width: 100%" placeholder="请选择套餐">
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
        <el-form-item label="当前到期">{{ renewingTenant?.expire_date || '永久' }}</el-form-item>
        <el-form-item label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="handleRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码生成成功提示 -->
    <el-dialog v-model="showLicenseDialog" title="客户创建成功" width="500px">
      <el-result icon="success" title="租户客户创建成功">
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
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Plus, ArrowDown } from '@element-plus/icons-vue'
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
const renewingTenant = ref<any>(null)
const renewExpireDate = ref<Date | null>(null)

const searchForm = reactive({ keyword: '', packageId: '', status: '' })
const form = reactive({
  name: '', code: '', contact: '', phone: '', email: '',
  packageId: '', maxUsers: 10, maxStorageGb: 5, expireDate: null as Date | null, remark: ''
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入客户名称' }],
  code: [{ required: true, message: '请输入租户编码' }, { pattern: /^[A-Za-z0-9_]+$/, message: '只能包含字母、数字和下划线' }]
}

const tableData = ref<any[]>([])
const packages = ref<any[]>([])

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length < 3) return key.substring(0, 8) + '****'
  return `${parts[0]}-${parts[1]}-****-****`
}

const copyKey = async (key: string) => {
  try {
    await navigator.clipboard.writeText(key)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.error('复制失败')
  }
}

const isExpired = (date: string) => date && new Date(date) < new Date()

const getPackageType = (p: string) => ({ '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }[p] || 'info')
const getStatusType = (s: string) => ({ active: 'success', expired: 'info', disabled: 'danger' }[s] || 'info')
const getStatusText = (s: string) => ({ active: '正常', expired: '已过期', disabled: '已禁用' }[s] || s)
const getLicenseStatusType = (s: string) => ({ active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }[s] || 'info')
const getLicenseStatusText = (s: string) => ({ active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }[s] || s)

const handleSearch = () => { page.value = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { keyword: '', packageId: '', status: '' }); handleSearch() }

const handleAdd = () => {
  editingId.value = null
  Object.assign(form, { name: '', code: '', contact: '', phone: '', email: '', packageId: '', maxUsers: 10, maxStorageGb: 5, expireDate: null, remark: '' })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, {
    name: row.name, code: row.code, contact: row.contact || '', phone: row.phone || '', email: row.email || '',
    packageId: row.package_id, maxUsers: row.max_users, maxStorageGb: row.max_storage_gb || 5,
    expireDate: row.expire_date ? new Date(row.expire_date) : null, remark: row.remark || ''
  })
  showDialog.value = true
}

const handleCommand = async (cmd: string, row: any) => {
  switch (cmd) {
    case 'regenerate':
      ElMessageBox.confirm('重新生成授权码后，原授权码将失效，客户需要使用新授权码登录。确定继续？', '重新生成授权码', { type: 'warning' })
        .then(async () => {
          const res = await request.post(`/tenants/${row.id}/regenerate-license`)
          if (res.success) {
            newLicenseKey.value = res.data.licenseKey
            showLicenseDialog.value = true
            fetchData()
          }
        })
      break
    case 'renew':
      renewingTenant.value = row
      renewExpireDate.value = null
      showRenewDialog.value = true
      break
    case 'suspend':
      ElMessageBox.confirm('暂停授权后，该客户下所有用户将无法登录。确定继续？', '暂停授权', { type: 'warning' })
        .then(async () => {
          const res = await request.post(`/tenants/${row.id}/suspend`)
          if (res.success) { ElMessage.success('已暂停授权'); fetchData() }
        })
      break
    case 'resume':
      const res = await request.post(`/tenants/${row.id}/resume`)
      if (res.success) { ElMessage.success('已恢复授权'); fetchData() }
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

const handleRenew = async () => {
  if (!renewExpireDate.value) {
    ElMessage.warning('请选择新的到期时间')
    return
  }
  submitting.value = true
  try {
    const res = await request.post(`/tenants/${renewingTenant.value.id}/renew`, {
      expireDate: renewExpireDate.value.toISOString().split('T')[0]
    })
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchData()
    }
  } finally {
    submitting.value = false
  }
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
        showDialog.value = false
        showLicenseDialog.value = true
        fetchData()
      }
    }
  } finally {
    submitting.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await request.get('/tenants', {
      params: { page: page.value, pageSize: pageSize.value, ...searchForm }
    })
    if (res.success) {
      tableData.value = (res.data.list || []).map((item: any) => ({ ...item, showFullKey: false }))
      total.value = res.data.total || 0
    }
  } catch (e) {
    // 使用模拟数据
    tableData.value = [
      { id: '1', name: '深圳电商公司', code: 'SZDS', contact: '陈总', phone: '13600136001', license_key: 'TENANT-A1B2-C3D4-E5F6-G7H8', license_status: 'active', package_name: '企业版', user_count: 45, max_users: 100, expire_date: '2026-12-31', status: 'active', showFullKey: false },
      { id: '2', name: '杭州科技公司', code: 'HZKJ', contact: '刘经理', phone: '13500135002', license_key: 'TENANT-X1Y2-Z3A4-B5C6-D7E8', license_status: 'pending', package_name: '专业版', user_count: 18, max_users: 50, expire_date: '2026-06-30', status: 'active', showFullKey: false },
      { id: '3', name: '成都贸易公司', code: 'CDMY', contact: '赵经理', phone: '13400134003', license_key: 'TENANT-M1N2-O3P4-Q5R6-S7T8', license_status: 'active', package_name: '基础版', user_count: 8, max_users: 20, expire_date: '2026-03-15', status: 'active', showFullKey: false }
    ]
    total.value = 3
  } finally {
    loading.value = false
  }
}

const fetchPackages = async () => {
  try {
    const res = await request.get('/packages')
    if (res.success) packages.value = res.data.list || []
  } catch {
    packages.value = [
      { id: '1', name: '基础版' },
      { id: '2', name: '专业版' },
      { id: '3', name: '企业版' }
    ]
  }
}

onMounted(() => { fetchData(); fetchPackages() })
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }
.license-key-cell {
  display: flex; align-items: center; gap: 4px;
  .license-key { font-family: monospace; font-size: 12px; }
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
</style>
