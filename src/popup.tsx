import React, { useEffect, useRef, useState } from "react"
import { ConfigProvider, Input, message, Divider } from "antd"
import "./style.css"

// 统一使用已封装的工具与组件，避免在本文件重复实现
import { loadHistory, saveHistoryItem, type HistoryItem } from "./utils/history"
import { parseSmart } from "./utils/json-parser"
import {
  jsonPathToSegments,
  segmentsToJsonPath,
  segmentsToDotPath,
  getBySegments,
  searchJsonPaths,
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
import { SchemaValidator } from "./components/SchemaValidator"
import { TypeScriptGenerator } from "./components/TypeScriptGenerator"
import { HeaderBar } from "./components/HeaderBar"
import { ResultViewer } from "./components/ResultViewer"

const { TextArea } = Input

const IndexPopup = () => {
  // 基础状态
  const [inputValue, setInputValue] = useState("")
  const [parsedValue, setParsedValue] = useState<any>(null)
  const [error, setError] = useState("")
  const [autoDecode, setAutoDecode] = useState(true)
  const [sortKeys, setSortKeys] = useState(false)
  const [steps, setSteps] = useState<string[]>([])

  // 历史记录
  const [history, setHistory] = useState<HistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  // 搜索与定位
  const [searchTerm, setSearchTerm] = useState("")
  const [searchResults, setSearchResults] = useState<string[]>([])
  const [expandedPaths, setExpandedPaths] = useState<string[]>([])
  const [selectedPath, setSelectedPath] = useState<string>("")
  const [jumpPath, setJumpPath] = useState<string>("")

  // 视图与权限
  const [clipPerm, setClipPerm] = useState<boolean | null>(null)
  const [collapseDepth, setCollapseDepth] = useState<number>(2)
  const [perfMode, setPerfMode] = useState<boolean>(false)
  const [forceRenderAll, setForceRenderAll] = useState<boolean>(false)
  const [darkMode, setDarkMode] = useState<boolean>(false)
  const [antdPrimary, setAntdPrimary] = useState<string>("#1890ff")

  useEffect(() => {
    // 加载历史记录
    setLoadingHistory(true)
    loadHistory().then(setHistory).finally(() => setLoadingHistory(false))
  }, [])

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

  // —— 解析与历史 ——
  const handleParse = () => {
    if (!inputValue.trim()) {
      setError("Please enter a JSON string")
      setParsedValue(null)
      message.warning("Please enter a JSON string")
      return
    }

    try {
      const { data, steps } = parseSmart(inputValue, {
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
      message.success("Successfully parsed!")
      saveHistoryItem(inputValue, steps).then(() => loadHistory().then(setHistory))
    } catch (err) {
      setError((err as any)?.message || "Invalid JSON string")
      setParsedValue(null)
      message.error((err as any)?.message || "Invalid JSON string")
    }
  }

  const handlePasteAndParse = async () => {
    try {
      const text = await readClipboardText()
      setInputValue(text)
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
      message.success("Parsed from clipboard!")
      saveHistoryItem(text, steps).then(() => loadHistory().then(setHistory))
    } catch (e: any) {
      message.error(e?.message || "读取剪贴板失败")
    }
  }

  const handleExport = () => {
    if (!parsedValue) return
    downloadJson(parsedValue)
  }

  // —— 搜索 ——
  const handleSearch = () => {
    if (!parsedValue || !searchTerm.trim()) {
      setSearchResults([])
      return
    }
    const res = searchJsonPaths(parsedValue, searchTerm.trim())
    setSearchResults(res)
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
    setExpandedPaths((prev) => {
      if (prev.includes(p)) return prev
      return [...prev, p]
    })
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
  const handleCopy = (e: any) => {
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

  const buildRootVirtualItems = (): { idx: number; key: string | number; value: any; path: string }[] => {
    if (!parsedValue) return []
    if (Array.isArray(parsedValue)) {
      return parsedValue.map((v, i) => ({ idx: i, key: i, value: v, path: `$[${i}]` }))
    }
    if (parsedValue && typeof parsedValue === "object") {
      return Object.keys(parsedValue).map((k, i) => ({ idx: i, key: k, value: (parsedValue as any)[k], path: `$[${JSON.stringify(k)}]` }))
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

  return (
    <ConfigProvider theme={{ token: { colorPrimary: antdPrimary } }}>
    <div className="w-full max-w-[1000px] min-h-[480px] p-5 bg-white">
      <h1 className="text-2xl font-bold mb-3 text-center text-gray-800">JSON Parser</h1>

      <HeaderBar
        onPasteAndParse={handlePasteAndParse}
        onParse={handleParse}
        onExport={handleExport}
        canExport={Boolean(parsedValue)}
        clipPerm={clipPerm}
        onRequestClipboardPermission={handleRequestClipboardPermission}
        autoDecode={autoDecode}
        setAutoDecode={setAutoDecode}
        sortKeys={sortKeys}
        setSortKeys={setSortKeys}
        collapseDepth={collapseDepth}
        setCollapseDepth={(v) => setCollapseDepth(v)}
        perfMode={perfMode}
        setPerfMode={setPerfMode}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* 左侧：输入与历史 */}
        <div>
          <div className="mb-2 font-medium text-gray-700">输入：</div>
          <TextArea
            rows={10}
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="粘贴 JSON 字符串，或 URL/Base64/JWT/混杂日志文本，点击解析"
          />
          <Divider className="my-3" />

          <HistoryPanel
            history={history}
            loading={loadingHistory}
            onLoadItem={(raw) => {
              setInputValue(raw)
              setTimeout(handleParse, 0)
            }}
            onHistoryChange={setHistory}
          />
        </div>

        {/* 右侧：结果与工具 */}
        <div>
          <div className="mb-2 font-medium text-gray-700">解析结果：</div>
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
          />

          <SearchPanel
            parsedValue={parsedValue}
            searchTerm={searchTerm}
            setSearchTerm={setSearchTerm}
            searchResults={searchResults}
            onSearch={handleSearch}
            onExportCsv={exportSearchCsv}
            jumpPath={jumpPath}
            setJumpPath={setJumpPath}
            onSelectPath={handleSelectPath}
            onCopyPath={handleCopyPath}
            onCopyDotPath={handleCopyDotPath}
            onCopyValueAtPath={handleCopyValueAtPath}
            selectedPath={selectedPath}
            steps={steps}
          />

          <Divider className="my-3" />

          <SchemaValidator
            parsedValue={parsedValue}
            onSelectPath={handleSelectPath}
            onCopyPath={handleCopyPath}
          />

          <Divider className="my-3" />

          <TypeScriptGenerator parsedValue={parsedValue} darkMode={darkMode} />
        </div>
      </div>
    </div>
    </ConfigProvider>
  )
}

export default IndexPopup
