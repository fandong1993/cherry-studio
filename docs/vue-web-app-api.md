# Vue.js Web AI对话应用 - API接口文档

## 基础信息

- **基础URL**: `http://localhost:3000/api`
- **认证方式**: Bearer Token (可选)
- **数据格式**: JSON

## 文件上传 API

### 1. 上传单个文件

**POST** `/files/upload`

**Content-Type**: `multipart/form-data`

**请求参数**:
- `file` (File): 要上传的文件
- `fileId` (string, optional): 自定义文件ID

**响应示例**:
```json
{
  "success": true,
  "fileId": "abc123",
  "originalName": "document.pdf",
  "fileName": "abc123.pdf",
  "size": 1024000,
  "type": "document",
  "mimeType": "application/pdf",
  "url": "/uploads/abc123.pdf",
  "content": "文档内容...",
  "preview": "/uploads/abc123_thumb.jpg"
}
```

### 2. 批量上传文件

**POST** `/files/upload-multiple`

**Content-Type**: `multipart/form-data`

**请求参数**:
- `files` (File[]): 要上传的文件数组（最多10个）

**响应示例**:
```json
{
  "success": true,
  "files": [
    {
      "fileId": "abc123",
      "originalName": "document.pdf",
      // ... 其他文件信息
    },
    {
      "originalName": "image.jpg",
      "error": "文件处理失败"
    }
  ]
}
```

### 3. 获取文件信息

**GET** `/files/:fileId`

**响应示例**:
```json
{
  "fileId": "abc123",
  "fileName": "abc123.pdf",
  "size": 1024000,
  "mimeType": "application/pdf",
  "url": "/uploads/abc123.pdf",
  "uploadTime": "2024-01-01T00:00:00.000Z"
}
```

### 4. 删除文件

**DELETE** `/files/:fileId`

**响应示例**:
```json
{
  "success": true
}
```

### 5. 获取文件列表

**GET** `/files`

**响应示例**:
```json
{
  "success": true,
  "files": [
    {
      "fileId": "abc123",
      "fileName": "abc123.pdf",
      "size": 1024000,
      "mimeType": "application/pdf",
      "type": "document",
      "url": "/uploads/abc123.pdf",
      "uploadTime": "2024-01-01T00:00:00.000Z"
    }
  ]
}
```

## AI对话 API

### 1. 发送消息 (一次性响应)

**POST** `/chat/send`

**请求体**:
```json
{
  "message": "Hello, AI!",
  "files": [
    {
      "id": "abc123",
      "name": "document.pdf",
      "type": "document",
      "content": "文档内容..."
    }
  ],
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "conversationId": "conv123",
  "stream": false
}
```

**响应示例**:
```json
{
  "success": true,
  "response": "Hello! How can I help you?",
  "usage": {
    "prompt_tokens": 10,
    "completion_tokens": 5,
    "total_tokens": 15
  },
  "model": "gpt-3.5-turbo",
  "conversationId": "conv123"
}
```

### 2. 发送消息 (流式响应)

**POST** `/chat/stream`

**请求体**:
```json
{
  "message": "Hello, AI!",
  "files": [],
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "conversationId": "conv123"
}
```

**响应格式**: Server-Sent Events (SSE)

**响应示例**:
```
data: {"content": "Hello"}

data: {"content": "!"}

data: {"content": " How"}

data: {"content": " can"}

data: {"content": " I"}

data: {"content": " help"}

data: {"content": " you"}

data: {"content": "?"}

data: {"done": true}
```

### 3. 获取可用模型

**GET** `/chat/models`

**响应示例**:
```json
{
  "success": true,
  "models": {
    "openai": [
      "gpt-4",
      "gpt-4-turbo",
      "gpt-3.5-turbo"
    ],
    "anthropic": [
      "claude-3-opus-20240229",
      "claude-3-sonnet-20240229",
      "claude-3-haiku-20240307"
    ]
  }
}
```

### 4. 检查AI服务状态

**GET** `/chat/status`

**响应示例**:
```json
{
  "success": true,
  "status": {
    "openai": true,
    "anthropic": false
  }
}
```

## 健康检查 API

### 服务健康检查

**GET** `/health`

**响应示例**:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "version": "1.0.0"
}
```

## 错误响应格式

所有API在发生错误时都会返回以下格式的响应：

```json
{
  "error": "错误描述信息"
}
```

HTTP状态码说明：
- `200`: 成功
- `400`: 请求参数错误
- `401`: 未授权
- `404`: 资源不存在
- `413`: 文件过大
- `415`: 不支持的文件类型
- `500`: 服务器内部错误

## 文件类型支持

### 支持的文件格式

**图片文件**:
- JPEG (.jpg, .jpeg)
- PNG (.png)
- GIF (.gif)
- WebP (.webp)

**文档文件**:
- PDF (.pdf)
- Word文档 (.docx)
- Excel表格 (.xlsx)

**文本文件**:
- 纯文本 (.txt)
- Markdown (.md)

### 文件大小限制

- 单个文件最大: 50MB
- 批量上传最多: 10个文件

### 文件处理能力

1. **图片文件**: 自动生成缩略图
2. **PDF文件**: 提取文本内容
3. **Word文档**: 提取文本内容
4. **Excel表格**: 提取表格数据为文本
5. **文本文件**: 直接读取内容

## 认证机制

当前API支持可选的Bearer Token认证。在请求头中添加：

```
Authorization: Bearer your_token_here
```

如果未配置认证，可以省略此头部。

## 限制说明

1. **文件上传频率**: 建议每秒不超过5个请求
2. **AI对话频率**: 建议每分钟不超过60个请求
3. **并发连接**: 建议不超过10个并发连接
4. **内容审核**: 系统会自动过滤不当内容

## 示例代码

### JavaScript/TypeScript

```typescript
// 上传文件
const uploadFile = async (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  
  const response = await fetch('/api/files/upload', {
    method: 'POST',
    body: formData
  })
  
  return await response.json()
}

// 发送消息
const sendMessage = async (message: string, files: any[] = []) => {
  const response = await fetch('/api/chat/send', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      message,
      files,
      provider: 'openai',
      model: 'gpt-3.5-turbo'
    })
  })
  
  return await response.json()
}

// 流式对话
const streamChat = async (message: string, onMessage: (content: string) => void) => {
  const response = await fetch('/api/chat/stream', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ message })
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    const lines = chunk.split('\n')
    
    for (const line of lines) {
      if (line.startsWith('data: ')) {
        const data = JSON.parse(line.slice(6))
        if (data.content) {
          onMessage(data.content)
        }
      }
    }
  }
}
```

### Python

```python
import requests
import json

# 上传文件
def upload_file(file_path):
    with open(file_path, 'rb') as f:
        files = {'file': f}
        response = requests.post('http://localhost:3000/api/files/upload', files=files)
        return response.json()

# 发送消息
def send_message(message, files=None):
    data = {
        'message': message,
        'files': files or [],
        'provider': 'openai',
        'model': 'gpt-3.5-turbo'
    }
    response = requests.post(
        'http://localhost:3000/api/chat/send',
        headers={'Content-Type': 'application/json'},
        data=json.dumps(data)
    )
    return response.json()
```