import { Provider, Model, GenerateImageParams, Message, FetchChatCompletionOptions } from '../../types'
import {
  SdkInstance,
  SdkParams,
  SdkRawOutput,
  SdkRawChunk,
  SdkMessageParam,
  SdkToolCall,
  SdkTool,
  SdkModel,
  RequestOptions
} from '../../types/sdk'

/**
 * Request transformer interface for converting internal parameters to SDK-specific format
 */
export interface RequestTransformer<TSdkParams extends SdkParams, TMessageParam extends SdkMessageParam> {
  transformRequest(params: CompletionParams): Promise<TSdkParams>
  transformMessages(messages: Message[]): TMessageParam[]
}

/**
 * Response chunk transformer interface for processing streaming responses
 */
export interface ResponseChunkTransformer<TRawChunk extends SdkRawChunk> {
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
export interface ApiClient<
  TSdkInstance = any,
  TSdkParams extends SdkParams = SdkParams,
  TRawOutput extends SdkRawOutput = SdkRawOutput,
  TRawChunk extends SdkRawChunk = SdkRawChunk,
  TMessageParam extends SdkMessageParam = SdkMessageParam,
  TToolCall extends SdkToolCall = SdkToolCall,
  TSdkSpecificTool extends SdkTool = SdkTool
> {
  provider: Provider

  // Core methods
  createCompletions(payload: TSdkParams): Promise<TRawOutput>
  generateImage?(params: GenerateImageParams): Promise<string[]>
  listModels(): Promise<SdkModel[]>

  // SDK related methods
  getSdkInstance(): Promise<TSdkInstance> | TSdkInstance
  getBaseURL(): string
  getApiKey(): string

  // Transformers
  getRequestTransformer(): RequestTransformer<TSdkParams, TMessageParam>
  getResponseChunkTransformer(): ResponseChunkTransformer<TRawChunk>

  // Utility methods
  getClientCompatibilityType(model?: Model): string[]
  createAbortController(messageId?: string): AbortController
}