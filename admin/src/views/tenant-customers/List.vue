<template>
  <div class="page-container">
    <!-- 统计概览 -->
    <div class="stats-row">
      <el-card shadow="never" class="stat-card">
        <div class="stat-value">{{ stats.total }}</div>
        <div class="stat-label">租户总数</div>
      </el-card>
      <el-card shadow="never" class="stat-card active">
        <div class="stat-value">{{ stats.active }}</div>
        <div class="stat-label">正常运行</div>
      </el-card>
      <el-card shadow="never" class="stat-card unpaid" @click="filterByLicenseStatus('pending')" style="cursor: pointer">
        <div class="stat-value">{{ stats.unpaid }}</div>
        <div class="stat-label">未支付</div>
      </el-card>
      <el-card shadow="never" class="stat-card warning">
        <div class="stat-value">{{ stats.expiringSoon }}</div>
        <div class="stat-label">即将到期(30天内)</div>
      </el-card>
      <el-card shadow="never" class="stat-card danger">
        <div class="stat-value">{{ stats.expired }}</div>
        <div class="stat-label">已过期</div>
      </el-card>
      <el-card shadow="never" class="stat-card info">
        <div class="stat-value">{{ stats.disabled }}</div>
        <div class="stat-label">已禁用</div>
      </el-card>
    </div>

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
        <el-form-item label="授权">
          <el-select v-model="searchForm.licenseStatus" placeholder="全部" clearable style="width: 110px">
            <el-option label="已激活" value="active" />
            <el-option label="未支付" value="pending" />
            <el-option label="已付款待激活" value="paid" />
            <el-option label="已过期" value="expired" />
            <el-option label="已暂停" value="suspended" />
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
        <el-table-column prop="name" label="客户名称" min-width="160" show-overflow-tooltip>
          <template #default="{ row }">
            <span>{{ row.name }}</span>
            <el-tag v-if="row.subscription_status === 'active'" type="success" size="small" effect="light" style="margin-left: 6px;">订阅</el-tag>
            <el-tag v-else-if="row.subscription_status === 'signing'" type="warning" size="small" effect="light" style="margin-left: 6px;">签约中</el-tag>
            <el-tag v-else-if="row.subscription_status === 'paused'" type="danger" size="small" effect="light" style="margin-left: 6px;">订阅暂停</el-tag>
            <el-tag v-else size="small" effect="light" style="margin-left: 6px;" color="#ecf5ff">自付</el-tag>
          </template>
        </el-table-column>
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
                    <el-dropdown-item command="unlock">
                      <el-icon><Unlock /></el-icon>解锁账号
                    </el-dropdown-item>
                    <el-dropdown-item command="resetPassword">
                      <el-icon><Key /></el-icon>重置密码
                    </el-dropdown-item>
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
    <el-dialog v-model="showLicenseDialog" title="租户创建成功" width="600px">
      <el-result icon="success" title="租户创建成功">
        <template #sub-title>
          <div class="license-result">
            <p class="result-desc">请将以下完整信息发送给客户，用于登录 SaaS 系统</p>

            <div class="info-box-group">
              <div class="info-box">
                <div class="info-label">🌐 登录地址</div>
                <div class="info-value">{{ loginInfo.loginUrl }}</div>
              </div>

              <div class="info-box">
                <div class="info-label">🏢 租户编码</div>
                <div class="info-value code">{{ loginInfo.tenantCode }}</div>
              </div>

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
              <el-button @click="copyLoginUrl" plain>复制登录地址</el-button>
              <el-button @click="copyCredentials" plain>复制账号密码</el-button>
            </div>

            <div class="tips-box">
              <p class="tip">💡 提示：</p>
              <ul>
                <li>授权码是租户登录的唯一凭证，请妥善保管</li>
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

    <!-- 重置密码成功对话框 -->
    <el-dialog v-model="showResetPwdDialog" title="密码重置成功" width="520px">
      <el-result icon="success" title="管理员密码已重置">
        <template #sub-title>
          <div class="license-result">
            <p class="result-desc">请将新密码发送给客户管理员，首次登录后请立即修改密码</p>
            <div class="info-box-group">
              <div class="info-box">
                <div class="info-label">🏢 租户名称</div>
                <div class="info-value">{{ resetPwdInfo.tenantName }}</div>
              </div>
              <div class="info-box">
                <div class="info-label">👤 管理员账号</div>
                <div class="info-value code">{{ resetPwdInfo.usernames }}</div>
              </div>
              <div class="info-box">
                <div class="info-label">🔐 新密码（临时）</div>
                <div class="info-value code" style="color: #e6a23c; font-size: 16px; font-weight: 700;">{{ resetPwdInfo.tempPassword }}</div>
              </div>
            </div>
            <div class="copy-actions">
              <el-button type="primary" @click="copyResetPwdInfo" size="large">
                <el-icon><CopyDocument /></el-icon>
                一键复制账号密码
              </el-button>
            </div>
            <div class="tips-box">
              <p class="tip">⚠️ 安全提示：</p>
              <ul>
                <li>此密码为临时密码，请通知客户登录后立即修改</li>
                <li>重置密码后原密码立即失效</li>
                <li>如账号被锁定，重置密码会同时解锁账号</li>
              </ul>
            </div>
          </div>
        </template>
      </el-result>
      <template #footer>
        <el-button @click="showResetPwdDialog = false">关闭</el-button>
        <el-button type="primary" @click="copyResetPwdInfo">复制并关闭</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Search, Plus, ArrowDown, Download, View, Hide,
  CopyDocument, Clock, RefreshRight, Delete, Unlock, Key
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import request from '@/api/request'
import { adminApi } from '@/api/admin'

const loading = ref(false)
const submitting = ref(false)
const showDialog = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const showResetPwdDialog = ref(false)
const editingId = ref<string | null>(null)
const formRef = ref<FormInstance>()
const page = ref(1)
const pageSize = ref(10)
const total = ref(0)
const newLicenseKey = ref('')
const newLicenseTitle = ref('租户客户创建成功')
const renewingTenant = ref<any>(null)
const renewMonths = ref<number>(12)

// 登录信息对象
const loginInfo = reactive({
  loginUrl: '',
  tenantCode: '',
  licenseKey: '',
  username: '',
  password: ''
})

// 重置密码信息对象
const resetPwdInfo = reactive({
  tenantName: '',
  usernames: '',
  tempPassword: ''
})

const stats = reactive({ total: 0, active: 0, expired: 0, disabled: 0, expiringSoon: 0, unpaid: 0 })

const searchForm = reactive({ keyword: '', packageId: '', status: '', licenseStatus: '' })
const form = reactive({
  name: '', code: '', contact: '', phone: '', email: '',
  packageId: '', maxUsers: 10, maxStorageGb: 5, expireDate: null as Date | null, features: [] as string[], remark: ''
})
const rules: FormRules = {
  name: [{ required: true, message: '请输入客户名称', trigger: 'blur' }],
  contact: [{ required: true, message: '请输入联系人', trigger: 'blur' }],
  phone: [
    { required: true, message: '请输入联系电话', trigger: 'blur' },
    { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号格式', trigger: 'blur' }
  ],
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
  const map: Record<string, string> = { active: 'success', pending: 'warning', paid: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}
const getLicenseStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '已激活', pending: '未支付', paid: '已付款待激活', expired: '已过期', suspended: '已暂停' }
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
const handleReset = () => { Object.assign(searchForm, { keyword: '', packageId: '', status: '', licenseStatus: '' }); handleSearch() }

// 点击统计卡片快速筛选
const filterByLicenseStatus = (ls: string) => {
  searchForm.licenseStatus = ls
  handleSearch()
}

// === 新增/编辑 ===

const onPackageChange = (pkgId: string | number) => {
  const pkg = packages.value.find((p: any) => p.id === pkgId || String(p.id) === String(pkgId))
  if (pkg) {
    form.maxUsers = pkg.max_users ?? pkg.maxUsers ?? 10
    form.maxStorageGb = pkg.max_storage_gb ?? pkg.maxStorageGb ?? 5
    // 🔥 同步套餐的功能模块：优先使用 modules（模块ID列表），其次 features
    form.features = Array.isArray(pkg.modules) && pkg.modules.length > 0
      ? [...pkg.modules]
      : (Array.isArray(pkg.features) ? [...pkg.features] : [])
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
      // 年付加上赠送月数
      const bonusMonths = Number(pkg.yearly_bonus_months) || 0
      const totalMonths = 12 + bonusMonths
      expire.setMonth(expire.getMonth() + totalMonths)
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
  try {
    await formRef.value?.validate()
  } catch {
    ElMessage.warning('请填写完整的必填信息')
    return
  }
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
        // 保存完整登录信息
        Object.assign(loginInfo, {
          loginUrl: res.data.loginUrl || 'https://app.yunke-crm.com',
          tenantCode: res.data.tenantCode || '',
          licenseKey: res.data.licenseKey || '',
          username: res.data.adminAccount?.username || '',
          password: res.data.adminAccount?.password || ''
        })
        newLicenseKey.value = res.data.licenseKey
        newLicenseTitle.value = '租户客户创建成功'
        showDialog.value = false
        showLicenseDialog.value = true
        fetchData()
      }
    }
  } catch (e: any) {
    console.error('[TenantCustomer] 保存失败:', e)
    // 拦截器已展示错误提示，这里不再重复
  } finally {
    submitting.value = false
  }
}

// 复制全部信息
const copyAllInfo = async () => {
  const text = `【云客CRM - 租户登录信息】

🌐 登录地址：${loginInfo.loginUrl}
🏢 租户编码：${loginInfo.tenantCode}
🔑 授权码：${loginInfo.licenseKey}
👤 管理员账号：${loginInfo.username}
🔐 初始密码：${loginInfo.password}

💡 温馨提示：
1. 请使用授权码登录系统
2. 首次登录后请立即修改密码
3. 如有问题请联系技术支持`

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制全部信息到剪贴板')
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

// 复制登录地址
const copyLoginUrl = async () => {
  try {
    await navigator.clipboard.writeText(loginInfo.loginUrl)
    ElMessage.success('已复制登录地址')
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

// 复制重置密码信息
const copyResetPwdInfo = async () => {
  const text = `【云客CRM - 密码重置通知】

租户名称：${resetPwdInfo.tenantName}
管理员账号：${resetPwdInfo.usernames}
新密码（临时）：${resetPwdInfo.tempPassword}

⚠️ 请登录后立即修改密码！
如有问题请联系技术支持。`

  try {
    await navigator.clipboard.writeText(text)
    ElMessage.success('已复制密码重置信息到剪贴板')
    showResetPwdDialog.value = false
  } catch {
    ElMessage.error('复制失败，请手动复制')
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
    const newStatus = isActive ? 'disabled' : 'active'
    const res = await request.put(`/tenants/${row.id}`, { status: newStatus })
    if (res.success) {
      ElMessage.success(`已${action}`)
      fetchData()
      fetchStats()
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
    case 'unlock':
      try {
        await ElMessageBox.confirm(
          `确定要解锁 "${row.name}" 的管理员账号吗？这将重置登录失败次数并解除账号锁定。`,
          '解锁账号', { type: 'info', confirmButtonText: '确定解锁', cancelButtonText: '取消' }
        )
        const res = await request.post(`/tenants/${row.id}/unlock-admin`)
        if (res.success) {
          ElMessage.success(res.message || '解锁成功')
          fetchData()
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '解锁失败')
      }
      break
    case 'resetPassword':
      try {
        await ElMessageBox.confirm(
          `确定要重置 "${row.name}" 的管理员密码吗？\n\n重置后将生成新的临时密码，原密码立即失效。如账号被锁定，也会同时解锁。`,
          '重置管理员密码',
          { type: 'warning', confirmButtonText: '确定重置', cancelButtonText: '取消' }
        )
        const res = await adminApi.resetTenantCustomerPassword(row.id)
        if (res.success && res.data) {
          Object.assign(resetPwdInfo, {
            tenantName: res.data.tenantName || row.name || '',
            usernames: res.data.usernames || '',
            tempPassword: res.data.tempPassword || ''
          })
          showResetPwdDialog.value = true
        }
      } catch (e: any) {
        if (e !== 'cancel') ElMessage.error(e.message || '重置密码失败')
      }
      break
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
      ElMessageBox.confirm(
        `确定要删除租户 "${row.name}" 吗？删除后将移入回收站，可在系统设置的回收站中恢复。`,
        '删除客户', { type: 'warning', confirmButtonText: '确定删除', confirmButtonClass: 'el-button--danger' }
      )
        .then(async () => {
          const res = await request.delete(`/tenants/${row.id}`)
          if (res.success) { ElMessage.success('已移入回收站'); fetchData(); fetchStats() }
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
        userCount: Number(item.userCount ?? item.user_count ?? 0),
        maxUsers: Number(item.maxUsers ?? item.max_users ?? 0),
        maxStorageGb: Number(item.maxStorageGb ?? item.max_storage_gb ?? 0),
        usedStorageMb: Number(item.usedStorageMb ?? item.used_storage_mb ?? 0),
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
    const res = await request.get('/packages', { params: { type: 'saas' } })
    if (res.success) packages.value = res.data.list || res.data || []
  } catch {
    packages.value = []
  }
}

const fetchStats = async () => {
  try {
    const res = await request.get('/tenants', { params: { page: 1, pageSize: 1 } })
    if (res.success) stats.total = res.data.total || 0

    // 分别统计各状态
    const [activeRes, disabledRes, unpaidRes] = await Promise.all([
      request.get('/tenants', { params: { page: 1, pageSize: 1, status: 'active' } }),
      request.get('/tenants', { params: { page: 1, pageSize: 1, status: 'disabled' } }),
      request.get('/tenants', { params: { page: 1, pageSize: 1, licenseStatus: 'pending' } })
    ])
    stats.active = activeRes.success ? (activeRes.data.total || 0) : 0
    stats.disabled = disabledRes.success ? (disabledRes.data.total || 0) : 0
    stats.unpaid = unpaidRes.success ? (unpaidRes.data.total || 0) : 0
    stats.expired = Math.max(0, stats.total - stats.active - stats.disabled)

    // 即将到期统计（30天内）：从列表数据判断
    const allRes = await request.get('/tenants', { params: { page: 1, pageSize: 200, status: 'active' } })
    if (allRes.success) {
      const now = new Date()
      const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)
      stats.expiringSoon = (allRes.data.list || []).filter((t: any) => {
        const exp = t.expire_date || t.expireDate
        if (!exp) return false
        const d = new Date(exp)
        return d > now && d <= thirtyDaysLater
      }).length
    }
  } catch {
    // 统计失败不影响主功能
  }
}

onMounted(() => { fetchData(); fetchPackages(); fetchStats() })

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

.stats-row {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 12px;

  .stat-card {
    border-radius: 8px;
    border: none;
    text-align: center;
    :deep(.el-card__body) { padding: 16px; }

    .stat-value {
      font-size: 28px;
      font-weight: 700;
      color: #303133;
      line-height: 1.3;
    }
    .stat-label {
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }

    &.active .stat-value { color: #67c23a; }
    &.unpaid .stat-value { color: #f59e0b; }
    &.warning .stat-value { color: #e6a23c; }
    &.danger .stat-value { color: #f56c6c; }
    &.info .stat-value { color: #909399; }
  }
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
