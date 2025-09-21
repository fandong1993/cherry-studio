const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const sharp = require('sharp');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const XLSX = require('xlsx');
const mime = require('mime-types');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// 配置multer存储
const storage = multer.diskStorage({
  destination: async (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads');
    try {
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (error) {
      cb(error);
    }
  },
  filename: (req, file, cb) => {
    const fileId = req.body.fileId || uuidv4();
    const ext = path.extname(file.originalname);
    cb(null, `${fileId}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain', 'text/markdown'
    ];

    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`不支持的文件类型: ${file.mimetype}`));
    }
  }
});

// 文件处理服务
class FileService {
  static async processFile(file) {
    const { filename, originalname, mimetype, path: filePath, size } = file;
    const fileId = path.parse(filename).name;
    
    let content = null;
    let preview = null;

    try {
      // 根据文件类型处理
      if (mimetype.startsWith('image/')) {
        preview = await this.processImage(filePath);
      } else if (mimetype === 'application/pdf') {
        content = await this.processPDF(filePath);
      } else if (mimetype.includes('word')) {
        content = await this.processWord(filePath);
      } else if (mimetype.includes('excel')) {
        content = await this.processExcel(filePath);
      } else if (mimetype.startsWith('text/')) {
        content = await this.processText(filePath);
      }

      return {
        fileId,
        originalName: originalname,
        fileName: filename,
        size,
        type: this.getFileType(mimetype),
        mimeType: mimetype,
        url: `/uploads/${filename}`,
        content,
        preview
      };
    } catch (error) {
      console.error('文件处理失败:', error);
      throw new Error(`文件处理失败: ${error.message}`);
    }
  }

  static async processImage(filePath) {
    try {
      // 生成缩略图
      const thumbnailPath = filePath.replace(/\.[^.]+$/, '_thumb.jpg');
      await sharp(filePath)
        .resize(300, 300, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80 })
        .toFile(thumbnailPath);
      
      return `/uploads/${path.basename(thumbnailPath)}`;
    } catch (error) {
      console.error('图片处理失败:', error);
      return null;
    }
  }

  static async processPDF(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } catch (error) {
      console.error('PDF处理失败:', error);
      return null;
    }
  }

  static async processWord(filePath) {
    try {
      const dataBuffer = await fs.readFile(filePath);
      const result = await mammoth.extractRawText({ buffer: dataBuffer });
      return result.value;
    } catch (error) {
      console.error('Word文档处理失败:', error);
      return null;
    }
  }

  static async processExcel(filePath) {
    try {
      const workbook = XLSX.readFile(filePath);
      let content = '';
      
      workbook.SheetNames.forEach(sheetName => {
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
        content += `=== ${sheetName} ===\n`;
        content += data.map(row => row.join('\t')).join('\n');
        content += '\n\n';
      });
      
      return content;
    } catch (error) {
      console.error('Excel处理失败:', error);
      return null;
    }
  }

  static async processText(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf-8');
      return content;
    } catch (error) {
      console.error('文本文件处理失败:', error);
      return null;
    }
  }

  static getFileType(mimeType) {
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.startsWith('video/')) return 'video';
    if (mimeType.startsWith('audio/')) return 'audio';
    if (mimeType.includes('pdf')) return 'document';
    if (mimeType.includes('word') || mimeType.includes('excel') || mimeType.includes('powerpoint')) {
      return 'document';
    }
    if (mimeType.startsWith('text/')) return 'text';
    return 'document';
  }
}

// 上传文件
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    // 处理文件
    const result = await FileService.processFile(req.file);
    
    res.json({
      success: true,
      ...result
    });
  } catch (error) {
    console.error('文件上传失败:', error);
    res.status(500).json({ 
      error: error.message || '文件上传失败' 
    });
  }
});

// 批量上传文件
router.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ error: '没有上传文件' });
    }

    const results = [];
    for (const file of req.files) {
      try {
        const result = await FileService.processFile(file);
        results.push(result);
      } catch (error) {
        console.error(`文件 ${file.originalname} 处理失败:`, error);
        results.push({
          originalName: file.originalname,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      files: results
    });
  } catch (error) {
    console.error('批量文件上传失败:', error);
    res.status(500).json({ 
      error: error.message || '批量文件上传失败' 
    });
  }
});

// 获取文件信息
router.get('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    // 在这里可以从数据库获取文件信息
    // 当前简化实现，直接返回文件路径
    const uploadDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const filePath = path.join(uploadDir, file);
    const stats = await fs.stat(filePath);
    const mimeType = mime.lookup(file) || 'application/octet-stream';

    res.json({
      fileId,
      fileName: file,
      size: stats.size,
      mimeType,
      url: `/uploads/${file}`,
      uploadTime: stats.birthtime
    });
  } catch (error) {
    console.error('获取文件信息失败:', error);
    res.status(500).json({ 
      error: error.message || '获取文件信息失败' 
    });
  }
});

// 删除文件
router.delete('/:fileId', async (req, res) => {
  try {
    const { fileId } = req.params;
    
    const uploadDir = path.join(__dirname, '../../uploads');
    const files = await fs.readdir(uploadDir);
    const file = files.find(f => f.startsWith(fileId));
    
    if (!file) {
      return res.status(404).json({ error: '文件不存在' });
    }

    const filePath = path.join(uploadDir, file);
    await fs.unlink(filePath);
    
    // 同时删除缩略图（如果存在）
    const thumbFile = file.replace(/\.[^.]+$/, '_thumb.jpg');
    const thumbPath = path.join(uploadDir, thumbFile);
    try {
      await fs.unlink(thumbPath);
    } catch (error) {
      // 缩略图不存在，忽略错误
    }

    res.json({ success: true });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ 
      error: error.message || '删除文件失败' 
    });
  }
});

// 获取文件列表
router.get('/', async (req, res) => {
  try {
    const uploadDir = path.join(__dirname, '../../uploads');
    
    try {
      const files = await fs.readdir(uploadDir);
      const fileList = [];

      for (const file of files) {
        // 跳过缩略图文件
        if (file.endsWith('_thumb.jpg')) continue;

        const filePath = path.join(uploadDir, file);
        const stats = await fs.stat(filePath);
        const mimeType = mime.lookup(file) || 'application/octet-stream';
        const fileId = path.parse(file).name;

        fileList.push({
          fileId,
          fileName: file,
          size: stats.size,
          mimeType,
          type: FileService.getFileType(mimeType),
          url: `/uploads/${file}`,
          uploadTime: stats.birthtime
        });
      }

      res.json({
        success: true,
        files: fileList
      });
    } catch (error) {
      // 目录不存在
      res.json({
        success: true,
        files: []
      });
    }
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ 
      error: error.message || '获取文件列表失败' 
    });
  }
});

module.exports = router;