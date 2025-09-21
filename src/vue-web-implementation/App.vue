<template>
  <div id="app">
    <ChatContainer />
  </div>
</template>

<script setup lang="ts">
import ChatContainer from './components/ChatContainer.vue'
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Arial, sans-serif;
}

#app {
  height: 100vh;
  width: 100vw;
  overflow: hidden;
}

/* 全局滚动条样式 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
  transition: background 0.3s;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Element Plus 定制样式 */
.el-upload-dragger {
  border: 2px dashed #dcdfe6 !important;
  border-radius: 8px !important;
  transition: all 0.3s !important;
}

.el-upload-dragger.is-dragover {
  border-color: #409eff !important;
  background-color: #f0f9ff !important;
}

.el-input__wrapper {
  border-radius: 8px !important;
}

.el-button {
  border-radius: 6px !important;
}

.el-dialog {
  border-radius: 12px !important;
}

.el-card {
  border-radius: 8px !important;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1) !important;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .chat-container {
    height: 100vh;
  }
  
  .messages-container {
    padding: 12px;
  }
  
  .message-wrapper {
    max-width: 95%;
  }
  
  .input-area {
    padding: 12px;
  }
  
  .chat-header {
    padding: 12px 16px;
  }
  
  .chat-title h2 {
    font-size: 16px;
  }
  
  .chat-actions .el-button {
    padding: 8px 12px;
    font-size: 12px;
  }
}

@media (max-width: 480px) {
  .message-wrapper {
    max-width: 100%;
  }
  
  .file-attachment {
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  
  .input-actions {
    flex-direction: column;
    gap: 8px;
    align-items: stretch;
  }
  
  .input-meta {
    order: 1;
    justify-content: center;
  }
}

/* 暗色主题支持 */
@media (prefers-color-scheme: dark) {
  .chat-container {
    background-color: #1a1a1a;
    color: #ffffff;
  }
  
  .chat-header {
    background-color: #2d2d2d;
    border-bottom-color: #404040;
  }
  
  .message-wrapper.message-assistant .message-content {
    background-color: #2d2d2d;
    border-color: #404040;
    color: #ffffff;
  }
  
  .input-area {
    background-color: #2d2d2d;
    border-top-color: #404040;
  }
  
  .file-attachment {
    background-color: rgba(255, 255, 255, 0.1);
  }
  
  .file-attachment:hover {
    background-color: rgba(255, 255, 255, 0.15);
  }
}

/* 打印样式 */
@media print {
  .chat-header,
  .input-area {
    display: none !important;
  }
  
  .messages-container {
    overflow: visible !important;
    height: auto !important;
  }
  
  .message-actions {
    display: none !important;
  }
  
  .message-wrapper {
    break-inside: avoid;
    max-width: 100% !important;
  }
}

/* 动画效果 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}

.slide-up-enter-from {
  transform: translateY(20px);
  opacity: 0;
}

.slide-up-leave-to {
  transform: translateY(-20px);
  opacity: 0;
}

/* 无障碍支持 */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

/* 高对比度支持 */
@media (prefers-contrast: high) {
  .message-wrapper.message-assistant .message-content {
    border: 2px solid #000000;
  }
  
  .message-wrapper.message-user .message-content {
    border: 2px solid #ffffff;
  }
  
  .file-attachment {
    border: 1px solid currentColor;
  }
}

/* 减少动画支持 */
@media (prefers-reduced-motion: reduce) {
  * {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
  
  .typing-animation span {
    animation: none !important;
  }
  
  .streaming-content .cursor {
    animation: none !important;
  }
}
</style>