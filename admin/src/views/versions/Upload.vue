<template>
  <div class="page-container">
    <el-card shadow="never" class="form-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <span class="title">发布新版本</span>
            <span class="subtitle">创建新的系统版本记录</span>
          </div>
          <el-button @click="$router.push('/versions/list')">
            <el-icon><Back /></el-icon>返回列表
          </el-button>
        </div>
      </template>

      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" class="form">
        <el-form-item label="版本号" prop="version">
          <el-input v-model="form.version" placeholder="如：1.8.0 或 2.0.0-beta" />
          <div class="form-tip">格式：主版本号.次版本号.修订号，如 1.8.0</div>
        </el-form-item>

        <el-form-item label="版本类型" prop="releaseType">
          <el-radio-group v-model="form.releaseType">
            <el-radio-button label="major">大版本</el-radio-button>
            <el-radio-button label="minor">功能更新</el-radio-button>
            <el-radio-button label="patch">补丁修复</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item label="更新源类型" prop="sourceType">
          <el-radio-group v-model="form.sourceType">
            <el-radio-button label="url">下载链接</el-radio-button>
            <el-radio-button label="upload">上传压缩包</el-radio-button>
            <el-radio-button label="git">Git 仓库</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <!-- URL 模式 -->
        <el-form-item v-if="form.sourceType === 'url'" label="下载地址" prop="downloadUrl">
          <el-input v-model="form.downloadUrl" placeholder="请输入版本文件下载地址（URL）" />
          <div class="form-tip">请填写版本文件的下载链接，支持 OSS、CDN 等外部地址</div>
        </el-form-item>

        <!-- 上传模式 -->
        <el-form-item v-if="form.sourceType === 'upload'" label="上传版本包">
          <el-upload
            class="version-upload"
            :action="uploadAction"
            :headers="uploadHeaders"
            :on-success="handleUploadSuccess"
            :on-error="handleUploadError"
            :before-upload="beforeUpload"
            :show-file-list="true"
            :limit="1"
            accept=".zip,.tar.gz,.tgz"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">拖拽文件到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">支持 .zip / .tar.gz 格式，最大 200MB</div>
            </template>
          </el-upload>
          <div v-if="form.packagePath" class="form-tip" style="color: #67c23a;">
            ✓ 已上传: {{ uploadedFileName }}（{{ formatFileSize(form.fileSize) }}）
          </div>
        </el-form-item>

        <!-- Git 模式 -->
        <template v-if="form.sourceType === 'git'">
          <el-form-item label="仓库地址" prop="gitRepoUrl">
            <el-input v-model="form.gitRepoUrl" placeholder="https://github.com/shushuhao01/crm-system.git" />
            <div class="form-tip">填写交付给私有部署客户的公开仓库地址，支持 HTTPS 格式</div>
          </el-form-item>
          <el-form-item label="分支">
            <el-input v-model="form.gitBranch" placeholder="main" style="width: 220px" />
          </el-form-item>
          <el-form-item label="标签 (Tag)">
            <el-input v-model="form.gitTag" placeholder="如 v1.9.0（优先于分支）" style="width: 220px" />
          </el-form-item>
        </template>

        <el-form-item label="目标受众">
          <el-radio-group v-model="form.targetAudience">
            <el-radio-button label="all">全部客户</el-radio-button>
            <el-radio-button label="private">仅私有客户</el-radio-button>
            <el-radio-button label="saas">仅SaaS租户</el-radio-button>
          </el-radio-group>
        </el-form-item>

        <el-form-item v-if="form.sourceType === 'url'" label="文件大小">
          <el-input-number v-model="form.fileSize" :min="0" :step="1024" placeholder="文件大小（字节）" style="width: 220px" />
          <span class="form-tip" style="margin-left: 12px">{{ form.fileSize ? formatFileSize(form.fileSize) : '' }}</span>
        </el-form-item>

        <el-form-item v-if="form.sourceType === 'url'" label="文件Hash">
          <el-input v-model="form.fileHash" placeholder="文件校验值（MD5/SHA256），可选" />
        </el-form-item>

        <el-form-item label="最低版本要求">
          <el-input v-model="form.minVersion" placeholder="如：1.5.0（低于此版本必须先更新到此版本）" style="width: 220px" />
        </el-form-item>

        <el-form-item label="更新说明" prop="changelog">
          <el-input v-model="form.changelog" type="textarea" :rows="8" placeholder="请输入更新说明，支持多行文本&#10;&#10;示例：&#10;【新功能】&#10;- 新增外呼系统模块&#10;- 支持多租户模式&#10;&#10;【修复】&#10;- 修复订单分页问题" />
        </el-form-item>

        <el-form-item label="强制更新">
          <el-switch v-model="form.isForceUpdate" />
          <span class="form-tip" style="margin-left: 12px">开启后客户端必须更新到此版本才能继续使用</span>
        </el-form-item>

        <el-form-item>
          <el-button type="primary" @click="handleSubmit" :loading="loading">
            <el-icon><Check /></el-icon>保存版本
          </el-button>
          <el-button @click="handleReset">重置表单</el-button>
        </el-form-item>
      </el-form>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Back, Check, UploadFilled } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadProps } from 'element-plus'
import { adminApi } from '@/api/admin'

const router = useRouter()
const formRef = ref<FormInstance>()
const loading = ref(false)
const uploadedFileName = ref('')

const form = reactive({
  version: '',
  releaseType: 'minor',
  sourceType: 'url',
  downloadUrl: '',
  gitRepoUrl: '',
  gitBranch: 'main',
  gitTag: '',
  packagePath: '',
  targetAudience: 'all',
  fileSize: 0,
  fileHash: '',
  minVersion: '',
  changelog: '',
  isForceUpdate: false
})

const rules: FormRules = {
  version: [
    { required: true, message: '请输入版本号', trigger: 'blur' },
    { pattern: /^\d+\.\d+\.\d+(-\w+)?$/, message: '版本号格式不正确，如 1.8.0', trigger: 'blur' }
  ],
  releaseType: [{ required: true, message: '请选择版本类型', trigger: 'change' }],
  changelog: [{ required: true, message: '请输入更新说明', trigger: 'blur' }]
}

// 上传配置
const uploadAction = computed(() => {
  const base = import.meta.env.VITE_API_BASE_URL || '/api/v1/admin'
  return `${base}/upload/version-package`
})
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('admin_token') || ''
  return { Authorization: `Bearer ${token}` }
})

const formatFileSize = (bytes: number) => {
  if (!bytes) return ''
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

const beforeUpload: UploadProps['beforeUpload'] = (file) => {
  const isAllowed = /\.(zip|gz|tgz|tar)$/i.test(file.name)
  if (!isAllowed) {
    ElMessage.error('仅支持 .zip / .tar.gz / .tgz 格式文件')
    return false
  }
  const maxSize = 200 * 1024 * 1024
  if (file.size > maxSize) {
    ElMessage.error('文件大小不能超过 200MB')
    return false
  }
  return true
}

const handleUploadSuccess: UploadProps['onSuccess'] = (response: any) => {
  if (response.success) {
    form.packagePath = response.data.packagePath || response.data.url
    form.fileSize = response.data.size || 0
    form.fileHash = response.data.fileHash || ''
    uploadedFileName.value = response.data.originalname || ''
    ElMessage.success('版本包上传成功')
  } else {
    ElMessage.error(response.message || '上传失败')
  }
}

const handleUploadError = () => {
  ElMessage.error('文件上传失败，请重试')
}

const handleSubmit = async () => {
  const valid = await formRef.value?.validate().catch(() => false)
  if (!valid) return

  loading.value = true
  try {
    const data: any = {
      version: form.version,
      releaseType: form.releaseType,
      changelog: form.changelog,
      isForceUpdate: form.isForceUpdate,
      sourceType: form.sourceType,
      targetAudience: form.targetAudience
    }

    if (form.sourceType === 'url') {
      if (form.downloadUrl) data.downloadUrl = form.downloadUrl
      if (form.fileSize) data.fileSize = form.fileSize
      if (form.fileHash) data.fileHash = form.fileHash
    } else if (form.sourceType === 'upload') {
      data.packagePath = form.packagePath
      data.fileSize = form.fileSize
      data.fileHash = form.fileHash
      // 设置 downloadUrl 为上传路径（兼容发布检查）
      data.downloadUrl = form.packagePath
    } else if (form.sourceType === 'git') {
      data.gitRepoUrl = form.gitRepoUrl
      data.gitBranch = form.gitBranch || 'main'
      if (form.gitTag) data.gitTag = form.gitTag
      // Git 模式不需要 downloadUrl，设一个占位值以通过发布检查
      data.downloadUrl = form.gitRepoUrl
    }

    if (form.minVersion) data.minVersion = form.minVersion

    await adminApi.createVersion(data)
    ElMessage.success('版本创建成功')
    router.push('/versions/list')
  } catch (error) {
    console.error('创建版本失败:', error)
  } finally {
    loading.value = false
  }
}

const handleReset = () => {
  formRef.value?.resetFields()
  form.fileSize = 0
  form.fileHash = ''
  form.minVersion = ''
  form.downloadUrl = ''
  form.gitRepoUrl = ''
  form.gitBranch = 'main'
  form.gitTag = ''
  form.packagePath = ''
  uploadedFileName.value = ''
}
</script>

<style scoped lang="scss">
.page-container {
  max-width: 900px;
}

.form-card {
  border-radius: 12px;
  border: none;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    .title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
    .subtitle {
      display: block;
      font-size: 13px;
      color: #909399;
      margin-top: 4px;
    }
  }
}

.form {
  max-width: 700px;
  padding: 20px 0;
}

.form-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.version-upload {
  width: 100%;
}
</style>
