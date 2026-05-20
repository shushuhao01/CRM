<template>
  <el-form :model="form" label-width="120px" class="config-form">
    <el-alert type="info" :closable="false" style="margin-bottom: 20px">
      <template #title>
        在此配置官网展示的版权信息、备案号、联系方式和客服信息。保存后将自动同步到官网，无需修改官网代码。
      </template>
    </el-alert>

    <h4 class="section-title">版权与备案</h4>
    <el-form-item label="版权文字">
      <el-input v-model="form.copyrightText" placeholder="如：© 2025 XXX公司. All rights reserved." />
      <div class="upload-tip">显示在官网底部和CRM系统底部</div>
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

    <el-divider content-position="left">联系方式</el-divider>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="客服电话">
          <el-input v-model="form.websiteConfig.servicePhone" placeholder="如：400-123-4567 或 13500001111" />
          <div class="upload-tip">显示在官网底部和客服面板</div>
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="客服邮箱">
          <el-input v-model="form.websiteConfig.serviceEmail" placeholder="如：support@example.com" />
        </el-form-item>
      </el-col>
    </el-row>
    <el-form-item label="公司名称">
      <el-input v-model="form.companyName" placeholder="如：XXX科技有限公司" />
      <div class="upload-tip">同时用于官网品牌展示和CRM系统</div>
    </el-form-item>
    <el-form-item label="公司地址">
      <el-input v-model="form.companyAddress" placeholder="如：广东省深圳市南山区XX路XX号" />
    </el-form-item>
    <el-form-item label="品牌标语">
      <el-input v-model="form.websiteConfig.brandSlogan" placeholder="如：智能销售管理系统，助力企业高效增长" />
      <div class="upload-tip">显示在官网底部品牌区域</div>
    </el-form-item>

    <el-divider content-position="left">客服配置</el-divider>
    <el-form-item label="在线客服链接">
      <el-input v-model="form.websiteConfig.customerServiceUrl" placeholder="如：https://work.weixin.qq.com/kfid/xxx" />
      <div class="upload-tip">企业微信客服链接或其他在线客服系统链接</div>
    </el-form-item>
    <el-form-item label="工作时间">
      <el-input v-model="form.websiteConfig.workingHours" placeholder="如：周一至周五 9:00-18:00" />
    </el-form-item>
    <el-row :gutter="20">
      <el-col :span="12">
        <el-form-item label="二维码标签">
          <el-input v-model="form.contactQRCodeLabel" placeholder="如：微信客服、扫码咨询" />
        </el-form-item>
      </el-col>
      <el-col :span="12">
        <el-form-item label="客服二维码">
          <div class="qr-upload-buttons">
            <el-button type="primary" size="small" @click="triggerUpload">
              <el-icon><Upload /></el-icon> 上传二维码
            </el-button>
          </div>
          <div v-if="form.websiteConfig.serviceQRCode" class="qr-preview-area">
            <img :src="form.websiteConfig.serviceQRCode" class="qr-preview-img" />
            <el-button size="small" type="danger" text @click="form.websiteConfig.serviceQRCode = ''">
              <el-icon><Delete /></el-icon> 删除
            </el-button>
          </div>
          <div class="upload-tip">官网客服面板和底部显示的二维码图片</div>
          <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileSelect" />
        </el-form-item>
      </el-col>
    </el-row>

    <el-divider content-position="left">演示视频管理</el-divider>
    <el-alert type="info" :closable="false" style="margin-bottom: 16px">
      <template #title>
        管理官网首页「观看演示」按钮弹出的视频列表。支持上传多个视频，访客点击后可选择播放。
      </template>
    </el-alert>

    <div style="margin-bottom: 12px">
      <el-button type="primary" size="small" @click="triggerVideoUpload" :loading="videoUploading">
        <el-icon><Upload /></el-icon> 上传视频
      </el-button>
      <span style="font-size: 12px; color: #909399; margin-left: 8px">支持 mp4/webm/mov 格式，单个最大 500MB</span>
      <input ref="videoFileInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" style="display: none" @change="handleVideoFileSelect" />
    </div>

    <div v-if="form.websiteConfig.demoVideos && form.websiteConfig.demoVideos.length > 0" class="video-list">
      <div v-for="(video, idx) in form.websiteConfig.demoVideos" :key="idx" class="video-item">
        <div class="video-item-thumb">
          <video v-if="video.url" :src="video.url" preload="metadata" style="width: 100%; height: 100%; object-fit: cover; border-radius: 6px"></video>
          <div v-else class="thumb-empty">无缩略图</div>
        </div>
        <div class="video-item-info">
          <el-input v-model="video.title" size="small" placeholder="视频标题" style="margin-bottom: 6px" />
          <el-input v-model="video.description" size="small" placeholder="简短描述（可选）" style="margin-bottom: 6px" />
          <div class="video-item-meta">
            <span v-if="video.size" style="color: #909399; font-size: 12px">{{ formatFileSize(video.size) }}</span>
            <span v-if="video.duration" style="color: #909399; font-size: 12px; margin-left: 8px">{{ video.duration }}</span>
            <code style="font-size: 11px; color: #c0c4cc; margin-left: 8px; word-break: break-all">{{ video.url }}</code>
          </div>
        </div>
        <div class="video-item-actions">
          <el-button type="danger" size="small" text @click="handleDeleteVideo(idx)">
            <el-icon><Delete /></el-icon> 删除
          </el-button>
        </div>
      </div>
    </div>
    <div v-else style="color: #c0c4cc; font-size: 13px; padding: 20px; text-align: center; border: 1px dashed #dcdfe6; border-radius: 8px">
      暂无演示视频，请点击上方按钮上传
    </div>

    <!-- 预览 -->
    <el-divider content-position="left">官网底部预览</el-divider>
    <div class="copyright-preview">
      <div class="preview-box">
        <p v-if="form.copyrightText">{{ form.copyrightText }}</p>
        <p v-else>© {{ new Date().getFullYear() }} {{ form.companyName || '公司名称' }}. All rights reserved.</p>
        <p v-if="form.icpNumber || form.policeNumber">
          <span v-if="form.icpNumber">{{ form.icpNumber }}</span>
          <span v-if="form.icpNumber && form.policeNumber"> | </span>
          <span v-if="form.policeNumber">{{ form.policeNumber }}</span>
        </p>
        <p v-if="form.techSupport" style="color: #b0b3b8;">{{ form.techSupport }}</p>
      </div>
    </div>
  </el-form>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Upload, Delete } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'
import request from '@/api/request'

const props = defineProps<{ form: any }>()

const fileInput = ref<HTMLInputElement>()
const videoFileInput = ref<HTMLInputElement>()
const videoUploading = ref(false)

const triggerUpload = () => { fileInput.value?.click() }

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) { ElMessage.error('只能上传图片文件!'); return }
    if (file.size / 1024 / 1024 > 2) { ElMessage.error('图片大小不能超过 2MB!'); return }
    try {
      const formData = new FormData()
      formData.append('file', file)
      const res = await adminApi.uploadFile(formData)
      if (res.success && res.data?.url) { emit('update-service-qrcode', res.data.url); ElMessage.success('客服二维码上传成功') }
      else { ElMessage.error('上传失败') }
    } catch {
      const reader = new FileReader()
      reader.onload = (e) => { emit('update-service-qrcode', e.target?.result as string) }
      reader.readAsDataURL(file)
      ElMessage.warning('服务器上传失败，使用本地预览')
    }
  }
  input.value = ''
}

const formatFileSize = (bytes: number) => {
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(1) + ' GB'
}

const triggerVideoUpload = () => { videoFileInput.value?.click() }

const handleVideoFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  input.value = ''

  const allowedTypes = ['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime']
  if (!allowedTypes.includes(file.type)) {
    ElMessage.error('仅支持 mp4、webm、ogg、mov 格式视频')
    return
  }
  if (file.size > 500 * 1024 * 1024) {
    ElMessage.error('视频大小不能超过 500MB')
    return
  }

  videoUploading.value = true
  try {
    const formData = new FormData()
    formData.append('file', file)
    const res: any = await request.post('/upload/video', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 600000,
    })
    if (res.success && res.data?.url) {
      if (!props.form.websiteConfig.demoVideos) {
        props.form.websiteConfig.demoVideos = []
      }
      props.form.websiteConfig.demoVideos.push({
        url: res.data.url,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        thumbnail: '',
        duration: '',
        size: res.data.size || file.size,
      })
      ElMessage.success('视频上传成功，请填写标题后保存配置')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '视频上传失败')
  }
  videoUploading.value = false
}

const handleDeleteVideo = async (idx: number) => {
  const video = props.form.websiteConfig.demoVideos?.[idx]
  if (!video) return
  try {
    await ElMessageBox.confirm(`确定删除视频「${video.title || '未命名'}」？`, '删除确认', { type: 'warning' })
  } catch { return }
  try {
    await request.delete('/upload/video', { params: { url: video.url } })
  } catch { /* 即使服务器删除失败也移除配置 */ }
  props.form.websiteConfig.demoVideos.splice(idx, 1)
  ElMessage.success('视频已删除，请保存配置')
}

const emit = defineEmits<{
  'update-service-qrcode': [url: string]
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
.video-list { display: flex; flex-direction: column; gap: 10px; }
.video-item {
  display: flex; gap: 12px; padding: 12px; background: #fafbfc; border: 1px solid #ebeef5;
  border-radius: 8px; align-items: center;
}
.video-item-thumb {
  width: 120px; height: 68px; flex-shrink: 0; background: #000; border-radius: 6px; overflow: hidden;
  display: flex; align-items: center; justify-content: center;
}
.thumb-empty { color: #909399; font-size: 12px; }
.video-item-info { flex: 1; min-width: 0; }
.video-item-meta { display: flex; align-items: center; flex-wrap: wrap; gap: 4px; }
.video-item-actions { flex-shrink: 0; }
</style>

