<template>
  <span class="ww-open-data-wrapper" ref="wrapperRef">
    <ww-open-data
      v-if="canRender"
      :type="type"
      :openid="openid"
      :corpid="corpid || undefined"
      ref="openDataRef"
    />
    <span v-else class="ww-fallback" :title="fallbackTitle">{{ fallbackText }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useWwOpenDataSdk } from '../composables/useWwOpenDataSdk'

const props = defineProps<{
  type: 'userName' | 'userAlias' | 'userAliasOrName' | 'departmentName'
  openid: string
  corpid?: string
  fallback?: string
}>()

const { isReady, bindElement: sdkBindElement } = useWwOpenDataSdk()
const wrapperRef = ref<HTMLElement | null>(null)
const openDataRef = ref<any>(null)

const canRender = computed(() => {
  if (!props.openid) return false
  // SDK 已就绪
  if (isReady.value) return true
  // 检查全局 WWOpenData 是否可用（可能被其他方式加载）
  const w = window as any
  return !!(w.WWOpenData && typeof w.WWOpenData.bind === 'function')
})

const fallbackText = computed(() => {
  const raw = props.fallback || props.openid || ''
  if (!raw) return ''
  if (props.type === 'departmentName') {
    if (/^\d+$/.test(raw.trim())) return `部门${raw}`
    return raw
  }
  if (props.type === 'userName' || props.type === 'userAliasOrName') {
    // open_userid 格式截短
    if (/^wo[a-zA-Z0-9_-]{20,}$/.test(raw.trim())) {
      return `成员(${raw.slice(0, 8)}...)`
    }
    return raw
  }
  return raw
})

const fallbackTitle = computed(() => {
  if (!canRender.value && props.openid) {
    const typeLabel = props.type === 'departmentName' ? '部门' : '成员'
    return `${typeLabel}ID: ${props.openid}（在企业微信客户端中可显示真实名称）`
  }
  return ''
})

const bindCurrentElement = async () => {
  await nextTick()
  const el = wrapperRef.value?.querySelector('ww-open-data')
  if (el) {
    sdkBindElement(el)
  }
}

onMounted(() => {
  if (canRender.value) bindCurrentElement()
})

watch(canRender, (ready) => {
  if (ready) bindCurrentElement()
})

watch(() => props.openid, () => {
  if (canRender.value) {
    nextTick(() => bindCurrentElement())
  }
})

// 监听 SDK 就绪事件（延迟绑定）
watch(isReady, (ready) => {
  if (ready) {
    nextTick(() => bindCurrentElement())
  }
})
</script>

<style scoped>
.ww-open-data-wrapper {
  display: inline;
}
.ww-fallback {
  color: inherit;
}
</style>
