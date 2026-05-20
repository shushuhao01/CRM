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
        管理官网首页「观看演示」按钮弹出的视频列表。启用的视频会显示在官网，标为「首选」的视频在仅有一个视频时自动播放。
      </template>
    </el-alert>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px">
      <div style="display: flex; align-items: center; gap: 8px">
        <el-button type="primary" size="small" @click="triggerVideoUpload" :loading="videoUploading">
          <el-icon><Upload /></el-icon> 上传视频
        </el-button>
        <span style="font-size: 12px; color: #909399">mp4/webm/mov，最大 500MB</span>
        <input ref="videoFileInput" type="file" accept="video/mp4,video/webm,video/quicktime,video/ogg" style="display: none" @change="handleVideoFileSelect" />
      </div>
      <div style="font-size: 12px; color: #909399">
        共 {{ allVideos.length }} 个视频，{{ allVideos.filter((v: any) => v.enabled !== false).length }} 个启用
      </div>
    </div>

    <!-- 视频列表（表格形式） -->
    <el-table v-if="allVideos.length > 0" :data="pagedVideos" size="small" stripe style="margin-bottom: 12px" row-key="url">
      <el-table-column label="封面" width="130" align="center">
        <template #default="{ row }">
          <div class="video-cover-cell">
            <video
              :src="row.url + '#t=0.5'"
              preload="metadata"
              muted
              class="video-cover-preview"
              @loadeddata="(e: Event) => handleVideoLoaded(e, row)"
            ></video>
            <div class="video-cover-play">▶</div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="视频信息" min-width="220">
        <template #default="{ row }">
          <el-input v-model="row.title" size="small" placeholder="视频标题" style="margin-bottom: 4px; font-weight: 500" />
          <el-input v-model="row.description" size="small" placeholder="简短描述（可选）" />
          <div style="margin-top: 4px; display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
            <span v-if="row.size" style="color: #909399; font-size: 11px">{{ formatFileSize(row.size) }}</span>
            <el-tag v-if="row.isPrimary" type="warning" size="small" effect="dark">首选播放</el-tag>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80" align="center">
        <template #default="{ row }">
          <el-switch v-model="row.enabled" size="small" :active-value="true" :inactive-value="false" />
        </template>
      </el-table-column>
      <el-table-column label="操作" width="160" align="center">
        <template #default="{ row, $index }">
          <el-button v-if="!row.isPrimary" type="warning" link size="small" @click="setPrimaryVideo(videoPageOffset + $index)">设为首选</el-button>
          <el-tag v-else type="warning" size="small" effect="light">已首选</el-tag>
          <el-button type="danger" link size="small" @click="handleDeleteVideo(videoPageOffset + $index)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
    <div v-if="allVideos.length > videoPageSize" style="display: flex; justify-content: flex-end; margin-bottom: 12px">
      <el-pagination
        v-model:current-page="videoPage"
        :page-size="videoPageSize"
        :total="allVideos.length"
        layout="total, prev, pager, next"
        small
      />
    </div>

    <div v-if="allVideos.length === 0" style="color: #c0c4cc; font-size: 13px; padding: 24px; text-align: center; border: 1px dashed #dcdfe6; border-radius: 8px">
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
import { ref, computed } from 'vue'
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

// ==================== 视频管理 ====================

const videoPage = ref(1)
const videoPageSize = 3

const allVideos = computed(() => props.form.websiteConfig.demoVideos || [])

const videoPageOffset = computed(() => (videoPage.value - 1) * videoPageSize)

const pagedVideos = computed(() => {
  const start = videoPageOffset.value
  return allVideos.value.slice(start, start + videoPageSize)
})

const handleVideoLoaded = (e: Event, row: any) => {
  const video = e.target as HTMLVideoElement
  if (video && !row.duration) {
    const dur = video.duration
    if (dur && isFinite(dur)) {
      const m = Math.floor(dur / 60)
      const s = Math.floor(dur % 60)
      row.duration = `${m}:${s.toString().padStart(2, '0')}`
    }
  }
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
      const isFirst = props.form.websiteConfig.demoVideos.length === 0
      props.form.websiteConfig.demoVideos.unshift({
        url: res.data.url,
        title: file.name.replace(/\.[^.]+$/, ''),
        description: '',
        thumbnail: '',
        duration: '',
        size: res.data.size || file.size,
        enabled: true,
        isPrimary: isFirst,
      })
      videoPage.value = 1
      ElMessage.success('视频上传成功，请填写标题后保存配置')
    } else {
      ElMessage.error(res.message || '上传失败')
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '视频上传失败')
  }
  videoUploading.value = false
}

const setPrimaryVideo = (idx: number) => {
  const videos = props.form.websiteConfig.demoVideos
  if (!videos) return
  videos.forEach((v: any, i: number) => { v.isPrimary = i === idx })
  ElMessage.success('已设为首选播放视频，请保存配置')
}

const handleDeleteVideo = async (idx: number) => {
  const video = props.form.websiteConfig.demoVideos?.[idx]
  if (!video) return
  try {
    await ElMessageBox.confirm(`确定删除视频「${video.title || '未命名'}」？删除后服务器文件也会移除。`, '删除确认', { type: 'warning' })
  } catch { return }
  try {
    await request.delete('/upload/video', { params: { url: video.url } })
  } catch { /* 即使服务器删除失败也移除配置 */ }
  const wasPrimary = video.isPrimary
  props.form.websiteConfig.demoVideos.splice(idx, 1)
  if (wasPrimary && props.form.websiteConfig.demoVideos.length > 0) {
    props.form.websiteConfig.demoVideos[0].isPrimary = true
  }
  if (videoPage.value > 1 && videoPageOffset.value >= allVideos.value.length) {
    videoPage.value = Math.max(1, videoPage.value - 1)
  }
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
.video-cover-cell {
  position: relative; width: 110px; height: 62px; background: #000; border-radius: 6px;
  overflow: hidden; margin: 0 auto; cursor: default;
}
.video-cover-preview {
  width: 100%; height: 100%; object-fit: cover; display: block;
}
.video-cover-play {
  position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
  background: rgba(0,0,0,0.25); color: #fff; font-size: 20px; opacity: 0; transition: opacity 0.2s;
}
.video-cover-cell:hover .video-cover-play { opacity: 1; }
</style>

