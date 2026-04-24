<template>
  <div class="scripts-page">
    <van-nav-bar title="快捷话术" left-arrow @click-left="$router.back()" />

    <!-- 搜索 -->
    <div class="search-bar">
      <van-search v-model="keyword" placeholder="搜索话术关键词..." shape="round" />
    </div>

    <van-loading v-if="loading" size="24px" style="text-align:center;padding:40px;" />

    <template v-else>
      <!-- 左右分栏布局 -->
      <div class="split-layout">
        <!-- 左侧分组面板 -->
        <div class="group-panel">
          <div class="group-item" :class="{ active: selectedCatId === null }" @click="selectedCatId = null">
            <span class="group-name">全部</span>
            <span class="group-count">{{ scripts.length }}</span>
          </div>
          <div
            v-for="cat in categories"
            :key="cat.id"
            class="group-item"
            :class="{ active: selectedCatId === cat.id }"
            @click="selectedCatId = cat.id"
          >
            <span class="group-name">{{ cat.name }}</span>
            <span class="group-count">{{ catCountMap[cat.id] || 0 }}</span>
          </div>
          <div class="group-item" :class="{ active: selectedCatId === 0 }" @click="selectedCatId = 0">
            <span class="group-name">未分组</span>
            <span class="group-count">{{ uncategorizedCount }}</span>
          </div>
        </div>

        <!-- 右侧话术列表 -->
        <div class="detail-panel">
          <div v-if="filteredScripts.length === 0" class="empty-hint">
            <van-icon name="edit" size="36" color="#d1d5db" />
            <div>当前分组暂无话术</div>
          </div>
          <div v-else class="script-rows">
            <div
              v-for="(item, idx) in filteredScripts"
              :key="item.id"
              class="script-row"
            >
              <!-- 第一行：序号 + 色点 + 标题 + 内容 + 复制/发送 -->
              <div class="row-line1">
                <span class="row-idx">{{ idx + 1 }}</span>
                <span class="row-dot" :style="{ background: getCatColor(item.categoryId) }"></span>
                <span class="row-title">{{ item.title || truncate(item.content, 8) }}</span>
                <span class="row-content">{{ truncate(item.content, 16) }}</span>
                <div class="row-actions">
                  <span class="act-btn act-copy" @click.stop="copyScript(item)" title="复制">
                    <van-icon name="records-o" size="16" />
                  </span>
                  <span class="act-btn act-send" @click.stop="copyScript(item)" title="发送">
                    <van-icon name="arrow" size="16" />
                  </span>
                </div>
              </div>
              <!-- 第二行：使用次数 + 分组 + 公共/个人 + 时间 -->
              <div class="row-line2">
                <span class="meta-use"><van-icon name="fire-o" size="10" color="#f59e0b" /> {{ item.useCount || 0 }}次</span>
                <span v-if="item.categoryName" class="meta-cat">{{ item.categoryName }}</span>
                <span class="meta-scope" :class="item.scope === 'personal' ? 'scope-personal' : 'scope-public'">
                  {{ item.scope === 'personal' ? '个人' : '公共' }}
                </span>
                <span v-if="item.updatedAt" class="meta-time">{{ item.updatedAt }}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { showToast } from 'vant'
import api from '@/api/index'

const loading = ref(true)
const keyword = ref('')
const selectedCatId = ref<number | null>(null)
const categories = ref<any[]>([])
const scripts = ref<any[]>([])

const catColors = ['#07c160', '#1890ff', '#722ed1', '#eb2f96', '#fa8c16', '#52c41a', '#13c2c2', '#f5222d', '#faad14', '#2f54eb']

function getCatColor(catId: number): string {
  const cat = categories.value.find(c => c.id === catId)
  if (cat?.color) return cat.color
  const idx = categories.value.findIndex(c => c.id === catId)
  return idx >= 0 ? catColors[idx % catColors.length] : '#c0c4cc'
}

const catCountMap = computed(() => {
  const map: Record<number, number> = {}
  for (const s of scripts.value) {
    if (s.categoryId) map[s.categoryId] = (map[s.categoryId] || 0) + 1
  }
  return map
})

const uncategorizedCount = computed(() =>
  scripts.value.filter(s => !s.categoryId || !categories.value.find(c => c.id === s.categoryId)).length
)

const filteredScripts = computed(() => {
  let list = scripts.value

  if (selectedCatId.value === null) {
    // all
  } else if (selectedCatId.value === 0) {
    list = list.filter(s => !s.categoryId || !categories.value.find(c => c.id === s.categoryId))
  } else {
    list = list.filter(s => s.categoryId === selectedCatId.value)
  }

  if (keyword.value.trim()) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s =>
      (s.content || '').toLowerCase().includes(kw) ||
      (s.title || '').toLowerCase().includes(kw) ||
      (s.shortcut || '').toLowerCase().includes(kw)
    )
  }
  return list
})

function truncate(text: string, len: number): string {
  if (!text) return ''
  return text.length > len ? text.slice(0, len) + '...' : text
}

async function copyScript(item: any) {
  try {
    await navigator.clipboard.writeText(item.content || '')
    showToast({ message: '已复制到剪贴板', icon: 'success' })
  } catch {
    const ta = document.createElement('textarea')
    ta.value = item.content || ''
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    showToast({ message: '已复制到剪贴板', icon: 'success' })
  }
}

onMounted(async () => {
  try {
    const [catRes, scriptRes] = await Promise.allSettled([
      api.get('/app/script-categories'),
      api.get('/app/scripts')
    ])
    if (catRes.status === 'fulfilled' && catRes.value.data?.success) {
      categories.value = catRes.value.data.data || []
    }
    if (scriptRes.status === 'fulfilled' && scriptRes.value.data?.success) {
      scripts.value = scriptRes.value.data.data || []
    }
  } catch (e) {
    console.error('[ScriptsManage] load error:', e)
  } finally {
    loading.value = false
  }
})
</script>

<style scoped>
.scripts-page {
  height: 100vh; display: flex; flex-direction: column;
  background: #f5f6fa;
}
.search-bar {
  flex-shrink: 0;
}

/* 左右分栏 */
.split-layout {
  flex: 1; display: flex; overflow: hidden;
  margin: 0 8px 8px;
  background: #fff; border-radius: 12px;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
}

/* 左侧分组 */
.group-panel {
  width: 90px; flex-shrink: 0;
  border-right: 1px solid #f0f0f0;
  overflow-y: auto;
  background: #fafbfc;
  padding: 4px 0;
}
.group-item {
  display: flex; align-items: center; justify-content: space-between;
  padding: 11px 10px;
  font-size: 13px; color: #606266;
  cursor: pointer; transition: all 0.15s;
  border-left: 3px solid transparent;
}
.group-item:active { background: #f0f0f0; }
.group-item.active {
  background: #fff;
  border-left-color: #07c160;
  color: #1f2937; font-weight: 600;
}
.group-name {
  flex: 1; min-width: 0;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.group-count {
  font-size: 11px; color: #c0c4cc;
  background: #f0f0f0; border-radius: 8px;
  padding: 1px 6px; min-width: 18px; text-align: center;
}
.group-item.active .group-count {
  background: #e6f7ee; color: #07c160;
}

/* 右侧话术列表 */
.detail-panel {
  flex: 1; overflow-y: auto; min-width: 0;
}
.empty-hint {
  display: flex; flex-direction: column; align-items: center;
  justify-content: center; height: 200px; gap: 8px;
  color: #c0c4cc; font-size: 13px;
}

/* 话术列表 */
.script-rows { padding: 0; }
.script-row {
  border-bottom: 1px solid #f5f5f5;
  padding: 10px 10px 8px;
}

/* 第一行：序号+色点+标题+内容+操作按钮 */
.row-line1 {
  display: flex; align-items: center; gap: 5px;
}
.row-idx {
  font-size: 12px; color: #c0c4cc; width: 16px; text-align: center; flex-shrink: 0;
}
.row-dot {
  width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0;
}
.row-title {
  font-size: 13px; font-weight: 600; color: #1f2937;
  white-space: nowrap; flex-shrink: 0; max-width: 70px;
  overflow: hidden; text-overflow: ellipsis;
}
.row-content {
  flex: 1; min-width: 0; font-size: 12px; color: #9ca3af;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.row-actions {
  display: flex; align-items: center; gap: 2px; flex-shrink: 0;
}
.act-btn {
  width: 28px; height: 28px; border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: background 0.12s;
}
.act-btn:active { opacity: 0.6; }
.act-copy { color: #07c160; }
.act-copy:hover { background: #e6f7ee; }
.act-send { color: #3b82f6; }
.act-send:hover { background: #eff6ff; }

/* 第二行：使用次数+分组+范围+时间 */
.row-line2 {
  display: flex; align-items: center; gap: 8px;
  margin-top: 4px; padding-left: 21px;
}
.meta-use {
  display: flex; align-items: center; gap: 2px;
  font-size: 10px; color: #c0c4cc;
}
.meta-cat {
  font-size: 10px; color: #07c160;
  background: #e6f7ee; padding: 1px 6px; border-radius: 4px;
}
.meta-scope {
  font-size: 10px; padding: 1px 6px; border-radius: 4px;
}
.scope-public { color: #07c160; background: #e6f7ee; }
.scope-personal { color: #e6a23c; background: #fdf6ec; }
.meta-time {
  font-size: 10px; color: #d1d5db;
}
</style>
