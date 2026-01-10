<template>
  <div class="page-container">
    <el-page-header @back="$router.back()">
      <template #content>
        <span class="page-title">租户客户详情</span>
      </template>
    </el-page-header>

    <el-card shadow="never" class="info-card" v-loading="loading">
      <template #header>
        <div class="card-header">
          <span>基本信息</span>
          <el-button type="primary" @click="handleEdit">编辑</el-button>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="客户名称">{{ detail.name }}</el-descriptions-item>
        <el-descriptions-item label="租户编码">{{ detail.code }}</el-descriptions-item>
        <el-descriptions-item label="联系人">{{ detail.contact || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系电话">{{ detail.phone || '-' }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ detail.email || '-' }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">{{ formatDateTime(detail.created_at) }}</el-descriptions-item>
        <el-descriptions-item label="备注" :span="3">{{ detail.remark || '-' }}</el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>
        <div class="card-header">
          <span>授权信息</span>
          <div>
            <el-button @click="handleRegenerate">重新生成授权码</el-button>
            <el-button type="warning" @click="handleRenew">续期</el-button>
            <el-button v-if="detail.license_status !== 'suspended'" type="danger" @click="handleSuspend">暂停</el-button>
            <el-button v-else type="success" @click="handleResume">恢复</el-button>
          </div>
        </div>
      </template>
      <el-descriptions :column="3" border>
        <el-descriptions-item label="授权码">
          <div class="license-key-cell">
            <code>{{ showFullKey ? detail.license_key : maskKey(detail.license_key) }}</code>
            <el-button link size="small" @click="showFullKey = !showFullKey">
              {{ showFullKey ? '隐藏' : '显示' }}
            </el-button>
            <el-button link size="small" @click="copyKey(detail.license_key)">复制</el-button>
          </div>
        </el-descriptions-item>
        <el-descriptions-item label="授权状态">
          <el-tag :type="getLicenseStatusType(detail.license_status)" size="small">
            {{ getLicenseStatusText(detail.license_status) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="套餐">
          <el-tag :type="getPackageType(detail.package_name)">{{ detail.package_name || '未设置' }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="用户数">{{ detail.user_count || 0 }} / {{ detail.max_users }}</el-descriptions-item>
        <el-descriptions-item label="到期时间">
          <span :class="{ 'text-danger': isExpired(detail.expire_date) }">
            {{ detail.expire_date || '永久' }}
          </span>
        </el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="getStatusType(detail.status)" size="small">{{ getStatusText(detail.status) }}</el-tag>
        </el-descriptions-item>
      </el-descriptions>
    </el-card>

    <el-card shadow="never" class="info-card">
      <template #header>用户列表</template>
      <el-table :data="users" stripe max-height="300">
        <el-table-column prop="username" label="用户名" width="120" />
        <el-table-column prop="name" label="姓名" width="100" />
        <el-table-column prop="phone" label="手机号" width="130" />
        <el-table-column prop="role" label="角色" width="100" />
        <el-table-column prop="lastLoginAt" label="最后登录" width="180">
          <template #default="{ row }">{{ row.lastLoginAt ? formatDateTime(row.lastLoginAt) : '-' }}</template>
        </el-table-column>
        <el-table-column prop="status" label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'active' ? 'success' : 'info'" size="small">
              {{ row.status === 'active' ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="showRenewDialog" title="租户续期" width="400px">
      <el-form label-width="100px">
        <el-form-item label="当前到期">{{ detail.expire_date || '永久' }}</el-form-item>
        <el-form-item label="新到期时间" required>
          <el-date-picker v-model="renewExpireDate" type="date" placeholder="请选择新的到期时间" style="width: 100%" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showRenewDialog = false">取消</el-button>
        <el-button type="primary" @click="confirmRenew" :loading="submitting">确定续期</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="showLicenseDialog" title="授权码已更新" width="500px">
      <el-result icon="success" title="授权码已重新生成">
        <template #sub-title>
          <div class="license-result">
            <p>请将新授权码发送给客户</p>
            <div class="license-key-box">
              <span class="key">{{ newLicenseKey }}</span>
              <el-button type="primary" size="small" @click="copyKey(newLicenseKey)">复制</el-button>
            </div>
            <p class="tip">原授权码已失效</p>
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
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import request from '@/api/request'

const route = useRoute()
const router = useRouter()
const loading = ref(false)
const submitting = ref(false)
const showFullKey = ref(false)
const showRenewDialog = ref(false)
const showLicenseDialog = ref(false)
const renewExpireDate = ref<Date | null>(null)
const newLicenseKey = ref('')

const detail = ref<any>({})
const users = ref<any[]>([])

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
const formatDateTime = (date: string) => date ? new Date(date).toLocaleString('zh-CN') : '-'

const getPackageType = (p: string): string => {
  const map: Record<string, string> = { '企业版': 'danger', '专业版': 'warning', '基础版': 'info' }
  return map[p] || 'info'
}
const getStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', expired: 'info', disabled: 'danger' }
  return map[s] || 'info'
}
const getStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '正常', expired: '已过期', disabled: '已禁用' }
  return map[s] || s
}
const getLicenseStatusType = (s: string): string => {
  const map: Record<string, string> = { active: 'success', pending: 'warning', expired: 'info', suspended: 'danger' }
  return map[s] || 'info'
}
const getLicenseStatusText = (s: string): string => {
  const map: Record<string, string> = { active: '已激活', pending: '待激活', expired: '已过期', suspended: '已暂停' }
  return map[s] || s
}

const handleEdit = () => {
  ElMessage.info('请在列表页面进行编辑')
  router.push('/tenant-customers/list')
}

const handleRegenerate = async () => {
  try {
    await ElMessageBox.confirm('重新生成授权码后，原授权码将失效。确定继续？', '重新生成授权码', { type: 'warning' })
    const res = await request.post(`/admin/tenants/${route.params.id}/regenerate-license`)
    if (res.success) {
      newLicenseKey.value = res.data.licenseKey
      showLicenseDialog.value = true
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const handleRenew = () => {
  renewExpireDate.value = null
  showRenewDialog.value = true
}

const confirmRenew = async () => {
  if (!renewExpireDate.value) {
    ElMessage.warning('请选择新的到期时间')
    return
  }
  submitting.value = true
  try {
    const res = await request.post(`/admin/tenants/${route.params.id}/renew`, {
      expireDate: renewExpireDate.value.toISOString().split('T')[0]
    })
    if (res.success) {
      ElMessage.success('续期成功')
      showRenewDialog.value = false
      fetchDetail()
    }
  } finally {
    submitting.value = false
  }
}

const handleSuspend = async () => {
  try {
    await ElMessageBox.confirm('暂停授权后，该客户下所有用户将无法登录。确定继续？', '暂停授权', { type: 'warning' })
    const res = await request.post(`/admin/tenants/${route.params.id}/suspend`)
    if (res.success) {
      ElMessage.success('已暂停授权')
      fetchDetail()
    }
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e.message || '操作失败')
  }
}

const handleResume = async () => {
  const res = await request.post(`/admin/tenants/${route.params.id}/resume`)
  if (res.success) {
    ElMessage.success('已恢复授权')
    fetchDetail()
  }
}

const fetchDetail = async () => {
  loading.value = true
  try {
    const res = await request.get(`/admin/tenants/${route.params.id}`)
    if (res.success) {
      detail.value = res.data
      users.value = res.data.users || []
    }
  } catch {
    detail.value = {
      id: route.params.id,
      name: '深圳电商公司',
      code: 'SZDS',
      contact: '陈总',
      phone: '13600136001',
      email: 'chen@example.com',
      license_key: 'TENANT-A1B2-C3D4-E5F6-G7H8',
      license_status: 'active',
      package_name: '企业版',
      user_count: 45,
      max_users: 100,
      expire_date: '2026-12-31',
      status: 'active',
      created_at: '2025-01-10T09:00:00',
      remark: '重要客户'
    }
    users.value = [
      { username: 'admin', name: '管理员', phone: '13600136001', role: '超级管理员', lastLoginAt: '2026-01-05T10:30:00', status: 'active' },
      { username: 'user1', name: '张三', phone: '13600136002', role: '销售', lastLoginAt: '2026-01-04T15:20:00', status: 'active' }
    ]
  } finally {
    loading.value = false
  }
}

onMounted(() => fetchDetail())
</script>

<style scoped lang="scss">
.page-container { display: flex; flex-direction: column; gap: 16px; }
.page-title { font-size: 18px; font-weight: 600; }
.info-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.text-danger { color: #f56c6c; }

.license-key-cell {
  display: flex;
  align-items: center;
  gap: 8px;
  code {
    font-family: 'Monaco', 'Menlo', monospace;
    font-size: 13px;
    background: #f5f7fa;
    padding: 4px 8px;
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
