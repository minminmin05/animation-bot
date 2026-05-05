import { GoogleGenerativeAI } from '@google/generative-ai'

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '')
const MODEL = process.env.GEMINI_MODEL || 'gemini-2.5-flash'

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

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วย AI ของโรงเรียน ตอบคำถามเฉพาะจากข้อมูลที่ให้มาเท่านั้น
ตอบเป็นภาษาไทยสุภาพ เป็นกันเอง เหมือนครูประจำชั้นพูดกับนักเรียน
หากไม่มีข้อมูลเกี่ยวกับคำถามให้ตอบว่า "ขอโทษค่ะ/ครับ คุณครูไม่มีข้อมูลเรื่องนั้น ลองถามเรื่องอื่นได้นะคะ/ครับ"`

export async function generateAnswer(
  question: string,
  sources: LLMSources[]
): Promise<LLMResponse> {
  const context = sources.map((s, i) => {
    const text = s.content || s.text || ''
    return `[${i + 1}] ${text}`
  }).join('\n')

  const userPrompt = `Context:
${context}

Question: ${question}

ตอบคำถามโดยใช้เฉพาะข้อมูลจาก Context ข้างบน`

  console.log(`[LLM] Generating answer for: "${question.slice(0, 50)}..."`)

  try {
    const model = genAI.getGenerativeModel({ model: MODEL })

    const prompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`

    const response = await model.generateContent(prompt)
    const text = response.response.text() || ''

    const emotion: LLMResponse['emotion'] = sources.length > 0 ? 'helpful' : 'concerned'

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

    const fallbackText = 'ขออภัย ระบบไม่สามารถตอบได้ในขณะนี้ กรุณาลองใหม่ภายหลัง'

    return {
      text: fallbackText,
      emotion: 'concerned',
      tts: fallbackText,
      sources: []
    }
  }
}

export { MODEL }
