// Core type definitions for the JSON Parser extension
// Eliminates all 'any' types with proper type definitions

// 修正导入路径：types 位于 src 根目录，应从 src/utils 引入
import type { HistoryItem } from "./utils/history"

// JSON value types
export type JsonPrimitive = string | number | boolean | null
export type JsonArray = JsonValue[]
export type JsonObject = { [key: string]: JsonValue }
export type JsonValue = JsonPrimitive | JsonArray | JsonObject

// Smart parsing options
export interface SmartParseOptions {
  autoDecode?: boolean
  sortKeys?: boolean
  parseNested?: boolean
}

// Smart parsing result
export interface SmartParseResult {
  data: JsonValue
  steps: string[]
}

// Schema validation result
export interface SchemaValidationResult {
  ok: boolean
  errors?: Array<{
    path: string
    message: string
    keyword?: string
  }>
}

// Virtual list item for performance mode
export interface VirtualItem {
  idx: number
  key: string | number
  value: JsonValue
  path: string
}

// TypeScript generation options
export interface TsGenOptionsUI {
  rootName: string
  sample: number
  enumMode: boolean
  enumMax: number
  enumMaxLen: number
  enumNumberMode: boolean
  enumNumMax: number
  detectDate: boolean
  aggressive: boolean
  editMode: boolean
}

// Clipboard permission state
export type ClipboardPermState = boolean | null

// Component props
export interface JsonViewerProps {
  parsedValue: JsonValue | null
  error: string
  collapseDepth: number
  expandedPaths: string[]
  onCopy: (e: { src: unknown }) => boolean
  containerRef: React.RefObject<HTMLDivElement>
}

export interface SearchPanelProps {
  onExportCsv: () => void
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
  onCopyDotPath: (path: string) => void
  onCopyValueAtPath: (path: string) => void
}

export interface SchemaValidatorProps {
  parsedValue: JsonValue | null
  schemaText: string
  setSchemaText: (text: string) => void
  schemaResult: SchemaValidationResult | null
  schemaBusy: boolean
  onValidate: () => void
  onFormat: () => void
  onLoadSample: () => void
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
}

export interface TypeScriptGeneratorProps {
  parsedValue: JsonValue | null
  tsCode: string
  setTsCode: (code: string) => void
  options: TsGenOptionsUI
  onUpdateOptions: (updates: Partial<TsGenOptionsUI>) => void
  onGenerate: () => void
  onCopy: () => void
  onDownload: () => void
  onFormat: () => void
  tsBusy: boolean
}

export interface HistoryPanelProps {
  onLoadItem: (raw: string) => void
}

export interface VirtualRootProps {
  items: VirtualItem[]
  height?: number
  itemHeight?: number
  onSelectPath: (path: string) => void
  onCopyPath: (path: string) => void
  onCopyValueAtPath: (path: string) => void
}

// API Builder types
export type ApiRequestState = "idle" | "loading" | "success" | "error"

export interface ApiResponse {
  status: number
  statusText: string
  headers: Record<string, string>
  data: string
  duration: number
  error?: string
}

export interface ApiBuilderProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
}

// Data Masking types
export interface DataMaskingPanelProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
  onApplyMaskedData?: (data: JsonValue) => void
}

// Data Visualization types
export interface DataVisualizationProps {
  parsedValue: JsonValue | null
  darkMode?: boolean
}

// Re-export HistoryItem for convenience
export type { HistoryItem }
