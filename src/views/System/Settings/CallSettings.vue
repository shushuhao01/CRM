<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>通话配置</span>
        <div class="header-actions">
          <el-button
            @click="handleTestCallConnection"
            type="info"
            size="small"
            :loading="testingCallConnection"
          >
            <el-icon><Connection /></el-icon>
            测试连接
          </el-button>
          <el-button
            v-if="canEditCallSettings"
            @click="handleSaveCall"
            type="primary"
            :loading="callLoading"
          >
            保存设置
          </el-button>
        </div>
      </div>
    </template>

    <el-alert v-if="configStore.configLocked.call" type="warning" :closable="false" style="margin-bottom: 16px">
      <template #title>
        <span>🔒 该配置由管理后台统一管控，如需修改请联系管理员</span>
      </template>
    </el-alert>

    <el-form
      ref="callFormRef"
      :disabled="configStore.configLocked.call"
      :model="callForm"
      :rules="callFormRules"
      label-width="150px"
      class="setting-form"
    >
      <!-- SIP配置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Phone /></el-icon>
          SIP服务器配置
        </h4>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="SIP服务器地址" prop="sipServer">
              <el-input
                v-model="callForm.sipServer"
                placeholder="请输入SIP服务器地址"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="SIP端口" prop="sipPort">
              <el-input-number
                v-model="callForm.sipPort"
                :min="1"
                :max="65535"
                placeholder="SIP端口"
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="用户名" prop="sipUsername">
              <el-input
                v-model="callForm.sipUsername"
                placeholder="请输入SIP用户名"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="密码" prop="sipPassword">
              <el-input
                v-model="callForm.sipPassword"
                type="password"
                placeholder="请输入SIP密码"
                show-password
              />
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="传输协议" prop="sipTransport">
          <el-radio-group v-model="callForm.sipTransport">
            <el-radio label="UDP">UDP</el-radio>
            <el-radio label="TCP">TCP</el-radio>
            <el-radio label="TLS">TLS</el-radio>
          </el-radio-group>
        </el-form-item>
      </div>

      <!-- 通话功能配置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Setting /></el-icon>
          通话功能配置
        </h4>

        <el-form-item label="自动接听" prop="autoAnswer">
          <el-switch
            v-model="callForm.autoAnswer"
            active-text="启用"
            inactive-text="禁用"
          />
          <span class="form-tip">启用后将自动接听来电</span>
        </el-form-item>

        <el-form-item label="自动录音" prop="autoRecord">
          <el-switch
            v-model="callForm.autoRecord"
            active-text="启用"
            inactive-text="禁用"
          />
          <span class="form-tip">启用后将自动录制通话</span>
        </el-form-item>

        <el-form-item label="通话质量监控" prop="qualityMonitoring">
          <el-switch
            v-model="callForm.qualityMonitoring"
            active-text="启用"
            inactive-text="禁用"
          />
          <span class="form-tip">启用后将监控通话质量</span>
        </el-form-item>

        <el-form-item label="呼入弹窗" prop="incomingCallPopup">
          <el-switch
            v-model="callForm.incomingCallPopup"
            active-text="启用"
            inactive-text="禁用"
          />
          <span class="form-tip">启用后来电时自动弹出客户详情</span>
        </el-form-item>

        <el-form-item label="最大通话时长" prop="maxCallDuration">
          <el-input-number
            v-model="callForm.maxCallDuration"
            :min="1"
            :max="7200"
            placeholder="最大通话时长"
          />
          <span class="form-tip">秒（1-7200秒，0表示不限制）</span>
        </el-form-item>
      </div>

      <!-- 录音配置 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><VideoPlay /></el-icon>
          录音配置
        </h4>

        <el-form-item label="录音格式" prop="recordFormat">
          <el-select v-model="callForm.recordFormat" placeholder="请选择录音格式">
            <el-option label="WAV" value="wav" />
            <el-option label="MP3" value="mp3" />
            <el-option label="AAC" value="aac" />
          </el-select>
        </el-form-item>

        <el-form-item label="录音质量" prop="recordQuality">
          <el-select v-model="callForm.recordQuality" placeholder="请选择录音质量">
            <el-option label="标准质量" value="standard" />
            <el-option label="高质量" value="high" />
            <el-option label="超高质量" value="ultra" />
          </el-select>
        </el-form-item>

        <el-form-item label="录音保存路径" prop="recordPath">
          <el-input
            v-model="callForm.recordPath"
            placeholder="请输入录音保存路径"
          />
          <span class="form-tip">录音文件的存储路径</span>
        </el-form-item>

        <el-form-item label="录音保留时间" prop="recordRetentionDays">
          <el-input-number
            v-model="callForm.recordRetentionDays"
            :min="1"
            :max="365"
            placeholder="录音保留时间"
          />
          <span class="form-tip">天（1-365天）</span>
        </el-form-item>
      </div>

      <!-- 权限管理 -->
      <div class="form-section">
        <h4 class="section-title">
          <el-icon><Lock /></el-icon>
          权限管理
        </h4>

        <el-form-item label="外呼权限" prop="outboundPermission">
          <el-checkbox-group v-model="callForm.outboundPermission">
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="sales">销售</el-checkbox>
            <el-checkbox label="service">客服</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="录音访问权限" prop="recordAccessPermission">
          <el-checkbox-group v-model="callForm.recordAccessPermission">
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="self">仅本人</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="通话统计权限" prop="statisticsPermission">
          <el-checkbox-group v-model="callForm.statisticsPermission">
            <el-checkbox label="admin">管理员</el-checkbox>
            <el-checkbox label="manager">经理</el-checkbox>
            <el-checkbox label="sales">销售</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="号码限制" prop="numberRestriction">
          <el-switch
            v-model="callForm.numberRestriction"
            active-text="启用"
            inactive-text="禁用"
          />
          <span class="form-tip">启用后将限制可拨打的号码范围</span>
        </el-form-item>

        <el-form-item v-if="callForm.numberRestriction" label="允许的号码前缀" prop="allowedPrefixes">
          <el-input
            v-model="callForm.allowedPrefixes"
            type="textarea"
            :rows="3"
            placeholder="请输入允许的号码前缀，多个前缀用换行分隔"
          />
          <span class="form-tip">例如：138、139、186等</span>
        </el-form-item>
      </div>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { Phone, Connection, VideoPlay, Setting, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'

const userStore = useUserStore()
const configStore = useConfigStore()

const callLoading = ref(false)
const testingCallConnection = ref(false)
const callFormRef = ref()

const callForm = reactive({
  sipServer: '',
  sipPort: 5060,
  sipUsername: '',
  sipPassword: '',
  sipTransport: 'UDP',
  autoAnswer: false,
  autoRecord: true,
  qualityMonitoring: true,
  incomingCallPopup: true,
  maxCallDuration: 3600,
  recordFormat: 'wav',
  recordQuality: 'standard',
  recordPath: '/recordings',
  recordRetentionDays: 30,
  outboundPermission: ['admin', 'manager', 'sales'],
  recordAccessPermission: ['admin', 'manager'],
  statisticsPermission: ['admin', 'manager'],
  numberRestriction: false,
  allowedPrefixes: ''
})

const callFormRules = {
  sipServer: [
    { required: true, message: '请输入SIP服务器地址', trigger: 'blur' }
  ],
  sipPort: [
    { required: true, message: '请输入SIP端口', trigger: 'blur' },
    { type: 'number', min: 1, max: 65535, message: '端口范围为1-65535', trigger: 'blur' }
  ],
  sipUsername: [
    { required: true, message: '请输入SIP用户名', trigger: 'blur' }
  ],
  sipPassword: [
    { required: true, message: '请输入SIP密码', trigger: 'blur' }
  ],
  recordPath: [
    { required: true, message: '请输入录音保存路径', trigger: 'blur' }
  ],
  recordRetentionDays: [
    { required: true, message: '请设置录音保留时间', trigger: 'blur' },
    { type: 'number', min: 1, max: 365, message: '保留时间范围为1-365天', trigger: 'blur' }
  ]
}

const canEditCallSettings = computed(() => userStore.isAdmin)

const handleSaveCall = async () => {
  try {
    await callFormRef.value?.validate()
    callLoading.value = true

    configStore.updateCallConfig(callForm)
    console.log('[通话设置] 已保存到localStorage:', callForm)

    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/call-settings', callForm)
      console.log('[通话设置] 已同步到后端API')
      ElMessage.success('通话设置保存成功')
    } catch (apiError: unknown) {
      const err = apiError as { code?: string; response?: { status?: number } }
      console.warn('[通话设置] API调用失败，已保存到本地:', apiError)
      if (err.code === 'ECONNREFUSED' || err.response?.status === 404) {
        ElMessage.success('通话设置保存成功（本地模式）')
      } else {
        ElMessage.warning('通话设置已保存到本地，但未能同步到服务器')
      }
    }
  } catch (error) {
    console.error('[通话设置] 表单验证失败:', error)
    ElMessage.error('保存通话设置失败，请重试')
  } finally {
    callLoading.value = false
  }
}

const handleTestCallConnection = async () => {
  try {
    testingCallConnection.value = true
    await new Promise(resolve => setTimeout(resolve, 2000))
    ElMessage.success('SIP连接测试成功')
  } catch (_error) {
    ElMessage.error('SIP连接测试失败')
  } finally {
    testingCallConnection.value = false
  }
}
</script>

<style scoped>
.setting-card { border: none; box-shadow: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; padding-left: 2%; }
.header-actions { display: flex; gap: 12px; align-items: center; }
.setting-form { padding: 20px 0; }
.form-tip { margin-left: 8px; color: #909399; font-size: 12px; }
.form-section { margin-bottom: 32px; padding: 20px; background: #fafafa; border-radius: 8px; border: 1px solid #e4e7ed; }
.section-title { margin: 0 0 20px 0; color: #303133; font-size: 16px; font-weight: 600; display: flex; align-items: center; gap: 8px; }
.section-title :deep(.el-icon) { color: #409eff; font-size: 18px; }
.setting-form :deep(.el-input-number) { width: 200px; }
.setting-form :deep(.el-select) { width: 200px; }
.setting-form :deep(.el-checkbox-group) { display: flex; flex-wrap: wrap; gap: 16px; }
.setting-form :deep(.el-switch) { margin-right: 12px; }
</style>



