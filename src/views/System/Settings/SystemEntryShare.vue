<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>系统入口分享</span>
        <el-tag type="info" size="small">管理员功能</el-tag>
      </div>
    </template>

    <div class="entry-share-content">
      <!-- 🔥 部署模式与租户信息 -->
      <div class="share-section">
        <h4 class="section-title">
          <el-icon><OfficeBuilding /></el-icon> 当前系统信息
        </h4>
        <div class="deploy-info-card">
          <div class="deploy-info-row">
            <span class="deploy-label">部署模式</span>
            <el-tag :type="isSaaS ? 'success' : 'primary'" size="default" effect="dark" round>
              {{ isSaaS ? '☁️ SaaS 云端版' : '🖥️ 私有部署版' }}
            </el-tag>
          </div>
          <template v-if="tenantInfo">
            <div class="deploy-info-row">
              <span class="deploy-label">企业名称</span>
              <span class="deploy-value">{{ tenantInfo.tenantName }}</span>
            </div>
            <div class="deploy-info-row" v-if="tenantInfo.tenantCode">
              <span class="deploy-label">租户编码</span>
              <div class="deploy-value-group">
                <el-tag size="large" effect="plain" class="tenant-code-tag">{{ tenantInfo.tenantCode }}</el-tag>
                <el-button size="small" text type="primary" @click="copyUrl(tenantInfo.tenantCode)">
                  <el-icon><CopyDocument /></el-icon> 复制
                </el-button>
              </div>
            </div>
            <div class="deploy-info-row" v-if="tenantInfo.packageName">
              <span class="deploy-label">套餐版本</span>
              <span class="deploy-value">{{ tenantInfo.packageName }}</span>
            </div>
          </template>
        </div>
      </div>

      <!-- 系统地址信息 -->
      <div class="share-section">
        <h4 class="section-title">
          <el-icon><Link /></el-icon> 系统访问地址
        </h4>
        <p class="section-desc">将以下链接分享给团队成员，即可访问CRM系统</p>

        <el-form label-width="100px" class="url-form">
          <el-form-item label="登录页地址">
            <div class="url-input-group">
              <el-input
                v-model="systemLoginUrl"
                readonly
                size="large"
                class="url-input"
              >
                <template #prefix>
                  <el-icon><Monitor /></el-icon>
                </template>
              </el-input>
              <el-button type="primary" @click="copyUrl(systemLoginUrl)" size="large">
                <el-icon><CopyDocument /></el-icon> 复制链接
              </el-button>
            </div>
          </el-form-item>

          <el-form-item label="首页地址">
            <div class="url-input-group">
              <el-input
                v-model="systemHomeUrl"
                readonly
                size="large"
                class="url-input"
              >
                <template #prefix>
                  <el-icon><HomeFilled /></el-icon>
                </template>
              </el-input>
              <el-button @click="copyUrl(systemHomeUrl)" size="large">
                <el-icon><CopyDocument /></el-icon> 复制链接
              </el-button>
            </div>
          </el-form-item>

          <!-- 自定义地址（私有部署时可能域名不同） -->
          <el-form-item label="自定义地址">
            <div class="url-input-group">
              <el-input
                v-model="customUrl"
                placeholder="输入自定义系统访问地址（可选，用于生成二维码）"
                size="large"
                clearable
                class="url-input"
              >
                <template #prefix>
                  <el-icon><EditPen /></el-icon>
                </template>
              </el-input>
              <el-button
                :disabled="!customUrl"
                @click="generateQRCode(customUrl)"
                size="large"
              >
                生成二维码
              </el-button>
            </div>
            <div class="form-tip">私有部署时，如有独立域名可在此填写后生成二维码</div>
          </el-form-item>
        </el-form>
      </div>

      <!-- 🔥 一键复制完整登录指引 -->
      <div class="share-section">
        <h4 class="section-title">
          <el-icon><Promotion /></el-icon> 一键复制登录指引
        </h4>
        <p class="section-desc">一键生成包含系统地址、登录方式的完整指引，直接发给团队成员</p>
        <div class="guide-preview">
          <pre class="guide-text">{{ loginGuideText }}</pre>
          <el-button type="primary" size="large" @click="copyUrl(loginGuideText)" class="copy-guide-btn">
            <el-icon><CopyDocument /></el-icon> 一键复制登录指引
          </el-button>
        </div>
      </div>

      <!-- 二维码区域 -->
      <div class="share-section">
        <h4 class="section-title">
          <el-icon><Iphone /></el-icon> 系统入口二维码
        </h4>
        <p class="section-desc">手机扫描二维码可直接打开系统登录页面，方便团队成员快速访问</p>

        <el-row :gutter="24">
          <!-- 主入口二维码（私有部署用局域网地址，SaaS用当前地址） -->
          <el-col :xs="24" :sm="12" :md="8">
            <div class="qr-card">
              <div class="qr-card-title">
                {{ !isSaaS && networkInfo?.lanUrl ? '局域网登录入口' : '登录页入口' }}
              </div>
              <div class="qr-image-wrapper">
                <img v-if="loginQrCode" :src="loginQrCode" alt="登录页二维码" class="qr-image" />
                <div v-else class="qr-placeholder">
                  <el-icon :size="48" color="#c0c4cc"><Loading /></el-icon>
                  <span>正在生成...</span>
                </div>
              </div>
              <div class="qr-url-text">{{ bestShareUrl }}</div>
              <div class="qr-actions">
                <el-button size="small" @click="downloadQRCode(loginQrCode, 'crm-login-qrcode.png')" :disabled="!loginQrCode">
                  <el-icon><Download /></el-icon> 下载图片
                </el-button>
                <el-button size="small" @click="copyUrl(bestShareUrl)">
                  <el-icon><CopyDocument /></el-icon> 复制链接
                </el-button>
              </div>
            </div>
          </el-col>

          <!-- 首页二维码 -->
          <el-col :xs="24" :sm="12" :md="8">
            <div class="qr-card">
              <div class="qr-card-title">系统首页入口</div>
              <div class="qr-image-wrapper">
                <img v-if="homeQrCode" :src="homeQrCode" alt="首页二维码" class="qr-image" />
                <div v-else class="qr-placeholder">
                  <el-icon :size="48" color="#c0c4cc"><Loading /></el-icon>
                  <span>正在生成...</span>
                </div>
              </div>
              <div class="qr-url-text">{{ !isSaaS && networkInfo?.lanUrl ? networkInfo.lanUrl : systemHomeUrl }}</div>
              <div class="qr-actions">
                <el-button size="small" @click="downloadQRCode(homeQrCode, 'crm-home-qrcode.png')" :disabled="!homeQrCode">
                  <el-icon><Download /></el-icon> 下载图片
                </el-button>
                <el-button size="small" @click="copyUrl(!isSaaS && networkInfo?.lanUrl ? networkInfo.lanUrl : systemHomeUrl)">
                  <el-icon><CopyDocument /></el-icon> 复制链接
                </el-button>
              </div>
            </div>
          </el-col>

          <!-- 自定义地址二维码 -->
          <el-col :xs="24" :sm="12" :md="8" v-if="customQrCode">
            <div class="qr-card">
              <div class="qr-card-title">自定义入口</div>
              <div class="qr-image-wrapper">
                <img :src="customQrCode" alt="自定义二维码" class="qr-image" />
              </div>
              <div class="qr-url-text">{{ customUrl }}</div>
              <div class="qr-actions">
                <el-button size="small" @click="downloadQRCode(customQrCode, 'crm-custom-qrcode.png')">
                  <el-icon><Download /></el-icon> 下载图片
                </el-button>
                <el-button size="small" @click="copyUrl(customUrl)">
                  <el-icon><CopyDocument /></el-icon> 复制链接
                </el-button>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>

      <!-- 分享说明 -->
      <div class="share-section">
        <h4 class="section-title">
          <el-icon><InfoFilled /></el-icon> 分享说明
        </h4>
        <el-alert type="info" :closable="false" show-icon>
          <template #title>团队成员访问指引</template>
          <template #default>
            <ol class="share-tips" v-if="isSaaS">
              <li>将系统登录页链接或二维码发送给团队成员</li>
              <li><strong>团队成员首次登录需输入租户编码「{{ tenantInfo?.tenantCode || '—' }}」验证企业身份</strong></li>
              <li>验证通过后，使用分配的账号密码登录系统</li>
              <li>同一浏览器下次登录会自动记住租户编码，无需重复输入</li>
              <li>建议使用 Chrome、Edge 等现代浏览器访问，获得最佳体验</li>
              <li>如需在手机上使用，扫描二维码后可将页面添加到手机桌面</li>
            </ol>
            <ol class="share-tips" v-else>
              <li>将<strong>局域网地址</strong>（如 http://192.168.x.x:3000）发送给同一网络下的团队成员</li>
              <li>团队成员需要与CRM服务器连接在<strong>同一WiFi或局域网</strong>下才能访问</li>
              <li>如果团队成员不在同一网络，需要配置域名、公网IP 或使用内网穿透工具</li>
              <li>建议使用 Chrome、Edge 等现代浏览器访问，获得最佳体验</li>
              <li>如需在手机上使用，扫描二维码后可将页面添加到手机桌面</li>
              <li>首次登录后建议立即修改默认密码</li>
            </ol>
          </template>
        </el-alert>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  Link,
  Monitor,
  CopyDocument,
  HomeFilled,
  EditPen,
  Iphone,
  Download,
  InfoFilled,
  Loading,
  OfficeBuilding,
  Promotion
} from '@element-plus/icons-vue'
import { getDeployMode, getLocalTenantInfo, type TenantInfo } from '@/api/tenantLicense'
import { useConfigStore } from '@/stores/config'
import request from '@/utils/request'

const configStore = useConfigStore()

// 部署模式与租户信息
const deployMode = ref<'private' | 'saas'>('saas')
const tenantInfo = ref<TenantInfo | null>(null)
const isSaaS = computed(() => deployMode.value === 'saas')

// 服务器网络信息（私有部署时获取局域网IP等）
interface NetworkInfo {
  hostname: string
  port: number
  lanAddresses: { name: string; address: string; family: string }[]
  preferredLanIp: string | null
  localhostUrl: string
  lanUrl: string | null
}
const networkInfo = ref<NetworkInfo | null>(null)

/**
 * 获取服务器网络信息（私有部署时调用）
 */
const fetchNetworkInfo = async () => {
  try {
    const res = await request.get('/system/network-info')
    if (res.data?.success && res.data.data) {
      const info = res.data.data as NetworkInfo
      // 后端返回的是后端端口（3000），前端需要根据当前浏览器的端口构造正确的URL
      // 生产环境通过 Nginx 统一端口，开发环境前端端口可能不同
      const currentPort = window.location.port
      const currentProtocol = window.location.protocol
      if (info.preferredLanIp) {
        // 用当前浏览器的端口替代后端端口，因为用户是通过前端端口访问的
        info.lanUrl = currentPort
          ? `${currentProtocol}//${info.preferredLanIp}:${currentPort}`
          : `${currentProtocol}//${info.preferredLanIp}`
      } else if (info.lanAddresses?.length > 0) {
        const firstIp = info.lanAddresses[0].address
        info.lanUrl = currentPort
          ? `${currentProtocol}//${firstIp}:${currentPort}`
          : `${currentProtocol}//${firstIp}`
      }
      networkInfo.value = info
    }
  } catch (error) {
    console.warn('获取服务器网络信息失败（仅私有部署需要）:', error)
  }
}

/**
 * 最佳分享地址（二维码和登录指引用）
 * - 私有部署：优先使用局域网IP地址（其他成员可访问）
 * - SaaS模式：使用当前浏览器地址（已经是域名）
 */
const bestShareUrl = computed(() => {
  if (!isSaaS.value && networkInfo.value?.lanUrl) {
    return `${networkInfo.value.lanUrl}/login`
  }
  return systemLoginUrl.value
})

// 系统URL（显示在输入框中）
const systemLoginUrl = computed(() => {
  if (!isSaaS.value && networkInfo.value?.lanUrl) {
    return `${networkInfo.value.lanUrl}/login`
  }
  return `${window.location.origin}/login`
})
const systemHomeUrl = computed(() => {
  if (!isSaaS.value && networkInfo.value?.lanUrl) {
    return networkInfo.value.lanUrl
  }
  return window.location.origin
})
const customUrl = ref('')

// 二维码数据
const loginQrCode = ref('')
const homeQrCode = ref('')
const customQrCode = ref('')

/**
 * 生成登录指引文案（一键复制）
 */
const loginGuideText = computed(() => {
  const sysName = configStore.systemConfig.systemName || 'CRM客户管理系统'
  const shareLoginUrl = bestShareUrl.value
  const lines: string[] = []

  lines.push(`📋 ${sysName} — 登录指引`)
  lines.push(`${'─'.repeat(32)}`)
  lines.push('')

  if (isSaaS.value) {
    lines.push(`☁️ 部署模式：SaaS 云端版`)
    if (tenantInfo.value?.tenantName) {
      lines.push(`🏢 企业名称：${tenantInfo.value.tenantName}`)
    }
    lines.push('')
    lines.push(`🔗 系统登录地址：${shareLoginUrl}`)
    lines.push('')
    lines.push(`📌 登录步骤：`)
    if (tenantInfo.value?.tenantCode) {
      lines.push(`   1. 打开上方登录地址`)
      lines.push(`   2. 输入租户编码：${tenantInfo.value.tenantCode}`)
      lines.push(`   3. 输入管理员分配的账号和密码`)
      lines.push(`   4. 勾选协议后点击登录`)
    } else {
      lines.push(`   1. 打开上方登录地址`)
      lines.push(`   2. 输入管理员分配的账号和密码`)
      lines.push(`   3. 勾选协议后点击登录`)
    }
  } else {
    lines.push(`🖥️ 部署模式：私有部署版`)
    if (tenantInfo.value?.tenantName) {
      lines.push(`🏢 企业名称：${tenantInfo.value.tenantName}`)
    }
    lines.push('')
    lines.push(`🔗 系统登录地址：${shareLoginUrl}`)
    if (networkInfo.value?.lanUrl) {
      lines.push(`🏠 系统首页地址：${networkInfo.value.lanUrl}`)
    }
    lines.push('')
    lines.push(`📌 登录步骤：`)
    lines.push(`   1. 确保与CRM服务器在同一局域网/WiFi下`)
    lines.push(`   2. 打开上方登录地址`)
    lines.push(`   3. 输入管理员分配的账号和密码`)
    lines.push(`   4. 勾选协议后点击登录`)
    lines.push('')
    lines.push(`⚠️ 注意：如不在同一网络下，请联系管理员获取外网地址`)
  }

  lines.push('')
  lines.push(`💡 建议使用 Chrome / Edge 浏览器访问`)
  lines.push(`🔒 首次登录后请立即修改密码`)

  return lines.join('\n')
})

/**
 * 生成二维码图片
 */
const generateQRCodeImage = async (data: string): Promise<string> => {
  try {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(data, {
      width: 280,
      margin: 2,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'M'
    })
  } catch (error) {
    console.error('生成二维码失败:', error)
    // 兜底：使用在线服务
    return `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(data)}`
  }
}

/**
 * 生成指定地址的二维码
 */
const generateQRCode = async (url: string) => {
  if (!url) return
  try {
    customQrCode.value = await generateQRCodeImage(url)
    ElMessage.success('二维码已生成')
  } catch {
    ElMessage.error('生成二维码失败')
  }
}

/**
 * 初始化：生成默认二维码（私有部署时用局域网地址）
 */
const initQRCodes = async () => {
  try {
    const loginUrl = bestShareUrl.value
    const homeUrl = !isSaaS.value && networkInfo.value?.lanUrl
      ? networkInfo.value.lanUrl
      : systemHomeUrl.value

    const [loginQr, homeQr] = await Promise.all([
      generateQRCodeImage(loginUrl),
      generateQRCodeImage(homeUrl)
    ])
    loginQrCode.value = loginQr
    homeQrCode.value = homeQr
  } catch (error) {
    console.error('初始化二维码失败:', error)
    // 兜底：使用在线服务生成
    try {
      const loginUrl = bestShareUrl.value
      const homeUrl = systemHomeUrl.value
      loginQrCode.value = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(loginUrl)}`
      homeQrCode.value = `https://api.qrserver.com/v1/create-qr-code/?size=280x280&data=${encodeURIComponent(homeUrl)}`
    } catch (_e) {
      console.error('兜底二维码也生成失败')
    }
  }
}

/**
 * 复制URL到剪贴板
 */
const copyUrl = async (url: string) => {
  try {
    await navigator.clipboard.writeText(url)
    ElMessage.success('链接已复制到剪贴板')
  } catch {
    // 降级方案
    const textArea = document.createElement('textarea')
    textArea.value = url
    textArea.style.position = 'fixed'
    textArea.style.opacity = '0'
    document.body.appendChild(textArea)
    textArea.select()
    document.execCommand('copy')
    document.body.removeChild(textArea)
    ElMessage.success('链接已复制到剪贴板')
  }
}

/**
 * 下载二维码图片
 */
const downloadQRCode = (dataUrl: string, filename: string) => {
  if (!dataUrl) return
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  ElMessage.success('二维码图片已开始下载')
}

onMounted(async () => {
  // 获取部署模式和租户信息
  deployMode.value = getDeployMode()
  tenantInfo.value = getLocalTenantInfo()

  // 私有部署时获取服务器网络信息（获取局域网IP）
  if (!isSaaS.value) {
    await fetchNetworkInfo()
  }

  // 生成二维码（必须在 fetchNetworkInfo 之后，这样 bestShareUrl 才是正确的局域网地址）
  await initQRCodes()
})
</script>

<style scoped>
.entry-share-content {
  padding: 0;
}

.share-section {
  margin-bottom: 32px;
}

.share-section:last-child {
  margin-bottom: 0;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 8px 0;
  font-size: 16px;
  font-weight: 600;
  color: #303133;
}

.section-desc {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: #909399;
}

/* 部署信息卡片 */
.deploy-info-card {
  background: linear-gradient(135deg, #f0f5ff 0%, #f6f8ff 100%);
  border: 1px solid #d6e4ff;
  border-radius: 12px;
  padding: 20px 24px;
  max-width: 600px;
}

.deploy-info-row {
  display: flex;
  align-items: center;
  padding: 10px 0;
}

.deploy-info-row + .deploy-info-row {
  border-top: 1px dashed #e4e7ed;
}

.deploy-label {
  width: 80px;
  flex-shrink: 0;
  font-size: 13px;
  color: #909399;
  font-weight: 500;
}

.deploy-value {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.deploy-value-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.tenant-code-tag {
  font-size: 15px !important;
  font-weight: 600;
  letter-spacing: 1px;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
}

/* 登录指引 */
.guide-preview {
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 20px;
  max-width: 600px;
}

.guide-text {
  margin: 0 0 16px 0;
  padding: 16px;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.8;
  color: #303133;
  white-space: pre-wrap;
  word-break: break-all;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
  max-height: 400px;
  overflow-y: auto;
}

.copy-guide-btn {
  width: 100%;
}

.url-form {
  max-width: 800px;
}

.url-input-group {
  display: flex;
  gap: 12px;
  width: 100%;
}

.url-input {
  flex: 1;
}

.form-tip {
  margin-top: 4px;
  font-size: 12px;
  color: #909399;
}

/* 网络场景卡片 */
.network-scenarios {
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 700px;
}

.scenario-card {
  background: #fafbfc;
  border: 1px solid #ebeef5;
  border-radius: 12px;
  padding: 16px 20px;
  transition: all 0.3s;
}

.scenario-card.highlight {
  background: linear-gradient(135deg, #f0f9eb 0%, #f5fbf2 100%);
  border-color: #b3e19d;
}

.scenario-header {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  margin-bottom: 12px;
}

.scenario-icon {
  font-size: 24px;
  line-height: 1;
  flex-shrink: 0;
  margin-top: 2px;
}

.scenario-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.scenario-desc {
  font-size: 13px;
  color: #909399;
  margin-top: 2px;
}

.scenario-url-row {
  display: flex;
  gap: 8px;
  align-items: center;
}

.scenario-input {
  flex: 1;
}

.scenario-extra {
  margin-top: 8px;
}

.scenario-empty {
  padding: 8px 0;
}

.scenario-options {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.option-item {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #606266;
}

/* IP列表弹出 */
.ip-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ip-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 0;
  border-bottom: 1px dashed #ebeef5;
  font-size: 13px;
}

.ip-item:last-child {
  border-bottom: none;
}

.ip-name {
  color: #909399;
  font-size: 12px;
  min-width: 60px;
}

.ip-addr {
  flex: 1;
  color: #303133;
  font-family: 'SF Mono', 'Fira Code', 'Consolas', monospace;
  font-size: 12px;
}

/* 二维码卡片 */
.qr-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 20px;
  background: #fafafa;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  transition: all 0.3s;
}

.qr-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
  border-color: #409eff;
}

.qr-card-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 16px;
}

.qr-image-wrapper {
  width: 200px;
  height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #fff;
  border: 1px solid #ebeef5;
  border-radius: 8px;
  padding: 8px;
  margin-bottom: 12px;
}

.qr-image {
  width: 100%;
  height: 100%;
  object-fit: contain;
  border-radius: 4px;
}

.qr-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  color: #c0c4cc;
  font-size: 13px;
}

.qr-url-text {
  font-size: 12px;
  color: #909399;
  max-width: 220px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  text-align: center;
  margin-bottom: 12px;
}

.qr-actions {
  display: flex;
  gap: 8px;
}

/* 分享提示 */
.share-tips {
  margin: 8px 0 0 0;
  padding-left: 20px;
  line-height: 2;
  color: #606266;
  font-size: 13px;
}

/* 响应式 */
@media (max-width: 768px) {
  .url-input-group {
    flex-direction: column;
  }

  .qr-card {
    margin-bottom: 16px;
  }
}
</style>


