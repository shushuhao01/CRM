<template>
  <div class="docs-page">
    <section class="page-hero">
      <div class="container">
        <h1>帮助<span class="gradient-text">文档</span></h1>
        <p>快速上手云客CRM，解决您的使用问题</p>
        <div class="search-box">
          <input type="text" placeholder="搜索文档..." v-model="searchQuery" />
          <button>🔍</button>
        </div>
      </div>
    </section>

    <section class="docs-content">
      <div class="container">
        <div class="docs-grid">
          <div class="doc-category">
            <div class="category-icon">🚀</div>
            <h3>快速开始</h3>
            <ul>
              <li><router-link to="/docs/start/intro">系统介绍</router-link></li>
              <li><router-link to="/docs/start/register">注册与登录</router-link></li>
              <li><router-link to="/docs/start/settings">基础设置</router-link></li>
              <li><router-link to="/docs/start/quickstart">5分钟上手指南</router-link></li>
            </ul>
          </div>

          <div class="doc-category">
            <div class="category-icon">👥</div>
            <h3>客户管理</h3>
            <ul>
              <li><router-link to="/docs/customer/add">添加客户</router-link></li>
              <li><router-link to="/docs/customer/follow">客户跟进</router-link></li>
              <li><router-link to="/docs/customer/assign">客户分配</router-link></li>
              <li><router-link to="/docs/customer/pool">公海池管理</router-link></li>
            </ul>
          </div>

          <div class="doc-category">
            <div class="category-icon">📦</div>
            <h3>订单管理</h3>
            <ul>
              <li><router-link to="/docs/order/create">创建订单</router-link></li>
              <li><router-link to="/docs/order/audit">订单审核</router-link></li>
              <li><router-link to="/docs/order/ship">发货管理</router-link></li>
              <li><router-link to="/docs/order/return">退换货处理</router-link></li>
            </ul>
          </div>

          <div class="doc-category">
            <div class="category-icon">📊</div>
            <h3>数据报表</h3>
            <ul>
              <li><router-link to="/docs/report/performance">业绩统计</router-link></li>
              <li><router-link to="/docs/report/ranking">团队排名</router-link></li>
              <li><router-link to="/docs/report/export">数据导出</router-link></li>
              <li><router-link to="/docs/report/custom">自定义报表</router-link></li>
            </ul>
          </div>

          <div class="doc-category">
            <div class="category-icon">⚙️</div>
            <h3>系统设置</h3>
            <ul>
              <li><router-link to="/docs/system/user">用户管理</router-link></li>
              <li><router-link to="/docs/system/role">角色权限</router-link></li>
              <li><router-link to="/docs/system/dept">部门设置</router-link></li>
              <li><router-link to="/docs/system/config">系统配置</router-link></li>
            </ul>
          </div>

          <div class="doc-category">
            <div class="category-icon">🏢</div>
            <h3>私有部署</h3>
            <ul>
              <li><router-link to="/docs/deploy/require">环境要求</router-link></li>
              <li><router-link to="/docs/deploy/install">安装指南</router-link></li>
              <li><router-link to="/docs/deploy/configure">配置说明</router-link></li>
              <li><router-link to="/docs/deploy/faq">常见问题</router-link></li>
            </ul>
          </div>
        </div>

        <div class="help-section">
          <h2>还需要帮助？</h2>
          <p>如果文档没有解决您的问题，请联系我们的技术支持团队</p>
          <div class="help-actions">
            <a :href="wechatServiceUrl" target="_blank" class="help-card">
              <span class="help-icon">💬</span>
              <span class="help-title">在线客服</span>
              <span class="help-desc">工作日 9:00-18:00</span>
            </a>
            <a href="mailto:xianhuquwang@163.com" class="help-card">
              <span class="help-icon">📧</span>
              <span class="help-title">提交工单</span>
              <span class="help-desc">24小时内响应</span>
            </a>
            <a href="tel:13570727364" class="help-card">
              <span class="help-icon">📞</span>
              <span class="help-title">电话支持</span>
              <span class="help-desc">135-7072-7364</span>
            </a>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const searchQuery = ref('')
const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'
</script>

<style lang="scss" scoped>
.docs-page {
  padding-top: 80px;
}

.page-hero {
  padding: 80px 0;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 48px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  p {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: 32px;
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.search-box {
  display: flex;
  max-width: 500px;
  margin: 0 auto;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  overflow: hidden;

  input {
    flex: 1;
    padding: 16px 20px;
    border: none;
    font-size: 16px;
    outline: none;
  }

  button {
    padding: 16px 24px;
    background: var(--primary);
    color: white;
    font-size: 18px;
  }
}

.docs-content {
  padding: 60px 0 100px;
}

.docs-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
  margin-bottom: 80px;
}

.doc-category {
  background: white;
  border-radius: var(--radius-lg);
  padding: 32px;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .category-icon {
    font-size: 36px;
    margin-bottom: 16px;
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    margin-bottom: 20px;
  }

  ul {
    list-style: none;

    li {
      padding: 10px 0;
      border-bottom: 1px solid var(--border);

      &:last-child {
        border-bottom: none;
      }

      a {
        color: var(--text-secondary);
        font-size: 14px;
        transition: color 0.2s ease;

        &:hover {
          color: var(--primary);
        }
      }
    }
  }
}

.help-section {
  text-align: center;
  padding: 60px;
  background: var(--bg-light);
  border-radius: var(--radius-xl);

  h2 {
    font-size: 28px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  > p {
    color: var(--text-secondary);
    margin-bottom: 32px;
  }
}

.help-actions {
  display: flex;
  justify-content: center;
  gap: 24px;
}

.help-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24px 40px;
  background: white;
  border-radius: var(--radius);
  box-shadow: var(--shadow);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-4px);
    box-shadow: var(--shadow-lg);
  }

  .help-icon {
    font-size: 32px;
    margin-bottom: 12px;
  }

  .help-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 4px;
  }

  .help-desc {
    font-size: 13px;
    color: var(--text-muted);
  }
}

@media (max-width: 1024px) {
  .docs-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}

@media (max-width: 640px) {
  .docs-grid {
    grid-template-columns: 1fr;
  }

  .help-actions {
    flex-direction: column;
    align-items: center;
  }

  .page-hero h1 {
    font-size: 36px;
  }
}
</style>
