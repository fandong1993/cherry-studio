const express = require('express');
const OpenAI = require('openai');
const Anthropic = require('@anthropic-ai/sdk');

const router = express.Router();

// AI服务配置
const aiProviders = {
  openai: process.env.OPENAI_API_KEY ? new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
  }) : null,
  
  anthropic: process.env.ANTHROPIC_API_KEY ? new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY
  }) : null
};

// AI对话服务
class ChatService {
  static async sendMessage(provider, model, messages, files = []) {
    try {
      switch (provider) {
        case 'openai':
          return await this.sendOpenAIMessage(model, messages, files);
        case 'anthropic':
          return await this.sendAnthropicMessage(model, messages, files);
        default:
          throw new Error(`不支持的AI提供商: ${provider}`);
      }
    } catch (error) {
      console.error('AI对话失败:', error);
      throw error;
    }
  }

  static async sendOpenAIMessage(model, messages, files) {
    if (!aiProviders.openai) {
      throw new Error('OpenAI API未配置');
    }

    // 处理消息格式
    const formattedMessages = this.formatMessagesForOpenAI(messages, files);

    const response = await aiProviders.openai.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 4000
    });

    return {
      content: response.choices[0].message.content,
      usage: response.usage,
      model: response.model
    };
  }

  static async sendAnthropicMessage(model, messages, files) {
    if (!aiProviders.anthropic) {
      throw new Error('Anthropic API未配置');
    }

    // 处理消息格式
    const formattedMessages = this.formatMessagesForAnthropic(messages, files);

    const response = await aiProviders.anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      messages: formattedMessages,
      max_tokens: 4000
    });

    return {
      content: response.content[0].text,
      usage: response.usage,
      model: response.model
    };
  }

  static formatMessagesForOpenAI(messages, files) {
    return messages.map(message => {
      const content = [];
      
      // 添加文本内容
      if (message.content) {
        content.push({
          type: 'text',
          text: message.content
        });
      }

      // 添加文件内容
      if (message.files && message.files.length > 0) {
        message.files.forEach(file => {
          if (file.type === 'image' && file.url) {
            content.push({
              type: 'image_url',
              image_url: {
                url: file.url
              }
            });
          } else if (file.content) {
            content.push({
              type: 'text',
              text: `文件"${file.name}"的内容:\n${file.content}`
            });
          }
        });
      }

      return {
        role: message.role,
        content: content.length === 1 && content[0].type === 'text' 
          ? content[0].text 
          : content
      };
    });
  }

  static formatMessagesForAnthropic(messages, files) {
    return messages.map(message => {
      const content = [];
      
      // 添加文本内容
      if (message.content) {
        content.push({
          type: 'text',
          text: message.content
        });
      }

      // 添加文件内容（Anthropic主要支持文本）
      if (message.files && message.files.length > 0) {
        message.files.forEach(file => {
          if (file.content) {
            content.push({
              type: 'text',
              text: `文件"${file.name}"的内容:\n${file.content}`
            });
          }
        });
      }

      return {
        role: message.role,
        content
      };
    });
  }

  static async streamMessage(provider, model, messages, files, res) {
    try {
      switch (provider) {
        case 'openai':
          return await this.streamOpenAIMessage(model, messages, files, res);
        case 'anthropic':
          return await this.streamAnthropicMessage(model, messages, files, res);
        default:
          throw new Error(`不支持的AI提供商: ${provider}`);
      }
    } catch (error) {
      console.error('AI流式对话失败:', error);
      res.write(`data: {"error": "${error.message}"}\n\n`);
      res.end();
    }
  }

  static async streamOpenAIMessage(model, messages, files, res) {
    if (!aiProviders.openai) {
      throw new Error('OpenAI API未配置');
    }

    const formattedMessages = this.formatMessagesForOpenAI(messages, files);

    const stream = await aiProviders.openai.chat.completions.create({
      model: model || 'gpt-3.5-turbo',
      messages: formattedMessages,
      temperature: 0.7,
      max_tokens: 4000,
      stream: true
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) {
        res.write(`data: ${JSON.stringify({ content })}\n\n`);
      }
    }

    res.write(`data: {"done": true}\n\n`);
    res.end();
  }

  static async streamAnthropicMessage(model, messages, files, res) {
    if (!aiProviders.anthropic) {
      throw new Error('Anthropic API未配置');
    }

    const formattedMessages = this.formatMessagesForAnthropic(messages, files);

    const stream = await aiProviders.anthropic.messages.create({
      model: model || 'claude-3-sonnet-20240229',
      messages: formattedMessages,
      max_tokens: 4000,
      stream: true
    });

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': '*'
    });

    for await (const chunk of stream) {
      if (chunk.type === 'content_block_delta') {
        const content = chunk.delta.text;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    }

    res.write(`data: {"done": true}\n\n`);
    res.end();
  }
}

// 发送消息
router.post('/send', async (req, res) => {
  try {
    const { 
      message, 
      files = [], 
      provider = 'openai', 
      model, 
      conversationId,
      stream = false 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    // 构建消息历史
    const messages = [
      {
        role: 'user',
        content: message,
        files
      }
    ];

    if (stream) {
      // 流式响应
      await ChatService.streamMessage(provider, model, messages, files, res);
    } else {
      // 一次性响应
      const response = await ChatService.sendMessage(provider, model, messages, files);
      
      res.json({
        success: true,
        response: response.content,
        usage: response.usage,
        model: response.model,
        conversationId: conversationId || Date.now().toString()
      });
    }
  } catch (error) {
    console.error('发送消息失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || '发送消息失败' 
      });
    }
  }
});

// 流式对话
router.post('/stream', async (req, res) => {
  try {
    const { 
      message, 
      files = [], 
      provider = 'openai', 
      model,
      conversationId 
    } = req.body;

    if (!message) {
      return res.status(400).json({ error: '消息内容不能为空' });
    }

    const messages = [
      {
        role: 'user',
        content: message,
        files
      }
    ];

    await ChatService.streamMessage(provider, model, messages, files, res);
  } catch (error) {
    console.error('流式对话失败:', error);
    if (!res.headersSent) {
      res.status(500).json({ 
        error: error.message || '流式对话失败' 
      });
    }
  }
});

// 获取可用的AI模型
router.get('/models', (req, res) => {
  try {
    const models = {
      openai: aiProviders.openai ? [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-3.5-turbo',
        'gpt-3.5-turbo-16k'
      ] : [],
      anthropic: aiProviders.anthropic ? [
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307'
      ] : []
    };

    res.json({
      success: true,
      models
    });
  } catch (error) {
    console.error('获取模型列表失败:', error);
    res.status(500).json({ 
      error: error.message || '获取模型列表失败' 
    });
  }
});

// 检查AI服务状态
router.get('/status', (req, res) => {
  try {
    const status = {
      openai: !!aiProviders.openai,
      anthropic: !!aiProviders.anthropic
    };

    res.json({
      success: true,
      status
    });
  } catch (error) {
    console.error('检查AI服务状态失败:', error);
    res.status(500).json({ 
      error: error.message || '检查AI服务状态失败' 
    });
  }
});

module.exports = router;