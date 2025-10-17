import type { Router } from 'vue-router'

/**
 * 安全导航函数，避免重复导航错误
 * @param router Vue Router实例
 * @param to 目标路由
 * @param options 导航选项
 */
export function safeNavigate(
  router: Router, 
  to: string | { path: string; query?: Record<string, any>; params?: Record<string, any> },
  options: { replace?: boolean; force?: boolean } = {}
) {
  const currentRoute = router.currentRoute.value
  
  // 如果是字符串路径
  if (typeof to === 'string') {
    // 检查是否为当前路径
    if (to === currentRoute.path && !options.force) {
      return Promise.resolve()
    }
    
    // 执行导航
    const navigationMethod = options.replace ? router.replace : router.push
    return navigationMethod(to).catch(err => {
      const errorMessage = err.message || err.toString() || ''
      // 静默处理所有导航取消和重复导航错误
      if (errorMessage.includes('Avoided redundant navigation') ||
          errorMessage.includes('Navigation cancelled') ||
          errorMessage.includes('NavigationDuplicated') ||
          errorMessage.includes('with a new navigation') ||
          err.name === 'NavigationDuplicated') {
        // 完全静默处理，不输出任何日志
        return Promise.resolve()
      }
      // 真正的导航错误，重新抛出让调用者处理
      console.error('导航失败:', errorMessage)
      throw err
    })
  }
  
  // 如果是对象形式的路由
  const targetPath = to.path
  const currentPath = currentRoute.path
  const currentQuery = currentRoute.query
  const targetQuery = to.query || {}
  
  // 检查路径和查询参数是否相同
  const isSamePath = targetPath === currentPath
  const isSameQuery = JSON.stringify(currentQuery) === JSON.stringify(targetQuery)
  
  if (isSamePath && isSameQuery && !options.force) {
    return Promise.resolve()
  }
  
  // 执行导航
  const navigationMethod = options.replace ? router.replace : router.push
  return navigationMethod(to).catch(err => {
    const errorMessage = err.message || err.toString() || ''
    // 静默处理所有导航取消和重复导航错误
    if (errorMessage.includes('Avoided redundant navigation') ||
        errorMessage.includes('Navigation cancelled') ||
        errorMessage.includes('NavigationDuplicated') ||
        errorMessage.includes('with a new navigation') ||
        err.name === 'NavigationDuplicated') {
      // 完全静默处理，不输出任何日志
      return Promise.resolve()
    }
    // 真正的导航错误，重新抛出让调用者处理
    console.error('导航失败:', errorMessage)
    throw err
  })
}

/**
 * 创建安全导航函数的便捷方法
 * @param router Vue Router实例
 */
export function createSafeNavigator(router: Router) {
  return {
    push: (to: string | object, options?: { force?: boolean }) => 
      safeNavigate(router, to as any, { ...options, replace: false }),
    replace: (to: string | object, options?: { force?: boolean }) => 
      safeNavigate(router, to as any, { ...options, replace: true })
  }
}