import React, { useState } from "react"
import { Button, Input, message } from "antd"
import ReactJson from "react-json-view"
import "./style.css"

const { TextArea } = Input

// 尝试解析可能的 JSON 字符串
const tryParseJSON = (str: string): any => {
  try {
    // 检查是否是 JSON 字符串
    if (typeof str === 'string' && 
        (str.startsWith('{') || str.startsWith('[')) && 
        (str.endsWith('}') || str.endsWith(']'))) {
      return JSON.parse(str)
    }
  } catch (e) {
    // 如果解析失败，返回原始字符串
  }
  return str
}

// 递归处理对象，解析所有可能的 JSON 字符串
const parseNestedJSON = (obj: any): any => {
  if (obj === null || obj === undefined) return obj
  
  if (typeof obj === 'string') {
    return tryParseJSON(obj)
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => parseNestedJSON(item))
  }
  
  if (typeof obj === 'object') {
    const result: any = {}
    for (const [key, value] of Object.entries(obj)) {
      result[key] = parseNestedJSON(value)
    }
    return result
  }
  
  return obj
}

const IndexPopup = () => {
  const [inputValue, setInputValue] = useState("")
  const [parsedValue, setParsedValue] = useState<any>(null)
  const [error, setError] = useState("")

  const handleParse = () => {
    if (!inputValue.trim()) {
      setError("Please enter a JSON string")
      setParsedValue(null)
      message.warning("Please enter a JSON string")
      return
    }

    try {
      const parsed = JSON.parse(inputValue)
      // 递归解析所有嵌套的 JSON 字符串
      const fullyParsed = parseNestedJSON(parsed)
      setParsedValue(fullyParsed)
      setError("")
      message.success("Successfully parsed!")
    } catch (err) {
      setError("Invalid JSON string")
      setParsedValue(null)
      message.error("Invalid JSON string")
    }
  }

  const handleCopy = (e: any) => {
    // 获取正确的值
    const copyValue = typeof e.src === "object" ? 
      JSON.stringify(e.src, null, 2) : 
      String(e.src)
    
    navigator.clipboard.writeText(copyValue).then(() => {
      message.success("Copied to clipboard!")
    }).catch(() => {
      message.error("Failed to copy")
    })
    return true
  }

  return (
    <div className="w-[800px] min-h-[400px] p-6 bg-white">
      <h1 className="text-2xl font-bold mb-4 text-center text-gray-800">
        JSON Parser
      </h1>
      <div className="flex gap-4">
        <div className="flex-1">
          <div className="mb-2 font-medium text-gray-700">Input JSON String:</div>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Enter JSON string here..."
            className="mb-4"
            rows={12}
          />
        </div>
        <div className="flex-1">
          <div className="mb-2 font-medium text-gray-700">Parsed Result:</div>
          <div className="border rounded-md p-3 min-h-[288px] bg-gray-50 overflow-auto">
            {error ? (
              <div className="text-red-500 text-sm">{error}</div>
            ) : parsedValue ? (
              <ReactJson 
                src={parsedValue}
                theme="rjv-default"
                name={false}
                collapsed={2}
                collapseStringsAfterLength={30}
                enableClipboard={handleCopy}
                displayDataTypes={false}
                displayObjectSize={false}
                style={{
                  backgroundColor: 'transparent',
                  fontSize: '13px',
                  fontFamily: 'Monaco, monospace'
                }}
                iconStyle="square"
              />
            ) : (
              <div className="text-gray-400">Parsed result will appear here...</div>
            )}
          </div>
        </div>
      </div>
      <div className="flex justify-center mt-4">
        <Button type="primary" onClick={handleParse} size="large">
          Parse JSON
        </Button>
      </div>
    </div>
  )
}

export default IndexPopup 