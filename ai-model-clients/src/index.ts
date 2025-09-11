// Main exports for the AI Model Clients library
export * from './types'
export * from './clients/base/BaseApiClient'
export * from './clients/base/types'
export * from './clients/factory/ApiClientFactory'
export * from './clients/providers/openai/OpenAIAPIClient'
export * from './clients/providers/anthropic/AnthropicAPIClient'
export * from './clients/providers/gemini/GeminiAPIClient'
export * from './clients/providers/aws/AwsBedrockAPIClient'
export * from './utils/modelUtils'

// Convenience exports
export { ApiClientFactory as ClientFactory } from './clients/factory/ApiClientFactory'
export { BaseApiClient as BaseClient } from './clients/base/BaseApiClient'

// Type re-exports for convenience
export type {
  Provider,
  Model,
  Message,
  Usage,
  GenerateImageParams,
  GenerateImageResponse,
  FetchChatCompletionOptions
} from './types'

export type {
  ApiClient,
  CompletionParams,
  ChunkData,
  RequestTransformer,
  ResponseChunkTransformer
} from './clients/base/types'