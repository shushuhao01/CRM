<template>
  <div class="activities-page">
    <el-card shadow="never" class="activities-card">
      <template #header>
        <div class="card-header">
          <div class="header-left">
            <el-button type="primary" link @click="router.push('/')">
              <el-icon><ArrowLeft /></el-icon>返回仪表盘
            </el-button>
            <span class="title">全部动态</span>
          </div>
          <el-button type="primary" link size="small" @click="fetchData" :loading="loading">刷新</el-button>
        </div>
      </template>

      <div v-if="activities.length > 0" class="activity-timeline">
        <div v-for="item in activities" :key="item.id" class="activity-item">
          <div class="activity-dot" :style="{ background: item.color || '#409eff' }"></div>
          <div class="activity-content">
            <span class="activity-title">{{ item.title }}</span>
            <span class="activity-time">{{ formatDate(item.time) }}</span>
          </div>
        </div>
      </div>
      <el-empty v-else-if="!loading" description="暂无动态" :image-size="80" />

      <div v-if="pagination.total > 0" class="pagination-wrapper">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.pageSize"
          :total="pagination.total"
          :page-sizes="[10, 20, 50]"
          layout="total, sizes, prev, pager, next"
          @size-change="fetchData"
          @current-change="fetchData"
        />
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ArrowLeft } from '@element-plus/icons-vue'
import { adminApi } from '@/api/admin'

const router = useRouter()
const loading = ref(false)
const activities = ref<any[]>([])

const pagination = reactive({
  page: 1,
  pageSize: 10,
  total: 0
})

const formatDate = (date: string) => new Date(date).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })

const fetchData = async () => {
  loading.value = true
  try {
    const res = await adminApi.getDashboardActivitiesPaginated({
      page: pagination.page,
      pageSize: pagination.pageSize
    })
    if (res.data) {
      activities.value = res.data.items || []
      pagination.total = res.data.total || 0
    }
  } catch (error) {
    console.error('获取动态失败:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  fetchData()
})
</script>

<style scoped lang="scss">
.activities-page {
  min-height: 100%;
}

.activities-card {
  border-radius: 12px;
  border: none;

  :deep(.el-card__header) {
    border-bottom: 1px solid #f0f0f0;
    padding: 16px 20px;
  }

  :deep(.el-card__body) {
    padding: 20px;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;

  .header-left {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .title {
    font-size: 16px;
    font-weight: 600;
    color: #303133;
  }
}

.activity-timeline {
  .activity-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px 0;
    border-bottom: 1px solid #f8f8f8;

    &:last-child {
      border-bottom: none;
    }
  }

  .activity-dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
    margin-top: 5px;
    flex-shrink: 0;
  }

  .activity-content {
    flex: 1;
    display: flex;
    justify-content: space-between;
    align-items: center;
    min-width: 0;
  }

  .activity-title {
    font-size: 14px;
    color: #303133;
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .activity-time {
    font-size: 12px;
    color: #c0c4cc;
    margin-left: 12px;
    white-space: nowrap;
  }
}

.pagination-wrapper {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid #f0f0f0;
  padding-top: 16px;
}

@media screen and (max-width: 768px) {
  .activity-timeline .activity-content {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }

  .activity-timeline .activity-time {
    margin-left: 0;
  }
}
</style>

