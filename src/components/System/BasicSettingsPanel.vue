<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>基本信息</span>
        <el-button
          v-if="canEdit"
          @click="handleSave"
          type="primary"
          :loading="loading"
        >
          保存设置
        </el-button>
      </div>
    </template>

    <el-form
      ref="formRef"
      :model="form"
      :rules="formRules"
      label-width="120px"
      class="setting-form"
    >
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="系统名称" prop="systemName">
            <el-input
              v-model="form.systemName"
              placeholder="请输入系统名称"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="系统版本" prop="systemVersion">
            <el-input
              v-model="form.systemVersion"
              placeholder="请输入系统版本"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="公司名称" prop="companyName">
            <el-input
              v-model="form.companyName"
              placeholder="请输入公司名称"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="联系电话" prop="contactPhone">
            <el-input
              v-model="form.contactPhone"
              placeholder="请输入联系电话"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="联系邮箱" prop="contactEmail">
            <el-input
              v-model="form.contactEmail"
              placeholder="请输入联系邮箱"
            />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="网站地址" prop="websiteUrl">
            <el-input
              v-model="form.websiteUrl"
              placeholder="请输入网站地址"
            />
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item label="公司地址" prop="companyAddress">
        <el-input
          v-model="form.companyAddress"
          placeholder="请输入公司地址"
        />
      </el-form-item>

      <el-form-item label="系统描述" prop="systemDescription">
        <el-input
          v-model="form.systemDescription"
          type="textarea"
          :rows="3"
          placeholder="请输入系统描述"
        />
      </el-form-item>

      <el-form-item label="系统Logo" prop="systemLogo">
        <el-upload
          class="logo-uploader"
          action="#"
          :show-file-list="false"
          :before-upload="beforeLogoUpload"
          :http-request="handleLogoUpload"
        >
          <img v-if="form.systemLogo" :src="form.systemLogo" class="logo" />
          <el-icon v-else class="logo-uploader-icon"><Plus /></el-icon>
        </el-upload>
        <div class="upload-tip">建议尺寸：200x60px，支持 jpg、png 格式</div>
      </el-form-item>

      <!-- 联系二维码 -->
      <el-divider content-position="left">联系二维码</el-divider>

      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="二维码标签">
            <el-input
              v-model="form.contactQRCodeLabel"
              placeholder="请输入二维码标签（如：微信、联系我们）"
            />
            <div class="upload-tip">用于说明二维码的用途</div>
          </el-form-item>
        </el-col>

        <el-col :span="12">
          <el-form-item label="上传二维码">
            <div class="qr-upload-buttons">
              <el-button type="primary" size="small" :icon="Upload" @click="triggerQRUpload">
                点击上传
              </el-button>
              <el-button type="success" size="small" :icon="DocumentCopy" @click="pasteQRImage">
                粘贴图片
              </el-button>
            </div>

            <!-- 二维码预览区域 -->
            <div class="qr-preview-area" v-if="form.contactQRCode">
              <div class="qr-thumbnail" @click="previewQRCode">
                <img :src="form.contactQRCode" alt="二维码" />
                <div class="qr-overlay">
                  <el-icon class="zoom-icon"><ZoomIn /></el-icon>
                </div>
              </div>
              <el-button
                size="small"
                type="danger"
                text
                :icon="Delete"
                @click="removeQRCode"
              >
                删除
              </el-button>
            </div>

            <!-- 空状态提示 -->
            <div v-else class="qr-empty-state">
              <el-icon size="48" color="#dcdfe6"><Picture /></el-icon>
              <p>点击上传或粘贴二维码图片</p>
            </div>

            <div class="upload-tip">建议尺寸：200x200px，支持 jpg、png 格式</div>

            <!-- 隐藏的文件输入 -->
            <input
              ref="qrFileInput"
              type="file"
              accept="image/*"
              style="display: none"
              @change="handleQRFileSelect"
            />
          </el-form-item>
        </el-col>
      </el-row>
    </el-form>
  </el-card>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, Upload, DocumentCopy, Delete, ZoomIn, Picture } from '@element-plus/icons-vue'
import { useConfigStore } from '@/stores/config'
import { useUserStore } from '@/stores/user'

const configStore = useConfigStore()
const userStore = useUserStore()

const loading = ref(false)
const formRef = ref()
const qrFileInput = ref<HTMLInputElement>()

// 表单数据 - 从配置store获取
const form = computed(() => configStore.systemConfig)

// 权限控制
const canEdit = computed(() => userStore.isAdmin || userStore.isSuperAdmin)

// 表单验证规则
const formRules = {
  systemName: [
    { required: true, message: '请输入系统名称', trigger: 'blur' }
  ]
}

// Logo上传前验证
const beforeLogoUpload = (file: File) => {
  const isImage = file.type.startsWith('image/')
  const isLt2M = file.size / 1024 / 1024 < 2

  if (!isImage) {
    ElMessage.error('只能上传图片文件!')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB!')
    return false
  }
  return true
}

// Logo上传处理
const handleLogoUpload = async (options: any) => {
  const file = options.file
  const reader = new FileReader()
  reader.onload = (e) => {
    form.value.systemLogo = e.target?.result as string
  }
  reader.readAsDataURL(file)
}

// 触发二维码上传
const triggerQRUpload = () => {
  qrFileInput.value?.click()
}

// 处理二维码文件选择
const handleQRFileSelect = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('只能上传图片文件!')
      return
    }
    if (file.size / 1024 / 1024 > 2) {
      ElMessage.error('图片大小不能超过 2MB!')
      return
    }
    const reader = new FileReader()
    reader.onload = (e) => {
      form.value.contactQRCode = e.target?.result as string
    }
    reader.readAsDataURL(file)
  }
  // 清空input以便重复选择同一文件
  input.value = ''
}

// 粘贴二维码图片
const pasteQRImage = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          const reader = new FileReader()
          reader.onload = (e) => {
            form.value.contactQRCode = e.target?.result as string
            ElMessage.success('图片粘贴成功')
          }
          reader.readAsDataURL(blob)
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch {
    ElMessage.error('无法访问剪贴板，请使用上传功能')
  }
}

// 预览二维码
const previewQRCode = () => {
  if (form.value.contactQRCode) {
    ElMessageBox.alert(
      `<div style="text-align: center; padding: 20px;">
        <img src="${form.value.contactQRCode}" alt="二维码" style="max-width: 400px; max-height: 400px; border: 1px solid #ddd; border-radius: 8px;" />
      </div>`,
      '二维码预览',
      {
        dangerouslyUseHTMLString: true,
        showConfirmButton: false,
        showClose: true
      }
    )
  }
}

// 删除二维码
const removeQRCode = () => {
  form.value.contactQRCode = ''
  ElMessage.success('二维码已删除')
}

// 保存设置
const handleSave = async () => {
  try {
    await formRef.value?.validate()
    loading.value = true

    // 保存到localStorage
    configStore.updateSystemConfig(form.value)
    console.log('[基本设置] 已保存到localStorage:', form.value)

    // 尝试保存到后端API
    try {
      const { apiService } = await import('@/services/apiService')
      await apiService.put('/system/basic-settings', form.value)
      console.log('[基本设置] 已同步到后端API')
      ElMessage.success('基本设置保存成功')
    } catch (apiError) {
      console.warn('[基本设置] 后端API保存失败，已保存到本地:', apiError)
      ElMessage.success('基本设置已保存到本地')
    }
  } catch {
    ElMessage.error('请检查表单填写是否正确')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  // 配置已在store中自动加载
})
</script>


<style scoped>
.setting-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.setting-form {
  max-width: 900px;
}

.upload-tip {
  font-size: 12px;
  color: #909399;
  margin-top: 5px;
}

.logo-uploader {
  border: 1px dashed #d9d9d9;
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  width: 200px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.logo-uploader:hover {
  border-color: #409eff;
}

.logo-uploader .logo {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

.logo-uploader-icon {
  font-size: 28px;
  color: #8c939d;
}

.qr-upload-buttons {
  display: flex;
  gap: 10px;
  margin-bottom: 10px;
}

.qr-preview-area {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin-top: 10px;
}

.qr-thumbnail {
  width: 100px;
  height: 100px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

.qr-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-thumbnail .qr-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.qr-thumbnail:hover .qr-overlay {
  opacity: 1;
}

.qr-thumbnail .zoom-icon {
  color: #fff;
  font-size: 24px;
}

.qr-empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 20px;
  border: 1px dashed #dcdfe6;
  border-radius: 4px;
  margin-top: 10px;
}

.qr-empty-state p {
  margin-top: 10px;
  color: #909399;
  font-size: 12px;
}
</style>
