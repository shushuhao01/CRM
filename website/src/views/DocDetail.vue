<template>
  <div class="doc-detail-page">
    <div class="doc-layout">
      <!-- 侧边栏 -->
      <aside class="doc-sidebar">
        <div class="sidebar-header">
          <router-link to="/docs" class="back-link">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M19 12H5M12 19l-7-7 7-7"/>
            </svg>
            返回文档中心
          </router-link>
        </div>
        <nav class="sidebar-nav">
          <div v-for="category in docCategories" :key="category.key" class="nav-category">
            <h4>{{ category.title }}</h4>
            <ul>
              <li v-for="item in category.items" :key="item.key">
                <router-link
                  :to="`/docs/${category.key}/${item.key}`"
                  :class="{ active: currentDoc === item.key }"
                >
                  {{ item.title }}
                </router-link>
              </li>
            </ul>
          </div>
        </nav>
      </aside>

      <!-- 文档内容 -->
      <main class="doc-main">
        <article class="doc-article">
          <div class="doc-header">
            <span class="doc-category-tag">{{ currentCategoryTitle }}</span>
            <h1>{{ currentDocTitle }}</h1>
            <p class="doc-meta">最后更新：2025年1月</p>
          </div>
          <div class="doc-content" v-html="currentDocContent"></div>
        </article>
      </main>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()

const docCategories = [
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
      { key: 'pool', title: '公海池管理' }
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
      { key: 'custom', title: '自定义报表' }
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
    key: 'deploy',
    title: '私有部署',
    items: [
      { key: 'require', title: '环境要求' },
      { key: 'install', title: '安装指南' },
      { key: 'configure', title: '配置说明' },
      { key: 'faq', title: '常见问题' }
    ]
  }
]

// 文档内容
const docContents: Record<string, Record<string, { title: string; content: string }>> = {
  start: {
    intro: {
      title: '系统介绍',
      content: `
        <h2>什么是云客CRM？</h2>
        <p>云客CRM是一款专为销售团队打造的智能客户关系管理系统，集客户管理、订单处理、业绩分析、物流跟踪于一体，助力企业实现销售业绩持续增长。</p>
        <h3>核心功能</h3>
        <ul>
          <li><strong>客户管理</strong> - 360°客户视图，完整记录客户全生命周期</li>
          <li><strong>订单管理</strong> - 从下单到发货全流程管理</li>
          <li><strong>业绩分析</strong> - 实时业绩看板，多维度数据分析</li>
          <li><strong>物流跟踪</strong> - 对接主流快递，实时轨迹查询</li>
          <li><strong>电销外呼</strong> - 集成云呼叫中心，提升电销效率</li>
        </ul>
        <h3>产品优势</h3>
        <ul>
          <li>开箱即用，5分钟快速上手</li>
          <li>数据安全，银行级加密保护</li>
          <li>灵活部署，支持SaaS和私有部署</li>
          <li>持续更新，每月发布新功能</li>
        </ul>
      `
    },
    register: {
      title: '注册与登录',
      content: `
        <h2>注册账号</h2>
        <ol>
          <li>访问云客CRM官网，点击"免费试用"按钮</li>
          <li>填写企业名称、联系人、手机号等信息</li>
          <li>获取并输入短信验证码</li>
          <li>设置登录密码，完成注册</li>
        </ol>
        <h2>登录系统</h2>
        <ol>
          <li>访问系统登录页面</li>
          <li>输入手机号和密码</li>
          <li>点击"登录"按钮进入系统</li>
        </ol>
        <h3>忘记密码</h3>
        <p>如果忘记密码，可以通过以下方式找回：</p>
        <ol>
          <li>点击登录页面的"忘记密码"链接</li>
          <li>输入注册时使用的手机号</li>
          <li>获取短信验证码并验证</li>
          <li>设置新密码</li>
        </ol>
      `
    },
    settings: {
      title: '基础设置',
      content: `
        <h2>企业信息设置</h2>
        <p>登录系统后，首先需要完善企业基础信息：</p>
        <ol>
          <li>进入"系统设置" > "基础设置"</li>
          <li>填写企业名称、Logo、联系方式等</li>
          <li>配置企业地址信息</li>
          <li>保存设置</li>
        </ol>
        <h2>部门架构设置</h2>
        <p>根据企业组织架构创建部门：</p>
        <ol>
          <li>进入"系统设置" > "部门管理"</li>
          <li>点击"添加部门"创建一级部门</li>
          <li>可以继续添加子部门</li>
          <li>设置部门负责人</li>
        </ol>
        <h2>角色权限配置</h2>
        <p>系统预置了常用角色模板，也支持自定义角色：</p>
        <ul>
          <li>超级管理员 - 拥有所有权限</li>
          <li>销售经理 - 管理团队和查看报表</li>
          <li>销售员 - 基础销售功能</li>
          <li>客服 - 客户服务相关功能</li>
        </ul>
      `
    },
    quickstart: {
      title: '5分钟上手指南',
      content: `
        <h2>快速开始使用云客CRM</h2>
        <p>按照以下步骤，5分钟内即可开始使用系统：</p>
        <h3>第1步：添加员工账号（1分钟）</h3>
        <ol>
          <li>进入"系统设置" > "用户管理"</li>
          <li>点击"添加用户"</li>
          <li>填写员工信息，分配角色和部门</li>
        </ol>
        <h3>第2步：导入客户数据（2分钟）</h3>
        <ol>
          <li>进入"客户管理"</li>
          <li>点击"导入客户"</li>
          <li>下载模板，填写客户信息</li>
          <li>上传Excel文件完成导入</li>
        </ol>
        <h3>第3步：创建第一个订单（2分钟）</h3>
        <ol>
          <li>进入"订单管理" > "新建订单"</li>
          <li>选择客户，添加商品</li>
          <li>填写收货地址</li>
          <li>提交订单</li>
        </ol>
        <p class="tip">💡 提示：系统提供了详细的新手引导，首次使用时会自动显示操作提示。</p>
      `
    }
  },
  customer: {
    add: {
      title: '添加客户',
      content: `
        <h2>添加新客户</h2>
        <h3>手动添加</h3>
        <ol>
          <li>进入"客户管理"页面</li>
          <li>点击右上角"添加客户"按钮</li>
          <li>填写客户基本信息（姓名、电话、地址等）</li>
          <li>选择客户来源和意向等级</li>
          <li>点击"保存"完成添加</li>
        </ol>
        <h3>批量导入</h3>
        <ol>
          <li>点击"导入客户"按钮</li>
          <li>下载Excel模板</li>
          <li>按模板格式填写客户信息</li>
          <li>上传文件，系统自动导入</li>
        </ol>
        <h3>客户字段说明</h3>
        <table>
          <tr><th>字段</th><th>说明</th><th>是否必填</th></tr>
          <tr><td>客户姓名</td><td>客户的真实姓名</td><td>是</td></tr>
          <tr><td>手机号码</td><td>客户联系电话</td><td>是</td></tr>
          <tr><td>客户来源</td><td>客户获取渠道</td><td>否</td></tr>
          <tr><td>意向等级</td><td>A/B/C/D四个等级</td><td>否</td></tr>
        </table>
      `
    },
    follow: {
      title: '客户跟进',
      content: `
        <h2>跟进客户</h2>
        <p>及时跟进客户是提高转化率的关键。</p>
        <h3>添加跟进记录</h3>
        <ol>
          <li>进入客户详情页</li>
          <li>点击"添加跟进"按钮</li>
          <li>选择跟进方式（电话/微信/拜访等）</li>
          <li>填写跟进内容</li>
          <li>设置下次跟进时间</li>
        </ol>
        <h3>跟进提醒</h3>
        <p>系统会在以下情况发送提醒：</p>
        <ul>
          <li>到达预设的跟进时间</li>
          <li>客户长时间未跟进</li>
          <li>客户即将到期回收</li>
        </ul>
      `
    },
    assign: {
      title: '客户分配',
      content: `
        <h2>客户分配</h2>
        <h3>手动分配</h3>
        <ol>
          <li>在客户列表勾选需要分配的客户</li>
          <li>点击"分配"按钮</li>
          <li>选择目标销售人员</li>
          <li>确认分配</li>
        </ol>
        <h3>自动分配规则</h3>
        <p>系统支持配置自动分配规则：</p>
        <ul>
          <li>轮询分配 - 按顺序轮流分配</li>
          <li>权重分配 - 按设定比例分配</li>
          <li>区域分配 - 按客户所在区域分配</li>
        </ul>
      `
    },
    pool: {
      title: '公海池管理',
      content: `
        <h2>公海池</h2>
        <p>公海池用于存放未分配或被释放的客户资源。</p>
        <h3>客户回收规则</h3>
        <ul>
          <li>超过N天未跟进自动回收</li>
          <li>超过N天未成交自动回收</li>
          <li>销售人员主动释放</li>
        </ul>
        <h3>领取客户</h3>
        <ol>
          <li>进入"公海池"页面</li>
          <li>浏览可领取的客户</li>
          <li>点击"领取"按钮</li>
          <li>客户自动分配到您名下</li>
        </ol>
      `
    }
  },
  order: {
    create: {
      title: '创建订单',
      content: `
        <h2>创建新订单</h2>
        <ol>
          <li>进入"订单管理" > "新建订单"</li>
          <li>选择或搜索客户</li>
          <li>添加商品，设置数量和价格</li>
          <li>填写收货地址</li>
          <li>选择支付方式</li>
          <li>添加订单备注（可选）</li>
          <li>点击"提交订单"</li>
        </ol>
        <h3>订单状态说明</h3>
        <ul>
          <li>待审核 - 订单已提交，等待审核</li>
          <li>待发货 - 审核通过，等待发货</li>
          <li>已发货 - 已发货，物流运输中</li>
          <li>已完成 - 客户已签收</li>
        </ul>
      `
    },
    audit: {
      title: '订单审核',
      content: `
        <h2>订单审核流程</h2>
        <p>订单提交后需要经过审核才能发货。</p>
        <h3>审核操作</h3>
        <ol>
          <li>进入"订单审核"页面</li>
          <li>查看待审核订单列表</li>
          <li>点击订单查看详情</li>
          <li>核实订单信息无误后点击"通过"</li>
          <li>如有问题可点击"驳回"并填写原因</li>
        </ol>
      `
    },
    ship: {
      title: '发货管理',
      content: `
        <h2>订单发货</h2>
        <h3>单个发货</h3>
        <ol>
          <li>在待发货订单列表点击"发货"</li>
          <li>选择快递公司</li>
          <li>填写快递单号</li>
          <li>确认发货</li>
        </ol>
        <h3>批量发货</h3>
        <ol>
          <li>勾选多个待发货订单</li>
          <li>点击"批量发货"</li>
          <li>下载发货模板</li>
          <li>填写快递信息后上传</li>
        </ol>
      `
    },
    return: {
      title: '退换货处理',
      content: `
        <h2>退换货流程</h2>
        <h3>申请退货</h3>
        <ol>
          <li>在订单详情点击"申请退货"</li>
          <li>选择退货原因</li>
          <li>填写退货说明</li>
          <li>提交申请</li>
        </ol>
        <h3>处理退货</h3>
        <ol>
          <li>审核退货申请</li>
          <li>确认收到退货商品</li>
          <li>处理退款</li>
          <li>完成退货</li>
        </ol>
      `
    }
  },
  report: {
    performance: {
      title: '业绩统计',
      content: `
        <h2>业绩统计</h2>
        <p>实时查看个人和团队的业绩数据。</p>
        <h3>个人业绩</h3>
        <ul>
          <li>今日/本周/本月业绩</li>
          <li>订单数量和金额</li>
          <li>客户转化率</li>
          <li>业绩趋势图</li>
        </ul>
        <h3>团队业绩</h3>
        <ul>
          <li>团队整体业绩概览</li>
          <li>成员业绩排名</li>
          <li>部门业绩对比</li>
        </ul>
      `
    },
    ranking: {
      title: '团队排名',
      content: `
        <h2>团队排名</h2>
        <p>查看团队成员的业绩排名，激发团队竞争意识。</p>
        <h3>排名维度</h3>
        <ul>
          <li>销售额排名</li>
          <li>订单数排名</li>
          <li>新客户数排名</li>
          <li>跟进次数排名</li>
        </ul>
        <h3>排名周期</h3>
        <ul>
          <li>日排名</li>
          <li>周排名</li>
          <li>月排名</li>
          <li>年度排名</li>
        </ul>
      `
    },
    export: {
      title: '数据导出',
      content: `
        <h2>数据导出</h2>
        <p>支持将系统数据导出为Excel文件。</p>
        <h3>可导出数据</h3>
        <ul>
          <li>客户数据</li>
          <li>订单数据</li>
          <li>业绩报表</li>
          <li>跟进记录</li>
        </ul>
        <h3>导出步骤</h3>
        <ol>
          <li>进入对应的数据列表页面</li>
          <li>设置筛选条件（可选）</li>
          <li>点击"导出"按钮</li>
          <li>选择导出字段</li>
          <li>下载Excel文件</li>
        </ol>
      `
    },
    custom: {
      title: '自定义报表',
      content: `
        <h2>自定义报表</h2>
        <p>根据业务需求创建个性化报表。</p>
        <h3>创建报表</h3>
        <ol>
          <li>进入"数据报表" > "自定义报表"</li>
          <li>点击"新建报表"</li>
          <li>选择数据源</li>
          <li>配置统计维度和指标</li>
          <li>设置图表类型</li>
          <li>保存报表</li>
        </ol>
      `
    }
  },
  system: {
    user: {
      title: '用户管理',
      content: `
        <h2>用户管理</h2>
        <h3>添加用户</h3>
        <ol>
          <li>进入"系统设置" > "用户管理"</li>
          <li>点击"添加用户"</li>
          <li>填写用户信息</li>
          <li>选择所属部门</li>
          <li>分配角色权限</li>
          <li>保存</li>
        </ol>
        <h3>用户状态</h3>
        <ul>
          <li>启用 - 正常使用</li>
          <li>禁用 - 暂停使用，保留数据</li>
          <li>删除 - 移除用户</li>
        </ul>
      `
    },
    role: {
      title: '角色权限',
      content: `
        <h2>角色权限管理</h2>
        <p>通过角色来管理用户的功能权限。</p>
        <h3>预置角色</h3>
        <ul>
          <li>超级管理员 - 所有权限</li>
          <li>销售经理 - 团队管理权限</li>
          <li>销售员 - 基础销售权限</li>
          <li>财务 - 财务相关权限</li>
        </ul>
        <h3>自定义角色</h3>
        <ol>
          <li>点击"添加角色"</li>
          <li>输入角色名称</li>
          <li>勾选需要的权限</li>
          <li>保存角色</li>
        </ol>
      `
    },
    dept: {
      title: '部门设置',
      content: `
        <h2>部门管理</h2>
        <h3>创建部门</h3>
        <ol>
          <li>进入"系统设置" > "部门管理"</li>
          <li>点击"添加部门"</li>
          <li>输入部门名称</li>
          <li>选择上级部门（可选）</li>
          <li>设置部门负责人</li>
          <li>保存</li>
        </ol>
        <h3>部门层级</h3>
        <p>支持多级部门结构，如：公司 > 销售部 > 销售一组</p>
      `
    },
    config: {
      title: '系统配置',
      content: `
        <h2>系统配置</h2>
        <h3>基础配置</h3>
        <ul>
          <li>企业名称和Logo</li>
          <li>系统名称</li>
          <li>联系方式</li>
        </ul>
        <h3>业务配置</h3>
        <ul>
          <li>客户回收规则</li>
          <li>订单审核流程</li>
          <li>提醒通知设置</li>
        </ul>
      `
    }
  },
  deploy: {
    require: {
      title: '环境要求',
      content: `
        <h2>私有部署环境要求</h2>
        <h3>服务器配置</h3>
        <table>
          <tr><th>配置项</th><th>最低要求</th><th>推荐配置</th></tr>
          <tr><td>CPU</td><td>2核</td><td>4核及以上</td></tr>
          <tr><td>内存</td><td>4GB</td><td>8GB及以上</td></tr>
          <tr><td>硬盘</td><td>50GB</td><td>100GB SSD</td></tr>
          <tr><td>带宽</td><td>5Mbps</td><td>10Mbps及以上</td></tr>
        </table>
        <h3>软件环境</h3>
        <ul>
          <li>操作系统：CentOS 7+ / Ubuntu 18.04+</li>
          <li>数据库：MySQL 5.7+ / MySQL 8.0</li>
          <li>Node.js：16.x 或更高版本</li>
          <li>Nginx：1.18+</li>
        </ul>
      `
    },
    install: {
      title: '安装指南',
      content: `
        <h2>安装步骤</h2>
        <h3>1. 准备工作</h3>
        <ul>
          <li>准备符合要求的服务器</li>
          <li>安装必要的软件环境</li>
          <li>获取安装包和授权码</li>
        </ul>
        <h3>2. 安装数据库</h3>
        <pre><code>mysql -u root -p < database.sql</code></pre>
        <h3>3. 配置应用</h3>
        <ol>
          <li>解压安装包</li>
          <li>修改配置文件</li>
          <li>配置数据库连接</li>
        </ol>
        <h3>4. 启动服务</h3>
        <pre><code>npm run start</code></pre>
        <h3>5. 配置Nginx</h3>
        <p>配置反向代理，将域名指向应用端口。</p>
      `
    },
    configure: {
      title: '配置说明',
      content: `
        <h2>配置文件说明</h2>
        <h3>数据库配置</h3>
        <pre><code>DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=crm</code></pre>
        <h3>应用配置</h3>
        <pre><code>APP_PORT=3000
APP_SECRET=your_secret_key
APP_URL=https://your-domain.com</code></pre>
        <h3>存储配置</h3>
        <p>支持本地存储和云存储（阿里云OSS、腾讯云COS）。</p>
      `
    },
    faq: {
      title: '常见问题',
      content: `
        <h2>常见问题</h2>
        <h3>Q: 如何升级系统？</h3>
        <p>A: 下载最新版本安装包，备份数据库后执行升级脚本。</p>
        <h3>Q: 忘记管理员密码怎么办？</h3>
        <p>A: 可以通过数据库重置密码，或联系技术支持。</p>
        <h3>Q: 如何备份数据？</h3>
        <p>A: 建议定期备份数据库和上传文件目录，可配置自动备份。</p>
        <h3>Q: 系统运行缓慢怎么办？</h3>
        <p>A: 检查服务器资源使用情况，优化数据库索引，考虑升级服务器配置。</p>
      `
    }
  }
}

const currentCategory = computed(() => route.params.category as string || 'start')
const currentDoc = computed(() => route.params.doc as string || 'intro')

const currentCategoryTitle = computed(() => {
  const cat = docCategories.find(c => c.key === currentCategory.value)
  return cat?.title || ''
})

const currentDocTitle = computed(() => {
  const content = docContents[currentCategory.value]?.[currentDoc.value]
  return content?.title || ''
})

const currentDocContent = computed(() => {
  const content = docContents[currentCategory.value]?.[currentDoc.value]
  return content?.content || '<p>文档内容加载中...</p>'
})
</script>

<style lang="scss" scoped>
.doc-detail-page {
  padding-top: 80px;
  min-height: 100vh;
  background: #f8fafc;
}

.doc-layout {
  display: grid;
  grid-template-columns: 280px 1fr;
  max-width: 1400px;
  margin: 0 auto;
}

.doc-sidebar {
  background: white;
  border-right: 1px solid var(--border);
  height: calc(100vh - 80px);
  position: sticky;
  top: 80px;
  overflow-y: auto;
}

.sidebar-header {
  padding: 20px;
  border-bottom: 1px solid var(--border);
}

.back-link {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--text-secondary);
  font-size: 14px;
  transition: color 0.2s;

  svg {
    width: 18px;
    height: 18px;
  }

  &:hover {
    color: var(--primary);
  }
}

.sidebar-nav {
  padding: 16px 0;
}

.nav-category {
  padding: 0 20px;
  margin-bottom: 24px;

  h4 {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-muted);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 12px;
  }

  ul {
    list-style: none;

    li a {
      display: block;
      padding: 8px 12px;
      font-size: 14px;
      color: var(--text-secondary);
      border-radius: 6px;
      transition: all 0.2s;

      &:hover {
        background: var(--bg-light);
        color: var(--primary);
      }

      &.active {
        background: rgba(99, 102, 241, 0.1);
        color: var(--primary);
        font-weight: 500;
      }
    }
  }
}

.doc-main {
  padding: 40px 60px;
  max-width: 900px;
}

.doc-article {
  background: white;
  border-radius: 12px;
  padding: 48px;
  box-shadow: var(--shadow-sm);
}

.doc-header {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--border);

  h1 {
    font-size: 32px;
    font-weight: 700;
    margin: 12px 0 8px;
  }
}

.doc-category-tag {
  display: inline-block;
  padding: 4px 12px;
  background: rgba(99, 102, 241, 0.1);
  color: var(--primary);
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
}

.doc-meta {
  font-size: 14px;
  color: var(--text-muted);
}

.doc-content {
  line-height: 1.8;
  color: var(--text-secondary);

  :deep(h2) {
    font-size: 24px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 32px 0 16px;

    &:first-child {
      margin-top: 0;
    }
  }

  :deep(h3) {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin: 24px 0 12px;
  }

  :deep(p) {
    margin-bottom: 16px;
  }

  :deep(ul), :deep(ol) {
    margin-bottom: 16px;
    padding-left: 24px;

    li {
      margin-bottom: 8px;
    }
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    margin: 16px 0;

    th, td {
      padding: 12px;
      border: 1px solid var(--border);
      text-align: left;
    }

    th {
      background: var(--bg-light);
      font-weight: 600;
    }
  }

  :deep(pre) {
    background: #1e293b;
    color: #e2e8f0;
    padding: 16px;
    border-radius: 8px;
    overflow-x: auto;
    margin: 16px 0;

    code {
      font-family: 'Fira Code', monospace;
      font-size: 14px;
    }
  }

  :deep(.tip) {
    background: #fef3c7;
    border-left: 4px solid #f59e0b;
    padding: 12px 16px;
    border-radius: 0 8px 8px 0;
    margin: 16px 0;
  }
}

@media (max-width: 1024px) {
  .doc-layout {
    grid-template-columns: 1fr;
  }

  .doc-sidebar {
    display: none;
  }

  .doc-main {
    padding: 24px;
  }

  .doc-article {
    padding: 24px;
  }
}
</style>
