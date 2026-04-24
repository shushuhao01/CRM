<template>
  <div class="wecom-contact-book">
    <!-- 示例模式横幅 -->
    <WecomDemoBanner :is-demo-mode="isDemoMode" />

    <el-card>
      <template #header>
        <WecomHeader tab-name="contact-book">
          通讯录
          <template #actions>
            <el-select v-model="selectedConfigId" placeholder="选择企微配置" style="width: 180px" @change="handleConfigChange" :disabled="isDemoMode">
              <el-option v-for="c in displayConfigs" :key="c.id" :label="c.name" :value="c.id" />
            </el-select>
            <el-button type="success" :loading="syncing" @click="handleSync" :disabled="isDemoMode">
              <el-icon><Refresh /></el-icon> 同步通讯录
            </el-button>
          </template>
        </WecomHeader>
      </template>

      <!-- 未授权空状态 -->
      <div v-if="isDemoMode" class="empty-state">
        <div class="empty-icon">📒</div>
        <div class="empty-title">暂无通讯录数据</div>
        <div class="empty-desc">请先完成企业微信授权配置，授权后将自动同步企业通讯录</div>
      </div>

      <div v-else class="contact-layout">
        <!-- 左侧：部门+成员树 -->
        <div class="dept-tree-panel">
          <div class="dept-tree-header">
            <el-input v-model="deptSearch" placeholder="搜索部门/成员" clearable size="small" prefix-icon="Search" />
          </div>
          <div class="dept-tree-body" v-loading="loading">
            <el-tree
              ref="treeRef"
              :data="treeData"
              :props="treeProps"
              node-key="_treeKey"
              highlight-current
              default-expand-all
              :expand-on-click-node="true"
              :filter-node-method="filterNode"
              @node-click="handleNodeClick"
            >
              <template #default="{ data }">
                <span class="tree-node" :class="{ 'tree-node-member': data._type === 'member', 'tree-node-abnormal': data._isAbnormal }">
                  <template v-if="data._type === 'dept'">
                    <span class="dept-icon">📁</span>
                    <span class="dept-name">{{ data.name }}</span>
                    <span class="dept-count" v-if="data._memberCount">({{ data._memberCount }})</span>
                  </template>
                  <template v-else>
                    <el-avatar :src="data.avatar || data.thumb_avatar" :size="22" style="flex-shrink:0">{{ data.name?.charAt(0) }}</el-avatar>
                    <span class="member-tree-name" :class="{ 'text-danger': data._isAbnormal }">{{ data.name }}</span>
                    <el-tag v-if="data._isAbnormal" type="danger" size="small" style="margin-left:4px;font-size:10px;padding:0 4px;">异常</el-tag>
                    <el-tag v-if="data.isLeader || data.is_leader_in_dept?.includes(1)" type="warning" size="small" style="margin-left:4px;font-size:10px;padding:0 4px;">负责人</el-tag>
                  </template>
                </span>
              </template>
            </el-tree>
          </div>
        </div>

        <!-- 右侧：成员详情 或 部门成员列表 -->
        <div class="detail-panel">
          <!-- 成员详情模式 -->
          <template v-if="selectedMember">
            <div class="detail-header">
              <el-button link @click="selectedMember = null" style="margin-bottom: 12px">← 返回列表</el-button>
            </div>
            <div class="member-detail-card">
              <div class="detail-avatar-row">
                <el-avatar :src="selectedMember.avatar || selectedMember.thumb_avatar" :size="56">{{ selectedMember.name?.charAt(0) }}</el-avatar>
                <div>
                  <div style="font-size: 20px; font-weight: 700; color: #1F2937">
                    {{ selectedMember.name }}
                    <el-tag v-if="selectedMember.isLeader || selectedMember.is_leader_in_dept?.includes(1)" type="warning" size="small" style="margin-left: 6px">负责人</el-tag>
                  </div>
                  <div style="font-size: 13px; color: #909399; margin-top: 4px">{{ selectedMember.position || '-' }}</div>
                </div>
              </div>

              <!-- 关键指标卡片 -->
              <div class="detail-stats-row">
                <div class="detail-stat-card">
                  <div class="detail-stat-value" :style="{ color: isMemberAbnormal(selectedMember) ? '#EF4444' : '#10B981' }">
                    {{ isMemberAbnormal(selectedMember) ? '⚠ 异常' : '✅ 正常' }}
                  </div>
                  <div class="detail-stat-label">账号状态</div>
                </div>
                <div class="detail-stat-card">
                  <div class="detail-stat-value">{{ selectedMember.externalContactCount ?? selectedMember.external_contact_count ?? 0 }}</div>
                  <div class="detail-stat-label">外部联系人</div>
                </div>
                <div class="detail-stat-card">
                  <div class="detail-stat-value">{{ selectedMember.groupChatCount ?? selectedMember.group_chat_count ?? 0 }}</div>
                  <div class="detail-stat-label">客户群</div>
                </div>
                <div class="detail-stat-card">
                  <div class="detail-stat-value">
                    <el-tag :type="selectedMember.status === 1 ? 'success' : 'info'" size="small">
                      {{ selectedMember.status === 1 ? '已激活' : selectedMember.status === 2 ? '已禁用' : '未激活' }}
                    </el-tag>
                  </div>
                  <div class="detail-stat-label">激活状态</div>
                </div>
              </div>

              <el-descriptions :column="2" border size="default" style="margin-top: 16px">
                <el-descriptions-item label="昵称">{{ selectedMember.alias || selectedMember.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="姓名">{{ selectedMember.name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="UserID"><span class="mono">{{ selectedMember.userid }}</span></el-descriptions-item>
                <el-descriptions-item label="别名">{{ selectedMember.alias || '-' }}</el-descriptions-item>
                <el-descriptions-item label="性别">{{ selectedMember.gender === 1 || selectedMember.gender === '1' ? '男' : selectedMember.gender === 2 || selectedMember.gender === '2' ? '女' : '-' }}</el-descriptions-item>
                <el-descriptions-item label="手机号">{{ selectedMember.mobile || selectedMember.telephone || '-' }}</el-descriptions-item>
                <el-descriptions-item label="邮箱">{{ selectedMember.email || selectedMember.biz_mail || '-' }}</el-descriptions-item>
                <el-descriptions-item label="英文名">{{ selectedMember.english_name || '-' }}</el-descriptions-item>
                <el-descriptions-item label="部门" :span="2">{{ getDeptNames(selectedMember.department) }}</el-descriptions-item>
                <el-descriptions-item label="职务">{{ selectedMember.position || '-' }}</el-descriptions-item>
                <el-descriptions-item label="直属上级">{{ selectedMember.direct_leader?.join(', ') || '-' }}</el-descriptions-item>
                <el-descriptions-item label="外部联系人数">
                  <strong style="color: #4C6EF5">{{ selectedMember.externalContactCount ?? selectedMember.external_contact_count ?? 0 }}</strong> 人
                </el-descriptions-item>
                <el-descriptions-item label="客户群数">
                  <strong style="color: #10B981">{{ selectedMember.groupChatCount ?? selectedMember.group_chat_count ?? 0 }}</strong> 个
                </el-descriptions-item>
                <el-descriptions-item label="CRM绑定">
                  <el-tag v-if="selectedMember.crmUser" type="success" size="small">{{ selectedMember.crmUser }}</el-tag>
                  <el-tag v-else type="info" size="small">未绑定</el-tag>
                </el-descriptions-item>
                <el-descriptions-item label="账号状态">
                  <el-tag :type="isMemberAbnormal(selectedMember) ? 'danger' : 'success'" size="small">
                    {{ isMemberAbnormal(selectedMember) ? '异常' : '正常' }}
                  </el-tag>
                </el-descriptions-item>
              </el-descriptions>

              <div style="margin-top: 16px; display: flex; gap: 8px">
                <el-button type="success" size="default" @click="handleBindCrm(selectedMember)">
                  {{ selectedMember.crmUser ? '更换绑定' : '绑定CRM' }}
                </el-button>
                <el-button type="primary" size="default" @click="handleViewCustomers(selectedMember)">
                  查看客户
                </el-button>
              </div>
            </div>
          </template>

          <!-- 部门成员列表模式 -->
          <template v-else>
            <div class="member-list-header">
              <span class="dept-path">{{ selectedDeptName || '全部成员' }}</span>
              <div style="display: flex; align-items: center; gap: 10px">
                <el-input v-model="memberSearch" placeholder="搜索姓名/UserID" clearable size="small" style="width: 200px" />
                <span class="member-total">共 {{ filteredMemberList.length }} 人</span>
              </div>
            </div>
            <el-table :data="filteredMemberList" v-loading="loading" stripe size="default" @row-click="handleTableRowClick" style="cursor: pointer">
              <el-table-column label="成员" min-width="180">
                <template #default="{ row }">
                  <div class="member-info">
                    <el-avatar :src="row.avatar || row.thumb_avatar" :size="36">{{ row.name?.charAt(0) }}</el-avatar>
                    <div class="info-text">
                      <div class="name">
                        {{ row.name }}
                        <el-tag v-if="row.isLeader || row.is_leader_in_dept?.includes(1)" type="warning" size="small" style="margin-left: 4px">负责人</el-tag>
                      </div>
                      <div class="position">{{ row.position || '-' }}</div>
                    </div>
                  </div>
                </template>
              </el-table-column>
              <el-table-column prop="userid" label="UserID" width="120">
                <template #default="{ row }"><span class="mono">{{ row.userid }}</span></template>
              </el-table-column>
              <el-table-column label="外部联系人" width="100" align="center">
                <template #default="{ row }">
                  <strong>{{ row.externalContactCount ?? row.external_contact_count ?? 0 }}</strong>
                </template>
              </el-table-column>
              <el-table-column label="客户群" width="80" align="center">
                <template #default="{ row }">
                  <strong>{{ row.groupChatCount ?? row.group_chat_count ?? 0 }}</strong>
                </template>
              </el-table-column>
              <el-table-column label="状态" width="90">
                <template #default="{ row }">
                  <el-tag :type="isMemberAbnormal(row) ? 'danger' : row.status === 1 ? 'success' : 'info'" size="small">
                    {{ isMemberAbnormal(row) ? '异常' : row.status === 1 ? '已激活' : '未激活' }}
                  </el-tag>
                </template>
              </el-table-column>
            </el-table>
          </template>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'WecomContactBook' })
import { ref, computed, watch, onMounted } from 'vue'
import { Refresh } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { getWecomConfigs, getWecomDepartments, getWecomUsers, syncWecomContacts } from '@/api/wecom'
import WecomHeader from './components/WecomHeader.vue'
import WecomDemoBanner from './components/WecomDemoBanner.vue'
import { useWecomDemo, DEMO_CONFIGS } from './composables/useWecomDemo'

const { isDemoMode, loadWecomConfigs } = useWecomDemo()

const loading = ref(false)
const syncing = ref(false)
const configList = ref<any[]>([])
const selectedConfigId = ref<number | null>(null)
const deptSearch = ref('')
const memberSearch = ref('')
const treeRef = ref<any>(null)

// 部门树 & 成员列表
const departments = ref<any[]>([])
const memberList = ref<any[]>([])
const allMembers = ref<any[]>([]) // 全量成员（用于树结构）
const selectedDeptId = ref<number | null>(null)
const selectedDeptName = ref('')
const selectedMember = ref<any>(null)

const treeProps = { label: 'name', children: 'children' }

const isMemberAbnormal = (m: any) => m.accountStatus === 'abnormal' || m.status === 2

/** 显示的配置列表 */
const displayConfigs = computed(() => {
  if (configList.value.length > 0 || !isDemoMode.value) return configList.value
  return DEMO_CONFIGS
})

/**
 * 将扁平部门列表+成员列表构建成带成员子节点的树
 */
const buildDeptTreeWithMembers = (flatDepts: any[], members: any[]): any[] => {
  if (!flatDepts?.length) return []

  // 如果已经是树结构直接返回
  if (flatDepts[0]?.children !== undefined && flatDepts[0]?._type === 'dept') return flatDepts

  const nodeMap = new Map<number, any>()
  const roots: any[] = []

  // 第一遍：创建部门节点
  for (const dept of flatDepts) {
    const id = dept.id ?? dept.wecomDeptId
    const name = dept.name ?? dept.wecomDeptName
    const parentId = dept.parentid ?? dept.wecomParentId ?? 0
    nodeMap.set(id, {
      id,
      _treeKey: `dept_${id}`,
      _type: 'dept',
      name,
      parentId,
      _memberCount: 0,
      order: dept.order || 0,
      children: []
    })
  }

  // 第二遍：建立部门父子关系
  for (const dept of flatDepts) {
    const id = dept.id ?? dept.wecomDeptId
    const parentId = dept.parentid ?? dept.wecomParentId ?? 0
    const node = nodeMap.get(id)
    if (parentId && nodeMap.has(parentId)) {
      nodeMap.get(parentId).children.push(node)
    } else {
      roots.push(node)
    }
  }

  // 第三遍：将成员挂到所属部门下（作为叶子节点）
  for (const member of members) {
    const deptIds = member.department || []
    const memberNode = {
      ...member,
      _treeKey: `member_${member.userid}`,
      _type: 'member',
      name: member.name,
      _isAbnormal: isMemberAbnormal(member),
      children: undefined // 叶子节点
    }
    for (const deptId of deptIds) {
      if (nodeMap.has(deptId)) {
        nodeMap.get(deptId).children.push(memberNode)
        nodeMap.get(deptId)._memberCount++
      }
    }
    // 如果成员没有部门信息，挂到根
    if (!deptIds.length && roots.length > 0) {
      roots[0].children.push(memberNode)
      roots[0]._memberCount++
    }
  }

  // 排序：部门在前，成员在后
  const sortTree = (nodes: any[]) => {
    nodes.sort((a: any, b: any) => {
      if (a._type !== b._type) return a._type === 'dept' ? -1 : 1
      if (a._type === 'dept') return (a.order || 0) - (b.order || 0)
      return (a.name || '').localeCompare(b.name || '')
    })
    for (const n of nodes) {
      if (n.children?.length) sortTree(n.children)
    }
  }
  sortTree(roots)

  return roots
}

/** 树数据（部门+成员混合树） */
const treeData = computed(() => {
  return buildDeptTreeWithMembers(departments.value, allMembers.value)
})

/** 显示的成员列表（当前选中部门） */
const displayMemberList = computed((): any[] => {
  if (!selectedDeptId.value) return allMembers.value
  return allMembers.value.filter((m: any) => m.department?.includes(selectedDeptId.value))
})

/** 搜索过滤后的成员列表 */
const filteredMemberList = computed(() => {
  if (!memberSearch.value) return displayMemberList.value
  const kw = memberSearch.value.toLowerCase()
  return displayMemberList.value.filter((m: any) =>
    m.name?.toLowerCase().includes(kw) ||
    m.userid?.toLowerCase().includes(kw)
  )
})

// 搜索过滤
watch(deptSearch, (val) => {
  treeRef.value?.filter(val)
})

const filterNode = (value: string, data: any) => {
  if (!value) return true
  return data.name?.toLowerCase().includes(value.toLowerCase())
}

/** 部门名映射 */
const deptNameMap = computed(() => {
  const map: Record<number, string> = {}
  const walk = (nodes: any[]) => {
    for (const node of nodes) {
      if (node._type === 'dept') {
        map[node.id] = node.name
        if (node.children?.length) walk(node.children)
      }
    }
  }
  walk(treeData.value)
  return map
})

const getDeptNames = (deptIds: number[]) => {
  if (!deptIds?.length) return '-'
  return deptIds.map(id => deptNameMap.value[id] || String(id)).join(', ')
}

const handleNodeClick = (data: any) => {
  if (data._type === 'member') {
    // 点击成员 → 右侧显示详情
    selectedMember.value = data
  } else {
    // 点击部门 → 右侧显示部门成员列表
    selectedMember.value = null
    selectedDeptId.value = data.id
    selectedDeptName.value = data.name
  }
}

const handleTableRowClick = (row: any) => {
  selectedMember.value = row
}

const handleConfigChange = () => {
  if (selectedConfigId.value) {
    departments.value = []
    allMembers.value = []
    memberList.value = []
    selectedDeptId.value = null
    selectedDeptName.value = ''
    selectedMember.value = null
    fetchDepartments()
  }
}

const fetchConfigs = async () => {
  try {
    const res = await getWecomConfigs()
    const data = Array.isArray(res) ? res : (res as any)?.data || []
    configList.value = data.filter((c: any) => c.isEnabled)
    if (configList.value.length > 0 && !selectedConfigId.value) {
      selectedConfigId.value = configList.value[0].id
      fetchDepartments()
    }
  } catch (e) {
    console.error('[ContactBook] Fetch configs error:', e)
  }
}

const fetchDepartments = async () => {
  if (!selectedConfigId.value) return
  loading.value = true
  try {
    const res: any = await getWecomDepartments(selectedConfigId.value)
    const rawDepts = Array.isArray(res) ? res : (res?.data || [])
    departments.value = rawDepts
    // 加载全量成员
    if (rawDepts.length > 0) {
      const rootId = rawDepts.find((d: any) => !d.parentid || d.parentid === 0)?.id || 1
      selectedDeptId.value = rootId
      const rootName = rawDepts.find((d: any) => d.id === rootId)?.name || ''
      selectedDeptName.value = rootName
      await fetchAllMembers(rootId)
    }
  } catch (e: any) {
    console.error('[ContactBook] Fetch departments error:', e)
    departments.value = []
    ElMessage.error(e?.message || '获取部门列表失败，请确认通讯录Secret已配置')
  } finally {
    loading.value = false
  }
}

const fetchAllMembers = async (rootDeptId: number) => {
  if (!selectedConfigId.value) return
  try {
    const res: any = await getWecomUsers(selectedConfigId.value, rootDeptId, true)
    const rawUsers = Array.isArray(res) ? res : (res?.data || [])
    allMembers.value = rawUsers
  } catch (e: any) {
    console.error('[ContactBook] Fetch members error:', e)
    allMembers.value = []
  }
}

const handleSync = async () => {
  if (!selectedConfigId.value) {
    ElMessage.warning('请先选择企微配置')
    return
  }
  syncing.value = true
  try {
    const res: any = await syncWecomContacts(selectedConfigId.value)
    ElMessage.success(res?.message || '通讯录同步完成，正在刷新数据...')
    await fetchDepartments()
  } catch (e: any) {
    ElMessage.error(e?.message || '同步失败，请确认企微授权配置正确')
  } finally {
    syncing.value = false
  }
}

onMounted(() => {
  loadWecomConfigs()
  fetchConfigs()
})

const handleBindCrm = (row: any) => {
  ElMessage.info('请前往「企微联动」页面进行绑定操作')
}

const handleViewCustomers = (row: any) => {
  ElMessage.info('跳转客户列表')
}
</script>

<style scoped lang="scss">
.wecom-contact-book { padding: 20px; }

.empty-state { text-align: center; padding: 60px 20px; }
.empty-icon { font-size: 48px; margin-bottom: 16px; }
.empty-title { font-size: 18px; font-weight: 600; color: #1F2937; margin-bottom: 8px; }
.empty-desc { font-size: 14px; color: #9CA3AF; }

.contact-layout {
  display: flex;
  gap: 16px;
  min-height: 600px;
}

.dept-tree-panel {
  width: 300px;
  min-width: 260px;
  border: 1px solid #e4e7ed;
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  background: #fafbfc;
}

.dept-tree-header {
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
}

.dept-tree-body {
  flex: 1;
  overflow-y: auto;
  padding: 8px 4px;
}

.tree-node {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  padding: 2px 0;
}

.tree-node-member {
  padding-left: 4px;
}

.tree-node-abnormal {
  .member-tree-name { color: #EF4444; font-weight: 600; }
}

.dept-icon { font-size: 14px; }
.dept-name { font-weight: 500; }
.dept-count { font-size: 12px; color: #909399; }
.member-tree-name { font-size: 13px; color: #303133; }
.text-danger { color: #EF4444 !important; font-weight: 600; }

.detail-panel {
  flex: 1;
  min-width: 0;
}

.member-detail-card {
  padding: 4px;
}

.detail-avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 20px;
}

.detail-stats-row {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-bottom: 8px;
}

.detail-stat-card {
  background: #F9FAFB;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  padding: 14px 8px;
  text-align: center;
}

.detail-stat-value {
  font-size: 20px;
  font-weight: 700;
  color: #1F2937;
  line-height: 1.3;
}

.detail-stat-label {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.member-list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding: 0 4px;
}

.dept-path {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
}

.member-total {
  font-size: 13px;
  color: #909399;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
}

.info-text .name {
  font-weight: 500;
  font-size: 14px;
}

.info-text .position {
  font-size: 12px;
  color: #909399;
}

.mono {
  font-family: 'SF Mono', 'Menlo', monospace;
  font-size: 13px;
  color: #606266;
}
</style>

