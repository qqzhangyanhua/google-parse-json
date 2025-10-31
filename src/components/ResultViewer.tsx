// 解析结果展示组件：虚拟列表 + ReactJson 渲染与受控折叠

import React from "react"
import ReactJson from "react-json-view"
import { Button } from "antd"
import type { JsonValue } from "../types"
import { VirtualRoot } from "./VirtualRoot"

interface ResultViewerProps {
  parsedValue: JsonValue | null
  error: string
  perfMode: boolean
  isLargeRoot: boolean
  forceRenderAll: boolean
  setForceRenderAll: (v: boolean) => void
  collapseDepth: number
  expandedPaths: string[]
  nsToJsonPath: (ns: (string | number)[]) => string
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
  onCopyValueAtPath: (path: string) => void
  containerRef: React.RefObject<HTMLDivElement>
  onCopy: (e: { src: unknown }) => boolean
  buildRootVirtualItems: () => Array<{ idx: number; key: string | number; value: JsonValue; path: string }>
  darkMode?: boolean
  fontSize?: number
}

export const ResultViewer: React.FC<ResultViewerProps> = ({
  parsedValue,
  error,
  perfMode,
  isLargeRoot,
  forceRenderAll,
  setForceRenderAll,
  collapseDepth,
  expandedPaths,
  nsToJsonPath,
  onSelectPath,
  onCopyPath,
  onCopyValueAtPath,
  containerRef,
  onCopy,
  buildRootVirtualItems,
  darkMode = false,
  fontSize = 13
}) => {
  return (
    <div className="mb-2">
      {perfMode && isLargeRoot && !forceRenderAll && (
        <div className="text-xs text-gray-600 mb-2">
          性能模式已启用：根层有大量元素，仅显示虚拟列表。可点击“渲染全部”查看完整树。
        </div>
      )}
      {perfMode && isLargeRoot && !forceRenderAll ? (
        <>
          <VirtualRoot
            items={buildRootVirtualItems()}
            height={320}
            onSelectPath={onSelectPath}
            onCopyPath={onCopyPath}
            onCopyValueAtPath={onCopyValueAtPath}
          />
          <div className="mt-2">
            <Button size="small" onClick={() => setForceRenderAll(true)}>
              渲染全部
            </Button>
          </div>
        </>
      ) : (
        <div
          ref={containerRef}
          className={`border rounded-md p-3 min-h-[288px] overflow-auto scroll-smooth ${
            darkMode ? "bg-gray-900 text-gray-100" : "bg-gray-50"
          }`}
        >
          {error ? (
            <div className="text-red-500 text-sm">{error}</div>
          ) : parsedValue ? (
            <ReactJson
              src={parsedValue as any}
              theme={darkMode ? "ocean" : "rjv-default"}
              name={false}
              collapseStringsAfterLength={30}
              enableClipboard={onCopy}
              displayDataTypes={false}
              displayObjectSize={false}
              style={{
                backgroundColor: "transparent",
                fontSize: `${fontSize}px`,
                fontFamily: "Menlo, Monaco, Consolas, 'Courier New', monospace"
              }}
              iconStyle="square"
              shouldCollapse={(field: any) => {
                // 根据 expandedPaths 强制展开匹配路径；否则按默认深度折叠
                const ns: (string | number)[] = field?.namespace || []
                const nsPath = nsToJsonPath(ns)
                const nsPathNoHead = ns.length > 0 ? nsToJsonPath(ns.slice(1)) : nsPath
                if (
                  expandedPaths.some(
                    (ep) =>
                      ep.startsWith(nsPath) ||
                      nsPath.startsWith(ep) ||
                      ep.startsWith(nsPathNoHead) ||
                      nsPathNoHead.startsWith(ep)
                  )
                ) {
                  return false
                }
                const depth = ns.length
                return depth > collapseDepth
              }}
            />
          ) : (
            <div className="text-gray-400">解析结果将显示在此处...</div>
          )}
        </div>
      )}
    </div>
  )
}
