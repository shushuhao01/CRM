<template>
  <div class="call-records">
    <!-- 页面头部 -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">
          <el-icon><Headset /></el-icon>
          通话记录
        </h1>
        <p class="page-description">查看和管理所有通话记录，包括呼入和呼出通话详情</p>
      </div>
      
      <div class="header-actions">
        <el-button @click="exportRecords" :loading="exportLoading">
          <el-icon><Download /></el-icon>
          导出记录
        </el-button>
        <el-button @click="refreshRecords" :loading="loading">
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
                <el-icon><Phone /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.totalCalls || 0 }}</div>
                <div class="overview-label">总通话数</div>
                <div class="overview-change">
                  <span class="change-text positive">+{{ overview.todayIncrease || 0 }}</span>
                  <span class="change-label">今日新增</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon incoming">
                <el-icon><PhoneIncoming /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.incomingCalls || 0 }}</div>
                <div class="overview-label">呼入通话</div>
                <div class="overview-change">
                  <span class="change-text">{{ ((overview.incomingCalls / overview.totalCalls) * 100).toFixed(1) }}%</span>
                  <span class="change-label">占比</span>
                </div>
              </div>
            </div>
          </el-card>
        </el-col>
        
        <el-col :span="6">
          <el-card class="overview-card">
            <div class="overview-content">
              <div class="overview-icon outgoing">
                <el-icon><PhoneOutgoing /></el-icon>
              </div>
              <div class="overview-info">
                <div class="overview-value">{{ overview.outgoingCalls || 0 }}</div>
                <div class="overview-label">呼出通话</div>
                <div class="overview-change">
                  <span class="change-text">{{ ((overview.outgoingCalls / overview.totalCalls) * 100).toFixed(1) }}%</span>
                  <span class="change-label">占比</span>
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
                <div class="overview-label">总通话时长</div>
                <div class="overview-change">
                  <span class="change-text">{{ formatDuration(overview.avgDuration || 0) }}</span>
                  <span class="change-label">平均时长</span>
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
          <el-form-item label="通话类型">
            <el-select
              v-model="searchForm.direction"
              placeholder="请选择类型"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="呼入" value="incoming" />
              <el-option label="呼出" value="outgoing" />
            </el-select>
          </el-form-item>
          
          <el-form-item label="通话状态">
            <el-select
              v-model="searchForm.status"
              placeholder="请选择状态"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="已接通" value="connected" />
              <el-option label="未接听" value="missed" />
              <el-option label="拒接" value="rejected" />
              <el-option label="失败" value="failed" />
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
          
          <el-form-item label="通话时间">
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
          
          <el-form-item label="通话人员">
            <el-select
              v-model="searchForm.userId"
              placeholder="请选择人员"
              clearable
              style="width: 150px;"
            >
              <el-option label="全部" value="" />
              <el-option label="张三" value="1" />
              <el-option label="李四" value="2" />
              <el-option label="王五" value="3" />
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

    <!-- 数据表格 -->
    <div class="table-section">
      <el-card>
        <template #header>
          <div class="table-header">
            <span>通话记录 (共 {{ total }} 条)</span>
            <div class="table-actions">
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchExport"
              >
                批量导出
              </el-button>
              <el-button
                size="small"
                :disabled="!selectedRecords.length"
                @click="batchDelete"
              >
                批量删除
              </el-button>
            </div>
          </div>
        </template>
        
        <el-table
          :data="callRecords"
          v-loading="loading"
          @selection-change="handleSelectionChange"
          style="width: 100%"
          row-key="id"
        >
          <el-table-column type="selection" width="55" />
          
          <el-table-column prop="direction" label="类型" width="80">
            <template #default="{ row }">
              <el-tag :type="row.direction === 'incoming' ? 'success' : 'primary'" size="small">
                <el-icon>
                  <PhoneIncoming v-if="row.direction === 'incoming'" />
                  <PhoneOutgoing v-else />
                </el-icon>
                {{ row.direction === 'incoming' ? '呼入' : '呼出' }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="customerName" label="客户姓名" width="120">
            <template #default="{ row }">
              <el-button text @click="viewCustomerDetail(row.customerId)">
                {{ row.customerName || '未知客户' }}
              </el-button>
            </template>
          </el-table-column>
          
          <el-table-column prop="customerPhone" label="客户电话" width="140">
            <template #default="{ row }">
              <div class="phone-info">
                <span>{{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}</span>
                <el-button
                  text
                  type="primary"
                  size="small"
                  @click="callBack(row.customerPhone)"
                  style="margin-left: 8px;"
                >
                  <el-icon><Phone /></el-icon>
                </el-button>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="userName" label="通话人员" width="100" />
          
          <el-table-column prop="startTime" label="开始时间" width="160">
            <template #default="{ row }">
              {{ formatDateTime(row.startTime) }}
            </template>
          </el-table-column>
          
          <el-table-column prop="endTime" label="结束时间" width="160">
            <template #default="{ row }">
              {{ row.endTime ? formatDateTime(row.endTime) : '-' }}
            </template>
          </el-table-column>
          
          <el-table-column prop="duration" label="通话时长" width="100" sortable>
            <template #default="{ row }">
              <span :class="getDurationClass(row.duration)">
                {{ formatDuration(row.duration) }}
              </span>
            </template>
          </el-table-column>
          
          <el-table-column prop="status" label="通话状态" width="100">
            <template #default="{ row }">
              <el-tag :type="getStatusType(row.status)" size="small">
                {{ getStatusText(row.status) }}
              </el-tag>
            </template>
          </el-table-column>
          
          <el-table-column prop="hasRecording" label="录音" width="80">
            <template #default="{ row }">
              <el-button
                v-if="row.hasRecording"
                text
                size="small"
                @click="playRecording(row)"
              >
                <el-icon color="#67C23A"><VideoPlay /></el-icon>
              </el-button>
              <span v-else style="color: #C0C4CC;">无</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="quality" label="通话质量" width="100">
            <template #default="{ row }">
              <div v-if="row.quality" class="quality-info">
                <el-rate
                  v-model="row.quality.score"
                  disabled
                  show-score
                  text-color="#ff9900"
                  score-template="{value}"
                  size="small"
                />
              </div>
              <span v-else style="color: #C0C4CC;">未评分</span>
            </template>
          </el-table-column>
          
          <el-table-column prop="notes" label="备注" min-width="150" show-overflow-tooltip />
          
          <el-table-column label="操作" width="200" fixed="right">
            <template #default="{ row }">
              <el-button text size="small" @click="viewDetail(row)">
                <el-icon><View /></el-icon>
                详情
              </el-button>
              
              <el-button
                text
                size="small"
                @click="playRecording(row)"
                :disabled="!row.hasRecording"
              >
                <el-icon><VideoPlay /></el-icon>
                录音
              </el-button>
              
              <el-button text size="small" @click="addFollowUp(row)">
                <el-icon><EditPen /></el-icon>
                跟进
              </el-button>
              
              <el-dropdown>
                <el-button text size="small">
                  更多<el-icon><ArrowDown /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item @click="editRecord(row)">
                      <el-icon><Edit /></el-icon>
                      编辑记录
                    </el-dropdown-item>
                    <el-dropdown-item @click="downloadRecording(row)" :disabled="!row.hasRecording">
                      <el-icon><Download /></el-icon>
                      下载录音
                    </el-dropdown-item>
                    <el-dropdown-item @click="shareRecord(row)">
                      <el-icon><Share /></el-icon>
                      分享记录
                    </el-dropdown-item>
                    <el-dropdown-item @click="deleteRecord(row)" divided>
                      <el-icon><Delete /></el-icon>
                      删除记录
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

    <!-- 通话详情对话框 -->
    <el-dialog
      v-model="showDetailDialog"
      title="通话记录详情"
      width="800px"
    >
      <div v-if="currentRecord" class="call-detail">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>基本信息</span>
              </template>
              <el-descriptions :column="1" border>
                <el-descriptions-item label="通话类型">
                  <el-tag :type="currentRecord.direction === 'incoming' ? 'success' : 'primary'">
                    {{ currentRecord.direction === 'incoming' ? '呼入' : '呼出' }}
                  </el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="客户姓名">
                  {{ currentRecord.customerName || '未知客户' }}
                </el-descriptions-item>
                <el-descriptions-item label="客户电话">
                  {{ displaySensitiveInfoNew(currentRecord.customerPhone, SensitiveInfoType.PHONE) }}
                </el-descriptions-item>
                <el-descriptions-item label="通话人员">
                  {{ currentRecord.userName }}
                </el-descriptions-item>
                <el-descriptions-item label="开始时间">
                  {{ formatDateTime(currentRecord.startTime) }}
                </el-descriptions-item>
                <el-descriptions-item label="结束时间">
                  {{ currentRecord.endTime ? formatDateTime(currentRecord.endTime) : '未结束' }}
                </el-descriptions-item>
                <el-descriptions-item label="通话时长">
                  {{ formatDuration(currentRecord.duration) }}
                </el-descriptions-item>
                <el-descriptions-item label="通话状态">
                  <el-tag :type="getStatusType(currentRecord.status)">
                    {{ getStatusText(currentRecord.status) }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>
            </el-card>
          </el-col>
          
          <el-col :span="12">
            <el-card>
              <template #header>
                <span>通话质量</span>
              </template>
              <div v-if="currentRecord.quality" class="quality-detail">
                <div class="quality-item">
                  <span class="quality-label">整体评分：</span>
                  <el-rate
                    v-model="currentRecord.quality.score"
                    disabled
                    show-score
                    text-color="#ff9900"
                  />
                </div>
                <div class="quality-item">
                  <span class="quality-label">音频质量：</span>
                  <el-progress
                    :percentage="currentRecord.quality.audioQuality"
                    :color="getQualityColor(currentRecord.quality.audioQuality)"
                  />
                </div>
                <div class="quality-item">
                  <span class="quality-label">网络延迟：</span>
                  <span>{{ currentRecord.quality.latency }}ms</span>
                </div>
                <div class="quality-item">
                  <span class="quality-label">丢包率：</span>
                  <span>{{ currentRecord.quality.packetLoss }}%</span>
                </div>
              </div>
              <div v-else class="no-quality">
                <el-empty description="暂无质量数据" :image-size="80" />
              </div>
            </el-card>
          </el-col>
        </el-row>
        
        <el-card style="margin-top: 20px;" v-if="currentRecord.notes">
          <template #header>
            <span>通话备注</span>
          </template>
          <div class="notes-content">
            {{ currentRecord.notes }}
          </div>
        </el-card>
        
        <el-card style="margin-top: 20px;" v-if="currentRecord.hasRecording">
          <template #header>
            <span>录音播放</span>
          </template>
          <div class="recording-player">
            <audio
              ref="audioPlayer"
              controls
              style="width: 100%;"
              :src="currentRecord.recordingUrl"
            >
              您的浏览器不支持音频播放
            </audio>
            <div class="recording-actions" style="margin-top: 10px;">
              <el-button size="small" @click="downloadRecording(currentRecord)">
                <el-icon><Download /></el-icon>
                下载录音
              </el-button>
              <el-button size="small" @click="shareRecord(currentRecord)">
                <el-icon><Share /></el-icon>
                分享录音
              </el-button>
            </div>
          </div>
        </el-card>
      </div>
    </el-dialog>

    <!-- 编辑记录对话框 -->
    <el-dialog
      v-model="showEditDialog"
      title="编辑通话记录"
      width="600px"
      :close-on-click-modal="false"
    >
      <el-form :model="editForm" :rules="editRules" ref="editFormRef" label-width="100px">
        <el-form-item label="客户姓名" prop="customerName">
          <el-input v-model="editForm.customerName" placeholder="请输入客户姓名" />
        </el-form-item>
        
        <el-form-item label="通话备注" prop="notes">
          <el-input
            v-model="editForm.notes"
            type="textarea"
            :rows="4"
            placeholder="请输入通话备注"
          />
        </el-form-item>
        
        <el-form-item label="通话质量">
          <el-rate v-model="editForm.qualityScore" show-text />
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
import { ref, onMounted, reactive } from 'vue'
import { useCallStore } from '@/stores/call'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'
import type { CallRecord } from '@/api/call'
import { maskPhone } from '@/utils/phone'
import { displaySensitiveInfo as displaySensitiveInfoNew } from '@/utils/sensitiveInfo'
import { SensitiveInfoType } from '@/services/permission'
import {
  Headset,
  Download,
  Refresh,
  Phone,
  Timer,
  Search,
  VideoPlay,
  EditPen,
  View,
  ArrowDown,
  Edit,
  Share,
  Delete
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'

const callStore = useCallStore()
const router = useRouter()
const safeNavigator = createSafeNavigator(router)

// 响应式数据
const loading = ref(false)
const saving = ref(false)
const exportLoading = ref(false)
const callRecords = ref<CallRecord[]>([])
const selectedRecords = ref<CallRecord[]>([])
const total = ref(0)
const showDetailDialog = ref(false)
const showEditDialog = ref(false)
const currentRecord = ref<CallRecord | null>(null)

// 概览数据
const overview = ref({
  totalCalls: 0,
  incomingCalls: 0,
  outgoingCalls: 0,
  totalDuration: 0,
  avgDuration: 0,
  todayIncrease: 0
})

// 搜索表单
const searchForm = reactive({
  direction: '',
  status: '',
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
  customerName: '',
  notes: '',
  qualityScore: 0
})

const editFormRef = ref<FormInstance>()
const editRules: FormRules = {
  customerName: [
    { required: true, message: '请输入客户姓名', trigger: 'blur' }
  ]
}

// 方法
const formatDateTime = (dateTime: string) => {
  return new Date(dateTime).toLocaleString('zh-CN')
}

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

const getDurationClass = (duration: number) => {
  if (duration < 30) return 'short-duration'
  if (duration < 300) return 'medium-duration'
  return 'long-duration'
}

const getStatusType = (status: string) => {
  const statusMap: Record<string, string> = {
    connected: 'success',
    missed: 'warning',
    rejected: 'danger',
    failed: 'info'
  }
  return statusMap[status] || 'info'
}

const getStatusText = (status: string) => {
  const statusMap: Record<string, string> = {
    connected: '已接通',
    missed: '未接听',
    rejected: '拒接',
    failed: '失败'
  }
  return statusMap[status] || '未知'
}

const getQualityColor = (quality: number) => {
  if (quality >= 80) return '#67C23A'
  if (quality >= 60) return '#E6A23C'
  return '#F56C6C'
}

const loadCallRecords = async () => {
  try {
    loading.value = true
    const params = {
      page: pagination.page,
      size: pagination.size,
      ...searchForm,
      startTime: searchForm.dateRange[0],
      endTime: searchForm.dateRange[1]
    }
    
    const response = await callStore.fetchCallRecords(params)
    callRecords.value = response.records
    total.value = response.total
  } catch (error) {
    console.error('加载通话记录失败:', error)
    ElMessage.error('加载数据失败')
  } finally {
    loading.value = false
  }
}

const loadOverview = async () => {
  try {
    const data = await callStore.fetchCallStatistics({
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    })
    
    overview.value = {
      totalCalls: data.totalCalls,
      incomingCalls: data.incomingCalls || 0,
      outgoingCalls: data.outgoingCalls || 0,
      totalDuration: data.totalDuration,
      avgDuration: data.averageDuration,
      todayIncrease: data.todayIncrease || 0
    }
  } catch (error) {
    console.error('加载概览数据失败:', error)
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadCallRecords()
}

const resetSearch = () => {
  Object.assign(searchForm, {
    direction: '',
    status: '',
    customerInfo: '',
    dateRange: [],
    userId: '',
    durationRange: ''
  })
  handleSearch()
}

const refreshRecords = () => {
  loadCallRecords()
  loadOverview()
}

const handleSelectionChange = (selection: CallRecord[]) => {
  selectedRecords.value = selection
}

const handleSizeChange = (size: number) => {
  pagination.size = size
  loadCallRecords()
}

const handleCurrentChange = (page: number) => {
  pagination.page = page
  loadCallRecords()
}

const viewDetail = (record: CallRecord) => {
  currentRecord.value = record
  showDetailDialog.value = true
}

const editRecord = (record: CallRecord) => {
  currentRecord.value = record
  Object.assign(editForm, {
    customerName: record.customerName || '',
    notes: record.notes || '',
    qualityScore: record.quality?.score || 0
  })
  showEditDialog.value = true
}

const saveEdit = async () => {
  if (!editFormRef.value || !currentRecord.value) return
  
  try {
    await editFormRef.value.validate()
    saving.value = true
    
    await callStore.updateCallRecord(currentRecord.value.id, {
      customerName: editForm.customerName,
      notes: editForm.notes,
      quality: {
        ...currentRecord.value.quality,
        score: editForm.qualityScore
      }
    })
    
    ElMessage.success('记录已更新')
    showEditDialog.value = false
    loadCallRecords()
  } catch (error) {
    console.error('更新记录失败:', error)
    ElMessage.error('更新失败')
  } finally {
    saving.value = false
  }
}

const playRecording = (record: CallRecord) => {
  if (!record.hasRecording) {
    ElMessage.warning('该通话没有录音')
    return
  }
  
  // 跳转到录音管理页面
  safeNavigator.push(`/service-management/call/recordings?recordId=${record.id}`)
}

const downloadRecording = async (record: CallRecord) => {
  if (!record.hasRecording) {
    ElMessage.warning('该通话没有录音')
    return
  }
  
  try {
    await callStore.downloadRecording(record.id)
    ElMessage.success('录音下载成功')
  } catch (error) {
    console.error('下载录音失败:', error)
    ElMessage.error('下载失败')
  }
}

const shareRecord = (record: CallRecord) => {
  // 分享记录逻辑
  ElMessage.info('分享功能开发中')
}

const addFollowUp = (record: CallRecord) => {
  safeNavigator.push({
    path: '/service-management/call/follow-up-records',
    query: {
      customerId: record.customerId,
      callRecordId: record.id
    }
  })
}

const callBack = async (phone: string) => {
  try {
    await callStore.makeOutboundCall({
      customerPhone: phone,
      customerName: '',
      notes: '回拨电话'
    })
    ElMessage.success('回拨已发起')
  } catch (error) {
    console.error('回拨失败:', error)
    ElMessage.error('回拨失败')
  }
}

const deleteRecord = async (record: CallRecord) => {
  try {
    await ElMessageBox.confirm('确定要删除这条通话记录吗？', '确认删除', {
      type: 'warning'
    })
    
    await callStore.deleteCallRecord(record.id)
    ElMessage.success('删除成功')
    loadCallRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除记录失败:', error)
      ElMessage.error('删除失败')
    }
  }
}

const batchExport = async () => {
  if (!selectedRecords.value || selectedRecords.value.length === 0) {
    ElMessage.warning('请先选择要导出的记录')
    return
  }
  
  try {
    const ids = selectedRecords.value.map(record => record.id)
    await callStore.exportCallRecords({ recordIds: ids })
    ElMessage.success('批量导出成功')
  } catch (error) {
    console.error('批量导出失败:', error)
    ElMessage.error('批量导出失败')
  }
}

const batchDelete = async () => {
  if (!selectedRecords.value || selectedRecords.value.length === 0) {
    ElMessage.warning('请先选择要删除的记录')
    return
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedRecords.value.length} 条记录吗？`,
      '批量删除',
      { type: 'warning' }
    )
    
    const ids = selectedRecords.value.map(record => record.id)
    await callStore.batchDeleteCallRecords(ids)
    
    ElMessage.success('批量删除成功')
    loadCallRecords()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('批量删除失败:', error)
      ElMessage.error('批量删除失败')
    }
  }
}

const exportRecords = async () => {
  try {
    exportLoading.value = true
    const params = {
      ...searchForm,
      startTime: searchForm.dateRange[0],
      endTime: searchForm.dateRange[1]
    }
    
    await callStore.exportCallRecords(params)
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
onMounted(() => {
  loadCallRecords()
  loadOverview()
})
</script>

<style scoped>
.call-records {
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

.overview-icon.incoming {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.overview-icon.outgoing {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.overview-icon.duration {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
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

.phone-info {
  display: flex;
  align-items: center;
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

.call-detail {
  padding: 16px 0;
}

.quality-detail {
  padding: 16px;
}

.quality-item {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
}

.quality-label {
  width: 100px;
  font-weight: 600;
  color: #303133;
}

.no-quality {
  padding: 40px;
  text-align: center;
}

.notes-content {
  padding: 16px;
  background-color: #f5f7fa;
  border-radius: 4px;
  line-height: 1.6;
  white-space: pre-wrap;
}

.recording-player {
  padding: 16px;
}

.recording-actions {
  display: flex;
  gap: 8px;
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