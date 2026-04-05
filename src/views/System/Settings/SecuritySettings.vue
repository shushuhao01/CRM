<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>安全配置</span>
        <el-button
          v-if="canEditSecuritySettings"
          @click="handleSaveSecurity"
          type="primary"
          :loading="securityLoading"
        >
          保存设置
        </el-button>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.security" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

    <el-form
      ref="securityFormRef"
      :disabled="configStore.configLocked.security"
      :model="securityForm"
      :rules="securityFormRules"
      label-width="150px"
      class="setting-form"
    >
      <el-form-item label="密码最小长度" prop="passwordMinLength">
        <el-input-number
          v-model="securityForm.passwordMinLength"
          :min="6"
          :max="20"
          placeholder="密码最小长度"
        />
        <span class="form-tip">建议设置为6-20位</span>
      </el-form-item>

      <el-form-item label="密码复杂度要求" prop="passwordComplexity">
        <el-checkbox-group v-model="securityForm.passwordComplexity">
          <el-checkbox label="uppercase">包含大写字母</el-checkbox>
          <el-checkbox label="lowercase">包含小写字母</el-checkbox>
          <el-checkbox label="number">包含数字</el-checkbox>
          <el-checkbox label="special">包含特殊字符</el-checkbox>
        </el-checkbox-group>
      </el-form-item>

      <el-form-item label="密码有效期" prop="passwordExpireDays">
        <el-input-number
          v-model="securityForm.passwordExpireDays"
          :min="0"
          :max="365"
          placeholder="密码有效期"
        />
        <span class="form-tip">天（0表示永不过期）</span>
      </el-form-item>

      <el-form-item label="登录失败锁定" prop="loginFailLock">
        <el-switch
          v-model="securityForm.loginFailLock"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-form-item v-if="securityForm.loginFailLock" label="最大失败次数" prop="maxLoginFails">
        <el-input-number
          v-model="securityForm.maxLoginFails"
          :min="3"
          :max="10"
          placeholder="最大失败次数"
        />
        <span class="form-tip">次</span>
      </el-form-item>

      <el-form-item v-if="securityForm.loginFailLock" label="锁定时间" prop="lockDuration">
        <el-input-number
          v-model="securityForm.lockDuration"
          :min="5"
          :max="1440"
          placeholder="锁定时间"
        />
        <span class="form-tip">分钟</span>
      </el-form-item>

      <el-form-item label="会话超时时间" prop="sessionTimeout">
        <el-input-number
          v-model="securityForm.sessionTimeout"
          :min="30"
          :max="1440"
          placeholder="会话超时时间"
        />
        <span class="form-tip">分钟</span>
      </el-form-item>

      <el-form-item label="强制HTTPS" prop="forceHttps">
        <el-switch
          v-model="securityForm.forceHttps"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-form-item label="IP白名单" prop="ipWhitelist">
        <el-input
          v-model="securityForm.ipWhitelist"
          type="textarea"
          :rows="3"
          placeholder="请输入IP地址，多个IP用换行分隔"
        />
        <div class="form-tip">留空表示不限制IP访问</div>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const securityLoading = ref(false)
const securityFormRef = ref()

const securityForm = computed(() => configStore.securityConfig)

const securityFormRules = {
  passwordMinLength: [
    { required: true, message: '请设置密码最小长度', trigger: 'blur' }
  ],
  maxLoginFails: [
    { required: true, message: '请设置最大失败次数', trigger: 'blur' }
  ],
  lockDuration: [
    { required: true, message: '请设置锁定时间', trigger: 'blur' }
  ],
  sessionTimeout: [
    { required: true, message: '请设置会话超时时间', trigger: 'blur' }
  ]
}

const canEditSecuritySettings = computed(() => userStore.isAdmin)

const handleSaveSecurity = async () => {
  try {
    await securityFormRef.value?.validate()

    securityLoading.value = true

    configStore.updateSecurityConfig(securityForm.value)

    console.log('[安全设置] 已保存到localStorage:', securityForm.value)

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/security-settings', securityForm.value)
      console.log('[安全设置] 已同步到后端API')
      ElMessage.success('安全设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      console.warn('[安全设置] API调用失败，已保存到本地:', apiError)

      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('安全设置保存成功（本地模式）')
      } else {
        ElMessage.warning('安全设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error: unknown) {
    console.error('[安全设置] 表单验证失败:', error)
    ElMessage.error('保存安全设置失败，请重试')
  } finally {
    securityLoading.value = false
  }
}
</script>

<style scoped>
.setting-card {
  margin-bottom: 0;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-form {
  max-width: 100%;
}

.form-tip {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 8px;
  font-size: 12px;
  color: #909399;
}
</style>

