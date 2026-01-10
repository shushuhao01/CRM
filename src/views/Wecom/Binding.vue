<template>
  <div class="wecom-binding">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>企微联动</span>
          <div>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 200px; margin-right: 10px" @change="handleConfigChange">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="primary" @click="handleAdd" :disabled="!selectedConfigId">
              <el-icon><Plus /></el-icon>新增绑定
            </el-button>
          </div>
        </div>
      </template>

      <el-table :data="bindingList" v-loading="loading" stripe>
        <el-table-column prop="wecomUserName" label="企微成员" min-width="120">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.wecomAvatar" :size="32">{{ row.wecomUserName?.charAt(0) }}</el-avatar>
              <span>{{ row.wecomUserName || row.wecomUserId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="wecomUserId" label="企微UserID" min-width="150" />
        <el-table-column prop="crmUserName" label="CRM用户" min-width="120" />
        <el-table-column prop="crmUserId" label="CRM用户ID" min-width="100" />
        <el-table-column label="启用状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="bindOperator" label="绑定人" width="100" />
        <el-table-column label="绑定时间" width="160">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="100" fixed="right">
          <template #default="{ row }">
            <el-button type="danger" link @click="handleDelete(row)">解绑</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 新增绑定对话框 -->
    <el-dialog v-model="dialogVisible" title="新增成员绑定" width="600px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="企微成员" prop="wecomUserId">
          <el-select v-model="form.wecomUserId" filterable placeholder="选择企微成员" style="width: 100%" @change="handleWecomUserChange">
            <el-option v-for="u in wecomUsers" :key="u.userid" :label="`${u.name} (${u.userid})`" :value="u.userid" />
          </el-select>
          <el-button type="primary" link @click="fetchWecomUsers" style="margin-left: 10px">刷新列表</el-button>
        </el-form-item>
        <el-form-item label="CRM用户" prop="crmUserId">
          <el-select v-model="form.crmUserId" filterable placeholder="选择CRM用户" style="width: 100%" @change="handleCrmUserChange">
            <el-option v-for="u in crmUsers" :key="u.id" :label="`${u.name} (${u.username})`" :value="u.id" />
          </el-select>
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
defineOptions({ name: 'WecomBinding' })
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getWecomConfigs, getWecomBindings, createWecomBinding, deleteWecomBinding, getWecomUsers as fetchWecomUsersApi } from '@/api/wecom'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/date'

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const bindingList = ref<any[]>([])
const wecomUsers = ref<any[]>([])
const crmUsers = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)
const dialogVisible = ref(false)
const formRef = ref()

const form = ref({
  wecomUserId: '',
  wecomUserName: '',
  wecomAvatar: '',
  crmUserId: '',
  crmUserName: ''
})

const rules = {
  wecomUserId: [{ required: true, message: '请选择企微成员', trigger: 'change' }],
  crmUserId: [{ required: true, message: '请选择CRM用户', trigger: 'change' }]
}

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (res.data?.data || []).filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchBindings()
    }
  } catch (e) {
    console.error(e)
  }
}

const fetchBindings = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res = await getWecomBindings({ configId: selectedConfigId.value })
    bindingList.value = res.data?.data || []
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const fetchWecomUsers = async () => {
  if (!selectedConfigId.value) return
  try {
    const res = await fetchWecomUsersApi(selectedConfigId.value, 1, true)
    wecomUsers.value = res.data?.data || []
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '获取企微成员失败')
  }
}

const fetchCrmUsers = async () => {
  try {
    await userStore.loadUsers()
    crmUsers.value = userStore.users.filter((u: any) => !u.status || u.status === 'active')
  } catch (_e) {
    console.error(_e)
  }
}

const handleConfigChange = () => {
  fetchBindings()
  wecomUsers.value = []
}

const handleAdd = () => {
  form.value = { wecomUserId: '', wecomUserName: '', wecomAvatar: '', crmUserId: '', crmUserName: '' }
  dialogVisible.value = true
  fetchWecomUsers()
  fetchCrmUsers()
}

const handleWecomUserChange = (userId: string) => {
  const user = wecomUsers.value.find(u => u.userid === userId)
  if (user) {
    form.value.wecomUserName = user.name
    form.value.wecomAvatar = user.avatar
  }
}

const handleCrmUserChange = (userId: string) => {
  const user = crmUsers.value.find(u => u.id === userId)
  if (user) {
    form.value.crmUserName = user.name
  }
}

const handleSubmit = async () => {
  await formRef.value?.validate()
  submitting.value = true
  try {
    await createWecomBinding({
      wecomConfigId: selectedConfigId.value!,
      wecomUserId: form.value.wecomUserId,
      wecomUserName: form.value.wecomUserName,
      wecomAvatar: form.value.wecomAvatar,
      crmUserId: form.value.crmUserId,
      crmUserName: form.value.crmUserName
    })
    ElMessage.success('绑定成功')
    dialogVisible.value = false
    fetchBindings()
  } catch (e: any) {
    ElMessage.error(e.response?.data?.message || '绑定失败')
  } finally {
    submitting.value = false
  }
}

const handleDelete = async (row: any) => {
  await ElMessageBox.confirm('确定要解除该绑定吗？', '提示', { type: 'warning' })
  try {
    await deleteWecomBinding(row.id)
    ElMessage.success('解绑成功')
    fetchBindings()
  } catch (_e) {
    ElMessage.error('解绑失败')
  }
}

onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-binding { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.user-info { display: flex; align-items: center; gap: 8px; }
</style>
