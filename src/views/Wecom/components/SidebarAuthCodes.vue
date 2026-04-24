<template>
  <div class="sidebar-auth-codes">
    <div class="tab-actions">
      <el-button type="primary" @click="openGenerate">
        <el-icon><Plus /></el-icon> 生成授权码
      </el-button>
      <div style="flex: 1" />
      <span class="result-count">共 {{ authCodes.length }} 个授权码</span>
    </div>

    <el-table :data="authCodes" stripe size="small">
      <el-table-column prop="code" label="授权码" min-width="180">
        <template #default="{ row }">
          <code class="auth-code-text">{{ row.code }}</code>
          <el-button type="primary" link size="small" style="margin-left: 4px" @click="copyCode(row.code)">复制</el-button>
        </template>
      </el-table-column>
      <el-table-column label="类型" width="100">
        <template #default="{ row }">
          <el-tag size="small" :type="typeTagType(row.type)">{{ typeLabel(row.type) }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="已用/最大" width="90" align="center">
        <template #default="{ row }">
          <span :style="{ color: row.usedCount >= row.maxCount ? '#EF4444' : '#1F2937' }">
            {{ row.usedCount }}/{{ row.maxCount === -1 ? '∞' : row.maxCount }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="过期时间" width="160">
        <template #default="{ row }">
          <span :style="{ color: isExpired(row.expireAt) ? '#EF4444' : '#6B7280' }">
            {{ row.expireAt || '永久' }}
          </span>
        </template>
      </el-table-column>
      <el-table-column label="状态" width="80">
        <template #default="{ row }">
          <el-tag :type="row.isEnabled ? 'success' : 'info'" size="small">{{ row.isEnabled ? '有效' : '已禁用' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="120" fixed="right">
        <template #default="{ row }">
          <el-button :type="row.isEnabled ? 'warning' : 'success'" link size="small" @click="toggleCode(row)">
            {{ row.isEnabled ? '禁用' : '启用' }}
          </el-button>
          <el-button type="danger" link size="small" @click="deleteCode(row)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 生成授权码弹窗 -->
    <el-dialog v-model="showGenerate" title="生成授权码" width="440px" destroy-on-close>
      <el-form :model="genForm" label-width="120px">
        <el-form-item label="类型">
          <el-radio-group v-model="genForm.type">
            <el-radio label="once">一次性</el-radio>
            <el-radio label="multi">多次使用</el-radio>
            <el-radio label="permanent">永久</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="genForm.type === 'multi'" label="最大使用次数">
          <el-input-number v-model="genForm.maxCount" :min="2" :max="100" />
        </el-form-item>
        <el-form-item label="有效期">
          <el-select v-model="genForm.expiry" style="width: 200px">
            <el-option label="1小时" value="1h" />
            <el-option label="6小时" value="6h" />
            <el-option label="24小时" value="24h" />
            <el-option label="7天" value="7d" />
            <el-option label="永久" value="permanent" />
          </el-select>
        </el-form-item>
      </el-form>

      <!-- 生成结果 -->
      <div v-if="generatedCode" class="generated-result">
        <div class="generated-label">已生成授权码：</div>
        <div class="generated-code">{{ generatedCode }}</div>
        <el-button type="primary" size="small" @click="copyCode(generatedCode)">复制授权码</el-button>
      </div>

      <template #footer>
        <el-button @click="showGenerate = false">关闭</el-button>
        <el-button v-if="!generatedCode" type="primary" @click="handleGenerate" :loading="generating">生成</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive } from 'vue'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const showGenerate = ref(false)
const generating = ref(false)
const generatedCode = ref('')

const authCodes = ref([
  { id: 1, code: 'AUTH-2026-ABCD-1234', type: 'permanent', usedCount: 3, maxCount: -1, expireAt: '', isEnabled: true },
  { id: 2, code: 'AUTH-2026-EFGH-5678', type: 'multi', usedCount: 5, maxCount: 10, expireAt: '2026-04-22 00:00', isEnabled: true },
  { id: 3, code: 'AUTH-2026-IJKL-9012', type: 'once', usedCount: 1, maxCount: 1, expireAt: '2026-04-16 14:00', isEnabled: false },
  { id: 4, code: 'AUTH-2026-MNOP-3456', type: 'multi', usedCount: 2, maxCount: 5, expireAt: '2026-04-20 00:00', isEnabled: true },
])

const genForm = reactive({
  type: 'multi' as 'once' | 'multi' | 'permanent',
  maxCount: 10,
  expiry: '7d'
})

const typeTagType = (t: string) => {
  if (t === 'permanent') return 'success' as const
  if (t === 'multi') return 'warning' as const
  return 'info' as const
}

const typeLabel = (t: string) => {
  const map: Record<string, string> = { once: '一次性', multi: '多次', permanent: '永久' }
  return map[t] || t
}

const isExpired = (d: string) => {
  if (!d) return false
  return new Date(d).getTime() < Date.now()
}

const openGenerate = () => {
  generatedCode.value = ''
  Object.assign(genForm, { type: 'multi', maxCount: 10, expiry: '7d' })
  showGenerate.value = true
}

const handleGenerate = () => {
  generating.value = true
  setTimeout(() => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    const seg = () => Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
    generatedCode.value = `AUTH-2026-${seg()}-${seg()}`

    const maxCount = genForm.type === 'once' ? 1 : genForm.type === 'permanent' ? -1 : genForm.maxCount
    let expireAt = ''
    if (genForm.expiry !== 'permanent') {
      const hours: Record<string, number> = { '1h': 1, '6h': 6, '24h': 24, '7d': 168 }
      const d = new Date()
      d.setHours(d.getHours() + (hours[genForm.expiry] || 168))
      expireAt = d.toLocaleString('zh-CN')
    }

    authCodes.value.unshift({
      id: Date.now(),
      code: generatedCode.value,
      type: genForm.type,
      usedCount: 0,
      maxCount,
      expireAt,
      isEnabled: true
    })

    generating.value = false
    ElMessage.success('授权码已生成')
  }, 400)
}

const copyCode = async (code: string) => {
  try {
    await navigator.clipboard.writeText(code)
    ElMessage.success('已复制到剪贴板')
  } catch {
    ElMessage.info(code)
  }
}

const toggleCode = (row: any) => {
  row.isEnabled = !row.isEnabled
  ElMessage.success(row.isEnabled ? '已启用' : '已禁用')
}

const deleteCode = async (row: any) => {
  await ElMessageBox.confirm('确定删除该授权码？', '提示', { type: 'warning' })
  authCodes.value = authCodes.value.filter(c => c.id !== row.id)
  ElMessage.success('已删除')
}
</script>

<style scoped>
.tab-actions { display: flex; gap: 8px; margin-bottom: 16px; align-items: center; }
.result-count { font-size: 13px; color: #9CA3AF; }
.auth-code-text { font-family: 'SF Mono', 'Menlo', monospace; font-size: 13px; background: #F3F4F6; padding: 2px 6px; border-radius: 4px; color: #1F2937; }

.generated-result { text-align: center; padding: 20px; margin-top: 16px; background: #F0FDF4; border-radius: 10px; border: 1px solid #BBF7D0; }
.generated-label { font-size: 13px; color: #6B7280; margin-bottom: 8px; }
.generated-code { font-family: 'SF Mono', monospace; font-size: 20px; font-weight: 700; color: #10B981; margin-bottom: 12px; letter-spacing: 1px; }
</style>

