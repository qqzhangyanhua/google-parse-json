// 顶部工具栏组件：解析/导出/权限 + 解析参数开关

import React from "react"
import { Button, Switch, Space, Tooltip, InputNumber } from "antd"

interface HeaderBarProps {
  onPasteAndParse: () => void
  onParse: () => void
  onExport: () => void
  canExport: boolean
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
  canExport,
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
    <div className="flex items-center justify-between mb-3">
      <Space size={8}>
        <Button onClick={onPasteAndParse}>粘贴并解析</Button>
        <Button type="primary" onClick={onParse}>
          解析
        </Button>
        <Button onClick={onExport} disabled={!canExport}>
          导出 JSON
        </Button>
        {clipPerm !== true && (
          <Tooltip title="为复制/粘贴提供更好兼容性（可选）">
            <Button onClick={onRequestClipboardPermission}>请求剪贴板权限</Button>
          </Tooltip>
        )}
      </Space>

      <Space size={12}>
        <span className="text-gray-600 text-sm">自动解码</span>
        <Switch checked={autoDecode} onChange={setAutoDecode} />
        <span className="text-gray-600 text-sm">键排序</span>
        <Switch checked={sortKeys} onChange={setSortKeys} />
        <span className="text-gray-600 text-sm">折叠层级</span>
        <InputNumber
          size="small"
          min={0}
          max={8}
          value={collapseDepth}
          onChange={(v) => setCollapseDepth((v as number) ?? 2)}
        />
        <span className="text-gray-600 text-sm">性能模式</span>
        <Switch checked={perfMode} onChange={setPerfMode} />
        <span className="text-gray-600 text-sm">暗黑模式</span>
        <Switch checked={darkMode} onChange={setDarkMode} />
        <span className="text-gray-600 text-sm">字号</span>
        <InputNumber
          size="small"
          min={10}
          max={18}
          value={fontSize}
          onChange={(v) => setFontSize((v as number) ?? 13)}
        />
      </Space>
    </div>
  )
}
