const API_URL = process.env.API_URL || 'http://localhost:3001'

async function testQuery(question: string) {
  const response = await fetch(`${API_URL}/api/rag/query`, {
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
  console.log('RAG TEST RESULT')
  console.log('===========================\n')
  console.log(`Query:\n${query}\n`)
  console.log('Top Results:')

  if (!result.results || result.results.length === 0) {
    console.log('  No results found')
  } else {
    result.results.forEach((r: any, i: number) => {
      console.log(`\n${i + 1}. Text: ${r.text}`)
      console.log(`   Score: ${r.score.toFixed(4)}`)
      if (r.category) console.log(`   Category: ${r.category}`)
    })
  }

  console.log('\n===========================\n')
}

async function run() {
  try {
    console.log('🧪 Testing RAG API...\n')

    // Test 1
    const result1 = await testQuery('กฎการแต่งตัวนักเรียนคืออะไร')
    printResult('กฎการแต่งตัวนักเรียนคืออะไร', result1)

    // Test 2
    const result2 = await testQuery('นักเรียนต้องทำอะไรในห้องเรียน')
    printResult('นักเรียนต้องทำอะไรในห้องเรียน', result2)

  } catch (error) {
    console.error('❌ Test failed:', error)
    process.exit(1)
  }
}

run()
