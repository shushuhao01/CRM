<template>
  <div class="site-manage">
    <el-tabs v-model="activeTab" class="site-tabs">
      <el-tab-pane v-if="hasPerm('website:settings:view')" label="站点设置" name="settings" lazy>
        <SettingsTab />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:articles:view')" label="文章管理" name="articles" lazy>
        <ArticleTab type="article" />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:notices:view')" label="公告管理" name="notices" lazy>
        <ArticleTab type="notice" />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:cases:view')" label="案例管理" name="cases" lazy>
        <CaseTab />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:docs:view')" label="帮助文档" name="docs" lazy>
        <DocTab />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:nav:view')" label="导航菜单" name="nav" lazy>
        <NavTab />
      </el-tab-pane>
      <el-tab-pane v-if="hasPerm('website:stats:view')" label="访问统计" name="stats" lazy>
        <StatsTab />
      </el-tab-pane>
    </el-tabs>

    <el-empty v-if="!hasAnyPerm" description="暂无官网管理权限，请联系管理员分配" />
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useUserStore } from '@/stores/user'
import SettingsTab from './components/SettingsTab.vue'
import ArticleTab from './components/ArticleTab.vue'
import CaseTab from './components/CaseTab.vue'
import DocTab from './components/DocTab.vue'
import NavTab from './components/NavTab.vue'
import StatsTab from './components/StatsTab.vue'

const userStore = useUserStore()

const hasPerm = (code: string) => userStore.hasPermission(code)

const tabNames = ['settings', 'articles', 'notices', 'cases', 'docs', 'nav', 'stats']
const permMap: Record<string, string> = {
  settings: 'website:settings:view',
  articles: 'website:articles:view',
  notices: 'website:notices:view',
  cases: 'website:cases:view',
  docs: 'website:docs:view',
  nav: 'website:nav:view',
  stats: 'website:stats:view'
}

const firstPermitted = tabNames.find(name => hasPerm(permMap[name])) || ''
const activeTab = ref(firstPermitted)
const hasAnyPerm = computed(() => !!firstPermitted)
</script>

<style scoped lang="scss">
.site-manage {
  padding: 16px;
  background: #fff;
  border-radius: 8px;
}

.site-tabs {
  :deep(.el-tabs__content) {
    overflow: visible;
  }
}
</style>
