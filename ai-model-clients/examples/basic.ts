import { ApiClientFactory, createProvider, createModel } from '../src/index'

/**
 * Basic example showing how to use the AI Model Clients library
 */
async function basicExample() {
  console.log('=== AI Model Clients - Basic Example ===\n')

  // Create provider configurations
  const openaiProvider = createProvider({
    id: 'openai',
    type: 'openai',
    name: 'OpenAI',
    apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
    apiHost: 'https://api.openai.com/v1'
  })

  const anthropicProvider = createProvider({
    id: 'anthropic',
    type: 'anthropic',
    name: 'Anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-api-key',
    apiHost: 'https://api.anthropic.com'
  })

  // Create model configurations
  const gpt4Model = createModel({
    id: 'gpt-4',
    provider: 'openai',
    name: 'GPT-4',
    capabilities: ['text', 'vision', 'function_calling']
  })

  const claudeModel = createModel({
    id: 'claude-3-5-sonnet-20241022',
    provider: 'anthropic',
    name: 'Claude 3.5 Sonnet',
    capabilities: ['text', 'vision', 'function_calling']
  })

  // Create API clients
  const openaiClient = ApiClientFactory.create(openaiProvider)
  const anthropicClient = ApiClientFactory.create(anthropicProvider)

  console.log('Created clients for:')
  console.log(`- ${openaiProvider.name} (${openaiClient.constructor.name})`)
  console.log(`- ${anthropicProvider.name} (${anthropicClient.constructor.name})`)
  console.log()

  // List supported providers
  console.log('Supported provider types:', ApiClientFactory.getSupportedProviderTypes())
  console.log('Supported provider IDs:', ApiClientFactory.getSupportedProviderIds())
  console.log()

  // Example completion request
  const messages = [
    { id: '1', role: 'user' as const, content: 'Hello, how are you?' }
  ]

  console.log('Example usage:')
  console.log('```typescript')
  console.log('const client = ApiClientFactory.create(provider)')
  console.log('const transformer = client.getRequestTransformer()')
  console.log('const params = await transformer.transformRequest({')
  console.log('  messages,')
  console.log('  model: gpt4Model,')
  console.log('  temperature: 0.7,')
  console.log('  maxTokens: 150')
  console.log('})')
  console.log('const response = await client.createCompletions(params)')
  console.log('```')
}

// Run the example if this file is executed directly
if (require.main === module) {
  basicExample().catch(console.error)
}

export { basicExample }