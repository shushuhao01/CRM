# 云客 CRM 官网 SEO 优化 + 管理后台「官网管理」方案

> 主域名决策（已确认）：**`https://www.yunkes.com`**
> 关联项目：`website/`（官网）、`admin/`（管理后台）、`backend/`（服务端）
> 参考项目：`D:\Projects\2Box-master\license-server`（同类目「官网管理」实现，界面即 eBox 授权平台）
>
> 本文档分两部分：
> - **第一部分**：官网 SEO 优化详细方案（解决"官网无内容、百度不抓取"）
> - **第二部分**：admin 新增一级菜单「官网管理」设计 + 落地映射

---

# 第一部分：官网 SEO 优化详细方案

## 1. 背景与目标

官网子项目 `website/` 目前**只有营销页**（首页/功能/价格/方案/关于/协议/会员中心），
**没有任何文档、案例、文章、公告等可被搜索引擎收录的"内容型"页面**，因此百度等搜索引擎基本不抓取、不收录，自然流量为 0。

目标：
1. 让官网所有页面（含文章/文档/案例）**能被搜索引擎正常抓取与收录**；
2. 建立**可持续产出的内容体系**（文章、公告、案例、文档），持续获取长尾关键词流量；
3. 把「内容生产」能力沉淀到 **admin 后台**（见第二部分），让运营无需改代码即可发布内容。

## 2. 根因诊断（为什么现在抓不到）

| # | 根因 | 现状证据 | 影响 |
|---|---|---|---|
| 1 | **纯 CSR 空壳** | [index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L45-L48) body 只有 `<div id="app">`；Vue 在浏览器端渲染 | 爬虫首屏 HTML 无正文，百度"渲染型抓取"配额低、收录慢 |
| 2 | **文档正文异步加载** | [docs.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/data/docs.ts#L150-L166) `fetch('/docs/*.md')` + 客户端 `marked()` 渲染 | 百度完全看不到文档内容（渲染也不执行 fetch） |
| 3 | **sitemap 太小** | [sitemap.xml](file:///d:/kaifa/CRM%20-%201.8.0/website/public/sitemap.xml) 仅 7 条静态 URL | 无文章/文档 URL 可被发现 |
| 4 | **域名不一致** | [index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L11-L16) canonical/og:url 写 `www.yunke-crm.com`；[robots.txt](file:///d:/kaifa/CRM%20-%201.8.0/website/public/robots.txt) 亦同；[sites.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/config/sites.ts#L12) 为 `https://yunkes.com` | canonical 指向错误域名，权重分散，甚至被判"镜像" |
| 5 | **nginx 拦截 .md** | [nginx.conf.example](file:///d:/kaifa/CRM%20-%201.8.0/nginx.conf.example#L130-L132) `deny all` 含 `md` | 若未来做 SSR 前仍需注意；当前纯前端 fetch 也受影响 |
| 6 | **标题重复** | [router/index.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/router/index.ts#L59-L63) `/docs/:category/:doc` 的 `title` 恒为 `"文档详情 - 云客CRM"` | 所有文档页 title 相同 → 重复页面，不利于收录与排名 |
| 7 | **栏目缺失** | [Navbar.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Navbar.vue) / [Footer.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Footer.vue) 无博客/案例/公告入口 | 没有内容入口 = 没有内容 = 没有可收录页面 |
| 8 | **无主动推送** | 无百度主动推送 / IndexNow | 新内容靠自然发现，收录周期长 |

## 3. 技术改造（P0，先解决"能抓、能收"）

### 3.1 预渲染（SSG）——把页面变成"静态有内容的 HTML"

- 引入 **`vite-ssg`**，构建时对确定路由做静态预渲染，产出真实 HTML（含正文）。
- head 管理改用 **`@unhead/vue`** 的 `useHead()`，替换现在 [router/index.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/router/index.ts#L124-L141) 里手动改 `document.title` 的 `afterEach`。
- 文章/文档详情页在构建期从后端拉取 slug 列表，注入 `includedRoutes` 一并预渲染。

改造点：
- [website/vite.config.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/vite.config.ts)：`plugins: [vue()]` → 增加 `ViteSSG` 配置。
- [website/src/main.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/main.ts)：`createApp` → `ViteSSG(App, { routes }, ...)`。

### 3.2 sitemap.xml 由后端动态生成（已确认）

- 由后端根级路由 **`GET /sitemap.xml`** 动态生成（读 DB 中的已发布文章/公告/案例/文档 + 固定页），带 `lastmod`。
  - 见第二部分 4.2「根级 SEO」；服务实现放 `SeoService`。
- **移除**官网 `public/sitemap.xml` 的手工静态文件，避免与后端动态路由冲突；nginx 将 `/sitemap.xml` 反代到 backend。
- `robots.txt` 的 Sitemap 行统一指向 `https://www.yunkes.com/sitemap.xml`。
- 好处：新内容**发布即入 sitemap**，无需重新构建网站。
- 注意：网站为 `vite-ssg` 预渲染，新文章若需预渲染出静态 HTML，则在"发布"动作后触发一次网站重建（或由后端直出该页 HTML）；sitemap 本身不受影响。

### 3.3 修正域名一致性（统一 `https://www.yunkes.com`）

需全局替换 `www.yunke-crm.com` → `www.yunkes.com`：

| 文件 | 位置 | 说明 |
|---|---|---|
| [index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L11) | canonical | `https://www.yunkes.com/` |
| [index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L16) | og:url | `https://www.yunkes.com/` |
| [robots.txt](file:///d:/kaifa/CRM%20-%201.8.0/website/public/robots.txt) | Sitemap 行 | 指向 `https://www.yunkes.com/sitemap.xml` |
| [sites.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/config/sites.ts#L12) | `WEBSITE_URL` | 默认值改为 `https://www.yunkes.com` |

> 注意：`sites.ts` 的 `WEBSITE_URL` 当前是 `https://yunkes.com`（无 www），需与 canonical 决策统一为 **带 www**，避免主域/裸域各被抓一份。

### 3.4 canonical / OG / JSON-LD 全站统一

- 每个路由通过 `useHead()` 设置 `canonical`（当前域名 + 当前 path）。
- 补齐 `og:title/og:description/og:url`（当前仅 [index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L12-L18) 首页硬编码）。
- 文章详情页输出 **`Article` JSON-LD**，文档页输出 `TechArticle`，案例页输出 `CreativeWork`。
- 首页保留现有 `SoftwareApplication` JSON-LD（[index.html](file:///d:/kaifa/CRM%20-%201.8.0/website/index.html#L20-L39)）。

### 3.5 文档页标题去重

- `/docs/:category/:doc` 的 `meta.title` 改为**构建期/运行时动态**：`{文档名} - {分类名} | 云客CRM 帮助文档`（复用 [docs.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/data/docs.ts) 里的 `getDocTitle`/`getCategoryTitle`）。
- description 取文档摘要。

### 3.6 百度主动推送 + IndexNow

- 接入百度搜索资源平台"**普通收录-API 推送**"：新文章发布/更新时，由后端 `SeoService` 推送 URL 给百度。
  - 约束：单次 ≤10 条、按当日剩余额度动态分批、超限对半重试（见第二部分 4.4）。
- 接入 **IndexNow**（Bing/Yandex 等）：一次性 POST `urlList`。
- 在 `website/public/` 放置验证文件（百度/Google/IndexNow 的 key `.txt`）。

## 4. 内容体系（P1，解决"有内容可收"）

### 4.1 新增栏目（官网）

| 栏目 | 路由 | 用途 | 备注 |
|---|---|---|---|
| 博客/文章列表 | `/blog` | 长尾关键词承接（"CRM 怎么选""电销系统对比"） | 新增页 |
| 文章详情 | `/blog/:slug` | 正文 + JSON-LD | 新增页 |
| 案例/客户故事 | `/cases`、`/cases/:slug` | 增信 + 行业词 | 新增页 |
| 公告/更新日志 | `/notice`、`/notice/:id` | 版本更新、活动 | 新增页 |
| 帮助文档 | `/docs`、`/docs/:category/:doc` | 已有，改造正文渲染 | 见 P0 |

- 导航栏 [Navbar.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Navbar.vue)、页脚 [Footer.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Footer.vue) 增加「博客/案例/公告」入口。
- 修复页脚「更新日志」错误指向 `/docs/start/intro` 的问题，改指向公告/更新日志页。
- 修复 [Docs.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Docs.vue) 硬编码 6 类与 [docs.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/data/docs.ts) 11 类不同步的问题（改为读取 `docCategories`）。

### 4.2 内容来源（复用已有资产）

- `private-deploy/` 下已有大量可改写成文章的素材：
  - `核心文档/宝塔一键部署教程.md`、`本地构建部署指南.md`、`API接口文档.md`
  - `合集/CRM系统推广运营方案.md`、`SIP-PBX对接配置指南.md`、`通话系统技术说明.md`
  - `项目文档/定价方案分析与优化建议.md`
- 思路：把这些内部文档**改写为对外的技术文章/教程**（去掉敏感信息），用 `scripts/seed-articles.ts`（幂等种子）灌入，或直接在 admin 后台录入。

### 4.3 内容与 SEO 的对应

- 标题：`{关键词} - {卖点} | 云客CRM`，控制在 30 字内；
- description：120 字内含核心关键词，可读；
- 正文：H2/H3 结构、图文、内链（文章 → 功能页/价格页）；
- 每篇设定 `slug`（英文/拼音）、`keywords`、`seoTitle`、`seoDesc`。

## 4.4 文章 / 案例在官网的承载位置建议（重点）

> 官网现有导航 7 项（[Navbar.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Navbar.vue#L32-L38)）：首页 / 功能特性 / 价格方案 / 版本对比 / 解决方案 / 帮助文档 / 关于我们。
> 页脚 4 组（[Footer.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Footer.vue#L53-L82)）：产品 / 支持 / 公司 / 法律。导航已偏长，新增内容入口需"收纳"，不能再平铺。

### 4.4.1 承载位置总表

| # | 位置 | 放什么 | 目的 | 涉及文件 |
|---|---|---|---|---|
| 1 | **顶部导航** | 新增「客户案例」一级入口（放"解决方案"之后）；把「帮助文档」+ 新增「博客文章」「更新日志」收进一个「资源 ▾」下拉 | 最核心的内链入口，权重传递 | [Navbar.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Navbar.vue) |
| 2 | **首页 · 中部** | 「客户案例」板块：客户 Logo 墙 + 3 张案例卡片 + "查看更多 → /cases" | 增信 + 转化；给首页注入新鲜内容 | [Home.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Home.vue) |
| 3 | **首页 · 下部** | 「最新文章 / 资讯」板块：3 篇文章卡片 + "查看更多 → /blog" | 提升首页更新频率，利于抓取 | [Home.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Home.vue) |
| 4 | **页脚「产品」组** | 增加「客户案例」「博客文章」链接 | 全站页脚内链，爬虫发现入口 | [Footer.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Footer.vue#L55-L61) |
| 5 | **页脚「支持」组** | 「更新日志」改指向 `/notice`（**修正**：现错误指向 `/docs/start/intro`） | 修正错误链接 + 指向公告 | [Footer.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Footer.vue#L60) |
| 6 | **解决方案页** | 每个行业方案页底部嵌入「相关客户案例」 | 行业长尾词 + 转化 | [Solutions.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Solutions.vue) |
| 7 | **功能特性页** | 底部「相关教程 / 文章」内链 | 内链权重 | [Features.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Features.vue) |

### 4.4.2 导航改造建议（避免导航过长）

现状 7 项平铺。推荐两种方案二选一：

**方案甲（已确认采用）**：把「帮助文档」升级为「资源 ▾」下拉，收纳 3 项

```
首页 | 功能特性 | 价格方案 | 版本对比 | 解决方案 | 客户案例 | 资源 ▾ | 关于我们
                                                        ├─ 博客文章  /blog
                                                        ├─ 帮助文档  /docs
                                                        └─ 更新日志  /notice
```

**方案乙（最简）**：不动现有项，仅在「解决方案」后插入 2 个一级项

```
首页 | 功能特性 | 价格方案 | 版本对比 | 解决方案 | 客户案例 | 博客 | 帮助文档 | 关于我们
```

> 方案甲更耐看，且"资源"下拉天然承载未来更多内容栏目；下拉交互可复用 [Navbar.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/components/Navbar.vue#L45-L62) 已有的 dropdown 组件样式。

### 4.4.3 路由与页面

| 路由 | 页面 | 说明 |
|---|---|---|
| `/cases` | 案例列表 | 行业/规模筛选、卡片流 + 分页 |
| `/cases/:slug` | 案例详情 | 客户背景 / 痛点 / 方案 / 成效 + `CreativeWork` JSON-LD |
| `/blog` | 文章列表 | 分类/标签、卡片流 + 分页 |
| `/blog/:slug` | 文章详情 | H1=标题、面包屑、正文、相关推荐 + `Article` JSON-LD |
| `/notice` | 公告 / 更新日志 | 可复用文章组件（`category=notice`），时间线展示 |

### 4.4.4 列表页 / 详情页 SEO 要点

- **列表页**：标题 + 摘要 + 封面 + 时间；分页用**真实 URL**（`/blog?page=2` 或 `/blog/page/2`），**不要无限滚动**（否则翻页内容不被索引）。
- **详情页**：`H1` = 文章/案例标题；面包屑；正文按 `H2/H3` 结构化；显示发布时间（`<time datetime>`）；底部「相关推荐」做内链；输出对应 JSON-LD。
- 每个页面 **title / description / canonical 唯一**（`useHead` 注入，勿再全站共用同一 title）。
- 正文图片带 `alt`；重要内链锚文本使用关键词（如"CRM 系统怎么选"→ 功能页）。

### 4.4.5 首页板块顺序建议

```
Hero（价值主张 + 免费试用 CTA）
  → 核心功能（现有）
  → 客户案例（**新增**，Logo 墙 + 案例卡）
  → 数据/优势（现有）
  → 最新文章/资讯（**新增**，3 篇卡）
  → 价格/CTA（现有）
  → Footer
```

> 首页是权重最高的页面，放案例与文章板块 = 把站内权重导给内容页，同时让首页"有更新"，提升百度抓取频率。

## 5. 持续运营（P2）

- 每周 1–2 篇原创文章（关键词来自百度搜索下拉/相关搜索/竞品词）。
- 百度站长平台：提交 sitemap、开启主动推送、监控抓取/索引量。
- 内链策略：文章正文内链到功能页、价格页、注册页。
- 外链：同类目录、行业站点、自媒体分发（知乎/公众号导流）。

## 6. 分阶段执行清单

| 阶段 | 事项 | 产出 |
|---|---|---|
| **P0-a** | 域名统一（index.html / robots / sites.ts） | 域名一致 |
| **P0-b** | 引入 vite-ssg + @unhead/vue，改造 main.ts/vite.config.ts | 预渲染可跑 |
| **P0-c** | 文档页 title 去重 + canonical/OG/JSON-LD 全站 | head 规范化 |
| **P0-d** | 后端动态 `GET /sitemap.xml`（SeoService），移除静态 sitemap | 动态 sitemap |
| **P1-a** | 官网新增 博客/案例/公告 路由与页面 + 导航/页脚/首页入口（见 4.4） | 内容栏目上线 |
| **P1-b** | 后端内容表 + 公开 API（见第二部分） | 内容可配置 |
| **P1-c** | 百度主动推送 + IndexNow | 收录加速 |
| **P2** | 内容持续产出 + 站长平台运营 | 流量增长 |

## 7. 验收指标

- 百度 `site:www.yunkes.com` 收录页面数从 ~7 → 持续增长；
- 抓取诊断无"正文为空""标题重复"；
- sitemap 条数 = 固定页 + 内容页；提交后百度"已收录"比例上升；
- 核心关键词（如"云客CRM""CRM系统"）能进入百度前几页；
- 自然搜索访客数（后台"访问统计"看来源渠道）从 0 增长。

---

# 第二部分：admin 新增一级菜单「官网管理」

## 1. 参考项目做法（license-server / eBox）

参考项目 `D:\Projects\2Box-master\license-server` 的「官网管理」是一个**一级菜单 + 单路由 `/site` + 内部左侧 Tabs**（不是嵌套子菜单、也不是路由子页面），
Tabs 通过组件级 `rendered` 懒挂载切换。共 12 个页签：

> 站点设置 / 使用手册 / 文章管理 / 公告管理 / 案例管理 / 下载地址 / 版本与安装包 / 导航菜单 / 联系方式 / 媒体库 / 访问与安全 / 访问统计

**站点设置**页（截图1）区块：开源仓库、页脚合规信息（ICP 备案号 / 公安备案号 / 版权信息）、SEO（SEO 标题 / SEO 描述）、
搜索引擎主动推送（站点主域名 / 自动推送开关 / 百度推送 Token / IndexNow Key / 一键推送全站 + 查看 sitemap.xml）、统计代码。

后端结构：`SiteArticle`/`SiteCase`/`SiteSetting`/`SiteNav`/`SiteMedia`/`SiteContact`/`SiteDownloadMirror`/`SiteAccessRule`
+ 统计体系 `SiteVisitLog`/`SiteStatsDaily`/`SiteOnline`/`SiteChannelLink`/`SiteChannelClick`/`SiteChannelStatsDaily`；
建表用 `ensureSchema.ts`（DDL 数组 + `information_schema` 差集补列，失败仅告警）；
路由分 admin 侧 `/api/admin/site/*` 与公开侧 `/api/site/*`；服务 `SeoService` / `SiteAnalyticsService` / `SiteService` / `ChannelService`。

## 2. CRM「官网管理」菜单设计

结合 CRM 现状（官网已有文档/会员中心，无内容栏目），设计如下 **12 个 Tabs**（对齐参考项目，去掉不适用的"下载地址/媒体库"可按需保留）：

| # | Tab | 功能 | 对应官网栏目 |
|---|---|---|---|
| 1 | **站点设置** | 站点名称/Logo/描述/关键词、首页文案、首页配图、页脚合规、SEO、搜索引擎主动推送、统计代码 | 全站 |
| 2 | **文章管理** | 文章 CRUD（草稿/发布/置顶）、slug、封面、分类、SEO 字段 | `/blog` |
| 3 | **公告管理** | 公告 CRUD（复用文章组件，`category=notice` 区分） | `/notice` |
| 4 | **案例管理** | 客户案例 CRUD | `/cases` |
| 5 | **帮助文档** | 管理 `/docs` 文档（分类/文档排序/正文/Markdown） | `/docs` |
| 6 | **导航菜单** | 官网顶部/页脚导航配置 | Navbar/Footer |
| 7 | **联系方式** | 客服二维码/电话/邮箱/地址、演示视频 | 联系页 |
| 8 | **媒体库** | 图片/视频上传管理，供文章/配图选用 | — |
| 9 | **版本与安装包** | 复用现有「版本发布」，对外展示下载镜像 | 下载页 |
| 10 | **访问与安全** | 访问白名单/IP 限制、防采集规则 | 全站 |
| 11 | **访问统计** | 总览指标卡 + 趋势图 + 渠道统计 + 实时在线 | — |
| 12 | **素材/下载** | 可选：下载地址镜像、素材库 | 下载页 |

> **一期范围（已确认）**：**1/2/3/4/5/6/11**（站点设置 + 文章/公告/案例/帮助文档 + 导航 + 访问统计），
> 二期再补 7 联系方式 / 8 媒体库 / 9 版本与安装包 / 10 访问与安全 / 12 素材下载。

## 3. 前端落地（admin）

现有 admin 菜单是**路由 children + [MainLayout.vue](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/layouts/MainLayout.vue) 硬编码 + [permissions.ts](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/utils/permissions.ts) 权限码** 三件套。

### 3.1 路由（[admin/src/router/index.ts](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/router/index.ts)）

采用与参考项目一致的「**一级菜单 + 单路由 + 组件内 Tabs**」方案：

```ts
{
  path: 'website',
  name: 'WebsiteParent',
  meta: { title: '官网管理', icon: 'Monitor' },
  redirect: '/website/settings',
  children: [
    {
      path: 'settings',
      name: 'WebsiteSettings',
      component: () => import('@/views/website/SiteManage.vue'),
      meta: { title: '站点设置', permission: 'website:settings:view' }
    }
    // 其余 Tab 由 SiteManage.vue 内部 Tabs 切换（组件级懒挂载），
    // 如需深链可给每个 Tab 增加独立子路由
  ]
}
```

> 已确认采用 **A 方案**（单路由 + 内部 Tabs，贴近参考项目，改动小、体验一致）。
> 如需深链可后续给每个 Tab 增加独立子路由。

### 3.2 菜单（[MainLayout.vue](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/layouts/MainLayout.vue)）

在「企微管理」与「系统设置」之间插入：

```html
<!-- 官网管理 -->
<el-sub-menu v-if="hasMenu('website')" index="/website">
  <template #title>
    <el-icon><Monitor /></el-icon>
    <span>官网管理</span>
  </template>
  <el-menu-item v-if="hasPerm('website:settings:view')" index="/website/settings">站点设置</el-menu-item>
  <el-menu-item v-if="hasPerm('website:articles:view')" index="/website/articles">文章管理</el-menu-item>
  <el-menu-item v-if="hasPerm('website:notices:view')" index="/website/notices">公告管理</el-menu-item>
  <el-menu-item v-if="hasPerm('website:cases:view')" index="/website/cases">案例管理</el-menu-item>
  <el-menu-item v-if="hasPerm('website:docs:view')" index="/website/docs">帮助文档</el-menu-item>
  <el-menu-item v-if="hasPerm('website:nav:view')" index="/website/nav">导航菜单</el-menu-item>
  <el-menu-item v-if="hasPerm('website:stats:view')" index="/website/stats">访问统计</el-menu-item>
</el-sub-menu>
```

图标 `Monitor` 需在 [MainLayout.vue](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/layouts/MainLayout.vue#L263-L267) 的 `@element-plus/icons-vue` 导入列表中加入。

### 3.3 权限码（[admin/src/utils/permissions.ts](file:///d:/kaifa/CRM%20-%201.8.0/admin/src/utils/permissions.ts)）

```ts
// MENU_MODULES 增加
WEBSITE: 'website'

// PERMISSIONS 增加
WEBSITE_SETTINGS_VIEW: 'website:settings:view',
WEBSITE_SETTINGS_EDIT: 'website:settings:edit',
WEBSITE_ARTICLES_VIEW: 'website:articles:view',
WEBSITE_ARTICLES_EDIT: 'website:articles:edit',
WEBSITE_NOTICES_VIEW: 'website:notices:view',
WEBSITE_NOTICES_EDIT: 'website:notices:edit',
WEBSITE_CASES_VIEW: 'website:cases:view',
WEBSITE_CASES_EDIT: 'website:cases:edit',
WEBSITE_DOCS_VIEW: 'website:docs:view',
WEBSITE_DOCS_EDIT: 'website:docs:edit',
WEBSITE_NAV_VIEW: 'website:nav:view',
WEBSITE_NAV_EDIT: 'website:nav:edit',
WEBSITE_STATS_VIEW: 'website:stats:view'

// MENU_PERMISSION_MAP 增加
'/website/settings': PERMISSIONS.WEBSITE_SETTINGS_VIEW,
'/website/articles': PERMISSIONS.WEBSITE_ARTICLES_VIEW,
'/website/notices': PERMISSIONS.WEBSITE_NOTICES_VIEW,
'/website/cases': PERMISSIONS.WEBSITE_CASES_VIEW,
'/website/docs': PERMISSIONS.WEBSITE_DOCS_VIEW,
'/website/nav': PERMISSIONS.WEBSITE_NAV_VIEW,
'/website/stats': PERMISSIONS.WEBSITE_STATS_VIEW
```

### 3.4 前端页面目录

```
admin/src/views/website/
  SiteManage.vue        # Tabs 容器（左侧页签 + 右侧内容，rendered 懒挂载）
  SiteSettings.vue      # 站点设置（含 SEO / 主动推送 / 统计代码）
  SiteArticles.vue      # 文章管理（公告复用，props: category）
  SiteCases.vue         # 案例管理
  SiteDocs.vue          # 帮助文档
  SiteNav.vue           # 导航菜单
  SiteStats.vue         # 访问统计（指标卡 + 图表）
admin/src/components/
  RichEditor.vue        # 富文本编辑器（若已有 RichTextEditor.vue 可复用）
  MediaPicker.vue       # 素材库选图
```

> 复用：admin 已有 `components/RichTextEditor.vue`、`api/announcements.ts`，优先复用而非新建。

## 4. 后端落地（backend）

### 4.1 实体（`backend/src/entities/`）

| 实体 | 表 | 关键字段 |
|---|---|---|
| `SiteArticle` | `site_articles` | slug / title / category(article\|notice) / cover / summary / content / contentType / status(draft\|published) / pinned / publishAt / expireAt / seoTitle / seoDesc / keywords / views / createdBy |
| `SiteCase` | `site_cases` | slug / title / cover / summary / content / industry / status / sort |
| `SiteDoc` | `site_docs` | category / slug / title / content(md) / sort / status |
| `SiteSetting` | `site_settings` | KV（现有 `system_config.websiteConfig` 可迁移/并存） |
| `SiteNav` | `site_navs` | title / url / position(top\|footer) / sort / visible |
| `SiteMedia` | `site_media` | url / type(image\|video) / size / name |
| `SiteVisitLog` | `site_visit_log` | ip / ua / path / referer / channel_code / createdAt（保留 90 天） |
| `SiteStatsDaily` | `site_stats_daily` | date / pv / uv / ip 数 |
| `SiteOnline` | `site_online` | 会话/ip + 时间（5 分钟窗口） |

> CRM 项目 `synchronize: false`，**新增表用 `WecomConvertFanService.ensureTables()` 同款范式**（服务内 `CREATE TABLE IF NOT EXISTS` + `information_schema` 对照实体逐列补齐），
> 在 `SchedulerService` 注册处及各入口懒触发，无需手工执行 SQL。

### 4.2 路由

- **admin 侧**：`backend/src/routes/admin/site.ts` → 挂到 `routes/admin/index.ts`
  - `GET/PUT  /api/admin/site/settings`
  - `CRUD     /api/admin/site/articles`（& `/notices` 复用）
  - `CRUD     /api/admin/site/cases`
  - `CRUD     /api/admin/site/docs`
  - `CRUD     /api/admin/site/nav`
  - `POST     /api/admin/site/upload`（媒体）
  - `POST     /api/admin/site/seo-push`（一键推送全站）
  - `GET      /api/admin/site/stats`、`/analytics`、`/online`、`/visits`
- **公开侧**：`backend/src/routes/public/site.ts` → 挂到 `routes/public/index.ts`
  - `GET /api/v1/public/site/settings`
  - `GET /api/v1/public/site/articles`、`/articles/:slug`
  - `GET /api/v1/public/site/notice`
  - `GET /api/v1/public/site/cases`、`/cases/:slug`
  - `GET /api/v1/public/site/nav`
  - `POST /api/v1/public/site/track`（埋点）
- **根级 SEO**：`backend/src/routes/seo.ts`
  - `GET /sitemap.xml`（**后端动态生成**，已确认；由 `SeoService` 读 DB 输出，nginx 反代）
  - `GET /:indexnowKey.txt`（IndexNow 密钥文件）

> 现有公开接口 [website-config.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/routes/public/website-config.ts) 可保留，逐步并入 `/site/settings`。

### 4.3 服务

| 服务 | 职责 |
|---|---|
| `SiteService` | 站点配置读写、内容 CRUD 复用 |
| `SeoService` | sitemap 生成、百度主动推送、IndexNow 推送 |
| `SiteAnalyticsService` | 埋点采集、日聚合、实时在线、明细查询 |

### 4.4 百度推送 / IndexNow 规则（照搬参考项目可靠性设计）

- 百度 API 推送：**单次 ≤10 条**；按当日**剩余额度动态调批**；超限时**对半重试**；
- IndexNow：一次性 POST `urlList`；
- sitemap 仅含**固定页 + 已发布(visible)文章**；
- 发布/更新内容时自动触发推送（"自动推送"开关，见站点设置）。

## 5. 权限树同步（关键）

admin 侧权限码必须与后端 **`PERMISSION_TREE`** 一致（[backend/src/routes/admin/roles.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/routes/admin/roles.ts#L15)）。
需在 `PERMISSION_TREE` 中新增 `website` 模块及其子权限：

```ts
{
  code: 'website',
  name: '官网管理',
  children: [
    { code: 'website:settings:view', name: '查看站点设置' },
    { code: 'website:settings:edit', name: '编辑站点设置' },
    { code: 'website:articles:view', name: '查看文章管理' },
    { code: 'website:articles:edit', name: '编辑文章' },
    { code: 'website:notices:view', name: '查看公告管理' },
    { code: 'website:notices:edit', name: '编辑公告' },
    { code: 'website:cases:view', name: '查看案例管理' },
    { code: 'website:cases:edit', name: '编辑案例' },
    { code: 'website:docs:view', name: '查看帮助文档' },
    { code: 'website:docs:edit', name: '编辑帮助文档' },
    { code: 'website:nav:view', name: '查看导航菜单' },
    { code: 'website:nav:edit', name: '编辑导航菜单' },
    { code: 'website:stats:view', name: '查看访问统计' }
  ]
}
```

`hasMenu('website')` 会因"拥有子权限之一"而显示一级菜单。

## 6. 官网与后台的联动闭环

```
admin「官网管理」
  ├─ 文章/公告/案例/文档 发布 ──► 触发 SeoService 推送到 百度 / IndexNow
  ├─ 站点设置(SEO/统计代码) ──► 公开 API /api/v1/public/site/settings ──► 官网 useHead 注入
  ├─ 导航菜单 ──► 官网 Navbar/Footer 渲染
  └─ 访问统计 ◄── 官网埋点 POST /api/v1/public/site/track ◄── 用户访问官网
```

- 官网构建期：`vite-ssg` 拉取已发布内容生成静态页。
- 运行时：官网读公开 API 拿配置/导航；埋点回传后台统计。
- **sitemap 由后端动态生成**：发布内容即更新，无需重建网站。

## 7. 实施顺序建议（一期范围已确认）

**一期范围（已确认）**：站点设置 + 文章/公告/案例/文档 + 导航菜单 + 访问统计。

| 阶段 | 内容 | 期次 | 依赖 |
|---|---|---|---|
| **一** | 站点设置（Settings + 公开 settings API + 官网接入） | 一期 | P0 域名统一 |
| **二** | 文章 / 公告（实体 + CRUD + 公开 API + 官网 `/blog` `/notice`） | 一期 | vite-ssg |
| **三** | 案例 + 帮助文档迁移 | 一期 | — |
| **四** | 导航菜单（保存/渲染，驱动 Navbar/Footer） | 一期 | 二 |
| **五** | 访问统计（埋点 + 日聚合 + 实时在线 + 图表） | 一期 | 官网埋点 |
| **六** | 联系方式 / 媒体库 | 二期 | 一 |
| **七** | 访问与安全 + 下载镜像（可选） | 二期 | 五 |

> 一期的 6 个 Tabs：**站点设置 / 文章管理 / 公告管理 / 案例管理 / 帮助文档 / 导航菜单 / 访问统计**（7 项）。
> 二期再补：联系方式、媒体库、访问与安全、下载/版本镜像。

## 8. 与现有代码的冲突点/注意事项

1. 现有 `system_config.websiteConfig`（[website-config.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/routes/public/website-config.ts)）承载了版权/ICP/演示视频等，与新的 `site_settings` **并存、不取代**（已确认）：
   - 官网侧 `websiteConfig` 相关字段继续沿用现有公开接口，负责"品牌/版权/客服/演示视频"等基础配置；
   - `site_settings` 专注"官网管理"新增能力（SEO、主动推送、统计代码、首页文案等）；
   - 二者读同一份底层存储时需明确"哪个 key 归谁"，避免双写冲突。
2. 官网域名统一 `www.yunkes.com`，需同步 [sites.ts](file:///d:/kaifa/CRM%20-%201.8.0/backend/src/config/sites.ts#L12) 默认值与 nginx/证书。
3. [Docs.vue](file:///d:/kaifa/CRM%20-%201.8.0/website/src/views/Docs.vue) 与 [docs.ts](file:///d:/kaifa/CRM%20-%201.8.0/website/src/data/docs.ts) 分类不一致，迁移到后台管理时一并修复。
4. 新增文件必须**零类型错误**（构建验证约定）；改 `SchedulerService` 任务数/`PaymentService` 分流需同步跑 `npm test`。
5. `.md` 的 nginx `deny` 规则（[nginx.conf.example](file:///d:/kaifa/CRM%20-%201.8.0/nginx.conf.example#L130-L132)）在 SSG 后不影响，但若仍保留运行时 `fetch('/docs/*.md')` 需放行或改为接口返回正文。

---

## 附：已确认决策

1. ✅ 官网管理采用 **单路由 + 内部 Tabs**（方案 A）。
2. ✅ `site_settings` **不取代** `system_config.websiteConfig`，**二者并存**。
3. ✅ 文章/案例承载位置：导航 + 首页板块 + 页脚 + 相关内链（详见 4.4）。
4. ✅ **一期范围**：站点设置 + 文章/公告/案例/文档 + 导航菜单 + 访问统计。
5. ✅ **sitemap 由后端动态生成**（`GET /sitemap.xml`）。
6. ✅ 导航改造采用 **方案甲**（「资源 ▾」下拉收纳）。

> 全部决策已定，可进入实施。
