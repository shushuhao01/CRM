/**
 * 官网帮助文档 — 导航数据 + Markdown 动态加载
 * 文档内容已迁移到 public/docs/{category}/{doc}.md
 * 通过 fetch 动态加载 Markdown，用 marked 渲染为 HTML
 */

export interface DocCategory {
  key: string
  title: string
  items: { key: string; title: string }[]
}

/** 文档分类导航 */
export const docCategories: DocCategory[] = [
  {
    key: 'start',
    title: '快速开始',
    items: [
      { key: 'intro', title: '系统介绍' },
      { key: 'register', title: '注册与登录' },
      { key: 'settings', title: '基础设置' },
      { key: 'quickstart', title: '5分钟上手指南' }
    ]
  },
  {
    key: 'customer',
    title: '客户管理',
    items: [
      { key: 'add', title: '添加客户' },
      { key: 'follow', title: '客户跟进' },
      { key: 'assign', title: '客户分配' },
      { key: 'pool', title: '分组与标签' }
    ]
  },
  {
    key: 'order',
    title: '订单管理',
    items: [
      { key: 'create', title: '创建订单' },
      { key: 'audit', title: '订单审核' },
      { key: 'ship', title: '发货管理' },
      { key: 'return', title: '退换货处理' }
    ]
  },
  {
    key: 'report',
    title: '数据报表',
    items: [
      { key: 'performance', title: '业绩统计' },
      { key: 'ranking', title: '团队排名' },
      { key: 'export', title: '数据导出' },
      { key: 'custom', title: '数据看板' }
    ]
  },
  {
    key: 'system',
    title: '系统设置',
    items: [
      { key: 'user', title: '用户管理' },
      { key: 'role', title: '角色权限' },
      { key: 'dept', title: '部门设置' },
      { key: 'config', title: '系统配置' }
    ]
  },
  {
    key: 'wecom',
    title: '企微管理',
    items: [
      { key: 'intro', title: '企微管理介绍' },
      { key: 'config', title: '企微配置与授权' },
      { key: 'customer', title: '客户与客户群' },
      { key: 'acquisition', title: '获客助手与活码' },
      { key: 'archive', title: '会话存档与质检' },
      { key: 'ai', title: 'AI助手与知识库' },
      { key: 'payment', title: '对外收款管理' }
    ]
  },
  {
    key: 'virtual',
    title: '虚拟商品',
    items: [
      { key: 'intro', title: '虚拟商品介绍' },
      { key: 'cardkey', title: '卡密管理' },
      { key: 'resource', title: '网盘资源管理' },
      { key: 'delivery', title: '自动发货与领取' },
      { key: 'settings', title: '领取页面配置' }
    ]
  },
  {
    key: 'sms',
    title: '短信管理',
    items: [
      { key: 'intro', title: '短信管理介绍' },
      { key: 'template', title: '模板管理与审核' },
      { key: 'quota', title: '额度购买与使用' },
      { key: 'autosend', title: '自动发送规则' },
      { key: 'statistics', title: '统计与分析' }
    ]
  },
  {
    key: 'deploy',
    title: '私有部署',
    items: [
      { key: 'guide', title: '🧭 智能部署引导' },
      { key: 'require', title: '环境要求' },
      { key: 'local', title: '本地电脑部署' },
      { key: 'bt', title: '宝塔面板部署' },
      { key: 'linux', title: '纯Linux部署' },
      { key: 'configure', title: '配置说明' },
      { key: 'activate', title: '激活与授权' },
      { key: 'faq', title: '常见问题' }
    ]
  }
]

/** 文档标题映射 */
const docTitleMap: Record<string, Record<string, string>> = {}
docCategories.forEach(cat => {
  docTitleMap[cat.key] = {}
  cat.items.forEach(item => {
    docTitleMap[cat.key][item.key] = item.title
  })
})

/** 获取文档标题 */
export function getDocTitle(category: string, doc: string): string {
  return docTitleMap[category]?.[doc] || ''
}

/** 根据分类key获取分类标题 */
export function getCategoryTitle(categoryKey: string): string {
  return docCategories.find(c => c.key === categoryKey)?.title || ''
}

/** Markdown 内容缓存 */
const contentCache = new Map<string, string>()

/** 异步加载文档 Markdown 内容 */
export async function loadDocContent(category: string, doc: string): Promise<string> {
  const cacheKey = `${category}/${doc}`
  if (contentCache.has(cacheKey)) {
    return contentCache.get(cacheKey)!
  }
  try {
    const response = await fetch(`/docs/${category}/${doc}.md`)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }
    const markdown = await response.text()
    contentCache.set(cacheKey, markdown)
    return markdown
  } catch (error) {
    console.error(`[Docs] load failed: ${cacheKey}`, error)
    return '> 文档加载失败，请稍后重试。'
  }
}
