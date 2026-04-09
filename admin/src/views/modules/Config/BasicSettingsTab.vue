<template>
  <el-form :model="form" label-width="120px" class="config-form">
    <h4 class="section-title">基本信息</h4>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="系统名称">
          <el-input v-model="form.systemName" placeholder="请输入系统名称" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="系统版本">
          <el-input v-model="form.systemVersion" placeholder="请输入系统版本" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="公司名称">
          <el-input v-model="form.companyName" placeholder="请输入公司名称" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="联系电话">
          <el-input v-model="form.contactPhone" placeholder="请输入联系电话" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="联系邮箱">
          <el-input v-model="form.contactEmail" placeholder="请输入联系邮箱" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="网站地址">
          <el-input v-model="form.websiteUrl" placeholder="请输入网站地址" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-form-item label="公司地址">
      <el-input v-model="form.companyAddress" placeholder="请输入公司地址" />
    </el-form-item>
    <el-form-item label="系统描述">
      <el-input v-model="form.systemDescription" type="textarea" :rows="3" placeholder="请输入系统描述" />
    </el-form-item>

    <el-divider content-position="left">联系二维码</el-divider>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="二维码标签">
          <el-input v-model="form.contactQRCodeLabel" placeholder="如：微信、联系我们" />
          <div class="upload-tip">用于说明二维码的用途</div>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="上传二维码">
          <div class="qr-upload-buttons">
            <el-button type="primary" size="small" @click="triggerQRUpload">
              <el-icon><Upload /></el-icon> 点击上传
            </el-button>
            <el-button type="success" size="small" @click="pasteQRImage">
              <el-icon><DocumentCopy /></el-icon> 粘贴图片
            </el-button>
          </div>
          <div v-if="form.contactQRCode" class="qr-preview-area">
            <img :src="form.contactQRCode" class="qr-preview-img" />
            <el-button size="small" type="danger" text @click="form.contactQRCode = ''">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
          <div class="upload-tip">建议尺寸：200x200px，支持 jpg、png 格式</div>
          <input ref="qrFileInput" type="file" accept="image/*" style="display: none" @change="handleQRFileSelect" />
        </el-form-item>
      </el-col>
    </el-row>

    <!-- 版权与备案信息 -->
    <el-divider content-position="left">版权与备案信息</el-divider>
    <el-form-item label="版权文字">
      <el-input v-model="form.copyrightText" placeholder="如：© 2024 XXX公司 版权所有" />
      <div class="upload-tip">显示在系统底部的版权信息</div>
    </el-form-item>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="ICP备案号">
          <el-input v-model="form.icpNumber" placeholder="如：粤ICP备2026XXXXXX号" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="公安备案号">
          <el-input v-model="form.policeNumber" placeholder="如：粤公网安备 44010XXXXXXXXXX号" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-form-item label="技术支持">
      <el-input v-model="form.techSupport" placeholder="如：技术支持：XXX科技" />
    </el-form-item>

    <!-- 预览效果 -->
    <el-divider content-position="left">版权预览</el-divider>
    <div class="copyright-preview">
      <div class="preview-box">
        <p v-if="form.copyrightText">{{ form.copyrightText }}</p>
        <p v-if="form.icpNumber || form.policeNumber">
          <span v-if="form.icpNumber">{{ form.icpNumber }}</span>
          <span v-if="form.icpNumber && form.policeNumber"> | </span>
          <span v-if="form.policeNumber">{{ form.policeNumber }}</span>
        </p>
        <p v-if="form.techSupport">{{ form.techSupport }}</p>
      </div>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Upload, DocumentCopy, Delete } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

defineProps<{
  form: any
}>()

const qrFileInput = ref<HTMLInputElement>()

const triggerQRUpload = () => { qrFileInput.value?.click() }

const handleQRFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) { ElMessage.error('只能上传图片文件!'); return }
    if (file.size / 1024 / 1024 > 2) { ElMessage.error('图片大小不能超过 2MB!'); return }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) { emit('update-qrcode', res.data.url); ElMessage.success('二维码上传成功') }
      else { ElMessage.error('二维码上传失败') }
    } catch {
      const reader = new FileReader()
      reader.onload = (e) => { emit('update-qrcode', e.target?.result as string) }
      reader.readAsDataURL(file)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
  input.value = ''
}

const pasteQRImage = async () => {
  try {
    const clipboardItems = await navigator.clipboard.read()
    for (const item of clipboardItems) {
      for (const type of item.types) {
        if (type.startsWith('image/')) {
          const blob = await item.getType(type)
          try {
            const formData = new FormData()
            formData.append('file', blob, 'qrcode.png')
            const res = await adminApi.uploadFile(formData)
            if (res.success && res.data?.url) { emit('update-qrcode', res.data.url); ElMessage.success('图片粘贴上传成功'); return }
          } catch { /* 上传失败回退 */ }
          const reader = new FileReader()
          reader.onload = (e) => { emit('update-qrcode', e.target?.result as string); ElMessage.success('图片粘贴成功（本地预览）') }
          reader.readAsDataURL(blob)
          return
        }
      }
    }
    ElMessage.warning('剪贴板中没有图片')
  } catch { ElMessage.error('无法访问剪贴板，请使用上传功能') }
}

const emit = defineEmits<{
  'update-qrcode': [url: string]
}>()
</script>

<style scoped lang="scss">
.config-form { max-width: 900px; padding: 20px 0; }
.section-title { font-size: 15px; font-weight: 600; color: #303133; margin: 0 0 16px 0; padding-bottom: 8px; border-bottom: 1px solid #f0f0f0; }
.upload-tip { font-size: 12px; color: #909399; margin-top: 5px; }
.qr-upload-buttons { display: flex; gap: 10px; margin-bottom: 10px; }
.qr-preview-area { display: flex; align-items: flex-start; gap: 10px; margin-top: 10px; }
.qr-preview-img { width: 120px; height: 120px; object-fit: cover; border: 1px solid #dcdfe6; border-radius: 8px; }
.copyright-preview {
  .preview-box {
    background: #1d1e1f; color: #909399; padding: 20px; border-radius: 8px; text-align: center; font-size: 12px;
    p { margin: 5px 0; }
  }
}
</style>

