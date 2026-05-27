<template>
  <span class="ww-open-data-wrapper" ref="wrapperRef">
    <ww-open-data
      v-if="sdkReady"
      :type="type"
      :openid="openid"
      :corpid="corpid || undefined"
      ref="openDataRef"
    />
    <span v-else class="ww-fallback">{{ fallbackText }}</span>
  </span>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue'
import { useWecomOpenData } from '../composables/useWecomOpenData'

const props = defineProps<{
  type: 'userName' | 'userAlias' | 'userAliasOrName' | 'departmentName'
  openid: string
  corpid?: string
  fallback?: string
}>()

const { isWecomReady } = useWecomOpenData()
const wrapperRef = ref<HTMLElement | null>(null)
const openDataRef = ref<any>(null)

const sdkReady = computed(() => {
  if (!props.openid) return false
  if (!isWecomReady.value) {
    const w = window as any
    return !!(w.WWOpenData && typeof w.WWOpenData.bind === 'function')
  }
  return true
})

const fallbackText = computed(() => {
  if (props.fallback) return props.fallback
  if (!props.openid) return ''
  if (props.type === 'departmentName') return `部门${props.openid}`
  return props.openid
})

const bindElement = async () => {
  await nextTick()
  const w = window as any
  if (!w.WWOpenData?.bind) return
  const el = wrapperRef.value?.querySelector('ww-open-data')
  if (el) {
    try {
      w.WWOpenData.bind(el)
    } catch { /* ignore bind errors in non-wecom browsers */ }
  }
}

onMounted(() => {
  if (sdkReady.value) bindElement()
})

watch(sdkReady, (ready) => {
  if (ready) bindElement()
})

watch(() => props.openid, () => {
  if (sdkReady.value) bindElement()
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
