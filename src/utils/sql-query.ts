// SQL查询工具 - 简化版
import type { JsonValue, JsonObject } from "../types"

export interface QueryResult {
  data: JsonObject[]
  count: number
  sql: string
}

// 简化的SQL解析和执行
export const executeSQL = (data: JsonValue, sql: string): QueryResult => {
  // 将JSON转换为数组
  let dataset: JsonObject[] = []
  if (Array.isArray(data)) {
    dataset = data.filter(item => typeof item === 'object' && item !== null) as JsonObject[]
  } else if (data && typeof data === 'object') {
    dataset = [data as JsonObject]
  }

  // 简单的SQL解析（仅支持基本SELECT）
  const selectMatch = sql.match(/SELECT\s+(.*?)\s+FROM/i)
  const whereMatch = sql.match(/WHERE\s+(.+?)(?:\s+ORDER|\s+LIMIT|$)/i)
  const limitMatch = sql.match(/LIMIT\s+(\d+)/i)

  let results = [...dataset]

  // WHERE过滤
  if (whereMatch) {
    const condition = whereMatch[1].trim()
    results = results.filter(item => {
      try {
        // 简单的条件解析
        const simpleMatch = condition.match(/(\w+)\s*=\s*['"](.+)['"]/i)
        if (simpleMatch) {
          const [, field, value] = simpleMatch
          return String(item[field]) === value
        }
        return true
      } catch {
        return true
      }
    })
  }

  // LIMIT
  if (limitMatch) {
    const limit = parseInt(limitMatch[1])
    results = results.slice(0, limit)
  }

  // SELECT字段
  if (selectMatch) {
    const fields = selectMatch[1].trim()
    if (fields !== '*') {
      const fieldList = fields.split(',').map(f => f.trim())
      results = results.map(item => {
        const newItem: JsonObject = {}
        fieldList.forEach(field => {
          if (field in item) {
            newItem[field] = item[field]
          }
        })
        return newItem
      })
    }
  }

  return {
    data: results,
    count: results.length,
    sql
  }
}

export const generateSampleSQL = (data: JsonValue): string[] => {
  if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
    const firstItem = data[0] as JsonObject
    const fields = Object.keys(firstItem).slice(0, 3)
    return [
      'SELECT * FROM data LIMIT 10',
      `SELECT ${fields.join(', ')} FROM data`,
      `SELECT * FROM data WHERE ${fields[0]} = 'value'`
    ]
  }
  return ['SELECT * FROM data']
}
