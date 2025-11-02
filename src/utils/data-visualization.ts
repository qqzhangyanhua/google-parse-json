// 数据可视化工具
import type { JsonValue } from "../types"

export type ChartType = 'typeDistribution' | 'valueDistribution' | 'arrayLength' | 'depthAnalysis' | 'stringLength' | 'treeStructure'
export type ColorScheme = 'default' | 'vibrant' | 'pastel' | 'monochrome'

export interface ChartData {
  type: ChartType
  data: Array<{ label: string; value: number; color?: string }>
  title: string
}

const COLOR_SCHEMES: Record<ColorScheme, string[]> = {
  default: ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2'],
  vibrant: ['#ff4d4f', '#ff7a45', '#ffa940', '#ffc53d', '#bae637', '#73d13d'],
  pastel: ['#b7eb8f', '#87e8de', '#91d5ff', '#d3adf7', '#ffd6e7', '#ffe7ba'],
  monochrome: ['#262626', '#595959', '#8c8c8c', '#bfbfbf', '#d9d9d9', '#f0f0f0']
}

export const generateChartData = (data: JsonValue, chartType: ChartType, colorScheme: ColorScheme = 'default'): ChartData => {
  const colors = COLOR_SCHEMES[colorScheme]
  
  switch (chartType) {
    case 'typeDistribution': {
      const types: Record<string, number> = {}
      const count = (val: JsonValue) => {
        if (val === null) types['null'] = (types['null'] || 0) + 1
        else if (Array.isArray(val)) {
          types['array'] = (types['array'] || 0) + 1
          val.forEach(count)
        } else if (typeof val === 'object') {
          types['object'] = (types['object'] || 0) + 1
          Object.values(val).forEach(count)
        } else {
          const t = typeof val
          types[t] = (types[t] || 0) + 1
        }
      }
      count(data)
      
      return {
        type: chartType,
        title: '数据类型分布',
        data: Object.entries(types).map(([label, value], idx) => ({
          label,
          value,
          color: colors[idx % colors.length]
        }))
      }
    }
    
    case 'arrayLength': {
      const lengths: number[] = []
      const traverse = (val: JsonValue) => {
        if (Array.isArray(val)) {
          lengths.push(val.length)
          val.forEach(traverse)
        } else if (val && typeof val === 'object') {
          Object.values(val).forEach(traverse)
        }
      }
      traverse(data)
      
      const distribution: Record<string, number> = {}
      lengths.forEach(len => {
        const bucket = len < 10 ? '<10' : len < 50 ? '10-50' : len < 100 ? '50-100' : '100+'
        distribution[bucket] = (distribution[bucket] || 0) + 1
      })
      
      return {
        type: chartType,
        title: '数组长度分布',
        data: Object.entries(distribution).map(([label, value], idx) => ({
          label,
          value,
          color: colors[idx % colors.length]
        }))
      }
    }
    
    default:
      return {
        type: chartType,
        title: '图表',
        data: []
      }
  }
}

export const generateSVGChart = (chartData: ChartData, width: number = 400, height: number = 300): string => {
  const total = chartData.data.reduce((sum, item) => sum + item.value, 0)
  
  // Simple pie chart
  let currentAngle = 0
  const centerX = width / 2
  const centerY = height / 2
  const radius = Math.min(width, height) / 3
  
  const paths = chartData.data.map(item => {
    const angle = (item.value / total) * 360
    const startAngle = currentAngle
    const endAngle = currentAngle + angle
    
    const x1 = centerX + radius * Math.cos((startAngle - 90) * Math.PI / 180)
    const y1 = centerY + radius * Math.sin((startAngle - 90) * Math.PI / 180)
    const x2 = centerX + radius * Math.cos((endAngle - 90) * Math.PI / 180)
    const y2 = centerY + radius * Math.sin((endAngle - 90) * Math.PI / 180)
    
    const largeArc = angle > 180 ? 1 : 0
    
    currentAngle = endAngle
    
    return `<path d="M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2} Z" fill="${item.color}" />`
  }).join('\n')
  
  return `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">${paths}</svg>`
}
