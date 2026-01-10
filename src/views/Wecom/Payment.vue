<template>
  <div class="wecom-payment">
    <el-card>
      <template #header>
        <div class="card-header">
          <span>对外收款</span>
          <div class="header-actions">
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleSearch">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-select v-model="query.status" placeholder="收款状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="待支付" value="pending" />
              <el-option label="已支付" value="paid" />
              <el-option label="已退款" value="refunded" />
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" value-format="YYYY-MM-DD" style="width: 240px" @change="handleSearch" />
            <el-button type="primary" @click="handleSearch">搜索</el-button>
          </div>
        </div>
      </template>

      <el-table :data="paymentList" v-loading="loading" stripe>
        <el-table-column prop="tradeNo" label="交易单号" min-width="180" />
        <el-table-column label="收款金额" width="120">
          <template #default="{ row }">
            <span class="amount">¥{{ (row.amount / 100).toFixed(2) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="userName" label="收款人" width="100" />
        <el-table-column prop="customerName" label="付款客户" min-width="120" />
        <el-table-column label="状态" width="100">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)">{{ getStatusText(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="支付时间" width="160">
          <template #default="{ row }">{{ formatDate(row.payTime) }}</template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
      </el-table>

      <div class="pagination-wrapper">
        <el-pagination v-model:current-page="query.page" v-model:page-size="query.pageSize" :total="total" :page-sizes="[20, 50, 100]" layout="total, sizes, prev, pager, next" @size-change="fetchList" @current-change="fetchList" />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomPayment' })
import { ref, onMounted } from 'vue'
import { getWecomConfigs, getWecomPayments } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const configList = ref<any[]>([])
const paymentList = ref<any[]>([])
const total = ref(0)
const dateRange = ref<string[]>([])

const query = ref({ configId: null as number | null, status: '', startDate: '', endDate: '', page: 1, pageSize: 20 })

const formatDate = (date: string) => date ? formatDateTime(date) : '-'
const getStatusType = (s: string) => ({ pending: 'warning', paid: 'success', refunded: 'info' }[s] || 'info')
const getStatusText = (s: string) => ({ pending: '待支付', paid: '已支付', refunded: '已退款' }[s] || s)

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = (res.data?.data || []).filter((c: any) => c.isEnabled)
  } catch (e) { console.error(e) }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getWecomPayments(query.value as any)
    paymentList.value = res.data?.data?.list || []
    total.value = res.data?.data?.total || 0
  } catch (e) { console.error(e) } finally { loading.value = false }
}

const handleSearch = () => {
  if (dateRange.value?.length === 2) { query.value.startDate = dateRange.value[0]; query.value.endDate = dateRange.value[1] }
  else { query.value.startDate = ''; query.value.endDate = '' }
  query.value.page = 1
  fetchList()
}

onMounted(() => { fetchConfigs(); fetchList() })
</script>

<style scoped lang="scss">
.wecom-payment { padding: 20px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.amount { font-weight: bold; color: #f56c6c; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
