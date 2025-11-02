// 批量抽取与扁平化导出面板
// 功能：输入多条 JSONPath（每行一条），从已解析的 JSON 中批量提取，支持数组展开为多行，并导出 CSV

import React, { useMemo, useState } from "react"
import { Button, Checkbox, Input, message, Select, Space } from "antd"
import type { JsonValue } from "../types"
import { extractToTable, toCsv } from "../utils/extract"
import { downloadText } from "../utils/json-path"
import { copyText } from "../utils/clipboard"
import { jsonPathToSegments, getBySegments } from "../utils/json-path"

const { TextArea } = Input

interface BatchExtractProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
}

export const BatchExtract: React.FC<BatchExtractProps> = ({ parsedValue, darkMode = false }) => {
  const [pathsText, setPathsText] = useState("")
  const [expandArrays, setExpandArrays] = useState(true)
  const [joiner, setJoiner] = useState(",")
  const [placeholder, setPlaceholder] = useState("")
  const [result, setResult] = useState<{
    header: string[]
    rows: string[][]
    stats: { expanded: boolean; primaryLen: number; totalRows: number }
  } | null>(null)
  const [primaryIndex, setPrimaryIndex] = useState<number | undefined>(undefined)
  const [aliasMap, setAliasMap] = useState<Record<number, string>>({})

  const paths = useMemo(() =>
    pathsText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean),
  [pathsText])

  const handleExtract = () => {
    try {
      if (!parsedValue) {
        message.warning("请先解析出 JSON")
        return
      }
      if (paths.length === 0) {
        message.warning("请输入至少一条 JSONPath（每行一条）")
        return
      }
      const res = extractToTable(parsedValue, paths, {
        expandArrays,
        joiner,
        placeholder,
        primaryIndex
      })
      // 应用列别名到预览/导出
      const header = paths.map((p, i) => (aliasMap[i] && aliasMap[i].trim()) ? aliasMap[i].trim() : p)
      setResult({ header, rows: res.rows, stats: res.stats })
      if (res.rows.length === 0) message.info("未提取到任何结果")
    } catch (e) {
      console.error(e)
      message.error("提取失败：请检查路径格式（支持 $.a[0].b 或 $[\"a\"][0][\"b\"]）")
    }
  }

  const handleDownload = () => {
    if (!result || result.rows.length === 0) return
    const csv = toCsv(result.header, result.rows)
    downloadText(csv, "extracted.csv")
  }

  const handleCopy = () => {
    if (!result || result.rows.length === 0) return
    const csv = toCsv(result.header, result.rows)
    copyText(csv, "已复制 CSV")
  }

  const preview = useMemo(() => {
    if (!result) return null
    const maxRows = 100
    const rows = result.rows.slice(0, maxRows)
    return (
      <div
        className={`border rounded-md overflow-auto ${
          darkMode ? "bg-gray-900 border-gray-700" : "bg-gray-50 border-gray-300"
        }`}
        style={{ maxHeight: 240 }}
      >
        <table className="w-full text-xs" style={{ borderCollapse: "collapse" }}>
          <thead>
            <tr>
              {result.header.map((h, i) => (
                <th key={i} className="text-left p-2 border-b border-gray-300 whitespace-nowrap">
                  <code>{h}</code>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, ri) => (
              <tr key={ri}>
                {r.map((c, ci) => (
                  <td key={ci} className="p-2 align-top border-b border-gray-200">
                    <div className="truncate" title={c}>{c}</div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }, [result, darkMode])

  const sampleHint = `示例：每行一条 JSONPath（支持方括号与点表示法）\n$[\"data\"][0][\"id\"]\n$.data[0].name\n$[\"meta\"][\"page\"]`

  // 计算各路径对应值与数组长度（用于提示与主数组选择）
  const pathInfos = useMemo(() => {
    if (!parsedValue) return paths.map(() => ({ isArray: false, len: 1 }))
    return paths.map((p) => {
      try {
        const segs = jsonPathToSegments(p)
        const v = getBySegments(parsedValue, segs)
        const isArray = Array.isArray(v)
        const len = isArray ? (v as any[]).length : 1
        return { isArray, len }
      } catch {
        return { isArray: false, len: 1 }
      }
    })
  }, [parsedValue, paths])

  // 路径重排（上移/下移）
  const movePath = (idx: number, dir: -1 | 1) => {
    const arr = pathsText.split(/\r?\n/)
    const i2 = idx + dir
    if (i2 < 0 || i2 >= arr.length) return
    const tmp = arr[idx]
    arr[idx] = arr[i2]
    arr[i2] = tmp
    setPathsText(arr.join("\n"))
    // 同步别名索引
    setAliasMap((am) => {
      const next: Record<number, string> = {}
      arr.forEach((_, i) => {
        // 反向映射：移动前后的索引对应关系
        if (i === idx) next[i] = am[i2] || ""
        else if (i === i2) next[i] = am[idx] || ""
        else next[i] = am[i] || ""
      })
      return next
    })
  }

  return (
    <div className="mt-2">
      <div className="font-semibold text-sm text-teal-600 dark:text-teal-400 mb-2">📊 批量抽取与导出</div>

      {/* 路径输入 */}
      <TextArea
        rows={6}
        value={pathsText}
        onChange={(e) => setPathsText(e.target.value)}
        placeholder={sampleHint}
        className="mb-2"
      />

      {/* 选项 */}
      <div className="flex flex-wrap items-center gap-3 text-xs mb-2">
        <Checkbox checked={expandArrays} onChange={(e) => setExpandArrays(e.target.checked)}>
          展开数组为多行（自动选择最长数组列）
        </Checkbox>
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">主数组列</span>
          <Select
            size="small"
            value={typeof primaryIndex === 'number' ? String(primaryIndex) : 'auto'}
            onChange={(v) => setPrimaryIndex(v === 'auto' ? undefined : Number(v))}
            style={{ width: 200 }}
            options={[
              { label: '自动（最长数组）', value: 'auto' },
              ...paths.map((p, i) => {
                const info = pathInfos[i]
                const hint = info?.isArray ? `（数组：${info.len}）` : ''
                return { label: `${i + 1}. ${p} ${hint}`, value: String(i) }
              })
            ]}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">数组连接符</span>
          <Input
            size="small"
            value={joiner}
            onChange={(e) => setJoiner(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
        <div className="flex items-center gap-1">
          <span className="text-gray-600 dark:text-gray-400">空值占位</span>
          <Input
            size="small"
            value={placeholder}
            onChange={(e) => setPlaceholder(e.target.value)}
            style={{ width: 80 }}
          />
        </div>
      </div>

      {/* 列别名与排序 */}
      {paths.length > 0 && (
        <div className="mb-2">
          <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">列别名与排序</div>
          <div className="border rounded-md p-2 bg-gray-50 dark:bg-gray-800">
            {paths.map((p, i) => (
              <div key={i} className="flex items-center gap-2 mb-1">
                <code className="text-xs text-gray-700 dark:text-gray-300 min-w-[28px]">{i + 1}.</code>
                <Input
                  size="small"
                  placeholder="列别名（留空则使用路径）"
                  value={aliasMap[i] ?? ''}
                  onChange={(e) => setAliasMap((m) => ({ ...m, [i]: e.target.value }))}
                  style={{ width: 220 }}
                />
                <span className="text-xs text-gray-500 truncate flex-1" title={p}>{p}</span>
                {pathInfos[i]?.isArray && (
                  <span className="text-[10px] text-blue-500">数组:{pathInfos[i].len}</span>
                )}
                <Space size={4}>
                  <Button size="small" onClick={() => movePath(i, -1)} disabled={i === 0}>上移</Button>
                  <Button size="small" onClick={() => movePath(i, 1)} disabled={i === paths.length - 1}>下移</Button>
                </Space>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 mb-2">
        <Button type="primary" onClick={handleExtract} disabled={!parsedValue}>
          提取
        </Button>
        <Button onClick={handleCopy} disabled={!result || result.rows.length === 0}>
          复制 CSV
        </Button>
        <Button onClick={handleDownload} disabled={!result || result.rows.length === 0}>
          导出 CSV
        </Button>
      </div>

      {/* 统计信息 */}
      {result && (
        <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">
          列数 {result.header.length}，行数 {result.rows.length}
          {result.stats.expanded && `（数组展开 ${result.stats.primaryLen} 行）`}
        </div>
      )}

      {/* 预览 */}
      {preview}
    </div>
  )
}
