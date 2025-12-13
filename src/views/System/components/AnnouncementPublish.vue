<template>
  <div class="announcement-publish">
    <div class="publish-header">
      <div class="header-left">
        <h3>公告发布管理</h3>
        <p>发布和管理系统公告</p>
      </div>
      <div class="header-right">
        <el-button type="primary" @click="showCreateDialog">
          <el-icon><Plus /></el-icon>
          发布公告
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <div class="filter-section">
      <el-form :model="filterForm" inline>
        <el-form-item label="公告状态">
          <el-select v-model="filterForm.status" placeholder="全部状态" clearable style="width: 120px">
            <el-option label="草稿" value="draft" />
            <el-option label="已发布" value="published" />
            <el-option label="已安排" value="scheduled" />
            <el-option label="已过期" value="expired" />
          </el-select>
        </el-form-item>
        <el-form-item label="公告类型">
          <el-select v-model="filterForm.type" placeholder="全部类型" clearable style="width: 120px">
            <el-option label="全公司" value="company" />
            <el-option label="部门" value="department" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="loadAnnouncements">
            <el-icon><Search /></el-icon>
            查询
          </el-button>
          <el-button @click="resetFilter">
            <el-icon><RefreshRight /></el-icon>
            重置
          </el-button>
        </el-form-item>
      </el-form>
    </div>

    <!-- 公告列表 -->
    <div class="announcement-list">
      <el-table
        :data="announcements"
        v-loading="loading"
        stripe
        style="width: 100%"
      >
        <el-table-column prop="title" label="公告标题" min-width="200">
          <template #default="{ row }">
            <div class="announcement-title">
              <el-icon class="title-icon"><ChatDotRound /></el-icon>
              <span>{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="公告类型" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'company' ? 'primary' : 'success'" size="small">
              {{ row.type === 'company' ? '全公司' : '部门' }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag
              :type="getStatusType(row.status)"
              size="small"
            >
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>

        <el-table-column label="显示方式" width="120" align="center">
          <template #default="{ row }">
            <div class="display-methods">
              <el-tooltip content="弹窗显示" v-if="row.isPopup">
                <el-icon class="method-icon popup"><Monitor /></el-icon>
              </el-tooltip>
              <el-tooltip content="横幅滚动" v-if="row.isMarquee">
                <el-icon class="method-icon marquee"><Promotion /></el-icon>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>

        <el-table-column label="发布时间" width="160" align="center">
          <template #default="{ row }">
            <div class="publish-time">
              {{ row.publishedAt || row.scheduledAt || '-' }}
            </div>
          </template>
        </el-table-column>

        <el-table-column label="送达/已读" width="120" align="center">
          <template #default="{ row }">
            <div v-if="row.status === 'published'" class="read-stats">
              <span class="delivered">{{ row.deliveredCount || 0 }}</span>
              <span class="separator">/</span>
              <span class="read">{{ row.readCount || 0 }}</span>
            </div>
            <span v-else style="color: #909399;">-</span>
          </template>
        </el-table-column>

        <el-table-column label="创建人" width="100" align="center">
          <template #default="{ row }">
            {{ row.createdBy }}
          </template>
        </el-table-column>

        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" @click="editAnnouncement(row)">
              编辑
            </el-button>
            <el-button
              v-if="row.status === 'draft'"
              type="success"
              size="small"
              @click="publishAnnouncement(row)"
            >
              发布
            </el-button>
            <el-button type="danger" size="small" @click="deleteAnnouncement(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 创建/编辑公告对话框 -->
    <el-dialog
      v-model="dialogVisible"
      :title="isEdit ? '编辑公告' : '发布公告'"
      width="800px"
      @close="resetForm"
    >
      <el-form :model="announcementForm" :rules="formRules" ref="formRef" label-width="100px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="announcementForm.title" placeholder="请输入公告标题" />
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <div class="editor-container">
            <Toolbar
              style="border-bottom: 1px solid #ccc"
              :editor="editorRef"
              :defaultConfig="toolbarConfig"
              :mode="mode"
            />
            <Editor
              style="height: 300px; overflow-y: hidden;"
              v-model="announcementForm.content"
              :defaultConfig="editorConfig"
              :mode="mode"
              @onCreated="handleCreated"
              @onChange="handleChange"
            />
          </div>
        </el-form-item>

        <el-form-item label="公告类型" prop="type">
          <el-radio-group v-model="announcementForm.type">
            <el-radio label="company">全公司</el-radio>
            <el-radio label="department">指定部门</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="announcementForm.type === 'department'"
          label="目标部门"
          prop="targetDepartments"
        >
          <el-select
            v-model="announcementForm.targetDepartments"
            multiple
            placeholder="请选择目标部门"
            style="width: 100%"
          >
            <el-option label="销售部" value="sales" />
            <el-option label="技术部" value="tech" />
            <el-option label="市场部" value="marketing" />
            <el-option label="财务部" value="finance" />
            <el-option label="人事部" value="hr" />
          </el-select>
        </el-form-item>

        <el-form-item label="显示方式">
          <el-checkbox v-model="announcementForm.isPopup">弹窗显示</el-checkbox>
          <el-checkbox v-model="announcementForm.isMarquee">横幅滚动</el-checkbox>
        </el-form-item>

        <el-form-item label="发布方式">
          <el-radio-group v-model="publishType">
            <el-radio label="immediate">立即发布</el-radio>
            <el-radio label="scheduled">定时发布</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item
          v-if="publishType === 'scheduled'"
          label="发布时间"
          prop="scheduledAt"
        >
          <el-date-picker
            v-model="announcementForm.scheduledAt"
            type="datetime"
            placeholder="选择发布时间"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAnnouncement" :loading="submitting">
          {{ isEdit ? '更新' : '发布' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, shallowRef } from 'vue'
import { useMessageStore } from '@/stores/message'
import { messageApi } from '@/api/message'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  Search,
  RefreshRight,
  ChatDotRound,
  Monitor,
  Promotion
} from '@element-plus/icons-vue'
import '@wangeditor/editor/dist/css/style.css'
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'
import { createEditor, createToolbar } from '@wangeditor/editor'

// 使用消息Store
const messageStore = useMessageStore()

// 富文本编辑器相关
const editorRef = shallowRef()
const mode = 'default'

const toolbarConfig = {
  toolbarKeys: [
    'headerSelect',
    'bold',
    'italic',
    'underline',
    'through',
    'color',
    'bgColor',
    '|',
    'fontSize',
    'fontFamily',
    'lineHeight',
    '|',
    'bulletedList',
    'numberedList',
    'todo',
    '|',
    'emotion',
    'insertLink',
    'insertImage',
    'insertTable',
    'codeBlock',
    'divider',
    '|',
    'undo',
    'redo',
    '|',
    'fullScreen'
  ]
}

const editorConfig = {
  placeholder: '请输入公告内容...',
  MENU_CONF: {
    uploadImage: {
      server: '/api/v1/upload/image',
      fieldName: 'file',
      maxFileSize: 5 * 1024 * 1024, // 5M
      allowedFileTypes: ['image/*'],
      onBeforeUpload(file: File) {
        console.log('onBeforeUpload', file)
        return file
      },
      onProgress(progress: number) {
        console.log('onProgress', progress)
      },
      onSuccess(file: File, res: any) {
        console.log('onSuccess', file, res)
      },
      onFailed(file: File, res: any) {
        console.log('onFailed', file, res)
        ElMessage.error('图片上传失败')
      },
      onError(file: File, err: any, res: any) {
        console.log('onError', file, err, res)
        ElMessage.error('图片上传出错')
      }
    }
  }
}

// 状态
const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const isEdit = ref(false)
const publishType = ref('immediate')

// 筛选表单
const filterForm = reactive({
  status: '',
  type: ''
})

// 公告列表
const announcements = ref([])

// 公告表单
const announcementForm = reactive({
  title: '',
  content: '',
  type: 'company',
  targetDepartments: [],
  isPopup: false,
  isMarquee: true,
  scheduledAt: ''
})

// 表单验证规则
const formRules = {
  title: [
    { required: true, message: '请输入公告标题', trigger: 'blur' }
  ],
  content: [
    { required: true, message: '请输入公告内容', trigger: 'blur' }
  ],
  type: [
    { required: true, message: '请选择公告类型', trigger: 'change' }
  ],
  targetDepartments: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (announcementForm.type === 'department' && (!value || value.length === 0)) {
          callback(new Error('请选择目标部门'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ],
  scheduledAt: [
    {
      validator: (rule: any, value: any, callback: any) => {
        if (publishType.value === 'scheduled' && !value) {
          callback(new Error('请选择发布时间'))
        } else {
          callback()
        }
      },
      trigger: 'change'
    }
  ]
}

const formRef = ref()

// 获取状态类型
const getStatusType = (status: string) => {
  if (!status) return 'info' // 添加null检查
  const types: Record<string, string> = {
    draft: 'info',
    published: 'success',
    scheduled: 'warning',
    expired: 'danger'
  }
  return types[status] || 'info'
}

// 获取状态文本
const getStatusText = (status: string) => {
  if (!status) return '未知状态' // 添加null检查
  const texts: Record<string, string> = {
    draft: '草稿',
    published: '已发布',
    scheduled: '已安排',
    expired: '已过期'
  }
  return texts[status] || status
}

// 加载公告列表
const loadAnnouncements = async () => {
  loading.value = true
  try {
    const response = await messageStore.loadAnnouncements(filterForm)
    // 检查响应格式并正确处理数据
    if (response && response.success && response.data) {
      // 后端返回 { list: [], total: 0 } 格式
      if (Array.isArray(response.data.list)) {
        announcements.value = response.data.list
      } else if (Array.isArray(response.data)) {
        announcements.value = response.data
      } else {
        announcements.value = []
      }
    } else if (response && Array.isArray(response)) {
      announcements.value = response
    } else {
      announcements.value = []
    }
  } catch (error) {
    console.error('加载公告列表失败:', error)
    announcements.value = []
  } finally {
    loading.value = false
  }
}

// 重置筛选条件
const resetFilter = () => {
  filterForm.status = ''
  filterForm.type = ''
  loadAnnouncements()
}

// 显示创建对话框
const showCreateDialog = () => {
  isEdit.value = false
  dialogVisible.value = true
}

// 编辑公告
const editAnnouncement = (row: any) => {
  isEdit.value = true
  Object.assign(announcementForm, {
    id: row.id,
    title: row.title,
    content: row.content,
    type: row.type,
    targetDepartments: row.targetDepartments || [],
    isPopup: row.isPopup,
    isMarquee: row.isMarquee,
    scheduledAt: row.scheduledAt || ''
  })
  publishType.value = row.scheduledAt ? 'scheduled' : 'immediate'
  dialogVisible.value = true
}

// 发布公告
const publishAnnouncement = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认发布此公告吗？', '确认发布', {
      type: 'warning'
    })

    await messageStore.updateAnnouncement(row.id, { status: 'published' })
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('发布公告失败:', error)
    }
  }
}

// 删除公告
const deleteAnnouncement = async (row: any) => {
  try {
    await ElMessageBox.confirm('确认删除此公告吗？删除后无法恢复。', '确认删除', {
      type: 'warning'
    })

    await messageStore.deleteAnnouncement(row.id)
    loadAnnouncements()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除公告失败:', error)
    }
  }
}

// 保存公告
const saveAnnouncement = async () => {
  if (!formRef.value) return

  try {
    await formRef.value.validate()

    submitting.value = true

    // 构建后端期望的数据格式
    const data: any = {
      title: announcementForm.title,
      content: announcementForm.content,
      type: announcementForm.type === 'company' ? 'notice' : 'department',
      priority: 'normal',
      targetDepartments: announcementForm.type === 'department' ? announcementForm.targetDepartments : null,
      isPinned: false
    }

    // 如果是定时发布
    if (publishType.value === 'scheduled' && announcementForm.scheduledAt) {
      data.startTime = announcementForm.scheduledAt
    }

    if (isEdit.value) {
      await messageStore.updateAnnouncement((announcementForm as any).id, data)
    } else {
      // 创建公告
      const result = await messageStore.createAnnouncement(data)

      // 如果是立即发布，还需要调用发布接口
      if (publishType.value === 'immediate' && result && result.id) {
        await messageApi.publishAnnouncement(result.id)
      }
    }

    dialogVisible.value = false
    resetForm()
    loadAnnouncements()
  } catch (error) {
    console.error('保存公告失败:', error)
  } finally {
    submitting.value = false
  }
}

// 重置表单
const resetForm = () => {
  Object.assign(announcementForm, {
    title: '',
    content: '',
    type: 'company',
    targetDepartments: [],
    isPopup: false,
    isMarquee: true,
    scheduledAt: ''
  })
  publishType.value = 'immediate'
  if (formRef.value) {
    formRef.value.resetFields()
  }
}

// 富文本编辑器事件处理
const handleCreated = (editor: any) => {
  editorRef.value = editor
}

const handleChange = (editor: any) => {
  // 编辑器内容变化时的处理
}

// 生命周期
onMounted(() => {
  loadAnnouncements()
})

onBeforeUnmount(() => {
  const editor = editorRef.value
  if (editor == null) return
  editor.destroy()
})
</script>

<style scoped>
.announcement-publish {
  padding: 24px;
}

.publish-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.header-left h3 {
  margin: 0 0 4px 0;
  color: #303133;
  font-size: 18px;
  font-weight: 600;
}

.header-left p {
  margin: 0;
  color: #909399;
  font-size: 14px;
}

.filter-section {
  margin-bottom: 16px;
  padding: 16px;
  background: #fafafa;
  border-radius: 8px;
}

.announcement-list {
  margin-bottom: 24px;
}

.announcement-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.title-icon {
  color: #409eff;
  font-size: 16px;
}

.display-methods {
  display: flex;
  justify-content: center;
  gap: 8px;
}

.method-icon {
  font-size: 16px;
  cursor: pointer;
}

.method-icon.popup {
  color: #67c23a;
}

.method-icon.marquee {
  color: #e6a23c;
}

.publish-time {
  font-size: 12px;
  color: #909399;
}

.read-stats {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  font-size: 13px;
}

.read-stats .delivered {
  color: #409EFF;
  font-weight: 500;
}

.read-stats .separator {
  color: #909399;
}

.read-stats .read {
  color: #67C23A;
  font-weight: 500;
}

.editor-container {
  border: 1px solid #ccc;
  border-radius: 4px;
  overflow: hidden;
}

.editor-container :deep(.w-e-text-container) {
  background-color: #fff;
}

.editor-container :deep(.w-e-toolbar) {
  background-color: #fafafa;
  border-bottom: 1px solid #e8e8e8;
}

.editor-container :deep(.w-e-text-placeholder) {
  color: #999;
  font-style: normal;
}

.editor-container :deep(.w-e-scroll) {
  max-height: 300px;
}

:deep(.el-table) {
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  overflow: hidden;
}

:deep(.el-table th) {
  background-color: #fafafa;
  color: #606266;
  font-weight: 500;
}

:deep(.el-dialog__body) {
  padding: 20px 20px 0 20px;
}

:deep(.el-form-item__label) {
  font-weight: 500;
}

:deep(.el-checkbox) {
  margin-right: 20px;
}
</style>
