// Search panel component - path search and navigation

import React from "react"
import { Button, Input, List, Space } from "antd"
import type { JsonValue } from "../types"

interface SearchPanelProps {
  parsedValue: JsonValue | null
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchResults: string[]
  onSearch: () => void
  onExportCsv: () => void
  jumpPath: string
  setJumpPath: (path: string) => void
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
  onCopyDotPath: (path: string) => void
  onCopyValueAtPath: (path: string) => void
  selectedPath: string
  steps: string[]
}

export const SearchPanel: React.FC<SearchPanelProps> = ({
  parsedValue,
  searchTerm,
  setSearchTerm,
  searchResults,
  onSearch,
  onExportCsv,
  jumpPath,
  setJumpPath,
  onSelectPath,
  onCopyPath,
  onCopyDotPath,
  onCopyValueAtPath,
  selectedPath,
  steps
}) => {
  return (
    <div className="mt-3">
      <div className="font-medium text-gray-700 mb-2">搜索路径：</div>

      {/* Search input */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          placeholder="输入关键字，匹配键与值（不区分大小写）"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          onPressEnter={onSearch}
        />
        <Button onClick={onSearch} disabled={!parsedValue}>
          搜索
        </Button>
        {searchResults.length > 0 && (
          <>
            <span className="text-gray-600 text-sm">
              {searchResults.length} 条命中
            </span>
            <Button size="small" onClick={onExportCsv}>
              导出命中CSV
            </Button>
          </>
        )}
      </div>

      {/* Jump to path input */}
      <div className="flex items-center gap-2 mb-2">
        <Input
          placeholder='输入 JSONPath（如 $["data"][0]["id"]）并跳转'
          value={jumpPath}
          onChange={(e) => setJumpPath(e.target.value)}
          onPressEnter={() => jumpPath && onSelectPath(jumpPath)}
        />
        <Button
          onClick={() => jumpPath && onSelectPath(jumpPath)}
          disabled={!parsedValue}
        >
          跳转
        </Button>
      </div>

      {/* Search results list */}
      <div className="border rounded-md p-2 h-[140px] overflow-auto bg-gray-50">
        {searchResults.length === 0 ? (
          <div className="text-gray-400 text-sm">无搜索结果</div>
        ) : (
          <List
            size="small"
            dataSource={searchResults}
            renderItem={(p) => (
              <List.Item className="!py-1">
                <Space size={6}>
                  <Button size="small" onClick={() => onSelectPath(p)}>
                    展开
                  </Button>
                  <Button size="small" onClick={() => onCopyPath(p)}>
                    复制路径
                  </Button>
                  <Button size="small" onClick={() => onCopyDotPath(p)}>
                    复制点路径
                  </Button>
                  <Button
                    size="small"
                    onClick={() => onCopyValueAtPath(p)}
                    disabled={!parsedValue}
                  >
                    复制值
                  </Button>
                </Space>
                <code className="text-xs ml-2">{p}</code>
              </List.Item>
            )}
          />
        )}
      </div>

      {/* Status info */}
      {selectedPath && (
        <div className="text-gray-600 text-xs mt-2">
          已展开路径：<code>{selectedPath}</code>
        </div>
      )}
      {steps.length > 0 && (
        <div className="text-gray-500 text-xs mt-2">
          解析步骤：{steps.join(" / ")}
        </div>
      )}
    </div>
  )
}
