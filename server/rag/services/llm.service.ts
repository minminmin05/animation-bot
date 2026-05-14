import { GoogleGenerativeAI } from '@google/generative-ai'

// LLM Provider Types
export type LLMProvider = 'gemini' | 'minimax'

// Provider configurations
interface ProviderConfig {
  name: string
  apiKey: string
  model: string
  apiUrl?: string
  isNewFormatKey?: boolean
}

// Get provider config from environment
function getProviderConfig(provider: LLMProvider): ProviderConfig {
  switch (provider) {
    case 'gemini':
      return {
        name: 'Google Gemini',
        apiKey: process.env.GEMINI_API_KEY || '',
        model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
      }
    case 'minimax':
      return {
        name: 'MiniMax',
        apiKey: process.env.MINIMAX_API_KEY || '',
        model: process.env.MINIMAX_MODEL || 'abab6.5s-chat',
        apiUrl: process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_pro',
        isNewFormatKey: (process.env.MINIMAX_API_KEY || '').startsWith('sk-')
      }
    default:
      throw new Error(`Unknown LLM provider: ${provider}`)
  }
}

// Parse MiniMax API key (format: groupId;apiKey or new sk- format)
function parseMiniMaxKey(apiKey: string): { groupId: string; apiKey: string } | null {
  if (!apiKey) return null

  // Check if key contains groupId (old format)
  const parts = apiKey.split(';')
  if (parts.length === 2) {
    return { groupId: parts[0], apiKey: parts[1] }
  }

  // New format: sk- keys don't need groupId
  if (apiKey.startsWith('sk-')) {
    return { groupId: '', apiKey }
  }

  // Try environment variable for groupId
  const groupId = process.env.MINIMAX_GROUP_ID || ''
  if (groupId) {
    return { groupId, apiKey }
  }

  return null
}

// Get current provider from settings or default to MiniMax
function getCurrentProvider(): LLMProvider {
  return (process.env.LLM_PROVIDER as LLMProvider) || 'minimax'
}

// ============================================================
// MINIMAX ERROR TYPES
// ============================================================

interface MiniMaxBaseResp {
  status_code: number
  status_msg: string
}

interface MiniMaxErrorResponse {
  base_resp: MiniMaxBaseResp
}

interface MiniMaxApiError extends Error {
  statusCode?: number
  statusMsg?: string
  isAuthError?: boolean
  isRateLimit?: boolean
  isQuotaExceeded?: boolean
}

// Common MiniMax error codes
const MINIMAX_ERROR_CODES = {
  INVALID_API_KEY: 2049,
  RATE_LIMIT: 1002,
  QUOTA_EXCEEDED: 1003,
  INVALID_MODEL: 1004,
  TIMEOUT: 1005,
  INTERNAL_ERROR: 1006,
  INVALID_REQUEST: 1007
} as const

/**
 * Create a typed MiniMax API error
 */
function createMiniMaxError(
  statusCode: number,
  statusMsg: string
): MiniMaxApiError {
  const error = new Error(`MiniMax API Error (${statusCode}): ${statusMsg}`) as MiniMaxApiError
  error.statusCode = statusCode
  error.statusMsg = statusMsg

  // Categorize error for better handling
  if (statusCode === MINIMAX_ERROR_CODES.INVALID_API_KEY) {
    error.isAuthError = true
  } else if (statusCode === MINIMAX_ERROR_CODES.RATE_LIMIT) {
    error.isRateLimit = true
  } else if (statusCode === MINIMAX_ERROR_CODES.QUOTA_EXCEEDED) {
    error.isQuotaExceeded = true
  }

  return error
}

/**
 * Validate API key configuration at startup
 */
export function validateMiniMaxConfig(): {
  isValid: boolean
  error?: string
  keyLength?: number
  isNewFormat?: boolean
} {
  const apiKey = process.env.MINIMAX_API_KEY

  if (!apiKey) {
    return { isValid: false, error: 'MINIMAX_API_KEY not set' }
  }

  const trimmed = apiKey.trim()
  if (!trimmed) {
    return { isValid: false, error: 'MINIMAX_API_KEY is empty' }
  }

  // Check format
  const isNewFormat = trimmed.startsWith('sk-')
  const parts = trimmed.split(';')

  if (!isNewFormat && parts.length !== 2) {
    return {
      isValid: false,
      error: 'Invalid key format. Use: groupId;apiKey or sk- format'
    }
  }

  return {
    isValid: true,
    keyLength: trimmed.length,
    isNewFormat
  }
}

export interface LLMSources {
  content?: string
  text?: string
  score?: number
  similarity?: number
  category: string
}

export interface LLMResponse {
  text: string
  emotion: 'neutral' | 'happy' | 'concerned' | 'helpful'
  tts: string
  sources: LLMSources[]
}

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วย AI ของโรงเรียน

กฎสำคัญ:
1. ตอบคำถามโดยใช้เฉพาะข้อมูลจาก Context ที่ให้มาเท่านั้น
2. ห้ามใช้ความรู้ทั่วไปของคุณเอง
3. หากไม่มีข้อมูลที่เกี่ยวข้องใน Context ให้ตอบว่า "ขอโทษค่ะ/ครับ ระบบไม่มีข้อมูลเรื่องนั้น"

วิธีตอบ:
- ตอบเป็นภาษาไทยสุภาพ เป็นกันเอง
- อ้างอิงข้อมูลจาก Context เท่านั้น
- ถ้าไม่พบข้อมูลที่เกี่ยวข้อง → บอกว่าไม่มีข้อมูล`

// Gemini LLM implementation
async function generateWithGemini(
  prompt: string,
  config: ProviderConfig
): Promise<string> {
  const genAI = new GoogleGenerativeAI(config.apiKey)
  const model = genAI.getGenerativeModel({ model: config.model })

  const response = await model.generateContent(prompt)
  return response.response.text() || ''
}

// MiniMax LLM implementation
async function generateWithMiniMax(
  prompt: string,
  config: ProviderConfig
): Promise<string> {
  const keyInfo = parseMiniMaxKey(config.apiKey)

  if (!keyInfo) {
    const error = new Error('MiniMax API key format invalid. Use: groupId;apiKey or sk- format') as MiniMaxApiError
    error.isAuthError = true
    throw error
  }

  console.log('[LLM] MiniMax request with API:', keyInfo.apiKey.substring(0, 10) + '...')

  // New MiniMax API format (for sk- keys)
  const isNewFormat = keyInfo.apiKey.startsWith('sk-')
  // Use MINIMAX_API_URL from .env, not hardcoded URL
  const apiUrl = config.apiUrl || 'https://api.minimax.chat/v1/text/chatcompletion_pro'

  const requestBody = isNewFormat
    ? {
        model: config.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2048,
        stream: false
      }
    : {
        model: config.model,
        messages: [
          {
            sender_type: 'USER',
            sender_name: 'User',
            text: prompt
          }
        ],
        temperature: 0.7,
        tokens_to_generate: 2048,
        stream: false,
        mask_sensitive_info: false
      }

  console.log('[LLM] MiniMax API URL:', apiUrl)

  let response: Response
  try {
    response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${keyInfo.apiKey}`
      },
      body: JSON.stringify(requestBody)
    })
  } catch (networkError) {
    console.error('[LLM] MiniMax network error:', networkError)
    throw new Error(`MiniMax API network error: ${networkError instanceof Error ? networkError.message : 'Unknown network error'}`)
  }

  // Handle HTTP-level errors
  if (!response.ok) {
    let errorText = ''
    try {
      errorText = await response.text()
    } catch {
      errorText = 'Unable to read error response'
    }
    console.error('[LLM] MiniMax HTTP error:', response.status, errorText)

    // Try to parse MiniMax error from response body
    try {
      const errorData = JSON.parse(errorText) as MiniMaxErrorResponse
      if (errorData.base_resp) {
        throw createMiniMaxError(errorData.base_resp.status_code, errorData.base_resp.status_msg)
      }
    } catch {
      // Not JSON or no base_resp, use HTTP status
    }

    throw new Error(`MiniMax API HTTP error: ${response.status} - ${errorText}`)
  }

  // Parse response JSON
  let data: any
  try {
    data = await response.json()
  } catch (parseError) {
    console.error('[LLM] MiniMax response parse error:', parseError)
    throw new Error('MiniMax API response is not valid JSON')
  }

  console.log('[LLM] MiniMax response keys:', Object.keys(data).join(', '))

  // ============================================================
  // FIRST: Check MiniMax's base_resp for API-level errors
  // ============================================================
  if (data.base_resp && typeof data.base_resp === 'object') {
    const { status_code, status_msg } = data.base_resp

    // status_code === 0 means success in MiniMax API
    if (status_code !== 0) {
      console.error('[LLM] MiniMax API error from base_resp:', status_code, status_msg)
      throw createMiniMaxError(status_code, status_msg)
    }

    console.log('[LLM] MiniMax base_resp OK:', status_code, status_msg)
  }

  // ============================================================
  // THEN: Parse the actual response content
  // ============================================================

  // OpenAI-compatible format (new sk- keys)
  if (data.choices && data.choices[0] && data.choices[0].message) {
    const content = data.choices[0].message.content || ''
    if (content) {
      console.log('[LLM] MiniMax response: OpenAI format, length:', content.length)
      return content
    }
  }

  // Old MiniMax format: reply field
  if (data.reply) {
    console.log('[LLM] MiniMax response: reply format, length:', data.reply.length)
    return data.reply
  }

  // Alternative format with messages in choices
  if (data.choices && data.choices[0] && data.choices[0].messages) {
    const text = data.choices[0].messages[0]?.text || ''
    if (text) {
      console.log('[LLM] MiniMax response: choices.messages format, length:', text.length)
      return text
    }
  }

  // If we get here, we couldn't parse the response
  console.error('[LLM] MiniMax unhandled response format:', JSON.stringify(data).substring(0, 500))
  throw new Error('Unexpected MiniMax API response format - could not extract content')
}

// Main generate function with provider selection
export async function generateWithProvider(
  provider: LLMProvider,
  prompt: string
): Promise<string> {
  const config = getProviderConfig(provider)

  if (!config.apiKey) {
    throw new Error(`${config.name} API key not configured`)
  }

  console.log(`[LLM] Using provider: ${provider} (${config.name})`)

  try {
    switch (provider) {
      case 'gemini':
        return await generateWithGemini(prompt, config)
      case 'minimax':
        return await generateWithMiniMax(prompt, config)
      default:
        throw new Error(`Unknown provider: ${provider}`)
    }
  } catch (error) {
    // Check if error is from MiniMax and we should fallback
    if (provider === 'minimax') {
      const miniMaxError = error as MiniMaxApiError

      // Log detailed error info
      if (miniMaxError.isAuthError) {
        console.error('[LLM] MiniMax auth error - invalid or expired API key')
      } else if (miniMaxError.isRateLimit) {
        console.error('[LLM] MiniMax rate limit exceeded')
      } else if (miniMaxError.isQuotaExceeded) {
        console.error('[LLM] MiniMax quota exceeded')
      } else {
        console.error('[LLM] MiniMax error:', miniMaxError.message)
      }

      // Try fallback to Gemini if available
      const geminiKey = process.env.GEMINI_API_KEY
      if (geminiKey) {
        console.log('[LLM] Falling back to Gemini due to MiniMax error')
        try {
          const geminiConfig: ProviderConfig = {
            name: 'Google Gemini (fallback)',
            apiKey: geminiKey,
            model: process.env.GEMINI_MODEL || 'gemini-2.5-flash'
          }
          return await generateWithGemini(prompt, geminiConfig)
        } catch (fallbackError) {
          console.error('[LLM] Fallback to Gemini also failed:', fallbackError)
          throw miniMaxError // Re-throw original error
        }
      }
    }

    throw error
  }
}

export async function generateAnswer(
  question: string,
  sources: LLMSources[],
  personalDataContext?: string
): Promise<LLMResponse> {
  let context = ''

  // Use personal data context if provided (for PERSONAL_DATA intent)
  if (personalDataContext) {
    context = personalDataContext
  } else {
    // Use RAG sources
    context = sources.map((s, i) => {
      const text = s.content || s.text || ''
      return `[${i + 1}] ${text}`
    }).join('\n')
  }

  const userPrompt = personalDataContext
    ? `คุณคือผู้ช่วย AI ของโรงเรียน

ข้อมูลของผู้ใช้:
${context}

คำถาม:
${question}

ให้สรุปข้อมูลให้เข้าใจง่าย เป็นรายการ`
    : `Context:
${context}

Question: ${question}

ตอบคำถามโดยใช้เฉพาะข้อมูลจาก Context ข้างบนเท่านั้น
อย่าใช้ความรู้ส่วนตัว
หากไม่มีข้อมูลที่เกี่ยวข้อง ให้ตอบว่า "ขอโทษค่ะ/ครับ ระบบไม่มีข้อมูลเรื่องนั้น"`

  console.log(`[LLM] Generating answer for: "${question.slice(0, 50)}..."`)

  const provider = getCurrentProvider()
  const prompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`

  try {
    const text = await generateWithProvider(provider, prompt)

    // Prevent empty responses
    if (!text.trim()) {
      console.log('[LLM] Received empty response from AI, using fallback')
      return {
        text: 'ขออภัย ระบบไม่สามารถสรุปข้อมูลได้ในขณะนี้ กรุณาลองถามใหม่อีกครั้งค่ะ/ครับ',
        emotion: 'concerned',
        tts: 'ขออภัย ระบบไม่สามารถสรุปข้อมูลได้ในขณะนี้ กรุณาลองถามใหม่อีกครั้งค่ะ/ครับ',
        sources: []
      }
    }

    const emotion: LLMResponse['emotion'] = personalDataContext
      ? 'happy' // Positive emotion for personal data
      : sources.length > 0
      ? 'helpful'
      : 'concerned'

    const tts = text
      .replace(/[♪♫]/g, '')
      .replace(/\*.*?\*/g, '')
      .trim()

    console.log(`[LLM] Answer generated: ${text.slice(0, 50)}...`)

    return {
      text,
      emotion,
      tts,
      sources: sources.slice(0, 2)
    }
  } catch (error) {
    console.error('[LLM] Error:', error)

    // Fallback: return retrieved context if available
    if (sources.length > 0 && !personalDataContext) {
      const fallbackText = sources.map((s, i) =>
        `[${i + 1}] ${s.content || s.text}`
      ).join('\n\n')

      return {
        text: fallbackText,
        emotion: 'helpful',
        tts: fallbackText,
        sources: sources.slice(0, 2)
      }
    }

    const fallbackText = 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'

    return {
      text: fallbackText,
      emotion: 'concerned',
      tts: fallbackText,
      sources: []
    }
  }
}

// Get current model info
export function getModelInfo(): { provider: LLMProvider; name: string; model: string } {
  const provider = getCurrentProvider()
  const config = getProviderConfig(provider)

  return {
    provider,
    name: config.name,
    model: config.model
  }
}

// Legacy export for compatibility
export const MODEL = process.env.MINIMAX_MODEL || process.env.GEMINI_MODEL || 'abab6.5s-chat'

// ============================================================
// STARTUP VALIDATION & DIAGNOSTICS
// ============================================================

/**
 * Log LLM configuration status at startup
 */
export function logLLMConfiguration(): void {
  console.log('\n[LLM] ==================== LLM Configuration ====================')

  const provider = getCurrentProvider()
  console.log(`[LLM] Active provider: ${provider}`)

  switch (provider) {
    case 'minimax': {
      const validation = validateMiniMaxConfig()
      console.log('[LLM] MiniMax enabled: true')

      if (validation.isValid) {
        console.log('[LLM] MiniMax API key loaded: yes')
        console.log(`[LLM] MiniMax API key length: ${validation.keyLength}`)
        console.log(`[LLM] MiniMax API key format: ${validation.isNewFormat ? 'sk- (new)' : 'groupId;apiKey (old)'}`)
        console.log(`[LLM] MiniMax Model: ${process.env.MINIMAX_MODEL || 'abab6.5s-chat'}`)
        console.log(`[LLM] MiniMax API URL: ${process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_pro'}`)

        // Check Gemini for fallback
        const geminiKey = process.env.GEMINI_API_KEY
        console.log(`[LLM] Fallback to Gemini: ${geminiKey ? 'yes' : 'no'}`)
      } else {
        console.error(`[LLM] ⚠ Configuration issue: ${validation.error}`)
        console.error('[LLM] MiniMax API calls will fail!')
      }
      break
    }

    case 'gemini': {
      const geminiKey = process.env.GEMINI_API_KEY
      console.log('[LLM] Gemini enabled: true')
      console.log(`[LLM] Gemini API key loaded: ${geminiKey ? 'yes' : 'no'}`)
      console.log(`[LLM] Gemini API key length: ${geminiKey?.length || 0}`)
      console.log(`[LLM] Gemini Model: ${process.env.GEMINI_MODEL || 'gemini-2.5-flash'}`)

      // MiniMax disabled info
      const miniMaxKey = process.env.MINIMAX_API_KEY
      console.log(`[LLM] MiniMax enabled: ${miniMaxKey ? 'true (not used)' : 'false'}`)
      break
    }
  }

  console.log('[LLM] ===========================================================\n')
}

// Auto-log on module load (in development)
if (process.env.NODE_ENV !== 'production') {
  logLLMConfiguration()
}
