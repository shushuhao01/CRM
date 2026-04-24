<template>
  <div class="acquisition-member-ranking">
    <!-- 筛选栏 -->
    <div class="filter-bar">
      <div class="quick-filters">
        <el-button v-for="q in quickOptions" :key="q.value" :type="quickRange === q.value ? 'primary' : 'default'" @click="setRange(q.value)" size="default">{{ q.label }}</el-button>
      </div>
      <div class="date-range">
        <el-date-picker v-model="startDate" type="date" placeholder="开始日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
        <span class="range-sep">至</span>
        <el-date-picker v-model="endDate" type="date" placeholder="结束日期" size="default" style="width: 150px" value-format="YYYY-MM-DD" @change="quickRange = 'custom'" />
      </div>
      <div style="flex: 1" />
      <el-input v-model="searchKeyword" placeholder="搜索成员名称" style="width: 200px" clearable prefix-icon="Search" @input="debouncedFetch" />
    </div>
    <div class="sort-bar">
      <span class="sort-label">排行维度：</span>
      <el-radio-group v-model="sortBy" size="default" @change="fetchRanking">
        <el-radio-button label="addCount">添加数</el-radio-button>
        <el-radio-button label="talkRate">开口率</el-radio-button>
        <el-radio-button label="effectiveCount">有效沟通</el-radio-button>
        <el-radio-button label="conversionRate">转化率</el-radio-button>
        <el-radio-button label="avgResponse">响应时长</el-radio-button>
      </el-radio-group>
    </div>

    <!-- 未授权空状态 -->
    <div v-if="isDemoMode || !configId" class="empty-state">
      <div class="empty-icon">🏆</div>
      <div class="empty-title">暂无排行数据</div>
      <div class="empty-desc">请先完成企业微信授权配置，授权后将自动展示真实成员排行数据</div>
    </div>

    <template v-else>
    <!-- 排行表格 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🏆 成员排行</span></template>
      <el-table :data="rankingData" v-loading="loading" stripe size="default" @selection-change="handleCompareSelect">
        <el-table-column type="selection" width="45" />
        <el-table-column label="排行" width="65" align="center">
          <template #default="{ row }">
            <span :class="'rank-badge rank-' + (row.rank <= 3 ? row.rank : 'other')">{{ row.rank }}</span>
          </template>
        </el-table-column>
        <el-table-column label="成员" min-width="140">
          <template #default="{ row }">
            <div class="member-cell">
              <el-avatar :size="32">{{ (row.userName || '?').charAt(0) }}</el-avatar>
              <div>
                <span class="member-name">{{ row.userName }}</span>
                <span class="member-dept">{{ row.department }}</span>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column label="关联链接" width="100" align="center">
          <template #default="{ row }">
            <el-link type="primary" @click="showMemberLinks(row)" :underline="false">
              <span style="font-weight: 700; font-size: 16px">{{ row.linkCount || 0 }}</span>
            </el-link>
          </template>
        </el-table-column>
        <el-table-column label="成员状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag :type="row.status === 'abnormal' ? 'danger' : 'success'" size="small">
              {{ row.status === 'abnormal' ? '异常' : '正常' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="addCount" label="添加数" width="90" sortable>
          <template #default="{ row }">
            <span :class="{ 'highlight-col': sortBy === 'addCount' }">{{ row.addCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="开口率" width="90" sortable :sort-by="(row: any) => row.talkRate">
          <template #default="{ row }">
            <span :class="[rateClass(row.talkRate, 70, 50), { 'highlight-col': sortBy === 'talkRate' }]">{{ row.talkRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column prop="effectiveCount" label="有效沟通" width="100" sortable>
          <template #default="{ row }">
            <span :class="{ 'highlight-col': sortBy === 'effectiveCount' }">{{ row.effectiveCount }}</span>
          </template>
        </el-table-column>
        <el-table-column label="转化率" width="90" sortable :sort-by="(row: any) => row.conversionRate">
          <template #default="{ row }">
            <span :class="[rateClass(row.conversionRate, 30, 15), { 'highlight-col': sortBy === 'conversionRate' }]">{{ row.conversionRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="均响应" width="90" sortable :sort-by="(row: any) => row.avgResponseMinutes">
          <template #default="{ row }">
            <span :class="{ 'highlight-col': sortBy === 'avgResponse' }">{{ row.avgResponseMinutes }}分</span>
          </template>
        </el-table-column>
      </el-table>
      <!-- 翻页控件 -->
      <div class="pagination-bar">
        <span class="page-info">共 {{ total }} 名成员</span>
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50]"
          :total="total"
          layout="sizes, prev, pager, next, jumper"
          small
          background
          @current-change="fetchRanking"
          @size-change="fetchRanking"
        />
      </div>
    </el-card>

    <!-- 成员对比区 - 卡片式对比 -->
    <el-card v-if="compareMembers.length >= 2" shadow="never" class="section-card compare-card">
      <template #header>
        <span class="section-title">📊 成员对比（{{ compareMembers.length }}人）</span>
      </template>
      <div class="compare-grid">
        <div v-for="dim in compareDimensions" :key="dim.key" class="compare-dim-card">
          <div class="dim-header">{{ dim.label }}</div>
          <div class="dim-members">
            <div v-for="(m, idx) in compareMembers" :key="m.userId" class="dim-member-row">
              <span class="dim-member-name" :style="{ color: memberColors[idx] }">{{ m.userName }}</span>
              <div class="dim-bar-bg">
                <div class="dim-bar-fill" :style="{ width: calcDimPercent(m, dim.key) + '%', background: memberColors[idx] }" />
              </div>
              <span class="dim-member-val">{{ getDimValue(m, dim.key) }}</span>
            </div>
          </div>
        </div>
      </div>
    </el-card>
    <el-alert v-else type="info" :closable="false" style="margin-bottom: 16px">
      勾选2-4名成员后可查看多维度对比分析
    </el-alert>

    <!-- 部门汇总 -->
    <el-card shadow="never" class="section-card">
      <template #header><span class="section-title">🏢 部门汇总</span></template>
      <el-table :data="departmentSummary" stripe size="default">
        <el-table-column prop="department" label="部门" min-width="120" />
        <el-table-column prop="memberCount" label="成员数" width="90" />
        <el-table-column prop="totalAdd" label="总添加" width="90" sortable />
        <el-table-column label="平均开口率" width="110" sortable :sort-by="(row: any) => row.avgTalkRate">
          <template #default="{ row }">
            <span :class="rateClass(row.avgTalkRate, 70, 50)">{{ row.avgTalkRate }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="平均转化率" width="110" sortable :sort-by="(row: any) => row.avgConversion">
          <template #default="{ row }">
            <span :class="rateClass(row.avgConversion, 30, 15)">{{ row.avgConversion }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="平均响应" width="100">
          <template #default="{ row }">{{ row.avgResponse }}分</template>
        </el-table-column>
      </el-table>
    </el-card>
    </template>

    <!-- 成员链接列表对话框 -->
    <el-dialog v-model="memberLinksVisible" :title="`${currentMember?.userName || ''} 的关联链接`" width="960px" top="8vh">
      <div class="member-links-summary" v-if="currentMember">
        <div class="summary-item">
          <span class="summary-label">成员：</span>
          <span class="summary-value">{{ currentMember.userName }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">部门：</span>
          <span class="summary-value">{{ currentMember.department || '-' }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">关联链接数：</span>
          <span class="summary-value" style="color: #4C6EF5; font-weight: 700">{{ memberLinksTotal }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">总添加：</span>
          <span class="summary-value" style="color: #10B981">{{ currentMember.addCount || 0 }}</span>
        </div>
        <div class="summary-item">
          <span class="summary-label">转化率：</span>
          <span class="summary-value" style="color: #F59E0B">{{ currentMember.conversionRate || 0 }}%</span>
        </div>
      </div>
      <el-table :data="pagedMemberLinks" v-loading="memberLinksLoading" stripe size="default" style="margin-top: 12px">
        <el-table-column label="序号" width="60" align="center">
          <template #default="{ $index }">{{ (memberLinksPage - 1) * memberLinksPageSize + $index + 1 }}</template>
        </el-table-column>
        <el-table-column prop="linkName" label="链接名称" min-width="180" />
        <el-table-column prop="addCount" label="添加数" width="100" align="center" />
        <el-table-column prop="clickCount" label="点击数" width="100" align="center" />
        <el-table-column label="转化率" width="100" align="center">
          <template #default="{ row }">
            <span>{{ row.clickCount > 0 ? ((row.addCount / row.clickCount) * 100).toFixed(1) : '0.0' }}%</span>
          </template>
        </el-table-column>
        <el-table-column label="状态" width="90" align="center">
          <template #default="{ row }">
            <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '启用' : '禁用' }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="100" align="center">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="toggleMemberLinkStatus(row)">
              {{ row.isEnabled ? '下线' : '上线' }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div class="pagination-bar">
        <span class="page-info">共 {{ memberLinksTotal }} 条</span>
        <el-pagination
          v-model:current-page="memberLinksPage"
          v-model:page-size="memberLinksPageSize"
          :page-sizes="[10, 20, 50]"
          :total="memberLinksTotal"
          layout="total, sizes, prev, pager, next, jumper"
          small
          background
          @current-change="fetchMemberLinks"
          @size-change="handleMemberLinksPageSizeChange"
        />
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { getAcquisitionMemberRanking, getMemberLinks, updateAcquisitionLink } from '@/api/wecom'

const props = defineProps<{ configId: number | null; isDemoMode: boolean }>()

const quickRange = ref('30d')
const startDate = ref('')
const endDate = ref('')
const sortBy = ref('addCount')
const searchKeyword = ref('')
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(10)
const total = ref(0)
const rankingData = ref<any[]>([])
const compareMembers = ref<any[]>([])

// Member links dialog
const memberLinksVisible = ref(false)
const memberLinksData = ref<any[]>([])
const memberLinksLoading = ref(false)
const memberLinksPage = ref(1)
const memberLinksPageSize = ref(10)
const memberLinksTotal = ref(0)
const currentMember = ref<any>(null)

const pagedMemberLinks = computed(() => {
  const start = (memberLinksPage.value - 1) * memberLinksPageSize.value
  return memberLinksData.value.slice(start, start + memberLinksPageSize.value)
})

const handleMemberLinksPageSizeChange = () => {
  memberLinksPage.value = 1
  fetchMemberLinks()
}

const quickOptions = [
  { label: '今日', value: 'today' }, { label: '昨日', value: 'yesterday' },
  { label: '本周', value: 'week' }, { label: '本月', value: 'month' },
  { label: '上月', value: 'lastMonth' }, { label: '近7天', value: '7d' },
  { label: '近30天', value: '30d' }, { label: '全部', value: 'all' }
]

// Demo data - 根据范围生成动态数据
const baseRanking = [
  { userId: 'wang01', userName: '王销售', department: '销售部', baseAdd: 86, talkRate: 80.8, effRate: 0.6, convRate: 32.1, resp: 2.5, linkCount: 5, status: 'normal' },
  { userId: 'chen02', userName: '陈经理', department: '销售部', baseAdd: 72, talkRate: 72.9, effRate: 0.53, convRate: 28.4, resp: 3.8, linkCount: 4, status: 'normal' },
  { userId: 'zhang03', userName: '张客服', department: '客服部', baseAdd: 58, talkRate: 68.5, effRate: 0.52, convRate: 24.6, resp: 4.2, linkCount: 3, status: 'normal' },
  { userId: 'li04', userName: '李主管', department: '销售部', baseAdd: 45, talkRate: 75.2, effRate: 0.62, convRate: 30.8, resp: 2.1, linkCount: 6, status: 'normal' },
  { userId: 'zhao05', userName: '赵销售', department: '销售部', baseAdd: 38, talkRate: 65.0, effRate: 0.47, convRate: 22.1, resp: 5.5, linkCount: 2, status: 'abnormal' },
  { userId: 'sun06', userName: '孙客服', department: '客服部', baseAdd: 32, talkRate: 62.3, effRate: 0.47, convRate: 18.5, resp: 6.2, linkCount: 3, status: 'normal' },
  { userId: 'zhou07', userName: '周实习', department: '销售部', baseAdd: 22, talkRate: 55.0, effRate: 0.36, convRate: 12.0, resp: 8.1, linkCount: 1, status: 'normal' },
  { userId: 'qian08', userName: '钱顾问', department: '客服部', baseAdd: 18, talkRate: 60.2, effRate: 0.44, convRate: 16.5, resp: 7.0, linkCount: 2, status: 'normal' },
  { userId: 'wu09', userName: '吴专员', department: '销售部', baseAdd: 15, talkRate: 58.1, effRate: 0.40, convRate: 14.2, resp: 7.5, linkCount: 1, status: 'normal' },
  { userId: 'zheng10', userName: '郑助理', department: '客服部', baseAdd: 12, talkRate: 52.0, effRate: 0.33, convRate: 10.5, resp: 9.0, linkCount: 1, status: 'normal' },
  { userId: 'feng11', userName: '冯总监', department: '销售部', baseAdd: 10, talkRate: 85.0, effRate: 0.7, convRate: 35.0, resp: 1.8, linkCount: 4, status: 'normal' },
  { userId: 'he12', userName: '何小妹', department: '客服部', baseAdd: 8, talkRate: 50.0, effRate: 0.3, convRate: 8.5, resp: 10.2, linkCount: 1, status: 'normal' },
]
const rfMap: Record<string, number> = { today: 0.08, yesterday: 0.07, week: 0.35, month: 1, lastMonth: 0.9, '7d': 0.25, '30d': 1, all: 3.5 }
const getDemoRanking = (range: string) => {
  const f = rfMap[range] || 1
  return baseRanking.map((m, i) => ({
    rank: i + 1, userId: m.userId, userName: m.userName, department: m.department,
    addCount: Math.round(m.baseAdd * f), talkRate: m.talkRate,
    effectiveCount: Math.round(m.baseAdd * f * m.effRate),
    conversionRate: m.convRate, avgResponseMinutes: m.resp,
    linkCount: m.linkCount, status: m.status,
  }))
}

const setRange = (val: string) => {
  quickRange.value = val
  currentPage.value = 1
  fetchRanking()
}

let fetchTimer: ReturnType<typeof setTimeout> | null = null
const debouncedFetch = () => {
  if (fetchTimer) clearTimeout(fetchTimer)
  fetchTimer = setTimeout(() => { currentPage.value = 1; fetchRanking() }, 300)
}

const fetchRanking = async () => {
  if (props.isDemoMode || !props.configId) {
    // 未授权时不显示假数据
    rankingData.value = []
    total.value = 0
    return
  }
  loading.value = true
  try {
    const res: any = await getAcquisitionMemberRanking({
      configId: props.configId,
      range: quickRange.value,
      sortBy: sortBy.value,
      page: currentPage.value,
      pageSize: pageSize.value,
      search: searchKeyword.value || undefined,
      startDate: startDate.value,
      endDate: endDate.value,
    })
    if (res?.success && res.data) {
      rankingData.value = (res.data.members || []).map((m: any) => ({ ...m, status: m.status || 'normal' }))
      total.value = res.data.total || 0
    }
  } catch (e) {
    console.error('[MemberRanking] Fetch error:', e)
    rankingData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

const showMemberLinks = (member: any) => {
  currentMember.value = member
  memberLinksPage.value = 1
  memberLinksVisible.value = true
  fetchMemberLinks()
}

const fetchMemberLinks = async () => {
  if (!props.configId || !currentMember.value) return
  if (props.isDemoMode) {
    memberLinksData.value = []
    memberLinksTotal.value = 0
    return
  }
  memberLinksLoading.value = true
  try {
    const res: any = await getMemberLinks(currentMember.value.userId, {
      configId: props.configId,
      page: memberLinksPage.value,
      pageSize: memberLinksPageSize.value,
    })
    if (res?.success && res.data) {
      memberLinksData.value = res.data.links || []
      memberLinksTotal.value = res.data.total || 0
    }
  } catch (e) {
    console.error('[MemberRanking] Fetch member links error:', e)
  } finally {
    memberLinksLoading.value = false
  }
}

const toggleMemberLinkStatus = async (link: any) => {
  if (props.isDemoMode) {
    link.isEnabled = !link.isEnabled
    ElMessage.success(link.isEnabled ? '已上线（示例模式）' : '已下线（示例模式）')
    return
  }
  try {
    await updateAcquisitionLink(link.id, { isEnabled: !link.isEnabled })
    link.isEnabled = !link.isEnabled
    ElMessage.success(link.isEnabled ? '已上线' : '已下线')
  } catch (e: any) {
    ElMessage.error(e.message || '操作失败')
  }
}

const handleCompareSelect = (selection: any[]) => { compareMembers.value = selection.slice(0, 4) }

const memberColors = ['#4C6EF5', '#10B981', '#F59E0B', '#EF4444']

const compareDimensions = [
  { key: 'addCount', label: '添加数', color: '#4C6EF5' },
  { key: 'talkRate', label: '开口率', color: '#10B981' },
  { key: 'effectiveCount', label: '有效沟通', color: '#F59E0B' },
  { key: 'conversionRate', label: '转化率', color: '#7C3AED' },
  { key: 'avgResponseMinutes', label: '响应时长', color: '#EF4444' },
]

const getDimValue = (m: any, key: string) => {
  const val = m[key]
  if (key === 'talkRate' || key === 'conversionRate') return val + '%'
  if (key === 'avgResponseMinutes') return val + '分'
  return val
}

const calcDimPercent = (m: any, key: string) => {
  const vals = compareMembers.value.map(cm => cm[key] as number)
  const max = Math.max(...vals, 1)
  const val = m[key] as number
  if (key === 'avgResponseMinutes') return Math.max((Math.min(...vals, 0.1) / val) * 100, 5)
  return Math.max((val / max) * 100, 5)
}

const rateClass = (rate: number, good: number, medium: number) => rate >= good ? 'rate-good' : rate >= medium ? 'rate-medium' : 'rate-low'

// Dynamic department summary computed from ranking data
const departmentSummary = computed(() => {
  const deptMap: Record<string, { department: string; memberCount: number; totalAdd: number; talkRateSum: number; conversionSum: number; responseSum: number }> = {}
  for (const m of rankingData.value) {
    const dept = m.department || '未分组'
    if (!deptMap[dept]) deptMap[dept] = { department: dept, memberCount: 0, totalAdd: 0, talkRateSum: 0, conversionSum: 0, responseSum: 0 }
    deptMap[dept].memberCount++
    deptMap[dept].totalAdd += m.addCount || 0
    deptMap[dept].talkRateSum += m.talkRate || 0
    deptMap[dept].conversionSum += m.conversionRate || 0
    deptMap[dept].responseSum += m.avgResponseMinutes || 0
  }
  return Object.values(deptMap).map(d => ({
    ...d,
    avgTalkRate: d.memberCount > 0 ? parseFloat((d.talkRateSum / d.memberCount).toFixed(1)) : 0,
    avgConversion: d.memberCount > 0 ? parseFloat((d.conversionSum / d.memberCount).toFixed(1)) : 0,
    avgResponse: d.memberCount > 0 ? parseFloat((d.responseSum / d.memberCount).toFixed(1)) : 0,
  }))
})

watch(() => props.configId, () => { currentPage.value = 1; fetchRanking() })
onMounted(() => fetchRanking())
</script>

<style scoped>
.filter-bar { display: flex; gap: 12px; margin-bottom: 12px; align-items: center; flex-wrap: wrap; }
.quick-filters { display: flex; gap: 6px; flex-wrap: wrap; }
.date-range { display: flex; align-items: center; gap: 4px; }
.range-sep { color: #9ca3af; font-size: 13px; }
.sort-bar { display: flex; gap: 10px; margin-bottom: 20px; align-items: center; }
.sort-label { font-size: 14px; color: #6b7280; font-weight: 500; }
.section-card { margin-bottom: 20px; }
.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: #9CA3AF; }
.section-title { font-weight: 600; font-size: 15px; color: #1f2937; }
.pagination-bar { display: flex; justify-content: space-between; align-items: center; margin-top: 16px; padding: 8px 0; }
.page-info { font-size: 13px; color: #9CA3AF; }
.rank-badge { display: inline-flex; align-items: center; justify-content: center; width: 30px; height: 30px; border-radius: 50%; font-weight: 700; font-size: 15px; }
.rank-1 { background: #fef3c7; color: #d97706; }
.rank-2 { background: #f3f4f6; color: #6b7280; }
.rank-3 { background: #fde68a; color: #92400e; }
.rank-other { color: #9ca3af; }
.member-cell { display: flex; align-items: center; gap: 10px; }
.member-name { font-weight: 600; color: #1f2937; display: block; font-size: 14px; }
.member-dept { font-size: 12px; color: #9ca3af; }
.highlight-col { font-weight: 700; color: #4c6ef5; }
.rate-good { color: #10b981; font-weight: 700; }
.rate-medium { color: #f59e0b; font-weight: 600; }
.rate-low { color: #ef4444; }
/* 对比区 - 现代卡片网格 */
.compare-card { background: #FAFBFC; }
.compare-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 16px; }
.compare-dim-card { background: #fff; border: 1px solid #F3F4F6; border-radius: 12px; padding: 16px; }
.dim-header { font-size: 13px; font-weight: 600; color: #6B7280; margin-bottom: 12px; text-transform: uppercase; letter-spacing: 0.5px; }
.dim-members { display: flex; flex-direction: column; gap: 10px; }
.dim-member-row { display: flex; align-items: center; gap: 10px; }
.dim-member-name { width: 56px; font-size: 13px; font-weight: 600; flex-shrink: 0; text-align: right; }
.dim-bar-bg { flex: 1; height: 20px; background: #F3F4F6; border-radius: 10px; overflow: hidden; }
.dim-bar-fill { height: 100%; border-radius: 10px; min-width: 4px; transition: width 0.5s ease; opacity: 0.85; }
.dim-member-val { width: 50px; font-size: 13px; font-weight: 600; color: #374151; text-align: right; }
/* 成员链接弹窗汇总 - 横排显示 */
.member-links-summary { display: flex; flex-direction: row; gap: 32px; padding: 12px 16px; background: #F9FAFB; border-radius: 8px; align-items: center; flex-wrap: wrap; }
.summary-item { display: flex; flex-direction: row; align-items: center; gap: 8px; }
.summary-label { font-size: 13px; color: #9CA3AF; white-space: nowrap; }
.summary-value { font-size: 15px; font-weight: 600; color: #1F2937; white-space: nowrap; }
</style>

