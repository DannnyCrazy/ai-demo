import type { PlasmoManifest } from "plasmo"

const manifest: PlasmoManifest = {
  manifest_version: 3,
  name: "CasterFind Data Scraper",
  version: "0.0.1",
  description: "从CasterFind网站抓取产品数据并下载为ZIP文件",
  permissions: ["activeTab", "storage"],
  host_permissions: [
    "https://casterfind.com/*",
    "https://*/*" // For downloading files from various domains
  ],
  content_scripts: [
    {
      matches: ["https://casterfind.com/*"],
      js: ["content.js"],
      run_at: "document_end",
      world: "MAIN"
    }
  ],
  action: {
    default_popup: "popup.html",
    default_icon: {
      "16": "icon16.png",
      "48": "icon48.png",
      "128": "icon128.png"
    }
  },
  icons: {
    "16": "icon16.png",
    "48": "icon48.png",
    "128": "icon128.png"
  }
}

export default manifest
