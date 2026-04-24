<template>
  <el-drawer :model-value="modelValue" @update:model-value="$emit('update:modelValue', $event)" title="全文搜索" size="60%">
    <div style="padding: 0 20px">
      <el-form :inline="true" style="margin-bottom: 15px">
        <el-form-item>
          <el-input v-model="searchKeyword" placeholder="输入关键词搜索消息内容" clearable style="width: 300px" @keyup.enter="doFullSearch" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="doFullSearch" :loading="searchLoading">搜索</el-button>
        </el-form-item>
      </el-form>

      <el-table :data="searchResults" v-loading="searchLoading" stripe size="small">
        <el-table-column prop="fromUserName" label="发送者" width="100">
          <template #default="{ row }">{{ row.fromUserName || row.fromUserId }}</template>
        </el-table-column>
        <el-table-column label="内容" min-width="300">
          <template #default="{ row }">
            <span v-html="highlightText(row.contentPreview, row.highlight)"></span>
          </template>
        </el-table-column>
        <el-table-column prop="msgType" label="类型" width="70" />
        <el-table-column label="时间" width="140">
          <template #default="{ row }">{{ row.msgTime ? formatMsgTime(row.msgTime) : '-' }}</template>
        </el-table-column>
      </el-table>

      <div class="pagination-wrapper" style="margin-top: 15px">
        <el-pagination
          v-model:current-page="searchPage"
          :page-size="50"
          :total="searchTotal"
          layout="total, prev, pager, next"
          @current-change="doFullSearch"
        />
      </div>
    </div>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { searchChatRecords } from '@/api/wecom'
import { formatMsgTime, highlightText } from '../utils'
import type { SearchResultItem } from '../types'

defineOptions({ name: 'FullTextSearchDrawer' })

const props = defineProps<{
  modelValue: boolean
  configId: number | null
}>()

defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const searchKeyword = ref('')
const searchResults = ref<SearchResultItem[]>([])
const searchTotal = ref(0)
const searchPage = ref(1)
const searchLoading = ref(false)

const doFullSearch = async () => {
  if (!searchKeyword.value.trim()) {
    ElMessage.warning('请输入搜索关键词')
    return
  }
  searchLoading.value = true
  try {
    const res: any = await searchChatRecords({
      keyword: searchKeyword.value,
      configId: props.configId || undefined,
      page: searchPage.value,
      pageSize: 50
    })
    if (res?.list) {
      searchResults.value = res.list
      searchTotal.value = res.total || 0
    } else {
      searchResults.value = []
      searchTotal.value = 0
    }
  } catch (e) {
    console.error('[FullTextSearchDrawer] Search error:', e)
    searchResults.value = []
  } finally {
    searchLoading.value = false
  }
}
</script>

<style scoped>
.pagination-wrapper { display: flex; justify-content: flex-end; }
</style>

