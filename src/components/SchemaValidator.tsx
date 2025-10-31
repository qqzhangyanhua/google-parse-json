// Schema validator component - JSON Schema validation with Ajv/jsonschema

import React, { useState } from "react"
import { Button, List, message, Space, Input } from "antd"
import type { JsonValue } from "../types"
import { pointerToJsonPath } from "../utils/json-path"

const { TextArea } = Input

interface SchemaError {
  path: string
  message: string
  keyword?: string
}

interface SchemaValidatorProps {
  parsedValue: JsonValue | null
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
}

export const SchemaValidator: React.FC<SchemaValidatorProps> = ({
  parsedValue,
  onSelectPath,
  onCopyPath
}) => {
  const [schemaText, setSchemaText] = useState("")
  const [schemaBusy, setSchemaBusy] = useState(false)
  const [schemaResult, setSchemaResult] = useState<{
    ok: boolean
    errors?: SchemaError[]
  } | null>(null)

  const formatSchema = () => {
    try {
      if (!schemaText.trim()) return
      const obj = JSON.parse(schemaText)
      setSchemaText(JSON.stringify(obj, null, 2))
      message.success("已格式化 Schema")
    } catch {
      message.error("Schema 不是合法 JSON")
    }
  }

  const loadSampleSchema = () => {
    const sample = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      type: "object",
      properties: {
        id: { type: "number" },
        name: { type: "string" },
        tags: { type: "array", items: { type: "string" } }
      },
      required: ["id", "name"],
      additionalProperties: true
    }
    setSchemaText(JSON.stringify(sample, null, 2))
  }

  const validateBySchema = async () => {
    if (!parsedValue) {
      message.warning("请先解析出 JSON 再进行校验")
      return
    }
    if (!schemaText.trim()) {
      message.warning("请粘贴或编写 JSON Schema")
      return
    }

    try {
      setSchemaBusy(true)
      const schema = JSON.parse(schemaText)

      // Try Ajv first
      const tryAjv = async (): Promise<boolean> => {
        try {
          const $schema = (schema && typeof schema === "object")
            ? (schema as { $schema?: string }).$schema
            : undefined
          const need2020 = typeof $schema === "string" && /2020-12/.test($schema)
          const need2019 = typeof $schema === "string" && /2019-09/.test($schema)

          let AjvCtor
          if (need2020) {
            const Ajv2020Mod = await import("ajv/dist/2020")
            AjvCtor = (Ajv2020Mod as any).default || Ajv2020Mod
          } else if (need2019) {
            const Ajv2019Mod = await import("ajv/dist/2019")
            AjvCtor = (Ajv2019Mod as any).default || Ajv2019Mod
          } else {
            const AjvMod = await import("ajv")
            AjvCtor = (AjvMod as any).default || AjvMod
          }

          let addFormats
          try {
            const fmt = await import("ajv-formats")
            addFormats = (fmt as any).default || fmt
          } catch {}

          const ajv = new AjvCtor({ allErrors: true, strict: false, allowUnionTypes: true })

          // Register meta schemas
          try {
            if (need2020) {
              const meta2020 = await import("ajv/dist/refs/json-schema-2020-12/schema.json")
              ajv.addMetaSchema((meta2020 as any).default || meta2020)
            } else if (need2019) {
              const meta2019 = await import("ajv/dist/refs/json-schema-2019-09/schema.json")
              ajv.addMetaSchema((meta2019 as any).default || meta2019)
            }
          } catch {}

          if (addFormats) addFormats(ajv)

          const validate = ajv.compile(schema)
          const ok = validate(parsedValue)

          if (ok) {
            setSchemaResult({ ok: true })
            message.success("Schema 校验通过")
          } else {
            const errs = (validate.errors || []).map((e: any) => ({
              path: pointerToJsonPath(e.instancePath || e.dataPath || ""),
              message: e.message || "校验失败",
              keyword: e.keyword
            }))
            setSchemaResult({ ok: false, errors: errs })
            message.error(`Schema 未通过：${errs.length} 处问题`)
          }
          return true
        } catch (err: unknown) {
          const error = err as { message?: string }
          const msg = String(error?.message || "")
          const isCspEval = /unsafe-eval|Refused to evaluate|Code generation from strings/i.test(msg)
          if (isCspEval) {
            console.warn("因 MV3 CSP 限制，Ajv 无法运行，降级为 jsonschema 校验")
          }
          return false
        }
      }

      // Fallback to jsonschema
      const tryJsonSchema = async (): Promise<boolean> => {
        try {
          const mod = await import("jsonschema")
          const validate = (mod as any).validate || (mod as any).default?.validate
          if (typeof validate !== "function") throw new Error("jsonschema 库未正确加载")

          const res = validate(parsedValue, schema)
          if (res.valid) {
            setSchemaResult({ ok: true })
            message.success("Schema 校验通过")
          } else {
            const toPath = (prop: string): string => {
              let p = prop || ""
              if (p.startsWith("instance")) p = p.slice("instance".length)
              let out = "$"
              const re = /(\.[A-Za-z_$][A-Za-z0-9_$]*)|(\[(\d+)\])/g
              let m: RegExpExecArray | null
              while ((m = re.exec(p))) {
                if (m[1]) {
                  const key = m[1].slice(1)
                  out += `[${JSON.stringify(key)}]`
                } else if (m[3]) {
                  out += `[${m[3]}]`
                }
              }
              return out
            }

            const errs = (res.errors || []).map((e: any) => ({
              path: toPath(e.property || ""),
              message: e.message || "校验失败",
              keyword: e.name || e.keyword
            }))
            setSchemaResult({ ok: false, errors: errs })
            message.error(`Schema 未通过：${errs.length} 处问题`)
          }
          return true
        } catch {
          return false
        }
      }

      const okAjv = await tryAjv()
      if (!okAjv) {
        const okJson = await tryJsonSchema()
        if (!okJson) throw new Error("两种校验方式均失败")
      }
    } catch {
      message.error("Schema 编译或校验失败，请检查 Schema 是否正确")
    } finally {
      setSchemaBusy(false)
    }
  }

  return (
    <div>
      <div className="font-medium text-gray-700 mb-2">Schema 校验</div>
      <div className="flex items-center gap-2 mb-2">
        <Button onClick={loadSampleSchema} size="small">
          示例
        </Button>
        <Button onClick={formatSchema} size="small">
          格式化
        </Button>
        <Button
          type="primary"
          loading={schemaBusy}
          onClick={validateBySchema}
          size="small"
        >
          校验
        </Button>
      </div>
      <TextArea
        value={schemaText}
        onChange={(e) => setSchemaText(e.target.value)}
        placeholder='粘贴或编写 JSON Schema（例如 {"type":"object", "properties":{...}}）'
        rows={8}
        className="mb-2"
      />
      {schemaResult && (
        <div className="border rounded-md p-2 bg-gray-50">
          {schemaResult.ok ? (
            <div className="text-green-600 text-sm">校验通过</div>
          ) : schemaResult.errors && schemaResult.errors.length > 0 ? (
            <List
              size="small"
              dataSource={schemaResult.errors}
              renderItem={(er) => (
                <List.Item className="!py-1">
                  <Space size={8}>
                    <Button size="small" onClick={() => onSelectPath(er.path)}>
                      定位
                    </Button>
                    <Button size="small" onClick={() => onCopyPath(er.path)}>
                      复制路径
                    </Button>
                  </Space>
                  <span className="text-xs text-gray-700 ml-2">{er.path}</span>
                  <span className="text-xs text-red-600 ml-2">{er.message}</span>
                  {er.keyword && (
                    <span className="text-xs text-gray-500 ml-2">
                      ({er.keyword})
                    </span>
                  )}
                </List.Item>
              )}
            />
          ) : (
            <div className="text-gray-500 text-xs">无错误</div>
          )}
        </div>
      )}
    </div>
  )
}
