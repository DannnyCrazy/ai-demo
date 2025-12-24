import React, { useState, useEffect } from "react"
import { createRoot } from "react-dom/client"
import JSZip from "jszip"

interface ModelInfo {
  id: string
  title: string
  specs: Record<string, string>
  images: string[]
  models: string[]
}

interface ScrapedData {
  models: ModelInfo[]
  totalCount: number
  downloadTime: string
}

const ScrapingButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("")

  const scrapeData = async () => {
    setIsLoading(true)
    setStatus("正在爬取数据...")

    try {
      // Step 1: Get model IDs from the page
      setStatus("获取模型列表...")
      const modelIds = await getModelIds()
      
      if (modelIds.length === 0) {
        throw new Error("未找到模型数据")
      }

      // Step 2: Get detailed info for each model
      setStatus(`正在获取 ${modelIds.length} 个模型的详细信息...`)
      const models: ModelInfo[] = []
      
      for (let i = 0; i < modelIds.length; i++) {
        setStatus(`获取模型 ${i + 1}/${modelIds.length}...`)
        const modelInfo = await getModelInfo(modelIds[i])
        if (modelInfo) {
          models.push(modelInfo)
        }
      }

      if (models.length === 0) {
        throw new Error("未能获取任何模型数据")
      }

      // Step 3: Download files and create ZIP
      setStatus("正在下载文件并创建压缩包...")
      const scrapedData: ScrapedData = {
        models,
        totalCount: models.length,
        downloadTime: new Date().toLocaleString("zh-CN")
      }

      const zipBlob = await createZipFile(scrapedData)
      
      // Step 4: Trigger download
      setStatus("下载中...")
      downloadFile(zipBlob, `casterfind-models-${Date.now()}.zip`)
      
      setStatus("完成！")
      setTimeout(() => setStatus(""), 3000)
      
    } catch (error) {
      console.error("爬取失败:", error)
      setStatus(`错误: ${error instanceof Error ? error.message : "未知错误"}`)
      setTimeout(() => setStatus(""), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const getModelIds = async (): Promise<string[]> => {
    // Try to find model IDs from the current page
    // This is a placeholder - implement based on actual page structure
    try {
      // Look for API calls or data in the page
      const response = await fetch(window.location.href)
      const text = await response.text()
      
      // Try to extract model IDs from the page content
      // This regex looks for common patterns
      const modelIdPattern = /["']modelId["']\s*:\s*["']([^"']+)["']/g
      const matches = [...text.matchAll(modelIdPattern)]
      
      if (matches.length > 0) {
        return matches.map(match => match[1])
      }
      
      // Fallback: try to find in window object
      const modelIds = (window as any).modelIds || (window as any).models?.map((m: any) => m.id)
      if (modelIds && Array.isArray(modelIds)) {
        return modelIds
      }
      
      // If nothing found, return empty array
      return []
    } catch (error) {
      console.error("获取模型ID失败:", error)
      return []
    }
  }

  const getModelInfo = async (modelId: string): Promise<ModelInfo | null> => {
    try {
      // Try different API endpoints that might exist
      const endpoints = [
        `/api/model/${modelId}`,
        `/api/models/${modelId}`,
        `/model/${modelId}`,
        `/models/${modelId}`,
        `/api/product/${modelId}`,
        `/product/${modelId}`
      ]
      
      for (const endpoint of endpoints) {
        try {
          const response = await fetch(endpoint)
          if (response.ok) {
            const data = await response.json()
            return parseModelData(data, modelId)
          }
        } catch (error) {
          // Continue to next endpoint
          continue
        }
      }
      
      // If no API endpoint works, try to extract from page
      return extractModelInfoFromPage(modelId)
    } catch (error) {
      console.error(`获取模型 ${modelId} 信息失败:`, error)
      return null
    }
  }

  const parseModelData = (data: any, modelId: string): ModelInfo => {
    return {
      id: modelId,
      title: data.title || data.name || `模型 ${modelId}`,
      specs: data.specs || data.specifications || data.params || {},
      images: data.images || data.imageUrls || data.pics || [],
      models: data.models || data.modelFiles || data.files || []
    }
  }

  const extractModelInfoFromPage = (modelId: string): ModelInfo | null => {
    // Try to extract model info from the current page DOM
    try {
      // Look for model information in the page
      const title = document.querySelector("h1, h2, .title, .product-title")?.textContent?.trim() || `模型 ${modelId}`
      
      // Extract specs from tables or specific elements
      const specs: Record<string, string> = {}
      const specElements = document.querySelectorAll(".spec, .specification, .parameter")
      specElements.forEach(el => {
        const key = el.querySelector(".label, .key, th")?.textContent?.trim()
        const value = el.querySelector(".value, .val, td:last-child")?.textContent?.trim()
        if (key && value) {
          specs[key] = value
        }
      })
      
      // Extract image URLs
      const images: string[] = []
      const imgElements = document.querySelectorAll("img[src*='product'], img[src*='model'], .product-image img")
      imgElements.forEach(img => {
        const src = img.getAttribute("src")
        if (src && !src.includes("placeholder")) {
          images.push(new URL(src, window.location.origin).href)
        }
      })
      
      // Extract model file URLs
      const models: string[] = []
      const modelLinks = document.querySelectorAll("a[href*='.stp'], a[href*='.step'], a[href*='.igs'], a[href*='.zip']")
      modelLinks.forEach(link => {
        const href = link.getAttribute("href")
        if (href) {
          models.push(new URL(href, window.location.origin).href)
        }
      })
      
      return {
        id: modelId,
        title,
        specs,
        images,
        models
      }
    } catch (error) {
      console.error(`从页面提取模型 ${modelId} 信息失败:`, error)
      return null
    }
  }

  const createZipFile = async (data: ScrapedData): Promise<Blob> => {
    const zip = new JSZip()
    
    // Add info.json file
    zip.file("info.json", JSON.stringify(data, null, 2))
    
    // Create folders
    const imagesFolder = zip.folder("images")
    const modelsFolder = zip.folder("models")
    
    // Download and add images
    for (let i = 0; i < data.models.length; i++) {
      const model = data.models[i]
      for (let j = 0; j < model.images.length; j++) {
        try {
          const response = await fetch(model.images[j])
          const blob = await response.blob()
          const filename = `model_${model.id}_image_${j + 1}.${blob.type.split("/")[1] || "jpg"}`
          imagesFolder?.file(filename, blob)
        } catch (error) {
          console.error(`下载图片失败: ${model.images[j]}`, error)
        }
      }
    }
    
    // Download and add model files
    for (let i = 0; i < data.models.length; i++) {
      const model = data.models[i]
      for (let j = 0; j < model.models.length; j++) {
        try {
          const response = await fetch(model.models[j])
          const blob = await response.blob()
          const url = new URL(model.models[j])
          const filename = url.pathname.split("/").pop() || `model_${model.id}_file_${j + 1}`
          modelsFolder?.file(filename, blob)
        } catch (error) {
          console.error(`下载模型文件失败: ${model.models[j]}`, error)
        }
      }
    }
    
    return await zip.generateAsync({ type: "blob" })
  }

  const downloadFile = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <button
      onClick={scrapeData}
      disabled={isLoading}
      style={{
        position: "fixed",
        bottom: "20px",
        right: "20px",
        zIndex: 9999,
        backgroundColor: isLoading ? "#6b7280" : "#3b82f6",
        color: "white",
        padding: "10px 20px",
        borderRadius: "8px",
        border: "none",
        boxShadow: "0 4px 6px rgba(0, 0, 0, 0.1)",
        cursor: isLoading ? "not-allowed" : "pointer",
        fontSize: "14px",
        fontWeight: "500",
        transition: "all 0.2s ease"
      }}
      onMouseEnter={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = "#2563eb"
        }
      }}
      onMouseLeave={(e) => {
        if (!isLoading) {
          e.currentTarget.style.backgroundColor = "#3b82f6"
        }
      }}
    >
      {isLoading ? (
        <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
          {status || "正在爬取..."}
        </span>
      ) : (
        "爬取该页面数据"
      )}
    </button>
  )
}

// Inject the button into the page
const injectButton = () => {
  // Check if button already exists
  if (document.getElementById("plasmo-scraping-button")) {
    return
  }

  const container = document.createElement("div")
  container.id = "plasmo-scraping-button"
  document.body.appendChild(container)

  const root = createRoot(container)
  root.render(<ScrapingButton />)
}

// Initialize when DOM is ready
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", injectButton)
} else {
  injectButton()
}

// Re-inject on navigation changes (for SPAs)
let lastUrl = location.href
new MutationObserver(() => {
  const url = location.href
  if (url !== lastUrl) {
    lastUrl = url
    setTimeout(injectButton, 1000) // Wait for page to settle
  }
}).observe(document, { subtree: true, childList: true })

export {}