<template>
  <!-- 通话记录弹窗 -->
  <el-dialog
    :model-value="visible"
    @update:model-value="$emit('update:visible', $event)"
    title="通话记录" width="80%"
    :before-close="() => $emit('close-records')"
  >
    <div class="call-records-dialog">
      <!-- 筛选器 -->
      <div class="dialog-filters">
        <div class="filter-row">
          <div class="filter-item">
            <label>日期范围：</label>
            <el-date-picker
              :model-value="callRecordsFilter.dateRange"
              @update:model-value="updateFilter('dateRange', $event)"
              type="daterange" range-separator="至"
              start-placeholder="开始日期" end-placeholder="结束日期"
              format="YYYY-MM-DD" value-format="YYYY-MM-DD"
              @change="$emit('load-records')"
            />
          </div>
          <div class="filter-item">
            <label>客户搜索：</label>
            <el-input
              :model-value="callRecordsFilter.customerKeyword"
              @update:model-value="updateFilter('customerKeyword', $event)"
              placeholder="搜索客户姓名或电话" clearable style="width: 200px;"
              @input="$emit('load-records')"
            >
              <template #prefix><el-icon><Search /></el-icon></template>
            </el-input>
          </div>
          <el-button type="primary" :icon="Search" @click="$emit('load-records')">搜索</el-button>
          <el-button :icon="RefreshRight" @click="$emit('reset-filter')">重置</el-button>
        </div>
      </div>

      <!-- 通话记录表格 -->
      <el-table :data="callRecordsList" style="width: 100%" v-loading="callRecordsLoading" :header-cell-style="{ background: '#fafafa', color: '#606266' }">
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="customerPhone" label="客户电话" width="140">
          <template #default="{ row }">{{ displaySensitiveInfoNew(row.customerPhone, SensitiveInfoType.PHONE) }}</template>
        </el-table-column>
        <el-table-column prop="callType" label="通话类型" width="100">
          <template #default="{ row }">
            <el-tag :type="row.callType === 'outbound' ? '' : 'success'" size="small">{{ row.callType === 'outbound' ? '外呼' : '来电' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="duration" label="通话时长" width="100" align="center" />
        <el-table-column prop="status" label="通话状态" width="110" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="170" />
        <el-table-column prop="operator" label="操作人" width="110" />
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
        <el-table-column label="录音" width="140" align="center">
          <template #default="{ row }">
            <template v-if="row.recordingUrl">
              <el-button link type="primary" size="small" @click="$emit('play-recording', row)">播放</el-button>
              <el-button link type="success" size="small" @click="$emit('download-recording', row)">下载</el-button>
            </template>
            <span v-else style="color: #c0c4cc;">无录音</span>
          </template>
        </el-table-column>
      </el-table>

      <!-- 分页 -->
      <div class="dialog-pagination">
        <el-pagination
          v-model:current-page="callRecordsPagination.currentPage"
          v-model:page-size="callRecordsPagination.pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="callRecordsPagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="$emit('page-size-change', $event)"
          @current-change="$emit('page-change', $event)"
        />
      </div>
    </div>
  </el-dialog>

  <!-- 录音播放器弹窗 -->
  <el-dialog
    :model-value="recordingPlayerVisible"
    @update:model-value="$emit('update:recordingPlayerVisible', $event)"
    title="录音播放" width="600px"
    :before-close="() => $emit('stop-recording')"
    class="recording-dialog"
  >
    <div class="recording-player">
      <div class="recording-header">
        <div class="customer-info-card">
          <div class="customer-avatar-small">
            <el-icon size="24"><User /></el-icon>
          </div>
          <div class="customer-details">
            <div class="customer-name-row">
              <span class="customer-name-text">{{ currentRecording?.customerName || '-' }}</span>
              <el-tag :type="currentRecording?.callType === 'outbound' ? '' : 'success'" size="small">
                {{ currentRecording?.callType === 'outbound' ? '外呼' : '来电' }}
              </el-tag>
            </div>
            <div class="customer-phone-row">
              <el-icon size="14"><Phone /></el-icon>
              <span>{{ displaySensitiveInfoNew(currentRecording?.customerPhone, SensitiveInfoType.PHONE) }}</span>
            </div>
          </div>
        </div>
      </div>

      <div class="recording-info-grid">
        <div class="info-card">
          <div class="info-icon"><el-icon><Timer /></el-icon></div>
          <div class="info-content">
            <div class="info-label">通话时长</div>
            <div class="info-value">{{ currentRecording?.duration || '-' }}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon"><el-icon><Clock /></el-icon></div>
          <div class="info-content">
            <div class="info-label">开始时间</div>
            <div class="info-value">{{ currentRecording?.startTime || '-' }}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon"><el-icon><User /></el-icon></div>
          <div class="info-content">
            <div class="info-label">操作人</div>
            <div class="info-value">{{ currentRecording?.operator || '-' }}</div>
          </div>
        </div>
        <div class="info-card">
          <div class="info-icon"><el-icon><CircleCheck /></el-icon></div>
          <div class="info-content">
            <div class="info-label">通话状态</div>
            <div class="info-value">
              <el-tag :type="getStatusType(currentRecording?.status)" size="small">
                {{ getStatusText(currentRecording?.status) }}
              </el-tag>
            </div>
          </div>
        </div>
      </div>

      <div class="audio-player-section">
        <div class="audio-player-header">
          <el-icon><Headset /></el-icon>
          <span>录音文件</span>
        </div>
        <div class="audio-player-wrapper">
          <audio
            ref="audioPlayer"
            :src="currentRecording?.recordingUrl"
            controls
          >
            您的浏览器不支持音频播放
          </audio>
        </div>
      </div>

      <div v-if="currentRecording?.remark" class="recording-remark">
        <div class="remark-header">
          <el-icon><Document /></el-icon>
          <span>备注信息</span>
        </div>
        <div class="remark-content">{{ currentRecording.remark }}</div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, RefreshRight, User, Phone, Timer, Clock, CircleCheck, Headset, Document } from '@element-plus/icons-vue'
import { displaySensitiveInfoNew, SensitiveInfoType } from '@/utils/sensitiveInfo'
import { getStatusType, getStatusText } from './helpers'

const props = defineProps<{
  visible: boolean
  callRecordsLoading: boolean
  callRecordsList: any[]
  callRecordsFilter: { dateRange: any[]; customerKeyword: string }
  callRecordsPagination: { currentPage: number; pageSize: number; total: number }
  recordingPlayerVisible: boolean
  currentRecording: any
}>()

const emit = defineEmits<{
  'update:visible': [value: boolean]
  'update:recordingPlayerVisible': [value: boolean]
  'update:callRecordsFilter': [value: any]
  'load-records': []
  'reset-filter': []
  'page-size-change': [size: number]
  'page-change': [page: number]
  'play-recording': [row: any]
  'download-recording': [row: any]
  'close-records': []
  'stop-recording': []
}>()

const audioPlayer = ref<HTMLAudioElement | null>(null)

const updateFilter = (key: string, value: any) => {
  emit('update:callRecordsFilter', { ...props.callRecordsFilter, [key]: value })
}
</script>

<style scoped>
.call-records-dialog { padding: 20px; }
.dialog-filters { margin-bottom: 20px; padding: 16px; background-color: #f8f9fa; border-radius: 8px; }
.filter-row { display: flex; flex-wrap: wrap; gap: 20px; align-items: center; }
.filter-item { display: flex; align-items: center; gap: 8px; }
.filter-item label { font-size: 14px; color: #606266; white-space: nowrap; }
.dialog-pagination { margin-top: 20px; display: flex; justify-content: center; }

/* 录音播放器样式 */
.recording-dialog :deep(.el-dialog__body) { padding: 24px; }
.recording-player { display: flex; flex-direction: column; gap: 20px; }

.recording-header { margin-bottom: 8px; }
.customer-info-card { display: flex; align-items: center; gap: 16px; padding: 16px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius: 12px; color: white; }
.customer-avatar-small { width: 48px; height: 48px; border-radius: 50%; background: rgba(255, 255, 255, 0.2); display: flex; align-items: center; justify-content: center; }
.customer-details { flex: 1; }
.customer-name-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.customer-name-text { font-size: 18px; font-weight: 600; }
.customer-phone-row { display: flex; align-items: center; gap: 6px; font-size: 14px; opacity: 0.95; }

.recording-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 12px; }
.info-card { display: flex; align-items: center; gap: 12px; padding: 16px; background: #f8f9fa; border-radius: 8px; border: 1px solid #e4e7ed; transition: all 0.3s; }
.info-card:hover { background: #f0f2f5; border-color: #d0d3d9; }
.info-icon { width: 40px; height: 40px; border-radius: 8px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); display: flex; align-items: center; justify-content: center; color: white; font-size: 20px; }
.info-content { flex: 1; }
.info-label { font-size: 12px; color: #909399; margin-bottom: 4px; }
.info-value { font-size: 15px; color: #303133; font-weight: 500; }

.audio-player-section { padding: 20px; background: #f8f9fa; border-radius: 12px; border: 2px dashed #d0d3d9; }
.audio-player-header { display: flex; align-items: center; gap: 8px; font-size: 15px; font-weight: 500; color: #606266; margin-bottom: 16px; }
.audio-player-header .el-icon { font-size: 18px; color: #409eff; }
.audio-player-wrapper audio { width: 100%; height: 48px; border-radius: 8px; }

.recording-remark { padding: 16px; background: #fff9e6; border-radius: 8px; border-left: 4px solid #e6a23c; }
.remark-header { display: flex; align-items: center; gap: 8px; font-size: 14px; font-weight: 500; color: #606266; margin-bottom: 8px; }
.remark-header .el-icon { color: #e6a23c; }
.remark-content { font-size: 14px; color: #606266; line-height: 1.6; }

.text-muted { color: #909399; font-size: 12px; }
</style>

