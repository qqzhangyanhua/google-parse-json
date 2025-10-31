// JSON parsing utilities with smart decoding and nested parsing
// Extracted from popup.tsx for better modularity

import type { JsonValue, JsonObject, JsonArray, SmartParseOptions, SmartParseResult } from "../types"
import {
  tryUrlDecode,
  tryBase64Decode,
  tryJwtDecode,
  extractFirstJson
} from "./decoders"

/**
 * Try to parse a string as JSON
 * Returns parsed value or original string if parsing fails
 */
export const tryParseJSON = (str: string): JsonValue => {
  try {
    // Check if it looks like JSON
    if (
      typeof str === "string" &&
      (str.startsWith("{") || str.startsWith("[")) &&
      (str.endsWith("}") || str.endsWith("]"))
    ) {
      return JSON.parse(str) as JsonValue
    }
  } catch {
    // If parsing fails, return original string
  }
  return str
}

/**
 * Recursively parse nested JSON strings
 * Processes all string values that might be JSON
 */
export const parseNestedJSON = (obj: JsonValue): JsonValue => {
  if (obj === null || obj === undefined) return obj

  if (typeof obj === "string") {
    return tryParseJSON(obj)
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => parseNestedJSON(item)) as JsonArray
  }

  if (typeof obj === "object") {
    const result: JsonObject = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseNestedJSON(value)
    }
    return result
  }

  return obj
}

/**
 * Sort object keys recursively
 */
export const sortKeysDeep = (v: JsonValue): JsonValue => {
  if (Array.isArray(v)) return v.map(sortKeysDeep) as JsonArray

  if (v && typeof v === "object" && v !== null) {
    return Object.keys(v)
      .sort()
      .reduce((acc, k) => {
        acc[k] = sortKeysDeep((v as JsonObject)[k])
        return acc
      }, {} as JsonObject)
  }

  return v
}

/**
 * Smart JSON parser with auto-decoding and multiple fallback strategies
 * Handles URL encoding, Base64, JWT, URL parameters, and mixed log text
 */
export const parseSmart = (
  raw: string,
  opt: SmartParseOptions = {}
): SmartParseResult => {
  const steps: string[] = []

  const tryJson = (s: string): JsonValue | null => {
    const trimmed = s.trim()
    try {
      const obj = JSON.parse(trimmed)
      steps.push("直接 JSON.parse 成功")
      return obj as JsonValue
    } catch {
      // Parse failed
    }
    return null
  }

  let obj: JsonValue | null = tryJson(raw)

  // Try auto-decoding strategies
  if (!obj && opt.autoDecode) {
    // URL decoding
    const url = tryUrlDecode(raw)
    if (url && !obj) {
      obj = tryJson(url)
      if (obj) steps.push("URL 解码后解析成功")
    }

    // JWT decoding
    if (!obj) {
      const jwt = tryJwtDecode(raw)
      if (jwt) {
        obj = tryJson(jwt) ?? tryJson(tryUrlDecode(jwt) ?? jwt)
        if (obj) steps.push("JWT 解码负载后解析成功")
      }
    }

    // Base64 decoding
    if (!obj) {
      const b64 = tryBase64Decode(raw)
      if (b64) {
        obj = tryJson(b64) ?? tryJson(tryUrlDecode(b64) ?? b64)
        if (obj) steps.push("Base64 解码后解析成功")
      }
    }
  }

  // Try parsing as URL with query parameters
  if (!obj) {
    try {
      const u = new URL(raw.trim())
      const toKV = (sp: URLSearchParams): JsonObject => {
        const out: JsonObject = {}
        sp.forEach((v, k) => {
          // Try decoding each parameter value
          const cand =
            tryJson(v) ||
            tryJson(tryUrlDecode(v) ?? v) ||
            (() => {
              const j = tryJwtDecode(v)
              return j ? tryJson(j) || tryJson(tryUrlDecode(j) ?? j) : null
            })() ||
            (() => {
              const b = tryBase64Decode(v)
              return b ? tryJson(b) || tryJson(tryUrlDecode(b) ?? b) : null
            })() ||
            v

          if (k in out) {
            const prev = out[k]
            out[k] = Array.isArray(prev) ? [...prev, cand] : [prev, cand]
          } else {
            out[k] = cand
          }
        })
        return out
      }

      const queryObj = toKV(u.searchParams)
      const hashObj = u.hash
        ? toKV(new URLSearchParams(u.hash.replace(/^#\??/, "")))
        : {}

      const payload: JsonObject = {
        url: u.origin + u.pathname,
        ...queryObj,
        ...(Object.keys(hashObj).length ? { hash: hashObj } : {})
      }

      if (Object.keys(payload).length > 1) {
        obj = payload
        steps.push("从 URL 参数解析成功")
      }
    } catch {
      // Not a valid URL
    }
  }

  // Try extracting JSON from mixed log text
  if (!obj) {
    const sub = extractFirstJson(raw)
    if (sub) {
      obj = tryJson(sub)
      if (obj) steps.push("从日志中提取子串解析成功")
    }
  }

  if (!obj) throw new Error("未能解析出有效 JSON")

  const finalObj = opt.parseNested ? parseNestedJSON(obj) : obj
  const output = opt.sortKeys ? sortKeysDeep(finalObj) : finalObj

  return { data: output, steps }
}
