import OpenAI from 'openai'
import { Stream } from 'openai/streaming'
import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, GenerateImageParams, Message } from '../../../types'

/**
 * OpenAI API client implementation
 */
export class OpenAIAPIClient extends BaseApiClient {
  private openaiClient?: OpenAI

  constructor(provider: Provider) {
    super(provider)
  }

  async getSdkInstance(): Promise<OpenAI> {
    if (!this.openaiClient) {
      this.openaiClient = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.host,
        timeout: this.getTimeout(),
        defaultHeaders: this.getDefaultHeaders()
      })
    }
    return this.openaiClient
  }

  async createCompletions(payload: any): Promise<any> {
    const sdk = await this.getSdkInstance()
    
    try {
      return await sdk.chat.completions.create(payload)
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async generateImage(params: GenerateImageParams): Promise<string[]> {
    const sdk = await this.getSdkInstance()
    
    try {
      const response = await sdk.images.generate({
        model: params.model,
        prompt: params.prompt,
        n: params.batchSize,
        size: params.imageSize as any,
        quality: params.quality as any,
        response_format: 'url'
      })
      
      return response.data?.map(img => img.url || '') || []
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async listModels(): Promise<any[]> {
    const sdk = await this.getSdkInstance()
    
    try {
      const response = await sdk.models.list()
      return response.data
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  getRequestTransformer(): RequestTransformer<any, any> {
    return new OpenAIRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<any> {
    return new OpenAIResponseChunkTransformer()
  }

  protected isCompatibleModel(model: Model): boolean {
    return model.provider === this.provider.id || 
           model.endpoint_type === 'openai' ||
           model.supported_endpoint_types?.includes('openai') || false
  }
}

/**
 * OpenAI request transformer
 */
class OpenAIRequestTransformer implements RequestTransformer<any, any> {
  async transformRequest(params: CompletionParams): Promise<any> {
    const { messages, model, temperature, maxTokens, topP, stream, tools, stop } = params

    const openaiParams: any = {
      model: model.id,
      messages: this.transformMessages(messages),
      stream: stream || false
    }

    if (temperature !== undefined) {
      openaiParams.temperature = Math.max(0, Math.min(2, temperature))
    }

    if (maxTokens !== undefined) {
      openaiParams.max_tokens = maxTokens
    }

    if (topP !== undefined) {
      openaiParams.top_p = Math.max(0, Math.min(1, topP))
    }

    if (tools && tools.length > 0) {
      openaiParams.tools = tools
      openaiParams.tool_choice = 'auto'
    }

    if (stop && stop.length > 0) {
      openaiParams.stop = stop
    }

    return openaiParams
  }

  transformMessages(messages: Message[]): any[] {
    return messages.map(msg => {
      const openaiMessage: any = {
        role: msg.role,
        content: msg.content
      }

      // Handle images if present
      if (msg.images && msg.images.length > 0) {
        openaiMessage.content = [
          { type: 'text', text: msg.content },
          ...msg.images.map(imageUrl => ({
            type: 'image_url',
            image_url: { url: imageUrl }
          }))
        ]
      }

      return openaiMessage
    })
  }
}

/**
 * OpenAI response chunk transformer
 */
class OpenAIResponseChunkTransformer implements ResponseChunkTransformer<any> {
  transformChunk(chunk: any): ChunkData {
    // Handle non-streaming response
    if ('choices' in chunk && chunk.choices && !('delta' in chunk.choices[0])) {
      return {
        type: 'text',
        content: chunk.choices[0]?.message?.content || '',
        usage: chunk.usage ? {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens
        } : undefined
      }
    }

    // Handle streaming response
    const choice = chunk.choices?.[0]
    
    if (!choice) {
      return { type: 'done' }
    }

    const delta = choice.delta

    if (delta?.content) {
      return {
        type: 'text',
        content: delta.content
      }
    }

    if (delta?.tool_calls && delta.tool_calls.length > 0) {
      const toolCall = delta.tool_calls[0]
      return {
        type: 'function_call',
        functionCall: {
          name: toolCall.function?.name || '',
          arguments: toolCall.function?.arguments || ''
        }
      }
    }

    if (choice.finish_reason) {
      return {
        type: 'done',
        usage: chunk.usage ? {
          promptTokens: chunk.usage.prompt_tokens,
          completionTokens: chunk.usage.completion_tokens,
          totalTokens: chunk.usage.total_tokens
        } : undefined
      }
    }

    return { type: 'text', content: '' }
  }
}