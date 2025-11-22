<template>
  <el-dialog
    v-model="dialogVisible"
    title="顺丰快递配置"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <el-form
      ref="formRef"
      :model="formData"
      :rules="rules"
      label-width="120px"
    >
      <el-alert
        title="顺丰丰桥平台配置"
        type="info"
        :closable="false"
        style="margin-bottom: 20px"
      >
        <template #default>
          <div style="font-size: 13px; line-height: 1.8">
            <p style="margin: 0 0 8px 0"><strong>配置步骤:</strong></p>
            <p style="margin: 0 0 4px 0">1. 登录 <a href="https://qiao.sf-express.com" target="_blank" style="color: #409eff">顺丰丰桥平台</a></p>
            <p style="margin: 0 0 4px 0">2. 创建应用,获取 partnerID 和 checkWord</p>
            <p style="margin: 0 0 4px 0">3. 填入下方配置信息并测试连接</p>
            <p style="margin: 8px 0 0 0; font-size: 12px; color: #e6a23c">
              <strong>⚠️ 重要提示:</strong> API地址必须包含完整路径 /std/service
            </p>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #909399">
              <strong>环境说明:</strong> 测试环境用于开发调试，生产环境用于正式业务
            </p>
          </div>
        </template>
      </el-alert>

      <el-form-item label="应用ID" prop="appId">
        <el-input
          v-model="formData.appId"
          placeholder="请输入顺丰应用ID"
          clearable
        >
          <template #prepend>
            <el-icon><Key /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">从丰桥平台获取的 partnerID</div>
      </el-form-item>

      <el-form-item label="校验码" prop="checkWord">
        <el-input
          v-model="formData.checkWord"
          type="password"
          placeholder="请输入校验码"
          show-password
          clearable
        >
          <template #prepend>
            <el-icon><Lock /></el-icon>
          </template>
        </el-input>
        <div class="form-tip">从丰桥平台获取的 checkWord</div>
      </el-form-item>

      <el-form-item label="API地址" prop="apiUrl">
        <el-select
          v-model="formData.apiUrl"
          placeholder="请选择API环境"
          style="width: 100%"
        >
          <el-option
            label="生产环境"
            value="https://sfapi.sf-express.com/std/service"
          >
            <div style="display: flex; flex-direction: column">
              <span style="font-weight: 500">生产环境</span>
              <span style="font-size: 12px; color: #909399">https://sfapi.sf-express.com/std/service</span>
            </div>
          </el-option>
          <el-option
            label="测试环境"
            value="https://sfapi-sbox.sf-express.com/std/service"
          >
            <div style="display: flex; flex-direction: column">
              <span style="font-weight: 500">测试环境</span>
              <span style="font-size: 12px; color: #909399">https://sfapi-sbox.sf-express.com/std/service</span>
            </div>
          </el-option>
        </el-select>
        <div class="form-tip">
          <strong>重要:</strong> 必须使用完整路径 /std/service，测试环境用于开发调试，生产环境用于正式业务
        </div>
      </el-form-item>

      <el-form-item label="启用状态">
        <el-switch
          v-model="formData.enabled"
          active-text="启用"
          inactive-text="禁用"
        />
      </el-form-item>

      <el-divider />

      <el-form-item label="测试连接">
        <el-button
          @click="handleTestConnection"
          :loading="testing"
          :disabled="!canTest"
        >
          <el-icon><Connection /></el-icon>
          测试连接
        </el-button>
        <span v-if="testResult.status" :class="['test-result', testResult.status]">
          {{ testResult.message }}
        </span>
      </el-form-item>
    </el-form>

    <template #footer>
      <span class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button
          @click="handleSave"
          type="primary"
          :loading="saving"
          :disabled="!testResult.success"
        >
          保存配置
        </el-button>
      </span>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Key, Lock, Connection } from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'

// Props
interface Props {
  visible: boolean
  config?: SFExpressConfig
}

interface SFExpressConfig {
  appId: string
  checkWord: string
  apiUrl: string
  enabled: boolean
}

const props = withDefaults(defineProps<Props>(), {
  visible: false,
  config: undefined
})

// Emits
const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void
  (e: 'success', config: SFExpressConfig): void
}>()

// Refs
const formRef = ref<FormInstance>()
const dialogVisible = ref(false)
const saving = ref(false)
const testing = ref(false)

// Form data
const formData = reactive<SFExpressConfig>({
  appId: '',
  checkWord: '',
  apiUrl: 'https://sfapi-sbox.sf-express.com/std/service', // 默认使用测试环境完整路径
  enabled: true
})

// Test result
const testResult = reactive({
  status: '' as 'success' | 'error' | '',
  message: '',
  success: false
})

// Validation rules
const rules: FormRules = {
  appId: [
    { required: true, message: '请输入应用ID', trigger: 'blur' },
    { min: 3, message: '应用ID长度不能少于3位', trigger: 'blur' }
  ],
  checkWord: [
    { required: true, message: '请输入校验码', trigger: 'blur' },
    { min: 6, message: '校验码长度不能少于6位', trigger: 'blur' }
  ],
  apiUrl: [
    { required: true, message: '请输入API地址', trigger: 'blur' },
    { type: 'url', message: '请输入正确的URL格式', trigger: 'blur' }
  ]
}

// Computed
const canTest = computed(() => {
  return formData.appId && formData.checkWord && formData.apiUrl
})

// Watch
watch(() => props.visible, (val) => {
  dialogVisible.value = val
  if (val && props.config) {
    Object.assign(formData, props.config)
  }
})

watch(dialogVisible, (val) => {
  emit('update:visible', val)
})

// 重置测试结果
watch([() => formData.appId, () => formData.checkWord, () => formData.apiUrl], () => {
  testResult.status = ''
  testResult.message = ''
  testResult.success = false
})

/**
 * 测试连接
 */
const handleTestConnection = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    ElMessage.warning('请先填写完整的配置信息')
    return
  }

  testing.value = true
  testResult.status = ''
  testResult.message = ''
  testResult.success = false

  try {
    // 调用后端API测试连接
    const response = await fetch('/api/v1/sf-express/test-connection', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        appId: formData.appId,
        checkWord: formData.checkWord,
        apiUrl: formData.apiUrl
      })
    })

    // 先获取响应文本
    const text = await response.text()
    console.log('响应文本:', text)

    // 尝试解析JSON
    let result
    try {
      result = JSON.parse(text)
    } catch (e) {
      console.error('JSON解析失败:', e)
      testResult.status = 'error'
      testResult.message = '✗ 服务器响应格式错误'
      testResult.success = false
      ElMessage.error('服务器响应格式错误,请查看控制台')
      return
    }

    if (result.success) {
      testResult.status = 'success'
      testResult.message = '✓ 连接成功!'
      testResult.success = true
      ElMessage.success('顺丰API连接测试成功')
    } else {
      testResult.status = 'error'
      testResult.message = `✗ 连接失败: ${result.message || '未知错误'}`
      testResult.success = false
      ElMessage.error('连接测试失败,请检查配置信息')
    }
  } catch (error: any) {
    console.error('测试连接失败:', error)
    testResult.status = 'error'
    testResult.message = '✗ 连接失败: ' + (error?.message || '网络错误')
    testResult.success = false
    ElMessage.error('连接测试失败: ' + (error?.message || '网络错误'))
  } finally {
    testing.value = false
  }
}

/**
 * 保存配置
 */
const handleSave = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()
  } catch {
    return
  }

  if (!testResult.success) {
    ElMessage.warning('请先测试连接成功后再保存')
    return
  }

  saving.value = true

  try {
    // 保存到localStorage
    const config = {
      appId: formData.appId,
      checkWord: formData.checkWord,
      apiUrl: formData.apiUrl,
      enabled: formData.enabled,
      updatedAt: new Date().toISOString()
    }

    localStorage.setItem('sf_express_config', JSON.stringify(config))

    ElMessage.success('顺丰配置保存成功')
    emit('success', config)
    handleClose()
  } catch (error) {
    console.error('保存配置失败:', error)
    ElMessage.error('保存配置失败')
  } finally {
    saving.value = false
  }
}

/**
 * 关闭对话框
 */
const handleClose = () => {
  dialogVisible.value = false
  formRef.value?.resetFields()
  testResult.status = ''
  testResult.message = ''
  testResult.success = false
}
</script>

<style scoped>
.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.test-result {
  margin-left: 12px;
  font-size: 13px;
  font-weight: 500;
}

.test-result.success {
  color: #67c23a;
}

.test-result.error {
  color: #f56c6c;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

:deep(.el-alert__content) {
  padding: 0;
}
</style>
