<template>
  <el-dialog
    v-model="visible"
    :title="`角色「${roleName}」的权限列表`"
    width="1200px"
    @close="handleClose"
  >
    <div class="permission-list-content">
      <!-- 权限统计卡片 -->
      <el-row :gutter="20" class="stats-row">
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon primary"><Lock /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ permissionStats.total }}</div>
                <div class="stat-mini-label">总权限数</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon success"><Menu /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ permissionStats.menu }}</div>
                <div class="stat-mini-label">菜单权限</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon warning"><Operation /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ permissionStats.action }}</div>
                <div class="stat-mini-label">操作权限</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card shadow="hover" class="stat-card-mini">
            <div class="stat-mini-content">
              <el-icon class="stat-mini-icon info"><Grid /></el-icon>
              <div class="stat-mini-info">
                <div class="stat-mini-value">{{ permissionStats.modules }}</div>
                <div class="stat-mini-label">功能模块</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>

      <!-- 搜索和筛选 -->
      <div class="list-header">
        <el-row :gutter="20">
          <el-col :span="8">
            <el-input v-model="searchKeyword" placeholder="搜索权限名称、编码或描述" clearable @input="handleSearch">
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </el-col>
          <el-col :span="6">
            <el-select v-model="typeFilter" placeholder="类型筛选" clearable @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option label="菜单" value="menu" />
              <el-option label="操作" value="action" />
            </el-select>
          </el-col>
          <el-col :span="6">
            <el-select v-model="moduleFilter" placeholder="模块筛选" clearable @change="handleSearch">
              <el-option label="全部" value="" />
              <el-option v-for="m in moduleList" :key="m" :label="m" :value="m" />
            </el-select>
          </el-col>
          <el-col :span="4">
            <el-button type="primary" @click="handleExport" style="width: 100%">
              <el-icon><Download /></el-icon> 导出
            </el-button>
          </el-col>
        </el-row>
      </div>

      <!-- 权限表格 -->
      <el-table :data="paginatedPermissions" style="width: 100%; margin-top: 20px" v-loading="loading" stripe>
        <el-table-column prop="name" label="权限名称" width="200" />
        <el-table-column prop="code" label="权限编码" width="250" show-overflow-tooltip />
        <el-table-column label="类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.type === 'menu' ? 'success' : 'warning'" size="small">
              {{ row.type === 'menu' ? '菜单' : '操作' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="module" label="所属模块" width="150" />
        <el-table-column prop="description" label="描述" show-overflow-tooltip />
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" link @click="handleViewDetail(row)">详情</el-button>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="pagination-container" v-if="filteredPermissions.length > 0">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[20, 50, 100]"
          :total="filteredPermissions.length"
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
import { Lock, Menu, Operation, Grid, Search, Download } from '@element-plus/icons-vue'
// @ts-ignore
import permissionService from '@/services/permissionService'

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
const allPermissions = ref<any[]>([])
const filteredPermissions = ref<any[]>([])
const searchKeyword = ref('')
const typeFilter = ref('')
const moduleFilter = ref('')
const moduleList = ref<string[]>([])
const pagination = reactive({ page: 1, size: 20 })

const permissionStats = computed(() => {
  const perms = allPermissions.value
  return {
    total: perms.length,
    menu: perms.filter((p: any) => p.type === 'menu').length,
    action: perms.filter((p: any) => p.type === 'action').length,
    modules: new Set(perms.map((p: any) => p.module)).size
  }
})

const paginatedPermissions = computed(() => {
  const start = (pagination.page - 1) * pagination.size
  return filteredPermissions.value.slice(start, start + pagination.size)
})

watch(() => props.modelValue, async (val) => {
  visible.value = val
  if (val && props.role) await loadPermissions()
})

watch(visible, (val) => {
  if (!val) emit('update:modelValue', false)
})

const loadPermissions = async () => {
  loading.value = true
  searchKeyword.value = ''
  typeFilter.value = ''
  moduleFilter.value = ''
  pagination.page = 1

  try {
    const rolePermIds = props.role.permissions || []
    const allPerms = permissionService.getAllPermissions()

    const findPermission = (permissions: any[], targetId: string, parentModule = ''): any => {
      for (const perm of permissions) {
        const currentModule = parentModule || perm.name
        if (perm.id === targetId) return { ...perm, module: currentModule }
        if (perm.children?.length) {
          const found = findPermission(perm.children, targetId, currentModule)
          if (found) return found
        }
      }
      return null
    }

    const details: any[] = []
    rolePermIds.forEach((permId: string) => {
      const perm = findPermission(allPerms, permId)
      if (perm) {
        details.push({
          id: perm.id, name: perm.name, code: perm.code || perm.id,
          type: perm.type || 'menu', module: perm.module || '系统',
          description: perm.description || perm.name, path: perm.path || ''
        })
      }
    })

    allPermissions.value = details
    filteredPermissions.value = details
    moduleList.value = Array.from(new Set(details.map((p: any) => p.module)))

    if (details.length > 0) ElMessage.success(`成功加载 ${details.length} 个权限`)
    else ElMessage.info('该角色暂无权限')
  } catch (error) {
    console.error('获取角色权限失败:', error)
    ElMessage.error('获取权限列表失败')
    allPermissions.value = []
    filteredPermissions.value = []
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  let filtered = allPermissions.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    filtered = filtered.filter((p: any) =>
      p.name.toLowerCase().includes(kw) || p.code.toLowerCase().includes(kw) || p.description.toLowerCase().includes(kw)
    )
  }
  if (typeFilter.value) filtered = filtered.filter((p: any) => p.type === typeFilter.value)
  if (moduleFilter.value) filtered = filtered.filter((p: any) => p.module === moduleFilter.value)
  filteredPermissions.value = filtered
  pagination.page = 1
}

const handleExport = () => {
  try {
    if (filteredPermissions.value.length === 0) { ElMessage.warning('没有可导出的权限数据'); return }
    const exportData = filteredPermissions.value.map((p: any) => ({
      '权限名称': p.name, '权限编码': p.code,
      '类型': p.type === 'menu' ? '菜单' : '操作',
      '所属模块': p.module, '描述': p.description
    }))
    const headers = Object.keys(exportData[0])
    const csv = [headers.join(','), ...exportData.map((row: any) => headers.map(h => `"${row[h]}"`).join(','))].join('\n')
    const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.setAttribute('href', URL.createObjectURL(blob))
    link.setAttribute('download', `${roleName.value}_权限列表_${new Date().toLocaleDateString()}.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    ElMessage.success('权限列表导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  }
}

const handleViewDetail = (permission: any) => {
  ElMessageBox.alert(
    `<div style="line-height: 2;">
      <p><strong>权限名称：</strong>${permission.name}</p>
      <p><strong>权限编码：</strong>${permission.code}</p>
      <p><strong>类型：</strong>${permission.type === 'menu' ? '菜单' : '操作'}</p>
      <p><strong>所属模块：</strong>${permission.module}</p>
      <p><strong>描述：</strong>${permission.description}</p>
      ${permission.path ? `<p><strong>路径：</strong>${permission.path}</p>` : ''}
    </div>`,
    '权限详情',
    { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' }
  )
}

const handleClose = () => {
  visible.value = false
  searchKeyword.value = ''
  typeFilter.value = ''
  moduleFilter.value = ''
  allPermissions.value = []
  filteredPermissions.value = []
  pagination.page = 1
}
</script>

<style scoped>
.permission-list-content { padding: 0; }
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


