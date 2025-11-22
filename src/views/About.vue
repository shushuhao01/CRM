<template>
  <div class="about-page">
    <el-card class="about-card">
      <template #header>
        <div class="card-header">
          <h2>关于{{ systemConfig.companyName }}</h2>
        </div>
      </template>

      <div class="about-content">
        <!-- Logo -->
        <div class="logo-section" v-if="systemConfig.systemLogo">
          <img :src="systemConfig.systemLogo" class="company-logo" alt="公司Logo" />
        </div>

        <!-- 系统信息 -->
        <el-descriptions :column="2" border class="info-section">
          <el-descriptions-item label="系统名称">
            {{ systemConfig.systemName }}
          </el-descriptions-item>
          <el-descriptions-item label="系统版本">
            <el-tag size="small" type="info">v{{ systemConfig.systemVersion }}</el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="公司名称">
            {{ systemConfig.companyName }}
          </el-descriptions-item>
          <el-descriptions-item label="联系电话">
            <a :href="`tel:${systemConfig.contactPhone}`" class="contact-link">
              <el-icon><Phone /></el-icon>
              {{ systemConfig.contactPhone }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="联系邮箱">
            <a :href="`mailto:${systemConfig.contactEmail}`" class="contact-link">
              <el-icon><Message /></el-icon>
              {{ systemConfig.contactEmail }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="官方网站">
            <a :href="systemConfig.websiteUrl" target="_blank" class="contact-link">
              <el-icon><Link /></el-icon>
              {{ systemConfig.websiteUrl }}
            </a>
          </el-descriptions-item>
          <el-descriptions-item label="公司地址" :span="2">
            <el-icon><Location /></el-icon>
            {{ systemConfig.companyAddress }}
          </el-descriptions-item>
        </el-descriptions>

        <!-- 系统描述 -->
        <div class="description-section" v-if="systemConfig.systemDescription">
          <h3>系统简介</h3>
          <p>{{ systemConfig.systemDescription }}</p>
        </div>

        <!-- 版权信息 -->
        <div class="copyright-section">
          <el-divider />
          <p class="copyright-text">
            © {{ new Date().getFullYear() }} {{ systemConfig.companyName }}. All rights reserved.
          </p>
          <p class="version-info">
            {{ systemConfig.systemName }} v{{ systemConfig.systemVersion }}
          </p>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { useConfigStore } from '@/stores/config'
import {
  Phone,
  Message,
  Link,
  Location
} from '@element-plus/icons-vue'

// 组件名称
defineOptions({
  name: 'AboutPage'
})

const configStore = useConfigStore()
const systemConfig = configStore.systemConfig
</script>

<style scoped>
.about-page {
  padding: 20px;
  min-height: calc(100vh - 200px);
}

.about-card {
  max-width: 1000px;
  margin: 0 auto;
}

.card-header h2 {
  margin: 0;
  font-size: 20px;
  color: #303133;
}

.about-content {
  padding: 20px 0;
}

.logo-section {
  text-align: center;
  margin-bottom: 30px;
}

.company-logo {
  max-width: 200px;
  max-height: 80px;
  object-fit: contain;
}

.info-section {
  margin-bottom: 30px;
}

.contact-link {
  color: #409eff;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.contact-link:hover {
  text-decoration: underline;
}

.description-section {
  margin-bottom: 30px;
  padding: 20px;
  background: #f5f7fa;
  border-radius: 8px;
}

.description-section h3 {
  margin: 0 0 12px 0;
  font-size: 16px;
  color: #303133;
}

.description-section p {
  margin: 0;
  line-height: 1.8;
  color: #606266;
}

.copyright-section {
  text-align: center;
}

.copyright-text {
  margin: 12px 0 4px 0;
  color: #909399;
  font-size: 13px;
}

.version-info {
  margin: 0;
  color: #c0c4cc;
  font-size: 12px;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .about-page {
    padding: 12px;
  }

  .info-section {
    font-size: 13px;
  }
}
</style>
