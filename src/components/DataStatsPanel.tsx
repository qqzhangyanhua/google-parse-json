// 数据统计分析面板组件
import React, { useMemo } from "react"
import { Button, Card, Descriptions, Progress, Tag, Space, Typography, Divider } from "antd"
import { BarChartOutlined, CheckCircleOutlined, WarningOutlined, CopyOutlined } from "@ant-design/icons"
import type { JsonValue } from "../types"
import { analyzeJsonData, formatBytes, generateStatsReport, type DataStats } from "../utils/data-stats"
import { copyText } from "../utils/clipboard"

const { Text, Title } = Typography

interface DataStatsPanelProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
  onSelectPath?: (path: string) => void
}

export const DataStatsPanel: React.FC<DataStatsPanelProps> = ({
  parsedValue,
  darkMode = false,
  onSelectPath
}) => {
  const stats: DataStats | null = useMemo(() => {
    if (!parsedValue) return null
    return analyzeJsonData(parsedValue)
  }, [parsedValue])

  const handleCopyReport = () => {
    if (!stats) return
    const report = generateStatsReport(stats)
    copyText(report, "统计报告已复制")
  }

  const handleFieldClick = (path: string) => {
    if (onSelectPath) {
      onSelectPath(path)
    }
  }

  if (!parsedValue || !stats) {
    return (
      <div className="p-4 text-center text-gray-500">
        请先解析 JSON 数据
      </div>
    )
  }

  const getQualityColor = (score: number): string => {
    if (score >= 80) return "success"
    if (score >= 60) return "warning"
    return "error"
  }

  const getQualityStatus = (score: number): string => {
    if (score >= 80) return "优秀"
    if (score >= 60) return "良好"
    return "需改进"
  }

  return (
    <div className={`p-4 overflow-auto max-h-[400px] ${darkMode ? "text-gray-100" : ""}`}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* 基础统计 */}
        <Card
          size="small"
          title={
            <Space>
              <BarChartOutlined />
              基础统计
            </Space>
          }
          extra={
            <Button
              size="small"
              icon={<CopyOutlined />}
              onClick={handleCopyReport}
            >
              复制报告
            </Button>
          }
        >
          <Descriptions size="small" column={2} bordered>
            <Descriptions.Item label="总字段数">{stats.totalFields}</Descriptions.Item>
            <Descriptions.Item label="对象数量">{stats.totalObjects}</Descriptions.Item>
            <Descriptions.Item label="数组数量">{stats.totalArrays}</Descriptions.Item>
            <Descriptions.Item label="最大深度">{stats.maxDepth}</Descriptions.Item>
            <Descriptions.Item label="预估大小" span={2}>
              {formatBytes(stats.estimatedSize)}
            </Descriptions.Item>
          </Descriptions>
        </Card>

        {/* 数据质量评分 */}
        <Card size="small" title="数据质量评分">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text>质量评分</Text>
              <Progress
                percent={stats.qualityScore}
                status={getQualityColor(stats.qualityScore) as "success" | "exception" | "normal"}
                format={(percent) => `${percent}/100 ${getQualityStatus(percent || 0)}`}
              />
            </div>
            <div>
              <Text>复杂度指数</Text>
              <Progress
                percent={Math.min(100, stats.complexityScore)}
                strokeColor={stats.complexityScore > 70 ? "#ff4d4f" : "#52c41a"}
                format={(percent) => `${stats.complexityScore}`}
              />
            </div>
          </Space>
        </Card>

        {/* 类型分布 */}
        <Card size="small" title="类型分布">
          <Space wrap>
            {Object.entries(stats.typeDistribution).map(([type, count]) => {
              const percentage = ((count / stats.totalFields) * 100).toFixed(1)
              return (
                <Tag key={type} color="blue">
                  {type}: {count} ({percentage}%)
                </Tag>
              )
            })}
          </Space>
        </Card>

        {/* 问题检测 */}
        {stats.issues.length > 0 && (
          <Card
            size="small"
            title={
              <Space>
                <WarningOutlined style={{ color: "#faad14" }} />
                检测到的问题
              </Space>
            }
          >
            <Space direction="vertical">
              {stats.issues.map((issue, idx) => (
                <Text key={idx} type="warning">
                  • {issue}
                </Text>
              ))}
            </Space>
          </Card>
        )}

        {/* 数组统计 */}
        {stats.arrayLengths.length > 0 && (
          <Card size="small" title="数组长度统计">
            <Descriptions size="small" column={2} bordered>
              <Descriptions.Item label="数组总数">{stats.arrayLengths.length}</Descriptions.Item>
              <Descriptions.Item label="平均长度">
                {(stats.arrayLengths.reduce((a, b) => a + b, 0) / stats.arrayLengths.length).toFixed(1)}
              </Descriptions.Item>
              <Descriptions.Item label="最小长度">{Math.min(...stats.arrayLengths)}</Descriptions.Item>
              <Descriptions.Item label="最大长度">{Math.max(...stats.arrayLengths)}</Descriptions.Item>
            </Descriptions>
          </Card>
        )}

        {/* 空字段 */}
        {stats.emptyFields.length > 0 && (
          <Card size="small" title={`空字段 (${stats.emptyFields.length}个)`}>
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              <Space direction="vertical" size="small">
                {stats.emptyFields.slice(0, 20).map((field, idx) => (
                  <Text
                    key={idx}
                    code
                    copyable
                    onClick={() => handleFieldClick(field)}
                    style={{ cursor: onSelectPath ? 'pointer' : 'default', fontSize: '12px' }}
                  >
                    {field}
                  </Text>
                ))}
                {stats.emptyFields.length > 20 && (
                  <Text type="secondary">... 还有 {stats.emptyFields.length - 20} 个</Text>
                )}
              </Space>
            </div>
          </Card>
        )}

        {/* 敏感字段 */}
        {stats.sensitiveFields.length > 0 && (
          <Card
            size="small"
            title={
              <Space>
                <WarningOutlined style={{ color: "#ff4d4f" }} />
                敏感字段 ({stats.sensitiveFields.length}个)
              </Space>
            }
          >
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              <Space direction="vertical" size="small">
                {stats.sensitiveFields.map((field, idx) => (
                  <Tag
                    key={idx}
                    color="red"
                    onClick={() => handleFieldClick(field)}
                    style={{ cursor: onSelectPath ? 'pointer' : 'default' }}
                  >
                    {field}
                  </Tag>
                ))}
              </Space>
            </div>
          </Card>
        )}

        {/* 重复值统计 */}
        {stats.duplicateValues.size > 0 && (
          <Card size="small" title={`重复值 (${stats.duplicateValues.size}个不同值)`}>
            <div style={{ maxHeight: '150px', overflow: 'auto' }}>
              <Space direction="vertical" size="small" style={{ width: '100%' }}>
                {Array.from(stats.duplicateValues.entries())
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([value, count], idx) => (
                    <div key={idx}>
                      <Text code copyable style={{ fontSize: '12px' }}>
                        {value.length > 50 ? value.substring(0, 50) + '...' : value}
                      </Text>
                      <Tag color="orange" style={{ marginLeft: '8px' }}>
                        {count}次
                      </Tag>
                    </div>
                  ))}
                {stats.duplicateValues.size > 10 && (
                  <Text type="secondary">... 还有 {stats.duplicateValues.size - 10} 个</Text>
                )}
              </Space>
            </div>
          </Card>
        )}
      </Space>
    </div>
  )
}
