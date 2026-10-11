import { ViteSSG } from 'vite-ssg'
import { createPinia } from 'pinia'
import type { RouteLocationNormalized } from 'vue-router'
import App from './App.vue'
import { routes, setupRouterGuards } from './router'
import { getArticle, getCase, getNotice, sendHeartbeat } from './api/site'
import { loadDocContent } from './data/docs'
import './styles/main.scss'

/**
 * 详情页数据加载：结果写入 to.meta.state
 *
 * 时序说明（已核对 vite-ssg 源码）：vite-ssg 会在 `router.isReady()` 之后、`renderToString`
 * 之前读取 `router.currentRoute.value.meta.state` 作为初始状态序列化进 window.__INITIAL_STATE__。
 * 因此数据必须在导航守卫（beforeResolve，晚于 vite-ssg 内建 beforeEach）里写入，
 * 这样 SSR 产出的 HTML 与序列化状态都带真实数据，客户端首屏即可无缝 hydrate（无闪烁/错位）。
 *
 * 已存在数据（如客户端首屏来自序列化状态）时跳过，避免重复请求。
 */
async function resolveRouteState(to: RouteLocationNormalized): Promise<void> {
  const state = (to.meta.state || {}) as Record<string, any>
  switch (to.name) {
    case 'BlogDetail': {
      if ('article' in state) return
      const slug = String(to.params.slug || '')
      to.meta.state = { ...state, article: slug ? await getArticle(slug) : null }
      break
    }
    case 'CaseDetail': {
      if ('caseItem' in state) return
      const slug = String(to.params.slug || '')
      to.meta.state = { ...state, caseItem: slug ? await getCase(slug) : null }
      break
    }
    case 'NoticeDetail': {
      if ('notice' in state) return
      const slug = String(to.params.slug || '')
      to.meta.state = { ...state, notice: slug ? await getNotice(slug) : null }
      break
    }
    case 'DocDetail': {
      if ('docContent' in state) return
      const category = String(to.params.category || 'start')
      const doc = String(to.params.doc || 'intro')
      to.meta.state = {
        ...state,
        docContent: { category, doc, markdown: await loadDocContent(category, doc) }
      }
      break
    }
    default:
      break
  }
}

/**
 * 官网入口：使用 vite-ssg 进行构建期预渲染（SSG）
 * - 构建时每个路由会渲染成静态 HTML，便于搜索引擎抓取正文
 * - 客户端首次加载后再 hydrate，之后恢复为常规 SPA 路由
 */
export const createApp = ViteSSG(
  App,
  {
    routes,
    scrollBehavior(_to, _from, savedPosition) {
      if (savedPosition) return savedPosition
      if (_to.hash) return { el: _to.hash, behavior: 'smooth' }
      return { top: 0, behavior: 'smooth' }
    }
  },
  ({ app, router, isClient }) => {
    app.use(createPinia())
    setupRouterGuards(router)

    // 详情页数据预取（SSR 构建时抓取真实内容；客户端导航时按需拉取）
    router.beforeResolve(async (to) => {
      try {
        await resolveRouteState(to)
      } catch (e) {
        console.warn('[route-state] 加载失败:', to.fullPath, e)
      }
    })

    if (isClient) {
      // 在线心跳：每 60 秒上报一次，仅在页面可见时发送，供后台「实时在线」统计
      const heartbeat = () => {
        if (document.visibilityState === 'visible') sendHeartbeat()
      }
      window.setInterval(heartbeat, 60 * 1000)
      // 切回前台时立即补报一次，避免后台窗口期间被判定为离线
      document.addEventListener('visibilitychange', heartbeat)
    }
  }
)
