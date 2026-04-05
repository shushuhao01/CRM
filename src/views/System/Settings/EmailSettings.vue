<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>邮件配置</span>
        <div class="header-actions">
          <el-button
            v-if="canEditEmailSettings"
            @click="handleTestEmail"
            :loading="testEmailLoading"
          >
            测试邮件
          </el-button>
          <el-button
            v-if="canEditEmailSettings"
            @click="handleSaveEmail"
            type="primary"
            :loading="emailLoading"
          >
            保存设置
          </el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.email" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

    <el-form
      ref="emailFormRef"
      :disabled="configStore.configLocked.email"
      :model="emailForm"
      :rules="emailFormRules"
      label-width="120px"
      class="setting-form"
    >
      <el-form-item label="SMTP服务器" prop="smtpHost">
        <el-input v-model="emailForm.smtpHost" placeholder="请输入SMTP服务器地址" />
      </el-form-item>

      <el-form-item label="SMTP端口" prop="smtpPort">
        <el-input-number v-model="emailForm.smtpPort" :min="1" :max="65535" placeholder="SMTP端口" />
      </el-form-item>

      <el-form-item label="发件人邮箱" prop="senderEmail">
        <el-input v-model="emailForm.senderEmail" placeholder="请输入发件人邮箱" />
      </el-form-item>

      <el-form-item label="发件人名称" prop="senderName">
        <el-input v-model="emailForm.senderName" placeholder="请输入发件人名称" />
      </el-form-item>

      <el-form-item label="邮箱密码" prop="emailPassword">
        <el-input v-model="emailForm.emailPassword" type="password" placeholder="请输入邮箱密码或授权码" show-password />
      </el-form-item>

      <el-form-item label="启用SSL" prop="enableSsl">
        <el-switch v-model="emailForm.enableSsl" active-text="启用" inactive-text="禁用" />
      </el-form-item>

      <el-form-item label="启用TLS" prop="enableTls">
        <el-switch v-model="emailForm.enableTls" active-text="启用" inactive-text="禁用" />
      </el-form-item>

      <el-form-item label="测试邮箱" prop="testEmail">
        <el-input v-model="emailForm.testEmail" placeholder="请输入测试邮箱地址" />
        <div class="form-tip">用于测试邮件发送功能</div>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const emailLoading = ref(false)
const testEmailLoading = ref(false)
const emailFormRef = ref()

const emailForm = reactive({
  smtpHost: '',
  smtpPort: 587,
  senderEmail: '',
  senderName: 'CRM系统',
  emailPassword: '',
  enableSsl: false,
  enableTls: true,
  testEmail: ''
})

// 页面加载时从后端获取已保存的邮件配置
const loadEmailSettings = async () => {
  try {
    const { apiService } = await import('@/services/apiService')
    const res = await apiService.get('/system/email-settings')
    if (res && res.data) {
      const data = res.data
      emailForm.smtpHost = data.smtpHost || ''
      emailForm.smtpPort = data.smtpPort || 587
      emailForm.senderEmail = data.senderEmail || ''
      emailForm.senderName = data.senderName || 'CRM系统'
      emailForm.emailPassword = data.emailPassword || ''
      emailForm.enableSsl = data.enableSsl ?? false
      emailForm.enableTls = data.enableTls ?? true
      emailForm.testEmail = data.testEmail || ''
    }
  } catch (e) {
    console.warn('[邮件设置] 加载配置失败，使用默认值:', e)
  }
}

onMounted(() => {
  loadEmailSettings()
})

const emailFormRules = {
  smtpHost: [{ required: true, message: '请输入SMTP服务器', trigger: 'blur' }],
  smtpPort: [{ required: true, message: '请输入SMTP端口', trigger: 'blur' }],
  senderEmail: [
    { required: true, message: '请输入发件人邮箱', trigger: 'blur' },
    { type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }
  ],
  testEmail: [{ type: 'email', message: '请输入正确的邮箱格式', trigger: 'blur' }]
}

const canEditEmailSettings = computed(() => userStore.isAdmin)

const handleSaveEmail = async () => {
  try {
    await emailFormRef.value?.validate()
    emailLoading.value = true

    configStore.updateEmailConfig(emailForm)
    console.log('[邮件设置] 已保存到localStorage:', emailForm)

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/email-settings', emailForm)
      console.log('[邮件设置] 已同步到后端API')
      ElMessage.success('邮件设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      console.warn('[邮件设置] API调用失败，已保存到本地:', apiError)
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('邮件设置保存成功（本地模式）')
      } else {
        ElMessage.warning('邮件设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[邮件设置] 表单验证失败:', error)
    ElMessage.error('保存邮件设置失败，请重试')
  } finally {
    emailLoading.value = false
  }
}

const handleTestEmail = async () => {
  if (!emailForm.testEmail) {
    ElMessage.warning('请先输入测试邮箱地址')
    return
  }
  if (!emailForm.smtpHost || !emailForm.senderEmail) {
    ElMessage.warning('请先完整填写并保存SMTP配置')
    return
  }
  try {
    testEmailLoading.value = true
    const { apiService } = await import('@/services/apiService')
    await apiService.post('/system/email-settings/test', emailForm)
    ElMessage.success('测试邮件已发送，请检查邮箱')
  } catch (error: unknown) {
    const err = error as { response?: { data?: { message?: string } } }
    ElMessage.error(err.response?.data?.message || '测试邮件发送失败，请检查配置')
  } finally {
    testEmailLoading.value = false
  }
}
</script>

<style scoped>
.setting-card { border: none; box-shadow: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding-left: 2%; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.setting-form { padding: 20px 0; }
.form-tip { display: flex; align-items: center; gap: 6px; margin-top: 8px; font-size: 12px; color: #909399; }
.setting-form :deep(.el-input-number) { width: 200px; }
.setting-form :deep(.el-switch) { margin-right: 12px; }
</style>



