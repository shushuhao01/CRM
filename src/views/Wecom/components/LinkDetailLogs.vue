<template>
  <div class="link-detail-logs">
    <el-table :data="paginatedLogs" v-loading="loading" stripe size="small">
      <el-table-column label="时间" width="170">
        <template #default="{ row }">
          <span style="color: #6B7280">{{ row.time }}</span>
        </template>
      </el-table-column>
      <el-table-column label="操作人" width="120">
        <template #default="{ row }">
          <span style="font-weight: 600">{{ row.operator }}</span>
        </template>
      </el-table-column>
      <el-table-column label="事件内容" min-width="300">
        <template #default="{ row }">
          <span>{{ row.content }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div class="pagination-bar" v-if="logs.length > pageSize">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="logs.length"
        layout="total, prev, pager, next"
        small
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'

defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = 15

const logs = ref([
  { time: '2026-04-15 14:30:00', operator: '系统', content: '获客链接统计数据已同步，新增点击 23，新增添加 8' },
  { time: '2026-04-15 10:15:00', operator: '王销售', content: '手动上线成员「张客服」' },
  { time: '2026-04-15 09:00:00', operator: '系统', content: '自动上线规则触发，已上线 3 名成员' },
  { time: '2026-04-14 18:00:00', operator: '系统', content: '非工作时间自动下线规则触发，已下线 4 名成员' },
  { time: '2026-04-14 15:30:00', operator: '陈经理', content: '修改了链接欢迎语内容' },
  { time: '2026-04-14 11:00:00', operator: '系统', content: '成员「李主管」达到每日上限(50人)，已自动下线' },
  { time: '2026-04-14 09:00:00', operator: '系统', content: '自动上线规则触发，已上线 4 名成员' },
  { time: '2026-04-13 16:45:00', operator: '王销售', content: '调整了成员权重配置：王销售(8)、陈经理(6)、张客服(5)' },
  { time: '2026-04-13 14:20:00', operator: '系统', content: '获客链接统计数据已同步，新增点击 18，新增添加 6' },
  { time: '2026-04-13 10:00:00', operator: '陈经理', content: '新增接待成员「李主管」' },
  { time: '2026-04-12 17:30:00', operator: '系统', content: '检测到成员「张客服」30分钟未回复，已降低权重50%' },
  { time: '2026-04-12 09:30:00', operator: '王销售', content: '创建了获客链接「官网首页获客」' },
])

const paginatedLogs = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return logs.value.slice(start, start + pageSize)
})
</script>

<style scoped>
.link-detail-logs { padding: 0; }
.pagination-bar { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>

