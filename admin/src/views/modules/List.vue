<template>
  <div class="page-container">
    <el-card shadow="never" class="header-card">
      <div class="page-header">
        <div class="header-info">
          <h2 class="page-title">模块服务管理</h2>
          <p class="page-desc">全局控制 CRM 系统各模块的启用/停用状态，作为紧急下线开关使用</p>
        </div>
        <el-button type="primary" :loading="refreshing" @click="fetchModules">
          <el-icon><Refresh /></el-icon>刷新状态
        </el-button>
      </div>
    </el-card>

    <el-alert type="warning" :closable="false" class="warning-alert">
      <template #title>
        <strong>注意：</strong>停用模块后，所有 CRM 用户将无法访问该模块，此操作不影响角色权限配置。适用于紧急下线、功能维护等场景。
      </template>
    </el-alert>

    <div class="modules-grid" v-loading="loading">
      <div
        v-for="mod in modules"
        :key="mod.module_key"
        class="module-card"
        :class="{ 'disabled': !mod.is_enabled }"
      >
        <div class="card-header">
          <div class="module-icon" :style="{ background: getModuleColor(mod.module_key) }">
            <el-icon :size="24"><component :is="mod.icon || 'Box'" /></el-icon>
          </div>
          <div class="module-info">
            <h3 class="module-name">{{ mod.module_name }}</h3>
            <p class="module-desc">{{ mod.description }}</p>
          </div>
        </div>

        <div class="card-body">
          <div class="status-row">
            <span class="status-label">当前状态</span>
            <el-tag :type="mod.is_enabled ? 'success' : 'danger'" size="small">
              {{ mod.is_enabled ? '已启用' : '已停用' }}
            </el-tag>
          </div>

          <div v-if="!mod.is_enabled && mod.disabled_reason" class="reason-row">
            <span class="reason-label">停用原因：</span>
            <span class="reason-text">{{ mod.disabled_reason }}</span>
          </div>

          <div v-if="mod.disabled_at" class="time-row">
            <span class="time-label">停用时间：</span>
            <span class="time-text">{{ formatTime(mod.disabled_at) }}</span>
          </div>
        </div>

        <div class="card-footer">
          <el-switch
            :model-value="mod.is_enabled"
            :loading="mod.loading"
            :disabled="isProtectedModule(mod.module_key)"
            @change="(val: boolean) => handleToggle(mod, val)"
          />
          <span v-if="isProtectedModule(mod.module_key)" class="protected-tip">
            <el-icon><Lock /></el-icon>核心模块
          </span>
        </div>
      </div>
    </div>

    <!-- 停用确认弹窗 -->
    <el-dialog v-model="showDisableDialog" title="停用模块确认" width="500px">
      <el-alert type="error" :closable="false" style="margin-bottom: 16px">
        <template #title>
          停用后，所有 CRM 用户将无法访问「{{ currentModule?.module_name }}」模块！
        </template>
      </el-alert>

      <el-form label-width="80px">
        <el-form-item label="停用原因">
          <el-input
            v-model="disableReason"
            type="textarea"
            :rows="3"
            placeholder="请输入停用原因（可选）"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="cancelDisable">取消</el-button>
        <el-button type="danger" :loading="submitting" @click="confirmDisable">
          确认停用
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Lock } from '@element-plus/icons-vue'
import request from '../../api/request'

interface ModuleItem {
  id: number
  module_key: string
  module_name: string
  description: string
  icon: string
  is_enabled: boolean
  disabled_reason: string | null
  disabled_at: string | null
  disabled_by: string | null
  sort_order: number
  loading?: boolean
}

const loading = ref(false)
const refreshing = ref(false)
const submitting = ref(false)
const modules = ref<ModuleItem[]>([])
const showDisableDialog = ref(false)
const currentModule = ref<ModuleItem | null>(null)
const disableReason = ref('')

// 模块颜色映射
const moduleColors: Record<string, string> = {
  dashboard: 'linear-gradient(135deg, #409eff 0%, #79bbff 100%)',
  customer: 'linear-gradient(135deg, #67c23a 0%, #95d475 100%)',
  order: 'linear-gradient(135deg, #e6a23c 0%, #f3d19e 100%)',
  product: 'linear-gradient(135deg, #f56c6c 0%, #fab6b6 100%)',
  logistics: 'linear-gradient(135deg, #909399 0%, #c0c4cc 100%)',
  performance: 'linear-gradient(135deg, #9c27b0 0%, #ce93d8 100%)',
  service: 'linear-gradient(135deg, #00bcd4 0%, #80deea 100%)',
  finance: 'linear-gradient(135deg, #ff9800 0%, #ffcc80 100%)',
  data: 'linear-gradient(135deg, #795548 0%, #bcaaa4 100%)',
  serviceManagement: 'linear-gradient(135deg, #3f51b5 0%, #9fa8da 100%)',
  system: 'linear-gradient(135deg, #607d8b 0%, #b0bec5 100%)'
}

const getModuleColor = (key: string) => moduleColors[key] || 'linear-gradient(135deg, #909399 0%, #c0c4cc 100%)'

// 受保护的核心模块（不能停用）
const protectedModules = ['system', 'dashboard']
const isProtectedModule = (key: string) => protectedModules.includes(key)

const formatTime = (time: string | null) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN')
}

// 获取模块列表
const fetchModules = async () => {
  loading.value = true
  refreshing.value = true
  try {
    const res = await request.get('/modules') as any
    if (res.success && res.data) {
      // 转换 is_enabled 为布尔值（MySQL 返回的可能是 1/0）
      modules.value = res.data.map((m: any) => ({
        ...m,
        is_enabled: Boolean(m.is_enabled),
        loading: false
      }))
    }
  } catch (error: any) {
    console.error('获取模块列表失败:', error)
    ElMessage.error('获取模块列表失败')
  } finally {
    loading.value = false
    refreshing.value = false
  }
}

// 切换模块状态
const handleToggle = async (mod: ModuleItem, enabled: boolean) => {
  console.log('handleToggle called:', mod.module_key, enabled)

  if (enabled) {
    // 启用模块，直接调用 API
    await toggleModule(mod, true)
  } else {
    // 停用模块，显示确认弹窗
    currentModule.value = mod
    disableReason.value = ''
    showDisableDialog.value = true
  }
}

const cancelDisable = () => {
  showDisableDialog.value = false
  // 恢复开关状态
  if (currentModule.value) {
    currentModule.value.is_enabled = true
  }
  currentModule.value = null
}

const confirmDisable = async () => {
  if (!currentModule.value) return
  submitting.value = true
  try {
    await toggleModule(currentModule.value, false, disableReason.value)
    showDisableDialog.value = false
  } finally {
    submitting.value = false
  }
}

const toggleModule = async (mod: ModuleItem, enabled: boolean, reason?: string) => {
  mod.loading = true
  try {
    const res = await request.put(`/modules/${mod.module_key}/toggle`, {
      enabled,
      reason: reason || ''
    }) as any

    if (res.success) {
      mod.is_enabled = enabled
      if (!enabled) {
        mod.disabled_reason = reason || '管理员手动停用'
        mod.disabled_at = new Date().toISOString()
      } else {
        mod.disabled_reason = null
        mod.disabled_at = null
      }
      ElMessage.success(`模块已${enabled ? '启用' : '停用'}`)
    } else {
      ElMessage.error(res.message || '操作失败')
      // 恢复状态
      mod.is_enabled = !enabled
    }
  } catch (error: any) {
    console.error('切换模块状态失败:', error)
    ElMessage.error('操作失败')
    mod.is_enabled = !enabled
  } finally {
    mod.loading = false
  }
}

onMounted(() => {
  fetchModules()
})
</script>

<style scoped lang="scss">
.page-container {
  padding: 0;
}

.header-card {
  margin-bottom: 16px;
  border-radius: 12px;
  border: none;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-info {
  .page-title {
    font-size: 20px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 8px 0;
  }

  .page-desc {
    font-size: 14px;
    color: #909399;
    margin: 0;
  }
}

.warning-alert {
  margin-bottom: 20px;
  border-radius: 8px;
}

.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
  gap: 20px;
  min-height: 200px;
}

.module-card {
  background: #fff;
  border-radius: 12px;
  padding: 20px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.04);
  border: 1px solid #ebeef5;
  transition: all 0.3s ease;

  &:hover {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.08);
    transform: translateY(-2px);
  }

  &.disabled {
    background: #fafafa;
    border-color: #f56c6c;

    .module-icon {
      opacity: 0.5;
      filter: grayscale(50%);
    }

    .module-name {
      color: #909399;
    }
  }
}

.card-header {
  display: flex;
  align-items: flex-start;
  gap: 16px;
  margin-bottom: 16px;
}

.module-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  flex-shrink: 0;
}

.module-info {
  flex: 1;
  min-width: 0;
}

.module-name {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 4px 0;
}

.module-desc {
  font-size: 13px;
  color: #909399;
  margin: 0;
  line-height: 1.5;
}

.card-body {
  padding: 12px 0;
  border-top: 1px solid #f0f0f0;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16px;
}

.status-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.status-label {
  font-size: 13px;
  color: #606266;
}

.reason-row, .time-row {
  font-size: 12px;
  color: #909399;
  margin-top: 8px;
}

.reason-label, .time-label {
  color: #909399;
}

.reason-text {
  color: #f56c6c;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.protected-tip {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  color: #909399;
}

:deep(.el-switch) {
  --el-switch-on-color: #67c23a;
  --el-switch-off-color: #f56c6c;
}
</style>
