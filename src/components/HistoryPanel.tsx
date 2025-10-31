// History panel component - displays parsing history with load/delete actions

import React from "react"
import { Button, List, Tooltip, Space } from "antd"
// 修正导入路径：组件位于 src/components，应从 src/utils 引入
import type { HistoryItem } from "../utils/history"
import { clearHistory, removeHistoryItem, loadHistory } from "../utils/history"

interface HistoryPanelProps {
  history: HistoryItem[]
  loading: boolean
  onLoadItem: (raw: string) => void
  onHistoryChange: (history: HistoryItem[]) => void
}

export const HistoryPanel: React.FC<HistoryPanelProps> = ({
  history,
  loading,
  onLoadItem,
  onHistoryChange
}) => {
  const handleClear = () => {
    clearHistory().then(() => onHistoryChange([]))
  }

  const handleRemove = (id: string) => {
    removeHistoryItem(id).then(() => loadHistory().then(onHistoryChange))
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-700">历史记录</div>
        <Button danger size="small" onClick={handleClear}>
          清空
        </Button>
      </div>
      <div className="border rounded-md p-2 h-[140px] overflow-auto bg-gray-50">
        {loading ? (
          <div className="text-gray-400 text-sm">加载中...</div>
        ) : history.length === 0 ? (
          <div className="text-gray-400 text-sm">暂无历史记录</div>
        ) : (
          <List
            size="small"
            dataSource={history}
            renderItem={(item) => {
              const preview = (item.raw || "").slice(0, 100).replace(/\n/g, " ")
              const time = new Date(item.time).toLocaleString()
              return (
                <List.Item className="!py-1">
                  <Space size={8}>
                    <Tooltip title={time}>
                      <span className="text-gray-500 text-xs">{time}</span>
                    </Tooltip>
                    <Button size="small" onClick={() => onLoadItem(item.raw)}>
                      载入
                    </Button>
                    <Button
                      size="small"
                      danger
                      onClick={() => handleRemove(item.id)}
                    >
                      删除
                    </Button>
                    <span className="text-gray-700 text-xs truncate max-w-[360px]">
                      {preview}
                    </span>
                  </Space>
                </List.Item>
              )
            }}
          />
        )}
      </div>
    </div>
  )
}
