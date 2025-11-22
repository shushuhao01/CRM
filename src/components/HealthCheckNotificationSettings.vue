<template>
  <div class="health-check-notification-settings">
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <span>API健康检查通知设置</span>
          <el-tag v-if="!isSuperAdmin" type="info" size="small">
            仅超级管理员可见
          </el-tag>
        </div>
      </template>

      <div v-if="!isSuperAdmin" class="no-permission">
        <el-result
          icon="info"
          title="权限提示"
          sub-title="API健康检查通知功能仅对超级管理员开放"
        />
      </div>

      <div v-else class="settings-content">
        <!-- 当前状态显示 -->
        <div class="status-section">
          <h4>当前状态</h4>
          <el-descriptions :column="2" border>
            <el-descriptions-item label="API状态">
              <el-tag :type="apiStatus ? 'success' : 'danger'">
                {{ apiStatus ? '正常' : '异常' }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="通知状态">
              <el-tag :type="notificationEnabled ? 'success' : 'warning'">
                {{ getNotificationStatusText() }}
              </el-tag>
            </el-descriptions-item>
            <el-descriptions-item label="上次检查时间">
              {{ lastCheckTime || '暂无' }}
            </el-descriptions-item>
            <el-descriptions-item label="错误次数">
              {{ errorCount }}
            </el-descriptions-item>
          </el-descriptions>
        </div>

        <!-- 通知偏好设置 -->
        <div class="preference-section">
          <h4>通知偏好</h4>
          <el-form :model="preferences" label-width="140px">
            <el-form-item label="当前设置">
              <div class="current-preference">
                <el-tag v-if="preferences.suppressType === 'none'" type="success">
                  正常接收通知
                </el-tag>
                <el-tag v-else-if="preferences.suppressType === 'today'" type="warning">
                  今天不再提醒
                  <span class="suppress-time">
                    (至 {{ formatSuppressTime(preferences.suppressUntil) }})
                  </span>
                </el-tag>
                <el-tag v-else-if="preferences.suppressType === 'month'" type="info">
                  一个月不再提醒
                  <span class="suppress-time">
                    (至 {{ formatSuppressTime(preferences.suppressUntil) }})
                  </span>
                </el-tag>
              </div>
            </el-form-item>

            <el-form-item label="快速设置">
              <el-button-group>
                <el-button
                  @click="setNotificationPreference('none')"
                  :type="preferences.suppressType === 'none' ? 'primary' : 'default'"
                >
                  恢复通知
                </el-button>
                <el-button
                  @click="setNotificationPreference('today')"
                  :type="preferences.suppressType === 'today' ? 'primary' : 'default'"
                >
                  今天不再提醒
                </el-button>
                <el-button
                  @click="setNotificationPreference('month')"
                  :type="preferences.suppressType === 'month' ? 'primary' : 'default'"
                >
                  一个月不再提醒
                </el-button>
              </el-button-group>
            </el-form-item>

            <el-form-item label="上次通知时间">
              <span class="last-notification">
                {{ preferences.lastNotificationTime ?
                  new Date(preferences.lastNotificationTime).toLocaleString() :
                  '暂无通知记录'
                }}
              </span>
            </el-form-item>
          </el-form>
        </div>

        <!-- 测试功能 -->
        <div class="test-section">
          <h4>测试功能</h4>
          <el-form label-width="140px">
            <el-form-item label="手动测试">
              <el-button
                @click="testNotification"
                :loading="testLoading"
                type="warning"
              >
                模拟API失败通知
              </el-button>
              <span class="test-tip">
                点击此按钮可以测试API健康检查失败时的通知效果
              </span>
            </el-form-item>

            <el-form-item label="清除设置">
              <el-button
                @click="clearAllPreferences"
                type="danger"
                plain
              >
                清除所有通知偏好
              </el-button>
              <span class="clear-tip">
                清除所有用户的通知偏好设置，恢复默认状态
              </span>
            </el-form-item>
          </el-form>
        </div>

        <!-- 说明信息 -->
        <div class="info-section">
          <el-alert
            title="功能说明"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <ul class="info-list">
                <li>API健康检查每12小时自动执行一次（每天2次）</li>
                <li>只有超级管理员才能看到API失败通知</li>
                <li>可以设置"今天不再提醒"或"一个月不再提醒"</li>
                <li>系统会自动记住您的通知偏好设置</li>
                <li>API恢复正常后，错误计数会自动重置</li>
              </ul>
            </template>
          </el-alert>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { healthCheckNotificationService } from '@/services/healthCheckNotificationService'
import { storageModeService } from '@/services/storageMode'

const userStore = useUserStore()

// 响应式数据
const testLoading = ref(false)
const preferences = ref({
  suppressType: 'none' as 'none' | 'today' | 'month',
  suppressUntil: null as number | null,
  lastNotificationTime: null as number | null
})

// 计算属性
const isSuperAdmin = computed(() => userStore.isSuperAdmin)

const apiStatus = computed(() => {
  return storageModeService.isApiMode()
})

const errorCount = computed(() => {
  // 从localStorage获取错误计数
  const errorData = localStorage.getItem('api_health_check_errors')
  return errorData ? JSON.parse(errorData).count || 0 : 0
})

const lastCheckTime = computed(() => {
  // 从localStorage获取最后检查时间
  const errorData = localStorage.getItem('api_health_check_errors')
  if (errorData) {
    const data = JSON.parse(errorData)
    return data.lastCheck ? new Date(data.lastCheck).toLocaleString() : null
  }
  return null
})

const notificationEnabled = computed(() => {
  return preferences.value.suppressType === 'none'
})

// 方法
const getNotificationStatusText = () => {
  switch (preferences.value.suppressType) {
    case 'none':
      return '正常接收'
    case 'today':
      return '今天已暂停'
    case 'month':
      return '一个月已暂停'
    default:
      return '未知状态'
  }
}

const formatSuppressTime = (timestamp: number | null) => {
  if (!timestamp) return ''
  return new Date(timestamp).toLocaleString()
}

const setNotificationPreference = async (type: 'none' | 'today' | 'month') => {
  const userId = userStore.currentUser?.id
  if (!userId) {
    ElMessage.error('用户信息获取失败')
    return
  }

  try {
    if (type === 'none') {
      // 恢复通知
      preferences.value = {
        suppressType: 'none',
        suppressUntil: null,
        lastNotificationTime: preferences.value.lastNotificationTime
      }
      // 清除抑制设置
      healthCheckNotificationService.clearAllPreferences()
      ElMessage.success('已恢复API健康检查通知')
    } else {
      // 设置抑制
      const now = Date.now()
      let suppressUntil: number

      if (type === 'today') {
        const tomorrow = new Date()
        tomorrow.setDate(tomorrow.getDate() + 1)
        tomorrow.setHours(0, 0, 0, 0)
        suppressUntil = tomorrow.getTime()
        ElMessage.success('已设置今天不再提醒API健康检查失败')
      } else {
        suppressUntil = now + (30 * 24 * 60 * 60 * 1000)
        ElMessage.success('已设置一个月内不再提醒API健康检查失败')
      }

      preferences.value = {
        suppressType: type,
        suppressUntil,
        lastNotificationTime: preferences.value.lastNotificationTime
      }

      // 通过私有方法设置抑制（需要访问服务的私有方法）
      const service = healthCheckNotificationService as any
      service.setSuppression(userId, type)
    }
  } catch (error) {
    console.error('设置通知偏好失败:', error)
    ElMessage.error('设置失败，请重试')
  }
}

const testNotification = async () => {
  testLoading.value = true
  try {
    await healthCheckNotificationService.showHealthCheckFailureNotification('这是一个测试通知')
  } catch (error) {
    console.error('测试通知失败:', error)
  } finally {
    testLoading.value = false
  }
}

const clearAllPreferences = async () => {
  try {
    await ElMessageBox.confirm(
      '确定要清除所有用户的通知偏好设置吗？此操作不可撤销。',
      '确认清除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )

    healthCheckNotificationService.clearAllPreferences()
    loadUserPreferences()
    ElMessage.success('已清除所有通知偏好设置')
  } catch {
    // 用户取消操作
  }
}

const loadUserPreferences = () => {
  const userId = userStore.currentUser?.id
  if (!userId) return

  const userPreference = healthCheckNotificationService.getUserPreference(userId)
  if (userPreference) {
    preferences.value = {
      suppressType: userPreference.suppressType,
      suppressUntil: userPreference.suppressUntil,
      lastNotificationTime: userPreference.lastNotificationTime
    }
  }
}

// 生命周期
onMounted(() => {
  loadUserPreferences()
})
</script>

<style scoped>
.health-check-notification-settings {
  max-width: 800px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.no-permission {
  padding: 40px 0;
}

.settings-content {
  padding: 20px 0;
}

.status-section,
.preference-section,
.test-section,
.info-section {
  margin-bottom: 30px;
}

.status-section h4,
.preference-section h4,
.test-section h4 {
  margin-bottom: 15px;
  color: #303133;
  font-weight: 600;
}

.current-preference {
  display: flex;
  align-items: center;
  gap: 10px;
}

.suppress-time {
  font-size: 12px;
  color: #909399;
  margin-left: 5px;
}

.last-notification {
  color: #606266;
  font-size: 14px;
}

.test-tip,
.clear-tip {
  margin-left: 10px;
  color: #909399;
  font-size: 12px;
}

.info-list {
  margin: 0;
  padding-left: 20px;
}

.info-list li {
  margin-bottom: 5px;
  color: #606266;
}

.el-button-group {
  display: flex;
  gap: 0;
}

.el-descriptions {
  margin-bottom: 20px;
}
</style>
