<template>
  <div class="system-settings">
    <!-- 页面头部 -->
    <div class="page-header">
      <h2>系统设置</h2>
      <p>管理系统的基础配置和操作参数</p>
    </div>

    <!-- 设置选项卡 -->
    <div class="settings-tabs-container">
      <!-- 标签页头部导航区域 -->
      <div class="tabs-nav-container">
        <div class="tabs-nav-wrapper">
          <el-tabs v-model="activeTab" class="settings-tabs" ref="tabsRef">
      <!-- 授权信息 -->
      <el-tab-pane v-if="isFeatureEnabled('license')" label="授权信息" name="license">
        <LicenseSettings />
      </el-tab-pane>

      <!-- 安全配置 -->
      <el-tab-pane v-if="isFeatureEnabled('security')" label="安全配置" name="security">
        <SecuritySettings />
      </el-tab-pane>

      <!-- 通话配置 -->
      <el-tab-pane v-if="isFeatureEnabled('call')" label="通话配置" name="call">
        <CallSettings />
      </el-tab-pane>

      <!-- 邮件配置 -->
      <el-tab-pane v-if="isFeatureEnabled('email')" label="邮件配置" name="email">
        <EmailSettings />
      </el-tab-pane>

      <!-- 短信配置 -->
      <el-tab-pane v-if="isFeatureEnabled('sms')" label="短信配置" name="sms">
        <SmsSettings />
      </el-tab-pane>

      <!-- 存储配置 -->
      <el-tab-pane v-if="isFeatureEnabled('storage')" label="存储配置" name="storage">
        <StorageSettings />
      </el-tab-pane>

      <!-- 商品配置 -->
      <el-tab-pane v-if="isFeatureEnabled('product')" label="商品配置" name="product">
        <ProductSettings />
      </el-tab-pane>

      <!-- 系统监控 -->
      <el-tab-pane
        v-if="canViewSystemMonitor && isFeatureEnabled('monitor')"
        label="系统监控"
        name="monitor"
      >
        <MonitorSettings />
      </el-tab-pane>

      <!-- 订单配置 -->
      <el-tab-pane v-if="isFeatureEnabled('order')" label="订单配置" name="order">
          <el-alert v-if="configStore.configLocked.order" type="warning" :closable="false" style="margin-bottom: 16px">
            <template #title>
              <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
            </template>
          </el-alert>

        <OrderSettings />
      </el-tab-pane>

      <!-- 客户配置 -->
      <el-tab-pane v-if="isFeatureEnabled('customer')" label="客户配置" name="customer">
        <CustomerSettings />
      </el-tab-pane>

      <!-- 数据备份 -->
      <el-tab-pane v-if="isFeatureEnabled('backup')" label="数据备份" name="backup">
        <BackupSettings />
      </el-tab-pane>

      <!--
        ========== 数据迁移选项卡（已注释） ==========
        说明：此功能是开发初期临时提供的将localStorage数据同步到数据库的功能
        由于系统已经完全使用后端API/数据库作为数据唯一来源，此功能不再需要
        如需指引参考，保留此注释即可
        注释时间：2025-12-21
      -->

      <!-- 通知配置 -->
      <el-tab-pane v-if="isFeatureEnabled('notification')" label="通知配置" name="notification">
        <HealthCheckNotificationSettings />
      </el-tab-pane>

      <!-- 🔥 批次287回滚：用户协议列表管理 -->
      <el-tab-pane v-if="isFeatureEnabled('agreement')" label="用户协议" name="agreement">
        <AgreementSettings />
      </el-tab-pane>

      <!-- 移动应用 -->
      <el-tab-pane v-if="isFeatureEnabled('mobile')" label="移动应用" name="mobile">
        <MobileSettings />
      </el-tab-pane>

      <!-- 系统日志 -->
      <el-tab-pane v-if="isFeatureEnabled('logs')" label="系统日志" name="logs">
        <LogsSettings />
      </el-tab-pane>

      <!-- 系统入口分享 -->
      <el-tab-pane v-if="userStore.isAdmin && isFeatureEnabled('entry')" label="系统入口" name="entry">
        <SystemEntryShare />
      </el-tab-pane>
        </el-tabs>
        </div>
      </div>
    </div>

    <!-- AgreementEditorDialog 已迁移到 AgreementSettings.vue -->
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import HealthCheckNotificationSettings from '@/components/HealthCheckNotificationSettings.vue'
import OrderSettings from '@/views/Settings/OrderSettings.vue'
import CustomerSettings from '@/views/Settings/CustomerSettings.vue'
import SecuritySettings from './SecuritySettings.vue'
import LicenseSettings from './LicenseSettings.vue'
import CallSettings from './CallSettings.vue'
import EmailSettings from './EmailSettings.vue'
import SmsSettings from './SmsSettings.vue'
import StorageSettings from './StorageSettings.vue'
import ProductSettings from './ProductSettings.vue'
import MonitorSettings from './MonitorSettings.vue'
import BackupSettings from './BackupSettings.vue'
import AgreementSettings from './AgreementSettings.vue'
import MobileSettings from './MobileSettings.vue'
import LogsSettings from './LogsSettings.vue'
import SystemEntryShare from './SystemEntryShare.vue'

const userStore = useUserStore()
const configStore = useConfigStore()
const route = useRoute()

// 当前激活的选项卡
const activeTab = ref('security')

// 从路由query读取默认tab
onMounted(() => {
  if (route.query.tab && typeof route.query.tab === 'string') {
    activeTab.value = route.query.tab
  }
})

// 功能开关检查
const isFeatureEnabled = (flag: string): boolean => {
  const flags = configStore.featureFlags
  if (!flags || typeof flags !== 'object') return true
  return flags[flag] !== false
}

// 系统监控访问权限
const canViewSystemMonitor = computed(() => {
  return userStore.isAdmin || userStore.isManager
})
</script>

<style scoped>
.system-settings {
  padding: 0;
}

.page-header {
  margin-bottom: 20px;
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.page-header h2 {
  margin: 0 0 8px 0;
  color: #303133;
}

.page-header p {
  margin: 0;
  color: #606266;
  font-size: 14px;
}

.settings-tabs {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

/* 标签页导航容器样式 */
.settings-tabs-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.tabs-nav-container {
  position: relative;
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #e4e7ed;
  padding: 0 8px;
  min-height: 54px;
}

.tabs-nav-wrapper {
  flex: 1;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  margin: 0 8px;
}

.tabs-nav-wrapper::-webkit-scrollbar {
  display: none;
}

.tabs-nav-wrapper .settings-tabs {
  background: transparent;
  box-shadow: none;
}

.tabs-nav-wrapper .el-tabs__header {
  margin: 0;
  border-bottom: none;
}

.tabs-nav-wrapper .el-tabs__nav-wrap {
  overflow: visible;
}

.tabs-nav-wrapper .el-tabs__nav-scroll {
  overflow: visible;
}

/* 标签页内容区域样式 */
.settings-tabs .el-tabs__content {
  padding: 20px;
  background: #fff;
  border-radius: 0 0 8px 8px;
}

/* 响应式适配 */
@media (max-width: 768px) {
  .tabs-nav-container {
    padding: 0 4px;
    min-height: 48px;
  }

  .tabs-nav-wrapper {
    margin: 0;
  }

  .settings-tabs .el-tabs__content {
    padding: 16px;
  }
}
</style>

