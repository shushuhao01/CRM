<template>
  <div class="link-detail-customers">
    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-select v-model="filters.status" placeholder="开口状态" style="width: 130px" clearable @change="fetchData">
        <el-option label="全部" value="" />
        <el-option label="已开口" value="talked" />
        <el-option label="未开口" value="not_talked" />
        <el-option label="已流失" value="lost" />
      </el-select>
      <el-select v-model="filters.dateRange" placeholder="添加时间" style="width: 120px">
        <el-option label="全部" value="" />
        <el-option label="今日" value="today" />
        <el-option label="近7天" value="7d" />
        <el-option label="近30天" value="30d" />
      </el-select>
      <el-select v-model="filters.followUser" placeholder="跟进人" style="width: 120px" clearable @change="fetchData">
        <el-option v-for="u in followUsers" :key="u" :label="u" :value="u" />
      </el-select>
      <div style="flex: 1" />
      <span class="result-count">共 {{ total }} 位客户</span>
    </div>

    <!-- 客户表格 -->
    <el-table :data="customerList" v-loading="loading" stripe>
      <el-table-column label="客户" min-width="180">
        <template #default="{ row }">
          <div class="customer-cell">
            <el-avatar :size="32" :src="row.avatar">{{ (row.remark || row.nickname || row.name || '?').charAt(0) }}</el-avatar>
            <div class="customer-info">
              <span class="customer-name">{{ row.remark || row.name }}</span>
              <span v-if="row.nickname && row.nickname !== row.name" class="customer-nickname">{{ row.nickname }}</span>
            </div>
          </div>
        </template>
      </el-table-column>
      <el-table-column label="客户ID" width="140">
        <template #default="{ row }">
          <span style="color: #9CA3AF; font-size: 12px">{{ row.externalUserId }}</span>
        </template>
      </el-table-column>
      <el-table-column label="添加时间" width="160">
        <template #default="{ row }">
          <span style="color: #6B7280">{{ row.addTime }}</span>
        </template>
      </el-table-column>
      <el-table-column label="开口状态" width="130">
        <template #default="{ row }">
          <el-tag
            :type="row.talkStatus === 'talked' ? 'success' : row.talkStatus === 'lost' ? 'danger' : 'info'"
            size="small"
          >
            {{ statusText(row) }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="开口时间" width="160">
        <template #default="{ row }">
          <span v-if="row.talkTime && row.talkTime !== '有开口记录'" style="color: #6B7280">{{ row.talkTime }}</span>
          <el-tag v-else-if="row.talkStatus === 'talked'" type="success" size="small">有开口记录</el-tag>
          <span v-else style="color: #D1D5DB">-</span>
        </template>
      </el-table-column>
      <el-table-column label="跟进人" width="120">
        <template #default="{ row }">
          <span>{{ row.followUser }}</span>
        </template>
      </el-table-column>
    </el-table>

    <!-- 分页 -->
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
import { ref, reactive, computed, watch, onMounted } from 'vue'
import { getAcquisitionLinkCustomers, getContactWayCustomers } from '@/api/wecom'
import type { AcquisitionLinkCustomer } from '../types'

const props = withDefaults(defineProps<{
  linkId: number
  isDemoMode: boolean
  type?: 'acquisition' | 'contactway'
}>(), { type: 'acquisition' })

const loading = ref(false)
const currentPage = ref(1)
const pageSize = 10
const total = ref(0)
const customerList = ref<AcquisitionLinkCustomer[]>([])

const filters = reactive({
  status: '',
  dateRange: '',
  followUser: ''
})

const followUsers = computed(() => {
  const set = new Set(customerList.value.map(c => c.followUser))
  return Array.from(set)
})

const fetchData = async () => {
  if (props.isDemoMode) return
  loading.value = true
  try {
    const params = {
      status: filters.status || undefined,
      dateRange: filters.dateRange || undefined,
      followUser: filters.followUser || undefined,
      page: currentPage.value,
      pageSize
    }
    const res: any = props.type === 'contactway'
      ? await getContactWayCustomers(props.linkId, params)
      : await getAcquisitionLinkCustomers(props.linkId, params)
    const data = res?.data || res
    customerList.value = data?.customers || data?.list || []
    total.value = data?.total || customerList.value.length
  } catch (e) {
    console.error('[LinkDetailCustomers] Fetch error:', e)
  } finally {
    loading.value = false
  }
}

const statusText = (row: AcquisitionLinkCustomer) => {
  if (row.talkStatus === 'talked') return `已开口(${row.talkCount}句)`
  if (row.talkStatus === 'lost') return '已流失'
  return '未开口'
}

watch(() => props.linkId, () => {
  currentPage.value = 1
  fetchData()
}, { immediate: true })
</script>

<style scoped>
.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.result-count { font-size: 13px; color: #9CA3AF; }
.customer-cell { display: flex; align-items: center; gap: 10px; }
.customer-cell :deep(.el-avatar) { border-radius: 50% !important; width: 32px; height: 32px; flex-shrink: 0; }
.customer-cell :deep(.el-avatar img) { border-radius: 50%; object-fit: cover; width: 100%; height: 100%; }
.customer-info { display: flex; flex-direction: column; }
.customer-name { font-weight: 600; color: #1F2937; font-size: 14px; }
.customer-nickname { font-size: 12px; color: #9CA3AF; margin-top: 2px; }
.pagination-bar { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>
