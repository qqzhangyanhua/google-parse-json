// TypeScript type generator component - generates TS types from JSON with configuration options

import React, { useState } from "react"
import { Button, Input, InputNumber, message, Switch } from "antd"
import type { JsonValue } from "../types"
// 修正导入路径：组件位于 src/components，应从 src/utils 引入
import { generateTsFromJson } from "../utils/json-to-ts"
import { highlightTs, formatTsLocal } from "../utils/ts-highlight"
import { downloadText } from "../utils/json-path"
import { copyText } from "../utils/clipboard"

const { TextArea } = Input

interface TypeScriptGeneratorProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export const TypeScriptGenerator: React.FC<TypeScriptGeneratorProps> = ({
  parsedValue,
  darkMode = false
}) => {
  const [tsCode, setTsCode] = useState("")
  const [tsRootName, setTsRootName] = useState("Root")
  const [tsBusy, setTsBusy] = useState(false)
  const [tsSample, setTsSample] = useState(100)
  const [tsEnumMode, setTsEnumMode] = useState(true)
  const [tsEnumMax, setTsEnumMax] = useState(8)
  const [tsEnumMaxLen, setTsEnumMaxLen] = useState(32)
  const [tsEnumNumberMode, setTsEnumNumberMode] = useState(true)
  const [tsEnumNumMax, setTsEnumNumMax] = useState(8)
  const [tsDetectDate, setTsDetectDate] = useState(false)
  const [tsAggressive, setTsAggressive] = useState(false)
  const [tsEditMode, setTsEditMode] = useState(false)

  const applyModePreset = (aggressive: boolean) => {
    setTsAggressive(aggressive)
    if (aggressive) {
      setTsSample(200)
      setTsEnumMode(true)
      setTsEnumMax(16)
      setTsEnumMaxLen(64)
      setTsEnumNumberMode(true)
      setTsEnumNumMax(16)
      setTsDetectDate(true)
    } else {
      setTsSample(100)
      setTsEnumMode(true)
      setTsEnumMax(8)
      setTsEnumMaxLen(32)
      setTsEnumNumberMode(true)
      setTsEnumNumMax(8)
      setTsDetectDate(false)
    }
  }

  const handleGenTs = () => {
    if (!parsedValue) {
      message.warning("请先解析出 JSON")
      return
    }
    try {
      setTsBusy(true)
      const code = generateTsFromJson(parsedValue, {
        rootName: tsRootName || "Root",
        arraySample: tsSample,
        enumStrings: tsEnumMode ? "auto" : false,
        enumMaxUnique: tsEnumMax,
        enumMaxLength: tsEnumMaxLen,
        enumNumbers: tsEnumNumberMode ? "auto" : false,
        enumNumMaxUnique: tsEnumNumMax,
        detectDate: tsDetectDate
      })
      setTsCode(code)
      message.success("已生成类型")
    } catch (e) {
      console.error("TS 生成失败", e)
      message.error("类型生成失败")
    } finally {
      setTsBusy(false)
    }
  }

  return (
    <div>
      <div className="font-medium text-gray-700 mb-2">TypeScript 类型生成</div>

      {/* Top buttons */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          size="small"
          style={{ width: 200 }}
          value={tsRootName}
          onChange={(e) => setTsRootName(e.target.value)}
          placeholder="根类型名（默认 Root）"
        />
        <Button onClick={handleGenTs} disabled={!parsedValue} loading={tsBusy}>
          生成
        </Button>
        <Button
          onClick={() => copyText(tsCode, "已复制类型")}
          disabled={!tsCode}
        >
          复制
        </Button>
        <Button
          onClick={() =>
            downloadText(
              tsCode,
              `${(tsRootName || "types").replace(/\W+/g, "_")}.d.ts`
            )
          }
          disabled={!tsCode}
        >
          下载 .d.ts
        </Button>
        <Button
          onClick={() => setTsCode((c) => formatTsLocal(c))}
          disabled={!tsCode}
        >
          格式化
        </Button>
        <Button onClick={() => setTsEditMode((v) => !v)} disabled={!tsCode}>
          {tsEditMode ? "完成" : "编辑"}
        </Button>
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-3 mb-2 text-xs text-gray-700">
        <span>模式（保守/激进）</span>
        <Switch size="small" checked={tsAggressive} onChange={applyModePreset} />
        {tsAggressive ? (
          <span className="text-red-500">激进</span>
        ) : (
          <span className="text-gray-600">保守</span>
        )}
      </div>

      {/* String enum options */}
      <div className="flex items-center gap-3 mb-2 text-xs text-gray-700">
        <span>数组采样</span>
        <InputNumber
          size="small"
          min={1}
          max={1000}
          value={tsSample}
          onChange={(v) => setTsSample((v as number) ?? 100)}
        />
        <span>字符串枚举</span>
        <Switch size="small" checked={tsEnumMode} onChange={setTsEnumMode} />
        <span>最大枚举个数</span>
        <InputNumber
          size="small"
          min={1}
          max={100}
          value={tsEnumMax}
          onChange={(v) => setTsEnumMax((v as number) ?? 8)}
        />
        <span>单值最大长度</span>
        <InputNumber
          size="small"
          min={1}
          max={200}
          value={tsEnumMaxLen}
          onChange={(v) => setTsEnumMaxLen((v as number) ?? 32)}
        />
      </div>

      {/* Number enum and date options */}
      <div className="flex items-center gap-3 mb-2 text-xs text-gray-700">
        <span>数字枚举</span>
        <Switch
          size="small"
          checked={tsEnumNumberMode}
          onChange={setTsEnumNumberMode}
        />
        <span>最大个数</span>
        <InputNumber
          size="small"
          min={1}
          max={100}
          value={tsEnumNumMax}
          onChange={(v) => setTsEnumNumMax((v as number) ?? 8)}
        />
        <span>识别日期字符串</span>
        <Switch size="small" checked={tsDetectDate} onChange={setTsDetectDate} />
      </div>

      {/* Code display */}
      {tsEditMode ? (
        <TextArea
          value={tsCode}
          onChange={(e) => setTsCode(e.target.value)}
          placeholder="生成的 TypeScript 类型会显示在这里"
          rows={12}
          className="mono"
          spellCheck={false}
        />
      ) : (
        <div
          className={`border rounded-md overflow-auto ${
            darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50"
          }`}
          style={{ maxHeight: 320 }}
        >
          <pre
            className={`m-0 p-3 text-xs leading-5 mono ${darkMode ? "text-gray-100" : "text-gray-800"}`}
            dangerouslySetInnerHTML={{
              __html: tsCode
                ? highlightTs(tsCode)
                : escapeHtml("// 生成的 TypeScript 类型会显示在这里")
            }}
          />
        </div>
      )}
    </div>
  )
}
