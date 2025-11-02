// 数据脱敏工具
import type { JsonValue, JsonObject } from "../types"

export type MaskType = 'partial' | 'full' | 'hash' | 'replace'

export interface MaskRule {
  id: string
  name: string
  pattern: RegExp
  maskType: MaskType
  enabled: boolean
  replacement?: string
}

export const DEFAULT_MASK_RULES: MaskRule[] = [
  { id: 'email', name: '邮箱地址', pattern: /email|mail/i, maskType: 'partial', enabled: true },
  { id: 'phone', name: '手机号码', pattern: /phone|mobile|tel/i, maskType: 'partial', enabled: true },
  { id: 'idcard', name: '身份证号', pattern: /id_?card|passport|ssn/i, maskType: 'partial', enabled: true },
  { id: 'password', name: '密码字段', pattern: /password|pwd|secret/i, maskType: 'full', enabled: true },
  { id: 'credit', name: '信用卡号', pattern: /credit|card|cvv/i, maskType: 'partial', enabled: true },
  { id: 'ip', name: 'IP地址', pattern: /ip_?address|ip/i, maskType: 'partial', enabled: true },
  { id: 'address', name: '地址信息', pattern: /address|addr|location/i, maskType: 'hash', enabled: true },
  { id: 'name', name: '姓名字段', pattern: /name|username/i, maskType: 'partial', enabled: true },
]

const maskValue = (value: string, maskType: MaskType, replacement?: string): string => {
  if (typeof value !== 'string') return value

  switch (maskType) {
    case 'full':
      return '*'.repeat(Math.min(value.length, 10))
    case 'partial':
      if (value.length <= 2) return '*'
      if (value.length <= 4) return value[0] + '*'.repeat(value.length - 1)
      const showLen = Math.ceil(value.length * 0.3)
      return value.substring(0, showLen) + '*'.repeat(value.length - showLen * 2) + value.substring(value.length - showLen)
    case 'hash':
      const hashCode = value.split('').reduce((hash, char) => ((hash << 5) - hash + char.charCodeAt(0)) | 0, 0)
      return `hash_${hashCode.toString(16).substring(0, 8)}`
    case 'replace':
      return replacement || '***'
    default:
      return value
  }
}

export const maskData = (data: JsonValue, rules: MaskRule[]): { maskedData: JsonValue; log: string[] } => {
  const log: string[] = []
  const enabledRules = rules.filter(r => r.enabled)

  const mask = (val: JsonValue, path: string = '$'): JsonValue => {
    if (val === null || typeof val !== 'object') return val

    if (Array.isArray(val)) {
      return val.map((item, idx) => mask(item, `${path}[${idx}]`))
    }

    const obj = val as JsonObject
    const result: JsonObject = {}

    Object.entries(obj).forEach(([key, value]) => {
      const matchedRule = enabledRules.find(rule => rule.pattern.test(key))

      if (matchedRule && typeof value === 'string') {
        result[key] = maskValue(value, matchedRule.maskType, matchedRule.replacement)
        log.push(`${path}.${key}: 应用规则 "${matchedRule.name}"`)
      } else if (value && typeof value === 'object') {
        result[key] = mask(value, `${path}.${key}`)
      } else {
        result[key] = value
      }
    })

    return result
  }

  return { maskedData: mask(data), log }
}
