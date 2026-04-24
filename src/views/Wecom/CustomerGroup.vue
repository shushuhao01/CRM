<template>
  <div class="wecom-customer-group">
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <!-- V4 增强统计卡片 -->
    <div class="v4-stats-row">
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #EEF2FF; color: #4C6EF5">👥</div>
        <div class="stat-body">
          <div class="stat-num">{{ displayStats.totalGroups }}</div>
          <div class="stat-label">群总数</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #ECFDF5; color: #10B981">🔥</div>
        <div class="stat-body">
          <div class="stat-num success">{{ displayStats.activeGroups }}</div>
          <div class="stat-label">活跃群</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #F5F3FF; color: #7C3AED">📊</div>
        <div class="stat-body">
          <div class="stat-num purple">{{ displayStats.totalMembers }}</div>
          <div class="stat-label">总成员数</div>
        </div>
      </div>
      <div class="v4-stat-card">
        <div class="stat-icon" style="background: #FFFBEB; color: #F59E0B">💬</div>
        <div class="stat-body">
          <div class="stat-num primary">{{ displayStats.todayMsgCount || 0 }}</div>
          <div class="stat-label">今日消息</div>
        </div>
      </div>
    </div>

    <el-card>
      <template #header>
        <WecomHeader tab-name="customer-group">
          客户群
          <template #actions>
            <el-select v-model="query.configId" placeholder="选择企微配置" clearable style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="success" :loading="syncing" @click="handleSync" size="small">
              <el-icon><Refresh /></el-icon> 同步
            </el-button>
            <!-- 卡片/列表模式切换 -->
            <el-radio-group v-model="viewMode" size="small">
              <el-radio-button label="list"><el-icon><List /></el-icon></el-radio-button>
              <el-radio-button label="card"><el-icon><Grid /></el-icon></el-radio-button>
            </el-radio-group>
          </template>
        </WecomHeader>
      </template>

      <!-- 6 Tab 结构 -->
      <el-tabs v-model="activeTab">
        <!-- Tab 1: 群管理 -->
        <el-tab-pane label="群管理" name="manage">
          <!-- 搜索筛选 -->
          <div class="tab-actions">
            <el-input v-model="query.keyword" placeholder="搜索群名" clearable style="width: 180px" @keyup.enter="fetchList" prefix-icon="Search" />
            <el-select v-model="query.status" placeholder="状态" clearable style="width: 100px" @change="fetchList">
              <el-option label="正常" value="normal" />
              <el-option label="已解散" value="dismissed" />
            </el-select>
            <el-button type="primary" size="small" @click="fetchList">搜索</el-button>
          </div>

          <!-- 卡片模式 -->
          <div v-if="viewMode === 'card'" class="card-grid">
            <GroupCard
              v-for="g in filteredGroups"
              :key="g.id || g.chatId"
              :group="g"
              @detail="handleDetail(g)"
              @members="handleDetail(g)"
              @stats="handleDetail(g)"
            />
            <el-empty v-if="filteredGroups.length === 0" description="暂无群数据" />
          </div>

          <!-- 列表模式 -->
          <div v-else>
            <el-table :data="filteredGroups" v-loading="loading" stripe>
              <el-table-column label="群名称" min-width="180">
                <template #default="{ row }">
                  <div class="group-name-cell">
                    <el-icon style="color: #4C6EF5"><ChatDotRound /></el-icon>
                    <span class="g-name">{{ row.name || '未命名群' }}</span>
                  </div>
                </template>
              </el-table-column>
              <el-table-column label="群主" width="100">
                <template #default="{ row }">{{ row.ownerUserName || row.ownerUserId || '-' }}</template>
              </el-table-column>
              <el-table-column prop="memberCount" label="成员数" width="80" align="center" sortable />
              <el-table-column label="今日消息" width="100" align="center" sortable :sort-by="'todayMsgCount'">
                <template #default="{ row }">
                  <span class="msg-highlight">{{ row.todayMsgCount || 0 }}</span>
                </template>
              </el-table-column>
              <el-table-column label="活跃度" width="100">
                <template #default="{ row }">
                  <el-progress :percentage="row.activityRate || 0" :stroke-width="8" :show-text="false"
                    :color="(row.activityRate || 0) >= 70 ? '#10B981' : (row.activityRate || 0) >= 40 ? '#F59E0B' : '#EF4444'" />
                </template>
              </el-table-column>
              <el-table-column label="创建时间" width="130">
                <template #default="{ row }">{{ formatDate(row.createTime) }}</template>
              </el-table-column>
              <el-table-column label="操作" width="170" fixed="right">
                <template #default="{ row }">
                  <el-button type="primary" link size="small" @click="handleDetail(row)">详情</el-button>
                  <el-button type="success" link size="small" @click="handleDetail(row)">成员</el-button>
                  <el-button link size="small" @click="handleDetail(row)">统计</el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-pagination
              v-if="total > 0"
              :current-page="query.page"
              :page-size="query.pageSize"
              :total="total"
              layout="total, prev, pager, next"
              style="margin-top: 16px; justify-content: flex-end"
              @current-change="(p: number) => { query.page = p; fetchList() }"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 2: 群模板 -->
        <el-tab-pane label="群模板" name="template">
          <GroupTemplate />
        </el-tab-pane>

        <!-- Tab 3: 入群欢迎语 -->
        <el-tab-pane label="入群欢迎语" name="welcome">
          <GroupWelcome />
        </el-tab-pane>

        <!-- Tab 4: 防骚扰规则 -->
        <el-tab-pane label="防骚扰规则" name="anti-spam">
          <AntiSpamRules />
        </el-tab-pane>

        <!-- Tab 5: 群发消息 -->
        <el-tab-pane label="群发消息" name="broadcast">
          <GroupBroadcast />
        </el-tab-pane>

        <!-- Tab 6: 群数据 -->
        <el-tab-pane label="群数据" name="stats">
          <GroupStats :config-id="query.configId" :is-demo-mode="isDemoMode" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 群详情抽屉 -->
    <GroupDetailDrawer
      v-if="detailVisible"
      :group="currentGroup"
      :members="detailMembers"
      @close="detailVisible = false"
    />
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomCustomerGroup' })

import { ref, reactive, computed, onMounted } from 'vue'
import { Refresh, ChatDotRound, List, Grid } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getWecomConfigs } from '@/api/wecom'
import {
  getWecomCustomerGroups,
  getWecomCustomerGroupDetail,
  getWecomCustomerGroupStats,
  syncWecomCustomerGroups
} from '@/api/wecomGroup'
import { formatDateTime } from '@/utils/date'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import GroupDetailDrawer from './components/GroupDetailDrawer.vue'
import GroupCard from './components/GroupCard.vue'
import GroupTemplate from './components/GroupTemplate.vue'
import GroupWelcome from './components/GroupWelcome.vue'
import AntiSpamRules from './components/AntiSpamRules.vue'
import GroupBroadcast from './components/GroupBroadcast.vue'
import GroupStats from './components/GroupStats.vue'
import { useWecomDemo, DEMO_GROUPS, DEMO_GROUP_STATS, DEMO_GROUP_MEMBERS, DEMO_CONFIGS } from './composables/useWecomDemo'

const { isDemoMode } = useWecomDemo()

// 状态
const loading = ref(false)
const syncing = ref(false)
const configList = ref<any[]>([])
const groupList = ref<any[]>([])
const total = ref(0)
const detailVisible = ref(false)
const currentGroup = ref<any>(null)
const detailMembers = ref<any[]>([])
const activeTab = ref('manage')
const viewMode = ref<'list' | 'card'>('list')

const query = reactive({
  configId: undefined as number | undefined,
  keyword: '',
  status: '',
  page: 1,
  pageSize: 20
})

const stats = reactive({
  totalGroups: 0, activeGroups: 0, dismissedGroups: 0,
  totalMembers: 0, avgMembers: 0, todayMsgCount: 0
})

// 显示数据
const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

const displayGroups = computed(() => {
  if (groupList.value.length > 0 || !isDemoMode.value) return groupList.value
  return DEMO_GROUPS
})

const displayStats = computed(() => {
  if (!isDemoMode.value) return stats
  return DEMO_GROUP_STATS
})

const filteredGroups = computed(() => {
  let list = displayGroups.value
  if (query.keyword) {
    const kw = query.keyword.toLowerCase()
    list = list.filter((g: any) => (g.name || '').toLowerCase().includes(kw))
  }
  if (query.status) {
    list = list.filter((g: any) => g.status === query.status)
  }
  return list
})

// 工具函数
const formatDate = (d: string) => d ? formatDateTime(d) : '-'

// 数据获取
const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configList.value = Array.isArray(res) ? res : []
    if (configList.value.length > 0 && !query.configId) {
      query.configId = configList.value[0].id
    }
  } catch { /* ignore */ }
}

const fetchList = async () => {
  loading.value = true
  try {
    const res: any = await getWecomCustomerGroups(query)
    groupList.value = res?.list || []
    total.value = res?.total || 0
  } catch { groupList.value = []; total.value = 0 }
  finally { loading.value = false }
}

const fetchStats = async () => {
  try {
    const res: any = await getWecomCustomerGroupStats(query.configId)
    if (res) Object.assign(stats, res)
  } catch { /* ignore */ }
}

const handleConfigChange = () => { query.page = 1; fetchList(); fetchStats() }

const handleSync = async () => {
  if (!query.configId) { ElMessage.warning('请先选择企微配置'); return }
  syncing.value = true
  try {
    const res: any = await syncWecomCustomerGroups(query.configId)
    ElMessage.success(res?.message || '同步完成')
    fetchList(); fetchStats()
  } catch (e: any) { ElMessage.error(e?.message || '同步失败') }
  finally { syncing.value = false }
}

const handleDetail = async (row: any) => {
  if (row._demo) {
    currentGroup.value = row
    detailMembers.value = DEMO_GROUP_MEMBERS
    detailVisible.value = true
    return
  }
  try {
    const res: any = await getWecomCustomerGroupDetail(row.id)
    if (res) {
      currentGroup.value = res
      detailMembers.value = Array.isArray(res.memberList) ? res.memberList : []
      detailVisible.value = true
    }
  } catch { ElMessage.error('获取详情失败') }
}

onMounted(async () => {
  await fetchConfigs()
  if (query.configId) { fetchList(); fetchStats() }
})
</script>

<style scoped lang="scss">
.wecom-customer-group { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }

/* V4 统计卡片 */
.v4-stat-card {
  display: flex; align-items: center; gap: 16px;
}
.v4-stat-card .stat-icon {
  width: 44px; height: 44px; border-radius: 10px;
  display: flex; align-items: center; justify-content: center;
  font-size: 20px; flex-shrink: 0;
}
.v4-stat-card .stat-body { flex: 1; }
.v4-stat-card .stat-num { font-size: 26px; font-weight: 700; color: #1F2937; line-height: 1.2; }
.v4-stat-card .stat-num.success { color: #10B981; }
.v4-stat-card .stat-num.primary { color: #4C6EF5; }
.v4-stat-card .stat-num.purple { color: #7C3AED; }
.v4-stat-card .stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }

.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }

/* V4 卡片网格 */
.card-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 16px; }

/* 列表模式 */
.group-name-cell { display: flex; align-items: center; gap: 6px; }
.g-name { font-weight: 400; color: #1F2937; }
.msg-highlight { font-weight: 700; color: #4C6EF5; }
</style>

