import React, { useState, useMemo } from "react"
import { Button, Space, Checkbox, Alert, Divider, message } from "antd"
import {
  CopyOutlined,
  DownloadOutlined,
  ThunderboltOutlined,
  CheckCircleOutlined
} from "@ant-design/icons"
import type { DataMaskingPanelProps, JsonValue } from "../types"
import { maskData, DEFAULT_MASK_RULES, type MaskRule } from "../utils/data-masking"

export const DataMaskingPanel: React.FC<DataMaskingPanelProps> = ({
  parsedValue,
  onApplyMaskedData
}) => {
  const [rules, setRules] = useState<MaskRule[]>(DEFAULT_MASK_RULES)
  const [maskedResult, setMaskedResult] = useState<{
    data: JsonValue
    log: string[]
  } | null>(null)

  // Execute masking operation
  const handleMask = (): void => {
    if (!parsedValue) {
      message.warning("没有可用的 JSON 数据")
      return
    }

    const result = maskData(parsedValue, rules)
    setMaskedResult(result)

    if (result.log.length === 0) {
      message.info("未检测到敏感数据")
    } else {
      message.success(`成功脱敏 ${result.log.length} 个字段`)
    }
  }

  // Toggle rule enabled state
  const toggleRule = (ruleId: string): void => {
    setRules((prev) =>
      prev.map((rule) =>
        rule.id === ruleId ? { ...rule, enabled: !rule.enabled } : rule
      )
    )
  }

  // Copy masked JSON to clipboard
  const handleCopy = async (): Promise<void> => {
    if (!maskedResult) {
      message.warning("请先执行脱敏操作")
      return
    }

    try {
      const jsonText = JSON.stringify(maskedResult.data, null, 2)
      await navigator.clipboard.writeText(jsonText)
      message.success("脱敏数据已复制到剪贴板")
    } catch (err) {
      message.error("复制失败: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Apply masked data to current view
  const handleApply = (): void => {
    if (!maskedResult) {
      message.warning("请先执行脱敏操作")
      return
    }

    if (onApplyMaskedData) {
      onApplyMaskedData(maskedResult.data)
      message.success("已应用脱敏数据到当前视图")
    }
  }

  // Download masked data as JSON file
  const handleDownload = (): void => {
    if (!maskedResult) {
      message.warning("请先执行脱敏操作")
      return
    }

    try {
      const jsonText = JSON.stringify(maskedResult.data, null, 2)
      const blob = new Blob([jsonText], { type: "application/json" })
      const url = URL.createObjectURL(blob)
      const link = document.createElement("a")
      link.href = url
      link.download = `masked-data-${Date.now()}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      message.success("文件下载成功")
    } catch (err) {
      message.error("下载失败: " + (err instanceof Error ? err.message : String(err)))
    }
  }

  // Count enabled rules
  const enabledCount = useMemo(
    () => rules.filter((r) => r.enabled).length,
    [rules]
  )

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <ThunderboltOutlined style={{ fontSize: 20 }} />
        <span className="text-lg font-semibold">数据脱敏</span>
      </div>

      {/* Info Alert */}
      {!parsedValue && (
        <Alert
          message="请先解析 JSON 数据"
          description="在左侧输入框粘贴 JSON 数据后,点击解析按钮"
          type="info"
          showIcon
        />
      )}

      {/* Masking Rules */}
      <div>
        <div className="mb-2 text-sm font-medium">
          脱敏规则 ({enabledCount}/{rules.length} 已启用)
        </div>
        <div className="grid grid-cols-2 gap-2">
          {rules.map((rule) => (
            <Checkbox
              key={rule.id}
              checked={rule.enabled}
              onChange={() => toggleRule(rule.id)}
            >
              {rule.name}
            </Checkbox>
          ))}
        </div>
      </div>

      {/* Execute Button */}
      <Button
        type="primary"
        size="large"
        block
        icon={<ThunderboltOutlined />}
        onClick={handleMask}
        disabled={!parsedValue}
      >
        执行脱敏
      </Button>

      {/* Results */}
      {maskedResult && (
        <>
          <Divider />

          {/* Success Info */}
          <Alert
            message={
              <div className="flex items-center gap-2">
                <CheckCircleOutlined />
                <span>脱敏完成</span>
              </div>
            }
            description={`已处理 ${maskedResult.log.length} 个敏感字段`}
            type="success"
            showIcon={false}
          />

          {/* Operation Buttons */}
          <div>
            <div className="mb-2 text-sm font-medium">操作</div>
            <Space direction="vertical" style={{ width: "100%" }}>
              <Button
                icon={<CopyOutlined />}
                onClick={handleCopy}
                block
              >
                复制脱敏后的 JSON
              </Button>
              <Button
                icon={<CheckCircleOutlined />}
                onClick={handleApply}
                block
                type="primary"
              >
                应用到当前视图
              </Button>
              <Button
                icon={<DownloadOutlined />}
                onClick={handleDownload}
                block
              >
                下载为文件
              </Button>
            </Space>
          </div>

          {/* Masking Log */}
          {maskedResult.log.length > 0 && (
            <div>
              <div className="mb-2 text-sm font-medium">脱敏日志</div>
              <div
                className="p-3 rounded border overflow-auto"
                style={{
                  backgroundColor: "#f5f5f5",
                  maxHeight: 200,
                  fontSize: 12,
                  fontFamily: "monospace"
                }}
              >
                {maskedResult.log.map((entry, idx) => (
                  <div key={idx} className="mb-1">
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
