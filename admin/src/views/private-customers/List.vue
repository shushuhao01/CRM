<template>
  <div class="page-container">
    <!-- 统计概览 -->
    <div class="stats-row">
      <el-card shadow="never" class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">客户总数</div>
      </el-card>
      <el-card shadow="never" class="stat-card active">
        <div class="stat-value">{{ stats.active }}</div>
        <div class="stat-label">授权有效</div>
      </el-card>
      <el-card shadow="never" class="stat-card warning">
        <div class="stat-value">{{ stats.pending }}</div>
        <div class="stat-label">待激活</div>
      </el-card>
      <el-card shadow="never" class="stat-card danger">
        <div class="stat-value">{{ stats.expired }}</div>
        <div class="stat-label">已过期</div>
      </el-card>
      <el-card shadow="never" class="stat-card info">
        <div class="stat-value">{{ stats.revoked }}</div>
        <div class="stat-label">已吊销</div>
      </el-card>
    </div>

    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="关键词">
          <el-input v-model="searchForm.keyword" placeholder="客户名称/授权码" clearable style="width: 200px" @keyup.enter="handleSearch" />
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
          <div class="header-actions">
            <el-button @click="handleExport"><el-icon><Download /></el-icon>导出</el-button>
            <el-button type="primary" @click="handleAdd"><el-icon><Plus /></el-icon>新增私有客户</el-button>
          </div>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe :border="false" table-layout="fixed">
        <el-table-column prop="customerName" label="客户名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <div class="customer-name-cell">
              <span class="name">{{ row.customerName }}</span>
              <el-tag v-if="row.licenseType === 'trial'" size="small" type="info" class="type-badge">试用</el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="customerContact" label="联系人" width="100" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerContact || '-' }}</template>
        </el-table-column>
        <el-table-column prop="customerPhone" label="联系电话" width="130" show-overflow-tooltip>
          <template #default="{ row }">{{ row.customerPhone || '-' }}</template>
        </el-table-column>
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
        <el-table-column label="授权类型" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getLicenseTypeTag(row.licenseType)" size="small">
              {{ getLicenseTypeText(row.licenseType) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="用户数" width="80" align="center">
          <template #default="{ row }">
            <span class="usage-text">{{ row.maxUsers || 0 }}</span>
          </template>
        </el-table-column>
        <el-table-column label="到期时间" width="105" align="center">
          <template #default="{ row }">
            <span :class="{ 'text-danger': row.licenseType !== 'perpetual' && isExpired(row.expiresAt) }">
              {{ row.licenseType === 'perpetual' ? '永久' : formatDate(row.expiresAt) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="85" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right" align="center">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button link type="primary" size="small" @click="$router.push(`/private-customers/detail/${row.id}`)">
                详情
              </el-button>
              <el-button link type="warning" size="small" @click="handleEdit(row)">
                编辑
              </el-button>
              <el-dropdown trigger="click" @command="(cmd: string) => handleCommand(cmd, row)">
                <el-button link type="info" size="small">更多<el-icon class="el-icon--right"><ArrowDown /></el-icon></el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="unlock">
                      <el-icon><Unlock /></el-icon>解锁账号
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'active' || row.status === 'expired'" command="renew">
                      <el-icon><Clock /></el-icon>续期
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'active'" command="revoke">
                      <el-icon><CircleClose /></el-icon>吊销
                    </el-dropdown-item>
                    <el-dropdown-item v-if="row.status === 'revoked'" command="reactivate">
                      <el-icon><CircleCheck /></el-icon>重新激活
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
        <el-pagination v-model:current-page="pagination.page" v-model:page-size="pagination.pageSize"
          :total="pagination.total" :page-sizes="[10, 20, 50]" layout="total, sizes, prev, pager, next"
          @size-change="fetchData" @current-change="fetchData" />
      </div>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="showDialog" :title="editingId ? '编辑私有客户' : '新增私有客户'" width="640px" destroy-on-close>
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
          <el-radio-group v-model="form.licenseType" @change="onLicenseTypeChange">
            <el-radio value="trial">试用版</el-radio>
            <el-radio value="annual">年度版</el-radio>
            <el-radio value="perpetual">永久版</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item label="最大用户数" prop="maxUsers">
          <el-input-number v-model="form.maxUsers" :min="1" :max="9999" />
          <span class="form-tip">{{ licenseTypeConfig.usersTip }}</span>
        </el-form-item>
        <el-form-item v-if="form.licenseType !== 'perpetual'" label="到期时间" prop="expiresAt">
          <el-date-picker v-model="form.expiresAt" type="date" placeholder="请选择到期时间" style="width: 100%"
            :disabled-date="(date: Date) => date < new Date(new Date().setHours(0,0,0,0))" />
        </el-form-item>
        <el-form-item v-if="form.licenseType === 'perpetual'" label="到期时间">
          <el-tag type="success">永久有效</el-tag>
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
    <el-dialog v-model="showRenewDialog" title="授权续期" width="440px">
      <el-form label-width="100px">
        <el-form-item label="客户名称">
          <span class="text-bold">{{ renewingCustomer?.customerName }}</span>
        </el-form-item>
        <el-form-item label="授权类型">
          <el-tag :type="getLicenseTypeTag(renewingCustomer?.licenseType)" size="small">
            {{ getLicenseTypeText(renewingCustomer?.licenseType) }}
          </el-tag>
        </el-form-item>
        <el-form-item label="当前到期">
          <span :class="{ 'text-danger': isExpired(renewingCustomer?.expiresAt) }">
            {{ renewingCustomer?.licenseType === 'perpetual' ? '永久' : formatDate(renewingCustomer?.expiresAt) }}
          </span>
        </el-form-item>
        <el-form-item label="续期方式">
          <el-radio-group v-model="renewMode">
            <el-radio value="quick">快捷续期</el-radio>
            <el-radio value="custom">自定义日期</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="renewMode === 'quick'" label="续期时长">
          <el-select v-model="renewMonths" placeholder="请选择续期时长" style="width: 100%">
            <el-option :label="'1个月'" :value="1" />
            <el-option :label="'3个月'" :value="3" />
            <el-option :label="'6个月'" :value="6" />
            <el-option :label="'12个月（1年）'" :value="12" />
            <el-option :label="'24个月（2年）'" :value="24" />
            <el-option :label="'36个月（3年）'" :value="36" />
          </el-select>
        </el-form-item>
        <el-form-item v-else label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%"
            :disabled-date="(date: Date) => date < new Date()" />
        </el-form-item>
        <el-form-item label="续期后到期">
          <span style="color: #409eff; font-weight: 600; font-size: 15px;">{{ computedRenewDate }}</span>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <!-- 授权码生成成功提示 -->
    <el-dialog v-model="showLicenseDialog" title="私有客户创建成功" width="600px">
      <el-result icon="success" title="私有客户创建成功">
        <template #sub-title>
          <div class="license-result">
            <p class="result-desc">请将以下完整信息发送给客户，用于激活私有部署系统</p>

            <div class="info-box-group">
              <div class="info-box">
                <div class="info-label">🔑 授权码</div>
                <div class="info-value code">{{ loginInfo.licenseKey }}</div>
              </div>

              <div class="info-box">
                <div class="info-label">👤 管理员账号</div>
                <div class="info-value code">{{ loginInfo.username }}</div>
              </div>

              <div class="info-box">
                <div class="info-label">🔐 初始密码</div>
                <div class="info-value code">{{ loginInfo.password }}</div>
              </div>
            </div>

            <div class="copy-actions">
              <el-button type="primary" @click="copyAllInfo" size="large">
                <el-icon><CopyDocument /></el-icon>
                一键复制全部信息
              </el-button>
              <el-button @click="copyLicenseKey" plain>复制授权码</el-button>
              <el-button @click="copyCredentials" plain>复制账号密码</el-button>
            </div>

            <div class="tips-box">
              <p class="tip">💡 提示：</p>
              <ul>
                <li>授权码是私有部署系统激活的唯一凭证，请妥善保管</li>
                <li>首次登录后请立即修改密码</li>
                <li>此信息仅显示一次，请及时保存</li>
              </ul>
            </div>
          </div>
        </template>
      </el-result>
      <template #footer>
        <el-button type="primary" @click="showLicenseDialog = false" size="large">我知道了</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, CopyDocument, ArrowDown, Download, View, Hide,
  Clock, RefreshRight, Delete, CircleClose, CircleCheck, Unlock
} from '@element-plus/icons-vue'
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
const renewMode = ref<'quick' | 'custom'>('quick')
const renewMonths = ref<number>(12)
const newLicenseKey = ref('')
const licenseDialogTitle = ref('私有客户创建成功')

// 登录信息对象
const loginInfo = reactive({
  licenseKey: '',
  username: '',
  password: ''
})

const searchForm = reactive({ keyword: '', licenseType: '', status: '' })
const pagination = reactive({ page: 1, pageSize: 10, total: 0 })
const tableData = ref<any[]>([])
const stats = reactive({ total: 0, active: 0, pending: 0, expired: 0, revoked: 0 })
const form = reactive({
  customerName: '',
  contact: '',
  phone: '',
  email: '',
  licenseType: 'annual' as 'trial' | 'annual' | 'perpetual',
  maxUsers: 50,
  expiresAt: null as Date | null,
  modules: ['dashboard', 'customer', 'order'] as string[],
  remark: ''
})

const rules: FormRules = {
  customerName: [{ required: true, message: '请输入客户名称' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
  licenseType: [{ required: true, message: '请选择授权类型' }],
  maxUsers: [{ required: true, message: '请输入最大用户数' }],
  expiresAt: [{
    validator: (_rule: any, value: any, callback: any) => {
      if (form.licenseType !== 'perpetual' && !value) {
        callback(new Error('请选择到期时间'))
      } else {
        callback()
      }
    },
    trigger: 'change'
  }]
}

const moduleOptions = [
  { value: 'dashboard', label: '数据看板' },
  { value: 'customer', label: '客户管理' },
  { value: 'order', label: '订单管理' },
  { value: 'service-management', label: '服务管理' },
  { value: 'performance', label: '业绩统计' },
  { value: 'logistics', label: '物流管理' },
  { value: 'service', label: '售后管理' },
  { value: 'data', label: '资料管理' },
  { value: 'finance', label: '财务管理' },
  { value: 'product', label: '商品管理' },
  { value: 'system', label: '系统管理' }
]

// 授权类型对应的默认配置
const licenseTypePresets: Record<string, { maxUsers: number; durationDays: number; modules: string[]; usersTip: string }> = {
  trial: { maxUsers: 10, durationDays: 30, modules: ['dashboard', 'customer', 'order', 'data'], usersTip: '试用版建议 ≤10' },
  annual: { maxUsers: 50, durationDays: 365, modules: ['dashboard', 'customer', 'order', 'logistics', 'service', 'data', 'finance', 'performance', 'product'], usersTip: '年度版建议 10~200' },
  perpetual: { maxUsers: 100, durationDays: 0, modules: ['dashboard', 'customer', 'order', 'service-management', 'performance', 'logistics', 'service', 'data', 'finance', 'product', 'system'], usersTip: '永久版无限制' }
}

const licenseTypeConfig = computed(() => {
  return licenseTypePresets[form.licenseType] || licenseTypePresets.annual
})

// 切换授权类型时同步配置
const onLicenseTypeChange = (type: string) => {
  const preset = licenseTypePresets[type as keyof typeof licenseTypePresets]
  if (!preset) return
  // 只在新增模式下自动同步，编辑模式保留原值
  if (!editingId.value) {
    form.maxUsers = preset.maxUsers
    form.modules = [...preset.modules]
  }
  // 到期时间始终同步
  if (type === 'perpetual') {
    form.expiresAt = null
  } else if (preset.durationDays > 0) {
    const expire = new Date()
    expire.setDate(expire.getDate() + preset.durationDays)
    form.expiresAt = expire
  }
}

// === 工具方法 ===
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
const formatDate = (date: string) => date ? new Date(date).toLocaleDateString('zh-CN', { timeZone: 'Asia/Shanghai' }) : '-'

const getLicenseTypeTag = (type: string) => ({ trial: 'info', annual: '', perpetual: 'success' }[type] || 'info') as any
const getLicenseTypeText = (type: string) => ({ trial: '试用', annual: '年度', perpetual: '永久' }[type] || type)
const getStatusType = (status: string) => ({ pending: 'warning', active: 'success', expired: 'info', revoked: 'danger' }[status] || 'info') as any
const getStatusText = (status: string) => ({ pending: '待激活', active: '有效', expired: '已过期', revoked: '已吊销' }[status] || status)

// === 续期计算 ===
const computedRenewDate = computed(() => {
  if (renewMode.value === 'custom') {
    return renewExpireDate.value ? renewExpireDate.value.toLocaleDateString('zh-CN') : '请选择日期'
  }
  if (!renewMonths.value || !renewingCustomer.value) return '-'
  const base = renewingCustomer.value.expiresAt
    ? new Date(renewingCustomer.value.expiresAt)
    : new Date()
  const now = new Date()
  const effectiveBase = base < now ? now : base
  const target = new Date(effectiveBase)
  target.setMonth(target.getMonth() + renewMonths.value)
  return target.toLocaleDateString('zh-CN')
})

const computedRenewDateISO = computed(() => {
  if (renewMode.value === 'custom') {
    return renewExpireDate.value?.toISOString() || ''
  }
  if (!renewMonths.value || !renewingCustomer.value) return ''
  const base = renewingCustomer.value.expiresAt
    ? new Date(renewingCustomer.value.expiresAt)
    : new Date()
  const now = new Date()
  const effectiveBase = base < now ? now : base
  const target = new Date(effectiveBase)
  target.setMonth(target.getMonth() + renewMonths.value)
  return target.toISOString()
})

// === 搜索 ===
const handleSearch = () => { pagination.page = 1; fetchData() }
const handleReset = () => { Object.assign(searchForm, { keyword: '', licenseType: '', status: '' }); handleSearch() }

// === 新增/编辑 ===
const handleAdd = () => {
  editingId.value = null
  const preset = licenseTypePresets.annual
  Object.assign(form, {
    customerName: '', contact: '', phone: '', email: '',
    licenseType: 'annual', maxUsers: preset.maxUsers,
    expiresAt: (() => { const d = new Date(); d.setDate(d.getDate() + preset.durationDays); return d })(),
    modules: [...preset.modules], remark: ''
  })
  showDialog.value = true
}

const handleEdit = (row: any) => {
  editingId.value = row.id
  Object.assign(form, {
    customerName: row.customerName,
    contact: row.customerContact || '',
    phone: row.customerPhone || '',
    email: row.customerEmail || '',
    licenseType: row.licenseType,
    maxUsers: row.maxUsers,
    expiresAt: row.expiresAt ? new Date(row.expiresAt) : null,
    modules: row.features || ['dashboard', 'customer', 'order'],
    remark: row.notes || ''
  })
  showDialog.value = true
}

const handleCommand = async (cmd: string, row: any) => {
  switch (cmd) {
    case 'unlock':
      try {
        await ElMessageBox.confirm(
          `确定要解锁 "${row.customerName}" 的管理员账号吗？这将重置登录失败次数并解除账号锁定。`,
          '解锁账号', { type: 'info', confirmButtonText: '确定解锁', cancelButtonText: '取消' }
        )
        const res = await adminApi.unlockPrivateCustomerAdmin(row.id)
        if (res.success) {
          ElMessage.success(res.message || '解锁成功')
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '解锁失败')
      }
      break
    case 'renew':
      renewingCustomer.value = row
      renewExpireDate.value = null
      renewMode.value = 'quick'
      renewMonths.value = 12
      showRenewDialog.value = true
      break
    case 'revoke':
      try {
        await ElMessageBox.confirm(
          `确定要吊销 "${row.customerName}" 的授权吗？吊销后该授权将无法使用。`,
          '吊销授权', { type: 'warning', confirmButtonText: '确定吊销', cancelButtonText: '取消' }
        )
        const res = await adminApi.revokeLicense(row.id)
        if (res.success) { ElMessage.success('已吊销'); fetchData(); fetchStats() }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
      }
      break
    case 'reactivate':
      try {
        await ElMessageBox.confirm(
          `确定要重新激活 "${row.customerName}" 的授权吗？`,
          '重新激活', { type: 'info' }
        )
        const res = await adminApi.updateLicense(row.id, { status: 'active' })
        if (res.success) { ElMessage.success('已重新激活'); fetchData(); fetchStats() }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
      }
      break
    case 'regenerate':
      try {
        await ElMessageBox.confirm(
          '重新生成授权码后，原授权码将立即失效，客户需要使用新授权码激活系统。确定继续？',
          '重新生成授权码', { type: 'warning' }
        )
        const res = await adminApi.updateLicense(row.id, { regenerateKey: true })
        if (res.success && res.data?.licenseKey) {
          newLicenseKey.value = res.data.licenseKey
          licenseDialogTitle.value = '授权码已重新生成'
          showLicenseDialog.value = true
          fetchData()
        } else {
          ElMessage.success('操作完成')
          fetchData()
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
      }
      break
    case 'delete':
      try {
        await ElMessageBox.confirm('删除客户将同时删除所有授权数据，此操作不可恢复！', '删除客户', {
          type: 'error', confirmButtonText: '确定删除', confirmButtonClass: 'el-button--danger'
        })
        const res = await adminApi.deleteLicense(row.id)
        if (res.success) { ElMessage.success('已删除'); fetchData(); fetchStats() }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '删除失败')
      }
      break
  }
}

const confirmRenew = async () => {
  const dateISO = computedRenewDateISO.value
  if (!dateISO) {
    ElMessage.warning(renewMode.value === 'custom' ? '请选择新的到期时间' : '请选择续期时长')
    return
  }
  submitting.value = true
  try {
    const res = await adminApi.renewLicense(renewingCustomer.value.id, dateISO)
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
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return
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
        // 保存完整登录信息
        Object.assign(loginInfo, {
          licenseKey: res.data.licenseKey || '',
          username: res.data.adminAccount?.username || '',
          password: res.data.adminAccount?.password || ''
        })
        newLicenseKey.value = res.data.licenseKey
        licenseDialogTitle.value = '私有客户创建成功'
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

// 复制全部信息
const copyAllInfo = async () => {
  const text = `【云客CRM - 私有部署授权信息】

🔑 授权码：${loginInfo.licenseKey}
👤 管理员账号：${loginInfo.username}
🔐 初始密码：${loginInfo.password}

💡 温馨提示：
1. 请使用授权码激活私有部署系统
2. 首次登录后请立即修改密码
3. 如有问题请联系技术支持`

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制全部信息到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 复制授权码
const copyLicenseKey = async () => {
  try {
    await navigator.clipboard.writeText(loginInfo.licenseKey)
    ElMessage.success('已复制授权码')
  } catch {
    ElMessage.error('复制失败')
  }
}

// 复制账号密码
const copyCredentials = async () => {
  const text = `账号：${loginInfo.username}\n密码：${loginInfo.password}`
  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制账号密码')
  } catch {
    ElMessage.error('复制失败')
  }
}

// === 数据获取 ===
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
    tableData.value = []
    pagination.total = 0
  } finally {
    loading.value = false
  }
}

onMounted(() => { fetchData(); fetchStats() })

const fetchStats = async () => {
  try {
    const res = await adminApi.getLicenseStats()
    if (res.success && res.data) {
      stats.total = res.data.total || 0
      stats.active = res.data.active || 0
      stats.pending = res.data.pending || 0
      stats.expired = res.data.expired || 0
      stats.revoked = res.data.revoked || 0
    }
  } catch {
    // 统计失败不影响主功能
  }
}

// === 导出 ===
const handleExport = () => {
  const params = new URLSearchParams()
  if (searchForm.keyword) params.set('keyword', searchForm.keyword)
  if (searchForm.licenseType) params.set('licenseType', searchForm.licenseType)
  if (searchForm.status) params.set('status', searchForm.status)
  const token = localStorage.getItem('admin_token')
  const url = `/api/v1/admin/export/licenses?${params.toString()}`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `私有客户列表_${new Date().toISOString().slice(0, 10)}.xlsx`
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
.text-bold { font-weight: 600; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 12px;

  .stat-card {
    border-radius: 8px; border: none; text-align: center;
    :deep(.el-card__body) { padding: 16px; }

    .stat-value { font-size: 28px; font-weight: 700; color: #303133; line-height: 1.3; }
    .stat-label { font-size: 13px; color: #909399; margin-top: 4px; }

    &.active .stat-value { color: #67c23a; }
    &.warning .stat-value { color: #e6a23c; }
    &.danger .stat-value { color: #f56c6c; }
    &.info .stat-value { color: #909399; }
  }
}

.customer-name-cell {
  display: flex;
  align-items: center;
  gap: 6px;
  .name { font-weight: 500; }
  .type-badge { flex-shrink: 0; }
}

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

.form-tip {
  margin-left: 8px;
  font-size: 12px;
  color: #909399;
}

.license-result {
  text-align: center;

  .result-desc {
    margin: 16px 0 24px;
    color: #606266;
    font-size: 14px;
  }
}

.info-box-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 24px;
  text-align: left;
}

.info-box {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 12px 16px;

  .info-label {
    font-size: 13px;
    color: #909399;
    margin-bottom: 6px;
  }

  .info-value {
    font-size: 15px;
    color: #303133;
    font-weight: 500;
    word-break: break-all;

    &.code {
      font-family: 'Courier New', monospace;
      color: #409eff;
      font-size: 14px;
    }
  }
}

.copy-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
}

.tips-box {
  background: #fff7e6;
  border: 1px solid #ffe7ba;
  border-radius: 8px;
  padding: 16px;
  text-align: left;

  .tip {
    font-size: 14px;
    font-weight: 600;
    color: #e6a23c;
    margin: 0 0 8px 0;
  }

  ul {
    margin: 0;
    padding-left: 20px;

    li {
      font-size: 13px;
      color: #606266;
      line-height: 1.8;
    }
  }
}

.license-key-box {
  display: flex; align-items: center; justify-content: center; gap: 12px;
  padding: 16px; margin: 16px 0; background: #f5f7fa; border-radius: 8px;
  .key { font-family: monospace; font-size: 18px; font-weight: bold; color: #409eff; letter-spacing: 1px; }
}

/* ====== 响应式适配 ====== */
@media screen and (max-width: 768px) {
  .stats-row {
    grid-template-columns: repeat(3, 1fr);
    .stat-card .stat-value { font-size: 22px; }
    .stat-card .stat-label { font-size: 11px; }
  }
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
