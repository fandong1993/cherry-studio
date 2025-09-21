// 文件类型定义
export interface FileMetadata {
  id: string
  name: string
  originalName: string
  size: number
  type: string
  mimeType: string
  url?: string
  uploadTime: Date
  status: 'uploading' | 'success' | 'failed' | 'processing'
  content?: string // 文件内容（文本类型）
  preview?: string // 预览URL或base64
}

export interface ChatMessage {
  id: string
  content: string
  role: 'user' | 'assistant'
  timestamp: Date
  files?: FileMetadata[]
  streaming?: boolean
}

export interface Conversation {
  id: string
  title: string
  messages: ChatMessage[]
  createdAt: Date
  updatedAt: Date
}

export interface UploadProgress {
  fileId: string
  progress: number
  status: 'uploading' | 'processing' | 'completed' | 'error'
  error?: string
}

export interface AIProvider {
  id: string
  name: string
  apiKey?: string
  baseUrl?: string
  models: string[]
}

export interface ChatConfig {
  provider: string
  model: string
  temperature: number
  maxTokens: number
  systemPrompt?: string
}