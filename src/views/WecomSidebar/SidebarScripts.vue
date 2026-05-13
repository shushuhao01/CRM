<template>
  <div class="sidebar-scripts">
    <!-- 搜索栏 -->
    <div class="scripts-search">
      <el-input v-model="keyword" placeholder="搜索话术..." clearable size="small" @input="onSearch">
        <template #prefix><el-icon><Search /></el-icon></template>
      </el-input>
    </div>

    <!-- 分类标签 -->
    <div class="scripts-categories">
      <span
        class="cat-tag" :class="{ active: activeCatId === null }"
        @click="activeCatId = null"
      >全部</span>
      <span
        v-for="cat in categories" :key="cat.id"
        class="cat-tag" :class="{ active: activeCatId === cat.id }"
        :style="cat.color ? { '--cat-color': cat.color } : {}"
        @click="activeCatId = cat.id"
      >{{ cat.name }} ({{ getCatCount(cat.id) }})</span>
      <span class="cat-tag cat-add" @click="showAddCat = true">+ 新分组</span>
    </div>

    <!-- 话术列表 -->
    <div class="scripts-list" v-loading="loading">
      <div v-if="!loading && filteredScripts.length === 0" class="scripts-empty">
        <p>{{ keyword ? '未找到匹配话术' : '暂无话术' }}</p>
        <el-button size="small" type="primary" @click="showAddScript = true">+ 新建话术</el-button>
      </div>
      <div v-for="script in filteredScripts" :key="script.id" class="script-item" @click="handleSend(script)">
        <div class="script-header">
          <span class="script-title">{{ script.title || '未命名话术' }}</span>
          <div class="script-actions">
            <el-button link size="small" type="primary" @click.stop="handleSend(script)" title="发送到聊天">📤</el-button>
            <el-button link size="small" @click.stop="handleCopy(script)" title="复制内容">📋</el-button>
            <el-button link size="small" type="danger" @click.stop="handleDelete(script)" title="删除">🗑️</el-button>
          </div>
        </div>
        <div class="script-content">{{ script.content }}</div>
        <div class="script-meta">
          <span v-if="script.categoryName" class="script-cat">{{ script.categoryName }}</span>
          <span class="script-use">使用{{ script.useCount || 0 }}次</span>
          <span v-if="script.scope === 'personal'" class="script-scope">个人</span>
        </div>
      </div>
    </div>

    <!-- 底部按钮 -->
    <div class="scripts-footer">
      <el-button type="primary" style="width:100%" @click="showAddScript = true">+ 新建话术</el-button>
    </div>

    <!-- 新建话术弹窗 -->
    <el-dialog v-model="showAddScript" title="新建话术" width="90%" :close-on-click-modal="false" append-to-body>
      <el-form label-position="top" size="small">
        <el-form-item label="标题">
          <el-input v-model="newScript.title" placeholder="话术标题" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="newScript.content" type="textarea" :rows="4" placeholder="话术内容" />
        </el-form-item>
        <el-form-item label="分组">
          <el-select v-model="newScript.categoryId" placeholder="选择分组" clearable style="width:100%">
            <el-option v-for="cat in categories" :key="cat.id" :label="cat.name" :value="cat.id" />
          </el-select>
        </el-form-item>
        <el-form-item label="类型">
          <el-radio-group v-model="newScript.scope">
            <el-radio label="public">公共</el-radio>
            <el-radio label="personal">个人</el-radio>
          </el-radio-group>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddScript = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveScript">保存</el-button>
      </template>
    </el-dialog>

    <!-- 新建分组弹窗 -->
    <el-dialog v-model="showAddCat" title="新建分组" width="80%" append-to-body>
      <el-form label-position="top" size="small">
        <el-form-item label="分组名称">
          <el-input v-model="newCatName" placeholder="输入分组名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCat = false">取消</el-button>
        <el-button type="primary" :loading="savingCat" @click="saveCat">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search } from '@element-plus/icons-vue'
import request from '@/utils/request'

const props = defineProps<{ sidebarToken: string }>()

const loading = ref(false)
const keyword = ref('')
const activeCatId = ref<number | null>(null)
const categories = ref<any[]>([])
const scripts = ref<any[]>([])
const showAddScript = ref(false)
const showAddCat = ref(false)
const saving = ref(false)
const savingCat = ref(false)
const newCatName = ref('')
const newScript = ref({ title: '', content: '', categoryId: null as number | null, scope: 'public' })

const authHeaders = computed(() => ({
  headers: { Authorization: `Bearer ${props.sidebarToken}` }
}))

const filteredScripts = computed(() => {
  let list = scripts.value
  if (activeCatId.value !== null) {
    list = list.filter(s => s.categoryId === activeCatId.value)
  }
  if (keyword.value.trim()) {
    const kw = keyword.value.toLowerCase()
    list = list.filter(s =>
      (s.title || '').toLowerCase().includes(kw) ||
      (s.content || '').toLowerCase().includes(kw)
    )
  }
  return list
})

const getCatCount = (catId: number) => scripts.value.filter(s => s.categoryId === catId).length

let searchTimer: any = null
const onSearch = () => {
  clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {}, 300)
}

async function loadScripts() {
  loading.value = true
  try {
    const res: any = await request.get('/wecom/sidebar/scripts', {
      params: { keyword: keyword.value || undefined },
      ...authHeaders.value
    } as any)
    const data = res?.data || res
    categories.value = data?.categories || []
    scripts.value = (data?.scripts || []).map((s: any) => ({
      ...s,
      categoryName: categories.value.find((c: any) => c.id === s.categoryId)?.name || ''
    }))
  } catch (e: any) {
    console.error('[SidebarScripts] Load error:', e)
    ElMessage.error('加载话术失败')
  }
  loading.value = false
}

async function saveScript() {
  if (!newScript.value.title && !newScript.value.content) {
    ElMessage.warning('标题或内容至少填一项')
    return
  }
  saving.value = true
  try {
    await request.post('/wecom/sidebar/scripts', newScript.value, authHeaders.value as any)
    ElMessage.success('话术创建成功')
    showAddScript.value = false
    newScript.value = { title: '', content: '', categoryId: null, scope: 'public' }
    await loadScripts()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建失败')
  }
  saving.value = false
}

async function saveCat() {
  if (!newCatName.value.trim()) { ElMessage.warning('请输入分组名称'); return }
  savingCat.value = true
  try {
    await request.post('/wecom/sidebar/script-categories', { name: newCatName.value.trim(), scope: 'public' }, authHeaders.value as any)
    ElMessage.success('分组创建成功')
    showAddCat.value = false
    newCatName.value = ''
    await loadScripts()
  } catch (e: any) {
    ElMessage.error(e?.message || '创建分组失败')
  }
  savingCat.value = false
}

async function handleSend(script: any) {
  // 记录使用次数
  try {
    await request.post(`/wecom/sidebar/scripts/${script.id}/use`, {}, authHeaders.value as any)
  } catch { /* ignore */ }

  // 尝试通过企微JS-SDK发送到聊天
  const wx = (window as any).wx
  if (wx?.sendChatMessage) {
    try {
      wx.sendChatMessage({
        msgtype: 'text',
        text: { content: script.content }
      })
      ElMessage.success('已发送到聊天')
      // 刷新使用次数
      const s = scripts.value.find(ss => ss.id === script.id)
      if (s) s.useCount = (s.useCount || 0) + 1
      return
    } catch { /* fallback to copy */ }
  }

  // Fallback: 复制到剪贴板
  handleCopy(script)
}

async function handleCopy(script: any) {
  try {
    await navigator.clipboard.writeText(script.content || '')
    ElMessage.success('已复制到剪贴板')
  } catch {
    // Fallback
    const ta = document.createElement('textarea')
    ta.value = script.content || ''
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    document.body.removeChild(ta)
    ElMessage.success('已复制到剪贴板')
  }
}

async function handleDelete(script: any) {
  try {
    await ElMessageBox.confirm(`确定删除话术「${script.title || '未命名'}」？`, '提示', { type: 'warning' })
    await request.delete(`/wecom/sidebar/scripts/${script.id}`, authHeaders.value as any)
    ElMessage.success('已删除')
    await loadScripts()
  } catch { /* cancelled */ }
}

onMounted(() => {
  loadScripts()
})
</script>

<style scoped>
.sidebar-scripts { display: flex; flex-direction: column; height: 100%; background: #f5f6f7; }
.scripts-search { padding: 10px 12px 6px; background: #fff; }
.scripts-categories { padding: 6px 12px 10px; background: #fff; display: flex; flex-wrap: wrap; gap: 6px; border-bottom: 1px solid #eee; }
.cat-tag { display: inline-block; padding: 3px 10px; border-radius: 12px; font-size: 12px; color: #606266; background: #f0f2f5; cursor: pointer; transition: all .2s; }
.cat-tag.active { background: #07c160; color: #fff; }
.cat-tag:hover { opacity: .85; }
.cat-tag.cat-add { border: 1px dashed #c0c4cc; background: transparent; color: #909399; }
.scripts-list { flex: 1; overflow-y: auto; padding: 8px 12px; }
.scripts-empty { text-align: center; padding: 40px 0; color: #909399; font-size: 13px; }
.script-item { background: #fff; border-radius: 8px; padding: 10px 12px; margin-bottom: 8px; cursor: pointer; transition: box-shadow .2s; }
.script-item:hover { box-shadow: 0 2px 8px rgba(0,0,0,.08); }
.script-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px; }
.script-title { font-size: 13px; font-weight: 600; color: #303133; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 200px; }
.script-actions { display: flex; gap: 2px; flex-shrink: 0; }
.script-content { font-size: 12px; color: #606266; line-height: 1.5; max-height: 48px; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; word-break: break-all; }
.script-meta { display: flex; gap: 8px; margin-top: 6px; font-size: 11px; color: #909399; }
.script-cat { background: #f0f2f5; padding: 1px 6px; border-radius: 4px; }
.script-scope { color: #e6a23c; }
.scripts-footer { padding: 10px 12px; background: #fff; border-top: 1px solid #eee; }
</style>
