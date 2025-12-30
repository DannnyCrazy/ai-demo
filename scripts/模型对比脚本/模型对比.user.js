// ==UserScript==
// @name         模型对比添加器
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  在bocangku.cn网站添加模型对比功能
// @author       AI Assistant
// @match        https://www.bocangku.cn/part/detail/*
// @match        https://train.bocangku.com/part/detail/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  // 等待页面加载完成
  function waitForElement(selector, callback, timeout = 10000) {
    const startTime = Date.now();
    const checkElement = () => {
      const element = document.querySelector(selector);
      if (element) {
        callback(element);
      } else if (Date.now() - startTime < timeout) {
        setTimeout(checkElement, 500);
      } else {
        console.log(`元素 ${selector} 未找到，超时`);
      }
    };
    checkElement();
  }

  // 从localStorage获取模型列表
  function getStorageModelList() {
    try {
      const stored = localStorage.getItem("model-compare-model-list");
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error("获取模型列表失败:", error);
      return [];
    }
  }

  // 保存模型列表到localStorage
  function setStorageModelList(list) {
    try {
      localStorage.setItem("model-compare-model-list", JSON.stringify(list));
    } catch (error) {
      console.error("保存模型列表失败:", error);
    }
  }

  // 调用API获取产品详情
  async function fetchProductDetail(setId) {
    // 根据当前域名动态构建API地址
    const currentDomain = window.location.hostname;
    const apiUrl = `https://${currentDomain}/to/api/public/part/es/search/detail/simple?setId=${setId}`;

    try {
      const response = await fetch(apiUrl, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`API请求失败: ${response.status}`);
      }

      const data = await response.json();

      if (data.code === 0 && data.data) {
        return {
          prodName: data.data.prodName || "",
          prodImageId: data.data.image || "",
        };
      } else {
        throw new Error(data.msg || "API返回错误");
      }
    } catch (error) {
      console.error("获取产品详情失败:", error);
      throw error;
    }
  }

  // 创建模型信息对象（在线模型）
  async function createOnlineModelInfo() {
    // 从页面提取模型信息
    const modelId = extractModelId();
    const configName = extractConfigName();

    if (!modelId || !configName) {
      throw new Error("无法提取模型信息");
    }

    try {
      // 调用API获取产品详情
      const productDetail = await fetchProductDetail(modelId);

      return {
        id: modelId,
        configName: configName,
        prodName: productDetail.prodName || "",
        prodImageId: productDetail.prodImageId || "",
        documentId: "",
        type: "online",
        pin: false,
        isBase: false,
        comparePosition: 0,
      };
    } catch (error) {
      console.error("获取产品详情失败，使用页面数据:", error);
      // 如果API调用失败，使用页面数据
      return {
        id: modelId,
        configName: configName,
        prodName: "",
        prodImageId: "",
        documentId: "",
        type: "online",
        pin: false,
        isBase: false,
        comparePosition: 0,
      };
    }
  }

  // 从URL提取模型ID
  function extractModelId() {
    // 从URL路径中提取ID
    const urlMatch = window.location.pathname.match(/\/part\/detail\/([^/]+)$/);
    if (urlMatch) {
      return urlMatch[1];
    }
    return null;
  }

  // 提取配置名称
  function extractConfigName() {
    // 查找.i-common-copy前一个元素的文字
    const copyButton = document.querySelector(".i-common-copy");
    if (copyButton) {
      const previousElement = copyButton.previousElementSibling;
      if (previousElement) {
        return previousElement.textContent.trim().replace(/^配置型号： /, "");
      }
    }

    // 备选方案：查找其他可能的元素
    const configElements = document.querySelectorAll(
      ".config-name, .model-config, [data-config-name]"
    );
    for (let element of configElements) {
      if (element.textContent.trim()) {
        return element.textContent.trim();
      }
    }

    return document.title || "未知模型";
  }

  // 提取产品名称（现在通过API获取，此函数保留为备用）
  function extractProdName() {
    return ""; // 通过API获取，不再从页面提取
  }

  // 提取产品图片ID（现在通过API获取，此函数保留为备用）
  function extractProdImageId() {
    return ""; // 通过API获取，不再从页面提取
  }

  // 获取添加模型信息（复现useModelCompare.ts的逻辑）
  function getAddModelInfo(info) {
    const storageModelList = getStorageModelList();

    if ("fileId" in info) {
      return {
        ...info,
        documentId: "",
        type: "local",
        pin: false,
        isBase: storageModelList.length === 0,
        comparePosition:
          storageModelList.length >= 2 ? 0 : storageModelList.length + 1,
      };
    } else {
      return {
        ...info,
        documentId: "",
        type: "online",
        pin: false,
        isBase: storageModelList.length === 0,
        comparePosition:
          storageModelList.length >= 2 ? 0 : storageModelList.length + 1,
      };
    }
  }

  // 添加模型到对比列表（复现useModelCompare.ts的逻辑）
  function addModelToCompare(model) {
    console.log("添加模型ID:", model.id);

    const storageModelList = getStorageModelList();

    // 检查是否已存在
    const exists = storageModelList.find((item) => {
      if (model.type === "local") {
        return item.fileId === model.fileId;
      } else {
        return item.configName === model.configName;
      }
    });

    // 检查数量限制
    if (storageModelList.length >= 4) {
      throw new Error("最多只能对比4个模型");
    }

    if (!exists) {
      storageModelList.push(model);
    } else {
      // 更新已存在的模型
      const index = storageModelList.findIndex((item) => {
        return item.configName === model.configName;
      });
      if (index !== -1) {
        storageModelList.splice(index, 1, model);
      }
    }

    setStorageModelList(storageModelList);
    console.log("当前模型列表:", storageModelList);

    return storageModelList;
  }

  // 显示提示信息
  function showMessage(message, type = "success") {
    // 创建提示元素
    const messageDiv = document.createElement("div");
    messageDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 12px 20px;
            background: ${type === "success" ? "#4CAF50" : "#f44336"};
            color: white;
            border-radius: 4px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
            z-index: 10000;
            font-size: 14px;
            max-width: 300px;
            word-wrap: break-word;
        `;
    messageDiv.textContent = message;

    document.body.appendChild(messageDiv);

    // 3秒后移除
    setTimeout(() => {
      if (messageDiv.parentNode) {
        messageDiv.parentNode.removeChild(messageDiv);
      }
    }, 3000);
  }

  // 创建添加对比按钮
  function createAddCompareButton() {
    const button = document.createElement("button");
    button.textContent = "添加对比";
    button.className = "add-compare-btn";
    button.style.cssText = `
            margin-left: 10px;
            padding: 6px 12px;
            background: #1890ff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
        `;

    // 鼠标悬停效果
    button.addEventListener("mouseenter", () => {
      button.style.background = "#40a9ff";
    });

    button.addEventListener("mouseleave", () => {
      button.style.background = "#1890ff";
    });

    // 点击事件
    button.addEventListener("click", async () => {
      try {
        // 创建模型信息
        const modelInfo = await createOnlineModelInfo();

        // 获取添加模型信息（应用现有逻辑）
        const addModelInfo = getAddModelInfo(modelInfo);

        // 添加到对比列表
        addModelToCompare(addModelInfo);

        showMessage("模型已添加到对比列表");
      } catch (error) {
        console.error("添加模型失败:", error);
        showMessage(error.message || "添加模型失败", "error");
      }
    });

    return button;
  }

  // 初始化函数
  function init() {
    console.log("模型对比脚本初始化");

    // 等待.renderer-btn元素出现
    waitForElement(".renderer-btn", (rendererBtn) => {
      console.log("找到.renderer-btn元素");

      // 检查是否已存在添加对比按钮
      const existingBtn = rendererBtn.querySelector(".add-compare-btn");
      if (existingBtn) {
        console.log("添加对比按钮已存在");
        return;
      }

      // 创建并添加按钮
      const addButton = createAddCompareButton();
      rendererBtn.parentNode.insertBefore(addButton, rendererBtn.nextSibling);
      console.log("添加对比按钮已添加");
    });
  }

  // 页面加载完成后初始化
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }

  // 监听页面变化（SPA应用）
  let lastUrl = location.href;
  new MutationObserver(() => {
    const url = location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      console.log("页面URL变化，重新初始化");
      setTimeout(init, 1000); // 延迟1秒重新初始化
    }
  }).observe(document, { subtree: true, childList: true });
})();
