<template>
  <div class="wecom-binding">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="binding">
          企微联动
          <template #actions>
            <el-input v-model="searchKey" placeholder="搜索成员名/CRM用户" clearable style="width: 180px" @clear="() => {}" @keyup.enter="() => {}" />
            <el-select v-model="filterStatus" placeholder="状态" clearable style="width: 100px">
              <el-option label="全部" value="" />
              <el-option label="已启用" value="enabled" />
              <el-option label="已禁用" value="disabled" />
            </el-select>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 200px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="primary" @click="handleAdd">
              <el-icon><Plus /></el-icon>新增绑定
            </el-button>
          </template>
        </WecomHeader>
      </template>

      <el-table :data="filteredBindings" v-loading="loading" stripe>
        <el-table-column label="企微成员" min-width="140">
          <template #default="{ row }">
            <div class="user-info">
              <el-avatar :src="row.wecomAvatar" :size="32">{{ row.wecomUserName?.charAt(0) }}</el-avatar>
              <div>
                <div style="font-weight: 600">{{ row.wecomUserName || row.wecomUserId }}</div>
                <div style="font-size: 11px; color: #909399">{{ row.department || '-' }} · {{ row.position || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="wecomUserId" label="企微UserID" width="130" show-overflow-tooltip />
        <el-table-column label="CRM用户" min-width="120">
          <template #default="{ row }">
            <template v-if="row.crmUserName">
              <div style="font-weight: 500">{{ row.crmUserName }}</div>
              <div style="font-size: 11px; color: #909399">{{ row.crmRole || '-' }}</div>
            </template>
            <el-tag v-else type="info" size="small">未绑定</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定方式" width="100">
          <template #default="{ row }">
            <el-tag :type="row.bindOperator === '自动匹配' ? 'success' : row.bindOperator === '侧边栏' ? 'warning' : 'info'" size="small">{{ row.bindOperator || '-' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="同步状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.syncStatus === 'success' ? 'success' : row.syncStatus === 'failed' ? 'danger' : 'info'" size="small">
              {{ row.syncStatus === 'success' ? '成功' : row.syncStatus === 'failed' ? '失败' : '未同步' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="70" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="绑定时间" width="140">
          <template #default="{ row }">{{ formatDate(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="handleViewDetail(row)">详情</el-button>
            <el-button type="warning" link size="small" @click="handleToggleEnabled(row)">{{ row.isEnabled ? '禁用' : '启用' }}</el-button>
            <el-button type="danger" link size="small" @click="handleDelete(row)">解绑</el-button>
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

    <!-- 绑定详情抽屉 -->
    <el-drawer v-model="detailVisible" title="绑定详情" size="460px">
      <template v-if="detailRow">
        <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 20px">
          <el-avatar :src="detailRow.wecomAvatar" :size="48">{{ detailRow.wecomUserName?.charAt(0) }}</el-avatar>
          <div>
            <div style="font-size: 18px; font-weight: 600">{{ detailRow.wecomUserName }}</div>
            <el-tag :type="detailRow.isEnabled ? 'success' : 'info'" size="small">{{ detailRow.isEnabled ? '已启用' : '已禁用' }}</el-tag>
          </div>
        </div>

        <h4 style="margin: 16px 0 8px; color: #606266">企微成员信息</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="成员名称">{{ detailRow.wecomUserName }}</el-descriptions-item>
          <el-descriptions-item label="UserID">{{ detailRow.wecomUserId }}</el-descriptions-item>
          <el-descriptions-item label="部门">{{ detailRow.department || '-' }}</el-descriptions-item>
          <el-descriptions-item label="职位">{{ detailRow.position || '-' }}</el-descriptions-item>
          <el-descriptions-item label="最后活跃">{{ detailRow.lastActiveAt ? formatDate(detailRow.lastActiveAt) : '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px; color: #606266">CRM用户信息</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="用户名">{{ detailRow.crmUserName || '未绑定' }}</el-descriptions-item>
          <el-descriptions-item label="用户ID">{{ detailRow.crmUserId || '-' }}</el-descriptions-item>
          <el-descriptions-item label="角色">{{ detailRow.crmRole || '-' }}</el-descriptions-item>
        </el-descriptions>

        <h4 style="margin: 16px 0 8px; color: #606266">绑定信息</h4>
        <el-descriptions :column="1" border size="small">
          <el-descriptions-item label="绑定方式">{{ detailRow.bindOperator || '-' }}</el-descriptions-item>
          <el-descriptions-item label="同步状态">
            <el-tag :type="detailRow.syncStatus === 'success' ? 'success' : detailRow.syncStatus === 'failed' ? 'danger' : 'info'" size="small">
              {{ detailRow.syncStatus === 'success' ? '同步成功' : detailRow.syncStatus === 'failed' ? '同步失败' : '未同步' }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="绑定时间">{{ formatDate(detailRow.createdAt) }}</el-descriptions-item>
        </el-descriptions>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomBinding' })
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { getWecomConfigs, getWecomBindings, createWecomBinding, deleteWecomBinding, getWecomUsers as fetchWecomUsersApi } from '@/api/wecom'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import { useUserStore } from '@/stores/user'
import { formatDateTime } from '@/utils/date'
import { useWecomDemo, DEMO_BINDINGS, DEMO_CONFIGS, DEMO_WECOM_USERS } from './composables/useWecomDemo'

const { isDemoMode } = useWecomDemo()

/** 显示的配置列表 */
const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const configList = ref<any[]>([])
const bindingList = ref<any[]>([])
const wecomUsers = ref<any[]>([])
const crmUsers = ref<any[]>([])
const searchKey = ref('')
const filterStatus = ref('')

// 详情
const detailVisible = ref(false)
const detailRow = ref<any>(null)

/** 显示的绑定列表（真实 or 示例） */
const displayBindings = computed(() => {
  if (bindingList.value.length > 0 || !isDemoMode.value) return bindingList.value
  return DEMO_BINDINGS
})

/** 筛选后的列表 */
const filteredBindings = computed(() => {
  let list = displayBindings.value
  if (searchKey.value) {
    const kw = searchKey.value.toLowerCase()
    list = list.filter((b: any) => b.wecomUserName?.toLowerCase().includes(kw) || b.crmUserName?.toLowerCase().includes(kw) || b.wecomUserId?.toLowerCase().includes(kw))
  }
  if (filterStatus.value === 'enabled') list = list.filter((b: any) => b.isEnabled)
  if (filterStatus.value === 'disabled') list = list.filter((b: any) => !b.isEnabled)
  return list
})

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
  if (isDemoMode.value) {
    wecomUsers.value = DEMO_WECOM_USERS
    return
  }
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
  if (row._demo) {
    ElMessage.info('示例模式：授权企微后可执行解绑操作')
    return
  }
  await ElMessageBox.confirm('确定要解除该绑定吗？解绑后该成员的企微数据将不再与CRM同步。', '确认解绑', { type: 'warning' })
  try {
    await deleteWecomBinding(row.id)
    ElMessage.success('解绑成功')
    fetchBindings()
  } catch (_e) {
    ElMessage.error('解绑失败')
  }
}

const handleToggleEnabled = (row: any) => {
  if (row._demo) {
    ElMessage.info('示例模式：授权企微后可切换状态')
    return
  }
  row.isEnabled = !row.isEnabled
  ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
}

const handleViewDetail = (row: any) => {
  detailRow.value = row
  detailVisible.value = true
}

onMounted(() => fetchConfigs())
</script>

<style scoped lang="scss">
.wecom-binding { padding: 20px; }
.user-info { display: flex; align-items: center; gap: 8px; }
</style>
