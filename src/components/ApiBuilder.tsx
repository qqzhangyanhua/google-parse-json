import React, { useState, useMemo } from "react"
import { Input, Select, Button, Space, message, Segmented } from "antd"
import { CopyOutlined, ApiOutlined } from "@ant-design/icons"
import type { ApiBuilderProps, JsonValue } from "../types"

const { TextArea } = Input

type CodeLanguage = "curl" | "javascript" | "python"
type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE"

/**
 * Generate cURL command from request parameters
 */
function generateCurl(
  url: string,
  method: HttpMethod,
  body: JsonValue | null,
  headers: Record<string, string>
): string {
  const parts: string[] = [`curl -X ${method}`]

  // Add headers
  Object.entries(headers).forEach(([key, value]) => {
    parts.push(`  -H "${key}: ${value}"`)
  })

  // Add body for non-GET requests
  if (method !== "GET" && body !== null) {
    const jsonStr = JSON.stringify(body, null, 0).replace(/"/g, '\\"')
    parts.push(`  -d "${jsonStr}"`)
  }

  // Add URL
  parts.push(`  "${url}"`)

  return parts.join(" \\\n")
}

/**
 * Generate JavaScript fetch code
 */
function generateJavaScript(
  url: string,
  method: HttpMethod,
  body: JsonValue | null,
  headers: Record<string, string>
): string {
  const lines: string[] = ["fetch("]
  lines.push(`  "${url}",`)
  lines.push("  {")
  lines.push(`    method: "${method}",`)

  // Add headers
  lines.push("    headers: {")
  Object.entries(headers).forEach(([key, value], idx, arr) => {
    const comma = idx === arr.length - 1 ? "" : ","
    lines.push(`      "${key}": "${value}"${comma}`)
  })
  lines.push("    }")

  // Add body for non-GET requests
  if (method !== "GET" && body !== null) {
    lines.push("    ,")
    lines.push(`    body: JSON.stringify(${JSON.stringify(body, null, 6)})`)
  }

  lines.push("  }")
  lines.push(")")
  lines.push("  .then(res => res.json())")
  lines.push("  .then(data => console.log(data))")
  lines.push("  .catch(err => console.error(err));")

  return lines.join("\n")
}

/**
 * Generate Python requests code
 */
function generatePython(
  url: string,
  method: HttpMethod,
  body: JsonValue | null,
  headers: Record<string, string>
): string {
  const lines: string[] = ["import requests", "", `url = "${url}"`]

  // Add headers
  if (Object.keys(headers).length > 0) {
    lines.push("headers = {")
    Object.entries(headers).forEach(([key, value], idx, arr) => {
      const comma = idx === arr.length - 1 ? "" : ","
      lines.push(`    "${key}": "${value}"${comma}`)
    })
    lines.push("}")
  }

  // Add body
  if (method !== "GET" && body !== null) {
    lines.push(`json_data = ${JSON.stringify(body, null, 4)}`)
  }

  // Generate request call
  const args: string[] = [`"${url}"`]
  if (Object.keys(headers).length > 0) {
    args.push("headers=headers")
  }
  if (method !== "GET" && body !== null) {
    args.push("json=json_data")
  }

  const methodName = method.toLowerCase()
  lines.push("")
  lines.push(`response = requests.${methodName}(${args.join(", ")})`)
  lines.push("print(response.json())")

  return lines.join("\n")
}

export const ApiBuilder: React.FC<ApiBuilderProps> = ({ parsedValue }) => {
  const [url, setUrl] = useState<string>("https://api.example.com/endpoint")
  const [method, setMethod] = useState<HttpMethod>("POST")
  const [headersText, setHeadersText] = useState<string>(
    '{\n  "Content-Type": "application/json"\n}'
  )
  const [language, setLanguage] = useState<CodeLanguage>("curl")

  // Parse headers JSON
  const headers = useMemo<Record<string, string>>(() => {
    try {
      const parsed = JSON.parse(headersText)
      if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
        return parsed as Record<string, string>
      }
      return { "Content-Type": "application/json" }
    } catch {
      return { "Content-Type": "application/json" }
    }
  }, [headersText])

  // Generate code based on selected language
  const generatedCode = useMemo<string>(() => {
    if (!url.trim()) {
      return "// Please enter a URL"
    }

    try {
      switch (language) {
        case "curl":
          return generateCurl(url, method, parsedValue, headers)
        case "javascript":
          return generateJavaScript(url, method, parsedValue, headers)
        case "python":
          return generatePython(url, method, parsedValue, headers)
        default:
          return ""
      }
    } catch (err) {
      return `// Error generating code: ${err instanceof Error ? err.message : String(err)}`
    }
  }, [url, method, parsedValue, headers, language])

  // Copy generated code to clipboard
  const handleCopy = async (): Promise<void> => {
    try {
      await navigator.clipboard.writeText(generatedCode)
      message.success("代码已复制到剪贴板")
    } catch (err) {
      message.error("复制失败: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ApiOutlined style={{ fontSize: 20 }} />
        <span className="text-lg font-semibold">API 请求构建器</span>
      </div>

      {/* URL Input */}
      <div>
        <label className="block mb-1 text-sm font-medium">请求 URL</label>
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://api.example.com/endpoint"
          size="large"
        />
      </div>

      {/* Method Selection */}
      <div>
        <label className="block mb-1 text-sm font-medium">HTTP 方法</label>
        <Select<HttpMethod>
          value={method}
          onChange={setMethod}
          style={{ width: "100%" }}
          size="large"
          options={[
            { label: "GET", value: "GET" },
            { label: "POST", value: "POST" },
            { label: "PUT", value: "PUT" },
            { label: "PATCH", value: "PATCH" },
            { label: "DELETE", value: "DELETE" }
          ]}
        />
      </div>

      {/* Headers */}
      <div>
        <label className="block mb-1 text-sm font-medium">
          请求头（JSON 格式）
        </label>
        <TextArea
          value={headersText}
          onChange={(e) => setHeadersText(e.target.value)}
          placeholder='{"Content-Type": "application/json"}'
          rows={4}
          style={{ fontFamily: "monospace", fontSize: 12 }}
        />
      </div>

      {/* Language Selector */}
      <div>
        <label className="block mb-1 text-sm font-medium">代码语言</label>
        <Segmented<CodeLanguage>
          value={language}
          onChange={setLanguage}
          options={[
            { label: "cURL", value: "curl" },
            { label: "JavaScript", value: "javascript" },
            { label: "Python", value: "python" }
          ]}
          block
        />
      </div>

      {/* Generated Code */}
      <div>
        <div className="flex justify-between items-center mb-1">
          <label className="text-sm font-medium">生成的代码</label>
          <Button
            type="primary"
            size="small"
            icon={<CopyOutlined />}
            onClick={handleCopy}
          >
            复制
          </Button>
        </div>
        <pre
          className="p-3 rounded border overflow-auto"
          style={{
            backgroundColor: "#f5f5f5",
            fontFamily: "monospace",
            fontSize: 12,
            maxHeight: 300,
            whiteSpace: "pre-wrap",
            wordBreak: "break-all"
          }}
        >
          {generatedCode}
        </pre>
      </div>

      {/* Info */}
      {parsedValue === null && (
        <div className="text-sm text-gray-500">
          提示：当前没有解析的 JSON 数据，请求体将为空（仅对 GET 以外的方法有效）
        </div>
      )}
    </div>
  )
}
