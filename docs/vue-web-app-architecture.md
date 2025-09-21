# Vue.js Web 大模型对话应用架构设计

## 概述

基于Cherry Studio Electron应用的设计理念，为Vue.js web应用设计一个包含文件上传功能的大模型对话系统。

## 整体架构

### 前端架构 (Vue.js)

```
src/
├── components/           # 可复用组件
│   ├── Chat/            # 对话相关组件
│   │   ├── ChatContainer.vue
│   │   ├── MessageList.vue
│   │   ├── MessageInput.vue
│   │   └── FileUpload.vue
│   ├── FileManager/     # 文件管理组件
│   │   ├── FileUploader.vue
│   │   ├── FilePreview.vue
│   │   └── FileList.vue
│   └── Common/          # 通用组件
├── services/            # 业务服务层
│   ├── apiService.ts    # API调用服务
│   ├── fileService.ts   # 文件处理服务
│   ├── aiService.ts     # AI模型调用服务
│   └── chatService.ts   # 对话管理服务
├── stores/              # Pinia状态管理
│   ├── chatStore.ts     # 对话状态
│   ├── fileStore.ts     # 文件状态
│   └── userStore.ts     # 用户状态
├── types/               # TypeScript类型定义
│   ├── chat.ts
│   ├── file.ts
│   └── api.ts
└── utils/               # 工具函数
    ├── fileUtils.ts
    ├── formatUtils.ts
    └── validationUtils.ts
```

### 后端架构 (Node.js + Express)

```
server/
├── controllers/         # 控制器
│   ├── chatController.js
│   ├── fileController.js
│   └── aiController.js
├── services/           # 业务服务
│   ├── fileService.js  # 文件处理服务
│   ├── aiService.js    # AI模型集成
│   └── storageService.js # 存储服务
├── middleware/         # 中间件
│   ├── auth.js
│   ├── fileUpload.js
│   └── errorHandler.js
├── models/             # 数据模型
│   ├── fileModel.js
│   └── chatModel.js
├── routes/             # 路由定义
│   ├── chat.js
│   ├── file.js
│   └── ai.js
└── utils/              # 工具函数
    ├── fileUtils.js
    └── validation.js
```

## 核心功能模块

### 1. 文件上传模块

#### 前端 (Vue Component)
- 支持拖拽上传
- 文件类型检测
- 上传进度显示
- 文件预览
- 大文件分片上传

#### 后端 (Express Service)
- 文件接收和验证
- 文件存储 (本地/云存储)
- 文件元数据管理
- 文件处理 (OCR、文档解析等)

### 2. AI对话模块

#### 前端
- 实时对话界面
- 支持多种消息类型 (文本、图片、文件)
- 流式响应显示
- 对话历史管理

#### 后端
- 多AI模型集成 (OpenAI, Claude, Gemini等)
- 消息预处理
- 文件内容解析
- 对话上下文管理

### 3. 文件处理模块

#### 支持的文件类型
- **图片**: jpg, png, gif, webp
- **文档**: pdf, docx, xlsx, pptx, txt, md
- **代码**: js, ts, py, java, cpp等
- **音视频**: mp3, mp4, wav (需要转录)

#### 处理流程
1. 文件上传 → 2. 类型检测 → 3. 内容提取 → 4. 格式转换 → 5. 存储管理

## 技术栈

### 前端
- **框架**: Vue 3 + TypeScript
- **状态管理**: Pinia
- **路由**: Vue Router
- **UI组件**: Element Plus / Ant Design Vue
- **HTTP客户端**: Axios
- **文件上传**: vue-upload-component / 自定义组件
- **实时通信**: WebSocket / Server-Sent Events

### 后端
- **运行时**: Node.js
- **框架**: Express.js
- **文件上传**: Multer
- **文件处理**: 
  - 图片: Sharp
  - PDF: pdf-parse
  - Office文档: mammoth, xlsx
- **AI集成**: OpenAI SDK, Anthropic SDK等
- **数据库**: MongoDB / PostgreSQL
- **存储**: 本地文件系统 / AWS S3 / 阿里云OSS

## API设计

### 文件相关API

```typescript
// 上传文件
POST /api/files/upload
Content-Type: multipart/form-data
Response: { fileId: string, fileName: string, fileType: string, size: number }

// 获取文件信息
GET /api/files/:fileId
Response: { id: string, name: string, type: string, content?: string }

// 删除文件
DELETE /api/files/:fileId
Response: { success: boolean }

// 获取文件列表
GET /api/files
Response: { files: FileMetadata[] }
```

### 对话相关API

```typescript
// 发送消息
POST /api/chat/send
Body: { message: string, files?: string[], conversationId?: string }
Response: Stream or { response: string, conversationId: string }

// 获取对话历史
GET /api/chat/history/:conversationId
Response: { messages: Message[] }
```

## 关键实现细节

### 1. 文件上传组件 (Vue)

```vue
<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      :action="uploadUrl"
      :on-success="handleSuccess"
      :on-progress="handleProgress"
      :before-upload="beforeUpload"
      :file-list="fileList"
      drag
      multiple
    >
      <el-icon class="el-icon--upload"><upload-filled /></el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或 <em>点击上传</em>
      </div>
    </el-upload>
  </div>
</template>
```

### 2. 文件处理服务 (Node.js)

```javascript
class FileService {
  async processFile(file) {
    const { mimetype, originalname, buffer } = file;
    
    // 检测文件类型
    const fileType = this.detectFileType(mimetype);
    
    // 根据类型处理文件
    switch (fileType) {
      case 'image':
        return this.processImage(buffer);
      case 'document':
        return this.processDocument(buffer, originalname);
      case 'text':
        return this.processText(buffer);
      default:
        throw new Error('Unsupported file type');
    }
  }
}
```

### 3. AI对话集成

```typescript
class AIService {
  async sendMessage(message: string, files: FileMetadata[]) {
    // 处理文件内容
    const fileContents = await this.processFiles(files);
    
    // 构建AI请求
    const aiRequest = {
      messages: [
        {
          role: 'user',
          content: this.buildContent(message, fileContents)
        }
      ]
    };
    
    // 调用AI API
    return await this.callAI(aiRequest);
  }
}
```

## 部署方案

### 开发环境
```bash
# 前端
npm run dev  # Vue开发服务器 (localhost:5173)

# 后端
npm run dev  # Express开发服务器 (localhost:3000)
```

### 生产环境
- **前端**: 构建静态文件，部署到CDN或静态服务器
- **后端**: 部署到云服务器 (AWS, 阿里云等)
- **数据库**: 云数据库服务
- **文件存储**: 云存储服务

## 安全考虑

1. **文件验证**: 严格检查文件类型和大小
2. **权限控制**: 用户身份验证和文件访问权限
3. **内容过滤**: 恶意文件和内容检测
4. **数据加密**: 敏感数据传输和存储加密
5. **速率限制**: API调用频率限制

## 性能优化

1. **文件压缩**: 图片压缩、文档优化
2. **缓存策略**: 文件内容缓存、AI响应缓存
3. **分片上传**: 大文件分片处理
4. **CDN加速**: 静态资源CDN分发
5. **懒加载**: 组件和数据懒加载

## 扩展性设计

1. **插件系统**: 支持自定义文件处理器
2. **多AI支持**: 可配置多个AI提供商
3. **主题系统**: 可定制界面主题
4. **国际化**: 多语言支持
5. **API开放**: 提供开放API供第三方集成