// 基于 Zustand 的全局状态仓库，集中管理弹窗涉及的核心 UI/数据状态

import { create } from "zustand"
import type { HistoryItem, JsonValue } from "../types"
import {
  loadHistory as readHistory,
  clearHistory as removeAllHistory,
  removeHistoryItem as removeHistoryById
} from "../utils/history"
import { searchJsonPaths } from "../utils/json-path"

type AppState = {
  inputValue: string
  setInputValue: (value: string) => void
  parsedValue: JsonValue | null
  setParsedValue: (value: JsonValue | null) => void
  error: string
  setError: (msg: string) => void
  autoDecode: boolean
  setAutoDecode: (flag: boolean) => void
  sortKeys: boolean
  setSortKeys: (flag: boolean) => void
  steps: string[]
  setSteps: (steps: string[]) => void
  history: HistoryItem[]
  setHistory: (items: HistoryItem[]) => void
  loadingHistory: boolean
  setLoadingHistory: (loading: boolean) => void
  searchTerm: string
  setSearchTerm: (term: string) => void
  searchResults: string[]
  setSearchResults: (paths: string[]) => void
  expandedPaths: string[]
  setExpandedPaths: (paths: string[]) => void
  addExpandedPath: (path: string) => void
  selectedPath: string
  setSelectedPath: (path: string) => void
  jumpPath: string
  setJumpPath: (path: string) => void
  clipPerm: boolean | null
  setClipPerm: (state: boolean | null) => void
  collapseDepth: number
  setCollapseDepth: (depth: number) => void
  perfMode: boolean
  setPerfMode: (flag: boolean) => void
  forceRenderAll: boolean
  setForceRenderAll: (flag: boolean) => void
  darkMode: boolean
  setDarkMode: (flag: boolean) => void
  antdPrimary: string
  setAntdPrimary: (color: string) => void
  fontSize: number
  setFontSize: (size: number) => void
  refreshHistory: () => Promise<void>
  clearHistoryList: () => Promise<void>
  removeHistoryEntry: (id: string) => Promise<void>
  performSearch: () => void
}

export const useAppStore = create<AppState>((set, get) => ({
  inputValue: "",
  setInputValue: (value) => set({ inputValue: value }),
  parsedValue: null,
  setParsedValue: (value) => set({ parsedValue: value }),
  error: "",
  setError: (msg) => set({ error: msg }),
  autoDecode: true,
  setAutoDecode: (flag) => set({ autoDecode: flag }),
  sortKeys: false,
  setSortKeys: (flag) => set({ sortKeys: flag }),
  steps: [],
  setSteps: (steps) => set({ steps }),
  history: [],
  setHistory: (items) => set({ history: items }),
  loadingHistory: false,
  setLoadingHistory: (loading) => set({ loadingHistory: loading }),
  searchTerm: "",
  setSearchTerm: (term) => set({ searchTerm: term }),
  searchResults: [],
  setSearchResults: (paths) => set({ searchResults: paths }),
  expandedPaths: [],
  setExpandedPaths: (paths) => set({ expandedPaths: paths }),
  addExpandedPath: (path) => {
    const { expandedPaths } = get()
    if (expandedPaths.includes(path)) return
    set({ expandedPaths: [...expandedPaths, path] })
  },
  selectedPath: "",
  setSelectedPath: (path) => set({ selectedPath: path }),
  jumpPath: "",
  setJumpPath: (path) => set({ jumpPath: path }),
  clipPerm: null,
  setClipPerm: (state) => set({ clipPerm: state }),
  collapseDepth: 2,
  setCollapseDepth: (depth) => set({ collapseDepth: depth }),
  perfMode: false,
  setPerfMode: (flag) => set({ perfMode: flag }),
  forceRenderAll: false,
  setForceRenderAll: (flag) => set({ forceRenderAll: flag }),
  darkMode: false,
  setDarkMode: (flag) => set({ darkMode: flag }),
  antdPrimary: "#1890ff",
  setAntdPrimary: (color) => set({ antdPrimary: color }),
  fontSize: 13,
  setFontSize: (size) => set({ fontSize: size }),
  refreshHistory: async () => {
    set({ loadingHistory: true })
    try {
      const list = await readHistory()
      set({ history: list })
    } finally {
      set({ loadingHistory: false })
    }
  },
  clearHistoryList: async () => {
    await removeAllHistory()
    await get().refreshHistory()
  },
  removeHistoryEntry: async (id: string) => {
    await removeHistoryById(id)
    await get().refreshHistory()
  },
  performSearch: () => {
    const { parsedValue, searchTerm } = get()
    if (!parsedValue || !searchTerm.trim()) {
      set({ searchResults: [] })
      return
    }
    const results = searchJsonPaths(parsedValue, searchTerm.trim())
    set({ searchResults: results })
  }
}))
