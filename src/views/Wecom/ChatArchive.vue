<template>
  <div class="wecom-chat-archive">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>会话存档</span>
          <div class="header-actions">
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleSearch">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="query.keyword" placeholder="搜索内容" clearable style="width: 200px" @keyup.enter="handleSearch" />
            <el-select v-model="query.msgType" placeholder="消息类型" clearable style="width: 120px" @change="handleSearch">
              <el-option label="文本" value="text" />
              <el-option label="图片" value="image" />
              <el-option label="语音" value="voice" />
              <el-option label="视频" value="video" />
              <el-option label="文件" value="file" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" @change="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>
      </template>

      <el-alert type="info" :closable="false" style="margin-bottom: 15px">
        会话存档功能需要企业微信开通会话存档权限，并配置会话存档Secret和私钥
      </el-alert>

      <el-table :data="recordList" v-loading="loading" stripe>
        <el-table-column label="发送方" min-width="150">
          <template #default="{ row }">
            <div class="user-info">
              <el-tag :type="row.fromType === 'user' ? 'primary' : 'success'" size="small">
                {{ row.fromType === 'user' ? '员工' : '客户' }}
              </el-tag>
              <span>{{ row.fromName || row.fromId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="接收方" min-width="150">
          <template #default="{ row }">
            <div class="user-info">
              <el-tag :type="row.toType === 'user' ? 'primary' : 'success'" size="small">
                {{ row.toType === 'user' ? '员工' : '客户' }}
              </el-tag>
              <span>{{ row.toName || row.toId }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="消息类型" width="100">
          <template #default="{ row }">
            <el-tag>{{ getMsgTypeText(row.msgType) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="消息内容" min-width="250">
          <template #default="{ row }">
            <div v-if="row.msgType === 'text'" class="msg-content">{{ row.content }}</div>
            <div v-else-if="row.msgType === 'image'" class="msg-media">
              <el-image :src="row.mediaUrl" :preview-src-list="[row.mediaUrl]" fit="cover" style="width: 60px; height: 60px" />
            </div>
            <div v-else class="msg-file">
              <el-icon><Document /></el-icon>
              <span>{{ row.fileName || '媒体文件' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="发送时间" width="160">
          <template #default="{ row }">{{ formatDate(row.msgTime) }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="query.page"
          v-model:page-size="query.pageSize"
          :total="total"
          :page-sizes="[20, 50, 100]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchList"
          @current-change="fetchList"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomChatArchive' })
import { ref, onMounted } from 'vue'
import { Document } from '@element-plus/icons-vue'
import { getWecomConfigs } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const configList = ref<any[]>([])
const recordList = ref<any[]>([])
const total = ref(0)
const dateRange = ref<string[]>([])

const query = ref({
  configId: null as number | null,
  keyword: '',
  msgType: '',
  startDate: '',
  endDate: '',
  page: 1,
  pageSize: 20
})

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const getMsgTypeText = (type: string) => {
  const map: Record<string, string> = {
    text: '文本', image: '图片', voice: '语音', video: '视频', file: '文件',
    link: '链接', weapp: '小程序', chatrecord: '聊天记录', location: '位置'
  }
  return map[type] || type
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (res.data?.data || []).filter((c: any) => c.isEnabled && c.chatArchiveSecret)
  } catch (e) {
    console.error(e)
  }
}

const fetchList = async () => {
  // 会话存档需要后端实现拉取逻辑，这里先展示空数据
  loading.value = true
  try {
    // TODO: 调用会话存档API
    recordList.value = []
    total.value = 0
  } catch (e) {
    console.error(e)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  if (dateRange.value?.length === 2) {
    query.value.startDate = dateRange.value[0]
    query.value.endDate = dateRange.value[1]
  } else {
    query.value.startDate = ''
    query.value.endDate = ''
  }
  query.value.page = 1
  fetchList()
}

onMounted(() => {
  fetchConfigs()
  fetchList()
})
</script>

<style scoped lang="scss">
.wecom-chat-archive { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.user-info { display: flex; align-items: center; gap: 8px; }
.msg-content { max-width: 300px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.msg-media { display: inline-block; }
.msg-file { display: flex; align-items: center; gap: 5px; color: #409eff; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
