<template>
  <div class="feature-compare-page">
    <!-- Hero -->
    <section class="compare-hero">
      <div class="container">
        <h1>功能<span class="gradient-text">特性对比</span></h1>
        <p>全面了解各版本的功能差异，选择最适合您的方案</p>
        <div class="version-toggle">
          <button :class="{ active: currentType === 'saas' }" @click="currentType = 'saas'">
            ☁️ SaaS云端版
          </button>
          <button :class="{ active: currentType === 'private' }" @click="currentType = 'private'">
            🏢 私有部署版
          </button>
          <button :class="{ active: currentType === 'community' }" @click="currentType = 'community'">
            🌐 开源社区版
          </button>
        </div>
      </div>
    </section>

    <!-- 对比表 -->
    <section class="compare-section">
      <div class="container">
        <div v-if="loading" class="loading-state">加载中...</div>
        <div v-else-if="currentPackages.length === 0" class="empty-state">暂无套餐数据</div>
        <div v-else class="compare-table-wrapper">
          <table class="compare-table">
            <!-- 表头：套餐名称行 -->
            <thead>
              <tr>
                <th class="feature-col">功能特性</th>
                <th
                  v-for="pkg in currentPackages"
                  :key="pkg.code"
                  class="pkg-col"
                  :class="{ recommended: pkg.is_recommended }"
                >
                  <div class="pkg-header">
                    <div class="pkg-name">
                      {{ pkg.name }}
                      <span v-if="pkg.is_recommended" class="pkg-tag rec-tag">推荐</span>
                      <span v-if="pkg.is_trial" class="pkg-tag trial-tag">免费</span>
                    </div>
                    <div class="pkg-price">
                      <template v-if="pkg.price === 0">¥0.00<small>/月</small></template>
                      <template v-else-if="pkg.billing_cycle === 'once'">¥{{ pkg.price.toLocaleString() }}</template>
                      <template v-else>¥{{ pkg.price.toLocaleString() }}<small>/月</small></template>
                    </div>
                    <div class="pkg-limit">
                      <template v-if="pkg.user_limit_mode === 'online'">{{ pkg.max_online_seats }}个在线席位</template>
                      <template v-else>{{ pkg.max_users >= 99999 ? '不限用户' : pkg.max_users + '个用户' }}</template>
                      <template v-if="pkg.max_storage_gb > 0"> · {{ pkg.max_storage_gb }}GB</template>
                    </div>
                    <router-link
                      :to="`/register?plan=${pkg.code}`"
                      class="pkg-btn"
                      :class="{ primary: pkg.is_recommended }"
                    >
                      {{ pkg.is_trial ? '免费试用' : pkg.billing_cycle === 'once' ? '立即购买' : '立即订购' }}
                    </router-link>
                    <div v-if="pkg.is_trial" class="trial-note">试用期享有全功能</div>
                  </div>
                </th>
              </tr>
            </thead>
            <!-- 表体：分组特性 -->
            <tbody>
              <template v-for="group in currentGroups" :key="group.name">
                <!-- 分组标题行 -->
                <tr class="group-row">
                  <td :colspan="currentPackages.length + 1" class="group-name">
                    {{ group.name }}
                  </td>
                </tr>
                <!-- 特性行 -->
                <tr v-for="feature in group.features" :key="feature" class="feature-row">
                  <td class="feature-name">{{ feature }}</td>
                  <td
                    v-for="pkg in currentPackages"
                    :key="pkg.code + feature"
                    class="feature-value"
                    :class="{ recommended: pkg.is_recommended }"
                  >
                    <template v-if="getFeatureValue(pkg, feature) === true">
                      <span class="val-yes">✓</span>
                    </template>
                    <template v-else-if="getFeatureValue(pkg, feature) === false">
                      <span class="val-no">—</span>
                    </template>
                    <template v-else>
                      <span class="val-text">{{ getFeatureValue(pkg, feature) }}</span>
                    </template>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <!-- 底部CTA -->
        <div class="compare-cta">
          <p>还有疑问？查看<router-link to="/pricing">价格方案</router-link>或<router-link to="/docs">帮助文档</router-link></p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getPackages, type Package } from '@/api/packages'

const currentType = ref<'saas' | 'private' | 'community'>('saas')
const loading = ref(true)
const packages = ref<Package[]>([])

// SaaS 功能分组定义（与系统实际功能严格对齐）
// 核心CRM功能各版本大体一致，仅在企微管理、批量导入导出、短信额度、移动APP、技术支持等增值服务上区分
const saasGroups = [
  { name: '数据看板', features: ['核心数据仪表盘', '多维度趋势图表'] },
  { name: '客户管理', features: ['客户信息管理', '客户标签与分组', '跟进记录与提醒', '客户全景画像', '数据导入导出', '批量导入Excel', '客户分享转移', '隐私信息脱敏'] },
  { name: '订单管理', features: ['订单创建编辑', '订单审核工作流', '批量审核', '退款管理'] },
  { name: '财务管理', features: ['绩效数据查看', '绩效管理', 'COD代收管理', '增值服务管理', '财务结算报表'] },
  { name: '物流管理', features: ['物流轨迹追踪', '发货管理', '批量发货打单', '寄件人地址管理', '快递公司管理'] },
  { name: '商品管理', features: ['商品列表分类', '库存管理', '库存预警', '虚拟商品卡密', '商品分析报表'] },
  { name: '业绩管理', features: ['个人业绩统计', '团队业绩排行', '佣金阶梯计算', '业绩分析', '业绩分享导出'] },
  { name: '通话管理', features: ['通话记录管理', '通话录音存储', '坐席状态管理', '外呼线路配置', '工作手机绑定'] },
  { name: '短信管理', features: ['短信发送', '短信模板管理', '短信审核统计', '自动发送规则'] },
  { name: '售后管理', features: ['售后工单', '售后统计分析'] },
  { name: '资料管理', features: ['资料列表', '客户查询', '回收站'] },
  { name: '系统管理', features: ['部门用户角色', '权限精细控制', '操作日志审计', '消息管理', '自定义字段'] },
  { name: '企微管理 · 强互动与会话存档质检', features: ['企微客户同步', '客户群管理', '获客助手活码', '企微对外收款', '微信客服', '话术库', '敏感词监控', '企微侧边栏', '会话存档', 'AI智能助手'] },
  { name: '移动端', features: ['H5企微侧边栏(5个内置应用)', '微信小程序(客户自助填写地址)', '移动APP'] },
  { name: '平台能力', features: ['API接口', 'Webhook回调', 'WebSocket推送', '数据批量导出'] },
  { name: '技术支持', features: ['在线文档帮助中心', '邮件工单', '在线客服', '专属技术顾问', '7x24电话远程'] }
]

// 私有部署功能分组定义
const privateGroups = [
  { name: '功能模块', features: ['全部CRM功能模块', '企微完整集成', '通话短信模块'] },
  { name: '源码交付', features: ['完整后端源码', '完整前端源码', '移动APP源码'] },
  { name: '部署支持', features: ['数据100%私有', 'Docker一键部署', '部署文档全套', '远程部署协助', '现场部署支持'] },
  { name: '维护升级', features: ['免费版本升级', '技术支持方式'] },
  { name: '专属服务', features: ['专属技术顾问', '定制开发服务', '源码加密部署', '多服务器集群'] }
]

// 社区版功能分组定义（与私有部署版对比）
const communityGroups = [
  { name: '核心CRM功能', features: ['客户信息管理', '客户标签与分组', '跟进记录与提醒', '客户全景画像', '数据导入导出'] },
  { name: '订单与物流', features: ['订单创建编辑', '物流轨迹追踪', '发货管理', '批量发货打单'] },
  { name: '商品与售后', features: ['商品列表分类', '库存管理', '售后工单'] },
  { name: '数据看板', features: ['核心数据仪表盘', '多维度趋势图表'] },
  { name: '系统管理', features: ['部门用户角色', '消息管理'] },
  { name: '企微集成', features: ['企微客户同步', '客户群管理', '获客助手活码', 'AI智能助手'] },
  { name: '财务与业绩', features: ['财务结算报表', '佣金阶梯计算', '业绩统计分析'] },
  { name: '通话与短信', features: ['通话记录管理', '短信发送'] },
  { name: '平台能力', features: ['API接口', 'WebSocket推送', '数据批量导出'] },
  { name: '部署与支持', features: ['Docker一键部署', '源码交付', '技术支持', '免费版本升级'] }
]

const currentPackages = computed(() => {
  if (currentType.value === 'community') {
    // 社区版对比：显示社区版 + 私有部署版标准版（引导升级）
    const community = packages.value.filter(p => p.type === 'community').sort((a, b) => a.sort_order - b.sort_order)
    const privateStd = packages.value.filter(p => p.type === 'private').sort((a, b) => a.sort_order - b.sort_order).slice(0, 1)
    return [...community, ...privateStd]
  }
  return packages.value.filter(p => p.type === currentType.value).sort((a, b) => a.sort_order - b.sort_order)
})

const currentGroups = computed(() => {
  if (currentType.value === 'community') return communityGroups
  return currentType.value === 'saas' ? saasGroups : privateGroups
})

function getFeatureValue(pkg: Package, featureName: string): boolean | string {
  if (!pkg.feature_details) return false
  const val = pkg.feature_details[featureName]
  if (val === undefined || val === null) return false
  return val
}

onMounted(async () => {
  try {
    packages.value = await getPackages()
  } catch (error) {
    console.error('加载套餐失败:', error)
  } finally {
    loading.value = false
  }
})
</script>

<style lang="scss" scoped>
.feature-compare-page {
  padding-top: 80px;
}

.compare-hero {
  padding: 80px 0 60px;
  text-align: center;
  background: linear-gradient(180deg, #f8fafc 0%, white 100%);

  h1 {
    font-size: 48px;
    font-weight: 700;
    color: var(--text-primary);
    margin-bottom: 16px;
  }

  > .container > p {
    font-size: 18px;
    color: var(--text-secondary);
    margin-bottom: 40px;
  }
}

.gradient-text {
  background: var(--gradient-primary);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.version-toggle {
  display: inline-flex;
  background: white;
  border-radius: 12px;
  padding: 6px;
  box-shadow: var(--shadow);

  button {
    padding: 12px 32px;
    font-size: 15px;
    font-weight: 500;
    color: var(--text-secondary);
    border-radius: 8px;
    transition: all 0.3s ease;
    border: none;
    background: none;
    cursor: pointer;

    &.active {
      background: var(--gradient-primary);
      color: white;
    }
  }
}

.compare-section {
  padding: 40px 0 100px;
}

.loading-state, .empty-state {
  text-align: center;
  padding: 60px;
  color: var(--text-muted);
  font-size: 16px;
}

.compare-table-wrapper {
  overflow-x: auto;
  border-radius: 16px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.06);
  background: white;
}

.compare-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 700px;

  th, td {
    padding: 14px 20px;
    text-align: center;
    border-bottom: 1px solid #f1f5f9;
    font-size: 14px;
  }

  .feature-col {
    text-align: left;
    width: 200px;
    min-width: 180px;
    background: #fafbfc;
    font-weight: 600;
    color: var(--text-primary);
    position: sticky;
    left: 0;
    z-index: 2;
  }

  .pkg-col {
    min-width: 160px;
    vertical-align: top;
    padding: 20px 16px;

    &.recommended {
      background: linear-gradient(180deg, rgba(99, 102, 241, 0.04) 0%, rgba(99, 102, 241, 0.01) 100%);
    }
  }
}

.pkg-header {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.pkg-tag {
  display: inline-block;
  font-size: 10px;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: 8px;
  vertical-align: middle;
  margin-left: 4px;
  white-space: nowrap;
  line-height: 1.4;
}

.rec-tag {
  background: var(--gradient-primary);
  color: white;
}

.trial-tag {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.trial-note {
  font-size: 11px;
  color: #059669;
  background: rgba(16, 185, 129, 0.08);
  padding: 2px 10px;
  border-radius: 6px;
  margin-top: 2px;
}

.pkg-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
}

.pkg-price {
  font-size: 24px;
  font-weight: 700;
  color: var(--primary);

  small {
    font-size: 14px;
    font-weight: 400;
    color: var(--text-muted);
  }
}

.pkg-limit {
  font-size: 12px;
  color: var(--text-muted);
}

.pkg-btn {
  display: inline-block;
  padding: 8px 24px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 600;
  text-decoration: none;
  transition: all 0.2s;
  border: 1.5px solid var(--primary);
  color: var(--primary);
  margin-top: 4px;

  &.primary {
    background: var(--gradient-primary);
    color: white;
    border-color: transparent;
  }

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
  }
}

.group-row {
  .group-name {
    text-align: left;
    font-weight: 700;
    font-size: 15px;
    color: var(--primary);
    background: linear-gradient(90deg, rgba(99, 102, 241, 0.08) 0%, rgba(99, 102, 241, 0.02) 100%);
    padding: 12px 20px;
    border-bottom: 2px solid rgba(99, 102, 241, 0.15);
  }
}

.feature-row {
  .feature-name {
    text-align: left;
    font-weight: 500;
    color: var(--text-secondary);
    background: #fafbfc;
    position: sticky;
    left: 0;
    z-index: 2;
  }

  .feature-value {
    &.recommended {
      background: rgba(99, 102, 241, 0.02);
    }
  }

  &:hover {
    td {
      background: rgba(99, 102, 241, 0.03);
    }
    .feature-name {
      background: #f0f2ff;
    }
  }
}

.val-yes {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
  font-size: 13px;
  font-weight: 700;
}

.val-no {
  color: #cbd5e1;
  font-size: 18px;
}

.val-text {
  display: inline-block;
  padding: 2px 10px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.08), rgba(139, 92, 246, 0.08));
  color: var(--primary);
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
}

.compare-cta {
  text-align: center;
  padding: 40px 0 0;
  font-size: 15px;
  color: var(--text-secondary);

  a {
    color: var(--primary);
    font-weight: 600;
    text-decoration: none;

    &:hover {
      text-decoration: underline;
    }
  }
}

@media (max-width: 768px) {
  .compare-hero h1 {
    font-size: 32px;
  }

  .compare-table {
    .feature-col {
      width: 140px;
      min-width: 140px;
      padding: 10px 12px;
      font-size: 12px;
    }

    .pkg-col {
      min-width: 130px;
      padding: 12px 8px;
    }

    .feature-name {
      font-size: 12px;
      padding: 10px 12px;
    }

    .feature-value {
      padding: 10px 8px;
    }
  }

  .pkg-name {
    font-size: 15px;
  }

  .pkg-price {
    font-size: 18px;
  }
}
</style>
