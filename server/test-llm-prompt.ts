import { generateAnswer } from './rag/services/llm.service.js'
import dotenv from 'dotenv'
dotenv.config()

async function testLLMPrompt() {
  console.log('=== Testing LLM Prompt with Statistics Context ===\n')

  const question = 'มีนักเรียนกี่คน'
  const statisticsContext = `สถิติโรงเรียน:
- นักเรียนทั้งหมด: 25 คน
- ครูทั้งหมด: 10 คน
- คลาสเรียนทั้งหมด: 6 คลาส`

  console.log(`Question: "${question}"`)
  console.log(`Statistics Context:\n${statisticsContext}`)
  console.log('\nCalling generateAnswer with statisticsContext...\n')

  try {
    const response = await generateAnswer(question, [], statisticsContext)

    console.log('Response:')
    console.log(`  Text: ${response.text}`)
    console.log(`  Emotion: ${response.emotion}`)
  } catch (error: any) {
    console.error(`Error: ${error.message}`)
  }
}

testLLMPrompt().catch(console.error)
