import http from 'http';
import fs from 'fs';
import path from 'path';

const SERVER_HOST = 'localhost';
const SERVER_PORT = 3000;

// 甘特图测试用例
const ganttTests = [
  {
    name: '基础甘特图',
    code: `gantt
    title 项目开发计划
    dateFormat YYYY-MM-DD
    section 需求分析
    需求收集    :done, des1, 2024-01-01, 2024-01-05
    需求分析    :done, des2, after des1, 3d
    section 开发阶段
    前端开发    :active, dev1, 2024-01-08, 2024-01-20
    后端开发    :dev2, 2024-01-10, 2024-01-25
    section 测试阶段
    单元测试    :test1, after dev1, 5d
    集成测试    :test2, after dev2, 3d`
  },
  {
    name: '复杂甘特图',
    code: `gantt
    title 大型项目管理
    dateFormat YYYY-MM-DD
    section 设计阶段
    用户研究    :done, research, 2024-01-01, 2024-01-10
    原型设计    :done, prototype, after research, 2024-01-15
    UI设计      :done, ui, after prototype, 2024-01-25
    section 开发阶段
    数据库设计  :active, db, 2024-01-20, 2024-02-05
    API开发     :api, after db, 15d
    前端组件    :frontend, 2024-02-01, 2024-02-20
    移动端开发  :mobile, after api, 20d
    section 测试发布
    单元测试    :test1, after frontend, 7d
    集成测试    :test2, after mobile, 5d
    用户测试    :uat, after test2, 5d
    正式发布    :release, after uat, 1d`
  },
  {
    name: '里程碑甘特图',
    code: `gantt
    title 产品发布里程碑
    dateFormat YYYY-MM-DD
    section Phase 1
    项目启动     :milestone, start, 2024-01-01, 0d
    开发工作     :dev1, 2024-01-02, 20d
    Alpha测试    :test1, after dev1, 10d
    Alpha发布    :milestone, alpha, after test1, 0d
    section Phase 2
    功能完善     :dev2, after alpha, 25d
    Beta测试     :test2, after dev2, 8d
    Beta发布     :milestone, beta, after test2, 0d
    section Phase 3
    最终优化     :opt, after beta, 15d
    最终测试     :final, after opt, 5d
    正式发布     :milestone, release, after final, 0d`
  }
];

// 创建输出目录
const outputDir = path.join(process.cwd(), 'test-output');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// HTTP 请求封装函数
function makeRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = '';
      res.setEncoding('utf8');
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const response = {
            statusCode: res.statusCode,
            headers: res.headers,
            data: res.headers['content-type']?.includes('application/json') ? JSON.parse(data) : data
          };
          resolve(response);
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            data: data
          });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 二进制数据请求函数
function makeBinaryRequest(options, postData) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      const chunks = [];
      
      res.on('data', (chunk) => {
        chunks.push(chunk);
      });
      
      res.on('end', () => {
        const buffer = Buffer.concat(chunks);
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          data: buffer
        });
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    if (postData) {
      req.write(postData);
    }
    
    req.end();
  });
}

// 测试服务器健康状态
async function testHealth() {
  try {
    console.log('🔍 检查服务器状态...');
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/health',
      method: 'GET'
    };
    
    const response = await makeRequest(options);
    
    if (response.statusCode === 200) {
      console.log('✅ 服务器运行正常');
      console.log(`   服务: ${response.data.service}`);
      console.log(`   版本: ${response.data.version}`);
      console.log(`   支持格式: ${response.data.supportedFormats.join(', ')}`);
      return true;
    } else {
      console.error('❌ 服务器状态异常:', response.statusCode);
      return false;
    }
  } catch (error) {
    console.error('❌ 无法连接到服务器:', error.message);
    console.log('   请确保服务器正在运行: node png-server.js');
    return false;
  }
}

// 测试渲染为 Base64
async function testRenderBase64(testCase, format = 'png') {
  try {
    console.log(`📊 测试 "${testCase.name}" - ${format.toUpperCase()} Base64...`);
    
    const postData = JSON.stringify({
      code: testCase.code,
      width: 1400,
      height: 900,
      format: format
    });
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/render',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    
    if (response.statusCode === 200 && response.data && response.data.data) {
      console.log(`✅ 渲染成功`);
      
      // 保存 base64 数据
      const fileName = `${testCase.name.replace(/\s+/g, '_')}_${format}_base64.txt`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, response.data.data);
      console.log(`   💾 Base64数据已保存: ${fileName}`);
      
      // 如果是PNG，解码并保存图片
      if (format === 'png') {
        const base64Data = response.data.data.replace(/^data:image\/png;base64,/, '');
        const imageBuffer = Buffer.from(base64Data, 'base64');
        const imagePath = path.join(outputDir, `${testCase.name.replace(/\s+/g, '_')}_decoded.png`);
        fs.writeFileSync(imagePath, imageBuffer);
        console.log(`   🖼️ PNG图片已保存: ${testCase.name.replace(/\s+/g, '_')}_decoded.png`);
      }
      
      return true;
    } else {
      console.error(`❌ 渲染失败 - 状态码: ${response.statusCode}`);
      if (response.data && response.data.error) {
        console.error(`   错误: ${response.data.error}`);
      }
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message);
    return false;
  }
}

// 测试渲染为图片文件
async function testRenderImage(testCase, format = 'png') {
  try {
    console.log(`📊 测试 "${testCase.name}" - ${format.toUpperCase()} 直接文件...`);
    
    const postData = JSON.stringify({
      code: testCase.code,
      width: 1400,
      height: 900,
      format: format
    });
    
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/render/image',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeBinaryRequest(options, postData);
    
    if (response.statusCode === 200 && response.data) {
      console.log(`✅ 渲染成功`);
      
      // 保存图片文件
      const fileName = `${testCase.name.replace(/\s+/g, '_')}_direct.${format}`;
      const filePath = path.join(outputDir, fileName);
      fs.writeFileSync(filePath, response.data);
      console.log(`   🖼️ ${format.toUpperCase()}文件已保存: ${fileName}`);
      console.log(`   📏 文件大小: ${(response.data.length / 1024).toFixed(2)} KB`);
      
      return true;
    } else {
      console.error(`❌ 渲染失败 - 状态码: ${response.statusCode}`);
      return false;
    }
  } catch (error) {
    console.error(`❌ 请求失败:`, error.message);
    return false;
  }
}

// 测试错误处理
async function testErrorHandling() {
  console.log('\n🔍 测试错误处理...');
  
  // 测试空代码
  try {
    const postData = JSON.stringify({ code: '' });
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/render',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    if (response.statusCode === 400) {
      console.log('✅ 空代码错误处理正确');
    } else {
      console.log(`❌ 空代码处理异常 - 状态码: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('❌ 空代码测试失败:', error.message);
  }
  
  // 测试无效代码
  try {
    const postData = JSON.stringify({ code: 'invalid mermaid syntax here' });
    const options = {
      hostname: SERVER_HOST,
      port: SERVER_PORT,
      path: '/render',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };
    
    const response = await makeRequest(options, postData);
    if (response.statusCode === 500) {
      console.log('✅ 无效代码错误处理正确');
    } else {
      console.log(`❌ 无效代码处理异常 - 状态码: ${response.statusCode}`);
    }
  } catch (error) {
    console.error('❌ 无效代码测试失败:', error.message);
  }
}

// 主测试函数
async function runTests() {
  console.log('🚀 甘特图渲染测试\n');
  
  // 检查服务器状态
  const isHealthy = await testHealth();
  if (!isHealthy) {
    console.log('请先启动服务器: node png-server.js');
    process.exit(1);
  }
  
  let successCount = 0;
  let totalTests = 0;
  
  console.log('📊 PNG 格式测试');
  console.log('='.repeat(40));
  
  for (const testCase of ganttTests) {
    totalTests++;
    const success = await testRenderBase64(testCase, 'png');
    if (success) successCount++;
    console.log('');
  }
  
  console.log('📊 SVG 格式测试');
  console.log('='.repeat(40));
  
  for (const testCase of ganttTests) {
    totalTests++;
    const success = await testRenderImage(testCase, 'svg');
    if (success) successCount++;
    console.log('');
  }
  
  console.log('🛠️  错误处理测试');
  console.log('='.repeat(40));
  await testErrorHandling();
  
  console.log('\n📋 测试结果');
  console.log('='.repeat(40));
  console.log(`总测试数: ${totalTests}`);
  console.log(`成功: ${successCount}`);
  console.log(`失败: ${totalTests - successCount}`);
  console.log(`成功率: ${((successCount / totalTests) * 100).toFixed(1)}%`);
  
  console.log(`\n📁 文件保存在: ${outputDir}`);
  console.log('🎉 测试完成！');
}

// 命令行参数处理
const args = process.argv.slice(2);

if (args.includes('--help') || args.includes('-h')) {
  console.log(`
甘特图测试工具

用法:
  node test-gantt.js [选项]

选项:
  --help, -h     显示帮助
  --quick, -q    快速测试

示例:
  node test-gantt.js          # 完整测试
  node test-gantt.js --quick  # 快速测试
`);
  process.exit(0);
}

if (args.includes('--quick') || args.includes('-q')) {
  console.log('⚡ 快速测试模式\n');
  
  (async () => {
    const isHealthy = await testHealth();
    if (!isHealthy) {
      console.log('请先启动服务器: node png-server.js');
      process.exit(1);
    }
    
    console.log('📊 快速测试');
    const testCase = ganttTests[0];
    await testRenderBase64(testCase, 'png');
    
    console.log('\n🎉 快速测试完成！');
    console.log(`📁 文件保存在: ${outputDir}`);
  })();
} else {
  runTests().catch(error => {
    console.error('测试失败:', error);
    process.exit(1);
  });
}
