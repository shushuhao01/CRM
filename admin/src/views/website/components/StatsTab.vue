<template>
  <div class="site-panel">
    <div class="sub-toolbar">
      <el-radio-group v-model="days" size="default" @change="onQuickRange">
        <el-radio-button :label="7">近 7 天</el-radio-button>
        <el-radio-button :label="30">近 30 天</el-radio-button>
        <el-radio-button :label="90">近 90 天</el-radio-button>
      </el-radio-group>
      <el-button :type="dateMode === 'custom' ? 'primary' : 'default'" plain @click="toggleCustomPicker">
        <template #icon>
          <el-icon><Calendar /></el-icon>
        </template>
        {{ isCustomRange && customRange ? `${customRange[0]} ~ ${customRange[1]}` : '自定义日期' }}
      </el-button>
      <el-date-picker
        v-if="dateMode === 'custom'"
        ref="customPickerRef"
        v-model="customRange"
        type="daterange"
        value-format="YYYY-MM-DD"
        range-separator="至"
        start-placeholder="开始日期"
        end-placeholder="结束日期"
        style="width: 240px"
        @change="onCustomRange"
      />
      <el-button @click="reload">
        <template #icon>
          <el-icon :class="{ spinning: refreshing }"><Refresh /></el-icon>
        </template>
        刷新
      </el-button>
      <span class="range-tip" v-if="analytics">统计区间：{{ analytics.range.start }} ~ {{ analytics.range.end }}</span>
      <div class="sub-toolbar-right">
        <span class="online-badge" :title="`最近 ${onlineMinutes} 分钟内有访问的访客数`">
          <span class="online-dot"></span>实时在线 {{ onlineCount }}
        </span>
      </div>
    </div>

    <el-tabs v-model="activeTab" class="stats-tabs" @tab-change="onTabChange">
      <!-- ==================== 流量分析 ==================== -->
      <el-tab-pane label="流量分析" name="overview">
        <VisitCharts ref="overviewChartsRef" :analytics="analytics" :days="effectiveRange.days" :loading="loading" />
      </el-tab-pane>

      <!-- ==================== 访问明细 ==================== -->
      <el-tab-pane label="访问明细" name="visits">
        <div class="visit-filter">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            value-format="YYYY-MM-DD"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            style="width: 250px"
          />
          <el-input v-model="filters.ip" placeholder="IP" clearable style="width: 140px" />
          <el-input v-model="filters.path" placeholder="访问路径" clearable style="width: 150px" />
          <el-select v-model="filters.device" placeholder="设备" clearable style="width: 120px">
            <el-option v-for="d in deviceOptions" :key="d.value" :label="d.label" :value="d.value" />
          </el-select>
          <el-select v-model="filters.source" placeholder="来源" clearable style="width: 120px">
            <el-option v-for="s in sourceOptions" :key="s" :label="s" :value="s" />
          </el-select>
          <el-input
            v-model="filters.keyword"
            placeholder="IP / 路径 / 归属地 / UA 关键字"
            clearable
            style="width: 200px"
            @keyup.enter="searchVisits"
          />
          <el-button type="primary" :icon="Search" @click="searchVisits">查询</el-button>
          <el-button @click="resetFilters">重置</el-button>
        </div>

        <el-table v-loading="visitLoading" :data="visits" stripe>
          <el-table-column label="时间" width="170">
            <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
          </el-table-column>
          <el-table-column label="IP" prop="ip" width="140" />
          <el-table-column label="归属地" min-width="150">
            <template #default="{ row }">
              {{ [row.country, row.province, row.city].filter((v) => v && v !== '中国').join(' ') || '-' }}
            </template>
          </el-table-column>
          <el-table-column label="运营商" prop="isp" min-width="100" show-overflow-tooltip />
          <el-table-column label="设备 / 系统 / 浏览器" min-width="200">
            <template #default="{ row }">
              <el-tag size="small" type="info" class="mr4">{{ deviceLabel(row.device) }}</el-tag>
              <span class="dim">{{ [row.os, row.browser].filter(Boolean).join(' · ') || '-' }}</span>
            </template>
          </el-table-column>
          <el-table-column label="来源" prop="source" width="100" />
          <el-table-column label="访问路径" prop="path" min-width="180" show-overflow-tooltip />
          <el-table-column label="来源页" prop="referer" min-width="180" show-overflow-tooltip>
            <template #default="{ row }">{{ row.referer || '直接访问' }}</template>
          </el-table-column>
        </el-table>
        <el-empty v-if="!visits.length && !visitLoading" description="暂无访问明细" />

        <div class="visit-pager">
          <el-pagination
            v-model:current-page="page"
            v-model:page-size="pageSize"
            :total="total"
            :page-sizes="[20, 50, 100]"
            layout="total, sizes, prev, pager, next, jumper"
            background
            @current-change="loadVisits"
            @size-change="searchVisits"
          />
        </div>
      </el-tab-pane>

      <!-- ==================== 渠道链接 ==================== -->
      <el-tab-pane label="渠道链接" name="channels">
        <!-- 渠道列表 -->
        <template v-if="channelView === 'list'">
          <div class="visit-filter">
            <el-input
              v-model="channelKeyword"
              placeholder="名称 / 编码 / 渠道标识"
              clearable
              style="width: 220px"
              @keyup.enter="searchChannels"
            />
            <el-button type="primary" :icon="Search" @click="searchChannels">查询</el-button>
            <el-button type="primary" :icon="Plus" @click="openCreateChannel">新建渠道链接</el-button>
          </div>

          <el-table v-loading="channelLoading" :data="channels" stripe>
            <el-table-column label="渠道名称" min-width="150" show-overflow-tooltip>
              <template #default="{ row }">
                <span class="channel-name-link" @click="openChannelDetail(row)">{{ row.name }}</span>
              </template>
            </el-table-column>
            <el-table-column label="渠道编码" width="130">
              <template #default="{ row }">
                <el-tag size="small" effect="plain">{{ row.code }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="推广短链" min-width="240">
              <template #default="{ row }">
                <span class="short-url" @click="copyText(row.shortUrl, '短链已复制')">{{ row.shortUrl }}</span>
              </template>
            </el-table-column>
            <el-table-column label="渠道标识" prop="channel" width="110" show-overflow-tooltip />
            <el-table-column label="落地页" prop="targetPath" min-width="150" show-overflow-tooltip />
            <el-table-column label="点击 / 去重" width="120" align="right">
              <template #default="{ row }">{{ row.clickCount }} / {{ row.uniqueClickCount }}</template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
              <template #default="{ row }">
                <el-switch
                  v-model="row.enabled"
                  :active-value="1"
                  :inactive-value="0"
                  :loading="!!channelSwitchLoading[row.id]"
                  @change="toggleChannelEnabled(row)"
                />
              </template>
            </el-table-column>
            <el-table-column label="操作" width="160" fixed="right" align="center">
              <template #default="{ row }">
                <span class="op-icons">
                  <el-tooltip content="流量分析" placement="top">
                    <el-button link type="primary" :icon="DataAnalysis" @click="openChannelDetail(row)" />
                  </el-tooltip>
                  <el-tooltip content="二维码" placement="top">
                    <el-button link type="primary" :icon="Picture" @click="openQrcode(row)" />
                  </el-tooltip>
                  <el-tooltip content="编辑" placement="top">
                    <el-button link type="primary" :icon="Edit" @click="openEditChannel(row)" />
                  </el-tooltip>
                  <el-tooltip content="删除" placement="top">
                    <el-button link type="danger" :icon="Delete" @click="removeChannel(row)" />
                  </el-tooltip>
                </span>
              </template>
            </el-table-column>
          </el-table>
          <el-empty v-if="!channels.length && !channelLoading" description="暂无渠道链接" />

          <div class="visit-pager">
            <el-pagination
              v-model:current-page="channelPage"
              v-model:page-size="channelPageSize"
              :total="channelTotal"
              :page-sizes="[20, 50, 100]"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @current-change="loadChannels"
              @size-change="searchChannels"
            />
          </div>
        </template>

        <!-- 渠道分析 -->
        <template v-else>
          <div class="channel-detail-head">
            <el-button link :icon="ArrowLeft" @click="backToChannelList">返回列表</el-button>
            <span class="channel-detail-name">{{ currentChannel?.name }}</span>
            <el-tag size="small" effect="plain">{{ currentChannel?.code }}</el-tag>
            <span class="channel-detail-url" @click="copyText(currentChannel?.shortUrl || '', '短链已复制')">
              {{ currentChannel?.shortUrl }}
            </span>
          </div>

          <el-tabs v-model="channelDetailTab" class="channel-detail-tabs" @tab-change="onChannelDetailTabChange">
            <!-- 渠道流量分析 -->
            <el-tab-pane label="渠道流量分析" name="chart">
              <VisitCharts
                ref="channelChartsRef"
                :analytics="channelAnalytics"
                :days="effectiveRange.days"
                :loading="channelAnalyticsLoading"
              />
            </el-tab-pane>

            <!-- 渠道访问明细 -->
            <el-tab-pane label="渠道访问明细" name="visits">
              <el-card shadow="never" class="chart-card">
                <div class="visit-filter">
                  <el-input v-model="channelFilters.ip" placeholder="IP" clearable style="width: 140px" />
                  <el-input
                    v-model="channelFilters.keyword"
                    placeholder="IP / 路径 / 归属地 / UA 关键字"
                    clearable
                    style="width: 200px"
                    @keyup.enter="searchChannelVisits"
                  />
                  <el-button type="primary" :icon="Search" @click="searchChannelVisits">查询</el-button>
                  <el-button @click="resetChannelFilters">重置</el-button>
                </div>

                <el-table v-loading="channelVisitLoading" :data="channelVisits" stripe>
                  <el-table-column label="时间" width="170">
                    <template #default="{ row }">{{ fmtTime(row.createdAt) }}</template>
                  </el-table-column>
                  <el-table-column label="IP" prop="ip" width="140" />
                  <el-table-column label="归属地" min-width="150">
                    <template #default="{ row }">
                      {{ [row.country, row.province, row.city].filter((v) => v && v !== '中国').join(' ') || '-' }}
                    </template>
                  </el-table-column>
                  <el-table-column label="运营商" prop="isp" min-width="100" show-overflow-tooltip />
                  <el-table-column label="设备 / 系统 / 浏览器" min-width="200">
                    <template #default="{ row }">
                      <el-tag size="small" type="info" class="mr4">{{ deviceLabel(row.device) }}</el-tag>
                      <span class="dim">{{ [row.os, row.browser].filter(Boolean).join(' · ') || '-' }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="访问路径" prop="path" min-width="180" show-overflow-tooltip />
                  <el-table-column label="来源页" prop="referer" min-width="180" show-overflow-tooltip>
                    <template #default="{ row }">{{ row.referer || '直接访问' }}</template>
                  </el-table-column>
                </el-table>
                <el-empty v-if="!channelVisits.length && !channelVisitLoading" description="暂无访问明细" />

                <div class="visit-pager">
                  <el-pagination
                    v-model:current-page="channelVisitPage"
                    v-model:page-size="channelVisitPageSize"
                    :total="channelVisitTotal"
                    :page-sizes="[20, 50, 100]"
                    layout="total, sizes, prev, pager, next, jumper"
                    background
                    @current-change="loadChannelVisits"
                    @size-change="searchChannelVisits"
                  />
                </div>
              </el-card>
            </el-tab-pane>
          </el-tabs>
        </template>
      </el-tab-pane>
    </el-tabs>

    <!-- ==================== 新建 / 编辑渠道链接 ==================== -->
    <el-dialog
      v-model="channelDialogVisible"
      :title="channelDialogMode === 'create' ? '新建渠道链接' : '编辑渠道链接'"
      width="520px"
      destroy-on-close
    >
      <el-form ref="channelFormRef" :model="channelForm" :rules="channelRules" label-width="90px">
        <el-form-item label="渠道名称" prop="name">
          <el-input v-model="channelForm.name" placeholder="如：微博推广 / 春季活动" maxlength="128" />
        </el-form-item>
        <el-form-item label="渠道编码" prop="code">
          <el-input v-model="channelForm.code" placeholder="留空自动生成 6 位随机码（小写字母/数字/_-）" maxlength="32" />
        </el-form-item>
        <el-form-item label="渠道标识" prop="channel">
          <el-input v-model="channelForm.channel" placeholder="可选，如：weibo / wechat / douyin" maxlength="64" />
        </el-form-item>
        <el-form-item label="落地页" prop="targetPath">
          <el-input v-model="channelForm.targetPath" placeholder="如：/ 或 /download" maxlength="255" />
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="channelForm.remark" type="textarea" :rows="2" placeholder="可选" maxlength="512" />
        </el-form-item>
        <el-form-item label="状态">
          <el-switch v-model="channelForm.enabled" :active-value="1" :inactive-value="0" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="channelDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="channelSaving" @click="submitChannel">保存</el-button>
      </template>
    </el-dialog>

    <!-- ==================== 渠道二维码 ==================== -->
    <el-dialog v-model="qrcodeVisible" title="渠道二维码" width="360px">
      <div class="qrcode-box" v-loading="qrcodeLoading">
        <img v-if="qrcodeData?.dataUrl" :src="qrcodeData.dataUrl" alt="渠道二维码" class="qrcode-img" />
        <div v-if="qrcodeData" class="qrcode-url">{{ qrcodeData.url }}</div>
      </div>
      <template #footer>
        <el-button @click="copyText(qrcodeData?.url || '', '短链已复制')">复制短链</el-button>
        <a
          v-if="qrcodeData?.dataUrl"
          class="el-button el-button--primary"
          :href="qrcodeData.dataUrl"
          :download="`channel-${qrcodeData.code}.png`"
        >
          下载二维码
        </a>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { ElMessage, ElMessageBox, type FormInstance, type FormRules } from 'element-plus'
import { Refresh, Search, Plus, Edit, Delete, DataAnalysis, Picture, ArrowLeft, Calendar } from '@element-plus/icons-vue'
import { siteApi, type SiteAnalytics, type SiteVisitLog, type ChannelLink } from '@/api/site'
import VisitCharts from '@/components/VisitCharts.vue'

const days = ref(30)
const customRange = ref<[string, string] | null>(null)
const dateMode = ref<'quick' | 'custom'>('quick')
const customPickerRef = ref()
const activeTab = ref('overview')
const loading = ref(false)
const refreshing = ref(false)
const analytics = ref<SiteAnalytics | null>(null)

// 日期辅助：与后端保持 YYYY-MM-DD 本地时区口径
function fmtYmd(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
function addDays(d: Date, n: number): Date {
  const r = new Date(d)
  r.setDate(r.getDate() + n)
  return r
}
function parseYmd(s: string): Date {
  const [y, m, d] = s.split('-').map((n) => parseInt(n, 10))
  return new Date(y || 1970, (m || 1) - 1, d || 1)
}
function diffDays(a: string, b: string): number {
  return Math.round((parseYmd(b).getTime() - parseYmd(a).getTime()) / 86400000)
}

// 是否处于自定义日期区间
const isCustomRange = computed(
  () => Array.isArray(customRange.value) && customRange.value.length === 2 && !!customRange.value[0] && !!customRange.value[1],
)

// 顶部筛选器对应的有效区间（供图表与明细统一使用）
const effectiveRange = computed(() => {
  if (isCustomRange.value && customRange.value) {
    const [start, end] = customRange.value
    return { days: Math.max(1, diffDays(start, end) + 1), start, end }
  }
  const d = Math.max(1, days.value)
  const end = fmtYmd(new Date())
  const start = fmtYmd(addDays(new Date(), -(d - 1)))
  return { days: d, start, end }
})

// 快捷日期 / 自定义日期切换（二者互斥）
function onQuickRange() {
  dateMode.value = 'quick'
  customRange.value = null
  reload()
}
function toggleCustomPicker() {
  if (dateMode.value === 'custom') {
    // 再次点击：退出自定义，回到快捷日期
    dateMode.value = 'quick'
    customRange.value = null
    days.value = 30
    reload()
    return
  }
  dateMode.value = 'custom'
  days.value = 0
  nextTick(() => customPickerRef.value?.focus?.())
}
function onCustomRange() {
  if (isCustomRange.value) {
    dateMode.value = 'custom'
    days.value = 0
  } else {
    dateMode.value = 'quick'
    days.value = 30
  }
  reload()
}

// 实时在线（最近 N 分钟内有访问行为的去重访客）
const onlineMinutes = 5
const onlineCount = ref(0)
let onlineTimer: number | undefined

const DEVICE_LABEL: Record<string, string> = {
  desktop: '桌面端',
  mobile: '移动端',
  tablet: '平板',
  bot: '机器人',
  unknown: '未知',
}
const deviceOptions = [
  { label: '桌面端', value: 'desktop' },
  { label: '移动端', value: 'mobile' },
  { label: '平板', value: 'tablet' },
  { label: '机器人', value: 'bot' },
  { label: '未知', value: 'unknown' },
]
function deviceLabel(v: string): string {
  return DEVICE_LABEL[v] || v || '未知'
}

const sourceOptions = computed(() => (analytics.value?.sources || []).map((s) => s.name))

const overviewChartsRef = ref<InstanceType<typeof VisitCharts>>()
const channelChartsRef = ref<InstanceType<typeof VisitCharts>>()
const channelDetailTab = ref<'chart' | 'visits'>('chart')

function onTabChange(name: string | number) {
  nextTick(() => {
    if (name === 'overview') {
      overviewChartsRef.value?.resize()
    } else if (name === 'channels') {
      if (channelView.value === 'list') {
        if (!channelsLoaded.value) loadChannels()
      } else if (channelDetailTab.value === 'chart') {
        channelChartsRef.value?.resize()
      }
    }
  })
}

function onChannelDetailTabChange(name: string | number) {
  nextTick(() => {
    if (name === 'chart') channelChartsRef.value?.resize()
  })
}

// ==================== 访问明细 ====================

const visits = ref<SiteVisitLog[]>([])
const visitLoading = ref(false)
const page = ref(1)
const pageSize = ref(20)
const total = ref(0)
const filters = ref<{ dateRange: [string, string] | null; ip: string; path: string; device: string; source: string; keyword: string }>({
  dateRange: null,
  ip: '',
  path: '',
  device: '',
  source: '',
  keyword: '',
})

async function loadVisits() {
  visitLoading.value = true
  try {
    const res = await siteApi.getVisitLogs({
      page: page.value,
      pageSize: pageSize.value,
      ip: filters.value.ip || undefined,
      path: filters.value.path || undefined,
      device: filters.value.device || undefined,
      source: filters.value.source || undefined,
      keyword: filters.value.keyword || undefined,
      start: filters.value.dateRange?.[0],
      end: filters.value.dateRange?.[1],
    })
    visits.value = res.data?.list || []
    total.value = res.data?.total || 0
  } finally {
    visitLoading.value = false
  }
}

function searchVisits() {
  page.value = 1
  loadVisits()
}

function resetFilters() {
  filters.value = { dateRange: null, ip: '', path: '', device: '', source: '', keyword: '' }
  searchVisits()
}

// ==================== 渠道链接 ====================

const channelView = ref<'list' | 'detail'>('list')
const channels = ref<ChannelLink[]>([])
const channelsLoaded = ref(false)
const channelLoading = ref(false)
const channelPage = ref(1)
const channelPageSize = ref(20)
const channelTotal = ref(0)
const channelKeyword = ref('')
const currentChannel = ref<ChannelLink | null>(null)
const channelSwitchLoading = ref<Record<string, boolean>>({})

const channelAnalytics = ref<SiteAnalytics | null>(null)
const channelAnalyticsLoading = ref(false)
const channelVisits = ref<SiteVisitLog[]>([])
const channelVisitLoading = ref(false)
const channelVisitPage = ref(1)
const channelVisitPageSize = ref(20)
const channelVisitTotal = ref(0)
const channelFilters = ref<{ ip: string; keyword: string }>({
  ip: '',
  keyword: '',
})

async function loadChannels() {
  channelLoading.value = true
  try {
    const res = await siteApi.getChannels({
      page: channelPage.value,
      pageSize: channelPageSize.value,
      keyword: channelKeyword.value || undefined,
    })
    channels.value = res.data?.list || []
    channelTotal.value = res.data?.total || 0
  } finally {
    channelLoading.value = false
    channelsLoaded.value = true
  }
}

function searchChannels() {
  channelPage.value = 1
  loadChannels()
}

/** 状态开关：切换渠道启用 / 停用（失败时还原） */
async function toggleChannelEnabled(row: ChannelLink) {
  const target = row.enabled
  channelSwitchLoading.value[row.id] = true
  try {
    await siteApi.updateChannel(row.id, { enabled: target })
    ElMessage.success(target === 1 ? '已启用' : '已停用')
  } catch {
    row.enabled = target === 1 ? 0 : 1
  } finally {
    channelSwitchLoading.value[row.id] = false
  }
}

async function openChannelDetail(row: ChannelLink) {
  currentChannel.value = row
  channelView.value = 'detail'
  channelDetailTab.value = 'chart'
  channelVisitPage.value = 1
  channelFilters.value = { ip: '', keyword: '' }
  await Promise.all([loadChannelAnalytics(), loadChannelVisits()])
  await nextTick()
  channelChartsRef.value?.resize()
}

function backToChannelList() {
  channelView.value = 'list'
  currentChannel.value = null
}

async function loadChannelAnalytics() {
  if (!currentChannel.value) return
  channelAnalyticsLoading.value = true
  try {
    const r = effectiveRange.value
    const res = await siteApi.getChannelAnalytics(
      currentChannel.value.code,
      r.days,
      r.start || undefined,
      r.end || undefined,
    )
    channelAnalytics.value = res.data || null
  } finally {
    channelAnalyticsLoading.value = false
  }
}

async function loadChannelVisits() {
  if (!currentChannel.value) return
  channelVisitLoading.value = true
  try {
    const r = effectiveRange.value
    const res = await siteApi.getChannelVisits(currentChannel.value.code, {
      page: channelVisitPage.value,
      pageSize: channelVisitPageSize.value,
      ip: channelFilters.value.ip || undefined,
      keyword: channelFilters.value.keyword || undefined,
      start: r.start || undefined,
      end: r.end || undefined,
    })
    channelVisits.value = res.data?.list || []
    channelVisitTotal.value = res.data?.total || 0
  } finally {
    channelVisitLoading.value = false
  }
}

function searchChannelVisits() {
  channelVisitPage.value = 1
  loadChannelVisits()
}

function resetChannelFilters() {
  channelFilters.value = { ip: '', keyword: '' }
  searchChannelVisits()
}

// ---------- 新建 / 编辑 ----------

interface ChannelForm {
  name: string
  code: string
  channel: string
  targetPath: string
  remark: string
  enabled: number
}

const channelDialogVisible = ref(false)
const channelDialogMode = ref<'create' | 'edit'>('create')
const channelSaving = ref(false)
const channelFormRef = ref<FormInstance>()
const channelForm = ref<ChannelForm>({
  name: '',
  code: '',
  channel: '',
  targetPath: '/',
  remark: '',
  enabled: 1,
})
const channelRules: FormRules = {
  name: [{ required: true, message: '请输入渠道名称', trigger: 'blur' }],
}

function openCreateChannel() {
  channelDialogMode.value = 'create'
  channelForm.value = { name: '', code: '', channel: '', targetPath: '/', remark: '', enabled: 1 }
  channelDialogVisible.value = true
}

function openEditChannel(row: ChannelLink) {
  channelDialogMode.value = 'edit'
  channelForm.value = {
    name: row.name,
    code: row.code,
    channel: row.channel,
    targetPath: row.targetPath,
    remark: row.remark || '',
    enabled: row.enabled,
  }
  currentChannel.value = row
  channelDialogVisible.value = true
}

async function submitChannel() {
  const form = channelFormRef.value
  if (!form) return
  const valid = await form.validate().catch(() => false)
  if (!valid) return
  channelSaving.value = true
  try {
    if (channelDialogMode.value === 'create') {
      await siteApi.createChannel(channelForm.value)
      ElMessage.success('渠道链接已创建')
    } else if (currentChannel.value) {
      await siteApi.updateChannel(currentChannel.value.id, channelForm.value)
      ElMessage.success('渠道链接已更新')
    }
    channelDialogVisible.value = false
    await loadChannels()
  } catch {
    // 拦截器已提示
  } finally {
    channelSaving.value = false
  }
}

async function removeChannel(row: ChannelLink) {
  try {
    await ElMessageBox.confirm(`确定删除渠道链接「${row.name}」吗？删除后短链将失效。`, '删除确认', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  try {
    await siteApi.removeChannel(row.id)
    ElMessage.success('已删除')
    await loadChannels()
  } catch {
    // 拦截器已提示
  }
}

// ---------- 二维码 ----------

const qrcodeVisible = ref(false)
const qrcodeLoading = ref(false)
const qrcodeData = ref<{ code: string; url: string; dataUrl: string } | null>(null)

async function openQrcode(row: ChannelLink) {
  qrcodeVisible.value = true
  qrcodeLoading.value = true
  qrcodeData.value = null
  try {
    const res = await siteApi.getChannelQrcode(row.code)
    qrcodeData.value = res.data || null
  } catch {
    // 拦截器已提示
  } finally {
    qrcodeLoading.value = false
  }
}

// ==================== 加载 ====================

async function loadAnalytics() {
  loading.value = true
  try {
    const r = effectiveRange.value
    const res = await siteApi.getTrafficAnalytics(r.days, r.start || undefined, r.end || undefined)
    analytics.value = res.data || null
  } finally {
    loading.value = false
  }
}

async function reload() {
  refreshing.value = true
  try {
    await loadAnalytics()
    await loadVisits()
    await loadOnline()
    if (activeTab.value === 'channels') {
      if (channelView.value === 'list') await loadChannels()
      else await Promise.all([loadChannelAnalytics(), loadChannelVisits()])
    }
  } finally {
    refreshing.value = false
  }
}

async function loadOnline() {
  try {
    const res = await siteApi.getOnline(onlineMinutes)
    onlineCount.value = res.data?.online || 0
  } catch {
    // 静默失败：保留上一次数值，避免轮询报错打断页面
  }
}

// ==================== 工具 ====================

function fmtTime(s: string): string {
  if (!s) return '-'
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return s
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`
}

async function copyText(text: string, tip = '已复制') {
  if (!text) return
  try {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text)
    } else {
      const ta = document.createElement('textarea')
      ta.value = text
      ta.style.position = 'fixed'
      ta.style.opacity = '0'
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      document.body.removeChild(ta)
    }
    ElMessage.success(tip)
  } catch {
    ElMessage.error('复制失败，请手动复制')
  }
}

onMounted(async () => {
  await reload()
  // 实时在线数据每 30 秒轮询一次
  onlineTimer = window.setInterval(loadOnline, 30000)
})

onBeforeUnmount(() => {
  if (onlineTimer) window.clearInterval(onlineTimer)
})
</script>

<style scoped lang="scss">
// 刷新按钮点击后图标旋转动画
@keyframes refresh-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.sub-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  .spinning {
    animation: refresh-spin 0.8s linear infinite;
  }

  .range-tip {
    font-size: 12px;
    color: var(--el-text-color-secondary);
  }

  .sub-toolbar-right {
    margin-left: auto;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .online-badge {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    height: 32px;
    padding: 0 12px;
    border: 1px solid var(--el-border-color);
    border-radius: var(--el-border-radius-base);
    background: var(--el-fill-color-blank);
    color: var(--el-text-color-regular);
    font-size: 14px;
    line-height: 1;
    white-space: nowrap;

    .online-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #22c55e;
      box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
    }
  }
}

.stats-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }
}

.chart-card {
  margin-bottom: 16px;

  .chart-title {
    font-weight: 600;
  }
}

.visit-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-bottom: 14px;
}

.visit-pager {
  display: flex;
  justify-content: flex-end;
  margin-top: 14px;
}

.mr4 {
  margin-right: 4px;
}

.dim {
  color: var(--el-text-color-secondary);
}

.short-url {
  color: var(--el-color-primary);
  cursor: pointer;
  word-break: break-all;

  &:hover {
    text-decoration: underline;
  }
}

.channel-name-link {
  color: var(--el-color-primary);
  cursor: pointer;

  &:hover {
    text-decoration: underline;
  }
}

.op-icons {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  white-space: nowrap;

  :deep(.el-button + .el-button) {
    margin-left: 0;
  }
}

.channel-detail-tabs {
  :deep(.el-tabs__header) {
    margin-bottom: 14px;
  }
}

.channel-detail-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;

  .channel-detail-name {
    font-size: 16px;
    font-weight: 600;
  }

  .channel-detail-url {
    color: var(--el-color-primary);
    cursor: pointer;
    font-size: 13px;

    &:hover {
      text-decoration: underline;
    }
  }
}

.qrcode-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  min-height: 220px;

  .qrcode-img {
    width: 240px;
    height: 240px;
  }

  .qrcode-url {
    font-size: 12px;
    color: var(--el-text-color-secondary);
    word-break: break-all;
    text-align: center;
  }
}
</style>
