import 'dotenv/config'
import { GoogleGenerativeAI } from '@google/generative-ai'

const API_KEY = process.env.GEMINI_API_KEY

if (!API_KEY || API_KEY === 'your-gemini-api-key-here') {
  console.error('❌ GEMINI_API_KEY not found in .env file')
  console.log('Please add your API key to server/.env:')
  console.log('  GEMINI_API_KEY=your-actual-key-here')
  process.exit(1)
}

console.log('🧪 Testing Gemini API...\n')
console.log(`API Key: ${API_KEY.slice(0, 10)}...${API_KEY.slice(-4)}`)
console.log(`Model: ${process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'}\n`)

async function testGemini() {
  try {
    const genAI = new GoogleGenerativeAI(API_KEY)
    const model = genAI.getGenerativeModel({
      model: process.env.GEMINI_MODEL || 'gemini-2.0-flash-exp'
    })

    console.log('📤 Sending test request...')

    const response = await model.generateContent('สวัสดี คุณคือใคร')

    console.log('✅ API Key is valid!\n')
    console.log('Response:')
    console.log(response.response.text())

  } catch (error: any) {
    console.error('❌ Test failed:')
    console.error(error.message)

    if (error.message.includes('API key')) {
      console.log('\n💡 Your API key might be invalid or expired.')
      console.log('   Get a new one at: https://aistudio.google.com/app/apikey')
    }
  }
}

testGemini()
