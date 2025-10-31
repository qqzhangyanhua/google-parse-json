// 简易历史记录封装 - 使用 chrome.storage.local 存储最近 N 条解析记录
// 仅依赖扩展权限 "storage"

export type HistoryItem = {
  id: string
  raw: string // 原始输入（注意大小限制）
  time: number // 时间戳 ms
  steps?: string[] // 解析步骤信息
}

const HISTORY_KEY = "parse_history_v1"
const MAX_ITEMS = 20
const MAX_RAW_LENGTH = 500_000 // 超过则不保存，避免 storage 额度风险

export const loadHistory = async (): Promise<HistoryItem[]> => {
  try {
    const res = await chrome.storage.local.get(HISTORY_KEY)
    const list: HistoryItem[] = res[HISTORY_KEY] || []
    return Array.isArray(list) ? list : []
  } catch (e) {
    // 降级为空
    return []
  }
}

export const saveHistoryItem = async (raw: string, steps?: string[]) => {
  try {
    if (!raw || raw.length > MAX_RAW_LENGTH) {
      return // 太大不保存
    }
    const list = await loadHistory()
    const item: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      raw,
      time: Date.now(),
      steps
    }
    // 去重：若上一次相同 raw，则不重复保存
    const last = list[0]
    const newList = last && last.raw === raw ? list : [item, ...list]
    // 截断
    const cut = newList.slice(0, MAX_ITEMS)
    await chrome.storage.local.set({ [HISTORY_KEY]: cut })
  } catch (e) {
    // 忽略存储失败
  }
}

export const clearHistory = async () => {
  try {
    await chrome.storage.local.remove(HISTORY_KEY)
  } catch (e) {
    // 忽略
  }
}

// 按 id 删除单条记录
export const removeHistoryItem = async (id: string) => {
  try {
    const list = await loadHistory()
    const cut = list.filter((it) => it.id !== id)
    await chrome.storage.local.set({ [HISTORY_KEY]: cut })
  } catch (e) {
    // 忽略失败
  }
}
