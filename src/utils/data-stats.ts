// 数据统计分析工具
import type { JsonValue, JsonObject } from "../types"

export interface DataStats {
  totalFields: number
  totalObjects: number
  totalArrays: number
  maxDepth: number
  typeDistribution: Record<string, number>
  arrayLengths: number[]
  emptyFields: string[]
  sensitiveFields: string[]
  duplicateValues: Map<string, number>
  estimatedSize: number
  complexityScore: number
  qualityScore: number
  issues: string[]
}

const SENSITIVE_PATTERNS = [
  /password|pwd|secret|token|key|auth/i,
  /email|mail/i,
  /phone|mobile|tel/i,
  /ssn|id_?card|passport/i,
  /credit|card|cvv/i,
  /address|addr/i,
  /salary|income|salary/i
]

export const analyzeJsonData = (data: JsonValue): DataStats => {
  const stats: DataStats = {
    totalFields: 0,
    totalObjects: 0,
    totalArrays: 0,
    maxDepth: 0,
    typeDistribution: {},
    arrayLengths: [],
    emptyFields: [],
    sensitiveFields: [],
    duplicateValues: new Map(),
    estimatedSize: 0,
    complexityScore: 0,
    qualityScore: 100,
    issues: []
  }

  const valueTracker = new Map<string, number>()

  const traverse = (value: JsonValue, path: string, depth: number) => {
    stats.maxDepth = Math.max(stats.maxDepth, depth)

    if (value === null) {
      stats.typeDistribution['null'] = (stats.typeDistribution['null'] || 0) + 1
      stats.emptyFields.push(path)
      return
    }

    const type = typeof value
    if (type === 'string' || type === 'number' || type === 'boolean') {
      stats.typeDistribution[type] = (stats.typeDistribution[type] || 0) + 1
      stats.totalFields++

      // Check for empty strings
      if (type === 'string' && (value as string).trim() === '') {
        stats.emptyFields.push(path)
      }

      // Track duplicate values
      const valStr = String(value)
      valueTracker.set(valStr, (valueTracker.get(valStr) || 0) + 1)

      return
    }

    if (Array.isArray(value)) {
      stats.totalArrays++
      stats.arrayLengths.push(value.length)
      stats.typeDistribution['array'] = (stats.typeDistribution['array'] || 0) + 1

      if (value.length === 0) {
        stats.emptyFields.push(path)
      }

      value.forEach((item, index) => {
        traverse(item, `${path}[${index}]`, depth + 1)
      })
      return
    }

    if (type === 'object') {
      stats.totalObjects++
      stats.typeDistribution['object'] = (stats.typeDistribution['object'] || 0) + 1

      const obj = value as JsonObject
      const keys = Object.keys(obj)

      if (keys.length === 0) {
        stats.emptyFields.push(path)
      }

      keys.forEach(key => {
        stats.totalFields++

        // Check for sensitive field names
        if (SENSITIVE_PATTERNS.some(pattern => pattern.test(key))) {
          stats.sensitiveFields.push(`${path}.${key}`)
        }

        traverse(obj[key], path ? `${path}.${key}` : key, depth + 1)
      })
    }
  }

  traverse(data, '$', 0)

  // Calculate duplicates
  valueTracker.forEach((count, value) => {
    if (count > 1) {
      stats.duplicateValues.set(value, count)
    }
  })

  // Estimate size (rough)
  stats.estimatedSize = JSON.stringify(data).length

  // Calculate complexity score (0-100, higher is more complex)
  stats.complexityScore = Math.min(100,
    stats.maxDepth * 10 +
    stats.totalObjects * 2 +
    stats.totalArrays * 3
  )

  // Calculate quality score
  if (stats.emptyFields.length > stats.totalFields * 0.1) {
    stats.qualityScore -= 20
    stats.issues.push(`过多空字段 (${stats.emptyFields.length}个)`)
  }

  if (stats.sensitiveFields.length > 0) {
    stats.qualityScore -= 10
    stats.issues.push(`检测到敏感字段 (${stats.sensitiveFields.length}个)`)
  }

  if (stats.duplicateValues.size > stats.totalFields * 0.3) {
    stats.qualityScore -= 15
    stats.issues.push(`大量重复数据 (${stats.duplicateValues.size}个不同值)`)
  }

  if (stats.maxDepth > 10) {
    stats.qualityScore -= 15
    stats.issues.push(`结构过深 (${stats.maxDepth}层)`)
  }

  stats.qualityScore = Math.max(0, stats.qualityScore)

  return stats
}

export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

export const generateStatsReport = (stats: DataStats): string => {
  const lines: string[] = [
    '# JSON 数据统计报告',
    '',
    '## 基础统计',
    `- 总字段数: ${stats.totalFields}`,
    `- 对象数量: ${stats.totalObjects}`,
    `- 数组数量: ${stats.totalArrays}`,
    `- 最大深度: ${stats.maxDepth}`,
    `- 预估大小: ${formatBytes(stats.estimatedSize)}`,
    '',
    '## 类型分布',
  ]

  Object.entries(stats.typeDistribution).forEach(([type, count]) => {
    const percentage = ((count / stats.totalFields) * 100).toFixed(1)
    lines.push(`- ${type}: ${count} (${percentage}%)`)
  })

  lines.push('', '## 数据质量')
  lines.push(`- 质量评分: ${stats.qualityScore}/100`)
  lines.push(`- 复杂度: ${stats.complexityScore}`)

  if (stats.issues.length > 0) {
    lines.push('', '## 检测到的问题')
    stats.issues.forEach(issue => lines.push(`- ${issue}`))
  }

  if (stats.emptyFields.length > 0) {
    lines.push('', '## 空字段 (前10个)')
    stats.emptyFields.slice(0, 10).forEach(field => lines.push(`- ${field}`))
  }

  if (stats.sensitiveFields.length > 0) {
    lines.push('', '## 敏感字段')
    stats.sensitiveFields.forEach(field => lines.push(`- ${field}`))
  }

  return lines.join('\n')
}
