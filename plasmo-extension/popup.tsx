import React, { useState } from "react"

function IndexPopup() {
  const [isEnabled, setIsEnabled] = useState(true)

  return (
    <div
      style={{
        padding: "16px",
        minWidth: "280px",
        fontFamily:
          "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
      }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          marginBottom: "16px"
        }}>
        <div
          style={{
            width: "32px",
            height: "32px",
            backgroundColor: "#3b82f6",
            borderRadius: "8px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "white",
            fontWeight: "bold"
          }}>
          📦
        </div>
        <div>
          <h2
            style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "#1f2937"
            }}>
            CasterFind 数据抓取器
          </h2>
          <p
            style={{
              margin: "2px 0 0 0",
              fontSize: "12px",
              color: "#6b7280"
            }}>
            从casterfind.com抓取产品数据
          </p>
        </div>
      </div>

      <div
        style={{
          backgroundColor: "#f3f4f6",
          borderRadius: "8px",
          padding: "12px",
          marginBottom: "16px"
        }}>
        <h3
          style={{
            margin: "0 0 8px 0",
            fontSize: "14px",
            fontWeight: "500",
            color: "#374151"
          }}>
          使用说明
        </h3>
        <ul
          style={{
            margin: 0,
            paddingLeft: "16px",
            fontSize: "12px",
            color: "#6b7280",
            lineHeight: "1.5"
          }}>
          <li>访问 casterfind.com 的产品页面</li>
          <li>点击右下角的"爬取该页面数据"按钮</li>
          <li>等待数据抓取和压缩完成</li>
          <li>ZIP文件将自动下载到您的设备</li>
        </ul>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "12px"
        }}>
        <label
          style={{
            fontSize: "14px",
            color: "#374151",
            fontWeight: "500"
          }}>
          启用扩展
        </label>
        <button
          onClick={() => setIsEnabled(!isEnabled)}
          style={{
            position: "relative",
            width: "44px",
            height: "24px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: isEnabled ? "#3b82f6" : "#d1d5db",
            cursor: "pointer",
            transition: "background-color 0.2s ease"
          }}>
          <div
            style={{
              position: "absolute",
              top: "2px",
              left: isEnabled ? "22px" : "2px",
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              backgroundColor: "white",
              transition: "left 0.2s ease",
              boxShadow: "0 2px 4px rgba(0,0,0,0.2)"
            }}
          />
        </button>
      </div>

      <div
        style={{
          textAlign: "center",
          fontSize: "11px",
          color: "#9ca3af",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "12px"
        }}>
        版本 0.0.1 | 专为 casterfind.com 设计
      </div>
    </div>
  )
}

export default IndexPopup
