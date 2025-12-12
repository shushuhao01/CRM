<template>
  <div class="recording-management">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><VideoPlay /></el-icon>
          录音管理
        </h1>
        <p class="page-description">管理和播放通话录音，支持在线播放、下载和分享</p>
      </div>

      <div class="header-actions">
        <el-button @click="batchDownload" :disabled="!selectedRecordings.length">
          <el-icon><Download /></el-icon>
          批量下载
        </el-button>
        <el-button @click="exportList" :loading="exportLoading">
          <el-icon><Document /></el-icon>
          导出列表
        </el-button>
        <el-button @click="refreshRecordings" :loading="loading">
          <el-icon><Refresh /></el-icon>
          刷新
        </el-button>
      </div>
    </div>

    <!-- 统计概览 -->
    <div class="overview-section">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon total">
                <el-icon><Headset /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.totalRecordings || 0 }}</div>
                <div class="overview-label">总录音数</div>
                <div class="overview-change">
                  <span class="change-text">{{ formatFileSize(overview.totalSize || 0) }}</span>
                  <span class="change-label">总大小</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon today">
                <el-icon><Calendar /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.todayRecordings || 0 }}</div>
                <div class="overview-label">今日录音</div>
                <div class="overview-change">
                  <span class="change-text positive">+{{ overview.todayIncrease || 0 }}</span>
                  <span class="change-label">较昨日</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon duration">
                <el-icon><Timer /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ formatDuration(overview.totalDuration || 0) }}</div>
                <div class="overview-label">总时长</div>
                <div class="overview-change">
                  <span class="change-text">{{ formatDuration(overview.avgDuration || 0) }}</span>
                  <span class="change-label">平均时长</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>

        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon quality">
                <el-icon><Star /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.avgQuality || 0 }}%</div>
                <div class="overview-label">平均质量</div>
                <div class="overview-change">
                  <span class="change-text">{{ overview.highQualityCount || 0 }}</span>
                  <span class="change-label">高质量录音</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 搜索和筛选 -->
    <div class="search-section">
      <el-card>
        <el-form :model="searchForm" inline>
          <el-form-item label="录音状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="正常" value="normal" />
              <el-option label="处理中" value="processing" />
              <el-option label="损坏" value="corrupted" />
              <el-option label="已删除" value="deleted" />
            </el-select>
          </el-form-item>

          <el-form-item label="录音质量">
            <el-select
              v-model="searchForm.quality"
              placeholder="请选择质量"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="高质量" value="high" />
              <el-option label="中等质量" value="medium" />
              <el-option label="低质量" value="low" />
            </el-select>
          </el-form-item>

          <el-form-item label="客户信息">
            <el-input
              v-model="searchForm.customerInfo"
              placeholder="客户姓名/电话"
              clearable
              style="width: 200px;"
            />
          </el-form-item>

          <el-form-item label="录音时间">
            <el-date-picker
              v-model="searchForm.dateRange"
              type="datetimerange"
              range-separator="至"
              start-placeholder="开始时间"
              end-placeholder="结束时间"
              format="YYYY-MM-DD HH:mm"
              value-format="YYYY-MM-DD HH:mm:ss"
              style="width: 320px;"
            />
          </el-form-item>

          <el-form-item label="录音人员">
            <el-select
              v-model="searchForm.userId"
              placeholder="请选择人员"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option
                v-for="user in salesPersonList"
                :key="user.id"
                :label="user.name"
                :value="user.id"
              />
            </el-select>
          </el-form-item>

          <el-form-item label="时长筛选">
            <el-select
              v-model="searchForm.durationRange"
              placeholder="请选择时长"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="30秒以下" value="0-30" />
              <el-option label="30秒-2分钟" value="30-120" />
              <el-option label="2-5分钟" value="120-300" />
              <el-option label="5分钟以上" value="300+" />
            </el-select>
          </el-form-item>

          <el-form-item>
            <el-button type="primary" @click="handleSearch">
              <el-icon><Search /></el-icon>
              搜索
            </el-button>
            <el-button @click="resetSearch">重置</el-button>
          </el-form-item>
        </el-form>
      </el-card>
    </div>

    <!-- 录音播放器 -->
    <div class="player-section" v-if="currentPlaying">
      <el-card>
        <template #header>
          <div class="player-header">
            <span>正在播放：{{ currentPlaying.customerName }} - {{ formatDateTime(currentPlaying.startTime) }}</span>
            <el-button text @click="closePlayer">
              <el-icon><Close /></el-icon>
            </el-button>
          </div>
        </template>

        <div class="audio-player">
          <audio
            ref="audioPlayer"
            controls
            autoplay
            style="width: 100%;"
            :src="currentPlaying.recordingUrl"
            @loadedmetadata="onAudioLoaded"
            @timeupdate="onTimeUpdate"
            @ended="onAudioEnded"
          >
            您的浏览器不支持音频播放
          </audio>

          <div class="player-info">
            <div class="player-details">
              <div class="detail-item">
                <span class="detail-label">客户：</span>
                <span class="detail-value">{{ currentPlaying.customerName }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">电话：</span>
                <span class="detail-value">{{ displaySensitiveInfoNew(currentPlaying.customerPhone, SensitiveInfoType.PHONE) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">时长：</span>
                <span class="detail-value">{{ formatDuration(currentPlaying.duration) }}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">质量：</span>
                <el-rate
                  :model-value="currentPlaying.quality?.score || 0"
                  disabled
                  size="small"
                />
              </div>
            </div>

            <div class="player-actions">
              <el-button size="small" @click="downloadRecording(currentPlaying)">
                <el-icon><Download /></el-icon>
                下载
              </el-button>
              <el-button size="small" @click="shareRecording(currentPlaying)">
                <el-icon><Share /></el-icon>
                分享
              </el-button>
              <el-button size="small" @click="addToPlaylist(currentPlaying)">
                <el-icon><Plus /></el-icon>
                添加到播放列表
              </el-button>
            </div>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 数据表格 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <div class="table-header">
            <span>录音列表 (共 {{ total }} 条)</span>
            <div class="table-actions">
              <el-button
                size="small"
                :disabled="!selectedRecordings.length"
                @click="batchDownload"
              >
                批量下载
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedRecordings.length"
                @click="batchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
        </template>

        <el-table
          :data="recordings"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          row-key="id"
        >
          <el-table-column type="selection" width="55" />

          <el-table-column prop="customerName" label="客户姓名" width="120">
            <template #default="{ row }">
              <el-button text @click="viewCustomerDetail(row.customerId)">
                {{ row.customerName || '未知客户' }}
              </el-button>
            </template>
          </el-table-column>

          <el-table-column prop="customerPhone" label="客户电话" width="140">
            <template #default="{ row }">
              {{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}
            </template>
          </el-table-column>

          <el-table-column prop="userName" label="录音人员" width="100" />

          <el-table-column prop="startTime" label="录音时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.startTime) }}
            </template>
          </el-table-column>

          <el-table-column prop="duration" label="录音时长" width="100" sortable>
            <template #default="{ row }">
              <span :class="getDurationClass(row.duration)">
                {{ formatDuration(row.duration) }}
              </span>
            </template>
          </el-table-column>

          <el-table-column prop="fileSize" label="文件大小" width="100" sortable>
            <template #default="{ row }">
              {{ formatFileSize(row.fileSize) }}
            </template>
          </el-table-column>

          <el-table-column prop="quality" label="录音质量" width="120">
            <template #default="{ row }">
              <div v-if="row.quality" class="quality-info">
                <el-rate
                  :model-value="row.quality.score"
                  disabled
                  size="small"
                />
                <span class="quality-text">{{ getQualityText(row.quality.score) }}</span>
              </div>
              <span v-else style="color: #C0C4CC;">未评分</span>
            </template>
          </el-table-column>

          <el-table-column prop="status" label="状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="format" label="格式" width="80">
            <template #default="{ row }">
              <el-tag size="small" effect="plain">
                {{ row.format?.toUpperCase() || 'MP3' }}
              </el-tag>
            </template>
          </el-table-column>

          <el-table-column prop="downloadCount" label="下载次数" width="100" sortable />

          <el-table-column label="操作" width="250" fixed="right">
            <template #default="{ row }">
              <el-button
                text
                size="small"
                @click="playRecording(row)"
                :disabled="row.status !== 'normal'"
              >
                <el-icon><VideoPlay /></el-icon>
                播放
              </el-button>

              <el-button text size="small" @click="downloadRecording(row)">
                <el-icon><Download /></el-icon>
                下载
              </el-button>

              <el-button text size="small" @click="viewWaveform(row)">
                <el-icon><TrendCharts /></el-icon>
                波形
              </el-button>

              <el-dropdown>
                <el-button text size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="shareRecording(row)">
                      <el-icon><Share /></el-icon>
                      分享录音
                    </el-dropdown-item>
                    <el-dropdown-item @click="convertFormat(row)">
                      <el-icon><Switch /></el-icon>
                      格式转换
                    </el-dropdown-item>
                    <el-dropdown-item @click="editRecording(row)">
                      <el-icon><Edit /></el-icon>
                      编辑信息
                    </el-dropdown-item>
                    <el-dropdown-item @click="viewAnalysis(row)">
                      <el-icon><DataAnalysis /></el-icon>
                      质量分析
                    </el-dropdown-item>
                    <el-dropdown-item @click="deleteRecording(row)" divided>
                      <el-icon><Delete /></el-icon>
                      删除录音
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </template>
          </el-table-column>
        </el-table>

        <!-- 分页 -->
        <div class="pagination-wrapper">
          <el-pagination
            v-model:current-page="pagination.page"
            v-model:page-size="pagination.size"
            :page-sizes="[10, 20, 50, 100]"
            :total="total"
            layout="total, sizes, prev, pager, next, jumper"
            @size-change="handleSizeChange"
            @current-change="handleCurrentChange"
          />
        </div>
      </el-card>
    </div>

    <!-- 波形分析对话框 -->
    <el-dialog
      v-model="showWaveformDialog"
      title="录音波形分析"
      width="900px"
    >
      <div v-if="currentRecording" class="waveform-container">
        <div class="waveform-header">
          <h3>{{ currentRecording.customerName }} - {{ formatDateTime(currentRecording.startTime) }}</h3>
          <div class="waveform-controls">
            <el-button size="small" @click="playWaveform">
              <el-icon><VideoPlay /></el-icon>
              播放
            </el-button>
            <el-button size="small" @click="pauseWaveform">
              <el-icon><VideoPause /></el-icon>
              暂停
            </el-button>
            <el-button size="small" @click="resetWaveform">
              <el-icon><RefreshLeft /></el-icon>
              重置
            </el-button>
          </div>
        </div>

        <div class="waveform-display" ref="waveformContainer">
          <!-- 这里会渲染波形图 -->
          <div class="waveform-placeholder">
            <el-icon size="48"><TrendCharts /></el-icon>
            <p>波形图加载中...</p>
          </div>
        </div>

        <div class="waveform-info">
          <el-row :gutter="20">
            <el-col :span="8">
              <div class="info-item">
                <span class="info-label">采样率：</span>
                <span class="info-value">{{ currentRecording.sampleRate || '44.1kHz' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <span class="info-label">比特率：</span>
                <span class="info-value">{{ currentRecording.bitRate || '128kbps' }}</span>
              </div>
            </el-col>
            <el-col :span="8">
              <div class="info-item">
                <span class="info-label">声道：</span>
                <span class="info-value">{{ currentRecording.channels || '单声道' }}</span>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
    </el-dialog>

    <!-- 编辑录音信息对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑录音信息"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="录音标题" prop="title">
          <el-input v-model="editForm.title" placeholder="请输入录音标题" />
        </el-form-item>

        <el-form-item label="录音描述" prop="description">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="3"
            placeholder="请输入录音描述"
          />
        </el-form-item>

        <el-form-item label="录音标签">
          <el-select
            v-model="editForm.tags"
            multiple
            filterable
            allow-create
            placeholder="请选择或输入标签"
            style="width: 100%;"
          >
            <el-option label="重要" value="important" />
            <el-option label="投诉" value="complaint" />
            <el-option label="咨询" value="inquiry" />
            <el-option label="销售" value="sales" />
            <el-option label="售后" value="support" />
          </el-select>
        </el-form-item>

        <el-form-item label="录音质量">
          <el-rate v-model="editForm.qualityScore" show-text />
        </el-form-item>

        <el-form-item label="是否公开">
          <el-switch v-model="editForm.isPublic" />
          <span style="margin-left: 8px; color: #909399; font-size: 12px;">
            公开后其他人员可以查看此录音
          </span>
        </el-form-item>
      </el-form>

      <template #footer>
        <el-button @click="showEditDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEdit" :loading="saving">
          保存
        </el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import { useCallStore } from '@/stores/call'
import { useUserStore } from '@/stores/user'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import type { CallRecord } from '@/api/call'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import {
  VideoPlay,
  Download,
  Document,
  Refresh,
  Headset,
  Calendar,
  Timer,
  Star,
  Search,
  Close,
  Share,
  Plus,
  TrendCharts,
  ArrowDown,
  Switch,
  Edit,
  DataAnalysis,
  Delete,
  VideoPause,
  RefreshLeft,
  View
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { formatDateTime } from '@/utils/dateFormat'

const callStore = useCallStore()
const userStore = useUserStore()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 负责人列表 - 从userStore获取真实用户
// 🔥 【修复】过滤掉禁用用户，只显示启用的用户
const salesPersonList = computed(() => {
  return userStore.users
    .filter((u: any) => {
      // 检查用户是否启用（禁用用户不显示）
      const isEnabled = !u.status || u.status === 'active'
      const hasValidRole = ['sales_staff', 'department_manager', 'admin', 'super_admin', 'customer_service'].includes(u.role)
      return isEnabled && hasValidRole
    })
    .map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username
    }))
})

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const exportLoading = ref(false)
const recordings = ref<CallRecord[]>([])
const selectedRecordings = ref<CallRecord[]>([])
const total = ref(0)
const currentPlaying = ref<CallRecord | null>(null)
const currentRecording = ref<CallRecord | null>(null)
const showWaveformDialog = ref(false)
const showEditDialog = ref(false)

// 音频播放器引用
const audioPlayer = ref<HTMLAudioElement>()
const waveformContainer = ref<HTMLElement>()

// 概览数据
const overview = ref({
  totalRecordings: 0,
  todayRecordings: 0,
  todayIncrease: 0,
  totalSize: 0,
  totalDuration: 0,
  avgDuration: 0,
  avgQuality: 0,
  highQualityCount: 0
})

// 搜索表单
const searchForm = reactive({
  status: '',
  quality: '',
  customerInfo: '',
  dateRange: [] as string[],
  userId: '',
  durationRange: ''
})

// 分页
const pagination = reactive({
  page: 1,
  size: 20
})

// 编辑表单
const editForm = reactive({
  title: '',
  description: '',
  tags: [] as string[],
  qualityScore: 0,
  isPublic: false
})

const editFormRef = ref<FormInstance>()
const editRules: FormRules = {
  title: [
    { required: true, message: '请输入录音标题', trigger: 'blur' }
  ]
}

// 方法
// formatDateTime 已从 @/utils/dateFormat 导入

const formatDuration = (seconds: number) => {
  if (seconds < 60) return `${seconds}秒`
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  const remainingSeconds = seconds % 60

  if (hours > 0) {
    return `${hours}小时${minutes}分${remainingSeconds}秒`
  }
  return `${minutes}分${remainingSeconds}秒`
}

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

const getDurationClass = (duration: number) => {
  if (duration < 30) return 'short-duration'
  if (duration < 300) return 'medium-duration'
  return 'long-duration'
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    normal: 'success',
    processing: 'warning',
    corrupted: 'danger',
    deleted: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    normal: '正常',
    processing: '处理中',
    corrupted: '损坏',
    deleted: '已删除'
  }
  return statusMap[status] || '未知'
}

const getQualityText = (score: number) => {
  if (score >= 4) return '高质量'
  if (score >= 3) return '中等质量'
  return '低质量'
}

const loadRecordings = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm,
      startTime: searchForm.dateRange[0],
      endTime: searchForm.dateRange[1]
    }

    const response = await callStore.fetchRecordings(params)
    recordings.value = response.recordings
    total.value = response.total
  } catch (error) {
    console.error('加载录音列表失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadOverview = async () => {
  try {
    const data = await callStore.fetchRecordingStatistics()
    overview.value = data
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadRecordings()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    status: '',
    quality: '',
    customerInfo: '',
    dateRange: [],
    userId: '',
    durationRange: ''
  })
  handleSearch()
}

const refreshRecordings = () => {
  loadRecordings()
  loadOverview()
}

const handleSelectionChange = (selection: CallRecord[]) => {
  selectedRecordings.value = selection
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  loadRecordings()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadRecordings()
}

const playRecording = (recording: CallRecord) => {
  currentPlaying.value = recording
  // 滚动到播放器位置
  setTimeout(() => {
    const playerElement = document.querySelector('.player-section')
    if (playerElement) {
      playerElement.scrollIntoView({ behavior: 'smooth' })
    }
  }, 100)
}

const closePlayer = () => {
  currentPlaying.value = null
  if (audioPlayer.value) {
    audioPlayer.value.pause()
  }
}

const onAudioLoaded = () => {
  console.log('音频加载完成')
}

const onTimeUpdate = () => {
  // 可以在这里更新播放进度
}

const onAudioEnded = () => {
  console.log('音频播放结束')
}

const downloadRecording = async (recording: CallRecord) => {
  try {
    await callStore.downloadRecording(recording.id)
    ElMessage.success('录音下载成功')
  } catch (error) {
    console.error('下载录音失败:', error)
    ElMessage.error('下载失败')
  }
}

const shareRecording = (recording: CallRecord) => {
  // 分享录音逻辑
  ElMessage.info('分享功能开发中')
}

const addToPlaylist = (recording: CallRecord) => {
  // 添加到播放列表逻辑
  ElMessage.success('已添加到播放列表')
}

const viewWaveform = (recording: CallRecord) => {
  currentRecording.value = recording
  showWaveformDialog.value = true

  // 模拟加载波形图
  setTimeout(() => {
    if (waveformContainer.value) {
      // 这里可以集成实际的波形图库，如 WaveSurfer.js
      waveformContainer.value.innerHTML = '<div style="height: 200px; background: linear-gradient(90deg, #409EFF 0%, #67C23A 100%); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: white;">波形图显示区域</div>'
    }
  }, 1000)
}

const playWaveform = () => {
  ElMessage.info('波形播放功能开发中')
}

const pauseWaveform = () => {
  ElMessage.info('波形暂停功能开发中')
}

const resetWaveform = () => {
  ElMessage.info('波形重置功能开发中')
}

const editRecording = (recording: CallRecord) => {
  currentRecording.value = recording
  Object.assign(editForm, {
    title: recording.title || '',
    description: recording.description || '',
    tags: recording.tags || [],
    qualityScore: recording.quality?.score || 0,
    isPublic: recording.isPublic || false
  })
  showEditDialog.value = true
}

const saveEdit = async () => {
  if (!editFormRef.value || !currentRecording.value) return

  try {
    await editFormRef.value.validate()
    saving.value = true

    await callStore.updateRecording(currentRecording.value.id, {
      title: editForm.title,
      description: editForm.description,
      tags: editForm.tags,
      quality: {
        ...currentRecording.value.quality,
        score: editForm.qualityScore
      },
      isPublic: editForm.isPublic
    })

    ElMessage.success('录音信息已更新')
    showEditDialog.value = false
    loadRecordings()
  } catch (error) {
    console.error('更新录音信息失败:', error)
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

const convertFormat = (recording: CallRecord) => {
  ElMessage.info('格式转换功能开发中')
}

const viewAnalysis = (recording: CallRecord) => {
  ElMessage.info('质量分析功能开发中')
}

const deleteRecording = async (recording: CallRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这个录音吗？删除后无法恢复！', '确认删除', {
      type: 'warning'
    })

    await callStore.deleteRecording(recording.id)
    ElMessage.success('删除成功')
    loadRecordings()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除录音失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const batchDownload = async () => {
  if (!selectedRecordings.value || selectedRecordings.value.length === 0) {
    ElMessage.warning('请先选择要下载的录音')
    return
  }

  try {
    const ids = selectedRecordings.value.map(recording => recording.id)
    await callStore.batchDownloadRecordings(ids)
    ElMessage.success('批量下载成功')
  } catch (error) {
    console.error('批量下载失败:', error)
    ElMessage.error('批量下载失败')
  }
}

const batchDelete = async () => {
  if (!selectedRecordings.value || selectedRecordings.value.length === 0) {
    ElMessage.warning('请先选择要删除的录音')
    return
  }

  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecordings.value.length} 个录音吗？删除后无法恢复！`,
      '批量删除',
      { type: 'warning' }
    )

    const ids = selectedRecordings.value.map(recording => recording.id)
    await callStore.batchDeleteRecordings(ids)

    ElMessage.success('批量删除成功')
    loadRecordings()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const exportList = async () => {
  try {
    exportLoading.value = true
    const params = {
      ...searchForm,
      startTime: searchForm.dateRange[0],
      endTime: searchForm.dateRange[1]
    }

    await callStore.exportRecordingList(params)
    ElMessage.success('导出成功')
  } catch (error) {
    console.error('导出失败:', error)
    ElMessage.error('导出失败')
  } finally {
    exportLoading.value = false
  }
}

const viewCustomerDetail = (customerId: string) => {
  safeNavigator.push(`/customer-management/detail/${customerId}`)
}

// 生命周期
onMounted(async () => {
  await userStore.loadUsers()
  loadRecordings()
  loadOverview()
})
</script>

<style scoped>
.recording-management {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 20px;
  background: white;
  padding: 24px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-content {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
  display: flex;
  align-items: center;
  gap: 8px;
}

.page-description {
  color: #606266;
  margin: 0;
  font-size: 14px;
}

.header-actions {
  display: flex;
  gap: 12px;
}

.overview-section {
  margin-bottom: 20px;
}

.overview-card {
  height: 120px;
}

.overview-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.overview-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 28px;
  color: white;
}

.overview-icon.total {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.overview-icon.today {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.overview-icon.duration {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.overview-icon.quality {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.overview-info {
  flex: 1;
}

.overview-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  line-height: 1;
  margin-bottom: 4px;
}

.overview-label {
  font-size: 14px;
  color: #909399;
  margin-bottom: 4px;
}

.overview-change {
  font-size: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
}

.change-text {
  font-weight: 600;
}

.change-text.positive {
  color: #67C23A;
}

.change-label {
  color: #909399;
}

.search-section {
  margin-bottom: 20px;
}

.player-section {
  margin-bottom: 20px;
}

.player-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.audio-player {
  padding: 16px 0;
}

.player-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}

.player-details {
  display: flex;
  gap: 24px;
}

.detail-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.detail-label {
  font-weight: 600;
  color: #606266;
}

.detail-value {
  color: #303133;
}

.player-actions {
  display: flex;
  gap: 8px;
}

.table-section {
  margin-bottom: 20px;
}

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.quality-info {
  display: flex;
  align-items: center;
  gap: 8px;
}

.quality-text {
  font-size: 12px;
  color: #909399;
}

.short-duration {
  color: #F56C6C;
}

.medium-duration {
  color: #E6A23C;
}

.long-duration {
  color: #67C23A;
}

.pagination-wrapper {
  display: flex;
  justify-content: center;
  margin-top: 20px;
}

.waveform-container {
  padding: 16px 0;
}

.waveform-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.waveform-header h3 {
  margin: 0;
  color: #303133;
}

.waveform-controls {
  display: flex;
  gap: 8px;
}

.waveform-display {
  margin-bottom: 20px;
  min-height: 200px;
}

.waveform-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 200px;
  background-color: #f5f7fa;
  border-radius: 4px;
  color: #909399;
}

.waveform-info {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.info-item {
  display: flex;
  align-items: center;
}

.info-label {
  font-weight: 600;
  color: #606266;
  margin-right: 8px;
}

.info-value {
  color: #303133;
}

:deep(.el-table) {
  border: none;
}

:deep(.el-table th) {
  background-color: #fafafa;
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table td) {
  border-bottom: 1px solid #ebeef5;
}

:deep(.el-table tr:hover > td) {
  background-color: #f5f7fa;
}

:deep(.el-form--inline .el-form-item) {
  margin-right: 16px;
  margin-bottom: 16px;
}

:deep(.el-rate) {
  display: flex;
  align-items: center;
}
</style>
