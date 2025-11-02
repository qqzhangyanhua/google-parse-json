// UI 偏好设置的本地存储封装（使用 chrome.storage.local）

export interface UIPrefs {
  darkMode?: boolean
  fontSize?: number
}

const KEY = "ui_prefs_v1"

export const loadUIPrefs = async (): Promise<UIPrefs> => {
  try {
    const res = await chrome.storage.local.get(KEY)
    const val = res[KEY]
    if (val && typeof val === "object") return val as UIPrefs
  } catch {}
  return {}
}

export const saveUIPrefs = async (prefs: UIPrefs): Promise<void> => {
  try {
    const cur = await loadUIPrefs()
    const next = { ...cur, ...prefs }
    await chrome.storage.local.set({ [KEY]: next })
  } catch {}
}

