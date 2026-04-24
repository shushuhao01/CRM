<template>
  <div class="sms-crm-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>CRM短信配置</h2>
        <p class="header-desc">管控CRM系统的短信服务配置，开启管控后同步下发给所有客户端</p>
      </div>
      <div class="header-actions">
        <el-tag v-if="isManaged" type="success" effect="dark" round>
          <el-icon style="margin-right:4px"><Lock /></el-icon> 管控中
        </el-tag>
        <el-tag v-else type="info" effect="plain" round>
          <el-icon style="margin-right:4px"><Unlock /></el-icon> 自主管理
        </el-tag>
      </div>
    </div>

    <!-- 提示 -->
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        编辑短信配置后，开启「管控」开关，再到「配置下发」页面点击「全部同步下发」即可推送到所有CRM客户端。
      </template>
    </el-alert>

    <!-- 配置表单 -->
    <el-card class="config-card">
      <template #header>
        <div class="config-header">
          <span class="config-title">短信服务配置</span>
          <el-switch
            v-model="isManaged"
            v-permission="'sms-management:crm-config:edit'"
            active-text="管控"
            inactive-text="放开"
            inline-prompt
            style="--el-switch-on-color: #409eff; --el-switch-off-color: #dcdfe6"
            @change="handleToggleManaged"
          />
        </div>
      </template>

      <el-form :model="smsForm" label-width="140px" class="config-form">
        <el-form-item label="短信服务商">
          <el-select v-model="smsForm.provider" style="width: 100%">
            <el-option label="阿里云短信" value="aliyun" />
            <el-option label="腾讯云短信" value="tencent" />
            <el-option label="华为云短信" value="huawei" />
          </el-select>
        </el-form-item>
        <el-form-item label="AccessKey">
          <el-input v-model="smsForm.accessKey" placeholder="请输入AccessKey" />
        </el-form-item>
        <el-form-item label="SecretKey">
          <el-input v-model="smsForm.secretKey" type="password" show-password placeholder="请输入SecretKey" />
        </el-form-item>
        <el-form-item label="短信签名">
          <el-input v-model="smsForm.signName" placeholder="需在服务商平台审核通过" />
        </el-form-item>
        <el-form-item label="每日发送限制">
          <el-input-number v-model="smsForm.dailyLimit" :min="1" :max="10000" />
          <span class="form-tip">条/用户/天</span>
        </el-form-item>
        <el-form-item label="每月发送限制">
          <el-input-number v-model="smsForm.monthlyLimit" :min="1" :max="100000" />
          <span class="form-tip">条/用户/月</span>
        </el-form-item>
        <el-form-item label="启用短信功能">
          <el-switch v-model="smsForm.enabled" />
        </el-form-item>
        <el-form-item label="发送需审核">
          <el-switch v-model="smsForm.requireApproval" />
        </el-form-item>
      </el-form>

      <div class="form-actions">
        <el-button v-permission="'sms-management:crm-config:edit'" type="primary" :loading="saving" @click="saveConfig">
          <el-icon><Check /></el-icon> 保存配置
        </el-button>
        <el-button @click="loadConfig">
          <el-icon><Refresh /></el-icon> 重新加载
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Lock, Unlock, Check, Refresh } from '@element-plus/icons-vue'
import request from '@/api/request'

const saving = ref(false)
const isManaged = ref(false)

const smsForm = reactive({
  provider: 'aliyun',
  accessKey: '',
  secretKey: '',
  signName: '',
  dailyLimit: 100,
  monthlyLimit: 3000,
  enabled: false,
  requireApproval: false
})

const loadConfig = async () => {
  try {
    const res = await request.get('/system-config') as any
    if (res.success && res.data?.distributedConfig) {
      const smsConfig = res.data.distributedConfig.sms
      if (smsConfig && typeof smsConfig === 'object') {
        if (smsConfig.__draft) {
          // 草稿态 = 已编辑但未管控
          isManaged.value = false
          const { __draft, ...rest } = smsConfig
          Object.assign(smsForm, rest)
        } else {
          isManaged.value = true
          Object.assign(smsForm, smsConfig)
        }
      } else {
        isManaged.value = false
      }
    }
  } catch (e) {
    console.error('加载短信配置失败', e)
  }
}

const saveConfig = async () => {
  saving.value = true
  try {
    const getRes = await request.get('/system-config') as any
    const fullConfig = getRes.success && getRes.data ? getRes.data : {}
    if (!fullConfig.distributedConfig) {
      fullConfig.distributedConfig = { security: null, call: null, email: null, sms: null, storage: null }
    }

    const formData = { ...smsForm }
    if (isManaged.value) {
      fullConfig.distributedConfig.sms = formData
    } else {
      fullConfig.distributedConfig.sms = { ...formData, __draft: true }
    }

    const res = await request.post('/system-config', fullConfig) as any
    if (res.success) {
      ElMessage.success('短信配置已保存')
    } else {
      ElMessage.error(res.message || '保存失败')
    }
  } catch (e) {
    ElMessage.error('保存失败')
  } finally {
    saving.value = false
  }
}

const handleToggleManaged = async (val: boolean) => {
  // 切换管控状态时自动保存
  await saveConfig()
  ElMessage.success(val ? '已开启短信配置管控' : '已放开短信配置自主管理')
}

onMounted(() => { loadConfig() })
</script>

<style scoped lang="scss">
.page-header {
  display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;
  h2 { margin: 0 0 4px 0; font-size: 20px; color: #303133; }
  .header-desc { margin: 0; font-size: 13px; color: #909399; }
  .header-actions { display: flex; align-items: center; gap: 10px; }
}
.config-card { border-radius: 12px; max-width: 800px; }
.config-header {
  display: flex; justify-content: space-between; align-items: center;
  .config-title { font-size: 16px; font-weight: 600; color: #303133; }
}
.config-form { max-width: 600px; }
.form-tip { margin-left: 10px; font-size: 12px; color: #909399; }
.form-actions {
  display: flex; gap: 10px; padding-top: 20px; border-top: 1px solid #f0f0f0; margin-top: 10px;
}
</style>

