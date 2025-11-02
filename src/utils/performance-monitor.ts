// 性能监控工具
import type { JsonValue } from "../types"

export interface OperationRecord {
  id: string
  type: 'parse' | 'search' | 'format' | 'validate' | 'generate' | 'convert'
  timestamp: number
  duration: number
  success: boolean
  error?: string
  dataSize?: number
}

export interface PerformanceMetrics {
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  operationHistory: OperationRecord[]
  averageParseTime: number
  averageRenderTime: number
  totalOperations: number
  successRate: number
}

class PerformanceMonitor {
  private operations: OperationRecord[] = []
  private maxRecords = 100

  startOperation(type: OperationRecord['type']): string {
    const id = `${type}_${Date.now()}_${Math.random()}`
    return id
  }

  endOperation(
    id: string,
    success: boolean,
    error?: string,
    dataSize?: number
  ): void {
    const [type, timestamp] = id.split('_')
    const duration = Date.now() - parseInt(timestamp)

    const record: OperationRecord = {
      id,
      type: type as OperationRecord['type'],
      timestamp: parseInt(timestamp),
      duration,
      success,
      error,
      dataSize
    }

    this.operations.unshift(record)
    if (this.operations.length > this.maxRecords) {
      this.operations = this.operations.slice(0, this.maxRecords)
    }
  }

  getMetrics(): PerformanceMetrics {
    const memory = (performance as unknown as { memory?: { usedJSHeapSize: number; totalJSHeapSize: number } }).memory

    const parseOps = this.operations.filter(op => op.type === 'parse')
    const avgParseTime = parseOps.length > 0
      ? parseOps.reduce((sum, op) => sum + op.duration, 0) / parseOps.length
      : 0

    const successOps = this.operations.filter(op => op.success)
    const successRate = this.operations.length > 0
      ? (successOps.length / this.operations.length) * 100
      : 100

    return {
      memoryUsage: {
        used: memory ? memory.usedJSHeapSize / (1024 * 1024) : 0,
        total: memory ? memory.totalJSHeapSize / (1024 * 1024) : 0,
        percentage: memory
          ? (memory.usedJSHeapSize / memory.totalJSHeapSize) * 100
          : 0
      },
      operationHistory: [...this.operations],
      averageParseTime: avgParseTime,
      averageRenderTime: 0,
      totalOperations: this.operations.length,
      successRate
    }
  }

  clearHistory(): void {
    this.operations = []
  }

  getRecommendations(metrics: PerformanceMetrics): string[] {
    const recommendations: string[] = []

    if (metrics.memoryUsage.percentage > 80) {
      recommendations.push('内存使用率过高 (>80%)，建议清理历史记录或减少数据量')
    } else if (metrics.memoryUsage.percentage > 60) {
      recommendations.push('内存使用较高 (>60%)，注意监控性能状况')
    }

    if (metrics.averageParseTime > 1000) {
      recommendations.push('平均解析时间超过1秒，建议使用性能模式处理大数据')
    }

    if (metrics.successRate < 90) {
      recommendations.push(`操作成功率较低 (${metrics.successRate.toFixed(1)}%)，请检查数据格式`)
    }

    const recentOps = metrics.operationHistory.slice(0, 10)
    const largeDataOps = recentOps.filter(op => (op.dataSize || 0) > 1024 * 1024)
    if (largeDataOps.length > 0) {
      recommendations.push('检测到大数据操作 (>1MB)，建议分批处理')
    }

    return recommendations
  }
}

export const performanceMonitor = new PerformanceMonitor()

export const calculateDataSize = (data: string | JsonValue): number => {
  if (typeof data === 'string') {
    return new Blob([data]).size
  }
  return new Blob([JSON.stringify(data)]).size
}

export const formatDuration = (ms: number): string => {
  if (ms < 1000) return `${ms.toFixed(0)}ms`
  return `${(ms / 1000).toFixed(2)}s`
}
