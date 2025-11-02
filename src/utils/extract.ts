// 批量抽取与扁平化导出工具
// 基于现有 JSONPath 工具实现：支持多路径提取、数组展开为多行、CSV 导出

import type { JsonValue } from "../types"
import { jsonPathToSegments, getBySegments } from "./json-path"

export type ExtractOptions = {
  // 是否将数组展开为多行（选择主数组列进行展开，其他非等长数组将被 join）
  expandArrays?: boolean
  // 数组未展开（或非主数组）时的连接符
  joiner?: string
  // 空值占位
  placeholder?: string
  // 指定主数组列索引（与 paths 对齐，优先于自动最长）
  primaryIndex?: number
}

export type ExtractResult = {
  header: string[]
  rows: string[][]
  stats: {
    expanded: boolean
    primaryLen: number
    totalRows: number
  }
}

// 将任意值格式化为 CSV 单元格文本
const cellToString = (v: unknown, joiner: string, placeholder: string): string => {
  if (v === null || v === undefined) return placeholder
  if (Array.isArray(v)) {
    // 未被展开的数组，使用连接符连接，复杂元素 JSON 化
    return v
      .map((x) => (typeof x === "object" ? JSON.stringify(x) : String(x)))
      .join(joiner)
  }
  if (typeof v === "object") return JSON.stringify(v)
  return String(v)
}

// 简单 CSV 转义
const csvEscape = (s: string): string => '"' + s.replace(/"/g, '""') + '"'

export const toCsv = (header: string[], rows: string[][]): string => {
  const out: string[] = []
  out.push(header.map(csvEscape).join(","))
  for (const r of rows) out.push(r.map(csvEscape).join(","))
  return out.join("\n")
}

// 主算法：根据多条 JSONPath 抽取二维表
export const extractToTable = (
  root: JsonValue,
  paths: string[],
  opt: ExtractOptions = {}
): ExtractResult => {
  const joiner = opt.joiner ?? ","
  const placeholder = opt.placeholder ?? ""
  const expand = Boolean(opt.expandArrays)

  const header = paths.map((p) => p.trim()).filter(Boolean)
  if (header.length === 0) {
    return { header: [], rows: [], stats: { expanded: false, primaryLen: 0, totalRows: 0 } }
  }

  // 解析路径并取值
  const segList = header.map((p) => jsonPathToSegments(p))
  const values = segList.map((segs) => getBySegments(root, segs))

  // 计算主数组长度（取所选列中长度最大的数组作为主数组）
  const lengths = values.map((v) => (Array.isArray(v) ? v.length : 1))
  let primaryLen = 1
  if (expand) {
    if (typeof opt.primaryIndex === "number" && opt.primaryIndex >= 0 && opt.primaryIndex < values.length) {
      const pv = values[opt.primaryIndex]
      primaryLen = Array.isArray(pv) ? pv.length : 1
    } else {
      primaryLen = Math.max(...lengths)
    }
  }

  const rows: string[][] = []
  if (primaryLen <= 1) {
    const row = values.map((v) => cellToString(v as unknown, joiner, placeholder))
    rows.push(row)
  } else {
    // 按主数组长度展开
    for (let i = 0; i < primaryLen; i++) {
      const row: string[] = []
      for (let c = 0; c < values.length; c++) {
        const v = values[c]
        if (Array.isArray(v)) {
          if (v.length === primaryLen) {
            row.push(cellToString(v[i] as unknown, joiner, placeholder))
          } else {
            // 非等长数组：不展开，join 显示
            row.push(cellToString(v as unknown, joiner, placeholder))
          }
        } else {
          // 标量/对象：复制填充
          row.push(cellToString(v as unknown, joiner, placeholder))
        }
      }
      rows.push(row)
    }
  }

  return { header, rows, stats: { expanded: primaryLen > 1, primaryLen, totalRows: rows.length } }
}
