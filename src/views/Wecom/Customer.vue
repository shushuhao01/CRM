<template>
  <div class="wecom-customer">
    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.todayAdd }}</div>
          <div class="stat-label">今日进粉</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.totalAdd }}</div>
          <div class="stat-label">累计进粉</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.deleted }}</div>
          <div class="stat-label">删除客户</div>
        </el-card>
      </el-col>
      <el-col :span="6">
        <el-card shadow="hover" class="stat-card">
          <div class="stat-value">{{ stats.dealt }}</div>
          <div class="stat-label">成交客户</div>
        </el-card>
      </el-col>
    </el-row>

    <el-card>
      <template #header>
        <div class="card-header">
          <span>企业客户</span>
          <div class="header-actions">
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleSearch">
              <el-option v-for="c in configList" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-input v-model="query.keyword" placeholder="搜索客户名称" clearable style="width: 200px" @keyup.enter="handleSearch" />
            <el-select v-model="query.status" placeholder="客户状态" clearable style="width: 120px" @change="handleSearch">
              <el-option label="正常" value="normal" />
              <el-option label="已删除" value="deleted" />
            </el-select>
            <el-button type="primary" @click="handleSearch">搜索</el-button>
            <el-button type="success" @click="handleSync" :loading="syncing" :disabled="!query.configId">同步客户</el-button>
          </div>
        </div>
      </template>

      <el-table :data="customerList" v-loading="loading" stripe>
        <el-table-column label="客户信息" min-width="180">
          <template #default="{ row }">
            <div class="customer-info">
              <el-avatar :src="row.avatar" :size="40">{{ row.name?.charAt(0) }}</el-avatar>
              <div class="info-text">
                <div class="name">{{ row.name }}</div>
                <div class="corp">{{ row.corpName || '-' }}</div>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="followUserName" label="跟进人" width="100" />
        <el-table-column label="添加方式" width="100">
          <template #default="{ row }">{{ getAddWayText(row.addWay) }}</template>
        </el-table-column>
        <el-table-column label="添加时间" width="160">
          <template #default="{ row }">{{ formatDate(row.addTime) }}</template>
        </el-table-column>
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'normal' ? 'success' : 'danger'">{{ row.status === 'normal' ? '正常' : '已删除' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="成交" width="80">
          <template #default="{ row }">
            <el-tag v-if="row.isDealt" type="warning">已成交</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" min-width="150" show-overflow-tooltip />
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
defineOptions({ name: 'WecomCustomer' })
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getWecomConfigs, getWecomCustomers, getWecomCustomerStats, syncWecomCustomers } from '@/api/wecom'
import { formatDateTime } from '@/utils/date'

const loading = ref(false)
const syncing = ref(false)
const configList = ref<any[]>([])
const customerList = ref<any[]>([])
const total = ref(0)
const stats = ref({ todayAdd: 0, totalAdd: 0, deleted: 0, dealt: 0 })

const query = ref({
  configId: null as number | null,
  keyword: '',
  status: '',
  page: 1,
  pageSize: 20
})

const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const getAddWayText = (way: number) => {
  const map: Record<number, string> = {
    0: '未知', 1: '扫码', 2: '搜索手机号', 3: '名片分享', 4: '群聊', 5: '手机通讯录',
    6: '微信联系人', 7: '来自微信', 8: '安装第三方应用', 9: '搜索邮箱', 10: '视频号添加',
    11: '通过日程参与人', 12: '通过会议参与人', 13: '添加微信好友', 14: '通过智慧硬件',
    201: '内部成员共享', 202: '管理员/负责人分配'
  }
  return map[way] || '其他'
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    console.log('[WecomCustomer] Configs response:', res)
    // res 是 response.data.data，即配置数组
    const configs = Array.isArray(res) ? res : (res?.data || [])
    configList.value = configs.filter((c: any) => c.isEnabled)
  } catch (e) {
    console.error('[WecomCustomer] Fetch configs error:', e)
  }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res = await getWecomCustomers(query.value as any)
    console.log('[WecomCustomer] Customers response:', res)
    // res 是 response.data.data，即 { list: [...], total: number }
    if (res?.list) {
      customerList.value = res.list
      total.value = res.total || 0
    } else {
      customerList.value = []
      total.value = 0
    }
  } catch (e) {
    console.error('[WecomCustomer] Fetch list error:', e)
  } finally {
    loading.value = false
  }
}

const fetchStats = async () => {
  try {
    const res = await getWecomCustomerStats(query.value.configId || undefined)
    console.log('[WecomCustomer] Stats response:', res)
    // res 是 response.data.data，即 { todayAdd, totalAdd, deleted, dealt }
    stats.value = res || { todayAdd: 0, totalAdd: 0, deleted: 0, dealt: 0 }
  } catch (e) {
    console.error('[WecomCustomer] Fetch stats error:', e)
  }
}

const handleSearch = () => {
  query.value.page = 1
  fetchList()
  fetchStats()
}

const handleSync = async () => {
  if (!query.value.configId) {
    ElMessage.warning('请先选择企微配置')
    return
  }
  syncing.value = true
  try {
    const res = await syncWecomCustomers(query.value.configId)
    console.log('[WecomCustomer] Sync response:', res)
    ElMessage.success(res?.message || '同步成功')
    fetchList()
    fetchStats()
  } catch (e: any) {
    console.error('[WecomCustomer] Sync error:', e)
    ElMessage.error(e.message || '同步失败')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  fetchConfigs()
  fetchList()
  fetchStats()
})
</script>

<style scoped lang="scss">
.wecom-customer { padding: 20px; }
.stats-row { margin-bottom: 20px; }
.stat-card { text-align: center; }
.stat-value { font-size: 28px; font-weight: bold; color: #409eff; }
.stat-label { font-size: 14px; color: #909399; margin-top: 8px; }
.card-header { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px; }
.header-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.customer-info { display: flex; align-items: center; gap: 10px; }
.info-text .name { font-weight: 500; }
.info-text .corp { font-size: 12px; color: #909399; }
.pagination-wrapper { margin-top: 20px; display: flex; justify-content: flex-end; }
</style>
