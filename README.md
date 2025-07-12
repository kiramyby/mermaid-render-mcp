# Mermaid 渲染服务

一个基于 Model Context Protocol (MCP) 的 Mermaid 图表渲染服务，支持将 Mermaid 代码渲染为 PNG 或 SVG 图片。

## 功能特性

- 🎨 支持 PNG 和 SVG 格式输出
- 🌐 HTTP REST API 接口
- 🔄 Mermaid 代码编码/解码
- 📊 支持所有 Mermaid 图表类型（流程图、时序图、类图、甘特图、饼图等）
- 🚀 基于 mermaid.ink 在线渲染

## 快速开始

### 安装依赖

```bash
npm install
```

### 环境配置

复制 `.env.example` 文件为 `.env` 并根据需要修改配置：

```bash
cp .env.example .env
```

#### 环境变量说明

- `PORT`: 服务器端口（默认: 3000）
- `BASE_URL`: 服务器基础URL（默认: `http://localhost:3000`）
- `TEST_SERVER_URL`: 测试时使用的服务器URL（默认: `http://localhost:3000`）
- `OUTPUT_DIR`: 测试输出目录（默认: ./output）
- `REQUEST_TIMEOUT`: HTTP请求超时时间（毫秒，默认: 30000）
- `MCP_TIMEOUT`: MCP服务超时时间（毫秒，默认: 10000）
- `HEALTH_CHECK_TIMEOUT`: 健康检查超时时间（毫秒，默认: 5000）

### 启动服务

```bash
# 启动 HTTP 服务器
npm start

# 开发模式（自动重启）
npm run dev

# 运行测试
npm test
```

服务默认运行在 `http://localhost:3000`

## API 接口

### 1. 渲染图表

#### 渲染请求

```http
POST /render
Content-Type: application/json

{
  "mermaidCode": "graph TD\n    A[开始] --> B[处理]\n    B --> C[结束]",
  "format": "png"
}
```

#### 请求字段

- `mermaidCode` (string, 必需): Mermaid 图表代码
- `format` (string, 可选): 输出格式，支持 "png" 或 "svg"，默认 "png"

#### 渲染响应

- 成功: 返回图片文件（二进制流）
- Content-Type: `image/png` 或 `image/svg+xml`

#### 错误响应

```json
{
  "error": "mermaidCode is required"
}
```

### 2. 编码 Mermaid 代码

#### 编码请求

```http
POST /encode
Content-Type: application/json

{
  "mermaidCode": "graph TD\n    A[开始] --> B[处理]"
}
```

#### 编码响应

```json
{
  "encoded": "pako:eNpLyU9VqE4sSc4IVrJSUErOyS9VqihKzEvPTSxTslJQSsvMS1fIT0lNLSmuBMvOAKpyTc4vbWHgFRUJBqr-",
  "urls": {
    "png": "https://mermaid.ink/img/pako:eNpLyU9VqE4sSc4IVrJSUErOyS9VqihKzEvPTSxTslJQSsvMS1fIT0lNLSmuBMvOAKpyTc4vbWHgFRUJBqr-",
    "svg": "https://mermaid.ink/svg/pako:eNpLyU9VqE4sSc4IVrJSUErOyS9VqihKzEvPTSxTslJQSsvMS1fIT0lNLSmuBMvOAKpyTc4vbWHgFRUJBqr-"
  }
}
```

### 3. 解码 Mermaid 代码

#### 解码请求

```http
POST /decode
Content-Type: application/json

{
  "encodedString": "pako:eNpLyU9VqE4sSc4IVrJSUErOyS9VqihKzEvPTSxTslJQSsvMS1fIT0lNLSmuBMvOAKpyTc4vbWHgFRUJBqr-"
}
```

#### 解码响应

```json
{
  "mermaidCode": "graph TD\n    A[开始] --> B[处理]"
}
```

### 4. 健康检查

#### 健康检查请求

```http
GET /health
```

#### 健康检查响应

```json
{
  "status": "ok",
  "timestamp": "2025-07-12T10:30:00.000Z",
  "service": "mermaid-render-mcp",
  "version": "1.0.0"
}
```

## 支持的图表类型

- 流程图 (Flowchart)
- 时序图 (Sequence Diagram)
- 类图 (Class Diagram)
- 甘特图 (Gantt Chart)
- 饼图 (Pie Chart)
- 状态图 (State Diagram)
- 用户旅程图 (User Journey)
- Git 图 (Git Graph)
- ER 图 (Entity Relationship Diagram)

## 使用示例

### 使用 curl 渲染流程图

```bash
curl -X POST http://localhost:3000/render \
  -H "Content-Type: application/json" \
  -d '{
    "mermaidCode": "graph TD\n    A[用户访问] --> B{是否登录?}\n    B -->|是| C[显示首页]\n    B -->|否| D[跳转登录页]",
    "format": "png"
  }' \
  --output flowchart.png
```

### 使用 JavaScript 客户端

```javascript
const response = await fetch('http://localhost:3000/render', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    mermaidCode: `sequenceDiagram
      participant A as 客户端
      participant B as 服务器
      A->>B: 发送请求
      B-->>A: 返回响应`,
    format: 'svg'
  })
});

const svgData = await response.text();
```

## Docker 部署

```bash
# 构建镜像
docker build -t mermaid-render-mcp .

# 运行容器
docker run -p 3000:3000 mermaid-render-mcp

# 使用 Docker Compose
docker-compose up
```

## 许可证

MIT License
