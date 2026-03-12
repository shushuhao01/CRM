<template>
  <div class="page-container">
    <!-- 搜索区域 -->
    <el-card shadow="never" class="search-card">
      <el-form :model="searchForm" inline>
        <el-form-item label="操作人">
          <el-input v-model="searchForm.adminName" placeholder="管理员名称" clearable style="width: 140px" />
        </el-form-item>
        <el-form-item label="模块">
          <el-select v-model="searchForm.module" placeholder="全部" clearable style="width: 140px">
            <el-option label="授权管理" value="licenses" />
            <el-option label="租户管理" value="tenants" />
            <el-option label="支付管理" value="payment" />
            <el-option label="版本管理" value="versions" />
            <el-option label="模块管理" value="modules" />
            <el-option label="管理员" value="admin_users" />
            <el-option label="系统设置" value="system_settings" />
          </el-select>
        </el-form-item>
        <el-form-item label="操作">
          <el-select v-model="searchForm.action" placeholder="全部" clearable style="width: 120px">
            <el-option label="创建" value="create" />
            <el-option label="更新" value="update" />
            <el-option label="删除" value="delete" />
            <el-option label="启用" value="enable" />
            <el-option label="禁用" value="disable" />
            <el-option label="登录" value="login" />
          </el-select>
        </el-form-item>
        <el-form-item label="时间">
          <el-date-picker v-model="searchForm.dateRange" type="daterange"
            start-placeholder="开始" end-placeholder="结束"
            value-format="YYYY-MM-DD" style="width: 240px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch"><el-icon><Search /></el-icon>搜索</el-button>
          <el-button @click="handleReset">重置</el-button>
          <el-button @click="handleExport"><el-icon><Download /></el-icon>导出</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stat-row">
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon blue"><el-icon><Notebook /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.todayCount }}</div>
            <div class="stat-label">今日操作</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon green"><el-icon><User /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.byAdmin?.length || 0 }}</div>
            <div class="stat-label">活跃管理员</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon orange"><el-icon><Menu /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ statistics.byModule?.length || 0 }}</div>
            <div class="stat-label">涉及模块</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="12" :sm="6">
        <div class="stat-card">
          <div class="stat-icon purple"><el-icon><Operation /></el-icon></div>
          <div class="stat-content">
            <div class="stat-value">{{ pagination.total }}</div>
            <div class="stat-label">总记录数</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 日志列表 -->
    <el-card shadow="never" class="table-card">
      <template #header>
        <div class="card-header">
          <span>操作日志</span>
        </div>
      </template>

      <el-table :data="tableData" v-loading="loading" stripe>
        <el-table-column prop="admin_name" label="操作人" width="100" />
        <el-table-column prop="module" label="模块" width="110">
          <template #default="{ row }">
            <el-tag size="small" :type="getModuleTagType(row.module)">
              {{ getModuleLabel(row.module) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="action" label="操作" width="100">
          <template #default="{ row }">
            <el-tag size="small" :type="getActionTagType(row.action)" effect="plain">
              {{ getActionLabel(row.action) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="target_type" label="对象类型" width="110">
          <template #default="{ row }">
            {{ getTargetTypeLabel(row.target_type) }}
          </template>
        </el-table-column>
        <el-table-column prop="detail" label="操作详情" min-width="250" show-overflow-tooltip />
        <el-table-column prop="ip" label="IP地址" width="140" />
        <el-table-column prop="created_at" label="操作时间" width="180">
          <template #default="{ row }">
            {{ formatDateTime(row.created_at) }}
          </template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Search, Download, Notebook, User, Menu, Operation } from '@element-plus/icons-vue'
import request from '@/api/request'

const loading = ref(false)
const tableData = ref<any[]>([])
const statistics = ref<any>({ todayCount: 0, byModule: [], byAction: [], byAdmin: [] })

const searchForm = reactive({
  adminName: '',
  module: '',
  action: '',
  dateRange: null as string[] | null
})

const pagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})

// 模块名称映射
const moduleMap: Record<string, string> = {
  licenses: '授权管理',
  tenants: '租户管理',
  payment: '支付管理',
  versions: '版本管理',
  modules: '模块管理',
  admin_users: '管理员',
  system_settings: '系统设置',
  api_configs: '接口管理',
  packages: '套餐管理'
}

const actionMap: Record<string, string> = {
  create: '创建',
  update: '更新',
  delete: '删除',
  enable: '启用',
  disable: '禁用',
  lock: '锁定',
  unlock: '解锁',
  login: '登录',
  logout: '登出',
  reset_password: '重置密码',
  update_settings: '更新设置',
  publish: '发布',
  revoke: '吊销',
  renew: '续期'
}

const targetTypeMap: Record<string, string> = {
  license: '授权',
  tenant: '租户',
  admin_user: '管理员',
  version: '版本',
  module: '模块',
  payment_order: '支付订单',
  api_config: '接口配置',
  package: '套餐'
}

const getModuleLabel = (key: string) => moduleMap[key] || key
const getActionLabel = (key: string) => actionMap[key] || key
const getTargetTypeLabel = (key: string) => targetTypeMap[key] || key || '-'

const getModuleTagType = (module: string): string => {
  const map: Record<string, string> = {
    licenses: '', tenants: 'success', payment: 'warning',
    versions: 'info', admin_users: 'danger', system_settings: 'info'
  }
  return map[module] || ''
}

const getActionTagType = (action: string): string => {
  const map: Record<string, string> = {
    create: 'success', update: 'warning', delete: 'danger',
    enable: 'success', disable: 'danger', lock: 'danger', unlock: 'success'
  }
  return map[action] || 'info'
}

const formatDateTime = (date: string) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

const fetchData = async () => {
  loading.value = true
  try {
    const params: any = {
      page: pagination.page,
      pageSize: pagination.pageSize
    }
    if (searchForm.adminName) params.adminName = searchForm.adminName
    if (searchForm.module) params.module = searchForm.module
    if (searchForm.action) params.action = searchForm.action
    if (searchForm.dateRange?.[0]) params.startDate = searchForm.dateRange[0]
    if (searchForm.dateRange?.[1]) params.endDate = searchForm.dateRange[1]

    const res = await request.get('/operation-logs', { params }) as any
    if (res.success) {
      tableData.value = res.data.list || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取操作日志失败:', error)
  } finally {
    loading.value = false
  }
}

const fetchStatistics = async () => {
  try {
    const res = await request.get('/operation-logs/statistics') as any
    if (res.success) {
      statistics.value = res.data
    }
  } catch (error) {
    console.error('获取统计失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  fetchData()
}

const handleReset = () => {
  searchForm.adminName = ''
  searchForm.module = ''
  searchForm.action = ''
  searchForm.dateRange = null
  handleSearch()
}

const handleExport = () => {
  const params = new URLSearchParams()
  if (searchForm.module) params.set('module', searchForm.module)
  if (searchForm.action) params.set('action', searchForm.action)
  if (searchForm.dateRange?.[0]) params.set('startDate', searchForm.dateRange[0])
  if (searchForm.dateRange?.[1]) params.set('endDate', searchForm.dateRange[1])

  const token = localStorage.getItem('admin_token')
  const url = `/api/v1/admin/export/operation-logs?${params.toString()}`
  fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    .then(res => res.blob())
    .then(blob => {
      const a = document.createElement('a')
      a.href = URL.createObjectURL(blob)
      a.download = `操作日志_${new Date().toISOString().slice(0, 10)}.xlsx`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(a.href)
      ElMessage.success('导出成功')
    })
    .catch(() => ElMessage.error('导出失败'))
}

onMounted(() => {
  fetchData()
  fetchStatistics()
})
</script>

<style scoped lang="scss">
.page-container {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
}

.stat-row {
  margin-bottom: 16px;

  .el-col {
    margin-bottom: 8px;
  }
}

.stat-card {
  background: #fff;
  border-radius: 8px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  border: 1px solid #e4e7ed;

  .stat-icon {
    width: 44px;
    height: 44px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 20px;

    &.blue { background: linear-gradient(135deg, #409eff, #79bbff); }
    &.green { background: linear-gradient(135deg, #67c23a, #95d475); }
    &.orange { background: linear-gradient(135deg, #e6a23c, #f3d19e); }
    &.purple { background: linear-gradient(135deg, #9c27b0, #ce93d8); }
  }

  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: #303133;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 2px;
  }
}

.table-card {
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-weight: 600;
  }
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
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

      .el-input, .el-select, .el-date-editor {
        width: 100% !important;
      }
    }
  }

  .stat-card {
    padding: 12px 16px;

    .stat-icon {
      width: 36px;
      height: 36px;
    }

    .stat-value {
      font-size: 18px;
    }
  }

  .table-card {
    .card-header {
      flex-direction: column;
      gap: 8px;
      align-items: flex-start;
    }

    :deep(.el-table) {
      overflow-x: auto;
    }
  }
}
</style>
