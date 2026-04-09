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
        <el-table-column prop="status" label="通话状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="startTime" label="开始时间" width="160" />
        <el-table-column prop="operator" label="操作人员" width="100" />
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
    title="录音播放" width="500px"
    :before-close="() => $emit('stop-recording')"
  >
    <div class="recording-player">
      <div class="recording-info">
        <div class="info-row">
          <span class="info-label">客户</span>
          <span class="info-value">{{ currentRecording?.customerName || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">电话</span>
          <span class="info-value">{{ displaySensitiveInfoNew(currentRecording?.customerPhone, SensitiveInfoType.PHONE) }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">时间</span>
          <span class="info-value">{{ currentRecording?.startTime || '-' }}</span>
        </div>
        <div class="info-row">
          <span class="info-label">时长</span>
          <span class="info-value">{{ currentRecording?.duration || '-' }}</span>
        </div>
      </div>
      <div class="audio-player">
        <audio
          ref="audioPlayer"
          :src="currentRecording?.recordingUrl"
          controls style="width: 100%;"
        >
          您的浏览器不支持音频播放
        </audio>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Search, RefreshRight } from '@element-plus/icons-vue'
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
.recording-player { padding: 0; }
.recording-info { margin-bottom: 16px; display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.recording-info .info-row { display: flex; flex-direction: column; gap: 4px; }
.recording-info .info-label { font-size: 12px; color: #909399; }
.recording-info .info-value { font-size: 14px; color: #303133; }
.audio-player { padding: 16px; background: #f5f7fa; border-radius: 8px; }
.text-muted { color: #909399; font-size: 12px; }
</style>

