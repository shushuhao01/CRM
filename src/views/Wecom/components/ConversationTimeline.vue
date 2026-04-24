<template>
  <div class="conversation-timeline">
    <div class="timeline-header">
      <h4>会话轨迹</h4>
      <div class="timeline-actions">
        <el-input v-model="searchKeyword" placeholder="搜索客户/员工" clearable size="small" style="width:180px" @keyup.enter="fetchTimeline" />
        <el-radio-group v-model="filter" size="small" @change="fetchTimeline">
          <el-radio-button label="all">全部</el-radio-button>
          <el-radio-button label="message">消息</el-radio-button>
          <el-radio-button label="event">事件</el-radio-button>
          <el-radio-button label="crm">CRM</el-radio-button>
        </el-radio-group>
        <el-button size="small" @click="fetchTimeline"><el-icon><Refresh /></el-icon></el-button>
      </div>
    </div>

    <el-timeline v-if="events.length" v-loading="loading">
      <el-timeline-item
        v-for="event in events"
        :key="event.id"
        :timestamp="event.time"
        :type="getEventColor(event.type)"
        placement="top"
      >
        <div class="event-card">
          <div class="event-card-header">
            <span class="event-icon">{{ getEventEmoji(event.type) }}</span>
            <span class="event-title">{{ event.title }}</span>
            <el-tag :type="getEventTagType(event.type)" size="small" style="margin-left:8px">{{ getEventTypeLabel(event.type) }}</el-tag>
          </div>
          <div class="event-desc">{{ event.description }}</div>
          <div class="event-participants" v-if="event.fromUser || event.toUser">
            <span v-if="event.fromUser" class="event-user">{{ event.fromUser }}</span>
            <span v-if="event.fromUser && event.toUser" class="event-arrow"> &rarr; </span>
            <span v-if="event.toUser" class="event-user">{{ event.toUser }}</span>
          </div>
          <div v-if="event.detail" class="event-detail">
            <el-button text size="small" @click="event.expanded = !event.expanded">
              {{ event.expanded ? '收起' : '展开详情' }}
            </el-button>
            <div v-if="event.expanded" class="event-detail-content">{{ event.detail }}</div>
          </div>
        </div>
      </el-timeline-item>
    </el-timeline>

    <el-empty v-else-if="!loading" description="暂无轨迹数据" />

    <div class="pagination-wrapper" v-if="total > pageSize">
      <el-pagination v-model:current-page="page" :page-size="pageSize" :total="total" layout="total, prev, pager, next" small @current-change="fetchTimeline" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, watch } from 'vue'
import { Refresh } from '@element-plus/icons-vue'

const props = defineProps<{ externalUserId?: string; configId?: number; isDemoMode?: boolean }>()

const filter = ref('all')
const searchKeyword = ref('')
const events = ref<any[]>([])
const loading = ref(false)
const page = ref(1)
const pageSize = ref(50)
const total = ref(0)

const fetchTimeline = async () => {
  loading.value = true
  try {
    // API placeholder - would call a timeline endpoint
    // For now use demo data in demo mode
    if (props.isDemoMode) {
      events.value = [
        { id: 1, type: 'add', title: '新增客户', description: '客户 陈女士 通过获客链接添加', time: '2026-04-17 10:30', fromUser: '张三', toUser: '陈女士', expanded: false },
        { id: 2, type: 'message', title: '首次对话', description: '员工 张三 主动发起会话', time: '2026-04-17 10:32', fromUser: '张三', toUser: '陈女士', expanded: false },
        { id: 3, type: 'tag', title: '标签变更', description: '为客户添加标签：意向客户、VIP', time: '2026-04-17 11:00', fromUser: '系统', expanded: false },
        { id: 4, type: 'crm_link', title: 'CRM关联', description: '已关联CRM客户记录 #C20260417', time: '2026-04-17 11:05', expanded: false },
        { id: 5, type: 'message', title: '发送报价', description: '发送了产品报价单文件', time: '2026-04-17 14:20', fromUser: '张三', toUser: '陈女士', expanded: false },
        { id: 6, type: 'group_join', title: '入群', description: '客户加入群聊【VIP客户服务群】', time: '2026-04-16 09:15', fromUser: '陈女士', expanded: false },
      ]
      total.value = events.value.length
    } else {
      events.value = []
      total.value = 0
    }
  } catch {
    events.value = []
  } finally {
    loading.value = false
  }
}

const getEventColor = (type: string) => {
  const map: Record<string, string> = { add: 'success', delete: 'danger', tag: 'primary', group_join: 'success', group_leave: 'warning', crm_link: 'primary', message: '' }
  return map[type] || ''
}

const getEventEmoji = (type: string) => {
  const map: Record<string, string> = { add: '+', delete: '-', tag: '#', group_join: 'G', group_leave: 'L', crm_link: 'C', message: 'M' }
  return map[type] || 'E'
}

const getEventTypeLabel = (type: string) => {
  const map: Record<string, string> = { add: '添加', delete: '删除', tag: '标签', group_join: '入群', group_leave: '退群', crm_link: 'CRM', message: '消息' }
  return map[type] || type
}

const getEventTagType = (type: string) => {
  const map: Record<string, string> = { add: 'success', delete: 'danger', tag: '', group_join: 'success', group_leave: 'warning', crm_link: '', message: 'info' }
  return (map[type] || 'info') as any
}

watch(() => props.configId, () => { fetchTimeline() })
onMounted(() => { fetchTimeline() })
</script>

<style scoped lang="scss">
.timeline-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px; }
.timeline-header h4 { margin: 0; font-size: 16px; font-weight: 600; }
.timeline-actions { display: flex; gap: 8px; align-items: center; }

.event-card { padding: 8px 12px; background: #fff; border: 1px solid #f0f1f3; border-radius: 8px; }
.event-card-header { display: flex; align-items: center; gap: 6px; margin-bottom: 6px; }
.event-icon { width: 24px; height: 24px; border-radius: 50%; background: #f0f2f5; display: inline-flex; align-items: center; justify-content: center; font-size: 12px; font-weight: 700; color: #606266; }
.event-title { font-weight: 600; color: #1F2937; font-size: 14px; }
.event-desc { color: #6B7280; font-size: 13px; margin-bottom: 4px; }
.event-participants { font-size: 12px; color: #909399; }
.event-user { color: #409EFF; font-weight: 500; }
.event-arrow { color: #c0c4cc; margin: 0 4px; }
.event-detail { margin-top: 8px; }
.event-detail-content { background: #F9FAFB; padding: 8px 12px; border-radius: 6px; margin-top: 4px; font-size: 12px; color: #4B5563; }

.pagination-wrapper { margin-top: 16px; display: flex; justify-content: flex-end; }
</style>
