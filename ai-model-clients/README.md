# AI Model Clients

A standalone TypeScript library extracted from Cherry Studio for connecting to multiple AI language model providers. This library provides a unified interface to work with various AI providers like OpenAI, Anthropic, Google Gemini, AWS Bedrock, and many others.

## Features

- 🔗 **20+ AI Providers** - OpenAI, Anthropic, Gemini, AWS Bedrock, and more
- 🛡️ **Type Safety** - Full TypeScript support with comprehensive type definitions
- 🏭 **Factory Pattern** - Easy client creation based on provider configuration
- 🔄 **Streaming Support** - Real-time response streaming capabilities
- 🛠️ **Function Calling** - Tool/function calling integration
- 🖼️ **Image Generation** - Support for image generation APIs
- 🧩 **Extensible** - Clean architecture for adding new providers
- 📦 **Lightweight** - Minimal dependencies, focused on core functionality

## Installation

```bash
npm install ai-model-clients
```

## Quick Start

```typescript
import { ApiClientFactory, createProvider, createModel } from 'ai-model-clients'

// Create a provider configuration
const provider = createProvider({
  id: 'openai',
  type: 'openai',
  name: 'OpenAI',
  apiKey: 'your-openai-api-key',
  apiHost: 'https://api.openai.com/v1'
})

// Create a model configuration
const model = createModel({
  id: 'gpt-4',
  provider: 'openai',
  name: 'GPT-4',
  capabilities: ['text', 'vision', 'function_calling']
})

// Create the client
const client = ApiClientFactory.create(provider)

// Transform request parameters
const transformer = client.getRequestTransformer()
const params = await transformer.transformRequest({
  messages: [
    { id: '1', role: 'user', content: 'Hello, how are you?' }
  ],
  model,
  temperature: 0.7,
  maxTokens: 150
})

// Make the API call
const response = await client.createCompletions(params)
```

## Supported Providers

### Primary Providers
- **OpenAI** - GPT models, DALL-E, embeddings
- **Anthropic** - Claude models  
- **Google Gemini** - Gemini Pro, Flash models
- **AWS Bedrock** - Claude, Llama, Titan models

### OpenAI-Compatible Providers
- **OpenRouter** - Access to multiple models
- **Together AI** - Open source models
- **Groq** - Fast inference
- **Fireworks** - Model serving
- **DeepSeek** - Code and chat models
- **Moonshot** - Chinese language models
- **ZhiPu** - ChatGLM models
- **And many more...**

## Architecture

The library follows a clean architecture with separation of concerns:

```
src/
├── types/                 # Core type definitions
├── clients/
│   ├── base/             # Abstract base classes
│   ├── factory/          # Client factory
│   └── providers/        # Provider-specific implementations
└── utils/                # Utility functions
```

## Examples

See the `examples/` directory for complete working examples:

- `basic.ts` - Simple usage with OpenAI and Anthropic
- `advanced.ts` - Multi-provider setup with streaming and function calling

Run examples:
```bash
npm run test        # Run basic example
node dist/examples/advanced.js  # Run advanced example
```

## Credits

Extracted and adapted from the [Cherry Studio](https://github.com/CherryHQ/cherry-studio) project.