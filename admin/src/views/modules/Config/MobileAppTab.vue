<template>
  <div class="mobile-app-tab">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        配置移动应用安装包或下载链接。启用后，CRM前端"系统设置→移动应用"将展示对应下载入口。支持上传APK/IPA安装包或填写外部下载URL。
      </template>
    </el-alert>

    <!-- 操作按钮 -->
    <div class="action-bar">
      <el-button type="primary" :icon="Plus" @click="showAddDialog('android')">添加 Android 版本</el-button>
      <el-button type="primary" :icon="Plus" @click="showAddDialog('ios')">添加 iOS 版本</el-button>
      <el-button :icon="Refresh" @click="loadPackages" :loading="loading">刷新</el-button>
    </div>

    <!-- 下载统计 -->
    <el-row :gutter="16" style="margin-bottom: 20px" v-if="stats.length > 0">
      <el-col :span="12" v-for="stat in stats" :key="stat.platform">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-content">
            <div class="stat-icon" :class="stat.platform">
              <el-icon :size="28"><Cellphone /></el-icon>
            </div>
            <div class="stat-info">
              <div class="stat-label">{{ stat.platform === 'android' ? 'Android' : 'iOS' }}</div>
              <div class="stat-numbers">
                <span>{{ stat.total_packages || 0 }} 个版本</span>
                <span class="divider">|</span>
                <span>{{ stat.enabled_count || 0 }} 个已启用</span>
                <span class="divider">|</span>
                <span class="downloads">{{ stat.total_downloads || 0 }} 次下载</span>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- Android 应用包列表 -->
    <h4 class="section-title">Android 应用包</h4>
    <el-table :data="androidPackages" v-loading="loading" style="width: 100%; margin-bottom: 24px" empty-text="暂无 Android 应用包">
      <el-table-column prop="app_name" label="应用名称" min-width="120" />
      <el-table-column prop="version" label="版本号" width="100" />
      <el-table-column label="下载方式" min-width="200">
        <template #default="{ row }">
          <el-tag v-if="row.package_url" type="success" size="small">已上传安装包</el-tag>
          <el-tag v-else-if="row.external_url" type="warning" size="small">外部链接</el-tag>
          <el-tag v-else type="info" size="small">未配置</el-tag>
          <div v-if="row.external_url" class="url-text">{{ row.external_url }}</div>
        </template>
      </el-table-column>
      <el-table-column label="文件大小" width="100">
        <template #default="{ row }">
          {{ row.file_size ? formatFileSize(row.file_size) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="download_count" label="下载次数" width="100" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" size="small" @change="toggleEnabled(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="uploaded_by" label="上传者" min-width="100" />
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="editPackage(row)">编辑</el-button>
          <el-popconfirm title="确定删除此版本？" @confirm="deletePackage(row)">
            <template #reference>
              <el-button type="danger" link size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- iOS 应用包列表 -->
    <h4 class="section-title">iOS 应用包</h4>
    <el-table :data="iosPackages" v-loading="loading" style="width: 100%" empty-text="暂无 iOS 应用包">
      <el-table-column prop="app_name" label="应用名称" min-width="120" />
      <el-table-column prop="version" label="版本号" width="100" />
      <el-table-column label="下载方式" min-width="200">
        <template #default="{ row }">
          <el-tag v-if="row.package_url" type="success" size="small">已上传安装包</el-tag>
          <el-tag v-else-if="row.external_url" type="warning" size="small">外部链接</el-tag>
          <el-tag v-else type="info" size="small">未配置</el-tag>
          <div v-if="row.external_url" class="url-text">{{ row.external_url }}</div>
        </template>
      </el-table-column>
      <el-table-column label="文件大小" width="100">
        <template #default="{ row }">
          {{ row.file_size ? formatFileSize(row.file_size) : '-' }}
        </template>
      </el-table-column>
      <el-table-column prop="download_count" label="下载次数" width="100" />
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-switch v-model="row.is_enabled" :active-value="1" :inactive-value="0" size="small" @change="toggleEnabled(row)" />
        </template>
      </el-table-column>
      <el-table-column prop="uploaded_by" label="上传者" min-width="100" />
      <el-table-column label="创建时间" width="160">
        <template #default="{ row }">
          {{ formatDateTime(row.created_at) }}
        </template>
      </el-table-column>
      <el-table-column label="操作" width="140" fixed="right">
        <template #default="{ row }">
          <el-button type="primary" link size="small" @click="editPackage(row)">编辑</el-button>
          <el-popconfirm title="确定删除此版本？" @confirm="deletePackage(row)">
            <template #reference>
              <el-button type="danger" link size="small">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <!-- 添加/编辑弹窗 -->
    <el-dialog v-model="dialogVisible" :title="editingId ? '编辑应用包' : '添加应用包'" width="600px">
      <el-form :model="form" :rules="formRules" ref="formRef" label-width="120px">
        <el-form-item label="平台">
          <el-tag :type="form.platform === 'android' ? 'success' : 'primary'" size="large">
            {{ form.platform === 'android' ? 'Android' : 'iOS' }}
          </el-tag>
        </el-form-item>
        <el-form-item label="应用名称" prop="app_name">
          <el-input v-model="form.app_name" placeholder="如：CRM移动助手" />
        </el-form-item>
        <el-form-item label="版本号" prop="version">
          <el-input v-model="form.version" placeholder="如：v2.1.3" />
        </el-form-item>
        <el-form-item label="下载方式">
          <el-radio-group v-model="downloadMode">
            <el-radio label="upload">上传安装包</el-radio>
            <el-radio label="url">外部下载URL</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="downloadMode === 'upload'" label="安装包文件">
          <el-upload
            ref="uploadRef"
            :auto-upload="false"
            :limit="1"
            :on-change="handleFileChange"
            :on-remove="handleFileRemove"
            :accept="form.platform === 'android' ? '.apk,.zip' : '.ipa,.zip'"
            drag
          >
            <el-icon class="el-icon--upload"><UploadFilled /></el-icon>
            <div class="el-upload__text">将文件拖到此处，或<em>点击上传</em></div>
            <template #tip>
              <div class="el-upload__tip">
                {{ form.platform === 'android' ? '支持 .apk、.zip 格式，最大500MB' : '支持 .ipa、.zip 格式，最大500MB' }}
              </div>
            </template>
          </el-upload>
        </el-form-item>
        <el-form-item v-if="downloadMode === 'url'" label="下载URL" prop="external_url">
          <el-input v-model="form.external_url" placeholder="如：https://example.com/app/download/latest.apk" />
          <div class="upload-tip">填写外部下载地址，用户点击时将跳转到此链接</div>
        </el-form-item>
        <el-form-item label="版本说明">
          <el-input v-model="form.description" type="textarea" :rows="3" placeholder="本版本更新内容..." />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSubmit" :loading="submitting">
          {{ editingId ? '保存' : '添加' }}
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Refresh, Cellphone, UploadFilled } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'
import { formatDateTime } from '@/views/tenant-customers/Detail/helpers'

const loading = ref(false)
const submitting = ref(false)
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const downloadMode = ref<'upload' | 'url'>('url')
const uploadFile = ref<File | null>(null)
const formRef = ref()
const uploadRef = ref()

const packages = ref<any[]>([])
const stats = ref<any[]>([])

const form = ref({
  platform: 'android' as 'android' | 'ios',
  app_name: '',
  version: '',
  external_url: '',
  description: ''
})

const formRules = {
  app_name: [{ required: true, message: '请输入应用名称', trigger: 'blur' }],
  version: [{ required: true, message: '请输入版本号', trigger: 'blur' }],
  external_url: [{ type: 'url' as const, message: '请输入合法的URL地址', trigger: 'blur' }]
}

const androidPackages = computed(() => packages.value.filter((p: any) => p.platform === 'android'))
const iosPackages = computed(() => packages.value.filter((p: any) => p.platform === 'ios'))

const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const loadPackages = async () => {
  loading.value = true
  try {
    const [pkgRes, statsRes] = await Promise.all([
      adminApi.getMobileAppPackages(),
      adminApi.getMobileAppStats()
    ]) as any[]
    if (pkgRes.success) packages.value = pkgRes.data || []
    if (statsRes.success) stats.value = statsRes.data || []
  } catch (error) {
    console.error('加载移动应用数据失败:', error)
  } finally {
    loading.value = false
  }
}

const showAddDialog = (platform: 'android' | 'ios') => {
  editingId.value = null
  downloadMode.value = 'url'
  uploadFile.value = null
  form.value = { platform, app_name: '', version: '', external_url: '', description: '' }
  dialogVisible.value = true
}

const editPackage = (row: any) => {
  editingId.value = row.id
  downloadMode.value = row.external_url ? 'url' : 'upload'
  form.value = {
    platform: row.platform,
    app_name: row.app_name || '',
    version: row.version || '',
    external_url: row.external_url || '',
    description: row.description || ''
  }
  dialogVisible.value = true
}

const handleFileChange = (file: any) => {
  uploadFile.value = file.raw
}

const handleFileRemove = () => {
  uploadFile.value = null
}

const handleSubmit = async () => {
  try {
    await formRef.value?.validate()
  } catch { return }

  submitting.value = true
  try {
    if (editingId.value) {
      // 更新
      const res = await adminApi.updateMobileAppConfig(editingId.value, {
        app_name: form.value.app_name,
        version: form.value.version,
        external_url: downloadMode.value === 'url' ? form.value.external_url : '',
        description: form.value.description
      }) as any
      if (res.success) {
        ElMessage.success('更新成功')
        dialogVisible.value = false
        await loadPackages()
      } else {
        ElMessage.error(res.message || '更新失败')
      }
    } else if (downloadMode.value === 'upload' && uploadFile.value) {
      // 上传安装包
      const formData = new FormData()
      formData.append('file', uploadFile.value)
      formData.append('platform', form.value.platform)
      formData.append('app_name', form.value.app_name)
      formData.append('version', form.value.version)
      formData.append('description', form.value.description)
      const res = await adminApi.uploadMobileAppPackage(formData) as any
      if (res.success) {
        ElMessage.success('安装包上传成功')
        dialogVisible.value = false
        await loadPackages()
      } else {
        ElMessage.error(res.message || '上传失败')
      }
    } else {
      // 外部URL
      const res = await adminApi.createMobileAppConfig({
        platform: form.value.platform,
        app_name: form.value.app_name,
        version: form.value.version,
        external_url: form.value.external_url,
        description: form.value.description
      }) as any
      if (res.success) {
        ElMessage.success('添加成功')
        dialogVisible.value = false
        await loadPackages()
      } else {
        ElMessage.error(res.message || '添加失败')
      }
    }
  } catch (error: any) {
    ElMessage.error(error.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

const toggleEnabled = async (row: any) => {
  try {
    const res = await adminApi.updateMobileAppConfig(row.id, { is_enabled: !!row.is_enabled }) as any
    if (res.success) {
      ElMessage.success(row.is_enabled ? '已启用' : '已禁用')
      await loadPackages()
    }
  } catch {
    ElMessage.error('操作失败')
  }
}

const deletePackage = async (row: any) => {
  try {
    const res = await adminApi.deleteMobileAppConfig(row.id) as any
    if (res.success) {
      ElMessage.success('删除成功')
      await loadPackages()
    }
  } catch {
    ElMessage.error('删除失败')
  }
}

onMounted(() => { loadPackages() })
</script>

<style scoped>
.mobile-app-tab { padding: 0 }
.action-bar { margin-bottom: 20px; display: flex; gap: 8px; }
.section-title { margin: 16px 0 8px; color: #303133; font-size: 15px; }
.url-text { font-size: 12px; color: #909399; margin-top: 4px; word-break: break-all; }
.upload-tip { font-size: 12px; color: #909399; margin-top: 4px; }
.stat-card { border-radius: 8px; }
.stat-content { display: flex; align-items: center; gap: 16px; }
.stat-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.stat-icon.android { background: linear-gradient(135deg, #3ddc84, #00c853); }
.stat-icon.ios { background: linear-gradient(135deg, #007aff, #5856d6); }
.stat-info { flex: 1; }
.stat-label { font-size: 14px; font-weight: 600; color: #303133; margin-bottom: 4px; }
.stat-numbers { font-size: 13px; color: #606266; }
.stat-numbers .divider { margin: 0 8px; color: #dcdfe6; }
.stat-numbers .downloads { color: #e6a23c; font-weight: 500; }
</style>
