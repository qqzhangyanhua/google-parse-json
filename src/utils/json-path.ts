// JSONPath manipulation utilities
// Supports both bracket notation $["key"][0] and dot notation $.key[0]

import type { JsonValue, JsonObject } from "../types"

export type PathSegment = string | number

/**
 * Convert JSONPath string to array of segments
 * Supports: $["key"][0]["nested"]
 */
export const jsonPathToSegments = (p: string): PathSegment[] => {
  const segs: PathSegment[] = []
  const re = /\[(.*?)\]/g
  let m: RegExpExecArray | null

  while ((m = re.exec(p))) {
    const inner = m[1]
    if (/^\d+$/.test(inner)) {
      segs.push(Number(inner))
    } else {
      // Remove quotes and handle escaping
      const s = inner.trim()
      const q = s[0]
      if (q === '"' || q === "'") {
        try {
          segs.push(JSON.parse(s))
        } catch {
          segs.push(s.slice(1, -1))
        }
      } else {
        segs.push(inner)
      }
    }
  }

  return segs
}

/**
 * Convert segments to JSONPath bracket notation
 * Example: ["key", 0] => $["key"][0]
 */
export const segmentsToJsonPath = (segs: PathSegment[]): string => {
  let out = "$"
  for (const k of segs) {
    if (typeof k === "number" || /^\d+$/.test(String(k))) {
      out += `[${k}]`
    } else {
      out += `[${JSON.stringify(String(k))}]`
    }
  }
  return out
}

/**
 * Convert segments to dot notation
 * Example: ["key", 0] => $.key[0]
 */
export const segmentsToDotPath = (segs: PathSegment[]): string => {
  const isId = (s: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)
  let out = "$"

  for (const k of segs) {
    if (typeof k === "number") {
      out += `[${k}]`
    } else if (isId(k)) {
      out += `.${k}`
    } else if (/^\d+$/.test(k)) {
      out += `[${k}]`
    } else {
      out += `[${JSON.stringify(k)}]`
    }
  }

  return out
}

/**
 * Get value at path by segments
 */
export const getBySegments = (
  obj: JsonValue,
  segs: PathSegment[]
): JsonValue | undefined => {
  let cur: JsonValue = obj

  for (const k of segs) {
    if (cur == null) return undefined
    cur = (cur as JsonObject | JsonValue[])[k as keyof typeof cur] as JsonValue
  }

  return cur
}

/**
 * Search for paths matching a search term in keys or values
 * Returns JSONPath strings for all matches
 */
export const searchJsonPaths = (
  root: JsonValue,
  term: string
): string[] => {
  if (!term) return []

  const res: string[] = []
  const t = term.toLowerCase()

  const walk = (node: JsonValue, path: string): void => {
    if (Array.isArray(node)) {
      node.forEach((v, i) => walk(v, `${path}[${i}]`))
      return
    }

    if (node && typeof node === "object" && node !== null) {
      Object.entries(node).forEach(([k, v]) => {
        const keyHit = k.toLowerCase().includes(t)
        const valStr = typeof v === "string" ? v : JSON.stringify(v)
        const valHit = String(valStr).toLowerCase().includes(t)
        const next = `${path}[${JSON.stringify(k)}]`

        if (keyHit || valHit) res.push(next)
        walk(v, next)
      })
      return
    }

    // Primitive value match
    const valHit = String(node).toLowerCase().includes(t)
    if (valHit) res.push(path)
  }

  walk(root, "$")
  return res.slice(0, 200) // Limit results to prevent UI lag
}

/**
 * Convert JSON Pointer (from Ajv errors) to JSONPath
 * Example: "/a/0/b" => $["a"][0]["b"]
 */
export const pointerToJsonPath = (ptr: string): string => {
  if (!ptr || ptr === "") return "$"

  const segs = ptr
    .split("/")
    .slice(1)
    .map((s) => s.replace(/~1/g, "/").replace(/~0/g, "~"))

  let out = "$"
  for (const s of segs) {
    if (/^\d+$/.test(s)) {
      out += `[${s}]`
    } else {
      out += `[${JSON.stringify(s)}]`
    }
  }

  return out
}

/**
 * Download text as file
 */
export const downloadText = (text: string, filename = "data.txt"): void => {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

/**
 * Download JSON object as file
 */
export const downloadJson = (
  data: JsonValue,
  filename = "parsed.json"
): void => {
  const blob = new Blob([JSON.stringify(data, null, 2)], {
    type: "application/json"
  })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
