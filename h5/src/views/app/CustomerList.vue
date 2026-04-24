<template>
  <div class="page-container">
    <!-- 搜索 -->
    <van-search v-model="keyword" placeholder="搜索客户昵称/备注" shape="round" @search="onSearch" @clear="onSearch" />

    <!-- 筛选+统计 -->
    <div class="filter-bar">
      <div class="filter-left">
        <van-dropdown-menu active-color="#6366f1">
          <van-dropdown-item v-model="filterStatus" :options="statusOptions" @change="onSearch" />
          <van-dropdown-item v-model="filterTag" :options="tagOptions" @change="onSearch" />
        </van-dropdown-menu>
      </div>
      <div class="filter-count">共 {{ totalCount }} 位客户</div>
    </div>

    <!-- 列表 -->
    <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
      <van-list
        v-model:loading="loadingMore"
        :finished="finished"
        finished-text="没有更多了"
        @load="loadMore"
      >
        <div
          v-for="item in customers"
          :key="item.id"
          class="customer-card card"
          @click="goDetail(item.id)"
        >
          <div class="customer-header">
            <div class="avatar-fallback" :style="{ background: getAvatarColor(item.name) }">
              {{ getAvatarChar(item.name) }}
            </div>
            <div class="customer-info">
              <div class="customer-name-row">
                <span class="customer-name">{{ item.name }}</span>
                <van-tag v-if="item.gender === 1" size="mini" color="#eff6ff" text-color="#3b82f6">男</van-tag>
                <van-tag v-else-if="item.gender === 2" size="mini" color="#fdf2f8" text-color="#ec4899">女</van-tag>
              </div>
              <div v-if="item.company" class="customer-company">{{ item.company }}</div>
              <div class="customer-tags">
                <van-tag v-for="tag in (item.tags || []).slice(0, 3)" :key="tag" size="small" round plain type="primary">{{ tag }}</van-tag>
                <van-tag v-if="(item.tags || []).length > 3" size="small" plain>+{{ item.tags.length - 3 }}</van-tag>
              </div>
            </div>
          </div>
          <!-- CRM关联状态 + 底部信息 -->
          <div class="customer-meta">
            <div class="meta-left">
              <div class="meta-item">
                <van-icon name="clock-o" size="12" color="#9ca3af" />
                <span>{{ item.addTime || '-' }}</span>
              </div>
              <div v-if="item.addWayText" class="meta-item">
                <van-icon name="scan" size="12" color="#9ca3af" />
                <span>{{ item.addWayText }}</span>
              </div>
            </div>
            <!-- CRM关联按钮 -->
            <div v-if="item.crmCustomerName" class="crm-badge crm-badge--ok" @click.stop>
              <van-icon name="passed" size="12" /> {{ item.crmCustomerName }}
            </div>
            <div v-else class="crm-badge crm-badge--link" @click.stop="openBindPopup(item)">
              <van-icon name="link-o" size="12" /> 关联CRM
            </div>
          </div>
        </div>

        <van-empty v-if="!loadingMore && customers.length === 0" description="暂无客户数据" />
      </van-list>
    </van-pull-refresh>

    <!-- 关联CRM弹窗 -->
    <van-popup v-model:show="bindPopupVisible" position="bottom" round :style="{ maxHeight: '70vh' }">
      <div class="bind-popup">
        <div class="bind-popup-title">
          关联CRM客户
          <span class="bind-popup-sub">为「{{ bindTarget?.name }}」匹配CRM客户</span>
        </div>
        <!-- 自动匹配提示 -->
        <div v-if="autoMatched" class="auto-match-tip">
          <van-icon name="smile-o" size="16" color="#10b981" />
          <span>系统自动匹配到同名客户，确认关联？</span>
        </div>
        <!-- 搜索 -->
        <van-search v-model="bindKeyword" placeholder="搜索CRM客户名称/手机号" shape="round" @search="searchCrmForBind" @clear="searchCrmForBind" />
        <van-loading v-if="bindSearching" size="20px" style="text-align:center;padding:12px;" />
        <div v-else-if="bindCrmList.length" class="bind-crm-list">
          <div
            v-for="c in bindCrmList"
            :key="c.id"
            class="bind-crm-item"
            :class="{ selected: bindSelectedCrmId === c.id }"
            @click="bindSelectedCrmId = c.id"
          >
            <div class="bind-crm-avatar" :style="{ background: getAvatarColor(c.name) }">{{ getAvatarChar(c.name) }}</div>
            <div class="bind-crm-info">
              <div class="bind-crm-name">{{ c.name }}</div>
              <div class="bind-crm-meta">
                <span v-if="c.phone">{{ c.phone }}</span>
                <span v-if="c.company">{{ c.company }}</span>
              </div>
            </div>
            <van-icon v-if="bindSelectedCrmId === c.id" name="success" color="#10b981" size="18" />
          </div>
        </div>
        <van-empty v-else-if="bindSearched" description="未找到匹配客户" image="search" />
        <div v-if="bindSelectedCrmId" style="padding: 12px 0 0;">
          <van-button type="primary" block round :loading="bindSubmitting" @click="submitBind"
            style="background: linear-gradient(135deg, #60a5fa, #818cf8); border: none;">
            确认关联
          </van-button>
        </div>
      </div>
    </van-popup>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { showToast, showSuccessToast } from 'vant'
import { getCustomers } from '@/api/customer'
import api from '@/api/index'

const router = useRouter()

interface CustomerItem {
  id: string
  name: string
  avatar?: string
  company?: string
  tags?: string[]
  gender?: number
  addTime?: string
  addWayText?: string
  remark?: string
  crmCustomerName?: string
}

const keyword = ref('')
const filterStatus = ref('')
const filterTag = ref('')
const customers = ref<CustomerItem[]>([])
const totalCount = ref(0)
const page = ref(1)
const pageSize = 20
const refreshing = ref(false)
const loadingMore = ref(false)
const finished = ref(false)

const statusOptions = [
  { text: '全部状态', value: '' },
  { text: '正常', value: 'normal' },
  { text: '已删除', value: 'deleted' }
]

const tagOptions = [
  { text: '全部标签', value: '' },
  { text: 'VIP', value: 'VIP' },
  { text: '意向客户', value: '意向客户' },
  { text: '已成交', value: '已成交' }
]

const avatarColors = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#3b82f6', '#ec4899', '#14b8a6']

function getAvatarColor(name: string): string {
  const code = (name || '').charCodeAt(0) || 0
  return avatarColors[code % avatarColors.length]
}

function getAvatarChar(name: string): string {
  return name ? name[name.length - 1] : '?'
}

function goDetail(id: string) {
  router.push(`/app/customer/${id}`)
}

// ========== CRM关联弹窗 ==========
const bindPopupVisible = ref(false)
const bindTarget = ref<CustomerItem | null>(null)
const bindKeyword = ref('')
const bindSearching = ref(false)
const bindSearched = ref(false)
const bindSubmitting = ref(false)
const bindCrmList = ref<any[]>([])
const bindSelectedCrmId = ref<string | null>(null)
const autoMatched = ref(false)

async function openBindPopup(item: CustomerItem) {
  bindTarget.value = item
  bindKeyword.value = item.name || ''
  bindCrmList.value = []
  bindSelectedCrmId.value = null
  bindSearched.value = false
  autoMatched.value = false
  bindPopupVisible.value = true
  // 自动用客户名搜索匹配
  await searchCrmForBind()
  // 如果有同名结果，自动选中第一个
  if (bindCrmList.value.length > 0) {
    const exact = bindCrmList.value.find(c => c.name === item.name)
    if (exact) {
      bindSelectedCrmId.value = exact.id
      autoMatched.value = true
    }
  }
}

async function searchCrmForBind() {
  if (!bindKeyword.value.trim()) return
  bindSearching.value = true
  bindSearched.value = false
  bindSelectedCrmId.value = null
  autoMatched.value = false
  try {
    const { data } = await api.get('/app/crm-customers', {
      params: { keyword: bindKeyword.value }
    })
    if (data?.success) {
      bindCrmList.value = data.data || []
    }
  } catch (e) {
    console.error('[CustomerList] search crm error:', e)
  } finally {
    bindSearching.value = false
    bindSearched.value = true
  }
}

async function submitBind() {
  if (!bindTarget.value || !bindSelectedCrmId.value) return
  bindSubmitting.value = true
  try {
    const { data } = await api.post('/app/bind-crm', {
      wecomCustomerId: bindTarget.value.id,
      crmCustomerId: bindSelectedCrmId.value
    })
    if (data?.success) {
      showSuccessToast('关联成功')
      bindPopupVisible.value = false
      // 刷新列表
      await fetchCustomers(true)
    } else {
      showToast(data?.message || '关联失败')
    }
  } catch (e: any) {
    showToast(e?.response?.data?.message || '关联失败')
  } finally {
    bindSubmitting.value = false
  }
}

async function fetchCustomers(reset = false) {
  if (reset) {
    page.value = 1
    finished.value = false
  }
  try {
    const { data } = await getCustomers({
      page: page.value,
      pageSize,
      keyword: keyword.value,
      status: filterStatus.value,
      tag: filterTag.value
    })
    if (data?.success) {
      const list = data.data?.list || []
      totalCount.value = data.data?.total || 0
      if (reset) {
        customers.value = list
      } else {
        customers.value.push(...list)
      }
      if (list.length < pageSize) {
        finished.value = true
      }
    }
  } catch (e) {
    console.error('[CustomerList] fetch error:', e)
    finished.value = true
  }
}

function onSearch() {
  fetchCustomers(true)
}

function onRefresh() {
  fetchCustomers(true).finally(() => { refreshing.value = false })
}

function loadMore() {
  page.value++
  fetchCustomers().finally(() => { loadingMore.value = false })
}

onMounted(() => fetchCustomers(true))
</script>

<style scoped>
.filter-bar {
  display: flex; align-items: center; justify-content: space-between;
  margin-bottom: 8px; padding: 0 12px;
}
.filter-left { flex: 1; }
.filter-count { font-size: 12px; color: #9ca3af; white-space: nowrap; margin-left: 8px; }
.customer-card { cursor: pointer; transition: transform 0.15s; }
.customer-card:active { transform: scale(0.99); }
.customer-header { display: flex; gap: 12px; align-items: flex-start; }
.customer-info { flex: 1; min-width: 0; }
.customer-name-row { display: flex; align-items: center; gap: 6px; }
.customer-name { font-size: 15px; font-weight: 600; color: #1f2937; }
.customer-company { font-size: 12px; color: #9ca3af; margin-top: 2px; }
.customer-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
.customer-meta {
  margin-top: 10px; padding-top: 8px;
  border-top: 1px solid #f3f4f6;
  display: flex; align-items: center; justify-content: space-between;
}
.meta-left { display: flex; flex-wrap: wrap; gap: 10px; flex: 1; }
.meta-item {
  display: flex; align-items: center; gap: 4px;
  font-size: 12px; color: #6b7280;
}
.avatar-fallback {
  width: 44px; height: 44px; border-radius: 12px; flex-shrink: 0;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 17px; font-weight: 700;
}

/* CRM关联标记 */
.crm-badge {
  display: flex; align-items: center; gap: 3px;
  font-size: 11px; padding: 3px 8px; border-radius: 6px;
  white-space: nowrap; flex-shrink: 0;
}
.crm-badge--ok { background: #ecfdf5; color: #059669; }
.crm-badge--link {
  background: #eff6ff; color: #3b82f6; cursor: pointer;
}
.crm-badge--link:active { opacity: 0.7; }

/* 关联弹窗 */
.bind-popup { padding: 16px; }
.bind-popup-title {
  font-size: 16px; font-weight: 700; color: #1f2937;
  display: flex; flex-direction: column; gap: 4px; margin-bottom: 8px;
}
.bind-popup-sub { font-size: 12px; color: #9ca3af; font-weight: 400; }
.auto-match-tip {
  display: flex; align-items: center; gap: 6px;
  background: #ecfdf5; color: #059669; font-size: 12px;
  padding: 8px 12px; border-radius: 8px; margin-bottom: 8px;
}
.bind-crm-list {
  display: flex; flex-direction: column; gap: 6px;
  max-height: 300px; overflow-y: auto;
}
.bind-crm-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 12px; border-radius: 10px;
  border: 1.5px solid #f3f4f6; cursor: pointer; transition: all 0.15s;
}
.bind-crm-item:active { transform: scale(0.99); }
.bind-crm-item.selected { border-color: #6366f1; background: #f5f3ff; }
.bind-crm-avatar {
  width: 34px; height: 34px; border-radius: 10px;
  color: #fff; display: flex; align-items: center; justify-content: center;
  font-size: 14px; font-weight: 700; flex-shrink: 0;
}
.bind-crm-info { flex: 1; min-width: 0; }
.bind-crm-name { font-size: 14px; font-weight: 600; color: #1f2937; }
.bind-crm-meta {
  display: flex; flex-wrap: wrap; gap: 6px; align-items: center;
  margin-top: 2px; font-size: 12px; color: #9ca3af;
}
</style>
