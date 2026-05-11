import { GoogleGenerativeAI } from '@google/generative-ai'

// LLM Provider Types
export type LLMProvider = 'gemini' | 'minimax'

// Provider configurations
interface ProviderConfig {
  name: string
  apiKey: string
  model: string
  apiUrl?: string
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
        apiUrl: process.env.MINIMAX_API_URL || 'https://api.minimax.chat/v1/text/chatcompletion_pro'
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
    throw new Error('MiniMax API key format invalid. Use: groupId;apiKey or sk- format')
  }

  console.log('[LLM] MiniMax request with API:', keyInfo.apiKey.substring(0, 10) + '...')

  // New MiniMax API format (for sk- keys)
  const isNewFormat = keyInfo.apiKey.startsWith('sk-')
  const apiUrl = isNewFormat
    ? 'https://api.minimax.chat/v1/text/chatcompletion_pro'
    : config.apiUrl!

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

  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${keyInfo.apiKey}`
    },
    body: JSON.stringify(requestBody)
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error('[LLM] MiniMax API error:', response.status, errorText)
    throw new Error(`MiniMax API error: ${response.status} - ${errorText}`)
  }

  const data = await response.json()
  console.log('[LLM] MiniMax response:', JSON.stringify(data).substring(0, 200))

  // Handle different response formats
  if (data.choices && data.choices[0] && data.choices[0].message) {
    return data.choices[0].message.content || ''
  }
  if (data.reply) {
    return data.reply
  }
  if (data.choices && data.choices[0] && data.choices[0].messages) {
    return data.choices[0].messages[0]?.text || ''
  }

  throw new Error('Unexpected MiniMax API response format')
}

// Main generate function with provider selection
async function generateWithProvider(
  provider: LLMProvider,
  prompt: string
): Promise<string> {
  const config = getProviderConfig(provider)

  if (!config.apiKey) {
    throw new Error(`${config.name} API key not configured`)
  }

  console.log(`[LLM] Using provider: ${provider} (${config.name})`)

  switch (provider) {
    case 'gemini':
      return await generateWithGemini(prompt, config)
    case 'minimax':
      return await generateWithMiniMax(prompt, config)
    default:
      throw new Error(`Unknown provider: ${provider}`)
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
