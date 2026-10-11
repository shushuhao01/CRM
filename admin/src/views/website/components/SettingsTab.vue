<template>
  <div class="site-tab" v-loading="loading">
    <el-form :model="form" label-width="160px" class="settings-form">
      <el-divider content-position="left">基础信息</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="站点名称">
            <el-input v-model="form.siteName" placeholder="云客CRM" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="官网域名">
            <el-input v-model="form.siteUrl" placeholder="https://www.yunkes.com" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="站点 Logo">
            <el-input v-model="form.siteLogo" placeholder="图片 URL" :disabled="!canEdit">
              <template #append>
                <el-button :disabled="!canEdit" @click="triggerUpload('siteLogo')">上传</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="站点图标 Favicon">
            <el-input v-model="form.siteFavicon" placeholder="图片 URL" :disabled="!canEdit">
              <template #append>
                <el-button :disabled="!canEdit" @click="triggerUpload('siteFavicon')">上传</el-button>
              </template>
            </el-input>
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">默认 SEO 配置</el-divider>
      <el-form-item label="SEO 默认标题">
        <el-input v-model="form.seoTitle" placeholder="云客CRM - 企业微信SCRM客户管理系统" :disabled="!canEdit" />
      </el-form-item>
      <el-form-item label="SEO 默认关键词">
        <el-input v-model="form.seoKeywords" placeholder="多个关键词用英文逗号分隔" :disabled="!canEdit" />
      </el-form-item>
      <el-form-item label="SEO 默认描述">
        <el-input v-model="form.seoDescription" type="textarea" :rows="3" placeholder="用于搜索引擎展示的站点描述" :disabled="!canEdit" />
      </el-form-item>

      <el-divider content-position="left">备案与联系</el-divider>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="ICP 备案号">
            <el-input v-model="form.icpNumber" placeholder="粤ICP备xxxxxxxx号" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="公安备案号">
            <el-input v-model="form.policeNumber" placeholder="粤公网安备xxxxxxxx号" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-form-item label="版权信息">
        <el-input v-model="form.copyright" placeholder="© 2025 云客CRM" :disabled="!canEdit" />
      </el-form-item>
      <el-row :gutter="20">
        <el-col :span="12">
          <el-form-item label="客服电话">
            <el-input v-model="form.contactPhone" placeholder="400-xxx-xxxx" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
        <el-col :span="12">
          <el-form-item label="客服邮箱">
            <el-input v-model="form.contactEmail" placeholder="support@yunkes.com" :disabled="!canEdit" />
          </el-form-item>
        </el-col>
      </el-row>

      <el-divider content-position="left">搜索引擎推送</el-divider>
      <el-alert type="info" :closable="false" show-icon style="margin-bottom: 16px">
        <template #title>
          站点地图地址：<a :href="sitemapUrl" target="_blank">{{ sitemapUrl }}</a>
        </template>
      </el-alert>
      <el-form-item label="百度推送 Token">
        <el-input v-model="form.baiduPushToken" placeholder="百度站长平台 - 普通收录 - 推送接口 token" :disabled="!canEdit" />
      </el-form-item>
      <el-form-item label="IndexNow Key">
        <el-input v-model="form.indexNowKey" placeholder="IndexNow 密钥（用于 Bing/Yandex 等）" :disabled="!canEdit" />
      </el-form-item>

      <el-form-item>
        <el-button v-if="canEdit" type="primary" :loading="saving" @click="save">保存设置</el-button>
        <el-button type="success" :loading="pushing" @click="pushSeo">推送到搜索引擎</el-button>
      </el-form-item>
    </el-form>

    <input ref="fileInput" type="file" accept="image/*" style="display: none" @change="handleFileSelect" />
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { siteApi } from '@/api/site'
import { adminApi } from '@/api/admin'

interface SettingsForm {
  siteName: string
  siteUrl: string
  siteLogo: string
  siteFavicon: string
  seoTitle: string
  seoKeywords: string
  seoDescription: string
  icpNumber: string
  policeNumber: string
  copyright: string
  contactPhone: string
  contactEmail: string
  baiduPushToken: string
  indexNowKey: string
}

const keys: Array<keyof SettingsForm> = [
  'siteName', 'siteUrl', 'siteLogo', 'siteFavicon',
  'seoTitle', 'seoKeywords', 'seoDescription',
  'icpNumber', 'policeNumber', 'copyright',
  'contactPhone', 'contactEmail', 'baiduPushToken', 'indexNowKey'
]

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('website:settings:edit'))

const form = reactive<SettingsForm>({
  siteName: '',
  siteUrl: '',
  siteLogo: '',
  siteFavicon: '',
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  icpNumber: '',
  policeNumber: '',
  copyright: '',
  contactPhone: '',
  contactEmail: '',
  baiduPushToken: '',
  indexNowKey: ''
})

const loading = ref(false)
const saving = ref(false)
const pushing = ref(false)
const sitemapUrl = computed(() => `${(form.siteUrl || '').replace(/\/$/, '')}/sitemap.xml`)

const uploadTarget = ref<keyof SettingsForm>('siteLogo')
const fileInput = ref<HTMLInputElement>()

const load = async () => {
  loading.value = true
  try {
    const res = await siteApi.getSettings()
    const data = res.data || {}
    for (const key of keys) {
      form[key] = data[key] || ''
    }
  } catch {
    // 拦截器已提示
  } finally {
    loading.value = false
  }
}

const save = async () => {
  saving.value = true
  try {
    await siteApi.updateSettings({ ...form })
    ElMessage.success('站点设置保存成功')
  } finally {
    saving.value = false
  }
}

const pushSeo = async () => {
  pushing.value = true
  try {
    const res = await siteApi.seoPush({ engine: 'all' })
    const data: any = res.data || {}
    const baidu = data.baidu?.message || '未执行'
    const indexnow = data.indexnow?.message || '未执行'
    ElMessage.success(`百度: ${baidu}；IndexNow: ${indexnow}`)
  } finally {
    pushing.value = false
  }
}

const triggerUpload = (key: keyof SettingsForm) => {
  uploadTarget.value = key
  fileInput.value?.click()
}

const handleFileSelect = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (file) {
    if (!file.type.startsWith('image/')) {
      ElMessage.error('只能上传图片文件')
    } else {
      try {
        const formData = new FormData()
        formData.append('file', file)
        const res = await adminApi.uploadFile(formData)
        if (res.success && res.data?.url) {
          form[uploadTarget.value] = res.data.url
          ElMessage.success('上传成功')
        } else {
          ElMessage.error('上传失败')
        }
      } catch {
        ElMessage.error('上传失败')
      }
    }
  }
  input.value = ''
}

onMounted(load)
</script>

<style scoped lang="scss">
.site-tab {
  padding: 8px 4px;
}

.settings-form {
  max-width: 900px;
}
</style>
