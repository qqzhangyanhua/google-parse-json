// URL/Base64/JWT decoding utilities
// Extracted from popup.tsx to eliminate code duplication

/**
 * Check if a string looks like Base64
 */
export const isLikelyBase64 = (s: string): boolean => {
  return (
    /^[A-Za-z0-9+/_-]+={0,2}$/.test(s.replace(/\s+/g, "")) &&
    s.replace(/\s+/g, "").length % 4 === 0
  )
}

/**
 * Decode Base64 to UTF-8 string
 */
export const base64ToUtf8 = (b64: string): string => {
  const norm = b64.replace(/-/g, "+").replace(/_/g, "/")
  const pad = "=".repeat((4 - (norm.length % 4 || 4)) % 4)
  const bin = atob(norm + pad)
  try {
    // Handle UTF-8 encoding
    return decodeURIComponent(escape(bin))
  } catch {
    return bin
  }
}

/**
 * Try to URL decode a string (handles double encoding)
 */
export const tryUrlDecode = (s: string): string | null => {
  try {
    const once = decodeURIComponent(s)
    return once.includes("%") ? decodeURIComponent(once) : once
  } catch {
    return null
  }
}

/**
 * Try to decode Base64 string
 */
export const tryBase64Decode = (s: string): string | null => {
  if (!isLikelyBase64(s)) return null
  try {
    return base64ToUtf8(s)
  } catch {
    return null
  }
}

/**
 * Try to decode JWT payload (middle segment)
 */
export const tryJwtDecode = (s: string): string | null => {
  const parts = s.split(".")
  if (parts.length !== 3) return null
  try {
    return base64ToUtf8(parts[1])
  } catch {
    return null
  }
}

/**
 * Extract first complete JSON object or array from mixed text
 * Handles nested structures and string escaping
 */
export const extractFirstJson = (text: string): string | null => {
  let start = -1
  const stack: string[] = []
  let inStr = false
  let strCh = ""
  let esc = false

  for (let i = 0; i < text.length; i++) {
    const ch = text[i]

    if (inStr) {
      if (esc) {
        esc = false
      } else if (ch === "\\") {
        esc = true
      } else if (ch === strCh) {
        inStr = false
        strCh = ""
      }
      continue
    }

    if (ch === '"' || ch === "'") {
      inStr = true
      strCh = ch
      continue
    }

    if (ch === "{" || ch === "[") {
      if (stack.length === 0) start = i
      stack.push(ch)
      continue
    }

    if (ch === "}" || ch === "]") {
      const last = stack[stack.length - 1]
      if ((last === "{" && ch === "}") || (last === "[" && ch === "]")) {
        stack.pop()
        if (stack.length === 0 && start !== -1) {
          const cand = text.slice(start, i + 1)
          try {
            JSON.parse(cand)
            return cand
          } catch {
            // Continue searching
          }
        }
      } else {
        // Mismatched brackets, reset
        stack.length = 0
        start = -1
      }
    }
  }

  return null
}
