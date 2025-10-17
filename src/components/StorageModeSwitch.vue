<template>
  <div v-if="shouldShowStorageSwitch" class="storage-mode-switch">
    <!-- 模式指示器 -->
    <el-tooltip
      v-if="modeIndicator.showIndicator"
      :content="getModeTooltip()"
      placement="bottom"
    >
      <div 
        class="mode-indicator"
        :class="`mode-indicator--${modeIndicator.color}`"
      >
        <el-icon class="mode-icon">
          <component :is="modeIndicator.icon" />
        </el-icon>
        <span class="mode-text">{{ modeIndicator.text }}</span>
        <span class="mode-status">{{ modeIndicator.status }}</span>
      </div>
    </el-tooltip>

    <!-- 切换按钮 -->
    <el-dropdown 
      trigger="click" 
      placement="bottom-end"
      @command="handleCommand"
    >
      <el-button 
        type="primary" 
        :loading="isLoading || status.syncInProgress"
        size="small"
        :disabled="isLoading"
      >
        <el-icon><Setting /></el-icon>
        存储模式
        <el-icon class="el-icon--right"><arrow-down /></el-icon>
      </el-button>
      
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item 
            command="switch-local"
            :disabled="status.currentMode === 'local'"
          >
            <el-icon><Folder /></el-icon>
            切换到本地模式
          </el-dropdown-item>
          
          <el-dropdown-item 
            command="switch-api"
            :disabled="status.currentMode === 'api' || !status.apiAvailable"
          >
            <el-icon><Upload /></el-icon>
            切换到API模式
            <span v-if="!status.apiAvailable" class="api-unavailable">(不可用)</span>
          </el-dropdown-item>
          
          <el-dropdown-item 
            command="sync-data"
            :disabled="status.syncInProgress"
          >
            <el-icon><Refresh /></el-icon>
            同步数据
          </el-dropdown-item>
          
          <el-dropdown-item divided command="settings">
            <el-icon><Setting /></el-icon>
            存储设置
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>

    <!-- 设置对话框 -->
    <el-dialog
      v-model="showSettings"
      title="存储模式设置"
      width="500px"
      :close-on-click-modal="false"
    >
      <!-- 全局配置信息 -->
      <el-alert
        v-if="userStore.isSuperAdmin"
        title="超级管理员模式"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #default>
          您的配置将全局同步到所有用户。当前全局配置版本：{{ globalConfig.version }}
          <br>
          <span v-if="globalConfig.lastUpdatedBy">
            最后更新：{{ globalConfig.lastUpdatedBy }} 
            ({{ new Date(globalConfig.lastUpdatedAt).toLocaleString() }})
          </span>
        </template>
      </el-alert>
      
      <el-alert
        v-else
        title="普通用户模式"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <template #default>
          您的配置将跟随超级管理员的全局设置。
          <br>
          当前全局模式：{{ getModeText(globalConfig.mode) }}
          <span v-if="globalConfig.lastUpdatedBy">
            (由 {{ globalConfig.lastUpdatedBy }} 配置)
          </span>
        </template>
      </el-alert>

      <el-form 
        :model="configForm" 
        label-width="120px"
        @submit.prevent
      >
        <el-form-item label="默认模式">
          <el-radio-group v-model="configForm.mode">
            <el-radio value="local">本地存储</el-radio>
            <el-radio value="api" :disabled="!status.apiAvailable">API存储</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="自动同步">
          <el-switch v-model="configForm.autoSync" />
          <div class="form-help">启用后将定期自动同步数据</div>
        </el-form-item>

        <el-form-item 
          v-if="configForm.autoSync"
          label="同步间隔"
        >
          <el-input-number
            v-model="configForm.syncInterval"
            :min="1"
            :max="60"
            controls-position="right"
          />
          <span class="input-suffix">分钟</span>
        </el-form-item>

        <el-form-item label="故障回退">
          <el-switch v-model="configForm.fallbackToLocal" />
          <div class="form-help">API失败时自动回退到本地存储</div>
        </el-form-item>

        <el-form-item label="显示指示器">
          <el-switch v-model="configForm.showModeIndicator" />
          <div class="form-help">在界面上显示当前存储模式</div>
        </el-form-item>
      </el-form>

      <template #footer>
        <div class="dialog-footer">
          <el-button @click="showSettings = false">取消</el-button>
          <el-button type="primary" @click="saveSettings">保存设置</el-button>
        </div>
      </template>
    </el-dialog>

    <!-- 同步进度 -->
    <el-dialog
      v-model="showSyncProgress"
      title="数据同步"
      width="400px"
      :close-on-click-modal="false"
      :show-close="false"
    >
      <div class="sync-progress">
        <el-progress 
          :percentage="syncProgress" 
          :status="syncStatus"
          :stroke-width="8"
        />
        <p class="sync-message">{{ syncMessage }}</p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  Setting, 
  ArrowDown, 
  Folder, 
  Upload, 
  Refresh 
} from '@element-plus/icons-vue'
import { storageModeService, type StorageModeConfig } from '@/services/storageMode'
import { globalConfigService } from '@/services/globalConfigService'
import { useUserStore } from '@/stores/user'

// 用户权限检查
const userStore = useUserStore()

// 防抖和稳定性检查
const isUserReady = ref(false)
const checkUserReadyTimer = ref<NodeJS.Timeout | null>(null)

// 计算属性：是否应该显示储存模式切换器
const shouldShowStorageSwitch = computed(() => {
  // 确保用户已登录且用户信息已加载
  if (!userStore.isLoggedIn || !userStore.currentUser) {
    return false
  }
  
  // 确保用户状态已稳定
  if (!isUserReady.value) {
    return false
  }
  
  // 检查是否为超级管理员
  return userStore.isSuperAdmin
})

// 监听用户状态变化，使用防抖机制
watch(
  () => [userStore.isLoggedIn, userStore.currentUser, userStore.isSuperAdmin],
  () => {
    // 清除之前的定时器
    if (checkUserReadyTimer.value) {
      clearTimeout(checkUserReadyTimer.value)
    }
    
    // 设置防抖延迟
    checkUserReadyTimer.value = setTimeout(() => {
      if (userStore.isLoggedIn && userStore.currentUser) {
        isUserReady.value = true
        console.log('[StorageModeSwitch] 用户状态已稳定，isSuperAdmin:', userStore.isSuperAdmin)
      } else {
        isUserReady.value = false
      }
    }, 100) // 100ms防抖延迟
  },
  { immediate: true }
)

// 响应式数据
const showSettings = ref(false)
const showSyncProgress = ref(false)
const syncProgress = ref(0)
const syncStatus = ref<'success' | 'exception' | 'warning' | ''>('')
const syncMessage = ref('')
const isLoading = ref(false)

// 获取服务状态和配置
const config = storageModeService.getConfig()
const status = storageModeService.getStatus()
const modeIndicator = storageModeService.getModeIndicator()

// 全局配置服务
const globalConfig = globalConfigService.config
const globalStatus = globalConfigService.status

// 配置表单
const configForm = ref<StorageModeConfig>({
  mode: 'local',
  autoSync: false,
  syncInterval: 5,
  fallbackToLocal: true,
  showModeIndicator: true
})

// 处理下拉菜单命令
const handleCommand = async (command: string) => {
  if (isLoading.value) return // 防止重复操作
  
  try {
    isLoading.value = true
    
    switch (command) {
      case 'switch-local':
        await switchToMode('local')
        break
        
      case 'switch-api':
        await switchToMode('api')
        break
        
      case 'sync-data':
        await performSync()
        break
        
      case 'settings':
        openSettings()
        break
    }
  } catch (error) {
    console.error('操作失败:', error)
    ElMessage.error('操作失败，请稍后重试')
  } finally {
    isLoading.value = false
  }
}

// 切换存储模式（支持全局配置）
const switchToMode = async (mode: 'local' | 'api') => {
  // 如果是超级管理员，更新全局配置
  if (userStore.isSuperAdmin) {
    const success = await globalConfigService.updateGlobalConfig({ mode })
    if (success) {
      // 同步到本地存储服务
      await storageModeService.switchMode(mode)
      ElMessage.success(`已切换到${getModeText(mode)}模式并全局同步`)
    }
  } else {
    // 普通用户只能切换本地配置
    await storageModeService.switchMode(mode)
    ElMessage.success(`已切换到${getModeText(mode)}模式`)
  }
}

// 获取模式文本
const getModeText = (mode: string): string => {
  const modeMap: Record<string, string> = {
    'local': '本地存储',
    'api': 'API存储'
  }
  return modeMap[mode] || mode
}

// 执行数据同步
const performSync = async () => {
  // 检查当前模式是否支持同步
  if (status.value.currentMode === 'local') {
    ElMessage.warning('本地存储模式无法进行数据同步')
    return
  }

  showSyncProgress.value = true
  syncProgress.value = 0
  syncStatus.value = ''
  syncMessage.value = '准备同步数据...'

  try {
    // 检查API连接状态
    const isApiAvailable = await storageModeService.checkApiStatus()
    if (!isApiAvailable) {
      throw new Error('API服务不可用')
    }

    // 模拟同步进度
    const progressSteps = [
      { progress: 20, message: '检查连接状态...' },
      { progress: 40, message: '验证用户权限...' },
      { progress: 60, message: '同步数据中...' },
      { progress: 80, message: '验证数据完整性...' },
      { progress: 100, message: '同步完成' }
    ]

    for (const step of progressSteps) {
      await new Promise(resolve => setTimeout(resolve, 500))
      syncProgress.value = step.progress
      syncMessage.value = step.message
    }

    // 执行实际同步
    const success = await storageModeService.syncData()
    
    if (success) {
      syncStatus.value = 'success'
      syncMessage.value = '数据同步成功'
      ElMessage.success('数据同步完成')
    } else {
      syncStatus.value = 'exception'
      syncMessage.value = '数据同步失败'
      ElMessage.error('数据同步失败')
    }

    // 延迟关闭对话框
    setTimeout(() => {
      showSyncProgress.value = false
    }, 1500)
    
  } catch (error) {
    console.error('同步失败:', error)
    syncStatus.value = 'exception'
    syncMessage.value = error instanceof Error ? error.message : '同步过程中发生错误'
    ElMessage.error('数据同步失败：' + (error instanceof Error ? error.message : '未知错误'))
    
    setTimeout(() => {
      showSyncProgress.value = false
    }, 2000)
  }
}

// 打开设置对话框
const openSettings = () => {
  // 复制当前配置到表单
  Object.assign(configForm.value, config.value)
  showSettings.value = true
}

// 保存设置
const saveSettings = async () => {
  try {
    // 如果是超级管理员，保存到全局配置
    if (userStore.isSuperAdmin) {
      const success = await globalConfigService.updateGlobalConfig({
        mode: configForm.value.mode,
        autoSync: configForm.value.autoSync,
        syncInterval: configForm.value.syncInterval
      })
      
      if (success) {
        // 同步到本地配置
        storageModeService.updateConfig(configForm.value)
        ElMessage.success('全局设置保存成功')
        showSettings.value = false
      }
    } else {
      // 普通用户只能保存本地配置
      storageModeService.updateConfig(configForm.value)
      ElMessage.success('本地设置保存成功')
      showSettings.value = false
    }
  } catch (error) {
    console.error('保存设置失败:', error)
    ElMessage.error('设置保存失败')
  }
}

// 组件挂载时初始化
onMounted(async () => {
  // 复制当前配置
  Object.assign(configForm.value, config.value)
  
  // 只在用户已登录且不是超级管理员时，同步全局配置到本地
  if (userStore.isLoggedIn && !userStore.isSuperAdmin) {
    await globalConfigService.syncConfig()
    // 应用全局配置到本地存储服务
    const globalConf = globalConfig.value
    if (globalConf.mode !== config.value.mode) {
      await storageModeService.switchMode(globalConf.mode)
    }
  }
})

// 监听全局配置变化
watch(
  () => globalConfig.value,
  async (newGlobalConfig) => {
    // 如果不是超级管理员，自动应用全局配置
    if (!userStore.isSuperAdmin && newGlobalConfig.mode !== config.value.mode) {
      console.log('[StorageModeSwitch] 应用全局配置:', newGlobalConfig.mode)
      await storageModeService.switchMode(newGlobalConfig.mode)
      ElMessage.info(`存储模式已更新为：${getModeText(newGlobalConfig.mode)}`)
    }
  },
  { deep: true }
)

// 获取模式工具提示
const getModeTooltip = () => {
  const mode = status.value.currentMode
  const tooltips = {
    local: '本地存储模式：数据保存在浏览器本地，离线可用，但不会同步到其他设备',
    api: 'API存储模式：数据保存在服务器，可在多设备间同步，需要网络连接'
  }
  
  let tooltip = tooltips[mode] || `${mode}模式`
  
  if (!status.value.apiAvailable && mode === 'api') {
    tooltip += '（当前API不可用，已自动切换到本地模式）'
  }
  
  return tooltip
}

// 组件卸载时清理
onUnmounted(() => {
  // 清理防抖定时器
  if (checkUserReadyTimer.value) {
    clearTimeout(checkUserReadyTimer.value)
    checkUserReadyTimer.value = null
  }
  // 清理工作在服务中处理
})
</script>

<style scoped>
.storage-mode-switch {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-right: 8px;
}

.mode-indicator {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 6px;
  border-radius: 12px;
  font-size: 11px;
  border: 1px solid;
  transition: all 0.3s ease;
  white-space: nowrap;
}

.mode-indicator--success {
  background-color: #f0f9ff;
  border-color: #67c23a;
  color: #67c23a;
}

.mode-indicator--warning {
  background-color: #fdf6ec;
  border-color: #e6a23c;
  color: #e6a23c;
}

.mode-indicator--info {
  background-color: #f4f4f5;
  border-color: #909399;
  color: #909399;
}

.mode-icon {
  font-size: 12px;
}

.mode-text {
  font-weight: 500;
}

.mode-status {
  opacity: 0.8;
  font-size: 11px;
}

.api-unavailable {
  color: #f56c6c;
  font-size: 12px;
  margin-left: 4px;
}

.form-help {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.4;
}

.input-suffix {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}

.sync-progress {
  text-align: center;
  padding: 20px 0;
}

.sync-message {
  margin-top: 16px;
  color: #606266;
  font-size: 14px;
}

.dialog-footer {
  text-align: right;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .storage-mode-switch {
    gap: 6px;
    margin-right: 4px;
  }
  
  .mode-indicator {
    padding: 1px 4px;
    font-size: 10px;
  }
  
  .mode-icon {
    font-size: 10px;
  }
  
  .mode-text {
    display: none; /* 在小屏幕上隐藏文字，只显示图标 */
  }
  
  .mode-status {
    display: none;
  }
}

@media (max-width: 480px) {
  .storage-mode-switch {
    gap: 4px;
    margin-right: 2px;
  }
  
  .mode-indicator {
    padding: 1px 3px;
  }
}
</style>