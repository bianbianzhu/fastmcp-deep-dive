import express from "express";
import fs from "fs";
import path from "path";

const app = express();
const PORT = 3336;

// 流式读取和返回大文件的路由
app.get("/big-data", (req, res) => {
  const filePath = path.join(__dirname, "big-data.txt");

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    console.log("❌ 文件不存在");
    res.status(404).json({ error: "File not found" });
    return;
  }

  // 获取文件信息
  const stat = fs.statSync(filePath);
  const fileSize = stat.size;

  // 设置响应头
  res.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
    "Content-Length": fileSize,
    "Transfer-Encoding": "chunked", // 使用 chunked 传输编码
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  });

  // 创建可读流
  const readStream = fs.createReadStream(filePath, {
    encoding: "utf8",
    highWaterMark: 64 * 1024, // 64KB 块大小
  });

  // 处理流事件
  readStream.on("data", (chunk) => {
    console.log(`🔥 发送数据块: ${chunk.length} 字节`);
    // 直接将数据块写入响应流
    res.write(chunk);
  });

  readStream.on("end", () => {
    console.log("✅ 文件读取完成");
    res.end();
  });

  readStream.on("error", (err) => {
    console.error("❌文件读取错误:", err);
    if (!res.headersSent) {
      console.log("❌ 文件读取错误，但响应头未发送");
      res.status(500).json({ error: "Internal server error" });
    } else {
      console.log("❌ 文件读取错误，但响应头已发送");
      res.end();
    }
  });

  // 处理客户端断开连接
  req.on("close", () => {
    console.log("⏹️ 客户端断开连接，停止读取文件");
    readStream.destroy();
  });
});

// 更简洁的版本 - 使用 pipe
app.get("/big-data-simple", (_req, res) => {
  const filePath = path.join(__dirname, "big-data.txt");

  // 检查文件是否存在
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  // 设置响应头
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Cache-Control", "no-cache");

  // 创建读取流并直接 pipe 到响应
  const readStream = fs.createReadStream(filePath, { encoding: "utf8" });

  // 处理错误
  readStream.on("error", (err) => {
    console.error("文件读取错误:", err);
    if (!res.headersSent) {
      res.status(500).json({ error: "❌ Internal server error" });
    }
  });

  // 直接 pipe 到响应流
  readStream.pipe(res);
});

// 带进度监控的版本
app.get("/big-data-progress", (_req, res) => {
  const filePath = path.join(__dirname, "big-data.txt");

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "❌ File not found" });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  let bytesRead = 0;

  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.setHeader("Content-Length", fileSize);

  const readStream = fs.createReadStream(filePath, {
    encoding: "utf8",
    highWaterMark: 16 * 1024, // 16KB 块
  });

  readStream.on("data", (chunk) => {
    bytesRead += Buffer.byteLength(chunk, "utf8");
    const progress = ((bytesRead / fileSize) * 100).toFixed(2);

    console.log(`🚚 传输进度: ${progress}% (${bytesRead}/${fileSize} 字节)`);

    res.write(chunk);
  });

  readStream.on("end", () => {
    console.log("✅ 传输完成");
    res.end();
  });

  readStream.on("error", (err) => {
    console.error("读取错误:", err);
    if (!res.headersSent) {
      res.status(500).end();
    }
  });
});

// 支持 Range 请求的版本（断点续传）
app.get("/big-data-range", (req, res) => {
  const filePath = path.join(__dirname, "big-data.txt");

  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "File not found" });
    return;
  }

  const stat = fs.statSync(filePath);
  const fileSize = stat.size;
  const range = req.headers.range;

  if (range) {
    // 解析 Range 头
    const parts = range.replace(/bytes=/, "").split("-");
    const start = parseInt(parts[0], 10);
    const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
    const chunksize = end - start + 1;

    // 创建指定范围的流
    const readStream = fs.createReadStream(filePath, {
      start,
      end,
      encoding: "utf8",
    });

    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileSize}`,
      "Accept-Ranges": "bytes",
      "Content-Length": chunksize,
      "Content-Type": "text/plain; charset=utf-8",
    });

    readStream.pipe(res);
  } else {
    // 正常请求，返回整个文件
    res.writeHead(200, {
      "Content-Length": fileSize,
      "Content-Type": "text/plain; charset=utf-8",
    });

    fs.createReadStream(filePath, { encoding: "utf8" }).pipe(res);
  }
});

// 创建测试文件的辅助路由
app.get("/create-test-file", (_req, res) => {
  const filePath = path.join(__dirname, "big-data.txt");
  const writeStream = fs.createWriteStream(filePath);

  // 生成大约 10MB 的测试数据
  const lines = 100000;
  let written = 0;

  const writeData = () => {
    let ok = true;
    while (written < lines && ok) {
      const data = `这是第 ${written + 1} 行数据，包含一些测试内容，用于演示流式传输。时间戳: ${new Date().toISOString()}\n`;
      written++;

      if (written === lines) {
        writeStream.write(data, "utf8", () => {
          writeStream.end();
        });
      } else {
        ok = writeStream.write(data, "utf8");
      }
    }

    if (written < lines) {
      writeStream.once("drain", writeData);
    }
  };

  writeData();

  writeStream.on("finish", () => {
    res.json({
      message: "测试文件创建完成",
      path: filePath,
      lines: written,
    });
  });

  writeStream.on("error", (err) => {
    res.status(500).json({ error: err.message });
  });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在 http://localhost:${PORT}`);
  console.log("可用路由:");
  console.log("  GET /big-data - 基本流式传输");
  console.log("  GET /big-data-simple - 简洁版本");
  console.log("  GET /big-data-progress - 带进度监控");
  console.log("  GET /big-data-range - 支持断点续传");
  console.log("  GET /create-test-file - 创建测试文件");
});
