import express from 'express';
import pako from 'pako';
import axios from 'axios';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

class MermaidHTTPServer {
  constructor() {
    this.app = express();
    this.port = process.env.PORT || 3000;
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
    
    // CORS支持
    this.app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
      
      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });
  }

  setupRoutes() {
    // 健康检查端点
    this.app.get('/health', (req, res) => {
      res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        service: 'mermaid-render-mcp',
        version: '1.0.0'
      });
    });

    // 渲染端点
    this.app.post('/render', async (req, res) => {
      try {
        const { mermaidCode, format = 'png' } = req.body;

        if (!mermaidCode) {
          return res.status(400).json({
            error: 'mermaidCode is required'
          });
        }

        if (!['png', 'svg'].includes(format.toLowerCase())) {
          return res.status(400).json({
            error: 'format must be either "png" or "svg"'
          });
        }

        console.log(`Rendering ${format.toUpperCase()} diagram...`);
        
        // 编码Mermaid代码
        const encoded = this.encodeMermaidCode(mermaidCode);
        
        // 构建mermaid.ink URL
        const baseUrl = format.toLowerCase() === 'svg' 
          ? 'https://mermaid.ink/svg/' 
          : 'https://mermaid.ink/img/';
        const url = `${baseUrl}${encoded}`;

        console.log(`Fetching from: ${url}`);

        // 从mermaid.ink获取图片
        const response = await axios({
          method: 'GET',
          url: url,
          responseType: 'stream',
          timeout: this.requestTimeout,
          headers: {
            'User-Agent': 'mermaid-render-mcp/1.0.0'
          }
        });

        // 设置适当的Content-Type
        const contentType = format.toLowerCase() === 'svg' 
          ? 'image/svg+xml' 
          : 'image/png';
        
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `inline; filename="diagram.${format}"`);

        // 直接管道传输响应
        response.data.pipe(res);

      } catch (error) {
        console.error('Render error:', error.message);
        
        if (error.response) {
          return res.status(error.response.status || 500).json({
            error: 'Failed to render diagram',
            message: error.message,
            status: error.response.status
          });
        }

        res.status(500).json({
          error: 'Internal server error',
          message: error.message
        });
      }
    });

    // 编码端点
    this.app.post('/encode', (req, res) => {
      try {
        const { mermaidCode } = req.body;

        if (!mermaidCode) {
          return res.status(400).json({
            error: 'mermaidCode is required'
          });
        }

        const encoded = this.encodeMermaidCode(mermaidCode);
        
        res.json({
          encoded: encoded,
          urls: {
            png: `https://mermaid.ink/img/${encoded}`,
            svg: `https://mermaid.ink/svg/${encoded}`
          }
        });

      } catch (error) {
        console.error('Encode error:', error.message);
        res.status(500).json({
          error: 'Failed to encode Mermaid code',
          message: error.message
        });
      }
    });

    // 解码端点
    this.app.post('/decode', (req, res) => {
      try {
        const { encodedString } = req.body;

        if (!encodedString) {
          return res.status(400).json({
            error: 'encodedString is required'
          });
        }

        const decoded = this.decodeMermaidCode(encodedString);
        
        res.json({
          mermaidCode: decoded
        });

      } catch (error) {
        console.error('Decode error:', error.message);
        res.status(500).json({
          error: 'Failed to decode Mermaid string',
          message: error.message
        });
      }
    });

    // 根路径
    this.app.get('/', (req, res) => {
      res.json({
        service: 'Mermaid Render MCP Server',
        version: '1.0.0',
        endpoints: {
          health: 'GET /health',
          render: 'POST /render',
          encode: 'POST /encode',
          decode: 'POST /decode'
        },
        documentation: {
          render: {
            method: 'POST',
            path: '/render',
            body: {
              mermaidCode: 'string (required)',
              format: 'string (optional: "png" or "svg", default: "png")'
            }
          }
        }
      });
    });

    // 404处理
    this.app.use('*', (req, res) => {
      res.status(404).json({
        error: 'Not found',
        path: req.originalUrl
      });
    });
  }

  encodeMermaidCode(mermaidCode) {
    const graphDefinition = {
      code: mermaidCode,
      mermaid: {
        theme: "default"
      }
    };

    const jsonString = JSON.stringify(graphDefinition);
    const compressed = pako.deflate(jsonString, { to: "string" });
    const base64 = Buffer.from(compressed, "binary").toString("base64");
    const urlSafe = base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
    
    return `pako:${urlSafe}`;
  }

  decodeMermaidCode(encodedString) {
    try {
      const cleanEncoded = encodedString.replace(/^pako:/, "");
      const base64 = cleanEncoded.replace(/-/g, "+").replace(/_/g, "/");
      
      // Add padding if needed
      const padding = "=".repeat((4 - base64.length % 4) % 4);
      const paddedBase64 = base64 + padding;
      
      const compressed = Buffer.from(paddedBase64, "base64").toString("binary");
      const decompressed = pako.inflate(compressed, { to: "string" });
      const parsed = JSON.parse(decompressed);
      
      return parsed.code;
    } catch (error) {
      throw new Error(`Invalid encoded string: ${error.message}`);
    }
  }

  start() {
    this.app.listen(this.port, () => {
      console.log(`🚀 Mermaid HTTP Server running on port ${this.port}`);
      console.log(`📍 Health check: http://localhost:${this.port}/health`);
      console.log(`🎨 Render endpoint: http://localhost:${this.port}/render`);
    });
  }
}

const server = new MermaidHTTPServer();
server.start();

export { MermaidHTTPServer };
