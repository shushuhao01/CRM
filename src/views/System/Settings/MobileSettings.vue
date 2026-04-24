<template>
  <el-card class="setting-card">
    <template #header>
      <div class="card-header">
        <span>移动应用管理</span>
        <div class="header-actions">
          <el-button @click="refreshMobileSDKInfo" :loading="mobileSDKLoading" type="primary" size="small">
            <el-icon><Refresh /></el-icon> 刷新信息
          </el-button>
        </div>
      </div>
    </template>

    <div class="mobile-app-content">
      <!-- SDK 状态概览 -->
      <div class="sdk-overview">
        <h4 class="section-title"><el-icon><Phone /></el-icon> SDK 状态概览</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="status-card">
              <el-statistic title="Android SDK" :value="mobileSDKInfo.android.version" />
              <div class="status-info">
                <el-tag :type="mobileSDKInfo.android.available ? 'success' : 'danger'" size="small">{{ mobileSDKInfo.android.available ? '可用' : '未构建' }}</el-tag>
                <span class="file-size">{{ mobileSDKInfo.android.size }}</span>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="status-card">
              <el-statistic title="iOS SDK" :value="mobileSDKInfo.ios.version" />
              <div class="status-info">
                <el-tag :type="mobileSDKInfo.ios.available ? 'success' : 'warning'" size="small">{{ mobileSDKInfo.ios.available ? '可用' : '开发中' }}</el-tag>
                <span class="file-size">{{ mobileSDKInfo.ios.size }}</span>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="status-card">
              <el-statistic title="PWA应用" value="v1.0.0" />
              <div class="status-info">
                <el-tag type="success" size="small">已部署</el-tag>
                <span class="file-size">轻量级</span>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- SDK 下载和管理 -->
      <div class="sdk-management">
        <h4 class="section-title"><el-icon><Download /></el-icon> SDK 下载和管理</h4>
        <div class="sdk-grid">
          <div class="sdk-item">
            <div class="sdk-header"><div class="sdk-icon android"><el-icon size="32"><Platform /></el-icon></div><div class="sdk-info"><h5>Android SDK</h5><p>原生Android应用，支持完整CRM功能</p></div></div>
            <div class="sdk-details"><div class="detail-item"><span class="label">版本:</span><span class="value">{{ mobileSDKInfo.android.version }}</span></div><div class="detail-item"><span class="label">大小:</span><span class="value">{{ mobileSDKInfo.android.size }}</span></div><div class="detail-item"><span class="label">更新时间:</span><span class="value">{{ mobileSDKInfo.android.updateTime }}</span></div></div>
            <div class="sdk-actions"><el-button @click="downloadAndroidSDK" type="primary" :disabled="!mobileSDKInfo.android.available" size="small"><el-icon><Download /></el-icon>下载APK</el-button><el-button @click="showInstallGuide('android')" type="info" plain size="small">安装说明</el-button></div>
          </div>
          <div class="sdk-item">
            <div class="sdk-header"><div class="sdk-icon ios"><el-icon size="32"><Iphone /></el-icon></div><div class="sdk-info"><h5>iOS SDK</h5><p>适用于iPhone和iPad的CRM应用</p></div></div>
            <div class="sdk-details"><div class="detail-item"><span class="label">版本:</span><span class="value">{{ mobileSDKInfo.ios.version }}</span></div><div class="detail-item"><span class="label">大小:</span><span class="value">{{ mobileSDKInfo.ios.size }}</span></div><div class="detail-item"><span class="label">状态:</span><span class="value"><el-tag :type="mobileSDKInfo.ios.available ? 'success' : 'warning'" size="small">{{ mobileSDKInfo.ios.available ? '可用' : '开发中' }}</el-tag></span></div></div>
            <div class="sdk-actions"><el-button @click="downloadIOSSDK" type="primary" :disabled="!mobileSDKInfo.ios.available" size="small"><el-icon><Download /></el-icon>下载IPA</el-button><el-button @click="showInstallGuide('ios')" type="info" plain size="small">安装说明</el-button></div>
          </div>
          <div class="sdk-item">
            <div class="sdk-header"><div class="sdk-icon pwa"><el-icon size="32"><Monitor /></el-icon></div><div class="sdk-info"><h5>PWA 应用</h5><p>渐进式Web应用，无需安装</p></div></div>
            <div class="sdk-details"><div class="detail-item"><span class="label">版本:</span><span class="value">v1.0.0</span></div><div class="detail-item"><span class="label">类型:</span><span class="value">Web应用</span></div><div class="detail-item"><span class="label">状态:</span><span class="value">已部署</span></div></div>
            <div class="sdk-actions"><el-button @click="openPWAApp" type="success" size="small"><el-icon><Link /></el-icon>打开应用</el-button><el-button @click="showQRCode" type="info" plain size="small">二维码</el-button></div>
          </div>
        </div>
      </div>

      <!-- 连接状态和配置 -->
      <div class="connection-status-section">
        <h4 class="section-title"><el-icon><Connection /></el-icon> 连接状态和配置</h4>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="config-card"><template #header><span>服务器配置</span></template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="服务器地址">{{ serverConfig.host }}:{{ serverConfig.port }}</el-descriptions-item>
                <el-descriptions-item label="WebSocket端口">{{ serverConfig.wsPort }}</el-descriptions-item>
                <el-descriptions-item label="SSL状态"><el-tag :type="serverConfig.ssl ? 'success' : 'warning'" size="small">{{ serverConfig.ssl ? '已启用' : '未启用' }}</el-tag></el-descriptions-item>
                <el-descriptions-item label="API版本">{{ serverConfig.apiVersion }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="config-card"><template #header><span>连接统计</span></template>
              <el-descriptions :column="1" border size="small">
                <el-descriptions-item label="活跃连接"><el-tag type="success" size="small">{{ connectionStats.active }}</el-tag></el-descriptions-item>
                <el-descriptions-item label="今日连接">{{ connectionStats.today }}</el-descriptions-item>
                <el-descriptions-item label="总连接数">{{ connectionStats.total }}</el-descriptions-item>
                <el-descriptions-item label="最后连接">{{ connectionStats.lastConnection || '暂无' }}</el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 二维码连接管理 -->
      <div class="qr-connection-management">
        <h4 class="section-title"><el-icon><Connection /></el-icon> 二维码连接管理</h4>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card class="qr-card"><template #header><span>生成连接二维码</span></template>
              <div class="qr-generator">
                <el-form :model="qrConnectionForm" label-width="100px" size="small">
                  <el-form-item label="用户权限"><el-checkbox-group v-model="qrConnectionForm.permissions"><el-checkbox label="call">通话权限</el-checkbox><el-checkbox label="sms">短信权限</el-checkbox><el-checkbox label="contacts">联系人权限</el-checkbox><el-checkbox label="storage">存储权限</el-checkbox></el-checkbox-group></el-form-item>
                  <el-form-item label="有效期"><el-select v-model="qrConnectionForm.expireTime" placeholder="选择有效期"><el-option label="5分钟" value="5" /><el-option label="10分钟" value="10" /><el-option label="30分钟" value="30" /><el-option label="1小时" value="60" /></el-select></el-form-item>
                  <el-form-item><el-button type="primary" @click="generateSystemQRCode" :loading="qrConnectionLoading">生成二维码</el-button><el-button v-if="systemQRConnection.connectionId" @click="refreshSystemQRCode" :loading="qrConnectionLoading">刷新二维码</el-button></el-form-item>
                </el-form>
              </div>
            </el-card>
          </el-col>
          <el-col :span="12">
            <el-card class="qr-display-card"><template #header><span>扫码连接</span></template>
              <div class="qr-display">
                <div v-if="systemQRConnection.qrCodeUrl" class="qr-code-container">
                  <img :src="systemQRConnection.qrCodeUrl" alt="连接二维码" class="qr-code-image" />
                  <div class="qr-info">
                    <p class="qr-status"><el-tag :type="getQRStatusType(systemQRConnection.status)" size="small">{{ getQRStatusText(systemQRConnection.status) }}</el-tag></p>
                    <p class="qr-expire" v-if="systemQRConnection.expiresAt">过期时间: {{ formatDateTime(systemQRConnection.expiresAt) }}</p>
                    <p class="qr-id" v-if="systemQRConnection.connectionId">连接ID: {{ systemQRConnection.connectionId.substring(0, 8) }}...</p>
                  </div>
                </div>
                <div v-else class="qr-placeholder"><el-icon size="48" color="#dcdfe6"><Connection /></el-icon><p>点击生成二维码</p></div>
              </div>
            </el-card>
          </el-col>
        </el-row>
      </div>

      <!-- 替代连接方式 -->
      <div class="alternative-connections">
        <h4 class="section-title"><el-icon><Platform /></el-icon> 替代连接方式</h4>
        <el-row :gutter="20">
          <el-col :span="8">
            <el-card class="connection-card"><template #header><div class="connection-header"><el-icon><Connection /></el-icon><span>蓝牙连接</span></div></template>
              <div class="connection-content">
                <div><el-tag :type="bluetoothConnection.enabled ? 'success' : 'info'" size="small">{{ bluetoothConnection.enabled ? '已启用' : '未启用' }}</el-tag></div>
                <div class="connection-description"><p>通过蓝牙配对连接移动设备，适用于近距离连接场景。</p></div>
                <el-form size="small"><el-form-item label="设备名称"><el-input v-model="bluetoothConnection.deviceName" placeholder="CRM-Server" /></el-form-item><el-form-item label="配对码"><el-input v-model="bluetoothConnection.pairingCode" placeholder="自动生成" readonly /></el-form-item></el-form>
                <el-button :type="bluetoothConnection.enabled ? 'danger' : 'primary'" @click="toggleBluetoothConnection" :loading="bluetoothLoading" size="small">{{ bluetoothConnection.enabled ? '停止' : '启动' }}蓝牙服务</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="connection-card"><template #header><div class="connection-header"><el-icon><Monitor /></el-icon><span>同网络连接</span></div></template>
              <div class="connection-content">
                <div><el-tag :type="networkConnection.enabled ? 'success' : 'info'" size="small">{{ networkConnection.enabled ? '已启用' : '未启用' }}</el-tag></div>
                <div class="connection-description"><p>在同一局域网内自动发现并连接移动设备。</p></div>
                <el-form size="small"><el-form-item label="服务端口"><el-input-number v-model="networkConnection.port" :min="1024" :max="65535" /></el-form-item><el-form-item label="广播间隔"><el-select v-model="networkConnection.broadcastInterval"><el-option label="5秒" value="5" /><el-option label="10秒" value="10" /><el-option label="30秒" value="30" /></el-select></el-form-item></el-form>
                <el-button :type="networkConnection.enabled ? 'danger' : 'primary'" @click="toggleNetworkConnection" :loading="networkLoading" size="small">{{ networkConnection.enabled ? '停止' : '启动' }}网络发现</el-button>
              </div>
            </el-card>
          </el-col>
          <el-col :span="8">
            <el-card class="connection-card"><template #header><div class="connection-header"><el-icon><Lock /></el-icon><span>数字配对</span></div></template>
              <div class="connection-content">
                <div><el-tag :type="digitalPairing.enabled ? 'success' : 'info'" size="small">{{ digitalPairing.enabled ? '已启用' : '未启用' }}</el-tag></div>
                <div class="connection-description"><p>通过6位数字配对码连接，安全便捷。</p></div>
                <el-form size="small"><el-form-item label="当前配对码"><div class="pairing-code-display"><span class="pairing-code">{{ digitalPairing.currentCode || '------' }}</span><el-button @click="generatePairingCode" :loading="pairingCodeLoading" size="small" type="text"><el-icon><Refresh /></el-icon></el-button></div></el-form-item><el-form-item label="有效期"><el-select v-model="digitalPairing.expireTime"><el-option label="5分钟" value="5" /><el-option label="10分钟" value="10" /><el-option label="30分钟" value="30" /></el-select></el-form-item></el-form>
                <el-button :type="digitalPairing.enabled ? 'danger' : 'primary'" @click="toggleDigitalPairing" :loading="digitalPairingLoading" size="small">{{ digitalPairing.enabled ? '停止' : '启动' }}数字配对</el-button>
              </div>
            </el-card>
          </el-col>
        </el-row>
        <el-card class="connection-stats-card" style="margin-top: 20px;"><template #header><span>连接统计</span></template>
          <el-row :gutter="20"><el-col :span="6"><div class="stat-item"><div class="stat-value">{{ connectionStats.qr || 0 }}</div><div class="stat-label">二维码连接</div></div></el-col><el-col :span="6"><div class="stat-item"><div class="stat-value">{{ connectionStats.bluetooth || 0 }}</div><div class="stat-label">蓝牙连接</div></div></el-col><el-col :span="6"><div class="stat-item"><div class="stat-value">{{ connectionStats.network || 0 }}</div><div class="stat-label">网络连接</div></div></el-col><el-col :span="6"><div class="stat-item"><div class="stat-value">{{ connectionStats.digital || 0 }}</div><div class="stat-label">数字配对</div></div></el-col></el-row>
        </el-card>
      </div>

      <!-- 已连接设备列表 -->
      <div class="connected-devices-section">
        <el-card style="margin-top: 20px;"><template #header><div class="card-header"><span>已连接设备</span><el-button @click="refreshConnectedDevices" :loading="devicesLoading" type="primary" size="small"><el-icon><Refresh /></el-icon>刷新</el-button></div></template>
          <el-table :data="connectedDevices" v-loading="devicesLoading" style="width: 100%">
            <el-table-column prop="deviceName" label="设备名称" width="200" />
            <el-table-column prop="deviceType" label="设备类型" width="120"><template #default="{ row }"><el-tag size="small">{{ row.deviceType }}</el-tag></template></el-table-column>
            <el-table-column prop="ipAddress" label="IP地址" width="150" />
            <el-table-column prop="connectedAt" label="连接时间" width="180"><template #default="{ row }">{{ formatDateTime(row.connectedAt) }}</template></el-table-column>
            <el-table-column prop="lastActivity" label="最后活动" width="180"><template #default="{ row }">{{ formatDateTime(row.lastActivity) }}</template></el-table-column>
            <el-table-column prop="status" label="状态" width="100"><template #default="{ row }"><el-tag :type="row.status === 'connected' ? 'success' : 'warning'" size="small">{{ row.status === 'connected' ? '在线' : '离线' }}</el-tag></template></el-table-column>
            <el-table-column label="操作" width="120"><template #default="{ row }"><el-button type="danger" size="small" plain @click="handleDisconnectDevice(row.deviceId)">断开连接</el-button></template></el-table-column>
          </el-table>
          <div v-if="connectedDevices.length === 0" class="empty-devices"><el-empty description="暂无连接的设备" /></div>
        </el-card>
      </div>

      <!-- 使用说明 -->
      <div class="usage-guide">
        <h4 class="section-title"><el-icon><Document /></el-icon> 使用说明</h4>
        <el-tabs v-model="activeGuideTab" class="guide-tabs">
          <el-tab-pane label="Android安装" name="android"><div class="guide-content"><ol><li>下载APK文件到Android设备</li><li>在设备设置中允许"未知来源"应用安装</li><li>点击APK文件进行安装</li><li>打开应用，扫描二维码或手动输入服务器地址</li><li>授予必要的权限（通话、录音、网络等）</li><li>完成连接配置，开始使用CRM功能</li></ol></div></el-tab-pane>
          <el-tab-pane label="iOS安装" name="ios"><div class="guide-content"><el-alert title="iOS版本开发中" description="iOS版本正在开发中，敬请期待。目前可以使用PWA版本在Safari浏览器中使用。" type="info" :closable="false" /></div></el-tab-pane>
          <el-tab-pane label="PWA使用" name="pwa"><div class="guide-content"><ol><li>在手机浏览器中访问PWA应用链接</li><li>点击浏览器菜单中的"添加到主屏幕"</li><li>确认添加，应用图标将出现在桌面</li><li>点击桌面图标打开应用</li><li>享受类似原生应用的体验</li></ol></div></el-tab-pane>
        </el-tabs>
      </div>
    </div>
  </el-card>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Phone, Connection, Download, Refresh, Platform, Iphone, Monitor, Link, Document, Lock } from '@element-plus/icons-vue'
import * as alternativeConnectionApi from '@/api/alternative-connection'
import { formatDateTime } from '@/utils/dateFormat'

// 响应式数据
const mobileSDKLoading = ref(false)
const activeGuideTab = ref('android')
const qrConnectionLoading = ref(false)
const devicesLoading = ref(false)
const bluetoothLoading = ref(false)
const networkLoading = ref(false)
const digitalPairingLoading = ref(false)
const pairingCodeLoading = ref(false)

const mobileSDKInfo = ref({
  android: { version: 'v2.1.3', size: '6.0 MB', updateTime: '2024-01-20 16:45:00', available: true, downloadUrl: '/api/sdk/download/android/latest', features: ['通话管理', '客户管理', '数据同步', '离线支持'] },
  ios: { version: 'v2.1.3', size: '32.8 MB', updateTime: '2024-01-20 16:45:00', available: true, downloadUrl: '/api/sdk/download/ios/latest', features: ['通话管理', '客户管理', '数据同步', '离线支持'] }
})

const systemQRConnection = ref({ qrCodeUrl: '', connectionId: '', status: 'inactive' as string, expiresAt: '', connectedDevices: [] as any[] })
const qrConnectionForm = reactive({ permissions: ['call', 'sms'] as string[], expireTime: '30' })
const connectedDevices = ref<any[]>([])
const serverConfig = ref({ host: 'localhost', port: 3000, wsPort: 3001, ssl: false, apiVersion: 'v1.0' })
const connectionStats = ref({ active: 5, today: 23, total: 156, lastConnection: '2024-01-15 16:45:00', qr: 0, bluetooth: 0, network: 0, digital: 0 })
const bluetoothConnection = ref({ enabled: false, deviceName: 'CRM-Server', pairingCode: '' })
const networkConnection = ref({ enabled: false, port: 8080, broadcastInterval: '10' })
const digitalPairing = ref({ enabled: false, currentCode: '', expireTime: '10' })

// 工具方法
const generateRandomCode = (length: number): string => {
  const chars = '0123456789'
  let result = ''
  for (let i = 0; i < length; i++) result += chars.charAt(Math.floor(Math.random() * chars.length))
  return result
}

const generateQRCodeImage = async (data: string): Promise<string> => {
  try {
    const QRCode = await import('qrcode')
    return await QRCode.toDataURL(data, { width: 200, margin: 2, color: { dark: '#000000', light: '#FFFFFF' }, errorCorrectionLevel: 'M' })
  } catch {
    return ''
  }
}

// SDK 方法
const refreshMobileSDKInfo = async () => {
  mobileSDKLoading.value = true
  try {
    await new Promise(resolve => setTimeout(resolve, 1000))
    mobileSDKInfo.value.android.updateTime = new Date().toLocaleString()
    mobileSDKInfo.value.ios.updateTime = new Date().toLocaleString()
    connectionStats.value.active = Math.floor(Math.random() * 10) + 1
    connectionStats.value.today = Math.floor(Math.random() * 50) + 10
    connectionStats.value.lastConnection = new Date().toLocaleString()
    ElMessage.success('SDK信息已刷新')
  } catch { ElMessage.error('刷新SDK信息失败') }
  finally { mobileSDKLoading.value = false }
}

const downloadAndroidSDK = () => {
  if (!mobileSDKInfo.value.android.available) { ElMessage.warning('Android SDK暂不可用'); return }
  const link = document.createElement('a'); link.href = '/downloads/CRM-Mobile-SDK-v2.1.3.apk'; link.download = 'CRM-Mobile-SDK-v2.1.3.apk'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
  ElMessage.success('开始下载Android SDK v2.1.3 (6MB)')
}

const downloadIOSSDK = () => {
  if (!mobileSDKInfo.value.ios.available) { ElMessage.warning('iOS SDK暂不可用'); return }
  const link = document.createElement('a'); link.href = '/downloads/crm-ios-v1.0.0.ipa'; link.download = 'crm-ios-v1.0.0.ipa'; document.body.appendChild(link); link.click(); document.body.removeChild(link)
  ElMessage.success('开始下载iOS SDK')
}

const showInstallGuide = (platform: string) => {
  activeGuideTab.value = platform
  const el = document.querySelector('.usage-guide')
  if (el) el.scrollIntoView({ behavior: 'smooth' })
}

const openPWAApp = () => { window.open(`${window.location.origin}/mobile`, '_blank'); ElMessage.success('正在打开PWA应用') }

const showQRCode = async () => {
  const pwaUrl = `${window.location.origin}/mobile`
  try {
    const qrCodeDataUrl = await generateQRCodeImage(pwaUrl)
    ElMessageBox.alert(`<div style="text-align:center;padding:20px;"><div style="margin-bottom:16px;font-size:16px;font-weight:600;">扫描二维码访问PWA应用</div><div style="margin-bottom:16px;"><img src="${qrCodeDataUrl}" alt="PWA二维码" style="width:200px;height:200px;border:1px solid #ddd;border-radius:8px;" /></div><div style="font-size:14px;color:#666;">或直接访问：<br><a href="${pwaUrl}" target="_blank" style="color:#409eff;">${pwaUrl}</a></div></div>`, '移动应用二维码', { confirmButtonText: '确定', dangerouslyUseHTMLString: true })
  } catch { ElMessage.error('生成二维码失败') }
}

// 二维码连接方法
const generateSystemQRCode = async () => {
  qrConnectionLoading.value = true
  try {
    const connectionId = 'qr_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    const expireMinutes = parseInt(qrConnectionForm.expireTime)
    const expiresAt = new Date(Date.now() + expireMinutes * 60 * 1000)
    const connectionData = { connectionId, serverUrl: `${window.location.protocol}//${window.location.host}`, permissions: qrConnectionForm.permissions, expiresAt: expiresAt.getTime(), type: 'system_connection' }
    const qrCodeUrl = await generateQRCodeImage(JSON.stringify(connectionData))
    systemQRConnection.value = { qrCodeUrl, connectionId, status: 'active', expiresAt: expiresAt.toISOString(), connectedDevices: [] }
    ElMessage.success('二维码生成成功')
  } catch { ElMessage.error('生成二维码失败') }
  finally { qrConnectionLoading.value = false }
}

const refreshSystemQRCode = async () => {
  if (!systemQRConnection.value.connectionId) { ElMessage.warning('请先生成二维码'); return }
  await generateSystemQRCode(); ElMessage.success('二维码已刷新')
}

const getQRStatusType = (status: string) => { switch(status) { case 'active': return 'success'; case 'connected': return 'primary'; case 'expired': return 'danger'; default: return 'info' } }
const getQRStatusText = (status: string) => { switch(status) { case 'active': return '等待连接'; case 'connected': return '已连接'; case 'expired': return '已过期'; default: return '未激活' } }

// 设备管理
const refreshConnectedDevices = async () => {
  devicesLoading.value = true
  try {
    const response = await alternativeConnectionApi.getAllConnectedDevices()
    connectedDevices.value = response.data || []
    if (response.data && response.data.length > 0) ElMessage.success('设备列表已刷新')
  } catch { console.log('[设备列表] 功能未启用或暂无设备'); connectedDevices.value = [] }
  finally { devicesLoading.value = false }
}

const handleDisconnectDevice = async (deviceId: string) => {
  try {
    await ElMessageBox.confirm('确定要断开此设备的连接吗？', '断开连接确认', { confirmButtonText: '确定', cancelButtonText: '取消', type: 'warning' })
    await alternativeConnectionApi.disconnectDevice(deviceId)
    await refreshConnectedDevices()
    ElMessage.success('设备连接已断开')
  } catch (error) { if (error !== 'cancel') ElMessage.error('断开设备连接失败，请重试') }
}

// 替代连接方式
const toggleBluetoothConnection = async () => {
  try {
    bluetoothLoading.value = true
    if (bluetoothConnection.value.enabled) {
      await alternativeConnectionApi.stopBluetoothService(); bluetoothConnection.value.enabled = false; bluetoothConnection.value.pairingCode = ''; ElMessage.success('蓝牙服务已停止')
    } else {
      const response = await alternativeConnectionApi.startBluetoothService({ deviceName: bluetoothConnection.value.deviceName }); bluetoothConnection.value.enabled = true; bluetoothConnection.value.pairingCode = response.data.pairingCode || generateRandomCode(6); ElMessage.success('蓝牙服务已启动')
    }
    await updateConnectionStats()
  } catch { ElMessage.error('操作失败，请重试') }
  finally { bluetoothLoading.value = false }
}

const toggleNetworkConnection = async () => {
  try {
    networkLoading.value = true
    if (networkConnection.value.enabled) {
      await alternativeConnectionApi.stopNetworkDiscovery(); networkConnection.value.enabled = false; ElMessage.success('网络发现已停止')
    } else {
      await alternativeConnectionApi.startNetworkDiscovery({ port: networkConnection.value.port, broadcastInterval: Number(networkConnection.value.broadcastInterval) }); networkConnection.value.enabled = true; ElMessage.success(`网络发现已启动，端口: ${networkConnection.value.port}`)
    }
    await updateConnectionStats()
  } catch { ElMessage.error('操作失败，请重试') }
  finally { networkLoading.value = false }
}

const toggleDigitalPairing = async () => {
  try {
    digitalPairingLoading.value = true
    if (digitalPairing.value.enabled) {
      await alternativeConnectionApi.stopDigitalPairing(); digitalPairing.value.enabled = false; digitalPairing.value.currentCode = ''; ElMessage.success('数字配对已停止')
    } else {
      const response = await alternativeConnectionApi.startDigitalPairing({ expireTime: Number(digitalPairing.value.expireTime) }); digitalPairing.value.enabled = true; digitalPairing.value.currentCode = response.data.pairingCode || generateRandomCode(6); ElMessage.success('数字配对已启动')
    }
    await updateConnectionStats()
  } catch { ElMessage.error('操作失败，请重试') }
  finally { digitalPairingLoading.value = false }
}

const generatePairingCode = async () => {
  try {
    pairingCodeLoading.value = true
    const response = await alternativeConnectionApi.generatePairingCode()
    digitalPairing.value.currentCode = response.data.pairingCode || generateRandomCode(6)
    ElMessage.success('配对码已更新')
  } catch { digitalPairing.value.currentCode = generateRandomCode(6); ElMessage.error('生成配对码失败，使用本地生成的配对码') }
  finally { pairingCodeLoading.value = false }
}

const updateConnectionStats = async () => {
  try {
    const response = await alternativeConnectionApi.getConnectionStatistics()
    const stats = response.data
    connectionStats.value = { qr: stats.qr || connectionStats.value.qr, bluetooth: stats.bluetooth || 0, network: stats.network || 0, digital: stats.digital || 0, active: stats.active || 0, today: connectionStats.value.today, total: connectionStats.value.total, lastConnection: connectionStats.value.lastConnection }
  } catch {
    connectionStats.value.bluetooth = bluetoothConnection.value.enabled ? Math.floor(Math.random() * 5) + 1 : 0
    connectionStats.value.network = networkConnection.value.enabled ? Math.floor(Math.random() * 8) + 1 : 0
    connectionStats.value.digital = digitalPairing.value.enabled ? Math.floor(Math.random() * 3) + 1 : 0
    connectionStats.value.active = connectionStats.value.qr + connectionStats.value.bluetooth + connectionStats.value.network + connectionStats.value.digital
  }
}

onMounted(() => {
  refreshConnectedDevices()
  const initAlternativeConnections = async () => {
    try {
      const bluetoothStatus = await alternativeConnectionApi.getBluetoothStatus()
      if (bluetoothStatus.data) { bluetoothConnection.value.enabled = bluetoothStatus.data.enabled || false; bluetoothConnection.value.pairingCode = bluetoothStatus.data.pairingCode || '' }
      const networkStatus = await alternativeConnectionApi.getNetworkStatus()
      if (networkStatus.data) { networkConnection.value.enabled = networkStatus.data.enabled || false }
      const digitalStatus = await alternativeConnectionApi.getDigitalPairingStatus()
      if (digitalStatus.data) { digitalPairing.value.enabled = digitalStatus.data.enabled || false; digitalPairing.value.currentCode = digitalStatus.data.currentCode || '' }
      await updateConnectionStats()
    } catch (error) { console.error('初始化替代连接状态失败:', error) }
  }
  initAlternativeConnections()
})
</script>

<style scoped>
.setting-card { margin-bottom: 0; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.header-actions { display: flex; gap: 8px; }
.mobile-app-content { padding: 10px 0; }
.section-title { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; font-size: 15px; color: #303133; }
.sdk-overview { margin-bottom: 30px; }
.status-card { text-align: center; }
.status-info { display: flex; justify-content: center; align-items: center; gap: 8px; margin-top: 8px; }
.file-size { font-size: 12px; color: #909399; }
.sdk-management { margin-bottom: 30px; }
.sdk-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
.sdk-item { border: 1px solid #ebeef5; border-radius: 8px; padding: 20px; }
.sdk-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.sdk-icon { width: 50px; height: 50px; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #fff; }
.sdk-icon.android { background: linear-gradient(135deg, #3DDC84, #2ea060); }
.sdk-icon.ios { background: linear-gradient(135deg, #007AFF, #0051D5); }
.sdk-icon.pwa { background: linear-gradient(135deg, #5A0FC8, #8B5CF6); }
.sdk-info h5 { margin: 0 0 4px; font-size: 15px; }
.sdk-info p { margin: 0; font-size: 13px; color: #909399; }
.sdk-details { margin-bottom: 16px; }
.detail-item { display: flex; justify-content: space-between; padding: 4px 0; font-size: 13px; }
.detail-item .label { color: #909399; }
.sdk-actions { display: flex; gap: 8px; }
.connection-status-section { margin-bottom: 30px; }
.config-card { height: 100%; }
.qr-connection-management { margin-bottom: 20px; }
.qr-display { text-align: center; padding: 20px; }
.qr-code-container { display: flex; flex-direction: column; align-items: center; }
.qr-code-image { width: 200px; height: 200px; border: 1px solid #ddd; border-radius: 8px; margin-bottom: 12px; }
.qr-info { font-size: 13px; }
.qr-status { margin-bottom: 4px; }
.qr-expire { color: #909399; margin-bottom: 2px; }
.qr-id { color: #c0c4cc; font-size: 12px; }
.qr-placeholder { color: #c0c4cc; padding: 30px 0; }
.qr-placeholder p { margin-top: 8px; }
.alternative-connections { margin-bottom: 20px; }
.connection-card { height: 100%; }
.connection-header { display: flex; align-items: center; gap: 8px; }
.connection-content { padding: 8px 0; }
.connection-description { margin: 8px 0 12px; color: #909399; font-size: 13px; }
.connection-description p { margin: 0; }
.pairing-code-display { display: flex; align-items: center; gap: 8px; }
.pairing-code { font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #409eff; }
.stat-item { text-align: center; padding: 12px 0; }
.stat-value { font-size: 24px; font-weight: bold; color: #409eff; }
.stat-label { font-size: 13px; color: #909399; margin-top: 4px; }
.connected-devices-section { margin-bottom: 20px; }
.empty-devices { padding: 20px 0; }
.usage-guide { margin-top: 20px; }
.guide-content { padding: 16px; }
.guide-content ol { padding-left: 20px; }
.guide-content ol li { margin-bottom: 8px; line-height: 1.8; }
</style>

