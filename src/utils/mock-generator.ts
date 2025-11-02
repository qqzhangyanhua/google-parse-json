// Mock数据生成工具
import type { JsonValue, JsonObject } from "../types"

export interface MockOptions {
  count: number
  locale: 'zh' | 'en'
  seed?: number
}

const CHINESE_NAMES = ['张三', '李四', '王五', '赵六', '孙七', '周八', '吴九', '郑十']
const ENGLISH_NAMES = ['John', 'Jane', 'Bob', 'Alice', 'Charlie', 'Diana', 'Eve', 'Frank']
const COMPANIES = ['Apple', 'Google', 'Microsoft', 'Amazon', 'Meta', 'Tesla', 'Netflix', 'Adobe']
const CITIES_ZH = ['北京', '上海', '广州', '深圳', '杭州', '成都', '武汉', '西安']
const CITIES_EN = ['New York', 'London', 'Tokyo', 'Paris', 'Berlin', 'Sydney', 'Toronto', 'Moscow']

let seedValue = Date.now()

const random = () => {
  seedValue = (seedValue * 9301 + 49297) % 233280
  return seedValue / 233280
}

const randomInt = (min: number, max: number): number => {
  return Math.floor(random() * (max - min + 1)) + min
}

const randomItem = <T>(arr: T[]): T => {
  return arr[randomInt(0, arr.length - 1)]
}

const generateMockValue = (value: JsonValue, locale: 'zh' | 'en', fieldName?: string): JsonValue => {
  if (value === null) return null

  // 根据字段名生成智能数据
  if (fieldName) {
    const field = fieldName.toLowerCase()

    if (/email/.test(field)) {
      const name = locale === 'zh' ? 'user' : randomItem(ENGLISH_NAMES).toLowerCase()
      return `${name}${randomInt(100, 999)}@example.com`
    }

    if (/phone|mobile/.test(field)) {
      return locale === 'zh'
        ? `1${randomInt(30, 89)}${randomInt(10000000, 99999999)}`
        : `+1${randomInt(100, 999)}-${randomInt(100, 999)}-${randomInt(1000, 9999)}`
    }

    if (/name/.test(field)) {
      return randomItem(locale === 'zh' ? CHINESE_NAMES : ENGLISH_NAMES)
    }

    if (/company/.test(field)) {
      return randomItem(COMPANIES)
    }

    if (/city|address/.test(field)) {
      return randomItem(locale === 'zh' ? CITIES_ZH : CITIES_EN)
    }

    if (/url|website/.test(field)) {
      return `https://example-${randomInt(1, 100)}.com`
    }

    if (/date|time/.test(field)) {
      const now = Date.now()
      const randomOffset = randomInt(-365, 0) * 24 * 60 * 60 * 1000
      return new Date(now + randomOffset).toISOString()
    }
  }

  // 基于类型生成
  if (typeof value === 'string') {
    return fieldName ? generateMockValue(value, locale, fieldName) as string : `text_${randomInt(1000, 9999)}`
  }

  if (typeof value === 'number') {
    return Number.isInteger(value) ? randomInt(1, 1000) : parseFloat((random() * 1000).toFixed(2))
  }

  if (typeof value === 'boolean') {
    return random() > 0.5
  }

  if (Array.isArray(value)) {
    const length = Math.min(value.length, 5)
    return Array(length).fill(null).map(() =>
      value.length > 0 ? generateMockValue(value[0], locale) : null
    )
  }

  if (typeof value === 'object') {
    const obj = value as JsonObject
    const result: JsonObject = {}
    Object.entries(obj).forEach(([key, val]) => {
      result[key] = generateMockValue(val, locale, key)
    })
    return result
  }

  return value
}

export const generateMockData = (template: JsonValue, options: MockOptions): JsonValue[] => {
  if (options.seed) seedValue = options.seed

  const results: JsonValue[] = []

  for (let i = 0; i < options.count; i++) {
    results.push(generateMockValue(template, options.locale))
  }

  return results
}

export const PRESET_TEMPLATES: Record<string, JsonObject> = {
  user: {
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    phone: '1234567890',
    age: 25,
    city: 'Beijing'
  },
  product: {
    id: 1,
    name: 'Product Name',
    price: 99.99,
    stock: 100,
    category: 'Electronics',
    inStock: true
  },
  order: {
    orderId: 1001,
    userId: 1,
    amount: 299.99,
    status: 'pending',
    createdAt: '2024-01-01T00:00:00Z'
  }
}
