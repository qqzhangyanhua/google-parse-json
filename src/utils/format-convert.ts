// 多格式互转工具：JSON ↔ YAML/TOML/CSV

import type { JsonValue, JsonObject } from "../types"

export type DataFormat = "json" | "yaml" | "toml" | "csv" | "js"

export interface ConvertResult {
  text: string
  notice?: string
}

export interface ParseResult {
  value: JsonValue
  notice?: string
}

const ensureObjectForToml = (value: JsonValue): { data: JsonObject; wrapped: boolean } => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { data: value as JsonObject, wrapped: false }
  }
  return { data: { value }, wrapped: true }
}

export const convertJsonToFormat = async (value: JsonValue, format: DataFormat): Promise<ConvertResult> => {
  const normalized = typeof value === "undefined" ? null : value
  switch (format) {
    case "json": {
      return { text: JSON.stringify(normalized, null, 2) }
    }
    case "yaml": {
      const mod = await import("js-yaml")
      const yaml = (mod as any).default || mod
      return { text: yaml.dump(normalized) }
    }
    case "js": {
      const jsonText = JSON.stringify(normalized, null, 2)
      const text = `const data = ${jsonText} as const;\nexport default data;\n`
      return { text }
    }
    case "toml": {
      const mod = await import("@iarna/toml")
      const toml = (mod as any).stringify || mod.stringify
      if (typeof toml !== "function") throw new Error("TOML 转换库未正确加载")
      const { data, wrapped } = ensureObjectForToml(normalized)
      const text = toml(data)
      return wrapped
        ? { text, notice: "TOML 顶层需要对象，已将结果包装在 value 字段" }
        : { text }
    }
    case "csv": {
      const mod = await import("papaparse")
      const Papa = (mod as any).default || mod
      if (!Papa?.unparse) throw new Error("CSV 导出库未正确加载")
      const ready = (() => {
        if (Array.isArray(normalized)) return normalized
        if (normalized && typeof normalized === "object") return [normalized]
        return [{ value: normalized }]
      })()
      const notice = Array.isArray(normalized) || (normalized && typeof normalized === "object")
        ? undefined
        : "CSV 仅支持对象/数组，原始值已放入 value 字段"
      return { text: Papa.unparse(ready), notice }
    }
    default:
      throw new Error(`不支持的导出格式: ${format}`)
  }
}

export const parseTextToJson = async (text: string, format: DataFormat): Promise<ParseResult> => {
  switch (format) {
    case "json": {
      return { value: JSON.parse(text) }
    }
    case "yaml": {
      const mod = await import("js-yaml")
      const yaml = (mod as any).default || mod
      return { value: yaml.load(text) as JsonValue }
    }
    case "js": {
      const mod = await import("json5")
      const json5 = (mod as any).default || mod
      if (typeof json5?.parse !== "function") throw new Error("JSON5 解析库未正确加载")
      return { value: json5.parse(text) as JsonValue }
    }
    case "toml": {
      const mod = await import("@iarna/toml")
      const toml = (mod as any).parse || mod.parse
      if (typeof toml !== "function") throw new Error("TOML 转换库未正确加载")
      return { value: toml(text) as JsonValue }
    }
    case "csv": {
      const mod = await import("papaparse")
      const Papa = (mod as any).default || mod
      if (!Papa?.parse) throw new Error("CSV 解析库未正确加载")
      const result = Papa.parse(text, { header: true, skipEmptyLines: true })
      if (result.errors && result.errors.length > 0) {
        const first = result.errors[0]
        const msg = first.message || "CSV 解析失败"
        const row = typeof first.row === "number" ? `（第 ${first.row + 1} 行）` : ""
        throw new Error(`${msg}${row}`)
      }
      if (Array.isArray(result.data) && result.data.length > 0) {
        return { value: result.data as JsonValue }
      }
      // 如果没有表头则尝试无表头解析
      const plain = Papa.parse(text, { header: false, skipEmptyLines: true })
      if (plain.errors && plain.errors.length > 0) {
        const first = plain.errors[0]
        const msg = first.message || "CSV 解析失败"
        const row = typeof first.row === "number" ? `（第 ${first.row + 1} 行）` : ""
        throw new Error(`${msg}${row}`)
      }
      return { value: plain.data as JsonValue, notice: "未检测到表头，结果为二维数组" }
    }
    default:
      throw new Error(`不支持的导入格式: ${format}`)
  }
}
