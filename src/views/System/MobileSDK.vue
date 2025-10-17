<template>
  <div class="mobile-sdk-container">
    <div class="page-header">
      <h1>移动SDK管理</h1>
      <p>管理和分发CRM系统移动端SDK - 现已升级为PWA应用</p>
      
      <!-- APK下载说明 -->
      <div class="alert alert-info">
        <h3>📱 CRM移动SDK - 原生Android应用</h3>
        <p>提供完整的CRM功能，支持直接安装，无需应用商店。</p>
        <p>包含权限管理、网络连接测试、通话服务等核心功能。</p>
      </div>
    </div>

    <div class="sdk-grid">
      <!-- Android SDK -->
      <div class="sdk-card">
        <div class="sdk-icon android">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M17.6,9.48l1.84-3.18c0.16-0.31,0.04-0.69-0.26-0.85c-0.29-0.15-0.65-0.06-0.83,0.22l-1.88,3.24 c-2.86-1.21-6.08-1.21-8.94,0L5.65,5.67c-0.19-0.29-0.58-0.38-0.87-0.22C4.5,5.65,4.41,6.01,4.56,6.3L6.4,9.48 C3.3,11.25,1.28,14.44,1,18h22C22.72,14.44,20.7,11.25,17.6,9.48z M7,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25S8.25,13.31,8.25,14C8.25,14.69,7.69,15.25,7,15.25z M17,15.25c-0.69,0-1.25-0.56-1.25-1.25 c0-0.69,0.56-1.25,1.25-1.25s1.25,0.56,1.25,1.25C18.25,14.69,17.69,15.25,17,15.25z"/>
          </svg>
        </div>
        <h3>Android SDK</h3>
        <p>适用于Android设备的CRM移动SDK</p>
        <div class="sdk-info">
          <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="label">大小:</span>
            <span class="value">{{ androidSize }}</span>
          </div>
          <div class="info-item">
            <span class="label">更新时间:</span>
            <span class="value">{{ androidUpdateTime }}</span>
          </div>
        </div>
        <div class="sdk-actions">
          <a href="/api/v1/mobile-sdk/download/android" class="btn btn-primary" download>
            <i class="fas fa-download"></i>
            下载APK
          </a>
          <button @click="showInstallGuide('android')" class="btn btn-secondary">
            <i class="fas fa-book"></i>
            安装说明
          </button>
        </div>
      </div>

      <!-- iOS SDK -->
      <div class="sdk-card">
        <div class="sdk-icon ios">
          <svg viewBox="0 0 24 24" width="48" height="48">
            <path fill="currentColor" d="M18.71,19.5C17.88,20.74 17,21.95 15.66,21.97C14.32,22 13.89,21.18 12.37,21.18C10.84,21.18 10.37,21.95 9.1,22C7.79,22.05 6.8,20.68 5.96,19.47C4.25,17 2.94,12.45 4.7,9.39C5.57,7.87 7.13,6.91 8.82,6.88C10.1,6.86 11.32,7.75 12.11,7.75C12.89,7.75 14.37,6.68 15.92,6.84C16.57,6.87 18.39,7.1 19.56,8.82C19.47,8.88 17.39,10.1 17.41,12.63C17.44,15.65 20.06,16.66 20.09,16.67C20.06,16.74 19.67,18.11 18.71,19.5M13,3.5C13.73,2.67 14.94,2.04 15.94,2C16.07,3.17 15.6,4.35 14.9,5.19C14.21,6.04 13.07,6.7 11.95,6.61C11.8,5.46 12.36,4.26 13,3.5Z"/>
          </svg>
        </div>
        <h3>iOS SDK</h3>
        <p>适用于iPhone和iPad的CRM移动SDK</p>
        <div class="sdk-info">
          <div class="info-item">
            <span class="label">版本:</span>
            <span class="value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="label">大小:</span>
            <span class="value">{{ iosSize }}</span>
          </div>
          <div class="info-item">
            <span class="label">更新时间:</span>
            <span class="value">{{ iosUpdateTime }}</span>
          </div>
        </div>
        <div class="sdk-actions">
          <a href="/api/v1/mobile-sdk/download/ios" class="btn btn-primary" download>
            <i class="fas fa-download"></i>
            下载IPA
          </a>
          <button @click="showInstallGuide('ios')" class="btn btn-secondary">
            <i class="fas fa-book"></i>
            安装说明
          </button>
        </div>
      </div>
    </div>

    <!-- 安装说明 -->
    <div class="installation-guide">
      <h2>安装说明</h2>
      <div class="guide-tabs">
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'android' }"
          @click="activeTab = 'android'"
        >
          Android安装
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'ios' }"
          @click="activeTab = 'ios'"
        >
          iOS安装
        </button>
        <button 
          class="tab-btn" 
          :class="{ active: activeTab === 'web' }"
          @click="activeTab = 'web'"
        >
          Web版本
        </button>
      </div>

      <div class="tab-content">
        <div v-if="activeTab === 'android'" class="guide-content">
          <h3>Android APK安装步骤</h3>
          <ol>
            <li><strong>下载APK文件</strong><br>
                点击上方"下载APK"按钮，将文件保存到设备</li>
            <li><strong>启用未知来源</strong><br>
                进入设置 → 安全 → 允许安装未知来源的应用</li>
            <li><strong>安装应用</strong><br>
                找到下载的APK文件，点击进行安装</li>
            <li><strong>授予权限</strong><br>
                首次启动时，根据提示授予必要的权限</li>
            <li><strong>开始使用</strong><br>
                完成权限设置后即可正常使用CRM功能</li>
          </ol>
          <div class="note">
            <strong>优势：</strong>完整的通话功能支持，更好的权限管理，原生性能体验
          </div>
        </div>

        <div v-if="activeTab === 'ios'" class="guide-content">
          <h3>iOS IPA安装步骤</h3>
          <ol>
            <li><strong>下载IPA文件</strong><br>
                点击上方"下载IPA"按钮，将文件保存到设备</li>
            <li><strong>使用第三方工具</strong><br>
                需要使用AltStore、Sideloadly等工具进行安装</li>
            <li><strong>信任开发者</strong><br>
                安装后需要在设置中信任开发者证书</li>
            <li><strong>授予权限</strong><br>
                首次启动时，根据提示授予必要的权限</li>
            <li><strong>开始使用</strong><br>
                完成设置后即可正常使用CRM功能</li>
          </ol>
          <div class="note">
            <strong>注意：</strong>iOS安装相对复杂，建议企业用户使用企业证书分发
          </div>
        </div>

        <div v-if="activeTab === 'web'" class="guide-content">
          <h3>Web版本使用说明</h3>
          <ol>
            <li>在手机浏览器中访问SDK页面</li>
            <li>支持Chrome、Safari、Firefox等主流浏览器</li>
            <li>可以添加到主屏幕，获得类似原生应用的体验</li>
            <li>支持离线使用，无需网络连接</li>
            <li>自动更新，始终使用最新版本</li>
          </ol>
          <div class="note">
            <strong>优势：</strong>无需下载安装，即开即用，跨平台兼容
          </div>
        </div>
      </div>
    </div>

    <!-- 二维码分享 -->
    <div class="qr-section">
      <h2>扫码访问</h2>
      <div class="qr-container">
        <div class="qr-code">
          <div class="qr-placeholder">
            <svg viewBox="0 0 24 24" width="64" height="64">
              <path fill="currentColor" d="M3,11H5V13H3V11M11,5H13V9H11V5M9,11H13V15H9V11M15,11H17V13H15V11M19,5H21V9H19V5M5,5H9V9H5V5M3,19H5V21H3V19M5,19H9V21H5V19M11,19H13V21H11V19M15,19H17V21H15V19M19,19H21V21H19V19Z"/>
            </svg>
          </div>
          <p>扫描二维码<br>在手机上访问</p>
        </div>
        <div class="qr-info">
          <h3>移动端访问地址</h3>
          <div class="url-box">
            <code>{{ mobileSDKUrl }}</code>
            <button class="copy-btn" @click="copyUrl">复制</button>
          </div>
          <p>用户可以通过扫描二维码或直接访问链接来使用移动SDK</p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'

const activeTab = ref('android')
const androidSize = ref('--')
const iosSize = ref('--')
const androidUpdateTime = ref('--')
const iosUpdateTime = ref('--')
const mobileSDKUrl = ref('http://localhost:5173/mobile-sdk/')

// 获取文件信息
const getFileInfo = async () => {
  try {
    const response = await fetch('/api/v1/mobile-sdk/info')
    const result = await response.json()
    
    if (result.success) {
      const { android, ios } = result.data
      androidSize.value = android.available ? formatFileSize(android.size) : '未构建'
      iosSize.value = ios.available ? formatFileSize(ios.size) : '开发中'
      androidUpdateTime.value = android.updateTime || new Date().toLocaleDateString('zh-CN')
      iosUpdateTime.value = ios.updateTime || new Date().toLocaleDateString('zh-CN')
    }
  } catch (error) {
    console.error('获取文件信息失败:', error)
    androidSize.value = '获取失败'
    iosSize.value = '获取失败'
  }
}

// 格式化文件大小
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

// 下载Android SDK
const downloadAndroidSDK = () => {
  // 调用后端API下载APK文件
  window.open('/api/v1/mobile-sdk/download/android', '_blank')
  ElMessage.success('Android SDK下载已开始')
}

// 下载iOS SDK
const downloadIOSSDK = () => {
  // 调用后端API下载IPA文件
  window.open('/api/v1/mobile-sdk/download/ios', '_blank')
  ElMessage.success('iOS SDK下载已开始')
}

// 预览Android SDK
const previewAndroidSDK = () => {
  window.open('/mobile-sdk/', '_blank')
}

// 预览iOS SDK
const previewIOSSDK = () => {
  window.open('/mobile-sdk/', '_blank')
}

// 显示安装指南
const showInstallGuide = (platform: string) => {
  activeTab.value = platform
  // 滚动到安装指南部分
  const guideSection = document.querySelector('.installation-guide')
  if (guideSection) {
    guideSection.scrollIntoView({ behavior: 'smooth' })
  }
}

// 复制URL
const copyUrl = async () => {
  try {
    await navigator.clipboard.writeText(mobileSDKUrl.value)
    ElMessage.success('链接已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败，请手动复制')
  }
}

onMounted(() => {
  getFileInfo()
})
</script>

<style scoped>
.mobile-sdk-container {
  padding: 24px;
  max-width: 1200px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 32px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.page-header p {
  color: #6b7280;
  font-size: 16px;
}

.alert {
  padding: 20px;
  border-radius: 8px;
  margin: 20px 0;
  text-align: left;
}

.alert-info {
  background: #e3f2fd;
  border: 1px solid #2196f3;
  color: #1565c0;
}

.alert h3 {
  margin-bottom: 12px;
  font-size: 18px;
  font-weight: 600;
}

.alert p {
  margin-bottom: 16px;
  line-height: 1.6;
}

.sdk-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(400px, 1fr));
  gap: 24px;
  margin-bottom: 48px;
}

.sdk-card {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  transition: all 0.3s ease;
}

.sdk-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.sdk-icon {
  width: 64px;
  height: 64px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.sdk-icon.android {
  background: linear-gradient(135deg, #3ddc84 0%, #2e7d32 100%);
  color: white;
}

.sdk-icon.ios {
  background: linear-gradient(135deg, #007aff 0%, #0056b3 100%);
  color: white;
}

.sdk-card h3 {
  font-size: 20px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 8px;
}

.sdk-card p {
  color: #6b7280;
  margin-bottom: 20px;
}

.sdk-info {
  margin-bottom: 24px;
}

.info-item {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 8px 0;
  border-bottom: 1px solid #f3f4f6;
}

.info-item:last-child {
  border-bottom: none;
}

.label {
  color: #6b7280;
  font-weight: 500;
}

.value {
  color: #1f2937;
  font-weight: 600;
}

.sdk-actions {
  display: flex;
  gap: 12px;
}

.btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  border-radius: 8px;
  border: none;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.3s ease;
  flex: 1;
  justify-content: center;
}

.btn-primary {
  background: #409eff;
  color: white;
}

.btn-primary:hover {
  background: #337ecc;
}

.btn-secondary {
  background: #f3f4f6;
  color: #374151;
  border: 1px solid #d1d5db;
}

.btn-secondary:hover {
  background: #e5e7eb;
}

.installation-guide {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
  margin-bottom: 32px;
}

.installation-guide h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

.guide-tabs {
  display: flex;
  border-bottom: 1px solid #e5e7eb;
  margin-bottom: 24px;
}

.tab-btn {
  padding: 12px 24px;
  border: none;
  background: none;
  color: #6b7280;
  font-weight: 500;
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition: all 0.3s ease;
}

.tab-btn.active {
  color: #409eff;
  border-bottom-color: #409eff;
}

.tab-btn:hover {
  color: #409eff;
}

.guide-content h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 16px;
}

.guide-content ol {
  margin-bottom: 16px;
  padding-left: 20px;
}

.guide-content li {
  margin-bottom: 8px;
  color: #374151;
  line-height: 1.6;
}

.note {
  background: #fef3c7;
  border: 1px solid #f59e0b;
  border-radius: 8px;
  padding: 12px;
  color: #92400e;
}

.qr-section {
  background: white;
  border-radius: 12px;
  padding: 24px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  border: 1px solid #e5e7eb;
}

.qr-section h2 {
  font-size: 24px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 20px;
}

.qr-container {
  display: flex;
  gap: 32px;
  align-items: center;
}

.qr-code {
  text-align: center;
}

.qr-placeholder {
  width: 120px;
  height: 120px;
  background: #f3f4f6;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 12px;
  color: #9ca3af;
}

.qr-info {
  flex: 1;
}

.qr-info h3 {
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.url-box {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.url-box code {
  flex: 1;
  background: #f3f4f6;
  padding: 8px 12px;
  border-radius: 6px;
  font-family: 'Courier New', monospace;
  color: #374151;
}

.copy-btn {
  padding: 8px 16px;
  background: #409eff;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 500;
  transition: background 0.3s ease;
}

.copy-btn:hover {
  background: #337ecc;
}

@media (max-width: 768px) {
  .sdk-grid {
    grid-template-columns: 1fr;
  }
  
  .qr-container {
    flex-direction: column;
    text-align: center;
  }
  
  .url-box {
    flex-direction: column;
  }
  
  .url-box code {
    word-break: break-all;
  }
}
</style>