/**
 * 🔥 公告可见性管理（消息铃铛与消息中心弹窗共享）
 * - 管理"不再显示"的公告ID（localStorage 按用户+租户隔离）
 * - 提供过滤后的可见公告列表与未读公告数
 * 使用模块级共享状态，保证铃铛红点与消息中心弹窗数据实时同步
 */
import { ref, computed } from 'vue'
import { useMessageStore } from '@/stores/message'
import { useUserStore } from '@/stores/user'

// 模块级共享状态（单例）
const hiddenAnnouncementIds = ref<string[]>([])
let loadedKey = ''

export function useAnnouncementVisibility() {
  const messageStore = useMessageStore()
  const userStore = useUserStore()

  /**
   * 获取当前用户的隐藏公告 localStorage Key（按用户+租户隔离）
   * 格式: hidden-announcements-{userId}-{tenantId}
   */
  const getStorageKey = (): string => {
    const currentUser = userStore.currentUser
    if (currentUser?.id) {
      const tenantId = (currentUser as any).tenantId || ''
      return `hidden-announcements-${currentUser.id}-${tenantId}`
    }
    return 'hidden-announcements'
  }

  // 加载隐藏的公告ID（切换用户后 key 变化会重新加载）
  const loadHiddenAnnouncements = () => {
    const key = getStorageKey()
    if (key === loadedKey && hiddenAnnouncementIds.value.length > 0) return
    try {
      const stored = localStorage.getItem(key)
      hiddenAnnouncementIds.value = stored ? JSON.parse(stored) : []
    } catch (_e) {
      hiddenAnnouncementIds.value = []
    }
    loadedKey = key
  }

  const saveHiddenAnnouncements = () => {
    localStorage.setItem(getStorageKey(), JSON.stringify(hiddenAnnouncementIds.value))
  }

  // 隐藏单条公告
  const hideAnnouncement = (announcementId: string) => {
    if (!hiddenAnnouncementIds.value.includes(announcementId)) {
      hiddenAnnouncementIds.value.push(announcementId)
      saveHiddenAnnouncements()
    }
  }

  // 批量隐藏公告（清空消息时使用）
  const hideAnnouncements = (announcementIds: string[]) => {
    hiddenAnnouncementIds.value = [...new Set([...hiddenAnnouncementIds.value, ...announcementIds])]
    saveHiddenAnnouncements()
  }

  // 可见公告列表（已发布 且 未被隐藏）
  const visibleAnnouncements = computed(() => {
    const list = messageStore.announcements
    if (!list || !Array.isArray(list)) return []
    return list.filter((a: any) =>
      a.status === 'published' && !hiddenAnnouncementIds.value.includes(a.id)
    )
  })

  // 未读公告数（排除静默公告）
  const unreadAnnouncementCount = computed(() =>
    visibleAnnouncements.value.filter((a: any) => !a.read && !a.silent).length
  )

  return {
    hiddenAnnouncementIds,
    loadHiddenAnnouncements,
    hideAnnouncement,
    hideAnnouncements,
    visibleAnnouncements,
    unreadAnnouncementCount
  }
}
