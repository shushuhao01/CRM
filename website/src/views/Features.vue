<template>
  <div class="features-page">
    <section class="page-hero">
      <div class="container">
        <h1>强大的<span class="gradient-text">功能特性</span></h1>
        <p>一站式销售管理解决方案，覆盖客户管理全流程</p>
      </div>
    </section>

    <section class="features-detail">
      <div class="container">
        <!-- 客户管理 -->
        <div class="feature-block">
          <div class="feature-content">
            <span class="feature-tag">核心功能</span>
            <h2>客户管理</h2>
            <p>360°客户视图，完整记录客户全生命周期信息，智能客户分级，精准营销触达。</p>
            <ul>
              <li>客户信息全景展示，一目了然</li>
              <li>智能客户分配，公平高效</li>
              <li>跟进提醒自动化，不遗漏商机</li>
              <li>客户标签管理，精准分类</li>
              <li>客户分组标签，精细化管理</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-customer.png')">
              <img src="/images/feature-customer.png" alt="客户管理界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 订单管理 -->
        <div class="feature-block reverse">
          <div class="feature-content">
            <span class="feature-tag">核心功能</span>
            <h2>订单管理</h2>
            <p>从下单到发货全流程管理，支持多状态流转、订单审核、批量操作。</p>
            <ul>
              <li>订单全流程追踪，状态实时更新</li>
              <li>多级审核机制，风险可控</li>
              <li>批量发货处理，效率翻倍</li>
              <li>退换货管理，售后无忧</li>
              <li>订单数据分析，洞察趋势</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-order.png')">
              <img src="/images/feature-order.png" alt="订单管理界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 业绩分析 -->
        <div class="feature-block">
          <div class="feature-content">
            <span class="feature-tag">数据分析</span>
            <h2>业绩分析</h2>
            <p>实时业绩看板，多维度数据分析，个人/团队业绩排名，助力科学决策。</p>
            <ul>
              <li>实时业绩统计，数据透明</li>
              <li>团队排名对比，激发斗志</li>
              <li>趋势分析图表，预测未来</li>
              <li>自动报表生成，省时省力</li>
              <li>多维度数据钻取，深度洞察</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-performance.png')">
              <img src="/images/feature-performance.png" alt="业绩分析界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 物流跟踪 -->
        <div class="feature-block reverse">
          <div class="feature-content">
            <span class="feature-tag">增值功能</span>
            <h2>物流跟踪</h2>
            <p>对接主流快递公司，实时物流轨迹查询，异常件自动预警。</p>
            <ul>
              <li>多快递公司对接，一键查询</li>
              <li>实时轨迹更新，全程可视</li>
              <li>异常件智能预警，及时处理</li>
              <li>签收自动确认，闭环管理</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-logistics.png')">
              <img src="/images/feature-logistics.png" alt="物流跟踪界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 电销外呼 -->
        <div class="feature-block">
          <div class="feature-content">
            <span class="feature-tag">增值功能</span>
            <h2>电销外呼</h2>
            <p>集成云呼叫中心，一键外呼、通话录音、智能质检，提升电销效率。</p>
            <ul>
              <li>一键拨号外呼，效率提升</li>
              <li>通话录音存储，质检有据</li>
              <li>来电弹屏提醒，信息同步</li>
              <li>通话数据统计，绩效考核</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-call.png')">
              <img src="/images/feature-call.png" alt="电销外呼界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 系统设置 -->
        <div class="feature-block reverse">
          <div class="feature-content">
            <span class="feature-tag">系统管理</span>
            <h2>系统设置</h2>
            <p>灵活的权限配置，角色管理、部门架构、操作日志，保障数据安全。</p>
            <ul>
              <li>角色权限精细化管理</li>
              <li>部门组织架构配置</li>
              <li>操作日志审计追踪</li>
              <li>数据备份与恢复</li>
              <li>系统参数灵活配置</li>
            </ul>
          </div>
          <div class="feature-image">
            <div class="screenshot-wrapper" @click="openPreview('/images/feature-system.png')">
              <img src="/images/feature-system.png" alt="系统设置界面" />
              <div class="screenshot-overlay">
                <span class="overlay-icon">🔍</span>
                <span>点击查看大图</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-section">
      <div class="container">
        <h2>立即体验全部功能</h2>
        <p>7天免费试用，无需信用卡</p>
        <router-link to="/register?plan=FREE_TRIAL" class="btn btn-white btn-lg">免费试用</router-link>
      </div>
    </section>

    <!-- 图片预览弹窗 -->
    <ImagePreview v-model:visible="previewVisible" :src="previewImage" />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import ImagePreview from '@/components/ImagePreview.vue'

const previewVisible = ref(false)
const previewImage = ref('')

const openPreview = (src: string) => {
  previewImage.value = src
  previewVisible.value = true
}
</script>

<style lang="scss" scoped>
.features-page {
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
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.features-detail {
  padding: 60px 0;
}

.feature-block {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 80px;
  align-items: center;
  padding: 60px 0;

  &.reverse {
    direction: rtl;

    > * {
      direction: ltr;
    }
  }
}

.feature-content {
  .feature-tag {
    display: inline-block;
    padding: 6px 14px;
    background: rgba(99, 102, 241, 0.1);
    color: var(--primary);
    border-radius: 20px;
    font-size: 13px;
    font-weight: 500;
    margin-bottom: 16px;
  }

  h2 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 16px;
  }

  > p {
    font-size: 16px;
    color: var(--text-secondary);
    line-height: 1.8;
    margin-bottom: 24px;
  }

  ul {
    list-style: none;

    li {
      padding: 8px 0;
      padding-left: 28px;
      position: relative;
      color: var(--text-secondary);

      &::before {
        content: '✓';
        position: absolute;
        left: 0;
        color: var(--success);
        font-weight: bold;
      }
    }
  }
}

.feature-image {
  .screenshot-wrapper {
    position: relative;
    border-radius: var(--radius-xl);
    overflow: hidden;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
    cursor: pointer;
    transition: all 0.3s ease;

    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 30px 60px rgba(0, 0, 0, 0.15);

      .screenshot-overlay {
        opacity: 1;
      }
    }

    img {
      width: 100%;
      height: auto;
      display: block;
    }

    .screenshot-overlay {
      position: absolute;
      inset: 0;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 8px;
      opacity: 0;
      transition: opacity 0.3s ease;
      color: white;
      font-size: 14px;

      .overlay-icon {
        font-size: 32px;
      }
    }
  }
}

.cta-section {
  padding: 100px 0;
  background: var(--gradient-hero);
  text-align: center;
  color: white;

  h2 {
    font-size: 36px;
    font-weight: 700;
    margin-bottom: 12px;
  }

  p {
    font-size: 18px;
    opacity: 0.9;
    margin-bottom: 32px;
  }
}

@media (max-width: 1024px) {
  .feature-block {
    grid-template-columns: 1fr;
    gap: 40px;

    &.reverse {
      direction: ltr;
    }
  }

  .page-hero h1 {
    font-size: 36px;
  }
}
</style>
