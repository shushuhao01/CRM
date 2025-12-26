<template>
  <div class="api-management">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #409eff;">
              <el-icon><Connection /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.interfaces.enabled }}/{{ stats.interfaces.total }}</div>
              <div class="stat-label">启用接口</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #67c23a;">
              <el-icon><Cellphone /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.devices.online }}/{{ stats.devices.total }}</div>
              <div class="stat-label">在线设备</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #e6a23c;">
              <el-icon><DataLine /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.today.calls }}</div>
              <div class="stat-label">今日调用</div>
            </div>
          </div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card class="stat-card">
          <div class="stat-item">
            <div class="stat-icon" style="background: #f56c6c;">
              <el-icon><Timer /></el-icon>
            </div>
            <div class="stat-content">
              <div class="stat-value">{{ stats.today.avgResponseTime }}ms</div>
              <div class="stat-label">平均响应</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 接口列表 -->
    <el-card class="main-card">
      <template #header>
        <div class="card-header">
          <span>APP对接接口</span>
          <div class="header-actions">
            <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
            <el-button type="primary" :icon="Document" @click="showApiDoc">查看文档</el-button>
          </div>
        </div>
      </template>

      <el-table :data="interfaces" v-loading="loading" stripe>
        <el-table-column prop="name" label="接口名称" width="180">
          <template #default="{ row }">
            <div class="interface-name">
              <el-tag :type="getMethodTagType(row.method)" size="small" style="margin-right: 8px;">
                {{ row.method }}
              </el-tag>
              {{ row.name }}
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="endpoint" label="接口地址" min-width="200">
          <template #default="{ row }">
            <el-tooltip :content="row.endpoint" placement="top">
              <code class="endpoint-code">{{ row.endpoint }}</code>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column prop="isEnabled" label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-switch
              v-model="row.isEnabled"
              @change="handleStatusChange(row)"
              :loading="row.updating"
            />
          </template>
        </el-table-column>
        <el-table-column prop="callCount" label="调用次数" width="100" align="center">
          <template #default="{ row }">
            <span>{{ formatNumber(row.callCount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="successRate" label="成功率" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getSuccessRateType(row.successRate)" size="small">
              {{ row.successRate }}%
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="avgResponseTime" label="响应时间" width="100" align="center">
          <template #default="{ row }">
            <span :class="getResponseTimeClass(row.avgResponseTime)">
              {{ row.avgResponseTime }}ms
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="lastCalledAt" label="最后调用" width="160">
          <template #default="{ row }">
            <span v-if="row.lastCalledAt">{{ formatDateTime(row.lastCalledAt) }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="150" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="showLogs(row)">
              日志
            </el-button>
            <el-button type="warning" link size="small" @click="resetStats(row)">
              重置
            </el-button>
            <el-button type="info" link size="small" @click="showDetail(row)">
              详情
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 接口详情弹窗 -->
    <el-dialog v-model="detailVisible" title="接口详情" width="600px">
      <el-descriptions :column="2" border v-if="currentInterface">
        <el-descriptions-item label="接口编码">{{ currentInterface.code }}</el-descriptions-item>
        <el-descriptions-item label="接口名称">{{ currentInterface.name }}</el-descriptions-item>
        <el-descriptions-item label="请求方法">
          <el-tag :type="getMethodTagType(currentInterface.method)">{{ currentInterface.method }}</el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="接口地址">{{ currentInterface.endpoint }}</el-descriptions-item>
        <el-descriptions-item label="是否启用">
          <el-tag :type="currentInterface.isEnabled ? 'success' : 'danger'">
            {{ currentInterface.isEnabled ? '启用' : '停用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="需要认证">
          <el-tag :type="currentInterface.authRequired ? 'warning' : 'info'">
            {{ currentInterface.authRequired ? '是' : '否' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="频率限制">{{ currentInterface.rateLimit }} 次/分钟</el-descriptions-item>
        <el-descriptions-item label="调用次数">{{ formatNumber(currentInterface.callCount) }}</el-descriptions-item>
        <el-descriptions-item label="成功次数">{{ formatNumber(currentInterface.successCount) }}</el-descriptions-item>
        <el-descriptions-item label="失败次数">{{ formatNumber(currentInterface.failCount) }}</el-descriptions-item>
        <el-descriptions-item label="成功率">{{ currentInterface.successRate }}%</el-descriptions-item>
        <el-descriptions-item label="平均响应">{{ currentInterface.avgResponseTime }}ms</el-descriptions-item>
        <el-descriptions-item label="接口描述" :span="2">{{ currentInterface.description || '-' }}</el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <el-button @click="detailVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 调用日志弹窗 -->
    <el-dialog v-model="logsVisible" title="调用日志" width="900px">
      <el-table :data="logs" v-loading="logsLoading" max-height="400">
        <el-table-column prop="createdAt" label="时间" width="160">
          <template #default="{ row }">{{ formatDateTime(row.createdAt) }}</template>
        </el-table-column>
        <el-table-column prop="method" label="方法" width="80">
          <template #default="{ row }">
            <el-tag :type="getMethodTagType(row.method)" size="small">{{ row.method }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responseCode" label="状态码" width="80" align="center">
          <template #default="{ row }">
            <el-tag :type="row.responseCode === 200 ? 'success' : 'danger'" size="small">
              {{ row.responseCode }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="responseTime" label="响应时间" width="100" align="center">
          <template #default="{ row }">{{ row.responseTime }}ms</template>
        </el-table-column>
        <el-table-column prop="clientIp" label="客户端IP" width="130" />
        <el-table-column prop="errorMessage" label="错误信息" min-width="200">
          <template #default="{ row }">
            <span v-if="row.errorMessage" class="error-text">{{ row.errorMessage }}</span>
            <span v-else class="text-muted">-</span>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-wrapper" v-if="logsPagination.total > 0">
        <el-pagination
          v-model:current-page="logsPagination.page"
          v-model:page-size="logsPagination.pageSize"
          :total="logsPagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="loadLogs"
          @current-change="loadLogs"
        />
      </div>
    </el-dialog>

    <!-- API文档弹窗 -->
    <el-dialog v-model="docVisible" title="API接口文档" width="800px" top="5vh">
      <div class="api-doc-content">
        <el-alert type="info" :closable="false" style="margin-bottom: 16px;">
          <template #title>
            接口基础地址：<code>{{ apiBaseUrl }}</code>
          </template>
        </el-alert>

        <el-collapse v-model="activeDoc">
          <el-collapse-item title="1. APP登录" name="login">
            <div class="doc-section">
              <p><strong>接口：</strong><code>POST /api/v1/mobile/login</code></p>
              <p><strong>说明：</strong>APP用户登录认证</p>
              <p><strong>请求参数：</strong></p>
              <pre>{{ loginDocRequest }}</pre>
              <p><strong>响应示例：</strong></p>
              <pre>{{ loginDocResponse }}</pre>
            </div>
          </el-collapse-item>
          <el-collapse-item title="2. 生成绑定二维码" name="qrcode">
            <div class="doc-section">
              <p><strong>接口：</strong><code>POST /api/v1/mobile/bindQRCode</code></p>
              <p><strong>说明：</strong>PC端生成设备绑定二维码</p>
              <p><strong>需要认证：</strong>是</p>
            </div>
          </el-collapse-item>
          <el-collapse-item title="3. 扫码绑定设备" name="bind">
            <div class="doc-section">
              <p><strong>接口：</strong><code>POST /api/v1/mobile/bind</code></p>
              <p><strong>说明：</strong>APP扫码后调用此接口完成绑定</p>
            </div>
          </el-collapse-item>
          <el-collapse-item title="4. WebSocket通信" name="websocket">
            <div class="doc-section">
              <p><strong>地址：</strong><code>wss://your-domain/ws/mobile?token=xxx</code></p>
              <p><strong>说明：</strong>APP与服务器实时通信，接收拨号指令</p>
            </div>
          </el-collapse-item>
        </el-collapse>

        <el-divider />
        <p style="text-align: center;">
          <el-button type="primary" @click="downloadDoc">下载完整文档</el-button>
        </p>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Connection, Cellphone, DataLine, Timer, Refresh, Document } from '@element-plus/icons-vue'
import { getApiInterfaces, updateApiInterface, getApiCallLogs, getApiStats, resetApiStats } from '@/api/apiInterface'

// 状态
const loading = ref(false)
const interfaces = ref<any[]>([])
const stats = reactive({
  interfaces: { total: 0, enabled: 0, disabled: 0 },
  calls: { total: 0, success: 0, fail: 0, successRate: 0 },
  today: { calls: 0, success: 0, avgResponseTime: 0 },
  devices: { total: 0, online: 0 }
})

// 详情弹窗
const detailVisible = ref(false)
const currentInterface = ref<any>(null)

// 日志弹窗
const logsVisible = ref(false)
const logsLoading = ref(false)
const logs = ref<any[]>([])
const logsPagination = reactive({
  page: 1,
  pageSize: 20,
  total: 0
})
const currentLogCode = ref('')

// 文档弹窗
const docVisible = ref(false)
const activeDoc = ref(['login'])

const apiBaseUrl = computed(() => {
  return window.location.origin
})

// 文档示例
const loginDocRequest = `{
  "username": "zhangsan",
  "password": "123456",
  "deviceInfo": {
    "deviceId": "设备唯一标识",
    "deviceName": "iPhone 15 Pro",
    "osType": "ios",
    "appVersion": "1.0.0"
  }
}`

const loginDocResponse = `{
  "success": true,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "expiresIn": 604800,
    "user": {
      "id": "user_001",
      "username": "zhangsan",
      "realName": "张三"
    }
  }
}`

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const [interfacesData, statsData] = await Promise.all([
      getApiInterfaces().catch(err => {
        console.error('获取接口列表失败:', err)
        return []
      }),
      getApiStats().catch(err => {
        console.error('获取统计数据失败:', err)
        return null
      })
    ])

    // request.ts 响应拦截器返回的是 response.data.data，所以这里直接就是数据
    interfaces.value = Array.isArray(interfacesData) ? interfacesData : []

    if (statsData) {
      Object.assign(stats, statsData)
    }
  } catch (error) {
    console.error('加载数据失败:', error)
    ElMessage.error('加载数据失败，请刷新重试')
  } finally {
    loading.value = false
  }
}

// 状态变更
const handleStatusChange = async (row: any) => {
  row.updating = true
  try {
    await updateApiInterface(row.id, { isEnabled: row.isEnabled })
    ElMessage.success(row.isEnabled ? '接口已启用' : '接口已停用')
  } catch (_error) {
    row.isEnabled = !row.isEnabled
    ElMessage.error('操作失败')
  } finally {
    row.updating = false
  }
}

// 显示详情
const showDetail = (row: any) => {
  currentInterface.value = row
  detailVisible.value = true
}

// 显示日志
const showLogs = async (row: any) => {
  currentLogCode.value = row.code
  logsPagination.page = 1
  logsVisible.value = true
  await loadLogs()
}

// 加载日志
const loadLogs = async () => {
  logsLoading.value = true
  try {
    const data = await getApiCallLogs({
      interfaceCode: currentLogCode.value,
      page: logsPagination.page,
      pageSize: logsPagination.pageSize
    })
    if (data) {
      logs.value = data.logs || []
      logsPagination.total = data.total || 0
    }
  } catch (_error) {
    console.error('加载日志失败')
  } finally {
    logsLoading.value = false
  }
}

// 重置统计
const resetStats = async (row: any) => {
  try {
    await ElMessageBox.confirm('确定要重置该接口的统计数据吗？', '提示', {
      type: 'warning'
    })
    await resetApiStats(row.id)
    ElMessage.success('统计已重置')
    loadData()
  } catch (_error) {
    // 取消操作或失败
  }
}

// 显示API文档
const showApiDoc = () => {
  docVisible.value = true
}

// 下载文档
const downloadDoc = () => {
  // 使用fetch下载并设置正确编码
  fetch('/docs/APP接口文档.md')
    .then(res => res.blob())
    .then(blob => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'APP接口文档.md'
      a.click()
      URL.revokeObjectURL(url)
    })
    .catch(() => {
      ElMessage.warning('文档下载失败，请联系管理员')
    })
}

// 格式化数字
const formatNumber = (num: number) => {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + 'w'
  }
  return num.toString()
}

// 格式化时间
const formatDateTime = (dateStr: string) => {
  if (!dateStr) return '-'
  const date = new Date(dateStr)
  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
}

// 获取方法标签类型
const getMethodTagType = (method: string): '' | 'success' | 'warning' | 'info' | 'danger' => {
  const types: Record<string, '' | 'success' | 'warning' | 'info' | 'danger'> = {
    GET: 'success',
    POST: '',
    PUT: 'warning',
    DELETE: 'danger',
    WS: 'info'
  }
  return types[method] || 'info'
}

// 获取成功率标签类型
const getSuccessRateType = (rate: number): '' | 'success' | 'warning' | 'danger' => {
  if (rate >= 99) return 'success'
  if (rate >= 95) return 'warning'
  return 'danger'
}

// 获取响应时间样式
const getResponseTimeClass = (time: number) => {
  if (time <= 100) return 'response-fast'
  if (time <= 500) return 'response-normal'
  return 'response-slow'
}

onMounted(() => {
  loadData()
})
</script>

<style scoped>
.api-management {
  padding: 20px;
}

.stats-row {
  margin-bottom: 20px;
}

.stat-card {
  height: 100%;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 16px;
}

.stat-icon {
  width: 48px;
  height: 48px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 24px;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.stat-label {
  font-size: 14px;
  color: #909399;
  margin-top: 4px;
}

.main-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-actions {
  display: flex;
  gap: 10px;
}

.interface-name {
  display: flex;
  align-items: center;
}

.endpoint-code {
  font-family: 'Consolas', 'Monaco', monospace;
  font-size: 12px;
  color: #409eff;
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 4px;
}

.text-muted {
  color: #909399;
}

.error-text {
  color: #f56c6c;
  font-size: 12px;
}

.response-fast {
  color: #67c23a;
}

.response-normal {
  color: #e6a23c;
}

.response-slow {
  color: #f56c6c;
}

.pagination-wrapper {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
}

.api-doc-content {
  max-height: 60vh;
  overflow-y: auto;
}

.doc-section {
  padding: 10px 0;
}

.doc-section p {
  margin: 8px 0;
}

.doc-section pre {
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  font-size: 12px;
  overflow-x: auto;
}

.doc-section code {
  background: #f0f9ff;
  padding: 2px 6px;
  border-radius: 4px;
  color: #409eff;
}
</style>
