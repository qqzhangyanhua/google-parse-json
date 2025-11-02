// JSON差异对比工具
import type { JsonValue, JsonObject } from "../types"

export type DiffType = 'added' | 'removed' | 'modified' | 'unchanged'

export interface DiffResult {
  path: string
  type: DiffType
  oldValue?: JsonValue
  newValue?: JsonValue
}

export const compareJSON = (oldData: JsonValue, newData: JsonValue): DiffResult[] => {
  const results: DiffResult[] = []

  const compare = (old: JsonValue, newVal: JsonValue, path: string) => {
    // 完全相同
    if (JSON.stringify(old) === JSON.stringify(newVal)) {
      results.push({ path, type: 'unchanged' })
      return
    }

    // 类型不同
    const oldType = Array.isArray(old) ? 'array' : typeof old
    const newType = Array.isArray(newVal) ? 'array' : typeof newVal

    if (oldType !== newType) {
      results.push({ path, type: 'modified', oldValue: old, newValue: newVal })
      return
    }

    // 基本类型比较
    if (oldType !== 'object') {
      results.push({ path, type: 'modified', oldValue: old, newValue: newVal })
      return
    }

    // 数组比较
    if (Array.isArray(old) && Array.isArray(newVal)) {
      const maxLen = Math.max(old.length, newVal.length)
      for (let i = 0; i < maxLen; i++) {
        if (i >= old.length) {
          results.push({ path: `${path}[${i}]`, type: 'added', newValue: newVal[i] })
        } else if (i >= newVal.length) {
          results.push({ path: `${path}[${i}]`, type: 'removed', oldValue: old[i] })
        } else {
          compare(old[i], newVal[i], `${path}[${i}]`)
        }
      }
      return
    }

    // 对象比较
    const oldObj = old as JsonObject
    const newObj = newVal as JsonObject
    const allKeys = new Set([...Object.keys(oldObj), ...Object.keys(newObj)])

    allKeys.forEach(key => {
      const keyPath = path ? `${path}.${key}` : key
      const hasOld = key in oldObj
      const hasNew = key in newObj

      if (!hasOld) {
        results.push({ path: keyPath, type: 'added', newValue: newObj[key] })
      } else if (!hasNew) {
        results.push({ path: keyPath, type: 'removed', oldValue: oldObj[key] })
      } else {
        compare(oldObj[key], newObj[key], keyPath)
      }
    })
  }

  compare(oldData, newData, '$')
  return results
}

export const generateDiffReport = (diffs: DiffResult[]): string => {
  const added = diffs.filter(d => d.type === 'added').length
  const removed = diffs.filter(d => d.type === 'removed').length
  const modified = diffs.filter(d => d.type === 'modified').length
  const unchanged = diffs.filter(d => d.type === 'unchanged').length

  const lines = [
    '# JSON差异对比报告',
    '',
    '## 统计摘要',
    `- 新增字段: ${added}`,
    `- 删除字段: ${removed}`,
    `- 修改字段: ${modified}`,
    `- 未变化: ${unchanged}`,
    '',
    '## 详细差异',
    ''
  ]

  diffs.filter(d => d.type !== 'unchanged').forEach(diff => {
    const icon = diff.type === 'added' ? '➕' : diff.type === 'removed' ? '➖' : '📝'
    lines.push(`${icon} ${diff.path} (${diff.type})`)
    if (diff.oldValue !== undefined) lines.push(`  旧值: ${JSON.stringify(diff.oldValue)}`)
    if (diff.newValue !== undefined) lines.push(`  新值: ${JSON.stringify(diff.newValue)}`)
  })

  return lines.join('\n')
}
