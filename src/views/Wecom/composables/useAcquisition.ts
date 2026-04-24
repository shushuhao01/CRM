/**
 * 获客助手模块共享状态与逻辑 - V4.0
 * 提取公共状态管理，避免 Acquisition.vue 巨型文件
 */
import { ref, computed } from 'vue'
import { ElMessage } from 'element-plus'
import {
  getWecomConfigs, getAcquisitionLinks, createAcquisitionLink,
  deleteAcquisitionLink, updateAcquisitionLink, getWecomUsers,
  syncAcquisitionLinkStats, getAcquisitionLinkWeight,
  updateAcquisitionLinkWeight, getAcquisitionUsage,
  getAcquisitionTags, createAcquisitionTagGroup,
  editAcquisitionTag, deleteAcquisitionTags
} from '@/api/wecom'
import { useWecomDemo, DEMO_ACQUISITION_LINKS, DEMO_ACQUISITION_USAGE, DEMO_WEIGHT_MEMBERS, DEMO_CONFIGS, DEMO_WECOM_USERS } from './useWecomDemo'
import type { AcquisitionWeightItem, AcquisitionUsage } from '../types'

// 7日示例趋势数据（sparkline用）
const generateSparklineData = () => {
  return Array.from({ length: 7 }, () => Math.floor(Math.random() * 20 + 5))
}

/** 示例链接数据增强（含7日趋势/今日统计/转化率） */
export const DEMO_LINKS_ENHANCED = DEMO_ACQUISITION_LINKS.map((link: any) => ({
  ...link,
  todayAdd: Math.floor(Math.random() * 15 + 2),
  todayLoss: Math.floor(Math.random() * 5),
  sparkline: generateSparklineData(),
  conversionRate: link.clickCount > 0
    ? Number(((link.addCount / link.clickCount) * 100).toFixed(1))
    : 0
}))

/** 示例标签组 */
export const DEMO_TAG_GROUPS = [
  {
    id: -1, groupName: '客户意向分类',
    tags: [
      { id: -1, name: 'VIP客户', type: 'danger' },
      { id: -2, name: '意向客户', type: 'warning' },
      { id: -3, name: '潜在客户', type: '' }
    ],
    usageCount: 156,
    createdAt: '2026-03-01', _demo: true
  },
  {
    id: -2, groupName: '行业标签',
    tags: [
      { id: -4, name: '制造业', type: '' },
      { id: -5, name: '电商行业', type: 'success' },
      { id: -6, name: '建筑行业', type: '' },
      { id: -7, name: '金融行业', type: 'warning' }
    ],
    usageCount: 89,
    createdAt: '2026-03-05', _demo: true
  },
  {
    id: -3, groupName: '跟进状态',
    tags: [
      { id: -8, name: '已成交', type: 'success' },
      { id: -9, name: '跟进中', type: 'warning' },
      { id: -10, name: '已流失', type: 'info' }
    ],
    usageCount: 234,
    createdAt: '2026-03-10', _demo: true
  },
]

export function useAcquisition() {
  const { isDemoMode } = useWecomDemo()

  // ==================== 基础状态 ====================
  const loading = ref(false)
  const submitting = ref(false)
  const syncingStats = ref(false)
  const savingWeight = ref(false)
  const configList = ref<any[]>([])
  const linkList = ref<any[]>([])
  const wecomUsers = ref<any[]>([])
  const selectedConfigId = ref<number | null>(null)
  const activeTab = ref('links')
  const usage = ref<AcquisitionUsage | null>(null)

  // ==================== 计算属性 ====================
  const displayConfigs = computed(() => {
    if (configList.value.length > 0 || !isDemoMode.value) return configList.value
    return DEMO_CONFIGS
  })

  const displayLinks = computed(() => {
    if (linkList.value.length > 0 || !isDemoMode.value) return linkList.value
    return DEMO_LINKS_ENHANCED
  })

  const displayUsage = computed(() => {
    if (usage.value || !isDemoMode.value) return usage.value
    return DEMO_ACQUISITION_USAGE
  })

  const displayWecomUserOptions = computed(() => {
    if (wecomUsers.value.length > 0 || !isDemoMode.value) return wecomUsers.value
    return DEMO_WECOM_USERS
  })

  const usageColor = computed(() => {
    const u = displayUsage.value
    if (!u) return '#409EFF'
    if (u.usagePercent >= 90) return '#F56C6C'
    if (u.usagePercent >= 70) return '#E6A23C'
    return '#67C23A'
  })

  // ==================== 成员名称 ====================
  const getMemberName = (userId: string): string => {
    const real = wecomUsers.value.find((u: any) => u.userid === userId)
    if (real) return real.name
    const demo = DEMO_WECOM_USERS.find(u => u.userid === userId)
    return demo?.name || userId
  }

  const parseUserNames = (userIds: string) => {
    try {
      const ids: string[] = JSON.parse(userIds || '[]')
      const names = ids.map(id => getMemberName(id))
      return names.length > 3 ? `${names.slice(0, 3).join('、')}等${names.length}人` : names.join('、')
    } catch {
      return '-'
    }
  }

  // ==================== 数据加载 ====================
  const fetchConfigs = async () => {
    try {
      const res = await getWecomConfigs()
      const configs = Array.isArray(res) ? res : []
      configList.value = configs.filter((c: any) => c.isEnabled)
      if (configList.value.length > 0 && !selectedConfigId.value) {
        selectedConfigId.value = configList.value[0].id
        handleConfigChange()
      }
    } catch (e) {
      console.error('[Acquisition] Fetch configs error:', e)
    }
  }

  const handleConfigChange = () => {
    fetchList()
    fetchUsage()
  }

  const fetchList = async () => {
    if (!selectedConfigId.value) return
    loading.value = true
    try {
      const res = await getAcquisitionLinks(selectedConfigId.value)
      linkList.value = Array.isArray(res) ? res : []
    } catch (e) {
      console.error('[Acquisition] Fetch list error:', e)
    } finally {
      loading.value = false
    }
  }

  const fetchUsage = async () => {
    if (!selectedConfigId.value) return
    try {
      const res: any = await getAcquisitionUsage(selectedConfigId.value)
      usage.value = res || null
    } catch (e) {
      console.error('[Acquisition] Fetch usage error:', e)
    }
  }

  const fetchWecomUsers = async () => {
    if (!selectedConfigId.value) return
    try {
      const res = await getWecomUsers(selectedConfigId.value, 1, true)
      wecomUsers.value = Array.isArray(res) ? res : []
    } catch (e: any) {
      console.error('[Acquisition] Fetch users error:', e)
      ElMessage.error(e.message || '获取成员失败')
    }
  }

  const handleSyncStats = async () => {
    if (isDemoMode.value) {
      ElMessage.info('示例模式：授权企微后可同步真实统计')
      return
    }
    if (!selectedConfigId.value) return
    syncingStats.value = true
    try {
      const res: any = await syncAcquisitionLinkStats(selectedConfigId.value)
      ElMessage.success(res?.message || '统计同步完成')
      fetchList()
      fetchUsage()
    } catch (e: any) {
      ElMessage.error(e.message || '同步统计失败')
    } finally {
      syncingStats.value = false
    }
  }

  // ==================== CRUD ====================
  const handleCreateLink = async (data: any) => {
    if (isDemoMode.value) {
      ElMessage.success('创建成功（示例模式）')
      return true
    }
    submitting.value = true
    try {
      await createAcquisitionLink({
        wecomConfigId: selectedConfigId.value!,
        ...data
      })
      ElMessage.success('创建成功')
      fetchList()
      fetchUsage()
      return true
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || '创建失败')
      return false
    } finally {
      submitting.value = false
    }
  }

  const handleUpdateLink = async (id: number, data: any) => {
    if (isDemoMode.value) {
      ElMessage.success('编辑成功（示例模式）')
      return true
    }
    submitting.value = true
    try {
      await updateAcquisitionLink(id, data)
      ElMessage.success('更新成功')
      fetchList()
      return true
    } catch (e: any) {
      ElMessage.error(e.response?.data?.message || '更新失败')
      return false
    } finally {
      submitting.value = false
    }
  }

  const handleDeleteLink = async (row: any) => {
    if (isDemoMode.value) {
      ElMessage.info('示例模式：授权企微后可执行真实操作')
      return
    }
    try {
      await deleteAcquisitionLink(row.id)
      ElMessage.success('删除成功')
      fetchList()
      fetchUsage()
    } catch (e: any) {
      ElMessage.error(e.message || '删除失败')
    }
  }

  const handleToggleLink = async (row: any) => {
    if (isDemoMode.value) {
      row.isEnabled = !row.isEnabled
      ElMessage.success(row.isEnabled ? '已启用（示例模式）' : '已禁用（示例模式）')
      return
    }
    try {
      await updateAcquisitionLink(row.id, { isEnabled: !row.isEnabled })
      ElMessage.success(row.isEnabled ? '已禁用' : '已启用')
      fetchList()
    } catch (e: any) {
      ElMessage.error(e.message || '操作失败')
    }
  }

  // ==================== 权重 ====================
  const weightMembers = ref<AcquisitionWeightItem[]>([])

  const fetchWeightConfig = async (linkId: number) => {
    if (isDemoMode.value) {
      const link = displayLinks.value.find((l: any) => l.id === linkId)
      if (link) {
        try {
          const ids = JSON.parse(link.userIds || '[]')
          return ids.map((id: string) => {
            const existing = DEMO_WEIGHT_MEMBERS.find(m => m.userId === id)
            return { userId: id, userName: getMemberName(id), weight: existing?.weight || 5 }
          })
        } catch { return [] }
      }
      return []
    }
    try {
      const res: any = await getAcquisitionLinkWeight(linkId)
      return res?.members || []
    } catch (e) {
      console.error('[Acquisition] Fetch weight error:', e)
      return []
    }
  }

  const saveWeight = async (linkId: number, members: AcquisitionWeightItem[]) => {
    if (isDemoMode.value) {
      ElMessage.success('权重配置已保存（示例模式）')
      return true
    }
    savingWeight.value = true
    try {
      await updateAcquisitionLinkWeight(linkId, members)
      ElMessage.success('权重配置已保存')
      return true
    } catch (e: any) {
      ElMessage.error(e.message || '保存失败')
      return false
    } finally {
      savingWeight.value = false
    }
  }

  // ==================== 标签 ====================
  const tagGroups = ref<any[]>([])
  const tagLoading = ref(false)

  const displayTagGroups = computed(() => {
    if (tagGroups.value.length > 0 || !isDemoMode.value) return tagGroups.value
    return DEMO_TAG_GROUPS
  })

  const fetchTagGroups = async () => {
    if (isDemoMode.value || !selectedConfigId.value) return
    tagLoading.value = true
    try {
      const res: any = await getAcquisitionTags(selectedConfigId.value)
      tagGroups.value = Array.isArray(res) ? res : (res?.data || [])
    } catch (e: any) {
      console.error('[Acquisition] Fetch tags error:', e)
    } finally {
      tagLoading.value = false
    }
  }

  const createTagGroup = async (data: { groupName: string; tags: Array<{ name: string }> }) => {
    if (!selectedConfigId.value) return false
    try {
      await createAcquisitionTagGroup({ configId: selectedConfigId.value, ...data })
      ElMessage.success('标签组创建成功')
      fetchTagGroups()
      return true
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || '创建失败')
      return false
    }
  }

  const editTagGroup = async (id: string, groupName: string) => {
    if (!selectedConfigId.value) return false
    try {
      await editAcquisitionTag(id, { configId: selectedConfigId.value, name: groupName })
      ElMessage.success('标签组已更新')
      fetchTagGroups()
      return true
    } catch (e: any) {
      ElMessage.error(e?.response?.data?.message || '编辑失败')
      return false
    }
  }

  const deleteTagGroupById = async (groupId: string) => {
    if (!selectedConfigId.value) return false
    try {
      await deleteAcquisitionTags({ configId: selectedConfigId.value, groupIds: [groupId] })
      ElMessage.success('删除成功')
      fetchTagGroups()
      return true
    } catch (e: any) {
      ElMessage.error(e?.message || '删除失败')
      return false
    }
  }

  return {
    // 状态
    isDemoMode, loading, submitting, syncingStats, savingWeight,
    configList, linkList, wecomUsers, selectedConfigId, activeTab, usage,
    tagGroups, tagLoading,
    // 计算属性
    displayConfigs, displayLinks, displayUsage, displayWecomUserOptions,
    displayTagGroups, usageColor,
    // 方法
    getMemberName, parseUserNames,
    fetchConfigs, handleConfigChange, fetchList, fetchUsage,
    fetchWecomUsers, handleSyncStats,
    handleCreateLink, handleUpdateLink, handleDeleteLink, handleToggleLink,
    fetchWeightConfig, saveWeight, weightMembers,
    fetchTagGroups, createTagGroup, editTagGroup, deleteTagGroupById
  }
}

