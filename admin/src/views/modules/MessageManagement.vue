<template>
  <div class="message-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-info">
        <h2>消息管理</h2>
        <p class="header-desc">管理系统公告发布和通知服务配置</p>
      </div>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="16" class="stats-row">
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon system-icon">
              <el-icon :size="28"><Bell /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.total }}</div>
              <div class="stat-label">系统公告总数</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon published-icon">
              <el-icon :size="28"><CircleCheck /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.published }}</div>
              <div class="stat-label">已发布</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="8">
        <el-card class="stat-card" shadow="hover">
          <div class="stat-content">
            <div class="stat-icon draft-icon">
              <el-icon :size="28"><EditPen /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-number">{{ stats.draft }}</div>
              <div class="stat-label">草稿</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 标签页 -->
    <el-card class="main-card">
      <el-tabs v-model="activeTab">
        <!-- 系统公告发布 -->
        <el-tab-pane name="announcements">
          <template #label>
            <div class="tab-label">
              <el-icon><Bell /></el-icon>
              <span>系统公告</span>
            </div>
          </template>

          <!-- 操作栏 -->
          <div class="toolbar">
            <div class="toolbar-left">
              <el-select v-model="filterStatus" placeholder="公告状态" clearable style="width: 130px" @change="loadList">
                <el-option label="全部" value="" />
                <el-option label="草稿" value="draft" />
                <el-option label="已发布" value="published" />
              </el-select>
              <el-button @click="loadList" :loading="loading">
                <el-icon><Refresh /></el-icon>
                刷新
              </el-button>
            </div>
            <div class="toolbar-right">
              <el-button type="primary" @click="showCreateDialog">
                <el-icon><Plus /></el-icon>
                发布系统公告
              </el-button>
            </div>
          </div>

          <!-- 公告列表 -->
          <el-table :data="announcements" v-loading="loading" stripe border style="width: 100%">
            <el-table-column prop="title" label="公告标题" min-width="200">
              <template #default="{ row }">
                <div class="cell-title">
                  <el-icon class="title-icon" color="#f56c6c"><Bell /></el-icon>
                  <span>{{ row.title }}</span>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="优先级" width="100" align="center">
              <template #default="{ row }">
                <el-tag
                  :type="row.priority === 'urgent' ? 'danger' : row.priority === 'high' ? 'warning' : 'info'"
                  size="small"
                >
                  {{ getPriorityText(row.priority) }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="生效范围" width="160" align="center">
              <template #default="{ row }">
                <el-tag v-if="!row.targetTenants || row.targetTenants.length === 0" type="danger" size="small">
                  全部租户
                </el-tag>
                <el-tooltip v-else :content="row.targetTenants.join(', ')" placement="top">
                  <el-tag type="warning" size="small">
                    {{ row.targetTenants.length }} 个租户
                  </el-tag>
                </el-tooltip>
              </template>
            </el-table-column>

            <el-table-column label="状态" width="100" align="center">
              <template #default="{ row }">
                <el-tag :type="row.status === 'published' ? 'success' : 'info'" size="small">
                  {{ row.status === 'published' ? '已发布' : '草稿' }}
                </el-tag>
              </template>
            </el-table-column>

            <el-table-column label="显示方式" width="100" align="center">
              <template #default="{ row }">
                <div class="display-icons">
                  <el-tooltip content="弹窗" v-if="row.isPopup">
                    <el-icon color="#67c23a"><Monitor /></el-icon>
                  </el-tooltip>
                  <el-tooltip content="横幅" v-if="row.isMarquee">
                    <el-icon color="#e6a23c"><Promotion /></el-icon>
                  </el-tooltip>
                </div>
              </template>
            </el-table-column>

            <el-table-column label="发布时间" width="170" align="center">
              <template #default="{ row }">
                <span class="time-text">{{ formatTime(row.publishedAt || row.createdAt) }}</span>
              </template>
            </el-table-column>

            <el-table-column label="送达" width="80" align="center">
              <template #default="{ row }">
                <span v-if="row.status === 'published'">{{ row.deliveredCount || 0 }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="已读" width="80" align="center">
              <template #default="{ row }">
                <span v-if="row.status === 'published'">{{ row.readCount || 0 }}</span>
                <span v-else class="text-muted">-</span>
              </template>
            </el-table-column>

            <el-table-column label="操作" width="260" align="center" fixed="right">
              <template #default="{ row }">
                <el-button size="small" @click="previewAnnouncement(row)">预览</el-button>
                <el-button type="primary" size="small" @click="editAnnouncement(row)" :disabled="row.status === 'published'">编辑</el-button>
                <el-button
                  v-if="row.status === 'draft'"
                  type="success"
                  size="small"
                  @click="publishAnnouncement(row)"
                >
                  发布
                </el-button>
                <el-button type="danger" size="small" @click="deleteAnnouncement(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>

          <!-- 分页 -->
          <div class="pagination-wrapper" v-if="total > pageSize">
            <el-pagination
              v-model:current-page="currentPage"
              :page-size="pageSize"
              :total="total"
              layout="total, prev, pager, next"
              @current-change="loadList"
            />
          </div>
        </el-tab-pane>

        <!-- 通知服务总览（计划中） -->
        <el-tab-pane name="notification">
          <template #label>
            <div class="tab-label">
              <el-icon><ChatDotRound /></el-icon>
              <span>通知服务</span>
            </div>
          </template>
          <div style="padding: 40px 0;">
            <el-empty description="通知服务功能规划中">
              <template #description>
                <div style="color: #909399; line-height: 1.8;">
                  <p style="font-size: 15px; font-weight: 500; color: #606266;">📋 通知服务功能规划</p>
                  <p>• 多渠道通知：支持钉钉、企业微信、邮件等渠道推送</p>
                  <p>• 通知模板：自定义消息模板，支持变量替换</p>
                  <p>• 发送记录：查看通知发送历史和送达状态</p>
                  <p>• 渠道配置：管理各通知渠道的 API 密钥和参数</p>
                  <p style="margin-top: 12px; color: #c0c4cc; font-size: 12px;">该功能正在开发中，敬请期待</p>
                </div>
              </template>
            </el-empty>
          </div>
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 预览对话框 -->
    <el-dialog v-model="previewVisible" title="公告预览" width="650px">
      <div v-if="previewData" class="preview-content">
        <h3 class="preview-title">{{ previewData.title }}</h3>
        <div class="preview-meta">
          <el-tag type="danger" size="small">系统公告</el-tag>
          <el-tag :type="previewData.priority === 'urgent' ? 'danger' : 'info'" size="small">
            {{ { urgent: '紧急', high: '高', normal: '普通' }[previewData.priority] || '普通' }}
          </el-tag>
          <span class="meta-time">{{ formatTime(previewData.publishedAt || previewData.createdAt) }}</span>
          <span class="meta-author">{{ previewData.createdByName || '系统管理员' }}</span>
        </div>
        <div class="preview-scope">
          <strong>生效范围：</strong>
          <span v-if="!previewData.targetTenants || previewData.targetTenants.length === 0">全部租户</span>
          <span v-else>{{ previewData.targetTenants.length }} 个指定租户</span>
        </div>
        <div class="preview-body" v-html="previewData.content"></div>
      </div>
      <template #footer>
        <el-button @click="previewVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 创建/编辑对话框 -->
    <el-dialog
      v-model="editVisible"
      :title="isEdit ? '编辑系统公告' : '发布系统公告'"
      width="850px"
      :close-on-press-escape="false"
      :before-close="handleDialogClose"
      destroy-on-close
    >
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="110px">
        <el-form-item label="公告标题" prop="title">
          <el-input v-model="form.title" placeholder="请输入公告标题" maxlength="200" show-word-limit />
        </el-form-item>

        <el-form-item label="公告内容" prop="content">
          <div class="editor-container">
            <Toolbar
              style="border-bottom: 1px solid #ccc"
              :editor="editorRef"
              :defaultConfig="toolbarConfig"
              mode="default"
            />
            <Editor
              style="height: 300px; overflow-y: hidden;"
              v-model="form.content"
              :defaultConfig="editorConfig"
              mode="default"
              @onCreated="handleEditorCreated"
            />
          </div>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="优先级">
              <el-select v-model="form.priority" style="width: 100%">
                <el-option label="普通" value="normal" />
                <el-option label="高" value="high" />
                <el-option label="紧急" value="urgent" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="公告类型">
              <el-select v-model="form.type" style="width: 100%">
                <el-option label="通知公告" value="notice" />
                <el-option label="系统维护" value="maintenance" />
                <el-option label="版本更新" value="update" />
                <el-option label="安全通知" value="security" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="生效范围">
          <el-radio-group v-model="scopeType" @change="handleScopeChange">
            <el-radio label="all">全部租户</el-radio>
            <el-radio label="selected">指定租户</el-radio>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="scopeType === 'selected'" label="选择租户">
          <el-select
            v-model="form.targetTenants"
            multiple
            filterable
            placeholder="请选择目标租户"
            style="width: 100%"
            v-loading="tenantsLoading"
          >
            <el-option
              v-for="t in tenantOptions"
              :key="t.id"
              :label="`${t.name} (${t.code})`"
              :value="t.id"
            />
          </el-select>
        </el-form-item>

        <el-form-item label="显示方式">
          <el-checkbox v-model="form.isPopup">弹窗显示</el-checkbox>
          <el-checkbox v-model="form.isMarquee">横幅滚动</el-checkbox>
          <el-checkbox v-model="form.isPinned">置顶</el-checkbox>
        </el-form-item>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="生效开始">
              <el-date-picker
                v-model="form.startTime"
                type="datetime"
                placeholder="留空则立即生效"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="生效结束">
              <el-date-picker
                v-model="form.endTime"
                type="datetime"
                placeholder="留空则永久有效"
                style="width: 100%"
              />
            </el-form-item>
          </el-col>
        </el-row>
      </el-form>

      <!-- 发布明细提示 -->
      <div class="publish-hint" v-if="!isEdit">
        <el-alert type="info" :closable="false" show-icon>
          <template #title>
            <strong>发布说明</strong>
          </template>
          <div>
            <p>• 系统公告创建后默认为<strong>草稿</strong>状态，需手动点击"发布"按钮生效</p>
            <p>• 生效范围为"全部租户"时，所有 CRM 用户将收到此公告</p>
            <p>• 系统公告在 CRM 端以<strong style="color: #f56c6c;">红色标签</strong>显示，与公司公告区分</p>
          </div>
        </el-alert>
      </div>

      <template #footer>
        <el-button @click="editVisible = false">取消</el-button>
        <el-button type="primary" @click="saveAnnouncement" :loading="submitting">
          {{ isEdit ? '保存修改' : '创建草稿' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onBeforeUnmount, shallowRef, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Bell, Plus, CircleCheck, EditPen, Monitor, Promotion, ChatDotRound, Refresh
} from '@element-plus/icons-vue'
import { announcementApi } from '@/api/announcements'
import type { SystemAnnouncement, TenantOption } from '@/api/announcements'
import '@wangeditor/editor/dist/css/style.css'
// @ts-ignore
import { Editor, Toolbar } from '@wangeditor/editor-for-vue'

// === 列表状态 ===
const loading = ref(false)
const announcements = ref<SystemAnnouncement[]>([])
const total = ref(0)
const currentPage = ref(1)
const pageSize = 20
const filterStatus = ref('')
const activeTab = ref('announcements')

// 统计
const stats = computed(() => {
  const all = announcements.value
  return {
    total: total.value,
    published: all.filter(a => a.status === 'published').length,
    draft: all.filter(a => a.status === 'draft').length
  }
})

// === 表单状态 ===
const editVisible = ref(false)
const previewVisible = ref(false)
const previewData = ref<SystemAnnouncement | null>(null)
const isEdit = ref(false)
const submitting = ref(false)
const scopeType = ref<'all' | 'selected'>('all')
const formRef = ref()
const editingId = ref('')

const form = reactive({
  title: '',
  content: '',
  type: 'notice',
  priority: 'normal',
  targetTenants: [] as string[],
  isPinned: false,
  isPopup: false,
  isMarquee: true,
  startTime: null as Date | null,
  endTime: null as Date | null
})

const formRules = {
  title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
  content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
}

// 租户选项
const tenantOptions = ref<TenantOption[]>([])
const tenantsLoading = ref(false)

// === 富文本编辑器 ===
const editorRef = shallowRef()

const toolbarConfig = {
  toolbarKeys: [
    'headerSelect', 'bold', 'italic', 'underline', 'through', 'color', 'bgColor',
    '|', 'fontSize', 'fontFamily', 'lineHeight',
    '|', 'bulletedList', 'numberedList', 'todo',
    '|', 'emotion', 'insertLink', 'insertTable', 'codeBlock', 'divider',
    '|', 'undo', 'redo', '|', 'fullScreen'
  ]
}

const editorConfig = {
  placeholder: '请输入系统公告内容...'
}

const handleEditorCreated = (editor: any) => {
  editorRef.value = editor
}

// === 方法 ===
const priorityMap: Record<string, string> = { urgent: '紧急', high: '高', normal: '普通', low: '低' }
const getPriorityText = (p: string) => priorityMap[p] || '普通'

const loadList = async () => {
  loading.value = true
  try {
    const res = await announcementApi.getList({
      status: filterStatus.value || undefined,
      page: currentPage.value,
      pageSize
    })
    if (res.data) {
      announcements.value = res.data.list || []
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('加载公告失败:', e)
    announcements.value = []
  } finally {
    loading.value = false
  }
}

const loadTenants = async () => {
  tenantsLoading.value = true
  try {
    const res = await announcementApi.getTenants()
    tenantOptions.value = res.data || []
  } catch (e) {
    console.error('加载租户列表失败:', e)
  } finally {
    tenantsLoading.value = false
  }
}

const formatTime = (time: string | Date) => {
  if (!time) return '-'
  return new Date(time).toLocaleString('zh-CN', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit'
  })
}

const showCreateDialog = () => {
  isEdit.value = false
  editingId.value = ''
  resetForm()
  editVisible.value = true
  loadTenants()
}

const editAnnouncement = (row: SystemAnnouncement) => {
  isEdit.value = true
  editingId.value = row.id
  Object.assign(form, {
    title: row.title,
    content: row.content,
    type: row.type,
    priority: row.priority,
    targetTenants: row.targetTenants || [],
    isPinned: row.isPinned,
    isPopup: row.isPopup,
    isMarquee: row.isMarquee,
    startTime: row.startTime ? new Date(row.startTime) : null,
    endTime: row.endTime ? new Date(row.endTime) : null
  })
  scopeType.value = (row.targetTenants && row.targetTenants.length > 0) ? 'selected' : 'all'
  editVisible.value = true
  loadTenants()
}

const previewAnnouncement = (row: SystemAnnouncement) => {
  previewData.value = row
  previewVisible.value = true
}

const publishAnnouncement = async (row: SystemAnnouncement) => {
  try {
    await ElMessageBox.confirm(
      `确认发布系统公告"${row.title}"？发布后将通知${!row.targetTenants || row.targetTenants.length === 0 ? '全部租户' : row.targetTenants.length + '个指定租户'}的用户。`,
      '确认发布',
      { type: 'warning' }
    )
    await announcementApi.publish(row.id)
    ElMessage.success('发布成功')
    loadList()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('发布失败')
    }
  }
}

const deleteAnnouncement = async (row: SystemAnnouncement) => {
  try {
    await ElMessageBox.confirm('确认删除此系统公告？', '确认删除', { type: 'warning' })
    await announcementApi.remove(row.id)
    ElMessage.success('删除成功')
    loadList()
  } catch (e: any) {
    if (e !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const saveAnnouncement = async () => {
  if (!formRef.value) return
  try {
    await formRef.value.validate()
    submitting.value = true

    const data: any = {
      title: form.title,
      content: form.content,
      type: form.type,
      priority: form.priority,
      targetTenants: scopeType.value === 'all' ? null : form.targetTenants,
      isPinned: form.isPinned,
      isPopup: form.isPopup,
      isMarquee: form.isMarquee,
      startTime: form.startTime || null,
      endTime: form.endTime || null
    }

    if (isEdit.value) {
      await announcementApi.update(editingId.value, data)
      ElMessage.success('更新成功')
    } else {
      await announcementApi.create(data)
      ElMessage.success('创建成功，请在列表中点击"发布"使其生效')
    }

    editVisible.value = false
    loadList()
  } catch (e: any) {
    if (e !== 'cancel' && e?.message) {
      ElMessage.error(e.message)
    }
  } finally {
    submitting.value = false
  }
}

const handleScopeChange = () => {
  if (scopeType.value === 'all') {
    form.targetTenants = []
  }
}

const resetForm = () => {
  Object.assign(form, {
    title: '', content: '', type: 'notice', priority: 'normal',
    targetTenants: [], isPinned: false, isPopup: false, isMarquee: true,
    startTime: null, endTime: null
  })
  scopeType.value = 'all'
  formRef.value?.resetFields()
}

// 对话框关闭前确认
const handleDialogClose = (done: () => void) => {
  if (form.title || form.content) {
    ElMessageBox.confirm('编辑内容尚未保存，确认关闭？', '提示', {
      confirmButtonText: '确认关闭',
      cancelButtonText: '继续编辑',
      type: 'warning'
    }).then(() => {
      resetForm()
      done()
    }).catch(() => {
      // 用户取消，不关闭
    })
  } else {
    done()
  }
}

// === 生命周期 ===
onMounted(() => {
  loadList()
})

onBeforeUnmount(() => {
  editorRef.value?.destroy()
})
</script>

<style scoped lang="scss">
.message-management {
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;

  h2 {
    margin: 0 0 4px;
    font-size: 22px;
    font-weight: 600;
    color: #303133;
  }

  .header-desc {
    margin: 0;
    font-size: 14px;
    color: #909399;
  }
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  .stat-content {
    display: flex;
    align-items: center;
    gap: 16px;
  }

  .stat-icon {
    width: 56px;
    height: 56px;
    border-radius: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
  }

  .system-icon { background: linear-gradient(135deg, #f56c6c, #e6323e); }
  .published-icon { background: linear-gradient(135deg, #67c23a, #529b2e); }
  .draft-icon { background: linear-gradient(135deg, #909399, #73767a); }

  .stat-number {
    font-size: 28px;
    font-weight: 700;
    color: #303133;
    line-height: 1;
  }

  .stat-label {
    font-size: 13px;
    color: #909399;
    margin-top: 4px;
  }
}

.main-card {
  :deep(.el-tabs__header) {
    margin-bottom: 0;
  }
}

.tab-label {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding: 12px 0;
}

.cell-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.display-icons {
  display: flex;
  justify-content: center;
  gap: 8px;
  font-size: 16px;
}

.time-text {
  font-size: 12px;
  color: #909399;
}

.pagination-wrapper {
  display: flex;
  justify-content: flex-end;
  margin-top: 16px;
}

/* 编辑器 */
.editor-container {
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;

  :deep(.w-e-text-container) {
    background: #fff;
  }

  :deep(.w-e-toolbar) {
    background: #fafafa;
    border-bottom: 1px solid #e8e8e8;
  }
}

/* 发布明细提示 */
.publish-hint {
  margin-top: 16px;

  p {
    margin: 4px 0;
    font-size: 13px;
    color: #606266;
  }
}

/* 预览 */
.preview-content {
  padding: 0;
}

.preview-title {
  margin: 0 0 16px;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.preview-meta {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid #ebeef5;

  .meta-time, .meta-author {
    font-size: 13px;
    color: #909399;
  }
}

.preview-scope {
  margin-bottom: 16px;
  padding: 8px 12px;
  background: #fef0f0;
  border-radius: 4px;
  font-size: 13px;
  color: #f56c6c;
}

.preview-body {
  font-size: 14px;
  line-height: 1.8;
  color: #606266;

  :deep(p) {
    margin: 0 0 12px;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 4px;
  }
}
</style>




