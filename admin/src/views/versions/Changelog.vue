<template>
  <div class="page-container">
    <el-card shadow="never" class="changelog-card">
      <template #header>
        <div class="card-header">
          <span>更新日志</span>
          <el-select v-model="selectedVersion" placeholder="选择版本" style="width: 150px">
            <el-option v-for="v in versions" :key="v" :label="`v${v}`" :value="v" />
          </el-select>
        </div>
      </template>

      <div class="changelog-list">
        <div v-for="item in changelogs" :key="item.version" class="changelog-item">
          <div class="changelog-header">
            <span class="version">v{{ item.version }}</span>
            <el-tag :type="getTypeTag(item.type)" size="small">{{ item.type }}</el-tag>
            <span class="date">{{ item.date }}</span>
          </div>
          <div class="changelog-content">
            <div v-if="item.features?.length" class="section">
              <h4><el-icon><Star /></el-icon> 新功能</h4>
              <ul><li v-for="(f, i) in item.features" :key="i">{{ f }}</li></ul>
            </div>
            <div v-if="item.fixes?.length" class="section">
              <h4><el-icon><CircleCheck /></el-icon> 修复</h4>
              <ul><li v-for="(f, i) in item.fixes" :key="i">{{ f }}</li></ul>
            </div>
            <div v-if="item.improvements?.length" class="section">
              <h4><el-icon><TrendCharts /></el-icon> 优化</h4>
              <ul><li v-for="(f, i) in item.improvements" :key="i">{{ f }}</li></ul>
            </div>
          </div>
        </div>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { Star, CircleCheck, TrendCharts } from '@element-plus/icons-vue'

const selectedVersion = ref('')
const versions = ['1.8.0', '1.7.5', '1.7.0', '1.6.0']

const changelogs = ref([
  { version: '1.8.0', type: '正式版', date: '2024-12-01',
    features: ['新增外呼系统模块', '新增业绩报表导出功能', '支持多租户模式'],
    fixes: ['修复订单列表分页问题', '修复客户导入重复问题'],
    improvements: ['优化页面加载速度', '改进用户界面体验'] },
  { version: '1.7.5', type: '补丁', date: '2024-11-15',
    fixes: ['修复登录验证码不显示', '修复物流查询超时问题'] }
])

const getTypeTag = (type: string) => ({ '正式版': 'success', '补丁': 'warning', '测试版': 'info' }[type] || 'info')
</script>

<style scoped lang="scss">
.changelog-card { border-radius: 8px; border: none; }
.card-header { display: flex; justify-content: space-between; align-items: center; }
.changelog-item { padding: 20px 0; border-bottom: 1px solid #eee; &:last-child { border: none; } }
.changelog-header { display: flex; align-items: center; gap: 12px; margin-bottom: 16px;
  .version { font-size: 18px; font-weight: 600; color: #303133; }
  .date { color: #909399; font-size: 14px; margin-left: auto; }
}
.section { margin-bottom: 12px;
  h4 { display: flex; align-items: center; gap: 6px; font-size: 14px; color: #606266; margin-bottom: 8px; }
  ul { margin: 0; padding-left: 24px; li { color: #606266; line-height: 1.8; } }
}
</style>
