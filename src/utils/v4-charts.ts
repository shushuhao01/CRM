/**
 * V4 ECharts 图表主题配置
 * 参考: 企微模块精细化设计方案V4 第十七章
 * 统一使用曲线图 + 浅色渐变填充 + V4调色板
 */

// V4 调色板
export const V4_COLORS = [
  '#4C6EF5', '#7C3AED', '#10B981', '#F59E0B',
  '#EF4444', '#EC4899', '#06B6D4', '#8B5CF6'
]

/**
 * 创建V4风格的曲线折线图配置
 */
export function createLineChartOption(options: {
  xData: string[]
  series: Array<{ name: string; data: number[]; color?: string }>
  title?: string
  showArea?: boolean
  smooth?: boolean
}) {
  const { xData, series, title, showArea = true, smooth = true } = options
  return {
    title: title ? {
      text: title,
      textStyle: { fontSize: 15, fontWeight: 600, color: '#1F2937' },
      left: 0
    } : undefined,
    color: V4_COLORS,
    tooltip: {
      trigger: 'axis' as const,
      backgroundColor: '#fff',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#4B5563', fontSize: 13 },
      axisPointer: { type: 'cross' as const, crossStyle: { color: '#E5E7EB' } }
    },
    legend: {
      bottom: 0,
      icon: 'roundRect',
      itemWidth: 14,
      itemHeight: 8,
      textStyle: { fontSize: 12, color: '#9CA3AF' }
    },
    grid: { left: '3%', right: '3%', top: title ? '18%' : '8%', bottom: '14%', containLabel: true },
    xAxis: {
      type: 'category' as const,
      data: xData,
      axisLine: { lineStyle: { color: '#E5E7EB' } },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    yAxis: {
      type: 'value' as const,
      splitLine: { lineStyle: { color: '#F3F4F6', type: 'dashed' as const } },
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { fontSize: 11, color: '#9CA3AF' }
    },
    series: series.map((s, i) => {
      const color = s.color || V4_COLORS[i % V4_COLORS.length]
      return {
        name: s.name,
        type: 'line' as const,
        data: s.data,
        smooth,
        lineStyle: { width: 2, color },
        itemStyle: { color },
        showSymbol: false,
        areaStyle: showArea ? {
          color: {
            type: 'linear' as const, x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: color + '30' },
              { offset: 1, color: color + '05' }
            ]
          }
        } : undefined
      }
    })
  }
}

/**
 * 创建V4风格的环形图配置
 */
export function createDonutChartOption(options: {
  data: Array<{ name: string; value: number }>
  title?: string
  innerRadius?: string
  outerRadius?: string
}) {
  const { data, title, innerRadius = '50%', outerRadius = '70%' } = options
  return {
    title: title ? {
      text: title,
      textStyle: { fontSize: 15, fontWeight: 600, color: '#1F2937' },
      left: 0
    } : undefined,
    color: V4_COLORS,
    tooltip: {
      trigger: 'item' as const,
      backgroundColor: '#fff',
      borderColor: '#E5E7EB',
      borderWidth: 1,
      textStyle: { color: '#4B5563', fontSize: 13 },
      formatter: '{b}: {c} ({d}%)'
    },
    legend: {
      bottom: 0,
      icon: 'circle',
      itemWidth: 10,
      itemHeight: 10,
      textStyle: { fontSize: 12, color: '#9CA3AF' }
    },
    series: [{
      type: 'pie' as const,
      radius: [innerRadius, outerRadius],
      center: ['50%', '45%'],
      avoidLabelOverlap: true,
      label: { show: false },
      emphasis: {
        label: { show: true, fontSize: 14, fontWeight: 600, color: '#1F2937' },
        itemStyle: { shadowBlur: 10, shadowOffsetX: 0, shadowColor: 'rgba(0,0,0,0.1)' }
      },
      itemStyle: { borderRadius: 6, borderColor: '#fff', borderWidth: 2 },
      data
    }]
  }
}

/**
 * 创建V4风格的迷你趋势线(sparkline)数据 - 适配简单Canvas
 */
export function drawSparkline(
  canvas: HTMLCanvasElement,
  data: number[],
  color: string = '#4C6EF5'
) {
  const ctx = canvas.getContext('2d')
  if (!ctx || data.length < 2) return
  const w = canvas.width, h = canvas.height
  const max = Math.max(...data), min = Math.min(...data)
  const range = max - min || 1
  const stepX = w / (data.length - 1)

  // Resolve CSS variables for Canvas
  let resolved = color
  if (color.startsWith('var(')) {
    const match = color.match(/var\(\s*(--[^),]+)/)
    if (match) {
      const val = getComputedStyle(document.documentElement).getPropertyValue(match[1]).trim()
      if (val) resolved = val
    }
  }

  // Convert hex to rgba helper
  const hexToRgba = (hex: string, alpha: number) => {
    const h = hex.replace('#', '')
    if (!/^[0-9a-fA-F]{3,8}$/.test(h)) return hex
    let r: number, g: number, b: number
    if (h.length === 3) {
      r = parseInt(h[0] + h[0], 16); g = parseInt(h[1] + h[1], 16); b = parseInt(h[2] + h[2], 16)
    } else {
      r = parseInt(h.slice(0, 2), 16); g = parseInt(h.slice(2, 4), 16); b = parseInt(h.slice(4, 6), 16)
    }
    return `rgba(${r},${g},${b},${alpha})`
  }

  ctx.clearRect(0, 0, w, h)

  // 渐变填充
  const gradient = ctx.createLinearGradient(0, 0, 0, h)
  gradient.addColorStop(0, hexToRgba(resolved, 0.19))
  gradient.addColorStop(1, hexToRgba(resolved, 0.02))

  ctx.beginPath()
  ctx.moveTo(0, h)
  data.forEach((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.05
    if (i === 0) ctx.lineTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.lineTo(w, h)
  ctx.closePath()
  ctx.fillStyle = gradient
  ctx.fill()

  // 线条
  ctx.beginPath()
  data.forEach((v, i) => {
    const x = i * stepX
    const y = h - ((v - min) / range) * h * 0.85 - h * 0.05
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  })
  ctx.strokeStyle = resolved
  ctx.lineWidth = 1.5
  ctx.stroke()
}

