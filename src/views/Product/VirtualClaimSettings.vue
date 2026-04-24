<template>
  <div class="virtual-claim-settings-page">
    <div class="page-header">
      <h2>虚拟商品领取配置</h2>
      <p class="page-desc">配置客户领取虚拟商品的方式、链接有效期、登录验证方式等</p>
    </div>

    <el-card class="settings-card" v-loading="loading">
      <template #header>
        <div class="card-header-row">
          <el-icon><Setting /></el-icon>
          基础配置
        </div>
      </template>

      <el-form :model="form" label-width="140px" label-position="left" size="default">

        <el-divider content-position="left">领取链接设置</el-divider>

        <el-form-item label="领取链接有效期">
          <el-input-number
            v-model="form.claimLinkExpiryDays"
            :min="1"
            :max="365"
            style="width: 160px;"
          />
          <span style="margin-left: 8px; color: #909399;">天（从发货之日起计算）</span>
        </el-form-item>

        <el-form-item label="客户登录方式">
          <el-radio-group v-model="form.loginMethods">
            <el-radio value="password">密码登录（默认密码）</el-radio>
            <el-radio value="sms">短信验证码</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.loginMethods === 'password'" label="默认初始密码">
          <el-input
            v-model="form.initialPassword"
            style="width: 200px;"
            placeholder="如：123456"
            show-password
          />
          <span style="margin-left: 8px; color: #909399;">客户用此密码+下单手机号登录领取</span>
        </el-form-item>

        <el-form-item label="领取页公告">
          <el-input
            v-model="form.claimPageNotice"
            type="textarea"
            :rows="3"
            placeholder="可填写使用说明、注意事项等，留空则不显示"
            style="width: 500px;"
          />
        </el-form-item>

        <el-divider content-position="left">邮件通知（可选）</el-divider>

        <el-form-item label="发货后自动邮件">
          <el-switch v-model="form.emailEnabled" />
          <span style="margin-left: 8px; color: #909399;">开启后发货完成时自动向客户发送领取链接邮件</span>
        </el-form-item>

        <template v-if="form.emailEnabled">
          <el-form-item label="邮件内容模式">
            <el-radio-group v-model="form.emailContentMode">
              <el-radio value="link">仅发领取链接（客户需自行登录查看内容）</el-radio>
              <el-radio value="direct">直接发卡密/资源（明文，无需登录）</el-radio>
            </el-radio-group>
          </el-form-item>
        </template>

        <div style="margin-top: 24px;">
          <el-button type="primary" :loading="saving" @click="saveSettings">
            <el-icon><Check /></el-icon>
            保存配置
          </el-button>
          <el-button @click="resetToDefault">恢复默认</el-button>
        </div>
      </el-form>
    </el-card>

    <!-- 领取页预览 -->
    <el-card class="preview-card" style="margin-top: 20px;">
      <template #header>
        <div class="card-header-row">
          <el-icon><View /></el-icon>
          领取页链接说明
        </div>
      </template>
      <div class="preview-content">
        <p>客户收到的领取链接格式为：</p>
        <el-tag type="info" style="font-family: monospace; font-size: 13px;">
          {{ siteOrigin }}/virtual-claim/&lt;令牌&gt;
        </el-tag>
        <p style="margin-top: 12px; color: #909399; font-size: 13px;">
          客户打开链接后输入下单手机号和{{ form.loginMethods === 'sms' ? '短信验证码' : '初始密码（' + form.initialPassword + '）' }}即可查看商品内容。
        </p>
        <p style="color: #909399; font-size: 13px;">
          链接有效期：从发货之日起 <strong>{{ form.claimLinkExpiryDays }}</strong> 天。
        </p>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Setting, Check, View } from '@element-plus/icons-vue'
import axios from 'axios'

const loading = ref(false)
const saving = ref(false)

const form = reactive({
  claimLinkExpiryDays: 30,
  loginMethods: 'password',
  initialPassword: '123456',
  claimPageNotice: '',
  emailEnabled: false,
  emailSource: 'official',
  emailContentMode: 'link',
  emailAutoSend: false
})

const siteOrigin = computed(() => window.location.origin)

const loadSettings = async () => {
  loading.value = true
  try {
    const resp = await axios.get('/api/v1/settings/virtual-claim')
    if (resp.data?.success && resp.data.data) {
      const d = resp.data.data
      form.claimLinkExpiryDays = d.claimLinkExpiryDays ?? 30
      form.loginMethods = d.loginMethods || 'password'
      form.initialPassword = d.initialPassword || '123456'
      form.claimPageNotice = d.claimPageNotice || ''
      form.emailEnabled = !!d.emailEnabled
      form.emailSource = d.emailSource || 'official'
      form.emailContentMode = d.emailContentMode || 'link'
      form.emailAutoSend = !!d.emailAutoSend
    }
  } catch (_e) {
    ElMessage.error('加载配置失败')
  } finally {
    loading.value = false
  }
}

const saveSettings = async () => {
  saving.value = true
  try {
    await axios.put('/api/v1/settings/virtual-claim', {
      claimLinkExpiryDays: form.claimLinkExpiryDays,
      loginMethods: form.loginMethods,
      initialPassword: form.initialPassword,
      claimPageNotice: form.claimPageNotice,
      emailEnabled: form.emailEnabled,
      emailSource: form.emailSource,
      emailContentMode: form.emailContentMode,
      emailAutoSend: form.emailAutoSend
    })
    ElMessage.success('配置已保存')
  } catch (_e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const resetToDefault = () => {
  form.claimLinkExpiryDays = 30
  form.loginMethods = 'password'
  form.initialPassword = '123456'
  form.claimPageNotice = ''
  form.emailEnabled = false
  form.emailContentMode = 'link'
}

onMounted(loadSettings)
</script>

<style scoped>
.virtual-claim-settings-page {
  padding: 20px;
  max-width: 900px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-header h2 {
  margin: 0 0 6px;
  color: #303133;
}

.page-desc {
  color: #909399;
  font-size: 14px;
  margin: 0;
}

.settings-card .card-header-row,
.preview-card .card-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 600;
}

.preview-content p {
  margin: 6px 0;
  color: #303133;
  font-size: 14px;
}
</style>


