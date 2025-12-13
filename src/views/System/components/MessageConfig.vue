<template>
  <div class="notification-config">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-left">
        <h3>通知配置管理</h3>
        <p>配置各种通知方式的部门和成员设置，管理通知渠道的可用性</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          新建配置
        </el-button>
      </div>
    </div>

    <!-- 筛选区域 -->
    <div class="filter-section">
      <el-form inline>
        <el-form-item label="通知方式">
          <el-select v-model="filters.channelType" placeholder="全部" clearable style="width: 160px;">
            <el-option
              v-for="type in channelTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="部门">
          <el-select v-model="filters.departmentId" placeholder="全部" clearable style="width: 160px;">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="filters.status" placeholder="全部" clearable style="width: 120px;">
            <el-option label="启用" value="enabled" />
            <el-option label="禁用" value="disabled" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadChannels">搜索</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 通知渠道卡片列表 -->
    <div class="channel-list" v-loading="loading">
      <div
        v-for="channel in filteredChannels"
        :key="channel.id"
        class="channel-card"
        :class="{ 'is-disabled': !channel.isEnabled }"
      >
        <!-- 卡片头部 -->
        <div class="card-header">
          <div class="channel-info">
            <div class="channel-icon" :style="{ background: getChannelColor(channel.channelType) }">
              <component :is="getChannelIcon(channel.channelType)" />
            </div>
            <div class="channel-meta">
              <h4>{{ channel.name }}</h4>
              <span class="channel-type">{{ getChannelLabel(channel.channelType) }}</span>
            </div>
          </div>
          <el-switch
            v-model="channel.isEnabled"
            @change="toggleChannelStatus(channel)"
            :loading="channel.statusLoading"
          />
        </div>

        <!-- 卡片内容 -->
        <div class="card-body">
          <!-- 支持部门 -->
          <div class="info-row">
            <span class="info-label">支持部门</span>
            <div class="info-value">
              <el-select
                v-model="channel.targetDepartments"
                multiple
                collapse-tags
                collapse-tags-tooltip
                placeholder="选择支持的部门"
                size="small"
                style="width: 100%"
                @change="updateChannelDepartments(channel)"
              >
                <el-option
                  v-for="dept in departments"
                  :key="dept.id"
                  :label="dept.name"
                  :value="dept.id"
                />
              </el-select>
            </div>
          </div>

          <!-- 通知成员 -->
          <div class="info-row">
            <span class="info-label">通知成员</span>
            <div class="info-value">
              <template v-if="channel.channelType === 'system'">
                <el-tag type="success" size="small">
                  <el-icon><User /></el-icon>
                  全员通知
                </el-tag>
              </template>
              <template v-else>
                <el-button
                  type="primary"
                  size="small"
                  plain
                  @click="showMemberSelector(channel)"
                >
                  选择成员 ({{ (channel.targetUsers || []).length }}人)
                </el-button>
                <div v-if="(channel.targetUsers || []).length > 0" class="member-tags">
                  <el-tag
                    v-for="userId in (channel.targetUsers || []).slice(0, 2)"
                    :key="userId"
                    size="small"
                    closable
                    @close="removeMember(channel, userId)"
                  >
                    {{ getMemberName(userId) }}
                  </el-tag>
                  <el-tag v-if="(channel.targetUsers || []).length > 2" size="small" type="info">
                    +{{ (channel.targetUsers || []).length - 2 }}
                  </el-tag>
                </div>
              </template>
            </div>
          </div>

          <!-- 配置参数 -->
          <div class="info-row">
            <span class="info-label">配置参数</span>
            <div class="info-value config-actions">
              <el-button type="primary" link size="small" @click="showConfigDialog(channel)">
                <el-icon><Setting /></el-icon>
                配置参数
              </el-button>
              <el-tag :type="isConfigComplete(channel) ? 'success' : 'warning'" size="small">
                {{ isConfigComplete(channel) ? '已配置' : '待配置' }}
              </el-tag>
            </div>
          </div>
        </div>

        <!-- 卡片底部 -->
        <div class="card-footer">
          <span class="create-info">{{ channel.createdByName }} · {{ formatDate(channel.createdAt) }}</span>
          <div class="action-buttons">
            <el-button type="primary" link size="small" @click="testChannel(channel)" :loading="channel.testLoading">
              <el-icon><Connection /></el-icon>
              测试
            </el-button>
            <el-button type="primary" link size="small" @click="editChannel(channel)">
              <el-icon><Edit /></el-icon>
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteChannel(channel)">
              <el-icon><Delete /></el-icon>
              删除
            </el-button>
          </div>
        </div>
      </div>

      <!-- 空状态 -->
      <el-empty v-if="filteredChannels.length === 0 && !loading" description="暂无通知配置">
        <el-button type="primary" @click="showCreateDialog">创建第一个配置</el-button>
      </el-empty>
    </div>

    <!-- 分页 -->
    <div v-if="pagination.total > pagination.pageSize" class="pagination-wrapper">
      <el-pagination
        v-model:current-page="pagination.page"
        v-model:page-size="pagination.pageSize"
        :total="pagination.total"
        :page-sizes="[10, 20, 50]"
        layout="total, sizes, prev, pager, next"
        @size-change="loadChannels"
        @current-change="loadChannels"
      />
    </div>

    <!-- 新建/编辑配置弹窗 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑通知配置' : '新建通知配置'"
      width="700px"
      :close-on-click-modal="false"
    >
      <el-form ref="formRef" :model="form" :rules="formRules" label-width="100px">
        <el-form-item label="配置名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入配置名称" />
        </el-form-item>

        <el-form-item label="通知方式" prop="channelType">
          <el-select v-model="form.channelType" placeholder="选择通知方式" style="width: 100%" :disabled="isEdit">
            <el-option
              v-for="type in channelTypes"
              :key="type.value"
              :label="type.label"
              :value="type.value"
            >
              <div class="channel-option">
                <span class="channel-dot" :style="{ background: type.color }"></span>
                <span>{{ type.label }}</span>
                <span class="channel-desc">{{ type.description }}</span>
              </div>
            </el-option>
          </el-select>
        </el-form-item>

        <!-- 消息类型选择 -->
        <el-form-item label="消息类型" prop="messageTypes">
          <el-checkbox-group v-model="form.messageTypes">
            <el-checkbox
              v-for="type in messageTypes"
              :key="type.value"
              :label="type.value"
            >
              {{ type.label }}
              <el-tooltip :content="type.description" placement="top">
                <el-icon class="info-icon"><InfoFilled /></el-icon>
              </el-tooltip>
            </el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <!-- 动态配置参数 -->
        <template v-if="currentChannelConfig">
          <el-divider content-position="left">{{ getChannelLabel(form.channelType) }}配置</el-divider>
          <el-form-item
            v-for="field in currentChannelConfig.configFields"
            :key="field.key"
            :label="field.label"
            :prop="`config.${field.key}`"
            :rules="field.required ? [{ required: true, message: `请输入${field.label}` }] : []"
          >
            <template v-if="field.type === 'text'">
              <el-input v-model="form.config[field.key]" :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.type === 'password'">
              <el-input v-model="form.config[field.key]" type="password" show-password :placeholder="field.placeholder" />
            </template>
            <template v-else-if="field.type === 'number'">
              <el-input-number v-model="form.config[field.key]" :placeholder="field.placeholder" style="width: 100%" />
            </template>
            <template v-else-if="field.type === 'boolean'">
              <el-switch v-model="form.config[field.key]" />
            </template>
            <template v-else-if="field.type === 'select'">
              <el-select v-model="form.config[field.key]" style="width: 100%">
                <el-option
                  v-for="opt in field.options"
                  :key="opt.value"
                  :label="opt.label"
                  :value="opt.value"
                />
              </el-select>
            </template>
          </el-form-item>
        </template>

        <!-- 通知对象 -->
        <el-divider content-position="left">通知对象</el-divider>
        <el-form-item label="通知范围">
          <el-radio-group v-model="form.targetType">
            <el-radio label="all">所有人</el-radio>
            <el-radio label="departments">指定部门</el-radio>
            <el-radio label="users">指定用户</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.targetType === 'departments'" label="选择部门">
          <el-select v-model="form.targetDepartments" multiple placeholder="选择部门" style="width: 100%">
            <el-option
              v-for="dept in departments"
              :key="dept.id"
              :label="dept.name"
              :value="dept.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item v-if="form.targetType === 'users'" label="选择用户">
          <el-select v-model="form.targetUsers" multiple filterable placeholder="选择用户" style="width: 100%">
            <el-option
              v-for="user in users"
              :key="user.id"
              :label="(user as any).realName || (user as any).name || user.id"
              :value="user.id"
            />
          </el-select>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveChannel" :loading="saving">
          {{ isEdit ? '更新' : '创建' }}
        </el-button>
      </template>
    </el-dialog>

    <!-- 成员选择弹窗 -->
    <el-dialog v-model="memberDialogVisible" title="选择通知成员" width="600px">
      <el-transfer
        v-model="selectedMemberIds"
        :data="transferMembers"
        :titles="['可选成员', '已选成员']"
        filterable
        filter-placeholder="搜索成员"
      />
      <template #footer>
        <el-button @click="memberDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmMemberSelection">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus, User, Setting, Connection, Edit, Delete, InfoFilled,
  ChatDotRound, ChatLineSquare, ChatRound, Message, Iphone, Monitor
} from '@element-plus/icons-vue'
import type { FormInstance, FormRules } from 'element-plus'
import { messageApi } from '@/api/message'
import { useUserStore } from '@/stores/user'
import { useDepartmentStore } from '@/stores/department'
import dayjs from 'dayjs'

const userStore = useUserStore()
const departmentStore = useDepartmentStore()

// 数据
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const memberDialogVisible = ref(false)
const isEdit = ref(false)
const channels = ref<any[]>([])
const channelTypes = ref<any[]>([])
const messageTypes = ref<any[]>([])
const currentEditChannel = ref<any>(null)
const selectedMemberIds = ref<string[]>([])

// 筛选
const filters = reactive({
  channelType: '',
  departmentId: '',
  status: ''
})

// 分页
const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

// 表单
const formRef = ref<FormInstance>()
const form = reactive({
  id: '',
  name: '',
  channelType: '',
  config: {} as Record<string, any>,
  messageTypes: [] as string[],
  targetType: 'all',
  targetDepartments: [] as string[],
  targetUsers: [] as string[]
})

const formRules: FormRules = {
  name: [{ required: true, message: '请输入配置名称', trigger: 'blur' }],
  channelType: [{ required: true, message: '请选择通知方式', trigger: 'change' }]
}

// 计算属性
const departments = computed(() => departmentStore.departments || [])
const users = computed(() => userStore.users?.filter((u: any) => u.status !== 'disabled') || [])

const filteredChannels = computed(() => {
  let result = [...channels.value]
  if (filters.channelType) {
    result = result.filter(c => c.channelType === filters.channelType)
  }
  if (filters.departmentId) {
    result = result.filter(c => (c.targetDepartments || []).includes(filters.departmentId))
  }
  if (filters.status) {
    const enabled = filters.status === 'enabled'
    result = result.filter(c => c.isEnabled === enabled)
  }
  return result
})

const currentChannelConfig = computed(() => {
  return channelTypes.value.find(t => t.value === form.channelType)
})

const transferMembers = computed(() => {
  return users.value.map((u: any) => ({
    key: u.id,
    label: u.realName || u.name || u.username || u.id,
    disabled: false
  }))
})

// 方法
const loadChannels = async () => {
  loading.value = true
  try {
    const res = await messageApi.getNotificationChannels() as any
    if (res.success) {
      channels.value = (res.data || []).map((c: any) => ({
        ...c,
        statusLoading: false,
        testLoading: false
      }))
    }
  } catch (_error) {
    console.error('加载通知配置失败:', _error)
  } finally {
    loading.value = false
  }
}

const loadOptions = async () => {
  try {
    const res = await messageApi.getNotificationOptions() as any
    if (res.success && res.data) {
      channelTypes.value = res.data.channelTypes || []
      messageTypes.value = res.data.messageTypes || []
    }
  } catch (_error) {
    console.error('加载配置选项失败:', _error)
  }
}

const resetFilters = () => {
  filters.channelType = ''
  filters.departmentId = ''
  filters.status = ''
}

const getChannelLabel = (type: string) => {
  const found = channelTypes.value.find(t => t.value === type)
  return found?.label || type
}

const getChannelColor = (type: string) => {
  const colors: Record<string, string> = {
    system: '#722ED1',
    dingtalk: '#1890FF',
    wechat_work: '#52C41A',
    wechat_mp: '#07C160',
    email: '#FA8C16',
    sms: '#FF4D4F'
  }
  return colors[type] || '#909399'
}

const getChannelIcon = (type: string) => {
  const icons: Record<string, any> = {
    system: Monitor,
    dingtalk: ChatDotRound,
    wechat_work: ChatLineSquare,
    wechat_mp: ChatRound,
    email: Message,
    sms: Iphone
  }
  return icons[type] || Monitor
}

const formatDate = (date: string) => {
  return date ? dayjs(date).format('YYYY-MM-DD HH:mm') : ''
}

const getMemberName = (userId: string) => {
  const user = users.value.find((u: any) => u.id === userId) as any
  return user?.realName || user?.name || user?.username || userId
}

const isConfigComplete = (channel: any) => {
  if (channel.channelType === 'system') return true
  const config = channel.config || {}
  const typeConfig = channelTypes.value.find(t => t.value === channel.channelType)
  if (!typeConfig) return false
  const requiredFields = (typeConfig.configFields || []).filter((f: any) => f.required)
  return requiredFields.every((f: any) => config[f.key])
}

const showCreateDialog = () => {
  isEdit.value = false
  resetForm()
  dialogVisible.value = true
}

const editChannel = (channel: any) => {
  isEdit.value = true
  form.id = channel.id
  form.name = channel.name
  form.channelType = channel.channelType
  form.config = { ...(channel.config || {}) }
  form.messageTypes = [...(channel.messageTypes || [])]
  form.targetType = channel.targetType || 'all'
  form.targetDepartments = [...(channel.targetDepartments || [])]
  form.targetUsers = [...(channel.targetUsers || [])]
  dialogVisible.value = true
}

const resetForm = () => {
  form.id = ''
  form.name = ''
  form.channelType = ''
  form.config = {}
  form.messageTypes = []
  form.targetType = 'all'
  form.targetDepartments = []
  form.targetUsers = []
}

const saveChannel = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    saving.value = true

    const data = {
      name: form.name,
      channelType: form.channelType,
      config: form.config,
      messageTypes: form.messageTypes,
      targetType: form.targetType,
      targetDepartments: form.targetType === 'departments' ? form.targetDepartments : [],
      targetUsers: form.targetType === 'users' ? form.targetUsers : []
    }

    if (isEdit.value) {
      await messageApi.updateNotificationChannel(form.id, data)
      ElMessage.success('更新成功')
    } else {
      await messageApi.createNotificationChannel(data)
      ElMessage.success('创建成功')
    }

    dialogVisible.value = false
    loadChannels()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error.message || '保存失败')
    }
  } finally {
    saving.value = false
  }
}

const deleteChannel = async (channel: any) => {
  try {
    await ElMessageBox.confirm(`确定要删除"${channel.name}"吗？`, '确认删除', { type: 'warning' })
    await messageApi.deleteNotificationChannel(channel.id)
    ElMessage.success('删除成功')
    loadChannels()
  } catch (_e) {
    // 用户取消
  }
}

const toggleChannelStatus = async (channel: any) => {
  channel.statusLoading = true
  try {
    await messageApi.updateNotificationChannel(channel.id, { isEnabled: channel.isEnabled })
    ElMessage.success(channel.isEnabled ? '已启用' : '已禁用')
  } catch (_e) {
    channel.isEnabled = !channel.isEnabled
    ElMessage.error('状态更新失败')
  } finally {
    channel.statusLoading = false
  }
}

const testChannel = async (channel: any) => {
  channel.testLoading = true
  try {
    const res = await messageApi.testNotificationChannel(channel.id, '这是一条测试消息') as any
    if (res.success) {
      ElMessage.success(res.message || '测试发送成功')
    } else {
      ElMessage.error(res.message || '测试发送失败')
    }
  } catch (_e) {
    ElMessage.error('测试发送失败')
  } finally {
    channel.testLoading = false
  }
}

const updateChannelDepartments = async (channel: any) => {
  try {
    await messageApi.updateNotificationChannel(channel.id, {
      targetDepartments: channel.targetDepartments
    })
  } catch (_e) {
    ElMessage.error('更新部门失败')
  }
}

const showMemberSelector = (channel: any) => {
  currentEditChannel.value = channel
  selectedMemberIds.value = [...(channel.targetUsers || [])]
  memberDialogVisible.value = true
}

const confirmMemberSelection = async () => {
  if (!currentEditChannel.value) return
  try {
    await messageApi.updateNotificationChannel(currentEditChannel.value.id, {
      targetUsers: selectedMemberIds.value
    })
    currentEditChannel.value.targetUsers = [...selectedMemberIds.value]
    memberDialogVisible.value = false
    ElMessage.success('成员更新成功')
  } catch (_e) {
    ElMessage.error('更新成员失败')
  }
}

const removeMember = async (channel: any, userId: string) => {
  const newUsers = (channel.targetUsers || []).filter((id: string) => id !== userId)
  try {
    await messageApi.updateNotificationChannel(channel.id, { targetUsers: newUsers })
    channel.targetUsers = newUsers
  } catch (_e) {
    ElMessage.error('移除成员失败')
  }
}

const showConfigDialog = (channel: any) => {
  editChannel(channel)
}

// 监听渠道类型变化，重置配置
watch(() => form.channelType, () => {
  if (!isEdit.value) {
    form.config = {}
  }
})

// 初始化
onMounted(async () => {
  await Promise.all([
    loadOptions(),
    userStore.loadUsers(),
    departmentStore.loadDepartments()
  ])
  loadChannels()
})
</script>


<style scoped>
.notification-config {
  padding: 0;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  padding: 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.header-left h3 {
  margin: 0 0 8px 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.header-left p {
  margin: 0;
  font-size: 14px;
  color: #909399;
}

.filter-section {
  margin-bottom: 20px;
  padding: 16px 20px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.filter-section :deep(.el-form-item) {
  margin-bottom: 0;
  margin-right: 16px;
}

.channel-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.channel-card {
  background: white;
  border-radius: 12px;
  border: 1px solid #e4e7ed;
  overflow: hidden;
  transition: all 0.3s ease;
}

.channel-card:hover {
  border-color: #409eff;
  box-shadow: 0 4px 12px rgba(64, 158, 255, 0.15);
}

.channel-card.is-disabled {
  opacity: 0.7;
  background: #fafafa;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #f0f2f5;
}

.channel-info {
  display: flex;
  align-items: center;
  gap: 16px;
}

.channel-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.channel-meta h4 {
  margin: 0 0 4px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.channel-type {
  font-size: 13px;
  color: #909399;
}

.card-body {
  padding: 20px;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}

.info-row {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.info-label {
  font-size: 13px;
  font-weight: 500;
  color: #606266;
}

.info-value {
  min-height: 32px;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
}

.member-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 8px;
}

.config-actions {
  gap: 12px;
}

.card-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background: #fafafa;
  border-top: 1px solid #f0f2f5;
}

.create-info {
  font-size: 12px;
  color: #909399;
}

.action-buttons {
  display: flex;
  gap: 8px;
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

/* 弹窗样式 */
.channel-option {
  display: flex;
  align-items: center;
  gap: 8px;
}

.channel-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
}

.channel-desc {
  margin-left: auto;
  font-size: 12px;
  color: #909399;
}

.info-icon {
  margin-left: 4px;
  color: #909399;
  cursor: help;
}

:deep(.el-checkbox-group) {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

:deep(.el-checkbox) {
  margin-right: 0;
}

:deep(.el-divider__text) {
  font-size: 14px;
  font-weight: 500;
  color: #606266;
}

:deep(.el-transfer) {
  display: flex;
  justify-content: center;
}

:deep(.el-transfer-panel) {
  width: 220px;
}

/* 响应式 */
@media (max-width: 1200px) {
  .card-body {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 768px) {
  .card-body {
    grid-template-columns: 1fr;
  }

  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
}
</style>
