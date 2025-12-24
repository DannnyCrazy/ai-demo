# CasterFind 数据抓取器 - 浏览器扩展

这是一个基于 Plasmo 框架开发的浏览器扩展，专门用于从 casterfind.com 网站抓取产品数据并下载为 ZIP 文件。

## 功能特性

- 🎯 **智能注入**: 自动在 casterfind.com 页面注入抓取按钮
- 📊 **数据抓取**: 获取产品信息、图片和3D模型文件
- 📦 **自动打包**: 将所有数据压缩成ZIP文件
- 💾 **一键下载**: 自动触发浏览器下载
- 🎨 **美观界面**: 现代化的UI设计
- ⚡ **高效处理**: 异步处理，不阻塞浏览器

## 安装使用

### 1. 开发模式

```bash
cd plasmo-extension
bun run dev
```

### 2. 构建扩展

```bash
bun run build
```

### 3. 安装到浏览器

#### Chrome/Edge:

1. 打开 `chrome://extensions/`
2. 开启"开发者模式"
3. 点击"加载已解压的扩展"
4. 选择 `plasmo-extension/build/chrome-mv3-prod` 目录

#### Firefox:

1. 打开 `about:debugging`
2. 点击"此Firefox"
3. 点击"加载临时附加组件"
4. 选择 `plasmo-extension/build/chrome-mv3-prod/manifest.json`

## 使用方法

1. **访问网站**: 打开 `https://casterfind.com/productPc/#/loadXl`
2. **查找按钮**: 在页面右下角找到"爬取该页面数据"按钮
3. **开始抓取**: 点击按钮开始数据抓取过程
4. **等待完成**: 扩展会自动抓取数据、下载文件并创建ZIP
5. **获取文件**: ZIP文件将自动下载到您的设备

## 技术架构

### 核心组件

- **内容脚本 (`content.tsx`)**: 注入UI按钮，执行数据抓取
- **弹出窗口 (`popup.tsx`)**: 扩展设置和状态显示
- **数据处理**: 使用 JSZip 库创建压缩文件

### 数据流程

1. **模型ID获取**: 从页面或API获取产品ID列表
2. **详细信息抓取**: 逐个获取产品的详细信息
3. **文件下载**: 下载图片和3D模型文件
4. **数据打包**: 将所有数据压缩成ZIP文件
5. **文件下载**: 触发浏览器下载ZIP文件

### 错误处理

- **网络错误**: 自动重试机制，失败时记录日志
- **数据解析错误**: 容错处理，跳过错误项目
- **文件下载错误**: 继续处理其他文件，不中断整体流程

## 文件结构

```
plasmo-extension/
├── content.tsx              # 内容脚本 - 主要逻辑
├── popup.tsx               # 弹出窗口界面
├── manifest.ts             # 扩展配置
├── content.tsx.config.ts   # 内容脚本配置
├── package.json            # 项目依赖
└── build/                  # 构建输出
    └── chrome-mv3-prod/    # Chrome扩展包
```

## 开发说明

### 环境要求

- Node.js 18+
- Bun 包管理器
- Chrome/Edge/Firefox 浏览器

### 依赖包

- `plasmo`: 浏览器扩展开发框架
- `react`: UI框架
- `jszip`: ZIP文件创建
- `file-saver`: 文件下载辅助

### 配置说明

扩展在 `manifest.ts` 中配置，主要设置：

- 权限: `activeTab`, `storage`, `host_permissions`
- 匹配模式: `https://casterfind.com/*`
- 内容脚本注入时机: `document_end`

## 注意事项

1. **网络权限**: 扩展需要访问外部资源，确保网络连接正常
2. **CORS限制**: 某些API调用可能受CORS限制
3. **大文件处理**: 大量数据下载可能需要较长时间
4. **浏览器兼容性**: 主要支持Chrome/Edge，Firefox可能需要调整

## 故障排除

### 常见问题

**Q: 按钮没有出现？**
A: 检查是否访问了正确的URL，刷新页面重试

**Q: 下载失败？**
A: 检查网络连接，查看浏览器控制台错误信息

**Q: ZIP文件为空？**
A: 可能是页面结构变化，需要更新选择器逻辑

**Q: 扩展无法安装？**
A: 确保使用构建后的文件，检查manifest.json格式

### 调试方法

1. 打开浏览器开发者工具
2. 查看控制台错误信息
3. 检查网络请求状态
4. 验证DOM元素选择器

## 更新日志

### v0.0.1 (2024-12-24)

- ✨ 初始版本发布
- 🎯 基本数据抓取功能
- 📦 ZIP文件打包
- 🎨 现代化UI设计

## 许可证

MIT License - 详见 LICENSE 文件
