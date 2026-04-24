<template>
  <div class="link-detail-customers">
    <!-- 筛选条件 -->
    <div class="filter-bar">
      <el-select v-model="filters.status" placeholder="开口状态" style="width: 130px" clearable>
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
      <el-select v-model="filters.followUser" placeholder="跟进人" style="width: 120px" clearable>
        <el-option v-for="u in followUsers" :key="u" :label="u" :value="u" />
      </el-select>
      <div style="flex: 1" />
      <span class="result-count">共 {{ filteredList.length }} 位客户</span>
    </div>

    <!-- 客户表格 -->
    <el-table :data="paginatedList" v-loading="loading" stripe>
      <el-table-column label="客户" min-width="160">
        <template #default="{ row }">
          <div class="customer-cell">
            <el-avatar :size="32" :src="row.avatar">{{ row.name?.charAt(0) }}</el-avatar>
            <span class="customer-name">{{ row.name }}</span>
          </div>
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
          <span v-if="row.talkTime" style="color: #6B7280">{{ row.talkTime }}</span>
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
    <div class="pagination-bar" v-if="filteredList.length > pageSize">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="filteredList.length"
        layout="total, prev, pager, next"
        small
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed } from 'vue'
import type { AcquisitionLinkCustomer } from '../types'

defineProps<{
  linkId: number
  isDemoMode: boolean
}>()

const loading = ref(false)
const currentPage = ref(1)
const pageSize = 10

const filters = reactive({
  status: '',
  dateRange: '',
  followUser: ''
})

// 示例数据
const demoCustomers: AcquisitionLinkCustomer[] = [
  { id: 1, name: '张先生', avatar: '', addTime: '2026-04-15 09:23', talkStatus: 'talked', talkCount: 8, talkTime: '2026-04-15 09:25', followUser: '王销售' },
  { id: 2, name: '李女士', avatar: '', addTime: '2026-04-15 10:15', talkStatus: 'talked', talkCount: 3, talkTime: '2026-04-15 10:45', followUser: '陈经理' },
  { id: 3, name: '赵总', avatar: '', addTime: '2026-04-15 11:02', talkStatus: 'not_talked', talkCount: 0, followUser: '王销售' },
  { id: 4, name: '刘经理', avatar: '', addTime: '2026-04-14 14:30', talkStatus: 'talked', talkCount: 12, talkTime: '2026-04-14 14:31', followUser: '张客服' },
  { id: 5, name: '孙先生', avatar: '', addTime: '2026-04-14 16:20', talkStatus: 'lost', talkCount: 0, followUser: '王销售' },
  { id: 6, name: '周女士', avatar: '', addTime: '2026-04-13 09:10', talkStatus: 'talked', talkCount: 5, talkTime: '2026-04-13 09:30', followUser: '陈经理' },
  { id: 7, name: '吴总', avatar: '', addTime: '2026-04-13 11:45', talkStatus: 'not_talked', talkCount: 0, followUser: '张客服' },
  { id: 8, name: '郑先生', avatar: '', addTime: '2026-04-12 08:50', talkStatus: 'talked', talkCount: 15, talkTime: '2026-04-12 08:52', followUser: '王销售' },
  { id: 9, name: '王小姐', avatar: '', addTime: '2026-04-12 15:30', talkStatus: 'lost', talkCount: 1, talkTime: '2026-04-12 16:00', followUser: '陈经理' },
  { id: 10, name: '冯经理', avatar: '', addTime: '2026-04-11 10:00', talkStatus: 'talked', talkCount: 6, talkTime: '2026-04-11 10:05', followUser: '张客服' },
  { id: 11, name: '陈先生', avatar: '', addTime: '2026-04-10 13:20', talkStatus: 'not_talked', talkCount: 0, followUser: '王销售' },
  { id: 12, name: '杨女士', avatar: '', addTime: '2026-04-10 17:00', talkStatus: 'talked', talkCount: 2, talkTime: '2026-04-10 17:30', followUser: '陈经理' },
]

const customerList = ref<AcquisitionLinkCustomer[]>(demoCustomers)

const followUsers = computed(() => {
  const set = new Set(customerList.value.map(c => c.followUser))
  return Array.from(set)
})

const filteredList = computed(() => {
  let list = customerList.value
  if (filters.status) {
    list = list.filter(c => c.talkStatus === filters.status)
  }
  if (filters.followUser) {
    list = list.filter(c => c.followUser === filters.followUser)
  }
  return list
})

const paginatedList = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredList.value.slice(start, start + pageSize)
})

const statusText = (row: AcquisitionLinkCustomer) => {
  if (row.talkStatus === 'talked') return `已开口(${row.talkCount}句)`
  if (row.talkStatus === 'lost') return '已流失'
  return '未开口'
}
</script>

<style scoped>
.filter-bar { display: flex; gap: 10px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.result-count { font-size: 13px; color: #9CA3AF; }
.customer-cell { display: flex; align-items: center; gap: 10px; }
.customer-name { font-weight: 600; color: #1F2937; }
.pagination-bar { display: flex; justify-content: flex-end; margin-top: 16px; }
</style>

