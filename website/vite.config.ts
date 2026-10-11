import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'
import { existsSync, mkdirSync, readdirSync, writeFileSync } from 'fs'

/** 官网规范域名（sitemap / 预渲染统一使用） */
const SITE_ORIGIN = 'https://www.yunkes.com'
/** 需要从预渲染与 sitemap 中排除的路由（会员中心需登录、短链跳转页无 SEO 价值） */
const EXCLUDE_PREFIXES = ['/member', '/c/', '/pay-success']
/** includedRoutes 收集到的最终路由，供 onFinished 生成 sitemap */
let generatedRoutes: string[] = []

/** 扫描 public/docs/{category}/{doc}.md，生成 /docs/{category}/{doc} 路由 */
function collectDocPaths(): string[] {
  const docsRoot = resolve(__dirname, 'public/docs')
  if (!existsSync(docsRoot)) return []
  const paths: string[] = []
  for (const category of readdirSync(docsRoot, { withFileTypes: true })) {
    if (!category.isDirectory()) continue
    const categoryDir = resolve(docsRoot, category.name)
    for (const file of readdirSync(categoryDir)) {
      if (!file.endsWith('.md')) continue
      paths.push(`/docs/${category.name}/${file.replace(/\.md$/, '')}`)
    }
  }
  return paths
}

/** 构建期生成 dist/sitemap.xml（覆盖静态页 + 文章/公告/案例/文档） */
function writeSitemap(routes: string[]) {
  const today = new Date().toISOString().slice(0, 10)
  const priorityOf = (p: string) => {
    if (p === '/') return '1.0'
    if (p === '/pricing' || p === '/features') return '0.9'
    if (p.startsWith('/docs')) return '0.7'
    if (p.startsWith('/blog') || p.startsWith('/cases') || p.startsWith('/notice')) return '0.6'
    return '0.8'
  }
  const urls = routes
    .filter((p) => !p.includes(':'))
    .map((p) => {
      const loc = p === '/' ? `${SITE_ORIGIN}/` : `${SITE_ORIGIN}${p}`
      return `  <url>\n    <loc>${loc}</loc>\n    <lastmod>${today}</lastmod>\n    <priority>${priorityOf(p)}</priority>\n  </url>`
    })
    .join('\n')
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls}\n</urlset>\n`
  const outDir = resolve(__dirname, 'dist')
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
  writeFileSync(resolve(outDir, 'sitemap.xml'), xml, 'utf-8')
  console.log(`[ssg] sitemap.xml 已生成，共 ${routes.filter((p) => !p.includes(':')).length} 条 URL`)
}

export default defineConfig(({ mode }) => ({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  server: {
    port: 8080,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  esbuild: {
    drop: mode === 'production' ? ['console', 'debugger'] : [],
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets'
  },
  // vite-ssg 构建期预渲染配置
  ssgOptions: {
    // nginx 使用 try_files $uri $uri/ /index.html，需目录式产物（/blog/x → /blog/x/index.html）
    dirStyle: 'nested',
    async includedRoutes(paths) {
      const staticPaths = paths.filter(
        (p) => !p.includes(':') && !EXCLUDE_PREFIXES.some((prefix) => p === prefix || p.startsWith(prefix))
      )
      const base = (process.env.SSG_API_BASE || 'http://127.0.0.1:3000').replace(/\/$/, '')
      const api = `${base}/api/v1/public/site`
      const fetchList = async (endpoint: string): Promise<any[]> => {
        try {
          const res = await fetch(`${api}/${endpoint}?page=1&pageSize=50`)
          const json: any = await res.json()
          return json?.success ? json.data?.list || [] : []
        } catch (e) {
          console.warn(`[ssg] 拉取 ${endpoint} 失败，仅生成静态页:`, (e as Error).message)
          return []
        }
      }
      const [articles, notices, cases] = await Promise.all([
        fetchList('articles'),
        fetchList('notices'),
        fetchList('cases')
      ])
      const dynamic = [
        ...articles.filter((a) => a?.slug).map((a) => `/blog/${a.slug}`),
        ...notices.filter((n) => n?.slug).map((n) => `/notice/${n.slug}`),
        ...cases.filter((c) => c?.slug).map((c) => `/cases/${c.slug}`),
        ...collectDocPaths()
      ]
      const all = Array.from(new Set([...staticPaths, ...dynamic]))
      generatedRoutes = all
      return all
    },
    onFinished() {
      writeSitemap(generatedRoutes)
    }
  }
}))
