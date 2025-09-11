import OpenAI from 'openai'
import { Stream } from 'openai/streaming'
import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, GenerateImageParams, Message } from '../../../types'
import {
  OpenAISdkParams,
  OpenAISdkRawOutput,
  OpenAISdkRawChunk,
  OpenAISdkMessageParam,
  SdkModel,
  RequestOptions
} from '../../../types/sdk'

/**
 * OpenAI API client implementation
 */
export class OpenAIAPIClient extends BaseApiClient<
  OpenAI,
  OpenAISdkParams,
  OpenAISdkRawOutput,
  OpenAISdkRawChunk,
  OpenAISdkMessageParam
> {
  constructor(provider: Provider) {
    super(provider)
  }

  async getSdkInstance(): Promise<OpenAI> {
    if (!this.sdkInstance) {
      this.sdkInstance = new OpenAI({
        apiKey: this.apiKey,
        baseURL: this.host,
        timeout: this.getTimeout(),
        defaultHeaders: this.getDefaultHeaders()
      })
    }
    return this.sdkInstance
  }

  async createCompletions(payload: OpenAISdkParams, options?: RequestOptions): Promise<OpenAISdkRawOutput> {
    const sdk = await this.getSdkInstance()
    
    try {
      if (payload.stream === true) {
        // Type assertion needed due to OpenAI SDK type constraints
        const streamPayload = { ...payload, stream: true as const }
        return sdk.chat.completions.create(streamPayload, options) as Promise<Stream<OpenAI.Chat.Completions.ChatCompletionChunk>>
      } else {
        // Type assertion for non-streaming
        const nonStreamPayload = { ...payload, stream: false as const }
        return sdk.chat.completions.create(nonStreamPayload, options) as Promise<OpenAI.ChatCompletion>
      }
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

  async listModels(): Promise<SdkModel[]> {
    const sdk = await this.getSdkInstance()
    
    try {
      const response = await sdk.models.list()
      return response.data
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  getRequestTransformer(): RequestTransformer<OpenAISdkParams, OpenAISdkMessageParam> {
    return new OpenAIRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<OpenAISdkRawChunk> {
    return new OpenAIResponseChunkTransformer()
  }

  protected isCompatibleModel(model: Model): boolean {
    // OpenAI client can handle OpenAI models and OpenAI-compatible models
    return model.provider === this.provider.id || 
           model.endpoint_type === 'openai' ||
           model.supported_endpoint_types?.includes('openai') || false
  }
}

/**
 * OpenAI request transformer
 */
class OpenAIRequestTransformer implements RequestTransformer<OpenAISdkParams, OpenAISdkMessageParam> {
  async transformRequest(params: CompletionParams): Promise<OpenAISdkParams> {
    const { messages, model, temperature, maxTokens, topP, stream, tools, stop } = params

    const openaiParams: OpenAISdkParams = {
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

  transformMessages(messages: Message[]): OpenAISdkMessageParam[] {
    return messages.map(msg => {
      const openaiMessage: OpenAISdkMessageParam = {
        role: msg.role as any,
        content: msg.content
      }

      // Handle images if present
      if (msg.images && msg.images.length > 0) {
        openaiMessage.content = [
          { type: 'text', text: msg.content },
          ...msg.images.map(imageUrl => ({
            type: 'image_url' as const,
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
class OpenAIResponseChunkTransformer implements ResponseChunkTransformer<OpenAISdkRawChunk> {
  transformChunk(chunk: OpenAISdkRawChunk): ChunkData {
    // Handle non-streaming response
    if ('choices' in chunk && !('delta' in chunk.choices[0])) {
      const completion = chunk as OpenAI.ChatCompletion
      return {
        type: 'text',
        content: completion.choices[0]?.message?.content || '',
        usage: completion.usage ? {
          promptTokens: completion.usage.prompt_tokens,
          completionTokens: completion.usage.completion_tokens,
          totalTokens: completion.usage.total_tokens
        } : undefined
      }
    }

    // Handle streaming response
    const streamChunk = chunk as OpenAI.Chat.Completions.ChatCompletionChunk
    const choice = streamChunk.choices[0]
    
    if (!choice) {
      return { type: 'done' }
    }

    const delta = choice.delta

    if (delta.content) {
      return {
        type: 'text',
        content: delta.content
      }
    }

    if (delta.tool_calls && delta.tool_calls.length > 0) {
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
        usage: streamChunk.usage ? {
          promptTokens: streamChunk.usage.prompt_tokens,
          completionTokens: streamChunk.usage.completion_tokens,
          totalTokens: streamChunk.usage.total_tokens
        } : undefined
      }
    }

    return { type: 'text', content: '' }
  }
}