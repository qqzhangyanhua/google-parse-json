// 性能监控面板组件
import React, { useState, useEffect } from "react"
import { Card, Button, Table, Tag, Space, Descriptions, Alert } from "antd"
import { ReloadOutlined, DeleteOutlined, DownloadOutlined } from "@ant-design/icons"
import type { JsonValue } from "../types"
import { performanceMonitor, formatDuration, type PerformanceMetrics } from "../utils/performance-monitor"
import { downloadText } from "../utils/json-path"

interface PerformanceMonitorProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
}

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({ darkMode = false }) => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>(performanceMonitor.getMetrics())

  const refresh = () => {
    setMetrics(performanceMonitor.getMetrics())
  }

  useEffect(() => {
    const interval = setInterval(refresh, 2000)
    return () => clearInterval(interval)
  }, [])

  const handleClear = () => {
    performanceMonitor.clearHistory()
    refresh()
  }

  const handleExport = () => {
    const report = JSON.stringify(metrics, null, 2)
    downloadText(report, "performance-report.json")
  }

  const recommendations = performanceMonitor.getRecommendations(metrics)

  const columns = [
    { title: '操作类型', dataIndex: 'type', key: 'type', width: 100 },
    { title: '耗时', dataIndex: 'duration', key: 'duration', width: 100, render: (d: number) => formatDuration(d) },
    {
      title: '状态',
      dataIndex: 'success',
      key: 'success',
      width: 80,
      render: (s: boolean) => <Tag color={s ? 'success' : 'error'}>{s ? '成功' : '失败'}</Tag>
    },
    { title: '时间', dataIndex: 'timestamp', key: 'timestamp', width: 150, render: (t: number) => new Date(t).toLocaleTimeString() }
  ]

  return (
    <div className="p-4 overflow-auto max-h-[400px]">
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        <Card
          size="small"
          title="系统性能"
          extra={
            <Space>
              <Button size="small" icon={<ReloadOutlined />} onClick={refresh}>刷新</Button>
              <Button size="small" icon={<DownloadOutlined />} onClick={handleExport}>导出</Button>
              <Button size="small" icon={<DeleteOutlined />} onClick={handleClear} danger>清空</Button>
            </Space>
          }
        >
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="内存使用">
              {metrics.memoryUsage.used.toFixed(1)} / {metrics.memoryUsage.total.toFixed(1)} MB
              ({metrics.memoryUsage.percentage.toFixed(1)}%)
            </Descriptions.Item>
            <Descriptions.Item label="操作总数">{metrics.totalOperations}</Descriptions.Item>
            <Descriptions.Item label="平均解析时间">{formatDuration(metrics.averageParseTime)}</Descriptions.Item>
            <Descriptions.Item label="成功率">{metrics.successRate.toFixed(1)}%</Descriptions.Item>
          </Descriptions>
        </Card>

        {recommendations.length > 0 && (
          <Alert
            message="性能建议"
            description={
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {recommendations.map((rec, idx) => <li key={idx}>{rec}</li>)}
              </ul>
            }
            type="info"
            showIcon
          />
        )}

        <Card size="small" title={`操作历史 (最近${metrics.operationHistory.length}条)`}>
          <Table
            size="small"
            columns={columns}
            dataSource={metrics.operationHistory.slice(0, 20)}
            rowKey="id"
            pagination={false}
            scroll={{ y: 200 }}
          />
        </Card>
      </Space>
    </div>
  )
}
