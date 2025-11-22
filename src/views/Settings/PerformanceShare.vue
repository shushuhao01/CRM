<template>
  <div class="performance-share-settings">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>业绩功能设置</span>
          <el-tag v-if="!isSuperAdmin" type="warning">仅超级管理员可修改</el-tag>
        </div>
      </template>

      <el-tabs v-model="activeTab" type="border-card">
        <!-- 业绩分享设置 -->
        <el-tab-pane label="业绩分享设置" name="share">
          <el-form
            ref="shareFormRef"
            :model="shareFormData"
            label-width="140px"
            :disabled="!isSuperAdmin"
          >
            <el-form-item label="启用业绩分享">
              <el-switch
                v-model="shareFormData.enabled"
                active-text="启用"
                inactive-text="禁用"
                @change="handleShareConfigChange"
              />
              <div class="form-item-tip">
                关闭后，所有成员将无法使用业绩分享功能
              </div>
            </el-form-item>

            <el-form-item label="允许复制图片">
              <el-switch
                v-model="shareFormData.allowCopy"
                active-text="允许"
                inactive-text="禁止"
                :disabled="!shareFormData.enabled"
                @change="handleShareConfigChange"
              />
              <div class="form-item-tip">
                允许成员复制业绩报告图片到剪贴板
              </div>
            </el-form-item>

            <el-form-item label="允许下载图片">
              <el-switch
                v-model="shareFormData.allowDownload"
                active-text="允许"
                inactive-text="禁止"
                :disabled="!shareFormData.enabled"
                @change="handleShareConfigChange"
              />
              <div class="form-item-tip">
                允许成员下载业绩报告图片到本地
              </div>
            </el-form-item>

            <el-form-item label="显示水印">
              <el-switch
                v-model="shareFormData.watermarkEnabled"
                active-text="显示"
                inactive-text="隐藏"
                :disabled="!shareFormData.enabled"
                @change="handleShareConfigChange"
              />
              <div class="form-item-tip">
                在业绩报告图片上显示水印，防止未授权传播
              </div>
            </el-form-item>

            <el-form-item label="水印类型" v-if="shareFormData.watermarkEnabled">
              <el-radio-group
                v-model="shareFormData.watermarkType"
                :disabled="!shareFormData.enabled"
                @change="handleShareConfigChange"
              >
                <el-radio label="username">员工姓名</el-radio>
                <el-radio label="account">员工账号</el-radio>
                <el-radio label="department">部门名称</el-radio>
                <el-radio label="phone">手机尾号</el-radio>
                <el-radio label="custom">自定义</el-radio>
              </el-radio-group>
              <div class="form-item-tip">
                选择水印显示的内容类型，默认使用员工账号
              </div>
            </el-form-item>

            <el-form-item label="自定义水印" v-if="shareFormData.watermarkEnabled && shareFormData.watermarkType === 'custom'">
              <el-input
                v-model="shareFormData.watermarkText"
                placeholder="输入自定义水印文字"
                :disabled="!shareFormData.enabled"
                @blur="handleShareConfigChange"
                style="width: 400px;"
              />
              <div class="form-item-tip">
                自定义水印文字，留空则使用系统名称
              </div>
            </el-form-item>

            <el-form-item v-if="isSuperAdmin">
              <el-button type="primary" @click="saveShareConfig">保存设置</el-button>
              <el-button @click="resetShareConfig">恢复默认</el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <div class="preview-section">
            <h3>预览效果</h3>
            <p class="preview-tip">点击下方按钮预览业绩分享效果</p>
            <el-button type="primary" @click="previewShare" :disabled="!shareFormData.enabled">
              预览业绩分享
            </el-button>
          </div>
        </el-tab-pane>

        <!-- 导出权限设置 -->
        <el-tab-pane label="导出权限设置" name="export">
          <el-form
            ref="exportFormRef"
            :model="exportFormData"
            label-width="140px"
            :disabled="!isSuperAdmin"
          >
            <el-form-item label="启用导出功能">
              <el-switch
                v-model="exportFormData.enabled"
                active-text="启用"
                inactive-text="禁用"
                @change="handleExportConfigChange"
              />
              <div class="form-item-tip">
                关闭后，所有成员将无法使用业绩导出功能
              </div>
            </el-form-item>

            <el-form-item label="权限控制方式" v-if="exportFormData.enabled">
              <el-radio-group
                v-model="exportFormData.permissionType"
                @change="handleExportConfigChange"
              >
                <el-radio label="all">所有人可用</el-radio>
                <el-radio label="role">按角色控制</el-radio>
                <el-radio label="whitelist">白名单控制</el-radio>
              </el-radio-group>
              <div class="form-item-tip">
                选择导出功能的权限控制方式
              </div>
            </el-form-item>

            <el-form-item label="允许的角色" v-if="exportFormData.enabled && exportFormData.permissionType === 'role'">
              <el-checkbox-group
                v-model="exportFormData.allowedRoles"
                @change="handleExportConfigChange"
              >
                <el-checkbox label="super_admin">超级管理员</el-checkbox>
                <el-checkbox label="admin">管理员</el-checkbox>
                <el-checkbox label="department_manager">部门经理</el-checkbox>
                <el-checkbox label="sales">销售人员</el-checkbox>
                <el-checkbox label="customer_service">客服人员</el-checkbox>
              </el-checkbox-group>
              <div class="form-item-tip">
                选择允许使用导出功能的角色
              </div>
            </el-form-item>

            <el-form-item label="白名单成员" v-if="exportFormData.enabled && exportFormData.permissionType === 'whitelist'">
              <el-select
                v-model="exportFormData.whitelist"
                multiple
                filterable
                placeholder="选择允许导出的成员"
                style="width: 100%; max-width: 600px;"
                @change="handleExportConfigChange"
              >
                <el-option
                  v-for="user in allUsers"
                  :key="user.id"
                  :label="`${user.name} (${user.email})`"
                  :value="user.id"
                />
              </el-select>
              <div class="form-item-tip">
                只有白名单中的成员可以使用导出功能，其他人看不到导出按钮
              </div>
            </el-form-item>

            <el-form-item label="导出格式" v-if="exportFormData.enabled">
              <el-checkbox-group
                v-model="exportFormData.allowedFormats"
                @change="handleExportConfigChange"
              >
                <el-checkbox label="xlsx">Excel格式(.xlsx)</el-checkbox>
                <el-checkbox label="csv">CSV格式(.csv)</el-checkbox>
                <el-checkbox label="pdf" disabled>PDF格式(.pdf) - 开发中</el-checkbox>
              </el-checkbox-group>
              <div class="form-item-tip">
                选择允许导出的文件格式
              </div>
            </el-form-item>

            <el-form-item label="导出限制" v-if="exportFormData.enabled">
              <el-input-number
                v-model="exportFormData.dailyLimit"
                :min="0"
                :max="100"
                placeholder="每日导出次数限制"
                @change="handleExportConfigChange"
              />
              <span style="margin-left: 10px;">次/天（0表示不限制）</span>
              <div class="form-item-tip">
                限制每个成员每天的导出次数，防止滥用
              </div>
            </el-form-item>

            <el-form-item v-if="isSuperAdmin">
              <el-button type="primary" @click="saveExportConfig">保存设置</el-button>
              <el-button @click="resetExportConfig">恢复默认</el-button>
            </el-form-item>
          </el-form>

          <el-divider />

          <div class="stats-section">
            <h3>导出统计</h3>
            <el-descriptions :column="3" border>
              <el-descriptions-item label="今日导出次数">{{ exportStats.todayCount }}</el-descriptions-item>
              <el-descriptions-item label="本周导出次数">{{ exportStats.weekCount }}</el-descriptions-item>
              <el-descriptions-item label="本月导出次数">{{ exportStats.monthCount }}</el-descriptions-item>
            </el-descriptions>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'

const configStore = useConfigStore()
const userStore = useUserStore()
const router = useRouter()

// 当前标签页
const activeTab = ref('share')

// 业绩分享表单数据
const shareFormData = reactive<{
  enabled: boolean
  allowCopy: boolean
  allowDownload: boolean
  watermarkEnabled: boolean
  watermarkType: 'username' | 'account' | 'department' | 'phone' | 'custom'
  watermarkText: string
}>({
  enabled: true,
  allowCopy: true,
  allowDownload: true,
  watermarkEnabled: true,
  watermarkType: 'account',
  watermarkText: ''
})

// 导出权限表单数据
const exportFormData = reactive({
  enabled: true,
  permissionType: 'all', // all, role, whitelist
  allowedRoles: ['super_admin', 'admin', 'department_manager', 'sales'],
  whitelist: [] as string[],
  allowedFormats: ['xlsx'],
  dailyLimit: 0
})

// 导出统计数据
const exportStats = reactive({
  todayCount: 0,
  weekCount: 0,
  monthCount: 0
})

// 所有用户列表
const allUsers = computed(() => {
  return userStore.users || []
})

// 是否为超级管理员
const isSuperAdmin = computed(() => {
  return userStore.currentUser?.role === 'super_admin'
})

// 处理分享配置变更
const handleShareConfigChange = () => {
  if (!isSuperAdmin.value) {
    return
  }
  // 实时保存配置
  saveShareConfig()
}

// 保存分享配置
const saveShareConfig = () => {
  if (!isSuperAdmin.value) {
    ElMessage.warning('仅超级管理员可以修改设置')
    return
  }

  configStore.updatePerformanceShareConfig(shareFormData)
  ElMessage.success('业绩分享设置已保存并全局生效')
}

// 恢复分享默认配置
const resetShareConfig = () => {
  if (!isSuperAdmin.value) {
    ElMessage.warning('仅超级管理员可以修改设置')
    return
  }

  shareFormData.enabled = true
  shareFormData.allowCopy = true
  shareFormData.allowDownload = true
  shareFormData.watermarkEnabled = true
  shareFormData.watermarkType = 'account'
  shareFormData.watermarkText = ''

  saveShareConfig()
  ElMessage.success('已恢复默认设置')
}

// 处理导出配置变更
const handleExportConfigChange = () => {
  if (!isSuperAdmin.value) {
    return
  }
  // 实时保存配置
  saveExportConfig()
}

// 保存导出配置
const saveExportConfig = () => {
  if (!isSuperAdmin.value) {
    ElMessage.warning('仅超级管理员可以修改设置')
    return
  }

  // 保存到localStorage
  const exportConfig = {
    enabled: exportFormData.enabled,
    permissionType: exportFormData.permissionType,
    allowedRoles: exportFormData.allowedRoles,
    whitelist: exportFormData.whitelist,
    allowedFormats: exportFormData.allowedFormats,
    dailyLimit: exportFormData.dailyLimit
  }

  localStorage.setItem('crm_performance_export_config', JSON.stringify(exportConfig))
  ElMessage.success('导出权限设置已保存并全局生效')
}

// 恢复导出默认配置
const resetExportConfig = () => {
  if (!isSuperAdmin.value) {
    ElMessage.warning('仅超级管理员可以修改设置')
    return
  }

  exportFormData.enabled = true
  exportFormData.permissionType = 'all'
  exportFormData.allowedRoles = ['super_admin', 'admin', 'department_manager', 'sales']
  exportFormData.whitelist = []
  exportFormData.allowedFormats = ['xlsx']
  exportFormData.dailyLimit = 0

  saveExportConfig()
  ElMessage.success('已恢复默认设置')
}

// 预览分享
const previewShare = () => {
  router.push('/performance/personal')
  ElMessage.info('请在个人业绩页面点击"分享业绩"按钮查看效果')
}

// 加载导出统计
const loadExportStats = () => {
  const statsStr = localStorage.getItem('crm_performance_export_stats')
  if (statsStr) {
    try {
      const stats = JSON.parse(statsStr)
      const today = new Date().toISOString().split('T')[0]
      const thisWeek = getWeekNumber(new Date())
      const thisMonth = new Date().toISOString().slice(0, 7)

      exportStats.todayCount = stats[today] || 0
      exportStats.weekCount = Object.keys(stats)
        .filter(date => getWeekNumber(new Date(date)) === thisWeek)
        .reduce((sum, date) => sum + (stats[date] || 0), 0)
      exportStats.monthCount = Object.keys(stats)
        .filter(date => date.startsWith(thisMonth))
        .reduce((sum, date) => sum + (stats[date] || 0), 0)
    } catch (error) {
      console.error('加载导出统计失败:', error)
    }
  }
}

// 获取周数
const getWeekNumber = (date: Date) => {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

// 初始化
onMounted(() => {
  // 加载分享配置
  Object.assign(shareFormData, configStore.performanceShareConfig)

  // 加载导出配置
  const exportConfigStr = localStorage.getItem('crm_performance_export_config')
  if (exportConfigStr) {
    try {
      const exportConfig = JSON.parse(exportConfigStr)
      Object.assign(exportFormData, exportConfig)
    } catch (error) {
      console.error('加载导出配置失败:', error)
    }
  }

  // 加载导出统计
  loadExportStats()
})
</script>

<style scoped>
.performance-share-settings {
  padding: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.form-item-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
  line-height: 1.5;
}

.preview-section {
  padding: 20px 0;
}

.preview-section h3 {
  margin: 0 0 8px 0;
  font-size: 16px;
  color: #303133;
}

.preview-tip {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #606266;
}

.stats-section {
  padding: 20px 0;
}

.stats-section h3 {
  margin: 0 0 16px 0;
  font-size: 16px;
  color: #303133;
}
</style>
