<template>
  <div ref="chartRef" class="trend-line-chart" :style="{ height: height + 'px' }"></div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import * as echarts from 'echarts'

const props = withDefaults(defineProps<{
  data?: Array<{ date: string; value: number; label?: string }>
  seriesName?: string
  color?: string
  height?: number
  areaColor?: string
  multiSeries?: Array<{
    name: string
    data: number[]
    color: string
  }>
  xLabels?: string[]
}>(), {
  data: () => [],
  seriesName: '数据',
  color: '#4C6EF5',
  height: 220,
  areaColor: ''
})

const chartRef = ref<HTMLElement>()
let chartInstance: echarts.ECharts | null = null

/**
 * Resolve a CSS color value to a hex string that Canvas/ECharts can use.
 * Handles `var(--xxx)` CSS variables and returns the computed value.
 */
const resolveColor = (color: string): string => {
  if (!color) return '#4C6EF5'
  if (color.startsWith('var(')) {
    // Extract variable name
    const match = color.match(/var\(\s*(--[^),]+)\s*(?:,\s*([^)]+))?\)/)
    if (match) {
      const resolved = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
      if (resolved) return resolved
      if (match[2]) return match[2].trim()
    }
    return '#4C6EF5'
  }
  return color
}

/**
 * Create a transparent variant of a color for gradients.
 * Appends alpha as hex digits only if the color is a valid hex color.
 */
const colorWithAlpha = (color: string, alpha: number): string => {
  const resolved = resolveColor(color)
  // If it's a hex color, convert to rgba
  const hex = resolved.replace('#', '')
  if (/^[0-9a-fA-F]{3,8}$/.test(hex)) {
    let r: number, g: number, b: number
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16)
      g = parseInt(hex[1] + hex[1], 16)
      b = parseInt(hex[2] + hex[2], 16)
    } else {
      r = parseInt(hex.slice(0, 2), 16)
      g = parseInt(hex.slice(2, 4), 16)
      b = parseInt(hex.slice(4, 6), 16)
    }
    return `rgba(${r},${g},${b},${alpha})`
  }
  return resolved
}

const initChart = () => {
  if (!chartRef.value) return
  if (chartInstance) chartInstance.dispose()
  chartInstance = echarts.init(chartRef.value, undefined, { renderer: 'canvas' })
  // 确保容器尺寸稳定后再渲染
  setTimeout(() => {
    chartInstance?.resize()
    updateChart()
  }, 50)
}

const updateChart = () => {
  if (!chartInstance) return

  if (props.multiSeries && props.xLabels) {
    // Multi-series mode
    const series = props.multiSeries.map(s => {
      const resolved = resolveColor(s.color)
      return {
      name: s.name,
      type: 'line' as const,
      smooth: true,
      symbol: 'circle',
      symbolSize: 6,
      showSymbol: false,
      emphasis: { focus: 'series' as const, itemStyle: { borderWidth: 2 } },
      lineStyle: { width: 2.5, color: resolved },
      itemStyle: { color: resolved },
      data: s.data
    }})

    chartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#E5E7EB',
        textStyle: { color: '#1F2937', fontSize: 13 },
        padding: [10, 14]
      },
      legend: {
        top: 0,
        right: 0,
        textStyle: { fontSize: 12, color: '#6B7280' },
        itemWidth: 16,
        itemHeight: 3,
        itemGap: 16
      },
      grid: { top: 30, right: 20, bottom: 24, left: 50 },
      xAxis: {
        type: 'category',
        data: props.xLabels,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: {
          fontSize: 11,
          color: '#9CA3AF',
          rotate: props.xLabels.length > 15 ? 45 : 0,
          interval: props.xLabels.length > 30 ? Math.floor(props.xLabels.length / 15) : 0
        },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } },
        axisLabel: { fontSize: 11, color: '#9CA3AF' },
        scale: true
      },
      series
    }, true)
  } else {
    // Single series mode
    const dates = props.data.map(d => d.date)
    const values = props.data.map(d => d.value)
    const resolvedColor = resolveColor(props.color)

    chartInstance.setOption({
      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgba(255,255,255,0.96)',
        borderColor: '#E5E7EB',
        textStyle: { color: '#1F2937', fontSize: 13 },
        padding: [10, 14],
        formatter: (params: any) => {
          const p = Array.isArray(params) ? params[0] : params
          const idx = p.dataIndex
          const label = props.data[idx]?.label || p.value
          return `<b>${p.axisValue}</b><br/>${props.seriesName}: <b>${label}</b>`
        }
      },
      grid: { top: 10, right: 20, bottom: 24, left: 50 },
      xAxis: {
        type: 'category',
        data: dates,
        axisLine: { lineStyle: { color: '#E5E7EB' } },
        axisLabel: { fontSize: 12, color: '#9CA3AF' },
        axisTick: { show: false }
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' } },
        axisLabel: { fontSize: 12, color: '#9CA3AF' },
        scale: true
      },
      series: [{
        name: props.seriesName,
        type: 'line',
        smooth: true,
        symbol: 'circle',
        symbolSize: 6,
        showSymbol: false,
        emphasis: { itemStyle: { borderWidth: 2, borderColor: '#fff' } },
        lineStyle: { width: 2.5, color: resolvedColor },
        itemStyle: { color: resolvedColor },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: colorWithAlpha(props.areaColor || props.color, 0.19) },
            { offset: 1, color: colorWithAlpha(props.areaColor || props.color, 0.02) }
          ])
        },
        data: values
      }]
    }, true)
  }
}

const handleResize = () => {
  chartInstance?.resize()
}

let resizeObserver: ResizeObserver | null = null

watch(() => [props.data, props.multiSeries, props.xLabels], () => {
  nextTick(updateChart)
}, { deep: true })

onMounted(() => {
  nextTick(initChart)
  window.addEventListener('resize', handleResize)
  // 使用 ResizeObserver 监听容器尺寸变化，确保图表始终铺满卡片
  if (chartRef.value) {
    resizeObserver = new ResizeObserver(() => {
      chartInstance?.resize()
    })
    resizeObserver.observe(chartRef.value)
  }
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  resizeObserver?.disconnect()
  resizeObserver = null
  chartInstance?.dispose()
  chartInstance = null
})
</script>

<style scoped>
.trend-line-chart { width: 100%; min-height: 160px; }
</style>

