<template>
  <div>
    <el-card class="setting-card">
      <template #header>
        <div class="card-header">
          <span>用户协议管理</span>
          <div class="header-actions">
            <el-button
              v-if="canEditAgreement"
              @click="handleAddAgreement"
              type="success"
              :icon="Plus"
            >
              新增协议
            </el-button>
            <el-button
              v-if="canEditAgreement"
              @click="handleSaveAgreementList"
              type="primary"
              :loading="agreementLoading"
            >
              保存配置
            </el-button>
          </div>
        </div>
      </template>

      <el-alert
        title="协议说明"
        type="info"
        :closable="false"
        style="margin-bottom: 20px;"
      >
        <p>用户协议将在登录页面显示，用户必须同意协议才能登录系统。</p>
        <p>点击"编辑"按钮可以使用富文本编辑器编辑协议内容，启用后的协议将在登录页面显示。</p>
      </el-alert>

      <!-- 协议列表 -->
      <el-table :data="agreementList" border stripe style="width: 100%" class="agreement-table">
        <el-table-column type="index" label="序号" width="60" align="center" />
        <el-table-column prop="title" label="标题" width="180">
          <template #default="{ row }">
            <div class="agreement-title">
              <el-icon v-if="row.type === 'user'" color="#409EFF"><Document /></el-icon>
              <el-icon v-else color="#67C23A"><Lock /></el-icon>
              <span>{{ row.title }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="120" align="center">
          <template #default="{ row }">
            <el-tag :type="row.type === 'user' ? 'primary' : 'success'" size="small">
              {{ row.type === 'user' ? '使用协议' : '隐私协议' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="wordCount" label="字数" width="100" align="center">
          <template #default="{ row }">
            <span class="word-count">{{ row.wordCount }} 字</span>
          </template>
        </el-table-column>
        <el-table-column prop="summary" label="内容概述" min-width="200">
          <template #default="{ row }">
            <div class="content-summary">{{ row.summary }}</div>
          </template>
        </el-table-column>
        <el-table-column prop="updateTime" label="更新日期" width="160" align="center">
          <template #default="{ row }">
            <div class="update-time">
              <el-icon><Clock /></el-icon>
              <span>{{ row.updateTime }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="80" align="center">
          <template #default="{ row }">
            <el-tooltip :content="row.enabled ? '已启用' : '已禁用'" placement="top">
              <el-switch v-model="row.enabled" @change="handleAgreementStatusChange(row)" />
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" size="small" :icon="Edit" @click="handleEditAgreement(row)">编辑</el-button>
            <el-button type="info" size="small" :icon="View" @click="handlePreviewAgreement(row)">预览</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 协议编辑对话框 -->
    <AgreementEditorDialog
      v-model="agreementDialogVisible"
      :agreement="currentEditingAgreement"
      @save="handleSaveAgreementContent"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Edit, View, Clock, Document, Lock } from '@element-plus/icons-vue'
import { useUserStore } from '@/stores/user'
import { useConfigStore } from '@/stores/config'
import AgreementEditorDialog from '@/components/System/AgreementEditorDialog.vue'

const userStore = useUserStore()
const configStore = useConfigStore()

// 协议列表数据
const agreementList = ref([
  {
    id: 1,
    type: 'user',
    title: '用户使用协议',
    content: '',
    wordCount: 0,
    summary: '',
    updateTime: '',
    enabled: true
  },
  {
    id: 2,
    type: 'privacy',
    title: '用户隐私协议',
    content: '',
    wordCount: 0,
    summary: '',
    updateTime: '',
    enabled: true
  }
])

const agreementLoading = ref(false)
const canEditAgreement = computed(() => userStore.isAdmin)
const agreementDialogVisible = ref(false)
const currentEditingAgreement = ref<any>(null)

// 计算字数
const countWords = (html: string): number => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, '')
  return text.length
}

// 生成内容概述
const generateSummary = (html: string): string => {
  const text = html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.substring(0, 50) + (text.length > 50 ? '...' : '')
}

// 从localStorage加载协议列表
const loadAgreementList = () => {
  try {
    const savedList = localStorage.getItem('crm_agreement_list')
    if (savedList) {
      agreementList.value = JSON.parse(savedList)
      console.log('[协议列表] 已加载:', agreementList.value.length, '个协议')
    }
  } catch (error) {
    console.error('[协议列表] 加载失败:', error)
  }
}

// 保存协议列表到localStorage
const saveAgreementList = () => {
  try {
    localStorage.setItem('crm_agreement_list', JSON.stringify(agreementList.value))
    const userAgreement = agreementList.value.find(a => a.type === 'user')
    const privacyPolicy = agreementList.value.find(a => a.type === 'privacy')
    if (userAgreement && privacyPolicy) {
      configStore.updateSystemConfig({
        userAgreement: userAgreement.content,
        privacyPolicy: privacyPolicy.content
      })
    }
    console.log('[协议列表] 已保存')
  } catch (error) {
    console.error('[协议列表] 保存失败:', error)
    throw error
  }
}

// 编辑协议
const handleEditAgreement = (agreement: any) => {
  currentEditingAgreement.value = { ...agreement }
  agreementDialogVisible.value = true
}

// 保存编辑的协议
const handleSaveAgreementContent = (content: string) => {
  if (!currentEditingAgreement.value) return
  const index = agreementList.value.findIndex(a => a.id === currentEditingAgreement.value.id)
  if (index !== -1) {
    agreementList.value[index].content = content
    agreementList.value[index].wordCount = countWords(content)
    agreementList.value[index].summary = generateSummary(content)
    agreementList.value[index].updateTime = new Date().toLocaleString('zh-CN')
    ElMessage.success('协议内容已更新')
  } else {
    const newAgreement = {
      ...currentEditingAgreement.value,
      content,
      wordCount: countWords(content),
      summary: generateSummary(content),
      updateTime: new Date().toLocaleString('zh-CN')
    }
    agreementList.value.push(newAgreement)
    ElMessage.success('协议已添加')
  }
}

// 预览协议
const handlePreviewAgreement = (agreement: any) => {
  ElMessageBox.alert(
    `<div style="max-height: 500px; overflow-y: auto; padding: 10px; text-align: left; font-size: 14px; line-height: 1.8;">${agreement.content}</div>`,
    agreement.title,
    { confirmButtonText: '关闭', dangerouslyUseHTMLString: true, customStyle: { width: '65%', maxWidth: '800px' } }
  )
}

// 协议状态变更
const handleAgreementStatusChange = (agreement: any) => {
  ElMessage.success(`${agreement.title}已${agreement.enabled ? '启用' : '禁用'}`)
}

// 新增协议
const handleAddAgreement = () => {
  const newId = Math.max(...agreementList.value.map(a => a.id), 0) + 1
  currentEditingAgreement.value = {
    id: newId,
    type: 'custom',
    title: '新协议',
    content: '<p>请输入协议内容...</p>',
    wordCount: 0,
    summary: '暂无内容',
    updateTime: new Date().toLocaleString('zh-CN'),
    enabled: false
  }
  agreementDialogVisible.value = true
}

// 保存协议列表配置
const handleSaveAgreementList = async () => {
  try {
    agreementLoading.value = true
    saveAgreementList()
    ElMessage.success('协议配置保存成功')
  } catch (error) {
    console.error('[协议列表] 保存配置失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    agreementLoading.value = false
  }
}

onMounted(() => { loadAgreementList() })
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.agreement-title { display: flex; align-items: center; gap: 8px; }
.content-summary { color: #909399; font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 300px; }
.update-time { display: flex; align-items: center; gap: 4px; font-size: 13px; color: #909399; }
.word-count { color: #606266; font-size: 13px; }
</style>

