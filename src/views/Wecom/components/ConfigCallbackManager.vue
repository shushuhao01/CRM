<template>
  <div class="callback-manager">
    <el-alert v-if="!configId" type="warning" :closable="false" style="margin-bottom: 16px">
      请先在基础配置中添加企微配置后再管理回调。
    </el-alert>

    <template v-else>
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        <template #title>回调配置说明</template>
        企微回调用于实时接收企业微信推送的事件通知（如客户添加/删除、群变更、客服消息等）。
        配置后需在企微管理后台「应用管理 → 接收消息 → 设置API接收」中填入回调URL、Token和EncodingAESKey。
        <br/>
        <strong>第三方应用授权</strong>模式下，回调由服务商统一配置，一般无需手动修改。
      </el-alert>

      <el-form :model="form" label-width="130px" style="max-width: 680px">
        <el-form-item label="回调URL">
          <div class="url-row">
            <el-input :model-value="callbackUrl" readonly style="flex: 1" />
            <el-button @click="copyUrl">复制</el-button>
          </div>
          <div class="form-tip">将此URL填写到企微后台「应用管理 → 接收消息 → 设置API接收」中</div>
        </el-form-item>

        <el-form-item label="Token">
          <div class="url-row">
            <el-input v-model="form.token" :type="showToken ? 'text' : 'password'" placeholder="自定义字符串" style="flex: 1" />
            <el-button @click="showToken = !showToken">{{ showToken ? '隐藏' : '显示' }}</el-button>
            <el-button type="primary" plain @click="generateRandom('token')">随机生成</el-button>
          </div>
        </el-form-item>

        <el-form-item label="EncodingAESKey">
          <div class="url-row">
            <el-input v-model="form.encodingAesKey" :type="showAesKey ? 'text' : 'password'" placeholder="43位字符串" style="flex: 1" />
            <el-button @click="showAesKey = !showAesKey">{{ showAesKey ? '隐藏' : '显示' }}</el-button>
            <el-button type="primary" plain @click="generateRandom('aes')">随机生成</el-button>
          </div>
        </el-form-item>

        <el-divider content-position="left">回调事件订阅</el-divider>

        <el-form-item label="客户联系回调">
          <el-checkbox-group v-model="form.contactEvents">
            <el-checkbox label="add_external_contact">添加客户</el-checkbox>
            <el-checkbox label="edit_external_contact">编辑客户</el-checkbox>
            <el-checkbox label="del_external_contact">删除客户</el-checkbox>
            <el-checkbox label="del_follow_user">删除跟进人</el-checkbox>
            <el-checkbox label="change_external_chat">群变更</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="通讯录回调">
          <el-checkbox-group v-model="form.addressEvents">
            <el-checkbox label="create_user">创建成员</el-checkbox>
            <el-checkbox label="update_user">更新成员</el-checkbox>
            <el-checkbox label="delete_user">删除成员</el-checkbox>
            <el-checkbox label="create_party">创建部门</el-checkbox>
            <el-checkbox label="update_party">更新部门</el-checkbox>
            <el-checkbox label="delete_party">删除部门</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item label="会话存档回调">
          <el-checkbox-group v-model="form.archiveEvents">
            <el-checkbox label="msgaudit_notify">消息存档通知</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <el-form-item>
          <el-button type="warning" @click="sendTestRequest" :loading="testingCallback">
            发送验证请求
          </el-button>
          <span style="font-size: 12px; color: #9CA3AF; margin-left: 8px">模拟企微服务器验证回调URL</span>
        </el-form-item>

        <el-divider content-position="left">最近回调日志</el-divider>
        <el-table :data="recentLogs" size="small" stripe border style="max-width: 680px" v-loading="loadingLogs">
          <el-table-column prop="time" label="时间" width="160" />
          <el-table-column prop="event" label="事件" min-width="140" />
          <el-table-column label="结果" width="80">
            <template #default="{ row }">
              <el-tag :type="row.success ? 'success' : 'danger'" size="small">{{ row.success ? '成功' : '失败' }}</el-tag>
            </template>
          </el-table-column>
        </el-table>
        <div v-if="recentLogs.length === 0 && !loadingLogs" style="text-align: center; padding: 20px; color: #9CA3AF; font-size: 13px">
          暂无回调日志，配置回调后企微服务器的事件推送将在此处显示
        </div>

        <el-form-item style="margin-top: 20px">
          <el-button type="primary" @click="handleSave" :loading="saving">保存回调配置</el-button>
        </el-form-item>
      </el-form>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'

const props = defineProps<{ configId?: number }>()

const saving = ref(false)
const testingCallback = ref(false)
const loadingLogs = ref(false)
const showToken = ref(false)
const showAesKey = ref(false)

const callbackUrl = computed(() => `${window.location.origin}/api/v1/wecom/callback`)

const form = reactive({
  token: '',
  encodingAesKey: '',
  contactEvents: ['add_external_contact', 'del_external_contact', 'change_external_chat'] as string[],
  addressEvents: ['create_user', 'update_user'] as string[],
  archiveEvents: ['msgaudit_notify'] as string[],
})

const recentLogs = ref<any[]>([])

const fetchCallbackConfig = async () => {
  if (!props.configId) return
  try {
    const res = await fetch(`/api/v1/wecom/configs/${props.configId}`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json?.data) {
      // callbackToken and encodingAesKey are masked as ******, don't overwrite
      if (json.data.callbackToken && json.data.callbackToken !== '******') {
        form.token = json.data.callbackToken
      }
    }
  } catch { /* ignore */ }
}

const fetchLogs = async () => {
  if (!props.configId) return
  loadingLogs.value = true
  try {
    const res = await fetch(`/api/v1/wecom/callback/logs?configId=${props.configId}&limit=10`, {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    })
    const json = await res.json()
    if (json?.data) recentLogs.value = json.data
  } catch { /* ignore */ }
  finally { loadingLogs.value = false }
}

const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(callbackUrl.value)
    ElMessage.success('回调URL已复制到剪贴板')
  } catch {
    ElMessage.info(callbackUrl.value)
  }
}

const generateRandom = (type: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
  const len = type === 'aes' ? 43 : 32
  let result = ''
  for (let i = 0; i < len; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  if (type === 'aes') form.encodingAesKey = result
  else form.token = result
  ElMessage.success('已随机生成')
}

const sendTestRequest = async () => {
  if (!props.configId) return
  testingCallback.value = true
  try {
    const res = await fetch(`/api/v1/wecom/callback/test?configId=${props.configId}`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' }
    })
    const json = await res.json()
    if (json?.success) {
      ElMessage.success('回调验证通过')
      fetchLogs()
    } else {
      ElMessage.error(json?.message || '验证失败')
    }
  } catch { ElMessage.error('发送测试请求失败') }
  finally { testingCallback.value = false }
}

const handleSave = async () => {
  if (!props.configId) return
  saving.value = true
  try {
    const body: any = {}
    if (form.token) body.callbackToken = form.token
    if (form.encodingAesKey) body.encodingAesKey = form.encodingAesKey

    const res = await fetch(`/api/v1/wecom/configs/${props.configId}`, {
      method: 'PUT',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    })
    const json = await res.json()
    if (json?.success) ElMessage.success('回调配置已保存')
    else ElMessage.error(json?.message || '保存失败')
  } catch { ElMessage.error('保存失败') }
  finally { saving.value = false }
}

watch(() => props.configId, () => { fetchCallbackConfig(); fetchLogs() })
onMounted(() => { fetchCallbackConfig(); fetchLogs() })
</script>

<style scoped>
.url-row { display: flex; gap: 8px; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; }
</style>
