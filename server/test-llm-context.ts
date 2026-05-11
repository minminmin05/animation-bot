import { generateAnswer } from './rag/services/llm.service.js'
import 'dotenv/config'

async function testLLMWithContext() {
  // Simulate the context that would be generated for Ava Martinez
  const context = `นักเรียน: Ava Martinez, วิชา: efsf, คะแนน: 50, เกรด: D
นักเรียน: Ava Martinez, วิชา: Physics, คะแนน: 90, เกรด: A
นักเรียน: Ava Martinez, วิชา: Mathematics, คะแนน: 90, เกรด: A
นักเรียน: Ava Martinez, วิชา: math, คะแนน: 90, เกรด: A
นักเรียน: Ava Martinez, วิชา: English, คะแนน: 90, เกรด: A
นักเรียน: Ava Martinez, วิชา: anime, คะแนน: 90, เกรด: A`

  const question = 'ขอข้อมูลของ Ava Martinez มีเกรดอะไรเท่าไหร่บ้าง'

  console.log('Testing LLM with context...')
  console.log('Question:', question)
  console.log('Context length:', context.length)
  console.log('Context preview:', context.substring(0, 100))
  console.log('')

  try {
    const answer = await generateAnswer(question, [], context)
    console.log('Response:')
    console.log('  Text:', answer.text.substring(0, 200))
    console.log('  Emotion:', answer.emotion)
  } catch (error: any) {
    console.error('Error:', error.message)
  }
}

testLLMWithContext().catch(console.error)
