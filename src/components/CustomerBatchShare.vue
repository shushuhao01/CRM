<template>
  <el-dialog
    v-model="visible"
    title="批量分享客户"
    width="600px"
    :close-on-click-modal="false"
    @close="handleClose"
  >
    <div class="batch-share-content">
      <!-- 已选客户信息 -->
      <div class="selected-customers">
        <h4>已选客户 ({{ customers.length }} 个)</h4>
        <div class="customer-chips">
          <el-tag
            v-for="c in customers.slice(0, 10)"
            :key="c.id"
            size="small"
            style="margin: 2px 4px;"
          >{{ c.name }}</el-tag>
          <el-tag v-if="customers.length > 10" size="small" type="info">
            ...等{{ customers.length }}个客户
          </el-tag>
        </div>
      </div>

      <!-- 分享设置 -->
      <div class="share-settings">
        <h4>分享设置</h4>
        <el-form :model="shareForm" label-width="100px">
          <el-form-item label="分享给" required>
            <el-select
              v-model="shareForm.targetUserId"
              placeholder="请输入姓名或选择人员"
              style="width: 100%"
              filterable
              clearable
              :filter-method="filterUsers"
            >
              <el-option
                v-for="user in filteredUsers"
                :key="user.id"
                :label="`${user.name} - ${user.department || '未分配部门'} (${getRoleText(user.role)})`"
                :value="user.id"
              >
                <div style="display: flex; justify-content: space-between; align-items: center;">
                  <span>{{ user.name }}</span>
                  <span style="color: #8492a6; font-size: 12px;">
                    {{ user.department || '未分配部门' }} | {{ getRoleText(user.role) }}
                  </span>
                </div>
              </el-option>
            </el-select>
          </el-form-item>

          <el-form-item label="时间限制" required>
            <el-select v-model="shareForm.timeLimit" style="width: 100%">
              <el-option label="1天" :value="1" />
              <el-option label="3天" :value="3" />
              <el-option label="7天" :value="7" />
              <el-option label="15天" :value="15" />
              <el-option label="30天" :value="30" />
              <el-option label="永久" :value="0" />
            </el-select>
            <div style="margin-top: 5px;">
              <el-text size="small" type="info">
                {{ shareForm.timeLimit === 0 ? '永久分享，不会自动回收' : `${shareForm.timeLimit}天后自动回收到原归属人` }}
              </el-text>
            </div>
          </el-form-item>

          <el-form-item label="分享备注">
            <el-input
              v-model="shareForm.remark"
              type="textarea"
              :rows="3"
              placeholder="请输入分享原因或备注信息（可选）"
              maxlength="200"
              show-word-limit
            />
          </el-form-item>
        </el-form>
      </div>
    </div>

    <template #footer>
      <div class="dialog-footer">
        <el-button @click="handleClose">取消</el-button>
        <el-button type="primary" @click="confirmBatchShare" :loading="loading">
          确认分享 ({{ customers.length }} 个客户)
        </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import customerShareApi from '@/api/customerShare'
import type { ShareRequest } from '@/api/customerShare'
import { useNotificationStore } from '@/stores/notification'

interface CustomerItem {
  id: string
  name: string
  phone: string
  salesPersonId?: string
  [key: string]: any
}

const props = defineProps<{
  modelValue: boolean
  customers: CustomerItem[]
}>()

const emit = defineEmits<{
  'update:modelValue': [val: boolean]
  'shared': []
}>()

const userStore = useUserStore()
const notificationStore = useNotificationStore()

const visible = computed({
  get: () => props.modelValue,
  set: (val) => emit('update:modelValue', val)
})

const loading = ref(false)
const searchKeyword = ref('')

const shareForm = ref({
  targetUserId: '',
  timeLimit: 7,
  remark: ''
})

const salesUsers = computed(() => {
  return userStore.users.filter(u =>
    ['sales_staff', 'department_manager', 'admin', 'super_admin'].includes(u.role)
  ).map(u => ({
    id: u.id,
    name: u.name,
    department: u.department || '未分配部门',
    role: u.role
  }))
})

const filteredUsers = computed(() => {
  let users = salesUsers.value
  if (searchKeyword.value) {
    const kw = searchKeyword.value.toLowerCase()
    users = users.filter(u =>
      u.name.toLowerCase().includes(kw) ||
      (u.department && u.department.toLowerCase().includes(kw))
    )
  }
  return users
})

const filterUsers = (query: string) => {
  searchKeyword.value = query
}

const getRoleText = (role: string) => {
  const map: Record<string, string> = {
    'super_admin': '超级管理员', 'admin': '管理员',
    'department_manager': '部门经理', 'sales_staff': '销售人员',
    'customer_service': '客服人员'
  }
  return map[role] || role
}

const confirmBatchShare = async () => {
  if (!shareForm.value.targetUserId) {
    ElMessage.warning('请选择要分享给的人员')
    return
  }

  loading.value = true
  let successCount = 0
  let failCount = 0

  try {
    // 逐个分享（使用现有API）
    for (const customer of props.customers) {
      try {
        const request: ShareRequest = {
          customerId: customer.id,
          sharedTo: shareForm.value.targetUserId,
          timeLimit: shareForm.value.timeLimit,
          remark: shareForm.value.remark
        }
        const result = await customerShareApi.shareCustomer(request)
        if (result.success) {
          successCount++
        } else {
          failCount++
        }
      } catch {
        failCount++
      }
    }

    const targetUser = salesUsers.value.find(u => u.id === shareForm.value.targetUserId)
    const timeLimitText = shareForm.value.timeLimit === 0 ? '永久' : `${shareForm.value.timeLimit}天`

    if (successCount > 0) {
      ElMessage.success(`成功分享 ${successCount} 个客户给 ${targetUser?.name || '目标用户'}，时间限制：${timeLimitText}${failCount > 0 ? `，${failCount}个失败` : ''}`)

      notificationStore.sendMessage(
        notificationStore.MessageType.CUSTOMER_SHARE,
        `批量分享 ${successCount} 个客户给 ${targetUser?.name || '目标用户'}（时间限制：${timeLimitText}）`,
        { relatedType: 'customer' }
      )

      emit('shared')
      handleClose()
    } else {
      ElMessage.error('所有客户分享失败，请重试')
    }
  } catch (e) {
    console.error('批量分享失败:', e)
    ElMessage.error('批量分享失败')
  } finally {
    loading.value = false
  }
}

const handleClose = () => {
  shareForm.value = { targetUserId: '', timeLimit: 7, remark: '' }
  searchKeyword.value = ''
  visible.value = false
}
</script>

<style scoped>
.selected-customers {
  margin-bottom: 20px;
}
.selected-customers h4, .share-settings h4 {
  margin: 0 0 12px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}
.customer-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>

