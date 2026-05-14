<template>
  <el-card v-if="loaded" shadow="never" class="wecom-info-card">
    <template #header>
      <div class="card-header">
        <span class="card-title">
          <el-icon><Connection /></el-icon>
          企微信息
        </span>
        <el-tag v-if="wecomInfo.bound" type="success" size="small">已关联</el-tag>
        <el-tag v-else type="info" size="small">未关联</el-tag>
      </div>
    </template>

    <!-- 多UserID管理区域 -->
    <div class="userid-section">
      <div class="section-header">
        <span class="info-label">企微USID</span>
        <el-button type="primary" link size="small" @click="showAddDialog">+ 添加</el-button>
      </div>
      <div class="userid-list" v-if="useridList.length > 0">
        <div class="userid-item" v-for="(uid, idx) in useridList" :key="idx">
          <template v-if="editingIndex !== idx">
            <span class="usid-text">{{ uid }}</span>
            <div class="userid-actions">
              <el-button link type="primary" size="small" @click="copyUsid(uid)">📋</el-button>
              <el-button link type="primary" size="small" @click="startEdit(idx)">✏️</el-button>
              <el-button link type="danger" size="small" @click="handleDelete(uid)">🗑️</el-button>
            </div>
          </template>
          <template v-else>
            <el-input v-model="editForm" size="small" placeholder="输入企微External UserID" style="flex: 1" maxlength="100" />
            <el-button type="primary" size="small" :loading="saving" @click="submitEdit(uid)">保存</el-button>
            <el-button size="small" @click="cancelEdit">取消</el-button>
          </template>
        </div>
      </div>
      <div v-else class="no-data">未关联任何企微UserID</div>
    </div>

    <template v-if="wecomInfo.bound">
      <!-- 关联企微数 -->
      <div class="info-row">
        <span class="info-label">关联微信数</span>
        <span class="info-value">{{ wecomInfo.boundWecomAccounts }} 个</span>
      </div>
      <!-- 跟进人 -->
      <div class="info-row" v-if="wecomInfo.followUserName">
        <span class="info-label">企微跟进人</span>
        <span class="info-value">{{ wecomInfo.followUserName }}</span>
      </div>
      <!-- 标签 -->
      <div class="info-row" v-if="wecomInfo.tags && wecomInfo.tags.length">
        <span class="info-label">企微标签</span>
        <div class="info-value tags">
          <el-tag v-for="(tag, idx) in wecomInfo.tags.slice(0, 5)" :key="idx" size="small" style="margin: 0 4px 4px 0">{{ tag }}</el-tag>
          <span v-if="wecomInfo.tags.length > 5" style="font-size: 12px; color: #909399">+{{ wecomInfo.tags.length - 5 }}</span>
        </div>
      </div>
      <!-- 最近聊天 -->
      <div class="info-row" v-if="wecomInfo.lastChatSummary">
        <span class="info-label">最近聊天</span>
        <span class="info-value chat-summary">{{ wecomInfo.lastChatSummary }}</span>
      </div>
      <!-- 操作 -->
      <div class="info-actions">
        <el-button size="small" type="primary" link @click="goToWecomCustomer">查看企微客户详情</el-button>
      </div>
    </template>

    <!-- 添加UserID弹窗 -->
    <el-dialog v-model="addDialogVisible" title="添加企微UserID" width="450px" append-to-body>
      <el-form label-width="80px">
        <el-form-item label="UserID">
          <el-input v-model="addForm" placeholder="输入企微External UserID" maxlength="100" clearable />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" :disabled="!addForm.trim()" @click="submitAdd">确认添加</el-button>
      </template>
    </el-dialog>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import {
  getCrmCustomerWecomInfo,
  getCrmCustomerWecomUserids,
  addCrmCustomerWecomUserid,
  deleteCrmCustomerWecomUserid,
  updateCrmCustomerWecomUserid
} from '@/api/wecom'
import { useRouter } from 'vue-router'

const props = defineProps<{
  customerId: string
}>()

const router = useRouter()
const loaded = ref(false)
const wecomInfo = ref<{
  bound: boolean
  wecomExternalUserid: string | null
  boundWecomAccounts: number
  tags: string[]
  lastChatSummary: string | null
  followUserName: string | null
}>({
  bound: false,
  wecomExternalUserid: null,
  boundWecomAccounts: 0,
  tags: [],
  lastChatSummary: null,
  followUserName: null
})

const useridList = ref<string[]>([])
const editingIndex = ref<number | null>(null)
const editForm = ref('')
const addDialogVisible = ref(false)
const addForm = ref('')
const saving = ref(false)

const fetchWecomInfo = async () => {
  if (!props.customerId) return
  try {
    const res: any = await getCrmCustomerWecomInfo(props.customerId)
    if (res) {
      wecomInfo.value = {
        bound: res.bound || false,
        wecomExternalUserid: res.wecomExternalUserid || null,
        boundWecomAccounts: res.boundWecomAccounts || 0,
        tags: Array.isArray(res.tags) ? res.tags : [],
        lastChatSummary: res.lastChatSummary || null,
        followUserName: res.followUserName || null
      }
    }
  } catch (e) {
    console.error('[WecomInfoCard] Fetch error:', e)
  } finally {
    loaded.value = true
  }
}

const fetchUserids = async () => {
  if (!props.customerId) return
  try {
    const res: any = await getCrmCustomerWecomUserids(props.customerId)
    useridList.value = Array.isArray(res?.userids) ? res.userids : []
  } catch (e) {
    console.error('[WecomInfoCard] Fetch userids error:', e)
  }
}

const showAddDialog = () => {
  addForm.value = ''
  addDialogVisible.value = true
}

const submitAdd = async () => {
  if (!addForm.value.trim()) return
  saving.value = true
  try {
    await addCrmCustomerWecomUserid(props.customerId, addForm.value.trim())
    ElMessage.success('UserID添加成功')
    addDialogVisible.value = false
    await Promise.all([fetchUserids(), fetchWecomInfo()])
  } catch (e: any) {
    ElMessage.error(e?.message || '添加失败')
  } finally {
    saving.value = false
  }
}

const handleDelete = async (uid: string) => {
  try {
    await ElMessageBox.confirm(`确定删除UserID「${uid}」？删除后将解除对应企微客户的关联。`, '提示', { type: 'warning' })
    saving.value = true
    await deleteCrmCustomerWecomUserid(props.customerId, uid)
    ElMessage.success('已删除')
    await Promise.all([fetchUserids(), fetchWecomInfo()])
  } catch (e: any) {
    if (e !== 'cancel') ElMessage.error(e?.message || '删除失败')
  } finally {
    saving.value = false
  }
}

const startEdit = (idx: number) => {
  editingIndex.value = idx
  editForm.value = useridList.value[idx]
}

const cancelEdit = () => {
  editingIndex.value = null
  editForm.value = ''
}

const submitEdit = async (oldUid: string) => {
  if (!editForm.value.trim() || editForm.value.trim() === oldUid) {
    cancelEdit()
    return
  }
  saving.value = true
  try {
    await updateCrmCustomerWecomUserid(props.customerId, oldUid, editForm.value.trim())
    ElMessage.success('UserID修改成功')
    cancelEdit()
    await Promise.all([fetchUserids(), fetchWecomInfo()])
  } catch (e: any) {
    ElMessage.error(e?.message || '修改失败')
  } finally {
    saving.value = false
  }
}

const copyUsid = async (uid: string) => {
  try {
    await navigator.clipboard.writeText(uid)
    ElMessage.success('已复制USID')
  } catch {
    ElMessage.warning('复制失败')
  }
}

const goToWecomCustomer = () => {
  router.push('/wecom/customer')
}

onMounted(() => {
  fetchWecomInfo()
  fetchUserids()
})

watch(() => props.customerId, () => {
  loaded.value = false
  fetchWecomInfo()
  fetchUserids()
})
</script>

<style scoped lang="scss">
.wecom-info-card {
  margin-bottom: 16px;
  :deep(.el-card__header) { padding: 12px 20px; }
  :deep(.el-card__body) { padding: 12px 20px; }
}
.card-header {
  display: flex; align-items: center; gap: 8px;
  .card-title {
    display: flex; align-items: center; gap: 6px;
    font-size: 15px; font-weight: 600;
  }
}
.userid-section {
  margin-bottom: 12px; padding-bottom: 12px; border-bottom: 1px solid #f0f0f0;
}
.section-header {
  display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;
}
.userid-list {
  display: flex; flex-direction: column; gap: 6px;
}
.userid-item {
  display: flex; align-items: center; gap: 8px;
  padding: 4px 8px; background: #f9fafb; border-radius: 6px;
  .usid-text { flex: 1; font-family: monospace; font-size: 12px; word-break: break-all; color: #374151; }
  .userid-actions { display: flex; gap: 2px; flex-shrink: 0; }
}
.info-row {
  display: flex; align-items: flex-start; padding: 6px 0;
  border-bottom: 1px solid #f5f5f5;
  &:last-child { border-bottom: none; }
  .info-label {
    width: 90px; flex-shrink: 0;
    font-size: 13px; color: #909399;
  }
  .info-value {
    flex: 1; font-size: 13px; color: #303133;
    &.tags { display: flex; flex-wrap: wrap; }
    &.chat-summary { color: #606266; font-size: 12px; }
  }
}
.no-data { color: #c0c4cc; font-size: 13px; padding: 4px 0; }
.info-label { font-size: 13px; color: #909399; }
.info-actions { margin-top: 8px; text-align: right; }
</style>
