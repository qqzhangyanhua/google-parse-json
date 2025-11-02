// TypeScript type generator component - generates TS types from JSON with configuration options

import React, { useState } from "react"
import { Button, Input, InputNumber, message, Switch, Collapse } from "antd"
import type { JsonValue } from "../types"
import { generateTsFromJson } from "../utils/json-to-ts"
import { highlightTs, formatTsLocal } from "../utils/ts-highlight"
import { downloadText } from "../utils/json-path"
import { copyText } from "../utils/clipboard"

const { TextArea } = Input
const { Panel } = Collapse

interface TypeScriptGeneratorProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
  fontSize?: number
}

const escapeHtml = (s: string): string =>
  s.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")

export const TypeScriptGenerator: React.FC<TypeScriptGeneratorProps> = ({
  parsedValue,
  darkMode = false,
  fontSize = 13
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
      <div className="font-medium text-gray-700 dark:text-gray-300 mb-2">TypeScript 类型生成</div>

      {/* Top control bar */}
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Input
          size="small"
          style={{ width: 180 }}
          value={tsRootName}
          onChange={(e) => setTsRootName(e.target.value)}
          placeholder="根类型名(默认 Root)"
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
          下载
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

      {/* Advanced options in collapsible panel */}
      <Collapse size="small" className="mb-3">
        <Panel header="高级选项" key="1">
          {/* Mode toggle */}
          <div className="flex items-center gap-3 mb-3 text-xs">
            <span className="text-gray-600 dark:text-gray-400">模式</span>
            <Switch size="small" checked={tsAggressive} onChange={applyModePreset} />
            {tsAggressive ? (
              <span className="text-red-500 dark:text-red-400">激进</span>
            ) : (
              <span className="text-gray-600 dark:text-gray-400">保守</span>
            )}
          </div>

          {/* Options grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* Array sampling */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">数组采样</span>
              <InputNumber
                size="small"
                min={1}
                max={1000}
                value={tsSample}
                onChange={(v) => setTsSample((v as number) ?? 100)}
                style={{ width: 80 }}
              />
            </div>

            {/* String enum */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">字符串枚举</span>
              <Switch size="small" checked={tsEnumMode} onChange={setTsEnumMode} />
            </div>

            {/* Enum max count */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">枚举个数</span>
              <InputNumber
                size="small"
                min={1}
                max={100}
                value={tsEnumMax}
                onChange={(v) => setTsEnumMax((v as number) ?? 8)}
                style={{ width: 80 }}
              />
            </div>

            {/* Enum max length */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">单值长度</span>
              <InputNumber
                size="small"
                min={1}
                max={200}
                value={tsEnumMaxLen}
                onChange={(v) => setTsEnumMaxLen((v as number) ?? 32)}
                style={{ width: 80 }}
              />
            </div>

            {/* Number enum */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">数字枚举</span>
              <Switch
                size="small"
                checked={tsEnumNumberMode}
                onChange={setTsEnumNumberMode}
              />
            </div>

            {/* Number enum max */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">数字枚举数</span>
              <InputNumber
                size="small"
                min={1}
                max={100}
                value={tsEnumNumMax}
                onChange={(v) => setTsEnumNumMax((v as number) ?? 8)}
                style={{ width: 80 }}
              />
            </div>

            {/* Date detection */}
            <div className="flex items-center gap-2">
              <span className="text-gray-600 dark:text-gray-400 whitespace-nowrap">识别日期</span>
              <Switch size="small" checked={tsDetectDate} onChange={setTsDetectDate} />
            </div>
          </div>
        </Panel>
      </Collapse>

      {/* Code display */}
      {tsEditMode ? (
        <TextArea
          value={tsCode}
          onChange={(e) => setTsCode(e.target.value)}
          placeholder="生成的 TypeScript 类型会显示在这里"
          rows={12}
          className="mono"
          style={{ fontSize }}
          spellCheck={false}
        />
      ) : (
        <div
          className={`border rounded-md overflow-auto ${
            darkMode ? "bg-gray-900 text-gray-100 border-gray-700" : "bg-gray-50 border-gray-300"
          }`}
          style={{ maxHeight: 320 }}
        >
          <pre
            className={`m-0 p-3 leading-5 mono ${darkMode ? "text-gray-100" : "text-gray-800"}`}
            style={{ fontSize }}
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
