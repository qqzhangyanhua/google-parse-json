// 路径搜索面板：提供搜索、跳转、复制等操作

import React from "react"
import { Button, Input, List } from "antd"
import type { JsonValue } from "../types"

interface SearchPanelProps {
  parsedValue: JsonValue | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchResults: string[]
  jumpPath: string
  setJumpPath: (path: string) => void
  selectedPath: string
  steps: string[]
  performSearch: () => void
  onExportCsv: () => void
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
  onCopyDotPath: (path: string) => void
  onCopyValueAtPath: (path: string) => void
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  parsedValue,
  searchTerm,
  setSearchTerm,
  searchResults,
  jumpPath,
  setJumpPath,
  selectedPath,
  steps,
  performSearch,
  onExportCsv,
  onSelectPath,
  onCopyPath,
  onCopyDotPath,
  onCopyValueAtPath
}) => {

  return (
    <div className="mt-2">
      <div className="font-semibold text-sm text-purple-600 dark:text-purple-400 mb-2 flex items-center gap-2">
        <span>🔍 路径搜索</span>
        {searchResults.length > 0 && (
          <span className="text-xs text-gray-500">({searchResults.length} 条)</span>
        )}
      </div>

      {/* Search input */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          size="small"
          placeholder="输入关键字搜索（键/值/路径，支持点/方括号）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onPressEnter={performSearch}
          className="flex-1"
        />
        <Button size="small" type="primary" onClick={performSearch} disabled={!parsedValue}>
          搜索
        </Button>
        {searchResults.length > 0 && (
          <Button size="small" onClick={onExportCsv}>
            导出CSV
          </Button>
        )}
      </div>

      {/* Jump to path input */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          size="small"
          placeholder='JSONPath 快速跳转（如 $.data[0] 或 $["data"][0]）'
          value={jumpPath}
          onChange={(e) => setJumpPath(e.target.value)}
          onPressEnter={() => jumpPath && onSelectPath(jumpPath)}
          className="flex-1"
        />
        <Button
          size="small"
          onClick={() => jumpPath && onSelectPath(jumpPath)}
          disabled={!parsedValue}
        >
          跳转
        </Button>
      </div>

      {/* Search results list */}
      {searchResults.length > 0 && (
        <div className="border rounded-md p-2 max-h-[120px] overflow-auto bg-gray-50 dark:bg-gray-800">
          <List
            size="small"
            dataSource={searchResults}
            renderItem={(p) => (
              <List.Item
                className={`!py-1 search-hit cursor-pointer rounded transition-colors ${
                  p === selectedPath ? "search-hit-selected" : ""
                }`}
                onClick={() => onSelectPath(p)}
              >
                <div className="flex items-center justify-between w-full">
                  <code className="text-xs text-gray-700 dark:text-gray-300 flex-1 truncate">{p}</code>
                  <div className="flex gap-1 ml-2">
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopyPath(p)
                      }}
                    >
                      复制
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopyDotPath(p)
                      }}
                    >
                      点
                    </Button>
                    <Button
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation()
                        onCopyValueAtPath(p)
                      }}
                      disabled={!parsedValue}
                    >
                      值
                    </Button>
                  </div>
                </div>
              </List.Item>
            )}
          />
        </div>
      )}

      {/* Status info */}
      {steps.length > 0 && (
        <div className="text-gray-500 dark:text-gray-400 text-xs mt-1">
          解析步骤: {steps.join(" → ")}
        </div>
      )}
    </div>
  )
}
