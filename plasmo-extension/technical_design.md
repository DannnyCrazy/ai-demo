# 技术设计文档

## 架构
该项目将使用 **Plasmo 框架**构建，为浏览器扩展开发提供强大的环境，支持 React 和 TypeScript。

### 组件
1.  **内容脚本 (`content.tsx`)**:
    - **职责**: 将UI（抓取按钮）注入到目标页面的DOM中
    - **目标**: 匹配 `https://casterfind.com/*`
    - **逻辑**:
        - 观察DOM变化或等待特定容器来注入按钮
        - 处理按钮点击事件
        - 执行抓取逻辑

2.  **抓取逻辑**:
    - **API接口获取**: 
        - 从列表页或列表接口获取模型ID列表
        - 遍历ID列表，逐个调用获取单个模型信息的API接口
        - 从接口响应中提取产品标题/名称、规格参数等文本信息
        - 从接口响应中获取产品图片链接
        - 从接口响应中获取3D模型文件链接（.stp、.step、.igs等格式）
    - **文件下载**: 使用 `fetch()` 下载图片和模型文件的二进制数据（blobs）

3.  **数据处理与压缩（ZIP）**:
    - **数据合并**: 将遍历获取的所有单个模型信息合并到一个数据结构中
    - **库**: `jszip`
    - **过程**:
        - 创建新的JSZip实例
        - 添加合并后的文本信息作为 `info.txt` 或 `info.json`
        - 将所有产品的图片添加到zip内的 `images/` 文件夹
        - 将所有模型文件添加到zip内的 `models/` 文件夹
        - 生成ZIP blob

4.  **下载**:
    - 使用 `URL.createObjectURL(zipBlob)` 和临时 `<a>` 标签触发下载

## 数据结构（API接口数据）
### 列表接口响应示例
```json
{
  "modelIds": ["model123", "model456", "model789"]
}
```

### 单个模型信息接口响应示例
```json
{
  "id": "model123",
  "title": "产品名称",
  "specs": {
    "材质": "钢材",
    "负载": "500kg",
    "尺寸": "100x50x30mm"
  },
  "images": ["https://example.com/image1.jpg", "https://example.com/image2.jpg"],
  "models": ["https://example.com/model.stp", "https://example.com/model.step"]
}
```

### 合并后的数据结构
```json
{
  "models": [
    {
      "id": "model123",
      "title": "产品名称1",
      "specs": {...},
      "images": [...],
      "models": [...]
    },
    {
      "id": "model456", 
      "title": "产品名称2",
      "specs": {...},
      "images": [...],
      "models": [...]
    }
  ],
  "totalCount": 2,
  "downloadTime": "2024-01-01 12:00:00"
}
```

## 依赖项
- `plasmo`: 框架
- `react`, `react-dom`: UI渲染
- `jszip`: 用于创建ZIP文件
- `file-saver`: （可选）保存文件的辅助工具，不过原生的锚标签方法通常已足够

## 错误处理
- **API接口错误**: 处理列表接口或单个模型接口请求失败的情况
- **数据解析错误**: 处理接口返回数据格式不符合预期的情况
- **文件下载错误**: 如果特定资源下载失败，将错误记录到控制台，但继续处理其他可用资源
- **网络超时**: 为每个API请求设置合理的超时时间
- **并发控制**: 限制同时进行的API请求数量，避免对服务器造成过大压力