<template>
  <div class="chat-container">
    <!-- 聊天头部 -->
    <div class="chat-header">
      <div class="chat-title">
        <h2>AI 对话助手</h2>
        <div class="chat-status">
          <el-tag :type="isConnected ? 'success' : 'danger'" size="small">
            {{ isConnected ? '已连接' : '未连接' }}
          </el-tag>
        </div>
      </div>
      
      <!-- 设置按钮 -->
      <div class="chat-actions">
        <el-button size="small" @click="showSettings = true">
          <el-icon><setting /></el-icon>
          设置
        </el-button>
        <el-button size="small" @click="clearChat">
          <el-icon><delete /></el-icon>
          清空
        </el-button>
      </div>
    </div>

    <!-- 消息列表 -->
    <div ref="messagesContainer" class="messages-container">
      <div
        v-for="message in messages"
        :key="message.id"
        class="message-wrapper"
        :class="{
          'message-user': message.role === 'user',
          'message-assistant': message.role === 'assistant'
        }"
      >
        <div class="message-avatar">
          <el-avatar :size="32">
            <el-icon v-if="message.role === 'user'">
              <user />
            </el-icon>
            <el-icon v-else>
              <robot />
            </el-icon>
          </el-avatar>
        </div>
        
        <div class="message-content">
          <div class="message-header">
            <span class="message-role">
              {{ message.role === 'user' ? '您' : 'AI助手' }}
            </span>
            <span class="message-time">
              {{ formatTime(message.timestamp) }}
            </span>
          </div>
          
          <!-- 文件附件 -->
          <div v-if="message.files && message.files.length > 0" class="message-files">
            <div
              v-for="file in message.files"
              :key="file.id"
              class="file-attachment"
              @click="previewFile(file)"
            >
              <el-icon class="file-icon">
                <document v-if="file.type === 'document'" />
                <picture v-else-if="file.type === 'image'" />
                <video-play v-else-if="file.type === 'video'" />
                <microphone v-else-if="file.type === 'audio'" />
                <document v-else />
              </el-icon>
              <span class="file-name">{{ file.name }}</span>
              <span class="file-size">{{ formatFileSize(file.size) }}</span>
            </div>
          </div>
          
          <!-- 消息文本 -->
          <div class="message-text">
            <div
              v-if="message.streaming && message.role === 'assistant'"
              class="streaming-content"
            >
              {{ message.content }}
              <span class="cursor">|</span>
            </div>
            <div v-else class="static-content">
              {{ message.content }}
            </div>
          </div>
          
          <!-- 消息操作 -->
          <div class="message-actions">
            <el-button size="small" text @click="copyMessage(message.content)">
              <el-icon><copy-document /></el-icon>
              复制
            </el-button>
            <el-button 
              v-if="message.role === 'assistant'" 
              size="small" 
              text 
              @click="regenerateResponse(message)"
            >
              <el-icon><refresh /></el-icon>
              重新生成
            </el-button>
          </div>
        </div>
      </div>
      
      <!-- 加载指示器 -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="message-wrapper message-assistant">
          <div class="message-avatar">
            <el-avatar :size="32">
              <el-icon><robot /></el-icon>
            </el-avatar>
          </div>
          <div class="message-content">
            <div class="typing-animation">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- 输入区域 -->
    <div class="input-area">
      <!-- 文件上传 -->
      <div class="upload-section">
        <FileUploader
          ref="fileUploader"
          :multiple="true"
          @file-uploaded="handleFileUploaded"
          @file-removed="handleFileRemoved"
          @files-changed="handleFilesChanged"
        />
      </div>
      
      <!-- 消息输入 -->
      <div class="input-section">
        <el-input
          v-model="inputMessage"
          type="textarea"
          :rows="3"
          placeholder="输入消息...支持拖拽文件上传"
          :disabled="isLoading"
          @keydown.ctrl.enter="sendMessage"
        />
        
        <div class="input-actions">
          <div class="input-meta">
            <span v-if="attachedFiles.length > 0" class="file-count">
              已添加 {{ attachedFiles.length }} 个文件
            </span>
            <span class="shortcut-hint">Ctrl + Enter 发送</span>
          </div>
          
          <el-button
            type="primary"
            :loading="isLoading"
            :disabled="!inputMessage.trim()"
            @click="sendMessage"
          >
            <el-icon><promotion /></el-icon>
            发送
          </el-button>
        </div>
      </div>
    </div>

    <!-- 设置对话框 -->
    <el-dialog v-model="showSettings" title="聊天设置" width="500px">
      <el-form label-width="100px">
        <el-form-item label="AI提供商">
          <el-select v-model="chatConfig.provider" @change="loadModels">
            <el-option label="OpenAI" value="openai" />
            <el-option label="Anthropic" value="anthropic" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="模型">
          <el-select v-model="chatConfig.model">
            <el-option
              v-for="model in availableModels"
              :key="model"
              :label="model"
              :value="model"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="温度">
          <el-slider
            v-model="chatConfig.temperature"
            :min="0"
            :max="2"
            :step="0.1"
            show-input
          />
        </el-form-item>
        
        <el-form-item label="最大令牌">
          <el-input-number
            v-model="chatConfig.maxTokens"
            :min="1"
            :max="8000"
            :step="100"
          />
        </el-form-item>
        
        <el-form-item label="系统提示">
          <el-input
            v-model="chatConfig.systemPrompt"
            type="textarea"
            :rows="3"
            placeholder="可选的系统提示词..."
          />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button type="primary" @click="saveSettings">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Setting,
  Delete,
  User,
  Robot,
  Document,
  Picture,
  VideoPlay,
  Microphone,
  CopyDocument,
  Refresh,
  Promotion
} from '@element-plus/icons-vue'
import FileUploader from './FileUploader.vue'
import { useChatStore } from '@/stores/chatStore'
import { useFileStore } from '@/stores/fileStore'
import { formatTime, formatFileSize, copyToClipboard, generateId } from '@/utils'
import type { ChatMessage, FileMetadata, ChatConfig } from '@/types'
import { chatService } from '@/services/chatService'

// Store
const chatStore = useChatStore()
const fileStore = useFileStore()

// Refs
const messagesContainer = ref<HTMLElement>()
const fileUploader = ref()
const inputMessage = ref('')
const isLoading = ref(false)
const showSettings = ref(false)
const attachedFiles = ref<FileMetadata[]>([])
const availableModels = ref<string[]>([])
const isConnected = ref(true)

// 聊天配置
const chatConfig = ref<ChatConfig>({
  provider: 'openai',
  model: 'gpt-3.5-turbo',
  temperature: 0.7,
  maxTokens: 4000,
  systemPrompt: ''
})

// 计算属性
const messages = computed(() => chatStore.currentConversation?.messages || [])

// 方法
const sendMessage = async () => {
  if (!inputMessage.value.trim() || isLoading.value) return

  const messageContent = inputMessage.value.trim()
  const files = [...attachedFiles.value]
  
  // 创建用户消息
  const userMessage: ChatMessage = {
    id: generateId(),
    content: messageContent,
    role: 'user',
    timestamp: new Date(),
    files: files.length > 0 ? files : undefined
  }

  // 添加用户消息
  chatStore.addMessage(userMessage)
  
  // 清空输入
  inputMessage.value = ''
  attachedFiles.value = []
  fileUploader.value?.clearFiles()
  
  // 滚动到底部
  await nextTick()
  scrollToBottom()
  
  // 发送到AI
  await sendToAI(messageContent, files)
}

const sendToAI = async (message: string, files: FileMetadata[]) => {
  isLoading.value = true
  
  try {
    // 创建AI消息（流式）
    const aiMessage: ChatMessage = {
      id: generateId(),
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      streaming: true
    }
    
    chatStore.addMessage(aiMessage)
    await nextTick()
    scrollToBottom()

    // 调用AI服务
    const response = await chatService.sendStreamMessage({
      message,
      files,
      provider: chatConfig.value.provider,
      model: chatConfig.value.model,
      onMessage: (content: string) => {
        // 更新消息内容
        chatStore.updateMessage(aiMessage.id, {
          content: aiMessage.content + content
        })
        scrollToBottom()
      },
      onComplete: () => {
        // 完成流式响应
        chatStore.updateMessage(aiMessage.id, {
          streaming: false
        })
        isLoading.value = false
      },
      onError: (error: string) => {
        chatStore.updateMessage(aiMessage.id, {
          content: `错误: ${error}`,
          streaming: false
        })
        isLoading.value = false
        ElMessage.error('AI响应失败: ' + error)
      }
    })
  } catch (error) {
    isLoading.value = false
    ElMessage.error('发送消息失败: ' + (error as Error).message)
  }
}

const copyMessage = async (content: string) => {
  try {
    await copyToClipboard(content)
    ElMessage.success('已复制到剪贴板')
  } catch (error) {
    ElMessage.error('复制失败')
  }
}

const regenerateResponse = async (message: ChatMessage) => {
  // 找到前一条用户消息
  const messages = chatStore.currentConversation?.messages || []
  const messageIndex = messages.findIndex(m => m.id === message.id)
  const previousUserMessage = messages[messageIndex - 1]
  
  if (previousUserMessage && previousUserMessage.role === 'user') {
    // 删除当前AI消息
    chatStore.removeMessage(message.id)
    
    // 重新发送
    await sendToAI(previousUserMessage.content, previousUserMessage.files || [])
  }
}

const clearChat = async () => {
  try {
    await ElMessageBox.confirm('确定要清空聊天记录吗？', '确认', {
      type: 'warning'
    })
    
    chatStore.clearCurrentConversation()
    attachedFiles.value = []
    fileUploader.value?.clearFiles()
    ElMessage.success('聊天记录已清空')
  } catch (error) {
    // 用户取消
  }
}

const handleFileUploaded = (file: FileMetadata) => {
  if (!attachedFiles.value.find(f => f.id === file.id)) {
    attachedFiles.value.push(file)
  }
}

const handleFileRemoved = (fileId: string) => {
  const index = attachedFiles.value.findIndex(f => f.id === fileId)
  if (index > -1) {
    attachedFiles.value.splice(index, 1)
  }
}

const handleFilesChanged = (files: FileMetadata[]) => {
  attachedFiles.value = [...files]
}

const previewFile = (file: FileMetadata) => {
  // 这里可以实现文件预览功能
  if (file.url) {
    window.open(file.url, '_blank')
  }
}

const scrollToBottom = () => {
  if (messagesContainer.value) {
    messagesContainer.value.scrollTop = messagesContainer.value.scrollHeight
  }
}

const loadModels = async () => {
  try {
    const models = await chatService.getModels()
    availableModels.value = models[chatConfig.value.provider] || []
    
    // 设置默认模型
    if (availableModels.value.length > 0 && !availableModels.value.includes(chatConfig.value.model)) {
      chatConfig.value.model = availableModels.value[0]
    }
  } catch (error) {
    ElMessage.error('加载模型列表失败')
  }
}

const saveSettings = () => {
  // 保存设置到本地存储
  localStorage.setItem('chatConfig', JSON.stringify(chatConfig.value))
  showSettings.value = false
  ElMessage.success('设置已保存')
}

const loadSettings = () => {
  const saved = localStorage.getItem('chatConfig')
  if (saved) {
    try {
      chatConfig.value = { ...chatConfig.value, ...JSON.parse(saved) }
    } catch (error) {
      console.error('加载设置失败:', error)
    }
  }
}

const checkAIStatus = async () => {
  try {
    const status = await chatService.getStatus()
    isConnected.value = status[chatConfig.value.provider] || false
  } catch (error) {
    isConnected.value = false
  }
}

// 生命周期
onMounted(async () => {
  loadSettings()
  await loadModels()
  await checkAIStatus()
  
  // 创建默认对话
  if (!chatStore.currentConversation) {
    chatStore.createConversation()
  }
})

// 监听配置变化
watch(() => chatConfig.value.provider, () => {
  loadModels()
  checkAIStatus()
})
</script>

<style scoped>
.chat-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f5f5f5;
}

.chat-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background-color: #fff;
  border-bottom: 1px solid #e4e7ed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.chat-title {
  display: flex;
  align-items: center;
  gap: 12px;
}

.chat-title h2 {
  margin: 0;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}

.chat-actions {
  display: flex;
  gap: 8px;
}

.messages-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  scroll-behavior: smooth;
}

.message-wrapper {
  display: flex;
  gap: 12px;
  margin-bottom: 20px;
  max-width: 80%;
}

.message-wrapper.message-user {
  margin-left: auto;
  flex-direction: row-reverse;
}

.message-wrapper.message-user .message-content {
  background-color: #409eff;
  color: #fff;
}

.message-wrapper.message-assistant .message-content {
  background-color: #fff;
  color: #303133;
  border: 1px solid #e4e7ed;
}

.message-avatar {
  flex-shrink: 0;
}

.message-content {
  flex: 1;
  padding: 12px 16px;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.message-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
  font-size: 12px;
  opacity: 0.8;
}

.message-files {
  margin-bottom: 12px;
}

.file-attachment {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background-color: rgba(0, 0, 0, 0.05);
  border-radius: 6px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: background-color 0.3s;
}

.file-attachment:hover {
  background-color: rgba(0, 0, 0, 0.1);
}

.file-icon {
  font-size: 16px;
}

.file-name {
  flex: 1;
  font-size: 14px;
  font-weight: 500;
}

.file-size {
  font-size: 12px;
  opacity: 0.7;
}

.message-text {
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.streaming-content .cursor {
  animation: blink 1s infinite;
  color: #409eff;
}

@keyframes blink {
  0%, 50% { opacity: 1; }
  51%, 100% { opacity: 0; }
}

.message-actions {
  margin-top: 12px;
  display: flex;
  gap: 8px;
}

.loading-indicator {
  margin-bottom: 20px;
}

.typing-animation {
  display: flex;
  gap: 4px;
  align-items: center;
}

.typing-animation span {
  width: 8px;
  height: 8px;
  background-color: #409eff;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-animation span:nth-child(1) { animation-delay: -0.32s; }
.typing-animation span:nth-child(2) { animation-delay: -0.16s; }

@keyframes typing {
  0%, 80%, 100% { transform: scale(0); }
  40% { transform: scale(1); }
}

.input-area {
  background-color: #fff;
  border-top: 1px solid #e4e7ed;
  padding: 20px;
}

.upload-section {
  margin-bottom: 16px;
}

.input-section {
  position: relative;
}

.input-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-top: 12px;
}

.input-meta {
  display: flex;
  gap: 16px;
  font-size: 12px;
  color: #909399;
}

.file-count {
  color: #409eff;
}

.shortcut-hint {
  opacity: 0.7;
}
</style>