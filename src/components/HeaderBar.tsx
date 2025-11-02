// 顶部工具栏组件:解析/导出/权限 + 解析参数开关

import React from "react"
import { Button, Switch, Tooltip, InputNumber } from "antd"

interface HeaderBarProps {
  onPasteAndParse: () => void
  onParse: () => void
  onExport: () => void
  onFormat: () => void
  onMinify: () => void
  canExport: boolean
  hasInput: boolean
  clipPerm: boolean | null
  onRequestClipboardPermission: () => void
  autoDecode: boolean
  setAutoDecode: (v: boolean) => void
  sortKeys: boolean
  setSortKeys: (v: boolean) => void
  collapseDepth: number
  setCollapseDepth: (v: number) => void
  perfMode: boolean
  setPerfMode: (v: boolean) => void
  darkMode: boolean
  setDarkMode: (v: boolean) => void
  fontSize: number
  setFontSize: (v: number) => void
}

export const HeaderBar: React.FC<HeaderBarProps> = ({
  onPasteAndParse,
  onParse,
  onExport,
  onFormat,
  onMinify,
  canExport,
  hasInput,
  clipPerm,
  onRequestClipboardPermission,
  autoDecode,
  setAutoDecode,
  sortKeys,
  setSortKeys,
  collapseDepth,
  setCollapseDepth,
  perfMode,
  setPerfMode,
  darkMode,
  setDarkMode,
  fontSize,
  setFontSize
}) => {
  return (
    <div className="mb-3 space-y-2">
      {/* 主操作按钮行 */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2 items-center">
          <Button type="primary" onClick={onParse} >
            解析
          </Button>
          <Button onClick={onPasteAndParse} >
            粘贴并解析
          </Button>
          <Button onClick={onExport} disabled={!canExport}>
            导出 JSON
          </Button>
          <Button onClick={onFormat} disabled={!hasInput}>
            格式化
          </Button>
          <Button onClick={onMinify} disabled={!hasInput}>
            压缩
          </Button>
        </div>

        <div className="flex gap-2 items-center">
          {clipPerm !== true && (
            <Tooltip title="为复制/粘贴提供更好兼容性(可选)">
              <Button size="small" onClick={onRequestClipboardPermission}>
                授权剪贴板
              </Button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* 配置选项行 - 紧凑单行布局 */}
      <div className="flex justify-between items-center text-xs">
        <div className="flex gap-3 items-center">
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">自动解码</span>
            <Switch size="small" checked={autoDecode} onChange={setAutoDecode} />
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">键排序</span>
            <Switch size="small" checked={sortKeys} onChange={setSortKeys} />
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">性能模式</span>
            <Switch size="small" checked={perfMode} onChange={setPerfMode} />
          </div>
        </div>

        <div className="flex gap-3 items-center">
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">折叠</span>
            <InputNumber
              size="small"
              min={0}
              max={8}
              value={collapseDepth}
              onChange={(v) => setCollapseDepth((v as number) ?? 2)}
              style={{ width: 50 }}
            />
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">字号</span>
            <InputNumber
              size="small"
              min={10}
              max={18}
              value={fontSize}
              onChange={(v) => setFontSize((v as number) ?? 13)}
              style={{ width: 50 }}
            />
          </div>
          <div className="flex gap-1 items-center">
            <span className="text-gray-600 dark:text-gray-400">暗黑</span>
            <Switch size="small" checked={darkMode} onChange={setDarkMode} />
          </div>
        </div>
      </div>
    </div>
  )
}
