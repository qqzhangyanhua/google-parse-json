// 简易 JSON -> TypeScript 类型推断（零依赖）
// 目标：覆盖常见场景；支持对象合并、数组联合、可选字段、命名去重
// 注意：为控制体积与 MV3 CSP，不引入外部库

export type TsGenOptions = {
  rootName?: string
  arraySample?: number
  maxDepth?: number
  // 字符串枚举推断：
  // - false: 关闭
  // - 'auto' 或 true: 在数组场景优先保留字符串字面量，超限则退化为 string
  enumStrings?: boolean | 'auto'
  enumMaxUnique?: number // 枚举值个数上限，超出退化为 string（默认 8）
  enumMaxLength?: number // 单个枚举值最大长度，超出退化为 string（默认 32）
  // 数字枚举推断：与字符串同理
  enumNumbers?: boolean | 'auto'
  enumNumMaxUnique?: number // 默认 8
  // 日期字符串识别（ISO/RFC3339 常见格式）：true 启用 → 推断为 Date；false 关闭 → 依旧为 string
  detectDate?: boolean
}

type Kind = "string" | "number" | "boolean" | "null" | "unknown" | "object" | "array" | "union"

type TypeNode =
  | { kind: "string" | "number" | "boolean" | "null" | "unknown" }
  | { kind: "string-literal"; value: string }
  | { kind: "number-literal"; value: number }
  | { kind: "date" }
  | { kind: "object"; props: Record<string, { t: TypeNode; optional: boolean }> }
  | { kind: "array"; elem: TypeNode }
  | { kind: "union"; types: TypeNode[] }

const isValidId = (s: string) => /^[A-Za-z_$][A-Za-z0-9_$]*$/.test(s)
const quoteKey = (k: string) => (isValidId(k) ? k : JSON.stringify(k))
const toPascal = (s: string) =>
  (s || "Type")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((w) => (w[0] ? w[0].toUpperCase() + w.slice(1) : w))
    .join("")

// 生成结构签名用于去重
const sig = (n: TypeNode): string => {
  switch (n.kind) {
    case "string":
    case "number":
    case "boolean":
    case "null":
    case "unknown":
      return n.kind
    case "array":
      return `arr<${sig(n.elem)}>`
    case "union": {
      const ss = n.types.map(sig).sort()
      return `union<${ss.join("|")}>`
    }
    case "string-literal":
      return `str(${JSON.stringify(n.value)})`
    case "number-literal":
      return `num(${String(n.value)})`
    case "date":
      return `date`
    case "object": {
      const ks = Object.keys(n.props).sort()
      const ps = ks.map((k) => `${JSON.stringify(k)}${n.props[k].optional ? "?" : ""}:${sig(n.props[k].t)}`)
      return `obj{${ps.join(",")}}`
    }
  }
}

const normalizeEnumOptions = (opt: TsGenOptions) => ({
  enumStrings: opt.enumStrings === undefined ? 'auto' : opt.enumStrings,
  enumMaxUnique: opt.enumMaxUnique ?? 8,
  enumMaxLength: opt.enumMaxLength ?? 32,
  enumNumbers: opt.enumNumbers === undefined ? 'auto' : opt.enumNumbers,
  enumNumMaxUnique: opt.enumNumMaxUnique ?? 8,
  detectDate: opt.detectDate === true
})

const mergeUnion = (a: TypeNode, b: TypeNode, opt: TsGenOptions): TypeNode => {
  if (a.kind === "unknown") return b
  if (b.kind === "unknown") return a
  if (sig(a) === sig(b)) return a

  const arr: TypeNode[] = []
  const push = (x: TypeNode) => {
    const s = sig(x)
    if (!arr.some((y) => sig(y) === s)) arr.push(x)
  }
  const pa = a.kind === "union" ? a.types : [a]
  const pb = b.kind === "union" ? b.types : [b]
  ;[...pa, ...pb].forEach(push)
  // 枚举字符串退化规则
  const { enumStrings, enumMaxUnique, enumMaxLength, enumNumbers, enumNumMaxUnique } = normalizeEnumOptions(opt)
  const hasString = arr.some((t) => t.kind === 'string')
  const strLits = arr.filter((t): t is Extract<TypeNode, {kind:'string-literal'}> => t.kind === 'string-literal')
  if (hasString || (strLits.length > 0 && (enumStrings === false))) {
    // 存在通用 string 或未开启枚举 → 合并为 string
    const others = arr.filter((t) => t.kind !== 'string' && t.kind !== 'string-literal')
    const out = [...others, { kind: 'string' as const }]
    return out.length === 1 ? out[0] : { kind: 'union', types: out }
  }
  if (strLits.length > 0) {
    const tooMany = strLits.length > enumMaxUnique
    const tooLong = strLits.some((t) => (t.value || '').length > enumMaxLength)
    if (tooMany || tooLong) {
      const others = arr.filter((t) => t.kind !== 'string-literal')
      const out = [...others, { kind: 'string' as const }]
      return out.length === 1 ? out[0] : { kind: 'union', types: out }
    }
  }
  // 数字字面量退化规则
  const hasNumber = arr.some((t) => t.kind === 'number')
  const numLits = arr.filter((t): t is Extract<TypeNode, {kind:'number-literal'}> => t.kind === 'number-literal')
  if (hasNumber || (numLits.length > 0 && (enumNumbers === false))) {
    const others = arr.filter((t) => t.kind !== 'number' && t.kind !== 'number-literal')
    const out = [...others, { kind: 'number' as const }]
    return out.length === 1 ? out[0] : { kind: 'union', types: out }
  }
  if (numLits.length > 0) {
    const tooMany = numLits.length > enumNumMaxUnique
    if (tooMany) {
      const others = arr.filter((t) => t.kind !== 'number-literal')
      const out = [...others, { kind: 'number' as const }]
      return out.length === 1 ? out[0] : { kind: 'union', types: out }
    }
  }
  return arr.length === 1 ? arr[0] : { kind: "union", types: arr }
}

const mergeObjects = (as: Array<Extract<TypeNode, { kind: "object" }>>, opt: TsGenOptions): Extract<TypeNode, { kind: "object" }> => {
  const allKeys = new Set<string>()
  as.forEach((o) => Object.keys(o.props).forEach((k) => allKeys.add(k)))
  const props: Record<string, { t: TypeNode; optional: boolean }> = {}
  allKeys.forEach((k) => {
    const present = as.filter((o) => k in o.props)
    const missing = as.length - present.length
    const t = present.reduce<TypeNode>((acc, o) => (acc ? mergeUnion(acc, o.props[k].t, opt) : o.props[k].t), undefined as any)
    props[k] = { t, optional: missing > 0 || present.some((p) => p.props[k].optional) }
  })
  return { kind: "object", props }
}

const isLikelyIsoDate = (s: string): boolean => {
  // 覆盖常见 ISO-8601 / RFC3339 格式：YYYY-MM-DD, YYYY-MM-DDTHH:mm:ss(.sss)Z|±HH:mm
  // 以及简单的 "YYYY/MM/DD HH:mm:ss" 变体
  if (typeof s !== 'string') return false
  const iso = /^\d{4}-\d{2}-\d{2}(?:[Tt\s]\d{2}:\d{2}:\d{2}(?:\.\d{3})?(?:[Zz]|[+\-]\d{2}:?\d{2})?)?$/
  const slash = /^\d{4}[\/-]\d{1,2}[\/-]\d{1,2}(?:[Tt\s]\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?)?$/
  return iso.test(s) || slash.test(s)
}

const infer = (v: any, opt: TsGenOptions, depth: number, favorLiterals = false): TypeNode => {
  if (depth > (opt.maxDepth ?? 20)) return { kind: "unknown" }
  if (v === null) return { kind: "null" }
  const t = typeof v
  if (t === "string") {
    const { enumStrings, enumMaxLength, detectDate } = normalizeEnumOptions(opt)
    if (detectDate && isLikelyIsoDate(v)) {
      // 识别为 Date 类型
      return { kind: 'date' }
    }
    if (favorLiterals && (enumStrings === true || enumStrings === 'auto') && (v as string).length <= enumMaxLength) {
      return { kind: 'string-literal', value: v as string }
    }
    return { kind: "string" }
  }
  if (t === "number") {
    const { enumNumbers } = normalizeEnumOptions(opt)
    if (favorLiterals && (enumNumbers === true || enumNumbers === 'auto')) {
      return { kind: 'number-literal', value: v as number }
    }
    return { kind: "number" }
  }
  if (t === "boolean") return { kind: "boolean" }
  if (Array.isArray(v)) {
    if (v.length === 0) return { kind: "array", elem: { kind: "unknown" } }
    const sampleN = Math.min(v.length, opt.arraySample ?? 100)
    const elems = v.slice(0, sampleN).map((x) => infer(x, opt, depth + 1, true))
    const allObj = elems.every((e) => e.kind === "object")
    const elem = allObj ? mergeObjects(elems as any, opt) : elems.reduce((acc, cur) => mergeUnion(acc, cur, opt))
    return { kind: "array", elem }
  }
  if (t === "object") {
    const props: Record<string, { t: TypeNode; optional: boolean }> = {}
    for (const k of Object.keys(v)) {
      const child = infer(v[k], opt, depth + 1, false)
      props[k] = { t: child, optional: false }
    }
    return { kind: "object", props }
  }
  return { kind: "unknown" }
}

export const generateTsFromJson = (value: any, options: TsGenOptions = {}): string => {
  const opt: TsGenOptions = { rootName: "Root", arraySample: 100, maxDepth: 20, ...options }
  const root = infer(value, opt, 0, false)

  const nameBySig = new Map<string, string>()
  const taken = new Set<string>()
  const ensureName = (proposed: string, s: string) => {
    let base = toPascal(proposed || "Type") || "Type"
    if (!/^[A-Za-z_$]/.test(base)) base = "Type"
    let name = base
    let i = 2
    while (taken.has(name)) name = `${base}${i++}`
    taken.add(name)
    nameBySig.set(s, name)
    return name
  }

  const walkName = (n: TypeNode, propName: string, isRoot = false) => {
    switch (n.kind) {
      case "object": {
        const s = sig(n)
        if (!nameBySig.has(s)) ensureName(isRoot ? opt.rootName || "Root" : propName, s)
        Object.entries(n.props).forEach(([k, v]) => walkName(v.t, k, false))
        break
      }
      case "array": {
        walkName(n.elem, propName || "Item", false)
        break
      }
      case "union": {
        n.types.forEach((t) => walkName(t, propName, false))
        break
      }
    }
  }
  walkName(root, opt.rootName || "Root", true)

  const printed = new Set<string>()
  const lines: string[] = []

  const printTypeRef = (n: TypeNode): string => {
    switch (n.kind) {
      case "string":
      case "number":
      case "boolean":
      case "unknown":
        return n.kind
      case "null":
        return "null"
      case "union": {
        const parts = n.types.map(printTypeRef)
        const uniq = Array.from(new Set(parts)).sort()
        return uniq.length > 1 ? `(${uniq.join(" | ")})` : uniq[0]
      }
      case "date":
        return "Date"
      case "string-literal": {
        return JSON.stringify(n.value)
      }
      case "number-literal": {
        return String(n.value)
      }
      case "array": {
        const e = printTypeRef(n.elem)
        return `${e}[]`
      }
      case "object": {
        const s = sig(n)
        const nm = nameBySig.get(s)
        return nm || "{ [key: string]: unknown }"
      }
    }
  }

  const printInterfaces = (n: TypeNode) => {
    if (n.kind === "object") {
      const s = sig(n)
      if (!printed.has(s)) {
        printed.add(s)
        const nm = nameBySig.get(s)!
        lines.push(`export interface ${nm} {`)
        const ks = Object.keys(n.props).sort()
        for (let i = 0; i < ks.length; i++) {
          const k = ks[i]
          const { t, optional } = n.props[k]
          const key = quoteKey(k)
          lines.push(`  ${key}${optional ? "?" : ""}: ${printTypeRef(t)};`)
        }
        lines.push(`}`)
      }
      Object.entries(n.props).forEach(([, v]) => printInterfaces(v.t))
    } else if (n.kind === "array") {
      printInterfaces(n.elem)
    } else if (n.kind === "union") {
      n.types.forEach(printInterfaces)
    }
  }

  printInterfaces(root)

  if (root.kind === "object") {
    // 根为对象：interface 已生成，无需额外 type alias
  } else {
    const rootName = toPascal(opt.rootName || "Root")
    const typeExpr = printTypeRef(root)
    lines.push(`export type ${rootName} = ${typeExpr}`)
  }

  return lines.join("\n")
}
