import { nextTick } from 'vue'

/**
 * 侧栏菜单滚动管理组合式函数
 * 从 App.vue 拆分，包含智能滚动定位、鼠标滚轮事件处理等逻辑
 */
export function useMenuScroll() {

  // 智能菜单滚动定位 - 通用函数
  const handleSmartMenuScroll = (menuIndex: string) => {
    console.log('开始智能滚动定位:', menuIndex)

    // 使用nextTick确保DOM已更新
    nextTick(() => {
      const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
      const targetSubMenu = document.querySelector(`.sidebar-menu .el-sub-menu[index="${menuIndex}"]`) as HTMLElement

      if (!sidebarMenu || !targetSubMenu) {
        console.log('未找到菜单元素:', { sidebarMenu: !!sidebarMenu, targetSubMenu: !!targetSubMenu })
        return
      }

      // 多次检查，确保子菜单完全展开
      const checkAndScroll = (attempt = 0) => {
        const maxAttempts = 5
        const delay = attempt === 0 ? 100 : 200

        setTimeout(() => {
          const menuHeight = sidebarMenu.clientHeight
          const menuScrollTop = sidebarMenu.scrollTop
          const targetMenuTop = targetSubMenu.offsetTop
          const targetMenuHeight = targetSubMenu.offsetHeight
          const maxScrollTop = sidebarMenu.scrollHeight - menuHeight

          console.log('滚动计算参数:', {
            attempt,
            menuHeight,
            menuScrollTop,
            targetMenuTop,
            targetMenuHeight,
            maxScrollTop,
            scrollHeight: sidebarMenu.scrollHeight
          })

          // 如果子菜单高度还很小，可能还在动画中，继续等待
          if (targetMenuHeight < 50 && attempt < maxAttempts) {
            console.log('子菜单可能还在展开中，继续等待...')
            checkAndScroll(attempt + 1)
            return
          }

          // 计算子菜单在视口中的位置
          const menuTopInViewport = targetMenuTop - menuScrollTop
          const menuBottomInViewport = menuTopInViewport + targetMenuHeight

          console.log('视口位置:', {
            menuTopInViewport,
            menuBottomInViewport,
            viewportHeight: menuHeight
          })

          // 预留空间
          const topPadding = 10
          const bottomPadding = 20

          let targetScrollTop = menuScrollTop
          let needScroll = false

          // 如果子菜单顶部超出视口上边界
          if (menuTopInViewport < topPadding) {
            targetScrollTop = targetMenuTop - topPadding
            needScroll = true
            console.log('需要向上滚动')
          }
          // 如果子菜单底部超出视口下边界
          else if (menuBottomInViewport > menuHeight - bottomPadding) {
            // 优先显示子菜单底部，确保所有子项都可见
            targetScrollTop = targetMenuTop + targetMenuHeight - menuHeight + bottomPadding
            needScroll = true
            console.log('需要向下滚动')
          }

          // 确保滚动位置在有效范围内
          targetScrollTop = Math.max(0, Math.min(targetScrollTop, maxScrollTop))

          console.log('滚动决策:', {
            needScroll,
            currentScrollTop: menuScrollTop,
            targetScrollTop,
            scrollDiff: Math.abs(targetScrollTop - menuScrollTop)
          })

          // 执行滚动
          if (needScroll && Math.abs(targetScrollTop - menuScrollTop) > 2) {
            console.log('执行滚动到:', targetScrollTop)
            sidebarMenu.scrollTo({
              top: targetScrollTop,
              behavior: 'smooth'
            })
          } else {
            console.log('无需滚动或滚动距离太小')
          }
        }, delay)
      }

      // 开始检查和滚动
      checkAndScroll()
    })
  }

  // 兼容旧的系统菜单滚动函数
  const handleSystemMenuScroll = () => {
    handleSmartMenuScroll('system')
  }

  // 处理侧边栏鼠标滚轮事件
  const handleSidebarWheel = (event: WheelEvent) => {
    event.preventDefault()
    event.stopPropagation()

    const sidebarMenu = event.currentTarget as HTMLElement
    const scrollAmount = 80 // 增加滚动距离，提供更好的滚动体验
    const currentScrollTop = sidebarMenu.scrollTop
    const maxScrollTop = sidebarMenu.scrollHeight - sidebarMenu.clientHeight

    console.log('鼠标滚轮事件:', {
      deltaY: event.deltaY,
      currentScrollTop,
      maxScrollTop,
      scrollHeight: sidebarMenu.scrollHeight,
      clientHeight: sidebarMenu.clientHeight
    })

    // 根据滚轮方向计算新的滚动位置
    const newScrollTop = event.deltaY > 0
      ? currentScrollTop + scrollAmount  // 向下滚动
      : currentScrollTop - scrollAmount  // 向上滚动

    // 确保滚动位置在有效范围内
    const targetScrollTop = Math.max(0, Math.min(newScrollTop, maxScrollTop))

    console.log('滚动到:', targetScrollTop)

    // 平滑滚动到目标位置
    sidebarMenu.scrollTo({
      top: targetScrollTop,
      behavior: 'smooth'
    })
  }

  // 初始化侧边栏鼠标滚轮事件
  const initSidebarWheelScroll = () => {
    nextTick(() => {
      const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
      if (sidebarMenu) {
        console.log('初始化侧边栏滚轮事件')
        sidebarMenu.addEventListener('wheel', handleSidebarWheel, { passive: false })
      } else {
        console.log('未找到侧边栏菜单元素')
      }
    })
  }

  // 清理侧边栏滚轮事件监听器
  const cleanupSidebarWheelScroll = () => {
    const sidebarMenu = document.querySelector('.sidebar-menu') as HTMLElement
    if (sidebarMenu) {
      sidebarMenu.removeEventListener('wheel', handleSidebarWheel)
    }
  }

  return {
    handleSmartMenuScroll,
    handleSystemMenuScroll,
    handleSidebarWheel,
    initSidebarWheelScroll,
    cleanupSidebarWheelScroll,
  }
}
