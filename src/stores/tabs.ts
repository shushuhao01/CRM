import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useRouter } from 'vue-router'
import { createSafeNavigator } from '@/utils/navigation'

export interface Tab {
  name: string
  title: string
  component: string
  closable?: boolean
}

export const useTabsStore = defineStore('tabs', () => {
  const tabs = ref<Tab[]>([
    {
      name: '/dashboard',
      title: '数据看板',
      component: 'Dashboard',
      closable: false
    }
  ])

  const activeTab = ref('/dashboard')
  const cachedViews = ref<string[]>(['Dashboard'])

  // 计算属性
  const currentTab = computed(() => {
    return tabs.value.find(tab => tab.name === activeTab.value)
  })

  // 方法
  const addTab = (tab: Tab) => {
    const existingTab = tabs.value.find(t => t.name === tab.name)
    if (!existingTab) {
      tabs.value.push({
        ...tab,
        closable: tab.name !== '/dashboard'
      })
      
      // 添加到缓存视图
      if (tab.component && !cachedViews.value.includes(tab.component)) {
        cachedViews.value.push(tab.component)
      }
    }
    activeTab.value = tab.name
  }

  const removeTab = (targetName: string) => {
    const targetIndex = tabs.value.findIndex(tab => tab.name === targetName)
    if (targetIndex === -1) return

    const targetTab = tabs.value[targetIndex]
    tabs.value.splice(targetIndex, 1)

    // 从缓存视图中移除
    if (targetTab.component) {
      const cacheIndex = cachedViews.value.indexOf(targetTab.component)
      if (cacheIndex > -1) {
        cachedViews.value.splice(cacheIndex, 1)
      }
    }

    // 如果关闭的是当前激活的标签页，需要切换到其他标签页
    if (activeTab.value === targetName) {
      if (tabs.value.length > 0) {
        // 优先选择右侧的标签页，如果没有则选择左侧的
        const nextTab = tabs.value[targetIndex] || tabs.value[targetIndex - 1]
        activeTab.value = nextTab.name
        // 路由跳转将在组件中处理
      }
    }
  }

  const removeOtherTabs = (keepName: string) => {
    const keepTab = tabs.value.find(tab => tab.name === keepName)
    const dashboardTab = tabs.value.find(tab => tab.name === '/dashboard')
    
    // 清空缓存视图，只保留需要保留的
    cachedViews.value = []
    if (dashboardTab?.component) {
      cachedViews.value.push(dashboardTab.component)
    }
    if (keepTab?.component && keepTab.component !== dashboardTab?.component) {
      cachedViews.value.push(keepTab.component)
    }

    // 只保留首页和指定的标签页
    tabs.value = tabs.value.filter(tab => 
      tab.name === '/dashboard' || tab.name === keepName
    )
    
    activeTab.value = keepName
  }

  const removeAllTabs = () => {
    tabs.value = tabs.value.filter(tab => tab.name === '/dashboard')
    cachedViews.value = ['Dashboard']
    activeTab.value = '/dashboard'
    // 路由跳转将在组件中处理
  }

  const setActiveTab = (name: string) => {
    activeTab.value = name
  }

  const refreshTab = (name: string) => {
    const tab = tabs.value.find(t => t.name === name)
    if (tab?.component) {
      // 从缓存中移除，强制重新渲染
      const index = cachedViews.value.indexOf(tab.component)
      if (index > -1) {
        cachedViews.value.splice(index, 1)
        // 下一个tick重新添加到缓存
        setTimeout(() => {
          cachedViews.value.push(tab.component)
        }, 0)
      }
    }
  }

  const closeOtherTabs = (keepName: string) => {
    removeOtherTabs(keepName)
  }

  const closeAllTabs = () => {
    removeAllTabs()
  }

  const clearTabs = () => {
    tabs.value = [{
      name: '/dashboard',
      title: '数据看板',
      component: 'Dashboard',
      closable: false
    }]
    cachedViews.value = ['Dashboard']
    activeTab.value = '/dashboard'
  }

  return {
    tabs,
    activeTab,
    cachedViews,
    currentTab,
    addTab,
    removeTab,
    removeOtherTabs,
    removeAllTabs,
    closeOtherTabs,
    closeAllTabs,
    clearTabs,
    setActiveTab,
    refreshTab
  }
})