import { Provider, Model, GenerateImageParams, FetchChatCompletionOptions } from '../../types'
import { ApiClient, RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from './types'

/**
 * Abstract base class for API clients.
 * Provides common functionality and structure for specific client implementations.
 */
export abstract class BaseApiClient implements ApiClient {
  public provider: Provider
  protected host: string
  protected apiKey: string

  constructor(provider: Provider) {
    this.provider = provider
    this.host = this.getBaseURL()
    this.apiKey = this.getApiKey()
  }

  /**
   * Get the client's compatibility type
   * Used to determine if the client supports specific features without instanceof checks
   */
  public getClientCompatibilityType(_model?: Model): string[] {
    return [this.constructor.name]
  }

  public getBaseURL(): string {
    return this.provider.apiHost
  }

  public getApiKey(): string {
    return this.provider.apiKey
  }

  // Abstract methods that must be implemented by subclasses
  abstract createCompletions(payload: any, options?: any): Promise<any>
  abstract getSdkInstance(): Promise<any> | any
  abstract getRequestTransformer(): RequestTransformer<any, any>
  abstract getResponseChunkTransformer(): ResponseChunkTransformer<any>
  abstract listModels(): Promise<any[]>

  // Optional methods
  async generateImage?(params: GenerateImageParams): Promise<string[]> {
    throw new Error('Image generation not supported by this client')
  }

  // Utility methods
  public createAbortController(messageId?: string): AbortController {
    const controller = new AbortController()
    return controller
  }

  /**
   * Get temperature parameter with bounds checking
   */
  protected getTemperature(temperature?: number, model?: Model): number | undefined {
    if (temperature === undefined) return undefined
    
    // Some providers have different temperature ranges
    if (this.provider.type === 'anthropic') {
      return Math.max(0, Math.min(1, temperature))
    }
    
    return Math.max(0, Math.min(2, temperature))
  }

  /**
   * Get max tokens parameter
   */
  protected getMaxTokens(maxTokens?: number, model?: Model): number | undefined {
    if (maxTokens === undefined) return undefined
    return Math.max(1, maxTokens)
  }

  /**
   * Get top-p parameter with bounds checking
   */
  protected getTopP(topP?: number, model?: Model): number | undefined {
    if (topP === undefined) return undefined
    return Math.max(0, Math.min(1, topP))
  }

  /**
   * Get timeout for requests
   */
  protected getTimeout(model?: Model): number {
    return 120000 // 2 minutes default
  }

  /**
   * Check if streaming is supported
   */
  protected isStreamingSupported(model?: Model): boolean {
    return true // Most providers support streaming
  }

  /**
   * Get default headers for requests
   */
  protected getDefaultHeaders(): Record<string, string> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    // Add extra headers from provider config
    if (this.provider.extra_headers) {
      Object.assign(headers, this.provider.extra_headers)
    }

    return headers
  }

  /**
   * Validate model compatibility with provider
   */
  protected validateModel(model: Model): void {
    if (model.provider !== this.provider.id && !this.isCompatibleModel(model)) {
      throw new Error(`Model ${model.id} is not compatible with provider ${this.provider.id}`)
    }
  }

  /**
   * Check if a model is compatible with this provider
   */
  protected isCompatibleModel(model: Model): boolean {
    return model.provider === this.provider.id
  }

  /**
   * Handle API errors
   */
  protected handleApiError(error: any): Error {
    if (error.response) {
      const status = error.response.status
      const message = error.response.data?.error?.message || error.message
      return new Error(`API Error ${status}: ${message}`)
    }
    
    if (error.message) {
      return new Error(`Client Error: ${error.message}`)
    }
    
    return new Error('Unknown error occurred')
  }
}