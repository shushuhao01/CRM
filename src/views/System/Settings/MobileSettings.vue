<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>移动应用下载</span>
        <div class="header-actions">
          <el-button @click="loadAppList" :loading="loading" type="primary" size="small">
            <el-icon><Refresh /></el-icon> 刷新
          </el-button>
        </div>
      </div>
    </template>

    <div class="mobile-app-content">
      <!-- 加载中 -->
      <div v-if="loading && appList.length === 0" class="loading-state">
        <el-skeleton :rows="4" animated />
      </div>

      <!-- 无可用应用 -->
      <div v-else-if="!loading && appList.length === 0" class="empty-state">
        <el-empty description="暂无可下载的移动应用">
          <template #image>
            <el-icon :size="64" color="#c0c4cc"><Cellphone /></el-icon>
          </template>
          <p class="empty-tip">管理员尚未配置移动应用安装包，请联系管理员在管理后台进行配置。</p>
        </el-empty>
      </div>

      <!-- 应用下载卡片 -->
      <div v-else class="app-download-grid">
        <div v-for="app in appList" :key="app.id" class="app-card" :class="app.platform">
          <div class="app-card-header">
            <div class="app-icon" :class="app.platform">
              <el-icon :size="36"><Cellphone /></el-icon>
            </div>
            <div class="app-meta">
              <h3 class="app-name">{{ app.appName || (app.platform === 'android' ? 'Android 客户端' : 'iOS 客户端') }}</h3>
              <div class="app-tags">
                <el-tag :type="app.platform === 'android' ? 'success' : 'primary'" size="small">
                  {{ app.platform === 'android' ? 'Android' : 'iOS' }}
                </el-tag>
                <el-tag v-if="app.version" type="info" size="small">{{ app.version }}</el-tag>
              </div>
            </div>
          </div>

          <div class="app-card-body">
            <div class="app-info-row" v-if="app.fileSize">
              <span class="info-label">文件大小</span>
              <span class="info-value">{{ formatFileSize(app.fileSize) }}</span>
            </div>
            <div class="app-info-row" v-if="app.downloadCount > 0">
              <span class="info-label">累计下载</span>
              <span class="info-value">{{ app.downloadCount }} 次</span>
            </div>
            <div class="app-info-row" v-if="app.updatedAt">
              <span class="info-label">更新时间</span>
              <span class="info-value">{{ formatDate(app.updatedAt) }}</span>
            </div>
            <div class="app-description" v-if="app.description">
              {{ app.description }}
            </div>
          </div>

          <div class="app-card-footer">
            <el-button
              type="primary"
              size="large"
              class="download-btn"
              @click="handleDownload(app)"
            >
              <el-icon><Download /></el-icon>
              {{ app.platform === 'android' ? '下载 APK' : '下载 IPA' }}
            </el-button>
            <el-button
              v-if="app.platform === 'android'"
              type="info"
              plain
              size="small"
              @click="showInstallGuide('android')"
            >安装说明</el-button>
            <el-button
              v-if="app.platform === 'ios'"
              type="info"
              plain
              size="small"
              @click="showInstallGuide('ios')"
            >安装说明</el-button>
          </div>
        </div>
      </div>

      <!-- 安装说明 -->
      <div v-if="appList.length > 0" class="usage-guide">
        <h4 class="section-title"><el-icon><Document /></el-icon> 安装说明</h4>
        <el-tabs v-model="activeGuideTab" class="guide-tabs">
          <el-tab-pane label="Android 安装" name="android">
            <div class="guide-content">
              <ol>
                <li>点击上方"下载 APK"按钮，将安装包下载到手机</li>
                <li>在手机设置中允许安装"未知来源"应用</li>
                <li>打开下载的 APK 文件进行安装</li>
                <li>安装完成后打开应用，按提示登录您的 CRM 账号</li>
                <li>授予必要的权限（通话、录音、网络等）</li>
              </ol>
            </div>
          </el-tab-pane>
          <el-tab-pane label="iOS 安装" name="ios">
            <div class="guide-content">
              <ol>
                <li>点击上方"下载 IPA"按钮获取安装包</li>
                <li>如需企业签名安装，请在 设置→通用→VPN与设备管理 中信任开发者证书</li>
                <li>或通过 TestFlight 等工具进行安装</li>
                <li>安装完成后打开应用，按提示登录您的 CRM 账号</li>
              </ol>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh, Download, Cellphone, Document } from '@element-plus/icons-vue'
import request from '@/utils/request'

interface AppItem {
  id: number
  platform: string
  appName: string
  version: string
  fileSize: number
  downloadCount: number
  description: string
  hasPackage: boolean
  hasExternalUrl: boolean
  externalUrl: string
  downloadUrl: string
  updatedAt: string
}

const loading = ref(false)
const appList = ref<AppItem[]>([])
const activeGuideTab = ref('android')

const formatFileSize = (bytes: number): string => {
  if (!bytes) return '-'
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  if (bytes < 1024 * 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
  return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB'
}

const formatDate = (dateStr: string): string => {
  if (!dateStr) return '-'
  try {
    return new Date(dateStr).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  } catch { return dateStr }
}

const loadAppList = async () => {
  loading.value = true
  try {
    const res = await request.get('/mobile-app/list') as any
    if (res?.success !== false) {
      appList.value = (Array.isArray(res) ? res : res?.data || res || []) as AppItem[]
    }
  } catch (error) {
    console.warn('[MobileSettings] 加载移动应用列表失败:', error)
    appList.value = []
  } finally {
    loading.value = false
  }
}

const handleDownload = (app: AppItem) => {
  if (app.hasExternalUrl && app.externalUrl) {
    window.open(app.externalUrl, '_blank')
  } else if (app.downloadUrl) {
    window.open(app.downloadUrl, '_blank')
  } else {
    ElMessage.warning('下载地址未配置，请联系管理员')
  }
}

const showInstallGuide = (platform: string) => {
  activeGuideTab.value = platform
  const el = document.querySelector('.usage-guide')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

onMounted(() => { loadAppList() })
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.mobile-app-content { padding: 10px 0; }
.loading-state { padding: 20px; }
.empty-state { padding: 40px 0; text-align: center; }
.empty-tip { color: #909399; font-size: 13px; margin-top: 8px; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 15px; color: #303133; }

.app-download-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; margin-bottom: 30px; }
.app-card { border: 1px solid #e4e7ed; border-radius: 12px; padding: 24px; transition: all 0.3s; background: #fff; }
.app-card:hover { box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); transform: translateY(-2px); }
.app-card.android { border-top: 3px solid #3ddc84; }
.app-card.ios { border-top: 3px solid #007aff; }

.app-card-header { display: flex; align-items: center; gap: 16px; margin-bottom: 20px; }
.app-icon { width: 60px; height: 60px; border-radius: 14px; display: flex; align-items: center; justify-content: center; color: #fff; flex-shrink: 0; }
.app-icon.android { background: linear-gradient(135deg, #3ddc84, #00c853); }
.app-icon.ios { background: linear-gradient(135deg, #007aff, #5856d6); }
.app-meta { flex: 1; }
.app-name { margin: 0 0 8px; font-size: 18px; font-weight: 600; color: #303133; }
.app-tags { display: flex; gap: 6px; }

.app-card-body { margin-bottom: 20px; }
.app-info-row { display: flex; justify-content: space-between; padding: 6px 0; font-size: 13px; border-bottom: 1px dashed #f0f0f0; }
.app-info-row:last-child { border-bottom: none; }
.info-label { color: #909399; }
.info-value { color: #303133; font-weight: 500; }
.app-description { margin-top: 12px; padding: 10px 12px; background: #f5f7fa; border-radius: 6px; font-size: 13px; color: #606266; line-height: 1.6; }

.app-card-footer { display: flex; align-items: center; gap: 10px; }
.download-btn { flex: 1; font-size: 15px; height: 42px; border-radius: 8px; }

.usage-guide { margin-top: 20px; }
.guide-content { padding: 16px; }
.guide-content ol { padding-left: 20px; }
.guide-content ol li { margin-bottom: 8px; line-height: 1.8; color: #606266; }
</style>

