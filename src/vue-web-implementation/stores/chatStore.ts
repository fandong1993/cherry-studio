import { defineStore } from 'pinia'
import type { ChatMessage, Conversation } from '@/types'
import { generateId } from '@/utils'

interface ChatState {
  conversations: Conversation[]
  currentConversationId: string | null
  isLoading: boolean
}

export const useChatStore = defineStore('chat', {
  state: (): ChatState => ({
    conversations: [],
    currentConversationId: null,
    isLoading: false
  }),

  getters: {
    currentConversation: (state) => {
      return state.conversations.find(c => c.id === state.currentConversationId)
    },

    conversationCount: (state) => state.conversations.length,

    getConversationById: (state) => (id: string) => {
      return state.conversations.find(c => c.id === id)
    },

    getMessageById: (state) => (messageId: string) => {
      for (const conversation of state.conversations) {
        const message = conversation.messages.find(m => m.id === messageId)
        if (message) return message
      }
      return null
    }
  },

  actions: {
    /**
     * 创建新对话
     */
    createConversation(title?: string): Conversation {
      const conversation: Conversation = {
        id: generateId(),
        title: title || '新对话',
        messages: [],
        createdAt: new Date(),
        updatedAt: new Date()
      }

      this.conversations.unshift(conversation)
      this.currentConversationId = conversation.id

      return conversation
    },

    /**
     * 切换当前对话
     */
    switchConversation(conversationId: string) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        this.currentConversationId = conversationId
      }
    },

    /**
     * 删除对话
     */
    deleteConversation(conversationId: string) {
      const index = this.conversations.findIndex(c => c.id === conversationId)
      if (index > -1) {
        this.conversations.splice(index, 1)
        
        // 如果删除的是当前对话，切换到其他对话或创建新对话
        if (this.currentConversationId === conversationId) {
          if (this.conversations.length > 0) {
            this.currentConversationId = this.conversations[0].id
          } else {
            this.createConversation()
          }
        }
      }
    },

    /**
     * 更新对话标题
     */
    updateConversationTitle(conversationId: string, title: string) {
      const conversation = this.conversations.find(c => c.id === conversationId)
      if (conversation) {
        conversation.title = title
        conversation.updatedAt = new Date()
      }
    },

    /**
     * 添加消息
     */
    addMessage(message: ChatMessage) {
      const conversation = this.currentConversation
      if (!conversation) {
        this.createConversation()
        return this.addMessage(message)
      }

      conversation.messages.push(message)
      conversation.updatedAt = new Date()

      // 如果是第一条用户消息，使用消息内容作为对话标题
      if (conversation.messages.length === 1 && message.role === 'user') {
        const title = message.content.slice(0, 50)
        this.updateConversationTitle(conversation.id, title)
      }
    },

    /**
     * 更新消息
     */
    updateMessage(messageId: string, updates: Partial<ChatMessage>) {
      const conversation = this.currentConversation
      if (!conversation) return

      const messageIndex = conversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex > -1) {
        conversation.messages[messageIndex] = {
          ...conversation.messages[messageIndex],
          ...updates
        }
        conversation.updatedAt = new Date()
      }
    },

    /**
     * 删除消息
     */
    removeMessage(messageId: string) {
      const conversation = this.currentConversation
      if (!conversation) return

      const messageIndex = conversation.messages.findIndex(m => m.id === messageId)
      if (messageIndex > -1) {
        conversation.messages.splice(messageIndex, 1)
        conversation.updatedAt = new Date()
      }
    },

    /**
     * 清空当前对话
     */
    clearCurrentConversation() {
      const conversation = this.currentConversation
      if (conversation) {
        conversation.messages = []
        conversation.updatedAt = new Date()
      }
    },

    /**
     * 清空所有对话
     */
    clearAllConversations() {
      this.conversations = []
      this.currentConversationId = null
      this.createConversation()
    },

    /**
     * 设置加载状态
     */
    setLoading(loading: boolean) {
      this.isLoading = loading
    },

    /**
     * 批量导入对话
     */
    importConversations(conversations: Conversation[]) {
      // 验证数据格式
      const validConversations = conversations.filter(c => 
        c.id && c.title && Array.isArray(c.messages)
      )

      this.conversations = validConversations
      
      if (validConversations.length > 0) {
        this.currentConversationId = validConversations[0].id
      } else {
        this.createConversation()
      }
    },

    /**
     * 导出所有对话
     */
    exportConversations(): Conversation[] {
      return JSON.parse(JSON.stringify(this.conversations))
    },

    /**
     * 搜索消息
     */
    searchMessages(query: string): Array<{
      conversation: Conversation
      message: ChatMessage
      index: number
    }> {
      const results: Array<{
        conversation: Conversation
        message: ChatMessage
        index: number
      }> = []

      const lowerQuery = query.toLowerCase()

      for (const conversation of this.conversations) {
        conversation.messages.forEach((message, index) => {
          if (message.content.toLowerCase().includes(lowerQuery)) {
            results.push({
              conversation,
              message,
              index
            })
          }
        })
      }

      return results
    },

    /**
     * 获取对话统计信息
     */
    getStatistics() {
      const totalMessages = this.conversations.reduce(
        (sum, conv) => sum + conv.messages.length, 
        0
      )
      
      const totalUserMessages = this.conversations.reduce(
        (sum, conv) => sum + conv.messages.filter(m => m.role === 'user').length,
        0
      )

      const totalAssistantMessages = this.conversations.reduce(
        (sum, conv) => sum + conv.messages.filter(m => m.role === 'assistant').length,
        0
      )

      const totalFiles = this.conversations.reduce(
        (sum, conv) => sum + conv.messages.reduce(
          (fileSum, msg) => fileSum + (msg.files?.length || 0),
          0
        ),
        0
      )

      return {
        totalConversations: this.conversations.length,
        totalMessages,
        totalUserMessages,
        totalAssistantMessages,
        totalFiles
      }
    }
  },

  persist: {
    key: 'ai-chat-conversations',
    storage: localStorage,
    paths: ['conversations', 'currentConversationId']
  }
})