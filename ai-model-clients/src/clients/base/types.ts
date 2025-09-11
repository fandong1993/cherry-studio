import { Provider, Model, GenerateImageParams, Message, FetchChatCompletionOptions } from '../../types'

/**
 * Request transformer interface for converting internal parameters to SDK-specific format
 */
export interface RequestTransformer<TSdkParams, TMessageParam> {
  transformRequest(params: CompletionParams): Promise<TSdkParams>
  transformMessages(messages: Message[]): TMessageParam[]
}

/**
 * Response chunk transformer interface for processing streaming responses
 */
export interface ResponseChunkTransformer<TRawChunk> {
  transformChunk(chunk: TRawChunk): ChunkData
}

/**
 * Generic completion parameters
 */
export interface CompletionParams {
  messages: Message[]
  model: Model
  temperature?: number
  maxTokens?: number
  topP?: number
  stream?: boolean
  tools?: any[]
  stop?: string[]
  options?: FetchChatCompletionOptions
}

/**
 * Processed chunk data
 */
export interface ChunkData {
  type: 'text' | 'function_call' | 'error' | 'done'
  content?: string
  functionCall?: {
    name: string
    arguments: string
  }
  usage?: {
    promptTokens?: number
    completionTokens?: number
    totalTokens?: number
  }
  error?: string
}

/**
 * API client interface for different providers
 */
export interface ApiClient {
  provider: Provider

  // Core methods
  createCompletions(payload: any): Promise<any>
  generateImage?(params: GenerateImageParams): Promise<string[]>
  listModels(): Promise<any[]>

  // SDK related methods
  getSdkInstance(): Promise<any> | any
  getBaseURL(): string
  getApiKey(): string

  // Transformers
  getRequestTransformer(): RequestTransformer<any, any>
  getResponseChunkTransformer(): ResponseChunkTransformer<any>

  // Utility methods
  getClientCompatibilityType(model?: Model): string[]
  createAbortController(messageId?: string): AbortController
}