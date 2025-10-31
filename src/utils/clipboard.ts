// Clipboard permission and operation utilities
// Handles Chrome extension optional permissions and focus issues

import { message } from "antd"

/**
 * Ensure clipboard permissions are granted
 * Requests optional permissions if not already granted
 */
export const ensureClipboardPermission = async (): Promise<boolean> => {
  try {
    // In extension environment
    if (!chrome?.permissions) return true

    const perms: string[] = ["clipboardRead", "clipboardWrite"]

    const has = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ permissions: perms }, (granted) =>
        resolve(Boolean(granted))
      )
    })

    if (has) return true

    const granted = await new Promise<boolean>((resolve) => {
      chrome.permissions.request({ permissions: perms }, (ok) =>
        resolve(Boolean(ok))
      )
    })

    return granted
  } catch {
    // Some environments don't support permissions API
    return true
  }
}

/**
 * Check current clipboard permission state
 */
export const checkClipboardPermission = async (): Promise<boolean> => {
  try {
    if (!chrome?.permissions) return true

    const perms: string[] = ["clipboardRead", "clipboardWrite"]
    const has = await new Promise<boolean>((resolve) => {
      chrome.permissions.contains({ permissions: perms }, (granted) =>
        resolve(Boolean(granted))
      )
    })

    return has
  } catch {
    return true
  }
}

/**
 * Read text from clipboard with robust error handling
 * Handles focus issues and permission denials
 */
export const readClipboardText = async (): Promise<string> => {
  try {
    // Ensure optional permissions are granted
    const ok = await ensureClipboardPermission()
    if (!ok) {
      throw Object.assign(new Error("用户未授权剪贴板权限"), {
        name: "NotAllowedError"
      })
    }

    // Pre-check clipboard permission if supported
    try {
      const perm = await (navigator as any)?.permissions?.query?.({
        name: "clipboard-read" as any
      })
      if (perm?.state === "denied") {
        const err = new Error(
          "读取剪贴板被浏览器设置拒绝，请在浏览器的站点/隐私设置中允许「读取剪贴板」"
        )
        ;(err as any).name = "NotAllowedError"
        throw err
      }
    } catch {
      // Ignore if permissions API not supported
    }

    // Ensure popup has focus to avoid DocumentNotFocused error
    if (!document.hasFocus()) {
      await new Promise((r) => setTimeout(r, 50))
    }

    return await navigator.clipboard.readText()
  } catch (e: unknown) {
    const error = e as { name?: string; message?: string }

    // Output detailed log for debugging
    console.error("Clipboard read failed:", error?.name, error?.message, error)

    const msg = (() => {
      if (error?.name === "NotAllowedError") {
        return "读取剪贴板被拒绝：请检查扩展是否授予剪贴板权限，或在浏览器设置中放行"
      }

      const m = String(error?.message || "")
      if (
        m.includes("Document is not focused") ||
        m.toLowerCase().includes("focus")
      ) {
        return "读取失败：当前弹窗未获得焦点，请先点击弹窗后再试"
      }

      if (
        m.toLowerCase().includes("permission") ||
        m.toLowerCase().includes("denied")
      ) {
        return "读取失败：浏览器或站点权限限制，请在设置中允许读取剪贴板"
      }

      return "无法读取剪贴板内容，请授予权限或手动粘贴"
    })()

    throw new Error(msg)
  }
}

/**
 * Copy text to clipboard with permission handling
 */
export const copyText = async (
  text: string,
  successMsg = "已复制"
): Promise<void> => {
  try {
    const ok = await ensureClipboardPermission()
    if (!ok) {
      message.error("复制失败：未授予剪贴板权限")
      return
    }

    await navigator.clipboard.writeText(text)
    message.success(successMsg)
  } catch (e: unknown) {
    const error = e as { message?: string }
    const m = String(error?.message || "")

    if (
      m.toLowerCase().includes("permission") ||
      m.toLowerCase().includes("denied")
    ) {
      message.error("复制失败：浏览器权限限制，请在设置中允许写入剪贴板")
    } else {
      message.error("复制失败")
    }
  }
}
