<template>
  <div class="features-header">
    <div class="features-title">
      <div>
        <h3>功能模块控制</h3>
        <p>控制CRM系统功能模块的可见性，SaaS租户和私有部署可分别配置</p>
      </div>
    </div>
  </div>

  <el-row :gutter="24" class="feature-flags-container">
    <el-col :span="12">
      <el-card shadow="hover" class="feature-card saas-card">
        <template #header>
          <div class="feature-card-header">
            <div class="card-title-area">
              <el-tag type="primary" effect="dark" size="small">SaaS</el-tag>
              <div class="card-title-text">
                <span class="card-title">SaaS租户配置</span>
                <span class="card-subtitle">控制SaaS租户可用的功能</span>
              </div>
            </div>
            <div class="card-actions">
              <el-button type="primary" text size="small" @click="$emit('toggle-all', 'saas', true)">全开</el-button>
              <el-divider direction="vertical" />
              <el-button type="danger" text size="small" @click="$emit('toggle-all', 'saas', false)">全关</el-button>
            </div>
          </div>
        </template>
        <FeatureSwitchGroup title="核心功能" :flags="featureFlags.saas" :items="coreItems" type="saas" @update="onUpdate" />
        <FeatureSwitchGroup title="通信设置" :flags="featureFlags.saas" :items="commItems" type="saas" @update="onUpdate" />
        <FeatureSwitchGroup title="数据管理" :flags="featureFlags.saas" :items="dataItems" type="saas" @update="onUpdate" />
        <FeatureSwitchGroup title="其他功能" :flags="featureFlags.saas" :items="otherItems" type="saas" @update="onUpdate" />
      </el-card>
    </el-col>
    <el-col :span="12">
      <el-card shadow="hover" class="feature-card private-card">
        <template #header>
          <div class="feature-card-header">
            <div class="card-title-area">
              <el-tag type="success" effect="dark" size="small">私有</el-tag>
              <div class="card-title-text">
                <span class="card-title">私有部署配置</span>
                <span class="card-subtitle">控制私有部署客户可用的功能</span>
              </div>
            </div>
            <div class="card-actions">
              <el-button type="primary" text size="small" @click="$emit('toggle-all', 'private', true)">全开</el-button>
              <el-divider direction="vertical" />
              <el-button type="danger" text size="small" @click="$emit('toggle-all', 'private', false)">全关</el-button>
            </div>
          </div>
        </template>
        <FeatureSwitchGroup title="核心功能" :flags="featureFlags.private" :items="coreItems" type="private" @update="onUpdate" />
        <FeatureSwitchGroup title="通信设置" :flags="featureFlags.private" :items="commItems" type="private" @update="onUpdate" />
        <FeatureSwitchGroup title="数据管理" :flags="featureFlags.private" :items="dataItems" type="private" @update="onUpdate" />
        <FeatureSwitchGroup title="其他功能" :flags="featureFlags.private" :items="otherItems" type="private" @update="onUpdate" />
      </el-card>
    </el-col>
  </el-row>

  <div class="feature-save-area">
    <el-button type="primary" size="large" round @click="$emit('save')" :loading="saving">
      <el-icon><Check /></el-icon>保存功能开关配置
    </el-button>
  </div>
</template>

<script setup lang="ts">
import { markRaw } from 'vue'
import { Check, Lock, FolderOpened, Goods, Document, Phone, Message, ChatDotRound, Bell, Upload, Notebook, DataLine, DocumentChecked, Cellphone, Connection, Setting } from '@element-plus/icons-vue'
import FeatureSwitchGroup from './FeatureSwitchGroup.vue'

interface FeatureItem {
  key: string
  name: string
  desc: string
  icon: any
}

const coreItems: FeatureItem[] = [
  { key: 'security', name: '安全设置', desc: '登录安全、密码策略', icon: markRaw(Lock) },
  { key: 'storage', name: '存储设置', desc: '文件存储、云存储', icon: markRaw(FolderOpened) },
  { key: 'product', name: '商品设置', desc: '商品分类、SKU管理', icon: markRaw(Goods) },
  { key: 'order', name: '订单设置', desc: '订单流程、审批规则', icon: markRaw(Document) },
]
const commItems: FeatureItem[] = [
  { key: 'call', name: '通话设置', desc: '电话外呼、通话录音', icon: markRaw(Phone) },
  { key: 'email', name: '邮件设置', desc: 'SMTP、邮件模板', icon: markRaw(Message) },
  { key: 'sms', name: '短信设置', desc: '短信通道、模板', icon: markRaw(ChatDotRound) },
  { key: 'notification', name: '通知设置', desc: '消息推送、规则', icon: markRaw(Bell) },
]
const dataItems: FeatureItem[] = [
  { key: 'backup', name: '数据备份', desc: '自动备份、数据恢复', icon: markRaw(Upload) },
  { key: 'logs', name: '系统日志', desc: '操作日志、审计追踪', icon: markRaw(Notebook) },
  { key: 'monitor', name: '系统监控', desc: '性能监控、告警通知', icon: markRaw(DataLine) },
]
const otherItems: FeatureItem[] = [
  { key: 'agreement', name: '用户协议', desc: '服务条款、隐私政策', icon: markRaw(DocumentChecked) },
  { key: 'mobile', name: '移动应用', desc: 'APP下载、移动配置', icon: markRaw(Cellphone) },
  { key: 'apiManagement', name: '接口管理', desc: 'API密钥、接口权限', icon: markRaw(Connection) },
  { key: 'superAdminPanel', name: '超管面板', desc: '超级管理员权限配置面板', icon: markRaw(Setting) },
]

defineProps<{
  featureFlags: {
    saas: Record<string, boolean>
    private: Record<string, boolean>
  }
  saving: boolean
}>()

const emit = defineEmits<{
  'toggle-all': [type: string, value: boolean]
  'save': []
  'update': [type: string, key: string, value: boolean]
}>()

const onUpdate = (type: string, key: string, value: boolean) => {
  emit('update', type, key, value)
}
</script>

<style scoped lang="scss">
.features-header {
  margin-bottom: 24px;
}
.features-title {
  h3 {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 4px 0;
  }
  p {
    font-size: 13px;
    color: #909399;
    margin: 0;
  }
}
.feature-flags-container {
  margin-bottom: 24px;
}
.feature-card {
  border-radius: 12px;
  height: 100%;
  :deep(.el-card__header) {
    padding: 16px 20px;
    border-bottom: 1px solid #f0f0f0;
  }
  :deep(.el-card__body) {
    padding: 20px;
  }
}
.feature-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.card-title-area {
  display: flex;
  align-items: center;
  gap: 10px;
}
.card-title-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}
.card-subtitle {
  font-size: 12px;
  color: #909399;
}
.card-actions {
  display: flex;
  align-items: center;
}
.feature-save-area {
  text-align: center;
  padding: 20px 0;
}
</style>
