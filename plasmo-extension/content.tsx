import axios from "axios"
import JSZip from "jszip"
import type { PlasmoCSConfig } from "plasmo"
import React, { useEffect, useState } from "react"
import { createRoot } from "react-dom/client"
import * as XLSX from "xlsx"

export const config: PlasmoCSConfig = {
  matches: ["https://casterfind.com/*"]
}

interface ModelInfo {
  id: string
  title: string
  specs: Record<string, any>
  // Explicit file URLs
  cadUrl?: string
  wheelImgUrl?: string
  threeDUrl?: string
  pdfUrl?: string
  mountImgUrl?: string

  wheelDetails: Record<string, any>
  bracketDetails: Record<string, any>
}

interface ScrapedData {
  models: ModelInfo[]
  totalCount: number
  downloadTime: string
}

interface ApiModelDetail {
  id: number
  modeltype: string
  productName: string
  imgAddress: string
  wheelImgAddress?: string
  img3DAddress: string | null
  img3DAddressZip: string | null
  img3DFile: string | null
  cADImgAddress: string | null
  mountMethodImgAddress: string | null
  features: string[]
  table?: {
    datas?: Array<{
      detail?: Array<{
        modeltype: string
      }>
    }>
    structureList?: Array<{
      imgAddress: string
    }>
  }
  wheelName?: string
  wheelMaterial?: string
  coreMaterial?: string
  bearingCategory?: string
  bearingType?: any
  surfaceHardness?: string
  surfaceShape?: string
  surfaceColour?: string
  width?: number
  protectiveCover?: string
  upperlimitTemperature?: number
  lowerlimitTemperature?: number
  lowOptimumTemperature?: number
  highOptimumTemperature?: number
  wheelIntroduction?: string
  surfaceTreatment?: string
  saltySpray?: number
  steeringStructure?: string
  brakeStructure?: string
  eccentricity?: number
  wingThickness?: number
  mountHeight?: number
  plateMountSize?: string
  plateMountAperture?: string
  plateThickness?: number
  plateSize?: string
  bracketIntroduction?: string
  [key: string]: any
}

interface XLListParams {
  series: string
  wheelMaterial: string
  surfaceColour: string
  abbreviation: string
  [key: string]: any
}

const ScrapingButton: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [status, setStatus] = useState("")
  const [showConfirm, setShowConfirm] = useState(false)
  const [foundModelIds, setFoundModelIds] = useState<string[]>([])
  const [progress, setProgress] = useState(0)
  const [buttonText, setButtonText] = useState("查询可下载模型")

  useEffect(() => {
    const updateButtonText = () => {
      const fourName = sessionStorage.getItem("fourName")
      setButtonText(fourName ? `查询【${fourName}】模型` : "查询可下载模型")
    }

    updateButtonText()

    // Add event listener for storage changes
    window.addEventListener("storage", updateButtonText)

    // Also poll periodically as sessionStorage changes within same tab don't trigger storage event
    const intervalId = setInterval(updateButtonText, 1000)

    return () => {
      window.removeEventListener("storage", updateButtonText)
      clearInterval(intervalId)
    }
  }, [])

  const checkModels = async () => {
    setIsLoading(true)
    setStatus("正在查询模型列表...")

    try {
      const modelIds = await getModelIds()

      if (modelIds.length === 0) {
        throw new Error(
          "未找到模型数据，请确认 sessionStorage 中包含 XLList 数据"
        )
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
    // Don't close confirm dialog yet
    setIsLoading(true)
    setStatus("准备开始下载...")
    setProgress(0)

    try {
      const modelIds = foundModelIds
      const models: ModelInfo[] = []

      // Initialize ZIP
      const zip = new JSZip()

      for (let i = 0; i < modelIds.length; i++) {
        // Calculate progress
        const currentProgress = Math.round((i / modelIds.length) * 100)
        setProgress(currentProgress)

        const modelId = modelIds[i]

        // 1. Get Model Info
        setStatus(`正在处理 [${i + 1}/${modelIds.length}]: 获取详情...`)
        const modelInfo = await getModelInfo(modelId)

        if (modelInfo) {
          models.push(modelInfo)

          // 2. Process and Add to Zip immediately
          setStatus(
            `正在处理 [${i + 1}/${modelIds.length}]: ${modelInfo.title} - 下载文件中...`
          )
          await processModelAndAddToZip(modelInfo, zip)

          // Add 1 second delay
          if (i < modelIds.length - 1) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
        }
      }

      setProgress(100)

      if (models.length === 0) {
        throw new Error("未能获取任何模型数据")
      }

      // 3. Generate Summary Excel (after collecting all models)
      setStatus("正在生成汇总报表...")
      generateSummaryExcel(models, zip)

      // 4. Finalize Zip
      setStatus("正在打包...")
      zip.file(
        "模型信息.json",
        JSON.stringify(
          {
            models,
            totalCount: models.length,
            downloadTime: new Date().toLocaleString("zh-CN")
          },
          null,
          2
        )
      )

      const zipBlob = await zip.generateAsync({ type: "blob" })

      setStatus("下载中...")

      // Generate filename based on sessionStorage and date
      const thirdName = sessionStorage.getItem("thirdName") || "unknown"
      const fourName = sessionStorage.getItem("fourName") || "unknown"

      const now = new Date()
      const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`
      // Use dashes for time to avoid filesystem issues with colons
      const timeStr = `${String(now.getHours()).padStart(2, "0")}-${String(now.getMinutes()).padStart(2, "0")}-${String(now.getSeconds()).padStart(2, "0")}`
      const dateTimeStr = `${dateStr} ${timeStr}`

      const filename = `${thirdName}-${fourName}-${dateTimeStr}.zip`

      downloadFile(zipBlob, filename)

      setStatus("完成！")
      // Close confirm dialog after success
      setShowConfirm(false)
      setTimeout(() => setStatus(""), 3000)
    } catch (error) {
      console.error("处理失败:", error)
      setStatus(`错误: ${error instanceof Error ? error.message : "未知错误"}`)
      // Keep error visible for a bit
      setTimeout(() => setShowConfirm(false), 5000)
    } finally {
      setIsLoading(false)
    }
  }

  const processModelAndAddToZip = async (model: ModelInfo, zip: JSZip) => {
    const downloadBlob = async (url: string) => {
      const response = await axios.get(url, { responseType: "blob" })
      return response.data as Blob
    }
    const safeName = (name: string) => name.replace(/[\\/:*?"<>|]/g, "_")

    const folderName = safeName(`${model.title}_${model.id}`)
    const modelFolder = zip.folder(folderName)

    if (!modelFolder) return

    // 1. Individual Excel
    const excelRows = [
      ["【轮片详情】", ""],
      ["ID", model.id],
      ["产品名称", model.title],
      ...Object.entries(model.wheelDetails),
      ["", ""],
      ["【支架特征】", ""],
      ...Object.entries(model.bracketDetails),
      ["", ""],
      ["【资源链接】", ""],
      ["CAD链接", model.cadUrl || ""],
      ["3D模型链接", model.threeDUrl || ""],
      ["轮片图片链接", model.wheelImgUrl || ""],
      ["支架特征图链接", model.mountImgUrl || ""],
      ["PDF图纸链接", model.pdfUrl || ""]
    ]
    const worksheet = XLSX.utils.aoa_to_sheet(excelRows)
    worksheet["!cols"] = [{ wch: 20 }, { wch: 60 }]
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "模型详情")
    const excelBuffer = XLSX.write(workbook, {
      bookType: "xlsx",
      type: "array"
    })
    modelFolder.file(`${safeName(model.title)}_详情.xlsx`, excelBuffer)

    // 2. Download Files
    const downloadTasks: {
      url: string
      process: (blob: Blob) => void
      name: string
    }[] = []

    if (model.cadUrl) {
      downloadTasks.push({
        url: model.cadUrl,
        name: "CAD",
        process: (blob) => {
          let ext = "pdf"
          if (blob.type.includes("image")) ext = "jpg"
          const urlExt = model.cadUrl!.split(".").pop()?.split("?")[0]
          if (urlExt && urlExt.length < 5) ext = urlExt
          modelFolder.file(`${safeName(model.title)}_图纸.${ext}`, blob)
        }
      })
    }

    if (model.threeDUrl) {
      downloadTasks.push({
        url: model.threeDUrl,
        name: "3D",
        process: (blob) => {
          let ext = "zip"
          const urlExt = model.threeDUrl!.split(".").pop()?.split("?")[0]
          if (urlExt && urlExt.length < 5) ext = urlExt
          modelFolder.file(`${safeName(model.title)}_3D模型.${ext}`, blob)
        }
      })
    }

    if (model.wheelImgUrl) {
      downloadTasks.push({
        url: model.wheelImgUrl,
        name: "Wheel Img",
        process: (blob) => {
          let ext = "jpg"
          if (blob.type.includes("png")) ext = "png"
          modelFolder.file(`${safeName(model.title)}_轮片图片.${ext}`, blob)
        }
      })
    }

    if (model.mountImgUrl) {
      downloadTasks.push({
        url: model.mountImgUrl,
        name: "Mount Img",
        process: (blob) => {
          let ext = "jpg"
          if (blob.type.includes("png")) ext = "png"
          modelFolder.file(`${safeName(model.title)}_支架特征图.${ext}`, blob)
        }
      })
    }

    if (model.pdfUrl) {
      downloadTasks.push({
        url: model.pdfUrl,
        name: "PDF",
        process: (blob) => {
          modelFolder.file(`${safeName(model.title)}_产品图纸.pdf`, blob)
        }
      })
    }

    // Execute downloads sequentially with 1s delay
    for (const task of downloadTasks) {
      try {
        const blob = await downloadBlob(task.url)
        task.process(blob)
      } catch (e) {
        console.error(`Failed ${task.name}: ${model.id}`, e)
      }
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }
  }

  const generateSummaryExcel = (models: ModelInfo[], zip: JSZip) => {
    const baseRows = [
      "【轮片详情】",
      "ID",
      "产品名称",
      "轮片名称",
      "轮片材质",
      "轮芯材质",
      "轴承类别",
      "轴承型号",
      "轮面硬度",
      "轮面形状",
      "轮面颜色",
      "轮宽",
      "防护罩",
      "适宜温度",
      "极限温度",
      "轮片简介",
      "",
      "【支架特征】",
      "表面处理",
      "盐雾试验",
      "转向结构",
      "刹车结构",
      "偏心距",
      "翅膀厚度",
      "支架安装高度",
      "底板安装尺寸",
      "底板安装孔径",
      "底板厚度",
      "底板尺寸",
      "支架简介",
      "",
      "【资源链接】",
      "CAD链接",
      "3D模型链接",
      "轮片图片链接",
      "支架特征图链接",
      "PDF图纸链接"
    ]

    const matrix: (string | number)[][] = []
    for (let i = 0; i < baseRows.length; i++) {
      matrix[i] = [baseRows[i]]
    }

    models.forEach((model) => {
      const modelData: any = {
        ID: model.id,
        产品名称: model.title,
        ...model.wheelDetails,
        ...model.bracketDetails,
        CAD链接: model.cadUrl,
        "3D模型链接": model.threeDUrl,
        轮片图片链接: model.wheelImgUrl,
        支架特征图链接: model.mountImgUrl,
        PDF图纸链接: model.pdfUrl
      }

      for (let i = 0; i < baseRows.length; i++) {
        const key = baseRows[i]
        if (key === "" || key.startsWith("【")) {
          matrix[i].push("")
        } else {
          matrix[i].push(modelData[key] || "")
        }
      }
    })

    const worksheet = XLSX.utils.aoa_to_sheet(matrix)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, "所有模型汇总")
    const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
    zip.file("所有模型汇总.xlsx", buffer)
  }

  const getModelIds = async (): Promise<string[]> => {
    try {
      const xlListStr = sessionStorage.getItem("XLList")
      if (!xlListStr) {
        console.warn("未在 sessionStorage 中找到 XLList 数据")
        return []
      }

      const xlList = JSON.parse(xlListStr) as XLListParams

      const payload = {
        series: xlList.series,
        wheelMaterial: xlList.wheelMaterial,
        surfaceColour: xlList.surfaceColour,
        Abbreviation: xlList.abbreviation,
        Lang: "Chinese"
      }

      console.log("正在调用 SearchByKeys, 参数:", payload)

      const response = await axios.post(
        "https://casterfind.com/api/ProductBrowse/SearchByKeys",
        payload
      )

      if (response.data && response.data.datas) {
        const allIds: string[] = []
        response.data.datas.forEach((group: any) => {
          group.detail?.forEach((item: any) => {
            if (item.modeltype) allIds.push(item.modeltype)
          })
        })
        return [...new Set(allIds)]
      }

      return []
    } catch (error) {
      console.error("获取模型ID列表失败:", error)
      return []
    }
  }

  const getModelInfo = async (modelId: string): Promise<ModelInfo | null> => {
    try {
      const endpoint = `https://casterfind.com/api/ProductBrowse/SearchByModeltype?Lang=Chinese&textkey=${modelId}`
      const response = await axios.get(endpoint)

      if (response.status !== 200 || !response.data) {
        return null
      }

      const data: ApiModelDetail = response.data

      let pdfUrl = ""
      try {
        const pdfEndpoint = `https://casterfind.com/api/ProductBrowse/GetPdfFile?textkey=${modelId}`
        const pdfResponse = await axios.get(pdfEndpoint)
        if (
          pdfResponse.status === 200 &&
          typeof pdfResponse.data === "string"
        ) {
          pdfUrl = pdfResponse.data
        }
      } catch (e) {
        console.warn(`获取PDF失败 ${modelId}:`, e)
      }

      return parseModelData(data, modelId, pdfUrl)
    } catch (error) {
      console.error(`获取模型 ${modelId} 信息失败:`, error)
      return null
    }
  }

  const parseModelData = (
    data: ApiModelDetail,
    modelId: string,
    pdfUrl: string
  ): ModelInfo => {
    const wheelDetails = {
      轮片名称: data.wheelName || "",
      轮片材质: data.wheelMaterial || "",
      轮芯材质: data.coreMaterial || "",
      轴承类别: data.bearingCategory || "",
      轴承型号: data.bearingType || "",
      轮面硬度: data.surfaceHardness || "",
      轮面形状: data.surfaceShape || "",
      轮面颜色: data.surfaceColour || "",
      轮宽: data.width ? `${data.width}mm` : "",
      防护罩: data.protectiveCover || "",
      适宜温度: `${data.lowOptimumTemperature || ""}℃~${data.highOptimumTemperature || ""}℃`,
      极限温度: `${data.lowerlimitTemperature || ""}℃~${data.upperlimitTemperature || ""}℃`,
      轮片简介: data.wheelIntroduction || ""
    }

    const bracketDetails = {
      表面处理: data.surfaceTreatment || "",
      盐雾试验: data.saltySpray ? `${data.saltySpray} 小时` : "",
      转向结构: data.steeringStructure || "",
      刹车结构: data.brakeStructure || "",
      偏心距: data.eccentricity ? `${data.eccentricity}mm` : "",
      翅膀厚度: data.wingThickness ? `${data.wingThickness}mm` : "",
      支架安装高度: data.mountHeight ? `${data.mountHeight}mm` : "",
      底板安装尺寸: data.plateMountSize || "",
      底板安装孔径: data.plateMountAperture || "",
      底板厚度: data.plateThickness ? `${data.plateThickness}mm` : "",
      底板尺寸: data.plateSize || "",
      支架简介: data.bracketIntroduction || ""
    }

    const specs: Record<string, any> = { ...data }
    delete specs.table
    delete specs.features
    delete specs.featuresNew

    return {
      id: modelId,
      title: data.productName || `模型 ${modelId}`,
      specs: specs,

      cadUrl: data.cADImgAddress || undefined,
      wheelImgUrl: data.wheelImgAddress || undefined,
      threeDUrl: data.img3DAddress || undefined,
      pdfUrl: pdfUrl || undefined,
      mountImgUrl: data.mountMethodImgAddress || undefined,

      wheelDetails,
      bracketDetails
    }
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
        <div
          style={{
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
          <div
            style={{
              backgroundColor: "white",
              padding: "24px",
              borderRadius: "12px",
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              maxWidth: "320px",
              width: "90%",
              textAlign: "center"
            }}>
            {isLoading ? (
              // Downloading State
              <div>
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1f2937",
                    fontSize: "18px"
                  }}>
                  正在下载... {progress}%
                </h3>
                <div
                  style={{
                    width: "100%",
                    backgroundColor: "#e5e7eb",
                    borderRadius: "9999px",
                    height: "12px",
                    marginBottom: "16px",
                    overflow: "hidden"
                  }}>
                  <div
                    style={{
                      width: `${progress}%`,
                      backgroundColor: "#3b82f6",
                      height: "100%",
                      borderRadius: "9999px",
                      transition: "width 0.3s ease-in-out"
                    }}></div>
                </div>
                <p
                  style={{
                    margin: "0 0 20px 0",
                    color: "#4b5563",
                    fontSize: "14px",
                    wordBreak: "break-all"
                  }}>
                  {status}
                </p>
              </div>
            ) : (
              // Confirmation State
              <>
                <h3
                  style={{
                    margin: "0 0 12px 0",
                    color: "#1f2937",
                    fontSize: "18px"
                  }}>
                  确认下载
                </h3>
                <p
                  style={{
                    margin: "0 0 20px 0",
                    color: "#4b5563",
                    fontSize: "14px"
                  }}>
                  在当前页面发现了 <strong>{foundModelIds.length}</strong>{" "}
                  个可下载的模型。 是否立即开始下载？
                </p>
                <div
                  style={{
                    display: "flex",
                    gap: "12px",
                    justifyContent: "center"
                  }}>
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
                    }}>
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
                    }}>
                    确认下载
                  </button>
                </div>
              </>
            )}
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
        }}>
        {isLoading ? (
          <span style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ animation: "spin 1s linear infinite" }}>⏳</span>
            {status || "正在扫描..."}
          </span>
        ) : (
          buttonText
        )}
      </button>
    </>
  )
}

// Inject the button into the page
const injectButton = () => {
  const containerId = "plasmo-scraping-button"
  const existingContainer = document.getElementById(containerId)
  const hasXLList = !!sessionStorage.getItem("XLList")

  if (hasXLList) {
    if (!existingContainer) {
      const container = document.createElement("div")
      container.id = containerId
      document.body.appendChild(container)

      const root = createRoot(container)
      root.render(<ScrapingButton />)
    }
  } else {
    if (existingContainer) {
      existingContainer.remove()
    }
  }
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
  } else {
    // Check on DOM updates too, in case sessionStorage changed without URL change
    injectButton()
  }
}).observe(document, { subtree: true, childList: true })

export {}
