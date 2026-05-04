const API_URL = process.env.API_URL || 'http://localhost:3001'

async function testAsk(question: string) {
  const response = await fetch(`${API_URL}/api/rag/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question })
  })

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`)
  }

  return response.json()
}

function printResult(query: string, result: any) {
  console.log('===========================')
  console.log('RAG ASK TEST RESULT')
  console.log('===========================\n')
  console.log(`Query:\n${query}\n`)
  console.log(`Answer:\n${result.text}\n`)
  console.log(`Emotion: ${result.emotion}`)
  console.log(`\nSources:`)
  result.sources?.forEach((s: any, i: number) => {
    console.log(`  ${i + 1}. [${s.score.toFixed(3)}] ${s.text}`)
  })
  console.log('\n===========================\n')
}

async function run() {
  try {
    console.log('🧪 Testing RAG ASK API...\n')

    const result1 = await testAsk('นักเรียนต้องแต่งตัวยังไง')
    printResult('นักเรียนต้องแต่งตัวยังไง', result1)

    const result2 = await testAsk('เที่ยงได้กลับบ้านไหม')
    printResult('เที่ยงได้กลับบ้านไหม', result2)

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

run()
