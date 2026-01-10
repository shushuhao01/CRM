<template>
  <div class="wecom-config">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>企微配置</span>
          <el-button type="primary" @click="handleAdd">
            <el-icon><Plus /></el-icon>新增配置
          </el-button>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom: 15px">
        <template #title>
          配置信息获取：登录<el-link type="primary" href="https://work.weixin.qq.com/wework_admin/frame" target="_blank">企业微信管理后台</el-link>
          → 我的企业 获取企业ID，应用管理 → 自建应用 获取Secret和AgentId
        </template>
      </el-alert>

      <el-table :data="configList" v-loading="loading" stripe>
        <el-table-column prop="name" label="配置名称" min-width="120" />
        <el-table-column prop="corpId" label="企业ID" min-width="180" />
        <el-table-column prop="agentId" label="应用ID" width="100" />
        <el-table-column label="连接状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.connectionStatus)">{{ getStatusText(row.connectionStatus) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用状态" width="80">
          <template #default="{ row }">
            <el-switch v-model="row.isEnabled" @change="handleToggle(row)" />
          </template>
        </el-table-column>
        <el-table-column prop="bindOperator" label="绑定人" width="100" />
        <el-table-column label="绑定时间" width="160">
          <template #default="{ row }">{{ formatDate(row.bindTime) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="handleTest(row)">测试</el-button>
            <el-button type="primary" link @click="handleEdit(row)">编辑</el-button>
            <el-button type="danger" link @click="handleDelete(row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增/编辑对话框 -->
    <el-dialog v-model="dialogVisible" :title="isEdit ? '编辑配置' : '新增配置'" width="650px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="form.name" placeholder="如：云客CRM主体" />
          <div class="form-tip">自定义名称，便于区分多个企业主体</div>
        </el-form-item>
        <el-form-item label="企业ID" prop="corpId">
          <el-input v-model="form.corpId" placeholder="如：wwef39016ab6decd65" :disabled="isEdit" />
          <div class="form-tip">企业微信管理后台 → 我的企业 → 企业信息 → 企业ID</div>
        </el-form-item>
        <el-form-item label="应用Secret" prop="corpSecret">
          <el-input v-model="form.corpSecret" type="password" show-password placeholder="点击查看获取Secret" />
          <div class="form-tip">应用管理 → 自建应用 → 点击应用 → Secret（需管理员扫码）</div>
        </el-form-item>
        <el-form-item label="应用ID">
          <el-input-number v-model="form.agentId" :min="0" :controls="false" placeholder="如：1000013" style="width: 100%" />
          <div class="form-tip">应用管理 → 自建应用 → 点击应用 → AgentId</div>
        </el-form-item>

        <el-divider content-position="left">回调配置（可选，用于接收企微事件推送）</el-divider>
        <el-form-item label="回调Token">
          <el-input v-model="form.callbackToken" placeholder="自定义字符串，用于验证回调请求" />
        </el-form-item>
        <el-form-item label="EncodingAESKey">
          <el-input v-model="form.encodingAesKey" type="password" show-password placeholder="43位字符串，消息加解密密钥" />
        </el-form-item>
        <el-form-item label="回调URL">
          <el-input v-model="form.callbackUrl" placeholder="如：https://你的域名/api/v1/wecom/callback" />
        </el-form-item>

        <el-divider content-position="left">扩展配置（可选）</el-divider>
        <el-form-item label="通讯录Secret">
          <el-input v-model="form.contactSecret" type="password" show-password placeholder="管理工具 → 通讯录同步 → Secret" />
          <div class="form-tip">用于同步企微通讯录和外部联系人</div>
        </el-form-item>
        <el-form-item label="会话存档Secret">
          <el-input v-model="form.chatArchiveSecret" type="password" show-password placeholder="管理工具 → 会话内容存档 → Secret" />
          <div class="form-tip">需企业开通会话存档功能</div>
        </el-form-item>
        <el-form-item label="备注">
          <el-input v-model="form.remark" type="textarea" :rows="2" placeholder="备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomConfig' })
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getWecomConfigs, createWecomConfig, updateWecomConfig, deleteWecomConfig, testWecomConnection } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const dialogVisible = ref(false)
const isEdit = ref(false)
const currentId = ref<number | null>(null)
const formRef = ref()

const form = ref({
  name: '', corpId: '', corpSecret: '', agentId: undefined as number | undefined,
  callbackToken: '', encodingAesKey: '', callbackUrl: '', contactSecret: '', chatArchiveSecret: '', remark: ''
})

const rules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  corpId: [{ required: true, message: '请输入企业ID', trigger: 'blur' }],
  corpSecret: [{ required: true, message: '请输入应用Secret', trigger: 'blur' }]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'
const getStatusType = (status: string) => ({ connected: 'success', failed: 'danger', pending: 'info' }[status] || 'info')
const getStatusText = (status: string) => ({ connected: '已连接', failed: '连接失败', pending: '待测试' }[status] || '未知')

const fetchList = async () => {
  loading.value = true
  try {
    console.log('[WecomConfig] Fetching list...')
    const res = await getWecomConfigs()
    console.log('[WecomConfig] Fetch response:', res)
    // request.ts 拦截器返回的是 response.data.data，所以 res 直接就是数组
    // 但也可能返回整个 response.data（如果拦截器逻辑不同）
    if (Array.isArray(res)) {
      configList.value = res
    } else if (res?.data && Array.isArray(res.data)) {
      configList.value = res.data
    } else {
      configList.value = []
    }
    console.log('[WecomConfig] Config list:', configList.value)
  } catch (e) {
    console.error('[WecomConfig] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const handleAdd = () => {
  isEdit.value = false; currentId.value = null
  form.value = { name: '', corpId: '', corpSecret: '', agentId: undefined, callbackToken: '', encodingAesKey: '', callbackUrl: '', contactSecret: '', chatArchiveSecret: '', remark: '' }
  dialogVisible.value = true
}

const handleEdit = (row: any) => {
  isEdit.value = true; currentId.value = row.id
  form.value = { ...row, corpSecret: '', encodingAesKey: '', contactSecret: '', chatArchiveSecret: '' }
  dialogVisible.value = true
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    if (isEdit.value && currentId.value) {
      const res = await updateWecomConfig(currentId.value, form.value)
      console.log('[WecomConfig] Update response:', res)
      if (res?.success === false) {
        ElMessage.error(res?.message || '更新失败')
        return
      }
      ElMessage.success('更新成功')
    } else {
      const res = await createWecomConfig(form.value as any)
      console.log('[WecomConfig] Create response:', res)
      if (res?.success === false) {
        ElMessage.error(res?.message || '创建失败')
        return
      }
      ElMessage.success('创建成功')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e: any) {
    console.error('[WecomConfig] Submit error:', e)
    // 错误可能是 Error 对象或 axios 错误
    const message = e.response?.data?.message || e.message || '操作失败'
    ElMessage.error(message)
  } finally { submitting.value = false }
}

const handleToggle = async (row: any) => {
  try {
    await updateWecomConfig(row.id, { isEnabled: row.isEnabled })
    ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
  } catch (_e) { row.isEnabled = !row.isEnabled; ElMessage.error('操作失败') }
}

const handleTest = async (row: any) => {
  try {
    const res = await testWecomConnection(row.id)
    console.log('[WecomConfig] Test response:', res)
    // res 是 response.data.data，即 { connected: true/false }
    if (res?.connected) {
      ElMessage.success('连接测试成功')
      fetchList()
    } else {
      ElMessage.error('连接测试失败')
    }
  } catch (e: any) {
    console.error('[WecomConfig] Test error:', e)
    ElMessage.error(e.message || '连接测试失败')
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定要删除该配置吗？', '提示', { type: 'warning' })
  try { await deleteWecomConfig(row.id); ElMessage.success('删除成功'); fetchList() }
  catch (_e) { ElMessage.error('删除失败') }
}

onMounted(() => fetchList())
</script>

<style scoped lang="scss">
.wecom-config { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.form-tip { font-size: 12px; color: #909399; margin-top: 4px; line-height: 1.4; }
</style>
