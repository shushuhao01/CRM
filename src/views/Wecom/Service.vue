<template>
  <div class="wecom-service">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>微信客服</span>
          <div class="header-actions">
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="fetchList">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="primary" @click="handleAdd" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>创建客服
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="accountList" v-loading="loading" stripe>
        <el-table-column prop="name" label="客服名称" min-width="150" />
        <el-table-column prop="openKfId" label="客服ID" min-width="200" />
        <el-table-column label="接待人员" min-width="150">
          <template #default="{ row }">
            {{ parseServicerIds(row.servicerUserIds) }}
          </template>
        </el-table-column>
        <el-table-column label="统计数据" width="200">
          <template #default="{ row }">
            <div class="stats-cell">
              <span>会话: {{ row.sessionCount || 0 }}</span>
              <span>消息: {{ row.messageCount || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdBy" label="创建人" width="100" />
        <el-table-column label="创建时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link @click="showLink(row)">客服链接</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建客服对话框 -->
    <el-dialog v-model="dialogVisible" title="创建客服账号" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="客服名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入客服名称" />
        </el-form-item>
        <el-form-item label="接待人员">
          <el-select v-model="form.servicerUserIds" multiple filterable placeholder="选择接待人员" style="width: 100%">
            <el-option v-for="u in wecomUsers" :key="u.userid" :label="u.name" :value="u.userid" />
          </el-select>
          <el-button type="primary" link @click="fetchWecomUsers" style="margin-left: 10px">刷新</el-button>
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.welcomeMsg" type="textarea" :rows="3" placeholder="客户进入会话后自动发送的欢迎语" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>

    <!-- 客服链接对话框 -->
    <el-dialog v-model="linkDialogVisible" title="客服链接" width="500px">
      <div class="link-content">
        <el-descriptions :column="1" border>
          <el-descriptions-item label="客服名称">{{ currentAccount?.name }}</el-descriptions-item>
          <el-descriptions-item label="客服ID">{{ currentAccount?.openKfId }}</el-descriptions-item>
          <el-descriptions-item label="客服链接">
            <div class="link-row">
              <span>{{ currentAccount?.kfUrl || '暂无链接' }}</span>
              <el-button v-if="currentAccount?.kfUrl" type="primary" link @click="copyLink(currentAccount?.kfUrl)">复制</el-button>
            </div>
          </el-descriptions-item>
        </el-descriptions>
        <el-alert type="info" :closable="false" style="margin-top: 15px">
          客服链接可嵌入网页或生成二维码，客户点击后可直接与客服对话
        </el-alert>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomService' })
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getWecomConfigs, getServiceAccounts, createServiceAccount, getWecomUsers } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const accountList = ref<any[]>([])
const wecomUsers = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)
const dialogVisible = ref(false)
const linkDialogVisible = ref(false)
const currentAccount = ref<any>(null)
const formRef = ref()

const form = ref({
  name: '',
  servicerUserIds: [] as string[],
  welcomeMsg: ''
})

const rules = {
  name: [{ required: true, message: '请输入客服名称', trigger: 'blur' }]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const parseServicerIds = (ids: string) => {
  try {
    const arr = JSON.parse(ids || '[]')
    return arr.length > 3 ? `${arr.slice(0, 3).join(', ')}等${arr.length}人` : arr.join(', ') || '-'
  } catch {
    return '-'
  }
}

const copyLink = (url: string) => {
  if (!url) return
  navigator.clipboard.writeText(url)
  ElMessage.success('链接已复制')
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (res.data?.data || []).filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchList()
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchList = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res = await getServiceAccounts(selectedConfigId.value)
    accountList.value = res.data?.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchWecomUsers = async () => {
  if (!selectedConfigId.value) return
  try {
    const res = await getWecomUsers(selectedConfigId.value, 1, true)
    wecomUsers.value = res.data?.data || []
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '获取成员失败')
  }
}

const handleAdd = () => {
  form.value = { name: '', servicerUserIds: [], welcomeMsg: '' }
  dialogVisible.value = true
  fetchWecomUsers()
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await createServiceAccount({
      wecomConfigId: selectedConfigId.value!,
      name: form.value.name,
      servicerUserIds: form.value.servicerUserIds,
      welcomeMsg: form.value.welcomeMsg
    })
    ElMessage.success('创建成功')
    dialogVisible.value = false
    fetchList()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '创建失败')
  } finally {
    submitting.value = false
  }
}

const showLink = (row: any) => {
  currentAccount.value = row
  linkDialogVisible.value = true
}

onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-service { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
.stats-cell { display: flex; gap: 15px; font-size: 13px; color: #606266; }
.link-content { padding: 10px 0; }
.link-row { display: flex; align-items: center; gap: 10px; }
</style>
