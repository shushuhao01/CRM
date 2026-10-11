/**
 * ECharts 轻量封装（按需引入，避免全量打包）
 * 与 admin 其它图表页保持一致的注册方式
 */
import * as echarts from 'echarts/core'
import { LineChart, PieChart, BarChart } from 'echarts/charts'
import { GridComponent, TooltipComponent, LegendComponent, TitleComponent } from 'echarts/components'
import { CanvasRenderer } from 'echarts/renderers'

echarts.use([
  LineChart,
  PieChart,
  BarChart,
  GridComponent,
  TooltipComponent,
  LegendComponent,
  TitleComponent,
  CanvasRenderer
])

export type EChartsOption = echarts.EChartsCoreOption
export type EChartsInstance = echarts.ECharts

/** 初始化图表 */
export function initChart(el: HTMLElement, option: EChartsOption): EChartsInstance {
  const chart = echarts.init(el)
  chart.setOption(option)
  return chart
}

/** 更新图表配置（notMerge = true） */
export function setChartOption(chart: EChartsInstance | null, option: EChartsOption) {
  if (!chart) return
  chart.setOption(option, true)
}

/** 销毁图表（组件卸载时调用） */
export function disposeChart(chart: EChartsInstance | null) {
  if (chart) chart.dispose()
}

/** 常用调色板 */
export const PALETTE = ['#3A7AFE', '#22C55E', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4', '#EC4899', '#84CC16']

/** 通用图例/坐标轴文字颜色 */
export const AXIS_TEXT = '#6B7280'

/** 默认折线系列颜色 */
export const LINE_COLORS = ['#3A7AFE', '#22C55E']
