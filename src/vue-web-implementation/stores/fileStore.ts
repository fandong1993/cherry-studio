import { defineStore } from 'pinia'
import type { FileMetadata, UploadProgress } from '@/types'

interface FileState {
  files: FileMetadata[]
  uploadProgress: UploadProgress[]
  maxFileSize: number
  allowedTypes: string[]
}

export const useFileStore = defineStore('file', {
  state: (): FileState => ({
    files: [],
    uploadProgress: [],
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/markdown'
    ]
  }),

  getters: {
    getFileById: (state) => (id: string) => {
      return state.files.find(file => file.id === id)
    },

    getFilesByType: (state) => (type: string) => {
      return state.files.filter(file => file.type === type)
    },

    getUploadingFiles: (state) => {
      return state.files.filter(file => file.status === 'uploading')
    },

    getSuccessFiles: (state) => {
      return state.files.filter(file => file.status === 'success')
    },

    getTotalSize: (state) => {
      return state.files.reduce((total, file) => total + file.size, 0)
    },

    getProgressByFileId: (state) => (fileId: string) => {
      return state.uploadProgress.find(p => p.fileId === fileId)
    }
  },

  actions: {
    addFile(file: FileMetadata) {
      // 检查文件是否已存在
      const existingIndex = this.files.findIndex(f => f.id === file.id)
      if (existingIndex > -1) {
        this.files[existingIndex] = file
      } else {
        this.files.push(file)
      }
    },

    updateFile(file: FileMetadata) {
      const index = this.files.findIndex(f => f.id === file.id)
      if (index > -1) {
        this.files[index] = file
      }
    },

    removeFile(fileId: string) {
      // 移除文件
      const fileIndex = this.files.findIndex(f => f.id === fileId)
      if (fileIndex > -1) {
        this.files.splice(fileIndex, 1)
      }

      // 移除上传进度
      const progressIndex = this.uploadProgress.findIndex(p => p.fileId === fileId)
      if (progressIndex > -1) {
        this.uploadProgress.splice(progressIndex, 1)
      }
    },

    clearFiles() {
      this.files = []
      this.uploadProgress = []
    },

    updateUploadProgress(progress: UploadProgress) {
      const index = this.uploadProgress.findIndex(p => p.fileId === progress.fileId)
      if (index > -1) {
        this.uploadProgress[index] = progress
      } else {
        this.uploadProgress.push(progress)
      }
    },

    removeUploadProgress(fileId: string) {
      const index = this.uploadProgress.findIndex(p => p.fileId === fileId)
      if (index > -1) {
        this.uploadProgress.splice(index, 1)
      }
    },

    // 验证文件
    validateFile(file: File): { valid: boolean; error?: string } {
      // 检查文件大小
      if (file.size > this.maxFileSize) {
        return {
          valid: false,
          error: `文件大小不能超过 ${Math.round(this.maxFileSize / 1024 / 1024)}MB`
        }
      }

      // 检查文件类型
      if (!this.allowedTypes.includes(file.type)) {
        return {
          valid: false,
          error: `不支持的文件类型: ${file.type}`
        }
      }

      return { valid: true }
    },

    // 获取文件预览信息
    async getFilePreview(file: FileMetadata): Promise<string | null> {
      if (file.type === 'image' && file.url) {
        return file.url
      }

      if (file.content) {
        return file.content
      }

      return null
    },

    // 批量上传文件
    async uploadFiles(files: File[]): Promise<FileMetadata[]> {
      const uploadedFiles: FileMetadata[] = []

      for (const file of files) {
        const validation = this.validateFile(file)
        if (!validation.valid) {
          throw new Error(validation.error)
        }

        try {
          const uploadedFile = await this.uploadSingleFile(file)
          uploadedFiles.push(uploadedFile)
        } catch (error) {
          console.error('文件上传失败:', error)
          throw error
        }
      }

      return uploadedFiles
    },

    // 单个文件上传
    async uploadSingleFile(file: File): Promise<FileMetadata> {
      const fileId = this.generateFileId()
      
      // 创建文件元数据
      const fileMetadata: FileMetadata = {
        id: fileId,
        name: file.name,
        originalName: file.name,
        size: file.size,
        type: this.getFileType(file.type),
        mimeType: file.type,
        uploadTime: new Date(),
        status: 'uploading'
      }

      // 添加文件和进度
      this.addFile(fileMetadata)
      this.updateUploadProgress({
        fileId,
        progress: 0,
        status: 'uploading'
      })

      try {
        // 创建FormData
        const formData = new FormData()
        formData.append('file', file)
        formData.append('fileId', fileId)

        // 上传文件
        const response = await fetch('/api/files/upload', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
          },
          body: formData
        })

        if (!response.ok) {
          throw new Error(`上传失败: ${response.statusText}`)
        }

        const result = await response.json()

        // 更新文件信息
        const updatedFile: FileMetadata = {
          ...fileMetadata,
          id: result.fileId || fileId,
          url: result.url,
          status: 'success',
          content: result.content,
          preview: result.preview
        }

        this.updateFile(updatedFile)
        this.updateUploadProgress({
          fileId,
          progress: 100,
          status: 'completed'
        })

        return updatedFile
      } catch (error) {
        // 更新失败状态
        this.updateFile({
          ...fileMetadata,
          status: 'failed'
        })
        
        this.updateUploadProgress({
          fileId,
          progress: 0,
          status: 'error',
          error: error instanceof Error ? error.message : '上传失败'
        })

        throw error
      }
    },

    // 生成文件ID
    generateFileId(): string {
      return Date.now().toString(36) + Math.random().toString(36).substr(2)
    },

    // 获取文件类型
    getFileType(mimeType: string): string {
      if (mimeType.startsWith('image/')) return 'image'
      if (mimeType.startsWith('video/')) return 'video'
      if (mimeType.startsWith('audio/')) return 'audio'
      if (mimeType.includes('pdf')) return 'document'
      if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
        return 'document'
      }
      if (mimeType.startsWith('text/')) return 'text'
      return 'document'
    },

    // 格式化文件大小
    formatFileSize(size: number): string {
      if (size < 1024) return size + ' B'
      if (size < 1024 * 1024) return (size / 1024).toFixed(1) + ' KB'
      if (size < 1024 * 1024 * 1024) return (size / 1024 / 1024).toFixed(1) + ' MB'
      return (size / 1024 / 1024 / 1024).toFixed(1) + ' GB'
    }
  },

  persist: {
    key: 'ai-chat-files',
    storage: localStorage,
    paths: ['files'] // 只持久化文件列表，不持久化上传进度
  }
})