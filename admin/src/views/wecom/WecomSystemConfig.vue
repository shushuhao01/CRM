<template>
  <div class="page-container">
    <el-card shadow="never">
      <template #header>
        <div class="card-header">
          <span>企微系统配置</span>
          <el-button v-permission="'wecom-management:system-config:edit'" type="primary" :loading="saving" @click="handleSave">保存配置</el-button>
        </div>
      </template>

      <el-form :model="form" label-width="160px" style="max-width: 800px" v-loading="loading">
        <!-- 全局配置 -->
        <el-divider content-position="left">全局配置</el-divider>
        <el-form-item label="启用企微模块">
          <el-switch v-model="form.global.enableWecom" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="默认授权类型">
          <el-select v-model="form.global.defaultAuthType" style="width: 200px">
            <el-option label="自建应用" value="self_built" />
            <el-option label="第三方应用" value="third_party" />
          </el-select>
        </el-form-item>
        <el-form-item label="单租户最大配置数">
          <el-input-number v-model="form.global.maxConfigsPerTenant" :min="1" :max="50" />
          <span style="margin-left: 10px; color: #909399">个</span>
        </el-form-item>
        <el-form-item label="API速率限制">
          <el-input-number v-model="form.global.apiRateLimit" :min="10" :max="100000" />
          <span style="margin-left: 10px; color: #909399">次 /</span>
          <el-input-number v-model="form.global.apiRateLimitWindow" :min="1" :max="3600" style="margin-left: 8px" />
          <span style="margin-left: 10px; color: #909399">秒</span>
        </el-form-item>

        <!-- 会话存档默认配置 -->
        <el-divider content-position="left">会话存档默认配置</el-divider>
        <el-form-item label="默认保留天数">
          <el-input-number v-model="form.chatArchive.defaultRetentionDays" :min="30" :max="3650" />
          <span style="margin-left: 10px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="最大保留天数">
          <el-input-number v-model="form.chatArchive.maxRetentionDays" :min="30" :max="3650" />
          <span style="margin-left: 10px; color: #909399">天</span>
        </el-form-item>
        <el-form-item label="默认存储方式">
          <el-select v-model="form.chatArchive.defaultStorageType" style="width: 200px">
            <el-option label="数据库" value="database" />
            <el-option label="OSS对象存储" value="oss" />
          </el-select>
        </el-form-item>
        <el-form-item label="同步间隔">
          <el-input-number v-model="form.chatArchive.syncIntervalMinutes" :min="1" :max="60" />
          <span style="margin-left: 10px; color: #909399">分钟</span>
        </el-form-item>
        <el-form-item label="单次最大拉取量">
          <el-input-number v-model="form.chatArchive.maxSyncBatchSize" :min="100" :max="10000" :step="100" />
          <span style="margin-left: 10px; color: #909399">条</span>
        </el-form-item>
        <el-form-item label="启用媒体下载">
          <el-switch v-model="form.chatArchive.enableMediaDownload" />
        </el-form-item>
        <el-form-item label="媒体存储路径">
          <el-input v-model="form.chatArchive.mediaStoragePath" placeholder="/uploads/wecom-media" style="width: 300px" />
        </el-form-item>

        <!-- OSS配置 -->
        <el-divider content-position="left">OSS存储配置</el-divider>
        <el-form-item label="云服务商">
          <el-select v-model="form.oss.provider" style="width: 200px">
            <el-option label="阿里云OSS" value="aliyun" />
            <el-option label="腾讯云COS" value="tencent" />
            <el-option label="AWS S3" value="aws" />
            <el-option label="MinIO" value="minio" />
          </el-select>
        </el-form-item>
        <el-form-item label="Region">
          <el-input v-model="form.oss.region" placeholder="如 oss-cn-guangzhou" style="width: 300px" />
        </el-form-item>
        <el-form-item label="Bucket">
          <el-input v-model="form.oss.bucket" placeholder="存储桶名称" style="width: 300px" />
        </el-form-item>
        <el-form-item label="Endpoint">
          <el-input v-model="form.oss.endpoint" placeholder="如 oss-cn-guangzhou.aliyuncs.com" style="width: 300px" />
        </el-form-item>
        <el-form-item label="AccessKey ID">
          <el-input v-model="form.oss.accessKeyId" placeholder="AccessKey ID" show-password style="width: 300px" />
        </el-form-item>
        <el-form-item label="AccessKey Secret">
          <el-input v-model="form.oss.accessKeySecret" placeholder="AccessKey Secret" show-password style="width: 300px" />
        </el-form-item>
        <el-form-item label="路径前缀">
          <el-input v-model="form.oss.pathPrefix" placeholder="wecom-archive/" style="width: 300px" />
        </el-form-item>

        <!-- 通知配置 -->
        <el-divider content-position="left">通知告警配置</el-divider>
        <el-form-item label="到期提醒">
          <el-switch v-model="form.notification.enableExpireReminder" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="提醒天数" v-if="form.notification.enableExpireReminder">
          <div style="display: flex; gap: 8px; flex-wrap: wrap">
            <el-tag
              v-for="(day, idx) in form.notification.expireReminderDays"
              :key="idx"
              closable
              @close="form.notification.expireReminderDays.splice(idx, 1)"
            >提前{{ day }}天</el-tag>
            <el-input-number
              v-model="newReminderDay"
              :min="1"
              :max="365"
              size="small"
              style="width: 120px"
              placeholder="天数"
            />
            <el-button size="small" @click="addReminderDay">添加</el-button>
          </div>
        </el-form-item>
        <el-form-item label="配额告警">
          <el-switch v-model="form.notification.enableQuotaAlert" active-text="启用" inactive-text="停用" />
        </el-form-item>
        <el-form-item label="告警阈值" v-if="form.notification.enableQuotaAlert">
          <el-input-number v-model="form.notification.quotaAlertThreshold" :min="50" :max="100" />
          <span style="margin-left: 10px; color: #909399">% 使用率触发告警</span>
        </el-form-item>
        <el-form-item label="告警邮箱">
          <el-input v-model="form.notification.alertEmail" placeholder="admin@example.com" style="width: 300px" />
        </el-form-item>
        <el-form-item label="Webhook地址">
          <el-input v-model="form.notification.alertWebhook" placeholder="企微机器人/钉钉/飞书 Webhook URL" style="width: 400px" />
        </el-form-item>

        <!-- 限流配置 -->
        <el-divider content-position="left">限流配置</el-divider>
        <el-form-item label="全局限流">
          <el-switch v-model="form.rateLimit.enableGlobal" />
        </el-form-item>
        <template v-if="form.rateLimit.enableGlobal">
          <el-form-item label="全局上限">
            <el-input-number v-model="form.rateLimit.globalMaxRequests" :min="100" :max="1000000" :step="1000" />
            <span style="margin-left: 10px; color: #909399">次 /</span>
            <el-input-number v-model="form.rateLimit.globalWindowMinutes" :min="1" :max="1440" style="margin-left: 8px" />
            <span style="margin-left: 10px; color: #909399">分钟</span>
          </el-form-item>
          <el-form-item label="单租户上限">
            <el-input-number v-model="form.rateLimit.perTenantMaxRequests" :min="10" :max="100000" :step="100" />
            <span style="margin-left: 10px; color: #909399">次 /</span>
            <el-input-number v-model="form.rateLimit.perTenantWindowMinutes" :min="1" :max="1440" style="margin-left: 8px" />
            <span style="margin-left: 10px; color: #909399">分钟</span>
          </el-form-item>
        </template>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/api/request'

const loading = ref(false)
const saving = ref(false)
const newReminderDay = ref(30)

const form = reactive({
  global: {
    enableWecom: true,
    defaultAuthType: 'self_built',
    maxConfigsPerTenant: 5,
    apiRateLimit: 1000,
    apiRateLimitWindow: 60
  },
  chatArchive: {
    defaultRetentionDays: 365,
    maxRetentionDays: 3650,
    defaultStorageType: 'database',
    syncIntervalMinutes: 5,
    maxSyncBatchSize: 1000,
    enableMediaDownload: true,
    mediaStoragePath: '/uploads/wecom-media'
  },
  oss: {
    provider: 'aliyun',
    region: '',
    bucket: '',
    endpoint: '',
    accessKeyId: '',
    accessKeySecret: '',
    pathPrefix: 'wecom-archive/'
  },
  notification: {
    enableExpireReminder: true,
    expireReminderDays: [30, 14, 7, 3, 1] as number[],
    enableQuotaAlert: true,
    quotaAlertThreshold: 90,
    alertEmail: '',
    alertWebhook: ''
  },
  rateLimit: {
    enableGlobal: true,
    globalMaxRequests: 10000,
    globalWindowMinutes: 60,
    perTenantMaxRequests: 1000,
    perTenantWindowMinutes: 60
  }
})

const addReminderDay = () => {
  if (newReminderDay.value && !form.notification.expireReminderDays.includes(newReminderDay.value)) {
    form.notification.expireReminderDays.push(newReminderDay.value)
    form.notification.expireReminderDays.sort((a: number, b: number) => b - a)
  }
}

const fetchConfig = async () => {
  loading.value = true
  try {
    const res = await request.get('/wecom-management/system-config')
    if (res.data) {
      const d = res.data
      if (d.global) Object.assign(form.global, d.global)
      if (d.chatArchive) Object.assign(form.chatArchive, d.chatArchive)
      if (d.oss) Object.assign(form.oss, d.oss)
      if (d.notification) {
        Object.assign(form.notification, d.notification)
        if (Array.isArray(d.notification.expireReminderDays)) {
          form.notification.expireReminderDays = [...d.notification.expireReminderDays]
        }
      }
      if (d.rateLimit) Object.assign(form.rateLimit, d.rateLimit)
    }
  } catch (e) {
    console.error('Fetch system config error:', e)
  } finally {
    loading.value = false
  }
}

const handleSave = async () => {
  saving.value = true
  try {
    // 脱敏处理：如果 AccessKey 值为 ****** 则不提交
    const payload = JSON.parse(JSON.stringify(form))
    if (payload.oss.accessKeyId === '******') delete payload.oss.accessKeyId
    if (payload.oss.accessKeySecret === '******') delete payload.oss.accessKeySecret

    await request.put('/wecom-management/system-config', payload)
    ElMessage.success('企微系统配置已保存')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchConfig())
</script>

<style scoped>
.page-container { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
</style>


