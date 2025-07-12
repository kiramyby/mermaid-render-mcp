import axios from 'axios';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// 加载环境变量
dotenv.config();

// 创建一个HTTP客户端来测试Mermaid渲染和图片保存
class MermaidRenderClient {
  constructor(baseUrl = process.env.TEST_SERVER_URL || 'http://localhost:3000') {
    this.baseUrl = baseUrl;
    this.outputDir = process.env.OUTPUT_DIR || './output';
    this.requestTimeout = parseInt(process.env.REQUEST_TIMEOUT) || 30000;
    this.healthCheckTimeout = parseInt(process.env.HEALTH_CHECK_TIMEOUT) || 5000;
    this.ensureOutputDir();
  }

  // 确保输出目录存在
  ensureOutputDir() {
    if (!fs.existsSync(this.outputDir)) {
      fs.mkdirSync(this.outputDir, { recursive: true });
      console.log(`📁 Created output directory: ${this.outputDir}`);
    }
  }

  // 渲染图表的通用方法
  async renderDiagram(mermaidCode, diagramType) {
    try {
      console.log(`⬇️  Requesting ${diagramType} from: ${this.baseUrl}/render`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/render`,
        data: {
          mermaidCode: mermaidCode,
          format: 'png' // 或者可以设置为 'svg'
        },
        responseType: 'stream',
        timeout: this.requestTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const filePath = path.join(this.outputDir, `${diagramType}.png`);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Saved PNG to: ${filePath}`);
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Failed to render ${diagramType}: ${error.message}`);
      throw error;
    }
  }

  // 渲染图表的通用方法（支持指定格式）
  async renderDiagramWithFormat(mermaidCode, diagramType, format = 'png') {
    try {
      console.log(`⬇️  Requesting ${diagramType} (${format.toUpperCase()}) from: ${this.baseUrl}/render`);
      
      const response = await axios({
        method: 'POST',
        url: `${this.baseUrl}/render`,
        data: {
          mermaidCode: mermaidCode,
          format: format
        },
        responseType: 'stream',
        timeout: this.requestTimeout,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const filePath = path.join(this.outputDir, `${diagramType}.${format}`);
      const writer = fs.createWriteStream(filePath);

      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', () => {
          console.log(`✅ Saved ${format.toUpperCase()} to: ${filePath}`);
          resolve(filePath);
        });
        writer.on('error', reject);
      });
    } catch (error) {
      console.error(`❌ Failed to render ${diagramType} (${format.toUpperCase()}): ${error.message}`);
      throw error;
    }
  }

  // 渲染并保存流程图
  async testFlowchart() {
    console.log('\n🧪 Testing Flowchart rendering and saving...');
    
    const mermaidCode = `graph TD
    A[用户访问] --> B{是否登录?}
    B -->|是| C[显示首页]
    B -->|否| D[跳转登录页]
    D --> E[用户登录]
    E --> F{验证成功?}
    F -->|是| C
    F -->|否| G[显示错误信息]
    G --> D
    C --> H[用户操作]
    H --> I[处理请求]
    I --> J[返回结果]`;

    try {
      // 保存PNG格式
      await this.renderDiagramWithFormat(mermaidCode, 'flowchart', 'png');
      
      // 保存SVG格式
      await this.renderDiagramWithFormat(mermaidCode, 'flowchart', 'svg');
      
      console.log('✅ Flowchart test completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Flowchart test failed:', error.message);
      return false;
    }
  }

  // 渲染并保存时序图
  async testSequenceDiagram() {
    console.log('\n🧪 Testing Sequence Diagram rendering and saving...');
    
    const mermaidCode = `sequenceDiagram
    participant 客户端
    participant 服务器
    participant 数据库
    participant 缓存
    
    客户端->>服务器: 发送请求
    服务器->>缓存: 检查缓存
    alt 缓存命中
        缓存-->>服务器: 返回数据
    else 缓存未命中
        服务器->>数据库: 查询数据
        数据库-->>服务器: 返回结果
        服务器->>缓存: 更新缓存
    end
    服务器-->>客户端: 返回响应`;

    try {
      await this.renderDiagramWithFormat(mermaidCode, 'sequence-diagram', 'png');
      await this.renderDiagramWithFormat(mermaidCode, 'sequence-diagram', 'svg');
      
      console.log('✅ Sequence diagram test completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Sequence diagram test failed:', error.message);
      return false;
    }
  }

  // 渲染并保存类图
  async testClassDiagram() {
    console.log('\n🧪 Testing Class Diagram rendering and saving...');
    
    const mermaidCode = `classDiagram
    class 用户 {
        -String 用户名
        -String 密码
        -String 邮箱
        +登录() boolean
        +注册() boolean
        +修改密码() boolean
    }
    class 管理员 {
        -String 权限级别
        +管理用户() void
        +系统设置() void
    }
    class 商品 {
        -String 商品ID
        -String 商品名称
        -Double 价格
        -Integer 库存
        +添加商品() void
        +更新价格() void
    }
    class 订单 {
        -String 订单ID
        -Date 创建时间
        -Double 总金额
        +创建订单() void
        +取消订单() void
    }
    
    用户 <|-- 管理员
    用户 "1" --> "*" 订单 : 创建
    订单 "*" --> "*" 商品 : 包含`;

    try {
      await this.renderDiagramWithFormat(mermaidCode, 'class-diagram', 'png');
      await this.renderDiagramWithFormat(mermaidCode, 'class-diagram', 'svg');
      
      console.log('✅ Class diagram test completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Class diagram test failed:', error.message);
      return false;
    }
  }

  // 渲染并保存饼图
  async testPieChart() {
    console.log('\n🧪 Testing Pie Chart rendering and saving...');
    
    const mermaidCode = `pie title 网站访问来源统计
    "搜索引擎" : 42.5
    "直接访问" : 28.7
    "社交媒体" : 15.3
    "推荐链接" : 8.9
    "广告投放" : 4.6`;

    try {
      await this.renderDiagramWithFormat(mermaidCode, 'pie-chart', 'png');
      await this.renderDiagramWithFormat(mermaidCode, 'pie-chart', 'svg');
      
      console.log('✅ Pie chart test completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Pie chart test failed:', error.message);
      return false;
    }
  }

  // 渲染并保存甘特图
  async testGanttChart() {
    console.log('\n🧪 Testing Gantt Chart rendering and saving...');
    
    const mermaidCode = `gantt
    title 项目开发时间线
    dateFormat  YYYY-MM-DD
    section 需求分析
    需求收集           :a1, 2024-01-01, 10d
    需求分析           :after a1, 7d
    section 设计阶段
    系统设计           :2024-01-18, 12d
    UI设计            :2024-01-20, 10d
    section 开发阶段
    后端开发           :2024-02-01, 20d
    前端开发           :2024-02-05, 18d
    section 测试阶段
    单元测试           :2024-02-21, 5d
    集成测试           :2024-02-26, 7d
    section 部署上线
    部署准备           :2024-03-05, 3d
    正式上线           :2024-03-08, 2d`;

    try {
      await this.renderDiagramWithFormat(mermaidCode, 'gantt-chart', 'png');
      await this.renderDiagramWithFormat(mermaidCode, 'gantt-chart', 'svg');
      
      console.log('✅ Gantt chart test completed successfully!');
      return true;
    } catch (error) {
      console.error('❌ Gantt chart test failed:', error.message);
      return false;
    }
  }

  // 运行所有测试并保存图片
  async runAllTests() {
    console.log('🚀 Starting Mermaid Render Client Tests...\n');
    console.log(`🌐 Testing server at: ${this.baseUrl}`);
    console.log(`📁 Images will be saved to: ${path.resolve(this.outputDir)}\n`);
    
    // 首先检查服务器是否可达
    try {
      console.log('🔍 Checking server connectivity...');
      await axios.get(`${this.baseUrl}/health`, { timeout: this.healthCheckTimeout });
      console.log('✅ Server is accessible\n');
    } catch (error) {
      console.error(`❌ Cannot connect to server at ${this.baseUrl}`);
      console.error('Please make sure the server is running on localhost:3000');
      return false;
    }
    
    const tests = [
      this.testFlowchart(),
      this.testSequenceDiagram(),
      this.testClassDiagram(),
      this.testPieChart(),
      this.testGanttChart()
    ];

    const results = await Promise.all(tests.map(test => 
      test.catch(error => {
        console.error('Test error:', error.message);
        return false;
      })
    ));
    
    const passed = results.filter(result => result).length;
    const total = results.length;

    console.log(`\n📊 Test Results: ${passed}/${total} tests passed`);
    console.log(`📁 Check the '${this.outputDir}' directory for saved images.`);
    
    if (passed === total) {
      console.log('🎉 All tests passed! All diagrams have been rendered and saved.');
    } else {
      console.log('⚠️  Some tests failed. Please check the errors above.');
    }

    // 列出保存的文件
    try {
      const files = fs.readdirSync(this.outputDir);
      if (files.length > 0) {
        console.log('\n📋 Saved files:');
        files.forEach(file => {
          console.log(`   - ${file}`);
        });
      }
    } catch (error) {
      console.error('Could not list saved files:', error.message);
    }

    return passed === total;
  }
}

// 如果直接运行此文件，执行测试
if (import.meta.url === `file:///${process.argv[1].replace(/\\/g, '/')}` || 
    import.meta.url.endsWith('test.js')) {
  const client = new MermaidRenderClient();
  client.runAllTests().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Test runner error:', error);
    process.exit(1);
  });
}

export { MermaidRenderClient };
