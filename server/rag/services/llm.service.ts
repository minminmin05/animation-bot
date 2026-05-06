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

const SYSTEM_PROMPT = `คุณเป็นผู้ช่วย AI ของโรงเรียน

กฎสำคัญ:
1. ตอบคำถามโดยใช้เฉพาะข้อมูลจาก Context ที่ให้มาเท่านั้น
2. ห้ามใช้ความรู้ทั่วไปของคุณเอง
3. หากไม่มีข้อมูลที่เกี่ยวข้องใน Context ให้ตอบว่า "ขอโทษค่ะ/ครับ ระบบไม่มีข้อมูลเรื่องนั้น"

วิธีตอบ:
- ตอบเป็นภาษาไทยสุภาพ เป็นกันเอง
- อ้างอิงข้อมูลจาก Context เท่านั้น
- ถ้าไม่พบข้อมูลที่เกี่ยวข้อง → บอกว่าไม่มีข้อมูล`

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

  try {
    const model = genAI.getGenerativeModel({ model: MODEL })

    const prompt = `${SYSTEM_PROMPT}\n\n${userPrompt}`

    const response = await model.generateContent(prompt)
    const text = response.response.text() || ''

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
