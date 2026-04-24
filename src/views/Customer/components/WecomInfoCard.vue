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

    <template v-if="wecomInfo.bound">
      <!-- USID -->
      <div class="info-row">
        <span class="info-label">企微USID</span>
        <div class="info-value usid-row">
          <template v-if="!editingUsid">
            <span class="usid-text">{{ wecomInfo.wecomExternalUserid || '-' }}</span>
            <el-button link type="primary" size="small" @click="copyUsid" v-if="wecomInfo.wecomExternalUserid">📋</el-button>
            <el-button link type="primary" size="small" @click="startEditUsid">✏️</el-button>
          </template>
          <template v-else>
            <el-input
              v-model="usidForm"
              size="small"
              placeholder="输入企微External UserID"
              style="width: 220px"
              maxlength="100"
            />
            <el-button type="primary" size="small" :loading="savingUsid" @click="saveUsid">保存</el-button>
            <el-button size="small" @click="cancelEditUsid">取消</el-button>
          </template>
        </div>
      </div>
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

    <template v-else>
      <div class="empty-wecom">
        <!-- USID手动输入 -->
        <div class="info-row">
          <span class="info-label">企微USID</span>
          <div class="info-value usid-row">
            <template v-if="!editingUsid">
              <span class="no-data">未关联企微</span>
              <el-button type="primary" size="small" @click="startEditUsid">手动关联</el-button>
            </template>
            <template v-else>
              <el-input
                v-model="usidForm"
                size="small"
                placeholder="输入企微External UserID"
                style="width: 220px"
              />
              <el-button type="primary" size="small" :loading="savingUsid" @click="saveUsid">保存</el-button>
              <el-button size="small" @click="cancelEditUsid">取消</el-button>
            </template>
          </div>
        </div>
      </div>
    </template>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { ElMessage } from 'element-plus'
import { Connection } from '@element-plus/icons-vue'
import { getCrmCustomerWecomInfo, updateCrmCustomerWecomUsid } from '@/api/wecom'
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

const editingUsid = ref(false)
const usidForm = ref('')
const savingUsid = ref(false)

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

const startEditUsid = () => {
  usidForm.value = wecomInfo.value.wecomExternalUserid || ''
  editingUsid.value = true
}

const cancelEditUsid = () => {
  editingUsid.value = false
  usidForm.value = ''
}

const saveUsid = async () => {
  savingUsid.value = true
  try {
    await updateCrmCustomerWecomUsid(props.customerId, usidForm.value.trim())
    ElMessage.success('USID更新成功')
    editingUsid.value = false
    await fetchWecomInfo()
  } catch (e: any) {
    ElMessage.error(e?.message || 'USID更新失败')
  } finally {
    savingUsid.value = false
  }
}

const copyUsid = async () => {
  if (!wecomInfo.value.wecomExternalUserid) return
  try {
    await navigator.clipboard.writeText(wecomInfo.value.wecomExternalUserid)
    ElMessage.success('已复制USID')
  } catch {
    ElMessage.warning('复制失败')
  }
}

const goToWecomCustomer = () => {
  router.push('/wecom/customer')
}

onMounted(fetchWecomInfo)

watch(() => props.customerId, () => {
  loaded.value = false
  fetchWecomInfo()
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
    &.usid-row { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
    &.tags { display: flex; flex-wrap: wrap; }
    &.chat-summary { color: #606266; font-size: 12px; }
  }
}
.usid-text { font-family: monospace; font-size: 12px; word-break: break-all; }
.no-data { color: #c0c4cc; font-size: 13px; }
.info-actions { margin-top: 8px; text-align: right; }
.empty-wecom { padding: 4px 0; }
</style>

