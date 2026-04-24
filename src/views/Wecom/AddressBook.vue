<template>
  <div class="wecom-address-book">
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="address-book">
          通讯录
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange">
              <el-option v-for="c in configs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
          </template>
        </WecomHeader>
      </template>

      <el-tabs v-model="activeTab">
        <!-- Tab 1: 组织架构 -->
        <el-tab-pane label="组织架构" name="organization">
          <div class="org-layout">
            <div class="org-tree-panel">
              <div class="tree-toolbar">
                <el-input v-model="deptSearch" placeholder="搜索部门" prefix-icon="Search" clearable size="small" @input="handleDeptSearch" />
                <el-button type="primary" size="small" :loading="syncingDepts" @click="handleSyncDepts">
                  同步部门
                </el-button>
              </div>
              <el-tree
                :data="departmentTree"
                :props="{ label: 'wecomDeptName', children: 'children' }"
                :filter-node-method="filterDeptNode"
                ref="deptTreeRef"
                highlight-current
                default-expand-all
                @node-click="handleDeptClick"
              >
                <template #default="{ data }">
                  <span class="dept-tree-node">
                    <span>{{ data.wecomDeptName }} ({{ data.memberCount || 0 }}人)</span>
                    <el-tag v-if="data.crmDeptName" type="success" size="small" style="margin-left: 6px">已映射</el-tag>
                  </span>
                </template>
              </el-tree>
              <el-empty v-if="!departmentTree.length && !loadingDepts" description="暂无部门数据，请先同步" :image-size="60" />
            </div>
            <div class="org-detail-panel">
              <el-empty v-if="!selectedDept" description="请选择左侧部门查看详情" />
              <div v-else>
                <div class="dept-header">
                  <h3>{{ selectedDept.wecomDeptName }}</h3>
                  <el-tag :type="selectedDept.crmDeptName ? 'success' : 'warning'" size="small">
                    {{ selectedDept.crmDeptName ? '已映射' : '未映射' }}
                  </el-tag>
                </div>
                <div class="dept-meta">
                  <span>企微部门ID: <strong>{{ selectedDept.wecomDeptId }}</strong></span>
                  <el-divider direction="vertical" />
                  <span>CRM部门: <strong>{{ selectedDept.crmDeptName || '未映射' }}</strong></span>
                  <el-divider direction="vertical" />
                  <span>成员: <strong>{{ selectedDept.memberCount || 0 }}</strong>人</span>
                </div>
                <div class="dept-actions">
                  <el-button type="primary" size="small" :loading="syncingMembers" @click="handleSyncMembers">同步成员</el-button>
                  <el-button size="small" @click="showBatchBind = true">批量绑定</el-button>
                  <el-button size="small" @click="showMappingDialog = true">映射CRM部门</el-button>
                </div>
                <el-table :data="deptMembers" stripe style="margin-top: 16px" v-loading="loadingMembers">
                  <el-table-column prop="name" label="姓名" width="120" />
                  <el-table-column prop="wecomUserId" label="企微ID" min-width="150">
                    <template #default="{ row }">
                      <span class="monospace-text">{{ row.wecomUserId }}</span>
                    </template>
                  </el-table-column>
                  <el-table-column label="CRM绑定" min-width="150">
                    <template #default="{ row }">
                      <el-tag v-if="row.crmUserName" type="success" size="small">{{ row.crmUserName }}</el-tag>
                      <el-tag v-else type="info" size="small">未绑定</el-tag>
                    </template>
                  </el-table-column>
                  <el-table-column prop="position" label="职务" width="100" />
                  <el-table-column label="状态" width="80">
                    <template #default="{ row }">
                      <el-tag :type="row.status === 'active' ? 'success' : 'danger'" size="small">
                        {{ row.status === 'active' ? '在职' : '离职' }}
                      </el-tag>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 成员绑定 -->
        <el-tab-pane label="成员绑定" name="binding">
          <div class="stat-cards">
            <div class="stat-card"><div class="stat-value">{{ bindingStats.total }}</div><div class="stat-label">总成员</div></div>
            <div class="stat-card"><div class="stat-value text-success">{{ bindingStats.bound }}</div><div class="stat-label">已绑定</div></div>
            <div class="stat-card"><div class="stat-value text-warning">{{ bindingStats.unbound }}</div><div class="stat-label">未绑定</div></div>
            <div class="stat-card"><div class="stat-value text-danger">{{ bindingStats.anomaly }}</div><div class="stat-label">异常</div></div>
          </div>
          <div class="tab-actions">
            <el-button type="primary" @click="showManualBind = true">手动绑定</el-button>
            <el-button @click="showBatchBind = true">批量绑定</el-button>
            <el-button @click="showMultiBind = true">一对多绑定</el-button>
            <div class="spacer" />
            <el-input v-model="bindingSearch" placeholder="搜索成员" prefix-icon="Search" clearable style="width: 200px" />
          </div>
           <el-table :data="paginatedBindingList" stripe v-loading="loadingBindings">
            <el-table-column prop="wecomUserName" label="企微成员" min-width="120">
              <template #default="{ row }">
                <div class="member-info">
                  <el-avatar :size="28" :src="row.wecomAvatar">{{ (row.wecomUserName || '?')[0] }}</el-avatar>
                  <span>{{ row.wecomUserName }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column prop="wecomUserId" label="企微ID" min-width="120">
              <template #default="{ row }">
                <span class="monospace-text">{{ row.wecomUserId }}</span>
              </template>
            </el-table-column>
            <el-table-column label="CRM用户" min-width="120">
              <template #default="{ row }">
                <span v-if="row.crmUserName" style="color: #10B981; font-weight: 500">{{ row.crmUserName }}</span>
                <el-tag v-else type="info" size="small">未绑定</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="wecomDepartmentIds" label="部门" min-width="100" />
            <el-table-column label="绑定时间" min-width="150">
              <template #default="{ row }">{{ row.createdAt ? formatDate(row.createdAt) : '-' }}</template>
            </el-table-column>
            <el-table-column label="状态" width="80">
              <template #default="{ row }">
                <el-tag :type="row.isEnabled ? 'success' : 'danger'" size="small">{{ row.isEnabled ? '正常' : '异常' }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="120" fixed="right">
              <template #default="{ row }">
                <el-button v-if="!row.crmUserName" type="primary" link size="small" @click="openBindDialog(row)">去绑定</el-button>
                <el-button v-else type="danger" link size="small" @click="handleUnbind(row)">解除</el-button>
              </template>
            </el-table-column>
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="bindingPage"
              v-model:page-size="bindingPageSize"
              :page-sizes="[20, 50, 100]"
              :total="filteredBindingList.length"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="bindingPage = 1"
            />
          </div>
        </el-tab-pane>

        <!-- Tab 3: 自动匹配 -->
        <el-tab-pane name="auto-match">
          <template #label>
            <span>自动匹配</span>
            <el-badge v-if="autoMatchPendingCount > 0" :value="autoMatchPendingCount" :max="99" class="match-badge" />
          </template>
          <div class="match-config">
            <h4>匹配规则配置</h4>
            <div class="match-rules">
              <el-checkbox v-model="matchRules.phoneExact">手机号完全一致（高置信度）</el-checkbox>
              <el-checkbox v-model="matchRules.nameExact">姓名完全一致（中置信度）</el-checkbox>
              <el-checkbox v-model="matchRules.nameFuzzy">姓名模糊匹配（相似度&gt;80%，低置信度）</el-checkbox>
            </div>
            <div style="margin-top: 16px; display: flex; gap: 8px">
              <el-button type="primary" :loading="matchRunning" @click="executeAutoMatch">执行自动匹配</el-button>
              <span v-if="lastMatchResult" style="color: #909399; font-size: 13px; line-height: 32px">
                上次匹配: 发现 {{ lastMatchResult }} 条新建议
              </span>
            </div>
          </div>

          <div v-if="matchSuggestions.length" style="margin-top: 20px">
            <div class="match-list-header">
              <span style="font-weight: 600; font-size: 15px">待确认匹配（{{ matchSuggestions.length }}条）</span>
              <div>
                <el-button type="primary" size="small" @click="confirmAllMatches">全部确认</el-button>
                <el-button size="small" @click="rejectAllMatches">全部忽略</el-button>
              </div>
            </div>
            <div v-for="item in matchSuggestions" :key="item.id" class="match-item-card">
              <div class="match-pair">
                <div class="match-side wecom-side">
                  <div class="side-label">企微客户</div>
                  <div class="side-name">{{ item.wecomCustomerName || '-' }}</div>
                  <div class="side-info">手机: {{ maskPhone(item.matchField) }}</div>
                </div>
                <div class="match-arrow">→</div>
                <div class="match-side crm-side">
                  <div class="side-label">CRM客户</div>
                  <div class="side-name">{{ item.crmCustomerName || '-' }}</div>
                  <div class="side-info">手机: {{ maskPhone(item.matchField) }}</div>
                </div>
              </div>
              <div class="match-footer">
                <span class="match-basis">匹配方式: {{ item.matchType === 'phone' ? '手机号' : '姓名' }}</span>
                <el-tag :type="item.confidence === 'high' ? 'success' : item.confidence === 'medium' ? 'warning' : 'info'" size="small">
                  {{ item.confidence === 'high' ? '高置信' : item.confidence === 'medium' ? '中置信' : '低置信' }}
                </el-tag>
                <div class="match-ops">
                  <el-button type="primary" size="small" @click="confirmMatch(item.id)">确认关联</el-button>
                  <el-button size="small" @click="rejectMatch(item.id)">忽略</el-button>
                </div>
              </div>
            </div>
          </div>
          <el-empty v-else-if="!matchRunning" description="暂无待确认匹配，请执行自动匹配" style="margin-top: 40px" />
        </el-tab-pane>

        <!-- Tab 4: 同步设置 -->
        <el-tab-pane label="同步设置" name="sync-settings">
          <div class="sync-settings-container" v-loading="loadingSyncSettings">
            <!-- 定时同步开关 -->
            <div class="settings-section">
              <div class="section-row">
                <span class="section-label">启用定时自动同步</span>
                <el-switch v-model="syncSettings.autoSyncEnabled" />
              </div>
              <template v-if="syncSettings.autoSyncEnabled">
                <div class="section-row" style="margin-top: 16px;">
                  <span class="section-label">同步频率</span>
                  <el-select v-model="syncSettings.frequency" style="width: 160px">
                    <el-option label="每日" value="daily" />
                    <el-option label="每周" value="weekly" />
                  </el-select>
                  <span class="section-label" style="margin-left: 24px;">同步时间</span>
                  <el-time-picker v-model="syncSettings.syncTime" format="HH:mm" style="width: 140px" />
                </div>
              </template>
            </div>

            <!-- 同步内容 -->
            <div class="settings-section">
              <div class="section-title-bar">同步内容</div>
              <div class="checkbox-grid">
                <el-checkbox v-model="syncSettings.syncDepts">部门</el-checkbox>
                <el-checkbox v-model="syncSettings.syncMembers">成员</el-checkbox>
                <el-checkbox v-model="syncSettings.syncTags">标签</el-checkbox>
              </div>
            </div>

            <!-- 新成员处理 -->
            <div class="settings-section">
              <div class="section-title-bar">新成员处理</div>
              <el-radio-group v-model="syncSettings.newMemberAction" class="radio-vertical">
                <el-radio label="sync_only">仅同步，不自动创建CRM用户</el-radio>
                <el-radio label="auto_create">自动创建CRM用户</el-radio>
              </el-radio-group>
            </div>

            <!-- 离职成员处理 -->
            <div class="settings-section">
              <div class="section-title-bar">离职成员处理</div>
              <div class="checkbox-vertical">
                <el-checkbox v-model="syncSettings.disableCrmOnLeave">企微离职后自动禁用CRM账号</el-checkbox>
                <el-checkbox v-model="syncSettings.unbindOnLeave">企微离职后自动解绑</el-checkbox>
                <el-checkbox v-model="syncSettings.transferCustomer">转移客户给部门负责人</el-checkbox>
              </div>
            </div>

            <div style="margin-top: 24px;">
              <el-button type="primary" :loading="savingSettings" @click="handleSaveSyncSettings">保存设置</el-button>
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 5: 同步日志 -->
        <el-tab-pane label="同步日志" name="sync-logs">
          <div class="tab-actions">
            <el-radio-group v-model="logFilter.type" @change="handleLogFilterChange">
              <el-radio-button label="all">全部</el-radio-button>
              <el-radio-button label="contact">通讯录</el-radio-button>
              <el-radio-button label="binding">绑定</el-radio-button>
              <el-radio-button label="anomaly">异常</el-radio-button>
            </el-radio-group>
            <el-radio-group v-model="logFilter.range" style="margin-left: 16px" @change="handleLogFilterChange">
              <el-radio-button label="today">今日</el-radio-button>
              <el-radio-button label="7d">7天</el-radio-button>
              <el-radio-button label="30d">30天</el-radio-button>
            </el-radio-group>
          </div>
          <el-table :data="syncLogs" stripe v-loading="loadingLogs">
            <el-table-column prop="time" label="时间" width="180" />
            <el-table-column prop="type" label="类型" width="100">
              <template #default="{ row }">
                <el-tag size="small">{{ row.type }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="operation" label="操作" min-width="200" />
            <el-table-column label="结果" width="100">
              <template #default="{ row }">
                <el-tag :type="row.result === 'success' ? 'success' : 'danger'" size="small">
                  {{ row.result === 'success' ? '成功' : '失败' }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column prop="detail" label="详情" min-width="200" show-overflow-tooltip />
          </el-table>
          <div class="pagination-wrap">
            <el-pagination
              v-model:current-page="logPage"
              v-model:page-size="logPageSize"
              :page-sizes="[20, 50, 100]"
              :total="logTotal"
              layout="total, sizes, prev, pager, next, jumper"
              background
              @size-change="handleLogPageSizeChange"
              @current-change="fetchSyncLogs"
            />
          </div>
          <el-empty v-if="!syncLogs.length && !loadingLogs" description="暂无同步日志" />
        </el-tab-pane>
      </el-tabs>
    </el-card>

    <!-- 部门映射弹窗 -->
    <el-dialog v-model="showMappingDialog" title="映射CRM部门" width="460px">
      <el-form label-width="120px">
        <el-form-item label="企微部门">{{ selectedDept?.wecomDeptName }}</el-form-item>
        <el-form-item label="CRM部门">
          <el-select v-model="mappingForm.crmDeptId" filterable placeholder="选择CRM部门" style="width: 100%">
            <el-option v-for="d in crmDepts" :key="d.id" :label="d.name" :value="d.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMappingDialog = false">取消</el-button>
        <el-button type="primary" @click="handleSetMapping">确认映射</el-button>
      </template>
    </el-dialog>

    <!-- 手动绑定弹窗 -->
    <el-dialog v-model="showManualBind" title="手动绑定CRM用户" width="520px">
      <el-form label-width="100px">
        <el-form-item label="企微成员">
          <span style="font-weight: 600">{{ manualBindForm.wecomUserName || '-' }}</span>
          <span style="color: #9CA3AF; margin-left: 8px; font-size: 12px">{{ manualBindForm.wecomUserId }}</span>
        </el-form-item>
        <el-form-item label="CRM用户">
          <el-select
            v-model="manualBindForm.crmUserId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索CRM用户名/工号"
            :remote-method="searchCrmUsers"
            :loading="searchingCrmUsers"
            style="width: 100%"
            @change="handleCrmUserSelect"
          >
            <el-option v-for="u in crmUserOptions" :key="u.id" :label="`${u.name} (${u.username || u.code || ''})`" :value="u.id" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showManualBind = false">取消</el-button>
        <el-button type="primary" :disabled="!manualBindForm.crmUserId" :loading="bindingLoading" @click="submitManualBind">确认绑定</el-button>
      </template>
    </el-dialog>

    <!-- 批量绑定弹窗 -->
    <el-dialog v-model="showBatchBind" title="批量绑定" width="600px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        将自动按姓名匹配：企微成员姓名 = CRM用户姓名的将自动绑定。
      </el-alert>
      <div style="margin-bottom: 12px; color: #6B7280; font-size: 13px">
        未绑定成员：<strong>{{ bindingStats.unbound }}</strong> 人
      </div>
      <template #footer>
        <el-button @click="showBatchBind = false">取消</el-button>
        <el-button type="primary" :loading="bindingLoading" @click="submitBatchBind">执行批量绑定</el-button>
      </template>
    </el-dialog>

    <!-- 一对多绑定弹窗 -->
    <el-dialog v-model="showMultiBind" title="一对多绑定" width="560px">
      <el-alert type="info" :closable="false" style="margin-bottom: 16px">
        将一个CRM用户绑定到多个企微成员（适用于一人管理多个企微号的场景）。
      </el-alert>
      <el-form label-width="100px">
        <el-form-item label="CRM用户">
          <el-select
            v-model="multiBind.crmUserId"
            filterable
            remote
            reserve-keyword
            placeholder="搜索CRM用户"
            :remote-method="searchCrmUsers"
            :loading="searchingCrmUsers"
            style="width: 100%"
            @change="handleMultiCrmUserSelect"
          >
            <el-option v-for="u in crmUserOptions" :key="u.id" :label="`${u.name} (${u.username || u.code || ''})`" :value="u.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="企微成员">
          <el-select
            v-model="multiBind.wecomUserIds"
            multiple
            filterable
            placeholder="选择要绑定的企微成员"
            style="width: 100%"
          >
            <el-option
              v-for="b in bindingList.filter(b => !b.crmUserId)"
              :key="b.wecomUserId"
              :label="b.wecomUserName || b.wecomUserId"
              :value="b.wecomUserId"
            />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showMultiBind = false">取消</el-button>
        <el-button type="primary" :disabled="!multiBind.crmUserId || multiBind.wecomUserIds.length === 0" :loading="bindingLoading" @click="submitMultiBind">确认绑定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomAddressBook' })

import { ref, reactive, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import { useWecomDemo } from './composables/useWecomDemo'
import { getWecomConfigs, createWecomBinding, batchCreateWecomBindings } from '@/api/wecom'
import {
  getWecomDepartmentTree, getWecomDeptMembers, setDeptMapping,
  syncWecomDepartments, syncWecomMembers,
  getSyncSettings, saveSyncSettings, getSyncLogs,
  getAutoMatchPending, getAutoMatchCount, confirmAutoMatch, rejectAutoMatch,
  getBindingList, runAutoMatch
} from '@/api/wecomAddressBook'
import { formatDateTime } from '@/utils/date'
import request from '@/utils/request'

const { isDemoMode } = useWecomDemo()

const selectedConfigId = ref<number>()
const configs = ref<any[]>([])
const activeTab = ref('organization')


// ==================== Tab1: 组织架构 ====================
const deptSearch = ref('')
const departmentTree = ref<any[]>([])
const selectedDept = ref<any>(null)
const deptMembers = ref<any[]>([])
const deptTreeRef = ref()
const loadingDepts = ref(false)
const loadingMembers = ref(false)
const syncingDepts = ref(false)
const syncingMembers = ref(false)

// ==================== Tab2: 成员绑定 ====================
const bindingStats = reactive({ total: 0, bound: 0, unbound: 0, anomaly: 0 })
const bindingList = ref<any[]>([])
const bindingSearch = ref('')
const loadingBindings = ref(false)
const showManualBind = ref(false)
const showBatchBind = ref(false)
const showMultiBind = ref(false)
const bindingPage = ref(1)
const bindingPageSize = ref(20)
const bindingLoading = ref(false)
const searchingCrmUsers = ref(false)
const crmUserOptions = ref<any[]>([])

const manualBindForm = ref({ wecomUserId: '', wecomUserName: '', wecomAvatar: '', wecomDepartmentIds: '', crmUserId: '', crmUserName: '' })
const multiBind = ref({ crmUserId: '', crmUserName: '', wecomUserIds: [] as string[] })

const openBindDialog = (row: any) => {
  manualBindForm.value = {
    wecomUserId: row.wecomUserId,
    wecomUserName: row.wecomUserName || row.name || '',
    wecomAvatar: row.wecomAvatar || '',
    wecomDepartmentIds: row.wecomDepartmentIds || '',
    crmUserId: '',
    crmUserName: ''
  }
  crmUserOptions.value = []
  showManualBind.value = true
}

const searchCrmUsers = async (keyword: string) => {
  if (!keyword || keyword.length < 1) { crmUserOptions.value = []; return }
  searchingCrmUsers.value = true
  try {
    const res: any = await request.get('/users', { params: { keyword, pageSize: 20 } })
    crmUserOptions.value = (res?.list || res || []).slice(0, 20)
  } catch { crmUserOptions.value = [] }
  searchingCrmUsers.value = false
}

const handleCrmUserSelect = (val: string) => {
  const opt = crmUserOptions.value.find(o => o.id === val)
  if (opt) manualBindForm.value.crmUserName = opt.name
}

const handleMultiCrmUserSelect = (val: string) => {
  const opt = crmUserOptions.value.find(o => o.id === val)
  if (opt) multiBind.value.crmUserName = opt.name
}

const submitManualBind = async () => {
  if (!selectedConfigId.value || !manualBindForm.value.crmUserId) return
  bindingLoading.value = true
  try {
    await createWecomBinding({
      wecomConfigId: selectedConfigId.value,
      wecomUserId: manualBindForm.value.wecomUserId,
      wecomUserName: manualBindForm.value.wecomUserName,
      wecomAvatar: manualBindForm.value.wecomAvatar,
      wecomDepartmentIds: manualBindForm.value.wecomDepartmentIds,
      crmUserId: manualBindForm.value.crmUserId,
      crmUserName: manualBindForm.value.crmUserName
    })
    ElMessage.success('绑定成功')
    showManualBind.value = false
    fetchBindings()
  } catch (e: any) {
    ElMessage.error(e?.message || '绑定失败')
  }
  bindingLoading.value = false
}

const submitBatchBind = async () => {
  if (!selectedConfigId.value) return
  bindingLoading.value = true
  try {
    // 获取CRM用户列表用于名称匹配
    const crmRes: any = await request.get('/users', { params: { pageSize: 500 } })
    const crmUsers = crmRes?.list || crmRes || []
    const crmNameMap = new Map<string, any>()
    for (const u of crmUsers) {
      crmNameMap.set((u.name || '').trim().toLowerCase(), u)
    }

    // 找出未绑定的成员
    const unbound = bindingList.value.filter(b => !b.crmUserId || b.crmUserId === '')
    const pairs: any[] = []
    for (const b of unbound) {
      const match = crmNameMap.get((b.wecomUserName || '').trim().toLowerCase())
      if (match) {
        pairs.push({
          wecomUserId: b.wecomUserId,
          wecomUserName: b.wecomUserName,
          wecomAvatar: b.wecomAvatar,
          crmUserId: match.id,
          crmUserName: match.name
        })
      }
    }

    if (pairs.length === 0) {
      ElMessage.info('未找到可按姓名自动匹配的成员')
      bindingLoading.value = false
      return
    }

    await batchCreateWecomBindings(selectedConfigId.value, pairs)
    ElMessage.success(`批量绑定完成，匹配 ${pairs.length} 个成员`)
    showBatchBind.value = false
    fetchBindings()
  } catch (e: any) {
    ElMessage.error(e?.message || '批量绑定失败')
  }
  bindingLoading.value = false
}

const submitMultiBind = async () => {
  if (!selectedConfigId.value || !multiBind.value.crmUserId || multiBind.value.wecomUserIds.length === 0) return
  bindingLoading.value = true
  try {
    const pairs = multiBind.value.wecomUserIds.map(wid => {
      const b = bindingList.value.find(x => x.wecomUserId === wid)
      return {
        wecomUserId: wid,
        wecomUserName: b?.wecomUserName || '',
        wecomAvatar: b?.wecomAvatar || '',
        crmUserId: multiBind.value.crmUserId,
        crmUserName: multiBind.value.crmUserName
      }
    })
    await batchCreateWecomBindings(selectedConfigId.value, pairs)
    ElMessage.success(`一对多绑定完成，绑定 ${pairs.length} 个企微成员`)
    showMultiBind.value = false
    fetchBindings()
  } catch (e: any) {
    ElMessage.error(e?.message || '绑定失败')
  }
  bindingLoading.value = false
}

const filteredBindingList = computed(() => {
  if (!bindingSearch.value) return bindingList.value
  const kw = bindingSearch.value.toLowerCase()
  return bindingList.value.filter(b =>
    (b.wecomUserName || '').toLowerCase().includes(kw) ||
    (b.crmUserName || '').toLowerCase().includes(kw) ||
    (b.wecomUserId || '').toLowerCase().includes(kw)
  )
})

const paginatedBindingList = computed(() => {
  const start = (bindingPage.value - 1) * bindingPageSize.value
  return filteredBindingList.value.slice(start, start + bindingPageSize.value)
})

// ==================== Tab3: 自动匹配 ====================
const matchRules = reactive({ nameExact: true, phoneExact: true, nameFuzzy: false })
const matchSuggestions = ref<any[]>([])
const matchRunning = ref(false)
const lastMatchResult = ref<number | null>(null)
const autoMatchPendingCount = ref(0)

// ==================== Tab4: 同步设置 ====================
const syncSettings = reactive({
  autoSyncEnabled: false, frequency: 'daily', syncTime: '',
  syncDepts: true, syncMembers: true, syncTags: false,
  newMemberAction: 'sync_only',
  disableCrmOnLeave: true, unbindOnLeave: true, transferCustomer: false
})
const loadingSyncSettings = ref(false)
const savingSettings = ref(false)

// ==================== Tab5: 同步日志 ====================
const logFilter = reactive({ type: 'all', range: 'today' })
const syncLogs = ref<any[]>([])
const loadingLogs = ref(false)
const logPage = ref(1)
const logPageSize = ref(20)
const logTotal = ref(0)

// ==================== 部门映射弹窗 ====================
const showMappingDialog = ref(false)
const mappingForm = reactive({ crmDeptId: '' })
const crmDepts = ref<any[]>([])

// ==================== 方法实现 ====================
const formatDate = (date: string) => date ? formatDateTime(date) : '-'

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

const handleConfigChange = async (id: number) => {
  selectedConfigId.value = id
  selectedDept.value = null
  deptMembers.value = []
  await fetchDeptTree()
  fetchBindings()
  fetchAutoMatchCount()
}

const handleDeptSearch = () => {
  deptTreeRef.value?.filter(deptSearch.value)
}

const filterDeptNode = (value: string, data: any) => !value || (data.wecomDeptName || '').includes(value)

const handleDeptClick = async (data: any) => {
  selectedDept.value = data
  if (!selectedConfigId.value) return
  loadingMembers.value = true
  try {
    const res: any = await getWecomDeptMembers(data.wecomDeptId, selectedConfigId.value)
    deptMembers.value = res?.list || res || []
  } catch (e: any) {
    console.error('获取部门成员失败:', e)
    deptMembers.value = []
  } finally {
    loadingMembers.value = false
  }
}

const fetchDeptTree = async () => {
  if (!selectedConfigId.value) return
  loadingDepts.value = true
  try {
    const res: any = await getWecomDepartmentTree(selectedConfigId.value)
    departmentTree.value = Array.isArray(res) ? res : (res?.data || [])
  } catch (e: any) {
    console.error('获取部门树失败:', e)
    departmentTree.value = []
  } finally {
    loadingDepts.value = false
  }
}

const handleSyncDepts = async () => {
  if (!selectedConfigId.value) { ElMessage.warning('请先选择企微配置'); return }
  syncingDepts.value = true
  try {
    await syncWecomDepartments(selectedConfigId.value)
    ElMessage.success('部门同步完成')
    await fetchDeptTree()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingDepts.value = false
  }
}

const handleSyncMembers = async () => {
  if (!selectedConfigId.value) return
  syncingMembers.value = true
  try {
    await syncWecomMembers(selectedConfigId.value)
    ElMessage.success('成员同步完成')
    if (selectedDept.value) handleDeptClick(selectedDept.value)
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingMembers.value = false
  }
}

const handleSetMapping = async () => {
  if (!selectedDept.value?.id || !mappingForm.crmDeptId) return
  try {
    const crmDept = crmDepts.value.find(d => d.id === mappingForm.crmDeptId)
    await setDeptMapping(selectedDept.value.id, {
      crmDeptId: mappingForm.crmDeptId,
      crmDeptName: crmDept?.name || ''
    })
    ElMessage.success('映射成功')
    showMappingDialog.value = false
    selectedDept.value.crmDeptName = crmDept?.name
    selectedDept.value.crmDeptId = mappingForm.crmDeptId
  } catch (e: any) {
    ElMessage.error(e?.message || '映射失败')
  }
}

// ==================== Tab2: 绑定 ====================
const fetchBindings = async () => {
  if (!selectedConfigId.value) return
  loadingBindings.value = true
  try {
    const res: any = await getBindingList({ configId: selectedConfigId.value })
    bindingList.value = res?.list || []
    const stats = res?.stats
    if (stats) {
      bindingStats.total = stats.total
      bindingStats.bound = stats.bound
      bindingStats.unbound = stats.unbound
      bindingStats.anomaly = stats.anomaly
    } else {
      const total = bindingList.value.length
      const bound = bindingList.value.filter((b: any) => b.crmUserName && b.crmUserId).length
      bindingStats.total = total
      bindingStats.bound = bound
      bindingStats.unbound = total - bound
      bindingStats.anomaly = bindingList.value.filter((b: any) => !b.isEnabled).length
    }
  } catch (e: any) {
    console.error('获取绑定列表失败:', e)
  } finally {
    loadingBindings.value = false
  }
}

const handleUnbind = async (row: any) => {
  try {
    await ElMessageBox.confirm(`确定解除「${row.wecomUserName}」与CRM用户的绑定？`, '提示', { type: 'warning' })
    await import('@/utils/request').then(({ default: request }) => request.delete(`/wecom/bindings/${row.id}`))
    ElMessage.success('已解除绑定')
    fetchBindings()
  } catch {
    // cancelled
  }
}

// ==================== Tab3: 自动匹配 ====================
const fetchAutoMatchCount = async () => {
  try {
    const res: any = await getAutoMatchCount()
    autoMatchPendingCount.value = res?.pendingCount || 0
  } catch {
    autoMatchPendingCount.value = 0
  }
}

const fetchAutoMatchList = async () => {
  try {
    const res: any = await getAutoMatchPending({ page: 1, pageSize: 100 })
    matchSuggestions.value = res?.list || []
    autoMatchPendingCount.value = res?.pendingCount || matchSuggestions.value.length
  } catch (e: any) {
    console.error('获取匹配列表失败:', e)
    matchSuggestions.value = []
  }
}

const executeAutoMatch = async () => {
  matchRunning.value = true
  try {
    const res: any = await runAutoMatch(selectedConfigId.value)
    const newCount = res?.newPendingCount || 0
    ElMessage.success(`自动匹配执行完成，发现 ${newCount} 条新匹配`)
    await fetchAutoMatchList()
    lastMatchResult.value = newCount
  } catch (e: any) {
    ElMessage.error(e?.message || '匹配执行失败')
  } finally {
    matchRunning.value = false
  }
}

const confirmMatch = async (id: number) => {
  try {
    await confirmAutoMatch(id)
    ElMessage.success('已确认关联')
    matchSuggestions.value = matchSuggestions.value.filter(s => s.id !== id)
    autoMatchPendingCount.value = Math.max(0, autoMatchPendingCount.value - 1)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

const rejectMatch = async (id: number) => {
  try {
    await rejectAutoMatch(id)
    ElMessage.success('已忽略')
    matchSuggestions.value = matchSuggestions.value.filter(s => s.id !== id)
    autoMatchPendingCount.value = Math.max(0, autoMatchPendingCount.value - 1)
  } catch (e: any) {
    ElMessage.error(e?.message || '操作失败')
  }
}

const confirmAllMatches = async () => {
  try {
    await ElMessageBox.confirm(`确定全部确认 ${matchSuggestions.value.length} 条匹配？`, '批量确认', { type: 'warning' })
    for (const s of matchSuggestions.value) {
      await confirmAutoMatch(s.id)
    }
    ElMessage.success('全部确认完成')
    matchSuggestions.value = []
    autoMatchPendingCount.value = 0
  } catch {
    // cancelled
  }
}

const rejectAllMatches = async () => {
  try {
    await ElMessageBox.confirm(`确定全部忽略 ${matchSuggestions.value.length} 条匹配？`, '批量忽略', { type: 'warning' })
    for (const s of matchSuggestions.value) {
      await rejectAutoMatch(s.id)
    }
    ElMessage.success('全部忽略完成')
    matchSuggestions.value = []
    autoMatchPendingCount.value = 0
  } catch {
    // cancelled
  }
}

// ==================== Tab4: 同步设置 ====================
const fetchSyncSettings = async () => {
  if (!selectedConfigId.value) return
  loadingSyncSettings.value = true
  try {
    const res: any = await getSyncSettings(selectedConfigId.value)
    if (res) Object.assign(syncSettings, res)
  } catch (e: any) {
    console.error('获取同步设置失败:', e)
  } finally {
    loadingSyncSettings.value = false
  }
}

const handleSaveSyncSettings = async () => {
  savingSettings.value = true
  try {
    await saveSyncSettings({ ...syncSettings, configId: selectedConfigId.value })
    ElMessage.success('保存成功')
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingSettings.value = false
  }
}

// ==================== Tab5: 同步日志 ====================
const fetchSyncLogs = async () => {
  loadingLogs.value = true
  try {
    const res: any = await getSyncLogs({ type: logFilter.type, range: logFilter.range, page: logPage.value, pageSize: logPageSize.value })
    syncLogs.value = res?.list || []
    logTotal.value = res?.total ?? syncLogs.value.length
  } catch (e: any) {
    console.error('获取同步日志失败:', e)
    syncLogs.value = []
  } finally {
    loadingLogs.value = false
  }
}

const handleLogFilterChange = () => {
  logPage.value = 1
  fetchSyncLogs()
}

const handleLogPageSizeChange = () => {
  logPage.value = 1
  fetchSyncLogs()
}

// ==================== 初始化 ====================
const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    configs.value = (Array.isArray(res) ? res : []).filter((c: any) => c.isEnabled)
    if (configs.value.length > 0) {
      selectedConfigId.value = configs.value[0].id
      handleConfigChange(configs.value[0].id)
    }
  } catch (e) {
    console.error('获取配置失败:', e)
  }
}

// 切换Tab时自动加载数据
watch(activeTab, (tab) => {
  if (tab === 'auto-match') fetchAutoMatchList()
  if (tab === 'sync-settings') fetchSyncSettings()
  if (tab === 'sync-logs') fetchSyncLogs()
})

onMounted(() => {
  fetchConfigs()
  fetchAutoMatchCount()
})
</script>

<style scoped>
.wecom-address-book { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.org-layout { display: flex; gap: 20px; min-height: 500px; }
.org-tree-panel { width: 320px; flex-shrink: 0; border-right: 1px solid #E5E7EB; padding-right: 20px; }
.org-detail-panel { flex: 1; }
.tree-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
.dept-tree-node { display: flex; align-items: center; }
.dept-header { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.dept-header h3 { margin: 0; font-size: 18px; font-weight: 600; color: #1F2937; }
.dept-meta { color: #9CA3AF; font-size: 13px; margin-bottom: 16px; }
.dept-meta strong { color: #4B5563; }
.dept-actions { display: flex; gap: 8px; }
.monospace-text { font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; font-size: 12px; color: #6B7280; }
.member-info { display: flex; align-items: center; gap: 8px; }

/* V4 统计卡片 */
.stat-cards { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; margin-bottom: 20px; }
.stat-card {
  background: #fff; border: 1px solid #F3F4F6; border-radius: 12px;
  padding: 20px 24px; text-align: center; transition: all 0.25s;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
}
.stat-card:hover { transform: translateY(-2px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
.stat-value { font-size: 28px; font-weight: 700; color: #1F2937; }
.stat-label { font-size: 12px; color: #9CA3AF; margin-top: 4px; }
.text-success { color: #10B981; }
.text-warning { color: #F59E0B; }
.text-danger { color: #EF4444; }
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; flex-wrap: wrap; }
.spacer { flex: 1; }

.match-config { background: #F9FAFB; border-radius: 12px; padding: 20px; }
.match-config h4 { margin: 0 0 12px; font-size: 15px; font-weight: 600; color: #1F2937; }
.match-rules { display: flex; flex-direction: column; gap: 8px; }
.match-badge { margin-left: 6px; }
.match-list-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
.match-item-card { border: 1px solid #F3F4F6; border-radius: 12px; padding: 20px; margin-bottom: 12px; transition: all 0.25s; }
.match-item-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06); }
.match-pair { display: flex; align-items: stretch; gap: 12px; }
.match-side { flex: 1; background: #F9FAFB; border-radius: 8px; padding: 14px; }
.side-label { font-size: 12px; color: #9CA3AF; margin-bottom: 6px; }
.side-name { font-size: 16px; font-weight: 600; color: #1F2937; margin-bottom: 4px; }
.side-info { font-size: 13px; color: #6B7280; }
.match-arrow { display: flex; align-items: center; font-size: 20px; color: #D1D5DB; }
.match-footer { display: flex; align-items: center; gap: 12px; margin-top: 14px; flex-wrap: wrap; }
.match-basis { font-size: 13px; color: #6B7280; }
.match-ops { margin-left: auto; display: flex; gap: 8px; }

/* 同步设置卡片式布局 */
.sync-settings-container { max-width: 680px; }
.settings-section {
  background: #F9FAFB; border-radius: 12px; padding: 20px 24px; margin-bottom: 16px;
}
.section-row { display: flex; align-items: center; gap: 12px; }
.section-label { font-size: 14px; color: #374151; font-weight: 500; white-space: nowrap; }
.section-title-bar {
  font-size: 14px; font-weight: 600; color: #1F2937; margin-bottom: 14px;
  padding-bottom: 10px; border-bottom: 1px solid #E5E7EB;
}
.checkbox-grid { display: flex; gap: 24px; flex-wrap: wrap; }
.checkbox-vertical { display: flex; flex-direction: column; gap: 12px; }
.radio-vertical { display: flex; flex-direction: column; gap: 12px; }
.radio-vertical .el-radio { margin-right: 0; }

/* 翻页控件 */
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; padding: 8px 0; }

</style>

