import express from 'express';
import puppeteer from 'puppeteer';

const app = express();
const PORT = 3000;

let browser; // 全局 Puppeteer 浏览器实例

app.use(express.json({ limit: '10mb' }));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Mermaid Render Server',
    version: '3.0.0', // New version
    supportedFormats: ['svg', 'png'],
    mermaidVersion: '10.6.1' // Or whatever version you are using
  });
});

// 统一的渲染端点
app.post('/render', async (req, res) => {
  try {
    const { code, width = 1200, height = 800, format = 'png' } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少必需参数: code' });
    }

    const result = await renderWithPuppeteer(code, width, height, format);

    if (format === 'svg') {
      const base64 = Buffer.from(result.data).toString('base64');
      res.json({
        format: 'svg-base64',
        data: `data:image/svg+xml;base64,${base64}`,
        width,
        height
      });
    } else {
      const base64 = result.data.toString('base64');
      res.json({
        format: 'png-base64',
        data: `data:image/png;base64,${base64}`,
        width,
        height
      });
    }
  } catch (error) {
    console.error('渲染错误:', error);
    res.status(500).json({
      error: '渲染失败',
      message: error.message
    });
  }
});

app.post('/render/image', async (req, res) => {
  try {
    const { code, width = 1200, height = 800, format = 'png' } = req.body;

    if (!code) {
      return res.status(400).json({ error: '缺少必需参数: code' });
    }

    const result = await renderWithPuppeteer(code, width, height, format);

    res.setHeader('Content-Type', result.contentType);
    res.setHeader('Content-Disposition', `attachment; filename="mermaid.${format}"`);
    res.send(result.data);

  } catch (error) {
    console.error('渲染错误:', error);
    res.status(500).json({
      error: '渲染失败',
      message: error.message
    });
  }
});


async function renderWithPuppeteer(code, width, height, format) {
  let page;
  try {
    page = await browser.newPage();
    
    // 设置视口，这决定了截图的尺寸
    await page.setViewport({ width, height });

    const mermaidConfig = {
      theme: 'default',
      // 确保字体在 Docker 容器中可用
      fontFamily: '"Noto Sans CJK SC", "Source Han Sans SC", "Microsoft YaHei", "微软雅黑", "SimHei", "黑体", "DejaVu Sans", Arial, sans-serif',
      // 增加一些内边距，防止图表被截断
      gantt: {
        useWidth: width
      }
    };

    // 注入 HTML、Mermaid.js 和图表代码
    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="UTF-8" />
          <style>
            body {
              margin: 0;
              padding: 20px; /* Add some padding */
              display: flex;
              justify-content: center;
              align-items: center;
              height: calc(100vh - 40px);
            }
            #container {
              max-width: 100%;
              max-height: 100%;
            }
          </style>
        </head>
        <body>
          <div id="container" class="mermaid">${escapeHtml(code)}</div>
          <script src="https://cdn.jsdelivr.net/npm/mermaid@10/dist/mermaid.min.js"></script>
          <script>
            mermaid.initialize({ 
              startOnLoad: false, // We will render manually
              ...${JSON.stringify(mermaidConfig)}
            });
            await mermaid.run({ nodes: [document.getElementById('container')] });
          </script>
        </body>
      </html>
    `);

    // 等待 Mermaid 渲染完成
    const container = await page.waitForSelector('#container > svg');
    if (!container) {
      throw new Error('Mermaid 渲染失败: 找不到 SVG 元素');
    }

    if (format === 'svg') {
      const svgContent = await page.evaluate(el => el.outerHTML, container);
      return { data: svgContent, contentType: 'image/svg+xml; charset=utf-8' };
    } else {
      const pngBuffer = await container.screenshot({
        omitBackground: true, // 透明背景
      });
      return { data: pngBuffer, contentType: 'image/png' };
    }

  } catch (error) {
    console.error('Puppeteer 渲染错误:', error);
    // 可以创建一个错误SVG返回
    const errorSvg = `<svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg"><text x="10" y="20" fill="red">渲染错误: ${escapeHtml(error.message)}</text></svg>`;
    if (format === 'svg') {
      return { data: errorSvg, contentType: 'image/svg+xml; charset=utf-8' };
    } else {
      // 对于PNG，理论上应该用sharp将错误SVG转为PNG，但为简单起见，我们直接抛出错误
      throw new Error(`Puppeteer 渲染失败: ${error.message}`);
    }
  } finally {
    if (page) {
      await page.close();
    }
  }
}

function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

async function startServer() {
  try {
    console.log('正在初始化 Puppeteer...');
    // 启动 Puppeteer 浏览器
    browser = await puppeteer.launch({
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage', // 在 Docker 中非常重要
        '--font-render-hinting=none' // 改善字体渲染
      ],
      headless: true,
    });
    console.log('Puppeteer 初始化成功。');

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Mermaid 渲染服务器运行在 http://0.0.0.0:${PORT}`);
      console.log(`   POST /render - 渲染为base64 (支持SVG和PNG)`);
      console.log(`   POST /render/image - 渲染为文件 (支持SVG和PNG)`);
    });

  } catch (error) {
    console.error('启动服务器或初始化 Puppeteer 失败:', error);
    process.exit(1);
  }
}

// 优雅地关闭
process.on('SIGINT', async () => {
  console.log('收到 SIGINT. 正在关闭 Puppeteer 浏览器...');
  if (browser) {
    await browser.close();
  }
  process.exit(0);
});

startServer();
