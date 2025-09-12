import { Provider } from '../../types'
import { BaseApiClient } from '../base/BaseApiClient'
import { OpenAIAPIClient } from '../providers/openai/OpenAIAPIClient'
import { AnthropicAPIClient } from '../providers/anthropic/AnthropicAPIClient'
import { GeminiAPIClient } from '../providers/gemini/GeminiAPIClient'
import { AwsBedrockAPIClient } from '../providers/aws/AwsBedrockAPIClient'

/**
 * Factory for creating ApiClient instances based on provider configuration
 */
export class ApiClientFactory {
  /**
   * Create an ApiClient instance for the given provider
   */
  static create(provider: Provider): BaseApiClient {
    // Check for special provider IDs first
    switch (provider.id) {
      case 'openai':
      case 'openrouter':
      case 'together':
      case 'groq':
      case 'fireworks':
      case 'deepseek':
      case 'moonshot':
      case 'zhipu':
      case 'yi':
      case 'baichuan':
      case 'minimax':
      case 'stepfun':
      case 'doubao':
      case 'infini':
      case 'lmstudio':
      case 'ollama':
        return new OpenAIAPIClient(provider)
        
      case 'anthropic':
        return new AnthropicAPIClient(provider)
        
      case 'gemini':
      case 'vertexai':
        return new GeminiAPIClient(provider)
        
      case 'aws-bedrock':
        return new AwsBedrockAPIClient(provider)
    }

    // Then check standard provider types
    switch (provider.type) {
      case 'openai':
      case 'azure-openai':
        return new OpenAIAPIClient(provider)
        
      case 'anthropic':
      case 'vertex-anthropic':
        return new AnthropicAPIClient(provider)
        
      case 'gemini':
      case 'vertexai':
        return new GeminiAPIClient(provider)
        
      case 'aws-bedrock':
        return new AwsBedrockAPIClient(provider)
        
      default:
        // Default to OpenAI-compatible client for unknown providers
        console.warn(`Unknown provider type: ${provider.type}, using OpenAI-compatible client`)
        return new OpenAIAPIClient(provider)
    }
  }

  /**
   * Get list of supported provider types
   */
  static getSupportedProviderTypes(): string[] {
    return [
      'openai',
      'azure-openai',
      'anthropic',
      'vertex-anthropic',
      'gemini',
      'vertexai',
      'aws-bedrock'
    ]
  }

  /**
   * Get list of supported provider IDs
   */
  static getSupportedProviderIds(): string[] {
    return [
      'openai',
      'anthropic',
      'gemini',
      'vertexai',
      'aws-bedrock',
      'openrouter',
      'together',
      'groq',
      'fireworks',
      'deepseek',
      'moonshot',
      'zhipu',
      'yi',
      'baichuan',
      'minimax',
      'stepfun',
      'doubao',
      'infini',
      'lmstudio',
      'ollama'
    ]
  }

  /**
   * Check if a provider is supported
   */
  static isProviderSupported(provider: Provider): boolean {
    return (
      this.getSupportedProviderIds().includes(provider.id) ||
      this.getSupportedProviderTypes().includes(provider.type)
    )
  }
}