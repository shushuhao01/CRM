/**
 * 响应式设计工具
 * 提供移动端适配和响应式布局功能
 */

import { ref, onMounted, onUnmounted } from 'vue'

// 断点定义
export const BREAKPOINTS = {
  xs: 480,    // 超小屏幕
  sm: 768,    // 小屏幕
  md: 992,    // 中等屏幕
  lg: 1200,   // 大屏幕
  xl: 1920    // 超大屏幕
} as const

// 设备类型
export type DeviceType = 'mobile' | 'tablet' | 'desktop'

// 屏幕尺寸类型
export type ScreenSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

/**
 * 获取当前设备类型
 */
export const getDeviceType = (width: number): DeviceType => {
  if (width < BREAKPOINTS.sm) {
    return 'mobile'
  } else if (width < BREAKPOINTS.lg) {
    return 'tablet'
  } else {
    return 'desktop'
  }
}

/**
 * 获取当前屏幕尺寸
 */
export const getScreenSize = (width: number): ScreenSize => {
  if (width < BREAKPOINTS.xs) {
    return 'xs'
  } else if (width < BREAKPOINTS.sm) {
    return 'sm'
  } else if (width < BREAKPOINTS.md) {
    return 'md'
  } else if (width < BREAKPOINTS.lg) {
    return 'lg'
  } else {
    return 'xl'
  }
}

/**
 * 响应式Hook
 */
export const useResponsive = () => {
  const windowWidth = ref(window.innerWidth)
  const windowHeight = ref(window.innerHeight)
  
  const deviceType = ref<DeviceType>(getDeviceType(windowWidth.value))
  const screenSize = ref<ScreenSize>(getScreenSize(windowWidth.value))
  
  const isMobile = ref(deviceType.value === 'mobile')
  const isTablet = ref(deviceType.value === 'tablet')
  const isDesktop = ref(deviceType.value === 'desktop')
  
  const updateSize = () => {
    windowWidth.value = window.innerWidth
    windowHeight.value = window.innerHeight
    
    deviceType.value = getDeviceType(windowWidth.value)
    screenSize.value = getScreenSize(windowWidth.value)
    
    isMobile.value = deviceType.value === 'mobile'
    isTablet.value = deviceType.value === 'tablet'
    isDesktop.value = deviceType.value === 'desktop'
  }
  
  onMounted(() => {
    window.addEventListener('resize', updateSize)
    updateSize()
  })
  
  onUnmounted(() => {
    window.removeEventListener('resize', updateSize)
  })
  
  return {
    windowWidth,
    windowHeight,
    deviceType,
    screenSize,
    isMobile,
    isTablet,
    isDesktop,
    
    // 便捷方法
    isXs: () => screenSize.value === 'xs',
    isSm: () => screenSize.value === 'sm',
    isMd: () => screenSize.value === 'md',
    isLg: () => screenSize.value === 'lg',
    isXl: () => screenSize.value === 'xl',
    
    // 断点检查
    gtXs: () => windowWidth.value > BREAKPOINTS.xs,
    gtSm: () => windowWidth.value > BREAKPOINTS.sm,
    gtMd: () => windowWidth.value > BREAKPOINTS.md,
    gtLg: () => windowWidth.value > BREAKPOINTS.lg,
    
    ltSm: () => windowWidth.value < BREAKPOINTS.sm,
    ltMd: () => windowWidth.value < BREAKPOINTS.md,
    ltLg: () => windowWidth.value < BREAKPOINTS.lg,
    ltXl: () => windowWidth.value < BREAKPOINTS.xl
  }
}

/**
 * 移动端触摸事件处理
 */
export const useTouchEvents = () => {
  const touchStart = ref({ x: 0, y: 0 })
  const touchEnd = ref({ x: 0, y: 0 })
  
  const handleTouchStart = (event: TouchEvent) => {
    const touch = event.touches[0]
    touchStart.value = { x: touch.clientX, y: touch.clientY }
  }
  
  const handleTouchEnd = (event: TouchEvent) => {
    const touch = event.changedTouches[0]
    touchEnd.value = { x: touch.clientX, y: touch.clientY }
  }
  
  const getSwipeDirection = () => {
    const deltaX = touchEnd.value.x - touchStart.value.x
    const deltaY = touchEnd.value.y - touchStart.value.y
    
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      return deltaX > 0 ? 'right' : 'left'
    } else {
      return deltaY > 0 ? 'down' : 'up'
    }
  }
  
  const getSwipeDistance = () => {
    const deltaX = touchEnd.value.x - touchStart.value.x
    const deltaY = touchEnd.value.y - touchStart.value.y
    return Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  }
  
  return {
    touchStart,
    touchEnd,
    handleTouchStart,
    handleTouchEnd,
    getSwipeDirection,
    getSwipeDistance
  }
}

/**
 * 移动端适配的表格配置
 */
export const getMobileTableConfig = (isMobile: boolean) => {
  if (isMobile) {
    return {
      size: 'small',
      showHeader: false,
      border: false,
      stripe: true,
      maxHeight: '60vh'
    }
  }
  
  return {
    size: 'default',
    showHeader: true,
    border: true,
    stripe: false
  }
}

/**
 * 移动端适配的分页配置
 */
export const getMobilePaginationConfig = (isMobile: boolean) => {
  if (isMobile) {
    return {
      layout: 'prev, pager, next',
      pageSize: 10,
      pagerCount: 5,
      small: true
    }
  }
  
  return {
    layout: 'total, sizes, prev, pager, next, jumper',
    pageSize: 20,
    pagerCount: 7,
    small: false,
    pageSizes: [10, 20, 50, 100]
  }
}

/**
 * 移动端适配的表单配置
 */
export const getMobileFormConfig = (isMobile: boolean) => {
  if (isMobile) {
    return {
      labelPosition: 'top',
      size: 'default',
      labelWidth: 'auto'
    }
  }
  
  return {
    labelPosition: 'right',
    size: 'default',
    labelWidth: '120px'
  }
}

/**
 * 移动端适配的对话框配置
 */
export const getMobileDialogConfig = (isMobile: boolean) => {
  if (isMobile) {
    return {
      width: '95%',
      fullscreen: false,
      top: '5vh',
      destroyOnClose: true
    }
  }
  
  return {
    width: '600px',
    fullscreen: false,
    top: '15vh',
    destroyOnClose: false
  }
}

/**
 * 移动端适配的抽屉配置
 */
export const getMobileDrawerConfig = (isMobile: boolean) => {
  if (isMobile) {
    return {
      size: '100%',
      direction: 'btt' as const, // bottom to top
      withHeader: false
    }
  }
  
  return {
    size: '50%',
    direction: 'rtl' as const, // right to left
    withHeader: true
  }
}

/**
 * 获取响应式列配置
 */
export const getResponsiveColumns = (columns: unknown[], screenSize: ScreenSize) => {
  const visibleColumns = columns.filter(col => {
    if (!col.responsive) return true
    
    const { hideOn } = col.responsive
    if (hideOn && hideOn.includes(screenSize)) {
      return false
    }
    
    return true
  })
  
  return visibleColumns
}

/**
 * 移动端优化的CSS类名
 */
export const getMobileClasses = (isMobile: boolean) => {
  return {
    container: isMobile ? 'mobile-container' : 'desktop-container',
    card: isMobile ? 'mobile-card' : 'desktop-card',
    form: isMobile ? 'mobile-form' : 'desktop-form',
    table: isMobile ? 'mobile-table' : 'desktop-table',
    button: isMobile ? 'mobile-button' : 'desktop-button'
  }
}

/**
 * 防抖函数（用于resize事件）
 */
export const debounce = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null
  
  return (...args: Parameters<T>) => {
    if (timeout) {
      clearTimeout(timeout)
    }
    
    timeout = setTimeout(() => {
      func(...args)
    }, wait)
  }
}

/**
 * 节流函数（用于scroll事件）
 */
export const throttle = <T extends (...args: unknown[]) => unknown>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let lastTime = 0
  
  return (...args: Parameters<T>) => {
    const now = Date.now()
    
    if (now - lastTime >= wait) {
      lastTime = now
      func(...args)
    }
  }
}