import React, { useEffect, useMemo, useRef, lazy, Suspense } from "react"
import { ConfigProvider, Input, message, Divider, Tabs, theme, Spin } from "antd"
import "./style.css"

// 统一使用已封装的工具与组件，避免在本文件重复实现
import { saveHistoryItem } from "./utils/history"
import { parseSmart } from "./utils/json-parser"
import {
  jsonPathToSegments,
  segmentsToJsonPath,
  segmentsToDotPath,
  getBySegments,
  downloadJson,
  downloadText
} from "./utils/json-path"
import {
  copyText,
  readClipboardText,
  checkClipboardPermission,
  ensureClipboardPermission
} from "./utils/clipboard"
import { HistoryPanel } from "./components/HistoryPanel"
import { SearchPanel } from "./components/SearchPanel"
import { HeaderBar } from "./components/HeaderBar"
import { ResultViewer } from "./components/ResultViewer"
import { DataStatsPanel } from "./components/DataStatsPanel"
import { PerformanceMonitor } from "./components/PerformanceMonitor"
import {
  DataVisualization,
  ApiBuilder,
  DataMaskingPanel
} from "./components/SimplifiedComponents"
import { loadUIPrefs, saveUIPrefs } from "./utils/settings"
import { useAppStore } from "./store/useAppStore"
import { performanceMonitor, calculateDataSize } from "./utils/performance-monitor"

// Lazy load non-critical components for better performance
const SchemaValidator = lazy(() => import("./components/SchemaValidator").then(m => ({ default: m.SchemaValidator })))
const TypeScriptGenerator = lazy(() => import("./components/TypeScriptGenerator").then(m => ({ default: m.TypeScriptGenerator })))
const FormatConverter = lazy(() => import("./components/FormatConverter").then(m => ({ default: m.FormatConverter })))
const BatchExtract = lazy(() => import("./components/BatchExtract").then(m => ({ default: m.BatchExtract })))

const { TextArea } = Input

const IndexPopup = () => {
  // 使用 Zustand 管理的全局状态
  const {
    inputValue,
    setInputValue,
    parsedValue,
    setParsedValue,
    error,
    setError,
    autoDecode,
    setAutoDecode,
    sortKeys,
    setSortKeys,
    searchTerm,
    setSearchTerm,
    setSteps,
    steps,
    searchResults,
    setSearchResults,
    jumpPath,
    setJumpPath,
    expandedPaths,
    setExpandedPaths,
    addExpandedPath,
    selectedPath,
    setSelectedPath,
    clipPerm,
    setClipPerm,
    collapseDepth,
    setCollapseDepth,
    perfMode,
    setPerfMode,
    forceRenderAll,
    setForceRenderAll,
    darkMode,
    setDarkMode,
    antdPrimary,
    setAntdPrimary,
    fontSize,
    setFontSize,
    history,
    loadingHistory,
    refreshHistory,
    clearHistoryList,
    removeHistoryEntry,
    performSearch
  } = useAppStore()

  useEffect(() => {
    // 初始化加载历史记录
    refreshHistory().catch(() => {})
  }, [refreshHistory])

  // 检查可选权限当前状态
  useEffect(() => {
    checkClipboardPermission().then(setClipPerm).catch(() => setClipPerm(null))
  }, [])

  // 从 CSS 变量读取主题主色，注入 antd 主题 token
  useEffect(() => {
    try {
      const cssPrimary = getComputedStyle(document.documentElement)
        .getPropertyValue("--primary-color")
        .trim()
      if (cssPrimary) setAntdPrimary(cssPrimary)
    } catch {}
  }, [])

  // 读取并恢复 UI 偏好
  useEffect(() => {
    loadUIPrefs().then((prefs) => {
      if (typeof prefs.darkMode === "boolean") setDarkMode(prefs.darkMode)
      if (typeof prefs.fontSize === "number") setFontSize(prefs.fontSize)
    })
  }, [])

  // 偏好变更时持久化
  useEffect(() => {
    saveUIPrefs({ darkMode, fontSize }).catch(() => {})
  }, [darkMode, fontSize])

  const hasInput = useMemo(() => Boolean(inputValue.trim()), [inputValue])

  const describeJsonParseError = (raw: string, err: unknown): string => {
    const error = err as { message?: string }
    const msg = String(error?.message || "JSON 解析失败")
    const posMatch = msg.match(/position\s+(\d+)/i)
    if (posMatch) {
      const pos = Number(posMatch[1])
      if (!Number.isNaN(pos)) {
        let line = 1
        let column = 1
        for (let i = 0; i < pos && i < raw.length; i++) {
          if (raw[i] === "\n") {
            line += 1
            column = 1
          } else {
            column += 1
          }
        }
        return `第 ${line} 行第 ${column} 列附近：${msg}`
      }
    }
    return msg
  }

  // —— 解析与历史 ——
  const handleParse = (textToParse?: string) => {
    const text = textToParse ?? inputValue
    if (!text.trim()) {
      setError("Please enter a JSON string")
      setParsedValue(null)
      message.warning("Please enter a JSON string")
      return
    }

    // 开始性能监控
    const operationId = performanceMonitor.startOperation('parse')
    const dataSize = calculateDataSize(text)

    try {
      const { data, steps } = parseSmart(text, {
        autoDecode,
        sortKeys,
        parseNested: true
      })
      setParsedValue(data)
      setSteps(steps)
      setError("")
      setSearchResults([])
      setExpandedPaths([])
      setSelectedPath("")

      // 结束性能监控 - 成功
      performanceMonitor.endOperation(operationId, true, undefined, dataSize)
      message.success(textToParse ? "已载入历史记录" : "Successfully parsed!")
      saveHistoryItem(text, steps).then(refreshHistory).catch(() => {})
    } catch (err) {
      const error = err as { message?: string }
      let msg = error?.message || "Invalid JSON string"
      if (text.trim()) {
        try {
          JSON.parse(text)
        } catch (nativeErr) {
          msg = describeJsonParseError(text, nativeErr)
        }
      }

      // 结束性能监控 - 失败
      performanceMonitor.endOperation(operationId, false, msg, dataSize)
      setError(msg)
      setParsedValue(null)
      message.error(msg)
    }
  }

  const handlePasteAndParse = async () => {
    let clipboardText = ""
    try {
      clipboardText = await readClipboardText()
      setInputValue(clipboardText)
      const { data, steps } = parseSmart(clipboardText, {
        autoDecode,
        sortKeys,
        parseNested: true
      })
      setParsedValue(data)
      setSteps(steps)
      setError("")
      setSearchResults([])
      setExpandedPaths([])
      setSelectedPath("")
      message.success("Parsed from clipboard!")
      saveHistoryItem(clipboardText, steps).then(refreshHistory).catch(() => {})
    } catch (e: unknown) {
      const error = e as { message?: string }
      let msg = error?.message || "读取剪贴板失败"
      const sourceText = clipboardText || inputValue
      if (sourceText) {
        try {
          JSON.parse(sourceText)
        } catch (nativeErr) {
          msg = describeJsonParseError(sourceText, nativeErr)
        }
      }
      message.error(msg)
    }
  }

  const handleExport = () => {
    if (!parsedValue) return
    downloadJson(parsedValue)
  }

  const handleFormat = () => {
    if (!hasInput) {
      message.warning("请先输入 JSON 文本")
      return
    }
    try {
      const obj = JSON.parse(inputValue)
      const pretty = JSON.stringify(obj, null, 2)
      setInputValue(pretty)
      setParsedValue(obj)
      setError("")
      message.success("已格式化 JSON")
    } catch (err) {
      message.error(describeJsonParseError(inputValue, err))
    }
  }

  const handleMinify = () => {
    if (!hasInput) {
      message.warning("请先输入 JSON 文本")
      return
    }
    try {
      const obj = JSON.parse(inputValue)
      const compact = JSON.stringify(obj)
      setInputValue(compact)
      setParsedValue(obj)
      setError("")
      message.success("已压缩 JSON")
    } catch (err) {
      message.error(describeJsonParseError(inputValue, err))
    }
  }

  const handleClearHistory = () => {
    clearHistoryList().catch(() => {})
  }

  const handleRemoveHistory = (id: string) => {
    removeHistoryEntry(id).catch(() => {})
  }

  const handleRequestClipboardPermission = async () => {
    const ok = await ensureClipboardPermission()
    setClipPerm(ok)
    if (ok) message.success("已授予剪贴板权限")
    else message.error("未授予剪贴板权限")
  }

  // —— 路径与展开控制 ——
  const nsToJsonPath = (ns: (string | number)[]) => segmentsToJsonPath(ns)

  const resultRef = useRef<HTMLDivElement | null>(null)

  const handleSelectPath = (p: string) => {
    setSelectedPath(p)
    addExpandedPath(p)
    // 等待展开生效后滚动定位
    setTimeout(() => scrollToPath(p), 60)
  }

  const handleCopyPath = (p: string) => copyText(p, "已复制 JSONPath")

  const handleCopyDotPath = (p: string) => {
    const segs = jsonPathToSegments(p)
    copyText(segmentsToDotPath(segs), "已复制点路径")
  }

  const handleCopyValueAtPath = (p: string) => {
    if (!parsedValue) return
    const segs = jsonPathToSegments(p)
    const val = getBySegments(parsedValue, segs)
    const text = typeof val === "object" ? JSON.stringify(val, null, 2) : String(val)
    copyText(text, "已复制值")
  }

  const exportSearchCsv = () => {
    if (!parsedValue || searchResults.length === 0) return
    // 生成 path,value 两列的 CSV
    const rows = ["path,value"]
    for (const p of searchResults) {
      const segs = jsonPathToSegments(p)
      const val = getBySegments(parsedValue, segs)
      const v = typeof val === "object" ? JSON.stringify(val) : String(val)
      const esc = (s: string) => '"' + s.replace(/"/g, '""') + '"'
      rows.push(`${esc(p)},${esc(v)}`)
    }
    downloadText(rows.join("\n"), "search_hits.csv")
  }

  // ReactJson 的复制钩子
  const handleCopy = (e: { src: unknown }) => {
    const copyValue = typeof e.src === "object" ? JSON.stringify(e.src, null, 2) : String(e.src)
    copyText(copyValue, "Copied to clipboard!")
    return true
  }

  // —— 性能模式：大对象/数组的虚拟列表（仅根层） ——
  const isLargeRoot = (() => {
    if (!parsedValue) return false
    const ROOT_THRESHOLD = 300 // 根层元素数阈值
    if (Array.isArray(parsedValue)) return parsedValue.length > ROOT_THRESHOLD
    if (parsedValue && typeof parsedValue === "object") return Object.keys(parsedValue).length > ROOT_THRESHOLD
    return false
  })()

  const buildRootVirtualItems = (): { idx: number; key: string | number; value: JsonValue; path: string }[] => {
    if (!parsedValue) return []
    if (Array.isArray(parsedValue)) {
      return parsedValue.map((v, i) => ({ idx: i, key: i, value: v, path: `$[${i}]` }))
    }
    if (parsedValue && typeof parsedValue === "object") {
      return Object.keys(parsedValue).map((k, i) => ({ idx: i, key: k, value: (parsedValue as Record<string, JsonValue>)[k], path: `$[${JSON.stringify(k)}]` }))
    }
    return []
  }

  // 高亮并滚动到指定 JSONPath 的节点（基于 DOM 选择器）
  const scrollToPath = (jsonPath: string) => {
    const container = resultRef.current
    if (!container) return

    // ReactJson 渲染行的简易定位：逐段匹配 namespace 文本
    const segs = jsonPathToSegments(jsonPath)
    const parts: string[] = []
    for (const s of segs) {
      if (typeof s === "number") parts.push(`[${s}]`)
      else parts.push(`[${JSON.stringify(String(s))}]`)
    }

    const rows = container.querySelectorAll<HTMLElement>(".pretty-json-container, .object-key, .variable-row, .object-key-val")
    let targetRow: HTMLElement | null = null
    const pathTxt = `$${parts.join("")}`

    // 朴素包含匹配（不同版本 react-json-view DOM 结构略有差异）
    rows.forEach((el) => {
      if (targetRow) return
      const txt = (el.textContent || "").trim()
      if (txt.includes(pathTxt)) {
        targetRow = el.closest(".variable-row") as HTMLElement
      }
    })

    if (!targetRow) return
    const rowEl = targetRow as HTMLElement
    rowEl.classList.add("rjv-highlight")
    const top = rowEl.offsetTop - (container.offsetTop || 0) - 12
    container.scrollTop = top < 0 ? 0 : top
    setTimeout(() => rowEl.classList.remove("rjv-highlight"), 1200)
  }

  // 将暗黑模式同步到 body，影响 portal（message/tooltip）
  useEffect(() => {
    document.body.classList.toggle("dark-mode", darkMode)
  }, [darkMode])

  return (
    <ConfigProvider theme={{ token: { colorPrimary: antdPrimary }, algorithm: darkMode ? theme.darkAlgorithm : theme.defaultAlgorithm }}>
    <div className={`w-[900px] min-h-[480px] p-4 overflow-hidden ${darkMode ? "text-gray-100 bg-gray-900" : "bg-white"}`}>
      <h1 className={`text-xl font-bold mb-3 text-center ${darkMode ? "text-gray-100" : "text-gray-800"}`}>JSON Parser</h1>

      <HeaderBar
        onPasteAndParse={handlePasteAndParse}
        onParse={handleParse}
        onExport={handleExport}
        onFormat={handleFormat}
        onMinify={handleMinify}
        canExport={Boolean(parsedValue)}
        hasInput={hasInput}
        clipPerm={clipPerm}
        onRequestClipboardPermission={handleRequestClipboardPermission}
        autoDecode={autoDecode}
        setAutoDecode={setAutoDecode}
        sortKeys={sortKeys}
        setSortKeys={setSortKeys}
        collapseDepth={collapseDepth}
        setCollapseDepth={setCollapseDepth}
        perfMode={perfMode}
        setPerfMode={setPerfMode}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
        fontSize={fontSize}
        setFontSize={setFontSize}
      />

      <div className="grid overflow-hidden grid-cols-2 gap-3">
        {/* 左侧：输入与历史 */}
        <div className="flex overflow-hidden flex-col">
          <div className={`mb-2 text-sm font-semibold ${darkMode ? "text-blue-400" : "text-blue-600"}`}>
            输入区
          </div>
          <TextArea
            rows={10}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="粘贴 JSON 字符串，或 URL/Base64/JWT/混杂日志文本，点击解析"
            className="mb-2"
          />

          <Divider className="my-2" />

          <HistoryPanel
            history={history}
            loading={loadingHistory}
            onClearAll={handleClearHistory}
            onRemove={handleRemoveHistory}
            onLoadItem={(raw) => {
              setInputValue(raw)
              handleParse(raw)
            }}
          />
        </div>

        {/* 右侧：工具与结果 */}
        <div className="flex overflow-hidden flex-col">
          <Tabs
            defaultActiveKey="search"
            size="small"
            items={[
              {
                key: "search",
                label: "路径搜索",
                children: (
                  <SearchPanel
                    parsedValue={parsedValue}
                    searchTerm={searchTerm}
                    setSearchTerm={setSearchTerm}
                    searchResults={searchResults}
                    jumpPath={jumpPath}
                    setJumpPath={setJumpPath}
                    selectedPath={selectedPath}
                    steps={steps}
                    performSearch={performSearch}
                    onExportCsv={exportSearchCsv}
                    onSelectPath={handleSelectPath}
                    onCopyPath={handleCopyPath}
                    onCopyDotPath={handleCopyDotPath}
                    onCopyValueAtPath={handleCopyValueAtPath}
                  />
                )
              },
              {
                key: "stats",
                label: "数据统计",
                children: (
                  <DataStatsPanel
                    parsedValue={parsedValue}
                    darkMode={darkMode}
                    onSelectPath={handleSelectPath}
                  />
                )
              },
              {
                key: "extract",
                label: "批量抽取",
                children: (
                  <Suspense fallback={<div className="text-center p-4"><Spin /></div>}>
                    <BatchExtract parsedValue={parsedValue} darkMode={darkMode} />
                  </Suspense>
                )
              },
              {
                key: "schema",
                label: "Schema校验",
                children: (
                  <Suspense fallback={<div className="text-center p-4"><Spin /></div>}>
                    <SchemaValidator
                      parsedValue={parsedValue}
                      onSelectPath={handleSelectPath}
                      onCopyPath={handleCopyPath}
                    />
                  </Suspense>
                )
              },
              {
                key: "typescript",
                label: "TS类型生成",
                children: (
                  <Suspense fallback={<div className="text-center p-4"><Spin /></div>}>
                    <TypeScriptGenerator parsedValue={parsedValue} darkMode={darkMode} fontSize={fontSize} />
                  </Suspense>
                )
              },
              {
                key: "convert",
                label: "格式转换",
                children: (
                  <Suspense fallback={<div className="text-center p-4"><Spin /></div>}>
                    <FormatConverter
                      parsedValue={parsedValue}
                      setInputValue={setInputValue}
                      setParsedValue={setParsedValue}
                      setError={setError}
                      setSteps={setSteps}
                    />
                  </Suspense>
                )
              },
              {
                key: "visualization",
                label: "数据可视化",
                children: <DataVisualization parsedValue={parsedValue} darkMode={darkMode} />
              },
              {
                key: "api",
                label: "API构建器",
                children: <ApiBuilder parsedValue={parsedValue} darkMode={darkMode} />
              },
              {
                key: "masking",
                label: "数据脱敏",
                children: (
                  <DataMaskingPanel
                    parsedValue={parsedValue}
                    darkMode={darkMode}
                    onApplyMaskedData={(data) => {
                      setInputValue(JSON.stringify(data, null, 2))
                      setParsedValue(data)
                      setError("")
                      setSteps(["数据脱敏处理"])
                    }}
                  />
                )
              },
              {
                key: "performance",
                label: "性能监控",
                children: <PerformanceMonitor parsedValue={parsedValue} darkMode={darkMode} />
              }
            ]}
          />

          <Divider className="my-2" />

          <div className={`mb-2 text-sm font-semibold ${darkMode ? "text-green-400" : "text-green-600"}`}>
            解析结果
          </div>
          <ResultViewer
            parsedValue={parsedValue}
            error={error}
            perfMode={perfMode}
            isLargeRoot={isLargeRoot}
            forceRenderAll={forceRenderAll}
            setForceRenderAll={setForceRenderAll}
            collapseDepth={collapseDepth}
            expandedPaths={expandedPaths}
            nsToJsonPath={nsToJsonPath}
            onSelectPath={handleSelectPath}
            onCopyPath={handleCopyPath}
            onCopyValueAtPath={handleCopyValueAtPath}
            containerRef={resultRef}
            onCopy={handleCopy}
            buildRootVirtualItems={buildRootVirtualItems}
            darkMode={darkMode}
            fontSize={fontSize}
          />
        </div>
      </div>
    </div>
    </ConfigProvider>
  )
}

export default IndexPopup
