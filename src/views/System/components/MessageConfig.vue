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
            <div class="channel-icon" :class="`icon-${channel.channelType}`">
              <!-- 钉钉图标 -->
              <svg v-if="channel.channelType === 'dingtalk'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.12.03-1.99 1.27-5.62 3.72-.53.36-1.01.54-1.44.53-.47-.01-1.38-.27-2.06-.49-.83-.27-1.49-.42-1.43-.88.03-.24.37-.49 1.02-.74 3.98-1.73 6.64-2.87 7.97-3.43 3.8-1.57 4.59-1.85 5.1-1.86.11 0 .37.03.53.17.14.12.18.28.2.45-.01.06.01.24 0 .38z"/>
              </svg>
              <!-- 企业微信图标 -->
              <svg v-else-if="channel.channelType === 'wechat_work'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8.691 2.188C3.891 2.188 0 5.476 0 9.53c0 2.212 1.17 4.203 3.002 5.55a.59.59 0 01.213.665l-.39 1.48c-.019.07-.048.141-.048.213 0 .163.13.295.29.295a.326.326 0 00.167-.054l1.903-1.114a.864.864 0 01.717-.098 10.16 10.16 0 002.837.403c.276 0 .543-.027.811-.05-.857-2.578.157-4.972 1.932-6.446 1.703-1.415 3.882-1.98 5.853-1.838-.576-3.583-4.196-6.348-8.596-6.348zM5.785 5.991c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178A1.17 1.17 0 014.623 7.17c0-.651.52-1.18 1.162-1.18zm5.813 0c.642 0 1.162.529 1.162 1.18a1.17 1.17 0 01-1.162 1.178 1.17 1.17 0 01-1.162-1.178c0-.651.52-1.18 1.162-1.18zm5.34 2.867c-1.797-.052-3.746.512-5.28 1.786-1.72 1.428-2.687 3.72-1.78 6.22.942 2.453 3.666 4.229 6.884 4.229.826 0 1.622-.12 2.361-.336a.722.722 0 01.598.082l1.584.926a.272.272 0 00.14.045c.134 0 .24-.111.24-.247 0-.06-.023-.12-.038-.177l-.327-1.233a.582.582 0 01-.023-.156.49.49 0 01.201-.398C23.024 18.48 24 16.82 24 14.98c0-3.21-2.931-5.837-6.656-6.088V8.89c-.135-.01-.269-.03-.406-.03zm-2.53 3.274c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.97-.982zm4.844 0c.535 0 .969.44.969.982a.976.976 0 01-.969.983.976.976 0 01-.969-.983c0-.542.434-.982.969-.982z"/>
              </svg>
              <!-- 微信公众号图标 -->
              <svg v-else-if="channel.channelType === 'wechat_mp'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-2-9c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm4 0c.55 0 1-.45 1-1s-.45-1-1-1-1 .45-1 1 .45 1 1 1zm-2 5.5c2.33 0 4.31-1.46 5.11-3.5H6.89c.8 2.04 2.78 3.5 5.11 3.5z"/>
              </svg>
              <!-- 邮件图标 -->
              <svg v-else-if="channel.channelType === 'email'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
              </svg>
              <!-- 短信图标 -->
              <svg v-else-if="channel.channelType === 'sms'" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17 1.01L7 1c-1.1 0-2 .9-2 2v18c0 1.1.9 2 2 2h10c1.1 0 2-.9 2-2V3c0-1.1-.9-1.99-2-1.99zM17 19H7V5h10v14zm-4.2-5.78v1.75l3.2-2.99L12.8 9v1.7c-3.11.43-4.35 2.56-4.8 4.7 1.11-1.5 2.58-2.18 4.8-2.18z"/>
              </svg>
              <!-- 系统通知图标 -->
              <svg v-else viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
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

// 图标颜色和类型现在通过CSS类实现，保留这些方法用于其他地方
const _getChannelColor = (type: string) => {
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

const _getChannelIcon = (type: string) => {
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

.channel-icon svg {
  width: 26px;
  height: 26px;
}

/* 各渠道图标颜色 */
.channel-icon.icon-dingtalk {
  background: linear-gradient(135deg, #1890FF 0%, #096DD9 100%);
}

.channel-icon.icon-wechat_work {
  background: linear-gradient(135deg, #52C41A 0%, #389E0D 100%);
}

.channel-icon.icon-wechat_mp {
  background: linear-gradient(135deg, #07C160 0%, #06AD56 100%);
}

.channel-icon.icon-email {
  background: linear-gradient(135deg, #FA8C16 0%, #D46B08 100%);
}

.channel-icon.icon-sms {
  background: linear-gradient(135deg, #FF4D4F 0%, #CF1322 100%);
}

.channel-icon.icon-system {
  background: linear-gradient(135deg, #722ED1 0%, #531DAB 100%);
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
