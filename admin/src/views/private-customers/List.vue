<template>
  <div class="page-container">
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/授权码" clearable style="width: 200px" />
        </el-form-item>
        <el-form-item label="授权类型">
          <el-select v-model="searchForm.licenseType" placeholder="全部" clearable style="width: 120px">
            <el-option label="试用" value="trial" />
            <el-option label="年度" value="annual" />
            <el-option label="永久" value="perpetual" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="全部" clearable style="width: 100px">
            <el-option label="待激活" value="pending" />
            <el-option label="有效" value="active" />
            <el-option label="过期" value="expired" />
            <el-option label="已吊销" value="revoked" />
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
          <span>私有客户列表</span>
          <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增私有客户</el-button>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="customerName" label="客户名称" min-width="150" />
        <el-table-column prop="contact" label="联系人" width="100" />
        <el-table-column prop="phone" label="联系电话" width="130" />
        <el-table-column prop="licenseKey" label="授权码" min-width="220">
          <template #default="{ row }">
            <div class="license-key">
              <code>{{ row.showFullKey ? row.licenseKey : maskKey(row.licenseKey) }}</code>
              <el-button link size="small" @click="row.showFullKey = !row.showFullKey">
                {{ row.showFullKey ? '隐藏' : '显示' }}
              </el-button>
              <el-button link size="small" @click="copyKey(row.licenseKey)">
                <el-icon><CopyDocument /></el-icon>
              </el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="licenseType" label="授权类型" width="100">
          <template #default="{ row }">
            <el-tag :type="getLicenseTypeTag(row.licenseType)" size="small">
              {{ getLicenseTypeText(row.licenseType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="maxUsers" label="用户数" width="80" align="center" />
        <el-table-column prop="expiresAt" label="到期时间" width="120">
          <template #default="{ row }">
            <span :class="{ 'text-danger': isExpired(row.expiresAt) }">
              {{ row.licenseType === 'perpetual' ? '永久' : formatDate(row.expiresAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="90">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="220" fixed="right">
          <template #default="{ row }">
            <el-button link type="primary" @click="$router.push(`/private-customers/detail/${row.id}`)">详情</el-button>
            <el-button link type="warning" @click="handleEdit(row)">编辑</el-button>
            <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
              <el-button link type="primary">更多<el-icon><ArrowDown /></el-icon></el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item v-if="row.status === 'active'" command="renew">续期</el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 'active'" command="revoke">吊销</el-dropdown-item>
                  <el-dropdown-item v-if="row.status === 'pending'" command="delete" style="color: #f56c6c">删除</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="fetchData" @current-change="fetchData" />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑私有客户' : '新增私有客户'" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="客户名称" prop="customerName">
          <el-input v-model="form.customerName" placeholder="请输入客户名称" />
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
        <el-divider content-position="left">授权配置</el-divider>
        <el-form-item label="授权类型" prop="licenseType">
          <el-radio-group v-model="form.licenseType">
            <el-radio value="trial">试用版</el-radio>
            <el-radio value="annual">年度版</el-radio>
            <el-radio value="perpetual">永久版</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="最大用户数" prop="maxUsers">
          <el-input-number v-model="form.maxUsers" :min="1" :max="9999" />
        </el-form-item>
        <el-form-item label="存储空间" prop="maxStorageGb">
          <el-input-number v-model="form.maxStorageGb" :min="1" :max="1000" />
          <span style="margin-left: 8px">GB</span>
        </el-form-item>
        <el-form-item v-if="form.licenseType !== 'perpetual'" label="到期时间" prop="expiresAt">
          <el-date-picker v-model="form.expiresAt" type="date" placeholder="请选择到期时间" style="width: 100%" />
        </el-form-item>
        <el-divider content-position="left">功能模块</el-divider>
        <el-form-item label="开通模块">
          <el-checkbox-group v-model="form.modules">
            <el-checkbox v-for="m in moduleOptions" :key="m.value" :value="m.value">{{ m.label }}</el-checkbox>
          </el-checkbox-group>
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
    <el-dialog v-model="showRenewDialog" title="授权续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">{{ renewingCustomer?.customerName }}</el-form-item>
        <el-form-item label="当前到期">
          {{ renewingCustomer?.licenseType === 'perpetual' ? '永久' : formatDate(renewingCustomer?.expiresAt) }}
        </el-form-item>
        <el-form-item label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码生成成功提示 -->
    <el-dialog v-model="showLicenseDialog" title="客户创建成功" width="500px">
      <el-result icon="success" title="私有客户创建成功">
        <template #sub-title>
          <div class="license-result">
            <p>请将以下授权码发送给客户，用于激活私有部署系统：</p>
            <div class="license-key-box">
              <span class="key">{{ newLicenseKey }}</span>
              <el-button type="primary" size="small" @click="copyKey(newLicenseKey)">复制</el-button>
            </div>
            <p class="tip">提示：授权码是私有部署系统激活的唯一凭证，请妥善保管</p>
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
import { Search, Plus, CopyDocument, ArrowDown } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const renewingCustomer = ref<any>(null)
const renewExpireDate = ref<Date | null>(null)
const newLicenseKey = ref('')

const searchForm = reactive({ keyword: '', licenseType: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const tableData = ref<any[]>([])

const form = reactive({
  customerName: '',
  contact: '',
  phone: '',
  email: '',
  licenseType: 'annual' as 'trial' | 'annual' | 'perpetual',
  maxUsers: 50,
  maxStorageGb: 5,
  expiresAt: null as Date | null,
  modules: ['order', 'customer', 'logistics'] as string[],
  remark: ''
})

const rules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名称' }],
  licenseType: [{ required: true, message: '请选择授权类型' }],
  maxUsers: [{ required: true, message: '请输入最大用户数' }]
}

const moduleOptions = [
  { value: 'order', label: '订单管理' },
  { value: 'customer', label: '客户管理' },
  { value: 'logistics', label: '物流管理' },
  { value: 'finance', label: '财务管理' },
  { value: 'performance', label: '绩效管理' },
  { value: 'call', label: '电销外呼' }
]

const maskKey = (key: string) => {
  if (!key) return ''
  const parts = key.split('-')
  if (parts.length >= 4) return `${parts[0]}-${parts[1]}-****-****`
  return key.substring(0, 12) + '****'
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
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN') : '-'

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: 'primary', perpetual: 'success' }[type] || 'info')
const getLicenseTypeText = (type: string) => ({ trial: '试用', annual: '年度', perpetual: '永久' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info')
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)

const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { keyword: '', licenseType: '', status: '' }); handleSearch() }

const handleAdd = () => {
  editingId.value = null
  Object.assign(form, {
    customerName: '', contact: '', phone: '', email: '',
    licenseType: 'annual', maxUsers: 50, maxStorageGb: 5, expiresAt: null,
    modules: ['order', 'customer', 'logistics'], remark: ''
  })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, {
    customerName: row.customerName,
    contact: row.contact || '',
    phone: row.phone || '',
    email: row.email || '',
    licenseType: row.licenseType,
    maxUsers: row.maxUsers,
    maxStorageGb: row.maxStorageGb || 5,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    modules: row.modules || ['order', 'customer', 'logistics'],
    remark: row.remark || ''
  })
  showDialog.value = true
}

const handleCommand = async (cmd: string, row: any) => {
  switch (cmd) {
    case 'renew':
      renewingCustomer.value = row
      renewExpireDate.value = null
      showRenewDialog.value = true
      break
    case 'revoke':
      try {
        await ElMessageBox.confirm(`确定要吊销 ${row.customerName} 的授权吗？吊销后该授权将无法使用。`, '吊销授权', { type: 'warning' })
        const res = await adminApi.revokeLicense(row.id)
        if (res.success) {
          ElMessage.success('已吊销')
          fetchData()
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
      }
      break
    case 'delete':
      try {
        await ElMessageBox.confirm(`确定要删除该客户吗？`, '删除客户', { type: 'warning' })
        const res = await adminApi.deleteLicense(row.id)
        if (res.success) {
          ElMessage.success('已删除')
          fetchData()
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
      }
      break
  }
}

const confirmRenew = async () => {
  if (!renewExpireDate.value) {
    ElMessage.warning('请选择新的到期时间')
    return
  }
  submitting.value = true
  try {
    const res = await adminApi.renewLicense(renewingCustomer.value.id, renewExpireDate.value.toISOString())
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchData()
    }
  } catch (e: any) {
    ElMessage.error(e.message || '续期失败')
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
      expiresAt: form.licenseType === 'perpetual' ? null : form.expiresAt?.toISOString()
    }
    if (editingId.value) {
      const res = await adminApi.updateLicense(editingId.value, data)
      if (res.success) {
        ElMessage.success('更新成功')
        showDialog.value = false
        fetchData()
      }
    } else {
      const res = await adminApi.generateLicense(data)
      if (res.success) {
        newLicenseKey.value = res.data.licenseKey
        showDialog.value = false
        showLicenseDialog.value = true
        fetchData()
      }
    }
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getLicenses({
      page: pagination.page,
      pageSize: pagination.pageSize,
      keyword: searchForm.keyword || undefined,
      licenseType: searchForm.licenseType || undefined,
      status: searchForm.status || undefined
    })
    if (res.success) {
      tableData.value = (res.data.list || []).map((item: any) => ({ ...item, showFullKey: false }))
      pagination.total = res.data.total || 0
    }
  } catch (e) {
    // 使用模拟数据
    tableData.value = [
      { id: '1', licenseKey: 'A1B2C3D4-E5F6G7H8-I9J0K1L2-M3N4O5P6', customerName: '北京科技有限公司', contact: '张经理', phone: '13800138001', licenseType: 'perpetual', maxUsers: 100, expiresAt: null, status: 'active', showFullKey: false },
      { id: '2', licenseKey: 'Q1R2S3T4-U5V6W7X8-Y9Z0A1B2-C3D4E5F6', customerName: '上海贸易公司', contact: '李总', phone: '13900139002', licenseType: 'annual', maxUsers: 50, expiresAt: '2026-12-31', status: 'active', showFullKey: false },
      { id: '3', licenseKey: 'G1H2I3J4-K5L6M7N8-O9P0Q1R2-S3T4U5V6', customerName: '广州电商公司', contact: '王经理', phone: '13700137003', licenseType: 'trial', maxUsers: 10, expiresAt: '2026-02-05', status: 'pending', showFullKey: false }
    ]
    pagination.total = 3
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchData())
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.search-card, .table-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
.text-danger { color: #f56c6c; }

.license-key {
  display: flex;
  align-items: center;
  gap: 8px;
  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 12px;
    background: #f5f7fa;
    padding: 2px 6px;
    border-radius: 4px;
  }
}

.license-result {
  text-align: center;
  p { margin: 8px 0; color: #606266; }
  .tip { font-size: 12px; color: #909399; }
}

.license-key-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 16px;
  margin: 16px 0;
  background: #f5f7fa;
  border-radius: 8px;
  .key {
    font-family: monospace;
    font-size: 18px;
    font-weight: bold;
    color: #409eff;
    letter-spacing: 1px;
  }
}
</style>
