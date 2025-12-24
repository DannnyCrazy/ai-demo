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
  const [showConfirm, setShowConfirm] = useState(false)
  const [foundModelIds, setFoundModelIds] = useState<string[]>([])

  const checkModels = async () => {
    setIsLoading(true)
    setStatus("正在扫描页面...")

    try {
      // Step 1: Get model IDs from the page
      const modelIds = await getModelIds()
      
      if (modelIds.length === 0) {
        throw new Error("未找到模型数据")
      }

      setFoundModelIds(modelIds)
      setShowConfirm(true)
      setStatus("")
    } catch (error) {
      console.error("扫描失败:", error)
      setStatus(`错误: ${error instanceof Error ? error.message : "未知错误"}`)
      setTimeout(() => setStatus(""), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const startDownload = async () => {
    setShowConfirm(false)
    setIsLoading(true)
    setStatus("准备开始下载...")

    try {
      const modelIds = foundModelIds
      
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

  const extractSeedModelId = (): string | null => {
    // 策略 1 (优先): 从面包屑导航获取
    // 用户指定: 取 .el-breadcrumb 下最后一个 el-breadcrumb__item 的内容
    try {
      const items = document.querySelectorAll(".el-breadcrumb .el-breadcrumb__item")
      if (items.length > 0) {
        const lastItem = items[items.length - 1]
        // Element UI 的面包屑文本通常在 .el-breadcrumb__inner 中，但也可能直接在 item 下
        const textContainer = lastItem.querySelector(".el-breadcrumb__inner") || lastItem
        const text = textContainer.textContent?.trim()
        
        if (text) {
          console.log(`从面包屑获取到 ID 参数: ${text}`)
          return text
        }
      }
    } catch (e) {
      console.warn("从面包屑获取ID失败", e)
    }

    // 策略 2: 尝试从页面文本中找到形如 "10B20-1513" 的ID
    // 这种ID通常由 数字字母-数字 组成
    const bodyText = document.body.innerText
    // 匹配形如 10B20-1513 的模式
    const regex = /\b[0-9A-Z]+-\d+\b/g
    const matches = bodyText.match(regex)
    
    if (matches && matches.length > 0) {
      // 返回第一个匹配项，或者出现频率最高的项
      return matches[0]
    }
    
    // 策略 3: 尝试从URL参数获取
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1])
    const type3 = urlParams.get('type3') // 接口文档中的 pathstr 包含 type3=10B20-1513
    if (type3) return type3

    return null
  }

  const getModelIds = async (): Promise<string[]> => {
    try {
      // 策略 1: 尝试获取当前页面的一个模型ID，然后通过API获取所有变体
      const seedModelId = extractSeedModelId()
      
      if (seedModelId) {
        console.log(`找到种子模型ID: ${seedModelId}，尝试通过API获取完整列表...`)
        try {
          const response = await fetch(`https://casterfind.com/api/ProductBrowse/SearchByModeltype?Lang=Chinese&textkey=${seedModelId}`)
          if (response.ok) {
            const data: ApiModelDetail = await response.json()
            if (data.table?.datas) {
              const allIds: string[] = []
              data.table.datas.forEach(group => {
                group.detail?.forEach(item => {
                  if (item.modeltype) allIds.push(item.modeltype)
                })
              })
              
              if (allIds.length > 0) {
                // 去重
                return [...new Set(allIds)]
              }
            }
          }
        } catch (e) {
          console.warn("通过API获取列表失败，回退到页面解析", e)
        }
      }

      // 策略 2: 回退到页面解析
      // Look for API calls or data in the page
      // 注意：这里不再 fetch(window.location.href)，而是直接解析 DOM
      
      // Try to extract model IDs from the page content (script tags, etc)
      const scripts = document.querySelectorAll("script")
      for (const script of scripts) {
        const text = script.textContent || ""
        const modelIdPattern = /["']modelId["']\s*:\s*["']([^"']+)["']/g
        const matches = [...text.matchAll(modelIdPattern)]
        if (matches.length > 0) {
          return matches.map(match => match[1])
        }
      }
      
      // Fallback: try to find in window object
      const modelIds = (window as any).modelIds || (window as any).models?.map((m: any) => m.id)
      if (modelIds && Array.isArray(modelIds)) {
        return modelIds
      }
      
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
    <>
      {showConfirm && (
        <div style={{
          position: "fixed",
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: "rgba(0, 0, 0, 0.5)",
          zIndex: 10000,
          display: "flex",
          alignItems: "center",
          justifyContent: "center"
        }}>
          <div style={{
            backgroundColor: "white",
            padding: "24px",
            borderRadius: "12px",
            boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
            maxWidth: "320px",
            width: "90%",
            textAlign: "center"
          }}>
            <h3 style={{ margin: "0 0 12px 0", color: "#1f2937", fontSize: "18px" }}>确认下载</h3>
            <p style={{ margin: "0 0 20px 0", color: "#4b5563", fontSize: "14px" }}>
              在当前页面发现了 <strong>{foundModelIds.length}</strong> 个可下载的模型。
              是否立即开始下载？
            </p>
            <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
              <button
                onClick={() => setShowConfirm(false)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                  backgroundColor: "white",
                  color: "#374151",
                  cursor: "pointer",
                  fontSize: "14px"
                }}
              >
                取消
              </button>
              <button
                onClick={startDownload}
                style={{
                  padding: "8px 16px",
                  borderRadius: "6px",
                  border: "none",
                  backgroundColor: "#3b82f6",
                  color: "white",
                  cursor: "pointer",
                  fontSize: "14px",
                  fontWeight: "500"
                }}
              >
                确认下载
              </button>
            </div>
          </div>
        </div>
      )}

      <button
        onClick={checkModels}
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
            {status || "正在扫描..."}
          </span>
        ) : (
          "查询可下载模型"
        )}
      </button>
    </>
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