<template>
  <div class="file-uploader">
    <el-upload
      ref="uploadRef"
      class="upload-area"
      :action="uploadUrl"
      :headers="uploadHeaders"
      :data="uploadData"
      :on-success="handleSuccess"
      :on-error="handleError"
      :on-progress="handleProgress"
      :before-upload="beforeUpload"
      :file-list="displayFileList"
      :auto-upload="true"
      :multiple="multiple"
      :accept="accept"
      drag
    >
      <el-icon class="el-icon--upload">
        <upload-filled />
      </el-icon>
      <div class="el-upload__text">
        拖拽文件到此处或 <em>点击上传</em>
      </div>
      <template #tip>
        <div class="el-upload__tip">
          支持 {{ supportedTypes.join(', ') }} 格式，单个文件不超过 {{ maxSizeMB }}MB
        </div>
      </template>
    </el-upload>

    <!-- 文件列表 -->
    <div v-if="files.length > 0" class="file-list">
      <div
        v-for="file in files"
        :key="file.id"
        class="file-item"
        :class="{
          'file-uploading': file.status === 'uploading',
          'file-success': file.status === 'success',
          'file-error': file.status === 'failed'
        }"
      >
        <div class="file-info">
          <el-icon class="file-icon">
            <document v-if="file.type === 'document'" />
            <picture v-else-if="file.type === 'image'" />
            <video-play v-else-if="file.type === 'video'" />
            <microphone v-else-if="file.type === 'audio'" />
            <document v-else />
          </el-icon>
          <div class="file-details">
            <div class="file-name">{{ file.name }}</div>
            <div class="file-meta">
              {{ formatFileSize(file.size) }} • {{ formatTime(file.uploadTime) }}
            </div>
          </div>
        </div>

        <div class="file-actions">
          <!-- 上传进度 -->
          <el-progress
            v-if="file.status === 'uploading'"
            :percentage="getFileProgress(file.id)"
            :stroke-width="4"
            class="upload-progress"
          />
          
          <!-- 预览按钮 -->
          <el-button
            v-if="file.status === 'success' && canPreview(file)"
            size="small"
            type="primary"
            link
            @click="previewFile(file)"
          >
            预览
          </el-button>
          
          <!-- 删除按钮 -->
          <el-button
            size="small"
            type="danger"
            link
            @click="removeFile(file.id)"
          >
            删除
          </el-button>
        </div>
      </div>
    </div>

    <!-- 文件预览对话框 -->
    <el-dialog
      v-model="previewVisible"
      :title="previewFile?.name"
      width="80%"
      class="file-preview-dialog"
    >
      <div v-if="previewFile" class="file-preview">
        <!-- 图片预览 -->
        <img
          v-if="previewFile.type === 'image'"
          :src="previewFile.preview || previewFile.url"
          alt="预览图片"
          class="preview-image"
        />
        
        <!-- 文本预览 -->
        <pre
          v-else-if="previewFile.content"
          class="preview-text"
        >{{ previewFile.content }}</pre>
        
        <!-- 其他类型 -->
        <div v-else class="preview-placeholder">
          <el-icon><document /></el-icon>
          <p>暂不支持此文件类型的预览</p>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, defineEmits, defineProps } from 'vue'
import { ElMessage } from 'element-plus'
import {
  UploadFilled,
  Document,
  Picture,
  VideoPlay,
  Microphone
} from '@element-plus/icons-vue'
import type { UploadFile, UploadProgressEvent } from 'element-plus'
import { useFileStore } from '@/stores/fileStore'
import { formatFileSize, formatTime, generateId } from '@/utils'
import type { FileMetadata, UploadProgress } from '@/types'

interface Props {
  multiple?: boolean
  accept?: string
  maxSize?: number // 字节
  supportedTypes?: string[]
}

const props = withDefaults(defineProps<Props>(), {
  multiple: true,
  accept: '.jpg,.jpeg,.png,.gif,.pdf,.docx,.xlsx,.txt,.md',
  maxSize: 50 * 1024 * 1024, // 50MB
  supportedTypes: () => ['图片', '文档', 'PDF', 'Word', 'Excel', '文本']
})

const emit = defineEmits<{
  'file-uploaded': [file: FileMetadata]
  'file-removed': [fileId: string]
  'files-changed': [files: FileMetadata[]]
}>()

const fileStore = useFileStore()
const uploadRef = ref()
const previewVisible = ref(false)
const previewFile = ref<FileMetadata | null>(null)

// 计算属性
const files = computed(() => fileStore.files)
const uploadProgress = computed(() => fileStore.uploadProgress)
const maxSizeMB = computed(() => Math.round(props.maxSize / 1024 / 1024))
const uploadUrl = computed(() => `${import.meta.env.VITE_API_BASE_URL}/api/files/upload`)
const uploadHeaders = computed(() => ({
  'Authorization': `Bearer ${localStorage.getItem('token') || ''}`
}))
const uploadData = computed(() => ({}))

const displayFileList = computed(() => 
  files.value.map(file => ({
    name: file.name,
    uid: file.id,
    status: file.status === 'success' ? 'success' : 
           file.status === 'failed' ? 'error' : 'uploading'
  }))
)

// 方法
const beforeUpload = (file: File): boolean => {
  // 检查文件大小
  if (file.size > props.maxSize) {
    ElMessage.error(`文件大小不能超过 ${maxSizeMB.value}MB`)
    return false
  }

  // 检查文件类型
  const allowedTypes = props.accept.split(',').map(type => type.trim())
  const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase()
  
  if (!allowedTypes.includes(fileExtension)) {
    ElMessage.error(`不支持的文件类型: ${fileExtension}`)
    return false
  }

  // 创建文件元数据
  const fileMetadata: FileMetadata = {
    id: generateId(),
    name: file.name,
    originalName: file.name,
    size: file.size,
    type: getFileType(file.type),
    mimeType: file.type,
    uploadTime: new Date(),
    status: 'uploading'
  }

  // 添加到store
  fileStore.addFile(fileMetadata)
  
  return true
}

const handleProgress = (event: UploadProgressEvent, file: UploadFile) => {
  const fileMetadata = files.value.find(f => f.name === file.name)
  if (fileMetadata) {
    fileStore.updateUploadProgress({
      fileId: fileMetadata.id,
      progress: Math.round(event.percent || 0),
      status: 'uploading'
    })
  }
}

const handleSuccess = (response: any, file: UploadFile) => {
  const fileMetadata = files.value.find(f => f.name === file.name)
  if (fileMetadata) {
    const updatedFile: FileMetadata = {
      ...fileMetadata,
      id: response.fileId || fileMetadata.id,
      url: response.url,
      status: 'success',
      content: response.content,
      preview: response.preview
    }
    
    fileStore.updateFile(updatedFile)
    emit('file-uploaded', updatedFile)
    emit('files-changed', files.value)
    
    ElMessage.success('文件上传成功')
  }
}

const handleError = (error: any, file: UploadFile) => {
  const fileMetadata = files.value.find(f => f.name === file.name)
  if (fileMetadata) {
    fileStore.updateFile({
      ...fileMetadata,
      status: 'failed'
    })
    
    fileStore.updateUploadProgress({
      fileId: fileMetadata.id,
      progress: 0,
      status: 'error',
      error: error.message || '上传失败'
    })
  }
  
  ElMessage.error('文件上传失败: ' + (error.message || '未知错误'))
}

const removeFile = (fileId: string) => {
  fileStore.removeFile(fileId)
  emit('file-removed', fileId)
  emit('files-changed', files.value)
}

const getFileProgress = (fileId: string): number => {
  const progress = uploadProgress.value.find(p => p.fileId === fileId)
  return progress?.progress || 0
}

const canPreview = (file: FileMetadata): boolean => {
  return file.type === 'image' || !!file.content
}

const previewFile = (file: FileMetadata) => {
  previewFile.value = file
  previewVisible.value = true
}

const getFileType = (mimeType: string): string => {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType.startsWith('video/')) return 'video'
  if (mimeType.startsWith('audio/')) return 'audio'
  if (mimeType.includes('pdf')) return 'document'
  if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
    return 'document'
  }
  if (mimeType.startsWith('text/')) return 'text'
  return 'document'
}

// 暴露方法给父组件
defineExpose({
  clearFiles: () => fileStore.clearFiles(),
  getFiles: () => files.value
})
</script>

<style scoped>
.file-uploader {
  width: 100%;
}

.upload-area {
  width: 100%;
}

.upload-area :deep(.el-upload-dragger) {
  width: 100%;
  height: 120px;
  border: 2px dashed #d9d9d9;
  border-radius: 6px;
  background-color: #fafafa;
  transition: all 0.3s;
}

.upload-area :deep(.el-upload-dragger:hover) {
  border-color: #409eff;
  background-color: #f0f9ff;
}

.file-list {
  margin-top: 16px;
  space-y: 8px;
}

.file-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  background-color: #fff;
  transition: all 0.3s;
}

.file-item:hover {
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
}

.file-item.file-uploading {
  border-color: #e6a23c;
}

.file-item.file-success {
  border-color: #67c23a;
}

.file-item.file-error {
  border-color: #f56c6c;
}

.file-info {
  display: flex;
  align-items: center;
  flex: 1;
}

.file-icon {
  margin-right: 12px;
  font-size: 24px;
  color: #909399;
}

.file-details {
  flex: 1;
}

.file-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.file-meta {
  font-size: 12px;
  color: #909399;
}

.file-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.upload-progress {
  width: 100px;
}

.file-preview-dialog :deep(.el-dialog__body) {
  padding: 20px;
}

.file-preview {
  text-align: center;
}

.preview-image {
  max-width: 100%;
  max-height: 500px;
  border-radius: 6px;
}

.preview-text {
  text-align: left;
  background-color: #f5f5f5;
  padding: 16px;
  border-radius: 6px;
  max-height: 500px;
  overflow-y: auto;
  white-space: pre-wrap;
  word-break: break-word;
}

.preview-placeholder {
  padding: 40px;
  color: #909399;
}

.preview-placeholder .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
}
</style>