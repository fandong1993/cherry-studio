import { ApiClientFactory, createProvider, createModel, isLLMModel } from '../src/index'

/**
 * Real API usage example (requires actual API keys)
 * This demonstrates how to make actual API calls with different providers
 */
async function realApiExample() {
  // Only run if API keys are provided
  const openaiKey = process.env.OPENAI_API_KEY
  const anthropicKey = process.env.ANTHROPIC_API_KEY
  
  if (!openaiKey && !anthropicKey) {
    console.log('=== Real API Example ===')
    console.log('To test with real APIs, set environment variables:')
    console.log('export OPENAI_API_KEY="your-openai-key"')
    console.log('export ANTHROPIC_API_KEY="your-anthropic-key"')
    console.log()
    return
  }

  console.log('=== Real AI API Calls ===\n')

  // Test with OpenAI if key is available
  if (openaiKey) {
    console.log('--- OpenAI Test ---')
    
    const openaiProvider = createProvider({
      id: 'openai',
      type: 'openai',
      name: 'OpenAI',
      apiKey: openaiKey,
      apiHost: 'https://api.openai.com/v1'
    })

    const gptModel = createModel({
      id: 'gpt-3.5-turbo',
      provider: 'openai',
      name: 'GPT-3.5 Turbo',
      capabilities: ['text']
    })

    const openaiClient = ApiClientFactory.create(openaiProvider)
    
    try {
      // List available models
      const models = await openaiClient.listModels()
      console.log(`Found ${models.length} models`)
      
      // Make a simple completion request
      const transformer = openaiClient.getRequestTransformer()
      const params = await transformer.transformRequest({
        messages: [
          { id: '1', role: 'user', content: 'Say "Hello from OpenAI!" and nothing else.' }
        ],
        model: gptModel,
        temperature: 0.7,
        maxTokens: 20
      })

      const response = await openaiClient.createCompletions(params)
      const content = response.choices?.[0]?.message?.content || 'No response'
      console.log(`Response: ${content}`)
      console.log(`Usage: ${JSON.stringify(response.usage)}`)
      
    } catch (error) {
      console.error('OpenAI Error:', error instanceof Error ? error.message : error)
    }
    
    console.log()
  }

  // Test with Anthropic if key is available
  if (anthropicKey) {
    console.log('--- Anthropic Test ---')
    
    const anthropicProvider = createProvider({
      id: 'anthropic',
      type: 'anthropic',
      name: 'Anthropic',
      apiKey: anthropicKey,
      apiHost: 'https://api.anthropic.com'
    })

    const claudeModel = createModel({
      id: 'claude-3-haiku-20240307',
      provider: 'anthropic',
      name: 'Claude 3 Haiku',
      capabilities: ['text']
    })

    const anthropicClient = ApiClientFactory.create(anthropicProvider)
    
    try {
      // Make a simple completion request
      const transformer = anthropicClient.getRequestTransformer()
      const params = await transformer.transformRequest({
        messages: [
          { id: '1', role: 'user', content: 'Say "Hello from Claude!" and nothing else.' }
        ],
        model: claudeModel,
        temperature: 0.7,
        maxTokens: 20
      })

      const response = await anthropicClient.createCompletions(params)
      const content = response.content?.[0]?.text || 'No response'
      console.log(`Response: ${content}`)
      console.log(`Usage: ${JSON.stringify(response.usage)}`)
      
    } catch (error) {
      console.error('Anthropic Error:', error instanceof Error ? error.message : error)
    }
    
    console.log()
  }

  console.log('Real API testing complete!')
}

// Run if executed directly
if (require.main === module) {
  realApiExample().catch(console.error)
}

export { realApiExample }