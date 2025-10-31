// Virtual scrolling list for large root-level objects/arrays
// Performance optimization to prevent UI freezing

import React, { useState } from "react"
import { Button, Space } from "antd"
import type { VirtualRootProps, JsonValue } from "../types"

/**
 * Summarize a value for display in virtual list
 */
const summarize = (v: JsonValue): string => {
  const t = Object.prototype.toString.call(v).slice(8, -1)

  if (v == null) return String(v)

  if (typeof v === "string") {
    const s = v.length > 120 ? v.slice(0, 117) + "..." : v
    return `string(${v.length}) ${s}`
  }

  if (Array.isArray(v)) return `Array(${v.length})`

  if (typeof v === "object") return `Object(${Object.keys(v).length})`

  return `${t}: ${String(v)}`
}

/**
 * Virtual list component for large root-level data
 * Only renders visible items for performance
 */
export const VirtualRoot: React.FC<VirtualRootProps> = ({
  items,
  height = 320,
  itemHeight = 28,
  onSelectPath,
  onCopyPath,
  onCopyValueAtPath
}) => {
  const [scrollTop, setScrollTop] = useState(0)

  const total = items.length
  const totalHeight = total * itemHeight
  const visibleCount = Math.ceil(height / itemHeight) + 8 // overscan
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - 4)
  const end = Math.min(total, start + visibleCount)
  const slice = items.slice(start, end)

  return (
    <div
      className="border rounded-md bg-gray-50 overflow-auto"
      style={{ height }}
      onScroll={(e) => setScrollTop((e.target as HTMLDivElement).scrollTop)}
    >
      <div style={{ height: totalHeight, position: "relative" }}>
        {slice.map((it) => {
          const top = it.idx * itemHeight
          return (
            <div
              key={it.idx}
              style={{
                position: "absolute",
                left: 0,
                right: 0,
                top,
                height: itemHeight,
                display: "flex",
                alignItems: "center",
                padding: "0 8px"
              }}
            >
              <Space size={8}>
                <code className="text-xs text-gray-600">
                  {typeof it.key === "number" ? `[${it.key}]` : String(it.key)}
                </code>
                <span className="text-gray-700 text-xs">
                  {summarize(it.value)}
                </span>
                <Button size="small" onClick={() => onSelectPath(it.path)}>
                  展开
                </Button>
                <Button size="small" onClick={() => onCopyPath(it.path)}>
                  复制路径
                </Button>
                <Button size="small" onClick={() => onCopyValueAtPath(it.path)}>
                  复制值
                </Button>
              </Space>
            </div>
          )
        })}
      </div>
    </div>
  )
}
