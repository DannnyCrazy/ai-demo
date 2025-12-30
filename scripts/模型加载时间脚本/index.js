(function () {
  let startTime = null;
  let loadFinishTime = null;
  let variableTransformEndTime = null;

  // 保存原始的console.log
  const originalLog = console.log;

  // 拦截console.log（不影响原有功能）
  console.log = function (...args) {
    // 先调用原始的console.log，保持原有输出
    originalLog.apply(console, args);

    // 将所有参数转换为字符串进行检测
    const message = args.map((arg) => String(arg)).join(" ");

    // 检测关键字并计时
    if (!startTime && message.startsWith("iframeRef changed:")) {
      startTime = performance.now();
      originalLog(`⏱️ [计时器] 开始计时`);
    } else if (
      startTime &&
      !loadFinishTime &&
      message.startsWith("%cloadFinish")
    ) {
      loadFinishTime = performance.now();
      const elapsed = loadFinishTime - startTime;
      originalLog(`⏱️ [计时器] 第一次时间: ${elapsed.toFixed(2)}ms`);
    } else if (
      startTime &&
      loadFinishTime &&
      !variableTransformEndTime &&
      message.includes("初始化：transform传空")
    ) {
      // 检测到初始化情况，跳过第二次时间计算
      const totalElapsed = loadFinishTime - startTime;

      originalLog("\n========== ⏱️ 计时结果 ==========");
      originalLog(
        "⏱️ [计时器] 检测到初始化情况（transform传空），跳过变形时间计算"
      );
      originalLog(
        `总时间 (开始 → 加载完成): ${(totalElapsed / 1000).toFixed(3)}s`
      );
      originalLog("================================\n");

      // 重置计时器
      startTime = null;
      loadFinishTime = null;
      variableTransformEndTime = null;
    } else if (
      startTime &&
      loadFinishTime &&
      !variableTransformEndTime &&
      message.startsWith("%cvariableTransformEnd")
    ) {
      variableTransformEndTime = performance.now();
      const secondElapsed = variableTransformEndTime - loadFinishTime;
      const totalElapsed = variableTransformEndTime - startTime;

      originalLog("\n========== ⏱️ 计时结果 ==========");
      originalLog(
        `第一次时间 (开始 → 加载完成): ${(
          (loadFinishTime - startTime) /
          1000
        ).toFixed(3)}s`
      );
      originalLog(
        `第二次时间 (加载完成 → 变形完成): ${(secondElapsed / 1000).toFixed(
          3
        )}s`
      );
      originalLog(
        `总时间 (开始 → 变形完成): ${(totalElapsed / 1000).toFixed(3)}s`
      );
      originalLog("================================\n");

      // 重置计时器
      startTime = null;
      loadFinishTime = null;
      variableTransformEndTime = null;
    }
  };

  originalLog("✅ 时间计数器已启动，监听控制台输出中...");
})();
