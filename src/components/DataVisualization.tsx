import React, { useState, useMemo } from "react"
import { Select, Alert, Segmented, Checkbox, Space } from "antd"
import { BarChartOutlined, LineChartOutlined, PieChartOutlined, AreaChartOutlined } from "@ant-design/icons"
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell
} from "recharts"
import type { DataVisualizationProps, JsonValue, JsonObject, JsonArray } from "../types"

type ChartType = "bar" | "line" | "pie" | "area"

const COLORS = ["#8884d8", "#82ca9d", "#ffc658", "#ff7c7c", "#8dd1e1", "#d084d0"]

/**
 * Analyze JSON array to find potential chart fields
 */
function analyzeArrayData(arr: JsonArray): {
  xFields: string[]
  yFields: string[]
} {
  if (arr.length === 0 || typeof arr[0] !== "object" || arr[0] === null) {
    return { xFields: [], yFields: [] }
  }

  const firstItem = arr[0] as JsonObject
  const xFields: string[] = []
  const yFields: string[] = []

  Object.entries(firstItem).forEach(([key, value]) => {
    if (typeof value === "number") {
      yFields.push(key)
    } else if (typeof value === "string" || typeof value === "number") {
      xFields.push(key)
    }
  })

  return { xFields, yFields }
}

/**
 * Transform JSON array to chart data format
 */
function transformToChartData(
  arr: JsonArray,
  xField: string,
  yFields: string[]
): Array<Record<string, string | number>> {
  return arr
    .filter((item): item is JsonObject => typeof item === "object" && item !== null)
    .map((item) => {
      const result: Record<string, string | number> = {}

      // Set X-axis value
      const xValue = item[xField]
      if (typeof xValue === "string" || typeof xValue === "number") {
        result[xField] = xValue
      } else {
        result[xField] = String(xValue)
      }

      // Set Y-axis values
      yFields.forEach((field) => {
        const yValue = item[field]
        if (typeof yValue === "number") {
          result[field] = yValue
        }
      })

      return result
    })
}

export const DataVisualization: React.FC<DataVisualizationProps> = ({ parsedValue }) => {
  const [chartType, setChartType] = useState<ChartType>("bar")
  const [xField, setXField] = useState<string>("")
  const [selectedYFields, setSelectedYFields] = useState<string[]>([])

  // Check if data is visualizable
  const analysis = useMemo(() => {
    if (!parsedValue || !Array.isArray(parsedValue)) {
      return null
    }

    const { xFields, yFields } = analyzeArrayData(parsedValue)

    if (xFields.length === 0 || yFields.length === 0) {
      return null
    }

    return { xFields, yFields, data: parsedValue }
  }, [parsedValue])

  // Set default selections
  useMemo(() => {
    if (analysis) {
      if (!xField && analysis.xFields.length > 0) {
        setXField(analysis.xFields[0])
      }
      if (selectedYFields.length === 0 && analysis.yFields.length > 0) {
        setSelectedYFields([analysis.yFields[0]])
      }
    }
  }, [analysis, xField, selectedYFields])

  // Transform data for chart
  const chartData = useMemo(() => {
    if (!analysis || !xField || selectedYFields.length === 0) {
      return []
    }
    return transformToChartData(analysis.data, xField, selectedYFields)
  }, [analysis, xField, selectedYFields])

  // Render different chart types
  const renderChart = (): React.ReactNode => {
    if (chartData.length === 0) {
      return null
    }

    const commonProps = {
      data: chartData,
      margin: { top: 10, right: 30, left: 0, bottom: 0 }
    }

    switch (chartType) {
      case "bar":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xField} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedYFields.map((field, idx) => (
                <Bar key={field} dataKey={field} fill={COLORS[idx % COLORS.length]} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        )

      case "line":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xField} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedYFields.map((field, idx) => (
                <Line
                  key={field}
                  type="monotone"
                  dataKey={field}
                  stroke={COLORS[idx % COLORS.length]}
                  strokeWidth={2}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )

      case "area":
        return (
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart {...commonProps}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey={xField} />
              <YAxis />
              <Tooltip />
              <Legend />
              {selectedYFields.map((field, idx) => (
                <Area
                  key={field}
                  type="monotone"
                  dataKey={field}
                  fill={COLORS[idx % COLORS.length]}
                  stroke={COLORS[idx % COLORS.length]}
                />
              ))}
            </AreaChart>
          </ResponsiveContainer>
        )

      case "pie":
        // For pie chart, use only the first Y field
        const pieData = chartData.map((item, idx) => ({
          name: String(item[xField]),
          value: Number(item[selectedYFields[0]]) || 0,
          fill: COLORS[idx % COLORS.length]
        }))

        return (
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={(entry) => `${entry.name}: ${entry.value}`}
                outerRadius={80}
                dataKey="value"
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        )

      default:
        return null
    }
  }

  // Handle Y field selection
  const handleYFieldChange = (field: string, checked: boolean): void => {
    if (checked) {
      setSelectedYFields((prev) => [...prev, field])
    } else {
      setSelectedYFields((prev) => prev.filter((f) => f !== field))
    }
  }

  // Show error if data is not visualizable
  if (!parsedValue) {
    return (
      <div className="p-4">
        <Alert
          message="没有可用数据"
          description="请先解析 JSON 数据"
          type="info"
          showIcon
        />
      </div>
    )
  }

  if (!Array.isArray(parsedValue)) {
    return (
      <div className="p-4">
        <Alert
          message="数据格式不支持"
          description="数据可视化功能需要 JSON 数组格式的数据"
          type="warning"
          showIcon
        />
      </div>
    )
  }

  if (!analysis) {
    return (
      <div className="p-4">
        <Alert
          message="无法生成图表"
          description="数组中的对象必须包含至少一个数值字段和一个可作为标签的字段"
          type="warning"
          showIcon
        />
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2">
        <BarChartOutlined style={{ fontSize: 20 }} />
        <span className="text-lg font-semibold">数据可视化</span>
      </div>

      {/* Chart Type Selector */}
      <div>
        <label className="block mb-2 text-sm font-medium">图表类型</label>
        <Segmented<ChartType>
          value={chartType}
          onChange={setChartType}
          options={[
            { label: "柱状图", value: "bar", icon: <BarChartOutlined /> },
            { label: "折线图", value: "line", icon: <LineChartOutlined /> },
            { label: "面积图", value: "area", icon: <AreaChartOutlined /> },
            { label: "饼图", value: "pie", icon: <PieChartOutlined /> }
          ]}
          block
        />
      </div>

      {/* X Axis Field */}
      <div>
        <label className="block mb-2 text-sm font-medium">X 轴字段（标签）</label>
        <Select
          value={xField}
          onChange={setXField}
          style={{ width: "100%" }}
          options={analysis.xFields.map((field) => ({ label: field, value: field }))}
        />
      </div>

      {/* Y Axis Fields */}
      <div>
        <label className="block mb-2 text-sm font-medium">
          Y 轴字段（数值）{chartType === "pie" && " - 饼图仅使用第一个选中字段"}
        </label>
        <Space direction="vertical">
          {analysis.yFields.map((field) => (
            <Checkbox
              key={field}
              checked={selectedYFields.includes(field)}
              onChange={(e) => handleYFieldChange(field, e.target.checked)}
            >
              {field}
            </Checkbox>
          ))}
        </Space>
      </div>

      {/* Chart Display */}
      {chartData.length > 0 && (
        <div className="mt-4 border rounded p-4" style={{ backgroundColor: "#fafafa" }}>
          {renderChart()}
        </div>
      )}

      {/* Info */}
      <Alert
        message={`共 ${analysis.data.length} 条数据`}
        type="info"
        showIcon
      />
    </div>
  )
}
