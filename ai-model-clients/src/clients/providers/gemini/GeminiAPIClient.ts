import { GoogleGenAI, GenerateContentResponse, Content, Model as GeminiModel } from '@google/genai'
import { BaseApiClient } from '../../base/BaseApiClient'
import { RequestTransformer, ResponseChunkTransformer, CompletionParams, ChunkData } from '../../base/types'
import { Provider, Model, Message as InternalMessage } from '../../../types'
import {
  GeminiSdkParams,
  GeminiSdkRawOutput,
  GeminiSdkRawChunk,
  GeminiSdkMessageParam,
  SdkModel,
  GeminiOptions
} from '../../../types/sdk'

/**
 * Google Gemini API client implementation
 */
export class GeminiAPIClient extends BaseApiClient<
  GoogleGenAI,
  GeminiSdkParams,
  GeminiSdkRawOutput,
  GeminiSdkRawChunk,
  GeminiSdkMessageParam
> {
  constructor(provider: Provider) {
    super(provider)
  }

  async getSdkInstance(): Promise<GoogleGenAI> {
    if (!this.sdkInstance) {
      this.sdkInstance = new GoogleGenAI({
        apiKey: this.apiKey,
        baseUrl: this.host
      })
    }
    return this.sdkInstance
  }

  async createCompletions(payload: GeminiSdkParams, options?: GeminiOptions): Promise<GeminiSdkRawOutput> {
    const sdk = await this.getSdkInstance()
    
    try {
      const model = sdk.getGenerativeModel({ model: payload.model })
      
      if (options?.streamOutput) {
        return model.generateContentStream(payload)
      } else {
        return model.generateContent(payload)
      }
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  async listModels(): Promise<SdkModel[]> {
    const sdk = await this.getSdkInstance()
    
    try {
      const models = await sdk.listModels()
      return models.models || []
    } catch (error) {
      throw this.handleApiError(error)
    }
  }

  getRequestTransformer(): RequestTransformer<GeminiSdkParams, GeminiSdkMessageParam> {
    return new GeminiRequestTransformer()
  }

  getResponseChunkTransformer(): ResponseChunkTransformer<GeminiSdkRawChunk> {
    return new GeminiResponseChunkTransformer()
  }

  protected isCompatibleModel(model: Model): boolean {
    return model.provider === this.provider.id || 
           model.endpoint_type === 'gemini' ||
           model.supported_endpoint_types?.includes('gemini') || false
  }
}

/**
 * Gemini request transformer
 */
class GeminiRequestTransformer implements RequestTransformer<GeminiSdkParams, GeminiSdkMessageParam> {
  async transformRequest(params: CompletionParams): Promise<GeminiSdkParams> {
    const { messages, model, temperature, maxTokens, topP, tools } = params

    // Separate system messages and conversation messages
    const systemMessages = messages.filter(msg => msg.role === 'system')
    const conversationMessages = messages.filter(msg => msg.role !== 'system')

    const geminiParams: GeminiSdkParams = {
      model: model.id,
      contents: this.transformMessages(conversationMessages)
    }

    // Add system instruction if present
    if (systemMessages.length > 0) {
      geminiParams.systemInstruction = {
        parts: [{ text: systemMessages.map(msg => msg.content).join('\n') }]
      }
    }

    // Configure generation settings
    const generationConfig: any = {}

    if (temperature !== undefined) {
      generationConfig.temperature = Math.max(0, Math.min(1, temperature))
    }

    if (maxTokens !== undefined) {
      generationConfig.maxOutputTokens = maxTokens
    }

    if (topP !== undefined) {
      generationConfig.topP = Math.max(0, Math.min(1, topP))
    }

    if (Object.keys(generationConfig).length > 0) {
      geminiParams.generationConfig = generationConfig
    }

    if (tools && tools.length > 0) {
      geminiParams.tools = tools
    }

    return geminiParams
  }

  transformMessages(messages: InternalMessage[]): GeminiSdkMessageParam[] {
    return messages.map(msg => {
      const parts: any[] = [{ text: msg.content }]

      // Handle images if present
      if (msg.images && msg.images.length > 0) {
        for (const imageUrl of msg.images) {
          if (imageUrl.startsWith('data:')) {
            // Base64 image
            const [mimeType, data] = imageUrl.split(',')
            parts.push({
              inlineData: {
                mimeType: mimeType.split(':')[1].split(';')[0],
                data: data
              }
            })
          } else {
            // URL image - Gemini requires base64, so this would need conversion
            parts.push({ text: `[Image: ${imageUrl}]` })
          }
        }
      }

      return {
        role: msg.role === 'assistant' ? 'model' : 'user',
        parts
      } as Content
    })
  }
}

/**
 * Gemini response chunk transformer
 */
class GeminiResponseChunkTransformer implements ResponseChunkTransformer<GeminiSdkRawChunk> {
  transformChunk(chunk: GeminiSdkRawChunk): ChunkData {
    const response = chunk as GenerateContentResponse

    if (response.candidates && response.candidates.length > 0) {
      const candidate = response.candidates[0]
      
      if (candidate.content && candidate.content.parts) {
        const textPart = candidate.content.parts.find(part => 'text' in part)
        
        if (textPart && 'text' in textPart) {
          return {
            type: 'text',
            content: textPart.text
          }
        }

        // Handle function calls
        const functionCall = candidate.content.parts.find(part => 'functionCall' in part)
        if (functionCall && 'functionCall' in functionCall) {
          return {
            type: 'function_call',
            functionCall: {
              name: functionCall.functionCall.name,
              arguments: JSON.stringify(functionCall.functionCall.args)
            }
          }
        }
      }

      // Check for finish reason
      if (candidate.finishReason) {
        return {
          type: 'done',
          usage: response.usageMetadata ? {
            promptTokens: response.usageMetadata.promptTokenCount,
            completionTokens: response.usageMetadata.candidatesTokenCount,
            totalTokens: response.usageMetadata.totalTokenCount
          } : undefined
        }
      }
    }

    // Handle errors
    if (response.promptFeedback?.blockReason) {
      return {
        type: 'error',
        error: `Content blocked: ${response.promptFeedback.blockReason}`
      }
    }

    return { type: 'text', content: '' }
  }
}