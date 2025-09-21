# Vue.js AI对话应用开发指南

## 环境要求

- Node.js >= 18.0.0
- npm >= 8.0.0 或 yarn >= 1.22.0
- Git

## 项目初始化

### 1. 创建Vue项目

```bash
# 使用Vue CLI创建项目
npm create vue@latest ai-chat-app

# 选择配置项
✔ Add TypeScript? … Yes
✔ Add JSX Support? … No
✔ Add Vue Router for Single Page Application development? … Yes
✔ Add Pinia for state management? … Yes
✔ Add Vitest for Unit Testing? … Yes
✔ Add an End-to-End Testing Solution? … No
✔ Add ESLint for code quality? … Yes
✔ Add Prettier for code formatting? … Yes

cd ai-chat-app
npm install
```

### 2. 安装依赖

```bash
# UI组件库
npm install element-plus
npm install @element-plus/icons-vue

# HTTP客户端
npm install axios

# 文件处理
npm install mime-types
npm install browser-image-compression

# 实用工具
npm install uuid
npm install dayjs
npm install lodash-es

# 开发依赖
npm install -D @types/mime-types
npm install -D @types/uuid
npm install -D @types/lodash-es
```

### 3. 后端服务器初始化

```bash
# 创建服务器目录
mkdir server
cd server

# 初始化package.json
npm init -y

# 安装依赖
npm install express cors multer
npm install helmet compression morgan
npm install openai @anthropic-ai/sdk

# 文件处理依赖
npm install sharp pdf-parse mammoth xlsx
npm install mime-types uuid

# 开发依赖
npm install -D nodemon @types/node
npm install -D @types/express @types/multer
npm install -D @types/mime-types @types/uuid
```

## 项目结构

```
ai-chat-app/
├── frontend/                    # Vue.js前端
│   ├── src/
│   │   ├── components/
│   │   │   ├── Chat/
│   │   │   ├── FileManager/
│   │   │   └── Common/
│   │   ├── views/
│   │   ├── stores/
│   │   ├── services/
│   │   ├── types/
│   │   └── utils/
│   ├── public/
│   └── package.json
├── server/                      # Node.js后端
│   ├── src/
│   │   ├── controllers/
│   │   ├── services/
│   │   ├── middleware/
│   │   ├── routes/
│   │   └── utils/
│   ├── uploads/                 # 文件上传目录
│   └── package.json
└── docs/                        # 文档
```

## 开发环境配置

### 1. 前端配置 (vite.config.ts)

```typescript
import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
```

### 2. 后端配置 (server/src/app.js)

```javascript
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 静态文件服务
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

// 路由
app.use('/api/files', require('./routes/files'));
app.use('/api/chat', require('./routes/chat'));

// 错误处理
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '服务器内部错误' });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
});
```

## 开发命令

### 开发模式

```bash
# 启动前端开发服务器
cd frontend
npm run dev

# 启动后端开发服务器
cd server
npm run dev
```

### 构建部署

```bash
# 构建前端
cd frontend
npm run build

# 前端构建产物在 frontend/dist/ 目录
```

## 环境变量配置

### 前端 (.env)

```env
# API基础URL
VITE_API_BASE_URL=http://localhost:3000

# 文件上传限制
VITE_MAX_FILE_SIZE=50000000
VITE_ALLOWED_FILE_TYPES=jpg,png,gif,pdf,docx,xlsx,txt,md
```

### 后端 (.env)

```env
# 服务端口
PORT=3000

# AI API密钥
OPENAI_API_KEY=your_openai_key
ANTHROPIC_API_KEY=your_anthropic_key

# 文件上传配置
MAX_FILE_SIZE=50000000
UPLOAD_DIR=./uploads

# 数据库配置 (可选)
DATABASE_URL=mongodb://localhost:27017/ai-chat
```

## 开发流程

### 1. 开发前端组件

1. 创建文件上传组件
2. 创建对话界面组件
3. 实现状态管理
4. 集成API服务

### 2. 开发后端服务

1. 实现文件上传API
2. 集成AI模型API
3. 实现对话管理
4. 添加错误处理和日志

### 3. 测试和调试

1. 单元测试
2. 集成测试
3. 端到端测试
4. 性能测试

### 4. 部署准备

1. 环境配置
2. 安全加固
3. 性能优化
4. 监控配置

## 注意事项

1. **文件大小限制**: 根据服务器配置调整文件大小限制
2. **安全性**: 严格验证上传文件类型，防止恶意文件
3. **性能**: 大文件上传使用分片上传
4. **错误处理**: 完善的错误处理和用户提示
5. **跨域配置**: 确保前后端跨域配置正确

## 故障排除

### 常见问题

1. **文件上传失败**: 检查文件大小和类型限制
2. **API调用失败**: 检查后端服务是否启动，网络连接是否正常
3. **AI响应失败**: 检查API密钥配置是否正确
4. **跨域错误**: 检查CORS配置

### 调试技巧

1. 使用浏览器开发者工具检查网络请求
2. 查看后端控制台日志
3. 使用断点调试前端代码
4. 使用Postman测试API接口