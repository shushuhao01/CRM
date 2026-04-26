<template>
  <div class="page-container">
    <el-card shadow="never" class="config-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">CRM配置</span>
            <span class="subtitle">配置CRM系统的基本信息，优先级高于租户/私有部署的本地设置</span>
          </div>
          <el-button type="primary" @click="handleSave" :loading="saving">
            <el-icon><Check /></el-icon>保存配置
          </el-button>
        </div>
      </template>

      <el-alert type="warning" :closable="false" class="tip-alert">
        <template #title>
          此处配置的信息将覆盖所有租户和私有部署的系统设置。如果此处未配置，则使用各租户/私有部署自己的设置。
        </template>
      </el-alert>

      <el-tabs v-model="activeTab">
        <!-- 基本设置 -->
        <el-tab-pane label="基本设置" name="basic">
          <BasicSettingsTab :form="form" @update-qrcode="form.contactQRCode = $event" />
        </el-tab-pane>

        <!-- 用户协议 -->
        <el-tab-pane label="用户协议" name="agreement">
          <AgreementTab
            :agreement-list="agreementList"
            :saving="agreementSaving"
            @save-agreements="handleSaveAgreements"
            @update-agreement="onAgreementUpdate"
          />
        </el-tab-pane>

        <!-- 官网信息 -->
        <el-tab-pane label="官网信息" name="website">
          <WebsiteTab :form="form" @update-service-qrcode="form.websiteConfig.serviceQRCode = $event" />
        </el-tab-pane>

        <!-- 启用状态 -->
        <el-tab-pane label="启用状态" name="status">
          <StatusTab :form="form" />
        </el-tab-pane>

        <!-- 移动应用 -->
        <el-tab-pane label="移动应用" name="mobileApp">
          <MobileAppTab />
        </el-tab-pane>

        <!-- 功能开关 -->
        <el-tab-pane label="功能开关" name="features">
          <FeatureFlagsTab
            :feature-flags="form.featureFlags"
            :saving="saving"
            @toggle-all="toggleAll"
            @save="handleSave"
            @update="handleFeatureUpdate"
          />
        </el-tab-pane>
      </el-tabs>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Check } from '@element-plus/icons-vue'
import request from '@/api/request'

// 子组件
import BasicSettingsTab from './Config/BasicSettingsTab.vue'
import AgreementTab from './Config/AgreementTab.vue'
import type { AgreementItem } from './Config/AgreementTab.vue'
import WebsiteTab from './Config/WebsiteTab.vue'
import StatusTab from './Config/StatusTab.vue'
import FeatureFlagsTab from './Config/FeatureFlagsTab.vue'
import MobileAppTab from './Config/MobileAppTab.vue'

const saving = ref(false)
const activeTab = ref('basic')
const agreementSaving = ref(false)

const form = reactive({
  // 基本信息
  systemName: '', systemVersion: '', companyName: '', contactPhone: '', contactEmail: '',
  websiteUrl: '', companyAddress: '', systemDescription: '', systemLogo: '',
  contactQRCode: '', contactQRCodeLabel: '',
  // 版权信息
  copyrightText: '', icpNumber: '', policeNumber: '', techSupport: '',
  // 官网专用配置
  websiteConfig: {
    customerServiceUrl: '', serviceQRCode: '', servicePhone: '', serviceEmail: '',
    workingHours: '周一至周五 9:00-18:00', brandSlogan: '',
  },
  // 用户协议
  userAgreement: '', privacyPolicy: '',
  // 启用状态
  enableBasicOverride: false, enableCopyrightOverride: false,
  enableAgreementOverride: false, enableConsoleEncryption: false,
  featureFlags: {
    saas: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true, superAdminPanel: true },
    private: { security: true, call: true, email: true, sms: true, storage: true, product: true, monitor: true, backup: true, order: true, notification: true, agreement: true, mobile: true, logs: true, apiManagement: true, superAdminPanel: true }
  },
  distributedConfig: { security: null, call: null, email: null, sms: null, storage: null }
})

// === 默认协议内容 ===
const getDefaultUserAgreement = () => `<h2 style="text-align:center;">用户使用协议</h2><p>欢迎使用本CRM客户管理系统。请您仔细阅读并充分理解本协议的全部内容。</p>`
const getDefaultPrivacyPolicy = () => `<h2 style="text-align:center;">用户隐私协议</h2><p>本隐私协议适用于本CRM客户管理系统。我们非常重视用户的隐私保护。</p>`

const stripHtml = (html: string): string => { const tmp = document.createElement('div'); tmp.innerHTML = html; return tmp.textContent || tmp.innerText || '' }
const countWords = (html: string): number => stripHtml(html).replace(/\s/g, '').length
const generateSummary = (html: string): string => { const text = stripHtml(html).replace(/\s+/g, ' ').trim(); return text.length > 100 ? text.substring(0, 100) + '...' : text }

const defaultUserContent = getDefaultUserAgreement()
const defaultPrivacyContent = getDefaultPrivacyPolicy()

const agreementList = ref<AgreementItem[]>([
  { id: 1, type: 'user', title: '用户使用协议', content: defaultUserContent, wordCount: countWords(defaultUserContent), summary: generateSummary(defaultUserContent), updateTime: new Date().toLocaleString('zh-CN'), enabled: true },
  { id: 2, type: 'privacy', title: '用户隐私协议', content: defaultPrivacyContent, wordCount: countWords(defaultPrivacyContent), summary: generateSummary(defaultPrivacyContent), updateTime: new Date().toLocaleString('zh-CN'), enabled: true }
])

const onAgreementUpdate = (_item: AgreementItem) => { /* 协议内容已在子组件中直接更新引用 */ }

// === 加载配置 ===
const loadConfig = async () => {
  try {
    const res = await request.get('/system-config') as any
    if (res.success && res.data) {
      const { featureFlags: apiFlags, websiteConfig: apiWebsiteConfig, ...rest } = res.data
      Object.assign(form, rest)
      if (apiWebsiteConfig && typeof apiWebsiteConfig === 'object') { Object.assign(form.websiteConfig, apiWebsiteConfig) }
      if (res.data.distributedConfig) {
        Object.keys(form.distributedConfig).forEach(key => {
          if (res.data.distributedConfig[key] !== undefined) { (form.distributedConfig as any)[key] = res.data.distributedConfig[key] }
        })
      }
      if (apiFlags && typeof apiFlags === "object") {
        if (apiFlags.saas) Object.assign(form.featureFlags.saas, apiFlags.saas)
        if (apiFlags.private) Object.assign(form.featureFlags.private, apiFlags.private)
      }
      syncAgreementListFromForm()
    }
  } catch (error) { console.error('加载配置失败:', error) }
}

// === 保存配置 ===
const toggleAll = (type: string, value: boolean) => {
  const target = (form.featureFlags as any)[type]
  Object.keys(target).forEach(key => { target[key] = value })
}

const handleFeatureUpdate = (type: string, key: string, value: boolean) => {
  (form.featureFlags as any)[type][key] = value
}

const handleSave = async () => {
  saving.value = true
  try {
    const res = await request.post('/system-config', { ...form }) as any
    if (res.success) { ElMessage.success('配置保存成功') }
    else { ElMessage.error(res.message || '保存失败') }
  } catch (error: any) { ElMessage.error(error.response?.data?.message || '保存失败') }
  finally { saving.value = false }
}

// === 用户协议管理 ===
const handleSaveAgreements = async () => {
  agreementSaving.value = true
  try {
    const userItem = agreementList.value.find(a => a.type === 'user')
    const privacyItem = agreementList.value.find(a => a.type === 'privacy')
    form.userAgreement = userItem?.enabled && userItem?.content ? userItem.content : ''
    form.privacyPolicy = privacyItem?.enabled && privacyItem?.content ? privacyItem.content : ''
    const res = await request.post('/system-config', { ...form }) as any
    if (res.success) { ElMessage.success('协议已保存，开启「启用状态→用户协议覆盖」后将下发到所有CRM客户端') }
    else { ElMessage.error(res.message || '保存失败') }
  } catch { ElMessage.error('保存失败，请稍后重试') }
  finally { agreementSaving.value = false }
}

const syncAgreementListFromForm = () => {
  const userItem = agreementList.value.find(a => a.type === 'user')
  const privacyItem = agreementList.value.find(a => a.type === 'privacy')
  if (userItem && form.userAgreement) {
    userItem.content = form.userAgreement; userItem.wordCount = countWords(form.userAgreement)
    userItem.summary = generateSummary(form.userAgreement); userItem.updateTime = '已配置'
  }
  if (privacyItem && form.privacyPolicy) {
    privacyItem.content = form.privacyPolicy; privacyItem.wordCount = countWords(form.privacyPolicy)
    privacyItem.summary = generateSummary(form.privacyPolicy); privacyItem.updateTime = '已配置'
  }
}

onMounted(() => { loadConfig() })
</script>

<style scoped lang="scss">
.page-container { min-height: 100%; }
.config-card {
  border-radius: 12px; border: none;
  :deep(.el-card__header) { border-bottom: 1px solid #f0f0f0; padding: 20px 24px; }
}
.card-header {
  display: flex; justify-content: space-between; align-items: center;
  .header-left {
    .title { font-size: 18px; font-weight: 600; color: #303133; }
    .subtitle { display: block; font-size: 13px; color: #909399; margin-top: 4px; }
  }
}
.tip-alert { margin-bottom: 20px; }
</style>
