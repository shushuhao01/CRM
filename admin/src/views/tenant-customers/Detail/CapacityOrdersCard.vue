<template>
  <el-card shadow="never" class="info-card">
    <template #header>
      <div class="card-header">
        <span>扩容记录
          <el-tag size="small" style="margin-left: 8px;">共 {{ pagination.total }} 条</el-tag>
        </span>
        <el-button size="small" @click="$emit('refresh')">刷新</el-button>
      </div>
    </template>
    <el-table :data="orders" stripe v-loading="loading" style="width: 100%" table-layout="fixed">
      <el-table-column type="index" label="#" width="50" />
      <el-table-column prop="order_no" label="订单号" min-width="200" show-overflow-tooltip />
      <el-table-column label="扩容类型" width="110" align="center">
        <template #default="{ row }">
          <el-tag :type="row.type === 'user' ? 'primary' : 'success'" size="small" effect="plain">
            {{ row.type === 'user' ? '用户数' : '存储空间' }}
          </el-tag>
        </template>
      </el-table-column>
      <el-table-column label="数量" width="100" align="center">
        <template #default="{ row }">
          <span style="font-weight: 600;">{{ row.quantity }}</span>
          <span style="font-size: 12px; color: #909399; margin-left: 2px;">{{ row.type === 'user' ? '人' : 'GB' }}</span>
        </template>
      </el-table-column>
      <el-table-column label="单价" width="100" align="right">
        <template #default="{ row }">
          <span>¥{{ Number(row.unit_price || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="总金额" width="110" align="right">
        <template #default="{ row }">
          <span style="color: #e6a23c; font-weight: 600;">¥{{ Number(row.total_amount || 0).toFixed(2) }}</span>
        </template>
      </el-table-column>
      <el-table-column label="计费周期" width="100" align="center">
        <template #default="{ row }">{{ getCapacityBillingText(row.billing_cycle) }}</template>
      </el-table-column>
      <el-table-column label="支付方式" width="100">
        <template #default="{ row }">{{ getBillPayTypeText(row.pay_type) }}</template>
      </el-table-column>
      <el-table-column label="状态" width="90" align="center">
        <template #default="{ row }">
          <el-tag :type="getCapacityStatusType(row.status)" size="small">{{ getCapacityStatusText(row.status) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="支付时间" width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ row.paid_at ? formatDateTime(row.paid_at) : '-' }}</template>
      </el-table-column>
      <el-table-column label="创建时间" width="170" show-overflow-tooltip>
        <template #default="{ row }">{{ formatDateTime(row.created_at) }}</template>
      </el-table-column>
    </el-table>
    <div class="pagination-wrapper" v-if="pagination.total > pagination.pageSize">
      <el-pagination
        v-model:current-page="pagination.page"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, prev, pager, next"
        small
        @current-change="$emit('refresh')"
      />
    </div>
    <el-empty v-if="!loading && orders.length === 0" description="暂无扩容记录" />
  </el-card>
</template>

<script setup lang="ts">
import {
  formatDateTime, getBillPayTypeText,
  getCapacityBillingText, getCapacityStatusType, getCapacityStatusText
} from './helpers'

defineProps<{
  orders: any[]
  loading: boolean
  pagination: { page: number; pageSize: number; total: number }
}>()

defineEmits<{
  'refresh': []
}>()
</script>

<style scoped>
.info-card { border-radius: 8px; border: none; }
.info-card :deep(.el-card__header) { padding: 12px 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; font-weight: 500; }
.pagination-wrapper { display: flex; justify-content: flex-end; margin-top: 12px; }
</style>

