// Core types for AI model integration
export type ProviderType =
  | 'openai'
  | 'openai-response'
  | 'anthropic'
  | 'gemini'
  | 'azure-openai'
  | 'vertexai'
  | 'mistral'
  | 'aws-bedrock'
  | 'vertex-anthropic'

export type ModelType = 'text' | 'vision' | 'embedding' | 'reasoning' | 'function_calling' | 'web_search' | 'rerank'

export type EndpointType = 'openai' | 'openai-response' | 'anthropic' | 'gemini' | 'image-generation' | 'jina-rerank'

export interface Provider {
  id: string
  type: ProviderType
  name: string
  apiKey: string
  apiHost: string
  apiVersion?: string
  models?: Model[]
  enabled?: boolean
  isSystem?: boolean
  isAuthed?: boolean
  rateLimit?: number
  apiOptions?: ProviderApiOptions
  serviceTier?: ServiceTier
  authType?: 'apiKey' | 'oauth'
  isVertex?: boolean
  notes?: string
  extra_headers?: Record<string, string>
}

export interface ProviderApiOptions {
  isNotSupportArrayContent?: boolean
  isNotSupportStreamOptions?: boolean
  isSupportDeveloperRole?: boolean
  isSupportServiceTier?: boolean
  isNotSupportEnableThinking?: boolean
}

export interface Model {
  id: string
  provider: string
  name: string
  group: string
  owned_by?: string
  description?: string
  capabilities?: ModelCapability[]
  type?: ModelType[]
  pricing?: ModelPricing
  endpoint_type?: EndpointType
  supported_endpoint_types?: EndpointType[]
  supported_text_delta?: boolean
}

export interface ModelCapability {
  type: ModelType
  isUserSelected?: boolean
}

export interface ModelPricing {
  input_per_million_tokens: number
  output_per_million_tokens: number
  currencySymbol?: string
}

export interface Usage {
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  thoughts_tokens?: number
  cost?: number
}

export interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  reasoning_content?: string
  files?: FileMetadata[]
  images?: string[]
  usage?: Usage
  error?: Record<string, any>
  metadata?: Record<string, any>
}

export interface FileMetadata {
  id: string
  name: string
  type: string
  size: number
  path?: string
  url?: string
}

export interface GenerateImageParams {
  model: string
  prompt: string
  negativePrompt?: string
  imageSize: string
  batchSize: number
  seed?: string
  numInferenceSteps?: number
  guidanceScale?: number
  signal?: AbortSignal
  promptEnhancement?: boolean
  quality?: string
}

export interface GenerateImageResponse {
  type: 'url' | 'base64'
  images: string[]
}

// Service tier types
export const OpenAIServiceTiers = {
  auto: 'auto',
  default: 'default',
  flex: 'flex',
  priority: 'priority'
} as const

export type OpenAIServiceTier = keyof typeof OpenAIServiceTiers

export const GroqServiceTiers = {
  auto: 'auto',
  on_demand: 'on_demand',
  flex: 'flex',
  performance: 'performance'
} as const

export type GroqServiceTier = keyof typeof GroqServiceTiers

export type ServiceTier = OpenAIServiceTier | GroqServiceTier

export function isOpenAIServiceTier(tier: string): tier is OpenAIServiceTier {
  return tier in OpenAIServiceTiers
}

export function isGroqServiceTier(tier: string): tier is GroqServiceTier {
  return tier in GroqServiceTiers
}

// System provider IDs
export const SystemProviderIds = {
  cherryin: 'cherryin',
  silicon: 'silicon',
  aihubmix: 'aihubmix',
  deepseek: 'deepseek',
  ppio: 'ppio',
  openrouter: 'openrouter',
  ollama: 'ollama',
  'new-api': 'new-api',
  lmstudio: 'lmstudio',
  anthropic: 'anthropic',
  openai: 'openai',
  'azure-openai': 'azure-openai',
  gemini: 'gemini',
  vertexai: 'vertexai',
  github: 'github',
  copilot: 'copilot',
  zhipu: 'zhipu',
  yi: 'yi',
  moonshot: 'moonshot',
  baichuan: 'baichuan',
  dashscope: 'dashscope',
  stepfun: 'stepfun',
  doubao: 'doubao',
  infini: 'infini',
  minimax: 'minimax',
  groq: 'groq',
  together: 'together',
  fireworks: 'fireworks',
  nvidia: 'nvidia',
  grok: 'grok',
  hyperbolic: 'hyperbolic',
  mistral: 'mistral',
  jina: 'jina',
  perplexity: 'perplexity',
  modelscope: 'modelscope',
  hunyuan: 'hunyuan',
  'aws-bedrock': 'aws-bedrock'
} as const

export type SystemProviderId = keyof typeof SystemProviderIds

export const isSystemProviderId = (id: string): id is SystemProviderId => {
  return id in SystemProviderIds
}

// Request options for API calls
export interface FetchChatCompletionOptions {
  signal?: AbortSignal
  timeout?: number
  headers?: Record<string, string>
}