# AI Model Clients

A standalone library extracted from Cherry Studio for connecting to multiple AI language model providers.

## Directory Structure
```
ai-model-clients/
├── src/
│   ├── clients/         # Core client implementations
│   ├── types/          # TypeScript type definitions  
│   ├── utils/          # Utility functions
│   └── index.ts        # Main exports
├── examples/           # Usage examples
├── package.json
├── tsconfig.json
└── README.md
```

## Supported Providers
- OpenAI (GPT models)
- Anthropic (Claude)
- Google (Gemini)
- AWS Bedrock
- And 20+ other providers

## Installation
```bash
npm install ai-model-clients
```

## Usage
```typescript
import { ApiClientFactory } from 'ai-model-clients'

const provider = {
  id: 'openai',
  type: 'openai',
  name: 'OpenAI',
  apiKey: 'your-api-key',
  apiHost: 'https://api.openai.com/v1'
}

const client = ApiClientFactory.create(provider)
```