<template>
  <div class="site-tab" v-loading="loading">
    <el-form :model="form" label-width="160px" class="settings-form">
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
        <div class="form-tip">系统已自动生成默认密钥，并可通过 <code>/&lt;key&gt;.txt</code> 校验，无需手动配置。</div>
      </el-form-item>

      <el-form-item>
        <el-button v-if="canEdit" type="primary" :loading="saving" @click="save">保存设置</el-button>
        <el-button type="success" :loading="pushing" @click="pushSeo">推送到搜索引擎</el-button>
      </el-form-item>
    </el-form>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { useUserStore } from '@/stores/user'
import { siteApi } from '@/api/site'

interface SettingsForm {
  seoTitle: string
  seoKeywords: string
  seoDescription: string
  baiduPushToken: string
  indexNowKey: string
}

const keys: Array<keyof SettingsForm> = [
  'seoTitle', 'seoKeywords', 'seoDescription',
  'baiduPushToken', 'indexNowKey'
]

const userStore = useUserStore()
const canEdit = computed(() => userStore.hasPermission('website:settings:edit'))

const form = reactive<SettingsForm>({
  seoTitle: '',
  seoKeywords: '',
  seoDescription: '',
  baiduPushToken: '',
  indexNowKey: ''
})

const loading = ref(false)
const saving = ref(false)
const pushing = ref(false)
// 官网域名在别处维护，这里仅用于展示站点地图地址，不在此处编辑
const siteUrl = ref('')
const sitemapUrl = computed(() => `${(siteUrl.value || '').replace(/\/$/, '')}/sitemap.xml`)

const load = async () => {
  loading.value = true
  try {
    const res = await siteApi.getSettings()
    const data = res.data || {}
    siteUrl.value = data.siteUrl || ''
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

onMounted(load)
</script>

<style scoped lang="scss">
.site-tab {
  padding: 8px 4px;
}

.settings-form {
  max-width: 900px;
}

.form-tip {
  width: 100%;
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.6;
  color: var(--el-text-color-secondary);

  code {
    padding: 0 4px;
    border-radius: 3px;
    background: var(--el-fill-color-light);
    font-family: monospace;
  }
}
</style>
