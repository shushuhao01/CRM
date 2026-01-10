<template>
  <div class="wecom-acquisition">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>获客助手</span>
          <div class="header-actions">
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="fetchList">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="primary" @click="handleAdd" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>创建链接
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="linkList" v-loading="loading" stripe>
        <el-table-column prop="linkName" label="链接名称" min-width="150" />
        <el-table-column label="链接地址" min-width="250">
          <template #default="{ row }">
            <div class="link-cell">
              <span class="link-url">{{ row.linkUrl }}</span>
              <el-button type="primary" link @click="copyLink(row.linkUrl)">复制</el-button>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="接待成员" min-width="150">
          <template #default="{ row }">
            {{ parseUserIds(row.userIds) }}
          </template>
        </el-table-column>
        <el-table-column label="统计数据" width="200">
          <template #default="{ row }">
            <div class="stats-cell">
              <span>点击: {{ row.clickCount || 0 }}</span>
              <span>添加: {{ row.addCount || 0 }}</span>
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
            <el-button type="primary" link @click="showQrCode(row)">二维码</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 创建链接对话框 -->
    <el-dialog v-model="dialogVisible" title="创建获客链接" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="链接名称" prop="linkName">
          <el-input v-model="form.linkName" placeholder="请输入链接名称" />
        </el-form-item>
        <el-form-item label="接待成员" prop="userIds">
          <el-select v-model="form.userIds" multiple filterable placeholder="选择接待成员" style="width: 100%">
            <el-option v-for="u in wecomUsers" :key="u.userid" :label="u.name" :value="u.userid" />
          </el-select>
          <el-button type="primary" link @click="fetchWecomUsers" style="margin-left: 10px">刷新</el-button>
        </el-form-item>
        <el-form-item label="欢迎语">
          <el-input v-model="form.welcomeMsg" type="textarea" :rows="3" placeholder="客户添加后自动发送的欢迎语" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">创建</el-button>
      </template>
    </el-dialog>

    <!-- 二维码对话框 -->
    <el-dialog v-model="qrDialogVisible" title="获客二维码" width="400px">
      <div class="qr-content">
        <div class="qr-placeholder">
          <el-icon :size="120"><Picture /></el-icon>
          <p>{{ currentLink?.linkName }}</p>
          <p class="link-text">{{ currentLink?.linkUrl }}</p>
        </div>
        <el-button type="primary" @click="copyLink(currentLink?.linkUrl)">复制链接</el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomAcquisition' })
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Picture } from '@element-plus/icons-vue'
import { getWecomConfigs, getAcquisitionLinks, createAcquisitionLink, getWecomUsers } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const linkList = ref<any[]>([])
const wecomUsers = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)
const dialogVisible = ref(false)
const qrDialogVisible = ref(false)
const currentLink = ref<any>(null)
const formRef = ref()

const form = ref({
  linkName: '',
  userIds: [] as string[],
  welcomeMsg: ''
})

const rules = {
  linkName: [{ required: true, message: '请输入链接名称', trigger: 'blur' }],
  userIds: [{ required: true, message: '请选择接待成员', trigger: 'change' }]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const parseUserIds = (userIds: string) => {
  try {
    const ids = JSON.parse(userIds || '[]')
    return ids.length > 3 ? `${ids.slice(0, 3).join(', ')}等${ids.length}人` : ids.join(', ')
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
    console.log('[WecomAcquisition] Configs response:', res)
    const configs = Array.isArray(res) ? res : []
    configList.value = configs.filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchList()
    }
  } catch (e) {
    console.error('[WecomAcquisition] Fetch configs error:', e)
  }
}

const fetchList = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res = await getAcquisitionLinks(selectedConfigId.value)
    console.log('[WecomAcquisition] Links response:', res)
    linkList.value = Array.isArray(res) ? res : []
  } catch (e) {
    console.error('[WecomAcquisition] Fetch list error:', e)
  } finally {
    loading.value = false
  }
}

const fetchWecomUsers = async () => {
  if (!selectedConfigId.value) return
  try {
    const res = await getWecomUsers(selectedConfigId.value, 1, true)
    console.log('[WecomAcquisition] Users response:', res)
    wecomUsers.value = Array.isArray(res) ? res : []
  } catch (e: any) {
    console.error('[WecomAcquisition] Fetch users error:', e)
    ElMessage.error(e.message || '获取成员失败')
  }
}

const handleAdd = () => {
  form.value = { linkName: '', userIds: [], welcomeMsg: '' }
  dialogVisible.value = true
  fetchWecomUsers()
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await createAcquisitionLink({
      wecomConfigId: selectedConfigId.value!,
      linkName: form.value.linkName,
      userIds: form.value.userIds,
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

const showQrCode = (row: any) => {
  currentLink.value = row
  qrDialogVisible.value = true
}

onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-acquisition { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 10px; }
.link-cell { display: flex; align-items: center; gap: 8px; }
.link-url { max-width: 200px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.stats-cell { display: flex; gap: 15px; font-size: 13px; color: #606266; }
.qr-content { text-align: center; padding: 20px; }
.qr-placeholder { margin-bottom: 20px; color: #909399; }
.link-text { font-size: 12px; word-break: break-all; margin-top: 10px; }
</style>
