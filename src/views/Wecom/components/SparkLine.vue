<template>
  <svg :width="width" :height="height" class="sparkline" viewBox="0 0 100 30" preserveAspectRatio="none">
    <polyline
      :points="points"
      fill="none"
      :stroke="color"
      stroke-width="1.5"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      v-if="data.length > 0"
      :cx="lastX"
      :cy="lastY"
      r="2"
      :fill="color"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{
  data: number[]
  color?: string
  width?: number
  height?: number
}>(), {
  color: '#4C6EF5',
  width: 80,
  height: 28
})

const points = computed(() => {
  if (!props.data.length) return ''
  const max = Math.max(...props.data, 1)
  const min = Math.min(...props.data, 0)
  const range = max - min || 1
  const stepX = 100 / Math.max(props.data.length - 1, 1)
  return props.data
    .map((v, i) => `${(i * stepX).toFixed(1)},${(28 - ((v - min) / range) * 24 - 2).toFixed(1)}`)
    .join(' ')
})

const lastX = computed(() => {
  if (!props.data.length) return 0
  return 100
})

const lastY = computed(() => {
  if (!props.data.length) return 15
  const max = Math.max(...props.data, 1)
  const min = Math.min(...props.data, 0)
  const range = max - min || 1
  const lastVal = props.data[props.data.length - 1]
  return 28 - ((lastVal - min) / range) * 24 - 2
})
</script>

<style scoped>
.sparkline {
  display: inline-block;
  vertical-align: middle;
}
</style>

