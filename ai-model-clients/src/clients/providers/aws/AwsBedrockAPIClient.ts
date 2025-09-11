import { BedrockRuntimeClient, InvokeModelCommand, InvokeModelWithResponseStreamCommand } from '@aws-sdk/client-bedrock-runtime'
import { BedrockClient } from '@aws-sdk/client-bedrock'
import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, Message as InternalMessage } from '../../../types'
import {
  AwsBedrockSdkInstance,
  AwsBedrockSdkParams,
  AwsBedrockSdkRawOutput,
  AwsBedrockSdkRawChunk,
  AwsBedrockSdkMessageParam,
  SdkModel
} from '../../../types/sdk'

/**
 * AWS Bedrock API client implementation
 */
export class AwsBedrockAPIClient extends BaseApiClient<
  AwsBedrockSdkInstance,
  AwsBedrockSdkParams,
  AwsBedrockSdkRawOutput,
  AwsBedrockSdkRawChunk,
  AwsBedrockSdkMessageParam
> {
  private region: string

  constructor(provider: Provider) {
    super(provider)
    this.region = provider.apiVersion || 'us-east-1' // Use apiVersion field for region
  }

  async getSdkInstance(): Promise<AwsBedrockSdkInstance> {
    if (!this.sdkInstance) {
      // AWS credentials should be provided via environment or IAM roles
      this.sdkInstance = {
        client: new BedrockRuntimeClient({ region: this.region }),
        bedrockClient: new BedrockClient({ region: this.region }),
        region: this.region
      }
    }
    return this.sdkInstance
  }

  async createCompletions(payload: AwsBedrockSdkParams): Promise<AwsBedrockSdkRawOutput> {
    const sdk = await this.getSdkInstance()
    
    try {
      const requestBody = this.createRequestBodyForModel(payload)
      
      if (payload.stream) {
        const command = new InvokeModelWithResponseStreamCommand({
          modelId: payload.modelId,
          body: JSON.stringify(requestBody),
          contentType: 'application/json'
        })
        
        const response = await sdk.client.send(command)
        return this.processStreamingResponse(response.body)
      } else {
        const command = new InvokeModelCommand({
          modelId: payload.modelId,
          body: JSON.stringify(requestBody),
          contentType: 'application/json'
        })
        
        const response = await sdk.client.send(command)
        const responseBody = JSON.parse(new TextDecoder().decode(response.body))
        return { output: responseBody }
      }
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async listModels(): Promise<SdkModel[]> {
    // AWS Bedrock models are predefined, return static list
    return [
      { id: 'anthropic.claude-3-5-sonnet-20241022-v2:0', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'anthropic.claude-3-5-haiku-20241022-v1:0', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'anthropic.claude-3-opus-20240229-v1:0', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'anthropic.claude-3-sonnet-20240229-v1:0', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'anthropic.claude-3-haiku-20240307-v1:0', object: 'model', created: 0, owned_by: 'anthropic' },
      { id: 'meta.llama3-2-90b-instruct-v1:0', object: 'model', created: 0, owned_by: 'meta' },
      { id: 'meta.llama3-2-11b-instruct-v1:0', object: 'model', created: 0, owned_by: 'meta' },
      { id: 'amazon.titan-text-premier-v1:0', object: 'model', created: 0, owned_by: 'amazon' }
    ] as SdkModel[]
  }

  getRequestTransformer(): RequestTransformer<AwsBedrockSdkParams, AwsBedrockSdkMessageParam> {
    return new AwsBedrockRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<AwsBedrockSdkRawChunk> {
    return new AwsBedrockResponseChunkTransformer()
  }

  protected isCompatibleModel(model: Model): boolean {
    return model.provider === this.provider.id || 
           model.endpoint_type === 'aws-bedrock' ||
           model.supported_endpoint_types?.includes('aws-bedrock') || false
  }

  private createRequestBodyForModel(params: AwsBedrockSdkParams): any {
    const modelId = params.modelId.toLowerCase()

    // Claude models
    if (modelId.includes('claude')) {
      return {
        anthropic_version: 'bedrock-2023-05-31',
        max_tokens: params.maxTokens || 4096,
        messages: params.messages,
        ...(params.system && { system: params.system }),
        ...(params.temperature && { temperature: params.temperature }),
        ...(params.topP && { top_p: params.topP }),
        ...(params.tools && { tools: params.tools })
      }
    }

    // Llama models
    if (modelId.includes('llama')) {
      const prompt = this.convertMessagesToPrompt(params.messages)
      return {
        prompt,
        max_gen_len: params.maxTokens || 2048,
        ...(params.temperature && { temperature: params.temperature }),
        ...(params.topP && { top_p: params.topP })
      }
    }

    // Amazon Titan models
    if (modelId.includes('titan')) {
      const prompt = this.convertMessagesToPrompt(params.messages)
      return {
        inputText: prompt,
        textGenerationConfig: {
          maxTokenCount: params.maxTokens || 4096,
          ...(params.temperature && { temperature: params.temperature }),
          ...(params.topP && { topP: params.topP })
        }
      }
    }

    // Default format (Claude-like)
    return {
      max_tokens: params.maxTokens || 4096,
      messages: params.messages,
      ...(params.system && { system: params.system }),
      ...(params.temperature && { temperature: params.temperature }),
      ...(params.topP && { top_p: params.topP })
    }
  }

  private convertMessagesToPrompt(messages: AwsBedrockSdkMessageParam[]): string {
    return messages.map(msg => {
      const role = msg.role === 'user' ? 'Human' : 'Assistant'
      const content = msg.content.map(c => c.text || '').join(' ')
      return `${role}: ${content}`
    }).join('\n\n')
  }

  private async processStreamingResponse(body: any): Promise<AsyncIterable<AwsBedrockSdkRawChunk>> {
    const chunks: AwsBedrockSdkRawChunk[] = []
    
    // This is a simplified implementation
    // In practice, you would process the streaming response properly
    for await (const chunk of body) {
      if (chunk.chunk?.bytes) {
        const chunkData = JSON.parse(new TextDecoder().decode(chunk.chunk.bytes))
        chunks.push(chunkData)
      }
    }
    
    return chunks[Symbol.asyncIterator]()
  }
}

/**
 * AWS Bedrock request transformer
 */
class AwsBedrockRequestTransformer implements RequestTransformer<AwsBedrockSdkParams, AwsBedrockSdkMessageParam> {
  async transformRequest(params: CompletionParams): Promise<AwsBedrockSdkParams> {
    const { messages, model, temperature, maxTokens, topP, stream, tools } = params

    // Separate system messages
    const systemMessages = messages.filter(msg => msg.role === 'system')
    const conversationMessages = messages.filter(msg => msg.role !== 'system')

    const bedrockParams: AwsBedrockSdkParams = {
      modelId: model.id,
      messages: this.transformMessages(conversationMessages),
      stream: stream || false
    }

    if (systemMessages.length > 0) {
      bedrockParams.system = systemMessages.map(msg => msg.content).join('\n')
    }

    if (maxTokens !== undefined) {
      bedrockParams.maxTokens = maxTokens
    }

    if (temperature !== undefined) {
      bedrockParams.temperature = Math.max(0, Math.min(1, temperature))
    }

    if (topP !== undefined) {
      bedrockParams.topP = Math.max(0, Math.min(1, topP))
    }

    if (tools && tools.length > 0) {
      bedrockParams.tools = tools
    }

    return bedrockParams
  }

  transformMessages(messages: InternalMessage[]): AwsBedrockSdkMessageParam[] {
    return messages.map(msg => ({
      role: msg.role as 'user' | 'assistant',
      content: [{ text: msg.content }]
    }))
  }
}

/**
 * AWS Bedrock response chunk transformer
 */
class AwsBedrockResponseChunkTransformer implements ResponseChunkTransformer<AwsBedrockSdkRawChunk> {
  transformChunk(chunk: AwsBedrockSdkRawChunk): ChunkData {
    if (chunk.contentBlockDelta?.delta?.text) {
      return {
        type: 'text',
        content: chunk.contentBlockDelta.delta.text
      }
    }

    if (chunk.contentBlockStart?.start?.toolUse) {
      return {
        type: 'function_call',
        functionCall: {
          name: chunk.contentBlockStart.start.toolUse.name,
          arguments: JSON.stringify(chunk.contentBlockStart.start.toolUse)
        }
      }
    }

    if (chunk.messageStop) {
      return { type: 'done' }
    }

    return { type: 'text', content: '' }
  }
}