// 多格式互转面板：支持 JSON ↔ YAML/TOML/CSV/JS

import React, { useState } from "react"
import { Button, Input, message, Select, Space, Typography } from "antd"
import { downloadText } from "../utils/json-path"
import { copyText } from "../utils/clipboard"
import type { JsonValue } from "../types"
import type { DataFormat } from "../utils/format-convert"
import { convertJsonToFormat, parseTextToJson } from "../utils/format-convert"

const { TextArea } = Input
const { Paragraph } = Typography

const formatOptions: Array<{ label: string; value: DataFormat }> = [
  { label: "JSON", value: "json" },
  { label: "YAML", value: "yaml" },
  { label: "TOML", value: "toml" },
  { label: "CSV", value: "csv" },
  { label: "JS 对象", value: "js" }
]

interface FormatConverterProps {
  parsedValue: JsonValue | null
  setInputValue: (v: string) => void
  setParsedValue: (value: JsonValue | null) => void
  setError: (msg: string) => void
  setSteps: (steps: string[]) => void
}

export const FormatConverter: React.FC<FormatConverterProps> = ({
  parsedValue,
  setInputValue,
  setParsedValue,
  setError,
  setSteps
}) => {

  const [exportFormat, setExportFormat] = useState<DataFormat>("yaml")
  const [exportText, setExportText] = useState("")
  const [exportNotice, setExportNotice] = useState("")
  const [exportBusy, setExportBusy] = useState(false)

  const [importFormat, setImportFormat] = useState<DataFormat>("yaml")
  const [importText, setImportText] = useState("")
  const [importResult, setImportResult] = useState("")
  const [importNotice, setImportNotice] = useState("")
  const [importBusy, setImportBusy] = useState(false)

  const handleGenerate = async () => {
    if (!parsedValue) {
      message.warning("请先解析出 JSON 再进行导出")
      return
    }
    try {
      setExportBusy(true)
      const { text, notice } = await convertJsonToFormat(parsedValue, exportFormat)
      setExportText(text)
      setExportNotice(notice ?? "")
      message.success("转换成功")
    } catch (err) {
      const msg = (err as { message?: string })?.message || "转换失败"
      message.error(msg)
    } finally {
      setExportBusy(false)
    }
  }

  const handleCopyExport = () => {
    if (!exportText.trim()) {
      message.warning("请先执行转换")
      return
    }
    copyText(exportText, "已复制").catch(() => {})
  }

  const handleDownloadExport = () => {
    if (!exportText.trim()) {
      message.warning("请先执行转换")
      return
    }
    const ext = (() => {
      switch (exportFormat) {
        case "yaml":
          return "yaml"
        case "toml":
          return "toml"
        case "csv":
          return "csv"
        case "js":
          return "js"
        default:
          return "json"
      }
    })()
    downloadText(exportText, `converted.${ext}`)
  }

  const handleImport = async () => {
    if (!importText.trim()) {
      message.warning("请粘贴要转换的文本")
      return
    }
    try {
      setImportBusy(true)
      const { value, notice } = await parseTextToJson(importText, importFormat)
      const normalized = typeof value === "undefined" ? null : value
      const jsonText = JSON.stringify(normalized, null, 2)
      setImportResult(jsonText)
      setImportNotice(notice ?? "")
      message.success("转换成功")
    } catch (err) {
      const msg = (err as { message?: string })?.message || "转换失败"
      message.error(msg)
      setImportResult("")
      setImportNotice("")
    } finally {
      setImportBusy(false)
    }
  }

  const handleApplyToInput = () => {
    if (!importResult.trim()) {
      message.warning("请先将文本转换为 JSON")
      return
    }
    try {
      const obj = JSON.parse(importResult)
      setInputValue(importResult)
      setParsedValue(obj)
      setError("")
      setSteps(["格式转换导入"])
      message.success("已写入输入区，并更新解析结果")
    } catch {
      message.error("写入失败：JSON 文本不合法")
    }
  }

  const handleCopyImportJson = () => {
    if (!importResult.trim()) {
      message.warning("暂无转换结果可复制")
      return
    }
    copyText(importResult, "已复制 JSON").catch(() => {})
  }

  return (
    <div className="space-y-4 mt-2">
      <div>
        <div className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 mb-2">
          📤 当前 JSON 导出
        </div>
        <Space size={12} className="mb-2" wrap>
          <Select<DataFormat>
            value={exportFormat}
            onChange={setExportFormat}
            options={formatOptions}
            style={{ width: 120 }}
          />
          <Button type="primary" loading={exportBusy} onClick={handleGenerate}>
            转换
          </Button>
          <Button onClick={handleCopyExport}>
            复制
          </Button>
          <Button onClick={handleDownloadExport}>
            下载
          </Button>
        </Space>
        {exportNotice && (
          <Paragraph className="text-xs text-amber-600 mb-1">{exportNotice}</Paragraph>
        )}
        <TextArea
          value={exportText}
          readOnly
          rows={8}
          placeholder="点击“转换”后将在此展示导出文本"
          className="mono"
          spellCheck={false}
        />
      </div>

      <div>
        <div className="font-semibold text-sm text-emerald-600 dark:text-emerald-400 mb-2">
          📥 其他格式导入
        </div>
        <Space size={12} className="mb-2" wrap>
          <Select<DataFormat>
            value={importFormat}
            onChange={setImportFormat}
            options={formatOptions}
            style={{ width: 120 }}
          />
          <Button type="primary" loading={importBusy} onClick={handleImport}>
            转换为 JSON
          </Button>
          <Button onClick={handleApplyToInput}>
            写入输入区
          </Button>
          <Button onClick={handleCopyImportJson}>
            复制 JSON
          </Button>
        </Space>
        {importNotice && (
          <Paragraph className="text-xs text-amber-600 mb-1">{importNotice}</Paragraph>
        )}
        <TextArea
          rows={6}
          value={importText}
          onChange={(e) => setImportText(e.target.value)}
          placeholder="粘贴 YAML/TOML/CSV/JS 对象/JSON 文本"
          className="mb-2 mono"
          spellCheck={false}
        />
        <TextArea
          rows={6}
          value={importResult}
          onChange={(e) => setImportResult(e.target.value)}
          placeholder="转换得到的 JSON 文本"
          className="mono"
          spellCheck={false}
        />
      </div>
    </div>
  )
}
