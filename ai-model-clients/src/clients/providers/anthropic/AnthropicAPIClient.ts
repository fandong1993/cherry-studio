import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, Message as InternalMessage } from '../../../types'

/**
 * Anthropic (Claude) API client implementation
 */
export class AnthropicAPIClient extends BaseApiClient {
  constructor(provider: Provider) {
    super(provider)
  }

  async getSdkInstance(): Promise<any> {
    // For now, we'll use a simple fetch-based approach
    return {
      baseURL: this.host,
      apiKey: this.apiKey,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01',
        ...this.getDefaultHeaders()
      }
    }
  }

  async createCompletions(payload: any): Promise<any> {
    const sdk = await this.getSdkInstance()
    
    try {
      const response = await fetch(`${sdk.baseURL}/messages`, {
        method: 'POST',
        headers: sdk.headers,
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return response.json()
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async listModels(): Promise<any[]> {
    // Anthropic doesn't provide a models endpoint, return static list
    return [
      { id: 'claude-3-5-sonnet-20241022', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-5-haiku-20241022', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-opus-20240229', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-sonnet-20240229', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'claude-3-haiku-20240307', object: 'model', created: 0, owned_by: 'anthropic' }
    ]
  }

  getRequestTransformer(): RequestTransformer<any, any> {
    return new AnthropicRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<any> {
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
class AnthropicRequestTransformer implements RequestTransformer<any, any> {
  async transformRequest(params: CompletionParams): Promise<any> {
    const { messages, model, temperature, maxTokens, topP, stream, tools } = params

    // Separate system messages from user/assistant messages
    const systemMessages = messages.filter(msg => msg.role === 'system')
    const conversationMessages = messages.filter(msg => msg.role !== 'system')

    const anthropicParams: any = {
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

  transformMessages(messages: InternalMessage[]): any[] {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content
    }))
  }
}

/**
 * Anthropic response chunk transformer
 */
class AnthropicResponseChunkTransformer implements ResponseChunkTransformer<any> {
  transformChunk(chunk: any): ChunkData {
    // Handle basic response structure
    if (chunk.content && Array.isArray(chunk.content)) {
      const textContent = chunk.content.find((c: any) => c.type === 'text')
      return {
        type: 'text',
        content: textContent?.text || '',
        usage: chunk.usage ? {
          promptTokens: chunk.usage.input_tokens,
          completionTokens: chunk.usage.output_tokens,
          totalTokens: chunk.usage.input_tokens + chunk.usage.output_tokens
        } : undefined
      }
    }

    return { type: 'text', content: '' }
  }
}