<template>
  <div class="page-container">
    <!-- 页面头部 -->
    <el-card shadow="never" class="header-card">
      <div class="page-header">
        <div class="header-info">
          <div class="title-row">
            <div class="title-icon">
              <el-icon :size="28"><Menu /></el-icon>
            </div>
            <div>
              <h2 class="page-title">模块服务管理</h2>
              <p class="page-desc">全局控制 CRM 系统各功能模块的启用/停用状态，适用于紧急下线、功能维护等场景</p>
            </div>
          </div>
        </div>
        <div class="header-actions">
          <div class="stats-group">
            <div class="stat-item stat-enabled">
              <el-icon><CircleCheck /></el-icon>
              <span class="stat-num">{{ enabledCount }}</span>
              <span class="stat-label">已启用</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item stat-disabled">
              <el-icon><CircleClose /></el-icon>
              <span class="stat-num">{{ disabledCount }}</span>
              <span class="stat-label">已停用</span>
            </div>
          </div>
          <el-button type="primary" :loading="refreshing" @click="fetchModules" round>
            <el-icon><Refresh /></el-icon>
            <span>刷新状态</span>
          </el-button>
        </div>
      </div>
    </el-card>

    <!-- 提示条 -->
    <div class="tip-banner">
      <el-icon class="tip-icon"><Warning /></el-icon>
      <span>停用模块后，所有 CRM 用户将无法访问该模块的菜单和功能，已有数据不受影响，恢复启用后可正常使用。</span>
    </div>

    <!-- 模块网格 -->
    <div class="modules-grid" v-loading="loading" element-loading-text="加载中...">
      <div
        v-for="mod in modules"
        :key="mod.module_key"
        class="module-card"
        :class="{
          'is-disabled': !mod.is_enabled,
          'is-protected': isProtectedModule(mod.module_key)
        }"
      >
        <!-- 状态指示灯 -->
        <div class="status-dot" :class="mod.is_enabled ? 'dot-on' : 'dot-off'"></div>

        <!-- 模块图标 -->
        <div class="card-icon-wrapper">
          <div class="card-icon" :style="{ background: mod.is_enabled ? getModuleGradient(mod.module_key) : '#f0f2f5' }">
            <el-icon :size="28" :color="mod.is_enabled ? '#fff' : '#c0c4cc'">
              <component :is="getModuleIcon(mod.module_key)" />
            </el-icon>
          </div>
        </div>

        <!-- 模块信息 -->
        <div class="card-content">
          <h3 class="module-name">{{ mod.module_name }}</h3>
          <p class="module-desc">{{ mod.description }}</p>
        </div>

        <!-- 状态标签 -->
        <div class="card-status">
          <el-tag
            :type="mod.is_enabled ? 'success' : 'danger'"
            effect="light"
            size="small"
            round
          >
            {{ mod.is_enabled ? '运行中' : '已停用' }}
          </el-tag>
          <el-tag
            v-if="isProtectedModule(mod.module_key)"
            type="info"
            effect="plain"
            size="small"
            round
          >
            <el-icon style="margin-right: 2px"><Lock /></el-icon>核心
          </el-tag>
        </div>

        <!-- 停用信息 -->
        <div v-if="!mod.is_enabled && mod.disabled_reason" class="disabled-info">
          <el-icon><InfoFilled /></el-icon>
          <span>{{ mod.disabled_reason }}</span>
        </div>
        <div v-if="!mod.is_enabled && mod.disabled_at" class="disabled-time">
          <el-icon><Clock /></el-icon>
          <span>{{ formatTime(mod.disabled_at) }}</span>
        </div>

        <!-- 操作区 -->
        <div class="card-action">
          <el-switch
            :model-value="mod.is_enabled"
            :loading="mod.loading"
            :disabled="isProtectedModule(mod.module_key)"
            active-text="启用"
            inactive-text="停用"
            inline-prompt
            style="--el-switch-on-color: #67c23a; --el-switch-off-color: #f56c6c"
            @change="(val: boolean) => handleToggle(mod, val)"
          />
        </div>
      </div>

      <!-- 空状态 -->
      <div v-if="!loading && modules.length === 0" class="empty-state">
        <el-empty description="暂无模块数据" />
      </div>
    </div>

    <!-- 停用确认弹窗 -->
    <el-dialog
      v-model="showDisableDialog"
      title="停用模块确认"
      width="480px"
      :close-on-click-modal="false"
      class="disable-dialog"
    >
      <div class="dialog-content">
        <div class="dialog-warning-box">
          <div class="warning-icon-big">
            <el-icon :size="40" color="#f56c6c"><Warning /></el-icon>
          </div>
          <div class="warning-text">
            <h4>确定要停用「{{ currentModule?.module_name }}」模块吗？</h4>
            <p>停用后，所有 CRM 用户将无法访问此模块</p>
          </div>
        </div>

        <div class="impact-section">
          <div class="impact-title">
            <el-icon><InfoFilled /></el-icon>
            <span>影响说明</span>
          </div>
          <ul class="impact-list">
            <li>所有租户的 CRM 系统中「{{ currentModule?.module_name }}」菜单将不可见</li>
            <li>已有的模块数据不会丢失，恢复启用后可正常使用</li>
            <li>此操作不影响用户角色和权限配置</li>
          </ul>
        </div>

        <el-form label-position="top">
          <el-form-item label="停用原因（可选）">
            <el-input
              v-model="disableReason"
              type="textarea"
              :rows="3"
              placeholder="如：功能维护中、紧急下线、版本升级等..."
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="cancelDisable" round>取消</el-button>
          <el-button type="danger" :loading="submitting" @click="confirmDisable" round>
            <el-icon><CircleClose /></el-icon>
            确认停用
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, type Component } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Refresh, Lock, CircleCheck, CircleClose, Warning, InfoFilled, Clock, Menu,
  ShoppingCart, User, Money, Van, Service, Phone, Folder, TrendCharts, Goods, Setting,
  Odometer, Box
} from '@element-plus/icons-vue'
import request from '../../api/request'

interface ModuleItem {
  id: string
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

// 统计
const enabledCount = computed(() => modules.value.filter(m => m.is_enabled).length)
const disabledCount = computed(() => modules.value.filter(m => !m.is_enabled).length)

// 模块图标映射（根据 module code 映射到正确的 Element Plus 图标组件）
const moduleIconMap: Record<string, Component> = {
  order_management: ShoppingCart,
  customer_management: User,
  finance_management: Money,
  logistics_management: Van,
  aftersales_management: Service,
  call_management: Phone,
  data_management: Folder,
  performance_management: TrendCharts,
  product_management: Goods,
  system_management: Setting,
  dashboard: Odometer
}
const getModuleIcon = (key: string): Component => {
  return moduleIconMap[key] || Box
}

// 模块渐变色映射（使用 module_key = code）
const moduleGradientMap: Record<string, string> = {
  order_management: 'linear-gradient(135deg, #e6a23c 0%, #f5ba62 100%)',
  customer_management: 'linear-gradient(135deg, #67c23a 0%, #85ce61 100%)',
  finance_management: 'linear-gradient(135deg, #ff9800 0%, #ffb74d 100%)',
  logistics_management: 'linear-gradient(135deg, #909399 0%, #b0b5bd 100%)',
  aftersales_management: 'linear-gradient(135deg, #00bcd4 0%, #4dd0e1 100%)',
  call_management: 'linear-gradient(135deg, #3f51b5 0%, #7986cb 100%)',
  data_management: 'linear-gradient(135deg, #795548 0%, #a1887f 100%)',
  performance_management: 'linear-gradient(135deg, #9c27b0 0%, #ba68c8 100%)',
  product_management: 'linear-gradient(135deg, #f56c6c 0%, #f89898 100%)',
  system_management: 'linear-gradient(135deg, #607d8b 0%, #90a4ae 100%)',
  dashboard: 'linear-gradient(135deg, #409eff 0%, #66b1ff 100%)'
}
const getModuleGradient = (key: string) => moduleGradientMap[key] || 'linear-gradient(135deg, #909399 0%, #c0c4cc 100%)'

// 受保护的核心模块（不能停用）
const protectedModules = ['system_management']
const isProtectedModule = (key: string) => protectedModules.includes(key)

const formatTime = (time: string | null) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })
}

// 获取模块列表
const fetchModules = async () => {
  loading.value = true
  refreshing.value = true
  try {
    const res = await request.get('/modules', { params: { pageSize: 50 } }) as any
    if (res.success && res.data) {
      const moduleList = res.data.list || res.data
      modules.value = moduleList.map((m: any) => ({
        id: m.id,
        module_key: m.code,
        module_name: m.name,
        description: m.description,
        icon: m.icon,
        is_enabled: m.status === 'enabled',
        disabled_reason: null,
        disabled_at: null,
        disabled_by: null,
        sort_order: m.sortOrder,
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
  if (enabled) {
    await toggleModule(mod, true)
  } else {
    currentModule.value = mod
    disableReason.value = ''
    showDisableDialog.value = true
  }
}

const cancelDisable = () => {
  showDisableDialog.value = false
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
    const endpoint = enabled ? `/modules/${mod.id}/enable` : `/modules/${mod.id}/disable`
    const res = await request.post(endpoint) as any

    if (res.success) {
      mod.is_enabled = enabled
      if (!enabled) {
        mod.disabled_reason = reason || '管理员手动停用'
        mod.disabled_at = new Date().toISOString()
      } else {
        mod.disabled_reason = null
        mod.disabled_at = null
      }
      ElMessage({
        type: 'success',
        message: `「${mod.module_name}」已${enabled ? '启用' : '停用'}`,
        grouping: true
      })
    } else {
      ElMessage.error(res.message || '操作失败')
      mod.is_enabled = !enabled
    }
  } catch (error: any) {
    console.error('切换模块状态失败:', error)
    ElMessage.error('操作失败，请稍后重试')
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

/* ===== 头部卡片 ===== */
.header-card {
  margin-bottom: 16px;
  border-radius: 16px;
  border: none;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;

  :deep(.el-card__body) {
    padding: 24px 28px;
  }
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 16px;
}

.title-icon {
  width: 52px;
  height: 52px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(4px);
}

.page-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin: 0 0 4px 0;
  letter-spacing: 0.5px;
}

.page-desc {
  font-size: 13px;
  color: rgba(255, 255, 255, 0.85);
  margin: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 20px;
}

.stats-group {
  display: flex;
  align-items: center;
  gap: 16px;
  background: rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 10px 20px;
  backdrop-filter: blur(4px);
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #fff;

  .el-icon {
    font-size: 18px;
  }
}

.stat-num {
  font-size: 22px;
  font-weight: 700;
  line-height: 1;
}

.stat-label {
  font-size: 12px;
  opacity: 0.85;
}

.stat-divider {
  width: 1px;
  height: 28px;
  background: rgba(255, 255, 255, 0.3);
}

.header-actions .el-button {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: #fff;

  &:hover {
    background: rgba(255, 255, 255, 0.35);
  }
}

/* ===== 提示条 ===== */
.tip-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  margin-bottom: 20px;
  background: #fdf6ec;
  border: 1px solid #faecd8;
  border-radius: 10px;
  font-size: 13px;
  color: #e6a23c;
  line-height: 1.5;
}

.tip-icon {
  font-size: 18px;
  flex-shrink: 0;
}

/* ===== 模块网格 ===== */
.modules-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 18px;
  min-height: 200px;
}

.module-card {
  position: relative;
  background: #fff;
  border-radius: 16px;
  padding: 24px 20px 20px;
  border: 1px solid #ebeef5;
  transition: all 0.35s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, #67c23a, #85ce61);
    opacity: 1;
    transition: opacity 0.3s;
  }

  &:hover {
    transform: translateY(-4px);
    box-shadow: 0 12px 32px rgba(0, 0, 0, 0.08);
    border-color: transparent;
  }

  &.is-disabled {
    background: #fafbfc;

    &::before {
      background: linear-gradient(90deg, #f56c6c, #f89898);
    }

    .card-icon {
      box-shadow: none;
    }

    .module-name {
      color: #909399;
    }

    .module-desc {
      color: #c0c4cc;
    }
  }

  &.is-protected {
    &::before {
      background: linear-gradient(90deg, #409eff, #66b1ff);
    }
  }
}

/* 状态指示灯 */
.status-dot {
  position: absolute;
  top: 14px;
  right: 14px;
  width: 10px;
  height: 10px;
  border-radius: 50%;

  &.dot-on {
    background: #67c23a;
    box-shadow: 0 0 8px rgba(103, 194, 58, 0.5);
    animation: pulse-green 2s ease-in-out infinite;
  }

  &.dot-off {
    background: #f56c6c;
    box-shadow: 0 0 6px rgba(245, 108, 108, 0.3);
  }
}

@keyframes pulse-green {
  0%, 100% { box-shadow: 0 0 6px rgba(103, 194, 58, 0.4); }
  50% { box-shadow: 0 0 12px rgba(103, 194, 58, 0.7); }
}

/* 图标 */
.card-icon-wrapper {
  margin-bottom: 14px;
}

.card-icon {
  width: 60px;
  height: 60px;
  border-radius: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.1);
  transition: all 0.3s;
}

/* 内容 */
.card-content {
  margin-bottom: 12px;
  width: 100%;
}

.module-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px 0;
  transition: color 0.3s;
}

.module-desc {
  font-size: 12px;
  color: #909399;
  margin: 0;
  line-height: 1.6;
  min-height: 38px;
  transition: color 0.3s;
}

/* 状态标签 */
.card-status {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

/* 停用信息 */
.disabled-info, .disabled-time {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  color: #c0c4cc;
  margin-bottom: 4px;
  width: 100%;
  justify-content: center;

  .el-icon {
    font-size: 13px;
    flex-shrink: 0;
  }
}

.disabled-info {
  color: #f56c6c;
}

/* 操作区 */
.card-action {
  margin-top: auto;
  padding-top: 14px;
  border-top: 1px solid #f5f5f5;
  width: 100%;
  display: flex;
  justify-content: center;
}

/* 空状态 */
.empty-state {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  padding: 60px 0;
}

/* ===== 停用弹窗 ===== */
.disable-dialog {
  :deep(.el-dialog) {
    border-radius: 16px;
    overflow: hidden;
  }

  :deep(.el-dialog__header) {
    padding: 20px 24px 12px;
    margin: 0;
  }

  :deep(.el-dialog__body) {
    padding: 0 24px;
  }

  :deep(.el-dialog__footer) {
    padding: 16px 24px 20px;
  }
}

.dialog-content {
  padding: 0;
}

.dialog-warning-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 20px;
  background: linear-gradient(135deg, #fef0f0 0%, #fde2e2 100%);
  border-radius: 12px;
  margin-bottom: 16px;
}

.warning-icon-big {
  flex-shrink: 0;
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(245, 108, 108, 0.1);
  border-radius: 50%;
}

.warning-text {
  h4 {
    margin: 0 0 4px 0;
    font-size: 15px;
    color: #303133;
    font-weight: 600;
  }

  p {
    margin: 0;
    font-size: 13px;
    color: #909399;
  }
}

.impact-section {
  margin-bottom: 16px;
  background: #f8f9fa;
  border-radius: 10px;
  padding: 14px 16px;
}

.impact-title {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 600;
  color: #606266;
  margin-bottom: 10px;

  .el-icon {
    color: #909399;
  }
}

.impact-list {
  margin: 0;
  padding-left: 18px;
  font-size: 12px;
  color: #909399;
  line-height: 2;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}
</style>
