import type { ChatMessage, FileMetadata } from '@/types'

interface SendMessageParams {
  message: string
  files?: FileMetadata[]
  provider?: string
  model?: string
  conversationId?: string
}

interface StreamMessageParams extends SendMessageParams {
  onMessage: (content: string) => void
  onComplete: () => void
  onError: (error: string) => void
}

interface ChatResponse {
  response: string
  usage?: any
  model?: string
  conversationId: string
}

interface ModelsResponse {
  [provider: string]: string[]
}

interface StatusResponse {
  [provider: string]: boolean
}

class ChatService {
  private baseUrl: string

  constructor() {
    this.baseUrl = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
  }

  /**
   * 发送消息（一次性响应）
   */
  async sendMessage(params: SendMessageParams): Promise<ChatResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: params.message,
          files: params.files || [],
          provider: params.provider || 'openai',
          model: params.model,
          conversationId: params.conversationId,
          stream: false
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      return await response.json()
    } catch (error) {
      console.error('发送消息失败:', error)
      throw error
    }
  }

  /**
   * 发送消息（流式响应）
   */
  async sendStreamMessage(params: StreamMessageParams): Promise<void> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        },
        body: JSON.stringify({
          message: params.message,
          files: params.files || [],
          provider: params.provider || 'openai',
          model: params.model,
          conversationId: params.conversationId
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      // 处理流式响应
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('无法获取响应流')
      }

      try {
        while (true) {
          const { done, value } = await reader.read()
          
          if (done) {
            params.onComplete()
            break
          }

          // 解析SSE格式的数据
          const chunk = decoder.decode(value, { stream: true })
          const lines = chunk.split('\n')

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6).trim()
              
              if (data === '') continue
              
              try {
                const parsed = JSON.parse(data)
                
                if (parsed.error) {
                  params.onError(parsed.error)
                  return
                }
                
                if (parsed.content) {
                  params.onMessage(parsed.content)
                }
                
                if (parsed.done) {
                  params.onComplete()
                  return
                }
              } catch (parseError) {
                console.warn('解析SSE数据失败:', parseError, data)
              }
            }
          }
        }
      } finally {
        reader.releaseLock()
      }
    } catch (error) {
      console.error('流式消息发送失败:', error)
      params.onError(error instanceof Error ? error.message : '未知错误')
    }
  }

  /**
   * 获取可用模型列表
   */
  async getModels(): Promise<ModelsResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/models`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.models || {}
    } catch (error) {
      console.error('获取模型列表失败:', error)
      throw error
    }
  }

  /**
   * 检查AI服务状态
   */
  async getStatus(): Promise<StatusResponse> {
    try {
      const response = await fetch(`${this.baseUrl}/api/chat/status`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      return data.status || {}
    } catch (error) {
      console.error('检查AI服务状态失败:', error)
      throw error
    }
  }

  /**
   * 测试连接
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`)
      return response.ok
    } catch (error) {
      console.error('连接测试失败:', error)
      return false
    }
  }
}

export const chatService = new ChatService()
export default chatService