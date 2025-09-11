import Anthropic from '@anthropic-ai/sdk'
import { Message, MessageParam, RawMessageStreamEvent } from '@anthropic-ai/sdk/resources'
import { Stream } from '@anthropic-ai/sdk/streaming'
import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, Message as InternalMessage } from '../../../types'
import {
  AnthropicSdkParams,
  AnthropicSdkRawOutput,
  AnthropicSdkRawChunk,
  AnthropicSdkMessageParam,
  SdkModel,
  RequestOptions
} from '../../../types/sdk'

/**
 * Anthropic (Claude) API client implementation
 */
export class AnthropicAPIClient extends BaseApiClient<
  Anthropic,
  AnthropicSdkParams,
  AnthropicSdkRawOutput,
  AnthropicSdkRawChunk,
  AnthropicSdkMessageParam
> {
  constructor(provider: Provider) {
    super(provider)
  }

  async getSdkInstance(): Promise<Anthropic> {
    if (!this.sdkInstance) {
      this.sdkInstance = new Anthropic({
        apiKey: this.apiKey,
        baseURL: this.host,
        timeout: this.getTimeout(),
        defaultHeaders: this.getDefaultHeaders()
      })
    }
    return this.sdkInstance
  }

  async createCompletions(payload: AnthropicSdkParams, options?: RequestOptions): Promise<AnthropicSdkRawOutput> {
    const sdk = await this.getSdkInstance()
    
    try {
      if (payload.stream === true) {
        const streamPayload = { ...payload, stream: true as const }
        return sdk.messages.create(streamPayload) as Promise<Stream<RawMessageStreamEvent>>
      } else {
        const nonStreamPayload = { ...payload, stream: false as const }
        return sdk.messages.create(nonStreamPayload) as Promise<Message>
      }
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async listModels(): Promise<SdkModel[]> {
    // Anthropic doesn't provide a models endpoint, return static list
    return [
      { id: 'claude-3-5-sonnet-20241022', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-5-haiku-20241022', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-opus-20240229', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-sonnet-20240229', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-haiku-20240307', object: 'model', created: 0, owned_by: 'anthropic' }
    ] as SdkModel[]
  }

  getRequestTransformer(): RequestTransformer<AnthropicSdkParams, AnthropicSdkMessageParam> {
    return new AnthropicRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<AnthropicSdkRawChunk> {
    return new AnthropicResponseChunkTransformer()
  }

  protected isCompatibleModel(model: Model): boolean {
    return model.provider === this.provider.id || 
           model.endpoint_type === 'anthropic' ||
           model.supported_endpoint_types?.includes('anthropic') || false
  }
}

/**
 * Anthropic request transformer
 */
class AnthropicRequestTransformer implements RequestTransformer<AnthropicSdkParams, AnthropicSdkMessageParam> {
  async transformRequest(params: CompletionParams): Promise<AnthropicSdkParams> {
    const { messages, model, temperature, maxTokens, topP, stream, tools } = params

    // Separate system messages from user/assistant messages
    const systemMessages = messages.filter(msg => msg.role === 'system')
    const conversationMessages = messages.filter(msg => msg.role !== 'system')

    const anthropicParams: AnthropicSdkParams = {
      model: model.id,
      messages: this.transformMessages(conversationMessages),
      max_tokens: maxTokens || 4096,
      stream: stream || false
    }

    // Add system message if present
    if (systemMessages.length > 0) {
      anthropicParams.system = systemMessages.map(msg => msg.content).join('\n')
    }

    if (temperature !== undefined) {
      anthropicParams.temperature = Math.max(0, Math.min(1, temperature))
    }

    if (topP !== undefined) {
      anthropicParams.top_p = Math.max(0, Math.min(1, topP))
    }

    if (tools && tools.length > 0) {
      anthropicParams.tools = tools
    }

    return anthropicParams
  }

  transformMessages(messages: InternalMessage[]): AnthropicSdkMessageParam[] {
    return messages.map(msg => {
      const anthropicMessage: AnthropicSdkMessageParam = {
        role: msg.role as 'user' | 'assistant',
        content: msg.content
      }

      // Handle images if present
      if (msg.images && msg.images.length > 0) {
        anthropicMessage.content = [
          { type: 'text', text: msg.content },
          ...msg.images.map(imageUrl => ({
            type: 'image' as const,
            source: {
              type: 'base64' as const,
              media_type: 'image/jpeg' as const,
              data: imageUrl.split(',')[1] || imageUrl // Extract base64 part
            }
          }))
        ]
      }

      return anthropicMessage
    })
  }
}

/**
 * Anthropic response chunk transformer
 */
class AnthropicResponseChunkTransformer implements ResponseChunkTransformer<AnthropicSdkRawChunk> {
  transformChunk(chunk: AnthropicSdkRawChunk): ChunkData {
    // Handle non-streaming response
    if ('content' in chunk && Array.isArray(chunk.content)) {
      const message = chunk as Message
      const textContent = message.content.find(c => c.type === 'text')
      
      return {
        type: 'text',
        content: textContent?.type === 'text' ? textContent.text : '',
        usage: message.usage ? {
          promptTokens: message.usage.input_tokens,
          completionTokens: message.usage.output_tokens,
          totalTokens: message.usage.input_tokens + message.usage.output_tokens
        } : undefined
      }
    }

    // Handle streaming response
    const streamEvent = chunk as RawMessageStreamEvent
    
    switch (streamEvent.type) {
      case 'content_block_delta':
        if ('delta' in streamEvent && streamEvent.delta && 'type' in streamEvent.delta && streamEvent.delta.type === 'text_delta') {
          return {
            type: 'text',
            content: 'text' in streamEvent.delta ? streamEvent.delta.text : ''
          }
        }
        break
        
      case 'content_block_start':
        if ('content_block' in streamEvent && streamEvent.content_block && 'type' in streamEvent.content_block && streamEvent.content_block.type === 'tool_use') {
          return {
            type: 'function_call',
            functionCall: {
              name: 'name' in streamEvent.content_block ? streamEvent.content_block.name : '',
              arguments: 'input' in streamEvent.content_block ? JSON.stringify(streamEvent.content_block.input) : '{}'
            }
          }
        }
        break
        
      case 'message_stop':
        return {
          type: 'done'
        }
        
      case 'error':
        return {
          type: 'error',
          error: 'error' in streamEvent && streamEvent.error ? streamEvent.error.message || 'Unknown error' : 'Unknown error'
        }
    }

    return { type: 'text', content: '' }
  }
}