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

    <div class="pagination-bar" v-if="total > pageSize">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="total"
        layout="total, prev, pager, next"
        small
        @current-change="fetchData"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from 'vue'
import { getAcquisitionLinkLogs } from '@/api/wecom'

const props = defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = 15
const total = ref(0)
const logs = ref<Array<{ time: string; operator: string; content: string }>>([])

const paginatedLogs = computed(() => logs.value)

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const res: any = await getAcquisitionLinkLogs(props.linkId, {
      page: currentPage.value,
      pageSize
    })
    const data = res?.data || res
    logs.value = data?.logs || []
    total.value = data?.total || logs.value.length
  } catch (e) {
    console.error('[LinkDetailLogs] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

watch(() => props.linkId, () => {
  currentPage.value = 1
  fetchData()
}, { immediate: true })
</script>

<style scoped>
.link-detail-logs { padding: 0; }
.pagination-bar { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
