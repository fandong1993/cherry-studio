const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();

// 中间件配置
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由配置
app.use('/api/files', require('./routes/files'));
app.use('/api/chat', require('./routes/chat'));

// 健康检查端点
app.get('/health', (req, res) => {
  res.json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// 404处理
app.use((req, res) => {
  res.status(404).json({ 
    error: 'API端点不存在',
    path: req.path 
  });
});

// 错误处理中间件
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  
  // Multer错误处理
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ 
        error: '文件大小超过限制' 
      });
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ 
        error: '文件数量超过限制' 
      });
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ 
        error: '不支持的文件字段' 
      });
    }
  }

  // 其他错误
  res.status(err.status || 500).json({ 
    error: err.message || '服务器内部错误',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

app.listen(PORT, HOST, () => {
  console.log(`🚀 服务器启动成功:`);
  console.log(`   本地地址: http://${HOST}:${PORT}`);
  console.log(`   网络地址: http://localhost:${PORT}`);
  console.log(`   环境: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   上传目录: ${path.join(__dirname, '../uploads')}`);
  
  // 检查AI服务配置
  const aiServices = [];
  if (process.env.OPENAI_API_KEY) aiServices.push('OpenAI');
  if (process.env.ANTHROPIC_API_KEY) aiServices.push('Anthropic');
  
  if (aiServices.length > 0) {
    console.log(`   AI服务: ${aiServices.join(', ')}`);
  } else {
    console.log('   ⚠️  未配置AI服务API密钥');
  }
});

// 优雅关闭
process.on('SIGTERM', () => {
  console.log('收到SIGTERM信号，正在关闭服务器...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('收到SIGINT信号，正在关闭服务器...');
  process.exit(0);
});

module.exports = app;