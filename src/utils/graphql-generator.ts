// GraphQL Schema生成工具
import type { JsonValue, JsonObject } from "../types"

export const generateGraphQLSchema = (data: JsonValue, typeName: string = 'Root'): string => {
  const types = new Set<string>()

  const inferType = (val: JsonValue, name: string): string => {
    if (val === null) return 'String'
    if (typeof val === 'string') return 'String'
    if (typeof val === 'number') return Number.isInteger(val) ? 'Int' : 'Float'
    if (typeof val === 'boolean') return 'Boolean'

    if (Array.isArray(val)) {
      if (val.length === 0) return '[String]'
      const itemType = inferType(val[0], name)
      return `[${itemType}]`
    }

    if (typeof val === 'object') {
      const objTypeName = name.charAt(0).toUpperCase() + name.slice(1)
      types.add(generateObjectType(val as JsonObject, objTypeName))
      return objTypeName
    }

    return 'String'
  }

  const generateObjectType = (obj: JsonObject, name: string): string => {
    const fields: string[] = []

    Object.entries(obj).forEach(([key, value]) => {
      const fieldName = key.replace(/[^a-zA-Z0-9_]/g, '_')
      const fieldType = inferType(value, fieldName)
      const required = value !== null && value !== undefined ? '!' : ''
      fields.push(`  ${fieldName}: ${fieldType}${required}`)
    })

    return `type ${name} {\n${fields.join('\n')}\n}`
  }

  const rootType = generateObjectType(data as JsonObject, typeName)
  const allTypes = [rootType, ...Array.from(types)].join('\n\n')
  const queries = `type Query {\n  ${typeName.toLowerCase()}: ${typeName}\n  ${typeName.toLowerCase()}s: [${typeName}]!\n}`

  return `${allTypes}\n\n${queries}`
}
