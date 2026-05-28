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
        <!-- Tab 1: 组织架构（混合树 + 详情面板） -->
        <el-tab-pane label="组织架构" name="organization">
          <div class="org-layout">
            <!-- 左侧：部门/成员混合树 -->
            <div class="org-tree-panel">
              <div class="tree-toolbar">
                <el-input v-model="deptSearch" placeholder="搜索部门/成员" prefix-icon="Search" clearable size="small" @input="handleDeptSearch" />
                <el-button type="primary" size="small" :loading="syncingAll" @click="handleSyncAll">同步组织架构</el-button>
              </div>
              <el-tree
                :key="treeKey"
                :data="mixedTreeData"
                :props="mixedTreeProps"
                :filter-node-method="filterMixedNode"
                ref="deptTreeRef"
                node-key="nodeId"
                highlight-current
                :expand-on-click-node="false"
                lazy
                :load="loadMixedTreeNode"
                @node-click="handleMixedNodeClick"
              >
                <template #default="{ data }">
                  <span class="mixed-tree-node" :class="{ 'is-member': data.nodeType === 'member' }">
                    <template v-if="data.nodeType === 'dept'">
                      <el-icon style="color: #F59E0B; margin-right: 4px"><FolderOpened /></el-icon>
                      <span class="node-label">
                        <WwOpenData
                          v-if="isDeptNameMissing(data)"
                          type="departmentName"
                          :openid="String(data.wecomDeptId)"
                          :corpid="currentCorpId"
                          :fallback="formatDeptLabel(data)"
                        />
                        <template v-else>{{ formatDeptLabel(data) }}</template>
                      </span>
                      <span class="node-count">({{ data.memberCount || 0 }}人)</span>
                      <el-tag v-if="data.crmDeptName" type="success" size="small" style="margin-left: 4px">已映射</el-tag>
                    </template>
                    <template v-else>
                      <el-avatar :size="22" :src="data.wecomAvatar" style="margin-right: 6px; flex-shrink: 0">
                        {{ getMemberInitial(data) }}
                      </el-avatar>
                      <span class="node-label">
                        <WwOpenData
                          v-if="isMemberNameMissing(data)"
                          type="userName"
                          :openid="data.wecomUserId"
                          :corpid="currentCorpId"
                          :fallback="formatMemberLabel(data)"
                        />
                        <template v-else>{{ formatMemberLabel(data) }}</template>
                      </span>
                      <span class="node-account" v-if="data.wecomUserId && data.label !== data.wecomUserId">({{ shortenUserId(data.wecomUserId) }})</span>
                      <el-tag v-if="data.crmUserName" type="success" size="small" style="margin-left: 4px">{{ data.crmUserName }}</el-tag>
                      <el-tag v-else type="info" size="small" style="margin-left: 4px">未绑定</el-tag>
                    </template>
                  </span>
                </template>
              </el-tree>
              <el-empty v-if="!mixedTreeData.length && !loadingDepts && !syncingAll" description="暂无组织架构数据，请点击「同步组织架构」" :image-size="60" />
              <div v-if="syncingAll && !mixedTreeData.length" style="text-align: center; padding: 40px 0; color: #909399">
                <el-icon class="is-loading" :size="24"><Loading /></el-icon>
                <div style="margin-top: 8px">正在自动同步组织架构，请稍候...</div>
              </div>
            </div>
            <!-- 右侧：详情面板 -->
            <div class="org-detail-panel">
              <el-empty v-if="!orgSelectedType" description="请选择左侧部门或成员查看详情" />
              <DeptSummary
                v-else-if="orgSelectedType === 'dept'"
                :dept-id="orgSelectedDeptId"
                :config-id="selectedConfigId!"
                @select-member="handleSelectMemberFromDept"
              />
              <MemberProfile
                v-else-if="orgSelectedType === 'member'"
                :wecom-user-id="orgSelectedMemberId"
                :config-id="selectedConfigId!"
                @refresh="handleProfileRefresh"
              />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 2: 成员绑定（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="成员绑定" name="binding">
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
            <el-table-column prop="wecomUserName" label="企微成员" min-width="160">
              <template #default="{ row }">
                <div class="member-info">
                  <el-avatar :size="28" :src="row.wecomAvatar">{{ getMemberInitial(row) }}</el-avatar>
                  <div style="display: flex; flex-direction: column; line-height: 1.4">
                    <span style="font-weight: 500">
                      <WwOpenData
                        v-if="isMemberNameMissing(row)"
                        type="userName"
                        :openid="row.wecomUserId"
                        :corpid="currentCorpId"
                        :fallback="formatMemberLabel(row)"
                      />
                      <template v-else>{{ row.wecomUserName || (row.wecomUserId?.startsWith('sidebar_') ? row.crmUserName || '侧边栏用户' : row.wecomUserId) }}</template>
                    </span>
                    <span v-if="row.wecomUserId && !row.wecomUserId.startsWith('sidebar_')" class="monospace-text" style="font-size: 11px">{{ shortenUserId(row.wecomUserId) }}</span>
                  </div>
                </div>
              </template>
            </el-table-column>
            <el-table-column label="CRM用户" min-width="120">
              <template #default="{ row }">
                <span v-if="row.crmUserName" style="color: #10B981; font-weight: 500">{{ row.crmUserName }}</span>
                <el-tag v-else type="info" size="small">未绑定</el-tag>
              </template>
            </el-table-column>
            <el-table-column label="部门" min-width="120">
              <template #default="{ row }">
                <span>{{ row.department || resolveDeptNames(row.wecomDepartmentIds) }}</span>
              </template>
            </el-table-column>
            <el-table-column label="绑定来源" width="100">
              <template #default="{ row }">
                <el-tag
                  :type="row.bindOperator === 'sidebar' ? 'success' : row.bindOperator === 'sync' ? 'info' : 'warning'"
                  size="small"
                  effect="plain"
                >{{ formatBindOperator(row.bindOperator) }}</el-tag>
              </template>
            </el-table-column>
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
                <el-button v-else type="warning" link size="small" @click="openBindDialog(row)">换绑</el-button>
                <el-button v-if="row.crmUserName" type="danger" link size="small" @click="handleUnbind(row)">解除</el-button>
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

        <!-- 自动匹配暂停，后续版本恢复 -->
        <!-- <el-tab-pane v-if="isAdminRole" name="auto-match">
          ...
        </el-tab-pane> -->

        <!-- Tab 3: 同步设置（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="同步设置" name="sync-settings">
          <div class="sync-settings-container" v-loading="loadingSyncSettings">
            <!-- 部门名称设置（第三方应用专用） -->
            <div class="settings-section">
              <div class="section-title-bar">
                部门名称设置
                <el-tag type="warning" size="small" style="margin-left: 8px">第三方应用限制</el-tag>
              </div>
              <el-alert
                type="info"
                :closable="false"
                show-icon
                style="margin-bottom: 16px"
              >
                <template #title>
                  <span style="font-weight:500">为什么需要手动设置部门名称？</span>
                </template>
                <template #default>
                  <p style="margin:4px 0;color:#606266">由于企业微信安全策略限制，第三方应用无法通过API获取部门名称（仅能获取部门ID）。请对照企业微信管理后台的组织架构，手动填写各部门的真实名称。</p>
                </template>
              </el-alert>
              <div v-if="deptNameList.length > 0">
                <div v-for="dept in deptNameList" :key="dept.id" class="dept-name-row">
                  <span class="dept-name-id">ID: {{ dept.id }}</span>
                  <el-input
                    v-model="dept.editName"
                    :placeholder="`请输入部门${dept.id}的名称`"
                    size="small"
                    style="width: 200px"
                  />
                  <span v-if="dept.currentName && dept.currentName !== String(dept.id)" class="dept-name-current">
                    当前: {{ dept.currentName }}
                  </span>
                </div>
                <el-button type="primary" size="small" style="margin-top: 12px" :loading="savingDeptNames" @click="handleSaveDeptNames">
                  保存部门名称
                </el-button>
              </div>
              <el-empty v-else description="暂无部门数据，请先同步组织架构" :image-size="40" />
            </div>
          </div>
        </el-tab-pane>

        <!-- Tab 5: 同步日志（仅管理员可见） -->
        <el-tab-pane v-if="isAdminRole" label="同步日志" name="sync-logs">
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
    <el-dialog v-model="showManualBind" :title="manualBindOriginalCrm ? '换绑CRM用户' : '绑定CRM用户'" width="520px">
      <el-form label-width="100px">
        <el-form-item label="企微成员">
          <div style="display: flex; align-items: center; gap: 8px">
            <el-avatar :size="32" :src="manualBindForm.wecomAvatar">{{ (manualBindForm.wecomUserName || '?')[0] }}</el-avatar>
            <div style="line-height: 1.4">
              <div style="font-weight: 600">{{ manualBindForm.wecomUserName || manualBindForm.wecomUserId }}</div>
              <div v-if="manualBindForm.wecomUserName" style="color: #9CA3AF; font-size: 12px">{{ manualBindForm.wecomUserId }}</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="当前绑定" v-if="manualBindOriginalCrm">
          <el-tag type="success">{{ manualBindOriginalCrm }}</el-tag>
          <span style="color: #9CA3AF; font-size: 12px; margin-left: 8px">将被替换</span>
        </el-form-item>
        <el-form-item label="CRM用户">
          <el-select
            v-model="manualBindForm.crmUserId"
            filterable
            remote
            reserve-keyword
            placeholder="点击下拉选择或搜索CRM用户"
            :remote-method="searchCrmUsers"
            :loading="searchingCrmUsers"
            style="width: 100%"
            @change="handleCrmUserSelect"
            @focus="loadInitialCrmUsers"
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
            @focus="loadInitialCrmUsers"
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
              :label="(b.wecomUserName || b.wecomUserId) + (b.wecomUserName ? ' (' + b.wecomUserId + ')' : '')"
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
import { useUserStore } from '@/stores/user'
import { ElMessage, ElMessageBox } from 'element-plus'
import { FolderOpened, Loading } from '@element-plus/icons-vue'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import MemberProfile from './components/MemberProfile.vue'
import DeptSummary from './components/DeptSummary.vue'
import WwOpenData from './components/WwOpenData.vue'
import { useWecomDemo } from './composables/useWecomDemo'
import { useWecomOpenData } from './composables/useWecomOpenData'
import { useWwOpenDataSdk } from './composables/useWwOpenDataSdk'
import { getLastSelectedConfigId, saveSelectedConfigId } from './composables/useWecomConfig'
import { getWecomConfigs, createWecomBinding, batchCreateWecomBindings } from '@/api/wecom'
import {
  getWecomDepartmentTree, setDeptMapping,
  syncWecomDepartments, syncWecomMembers,
  getSyncSettings, saveSyncSettings, getSyncLogs,
  getAutoMatchPending, getAutoMatchCount, confirmAutoMatch, rejectAutoMatch,
  getBindingList, runAutoMatch,
  getWecomDeptChildren,
  repairWecomNames,
  updateDeptNames
} from '@/api/wecomAddressBook'
import { formatDateTime } from '@/utils/date'
import request from '@/utils/request'

const { isDemoMode } = useWecomDemo()

// 当前用户角色判断
const userStore = useUserStore()
const isAdminRole = computed(() => ['super_admin', 'admin'].includes(userStore.currentUser?.role || ''))

const selectedConfigId = ref<number>()
const configs = ref<any[]>([])
const activeTab = ref('organization')

// 当前企微配置的 corpId，用于 ww-open-data 组件
const currentCorpId = computed(() => {
  const cfg = configs.value.find(c => c.id === selectedConfigId.value)
  return cfg?.corpId || ''
})

/** 判断部门名称是否缺失（需要通过 ww-open-data 展示） */
const isDeptNameMissing = (data: any) => {
  const name = data.label || data.wecomDeptName
  if (!name) return true
  // 名称等于纯数字ID
  if (String(name).trim() === String(data.wecomDeptId)) return true
  // 名称是"部门X"这种占位格式
  if (/^部门\s*\d+$/.test(String(name).trim())) return true
  // 名称纯数字（可能是ID）
  if (/^\d+$/.test(String(name).trim())) return true
  return false
}

/** 判断成员名称是否缺失 */
const isMemberNameMissing = (data: any) => {
  const name = data.wecomUserName || data.label
  if (!name) return true
  if (name === data.wecomUserId) return true
  // open_userid 格式（wo开头的长字符串）
  if (/^wo[a-zA-Z0-9_-]{20,}$/.test(name)) return true
  return false
}


// ==================== Tab1: 组织架构（混合树） ====================
const deptSearch = ref('')
const selectedDept = ref<any>(null)
const deptMembers = ref<any[]>([])
const deptTreeRef = ref()
const loadingDepts = ref(false)
const syncingDepts = ref(false)
const syncingMembers = ref(false)
const syncingAll = ref(false)

// 混合树相关
const mixedTreeData = ref<any[]>([])
const orgSelectedType = ref<'dept' | 'member' | ''>('')
const orgSelectedDeptId = ref<number>(0)
const orgSelectedMemberId = ref('')

// 部门名称映射：用于将部门ID解析为名称
const deptNameMap = ref<Record<number, string>>({})

const buildDeptNameMap = (nodes: any[]) => {
  for (const n of nodes) {
    const id = n.wecomDeptId ?? n.id
    const name = n.wecomDeptName ?? n.name ?? n.label
    if (id && name && String(name) !== String(id)) {
      deptNameMap.value[id] = name
    }
    if (n.children?.length) buildDeptNameMap(n.children)
  }
}

const resolveDeptNames = (deptIds: string) => {
  if (!deptIds) return '-'
  return deptIds.split(',').map(s => {
    const id = Number(s.trim())
    return deptNameMap.value[id] || s.trim()
  }).join(', ')
}

const mixedTreeProps = {
  label: 'label',
  children: 'children',
  isLeaf: 'isLeaf'
}

const filterMixedNode = (value: string, data: any) => {
  if (!value) return true
  return (data.label || '').toLowerCase().includes(value.toLowerCase())
}

// 记录已自动同步过的configId，避免重复自动同步
const autoSyncedConfigs = new Set<number>()

const loadMixedTreeNode = async (node: any, resolve: (data: any[]) => void) => {
  if (!selectedConfigId.value) { resolve([]); return }

  if (node.level === 0) {
    // 根节点：加载顶层部门树并转换为混合节点
    try {
      const res: any = await getWecomDepartmentTree(selectedConfigId.value)
      let depts = Array.isArray(res) ? res : (res?.data || [])

      // 如果本地无数据且尚未自动同步过，则自动触发同步
      if (depts.length === 0 && !autoSyncedConfigs.has(selectedConfigId.value)) {
        autoSyncedConfigs.add(selectedConfigId.value)
        syncingAll.value = true
        try {
          try {
            await syncWecomDepartments(selectedConfigId.value!)
          } catch (e: any) {
            console.warn('[AddressBook] 自动同步部门失败，继续尝试同步成员:', e?.message)
          }
          await syncWecomMembers(selectedConfigId.value!)
          // 重新加载
          const res2: any = await getWecomDepartmentTree(selectedConfigId.value!)
          depts = Array.isArray(res2) ? res2 : (res2?.data || [])
        } catch (e: any) {
          console.warn('[AddressBook] 自动同步失败:', e?.message)
        } finally {
          syncingAll.value = false
        }
      }

      // 构建部门名称映射
      buildDeptNameMap(depts)
      const rootNodes = depts.map((d: any) => ({
        nodeId: `dept_${d.wecomDeptId}`,
        nodeType: 'dept',
        label: d.wecomDeptName || ('部门 ' + d.wecomDeptId),
        wecomDeptId: d.wecomDeptId,
        memberCount: d.memberCount || 0,
        crmDeptName: d.crmDeptName,
        isLeaf: false
      }))
      mixedTreeData.value = rootNodes
      resolve(rootNodes)
      // 根节点加载后，延迟绑定 ww-open-data 元素
      if (wwOpenDataReady.value) {
        setTimeout(() => wwBindAll(), 300)
      }
    } catch {
      resolve([])
    }
    return
  }

  // 非根节点：如果是部门节点，加载子部门 + 成员
  const nodeData = node.data
  if (nodeData.nodeType === 'dept' && nodeData.wecomDeptId) {
    try {
      const res: any = await getWecomDeptChildren(nodeData.wecomDeptId, selectedConfigId.value!)
      const children = Array.isArray(res) ? res : []
      resolve(children)
      // 新节点加载后，延迟绑定 ww-open-data 元素
      if (wwOpenDataReady.value) {
        setTimeout(() => wwBindAll(), 300)
      }
    } catch {
      resolve([])
    }
  } else {
    resolve([])
  }
}

const handleMixedNodeClick = (data: any) => {
  if (data.nodeType === 'dept') {
    orgSelectedType.value = 'dept'
    orgSelectedDeptId.value = data.wecomDeptId
    orgSelectedMemberId.value = ''
  } else if (data.nodeType === 'member') {
    orgSelectedType.value = 'member'
    orgSelectedMemberId.value = data.wecomUserId
    orgSelectedDeptId.value = 0
  }
}

const handleSelectMemberFromDept = (wecomUserId: string) => {
  orgSelectedType.value = 'member'
  orgSelectedMemberId.value = wecomUserId
  orgSelectedDeptId.value = 0
  // 尝试在树中高亮该成员节点
  deptTreeRef.value?.setCurrentKey(`member_${wecomUserId}`)
}

const handleProfileRefresh = () => {
  // 成员绑定变化后，刷新树数据
  reloadMixedTree()
}

const reloadMixedTree = () => {
  mixedTreeData.value = []
  orgSelectedType.value = ''
  orgSelectedDeptId.value = 0
  orgSelectedMemberId.value = ''
  // el-tree lazy模式，清空后会触发重新加载
  if (deptTreeRef.value) {
    // 通过改变 key 强制重建树
    treeKey.value++
  }
}

const treeKey = ref(0)

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
const manualBindOriginalCrm = ref('')
const multiBind = ref({ crmUserId: '', crmUserName: '', wecomUserIds: [] as string[] })

const openBindDialog = (row: any) => {
  manualBindOriginalCrm.value = row.crmUserName || ''
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
  loadInitialCrmUsers()
}

const searchCrmUsers = async (keyword: string) => {
  searchingCrmUsers.value = true
  try {
    const params: any = { limit: 50 }
    if (keyword && keyword.length >= 1) params.search = keyword
    const res: any = await request.get('/users', { params })
    const rawList = res?.items || res?.users || res?.list || res?.data?.items || res?.data?.users || []
    crmUserOptions.value = (Array.isArray(rawList) ? rawList : []).map((u: any) => ({
      id: u.id,
      name: u.realName || u.name || u.username || '',
      username: u.username || u.code || ''
    }))
  } catch { crmUserOptions.value = [] }
  searchingCrmUsers.value = false
}

const loadInitialCrmUsers = () => {
  if (crmUserOptions.value.length === 0) searchCrmUsers('')
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

const formatBindOperator = (op: string) => {
  const map: Record<string, string> = { sidebar: '侧边栏', sync: '通讯录同步', h5_app: 'H5应用', admin: '管理员' }
  return map[op] || op || '手动'
}

const maskPhone = (phone: string) => {
  if (!phone || phone.length < 7) return phone || '-'
  return phone.slice(0, 3) + '****' + phone.slice(-4)
}

/** 格式化部门树节点标签：优先显示部门名称 */
const formatDeptLabel = (data: any) => {
  const name = data.label || data.wecomDeptName
  // 如果名称就是纯数字ID，加前缀显示
  if (!name || /^\d+$/.test(String(name).trim())) {
    return `部门${data.wecomDeptId}`
  }
  if (/^部门\s*\d+$/.test(String(name).trim())) return name
  return name
}

/** 格式化成员树节点标签：显示姓名 */
const formatMemberLabel = (data: any) => {
  const name = data.wecomUserName || data.label
  if (!name || name === data.wecomUserId) {
    // open_userid 格式（wo开头长字符串）：截短显示
    const uid = data.wecomUserId || ''
    if (/^wo[a-zA-Z0-9_-]{20,}$/.test(uid)) {
      return `成员(${uid.slice(0, 8)}...)`
    }
    return uid || '-'
  }
  return name
}

/** 获取成员首字符用于头像fallback */
const getMemberInitial = (data: any) => {
  const name = data.wecomUserName || data.label || ''
  if (name && name !== data.wecomUserId && !/^wo[a-zA-Z0-9_-]{20,}$/.test(name)) {
    return name.charAt(0)
  }
  return '👤'
}

/** 截短过长的UserId用于树节点展示 */
const shortenUserId = (userId: string) => {
  if (!userId) return ''
  if (userId.length <= 12) return userId
  return userId.slice(0, 6) + '...' + userId.slice(-4)
}

const handleConfigChange = async (id: number) => {
  selectedConfigId.value = id
  saveSelectedConfigId(id)
  selectedDept.value = null
  deptMembers.value = []
  reloadMixedTree()
  fetchBindings()
  fetchAutoMatchCount()
  tryInitWecomSdk()
}

const handleDeptSearch = () => {
  deptTreeRef.value?.filter(deptSearch.value)
}

const _handleSyncDepts = async () => {
  if (!selectedConfigId.value) { ElMessage.warning('请先选择企微配置'); return }
  syncingDepts.value = true
  try {
    await syncWecomDepartments(selectedConfigId.value)
    ElMessage.success('部门同步完成')
    reloadMixedTree()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingDepts.value = false
  }
}

const _handleSyncMembers = async () => {
  if (!selectedConfigId.value) return
  syncingMembers.value = true
  try {
    await syncWecomMembers(selectedConfigId.value)
    ElMessage.success('成员同步完成')
    reloadMixedTree()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingMembers.value = false
  }
}

const repairing = ref(false)
const handleRepairNames = async () => {
  if (!selectedConfigId.value) { ElMessage.warning('请先选择企微配置'); return }
  repairing.value = true
  try {
    const res: any = await repairWecomNames(selectedConfigId.value)
    ElMessage.success(res?.message || '修复完成')
    reloadMixedTree()
  } catch (e: any) {
    ElMessage.error(e?.message || '修复失败：请检查企微通讯录Secret是否配置正确')
  } finally {
    repairing.value = false
  }
}

const handleSyncAll = async () => {
  if (!selectedConfigId.value) { ElMessage.warning('请先选择企微配置'); return }
  syncingAll.value = true
  let deptResult = ''
  let memberResult = ''
  try {
    try {
      const deptRes: any = await syncWecomDepartments(selectedConfigId.value)
      deptResult = deptRes?.message || '部门同步完成'
    } catch (e: any) {
      deptResult = e?.message || '部门同步失败'
      console.warn('[AddressBook] 同步部门失败:', e?.message)
    }
    try {
      const memberRes: any = await syncWecomMembers(selectedConfigId.value)
      memberResult = memberRes?.message || '成员同步完成'
      if (memberRes?.data) {
        const d = memberRes.data
        console.log('[AddressBook] 成员同步详情:', JSON.stringify(d, null, 2))
        if (d.deptDistribution) {
          const deptInfo = Object.entries(d.deptDistribution).map(([k, v]) => `部门${k}:${v}人`).join(', ')
          console.log('[AddressBook] 成员部门分布:', deptInfo)
        }
        if (d.total === 0) {
          memberResult += `\n提示：API返回0成员，可能需要在企微后台确认应用可见范围是否包含对应部门的成员`
        }
      }
    } catch (e: any) {
      memberResult = e?.message || '成员同步失败'
    }
    reloadMixedTree()
    if (memberResult.includes('失败') && deptResult.includes('失败')) {
      ElMessage.error({ message: memberResult, duration: 8000 })
    } else if (memberResult.includes('失败') || deptResult.includes('失败')) {
      ElMessage.warning({ message: `${deptResult}；${memberResult}`, duration: 6000 })
    } else {
      ElMessage.success({ message: memberResult || '组织架构同步完成', duration: 5000 })
    }
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败')
  } finally {
    syncingAll.value = false
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

// ==================== 部门名称编辑 ====================
const deptNameList = ref<Array<{ id: number; currentName: string; editName: string }>>([])
const savingDeptNames = ref(false)

/** 递归展平部门树为一维数组 */
const flattenDeptTree = (nodes: any[]): any[] => {
  const result: any[] = []
  const walk = (list: any[]) => {
    for (const node of list) {
      result.push(node)
      if (node.children && node.children.length > 0) {
        walk(node.children)
      }
    }
  }
  walk(nodes)
  return result
}

const loadDeptNameList = async () => {
  if (!selectedConfigId.value) return
  try {
    const res: any = await getWecomDepartmentTree(selectedConfigId.value)
    const tree = Array.isArray(res) ? res : (res?.data || [])
    // 递归展平树结构，确保所有部门（包括子部门）都显示
    const allDepts = flattenDeptTree(tree)
    deptNameList.value = allDepts.map((d: any) => ({
      id: d.id || d.wecomDeptId,
      currentName: d.name || d.wecomDeptName || String(d.id || d.wecomDeptId),
      editName: (d.name && d.name !== String(d.id)) ? d.name : ''
    }))
  } catch { deptNameList.value = [] }
}

const handleSaveDeptNames = async () => {
  if (!selectedConfigId.value) return
  const toUpdate = deptNameList.value
    .filter(d => d.editName && d.editName.trim())
    .map(d => ({ id: d.id, name: d.editName.trim() }))
  if (toUpdate.length === 0) {
    ElMessage.warning('请至少填写一个部门名称')
    return
  }
  savingDeptNames.value = true
  try {
    const res: any = await updateDeptNames(selectedConfigId.value, toUpdate)
    ElMessage.success(res?.message || `已更新 ${toUpdate.length} 个部门名称`)
    await loadDeptNameList()
  } catch (e: any) {
    ElMessage.error(e?.message || '保存失败')
  } finally {
    savingDeptNames.value = false
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
      const lastId = getLastSelectedConfigId()
      if (lastId && configs.value.some((c: any) => c.id === lastId)) {
        selectedConfigId.value = lastId
      } else {
        selectedConfigId.value = configs.value[0].id
      }
      handleConfigChange(selectedConfigId.value)
    }
  } catch (e) {
    console.error('获取配置失败:', e)
  }
}

// 切换Tab时自动加载数据
watch(activeTab, (tab) => {
  if (tab === 'binding') fetchBindings()
  if (tab === 'auto-match') fetchAutoMatchList()
  if (tab === 'sync-settings') { fetchSyncSettings(); loadDeptNameList() }
  if (tab === 'sync-logs') fetchSyncLogs()
})

const { initFromConfig: initWecomOpenDataSdk } = useWecomOpenData()
const { initFromConfig: initWwOpenData, isReady: wwOpenDataReady, bindAll: wwBindAll } = useWwOpenDataSdk()

const tryInitWecomSdk = async () => {
  // 初始化通讯录展示组件 SDK（jwxwork-1.0.0.js）
  try {
    const ok = await initWwOpenData(selectedConfigId.value || null)
    if (ok) {
      console.log('[AddressBook] ✅ 通讯录展示组件SDK初始化成功')
      // SDK 就绪后重新绑定所有 ww-open-data 元素
      setTimeout(() => wwBindAll(), 500)
    } else {
      console.log('[AddressBook] 通讯录展示组件SDK未就绪（非企微环境），使用降级显示')
    }
  } catch (e: any) {
    console.log('[AddressBook] 通讯录展示组件SDK初始化失败:', e?.message || '未知错误')
  }
  // 同时初始化会话存档SDK（用于消息展示组件）
  try {
    await initWecomOpenDataSdk(selectedConfigId.value || null)
  } catch {
    // 会话存档SDK初始化失败不影响通讯录展示
  }
}

// SDK 就绪后，刷新已渲染的 ww-open-data 元素
watch(wwOpenDataReady, (ready) => {
  if (ready && mixedTreeData.value.length > 0) {
    setTimeout(() => wwBindAll(), 300)
  }
})

onMounted(async () => {
  await fetchConfigs()
  fetchAutoMatchCount()
  // 初始化企微SDK（用于通讯录展示组件 ww-open-data）
  if (selectedConfigId.value) {
    tryInitWecomSdk()
  }
})
</script>

<style scoped>
.wecom-address-book { padding: 20px; background: var(--v4-bg-page, #F5F7FA); min-height: 100%; }
.org-layout { display: flex; gap: 20px; min-height: 500px; }
.org-tree-panel { width: 320px; flex-shrink: 0; border-right: 1px solid #E5E7EB; padding-right: 20px; }
.org-detail-panel { flex: 1; }
.tree-toolbar { display: flex; gap: 8px; margin-bottom: 12px; }
/* 混合树节点 */
.mixed-tree-node { display: flex; align-items: center; line-height: 1.4; font-size: 14px; }
.mixed-tree-node .node-label { color: #1F2937; font-weight: 500; }
.mixed-tree-node .node-count { color: #9CA3AF; font-size: 12px; margin-left: 4px; }
.mixed-tree-node.is-member { padding: 2px 0; }
.mixed-tree-node.is-member .node-label { font-weight: 400; color: #374151; }
.mixed-tree-node .node-account { font-size: 11px; color: #9CA3AF; margin-left: 4px; font-family: 'SF Mono', 'Menlo', 'Consolas', monospace; }
.org-tree-panel :deep(.el-tree-node__content) { height: 36px; }
.org-tree-panel :deep(.el-tree-node.is-current > .el-tree-node__content) { background: #EEF2FF; }
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

/* 部门名称编辑 */
.dept-name-row { display: flex; align-items: center; gap: 12px; margin-bottom: 8px; }
.dept-name-id { font-size: 12px; color: #909399; min-width: 60px; font-family: monospace; }
.dept-name-current { font-size: 12px; color: #67c23a; margin-left: 8px; }

/* 翻页控件 */
.pagination-wrap { display: flex; justify-content: flex-end; margin-top: 16px; padding: 8px 0; }

</style>

