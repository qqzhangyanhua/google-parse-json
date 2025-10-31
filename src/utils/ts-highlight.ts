// Zero-dependency TypeScript syntax highlighting
// Lightweight implementation for displaying generated types

const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

/**
 * Highlight normal code chunk (outside strings/comments)
 */
const highlightNormalChunk = (raw: string): string => {
  const kw = new Set([
    "export",
    "interface",
    "type",
    "extends",
    "implements",
    "enum",
    "const",
    "let",
    "var",
    "function",
    "return",
    "readonly",
    "as",
    "keyof",
    "in",
    "of",
    "new"
  ])

  const types = new Set([
    "string",
    "number",
    "boolean",
    "unknown",
    "null",
    "any",
    "never",
    "void",
    "Date",
    "Record",
    "Partial",
    "Pick",
    "Omit",
    "Readonly",
    "Required",
    "NonNullable",
    "Parameters",
    "ReturnType",
    "InstanceType"
  ])

  let out = ""
  let i = 0
  const n = raw.length

  while (i < n) {
    const ch = raw[i]

    // Numbers
    if (ch >= "0" && ch <= "9") {
      const m = raw.slice(i).match(/^\d+(?:\.\d+)?/)
      if (m) {
        out += `<span class="hl-num">${escapeHtml(m[0])}</span>`
        i += m[0].length
        continue
      }
    }

    // Identifiers/keywords/types
    if (
      (ch >= "A" && ch <= "Z") ||
      (ch >= "a" && ch <= "z") ||
      ch === "_" ||
      ch === "$"
    ) {
      const m = raw.slice(i).match(/^[A-Za-z_$][A-Za-z0-9_$]*/)
      if (m) {
        const tok = m[0]
        if (kw.has(tok)) out += `<span class="hl-kw">${tok}</span>`
        else if (types.has(tok)) out += `<span class="hl-type">${tok}</span>`
        else out += escapeHtml(tok)
        i += tok.length
        continue
      }
    }

    out += escapeHtml(ch)
    i++
  }

  return out
}

type Mode =
  | "normal"
  | "squote"
  | "dquote"
  | "bquote"
  | "linecom"
  | "blockcom"

/**
 * Highlight TypeScript code
 * Returns HTML with syntax highlighting classes
 */
export const highlightTs = (code: string): string => {
  let out = ""
  let i = 0
  const n = code.length
  let mode: Mode = "normal"
  let buf = ""

  const flush = () => {
    if (!buf) return

    if (mode === "normal") {
      out += highlightNormalChunk(buf)
    } else if (mode === "linecom" || mode === "blockcom") {
      out += `<span class="hl-com">${escapeHtml(buf)}</span>`
    } else {
      out += `<span class="hl-str">${escapeHtml(buf)}</span>`
    }

    buf = ""
  }

  while (i < n) {
    const ch = code[i]
    const next = i + 1 < n ? code[i + 1] : ""

    if (mode === "normal") {
      if (ch === "/" && next === "/") {
        flush()
        mode = "linecom"
        buf += ch
        i++
        buf += next
        i++
        continue
      }

      if (ch === "/" && next === "*") {
        flush()
        mode = "blockcom"
        buf += ch
        i++
        buf += next
        i++
        continue
      }

      if (ch === '"') {
        flush()
        mode = "dquote"
        buf += ch
        i++
        continue
      }

      if (ch === "'") {
        flush()
        mode = "squote"
        buf += ch
        i++
        continue
      }

      if (ch === "`") {
        flush()
        mode = "bquote"
        buf += ch
        i++
        continue
      }

      buf += ch
      i++
      continue
    }

    if (mode === "linecom") {
      buf += ch
      i++
      if (ch === "\n") {
        flush()
        mode = "normal"
      }
      continue
    }

    if (mode === "blockcom") {
      buf += ch
      i++
      if (ch === "*" && next === "/") {
        buf += next
        i++
        flush()
        mode = "normal"
      }
      continue
    }

    // String modes with escape handling
    if (mode === "dquote") {
      buf += ch
      i++
      if (ch === "\\") {
        if (i < n) {
          buf += code[i]
          i++
        }
      } else if (ch === '"') {
        flush()
        mode = "normal"
      }
      continue
    }

    if (mode === "squote") {
      buf += ch
      i++
      if (ch === "\\") {
        if (i < n) {
          buf += code[i]
          i++
        }
      } else if (ch === "'") {
        flush()
        mode = "normal"
      }
      continue
    }

    if (mode === "bquote") {
      buf += ch
      i++
      if (ch === "\\") {
        if (i < n) {
          buf += code[i]
          i++
        }
      } else if (ch === "`") {
        flush()
        mode = "normal"
      }
      continue
    }
  }

  flush()
  return out
}

/**
 * Simple local formatting for TypeScript code
 * Removes excessive blank lines and trims trailing whitespace
 */
export const formatTsLocal = (code: string): string => {
  if (!code) return code

  const lines = code.split(/\r?\n/)
  const out: string[] = []
  let blank = 0

  for (const ln of lines) {
    if (/^\s*$/.test(ln)) {
      blank++
      if (blank <= 1) out.push("")
    } else {
      blank = 0
      out.push(ln.replace(/\s+$/g, ""))
    }
  }

  const s = out.join("\n").replace(/\n{3,}/g, "\n\n")
  return s.endsWith("\n") ? s : s + "\n"
}
