// Content script to read document.cookie as fallback
// This runs in the context of the webpage and can access document.cookie

import type { PlasmoCSConfig } from "plasmo";

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_start",
};

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCookies") {
    try {
      // Read document.cookie
      const cookieString = document.cookie;

      if (!cookieString) {
        sendResponse({ success: true, cookies: [], cookieHeader: "" });
        return true;
      }

      // Parse cookie string into structured format
      const cookies = cookieString.split(";").map((cookie) => {
        const [name, ...valueParts] = cookie.trim().split("=");
        return {
          name: name.trim(),
          value: valueParts.join("=").trim(),
        };
      });

      sendResponse({
        success: true,
        cookies,
        cookieHeader: cookieString,
        url: window.location.href,
        domain: window.location.hostname,
      });
    } catch (error) {
      sendResponse({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
    return true; // Keep channel open for async response
  }
});
