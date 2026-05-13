<template>
  <div class="s-wrapper">
    <!-- 搜索栏 -->
    <div style="padding:6px 10px;position:relative">
      <input v-model="keyword" placeholder="🔍 搜索话术关键词..." class="preview-input" style="font-size:11px;padding-right:24px" />
      <span v-if="keyword" style="position:absolute;right:16px;top:50%;transform:translateY(-50%);cursor:pointer;color:#C0C4CC;font-size:13px;line-height:1" @click="keyword = ''" title="清空搜索">✕</span>
    </div>
    <!-- 操作按钮 -->
    <div style="display:flex;gap:4px;padding:0 10px 6px">
      <button class="s-btn" style="flex:1;text-align:center" @click="showCatDialog = true">📁 管理分组</button>
      <button class="s-btn" style="flex:1;text-align:center" @click="openAddScript(null)">＋ 新建话术</button>
    </div>
    <!-- 搜索下拉结果 -->
    <div v-if="keyword && searchResults.length" class="s-search-dropdown">
      <div class="s-search-item" v-for="s in searchResults" :key="s.id" @click.stop="copyScript(s)" @dblclick.stop="handleCopyAndSend(s)" @contextmenu.prevent="showCtxMenu($event, s)">
        <span class="s-scope-dot" :style="{ background: s.scope === 'personal' ? '#e6a23c' : '#07c160' }"></span>
        <span v-if="hasAttachments(s)" class="s-att-icon">{{ getAttachmentIcon(s) }}</span>
        <span class="s-search-title" :style="s.color ? { color: s.color } : {}">{{ s.title || '无标题' }}</span>
        <span class="s-search-content">{{ s.content }}</span>
        <span class="script-send-icon" title="点击发送" @click.stop="handleSend(s)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></span>
      </div>
    </div>
    <div v-if="keyword && !searchResults.length" class="s-search-dropdown" style="text-align:center;padding:12px;color:#c0c4cc;font-size:11px">无匹配话术</div>
    <!-- 左右布局 -->
    <div class="s-layout" v-show="!keyword">
      <div class="s-cat-panel" :style="{ width: catPanelWidth + 'px' }">
        <div class="s-cat-item" :class="{ active: selectedCatId === null }" @click="selectedCatId = null">
          <span class="script-group-color" style="background:#909399"></span>
          <span style="flex:1;font-size:11px">全部</span>
          <span style="font-size:10px;color:#c0c4cc">{{ allScripts.length }}</span>
        </div>
        <div class="s-cat-item" v-for="cat in categories" :key="cat.id" :class="{ active: selectedCatId === cat.id }" @click="selectedCatId = cat.id"
          @contextmenu.prevent="showCatCtxMenu($event, cat)">
          <span class="script-group-color" :style="{ background: cat.color || (cat.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
          <span style="flex:1;font-size:11px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ cat.name }}</span>
          <span style="font-size:10px;color:#c0c4cc">{{ catScriptCount[cat.id] || 0 }}</span>
        </div>
        <div class="s-cat-item" :class="{ active: selectedCatId === 0 }" @click="selectedCatId = 0">
          <span class="script-group-color" style="background:#c0c4cc"></span>
          <span style="flex:1;font-size:11px">未分组</span>
          <span style="font-size:10px;color:#c0c4cc">{{ uncategorized.length }}</span>
        </div>
      </div>
      <div class="s-resizer" @mousedown="startResize"></div>
      <div class="s-script-panel">
        <div v-if="displayScripts.length === 0" style="text-align:center;padding:30px 6px;color:#c0c4cc;font-size:11px">暂无话术</div>
        <div class="script-item" v-for="(s, idx) in displayScripts" :key="s.id"
          @click.stop="copyScript(s)" @dblclick.stop="handleCopyAndSend(s)" @contextmenu.prevent="showCtxMenu($event, s)">
          <span class="script-idx">{{ idx + 1 }}</span>
          <span class="s-scope-dot" :style="{ background: s.scope === 'personal' ? '#e6a23c' : '#07c160' }"></span>
          <span v-if="hasAttachments(s)" class="s-att-icon">{{ getAttachmentIcon(s) }}</span>
          <span class="script-title-text" :style="s.color ? { color: s.color } : {}">{{ s.title || '无标题' }}</span>
          <span class="script-content-inline">{{ s.content }}</span>
          <span class="script-send-icon" title="点击发送" @click.stop="handleSend(s)"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg></span>
        </div>
      </div>
    </div>
    <!-- 右键菜单 -->
    <teleport to="body">
      <div v-if="ctxMenu.visible" class="s-ctx-menu" :style="{ left: ctxMenu.x + 'px', top: ctxMenu.y + 'px' }" @click="ctxMenu.visible = false">
        <div class="s-ctx-item" @click="openAddScript(ctxMenu.script)">✏️ 编辑</div>
        <div class="s-ctx-item" @click="delScript(ctxMenu.script)">🗑️ 删除</div>
        <div class="s-ctx-item" @click="copyScript(ctxMenu.script)">📋 复制内容</div>
      </div>
      <div v-if="catCtxMenu.visible" class="s-ctx-menu" :style="{ left: catCtxMenu.x + 'px', top: catCtxMenu.y + 'px' }" @click="catCtxMenu.visible = false">
        <div class="s-ctx-item" @click="startEditCat(catCtxMenu.cat)">✏️ 重命名</div>
        <div class="s-ctx-item" @click="delCat(catCtxMenu.cat)">🗑️ 删除分组</div>
      </div>
    </teleport>
    <!-- 管理分组弹窗 -->
    <div v-if="showCatDialog" class="s-dialog-overlay" @click.self="showCatDialog = false">
      <div class="s-dialog">
        <div class="s-dialog-header"><span>📁 管理分组</span><span class="action-link" @click="showCatDialog = false">✕</span></div>
        <div class="s-dialog-body">
          <div style="background:#f9fafb;border-radius:8px;padding:8px;margin-bottom:10px">
            <div style="display:flex;gap:4px;margin-bottom:6px;align-items:center">
              <input v-model="newCatName" placeholder="分组名称" class="preview-input" style="flex:1;font-size:11px" @keyup.enter="saveCat" />
              <select v-model="newCatScope" class="preview-input" style="width:65px;font-size:10px;padding:3px 4px">
                <option value="public">🌐 公共</option>
                <option value="personal">👤 个人</option>
              </select>
              <button class="s-btn" @click="saveCat">{{ editingCatId ? '保存' : '添加' }}</button>
              <button v-if="editingCatId" class="s-btn" style="color:#f56c6c" @click="cancelEditCat">取消</button>
            </div>
            <div style="display:flex;gap:2px;align-items:center">
              <span style="font-size:10px;color:#909399;margin-right:2px">颜色：</span>
              <span v-for="c in sColors" :key="c" class="color-dot" :style="{ background: c }" :class="{ active: newCatColor === c }" @click="newCatColor = newCatColor === c ? '' : c"></span>
            </div>
          </div>
          <div v-for="cat in categories" :key="cat.id" class="s-cat-manage-item">
            <span class="script-group-color" :style="{ background: cat.color || (cat.scope === 'personal' ? '#e6a23c' : '#07c160') }"></span>
            <span style="flex:1;font-size:12px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">{{ cat.name }}</span>
            <span class="s-scope-badge" :class="cat.scope === 'personal' ? 'personal' : 'public'">{{ cat.scope === 'personal' ? '个人' : '公共' }}</span>
            <span style="font-size:10px;color:#c0c4cc;margin:0 4px">{{ catScriptCount[cat.id] || 0 }}</span>
            <span class="action-link" style="font-size:10px;color:#409eff;margin-right:4px" @click="startEditCat(cat)">编辑</span>
            <span class="action-link" style="font-size:10px;color:#f56c6c" @click="delCat(cat)">删除</span>
          </div>
          <div v-if="!categories.length" style="text-align:center;padding:16px;color:#c0c4cc;font-size:11px">暂无分组</div>
        </div>
      </div>
    </div>
    <!-- 新建/编辑话术弹窗 -->
    <div v-if="showAddScriptDialog" class="s-dialog-overlay" @click.self="showAddScriptDialog = false">
      <div class="s-dialog">
        <div class="s-dialog-header"><span>{{ editScript ? '编辑话术' : '新建话术' }}</span><span class="action-link" @click="showAddScriptDialog = false">✕</span></div>
        <div class="s-dialog-body">
          <input v-model="scriptForm.title" placeholder="话术标题" class="preview-input" style="font-size:11px;margin-bottom:6px" />
          <textarea v-model="scriptForm.content" placeholder="话术内容..." class="preview-input" style="font-size:11px;min-height:60px;resize:vertical;margin-bottom:6px"></textarea>
          <select v-model="scriptForm.categoryId" class="preview-input" style="font-size:11px;margin-bottom:6px">
            <option :value="null">未分组</option>
            <option v-for="cat in categories" :key="cat.id" :value="cat.id">{{ cat.name }}</option>
          </select>
          <div style="display:flex;gap:6px;align-items:center;margin-bottom:6px">
            <span style="font-size:10px;color:#909399">类型：</span>
            <span class="s-scope-radio" :class="{ active: scriptForm.scope === 'public' }" @click="scriptForm.scope = 'public'">🌐 公共</span>
            <span class="s-scope-radio" :class="{ active: scriptForm.scope === 'personal' }" @click="scriptForm.scope = 'personal'">👤 个人</span>
          </div>
          <div style="display:flex;gap:4px;align-items:center;margin-bottom:6px">
            <span style="font-size:10px;color:#909399">颜色：</span>
            <span v-for="c in sColors" :key="c" class="color-dot" :style="{ background: c }" :class="{ active: scriptForm.color === c }" @click="scriptForm.color = scriptForm.color === c ? '' : c"></span>
          </div>
          <div style="display:flex;gap:6px;justify-content:flex-end">
            <button class="s-btn" style="color:#909399;border-color:#dcdfe6" @click="showAddScriptDialog = false">取消</button>
            <button class="s-btn" @click="saveScript">保存</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { ElMessage } from 'element-plus'
import request from '@/utils/request'

const props = defineProps<{ sidebarToken: string }>()

const keyword = ref('')
const selectedCatId = ref<number | null>(null)
const categories = ref<any[]>([])
const allScripts = ref<any[]>([])
const catPanelWidth = ref(90)

const showCatDialog = ref(false)
const showAddScriptDialog = ref(false)
const editScript = ref<any>(null)
const scriptForm = ref({ title: '', content: '', categoryId: null as number | null, scope: 'public', color: '' })
const newCatName = ref('')
const newCatScope = ref('public')
const newCatColor = ref('')
const editingCatId = ref<number | null>(null)
const sColors = ['#303133', '#07c160', '#409eff', '#e6a23c', '#f56c6c', '#9b59b6', '#1abc9c']

const ctxMenu = ref({ visible: false, x: 0, y: 0, script: null as any })
const catCtxMenu = ref({ visible: false, x: 0, y: 0, cat: null as any })

const authHeaders = computed(() => ({ headers: { Authorization: `Bearer ${props.sidebarToken}` } }))

const catScriptCount = computed(() => {
  const map: Record<number, number> = {}
  allScripts.value.forEach(s => { if (s.categoryId) map[s.categoryId] = (map[s.categoryId] || 0) + 1 })
  return map
})

const uncategorized = computed(() => allScripts.value.filter(s => !s.categoryId))

const displayScripts = computed(() => {
  if (selectedCatId.value === null) return allScripts.value
  if (selectedCatId.value === 0) return uncategorized.value
  return allScripts.value.filter(s => s.categoryId === selectedCatId.value)
})

const searchResults = computed(() => {
  if (!keyword.value.trim()) return []
  const kw = keyword.value.toLowerCase()
  return allScripts.value.filter(s => (s.title || '').toLowerCase().includes(kw) || (s.content || '').toLowerCase().includes(kw))
})

// ==================== API ====================

async function loadScripts() {
  try {
    const res: any = await request.get('/wecom/sidebar/scripts', authHeaders.value as any)
    const data = res?.data || res
    categories.value = data?.categories || []
    allScripts.value = data?.scripts || []
  } catch (e: any) {
    console.error('[SidebarScripts] Load error:', e)
  }
}

async function saveScript() {
  if (!scriptForm.value.title && !scriptForm.value.content) { ElMessage.warning('标题或内容至少填一项'); return }
  try {
    if (editScript.value) {
      await request.put(`/wecom/sidebar/scripts/${editScript.value.id}`, scriptForm.value, authHeaders.value as any)
      ElMessage.success('已更新')
    } else {
      await request.post('/wecom/sidebar/scripts', scriptForm.value, authHeaders.value as any)
      ElMessage.success('已创建')
    }
    showAddScriptDialog.value = false
    await loadScripts()
  } catch (e: any) { ElMessage.error(e?.message || '保存失败') }
}

async function saveCat() {
  if (!newCatName.value.trim()) { ElMessage.warning('请输入分组名称'); return }
  try {
    const payload: any = { name: newCatName.value.trim(), scope: newCatScope.value }
    if (newCatColor.value) payload.color = newCatColor.value
    if (editingCatId.value) {
      await request.put(`/wecom/sidebar/script-categories/${editingCatId.value}`, payload, authHeaders.value as any)
    } else {
      await request.post('/wecom/sidebar/script-categories', payload, authHeaders.value as any)
    }
    newCatName.value = ''
    newCatColor.value = ''
    editingCatId.value = null
    await loadScripts()
  } catch (e: any) { ElMessage.error(e?.message || '保存分组失败') }
}

async function delScript(script: any) {
  if (!script) return
  if (!confirm(`确定删除话术「${script.title || '未命名'}」？`)) return
  try {
    await request.delete(`/wecom/sidebar/scripts/${script.id}`, authHeaders.value as any)
    ElMessage.success('已删除')
    await loadScripts()
  } catch (e: any) { ElMessage.error(e?.message || '删除失败') }
}

async function delCat(cat: any) {
  if (!cat) return
  if (!confirm(`确定删除分组「${cat.name}」？`)) return
  try {
    await request.delete(`/wecom/sidebar/script-categories/${cat.id}`, authHeaders.value as any)
    ElMessage.success('分组已删除')
    await loadScripts()
  } catch (e: any) { ElMessage.error(e?.message || '删除分组失败') }
}

// ==================== Actions ====================

function openAddScript(s: any) {
  if (s) {
    editScript.value = s
    scriptForm.value = { title: s.title || '', content: s.content || '', categoryId: s.categoryId || null, scope: s.scope || 'public', color: s.color || '' }
  } else {
    editScript.value = null
    scriptForm.value = { title: '', content: '', categoryId: selectedCatId.value === 0 ? null : selectedCatId.value, scope: 'public', color: '' }
  }
  showAddScriptDialog.value = true
}

function startEditCat(cat: any) {
  editingCatId.value = cat.id
  newCatName.value = cat.name
  newCatScope.value = cat.scope || 'public'
  newCatColor.value = cat.color || ''
  showCatDialog.value = true
}

function cancelEditCat() {
  editingCatId.value = null
  newCatName.value = ''
}

/** 点击发送图标：通过企微JS-SDK发送到当前聊天对话框 */
async function handleSend(script: any) {
  try { await request.post(`/wecom/sidebar/scripts/${script.id}/use`, {}, authHeaders.value as any) } catch { /* ignore */ }

  const ww = (window as any).ww
  const wx = (window as any).wx

  // 构建消息payload
  const payload: any = { msgtype: 'text', text: { content: script.content } }

  // 如果有图片附件，优先发送为news（H5链接带图）
  if (script.attachments?.length > 0) {
    const firstAtt = script.attachments[0]
    if (firstAtt.type?.startsWith('image/') && firstAtt.url) {
      payload.msgtype = 'news'
      payload.news = {
        link: firstAtt.url,
        title: script.title || '话术分享',
        desc: script.content || '',
        imgUrl: firstAtt.url
      }
      delete payload.text
    }
  }

  let sent = false
  if (ww) {
    try {
      if (typeof ww.sendChatMessage === 'function') { await ww.sendChatMessage(payload); sent = true }
      else if (typeof ww.invoke === 'function') { await ww.invoke('sendChatMessage', payload); sent = true }
    } catch { /* fallback */ }
  }
  if (!sent && wx?.invoke) {
    wx.invoke('sendChatMessage', payload, (res: any) => {
      if (res.err_msg === 'sendChatMessage:ok') ElMessage.success('已发送')
      else { copyScript(script); ElMessage.info('已复制到剪贴板') }
    })
    sent = true
  }
  if (sent) { ElMessage.success('已发送') }
  else { copyScript(script); ElMessage.info('已复制到剪贴板（非企微环境）') }

  const s = allScripts.value.find(ss => ss.id === script.id)
  if (s) s.useCount = (s.useCount || 0) + 1
}

/** 双击：复制并发送到对话输入框（只显示一个提示） */
async function handleCopyAndSend(script: any) {
  // 先静默复制（不弹提示）
  try {
    await navigator.clipboard.writeText(script?.content || '')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = script?.content || ''
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
  }
  // 再发送
  try { await request.post(`/wecom/sidebar/scripts/${script.id}/use`, {}, authHeaders.value as any) } catch { /* ignore */ }
  const ww = (window as any).ww
  const wx = (window as any).wx
  if (ww?.sendChatMessage) {
    try {
      await ww.sendChatMessage({ msgtype: 'text', text: { content: script.content } })
      ElMessage.success('已复制并发送')
    } catch {
      ElMessage.success('已复制到剪贴板')
    }
  } else if (wx?.invoke) {
    wx.invoke('sendChatMessage', { msgtype: 'text', text: { content: script.content } }, (res: any) => {
      if (res.err_msg === 'sendChatMessage:ok') ElMessage.success('已复制并发送')
      else ElMessage.success('已复制到剪贴板')
    })
  } else {
    ElMessage.success('已复制到剪贴板')
  }
  const s = allScripts.value.find(ss => ss.id === script.id)
  if (s) s.useCount = (s.useCount || 0) + 1
}

async function copyScript(script: any) {
  try {
    await navigator.clipboard.writeText(script?.content || '')
    ElMessage.success('已复制到剪贴板')
  } catch {
    const ta = document.createElement('textarea')
    ta.value = script?.content || ''
    document.body.appendChild(ta); ta.select(); document.execCommand('copy'); document.body.removeChild(ta)
    ElMessage.success('已复制')
  }
}

function hasAttachments(s: any): boolean {
  return !!(s.attachments && s.attachments.length > 0)
}
function getAttachmentIcon(s: any): string {
  if (!s.attachments?.length) return ''
  const firstType = s.attachments[0]?.type || ''
  if (firstType.startsWith('image/')) return '🖼️'
  if (firstType.includes('pdf')) return '📄'
  if (firstType.includes('video')) return '🎬'
  return '📎'
}

function showCtxMenu(e: MouseEvent, s: any) { ctxMenu.value = { visible: true, x: e.clientX, y: e.clientY, script: s } }
function showCatCtxMenu(e: MouseEvent, cat: any) { catCtxMenu.value = { visible: true, x: e.clientX, y: e.clientY, cat } }

// ==================== Resizer ====================
let resizing = false
function startResize() { resizing = true }
function onMouseMove(e: MouseEvent) { if (resizing) catPanelWidth.value = Math.max(50, Math.min(180, e.clientX - 10)) }
function onMouseUp() { resizing = false }

onMounted(() => {
  loadScripts()
  document.addEventListener('mousemove', onMouseMove)
  document.addEventListener('mouseup', onMouseUp)
  document.addEventListener('click', () => { ctxMenu.value.visible = false; catCtxMenu.value.visible = false })
})
onBeforeUnmount(() => {
  document.removeEventListener('mousemove', onMouseMove)
  document.removeEventListener('mouseup', onMouseUp)
})
</script>

<style scoped>
.s-wrapper { display: flex; flex-direction: column; height: calc(100vh - 40px); background: #f5f5f5; overflow: hidden; color: #303133; }
.preview-input { width: 100%; padding: 6px 8px; border: 1px solid #dcdfe6; border-radius: 6px; font-size: 12px; outline: none; box-sizing: border-box; color: #303133; }
.preview-input:focus { border-color: #07c160; }
.s-btn { padding: 4px 10px; border: 1px solid #dcdfe6; border-radius: 5px; background: #fff; font-size: 11px; cursor: pointer; color: #606266; white-space: nowrap; }
.s-btn:hover { border-color: #07c160; color: #07c160; }
/* 搜索下拉 */
.s-search-dropdown { background: #fff; margin: 0 10px; border-radius: 6px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); max-height: 200px; overflow-y: auto; }
.s-search-item { display: flex; align-items: center; gap: 4px; padding: 6px 8px; cursor: pointer; border-bottom: 1px solid #f9fafb; font-size: 11px; }
.s-search-item:hover { background: #f5f7fa; }
.s-search-title { font-weight: 500; color: #303133; white-space: nowrap; max-width: 80px; overflow: hidden; text-overflow: ellipsis; }
.s-search-content { flex: 1; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
/* 左右布局 */
.s-layout { display: flex; flex: 1; overflow: hidden; margin: 0 6px 6px; background: #fff; border-radius: 8px; box-shadow: 0 1px 4px rgba(0,0,0,0.04); }
.s-cat-panel { overflow-y: auto; border-right: 1px solid #f0f0f0; padding: 4px 0; flex-shrink: 0; }
.s-cat-item { display: flex; align-items: center; gap: 4px; padding: 5px 6px; cursor: pointer; font-size: 11px; border-left: 2px solid transparent; }
.s-cat-item.active { background: #f0fdf4; border-left-color: #07c160; }
.s-cat-item:hover { background: #f9fafb; }
.script-group-color { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.s-resizer { width: 4px; cursor: col-resize; background: transparent; flex-shrink: 0; }
.s-resizer:hover { background: #e5e7eb; }
.s-script-panel { flex: 1; overflow-y: auto; padding: 4px; }
.script-item { display: flex; align-items: center; gap: 4px; padding: 5px 6px; cursor: pointer; border-radius: 4px; font-size: 11px; border-bottom: 1px solid #f9fafb; }
.script-item:hover { background: #f5f7fa; }
.script-idx { color: #c0c4cc; font-size: 9px; width: 14px; text-align: center; flex-shrink: 0; }
.s-scope-dot { width: 5px; height: 5px; border-radius: 50%; flex-shrink: 0; }
.s-att-icon { font-size: 12px; flex-shrink: 0; width: 14px; height: 14px; display: inline-flex; align-items: center; justify-content: center; }
.script-title-text { font-weight: 500; color: #303133; white-space: nowrap; max-width: 60px; overflow: hidden; text-overflow: ellipsis; flex-shrink: 0; }
.script-content-inline { flex: 1; color: #909399; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-size: 10px; }
.script-send-icon { color: #07c160; cursor: pointer; flex-shrink: 0; display: flex; opacity: 0.5; }
.script-send-icon:hover { opacity: 1; }
/* 右键菜单 */
.s-ctx-menu { position: fixed; background: #fff; border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 9999; min-width: 100px; padding: 4px 0; }
.s-ctx-item { padding: 6px 12px; font-size: 11px; cursor: pointer; white-space: nowrap; color: #303133; }
.s-ctx-item:hover { background: #f5f7fa; }
/* 弹窗 */
.s-dialog-overlay { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0,0,0,0.3); z-index: 9998; display: flex; align-items: center; justify-content: center; }
.s-dialog { background: #fff; border-radius: 10px; width: 90%; max-width: 320px; max-height: 80vh; overflow: hidden; display: flex; flex-direction: column; }
.s-dialog-header { display: flex; justify-content: space-between; align-items: center; padding: 10px 14px; border-bottom: 1px solid #f0f0f0; font-size: 13px; font-weight: 600; }
.s-dialog-body { padding: 12px 14px; overflow-y: auto; flex: 1; }
.action-link { color: #4c6ef5; cursor: pointer; font-size: 12px; }
.s-cat-manage-item { display: flex; align-items: center; gap: 4px; padding: 6px 4px; border-bottom: 1px solid #f9fafb; }
.s-scope-badge { font-size: 9px; padding: 1px 4px; border-radius: 3px; }
.s-scope-badge.public { background: #ecfdf5; color: #059669; }
.s-scope-badge.personal { background: #fef3c7; color: #d97706; }
.s-scope-radio { padding: 2px 8px; border-radius: 4px; font-size: 10px; cursor: pointer; border: 1px solid #dcdfe6; }
.s-scope-radio.active { border-color: #07c160; background: #ecfdf5; color: #059669; }
.color-dot { width: 14px; height: 14px; border-radius: 50%; cursor: pointer; border: 2px solid transparent; transition: all 0.2s; }
.color-dot:hover { transform: scale(1.2); }
.color-dot.active { border-color: #303133; box-shadow: 0 0 0 1px #fff inset; }
</style>
