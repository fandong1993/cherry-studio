import { Model, ModelType, Provider } from '../types'

/**
 * Utility functions for working with models and providers
 */

/**
 * Check if a model is an LLM (text generation) model
 */
export function isLLMModel(model: Model): boolean {
  if (!model.capabilities) {
    return !model.type || model.type.includes('text')
  }
  
  return model.capabilities.some(cap => 
    cap.type === 'text' || 
    cap.type === 'reasoning' || 
    cap.type === 'function_calling'
  )
}

/**
 * Check if a model supports vision/image inputs
 */
export function isVisionModel(model: Model): boolean {
  if (!model.capabilities) {
    return model.type?.includes('vision') || false
  }
  
  return model.capabilities.some(cap => cap.type === 'vision')
}

/**
 * Check if a model is an embedding model
 */
export function isEmbeddingModel(model: Model): boolean {
  if (!model.capabilities) {
    return model.type?.includes('embedding') || false
  }
  
  return model.capabilities.some(cap => cap.type === 'embedding')
}

/**
 * Check if a model supports function calling
 */
export function isFunctionCallingModel(model: Model): boolean {
  if (!model.capabilities) {
    return model.type?.includes('function_calling') || false
  }
  
  return model.capabilities.some(cap => cap.type === 'function_calling')
}

/**
 * Check if a model is a reasoning model (like o1)
 */
export function isReasoningModel(model: Model): boolean {
  if (!model.capabilities) {
    return model.type?.includes('reasoning') || false
  }
  
  return model.capabilities.some(cap => cap.type === 'reasoning')
}

/**
 * Get the primary model type
 */
export function getPrimaryModelType(model: Model): ModelType {
  if (model.capabilities && model.capabilities.length > 0) {
    return model.capabilities[0].type
  }
  
  if (model.type && model.type.length > 0) {
    return model.type[0]
  }
  
  return 'text'
}

/**
 * Filter models by type
 */
export function filterModelsByType(models: Model[], type: ModelType): Model[] {
  return models.filter(model => {
    if (model.capabilities) {
      return model.capabilities.some(cap => cap.type === type)
    }
    
    return model.type?.includes(type) || false
  })
}

/**
 * Filter models by provider
 */
export function filterModelsByProvider(models: Model[], providerId: string): Model[] {
  return models.filter(model => model.provider === providerId)
}

/**
 * Create a basic provider configuration
 */
export function createProvider(config: {
  id: string
  type: Provider['type']
  name: string
  apiKey: string
  apiHost: string
  apiVersion?: string
}): Provider {
  return {
    id: config.id,
    type: config.type,
    name: config.name,
    apiKey: config.apiKey,
    apiHost: config.apiHost,
    apiVersion: config.apiVersion,
    enabled: true,
    models: []
  }
}

/**
 * Create a basic model configuration
 */
export function createModel(config: {
  id: string
  provider: string
  name: string
  group?: string
  capabilities?: ModelType[]
}): Model {
  return {
    id: config.id,
    provider: config.provider,
    name: config.name,
    group: config.group || 'default',
    capabilities: config.capabilities?.map(type => ({ type })) || [{ type: 'text' }]
  }
}

/**
 * Validate provider configuration
 */
export function validateProvider(provider: Provider): { isValid: boolean; errors: string[] } {
  const errors: string[] = []
  
  if (!provider.id) {
    errors.push('Provider ID is required')
  }
  
  if (!provider.type) {
    errors.push('Provider type is required')
  }
  
  if (!provider.name) {
    errors.push('Provider name is required')
  }
  
  if (!provider.apiKey) {
    errors.push('API key is required')
  }
  
  if (!provider.apiHost) {
    errors.push('API host is required')
  }
  
  return {
    isValid: errors.length === 0,
    errors
  }
}

/**
 * Get model cost estimate (if pricing info is available)
 */
export function estimateModelCost(
  model: Model, 
  inputTokens: number, 
  outputTokens: number
): number | null {
  if (!model.pricing) {
    return null
  }
  
  const inputCost = (inputTokens / 1000000) * model.pricing.input_per_million_tokens
  const outputCost = (outputTokens / 1000000) * model.pricing.output_per_million_tokens
  
  return inputCost + outputCost
}