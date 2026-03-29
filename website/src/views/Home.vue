<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-bg">
        <div class="hero-gradient"></div>
        <div class="hero-grid"></div>
        <div class="hero-shapes">
          <div class="shape shape-1"></div>
          <div class="shape shape-2"></div>
          <div class="shape shape-3"></div>
        </div>
      </div>

      <div class="container hero-content">
        <div class="hero-text">
          <div class="hero-badge">
            <span class="badge-icon">🚀</span>
            <span>全新升级 · 更智能的销售管理</span>
          </div>
          <h1>
            让销售管理<br>
            <span class="gradient-text">更简单、更高效</span>
          </h1>
          <p class="hero-desc">
            云客CRM是一款专为销售团队打造的智能客户关系管理系统，
            集客户管理、订单处理、业绩分析、物流跟踪于一体，
            助力企业实现销售业绩持续增长。
          </p>
          <div class="hero-actions">
            <a :href="wechatServiceUrl" target="_blank" class="btn btn-primary btn-lg">
              <span>免费试用 7 天</span>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M5 12h14M12 5l7 7-7 7"/>
              </svg>
            </a>
            <a href="javascript:;" class="btn btn-white btn-lg" @click="showVideoModal = true">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="5,3 19,12 5,21"/>
              </svg>
              <span>观看演示</span>
            </a>
          </div>
          <div class="hero-stats">
            <div class="stat-item">
              <span class="stat-value">10,000+</span>
              <span class="stat-label">企业用户</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">500万+</span>
              <span class="stat-label">客户数据</span>
            </div>
            <div class="stat-divider"></div>
            <div class="stat-item">
              <span class="stat-value">99.9%</span>
              <span class="stat-label">系统稳定性</span>
            </div>
          </div>
        </div>

        <div class="hero-visual">
          <div class="dashboard-screenshot" @click="openPreview('/images/dashboard.png')">
            <div class="screenshot-frame">
              <div class="frame-header">
                <div class="frame-dots">
                  <span></span><span></span><span></span>
                </div>
                <span class="frame-title">云客CRM - 工作台</span>
              </div>
              <img src="/images/dashboard.png" alt="云客CRM工作台" class="screenshot-img" />
            </div>
            <div class="screenshot-overlay">
              <span class="overlay-icon">🔍</span>
              <span>点击查看大图</span>
            </div>
          </div>
          <!-- 浮动卡片 -->
          <div class="float-card card-1">
            <div class="float-icon">📈</div>
            <div class="float-info">
              <span class="float-value">+23.5%</span>
              <span class="float-label">业绩增长</span>
            </div>
          </div>
          <div class="float-card card-2">
            <div class="float-icon">✅</div>
            <div class="float-info">
              <span class="float-value">98.6%</span>
              <span class="float-label">客户满意度</span>
            </div>
          </div>
        </div>

    <!-- 图片预览弹窗 -->
    <ImagePreview v-model:visible="previewVisible" :src="previewImage" />

    <!-- 视频播放弹窗 -->
    <Teleport to="body">
      <div v-if="showVideoModal" class="video-modal" @click="closeVideoModal">
        <div class="video-content" @click.stop>
          <button class="close-btn" @click="closeVideoModal">✕</button>
          <div class="video-wrapper">
            <video
              ref="videoRef"
              controls
              autoplay
              :poster="videoPoster"
            >
              <source :src="videoSrc" type="video/mp4">
              您的浏览器不支持视频播放
            </video>
          </div>
          <p class="video-tip">云客CRM 产品演示视频</p>
        </div>
      </div>
    </Teleport>
      </div>
    </section>

    <!-- 客户Logo展示 -->
    <section class="clients-section">
      <div class="container">
        <p class="clients-title">深受 10,000+ 企业信赖</p>
        <div class="clients-logos">
          <div class="logo-item">科技公司A</div>
          <div class="logo-item">电商平台B</div>
          <div class="logo-item">金融集团C</div>
          <div class="logo-item">教育机构D</div>
          <div class="logo-item">医疗企业E</div>
          <div class="logo-item">制造业F</div>
        </div>
      </div>
    </section>

    <!-- 核心功能 -->
    <section class="features-section">
      <div class="container">
        <div class="section-title">
          <h2>强大的<span>核心功能</span></h2>
          <p>一站式解决销售管理全流程，让团队效率提升300%</p>
        </div>

        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                <circle cx="9" cy="7" r="4"/>
                <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
              </svg>
            </div>
            <h3>客户管理</h3>
            <p>360°客户视图，完整记录客户信息、跟进历史、交易记录，智能客户分级，精准营销</p>
            <ul class="feature-list">
              <li>客户信息全景展示</li>
              <li>智能客户分配</li>
              <li>跟进提醒自动化</li>
              <li>客户标签管理</li>
            </ul>
          </div>

          <div class="feature-card">
            <div class="feature-icon green">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
            </div>
            <h3>订单管理</h3>
            <p>从下单到发货全流程管理，支持多状态流转、订单审核、批量操作，提升处理效率</p>
            <ul class="feature-list">
              <li>订单全流程追踪</li>
              <li>多级审核机制</li>
              <li>批量发货处理</li>
              <li>退换货管理</li>
            </ul>
          </div>

          <div class="feature-card">
            <div class="feature-icon purple">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="12" y1="20" x2="12" y2="10"/>
                <line x1="18" y1="20" x2="18" y2="4"/>
                <line x1="6" y1="20" x2="6" y2="16"/>
              </svg>
            </div>
            <h3>业绩分析</h3>
            <p>实时业绩看板，多维度数据分析，个人/团队业绩排名，助力科学决策</p>
            <ul class="feature-list">
              <li>实时业绩统计</li>
              <li>团队排名对比</li>
              <li>趋势分析图表</li>
              <li>自动报表生成</li>
            </ul>
          </div>

          <div class="feature-card">
            <div class="feature-icon orange">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                <circle cx="12" cy="10" r="3"/>
              </svg>
            </div>
            <h3>物流跟踪</h3>
            <p>对接主流快递公司，实时物流轨迹查询，异常件自动预警，提升客户体验</p>
            <ul class="feature-list">
              <li>多快递公司对接</li>
              <li>实时轨迹查询</li>
              <li>异常件预警</li>
              <li>签收自动确认</li>
            </ul>
          </div>

          <div class="feature-card">
            <div class="feature-icon pink">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
              </svg>
            </div>
            <h3>电销外呼</h3>
            <p>集成云呼叫中心，一键外呼、通话录音、智能质检，提升电销团队效率</p>
            <ul class="feature-list">
              <li>一键拨号外呼</li>
              <li>通话录音存储</li>
              <li>来电弹屏提醒</li>
              <li>通话数据统计</li>
            </ul>
          </div>

          <div class="feature-card">
            <div class="feature-icon teal">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
                <line x1="3" y1="9" x2="21" y2="9"/>
                <line x1="9" y1="21" x2="9" y2="9"/>
              </svg>
            </div>
            <h3>系统管理</h3>
            <p>灵活的权限配置，角色管理、部门架构、操作日志，保障数据安全</p>
            <ul class="feature-list">
              <li>角色权限管理</li>
              <li>部门组织架构</li>
              <li>操作日志审计</li>
              <li>数据备份恢复</li>
            </ul>
          </div>
        </div>
      </div>
    </section>

    <!-- 产品优势 -->
    <section class="advantages-section">
      <div class="container">
        <div class="section-title">
          <h2>为什么选择<span>云客CRM</span></h2>
          <p>专业、稳定、易用，让销售管理变得简单</p>
        </div>

        <div class="advantages-grid">
          <div class="advantage-item">
            <div class="advantage-number">01</div>
            <h3>开箱即用</h3>
            <p>无需复杂配置，注册即可使用，5分钟快速上手，降低学习成本</p>
          </div>
          <div class="advantage-item">
            <div class="advantage-number">02</div>
            <h3>数据安全</h3>
            <p>银行级数据加密，多重备份机制，权限精细控制，保障企业数据安全</p>
          </div>
          <div class="advantage-item">
            <div class="advantage-number">03</div>
            <h3>灵活部署</h3>
            <p>支持SaaS云端和私有部署两种模式，满足不同企业的安全合规需求</p>
          </div>
          <div class="advantage-item">
            <div class="advantage-number">04</div>
            <h3>持续更新</h3>
            <p>产品团队持续迭代，每月发布新功能，紧跟行业发展趋势</p>
          </div>
          <div class="advantage-item">
            <div class="advantage-number">05</div>
            <h3>专业服务</h3>
            <p>7×24小时技术支持，专属客户成功经理，助力企业成功</p>
          </div>
          <div class="advantage-item">
            <div class="advantage-number">06</div>
            <h3>性价比高</h3>
            <p>灵活的定价方案，按需付费，中小企业也能用得起的专业CRM</p>
          </div>
        </div>
      </div>
    </section>

    <!-- 版本对比 -->
    <section class="versions-section">
      <div class="container">
        <div class="section-title">
          <h2>选择适合您的<span>版本</span></h2>
          <p>SaaS云端版即开即用，私有部署版数据自主可控</p>
        </div>

        <div class="versions-compare">
          <div class="version-card saas">
            <div class="version-badge">推荐</div>
            <div class="version-icon">☁️</div>
            <h3>SaaS 云端版</h3>
            <p class="version-desc">无需服务器，即开即用，适合快速启动的团队</p>
            <div class="version-price">
              <span class="price-from">¥99</span>
              <span class="price-unit">/月起</span>
            </div>
            <ul class="version-features">
              <li>✓ 云端托管，免运维</li>
              <li>✓ 自动升级，享受最新功能</li>
              <li>✓ 弹性扩容，按需付费</li>
              <li>✓ 多端同步，随时随地办公</li>
              <li>✓ 数据自动备份</li>
            </ul>
            <router-link to="/pricing" class="btn btn-primary">查看套餐详情</router-link>
          </div>

          <div class="version-card private">
            <div class="version-icon">🏢</div>
            <h3>私有部署版</h3>
            <p class="version-desc">部署在您自己的服务器，数据完全自主可控</p>
            <div class="version-price">
              <span class="price-from">¥9,800</span>
              <span class="price-unit">起</span>
            </div>
            <ul class="version-features">
              <li>✓ 数据本地存储，完全可控</li>
              <li>✓ 永久授权，一次购买</li>
              <li>✓ 支持定制开发</li>
              <li>✓ 可对接内部系统</li>
              <li>✓ 专属技术支持</li>
            </ul>
            <router-link to="/pricing" class="btn btn-outline">了解更多</router-link>
          </div>
        </div>
      </div>
    </section>

    <!-- 客户评价 -->
    <section class="testimonials-section">
      <div class="container">
        <div class="section-title">
          <h2>客户<span>真实评价</span></h2>
          <p>听听他们怎么说</p>
        </div>

        <div class="testimonials-grid">
          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"使用云客CRM后，我们的销售团队效率提升了50%，客户跟进再也不会遗漏，业绩增长明显。"</p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">张</div>
              <div class="author-info">
                <span class="author-name">张总监</span>
                <span class="author-company">某电商公司 · 销售总监</span>
              </div>
            </div>
          </div>

          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"系统很好用，界面简洁，功能齐全。特别是物流跟踪功能，帮我们节省了大量人工查询时间。"</p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">李</div>
              <div class="author-info">
                <span class="author-name">李经理</span>
                <span class="author-company">某贸易公司 · 运营经理</span>
              </div>
            </div>
          </div>

          <div class="testimonial-card">
            <div class="testimonial-content">
              <p>"私有部署版本满足了我们对数据安全的要求，技术支持响应很快，问题都能及时解决。"</p>
            </div>
            <div class="testimonial-author">
              <div class="author-avatar">王</div>
              <div class="author-info">
                <span class="author-name">王总</span>
                <span class="author-company">某金融公司 · CEO</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="cta-section">
      <div class="container">
        <div class="cta-content">
          <h2>准备好提升您的销售业绩了吗？</h2>
          <p>立即联系我们，体验智能销售管理的魅力</p>
          <div class="cta-actions">
            <a :href="wechatServiceUrl" target="_blank" class="btn btn-white btn-lg">
              免费试用 7 天
            </a>
            <a :href="wechatServiceUrl" target="_blank" class="btn btn-outline-white btn-lg">
              预约演示
            </a>
          </div>
          <p class="cta-note">联系客服 · 快速开通 · 专业服务支持</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import ImagePreview from '@/components/ImagePreview.vue'

const previewVisible = ref(false)
const previewImage = ref('')
const showVideoModal = ref(false)
const videoRef = ref<HTMLVideoElement | null>(null)

// 视频配置 - 录制好视频后放到 website/public/videos/demo.mp4
const videoSrc = '/videos/demo.mp4'
const videoPoster = '/images/dashboard.png'

// 微信客服链接
const wechatServiceUrl = 'https://work.weixin.qq.com/kfid/kfc461ca9f5b45c8d25'

const openPreview = (src: string) => {
  previewImage.value = src
  previewVisible.value = true
  document.body.style.overflow = 'hidden'
}

const closeVideoModal = () => {
  showVideoModal.value = false
  document.body.style.overflow = ''
  // 停止视频播放
  if (videoRef.value) {
    videoRef.value.pause()
  }
}

// ESC 键关闭视频弹窗
const handleKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Escape' && showVideoModal.value) {
    closeVideoModal()
  }
}

onMounted(() => {
  window.addEventListener('keydown', handleKeydown)
})

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeydown)
})
</script>

<style lang="scss" scoped>
// Hero Section
.hero {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  padding: 120px 0 80px;
  overflow: hidden;
}

.hero-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero-gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, #f5f3ff 0%, #ede9fe 30%, #e0f2fe 70%, #f0fdf4 100%);
}

.hero-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(rgba(99, 102, 241, 0.03) 1px, transparent 1px),
    linear-gradient(90deg, rgba(99, 102, 241, 0.03) 1px, transparent 1px);
  background-size: 50px 50px;
}

.hero-shapes {
  position: absolute;
  inset: 0;
  overflow: hidden;

  .shape {
    position: absolute;
    border-radius: 50%;
    filter: blur(60px);
    opacity: 0.5;
  }

  .shape-1 {
    width: 400px;
    height: 400px;
    background: rgba(99, 102, 241, 0.3);
    top: -100px;
    right: 10%;
    animation: float 8s ease-in-out infinite;
  }

  .shape-2 {
    width: 300px;
    height: 300px;
    background: rgba(16, 185, 129, 0.2);
    bottom: 10%;
    left: 5%;
    animation: float 10s ease-in-out infinite 2s;
  }

  .shape-3 {
    width: 200px;
    height: 200px;
    background: rgba(236, 72, 153, 0.2);
    top: 40%;
    left: 30%;
    animation: float 12s ease-in-out infinite 4s;
  }
}

.hero-content {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 60px;
  align-items: center;
}

.hero-badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: white;
  border-radius: 30px;
  box-shadow: var(--shadow);
  margin-bottom: 24px;
  font-size: 14px;
  color: var(--text-secondary);

  .badge-icon {
    font-size: 16px;
  }
}

.hero-text h1 {
  font-size: 56px;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-primary);
  margin-bottom: 24px;
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.hero-desc {
  font-size: 18px;
  line-height: 1.8;
  color: var(--text-secondary);
  margin-bottom: 32px;
  max-width: 500px;
}

.hero-actions {
  display: flex;
  gap: 16px;
  margin-bottom: 48px;
}

.hero-stats {
  display: flex;
  align-items: center;
  gap: 32px;
}

.stat-item {
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 28px;
  font-weight: 700;
  color: var(--text-primary);
}

.stat-label {
  font-size: 14px;
  color: var(--text-muted);
}

.stat-divider {
  width: 1px;
  height: 40px;
  background: var(--border);
}
</style>

<style lang="scss" scoped>
// Hero Visual
.hero-visual {
  position: relative;
}

.dashboard-screenshot {
  position: relative;
  cursor: pointer;
  transition: transform 0.4s ease;

  &:hover {
    transform: scale(1.02);

    .screenshot-overlay {
      opacity: 1;
    }
  }
}

.screenshot-frame {
  background: white;
  border-radius: 20px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.2);
  overflow: hidden;
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.5s ease;

  &:hover {
    transform: perspective(1000px) rotateY(-2deg) rotateX(2deg);
  }
}

.frame-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 18px;
  background: linear-gradient(180deg, #f8fafc 0%, #f1f5f9 100%);
  border-bottom: 1px solid var(--border);
}

.frame-dots {
  display: flex;
  gap: 7px;

  span {
    width: 12px;
    height: 12px;
    border-radius: 50%;

    &:nth-child(1) { background: #ef4444; }
    &:nth-child(2) { background: #f59e0b; }
    &:nth-child(3) { background: #10b981; }
  }
}

.frame-title {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  flex: 1;
  text-align: center;
  margin-right: 50px;
}

.screenshot-img {
  width: 100%;
  height: auto;
  display: block;
}

.screenshot-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 60%, rgba(99, 102, 241, 0.9) 100%);
  border-radius: 20px;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 24px;
  gap: 8px;
  opacity: 0;
  transition: opacity 0.3s ease;
  color: white;
  font-size: 14px;
  font-weight: 500;

  .overlay-icon {
    font-size: 18px;
  }
}

.dashboard-preview {
  background: white;
  border-radius: 16px;
  box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.15);
  overflow: hidden;
  transform: perspective(1000px) rotateY(-5deg) rotateX(5deg);
  transition: transform 0.5s ease;

  &:hover {
    transform: perspective(1000px) rotateY(0) rotateX(0);
  }
}

.preview-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
  background: #f8fafc;
  border-bottom: 1px solid var(--border);
}

.preview-dots {
  display: flex;
  gap: 6px;

  span {
    width: 10px;
    height: 10px;
    border-radius: 50%;

    &:nth-child(1) { background: #ef4444; }
    &:nth-child(2) { background: #f59e0b; }
    &:nth-child(3) { background: #10b981; }
  }
}

.preview-title {
  font-size: 12px;
  color: var(--text-muted);
}

.preview-content {
  display: flex;
  min-height: 300px;
}

.preview-sidebar {
  width: 60px;
  background: #1e293b;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sidebar-item {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.1);

  &.active {
    background: var(--primary);
  }
}

.preview-main {
  flex: 1;
  padding: 20px;
  background: #f8fafc;
}

.preview-cards {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
  margin-bottom: 20px;
}

.mini-card {
  background: white;
  border-radius: 10px;
  padding: 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: var(--shadow-sm);

  .card-icon {
    font-size: 24px;
  }

  .card-value {
    display: block;
    font-size: 16px;
    font-weight: 700;
    color: var(--text-primary);
  }

  .card-label {
    font-size: 11px;
    color: var(--text-muted);
  }
}

.preview-chart {
  background: white;
  border-radius: 10px;
  padding: 20px;
  box-shadow: var(--shadow-sm);
}

.chart-bars {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  height: 100px;
}

.bar {
  flex: 1;
  background: linear-gradient(180deg, var(--primary) 0%, var(--primary-light) 100%);
  border-radius: 4px 4px 0 0;
  transition: height 0.5s ease;
}

.float-card {
  position: absolute;
  background: white;
  border-radius: 12px;
  padding: 16px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: var(--shadow-lg);
  animation: float 4s ease-in-out infinite;

  &.card-1 {
    top: 20px;
    right: -20px;
    animation-delay: 0s;
  }

  &.card-2 {
    bottom: 40px;
    left: -30px;
    animation-delay: 2s;
  }

  .float-icon {
    font-size: 28px;
  }

  .float-value {
    display: block;
    font-size: 18px;
    font-weight: 700;
    color: var(--success);
  }

  .float-label {
    font-size: 12px;
    color: var(--text-muted);
  }
}

// Clients Section
.clients-section {
  padding: 60px 0;
  background: white;
  border-bottom: 1px solid var(--border);
}

.clients-title {
  text-align: center;
  font-size: 14px;
  color: var(--text-muted);
  margin-bottom: 30px;
}

.clients-logos {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 60px;
  flex-wrap: wrap;
}

.logo-item {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-muted);
  opacity: 0.6;
  transition: opacity 0.3s ease;

  &:hover {
    opacity: 1;
  }
}
</style>

<style lang="scss" scoped>
// Features Section
.features-section {
  padding: var(--section-padding);
  background: var(--bg-light);
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.feature-card {
  background: white;
  border-radius: var(--radius-lg);
  padding: 36px;
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
  }

  h3 {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  > p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
    margin-bottom: 20px;
  }
}

.feature-icon {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;

  svg {
    width: 28px;
    height: 28px;
  }

  &.blue { background: rgba(99, 102, 241, 0.1); color: var(--primary); }
  &.green { background: rgba(16, 185, 129, 0.1); color: var(--success); }
  &.purple { background: rgba(139, 92, 246, 0.1); color: #8b5cf6; }
  &.orange { background: rgba(245, 158, 11, 0.1); color: var(--warning); }
  &.pink { background: rgba(236, 72, 153, 0.1); color: #ec4899; }
  &.teal { background: rgba(20, 184, 166, 0.1); color: #14b8a6; }
}

.feature-list {
  list-style: none;

  li {
    font-size: 13px;
    color: var(--text-secondary);
    padding: 6px 0;
    padding-left: 20px;
    position: relative;

    &::before {
      content: '✓';
      position: absolute;
      left: 0;
      color: var(--success);
      font-weight: bold;
    }
  }
}

// Advantages Section
.advantages-section {
  padding: var(--section-padding);
  background: white;
}

.advantages-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 40px;
}

.advantage-item {
  text-align: center;
  padding: 20px;

  h3 {
    font-size: 18px;
    font-weight: 600;
    color: var(--text-primary);
    margin-bottom: 12px;
  }

  p {
    font-size: 14px;
    color: var(--text-secondary);
    line-height: 1.7;
  }
}

.advantage-number {
  font-size: 48px;
  font-weight: 800;
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  opacity: 0.3;
  margin-bottom: 16px;
}

// Versions Section
.versions-section {
  padding: var(--section-padding);
  background: linear-gradient(180deg, #f8fafc 0%, #eef2ff 100%);
}

.versions-compare {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 40px;
  max-width: 900px;
  margin: 0 auto;
}

.version-card {
  background: white;
  border-radius: var(--radius-xl);
  padding: 48px 40px;
  text-align: center;
  position: relative;
  box-shadow: var(--shadow);
  transition: all 0.3s ease;

  &:hover {
    transform: translateY(-8px);
    box-shadow: var(--shadow-xl);
  }

  &.saas {
    border: 2px solid var(--primary);
  }

  h3 {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 12px;
  }
}

.version-badge {
  position: absolute;
  top: -12px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--gradient-primary);
  color: white;
  padding: 6px 20px;
  border-radius: 20px;
  font-size: 13px;
  font-weight: 600;
}

.version-icon {
  font-size: 48px;
  margin-bottom: 20px;
}

.version-desc {
  font-size: 14px;
  color: var(--text-secondary);
  margin-bottom: 24px;
}

.version-price {
  margin-bottom: 32px;

  .price-from {
    font-size: 42px;
    font-weight: 800;
    color: var(--text-primary);
  }

  .price-unit {
    font-size: 16px;
    color: var(--text-muted);
  }
}

.version-features {
  list-style: none;
  text-align: left;
  margin-bottom: 32px;

  li {
    padding: 10px 0;
    font-size: 14px;
    color: var(--text-secondary);
    border-bottom: 1px solid var(--border);

    &:last-child {
      border-bottom: none;
    }
  }
}
</style>

<style lang="scss" scoped>
// Testimonials Section
.testimonials-section {
  padding: var(--section-padding);
  background: white;
}

.testimonials-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 30px;
}

.testimonial-card {
  background: var(--bg-light);
  border-radius: var(--radius-lg);
  padding: 32px;
  transition: all 0.3s ease;

  &:hover {
    background: white;
    box-shadow: var(--shadow-lg);
  }
}

.testimonial-content {
  margin-bottom: 24px;

  p {
    font-size: 15px;
    line-height: 1.8;
    color: var(--text-secondary);
    font-style: italic;
  }
}

.testimonial-author {
  display: flex;
  align-items: center;
  gap: 12px;
}

.author-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--gradient-primary);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  font-weight: 600;
}

.author-name {
  display: block;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.author-company {
  font-size: 13px;
  color: var(--text-muted);
}

// CTA Section
.cta-section {
  padding: 100px 0;
  background: var(--gradient-hero);
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.05'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E");
  }
}

.cta-content {
  position: relative;
  text-align: center;
  color: white;

  h2 {
    font-size: 42px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  > p {
    font-size: 18px;
    opacity: 0.9;
    margin-bottom: 40px;
  }
}

.cta-actions {
  display: flex;
  justify-content: center;
  gap: 20px;
  margin-bottom: 24px;
}

.btn-outline-white {
  border: 2px solid rgba(255, 255, 255, 0.5);
  color: white;
  background: transparent;

  &:hover {
    background: white;
    color: var(--primary);
    border-color: white;
  }
}

.cta-note {
  font-size: 14px;
  opacity: 0.7;
}

// Responsive
@media (max-width: 1024px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-text h1 {
    font-size: 42px;
  }

  .hero-desc {
    margin: 0 auto 32px;
  }

  .hero-actions {
    justify-content: center;
  }

  .hero-stats {
    justify-content: center;
  }

  .hero-visual {
    display: none;
  }

  .features-grid,
  .advantages-grid,
  .testimonials-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .versions-compare {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .hero-text h1 {
    font-size: 32px;
  }

  .hero-actions {
    flex-direction: column;
  }

  .hero-stats {
    flex-direction: column;
    gap: 20px;
  }

  .stat-divider {
    display: none;
  }

  .features-grid,
  .advantages-grid,
  .testimonials-grid {
    grid-template-columns: 1fr;
  }

  .cta-content h2 {
    font-size: 28px;
  }

  .cta-actions {
    flex-direction: column;
    align-items: center;
  }
}

// 视频弹窗样式
.video-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: rgba(0, 0, 0, 0.9);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.video-content {
  position: relative;
  width: 100%;
  max-width: 1000px;
}

.video-wrapper {
  position: relative;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);

  video {
    width: 100%;
    height: auto;
    display: block;
    background: #000;
  }
}

.video-modal .close-btn {
  position: absolute;
  top: -50px;
  right: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  font-size: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: none;
  transition: background 0.2s;

  &:hover {
    background: rgba(255, 255, 255, 0.3);
  }
}

.video-tip {
  text-align: center;
  color: rgba(255, 255, 255, 0.7);
  margin-top: 16px;
  font-size: 14px;
}
</style>
