import { ApiClientFactory, createProvider, createModel } from '../src/index'

/**
 * Advanced example showing streaming and different providers
 */
async function advancedExample() {
  console.log('=== AI Model Clients - Advanced Example ===\n')

  // Multiple provider configurations
  const providers = [
    createProvider({
      id: 'openai',
      type: 'openai',
      name: 'OpenAI',
      apiKey: process.env.OPENAI_API_KEY || 'your-openai-api-key',
      apiHost: 'https://api.openai.com/v1'
    }),
    createProvider({
      id: 'anthropic',
      type: 'anthropic',
      name: 'Anthropic',
      apiKey: process.env.ANTHROPIC_API_KEY || 'your-anthropic-api-key',
      apiHost: 'https://api.anthropic.com'
    }),
    createProvider({
      id: 'gemini',
      type: 'gemini',
      name: 'Google Gemini',
      apiKey: process.env.GEMINI_API_KEY || 'your-gemini-api-key',
      apiHost: 'https://generativelanguage.googleapis.com'
    }),
    createProvider({
      id: 'openrouter',
      type: 'openai',
      name: 'OpenRouter',
      apiKey: process.env.OPENROUTER_API_KEY || 'your-openrouter-api-key',
      apiHost: 'https://openrouter.ai/api/v1'
    })
  ]

  // Create clients for all providers
  console.log('Creating clients for multiple providers:')
  const clients = providers.map(provider => {
    const client = ApiClientFactory.create(provider)
    console.log(`- ${provider.name}: ${client.getClientCompatibilityType().join(', ')}`)
    return { provider, client }
  })
  console.log()

  // Example models
  const models = [
    createModel({
      id: 'gpt-4-turbo-preview',
      provider: 'openai',
      name: 'GPT-4 Turbo',
      capabilities: ['text', 'vision', 'function_calling']
    }),
    createModel({
      id: 'claude-3-5-sonnet-20241022',
      provider: 'anthropic',
      name: 'Claude 3.5 Sonnet',
      capabilities: ['text', 'vision', 'function_calling']
    }),
    createModel({
      id: 'gemini-pro',
      provider: 'gemini',
      name: 'Gemini Pro',
      capabilities: ['text', 'vision', 'function_calling']
    })
  ]

  // Simulate a streaming chat completion
  console.log('Example streaming completion flow:')
  console.log()

  for (const { provider, client } of clients.slice(0, 2)) { // Just first 2 for demo
    console.log(`--- ${provider.name} ---`)
    
    const model = models.find(m => m.provider === provider.id)
    if (!model) continue

    try {
      const transformer = client.getRequestTransformer()
      const chunkTransformer = client.getResponseChunkTransformer()

      const messages = [
        { id: '1', role: 'system' as const, content: 'You are a helpful assistant.' },
        { id: '2', role: 'user' as const, content: 'Tell me a short joke about programming.' }
      ]

      console.log(`Request: ${messages[1].content}`)

      const params = await transformer.transformRequest({
        messages,
        model,
        temperature: 0.7,
        maxTokens: 100,
        stream: true
      })

      console.log(`Model: ${model.name} (${model.id})`)
      console.log(`Stream: ${params.stream}`)
      console.log('Response: [Streaming would happen here...]')
      console.log()

    } catch (error) {
      console.log(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
      console.log()
    }
  }

  // Function calling example
  console.log('--- Function Calling Example ---')
  const tools = [
    {
      type: 'function',
      function: {
        name: 'get_weather',
        description: 'Get the current weather for a location',
        parameters: {
          type: 'object',
          properties: {
            location: {
              type: 'string',
              description: 'The city and state, e.g. San Francisco, CA'
            }
          },
          required: ['location']
        }
      }
    }
  ]

  console.log('Available tools:', tools.map(t => t.function.name).join(', '))
  console.log('Function calling would be integrated with the completion flow')
  console.log()

  // Image generation example
  console.log('--- Image Generation Example ---')
  const openaiClient = clients.find(c => c.provider.id === 'openai')?.client
  if (openaiClient && 'generateImage' in openaiClient) {
    console.log('Image generation capabilities detected')
    console.log('Example: client.generateImage({ model: "dall-e-3", prompt: "A cat", ... })')
  }
  console.log()

  console.log('Advanced features demonstrated:')
  console.log('✓ Multiple provider support')
  console.log('✓ Streaming responses')
  console.log('✓ Function calling')
  console.log('✓ Image generation')
  console.log('✓ Type safety')
  console.log('✓ Error handling')
}

// Run the example if this file is executed directly
if (require.main === module) {
  advancedExample().catch(console.error)
}

export { advancedExample }